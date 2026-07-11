/**
 * 초대 딥링크 유틸.
 * MVP: 커스텀 스킴(linkle://invite/<token>).
 * 구 스킴(link-nest-app://)도 app.json scheme 배열에 남겨 기존 공유 링크 호환 유지 —
 * 파서는 스킴 비의존이라 양쪽 모두 처리된다.
 * TODO: 웹 랜딩 배포 후 https 유니버설 링크로 교체.
 *
 * NOTE(2026-07-09 버그픽스): expo-linking 의 parse() 는 커스텀 스킴에서
 * 첫 세그먼트('invite')를 hostname 으로 분류해 path 기반 매칭이 실패했다.
 * → 파서를 URL 문자열 정규식으로 재작성 (스킴/호스트 해석에 비의존, 테스트 용이).
 */

export function buildInviteUrl(token: string): string {
  return `linkle://invite/${token}`;
}

export function buildInviteMessage(groupName: string, token: string): string {
  return `Linkle '${groupName}' 그룹에 초대해요!\n${buildInviteUrl(token)}`;
}

/**
 * URL에서 초대 토큰 추출. 다음 형태를 모두 지원 (스킴 비의존):
 * - linkle://invite/<token> · link-nest-app://invite/<token> (구 스킴)
 * - linkle://invite?token=<token>
 * - https://<도메인>/invite/<token>  (향후 유니버설 링크)
 * - ...?token=<token>
 */
export function parseInviteToken(url: string): string | null {
  if (!url) return null;

  // 1) /invite/<token> 또는 ://invite/<token>
  const pathMatch = url.match(/(?:\/|:\/\/)invite\/([A-Za-z0-9_-]{8,})(?:[/?#]|$)/);
  if (pathMatch) return pathMatch[1];

  // 2) invite 링크의 ?token=<token>
  if (/(?:\/|:\/\/)invite(?:[/?#]|$)/.test(url)) {
    const queryMatch = url.match(/[?&]token=([A-Za-z0-9_-]{8,})/);
    if (queryMatch) return queryMatch[1];
  }

  return null;
}
