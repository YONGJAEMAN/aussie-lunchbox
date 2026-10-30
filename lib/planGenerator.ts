import {
  MenuItem, SnackItem, SnackData, PriceInfo, PlanItem,
  AllergyType, GeneratePlanResponse, PrepStyle,
} from "./types";
import { PORTION_FACTORS, DEFAULT_PORTION, portionFor } from "./planConfig";
import { bandFactor, DEFAULT_PORTION_BAND, portionsOf, type PortionBand, type Portions } from "./portionBands";
import { estimateMenuCalories, estimateSnackCalories } from "./nutritionCalc";
import { getActivePromotions, pricedMenuMatches } from "./promotions";
import { snackAllowed, dietViolations, dayMayContain, dietTagsFor } from "./ingredientDiet";
import { kindyOn, menuExclusion, snackExclusion, dayKindyPrep } from "./chokingRisk";
import type { StoreId, SaleMatch, Promotion } from "@/data/promotions.types";
import { ALL_LUNCH_DAYS, type WeekDayNames, type SharedPlan } from "./planShare";
import priceCache from "../data/price_cache.json";

/**
 * 🔴 이 함수는 **메인 메뉴만** 거른다. 간식은 `lib/ingredientDiet.ts`가 거른다 —
 *    근거가 다르기 때문이다(메뉴는 손으로 적은 플래그, 간식은 상품 라벨).
 *    2026-09-10까지 간식은 **아무것도 안 거치고** 있었다. 한 도시락 안에서
 *    절반만 검사하면 나머지 절반으로 새어 나온다.
 */
function filterMenus(
  menus: MenuItem[],
  allergies: AllergyType[],
  excluded: string[],
  prepStyles: PrepStyle[] = [],
  thermosOnly = false,
): MenuItem[] {
  return menus.filter((menu) => {
    if (prepStyles.length && (!menu.prep_style || !prepStyles.includes(menu.prep_style))) return false;
    if (thermosOnly && !menu.is_thermos) return false;
    if (allergies.includes("Nut Allergy") && !menu.is_nut_free) return false;
    if (allergies.includes("Dairy Allergy") && !menu.is_dairy_free) return false;
    if (allergies.includes("Gluten Allergy") && !menu.is_gluten_free) return false;
    if (allergies.includes("Egg Allergy") && !menu.is_egg_free) return false;
    // 참깨는 손 플래그가 없다 — 재료 라벨로 본다(간식과 같은 판정, 모르는 재료는 탈락).
    if (allergies.includes("Sesame Allergy") && dietViolations(menu.ingredients, ["Sesame Allergy"]).length) return false;
    if (allergies.includes("Vegetarian") && !menu.is_vegetarian) return false;
    if (allergies.includes("Vegan") && !menu.is_vegan) return false;
    // 🔴 Aussie(10-30): 판정이 없는 재료(Falafel Mix — 원재료 없음)가 든 메인은 식이 필터가 하나라도 켜지면 뺀다.
    //    손 표시만 보면 is_vegan 메뉴로 뽑히고, 저장분 검사(`savedPlanIsStale`)는 같은 날을 위반으로 버린다 — 두 규칙이 갈렸다.
    if (allergies.some((a) => a !== "Kindy") && menu.ingredients.some((i) => dietTagsFor(i) === null)) return false;
    // 질식 규칙은 손으로 적은 플래그가 아니라 재료 표(`chokingRisk.ts`)로 본다 — 간식과 같은 표다.
    if (kindyOn(allergies) && menuExclusion(menu.ingredients)) return false;
    if (excluded.some((ex) => menu.ingredients.includes(ex))) return false;
    return true;
  });
}

/**
 * 이번 주 특가로 이 메뉴가 **1인분당** 아끼는 금액(추정).
 *
 * 팩 기준 절약액(`promotion.savings`)에 PORTION_FACTORS를 곱한다. 팩 통째 절약액을
 * 그대로 쓰면 큰 팩(치즈 500g)이 작은 팩을 무조건 이겨서, 한 끼에 실제로 아끼는
 * 금액과 순위가 어긋난다.
 *
 * ⚠️ 어디까지나 **순위용 근사치다.** 화면에 찍히는 절약액은 우리 가격지수의
 *    basePrice에 할인율을 곱해서 따로 계산한다(`costForIngredients`). 여기서는
 *    선택 시점에 가격을 아직 안 받아왔으므로 전단의 regularPrice를 대신 쓴다.
 *
 * ⚠️ multibuy("3 for $5")는 묶음을 사야 성립하는 값이지만, 화면 절약액도 이미
 *    같은 가정으로 계산하고 있어 여기서만 다르게 잡지 않는다.
 */
export function menuSaleSavings(
  ingredients: string[],
  promotions: Array<Promotion & { store: StoreId }>,
): number {
  if (!promotions.length) return 0;
  return pricedMenuMatches(ingredients, promotions).reduce((total, m) => {
    const portion = PORTION_FACTORS[m.ingredient] ?? DEFAULT_PORTION;
    const base = PRICE_CACHE[m.ingredient]?.data?.price ?? 0;
    // 🔴 전단의 `savings`(그 브랜드의 정상가 대비)를 쓰지 않는다. 우리가 추적하는
    //    상시가 대비로 다시 잰다 — 상품·용량이 맞는 세 건을 실측해 보니 전단 기준
    //    절약은 컸는데 우리 추적가 대비 실제 절약은 전부 $0이었다(2026-09-09).
    const saved = Math.max(0, base - Math.min(base, m.promotion.salePrice));
    return total + saved * portion;
  }, 0);
}

const PRICE_CACHE = priceCache as Record<string, { data?: { price?: number } }>;

/**
 * 주간 캐시로 계산한 1인분 원가. 캐시에 없는 재료는 0으로 둔다 — 여기 값은
 * 화면에 찍히는 금액이 아니라 **순위용 근사치**다. 실제 원가는 선택이 끝난 뒤
 * `costForIngredients`가 그 주의 실제 가격으로 다시 계산한다.
 */
function serveCostOf(ingredients: string[]): number {
  return ingredients.reduce((total, ing) => {
    const p = PRICE_CACHE[ing]?.data?.price;
    if (typeof p !== "number" || !(p > 0)) return total;
    return total + p * (PORTION_FACTORS[ing] ?? DEFAULT_PORTION);
  }, 0);
}

/** 이번 주 특가를 적용한 뒤 이 도시락 한 끼가 드는 돈. */
export function menuNetCost(
  ingredients: string[],
  promotions: Array<Promotion & { store: StoreId }>,
): number {
  return serveCostOf(ingredients) - menuSaleSavings(ingredients, promotions);
}

/**
 * 기준 원가보다 $1 쌀 때마다 더해지는 가중치.
 *
 * 🔴 2026-09-07 실측 (n=1500/arm, 활성 특가 104건). 예전에는 **절약액**으로 기울였다:
 *
 *      끔 실제 지불액   중앙 $18.89
 *      켬 실제 지불액   중앙 $20.73     ← 켜면 $1.84 비쌌다
 *      켬 할인 전 원가  중앙 $23.07     ← 정가 기준으로도 $2.92 비싼 메뉴를 골랐다
 *
 *    원인: **절약액이 원가와 같이 움직인다**(r = 0.56). 팩 절약액이 큰 건 비싼 재료라
 *    "많이 아끼는 도시락"은 곧 "비싼 도시락"이었다. 절약액 상위 15개의 평균 원가는
 *    $3.81(전체 평균 $2.53)이고, 할인을 다 받아도 $2.16~$3.75로 제일 싼 메뉴들의
 *    $0.46~$0.93보다 비쌌다. 아낀 $2.29를 더 비싼 메뉴 값으로 도로 냈던 것이다.
 *
 * 그래서 기준을 **할인 후 원가**로 바꿨다. 특가는 "얼마를 깎아 주나"가 아니라
 * "이번 주에 무엇이 싸졌나"로만 순위에 들어온다. 특가가 없으면(토글 끔) 이 항은 0이라
 * 예전과 똑같이 동작한다 — 가격으로 미는 건 사용자가 켰을 때만이다.
 */
const CHEAPNESS_WEIGHT_SCALE = 5;

function medianOf(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * 무게가 클수록 앞에 올 확률이 높은 무작위 순열 (Efraimidis–Spirakis).
 * 정렬이 아니라 **셔플이다** — 가장 싼 주가 매번 똑같이 나오면 안 되기 때문이다.
 */
function weightedShuffle<T>(items: T[], weightOf: (item: T) => number): T[] {
  return items
    .map((item) => ({ item, key: Math.random() ** (1 / Math.max(weightOf(item), 1e-9)) }))
    .sort((a, b) => b.key - a.key)
    .map((x) => x.item);
}

/**
 * 즐겨찾기 재료가 든 도시락에 더해지는 무게.
 *
 * 🔴 처음엔 즐겨찾기를 **별도 티어**로 올려서 무조건 앞에 뒀다. 그랬더니 등장률이
 *    80.0%로 고정됐다 — "Chicken"을 즐겨찾기하면 5일 중 4일이 치킨이다.
 *    (나머지 한 칸은 Chicken 메뉴에 Baking이 없어서 카테고리 균형이 밖에서 채운다.)
 *    좋아한다고 매일 같은 걸 먹고 싶은 건 아니라서 무게로 낮췄다.
 */
const FAVORITE_WEIGHT = 8;   // 실측: Chicken 42.5%/칸 = 5일 중 약 2일

/**
 * 남은 재료가 든 도시락에 더해지는 무게.
 *
 * 즐겨찾기보다 훨씬 세다. "냉장고에 이게 있으니 써 없애자"는 **이번 주에 한정된**
 * 구체적인 요구라 웬만하면 들어줘야 하고, 즐겨찾기는 상시 취향이라 매일이면 물린다.
 *
 * 🔴 재료 하나가 든 메뉴가 몇 개냐가 상한을 만든다. 무게로는 그 벽을 못 넘는다.
 *    한 주에 한 번이라도 그 재료가 나오는 비율 (실측 300주, 우연은 5.3%):
 *
 *      무게   6 → 17%    20 → 42%    40 → 60%    80 → 79%
 *
 *    Quinoa·Salmon은 94개 중 **1개뿐**이라 79%가 사실상 천장이다(카테고리 균형이
 *    한 칸을 반드시 밖에서 채운다). 재료가 흔하면(Chicken 14개) 무게 20부터 100%다.
 */
const LEFTOVER_WEIGHT = 80;

/**
 * 이 도시락이 후보 순서에서 앞에 올 무게.
 *
 * 기본 1에서 시작해 즐겨찾기·남은 재료·절약액을 **더한다.** 곱하지 않는 이유는
 * 곱하면 셋 다 걸린 메뉴 하나가 다른 걸 다 밀어내기 때문이다.
 */
export function menuWeight(
  ingredients: string[],
  favorites: string[],
  leftover: string,
  promotions: Array<Promotion & { store: StoreId }> = [],
  referenceNetCost = 0,
  menuName = "",
): number {
  const lower = ingredients.map((i) => i.toLowerCase());
  const lv = leftover.trim().toLowerCase();
  const name = menuName.toLowerCase();
  let weight = 1;
  if (lv !== "" && lower.some((i) => i.includes(lv))) weight += LEFTOVER_WEIGHT;
  // 🔴 플래너의 ☆는 **메뉴 이름**을 저장한다(PlannerClient `toggleFavorite(item.menuName)`).
  //    09-29까지 재료명과만 대조해서 94개 메뉴 중 어느 즐겨찾기도 무게를 못 받았다.
  if (favorites.some((f) => f.toLowerCase() === name || lower.some((i) => i.includes(f.toLowerCase())))) {
    weight += FAVORITE_WEIGHT;
  }
  if (!promotions.length || referenceNetCost <= 0) return weight;
  const cheaperBy = referenceNetCost - menuNetCost(ingredients, promotions);
  return weight + Math.max(0, cheaperBy) * CHEAPNESS_WEIGHT_SCALE;
}

/**
 * 후보 순서를 정한다. 뒤의 `selectFiveMenus`가 이 순서를 **그대로** 쓴다.
 *
 * 셋(즐겨찾기·남은 재료·절약액)을 하나의 무게로 합쳐 한 번만 가중 셔플한다.
 * 티어로 나누면 위 티어가 아래를 완전히 가려서, 아래 신호가 있으나 마나가 된다.
 */
function orderCandidates(
  menus: MenuItem[],
  favorites: string[],
  leftover: string,
  activePromotions: Array<Promotion & { store: StoreId }> = [],
): MenuItem[] {
  // 기준은 이 주에 고를 수 있는 도시락들의 **할인 후 원가 중앙값**이다. 절대 금액으로
  // 기울이면 물가가 오른 주에 가중치가 통째로 세지므로, 매번 풀에서 다시 잡는다.
  const reference = activePromotions.length
    ? medianOf(menus.map((m) => menuNetCost(m.ingredients, activePromotions)))
    : 0;
  return weightedShuffle(menus, (m) =>
    menuWeight(m.ingredients, favorites, leftover, activePromotions, reference, m.name),
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function countCat(cat: string, selection: MenuItem[]): number {
  return selection.filter((m) => m.category === cat).length;
}

function selectFiveMenus(pool: MenuItem[]): MenuItem[] {
  let p = [...pool];
  while (p.length < 5) p = [...p, ...p];

  const final: MenuItem[] = [];
  // 🔴 2026-09-02까지 여기서 shuffle(p)를 했다. 그래서 orderCandidates가 정한 순서가
  //    통째로 버려졌고, 즐겨찾기·남은 재료·특가 우선순위가 **전부 무효였다.**
  //    실측: 즐겨찾기 Chicken의 등장률 13.1% vs 우연 기대치 14.9% — 효과 0.
  //    무작위성은 이미 orderCandidates의 셔플이 만든다. 여기서 또 섞으면 안 된다.
  const remaining = [...p];

  while (final.length < 5 && remaining.length) {
    if (countCat("Hot", final) === 0) {
      const idx = remaining.findIndex((m) => m.category === "Hot");
      if (idx !== -1) { final.push(remaining.splice(idx, 1)[0]); continue; }
    }
    if (countCat("Baking", final) === 0) {
      const idx = remaining.findIndex((m) => m.category === "Baking");
      if (idx !== -1) { final.push(remaining.splice(idx, 1)[0]); continue; }
    }
    if (countCat("Sandwich", final) >= 2) {
      const idx = remaining.findIndex((m) => m.category !== "Sandwich");
      if (idx !== -1) { final.push(remaining.splice(idx, 1)[0]); continue; }
    }
    final.push(remaining.shift()!);
  }

  return shuffle(final).slice(0, 5);
}

/**
 * 재료 목록의 비용을 계산한다. 메뉴 재료와 간식이 **같은 경로**를 쓰도록 하기 위한
 * 단일 진입점 — 두 곳에 나눠 쓰다가 한쪽만 PORTION_FACTORS를 빠뜨린 전례가 있다.
 *
 * price는 "판매 단위 한 팩" 가격이고, PORTION_FACTORS는 1인분이 소비하는 팩의 비율.
 * 자세한 단위 규약은 planConfig.ts 상단 주석 참조.
 */
/**
 * 재료 한 가지의 **실제로 적용되는 팩 가격**. 특가가 매칭되면 정가에 마트 할인
 * 비율을 적용한 근사값이고, 아니면 정가 그대로다.
 *
 * 🔴 2026-09-02: 이 계산이 두 군데에 따로 있었다. 플랜 카드는 특가를 적용했는데
 *    쇼핑 목록(`PlannerClient`)은 정가표로 따로 재계산해서, **같은 화면에 총액이
 *    두 개 뜨고 5.6% 어긋났다**(특가 켬: 플랜 $20.25 vs 목록 $21.38, 특가 끔:
 *    $23.65 vs $23.64). 하필 장 보러 갈 때 들고 가는 화면에서만 특가가 안 보였다.
 *    한 자리로 합친다 — 같은 일을 하는 자리가 둘이면 하나만 고치게 된다.
 */
export function effectivePackPrice(
  basePrice: number,
  sale: SaleMatch | undefined,
): number {
  // 🔴 2026-09-09까지 여기는 `basePrice * (salePrice / regularPrice)` 였다.
  //    **전단 상품의 할인 비율을 우리 기준가에 곱하는** 계산이라, 화면에 아무 데도
  //    없는 가격이 떴다(Milk $3.75 → $2.58, 근거는 Alpro 식물성 음료였다).
  //    이제 매칭 단계(`pricedMatchFor`)가 같은 상품·같은 용량·더 싼 값일 때만
  //    통과시키므로, 여기서는 **전단에 적힌 그 값을 그대로** 쓴다.
  //    `min`은 이중 안전장치다 — 표시 가격이 추적가보다 올라가는 일은 없어야 한다.
  if (sale && sale.promotion.salePrice > 0) {
    return Math.min(basePrice, sale.promotion.salePrice);
  }
  return basePrice;
}

/** 재료 목록에서 `ingredient` 키로 특가 맵을 만든다. 플랜·쇼핑 목록이 같이 쓴다. */
export function saleMapFor(matches: SaleMatch[]): Map<string, SaleMatch> {
  return new Map(matches.map((m) => [m.ingredient, m]));
}

export function costForIngredients(
  ingredients: string[],
  priceMap: Map<string, PriceInfo>,
  saleByIngredient: Map<string, SaleMatch> = new Map(),
  band: Portions = DEFAULT_PORTION_BAND,
): { cost: number; saved: number } {
  let cost = 0;
  let saved = 0;
  for (const ing of ingredients) {
    // 나이대 배율은 **몫**에 곱한다 — 원가와 절약액이 같은 비율로 움직인다(절약도 1인분 단위다).
    const portion = portionFor(ing, band);
    const basePrice = priceMap.get(ing)?.price ?? 0;
    const effectivePrice = effectivePackPrice(basePrice, saleByIngredient.get(ing));
    cost += effectivePrice * portion;
    saved += (basePrice - effectivePrice) * portion;
  }
  return { cost, saved };
}

/**
 * 주간 상단에 찍는 합계.
 *
 * 🔴 2026-09-10 외부 감사 — `PlannerClient`가 카드에 **찍힌 문자열**(`$3.16`)을
 *    파싱해 다섯 번 더하고 있었다. 센트로 다섯 번 자른 뒤 더한 값이라
 *    장보기 합계(정밀합)와 1센트 어긋났다. 반올림은 마지막에 한 번만 한다.
 *
 *    화면이 이 함수를 쓰게 해 둔다 — 합계 식이 컴포넌트 안에 있으면
 *    가드가 라이브러리만 보고 「맞다」고 말하는 알리바이가 된다.
 *
 * 하루치 값이 하나라도 없으면 `null`이다(옛 저장분). 화면은 그때 합계를 감춘다.
 */
export function weekTotalFrom(planData: PlanItem[]): number | null {
  if (!planData.length) return null;
  let total = 0;
  for (const d of planData) {
    // 도시락을 안 싸는 날은 합계에 넣지 않는다 — 장보기 목록에서도 빠져 있다(`assembleWeek`).
    if (d.off) continue;
    const v = d.estCostValue ?? Number(d.estCost.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(v) || !(v > 0)) return null;
    total += v;
  }
  return total;
}

/**
 * 하루치 도시락(메인 + 간식 재료 전부)의 원가·절약액·특가 매칭.
 *
 * 🔴 생성·하루 교체·공유 링크·저장분 복원이 **모두 이 함수 하나**로 값을 낸다.
 *    복원 경로가 따로 식을 들고 있으면 같은 식단이 새로고침 전후로 다른 금액이 된다
 *    (09-09 「한 화면에 총액 두 개」와 같은 모양).
 *    간식 재료까지 한 목록으로 특가 대조를 거친다 — 09-15 사고의 원인 자리다.
 */
export function priceDay(
  ingredients: string[],
  priceMap: Map<string, PriceInfo>,
  promotions: Array<Promotion & { store: StoreId }>,
  band: Portions = DEFAULT_PORTION_BAND,
): { cost: number; saved: number; saleMatches: SaleMatch[] } {
  const saleMatches = promotions.length > 0 ? pricedMenuMatches(ingredients, promotions) : [];
  const { cost, saved } = costForIngredients(ingredients, priceMap, saleMapFor(saleMatches), band);
  return { cost, saved, saleMatches };
}

type SaleOptions = { useSales: boolean; saleStores: StoreId[] };

/**
 * 하루치 열량 추정 — 나이대 배율을 원가와 **같은 값**으로 곱한다. standard(×1)는 예전 값 그대로다.
 * 생성·교체·공유가 모두 `assembleWeek`에서 이 함수를 부른다.
 */
export function dayCalories(menuIngredients: string[], snacks: SnackItem[], band: PortionBand = DEFAULT_PORTION_BAND): number {
  return Math.round((estimateMenuCalories(menuIngredients) + estimateSnackCalories(snacks)) * bandFactor(band));
}
type PrepOptions = { prepStyles: PrepStyle[]; thermosOnly: boolean };

/** 특가 토글이 켜졌고 마트가 하나라도 골라졌을 때만 특가를 쓴다. */
export function activePromotionsFor(saleOptions?: SaleOptions): Array<Promotion & { store: StoreId }> {
  return saleOptions?.useSales && saleOptions.saleStores.length > 0
    ? getActivePromotions(saleOptions.saleStores)
    : [];
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 🔴 뽑기 **전에** 거른다. 뽑고 나서 고치면 「맞는 게 없으면 아무거나」로 돌아간다.
 *    조건에 맞는 간식이 없으면 **그 자리를 비운다** — 부적합한 것으로 채우지 않는다.
 */
function snackPoolsFor(snackData: SnackData, allergies: AllergyType[], excluded: string[]) {
  const fruitVeg = (snackData["Fruit & Veg"] ?? []).filter((sn) =>
    snackAllowed(sn, allergies, excluded),
  );
  const snackPool = [
    ...(snackData["Protein & Dairy"] ?? []),
    ...(snackData["Savoury Crunch"] ?? []),
  ].filter((sn) => snackAllowed(sn, allergies, excluded));
  return { fruitVeg, snackPool };
}

function pickDaySnacks({ fruitVeg, snackPool }: ReturnType<typeof snackPoolsFor>): SnackItem[] {
  const snacks: SnackItem[] = [];
  if (fruitVeg.length) snacks.push(randomChoice(fruitVeg));
  if (snackPool.length) snacks.push(randomChoice(snackPool));
  return snacks;
}

/**
 * 고른 다섯 메인 + 날마다 간식을 가격 매기고 화면용 PlanItem으로 만든다.
 * 생성·하루 교체·공유 링크가 **같은 조립**을 거친다 — 원가·열량·장보기 목록이
 * 경로마다 달라지지 않게.
 */
async function assembleWeek(
  menus: MenuItem[],
  selected: MenuItem[],
  dailySnacksList: SnackItem[][],
  allergies: AllergyType[],
  excluded: string[],
  getPrices: (ingredients: string[]) => Promise<PriceInfo[]>,
  activePromotions: Array<Promotion & { store: StoreId }>,
  prepOptions?: PrepOptions,
  warning?: string,
  band: Portions = DEFAULT_PORTION_BAND,
  lunchDays: readonly boolean[] = ALL_LUNCH_DAYS,
): Promise<GeneratePlanResponse> {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const shoppingList: string[] = [];

  // Collect ALL unique ingredients across all menus + snacks in one shot
  const allIngredients: string[] = [];
  for (let i = 0; i < selected.length; i++) {
    allIngredients.push(...selected[i].ingredients);
    for (const snack of dailySnacksList[i]) {
      allIngredients.push(...(snack.ingredients ?? []));
    }
  }
  const uniqueIngredients = [...new Set(allIngredients)];

  // Single batch price fetch (runs all requests in parallel)
  const priceList = await getPrices(uniqueIngredients);
  const priceMap = new Map<string, PriceInfo>();
  uniqueIngredients.forEach((ing, idx) => priceMap.set(ing, priceList[idx]));

  // Build plan using cached prices
  const planData: PlanItem[] = [];
  let totalSavings = 0;
  let totalWeekCost = 0;

  for (let i = 0; i < days.length; i++) {
    const menu = selected[i];
    const dailySnacks = dailySnacksList[i];

    const snackIngredients = dailySnacks.flatMap((s) => s.ingredients ?? []);

    // Sale 매칭 — 그날 실제로 사는 것 **전부**에서 sale 적합 promo 추출.
    //
    // 🔴 2026-09-15까지 여기는 `menu.ingredients` 만 넘겼다. 그런데 간식 비용도 같은
    //    맵으로 계산했다 — 즉 **간식 재료는 특가 대조를 아예 안 거쳤다.**
    //    특가인 간식이 정가로 계산됐고, 그날 메뉴에 같은 재료가 우연히 들어 있을 때만
    //    할인을 받아 **날마다 동작이 달랐다.**
    //
    //    드러난 경로: 상단 주간 합계와 장보기 목록 합계가 어긋난다. 장보기 쪽이 옳다 —
    //    특가로 산 햄 한 팩에서 덜어 쓰는 몫은 그 주 내내 할인가다. 상단이 과다 청구했다.
    //    (`lib/shoppingListTotal.test.ts` 가 30회 중 가끔 터지던 원인이다.)
    //
    //    [[price-claims-must-be-recomputable]]의 「간식이 알레르기 필터를 통째로 안 거침」과
    //    같은 모양이다 — 간식 경로가 필터를 우회한다. 넘기는 목록을 하나로 합쳐 막는다.
    //
    // 간식도 메뉴 재료와 완전히 같은 경로로 계산한다. 예전에는 간식 루프가 따로
    // 작성돼 PORTION_FACTORS를 건너뛰었고, 그 결과 치즈 블록 한 팩의 20%가
    // "치즈큐브" 간식 하나로 계산됐다. 경로를 하나로 합쳐 재발을 막는다.
    const { cost, saved, saleMatches } = priceDay(
      [...menu.ingredients, ...snackIngredients], priceMap, activePromotions, band,
    );
    // 안 싸는 날은 메뉴만 남기고 장보기·합계·절약액에서 뺀다 — 화면 합계(`weekTotalFrom`)도 같은 날을 건너뛴다.
    const off = lunchDays[i] === false;
    if (!off) {
      shoppingList.push(...snackIngredients);
      totalSavings += saved;
      totalWeekCost += cost;
    }

    // 열량은 아이 한 명의 값이라 합치지 않는다 — 1번 도시락 값을 두고, 여러 개면 도시락별로 따로 싣는다.
    const calories = dayCalories(menu.ingredients, dailySnacks, typeof band === "string" ? band : band[0]);
    const perBox = typeof band === "string" ? undefined : band.map((b) => dayCalories(menu.ingredients, dailySnacks, b));

    // 🔴 거르는 것은 바꾸지 않는다 — 포장의 「may contain」은 NZ에서 자율 표시라
    //    이걸로 빼면 기준이 상품마다 달라진다. 남긴 채 카드에 ⚠로만 알린다.
    const mayContain = dayMayContain(menu.ingredients, dailySnacks, allergies);
    // 킨디: 가이드가 「손질하라」고 한 재료의 안내. 빼는 것은 위 필터가 이미 했다.
    const kindyPrep = dayKindyPrep(menu.ingredients, dailySnacks, allergies, menu.name);

    planData.push({
      day: days[i],
      menuIndex: menus.indexOf(menu),
      menuName: menu.name,
      description: menu.ingredients.join(", "),
      estCost: `$${cost.toFixed(2)}`,
      estCostValue: cost,
      image: menu.image,
      instructions: menu.instructions,
      rawIngredients: menu.ingredients,
      category: menu.category,
      nutrition: { calories, label: "kcal (Est.)", ...(perBox ? { perBox } : {}) },
      snacks: dailySnacks,
      ...(saleMatches.length > 0 ? { saleMatches } : {}),
      ...(menu.prep_style ? { prepStyle: menu.prep_style } : {}),
      ...(menu.is_thermos ? { isThermos: true } : {}),
      ...(menu.cuisine ? { cuisine: menu.cuisine } : {}),
      ...(mayContain.length > 0 ? { mayContain } : {}),
      ...(kindyPrep.length > 0 ? { kindyPrep } : {}),
      ...(off ? { off: true as const } : {}),
    });

    if (!off) shoppingList.push(...menu.ingredients);
  }

  // 🔴 **내보내기 직전 전수 재검사** (2026-09-10 외부 감사).
  //    위의 두 필터가 새면 사용자는 알레르기가 걸러졌다고 믿는 식단을 받는다.
  //    여기서 걸리면 그건 고장이지 사용자 입력 문제가 아니므로 **막고 알린다** —
  //    조건에 맞는 간식 풀은 최악의 조합에서도 7개라 부족해서 걸릴 일은 없다.
  //
  //    메뉴는 자기 플래그(`filterMenus`)로, 간식·장보기는 재료 표로 본다.
  //    근거가 다른 둘을 섞으면 서로를 위반으로 몰게 된다 — 94개 대조에서
  //    메뉴 쪽이 더 엄격한 곳이 12군데였다.
  for (const item of planData) {
    const menu = menus[item.menuIndex];
    if (menu && !filterMenus([menu], allergies, excluded, prepOptions?.prepStyles ?? [], prepOptions?.thermosOnly ?? false).length) {
      throw new Error(`Internal: "${item.menuName}" does not match the selected filters.`);
    }
    const snackIngs = (item.snacks ?? []).flatMap((sn) => sn.ingredients ?? []);
    const bad = dietViolations(snackIngs, allergies);
    const excludedHit = snackIngs.filter((i) => excluded.includes(i));
    const kindyHit = kindyOn(allergies) ? (item.snacks ?? []).filter((sn) => snackExclusion(sn)).map((sn) => `${sn.name} (Kindy)`) : [];
    if (bad.length || excludedHit.length || kindyHit.length) {
      const why = [...bad.map((b) => `${b.ingredient} (${b.reason})`), ...excludedHit, ...kindyHit].join(", ");
      throw new Error(`Internal: snack ingredients break the selected filters — ${why}`);
    }
  }

  // Convert priceMap to plain object for JSON serialization
  const prices: Record<string, PriceInfo> = {};
  priceMap.forEach((val, key) => { prices[key] = val; });

  return {
    planData,
    shoppingList,
    prices,
    warning,
    ...(totalSavings > 0 ? { totalSavings: Number(totalSavings.toFixed(2)) } : {}),
    totalWeekCost: Number(totalWeekCost.toFixed(2)),
  };
}

export async function buildWeeklyPlan(
  menus: MenuItem[],
  allergies: AllergyType[],
  excluded: string[],
  favorites: string[],
  leftover: string,
  snackData: SnackData,
  getPrices: (ingredients: string[]) => Promise<PriceInfo[]>,
  saleOptions?: SaleOptions,
  prepOptions?: PrepOptions,
  band: Portions = DEFAULT_PORTION_BAND,
  lunchDays: readonly boolean[] = ALL_LUNCH_DAYS,
): Promise<GeneratePlanResponse> {
  const available = filterMenus(
    menus, allergies, excluded,
    prepOptions?.prepStyles ?? [], prepOptions?.thermosOnly ?? false,
  );
  if (!available.length) {
    throw new Error("No menus match your criteria. Try removing some filters.");
  }

  // Sale 데이터 로드 (useSales=true 일 때만 효과적용)
  const activePromotions = activePromotionsFor(saleOptions);

  const pool = orderCandidates(available, favorites, leftover, activePromotions);

  let warning: string | undefined;
  if (pool.length < 5) {
    warning = `Found only ${pool.length} unique menus. Some meals will be repeated.`;
  }

  const selected = selectFiveMenus(pool);

  // Pick snacks for each day first (before price fetching)
  const snackPools = snackPoolsFor(snackData, allergies, excluded);
  const dailySnacksList: SnackItem[][] = selected.map(() => pickDaySnacks(snackPools));

  // 🔴 나이대는 **선택**에 끼어들지 않는다 — 메뉴는 나이와 무관하고, 가격 순위(`orderCandidates`)도
  //    기준 1인분으로 잰다. 양·원가만 `assembleWeek`에서 곱한다.
  return assembleWeek(
    menus, selected, dailySnacksList, allergies, excluded,
    getPrices, activePromotions, prepOptions, warning, band, lunchDays,
  );
}

/* ────────────────────────────────────────────────────────────────
 * 하루 교체 · 공유 링크 (2026-09-29)
 *
 * 둘 다 **클라이언트가 보낸 이름**에서 한 주를 되살린다. 이름은 믿지 않는다 —
 * 모르는 이름은 가격 조회 전에 막는다. `fetchIngredientPrice`는 캐시에 없는 이름을
 * 외부(Woolworths)로 검색하러 나가므로, 검증 없이 넘기면 URL에 적힌 아무 문자열이
 * 서버발 외부 요청이 된다.
 * ──────────────────────────────────────────────────────────────── */

export type PlanInputErrorCode = "BAD_INPUT" | "UNKNOWN_NAME" | "FILTER_MISMATCH" | "NO_ALTERNATIVE";

export class PlanInputError extends Error {
  constructor(public code: PlanInputErrorCode, message: string) {
    super(message);
    this.name = "PlanInputError";
  }
}

type WeekFilters = {
  allergies: AllergyType[];
  excluded: string[];
  prepOptions?: PrepOptions;
};

/**
 * 이름 다섯 줄을 메뉴·간식 객체로 되살린다. 모르는 이름이나 조건을 어기는 것이
 * 하나라도 있으면 **통째로 거절한다** — 일부만 살려 빈칸을 채우지 않는다.
 */
export function resolveWeek(
  menus: MenuItem[],
  snackData: SnackData,
  week: WeekDayNames[],
  { allergies, excluded, prepOptions }: WeekFilters,
): { selected: MenuItem[]; snacks: SnackItem[][] } {
  if (!Array.isArray(week) || week.length !== 5) {
    throw new PlanInputError("BAD_INPUT", "A plan has exactly 5 days.");
  }
  const menuByName = new Map(menus.map((m) => [m.name, m]));
  // 🔴 생성기가 실제로 뽑는 두 풀만 받는다. Sweet Treat은 플래너가 쓰지 않는다.
  const fruitVegAll = snackData["Fruit & Veg"] ?? [];
  const otherAll = [...(snackData["Protein & Dairy"] ?? []), ...(snackData["Savoury Crunch"] ?? [])];
  const snackByName = new Map([...fruitVegAll, ...otherAll].map((s) => [s.name, s]));

  const known = new Set<string>();
  for (const m of menus) m.ingredients.forEach((i) => known.add(i));
  for (const s of Object.values(snackData).flat() as SnackItem[]) (s.ingredients ?? []).forEach((i) => known.add(i));
  const unknownExcluded = excluded.filter((x) => !known.has(x));
  if (unknownExcluded.length) {
    throw new PlanInputError("UNKNOWN_NAME", `Unknown ingredient: ${unknownExcluded[0]}`);
  }

  const selected: MenuItem[] = [];
  const snacks: SnackItem[][] = [];
  for (const d of week) {
    const menu = menuByName.get(d.menu);
    if (!menu) throw new PlanInputError("UNKNOWN_NAME", `Unknown menu: ${d.menu}`);
    if (!filterMenus([menu], allergies, excluded, prepOptions?.prepStyles ?? [], prepOptions?.thermosOnly ?? false).length) {
      throw new PlanInputError("FILTER_MISMATCH", `"${menu.name}" does not match the plan's filters.`);
    }
    const daySnacks: SnackItem[] = [];
    for (const name of d.snacks) {
      const sn = snackByName.get(name);
      if (!sn) throw new PlanInputError("UNKNOWN_NAME", `Unknown snack: ${name}`);
      if (!snackAllowed(sn, allergies, excluded)) {
        throw new PlanInputError("FILTER_MISMATCH", `"${sn.name}" does not match the plan's filters.`);
      }
      daySnacks.push(sn);
    }
    // 생성기는 하루에 과일·채소 한 칸 + 나머지 한 칸만 채운다. 그 모양을 벗어나면 조작이다.
    if (
      daySnacks.filter((s) => fruitVegAll.includes(s)).length > 1 ||
      daySnacks.filter((s) => otherAll.includes(s)).length > 1
    ) {
      throw new PlanInputError("BAD_INPUT", "Too many snacks for one day.");
    }
    selected.push(menu);
    snacks.push(daySnacks);
  }
  return { selected, snacks };
}

/**
 * 교체할 한 칸에 `selectFiveMenus`의 균형 규칙을 그대로 적용한다 —
 * 남은 네 날에 Hot/Baking이 없으면 그 범주를 먼저, 샌드위치가 이미 둘이면 다른 것을.
 * 맞는 게 없으면 가중 순서의 첫 번째다.
 */
function pickReplacement(ordered: MenuItem[], kept: MenuItem[]): MenuItem {
  for (const cat of ["Hot", "Baking"]) {
    if (countCat(cat, kept) === 0) {
      const hit = ordered.find((m) => m.category === cat);
      if (hit) return hit;
    }
  }
  if (countCat("Sandwich", kept) >= 2) {
    const hit = ordered.find((m) => m.category !== "Sandwich");
    if (hit) return hit;
  }
  return ordered[0];
}

/**
 * 한 주 중 하루(메인 + 그날 간식)만 바꾼다. 나머지 네 날은 이름 그대로 두고,
 * 한 주 전체를 생성과 **같은 조립**(`assembleWeek`)으로 다시 가격 매긴다 —
 * 그래야 주간 합계·절약액·장보기 목록이 생성 때와 같은 식으로 맞는다.
 *
 * 후보는 생성과 같은 필터를 거치고, 이미 이번 주에 있는 메뉴(바꾸려는 그날 것 포함)는
 * 뺀다. 순서는 생성과 같은 가중 셔플(즐겨찾기·남은 재료·특가)이다.
 * 남는 후보가 없으면 `NO_ALTERNATIVE`를 던진다 — 같은 메뉴로 「바꾼 척」하지 않는다.
 */
export async function swapPlanDay(
  menus: MenuItem[],
  snackData: SnackData,
  week: WeekDayNames[],
  dayIndex: number,
  options: WeekFilters & { favorites: string[]; leftover: string; saleOptions?: SaleOptions; band?: Portions; lunchDays?: readonly boolean[] },
  getPrices: (ingredients: string[]) => Promise<PriceInfo[]>,
): Promise<GeneratePlanResponse> {
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex >= 5) {
    throw new PlanInputError("BAD_INPUT", "Invalid day.");
  }
  const { allergies, excluded, prepOptions } = options;
  const { selected, snacks } = resolveWeek(menus, snackData, week, options);

  const available = filterMenus(
    menus, allergies, excluded,
    prepOptions?.prepStyles ?? [], prepOptions?.thermosOnly ?? false,
  );
  const activePromotions = activePromotionsFor(options.saleOptions);
  const inWeek = new Set(selected.map((m) => m.name));
  // 가중치 기준(할인 후 원가 중앙값)을 생성과 같은 풀에서 잡으려고, 거르기 **전에** 순서를 낸다.
  const ordered = orderCandidates(available, options.favorites, options.leftover, activePromotions)
    .filter((m) => !inWeek.has(m.name));
  if (!ordered.length) {
    throw new PlanInputError("NO_ALTERNATIVE", "No other menu fits these filters without repeating one already in the week.");
  }

  const kept = selected.filter((_, i) => i !== dayIndex);
  const nextSelected = [...selected];
  nextSelected[dayIndex] = pickReplacement(ordered, kept);
  const nextSnacks = [...snacks];
  nextSnacks[dayIndex] = pickDaySnacks(snackPoolsFor(snackData, allergies, excluded));

  return assembleWeek(
    menus, nextSelected, nextSnacks, allergies, excluded,
    getPrices, activePromotions, prepOptions, undefined, options.band ?? DEFAULT_PORTION_BAND,
    options.lunchDays ?? ALL_LUNCH_DAYS,
  );
}

/** 공유 링크의 식단을 되살려 **지금 가격**으로 다시 매긴다. 이름·조건 검증은 `resolveWeek`. */
export async function buildSharedPlan(
  menus: MenuItem[],
  snackData: SnackData,
  shared: SharedPlan,
  getPrices: (ingredients: string[]) => Promise<PriceInfo[]>,
): Promise<GeneratePlanResponse> {
  const prepOptions = { prepStyles: shared.prepStyles, thermosOnly: shared.thermosOnly };
  const { selected, snacks } = resolveWeek(menus, snackData, shared.days, {
    allergies: shared.allergies, excluded: shared.excluded, prepOptions,
  });
  const activePromotions = activePromotionsFor({ useSales: shared.useSales, saleStores: shared.saleStores });
  return assembleWeek(
    menus, selected, snacks, shared.allergies, shared.excluded,
    getPrices, activePromotions, prepOptions, undefined,
    portionsOf(shared.band ?? DEFAULT_PORTION_BAND, shared.extraBoxes), shared.lunchDays ?? ALL_LUNCH_DAYS,
  );
}
