import Link from 'next/link'

export const metadata = { title: '개인정보처리방침 | 상세페이지 생성기' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/projects" className="text-sm text-slate-400 hover:text-slate-600 mb-8 inline-block">← 돌아가기</Link>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">개인정보처리방침</h1>
        <p className="text-sm text-slate-400 mb-10">최종 수정일: 2026년 4월 14일</p>

        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-8">

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">제1조 (수집하는 개인정보 항목)</h2>
            <p className="text-slate-600">회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다.</p>
            <ul className="list-disc pl-5 mt-2 text-slate-600 space-y-1">
              <li>필수: 이메일 주소 (Google 소셜 로그인을 통해 수집)</li>
              <li>자동 수집: IP 주소, 브라우저 종류, 접속 일시, 서비스 이용 기록</li>
              <li>결제 시: 결제 금액, 거래 ID (결제 처리는 토스페이먼츠를 통해 처리되며, 카드 정보는 회사가 보유하지 않습니다)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">제2조 (수집 및 이용 목적)</h2>
            <ul className="list-disc pl-5 text-slate-600 space-y-1">
              <li>회원 식별 및 서비스 제공</li>
              <li>크레딧 결제 및 환불 처리</li>
              <li>서비스 개선 및 오류 분석</li>
              <li>법령에 따른 의무 이행</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">제3조 (보유 및 이용 기간)</h2>
            <ul className="list-disc pl-5 text-slate-600 space-y-1">
              <li>회원 탈퇴 시까지 보유 후 즉시 파기</li>
              <li>전자상거래법에 따른 거래 기록: 5년</li>
              <li>접속 로그: 3개월</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">제4조 (개인정보의 제3자 제공 및 국외 이전)</h2>
            <p className="text-slate-600 mb-2">서비스 운영을 위해 아래 업체에 개인정보가 제공·이전됩니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 px-3 py-2 text-left">업체</th>
                    <th className="border border-slate-200 px-3 py-2 text-left">국가</th>
                    <th className="border border-slate-200 px-3 py-2 text-left">이전 항목</th>
                    <th className="border border-slate-200 px-3 py-2 text-left">이용 목적</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  <tr>
                    <td className="border border-slate-200 px-3 py-2">Supabase</td>
                    <td className="border border-slate-200 px-3 py-2">미국</td>
                    <td className="border border-slate-200 px-3 py-2">이메일, 이용 기록</td>
                    <td className="border border-slate-200 px-3 py-2">데이터 저장·인증</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 px-3 py-2">Sentry</td>
                    <td className="border border-slate-200 px-3 py-2">미국</td>
                    <td className="border border-slate-200 px-3 py-2">오류 로그</td>
                    <td className="border border-slate-200 px-3 py-2">오류 추적·분석</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 px-3 py-2">토스페이먼츠</td>
                    <td className="border border-slate-200 px-3 py-2">대한민국</td>
                    <td className="border border-slate-200 px-3 py-2">결제 정보</td>
                    <td className="border border-slate-200 px-3 py-2">결제 처리</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">제5조 (이용자의 권리)</h2>
            <p className="text-slate-600">이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc pl-5 mt-2 text-slate-600 space-y-1">
              <li>개인정보 열람, 수정, 삭제 요청</li>
              <li>처리 정지 요청</li>
              <li>회원 탈퇴를 통한 개인정보 파기 요청</li>
            </ul>
            <p className="text-slate-600 mt-2">요청 연락처: <span className="font-medium"></span></p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">제6조 (개인정보 보호책임자)</h2>
            <ul className="list-disc pl-5 text-slate-600 space-y-1">
              <li>성명: </li>
              <li>직책: </li>
              <li>연락처: </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">제7조 (쿠키 사용)</h2>
            <p className="text-slate-600">
              서비스는 로그인 세션 유지를 위해 쿠키를 사용합니다.
              브라우저 설정에서 쿠키를 거부할 수 있으나, 일부 서비스 이용이 제한될 수 있습니다.
            </p>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t border-slate-200">
          <Link href="/terms" className="text-sm text-blue-600 hover:underline">이용약관 보기 →</Link>
        </div>
      </div>
    </div>
  )
}
