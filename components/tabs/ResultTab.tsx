'use client'

import { useState, useEffect } from 'react'
import { ProjectStatus, PageDesign, ImageRequest } from '@/lib/types'

interface Props {
  projectId: string
  projectName: string
  projectStatus: ProjectStatus | null
  onStatusChange: () => void
}

interface LogEntry { message: string; isError: boolean }

interface VersionItem {
  id: number
  version: number
  created_at: string
}

export default function ResultTab({ projectId, projectName, projectStatus, onStatusChange }: Props) {
  const [imgTimestamp, setImgTimestamp] = useState(Date.now())
  const [pageDesign, setPageDesign] = useState<PageDesign | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [regenerating, setRegenerating] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [versions, setVersions] = useState<VersionItem[]>([])

  useEffect(() => {
    fetch(`/api/projects/${projectId}/data/layout`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setPageDesign(data))
  }, [projectId, projectStatus?.imageGenerated])

  useEffect(() => {
    fetch(`/api/projects/${projectId}/versions`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setVersions(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [projectId, projectStatus?.hasFinalPng])

  useEffect(() => {
    setImgTimestamp(Date.now())
  }, [projectStatus?.imageGenerated, projectStatus?.hasFinalPng])

  const fileUrl = (filePath: string) =>
    `/api/projects/${projectId}/files/${filePath}?t=${imgTimestamp}`

  const selectedKeys = pageDesign?.images.map((i) => i.id).filter((id) => selected[id]) ?? []

  const handleRegenerate = async () => {
    if (selectedKeys.length === 0 || regenerating) return
    setRegenerating(true)
    setLogs([])

    try {
      const res = await fetch(`/api/projects/${projectId}/generate/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: selectedKeys.map((key) => ({ key, note: notes[key] || '' })),
        }),
      })
      if (!res.body) throw new Error('스트림 없음')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.message) setLogs((prev) => [...prev, { message: data.message, isError: !!data.error }])
            if (data.type === 'done') {
              setImgTimestamp(Date.now())
              onStatusChange()
              setSelected({})
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      setLogs((prev) => [...prev, { message: `오류: ${String(err)}`, isError: true }])
    } finally {
      setRegenerating(false)
    }
  }

  if (!projectStatus?.hasFinalPng && !projectStatus?.imageGenerated) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🖼️</span>
          </div>
          <p className="font-semibold text-slate-700 mb-1">아직 최종 이미지가 없습니다</p>
          <p className="text-sm text-slate-400">파이프라인을 실행하면 자동으로 생성됩니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">결과 확인</h2>
          <p className="text-sm text-slate-500 mt-1">
            이미지 <span className="font-semibold text-slate-700">
              {projectStatus?.imageGenerated ?? 0}/{projectStatus?.imageTotal ?? 0}
            </span> 생성됨
            {projectStatus?.hasFinalPng && <span className="ml-2 text-green-600 font-medium">· 완성</span>}
          </p>
        </div>
        {projectStatus?.hasFinalPng && (
          <button
            onClick={async () => {
              const now = new Date()
              const pad = (n: number) => String(n).padStart(2, '0')
              const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
              const safeName = projectName.replace(/[/\\?%*:|"<>]/g, '_')
              const res = await fetch(`/api/projects/${projectId}/files/final_page.png`)
              const blob = await res.blob()
              const blobUrl = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = blobUrl
              a.download = `${safeName}_${ts}.png`
              a.click()
              URL.revokeObjectURL(blobUrl)
            }}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-sm"
          >
            📥 PNG 다운로드
          </button>
        )}
      </div>

      {/* Final image */}
      {projectStatus?.hasFinalPng && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <FinalImage src={fileUrl('final_page.png')} />
        </div>
      )}

      {/* Section regeneration */}
      {pageDesign && pageDesign.images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-sm font-semibold text-slate-700">🔄 섹션별 재생성</h3>
            {selectedKeys.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-blue-700 font-medium">{selectedKeys.length}개 선택</span>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="bg-blue-600 text-white text-sm px-5 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {regenerating ? '재생성 중...' : '🔄 선택한 섹션 재생성'}
                </button>
                <button
                  onClick={() => setSelected({})}
                  disabled={regenerating}
                  className="text-sm text-slate-400 hover:text-slate-600"
                >
                  선택 해제
                </button>
              </div>
            )}
          </div>

          {/* Progress log */}
          {logs.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-28 overflow-y-auto">
              {logs.map((log, i) => (
                <p key={i} className={`text-xs font-mono ${log.isError ? 'text-red-600' : 'text-slate-600'}`}>
                  {log.message}
                </p>
              ))}
            </div>
          )}

          {/* Section grid */}
          <div className="grid grid-cols-2 gap-3">
            {pageDesign.images.map((img) => (
              <SectionCard
                key={img.id}
                img={img}
                src={fileUrl(`sections/${img.id}.png`)}
                checked={!!selected[img.id]}
                note={notes[img.id] || ''}
                disabled={regenerating}
                onToggle={() => setSelected((prev) => ({ ...prev, [img.id]: !prev[img.id] }))}
                onNoteChange={(v) => setNotes((prev) => ({ ...prev, [img.id]: v }))}
                onDownload={() => {
                  const a = document.createElement('a')
                  a.href = `/api/projects/${projectId}/files/sections/${img.id}.png`
                  a.download = `${img.id}.png`
                  a.click()
                }}
              />
            ))}
          </div>
        </div>
      )}
      {/* 버전 히스토리 */}
      {versions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">🕒 생성 히스토리</h3>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs font-bold text-slate-500 w-8">v{v.version}</span>
                <span className="text-xs text-slate-500">
                  {new Date(v.created_at).toLocaleString('ko-KR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface SectionCardProps {
  img: ImageRequest
  src: string
  checked: boolean
  note: string
  disabled: boolean
  onToggle: () => void
  onNoteChange: (v: string) => void
  onDownload: () => void
}

function SectionCard({ img, src, checked, note, disabled, onToggle, onNoteChange, onDownload }: SectionCardProps) {
  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-colors shadow-sm ${checked ? 'border-blue-400 ring-1 ring-blue-300' : 'border-slate-200'}`}>
      {/* Thumbnail */}
      <div className="cursor-pointer" onClick={() => !disabled && onToggle()}>
        <SectionImage src={src} alt={img.id} />
      </div>

      {/* Label + actions */}
      <div className={`px-3 py-2.5 border-t flex items-center gap-2 ${checked ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={() => !disabled && onToggle()}
          disabled={disabled}
          className="w-3.5 h-3.5 accent-blue-600 shrink-0"
        />
        <span className="text-xs text-slate-700 font-medium truncate flex-1">{img.id}</span>
        <span className="text-xs text-slate-400 shrink-0">{img.width}×{img.height}</span>
        <button
          onClick={onDownload}
          className="text-xs text-slate-400 hover:text-blue-600 shrink-0 ml-1"
          title="다운로드"
        >
          ↓
        </button>
      </div>

      {/* Prompt hint */}
      <div className={`px-3 pb-2.5 ${checked ? 'bg-blue-50' : 'bg-slate-50'}`}>
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{img.prompt}</p>
      </div>

      {/* Note input — shown when selected */}
      {checked && (
        <div className="px-3 pb-3 bg-blue-50">
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="수정 요청 (선택사항) — 예: 배경 더 어둡게, 조명 부드럽게"
            disabled={disabled}
            rows={3}
            className="w-full text-xs border border-blue-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 bg-white resize-none"
          />
        </div>
      )}
    </div>
  )
}

function FinalImage({ src }: { src: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  return (
    <div className="relative bg-slate-50">
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center min-h-32">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
      {status === 'error' && (
        <div className="p-12 text-center text-slate-400">
          <p className="font-medium">최종 이미지를 불러올 수 없습니다</p>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="최종 상세페이지"
        className={`w-full transition-opacity ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </div>
  )
}

function SectionImage({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  return (
    <div className="relative bg-slate-100" style={{ aspectRatio: '2/1' }}>
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-slate-400 text-xs animate-pulse">로딩 중...</div>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-xs">미생성</div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${status === 'loaded' ? '' : 'opacity-0'}`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </div>
  )
}
