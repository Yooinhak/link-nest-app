/**
 * 아바타 URL 정규화.
 *
 * 왜 필요한가 (2026-07-16 디버깅):
 *   카카오 OAuth 는 프로필 이미지를 `http://k.kakaocdn.net/...` 처럼 **http** 로 준다.
 *   Android targetSdk 28+ 부터 cleartext(HTTP) 트래픽은 릴리즈에서 기본 차단이라
 *   (디버그 매니페스트에만 usesCleartextTraffic=true), 배포된 APK 에서는 카카오
 *   아바타가 통째로 로드 실패했다. 실제 DB 집계상 프로필 9명 중 5명이 http 였다.
 *
 *   카카오·구글 CDN 모두 https 를 지원하므로 http → https 로 승격한다.
 *   승격 후에도 실패하면 소비 측(Avatar/onError)이 이니셜 폴백으로 되돌린다.
 */
export function normalizeAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // http → https 승격 (프로토콜 상대 URL 포함). https/데이터 URI 등은 그대로 둔다.
  if (trimmed.startsWith('http://')) {
    return 'https://' + trimmed.slice('http://'.length);
  }
  return trimmed;
}
