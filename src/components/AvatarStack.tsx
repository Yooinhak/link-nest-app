import React, { useState } from 'react';

import { StyleSheet, Text, View } from 'react-native';

import { Image } from 'expo-image';

import { colors } from '../constants/theme';
import { normalizeAvatarUrl } from '../utils/avatarUrl';

/**
 * 멤버 아바타 스택 — 시안 스펙: 최대 3개 + "+N", 원형, 흰 2px 링, -8px 겹침.
 * avatarUrl 이 없으면 이름 첫 글자 이니셜.
 */

export interface StackAvatar {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface AvatarStackProps {
  members: StackAvatar[];
  size?: number;
  max?: number;
}

const PALETTE = ['#8B7EF2', '#EC4899', '#22C55E', '#6D5EF0', '#F97316'];

function colorFor(userId: string) {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function Avatar({ member, size = 28 }: { member: StackAvatar; size?: number }) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  const uri = normalizeAvatarUrl(member.avatarUrl);

  // 로드 실패 시 이니셜로 되돌린다 (카카오 http 차단·404 등).
  // uri 가 바뀌면 렌더 중 비교로 failed 를 리셋한다(effect 없이 — 새 이미지 재시도).
  const [failed, setFailed] = useState(false);
  const [loadedUri, setLoadedUri] = useState(uri);
  if (uri !== loadedUri) {
    setLoadedUri(uri);
    setFailed(false);
  }

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[round, styles.avatarImage]}
        contentFit="cover"
        cachePolicy="memory-disk"
        onError={() => setFailed(true)}
      />
    );
  }
  const initial = (member.displayName ?? '?').charAt(0).toUpperCase();
  return (
    <View style={[round, styles.fallback, { backgroundColor: colorFor(member.userId) }]}>
      <Text style={[styles.fallbackText, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

export default function AvatarStack({ members, size = 28, max = 3 }: AvatarStackProps) {
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;
  const overlap = -Math.round(size * 0.29); // 28px 기준 -8

  return (
    <View style={styles.row} accessibilityLabel={`멤버 ${members.length}명`}>
      {shown.map((m, i) => (
        <View key={m.userId} style={[styles.ring, { marginLeft: i === 0 ? 0 : overlap, borderRadius: size / 2 + 2 }]}>
          <Avatar member={m} size={size} />
        </View>
      ))}
      {rest > 0 && (
        <View
          style={[
            styles.ring,
            { marginLeft: overlap, borderRadius: size / 2 + 2 },
          ]}
        >
          <View style={[styles.more, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text style={[styles.moreText, { fontSize: size * 0.36 }]}>+{rest}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ring: {
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.white,
  },
  avatarImage: {
    backgroundColor: colors.divider,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontFamily: 'LINESeedKR-Bold',
    color: colors.white,
  },
  more: {
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontFamily: 'LINESeedKR-Bold',
    color: colors.textFaint,
  },
});
