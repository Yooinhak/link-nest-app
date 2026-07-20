import React from 'react';

import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/theme';
import { GroupMember, GroupRole } from '../hooks/queries/useGroups';

import { Avatar } from './AvatarStack';
import ContextMenu, { ContextMenuItem } from './ContextMenu';
import RoleBadge from './RoleBadge';

/**
 * 멤버 행 — 시안 스펙: 아바타 40 + 이름 + RoleBadge + (owner 뷰) ··· 메뉴.
 */

interface MemberRowProps {
  member: GroupMember;
  isMe: boolean;
  /** 내가 owner이고 대상이 내가 아닐 때만 메뉴 노출 */
  canManage: boolean;
  onChangeRole?: (userId: string, role: Exclude<GroupRole, 'owner'>) => void;
  onKick?: (userId: string) => void;
}

export default function MemberRow({ member, isMe, canManage, onChangeRole, onKick }: MemberRowProps) {
  const name = member.displayName ?? '이름 없음';

  const menuItems: ContextMenuItem[] = [
    {
      label: member.role === 'editor' ? '보기 전용으로 변경' : '편집 가능으로 변경',
      onPress: () => onChangeRole?.(member.userId, member.role === 'editor' ? 'viewer' : 'editor'),
    },
    {
      label: '내보내기',
      destructive: true,
      onPress: () => onKick?.(member.userId),
    },
  ];

  return (
    <View style={styles.row}>
      <Avatar member={member} size={40} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
          {isMe && <Text style={styles.me}> (나)</Text>}
        </Text>
      </View>
      <RoleBadge role={member.role} />
      {canManage && member.role !== 'owner' && (
        <ContextMenu
          items={menuItems}
          trigger={
            <View style={styles.moreBtn}>
              <Text style={styles.moreDots}>···</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontFamily: 'LINESeedKR-Bold',
    color: colors.ink,
  },
  me: {
    fontSize: 13,
    fontFamily: 'LINESeedKR',
    color: colors.textDisabled,
  },
  moreBtn: {
    padding: 6,
  },
  moreDots: {
    fontSize: 17,
    color: colors.textDisabled,
  },
});
