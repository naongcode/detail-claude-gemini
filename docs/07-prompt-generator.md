# Gemini 이미지 프롬프트 생성 (Prompt Generator)

**담당**: GPT-4o (`lib/openai-pipeline.ts` → `generateImagePrompts()`)
**API 라우트**: `POST /api/projects/[id]/generate/pipeline` (Step 6)

## 역할
`layout_spec.json`의 섹션 목록을 순회하여 **`type: "image"` 섹션에 대해서만** Gemini 프롬프트를 생성합니다.
`type: "text"` 섹션은 건너뜁니다.

## 입력
- `projects/{id}/copy_output.json`
- `projects/{id}/design_direction.json`
- `projects/{id}/layout_spec.json`

## 동작 방식

```
layout_spec.sections 순회
  → type === "image" 인 섹션만 선택
  → 해당 섹션의 copy_output[section.id] 참조
  → Gemini 프롬프트 생성
  → type === "text" 섹션은 건너뜀
```

## 이미지 스펙

| 항목 | 값 |
|---|---|
| 너비 | **1200px 고정** |
| 높이 | `layout_spec.sections[].dimensions.height` 사용 |
| 포맷 | PNG |

## ⚠️ 필수 준수 사항

1. **1200px 고정** — 절대 변경 금지
2. **실사 사진 스타일** — 일러스트/카툰 금지
3. **풀 블리드** — 좌우 마진 없음

## 공통 프롬프트 구조

```
Create a professional Korean landing page section image.

=== CRITICAL REQUIREMENTS ===
1. EXACT DIMENSIONS: 1200x{height} pixels
2. FULL BLEED: NO margins
3. REALISTIC PHOTOGRAPHY style, NOT illustrations

=== DESIGN ===
- Style: {style_preset} — {style_desc}
- Primary: {primary} / Accent: {accent}
- Background: {bg}

=== LAYOUT ===
{layout_instructions}

=== TEXT CONTENT (Korean) ===
{text_from_copy_output}

=== VISUAL ELEMENTS ===
{visual_hints}

✓ 1200px wide, realistic photo style, Korean text readable
```

## 섹션별 레이아웃 지시 (섹션 id 기반)

섹션 id에 따라 레이아웃 지시가 달라집니다:

**hero** — Full-width hero. Large headline centered/left. CTA button prominent. Urgency badge in corner.

**pain** — Grid of 3-4 pain point cards. Each has icon + text. Empathetic tone.

**problem** — Hook text large. 3 root causes listed. Reframe statement at bottom.

**story** — Split Before/After. Before: muted tones. After: vibrant. Transition arrow.

**solution / solution_intro** — Clean, spacious. Product name large. One-liner below.

**how_it_works** — Numbered steps horizontal/timeline. Connecting arrows.

**social_proof** — Stats bar at top. Testimonial cards below.

**authority** — Split: creator photo + credentials list.

**benefits** — Checklist with icons. Bonus items in highlighted box.

**risk_removal** — Shield/guarantee badge. FAQ cards.

**comparison** — Two columns: Without (red X) vs With (green check).

**target_filter** — Two columns: Recommended vs Not Recommended.

**final_cta** — High-contrast. Large headline. Price display. Big CTA button.

**curriculum** (digital_product) — Module list with numbering. Duration badges.

**features / demo_screenshot** (saas/app) — Feature cards or UI screenshot layout.

**ingredients** (physical_product) — Ingredient cards with icons. Certification badges.

**process** (service) — Step-by-step timeline. Duration labels.

**case_study** (service) — Result-focused cards. Before/After numbers.

**pricing** (saas) — Pricing plan cards. Highlighted recommended plan.

## 출력 형식

`projects/{id}/gemini_prompts.json` 저장:

```json
{
  "hero": {
    "prompt": "Full prompt text...",
    "width": 1200,
    "height": 800,
    "filename": "01_hero.png"
  },
  "social_proof": {
    "prompt": "Full prompt text...",
    "width": 1200,
    "height": 800,
    "filename": "08_social_proof.png"
  }
}
```

- key: `layout_spec.sections[].id`
- filename: `{order:02d}_{id}.png` 형식
- text 타입 섹션은 이 파일에 포함되지 않음

## 프롬프트 작성 원칙

1. **copy_output 내용 반영** — 해당 섹션의 카피 텍스트를 프롬프트에 포함
2. **prompt_hint 활용** — `layout_spec.sections[].prompt_hint`가 있으면 반영
3. **스타일 일관성** — 모든 섹션에 동일한 design 토큰 사용
4. **한글 텍스트 명시** — 한국어 텍스트 그대로 전달
