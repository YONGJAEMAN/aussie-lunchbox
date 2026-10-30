import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import menuData from "@/data/menuData.json";
import { dietViolations, snackAllowed, AU_REVIEW } from "./ingredientDiet";
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

/**
 * Aussie(2026-10-30, 사용자 승인 판정표 `data/allergenReview.au.json`)에서 참깨가 걸린 재료.
 * 🔴 Kiwi와 다른 점: Teriyaki는 AU 선언 필드에 참깨가 없지만 **원재료에 Sesame Seeds·Sesame Oil**이 있다.
 *    빵 다섯(Roll·Ciabatta·Croissant·Muffin·Pastry Cases)은 참깨가 「may contain」뿐이라 **거르지 않고 ⚠**(사용자 결정).
 */
const DECLARES_SESAME = [
  "Bao Buns", "Breadcrumbs", "Breadsticks", "Burger Bun", "Hummus",
  "Sesame Oil", "Teriyaki Sauce", "Wholegrain Crackers",
];
/** Kiwi에선 라벨이 없어 걸었던 빵들 — AU는 라벨이 있고 참깨는 주의뿐이다. */
const UNVERIFIED: string[] = [];
const WARN_ONLY_BREADS = ["Ciabatta", "Croissant", "Muffin", "Pastry Cases", "Roll"];

const EXCLUDED_MAINS = [
  "Veggie Wrap", "Teriyaki Chicken & Rice", "Mini Meatballs", "Veggie Sticks & Hummus Box", "Falafel Wrap",
  "Beef Burger", "Noodle Stir-fry", "Popcorn Chicken", "Falafel Pita Pocket", "Corn Tortilla Veggie Wrap",
  "Bulgogi Rice Bento", "Char Siu Bao",
];
const EXCLUDED_SNACKS = ["Breadsticks", "Hummus & Veg", "Wholegrain Crackers"];

const SESAME: AllergyType[] = ["Sesame Allergy"];
const BAD = new Set([...DECLARES_SESAME, ...UNVERIFIED]);
const stubPrices = async (ings: string[]): Promise<PriceInfo[]> =>
  ings.map((name) => ({ name, price: 2, image: "", source: "test" }));

describe("🔴 참깨 필터 — 분류가 승인한 표와 같다", () => {
  it("참깨가 걸린 재료가 승인한 리터럴 8개와 같다", () => {
    const found = Object.keys(AU_REVIEW).filter((k) => AU_REVIEW[k].tags?.includes("sesame")).sort();
    expect(found).toEqual([...DECLARES_SESAME].sort());
  });

  it("메인 94개 중 빠지는 12개가 리터럴과 같다 — 82개가 남는다", () => {
    const out = MENUS.filter((m) => dietViolations(m.ingredients, SESAME).length > 0).map((m) => m.name).sort();
    expect(out).toEqual([...EXCLUDED_MAINS].sort());
    expect(MENUS.length - out.length).toBe(82);
  });

  it("간식 41개 중 빠지는 3개가 리터럴과 같다 — 38개가 남는다", () => {
    const out = ALL_SNACKS.filter((s) => !snackAllowed(s, SESAME)).map((s) => s.name).sort();
    expect(out).toEqual([...EXCLUDED_SNACKS].sort());
    expect(ALL_SNACKS.length - out.length).toBe(38);
  });

  it("참깨 주의뿐인 빵은 거르지 않는다 — 다른 필터 판정도 그대로다(Aussie 10-30 결정)", () => {
    for (const a of ["Nut Allergy", "Dairy Allergy", "Gluten Allergy", "Egg Allergy"] as AllergyType[]) {
      expect(dietViolations(["Roll"], [a]).some((v) => v.reason === "unknown"), `${a}: Roll이 모르는 재료가 됐다`).toBe(false);
    }
    expect(dietViolations(["Roll"], ["Nut Allergy"])).toEqual([]);
    for (const b of WARN_ONLY_BREADS) expect(dietViolations([b], SESAME), b).toEqual([]);
    // 🔴 Teriyaki는 선언 필드가 아니라 원재료로 걸렸다 — 선언만 보던 때로 돌아가면 여기서 깨진다
    expect(dietViolations(["Teriyaki Sauce"], SESAME).length).toBe(1);
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
