import { NextRequest, NextResponse } from 'next/server'
import { listPhotos, deleteAllPhotos, uploadPhoto } from '@/lib/supabase'
import { requireAuth, unauthorizedResponse, requireProjectOwner, forbiddenResponse } from '@/lib/auth'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _id } = await params
  const id = decodeURIComponent(_id)
  try {
    const user = await requireAuth()
    await requireProjectOwner(user.id, id)
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })

    // 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다.' }, { status: 400 })
    }

    // MIME 타입 검증
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: 'JPG, PNG, WEBP 파일만 업로드 가능합니다.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // sharp로 실제 이미지인지 검증 (MIME 스푸핑 방어)
    const sharp = (await import('sharp')).default
    try {
      await sharp(buffer).metadata()
    } catch {
      return NextResponse.json({ error: '유효하지 않은 이미지 파일입니다.' }, { status: 400 })
    }

    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    await uploadPhoto(id, filename, buffer, file.type)
    return NextResponse.json({ ok: true, filename })
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    if (String(err).includes('FORBIDDEN')) return forbiddenResponse()
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _id } = await params
  const id = decodeURIComponent(_id)
  try {
    const user = await requireAuth()
    await requireProjectOwner(user.id, id)
    const photos = await listPhotos(id)
    return NextResponse.json(photos)
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    if (String(err).includes('FORBIDDEN')) return forbiddenResponse()
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _id } = await params
  const id = decodeURIComponent(_id)
  try {
    const user = await requireAuth()
    await requireProjectOwner(user.id, id)
    await deleteAllPhotos(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    if (String(err).includes('FORBIDDEN')) return forbiddenResponse()
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
