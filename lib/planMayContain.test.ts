import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildWeeklyPlan, swapPlanDay, buildSharedPlan } from "./planGenerator";
import { mayContainNotes, dayMayContain } from "./ingredientDiet";
import { checkerRows } from "./snackChecker";
import type { AllergyType, MenuItem, PlanItem, PriceInfo, SnackData, SnackItem } from "./types";

/**
 * 플래너 카드의 ⚠ 「may contain」 (2026-09-29).
 *
 * 🔴 기대값은 `allergenLabels`·`ingredientDiet`를 거치지 않고 **JSON 원본을 직접 읽어** 만든다.
 *    같은 헬퍼로 기대값을 뽑으면 헬퍼가 틀려도 초록이다(guard-expectations-from-same-source).
 */

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf-8");
const RAW_MENU = JSON.parse(read("data/menuData.json")) as { MENU_DATA: { en: MenuItem[] }; SNACK_DATA: SnackData };
const RAW_PRICES = JSON.parse(read("data/price_cache.json")) as Record<
  string, { data?: { allergens?: string[]; allergenMaybePresent?: string } }
>;
const MENUS = RAW_MENU.MENU_DATA.en;
const SNACKS = RAW_MENU.SNACK_DATA;

/** 주의 문구가 시작하는 자리 — `allergenLabels.ts`의 정규식을 가져오지 않고 따로 적는다. */
const CAUTION = /may\s+be\s+present|may\s+contain|traces\s+of|(processed|packed|packaged|manufactured)\s+in\s+a|made\s+(on|in)\s+a|made\s+on\s+equipment/i;
const WORDS: Record<string, RegExp> = {
  "Gluten Allergy": /\b(gluten|wheat)\b/i,
  "Nut Allergy": /\b(nuts?|almond|peanuts?|cashew|hazelnut|macadamia|walnut|pecan|pistachio|brazil)\b/i,
  "Dairy Allergy": /\b(milk|dairy)\b/i,
  "Egg Allergy": /\beggs?\b/i,
};

/** 원본에서 직접: 선언 쪽엔 없고 주의 쪽에만 그 알레르겐이 있는가. */
function rawWarns(ingredient: string, allergy: AllergyType): boolean {
  const d = RAW_PRICES[ingredient]?.data;
  if (!d) return false;
  const joined = (d.allergens ?? []).join("; ");
  const at = joined.search(CAUTION);
  const declared = at >= 0 ? joined.slice(0, at) : joined;
  const caution = `${at >= 0 ? joined.slice(at) : ""} ${d.allergenMaybePresent ?? ""}`;
  return !WORDS[allergy].test(declared) && WORDS[allergy].test(caution);
}

const FLAG: Record<string, keyof MenuItem> = {
  "Gluten Allergy": "is_gluten_free",
  "Nut Allergy": "is_nut_free",
  "Dairy Allergy": "is_dairy_free",
  "Egg Allergy": "is_egg_free",
};

/** 필터를 통과하는 메인 → 원본에서 뽑은 ⚠ 재료. */
function expectedMains(allergy: AllergyType): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const m of MENUS.filter((x) => x[FLAG[allergy]] === true)) {
    const hits = [...new Set(m.ingredients)].filter((i) => rawWarns(i, allergy)).sort();
    if (hits.length) out.set(m.name, hits);
  }
  return out;
}

const expectedDay = (main: string[], snacks: SnackItem[], allergy: AllergyType) => [
  ...[...new Set(main)].filter((i) => rawWarns(i, allergy)).map((i) => `${i}|`),
  ...snacks.flatMap((s) => [...new Set(s.ingredients)].filter((i) => rawWarns(i, allergy)).map((i) => `${i}|${s.name}`)),
].sort();

const actualDay = (d: PlanItem) => (d.mayContain ?? []).map((n) => `${n.ingredient}|${n.snack ?? ""}`).sort();

const stubPrices = async (ings: string[]): Promise<PriceInfo[]> =>
  ings.map((name) => ({ name, price: 2, image: "", source: "test" }));

const GF: AllergyType[] = ["Gluten Allergy"];

describe("🔴 ⚠ may contain — 원본 라벨과 같은 재료를 짚는다", () => {
  it("글루텐 필터: 오늘 관측된 네 메인과 그 재료 (라벨이 바뀌면 새 관측으로 고칠 것)", () => {
    const exp = expectedMains("Gluten Allergy");
    expect(Object.fromEntries(exp)).toEqual({
      // Aussie 10-30 관측: AU Salsa는 글루텐 주의가 없고(NZ Old El Paso는 있었다) AU 붉은 렌틸이 있다
      "Vegetable Curry": ["Chickpeas", "Curry Paste"],
      Nachos: ["Kidney Beans"],
      "Chilli con Carne": ["Kidney Beans"],
      "Lentil Soup": ["Red Lentils"],
    });
  });

  it.each(Object.keys(FLAG) as AllergyType[])("%s — 필터를 통과하는 메인 전부에서 헬퍼 = 원본", (a) => {
    const exp = expectedMains(a);
    const bad: string[] = [];
    for (const m of MENUS.filter((x) => x[FLAG[a]] === true)) {
      const got = mayContainNotes(m.ingredients, [a]).map((n) => n.ingredient).sort();
      if (JSON.stringify(got) !== JSON.stringify(exp.get(m.name) ?? [])) bad.push(`${m.name}: ${got} ≠ ${exp.get(m.name) ?? []}`);
    }
    expect(bad).toEqual([]);
  });

  it("주의 문구가 없는 메인은 ⚠가 없다 — 음성 대조", () => {
    const clean = MENUS.filter((m) => m.is_gluten_free && !m.ingredients.some((i) => rawWarns(i, "Gluten Allergy")));
    expect(clean.length, "음성 대조 메인이 0개 — 가드가 빈 집합이다").toBeGreaterThan(0);
    for (const m of clean) expect(mayContainNotes(m.ingredients, GF), m.name).toEqual([]);
  });

  /**
   * 🔴 선언과 주의 **둘 다** 글루텐을 적은 상품이어야 이 가드가 뭔가를 본다(Rolled Oats: 「Gluten | Wheat」).
   *    선언만 한 상품으로 걸었더니 `!declares`를 지운 돌연변이가 살아남았다.
   */
  it("선언까지 한 재료는 ⚠가 아니다 — 필터가 이미 거른다", () => {
    const both = Object.keys(RAW_PRICES).filter((k) => {
      const d = RAW_PRICES[k].data ?? {};
      const joined = (d.allergens ?? []).join("; ");
      const at = joined.search(CAUTION);
      const declared = at >= 0 ? joined.slice(0, at) : joined;
      const caution = `${at >= 0 ? joined.slice(at) : ""} ${d.allergenMaybePresent ?? ""}`;
      return WORDS["Gluten Allergy"].test(declared) && WORDS["Gluten Allergy"].test(caution);
    });
    expect(both.length, "선언·주의 둘 다 글루텐인 추적 상품이 없다 — 가드가 빈 집합이다").toBeGreaterThan(0);
    for (const k of both) expect(mayContainNotes([k], GF), k).toEqual([]);
  });

  it("알레르기를 안 고르거나 채식·비건만이면 ⚠가 없다", () => {
    const nachos = MENUS.find((m) => m.name === "Nachos")!;
    expect(mayContainNotes(nachos.ingredients, [])).toEqual([]);
    expect(mayContainNotes(nachos.ingredients, ["Vegetarian", "Vegan"])).toEqual([]);
  });

  it("간식 쪽 ⚠는 /snack-checker의 ⚠와 같다", () => {
    const rows = new Map(checkerRows().map((r) => [r.name, r]));
    const snacks = [...(SNACKS["Fruit & Veg"] ?? []), ...(SNACKS["Protein & Dairy"] ?? []), ...(SNACKS["Savoury Crunch"] ?? [])];
    let warned = 0;
    for (const s of snacks) {
      const onCard = dayMayContain([], [s], GF).length > 0;
      if (onCard) warned++;
      expect(onCard, s.name).toBe(rows.get(s.name)!.mayContain["Gluten Allergy"]);
    }
    expect(warned, "글루텐 주의가 붙은 간식이 하나도 없다 — 양성 대조가 비었다").toBeGreaterThan(0);
  });
});

describe("🔴 생성·교체·공유 — 모든 경로의 하루에 ⚠가 실린다", () => {
  it("글루텐 필터로 만든 주: 네 메인이 나올 때까지 돌려 매일 원본 기대값과 같다", async () => {
    const want = new Set(expectedMains("Gluten Allergy").keys());
    const seen = new Set<string>();
    for (let n = 0; n < 400 && seen.size < want.size; n++) {
      const plan = await buildWeeklyPlan(MENUS, GF, [], [], "", SNACKS, stubPrices);
      for (const d of plan.planData) {
        expect(actualDay(d), `${d.menuName} / ${d.snacks.map((s) => s.name)}`).toEqual(
          expectedDay(d.rawIngredients, d.snacks, "Gluten Allergy"),
        );
        expect((d.mayContain ?? []).every((x) => x.allergy === "Gluten Allergy")).toBe(true);
        if (want.has(d.menuName)) seen.add(d.menuName);
      }
    }
    // 필터는 그대로다 — ⚠ 메인이 빠지지 않고 실제로 나온다
    expect([...seen].sort()).toEqual([...want].sort());
  });

  it("공유 링크로 연 주에도 실린다", async () => {
    const plan = await buildSharedPlan(MENUS, SNACKS, {
      days: ["Nachos", "Lentil Soup", "Chilli con Carne", "Vegetable Curry", "Nachos"].map((menu) => ({ menu, snacks: [] })),
      allergies: GF, excluded: [], prepStyles: [], thermosOnly: false, useSales: false, saleStores: [],
    }, stubPrices);
    for (const d of plan.planData) expect(actualDay(d)).toEqual(expectedDay(d.rawIngredients, [], "Gluten Allergy"));
    expect(plan.planData.every((d) => (d.mayContain ?? []).length > 0)).toBe(true);
  });

  it("하루 교체 뒤에도 다섯 날 전부 다시 계산된다", async () => {
    const week = ["Nachos", "Lentil Soup", "Chilli con Carne", "Vegetable Curry"].map((menu) => ({ menu, snacks: [] as string[] }));
    const fifth = MENUS.find((m) => m.is_gluten_free && !week.some((w) => w.menu === m.name))!;
    const plan = await swapPlanDay(MENUS, SNACKS, [...week, { menu: fifth.name, snacks: [] }], 4, {
      allergies: GF, excluded: [], favorites: [], leftover: "",
    }, stubPrices);
    for (const d of plan.planData) {
      expect(actualDay(d)).toEqual(expectedDay(d.rawIngredients, d.snacks, "Gluten Allergy"));
    }
    expect(plan.planData.slice(0, 4).every((d) => (d.mayContain ?? []).length > 0)).toBe(true);
  });

  it("알레르기 없이 만든 주에는 필드가 없다", async () => {
    const plan = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stubPrices);
    expect(plan.planData.every((d) => d.mayContain === undefined)).toBe(true);
  });

  it("저장분 복원도 같은 함수로 다시 낸다 — 옛 저장분엔 필드가 없다", () => {
    const src = read("components/PlannerClient.tsx");
    expect(src).toMatch(/dayMayContain\(d\.rawIngredients \?\? \[\], d\.snacks \?\? \[\], opts\.allergies\)/);
    expect(src).toMatch(/item\.mayContain\.map/);
  });
});
