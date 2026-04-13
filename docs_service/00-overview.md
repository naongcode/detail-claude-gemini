# 실서비스 전환 체크리스트

AI 이커머스 상세페이지 생성기를 실제 서비스로 런치하기 위한 작업 목록.
각 항목은 별도 문서에서 상세히 다룬다.

## 우선순위 맵

| 순서 | 문서 | 항목 | 런치 필수 여부 |
|------|------|------|--------------|
| 1 | [01-auth.md](./01-auth.md) | 인증 + 프로젝트 소유권 | 필수 |
| 2 | [02-cost-control.md](./02-cost-control.md) | API 비용 통제 + 크레딧 | 필수 |
| 3 | [03-payment.md](./03-payment.md) | 결제 (Stripe) | 필수 |
| 4 | [04-background-jobs.md](./04-background-jobs.md) | 백그라운드 잡 큐 | 강력 권장 |
| 5 | [05-security.md](./05-security.md) | 파일 업로드·API 보안 | 필수 |
| 6 | [06-monitoring.md](./06-monitoring.md) | 에러 모니터링 + 관측성 | 강력 권장 |
| 7 | [07-ux.md](./07-ux.md) | UX 개선 (온보딩·복구) | 권장 |
| 8 | [08-legal.md](./08-legal.md) | 법적 컴플라이언스 | 필수 |
| 9 | [09-edge-functions.md](./09-edge-functions.md) | Edge Runtime 전환 | 선택 (성능 최적화) |

## 현재 가장 위험한 상태

1. **인증 없음** — 누구나 전체 프로젝트 목록 조회 및 삭제 가능
2. **생성 횟수 제한 없음** — 악의적 사용자 1명이 수백 달러 API 비용 유발 가능
3. **파일 업로드 서버 검증 없음** — 이미지가 아닌 파일도 Supabase에 업로드 가능
