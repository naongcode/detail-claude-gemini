import { NextRequest } from 'next/server'
import { getProjectPaths, saveJson, loadJson, getProductPhotoPaths } from '@/lib/projects'
import { generateResearch } from '@/lib/openai-pipeline'
import { generateDetailPage } from '@/lib/claude'
import { generateSectionImage } from '@/lib/gemini'
import { isProductSection } from '@/lib/image-utils'
import { ProductBrief, ResearchOutput, PageDesign } from '@/lib/types'
import fs from 'fs'
import path from 'path'

export const maxDuration = 300

function sse(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`))
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const p = getProjectPaths(id)

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // ── Step 1: 브리프 확인 ──────────────────────────────────────────────
        const brief = loadJson<ProductBrief>(p.brief)
        if (!brief) {
          sse(controller, { type: 'error', message: '브리프가 없습니다. 먼저 브리프를 생성하세요.' })
          controller.close()
          return
        }

        // ── Step 2: 리서치 ───────────────────────────────────────────────────
        sse(controller, { type: 'step', step: 2, message: '시장 리서치 분석 중...' })
        let research = loadJson<ResearchOutput>(p.research)
        if (!research) {
          research = await generateResearch(brief)
          saveJson(p.research, research)
        }
        sse(controller, { type: 'step_done', step: 2 })

        // ── Step 3: Claude 전체 페이지 디자인 ───────────────────────────────
        sse(controller, { type: 'step', step: 3, message: 'Claude가 페이지 레이아웃과 카피를 설계 중...' })
        let pageDesign = loadJson<PageDesign>(p.pageDesign)
        if (!pageDesign) {
          pageDesign = await generateDetailPage(brief, research)
          saveJson(p.pageDesign, pageDesign)
        }
        sse(controller, {
          type: 'step_done',
          step: 3,
          message: `페이지 설계 완료: 이미지 ${pageDesign.images.length}개 필요`,
        })

        // ── Step 4~N: Gemini 이미지 생성 ────────────────────────────────────
        const allPhotoPaths = getProductPhotoPaths(id)
        let imageStep = 4

        for (const imgReq of pageDesign.images) {
          const outputPath = path.join(p.sections, `${imgReq.id}.png`)

          sse(controller, {
            type: 'step',
            step: imageStep,
            message: `이미지 생성 중: ${imgReq.id} (${pageDesign.images.indexOf(imgReq) + 1}/${pageDesign.images.length})`,
          })

          if (!fs.existsSync(outputPath)) {
            const photoPaths = isProductSection(imgReq.id) ? allPhotoPaths : []
            await generateSectionImage(
              imgReq.prompt,
              imgReq.width,
              imgReq.height,
              outputPath,
              photoPaths
            )
            // API 호출 제한 방지
            await new Promise((r) => setTimeout(r, 3000))
          }

          sse(controller, { type: 'step_done', step: imageStep, sectionId: imgReq.id })
          imageStep++
        }

        // ── HTML 최종화: 플레이스홀더 → 실제 파일 경로 ─────────────────────
        const htmlStep = imageStep
        sse(controller, { type: 'step', step: htmlStep, message: 'HTML 조립 중...' })

        let html = pageDesign.html
        for (const imgReq of pageDesign.images) {
          const imgPath = path.join(p.sections, `${imgReq.id}.png`)
          if (fs.existsSync(imgPath)) {
            // file:/// 절대 경로로 교체 (Puppeteer용)
            const fileUrl = `file:///${imgPath.replace(/\\/g, '/')}`
            html = html.replaceAll(`__GEN_${imgReq.id}__`, fileUrl)
          }
        }

        fs.writeFileSync(p.htmlPage, html, 'utf-8')
        sse(controller, { type: 'step_done', step: htmlStep })

        // ── Puppeteer PNG 렌더링 ─────────────────────────────────────────────
        const renderStep = htmlStep + 1
        sse(controller, { type: 'step', step: renderStep, message: 'PNG 렌더링 중...' })

        const { renderToPng } = await import('@/lib/renderer')
        await renderToPng(p.htmlPage, p.finalPng)
        sse(controller, { type: 'step_done', step: renderStep })

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
