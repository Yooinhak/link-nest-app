import React, { useCallback, useMemo, useRef, useState } from 'react';

import {
  FlatList,
  LayoutAnimation,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

import { RouteProp, useRoute } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';

import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import Input from '../components/Input';
import LinkPreviewCard, {
  type LinkPreviewCardHandle,
  LinkPreviewCardSkeleton,
  ViewMode,
} from '../components/LinkPreviewCard';
import { useToast } from '../components/Toast';
import { colors } from '../constants/theme';
import { useCreatePost, usePostsQuery, useUpdatePost } from '../hooks/queries';
import { MainStackParamList } from '../navigation/types';
import { mediumTap } from '../utils/haptics';
import { isValidUrl } from '../utils/validateUrl';

// Android LayoutAnimation 활성화
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FolderDetailRouteProp = RouteProp<MainStackParamList, 'FolderDetail'>;
type SortOrder = 'newest' | 'oldest';

const PlusIcon = () => (
  <Svg
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke={colors.white}
    strokeWidth={2.5}
    strokeLinecap="round"
  >
    <Path d="M12 5v14M5 12h14" />
  </Svg>
);

const GridIcon = ({ active }: { active: boolean }) => (
  <Svg
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? colors.primary : colors.gray[400]}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
  </Svg>
);

const ListIcon = ({ active }: { active: boolean }) => (
  <Svg
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? colors.primary : colors.gray[400]}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </Svg>
);

const SearchIcon = () => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke={colors.gray[400]}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" />
  </Svg>
);

const SortIcon = () => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke={colors.gray[600]}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="m3 16 4 4 4-4M7 20V4M21 8l-4-4-4 4M17 4v16" />
  </Svg>
);

export default function FolderDetailScreen() {
  const route = useRoute<FolderDetailRouteProp>();
  const { folderId } = route.params;
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('large');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [createVisible, setCreateVisible] = useState(false);
  const [postUrl, setPostUrl] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 링크 수정 상태
  const [editVisible, setEditVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: number; description: string } | null>(null);

  const { data: postList, isLoading, refetch, isRefetching } = usePostsQuery(folderId);
  const createPost = useCreatePost();
  const updatePost = useUpdatePost(folderId);

  const filteredList = useMemo(() => {
    let list = postList ?? [];

    // 검색 필터
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.url.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q)),
      );
    }

    // 정렬
    return [...list].sort((a, b) => {
      const dateA = new Date(a.created_at ?? 0).getTime();
      const dateB = new Date(b.created_at ?? 0).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [postList, searchQuery, sortOrder]);

  const handleCreate = () => {
    const url = postUrl.trim();
    if (!url) {
      showToast('error', 'URL을 입력해주세요');
      return;
    }
    if (!isValidUrl(url)) {
      showToast('error', '올바른 URL 형식이 아니에요 (https://...)');
      return;
    }

    // 중복 감지
    const isDuplicate = postList?.some((item) => item.url === url);
    if (isDuplicate) {
      showToast('error', '이미 저장된 링크예요');
      return;
    }

    createPost.mutate(
      { url, description: postDescription.trim() || null, folder_id: Number(folderId) },
      {
        onSuccess: () => {
          setPostUrl('');
          setPostDescription('');
          setCreateVisible(false);
        },
      },
    );
  };

  const handleUpdateDescription = () => {
    if (!editTarget) return;
    updatePost.mutate(
      { id: editTarget.id, description: editTarget.description.trim() || null },
      {
        onSuccess: () => setEditVisible(false),
      },
    );
  };

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    mediumTap();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewMode(mode);
  }, []);

  const handleSortToggle = useCallback(() => {
    mediumTap();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'));
  }, []);

  const handleEditPress = useCallback((id: number, description: string | null) => {
    setEditTarget({ id, description: description ?? '' });
    setEditVisible(true);
  }, []);

  // iOS Mail 패턴: 한 번에 한 카드만 열린 상태로 유지.
  // 카드가 스와이프 시작 시 자신의 핸들을 전달하며, 이전 카드를 닫는다.
  const lastOpenedRef = useRef<LinkPreviewCardHandle | null>(null);
  const handleSwipeStart = useCallback((handle: LinkPreviewCardHandle) => {
    if (lastOpenedRef.current && lastOpenedRef.current !== handle) {
      lastOpenedRef.current.close();
    }
    lastOpenedRef.current = handle;
  }, []);

  // B-5: FlatList 렌더 최적화 — renderItem/keyExtractor/ItemSeparator 를 useCallback 으로 안정화.
  // React.memo 된 LinkPreviewCard 가 불필요하게 리렌더되지 않도록 한다.
  const renderItem = useCallback(
    ({ item }: { item: { id: number; url: string; description: string | null } }) => (
      <LinkPreviewCard
        id={item.id}
        url={item.url}
        userDescription={item.description}
        folderId={folderId}
        viewMode={viewMode}
        onEditPress={handleEditPress}
        onSwipeStart={handleSwipeStart}
      />
    ),
    [folderId, viewMode, handleEditPress, handleSwipeStart],
  );

  const keyExtractor = useCallback((item: { id: number }) => String(item.id), []);

  const ItemSeparator = useCallback(() => <View style={{ height: viewMode === 'compact' ? 6 : 10 }} />, [viewMode]);

  const count = postList?.length ?? 0;

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <SearchIcon />
          <TextInput
            style={styles.searchInput}
            placeholder="링크 검색..."
            placeholderTextColor={colors.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              activeOpacity={0.5}
              accessibilityRole="button"
              accessibilityLabel="검색 지우기"
            >
              <Text style={styles.searchClear}>취소</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Count + Sort + View toggle */}
      <View style={styles.countRow}>
        <View style={styles.countLeft}>
          <View style={styles.countBadge}>
            <Text style={styles.countNumber}>{searchQuery ? filteredList.length : count}</Text>
          </View>
          <Text style={styles.countText}>개의 링크</Text>
        </View>
        <View style={styles.countRight}>
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={handleSortToggle}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel={`정렬 기준: ${sortOrder === 'newest' ? '최신순' : '오래된순'}`}
          >
            <SortIcon />
            <Text style={styles.sortText}>{sortOrder === 'newest' ? '최신순' : '오래된순'}</Text>
          </TouchableOpacity>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'large' && styles.viewToggleBtnActive]}
              onPress={() => handleViewModeChange('large')}
              activeOpacity={0.6}
              accessibilityRole="radio"
              accessibilityState={{ checked: viewMode === 'large' }}
              accessibilityLabel="큰 카드 보기"
            >
              <GridIcon active={viewMode === 'large'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'compact' && styles.viewToggleBtnActive]}
              onPress={() => handleViewModeChange('compact')}
              activeOpacity={0.6}
              accessibilityRole="radio"
              accessibilityState={{ checked: viewMode === 'compact' }}
              accessibilityLabel="간단히 보기"
            >
              <ListIcon active={viewMode === 'compact'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.list}>
          {[1, 2, 3].map((i) => (
            <LinkPreviewCardSkeleton key={i} viewMode={viewMode} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={ItemSeparator}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            searchQuery ? (
              <EmptyState type="search" title="검색 결과가 없어요" subtitle="다른 키워드로 검색해보세요" />
            ) : (
              <EmptyState type="link" title="아직 링크가 없어요" subtitle="아래 버튼으로 링크를 추가해보세요" />
            )
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setPostUrl('');
          setPostDescription('');
          setCreateVisible(true);
        }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="링크 추가"
      >
        <PlusIcon />
      </TouchableOpacity>

      {/* 링크 추가 바텀시트 */}
      <BottomSheet visible={createVisible} onClose={() => setCreateVisible(false)} title="링크 추가">
        <View style={styles.form}>
          <Input
            label="URL"
            placeholder="https://"
            value={postUrl}
            onChangeText={setPostUrl}
            autoCapitalize="none"
            keyboardType="url"
            autoFocus
          />
          <Input
            label="메모 (선택)"
            placeholder="이 링크에 대한 메모"
            value={postDescription}
            onChangeText={setPostDescription}
          />
        </View>
        <View style={styles.sheetBtns}>
          <Button variant="secondary" onPress={() => setCreateVisible(false)} style={{ flex: 1 }}>
            취소
          </Button>
          <Button onPress={handleCreate} loading={createPost.isPending} style={{ flex: 1 }}>
            추가
          </Button>
        </View>
      </BottomSheet>

      {/* 메모 수정 바텀시트 */}
      <BottomSheet visible={editVisible} onClose={() => setEditVisible(false)} title="메모 수정">
        <Input
          placeholder="메모를 입력해주세요"
          value={editTarget?.description ?? ''}
          onChangeText={(t) => setEditTarget((p) => (p ? { ...p, description: t } : null))}
          autoFocus
        />
        <View style={styles.sheetBtns}>
          <Button variant="secondary" onPress={() => setEditVisible(false)} style={{ flex: 1 }}>
            취소
          </Button>
          <Button onPress={handleUpdateDescription} loading={updatePost.isPending} style={{ flex: 1 }}>
            저장
          </Button>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.gray[900],
    paddingVertical: 0,
  },
  searchClear: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[200],
  },
  countLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[600],
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.gray[100],
    borderRadius: 10,
    padding: 2,
  },
  viewToggleBtn: {
    width: 34,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleBtnActive: {
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  countText: { fontSize: 14, color: colors.gray[600], fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
  form: { gap: 16 },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
