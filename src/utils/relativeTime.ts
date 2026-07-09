/**
 * 상대 시간 표기 — 시안 ⑦ "유짱 · 2시간 전" 용.
 * 1분 미만 = 방금 전, 이후 분/시간/일/주 단위, 30일 이상은 날짜(M월 D일).
 */
export function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const diffSec = Math.max(0, (Date.now() - then) / 1000);

  if (diffSec < 60) return '방금 전';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  if (day < 30) return `${Math.floor(day / 7)}주 전`;

  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
