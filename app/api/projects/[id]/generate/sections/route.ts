import { NextRequest } from 'next/server'
import { getProjectPaths, loadJson, getProductPhotoPaths } from '@/lib/projects'
import { generateSectionImage } from '@/lib/gemini'
import { isProductSection } from '@/lib/image-utils'
import { PageDesign } from '@/lib/types'
import fs from 'fs'
import path from 'path'

export const maxDuration = 300

interface SectionRequest {
  key: string
  note?: string
}

function sse(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`))
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const p = getProjectPaths(id)

  const body = await req.json() as { sections: SectionRequest[] }
  const sectionRequests: SectionRequest[] = body.sections ?? []

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const pageDesign = loadJson<PageDesign>(p.pageDesign)
        if (!pageDesign) {
          sse(controller, { type: 'error', message: '페이지 디자인이 없습니다. 파이프라인을 먼저 실행하세요.' })
          controller.close()
          return
        }

        const allPhotoPaths = getProductPhotoPaths(id)

        for (const req of sectionRequests) {
          const imgReq = pageDesign.images.find((img) => img.id === req.key)
          if (!imgReq) {
            sse(controller, { type: 'warn', message: `섹션 '${req.key}'을 찾을 수 없습니다.` })
            continue
          }

          sse(controller, { type: 'step', message: `${req.key} 이미지 재생성 중...` })

          // Build prompt: append user note if provided
          let prompt = imgReq.prompt
          if (req.note?.trim()) {
            prompt += `\n\nAdditional direction: ${req.note.trim()}`
          }

          const outputPath = path.join(p.sections, `${imgReq.id}.png`)
          const photoPaths = isProductSection(imgReq.id) ? allPhotoPaths : []
          await generateSectionImage(prompt, imgReq.width, imgReq.height, outputPath, photoPaths)

          sse(controller, { type: 'step_done', message: `${req.key} 완료`, sectionId: req.key })
          await new Promise((r) => setTimeout(r, 2000))
        }

        // Re-render final PNG
        sse(controller, { type: 'step', message: 'PNG 재렌더링 중...' })
        if (fs.existsSync(p.htmlPage)) {
          const { renderToPng } = await import('@/lib/renderer')
          await renderToPng(p.htmlPage, p.finalPng)
        }

        sse(controller, { type: 'done', message: '재생성 완료!' })
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
