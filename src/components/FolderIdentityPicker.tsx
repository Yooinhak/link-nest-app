import React, { useMemo } from 'react';

import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { suggestCombos } from '../constants/emojiData';
import {
  colors,
  FolderColorKey,
  folderColors,
  getFolderColor,
} from '../constants/theme';
import { lightTap } from '../utils/haptics';

import EmojiPicker from './EmojiPicker';
import { CheckIcon, SearchIcon } from './icons';

/**
 * 폴더 아이덴티티(색+이모지) 통합 피커 — ColorPicker + EmojiField 를 대체(2026-07-15).
 *
 * 설계 원칙:
 *  1) 결정 최소화 — 이름에서 자동추천된 "추천 조합"을 원탭으로 고르면 색·이모지가
 *     한 번에 정해진다(둘이 따로 놀지 않음).
 *  2) 점진적 공개 — 기본은 추천 조합 + 색상만. 무거운 검색 그리드는 "더보기"(또는
 *     상단 미리보기 타일 탭)로만 연다 → 시트가 짧고 키보드 충돌이 없다.
 *
 * 상태는 부모가 소유(name/color/emoji/searchOpen). 사용자가 수동으로 바꾸면
 * onManualChange 로 알려 부모의 자동추천을 멈춘다.
 */

const COLOR_LABELS: Record<FolderColorKey, string> = {
  blue: '파랑',
  purple: '보라',
  pink: '분홍',
  orange: '주황',
  green: '초록',
  gray: '회색',
};

interface FolderIdentityPickerProps {
  /** 폴더 이름 — 추천 조합 계산용. */
  name: string;
  color: FolderColorKey;
  emoji: string | null;
  onChange: (next: { color: FolderColorKey; emoji: string | null }) => void;
  /** 사용자가 색/이모지/조합을 수동 변경했음을 부모에 통지(자동추천 중단용). */
  onManualChange?: () => void;
  /** 검색 그리드(전체 이모지) 열림 상태 — 상단 미리보기 타일 탭과 동기화. */
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
}

export default function FolderIdentityPicker({
  name,
  color,
  emoji,
  onChange,
  onManualChange,
  searchOpen,
  onSearchOpenChange,
}: FolderIdentityPickerProps) {
  const combos = useMemo(() => suggestCombos(name, 4), [name]);

  // 검색 그리드 열림: 전체 이모지에서 고른다(색은 유지). "완료"로 닫힘.
  if (searchOpen) {
    return (
      <EmojiPicker
        value={emoji}
        label="이모지 고르기"
        onSelect={(e) => {
          onManualChange?.();
          onChange({ color, emoji: e });
          onSearchOpenChange(false);
        }}
        onClose={() => onSearchOpenChange(false)}
      />
    );
  }

  const pickCombo = (c: { emoji: string; color: FolderColorKey }) => {
    lightTap();
    onManualChange?.();
    onChange({ color: c.color, emoji: c.emoji });
  };

  const pickColor = (key: FolderColorKey) => {
    lightTap();
    onManualChange?.();
    // 색만 바꾼다 — 이모지는 그대로 유지(이모지 없으면 폴더 아이콘이 이 색으로 표시).
    onChange({ color: key, emoji });
  };

  return (
    <View style={styles.wrap}>
      {/* ── 추천 조합 ── */}
      <View style={styles.section}>
        <Text style={styles.label}>추천 조합</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.comboRow}
          keyboardShouldPersistTaps="handled"
        >
          {combos.map((c) => {
            const fc = getFolderColor(c.color);
            const selected = emoji === c.emoji && color === c.color;
            return (
              <TouchableOpacity
                key={`${c.emoji}-${c.color}`}
                style={[
                  styles.comboTile,
                  { backgroundColor: fc.bg },
                  selected && { borderColor: fc.icon, borderWidth: 2 },
                ]}
                onPress={() => pickCombo(c)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${c.emoji} ${COLOR_LABELS[c.color]} 조합`}
              >
                <Text style={styles.comboEmoji}>{c.emoji}</Text>
              </TouchableOpacity>
            );
          })}

          {/* 더보기 → 전체 이모지 검색 그리드 */}
          <TouchableOpacity
            style={styles.moreTile}
            onPress={() => {
              lightTap();
              onSearchOpenChange(true);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="이모지 더보기"
          >
            <SearchIcon size={18} color={colors.textMuted} />
            <Text style={styles.moreText}>더보기</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── 색상 ── */}
      <View style={styles.section}>
        <Text style={styles.label}>색상</Text>
        <View style={styles.colorRow}>
          {folderColors.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[
                styles.swatch,
                { backgroundColor: c.icon },
                color === c.key && { ...styles.swatchSelected, borderColor: `${c.icon}40` },
              ]}
              onPress={() => pickColor(c.key)}
              activeOpacity={0.6}
              accessibilityRole="radio"
              accessibilityState={{ checked: color === c.key }}
              accessibilityLabel={`${COLOR_LABELS[c.key]} 색상`}
            >
              {color === c.key && <CheckIcon size={14} color={colors.white} strokeWidth={3} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  section: { marginTop: 20, gap: 11 },
  label: { fontSize: 13, fontFamily: 'LINESeedKR-Bold', color: colors.textMuted },
  comboRow: { flexDirection: 'row', gap: 10, paddingRight: 8 },
  comboTile: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comboEmoji: { fontSize: 26 },
  moreTile: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  moreText: { fontSize: 10, fontFamily: 'LINESeedKR-Bold', color: colors.textMuted },
  colorRow: { flexDirection: 'row', gap: 11 },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: { borderWidth: 3 },
});
