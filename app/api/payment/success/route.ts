import { NextRequest, NextResponse } from 'next/server'
import { addCredits } from '@/lib/credits'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const paymentKey = searchParams.get('paymentKey')
  const orderId = searchParams.get('orderId')
  const amount = Number(searchParams.get('amount'))
  const credits = Number(searchParams.get('credits') ?? 0)
  const regenTickets = Number(searchParams.get('regen_tickets') ?? 0)
  const base = process.env.NEXT_PUBLIC_BASE_URL!

  if (!paymentKey || !orderId || !amount || (!credits && !regenTickets)) {
    return NextResponse.redirect(`${base}/projects?payment=failed&reason=missing_params`)
  }

  // 1. 토스페이먼츠 결제 승인
  const confirm = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  })

  if (!confirm.ok) {
    const err = await confirm.json()
    return NextResponse.redirect(
      `${base}/projects?payment=failed&reason=${err.code ?? 'confirm_failed'}`
    )
  }

  // 2. orderId에서 userId 추출 (형식: order_{userId}_{timestamp} 또는 regen_{userId}_{timestamp})
  const parts = orderId.split('_')
  const userId = parts[1]
  if (!userId) {
    return NextResponse.redirect(`${base}/projects?payment=failed&reason=invalid_order`)
  }

  try {
    if (credits > 0) {
      // 3a. 크레딧 지급
      await addCredits(userId, credits, `purchase:${orderId}`)
      return NextResponse.redirect(`${base}/projects?payment=success&credits=${credits}`)
    } else {
      // 3b. 재생성권 지급
      const supabase = getServiceClient()
      const { data } = await supabase
        .from('user_credits')
        .select('regen_tickets')
        .eq('user_id', userId)
        .single()
      const current = (data as { regen_tickets: number } | null)?.regen_tickets ?? 0
      await supabase
        .from('user_credits')
        .update({ regen_tickets: current + regenTickets })
        .eq('user_id', userId)

      return NextResponse.redirect(`${base}/projects?payment=success&regen=${regenTickets}`)
    }
  } catch {
    return NextResponse.redirect(`${base}/projects?payment=failed&reason=grant_failed`)
  }
}
