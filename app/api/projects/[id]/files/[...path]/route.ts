import { NextRequest, NextResponse } from 'next/server'
import { getPublicUrl } from '@/lib/supabase'
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

    // 리다이렉트 대신 프록시로 전달 — 클라이언트의 ?t= 캐시 버스팅이 동작하도록
    // Supabase CDN 캐시를 우회하기 위해 서버→Supabase는 no-store,
    // 브라우저→Next.js는 ?t= URL 단위로 캐시 (같은 t= 값이면 재사용, 바뀌면 새 요청)
    const upstream = await fetch(url, { cache: 'no-store' })
    if (!upstream.ok) {
      return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 })
    }
    const buffer = await upstream.arrayBuffer()
    const contentType = upstream.headers.get('content-type') ?? 'image/png'
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
