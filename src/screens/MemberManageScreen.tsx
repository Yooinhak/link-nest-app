import React, { useState } from 'react';

import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AlertDialog from '../components/AlertDialog';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import { PlusIcon, TrashIcon } from '../components/icons';
import Input from '../components/Input';
import MemberRow from '../components/MemberRow';
import InviteSheet from '../components/sheets/InviteSheet';
import { useToast } from '../components/Toast';
import { colors, shadows } from '../constants/theme';
import { useGroup } from '../contexts/GroupContext';
import {
  useChangeMemberRole,
  useCreateInvite,
  useDeleteGroup,
  useGroupMembersQuery,
  useKickMember,
  useLeaveGroup,
} from '../hooks/queries/useGroups';
import { MainStackParamList } from '../navigation/types';
import { supabase } from '../utils/supabase/client';

/**
 * 멤버 관리 화면 — 시안 ⑤ (풀스크린).
 * 그룹 헤더 / MemberRow 리스트 / 친구 초대 / (owner) 링크 재설정·그룹 삭제 / (멤버) 나가기.
 */

type MemberManageRouteProp = RouteProp<MainStackParamList, 'MemberManage'>;
type Nav = NativeStackNavigationProp<MainStackParamList, 'MemberManage'>;

const DELETE_CONFIRMATION_TEXT = '삭제';

export default function MemberManageScreen() {
  const route = useRoute<MemberManageRouteProp>();
  const navigation = useNavigation<Nav>();
  const { groupId } = route.params;
  const { showToast } = useToast();

  const { groups, selectGroup, refetchGroups } = useGroup();
  const group = groups.find((g) => g.id === groupId) ?? null;
  const isOwner = group?.role === 'owner';

  const { data: members = [] } = useGroupMembersQuery(groupId);
  const changeRole = useChangeMemberRole(groupId);
  const kickMember = useKickMember(groupId);
  const createInvite = useCreateInvite(groupId);
  const deleteGroup = useDeleteGroup();
  const leaveGroup = useLeaveGroup();

  const [myUserId, setMyUserId] = useState<string | null>(null);
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyUserId(data.user?.id ?? null));
  }, []);

  const [inviteVisible, setInviteVisible] = useState(false);
  const [kickTarget, setKickTarget] = useState<string | null>(null);
  const [resetConfirmVisible, setResetConfirmVisible] = useState(false);
  const [leaveVisible, setLeaveVisible] = useState(false);
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const goHomeAfter = () => {
    refetchGroups();
    const personal = groups.find((g) => g.type === 'personal');
    if (personal) selectGroup(personal.id);
    navigation.goBack();
  };

  const handleResetInvite = () => {
    createInvite.mutate(
      { role: 'editor', revokeExisting: true },
      { onSuccess: () => showToast('success', '초대 링크가 재설정되었어요') },
    );
  };

  const canDelete = deleteConfirmText.trim() === DELETE_CONFIRMATION_TEXT && !deleteGroup.isPending;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 그룹 헤더 */}
        <View style={styles.groupCard}>
          <View style={styles.groupTile}>
            <Text style={styles.groupEmoji}>{group?.emoji ?? '📁'}</Text>
          </View>
          <View style={styles.groupInfo}>
            <Text style={styles.groupName} numberOfLines={1}>
              {group?.name ?? '그룹'}
            </Text>
            <Text style={styles.groupMeta}>멤버 {members.length}명</Text>
          </View>
        </View>

        {/* 멤버 리스트 */}
        <Text style={styles.sectionLabel}>멤버</Text>
        <View style={styles.card}>
          {members.map((m, i) => (
            <View key={m.userId}>
              {i > 0 && <View style={styles.divider} />}
              <MemberRow
                member={m}
                isMe={m.userId === myUserId}
                canManage={isOwner && m.userId !== myUserId}
                onChangeRole={(userId, role) => changeRole.mutate({ userId, role })}
                onKick={(userId) => setKickTarget(userId)}
              />
            </View>
          ))}
        </View>

        {/* 친구 초대 */}
        <TouchableOpacity
          style={styles.inviteBtn}
          onPress={() => setInviteVisible(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="친구 초대하기"
        >
          <PlusIcon size={18} color={colors.primary} strokeWidth={2.4} />
          <Text style={styles.inviteText}>친구 초대하기</Text>
        </TouchableOpacity>

        {/* 관리 섹션 */}
        <Text style={styles.sectionLabel}>관리</Text>
        <View style={styles.card}>
          {isOwner ? (
            <>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => setResetConfirmVisible(true)}
                activeOpacity={0.5}
                accessibilityRole="button"
              >
                <Text style={styles.menuLabel}>초대 링크 재설정</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => {
                  setDeleteConfirmText('');
                  setDeleteSheetVisible(true);
                }}
                activeOpacity={0.5}
                accessibilityRole="button"
              >
                <TrashIcon size={18} color={colors.danger} />
                <Text style={[styles.menuLabel, { color: colors.danger }]}>그룹 삭제</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => setLeaveVisible(true)}
              activeOpacity={0.5}
              accessibilityRole="button"
            >
              <Text style={[styles.menuLabel, { color: colors.danger }]}>그룹 나가기</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* 친구 초대 시트 */}
      <InviteSheet
        visible={inviteVisible}
        onClose={() => setInviteVisible(false)}
        groupId={groupId}
        groupName={group?.name ?? ''}
      />

      {/* 강퇴 확인 */}
      <AlertDialog
        visible={!!kickTarget}
        onClose={() => setKickTarget(null)}
        title="멤버를 내보낼까요?"
        description="내보낸 멤버는 초대 링크로 다시 참여할 수 있어요"
        confirmText="내보내기"
        onConfirm={() => {
          if (kickTarget) kickMember.mutate(kickTarget);
          setKickTarget(null);
        }}
        destructive
      />

      {/* 링크 재설정 확인 */}
      <AlertDialog
        visible={resetConfirmVisible}
        onClose={() => setResetConfirmVisible(false)}
        title="초대 링크를 재설정할까요?"
        description="기존에 공유한 링크는 더 이상 사용할 수 없어요"
        confirmText="재설정"
        onConfirm={handleResetInvite}
      />

      {/* 나가기 확인 */}
      <AlertDialog
        visible={leaveVisible}
        onClose={() => setLeaveVisible(false)}
        title="그룹에서 나갈까요?"
        description="다시 참여하려면 초대 링크가 필요해요"
        confirmText="나가기"
        onConfirm={() => {
          leaveGroup.mutate(groupId, { onSuccess: goHomeAfter });
        }}
        destructive
      />

      {/* 그룹 삭제 (2단계 확인) */}
      <BottomSheet
        visible={deleteSheetVisible}
        onClose={() => setDeleteSheetVisible(false)}
        title="그룹을 삭제할까요?"
        description={`그룹의 모든 폴더와 링크가 영구적으로 삭제되며, 복구할 수 없어요.\n계속하려면 아래에 "${DELETE_CONFIRMATION_TEXT}" 라고 입력해주세요.`}
      >
        <View style={styles.deleteBody}>
          <Input
            value={deleteConfirmText}
            onChangeText={setDeleteConfirmText}
            placeholder={DELETE_CONFIRMATION_TEXT}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.deleteBtns}>
            <Button variant="secondary" onPress={() => setDeleteSheetVisible(false)} style={{ flex: 1 }}>
              취소
            </Button>
            <Button
              variant="danger"
              disabled={!canDelete}
              loading={deleteGroup.isPending}
              onPress={() => {
                deleteGroup.mutate(groupId, {
                  onSuccess: () => {
                    setDeleteSheetVisible(false);
                    goHomeAfter();
                  },
                });
              }}
              style={{ flex: 1 }}
            >
              그룹 삭제
            </Button>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 60 },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    ...shadows.card,
  },
  groupTile: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupEmoji: { fontSize: 25 },
  groupInfo: { flex: 1, minWidth: 0, gap: 3 },
  groupName: { fontSize: 18, fontWeight: '700', color: colors.ink, letterSpacing: -0.36 },
  groupMeta: { fontSize: 13, fontWeight: '500', color: colors.textFaint },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textFaint,
    marginTop: 22,
    marginBottom: 9,
    marginLeft: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 16,
    ...shadows.card,
  },
  divider: { height: 1, backgroundColor: colors.divider },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primaryTint,
    marginTop: 16,
  },
  inviteText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  menuLabel: { fontSize: 15, fontWeight: '500', color: colors.text },
  deleteBody: { gap: 20, paddingBottom: 8 },
  deleteBtns: { flexDirection: 'row', gap: 11 },
});
