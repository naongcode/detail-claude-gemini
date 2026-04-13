# Edge Functions 전환

## 개요

Next.js/Vercel의 Edge Runtime은 Node.js 대신 V8 isolate에서 실행된다.
전역 분산 + 빠른 콜드 스타트가 장점이지만, Node.js 네이티브 모듈을 쓸 수 없다.

단순 Supabase 읽기/쓰기 라우트를 Edge로 올리면 응답 속도가 개선된다.
**인증 구현 완료 후 진행할 것.**

---

## 전환 대상

### Edge로 올릴 수 있는 라우트

```
middleware.ts                               ← 인증 체크 (Next.js 기본이 Edge)
app/api/projects/route.ts                   ← 목록 조회, 프로젝트 생성
app/api/projects/[id]/route.ts              ← 상태 조회, 이름 변경, 삭제
app/api/projects/[id]/brief/route.ts        ← 브리프 읽기/저장
app/api/projects/[id]/data/route.ts         ← 데이터 조회
app/api/projects/[id]/data/layout/route.ts  ← 레이아웃 데이터
app/api/projects/[id]/html-text/route.ts    ← HTML 텍스트 읽기/저장
app/api/projects/[id]/files/[...path]/route.ts  ← Supabase Storage 프록시
app/api/payment/success/route.ts            ← 토스 결제 검증
app/api/auth/kakao/start/route.ts           ← 카카오 인증 시작 (리디렉트)
app/api/auth/kakao/callback/route.ts        ← 카카오 콜백 처리
```

### Node.js 유지 (변경 불가)

`sharp`, `puppeteer` 네이티브 바이너리 → Edge에서 실행 자체 불가.

```
app/api/projects/[id]/generate/pipeline/route.ts   ← Claude + SSE 스트리밍
app/api/projects/[id]/generate/brief/route.ts      ← OpenAI
app/api/projects/[id]/generate/image/route.ts      ← Gemini + sharp
app/api/projects/[id]/generate/sections/route.ts   ← Gemini + sharp
app/api/projects/[id]/generate/render/route.ts     ← Puppeteer
app/api/projects/[id]/photos/route.ts              ← sharp 이미지 검증
```

---

## 지금 당장 추가하면 깨지는 이유

Edge 전환 전에 반드시 수정해야 할 코드가 있다.

### 문제 1: `Buffer` (Node.js 전용)

[lib/supabase.ts:19](../lib/supabase.ts)

```ts
// 현재 — Edge에서 Buffer 없음
function toStorageKey(pid: string): string {
  return Buffer.from(pid).toString('base64url')
}

// 수정 — Web API btoa() 사용
function toStorageKey(pid: string): string {
  return btoa(pid)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}
```

### 문제 2: `path` 모듈 (Node.js 전용)

[lib/projects.ts:1](../lib/projects.ts)

```ts
// 현재 — Edge에서 path 모듈 없음
import path from 'path'

export function getTmpDir(pid: string): string {
  return path.join('/tmp', 'projects', pid)
}

// 수정 — 문자열로 교체
export function getTmpDir(pid: string): string {
  return `/tmp/projects/${pid}`
}
```

`getTmpDir`, `getTmpPaths`는 Puppeteer 렌더링 전용이라 Node.js 라우트에서만 호출된다.
Edge 라우트에서 이 함수를 import하지 않으면 문제없지만, 같은 파일에 있으면 번들 오류 발생 가능.

**해결책:** `getTmpDir`, `getTmpPaths`를 `lib/renderer.ts`로 이동시켜 lib/projects.ts에서 path import 제거.

---

## 전환 방법

각 라우트 파일 상단에 한 줄 추가:

```ts
export const runtime = 'edge'
```

---

## 전환 순서

위 선행 수정 완료 후, 라우트를 하나씩 전환하며 테스트.

```
1. lib/supabase.ts — Buffer → btoa() 교체
2. lib/projects.ts — path import 제거, getTmpDir/getTmpPaths를 renderer.ts로 이동
3. middleware.ts — runtime = 'edge' (이미 Edge일 가능성 높음, 확인)
4. /api/projects/route.ts — 전환 + 테스트
5. /api/projects/[id]/route.ts — 전환 + 테스트
6. /api/projects/[id]/brief/route.ts — 전환 + 테스트
7. /api/projects/[id]/data/route.ts — 전환 + 테스트
8. /api/projects/[id]/data/layout/route.ts — 전환 + 테스트
9. /api/projects/[id]/html-text/route.ts — 전환 + 테스트
10. /api/projects/[id]/files/[...path]/route.ts — 전환 + 테스트
11. /api/payment/success/route.ts — 전환 + 테스트
12. /api/auth/kakao/start/route.ts — 전환 + 테스트
13. /api/auth/kakao/callback/route.ts — 전환 + 테스트
```

---

## 테스트 방법

Edge 전환 후 로컬에서 확인:

```bash
npm run build  # 빌드 오류 확인 (Edge 호환 오류는 빌드 시 잡힘)
npm run start  # 프로덕션 모드로 실행
```

빌드 중 다음과 같은 오류가 나면 해당 라우트에 Node.js 전용 코드가 남아있는 것:

```
Error: The edge runtime does not support Node.js 'path' module.
Error: The edge runtime does not support Node.js 'buffer' module.
```

---

## 체크리스트

선행 작업:
- [ ] 인증 구현 완료 (01-auth.md)
- [ ] `lib/supabase.ts` — `Buffer` → `btoa()` 교체
- [ ] `lib/projects.ts` — `path` import 제거, `getTmpDir/getTmpPaths` 이동

Edge 전환:
- [ ] `middleware.ts` 확인
- [ ] `/api/projects/route.ts`
- [ ] `/api/projects/[id]/route.ts`
- [ ] `/api/projects/[id]/brief/route.ts`
- [ ] `/api/projects/[id]/data/route.ts`
- [ ] `/api/projects/[id]/data/layout/route.ts`
- [ ] `/api/projects/[id]/html-text/route.ts`
- [ ] `/api/projects/[id]/files/[...path]/route.ts`
- [ ] `/api/payment/success/route.ts`
- [ ] `/api/auth/kakao/start/route.ts`
- [ ] `/api/auth/kakao/callback/route.ts`
- [ ] `npm run build` 통과 확인
