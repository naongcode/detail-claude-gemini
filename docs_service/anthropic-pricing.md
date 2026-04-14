# Anthropic API 단가 (2026-04-14 기준)

출처: https://docs.anthropic.com/en/docs/about-claude/models/overview

## 현재 모델 (Latest)

| 모델 | API ID | Input | Output |
|------|--------|-------|--------|
| Claude Opus 4.6 | `claude-opus-4-6` | $5 / MTok | $25 / MTok |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | $3 / MTok | $15 / MTok |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | $1 / MTok | $5 / MTok |

## 호출당 실측 비용 예시

파이프라인 Step 3 (Claude가 HTML 전체 생성):
```
Input:  4,259 tokens  × $5  / 1,000,000 = $0.021
Output: 10,773 tokens × $25 / 1,000,000 = $0.269
합계                                     ≈ $0.29
```

17회 호출 누적 실측:
```
Input:  74,281 tokens  × $5  / 1,000,000 = $0.37
Output: 186,551 tokens × $25 / 1,000,000 = $4.66
합계                                      ≈ $5.03  ← 실제 청구액과 일치
```

---

# OpenAI API 단가

| 모델 | Input | Output |
|------|-------|--------|
| GPT-4o | $2.50 / MTok | $10.00 / MTok |
| GPT-4o mini | $0.15 / MTok | $0.60 / MTok |

---

# Gemini API 단가

| 모델 | 단가 |
|------|------|
| gemini-3-pro-image-preview (1K~2K) | $0.134 / 이미지 |
| gemini-3-pro-image-preview (4K) | $0.240 / 이미지 |
| Imagen 4 Standard | $0.04 / 이미지 |
| Gemini 2.5 Flash Image | $0.039 / 이미지 |

- 이 프로젝트는 `gemini-3-pro-image-preview` 기본 사용 (`lib/gemini.ts`)

---

# 파이프라인 1회 실행 원가 추정

섹션 이미지 8개 기준:

| 단계 | 모델 | 추정 비용 |
|------|------|-----------|
| 브리프 생성 | GPT-4o | ≈ $0.01 |
| 리서치 분석 | GPT-4o | ≈ $0.05 |
| 페이지 HTML 설계 | claude-opus-4-6 | ≈ $0.29 |
| 섹션 이미지 × 8 | gemini-3-pro-image-preview | ≈ $1.07 |
| **합계** | | **≈ $1.42** |

→ 앱 크레딧 1개 판매가 설정 시 참고

## 주의

- Claude 3 Opus는 $15/$75 (MTok) — claude-opus-4-6($5/$25)과 다름
- 프롬프트 캐시 hit 시 input 90% 할인 가능
- 이미지 수·HTML 길이에 따라 원가 변동 있음
