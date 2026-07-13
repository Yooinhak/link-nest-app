import React, { useEffect, useMemo, useState } from 'react';

import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { BottomSheetTextInput, useBottomSheetInternal } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors } from '../constants/theme';
import { lightTap } from '../utils/haptics';

import { CheckIcon, SearchIcon, XIcon } from './icons';

/**
 * 폴더/그룹 공용 이모지 피커 — 의존성 없는 인앱 큐레이션 그리드.
 * - 최근 사용(AsyncStorage) + 추천 그리드 + 한글 검색 + "이모지 없음" + 직접 입력 fallback.
 * - 이모지는 선택 사항이므로 value=null 을 허용한다.
 */

const RECENT_EMOJI_KEY = 'moaring.recentEmojis';
const MAX_RECENT = 8;

/** 추천 이모지 — [이모지, 한글/영문 검색 키워드]. 폴더/링크 정리 맥락에 맞춘 큐레이션. */
const EMOJI_DATA: Array<[string, string]> = [
  // 자주 쓰는 정리/일반
  ['📁', '폴더 folder 파일'],
  ['📌', '핀 고정 중요 pin'],
  ['⭐', '별 즐겨찾기 중요 star favorite'],
  ['❤️', '하트 좋아요 사랑 heart love'],
  ['🔥', '불 인기 핫 fire hot'],
  ['✨', '반짝 새로움 sparkle new'],
  ['💡', '아이디어 전구 idea light'],
  ['✅', '체크 완료 done check'],
  ['🎯', '목표 타겟 goal target'],
  ['🚀', '로켓 시작 런칭 rocket launch'],
  // 일/공부
  ['💼', '일 업무 회사 work business'],
  ['📚', '책 공부 학습 book study'],
  ['📖', '독서 책 read book'],
  ['✏️', '연필 메모 쓰기 write pencil'],
  ['📝', '메모 노트 문서 note memo'],
  ['💻', '노트북 개발 컴퓨터 laptop code'],
  ['🖥️', '컴퓨터 데스크탑 desktop pc'],
  ['📊', '차트 그래프 분석 chart graph'],
  ['📈', '상승 성장 그래프 growth chart'],
  ['💰', '돈 재테크 money finance'],
  ['🧠', '두뇌 지식 아이디어 brain'],
  // 취미/생활
  ['🎬', '영화 비디오 movie film'],
  ['🎵', '음악 노래 music song'],
  ['🎮', '게임 game'],
  ['📷', '카메라 사진 camera photo'],
  ['🎨', '그림 디자인 예술 art design'],
  ['✈️', '비행기 여행 travel plane'],
  ['🗺️', '지도 여행 장소 map travel'],
  ['🏠', '집 홈 home house'],
  ['🍔', '음식 맛집 food burger'],
  ['🍜', '음식 라면 국수 food noodle'],
  ['☕', '커피 카페 coffee cafe'],
  ['🛒', '쇼핑 장바구니 shopping cart'],
  ['👕', '옷 패션 의류 fashion clothes'],
  ['🏃', '운동 달리기 헬스 exercise run'],
  ['🐶', '강아지 반려동물 dog pet'],
  ['🐱', '고양이 반려동물 cat pet'],
  ['🌱', '식물 새싹 성장 plant grow'],
  ['🎁', '선물 이벤트 gift present'],
  // 상태/분류
  ['🔖', '북마크 태그 bookmark tag'],
  ['🗂️', '분류 정리 서류 organize file'],
  ['📎', '클립 첨부 clip attach'],
  ['🔗', '링크 연결 link'],
  ['📥', '보관 받은 inbox save'],
  ['🕐', '나중에 시간 later time'],
  ['❓', '질문 궁금 question'],
  ['⚡', '빠름 번개 즐겨 fast bolt'],
  ['🌟', '반짝 하이라이트 star glow'],
  ['🎉', '축하 파티 celebrate party'],
  ['🌈', '무지개 다양 rainbow'],
  ['💎', '보석 소중 프리미엄 gem premium'],
];

interface EmojiPickerProps {
  /** 현재 선택된 이모지 (없으면 null). */
  value: string | null;
  /** 선택/해제 콜백. 해제 시 null. */
  onSelect: (emoji: string | null) => void;
  label?: string;
}

/** 최근 사용 이모지 앞에 추가 (중복 제거, 최대 MAX_RECENT). */
export async function pushRecentEmoji(emoji: string) {
  try {
    const raw = await AsyncStorage.getItem(RECENT_EMOJI_KEY);
    const prev: string[] = raw ? JSON.parse(raw) : [];
    const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(next));
  } catch {
    // 무시 — 최근 목록은 부가 기능
  }
}

export default function EmojiPicker({ value, onSelect, label = '이모지 (선택)' }: EmojiPickerProps) {
  const isInSheet = useBottomSheetInternal(true) != null;
  const InputComponent = isInSheet ? BottomSheetTextInput : TextInput;

  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_EMOJI_KEY)
      .then((raw) => {
        if (raw) setRecent(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EMOJI_DATA;
    return EMOJI_DATA.filter(([emoji, kw]) => emoji === q || kw.toLowerCase().includes(q));
  }, [query]);

  const handlePick = (emoji: string) => {
    lightTap();
    // 이미 선택된 이모지를 다시 누르면 해제
    onSelect(value === emoji ? null : emoji);
  };

  // 직접 입력: 마지막 이모지 문자만 반영 (시스템 이모지 키보드 지원)
  const handleDirectInput = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      onSelect(null);
      return;
    }
    onSelect([...trimmed].slice(-1).join(''));
  };

  const showRecentRow = recent.length > 0 && !query.trim();

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {value ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => {
              lightTap();
              onSelect(null);
            }}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel="이모지 없음"
          >
            <XIcon size={12} color={colors.textMuted} strokeWidth={2.5} />
            <Text style={styles.clearText}>이모지 없음</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 검색 + 직접 입력 */}
      <View style={styles.searchWrap}>
        <SearchIcon size={16} color={colors.textFaint} />
        <InputComponent
          style={styles.searchInput}
          placeholder="검색하거나 직접 입력해보세요"
          placeholderTextColor={colors.textDisabled}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={(e) => {
            const t = e.nativeEvent.text.trim();
            // 이모지를 직접 붙여넣거나 입력한 경우 그대로 반영
            if (t && !EMOJI_DATA.some(([, kw]) => kw.toLowerCase().includes(t.toLowerCase()))) {
              handleDirectInput(t);
              setQuery('');
            }
          }}
          autoCorrect={false}
          returnKeyType="done"
        />
      </View>

      {/* 선택된 이모지 미리보기 */}
      {value ? (
        <View style={styles.previewRow}>
          <View style={styles.previewTile}>
            <Text style={styles.previewEmoji}>{value}</Text>
          </View>
          <Text style={styles.previewText}>선택됨</Text>
        </View>
      ) : null}

      {/* 최근 사용 */}
      {showRecentRow ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>최근 사용</Text>
          <View style={styles.grid}>
            {recent.map((emoji) => (
              <EmojiCell key={`recent-${emoji}`} emoji={emoji} selected={value === emoji} onPress={() => handlePick(emoji)} />
            ))}
          </View>
        </View>
      ) : null}

      {/* 추천/검색 결과 */}
      <View style={styles.section}>
        {!query.trim() ? <Text style={styles.sectionLabel}>추천</Text> : null}
        {filtered.length > 0 ? (
          <View style={styles.grid}>
            {filtered.map(([emoji]) => (
              <EmojiCell key={emoji} emoji={emoji} selected={value === emoji} onPress={() => handlePick(emoji)} />
            ))}
          </View>
        ) : (
          <View style={styles.noResult}>
            <Text style={styles.noResultText}>검색 결과가 없어요. 위 칸에 이모지를 직접 입력해보세요.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function EmojiCell({ emoji, selected, onPress }: { emoji: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.cell, selected && styles.cellSelected]}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${emoji} 이모지`}
    >
      <Text style={styles.cellEmoji}>{emoji}</Text>
      {selected ? (
        <View style={styles.cellCheck}>
          <CheckIcon size={10} color={colors.white} strokeWidth={3} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20, gap: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 13, fontFamily: 'LINESeedKR-Bold', color: colors.textMuted },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 2, paddingHorizontal: 6 },
  clearText: { fontSize: 12, fontFamily: 'LINESeedKR-Bold', color: colors.textMuted },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.divider,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'LINESeedKR', color: colors.ink, padding: 0 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmoji: { fontSize: 22 },
  previewText: { fontSize: 13, fontFamily: 'LINESeedKR-Bold', color: colors.primaryDeep },
  section: { gap: 8 },
  sectionLabel: { fontSize: 12, fontFamily: 'LINESeedKR-Bold', color: colors.textFaint },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: { backgroundColor: colors.primaryTint, borderWidth: 2, borderColor: colors.primary },
  cellEmoji: { fontSize: 22 },
  cellCheck: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResult: { paddingVertical: 12 },
  noResultText: { fontSize: 13, fontFamily: 'LINESeedKR', color: colors.textFaint },
});
