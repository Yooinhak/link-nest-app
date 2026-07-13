#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# 모아링 Android Release APK 빌드 (친구 배포용)
#
# 사용법:
#   bun run android:apk              # 평소 (JS/스타일만 바꿨을 때)
#   bun run android:apk:prebuild     # app.json/아이콘/스플래시 바꿨을 때
#   bun run android:apk:clean        # applicationId/스킴 바꿨을 때
#
# 특징:
#   - prebuild 에 SHARE_INTENT=1 자동 포함 (누락 시 '공유하기로 받기' 소실 방지)
#   - Sentry 소스맵 업로드 기본 비활성 (auth token 없이 빌드 가능).
#     업로드하려면: SENTRY_UPLOAD=1 bun run android:apk
#   - 완료 시 APK 경로 출력 + Finder 에서 열기
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-run}" # run | prebuild | clean

if [[ "$MODE" == "clean" ]]; then
  echo "🧹 SHARE_INTENT=1 prebuild --clean (android/ 재생성)"
  SHARE_INTENT=1 npx expo prebuild -p android --clean
elif [[ "$MODE" == "prebuild" ]]; then
  echo "🔧 SHARE_INTENT=1 prebuild (설정 동기화)"
  SHARE_INTENT=1 npx expo prebuild -p android
fi

echo "🤖 Release APK 빌드"
if [[ "${SENTRY_UPLOAD:-}" == "1" ]]; then
  (cd android && ./gradlew assembleRelease)
else
  (cd android && SENTRY_DISABLE_AUTO_UPLOAD=true ./gradlew assembleRelease)
fi

APK="android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "✅ APK 완성: $APK ($(du -h "$APK" | cut -f1))"

# macOS 면 Finder 에서 위치 열기
if [[ "$(uname)" == "Darwin" ]]; then
  open -R "$APK"
fi
