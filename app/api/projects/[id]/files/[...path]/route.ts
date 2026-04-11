import { NextRequest, NextResponse } from 'next/server'
import { getPublicUrl } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  const { id: _id, path: filePath } = await params
  const id = decodeURIComponent(_id)
  try {
    const joined = filePath.join('/')

    let url: string
    if (joined === 'final.png' || joined === 'final_page.png') {
      url = getPublicUrl(id, 'final')
    } else if (joined.startsWith('sections/')) {
      const filename = joined.replace('sections/', '')
      const sectionId = filename.replace('.png', '')
      url = getPublicUrl(id, 'section', `${sectionId}.png`)
    } else if (joined.startsWith('product_photos/') || joined.startsWith('photos/')) {
      const filename = joined.split('/').pop() ?? joined
      url = getPublicUrl(id, 'photo', filename)
    } else {
      return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.redirect(url)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
