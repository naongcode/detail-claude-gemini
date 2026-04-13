import { NextRequest, NextResponse } from 'next/server'
import { getProjectStatus, deleteProject, renameProject, listProjects } from '@/lib/projects'
import { getProjectName } from '@/lib/supabase'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _id } = await params
  const id = decodeURIComponent(_id)
  try {
    await requireAuth()
    const [name, status] = await Promise.all([
      getProjectName(id),
      getProjectStatus(id),
    ])
    return NextResponse.json({ id, name, status })
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _id } = await params
  const id = decodeURIComponent(_id)
  try {
    await requireAuth()
    const { name } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: '이름을 입력하세요.' }, { status: 400 })
    }
    await renameProject(id, name.trim())
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
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
    await deleteProject(id)
    const remaining = await listProjects(user.id)
    return NextResponse.json({ deleted: true, remaining })
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
