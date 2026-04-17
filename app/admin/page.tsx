'use client'

import { useEffect, useState } from 'react'

interface Stats {
  todayCostUsd: number
  monthCostUsd: number
  totalUsers: number
  todayPipelines: number
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats)
  }, [])

  const fmt = (usd: number) => `$${usd.toFixed(4)}`

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">개요</h1>

      {!stats ? (
        <p className="text-slate-400 text-sm">로딩 중...</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="오늘 API 비용" value={fmt(stats.todayCostUsd)} sub="USD" />
          <StatCard label="이번 달 API 비용" value={fmt(stats.monthCostUsd)} sub="USD" />
          <StatCard label="총 사용자" value={String(stats.totalUsers)} sub="명" />
          <StatCard label="오늘 파이프라인 실행" value={String(stats.todayPipelines)} sub="건" />
        </div>
      )}

      <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-3">빠른 링크</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/admin/costs" className="text-sm text-blue-600 hover:underline">API 비용 상세 →</a>
          <a href="/admin/users" className="text-sm text-blue-600 hover:underline">사용자 관리 →</a>
          <a href="/admin/payments" className="text-sm text-blue-600 hover:underline">결제 · 크레딧 로그 →</a>
        </div>
      </div>
    </div>
  )
}
