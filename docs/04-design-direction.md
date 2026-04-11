# 디자인 방향 (Design Direction)

**담당**: GPT-4o (`lib/openai-pipeline.ts` → `generateDesignDirection()`)
**API 라우트**: `POST /api/projects/[id]/generate/pipeline` (Step 3 — Claude 레이아웃 설계 전)

## 역할
제품 특성과 타겟에 맞는 전체 비주얼 톤 & 스타일을 결정합니다.
섹션 구조는 이 단계에서 결정하지 않습니다 — 섹션은 Claude 레이아웃 설계 단계에서 결정됩니다.

## 입력
- `projects/{id}/structured_brief.json`
- `projects/{id}/research_output.json`

## 결정 사항

### 1. 스타일 프리셋 선택

| 프리셋 | 특징 | 적합한 카테고리 |
|---|---|---|
| `minimal` | 깔끔, 여백, 신뢰감 | saas, service |
| `sales` | 긴급성, 강조, 에너지 | digital_product, event |
| `premium` | 고급, 절제, 품격 | physical_product (고가), service (고가) |
| `community` | 친근, 따뜻, 소속감 | digital_product (교육), event |

### 2. 컬러 팔레트

```
primary        — 메인 컬러 (브랜드 대표)
secondary      — 보조 컬러 (서브 요소)
accent         — 강조 컬러 (CTA 버튼, 배지)
background     — 기본 배경
background_alt — 교차 배경 (섹션 구분용)
text_primary   — 본문 텍스트
text_secondary — 보조 텍스트
```

**프리셋별 기본 컬러:**

```
minimal:  primary #2563EB / accent #3B82F6 / bg #FFFFFF
sales:    primary #DC2626 / accent #F59E0B / bg #FEF3C7
premium:  primary #1F2937 / accent #D4AF37 / bg #F9FAFB
community: primary #7C3AED / accent #EC4899 / bg #FAF5FF
```

### 3. 타이포그래피

```
headline:    Bold, 48~72px, line-height 1.2
subheadline: SemiBold, 24~32px, line-height 1.4
body:        Regular, 16~18px, line-height 1.6
cta:         Bold, 18~24px
font_family: Noto Sans KR (Google Fonts CDN)
```

### 4. 컴포넌트 스타일

```
button:  border-radius, padding, shadow
card:    border-radius, border, shadow
badge:   border-radius, padding
```

### 5. 섹션 배경 패턴 (고정 이름 없음)

섹션별 이름 대신 **교차 패턴**으로 정의합니다.
Claude가 섹션을 동적으로 결정하면, 이 패턴에 따라 배경이 적용됩니다:

```
odd_section_bg:   background (흰 배경)
even_section_bg:  background_alt (연한 배경)
hero_bg:          primary 그라디언트
cta_bg:           primary 그라디언트 (강조)
dark_section_bg:  어두운 배경 (텍스트 섹션에 변화 주기용)
```

### 6. 카테고리별 추가 방향

**digital_product / saas**
- UI 스크린샷, 대시보드 이미지 스타일 명시
- 신뢰/전문성 강조

**physical_product**
- 제품 사진 품질 중요 (유저 업로드 우선)
- 성분/원료 인포그래픽 스타일

**service**
- 인물 사진 (제작자/코치) 중요
- 따뜻하고 신뢰감 있는 톤

## 출력 형식

`projects/{id}/design_direction.json` 저장:

```json
{
  "style_preset": "minimal",
  "color_palette": {
    "primary": "#2563EB",
    "secondary": "#60A5FA",
    "accent": "#F59E0B",
    "background": "#FFFFFF",
    "background_alt": "#F3F4F6",
    "text_primary": "#1F2937",
    "text_secondary": "#6B7280"
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
    "card": { "border_radius": "12px", "border": "1px solid #E5E7EB" },
    "badge": { "border_radius": "4px", "padding": "4px 12px" }
  },
  "section_bg_pattern": {
    "odd": "#FFFFFF",
    "even": "#F3F4F6",
    "hero": "gradient: primary → primary_dark",
    "cta": "gradient: primary → primary_dark",
    "dark": "#1F2937"
  },
  "mood_keywords": ["professional", "trustworthy", "modern"],
  "photography_direction": "실사 사진, 전문 광고 품질"
}
```

## 결정 로직

1. **카테고리** — digital_product → sales/community, saas → minimal, physical → premium
2. **가격대** — 고가 → premium/minimal, 중저가 → sales
3. **긴급성** — 높음 → sales, 낮음 → minimal/premium
4. **브랜드 컬러** — 있으면 반영, 없으면 프리셋 기본값
