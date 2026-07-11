import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Dimensions,
  Keyboard,
  LayoutChangeEvent,
  Modal,
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
 * 레이어링: 인라인 시트를 RN Modal 로 감싼다 — 탭바/시스템 바 위층 확보,
 * statusBarTranslucent/navigationBarTranslucent 로 edge-to-edge dim.
 * Modal 내부 제스처는 GestureHandlerRootView 래핑 필수.
 *
 * 키보드(2026-07-10):
 * - iOS: gorhom keyboardBehavior="interactive" (BottomSheetTextInput 필요 — Input.tsx 참고)
 * - Android: gorhom 의 adjustResize 는 액티비티 창 기준이라 Modal(별도 창)에서 무효.
 *   KeyboardAvoidingView 래핑은 gorhom 내부 레이아웃과 충돌해 콘텐츠가 사라지는 회귀를
 *   유발했음 → 대신 Keyboard 이벤트로 높이를 받아 gorhom `bottomInset` 으로 시트를
 *   들어올린다 (레이아웃 재계산 없이 위치만 이동, 결정적).
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

  // Android: Modal 창은 adjustResize 영향을 받지 않으므로 키보드 높이만큼 시트를 올린다
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const bottomPadding = Math.max(insets.bottom, 16) + 16;

  // 시트 크롬(그랩 핸들 ~24 + 콘텐츠 상단 패딩 8 + 여유 12) — snapPoint 계산에 필수.
  // 이걸 빼먹으면 시트가 ~32px 짧아져 하단 버튼이 잘린다 (2026-07-10 버그).
  const CHROME_HEIGHT = 44;

  const snapPoints = useMemo(() => {
    const measured =
      contentHeight > 0 ? contentHeight + bottomPadding + CHROME_HEIGHT : SCREEN_HEIGHT * 0.45;
    return [Math.min(Math.max(measured, 160), MAX_HEIGHT)];
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
      // NOTE: navigationBarTranslucent 금지(2026-07-10) — Modal 이 시스템 내비 바
      // 밑까지 확장되어 시트 하단 버튼이 시스템 바에 가려 잘렸다 (safe-area 인셋은
      // Modal 밖 창 기준이라 이 확장분을 보정하지 못함). 탭바 덮기는 Modal 래핑만으로 충분.
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
          bottomInset={Platform.OS === 'android' ? keyboardHeight : 0}
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
    fontFamily: 'LINESeedKR-Bold',
    color: colors.ink,
    letterSpacing: -0.6,
  },
  description: {
    fontSize: 13,
    fontFamily: 'LINESeedKR',
    color: colors.textFaint,
    lineHeight: 19,
  },
});
