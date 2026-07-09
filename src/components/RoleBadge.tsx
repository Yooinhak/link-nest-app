import React from 'react';

import { StyleSheet, Text, View } from 'react-native';

import { GroupRole } from '../hooks/queries/useGroups';

/**
 * 역할 뱃지 — 시안 스펙:
 * owner(#E8F3FF/#3182F6) · 편집(#F0FDF4/#22C55E) · 보기(#F2F4F6/#6B7684)
 */

const ROLE_STYLES: Record<GroupRole, { bg: string; fg: string; label: string }> = {
  owner: { bg: '#E8F3FF', fg: '#3182F6', label: '소유자' },
  editor: { bg: '#F0FDF4', fg: '#22C55E', label: '편집' },
  viewer: { bg: '#F2F4F6', fg: '#6B7684', label: '보기' },
};

export default function RoleBadge({ role }: { role: GroupRole }) {
  const s = ROLE_STYLES[role];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
