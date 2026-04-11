# 카피라이팅 (Copy)

**담당**: GPT-4o (`lib/openai-pipeline.ts` → `generateCopy()`)
**API 라우트**: `POST /api/projects/[id]/generate/pipeline` (Step 5 — Claude 레이아웃 설계 후)

## 역할
Claude가 설계한 레이아웃 스펙의 **섹션 목록 기준으로** 각 섹션의 카피를 작성합니다.
13개 고정 섹션이 아니라, layout_spec에 있는 섹션만 작성합니다.

## 입력
- `projects/{id}/structured_brief.json`
- `projects/{id}/research_output.json`
- `projects/{id}/layout_spec.json` ← Claude 레이아웃 스펙

## 동작 방식

`layout_spec.sections` 배열을 순회하며, 각 섹션의 `id`와 `label`을 기반으로 카피를 생성합니다.

```
layout_spec.sections 예:
  [hero, pain, curriculum, solution, social_proof, authority, benefits, risk_removal, final_cta]

→ copy_output.json:
  { hero: {...}, pain: {...}, curriculum: {...}, ... }
```

## 섹션별 카피 구조

섹션 id에 따라 포함되는 필드가 다릅니다.

### hero
```json
{
  "headline_options": ["헤드라인1", "헤드라인2", "헤드라인3"],
  "subheadline": "서브 헤드라인",
  "urgency_badge": "긴급성 배지",
  "cta_text": "지금 시작하기"
}
```

### pain
```json
{
  "intro": "혹시 이런 고민 하고 계신가요?",
  "pain_points": ["페인포인트1", "페인포인트2", "페인포인트3"],
  "emotional_hook": "감정적 공감 문구"
}
```

### problem
```json
{
  "hook": "문제의 본질을 드러내는 훅",
  "reasons": ["진짜 원인1", "진짜 원인2", "진짜 원인3"],
  "reframe": "당신 탓이 아닌 이유"
}
```

### story
```json
{
  "before": "변화 전 상황",
  "turning_point": "전환점",
  "after": "변화 후 삶",
  "proof": "변화의 증거"
}
```

### solution / solution_intro
```json
{
  "intro": "해결책 소개 문구",
  "product_name": "제품명",
  "one_liner": "한 줄 정의",
  "target_fit": "이 제품이 맞는 사람"
}
```

### how_it_works
```json
{
  "headline": "섹션 제목",
  "steps": [
    { "number": 1, "title": "단계 제목", "description": "설명", "result": "결과" }
  ]
}
```

### social_proof
```json
{
  "headline": "이미 검증된 결과",
  "stats": ["통계1", "통계2", "통계3"],
  "testimonials": [
    { "quote": "후기", "name": "이름", "result": "결과" }
  ]
}
```

### authority
```json
{
  "intro": "제작자 소개 도입부",
  "bio": "경력 소개",
  "credentials": ["자격1", "자격2"],
  "message": "진심 메시지"
}
```

### benefits
```json
{
  "headline": "혜택 섹션 제목",
  "main_benefits": ["혜택1", "혜택2", "혜택3"],
  "bonus_items": [{ "item": "보너스명", "value": "가치" }],
  "total_value": "총 가치"
}
```

### risk_removal
```json
{
  "guarantee": "환불 보장 내용",
  "faq": [{ "question": "질문", "answer": "답변" }],
  "support": "지원 안내"
}
```

### comparison
```json
{
  "without": ["기존 방법 문제1", "문제2"],
  "with": ["이 제품 이점1", "이점2"],
  "question": "마무리 질문"
}
```

### target_filter
```json
{
  "recommended": ["추천 대상1", "추천 대상2"],
  "not_recommended": ["비추천 대상1"]
}
```

### final_cta
```json
{
  "headline": "마지막 헤드라인",
  "urgency": "긴급성 메시지",
  "price_original": "~~990,000원~~",
  "price_discounted": "지금 490,000원",
  "cta_button": "지금 바로 시작하기",
  "closing": "마지막 감성 문구"
}
```

### 카테고리 특화 섹션

**curriculum** (digital_product)
```json
{
  "headline": "커리큘럼",
  "modules": [
    { "number": 1, "title": "모듈명", "lessons": ["레슨1", "레슨2"], "duration": "2시간" }
  ],
  "total_duration": "총 10시간"
}
```

**features** (saas / app)
```json
{
  "headline": "핵심 기능",
  "features": [
    { "icon_hint": "아이콘 설명", "title": "기능명", "description": "기능 설명" }
  ]
}
```

**ingredients** (physical_product)
```json
{
  "headline": "주요 성분",
  "ingredients": [
    { "name": "성분명", "benefit": "효능", "amount": "함량" }
  ],
  "certifications": ["인증1", "인증2"]
}
```

**process** (service)
```json
{
  "headline": "진행 프로세스",
  "steps": [
    { "number": 1, "title": "단계명", "description": "설명", "duration": "1주" }
  ]
}
```

**case_study** (service)
```json
{
  "headline": "성공 사례",
  "cases": [
    { "client": "고객 유형", "problem": "문제", "result": "결과", "duration": "기간" }
  ]
}
```

**pricing** (saas)
```json
{
  "headline": "요금제",
  "plans": [
    { "name": "플랜명", "price": "가격", "features": ["기능1", "기능2"], "highlight": true }
  ]
}
```

## 출력 형식

`projects/{id}/copy_output.json` 저장:

```json
{
  "hero": { ... },
  "pain": { ... },
  "curriculum": { ... },
  "solution": { ... },
  ...
  "final_cta": { ... }
}
```

섹션 key는 `layout_spec.sections[].id`와 일치해야 합니다.

## 카피 원칙

1. **한국어 자연스러운 구어체** — 번역투 금지
2. **감정 → 논리 흐름** — 먼저 공감, 그 다음 설명
3. **구체적 숫자** — "많은" 대신 "143명", "빠르게" 대신 "3일 만에"
4. **2인칭 활용** — "당신", "여러분"
5. **짧은 문장** — 한 문장 20자 내외
