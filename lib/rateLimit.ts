/**
 * Simple in-memory rate limiter.
 * NOTE: On Vercel serverless, state is per-Lambda-instance (not global).
 * This provides best-effort protection within a warm instance.
 */

const store = new Map<string, number[]>();

/**
 * Returns true if the request is allowed, false if rate-limited.
 * @param key      Unique key (e.g. IP address or user ID)
 * @param max      Max requests allowed within the window
 * @param windowMs Time window in milliseconds
 */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= max) return false;

  timestamps.push(now);
  store.set(key, timestamps);
  return true;
}

/** Extract the best available IP from a Next.js request. */
export function getClientIp(req: Request): string {
  const headers = new Headers((req as Request).headers);
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
