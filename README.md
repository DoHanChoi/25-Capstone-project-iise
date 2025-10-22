# Reading Experience Platform (독서 여정 플랫폼)

책을 읽는 여정을 음악으로 기록하고 공유하는 웹 서비스

## 프로젝트 개요

독서 과정의 각 단계마다 AI가 음악을 생성하여, 완독 시 독서 경험 전체를 담은 플레이리스트가 자동으로 완성됩니다.

## 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Backend**: Supabase (Auth, Database, Storage)
- **AI**: GPT-4o-mini (음악 프롬프트), Mureka MCP (음악 생성)
- **State Management**: Zustand
- **Form**: React Hook Form + Zod

## 시작하기

### 1. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 값들을 설정하세요:

```bash
cp .env.example .env.local
```

필요한 API 키:
- **Supabase**: https://supabase.com/dashboard
- **OpenAI**: https://platform.openai.com/api-keys
- **Mureka**: Mureka API
- **Kakao** (선택): https://developers.kakao.com/

### 2. 패키지 설치

```bash
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 을 열어 확인하세요.

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 페이지 (로그인, 회원가입)
│   ├── (main)/            # 메인 페이지들
│   │   ├── journey/       # 독서 여정
│   │   ├── library/       # 내 책장
│   │   ├── feed/          # 게시판
│   │   └── my/            # 마이페이지
│   └── api/               # API Routes
│       ├── books/         # 도서 검색
│       ├── journeys/      # 독서 여정 관리
│       ├── music/         # 음악 생성
│       └── posts/         # 게시물 관리
├── components/            # React 컴포넌트
│   ├── ui/               # shadcn/ui 컴포넌트
│   ├── journey/          # 독서 여정 컴포넌트
│   ├── music/            # 음악 플레이어 컴포넌트
│   └── post/             # 게시물 컴포넌트
├── lib/                   # 라이브러리 및 유틸리티
│   ├── supabase/         # Supabase 클라이언트
│   └── openai/           # OpenAI 클라이언트
├── hooks/                 # Custom React Hooks
└── types/                 # TypeScript 타입 정의
```

## 개발 단계

**현재 상태**: Phase 11 (UI/UX 개선) 완료 ✅

**완료된 Phase**:
- ✅ Phase 0-10: 핵심 기능 완료 (인증, 도서 검색, 독서 여정, 음악 생성, 커뮤니티, 마이페이지)
- ✅ Phase 11: UI/UX 개선 (접근성, 반응형, 로딩/에러 UI)

**다음 단계**:
- [ ] Phase 12: 배포 및 모니터링
- [ ] Phase 13: 앨범 커버 생성 (DALL-E)

**주요 기능**:
- 📚 독서 여정 관리 (v0, vN, vFinal 음악 생성)
- 🎵 AI 음악 생성 (GPT-4o-mini + Mureka)
- 👥 커뮤니티 (게시판, 좋아요, 댓글, 스크랩)
- 📊 통계 및 분석 (마이페이지)
- ♿ 접근성 지원 (글씨 크기, 줄 간격 조절)
- 🧪 E2E 테스트 (Playwright)

자세한 개발 계획은 [execution_plan.md](./execution_plan.md)를 참고하세요.

## 문서

- [PRD (Product Requirements Document)](./PRD_instruction.md)
- [실행 계획](./execution_plan.md)

## 라이선스

MIT
