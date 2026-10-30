import menuData from "@/data/menuData.json";
import PRICES from "@/data/price_cache.json";
import { PORTION_FACTORS, DEFAULT_PORTION } from "./planConfig";
import { snackSlotsCost, boxMedian } from "./servePrice";
import type { SnackItem, SnackData } from "./types";

/**
 * 간식 41종의 **1회분 비용**을 카테고리별로 본다.
 *
 * 🔴 왜 있나 (2026-09-11 측정, 09-14 재측정) — 살아 있는 글 어디에도 간식이 **주제**인
 *    글이 없다. 메뉴(메인)는 여러 각도로 쟀는데 간식은 곁들이로만 나왔다.
 *    그런데 완성 도시락 한 통 중 간식 두 칸이 그 3분의 1을 넘는다.
 *    금액은 여기 적지 않는다 — `lib/servePrice.ts`가 만든다(09-15에 $3.85로 적어 뒀다가
 *    사이트 나머지의 $3.80과 어긋났다).
 *
 * 🔴 **수치를 손으로 옮겨 적지 말 것.** 09-14에 실제로 밟았다 — `PORTION_FACTORS`를
 *    정규식으로 긁어 계산했더니 일부 항목이 기본값(0.10)으로 떨어져 과일칸 중앙값이
 *    $0.82가 아니라 $0.72로 나왔고, 그 값으로 "논지가 깨졌다"는 결론까지 냈다.
 *    실제로 import해서 재니 원래 값이 맞았다. 그래서 여기서 생성한다.
 *
 * 🔴 **폭(최대/최소)은 중앙값보다 튼튼하다.** 칸끼리의 중앙값 차이는 몇 센트라
 *    다음 수집에 뒤집힐 수 있지만, 칸 **안**의 7.6배는 그렇지 않다.
 *    빠듯한 주장을 피하려고 문장이 스스로 그 둘을 구별한다(`spreadVerdict`).
 */

const SN = (menuData as unknown as { SNACK_DATA: SnackData }).SNACK_DATA;
const P = PRICES as Record<string, { data?: { price?: number } }>;

/**
 * 플래너 생성기가 실제로 뽑는 풀 — `dietEconomics`의 SNACK_POOL과 같은 정의다.
 * 🔴 Sweet Treat 은 생성기가 **쓰지 않는다.** 글에서 4칸을 나란히 세우면서
 *    이걸 안 밝히면 사이트 동작과 어긋난다.
 */
export const PLANNER_CATEGORIES = ["Fruit & Veg", "Protein & Dairy", "Savoury Crunch"] as const;
export const EXCLUDED_CATEGORY = "Sweet Treat";

export const serveCost = (s: SnackItem) =>
  s.ingredients.reduce(
    (t, i) => t + (P[i]?.data?.price ?? 0) * (PORTION_FACTORS[i] ?? DEFAULT_PORTION),
    0,
  );

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export const money = (n: number) => `$${n.toFixed(2)}`;

export type SnackRow = { cat: string; name: string; cost: number; inPlannerPool: boolean };

/** 간식 전건. 가격이 없는 재료를 쓰는 간식은 **빼지 않고 드러낸다** — 세는 곳이 없으면 없다고 단정하게 된다. */
export function snackRows(): SnackRow[] {
  const out: SnackRow[] = [];
  for (const cat of Object.keys(SN)) {
    for (const s of SN[cat as keyof SnackData]) {
      out.push({
        cat,
        name: s.name,
        cost: serveCost(s),
        inPlannerPool: (PLANNER_CATEGORIES as readonly string[]).includes(cat),
      });
    }
  }
  return out.sort((a, b) => b.cost - a.cost);
}

export const snackCount = () => snackRows().length;

/** 가격이 하나라도 비는 간식. 0이 아니면 아래 수치를 믿으면 안 된다. */
export function unpricedSnacks(): string[] {
  const out: string[] = [];
  for (const cat of Object.keys(SN)) {
    for (const s of SN[cat as keyof SnackData]) {
      if (s.ingredients.some((i) => typeof P[i]?.data?.price !== "number")) out.push(s.name);
    }
  }
  return out;
}

export type CategoryRow = {
  cat: string; n: number; median: number; min: number; max: number;
  spread: number; cheapest: string; dearest: string; inPlannerPool: boolean;
};

export function categoryRows(): CategoryRow[] {
  const rows = snackRows();
  const cats = [...new Set(rows.map((r) => r.cat))];
  return cats
    .map((cat) => {
      const inCat = rows.filter((r) => r.cat === cat);
      const costs = inCat.map((r) => r.cost);
      const min = Math.min(...costs);
      const max = Math.max(...costs);
      return {
        cat,
        n: inCat.length,
        median: median(costs),
        min,
        max,
        spread: min > 0 ? max / min : 0,
        cheapest: inCat[inCat.length - 1].name,
        dearest: inCat[0].name,
        inPlannerPool: (PLANNER_CATEGORIES as readonly string[]).includes(cat),
      };
    })
    .sort((a, b) => b.median - a.median);
}

export function categoryTable(): string {
  const head = "| Category | Snacks | Median a serve | Cheapest | Dearest | Spread |\n|---|---|---|---|---|---|";
  const body = categoryRows()
    .map(
      (r) =>
        `| ${r.cat}${r.inPlannerPool ? "" : " \u2020"} | ${r.n} | ${money(r.median)} | ${money(r.min)} — ${r.cheapest} | ${money(r.max)} — ${r.dearest} | ${r.spread.toFixed(1)}× |`,
    )
    .join("\n");
  return `${head}\n${body}`;
}

/** 칸 사이의 중앙값 폭 — 칸 안의 폭과 비교할 대조군이다. */
export function betweenCategorySpread(): number {
  const meds = categoryRows().map((r) => r.median);
  return Math.min(...meds) > 0 ? Math.max(...meds) / Math.min(...meds) : 0;
}

/**
 * 🔴 09-28 — **생성기가 뽑는 칸만** 본다. Sweet Treat(†)이 폭 1위가 되자 본문의
 *    「Which fruit?」와 주간 절약액이 실제로는 Sultanas 대 Fruit Leather를 재고 있었다.
 *    플래너가 고르지 않는 칸 안의 선택은 이 글이 권할 수 있는 선택이 아니다.
 */
export function widestCategory(): CategoryRow {
  return categoryRows()
    .filter((r) => r.inPlannerPool)
    .sort((a, b) => b.spread - a.spread)[0];
}

export function tightestCategory(): CategoryRow {
  return [...categoryRows()].sort((a, b) => a.spread - b.spread)[0];
}

export const cheapestCategory = () => [...categoryRows()].sort((a, b) => a.median - b.median)[0];
export const dearestCategory = () => categoryRows()[0];

/**
 * 🔴 중앙값 1·2위 차이가 작으면 「가장 비싸다」고 쓰지 않는다.
 *    09-14 기준 $0.82 대 $0.74 — 8센트다. 한 번의 수집으로 뒤집힌다.
 *    `dietEconomics`가 8% 미만이면 「비슷하다」고 말하는 것과 같은 규칙이다.
 */
export const TIGHT_PCT = 0.08;

export function dearestVerdict(): string {
  const rows = categoryRows();
  const [first, second] = rows;
  const gap = (first.median - second.median) / second.median;
  if (gap < TIGHT_PCT) {
    return `${first.cat} and ${second.cat} sit within a few cents of each other at the top (${money(first.median)} and ${money(second.median)} a serve), which is too close to call a winner — one collection could swap them`;
  }
  return `${first.cat} is the dearest box at ${money(first.median)} a serve, ${Math.round(gap * 100)}% above ${second.cat}`;
}

/** 「칸 안이 칸 사이보다 넓다」가 참인지 스스로 확인하고 말한다. */
export function spreadVerdict(): string {
  const w = widestCategory();
  const between = betweenCategorySpread();
  if (w.spread <= between) {
    return `the categories differ more than the snacks inside them do (${between.toFixed(1)}× between the category medians, ${w.spread.toFixed(1)}× inside the widest one) — on this reading, which box you pick is the bigger decision`;
  }
  return `the gap inside one category is far wider than the gap between categories — ${w.spread.toFixed(1)}× inside ${w.cat} against ${between.toFixed(1)}× between the category medians`;
}

export function dearestSnacks(n = 5): SnackRow[] {
  return snackRows().slice(0, n);
}

export function cheapestSnacks(n = 5): SnackRow[] {
  return [...snackRows()].reverse().slice(0, n);
}

export function extremesTable(n = 5): string {
  const head = "| | Snack | Category | A serve |\n|---|---|---|---|";
  const top = dearestSnacks(n).map((r) => `| Dearest | ${r.name} | ${r.cat} | ${money(r.cost)} |`);
  const bot = cheapestSnacks(n).map((r) => `| Cheapest | ${r.name} | ${r.cat} | ${money(r.cost)} |`);
  return `${head}\n${[...top, ...bot].join("\n")}`;
}

/** 같은 칸 안에서 제일 싼 것과 제일 비싼 것 — 「어느 과일이냐」를 보여주는 짝. */
export function widestPairClause(): string {
  const w = widestCategory();
  return `${w.cheapest} at ${money(w.min)} and ${w.dearest} at ${money(w.max)} are both ${w.cat}`;
}

/**
 * 간식 두 칸이 완성 도시락에서 차지하는 몫.
 *
 * 🔴 여기서 다시 계산하지 말 것 (2026-09-15). 원래 이 함수가
 *    `median(과일) + median(세 풀 전부)`였다. 둘째 칸에 과일을 섞은 것인데
 *    생성기는 둘째 칸을 `Protein & Dairy ∪ Savoury Crunch`에서만 뽑는다
 *    (`planGenerator.ts:368-374`). 그 7센트 때문에 이 글만 $3.85를 말하고
 *    FAQ·홈·플래너는 3개 언어로 $3.80을 말했다 — 같은 사이트 안에서 모순이다.
 *    도시락 구성의 정의는 `lib/servePrice.ts` 한 곳에만 둔다.
 */
export function twoSnackCost(): number {
  return snackSlotsCost();
}

export function swapSaving(): number {
  const w = widestCategory();
  return w.max - w.min;
}

/** 한 주(5일) 동안 같은 칸 안에서 싼 쪽을 고르면 생기는 차이. */
export function weeklySwapSaving(): number {
  return swapSaving() * 5;
}

/**
 * 완성 도시락(메인 + 과일 한 칸 + 간식 한 칸)의 중앙값.
 * 🔴 아웃리치 메일과 홈 히어로가 말하는 "$3.80"과 **같은 함수**여야 한다 —
 *    09-15까지는 "같은 계산"이라고 적혀만 있고 실제로는 다른 값을 내고 있었다.
 */
export const medianLunchbox = boxMedian;

/** 칸 사이 중앙값의 실제 금액 차 — "칸을 바꾸면 이만큼"의 정직한 값. */
export function betweenCategoryGap(): number {
  return dearestCategory().median - cheapestCategory().median;
}
