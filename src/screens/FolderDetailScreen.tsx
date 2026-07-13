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

import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AvatarStack from '../components/AvatarStack';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import GlassBackground from '../components/GlassBackground';
import {
  ChevronLeftIcon,
  LayoutGridIcon,
  ListIcon as ListGlyphIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from '../components/icons';
import Input from '../components/Input';
import LinkPreviewCard, {
  type LinkPreviewCardHandle,
  LinkPreviewCardSkeleton,
  ViewMode,
} from '../components/LinkPreviewCard';
import { useToast } from '../components/Toast';
import { colors, glass, shadows, warm } from '../constants/theme';
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
type Nav = NativeStackNavigationProp<MainStackParamList, 'FolderDetail'>;
type SortOrder = 'newest' | 'oldest';

/**
 * 폴더 상세 — 블루 글래스 시안 07 "링크 피드".
 * 커스텀 헤더(유리 백 버튼 + 브레드크럼 + 아바타 스택) + 정렬 칩 + 유리 링크 카드.
 * 네이티브 스택 헤더는 끔 (MainStack headerShown: false) — 공기 배경 위에 직접 그린다.
 */
export default function FolderDetailScreen() {
  const route = useRoute<FolderDetailRouteProp>();
  const navigation = useNavigation<Nav>();
  const { folderId, folderName, folderEmoji } = route.params;
  const insets = useSafeAreaInsets(); // Android edge-to-edge 하단 대응
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('large');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [createVisible, setCreateVisible] = useState(false);
  const [postUrl, setPostUrl] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 링크 수정 상태
  const [editVisible, setEditVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: number; description: string } | null>(null);

  const { data: postList, isLoading, refetch, isRefetching } = usePostsQuery(folderId);
  const createPost = useCreatePost();
  const updatePost = useUpdatePost(folderId);

  const filteredList = useMemo(() => {
    let list = postList ?? [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.url.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q)),
      );
    }

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

  const toggleSearch = useCallback(() => {
    mediumTap();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSearchVisible((v) => {
      if (v) setSearchQuery('');
      return !v;
    });
  }, []);

  const handleEditPress = useCallback((id: number, description: string | null) => {
    setEditTarget({ id, description: description ?? '' });
    setEditVisible(true);
  }, []);

  // ── 그룹 권한 + 멤버 정보 (권한 규칙 / 추가한 사람) ──
  const { myRole, isPersonal, currentGroupId, currentGroup } = useGroup();
  const canEdit = myRole !== 'viewer';
  const { session } = useAuth();
  const myUserId = session?.user?.id ?? null;
  const { data: members = [] } = useGroupMembersQuery(!isPersonal ? currentGroupId : null);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);

  // iOS Mail 패턴: 한 번에 한 카드만 열린 상태로 유지.
  const lastOpenedRef = useRef<LinkPreviewCardHandle | null>(null);
  const handleSwipeStart = useCallback((handle: LinkPreviewCardHandle) => {
    if (lastOpenedRef.current && lastOpenedRef.current !== handle) {
      lastOpenedRef.current.close();
    }
    lastOpenedRef.current = handle;
  }, []);

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

  const ItemSeparator = useCallback(() => <View style={{ height: viewMode === 'compact' ? 8 : 11 }} />, [viewMode]);

  const count = postList?.length ?? 0;
  const crumb = isPersonal
    ? `🏠 나의 서랍 · ${count}개의 링크`
    : `${currentGroup?.emoji ?? '📁'} ${currentGroup?.name ?? '그룹'} · ${count}개의 링크`;

  return (
    <View style={styles.container}>
      <GlassBackground variant={isPersonal ? 'personal' : 'group'} />

      {/* ── 커스텀 헤더: 유리 백 버튼 + 타이틀/브레드크럼 + 아바타 ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
          >
            <ChevronLeftIcon size={17} color={colors.ink} strokeWidth={2.4} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <View style={styles.headerTitleRow}>
              {folderEmoji ? <Text style={styles.headerEmoji}>{folderEmoji}</Text> : null}
              <Text style={styles.headerTitle} numberOfLines={1}>
                {folderName || '폴더'}
              </Text>
            </View>
            <Text style={[styles.headerCrumb, !isPersonal && { color: warm.text }]} numberOfLines={1}>
              {crumb}
            </Text>
          </View>
        </View>
        {!isPersonal && members.length > 0 && (
          <TouchableOpacity
            onPress={() => currentGroupId && navigation.navigate('MemberManage', { groupId: currentGroupId })}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="그룹 관리"
          >
            <AvatarStack members={members} size={30} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── 필터 칩: 정렬 + 보기 전환 + 검색 ── */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.sortChip}
          onPress={handleSortToggle}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={`정렬 기준: ${sortOrder === 'newest' ? '최신순' : '오래된순'}`}
        >
          <Text style={styles.sortChipText}>{sortOrder === 'newest' ? '최신순' : '오래된순'}</Text>
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
            <LayoutGridIcon size={15} color={viewMode === 'large' ? colors.primary : colors.textFaint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'compact' && styles.viewToggleBtnActive]}
            onPress={() => handleViewModeChange('compact')}
            activeOpacity={0.6}
            accessibilityRole="radio"
            accessibilityState={{ checked: viewMode === 'compact' }}
            accessibilityLabel="간단히 보기"
          >
            <ListGlyphIcon size={15} color={viewMode === 'compact' ? colors.primary : colors.textFaint} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.searchChip, searchVisible && styles.searchChipActive]}
          onPress={toggleSearch}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={searchVisible ? '검색 닫기' : '검색'}
        >
          {searchVisible ? (
            <XIcon size={15} color={colors.primary} strokeWidth={2.2} />
          ) : (
            <SearchIcon size={15} color={colors.textMuted} strokeWidth={2.2} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── 검색 바 (토글) ── */}
      {searchVisible && (
        <View style={styles.searchBarWrap}>
          <View style={styles.searchBar}>
            <SearchIcon size={15} color={colors.textDisabled} />
            <TextInput
              style={styles.searchInput}
              placeholder="링크 검색..."
              placeholderTextColor={colors.textDisabled}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.list}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ marginBottom: 11 }}>
              <LinkPreviewCardSkeleton viewMode={viewMode} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: 120 + insets.bottom }]}
          ItemSeparatorComponent={ItemSeparator}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            searchQuery ? (
              <EmptyState type="search" title="검색 결과가 없어요" subtitle="다른 키워드로 검색해보세요" warmTone={!isPersonal} />
            ) : (
              <EmptyState
                type="link"
                title="아직 링크가 없어요"
                subtitle={
                  !isPersonal
                    ? '인스타에서 본 맛집, 유튜브에서 본 카페 —\n첫 링크를 함께 모아보세요'
                    : '아래 ＋ 버튼으로 첫 링크를 저장해보세요'
                }
                warmTone={!isPersonal}
              >
                {canEdit && (
                  <Button
                    size="small"
                    onPress={() => {
                      setPostUrl('');
                      setPostDescription('');
                      setCreateVisible(true);
                    }}
                  >
                    ＋ 첫 링크 저장하기
                  </Button>
                )}
              </EmptyState>
            )
          }
        />
      )}

      {/* viewer 는 링크 추가 FAB 숨김 (권한 규칙) */}
      {canEdit && (
        <TouchableOpacity
          style={[styles.fab, { bottom: 26 + insets.bottom }]}
          onPress={() => {
            setPostUrl('');
            setPostDescription('');
            setCreateVisible(true);
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="링크 추가"
        >
          <PlusIcon size={24} color={colors.white} strokeWidth={2.8} />
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
          <Button onPress={handleCreate} loading={createPost.isPending} style={{ flex: 1.4 }}>
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
          <Button onPress={handleUpdateDescription} loading={updatePost.isPending} style={{ flex: 1.4 }}>
            저장
          </Button>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F9FE' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flexShrink: 1, gap: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  headerEmoji: { fontSize: 18 },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'LINESeedKR-Bold',
    color: colors.ink,
    letterSpacing: -0.6, // -0.03em
  },
  headerCrumb: {
    fontSize: 12,
    fontFamily: 'LINESeedKR',
    color: colors.textFaint,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  sortChip: {
    backgroundColor: colors.ink,
    borderRadius: 19,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sortChipText: {
    fontSize: 12,
    fontFamily: 'LINESeedKR-Bold',
    color: colors.white,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: glass.bgSoft,
    borderWidth: 1,
    borderColor: glass.borderSoft,
    borderRadius: 19,
    padding: 2,
  },
  viewToggleBtn: {
    width: 34,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleBtnActive: {
    backgroundColor: glass.bgStrong,
    ...shadows.card,
  },
  searchChip: {
    marginLeft: 'auto',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: glass.bgSoft,
    borderWidth: 1,
    borderColor: glass.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchChipActive: {
    backgroundColor: glass.bgStrong,
    borderColor: glass.border,
  },
  searchBarWrap: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glass.bgStrong,
    borderWidth: 1,
    borderColor: glass.border,
    borderRadius: 14,
    paddingHorizontal: 13,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'LINESeedKR',
    color: colors.ink,
    paddingVertical: 0,
  },
  list: { paddingHorizontal: 20, paddingTop: 14 },
  form: { gap: 16 },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 26, marginBottom: 8 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
});
