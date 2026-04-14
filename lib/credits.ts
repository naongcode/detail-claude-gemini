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
 * 재생성 전 티켓 확인 및 차감.
 * 우선순위: 프로젝트 무료권 → 유저 구매권 → 없으면 throw
 * 반환값: 'free' | 'purchased'
 */
export async function checkAndChargeRegen(
  userId: string,
  projectId: string,
): Promise<{ source: 'free' | 'purchased' }> {
  const supabase = getServiceClient()

  // 프로젝트 무료권 확인
  const { data: proj, error: projErr } = await supabase
    .from('projects')
    .select('regen_count, regen_limit')
    .eq('id', projectId)
    .single()

  if (projErr || !proj) throw new Error('프로젝트를 찾을 수 없습니다.')

  const { regen_count, regen_limit } = proj

  // 1순위: 프로젝트 무료권 남아 있으면 사용
  if (regen_count < regen_limit) {
    await supabase
      .from('projects')
      .update({ regen_count: regen_count + 1 })
      .eq('id', projectId)
    return { source: 'free' }
  }

  // 2순위: 유저 구매권 확인
  const { data: credits, error: credErr } = await supabase
    .from('user_credits')
    .select('regen_tickets')
    .eq('user_id', userId)
    .single()

  if (credErr || !credits) throw new Error('크레딧 정보를 불러올 수 없습니다.')

  if (credits.regen_tickets > 0) {
    await supabase
      .from('user_credits')
      .update({ regen_tickets: credits.regen_tickets - 1 })
      .eq('user_id', userId)
    return { source: 'purchased' }
  }

  // 둘 다 없음
  throw new Error(`프로젝트 무료 재생성권 ${regen_limit}장을 모두 사용했습니다. 재생성권을 구매해 주세요.`)
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
