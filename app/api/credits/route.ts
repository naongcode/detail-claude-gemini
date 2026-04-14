import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'

export async function GET() {
  try {
    const user = await requireAuth()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data } = await supabase
      .from('user_credits')
      .select('balance, phone_verified, regen_tickets')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      balance: data?.balance ?? 0,
      phone_verified: data?.phone_verified ?? false,
      regen_tickets: data?.regen_tickets ?? 0,
    })
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
