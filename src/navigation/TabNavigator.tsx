import React from 'react';

import { StyleSheet } from 'react-native';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { HomeIcon, UserIcon } from '../components/icons';
import { colors } from '../constants/theme';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';

import { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  // NOTE: height/padding 을 수동 지정하지 말 것 — bottom-tabs v7 이 safe-area
  // 인셋(제스처 바/3버튼 내비)을 자체 계산하는데, 수동 값이 이를 덮어써서
  // Android edge-to-edge 에서 겹침/짤림이 발생했다 (2026-07-10).
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ color }) => <HomeIcon size={23} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: '설정',
          tabBarIcon: ({ color }) => <UserIcon size={23} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
