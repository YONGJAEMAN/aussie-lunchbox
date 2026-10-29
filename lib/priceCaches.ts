import northCacheJson from "@/data/price_cache.json";
import southCacheJson from "@/data/price_cache.south.json";
import type { Island } from "@/data/promotions.types";
import type { PriceInfo } from "./types";

/**
 * 플래너 가격 캐시 — 섬별(2026-10-28~). 북섬은 이 기능 전과 같은 `price_cache.json`(Woolworths 기본 세션 = Glenfield).
 * 남섬은 `price_cache.south.json`(Church Corner 픽업 세션, `scripts/update_prices.mjs --island south`).
 *
 * 🔴 남섬에서 같은 상품을 못 읽은 재료는 북섬 수집가에 `fromNorth: true`가 붙어 있다 — 플래너가 원가를
 *    매겨야 해서 비울 수 없고, 지어낸 추정가보다 낫다. 몇 개인지는 `southCacheCoverage()`로 화면에 적는다.
 */
export type CacheEntry = { timestamp: number; data: PriceInfo & { fromNorth?: boolean } };
export type PriceCache = Record<string, CacheEntry>;

const NORTH = northCacheJson as unknown as PriceCache;
const SOUTH = southCacheJson as unknown as PriceCache;

export function cacheFor(island: Island = "north"): PriceCache {
  return island === "south" ? SOUTH : NORTH;
}

/**
 * 남섬 캐시 중 크라이스트처치에서 실제로 읽은 재료 수 / (읽은 것 + 북섬 값을 쓴 것).
 * 추정가(`Est.`, 북섬에도 같은 것이 있는 복합 이름)는 어느 섬 가격도 아니라 분모에서 뺀다 —
 * 화면 문장이 「나머지는 오클랜드 가격」이라 분모에 넣으면 그 문장이 틀린다.
 */
export function southCacheCoverage(cache: PriceCache = SOUTH): { read: number; total: number; fromNorth: string[] } {
  const entries = Object.entries(cache);
  const fromNorth = entries.filter(([, v]) => v.data?.fromNorth).map(([k]) => k).sort();
  const estimated = entries.filter(([, v]) => !v.data?.fromNorth && /^est\./i.test(v.data?.source ?? "")).length;
  const read = entries.length - fromNorth.length - estimated;
  return { read, total: read + fromNorth.length, fromNorth };
}
