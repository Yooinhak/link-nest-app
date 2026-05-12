import { useCallback, useRef } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '../../components/Toast';
import { queryKeys } from '../../utils/react-query/queryKeys';
import { supabase } from '../../utils/supabase/client';

// --- Query ---
export function useFoldersQuery() {
  return useQuery({
    queryKey: [queryKeys.FOLDER_LIST],
    queryFn: async () =>
      await supabase.from('folders').select('*, posts(count)').order('created_at', { ascending: false }),
    select: (data) => data.data,
  });
}

// --- Mutations ---
export function useCreateFolder() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: { name: string; color: string }) => {
      const { error } = await supabase.from('folders').insert(params);
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

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: { id: number; name: string; color: string }) => {
      const { id, name, color } = params;
      const { error } = await supabase.from('folders').update({ name, color }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.FOLDER_LIST] });
      showToast('success', '폴더가 수정되었어요');
    },
    onError: () => {
      showToast('error', '수정에 실패했어요');
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('folders').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [queryKeys.FOLDER_LIST] });
      const previous = queryClient.getQueryData([queryKeys.FOLDER_LIST]);
      queryClient.setQueryData([queryKeys.FOLDER_LIST], (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.filter((f: any) => f.id !== id) };
      });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData([queryKeys.FOLDER_LIST], context.previous);
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
export function useDeferredDeleteFolder() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const deleteFolder = useDeleteFolder();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const execute = useCallback((id: number) => {
    // 1. 낙관적으로 캐시에서 제거
    const previous = queryClient.getQueryData([queryKeys.FOLDER_LIST]);
    queryClient.setQueryData([queryKeys.FOLDER_LIST], (old: any) => {
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
          // 캐시 복구
          if (previous) {
            queryClient.setQueryData([queryKeys.FOLDER_LIST], previous);
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
            // 실패 시 캐시 복구
            if (previous) {
              queryClient.setQueryData([queryKeys.FOLDER_LIST], previous);
            }
            showToast('error', '폴더 삭제에 실패했어요');
          }
          queryClient.invalidateQueries({ queryKey: [queryKeys.FOLDER_LIST] });
        });
      }
      timerRef.current = null;
    }, 6000);
  }, [queryClient, showToast]);

  return { execute, isPending: deleteFolder.isPending };
}
