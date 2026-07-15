import React from 'react';

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '../constants/theme';
import { lightTap } from '../utils/haptics';

import EmojiPicker from './EmojiPicker';
import { PlusIcon } from './icons';

/**
 * 접이식 이모지 필드 — 폴더 생성/수정 시트용.
 * - 닫힘: 슬림한 "이모지 추가/변경" 트리거 (그리드를 숨겨 시트를 짧게 유지).
 * - 열림: 기존 EmojiPicker 노출. 선택 시 자동 접힘 + "완료" 로 수동 접힘.
 * open 상태는 부모가 제어해 상단 미리보기 타일 탭과 동기화된다.
 */

interface EmojiFieldProps {
  value: string | null;
  onChange: (emoji: string | null) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label?: string;
}

export default function EmojiField({
  value,
  onChange,
  open,
  onOpenChange,
  label = '이모지 (선택)',
}: EmojiFieldProps) {
  if (open) {
    return (
      <EmojiPicker
        value={value}
        label={label}
        onSelect={(e) => {
          onChange(e);
          onOpenChange(false); // 선택 시 자동 접힘
        }}
        onClose={() => onOpenChange(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => {
          lightTap();
          onOpenChange(true);
        }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={value ? '이모지 변경' : '이모지 추가'}
      >
        <View style={styles.triggerLeft}>
          {value ? (
            <Text style={styles.triggerEmoji}>{value}</Text>
          ) : (
            <View style={styles.plusCircle}>
              <PlusIcon size={14} color={colors.primaryDeep} strokeWidth={2.5} />
            </View>
          )}
          <Text style={styles.triggerText}>{value ? '이모지 변경' : '이모지 추가'}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20, gap: 11 },
  label: { fontSize: 13, fontFamily: 'LINESeedKR-Bold', color: colors.textMuted },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.divider,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  triggerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  triggerEmoji: { fontSize: 22 },
  plusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerText: { fontSize: 14, fontFamily: 'LINESeedKR-Bold', color: colors.textSub },
});
