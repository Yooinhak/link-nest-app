import React from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { ShareIntentProvider } from 'expo-share-intent';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AnimatedSplash from './src/components/AnimatedSplash';
import ErrorBoundary from './src/components/ErrorBoundary';
import { ToastProvider } from './src/components/Toast';
import { GroupProvider } from './src/contexts/GroupContext';
import RootNavigator from './src/navigation/RootNavigator';
import { queryClient } from './src/utils/react-query/queryClient';
import { initSentry } from './src/utils/sentry';

initSentry();

export default function App() {
  // DESIGN UPDATE v3: LINE Seed KR (Rg/Bd 2단계 — fontWeight 대신 fontFamily로 굵기 전환).
  // 로드 완료 전에는 아무것도 그리지 않는다 (네이티브 스플래시가 preventAutoHideAsync로
  // 유지 중이므로 빈 화면이 노출되지 않음). 로드 실패 시엔 시스템 폰트 폴백으로 진행.
  const [fontsLoaded, fontsError] = useFonts({
    LINESeedKR: require('./assets/fonts/LINESeedKR-Rg.ttf'),
    'LINESeedKR-Bold': require('./assets/fonts/LINESeedKR-Bd.ttf'),
  });
  if (!fontsLoaded && !fontsError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ShareIntentProvider>
          <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
              <ToastProvider>
                <GroupProvider>
                  <StatusBar style="auto" />
                  <RootNavigator />
                </GroupProvider>
                <AnimatedSplash />
              </ToastProvider>
            </QueryClientProvider>
          </SafeAreaProvider>
        </ShareIntentProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
