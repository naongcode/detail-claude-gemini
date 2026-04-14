import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin()
  } catch {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-sm">관리자</span>
        <nav className="flex items-center gap-4 text-sm text-slate-300">
          <Link href="/admin" className="hover:text-white transition-colors">개요</Link>
          <Link href="/admin/costs" className="hover:text-white transition-colors">API 비용</Link>
          <Link href="/admin/users" className="hover:text-white transition-colors">사용자</Link>
        </nav>
        <Link href="/projects" className="ml-auto text-xs text-slate-400 hover:text-white transition-colors">
          ← 서비스로 돌아가기
        </Link>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
    </div>
  )
}
