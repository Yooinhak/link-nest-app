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
import Svg, { Path } from 'react-native-svg';

import GlassBackground from '../components/GlassBackground';
import { useToast } from '../components/Toast';
import { colors, glass } from '../constants/theme';
import { EXTERNAL_URLS } from '../constants/urls';
import { supabase } from '../utils/supabase/client';

WebBrowser.maybeCompleteAuthSession();

const ERROR_MESSAGE = '로그인에 실패했어요. 다시 시도해주세요.';

// 브랜드 아이콘 — 멀티컬러 fill 기반이라 공용 스트로크 아이콘 세트(icons.tsx)와 분리해 로컬 유지.
const KakaoIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill={colors.kakaoText}>
    <Path d="M12 3.5C6.8 3.5 2.5 6.9 2.5 11c0 2.6 1.8 4.9 4.4 6.2-.2.7-.7 2.4-.8 2.8-.1.5.2.5.4.4.2-.1 2.4-1.7 3.4-2.3.5.1 1.1.1 1.7.1 5.2 0 9.5-3.3 9.5-7.4S17.2 3.5 12 3.5z" />
  </Svg>
);

const GoogleIcon = () => (
  <Svg width={17} height={17} viewBox="0 0 48 48">
    <Path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"
    />
    <Path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 16.3 4.5 9.7 8.8 6.3 14.7z"
    />
    <Path
      fill="#4CAF50"
      d="M24 43.5c5.4 0 10.3-1.9 14.1-5.2l-6.5-5.5c-2.1 1.6-4.8 2.7-7.6 2.7-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.1 16.2 43.5 24 43.5z"
    />
    <Path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.2 5.8l6.5 5.5c-.5.4 7-5.1 7-15.3 0-1.2-.1-2.3-.4-3.5z"
    />
  </Svg>
);

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
      style={[styles.socialBtn, isKakao ? styles.kakaoBtn : styles.googleBtn]}
      onPress={handleSignIn}
      activeOpacity={0.75}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={isKakao ? '카카오로 로그인' : 'Google로 로그인'}
      accessibilityState={{ disabled: loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={isKakao ? colors.kakaoText : colors.textMuted} />
      ) : (
        <>
          {isKakao ? <KakaoIcon /> : <GoogleIcon />}
          <Text style={[styles.socialLabel, { color: isKakao ? colors.kakaoText : colors.text }]}>
            {isKakao ? '카카오로 계속하기' : 'Google로 계속하기'}
          </Text>
        </>
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

// 스플래시 아이콘과 동일한 아트워크(LN 마크 원본). splash-icon.png 은 투명 여백이 있는
// 1024 캔버스라서, 원본 정사각 아트워크(icon.png)에 동일 비율(28/96)의 borderRadius 를 적용해 맞춘다.
const logoIcon = require('../../assets/icon.png');

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 딥 블루 공기 — 블루 글래스 시안 01 */}
      <GlassBackground variant="login" />

      <View style={styles.topSection}>
        {/* 유리 받침 위 로고 타일 */}
        <View style={styles.logoGlass}>
          <View style={styles.logoTile} accessibilityLabel="모아링 로고">
            <Image source={logoIcon} style={styles.logoImage} resizeMode="cover" />
          </View>
        </View>
        <Text style={styles.title}>모아링</Text>
        <Text style={styles.subtitle}>{'흩어진 링크를 한 곳에,\n친구와 함께 반짝이게'}</Text>
      </View>

      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>
        <AppleLoginButton />
        <SocialLoginButton type="kakao" />
        <SocialLoginButton type="google" />
        <Text style={styles.terms}>
          계속 진행하면{' '}
          <Text
            style={styles.termsLink}
            onPress={() => Linking.openURL(EXTERNAL_URLS.TERMS_OF_SERVICE)}
            accessibilityRole="link"
          >
            이용약관
          </Text>
          {' 및 '}
          <Text
            style={styles.termsLink}
            onPress={() => Linking.openURL(EXTERNAL_URLS.PRIVACY_POLICY)}
            accessibilityRole="link"
          >
            개인정보 처리방침
          </Text>
          에 동의하게 됩니다
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F9FE',
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  // 시안 01: 유리 받침(반투명 + 흰 보더) 안에 로고 타일
  logoGlass: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: glass.border,
    borderRadius: 30,
    padding: 14,
    marginBottom: 14,
    // 반투명 표면에는 그림자 금지 (theme.ts 유리 표면 규칙)
  },
  // 그림자는 래퍼에, 라운드는 이미지에 — overflow hidden 없이 둘 다 유지
  logoTile: {
    width: 82,
    height: 82,
  },
  logoImage: {
    width: 82,
    height: 82,
    borderRadius: 24, // 스플래시 타일과 동일 비율 (≈28/96 = 128/440)
    backgroundColor: colors.primaryTint,
  },
  title: {
    fontSize: 28,
    fontFamily: 'LINESeedKR-Bold',
    color: colors.ink,
    letterSpacing: -0.84, // -0.03em
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'LINESeedKR',
    color: '#5A5375', // 딥 라벤더 공기 위 서브 텍스트 (v3)
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 8,
  },
  bottomSection: {
    paddingHorizontal: 26,
    gap: 10,
  },
  socialBtn: {
    height: 54,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  kakaoBtn: {
    backgroundColor: colors.kakao,
  },
  // 시안 01: Google 버튼은 유리 표면
  googleBtn: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: glass.border,
  },
  appleBtn: {
    height: 54,
  },
  socialLabel: {
    fontSize: 16,
    fontFamily: 'LINESeedKR-Bold',
  },
  terms: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'LINESeedKR',
    color: '#8F89AB', // 딥 라벤더 공기 위 약관 텍스트 (v3)
    marginTop: 8,
    lineHeight: 18,
  },
  termsLink: {
    fontFamily: 'LINESeedKR-Bold',
    color: '#6D5EF0', // primaryDeep — 탭 가능함을 드러내는 액센트
    textDecorationLine: 'underline',
  },
});
