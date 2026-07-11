import React, { useState } from 'react';

import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { colors, typo } from '../../constants/theme';
import { useGroup } from '../../contexts/GroupContext';
import { useCreateGroup } from '../../hooks/queries/useGroups';
import { lightTap } from '../../utils/haptics';
import BottomSheet from '../BottomSheet';
import Button from '../Button';
import { UsersIcon } from '../icons';
import Input from '../Input';
import { useToast } from '../Toast';

/**
 * 새 그룹 만들기 시트 — 블루 글래스 시안 03.
 * EMOJI 프리셋 타일(+직접 입력) + NAME + 안내 박스. 생성 직후 친구 초대(04)로 자동 연결.
 * (시안 규칙 "액센트 파랑 단일"에 따라 그룹 컬러 피커는 제거 — 기본 blue 저장)
 */

interface CreateGroupSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 생성 성공 시 (초대 시트 자동 연결용) */
  onCreated: (group: { id: string; name: string }) => void;
}

/** 시안 03 프리셋 이모지 + 각 타일의 파스텔 배경 */
const EMOJI_PRESETS = [
  { emoji: '🍊', bg: '#FFF3E4' },
  { emoji: '✈️', bg: '#EFECFF' },
  { emoji: '🍜', bg: '#FFF7ED' },
  { emoji: '🎬', bg: '#FDF2F8' },
  { emoji: '💜', bg: '#F3EEFF' },
] as const;

export default function CreateGroupSheet({ visible, onClose, onCreated }: CreateGroupSheetProps) {
  const { showToast } = useToast();
  const { selectGroup, refetchGroups } = useGroup();
  const createGroup = useCreateGroup();

  const [emoji, setEmoji] = useState('🍊');
  const [customEmoji, setCustomEmoji] = useState('');
  const [name, setName] = useState('');

  const isCustomSelected = !!customEmoji && emoji === customEmoji;

  const reset = () => {
    setEmoji('🍊');
    setCustomEmoji('');
    setName('');
  };

  const handleCreate = () => {
    if (!name.trim()) {
      showToast('error', '그룹 이름을 입력해주세요');
      return;
    }
    createGroup.mutate(
      { name: name.trim(), emoji: emoji.trim() || null, color: 'blue' },
      {
        onSuccess: (group) => {
          showToast('success', '그룹이 만들어졌어요');
          refetchGroups();
          selectGroup(group.id);
          reset();
          onClose();
          onCreated({ id: group.id, name: group.name });
        },
      },
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="새 그룹 만들기"
      description="친구와 함께 링크를 모을 공간이에요"
    >
      {/* EMOJI 프리셋 */}
      <Text style={styles.capsLabel}>EMOJI</Text>
      <View style={styles.emojiRow}>
        {EMOJI_PRESETS.map((p) => {
          const active = emoji === p.emoji;
          return (
            <TouchableOpacity
              key={p.emoji}
              style={[styles.emojiTile, { backgroundColor: active ? p.bg : colors.divider }, active && styles.emojiTileActive]}
              onPress={() => {
                lightTap();
                setEmoji(p.emoji);
              }}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${p.emoji} 이모지`}
            >
              <Text style={styles.emojiText}>{p.emoji}</Text>
            </TouchableOpacity>
          );
        })}
        {/* 직접 입력 타일 */}
        <View style={[styles.emojiTile, { backgroundColor: colors.divider }, isCustomSelected && styles.emojiTileActive]}>
          <TextInput
            style={styles.emojiInput}
            value={customEmoji}
            onChangeText={(t) => {
              const e = t.slice(-2);
              setCustomEmoji(e);
              if (e) setEmoji(e);
            }}
            placeholder="＋"
            placeholderTextColor={colors.textFaint}
            maxLength={2}
            accessibilityLabel="이모지 직접 입력"
          />
        </View>
      </View>

      {/* NAME */}
      <Text style={styles.capsLabel}>NAME</Text>
      <Input placeholder="그룹 이름 (예: 제주 여행)" value={name} onChangeText={setName} maxLength={30} />

      {/* 안내 박스 */}
      <View style={styles.infoBox}>
        <UsersIcon size={15} color={colors.primary} />
        <Text style={styles.infoText}>만들면 바로 친구를 초대할 수 있어요</Text>
      </View>

      <View style={styles.btns}>
        <Button variant="secondary" onPress={onClose} style={{ flex: 1 }}>
          닫기
        </Button>
        <Button onPress={handleCreate} loading={createGroup.isPending} style={{ flex: 1.4 }}>
          만들기
        </Button>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  capsLabel: {
    ...typo.sectionLabel,
    marginTop: 18,
    marginBottom: 9,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 9,
  },
  emojiTile: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiTileActive: {
    borderWidth: 2.5,
    borderColor: colors.primary,
    ...{
      shadowColor: '#8B7EF2',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 14,
      elevation: 3,
    },
  },
  emojiText: {
    fontSize: 22,
  },
  emojiInput: {
    width: 46,
    height: 46,
    textAlign: 'center',
    fontSize: 20,
    padding: 0,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryTint,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginTop: 16,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'LINESeedKR',
    color: colors.primary,
  },
  btns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 8,
  },
});
