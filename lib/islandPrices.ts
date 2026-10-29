import northJson from "@/data/priceIndex.json";
import southJson from "@/data/priceIndex.south.json";
import sourcesJson from "@/data/priceIndexSources.json";
import { FRESH_WINDOW_DAYS, type PriceRow } from "./priceIndexCompare";

/**
 * 남섬(크라이스트처치) 대 북섬(오클랜드) — **같은 고정 상품**의 정상가 비교(2026-10-28~).
 *
 * 🔴 한 쌍은 두 섬 값이 모두 있고, 두 관측일이 30일 안일 때만 센다(`priceIndexCompare`와 같은 창).
 *    한쪽이 특가 주라 비었거나, 남섬에 같은 규격이 없어 비워 둔 품목은 **빼고 그 수를 적는다.**
 *    없는 값을 0이나 북섬 값으로 채우면 「남섬이 $X 싸다」 같은 거짓 합계가 된다(08-12 $28.50 사고).
 */

export type Chain = "woolworths" | "paknsave" | "newworld";
export const CHAINS: readonly Chain[] = ["woolworths", "paknsave", "newworld"];
export const CHAIN_LABEL: Record<Chain, string> = { woolworths: "Woolworths", paknsave: "Pak'nSave", newworld: "New World" };

type IndexFile = {
  lastUpdated?: string;
  woolworthsUpdated?: string;
  paknsaveUpdated?: string;
  newworldUpdated?: string;
  items: (PriceRow & { unit?: string; category?: string })[];
};

export const NORTH = northJson as unknown as IndexFile;
export const SOUTH = southJson as unknown as IndexFile;

const DAY = 86_400_000;
const KEY: Record<Chain, "countdown" | "paknsave" | "newworld"> = { woolworths: "countdown", paknsave: "paknsave", newworld: "newworld" };

/** 그 행의 그 체인 값을 언제 쟀나. Foodstuffs는 행 날짜, Woolworths는 열 날짜(행 날짜가 없다 — 못 읽으면 값을 안 바꾼다). */
function asOf(file: IndexFile, row: PriceRow, chain: Chain): string | undefined {
  if (chain === "paknsave") return row.paknsaveAsOf;
  if (chain === "newworld") return row.newworldAsOf;
  return file.woolworthsUpdated;
}

function valueOf(row: PriceRow | undefined, chain: Chain): number | null {
  const v = row?.[KEY[chain]];
  return typeof v === "number" && v > 0 ? v : null;
}

/**
 * Woolworths 고정 SKU가 없는(사람이 막아 둔) 품목 — 그 북섬 값은 5월 매장 실사값이 그대로 남은 것이다.
 * 행 날짜가 없어 열 날짜(이번 주)로 보이므로, 표에 「오클랜드 이번 주 값」처럼 세우지 않는다.
 */
const WOOLWORTHS_UNREAD = new Set(
  Object.entries((sourcesJson as unknown as { items: Record<string, { blocked?: boolean; sku?: string }> }).items)
    .filter(([, e]) => e.blocked || !e.sku)
    .map(([name]) => name),
);

/** 그 값을 실제로 이번 라운드 근처(30일)에 쟀나 — 못 쟀으면 null로 본다. */
function freshValue(file: IndexFile, row: PriceRow | undefined, chain: Chain, ref: string | undefined): number | null {
  const v = valueOf(row, chain);
  if (v === null || !row || !ref) return null;
  if (chain === "woolworths" && WOOLWORTHS_UNREAD.has(row.name)) return null;
  const d = asOf(file, row, chain);
  if (!d) return null;
  const gap = Math.abs(Date.parse(d) - Date.parse(ref)) / DAY;
  return Number.isFinite(gap) && gap <= FRESH_WINDOW_DAYS ? v : null;
}

export type IslandPair = { name: string; unit?: string; north: number; south: number; diff: number };

/** 한 체인에서 두 섬을 비교할 수 있는 품목들. */
export function islandPairs(chain: Chain, north: IndexFile = NORTH, south: IndexFile = SOUTH): IslandPair[] {
  const byName = new Map(north.items.map((r) => [r.name, r]));
  const out: IslandPair[] = [];
  for (const s of south.items) {
    const n = byName.get(s.name);
    const sd = asOf(south, s, chain);
    const sv = valueOf(s, chain);
    // 북섬 값은 남섬 관측일 기준 30일 안에 실제로 잰 것만 — 막아 둔 Woolworths 품목의 옛 값도 뺀다.
    const nv = freshValue(north, n, chain, sd);
    if (sv === null || nv === null || !n || !sd) continue;
    out.push({ name: s.name, unit: s.unit, north: nv, south: sv, diff: Math.round((sv - nv) * 100) / 100 });
  }
  return out;
}

export type IslandSummary = {
  chain: Chain;
  /** 비교에 들어간 품목 수 / 전체 품목 수 — 화면에 반드시 같이 적는다 */
  count: number;
  total: number;
  north: number;
  south: number;
  southDearer: number;
  southCheaper: number;
  same: number;
};

export function islandSummary(chain: Chain, north: IndexFile = NORTH, south: IndexFile = SOUTH): IslandSummary {
  const pairs = islandPairs(chain, north, south);
  const sum = (k: "north" | "south") => Math.round(pairs.reduce((t, p) => t + p[k], 0) * 100) / 100;
  return {
    chain,
    count: pairs.length,
    total: south.items.length,
    north: sum("north"),
    south: sum("south"),
    southDearer: pairs.filter((p) => p.diff > 0).length,
    southCheaper: pairs.filter((p) => p.diff < 0).length,
    same: pairs.filter((p) => p.diff === 0).length,
  };
}

/** 표 한 줄 — 남섬 세 체인 값(없으면 null)과 같은 품목의 북섬 값. */
export function southTableRows(north: IndexFile = NORTH, south: IndexFile = SOUTH) {
  const byName = new Map(north.items.map((r) => [r.name, r]));
  return south.items.map((s) => {
    const n = byName.get(s.name);
    return {
      name: s.name,
      unit: s.unit ?? "",
      category: s.category ?? "",
      south: Object.fromEntries(CHAINS.map((c) => [c, valueOf(s, c)])) as Record<Chain, number | null>,
      // 비교 근거가 없는 북섬 값(옛 실사값·30일 넘은 값)은 「—」로 둔다.
      north: Object.fromEntries(CHAINS.map((c) => [c, freshValue(north, n, c, asOf(south, s, c) ?? south.lastUpdated)])) as Record<Chain, number | null>,
    };
  });
}
