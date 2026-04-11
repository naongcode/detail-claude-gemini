import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getProjectDir } from '@/lib/projects'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  const { id, path: filePath } = await params
  try {
    const projectDir = getProjectDir(id)
    const fullPath = path.join(projectDir, ...filePath)

    // Security: ensure path is within project dir
    const realProject = fs.realpathSync(projectDir)
    let realFull: string
    try {
      realFull = fs.realpathSync(fullPath)
    } catch {
      return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!realFull.startsWith(realProject)) {
      return NextResponse.json({ error: '접근 거부' }, { status: 403 })
    }

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 })
    }

    const ext = path.extname(fullPath).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.json': 'application/json',
    }
    const contentType = mimeMap[ext] || 'application/octet-stream'

    const fileBuffer = fs.readFileSync(fullPath)
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
