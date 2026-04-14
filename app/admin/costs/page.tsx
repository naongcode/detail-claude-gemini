'use client'

import { useEffect, useState } from 'react'

interface CostData {
  providerTotals: Record<string, number>
  opTotals: Record<string, number>
  dailyMap: Record<string, Record<string, number>>
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Claude (Anthropic)',
  openai: 'GPT-4o (OpenAI)',
  gemini: 'Gemini (Google)',
}

const OP_LABELS: Record<string, string> = {
  brief: '브리프 생성',
  research: '리서치 분석',
  page_design: '페이지 디자인 (Claude)',
  image: '이미지 생성 (Gemini)',
}

export default function CostsPage() {
  const [data, setData] = useState<CostData | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    setData(null)
    fetch(`/api/admin/costs?days=${days}`).then(r => r.json()).then(setData)
  }, [days])

  const fmt = (usd: number) => `$${Number(usd).toFixed(4)}`
  const totalCost = data
    ? Object.values(data.providerTotals).reduce((a, b) => a + b, 0)
    : 0

  const sortedDays = data ? Object.keys(data.dailyMap).sort().reverse() : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">API 비용</h1>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value={7}>최근 7일</option>
          <option value={30}>최근 30일</option>
          <option value={90}>최근 90일</option>
        </select>
      </div>

      {!data ? (
        <p className="text-slate-400 text-sm">로딩 중...</p>
      ) : (
        <div className="space-y-6">
          {/* Provider별 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800 mb-4">
              Provider별 합계 <span className="text-slate-400 font-normal text-sm">총 {fmt(totalCost)}</span>
            </h2>
            <div className="space-y-3">
              {Object.entries(data.providerTotals).map(([provider, cost]) => (
                <div key={provider} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{PROVIDER_LABELS[provider] ?? provider}</span>
                  <div className="flex items-center gap-4">
                    <div className="w-40 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${totalCost > 0 ? (cost / totalCost) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono text-slate-800 w-24 text-right">{fmt(cost)}</span>
                  </div>
                </div>
              ))}
              {Object.keys(data.providerTotals).length === 0 && (
                <p className="text-sm text-slate-400">데이터 없음</p>
              )}
            </div>
          </div>

          {/* Operation별 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Operation별 합계</h2>
            <div className="space-y-2">
              {Object.entries(data.opTotals).map(([op, cost]) => (
                <div key={op} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-700">{OP_LABELS[op] ?? op}</span>
                  <span className="text-sm font-mono text-slate-800">{fmt(cost)}</span>
                </div>
              ))}
              {Object.keys(data.opTotals).length === 0 && (
                <p className="text-sm text-slate-400">데이터 없음</p>
              )}
            </div>
          </div>

          {/* 일별 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800 mb-4">일별 상세</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">날짜</th>
                    <th className="pb-2 font-medium">Anthropic</th>
                    <th className="pb-2 font-medium">OpenAI</th>
                    <th className="pb-2 font-medium">Gemini</th>
                    <th className="pb-2 font-medium text-right">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDays.map(day => {
                    const d = data.dailyMap[day]
                    const total = Object.values(d).reduce((a, b) => a + b, 0)
                    return (
                      <tr key={day} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 text-slate-600">{day}</td>
                        <td className="py-2 font-mono text-slate-700">{fmt(d.anthropic ?? 0)}</td>
                        <td className="py-2 font-mono text-slate-700">{fmt(d.openai ?? 0)}</td>
                        <td className="py-2 font-mono text-slate-700">{fmt(d.gemini ?? 0)}</td>
                        <td className="py-2 font-mono font-semibold text-slate-900 text-right">{fmt(total)}</td>
                      </tr>
                    )
                  })}
                  {sortedDays.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400">데이터 없음</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
