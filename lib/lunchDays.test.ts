import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import menuData from "../data/menuData.json";
import type { PortionBand, Portions } from "./portionBands";
import { portionFor } from "./planConfig";
import {
  buildWeeklyPlan, buildSharedPlan, swapPlanDay, effectivePackPrice, saleMapFor, weekTotalFrom, priceDay,
  activePromotionsFor,
} from "./planGenerator";
import { encodeSharedPlan, decodeSharedPlan, normalizeLunchDays, type SharedPlan } from "./planShare";
import type { MenuItem, PriceInfo, SnackData, GeneratePlanResponse } from "./types";
import type { StoreId } from "@/data/promotions.types";
import { getActivePromotions } from "./promotions";
// Aussie: AU 전단은 아직 없다(5단계) — 특가에 기대는 검사는 데이터가 들어오면 자동으로 다시 켜진다.
// 「없으면 missing」은 lib/promotions.test.ts가 따로 확인한다.
const HAS_PROMOS = getActivePromotions(["woolworths", "coles"]).length > 0;


/**
 * 도시락 싸는 요일 (2026-10-26 — 급식 날·주 3일 킨디).
 *
 * 끈 날은 메뉴를 남기되 **주간 합계·장보기 목록·절약액**에서 빠져야 한다. 셋 중 하나만 빠지면
 * 상단 합계와 장보기 합계가 다시 갈라진다(09-10 「한 화면에 총액 두 개」와 같은 모양).
 * 🔴 기대값은 planData의 **켠 날 재료를 여기서 따로 모아** 낸다 — 서버가 만든 shoppingList를 기대값으로 쓰지 않는다.
 */
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf-8");

const raw = menuData as unknown as { MENU_DATA: { en: MenuItem[] }; SNACK_DATA: SnackData };
const MENUS = raw.MENU_DATA.en;
const SNACKS = raw.SNACK_DATA;
const STORES: StoreId[] = ["woolworths", "coles"];

function stubPrice(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 1.13 + (h % 900) / 97;
}
const stub = async (ings: string[]): Promise<PriceInfo[]> =>
  ings.map((name) => ({ name, price: stubPrice(name), image: "", source: "test" }));

const dayIngs = (d: GeneratePlanResponse["planData"][number]) =>
  [...d.rawIngredients, ...d.snacks.flatMap((s) => s.ingredients ?? [])];

const sorted = (xs: string[]) => [...xs].sort();

const sharedOf = (plan: GeneratePlanResponse, lunchDays?: boolean[], boxes?: PortionBand[]): SharedPlan => ({
  days: plan.planData.map((d) => ({ menu: d.menuName, snacks: d.snacks.map((s) => s.name) })),
  allergies: [], excluded: [], prepStyles: [], thermosOnly: false,
  useSales: true, saleStores: STORES,
  ...(lunchDays ? { lunchDays } : {}),
  ...(boxes && boxes[0] !== "standard" ? { band: boxes[0] } : {}),
  ...(boxes && boxes.length > 1 ? { extraBoxes: boxes.slice(1) } : {}),
});

function shoppingListTotal(plan: GeneratePlanResponse, portions: Portions): number {
  const counts: Record<string, number> = {};
  for (const ing of plan.shoppingList) counts[ing] = (counts[ing] ?? 0) + 1;
  const priceMap = new Map(Object.entries(plan.prices));
  const sales = saleMapFor(plan.planData.flatMap((d) => d.saleMatches ?? []));
  return Object.entries(counts).reduce(
    (sum, [ing, n]) => sum + effectivePackPrice(priceMap.get(ing)?.price ?? 0, sales.get(ing)) * portionFor(ing, portions) * n,
    0,
  );
}

const PATTERNS: boolean[][] = [
  [true, false, true, false, true],
  [false, false, false, false, true],
  [true, true, true, true, false],
];

describe("🔴 끈 날은 합계·장보기·절약액에서 함께 빠진다", () => {
  it("공유 식단 — 요일 패턴 × 도시락 구성", async () => {
    const promos = activePromotionsFor({ useSales: true, saleStores: STORES });
    let savingsSeen = 0;
    for (let run = 0; run < 3; run++) {
      const base = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stub, { useSales: true, saleStores: STORES });
      for (const days of PATTERNS) {
        for (const boxes of [undefined, ["college", "kindy"] as PortionBand[]]) {
          const portions: Portions = boxes ?? "standard";
          const plan = await buildSharedPlan(MENUS, SNACKS, sharedOf(base, days, boxes), stub);
          const tag = `${days.map(Number).join("")} ${boxes?.join("+") ?? "1 box"}`;
          expect(plan.planData.map((d) => d.menuName), "요일로 메뉴가 바뀌었다").toEqual(base.planData.map((d) => d.menuName));
          expect(plan.planData.map((d) => d.off === true), tag).toEqual(days.map((on) => !on));
          const onDays = plan.planData.filter((_, i) => days[i]);
          expect(sorted(plan.shoppingList), `${tag} 장보기`).toEqual(sorted(onDays.flatMap(dayIngs)));
          const onSum = onDays.reduce((s, d) => s + d.estCostValue!, 0);
          expect(weekTotalFrom(plan.planData)!, tag).toBeCloseTo(onSum, 9);
          expect(weekTotalFrom(plan.planData)!, `${tag} 상단 = 장보기`).toBeCloseTo(shoppingListTotal(plan, portions), 6);
          expect(plan.totalWeekCost).toBeCloseTo(onSum, 2);
          const pm = new Map(Object.entries(plan.prices));
          const savedOn = onDays.reduce((s, d) => s + priceDay(dayIngs(d), pm, promos, portions).saved, 0);
          expect(plan.totalSavings ?? 0, `${tag} 절약액`).toBeCloseTo(savedOn, 2);
          const savedOff = plan.planData.filter((d) => d.off).reduce((s, d) => s + priceDay(dayIngs(d), pm, promos, portions).saved, 0);
          if (savedOff > 0) savingsSeen++;
        }
      }
    }
    // 전단이 없으면(Aussie 5단계 전) 절약액 검사는 볼 것이 없다 — 그 사실은 promotions.test가 따로 확인한다
    if (HAS_PROMOS)
  expect(savingsSeen, "끈 날에 특가가 한 번도 안 걸렸다 — 절약액에서 빠지는지 검사가 알리바이다").toBeGreaterThan(0);
  }, 60_000);

  it("다섯 날 전부면 예전과 같다 — off 표시 없음, 장보기 그대로", async () => {
    const base = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stub);
    const all = await buildSharedPlan(MENUS, SNACKS, sharedOf(base, [true, true, true, true, true]), stub);
    const none = await buildSharedPlan(MENUS, SNACKS, sharedOf(base), stub);
    expect(all.shoppingList).toEqual(none.shoppingList);
    expect(all.planData.some((d) => "off" in d)).toBe(false);
    expect(weekTotalFrom(all.planData)).toBe(weekTotalFrom(none.planData));
  });

  it("하루 교체도 끈 날을 지킨다", async () => {
    const lunchDays = [true, false, true, true, false];
    const plan = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stub, undefined, undefined, "standard", lunchDays);
    const next = await swapPlanDay(
      MENUS, SNACKS, plan.planData.map((d) => ({ menu: d.menuName, snacks: d.snacks.map((s) => s.name) })), 0,
      { allergies: [], excluded: [], favorites: [], leftover: "", lunchDays }, stub,
    );
    expect(next.planData.map((d) => d.off === true)).toEqual(lunchDays.map((on) => !on));
    expect(sorted(next.shoppingList)).toEqual(sorted(next.planData.filter((d) => !d.off).flatMap(dayIngs)));
  });
});

describe("요일 입력·공유 링크 `w`", () => {
  it("신뢰하지 않는 입력은 다섯 날 전부로", () => {
    const all = [true, true, true, true, true];
    for (const bad of [undefined, null, "11111", [true, true], [false, false, false, false, false], [1, 1, 1, 1, 1]]) {
      expect(normalizeLunchDays(bad), JSON.stringify(bad)).toEqual(all);
    }
    expect(normalizeLunchDays([false, true, false, true, false])).toEqual([false, true, false, true, false]);
  });

  const days = Array.from({ length: 5 }, () => ({ menu: "Ham Sandwich", snacks: ["Apple"] }));
  const plan = (lunchDays?: boolean[]): SharedPlan => ({
    days, allergies: [], excluded: [], prepStyles: [], thermosOnly: false, useSales: false, saleStores: [],
    ...(lunchDays ? { lunchDays } : {}),
  });
  const raw64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const d = days.map((x) => [x.menu, ...x.snacks]);

  it("다섯 날 전부면 링크 문자열이 이 기능 전과 같다", () => {
    expect(encodeSharedPlan(plan([true, true, true, true, true]))).toBe(encodeSharedPlan(plan()));
    expect(decodeSharedPlan(encodeSharedPlan(plan())!)).not.toHaveProperty("lunchDays");
  });

  it("왕복 · 비트 순서는 월=1 … 금=16", () => {
    for (const p of PATTERNS) expect(decodeSharedPlan(encodeSharedPlan(plan(p))!)?.lunchDays).toEqual(p);
    expect(decodeSharedPlan(raw64({ v: 1, d, w: 5 }))?.lunchDays).toEqual([true, false, true, false, false]);
    for (const w of [0, 31, 32, -1, 1.5, "5", null]) {
      expect(decodeSharedPlan(raw64({ v: 1, d, w })), JSON.stringify(w)).toBeNull();
    }
  });
});

describe("화면이 같은 요일을 넘긴다", () => {
  const src = read("components/PlannerClient.tsx");
  it("생성·하루 교체·저장·복원·PDF", () => {
    expect(src).toMatch(/extraBoxes,\n\s+lunchDays,\n\s+\}\),/);
    expect(src).toMatch(/lunchDays: planOptions\.lunchDays/);
    expect(src).toMatch(/lunchDays: normalizeLunchDays\(parsed\.lunchDays\)/);
    expect(src).toMatch(/planData: data\.planData\.filter\(\(d\) => !d\.off\)/);
    expect(read("app/api/plans/generate/route.ts")).toMatch(/normalizeLunchDays\(body\.lunchDays\)/);
  });
});
