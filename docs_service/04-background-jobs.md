# 백그라운드 잡 큐

## 현재 문제

파이프라인이 단일 HTTP 요청 안에서 동기 실행된다.

```
브라우저 → GET /api/projects/[id]/generate/pipeline (SSE)
              ↓ Claude 30~60초
              ↓ Gemini × 7~10개 = 최대 300초
              ↓ Puppeteer 렌더링
           응답 완료
```

**문제점:**
1. Vercel 함수 최대 실행 시간 300초 → 이미지 10개 × 30초 = 아슬아슬하게 넘을 수 있음
2. 브라우저 탭을 닫거나 네트워크가 끊기면 파이프라인 중단됨
3. 실패 시 재시도 로직 없음 (중간 단계부터 재개 불가)
4. 여러 사용자가 동시에 실행하면 외부 API rate limit 집중 도달

## 권장 솔루션: Inngest

Vercel 환경에 최적화된 백그라운드 잡 서비스. Next.js App Router 공식 지원.

```bash
npm install inngest
```

### 흐름 변경

```
현재: 브라우저 → HTTP 요청 → 동기 실행 (최대 300초)

변경: 브라우저 → HTTP 요청 → Inngest 이벤트 발행 → 즉시 202 응답
                                      ↓
                               Inngest 서버에서 비동기 실행
                               (각 스텝 최대 2시간, 자동 재시도)
                                      ↓
                               완료 시 Supabase 업데이트
                                      ↓
                               프론트엔드 폴링 또는 Realtime으로 완료 감지
```

### 설정

```ts
// lib/inngest.ts
import { Inngest } from 'inngest'

export const inngest = new Inngest({ id: 'detail-page-generator' })
```

```ts
// inngest/functions/pipeline.ts
import { inngest } from '@/lib/inngest'
import { generateResearch } from '@/lib/openai-pipeline'
import { generateDetailPage } from '@/lib/claude'
import { generateSectionImage } from '@/lib/gemini'
import { saveProjectData, loadProjectData } from '@/lib/projects'
import { renderFinalPage } from '@/lib/renderer'

export const runPipeline = inngest.createFunction(
  {
    id: 'run-pipeline',
    retries: 2,
    concurrency: { limit: 3 },  // 동시 실행 최대 3개
  },
  { event: 'pipeline/run' },

  async ({ event, step }) => {
    const { projectId, userId } = event.data

    // 각 step은 독립적으로 재시도 가능
    const brief = await step.run('load-brief', () =>
      loadProjectData(projectId, 'brief')
    )

    const research = await step.run('generate-research', () =>
      generateResearch(brief)
    )
    await step.run('save-research', () =>
      saveProjectData(projectId, 'research', research)
    )

    const pageDesign = await step.run('generate-page', () =>
      generateDetailPage(brief, research)
    )
    await step.run('save-page-design', () =>
      saveProjectData(projectId, 'page_design', pageDesign)
    )

    // 이미지 병렬 생성 (최대 3개씩)
    for (const img of pageDesign.images) {
      await step.run(`generate-image-${img.id}`, async () => {
        const buffer = await generateSectionImage(img.prompt, img.width, img.height)
        await uploadSection(projectId, img.id, buffer)
      })
    }

    await step.run('render-final', () =>
      renderFinalPage(projectId)
    )

    return { success: true }
  }
)
```

```ts
// app/api/inngest/route.ts
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { runPipeline } from '@/inngest/functions/pipeline'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runPipeline],
})
```

### 파이프라인 트리거 변경

```ts
// app/api/projects/[id]/generate/pipeline/route.ts — 수정
import { inngest } from '@/lib/inngest'
import { requireAuth } from '@/lib/auth'
import { deductCredit } from '@/lib/credits'

export async function POST(req: NextRequest, { params }) {
  const user = await requireAuth()
  const { id } = await params

  await deductCredit(user.id, id)

  // 동기 실행 대신 이벤트 발행
  await inngest.send({
    name: 'pipeline/run',
    data: { projectId: id, userId: user.id },
  })

  return NextResponse.json({ queued: true }, { status: 202 })
}
```

### 프론트엔드 완료 감지: Supabase Realtime

```ts
// 프론트엔드에서 Supabase Realtime으로 완료 감지
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(url, key)

supabase
  .channel('project-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'projects',
    filter: `id=eq.${projectId}`,
  }, (payload) => {
    // 프로젝트 상태 업데이트 시 UI 갱신
    refreshStatus()
  })
  .subscribe()
```

## 대안: Vercel 함수 타임아웃 늘리기

Inngest 없이 단기적으로 해결하려면:

```ts
// app/api/projects/[id]/generate/pipeline/route.ts
export const maxDuration = 800  // Pro 플랜: 최대 800초
```

하지만 이 방법은 브라우저 탭 닫으면 중단되는 근본 문제를 해결하지 못함.

## 체크리스트

- [ ] Inngest 계정 생성 및 프로젝트 설정
- [ ] `lib/inngest.ts` 클라이언트 작성
- [ ] `inngest/functions/pipeline.ts` 함수 작성
- [ ] `app/api/inngest/route.ts` serve 엔드포인트 작성
- [ ] 파이프라인 API를 이벤트 발행 방식으로 변경
- [ ] Supabase Realtime으로 프론트엔드 완료 감지
- [ ] Inngest Dashboard에서 재시도/실패 모니터링 확인
- [ ] `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` 환경변수 설정
