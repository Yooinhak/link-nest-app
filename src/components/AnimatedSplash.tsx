import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

import * as SplashScreen from 'expo-splash-screen';

import { colors } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';

/**
 * 모아링 인앱 애니메이션 스플래시 (expo-splash-screen 하이브리드).
 *
 * 연출 컨셉 — "링크를 모아, 사람을 잇다":
 *   마크에서 링(ring)이 잔잔하게 퍼져나가고(리플), 마크는 숨쉬듯 미세하게
 *   맥동하며, 워드마크와 태그라인이 순차로 떠오른다. 퇴장은 줌 스루 페이드.
 *
 * 하이브리드 계약 (research.md — 절대 깨지 말 것):
 *   1) 네이티브 스플래시(#6D5EF0 + 마크 224dp 중앙)가 첫 프레임부터 표시된다.
 *   2) 이 오버레이의 "첫 프레임"은 네이티브와 픽셀이 정확히 같아야 한다
 *      → 마크 224dp 중앙 · 배경 동일. 링/워드마크는 마운트 후에 시작.
 *   3) 오버레이가 그려진 다음 프레임에 hideAsync() → 전환이 보이지 않는다.
 *   4) 숨김 타이밍은 고정 타이머가 아니라 실제 준비 상태(auth 로딩) 기준.
 *
 * 접근성: reduce motion 설정 시 리플/맥동 루프를 생략한다 (정적 표시 + 페이드만).
 */

SplashScreen.preventAutoHideAsync().catch(() => {
  /* 이미 숨겨졌거나 지원 안 되는 환경(웹 등) — 무시 */
});

const MARK_SIZE = 224; // 네이티브 splash imageWidth 와 동일 (app.json plugin 설정)
const BRAND_BG = '#6D5EF0'; // 네이티브 스플래시 배경과 반드시 동일
const RING_COLOR = '#C9C0FF'; // 라이트 라벤더 (브랜드 보조색)

const WORDMARK_DELAY_MS = 220; // 네이티브→오버레이 전환이 안정된 뒤 등장
const TAGLINE_STAGGER_MS = 140;
const MIN_SHOW_MS = 1100; // 리플 연출을 최소 한 호흡은 보여준다
const FADE_OUT_MS = 460;

const RING_COUNT = 3;
const RING_DURATION_MS = 2000;
const RING_STAGGER_MS = RING_DURATION_MS / RING_COUNT;
const RING_BASE_SIZE = 150; // 시작 지름 — 마크 뒤에서 시작해 화면으로 퍼짐
const RING_MAX_SCALE = 2.6;

const splashIcon = require('../../assets/splash-icon.png');

/** 퍼져나가는 링 하나 — scale 확장 + 페이드아웃 루프 (native driver) */
function Ripple({ delay, reduceMotion }: { delay: number; reduceMotion: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    // 첫 사이클만 스태거 지연, 이후엔 동일 주기로 반복 → 균일한 물결
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: RING_DURATION_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true },
    );
    const starter = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(starter);
      loop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  if (reduceMotion) return null;

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, RING_MAX_SCALE],
  });
  // 은은하게 떠올랐다가 넓어지며 사라진다
  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 1],
    outputRange: [0, 0.45, 0],
  });

  return <Animated.View style={[styles.ring, { opacity, transform: [{ scale }] }]} />;
}

export default function AnimatedSplash() {
  const { height } = useWindowDimensions();
  const { loading: authLoading } = useAuth();

  // 컨테이너(퇴장) / 마크 / 텍스트 애니메이션 값
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;
  const markBreath = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkShift = useRef(new Animated.Value(10)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineShift = useRef(new Animated.Value(8)).current;

  const [reduceMotion, setReduceMotion] = useState(false);
  const [minShowDone, setMinShowDone] = useState(false);
  const [done, setDone] = useState(false);
  const fadeOutStarted = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);

  // 마운트 직후: 오버레이가 그려진 다음 프레임에 네이티브 스플래시 제거 → 연출 시작
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {});

      // 워드마크 → 태그라인 스태거 등장 (페이드 + 살짝 떠오름)
      Animated.stagger(TAGLINE_STAGGER_MS, [
        Animated.parallel([
          Animated.timing(wordmarkOpacity, {
            toValue: 1,
            duration: 420,
            delay: WORDMARK_DELAY_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(wordmarkShift, {
            toValue: 0,
            duration: 420,
            delay: WORDMARK_DELAY_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(taglineOpacity, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(taglineShift, {
            toValue: 0,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
    const timer = setTimeout(() => setMinShowDone(true), MIN_SHOW_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 마크 브레스: 숨쉬듯 1 ↔ 1.045 (reduce motion 시 생략)
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(markBreath, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(markBreath, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  // 준비 완료(세션 로딩 끝) + 최소 노출 충족 → 줌 스루 페이드아웃
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
        toValue: 1.08,
        duration: FADE_OUT_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setDone(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, minShowDone]);

  const markScale = markBreath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] });

  // 워드마크는 마크 하단에 절대 배치 (레이아웃 영향 없음)
  const wordmarkTop = useMemo(() => height / 2 + MARK_SIZE * 0.34 + 18, [height]);

  const rippleDelays = useMemo(
    () => Array.from({ length: RING_COUNT }, (_, i) => i * RING_STAGGER_MS),
    [],
  );

  if (done) return null;

  return (
    <Animated.View
      style={[styles.container, { opacity: containerOpacity, transform: [{ scale: containerScale }] }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* 링 리플 — 마크 뒤 레이어에서 퍼져나감 */}
      {rippleDelays.map((delay) => (
        <Ripple key={delay} delay={delay} reduceMotion={reduceMotion} />
      ))}

      {/* 마크 (네이티브와 동일 위치·크기 — 첫 프레임 정합) */}
      <Animated.View style={{ transform: [{ scale: markScale }] }}>
        <Image source={splashIcon} style={styles.mark} resizeMode="contain" />
      </Animated.View>

      {/* 워드마크 + 태그라인 */}
      <Animated.Text
        style={[
          styles.wordmark,
          { top: wordmarkTop, opacity: wordmarkOpacity, transform: [{ translateY: wordmarkShift }] },
        ]}
      >
        모아링
      </Animated.Text>
      <Animated.Text
        style={[
          styles.tagline,
          { top: wordmarkTop + 40, opacity: taglineOpacity, transform: [{ translateY: taglineShift }] },
        ]}
      >
        링크를 모아, 사람을 잇다
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    // 네이티브 스플래시(app.json plugin backgroundColor)와 동일해야 전환이 안 보인다
    backgroundColor: BRAND_BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 999,
  },
  ring: {
    position: 'absolute',
    width: RING_BASE_SIZE,
    height: RING_BASE_SIZE,
    borderRadius: RING_BASE_SIZE / 2,
    borderWidth: 1.5,
    borderColor: RING_COLOR,
  },
  mark: {
    width: MARK_SIZE,
    height: MARK_SIZE,
  },
  wordmark: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 26,
    fontFamily: 'LINESeedKR-Bold',
    color: colors.white,
    letterSpacing: -0.52, // -0.02em
  },
  tagline: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 13,
    fontFamily: 'LINESeedKR',
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.2,
  },
});
