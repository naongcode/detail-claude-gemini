import Anthropic from '@anthropic-ai/sdk'
import { ProductBrief, ResearchOutput, PageDesign } from './types'

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다.')
  return new Anthropic({ apiKey })
}

// ─────────────────────────────────────────────────────────────────────────────
// generateDetailPage
// Claude가 완전한 HTML + 이미지 요청 목록을 한 번에 생성
// ─────────────────────────────────────────────────────────────────────────────

export async function generateDetailPage(
  brief: ProductBrief,
  research: ResearchOutput
): Promise<PageDesign> {
  const client = getClient()

  const categoryGuides: Record<string, string> = {
    digital_product: `강의/전자책 상세페이지:
- 섹션 흐름: 히어로 → 공감(고통) → 문제원인 → 해결책 소개 → 커리큘럼 → 강사 소개 → 후기 → 보너스 → 보장 → 최종CTA
- 커리큘럼은 표나 카드 형태로 시각화
- 강사 사진, 수강생 후기 이미지 포함 권장`,

    saas: `SaaS/소프트웨어 상세페이지:
- 섹션 흐름: 히어로 → 문제 → 기능 소개 → 스크린샷/데모 → 작동방식 → 후기 → 가격 → FAQ → 최종CTA
- 스크린샷이나 UI 목업 이미지 필수
- 기능별 아이콘/일러스트 사용`,

    physical_product: `실물 제품 상세페이지:
- 섹션 흐름: 히어로(제품샷) → 문제 → 성분/소재 소개 → 사용법 → 비포/애프터 → 후기 → 보증 → 최종CTA
- 제품 상세 사진, 성분표, 사용 전후 이미지 권장
- 제품 패키지/용기 시각화`,

    service: `서비스/컨설팅 상세페이지:
- 섹션 흐름: 히어로 → 공감 → 스토리 → 프로세스 → 케이스스터디 → 전문성 → 후기 → FAQ → 최종CTA
- 전문가 프로필 사진, 포트폴리오 이미지 포함
- 과정/단계를 시각적으로 표현`,

    app: `앱 상세페이지:
- 섹션 흐름: 히어로 → 문제 → 앱 스크린샷 → 핵심기능 → 사용방법 → 후기 → 최종CTA
- 앱 UI 목업, 폰/태블릿 디바이스 프레임 이미지 권장`,

    event: `세미나/워크숍 상세페이지:
- 섹션 흐름: 히어로 → 대상/문제 → 강연자 소개 → 프로그램 구성 → 참가 혜택 → 후기 → 가격 → 최종CTA
- 강연자 사진, 행사 현장 분위기 이미지 포함`,
  }

  const categoryGuide = categoryGuides[brief.product_category] ?? categoryGuides['digital_product']

  const primaryColor = brief.brand_color?.primary ?? '#2563EB'
  const secondaryColor = brief.brand_color?.secondary ?? '#1E40AF'

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
   - **width/height HTML 속성 절대 금지** — CSS로만 크기 제어
   - 항상 style="width:100%; height:auto; display:block;" 사용
   - 이미지를 container div로 감싸고, container에 overflow:hidden + border-radius: 16px 지정
   - **container div에 width:100% 절대 금지** — width 명시 없이 auto로 둘 것
   - **full-bleed(negative margin) 사용 금지** — 이미지는 섹션 padding 안에 머물도록 할 것
     → 이미지가 좌우 여백 안에 위치하면 자연스럽게 "떠 있는" 느낌이 나고 모서리 둥글기가 적용됨
   - container에 margin-bottom: 40px 이상 줘서 이미지 위아래 여백 확보
5. **모바일 기준 750px 단일 컬럼 레이아웃** (max-width: 750px, margin: 0 auto)
   - 다단 그리드(2열, 3열, 4열) **절대 금지** — 모든 콘텐츠는 단일 컬럼으로 배치
   - 여러 항목(후기, 기능, 스텝 등)은 세로로 쌓기
   - 좌우 padding: 24px~40px
   - **position: fixed, position: sticky 절대 금지** — 모든 요소는 static 또는 relative만 사용
     → Puppeteer fullPage 스크린샷 시 fixed/sticky 요소가 반복 렌더링됨
   - **이모지(😊🎯✅ 등) 절대 금지** — 렌더링 서버에 이모지 폰트 없음, 빈 박스로 출력됨
     → 대신 텍스트 부호(✓ · → ※ ● ▶ ■)나 순수 텍스트 사용
6. Puppeteer 750px 뷰포트로 PNG 렌더링 (반응형 미디어쿼리 불필요)
7. JavaScript 사용 금지
8. 실제 제품 정보(이름, 가격, 후기 등)를 HTML에 직접 삽입

## 이미지 크기 규칙 (매우 중요)
- images 배열에서 width는 항상 750
- height는 섹션 내용 기준으로 설정:
  - 히어로: 750~1000px
  - 일반 섹션: 500~750px
  - 간단한 섹션: 400~550px
- HTML에서 <img>는 width:100%; height:auto → 이미지 원본 비율 그대로 표시됨
- prompt는 영어로, 구체적이고 상업적 품질의 이미지를 묘사
- 이미지 수: 6~10개 적당 (너무 많으면 생성 시간 과다)

## 이미지 프롬프트 작성 규칙 (핵심)
Gemini로 이미지를 생성하므로 아래 규칙을 반드시 지킬 것:

❌ 절대 금지:
- "split screen", "left side / right side", "two panels", "three panels", "before and after columns" 등 **분할 구도** 요청
  → 이미지 모델이 제대로 구현하지 못함. 대신 단일 장면으로 묘사할 것
- "with text labels", "with captions", "showing text", "add Korean text" 등 **이미지 안에 텍스트** 요청
  → 깨진 글자가 생성됨. HTML이 텍스트를 담당하므로 이미지엔 텍스트 불필요
- "diagram", "infographic", "chart", "step 1/2/3 grid" 등 **도식/인포그래픽** 요청
  → 사진/일러스트 스타일로만 요청할 것

- **제품이 등장하는 섹션(hero, product, detail, usage, material, cta 등)에서 제품 색상·형태 명시 금지**
  → "흰색 베개", "파란색 케이스" 같은 색상 묘사를 prompt에 포함하면 실제 색상과 달라짐
  → 제품 색상·소재는 실제 업로드 사진에서 Gemini가 직접 참조하므로 prompt에 적지 말 것
  → 대신 구도·분위기·조명·배경만 묘사할 것 (예: "on a clean white background, soft studio lighting, product photography")

✅ 올바른 방식:
- 단일 장면, 단일 피사체 중심으로 묘사
- before/after → 비포 장면 OR 애프터 장면 중 하나만 (애프터가 더 효과적)
- 사용법 → 제품을 사용하는 사람의 단일 장면
- 분위기/감정을 담은 라이프스타일 사진 스타일로 묘사
- "product photography", "lifestyle photography", "commercial photography" 스타일 명시
- 제품 섹션 prompt 예시: "Close-up product shot on a white marble surface, soft natural light, commercial photography style" (색상 언급 없음)

## 타이포그래피 (중요)
- 본문 폰트 크기: 최소 18px, 권장 20px
- 섹션 소제목: 24~28px
- 섹션 대제목: 40~56px
- 강조 텍스트: 28~36px
- 줄간격(line-height): 본문 1.8, 제목 1.3
- 작은 글씨(안내/면책) 외에는 절대 16px 이하 사용 금지

## 디자인 원칙
- 주 색상: ${primaryColor}, 보조 색상: ${secondaryColor}
- 섹션마다 배경색을 교차 (흰색 ↔ 연한 회색 ↔ 주 색상)
- 각 섹션은 padding: 80px 0 이상
- 한국어 폰트 사용 (Noto Sans KR 권장)
- 버튼, CTA는 눈에 띄게 크고 명확하게
- 가격 정보 강조 (취소선, 할인가 강조 등)`

  const userMessage = `카테고리: ${brief.product_category}
${categoryGuide}

## 제품 브리프
${JSON.stringify(brief, null, 2)}

## 마케팅 리서치
### 핵심 고통 포인트
${research.pain_points.map((p) => `- ${p.pain} (감정: ${p.emotional_hook})`).join('\n')}

### 실패 원인 & 재프레임
${research.failure_reasons.map((f) => `- ${f.reason} → ${f.reframe}`).join('\n')}

### 변화 후 이미지
- 구체적 결과: ${research.after_image.concrete_result}
- 감정적 해방: ${research.after_image.emotional_freedom}
- 시간 절약: ${research.after_image.time_saved}
- 라이프스타일 변화: ${research.after_image.lifestyle_change}

### 반박 & 극복
${research.objections.map((o) => `- 우려: ${o.objection} → 극복: ${o.counter}`).join('\n')}

### 차별화 포인트
${research.differentiators.map((d) => `- ${d.point}: ${d.explanation}`).join('\n')}

### 메시지 프레임워크
- 핵심 약속: ${research.message_framework.core_promise}
- 증거 포인트: ${research.message_framework.proof_points.join(', ')}
- 감정 여정: ${research.message_framework.emotional_journey}

위 정보를 바탕으로 설득력 있는 한국어 상세페이지 HTML을 생성하세요.
반드시 JSON 형식으로만 응답하고, 마크다운 코드블록을 사용하지 마세요.`

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    messages: [
      { role: 'user', content: systemPrompt + '\n\n' + userMessage },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Claude 응답이 텍스트가 아닙니다.')

  // JSON 파싱 (마크다운 코드블록이 붙어 오더라도 처리)
  let raw = content.text.trim()
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) raw = jsonMatch[1].trim()

  // JSON 파싱 시도
  let result: PageDesign
  try {
    result = JSON.parse(raw) as PageDesign
  } catch {
    // JSON이 잘려서 올 경우 마지막 완전한 이미지 요소까지만 복구 시도
    const htmlMatch = raw.match(/"html"\s*:\s*"([\s\S]*?)",\s*"images"/)
    const imagesMatch = raw.match(/"images"\s*:\s*(\[[\s\S]*?\])/)
    if (htmlMatch && imagesMatch) {
      result = {
        html: htmlMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
        images: JSON.parse(imagesMatch[1]),
      }
    } else {
      throw new Error(`Claude 응답 JSON 파싱 실패: ${raw.slice(0, 500)}`)
    }
  }

  // width 보정 (모바일 기준 750px)
  for (const img of result.images) {
    img.width = 750
    if (!img.height || img.height < 200) img.height = 600
  }

  return result
}
