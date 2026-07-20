import React from 'react';

import { StyleSheet, View } from 'react-native';

import { glass } from '../constants/theme';

import Skeleton from './Skeleton';

/**
 * 폴더 카드 로딩 플레이스홀더 — 실제 폴더 카드(HomeScreen.folderCard)와 동일한
 * 치수·형태로 공간을 미리 확보해 로드 완료 시 레이아웃 점프를 막는다
 * (quick-reference §3 content-jumping / progressive-loading).
 * width 는 그리드 셀 폭(cardWidth)을 주입받는다.
 */
export default function FolderCardSkeleton({ width }: { width: number }) {
  return (
    <View style={[styles.card, { width }]}>
      <Skeleton width={34} height={34} borderRadius={11} />
      <Skeleton width="66%" height={13} borderRadius={6} style={styles.name} />
      <Skeleton width="40%" height={10} borderRadius={5} style={styles.count} />
    </View>
  );
}

const styles = StyleSheet.create({
  // HomeScreen.folderCard 와 동일 규격 (height 102 · radius 18 · padding 12/13 · mb 11)
  card: {
    height: 102,
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.border,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 13,
    marginBottom: 11,
  },
  name: { marginTop: 12 },
  count: { marginTop: 8 },
});
