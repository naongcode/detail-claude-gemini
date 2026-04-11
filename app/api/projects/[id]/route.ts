import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import { getProjectPaths, loadJson, getProjectStatus, deleteProject, renameProject, listProjects } from '@/lib/projects'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const p = getProjectPaths(id)
    if (!fs.existsSync(p.base)) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
    }
    const meta = loadJson(p.meta) || { id, name: id, created_at: '', updated_at: '' }
    const status = getProjectStatus(id)
    return NextResponse.json({ ...meta, id, status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { name } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: '이름을 입력하세요.' }, { status: 400 })
    }
    renameProject(id, name.trim())
    return NextResponse.json({ ok: true })
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
    deleteProject(id)
    const remaining = listProjects()
    return NextResponse.json({ deleted: true, remaining })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
