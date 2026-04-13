'use client'

import { useState, useRef } from 'react'
import { ProjectStatus, PipelineEvent, ImageRequest } from '@/lib/types'
import ProgressLog, { LogEntry } from '@/components/ui/ProgressLog'

interface Props {
  projectId: string
  projectStatus: ProjectStatus | null
  onStatusChange: () => void
  onTabChange: (tab: string) => void
}

const PIPELINE_STEPS = [
  { key: 'hasResearch',   label: '리서치' },
  { key: 'hasPageDesign', label: '페이지 설계' },
  { key: 'imagesDone',    label: '이미지 생성' },
  { key: 'hasFinalPng',   label: '최종 렌더' },
] as const

export default function PipelineRunner({ projectId, projectStatus, onStatusChange, onTabChange }: Props) {
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const esRef = useRef<EventSource | null>(null)

  const addLog = (message: string, type: LogEntry['type']) =>
    setLogs((prev) => [...prev, { message, type, timestamp: new Date() }])

  const handleRun = () => {
    if (running) return
    setLogs([])
    setRunning(true)
    let finished = false

    const es = new EventSource(`/api/projects/${projectId}/generate/pipeline`)
    esRef.current = es

    es.onmessage = (event) => {
      try {
        const data: PipelineEvent = JSON.parse(event.data)
        if (data.type === 'step_done') return

        const type: LogEntry['type'] =
          data.type === 'error'        ? 'error'   :
          data.type === 'done'         ? 'success' :
          data.type === 'design_ready' ? 'success' :
          data.type === 'step'         ? 'step'    : 'info'

        const message =
          data.type === 'error'        ? `오류: ${data.message}` :
          data.type === 'done'         ? `✓ ${data.message}`     :
          data.type === 'design_ready' ? `✓ ${data.message}`     :
          `[${data.step}] ${data.message}`

        addLog(message, type)

        if (data.type === 'design_ready' && data.images) {
          finished = true
          es.close()
          runImageGeneration(data.images)
        }
        if (data.type === 'error') {
          finished = true
          es.close()
          setRunning(false)
          onStatusChange()
        }
      } catch { /* ignore parse errors */ }
    }

    es.onerror = () => {
      if (!finished) {
        addLog('SSE 연결 오류', 'error')
        setRunning(false)
      }
      es.close()
    }
  }

  const runImageGeneration = async (images: ImageRequest[]) => {
    const total = images.length
    for (let i = 0; i < images.length; i++) {
      const { id: sectionId } = images[i]
      addLog(`[${i + 4}] 이미지 생성 중: ${sectionId} (${i + 1}/${total})`, 'step')
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
        addLog(`오류: ${String(err)}`, 'error')
        setRunning(false)
        return
      }
    }

    addLog(`[${total + 4}] HTML 조립 및 PNG 렌더링 중...`, 'step')
    try {
      const res = await fetch(`/api/projects/${projectId}/generate/render`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? '렌더링 실패')
      }
      addLog('✓ 상세페이지 생성 완료!', 'success')
      onStatusChange()
      onTabChange('result')
    } catch (err) {
      addLog(`렌더링 오류: ${String(err)}`, 'error')
    } finally {
      setRunning(false)
    }
  }

  const handleStop = () => { esRef.current?.close(); setRunning(false) }

  const steps = [
    { label: '리서치',     done: projectStatus?.hasResearch ?? false },
    { label: '페이지 설계', done: projectStatus?.hasPageDesign ?? false },
    { label: '이미지 생성', done: (projectStatus?.imageGenerated ?? 0) > 0 && projectStatus?.imageGenerated === projectStatus?.imageTotal },
    { label: '최종 렌더',   done: projectStatus?.hasFinalPng ?? false },
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <span>🚀</span>AI 파이프라인 실행
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">리서치 → 카피 → 디자인 → 이미지 프롬프트 → 섹션 이미지 → 최종 렌더</p>
        </div>
        <div className="shrink-0">
          {running ? (
            <button onClick={handleStop} className="bg-red-500 text-white text-sm px-5 py-2.5 rounded-xl hover:bg-red-600 transition-colors font-semibold">
              ■ 중지
            </button>
          ) : (
            <button
              onClick={handleRun}
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
          {steps.map(({ label, done }) => (
            <div key={label} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium ${done ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500'}`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${done ? 'bg-green-500' : 'bg-slate-300'}`} />
              {label}
            </div>
          ))}
        </div>
      )}

      {(logs.length > 0 || running) && (
        <div className="mt-4">
          <ProgressLog logs={logs} isRunning={running} />
        </div>
      )}
    </div>
  )
}
