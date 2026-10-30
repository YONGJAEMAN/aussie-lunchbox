/**
 * Simple in-memory rate limiter.
 * NOTE: On Vercel serverless, state is per-Lambda-instance (not global).
 * This provides best-effort protection within a warm instance.
 */

const store = new Map<string, number[]>();

/** 클라이언트를 특정하지 못했을 때 쓰는 키. */
export const UNKNOWN_IP = "unknown";

/** 오래된 키가 무한정 쌓이지 않게 정리한다. */
function prune(now: number, windowMs: number) {
  for (const [k, ts] of store) {
    const live = ts.filter((t) => t > now - windowMs);
    if (live.length === 0) store.delete(k);
    else if (live.length !== ts.length) store.set(k, live);
  }
}

export interface RateLimitVerdict {
  allowed: boolean;
  /** 다시 시도해도 되기까지 남은 초. allowed면 0. */
  retryAfterSec: number;
}

/**
 * 창 안에서 max건까지 허용한다.
 *
 * 🔴 2026-08-31: 문의폼이 이 파일을 쓰지 않고 **자기 복사본**을 들고 있었고,
 *    한도가 시간당 3건이었다. 몇 번 시도하면 바로 막히는데 화면에는
 *    "필수 항목을 채우세요"로 떠서, 사용자도 우리도 원인을 못 찾았다.
 */
export function rateLimit(key: string, max: number, windowMs: number): RateLimitVerdict {
  const now = Date.now();
  const windowStart = now - windowMs;
  prune(now, windowMs);

  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= max) {
    const oldest = Math.min(...timestamps);
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) };
  }
  timestamps.push(now);
  store.set(key, timestamps);
  return { allowed: true, retryAfterSec: 0 };
}

/** 기존 호출부(boolean)를 위한 얇은 래퍼. */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  return rateLimit(key, max, windowMs).allowed;
}

/**
 * 요청에서 클라이언트 IP를 뽑는다.
 *
 * 🔴 IP를 못 뽑으면 **모든 방문자가 한 바구니**를 쓰게 된다. 한 사람이 한도를
 *    채우면 그 시간 동안 전원이 막힌다. 그래서 UNKNOWN_IP를 돌려줄 때는
 *    호출부가 그 사실을 알 수 있어야 한다(isUnknownIp).
 */
export function getClientIp(req: Request): string {
  const h = new Headers(req.headers);
  const candidates = [
    h.get("x-forwarded-for")?.split(",")[0],
    h.get("x-real-ip"),
    h.get("x-vercel-forwarded-for")?.split(",")[0],
    h.get("cf-connecting-ip"),
  ];
  for (const c of candidates) {
    const v = c?.trim();
    if (v) return v;
  }
  return UNKNOWN_IP;
}

export const isUnknownIp = (ip: string) => ip === UNKNOWN_IP;

/** 테스트 전용 — 인스턴스 메모리를 비운다. */
export function __resetRateLimitStore() {
  store.clear();
}
