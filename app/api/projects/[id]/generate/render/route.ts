import { NextRequest, NextResponse } from 'next/server'
import { loadProjectData } from '@/lib/projects'
import { uploadFinalPng, downloadSection, saveProjectData, getPublicUrl, saveProjectVersion, savePipelineStatus, storagePath } from '@/lib/supabase'
import { PageDesign } from '@/lib/types'
import { requireAuth, unauthorizedResponse, requireProjectOwner, forbiddenResponse } from '@/lib/auth'

export const runtime = 'nodejs'

export const maxDuration = 120

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _id } = await params
  const id = decodeURIComponent(_id)

  try {
    const user = await requireAuth()
    await requireProjectOwner(user.id, id)
    const pageDesign = await loadProjectData<PageDesign>(id, 'page_design')
    if (!pageDesign) return NextResponse.json({ error: '페이지 디자인 없음' }, { status: 404 })

    // 섹션 이미지 다운로드
    const sectionBuffers: Record<string, Buffer> = {}
    for (const imgReq of pageDesign.images) {
      const buf = await downloadSection(id, imgReq.id)
      if (buf) sectionBuffers[imgReq.id] = buf
    }

    // Puppeteer 렌더링
    const { renderToPng } = await import('@/lib/renderer')
    const finalBuffer = await renderToPng(pageDesign.html, sectionBuffers)
    await uploadFinalPng(id, finalBuffer)

    // html_page 저장 (텍스트 편집용)
    let html = pageDesign.html
    for (const imgReq of pageDesign.images) {
      const url = getPublicUrl(id, 'section', `${imgReq.id}.png`)
      html = html.replaceAll(`__GEN_${imgReq.id}__`, url)
    }
    await saveProjectData(id, 'html_page', html)

    // 버전 스냅샷 저장 + pipeline_status 완료 처리
    const finalPngPath = storagePath(id, 'final')
    await Promise.all([
      saveProjectVersion(id, pageDesign, finalPngPath).catch(() => {}),
      savePipelineStatus(id, { stage: 'done', completed: pageDesign.images.map((i) => i.id) }).catch(() => {}),
    ])

    return NextResponse.json({ done: true })
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    if (String(err).includes('FORBIDDEN')) return forbiddenResponse()
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
