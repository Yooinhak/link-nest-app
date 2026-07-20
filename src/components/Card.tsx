import React from 'react';

import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

import { colors, radius, shadows } from '../constants/theme';

interface CardProps {
  /** 그림자 프리셋. 기본 card, 링크 카드 등 큰 카드는 bigCard. */
  shadow?: 'card' | 'bigCard' | 'none';
  /** 기본 내부 패딩(15) 적용 여부. 커스텀 패딩이 필요하면 false 후 style 로 지정. */
  padded?: boolean;
  /** 지정 시 TouchableOpacity 로 렌더 (activeOpacity 0.6). */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
  children: React.ReactNode;
}

/**
 * Clean 리디자인 공용 카드 — surface 배경 + radius 16 + 은은한 레이어드 그림자.
 * (design_handoff/README.md · Shadow/Radius 토큰)
 */
export default function Card({
  shadow = 'card',
  padded = true,
  onPress,
  style,
  children,
  accessibilityLabel,
  testID,
}: CardProps) {
  const cardStyle: StyleProp<ViewStyle> = [
    styles.base,
    shadow !== 'none' && shadows[shadow],
    padded && styles.padded,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} accessibilityLabel={accessibilityLabel} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'visible', // 그림자 유지. 썸네일 등 클리핑 필요 시 소비처에서 overflow:hidden 래퍼 사용.
  },
  padded: {
    padding: 15,
  },
});
