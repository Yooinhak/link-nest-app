import React, { useState } from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../constants/theme';
import { parseMetadata } from '../utils/parseMetadata';
import { queryKeys } from '../utils/react-query/queryKeys';
import { supabase } from '../utils/supabase/client';
import AlertDialog from './AlertDialog';
import Skeleton from './Skeleton';

interface LinkPreviewCardProps {
  id: number;
  url: string;
  userDescription: string | null;
  folderId: string;
}

const TrashIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.gray[400]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 6h18" />
    <Path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <Path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </Svg>
);

export function LinkPreviewCardSkeleton() {
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

export default function LinkPreviewCard({ id, url, userDescription, folderId }: LinkPreviewCardProps) {
  const queryClient = useQueryClient();
  const [deleteVisible, setDeleteVisible] = useState(false);

  const { data: metadata, isLoading } = useQuery({
    queryKey: [queryKeys.METADATA, url],
    queryFn: () => parseMetadata(url),
    enabled: !!url,
  });

  const handleDelete = async () => {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: [queryKeys.POST_LIST, folderId] });
    }
  };

  const domain = (() => {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
  })();

  return (
    <>
      <TouchableOpacity style={styles.card} onPress={() => Linking.openURL(url)} activeOpacity={0.6}>
        {/* Thumbnail */}
        {isLoading ? (
          <Skeleton width="100%" height={160} borderRadius={12} />
        ) : metadata?.image ? (
          <Image source={{ uri: metadata.image }} style={styles.thumbnail} resizeMode="cover" />
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

        {/* Delete button */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={(e) => {
            e.stopPropagation();
            setDeleteVisible(true);
          }}
          activeOpacity={0.5}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <TrashIcon />
        </TouchableOpacity>
      </TouchableOpacity>

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
  deleteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
