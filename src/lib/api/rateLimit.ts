const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple in-memory per-user rate limiter.
 * Returns true if the request is allowed, false if it should be rejected.
 */
export function checkRateLimit(userId: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;
  entry.count++;
  return true;
}
