import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '../components/Toast';
import { colors } from '../constants/theme';
import { supabase } from '../utils/supabase/client';

WebBrowser.maybeCompleteAuthSession();

const ERROR_MESSAGE = '로그인에 실패했어요. 다시 시도해주세요.';

function SocialLoginButton({ type }: { type: 'kakao' | 'google' }) {
  const isKakao = type === 'kakao';
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const redirectUrl = Linking.createURL('auth/callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: type,
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });

      if (error) {
        showToast('error', ERROR_MESSAGE);
        return;
      }
      if (!data?.url) {
        showToast('error', ERROR_MESSAGE);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success' && result.url) {
        const fragment = result.url.split('#')[1];
        if (fragment) {
          const params = new URLSearchParams(fragment);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) {
              showToast('error', ERROR_MESSAGE);
            }
          } else {
            showToast('error', ERROR_MESSAGE);
          }
        } else {
          const parsedUrl = Linking.parse(result.url);
          const code = parsedUrl.queryParams?.['code'] as string | undefined;
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              showToast('error', ERROR_MESSAGE);
            }
          } else {
            showToast('error', ERROR_MESSAGE);
          }
        }
      }
      // result.type === 'cancel' 또는 'dismiss'는 사용자가 의도적으로 닫은 것이므로 무시
    } catch {
      showToast('error', ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.socialBtn, { backgroundColor: isKakao ? colors.kakao : colors.white }]}
      onPress={handleSignIn}
      activeOpacity={0.75}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={isKakao ? 'Kakao로 로그인' : 'Google로 로그인'}
      accessibilityState={{ disabled: loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={isKakao ? '#191919' : colors.gray[600]} />
      ) : (
        <Text style={[styles.socialLabel, { color: isKakao ? '#191919' : colors.gray[800] }]}>
          {isKakao ? 'Kakao로 시작하기' : 'Google로 시작하기'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

/**
 * Apple Sign In 버튼.
 *
 * iOS 전용 — Android에서는 렌더하지 않는다. Apple HIG는 자체 커스텀 스타일을
 * 금지하고 `AppleAuthenticationButton` 네이티브 컴포넌트 사용을 요구하므로
 * 다른 소셜 버튼과 달리 색상/크기/폰트를 직접 지정하지 않는다.
 *
 * 흐름:
 *   1) AppleAuthentication.signInAsync() → identityToken 획득
 *   2) supabase.auth.signInWithIdToken({ provider: 'apple', token })
 *   3) 성공 시 onAuthStateChange가 세션을 잡고 RootNavigator가 홈으로 전환
 */
function AppleLoginButton() {
  const [isAvailable, setIsAvailable] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;
    AppleAuthentication.isAvailableAsync().then((available) => {
      if (!cancelled) setIsAvailable(available);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (Platform.OS !== 'ios' || !isAvailable) return null;

  const handlePress = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        showToast('error', ERROR_MESSAGE);
        return;
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        showToast('error', ERROR_MESSAGE);
      }
      // 성공 시 별도 처리 불필요 — onAuthStateChange 가 RootNavigator를 홈으로 전환.
    } catch (err) {
      // 사용자가 시트를 닫거나 Face ID를 취소한 경우는 정상 흐름이므로 무시.
      const code = (err as { code?: string })?.code;
      if (code === 'ERR_REQUEST_CANCELED') return;
      showToast('error', ERROR_MESSAGE);
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={16}
      style={styles.appleBtn}
      onPress={handlePress}
    />
  );
}

const logoImage = require('../../assets/icon.png');

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topSection}>
        <Image source={logoImage} style={styles.logo} accessibilityLabel="Link Nest 로고" />
        <Text style={styles.title}>Link Nest</Text>
        <Text style={styles.subtitle}>
          {'즐겨찾는 공유 링크를\n모두 모아둘 수 있는 아늑한 장소'}
        </Text>
      </View>

      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>
        <AppleLoginButton />
        <SocialLoginButton type="kakao" />
        <SocialLoginButton type="google" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 24,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.gray[900],
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 4,
  },
  bottomSection: {
    paddingHorizontal: 24,
    gap: 10,
  },
  socialBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  appleBtn: {
    height: 54,
  },
  socialLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
