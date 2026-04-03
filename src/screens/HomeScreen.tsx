import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import AlertDialog from '../components/AlertDialog';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import ContextMenu, { ContextMenuItem } from '../components/ContextMenu';
import Input from '../components/Input';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { colors } from '../constants/theme';
import { lightTap } from '../utils/haptics';
import { useShareIntent } from '../hooks/useShareIntent';
import { MainStackParamList } from '../navigation/types';
import { queryKeys } from '../utils/react-query/queryKeys';
import { supabase } from '../utils/supabase/client';

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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  useShareIntent(showToast);

  const [createVisible, setCreateVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState<FolderColorKey>('blue');
  const [editTarget, setEditTarget] = useState<{ id: number; name: string; color: FolderColorKey } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const { data: folderList, refetch, isRefetching } = useQuery({
    queryKey: [queryKeys.FOLDER_LIST],
    queryFn: async () => await supabase.from('folders').select('*, posts(count)'),
    select: (data) => data.data,
  });

  const handleCreate = async () => {
    if (!folderName.trim()) {
      showToast('error', '폴더 이름을 입력해주세요');
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('folders').insert({ name: folderName.trim(), color: folderColor });
    setCreating(false);

    if (error) {
      showToast('error', '폴더 생성에 실패했어요');
    } else {
      queryClient.invalidateQueries({ queryKey: [queryKeys.FOLDER_LIST] });
      showToast('success', '폴더가 생성되었어요');
      setFolderName('');
      setFolderColor('blue');
      setCreateVisible(false);
    }
  };

  const handleUpdate = async () => {
    if (!editTarget?.name.trim()) {
      showToast('error', '폴더 이름을 입력해주세요');
      return;
    }
    setUpdating(true);
    const { error } = await supabase.from('folders').update({ name: editTarget.name.trim(), color: editTarget.color }).eq('id', editTarget.id);
    setUpdating(false);

    if (error) {
      showToast('error', '수정에 실패했어요');
    } else {
      queryClient.invalidateQueries({ queryKey: [queryKeys.FOLDER_LIST] });
      showToast('success', '폴더가 수정되었어요');
      setEditVisible(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;

    // Optimistic Update: 즉시 UI에서 제거
    const previousFolders = queryClient.getQueryData([queryKeys.FOLDER_LIST]);
    queryClient.setQueryData([queryKeys.FOLDER_LIST], (old: any) => {
      if (!old?.data) return old;
      return { ...old, data: old.data.filter((f: any) => f.id !== deleteTargetId) };
    });

    const { error } = await supabase.from('folders').delete().eq('id', deleteTargetId);
    if (error) {
      // 실패 시 롤백
      queryClient.setQueryData([queryKeys.FOLDER_LIST], previousFolders);
      showToast('error', '폴더 삭제에 실패했어요');
    } else {
      queryClient.invalidateQueries({ queryKey: [queryKeys.FOLDER_LIST] });
      showToast('success', '폴더가 삭제되었어요');
    }
  };

  const getPostCount = (folder: any): number => {
    if (folder.posts && Array.isArray(folder.posts) && folder.posts.length > 0) {
      return folder.posts[0].count ?? 0;
    }
    return 0;
  };

  const renderItem = ({ item }: { item: any }) => {
    const postCount = getPostCount(item);
    const fc = getFolderColor(item.color);
    const menuItems: ContextMenuItem[] = [
      {
        label: '이름 변경',
        icon: <PenIcon />,
        onPress: () => { setEditTarget({ id: item.id, name: item.name, color: item.color ?? 'blue' }); setEditVisible(true); },
      },
      {
        label: '삭제',
        icon: <TrashIcon />,
        destructive: true,
        onPress: () => { setDeleteTargetId(item.id); setDeleteVisible(true); },
      },
    ];

    return (
      <TouchableOpacity
        style={styles.folderRow}
        onPress={() => navigation.navigate('FolderDetail', { folderId: String(item.id), folderName: item.name })}
        activeOpacity={0.5}
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
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>내 폴더</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setFolderName(''); setFolderColor('blue'); setCreateVisible(true); }} activeOpacity={0.6}>
          <Text style={styles.addBtnText}>+ 새 폴더</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={folderList ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
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
          <Button onPress={handleCreate} loading={creating} style={{ flex: 1 }}>만들기</Button>
        </View>
      </BottomSheet>

      {/* 폴더 수정 */}
      <BottomSheet visible={editVisible} onClose={() => setEditVisible(false)} title="폴더 수정">
        <Input placeholder="새로운 이름" value={editTarget?.name ?? ''} onChangeText={(t) => setEditTarget((p) => (p ? { ...p, name: t } : null))} autoFocus />
        <ColorPicker selected={editTarget?.color ?? 'blue'} onSelect={(c) => setEditTarget((p) => (p ? { ...p, color: c } : null))} />
        <View style={styles.sheetBtns}>
          <Button variant="secondary" onPress={() => setEditVisible(false)} style={{ flex: 1 }}>취소</Button>
          <Button onPress={handleUpdate} loading={updating} style={{ flex: 1 }}>저장</Button>
        </View>
      </BottomSheet>

      <AlertDialog visible={deleteVisible} onClose={() => setDeleteVisible(false)} title="폴더를 삭제할까요?" description="폴더 안의 모든 링크도 함께 삭제돼요" confirmText="삭제" onConfirm={handleDelete} destructive />
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
});
