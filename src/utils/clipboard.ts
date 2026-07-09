/**
 * 클립보드 유틸 — expo-clipboard 가 설치되어 있으면 사용, 없으면 false 반환.
 * (네이티브 모듈이라 `npx expo install expo-clipboard` + 재빌드 필요.
 *  미설치 상태에서도 앱이 죽지 않도록 optional require 처리.)
 */

interface ClipboardModule {
  setStringAsync: (text: string) => Promise<boolean>;
}

let clipboard: ClipboardModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  clipboard = require('expo-clipboard') as ClipboardModule;
} catch {
  clipboard = null;
}

export const isClipboardAvailable = clipboard != null;

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!clipboard) return false;
  try {
    await clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}
