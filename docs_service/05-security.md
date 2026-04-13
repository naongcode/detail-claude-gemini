# 보안

## 현재 취약점 목록

### 1. 파일 업로드 서버 검증 없음

[app/api/projects/[id]/photos/route.ts]에서 업로드된 파일을 Supabase에 그대로 저장.
클라이언트에서 `.jpg,.jpeg,.png,.webp`만 체크하지만, API를 직접 호출하면 우회 가능.

**위험:** 악성 파일 업로드, 무제한 용량 업로드

**수정:**
```ts
// app/api/projects/[id]/photos/route.ts
import sharp from 'sharp'

const MAX_FILE_SIZE = 10 * 1024 * 1024  // 10MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(req: NextRequest, { params }) {
  const formData = await req.formData()
  const file = formData.get('file') as File

  // 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다.' }, { status: 400 })
  }

  // MIME 타입 검증 (헤더 기반)
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: '지원하지 않는 파일 형식입니다.' }, { status: 400 })
  }

  // sharp로 실제 이미지인지 검증 (MIME 스푸핑 방어)
  const buffer = Buffer.from(await file.arrayBuffer())
  try {
    await sharp(buffer).metadata()  // 실제 이미지가 아니면 예외 발생
  } catch {
    return NextResponse.json({ error: '유효하지 않은 이미지 파일입니다.' }, { status: 400 })
  }

  // 업로드 진행
  await uploadPhoto(projectId, file.name, buffer, file.type)
  return NextResponse.json({ ok: true })
}
```

### 2. 프로젝트 ID 인증 우회

API 라우트가 `[id]` 파라미터를 그대로 믿는다. 인증 추가 후에도 프로젝트 소유자 확인 필요.

**수정:**
```ts
// lib/auth.ts에 추가
export async function requireProjectOwner(userId: string, projectId: string): Promise<void> {
  const supabase = getClient()
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()
  if (!data) throw new Error('FORBIDDEN')
}

// 각 [id] 라우트에서 사용
const user = await requireAuth()
await requireProjectOwner(user.id, id)  // 소유자 아니면 403
```

### 3. 생성된 HTML 서빙 위험

[app/api/projects/[id]/files/[...path]/route.ts]가 `page.html`을 그대로 서빙하면, 해당 HTML에 포함된 외부 리소스가 로드된다.

**현재 상태:** PNG 렌더링 목적이므로 실제 브라우저에서 HTML을 직접 렌더링하지 않으면 위험 없음.

**주의:** 만약 미리보기 iframe 등을 추가할 경우 반드시 sandbox 속성 적용:
```html
<iframe src="/api/projects/[id]/files/page.html"
        sandbox="allow-same-origin"
        style="width:750px; height:600px;">
</iframe>
```

### 4. 환경변수 노출 확인

서버사이드 전용 키가 클라이언트 번들에 포함되면 안 된다.

**확인 목록:**
```
ANTHROPIC_API_KEY        → 서버 전용 (NEXT_PUBLIC_ 접두사 없음) ✓
OPENAI_API_KEY           → 서버 전용 ✓
GEMINI_API_KEY           → 서버 전용 ✓
SUPABASE_SERVICE_ROLE_KEY → 서버 전용 ✓ (클라이언트에서 절대 사용 금지)
NEXT_PUBLIC_SUPABASE_URL  → 클라이언트 노출 가능 ✓
NEXT_PUBLIC_SUPABASE_ANON_KEY → 클라이언트 노출 가능 ✓ (anon key는 RLS로 보호)
```

**검사 명령:**
```bash
# 빌드 후 클라이언트 번들에서 API 키 검색
grep -r "sk-" .next/static/
grep -r "AIza" .next/static/
```

### 5. Supabase Anon Key + Storage 버킷 정책

`NEXT_PUBLIC_SUPABASE_ANON_KEY`는 공개되어 있으므로, Storage 버킷 정책이 중요하다.

**확인 사항:**
- `project-assets` 버킷: Public이면 URL만 알면 누구나 접근 가능
- 민감한 경우 Private으로 전환 + Signed URL 사용
- RLS가 Storage에는 적용 안 됨 → 버킷 레벨 정책으로 관리

```sql
-- Storage 정책: 인증된 사용자만 업로드
CREATE POLICY "auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-assets');

-- 자신의 폴더만 접근 (user_id 기반 경로 규칙 필요)
```

### 6. CORS 설정

현재 API 라우트에 CORS 설정이 없다. 외부 도메인에서 API를 직접 호출할 수 있다.

```ts
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_BASE_URL! },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
        ],
      },
    ]
  },
}
```

## 체크리스트

- [ ] 파일 업로드 API에 크기·MIME·sharp 검증 추가
- [ ] 모든 `[id]` 라우트에 프로젝트 소유자 확인 추가
- [ ] 빌드 번들에 서버 API 키 노출 여부 검사
- [ ] Supabase Storage 버킷 정책 검토
- [ ] CORS 설정 추가
- [ ] iframe 미리보기 추가 시 sandbox 속성 적용
- [ ] 정기적인 의존성 취약점 스캔 (`npm audit`)
