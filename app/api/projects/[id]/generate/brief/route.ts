import { NextRequest, NextResponse } from 'next/server'
import { generateBrief } from '@/lib/openai-pipeline'
import { saveProjectData } from '@/lib/supabase'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'

export const maxDuration = 60

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _id } = await params
  const id = decodeURIComponent(_id)
  try {
    await requireAuth()
    const body = await req.json()
    const { description } = body
    if (!description?.trim()) {
      return NextResponse.json({ error: '제품 설명을 입력하세요.' }, { status: 400 })
    }

    const brief = await generateBrief(description.trim())
    await saveProjectData(id, 'brief', brief)

    return NextResponse.json(brief)
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
