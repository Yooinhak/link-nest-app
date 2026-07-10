-- ============================================================================
-- 003_fix_groups_select_policy.sql
-- 그룹 생성 시 RLS 42501 핫픽스 (2026-07-09)
--
-- 원인: 클라이언트의 insert(...).select() 는 RETURNING 을 사용하는데,
--   PostgreSQL 은 RETURNING 행에 SELECT 정책을 적용한다. groups 의 SELECT
--   정책(is_group_member)은 AFTER INSERT 트리거가 만든 멤버십에 의존하지만,
--   트리거는 RETURNING 평가 이후(문장 종료 시점)에 실행되므로 새 그룹이
--   생성자에게 보이지 않아 "new row violates row-level security policy" 발생.
--
-- 수정: 생성자(created_by)는 멤버십과 무관하게 자기 그룹을 항상 볼 수 있게 함.
-- ============================================================================

begin;

drop policy if exists "Members can view groups" on public.groups;

create policy "Members can view groups"
  on public.groups for select
  using (public.is_group_member(id) or created_by = auth.uid());

commit;
