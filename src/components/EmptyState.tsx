import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { colors } from '../constants/theme';

interface EmptyStateProps {
  type: 'folder' | 'link' | 'search';
  title: string;
  subtitle: string;
}

function FolderIllustration() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
      {/* Shadow */}
      <Ellipse cx={60} cy={105} rx={40} ry={6} fill={colors.gray[200]} opacity={0.5} />
      {/* Folder back */}
      <Rect x={18} y={35} width={84} height={60} rx={8} fill={colors.blue[100]} />
      {/* Folder tab */}
      <Path d="M18 43c0-4.4 3.6-8 8-8h20l6 10h42c4.4 0 8 3.6 8 8v0H18V43z" fill={colors.primary} opacity={0.9} />
      {/* Folder front */}
      <Rect x={18} y={50} width={84} height={45} rx={8} fill={colors.primary} opacity={0.15} />
      {/* Plus icon */}
      <Circle cx={60} cy={70} r={14} fill={colors.primary} opacity={0.2} />
      <Path d="M60 63v14M53 70h14" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

function LinkIllustration() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
      {/* Shadow */}
      <Ellipse cx={60} cy={105} rx={40} ry={6} fill={colors.gray[200]} opacity={0.5} />
      {/* Chain link 1 */}
      <G opacity={0.9}>
        <Rect x={25} y={40} width={35} height={44} rx={10} stroke={colors.primary} strokeWidth={4} fill="none" />
      </G>
      {/* Chain link 2 */}
      <G opacity={0.9}>
        <Rect x={60} y={36} width={35} height={44} rx={10} stroke={colors.blue[100]} strokeWidth={4} fill="none" />
      </G>
      {/* Connection point */}
      <Circle cx={60} cy={58} r={5} fill={colors.primary} opacity={0.3} />
      {/* Sparkles */}
      <Path d="M85 30l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill={colors.primary} opacity={0.4} />
      <Path d="M30 28l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" fill={colors.blue[100]} opacity={0.6} />
    </Svg>
  );
}

function SearchIllustration() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
      {/* Shadow */}
      <Ellipse cx={60} cy={105} rx={40} ry={6} fill={colors.gray[200]} opacity={0.5} />
      {/* Magnifying glass circle */}
      <Circle cx={52} cy={55} r={24} stroke={colors.gray[300]} strokeWidth={4} fill="none" />
      {/* Glass fill */}
      <Circle cx={52} cy={55} r={20} fill={colors.gray[100]} />
      {/* Handle */}
      <Path d="M70 73l18 18" stroke={colors.gray[300]} strokeWidth={5} strokeLinecap="round" />
      {/* Question mark */}
      <Path d="M47 48c0-4 3-7 7-7s7 3 7 7c0 3-2 4-4 5s-3 2-3 4" stroke={colors.gray[400]} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={54} cy={66} r={1.5} fill={colors.gray[400]} />
    </Svg>
  );
}

export default function EmptyState({ type, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {type === 'folder' && <FolderIllustration />}
      {type === 'link' && <LinkIllustration />}
      {type === 'search' && <SearchIllustration />}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[700],
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 20,
  },
});
