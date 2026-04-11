# 상세페이지 생성기 — 전체 파이프라인

AI가 제품 카테고리에 맞는 구조를 동적으로 설계하는 상세페이지 자동 생성기.
Next.js 웹서비스로 구현.

---

## 전체 파이프라인

```
[1]  제품 설명 입력
          ↓
[2]  GPT-4o — 브리프 생성         → structured_brief.json
     (product_category 포함)
          ↓
[3]  GPT-4o — 리서치 분석         → research_output.json
          ↓
[4]  GPT-4o — 디자인 방향         → design_direction.json
     (섹션 구조 미결정, 컬러/타이포/스타일만)
          ↓
[5]  Claude — 레이아웃 설계       → layout_spec.json  ← 핵심
     (카테고리 기반 섹션 동적 결정)
          ↓
[6]  GPT-4o — 카피 작성           → copy_output.json
     (layout_spec 섹션 목록 기준)
          ↓
[7]  GPT-4o — Gemini 프롬프트     → gemini_prompts.json
     (image 타입 섹션만)
          ↓
[8]  Gemini — 이미지 생성         → sections/{order}_{id}.png
          ↓
[9]  HTML 조립                    → page.html
     (text 섹션: HTML / image 섹션: <img>)
          ↓
[10] Puppeteer → PNG              → final_page.png
```

---

## 문서 구조

| 파일 | 단계 | 담당 |
|---|---|---|
| `01-intake.md` | Step 2 | GPT-4o — 브리프 + 카테고리 수집 |
| `02-research.md` | Step 3 | GPT-4o — 리서치 분석 |
| `04-design-direction.md` | Step 4 | GPT-4o — 디자인 방향 |
| `05-layout-design.md` | Step 5 | Claude — 레이아웃 설계 |
| `06-copy.md` | Step 6 | GPT-4o — 카피 작성 |
| `07-prompt-generator.md` | Step 7 | GPT-4o — Gemini 프롬프트 |

---

## 레이아웃 스펙 (layout_spec.json)

Claude가 출력하는 핵심 구조체. 이후 모든 단계의 기준이 됩니다.

```json
{
  "product_category": "digital_product",
  "total_sections": 11,
  "sections": [
    {
      "id": "hero",
      "label": "히어로",
      "type": "image",
      "order": 1,
      "image_source": "ai_generate",
      "prompt_hint": "강렬한 히어로 비주얼",
      "dimensions": { "width": 1200, "height": 800 },
      "bg_pattern": "hero"
    },
    {
      "id": "pain",
      "label": "페인포인트",
      "type": "text",
      "order": 2,
      "style": "dark_bg_white_text",
      "bg_pattern": "dark"
    },
    {
      "id": "curriculum",
      "label": "커리큘럼",
      "type": "text",
      "order": 5,
      "style": "light_bg_dark_text",
      "bg_pattern": "even",
      "note": "digital_product 특화 섹션"
    }
  ],
  "design_tokens": {
    "primary": "#2563EB",
    "accent": "#F59E0B",
    "font_family": "Noto Sans KR"
  }
}
```

---

## HTML 조립 (`lib/html-builder.ts`)

```html
<div class="page" style="width:1200px; font-family:'Noto Sans KR'">

  <!-- type: image -->
  <div class="section" style="background: {bg}">
    <img src="file:///...sections/01_hero.png" width="1200" />
  </div>

  <!-- type: text, style: dark_bg_white_text -->
  <div class="section" style="background:#1F2937; color:#fff; padding:80px 48px">
    <h2>{copy.pain.intro}</h2>
    <ul>{copy.pain.pain_points}</ul>
  </div>

  <!-- type: text, style: light_bg_dark_text -->
  <div class="section" style="background:#F3F4F6; padding:80px 48px">
    <h2>{copy.curriculum.headline}</h2>
    ...
  </div>

</div>
```

---

## Puppeteer 렌더링 (`lib/renderer.ts`)

```typescript
const browser = IS_VERCEL
  ? await puppeteer.launch({ executablePath: await chromium.executablePath() })
  : await puppeteer.launch()

const page = await browser.newPage()
await page.setViewport({ width: 1200, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'networkidle0' })
await page.screenshot({ path: outputPath, fullPage: true })
await browser.close()
```

---

## 파일 구조

```
detail-claude-gemini/
├── lib/
│   ├── openai-pipeline.ts    # generateBrief / generateResearch / generateDesignDirection
│   │                         # generateCopy / generateImagePrompts
│   ├── claude.ts             # generateLayoutSpec
│   ├── gemini.ts             # generateSectionImage
│   ├── html-builder.ts       # buildHtml(layoutSpec, copyOutput, designDirection)
│   ├── renderer.ts           # renderToPng(html) → Puppeteer
│   ├── projects.ts           # 파일시스템 관리
│   └── types.ts
├── app/api/projects/[id]/generate/
│   ├── brief/route.ts        # Step 2
│   └── pipeline/route.ts     # Step 3~10 SSE 스트리밍
└── projects/{id}/
    ├── structured_brief.json
    ├── research_output.json
    ├── design_direction.json
    ├── layout_spec.json       ← Claude 출력
    ├── copy_output.json
    ├── gemini_prompts.json
    ├── product_photos/
    ├── sections/
    └── final_page.png
```

---

## 환경변수

```env
OPENAI_API_KEY=      # GPT-4o
ANTHROPIC_API_KEY=   # Claude
GEMINI_API_KEY=      # Gemini
```
