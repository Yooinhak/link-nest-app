import React, { useEffect, useState } from 'react';

import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '../../constants/theme';
import { GroupRole, useActiveInviteQuery, useCreateInvite } from '../../hooks/queries/useGroups';
import { copyToClipboard, isClipboardAvailable } from '../../utils/clipboard';
import { lightTap } from '../../utils/haptics';
import { buildInviteMessage, buildInviteUrl } from '../../utils/inviteLink';
import BottomSheet from '../BottomSheet';
import { Share2Icon } from '../icons';
import { useToast } from '../Toast';

/**
 * 친구 초대 시트 — 시안 ③.
 * 역할 선택(함께 편집=기본 / 보기만) + 초대 링크 복사 + 시스템 공유.
 * "링크는 7일 동안, 최대 10명까지".
 */

interface InviteSheetProps {
  visible: boolean;
  onClose: () => void;
  groupId: string | null;
  groupName: string;
}

type InviteRole = Exclude<GroupRole, 'owner'>;

export default function InviteSheet({ visible, onClose, groupId, groupName }: InviteSheetProps) {
  const { showToast } = useToast();
  const [role, setRole] = useState<InviteRole>('editor');

  const { data: activeInvite, isLoading } = useActiveInviteQuery(visible ? groupId : null);
  const createInvite = useCreateInvite(groupId ?? '');

  // 유효한 초대가 없거나 역할이 다르면 새로 발급 (기존 링크는 무효화)
  useEffect(() => {
    if (!visible || !groupId || isLoading || createInvite.isPending) return;
    if (activeInvite && activeInvite.role === role) return;
    createInvite.mutate({ role, revokeExisting: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, groupId, isLoading, activeInvite?.role, role]);

  const token = activeInvite?.role === role ? activeInvite?.token : null;
  const url = token ? buildInviteUrl(token) : null;

  const handleCopy = async () => {
    if (!token) return;
    lightTap();
    if (isClipboardAvailable) {
      const ok = await copyToClipboard(buildInviteUrl(token));
      if (ok) {
        showToast('success', '링크가 복사되었어요');
        return;
      }
    }
    // 클립보드 모듈 미설치 폴백 → 시스템 공유 시트
    Share.share({ message: buildInviteMessage(groupName, token) });
  };

  const handleShare = () => {
    if (!token) return;
    lightTap();
    Share.share({ message: buildInviteMessage(groupName, token) });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="친구 초대"
      description={`'${groupName}' 그룹에 친구를 초대해요`}
    >
      {/* 역할 선택 */}
      <Text style={styles.sectionLabel}>권한</Text>
      <View style={styles.segment}>
        {(
          [
            { key: 'editor', label: '함께 편집' },
            { key: 'viewer', label: '보기만' },
          ] as { key: InviteRole; label: string }[]
        ).map((opt) => {
          const active = role === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              onPress={() => {
                lightTap();
                setRole(opt.key);
              }}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 초대 링크 */}
      <Text style={styles.sectionLabel}>초대 링크</Text>
      <View style={styles.linkBox}>
        <Text style={styles.linkText} numberOfLines={1}>
          {url ?? '링크 만드는 중...'}
        </Text>
        <TouchableOpacity
          style={[styles.copyBtn, !token && { opacity: 0.4 }]}
          onPress={handleCopy}
          disabled={!token}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="초대 링크 복사"
        >
          <Text style={styles.copyText}>복사</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>링크는 7일 동안, 최대 10명까지 사용할 수 있어요</Text>

      {/* 공유 */}
      <TouchableOpacity
        style={[styles.shareBtn, !token && { opacity: 0.4 }]}
        onPress={handleShare}
        disabled={!token}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="초대 링크 공유"
      >
        <Share2Icon size={17} color={colors.white} />
        <Text style={styles.shareText}>카카오톡·메시지로 공유하기</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 16,
    marginBottom: 8,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    borderRadius: 12,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: '#141E37',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textFaint,
  },
  segmentTextActive: {
    fontWeight: '600',
    color: colors.primary,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    backgroundColor: colors.fieldBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 8,
    gap: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSub,
  },
  copyBtn: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  hint: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textFaint,
    marginTop: 8,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    marginTop: 20,
    marginBottom: 8,
  },
  shareText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});
