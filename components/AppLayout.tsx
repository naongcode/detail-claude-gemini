'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import ProjectSidebar from './ProjectSidebar'
import BriefTab from './tabs/BriefTab'
import LayoutTab from './tabs/LayoutTab'
import TextEditTab from './tabs/TextEditTab'
import ResultTab from './tabs/ResultTab'
import CreditModal from './ui/CreditModal'
import { ProjectMeta, ProjectStatus } from '@/lib/types'

interface Props {
  projectId: string
}

type TabId = 'brief' | 'layout' | 'text' | 'result'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'brief',  label: '제품 정보',  icon: '📝' },
  { id: 'result', label: '결과 확인',  icon: '📄' },
  { id: 'text',   label: '텍스트 편집', icon: '✏️' },
  { id: 'layout', label: 'HTML 편집',  icon: '🗂️' },
]

export default function AppLayout({ projectId }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('brief')
  const [projects, setProjects] = useState<ProjectMeta[]>([])
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [phoneVerified, setPhoneVerified] = useState<boolean>(true) // 기본 true로 배너 깜빡임 방지
  const [showCreditModal, setShowCreditModal] = useState(false)

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

  const refreshCredits = useCallback(async () => {
    const res = await fetch('/api/credits')
    if (res.ok) {
      const data = await res.json()
      setCreditBalance(data.balance)
      setPhoneVerified(data.phone_verified)
    }
  }, [])

  useEffect(() => {
    refreshProjects()
    refreshStatus()
    refreshCredits()
  }, [refreshProjects, refreshStatus, refreshCredits])

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

  const triggerStatusRefresh = useCallback(async () => {
    await refreshStatus()
    await refreshCredits()
  }, [refreshStatus, refreshCredits])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {showCreditModal && <CreditModal onClose={() => setShowCreditModal(false)} />}
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
          <div className="ml-auto flex items-center gap-3 shrink-0">
            {creditBalance !== null && (
              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${
                creditBalance === 0
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                <span>크레딧</span>
                <span className="font-bold">{creditBalance}</span>
                {creditBalance === 0 && (
                  <button
                    onClick={() => setShowCreditModal(true)}
                    className="ml-1 text-red-600 underline hover:text-red-800 transition-colors"
                  >
                    충전
                  </button>
                )}
              </div>
            )}
            <Link
              href="/purchase"
              className="text-xs text-blue-600 font-semibold hover:text-blue-700 border border-blue-200 bg-blue-50 px-2.5 py-1 rounded-lg transition-colors"
            >
              충전
            </Link>
            <button
              onClick={handleSignOut}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 인증 유도 배너 - 준비중
        {!phoneVerified && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between gap-4 shrink-0">
            <p className="text-sm text-amber-800">
              핸드폰 인증 시 <span className="font-semibold">크레딧 1개를 무료</span>로 드립니다.
            </p>
            <a
              href="/api/auth/kakao/start"
              className="shrink-0 bg-amber-400 hover:bg-amber-500 text-amber-900 text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              카카오로 인증하기
            </a>
          </div>
        )}
        */}

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
