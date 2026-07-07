import React, { useCallback, useState } from 'react';

import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AlertDialog from '../components/AlertDialog';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import ContextMenu, { ContextMenuItem } from '../components/ContextMenu';
import EmptyState from '../components/EmptyState';
import {
  CheckIcon,
  ChevronRightIcon,
  FolderIcon,
  PencilIcon,
  TrashIcon,
} from '../components/icons';
import Input from '../components/Input';
import { useToast } from '../components/Toast';
import {
  colors,
  FolderColorKey,
  folderColors,
  getFolderColor,
  shadows,
} from '../constants/theme';
import {
  useCreateFolder,
  useCreatePost,
  useDeferredDeleteFolder,
  useFoldersQuery,
  useUpdateFolder,
} from '../hooks/queries';
import { useShareIntent } from '../hooks/useShareIntent';
import { MainStackParamList } from '../navigation/types';
import { lightTap } from '../utils/haptics';

type Nav = NativeStackNavigationProp<MainStackParamList, 'MainTabs'>;

const COLOR_LABELS: Record<FolderColorKey, string> = {
  blue: '파랑',
  purple: '보라',
  pink: '분홍',
  orange: '주황',
  green: '초록',
  gray: '회색',
};

function ColorPicker({ selected, onSelect }: { selected: FolderColorKey; onSelect: (key: FolderColorKey) => void }) {
  return (
    <View style={pickerStyles.container}>
      <Text style={pickerStyles.label}>폴더 색상</Text>
      <View style={pickerStyles.row}>
        {folderColors.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[
              pickerStyles.swatch,
              { backgroundColor: c.icon },
              // 선택 시 색상별 25% 알파 링 (시안: box-shadow 0 0 0 3px)
              selected === c.key && { ...pickerStyles.swatchSelected, borderColor: `${c.icon}40` },
            ]}
            onPress={() => { lightTap(); onSelect(c.key); }}
            activeOpacity={0.6}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected === c.key }}
            accessibilityLabel={`${COLOR_LABELS[c.key]} 색상`}
          >
            {selected === c.key && <CheckIcon size={14} color={colors.white} strokeWidth={3} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// B-5: FlatList 성능 최적화 — 외부 컴포넌트 + React.memo.
// 부모 리렌더 시에도 props가 같은 Row는 리렌더되지 않는다.
// 콜백은 부모에서 useCallback으로 안정화해 전달.
type FolderItem = {
  id: number;
  name: string;
  color: string | null;
  posts?: Array<{ count: number }>;
};

type FolderRowProps = {
  item: FolderItem;
  postCount: number;
  onOpen: (id: number, name: string, color: string | null) => void;
  onEdit: (id: number, name: string, color: FolderColorKey) => void;
  onDelete: (id: number) => void;
};

const FolderRow = React.memo(function FolderRow({ item, postCount, onOpen, onEdit, onDelete }: FolderRowProps) {
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
        <ContextMenu
          items={menuItems}
          trigger={<View style={styles.moreBtn}><Text style={styles.moreDots}>···</Text></View>}
        />
        <ChevronRightIcon size={16} color={colors.iconFaint} />
      </View>
    </TouchableOpacity>
  );
});

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { showToast } = useToast();
  const { pendingUrl, clearPendingUrl } = useShareIntent();
  const [shareSheetVisible, setShareSheetVisible] = useState(false);

  const { data: folderList, refetch, isRefetching } = useFoldersQuery();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deferredDelete = useDeferredDeleteFolder();
  const createPost = useCreatePost();

  // 공유 인텐트로 URL이 들어오면 폴더 선택 BottomSheet를 연다
  React.useEffect(() => {
    if (pendingUrl) {
      setShareSheetVisible(true);
    }
  }, [pendingUrl]);

  const handleSaveSharedUrl = (folderId: number) => {
    if (!pendingUrl) return;
    createPost.mutate(
      { url: pendingUrl, description: null, folder_id: folderId },
      {
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
      {
        onSuccess: () => setEditVisible(false),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTargetId) return;
    deferredDelete.execute(deleteTargetId);
  };

  const getPostCount = (folder: any): number => {
    if (folder.posts && Array.isArray(folder.posts) && folder.posts.length > 0) {
      return folder.posts[0].count ?? 0;
    }
    return 0;
  };

  // B-5: FolderRow 에 넘기는 콜백을 useCallback 으로 안정화. 참조가 바뀌지 않아야
  // React.memo 된 FolderRow 가 리렌더되지 않는다.
  const handleOpenFolder = useCallback((id: number, name: string, color: string | null) => {
    navigation.navigate('FolderDetail', {
      folderId: String(id),
      folderName: name,
      folderColor: color ?? undefined,
    });
  }, [navigation]);

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
        onOpen={handleOpenFolder}
        onEdit={handleEditFolder}
        onDelete={handleDeleteFolder}
      />
    ),
    [handleOpenFolder, handleEditFolder, handleDeleteFolder],
  );

  const keyExtractor = useCallback((item: FolderItem) => String(item.id), []);

  const folderCount = folderList?.length ?? 0;
  const totalLinks = (folderList ?? []).reduce((sum, f) => sum + getPostCount(f), 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle} accessibilityRole="header">내 폴더</Text>
          {folderCount > 0 && (
            <Text style={styles.headerSub}>{`폴더 ${folderCount}개 · 링크 ${totalLinks}개`}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setFolderName(''); setFolderColor('blue'); setCreateVisible(true); }} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel="새 폴더 만들기">
          <Text style={styles.addBtnText}>+ 새 폴더</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={folderList ?? []}
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
          <EmptyState type="folder" title="폴더가 없어요" subtitle="새 폴더를 만들어 링크를 정리해보세요" />
        }
      />

      {/* 새 폴더 생성 */}
      <BottomSheet visible={createVisible} onClose={() => setCreateVisible(false)} title="새 폴더" description="링크를 모아볼 폴더를 만들어보세요">
        <Input placeholder="폴더 이름을 입력해주세요" value={folderName} onChangeText={setFolderName} autoFocus />
        <ColorPicker selected={folderColor} onSelect={setFolderColor} />
        <View style={styles.sheetBtns}>
          <Button variant="secondary" onPress={() => setCreateVisible(false)} style={{ flex: 1 }}>닫기</Button>
          <Button onPress={handleCreate} loading={createFolder.isPending} style={{ flex: 1 }}>만들기</Button>
        </View>
      </BottomSheet>

      {/* 폴더 수정 */}
      <BottomSheet visible={editVisible} onClose={() => setEditVisible(false)} title="폴더 수정">
        <Input placeholder="새로운 이름" value={editTarget?.name ?? ''} onChangeText={(t) => setEditTarget((p) => (p ? { ...p, name: t } : null))} autoFocus />
        <ColorPicker selected={editTarget?.color ?? 'blue'} onSelect={(c) => setEditTarget((p) => (p ? { ...p, color: c } : null))} />
        <View style={styles.sheetBtns}>
          <Button variant="secondary" onPress={() => setEditVisible(false)} style={{ flex: 1 }}>취소</Button>
          <Button onPress={handleUpdate} loading={updateFolder.isPending} style={{ flex: 1 }}>저장</Button>
        </View>
      </BottomSheet>

      <AlertDialog visible={deleteVisible} onClose={() => setDeleteVisible(false)} title="폴더를 삭제할까요?" description="폴더 안의 모든 링크도 함께 삭제돼요" confirmText="삭제" onConfirm={handleDelete} destructive />

      {/* 공유 인텐트: 폴더 선택 */}
      <BottomSheet
        visible={shareSheetVisible}
        onClose={handleCancelShare}
        title="어느 폴더에 저장할까요?"
        description={pendingUrl ? `공유된 링크: ${pendingUrl}` : undefined}
      >
        {folderList && folderList.length > 0 ? (
          <View style={styles.shareFolderList}>
            {folderList.map((folder) => {
              const fc = getFolderColor(folder.color);
              return (
                <TouchableOpacity
                  key={folder.id}
                  style={styles.shareFolderRow}
                  onPress={() => handleSaveSharedUrl(folder.id)}
                  activeOpacity={0.6}
                  disabled={createPost.isPending}
                >
                  <View style={[styles.folderIconWrap, { backgroundColor: fc.bg }]}>
                    <FolderIcon size={20} color={fc.icon} />
                  </View>
                  <Text style={styles.folderName} numberOfLines={1}>{folder.name}</Text>
                </TouchableOpacity>
              );
            })}
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

const pickerStyles = StyleSheet.create({
  container: { marginTop: 20, gap: 11 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  row: { flexDirection: 'row', gap: 11 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  swatchSelected: { borderWidth: 3 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.ink, letterSpacing: -1.04 }, // -0.04em
  headerSub: { fontSize: 13, fontWeight: '500', color: colors.textFaint, marginTop: 4 },
  addBtn: { backgroundColor: colors.primaryTint, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  addBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
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
  folderName: { fontSize: 16, fontWeight: '600', color: colors.text, letterSpacing: -0.32 }, // -0.02em
  folderCount: { fontSize: 12, fontWeight: '500', color: colors.textDisabled },
  folderRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  moreBtn: { padding: 6 },
  moreDots: { fontSize: 18, color: colors.textDisabled, fontWeight: '400' },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 26, marginBottom: 8 },
  shareFolderList: { gap: 4, paddingBottom: 8, maxHeight: 320 },
  shareFolderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12, gap: 13 },
  shareEmpty: { alignItems: 'center', gap: 16, paddingVertical: 20 },
  shareEmptyText: { fontSize: 15, fontWeight: '500', color: colors.textFaint },
});
