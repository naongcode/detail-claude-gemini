# 레이아웃 설계 (Layout Design)

**담당**: Claude (`lib/claude.ts` → `generateLayoutSpec()`)
**API 라우트**: `POST /api/projects/[id]/generate/pipeline` (Step 4)

## 역할
브리프 + 리서치 + 디자인 방향을 받아 **제품 카테고리에 맞는 섹션 구조를 동적으로 설계**합니다.
섹션의 개수, 순서, 타입(image/text), 이미지 소스를 결정합니다.

## 입력
- `projects/{id}/structured_brief.json` — product_category 포함
- `projects/{id}/research_output.json`
- `projects/{id}/design_direction.json`

## 카테고리별 권장 섹션 패턴

아래는 참고용 패턴입니다. Claude는 실제 제품 내용에 따라 섹션을 추가/제거/재조합합니다.

### digital_product (강의, 전자책)
```
hero(image) → pain(text) → problem(image) → story(text) →
curriculum(text) ← 카테고리 특화 섹션
solution(image) → how_it_works(text) → social_proof(image) →
authority(text) → benefits(image) → risk_removal(text) → final_cta(image)
```

### saas (소프트웨어, 툴)
```
hero(image) → pain(text) → solution_intro(text) →
features(image) ← 카테고리 특화
demo_screenshot(image) ← 카테고리 특화
integrations(text) ← 카테고리 특화
social_proof(image) → pricing(text) ← 카테고리 특화
authority(text) → risk_removal(text) → final_cta(image)
```

### physical_product (실물, 건강식품, 화장품)
```
hero(image) → pain(text) → problem(text) →
product_detail(image) ← 유저 사진 우선
ingredients(text) ← 카테고리 특화
how_it_works(image) → social_proof(image) →
certifications(text) ← 카테고리 특화
benefits(text) → risk_removal(text) → final_cta(image)
```

### service (컨설팅, 코칭)
```
hero(image) → pain(text) → problem(text) → story(image) →
process(text) ← 카테고리 특화
case_study(image) ← 카테고리 특화
authority(image) → social_proof(text) →
benefits(text) → risk_removal(text) → final_cta(image)
```

### app (모바일/웹 앱)
```
hero(image) → pain(text) →
app_screenshot(image) ← 카테고리 특화
features(image) ← 카테고리 특화
how_it_works(text) → social_proof(image) →
authority(text) → risk_removal(text) → final_cta(image)
```

## 섹션 타입 결정 기준

| 조건 | 타입 권장 |
|---|---|
| 강한 비주얼이 필요한 섹션 (hero, social_proof, 제품컷) | `image` |
| 텍스트 정보가 많은 섹션 (리스트, FAQ, 커리큘럼, 성분) | `text` |
| 인물 등장 (authority, story) | `image` (유저 사진 있으면 우선) |
| 단순 카피 전달 (pain, 비교) | `text` 또는 `image` 모두 가능 |

## image_source 결정 기준

| 조건 | image_source |
|---|---|
| 제품 사진 섹션 + 유저가 사진 업로드함 | `user_photo` |
| 제품 사진 섹션 + 사진 없음 | `ai_generate` |
| 분위기/배경 섹션 | `ai_generate` |
| 인물 필요 섹션 | `ai_generate` (또는 `user_photo` + fallback) |

## 출력 형식

`projects/{id}/layout_spec.json` 저장:

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
      "fallback": null,
      "prompt_hint": "강렬한 히어로 비주얼, 강의 수강생 성공 이미지",
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
      "note": "digital_product 카테고리 특화 섹션"
    },
    {
      "id": "social_proof",
      "label": "수강생 후기",
      "type": "image",
      "order": 8,
      "image_source": "ai_generate",
      "dimensions": { "width": 1200, "height": 800 },
      "bg_pattern": "odd"
    },
    {
      "id": "final_cta",
      "label": "최종 CTA",
      "type": "image",
      "order": 11,
      "image_source": "ai_generate",
      "dimensions": { "width": 1200, "height": 600 },
      "bg_pattern": "cta"
    }
  ],
  "design_tokens": {
    "primary": "#2563EB",
    "accent": "#F59E0B",
    "font_family": "Noto Sans KR"
  }
}
```

## text 섹션 스타일 프리셋

| style | 설명 |
|---|---|
| `light_bg_dark_text` | 흰/연한 배경, 진한 텍스트 |
| `dark_bg_white_text` | 어두운 배경, 흰 텍스트 |
| `accent_bg` | 브랜드 컬러 배경 |
| `split_text_image` | 텍스트 + 인라인 이미지 좌우 배치 |

## Claude 설계 원칙

1. **카테고리 우선** — product_category에 맞는 섹션을 우선 구성하고, 제품 내용에 따라 조정
2. **섹션 수 최적화** — 너무 많으면(15개+) 지루함, 너무 적으면(6개-) 설득력 부족. 8~13개 권장
3. **image/text 교차** — 같은 타입이 3개 이상 연속되지 않도록
4. **유저 사진 활용** — product_photos가 있으면 적절한 섹션에 `user_photo` 배정
5. **CTA 위치** — 반드시 마지막 섹션은 `final_cta`로 끝냄
