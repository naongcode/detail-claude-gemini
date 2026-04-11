import { NextRequest } from 'next/server'
import { loadProjectData, getPhotoBuffers } from '@/lib/projects'
import { uploadSection, downloadSection, uploadFinalPng, getPublicUrl } from '@/lib/supabase'
import { generateSectionImage } from '@/lib/gemini'
import { isProductSection } from '@/lib/image-utils'
import { PageDesign } from '@/lib/types'

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
  const { id: _id } = await params
  const id = decodeURIComponent(_id)
  const body = await req.json() as { sections: SectionRequest[] }
  const sectionRequests: SectionRequest[] = body.sections ?? []

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const pageDesign = await loadProjectData<PageDesign>(id, 'page_design')
        if (!pageDesign) {
          sse(controller, { type: 'error', message: '페이지 디자인이 없습니다. 파이프라인을 먼저 실행하세요.' })
          controller.close()
          return
        }

        const allPhotoBuffers = await getPhotoBuffers(id)

        for (const sectionReq of sectionRequests) {
          const imgReq = pageDesign.images.find((img) => img.id === sectionReq.key)
          if (!imgReq) {
            sse(controller, { type: 'warn', message: `섹션 '${sectionReq.key}'을 찾을 수 없습니다.` })
            continue
          }

          sse(controller, { type: 'step', message: `${sectionReq.key} 이미지 재생성 중...` })

          let prompt = imgReq.prompt
          if (sectionReq.note?.trim()) prompt += `\n\nAdditional direction: ${sectionReq.note.trim()}`

          const photoBuffers = isProductSection(imgReq.id) ? allPhotoBuffers : []
          const buffer = await generateSectionImage(prompt, imgReq.width, imgReq.height, photoBuffers)
          await uploadSection(id, imgReq.id, buffer)

          sse(controller, { type: 'step_done', message: `${sectionReq.key} 완료`, sectionId: sectionReq.key })
          await new Promise((r) => setTimeout(r, 2000))
        }

        // 최종 PNG 재렌더링
        sse(controller, { type: 'step', message: 'PNG 재렌더링 중...' })

        const sectionBuffers: Record<string, Buffer> = {}
        for (const imgReq of pageDesign.images) {
          const buf = await downloadSection(id, imgReq.id)
          if (buf) sectionBuffers[imgReq.id] = buf
        }

        const { renderToPng } = await import('@/lib/renderer')
        const finalBuffer = await renderToPng(pageDesign.html, sectionBuffers)
        await uploadFinalPng(id, finalBuffer)

        // html_page 업데이트
        let html = pageDesign.html
        for (const imgReq of pageDesign.images) {
          const url = getPublicUrl(id, 'section', `${imgReq.id}.png`)
          html = html.replaceAll(`__GEN_${imgReq.id}__`, url)
        }
        const { saveProjectData } = await import('@/lib/projects')
        await saveProjectData(id, 'html_page', html)

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
