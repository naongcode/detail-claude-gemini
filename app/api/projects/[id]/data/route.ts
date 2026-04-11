import { NextRequest, NextResponse } from 'next/server'
import { loadProjectData, saveProjectData, getProjectRow } from '@/lib/supabase'
import { downloadSection, listSections, uploadFinalPng, getPublicUrl } from '@/lib/supabase'
import { PageDesign } from '@/lib/types'

type DataKey = 'research' | 'pageDesign'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _id } = await params
  const id = decodeURIComponent(_id)
  const key = req.nextUrl.searchParams.get('key') as DataKey | null

  try {
    if (key === 'research') {
      return NextResponse.json(await loadProjectData(id, 'research'))
    }
    if (key === 'pageDesign') {
      return NextResponse.json(await loadProjectData(id, 'page_design'))
    }

    // 전체 반환
    const row = await getProjectRow(id)
    return NextResponse.json({
      research: row?.research ?? null,
      pageDesign: row?.page_design ?? null,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _id } = await params
  const id = decodeURIComponent(_id)
  const key = req.nextUrl.searchParams.get('key') as DataKey | null

  try {
    if (!key || !['research', 'pageDesign'].includes(key)) {
      return NextResponse.json({ error: '유효한 key가 필요합니다 (research|pageDesign)' }, { status: 400 })
    }

    const body = await req.json()
    const field = key === 'pageDesign' ? 'page_design' : 'research'
    await saveProjectData(id, field, body)

    // pageDesign 저장 시 html_page 재조립 + 재렌더링
    if (key === 'pageDesign') {
      const pageDesign = body as PageDesign
      const existingSections = await listSections(id)

      const sectionBuffers: Record<string, Buffer> = {}
      for (const imgReq of pageDesign.images) {
        if (existingSections.includes(imgReq.id)) {
          const buf = await downloadSection(id, imgReq.id)
          if (buf) sectionBuffers[imgReq.id] = buf
        }
      }

      try {
        const { renderToPng } = await import('@/lib/renderer')
        const finalBuffer = await renderToPng(pageDesign.html, sectionBuffers)
        await uploadFinalPng(id, finalBuffer)

        let html = pageDesign.html
        for (const imgReq of pageDesign.images) {
          const url = getPublicUrl(id, 'section', `${imgReq.id}.png`)
          html = html.replaceAll(`__GEN_${imgReq.id}__`, url)
        }
        await saveProjectData(id, 'html_page', html)

        return NextResponse.json({ saved: true, rendered: true })
      } catch (renderErr) {
        return NextResponse.json({ saved: true, rendered: false, renderError: String(renderErr) })
      }
    }

    return NextResponse.json({ saved: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
