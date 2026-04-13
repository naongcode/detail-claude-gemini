import { NextRequest, NextResponse } from 'next/server'
import { listProjects, createProject } from '@/lib/projects'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'

export async function GET() {
  try {
    const user = await requireAuth()
    const projects = await listProjects(user.id)
    return NextResponse.json(projects)
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { name } = body
    if (!name?.trim()) {
      return NextResponse.json({ error: '프로젝트 이름을 입력하세요.' }, { status: 400 })
    }
    const id = await createProject(name.trim(), user.id)
    return NextResponse.json({ id, name: name.trim() }, { status: 201 })
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
