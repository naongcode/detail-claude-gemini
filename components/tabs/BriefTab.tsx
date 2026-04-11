'use client'

import { useState, useEffect, useRef } from 'react'
import { ProductBrief, ProjectStatus, PipelineEvent, ImageRequest } from '@/lib/types'
import ProgressLog, { LogEntry } from '@/components/ui/ProgressLog'

interface Props {
  projectId: string
  projectStatus: ProjectStatus | null
  onStatusChange: () => void
  onTabChange: (tab: string) => void
}

const DEFAULT_LABELS: Record<string, string> = {
  product_name:      '제품/서비스명 *',
  one_liner:         '한 줄 핵심 설명 *',
  target_audience:   '핵심 타겟 고객 *',
  main_problem:      '핵심 문제/고통',
  key_benefit:       '핵심 혜택/결과',
  guarantee:         '보장 정책',
  'price.original':  '정가 (원)',
  'price.discounted':'할인가 (원)',
  'urgency.value':   '긴급성 문구',
  'brand_color.primary':   '브랜드 기본 컬러',
  'brand_color.secondary': '브랜드 보조 컬러',
  creator_bio:       '제작자/브랜드 소개',
  testimonials_raw:  '고객 후기 (줄바꿈으로 구분)',
  bonus_items_raw:   '보너스 항목 (줄바꿈으로 구분)',
}

const EMPTY_BRIEF: ProductBrief = {
  product_name: '',
  product_category: 'digital_product',
  one_liner: '',
  target_audience: '',
  main_problem: '',
  key_benefit: '',
  price: { original: '', discounted: '', currency: 'KRW' },
  urgency: { type: 'quantity', value: '' },
  testimonials_raw: '',
  testimonials: [],
  creator_bio: '',
  bonus_items_raw: '',
  bonus_items: [],
  guarantee: '',
  brand_color: { primary: '#2563EB', secondary: '#F59E0B' },
  extra_fields: [],
  field_labels: {},
}

export default function BriefTab({ projectId, projectStatus, onStatusChange, onTabChange }: Props) {
  const [brief, setBrief] = useState<ProductBrief>(EMPTY_BRIEF)
  const [description, setDescription] = useState('')
  const [autoFilling, setAutoFilling] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [photoList, setPhotoList] = useState<string[]>([])
  const [photoSaving, setPhotoSaving] = useState(false)
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => { fetchBrief(); fetchPhotos() }, [projectId])

  const fetchBrief = async () => {
    const res = await fetch(`/api/projects/${projectId}/brief`)
    if (res.ok) {
      const data = await res.json()
      if (data) setBrief({ ...EMPTY_BRIEF, ...data })
    }
  }

  const fetchPhotos = async () => {
    const res = await fetch(`/api/projects/${projectId}/photos`)
    if (res.ok) { const data = await res.json(); setPhotoList(data) }
  }

  const handleAutoFill = async () => {
    if (!description.trim()) return
    setAutoFilling(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/generate/brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      if (res.ok) {
        const data = await res.json()
        const withRaw = {
          ...data,
          testimonials_raw: Array.isArray(data.testimonials) ? data.testimonials.join('\n') : (data.testimonials_raw ?? ''),
          bonus_items_raw: Array.isArray(data.bonus_items) ? data.bonus_items.join('\n') : (data.bonus_items_raw ?? ''),
        }
        setBrief({ ...EMPTY_BRIEF, ...withRaw })
        onStatusChange()
      }
      else { const err = await res.json(); alert(`오류: ${err.error}`) }
    } catch (e) { alert(`오류: ${String(e)}`) }
    finally { setAutoFilling(false) }
  }

  const handleSaveBrief = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/brief`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brief),
      })
      if (res.ok) { setSavedMsg('저장 완료!'); onStatusChange(); setTimeout(() => setSavedMsg(''), 2000) }
    } finally { setSaving(false) }
  }

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setPhotoSaving(true)
    try {
      const { uploadPhotoFromBrowser } = await import('@/lib/supabase-browser')
      await Promise.all(Array.from(files).map((file) => uploadPhotoFromBrowser(projectId, file)))
      await fetchPhotos()
      onStatusChange()
    } catch (e) {
      alert(`업로드 실패: ${String(e)}`)
    } finally {
      setPhotoSaving(false)
    }
  }

  const handleDeletePhotos = async () => {
    const res = await fetch(`/api/projects/${projectId}/photos`, { method: 'DELETE' })
    if (res.ok) { await fetchPhotos(); onStatusChange() }
  }

  const handleRunPipeline = () => {
    if (pipelineRunning) return
    setLogs([])
    setPipelineRunning(true)
    let finished = false

    const es = new EventSource(`/api/projects/${projectId}/generate/pipeline`)
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const data: PipelineEvent = JSON.parse(event.data)
        if (data.type === 'step_done') return

        const type: LogEntry['type'] =
          data.type === 'error'        ? 'error' :
          data.type === 'done'         ? 'success' :
          data.type === 'design_ready' ? 'success' :
          data.type === 'step'         ? 'step' : 'info'
        const message =
          data.type === 'error'        ? `오류: ${data.message}` :
          data.type === 'done'         ? `✓ ${data.message}` :
          data.type === 'design_ready' ? `✓ ${data.message}` :
          `[${data.step}] ${data.message}`
        setLogs((prev) => [...prev, { message, type, timestamp: new Date() }])

        if (data.type === 'design_ready' && data.images) {
          finished = true
          es.close()
          // 설계 완료 → 이미지 개별 생성 시작
          runImageGeneration(data.images)
        }
        if (data.type === 'error') {
          finished = true
          es.close(); setPipelineRunning(false); onStatusChange()
        }
      } catch { /* ignore */ }
    }
    es.onerror = () => {
      if (!finished) {
        setLogs((prev) => [...prev, { message: 'SSE 연결 오류', type: 'error', timestamp: new Date() }])
        setPipelineRunning(false)
      }
      es.close()
    }
  }

  const runImageGeneration = async (images: ImageRequest[]) => {
    const total = images.length
    for (let i = 0; i < images.length; i++) {
      const { id: sectionId } = images[i]
      setLogs((prev) => [...prev, {
        message: `[${i + 4}] 이미지 생성 중: ${sectionId} (${i + 1}/${total})`,
        type: 'step',
        timestamp: new Date(),
      }])
      try {
        const res = await fetch(`/api/projects/${projectId}/generate/image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sectionId }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? '이미지 생성 실패')
        }
        onStatusChange()
      } catch (err) {
        setLogs((prev) => [...prev, { message: `오류: ${String(err)}`, type: 'error', timestamp: new Date() }])
        setPipelineRunning(false)
        return
      }
    }

    // 모든 이미지 완료 → 최종 렌더링
    setLogs((prev) => [...prev, { message: `[${total + 4}] HTML 조립 및 PNG 렌더링 중...`, type: 'step', timestamp: new Date() }])
    try {
      const res = await fetch(`/api/projects/${projectId}/generate/render`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? '렌더링 실패')
      }
      setLogs((prev) => [...prev, { message: '✓ 상세페이지 생성 완료!', type: 'success', timestamp: new Date() }])
      onStatusChange()
      onTabChange('result')
    } catch (err) {
      setLogs((prev) => [...prev, { message: `렌더링 오류: ${String(err)}`, type: 'error', timestamp: new Date() }])
    } finally {
      setPipelineRunning(false)
    }
  }

  const handleStopPipeline = () => { eventSourceRef.current?.close(); setPipelineRunning(false) }

  const update = (field: keyof ProductBrief, value: unknown) => setBrief((prev) => ({ ...prev, [field]: value }))
  const updateNested = (field: keyof ProductBrief, key: string, value: string) =>
    setBrief((prev) => ({ ...prev, [field]: { ...(prev[field] as Record<string, string>), [key]: value } }))

  const getLabel = (key: string) => brief.field_labels?.[key] ?? DEFAULT_LABELS[key] ?? key

  const pipelineSteps = [
    { label: '리서치',     done: projectStatus?.hasResearch ?? false },
    { label: '페이지 설계', done: projectStatus?.hasPageDesign ?? false },
    { label: '이미지 생성', done: (projectStatus?.imageGenerated ?? 0) > 0 && projectStatus?.imageGenerated === projectStatus?.imageTotal },
    { label: '최종 렌더',   done: projectStatus?.hasFinalPng ?? false },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">

      {/* Section: 제품사진 */}
      <Card>
        <SectionTitle icon="📷" title="제품사진 업로드" subtitle="Gemini가 실제 제품을 참조하여 이미지를 생성합니다 (선택)" />
        <div className="flex items-center gap-2 mt-4">
          <label className={`cursor-pointer text-sm px-4 py-2 rounded-xl font-medium border transition-colors ${photoSaving ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
            {photoSaving ? '업로드 중...' : '📁 사진 선택'}
            <input type="file" accept=".jpg,.jpeg,.png,.webp" multiple disabled={photoSaving} onChange={(e) => handlePhotoUpload(e.target.files)} className="hidden" />
          </label>
          <button
            onClick={handleDeletePhotos}
            disabled={photoList.length === 0}
            className="text-sm text-red-500 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            모두 삭제
          </button>
        </div>
        {photoList.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {photoList.map((name) => (
              <span key={name} className="flex items-center gap-1 bg-green-50 text-green-700 text-xs px-3 py-1.5 rounded-full border border-green-200">
                📷 {name}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Section: AI 자동완성 */}
      <Card className="bg-blue-50 border-blue-200">
        <SectionTitle icon="🤖" title="AI 자동 완성" subtitle="제품 설명 한 줄을 입력하면 AI가 모든 정보를 자동으로 채워줍니다" />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="예: 직장인을 위한 30분 아침 운동 루틴 온라인 강의 (초보자 대상)"
          className="w-full mt-4 border border-blue-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={3}
        />
        <button
          onClick={handleAutoFill}
          disabled={autoFilling || !description.trim()}
          className="mt-3 bg-blue-600 text-white text-sm px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors font-semibold"
        >
          {autoFilling ? '🤖 AI 분석 중...' : '🤖 AI로 자동 채우기'}
        </button>
      </Card>

      {/* Section: 제품 정보 폼 */}
      <Card>
        <SectionTitle icon="📝" title="제품 정보" subtitle="필수 항목을 입력하세요" />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={getLabel('product_name')} value={brief.product_name} onChange={(v) => update('product_name', v)} />
          <Field label={getLabel('one_liner')} value={brief.one_liner} onChange={(v) => update('one_liner', v)} />
          <Field label={getLabel('target_audience')} value={brief.target_audience} onChange={(v) => update('target_audience', v)} />
          <Field label={getLabel('main_problem')} value={brief.main_problem} onChange={(v) => update('main_problem', v)} />
          <Field label={getLabel('key_benefit')} value={brief.key_benefit} onChange={(v) => update('key_benefit', v)} />
          <Field label={getLabel('guarantee')} value={brief.guarantee ?? ''} onChange={(v) => update('guarantee', v)} />
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label={getLabel('price.original')} value={brief.price.original} onChange={(v) => updateNested('price', 'original', v)} placeholder="990000" />
          <Field label={getLabel('price.discounted')} value={brief.price.discounted} onChange={(v) => updateNested('price', 'discounted', v)} placeholder="490000" />
          <Field label={getLabel('urgency.value')} value={brief.urgency.value} onChange={(v) => updateNested('urgency', 'value', v)} placeholder="선착순 50명 한정" />
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColorField label={getLabel('brand_color.primary')} value={brief.brand_color?.primary ?? '#2563EB'} onChange={(v) => updateNested('brand_color', 'primary', v)} />
          <ColorField label={getLabel('brand_color.secondary')} value={brief.brand_color?.secondary ?? '#F59E0B'} onChange={(v) => updateNested('brand_color', 'secondary', v)} />
        </div>

        <div className="mt-4 space-y-4">
          <TextareaField label={getLabel('creator_bio')} value={brief.creator_bio ?? ''} onChange={(v) => update('creator_bio', v)} rows={3} />
          <TextareaField label={getLabel('testimonials_raw')} value={brief.testimonials_raw ?? ''} onChange={(v) => update('testimonials_raw', v)} rows={3} />
          <TextareaField label={getLabel('bonus_items_raw')} value={brief.bonus_items_raw ?? ''} onChange={(v) => update('bonus_items_raw', v)} rows={2} />
        </div>

        {(brief.extra_fields ?? []).length > 0 && (
          <div className="mt-4 space-y-3 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">AI 추가 필드</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(brief.extra_fields ?? []).map((field, i) => {
                const updateField = (patch: Partial<typeof field>) => {
                  const updated = [...(brief.extra_fields ?? [])]
                  updated[i] = { ...updated[i], ...patch }
                  update('extra_fields', updated)
                }
                return (
                  <div key={field.key}>
                    <EditableLabel label={field.label} onLabelChange={(v) => updateField({ label: v })} />
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => updateField({ value: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={handleSaveBrief}
            disabled={saving}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            {saving ? '저장 중...' : '💾 저장하기'}
          </button>
          {savedMsg && <span className="text-sm text-green-600 font-medium">✓ {savedMsg}</span>}
        </div>
      </Card>

      {/* Section: 파이프라인 */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionTitle icon="🚀" title="AI 파이프라인 실행" subtitle="리서치 → 카피 → 디자인 → 이미지 프롬프트 → 13개 섹션 이미지 → 최종 스티칭" />
          </div>
          <div className="shrink-0">
            {pipelineRunning ? (
              <button onClick={handleStopPipeline} className="bg-red-500 text-white text-sm px-5 py-2.5 rounded-xl hover:bg-red-600 transition-colors font-semibold">
                ■ 중지
              </button>
            ) : (
              <button
                onClick={handleRunPipeline}
                disabled={!projectStatus?.hasBrief}
                className="bg-green-600 text-white text-sm px-5 py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors font-semibold"
              >
                ▶ 실행
              </button>
            )}
          </div>
        </div>

        {!projectStatus?.hasBrief && (
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <span>⚠️</span> 제품 정보를 먼저 저장하세요.
          </div>
        )}

        {projectStatus && (
          <div className="mt-4 grid grid-cols-4 gap-2">
            {pipelineSteps.map(({ label, done }) => (
              <div key={label} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium ${done ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500'}`}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${done ? 'bg-green-500' : 'bg-slate-300'}`} />
                {label}
              </div>
            ))}
          </div>
        )}

        {(logs.length > 0 || pipelineRunning) && (
          <div className="mt-4">
            <ProgressLog logs={logs} isRunning={pipelineRunning} />
          </div>
        )}
      </Card>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

function SectionTitle({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div>
      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
        <span>{icon}</span>{title}
      </h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function EditableLabel({ label, onLabelChange }: { label: string; onLabelChange?: (v: string) => void }) {
  if (!onLabelChange) return <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
  return (
    <input
      type="text"
      value={label}
      onChange={(e) => onLabelChange(e.target.value)}
      className="block w-full text-xs font-medium text-slate-600 mb-1.5 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none px-0.5 py-0.5 transition-colors"
    />
  )
}

function Field({ label, onLabelChange, value, onChange, placeholder }: { label: string; onLabelChange?: (v: string) => void; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <EditableLabel label={label} onLabelChange={onLabelChange} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
      />
    </div>
  )
}

function ColorField({ label, onLabelChange, value, onChange }: { label: string; onLabelChange?: (v: string) => void; value: string; onChange: (v: string) => void }) {
  const isValid = /^#[0-9a-fA-F]{6}$/.test(value)
  return (
    <div>
      <EditableLabel label={label} onLabelChange={onLabelChange} />
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isValid ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#2563EB"
          maxLength={7}
          className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
        />
      </div>
    </div>
  )
}

function TextareaField({ label, onLabelChange, value, onChange, rows = 3 }: { label: string; onLabelChange?: (v: string) => void; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <EditableLabel label={label} onLabelChange={onLabelChange} />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow"
      />
    </div>
  )
}
