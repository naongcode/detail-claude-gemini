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

export async function deductCredit(userId: string, projectId: string, cost = 1): Promise<void> {
  const supabase = getServiceClient()
  const { data, error } = await supabase.rpc('deduct_credit', {
    p_user_id: userId,
    p_project_id: projectId,
    p_cost: cost,
  })
  if (error) throw new Error(`크레딧 차감 오류: ${error.message}`)
  if (data === false) throw new Error('크레딧이 부족합니다.')
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
