import { NextRequest, NextResponse } from 'next/server'
import { generateBrief } from '@/lib/openai-pipeline'
import { saveProjectData } from '@/lib/supabase'
import { requireAuth, unauthorizedResponse, createSupabaseServer } from '@/lib/auth'
import { deductCredit, hasProjectCredit } from '@/lib/credits'
import { checkRateLimit } from '@/lib/rate-limit'

export const maxDuration = 60

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _id } = await params
  const id = decodeURIComponent(_id)
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { description } = body
    if (!description?.trim()) {
      return NextResponse.json({ error: '제품 설명을 입력하세요.' }, { status: 400 })
    }

    // rate limit 확인
    await checkRateLimit(user.id)

    // 프로젝트 소유권 검증
    const supabase = await createSupabaseServer()
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    if (!project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
    }

    // GPT 호출 먼저 — 성공한 경우에만 크레딧 차감
    const brief = await generateBrief(description.trim(), { userId: user.id, projectId: id })

    // 크레딧 차감 — DB 함수 내에서 중복 차감 방지 (원자적), 잔여 잔액 반환
    const alreadyPaid = await hasProjectCredit(user.id, id)
    const remainingBalance = await deductCredit(user.id, id)

    await saveProjectData(id, 'brief', brief)

    return NextResponse.json({ brief, deducted: !alreadyPaid, balance: remainingBalance })
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    if (String(err).includes('크레딧')) return NextResponse.json({ error: String(err) }, { status: 402 })
    if (String(err).includes('한도')) return NextResponse.json({ error: String(err) }, { status: 429 })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
