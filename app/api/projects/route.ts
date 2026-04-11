import { NextRequest, NextResponse } from 'next/server'
import { listProjects, createProject } from '@/lib/projects'

export async function GET() {
  try {
    const projects = listProjects()
    return NextResponse.json(projects)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name } = body
    if (!name?.trim()) {
      return NextResponse.json({ error: '프로젝트 이름을 입력하세요.' }, { status: 400 })
    }
    const id = createProject(name.trim())
    return NextResponse.json({ id, name: name.trim() }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
