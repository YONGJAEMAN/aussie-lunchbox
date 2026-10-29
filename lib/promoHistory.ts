import promotionsJson from "@/data/promotions.json";
import type { Promotion, StoreId } from "@/data/promotions.types";

/**
 * 특가 이력 통계 — 블로그 글이 쓰는 숫자를 **전부 여기서** 만든다.
 *
 * 🔴 본문에 숫자를 손으로 적지 말 것. 다음 주 전단을 넣는 순간 글이 조용히
 *    거짓이 된다. 이 사이트가 다섯 번 거절당한 사유가 정확히 "문구끼리의 모순"이다.
 *
 * 🔴 **건수 추세는 여기서 만들지 않는다.** 주당 특가 건수가 29 → 89로 늘었지만
 *    그건 마트가 아니라 **내 수집이 바뀐 것**이다(09-07부터 전단 PDF를 통째로
 *    입력했다). 회원 전용 비율도 같은 이유로 못 쓴다 — 주차별로 0%와 100% 사이를
 *    튄다. 여기 있는 건 전부 **"몇 주에 걸쳐 나왔나"** 형태다. 수집이 성길수록
 *    이 값은 **내려가므로**, 관측이 부실했다면 주장이 약해질 뿐 부풀지 않는다.
 */
type WeekRecord = {
  validFrom: string;
  validUntil: string;
  stores: Partial<Record<StoreId, { storeName: string; sourceUrl?: string; items: Promotion[] }>>;
};

const WEEKS = (promotionsJson as unknown as { weeks: Record<string, WeekRecord> }).weeks;

const plusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * 기록된 주차 중 **끊기지 않고 이어지는 마지막 구간**. 6월에 5주 구멍이 있어서
 * 전체를 "n주간"이라고 부르면 거짓이 된다 — 연속인 부분만 쓴다.
 */
export function consecutiveWeeks(): string[] {
  const all = Object.keys(WEEKS).sort();
  const run: string[] = [];
  for (let i = all.length - 1; i >= 0; i--) {
    if (run.length && plusDays(all[i], 7) !== run[0]) break;
    run.unshift(all[i]);
  }
  return run;
}

export const PROMO_WEEKS = consecutiveWeeks();
export const PROMO_WEEK_COUNT = PROMO_WEEKS.length;

/** 도시락에 못 쓰는 품목(주류·비식품 등)은 통계에서 뺀다. */
const usable = (p: Promotion) => p.lunchboxFit !== "excluded";

const itemsIn = (week: string): Array<Promotion & { store: StoreId }> =>
  Object.entries(WEEKS[week]?.stores ?? {}).flatMap(([store, sv]) =>
    (sv?.items ?? []).filter(usable).map((it) => ({ ...it, store: store as StoreId })),
  );

export type KeyStat = {
  key: string;
  /** 이 재료가 특가로 나온 주 수. */
  weeks: number;
  /** 그중 **정가가 같이 적혀 있어** 할인율을 계산할 수 있었던 주 수. */
  pricedWeeks: number;
  /** 주별 "그 주 최고 할인율" 의 중앙값. */
  medianPct: number;
  minPct: number;
  maxPct: number;
  /** 주별 최고 할인율. 특가가 없던 주는 null. */
  series: Array<number | null>;
  stores: StoreId[];
};

/**
 * 재료별 통계.
 *
 * ⚠️ 한 주에 같은 재료로 여러 상품이 뜨면 **그 주 최고 할인율 하나만** 센다.
 *    다 세면 상품 종류가 많은 재료(치즈)가 할인율까지 높아 보인다.
 *
 * ⚠️ New World 전단은 정가를 안 찍는 주가 있다. 그런 주는 "특가였다"에는 세지만
 *    할인율에는 안 들어간다 — 그래서 `pricedWeeks`를 따로 공개한다. 0을 절약액으로
 *    섞으면 중앙값이 조용히 내려간다.
 */
export function keyStats(): KeyStat[] {
  const byKey = new Map<string, Map<string, Array<Promotion & { store: StoreId }>>>();
  for (const week of PROMO_WEEKS) {
    for (const it of itemsIn(week)) {
      if (!byKey.has(it.matchKey)) byKey.set(it.matchKey, new Map());
      const wk = byKey.get(it.matchKey)!;
      wk.set(week, [...(wk.get(week) ?? []), it]);
    }
  }

  const out: KeyStat[] = [];
  for (const [key, wk] of byKey) {
    const series = PROMO_WEEKS.map((w) => {
      const priced = (wk.get(w) ?? []).filter((i) => (i.savingsPercent ?? 0) > 0);
      return priced.length ? Math.max(...priced.map((i) => i.savingsPercent)) : null;
    });
    const pcts = series.filter((v): v is number => v !== null);
    out.push({
      key,
      weeks: wk.size,
      pricedWeeks: pcts.length,
      medianPct: pcts.length ? median(pcts) : 0,
      minPct: pcts.length ? Math.min(...pcts) : 0,
      maxPct: pcts.length ? Math.max(...pcts) : 0,
      series,
      stores: [...new Set([...wk.values()].flat().map((i) => i.store))].sort(),
    });
  }
  return out.sort((a, b) => b.weeks - a.weeks || b.medianPct - a.medianPct);
}

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** 모든 주에 빠짐없이 특가였던 재료. */
export const everyWeekKeys = (): KeyStat[] =>
  keyStats().filter((s) => s.weeks === PROMO_WEEK_COUNT);

export const statFor = (key: string): KeyStat => {
  const s = keyStats().find((x) => x.key === key);
  if (!s) throw new Error(`특가 이력에 "${key}"가 없다 — 본문의 재료 이름을 고칠 것`);
  return s;
};

/** 한 번이라도 특가였던 재료 수. */
export const distinctKeyCount = () => keyStats().length;

/** 딱 한 주만 나온 재료 수 — "매주 나오는 것"의 반대편을 보여준다. */
export const onceOnlyCount = () => keyStats().filter((s) => s.weeks === 1).length;

const TITLE: Record<string, string> = {
  yoghurt: "Yoghurt", bread: "Bread", cheese: "Cheese", chicken: "Chicken",
  carrot: "Carrots", cracker: "Crackers", ham: "Ham", bacon: "Bacon",
  eggs: "Eggs", snack: "Snack packs", fruit: "Fruit", "fruit-bar": "Fruit bars",
  cereal: "Cereal", bagel: "Bagels", tortilla: "Tortillas", avocado: "Avocado",
  apple: "Apples",
};
export const label = (key: string) => TITLE[key] ?? key[0].toUpperCase() + key.slice(1);

/**
 * 상위 N개 재료 표.
 *
 * 🔴 "할인율을 잰 주"를 반드시 같이 낸다. carrot은 9주 특가인데 정가가 찍힌 주가
 *    1주뿐이라, 그 열이 없으면 「중앙 20% · 범위 20–20%」가 9주 측정치처럼 읽힌다.
 *    잰 주가 3주 미만이면 중앙값·범위를 아예 내지 않는다.
 */
const MIN_PRICED_WEEKS = 3;

export function frequencyTableMarkdown(n: number): string {
  return keyStats()
    .slice(0, n)
    .map((s) => {
      const enough = s.pricedWeeks >= MIN_PRICED_WEEKS;
      const pct = enough ? `${Math.round(s.medianPct)}%` : "too few to say";
      const range = enough ? `${s.minPct}–${s.maxPct}%` : "—";
      return `| ${label(s.key)} | ${s.weeks} of ${PROMO_WEEK_COUNT} | ${s.pricedWeeks} | ${pct} | ${range} |`;
    })
    .join("\n");
}

/** 한 재료의 주별 할인율을 문장으로. 특가가 없던 주는 "—". */
export function seriesLine(key: string): string {
  return statFor(key)
    .series.map((v) => (v === null ? "—" : `${v}%`))
    .join(" · ");
}

export const firstWeek = () => PROMO_WEEKS[0];
export const lastWeek = () => PROMO_WEEKS[PROMO_WEEKS.length - 1];

/** "6 July" 형태. 글 본문이 ISO 날짜를 그대로 쓰지 않게 한다. */
export function prettyDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${d.toLocaleString("en-NZ", { month: "long", timeZone: "UTC" })}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 계절 달력 가이드의 「전단에 몇 주 나왔나」 표 — 농산물만.
 *
 * 🔴 2026-09-28까지 이 표는 **손으로 적은 6주치**였고, 같은 기간 파일 데이터와도 맞지 않았다
 *    (당근 「6주 중 5주」 vs 파일 4주). 이제 연속 구간(PROMO_WEEKS)에서 센다.
 *    한 주에 여러 상품이 걸려도 그 주는 한 번만 센다 — 「몇 주에 걸쳐 나왔나」다.
 * ──────────────────────────────────────────────────────────────────────────── */

/** 상품명 → 농산물 이름. 주스·칩처럼 이름에 과일이 든 가공품은 category가 Produce가 아니라 안 걸린다. */
const PRODUCE: [string, RegExp][] = [
  ["Apples", /\bapple/i], ["Carrots", /carrot/i], ["Pears", /\bpear/i], ["Mandarins", /mandarin/i],
  ["Bananas", /banana/i], ["Avocados", /avocado/i], ["Potatoes", /potato/i], ["Oranges", /\borange/i],
  ["Tomatoes", /tomato/i], ["Broccoli", /broccoli/i], ["Celery", /celery/i], ["Lettuce", /lettuce|iceberg/i],
  ["Kiwifruit", /kiwifruit/i], ["Mushrooms", /mushroom/i], ["Capsicum", /capsicum/i], ["Onions", /onion/i],
  ["Blueberries", /blueberr/i], ["Cabbage", /cabbage/i], ["Grapes", /\bgrape/i], ["Strawberries", /strawberr/i],
  ["Kūmara", /k[uū]mara/i], ["Cucumber", /cucumber/i], ["Cauliflower", /cauliflower/i], ["Pumpkin", /pumpkin/i],
];

export function produceWeeks(): { name: string; weeks: number }[] {
  const count = new Map<string, number>();
  for (const w of PROMO_WEEKS) {
    const seen = new Set<string>();
    for (const store of Object.values(WEEKS[w].stores)) {
      for (const it of store?.items ?? []) {
        if (it.category !== "Produce") continue;
        for (const [name, re] of PRODUCE) if (re.test(it.name)) seen.add(name);
      }
    }
    for (const n of seen) count.set(n, (count.get(n) ?? 0) + 1);
  }
  return [...count.entries()]
    .map(([name, weeks]) => ({ name, weeks }))
    .sort((a, b) => b.weeks - a.weeks || a.name.localeCompare(b.name));
}

const lowerList = (xs: string[]) => {
  const l = xs.map((x) => x.toLowerCase());
  return l.length === 1 ? l[0] : `${l.slice(0, -1).join(", ")} and ${l[l.length - 1]}`;
};

/** 같은 주 수는 한 줄로 묶는다(원래 표 모양). */
export function produceWeeksTableMarkdown(): string {
  const rows: string[] = [];
  const byCount = new Map<number, string[]>();
  for (const r of produceWeeks()) byCount.set(r.weeks, [...(byCount.get(r.weeks) ?? []), r.name]);
  const top = Math.max(...byCount.keys());
  for (const [n, names] of [...byCount.entries()].sort((a, b) => b[0] - a[0])) {
    const label = names.length === 1 ? names[0] : `${names.join(", ")}`;
    const num = n === top ? `**${n}**` : `${n}`;
    const cell = names.length > 1 ? `${num} each` : num;
    rows.push(`| ${label} | ${cell} |`);
  }
  return [`| Produce | Weeks featured (of ${PROMO_WEEK_COUNT}) |`, `|---|---|`, ...rows].join("\n");
}

/** 「사과는 13주 중 11주, 당근·배는 10주」 — 상위 두 단계. */
export function produceTopSentence(): string {
  const rows = produceWeeks();
  const counts = [...new Set(rows.map((r) => r.weeks))];
  const tier = (n: number) => rows.filter((r) => r.weeks === n).map((r) => r.name);
  const [a, b] = counts;
  const first = `${lowerList(tier(a)).replace(/^./, (c) => c.toUpperCase())} ${tier(a).length === 1 ? "was" : "were"} on special in ${a} of the ${PROMO_WEEK_COUNT} weeks`;
  return b === undefined ? `${first}.` : `${first}, ${lowerList(tier(b))} in ${b}.`;
}

/** 표 맨 아래 — 한두 주만 나온 것. */
export function produceRareList(): string {
  return lowerList(produceWeeks().filter((r) => r.weeks <= 2).map((r) => r.name));
}

/* ────────────────────────────────────────────────────────────────────────────
 * 「할인이 큰 것」과 「싼 것」은 다르다 — 두 번째 글이 쓰는 수치.
 * ──────────────────────────────────────────────────────────────────────────── */

import menuDataJson from "@/data/menuData.json";
import priceCacheJson from "@/data/price_cache.json";
import { menuSaleSavings } from "@/lib/planGenerator";
import { getActivePromotions } from "@/lib/promotions";
import { PORTION_FACTORS, DEFAULT_PORTION } from "@/lib/planConfig";

type MenuRow = { name: string; ingredients: string[] };
const MENUS = (menuDataJson as unknown as { MENU_DATA: { en: MenuRow[] } }).MENU_DATA.en;
const CACHE = priceCacheJson as Record<string, { data?: { price?: number } }>;

// 북섬 전단만 센다(섬 생략 = north). 남섬 전단은 몇 주 쌓인 뒤 따로 판단한다(2026-10-27).
const ACTIVE = () => getActivePromotions(["woolworths", "newworld"]);

/** 캐시에 값이 있는 재료만 더한 1인분 원가. 없는 재료는 0 — 순위용이다. */
function serveCost(ingredients: string[]): number {
  return ingredients.reduce((t, ing) => {
    const p = CACHE[ing]?.data?.price;
    return typeof p === "number" && p > 0
      ? t + p * (PORTION_FACTORS[ing] ?? DEFAULT_PORTION)
      : t;
  }, 0);
}

export type MenuRowStat = { name: string; cost: number; savings: number; net: number };

export function menuRows(): MenuRowStat[] {
  const promos = ACTIVE();
  return MENUS.map((m) => {
    const cost = serveCost(m.ingredients);
    const savings = menuSaleSavings(m.ingredients, promos);
    return { name: m.name, cost, savings, net: cost - savings };
  }).filter((r) => r.cost > 0);
}

/** 절약액과 원가의 피어슨 상관. 이 글의 논지 전체가 이 한 숫자다. */
export function savingsCostCorrelation(): number {
  const rows = menuRows();
  const xs = rows.map((r) => r.savings);
  const ys = rows.map((r) => r.cost);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

const dollars = (n: number) => `$${n.toFixed(2)}`;

/** 절약액이 큰 순 상위 N개 — 「많이 아끼는데 여전히 비싸다」를 보여준다. */
export function biggestDiscountsMarkdown(n: number): string {
  return [...menuRows()]
    .sort((a, b) => b.savings - a.savings)
    .slice(0, n)
    .map((r) => `| ${r.name} | ${dollars(r.savings)} | ${dollars(r.cost)} | **${dollars(r.net)}** |`)
    .join("\n");
}

/** 할인 후가 싼 순 상위 N개 — 위 표와 겹치는 이름이 없다는 게 논지다. */
export function cheapestAfterSalesMarkdown(n: number): string {
  return [...menuRows()]
    .sort((a, b) => a.net - b.net)
    .slice(0, n)
    .map((r) => `| ${r.name} | ${dollars(r.savings)} | ${dollars(r.cost)} | **${dollars(r.net)}** |`)
    .join("\n");
}

/** 두 표에 같이 나오는 메뉴 수. 0이라야 본문의 "한 곳도 겹치지 않는다"가 참이다. */
export function overlapCount(n: number): number {
  const rows = menuRows();
  const big = new Set([...rows].sort((a, b) => b.savings - a.savings).slice(0, n).map((r) => r.name));
  return [...rows].sort((a, b) => a.net - b.net).slice(0, n).filter((r) => big.has(r.name)).length;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** 절약액 상위 N개의 평균 원가 / 전체 평균 원가. */
export function biggestDiscountAvgCost(n: number): number {
  return mean([...menuRows()].sort((a, b) => b.savings - a.savings).slice(0, n).map((r) => r.cost));
}
export function allMenusAvgCost(): number {
  return mean(menuRows().map((r) => r.cost));
}
export const menuRowCount = () => menuRows().length;

/** "Yoghurt, bread and cheese" — 매주 특가였던 재료를 문장으로. */
export function everyWeekSentence(): string {
  const names = everyWeekKeys().map((s) => label(s.key).toLowerCase());
  if (names.length <= 1) return names[0] ?? "nothing";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** 매주 특가였던 재료 수. 본문의 "three items"를 손으로 적지 않으려고 있다. */
export const everyWeekCount = () => everyWeekKeys().length;

/** 그 재료를 할인율까지 잰 주가 몇 주인지 — 신뢰도를 본문이 같이 밝히게 한다. */
export const pricedWeeksFor = (key: string) => statFor(key).pricedWeeks;
export const medianPctFor = (key: string) => Math.round(statFor(key).medianPct);
export const minPctFor = (key: string) => statFor(key).minPct;
export const maxPctFor = (key: string) => statFor(key).maxPct;

/**
 * New World 특가 중 회원 전용(club) 비율 — **주차별로** 낸다.
 * 이 글은 이 값을 「쓸 수 없는 수치」의 예로 인용하므로, 예시조차 손으로 적지 않는다.
 */
export function clubShareOverall(): number {
  const all = PROMO_WEEKS.flatMap((w) =>
    (WEEKS[w]?.stores?.newworld?.items ?? []).filter(usable),
  );
  if (!all.length) return 0;
  return Math.round((all.filter((i) => i.promoType === "club").length / all.length) * 100);
}

export function clubShareByWeek(): number[] {
  return PROMO_WEEKS.map((w) => {
    const items = (WEEKS[w]?.stores?.newworld?.items ?? []).filter(usable);
    if (!items.length) return -1;
    return Math.round((items.filter((i) => i.promoType === "club").length / items.length) * 100);
  }).filter((v) => v >= 0);
}

/** 특가 건수의 주별 추이 — 역시 「쓸 수 없는 수치」의 예로만 쓴다. */
export function promoCountByWeek(): number[] {
  return PROMO_WEEKS.map(
    (w) => Object.values(WEEKS[w]?.stores ?? {}).reduce((t, sv) => t + (sv?.items ?? []).filter(usable).length, 0),
  );
}

/** 절약액 1위 메뉴의 절약액 문구 — 본문이 표 문자열을 파싱하지 않게 한다. */
export function topDiscountSavingsLabel(): string {
  const top = [...menuRows()].sort((a, b) => b.savings - a.savings)[0];
  return `$${top.savings.toFixed(2)}`;
}
export function cheapestNetLabel(): string {
  const c = [...menuRows()].sort((a, b) => a.net - b.net)[0];
  return `$${c.cost.toFixed(2)}`;
}

/** 재료별 · 매장별로 몇 주에 특가였나. 한 매장만 다니는 사람에게 쓸모 있는 갈래다. */
export function storeSplit(key: string): { woolworths: number; newworld: number } {
  const count = (store: StoreId) =>
    PROMO_WEEKS.filter((w) =>
      itemsIn(w).some((i) => i.matchKey === key && i.store === store),
    ).length;
  return { woolworths: count("woolworths"), newworld: count("newworld") };
}

/** 두 매장 사이 차이가 큰 순으로 상위 N개 표. */
export function storeSplitMarkdown(n: number): string {
  return keyStats()
    .filter((s) => s.weeks >= 5)
    .map((s) => ({ ...s, split: storeSplit(s.key) }))
    .sort((a, b) => Math.abs(b.split.woolworths - b.split.newworld) - Math.abs(a.split.woolworths - a.split.newworld))
    .slice(0, n)
    .map((s) => `| ${label(s.key)} | ${s.split.woolworths} of ${PROMO_WEEK_COUNT} | ${s.split.newworld} of ${PROMO_WEEK_COUNT} |`)
    .join("\n");
}

/* ────────────────────────────────────────────────────────────────
 * 상품 회전 (2026-09-10 외부 감사 4번)
 *
 * 🔴 「On special」은 **그 재료의 상품이 하나라도** 할인된 주를 센다. 정의는
 *    글에 정확히 적혀 있었는데, 결론이 그 정의를 넘어갔다 —
 *    "waiting for cheese to come down is waiting for something that has not
 *    been at full price in over two months"는 **같은 치즈가** 계속 할인됐다는
 *    뜻으로 읽힌다.
 *
 *    재 보니 그게 아니었다. 치즈는 연속 구간 동안 서로 다른 상품 여러 개가
 *    돌아가며 걸렸고, **한 상품이 걸린 최대 주 수는 두 주**다.
 *
 *    이건 논지를 약하게 만들지 않는다. 오히려 부모에게 더 쓸모 있는 결론이다 —
 *    「치즈는 늘 할인 중」이 아니라 「브랜드를 안 가리면 늘 할인된 치즈가 있다」.
 *    좋아하는 브랜드를 기다리는 전략은 여전히 안 통한다는 뜻이기도 하다.
 * ──────────────────────────────────────────────────────────────── */

export type Churn = {
  key: string;
  /** 연속 구간에서 이 재료로 걸린 서로 다른 상품 수. */
  products: number;
  /** 한 상품이 걸린 최대 주 수. */
  maxWeeks: number;
  /** 그 상품 이름. */
  topProduct: string;
};

export function churnFor(key: string): Churn {
  const byProduct = new Map<string, Set<string>>();
  for (const w of PROMO_WEEKS) {
    for (const it of itemsIn(w)) {
      if (it.matchKey !== key) continue;
      if (!byProduct.has(it.name)) byProduct.set(it.name, new Set());
      byProduct.get(it.name)!.add(w);
    }
  }
  let topProduct = "";
  let maxWeeks = 0;
  for (const [name, weeks] of byProduct) {
    if (weeks.size > maxWeeks) { maxWeeks = weeks.size; topProduct = name; }
  }
  return { key, products: byProduct.size, maxWeeks, topProduct };
}

/** 매주 특가였던 재료들의 상품 회전 표. */
export function churnTableMarkdown(): string {
  return everyWeekKeys()
    .map((s) => churnFor(s.key))
    .sort((a, b) => b.products - a.products)
    .map((c) => `| ${label(c.key)} | ${c.products} | ${c.maxWeeks} | ${c.topProduct} |`)
    .join("\n");
}

/** 매주 특가였던 재료 중 **한 상품이 가장 오래 버틴** 주 수. */
export const longestSingleProductRun = () =>
  Math.max(...everyWeekKeys().map((s) => churnFor(s.key).maxWeeks));

/**
 * 매주 특가였던 재료 중 **가장 많은 상품이 돌아간 것** — 본문의 예시 재료.
 * 🔴 09-28 — 본문이 "Cheese ran through…"·"a rotation that came round twice"를
 *    고정된 목록(빵·치즈·요거트)을 전제로 손으로 적고 있었다. 목록이 바뀌면 거짓이 된다.
 */
export function mostRotatedEveryWeek(): { key: string; name: string; products: number; maxWeeks: number } | null {
  const rows = everyWeekKeys().map((s) => churnFor(s.key)).sort((a, b) => b.products - a.products);
  const top = rows[0];
  return top ? { key: top.key, name: label(top.key).toLowerCase(), products: top.products, maxWeeks: top.maxWeeks } : null;
}
