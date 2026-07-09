import React, { useState } from 'react';

import { StyleSheet, TextInput, View } from 'react-native';

import { colors, FolderColorKey } from '../../constants/theme';
import { useGroup } from '../../contexts/GroupContext';
import { useCreateGroup } from '../../hooks/queries/useGroups';
import BottomSheet from '../BottomSheet';
import Button from '../Button';
import ColorPicker from '../ColorPicker';
import Input from '../Input';
import { useToast } from '../Toast';

/**
 * 새 공유 그룹 시트 — 시안 ②.
 * 이모지 + 이름 + 컬러(6색). 생성 직후 친구 초대(③)로 자동 연결.
 */

interface CreateGroupSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 생성 성공 시 (초대 시트 자동 연결용) */
  onCreated: (group: { id: string; name: string }) => void;
}

export default function CreateGroupSheet({ visible, onClose, onCreated }: CreateGroupSheetProps) {
  const { showToast } = useToast();
  const { selectGroup, refetchGroups } = useGroup();
  const createGroup = useCreateGroup();

  const [emoji, setEmoji] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState<FolderColorKey>('blue');

  const reset = () => {
    setEmoji('');
    setName('');
    setColor('blue');
  };

  const handleCreate = () => {
    if (!name.trim()) {
      showToast('error', '그룹 이름을 입력해주세요');
      return;
    }
    createGroup.mutate(
      { name: name.trim(), emoji: emoji.trim() || null, color },
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
      title="새 공유 그룹"
      description="친구와 함께 링크를 모을 공간을 만들어요"
    >
      {/* 이모지 */}
      <View style={styles.emojiWrap}>
        <TextInput
          style={styles.emojiInput}
          value={emoji}
          onChangeText={(t) => setEmoji(t.slice(-2))}
          placeholder=""
          placeholderTextColor={colors.iconFaint}
          maxLength={2}
          accessibilityLabel="그룹 이모지"
        />
      </View>

      <Input placeholder="그룹 이름 (예: 제주 여행)" value={name} onChangeText={setName} autoFocus maxLength={30} />

      <ColorPicker selected={color} onSelect={setColor} label="그룹 색상" />

      <View style={styles.btns}>
        <Button variant="secondary" onPress={onClose} style={{ flex: 1 }}>
          닫기
        </Button>
        <Button onPress={handleCreate} loading={createGroup.isPending} style={{ flex: 1 }}>
          만들기
        </Button>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  emojiWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  emojiInput: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: colors.divider,
    textAlign: 'center',
    fontSize: 34,
  },
  btns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 26,
    marginBottom: 8,
  },
});
