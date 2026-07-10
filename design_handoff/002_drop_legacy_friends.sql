-- ============================================================================
-- 002_drop_legacy_friends.sql
-- Link Nest — 레거시 친구 테이블 제거
--
-- 그룹 멤버십 모델(001_groups_sharing.sql)이 친구 개념을 대체하므로
-- 더 이상 사용하지 않는 friend_requests / friends 테이블을 정리한다.
--
-- ⚠️ 실행 전 주의:
--   - 두 테이블의 데이터가 있다면 모두 삭제됩니다 (복구 불가).
--   - 001과 독립적 — 클라이언트에서 친구 기능 참조가 완전히 사라진 것을
--     확인한 뒤 실행하는 것을 권장.
-- ============================================================================

begin;

drop table if exists public.friend_requests cascade;
drop table if exists public.friends cascade;

commit;
