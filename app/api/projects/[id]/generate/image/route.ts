import { NextRequest, NextResponse } from 'next/server'
import { loadProjectData, getPhotoBuffers } from '@/lib/projects'
import { uploadSection, listSections } from '@/lib/supabase'
import { generateSectionImage } from '@/lib/gemini'
import { isProductSection } from '@/lib/image-utils'
import { PageDesign } from '@/lib/types'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'

export const maxDuration = 60

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _id } = await params
  const id = decodeURIComponent(_id)

  try {
    await requireAuth()
    const { sectionId } = await req.json() as { sectionId: string }
    if (!sectionId) return NextResponse.json({ error: 'sectionId 필요' }, { status: 400 })

    const pageDesign = await loadProjectData<PageDesign>(id, 'page_design')
    if (!pageDesign) return NextResponse.json({ error: '페이지 디자인 없음' }, { status: 404 })

    const imgReq = pageDesign.images.find((img) => img.id === sectionId)
    if (!imgReq) return NextResponse.json({ error: `섹션 '${sectionId}' 없음` }, { status: 404 })

    // 이미 생성된 경우 스킵
    const existing = await listSections(id)
    if (existing.includes(sectionId)) {
      return NextResponse.json({ done: true, sectionId, skipped: true })
    }

    const photoBuffers = isProductSection(imgReq.id) ? await getPhotoBuffers(id) : []
    const buffer = await generateSectionImage(imgReq.prompt, imgReq.width, imgReq.height, photoBuffers)
    await uploadSection(id, imgReq.id, buffer)

    return NextResponse.json({ done: true, sectionId })
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
