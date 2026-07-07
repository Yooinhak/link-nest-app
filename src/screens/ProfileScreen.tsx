import React, { useState } from 'react';

import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AlertDialog from '../components/AlertDialog';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import {
  ChevronRightIcon,
  FileTextIcon,
  LogOutIcon,
  ShieldIcon,
  TrashIcon,
} from '../components/icons';
import Input from '../components/Input';
import Skeleton from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { colors, shadows } from '../constants/theme';
import { EXTERNAL_URLS } from '../constants/urls';
import { queryKeys } from '../utils/react-query/queryKeys';
import { supabase } from '../utils/supabase/client';

// 계정 삭제를 최종 확정시키기 위해 사용자가 반드시 타이핑해야 하는 문구.
// 실수로 삭제가 일어나는 것을 방지하기 위한 2단계 확인의 핵심 장치.
const DELETE_CONFIRMATION_TEXT = '삭제';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: [queryKeys.USER_PROFILE],
    queryFn: async () => await supabase.auth.getUser(),
    select: (data) => data.data.user,
  });

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast('error', '로그아웃에 실패했어요');
    }
  };

  const openDeleteSheet = () => {
    setDeleteConfirmText('');
    setDeleteSheetVisible(true);
  };

  const closeDeleteSheet = () => {
    if (isDeleting) return;
    setDeleteSheetVisible(false);
    setDeleteConfirmText('');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== DELETE_CONFIRMATION_TEXT) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        step?: string;
        error?: string;
      }>('delete-account', { method: 'POST' });

      if (error || !data?.success) {
        const message = data?.error ?? error?.message ?? '계정 삭제에 실패했어요';
        showToast('error', message);
        setIsDeleting(false);
        return;
      }

      // 성공: 서버에서 auth.users가 제거되어 현재 JWT는 무효 상태.
      // 로컬 세션/캐시를 정리하면 RootNavigator가 Login으로 전환한다.
      await supabase.auth.signOut();
      setDeleteSheetVisible(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : '계정 삭제에 실패했어요';
      showToast('error', message);
      setIsDeleting(false);
    }
  };

  const canDelete =
    deleteConfirmText.trim() === DELETE_CONFIRMATION_TEXT && !isDeleting;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.headerTitle} accessibilityRole="header">설정</Text>

      <View style={styles.section}>
        <View style={styles.profileRow}>
          {isLoading ? (
            <Skeleton width={56} height={56} borderRadius={28} />
          ) : user?.user_metadata?.avatar_url ? (
            <Image
              source={{ uri: user.user_metadata.avatar_url }}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarLetter}>{user?.email?.charAt(0).toUpperCase() ?? '?'}</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            {isLoading ? (
              <Skeleton width={160} height={18} />
            ) : (
              <>
                <Text style={styles.name} numberOfLines={1}>
                  {user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? ''}
                </Text>
                <Text style={styles.email} numberOfLines={1}>{user?.email ?? ''}</Text>
              </>
            )}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuRow} onPress={() => setLogoutVisible(true)} activeOpacity={0.5} accessibilityRole="button" accessibilityLabel="로그아웃">
          <LogOutIcon size={20} color={colors.danger} />
          <Text style={[styles.menuLabel, { color: colors.danger }]}>로그아웃</Text>
          <ChevronRightIcon size={16} color={colors.iconFaint} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.menuRow} onPress={openDeleteSheet} activeOpacity={0.5} accessibilityRole="button" accessibilityLabel="계정 삭제">
          <TrashIcon size={20} color={colors.danger} />
          <Text style={[styles.menuLabel, { color: colors.danger }]}>계정 삭제</Text>
          <ChevronRightIcon size={16} color={colors.iconFaint} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => Linking.openURL(EXTERNAL_URLS.PRIVACY_POLICY)}
          activeOpacity={0.5}
          accessibilityRole="link"
          accessibilityLabel="개인정보 처리방침"
        >
          <ShieldIcon size={20} color={colors.textMuted} />
          <Text style={[styles.menuLabel, { color: colors.text }]}>개인정보 처리방침</Text>
          <ChevronRightIcon size={16} color={colors.iconFaint} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => Linking.openURL(EXTERNAL_URLS.TERMS_OF_SERVICE)}
          activeOpacity={0.5}
          accessibilityRole="link"
          accessibilityLabel="이용약관"
        >
          <FileTextIcon size={20} color={colors.textMuted} />
          <Text style={[styles.menuLabel, { color: colors.text }]}>이용약관</Text>
          <ChevronRightIcon size={16} color={colors.iconFaint} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Link Nest v1.0.0</Text>
      </View>

      <AlertDialog
        visible={logoutVisible}
        onClose={() => setLogoutVisible(false)}
        title="로그아웃 할까요?"
        description="다시 로그인하면 데이터는 그대로 유지돼요"
        confirmText="로그아웃"
        onConfirm={handleSignOut}
        destructive
      />

      <BottomSheet
        visible={deleteSheetVisible}
        onClose={closeDeleteSheet}
        title="계정을 삭제할까요?"
        description={`저장한 모든 폴더와 링크가 영구적으로 삭제되며, 복구할 수 없어요.\n계속하려면 아래에 "${DELETE_CONFIRMATION_TEXT}" 라고 입력해주세요.`}
      >
        <View style={styles.deleteBody}>
          <Input
            value={deleteConfirmText}
            onChangeText={setDeleteConfirmText}
            placeholder={DELETE_CONFIRMATION_TEXT}
            style={styles.deleteInput}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isDeleting}
          />
          <View style={styles.deleteButtonRow}>
            <Button
              variant="secondary"
              onPress={closeDeleteSheet}
              disabled={isDeleting}
              style={{ flex: 1 }}
              accessibilityLabel="취소"
            >
              취소
            </Button>
            <Button
              variant="danger"
              onPress={handleDeleteAccount}
              disabled={!canDelete}
              loading={isDeleting}
              style={{ flex: 1 }}
              accessibilityLabel="계정 삭제 확인"
            >
              계정 삭제
            </Button>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -1.04, // -0.04em
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
  },
  // 시안 06: 카드 그룹 — radius 18 + 은은한 그림자 (overflow hidden 은 iOS 그림자를 죽여 제거)
  section: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    borderRadius: 18,
    marginBottom: 14,
    ...shadows.card,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 24, fontWeight: '700', color: colors.white },
  profileInfo: { flex: 1, gap: 3 },
  name: { fontSize: 18, fontWeight: '700', color: colors.ink, letterSpacing: -0.36 }, // -0.02em
  email: { fontSize: 14, fontWeight: '500', color: colors.textFaint },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  divider: { height: 1, backgroundColor: colors.divider, marginLeft: 52 },
  footer: { alignItems: 'center', marginTop: 26 },
  footerText: { fontSize: 13, fontWeight: '500', color: colors.textDisabled },
  deleteBody: { paddingBottom: 16, gap: 20 },
  // 시안 07: "삭제" 입력 필드 — fieldBg + border
  deleteInput: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    fontWeight: '500',
    color: colors.ink,
    backgroundColor: colors.fieldBg,
  },
  deleteButtonRow: { flexDirection: 'row', gap: 11 },
});
