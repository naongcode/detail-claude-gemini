import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getProjectPaths } from '@/lib/projects'
import { PHOTO_EXTS } from '@/lib/constants'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const p = getProjectPaths(id)
    if (!fs.existsSync(p.photos)) {
      return NextResponse.json([])
    }
    const photos = fs
      .readdirSync(p.photos)
      .filter((f) => PHOTO_EXTS.some((ext) => f.toLowerCase().endsWith(ext)))
      .sort()
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
    const p = getProjectPaths(id)
    if (!fs.existsSync(p.photos)) {
      fs.mkdirSync(p.photos, { recursive: true })
    }

    const formData = await req.formData()
    const files = formData.getAll('photos') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }

    const saved: string[] = []
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const filename = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_')
      const destPath = path.join(p.photos, filename)
      fs.writeFileSync(destPath, buffer)
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
    const p = getProjectPaths(id)
    if (!fs.existsSync(p.photos)) {
      return NextResponse.json({ deleted: 0 })
    }
    const photos = fs
      .readdirSync(p.photos)
      .filter((f) => PHOTO_EXTS.some((ext) => f.toLowerCase().endsWith(ext)))

    for (const photo of photos) {
      fs.unlinkSync(path.join(p.photos, photo))
    }

    return NextResponse.json({ deleted: photos.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
