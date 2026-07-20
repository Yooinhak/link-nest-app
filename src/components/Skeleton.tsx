import React, { useEffect, useRef } from 'react';

import { Animated, DimensionValue, StyleSheet, ViewStyle } from 'react-native';

import { colors } from '../constants/theme';
import { useReduceMotion } from '../hooks/useReduceMotion';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    // 동작 줄이기 설정이 켜져 있으면 시머 대신 정적 톤으로 표시(§1 reduced-motion)
    if (reduceMotion) {
      opacity.setValue(0.5);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.gray[200],
  },
});
