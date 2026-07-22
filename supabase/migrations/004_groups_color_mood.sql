-- ----------------------------------------------------------------------------
-- 004_groups_color_mood.sql  (2026-07-22)
--
-- 그룹 아이덴티티를 이모지 → 무드(공기)로 전환하면서 groups.color 를 무드 키
-- 저장소로 재활용한다. 기존 CHECK 제약이 폴더 색 6종만 허용해 생성·수정이
-- 23514(groups_color_check)로 실패했다.
--
-- ⚠️ 001_groups_sharing.sql 의 groups.color 제약을 대체한다.
--    folders.color 는 6색 팔레트를 계속 쓰므로 건드리지 않는다.
--    레거시 값을 함께 허용해 기존 행을 보존한다(클라이언트 resolveMoodKey 가
--    미지값·레거시를 sunset 으로 폴백 → 화면 변화 없음, 롤백 안전).
-- ----------------------------------------------------------------------------

alter table public.groups drop constraint if exists groups_color_check;

alter table public.groups
  add constraint groups_color_check
  check (color is null or color in (
    'sunset', 'mint', 'rose', 'citrus', 'dusk',         -- 무드 키 (신규)
    'blue', 'purple', 'pink', 'orange', 'green', 'gray' -- 레거시 보존
  ));
