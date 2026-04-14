'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

const PACKAGES = [
  {
    label: '1개',
    credits: 1,
    amount: 20000,
    pricePerCredit: '개당 ₩20,000',
    highlight: false,
    desc: '가볍게 한 번 써보기',
  },
  {
    label: '3개',
    credits: 3,
    amount: 50000,
    pricePerCredit: '개당 ₩16,667',
    highlight: true,
    desc: '가장 인기 있는 패키지',
    badge: '추천',
  },
  {
    label: '10개',
    credits: 10,
    amount: 150000,
    pricePerCredit: '개당 ₩15,000',
    highlight: false,
    desc: '여러 제품을 운영하는 셀러',
  },
]

const REGEN_PACKAGES = [
  {
    label: '재생성권 5회',
    regenTickets: 5,
    amount: 3000,
    desc: '마음에 안 드는 이미지만 골라서 다시 생성',
  },
]

export default function PurchasePage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY

  const handlePurchase = async (pkg: typeof PACKAGES[0]) => {
    if (!tossClientKey) return
    setLoading(`credit_${pkg.credits}`)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk')
      const toss = await loadTossPayments(tossClientKey)
      const orderId = `order_${user.id}_${Date.now()}`

      await toss.payment({ customerKey: user.id }).requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: pkg.amount },
        orderId,
        orderName: `상세페이지 AI 크레딧 ${pkg.credits}개`,
        successUrl: `${location.origin}/api/payment/success?credits=${pkg.credits}`,
        failUrl: `${location.origin}/purchase?payment=failed`,
      })
    } catch {
      setLoading(null)
    }
  }

  const handleRegenPurchase = async (pkg: typeof REGEN_PACKAGES[0]) => {
    if (!tossClientKey) return
    setLoading(`regen_${pkg.regenTickets}`)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk')
      const toss = await loadTossPayments(tossClientKey)
      const orderId = `regen_${user.id}_${Date.now()}`

      await toss.payment({ customerKey: user.id }).requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: pkg.amount },
        orderId,
        orderName: `재생성권 ${pkg.regenTickets}회`,
        successUrl: `${location.origin}/api/payment/success?regen_tickets=${pkg.regenTickets}`,
        failUrl: `${location.origin}/purchase?payment=failed`,
      })
    } catch {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/projects" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">
            ← 돌아가기
          </Link>
          <span className="text-slate-200">|</span>
          <span className="font-bold text-slate-800">크레딧 충전</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 flex-1 w-full">
        {/* 설명 */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">크레딧 충전</h1>
          <p className="text-slate-500 text-sm">
            크레딧 1개로 상세페이지 1개를 완성할 수 있습니다.<br />
            디자이너 외주 비용의 10분의 1 이하.
          </p>
        </div>

        {/* 패키지 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {PACKAGES.map((pkg) => (
            <div
              key={pkg.credits}
              className={`rounded-2xl p-6 border flex flex-col ${
                pkg.highlight
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-lg font-extrabold ${pkg.highlight ? 'text-white' : 'text-slate-900'}`}>
                  {pkg.label}
                </span>
                {pkg.badge && (
                  <span className="text-xs bg-white text-blue-600 font-bold px-2 py-0.5 rounded-full">
                    {pkg.badge}
                  </span>
                )}
              </div>
              <p className={`text-xs mb-4 ${pkg.highlight ? 'text-blue-200' : 'text-slate-400'}`}>{pkg.desc}</p>

              <div className="mt-auto">
                <p className={`text-3xl font-extrabold mb-0.5 ${pkg.highlight ? 'text-white' : 'text-slate-900'}`}>
                  ₩{pkg.amount.toLocaleString()}
                </p>
                <p className={`text-xs mb-4 ${pkg.highlight ? 'text-blue-200' : 'text-slate-400'}`}>
                  {pkg.pricePerCredit}
                </p>

                {tossClientKey ? (
                  <button
                    onClick={() => handlePurchase(pkg)}
                    disabled={loading !== null}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${
                      pkg.highlight
                        ? 'bg-white text-blue-600 hover:bg-blue-50'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {loading === `credit_${pkg.credits}` ? '처리 중...' : '구매하기'}
                  </button>
                ) : (
                  <div className={`w-full py-2.5 rounded-xl text-sm text-center font-medium ${
                    pkg.highlight ? 'bg-blue-500 text-blue-200' : 'bg-slate-100 text-slate-400'
                  }`}>
                    결제 준비 중
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 재생성권 */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-1">재생성권</h2>
          <p className="text-sm text-slate-500 mb-4">마음에 안 드는 섹션 이미지를 골라서 다시 생성할 수 있습니다. 프로젝트마다 5회 무료 제공.</p>
          {REGEN_PACKAGES.map((pkg) => (
            <div key={pkg.regenTickets} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
              <div>
                <p className="font-bold text-slate-900">{pkg.label}</p>
                <p className="text-sm text-slate-400 mt-0.5">{pkg.desc}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-extrabold text-slate-900">₩{pkg.amount.toLocaleString()}</p>
                {tossClientKey ? (
                  <button
                    onClick={() => handleRegenPurchase(pkg)}
                    disabled={loading !== null}
                    className="mt-1.5 text-sm bg-slate-800 text-white px-5 py-2 rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-colors font-semibold"
                  >
                    {loading === `regen_${pkg.regenTickets}` ? '처리 중...' : '구매하기'}
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">결제 준비 중</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 안내 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 text-sm text-slate-500">
          <p>• 결제 후 크레딧은 즉시 지급됩니다.</p>
          <p>• 카드, 카카오페이, 네이버페이, 토스페이, 계좌이체 등 모든 결제수단 지원.</p>
<p>• 문의: <a href="mailto:support@example.com" className="text-blue-600 hover:underline">support@example.com</a></p>
        </div>
      </div>
    </div>
  )
}
