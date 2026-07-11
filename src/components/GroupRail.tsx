import React from 'react';

import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, glass, shadows } from '../constants/theme';
import { useGroup } from '../contexts/GroupContext';
import { lightTap } from '../utils/haptics';

import { PlusIcon } from './icons';

/**
 * 채널 레일 — 블루 글래스 시안 02/06. "채널 레일 = 그룹 전환".
 * 개인('나의 서랍' 🏠) 먼저, 이어서 공유 그룹 칩, 마지막 ＋(새 그룹).
 * 활성 칩 = 진한 유리 + 그림자, 비활성 = 옅은 유리.
 * 기존 GroupSwitcherSheet 를 대체한다.
 */

interface GroupRailProps {
  onCreateGroup: () => void;
}

export default function GroupRail({ onCreateGroup }: GroupRailProps) {
  const { groups, currentGroupId, selectGroup } = useGroup();

  const sorted = [...groups].sort((a, b) => (a.type === b.type ? 0 : a.type === 'personal' ? -1 : 1));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
      style={styles.railWrap}
    >
      {sorted.map((g) => {
        const active = g.id === currentGroupId;
        const isPersonal = g.type === 'personal';
        const label = isPersonal ? '나의 서랍' : g.name;
        const emoji = isPersonal ? '🏠' : (g.emoji ?? '📁');
        return (
          <TouchableOpacity
            key={g.id}
            style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
            onPress={() => {
              lightTap();
              selectGroup(g.id);
            }}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={`${label}${active ? ' (현재 공간)' : ''}`}
          >
            <Text style={styles.chipEmoji}>{emoji}</Text>
            <Text style={[styles.chipLabel, active ? styles.chipLabelActive : styles.chipLabelIdle]} numberOfLines={1}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[styles.chip, styles.chipIdle, styles.plusChip]}
        onPress={() => {
          lightTap();
          onCreateGroup();
        }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="새 공유 그룹 만들기"
      >
        <PlusIcon size={16} color={colors.primary} strokeWidth={2.4} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  railWrap: {
    flexGrow: 0,
  },
  rail: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 2, // 그림자 잘림 방지 여유
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 13,
    borderRadius: 21,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: glass.bgStrong,
    borderColor: glass.border,
    ...shadows.chip,
  },
  chipIdle: {
    backgroundColor: glass.bgSoft,
    borderColor: glass.borderSoft,
  },
  plusChip: {
    width: 42,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  chipEmoji: {
    fontSize: 17,
  },
  chipLabel: {
    fontSize: 14,
    maxWidth: 130,
  },
  chipLabelActive: {
    fontFamily: 'LINESeedKR-Bold',
    color: colors.ink,
  },
  chipLabelIdle: {
    fontFamily: 'LINESeedKR-Bold',
    color: colors.textSub,
  },
});
