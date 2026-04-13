# 인증 + 프로젝트 소유권

## 현재 문제

모든 API 라우트에 인증이 전혀 없다.

- `GET /api/projects` → 전체 프로젝트 목록이 누구에게나 공개
- `DELETE /api/projects/[id]` → 누구나 남의 프로젝트 삭제 가능
- 프로젝트 ID는 `{slugified_name}_{timestamp}` 형태로 예측 가능
- Supabase Storage 버킷(`project-assets`)이 Public이면 URL 직접 접근 가능

## 목표 상태

- 이메일/소셜 로그인
- 각 프로젝트는 생성한 사용자만 조회·수정·삭제 가능
- API 라우트는 미인증 요청을 401로 거부

## 구현 방법: Supabase Auth + RLS

### 1단계: DB 스키마 변경

```sql
-- projects 테이블에 user_id 컬럼 추가
ALTER TABLE projects ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 기존 데이터는 임시로 null 허용, 이후 NOT NULL로 변경
-- ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL;

-- RLS 활성화
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 정책: 자신의 프로젝트만 읽기/쓰기/삭제
CREATE POLICY "owner_all" ON projects
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 2단계: Supabase Auth 클라이언트 설정

```ts
// lib/auth.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createSupabaseServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
}

export async function requireAuth() {
  const supabase = createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHORIZED')
  return user
}
```

### 3단계: API 라우트 적용

```ts
// app/api/projects/route.ts — 수정 예시
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const user = await requireAuth()
    const projects = await listProjects(user.id)  // user_id 필터 추가
    return NextResponse.json(projects)
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await requireAuth()
  const { name } = await req.json()
  const id = await createProject(name.trim(), user.id)  // user_id 전달
  return NextResponse.json({ id }, { status: 201 })
}
```

### 4단계: 미들웨어로 라우트 보호

```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => request.cookies.get(name)?.value } }
  )
  const { data: { user } } = await supabase.auth.getUser()

  // 미인증 사용자를 로그인 페이지로 리디렉트
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return response
}

export const config = {
  matcher: ['/projects/:path*'],
}
```

### 5단계: 로그인 페이지

로그인은 Google OAuth만 사용. 카카오는 크레딧 인증 전용 (로그인 불가).

```tsx
// app/login/page.tsx
'use client'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/api/auth/callback` },
    })

  return (
    <div>
      <button onClick={signInWithGoogle}>Google로 로그인</button>
    </div>
  )
}
```

## Storage 버킷 보안

현재 `project-assets` 버킷이 Public인지 확인 필요. Private으로 변경하고 Signed URL 사용:

```ts
// 파일 접근 시 signed URL 생성 (1시간 유효)
const { data } = await supabase.storage
  .from('project-assets')
  .createSignedUrl(path, 3600)
```

## 패키지

```bash
npm install @supabase/ssr
```

## 체크리스트

- [ ] `projects` 테이블에 `user_id` 컬럼 추가
- [ ] RLS 정책 적용
- [ ] `lib/auth.ts` 작성
- [ ] 모든 API 라우트에 `requireAuth()` 추가
- [ ] `middleware.ts` 작성
- [ ] 로그인 페이지 (`/login`) 작성
- [ ] Supabase Dashboard에서 Google/카카오 OAuth 설정
- [ ] Storage 버킷 Private 전환 여부 결정
