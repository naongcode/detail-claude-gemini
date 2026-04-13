import { NextRequest, NextResponse } from 'next/server'
import { loadProjectData, saveProjectData } from '@/lib/projects'
import { generateResearch } from '@/lib/openai-pipeline'
import { generateDetailPage } from '@/lib/claude'
import { ProductBrief, ResearchOutput, PageDesign } from '@/lib/types'
import { sse, sseResponse } from '@/lib/sse'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'

export const maxDuration = 300

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
  } catch {
    return unauthorizedResponse()
  }

  const { id: _id } = await params
  const id = decodeURIComponent(_id)

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // ── Step 1: 브리프 확인 ──────────────────────────────────────────────
        const brief = await loadProjectData<ProductBrief>(id, 'brief')
        if (!brief) {
          sse(controller, { type: 'error', message: '브리프가 없습니다. 먼저 브리프를 생성하세요.' })
          controller.close()
          return
        }

        // ── Step 2: 리서치 ───────────────────────────────────────────────────
        sse(controller, { type: 'step', step: 2, message: '시장 리서치 분석 중...' })
        let research = await loadProjectData<ResearchOutput>(id, 'research')
        if (!research) {
          research = await generateResearch(brief)
          await saveProjectData(id, 'research', research)
        }
        sse(controller, { type: 'step_done', step: 2 })

        // ── Step 3: Claude 전체 페이지 디자인 ───────────────────────────────
        sse(controller, { type: 'step', step: 3, message: 'Claude가 페이지 레이아웃과 카피를 설계 중...' })
        let pageDesign = await loadProjectData<PageDesign>(id, 'page_design')
        if (!pageDesign) {
          pageDesign = await generateDetailPage(brief, research)
          await saveProjectData(id, 'page_design', pageDesign)
        }
        // 이미지 생성은 클라이언트가 개별 요청으로 처리
        sse(controller, {
          type: 'design_ready',
          message: `페이지 설계 완료: 이미지 ${pageDesign.images.length}개 생성 필요`,
          images: pageDesign.images,
        })
        sse(controller, { type: 'done', message: '설계 완료' })
      } catch (err) {
        sse(controller, { type: 'error', message: String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return sseResponse(stream)
}
