import React, { useEffect, useRef, useState } from 'react';

import { Animated, Easing, Image, StyleSheet, useWindowDimensions } from 'react-native';

import * as SplashScreen from 'expo-splash-screen';

import { colors } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';

/**
 * 인앱 애니메이션 스플래시 (expo-splash-screen 하이브리드).
 *
 * 흐름:
 *   1) 네이티브 스플래시(LN 로고, imageWidth 224dp)가 첫 프레임부터 표시되고
 *      preventAutoHideAsync 로 JS 준비 전까지 유지된다.
 *   2) 이 오버레이가 네이티브와 동일한 비주얼(로고 224dp 중앙)로 마운트되면
 *      hideAsync 로 네이티브를 즉시 걷어낸다 — 픽셀이 겹쳐 전환이 보이지 않는다.
 *   3) 워드마크 페이드인 → 세션 로딩 완료 + 최소 노출 시간 충족 시 페이드아웃.
 *
 * 숨김 타이밍이 고정 타이머가 아니라 실제 준비 상태(auth 세션 로딩) 기준.
 */

SplashScreen.preventAutoHideAsync().catch(() => {
  /* 이미 숨겨졌거나 지원 안 되는 환경(웹 등) — 무시 */
});

const ICON_SIZE = 224; // 네이티브 splash imageWidth 와 동일 (app.json plugin 설정)
const TILE_RATIO = 440 / 1024; // splash-icon.png 캔버스 대비 타일 비율
const WORDMARK_FADE_MS = 240;
const MIN_SHOW_MS = 700; // 로고 최소 노출 시간 (너무 빨리 사라지는 느낌 방지)
const FADE_OUT_MS = 420;

const splashIcon = require('../../assets/splash-icon.png');

export default function AnimatedSplash() {
  const { height } = useWindowDimensions();
  const { loading: authLoading } = useAuth();

  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;

  const [minShowDone, setMinShowDone] = useState(false);
  const [done, setDone] = useState(false);
  const fadeOutStarted = useRef(false);

  // 마운트 직후: 오버레이가 그려진 다음 프레임에 네이티브 스플래시 제거 + 워드마크 페이드인
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {});
      Animated.timing(wordmarkOpacity, {
        toValue: 1,
        duration: WORDMARK_FADE_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
    const timer = setTimeout(() => setMinShowDone(true), MIN_SHOW_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 준비 완료(세션 로딩 끝) + 최소 노출 충족 → 페이드아웃
  useEffect(() => {
    if (authLoading || !minShowDone || fadeOutStarted.current) return;
    fadeOutStarted.current = true;
    Animated.parallel([
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(containerScale, {
        toValue: 1.06,
        duration: FADE_OUT_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setDone(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, minShowDone]);

  if (done) return null;

  // 아이콘은 화면 정중앙(네이티브와 동일 위치). 워드마크는 레이아웃에 영향 없도록 절대 배치:
  // 타일 하단(중앙 + 타일 절반) 아래 24px.
  const wordmarkTop = height / 2 + (ICON_SIZE * TILE_RATIO) / 2 + 24;

  return (
    <Animated.View
      style={[styles.container, { opacity: containerOpacity, transform: [{ scale: containerScale }] }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image source={splashIcon} style={styles.icon} resizeMode="contain" />
      <Animated.Text style={[styles.wordmark, { top: wordmarkTop, opacity: wordmarkOpacity }]}>
        Linkle
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    // 네이티브 스플래시(app.json plugin backgroundColor)와 동일해야 전환이 안 보인다
    backgroundColor: '#6D5EF0', // Linkle 브랜드 인디고
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 999,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  wordmark: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 22,
    fontFamily: 'LINESeedKR-Bold',
    color: colors.white, // 인디고 배경 위 흰 워드마크
    letterSpacing: -0.66, // -0.03em
  },
});
