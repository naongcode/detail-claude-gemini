import { NextRequest, NextResponse } from 'next/server'
import { listPhotos, deleteAllPhotos, createSignedUploadUrl } from '@/lib/supabase'
import { PHOTO_EXTS } from '@/lib/constants'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const photos = await listPhotos(id)
    return NextResponse.json(photos)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// 클라이언트가 직접 Supabase Storage에 업로드할 signed URL 발급
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { filenames } = await req.json() as { filenames: string[] }
    if (!filenames?.length) {
      return NextResponse.json({ error: '파일명이 없습니다.' }, { status: 400 })
    }

    const urls: Array<{ filename: string; signedUrl: string; path: string }> = []
    for (const raw of filenames) {
      const ext = raw.split('.').pop()?.toLowerCase() ?? ''
      if (!PHOTO_EXTS.some((e) => e === `.${ext}`)) continue
      const filename = raw.replace(/[^a-zA-Z0-9가-힣._-]/g, '_')
      const { signedUrl, path } = await createSignedUploadUrl(id, filename)
      urls.push({ filename, signedUrl, path })
    }

    return NextResponse.json({ urls })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await deleteAllPhotos(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
