@AGENTS.md

# detail-claude-gemini

AI가 구조를 동적으로 설계하는 한국 이커머스 상세페이지 자동 생성기.
Claude가 HTML + 이미지 요청 목록을 한 번에 설계하고, Gemini가 이미지를 생성, Puppeteer가 PNG로 렌더링한다.

## 기술 스택

- **Next.js 16.2.2** (App Router) + TypeScript + Tailwind CSS v4
- **@anthropic-ai/sdk** — Claude opus-4-6 (페이지 HTML 설계)
- **openai** — GPT-4o (브리프 생성, 리서치)
- **Gemini API** (fetch 직접 호출) — 이미지 생성
- **puppeteer** (로컬) / **puppeteer-core + @sparticuz/chromium** (Vercel)
- **sharp** — 이미지 처리
- 프로젝트 데이터는 파일시스템에 저장 (`projects/` 디렉토리, Vercel에선 `/tmp/projects`)

## 환경변수 (.env.local)

```
OPENAI_API_KEY=      # GPT-4o: 브리프, 리서치
ANTHROPIC_API_KEY=   # Claude: 전체 페이지 HTML 설계
GEMINI_API_KEY=      # Gemini: 이미지 생성
```

## 파이프라인 흐름

```
[1] 제품 설명 입력 (BriefTab)
        ↓
[2] GPT-4o — 브리프 생성 (structured_brief.json)
        ↓
[3] GET /api/projects/[id]/generate/pipeline  (SSE 스트리밍)
    Step 2: GPT-4o — 리서치 분석 (research_output.json)
    Step 3: Claude opus-4-6 — 전체 HTML + 이미지 요청 목록 생성 (page_design.json)
    Step 4~N: Gemini — image 섹션 PNG 생성 (sections/{id}.png)
    Step N+1: HTML 조립 (플레이스홀더 → file:/// 절대경로)
    Step N+2: Puppeteer — HTML → final_page.png
```

### Claude의 역할 (lib/claude.ts)

`generateDetailPage(brief, research)` 함수가 **PageDesign** 객체를 반환한다.

```ts
interface PageDesign {
  html: string           // 완성된 HTML (__GEN_{id}__ 플레이스홀더 포함)
  images: ImageRequest[] // Gemini가 생성해야 할 이미지 목록
}
```

- 완전한 독립 HTML (`<!DOCTYPE html>`~`</html>`) 을 직접 생성
- 이미지 자리에 `<img src="__GEN_hero__" ...>` 형태 플레이스홀더 삽입
- `images[]`에 각 이미지의 Gemini 프롬프트·크기 지정
- 모델: `claude-opus-4-6`, `max_tokens: 16000`

### HTML 설계 규칙 (Claude 프롬프트 핵심)

- **750px 단일 컬럼** (max-width: 750px) — 다단 그리드 금지
- 모든 CSS는 `<style>` 태그 인라인 — 외부 CSS 링크 금지
- 이미지: `width:100%; height:auto; display:block;` — HTML width/height 속성 금지
- 이미지를 `overflow:hidden` container div로 감싸기
- 본문 폰트 최소 18px, 섹션 padding 80px 이상
- Google Fonts (Noto Sans KR) @import 허용
- JavaScript 금지

### Gemini 이미지 프롬프트 제약

- 분할 구도 금지: "split screen", "left/right side", "before and after columns"
- 텍스트 포함 금지: "with text labels", "add Korean text"
- 도식 금지: "diagram", "infographic", "chart"
- 제품 사진 있으면 색상·형태 변경 금지
- 올바른 방식: 단일 장면, lifestyle/commercial photography 스타일

## 파일 구조

```
app/
  api/projects/
    route.ts                          # 목록 조회, 프로젝트 생성
    [id]/route.ts                     # 조회/수정/삭제
    [id]/photos/route.ts              # 제품 사진 업로드
    [id]/files/[...path]/route.ts     # 정적 파일 서빙
    [id]/brief/route.ts               # 브리프 저장/조회
    [id]/generate/brief/route.ts      # GPT-4o 브리프 생성
    [id]/generate/pipeline/route.ts   # 전체 파이프라인 (SSE)
    [id]/generate/sections/route.ts   # 개별 섹션 재생성
    [id]/html-text/route.ts           # HTML 텍스트 편집
    [id]/data/route.ts                # 프로젝트 데이터 조회
    [id]/data/layout/route.ts         # 레이아웃 데이터
  projects/[id]/page.tsx              # 프로젝트 상세 페이지
  projects/page.tsx                   # 프로젝트 목록
  layout.tsx / page.tsx / globals.css / favicon.ico

components/
  AppLayout.tsx
  ProjectSidebar.tsx
  tabs/
    BriefTab.tsx      # 제품 입력, 사진 업로드
    LayoutTab.tsx     # 섹션 구조 확인/수정
    EditTab.tsx       # JSON 수정
    TextEditTab.tsx   # HTML 텍스트 편집
    ResultTab.tsx     # 최종 이미지 확인, 다운로드
  ui/
    JsonEditor.tsx
    ProgressLog.tsx

lib/
  types.ts            # 전체 타입 정의
  claude.ts           # Claude API — generateDetailPage()
  gemini.ts           # Gemini API — generateSectionImage()
  openai-pipeline.ts  # GPT-4o — generateBrief(), generateResearch()
  html-builder.ts     # 섹션 스펙 → HTML 조립 유틸
  renderer.ts         # Puppeteer HTML → PNG
  projects.ts         # 파일시스템 프로젝트 관리

types/
  sparticuz.d.ts      # @sparticuz/chromium 타입 선언

docs/                 # 기획·설계 문서
  01-intake.md
  02-research.md
  04-design-direction.md
  05-layout-design.md
  06-copy.md
  07-prompt-generator.md
  PIPELINE.md
  기획서.md

public/
  file.svg / globe.svg / vercel.svg / window.svg

projects/             # 프로젝트 데이터 저장소 (로컬: ./projects, Vercel: /tmp/projects)
  {projectId}/
    meta.json
    structured_brief.json
    research_output.json
    page_design.json          # Claude 출력 (html + images[])
    page.html                 # 최종 HTML (플레이스홀더 교체 완료)
    final_page.png            # Puppeteer 렌더링 결과
    product_photos/           # 업로드된 제품 사진
    sections/                 # Gemini 생성 이미지 ({id}.png)

# 루트 문서
CLAUDE.md / AGENTS.md / PLAN.md / TODO.md / README.md
```

## 핵심 타입 (lib/types.ts)

```ts
type ProductCategory = 'digital_product' | 'saas' | 'physical_product' | 'service' | 'app' | 'event'

interface ImageRequest {
  id: string      // HTML 플레이스홀더 ID (__GEN_{id}__)
  prompt: string  // Gemini용 영문 프롬프트
  width: number   // 항상 750으로 보정
  height: number
}

interface PageDesign {
  html: string
  images: ImageRequest[]
}

interface ProjectStatus {
  hasBrief: boolean
  hasResearch: boolean
  hasPageDesign: boolean
  imageTotal: number
  imageGenerated: number
  photoCount: number
  hasFinalPng: boolean
}
```

## 프로젝트 데이터 경로 (lib/projects.ts)

```ts
getProjectPaths(pid) // 반환 키: base, sections, photos, brief, research, pageDesign, finalPng, htmlPage, meta
PROJECTS_DIR        // 로컬: ./projects, Vercel: /tmp/projects
```

## Puppeteer 설정 (lib/renderer.ts)

- 뷰포트: **750×1000px** (IS_VERCEL 분기)
- 로컬: `puppeteer` 패키지, `--allow-file-access-from-files` 플래그 필수
- Vercel: `puppeteer-core` + `@sparticuz/chromium`
- `next.config.ts`에서 `serverExternalPackages`로 puppeteer/sharp 등록

## 제품 사진 → Gemini 전달 규칙

`hero`, `product`, `material`, `ingredient`, `detail`, `solution`, `cta`, `usage` 키워드가 섹션 id에 포함될 때만 제품 사진을 Gemini에 전달. pain/lifestyle/review 섹션엔 전달하지 않음.

## 개발 서버

```bash
npm run dev    # next dev (Turbopack)
npm run build
npm run start
```
