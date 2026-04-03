import React, { useState } from 'react';
import { Animated, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Swipeable } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../constants/theme';
import { warningTap } from '../utils/haptics';
import { parseMetadata } from '../utils/parseMetadata';
import { queryKeys } from '../utils/react-query/queryKeys';
import { supabase } from '../utils/supabase/client';
import AlertDialog from './AlertDialog';
import Skeleton from './Skeleton';
import { useToast } from './Toast';

export type ViewMode = 'large' | 'compact';

interface LinkPreviewCardProps {
  id: number;
  url: string;
  userDescription: string | null;
  folderId: string;
  viewMode?: ViewMode;
  onEditPress?: (id: number, description: string | null) => void;
}

const TrashIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.gray[400]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 6h18" />
    <Path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <Path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </Svg>
);

const PenIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.gray[400]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </Svg>
);

const SwipeTrashIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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

function renderRightActions(progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) {
  const translateX = dragX.interpolate({
    inputRange: [-80, 0],
    outputRange: [0, 80],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[swipeStyles.rightAction, { transform: [{ translateX }] }]}>
      <SwipeTrashIcon />
      <Text style={swipeStyles.rightActionText}>삭제</Text>
    </Animated.View>
  );
}

export default function LinkPreviewCard({ id, url, userDescription, folderId, viewMode = 'large', onEditPress }: LinkPreviewCardProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const { data: metadata, isLoading } = useQuery({
    queryKey: [queryKeys.METADATA, url],
    queryFn: () => parseMetadata(url),
    enabled: !!url,
  });

  const handleDelete = async () => {
    // Optimistic Update: 즉시 UI에서 제거
    const queryKey = [queryKeys.POST_LIST, folderId];
    const previousPosts = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old?.data) return old;
      return { ...old, data: old.data.filter((p: any) => p.id !== id) };
    });

    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) {
      queryClient.setQueryData(queryKey, previousPosts);
      showToast('error', '링크 삭제에 실패했어요');
    } else {
      queryClient.invalidateQueries({ queryKey });
      showToast('success', '링크가 삭제되었어요');
    }
  };

  const handleSwipeOpen = () => {
    warningTap();
    setDeleteVisible(true);
  };

  const domain = (() => {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
  })();

  const cardContent = viewMode === 'compact' ? (
    <TouchableOpacity style={compactStyles.card} onPress={() => Linking.openURL(url)} activeOpacity={0.6}>
      {/* Compact Thumbnail */}
      {isLoading ? (
        <Skeleton width={56} height={56} borderRadius={10} />
      ) : metadata?.image && !imageFailed ? (
        <Image source={{ uri: metadata.image }} style={compactStyles.thumbnail} resizeMode="cover" onError={() => setImageFailed(true)} />
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
            <Text style={compactStyles.domain} numberOfLines={1}>{domain}</Text>
            {userDescription && (
              <Text style={compactStyles.memo} numberOfLines={1}>{userDescription}</Text>
            )}
          </>
        )}
      </View>

      {/* Action buttons */}
      <View style={compactStyles.actions}>
        {onEditPress && (
          <TouchableOpacity
            style={compactStyles.actionBtn}
            onPress={(e) => { e.stopPropagation(); onEditPress(id, userDescription); }}
            activeOpacity={0.5}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <PenIcon />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={compactStyles.actionBtn}
          onPress={(e) => { e.stopPropagation(); setDeleteVisible(true); }}
          activeOpacity={0.5}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <TrashIcon />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity style={styles.card} onPress={() => Linking.openURL(url)} activeOpacity={0.6}>
      {/* Thumbnail */}
      {isLoading ? (
        <Skeleton width="100%" height={160} borderRadius={12} />
      ) : metadata?.image && !imageFailed ? (
        <Image source={{ uri: metadata.image }} style={styles.thumbnail} resizeMode="cover" onError={() => setImageFailed(true)} />
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
            onPress={(e) => { e.stopPropagation(); onEditPress(id, userDescription); }}
            activeOpacity={0.5}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <PenIcon />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionBtnOverlay}
          onPress={(e) => { e.stopPropagation(); setDeleteVisible(true); }}
          activeOpacity={0.5}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <TrashIcon />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Swipeable
        renderRightActions={renderRightActions}
        onSwipeableOpen={handleSwipeOpen}
        overshootRight={false}
        friction={2}
      >
        {cardContent}
      </Swipeable>

      <AlertDialog
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        title="링크를 삭제할까요?"
        description="삭제된 링크는 복구할 수 없어요"
        confirmText="삭제"
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}

const swipeStyles = StyleSheet.create({
  rightAction: {
    backgroundColor: colors.destructive,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    marginLeft: 8,
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
