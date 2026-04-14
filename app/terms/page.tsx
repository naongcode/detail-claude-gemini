import Link from 'next/link'

export const metadata = { title: '이용약관 | 상세페이지 생성기' }

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/projects" className="text-sm text-slate-400 hover:text-slate-600 mb-8 inline-block">← 돌아가기</Link>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">이용약관</h1>
        <p className="text-sm text-slate-400 mb-10">최종 수정일: 2026년 4월 14일 | 시행일: 2026년 4월 14일</p>

        <div className="text-sm leading-relaxed space-y-8 text-slate-600">

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">제1조 (목적)</h2>
            <p>본 약관은 회사가 제공하는 AI 상세페이지 자동 생성 서비스(이하 &quot;서비스&quot;)의 이용 조건 및 절차, 회사와 이용자 간의 권리·의무 관계를 규정함을 목적으로 합니다.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">제2조 (서비스 내용)</h2>
            <p>서비스는 이용자가 입력한 제품 정보를 기반으로 AI가 이커머스 상세페이지 HTML 및 이미지를 자동 생성하는 기능을 제공합니다.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">제3조 (크레딧 및 결제)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>서비스 이용은 크레딧 방식으로 운영됩니다.</li>
              <li>크레딧은 유효기간 없이 구매일로부터 회원 탈퇴 시까지 유효합니다.</li>
              <li>크레딧 구매 후 미사용분은 구매일로부터 7일 이내에 전액 환불이 가능합니다.</li>
              <li>사용된 크레딧은 환불되지 않습니다. 단, 서비스 오류로 인한 크레딧 소모는 복구될 수 있습니다.</li>
              <li>결제는 토스페이먼츠를 통해 처리됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">제4조 (AI 생성 결과물의 권리)</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>이용자가 입력한 제품명, 브랜드 정보, 업로드한 사진 등의 권리는 이용자에게 귀속됩니다.</li>
              <li>서비스를 통해 AI가 생성한 카피라이팅, 이미지 등의 결과물은 각 AI 제공사(Anthropic, OpenAI, Google)의 이용약관에 따릅니다.</li>
              <li>이용자는 생성 결과물을 상업적 목적으로 사용할 경우, 각 AI 모델 제공사의 최신 이용약관을 직접 확인할 의무가 있습니다.</li>
              <li>회사는 생성 결과물의 정확성, 완전성, 특정 목적에의 적합성을 보장하지 않습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">제5조 (이용 제한)</h2>
            <p className="mb-2">다음에 해당하는 경우 서비스 이용을 제한할 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>타인의 개인정보를 도용하거나 허위 정보를 제공한 경우</li>
              <li>서비스를 통해 불법적인 콘텐츠를 생성하려는 경우</li>
              <li>시스템에 과부하를 주거나 정상적인 서비스를 방해하는 경우</li>
              <li>기타 관련 법령 및 본 약관을 위반한 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">제6조 (서비스 변경 및 중단)</h2>
            <p>회사는 서비스 변경 또는 중단 시 최소 30일 전 서비스 내 공지합니다. 단, 불가피한 사유로 사전 고지가 어려운 경우 즉시 공지합니다.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">제7조 (만 14세 미만 이용 제한)</h2>
            <p>만 14세 미만 이용자는 법정대리인의 동의 없이 서비스에 가입할 수 없습니다. 가입 시 만 14세 이상임을 확인합니다.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">제8조 (면책 조항)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>천재지변, AI 서비스 장애 등 불가항력으로 인한 서비스 중단에 대해 회사는 책임을 지지 않습니다.</li>
              <li>이용자가 생성한 결과물의 사용으로 발생하는 분쟁은 이용자의 책임입니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">제9조 (준거법 및 관할)</h2>
            <p>본 약관은 대한민국 법률에 따라 해석되며, 서비스 이용과 관련된 분쟁은 대한민국 법원을 관할 법원으로 합니다.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">회사 정보</h2>
            <ul className="space-y-1">
              <li>상호명: </li>
              <li>사업자등록번호: </li>
              <li>이메일: </li>
            </ul>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t border-slate-200">
          <Link href="/privacy" className="text-sm text-blue-600 hover:underline">개인정보처리방침 보기 →</Link>
        </div>
      </div>
    </div>
  )
}
