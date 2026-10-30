import history from "@/data/priceHistory.json";

/**
 * 가격 이력을 **그릴 수 있는 형태**로 내주는 단 하나의 자리(Kiwi `lib/priceSeries.ts`의 AU판).
 *
 * 점 하나 = 그 열이 **실제로 그 날짜에 관측한 값**이다. 빠진 주는 점이 없다.
 * 보간하지 않는다 — 안 재 본 날의 값을 그리는 것이기 때문이다.
 *
 * Aussie(2026-10-30): 열은 Woolworths 하나다(Coles는 Imperva 봇 확인으로 추적 안 함). 이력은 10-30에 시작했다.
 */

export type Chain = "woolworths";
export const CHAINS: Chain[] = ["woolworths"];
export const CHAIN_LABEL: Record<Chain, string> = { woolworths: "Woolworths" };

type Round = { date: string; items: Record<string, number> };
const COLUMNS = (history as unknown as { columns: Record<Chain, Round[]> }).columns;

export type Point = { date: string; price: number };
export type ItemSeries = { item: string; byChain: Record<Chain, Point[]> };

export const allItems = (): string[] => {
  const s = new Set<string>();
  for (const rounds of Object.values(COLUMNS)) for (const r of rounds) for (const k of Object.keys(r.items)) s.add(k);
  return [...s].sort();
};

export function seriesFor(item: string): ItemSeries {
  const byChain = {} as Record<Chain, Point[]>;
  for (const c of CHAINS) {
    byChain[c] = (COLUMNS[c] ?? [])
      // 🔴 0 이하는 가격이 아니라 「안 재었다」이다(Kiwi 2026-08-12 「$28.50 절약」 사고). 들어오는 단계에서 버린다.
      .filter((r) => typeof r.items[item] === "number" && r.items[item] > 0)
      .map((r) => ({ date: r.date, price: r.items[item] }));
  }
  return { item, byChain };
}

/** 🔴 **추이로 싣는 기준.** 3회 미만은 추이가 아니라 점이다. 추이라고 부르면 안 된다. */
export const MIN_POINTS = 3;
export const seriesItems = (): string[] =>
  allItems().filter((it) => CHAINS.some((c) => seriesFor(it).byChain[c].length >= MIN_POINTS));

/** 열별 관측 범위와 횟수. 「매주」라고 말하지 않기 위한 근거다. */
export function coverage(): { chain: Chain; rounds: number; first: string; last: string }[] {
  return CHAINS.map((c) => {
    const rs = COLUMNS[c] ?? [];
    return { chain: c, rounds: rs.length, first: rs[0]?.date ?? "", last: rs[rs.length - 1]?.date ?? "" };
  });
}

/** 첫 관측 → 마지막 관측 변동. 관측이 2회 미만이면 null — 변동이 없는 게 아니라 **모르는 것**이다. */
export function changeSince(item: string, chain: Chain): { from: Point; to: Point; pct: number } | null {
  const pts = seriesFor(item).byChain[chain];
  if (pts.length < 2) return null;
  const from = pts[0], to = pts[pts.length - 1];
  if (!(from.price > 0)) return null;
  return { from, to, pct: ((to.price - from.price) / from.price) * 100 };
}
