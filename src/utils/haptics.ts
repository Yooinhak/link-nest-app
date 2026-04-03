import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** 가벼운 탭 피드백 (버튼 탭, 토글 등) */
export function lightTap() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

/** 중간 탭 피드백 (뷰 모드 전환, 정렬 변경 등) */
export function mediumTap() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

/** 성공 피드백 (생성, 저장 완료 등) */
export function successTap() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

/** 경고/에러 피드백 (삭제 확인, 에러 등) */
export function warningTap() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
}
