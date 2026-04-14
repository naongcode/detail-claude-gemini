import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* 사업자 정보 */}
        <div className="text-xs text-slate-400 space-y-1 mb-5">
          <p>상호명: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | 사업자등록번호: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | 통신판매업 신고번호: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
          <p>이메일: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | 고객센터: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
        </div>

        {/* 링크 */}
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <Link href="/terms" className="hover:text-slate-600 transition-colors">이용약관</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-slate-600 font-semibold transition-colors">개인정보처리방침</Link>
          <span>·</span>
          <Link href="/account/delete" className="hover:text-slate-600 transition-colors">회원탈퇴</Link>
        </div>
      </div>
    </footer>
  )
}
