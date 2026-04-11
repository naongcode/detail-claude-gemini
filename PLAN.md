# detail-claude-gemini 기획서

AI가 구조를 동적으로 설계하는 상세페이지 자동 생성기

---

## 기존 프로젝트(detail-ux-nextjs)와 차이점

| 항목 | detail-ux-nextjs | detail-claude-gemini |
|---|---|---|
| 섹션 구조 | 13개 고정 | 동적 (제품마다 다름) |
| 레이아웃 설계 | 하드코딩 | Claude가 결정 |
| 텍스트 처리 | Gemini 이미지 안에 굽기 | HTML 텍스트 섹션 분리 |
| 이미지 처리 | Gemini 생성 고정 | Gemini 생성 or 유저 업로드 |
| 최종 합성 | Sharp (이미지 수직 스티칭) | Puppeteer (HTML → PNG 스크린샷) |
| 카피 생성 | GPT-4o | GPT-4o (기존 유지) |
| 레이아웃 설계 | 없음 | Claude (신규) |

---

## 전체 파이프라인

```
[1] 제품 설명 입력
        ↓
[2] GPT-4o — 브리프 생성
    (제품명, 타겟, 핵심 가치, 가격, 보증, product_category 포함)
        ↓
[3] GPT-4o — 리서치 분석
    (페인포인트, 반대 의견, 차별점, 메시지 프레임)
        ↓
[4] GPT-4o — 디자인 방향
    (컬러, 타이포, 무드, 스타일 — 섹션 구조는 미결정)
        ↓
[5] Claude — 레이아웃 설계  ← 핵심 신규 단계
    (product_category 기반으로 섹션 개수/순서/타입 동적 결정)
        ↓
[6] GPT-4o — 카피 작성
    (layout_spec의 섹션 목록 기준으로 각 섹션 텍스트 작성)
        ↓
[7] GPT-4o — Gemini 프롬프트 생성
    (layout_spec의 image 타입 섹션만 대상)
        ↓
[8] Gemini — 이미지 섹션 생성
        ↓
[9] HTML 조립
    (텍스트 섹션 + 이미지 섹션 → 단일 HTML)
        ↓
[10] Puppeteer — HTML → PNG 스크린샷
```

---

## [6] 레이아웃 설계 상세

Claude가 브리프 + 리서치 + 카피 + 디자인 방향을 받아서 아래 형태의 JSON을 출력한다.

```json
{
  "sections": [
    {
      "id": "hero",
      "type": "image",
      "order": 1,
      "image_source": "ai_generate",
      "prompt_hint": "강렬한 히어로 비주얼, 제품 중심",
      "dimensions": { "width": 1200, "height": 600 }
    },
    {
      "id": "pain_description",
      "type": "text",
      "order": 2,
      "content": {
        "heading": "지금 이런 문제로 지치셨나요?",
        "body": "...",
        "style": "dark_bg_white_text"
      }
    },
    {
      "id": "product_photo",
      "type": "image",
      "order": 3,
      "image_source": "user_photo",
      "fallback": "ai_generate",
      "dimensions": { "width": 1200, "height": 500 }
    },
    ...
  ]
}
```

### 섹션 타입

| 타입 | 설명 | 처리 방식 |
|---|---|---|
| `image` | 이미지 중심 섹션 | Gemini 생성 or 유저 업로드 |
| `text` | 텍스트 중심 섹션 | HTML 마크업으로 렌더 |

### image_source 옵션

| 값 | 동작 |
|---|---|
| `ai_generate` | Gemini API 호출 |
| `user_photo` | 업로드된 제품 사진 사용 |
| `user_photo` + `fallback: "ai_generate"` | 유저 사진 있으면 사용, 없으면 Gemini |

### text 섹션 스타일 프리셋

Claude가 디자인 방향에 맞게 선택

- `light_bg_dark_text` — 흰 배경, 진한 텍스트
- `dark_bg_white_text` — 어두운 배경, 흰 텍스트
- `accent_bg` — 브랜드 컬러 배경
- `split_text_image` — 텍스트 + 이미지 좌우 배치 (이미지 포함)

---

## [8] HTML 조립 구조

```html
<div class="page" style="width: 1200px;">

  <!-- image 섹션 -->
  <div class="section section-image">
    <img src="/sections/01_hero.png" width="1200" />
  </div>

  <!-- text 섹션 -->
  <div class="section section-text dark_bg_white_text">
    <h2>지금 이런 문제로 지치셨나요?</h2>
    <p>...</p>
  </div>

  <!-- user_photo 섹션 -->
  <div class="section section-image">
    <img src="/product_photos/product_01.jpg" width="1200" />
  </div>

</div>
```

폰트는 Google Fonts (Noto Sans KR) CDN으로 로드.

---

## [9] Puppeteer 렌더링

```
Puppeteer (Headless Chromium)
  → page.setViewport({ width: 1200 })
  → page.setContent(html)
  → page.waitForNetworkIdle()   // 폰트, 이미지 로드 대기
  → page.screenshot({ fullPage: true })
  → final_page.png 저장
```

### Vercel 환경 대응

로컬: `puppeteer` (Chromium 자동 설치)

Vercel: `puppeteer-core` + `@sparticuz/chromium`

```typescript
// lib/renderer.ts
const browser = IS_VERCEL
  ? await puppeteer.launch({ executablePath: await chromium.executablePath() })
  : await puppeteer.launch()
```

---

## 파일 구조

```
detail-claude-gemini/
├── app/
│   ├── api/projects/
│   │   ├── route.ts                     # 프로젝트 목록/생성
│   │   ├── [id]/route.ts                # 프로젝트 조회/수정/삭제
│   │   ├── [id]/photos/route.ts         # 제품 사진 업로드
│   │   └── [id]/generate/
│   │       ├── brief/route.ts           # 브리프 생성
│   │       └── pipeline/route.ts        # 전체 파이프라인 (SSE)
│   ├── projects/[id]/page.tsx
│   └── layout.tsx
├── components/
│   ├── AppLayout.tsx
│   └── tabs/
│       ├── BriefTab.tsx                 # 제품 입력, 사진 업로드
│       ├── LayoutTab.tsx                # Claude가 설계한 섹션 구조 확인/수정  ← 신규
│       ├── EditTab.tsx                  # 카피/디자인 JSON 수정
│       └── ResultTab.tsx                # 최종 이미지 확인, 다운로드
├── lib/
│   ├── types.ts                         # 타입 정의
│   ├── openai-pipeline.ts               # GPT-4o (브리프/리서치/카피/디자인방향) — 기존 재사용
│   ├── claude.ts                        # Claude API 호출 (레이아웃 설계만)
│   ├── gemini.ts                        # Gemini 이미지 생성 — 기존 재사용
│   ├── html-builder.ts                  # 섹션 스펙 → HTML 문자열 조립
│   ├── renderer.ts                      # Puppeteer HTML → PNG
│   └── projects.ts                      # 파일시스템 프로젝트 관리 — 기존 재사용
└── projects/                            # 프로젝트 데이터 저장
    └── {projectId}/
        ├── meta.json
        ├── structured_brief.json
        ├── research_output.json
        ├── copy_output.json
        ├── layout_spec.json             # Claude 레이아웃 설계 결과  ← 신규
        ├── product_photos/
        ├── sections/                    # Gemini 생성 이미지
        └── final_page.png
```

---

## 핵심 타입 정의

```typescript
// 섹션 스펙 (Claude 출력)
type SectionType = 'image' | 'text'
type ImageSource = 'ai_generate' | 'user_photo'
type TextStyle = 'light_bg_dark_text' | 'dark_bg_white_text' | 'accent_bg' | 'split_text_image'

interface ImageSection {
  id: string
  type: 'image'
  order: number
  image_source: ImageSource
  fallback?: ImageSource
  prompt_hint: string
  dimensions: { width: number; height: number }
}

interface TextSection {
  id: string
  type: 'text'
  order: number
  content: {
    heading?: string
    subheading?: string
    body: string
    cta?: string
  }
  style: TextStyle
}

type Section = ImageSection | TextSection

interface LayoutSpec {
  sections: Section[]
  brand_colors: { primary: string; secondary: string; accent: string }
  font_family: string
}
```

---

## API 키 구성

```env
OPENAI_API_KEY=      # GPT-4o (브리프, 리서치, 카피, 디자인 방향)
ANTHROPIC_API_KEY=   # Claude (레이아웃 설계)
GEMINI_API_KEY=      # Gemini (이미지 생성)
```

---

## 구현 우선순위

1. **GPT-4o 파이프라인 이식** — 기존 openai-pipeline.ts 그대로 가져오기
2. **Claude 레이아웃 설계** — 디자인 방향 받아서 섹션 스펙 JSON 출력
3. **HTML 빌더** — 레이아웃 JSON → HTML 문자열 변환
4. **Puppeteer 렌더러** — HTML → PNG
5. **Gemini 연동** — image 섹션만 선택적 호출
6. **LayoutTab UI** — 섹션 구조 확인 및 순서/타입 수정
7. **Vercel 배포 대응** — @sparticuz/chromium 적용

---

## 기존 프로젝트에서 재사용 가능한 것

- `lib/openai-pipeline.ts` — GPT-4o 파이프라인 전체 (브리프/리서치/카피/디자인방향)
- `lib/gemini.ts` — Gemini 이미지 생성 로직 (이미지 섹션에만 적용)
- `lib/projects.ts` — 파일시스템 프로젝트 관리
- `app/api/projects/[id]/photos/route.ts` — 사진 업로드 로직
- 전체 UI 레이아웃 (AppLayout, 사이드바, 탭 구조, BriefTab, EditTab)
