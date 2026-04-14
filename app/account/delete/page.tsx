'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function DeleteAccountPage() {
  const router = useRouter()
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (confirm !== '탈퇴') return
    setDeleting(true)
    setError('')

    const res = await fetch('/api/account/delete', { method: 'DELETE' })
    if (res.ok) {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      await supabase.auth.signOut()
      router.push('/login')
    } else {
      const data = await res.json()
      setError(data.error ?? '탈퇴 처리 중 오류가 발생했습니다.')
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm w-full max-w-md p-8">
        <h1 className="text-xl font-bold text-slate-900 mb-2">회원 탈퇴</h1>
        <p className="text-sm text-slate-500 mb-6">
          탈퇴 시 모든 프로젝트 파일과 크레딧이 삭제되며 복구할 수 없습니다.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-800 font-medium">삭제되는 항목</p>
          <ul className="text-xs text-amber-700 mt-2 space-y-1 list-disc pl-4">
            <li>모든 프로젝트의 이미지·파일</li>
            <li>잔여 크레딧 (환불 불가)</li>
            <li>계정 및 로그인 정보</li>
          </ul>
        </div>

        <p className="text-sm text-slate-600 mb-2">계속하려면 아래에 <strong>탈퇴</strong>를 입력하세요.</p>
        <input
          type="text"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="탈퇴"
          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
        />

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            disabled={confirm !== '탈퇴' || deleting}
            className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-40 transition-colors"
          >
            {deleting ? '처리 중...' : '탈퇴하기'}
          </button>
          <button
            onClick={() => router.push('/projects')}
            className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
