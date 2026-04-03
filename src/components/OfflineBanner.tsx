import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

import { useNetInfo } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../constants/theme';

const WifiOffIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
  </Svg>
);

export default function OfflineBanner() {
  const { isConnected } = useNetInfo();
  const insets = useSafeAreaInsets();
  const height = useRef(new Animated.Value(0)).current;

  const isOffline = isConnected === false;

  useEffect(() => {
    Animated.timing(height, {
      toValue: isOffline ? 36 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isOffline]);

  return (
    <Animated.View style={[styles.container, { height, marginTop: isOffline ? 0 : 0 }]}>
      <View style={styles.content}>
        <WifiOffIcon />
        <Text style={styles.text}>오프라인 상태입니다</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray[700],
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
});
