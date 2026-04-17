'use client'

import { useState, useEffect, useRef } from 'react'
import type { TextBlock } from '@/app/api/projects/[id]/html-text/route'
import { PageDesign } from '@/lib/types'
import SectionImage from '@/components/ui/SectionImage'

interface Props {
  projectId: string
  onStatusChange: () => void
}

const TAG_BADGE: Record<string, string> = {
  h1: 'bg-purple-100 text-purple-700',
  h2: 'bg-blue-100 text-blue-700',
  h3: 'bg-cyan-100 text-cyan-700',
  h4: 'bg-teal-100 text-teal-700',
  h5: 'bg-teal-100 text-teal-600',
  p:  'bg-slate-100 text-slate-500',
  li: 'bg-green-100 text-green-700',
  button: 'bg-orange-100 text-orange-700',
  a:  'bg-yellow-100 text-yellow-700',
  td: 'bg-pink-100 text-pink-700',
  th: 'bg-pink-100 text-pink-800',
  span: 'bg-slate-100 text-slate-400',
}

function sectionLabel(key: string): string {
  const map: Record<string, string> = {
    hero: '히어로', pain: '고통 공감', pain_point: '고통 공감',
    problem: '문제 원인', story: '스토리', solution: '해결책',
    solution_intro: '해결책 소개', how_it_works: '작동 방식',
    usage: '사용법', features: '주요 기능', social_proof: '후기·증거',
    authority: '전문성', benefits: '혜택', risk_removal: '보장',
    comparison: '비교', before_after: '비포/애프터', final_cta: '최종 CTA',
    curriculum: '커리큘럼', ingredients: '성분', process: '프로세스',
    pricing: '가격', material: '소재', product_detail: '제품 상세',
    case_study: '케이스 스터디', faq: 'FAQ', footer: '푸터',
  }
  if (map[key]) return map[key]
  for (const [k, v] of Object.entries(map)) {
    if (key.toLowerCase().includes(k)) return v
  }
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

type TextSaveState = 'idle' | 'saving' | 'done' | 'error'

export default function TextEditTab({ projectId, onStatusChange }: Props) {
  const [pageDesign, setPageDesign] = useState<PageDesign | null>(null)
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([])
  const [sectionImages, setSectionImages] = useState<Record<string, string>>({})
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [imgTimestamp, setImgTimestamp] = useState(Date.now())

  const [textSaveState, setTextSaveState] = useState<TextSaveState>('idle')
  const [changedCount, setChangedCount] = useState(0)
  const originalRef = useRef<Record<string, string>>({})

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/projects/${projectId}/data/layout`).then(r => r.ok ? r.json() : null),
      fetch(`/api/projects/${projectId}/html-text`).then(r => r.ok ? r.json() : { blocks: [], sectionImages: {} }),
    ]).then(([design, { blocks, sectionImages: si }]) => {
      setPageDesign(design)
      setTextBlocks(blocks ?? [])
      setSectionImages(si ?? {})
      const originals: Record<string, string> = {}
      ;(blocks ?? []).forEach((b: TextBlock) => { originals[b.eid] = b.text })
      originalRef.current = originals
      setEdits({})
      setChangedCount(0)
      setLoading(false)
    })
  }, [projectId])

  // Group text blocks by section (preserves HTML order)
  const blocksBySection: Record<string, TextBlock[]> = {}
  const sectionOrder: string[] = []
  for (const b of textBlocks) {
    if (!blocksBySection[b.section]) {
      blocksBySection[b.section] = []
      sectionOrder.push(b.section)
    }
    blocksBySection[b.section].push(b)
  }

  const handleTextChange = (eid: string, value: string) => {
    setEdits(prev => {
      const next = { ...prev, [eid]: value }
      const count = Object.entries(next).filter(([k, v]) => v !== originalRef.current[k]).length
      setChangedCount(count)
      return next
    })
  }

  const handleTextSave = async () => {
    const updates = Object.entries(edits)
      .filter(([k, v]) => v !== originalRef.current[k])
      .map(([eid, text]) => ({ eid, text }))
    if (updates.length === 0) return
    setTextSaveState('saving')
    try {
      const res = await fetch(`/api/projects/${projectId}/html-text`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('저장 실패')
      updates.forEach(({ eid, text }) => { originalRef.current[eid] = text })
      setChangedCount(0)
      setTextSaveState('done')
      onStatusChange()
      setImgTimestamp(Date.now())
      setTimeout(() => setTextSaveState('idle'), 2500)
    } catch {
      setTextSaveState('error')
      setTimeout(() => setTextSaveState('idle'), 3000)
    }
  }

  const fileUrl = (path: string) => `/api/projects/${projectId}/files/${path}?t=${imgTimestamp}`

  if (loading) return (
    <div className="p-6 flex items-center gap-3 text-slate-400">
      <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
      불러오는 중...
    </div>
  )

  if (!pageDesign) return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
        <span className="text-4xl">🗂️</span>
        <p className="font-semibold text-slate-700 mt-4 mb-1">생성된 페이지가 없습니다</p>
        <p className="text-sm text-slate-400">파이프라인을 먼저 실행해 주세요</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3">
        <span className="text-sm text-slate-500 flex-1">
          텍스트를 수정하고 저장하면 최종 이미지가 다시 렌더링됩니다
        </span>
        {changedCount > 0 && (
          <span className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 shrink-0">
            텍스트 {changedCount}개 수정됨
          </span>
        )}
        <button
          onClick={handleTextSave}
          disabled={changedCount === 0 || textSaveState === 'saving'}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 ${
            textSaveState === 'done'   ? 'bg-green-500 text-white' :
            textSaveState === 'error'  ? 'bg-red-500 text-white' :
            textSaveState === 'saving' ? 'bg-blue-400 text-white opacity-70' :
            changedCount > 0           ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' :
                                         'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {textSaveState === 'saving' ? (
            <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />저장 중...</>
          ) : textSaveState === 'done' ? '✓ 저장 완료'
            : textSaveState === 'error' ? '⚠ 오류'
            : '💾 텍스트 저장 & 렌더'}
        </button>
      </div>

      {/* Section list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
        {sectionOrder.map((sectionKey, idx) => {
          const sectionBlocks = blocksBySection[sectionKey]
          const imageId = sectionImages[sectionKey]
          const imgSrc = imageId ? fileUrl(`sections/${imageId}.png`) : null
          const sectionChanges = sectionBlocks.filter(
            b => (edits[b.eid] ?? b.text) !== originalRef.current[b.eid]
          ).length

          return (
            <div key={sectionKey} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Section header */}
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 flex-wrap">
                <span className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-500 text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="font-semibold text-slate-800 text-sm">{sectionLabel(sectionKey)}</span>
                <span className="text-xs text-slate-400 font-mono">({sectionKey})</span>
                {sectionChanges > 0 && (
                  <span className="ml-auto text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                    {sectionChanges}개 수정
                  </span>
                )}
              </div>

              {/* Body: 2-컬럼 — 좌측 이미지(읽기 전용), 우측 텍스트 */}
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                {/* Left: section image (read-only) */}
                <div>
                  <SectionImage src={imgSrc} alt={sectionKey} />
                </div>

                {/* Right: text fields */}
                <div className="divide-y divide-slate-100">
                  {sectionBlocks.map(block => (
                    <TextRow
                      key={block.eid}
                      block={block}
                      value={edits[block.eid] ?? block.text}
                      original={originalRef.current[block.eid]}
                      onChange={handleTextChange}
                      onReset={() => handleTextChange(block.eid, originalRef.current[block.eid])}
                    />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface TextRowProps {
  block: TextBlock
  value: string
  original: string
  onChange: (eid: string, value: string) => void
  onReset: () => void
}

function TextRow({ block, value, original, onChange, onReset }: TextRowProps) {
  const isChanged = value !== original
  const badgeCls = TAG_BADGE[block.tag] ?? 'bg-slate-100 text-slate-400'
  return (
    <div className={`px-4 py-2.5 flex items-start gap-2.5 ${isChanged ? 'bg-amber-50' : ''}`}>
      <span className={`text-[10px] px-1.5 py-1 rounded font-bold uppercase tracking-wide shrink-0 mt-0.5 ${badgeCls}`}>
        {block.tag}
      </span>
      <div className="flex-1 min-w-0">
        {block.multiline ? (
          <textarea
            value={value}
            onChange={e => onChange(block.eid, e.target.value)}
            rows={Math.min(Math.max(2, Math.ceil(value.length / 40)), 5)}
            className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none resize-none leading-relaxed transition-colors ${
              isChanged ? 'border-amber-300 bg-white' : 'border-slate-200 bg-white focus:border-blue-400'
            }`}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={e => onChange(block.eid, e.target.value)}
            className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none transition-colors ${
              isChanged ? 'border-amber-300 bg-white' : 'border-slate-200 bg-white focus:border-blue-400'
            }`}
          />
        )}
      </div>
      {isChanged && (
        <button
          onClick={onReset}
          className="text-xs text-slate-400 hover:text-slate-600 underline shrink-0 mt-2"
        >
          되돌리기
        </button>
      )}
    </div>
  )
}
