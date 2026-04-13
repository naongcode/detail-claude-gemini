import { NextRequest, NextResponse } from 'next/server'
import { loadProjectData, saveProjectData } from '@/lib/supabase'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _id } = await params
  const id = decodeURIComponent(_id)
  try {
    await requireAuth()
    const brief = await loadProjectData(id, 'brief')
    return NextResponse.json(brief)
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
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
    await requireAuth()
    const body = await req.json()
    await saveProjectData(id, 'brief', body)
    return NextResponse.json({ saved: true })
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
