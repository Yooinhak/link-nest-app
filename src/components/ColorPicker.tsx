import React from 'react';

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, FolderColorKey, folderColors } from '../constants/theme';
import { lightTap } from '../utils/haptics';

import { CheckIcon } from './icons';

/**
 * 6색 컬러 피커 — 폴더/그룹 공용 (HomeScreen 에서 추출, 2026-07-09).
 * 선택 시 색상별 25% 알파 링 + 체크.
 */

const COLOR_LABELS: Record<FolderColorKey, string> = {
  blue: '파랑',
  purple: '보라',
  pink: '분홍',
  orange: '주황',
  green: '초록',
  gray: '회색',
};

interface ColorPickerProps {
  selected: FolderColorKey;
  onSelect: (key: FolderColorKey) => void;
  label?: string;
}

export default function ColorPicker({ selected, onSelect, label = '색상' }: ColorPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {folderColors.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[
              styles.swatch,
              { backgroundColor: c.icon },
              selected === c.key && { ...styles.swatchSelected, borderColor: `${c.icon}40` },
            ]}
            onPress={() => {
              lightTap();
              onSelect(c.key);
            }}
            activeOpacity={0.6}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected === c.key }}
            accessibilityLabel={`${COLOR_LABELS[c.key]} 색상`}
          >
            {selected === c.key && <CheckIcon size={14} color={colors.white} strokeWidth={3} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20, gap: 11 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  row: { flexDirection: 'row', gap: 11 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  swatchSelected: { borderWidth: 3 },
});
