import OpenAI from 'openai'
import { ProductBrief, ResearchOutput } from './types'


function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.')
  return new OpenAI({ apiKey })
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: generateBrief
// ─────────────────────────────────────────────────────────────────────────────

export async function generateBrief(productDescription: string): Promise<ProductBrief> {
  const client = getClient()

  const systemPrompt =
    '당신은 전문 마케팅 전략가입니다. ' +
    '제품/서비스 설명을 받아 상세페이지 제작에 필요한 구조화된 정보를 JSON으로 반환하세요. ' +
    'product_category는 digital_product / saas / physical_product / service / app / event 중 하나로 판단하세요. ' +
    '모든 텍스트는 한국어.'

  const schema = `
다음 JSON 스키마를 정확히 따르세요:
{
  "product_name": "제품/서비스명",
  "product_category": "digital_product | saas | physical_product | service | app | event",
  "one_liner": "한 문장 핵심 설명 (결과/혜택 중심)",
  "target_audience": "핵심 타겟 고객 (구체적으로)",
  "main_problem": "타겟이 겪는 핵심 문제/고통",
  "key_benefit": "이 제품으로 얻는 핵심 결과/혜택",
  "price": {
    "original": "정가 숫자만 (예: 990000)",
    "discounted": "할인가 숫자만 (예: 490000)",
    "currency": "KRW"
  },
  "urgency": {
    "type": "quantity | date | bonus",
    "value": "긴급성 문구 (예: 선착순 50명 한정)"
  },
  "testimonials": ["후기1", "후기2"],
  "creator_bio": "제작자/브랜드 소개",
  "bonus_items": ["보너스1", "보너스2"],
  "guarantee": "환불/보장 정책",
  "brand_color": {
    "primary": "#HEX",
    "secondary": "#HEX"
  },
  "extra_fields": [
    { "key": "camelCase키", "label": "한국어 레이블", "value": "값", "hint": "이 필드에 대한 설명 (선택)" }
  ]
}

extra_fields 작성 규칙:
- product_category에 따라 상세페이지에 유용한 추가 정보를 3~6개 동적으로 구성하세요.
- 위의 고정 필드(product_name, price, target_audience 등)와 중복하지 마세요.
- 카테고리별 예시 (이 예시에 구애받지 말고 제품에 맞게 판단):
  digital_product: 커리큘럼 개요, 난이도, 총 강의 시간, 사전 조건, 수강 후 결과물
  saas: 핵심 기능 목록, 지원 연동 서비스, 무료 플랜 여부, 보안/인증 현황
  physical_product: 주요 성분, 용량/규격, 사용 방법, 인증/수상, 제조/원산지
  service: 제공 산출물, 진행 기간, 팀 구성, 협업 방식, 계약 단위
  app: 주요 기능, 지원 플랫폼, 데이터 보안, 업데이트 주기
  event: 일시/장소, 프로그램 구성, 연사 소개, 준비물, 수료증 여부`

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${schema}\n\n제품 설명: ${productDescription}` },
    ],
    temperature: 0.8,
  })

  return JSON.parse(response.choices[0].message.content!) as ProductBrief
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: generateResearch
// ─────────────────────────────────────────────────────────────────────────────

export async function generateResearch(brief: ProductBrief): Promise<ResearchOutput> {
  const client = getClient()

  const systemPrompt =
    '당신은 전문 마케팅 리서처입니다. ' +
    '제품 브리프를 분석하여 상세페이지에 필요한 심층 리서치를 JSON으로 생성하세요. ' +
    '모든 내용은 한국어로 작성하고 구체적 숫자와 상황을 포함하세요.'

  const schema = `
다음 JSON 스키마를 정확히 따르세요:
{
  "pain_points": [
    { "category": "emotional|practical|social|financial|time", "pain": "구체적 고통", "emotional_hook": "감정 공감 문구" }
  ],
  "failure_reasons": [
    { "reason": "실패 이유", "explanation": "상세 설명", "reframe": "당신 탓이 아니라..." }
  ],
  "after_image": {
    "concrete_result": "구체적 결과 (숫자 포함)",
    "emotional_freedom": "감정적 자유 상태",
    "time_saved": "절약되는 시간",
    "lifestyle_change": "라이프스타일 변화"
  },
  "objections": [
    { "objection": "반대 의견/우려", "counter": "반박/안심 메시지" }
  ],
  "differentiators": [
    { "point": "차별화 포인트", "explanation": "왜 중요한지" }
  ],
  "message_framework": {
    "core_promise": "핵심 약속 한 문장",
    "proof_points": ["증거1", "증거2", "증거3"],
    "emotional_journey": "고통 → 원인 이해 → 해결책 발견 → 변화 확신"
  }
}`

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${schema}\n\n제품 브리프:\n${JSON.stringify(brief, null, 2)}` },
    ],
    temperature: 0.7,
  })

  return JSON.parse(response.choices[0].message.content!) as ResearchOutput
}

