import menuData from "@/data/menuData.json";
import PRICES from "@/data/price_cache.json";
import { PORTION_FACTORS, DEFAULT_PORTION } from "./planConfig";
import { dietTagsFor, dietViolations } from "./ingredientDiet";
import { declares } from "./allergenLabels";
import type { MenuItem, SnackItem, SnackData, AllergyType } from "./types";

/**
 * 식이 조건별로 **메뉴가 몇 개 남고 얼마가 드는지**.
 *
 * 🔴 왜 있나 (2026-09-10) — Search Console을 열어 보니 구글이 살아 있는 글 다섯 편을
 *    **찾아만 놓고 크롤조차 하지 않고** 있었다: dairy-free · egg-free · gluten-free ·
 *    no-cook · thermos. 다섯 편 다 어디에나 있는 일반 조언이다.
 *
 *    이 사이트는 그 조건들에 대해 **아무도 못 하는 말**을 할 수 있다 — 94개 메뉴를
 *    실제 가격으로 들고 있으므로 「그 조건을 걸면 몇 개가 남고 얼마가 되는가」를
 *    잴 수 있다. 그 수치를 여기서 생성한다.
 *
 * 🔴 **문장까지 생성한다.** 유제품 프리 중앙값이 $2.23, 나머지가 $2.39다 —
 *    16센트 차이를 「더 싸다」로 쓰면 다음 수집에서 뒤집힌다.
 *    [[repeated-traps]]의 「빠듯한 주장은 쓰지 말 것」이 정확히 이 자리다.
 *    그래서 차이가 작으면 문장이 스스로 「비슷하다」고 말한다.
 */

const M = (menuData as unknown as { MENU_DATA: { en: MenuItem[] } }).MENU_DATA.en;
const SN = (menuData as unknown as { SNACK_DATA: SnackData }).SNACK_DATA;
const P = PRICES as Record<string, { data?: { price?: number } }>;

/** 플래너가 실제로 뽑는 간식 풀 — Sweet Treat 은 생성기가 쓰지 않는다. */
const SNACK_POOL: SnackItem[] = [
  ...SN["Fruit & Veg"], ...SN["Protein & Dairy"], ...SN["Savoury Crunch"],
];

const serveCost = (m: MenuItem) =>
  m.ingredients.reduce(
    (t, i) => t + (P[i]?.data?.price ?? 0) * (PORTION_FACTORS[i] ?? DEFAULT_PORTION), 0);

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export type DietKey =
  | "dairy-free" | "egg-free" | "gluten-free" | "nut-free" | "sesame-free" | "vegetarian"
  | "no-cook" | "make-ahead" | "cook-fresh" | "thermos";

const TEST: Record<DietKey, (m: MenuItem) => boolean> = {
  "dairy-free": (m) => m.is_dairy_free,
  "egg-free": (m) => m.is_egg_free,
  "gluten-free": (m) => m.is_gluten_free,
  "nut-free": (m) => m.is_nut_free,
  // 참깨는 손 플래그가 없다 — 생성기(`filterMenus`)와 같은 재료 라벨 판정
  "sesame-free": (m) => dietViolations(m.ingredients, ["Sesame Allergy"]).length === 0,
  vegetarian: (m) => m.is_vegetarian,
  "no-cook": (m) => m.prep_style === "no-cook",
  "make-ahead": (m) => m.prep_style === "make-ahead",
  "cook-fresh": (m) => m.prep_style === "cook-fresh",
  thermos: (m) => !!m.is_thermos,
};

export function dietGroup(key: DietKey) {
  const yes = M.filter(TEST[key]);
  const no = M.filter((m) => !TEST[key](m));
  const inMed = median(yes.map(serveCost));
  const outMed = median(no.map(serveCost));
  return {
    count: yes.length,
    total: M.length,
    inMedian: inMed,
    outMedian: outMed,
    pct: outMed > 0 ? ((inMed - outMed) / outMed) * 100 : 0,
  };
}

export const menuTotal = () => M.length;

/**
 * 「그 조건 메뉴가 나머지보다 싼가/비싼가」를 **말로** 낸다.
 *
 * 🔴 8% 미만이면 「비슷하다」고 말한다. 유제품 프리는 지금 −6.7%인데,
 *    그걸 「더 싸다」로 쓰면 한 상품 값이 움직이는 순간 거짓이 된다.
 */
export function clauseForPct(pct: number): string {
  const n = Math.round(Math.abs(pct));
  if (Math.abs(pct) < 8) return "costs about the same as the rest of the menu set";
  return pct < 0
    ? `costs about ${n}% less than the rest of the menu set`
    : `costs about ${n}% more than the rest of the menu set`;
}

export function costClause(key: DietKey): string {
  return clauseForPct(dietGroup(key).pct);
}

const money = (n: number) => `$${n.toFixed(2)}`;
export const dietMoney = (key: DietKey) => {
  const g = dietGroup(key);
  return { inMedian: money(g.inMedian), outMedian: money(g.outMedian) };
};

/* ── 간식 ── */

const TAG: Partial<Record<AllergyType, "milk" | "egg" | "gluten" | "nuts" | "sesame">> = {
  "Dairy Allergy": "milk", "Egg Allergy": "egg",
  "Gluten Allergy": "gluten", "Nut Allergy": "nuts", "Sesame Allergy": "sesame",
};

/** 그 조건에서 남는 간식과 빠지는 간식. 화면·글이 같은 근거를 쓴다. */
export function snackPool(allergy: AllergyType) {
  const tag = TAG[allergy];
  const dropped: string[] = [];
  const kept: string[] = [];
  for (const s of SNACK_POOL) {
    const hit = tag && (s.ingredients ?? []).some((i) => dietTagsFor(i)?.has(tag));
    (hit ? dropped : kept).push(s.name);
  }
  return { kept: kept.length, total: SNACK_POOL.length, dropped };
}

export const droppedList = (allergy: AllergyType) => {
  const d = snackPool(allergy).dropped;
  if (d.length === 0) return "none";
  if (d.length === 1) return d[0];
  return `${d.slice(0, -1).join(", ")} and ${d[d.length - 1]}`;
};

/** 라벨이 그 알레르겐을 **선언한** 추적 상품 수. */
export const declaredProducts = (a: "nuts" | "milk" | "egg" | "gluten" | "sesame") =>
  Object.keys(P).filter((k) => declares(k, a)).length;
