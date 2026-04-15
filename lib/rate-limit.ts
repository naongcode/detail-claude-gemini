import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let ratelimit: Ratelimit | null = null

function getRatelimit() {
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, '10 m'), // 10분에 5회
      analytics: true,
    })
  }
  return ratelimit
}

/**
 * rate limit 초과 시 throw.
 * UPSTASH 환경변수 미설정 시 skip (로컬 개발 편의).
 */
export async function checkRateLimit(userId: string): Promise<void> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return

  try {
    const { success, reset } = await getRatelimit().limit(userId)
    if (!success) {
      const waitMin = Math.ceil((reset - Date.now()) / 1000 / 60)
      throw new Error(`요청 한도를 초과했습니다. ${waitMin}분 후 다시 시도해 주세요. (10분 5회 제한)`)
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('요청 한도')) throw e
    // Redis 오류 시 통과 (서비스 중단 방지)
  }
}
