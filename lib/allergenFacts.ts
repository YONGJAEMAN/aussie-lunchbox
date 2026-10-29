import PRICES from "@/data/price_cache.json";
import { labelFor, declares, warnsAbout, labelledCount } from "./allergenLabels";

/**
 * 추적 상품의 알레르겐 라벨에서 **글이 쓸 수치를 생성한다.**
 *
 * 🔴 왜 있나 (2026-09-10) — 어제 간식 알레르기 필터를 만들면서 상품 라벨 95개를
 *    실제로 읽게 됐다. 그 과정에서 이름만 봐서는 절대 못 잡는 것들이 나왔다:
 *      · `Veggie Straws`가 **우유를 선언**한다
 *      · 유제품 프리 페스토가 **트리넛을 선언**한다
 *      · 글루텐 프리 빵이 **달걀을 선언**한다
 *    뉴질랜드 도시락 재료로 이걸 정리해 공개한 곳이 없다. 우리만 가진 값이다.
 *
 * 🔴 **손으로 세지 않는다.** 상품이 바뀌면 문장도 같이 바뀌어야 한다 —
 *    오늘만 해도 고정 SKU 하나가 이름이 바뀌어 있었다([[kiwi-price-data-integrity]]).
 */

export type Allergen = "nuts" | "milk" | "egg" | "gluten" | "sesame";
export const ALLERGENS: Allergen[] = ["nuts", "milk", "egg", "gluten", "sesame"];

export const ALLERGEN_LABEL: Record<Allergen, string> = {
  nuts: "Nuts", milk: "Milk", egg: "Egg", gluten: "Gluten", sesame: "Sesame",
};

type Entry = { data?: { name?: string } };
const CACHE = PRICES as Record<string, Entry>;
const KEYS = Object.keys(CACHE);

export const productName = (k: string) => (CACHE[k]?.data?.name ?? "").toLowerCase();

/** 라벨을 들고 있는 상품 수 / 추적 상품 수. */
export const labelledProducts = () => labelledCount();
export const trackedProducts = () => KEYS.length;

/** 그 알레르겐을 **선언한** 상품 수. */
export const declaredCount = (a: Allergen) => KEYS.filter((k) => declares(k, a)).length;
/** 「미량 함유 가능」 등 **주의만** 붙은 상품 수(선언한 것은 뺀다). */
export const warnedCount = (a: Allergen) =>
  KEYS.filter((k) => !declares(k, a) && warnsAbout(k, a)).length;

/** 주의 문구가 하나라도 붙은 상품 수. */
export const anyWarningCount = () =>
  KEYS.filter((k) => labelFor(k) && ALLERGENS.some((a) => warnsAbout(k, a))).length;

/** 선언 vs 주의 표. 견과처럼 **주의가 선언보다 많은** 줄이 이 글의 논지다. */
export function declaredVsWarnedTable(): string {
  return ALLERGENS.map((a) => `| ${ALLERGEN_LABEL[a]} | ${declaredCount(a)} | ${warnedCount(a)} |`)
    .join("\n");
}

/**
 * 그 알레르겐에 **주의 문구만** 붙은 상품의 재료 키 — 이름이 아니라 우리가 추적하는 키다.
 *
 * 🔴 왜 있나 (2026-09-15) — 달걀 프리 글이 "All dried Barilla is egg-free" ·
 *    "All standard hummus is egg-free"라고 **절대형으로** 적어 두고 있었다.
 *    그런데 우리가 추적하는 그 두 품목의 라벨은 이렇다:
 *      diamond pasta bow ties  선언 Gluten, Wheat  · **주의 Egg, Soy**
 *      lisas hummus plain      선언 Sesame        · **주의 Egg, Milk, …**
 *    선언은 없지만 **「달걀이 들어갈 수 있다」고 적힌 상품**이다. 달걀 알레르기
 *    가정에게 「확실히 달걀 없음」 목록에 올릴 물건이 아니다.
 *    글이 그 사실을 **데이터에서** 말하게 한다 — 손으로 적으면 다음 수집에 낡는다.
 */
export const warnedProducts = (a: Allergen): { key: string; product: string }[] =>
  KEYS.filter((k) => !declares(k, a) && warnsAbout(k, a)).map((k) => ({ key: k, product: productName(k) }));

/** "pasta and hummus" 처럼 문장에 넣을 목록. 없으면 빈 문자열. */
export const warnedKeysClause = (a: Allergen, keys: string[]): string => {
  const hit = keys.filter((k) => !declares(k, a) && warnsAbout(k, a));
  if (!hit.length) return "";
  const names = hit.map((k) => `${k.toLowerCase()} (${productName(k)})`);
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
};

/** 주의가 선언보다 많은 알레르겐 — 문장이 스스로 고르게 한다. */
export const warnExceedsDeclared = () =>
  ALLERGENS.filter((a) => warnedCount(a) > declaredCount(a));

/* ── 「무엇이 없다」고 이름 붙인 상품이 무엇을 선언하나 ── */

const FREE_FROM = /\b(free|vegan|plant|alternative)\b/;

export type LabelRow = { key: string; product: string; declared: Allergen[]; warned: Allergen[] };

/**
 * 이름에 free/vegan/plant/alternative 가 든 상품 중, **다른 알레르겐을 선언한** 것.
 * 「달걀」처럼 이름이 곧 그 알레르겐인 경우는 뺀다 — 놀랄 일이 아니다.
 */
export function freeFromRows(): LabelRow[] {
  const rows: LabelRow[] = [];
  for (const k of KEYS) {
    const nm = productName(k);
    if (!FREE_FROM.test(nm) || !labelFor(k)) continue;
    const declared = ALLERGENS.filter((a) => declares(k, a) && !nameSuggests(nm + " " + k.toLowerCase(), a));
    const warned = ALLERGENS.filter((a) => !declares(k, a) && warnsAbout(k, a));
    if (declared.length || warned.length) rows.push({ key: k, product: nm, declared, warned });
  }
  return rows.sort((a, b) => b.declared.length - a.declared.length || a.key.localeCompare(b.key));
}

/** 상품 이름이 그 알레르겐을 이미 말하고 있나. */
const NAME_TOKENS: Record<Allergen, RegExp> = {
  nuts: /\b(nut|nuts|almond|peanut|cashew|hazelnut|macadamia|walnut|pecan|pistachio)\b/,
  milk: /\b(milk|dairy|cheese|yoghurt|yogurt|butter|cream|paneer|feta|mozzarella|parmesan)\b/,
  egg: /\b(egg|eggs|mayo|mayonnaise)\b/,
  gluten: /\b(bread|flour|pasta|wheat|noodle|noodles|bagel|bun|roll|rolls|wrap|wraps|crumb|crumbs|pastry|cracker|crackers|couscous|oat|oats|muesli|spaghetti|macaroni|pita|roti|bao|croissant|pretzel|pretzels|breadstick|breadsticks|tortilla|scroll|scrolls|dumpling|vegemite|soy sauce|mustard)\b/,
  sesame: /\b(sesame|hummus|tahini)\b/,
};
const nameSuggests = (s: string, a: Allergen) => NAME_TOKENS[a].test(s);

/**
 * **이름이 알레르겐을 숨긴 상품.** 이름에도 재료 키에도 그 알레르겐을 떠올릴 낱말이
 * 없는데 라벨이 선언한 것 — 라벨을 읽지 않으면 원리상 못 잡는다.
 */
export function hiddenRows(): LabelRow[] {
  const rows: LabelRow[] = [];
  for (const k of KEYS) {
    const nm = productName(k);
    if (!labelFor(k)) continue;
    const hay = nm + " " + k.toLowerCase();
    const declared = ALLERGENS.filter((a) => declares(k, a) && !nameSuggests(hay, a));
    if (declared.length) rows.push({ key: k, product: nm, declared, warned: [] });
  }
  return rows.sort((a, b) => a.key.localeCompare(b.key));
}

const list = (xs: Allergen[]) => xs.map((a) => ALLERGEN_LABEL[a]).join(", ");

export function hiddenTable(): string {
  return hiddenRows().map((r) => `| ${r.key} | ${r.product} | **${list(r.declared)}** |`).join("\n");
}

export function freeFromTable(): string {
  return freeFromRows()
    .map((r) => `| ${r.key} | ${r.product} | ${r.declared.length ? `**${list(r.declared)}**` : "—"} | ${r.warned.length ? list(r.warned) : "—"} |`)
    .join("\n");
}

/**
 * 라벨이 **없는** 추적 상품 중 포장 식품의 예.
 * 🔴 09-28 — 글이 "the rest are loose produce, meat and dry goods that come without one"
 *    라고 적고 있었다. 크루아상·머핀·파니르 같은 포장 식품도 소매 목록에 알레르겐 칸이
 *    비어 있어서 `ingredientDiet.ts`의 `NO_LABEL`에 손으로 태그돼 있다.
 *    후보는 손으로 고르되, **지금도 라벨이 없는 것만** 문장에 싣는다.
 */
const PACKAGED_EXAMPLES = ["Croissant", "Muffin", "Ciabatta", "Paneer", "Salami", "GF Pasta"];
export const unlabelledPackagedExamples = () =>
  PACKAGED_EXAMPLES.filter((k) => k in CACHE && labelFor(k) === null);
