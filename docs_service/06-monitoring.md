# 에러 모니터링 + 관측성

## 현재 상태

- 에러 추적 없음 → 사용자가 오류를 겪어도 운영자가 알 방법 없음
- API 비용 추적 없음 → 월간 얼마가 나가는지 실시간 파악 불가
- 성능 측정 없음 → 어느 단계에서 느린지 모름

## 1. 에러 추적: Sentry

### 설치

```bash
npx @sentry/wizard@latest -i nextjs
```

### 핵심 설정

```ts
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% 트레이싱 (비용 절감)

  // 민감한 데이터 필터링
  beforeSend(event) {
    // API 키가 에러 메시지에 포함될 경우 제거
    if (event.message?.includes('API_KEY')) return null
    return event
  },
})
```

### 파이프라인 에러에 컨텍스트 추가

```ts
// lib/claude.ts
import * as Sentry from '@sentry/nextjs'

export async function generateDetailPage(brief, research) {
  return await Sentry.startSpan(
    { name: 'claude.generateDetailPage', op: 'ai' },
    async () => {
      try {
        // 기존 코드
      } catch (err) {
        Sentry.captureException(err, {
          tags: { stage: 'claude', product: brief.product_name },
          extra: { productCategory: brief.product_category },
        })
        throw err
      }
    }
  )
}
```

### 환경변수

```
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=detail-page-generator
SENTRY_AUTH_TOKEN=xxx  # 소스맵 업로드용
```

## 2. API 비용 추적

외부 API 비용을 DB에 기록해 월간 집계.

```sql
CREATE TABLE api_cost_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id),
  project_id  TEXT,
  provider    TEXT,    -- 'openai', 'anthropic', 'gemini'
  operation   TEXT,    -- 'brief', 'research', 'page_design', 'image'
  input_tokens  INT,
  output_tokens INT,
  cost_usd    NUMERIC(10, 6),
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

```ts
// lib/cost-tracker.ts
const PRICING = {
  openai: { input: 0.000005, output: 0.000015 },       // GPT-4o per token
  anthropic: { input: 0.000015, output: 0.000075 },    // Claude Opus per token
  gemini: { per_image: 0.04 },                         // Gemini image gen
}

export async function trackCost(params: {
  userId: string
  projectId: string
  provider: 'openai' | 'anthropic' | 'gemini'
  operation: string
  inputTokens?: number
  outputTokens?: number
}) {
  const p = PRICING[params.provider]
  let costUsd = 0
  if ('per_image' in p) {
    costUsd = p.per_image
  } else {
    costUsd = (params.inputTokens ?? 0) * p.input + (params.outputTokens ?? 0) * p.output
  }

  await supabase.from('api_cost_log').insert({
    user_id: params.userId,
    project_id: params.projectId,
    provider: params.provider,
    operation: params.operation,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    cost_usd: costUsd,
  })
}
```

Claude 호출 후 사용량 기록 예시:

```ts
// lib/claude.ts
const message = await client.messages.create({ ... })

await trackCost({
  userId,
  projectId,
  provider: 'anthropic',
  operation: 'page_design',
  inputTokens: message.usage.input_tokens,
  outputTokens: message.usage.output_tokens,
})
```

## 3. 분석: PostHog

사용자 행동 분석 (무료 플랜: 월 100만 이벤트).

```bash
npm install posthog-js posthog-node
```

```ts
// 추적할 핵심 이벤트
posthog.capture('pipeline_started', { projectId, category: brief.product_category })
posthog.capture('pipeline_completed', { projectId, duration_ms: elapsed, image_count: n })
posthog.capture('pipeline_failed', { projectId, stage, error_type })
posthog.capture('credit_purchased', { package: 'standard', credits: 30 })
```

**주요 퍼널:**
```
가입 → 프로젝트 생성 → 브리프 완성 → 파이프라인 실행 → 완료 → 다운로드
```

이 퍼널에서 이탈이 많은 단계 = 개선 우선순위.

## 4. Vercel Analytics

Next.js 프로젝트면 한 줄로 활성화:

```ts
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

## 5. 운영 알림

파이프라인 실패율이 급증하거나 비용이 임계치를 넘으면 알림.

```ts
// lib/alerts.ts — Slack Webhook 활용
export async function alertSlack(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  const color = { info: '#36a64f', warning: '#ffb347', error: '#e74c3c' }[level]
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [{ color, text: message, footer: new Date().toISOString() }],
    }),
  })
}

// 사용 예: 파이프라인 3회 연속 실패 시
await alertSlack(`파이프라인 실패 급증: ${failCount}회/시간`, 'error')
```

## 체크리스트

- [x] Sentry 설치 및 DSN 설정 (환경변수 입력 필요: NEXT_PUBLIC_SENTRY_DSN 등)
- [ ] 파이프라인 각 단계에 Sentry 스팬/에러 추가 (기본 에러 캐치는 자동)
- [x] `api_cost_log` 테이블 생성 (20260414000008 마이그레이션)
- [x] `lib/cost-tracker.ts` 작성 및 각 AI 호출에 적용 (brief/research/page_design/image)
- [ ] PostHog — 보류
- [x] Vercel Analytics + Speed Insights 활성화 (app/layout.tsx)
- [x] 알림 연동 — Discord (Sentry 통합)
- [x] API 비용 관리자 페이지에서 확인 (/admin/costs)
