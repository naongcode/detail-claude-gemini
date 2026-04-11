import { NextRequest } from 'next/server'
import { loadProjectData, saveProjectData, getPhotoBuffers } from '@/lib/projects'
import { uploadSection, uploadFinalPng, downloadSection, listSections } from '@/lib/supabase'
import { generateResearch } from '@/lib/openai-pipeline'
import { generateDetailPage } from '@/lib/claude'
import { generateSectionImage } from '@/lib/gemini'
import { isProductSection } from '@/lib/image-utils'
import { ProductBrief, ResearchOutput, PageDesign } from '@/lib/types'

export const maxDuration = 300

function sse(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`))
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        sse(controller, {
          type: 'step_done',
          step: 3,
          message: `페이지 설계 완료: 이미지 ${pageDesign.images.length}개 필요`,
        })

        // ── Step 4~N: Gemini 이미지 생성 ────────────────────────────────────
        const allPhotoBuffers = await getPhotoBuffers(id)
        const existingSections = await listSections(id)
        let imageStep = 4

        for (const imgReq of pageDesign.images) {
          sse(controller, {
            type: 'step',
            step: imageStep,
            message: `이미지 생성 중: ${imgReq.id} (${pageDesign.images.indexOf(imgReq) + 1}/${pageDesign.images.length})`,
          })

          if (!existingSections.includes(imgReq.id)) {
            const photoBuffers = isProductSection(imgReq.id) ? allPhotoBuffers : []
            const buffer = await generateSectionImage(imgReq.prompt, imgReq.width, imgReq.height, photoBuffers)
            await uploadSection(id, imgReq.id, buffer)
            await new Promise((r) => setTimeout(r, 3000))
          }

          sse(controller, { type: 'step_done', step: imageStep, sectionId: imgReq.id })
          imageStep++
        }

        // ── HTML 조립 + Puppeteer 렌더링 ─────────────────────────────────────
        const htmlStep = imageStep
        sse(controller, { type: 'step', step: htmlStep, message: 'HTML 조립 및 PNG 렌더링 중...' })

        // 섹션 이미지 다운로드
        const sectionBuffers: Record<string, Buffer> = {}
        for (const imgReq of pageDesign.images) {
          const buf = await downloadSection(id, imgReq.id)
          if (buf) sectionBuffers[imgReq.id] = buf
        }

        const { renderToPng } = await import('@/lib/renderer')
        const finalBuffer = await renderToPng(pageDesign.html, sectionBuffers)
        await uploadFinalPng(id, finalBuffer)

        // html_page도 저장 (텍스트 편집용)
        let html = pageDesign.html
        for (const imgReq of pageDesign.images) {
          const url = (await import('@/lib/supabase')).getPublicUrl(id, 'section', `${imgReq.id}.png`)
          html = html.replaceAll(`__GEN_${imgReq.id}__`, url)
        }
        await saveProjectData(id, 'html_page', html)

        sse(controller, { type: 'step_done', step: htmlStep })
        sse(controller, { type: 'done', message: '상세페이지 생성 완료!' })
      } catch (err) {
        sse(controller, { type: 'error', message: String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
