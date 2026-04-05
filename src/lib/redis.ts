import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const ANON_DAILY_LIMIT = 10
const AUTH_DAILY_LIMIT = 50
const TTL_SECONDS = 86400 // 24 hours

export async function checkRateLimit(
  identifier: string,
  isAuthenticated: boolean
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rate:v1:${identifier}`
  const limit = isAuthenticated ? AUTH_DAILY_LIMIT : ANON_DAILY_LIMIT

  try {
    // Increment first, then check — uses only 2 Redis commands per request
    const pipeline = redis.pipeline()
    pipeline.incr(key)
    pipeline.ttl(key)
    const results = await pipeline.exec()
    const count = results[0] as number
    const ttl = results[1] as number

    // Set TTL on first use
    if (ttl === -1) {
      await redis.expire(key, TTL_SECONDS)
    }

    if (count > limit) {
      return { allowed: false, remaining: 0 }
    }

    return { allowed: true, remaining: limit - count }
  } catch {
    // Fail open — if Redis is unavailable, allow the request
    return { allowed: true, remaining: 1 }
  }
}
