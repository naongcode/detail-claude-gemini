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

  const db = getServiceClient()
  const days = Number(req.nextUrl.searchParams.get('days') ?? '30')
  const since = new Date(Date.now() - days * 86400_000).toISOString()

  // provider별 집계
  const { data: byProvider } = await db
    .from('api_cost_log')
    .select('provider, cost_usd')
    .gte('created_at', since)

  const providerTotals: Record<string, number> = {}
  for (const row of byProvider ?? []) {
    providerTotals[row.provider] = (providerTotals[row.provider] ?? 0) + Number(row.cost_usd)
  }

  // 일별 집계 (최근 30일)
  const { data: daily } = await db
    .from('api_cost_log')
    .select('created_at, cost_usd, provider')
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  const dailyMap: Record<string, Record<string, number>> = {}
  for (const row of daily ?? []) {
    const day = row.created_at.slice(0, 10)
    if (!dailyMap[day]) dailyMap[day] = {}
    dailyMap[day][row.provider] = (dailyMap[day][row.provider] ?? 0) + Number(row.cost_usd)
  }

  // operation별 집계
  const { data: byOp } = await db
    .from('api_cost_log')
    .select('operation, cost_usd')
    .gte('created_at', since)

  const opTotals: Record<string, number> = {}
  for (const row of byOp ?? []) {
    opTotals[row.operation] = (opTotals[row.operation] ?? 0) + Number(row.cost_usd)
  }

  return NextResponse.json({ providerTotals, dailyMap, opTotals })
}
