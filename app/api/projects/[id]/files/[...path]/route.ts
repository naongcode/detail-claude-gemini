import { NextRequest, NextResponse } from 'next/server'
import { downloadFinalPng, downloadSection, downloadPhoto } from '@/lib/supabase'
import { requireAuth, requireProjectOwner, unauthorizedResponse, forbiddenResponse } from '@/lib/auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  let user
  try {
    user = await requireAuth()
  } catch {
    return unauthorizedResponse()
  }

  const { id: _id, path: filePath } = await params
  const id = decodeURIComponent(_id)

  try {
    await requireProjectOwner(user.id, id)
  } catch {
    return forbiddenResponse()
  }

  try {
    const joined = filePath.join('/')
    let buffer: Buffer | null = null
    let contentType = 'image/png'

    if (joined === 'final.png' || joined === 'final_page.png') {
      buffer = await downloadFinalPng(id)
    } else if (joined.startsWith('sections/')) {
      const sectionId = joined.replace('sections/', '').replace('.png', '')
      buffer = await downloadSection(id, sectionId)
    } else if (joined.startsWith('product_photos/') || joined.startsWith('photos/')) {
      const filename = joined.split('/').pop() ?? joined
      const result = await downloadPhoto(id, filename)
      if (result) {
        buffer = result.buffer
        contentType = result.mimeType
      }
    } else {
      return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!buffer) {
      return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 })
    }

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
