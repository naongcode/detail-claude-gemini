'use client'

import { useState, useRef, useEffect } from 'react'
import { ProjectStatus, PipelineEvent, ImageRequest } from '@/lib/types'
import ProgressLog, { LogEntry } from '@/components/ui/ProgressLog'
import CreditModal from '@/components/ui/CreditModal'

interface Props {
  projectId: string
  projectStatus: ProjectStatus | null
  onStatusChange: () => void
  onTabChange: (tab: string) => void
}

interface LastError {
  stage: string
  message: string
}

function estimatedMinutes(imageCount: number) {
  const totalSec = imageCount * 25 + 120 // 이미지당 25초 + 리서치/설계 2분
  return Math.ceil(totalSec / 60)
}

export default function PipelineRunner({ projectId, projectStatus, onStatusChange, onTabChange }: Props) {
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [lastError, setLastError] = useState<LastError | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // 마운트 시 이전 실패 상태 로드
  useEffect(() => {
    fetch(`/api/projects/${projectId}/pipeline-status`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.error && data?.stage === 'failed') {
          setLastError({ stage: data.stage, message: data.error })
        }
      })
      .catch(() => {})
  }, [projectId])

  const addLog = (message: string, type: LogEntry['type']) =>
    setLogs((prev) => [...prev, { message, type, timestamp: new Date() }])

  const handleRun = async () => {
    if (running) return
    setLogs([])
    setLastError(null)
    setRunning(true)

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch(`/api/projects/${projectId}/generate/pipeline`, { signal: abort.signal })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `서버 오류 (${res.status})` }))
        if (res.status === 402) {
          setShowCreditModal(true)
        } else {
          addLog(err.error ?? `오류 (${res.status})`, res.status === 409 || res.status === 429 ? 'info' : 'error')
        }
        setRunning(false)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finished = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data: PipelineEvent = JSON.parse(line.slice(6))
            if (data.type === 'step_done') continue

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
              reader.cancel()
              runImageGeneration(data.images)
              return
            }
            if (data.type === 'error') {
              finished = true
              reader.cancel()
              setLastError({ stage: 'pipeline', message: data.message ?? '알 수 없는 오류' })
              setRunning(false)
              onStatusChange()
              return
            }
          } catch { /* ignore parse errors */ }
        }
      }

      if (!finished) setRunning(false)
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        addLog('중지됨', 'info')
      } else {
        addLog(`연결 오류: ${String(e)}`, 'error')
        setLastError({ stage: 'connection', message: String(e) })
      }
      setRunning(false)
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
        setLastError({ stage: `이미지 생성 (${sectionId})`, message: String(err) })
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
      setLastError(null)
      onStatusChange()
      onTabChange('result')
    } catch (err) {
      addLog(`렌더링 오류: ${String(err)}`, 'error')
      setLastError({ stage: '렌더링', message: String(err) })
    } finally {
      setRunning(false)
    }
  }

  const handleStop = () => { abortRef.current?.abort(); setRunning(false) }

  const steps = [
    { label: '리서치',     done: projectStatus?.hasResearch ?? false },
    { label: '페이지 설계', done: projectStatus?.hasPageDesign ?? false },
    { label: '이미지 생성', done: (projectStatus?.imageGenerated ?? 0) > 0 && projectStatus?.imageGenerated === projectStatus?.imageTotal },
    { label: '최종 렌더',   done: projectStatus?.hasFinalPng ?? false },
  ]

  const imageCount = projectStatus?.imageTotal ?? 6 // 기본 6개 예상
  const estMin = estimatedMinutes(imageCount)

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      {showCreditModal && <CreditModal onClose={() => setShowCreditModal(false)} />}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <span>🚀</span>AI 파이프라인 실행
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">리서치 → 카피 → 디자인 → 이미지 프롬프트 → 섹션 이미지 → 최종 렌더</p>
          {!running && !projectStatus?.hasFinalPng && (
            <p className="text-xs text-slate-400 mt-1.5">
              예상 소요: 이미지 {imageCount}개 기준 약 <span className="font-medium text-slate-500">{estMin}분</span>
            </p>
          )}
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
              {projectStatus?.hasFinalPng ? '▶ 재실행' : '▶ 실행'}
            </button>
          )}
        </div>
      </div>

      {!projectStatus?.hasBrief && (
        <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span>⚠️</span> 제품 정보를 먼저 저장하세요.
        </div>
      )}

      {/* 실패 복구 UI */}
      {lastError && !running && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-medium text-red-700">{lastError.stage}에서 오류 발생</p>
          <p className="text-xs text-red-500 mt-1 line-clamp-2">{lastError.message}</p>
          <p className="text-xs text-red-400 mt-1">이미 완료된 단계는 건너뛰고 이어서 실행합니다.</p>
          <button
            onClick={handleRun}
            className="mt-3 text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            이어서 재시작
          </button>
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
