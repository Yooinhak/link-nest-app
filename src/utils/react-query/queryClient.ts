import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,       // 2분간 fresh 유지
      gcTime: 10 * 60 * 1000,          // 10분간 캐시 보관
      retry: 2,                         // 실패 시 2회 재시도
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15000),
      refetchOnWindowFocus: true,       // 앱 포그라운드 복귀 시 리프레시
    },
    mutations: {
      retry: 1,
    },
  },
});
