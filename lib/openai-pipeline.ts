import OpenAI from 'openai'
import { ProductBrief, ResearchOutput } from './types'

// Legacy types (no longer used in main pipeline)
type DesignDirection = {
  style_preset: string
  color_palette: { primary: string; accent: string; background: string }
  section_bg_pattern?: Record<string, string>
  [key: string]: unknown
}
type LayoutSpec = { sections: Array<{ id: string; label: string; order: number; type: string; dimensions: { height: number }; bg_pattern: string }>; total_sections?: number }
type CopyOutput = Record<string, unknown>
type ImagePrompts = Record<string, { prompt: string; width: number; height: number; filename: string }>

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

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: generateDesignDirection
// ─────────────────────────────────────────────────────────────────────────────

export async function generateDesignDirection(
  brief: ProductBrief,
  research: ResearchOutput
): Promise<DesignDirection> {
  const client = getClient()

  const systemPrompt =
    '당신은 전문 UI/UX 디자이너입니다. ' +
    '제품 특성과 타겟에 맞는 비주얼 방향을 결정하세요. ' +
    '섹션 구조는 결정하지 않습니다 — 컬러, 타이포, 스타일, 컴포넌트만 결정하세요. ' +
    'digital_product/event → sales/community, saas/service → minimal, physical_product (고가) → premium.'

  const schema = `
다음 JSON 스키마를 정확히 따르세요:
{
  "style_preset": "minimal | sales | premium | community",
  "color_palette": {
    "primary": "#HEX",
    "primary_light": "#HEX",
    "primary_dark": "#HEX",
    "secondary": "#HEX",
    "accent": "#HEX",
    "background": "#HEX",
    "background_alt": "#HEX",
    "surface": "#HEX",
    "text_primary": "#HEX",
    "text_secondary": "#HEX",
    "border": "#HEX"
  },
  "typography": {
    "font_family": "Noto Sans KR",
    "headline": { "weight": "bold", "size": "56px", "line_height": 1.2 },
    "subheadline": { "weight": "semibold", "size": "28px", "line_height": 1.4 },
    "body": { "weight": "regular", "size": "18px", "line_height": 1.6 },
    "cta": { "weight": "bold", "size": "20px" }
  },
  "layout": {
    "max_width": "1200px",
    "section_padding": "80px 48px",
    "border_radius": "12px"
  },
  "components": {
    "button": { "border_radius": "8px", "padding": "16px 32px", "shadow": "0 4px 6px rgba(0,0,0,0.1)" },
    "card": { "border_radius": "12px", "border": "1px solid #E5E7EB", "shadow": "0 2px 4px rgba(0,0,0,0.05)" },
    "badge": { "border_radius": "4px", "padding": "4px 12px" }
  },
  "section_bg_pattern": {
    "odd": "#FFFFFF",
    "even": "#F3F4F6",
    "hero": "gradient값",
    "cta": "gradient값",
    "dark": "#1F2937"
  },
  "mood_keywords": ["키워드1", "키워드2", "키워드3"],
  "photography_direction": "사진 스타일 방향"
}`

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `${schema}\n\n제품 브리프:\n${JSON.stringify(brief, null, 2)}\n\n리서치:\n${JSON.stringify(research, null, 2)}`,
      },
    ],
    temperature: 0.6,
  })

  return JSON.parse(response.choices[0].message.content!) as DesignDirection
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5: generateCopy (layout_spec 기반)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateCopy(
  brief: ProductBrief,
  research: ResearchOutput,
  layoutSpec: LayoutSpec
): Promise<CopyOutput> {
  const client = getClient()

  const sectionList = layoutSpec.sections
    .sort((a, b) => a.order - b.order)
    .map((s) => `- ${s.id} (${s.label})`)
    .join('\n')

  const systemPrompt =
    '당신은 대한민국 최고의 세일즈 카피라이터입니다. ' +
    '자연스러운 한국어 구어체로, 감정→논리 흐름에 맞게 각 섹션의 카피를 작성하세요. ' +
    '번역투 금지, 구체적 숫자 사용, 2인칭 활용, 짧은 문장.'

  const userMessage = `
다음 섹션 목록에 대해 카피를 작성하세요:
${sectionList}

각 섹션의 id를 key로 사용한 JSON을 반환하세요.
섹션별 구조 가이드:
- hero: { headline_options: [3개], subheadline, urgency_badge, cta_text }
- pain: { intro, pain_points: [3~4개], emotional_hook }
- problem: { hook, reasons: [3개], reframe }
- story: { before, turning_point, after, proof }
- solution / solution_intro: { intro, product_name, one_liner, target_fit }
- how_it_works: { headline, steps: [{number, title, description, result}] }
- social_proof: { headline, stats: [3개], testimonials: [{quote, name, result}] }
- authority: { intro, bio, credentials: [3개], message }
- benefits: { headline, main_benefits: [4개], bonus_items: [{item, value}], total_value }
- risk_removal: { guarantee, faq: [{question, answer}], support }
- comparison: { without: [3개], with: [3개], question }
- target_filter: { recommended: [3개], not_recommended: [2개] }
- final_cta: { headline, urgency, price_original, price_discounted, cta_button, closing }
- curriculum: { headline, modules: [{number, title, lessons, duration}], total_duration }
- features: { headline, features: [{icon_hint, title, description}] }
- ingredients: { headline, ingredients: [{name, benefit, amount}], certifications }
- process: { headline, steps: [{number, title, description, duration}] }
- case_study: { headline, cases: [{client, problem, result, duration}] }
- pricing: { headline, plans: [{name, price, features, highlight}] }
위에 없는 섹션 id는 { heading, body } 형태로 작성하세요.

제품 브리프:
${JSON.stringify(brief, null, 2)}

리서치:
${JSON.stringify(research, null, 2)}`

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.8,
    max_tokens: 8000,
  })

  return JSON.parse(response.choices[0].message.content!) as CopyOutput
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 6: generateImagePrompts (image 섹션만)
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_LAYOUT_INSTRUCTIONS: Record<string, string> = {
  hero: 'Full-width hero banner. Large headline centered or left-aligned. CTA button prominent below headline. Urgency badge in top corner.',
  pain: 'Grid of 3-4 pain point cards. Each card has an icon and short text. Empathetic tone.',
  problem: 'Hook text large and centered. 3 root causes listed. Reframe statement at bottom in highlighted box.',
  story: 'Split Before(muted)/After(vibrant) layout. Transition arrow or divider. Proof stat prominently displayed.',
  solution: 'Clean, spacious layout. Product name large and bold. One-liner below. Subtle glow around product.',
  solution_intro: 'Clean, spacious layout. Product name large and bold. One-liner below.',
  how_it_works: 'Numbered steps (1,2,3) arranged horizontally. Connecting arrows between steps.',
  social_proof: 'Stats bar at top with large numbers. 3 testimonial cards below in a grid.',
  authority: 'Split layout: creator photo on one side, credentials on the other.',
  benefits: 'Benefits list with checkmark icons. Bonus items in highlighted box with value labels.',
  risk_removal: 'Guarantee badge/shield prominently displayed. FAQ cards below.',
  comparison: 'Two-column table: Without(red X) vs With(green check). Closing question centered.',
  target_filter: 'Two columns: Recommended(checkmarks) and Not Recommended(X marks).',
  final_cta: 'High-contrast background. Large headline. Price with strikethrough. Big CTA button.',
  curriculum: 'Module list with numbering. Duration badges per module.',
  features: 'Feature cards in grid. Icon + title + description per card.',
  demo_screenshot: 'UI screenshot mockup in device frame. Feature callouts around it.',
  ingredients: 'Ingredient cards with icons. Certification badges at bottom.',
  process: 'Step-by-step timeline. Duration labels per step.',
  case_study: 'Result-focused cards. Before/After numbers prominently displayed.',
  pricing: 'Pricing plan cards side by side. Highlighted recommended plan.',
  app_screenshot: 'Mobile device mockup showing app UI. Key features highlighted.',
}

const PROMPT_TEMPLATE = `Create a professional Korean landing page section image.

=== CRITICAL REQUIREMENTS ===
1. EXACT DIMENSIONS: 1200x{height} pixels
2. FULL BLEED: NO side margins
3. REALISTIC PHOTOGRAPHY style, NOT illustrations or cartoons

=== DESIGN ===
- Style: {style_preset}
- Primary: {primary} / Accent: {accent}
- Background: {bg}

=== LAYOUT ===
{layout}

=== TEXT CONTENT (Korean) ===
{text}

✓ 1200px wide, realistic photo style, Korean text readable`

export async function generateImagePrompts(
  layoutSpec: LayoutSpec,
  copyOutput: CopyOutput,
  design: DesignDirection
): Promise<ImagePrompts> {
  const imageSections = layoutSpec.sections
    .filter((s) => s.type === 'image')
    .sort((a, b) => a.order - b.order)

  const result: ImagePrompts = {}

  for (const section of imageSections) {
    if (section.type !== 'image') continue

    const copy = copyOutput[section.id] ?? {}
    const textLines: string[] = []
    for (const v of Object.values(copy)) {
      if (typeof v === 'string' && v.trim()) textLines.push(`- ${v}`)
      else if (Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === 'string') textLines.push(`- ${item}`)
          else if (typeof item === 'object' && item !== null) {
            for (const iv of Object.values(item as Record<string, unknown>)) {
              if (typeof iv === 'string') textLines.push(`  - ${iv}`)
            }
          }
        }
      }
    }

    const bgPatternValue =
      design.section_bg_pattern?.[section.bg_pattern] ??
      design.color_palette.background

    const prompt = PROMPT_TEMPLATE
      .replace('{height}', String(section.dimensions.height))
      .replace('{style_preset}', design.style_preset)
      .replace('{primary}', design.color_palette.primary)
      .replace('{accent}', design.color_palette.accent)
      .replace('{bg}', bgPatternValue)
      .replace('{layout}', SECTION_LAYOUT_INSTRUCTIONS[section.id] ?? 'Full-width centered layout.')
      .replace('{text}', textLines.length > 0 ? textLines.join('\n') : '(Korean text for this section)')

    const filename = `${String(section.order).padStart(2, '0')}_${section.id}.png`
    result[section.id] = {
      prompt,
      width: 1200,
      height: section.dimensions.height,
      filename,
    }
  }

  return result
}
