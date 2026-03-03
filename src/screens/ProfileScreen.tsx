import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import Skeleton from '../components/Skeleton';
import { colors } from '../constants/theme';
import { queryKeys } from '../utils/react-query/queryKeys';
import { supabase } from '../utils/supabase/client';

const LogoutIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.destructive} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Path d="m16 17 5-5-5-5" />
    <Path d="M21 12H9" />
  </Svg>
);

const ChevronRight = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.gray[400]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="m9 18 6-6-6-6" />
  </Svg>
);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  const { data: user, isLoading } = useQuery({
    queryKey: [queryKeys.USER_PROFILE],
    queryFn: async () => await supabase.auth.getUser(),
    select: (data) => data.data.user,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

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
        <TouchableOpacity style={styles.menuRow} onPress={handleSignOut} activeOpacity={0.5}>
          <LogoutIcon />
          <Text style={[styles.menuLabel, { color: colors.destructive }]}>로그아웃</Text>
          <ChevronRight />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Link Nest v1.0.0</Text>
      </View>
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
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 13, color: colors.gray[400] },
});
