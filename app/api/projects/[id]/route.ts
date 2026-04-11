import { NextRequest, NextResponse } from 'next/server'
import { getProjectStatus, deleteProject, renameProject, listProjects } from '@/lib/projects'
import { loadProjectData } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const [brief, status] = await Promise.all([
      loadProjectData(id, 'brief'),
      getProjectStatus(id),
    ])
    if (brief === null && !status.hasBrief) {
      // 프로젝트가 존재하는지 확인 (brief가 없어도 존재할 수 있음)
    }
    return NextResponse.json({ id, status })
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
    await renameProject(id, name.trim())
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
    await deleteProject(id)
    const remaining = await listProjects()
    return NextResponse.json({ deleted: true, remaining })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
