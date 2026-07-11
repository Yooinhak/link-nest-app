import React from 'react';

import { View } from 'react-native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OfflineBanner from '../components/OfflineBanner';
import FolderDetailScreen from '../screens/FolderDetailScreen';
import MemberManageScreen from '../screens/MemberManageScreen';

import TabNavigator from './TabNavigator';
import { MainStackParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();

/**
 * 블루 글래스 리디자인: 모든 화면이 공기 배경(GlassBackground) 위에
 * 유리 백 버튼을 포함한 커스텀 헤더를 직접 그린다 → 네이티브 헤더 전부 끔.
 */
export default function MainStack() {
  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="FolderDetail" component={FolderDetailScreen} />
        <Stack.Screen name="MemberManage" component={MemberManageScreen} />
      </Stack.Navigator>
    </View>
  );
}
