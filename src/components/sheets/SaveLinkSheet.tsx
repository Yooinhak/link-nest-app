import React, { useEffect, useMemo, useState } from 'react';

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, getFolderColor, typo } from '../../constants/theme';
import { useGroup } from '../../contexts/GroupContext';
import { useAllFoldersQuery, useCreatePost } from '../../hooks/queries';
import { lightTap } from '../../utils/haptics';
import { isValidUrl } from '../../utils/validateUrl';
import BottomSheet from '../BottomSheet';
import Button from '../Button';
import { CheckIcon, FolderIcon, LockIcon } from '../icons';
import Input from '../Input';
import { useToast } from '../Toast';

/**
 * 저장 위치 선택 시트 — 블루 글래스 시안 09.
 * RECENT(최근 저장 폴더) → 그룹별 섹션(나의 서랍 먼저) → 선택 링 → "여기에 저장".
 * viewer 그룹은 섹션 라벨에 '보기 전용' 뱃지 + 행 잠금(자물쇠, 흐림).
 *
 * 두 진입점 공용:
 *  - 공유 인텐트: initialUrl 전달 → URL 표시만
 *  - 플로팅 탭바 ＋: initialUrl 없음 → URL 입력 필드 노출
 */

const RECENT_FOLDER_KEY = 'linkle.recentFolderId';

interface SaveLinkSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 공유 인텐트로 받은 URL (없으면 직접 입력 모드) */
  initialUrl?: string | null;
}

type AnyFolder = {
  id: number;
  name: string;
  color: string | null;
  group: { id: string; name: string; emoji: string | null; type: string } | null;
};

export default function SaveLinkSheet({ visible, onClose, initialUrl = null }: SaveLinkSheetProps) {
  const { showToast } = useToast();
  const { groups } = useGroup();
  const createPost = useCreatePost();

  const { data: allFolders } = useAllFoldersQuery(visible);
  const [url, setUrl] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [recentFolderId, setRecentFolderId] = useState<number | null>(null);

  // 시트가 열릴 때마다 초기화 + 최근 폴더 로드
  useEffect(() => {
    if (!visible) return;
    setUrl(initialUrl ?? '');
    setSelectedId(null);
    AsyncStorage.getItem(RECENT_FOLDER_KEY).then((v) => setRecentFolderId(v ? Number(v) : null));
  }, [visible, initialUrl]);

  const roleByGroup = useMemo(() => new Map(groups.map((g) => [g.id, g.role])), [groups]);

  const sections = useMemo(() => {
    const list = (allFolders ?? []) as unknown as AnyFolder[];
    const byGroup = new Map<string, { name: string; emoji: string | null; type: string; folders: AnyFolder[] }>();
    for (const f of list) {
      if (!f.group) continue;
      const entry = byGroup.get(f.group.id) ?? {
        name: f.group.name,
        emoji: f.group.emoji,
        type: f.group.type,
        folders: [],
      };
      entry.folders.push(f);
      byGroup.set(f.group.id, entry);
    }
    return [...byGroup.entries()]
      .map(([id, v]) => ({ id, ...v, viewer: roleByGroup.get(id) === 'viewer' }))
      .sort((a, b) => (a.type === b.type ? 0 : a.type === 'personal' ? -1 : 1));
  }, [allFolders, roleByGroup]);

  const recentFolder = useMemo(() => {
    if (!recentFolderId || !allFolders) return null;
    const list = allFolders as unknown as AnyFolder[];
    const f = list.find((x) => x.id === recentFolderId);
    return f && roleByGroup.get(f.group?.id ?? '') !== 'viewer' ? f : null;
  }, [recentFolderId, allFolders, roleByGroup]);

  const trimmedUrl = url.trim();
  const canSave = !!selectedId && !!trimmedUrl && !createPost.isPending;

  const handleSave = () => {
    if (!selectedId) return;
    if (!isValidUrl(trimmedUrl)) {
      showToast('error', '올바른 URL 형식이 아니에요 (https://...)');
      return;
    }
    createPost.mutate(
      { url: trimmedUrl, description: null, folder_id: selectedId },
      {
        onSuccess: () => {
          AsyncStorage.setItem(RECENT_FOLDER_KEY, String(selectedId)).catch(() => {});
          showToast('success', '링크를 저장했어요');
          onClose();
        },
      },
    );
  };

  const selectFolder = (id: number, locked: boolean) => {
    if (locked) {
      showToast('error', '보기 전용 그룹이에요');
      return;
    }
    lightTap();
    setSelectedId(id);
  };

  const hasFolders = sections.some((s) => s.folders.length > 0);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="어디에 저장할까요?">
      {/* 직접 입력 모드: URL 필드 / 공유 모드: 받은 링크 표시 */}
      {initialUrl ? (
        <Text style={styles.sharedUrl} numberOfLines={1}>
          🔗 {initialUrl}
        </Text>
      ) : (
        <View style={styles.urlField}>
          <Input
            placeholder="https:// 링크를 붙여넣어주세요"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
            autoFocus
          />
        </View>
      )}

      {hasFolders ? (
        <>
          {recentFolder && (
            <>
              <Text style={styles.capsLabel}>RECENT</Text>
              <FolderPickRow
                folder={recentFolder}
                subtitle={
                  recentFolder.group
                    ? `${recentFolder.group.type === 'personal' ? '🏠 나의 서랍' : `${recentFolder.group.emoji ?? '📁'} ${recentFolder.group.name}`}`
                    : undefined
                }
                selected={selectedId === recentFolder.id}
                locked={false}
                recent
                onPress={() => selectFolder(recentFolder.id, false)}
              />
            </>
          )}

          {sections.map((section) => (
            <View key={section.id}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionEmoji}>{section.type === 'personal' ? '🏠' : (section.emoji ?? '📁')}</Text>
                <Text style={styles.sectionName}>{section.type === 'personal' ? '나의 서랍' : section.name}</Text>
                {section.viewer && (
                  <View style={styles.viewerBadge}>
                    <Text style={styles.viewerBadgeText}>보기 전용</Text>
                  </View>
                )}
              </View>
              {section.folders.map((f) => (
                <FolderPickRow
                  key={f.id}
                  folder={f}
                  selected={selectedId === f.id}
                  locked={section.viewer}
                  onPress={() => selectFolder(f.id, section.viewer)}
                />
              ))}
            </View>
          ))}

          <Button
            onPress={handleSave}
            loading={createPost.isPending}
            disabled={!canSave}
            style={styles.saveBtn}
          >
            여기에 저장
          </Button>
        </>
      ) : (
        <Text style={styles.emptyText}>아직 폴더가 없어요. 홈에서 먼저 폴더를 만들어주세요.</Text>
      )}
    </BottomSheet>
  );
}

function FolderPickRow({
  folder,
  subtitle,
  selected,
  locked,
  recent = false,
  onPress,
}: {
  folder: AnyFolder;
  subtitle?: string;
  selected: boolean;
  locked: boolean;
  recent?: boolean;
  onPress: () => void;
}) {
  const fc = getFolderColor(folder.color);
  return (
    <TouchableOpacity
      style={[
        styles.row,
        recent && styles.rowRecent,
        selected && styles.rowSelected,
        locked && { opacity: 0.45 },
      ]}
      onPress={onPress}
      activeOpacity={locked ? 1 : 0.65}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: locked }}
      accessibilityLabel={locked ? `${folder.name} — 보기 전용` : `${folder.name}에 저장`}
    >
      <View style={[styles.rowTile, { backgroundColor: fc.bg }]}>
        <FolderIcon size={17} color={fc.icon} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {folder.name}
        </Text>
        {subtitle && (
          <Text style={styles.rowSub} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {locked ? (
        <LockIcon size={15} color={colors.textFaint} />
      ) : (
        selected && <CheckIcon size={18} color={colors.primary} strokeWidth={2.6} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sharedUrl: {
    fontSize: 13,
    fontFamily: 'LINESeedKR',
    color: colors.textSub,
    backgroundColor: colors.divider,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginTop: 4,
    overflow: 'hidden',
  },
  urlField: {
    marginTop: 4,
  },
  capsLabel: {
    ...typo.sectionLabel,
    color: colors.textDisabled,
    marginTop: 15,
    marginBottom: 6,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 15,
    marginBottom: 6,
  },
  sectionEmoji: {
    fontSize: 13,
  },
  sectionName: {
    fontSize: 12,
    fontFamily: 'LINESeedKR-Bold',
    color: colors.textMuted,
  },
  viewerBadge: {
    backgroundColor: colors.divider,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  viewerBadgeText: {
    fontSize: 10,
    fontFamily: 'LINESeedKR-Bold',
    color: colors.textFaint,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 13,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  rowRecent: {
    backgroundColor: colors.fieldBg,
    borderRadius: 14,
  },
  rowSelected: {
    backgroundColor: colors.primaryTint,
    // inset ring 근사 — RN 은 box-shadow inset 미지원
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 7.5,
    paddingHorizontal: 10.5,
  },
  rowTile: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  rowName: {
    fontSize: 14,
    fontFamily: 'LINESeedKR-Bold',
    color: colors.ink,
  },
  rowSub: {
    fontSize: 11,
    fontFamily: 'LINESeedKR',
    color: colors.textDisabled,
  },
  saveBtn: {
    marginTop: 18,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'LINESeedKR',
    color: colors.textFaint,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
