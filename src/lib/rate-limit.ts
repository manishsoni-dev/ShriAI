import "server-only";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const concurrencyLocks = new Map<string, number>();

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, bucket.resetAt - now),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterMs: Math.max(0, bucket.resetAt - now),
  };
}

/**
 * Ensures that expensive requests (like LLM generation or STT) do not exceed
 * a safe concurrency limit on a single instance to prevent OOM or queue starvation.
 */
export function checkConcurrency(key: string, limit: number): boolean {
  const current = concurrencyLocks.get(key) ?? 0;
  if (current >= limit) {
    return false;
  }
  concurrencyLocks.set(key, current + 1);
  return true;
}

export function releaseConcurrency(key: string): void {
  const current = concurrencyLocks.get(key) ?? 0;
  if (current > 0) {
    concurrencyLocks.set(key, current - 1);
  } else {
    concurrencyLocks.delete(key);
  }
}

export function getActiveConcurrency(key: string): number {
  return concurrencyLocks.get(key) ?? 0;
}

export function rateLimitResponseHeaders(retryAfterMs: number) {
  return {
    "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
  };
}
