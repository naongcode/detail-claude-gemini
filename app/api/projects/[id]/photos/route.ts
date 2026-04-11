import { NextRequest, NextResponse } from 'next/server'
import { listPhotos, uploadPhoto, deleteAllPhotos } from '@/lib/supabase'
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const formData = await req.formData()
    const files = formData.getAll('photos') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }

    const saved: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (!PHOTO_EXTS.some((e) => e === `.${ext}`)) continue

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const filename = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_')
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
      }
      const mimeType = mimeMap[ext] ?? 'image/jpeg'
      await uploadPhoto(id, filename, buffer, mimeType)
      saved.push(filename)
    }

    return NextResponse.json({ saved })
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
