import { NextRequest, NextResponse } from 'next/server'
import { loadPipelineStatus } from '@/lib/supabase'
import { requireAuth, unauthorizedResponse, requireProjectOwner, forbiddenResponse } from '@/lib/auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _id } = await params
  const id = decodeURIComponent(_id)

  try {
    const user = await requireAuth()
    await requireProjectOwner(user.id, id)

    const status = await loadPipelineStatus(id)
    return NextResponse.json(status ?? {})
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    if (String(err).includes('FORBIDDEN')) return forbiddenResponse()
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
