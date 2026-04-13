import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import AlertDialog from '../components/AlertDialog';
import BottomSheet from '../components/BottomSheet';
import Skeleton from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { colors } from '../constants/theme';
import { EXTERNAL_URLS } from '../constants/urls';
import { queryKeys } from '../utils/react-query/queryKeys';
import { supabase } from '../utils/supabase/client';

const LogoutIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.destructive} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Path d="m16 17 5-5-5-5" />
    <Path d="M21 12H9" />
  </Svg>
);

const TrashIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.destructive} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 6h18" />
    <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <Path d="M10 11v6" />
    <Path d="M14 11v6" />
  </Svg>
);

const ShieldIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.gray[600]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </Svg>
);

const FileTextIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.gray[600]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <Path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <Path d="M10 9H8" />
    <Path d="M16 13H8" />
    <Path d="M16 17H8" />
  </Svg>
);

const ChevronRight = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.gray[400]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="m9 18 6-6-6-6" />
  </Svg>
);

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
      <Text style={styles.headerTitle}>설정</Text>

      <View style={styles.section}>
        <View style={styles.profileRow}>
          {isLoading ? (
            <Skeleton width={56} height={56} borderRadius={28} />
          ) : user?.user_metadata?.avatar_url ? (
            <Image source={{ uri: user.user_metadata.avatar_url }} style={styles.avatar} />
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
        <TouchableOpacity style={styles.menuRow} onPress={() => setLogoutVisible(true)} activeOpacity={0.5}>
          <LogoutIcon />
          <Text style={[styles.menuLabel, { color: colors.destructive }]}>로그아웃</Text>
          <ChevronRight />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.menuRow} onPress={openDeleteSheet} activeOpacity={0.5}>
          <TrashIcon />
          <Text style={[styles.menuLabel, { color: colors.destructive }]}>계정 삭제</Text>
          <ChevronRight />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => Linking.openURL(EXTERNAL_URLS.PRIVACY_POLICY)}
          activeOpacity={0.5}
        >
          <ShieldIcon />
          <Text style={[styles.menuLabel, { color: colors.gray[800] }]}>개인정보 처리방침</Text>
          <ChevronRight />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => Linking.openURL(EXTERNAL_URLS.TERMS_OF_SERVICE)}
          activeOpacity={0.5}
        >
          <FileTextIcon />
          <Text style={[styles.menuLabel, { color: colors.gray[800] }]}>이용약관</Text>
          <ChevronRight />
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
          <TextInput
            value={deleteConfirmText}
            onChangeText={setDeleteConfirmText}
            placeholder={DELETE_CONFIRMATION_TEXT}
            placeholderTextColor={colors.gray[400]}
            style={styles.deleteInput}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isDeleting}
          />
          <View style={styles.deleteButtonRow}>
            <TouchableOpacity
              style={[styles.deleteCancelButton, isDeleting && styles.buttonDisabled]}
              onPress={closeDeleteSheet}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteConfirmButton, !canDelete && styles.buttonDisabled]}
              onPress={handleDeleteAccount}
              disabled={!canDelete}
              activeOpacity={0.8}
            >
              {isDeleting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.deleteConfirmText}>계정 삭제</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.gray[900], letterSpacing: -0.5, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  section: { backgroundColor: colors.white, marginHorizontal: 20, borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  profileRow: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 24, fontWeight: '700', color: colors.white },
  profileInfo: { flex: 1, gap: 4 },
  name: { fontSize: 18, fontWeight: '700', color: colors.gray[900], letterSpacing: -0.3 },
  email: { fontSize: 14, color: colors.gray[500] },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 14 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  divider: { height: 1, backgroundColor: colors.gray[100], marginLeft: 54 },
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 13, color: colors.gray[400] },
  deleteBody: { paddingBottom: 16, gap: 16 },
  deleteInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.gray[900],
    backgroundColor: colors.gray[50],
  },
  deleteButtonRow: { flexDirection: 'row', gap: 12 },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteCancelText: { fontSize: 16, fontWeight: '600', color: colors.gray[700] },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: colors.destructive,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteConfirmText: { fontSize: 16, fontWeight: '700', color: colors.white },
  buttonDisabled: { opacity: 0.5 },
});
