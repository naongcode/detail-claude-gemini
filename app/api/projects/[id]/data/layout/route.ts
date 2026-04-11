import { NextRequest, NextResponse } from 'next/server'
import { loadProjectData } from '@/lib/supabase'
import { PageDesign } from '@/lib/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const pageDesign = await loadProjectData<PageDesign>(id, 'page_design')
  if (!pageDesign) return NextResponse.json(null)
  return NextResponse.json(pageDesign)
}
