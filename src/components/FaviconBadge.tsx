import React, { useState } from 'react';

import { StyleSheet, Text, View } from 'react-native';

import { Image } from 'expo-image';

import { colors } from '../constants/theme';
import { getDomainInfo } from '../utils/domainInfo';

/**
 * 도메인 파비콘 뱃지 — 링크의 서비스 아이콘(유튜브/인스타그램/티스토리 등)을
 * 동그랗게 표시한다. 파비콘 로드 실패 시 도메인 이니셜 원형으로 폴백.
 */

interface FaviconBadgeProps {
  url: string;
  size?: number;
}

function FaviconBadge({ url, size = 16 }: FaviconBadgeProps) {
  const [failed, setFailed] = useState(false);
  const info = getDomainInfo(url);

  const round = { width: size, height: size, borderRadius: size / 2 };

  if (!info || failed) {
    const initial = (info?.hostname ?? url).charAt(0).toUpperCase();
    return (
      <View style={[styles.fallback, round]}>
        <Text style={[styles.fallbackText, { fontSize: size * 0.55 }]}>{initial}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: info.faviconUrl }}
      style={[styles.icon, round]}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={150}
      onError={() => setFailed(true)}
      accessibilityLabel={`${info.label} 아이콘`}
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    backgroundColor: colors.divider,
  },
  fallback: {
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontFamily: 'LINESeedKR-Bold',
    color: colors.textFaint,
  },
});

export default React.memo(FaviconBadge);
