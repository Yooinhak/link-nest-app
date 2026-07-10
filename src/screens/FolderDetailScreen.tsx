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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import {
  ArrowUpDownIcon,
  LayoutGridIcon,
  ListIcon as ListGlyphIcon,
  PlusIcon,
  SearchIcon,
} from '../components/icons';
import Input from '../components/Input';
import LinkPreviewCard, {
  type LinkPreviewCardHandle,
  LinkPreviewCardSkeleton,
  ViewMode,
} from '../components/LinkPreviewCard';
import { useToast } from '../components/Toast';
import { colors, shadows } from '../constants/theme';
import { useGroup } from '../contexts/GroupContext';
import { useCreatePost, useGroupMembersQuery, usePostsQuery, useUpdatePost } from '../hooks/queries';
import { useAuth } from '../hooks/useAuth';
import { MainStackParamList } from '../navigation/types';
import { mediumTap } from '../utils/haptics';
import { isValidUrl } from '../utils/validateUrl';

// Android LayoutAnimation 활성화
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FolderDetailRouteProp = RouteProp<MainStackParamList, 'FolderDetail'>;
type SortOrder = 'newest' | 'oldest';

export default function FolderDetailScreen() {
  const route = useRoute<FolderDetailRouteProp>();
  const { folderId } = route.params;
  const insets = useSafeAreaInsets(); // Android edge-to-edge 하단 대응
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

  // ── 그룹 권한 + 멤버 정보 (시안 권한 규칙 / ⑦ 추가한 사람) ──
  const { myRole, isPersonal, currentGroupId } = useGroup();
  const canEdit = myRole !== 'viewer';
  const { session } = useAuth();
  const myUserId = session?.user?.id ?? null;
  const { data: members = [] } = useGroupMembersQuery(!isPersonal ? currentGroupId : null);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);

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
    ({
      item,
    }: {
      item: { id: number; url: string; description: string | null; user_id: string | null; created_at: string | null };
    }) => {
      const member = !isPersonal && item.user_id ? memberMap.get(item.user_id) : undefined;
      return (
        <LinkPreviewCard
          id={item.id}
          url={item.url}
          userDescription={item.description}
          folderId={folderId}
          viewMode={viewMode}
          onEditPress={canEdit ? handleEditPress : undefined}
          onSwipeStart={handleSwipeStart}
          canEdit={canEdit}
          addedByUserId={!isPersonal ? item.user_id : null}
          addedByName={member?.displayName ?? null}
          addedByAvatar={member?.avatarUrl ?? null}
          addedByIsMine={item.user_id === myUserId}
          createdAt={item.created_at}
        />
      );
    },
    [folderId, viewMode, handleEditPress, handleSwipeStart, canEdit, isPersonal, memberMap, myUserId],
  );

  const keyExtractor = useCallback((item: { id: number }) => String(item.id), []);

  const ItemSeparator = useCallback(() => <View style={{ height: viewMode === 'compact' ? 6 : 10 }} />, [viewMode]);

  const count = postList?.length ?? 0;

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <SearchIcon size={16} color={colors.textDisabled} />
          <TextInput
            style={styles.searchInput}
            placeholder="링크 검색..."
            placeholderTextColor={colors.textDisabled}
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
            <ArrowUpDownIcon size={15} color={colors.textMuted} />
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
              <LayoutGridIcon size={16} color={viewMode === 'large' ? colors.primary : colors.textDisabled} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'compact' && styles.viewToggleBtnActive]}
              onPress={() => handleViewModeChange('compact')}
              activeOpacity={0.6}
              accessibilityRole="radio"
              accessibilityState={{ checked: viewMode === 'compact' }}
              accessibilityLabel="간단히 보기"
            >
              <ListGlyphIcon size={16} color={viewMode === 'compact' ? colors.primary : colors.textDisabled} />
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
          contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
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
              <EmptyState
                type="link"
                title="아직 링크가 없어요"
                subtitle={
                  !isPersonal
                    ? '첫 링크를 함께 모아보세요'
                    : '아래 버튼으로 링크를 추가해보세요'
                }
              />
            )
          }
        />
      )}

      {/* viewer 는 링크 추가 FAB 숨김 (시안 권한 규칙) */}
      {canEdit && (
        <TouchableOpacity
          style={[styles.fab, { bottom: 24 + insets.bottom }]}
          onPress={() => {
            setPostUrl('');
            setPostDescription('');
            setCreateVisible(true);
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="링크 추가"
        >
          <PlusIcon size={24} color={colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
      )}

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
  container: { flex: 1, backgroundColor: colors.bg },
  searchRow: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.divider,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.ink,
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
    paddingBottom: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
    color: colors.textMuted,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    borderRadius: 10,
    padding: 2,
  },
  viewToggleBtn: {
    width: 32,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: '#141E37',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: 11,
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
  countText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingTop: 14 },
  form: { gap: 16 },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 26, marginBottom: 8 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
});
