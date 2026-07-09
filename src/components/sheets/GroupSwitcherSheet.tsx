import React from 'react';

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, getFolderColor } from '../../constants/theme';
import { useGroup } from '../../contexts/GroupContext';
import { GroupSummary } from '../../hooks/queries/useGroups';
import { lightTap } from '../../utils/haptics';
import BottomSheet from '../BottomSheet';
import { CheckIcon, PlusIcon } from '../icons';

/**
 * 그룹 스위처 시트 — 시안 ①.
 * 그룹 목록(개인 먼저) + 현재 선택 체크 + "새 공유 그룹 만들기" CTA.
 */

interface GroupSwitcherSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreateGroup: () => void;
}

function GroupRow({
  group,
  selected,
  onPress,
}: {
  group: GroupSummary;
  selected: boolean;
  onPress: () => void;
}) {
  const fc = getFolderColor(group.color);
  const isPersonal = group.type === 'personal';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${group.name} 그룹으로 전환`}
    >
      <View style={[styles.tile, { backgroundColor: isPersonal ? colors.primaryTint : fc.bg }]}>
        <Text style={styles.tileEmoji}>{isPersonal ? '🏠' : (group.emoji ?? '📁')}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={styles.meta}>
          {isPersonal ? '나만 보기' : `멤버 ${group.memberCount}명`}
        </Text>
      </View>
      {selected && <CheckIcon size={18} color={colors.primary} strokeWidth={2.5} />}
    </TouchableOpacity>
  );
}

export default function GroupSwitcherSheet({ visible, onClose, onCreateGroup }: GroupSwitcherSheetProps) {
  const { groups, currentGroupId, selectGroup } = useGroup();

  return (
    <BottomSheet visible={visible} onClose={onClose} title="그룹">
      <View style={styles.list}>
        {groups.map((g) => (
          <GroupRow
            key={g.id}
            group={g}
            selected={g.id === currentGroupId}
            onPress={() => {
              lightTap();
              selectGroup(g.id);
              onClose();
            }}
          />
        ))}
      </View>

      <TouchableOpacity
        style={styles.createBtn}
        onPress={() => {
          onClose();
          onCreateGroup();
        }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="새 공유 그룹 만들기"
      >
        <PlusIcon size={17} color={colors.primary} strokeWidth={2.4} />
        <Text style={styles.createText}>새 공유 그룹 만들기</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  tile: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileEmoji: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textFaint,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primaryTint,
    marginTop: 14,
    marginBottom: 6,
  },
  createText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
});
