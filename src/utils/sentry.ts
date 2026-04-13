/**
 * Sentry 초기화.
 *
 * DSN이 환경변수로 설정되어 있을 때만 활성화된다. 로컬 개발이나 DSN을
 * 아직 등록하지 않은 상태에서는 Sentry가 비활성(noop) 상태로 동작하므로
 * 크래시가 나거나 빌드가 깨지지 않는다.
 *
 * 배포 시:
 *   1) Sentry 프로젝트 생성 후 DSN 획득
 *   2) EAS Secret: `eas secret:create --name EXPO_PUBLIC_SENTRY_DSN --value <dsn>`
 *   3) 또는 `.env`에 `EXPO_PUBLIC_SENTRY_DSN=<dsn>` 추가
 */
import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!DSN) {
    console.log('[Sentry] DSN not set — Sentry disabled');
    return;
  }

  Sentry.init({
    dsn: DSN,
    // 개발 빌드에서는 디버그 모드
    debug: __DEV__,
    // 프로덕션에서는 100% 이벤트 전송, 향후 트래픽이 많아지면 0.2~0.5로 조절
    tracesSampleRate: __DEV__ ? 1.0 : 1.0,
    // 사용자 개인정보가 전송되지 않도록
    sendDefaultPii: false,
  });
}

export { Sentry };
