-- ============================================================================
-- 001_groups_sharing.sql
-- Link Nest — 공유 그룹(Shared Group) 도입 마이그레이션
-- 설계: docs/feature-sharing.md (2026-07-08) · 명칭 확정: 스페이스 → 그룹 (2026-07-09)
--
-- 내용:
--   0. 확장(pgcrypto) 확인
--   1. (분리됨) 기존 friend_requests / friends 제거 → 002_drop_legacy_friends.sql
--   2. 신규 테이블: groups / group_members / group_invites / profiles
--   3. 기존 테이블 변경: folders.group_id, posts.group_id(비정규화)
--   4. 기존 데이터 백필: 사용자별 개인 그룹 생성 + 폴더/포스트 이전
--   5. 헬퍼 함수: is_group_member (SECURITY DEFINER — RLS 재귀 방지)
--   6. RLS 정책 전면 교체
--   7. 트리거: 신규 가입자 초기화 / 그룹 생성 시 owner 등록 / posts.group_id 자동 세팅
--   8. RPC: join_group_with_token / preview_invite
--
-- ⚠️ 실행 전 주의:
--   - 적용 후 `supabase gen types typescript` 로 src/utils/supabase/types.ts 재생성 필요.
--   - 레거시 친구 테이블 제거는 별도 파일(002_drop_legacy_friends.sql)로 분리됨 —
--     이 마이그레이션과 독립적이므로 원하는 시점에 따로 실행.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. 확장 (초대 토큰 생성용 gen_random_bytes)
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. (분리됨) 기존 친구 테이블 제거 → 002_drop_legacy_friends.sql 참고
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 2. 신규 테이블
-- ----------------------------------------------------------------------------

-- 2-1. 그룹 (최상위 개념: 개인 1개 + 공유 N개)
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  type        text not null default 'shared' check (type in ('personal', 'shared')),
  name        text not null,
  emoji       text,
  color       text check (color in ('blue', 'purple', 'pink', 'orange', 'green', 'gray')),
  created_by  uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- 사용자당 개인 그룹은 1개만
create unique index groups_one_personal_per_user
  on public.groups (created_by)
  where type = 'personal';

-- 2-2. 멤버십
create table public.group_members (
  group_id    uuid not null references public.groups (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  joined_at   timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_idx on public.group_members (user_id);

-- 2-3. 초대 (딥링크 토큰 기반, 기본 7일 / 10회)
create table public.group_invites (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  token       text unique not null default encode(gen_random_bytes(24), 'hex'),
  role        text not null default 'editor' check (role in ('editor', 'viewer')),
  created_by  uuid not null references auth.users (id) on delete cascade,
  expires_at  timestamptz not null default now() + interval '7 days',
  max_uses    int not null default 10,
  used_count  int not null default 0,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index group_invites_group_idx on public.group_invites (group_id);

-- 2-4. 프로필 (멤버 이름/아바타 표시용 — auth.users는 클라이언트 조회 불가)
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  updated_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. 기존 테이블 변경
-- ----------------------------------------------------------------------------
alter table public.folders
  add column group_id uuid references public.groups (id) on delete cascade;

-- posts.group_id: RLS 조인 비용을 없애는 비정규화 컬럼 (docs/feature-sharing.md §4-3)
alter table public.posts
  add column group_id uuid references public.groups (id) on delete cascade;

create index folders_group_idx on public.folders (group_id);
create index posts_group_idx on public.posts (group_id);
create index posts_folder_idx on public.posts (folder_id);

-- ----------------------------------------------------------------------------
-- 4. 기존 데이터 백필: 모든 기존 사용자에게 개인 그룹 생성 + 데이터 이전
-- ----------------------------------------------------------------------------
do $$
declare
  u   record;
  gid uuid;
begin
  for u in select id, raw_user_meta_data from auth.users loop
    -- 4-1. 개인 그룹 (이미 있으면 스킵 — 재실행 안전)
    select id into gid
    from public.groups
    where created_by = u.id and type = 'personal';

    if gid is null then
      insert into public.groups (type, name, created_by)
      values ('personal', '내 그룹', u.id)
      returning id into gid;
    end if;

    -- 4-2. owner 멤버십
    insert into public.group_members (group_id, user_id, role)
    values (gid, u.id, 'owner')
    on conflict (group_id, user_id) do nothing;

    -- 4-3. 프로필 (OAuth 메타데이터 복사)
    insert into public.profiles (id, display_name, avatar_url)
    values (
      u.id,
      coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
      u.raw_user_meta_data ->> 'avatar_url'
    )
    on conflict (id) do nothing;

    -- 4-4. 기존 폴더/포스트를 개인 그룹으로 이전
    update public.folders set group_id = gid
    where user_id = u.id and group_id is null;

    update public.posts set group_id = gid
    where user_id = u.id and group_id is null;
  end loop;
end $$;

-- 4-5. 안전망: posts.user_id가 null인 행은 폴더 기준으로 group_id 보정
update public.posts p
set group_id = f.group_id
from public.folders f
where p.folder_id = f.id
  and p.group_id is null;

-- 백필 완료 후 NOT NULL 승격
alter table public.folders alter column group_id set not null;
-- posts는 folder_id가 nullable이므로 group_id도 nullable 유지하되,
-- 폴더가 있는 포스트는 트리거(§7-3)로 항상 채워진다.

-- ----------------------------------------------------------------------------
-- 5. 멤버십 헬퍼 함수
--    ⚠️ SECURITY DEFINER 필수 — group_members의 RLS 정책 안에서 group_members를
--       직접 서브쿼리하면 무한 재귀가 발생한다 (Supabase 공식 권장 패턴).
-- ----------------------------------------------------------------------------
create or replace function public.is_group_member(
  p_group uuid,
  p_roles text[] default array['owner', 'editor', 'viewer']
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = p_group
      and user_id = auth.uid()
      and role = any (p_roles)
  );
$$;

revoke all on function public.is_group_member from public;
grant execute on function public.is_group_member to authenticated;

-- ----------------------------------------------------------------------------
-- 6. RLS 정책
-- ----------------------------------------------------------------------------

-- 6-1. 신규 테이블 RLS 활성화
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.profiles      enable row level security;

-- 6-2. groups
-- NOTE: created_by 조건 필수 — insert().select()의 RETURNING은 SELECT 정책을
--       검사하는데, 멤버십은 AFTER 트리거가 만들어 RETURNING 시점엔 아직 없다.
--       (003 핫픽스로 발견된 이슈를 원본에도 반영, 2026-07-09)
create policy "Members can view groups"
  on public.groups for select
  using (public.is_group_member(id) or created_by = auth.uid());

create policy "Users can create shared groups"
  on public.groups for insert
  with check (created_by = auth.uid() and type = 'shared');
  -- personal 그룹은 가입 트리거(§7-1)에서만 생성

create policy "Owners can update groups"
  on public.groups for update
  using (public.is_group_member(id, array['owner']));

create policy "Owners can delete shared groups"
  on public.groups for delete
  using (public.is_group_member(id, array['owner']) and type = 'shared');
  -- 개인 그룹은 삭제 불가 (계정 삭제 시 cascade로만 제거)

-- 6-3. group_members
create policy "Members can view co-members"
  on public.group_members for select
  using (public.is_group_member(group_id));

-- INSERT 정책 없음 — 멤버 추가는 트리거(§7-2) 또는 RPC(§8-1)로만 이루어진다.

create policy "Owners can change roles"
  on public.group_members for update
  using (public.is_group_member(group_id, array['owner']) and user_id <> auth.uid());

create policy "Leave or kick"
  on public.group_members for delete
  using (
    -- 본인 나가기 (owner는 양도 전 나가기 불가)
    (user_id = auth.uid() and role <> 'owner')
    -- owner가 다른 멤버 강퇴
    or (public.is_group_member(group_id, array['owner']) and user_id <> auth.uid())
  );

-- 6-4. group_invites
create policy "Editors can view invites"
  on public.group_invites for select
  using (public.is_group_member(group_id, array['owner', 'editor']));

create policy "Editors can create invites"
  on public.group_invites for insert
  with check (
    public.is_group_member(group_id, array['owner', 'editor'])
    and created_by = auth.uid()
  );

create policy "Owners can revoke invites"
  on public.group_invites for update
  using (public.is_group_member(group_id, array['owner']));

-- 6-5. profiles (멤버 이름/아바타 표시용 — 로그인 사용자 전체 조회 허용, MVP 단순화)
create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can upsert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- 6-6. folders — 기존 소유자 정책을 멤버십 기반으로 교체
drop policy if exists "Users can manage own folders" on public.folders;

create policy "Members can view folders"
  on public.folders for select
  using (public.is_group_member(group_id));

create policy "Editors can create folders"
  on public.folders for insert
  with check (public.is_group_member(group_id, array['owner', 'editor']));

create policy "Editors can update folders"
  on public.folders for update
  using (public.is_group_member(group_id, array['owner', 'editor']));

create policy "Editors can delete folders"
  on public.folders for delete
  using (public.is_group_member(group_id, array['owner', 'editor']));

-- 6-7. posts — 동일하게 교체 (editor는 타인 링크도 삭제 가능: 설계 §9-3 A안)
drop policy if exists "Users can manage own posts" on public.posts;

create policy "Members can view posts"
  on public.posts for select
  using (public.is_group_member(group_id));

create policy "Editors can create posts"
  on public.posts for insert
  with check (
    public.is_group_member(group_id, array['owner', 'editor'])
    and user_id = auth.uid()  -- '추가한 사람' 위조 방지
  );

create policy "Editors can update posts"
  on public.posts for update
  using (public.is_group_member(group_id, array['owner', 'editor']));

create policy "Editors can delete posts"
  on public.posts for delete
  using (public.is_group_member(group_id, array['owner', 'editor']));

-- ----------------------------------------------------------------------------
-- 7. 트리거
-- ----------------------------------------------------------------------------

-- 7-1. 신규 가입자: 프로필 + 개인 그룹 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.groups (type, name, created_by)
  values ('personal', '내 그룹', new.id)
  returning id into gid;

  insert into public.group_members (group_id, user_id, role)
  values (gid, new.id, 'owner')
  on conflict (group_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 7-2. 그룹 생성 시 만든 사람을 owner로 자동 등록
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (group_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

-- 7-3. posts.group_id를 folder에서 자동 세팅 (비정규화 무결성 보장)
create or replace function public.set_post_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.folder_id is not null then
    select group_id into new.group_id
    from public.folders
    where id = new.folder_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_post_set_group on public.posts;
create trigger on_post_set_group
  before insert or update of folder_id on public.posts
  for each row execute function public.set_post_group();

-- ----------------------------------------------------------------------------
-- 8. RPC (Edge Function 없이도 초대 수락/미리보기 가능)
-- ----------------------------------------------------------------------------

-- 8-1. 초대 수락: 토큰 검증 → 멤버 추가 → 사용 횟수 증가
create or replace function public.join_group_with_token(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into inv
  from public.group_invites
  where token = p_token
    and revoked_at is null
    and expires_at > now()
    and used_count < max_uses
  for update;

  if not found then
    raise exception 'INVALID_INVITE';
  end if;

  -- 이미 멤버면 횟수 소모 없이 성공 처리
  if exists (
    select 1 from public.group_members
    where group_id = inv.group_id and user_id = auth.uid()
  ) then
    return json_build_object('group_id', inv.group_id, 'already_member', true);
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (inv.group_id, auth.uid(), inv.role);

  update public.group_invites
  set used_count = used_count + 1
  where id = inv.id;

  return json_build_object('group_id', inv.group_id, 'already_member', false);
end;
$$;

revoke all on function public.join_group_with_token from public;
grant execute on function public.join_group_with_token to authenticated;

-- 8-2. 초대 미리보기: 수락 시트에 "그룹 이름 · 멤버 N명" 표시용
--      (그룹 존재 여부만 노출, 민감 정보 없음)
create or replace function public.preview_invite(p_token text)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  inv record;
  result json;
begin
  select i.group_id, i.role, g.name, g.emoji into inv
  from public.group_invites i
  join public.groups g on g.id = i.group_id
  where i.token = p_token
    and i.revoked_at is null
    and i.expires_at > now()
    and i.used_count < i.max_uses;

  if not found then
    return json_build_object('valid', false);
  end if;

  select json_build_object(
    'valid', true,
    'group_name', inv.name,
    'group_emoji', inv.emoji,
    'role', inv.role,
    'member_count', (select count(*) from public.group_members where group_id = inv.group_id)
  ) into result;

  return result;
end;
$$;

revoke all on function public.preview_invite from public;
grant execute on function public.preview_invite to authenticated, anon;

commit;

-- ============================================================================
-- 적용 후 할 일:
--   1. supabase gen types typescript --project-id <ref> > src/utils/supabase/types.ts
--   2. delete-account Edge Function 수정 — 소유 shared 그룹 양도/삭제 로직 추가
--      (docs/feature-sharing.md §9-2, B안: 최고참 editor에게 자동 양도)
--   3. 클라이언트: useFoldersQuery(groupId) 전환 + useCreatePost 등에 group_id 전달
--      ⚠️ folders.group_id가 NOT NULL이므로 이 마이그레이션 적용 후에는
--         group_id 없이 INSERT하는 기존 클라이언트 코드가 실패한다.
--         적용 시점을 클라이언트 업데이트와 맞출 것.
-- ============================================================================
