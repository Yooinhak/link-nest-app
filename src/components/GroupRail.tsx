import React from 'react';

import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, getGroupColor, glass, shadows } from '../constants/theme';
import { useGroup } from '../contexts/GroupContext';
import { useActivityUnread } from '../hooks/useActivityUnread';
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
  const { isUnread } = useActivityUnread();

  // 공유 그룹에 마지막으로 본 시각보다 최신 활동이 있으면 안읽음 점 표시.
  // '읽음' 처리는 폴더 열람(markGroupSeen)·활동 피드 진입(markAllSeen)에서 담당.
  const hasUnread = (g: { id: string; type: string }) => isUnread(g.id, g.type);

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
            {isPersonal ? (
              <Text style={styles.chipEmoji}>{emoji}</Text>
            ) : (
              // 그룹은 id 기반 색 타일에 이모지를 담아 레일에서 서로 구분되게 한다
              <View style={[styles.chipTile, { backgroundColor: getGroupColor(g.id).bg }]}>
                <Text style={styles.chipTileEmoji}>{emoji}</Text>
              </View>
            )}
            <Text style={[styles.chipLabel, active ? styles.chipLabelActive : styles.chipLabelIdle]} numberOfLines={1}>
              {label}
            </Text>
            {hasUnread(g) && <View style={styles.unreadDot} />}
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
  chipTile: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipTileEmoji: {
    fontSize: 14,
  },
  // 안읽음 활동 점 — 그룹 칩 우상단
  unreadDot: {
    position: 'absolute',
    top: 5,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: glass.bgStrong,
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
