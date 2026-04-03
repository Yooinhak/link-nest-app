import { useEffect } from 'react';

import { useShareIntentContext } from 'expo-share-intent';
import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../utils/react-query/queryKeys';
import { supabase } from '../utils/supabase/client';
import { isValidUrl } from '../utils/validateUrl';

/**
 * 외부 앱에서 공유받은 URL을 처리합니다.
 * 기본 폴더(가장 최근 폴더)에 자동 저장하고 토스트로 알립니다.
 */
export function useShareIntent(showToast: (type: 'success' | 'error', msg: string) => void) {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!hasShareIntent || !shareIntent) return;

    const url = shareIntent.webUrl || shareIntent.text || '';

    if (!url || !isValidUrl(url)) {
      resetShareIntent();
      return;
    }

    (async () => {
      // 가장 최근 폴더 가져오기
      const { data: folders } = await supabase
        .from('folders')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!folders || folders.length === 0) {
        showToast('error', '폴더를 먼저 만들어주세요');
        resetShareIntent();
        return;
      }

      const { error } = await supabase.from('posts').insert({
        url,
        description: null,
        folder_id: folders[0].id,
      });

      if (error) {
        showToast('error', '링크 저장에 실패했어요');
      } else {
        queryClient.invalidateQueries({ queryKey: [queryKeys.FOLDER_LIST] });
        showToast('success', '공유된 링크가 저장되었어요');
      }

      resetShareIntent();
    })();
  }, [hasShareIntent]);
}
