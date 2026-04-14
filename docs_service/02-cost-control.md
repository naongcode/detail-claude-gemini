# API 비용 통제 + 크레딧 시스템

## 현재 문제

파이프라인 1회 실행 예상 비용:

| 단계 | 모델 | 비고 | 예상 비용 |
|------|------|------|---------|
| 브리프 생성 | GPT-4o | in 1K + out 2K | ~$0.02 |
| 리서치 분석 | GPT-4o | in 3K + out 3K | ~$0.04 |
| HTML 설계 | Claude Opus | in 3K + **out 16K** | **~$1.25** |
| 이미지 생성 | Gemini × 8개 | 이미지 8장 | ~$0.32~$0.64 |
| **합계** | | | **$1.63~$1.95 ≈ ₩2,200~2,600/회** |

Claude Opus output 토큰($75/M)이 전체 비용의 약 70%를 차지한다.
Rate limiting 없음 → 인증된 사용자 1명이 반복 실행하면 시간당 수십 달러 소비 가능.

## 비용 절감 옵션: Claude 모델 교체

Sonnet으로 교체 시 output 비용이 $75→$15/M으로 **5배 저렴**.
HTML 품질 차이를 A/B 테스트 후 결정 권장.

| 모델 | output 단가 | HTML 설계 비용 | 파이프라인 합계 |
|------|------------|--------------|--------------|
| Claude Opus | $75/M | ~$1.25 | ~$1.63~1.95 ≈ ₩2,200~2,600 |
| Claude Sonnet | $15/M | ~$0.25 | ~$0.63~0.95 ≈ ₩850~1,300 |

## 수익 구조 (1크레딧 = ₩10,000)

| 모델 | API 원가 | 크레딧 판매가 | 마진 | 마진율 |
|------|---------|------------|------|-------|
| Claude Opus | ₩2,400 (평균) | ₩10,000 | ₩7,600 | **76%** |
| Claude Sonnet | ₩1,075 (평균) | ₩10,000 | ₩8,925 | **89%** |

두 모델 모두 ₩10,000 기준으로 건전한 마진. Opus를 써도 충분히 수익성 있음.

### 패키지 할인 구조

단건보다 묶음 구매를 유도해 선결제 현금을 확보.

| 패키지 | 크레딧 | 판매가 | 크레딧당 단가 | 할인율 | Opus 마진율 |
|--------|--------|--------|------------|-------|-----------|
| 단건 | 1 | ₩10,000 | ₩10,000 | — | 76% |
| 스탠다드 | 3 | ₩27,000 | ₩9,000 | 10% | 73% |
| 프로 | 10 | ₩80,000 | ₩8,000 | 20% | 70% |

- API 원가(Opus 평균) ₩2,400 기준
- 최저 마진(프로 10개): (₩8,000 - ₩2,400) / ₩8,000 = **70%** — 충분히 건전

### 재생성 수익

- 무료 재생성 5회 포함 (API 원가 총 ₩300~550, 크레딧에 포함된 비용으로 처리)
- 5회 소진 후 추가 재생성 5회 = **0.5크레딧 (₩5,000)**
  - 재생성 5회 API 원가: ₩300~550
  - 마진: ₩4,450~4,700 (마진율 89~94%)

### 가입 무료 크레딧

- **핸드폰 인증 완료 시** 1크레딧 무료 지급 (= 1회 무료 체험)
- 가입만으로는 지급하지 않음 — 중복 계정 어뷰징 방지
- 1인 1크레딧: 동일 번호로 재인증 시 추가 지급 없음
- 획득 원가: ₩2,400 (Opus 기준) — 신규 고객 유치 비용으로 처리

#### 카카오 인증 구현 (로그인 아님 — 크레딧 지급 전용)

로그인은 Google OAuth, 인증은 카카오 OAuth로 분리.
카카오는 계정 생성 시 핸드폰 인증 필수 → 카카오 계정 1개 = 핸드폰 1개 보장.
카카오 OAuth의 `phone_number` scope로 번호를 가져와 중복 확인 후 크레딧 지급.
**비용 무료.**

```
흐름:
1. 사용자가 "카카오로 인증하기" 버튼 클릭
2. 서버: 카카오 OAuth URL 생성 (state에 Supabase user_id 포함)
3. 카카오 인증 페이지 → 사용자 동의 (전화번호 제공)
4. 콜백: 카카오 code → 액세스 토큰 → phone_number 조회
5. 번호 SHA-256 해시 + 중복 확인
6. 최초 인증이면 크레딧 1개 지급
```

**환경변수 추가:**
```
KAKAO_REST_API_KEY=        # 카카오 앱 REST API 키
KAKAO_CLIENT_SECRET=       # 카카오 앱 시크릿 (선택)
NEXT_PUBLIC_BASE_URL=      # 콜백 URL 기준
```

```ts
// app/api/auth/kakao/start/route.ts
// 카카오 OAuth 시작 — 인증 URL로 리디렉트
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await requireAuth()

  const params = new URLSearchParams({
    client_id: process.env.KAKAO_REST_API_KEY!,
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/kakao/callback`,
    response_type: 'code',
    scope: 'phone_number',
    state: user.id,  // 콜백에서 user_id 복원
  })

  return NextResponse.redirect(
    `https://kauth.kakao.com/oauth/authorize?${params}`
  )
}
```

```ts
// app/api/auth/kakao/callback/route.ts
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('state')  // requireAuth 대신 state로 복원

  // 1. code → 액세스 토큰
  const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.KAKAO_REST_API_KEY!,
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/kakao/callback`,
      code: code!,
    }),
  })
  const { access_token } = await tokenRes.json()

  // 2. 액세스 토큰 → 사용자 정보 (phone_number)
  const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  const kakaoUser = await userRes.json()
  const phone: string = kakaoUser.kakao_account?.phone_number

  if (!phone) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/projects?verify=denied`)
  }

  // 3. 번호 해시 + 중복 확인 + 크레딧 지급
  const phoneHash = crypto.createHash('sha256').update(phone).digest('hex')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error } = await supabase.rpc('verify_phone_and_grant_credit', {
    p_user_id: userId,
    p_phone_hash: phoneHash,
  })

  const result = error?.message === 'ALREADY_USED' ? 'duplicate' : 'success'
  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_BASE_URL}/projects?verify=${result}`
  )
}
```

```sql
-- user_credits 테이블에 컬럼 추가
ALTER TABLE user_credits ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_credits ADD COLUMN phone_hash TEXT UNIQUE;
-- phone_hash UNIQUE 제약 → 동일 번호 중복 인증 원천 차단

CREATE OR REPLACE FUNCTION verify_phone_and_grant_credit(
  p_user_id UUID, p_phone_hash TEXT
) RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM user_credits WHERE phone_hash = p_phone_hash) THEN
    RAISE EXCEPTION 'ALREADY_USED';
  END IF;

  UPDATE user_credits
    SET phone_verified = true,
        phone_hash = p_phone_hash,
        balance = balance + 1,
        updated_at = now()
    WHERE user_id = p_user_id;

  INSERT INTO credit_transactions (user_id, delta, reason)
    VALUES (p_user_id, 1, 'kakao_verified_bonus');
END;
$$ LANGUAGE plpgsql;

## 크레딧 시스템 설계

### DB 스키마

```sql
-- 사용자별 크레딧 잔액
CREATE TABLE user_credits (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id),
  balance     INT NOT NULL DEFAULT 0,       -- 보유 크레딧 수
  used_total  INT NOT NULL DEFAULT 0,       -- 누적 사용량 (통계용)
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 크레딧 트랜잭션 로그
CREATE TABLE credit_transactions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id),
  delta       INT NOT NULL,                 -- 양수: 충전, 음수: 사용
  reason      TEXT,                         -- 'pipeline_run', 'purchase', 'signup_bonus'
  project_id  TEXT,                         -- 사용한 프로젝트 ID (nullable)
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 가입 시 무료 크레딧 지급 트리거
CREATE OR REPLACE FUNCTION grant_signup_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_credits (user_id, balance) VALUES (NEW.id, 3);
  INSERT INTO credit_transactions (user_id, delta, reason)
    VALUES (NEW.id, 3, 'signup_bonus');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION grant_signup_credits();
```

### 크레딧 차감 로직

```ts
// lib/credits.ts
import { createClient } from '@supabase/supabase-js'

const PIPELINE_COST = 1  // 파이프라인 1회 = 1크레딧

export async function deductCredit(userId: string, projectId: string): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 트랜잭션: 잔액 확인 + 차감 (동시성 안전)
  const { data, error } = await supabase.rpc('deduct_credit', {
    p_user_id: userId,
    p_project_id: projectId,
    p_cost: PIPELINE_COST,
  })

  if (error || !data) throw new Error('크레딧이 부족합니다.')
}

export async function getBalance(userId: string): Promise<number> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .single()
  return data?.balance ?? 0
}
```

```sql
-- 원자적 크레딧 차감 함수
CREATE OR REPLACE FUNCTION deduct_credit(
  p_user_id UUID, p_project_id TEXT, p_cost INT
) RETURNS BOOLEAN AS $$
DECLARE
  current_balance INT;
BEGIN
  SELECT balance INTO current_balance FROM user_credits WHERE user_id = p_user_id FOR UPDATE;
  IF current_balance < p_cost THEN RETURN FALSE; END IF;

  UPDATE user_credits
    SET balance = balance - p_cost, used_total = used_total + p_cost, updated_at = now()
    WHERE user_id = p_user_id;

  INSERT INTO credit_transactions (user_id, delta, reason, project_id)
    VALUES (p_user_id, -p_cost, 'pipeline_run', p_project_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### 파이프라인 라우트에 크레딧 체크 추가

```ts
// app/api/projects/[id]/generate/pipeline/route.ts 수정
import { requireAuth } from '@/lib/auth'
import { deductCredit } from '@/lib/credits'

export async function GET(_req: NextRequest, { params }: ...) {
  const user = await requireAuth()
  const { id } = await params

  // 크레딧 차감 먼저 (실패 시 즉시 거부)
  await deductCredit(user.id, id)

  // 이후 기존 파이프라인 로직...
}
```

## Rate Limiting

크레딧과 별개로, 짧은 시간 내 반복 요청도 차단해야 한다.

### Upstash Redis 활용 (Vercel 환경에 적합)

```bash
npm install @upstash/ratelimit @upstash/redis
```

```ts
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 h'),  // 1시간에 5회
  analytics: true,
})

export async function checkRateLimit(userId: string) {
  const { success, remaining } = await ratelimit.limit(userId)
  if (!success) {
    throw new Error(`요청 한도 초과. 잠시 후 다시 시도하세요.`)
  }
  return remaining
}
```

## 환경변수 추가

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## 크레딧 가격 설계

파이프라인 1회 API 원가: ₩2,200~2,600 (Opus 기준) / ₩850~1,300 (Sonnet 기준)

**Opus 기준 가격표 (최소 20% 마진 확보):**

| 패키지 | 크레딧 | 가격 | 크레딧당 단가 | 마진 |
|--------|--------|------|------------|------|
| 스타터 | 3 | ₩9,900 | ₩3,300 | ~21% |
| 스탠다드 | 10 | ₩29,900 | ₩2,990 | ~13% |
| 프로 | 30 | ₩79,900 | ₩2,663 | ~2% |

→ Opus 기준이면 마진이 너무 얇다. Sonnet 전환 시 마진 50%+ 확보 가능.

---

### [제안] 실측 원가 기반 가격 개편안 (2026-04-14)

실측 파이프라인 원가 (claude-opus-4-6 기준, 이미지 8개):

| 단계 | 모델 | 비용 |
|------|------|------|
| 브리프 + 리서치 | GPT-4o | ≈ $0.06 |
| HTML 설계 | claude-opus-4-6 ($5/$25 MTok) | ≈ $0.29 |
| 이미지 × 8 | gemini-3-pro-image-preview | ≈ $1.07 |
| **합계** | | **≈ $1.42 (≈ ₩2,000)** |

→ 참고: [anthropic-pricing.md](./anthropic-pricing.md)

**제안 판매가 (크레딧 = 프로젝트 1개 실행권):**

| 패키지 | 가격 | 개당 단가 | 할인율 | 원가 대비 마진율 |
|--------|------|-----------|--------|-----------------|
| 1개 | ₩20,000 | ₩20,000 | — | 90% |
| 3개 | ₩50,000 | ₩16,667 | 17% ↓ | 88% |
| 10개 | ₩150,000 | ₩15,000 | 25% ↓ | 87% |

- 인간 디자이너 상세페이지 단가: ₩200,000 이상 → AI 제품은 속도·가격 메리트로 포지셔닝
- 전 구간 마진 87% 이상 유지
- 10개 패키지: ₩150,000 / 15만원 선결제로 현금 흐름 확보

## 재생성 정책

섹션 재생성 1회 API 비용: Gemini 이미지 1장 = ~$0.04~0.08 ≈ ₩60~110

**정책: 크레딧을 소모한 프로젝트에서 무료 재생성 5회 제공**

- 파이프라인을 실행한 프로젝트에 한해 재생성 카운터 부여
- 5회 소진 후 추가 재생성 시 크레딧 0.5개 차감 (또는 추가 5회 = 0.5크레딧 구매)
- 재생성 횟수는 프로젝트별로 카운트 (사용자 전체가 아님)

### DB 스키마 추가

```sql
-- projects 테이블에 재생성 카운터 추가
ALTER TABLE projects ADD COLUMN regen_count INT NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN regen_limit INT NOT NULL DEFAULT 5;
-- 파이프라인 실행 시 regen_limit = 5로 초기화
-- 재생성 시 regen_count++ 후 regen_count > regen_limit이면 크레딧 차감
```

### 재생성 API에 카운터 체크 추가

```ts
// app/api/projects/[id]/generate/sections/route.ts
export async function POST(req: NextRequest, { params }) {
  const user = await requireAuth()
  const { id } = await params

  // 재생성 횟수 확인
  const project = await getProjectRow(id)
  if (project.regen_count >= project.regen_limit) {
    // 무료 횟수 소진 → 크레딧 차감
    await deductCredit(user.id, id, 0.5)
    await resetRegenCount(id)  // 카운터 리셋, 5회 추가 부여
  } else {
    await incrementRegenCount(id)  // regen_count++
  }

  // 기존 재생성 로직...
}
```

## 체크리스트

- [ ] Claude Sonnet vs Opus 품질 비교 테스트 후 모델 결정
- [x] `user_credits`, `credit_transactions` 테이블 생성 (`phone_verified`, `phone_hash` 컬럼 포함)
- [x] `deduct_credit`, `verify_phone_and_grant_credit` SQL 함수 작성
- [x] 가입 시 자동 크레딧 지급 트리거 제거 (핸드폰 인증 후 지급으로 변경)
- [x] `lib/credits.ts` 작성
- [ ] 카카오 디벨로퍼스에서 앱 생성 + `phone_number` scope 활성화
- [x] `app/api/auth/kakao/start/route.ts` 작성
- [x] `app/api/auth/kakao/callback/route.ts` 작성
- [x] 파이프라인 라우트에 크레딧 체크 적용
- [x] `projects` 테이블에 `regen_count`, `regen_limit` 컬럼 추가
- [x] 재생성 API에 카운터 체크 + 소진 시 크레딧 차감 적용
- [x] Upstash Redis rate limiting 적용
- [x] 프론트엔드에 잔여 크레딧 + 재생성 남은 횟수 표시
- [x] 인증 유도 배너 (미인증 사용자에게 "인증하면 1크레딧 무료" 노출)
- [x] 크레딧 부족 시 결제 유도 모달

### 추가 구현 (문서 외)
- [x] 파이프라인 중복 실행 방지 — `pipeline_locked_at` 컬럼 + 10분 타임아웃 (20260414000005_pipeline_lock.sql)
- [x] 크레딧 중복 차감 방지 — `is_project_charge` unique index로 DB 레벨 원자적 처리 (20260414000004_credit_dedup.sql)
- [x] 중지 시 현재 단계(GPT/Claude) 완료 후 중지 — `state.cancelled` 플래그 + ReadableStream cancel 콜백
- [x] 프로젝트 소유권 검증 — 브리프 생성 전 `user_id` 일치 확인
- [x] 차감 시점 보정 — GPT 성공 후에만 크레딧 차감 (실패 시 차감 없음)
