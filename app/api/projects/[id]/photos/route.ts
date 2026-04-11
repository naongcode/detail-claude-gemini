import { NextRequest, NextResponse } from 'next/server'
import { listPhotos, deleteAllPhotos } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _id } = await params
  const id = decodeURIComponent(_id)
  try {
    const photos = await listPhotos(id)
    return NextResponse.json(photos)
  } catch (err) {
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
    await deleteAllPhotos(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
