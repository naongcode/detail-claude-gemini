# 구현 TODO

## 진행 상태 범례
- [x] 미완료
- [x] 완료

---

## Phase 1 — 프로젝트 세팅

- [x] **1-1** `npx create-next-app@latest` 로 Next.js 프로젝트 초기화
- [x] **1-2** 의존성 설치
  ```
  npm install openai @anthropic-ai/sdk sharp
  npm install puppeteer
  npm install -D @types/node
  ```
- [x] **1-3** `.env.local` 파일 생성 (OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY)
- [x] **1-4** `tsconfig.json`, `tailwind.config.ts` 기존 프로젝트에서 복사

---

## Phase 2 — 타입 정의 (`lib/types.ts`)

- [x] **2-1** `ProductBrief` — product_category 포함
- [x] **2-2** `ResearchOutput`
- [x] **2-3** `DesignDirection` — section_backgrounds 제거, section_bg_pattern으로 교체
- [x] **2-4** `LayoutSpec`, `Section`, `ImageSection`, `TextSection`
- [x] **2-5** `CopyOutput` — 동적 섹션 key (Record<string, SectionCopy>)
- [x] **2-6** `ImagePrompts` — 동적 섹션 key
- [x] **2-7** `ProjectMeta`, `ProjectStatus`

---

## Phase 3 — 라이브러리 (기존 재사용 + 신규)

- [x] **3-1** `lib/projects.ts` — 기존 그대로 복사
- [x] **3-2** `lib/gemini.ts` — 기존 그대로 복사
- [x] **3-3** `lib/openai-pipeline.ts` — 기존 복사 후 수정
  - [x] **3-3a** `generateBrief()` — product_category 필드 추가
  - [x] **3-3b** `generateResearch()` — 기존 그대로
  - [x] **3-3c** `generateDesignDirection()` — section_backgrounds 제거, section_bg_pattern으로
  - [x] **3-3d** `generateCopy()` — 13개 고정 스키마 제거, layout_spec 섹션 목록 기반으로 교체
  - [x] **3-3e** `generateImagePrompts()` — layout_spec image 섹션만 순회하도록 교체
- [x] **3-4** `lib/claude.ts` — 신규
  - [x] `generateLayoutSpec(brief, research, design)` → layout_spec.json
  - [x] 카테고리별 권장 패턴 프롬프트 포함
  - [x] 섹션 개수/타입/순서/image_source 결정
- [x] **3-5** `lib/html-builder.ts` — 신규
  - [x] `buildHtml(layoutSpec, copyOutput, designDirection, projectId)` → HTML 문자열
  - [x] text 섹션: style 프리셋별 HTML 렌더링
  - [x] image 섹션: `<img src="file:///...">` 절대 경로
  - [x] Google Fonts (Noto Sans KR) CDN 링크 포함
- [x] **3-6** `lib/renderer.ts` — 신규
  - [x] `renderToPng(html, outputPath)` → Puppeteer 스크린샷
  - [x] 로컬/Vercel 분기 (`IS_VERCEL` 환경변수)

---

## Phase 4 — API 라우트

- [x] **4-1** `app/api/projects/route.ts` — 기존 그대로 복사 (목록/생성)
- [x] **4-2** `app/api/projects/[id]/route.ts` — 기존 그대로 복사 (조회/수정/삭제)
- [x] **4-3** `app/api/projects/[id]/photos/route.ts` — 기존 그대로 복사
- [x] **4-4** `app/api/projects/[id]/files/[...path]/route.ts` — 기존 그대로 복사
- [x] **4-5** `app/api/projects/[id]/generate/brief/route.ts` — 기존 복사 후 category 포함
- [x] **4-6** `app/api/projects/[id]/generate/pipeline/route.ts` — 핵심, 신규 작성
  - [x] SSE 스트리밍
  - [x] Step 1: generateResearch
  - [x] Step 2: generateDesignDirection
  - [x] Step 3: generateLayoutSpec (Claude)
  - [x] Step 4: generateCopy (layout_spec 기반)
  - [x] Step 5: generateImagePrompts (image 섹션만)
  - [x] Step 6~N: Gemini 이미지 생성 (image 섹션 수만큼)
  - [x] Step N+1: buildHtml
  - [x] Step N+2: renderToPng (Puppeteer)

---

## Phase 5 — UI 컴포넌트

- [x] **5-1** `app/layout.tsx` — 기존 그대로 복사
- [x] **5-2** `app/projects/[id]/page.tsx` — 기존 그대로 복사
- [x] **5-3** `components/ProjectSidebar.tsx` — 기존 그대로 복사
- [x] **5-4** `components/AppLayout.tsx` — 기존 복사 후 탭 수정 (LayoutTab 추가)
- [x] **5-5** `components/tabs/BriefTab.tsx` — 기존 그대로 복사
- [x] **5-6** `components/tabs/LayoutTab.tsx` — 신규
  - [x] layout_spec.json 내용 표시
  - [x] 섹션 목록 (순서, 타입, image_source) 확인
  - [x] 섹션 타입 수정 가능 (image ↔ text)
  - [x] 섹션 순서 변경 가능
- [x] **5-7** `components/tabs/EditTab.tsx` — 기존 복사 후 layout_spec 탭 추가
- [x] **5-8** `components/tabs/ResultTab.tsx` — 기존 그대로 복사

---

## Phase 6 — 통합 테스트

- [x] **6-1** 로컬에서 전체 파이프라인 1회 실행
- [x] **6-2** 카테고리별 테스트 (digital_product / physical_product / saas)
- [x] **6-3** 유저 사진 업로드 → user_photo 섹션 처리 확인
- [x] **6-4** Puppeteer 최종 PNG 확인

---

## 구현 순서 요약

```
Phase 1 (세팅)
  → Phase 2 (타입)
  → Phase 3-1~3-3 (기존 lib 이식)
  → Phase 4-1~4-5 (기존 API 이식)
  → Phase 3-4 (Claude 레이아웃)
  → Phase 3-5~3-6 (HTML빌더 + Puppeteer)
  → Phase 4-6 (파이프라인 API)
  → Phase 5 (UI)
  → Phase 6 (테스트)
```
