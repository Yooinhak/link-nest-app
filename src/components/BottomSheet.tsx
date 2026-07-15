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
 * 레이어링: 인라인 시트를 RN Modal 로 감싼다 — 탭바/시스템 바 위층 확보.
 * Modal 내부 제스처는 GestureHandlerRootView 래핑 필수.
 *
 * 키보드 (2026-07-13 v2 — "앵커드" 방식):
 * - 시트를 키보드 위로 들어올리지 않는다. interactive 리프트 + 높이 축소를 겹치면
 *   시트가 키보드 위 공간 전체를 채워 화면 꼭대기까지 닿는 문제가 있었다 (실기기).
 * - 대신 시트는 제자리에 고정, 키보드가 하단을 덮는다 — 핵심 입력은 fixedTop 에
 *   있으므로 항상 보인다 (토스식).
 * - 스크롤 영역엔 키보드 높이만큼 하단 패딩을 더해, 스크롤 중간의 입력(이모지 검색
 *   등)도 스크롤로 키보드 위에 노출 가능. iOS 는 automaticallyAdjustKeyboardInsets 로
 *   포커스된 입력을 자동 스크롤.
 *
 * 고정 헤더/푸터 (2026-07-13, UX 개선):
 * - 타이틀·`fixedTop`(핵심 입력)·`footer`(CTA 버튼)는 스크롤 밖에 고정되고,
 *   children 만 가운데에서 스크롤된다 — 긴 콘텐츠에서도 입력창/버튼이 항상 보인다.
 * - 시트 최대 높이 75% (기존 85% — 꽉 차게 올라와 부담스럽다는 피드백 반영).
 *
 * 프롭 API(visible/onClose/title/description/children)는 기존과 호환 — fixedTop/footer 는 선택.
 */

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  /** 타이틀 아래, 스크롤 밖에 고정되는 영역 (예: 이름/URL 입력) */
  fixedTop?: React.ReactNode;
  /** 시트 하단에 고정되는 영역 (예: 저장/취소 버튼) */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// 최대 60% 고정 (토스/당근류 폼 시트 관행: 55~65%).
// 키보드가 떠도 시트는 움직이지 않는다 — 리프트/축소 조합은 풀스크린화 부작용 (v2 주석 참고).
const MAX_HEIGHT = SCREEN_HEIGHT * 0.6;

export default function BottomSheet({
  visible,
  onClose,
  title,
  description,
  fixedTop,
  footer,
  children,
}: BottomSheetProps) {
  const ref = useRef<BottomSheetInline>(null);
  const insets = useSafeAreaInsets();

  // visible=true 일 때만 실제로 마운트(그래야 index=0 으로 열림). 닫힘은 애니메이션 후 언마운트.
  const [rendered, setRendered] = useState(visible);
  const [topHeight, setTopHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRendered(true);
    } else {
      ref.current?.close();
    }
  }, [visible]);

  // 키보드 높이 추적 — 스크롤 영역 하단 패딩용 (시트 자체는 움직이지 않음)
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const bottomPadding = Math.max(insets.bottom, 16) + 16;

  // 시트 크롬(그랩 핸들 ~24 + 여유 12) — snapPoint 계산에 필수.
  // 이걸 빼먹으면 시트가 짧아져 하단이 잘린다 (2026-07-10 버그).
  const CHROME_HEIGHT = 36;

  // 고정 영역(top/footer) + 스크롤 콘텐츠를 모두 합산해 시트 높이를 결정.
  // MAX 초과 시 가운데(children)만 스크롤 — flexShrink 가 스크롤뷰를 줄인다.
  // 주의: top/footer 는 onLayout 측정값에 자체 패딩이 포함되지만, 스크롤 콘텐츠는
  // 컨테이너 패딩(paddingTop 8 + 푸터 없을 때의 bottomPadding)이 측정 밖이라 더해준다.
  const hasFooter = !!footer;
  const snapPoints = useMemo(() => {
    const scrollPad = 8 + (hasFooter ? 0 : bottomPadding);
    const measured =
      contentHeight > 0
        ? topHeight + contentHeight + scrollPad + footerHeight + CHROME_HEIGHT
        : SCREEN_HEIGHT * 0.45;
    return [Math.min(Math.max(measured, 160), MAX_HEIGHT)];
  }, [topHeight, contentHeight, footerHeight, bottomPadding, hasFooter]);

  const onTopLayout = useCallback((e: LayoutChangeEvent) => {
    setTopHeight(e.nativeEvent.layout.height);
  }, []);
  const onContentLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setContentHeight(h);
  }, []);
  const onFooterLayout = useCallback((e: LayoutChangeEvent) => {
    setFooterHeight(e.nativeEvent.layout.height);
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

  const hasFixedHeader = !!title || !!fixedTop;

  return (
    <Modal
      visible
      transparent
      animationType="none" // 등장/퇴장 애니메이션은 gorhom 이 담당
      onRequestClose={() => ref.current?.close()} // Android 뒤로가기 → 시트 닫기
      statusBarTranslucent
      // NOTE: navigationBarTranslucent 금지(2026-07-10) — 시트 하단이 시스템 바에 가려짐.
    >
      <GestureHandlerRootView style={styles.rootView}>
        <BottomSheetInline
          ref={ref}
          index={0}
          snapPoints={snapPoints}
          enableDynamicSizing={false}
          enablePanDownToClose
          onClose={handleClose}
          // "extend" = 단일 snapPoint 에선 시트가 키보드에 반응해 움직이지 않음 (앵커드).
          // interactive(리프트)는 시트를 화면 꼭대기까지 밀어올려 폐기 (2026-07-13 실기기).
          keyboardBehavior="extend"
          keyboardBlurBehavior="restore"
          backdropComponent={renderBackdrop}
          backgroundStyle={styles.sheetBg}
          handleIndicatorStyle={styles.handle}
          style={styles.sheetShadow}
        >
          <View style={styles.body}>
            {/* ── 고정 헤더: 타이틀 + 핵심 입력 ── */}
            {hasFixedHeader && (
              <View style={styles.topArea} onLayout={onTopLayout}>
                {title && (
                  <View style={styles.header}>
                    <Text style={styles.title} accessibilityRole="header">
                      {title}
                    </Text>
                    {description && <Text style={styles.description}>{description}</Text>}
                  </View>
                )}
                {fixedTop}
              </View>
            )}

            {/* ── 스크롤 영역 (children) ── */}
            <BottomSheetScrollView
              style={styles.scrollArea}
              contentContainerStyle={[
                styles.content,
                // 푸터가 없으면 스크롤 끝에 하단 패딩을 직접 준다
                !footer && { paddingBottom: bottomPadding },
                // Android: 키보드가 시트 하단을 덮는 동안 가려진 만큼 스크롤 여백 확보
                // (iOS 는 automaticallyAdjustKeyboardInsets 가 담당 — 중복 방지)
                Platform.OS === 'android' &&
                  keyboardHeight > 0 && { paddingBottom: keyboardHeight + 24 },
              ]}
              // iOS: 포커스된 입력을 키보드 위로 자동 스크롤
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View onLayout={onContentLayout}>{children}</View>
            </BottomSheetScrollView>

            {/* ── 고정 푸터: CTA 버튼 ── */}
            {footer && (
              <View
                style={[styles.footerArea, { paddingBottom: bottomPadding }]}
                onLayout={onFooterLayout}
              >
                {footer}
              </View>
            )}
          </View>
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
  body: {
    flex: 1,
  },
  topArea: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  scrollArea: {
    flexGrow: 0,
    flexShrink: 1, // MAX 초과 시 가운데만 줄어들며 스크롤
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  footerArea: {
    paddingHorizontal: 24,
    paddingTop: 12,
    // 스크롤 콘텐츠와의 시각적 구분 (스크롤이 버튼 뒤로 지나갈 때)
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
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
