import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceClient } from '@/lib/admin'
import { unauthorizedResponse, forbiddenResponse } from '@/lib/auth'

export async function GET() {
  try {
    await requireAdmin()
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    return forbiddenResponse()
  }

  const db = getServiceClient()

  const { data: users } = await db
    .from('profiles')
    .select('id, email, created_at, is_admin')
    .order('created_at', { ascending: false })
    .limit(100)

  if (!users) return NextResponse.json([])

  // 각 유저의 크레딧 잔액, 프로젝트 수 조인
  const ids = users.map(u => u.id)

  const [credits, projects] = await Promise.all([
    db.from('user_credits').select('user_id, balance, regen_tickets').in('user_id', ids),
    db.from('projects').select('user_id').in('user_id', ids),
  ])

  const creditMap: Record<string, { balance: number; regen_tickets: number }> = {}
  for (const c of credits.data ?? []) {
    creditMap[c.user_id] = { balance: c.balance, regen_tickets: c.regen_tickets }
  }

  const projectCount: Record<string, number> = {}
  for (const p of projects.data ?? []) {
    projectCount[p.user_id] = (projectCount[p.user_id] ?? 0) + 1
  }

  return NextResponse.json(users.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    is_admin: u.is_admin,
    balance: creditMap[u.id]?.balance ?? 0,
    regen_tickets: creditMap[u.id]?.regen_tickets ?? 0,
    project_count: projectCount[u.id] ?? 0,
  })))
}

// 크레딧 수동 지급/차감
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    return forbiddenResponse()
  }

  const { userId, amount, note } = await req.json() as {
    userId: string
    amount: number  // 양수: 지급, 음수: 차감
    note?: string
  }

  if (!userId || amount === 0) {
    return NextResponse.json({ error: 'userId와 amount가 필요합니다.' }, { status: 400 })
  }

  const db = getServiceClient()

  // 크레딧 트랜잭션 기록
  await db.from('credit_transactions').insert({
    user_id: userId,
    amount,
    description: note ?? (amount > 0 ? '관리자 지급' : '관리자 차감'),
  })

  // 잔액 업데이트
  const { data: current } = await db
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .single()

  const newBalance = Math.max(0, (current?.balance ?? 0) + amount)
  await db.from('user_credits')
    .upsert({ user_id: userId, balance: newBalance })

  return NextResponse.json({ ok: true, newBalance })
}
