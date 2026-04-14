import { NextResponse } from 'next/server'
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
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [todayCost, monthCost, totalUsers, todayPipelines] = await Promise.all([
    // 오늘 API 비용
    db.from('api_cost_log')
      .select('cost_usd')
      .gte('created_at', todayStart),

    // 이번 달 API 비용
    db.from('api_cost_log')
      .select('cost_usd')
      .gte('created_at', monthStart),

    // 총 사용자 수
    db.from('profiles').select('id', { count: 'exact', head: true }),

    // 오늘 파이프라인 실행 (page_design 생성)
    db.from('api_cost_log')
      .select('id', { count: 'exact', head: true })
      .eq('operation', 'page_design')
      .gte('created_at', todayStart),
  ])

  const sumCost = (rows: { cost_usd: number }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + Number(r.cost_usd), 0)

  return NextResponse.json({
    todayCostUsd: sumCost(todayCost.data),
    monthCostUsd: sumCost(monthCost.data),
    totalUsers: totalUsers.count ?? 0,
    todayPipelines: todayPipelines.count ?? 0,
  })
}
