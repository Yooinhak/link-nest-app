import React, { useEffect, useState } from 'react';

import { Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeIcon, PlusIcon, UserIcon } from '../components/icons';
import SaveLinkSheet from '../components/sheets/SaveLinkSheet';
import { colors, glass, shadows } from '../constants/theme';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { lightTap } from '../utils/haptics';

import { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

/**
 * 플로팅 필 탭바 — 블루 글래스 시안 02/06/11.
 * 화면 하단 가운데 떠 있는 유리 알약: [홈] [＋] [프로필].
 * 활성 탭 = 파란 필(아이콘+라벨), 비활성 = 아이콘 원, ＋ = 링크 저장 시트.
 *
 * Android edge-to-edge: 알약의 bottom 오프셋에 insets.bottom 을 더해
 * 시스템 내비 바를 피한다 (react-native-edge-to-edge 필요 — research.md).
 * 키보드가 올라오면 알약을 숨긴다 (adjustResize 로 위로 밀려 어색해지는 것 방지).
 */

const TAB_META: Record<string, { label: string; Icon: typeof HomeIcon }> = {
  Home: { label: '홈', Icon: HomeIcon },
  Profile: { label: '내 정보', Icon: UserIcon },
};

function FloatingTabBar({ state, navigation, onAddPress }: BottomTabBarProps & { onAddPress: () => void }) {
  const insets = useSafeAreaInsets();

  // 키보드 노출 시 플로팅 바 숨김
  const [keyboardShown, setKeyboardShown] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboardShown(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboardShown) return null;

  const renderTab = (routeName: string, index: number) => {
    const meta = TAB_META[routeName];
    if (!meta) return null;
    const focused = state.index === index;
    const route = state.routes[index];

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) {
        lightTap();
        navigation.navigate(route.name);
      }
    };

    if (focused) {
      return (
        <TouchableOpacity
          key={route.key}
          style={styles.activePill}
          onPress={onPress}
          activeOpacity={0.85}
          accessibilityRole="tab"
          accessibilityState={{ selected: true }}
          accessibilityLabel={meta.label}
        >
          <meta.Icon size={18} color={colors.white} strokeWidth={2.4} />
          <Text style={styles.activeLabel}>{meta.label}</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        key={route.key}
        style={styles.idleCircle}
        onPress={onPress}
        activeOpacity={0.6}
        accessibilityRole="tab"
        accessibilityState={{ selected: false }}
        accessibilityLabel={meta.label}
      >
        <meta.Icon size={18} color={colors.textFaint} strokeWidth={2.2} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 14 }]} pointerEvents="box-none">
      <View style={styles.pill}>
        {renderTab('Home', 0)}
        <TouchableOpacity
          style={styles.idleCircle}
          onPress={() => {
            lightTap();
            onAddPress();
          }}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="링크 저장"
        >
          <PlusIcon size={19} color={colors.primary} strokeWidth={2.4} />
        </TouchableOpacity>
        {renderTab('Profile', 1)}
      </View>
    </View>
  );
}

export default function TabNavigator() {
  const [saveVisible, setSaveVisible] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <FloatingTabBar {...props} onAddPress={() => setSaveVisible(true)} />}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>

      {/* ＋ → 저장 위치 선택 시트 (URL 직접 입력 모드) */}
      <SaveLinkSheet visible={saveVisible} onClose={() => setSaveVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  // 콘텐츠 위에 떠 있는 레이어 — 스크롤은 알약 뒤로 흐른다
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: glass.bgStrong,
    borderWidth: 1,
    borderColor: glass.border,
    borderRadius: 32,
    padding: 7,
    ...shadows.floatBar,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 44,
    paddingHorizontal: 18,
    backgroundColor: colors.primary,
    borderRadius: 24,
    ...shadows.primaryGlow,
  },
  activeLabel: {
    fontSize: 13,
    fontFamily: 'LINESeedKR-Bold',
    color: colors.white,
  },
  idleCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
