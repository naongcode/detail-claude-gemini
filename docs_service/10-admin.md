# 관리자 페이지

## 접근 제어

Supabase `profiles` 테이블에 `is_admin BOOLEAN` 컬럼으로 관리.
미들웨어에서 `/admin` 경로 접근 시 관리자 여부 확인.

## 페이지 구성 (`/admin`)

### 1. 개요 (Overview)
- 오늘 / 이번 달 총 API 비용 (USD)
- 오늘 / 이번 달 크레딧 수익 (결제 합계)
- 신규 가입자 수
- 파이프라인 실행 횟수 / 실패율

### 2. API 비용 추적
- provider별 (Claude, GPT-4o, Gemini) 일별 비용 테이블
- 프로젝트별 비용 상위 목록
- `api_cost_log` 테이블 기반

### 3. 사용자 관리
- 사용자 목록 (이메일, 가입일, 크레딧 잔액, 프로젝트 수)
- 크레딧 수동 지급/차감
- 관리자 권한 부여

### 4. 결제 내역
- 결제 트랜잭션 목록 (금액, 패키지, 시간)
- 월별 매출 합계

## DB 변경사항

```sql
-- profiles 테이블 (기존에 없으면 생성)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- api_cost_log 테이블
CREATE TABLE api_cost_log (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id),
  project_id    TEXT,
  provider      TEXT,      -- 'openai' | 'anthropic' | 'gemini'
  operation     TEXT,      -- 'brief' | 'research' | 'page_design' | 'image'
  input_tokens  INT,
  output_tokens INT,
  image_count   INT,
  cost_usd      NUMERIC(10, 6),
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

## 파일 구조

```
app/
  admin/
    layout.tsx          # 관리자 인증 체크
    page.tsx            # 개요
    users/page.tsx      # 사용자 관리
    costs/page.tsx      # API 비용
    payments/page.tsx   # 결제 내역

app/api/admin/
  stats/route.ts        # 개요 통계
  costs/route.ts        # 비용 집계
  users/route.ts        # 사용자 목록/크레딧 수정
  payments/route.ts     # 결제 내역

lib/
  cost-tracker.ts       # AI 호출마다 비용 기록
```

## 체크리스트

- [x] `api_cost_log` 테이블 마이그레이션
- [x] `profiles.is_admin` 컬럼 추가
- [x] `lib/cost-tracker.ts` 작성
- [x] 파이프라인·브리프 생성에 cost tracking 적용
- [x] `/admin` 레이아웃 (관리자 인증)
- [x] `/admin` 개요 페이지
- [x] `/admin/costs` API 비용 페이지
- [x] `/admin/users` 사용자 관리 페이지
- [ ] `/admin/payments` 결제 내역 페이지 (토스 연동 후)
