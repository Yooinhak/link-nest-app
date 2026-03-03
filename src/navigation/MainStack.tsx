import React from 'react';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from '../constants/theme';
import FolderDetailScreen from '../screens/FolderDetailScreen';
import TabNavigator from './TabNavigator';
import { MainStackParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.gray[900],
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: '',
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="FolderDetail"
        component={FolderDetailScreen}
        options={({ route }) => ({ title: route.params.folderName || '폴더' })}
      />
    </Stack.Navigator>
  );
}
