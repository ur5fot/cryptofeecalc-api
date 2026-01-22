/**
 * Rate Limiting Middleware for Cloudflare Workers
 *
 * Implements two-tier rate limiting:
 * 1. Minute limit: Max 10 requests per minute
 * 2. Hour limit: Max 100 requests per hour
 */

interface RateLimitConfig {
  perMinute: number
  perHour: number
}

interface RateLimitHeaders {
  limit: number
  remaining: number
  resetAt: number
}

interface RateLimitResult {
  response: Response | null
  headers?: RateLimitHeaders
}

/**
 * Default rate limit configuration
 */
const DEFAULT_CONFIG: RateLimitConfig = {
  perMinute: 10,
  perHour: 100
}

/**
 * Get client IP address from request
 */
function getClientIP(request: Request): string {
  // Cloudflare provides the real IP in CF-Connecting-IP header
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('X-Forwarded-For')?.split(',')[0] ||
         'unknown'
}

/**
 * Check and update rate limit for a specific time window
 */
async function checkLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  ttl: number
): Promise<{ count: number; allowed: boolean }> {
  const current = await kv.get(key)
  const count = current ? parseInt(current) + 1 : 1

  if (count > limit) {
    return { count, allowed: false }
  }

  // Update counter with TTL
  await kv.put(key, count.toString(), { expirationTtl: ttl })

  return { count, allowed: true }
}

/**
 * Rate limiting middleware
 *
 * @param request - Incoming request
 * @param env - Cloudflare Worker environment (with RATE_LIMIT_KV)
 * @param config - Optional rate limit configuration
 * @returns Rate limit response (429) or headers for successful responses
 */
export async function rateLimitMiddleware(
  request: Request,
  env: { RATE_LIMIT_KV?: KVNamespace },
  config: Partial<RateLimitConfig> = {}
): Promise<RateLimitResult> {
  // Skip if KV is not available (development mode)
  if (!env.RATE_LIMIT_KV) {
    console.warn('RATE_LIMIT_KV not configured, skipping rate limiting')
    return { response: null }
  }

  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const ip = getClientIP(request)
  const now = Date.now()

  // Generate keys for different time windows
  const minuteKey = `ratelimit:min:${ip}:${Math.floor(now / 60000)}`
  const hourKey = `ratelimit:hour:${ip}:${Math.floor(now / 3600000)}`

  // Check minute limit
  const minuteCheck = await checkLimit(
    env.RATE_LIMIT_KV,
    minuteKey,
    finalConfig.perMinute,
    60 // 60 seconds TTL
  )

  if (!minuteCheck.allowed) {
    const resetAt = Math.floor(now / 60000) * 60 + 60
    const retryAfter = Math.ceil((resetAt * 1000 - now) / 1000)

    return {
      response: new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Maximum ${finalConfig.perMinute} requests per minute exceeded. Please try again in ${retryAfter} seconds.`
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': finalConfig.perMinute.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetAt.toString(),
            'Retry-After': retryAfter.toString()
          }
        }
      )
    }
  }

  // Check hour limit
  const hourCheck = await checkLimit(
    env.RATE_LIMIT_KV,
    hourKey,
    finalConfig.perHour,
    3600 // 1 hour TTL
  )

  if (!hourCheck.allowed) {
    const resetAt = Math.floor(now / 3600000) * 3600 + 3600
    const retryAfter = Math.ceil((resetAt * 1000 - now) / 1000)

    return {
      response: new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Maximum ${finalConfig.perHour} requests per hour exceeded. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': finalConfig.perHour.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetAt.toString(),
            'Retry-After': retryAfter.toString()
          }
        }
      )
    }
  }

  // All checks passed - request is allowed
  const minuteRemaining = Math.max(0, finalConfig.perMinute - minuteCheck.count)
  const hourRemaining = Math.max(0, finalConfig.perHour - hourCheck.count)
  const minuteResetAt = Math.floor(now / 60000) * 60 + 60
  const hourResetAt = Math.floor(now / 3600000) * 3600 + 3600

  const minuteRatio = minuteRemaining / finalConfig.perMinute
  const hourRatio = hourRemaining / finalConfig.perHour
  const useHour = hourRatio < minuteRatio

  return {
    response: null,
    headers: useHour
      ? { limit: finalConfig.perHour, remaining: hourRemaining, resetAt: hourResetAt }
      : { limit: finalConfig.perMinute, remaining: minuteRemaining, resetAt: minuteResetAt }
  }
}

/**
 * Add rate limit headers to successful response
 */
export function addRateLimitHeaders(
  response: Response,
  remaining: number,
  limit: number,
  resetAt: number
): Response {
  const headers = new Headers(response.headers)
  headers.set('X-RateLimit-Limit', limit.toString())
  headers.set('X-RateLimit-Remaining', remaining.toString())
  headers.set('X-RateLimit-Reset', resetAt.toString())

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}
