/**
 * Weekly supermarket promotions — loader + ingredient matcher.
 *
 * 매주 마트 mailer 데이터를 data/promotions.json 에 입력하면,
 * 이 모듈이 메뉴의 ingredient 와 매칭하여 도시락 비용을 계산.
 *
 * 설계 문서: docs/promotions-feature-plan.md
 */

import promotionsData from "@/data/promotions.json";
import type {
  PromotionsFile,
  WeeklyPromotions,
  Promotion,
  StoreId,
  SaleMatch,
} from "@/data/promotions.types";
import { PORTION_BASIS } from "@/lib/planConfig";
import priceCacheJson from "@/data/price_cache.json";
import { auToday } from "@/lib/auWeek.mjs";

const PRICES = priceCacheJson as Record<string, { data?: { price?: number } }>;

// 정적 import — 매주 갱신 시 rebuild 트리거 (admin 페이지에서 commit 시 자동 redeploy)
const promotions = promotionsData as PromotionsFile;

// 날짜는 시드니 벽시계로 본다 — 호주 특가 기간이 시드니 날짜다. 이유는 `lib/auWeek.mjs` 머리 주석.
export { auToday };

export type PromotionsStatus =
  | { state: "active"; week: WeeklyPromotions; validUntil: string }
  | { state: "expired"; validUntil: string }
  | { state: "upcoming"; validFrom: string }
  | { state: "missing" };

/**
 * currentWeek 가 오늘 유효한지까지 판정한다.
 *
 * 🔴 2026-08-17에 이게 없어서 문제가 됐다. getCurrentWeekPromotions 는 currentWeek 를
 * 그냥 읽었고 validUntil 을 아무도 보지 않았다. 특가가 opt-in 이라 피해가 갇혀 있었을 뿐,
 * 기본값을 켜는 순간 모든 방문자가 **지난주 특가를 이번 주 것으로** 받게 된다.
 * 가격 정확성이 이 사이트의 존재 이유라 조용히 틀리면 안 된다.
 */
export function getPromotionsStatus(now: Date = new Date()): PromotionsStatus {
  const week = promotions.weeks[promotions.currentWeek];
  if (!week) return { state: "missing" };
  const today = auToday(now);
  if (today > week.validUntil) return { state: "expired", validUntil: week.validUntil };
  if (today < week.validFrom) return { state: "upcoming", validFrom: week.validFrom };
  return { state: "active", week, validUntil: week.validUntil };
}

/**
 * 현재 주의 promotions 데이터 — **유효기간이 지났으면 null**.
 */
export function getCurrentWeekPromotions(now: Date = new Date()): WeeklyPromotions | null {
  const s = getPromotionsStatus(now);
  return s.state === "active" ? s.week : null;
}

/** 이번 주 특가가 실린 마트 — 플래너 체크박스는 이것만 보인다(Coles는 전단을 붙여 넣은 주에만 있다). */
export function saleStoresThisWeek(now: Date = new Date()): StoreId[] {
  const week = getCurrentWeekPromotions(now);
  return (["woolworths", "coles"] as StoreId[]).filter((s) => (week?.stores[s]?.items.length ?? 0) > 0);
}

/**
 * 선택한 마트(들)의 lunchbox/snack-only 적합 promotions 만 반환.
 * "excluded" 항목은 자동으로 빠짐.
 */
export function getActivePromotions(
  stores: StoreId[] = ["woolworths", "coles"],
  now: Date = new Date(),
): Array<Promotion & { store: StoreId }> {
  const week = getCurrentWeekPromotions(now);
  if (!week) return [];
  const result: Array<Promotion & { store: StoreId }> = [];
  for (const store of stores) {
    const sp = week.stores[store];
    if (!sp) continue;
    for (const p of sp.items) {
      if (p.lunchboxFit === "lunchbox" || p.lunchboxFit === "snack-only") {
        result.push({ ...p, store });
      }
    }
  }
  return result;
}

/**
 * 한 식재료(ingredient) 이름과 promotions 리스트를 매칭.
 * 우선순위:
 *   1) matchKey 정확 일치 (case-insensitive)
 *   2) matchKey ⊂ ingredient (예: "bacon" ⊂ "Streaky Bacon")
 *   3) ingredient ⊂ matchKey
 *
 * 동일 ingredient 에 여러 promo 매칭 시 가장 큰 절약(savings) 항목 반환.
 */
/** 낱말 목록. "Ham/Bacon" 처럼 슬래시로 이어진 것도 쪼갠다. */
const tokens = (s: string) => s.toLowerCase().match(/[a-z]+/g) ?? [];
/** 단순 복수형만 맞춘다 — crackers→cracker, eggs→egg */
const singular = (w: string) => (w.endsWith("ies") ? w.slice(0, -3) + "y" : w.replace(/e?s$/, ""));
/**
 * 영어 식품명은 **뒤가 머리명사**다. "Cheese Sauce"는 소스고 "Cream Cheese"는 치즈다.
 * 이 한 가지만으로 엉뚱한 매칭이 대부분 걸러진다.
 */
const headNoun = (s: string) => {
  const t = tokens(s);
  return t.length ? singular(t[t.length - 1]) : "";
};

/**
 * 한 식재료(ingredient) 이름과 promotions 리스트를 매칭.
 *
 * 🔴 2026-08-24: 전에는 **양방향 부분일치**였고, 그래서 이런 것들이 붙었다:
 *   - 땅콩버터 특가 → 재료 `Butter`      ("butter" ⊂ "peanut butter")
 *   - 치즈 특가     → 재료 `Cheese Sauce` ("cheese" ⊂ "Cheese Sauce")
 *   - 쌀 특가       → 재료 `Rice Paper` · `Rice Bubbles` · `Rice Noodles`
 *   - 빵 특가       → 재료 `Breadcrumbs`
 * 화면에 "🔖 Butter"라고 뜨고 **절약액에도 더해지고 있었다.** 가격 정확성이
 * 이 사이트의 존재 이유라 조용히 틀리면 안 된다.
 *
 * 규칙:
 *   1) matchKey == ingredient (정확 일치)
 *   2) alsoMatches 에 이름이 적혀 있으면 — 사람이 명시한 것만
 *   3) matchKey ⊂ ingredient **이면서 머리명사가 같을 때** (bacon ⊂ Streaky Bacon)
 * 역방향(ingredient ⊂ matchKey)은 더 이상 자동으로 붙지 않는다. 필요하면
 * alsoMatches 에 적는다 — canned tuna → `Tuna` 처럼 맞는 경우가 있기 때문이다.
 */
/**
 * 전단 상품명에서 팩 크기를 읽는다. "Turkish Loaf 400g" → 400g · "Alpro ... 1L" → 1000ml.
 *
 * 🔴 범위 표기("375-500g" · "700g/Tasty 500g")는 **읽지 않는다**(null). 어느 쪽인지
 *    모르는 채 하나를 고르면 그게 곧 추측이고, 추측한 크기로 가격을 만들면
 *    화면에 아무 데도 없는 값이 뜬다. 모르면 특가를 안 붙이는 편이 정확하다.
 */
export function promoPackSize(name: string): { n: number; unit: "g" | "ml" | "ea" } | null {
  // "375-500g" · "185-200g" — 단위 없는 숫자로 시작하는 범위. 아래 토막 세기로는
  // "500g" 하나만 잡혀서 통과해 버린다(2026-09-09 실측).
  if (/\d+\s*[-–]\s*\d+(?:\.\d+)?\s*(kg|g|ml|l|pack|pk)\b/i.test(name)) return null;
  const weights = [...name.matchAll(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/gi)];
  const packs = [...name.matchAll(/(\d+)\s*(?:pack|pk)\b/gi)];
  // 크기 토막이 둘 이상이면 어느 상품의 것인지 알 수 없다 —
  // "185-200g" · "700g/Tasty 500g" · "375-500g" 이 전부 여기서 걸린다.
  if (weights.length + packs.length !== 1) return null;
  // "A or B 1L"처럼 상품이 둘인데 크기가 하나면, 그 크기가 둘 다에 해당하는지 알 수 없다.
  if (/\bor\b/i.test(name)) return null;
  if (weights.length === 1) {
    const n = Number(weights[0][1]);
    switch (weights[0][2].toLowerCase()) {
      case "kg": return { n: n * 1000, unit: "g" };
      case "l": return { n: n * 1000, unit: "ml" };
      case "g": return { n, unit: "g" };
      default: return { n, unit: "ml" };
    }
  }
  return { n: Number(packs[0][1]), unit: "ea" };
}

export function matchIngredient(
  ingredient: string,
  candidates: Array<Promotion & { store: StoreId }>,
): (Promotion & { store: StoreId }) | null {
  const lower = ingredient.toLowerCase().trim();
  if (!lower || candidates.length === 0) return null;
  const head = headNoun(lower);

  // 🔴 글루텐프리 재료에 일반 상품 특가를 붙이면 안 된다. 밀 크래커 특가가
  //    `GF Crackers` 줄에 뜨면 셀리악 가정에 **위험한 오독**을 만든다.
  const needsGlutenFree = /\bgf\b|gluten[\s-]?free/i.test(ingredient);
  const isGlutenFree = (p: Promotion) => /gluten[\s-]?free|free from gluten/i.test(p.name);
  const allowed = needsGlutenFree ? candidates.filter(isGlutenFree) : candidates;

  const exact = allowed.filter(
    (p) =>
      p.matchKey.toLowerCase() === lower ||
      (p.alsoMatches ?? []).some((n) => n.toLowerCase().trim() === lower),
  );
  const partial = allowed.filter((p) => {
    const k = p.matchKey.toLowerCase();
    if (k === lower) return false;
    return lower.includes(k) && headNoun(k) === head;
  });

  const pool = exact.length > 0 ? exact : partial;
  if (pool.length === 0) return null;

  // 가장 큰 savings 우선
  return pool.reduce((best, cur) => (cur.savings > best.savings ? cur : best));
}

/**
 * **가격을 만들어도 되는** 매칭만 돌려준다. `matchIngredient`보다 훨씬 좁다.
 *
 * 🔴 2026-09-09 외부 감사에서 드러난 것 — 지금까지는 전단 상품의 **할인 비율**을
 *    우리 기준가에 곱하고 있었다(`basePrice * salePrice / regularPrice`).
 *    그 결과 화면에 **아무 데도 없는 가격**이 떴다:
 *      · Milk $3.75 → $2.58  (근거: Alpro **식물성** 음료 1L $5.79→$3.99)
 *      · Bread $4.40 → $3.38 (근거: Turkish Loaf **400g** $6.50→$5.00)
 *      · Rice Crackers $2.25 → $1.12 (근거: Griffin's **Toffee Pops**)
 *    180개 재료 중 32개에 이런 값이 붙어 있었다.
 *
 * 🔴 더 깊은 문제 — 상품과 용량이 **실제로 맞는** 세 건(John West 참치 95g ·
 *    Beehive 햄 200g · Fresh'n Fruity 요거트 1kg)을 재보니 **진짜 절약은 전부 $0**이었다.
 *    전단의 "정상가"는 그 브랜드의 정상가일 뿐이고, 우리가 추적하는 값은 이미 그
 *    특가와 같거나 더 싼 상시가였다. 비율 전이는 **없는 절약을 26~36% 만들어낸다.**
 *
 * 그래서 세 가지를 전부 만족할 때만 가격에 쓴다:
 *   1. 전단이 `pricesIngredients`에 **이 재료를 직접 적었을 것** — `matchKey`는
 *      분류라 "milk" 하나에 유제품과 귀리음료가 같이 들어 있었다
 *   2. 전단 상품의 팩 크기를 **읽을 수 있고**, 우리가 추적하는 팩과 **같을 것**
 *   3. 전단 특가가 우리 추적가보다 **실제로 쌀 것**
 */
export function pricedMatchFor(
  ingredient: string,
  ourPack: string | undefined,
  basePrice: number,
  candidates: Array<Promotion & { store: StoreId }>,
): (Promotion & { store: StoreId }) | null {
  if (!ourPack || !(basePrice > 0)) return null;
  const ours = normalisePack(ourPack);
  if (!ours) return null;

  // 🔴 사람이 이 재료를 직접 적은 특가만 후보다. `matchKey`(분류)로는 안 된다 —
  //    "milk" 하나에 유제품과 귀리음료가 같이 있었고, 분류로는 구별이 원리상 안 된다.
  const declared = candidates.filter((p) =>
    (p.pricesIngredients ?? []).some((n) => n.trim() === ingredient.trim()),
  );
  const usable = declared.filter((p) => {
    // 🔴 실제로 **할인 중**이어야 한다. 전단에는 정가와 특가가 같게 들어오는 항목이
    //    있는데(Kiwi New World, 할인 0), 그게 우리 추적가보다 싸다고 「이번 주 특가」로 찍으면
    //    할인이 아니라 **체인 간 가격차**를 특가라고 말하는 것이다.
    //    2026-09-09에 후보 도구를 만들다 드러났다.
    if (!(p.regularPrice > 0) || !(p.salePrice < p.regularPrice)) return false;
    if (!(p.salePrice > 0) || p.salePrice >= basePrice) return false;
    const theirs = promoPackSize(p.name);
    return theirs !== null && theirs.unit === ours.unit && theirs.n === ours.n;
  });
  if (usable.length === 0) return null;
  // 같은 조건이 여럿이면 가장 싼 것
  return usable.reduce((best, cur) => (cur.salePrice < best.salePrice ? cur : best));
}

/** `PORTION_BASIS`의 팩 표기를 `promoPackSize`와 같은 모양으로 바꾼다. */
function normalisePack(pack: string): { n: number; unit: "g" | "ml" | "ea" } | null {
  const v = pack.trim().toLowerCase();
  if (/^per\s*kg$/.test(v)) return { n: 1000, unit: "g" };
  if (/^(each|ea|1ea)$/.test(v)) return null;
  const count = /^(\d+)\s*pack$/.exec(v);
  if (count) return { n: Number(count[1]), unit: "ea" };
  const m = /^(\d+(?:\.\d+)?)\s*(kg|g|ml|l)$/.exec(v);
  if (!m) return null;
  const n = Number(m[1]);
  switch (m[2]) {
    case "kg": return { n: n * 1000, unit: "g" };
    case "l": return { n: n * 1000, unit: "ml" };
    case "g": return { n, unit: "g" };
    default: return { n, unit: "ml" };
  }
}

/**
 * 메뉴의 ingredient list 전체에 대해 promotion 매칭.
 * 결과: SaleMatch[] (각 매칭 ingredient 별 정보)
 */
export function matchMenuIngredients(
  ingredients: string[],
  candidates: Array<Promotion & { store: StoreId }>,
): SaleMatch[] {
  const matches: SaleMatch[] = [];
  const seenUrls = new Set<string>();
  for (const ing of ingredients) {
    const m = matchIngredient(ing, candidates);
    if (!m) continue;
    // 같은 promo 가 다른 ingredient 에 중복 매칭 방지
    const key = `${m.store}:${m.matchKey}`;
    if (seenUrls.has(key)) continue;
    seenUrls.add(key);
    matches.push({
      ingredient: ing,
      promotion: m,
      store: m.store,
    });
  }
  return matches;
}

/**
 * 메뉴 재료 전체에 대해 **가격에 써도 되는** 매칭만. `matchMenuIngredients`의 엄격판이다.
 * 우리 팩 크기·추적가는 `PORTION_BASIS`와 가격 캐시에서 가져온다.
 */
export function pricedMenuMatches(
  ingredients: string[],
  candidates: Array<Promotion & { store: StoreId }>,
): SaleMatch[] {
  const matches: SaleMatch[] = [];
  const seen = new Set<string>();
  for (const ing of ingredients) {
    const base = PRICES[ing]?.data?.price;
    const m = pricedMatchFor(ing, PORTION_BASIS[ing]?.pack, typeof base === "number" ? base : 0, candidates);
    if (!m) continue;
    // 🔴 2026-10-05: 여기 키가 `store:matchKey`(분류)였다. 같은 날 Soy Sauce·Teriyaki Sauce가
    //    둘 다 특가(둘 다 matchKey "sauce")면 둘째가 할인을 잃었고, 장보기 목록은 다른 날의
    //    매칭을 써서 주간 합계와 갈렸다. 가격 특가는 재료마다 사람이 적은 것이라 재료로 거른다.
    if (seen.has(ing)) continue;
    seen.add(ing);
    matches.push({ ingredient: ing, promotion: m, store: m.store });
  }
  return matches;
}

/**
 * 매칭된 sale 들의 총 절약 금액 (AUD).
 */
export function calculateSavings(matches: SaleMatch[]): number {
  return matches.reduce((sum, m) => sum + m.promotion.savings, 0);
}

/**
 * Sale 가중치 계산 — planGenerator 의 weighted random selection 에서 사용.
 * 메뉴의 ingredient 중 promotion 매칭 비율에 비례.
 *
 * @returns 1.0 (no match) ~ 1.5 (all ingredients on sale)
 */
export function calculateSaleBonus(
  ingredients: string[],
  candidates: Array<Promotion & { store: StoreId }>,
): number {
  if (ingredients.length === 0 || candidates.length === 0) return 1.0;
  const matches = matchMenuIngredients(ingredients, candidates);
  const ratio = matches.length / ingredients.length;
  // 0% match → 1.0x, 100% match → 1.5x
  return 1.0 + ratio * 0.5;
}
