import { NextRequest, NextResponse } from 'next/server'
import { generateBrief } from '@/lib/openai-pipeline'
import { getProjectPaths, saveJson } from '@/lib/projects'

export const maxDuration = 60

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await req.json()
    const { description } = body
    if (!description?.trim()) {
      return NextResponse.json({ error: '제품 설명을 입력하세요.' }, { status: 400 })
    }

    const brief = await generateBrief(description.trim())
    const p = getProjectPaths(id)
    saveJson(p.brief, brief)

    return NextResponse.json(brief)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
