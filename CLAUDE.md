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
- 프로젝트 데이터는 Supabase DB + Storage에 저장

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
  Footer.tsx
  tabs/
    BriefTab.tsx      # 제품 입력, 사진 업로드, 파이프라인 실행
    LayoutTab.tsx     # HTML 에디터 + 라이브 미리보기
    EditTab.tsx       # JSON 수정
    TextEditTab.tsx   # HTML 텍스트 편집 + 섹션 이미지 재생성
    ResultTab.tsx     # 최종 이미지 확인, 다운로드, 버전 히스토리
    PhotoUpload.tsx   # 제품 사진 업로드 (드래그앤드롭)
    PipelineRunner.tsx # SSE 파이프라인 실행 진행 상황
  ui/
    JsonEditor.tsx
    ProgressLog.tsx
    CreditModal.tsx   # 크레딧 부족 시 결제 유도 모달
    SectionImage.tsx  # 섹션 이미지 공통 컴포넌트 (loading/error 상태 처리)

lib/
  types.ts            # 전체 타입 정의
  claude.ts           # Claude API — generateDetailPage()
  gemini.ts           # Gemini API — generateSectionImage()
  openai-pipeline.ts  # GPT-4o — generateBrief(), generateResearch()
  supabase.ts         # re-export barrel (supabase-db + supabase-storage)
  supabase-client.ts  # Supabase 클라이언트 팩토리 (getClient)
  supabase-db.ts      # DB CRUD (projects, pipeline_status, project_versions)
  supabase-storage.ts # Storage (photos, sections, final PNG)
  supabase-browser.ts # 브라우저용 Supabase 클라이언트
  html-builder.ts     # 섹션 스펙 → HTML 조립 유틸
  renderer.ts         # Puppeteer HTML → PNG
  projects.ts         # 파일시스템 프로젝트 관리
  credits.ts          # 크레딧 잔액 확인 및 차감
  auth.ts             # 인증 미들웨어 & JWT 검증
  cost-tracker.ts     # API 비용 추적 (프로바이더별)
  rate-limit.ts       # 사용자 ID 기반 요청 제한
  notify.ts           # Discord/이메일 알림
  admin.ts            # 어드민 유틸 함수
  sse.ts              # Server-Sent Events 헬퍼
  constants.ts        # 설정 상수

types/
  sparticuz.d.ts      # @sparticuz/chromium 타입 선언

docs/                 # 기획·설계 문서 + 레거시 코드 보관
  legacy-openai-pipeline.md  # 구 GPT-4o 단계별 파이프라인 (참고용)

public/
  file.svg / globe.svg / vercel.svg / window.svg

# 루트 문서
CLAUDE.md / AGENTS.md / PLAN.md / README.md
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

supabase 마이그레이션 파일은 다음 형식을 따를것 - 20260414000001_schema.sql
마이그레이션 파일은 수정하지말고 새로 생성할것.