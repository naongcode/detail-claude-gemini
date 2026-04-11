// ─────────────────────────────────────────────────────────────────────────────
// 제품 카테고리
// ─────────────────────────────────────────────────────────────────────────────

export type ProductCategory =
  | 'digital_product'   // 강의, 전자책, 템플릿
  | 'saas'              // 소프트웨어, 구독 서비스
  | 'physical_product'  // 실물 상품, 건강식품, 화장품
  | 'service'           // 컨설팅, 코칭, 에이전시
  | 'app'               // 모바일/웹 앱
  | 'event'             // 세미나, 강연, 워크숍

// ─────────────────────────────────────────────────────────────────────────────
// 파이프라인 이벤트
// ─────────────────────────────────────────────────────────────────────────────

export interface PipelineEvent {
  type?: 'step' | 'step_done' | 'done' | 'error'
  step?: number
  message?: string
  sectionId?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: 브리프
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductBrief {
  product_name: string
  product_category: ProductCategory
  testimonials_raw?: string
  bonus_items_raw?: string
  one_liner: string
  target_audience: string
  main_problem: string
  key_benefit: string
  price: {
    original: string
    discounted: string
    currency: string
  }
  urgency: {
    type: string
    value: string
    bonus?: string
  }
  testimonials?: string[]
  creator_bio?: string
  bonus_items?: string[]
  guarantee?: string
  faq?: Array<{ question: string; answer: string }>
  brand_color?: {
    primary: string
    secondary: string
  }
  field_labels?: Record<string, string>
  category_specific?: Record<string, unknown>
  extra_fields?: Array<{
    key: string
    label: string
    value: string
    hint?: string
  }>
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: 리서치
// ─────────────────────────────────────────────────────────────────────────────

export interface ResearchOutput {
  pain_points: Array<{
    category: string
    pain: string
    emotional_hook: string
  }>
  failure_reasons: Array<{
    reason: string
    explanation: string
    reframe: string
  }>
  after_image: {
    concrete_result: string
    emotional_freedom: string
    time_saved: string
    lifestyle_change: string
  }
  objections: Array<{
    objection: string
    counter: string
  }>
  differentiators: Array<{
    point: string
    explanation: string
  }>
  message_framework: {
    core_promise: string
    proof_points: string[]
    emotional_journey: string
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Claude 페이지 디자인 (전체 HTML + 이미지 요청 목록)
// ─────────────────────────────────────────────────────────────────────────────

export interface ImageRequest {
  id: string           // 플레이스홀더 ID: HTML에서 __GEN_id__ 로 참조
  prompt: string       // Gemini용 영문 이미지 생성 프롬프트
  width: number
  height: number
}

export interface PageDesign {
  html: string              // 완성된 HTML (이미지 자리에 __GEN_id__ 플레이스홀더)
  images: ImageRequest[]    // Gemini가 생성해야 할 이미지 목록
}

// ─────────────────────────────────────────────────────────────────────────────
// 프로젝트 관리
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectMeta {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface ProjectStatus {
  hasBrief: boolean
  hasResearch: boolean
  hasPageDesign: boolean
  imageTotal: number       // page_design.json 기준 총 이미지 수
  imageGenerated: number   // 생성 완료된 이미지 수
  photoCount: number
  hasFinalPng: boolean
}
