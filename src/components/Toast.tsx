import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../constants/theme';
import { successTap, warningTap } from '../utils/haptics';

type ToastType = 'success' | 'error';

interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, options?: { action?: ToastAction; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

const CheckIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 6 9 17l-5-5" />
  </Svg>
);

const XIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

function ToastItem({ toast, onDone }: { toast: ToastMessage; onDone: (id: number) => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const duration = toast.duration ?? 2200;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start(() => onDone(toast.id));
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const isSuccess = toast.type === 'success';

  const handleActionPress = () => {
    toast.action?.onPress();
    // 액션 버튼을 누르면 즉시 토스트를 닫는다
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -20, duration: 150, useNativeDriver: true }),
    ]).start(() => onDone(toast.id));
  };

  return (
    <Animated.View
      style={[styles.toast, { opacity, transform: [{ translateY }] }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={toast.message}
    >
      <View style={[styles.iconWrap, { backgroundColor: isSuccess ? colors.success : colors.destructive }]} importantForAccessibility="no-hide-descendants">
        {isSuccess ? <CheckIcon /> : <XIcon />}
      </View>
      <Text style={styles.toastText}>{toast.message}</Text>
      {toast.action && (
        <TouchableOpacity
          onPress={handleActionPress}
          style={styles.actionBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={toast.action.label}
        >
          <Text style={styles.actionText}>{toast.action.label}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: ToastType, message: string, options?: { action?: ToastAction; duration?: number }) => {
    if (type === 'success') successTap();
    else warningTap();
    setToasts((prev) => [...prev, { id: ++toastId, type, message, action: options?.action, duration: options?.duration }]);
  }, []);

  const handleDone = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={[styles.container, { top: insets.top + (Platform.OS === 'ios' ? 8 : 16) }]} pointerEvents="box-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={handleDone} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[900],
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    width: '100%',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: -0.2,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
});
