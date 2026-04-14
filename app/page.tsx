import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-bold text-slate-900">🐱 상세페이지 AI</span>
          <Link
            href="/login"
            className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
          >
            시작하기 →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <p className="text-sm font-semibold text-blue-600 mb-4 tracking-wide uppercase">AI 상세페이지 자동 생성</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
          제품 설명 한 줄로<br />
          <span className="text-blue-600">완성형 상세페이지</span>를 만드세요
        </h1>
        <p className="text-lg text-slate-500 mb-6 max-w-xl mx-auto">
          AI가 리서치·카피·디자인·이미지를 모두 처리합니다.<br />
          제품 정보만 입력하면 PNG 파일로 바로 다운로드.
        </p>
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold px-5 py-2.5 rounded-full">
            <span>⚡</span> 평균 7분 완성
          </div>
        </div>
        <Link
          href="/login"
          className="inline-block bg-blue-600 text-white text-base font-bold px-10 py-4 rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          무료로 시작하기
        </Link>
        <p className="text-xs text-slate-400 mt-4">카카오 인증 시 크레딧 1개 무료 제공</p>
      </section>

      {/* AI 3대장 */}
      <section className="py-14 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-3">Powered by</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
            AI 3대장이 뭉쳤습니다
          </h2>
          <p className="text-sm text-slate-500 mb-10">GPT · Claude · Gemini — 각자 가장 잘하는 일만 맡았습니다</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                logo: '🟢',
                name: 'GPT-4o',
                role: '기획 담당',
                color: 'bg-emerald-50 border-emerald-200',
                badge: 'bg-emerald-100 text-emerald-700',
                desc: '시장 리서치, 타겟 분석, 핵심 카피 기획까지. 팔리는 상세페이지의 뼈대를 세웁니다.',
              },
              {
                logo: '🟠',
                name: 'Claude',
                role: '레이아웃 전문',
                color: 'bg-orange-50 border-orange-200',
                badge: 'bg-orange-100 text-orange-700',
                desc: '섹션 구조 설계부터 픽셀 단위 HTML까지. 전환율을 높이는 레이아웃을 코딩합니다.',
              },
              {
                logo: '🔵',
                name: 'Gemini',
                role: '이미지 전문',
                color: 'bg-blue-50 border-blue-200',
                badge: 'bg-blue-100 text-blue-700',
                desc: '각 섹션에 딱 맞는 비주얼을 생성. 라이프스타일 사진부터 제품 연출 컷까지.',
              },
            ].map((ai) => (
              <div key={ai.name} className={`rounded-2xl border p-6 text-left ${ai.color}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{ai.logo}</span>
                  <div>
                    <p className="font-extrabold text-slate-900 leading-tight">{ai.name}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ai.badge}`}>{ai.role}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{ai.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 작동 방식 */}
      <section className="bg-slate-50 border-y border-slate-200 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">이렇게 작동합니다</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: '📝',
                title: '제품 정보 입력',
                desc: '제품명, 타겟 고객, 핵심 혜택을 입력하거나 한 줄 설명만 써도 AI가 자동으로 채워줍니다.',
              },
              {
                step: '02',
                icon: '🤖',
                title: 'AI 파이프라인 실행',
                desc: 'GPT-4o가 시장을 분석하고, Claude가 HTML을 설계하고, Gemini가 이미지를 생성합니다.',
              },
              {
                step: '03',
                icon: '📥',
                title: 'PNG 다운로드',
                desc: '750px 단일 컬럼 완성형 상세페이지가 PNG 파일로 생성됩니다. 쇼핑몰에 바로 업로드하세요.',
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-7 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">STEP {item.step}</span>
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <h3 className="font-bold text-slate-800 text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 결과물 예시 */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">실제 결과물</h2>
        <p className="text-sm text-slate-500 text-center mb-12">제품 사진 1장을 업로드하면 아래와 같은 상세페이지가 자동 생성됩니다</p>

        <div className="max-w-xl mx-auto space-y-6">
          {/* 입력 */}
          <div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">INPUT</span>
              <span className="text-sm text-slate-600 font-medium">사진이랑 문구 입력</span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="inline-block bg-slate-100 rounded-2xl border border-slate-200 p-3">
                <Image
                  src="/코카콜라_입력.jpg"
                  alt="제품 사진 입력 예시"
                  width={120}
                  height={120}
                  className="w-30 h-30 object-contain rounded-xl"
                />
              </div>
              <span className="text-4xl font-black text-slate-300 select-none">+</span>
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
                "상쾌하고 짜릿한 코카콜라"
              </div>
            </div>
          </div>

          {/* 화살표 */}
          <div className="text-center leading-none">
            <span className="text-5xl font-black text-slate-300 select-none">↓</span>
          </div>

          {/* 결과 */}
          <div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">OUTPUT</span>
              <span className="text-sm text-slate-600 font-medium">생성된 결과물</span>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md">
              <Image
                src="/코카콜라_결과.png"
                alt="AI 생성 상세페이지 예시"
                width={750}
                height={2000}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 가격 */}
      <section className="bg-slate-50 border-y border-slate-200 py-16">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">심플한 가격</h2>
          <p className="text-sm text-slate-500 text-center mb-10">디자이너 외주 비용의 10분의 1 이하</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: '1개', price: '20,000', unit: '개당 20,000원', highlight: false },
              { label: '3개', price: '50,000', unit: '개당 16,667원', highlight: true },
              { label: '10개', price: '150,000', unit: '개당 15,000원', highlight: false },
            ].map((pkg) => (
              <div
                key={pkg.label}
                className={`rounded-2xl p-6 text-center border ${
                  pkg.highlight
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <p className={`text-sm font-semibold mb-1 ${pkg.highlight ? 'text-blue-100' : 'text-slate-500'}`}>{pkg.label}</p>
                <p className={`text-3xl font-extrabold mb-1 ${pkg.highlight ? 'text-white' : 'text-slate-900'}`}>
                  ₩{pkg.price}
                </p>
                <p className={`text-xs ${pkg.highlight ? 'text-blue-200' : 'text-slate-400'}`}>{pkg.unit}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/purchase"
              className="inline-block bg-blue-600 text-white text-sm font-bold px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              크레딧 구매하기
            </Link>
            <p className="mt-3 text-xs text-slate-400">카카오 인증 시 크레딧 1개 무료 · 만족하지 않으면 환불</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-extrabold text-slate-900 mb-4">지금 바로 만들어보세요</h2>
        <p className="text-slate-500 mb-8">30분 안에 상세페이지가 완성됩니다</p>
        <Link
          href="/login"
          className="inline-block bg-blue-600 text-white text-base font-bold px-10 py-4 rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          무료로 시작하기 →
        </Link>
      </section>

      <Footer />
    </div>
  )
}
