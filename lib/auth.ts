import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function createSupabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

export async function requireAuth() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHORIZED')
  return user
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
}

export function forbiddenResponse() {
  return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 })
}

export async function requireProjectOwner(userId: string, projectId: string): Promise<void> {
  const supabase = await createSupabaseServer()
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()
  if (!data) throw new Error('FORBIDDEN')
}
