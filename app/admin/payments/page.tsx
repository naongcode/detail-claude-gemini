'use client'

import { useEffect, useState, useCallback } from 'react'

interface Transaction {
  id: number
  user_id: string
  email: string
  delta: number
  reason: string
  project_id: string | null
  created_at: string
}

interface PaymentsData {
  transactions: Transaction[]
  total: number
  page: number
  stats: {
    totalPurchased: number
    purchaseCount: number
  }
}

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  brief_generation:    { label: '크레딧 사용', color: 'bg-slate-100 text-slate-600' },
  pipeline_run:        { label: '크레딧 사용 (구)', color: 'bg-slate-100 text-slate-500' },
  regen_use:           { label: '재생성 사용', color: 'bg-purple-100 text-purple-700' },
  regen_use_free:      { label: '재생성 (무료)', color: 'bg-purple-100 text-purple-600' },
  regen_use_purchased: { label: '재생성 (구매권)', color: 'bg-violet-100 text-violet-700' },
  regen_purchase:      { label: '재생성권 구매', color: 'bg-blue-100 text-blue-700' },
  kakao_verified_bonus:{ label: '카카오 인증 보너스', color: 'bg-green-100 text-green-700' },
  '관리자 지급':       { label: '관리자 지급', color: 'bg-amber-100 text-amber-700' },
  '관리자 차감':       { label: '관리자 차감', color: 'bg-red-100 text-red-700' },
}

function reasonBadge(reason: string) {
  if (reason?.startsWith('purchase:')) {
    const orderId = reason.replace('purchase:', '')
    return (
      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
        구매 <span className="opacity-60 font-normal">{orderId.slice(0, 12)}{orderId.length > 12 ? '…' : ''}</span>
      </span>
    )
  }
  const meta = REASON_LABELS[reason]
  if (meta) {
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
    )
  }
  return (
    <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full">{reason ?? '—'}</span>
  )
}

const FILTER_OPTIONS = [
  { value: 'all',              label: '전체' },
  { value: 'purchase',         label: '결제 구매' },
  { value: 'usage',            label: '크레딧 사용' },
  { value: 'regen',            label: '재생성 전체' },
  { value: 'regen_free',       label: '재생성 (무료)' },
  { value: 'regen_purchased',  label: '재생성 (구매권)' },
  { value: 'admin',            label: '관리자 수정' },
  { value: 'bonus',            label: '인증 보너스' },
]

export default function PaymentsPage() {
  const [data, setData] = useState<PaymentsData | null>(null)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/payments?page=${page}&reason=${filter}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [page, filter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleFilterChange = (value: string) => {
    setFilter(value)
    setPage(1)
  }

  const totalPages = data ? Math.ceil(data.total / 50) : 1

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">결제 · 크레딧 로그</h1>

      {/* 통계 카드 */}
      {data && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-500">총 구매 건수</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{data.stats.purchaseCount.toLocaleString()}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-500">총 구매 크레딧</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{data.stats.totalPurchased.toLocaleString()}<span className="text-sm font-normal text-slate-400 ml-1">크레딧</span></p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-500">조회된 항목</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{data.total.toLocaleString()}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-500">현재 필터</p>
            <p className="text-lg font-semibold text-slate-700 mt-1">
              {FILTER_OPTIONS.find(f => f.value === filter)?.label ?? filter}
            </p>
          </div>
        </div>
      )}

      {/* 필터 + 테이블 */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-wrap">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleFilterChange(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                filter === opt.value
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={fetchData}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            새로고침
          </button>
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm px-4 py-8 text-center">로딩 중...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-500 border-b border-slate-200">
                <th className="px-4 py-3 font-medium">시각</th>
                <th className="px-4 py-3 font-medium">이메일</th>
                <th className="px-4 py-3 font-medium">유형</th>
                <th className="px-4 py-3 font-medium text-center">크레딧</th>
                <th className="px-4 py-3 font-medium">프로젝트</th>
              </tr>
            </thead>
            <tbody>
              {(data?.transactions ?? []).map(tx => (
                <tr key={tx.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                    {new Date(tx.created_at).toLocaleString('ko-KR', {
                      month: '2-digit', day: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium max-w-45 truncate">
                    {tx.email}
                  </td>
                  <td className="px-4 py-3">
                    {reasonBadge(tx.reason)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold ${tx.delta > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {tx.delta > 0 ? '+' : ''}{tx.delta}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono truncate max-w-30">
                    {tx.project_id ?? '—'}
                  </td>
                </tr>
              ))}
              {(data?.transactions ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">항목 없음</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← 이전
            </button>
            <span className="text-xs text-slate-400">
              {page} / {totalPages} 페이지 ({data?.total ?? 0}건)
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              다음 →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
