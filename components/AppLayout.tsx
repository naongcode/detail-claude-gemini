'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import ProjectSidebar from './ProjectSidebar'
import BriefTab from './tabs/BriefTab'
import LayoutTab from './tabs/LayoutTab'
import TextEditTab from './tabs/TextEditTab'
import ResultTab from './tabs/ResultTab'
import { ProjectMeta, ProjectStatus } from '@/lib/types'

interface Props {
  projectId: string
}

type TabId = 'brief' | 'layout' | 'text' | 'result'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'brief',  label: '제품 정보',  icon: '📝' },
  { id: 'result', label: '결과 확인',  icon: '📄' },
  { id: 'text',   label: '섹션 편집',  icon: '✏️' },
  { id: 'layout', label: 'HTML 편집',  icon: '🗂️' },
]

export default function AppLayout({ projectId }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('brief')
  const [projects, setProjects] = useState<ProjectMeta[]>([])
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null)
  const refreshProjects = useCallback(async () => {
    const res = await fetch('/api/projects')
    if (res.ok) {
      const data = await res.json()
      setProjects(Array.isArray(data) ? data : [])
    }
  }, [])

  const refreshStatus = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`)
    if (res.ok) {
      const data = await res.json()
      setProjectStatus(data.status)
    }
  }, [projectId])

  useEffect(() => {
    refreshProjects()
    refreshStatus()
  }, [refreshProjects, refreshStatus])

  const handleSignOut = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleProjectSwitch = (id: string) => router.push(`/projects/${id}`)

  const handleProjectCreate = async (name: string) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const data = await res.json()
      await refreshProjects()
      router.push(`/projects/${data.id}`)
    }
  }

  const handleProjectDelete = async () => {
    const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
    if (res.ok) {
      const data = await res.json()
      if (data.remaining?.length > 0) {
        router.push(`/projects/${data.remaining[0].id}`)
      } else {
        router.push('/projects')
      }
    }
  }

  const triggerStatusRefresh = refreshStatus

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <ProjectSidebar
        projects={projects}
        activeProjectId={projectId}
        projectStatus={projectStatus}
        onSwitch={handleProjectSwitch}
        onCreate={handleProjectCreate}
        onDelete={handleProjectDelete}
        onRefresh={refreshProjects}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-3 shrink-0">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <button
              onClick={() => router.push('/projects')}
              className="text-slate-400 hover:text-slate-600 transition-colors text-sm shrink-0"
            >
              ← 목록
            </button>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-800 truncate">{projects.find(p => p.id === projectId)?.name ?? projectId}</span>
          </div>
          {projectStatus?.hasPageDesign && (
            <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
              {projectStatus.imageTotal > 0 ? `${projectStatus.imageGenerated}/${projectStatus.imageTotal}이미지` : '설계 완료'}
            </span>
          )}
          {projectStatus?.hasFinalPng && (
            <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">완성</span>
          )}
          <button
            onClick={handleSignOut}
            className="ml-auto shrink-0 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            로그아웃
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-slate-200 px-6 shrink-0">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {/* BriefTab은 항상 마운트 — 파이프라인 SSE 연결 유지 */}
          <div className={activeTab !== 'brief' ? 'hidden' : ''}>
            <BriefTab projectId={projectId} projectStatus={projectStatus} onStatusChange={triggerStatusRefresh} onTabChange={(tab) => setActiveTab(tab as TabId)} />
          </div>
          {activeTab === 'layout' && <LayoutTab projectId={projectId} onStatusChange={triggerStatusRefresh} onTabChange={(tab) => setActiveTab(tab as TabId)} />}
          {activeTab === 'text' && (
            <TextEditTab projectId={projectId} onStatusChange={triggerStatusRefresh} />
          )}
          {activeTab === 'result' && (
            <ResultTab projectId={projectId} projectName={projects.find(p => p.id === projectId)?.name ?? projectId} projectStatus={projectStatus} onStatusChange={triggerStatusRefresh} />
          )}
        </div>
      </div>
    </div>
  )
}
