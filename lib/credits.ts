import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getBalance(userId: string): Promise<number> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .single()
  return data?.balance ?? 0
}

/** 차감 후 잔여 잔액 반환. 잔액 부족 시 throw. 이미 차감된 프로젝트면 현재 잔액 반환. */
export async function deductCredit(userId: string, projectId: string, cost = 1): Promise<number> {
  const supabase = getServiceClient()
  const { data, error } = await supabase.rpc('deduct_credit', {
    p_user_id: userId,
    p_project_id: projectId,
    p_cost: cost,
  })
  if (error) throw new Error(`크레딧 차감 오류: ${error.message}`)
  if (data === false) throw new Error('크레딧이 부족합니다.')
  // 차감 후 최신 잔액 조회
  return await getBalance(userId)
}

export async function hasProjectCredit(userId: string, projectId: string): Promise<boolean> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .eq('is_project_charge', true)
    .limit(1)
    .single()
  return !!data
}

/**
 * 재생성 티켓 N장 원자적 차감 (race condition 방지).
 * 무료권 우선 소모 → 부족분은 구매권.
 * 티켓 부족 시 throw.
 */
export async function chargeRegen(
  userId: string,
  projectId: string,
  count: number,
): Promise<{ freeUsed: number; purchasedUsed: number }> {
  const supabase = getServiceClient()
  const { data, error } = await supabase.rpc('charge_regen', {
    p_user_id: userId,
    p_project_id: projectId,
    p_count: count,
  })
  if (error) {
    if (error.message.includes('INSUFFICIENT_TICKETS')) {
      throw new Error('재생성권이 부족합니다. 재생성권을 구매해 주세요.')
    }
    throw new Error(`재생성 티켓 차감 오류: ${error.message}`)
  }
  const result = data as { free_used: number; purchased_used: number }
  return { freeUsed: result.free_used, purchasedUsed: result.purchased_used }
}

export async function addCredits(userId: string, delta: number, reason: string): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase.rpc('add_credits', {
    p_user_id: userId,
    p_delta: delta,
    p_reason: reason,
  })
  if (error) throw new Error(`크레딧 충전 오류: ${error.message}`)
}
