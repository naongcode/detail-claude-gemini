import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('state')
  const base = process.env.NEXT_PUBLIC_BASE_URL!

  if (!code || !userId) {
    return NextResponse.redirect(`${base}/projects?verify=error`)
  }

  try {
    // 1. code → 액세스 토큰
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_REST_API_KEY!,
        redirect_uri: `${base}/api/auth/kakao/callback`,
        code,
      }),
    })
    const { access_token } = await tokenRes.json()

    // 2. 액세스 토큰 → 전화번호
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const kakaoUser = await userRes.json()
    const phone: string = kakaoUser.kakao_account?.phone_number

    if (!phone) {
      return NextResponse.redirect(`${base}/projects?verify=denied`)
    }

    // 3. 번호 해시 + 중복 확인 + 크레딧 지급
    const phoneHash = crypto.createHash('sha256').update(phone).digest('hex')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { error } = await supabase.rpc('verify_phone_and_grant_credit', {
      p_user_id: userId,
      p_phone_hash: phoneHash,
    })

    const result = error?.message === 'ALREADY_USED' ? 'duplicate' : 'success'
    return NextResponse.redirect(`${base}/projects?verify=${result}`)
  } catch {
    return NextResponse.redirect(`${base}/projects?verify=error`)
  }
}
