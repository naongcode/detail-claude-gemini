import { NextRequest, NextResponse } from 'next/server'
import { loadProjectData } from '@/lib/supabase'
import { PageDesign } from '@/lib/types'
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
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    return forbiddenResponse()
  }
  const pageDesign = await loadProjectData<PageDesign>(id, 'page_design')
  if (!pageDesign) return NextResponse.json(null)
  return NextResponse.json(pageDesign)
}
