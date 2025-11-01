# 음악 프롬프트 실험 가이드

> **대상**: 비개발자 팀원 (프롬프트 엔지니어링, 모델 비교, 성능 평가)
> **업데이트**: 2025-11-01

---

## 📋 빠른 시작

### 수정 파일

- **GPT 프롬프트**: `src/lib/openai/client.ts`
- **Mureka 설정**: `src/lib/mureka/client.ts`

### 가장 쉬운 실험

**Temperature 조정** (창의성 조절):
```typescript
// src/lib/openai/client.ts Line 139
temperature: 0.6,  // 현재 0.8 → 0.6 (더 일관적) 또는 1.0 (더 창의적)
```

### 결과 확인

1. **로컬 (http://localhost:3000)**:
   - 독서 여정 시작 → 음악 자동 재생
   - 하단 플레이어 바에서 음악 듣기
   - 음악 품질, 분위기, 템포 직접 평가

2. **Production (https://25-capstone-project-iise.vercel.app)**:
   - 실제 배포 환경에서 테스트
   - 플레이어 바에서 음악 재생 및 평가

3. **참고용 (선택)**:
   - Supabase → `music_tracks` 테이블
   - 생성된 프롬프트 원문 확인 가능

---

## 🎯 프롬프트 엔지니어링

### 1. v0 프롬프트 (여정 시작)

**위치**: `src/lib/openai/client.ts` **Line 52-62**

**주요 수정 가능 요소**:

| 요소 | 현재값 | 수정 예시 |
|------|--------|----------|
| 분위기 | "contemplative, anticipatory" | "peaceful, meditative" (차분) / "exciting, mysterious" (긴장) |
| 템포 | "70-90 BPM" | "50-70 BPM" (느림) / "90-110 BPM" (빠름) |
| 페이드 | "5-10 seconds" | "3-7 seconds" (짧음) / "10-15 seconds" (김) |

**예시**: 더 차분한 시작
```typescript
// Line 57
Create a peaceful, meditative mood that represents the start of a reading journey.
IMPORTANT:
- Start with a very soft, gradual introduction (first 10-15 seconds)
- Use a slow tempo (50-70 BPM) for deep contemplation
```

---

### 2. vN 프롬프트 (독서 중)

**위치**: `src/lib/openai/client.ts` **Line 104-129**

**주요 수정 가능 요소**:

| 요소 | 현재값 | 수정 예시 | 효과 |
|------|--------|----------|------|
| 컨텍스트 개수 | `.slice(-2)` (최근 2개) | `.slice(-3)` | 더 긴 컨텍스트 (비용↑) |
| 템포 범위 | `±10 BPM` | `±5 BPM` | 더 일관적 |
| | | `±15 BPM` | 더 자유로운 변화 |

**예시**: 더 일관적인 템포
```typescript
// Line 126
- Keep tempo within ${prevTempo - 5} to ${prevTempo + 5} BPM for very smooth transitions
```

---

### 3. vFinal 프롬프트 (완독 피날레)

**위치**: `src/lib/openai/client.ts` **Line 69-96**

**주요 수정 가능 요소**:

| 요소 | 현재값 | 수정 예시 |
|------|--------|----------|
| 피날레 스타일 | "conclusive, synthesizing" | "epic, cinematic, dramatic" (장엄) |
| 아웃트로 길이 | "15-20 seconds" | "20-30 seconds" (더 긴 여운) |
| 템포 범위 | `±15 BPM` | `±20 BPM` (더 극적) |

**예시**: 더 장엄한 피날레
```typescript
// Line 91
Create an epic, cinematic finale that dramatically concludes the entire reading journey.
IMPORTANT:
- Build to a grand crescendo with orchestral elements
- Include an extended, triumphant outro (20-30 seconds) with gradual fade-out
```

---

### 4. System Prompt (공통 설정)

**위치**: `src/lib/openai/client.ts` **Line 34-46, 139**

**Temperature** (창의성 조절):

| 값 | 특징 | 추천 상황 |
|----|------|----------|
| 0.3-0.6 | 일관적, 예측 가능 | 장르 일관성 중요 |
| 0.8 (현재) | 균형 잡힌 창의성 | 일반적 사용 ✓ |
| 0.9-1.0 | 매우 창의적 | 실험적 음악 |

**크로스페이드 규칙 강화**:
```typescript
// Line 38
1. Maintain strict tempo consistency (±5 BPM variation between tracks)  // ±10-15 → ±5
```

---

## ⚙️ GPT-4o-mini 설정

### 모델 파라미터

**위치**: `src/lib/openai/client.ts` **Line 132-140**

| 파라미터 | 현재값 | 조정 가능 | 효과 |
|---------|--------|----------|------|
| `model` | `gpt-4o-mini` | `gpt-4o` | 품질 10-20%↑, 비용 16배↑ |
| `temperature` | `0.8` | `0.0 ~ 1.0` | 창의성 조절 |

### 비용 정보

**GPT-4o-mini** (현재 사용):
- 트랙당 비용: **$0.001 ~ $0.003**
- v0 ~500 토큰, vN ~800 토큰, vFinal ~2000 토큰

**GPT-4o** (업그레이드):
- 트랙당 비용: **$0.01 ~ $0.03** (16배 비쌈)
- 권장: 중요 프로젝트만 사용

---

## 🎵 Mureka API 파라미터

### 현재 상태

✅ **완전 구현됨** - 실제 음악 생성 가능

### 폴링 설정

**위치**: `src/lib/mureka/client.ts` **Line 173-176**

```typescript
const maxAttempts = 60;       // 최대 시도 횟수
const pollInterval = 5000;    // 5초마다 확인
```

| 설정 | 현재값 | 조정 범위 | 효과 |
|------|--------|----------|------|
| `maxAttempts` | 60 | 40 ~ 80 | 최대 대기 시간 (60 = 5분) |
| `pollInterval` | 5000ms | 3000 ~ 10000 | 폴링 빈도 |

**예시**: 더 빠른 폴링
```typescript
// Line 173-174
const maxAttempts = 80;
const pollInterval = 3000;  // 5초 → 3초
```

### 비용 정보

- 트랙당 비용: **$0.10 ~ $0.50** (추정)
- 생성 시간: **30초 ~ 2분**
- **총 비용** (GPT + Mureka): **~$0.10 ~ $0.15** / 트랙

---

## 🔬 모델 비교 실험

### 1. GPT-4o-mini vs GPT-4o

**실험 방법**:
```typescript
// Line 133 수정
model: 'gpt-4o',  // gpt-4o-mini → gpt-4o
```

**평가 기준**:
- 프롬프트 상세도
- 음악 용어 전문성
- 감정 반영도
- 크로스페이드 최적화

**예상 결과**: 품질 10-20%↑, 비용 16배↑

---

### 2. Temperature 비교

**실험 설정**:

| Temperature | 테스트 수 | 측정 항목 |
|-------------|----------|----------|
| 0.3 | 3개 | 프롬프트 다양성, 템포 일관성 |
| 0.6 | 3개 | |
| 0.8 (현재) | 3개 | |
| 1.0 | 3개 | |

**측정**:
- 프롬프트 다양성: 같은 입력에 대해 얼마나 다른 결과?
- 템포 일관성: 이전 트랙과 BPM 차이
- 장르 호환성: 크로스페이드 가능 여부

---

### 3. 컨텍스트 길이 비교

| 설정 | 코드 | 토큰 사용 | 비용 |
|------|------|----------|------|
| 최근 1개 | `.slice(-1)` | ~600 | 낮음 |
| 최근 2개 (현재) | `.slice(-2)` | ~800 | 적정 ✓ |
| 최근 3개 | `.slice(-3)` | ~1000 | 높음 |

**권장**: 최근 2개 (현재 설정 유지)

---

## ✅ 성능 평가 체크리스트

### 프롬프트 품질

- [ ] **템포 일관성**: v0 (70-90), vN (±10), vFinal (±15) BPM
- [ ] **장르 호환성**: 크로스페이드 가능한 조합?
- [ ] **페이드 명시**: "fade-in/out" 키워드 포함?
- [ ] **분위기 적합성**: 사용자 감정 반영?

### 생성 효율성

| 항목 | 목표 | 현재 상태 |
|------|------|----------|
| GPT 응답 시간 | < 5초 | 평균 2-5초 ✓ |
| Mureka 생성 시간 | < 2분 | 평균 30초-2분 ✓ |
| 비용 | < $0.15/트랙 | ~$0.10-$0.12 ✓ |

### 음악 품질 평가 (청취 기반)

**평가 항목** (http://localhost:3000에서 직접 들으며 평가):

1. **분위기 적합성**:
   - 감정 태그와 음악 무드가 일치하는지?
   - 책의 장르/분위기와 어울리는지?

2. **템포 자연스러움**:
   - 독서 리듬과 음악 템포가 맞는지?
   - 너무 빠르거나 느리지 않은지?

3. **크로스페이드 품질**:
   - 플레이리스트 "전체 재생" 버튼 클릭
   - 트랙 전환 시 끊김 없이 부드러운지?
   - 음량이 일정하게 유지되는지?

4. **전체적 완성도**:
   - 독서 여정 전체를 음악으로 잘 표현했는지?
   - vFinal 피날레가 감동적인지?

---

## 📝 실험 시나리오

### 시나리오 1: 더 차분한 음악

```typescript
// v0 (Line 57)
Create a peaceful, meditative mood...
- Use a slow tempo (50-70 BPM) for deep contemplation

// Temperature (Line 139)
temperature: 0.6,  // 0.8 → 0.6
```

---

### 시나리오 2: 더 극적인 피날레

```typescript
// vFinal (Line 91)
Create an epic, cinematic finale...
- Build to a grand crescendo with orchestral elements
- Include an extended outro (20-30 seconds)
```

---

### 시나리오 3: 크로스페이드 최적화

```typescript
// System Prompt (Line 38)
1. Maintain strict tempo consistency (±5 BPM variation)  // ±10-15 → ±5

// vN (Line 126)
- Keep tempo within ${prevTempo - 5} to ${prevTempo + 5} BPM
```

---

## 🧪 테스트 프로세스

### 로컬 테스트

```bash
# 1. 개발 서버 시작
npm run dev

# 2. 브라우저 접속
http://localhost:3000
```

**음악 평가 방법**:
1. 독서 여정 시작 (책 선택)
2. 기록 추가 (인용구, 감정 입력)
3. 하단 **음악 플레이어 바**에서 자동 재생
4. 음악을 들으며 직접 평가:
   - 분위기가 감정과 잘 맞는지?
   - 템포가 적절한지?
   - 장르가 책과 어울리는지?
   - 크로스페이드가 부드러운지?
5. 여러 기록 추가 후 **전체 재생** 버튼으로 플레이리스트 테스트

### Production 테스트

1. Git Push → Vercel 자동 배포 대기 (~2-3분)
2. https://25-capstone-project-iise.vercel.app 접속
3. 로컬과 동일하게 여정 생성 및 음악 재생
4. 실제 사용자 환경에서 음악 품질 평가

---

## 🔧 환경 변수

### .env.local

```bash
# 필수
OPENAI_API_KEY=sk-proj-...
MUREKA_API_KEY=mk-...

# 선택 (기본값 사용 가능)
MUREKA_TIMEOUT_SECONDS=300  # 5분
```

### Vercel 배포

**Settings → Environment Variables**:
- `OPENAI_API_KEY` 추가
- `MUREKA_API_KEY` 추가
- Redeploy

---

## ❓ FAQ

**Q1: 프롬프트가 너무 짧아요**
→ Temperature 높이기: `0.8` → `0.9`

**Q2: 음악이 급격하게 변해요**
→ BPM 범위 좁히기: `±10` → `±5`

**Q3: 비용이 걱정돼요**
→ gpt-4o-mini 유지 + 컨텍스트 2개로 제한

**Q4: 생성이 너무 보수적이에요**
→ Temperature 높이기: `0.8` → `1.0`

**Q5: Mureka 생성 실패**
→ `.env.local`에서 `MUREKA_API_KEY` 확인

**Q6: Temperature 변경했는데 결과가 똑같아요**
→ 서버 재시작 (`npm run dev`) + 브라우저 캐시 삭제 (Ctrl+Shift+R)

**Q7: 특정 장르만 계속 나와요**
→ Temperature 높이기 + v0 프롬프트에 장르 범위 추가

---

## 📚 참고 자료

### 내부 문서

- [음악 생성 API 가이드](./music-generation-api-guide.md) - 개발자용 상세 가이드
- [CLAUDE.md](../CLAUDE.md) - 프로젝트 전체 개요

### 외부 문서

- [OpenAI Chat API](https://platform.openai.com/docs/api-reference/chat)
- [Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/GainNode)

---

**마지막 업데이트**: 2025-11-01
