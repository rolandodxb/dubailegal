/**
 * Minimal fixed-window rate limiter for authentication endpoints.
 *
 * This is deliberately small: it protects against online password guessing on a
 * single app instance. Counters live in process memory and are therefore NOT
 * shared across instances or preserved across restarts. A multi-instance
 * deployment must move this to a shared store (Redis) — see README
 * "Before production".
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function consumeRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowSeconds * 1000;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: windowSeconds };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/** Called after a successful authentication so a good login clears the window. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Housekeeping so the map cannot grow without bound in a long-lived process. */
export function pruneRateLimits(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
