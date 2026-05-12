import { useCallback, useRef } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '../../components/Toast';
import { queryKeys } from '../../utils/react-query/queryKeys';
import { supabase } from '../../utils/supabase/client';

// --- Query ---
export function usePostsQuery(folderId: string) {
  return useQuery({
    queryKey: [queryKeys.POST_LIST, folderId],
    queryFn: async () =>
      await supabase.from('posts').select().eq('folder_id', Number(folderId)),
    select: (data) => data.data,
  });
}

// --- Mutations ---
export function useCreatePost() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: { url: string; description: string | null; folder_id: number }) => {
      const { error } = await supabase.from('posts').insert(params);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.POST_LIST, String(variables.folder_id)] });
      queryClient.invalidateQueries({ queryKey: [queryKeys.FOLDER_LIST] });
      showToast('success', '링크가 추가되었어요');
    },
    onError: () => {
      showToast('error', '링크 추가에 실패했어요');
    },
  });
}

export function useUpdatePost(folderId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: { id: number; description: string | null }) => {
      const { id, description } = params;
      const { error } = await supabase.from('posts').update({ description }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.POST_LIST, folderId] });
      showToast('success', '메모가 수정되었어요');
    },
    onError: () => {
      showToast('error', '메모 수정에 실패했어요');
    },
  });
}

export function useDeletePost(folderId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      const queryKey = [queryKeys.POST_LIST, folderId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.filter((p: any) => p.id !== id) };
      });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData([queryKeys.POST_LIST, folderId], context.previous);
      }
      showToast('error', '링크 삭제에 실패했어요');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.POST_LIST, folderId] });
      queryClient.invalidateQueries({ queryKey: [queryKeys.FOLDER_LIST] });
    },
    onSuccess: () => {
      showToast('success', '링크가 삭제되었어요');
    },
  });
}

/**
 * B-6: Undo 삭제 — 링크를 즉시 DB에서 지우지 않고 낙관적 제거 후
 * 6초 Undo 토스트를 보여준다. 타임아웃 시 실제 삭제, Undo 시 복구.
 */
export function useDeferredDeletePost(folderId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const execute = useCallback((id: number) => {
    const queryKey = [queryKeys.POST_LIST, folderId];

    // 1. 낙관적으로 캐시에서 제거
    const previous = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old?.data) return old;
      return { ...old, data: old.data.filter((p: any) => p.id !== id) };
    });

    if (timerRef.current) clearTimeout(timerRef.current);

    let undone = false;

    // 2. Undo 토스트 (6초)
    showToast('success', '링크가 삭제되었어요', {
      duration: 6000,
      action: {
        label: '실행 취소',
        onPress: () => {
          undone = true;
          if (timerRef.current) clearTimeout(timerRef.current);
          if (previous) {
            queryClient.setQueryData(queryKey, previous);
          }
          showToast('success', '삭제가 취소되었어요');
        },
      },
    });

    // 3. 6초 후 실제 삭제
    timerRef.current = setTimeout(() => {
      if (!undone) {
        supabase.from('posts').delete().eq('id', id).then(({ error }) => {
          if (error) {
            if (previous) {
              queryClient.setQueryData(queryKey, previous);
            }
            showToast('error', '링크 삭제에 실패했어요');
          }
          queryClient.invalidateQueries({ queryKey });
          queryClient.invalidateQueries({ queryKey: [queryKeys.FOLDER_LIST] });
        });
      }
      timerRef.current = null;
    }, 6000);
  }, [queryClient, showToast, folderId]);

  return { execute };
}
