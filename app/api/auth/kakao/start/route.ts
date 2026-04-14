import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  let user
  try {
    user = await requireAuth()
  } catch {
    return unauthorizedResponse()
  }

  const params = new URLSearchParams({
    client_id: process.env.KAKAO_REST_API_KEY!,
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/kakao/callback`,
    response_type: 'code',
    scope: 'phone_number',
    state: user.id,
  })

  return NextResponse.redirect(
    `https://kauth.kakao.com/oauth/authorize?${params}`
  )
}
