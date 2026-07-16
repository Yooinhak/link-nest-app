import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../utils/react-query/queryKeys';
import { supabase } from '../../utils/supabase/client';

/**
 * 그룹별 최근 활동 — 리텐션 훅(안읽음 배지)용.
 *
 * 링크가 담길 때마다 그룹에 '새 소식'이 생긴다. 새 테이블/푸시 없이, 이미 있는 posts
 * 데이터(created_at + 폴더의 group_id)를 재구성해 "그룹별 가장 최근 활동 시각"을 만든다.
 * GroupRail 이 이 값과 로컬 lastSeen 을 비교해 안읽음 점을 띄운다.
 *
 * RLS 가 내가 볼 수 있는 posts 로 이미 제한하므로 조건 없이 최근 N개만 훑으면 된다.
 */

export type GroupActivityMap = Record<string, string>; // groupId -> 최신 created_at(ISO)

type ActivityRow = {
  created_at: string | null;
  folder: { group_id: string } | null;
};

export function useGroupActivityQuery(enabled = true) {
  return useQuery({
    queryKey: [queryKeys.GROUP_ACTIVITY],
    enabled,
    // 활동은 자주 바뀌므로 짧게 신선 유지
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('created_at, folder:folders(group_id)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as ActivityRow[];
    },
    select: (rows): GroupActivityMap => {
      const latest: GroupActivityMap = {};
      for (const r of rows) {
        const gid = r.folder?.group_id;
        if (!gid || !r.created_at) continue;
        if (!latest[gid] || r.created_at > latest[gid]) latest[gid] = r.created_at;
      }
      return latest;
    },
  });
}
