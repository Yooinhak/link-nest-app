import React from 'react';

import { StyleSheet } from 'react-native';

import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { air, AirVariant } from '../constants/theme';

/**
 * 공기(배경) 레이어 — 블루 글래스 리디자인 (redesign.html).
 *
 * 시안의 175deg 그라디언트 + 좌상/우상 라디얼 "빛 오브"를 SVG 로 재현한다.
 * (RN 은 CSS gradient/backdrop-filter 미지원 → react-native-svg 사용, 추가 의존성 0)
 *
 * variant:
 *  - personal: 블루 공기 (개인 공간, 프로필)
 *  - group:    웜 공기 (공유 그룹 — "지금 어느 공간인지 배경이 말해줘요")
 *  - login:    딥 블루 공기 (로그인)
 *
 * 화면 최상단에 <GlassBackground variant={...} /> 로 깔고 콘텐츠를 그 위에 올린다.
 */

interface GlassBackgroundProps {
  variant?: AirVariant;
}

// 기준 캔버스 (시안 프레임 비율). preserveAspectRatio slice 로 화면을 가득 채운다.
const W = 375;
const H = 812;

/** variant 별 라디얼 오브 정의 — 시안의 radial-gradient 위치/색 근사 */
const ORBS: Record<AirVariant, { cx: number; cy: number; r: number; color: string; opacity: number }[]> = {
  // v3 (Linkle 2a 파이널): 블루 오브 → 라벤더 오브
  personal: [
    { cx: 80, cy: 50, r: 150, color: '#9B8CFF', opacity: 0.5 },
    { cx: 340, cy: 60, r: 125, color: '#8B6EFF', opacity: 0.28 },
  ],
  group: [
    { cx: 350, cy: 50, r: 135, color: '#FF9A3D', opacity: 0.35 },
    { cx: 20, cy: 120, r: 110, color: '#FFC49A', opacity: 0.25 },
  ],
  login: [
    { cx: 90, cy: 60, r: 175, color: '#9B8CFF', opacity: 0.55 },
    { cx: 335, cy: 150, r: 135, color: '#8B6EFF', opacity: 0.3 },
  ],
};

function GlassBackground({ variant = 'personal' }: GlassBackgroundProps) {
  const gradient = air[variant];
  const orbs = ORBS[variant];

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      pointerEvents="none"
    >
      <Defs>
        {/* 175deg ≈ 거의 수직 그라디언트 */}
        <LinearGradient id={`air-${variant}`} x1="0" y1="0" x2="0.06" y2="1">
          {gradient.stops.map((color, i) => (
            <Stop key={color + i} offset={gradient.locations[i]} stopColor={color} />
          ))}
        </LinearGradient>
        {orbs.map((orb, i) => (
          <RadialGradient key={`orb-def-${i}`} id={`orb-${variant}-${i}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={orb.color} stopOpacity={orb.opacity} />
            <Stop offset="0.65" stopColor={orb.color} stopOpacity={orb.opacity * 0.45} />
            <Stop offset="1" stopColor={orb.color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>

      <Rect x={0} y={0} width={W} height={H} fill={`url(#air-${variant})`} />
      {orbs.map((orb, i) => (
        <Circle key={`orb-${i}`} cx={orb.cx} cy={orb.cy} r={orb.r} fill={`url(#orb-${variant}-${i})`} />
      ))}
    </Svg>
  );
}

export default React.memo(GlassBackground);
