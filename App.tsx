import './global.css';

import React from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ShareIntentProvider } from 'expo-share-intent';

import ErrorBoundary from './src/components/ErrorBoundary';
import { ToastProvider } from './src/components/Toast';
import RootNavigator from './src/navigation/RootNavigator';
import { queryClient } from './src/utils/react-query/queryClient';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ShareIntentProvider>
          <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
              <ToastProvider>
                <StatusBar style="auto" />
                <RootNavigator />
              </ToastProvider>
            </QueryClientProvider>
          </SafeAreaProvider>
        </ShareIntentProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
