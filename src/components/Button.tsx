import React from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';

import { colors, glass, radius, shadows } from '../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass' | 'kakao';
type ButtonSize = 'large' | 'medium' | 'small';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'medium',
  loading = false,
  children,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderRadius: s.radius,
          height: s.height,
          paddingHorizontal: s.px,
        },
        v.border && { borderWidth: 1, borderColor: v.border },
        // 시안: 파란 CTA 는 은은한 글로우 (비활성 시 제거)
        variant === 'primary' && !disabled && !loading && shadows.primaryGlow,
        (disabled || loading) && { opacity: 0.4 },
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : typeof children === 'string' ? (
        // 버튼 라벨은 전부 600+ → LINE Seed KR Bold 단일 (v3 폰트 규칙)
        <Text style={{ color: v.text, fontSize: s.font, fontFamily: 'LINESeedKR-Bold' }}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

// 블루 글래스 토큰 (design_handoff/redesign.html)
// primary: 파랑 + 글로우 · secondary: #F2F4F6 · glass: 유리 표면 (배경 그라디언트 위)
const VARIANTS: Record<
  ButtonVariant,
  { bg: string; text: string; border?: string }
> = {
  primary: { bg: colors.primary, text: colors.white },
  secondary: { bg: colors.divider, text: colors.textSub },
  ghost: { bg: 'transparent', text: colors.textFaint },
  danger: { bg: colors.danger, text: colors.white },
  glass: { bg: glass.bg, text: colors.primary, border: glass.border },
  kakao: { bg: colors.kakao, text: colors.kakaoText },
};

// large: 화면 최하단 CTA (54/16) · medium: 시트 내 버튼 (52/15) · small: 칩형 (38/13)
const SIZES = {
  large: { height: 54, px: 24, font: 16, radius: 18 },
  medium: { height: 52, px: 20, font: 15, radius: radius.button },
  small: { height: 38, px: 14, font: 13, radius: 19 },
} as const;

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
