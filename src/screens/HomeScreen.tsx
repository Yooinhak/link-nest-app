import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AlertDialog from '../components/AlertDialog';
import AvatarStack from '../components/AvatarStack';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import ColorPicker from '../components/ColorPicker';
import ContextMenu, { ContextMenuItem } from '../components/ContextMenu';
import EmptyState from '../components/EmptyState';
import { ChevronDownIcon, ChevronRightIcon, FolderIcon, PencilIcon, TrashIcon } from '../components/icons';
import Input from '../components/Input';
import CreateGroupSheet from '../components/sheets/CreateGroupSheet';
import GroupSwitcherSheet from '../components/sheets/GroupSwitcherSheet';
import InviteAcceptSheet from '../components/sheets/InviteAcceptSheet';
import InviteSheet from '../components/sheets/InviteSheet';
import { useToast } from '../components/Toast';
import { colors, FolderColorKey, getFolderColor, shadows } from '../constants/theme';
import { useGroup } from '../contexts/GroupContext';
import {
  useAllFoldersQuery,
  useCreateFolder,
  useCreatePost,
  useDeferredDeleteFolder,
  useFoldersQuery,
  useGroupMembersQuery,
  useUpdateFolder,
} from '../hooks/queries';
import { useInviteDeepLink } from '../hooks/useInviteDeepLink';
import { useShareIntent } from '../hooks/useShareIntent';
import { MainStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'MainTabs'>;

const RECENT_FOLDER_KEY = 'linknest.recentFolderId';
const ONBOARDING_KEY = 'linknest.groupOnboardingSeen';

// B-5: FlatList 성능 최적화 — 외부 컴포넌트 + React.memo.
type FolderItem = {
  id: number;
  name: string;
  color: string | null;
  posts?: Array<{ count: number }>;
};

type FolderRowProps = {
  item: FolderItem;
  postCount: number;
  canEdit: boolean;
  onOpen: (id: number, name: string, color: string | null) => void;
  onEdit: (id: number, name: string, color: FolderColorKey) => void;
  onDelete: (id: number) => void;
};

const FolderRow = React.memo(function FolderRow({ item, postCount, canEdit, onOpen, onEdit, onDelete }: FolderRowProps) {
  const fc = getFolderColor(item.color);
  const menuItems: ContextMenuItem[] = [
    {
      label: '이름 변경',
      icon: <PencilIcon size={16} color={colors.textMuted} />,
      onPress: () => onEdit(item.id, item.name, (item.color ?? 'blue') as FolderColorKey),
    },
    {
      label: '삭제',
      icon: <TrashIcon size={16} color={colors.danger} />,
      destructive: true,
      onPress: () => onDelete(item.id),
    },
  ];

  return (
    <TouchableOpacity
      style={styles.folderRow}
      onPress={() => onOpen(item.id, item.name, item.color)}
      activeOpacity={0.5}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} 폴더, ${postCount}개의 링크`}
    >
      <View style={[styles.folderIconWrap, { backgroundColor: fc.bg }]}>
        <FolderIcon size={20} color={fc.icon} />
      </View>
      <View style={styles.folderInfo}>
        <Text style={styles.folderName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.folderCount}>{postCount}개의 링크</Text>
      </View>
      <View style={styles.folderRight}>
        {canEdit && (
          <ContextMenu
            items={menuItems}
            trigger={<View style={styles.moreBtn}><Text style={styles.moreDots}>···</Text></View>}
          />
        )}
        <ChevronRightIcon size={16} color={colors.iconFaint} />
      </View>
    </TouchableOpacity>
  );
});

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { showToast } = useToast();

  // ── 그룹 상태 ──────────────────────────────────────────────
  const { groups, currentGroup, currentGroupId, myRole, isPersonal, selectGroup } = useGroup();
  const canEdit = myRole !== 'viewer';

  // 공유 그룹이면 멤버 아바타 스택 표시 (탭 → 멤버 관리)
  const { data: members = [] } = useGroupMembersQuery(!isPersonal ? currentGroupId : null);

  // ── 시트/딥링크 상태 ───────────────────────────────────────
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [createGroupVisible, setCreateGroupVisible] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<{ id: string; name: string } | null>(null);
  const { inviteToken, clearInviteToken } = useInviteDeepLink();

  // 1회성 온보딩 툴팁 (시안 ①)
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((seen) => {
      if (!seen) setShowOnboarding(true);
    });
  }, []);
  const dismissOnboarding = () => {
    setShowOnboarding(false);
    AsyncStorage.setItem(ONBOARDING_KEY, '1').catch(() => {});
  };

  // ── 폴더 데이터 ────────────────────────────────────────────
  const { data: folderList, refetch, isRefetching } = useFoldersQuery(currentGroupId);
  const createFolder = useCreateFolder(currentGroupId);
  const updateFolder = useUpdateFolder(currentGroupId);
  const deferredDelete = useDeferredDeleteFolder(currentGroupId);
  const createPost = useCreatePost();

  // ── 공유 인텐트: 그룹별 섹션 폴더 선택 (시안 ⑥) ─────────────
  const { pendingUrl, clearPendingUrl } = useShareIntent();
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const { data: allFolders } = useAllFoldersQuery(shareSheetVisible);
  const [recentFolderId, setRecentFolderId] = useState<number | null>(null);

  useEffect(() => {
    if (pendingUrl) {
      AsyncStorage.getItem(RECENT_FOLDER_KEY).then((v) => setRecentFolderId(v ? Number(v) : null));
      setShareSheetVisible(true);
    }
  }, [pendingUrl]);

  const roleByGroup = useMemo(() => new Map(groups.map((g) => [g.id, g.role])), [groups]);

  type AnyFolder = FolderItem & { group: { id: string; name: string; emoji: string | null; type: string } | null };
  const shareSections = useMemo(() => {
    const list = (allFolders ?? []) as unknown as AnyFolder[];
    const byGroup = new Map<string, { name: string; emoji: string | null; type: string; folders: AnyFolder[] }>();
    for (const f of list) {
      if (!f.group) continue;
      const entry = byGroup.get(f.group.id) ?? {
        name: f.group.name,
        emoji: f.group.emoji,
        type: f.group.type,
        folders: [],
      };
      entry.folders.push(f);
      byGroup.set(f.group.id, entry);
    }
    return [...byGroup.entries()]
      .map(([id, v]) => ({ id, ...v, viewer: roleByGroup.get(id) === 'viewer' }))
      .sort((a, b) => (a.type === b.type ? 0 : a.type === 'personal' ? -1 : 1));
  }, [allFolders, roleByGroup]);

  const recentFolder = useMemo(() => {
    if (!recentFolderId || !allFolders) return null;
    const list = allFolders as unknown as AnyFolder[];
    const f = list.find((x) => x.id === recentFolderId);
    return f && roleByGroup.get(f.group?.id ?? '') !== 'viewer' ? f : null;
  }, [recentFolderId, allFolders, roleByGroup]);

  const handleSaveSharedUrl = (folderId: number) => {
    if (!pendingUrl) return;
    createPost.mutate(
      { url: pendingUrl, description: null, folder_id: folderId },
      {
        onSuccess: () => {
          AsyncStorage.setItem(RECENT_FOLDER_KEY, String(folderId)).catch(() => {});
        },
        onSettled: () => {
          clearPendingUrl();
          setShareSheetVisible(false);
        },
      },
    );
  };

  const handleCancelShare = () => {
    clearPendingUrl();
    setShareSheetVisible(false);
  };

  // ── 폴더 CRUD 시트 상태 ────────────────────────────────────
  const [createVisible, setCreateVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState<FolderColorKey>('blue');
  const [editTarget, setEditTarget] = useState<{ id: number; name: string; color: FolderColorKey } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const handleCreate = () => {
    if (!folderName.trim()) {
      showToast('error', '폴더 이름을 입력해주세요');
      return;
    }
    createFolder.mutate(
      { name: folderName.trim(), color: folderColor },
      {
        onSuccess: () => {
          setFolderName('');
          setFolderColor('blue');
          setCreateVisible(false);
        },
      },
    );
  };

  const handleUpdate = () => {
    if (!editTarget?.name.trim()) {
      showToast('error', '폴더 이름을 입력해주세요');
      return;
    }
    updateFolder.mutate(
      { id: editTarget.id, name: editTarget.name.trim(), color: editTarget.color },
      { onSuccess: () => setEditVisible(false) },
    );
  };

  const handleDelete = () => {
    if (!deleteTargetId) return;
    deferredDelete.execute(deleteTargetId);
  };

  const getPostCount = (folder: FolderItem): number => {
    if (folder.posts && Array.isArray(folder.posts) && folder.posts.length > 0) {
      return folder.posts[0].count ?? 0;
    }
    return 0;
  };

  const handleOpenFolder = useCallback(
    (id: number, name: string, color: string | null) => {
      navigation.navigate('FolderDetail', {
        folderId: String(id),
        folderName: name,
        folderColor: color ?? undefined,
      });
    },
    [navigation],
  );

  const handleEditFolder = useCallback((id: number, name: string, color: FolderColorKey) => {
    setEditTarget({ id, name, color });
    setEditVisible(true);
  }, []);

  const handleDeleteFolder = useCallback((id: number) => {
    setDeleteTargetId(id);
    setDeleteVisible(true);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: FolderItem }) => (
      <FolderRow
        item={item}
        postCount={getPostCount(item)}
        canEdit={canEdit}
        onOpen={handleOpenFolder}
        onEdit={handleEditFolder}
        onDelete={handleDeleteFolder}
      />
    ),
    [canEdit, handleOpenFolder, handleEditFolder, handleDeleteFolder],
  );

  const keyExtractor = useCallback((item: FolderItem) => String(item.id), []);

  const folderCount = folderList?.length ?? 0;
  const totalLinks = (folderList ?? []).reduce((sum, f) => sum + getPostCount(f as FolderItem), 0);
  const groupTileEmoji = isPersonal ? '🏠' : (currentGroup?.emoji ?? '📁');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── 헤더: 그룹 스위처 + 아바타 스택 + 새 폴더 ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.switcher}
            onPress={() => {
              dismissOnboarding();
              setSwitcherVisible(true);
            }}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel="그룹 전환"
          >
            <Text style={styles.switcherEmoji}>{groupTileEmoji}</Text>
            <Text style={styles.switcherName} numberOfLines={1}>
              {currentGroup?.name ?? '내 그룹'}
            </Text>
            <ChevronDownIcon size={18} color={colors.textFaint} />
          </TouchableOpacity>
          {folderCount > 0 && (
            <Text style={styles.headerSub}>{`폴더 ${folderCount}개 · 링크 ${totalLinks}개`}</Text>
          )}
        </View>

        <View style={styles.headerRight}>
          {!isPersonal && members.length > 0 && (
            <TouchableOpacity
              onPress={() => currentGroupId && navigation.navigate('MemberManage', { groupId: currentGroupId })}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="멤버 관리"
            >
              <AvatarStack members={members} size={28} />
            </TouchableOpacity>
          )}
          {canEdit && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                setFolderName('');
                setFolderColor('blue');
                setCreateVisible(true);
              }}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel="새 폴더 만들기"
            >
              <Text style={styles.addBtnText}>+ 새 폴더</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 1회성 온보딩 툴팁 */}
      {showOnboarding && (
        <TouchableOpacity style={styles.tooltip} onPress={dismissOnboarding} activeOpacity={0.9}>
          <Text style={styles.tooltipText}>이제 친구와 함께 링크를 모을 수 있어요 👆</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={(folderList ?? []) as FolderItem[]}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            type="folder"
            title="폴더가 없어요"
            subtitle={isPersonal ? '새 폴더를 만들어 링크를 정리해보세요' : '친구와 함께 첫 폴더를 만들어보세요'}
          />
        }
      />

      {/* ── 그룹 시트들 ── */}
      <GroupSwitcherSheet
        visible={switcherVisible}
        onClose={() => setSwitcherVisible(false)}
        onCreateGroup={() => setCreateGroupVisible(true)}
      />
      <CreateGroupSheet
        visible={createGroupVisible}
        onClose={() => setCreateGroupVisible(false)}
        onCreated={(g) => setInviteTarget(g)}
      />
      <InviteSheet
        visible={!!inviteTarget}
        onClose={() => setInviteTarget(null)}
        groupId={inviteTarget?.id ?? null}
        groupName={inviteTarget?.name ?? ''}
      />
      <InviteAcceptSheet token={inviteToken} onClose={clearInviteToken} />

      {/* ── 폴더 생성 ── */}
      <BottomSheet visible={createVisible} onClose={() => setCreateVisible(false)} title="새 폴더" description="링크를 모아볼 폴더를 만들어보세요">
        <Input placeholder="폴더 이름을 입력해주세요" value={folderName} onChangeText={setFolderName} autoFocus />
        <ColorPicker selected={folderColor} onSelect={setFolderColor} label="폴더 색상" />
        <View style={styles.sheetBtns}>
          <Button variant="secondary" onPress={() => setCreateVisible(false)} style={{ flex: 1 }}>닫기</Button>
          <Button onPress={handleCreate} loading={createFolder.isPending} style={{ flex: 1 }}>만들기</Button>
        </View>
      </BottomSheet>

      {/* ── 폴더 수정 ── */}
      <BottomSheet visible={editVisible} onClose={() => setEditVisible(false)} title="폴더 수정">
        <Input placeholder="새로운 이름" value={editTarget?.name ?? ''} onChangeText={(t) => setEditTarget((p) => (p ? { ...p, name: t } : null))} autoFocus />
        <ColorPicker selected={editTarget?.color ?? 'blue'} onSelect={(c) => setEditTarget((p) => (p ? { ...p, color: c } : null))} label="폴더 색상" />
        <View style={styles.sheetBtns}>
          <Button variant="secondary" onPress={() => setEditVisible(false)} style={{ flex: 1 }}>취소</Button>
          <Button onPress={handleUpdate} loading={updateFolder.isPending} style={{ flex: 1 }}>저장</Button>
        </View>
      </BottomSheet>

      <AlertDialog visible={deleteVisible} onClose={() => setDeleteVisible(false)} title="폴더를 삭제할까요?" description="폴더 안의 모든 링크도 함께 삭제돼요" confirmText="삭제" onConfirm={handleDelete} destructive />

      {/* ── 공유 인텐트: 그룹별 폴더 선택 (시안 ⑥) ── */}
      <BottomSheet
        visible={shareSheetVisible}
        onClose={handleCancelShare}
        title="어느 폴더에 담을까요?"
        description={pendingUrl ? `공유된 링크: ${pendingUrl}` : undefined}
      >
        {shareSections.length > 0 ? (
          <View style={styles.shareList}>
            {recentFolder && (
              <>
                <Text style={styles.shareSectionLabel}>최근 저장한 폴더</Text>
                <ShareFolderRow folder={recentFolder} locked={false} onPress={() => handleSaveSharedUrl(recentFolder.id)} disabled={createPost.isPending} />
              </>
            )}
            {shareSections.map((section) => (
              <View key={section.id}>
                <Text style={styles.shareSectionLabel}>
                  {section.type === 'personal' ? '🏠 내 그룹' : `${section.emoji ?? '📁'} ${section.name}`}
                </Text>
                {section.folders.map((f) => (
                  <ShareFolderRow
                    key={f.id}
                    folder={f}
                    locked={section.viewer}
                    onPress={() => handleSaveSharedUrl(f.id)}
                    disabled={createPost.isPending}
                  />
                ))}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.shareEmpty}>
            <Text style={styles.shareEmptyText}>폴더가 없어요. 먼저 폴더를 만들어주세요.</Text>
            <Button
              onPress={() => {
                handleCancelShare();
                setFolderName('');
                setFolderColor('blue');
                setCreateVisible(true);
              }}
            >
              폴더 만들기
            </Button>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

/** 공유 저장 시트의 폴더 행 — viewer 그룹 폴더는 자물쇠 + 흐림 (시안 ⑥) */
function ShareFolderRow({
  folder,
  locked,
  disabled,
  onPress,
}: {
  folder: FolderItem;
  locked: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { showToast } = useToast();
  const fc = getFolderColor(folder.color);

  return (
    <TouchableOpacity
      style={[styles.shareFolderRow, locked && { opacity: 0.4 }]}
      onPress={() => {
        if (locked) {
          showToast('error', '권한이 없어요');
          return;
        }
        onPress();
      }}
      activeOpacity={locked ? 1 : 0.6}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${folder.name} — 보기 전용` : `${folder.name}에 저장`}
    >
      <View style={[styles.folderIconWrap, { backgroundColor: fc.bg }]}>
        <FolderIcon size={20} color={fc.icon} />
      </View>
      <Text style={styles.shareFolderName} numberOfLines={1}>{folder.name}</Text>
      {locked && <Text style={styles.lockEmoji}>🔒</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
    gap: 10,
  },
  headerLeft: { flexShrink: 1 },
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  switcherEmoji: { fontSize: 22 },
  switcherName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.96, // -0.04em
    flexShrink: 1,
  },
  headerSub: { fontSize: 13, fontWeight: '500', color: colors.textFaint, marginTop: 5 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 3,
  },
  addBtn: { backgroundColor: colors.primaryTint, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  addBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  tooltip: {
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginTop: 6,
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...shadows.card,
  },
  tooltipText: { fontSize: 13, fontWeight: '500', color: colors.white },
  list: { paddingHorizontal: 20, paddingTop: 10 },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 9,
    ...shadows.card,
  },
  folderIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  folderInfo: { flex: 1, gap: 2 },
  folderName: { fontSize: 16, fontWeight: '600', color: colors.text, letterSpacing: -0.32 },
  shareFolderName: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text, letterSpacing: -0.32 },
  folderCount: { fontSize: 12, fontWeight: '500', color: colors.textDisabled },
  folderRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  moreBtn: { padding: 6 },
  moreDots: { fontSize: 18, color: colors.textDisabled, fontWeight: '400' },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 26, marginBottom: 8 },
  shareList: { paddingBottom: 8, maxHeight: 420 },
  shareSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textFaint,
    marginTop: 14,
    marginBottom: 6,
  },
  shareFolderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12, gap: 13 },
  lockEmoji: { fontSize: 14 },
  shareEmpty: { alignItems: 'center', gap: 16, paddingVertical: 20 },
  shareEmptyText: { fontSize: 15, fontWeight: '500', color: colors.textFaint },
});
