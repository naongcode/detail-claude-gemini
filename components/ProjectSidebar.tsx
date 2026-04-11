'use client'

import { useState } from 'react'
import { ProjectMeta, ProjectStatus } from '@/lib/types'

interface Props {
  projects: ProjectMeta[]
  activeProjectId: string
  projectStatus: ProjectStatus | null
  onSwitch: (id: string) => void
  onCreate: (name: string) => void
  onDelete: () => void
  onRefresh: () => void
}

const STATUS_ITEMS = [
  { key: 'photoCount',    label: '제품사진',     check: (s: ProjectStatus) => s.photoCount > 0,       count: (s: ProjectStatus) => `${s.photoCount}장` },
  { key: 'hasBrief',     label: '제품 정보',     check: (s: ProjectStatus) => s.hasBrief },
  { key: 'hasResearch',  label: '리서치',         check: (s: ProjectStatus) => s.hasResearch },
  { key: 'hasPageDesign',label: '페이지 설계',   check: (s: ProjectStatus) => s.hasPageDesign },
  { key: 'images',       label: '이미지 생성',   check: (s: ProjectStatus) => s.imageGenerated > 0 && s.imageGenerated === s.imageTotal, count: (s: ProjectStatus) => s.imageTotal > 0 ? `${s.imageGenerated}/${s.imageTotal}` : undefined },
  { key: 'hasFinalPng',  label: '최종 이미지',   check: (s: ProjectStatus) => s.hasFinalPng },
]

export default function ProjectSidebar({
  projects, activeProjectId, projectStatus, onSwitch, onCreate, onDelete, onRefresh,
}: Props) {
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    await onCreate(newName.trim())
    setNewName('')
    setShowCreate(false)
    setCreating(false)
  }

  const completedCount = projectStatus
    ? STATUS_ITEMS.filter((item) => item.check(projectStatus)).length
    : 0

  return (
    <div className="w-60 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Logo / Title */}
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0">AI</div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">상세페이지 생성기</p>
            <p className="text-xs text-slate-400">AI 자동화</p>
          </div>
        </div>
      </div>

      {/* New project */}
      <div className="px-3 py-3 border-b border-slate-100">
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-blue-600 font-medium border border-blue-200 bg-blue-50 rounded-xl py-2 hover:bg-blue-100 transition-colors"
          >
            <span className="text-base leading-none">+</span> 새 프로젝트
          </button>
        ) : (
          <div className="space-y-2">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setShowCreate(false); setNewName('') } }}
              placeholder="프로젝트 이름"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="flex-1 bg-blue-600 text-white text-xs rounded-lg py-1.5 font-medium hover:bg-blue-700 disabled:opacity-40"
              >
                {creating ? '생성 중...' : '만들기'}
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewName('') }}
                className="text-xs text-slate-500 px-2 py-1.5 rounded-lg hover:bg-slate-100"
              >취소</button>
            </div>
          </div>
        )}
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {projects.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6 px-2">
            프로젝트가 없습니다
          </p>
        ) : (
          projects.map((proj) => {
            const isActive = proj.id === activeProjectId
            return (
              <button
                key={proj.id}
                onClick={() => onSwitch(proj.id)}
                className={`w-full text-left text-xs px-3 py-2.5 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="block truncate">{proj.name || proj.id}</span>
              </button>
            )
          })
        )}
      </div>

      {/* Progress */}
      {projectStatus && (
        <div className="mx-3 mb-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-slate-600">진행 상황</p>
            <span className="text-xs text-blue-600 font-bold">{completedCount}/{STATUS_ITEMS.length}</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-slate-200 rounded-full mb-3">
            <div
              className="h-1.5 bg-blue-500 rounded-full transition-all"
              style={{ width: `${(completedCount / STATUS_ITEMS.length) * 100}%` }}
            />
          </div>
          <div className="space-y-1.5">
            {STATUS_ITEMS.map((item) => {
              const done = item.check(projectStatus)
              const countText = item.count?.(projectStatus)
              return (
                <div key={item.key} className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-green-500' : 'bg-slate-200'}`}>
                    {done && <span className="text-white text-[8px] font-bold">✓</span>}
                  </div>
                  <span className={`text-xs ${done ? 'text-slate-700' : 'text-slate-400'}`}>
                    {item.label}
                    {countText && <span className="ml-1 text-slate-400">({countText})</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-3 pb-3 space-y-1.5 border-t border-slate-100 pt-3">
        <button
          onClick={onRefresh}
          className="w-full text-xs text-slate-500 py-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          새로고침
        </button>
        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="w-full text-xs text-red-500 py-2 rounded-xl hover:bg-red-50 border border-red-200 transition-colors"
          >
            프로젝트 삭제
          </button>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs text-red-600 text-center">삭제하면 복구할 수 없습니다</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => { setShowDelete(false); onDelete() }}
                className="flex-1 text-xs bg-red-500 text-white rounded-xl py-2 hover:bg-red-600"
              >삭제</button>
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 text-xs border border-slate-300 text-slate-600 rounded-xl py-2 hover:bg-slate-50"
              >취소</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
