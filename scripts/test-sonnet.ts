/**
 * Sonnet 모델 품질 테스트
 * 실행: npx tsx scripts/test-sonnet.ts
 *
 * ANTHROPIC_API_KEY 환경변수 필요 (.env.local 자동 로드)
 * ANTHROPIC_MODEL 환경변수로 모델 오버라이드 가능 (기본: claude-sonnet-4-6)
 */

import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'

// .env.local 로드
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
  }
}

// env의 ANTHROPIC_MODEL 무시 — 소넷 테스트가 목적
// npx tsx scripts/test-sonnet.ts claude-opus-4-6  으로 다른 모델 지정 가능
const MODEL = process.argv[2] ?? 'claude-sonnet-4-6'

// ─── 샘플 데이터 ────────────────────────────────────────────────────────────

const sampleBrief = {
  product_name: '30일 퇴근 후 영어 마스터 클래스',
  product_category: 'digital_product',
  one_liner: '하루 20분, 30일이면 원어민과 편하게 대화할 수 있습니다',
  target_audience: '직장인, 30~40대, 영어 공부를 여러 번 시도했지만 매번 포기한 사람',
  main_problem: '바쁜 일상 때문에 영어 공부할 시간이 없고, 기존 학습법은 지루해서 포기',
  key_benefit: '출퇴근·점심시간에 15~20분만 투자해도 회화 실력이 눈에 띄게 향상',
  price: { original: '297,000', discounted: '97,000', currency: 'KRW' },
  urgency: { type: '조기마감', value: '선착순 50명', bonus: '1:1 피드백 세션 무료 제공' },
  testimonials: [
    '3주 만에 해외 바이어와 영어 미팅 성공했어요! - 김○○ 대리',
    '매일 15분인데 한 달 후 영화가 들리기 시작했습니다 - 이○○ 과장',
  ],
  creator_bio: '前 삼성전자 글로벌 사업부 10년, 영어 코치 경력 5년, 수강생 3,000명 돌파',
  guarantee: '30일 수강 후 효과 없으면 100% 환불',
  brand_color: { primary: '#1D4ED8', secondary: '#1E3A8A' },
}

const sampleResearch = {
  pain_points: [
    { category: '시간', pain: '퇴근 후 너무 피곤해서 공부 엄두가 안 남', emotional_hook: '또 오늘도 못 했다는 자책감' },
    { category: '효과', pain: '수백만 원 쓴 학원인데 실전에서 입이 안 열림', emotional_hook: '돈만 날렸다는 배신감' },
    { category: '지속성', pain: '의욕 넘쳐 시작해도 2주 만에 포기', emotional_hook: '의지력 부족한 나 자신이 싫음' },
  ],
  failure_reasons: [
    { reason: '긴 커리큘럼 부담', explanation: '1~2시간 강의는 직장인에겐 무리', reframe: '15~20분 마이크로 러닝으로 부담 제거' },
    { reason: '실전 연습 부족', explanation: '문법·단어만 외우고 말하기 연습 없음', reframe: '매 강의 Real 회화 시뮬레이션 포함' },
  ],
  after_image: {
    concrete_result: '원어민 동료와 점심 영어 대화, 해외 미팅 단독 진행',
    emotional_freedom: '영어 때문에 기회 놓치는 불안감에서 완전히 해방',
    time_saved: '통·번역 의존 시간 0, 직접 소통으로 업무 속도 2배',
    lifestyle_change: '해외 출장·이민·이직 등 선택지가 무한히 넓어짐',
  },
  objections: [
    { objection: '바빠서 하루 20분도 못 낼 것 같아요', counter: '알림 설정만 하면 자동으로 학습 루틴이 만들어집니다' },
    { objection: '기초가 너무 없어서요', counter: '중학교 영어 수준이면 충분합니다. Day 1부터 차근차근 시작' },
  ],
  differentiators: [
    { point: '마이크로 러닝 설계', explanation: '15~20분 단위로 쪼개 바쁜 직장인도 완주 가능' },
    { point: '실전 시나리오 300개', explanation: '비즈니스·일상 실전 표현만 엄선해 즉시 활용 가능' },
  ],
  message_framework: {
    core_promise: '30일, 하루 20분으로 직장 영어 자신감 완성',
    proof_points: ['수강생 3,000명 돌파', '만족도 96%', '30일 환불 보장'],
    emotional_journey: '포기 반복 → 시스템 발견 → 작은 성공 경험 → 자신감 폭발',
  },
}

// ─── 체크 함수 ───────────────────────────────────────────────────────────────

function checkHtmlQuality(html: string): { pass: boolean; issues: string[] } {
  const issues: string[] = []

  if (!html.includes('<!DOCTYPE html>')) issues.push('DOCTYPE 누락')
  if (!html.includes('Noto Sans KR') && !html.includes('font-family')) issues.push('폰트 미적용')
  if (html.includes('style="') === false && !html.includes('<style>')) issues.push('인라인 스타일 없음')
  if (html.match(/font-size:\s*(\d+)px/) && parseInt(html.match(/font-size:\s*(\d+)px/)![1]) < 18)
    issues.push('폰트 16px 이하 존재 가능성')
  if (html.includes('position: fixed') || html.includes('position:fixed')) issues.push('position:fixed 사용됨')
  if (html.includes('position: sticky') || html.includes('position:sticky')) issues.push('position:sticky 사용됨')
  if (html.includes('<script')) issues.push('JavaScript 포함됨')
  if (html.match(/__GEN_\w+__/g) === null) issues.push('이미지 플레이스홀더 없음')
  if (html.includes('grid-template-columns') || html.includes('display: grid')) issues.push('그리드 레이아웃 사용됨')

  const placeholders = html.match(/__GEN_(\w+)__/g) ?? []
  return { pass: issues.length === 0, issues }
}

function checkImages(images: Array<{ id: string; prompt: string; width: number; height: number }>): { pass: boolean; issues: string[] } {
  const issues: string[] = []

  if (images.length < 4) issues.push(`이미지 수 부족: ${images.length}개`)
  if (images.length > 12) issues.push(`이미지 수 과다: ${images.length}개`)

  for (const img of images) {
    if (img.width !== 750) issues.push(`${img.id}: width=${img.width} (750이어야 함)`)
    if (img.height < 200) issues.push(`${img.id}: height=${img.height} (너무 작음)`)
    if (/split screen|left side|right side|two panels|before and after columns/i.test(img.prompt))
      issues.push(`${img.id}: 분할 구도 금지 위반`)
    if (/with text|text label|korean text|caption/i.test(img.prompt))
      issues.push(`${img.id}: 텍스트 포함 금지 위반`)
    if (/diagram|infographic|chart/i.test(img.prompt))
      issues.push(`${img.id}: 도식 금지 위반`)
  }

  return { pass: issues.length === 0, issues }
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY가 설정되지 않았습니다.')
    process.exit(1)
  }

  console.log(`\n🧪 Claude 모델 테스트 시작`)
  console.log(`   모델: ${MODEL}`)
  console.log(`   제품: ${sampleBrief.product_name}\n`)

  const client = new Anthropic({ apiKey })

  // ── 프롬프트 구성 (claude.ts와 동일한 시스템/유저 메시지) ──

  const systemPrompt = `당신은 한국 이커머스 상세페이지 전문 디자이너 겸 카피라이터입니다.
제품 정보와 마케팅 리서치를 바탕으로 완전한 HTML 상세페이지를 생성합니다.

## 출력 형식
반드시 다음 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이):
{
  "html": "완전한 HTML 문자열",
  "images": [
    {
      "id": "영문_소문자_snake_case (예: hero, pain_point, solution)",
      "prompt": "Gemini 이미지 생성용 영문 프롬프트 (상세하고 구체적으로)",
      "width": 1200,
      "height": 숫자
    }
  ]
}

## HTML 작성 규칙
1. 완전한 독립 HTML 파일 (<!DOCTYPE html>부터 </html>까지)
2. 모든 CSS는 <head>의 <style> 태그 안에 인라인으로 작성 (외부 CSS 링크 금지)
3. 외부 폰트는 Google Fonts @import 사용 가능 (예: Noto Sans KR)
4. 이미지 자리에는 반드시 <img src="__GEN_id__" ...> 형태로 작성
   - id는 images 배열의 id와 동일해야 함
   - alt 속성 필수
   - width/height HTML 속성 절대 금지 — CSS로만 크기 제어
   - 항상 style="width:100%; height:auto; display:block;" 사용
   - 이미지를 container div로 감싸고, container에 overflow:hidden + border-radius: 16px 지정
   - container div에 width:100% 절대 금지
   - full-bleed(negative margin) 사용 금지
   - container에 margin-bottom: 40px 이상
5. 모바일 기준 750px 단일 컬럼 레이아웃 (max-width: 750px, margin: 0 auto)
   - 다단 그리드(2열, 3열, 4열) 절대 금지
   - 좌우 padding: 24px~40px
   - position: fixed, position: sticky 절대 금지
   - 이모지(😊🎯✅ 등) 절대 금지
6. JavaScript 사용 금지
7. 실제 제품 정보를 HTML에 직접 삽입

## 이미지 크기 규칙
- images 배열에서 width는 항상 750
- height: 히어로 750~1000px, 일반 500~750px, 간단 400~550px
- 이미지 수: 6~10개

## 이미지 프롬프트 규칙
절대 금지: 분할 구도, 텍스트 포함, 도식/인포그래픽
올바른 방식: 단일 장면, lifestyle/commercial photography 스타일

## 타이포그래피
- 본문 최소 18px, 권장 20px
- 줄간격 본문 1.8, 제목 1.3

## 디자인 원칙
- 주 색상: #1D4ED8, 보조 색상: #1E3A8A
- 각 섹션 padding: 80px 0 이상
- 한국어 폰트 (Noto Sans KR 권장)`

  const userMessage = `카테고리: digital_product

## 제품 브리프
${JSON.stringify(sampleBrief, null, 2)}

## 마케팅 리서치
### 핵심 고통 포인트
${sampleResearch.pain_points.map((p) => `- ${p.pain} (감정: ${p.emotional_hook})`).join('\n')}

### 실패 원인 & 재프레임
${sampleResearch.failure_reasons.map((f) => `- ${f.reason} → ${f.reframe}`).join('\n')}

### 변화 후 이미지
- 구체적 결과: ${sampleResearch.after_image.concrete_result}
- 감정적 해방: ${sampleResearch.after_image.emotional_freedom}
- 시간 절약: ${sampleResearch.after_image.time_saved}
- 라이프스타일 변화: ${sampleResearch.after_image.lifestyle_change}

### 반박 & 극복
${sampleResearch.objections.map((o) => `- 우려: ${o.objection} → 극복: ${o.counter}`).join('\n')}

### 차별화 포인트
${sampleResearch.differentiators.map((d) => `- ${d.point}: ${d.explanation}`).join('\n')}

### 메시지 프레임워크
- 핵심 약속: ${sampleResearch.message_framework.core_promise}
- 증거 포인트: ${sampleResearch.message_framework.proof_points.join(', ')}
- 감정 여정: ${sampleResearch.message_framework.emotional_journey}

위 정보를 바탕으로 설득력 있는 한국어 상세페이지 HTML을 생성하세요.
반드시 JSON 형식으로만 응답하고, 마크다운 코드블록을 사용하지 마세요.`

  const startTime = Date.now()

  let message: Awaited<ReturnType<typeof client.messages.create>>
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      messages: [{ role: 'user', content: systemPrompt + '\n\n' + userMessage }],
    })
  } catch (err) {
    console.error('❌ API 호출 실패:', err)
    process.exit(1)
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log(`⏱  응답 시간: ${elapsed}s`)
  console.log(`📊 토큰: input=${message.usage.input_tokens}, output=${message.usage.output_tokens}`)
  console.log(`   stop_reason: ${message.stop_reason}\n`)

  // ── 파싱 ──
  const content = message.content[0]
  if (content.type !== 'text') {
    console.error('❌ 텍스트 응답이 아님')
    process.exit(1)
  }

  let raw = content.text.trim()
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) raw = jsonMatch[1].trim()

  let result: { html: string; images: Array<{ id: string; prompt: string; width: number; height: number }> }
  try {
    result = JSON.parse(raw)
  } catch {
    console.error('❌ JSON 파싱 실패')
    console.error('응답 앞 500자:', raw.slice(0, 500))
    process.exit(1)
  }

  // ── 품질 체크 ──
  const htmlCheck = checkHtmlQuality(result.html)
  const imgCheck = checkImages(result.images)

  console.log('─────────────────────────────────────────')
  console.log('HTML 품질 체크:', htmlCheck.pass ? '✅ PASS' : '⚠️  ISSUES')
  if (htmlCheck.issues.length) htmlCheck.issues.forEach((i) => console.log(`   - ${i}`))

  console.log('이미지 요청 체크:', imgCheck.pass ? '✅ PASS' : '⚠️  ISSUES')
  if (imgCheck.issues.length) imgCheck.issues.forEach((i) => console.log(`   - ${i}`))

  console.log('\n이미지 목록:')
  result.images.forEach((img) =>
    console.log(`  [${img.id}] ${img.width}×${img.height} — ${img.prompt.slice(0, 80)}…`)
  )

  // ── 결과 저장 ──
  const outDir = path.join(process.cwd(), 'scripts', 'test-output')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const modelSlug = MODEL.replace(/[^a-z0-9-]/gi, '-')
  const htmlFile = path.join(outDir, `${modelSlug}-${timestamp}.html`)
  const jsonFile = path.join(outDir, `${modelSlug}-${timestamp}.json`)

  fs.writeFileSync(htmlFile, result.html, 'utf-8')
  fs.writeFileSync(jsonFile, JSON.stringify(result.images, null, 2), 'utf-8')

  console.log(`\n📁 결과 저장됨:`)
  console.log(`   HTML: scripts/test-output/${path.basename(htmlFile)}`)
  console.log(`   이미지 목록: scripts/test-output/${path.basename(jsonFile)}`)
  console.log('\n브라우저에서 HTML 파일을 열어 렌더링 품질을 직접 확인하세요.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
