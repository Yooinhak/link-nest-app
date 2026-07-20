import React from 'react';

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, getFolderColor } from '../constants/theme';
import { lightTap } from '../utils/haptics';

import { FolderIcon, PlusIcon } from './icons';

/**
 * 폴더 미리보기 타일 — 그리드의 실제 폴더 타일과 동일 스타일(색 배경 + 이모지/폴더아이콘).
 * 폴더 생성/수정 시트 상단에서 "완성 모습"을 실시간으로 보여주고,
 * 탭하면 이모지 피커를 여는 트리거로도 쓴다(이모지 없을 땐 ＋ 배지로 힌트).
 */

interface FolderTilePreviewProps {
  color: string | null;
  emoji: string | null;
  /** 탭 시 콜백 (예: 이모지 피커 토글). 없으면 정적 미리보기. */
  onPress?: () => void;
  /** 이모지 피커가 열려 있을 때 강조 링. */
  active?: boolean;
  size?: number;
}

export default function FolderTilePreview({
  color,
  emoji,
  onPress,
  active = false,
  size = 48,
}: FolderTilePreviewProps) {
  const fc = getFolderColor(color);
  const glyphSize = Math.round(size * 0.5);

  const inner = (
    <>
      <View
        style={[
          styles.tile,
          { width: size, height: size, borderRadius: Math.round(size * 0.32), backgroundColor: fc.bg },
        ]}
      >
        {emoji ? (
          <Text style={{ fontSize: glyphSize }}>{emoji}</Text>
        ) : (
          <FolderIcon size={glyphSize} color={fc.icon} />
        )}
      </View>
      {onPress && !emoji ? (
        <View style={styles.addBadge}>
          <PlusIcon size={11} color={colors.white} strokeWidth={3} />
        </View>
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.wrap}>{inner}</View>;
  }

  return (
    <TouchableOpacity
      style={[styles.wrap, active && styles.wrapActive]}
      onPress={() => {
        lightTap();
        onPress();
      }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={emoji ? '폴더 이모지 변경' : '폴더 이모지 추가'}
    >
      {inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 3,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  wrapActive: {
    borderColor: colors.primary,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
