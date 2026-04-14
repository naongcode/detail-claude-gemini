'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

const PACKAGES = [
  { label: '1개',  credits: 1,  amount: 20000,  pricePerCredit: '개당 ₩20,000' },
  { label: '3개',  credits: 3,  amount: 50000,  pricePerCredit: '개당 ₩16,667', highlight: true },
  { label: '10개', credits: 10, amount: 150000, pricePerCredit: '개당 ₩15,000' },
]

interface Props {
  onClose: () => void
}

export default function CreditModal({ onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY

  const handlePurchase = async (pkg: typeof PACKAGES[0]) => {
    if (!tossClientKey) return
    setLoading(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk')
      const toss = await loadTossPayments(tossClientKey)
      const orderId = `order_${user.id}_${Date.now()}`

      await toss.payment({ customerKey: user.id }).requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: pkg.amount },
        orderId,
        orderName: `크레딧 ${pkg.credits}개`,
        successUrl: `${location.origin}/api/payment/success?credits=${pkg.credits}`,
        failUrl: `${location.origin}/projects?payment=failed`,
      })
      // requestPayment 이후는 리디렉트로 실행 안 됨
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-bold text-slate-900">크레딧 충전</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          크레딧 1개로 상세페이지 1개를 완성할 수 있습니다.
        </p>

        <div className="space-y-2 mb-5">
          {PACKAGES.map((pkg) => (
            <div
              key={pkg.credits}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                pkg.highlight ? 'border-blue-400 bg-blue-50' : 'border-slate-200'
              }`}
            >
              <div>
                <span className="font-semibold text-slate-800">{pkg.label}</span>
                <span className="ml-2 text-sm text-slate-500">크레딧 {pkg.credits}개</span>
                {pkg.highlight && (
                  <span className="ml-2 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">추천</span>
                )}
                <p className="text-xs text-slate-400 mt-0.5">{pkg.pricePerCredit}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">₩{pkg.amount.toLocaleString()}</p>
                {tossClientKey ? (
                  <button
                    onClick={() => handlePurchase(pkg)}
                    disabled={loading}
                    className="mt-1 text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >
                    구매
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">준비 중</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center space-y-1.5">
          <Link
            href="/purchase"
            onClick={onClose}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            전체 구매 페이지에서 보기 →
          </Link>
          <p className="text-xs text-slate-400">
            {tossClientKey
              ? '카드, 카카오페이, 네이버페이, 계좌이체 등 지원'
              : '결제 시스템 연동 작업 중입니다. 곧 이용 가능합니다.'}
          </p>
        </div>
      </div>
    </div>
  )
}
