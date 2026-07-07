import React from 'react';

import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '../constants/theme';

/**
 * 공용 아이콘 세트 — lucide 계열 path, stroke-width 2 통일.
 * (design_handoff/README.md · Assets: "lucide 계열과 호환")
 *
 * lucide-react-native 와 동일한 API(size/color/strokeWidth)로 작성했으므로,
 * 추후 `bun add lucide-react-native` 시 import 경로만 교체하면 된다.
 * (npm 레지스트리 정책으로 이 환경에서 직접 설치 불가 — 2026-07-03)
 */

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

function createIcon(displayName: string, paths: React.ReactNode) {
  function Icon({ size = 20, color = colors.textMuted, strokeWidth = 2 }: IconProps) {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths}
      </Svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}

// ── 내비게이션/공통 ──────────────────────────────────────────
export const PlusIcon = createIcon('PlusIcon', <Path d="M12 5v14M5 12h14" />);
export const XIcon = createIcon('XIcon', <Path d="M18 6 6 18M6 6l12 12" />);
export const CheckIcon = createIcon('CheckIcon', <Path d="M20 6 9 17l-5-5" />);
export const ChevronRightIcon = createIcon('ChevronRightIcon', <Path d="m9 18 6-6-6-6" />);
export const ChevronLeftIcon = createIcon('ChevronLeftIcon', <Path d="m15 18-6-6 6-6" />);
export const ChevronDownIcon = createIcon('ChevronDownIcon', <Path d="m6 9 6 6 6-6" />);
export const MoreHorizontalIcon = createIcon(
  'MoreHorizontalIcon',
  <>
    <Circle cx="12" cy="12" r="1" />
    <Circle cx="19" cy="12" r="1" />
    <Circle cx="5" cy="12" r="1" />
  </>,
);

// ── 액션 ────────────────────────────────────────────────────
export const TrashIcon = createIcon(
  'TrashIcon',
  <>
    <Path d="M3 6h18" />
    <Path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <Path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </>,
);
export const PencilIcon = createIcon('PencilIcon', <Path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />);
export const SearchIcon = createIcon(
  'SearchIcon',
  <>
    <Circle cx="11" cy="11" r="7" />
    <Path d="m21 21-4.3-4.3" />
  </>,
);
export const ArrowUpDownIcon = createIcon('ArrowUpDownIcon', <Path d="m3 16 4 4 4-4M7 20V4M21 8l-4-4-4 4M17 4v16" />);
export const CopyIcon = createIcon(
  'CopyIcon',
  <>
    <Rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <Path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </>,
);
export const Share2Icon = createIcon(
  'Share2Icon',
  <>
    <Circle cx="18" cy="5" r="3" />
    <Circle cx="6" cy="12" r="3" />
    <Circle cx="18" cy="19" r="3" />
    <Path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
  </>,
);
export const LinkIcon = createIcon(
  'LinkIcon',
  <>
    <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </>,
);

// ── 뷰 전환/레이아웃 ─────────────────────────────────────────
export const LayoutGridIcon = createIcon(
  'LayoutGridIcon',
  <Path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />,
);
export const ListIcon = createIcon('ListIcon', <Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />);

// ── 도메인 ──────────────────────────────────────────────────
export const FolderIcon = createIcon(
  'FolderIcon',
  <Path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
);
export const HomeIcon = createIcon(
  'HomeIcon',
  <>
    <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <Path d="M9 22V12h6v10" />
  </>,
);
export const UserIcon = createIcon(
  'UserIcon',
  <>
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </>,
);
export const UsersIcon = createIcon(
  'UsersIcon',
  <>
    <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <Circle cx="9" cy="7" r="4" />
    <Path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </>,
);
export const LogOutIcon = createIcon(
  'LogOutIcon',
  <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
);
export const ShieldIcon = createIcon(
  'ShieldIcon',
  <Path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />,
);
export const FileTextIcon = createIcon(
  'FileTextIcon',
  <>
    <Path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <Path d="M14 2v4a2 2 0 0 0 2 2h4M16 13H8M16 17H8M10 9H8" />
  </>,
);
export const MessageCircleIcon = createIcon(
  'MessageCircleIcon',
  <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
);

// ── 상태 ────────────────────────────────────────────────────
export const WifiOffIcon = createIcon(
  'WifiOffIcon',
  <>
    <Path d="M12 20h.01" />
    <Path d="M8.5 16.429a5 5 0 0 1 7 0" />
    <Path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
    <Path d="M19 12.859a10 10 0 0 0-2.007-1.523" />
    <Path d="M2 8.82a15 15 0 0 1 4.177-2.643" />
    <Path d="M22 8.82a15 15 0 0 0-11.288-3.764" />
    <Path d="m2 2 20 20" />
  </>,
);
export const AlertTriangleIcon = createIcon(
  'AlertTriangleIcon',
  <>
    <Path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <Path d="M12 9v4M12 17h.01" />
  </>,
);
export const AlertCircleIcon = createIcon(
  'AlertCircleIcon',
  <>
    <Circle cx="12" cy="12" r="10" />
    <Path d="M12 8v4M12 16h.01" />
  </>,
);
export const CheckCircle2Icon = createIcon(
  'CheckCircle2Icon',
  <>
    <Circle cx="12" cy="12" r="10" />
    <Path d="m9 12 2 2 4-4" />
  </>,
);
