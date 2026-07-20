import React from 'react';

import { StyleSheet, Text, View } from 'react-native';

import { colors, glass } from '../constants/theme';

/**
 * 빈 상태 — 블루 글래스 시안 10:
 * 대시 보더 유리 타일(130) + 큰 이모지 + 타이틀 + 서브텍스트 (+ 선택 CTA).
 * warmTone=true 면 공유 그룹의 웜 공기에 맞는 대시/텍스트 색을 쓴다.
 */

interface EmptyStateProps {
  type: 'folder' | 'link' | 'search';
  title: string;
  subtitle: string;
  /** 공유 그룹(웜 공기) 화면이면 true */
  warmTone?: boolean;
  /** CTA 버튼 등 하단 액션 (선택) */
  children?: React.ReactNode;
}

const EMOJI: Record<EmptyStateProps['type'], string> = {
  folder: '📁',
  link: '🔗',
  search: '🔍',
};

export default function EmptyState({ type, title, subtitle, warmTone = false, children }: EmptyStateProps) {
  const dashColor = warmTone ? 'rgba(249,115,22,0.45)' : 'rgba(139,126,242,0.45)';
  const subColor = warmTone ? '#8B7355' : colors.textFaint;

  return (
    <View style={styles.container}>
      <View style={[styles.tile, { borderColor: dashColor }, warmTone ? styles.tileWarmShadow : styles.tileBlueShadow]}>
        <Text style={styles.emoji}>{EMOJI[type]}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.subtitle, { color: subColor }]}>{subtitle}</Text>
      {children && <View style={styles.actions}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 40,
  },
  tile: {
    width: 130,
    height: 130,
    borderRadius: 30,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: glass.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 반투명 표면에는 그림자 금지 (theme.ts 유리 표면 규칙) — 대시 보더 색으로만 톤 구분
  tileBlueShadow: {},
  tileWarmShadow: {},
  emoji: {
    fontSize: 44,
  },
  title: {
    fontSize: 19,
    fontFamily: 'LINESeedKR-Bold',
    color: colors.ink,
    letterSpacing: -0.57,
    marginTop: 26,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'LINESeedKR',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 9,
  },
  actions: {
    alignItems: 'center',
    marginTop: 24,
    gap: 4,
  },
});
