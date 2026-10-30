import { describe, it, expect } from "vitest";
import menuData from "../data/menuData.json";
import {
  buildWeeklyPlan, swapPlanDay, buildSharedPlan, PlanInputError,
  costForIngredients, saleMapFor, priceDay, weekTotalFrom, activePromotionsFor,
} from "./planGenerator";
import { pricedMenuMatches } from "./promotions";
import { dietViolations } from "./ingredientDiet";
import { estimateMenuCalories, estimateSnackCalories } from "./nutritionCalc";
import { encodeSharedPlan, decodeSharedPlan, SHARE_PARAM_MAX, type SharedPlan } from "./planShare";
import type { AllergyType, MenuItem, PlanItem, PrepStyle, PriceInfo, SnackData, GeneratePlanResponse } from "./types";
import type { StoreId } from "@/data/promotions.types";

/**
 * 하루 교체 · 공유 링크 (2026-09-29).
 *
 * 🔴 필터 통과 여부는 생성기의 `filterMenus`로 재지 않는다 — 검사 대상과 같은 원본에서
 *    기대값을 뽑으면 둘이 같이 틀려도 초록이다. 메뉴 플래그를 여기서 따로 읽는다.
 */
const raw = menuData as unknown as { MENU_DATA: { en: MenuItem[] }; SNACK_DATA: SnackData };
const MENUS = raw.MENU_DATA.en;
const SNACKS = raw.SNACK_DATA;
const BY_NAME = new Map(MENUS.map((m) => [m.name, m]));

/** 「Kindy」는 메뉴 플래그가 아니라 질식 표로 거른다 — `lib/kindyChoking.test.ts`가 따로 본다.
 *  「Sesame Allergy」는 메뉴 플래그가 없다(재료 라벨로 판정) — `lib/sesameFilter.test.ts`가 따로 본다. */
const FLAG: Record<Exclude<AllergyType, "Kindy" | "Sesame Allergy">, keyof MenuItem> = {
  "Nut Allergy": "is_nut_free",
  "Dairy Allergy": "is_dairy_free",
  "Gluten Allergy": "is_gluten_free",
  "Egg Allergy": "is_egg_free",
  Vegetarian: "is_vegetarian",
  Vegan: "is_vegan",
};

type Case = {
  allergies: AllergyType[];
  excluded: string[];
  prepStyles: PrepStyle[];
  thermosOnly: boolean;
  useSales: boolean;
};

function menuPasses(m: MenuItem, c: Case): boolean {
  if (!c.allergies.every((a) => a !== "Kindy" && a !== "Sesame Allergy" && m[FLAG[a]] === true)) return false;
  if (c.excluded.some((x) => m.ingredients.includes(x))) return false;
  if (c.prepStyles.length && !c.prepStyles.includes(m.prep_style as PrepStyle)) return false;
  if (c.thermosOnly && !m.is_thermos) return false;
  return true;
}

/** 재료마다 다른 값 — 전부 5달러면 다른 메뉴로 바뀌어도 원가가 우연히 같아진다. */
function stubPrice(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 1 + (h % 900) / 100;
}
let priceCalls = 0;
const stubPrices = async (ings: string[]): Promise<PriceInfo[]> => {
  priceCalls++;
  return ings.map((name) => ({ name, price: stubPrice(name), image: "", source: "test" }));
};

const STORES: StoreId[] = ["woolworths", "coles"];
const saleOpts = (c: Case) => (c.useSales ? { useSales: true, saleStores: STORES } : undefined);
const prepOpts = (c: Case) =>
  c.prepStyles.length || c.thermosOnly ? { prepStyles: c.prepStyles, thermosOnly: c.thermosOnly } : undefined;

const CASES: Case[] = [
  { allergies: [], excluded: [], prepStyles: [], thermosOnly: false, useSales: false },
  { allergies: [], excluded: [], prepStyles: [], thermosOnly: false, useSales: true },
  { allergies: ["Nut Allergy"], excluded: ["Cheese"], prepStyles: [], thermosOnly: false, useSales: true },
  { allergies: ["Nut Allergy", "Dairy Allergy"], excluded: ["Chicken", "Egg"], prepStyles: [], thermosOnly: false, useSales: false },
  { allergies: ["Gluten Allergy"], excluded: [], prepStyles: ["no-cook", "make-ahead"], thermosOnly: false, useSales: true },
  { allergies: ["Vegetarian"], excluded: ["Tomato"], prepStyles: [], thermosOnly: false, useSales: true },
  { allergies: ["Egg Allergy"], excluded: [], prepStyles: ["cook-fresh"], thermosOnly: false, useSales: false },
];

const weekOf = (p: GeneratePlanResponse) =>
  p.planData.map((d) => ({ menu: d.menuName, snacks: d.snacks.map((s) => s.name) }));

async function generate(c: Case) {
  return buildWeeklyPlan(MENUS, c.allergies, c.excluded, [], "", SNACKS, stubPrices, saleOpts(c), prepOpts(c));
}

async function swap(c: Case, plan: GeneratePlanResponse, day: number) {
  return swapPlanDay(
    MENUS, SNACKS, weekOf(plan), day,
    { allergies: c.allergies, excluded: c.excluded, prepOptions: prepOpts(c), favorites: [], leftover: "", saleOptions: saleOpts(c) },
    stubPrices,
  );
}

/** 「보통 가격 경로」— 생성기 이전부터 있던 두 함수를 직접 부른다. */
function normalCost(item: PlanItem, prices: Record<string, PriceInfo>, c: Case): number {
  const all = [...item.rawIngredients, ...item.snacks.flatMap((s) => s.ingredients ?? [])];
  const promos = activePromotionsFor(saleOpts(c));
  const matches = promos.length ? pricedMenuMatches(all, promos) : [];
  return costForIngredients(all, new Map(Object.entries(prices)), saleMapFor(matches)).cost;
}

describe("하루 교체 — swapPlanDay", () => {
  it("🔴 여러 필터·시드에서: 필터 통과 · 원래와 다름 · 중복 없음 · 원가·합계·장보기가 생성과 같은 식", async () => {
    let checked = 0;
    for (let run = 0; run < 140; run++) {
      const c = CASES[run % CASES.length];
      const plan = await generate(c);
      const day = run % 5;
      const next = await swap(c, plan, day);
      const before = plan.planData[day];
      const after = next.planData[day];
      const menu = BY_NAME.get(after.menuName)!;

      expect(menu, `${after.menuName}: 모르는 메뉴`).toBeTruthy();
      expect(menuPasses(menu, c), `${after.menuName}가 ${JSON.stringify(c)}를 어긴다`).toBe(true);
      const snackIngs = after.snacks.flatMap((s) => s.ingredients ?? []);
      expect(dietViolations(snackIngs, c.allergies), `${after.day} 간식`).toEqual([]);
      expect(snackIngs.filter((i) => c.excluded.includes(i)), `${after.day} 간식에 뺀 재료`).toEqual([]);

      expect(after.menuName, "바꿨는데 같은 메뉴다").not.toBe(before.menuName);
      const others = next.planData.filter((_, i) => i !== day).map((d) => d.menuName);
      expect(others, `${after.menuName}가 다른 날과 겹친다`).not.toContain(after.menuName);

      // 나머지 네 날은 그대로
      for (let i = 0; i < 5; i++) {
        if (i === day) continue;
        expect(next.planData[i].menuName).toBe(plan.planData[i].menuName);
        expect(next.planData[i].snacks.map((s) => s.name)).toEqual(plan.planData[i].snacks.map((s) => s.name));
        expect(next.planData[i].estCostValue).toBeCloseTo(plan.planData[i].estCostValue!, 10);
      }

      // 원가 = 보통 경로 · 열량 = 생성과 같은 추정
      for (const d of next.planData) {
        expect(d.estCostValue!, `${d.day} 원가`).toBeCloseTo(normalCost(d, next.prices, c), 10);
        expect(d.estCost).toBe(`$${d.estCostValue!.toFixed(2)}`);
      }
      expect(after.nutrition.calories).toBe(
        estimateMenuCalories(menu.ingredients) + estimateSnackCalories(after.snacks),
      );

      // 주간 합계 = 날의 합, 장보기 = 생성과 같은 모음(날마다 간식 재료 → 메인 재료)
      const sum = next.planData.reduce((t, d) => t + d.estCostValue!, 0);
      expect(weekTotalFrom(next.planData)!).toBeCloseTo(sum, 10);
      expect(next.totalWeekCost).toBe(Number(sum.toFixed(2)));
      expect(next.shoppingList).toEqual(
        next.planData.flatMap((d) => [...d.snacks.flatMap((s) => s.ingredients ?? []), ...d.rawIngredients]),
      );
      checked++;
    }
    expect(checked).toBe(140);
  }, 60_000);

  it("양성 대조 — 후보가 딱 하나 남으면 그것으로 바꾼다 (Vegan + 보온병 = 6개)", async () => {
    const c: Case = { allergies: ["Vegan"], excluded: [], prepStyles: [], thermosOnly: true, useSales: false };
    const pool = MENUS.filter((m) => menuPasses(m, c)).map((m) => m.name);
    expect(pool.length, "전제가 바뀌었다 — 풀이 6개가 아니다").toBe(6);
    let hit = 0;
    for (let run = 0; run < 10; run++) {
      const plan = await generate(c);
      const used = new Set(plan.planData.map((d) => d.menuName));
      const left = pool.filter((n) => !used.has(n));
      if (left.length !== 1) continue;
      const next = await swap(c, plan, run % 5);
      expect(next.planData[run % 5].menuName).toBe(left[0]);
      hit++;
    }
    expect(hit, "한 번도 안 돌았다 — 이 검사가 알리바이다").toBeGreaterThan(0);
  });

  it("양성 대조 — 남는 후보가 없으면 NO_ALTERNATIVE (같은 메뉴로 바꾼 척하지 않는다)", async () => {
    const tight: Case[] = [
      // 5개 = 한 주가 풀을 다 쓴다
      { allergies: ["Gluten Allergy", "Dairy Allergy", "Egg Allergy"], excluded: [], prepStyles: [], thermosOnly: true, useSales: false },
      // 3개 = 한 주가 반복된다
      { allergies: ["Vegan", "Gluten Allergy", "Nut Allergy"], excluded: [], prepStyles: ["no-cook"], thermosOnly: false, useSales: false },
    ];
    for (const c of tight) {
      const plan = await generate(c);
      const err = await swap(c, plan, 2).catch((e) => e);
      expect(err).toBeInstanceOf(PlanInputError);
      expect((err as PlanInputError).code).toBe("NO_ALTERNATIVE");
    }
  });

  it("모르는 이름·조건 위반·잘못된 날은 가격 조회 전에 거절한다", async () => {
    const c = CASES[2]; // Nut Allergy + Cheese 제외
    const plan = await generate(c);
    const nutMenu = MENUS.find((m) => !m.is_nut_free)!;
    const bad: Array<[string, () => Promise<unknown>, string]> = [
      ["모르는 메뉴", () => swapPlanDay(MENUS, SNACKS, weekOf(plan).map((d, i) => (i === 0 ? { ...d, menu: "Not A Menu" } : d)), 1,
        { allergies: c.allergies, excluded: c.excluded, favorites: [], leftover: "" }, stubPrices), "UNKNOWN_NAME"],
      ["견과 메뉴", () => swapPlanDay(MENUS, SNACKS, weekOf(plan).map((d, i) => (i === 0 ? { ...d, menu: nutMenu.name } : d)), 1,
        { allergies: c.allergies, excluded: c.excluded, favorites: [], leftover: "" }, stubPrices), "FILTER_MISMATCH"],
      ["Sweet Treat 간식", () => swapPlanDay(MENUS, SNACKS, weekOf(plan).map((d, i) => (i === 0 ? { ...d, snacks: [SNACKS["Sweet Treat"][0].name] } : d)), 1,
        { allergies: c.allergies, excluded: c.excluded, favorites: [], leftover: "" }, stubPrices), "UNKNOWN_NAME"],
      ["날 번호 5", () => swapPlanDay(MENUS, SNACKS, weekOf(plan), 5,
        { allergies: c.allergies, excluded: c.excluded, favorites: [], leftover: "" }, stubPrices), "BAD_INPUT"],
      ["네 날", () => swapPlanDay(MENUS, SNACKS, weekOf(plan).slice(0, 4), 1,
        { allergies: c.allergies, excluded: c.excluded, favorites: [], leftover: "" }, stubPrices), "BAD_INPUT"],
    ];
    for (const [label, fn, code] of bad) {
      priceCalls = 0;
      const err = await fn().catch((e) => e);
      expect(err, label).toBeInstanceOf(PlanInputError);
      expect((err as PlanInputError).code, label).toBe(code);
      expect(priceCalls, `${label}: 거절 전에 가격을 조회했다`).toBe(0);
    }
  });
});

function sharedFrom(plan: GeneratePlanResponse, c: Case): SharedPlan {
  return {
    days: weekOf(plan),
    allergies: c.allergies,
    excluded: c.excluded,
    prepStyles: c.prepStyles,
    thermosOnly: c.thermosOnly,
    useSales: c.useSales,
    saleStores: c.useSales ? STORES : [],
  };
}

describe("공유 링크 — encode/decode", () => {
  it("🔴 왕복하면 같은 식단이 되고, 되살린 식단의 원가가 원래와 같다", async () => {
    for (let run = 0; run < 35; run++) {
      const c = CASES[run % CASES.length];
      const plan = await generate(c);
      const shared = sharedFrom(plan, c);
      const param = encodeSharedPlan(shared)!;
      expect(param, "인코딩 실패").toBeTruthy();
      expect(param).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(param.length).toBeLessThan(700);
      expect(decodeSharedPlan(param)).toEqual(shared);

      const opened = await buildSharedPlan(MENUS, SNACKS, decodeSharedPlan(param)!, stubPrices);
      expect(opened.planData.map((d) => d.menuName)).toEqual(plan.planData.map((d) => d.menuName));
      expect(opened.planData.map((d) => d.snacks.map((s) => s.name))).toEqual(plan.planData.map((d) => d.snacks.map((s) => s.name)));
      expect(opened.totalWeekCost).toBe(plan.totalWeekCost);
      expect(opened.shoppingList).toEqual(plan.shoppingList);
    }
  }, 30_000);

  it("🔴 되살린 식단은 저장분 복원과 같은 함수(priceDay)로 매겨진다", async () => {
    const c = CASES[2];
    const plan = await generate(c);
    const opened = await buildSharedPlan(MENUS, SNACKS, decodeSharedPlan(encodeSharedPlan(sharedFrom(plan, c))!)!, stubPrices);
    // PlannerClient의 복원 경로가 하는 계산 그대로: 저장된 prices + 특가 토글 → priceDay
    const priceMap = new Map(Object.entries(opened.prices));
    const promos = activePromotionsFor(saleOpts(c));
    for (const d of opened.planData) {
      const all = [...d.rawIngredients, ...d.snacks.flatMap((s) => s.ingredients ?? [])];
      expect(d.estCostValue).toBe(priceDay(all, priceMap, promos).cost);
    }
  });

  it("조작·손상·과대 입력은 풀지 않는다", async () => {
    const plan = await generate(CASES[0]);
    const good = encodeSharedPlan(sharedFrom(plan, CASES[0]))!;
    const b64 = (o: unknown) =>
      Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const d = weekOf(plan).map((x) => [x.menu, ...x.snacks]);
    const bad: Array<[string, unknown]> = [
      ["빈 값", ""],
      ["문자열 아님", 42],
      ["과대", "A".repeat(SHARE_PARAM_MAX + 1)],
      ["HTML", "<script>alert(1)</script>"],
      ["잘림", good.slice(0, good.length - 7)],
      ["첫 글자 변조(여는 중괄호가 깨진다)", (good[0] === "e" ? "f" : "e") + good.slice(1)],
      ["깨진 UTF-8", Buffer.from([0x7b, 0xff, 0xfe, 0x7d]).toString("base64url")],
      ["버전 2", b64({ v: 2, d })],
      ["추가 키", b64({ v: 1, d, z: 1 })],
      ["__proto__", b64(JSON.parse(`{"v":1,"d":${JSON.stringify(d)},"__proto__":{"x":1}}`))],
      ["네 날", b64({ v: 1, d: d.slice(0, 4) })],
      ["간식 셋", b64({ v: 1, d: d.map((r) => [r[0], "Apple Slices", "Pretzels", "Popcorn"]) })],
      ["이름이 숫자", b64({ v: 1, d: d.map(() => [1]) })],
      ["이름이 김", b64({ v: 1, d: d.map(() => ["x".repeat(61)]) })],
      ["꺾쇠 이름", b64({ v: 1, d: d.map((r, i) => (i ? r : ["<img src=x>"])) })],
      ["알레르기 범위 밖", b64({ v: 1, d, a: [8] })], // 7 = Sesame Allergy(2026-10-22)
      ["알레르기 중복", b64({ v: 1, d, a: [0, 0] })],
      ["마트 빈 배열", b64({ v: 1, d, s: [] })],
      ["보온병 2", b64({ v: 1, d, t: 2 })],
      ["제외 51개", b64({ v: 1, d, x: Array.from({ length: 51 }, (_, i) => `Ing${i}`) })],
    ];
    for (const [label, input] of bad) {
      expect(decodeSharedPlan(input), label).toBeNull();
    }
    // 양성 대조 — 위 b64() 도우미로 만든 정상 입력은 풀린다(도우미가 늘 깨진 값을 만들어 통과하는 알리바이 방지)
    expect(decodeSharedPlan(b64({ v: 1, d }))).not.toBeNull();
    expect(decodeSharedPlan(good)).not.toBeNull();
  });

  it("🔴 모양은 맞는데 모르는 이름·조건 위반이면 서버가 거절하고, 가격을 조회하지 않는다", async () => {
    const plan = await generate(CASES[2]);
    const base = sharedFrom(plan, CASES[2]);
    const nutMenu = MENUS.find((m) => !m.is_nut_free)!;
    const cases: Array<[string, SharedPlan, string]> = [
      ["모르는 메뉴", { ...base, days: base.days.map((x, i) => (i === 3 ? { ...x, menu: "Mystery Pie" } : x)) }, "UNKNOWN_NAME"],
      ["모르는 간식", { ...base, days: base.days.map((x, i) => (i === 3 ? { ...x, snacks: ["Mystery Snack"] } : x)) }, "UNKNOWN_NAME"],
      ["모르는 제외 재료", { ...base, excluded: ["Unobtainium"] }, "UNKNOWN_NAME"],
      ["견과 알레르기에 견과 메뉴", { ...base, days: base.days.map((x, i) => (i === 0 ? { ...x, menu: nutMenu.name } : x)) }, "FILTER_MISMATCH"],
    ];
    for (const [label, shared, code] of cases) {
      const param = encodeSharedPlan(shared);
      const decoded = decodeSharedPlan(param);
      expect(decoded, `${label}: 모양은 정상이라 풀려야 한다`).not.toBeNull();
      priceCalls = 0;
      const err = await buildSharedPlan(MENUS, SNACKS, decoded!, stubPrices).catch((e) => e);
      expect(err, label).toBeInstanceOf(PlanInputError);
      expect((err as PlanInputError).code, label).toBe(code);
      expect(priceCalls, `${label}: 거절 전에 가격을 조회했다`).toBe(0);
    }
  });

  it("링크가 너무 길어지면 만들지 않는다 (풀 수 없는 링크를 내보내지 않는다)", async () => {
    const plan = await generate(CASES[0]);
    const many = [...new Set(MENUS.flatMap((m) => m.ingredients))].slice(0, 50);
    const long = encodeSharedPlan({ ...sharedFrom(plan, CASES[0]), excluded: many });
    if (long !== null) expect(long.length).toBeLessThanOrEqual(SHARE_PARAM_MAX);
    const tooLong = encodeSharedPlan({
      ...sharedFrom(plan, CASES[0]),
      excluded: Array.from({ length: 50 }, (_, i) => `Ingredient Name Number ${i} With Padding Text`),
    });
    expect(tooLong).toBeNull();
  });
});
