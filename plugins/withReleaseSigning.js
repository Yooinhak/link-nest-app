/**
 * withReleaseSigning — Android "업로드 키" 서명을 build.gradle 에 연결하는 config plugin.
 *
 * expo prebuild 가 android/ 를 재생성할 때마다 app/build.gradle 을 손봐서,
 * release 빌드가 기본 debug 키가 아니라 Play 업로드 키로 서명되게 한다.
 * (RN 템플릿은 release 도 debug 키로 서명하도록 나오므로 그대로 두면 Play 업로드 불가.)
 *
 * 업로드 키 값은 ~/.gradle/gradle.properties 의 아래 4개 프로퍼티에서 읽는다.
 * 프로젝트 밖 전역 설정이라 prebuild 로 android/ 가 날아가도 유지된다:
 *   MOARING_UPLOAD_STORE_FILE      (키스토어 절대경로)
 *   MOARING_UPLOAD_KEY_ALIAS
 *   MOARING_UPLOAD_STORE_PASSWORD
 *   MOARING_UPLOAD_KEY_PASSWORD
 *
 * 4개 중 하나라도 없으면 자동으로 debug 키로 폴백 → 키/멤버십 없이도 개발·APK 빌드는 그대로 동작.
 * 설정 절차 전체는 docs/android-signing-guide.md 참고.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

// signingConfigs { } 안, debug 블록 바로 뒤에 넣을 release 서명 설정.
const RELEASE_SIGNING_BLOCK = `        release {
            if (project.hasProperty('MOARING_UPLOAD_STORE_FILE')
                    && project.hasProperty('MOARING_UPLOAD_KEY_ALIAS')
                    && project.hasProperty('MOARING_UPLOAD_STORE_PASSWORD')
                    && project.hasProperty('MOARING_UPLOAD_KEY_PASSWORD')) {
                storeFile file(MOARING_UPLOAD_STORE_FILE)
                storePassword MOARING_UPLOAD_STORE_PASSWORD
                keyAlias MOARING_UPLOAD_KEY_ALIAS
                keyPassword MOARING_UPLOAD_KEY_PASSWORD
            } else {
                println('⚠️  MOARING_UPLOAD_* 미설정 → release 를 debug 키로 서명합니다 (Play 업로드 불가). docs/android-signing-guide.md 참고.')
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }`;

// prebuild 가 생성하는 RN 템플릿의 debug 서명 블록 (여기 뒤에 release 블록을 붙인다).
const DEBUG_SIGNING_BLOCK = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }`;

// release buildType 이 debug 키를 가리키는 줄 (Caution 주석이 유일 앵커 → 아래 signingConfig 줄만 교체).
const RELEASE_BUILDTYPE_ANCHOR =
  "// see https://reactnative.dev/docs/signed-apk-android.\n            signingConfig signingConfigs.debug";
const RELEASE_BUILDTYPE_FIXED =
  "// see https://reactnative.dev/docs/signed-apk-android.\n            signingConfig signingConfigs.release";

function applyReleaseSigning(gradle) {
  // 이미 적용됨 → 그대로 (idempotent: prebuild 재실행/이중적용 방지)
  if (gradle.includes('project.hasProperty(\'MOARING_UPLOAD_STORE_FILE\')')) {
    return gradle;
  }

  if (!gradle.includes(DEBUG_SIGNING_BLOCK)) {
    throw new Error(
      '[withReleaseSigning] build.gradle 의 debug signingConfigs 블록을 못 찾음 — RN 템플릿이 바뀐 듯합니다. plugins/withReleaseSigning.js 의 앵커를 갱신하세요.',
    );
  }
  if (!gradle.includes(RELEASE_BUILDTYPE_ANCHOR)) {
    throw new Error(
      '[withReleaseSigning] release buildType 의 signingConfig 앵커를 못 찾음 — RN 템플릿이 바뀐 듯합니다. plugins/withReleaseSigning.js 의 앵커를 갱신하세요.',
    );
  }

  return gradle
    .replace(DEBUG_SIGNING_BLOCK, `${DEBUG_SIGNING_BLOCK}\n${RELEASE_SIGNING_BLOCK}`)
    .replace(RELEASE_BUILDTYPE_ANCHOR, RELEASE_BUILDTYPE_FIXED);
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error(
        `[withReleaseSigning] Groovy build.gradle 만 지원합니다 (받은 언어: ${cfg.modResults.language}).`,
      );
    }
    cfg.modResults.contents = applyReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};
