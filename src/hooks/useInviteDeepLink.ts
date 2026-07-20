import { useEffect, useState } from 'react';

import * as Linking from 'expo-linking';

import { parseInviteToken } from '../utils/inviteLink';

/**
 * 초대 딥링크 수신 훅 — 시안 ④ 진입점.
 *
 * useURL() 대신 이벤트 리스너를 직접 사용 — 같은 링크를 두 번 탭하면
 * useURL 반환값이 동일해 effect 가 재실행되지 않는 문제가 있다.
 * 콜드 스타트는 getInitialURL, 실행 중 수신은 addEventListener 로 처리.
 */
export function useInviteDeepLink() {
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      if (__DEV__) console.log('[InviteDeepLink] URL 수신:', url);
      const token = parseInviteToken(url);
      if (token) {
        if (__DEV__) console.log('[InviteDeepLink] 토큰 파싱 성공:', token.slice(0, 8) + '…');
        setInviteToken(token);
      }
    };

    // 콜드 스타트 (앱이 딥링크로 켜진 경우)
    Linking.getInitialURL().then(handleUrl);

    // 실행 중 수신 (앱이 떠 있는 상태에서 링크 탭)
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  const clearInviteToken = () => setInviteToken(null);

  return { inviteToken, clearInviteToken };
}
