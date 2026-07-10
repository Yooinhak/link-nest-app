import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Dimensions,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import BottomSheetInline, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import { colors, radius, shadows } from '../constants/theme';

/**
 * 공용 바텀시트 — @gorhom/bottom-sheet 의 "인라인" 컴포넌트(기본 export) 구현.
 *
 * BottomSheetModal(+Provider+Portal) 경로는 이 스택(RN 0.83 · New Architecture · reanimated 4)
 * 에서 present() 는 호출되지만 Portal 이 시트 콘텐츠를 마운트하지 않아 열리지 않았다.
 * 그래서 Portal 을 쓰지 않는 인라인 컴포넌트로 구현한다.
 *   - visible=true 일 때만 조건부로 마운트하고 index={0} 으로 즉시 열림.
 *   - 화면 전체를 덮는 absoluteFill 래퍼 안에 두어 백드롭이 화면을 덮고, 시트는 하단에 위치.
 *   - 콘텐츠 높이를 직접 측정해 명시적 snapPoint 로 사용(동적 사이징 이슈 회피).
 *
 * 프롭 API(visible/onClose/title/description/children)는 기존과 동일 → 사용처 변경 불필요.
 */

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_HEIGHT = SCREEN_HEIGHT * 0.85;

export default function BottomSheet({
  visible,
  onClose,
  title,
  description,
  children,
}: BottomSheetProps) {
  const ref = useRef<BottomSheetInline>(null);

  // visible=true 일 때만 실제로 마운트(그래야 index=0 으로 열림). 닫힘은 애니메이션 후 언마운트.
  const [rendered, setRendered] = useState(visible);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRendered(true);
    } else {
      ref.current?.close();
    }
  }, [visible]);

  const snapPoints = useMemo(() => {
    const measured = contentHeight > 0 ? contentHeight : SCREEN_HEIGHT * 0.45;
    return [Math.min(Math.max(measured, 120), MAX_HEIGHT)];
  }, [contentHeight]);

  const onContentLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setContentHeight(h);
  }, []);

  // 시트가 닫히면(팬다운/백드롭 탭/close()) 언마운트 + 부모 상태 동기화
  const handleClose = useCallback(() => {
    setRendered(false);
    if (visible) onClose();
  }, [visible, onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.32}
        pressBehavior="close"
      />
    ),
    [],
  );

  if (!rendered) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <BottomSheetInline
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        onClose={handleClose}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
        style={styles.sheetShadow}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View onLayout={onContentLayout}>
            {title && (
              <View style={styles.header}>
                <Text style={styles.title} accessibilityRole="header">
                  {title}
                </Text>
                {description && <Text style={styles.description}>{description}</Text>}
              </View>
            )}
            {children}
          </View>
        </BottomSheetScrollView>
      </BottomSheetInline>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  sheetShadow: {
    ...shadows.sheet,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  header: {
    paddingTop: 6,
    paddingBottom: 8,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.6,
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textFaint,
    lineHeight: 19,
  },
});
