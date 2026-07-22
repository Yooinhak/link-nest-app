import React from 'react';

import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, glass, moods, resolveMoodKey } from '../constants/theme';
import { useGroup } from '../contexts/GroupContext';
import { useGroupMembersPreviewQuery } from '../hooks/queries/useGroups';
import { useActivityUnread } from '../hooks/useActivityUnread';
import { lightTap } from '../utils/haptics';

import { Avatar } from './AvatarStack';
import { HomeIcon, PlusIcon } from './icons';
import MoodWash from './MoodWash';

/**
 * 채널 레일 — 블루 글래스 시안 02/06. "채널 레일 = 그룹 전환".
 * 개인('나의 서랍') 먼저, 이어서 공유 그룹 칩, 마지막 ＋(새 그룹).
 * 칩 배경은 그룹 무드의 색유리 워시, 활성 칩은 진한 유리 + 무드 액센트 보더.
 * 공유 그룹(2인 이상)에는 마이크로 아바타 2 + "+N" 을 붙여 "함께 쓰는 공간"임을 알린다.
 */

interface GroupRailProps {
  onCreateGroup: () => void;
}

// 개인 공간(나의 서랍) 색유리 — 라벤더 공기의 칩 버전
const LAVENDER_WASH = ['#E2DDFF', '#F1EEFC'] as const;

export default function GroupRail({ onCreateGroup }: GroupRailProps) {
  const { groups, currentGroupId, selectGroup } = useGroup();
  const { isUnread } = useActivityUnread();

  const sharedIds = groups.filter((g) => g.type === 'shared').map((g) => g.id);
  const { data: previews } = useGroupMembersPreviewQuery(sharedIds);

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
        const mood = isPersonal ? null : moods[resolveMoodKey(g.color)];
        const wash = mood ? mood.chipWash : LAVENDER_WASH;
        const preview = isPersonal ? undefined : previews?.[g.id];
        // 혼자 쓰는 그룹은 아바타 없음 — 아바타 자체가 "함께 쓰는 공간" 힌트
        const showAvatars = !isPersonal && !!preview && preview.count >= 2;

        return (
          <TouchableOpacity
            key={g.id}
            style={[
              styles.chip,
              active
                ? {
                    backgroundColor: glass.bgStrong,
                    borderColor: mood ? mood.accent : colors.primary,
                    borderWidth: 1.5,
                  }
                : { backgroundColor: glass.bgSoft, borderColor: glass.borderSoft },
            ]}
            onPress={() => {
              lightTap();
              selectGroup(g.id);
            }}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={`${label}${active ? ' (현재 공간)' : ''}`}
          >
            {/* absoluteFill 워시 — 반드시 칩 내용보다 먼저 (뒤에 오면 내용을 덮는다) */}
            <MoodWash colors={wash} opacity={active ? 0.9 : 0.5} />
            {isPersonal && <HomeIcon size={15} color={colors.primaryDeep} strokeWidth={2.2} />}
            <Text style={[styles.chipLabel, active ? styles.chipLabelActive : styles.chipLabelIdle]} numberOfLines={1}>
              {label}
            </Text>
            {showAvatars && (
              <View style={styles.avatarRow}>
                {preview.members.slice(0, 2).map((m, i) => (
                  <View key={m.userId} style={[styles.avatarRing, i > 0 && styles.avatarOverlap]}>
                    <Avatar member={m} size={16} />
                  </View>
                ))}
                {preview.count > 2 && (
                  <View
                    style={[
                      styles.avatarRing,
                      styles.avatarOverlap,
                      styles.moreBadge,
                      mood && { backgroundColor: mood.tile },
                    ]}
                  >
                    <Text style={[styles.moreText, mood && { color: mood.metaText }]}>+{preview.count - 2}</Text>
                  </View>
                )}
              </View>
            )}
            {hasUnread(g) && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[styles.chip, styles.chipIdlePlain, styles.plusChip]}
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
    overflow: 'hidden', // MoodWash 를 칩 모양으로 클리핑
  },
  chipIdlePlain: {
    backgroundColor: glass.bgSoft,
    borderColor: glass.borderSoft,
  },
  plusChip: {
    width: 42,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 2,
  },
  avatarRing: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.white,
    backgroundColor: colors.white,
  },
  avatarOverlap: {
    marginLeft: -5,
  },
  moreBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontSize: 8,
    fontFamily: 'LINESeedKR-Bold',
    color: colors.textFaint,
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
