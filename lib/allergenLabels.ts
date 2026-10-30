import PRICES from "@/data/price_cache.json";

/**
 * 추적 상품의 **알레르겐 라벨**을 읽는다.
 *
 * 🔴 왜 생겼나 (2026-08-23) — 재료명 전수 대조에서 셋이 식이 표시와 정면으로 어긋났다:
 *    · `Muesli (Nut-free)` → 견과류 경고가 붙은 뮤즐리 (**Woolworths 30종 전부 그렇다**)
 *    · `Sesame Oil` → 미강유 (참깨는 declarable allergen인데 참깨가 안 든 기름이었다)
 *    · `Vegan Mayo` → 달걀이 든 일반 마요네즈
 *    기존 안전장치는 **상품명 토큰**만 봤다(`avoidTokensFor`). 이름에 "almond"가 없으면
 *    통과한다. 라벨은 상품 API가 주는데 아무도 안 읽고 있었다.
 *
 * 🔴 필드가 일관되지 않다. 실제로 관측된 형태:
 *      ["Gluten, Wheat"]                                   ← 선언만
 *      ["Allergens: Gluten, Milk, Sesame"]                 ← 접두어가 붙는다
 *      ["Contains: Gluten, May be present: Egg, Milk"]     ← **한 문자열에 둘 다**
 *      ["May contain traces of Tree Nuts"]                 ← 주의만인데 선언 필드에 있다
 *      ["Processed in a facility that also processes ..."] ← 교차오염 문구
 *    그래서 문자열을 **"주의" 경계에서 자른 뒤** 앞을 선언, 뒤를 주의로 읽는다.
 */

type Entry = { data?: { name?: string; allergens?: string[]; allergenMaybePresent?: string } };
const CACHE = PRICES as Record<string, Entry>;

/** "may be present" 계열 — 여기서부터 뒤는 선언이 아니라 주의다. */
const PRECAUTION_BOUNDARY =
  /\b(may\s+(be\s+present|contain)|(processed|packed|packaged|manufactured)\s+in\s+a\s+(facility|plant|site)|made\s+(on|in)\s+a?\s*(line|factory|facility|plant|equipment)|made\s+on\s+equipment|traces\s+of)\b/i;

export type Label = { declared: string; precautionary: string };

export function labelFor(ingredient: string): Label | null {
  const d = CACHE[ingredient]?.data;
  if (!d) return null;
  const joined = (d.allergens ?? []).join("; ");
  if (!joined && !d.allergenMaybePresent) return null;
  const m = PRECAUTION_BOUNDARY.exec(joined);
  const declared = (m ? joined.slice(0, m.index) : joined).replace(/^\s*(allergens?|contains?)\s*:?\s*/i, "");
  const tail = m ? joined.slice(m.index) : "";
  return { declared, precautionary: [tail, d.allergenMaybePresent ?? ""].filter(Boolean).join("; ") };
}

/** 알레르겐 이름 → 라벨에서 찾을 정규식. 학교 도시락에서 실제로 문제되는 것만. */
export const ALLERGEN_PATTERNS: Record<string, RegExp> = {
  nuts: /\b(nut|nuts|almond|peanut|peanuts|cashew|hazelnut|macadamia|walnut|pecan|pistachio|brazil)\b/i,
  milk: /\b(milk|dairy)\b/i,
  egg: /\b(egg|eggs)\b/i,
  gluten: /\b(gluten|wheat)\b/i,
  sesame: /\bsesame\b/i,
};

export const declares = (ingredient: string, allergen: keyof typeof ALLERGEN_PATTERNS) => {
  const l = labelFor(ingredient);
  return !!l && ALLERGEN_PATTERNS[allergen].test(l.declared);
};

export const warnsAbout = (ingredient: string, allergen: keyof typeof ALLERGEN_PATTERNS) => {
  const l = labelFor(ingredient);
  return !!l && ALLERGEN_PATTERNS[allergen].test(l.precautionary);
};

/** 라벨을 실제로 들고 있는 재료 수 — 양성 대조용. */
export const labelledCount = () =>
  Object.keys(CACHE).filter((k) => labelFor(k) !== null).length;
