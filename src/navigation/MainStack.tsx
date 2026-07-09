import React from 'react';

import { StyleSheet, Text, View } from 'react-native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OfflineBanner from '../components/OfflineBanner';
import { colors, getFolderColor } from '../constants/theme';
import FolderDetailScreen from '../screens/FolderDetailScreen';
import MemberManageScreen from '../screens/MemberManageScreen';

import TabNavigator from './TabNavigator';
import { MainStackParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();

// 시안 04: 뒤로가기 + 컬러 점 + 폴더명 헤더
function FolderHeaderTitle({ name, colorKey }: { name: string; colorKey?: string }) {
  const fc = getFolderColor(colorKey);
  return (
    <View style={headerStyles.row}>
      <View style={[headerStyles.dot, { backgroundColor: fc.icon }]} />
      <Text style={headerStyles.title} numberOfLines={1}>
        {name || '폴더'}
      </Text>
    </View>
  );
}

export default function MainStack() {
  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          headerBackTitle: '',
        }}
      >
        <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false, title: '' }} />
        <Stack.Screen
          name="FolderDetail"
          component={FolderDetailScreen}
          options={({ route }) => ({
            headerTitle: () => (
              <FolderHeaderTitle name={route.params.folderName} colorKey={route.params.folderColor} />
            ),
            headerTitleAlign: 'left',
            headerStyle: { backgroundColor: colors.surface },
            headerShadowVisible: false,
            headerLargeTitle: false,
            headerBackTitleVisible: false,
          })}
        />
        <Stack.Screen
          name="MemberManage"
          component={MemberManageScreen}
          options={{
            title: '멤버 관리',
            headerStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
          }}
        />
      </Stack.Navigator>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 3,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.34, // -0.02em
  },
});
