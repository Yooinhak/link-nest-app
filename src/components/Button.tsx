import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';

import { colors } from '../constants/theme';

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
          paddingVertical: s.py,
          paddingHorizontal: s.px,
        },
        (disabled || loading) && { opacity: 0.4 },
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.7}
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

const VARIANTS = {
  primary: { bg: colors.primary, text: colors.white },
  secondary: { bg: colors.gray[100], text: colors.gray[800] },
  ghost: { bg: 'transparent', text: colors.gray[600] },
  danger: { bg: colors.destructiveLight, text: colors.destructive },
} as const;

const SIZES = {
  large: { py: 16, px: 24, font: 16, radius: 16 },
  medium: { py: 12, px: 20, font: 15, radius: 12 },
  small: { py: 8, px: 14, font: 13, radius: 10 },
} as const;

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
});
