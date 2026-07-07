import React from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';

import { colors, radius } from '../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
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
        <Text style={{ color: v.text, fontSize: s.font, fontWeight: '600' }}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

// Clean 리디자인 토큰 (design_handoff/README.md)
// primary: 파란 배경/흰 글씨 · secondary: divider 배경/textSub 글씨 · danger: solid #F04452
const VARIANTS = {
  primary: { bg: colors.primary, text: colors.white },
  secondary: { bg: colors.divider, text: colors.textSub },
  ghost: { bg: 'transparent', text: colors.textMuted },
  danger: { bg: colors.danger, text: colors.white },
} as const;

// large: 로그인 등 화면 최하단 CTA (54/16) · medium: 시트 내 버튼 (52/14) · small: 칩형 (36/10)
const SIZES = {
  large: { height: 54, px: 24, font: 16, radius: 16 },
  medium: { height: 52, px: 20, font: 15, radius: radius.button },
  small: { height: 36, px: 14, font: 13, radius: radius.chip },
} as const;

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
});
