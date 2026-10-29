import menuData from "@/data/menuData.json";
import PRICES from "@/data/price_cache.json";
import { declares, warnsAbout, labelFor } from "./allergenLabels";
import { productName } from "./allergenFacts";
import { dietViolations, SESAME_UNVERIFIED } from "./ingredientDiet";
import { menuExclusion } from "./chokingRisk";
import type { AllergyType, MenuItem } from "./types";

/**
 * 참깨 글(`sesame-free-school-lunches-nz`)이 쓰는 수치를 **여기서만 생성한다** (2026-10-23).
 *
 * 🔴 왜 있나 — 10-22 Bucklands Beach Playcentre 학부모가 「참깨 알레르기 아이가 있는데 필터가 없다」고
 *    했다. 필터를 만들면서 추적 상품 라벨의 참깨 줄을 전부 읽게 됐고, 거기서 **빵은 전부 참깨 주의**라는
 *    게 나왔다. 그 사실을 글로 낸다 — 손으로 세면 다음 수집에 낡으므로 문장이 데이터를 읽는다.
 */

const MENUS = (menuData as unknown as { MENU_DATA: { en: MenuItem[] } }).MENU_DATA.en;
const KEYS = Object.keys(PRICES as Record<string, unknown>);
const SESAME: AllergyType[] = ["Sesame Allergy"];

/** 라벨이 참깨를 **선언**하는 추적 재료. */
export const sesameDeclaredKeys = () => KEYS.filter((k) => declares(k, "sesame")).sort();
/** 선언은 없고 **주의(may contain)만** 붙은 추적 재료. */
export const sesameWarnedKeys = () =>
  KEYS.filter((k) => !declares(k, "sesame") && warnsAbout(k, "sesame")).sort();

export const productTable = (keys: string[]) =>
  keys.map((k) => `| ${k} | ${productName(k)} |`).join("\n");

/** 우리가 추적하는 빵 — 재료 이름으로 고른다(상품명은 브랜드마다 달라 기준이 흔들린다). */
const BREAD = /\b(bread|roll|bun|bagel|breadsticks?|pita|crumpets?)\b/i;
export type BreadRow = { key: string; product: string; status: "declares" | "warns" | "neither" };
export function breadRows(): BreadRow[] {
  return KEYS.filter((k) => BREAD.test(k) && labelFor(k) !== null)
    .sort()
    .map((k) => ({
      key: k,
      product: productName(k),
      status: declares(k, "sesame") ? "declares" : warnsAbout(k, "sesame") ? "warns" : "neither",
    }));
}
/** 빵 줄을 **말로** — 전부인지, 몇 개 중 몇 개인지, 예외가 무엇인지를 데이터가 정한다. */
export function breadVerdict(): string {
  const rows = breadRows();
  if (rows.length === 0) return "We track no labelled bread.";
  const hit = rows.filter((r) => r.status !== "neither");
  const decl = rows.filter((r) => r.status === "declares");
  const miss = rows.filter((r) => r.status === "neither");
  const head = hit.length === rows.length
    ? `All ${rows.length} of the labelled breads we track carry a sesame line.`
    : `${hit.length} of the ${rows.length} labelled breads we track carry a sesame line.`;
  const how = decl.length === 0
    ? " None of them declares sesame as an ingredient — every one of those lines is the precautionary kind."
    : ` ${decl.map((r) => r.key).join(" and ")} ${decl.length === 1 ? "declares" : "declare"} it; the rest are precautionary.`;
  const exc = miss.length ? ` The exception is ${miss.map((r) => `${r.key.toLowerCase()} (${r.product})`).join(" and ")}, which mentions no sesame at all.` : "";
  return head + how + exc;
}

/** 빵 표 — 재료 · 상품 · 라벨이 참깨에 대해 하는 말. */
export const breadTable = () =>
  breadRows().map((r) => `| ${r.key} | ${r.product} | ${r.status === "declares" ? "Contains sesame" : r.status === "warns" ? "May contain sesame" : "No mention"} |`).join("\n");

const sesameHit = (m: MenuItem) => dietViolations(m.ingredients, SESAME).length > 0;
const declaredHit = (m: MenuItem) => m.ingredients.some((i) => declares(i, "sesame"));

/** 참깨 필터에서 남는 메인과 빠지는 메인(빠지는 이유 둘로 가른다). */
export function sesameMains() {
  const dropped = MENUS.filter(sesameHit);
  return {
    kept: MENUS.length - dropped.length,
    total: MENUS.length,
    declared: dropped.filter(declaredHit).map((m) => m.name),
    unverified: dropped.filter((m) => !declaredHit(m)).map((m) => m.name),
  };
}

/** 남는 메인 중 「may contain sesame」 재료가 있어 ⚠가 붙는 것. */
export const keptWithWarning = () =>
  MENUS.filter((m) => !sesameHit(m) && m.ingredients.some((i) => !declares(i, "sesame") && warnsAbout(i, "sesame"))).length;

/** 참깨 + 킨디를 같이 켰을 때 남는 메인. */
export const keptWithKindy = () => MENUS.filter((m) => !sesameHit(m) && !menuExclusion(m.ingredients)).length;

/** 라벨 없어 확인 못 하는 재료(필터가 뺀다) — 글이 그대로 나열한다. */
export const unverifiedList = () => [...SESAME_UNVERIFIED].sort();

/**
 * 다른 곳에서는 흔히 참깨가 들어가지만 **우리 레시피에는 없어서** 필터를 통과하는 메인.
 * 이름 목록은 손으로 적은 후보이고, 실제로 통과하는지는 데이터가 거른다.
 */
const OFTEN_SESAME_ELSEWHERE = ["Fried Rice", "Sushi Rolls", "Dumplings", "Chicken Satay", "Rice Paper Rolls", "Rice Balls (Onigiri)"];
export const passesButOftenSesame = () =>
  OFTEN_SESAME_ELSEWHERE.filter((n) => {
    const m = MENUS.find((x) => x.name === n);
    return m && !sesameHit(m);
  });

/** 「may contain」까지 빼면 남는 메인 — 그 선택을 안 한 이유를 숫자로 말한다. */
export const keptIfWarningsExcluded = () => sesameMains().kept - keptWithWarning();

/** 남는 샌드위치 메인과 그중 ⚠가 붙는 것 — 「주의까지 빼면 샌드위치가 사라진다」를 숫자로. */
export function sandwichWarning() {
  const kept = MENUS.filter((m) => m.category === "Sandwich" && !sesameHit(m));
  const warned = kept.filter((m) => m.ingredients.some((i) => !declares(i, "sesame") && warnsAbout(i, "sesame")));
  return { kept: kept.length, warned: warned.length };
}

