'use client'

import { useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  created_at: string
  is_admin: boolean
  balance: number
  regen_tickets: number
  project_count: number
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [creditTarget, setCreditTarget] = useState<{ userId: string; email: string } | null>(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditNote, setCreditNote] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const handleCredit = async () => {
    if (!creditTarget || !creditAmount) return
    const amount = parseInt(creditAmount)
    if (isNaN(amount) || amount === 0) return

    setSaving(true)
    await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: creditTarget.userId, amount, note: creditNote || undefined }),
    })
    setSaving(false)
    setCreditTarget(null)
    setCreditAmount('')
    setCreditNote('')
    fetchUsers()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">사용자 관리</h1>

      {loading ? (
        <p className="text-slate-400 text-sm">로딩 중...</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-500 border-b border-slate-200">
                <th className="px-4 py-3 font-medium">이메일</th>
                <th className="px-4 py-3 font-medium">가입일</th>
                <th className="px-4 py-3 font-medium text-center">크레딧</th>
                <th className="px-4 py-3 font-medium text-center">재생성권</th>
                <th className="px-4 py-3 font-medium text-center">프로젝트</th>
                <th className="px-4 py-3 font-medium text-center">관리자</th>
                <th className="px-4 py-3 font-medium text-center">작업</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-800 font-medium">{u.email}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(u.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold ${u.balance > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                      {u.balance}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{u.regen_tickets}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{u.project_count}</td>
                  <td className="px-4 py-3 text-center">
                    {u.is_admin ? (
                      <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">관리자</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setCreditTarget({ userId: u.id, email: u.email })}
                      className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      크레딧 수정
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">사용자 없음</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 크레딧 수정 모달 */}
      {creditTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">크레딧 수정</h2>
            <p className="text-sm text-slate-500 mb-5">{creditTarget.email}</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">금액 (양수: 지급, 음수: 차감)</label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={e => setCreditAmount(e.target.value)}
                  placeholder="예: 5 또는 -2"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">메모 (선택)</label>
                <input
                  type="text"
                  value={creditNote}
                  onChange={e => setCreditNote(e.target.value)}
                  placeholder="예: 이벤트 지급"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleCredit}
                disabled={saving || !creditAmount}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={() => { setCreditTarget(null); setCreditAmount(''); setCreditNote('') }}
                className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
