import { useCallback, useRef } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '../../components/Toast';
import { queryKeys } from '../../utils/react-query/queryKeys';
import { supabase } from '../../utils/supabase/client';

// ⚠️ 그룹 모델 전환 (001_groups_sharing.sql): 폴더는 항상 그룹에 소속.
// 조회/생성은 groupId 필수, 캐시 키는 [FOLDER_LIST, groupId].

// --- Query ---
export function useFoldersQuery(groupId: string | null) {
  return useQuery({
    queryKey: [queryKeys.FOLDER_LIST, groupId],
    enabled: !!groupId,
    queryFn: async () =>
      await supabase
        .from('folders')
        .select('*, posts(count)')
        .eq('group_id', groupId!)
        .order('created_at', { ascending: false }),
    select: (data) => data.data,
  });
}

/**
 * 내가 속한 모든 그룹의 폴더 (공유 인텐트 저장 시트 ⑥ — 그룹별 섹션 그룹핑용).
 * RLS가 멤버십 기준으로 필터하므로 조건 없이 전체 조회하면 된다.
 */
export function useAllFoldersQuery(enabled = true) {
  return useQuery({
    queryKey: [queryKeys.FOLDER_LIST, 'all'],
    enabled,
    queryFn: async () =>
      await supabase
        .from('folders')
        .select('*, group:groups(id, name, color, type)')
        .order('created_at', { ascending: false }),
    select: (data) => data.data,
  });
}

// --- Mutations ---
export function useCreateFolder(groupId: string | null) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: { name: string; color: string; emoji?: string | null }) => {
      if (!groupId) throw new Error('NO_GROUP');
      const { error } = await supabase.from('folders').insert({ ...params, group_id: groupId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.FOLDER_LIST] });
      showToast('success', '폴더가 생성되었어요');
    },
    onError: () => {
      showToast('error', '폴더 생성에 실패했어요');
    },
  });
}

export function useUpdateFolder(groupId: string | null) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: { id: number; name: string; color: string; emoji?: string | null }) => {
      const { id, name, color, emoji } = params;
      const { error } = await supabase.from('folders').update({ name, color, emoji }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.FOLDER_LIST, groupId] });
      queryClient.invalidateQueries({ queryKey: [queryKeys.FOLDER_LIST, 'all'] });
      showToast('success', '폴더가 수정되었어요');
    },
    onError: () => {
      showToast('error', '수정에 실패했어요');
    },
  });
}

export function useDeleteFolder(groupId: string | null) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const listKey = [queryKeys.FOLDER_LIST, groupId];

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('folders').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.filter((f: any) => f.id !== id) };
      });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
      showToast('error', '폴더 삭제에 실패했어요');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.FOLDER_LIST] });
    },
    onSuccess: () => {
      showToast('success', '폴더가 삭제되었어요');
    },
  });
}

/**
 * B-6: Undo 삭제 — 폴더를 즉시 DB에서 지우지 않고 낙관적 제거 후
 * 6초 Undo 토스트를 보여준다. 타임아웃 시 실제 삭제, Undo 시 복구.
 */
export function useDeferredDeleteFolder(groupId: string | null) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const deleteFolder = useDeleteFolder(groupId);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const execute = useCallback(
    (id: number) => {
      const listKey = [queryKeys.FOLDER_LIST, groupId];

      // 1. 낙관적으로 캐시에서 제거
      const previous = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.filter((f: any) => f.id !== id) };
      });

      // 기존 타이머가 있으면 정리
      if (timerRef.current) clearTimeout(timerRef.current);

      let undone = false;

      // 2. Undo 토스트 (6초)
      showToast('success', '폴더가 삭제되었어요', {
        duration: 6000,
        action: {
          label: '실행 취소',
          onPress: () => {
            undone = true;
            if (timerRef.current) clearTimeout(timerRef.current);
            if (previous) {
              queryClient.setQueryData(listKey, previous);
            }
            showToast('success', '삭제가 취소되었어요');
          },
        },
      });

      // 3. 6초 후 실제 삭제
      timerRef.current = setTimeout(() => {
        if (!undone) {
          supabase.from('folders').delete().eq('id', id).then(({ error }) => {
            if (error) {
              if (previous) {
                queryClient.setQueryData(listKey, previous);
              }
              showToast('error', '폴더 삭제에 실패했어요');
            }
            queryClient.invalidateQueries({ queryKey: [queryKeys.FOLDER_LIST] });
          });
        }
        timerRef.current = null;
      }, 6000);
    },
    [queryClient, showToast, groupId],
  );

  return { execute, isPending: deleteFolder.isPending };
}
