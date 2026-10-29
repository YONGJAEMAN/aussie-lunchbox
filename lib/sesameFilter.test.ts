import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import menuData from "@/data/menuData.json";
import PRICES from "@/data/price_cache.json";
import { declares } from "./allergenLabels";
import { dietViolations, snackAllowed } from "./ingredientDiet";
import { buildWeeklyPlan, buildSharedPlan } from "./planGenerator";
import { encodeSharedPlan, decodeSharedPlan, SHARE_ALLERGIES } from "./planShare";
import type { AllergyType, MenuItem, PriceInfo, SnackData } from "./types";

/**
 * 「Sesame Allergy」 (2026-10-22, Bucklands Beach Ohui-a-rangi Playcentre 요청).
 *
 * 🔴 기대값은 필터 코드에서 뽑지 않는다 — 승인한 분류를 **여기 리터럴로** 적는다
 *    (guard-expectations-from-same-source). 데이터가 바뀌면 여기서 멈추고 다시 본다.
 *    메인은 손 태그가 없어 재료 라벨로 판정한다: 선언 재료 9개 + 라벨 없어 확인 못 하는 7개.
 */
const RAW = menuData as unknown as { MENU_DATA: { en: MenuItem[] }; SNACK_DATA: SnackData };
const MENUS = RAW.MENU_DATA.en;
const SNACKS = RAW.SNACK_DATA;
const ALL_SNACKS = Object.values(SNACKS).flat();

/** 추적 상품 라벨이 참깨를 **선언**하는 재료(2026-10-22 실측). */
const DECLARES_SESAME = [
  "Bao Buns", "Curry Spices", "GF Crackers", "Hoisin Sauce", "Hummus",
  "Sesame Oil", "Tahini", "Teriyaki Sauce", "Wholegrain Crackers",
];
/** 라벨이 없어 참깨를 확인할 수 없는 재료 — 걸린 것으로 본다. */
const UNVERIFIED = ["Breadcrumbs", "Ciabatta", "Croissant", "Muffin", "Pastry Cases", "Roll", "Spices"];

const EXCLUDED_MAINS = [
  // 선언 재료
  "Veggie Wrap", "Teriyaki Chicken & Rice", "Veggie Sticks & Hummus Box", "Falafel Wrap", "Noodle Stir-fry",
  "Falafel Pita Pocket", "Corn Tortilla Veggie Wrap", "Vegetable Samosa", "Bulgogi Rice Bento", "Char Siu Bao",
  // 확인 못 하는 재료
  "Mini Meatballs", "Popcorn Chicken", "Chicken Pesto Panini", "Ham & Cheese Croissant",
  "Mini Spinach Quiche", "Roast Beef Roll", "Chilli con Carne",
];
const EXCLUDED_SNACKS = ["Hummus & Veg", "Wholegrain Crackers", "Mini Muffin", "Roasted Chickpeas"];

const SESAME: AllergyType[] = ["Sesame Allergy"];
const BAD = new Set([...DECLARES_SESAME, ...UNVERIFIED]);
const stubPrices = async (ings: string[]): Promise<PriceInfo[]> =>
  ings.map((name) => ({ name, price: 2, image: "", source: "test" }));

describe("🔴 참깨 필터 — 분류가 승인한 표와 같다", () => {
  it("참깨를 선언하는 추적 재료가 리터럴 9개와 같다", () => {
    const found = Object.keys(PRICES).filter((k) => declares(k, "sesame")).sort();
    expect(found).toEqual([...DECLARES_SESAME].sort());
  });

  it("메인 94개 중 빠지는 17개가 리터럴과 같다 — 77개가 남는다", () => {
    const out = MENUS.filter((m) => dietViolations(m.ingredients, SESAME).length > 0).map((m) => m.name).sort();
    expect(out).toEqual([...EXCLUDED_MAINS].sort());
    expect(MENUS.length - out.length).toBe(77);
  });

  it("간식 41개 중 빠지는 4개가 리터럴과 같다 — 37개가 남는다", () => {
    const out = ALL_SNACKS.filter((s) => !snackAllowed(s, SESAME)).map((s) => s.name).sort();
    expect(out).toEqual([...EXCLUDED_SNACKS].sort());
    expect(ALL_SNACKS.length - out.length).toBe(37);
  });

  it("다른 필터의 판정은 참깨 때문에 바뀌지 않는다 — 확인 못 하는 빵은 참깨 필터에서만 걸린다", () => {
    for (const a of ["Nut Allergy", "Dairy Allergy", "Gluten Allergy", "Egg Allergy"] as AllergyType[]) {
      expect(dietViolations(["Roll"], [a]).some((v) => v.reason === "unknown"), `${a}: Roll이 모르는 재료가 됐다`).toBe(false);
    }
    expect(dietViolations(["Roll"], ["Nut Allergy"])).toEqual([]);
    expect(dietViolations(["Roll"], SESAME).length).toBe(1);
  });
});

describe("🔴 참깨 식단 — 생성·공유 어느 경로로도 참깨 재료가 안 나온다", () => {
  const COMBOS: AllergyType[][] = [SESAME, ["Sesame Allergy", "Kindy"], ["Sesame Allergy", "Gluten Allergy"]];

  it("50번씩 생성: 뺀 메인·간식·재료 0 · ⚠ 참깨(주의 표시)는 실제로 뜬다", async () => {
    let days = 0, warned = 0;
    for (const allergies of COMBOS) {
      for (let n = 0; n < 50; n++) {
        const plan = await buildWeeklyPlan(MENUS, allergies, [], [], "", SNACKS, stubPrices);
        for (const d of plan.planData) {
          days++;
          expect(EXCLUDED_MAINS, `${allergies}: ${d.menuName}`).not.toContain(d.menuName);
          expect(d.rawIngredients.filter((i) => BAD.has(i)), d.menuName).toEqual([]);
          for (const s of d.snacks) {
            expect(EXCLUDED_SNACKS, s.name).not.toContain(s.name);
            expect((s.ingredients ?? []).filter((i) => BAD.has(i)), s.name).toEqual([]);
          }
          if ((d.mayContain ?? []).some((x) => x.allergy === "Sesame Allergy")) warned++;
        }
      }
    }
    expect(days).toBe(COMBOS.length * 50 * 5);
    expect(warned, "참깨 ⚠가 한 번도 안 떴다 — 빵류 주의 표시가 사라졌다").toBeGreaterThan(0);
  });

  it("양성 대조: 참깨를 끄면 뺀 메인이 실제로 나온다", async () => {
    const seen = new Set<string>();
    for (let n = 0; n < 60; n++) {
      const plan = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stubPrices);
      for (const d of plan.planData) seen.add(d.menuName);
    }
    expect(EXCLUDED_MAINS.filter((m) => seen.has(m)).length).toBeGreaterThan(3);
  });

  it("공유 링크: 참깨는 인덱스 7 · 링크가 왕복하고, 뺀 메인을 넣은 링크는 거절한다", async () => {
    expect(SHARE_ALLERGIES[7]).toBe("Sesame Allergy");
    const ok = MENUS.filter((m) => !EXCLUDED_MAINS.includes(m.name)).slice(0, 5);
    const base = { allergies: SESAME, excluded: [], prepStyles: [], thermosOnly: false, useSales: false, saleStores: [] };
    const decoded = decodeSharedPlan(encodeSharedPlan({ ...base, days: ok.map((m) => ({ menu: m.name, snacks: ["Grapes"] })) })!)!;
    expect(decoded.allergies).toEqual(SESAME);
    const opened = await buildSharedPlan(MENUS, SNACKS, decoded, stubPrices);
    expect(opened.planData.map((d) => d.menuName)).toEqual(ok.map((m) => m.name));

    const bad = { ...base, days: ["Teriyaki Chicken & Rice", ...ok.slice(1).map((m) => m.name)].map((menu) => ({ menu, snacks: [] })) };
    await expect(buildSharedPlan(MENUS, SNACKS, decodeSharedPlan(encodeSharedPlan(bad)!)!, stubPrices)).rejects.toThrow();
  });
});

describe("🔴 화면 — 버튼과 세 언어 라벨이 있다", () => {
  it("플래너 선택지에 Sesame Allergy가 있고, 라벨·⚠ 낱말이 en/ko/zh에 있다", () => {
    const src = readFileSync("components/PlannerClient.tsx", "utf8");
    expect(src).toMatch(/"Egg Allergy", "Sesame Allergy", "Vegetarian"/);
    for (const lang of ["en", "ko", "zh"]) {
      const m = JSON.parse(readFileSync(`messages/${lang}.json`, "utf8"));
      expect(m.planner_allergy_sesame, lang).toBeTruthy();
      expect(m.planner_may_contain_sesame, lang).toBeTruthy();
    }
  });
});
