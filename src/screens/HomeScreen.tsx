import React, { useCallback, useState } from 'react';

import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import AlertDialog from '../components/AlertDialog';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import ContextMenu, { ContextMenuItem } from '../components/ContextMenu';
import EmptyState from '../components/EmptyState';
import Input from '../components/Input';
import { useToast } from '../components/Toast';
import { colors } from '../constants/theme';
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

// 폴더 컬러 팔레트
const FOLDER_COLORS = [
  { key: 'blue', main: '#3182F6', light: '#E8F3FF' },
  { key: 'purple', main: '#8B5CF6', light: '#F3EEFF' },
  { key: 'pink', main: '#EC4899', light: '#FDF2F8' },
  { key: 'orange', main: '#F97316', light: '#FFF7ED' },
  { key: 'green', main: '#22C55E', light: '#F0FDF4' },
  { key: 'gray', main: '#6B7684', light: '#F2F4F6' },
] as const;

type FolderColorKey = typeof FOLDER_COLORS[number]['key'];

function getFolderColor(key?: string | null) {
  return FOLDER_COLORS.find((c) => c.key === key) ?? FOLDER_COLORS[0];
}

const FolderIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </Svg>
);

const ChevronRight = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.gray[400]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="m9 18 6-6-6-6" />
  </Svg>
);

const PenIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.gray[600]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </Svg>
);

const TrashIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.destructive} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 6h18" />
    <Path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <Path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </Svg>
);

const PaletteIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.gray[600]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04-.23-.29-.38-.63-.38-1.01 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.5-4.5-9.95-10-9.95z" />
    <Path d="M6.5 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" fill={colors.gray[600]} />
    <Path d="M10 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" fill={colors.gray[600]} />
    <Path d="M14 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" fill={colors.gray[600]} />
    <Path d="M17.5 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" fill={colors.gray[600]} />
  </Svg>
);

function ColorPicker({ selected, onSelect }: { selected: FolderColorKey; onSelect: (key: FolderColorKey) => void }) {
  return (
    <View style={pickerStyles.container}>
      <Text style={pickerStyles.label}>폴더 색상</Text>
      <View style={pickerStyles.row}>
        {FOLDER_COLORS.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[pickerStyles.swatch, { backgroundColor: c.main }, selected === c.key && pickerStyles.swatchSelected]}
            onPress={() => { lightTap(); onSelect(c.key); }}
            activeOpacity={0.6}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected === c.key }}
            accessibilityLabel={`${c.key === 'blue' ? '파랑' : c.key === 'purple' ? '보라' : c.key === 'pink' ? '분홍' : c.key === 'orange' ? '주황' : c.key === 'green' ? '초록' : '회색'} 색상`}
          >
            {selected === c.key && (
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M20 6 9 17l-5-5" />
              </Svg>
            )}
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
  onOpen: (id: number, name: string) => void;
  onEdit: (id: number, name: string, color: FolderColorKey) => void;
  onDelete: (id: number) => void;
};

const FolderRow = React.memo(function FolderRow({ item, postCount, onOpen, onEdit, onDelete }: FolderRowProps) {
  const fc = getFolderColor(item.color);
  const menuItems: ContextMenuItem[] = [
    {
      label: '이름 변경',
      icon: <PenIcon />,
      onPress: () => onEdit(item.id, item.name, (item.color ?? 'blue') as FolderColorKey),
    },
    {
      label: '삭제',
      icon: <TrashIcon />,
      destructive: true,
      onPress: () => onDelete(item.id),
    },
  ];

  return (
    <TouchableOpacity
      style={styles.folderRow}
      onPress={() => onOpen(item.id, item.name)}
      activeOpacity={0.5}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} 폴더, ${postCount}개의 링크`}
    >
      <View style={[styles.folderIconWrap, { backgroundColor: fc.light }]}>
        <FolderIcon color={fc.main} />
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
        <ChevronRight />
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
  const handleOpenFolder = useCallback((id: number, name: string) => {
    navigation.navigate('FolderDetail', { folderId: String(id), folderName: name });
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">내 폴더</Text>
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
                  <View style={[styles.folderIconWrap, { backgroundColor: fc.light }]}>
                    <FolderIcon color={fc.main} />
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
  container: { marginTop: 16, gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.gray[600] },
  row: { flexDirection: 'row', gap: 10 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  swatchSelected: { borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.gray[900], letterSpacing: -0.5 },
  addBtn: { backgroundColor: colors.blue[50], paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  list: { paddingHorizontal: 20, paddingTop: 12 },
  folderRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 16, marginBottom: 8 },
  folderIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  folderInfo: { flex: 1, gap: 2 },
  folderName: { fontSize: 16, fontWeight: '600', color: colors.gray[800], letterSpacing: -0.2 },
  folderCount: { fontSize: 12, color: colors.gray[400] },
  folderRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  moreBtn: { padding: 6 },
  moreDots: { fontSize: 18, color: colors.gray[400], fontWeight: '700' },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 },
  shareFolderList: { gap: 4, paddingBottom: 8, maxHeight: 320 },
  shareFolderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12, gap: 14 },
  shareEmpty: { alignItems: 'center', gap: 16, paddingVertical: 20 },
  shareEmptyText: { fontSize: 15, color: colors.gray[500] },
});
