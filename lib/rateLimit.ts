/**
 * Lightweight in-process rate limiter.
 * Each Vercel Lambda instance has its own map, so the cap applies
 * per-instance — this is "soft" rate limiting appropriate for spam
 * prevention, not hard security enforcement.
 */
const store = new Map<string, { count: number; resetAt: number }>();

/**
 * Returns true (request allowed) or false (limit exceeded).
 * @param key      - Identifier, e.g. an IP address or email.
 * @param limit    - Max requests allowed in the window.
 * @param windowMs - Window size in milliseconds.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}
