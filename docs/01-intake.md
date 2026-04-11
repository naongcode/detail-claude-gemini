# 입력 수집 (Intake)

**담당**: GPT-4o (`lib/openai-pipeline.ts` → `generateBrief()`)
**API 라우트**: `POST /api/projects/[id]/generate/brief`

## 역할
상세페이지 생성에 필요한 모든 정보를 수집하고, **제품 카테고리를 식별**합니다.
카테고리는 이후 Claude 레이아웃 설계의 핵심 입력값으로 사용됩니다.

## 제품 카테고리 정의

| 카테고리 | 설명 | 예시 |
|---|---|---|
| `digital_product` | 강의, 전자책, 템플릿, 챌린지 | 스마트스토어 강의, 재테크 전자책 |
| `saas` | 소프트웨어, 구독 서비스, 툴 | AI 마케팅 툴, 협업 플랫폼 |
| `physical_product` | 실물 상품, 건강식품, 화장품 | 건강기능식품, 스킨케어 |
| `service` | 컨설팅, 코칭, 에이전시, 1:1 | 퍼스널 브랜딩 코칭, 세무 컨설팅 |
| `app` | 모바일/웹 앱 | 다이어트 앱, 영어 학습 앱 |
| `event` | 세미나, 강연, 워크숍 | 창업 부트캠프, 네트워킹 이벤트 |

## 수집 프로세스

### Step 1: 필수 정보 수집

1. **product_name** — 제품/서비스명
2. **product_category** — 위 카테고리 중 하나 (자동 추론 가능, 확인 필요)
3. **one_liner** — 한 줄 정의 (결과/혜택 중심)
4. **target_audience** — 핵심 타겟 (최대한 구체적으로)
5. **main_problem** — 타겟이 겪는 핵심 문제
6. **key_benefit** — 이 제품으로 얻는 핵심 결과
7. **price** — 가격 (정가/할인가)
8. **urgency** — 긴급성/희소성 요소

### Step 2: 선택 정보 수집

- **testimonials** — 고객 후기/성과 사례
- **creator_bio** — 제작자 소개
- **bonus_items** — 보너스 구성
- **guarantee** — 환불/보장 정책
- **faq** — 자주 받는 질문
- **brand_color** — 브랜드 컬러 (없으면 자동 제안)

### Step 3: 카테고리별 추가 수집

카테고리에 따라 추가로 수집합니다:

**digital_product**
- `curriculum` — 커리큘럼/목차 (강의인 경우)
- `format` — 형태 (영상/PDF/라이브 등)
- `duration` — 분량 (몇 시간, 몇 페이지)

**saas**
- `key_features` — 핵심 기능 3~5가지
- `integrations` — 연동 가능한 툴
- `pricing_model` — 요금제 구조 (월정액/연간/기능별)

**physical_product**
- `ingredients` — 성분/원료
- `usage` — 사용 방법
- `certifications` — 인증/수상 내역
- `shipping` — 배송 정보

**service**
- `process` — 서비스 진행 프로세스
- `duration` — 기간/횟수
- `deliverables` — 결과물
- `case_studies` — 사례 (있으면)

**app**
- `platforms` — iOS/Android/Web
- `key_features` — 핵심 기능
- `screenshots_available` — 스크린샷 보유 여부

## 출력 형식

`projects/{id}/structured_brief.json` 저장:

```json
{
  "product_name": "...",
  "product_category": "digital_product",
  "one_liner": "...",
  "target_audience": "...",
  "main_problem": "...",
  "key_benefit": "...",
  "price": {
    "original": "990000",
    "discounted": "490000",
    "currency": "KRW"
  },
  "urgency": {
    "type": "quantity",
    "value": "선착순 50명 한정"
  },
  "testimonials": ["후기1", "후기2"],
  "creator_bio": "...",
  "bonus_items": ["보너스1", "보너스2"],
  "guarantee": "...",
  "faq": [{"question": "...", "answer": "..."}],
  "brand_color": { "primary": "#HEX", "secondary": "#HEX" },
  "category_specific": {
    // 카테고리별 추가 필드
  }
}
```
