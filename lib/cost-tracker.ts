import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 가격 (per token, USD)
const PRICING = {
  openai:    { input: 0.0000025, output: 0.000010 },   // GPT-4o
  anthropic: { input: 0.000015,  output: 0.000075 },   // Claude Opus
  gemini:    { per_image: 0.04 },                      // Gemini image gen
} as const

interface CostParams {
  userId: string
  projectId: string
  provider: 'openai' | 'anthropic' | 'gemini'
  operation: string
  inputTokens?: number
  outputTokens?: number
  imageCount?: number
}

export async function trackCost(params: CostParams): Promise<void> {
  try {
    const p = PRICING[params.provider]
    let costUsd = 0

    if ('per_image' in p) {
      costUsd = p.per_image * (params.imageCount ?? 1)
    } else {
      costUsd = (params.inputTokens ?? 0) * p.input
               + (params.outputTokens ?? 0) * p.output
    }

    await supabase.from('api_cost_log').insert({
      user_id:       params.userId,
      project_id:    params.projectId,
      provider:      params.provider,
      operation:     params.operation,
      input_tokens:  params.inputTokens ?? null,
      output_tokens: params.outputTokens ?? null,
      image_count:   params.imageCount ?? null,
      cost_usd:      costUsd,
    })
  } catch (err) {
    // 비용 기록 실패는 메인 플로우에 영향 주지 않음
    console.error('[cost-tracker] 기록 실패:', err)
  }
}
