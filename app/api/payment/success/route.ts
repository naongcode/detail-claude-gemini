import { NextRequest, NextResponse } from 'next/server'
import { addCredits } from '@/lib/credits'
import { getClient } from '@/lib/supabase-client'
import { notify } from '@/lib/notify'

// 서버 사이드 금액 → 지급량 맵핑 (purchase/page.tsx의 PACKAGES와 반드시 동기화)
const CREDIT_AMOUNT_MAP: Record<number, number> = {
  20000: 1,
  50000: 3,
  150000: 10,
}
const REGEN_AMOUNT_MAP: Record<number, number> = {
  3000: 5,
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const paymentKey = searchParams.get('paymentKey')
  const orderId    = searchParams.get('orderId')
  const amount     = Number(searchParams.get('amount'))
  const base       = process.env.NEXT_PUBLIC_BASE_URL!

  if (!paymentKey || !orderId || !amount) {
    console.error(`[결제] 필수 파라미터 누락 orderId=${orderId} amount=${amount}`)
    return NextResponse.redirect(`${base}/projects?payment=failed&reason=missing_params`)
  }

  // orderId 형식 검증 (order_{uuid}_{ts} 또는 regen_{uuid}_{ts})
  const isCredit = orderId.startsWith('order_')
  const isRegen  = orderId.startsWith('regen_')
  if (!isCredit && !isRegen) {
    console.error(`[결제] 잘못된 orderId 형식: ${orderId}`)
    return NextResponse.redirect(`${base}/projects?payment=failed&reason=invalid_order`)
  }

  // 1. Toss 결제 승인
  const confirm = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  })

  const confirmData = await confirm.json() as { totalAmount?: number; code?: string; message?: string }

  if (!confirm.ok) {
    console.error(`[결제 실패] orderId=${orderId} amount=${amount} code=${confirmData.code} msg=${confirmData.message}`)
    notify({ message: `결제 승인 실패: ${confirmData.code} / orderId=${orderId}`, status: 'error' }).catch(() => {})
    return NextResponse.redirect(`${base}/projects?payment=failed&reason=${confirmData.code ?? 'confirm_failed'}`)
  }

  // 2. Toss 승인 응답의 금액으로 지급량 결정 (URL 파라미터 무시)
  const confirmedAmount = confirmData.totalAmount ?? 0
  const credits      = isCredit ? (CREDIT_AMOUNT_MAP[confirmedAmount] ?? 0) : 0
  const regenTickets = isRegen  ? (REGEN_AMOUNT_MAP[confirmedAmount]  ?? 0) : 0

  if (!credits && !regenTickets) {
    console.error(`[결제 오류] 매핑 불가 금액: ${confirmedAmount}원 orderId=${orderId}`)
    notify({ message: `결제 금액 매핑 실패: ${confirmedAmount}원 / orderId=${orderId}`, status: 'error' }).catch(() => {})
    return NextResponse.redirect(`${base}/projects?payment=failed&reason=unknown_amount`)
  }

  // 3. orderId에서 userId 추출 (UUID에는 언더스코어 없음: order_{uuid}_{ts})
  const parts  = orderId.split('_')
  const userId = parts[1]
  if (!userId) {
    console.error(`[결제 오류] userId 추출 실패: orderId=${orderId}`)
    return NextResponse.redirect(`${base}/projects?payment=failed&reason=invalid_order`)
  }

  try {
    if (credits > 0) {
      // addCredits RPC 내부에서 credit_transactions에 reason='purchase:{orderId}' 삽입
      // → unique index로 중복 결제 자동 방지
      await addCredits(userId, credits, `purchase:${orderId}`)
      console.log(`[결제 완료] 크레딧 +${credits} userId=${userId} orderId=${orderId} amount=${confirmedAmount}`)
      notify({
        message: `결제 완료 💰 크레딧 +${credits}개 / ${confirmedAmount.toLocaleString()}원\nuserId=${userId} orderId=${orderId}`,
        status: 'success',
        userId,
      }).catch(() => {})
      return NextResponse.redirect(`${base}/projects?payment=success&credits=${credits}`)
    } else {
      await addRegenTickets(userId, regenTickets)
      console.log(`[결제 완료] 재생성권 +${regenTickets} userId=${userId} orderId=${orderId} amount=${confirmedAmount}`)
      notify({
        message: `결제 완료 🔄 재생성권 +${regenTickets}장 / ${confirmedAmount.toLocaleString()}원\nuserId=${userId} orderId=${orderId}`,
        status: 'success',
        userId,
      }).catch(() => {})
      return NextResponse.redirect(`${base}/projects?payment=success&regen=${regenTickets}`)
    }
  } catch (err) {
    console.error(`[결제 지급 오류] orderId=${orderId} userId=${userId} err=${String(err)}`)
    notify({ message: `결제 지급 실패: ${String(err)}\norderId=${orderId} userId=${userId}`, status: 'error' }).catch(() => {})
    return NextResponse.redirect(`${base}/projects?payment=failed&reason=grant_failed`)
  }
}

async function addRegenTickets(userId: string, delta: number): Promise<void> {
  const supabase = getClient()
  const { error } = await supabase.rpc('add_regen_tickets', {
    p_user_id: userId,
    p_delta:   delta,
  })
  if (error) throw new Error(`재생성권 지급 오류: ${error.message}`)
}
