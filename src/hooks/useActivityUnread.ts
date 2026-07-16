import { useCallback } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useGroup } from '../contexts/GroupContext';

import { useGroupActivityQuery } from './queries';

/**
 * 그룹 안읽음 상태 공유 훅 (리텐션).
 *
 * "마지막으로 본 활동 시각(lastSeen)"을 React Query 캐시에 담아 GroupRail(점)·홈 종
 * (카운트)·ActivityScreen(모두 읽음)이 같은 상태를 공유·구독하게 한다. AsyncStorage 로
 * 영속화한다. 컴포넌트별 useState 로는 화면 간 동기화가 안 되므로 쿼리 캐시를 단일
 * 소스로 쓴다.
 *
 * 안읽음 = 공유 그룹 && 그룹 최신 활동(useGroupActivityQuery) > lastSeen[groupId].
 * '읽음' 처리 시점: 활동 피드 진입(markAllSeen) 또는 해당 그룹 폴더 열람(markSeen).
 */

const LAST_SEEN_KEY = 'moaring.groupLastSeen';
const LAST_SEEN_QK = ['group-last-seen'] as const;

type SeenMap = Record<string, string>;

export function useActivityUnread() {
  const qc = useQueryClient();
  const { groups } = useGroup();
  const { data: activity = {} } = useGroupActivityQuery(groups.length > 0);

  const { data: lastSeen = {} } = useQuery<SeenMap>({
    queryKey: LAST_SEEN_QK,
    staleTime: Infinity,
    queryFn: async () => {
      const raw = await AsyncStorage.getItem(LAST_SEEN_KEY);
      return raw ? (JSON.parse(raw) as SeenMap) : {};
    },
  });

  const markSeen = useCallback(
    (updates: SeenMap) => {
      qc.setQueryData<SeenMap>(LAST_SEEN_QK, (prev) => {
        const next = { ...(prev ?? {}) };
        let changed = false;
        for (const [k, v] of Object.entries(updates)) {
          if (v && next[k] !== v) {
            next[k] = v;
            changed = true;
          }
        }
        if (changed) AsyncStorage.setItem(LAST_SEEN_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [qc],
  );

  const isUnread = useCallback(
    (groupId: string, groupType: string) =>
      groupType !== 'personal' && !!activity[groupId] && activity[groupId] > (lastSeen[groupId] ?? ''),
    [activity, lastSeen],
  );

  const unreadCount = groups.filter((g) => isUnread(g.id, g.type)).length;

  /** 특정 그룹을 '읽음'으로 (예: 그 그룹 폴더를 열었을 때) */
  const markGroupSeen = useCallback(
    (groupId: string) => {
      const latest = activity[groupId];
      if (latest) markSeen({ [groupId]: latest });
    },
    [activity, markSeen],
  );

  /** 모든 공유 그룹을 '읽음'으로 (활동 피드 진입 시) */
  const markAllSeen = useCallback(() => {
    const updates: SeenMap = {};
    for (const g of groups) {
      if (g.type !== 'personal' && activity[g.id]) updates[g.id] = activity[g.id];
    }
    if (Object.keys(updates).length > 0) markSeen(updates);
  }, [groups, activity, markSeen]);

  return { activity, lastSeen, isUnread, unreadCount, markGroupSeen, markAllSeen };
}
