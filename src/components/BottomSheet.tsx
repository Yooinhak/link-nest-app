import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Dimensions, LayoutChangeEvent, Modal, StyleSheet, Text, View } from 'react-native';

import BottomSheetInline, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadows } from '../constants/theme';

/**
 * 공용 바텀시트 — @gorhom/bottom-sheet 의 "인라인" 컴포넌트(기본 export) 구현.
 *
 * BottomSheetModal(+Provider+Portal) 경로는 이 스택(RN 0.83 · New Architecture · reanimated 4)
 * 에서 present() 는 호출되지만 Portal 이 시트 콘텐츠를 마운트하지 않아 열리지 않았다.
 * 그래서 Portal 을 쓰지 않는 인라인 컴포넌트로 구현한다.
 *
 * 레이어링(2026-07-10): 인라인 시트를 RN Modal 로 감싼다 —
 *   - 인라인 시트가 화면 트리 안에 있으면 탭바가 시트 위에 그려지는 문제 해결.
 *   - statusBarTranslucent/navigationBarTranslucent 로 Android edge-to-edge 에서
 *     dim 이 시스템 바 영역까지 덮는다.
 *   - Modal 내부 제스처는 GestureHandlerRootView 래핑이 필수(gesture-handler 제약).
 *   - 하단 패딩은 safe-area inset 기반(제스처 바/홈 인디케이터 대응).
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
  const insets = useSafeAreaInsets();

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

  const bottomPadding = Math.max(insets.bottom, 12) + 12;

  const snapPoints = useMemo(() => {
    const measured = contentHeight > 0 ? contentHeight + bottomPadding : SCREEN_HEIGHT * 0.45;
    return [Math.min(Math.max(measured, 120), MAX_HEIGHT)];
  }, [contentHeight, bottomPadding]);

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
    <Modal
      visible
      transparent
      animationType="none" // 등장/퇴장 애니메이션은 gorhom 이 담당
      onRequestClose={() => ref.current?.close()} // Android 뒤로가기 → 시트 닫기
      statusBarTranslucent
      navigationBarTranslucent
    >
      <GestureHandlerRootView style={styles.rootView}>
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
            contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
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
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rootView: {
    flex: 1,
  },
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
