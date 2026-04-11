'use client'

import { useEffect, useState, useRef } from 'react'
import { PageDesign } from '@/lib/types'

interface Props {
  projectId: string
  onStatusChange: () => void
  onTabChange: (tab: string) => void
}

type SaveState = 'idle' | 'saving' | 'done' | 'error'

export default function LayoutTab({ projectId, onStatusChange, onTabChange }: Props) {
  const [pageDesign, setPageDesign] = useState<PageDesign | null>(null)
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveMsg, setSaveMsg] = useState('')
  const originalRef = useRef('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/projects/${projectId}/data/layout`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: PageDesign | null) => {
        setPageDesign(data)
        const h = data?.html ?? ''
        setHtml(h)
        originalRef.current = h
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [projectId])

  const isDirty = html !== originalRef.current

  const handleApply = async () => {
    if (!pageDesign || !isDirty) return
    setSaveState('saving')
    setSaveMsg('')
    try {
      const res = await fetch(`/api/projects/${projectId}/data?key=pageDesign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pageDesign, html }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '저장 실패')
      originalRef.current = html
      setPageDesign((prev) => prev ? { ...prev, html } : prev)
      setSaveState('done')
      setSaveMsg(data.rendered ? '저장 & 렌더링 완료' : '저장 완료 (렌더링 실패)')
      onStatusChange()
      if (data.rendered) setTimeout(() => onTabChange('result'), 1000)
    } catch (err) {
      setSaveState('error')
      setSaveMsg(String(err))
    } finally {
      setTimeout(() => { setSaveState('idle'); setSaveMsg('') }, 3000)
    }
  }

  if (loading) return (
    <div className="p-6 flex items-center gap-3 text-slate-400">
      <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
      불러오는 중...
    </div>
  )

  if (!pageDesign) return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🗂️</span>
        </div>
        <p className="font-semibold text-slate-700 mb-1">페이지 디자인이 없습니다</p>
        <p className="text-sm text-slate-400">파이프라인을 실행하면 Claude가 자동으로 설계합니다</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3">
        <span className="text-sm text-slate-500 flex-1">
          HTML / CSS 수정 후 적용하면 최종 이미지에 반영됩니다
        </span>
        <span className="text-xs text-slate-400">{html.length.toLocaleString()}자</span>
        {isDirty && (
          <>
            <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 font-medium shrink-0">
              미저장 변경
            </span>
            <button
              onClick={() => setHtml(originalRef.current)}
              className="text-xs text-slate-500 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors shrink-0"
            >
              초기화
            </button>
          </>
        )}
        {saveMsg && (
          <span className={`text-xs font-medium shrink-0 ${saveState === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {saveMsg}
          </span>
        )}
        <button
          onClick={handleApply}
          disabled={!isDirty || saveState === 'saving'}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 ${
            saveState === 'done'   ? 'bg-green-500 text-white' :
            saveState === 'error'  ? 'bg-red-500 text-white' :
            saveState === 'saving' ? 'bg-blue-400 text-white opacity-70' :
            isDirty                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' :
                                     'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {saveState === 'saving' ? (
            <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />적용 중...</>
          ) : saveState === 'done' ? '✓ 완료'
            : saveState === 'error' ? '⚠ 오류'
            : '▶ 저장 & 적용'}
        </button>
      </div>

      {/* HTML editor */}
      <div className="flex-1 p-4">
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          spellCheck={false}
          className="w-full h-full min-h-150 font-mono text-xs bg-slate-900 text-emerald-300 rounded-xl p-4 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
        />
      </div>
    </div>
  )
}
