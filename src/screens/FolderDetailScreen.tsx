import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { RouteProp, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';

import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import Input from '../components/Input';
import LinkPreviewCard, { LinkPreviewCardSkeleton } from '../components/LinkPreviewCard';
import { colors } from '../constants/theme';
import { MainStackParamList } from '../navigation/types';
import { queryKeys } from '../utils/react-query/queryKeys';
import { supabase } from '../utils/supabase/client';

type FolderDetailRouteProp = RouteProp<MainStackParamList, 'FolderDetail'>;

const PlusIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={2.5} strokeLinecap="round">
    <Path d="M12 5v14M5 12h14" />
  </Svg>
);

export default function FolderDetailScreen() {
  const route = useRoute<FolderDetailRouteProp>();
  const { folderId } = route.params;
  const queryClient = useQueryClient();

  const [createVisible, setCreateVisible] = useState(false);
  const [postUrl, setPostUrl] = useState('');
  const [postDescription, setPostDescription] = useState('');

  const { data: postList, isLoading } = useQuery({
    queryKey: [queryKeys.POST_LIST, folderId],
    queryFn: async () => await supabase.from('posts').select().eq('folder_id', Number(folderId)),
    select: (data) => data.data,
  });

  const handleCreate = async () => {
    if (!postUrl.trim()) return;
    const { error } = await supabase.from('posts').insert({
      url: postUrl.trim(),
      description: postDescription.trim() || null,
      folder_id: Number(folderId),
    });
    if (!error) {
      queryClient.invalidateQueries({ queryKey: [queryKeys.POST_LIST, folderId] });
      setPostUrl('');
      setPostDescription('');
      setCreateVisible(false);
    }
  };

  const count = postList?.length ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.countRow}>
        <View style={styles.countBadge}>
          <Text style={styles.countNumber}>{count}</Text>
        </View>
        <Text style={styles.countText}>개의 링크</Text>
      </View>

      {isLoading ? (
        <View style={styles.list}>
          {[1, 2, 3].map((i) => <LinkPreviewCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={postList ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <LinkPreviewCard id={item.id} url={item.url} userDescription={item.description} folderId={folderId} />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{'🔗'}</Text>
              <Text style={styles.emptyTitle}>아직 링크가 없어요</Text>
              <Text style={styles.emptySub}>아래 버튼으로 링크를 추가해보세요</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => { setPostUrl(''); setPostDescription(''); setCreateVisible(true); }}
        activeOpacity={0.8}
      >
        <PlusIcon />
      </TouchableOpacity>

      <BottomSheet visible={createVisible} onClose={() => setCreateVisible(false)} title="링크 추가">
        <View style={styles.form}>
          <Input label="URL" placeholder="https://" value={postUrl} onChangeText={setPostUrl} autoCapitalize="none" keyboardType="url" autoFocus />
          <Input label="메모 (선택)" placeholder="이 링크에 대한 메모" value={postDescription} onChangeText={setPostDescription} />
        </View>
        <View style={styles.sheetBtns}>
          <Button variant="secondary" onPress={() => setCreateVisible(false)} style={{ flex: 1 }}>취소</Button>
          <Button onPress={handleCreate} style={{ flex: 1 }}>추가</Button>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[200],
    gap: 4,
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
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.gray[700] },
  emptySub: { fontSize: 14, color: colors.gray[500] },
});
