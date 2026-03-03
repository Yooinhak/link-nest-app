import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../constants/theme';
import { supabase } from '../utils/supabase/client';

WebBrowser.maybeCompleteAuthSession();

function SocialLoginButton({ type }: { type: 'kakao' | 'google' }) {
  const isKakao = type === 'kakao';

  const handleSignIn = async () => {
    const redirectUrl = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: type,
      options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
    });

    if (error || !data?.url) return;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    if (result.type === 'success' && result.url) {
      const fragment = result.url.split('#')[1];
      if (fragment) {
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      } else {
        const parsedUrl = Linking.parse(result.url);
        const code = parsedUrl.queryParams?.['code'] as string | undefined;
        if (code) await supabase.auth.exchangeCodeForSession(code);
      }
    }
  };

  return (
    <TouchableOpacity
      style={[styles.socialBtn, { backgroundColor: isKakao ? colors.kakao : colors.white }]}
      onPress={handleSignIn}
      activeOpacity={0.75}
    >
      <Text style={[styles.socialLabel, { color: isKakao ? '#191919' : colors.gray[800] }]}>
        {isKakao ? 'Kakao로 시작하기' : 'Google로 시작하기'}
      </Text>
    </TouchableOpacity>
  );
}

const logoImage = require('../../assets/icon.png');

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topSection}>
        <Image source={logoImage} style={styles.logo} />
        <Text style={styles.title}>Link Nest</Text>
        <Text style={styles.subtitle}>
          {'즐겨찾는 공유 링크를\n모두 모아둘 수 있는 아늑한 장소'}
        </Text>
      </View>

      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>
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
  socialLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
