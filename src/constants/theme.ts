/**
 * Design Tokens — "Clean" 리디자인 (design_handoff/README.md 기준)
 * 기존 키(primary, gray[...], destructive 등)는 하위 호환을 위해 유지하고,
 * README의 시맨틱 네이밍을 alias 로 추가했다. 새 코드는 시맨틱 키 사용 권장.
 */

export const colors = {
  // Primary
  primary: '#3182F6',
  primaryTint: '#E8F3FF', // primary 연한 배경 (칩, 폴더 아이콘 배경)
  primaryLight: '#E8F3FF', // (legacy alias = primaryTint)
  primaryDark: '#1B64DA',

  // Text (강 → 약)
  ink: '#191F28', // 제목, 강조
  text: '#333D4B', // 본문 강
  textSub: '#4E5968', // 본문
  textMuted: '#6B7684', // 보조
  textFaint: '#8B95A1', // 캡션, 플레이스홀더 라벨
  textDisabled: '#B0B8C1', // 메타(도메인/날짜), 비활성
  iconFaint: '#C4CCD4', // chevron 등 장식 아이콘

  // Surface
  bg: '#F7F8FA', // 화면 배경
  background: '#F7F8FA', // (legacy alias = bg)
  surface: '#FFFFFF', // 카드/시트 표면
  divider: '#F2F4F6', // 구분선, 트랙 배경
  fieldBg: '#F9FAFB', // 입력 필드 배경(테두리 있는 경우)
  border: '#E5E8EB', // 입력 필드 테두리

  // Status
  danger: '#F04452',
  destructive: '#F04452', // (legacy alias = danger)
  destructiveLight: '#FFF0F1',
  success: '#00C472',

  // Brand
  kakao: '#FEE500',
  kakaoText: '#191919',

  // Base
  white: '#FFFFFF',
  black: '#191F28',

  // Legacy scales — 기존 코드 호환용. 값은 새 텍스트 토큰과 정렬됨.
  gray: {
    50: '#F9FAFB', // = fieldBg
    100: '#F2F4F6', // = divider
    200: '#E5E8EB', // = border
    300: '#C4CCD4', // = iconFaint
    400: '#B0B8C1', // = textDisabled
    500: '#8B95A1', // = textFaint
    600: '#6B7684', // = textMuted
    700: '#4E5968', // = textSub
    800: '#333D4B', // = text
    900: '#191F28', // = ink
  },
  blue: {
    50: '#E8F3FF',
    100: '#C9E2FF',
    500: '#3182F6',
    600: '#1B64DA',
  },
} as const;

/** 폴더 색상 6종 — { icon: 아이콘/포인트 색, bg: 연한 배경 } */
export const folderColors = [
  { key: 'blue', icon: '#3182F6', bg: '#E8F3FF' },
  { key: 'purple', icon: '#8B5CF6', bg: '#F3EEFF' },
  { key: 'pink', icon: '#EC4899', bg: '#FDF2F8' },
  { key: 'orange', icon: '#F97316', bg: '#FFF7ED' },
  { key: 'green', icon: '#22C55E', bg: '#F0FDF4' },
  { key: 'gray', icon: '#6B7684', bg: '#F2F4F6' },
] as const;

export type FolderColorKey = (typeof folderColors)[number]['key'];

export function getFolderColor(key?: string | null) {
  return folderColors.find((c) => c.key === key) ?? folderColors[0];
}

/** Border radius 스케일 */
export const radius = {
  card: 16,
  sheet: 28, // 시트 상단 (top-left/right만)
  button: 14,
  chip: 10,
} as const;

/**
 * Shadow 프리셋 — README 값 기준.
 * RN 은 CSS multi-shadow 를 지원하지 않으므로 iOS 는 대표 레이어 1개로 근사,
 * Android 는 elevation 으로 근사한다.
 */
export const shadows = {
  // CSS: 0 1px 2px rgba(20,30,55,0.04), 0 4px 14px rgba(20,30,55,0.04)
  card: {
    shadowColor: '#141E37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  // CSS: 0 1px 2px rgba(20,30,55,0.04), 0 6px 18px rgba(20,30,55,0.05)
  bigCard: {
    shadowColor: '#141E37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  // CSS: 0 -8px 30px rgba(20,30,55,0.12) — 위로 뜨는 시트
  sheet: {
    shadowColor: '#141E37',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 12,
  },
  // CSS: 0 8px 20px rgba(49,130,246,0.4) — primary FAB
  fab: {
    shadowColor: '#3182F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

/** 폰트 — Pretendard (Phase 1에서 expo-font 로딩 예정) */
export const fonts = {
  family: 'Pretendard',
} as const;
