import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { runOnJS } from 'react-native-worklets';

import { colors } from '../constants/theme';
import { useDeferredDeletePost } from '../hooks/queries';
import { selectionTap, warningTap } from '../utils/haptics';
import { parseMetadata } from '../utils/parseMetadata';
import { queryKeys } from '../utils/react-query/queryKeys';

import AlertDialog from './AlertDialog';
import Skeleton from './Skeleton';

export type ViewMode = 'large' | 'compact';

export interface LinkPreviewCardHandle {
  close: () => void;
}

interface LinkPreviewCardProps {
  id: number;
  url: string;
  userDescription: string | null;
  folderId: string;
  viewMode?: ViewMode;
  onEditPress?: (id: number, description: string | null) => void;
  onSwipeStart?: (handle: LinkPreviewCardHandle) => void;
}

const RIGHT_ACTION_WIDTH = 80;
const SELECTION_THRESHOLD = 40;
const HAPTIC_RESET_THRESHOLD = 10;

const TrashIcon = () => (
  <Svg
    width={15}
    height={15}
    viewBox="0 0 24 24"
    fill="none"
    stroke={colors.gray[400]}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M3 6h18" />
    <Path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <Path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </Svg>
);

const PenIcon = () => (
  <Svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke={colors.gray[400]}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </Svg>
);

const SwipeTrashIcon = () => (
  <Svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke={colors.white}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M3 6h18" />
    <Path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <Path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </Svg>
);

export function LinkPreviewCardSkeleton({ viewMode = 'large' }: { viewMode?: ViewMode }) {
  if (viewMode === 'compact') {
    return (
      <View style={compactStyles.card}>
        <Skeleton width={56} height={56} borderRadius={10} />
        <View style={compactStyles.body}>
          <Skeleton width="70%" height={15} />
          <Skeleton width="50%" height={12} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Skeleton width="100%" height={160} borderRadius={12} />
      <View style={styles.body}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="100%" height={14} />
        <Skeleton width="50%" height={12} />
      </View>
    </View>
  );
}

// UI-thread worklet 으로 우측 삭제 액션을 렌더. translation 이 임계값을 처음 cross 할 때
// selectionTap 햅틱을 1회 발생시키고, 닫힘 근처로 돌아오면 다시 발사 가능 상태로 리셋한다.
// 스와이프 자체는 다이얼로그를 트리거하지 않으며, 사용자가 노출된 버튼을 탭해야 onPress 가 호출된다.
function RightAction({ translation, onPress }: { translation: SharedValue<number>; onPress: () => void }) {
  const hapticFired = useSharedValue(false);

  useAnimatedReaction(
    () => translation.value,
    (current) => {
      if (current <= -SELECTION_THRESHOLD && !hapticFired.value) {
        hapticFired.value = true;
        runOnJS(selectionTap)();
      } else if (current > -HAPTIC_RESET_THRESHOLD && hapticFired.value) {
        hapticFired.value = false;
      }
    },
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          translation.value,
          [-RIGHT_ACTION_WIDTH, 0],
          [0, RIGHT_ACTION_WIDTH],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Reanimated.View style={[swipeStyles.rightActionContainer, animatedStyle]}>
      <TouchableOpacity
        style={swipeStyles.rightAction}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="링크 삭제"
      >
        <SwipeTrashIcon />
        <Text style={swipeStyles.rightActionText}>삭제</Text>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

const LinkPreviewCard = forwardRef<LinkPreviewCardHandle, LinkPreviewCardProps>(function LinkPreviewCard(
  { id, url, userDescription, folderId, viewMode = 'large', onEditPress, onSwipeStart },
  ref,
) {
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const deferredDelete = useDeferredDeletePost(folderId);
  const swipeableRef = useRef<SwipeableMethods>(null);

  const handle = useMemo<LinkPreviewCardHandle>(() => ({ close: () => swipeableRef.current?.close() }), []);

  useImperativeHandle(ref, () => handle, [handle]);

  const { data: metadata, isLoading } = useQuery({
    queryKey: [queryKeys.METADATA, url],
    queryFn: () => parseMetadata(url),
    enabled: !!url,
  });

  // 사용자가 노출된 우측 삭제 버튼을 탭했을 때만 다이얼로그를 띄운다.
  // 스와이프 자체는 더 이상 다이얼로그 트리거가 아니다.
  const handleActionPress = useCallback(() => {
    setDeleteVisible(true);
  }, []);

  const renderRightActions = useCallback(
    (_progress: SharedValue<number>, translation: SharedValue<number>) => (
      <RightAction translation={translation} onPress={handleActionPress} />
    ),
    [handleActionPress],
  );

  // 드래그 시작 시점에 부모(FolderDetailScreen)에 자신의 핸들을 전달한다.
  // 부모는 이전에 열려 있던 카드를 닫아 'iOS Mail' 패턴의 단일 오픈 상태를 유지한다.
  const handleSwipeStartDrag = useCallback(() => {
    onSwipeStart?.(handle);
  }, [onSwipeStart, handle]);

  // 다이얼로그 취소/확인 후 모두 호출 — 스와이프 카드를 시각적으로 원위치로 돌려둔다.
  const handleDialogClose = useCallback(() => {
    setDeleteVisible(false);
    swipeableRef.current?.close();
  }, []);

  // 사용자가 '삭제'를 최종 확정한 시점에만 warning 햅틱을 발생시킨다.
  const handleDialogConfirm = useCallback(() => {
    warningTap();
    deferredDelete.execute(id);
  }, [deferredDelete, id]);

  const domain = (() => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  })();

  const cardContent =
    viewMode === 'compact' ? (
      <TouchableOpacity
        style={compactStyles.card}
        onPress={() => Linking.openURL(url)}
        activeOpacity={0.6}
        accessibilityRole="link"
        accessibilityLabel={`${metadata?.title || domain} 링크 열기`}
      >
        {/* Compact Thumbnail */}
        {isLoading ? (
          <Skeleton width={56} height={56} borderRadius={10} />
        ) : metadata?.image && !imageFailed ? (
          <Image
            source={{ uri: metadata.image }}
            style={compactStyles.thumbnail}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={compactStyles.thumbnailFallback}>
            <Text style={compactStyles.thumbnailFallbackText}>{domain.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        {/* Compact Content */}
        <View style={compactStyles.body}>
          {isLoading ? (
            <View style={{ gap: 6 }}>
              <Skeleton width="70%" height={15} />
              <Skeleton width="50%" height={12} />
            </View>
          ) : (
            <>
              <Text style={compactStyles.title} numberOfLines={1}>
                {metadata?.title || domain}
              </Text>
              <Text style={compactStyles.domain} numberOfLines={1}>
                {domain}
              </Text>
              {userDescription && (
                <Text style={compactStyles.memo} numberOfLines={1}>
                  {userDescription}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Action buttons */}
        <View style={compactStyles.actions}>
          {onEditPress && (
            <TouchableOpacity
              style={compactStyles.actionBtn}
              onPress={(e) => {
                e.stopPropagation();
                onEditPress(id, userDescription);
              }}
              activeOpacity={0.5}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="메모 수정"
            >
              <PenIcon />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={compactStyles.actionBtn}
            onPress={(e) => {
              e.stopPropagation();
              setDeleteVisible(true);
            }}
            activeOpacity={0.5}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="링크 삭제"
          >
            <TrashIcon />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity
        style={styles.card}
        onPress={() => Linking.openURL(url)}
        activeOpacity={0.6}
        accessibilityRole="link"
        accessibilityLabel={`${metadata?.title || domain} 링크 열기`}
      >
        {/* Thumbnail */}
        {isLoading ? (
          <Skeleton width="100%" height={160} borderRadius={12} />
        ) : metadata?.image && !imageFailed ? (
          <Image
            source={{ uri: metadata.image }}
            style={styles.thumbnail}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={styles.thumbnailFallback}>
            <Text style={styles.thumbnailFallbackText}>{domain.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.body}>
          {isLoading ? (
            <View style={{ gap: 8 }}>
              <Skeleton width="70%" height={16} />
              <Skeleton width="100%" height={14} />
            </View>
          ) : (
            <>
              <Text style={styles.title} numberOfLines={2}>
                {metadata?.title || domain}
              </Text>
              {!!metadata?.description && (
                <Text style={styles.description} numberOfLines={2}>
                  {metadata.description}
                </Text>
              )}
              <Text style={styles.domain}>{domain}</Text>
            </>
          )}

          {userDescription && (
            <View style={styles.memo}>
              <Text style={styles.memoText} numberOfLines={2}>
                {userDescription}
              </Text>
            </View>
          )}
        </View>

        {/* Top-right action buttons */}
        <View style={styles.topActions}>
          {onEditPress && (
            <TouchableOpacity
              style={styles.actionBtnOverlay}
              onPress={(e) => {
                e.stopPropagation();
                onEditPress(id, userDescription);
              }}
              activeOpacity={0.5}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="메모 수정"
            >
              <PenIcon />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionBtnOverlay}
            onPress={(e) => {
              e.stopPropagation();
              setDeleteVisible(true);
            }}
            activeOpacity={0.5}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="링크 삭제"
          >
            <TrashIcon />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );

  return (
    <>
      <ReanimatedSwipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        onSwipeableOpenStartDrag={handleSwipeStartDrag}
        friction={1.5}
        rightThreshold={40}
        overshootFriction={8}
        overshootRight={false}
      >
        {cardContent}
      </ReanimatedSwipeable>

      <AlertDialog
        visible={deleteVisible}
        onClose={handleDialogClose}
        title="링크를 삭제할까요?"
        description="삭제된 링크는 복구할 수 없어요"
        confirmText="삭제"
        onConfirm={handleDialogConfirm}
        destructive
      />
    </>
  );
});

const swipeStyles = StyleSheet.create({
  rightActionContainer: {
    width: RIGHT_ACTION_WIDTH,
    marginLeft: 8,
  },
  rightAction: {
    flex: 1,
    backgroundColor: colors.destructive,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
    marginTop: 4,
  },
});

const compactStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: colors.gray[100],
  },
  thumbnailFallback: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailFallbackText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[300],
  },
  body: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[900],
    letterSpacing: -0.3,
  },
  domain: {
    fontSize: 12,
    color: colors.gray[400],
  },
  memo: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 1,
  },
  actions: {
    gap: 6,
    alignItems: 'center',
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 160,
    backgroundColor: colors.gray[100],
  },
  thumbnailFallback: {
    width: '100%',
    height: 100,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailFallbackText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.gray[300],
  },
  body: {
    padding: 16,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    color: colors.gray[500],
    lineHeight: 20,
  },
  domain: {
    fontSize: 12,
    color: colors.gray[400],
    marginTop: 2,
  },
  memo: {
    backgroundColor: colors.blue[50],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  memoText: {
    fontSize: 13,
    color: colors.primary,
    lineHeight: 18,
    fontWeight: '500',
  },
  topActions: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnOverlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// B-5: FlatList 리렌더 최소화를 위해 memo 적용. props 가 같으면 재렌더 스킵.
// forwardRef + memo 조합으로 ref 도 정상 전달된다.
export default React.memo(LinkPreviewCard);
