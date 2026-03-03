<div align="center">

# 🪺 Link Nest

**즐겨찾는 공유 링크를 모두 모아둘 수 있는 아늑한 장소**

<br />

[![React Native](https://img.shields.io/badge/React_Native-0.83-61DAFB?logo=react&logoColor=white)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_55-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_&_DB-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

<br />

## 📖 소개

**Link Nest**는 웹에서 발견한 유용한 링크를 폴더별로 정리하고, 자동 미리보기로 한눈에 관리할 수 있는 모바일 앱입니다.

흩어져 있는 북마크, 메신저로 공유받은 링크, 나중에 볼 아티클까지 — Link Nest 하나로 깔끔하게 정리하세요.

<br />

## ✨ 주요 기능

### 🔐 소셜 로그인
- Google, Kakao OAuth를 통한 간편 로그인
- Supabase Auth 기반의 안전한 세션 관리

### 📁 폴더 관리
- 폴더 생성 / 이름 변경 / 삭제
- 직관적인 컨텍스트 메뉴로 빠른 조작
- 폴더별 링크 분류 및 정리

### 🔗 링크 저장 & 미리보기
- URL 입력만으로 자동 메타데이터 추출 (제목, 설명, 썸네일)
- Microlink API를 활용한 고품질 링크 프리뷰
- 개인 메모 추가 기능
- 원탭으로 브라우저에서 열기

### 👤 프로필 & 설정
- OAuth 프로필 자동 연동 (아바타, 이름, 이메일)
- 로그아웃

<br />

## 🛠 기술 스택

| 분류 | 기술 |
|------|------|
| **Framework** | React Native + Expo SDK 55 |
| **Language** | TypeScript 5.9 |
| **Navigation** | React Navigation (Bottom Tabs + Native Stack) |
| **Backend** | Supabase (Auth, PostgreSQL) |
| **State Management** | TanStack React Query v5 |
| **Styling** | NativeWind (TailwindCSS) + StyleSheet |
| **Auth** | Supabase OAuth (Google, Kakao) + expo-web-browser |
| **Link Preview** | Microlink API + HTML Meta Parser (Fallback) |

<br />

## 📂 프로젝트 구조

```
src/
├── components/          # 재사용 UI 컴포넌트
│   ├── AlertDialog.tsx     # 확인/취소 다이얼로그
│   ├── BottomSheet.tsx     # 바텀시트 모달
│   ├── Button.tsx          # 버튼 (primary/secondary/ghost/danger)
│   ├── ContextMenu.tsx     # 컨텍스트 팝업 메뉴
│   ├── Input.tsx           # 텍스트 입력 필드
│   ├── LinkPreviewCard.tsx # 링크 프리뷰 카드
│   └── Skeleton.tsx        # 로딩 스켈레톤
│
├── screens/             # 스크린 (페이지)
│   ├── LoginScreen.tsx     # 소셜 로그인
│   ├── HomeScreen.tsx      # 폴더 목록 (메인)
│   ├── FolderDetailScreen.tsx # 폴더 내 링크 목록
│   └── ProfileScreen.tsx   # 설정 & 프로필
│
├── navigation/          # 네비게이션 설정
│   ├── RootNavigator.tsx   # 인증 상태 기반 분기
│   ├── MainStack.tsx       # 메인 스택 (탭 + 상세)
│   ├── TabNavigator.tsx    # 하단 탭 (홈, 설정)
│   └── types.ts            # 네비게이션 타입 정의
│
├── hooks/               # 커스텀 훅
│   └── useAuth.ts          # 인증 상태 관리
│
├── utils/               # 유틸리티
│   ├── parseMetadata.ts    # URL 메타데이터 파싱
│   ├── supabase/           # Supabase 클라이언트 & 타입
│   └── react-query/        # React Query 설정 & 쿼리 키
│
└── constants/           # 상수
    └── theme.ts            # 컬러 팔레트 & 디자인 토큰
```

<br />

## 🚀 시작하기

### 사전 요구사항

- Node.js 18+
- Expo CLI
- iOS Simulator 또는 Android Emulator (또는 Expo Go 앱)

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/your-username/link-nest-app.git
cd link-nest-app

# 의존성 설치
npm install

# 개발 서버 시작
npx expo start
```

### 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성합니다:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase 설정

1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. `folders`, `posts` 테이블 생성
3. Authentication > URL Configuration에 리다이렉트 URL 추가:
   - `link-nest-app://auth/callback`
   - `exp://localhost:8081/--/auth/callback` (개발용)
4. Google, Kakao OAuth Provider 활성화

<br />

## 🗄 데이터베이스 스키마

```sql
-- 폴더 테이블
CREATE TABLE folders (
  id        SERIAL PRIMARY KEY,
  user_id   UUID REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  name      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 링크(포스트) 테이블
CREATE TABLE posts (
  id          SERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users DEFAULT auth.uid(),
  folder_id   INTEGER REFERENCES folders(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS 정책 (Row Level Security)
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own folders"
  ON folders FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own posts"
  ON posts FOR ALL USING (auth.uid() = user_id);
```

<br />

## 🎨 디자인 시스템

Toss 앱에서 영감을 받은 깔끔하고 미니멀한 디자인을 적용했습니다.

| 토큰 | 값 | 용도 |
|------|-----|------|
| `Primary` | `#3182F6` | 주요 액션, 링크, 강조 |
| `Background` | `#F4F5F7` | 화면 배경 |
| `Card` | `#FFFFFF` | 카드, 섹션 배경 |
| `Destructive` | `#F04452` | 삭제, 경고 |
| `Gray 900` | `#191F28` | 제목 텍스트 |
| `Gray 500` | `#8B95A1` | 보조 텍스트 |

**컴포넌트 특징:**
- 라운드 코너 (12~28px) 기반 카드 UI
- 하단 시트(Bottom Sheet)를 활용한 폼 입력
- Floating Action Button (FAB)으로 빠른 링크 추가
- 부드러운 애니메이션과 적절한 터치 피드백

<br />

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.
