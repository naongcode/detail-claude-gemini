'use client'

import { useEffect, useRef } from 'react'

export interface LogEntry {
  message: string
  type: 'info' | 'success' | 'error' | 'step'
  timestamp: Date
}

interface Props {
  logs: LogEntry[]
  isRunning: boolean
}

export default function ProgressLog({ logs, isRunning }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  if (logs.length === 0 && !isRunning) return null

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700 bg-slate-800">
        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
        <span className="text-xs text-slate-400 font-medium">{isRunning ? '실행 중...' : '완료'}</span>
      </div>
      <div className="p-4 max-h-56 overflow-y-auto sse-log font-mono text-xs space-y-1">
        {isRunning && logs.length === 0 && (
          <span className="text-slate-400 animate-pulse">파이프라인 시작 중...</span>
        )}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-slate-600 shrink-0 tabular-nums">
              {log.timestamp.toLocaleTimeString('ko-KR', { hour12: false })}
            </span>
            <span className={
              log.type === 'error' ? 'text-red-400' :
              log.type === 'success' ? 'text-green-400' :
              log.type === 'step' ? 'text-yellow-300' :
              'text-slate-300'
            }>
              {log.message}
            </span>
          </div>
        ))}
        {isRunning && logs.length > 0 && (
          <div className="text-blue-400 animate-pulse">처리 중...</div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
