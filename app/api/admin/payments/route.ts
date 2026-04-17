import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceClient } from '@/lib/admin'
import { unauthorizedResponse, forbiddenResponse } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    return forbiddenResponse()
  }

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 50
  const offset = (page - 1) * limit
  const reason = searchParams.get('reason') ?? 'all'

  const db = getServiceClient()

  let query = db
    .from('credit_transactions')
    .select('id, user_id, delta, reason, project_id, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (reason === 'purchase') {
    query = query.like('reason', 'purchase:%')
  } else if (reason === 'usage') {
    query = query.eq('reason', 'brief_generation')
  } else if (reason === 'regen') {
    query = query.in('reason', ['regen_use', 'regen_use_free', 'regen_use_purchased', 'regen_purchase'])
  } else if (reason === 'regen_free') {
    query = query.in('reason', ['regen_use_free', 'regen_use'])
  } else if (reason === 'regen_purchased') {
    query = query.in('reason', ['regen_use_purchased'])
  } else if (reason === 'admin') {
    query = query.or('reason.eq.관리자 지급,reason.eq.관리자 차감')
  } else if (reason === 'bonus') {
    query = query.eq('reason', 'kakao_verified_bonus')
  }

  const { data: txs, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 유저 이메일 조인
  const userIds = [...new Set((txs ?? []).map(t => t.user_id).filter(Boolean))]
  const { data: profiles } = userIds.length
    ? await db.from('profiles').select('id, email').in('id', userIds)
    : { data: [] }

  const emailMap: Record<string, string> = {}
  for (const p of profiles ?? []) {
    emailMap[p.id] = p.email
  }

  // 구매 합계 통계 (purchase:* reason만)
  const { data: purchaseSummary } = await db
    .from('credit_transactions')
    .select('delta')
    .like('reason', 'purchase:%')

  const totalPurchased = (purchaseSummary ?? []).reduce((sum, r) => sum + (r.delta ?? 0), 0)
  const purchaseCount = purchaseSummary?.length ?? 0

  return NextResponse.json({
    transactions: (txs ?? []).map(t => ({
      id: t.id,
      user_id: t.user_id,
      email: emailMap[t.user_id] ?? '(알 수 없음)',
      delta: t.delta,
      reason: t.reason,
      project_id: t.project_id,
      created_at: t.created_at,
    })),
    total: count ?? 0,
    page,
    stats: {
      totalPurchased,
      purchaseCount,
    },
  })
}
