'use client'

import { useState, useEffect } from 'react'
import { ProductBrief, ProjectStatus } from '@/lib/types'
import PhotoUpload from './PhotoUpload'
import PipelineRunner from './PipelineRunner'
import CreditModal from '@/components/ui/CreditModal'

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
  const [autoFillError, setAutoFillError] = useState('')
  const [creditMsg, setCreditMsg] = useState('')
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => { fetchBrief() }, [projectId])

  const fetchBrief = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/brief`)
      if (res.ok) {
        const data = await res.json()
        if (data) setBrief({ ...EMPTY_BRIEF, ...data })
      }
    } catch (e) { console.error('브리프 로드 실패:', e) }
  }

  const handleAutoFill = async () => {
    if (!description.trim()) return
    if (!window.confirm('크레딧 1개가 차감됩니다. 계속하시겠습니까?\n(같은 프로젝트는 재실행 시 차감되지 않습니다)')) return
    setAutoFilling(true)
    setAutoFillError('')
    setCreditMsg('')
    try {
      const res = await fetch(`/api/projects/${projectId}/generate/brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      if (res.ok) {
        const { brief: data, deducted, balance } = await res.json()
        const withRaw = {
          ...data,
          testimonials_raw: Array.isArray(data.testimonials) ? data.testimonials.join('\n') : (data.testimonials_raw ?? ''),
          bonus_items_raw: Array.isArray(data.bonus_items) ? data.bonus_items.join('\n') : (data.bonus_items_raw ?? ''),
        }
        setBrief({ ...EMPTY_BRIEF, ...withRaw })
        if (deducted) {
          setCreditMsg(`크레딧 1개 차감됨 (잔여 ${balance}개)`)
        }
        onStatusChange()
        setTimeout(() => setCreditMsg(''), 4000)
      } else if (res.status === 402) {
        setShowCreditModal(true)
      } else if (res.status === 429) {
        const err = await res.json()
        setAutoFillError(err.error)
      } else {
        const err = await res.json()
        setAutoFillError(`오류: ${err.error}`)
      }
    } catch (e) { setAutoFillError(`오류: ${String(e)}`) }
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

  const update = (field: keyof ProductBrief, value: unknown) => setBrief((prev) => ({ ...prev, [field]: value }))
  const updateNested = (field: keyof ProductBrief, key: string, value: string) =>
    setBrief((prev) => ({ ...prev, [field]: { ...(prev[field] as Record<string, string>), [key]: value } }))

  const getLabel = (key: string) => brief.field_labels?.[key] ?? DEFAULT_LABELS[key] ?? key

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {showCreditModal && <CreditModal onClose={() => setShowCreditModal(false)} />}

      {/* Section: 제품사진 */}
      <PhotoUpload projectId={projectId} onStatusChange={onStatusChange} />

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
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleAutoFill}
            disabled={autoFilling || !description.trim()}
            className="bg-blue-600 text-white text-sm px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors font-semibold shrink-0"
          >
            {autoFilling ? 'AI 분석 중...' : 'AI로 자동 채우기'}
          </button>
          {creditMsg && <p className="text-sm text-green-600 font-medium">{creditMsg}</p>}
          {autoFillError && <p className="text-sm text-red-600 font-medium">{autoFillError}</p>}
        </div>
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
      <PipelineRunner
        projectId={projectId}
        projectStatus={projectStatus}
        onStatusChange={onStatusChange}
        onTabChange={onTabChange}
      />
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
