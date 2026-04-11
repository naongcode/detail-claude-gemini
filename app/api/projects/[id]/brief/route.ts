import { NextRequest, NextResponse } from 'next/server'
import { loadProjectData, saveProjectData } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _id } = await params
  const id = decodeURIComponent(_id)
  try {
    const brief = await loadProjectData(id, 'brief')
    return NextResponse.json(brief)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _id } = await params
  const id = decodeURIComponent(_id)
  try {
    const body = await req.json()
    await saveProjectData(id, 'brief', body)
    return NextResponse.json({ saved: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
