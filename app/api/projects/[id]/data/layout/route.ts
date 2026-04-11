import { NextRequest, NextResponse } from 'next/server'
import { getProjectPaths, loadJson } from '@/lib/projects'
import { PageDesign } from '@/lib/types'

// Returns page_design.json (renamed from old layout route for compatibility)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const p = getProjectPaths(id)
  const pageDesign = loadJson<PageDesign>(p.pageDesign)
  if (!pageDesign) return NextResponse.json(null)
  return NextResponse.json(pageDesign)
}
