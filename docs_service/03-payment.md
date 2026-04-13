# 결제 (토스페이먼츠)

## 흐름

```
사용자 크레딧 부족
  → "크레딧 구매" 버튼 클릭
  → 토스페이먼츠 결제 위젯 로드
  → 사용자 결제 (카드/카카오페이/네이버페이/계좌이체 등)
  → 토스페이먼츠 → 결제 성공 페이지로 리디렉트
  → 서버에서 결제 검증 (토스 API)
  → 크레딧 지급
  → 사용자 크레딧 잔액 업데이트
```

토스페이먼츠는 Stripe와 달리 Webhook 없이 **리디렉트 후 서버 검증** 방식이 기본.

## 설치

```bash
npm install @tosspayments/tosspayments-sdk
```

## 환경변수

```
TOSS_CLIENT_KEY=test_ck_...        # 클라이언트 키 (NEXT_PUBLIC 불필요, 위젯에서 직접 사용)
TOSS_SECRET_KEY=test_sk_...        # 시크릿 키 (서버 전용)
NEXT_PUBLIC_BASE_URL=https://...
```

## 패키지 설정

토스페이먼츠는 Stripe처럼 대시보드에서 상품을 미리 만들지 않아도 됨.
결제 요청 시 금액과 상품명을 직접 전달.

| 패키지 | 크레딧 | 판매가 | 크레딧당 단가 | Opus 마진 |
|--------|--------|--------|------------|---------|
| 단건 | 1 | ₩10,000 | ₩10,000 | 76% |
| 스탠다드 | 3 | ₩27,000 | ₩9,000 | 73% |
| 프로 | 10 | ₩80,000 | ₩8,000 | 70% |

## 결제 UI 컴포넌트

```tsx
// components/CreditPurchaseModal.tsx
'use client'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'
import { useState } from 'react'

const PACKAGES = [
  { label: '단건', credits: 1, amount: 10000 },
  { label: '스탠다드', credits: 3, amount: 27000 },
  { label: '프로', credits: 10, amount: 80000 },
]

export default function CreditPurchaseModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(false)

  const handlePurchase = async (pkg: typeof PACKAGES[0]) => {
    setLoading(true)
    const toss = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!)
    const orderId = `order_${userId}_${Date.now()}`

    await toss.payment({ customerKey: userId }).requestPayment({
      method: 'CARD',  // 카드 외 'VIRTUAL_ACCOUNT', 'TRANSFER', 'MOBILE_PHONE' 등
      amount: { currency: 'KRW', value: pkg.amount },
      orderId,
      orderName: `크레딧 ${pkg.credits}개`,
      successUrl: `${location.origin}/api/payment/success?credits=${pkg.credits}`,
      failUrl: `${location.origin}/projects?payment=failed`,
      customerEmail: undefined,  // 선택사항
    })
    // requestPayment는 리디렉트 방식 → 이후 코드 실행 안 됨
  }

  return (
    <div className="modal">
      <h2>크레딧 구매</h2>
      {PACKAGES.map((pkg) => (
        <div key={pkg.credits} className="package-row">
          <span>{pkg.label} — {pkg.credits}크레딧</span>
          <span>₩{pkg.amount.toLocaleString()}</span>
          <button onClick={() => handlePurchase(pkg)} disabled={loading}>
            구매
          </button>
        </div>
      ))}
    </div>
  )
}
```

## 결제 검증 API (성공 리디렉트 후 처리)

```ts
// app/api/payment/success/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { addCredits } from '@/lib/credits'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const paymentKey = searchParams.get('paymentKey')!
  const orderId = searchParams.get('orderId')!
  const amount = Number(searchParams.get('amount'))
  const credits = Number(searchParams.get('credits'))

  // 1. 토스페이먼츠 API로 결제 승인
  const confirm = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  })

  if (!confirm.ok) {
    const err = await confirm.json()
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/projects?payment=failed&reason=${err.code}`
    )
  }

  // 2. orderId에서 userId 추출 (형식: order_{userId}_{timestamp})
  const userId = orderId.split('_')[1]

  // 3. 크레딧 지급
  await addCredits(userId, credits, `purchase:${orderId}`)

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_BASE_URL}/projects?payment=success&credits=${credits}`
  )
}
```

## 결제 수단

토스페이먼츠는 단일 연동으로 아래 수단 모두 지원:

- 신용/체크카드 (국내 전체)
- 카카오페이
- 네이버페이
- 토스페이
- 계좌이체
- 가상계좌
- 휴대폰 소액결제

## 수수료

| 결제수단 | 수수료 |
|---------|-------|
| 카드 | 약 2~3% (매출 규모별 협의) |
| 간편결제 (카카오/네이버) | 약 2~3% |
| 계좌이체 | 약 1~1.5% |

## 로컬 테스트

토스페이먼츠는 테스트 키(`test_ck_...`, `test_sk_...`)로 실제 결제 없이 테스트 가능.
테스트 모드에서는 카드번호 `4242 4242 4242 4242` 사용.

## 체크리스트

- [ ] 토스페이먼츠 개발자센터 회원가입
- [ ] 애플리케이션 생성 → 클라이언트 키 / 시크릿 키 발급
- [ ] 사업자 등록 후 실서비스 심사 신청
- [ ] `npm install @tosspayments/tosspayments-sdk`
- [ ] `NEXT_PUBLIC_TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY` 환경변수 설정
- [ ] `components/CreditPurchaseModal.tsx` 작성
- [ ] `app/api/payment/success/route.ts` 작성
- [ ] `lib/credits.ts`에 `addCredits()` 추가
- [ ] 결제 성공/실패 토스트 메시지 처리
- [ ] 테스트 결제 시나리오 검증 (성공/실패/취소)
