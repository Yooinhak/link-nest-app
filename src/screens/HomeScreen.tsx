import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
import { colors } from '../constants/theme';
import { MainStackParamList } from '../navigation/types';
import { queryKeys } from '../utils/react-query/queryKeys';
import { supabase } from '../utils/supabase/client';

type Nav = NativeStackNavigationProp<MainStackParamList, 'MainTabs'>;

const FolderIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();

  const [createVisible, setCreateVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [editTarget, setEditTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const { data: folderList } = useQuery({
    queryKey: [queryKeys.FOLDER_LIST],
    queryFn: async () => await supabase.from('folders').select(),
    select: (data) => data.data,
  });

  const handleCreate = async () => {
    if (!folderName.trim()) return;
    const { error } = await supabase.from('folders').insert({ name: folderName.trim() });
    if (!error) {
      queryClient.invalidateQueries({ queryKey: [queryKeys.FOLDER_LIST] });
      setFolderName('');
      setCreateVisible(false);
    }
  };

  const handleUpdate = async () => {
    if (!editTarget?.name.trim()) return;
    const { error } = await supabase.from('folders').update({ name: editTarget.name.trim() }).eq('id', editTarget.id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: [queryKeys.FOLDER_LIST] });
      setEditVisible(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const { error } = await supabase.from('folders').delete().eq('id', deleteTargetId);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: [queryKeys.FOLDER_LIST] });
    }
  };

  const renderItem = ({ item }: { item: { id: number; name: string } }) => {
    const menuItems: ContextMenuItem[] = [
      {
        label: '이름 변경',
        icon: <PenIcon />,
        onPress: () => { setEditTarget({ id: item.id, name: item.name }); setEditVisible(true); },
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
        <View style={styles.folderIconWrap}>
          <FolderIcon />
        </View>
        <Text style={styles.folderName} numberOfLines={1}>{item.name}</Text>
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
        <TouchableOpacity style={styles.addBtn} onPress={() => { setFolderName(''); setCreateVisible(true); }} activeOpacity={0.6}>
          <Text style={styles.addBtnText}>+ 새 폴더</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={folderList ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>{'📁'}</Text>
            <Text style={styles.emptyTitle}>폴더가 없어요</Text>
            <Text style={styles.emptySub}>새 폴더를 만들어 링크를 정리해보세요</Text>
          </View>
        }
      />

      <BottomSheet visible={createVisible} onClose={() => setCreateVisible(false)} title="새 폴더" description="링크를 모아볼 폴더를 만들어보세요">
        <Input placeholder="폴더 이름을 입력해주세요" value={folderName} onChangeText={setFolderName} autoFocus />
        <View style={styles.sheetBtns}>
          <Button variant="secondary" onPress={() => setCreateVisible(false)} style={{ flex: 1 }}>닫기</Button>
          <Button onPress={handleCreate} style={{ flex: 1 }}>만들기</Button>
        </View>
      </BottomSheet>

      <BottomSheet visible={editVisible} onClose={() => setEditVisible(false)} title="폴더 이름 변경">
        <Input placeholder="새로운 이름" value={editTarget?.name ?? ''} onChangeText={(t) => setEditTarget((p) => (p ? { ...p, name: t } : null))} autoFocus />
        <View style={styles.sheetBtns}>
          <Button variant="secondary" onPress={() => setEditVisible(false)} style={{ flex: 1 }}>취소</Button>
          <Button onPress={handleUpdate} style={{ flex: 1 }}>저장</Button>
        </View>
      </BottomSheet>

      <AlertDialog visible={deleteVisible} onClose={() => setDeleteVisible(false)} title="폴더를 삭제할까요?" description="폴더 안의 모든 링크도 함께 삭제돼요" confirmText="삭제" onConfirm={handleDelete} destructive />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.gray[900], letterSpacing: -0.5 },
  addBtn: { backgroundColor: colors.blue[50], paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  list: { paddingHorizontal: 20, paddingTop: 12 },
  folderRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 16, marginBottom: 8 },
  folderIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.blue[50], alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  folderName: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.gray[800], letterSpacing: -0.2 },
  folderRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  moreBtn: { padding: 6 },
  moreDots: { fontSize: 18, color: colors.gray[400], fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.gray[700] },
  emptySub: { fontSize: 14, color: colors.gray[500] },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 },
});
