import { FolderColorKey } from './theme';

/**
 * 폴더/그룹 공용 이모지 데이터 + 이름 기반 자동추천.
 *
 * 원래 EmojiPicker.tsx 안에 있던 EMOJI_DATA 를 여기로 추출(2026-07-15).
 * 새 폴더 생성 시 "이름만 쓰면 이모지·색이 자동으로" UX 를 위해 EMOJI_COLOR 매핑과
 * suggestIdentity / suggestCombos 를 함께 둔다. EmojiPicker 와 FolderIdentityPicker 가
 * 이 한 곳을 공유한다.
 */

/** 추천 이모지 — [이모지, 한글/영문 검색 키워드]. 폴더/링크 정리 맥락에 맞춘 큐레이션. */
export const EMOJI_DATA: Array<[string, string]> = [
  // 자주 쓰는 정리/일반
  ['📁', '폴더 folder 파일'],
  ['📌', '핀 고정 중요 pin'],
  ['⭐', '별 즐겨찾기 중요 star favorite'],
  ['❤️', '하트 좋아요 사랑 heart love'],
  ['🔥', '불 인기 핫 fire hot'],
  ['✨', '반짝 새로움 sparkle new'],
  ['💡', '아이디어 전구 idea light'],
  ['✅', '체크 완료 done check'],
  ['🎯', '목표 타겟 goal target'],
  ['🚀', '로켓 시작 런칭 rocket launch'],
  // 일/공부
  ['💼', '일 업무 회사 work business'],
  ['📚', '책 공부 학습 book study'],
  ['📖', '독서 책 read book'],
  ['✏️', '연필 메모 쓰기 write pencil'],
  ['📝', '메모 노트 문서 note memo'],
  ['💻', '노트북 개발 컴퓨터 laptop code'],
  ['🖥️', '컴퓨터 데스크탑 desktop pc'],
  ['📊', '차트 그래프 분석 chart graph'],
  ['📈', '상승 성장 그래프 growth chart'],
  ['💰', '돈 재테크 money finance'],
  ['🧠', '두뇌 지식 아이디어 brain'],
  // 취미/생활
  ['🎬', '영화 비디오 movie film'],
  ['🎵', '음악 노래 music song'],
  ['🎮', '게임 game'],
  ['📷', '카메라 사진 camera photo'],
  ['🎨', '그림 디자인 예술 art design'],
  ['✈️', '비행기 여행 travel plane'],
  ['🗺️', '지도 여행 장소 map travel'],
  ['🏠', '집 홈 home house'],
  ['🍔', '음식 맛집 food burger'],
  ['🍜', '음식 라면 국수 food noodle'],
  ['☕', '커피 카페 coffee cafe'],
  ['🛒', '쇼핑 장바구니 shopping cart'],
  ['👕', '옷 패션 의류 fashion clothes'],
  ['🏃', '운동 달리기 헬스 exercise run'],
  ['🐶', '강아지 반려동물 dog pet'],
  ['🐱', '고양이 반려동물 cat pet'],
  ['🌱', '식물 새싹 성장 plant grow'],
  ['🎁', '선물 이벤트 gift present'],
  // 상태/분류
  ['🔖', '북마크 태그 bookmark tag'],
  ['🗂️', '분류 정리 서류 organize file'],
  ['📎', '클립 첨부 clip attach'],
  ['🔗', '링크 연결 link'],
  ['📥', '보관 받은 inbox save'],
  ['🕐', '나중에 시간 later time'],
  ['❓', '질문 궁금 question'],
  ['⚡', '빠름 번개 즐겨 fast bolt'],
  ['🌟', '반짝 하이라이트 star glow'],
  ['🎉', '축하 파티 celebrate party'],
  ['🌈', '무지개 다양 rainbow'],
  ['💎', '보석 소중 프리미엄 gem premium'],
];

/**
 * 이모지 → 어울리는 폴더 색. 색과 이모지가 따로 놀지 않도록 큐레이션(6색 팔레트).
 * 여기 없는 이모지(직접 입력 등)는 DEFAULT_COLOR 로 폴백한다.
 */
const DEFAULT_COLOR: FolderColorKey = 'blue';
export const EMOJI_COLOR: Record<string, FolderColorKey> = {
  '📁': 'gray', '📌': 'orange', '⭐': 'orange', '❤️': 'pink', '🔥': 'orange',
  '✨': 'purple', '💡': 'orange', '✅': 'green', '🎯': 'pink', '🚀': 'purple',
  '💼': 'blue', '📚': 'orange', '📖': 'orange', '✏️': 'blue', '📝': 'blue',
  '💻': 'blue', '🖥️': 'blue', '📊': 'green', '📈': 'green', '💰': 'green',
  '🧠': 'purple', '🎬': 'purple', '🎵': 'pink', '🎮': 'purple', '📷': 'gray',
  '🎨': 'pink', '✈️': 'blue', '🗺️': 'green', '🏠': 'orange', '🍔': 'orange',
  '🍜': 'orange', '☕': 'orange', '🛒': 'green', '👕': 'pink', '🏃': 'green',
  '🐶': 'orange', '🐱': 'orange', '🌱': 'green', '🎁': 'pink', '🔖': 'blue',
  '🗂️': 'gray', '📎': 'gray', '🔗': 'blue', '📥': 'blue', '🕐': 'gray',
  '❓': 'purple', '⚡': 'orange', '🌟': 'orange', '🎉': 'pink', '🌈': 'purple',
  '💎': 'blue',
};

/** 이모지에 어울리는 색(매핑 없으면 파랑). */
export function colorForEmoji(emoji: string | null): FolderColorKey {
  if (!emoji) return DEFAULT_COLOR;
  return EMOJI_COLOR[emoji] ?? DEFAULT_COLOR;
}

/** 이름이 비었을 때/매칭 없을 때 보여줄 기본 조합(무난한 순서). */
export const DEFAULT_COMBOS: Array<{ emoji: string; color: FolderColorKey }> = [
  { emoji: '📁', color: 'gray' },
  { emoji: '⭐', color: 'orange' },
  { emoji: '❤️', color: 'pink' },
  { emoji: '🔖', color: 'blue' },
  { emoji: '🌱', color: 'green' },
];

/**
 * 이름 텍스트에서 매칭되는 이모지들을 점수 순으로 반환(중복 제거).
 * 한글은 부분 문자열 포함으로 매칭 — 예: "맛집" → 🍔, "운동" → 🏃, "공부" → 📚.
 */
function matchEmojis(name: string, limit: number): string[] {
  const q = name.trim().toLowerCase();
  if (!q) return [];
  const hits: string[] = [];
  for (const [emoji, kw] of EMOJI_DATA) {
    const tokens = kw.toLowerCase().split(' ');
    // 2글자 이상 키워드가 이름과 서로 포함 관계면 매칭(짧은 조사/글자 오탐 방지)
    const matched = tokens.some((t) => t.length >= 2 && (q.includes(t) || t.includes(q)));
    if (matched && !hits.includes(emoji)) hits.push(emoji);
    if (hits.length >= limit) break;
  }
  return hits;
}

/**
 * 이름에서 이모지+색을 하나 추천. 매칭 없으면 이모지 없이 기본 색.
 * 사용자가 아직 수동으로 바꾸지 않은 동안 실시간으로 프리뷰를 채우는 용도.
 */
export function suggestIdentity(name: string): { emoji: string | null; color: FolderColorKey } {
  const [top] = matchEmojis(name, 1);
  if (!top) return { emoji: null, color: DEFAULT_COLOR };
  return { emoji: top, color: colorForEmoji(top) };
}

/**
 * "추천 조합" 행에 노출할 색+이모지 프리셋 목록.
 * 이름 매칭을 앞에 놓고, 부족하면 DEFAULT_COMBOS 로 채운다(중복 제거).
 */
export function suggestCombos(
  name: string,
  count = 4,
): Array<{ emoji: string; color: FolderColorKey }> {
  const seen = new Set<string>();
  const out: Array<{ emoji: string; color: FolderColorKey }> = [];
  const push = (emoji: string, color: FolderColorKey) => {
    if (seen.has(emoji)) return;
    seen.add(emoji);
    out.push({ emoji, color });
  };
  for (const e of matchEmojis(name, count)) push(e, colorForEmoji(e));
  for (const c of DEFAULT_COMBOS) {
    if (out.length >= count) break;
    push(c.emoji, c.color);
  }
  return out.slice(0, count);
}
