'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import Footer from '@/components/Footer'

interface ProjectMeta {
  id: string
  name: string
  created_at: string
}

function SearchParamToast({ onToast }: { onToast: (msg: string, ms: number) => void }) {
  const searchParams = useSearchParams()
  useEffect(() => {
    const verify = searchParams.get('verify')
    if (verify === 'success') onToast('인증 완료! 크레딧 1개가 지급됐습니다.', 5000)
    else if (verify === 'duplicate') onToast('이미 인증된 번호입니다.', 4000)
    else if (verify === 'error' || verify === 'denied') onToast('인증에 실패했습니다. 다시 시도해 주세요.', 4000)

    const payment = searchParams.get('payment')
    const credits = searchParams.get('credits')
    if (payment === 'success' && credits) onToast(`결제 완료! 크레딧 ${credits}개가 지급됐습니다.`, 5000)
    else if (payment === 'failed') onToast('결제에 실패했습니다. 다시 시도해 주세요.', 4000)
  }, [])
  return null
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectMeta[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(true)
  const [verifyToast, setVerifyToast] = useState('')

  const showToast = (msg: string, ms: number) => {
    setVerifyToast(msg)
    setTimeout(() => setVerifyToast(''), ms)
  }

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function fetchProjects() {
    const res = await fetch('/api/projects')
    if (res.status === 401) { router.push('/login'); return }
    const data = await res.json()
    setProjects(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    fetchProjects()
    fetch('/api/credits').then(r => r.json()).then(data => {
      setPhoneVerified(data.phone_verified ?? true)
    })
  }, [])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/projects/${data.id}`)
    }
    setCreating(false)
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    setEditingId(null)
    fetchProjects()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 프로젝트를 삭제할까요?`)) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    fetchProjects()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Suspense><SearchParamToast onToast={showToast} /></Suspense>
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900"><span className="text-3xl mr-1">🐱</span> 상세페이지 자동 생성기</h1>
            <p className="text-sm text-slate-500 mt-0.5">AI가 고전환 상세페이지를 자동으로 만들어드립니다</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/purchase"
              className="text-sm text-blue-600 font-semibold hover:text-blue-700 border border-blue-200 bg-blue-50 px-3 py-2 rounded-xl transition-colors"
            >
              크레딧 충전
            </Link>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <span className="text-base leading-none">+</span>
              새 프로젝트
            </button>
            <button
              onClick={handleSignOut}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* 인증 유도 배너 */}
      {!phoneVerified && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between gap-4">
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

      {/* 카카오 인증 결과 토스트 */}
      {verifyToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm px-5 py-3 rounded-xl shadow-lg z-50">
          {verifyToast}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 py-8 flex-1">
        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-1">새 프로젝트 만들기</h2>
              <p className="text-sm text-slate-500 mb-5">프로젝트 이름을 입력하세요</p>
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="예: 직장인 아침운동 강의"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  {creating ? '생성 중...' : '만들기'}
                </button>
                <button
                  onClick={() => { setShowCreate(false); setNewName('') }}
                  className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🛒</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">첫 상세페이지를 만들어보세요</h2>
            <p className="text-sm text-slate-500 mb-8">
              제품 설명만 입력하면 AI가 자동으로 상세페이지를 완성합니다
            </p>
            {/* 3단계 가이드 */}
            <div className="flex items-center justify-center gap-2 mb-10">
              {[
                { n: 1, label: '제품 정보 입력' },
                { n: 2, label: 'AI 파이프라인 실행' },
                { n: 3, label: 'PNG 다운로드' },
              ].map((step, i, arr) => (
                <div key={step.n} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                      {step.n}
                    </div>
                    <span className="text-xs text-slate-600 font-medium whitespace-nowrap">{step.label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-10 h-px bg-slate-300 mb-4" />
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              지금 시작하기
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-3 hover:border-slate-300 transition-colors shadow-sm"
              >
                {editingId === p.id ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(p.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="flex-1 border border-blue-400 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => handleRename(p.id)} className="text-sm text-blue-600 font-semibold hover:text-blue-700 px-2">저장</button>
                    <button onClick={() => setEditingId(null)} className="text-sm text-slate-400 hover:text-slate-600 px-2">취소</button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => router.push(`/projects/${p.id}`)}
                      className="flex-1 text-left"
                    >
                      <p className="font-semibold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {p.created_at ? new Date(p.created_at).toLocaleString('ko-KR') : p.id}
                      </p>
                    </button>
                    <button
                      onClick={() => { setEditingId(p.id); setEditName(p.name) }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-sm"
                      title="이름 수정"
                    >✏️</button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors text-sm"
                      title="삭제"
                    >🗑️</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
