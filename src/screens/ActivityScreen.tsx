import React, { useCallback, useMemo } from 'react';

import { ActivityIndicator, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../components/AvatarStack';
import EmptyState from '../components/EmptyState';
import FaviconBadge from '../components/FaviconBadge';
import GlassBackground from '../components/GlassBackground';
import { colors, glass, warm } from '../constants/theme';
import { useGroup } from '../contexts/GroupContext';
import { type ActivityFeedItem, useActivityFeedQuery } from '../hooks/queries';
import { useActivityUnread } from '../hooks/useActivityUnread';
import { MainStackParamList } from '../navigation/types';
import { getDomainInfo } from '../utils/domainInfo';
import { parseMetadata } from '../utils/parseMetadata';
import { queryKeys } from '../utils/react-query/queryKeys';
import { relativeTime } from '../utils/relativeTime';

/**
 * 활동 화면 — 공유 그룹 전용 전역 피드 (리텐션). 하단 [활동] 탭.
 * "○○님이 «폴더»에 링크 추가"를 날짜별로 묶어 최신순으로 보여준다.
 * 탭 포커스 시 모든 공유 그룹을 '읽음' 처리해 탭 배지·레일 점을 함께 끈다.
 */

// 탭 화면이지만 부모 스택의 FolderDetail 로 이동하므로 스택 nav 타입으로 단언한다.
type Nav = NativeStackNavigationProp<MainStackParamList>;

function sectionTitle(iso: string | null): string {
  if (!iso) return '기타';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '기타';
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (dayDiff <= 0) return '오늘';
  if (dayDiff === 1) return '어제';
  if (dayDiff < 7) return '이번 주';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function domainOf(url: string): string {
  const label = getDomainInfo(url)?.label;
  if (label) return label;
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function ActivityRow({ item, onPress }: { item: ActivityFeedItem; onPress: () => void }) {
  const { data: meta } = useQuery({
    queryKey: [queryKeys.METADATA, item.url],
    queryFn: () => parseMetadata(item.url),
    enabled: !!item.url,
  });
  const name = item.displayName ?? '멤버';
  const domain = domainOf(item.url);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={`${name}님이 ${item.folderName}에 추가한 링크 열기`}
    >
      <Avatar
        member={{ userId: item.userId ?? '', displayName: item.displayName, avatarUrl: item.avatarUrl }}
        size={36}
      />
      <View style={styles.rowBody}>
        <Text style={styles.rowText}>
          <Text style={styles.rowName}>{name}</Text>
          {`님이 ${item.groupEmoji ?? '📁'} ${item.folderName}에 추가 · `}
          <Text style={styles.rowTime}>{relativeTime(item.createdAt)}</Text>
        </Text>
        <View style={styles.linkCard}>
          <FaviconBadge url={item.url} size={16} />
          <View style={styles.linkBody}>
            <Text style={styles.linkTitle} numberOfLines={1}>
              {meta?.title || domain}
            </Text>
            <Text style={styles.linkDomain} numberOfLines={1}>
              {domain}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ActivityScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { selectGroup } = useGroup();
  const { data: feed, isLoading } = useActivityFeedQuery(true);
  const { markAllSeen, markGroupSeen } = useActivityUnread();

  // 탭이 포커스될 때마다(그리고 활동 데이터가 로드되면) 모두 읽음
  useFocusEffect(
    useCallback(() => {
      markAllSeen();
    }, [markAllSeen]),
  );

  const sections = useMemo(() => {
    const out: { title: string; data: ActivityFeedItem[] }[] = [];
    let cur: { title: string; data: ActivityFeedItem[] } | null = null;
    for (const it of feed ?? []) {
      const t = sectionTitle(it.createdAt);
      if (!cur || cur.title !== t) {
        cur = { title: t, data: [] };
        out.push(cur);
      }
      cur.data.push(it);
    }
    return out;
  }, [feed]);

  const handleOpen = useCallback(
    (item: ActivityFeedItem) => {
      selectGroup(item.groupId); // 폴더 상세의 컨텍스트(권한/브레드크럼)를 그 그룹으로 맞춤
      markGroupSeen(item.groupId);
      navigation.navigate('FolderDetail', {
        folderId: String(item.folderId),
        folderName: item.folderName,
        folderColor: item.folderColor ?? undefined,
        folderEmoji: item.folderEmoji ?? undefined,
      });
    },
    [navigation, selectGroup, markGroupSeen],
  );

  return (
    <View style={styles.container}>
      <GlassBackground variant="group" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          활동
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ActivityRow item={item} onPress={() => handleOpen(item)} />}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        contentContainerStyle={[styles.list, { paddingBottom: 120 + insets.bottom }]}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <EmptyState
              type="link"
              title="아직 새 소식이 없어요"
              subtitle={'친구가 링크를 담으면\n여기에 모여요'}
              warmTone
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F9FE' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'LINESeedKR-Bold',
    color: colors.ink,
    letterSpacing: -0.6,
  },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  sectionHeader: {
    fontSize: 11,
    fontFamily: 'LINESeedKR-Bold',
    letterSpacing: 0.6,
    color: warm.text,
    marginTop: 16,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 11,
    paddingVertical: 11,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowText: {
    fontSize: 13.5,
    fontFamily: 'LINESeedKR',
    color: colors.textSub,
    lineHeight: 20,
  },
  rowName: { fontFamily: 'LINESeedKR-Bold', color: colors.ink },
  rowTime: { color: colors.textFaint },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 8,
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  linkBody: { flex: 1, minWidth: 0 },
  linkTitle: { fontSize: 13, fontFamily: 'LINESeedKR-Bold', color: colors.ink },
  linkDomain: { fontSize: 11, fontFamily: 'LINESeedKR', color: colors.textFaint, marginTop: 1 },
  loading: { paddingTop: 80, alignItems: 'center' },
});
