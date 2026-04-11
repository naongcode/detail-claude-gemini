'use client'

import { useState, useEffect } from 'react'
import { ProjectStatus } from '@/lib/types'
import JsonEditor from '@/components/ui/JsonEditor'

interface Props {
  projectId: string
  projectStatus: ProjectStatus | null
}

type DataKey = 'research' | 'pageDesign'

const DATA_LABELS: Record<DataKey, { label: string; icon: string; file: string }> = {
  research:   { label: '리서치 결과',   icon: '🔬', file: 'research_output.json' },
  pageDesign: { label: '페이지 디자인', icon: '🎨', file: 'page_design.json' },
}

export default function EditTab({ projectId, projectStatus }: Props) {
  const [data, setData] = useState<Record<DataKey, unknown>>({ research: null, pageDesign: null })
  const [activeKey, setActiveKey] = useState<DataKey>('research')

  const fetchData = async (key: DataKey) => {
    const res = await fetch(`/api/projects/${projectId}/data?key=${key}`)
    if (res.ok) {
      const d = await res.json()
      setData((prev) => ({ ...prev, [key]: d }))
    }
  }

  useEffect(() => {
    const keys: DataKey[] = ['research', 'pageDesign']
    keys.forEach((k) => fetchData(k))
  }, [projectId, projectStatus])

  const handleSave = async (key: DataKey, value: unknown) => {
    const res = await fetch(`/api/projects/${projectId}/data?key=${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    })
    if (!res.ok) throw new Error('저장 실패')
    setData((prev) => ({ ...prev, [key]: value }))
  }

  const available: Record<DataKey, boolean> = {
    research:   data.research !== null,
    pageDesign: data.pageDesign !== null,
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">중간 결과 편집</h2>
        <p className="text-sm text-slate-500 mt-1">AI가 생성한 중간 결과물을 직접 수정할 수 있습니다</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {(Object.keys(DATA_LABELS) as DataKey[]).map((key) => {
          const { label, icon } = DATA_LABELS[key]
          const isActive = activeKey === key
          const isDone = available[key]
          return (
            <button
              key={key}
              onClick={() => setActiveKey(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              } ${!isDone ? 'opacity-50' : ''}`}
            >
              <span>{icon}</span>
              {label}
              {isDone && !isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
            </button>
          )
        })}
      </div>

      {/* Editor */}
      {!available[activeKey] ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">⏳</span>
          </div>
          <p className="font-medium text-slate-700">아직 생성되지 않았습니다</p>
          <p className="text-sm text-slate-400 mt-1">제품 정보 탭에서 파이프라인을 실행하세요</p>
        </div>
      ) : (
        <JsonEditor
          label={`${DATA_LABELS[activeKey].icon} ${DATA_LABELS[activeKey].label} — ${DATA_LABELS[activeKey].file}`}
          value={data[activeKey]}
          onSave={(v) => handleSave(activeKey, v)}
          height="600px"
        />
      )}
    </div>
  )
}
