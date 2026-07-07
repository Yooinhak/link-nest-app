import React, { useEffect, useRef } from 'react';

import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, shadows } from '../constants/theme';

/**
 * 공용 바텀시트 — 커스텀(Modal + Animated) 구현.
 *
 * NOTE: @gorhom/bottom-sheet 마이그레이션을 시도했으나 SDK 55 + iOS 환경의
 * worklets 크래시(reanimated discussion #9023)로 시트가 열리지 않는 문제가
 * 재현되어 이 구현으로 롤백함 (2026-07-03). 환경 이슈 해소 후 재시도 여지 있음
 * — 당시 코드는 git 히스토리/research.md 참고.
 */

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function BottomSheet({
  visible,
  onClose,
  title,
  description,
  children,
}: BottomSheetProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="닫기" />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handleBar}>
            <View style={styles.handle} />
          </View>
          {title && (
            <View style={styles.header}>
              <Text style={styles.title} accessibilityRole="header">{title}</Text>
              {description && <Text style={styles.description}>{description}</Text>}
            </View>
          )}
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 17, 21, 0.32)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    ...shadows.sheet,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.6, // -0.03em
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textFaint,
    lineHeight: 19,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
});
