import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadProjectData, saveProjectData } from '@/lib/projects'
import { generateResearch } from '@/lib/openai-pipeline'
import { generateDetailPage } from '@/lib/claude'
import { ProductBrief, ResearchOutput, PageDesign } from '@/lib/types'
import { sse, sseResponse } from '@/lib/sse'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import { hasProjectCredit, getBalance } from '@/lib/credits'
import { checkRateLimit } from '@/lib/rate-limit'
import { savePipelineStatus } from '@/lib/supabase'
import { notify } from '@/lib/notify'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const LOCK_TIMEOUT_MS = 10 * 60 * 1000 // 10분 (서버 크래시 대비 자동 해제)

export const maxDuration = 300

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user
  try {
    user = await requireAuth()
  } catch {
    return unauthorizedResponse()
  }

  const { id: _id } = await params
  const id = decodeURIComponent(_id)

  // rate limit 확인
  try {
    await checkRateLimit(user.id)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 429 })
  }

  // 크레딧 확인
  const paid = await hasProjectCredit(user.id, id)
  if (!paid) {
    const balance = await getBalance(user.id)
    const error = balance > 0
      ? 'AI 자동채우기를 먼저 실행하세요.'
      : '크레딧이 없습니다. 충전 후 AI 자동채우기를 실행하세요.'
    return NextResponse.json({ error }, { status: 402 })
  }

  const supabase = getServiceClient()

  // 중복 실행 확인
  const { data: proj } = await supabase
    .from('projects')
    .select('pipeline_locked_at')
    .eq('id', id)
    .single()

  if (proj?.pipeline_locked_at) {
    const elapsed = Date.now() - new Date(proj.pipeline_locked_at).getTime()
    if (elapsed < LOCK_TIMEOUT_MS) {
      return NextResponse.json({ error: '이미 파이프라인이 실행 중입니다.' }, { status: 409 })
    }
  }

  // 락 설정
  await supabase.from('projects').update({ pipeline_locked_at: new Date().toISOString() }).eq('id', id)
  const clearLock = () => supabase.from('projects').update({ pipeline_locked_at: null }).eq('id', id)

  // pipeline_status 초기화
  await savePipelineStatus(id, { stage: 'start', completed: [] })

  const state = { cancelled: false }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // ── Step 1: 브리프 확인 ──────────────────────────────────────────────
        const brief = await loadProjectData<ProductBrief>(id, 'brief')
        if (!brief) {
          sse(controller, { type: 'error', message: '브리프가 없습니다. 먼저 브리프를 생성하세요.' })
          return
        }

        // 파이프라인 시작 알림
        notify({ message: `파이프라인 시작: "${brief.product_name ?? id}"`, status: 'info', userId: user.id })

        // ── Step 2: 리서치 (GPT) ─────────────────────────────────────────────
        sse(controller, { type: 'step', step: 2, message: '시장 리서치 분석 중...' })
        await savePipelineStatus(id, { stage: 'research', completed: [] })
        let research = await loadProjectData<ResearchOutput>(id, 'research')
        if (!research) {
          research = await generateResearch(brief, { userId: user.id, projectId: id })
          await saveProjectData(id, 'research', research)
        }
        sse(controller, { type: 'step_done', step: 2 })

        // 중지 요청 확인 — GPT 완료 후
        if (state.cancelled) {
          sse(controller, { type: 'error', message: '사용자가 중지했습니다.' })
          return
        }

        // ── Step 3: Claude 전체 페이지 디자인 ───────────────────────────────
        sse(controller, { type: 'step', step: 3, message: 'Claude가 페이지 레이아웃과 카피를 설계 중...' })
        await savePipelineStatus(id, { stage: 'page_design', completed: [] })
        let pageDesign = await loadProjectData<PageDesign>(id, 'page_design')
        if (!pageDesign) {
          pageDesign = await generateDetailPage(brief, research, { userId: user.id, projectId: id })
          await saveProjectData(id, 'page_design', pageDesign)
        }

        // 중지 요청 확인 — Claude 완료 후
        if (state.cancelled) {
          sse(controller, { type: 'error', message: '사용자가 중지했습니다.' })
          return
        }

        // 이미지 생성 단계 시작 상태 저장
        await savePipelineStatus(id, { stage: 'image_generation', completed: [] })

        sse(controller, {
          type: 'design_ready',
          message: `페이지 설계 완료: 이미지 ${pageDesign.images.length}개 생성 필요`,
          images: pageDesign.images,
        })
        sse(controller, { type: 'done', message: '설계 완료' })

        // 파이프라인 완료 알림
        notify({ message: `파이프라인 완료: "${brief.product_name ?? id}" (이미지 ${pageDesign.images.length}개)`, status: 'success', userId: user.id })
      } catch (err) {
        if (!state.cancelled) {
          sse(controller, { type: 'error', message: String(err) })
          await savePipelineStatus(id, { stage: 'failed', completed: [], error: String(err) }).catch(() => {})

          // 파이프라인 실패 알림
          notify({ message: `파이프라인 실패: ${String(err)}`, status: 'error', userId: user.id })
        }
      } finally {
        await clearLock()
        controller.close()
      }
    },
    cancel() {
      // 클라이언트가 연결을 끊으면 호출됨
      state.cancelled = true
    },
  })

  return sseResponse(stream)
}
