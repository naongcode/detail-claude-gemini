import { NextResponse } from 'next/server'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import { getBalance } from '@/lib/credits'

export async function GET() {
  try {
    const user = await requireAuth()
    const balance = await getBalance(user.id)
    return NextResponse.json({ balance })
  } catch (err) {
    if (String(err).includes('UNAUTHORIZED')) return unauthorizedResponse()
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
