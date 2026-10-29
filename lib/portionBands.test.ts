import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import menuData from "../data/menuData.json";
import {
  PORTION_BANDS, PORTION_BAND_FACTORS, EER_BOYS, EER_GIRLS, rawBandFactor, normalizePortionBand,
  bandAfterAllergyToggle, portionBandFigures, bandFactorLabel, type PortionBand,
} from "./portionBands";
import { PORTION_FACTORS, DEFAULT_PORTION, portionFor } from "./planConfig";
import {
  buildWeeklyPlan, buildSharedPlan, swapPlanDay, costForIngredients, effectivePackPrice, saleMapFor,
  weekTotalFrom, priceDay, activePromotionsFor,
} from "./planGenerator";
import { estimateMenuCalories, estimateSnackCalories } from "./nutritionCalc";
import { encodeSharedPlan, decodeSharedPlan, type SharedPlan } from "./planShare";
import type { MenuItem, PriceInfo, SnackData, GeneratePlanResponse } from "./types";
import type { SaleMatch, StoreId } from "@/data/promotions.types";

/**
 * 나이대별 양 (2026-10-12).
 *
 * 🔴 기대값을 검사 대상과 같은 원본에서 뽑지 않는다. 아래 표는 출처(NRV Table 2)를 **여기에 따로**
 *    옮겨 적은 것이고, 배율도 여기서 따로 계산한다. 코드의 표와 이 표가 한 글자라도 다르면 첫 검사가 터진다.
 */
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf-8");

// NRV for Australia and New Zealand — Dietary energy, Table 2. [PAL 1.4, 1.6, 1.8] MJ/day
const BOYS: Record<number, number[]> = {
  3: [4.9, 5.6, 6.3], 4: [5.2, 5.9, 6.6], 5: [5.5, 6.2, 7.0], 6: [5.8, 6.6, 7.4],
  7: [6.1, 7.0, 7.8], 8: [6.4, 7.3, 8.2], 9: [6.8, 7.8, 8.8], 10: [7.3, 8.3, 9.3],
  11: [7.7, 8.8, 9.9], 12: [8.2, 9.3, 10.5], 13: [8.7, 10.0, 11.2], 14: [9.3, 10.6, 11.9],
  15: [9.9, 11.2, 12.6], 16: [10.3, 11.8, 13.2], 17: [10.7, 12.2, 13.7], 18: [10.9, 12.5, 14.0],
};
const GIRLS: Record<number, number[]> = {
  3: [4.5, 5.3, 5.8], 4: [4.8, 5.5, 6.1], 5: [5.1, 5.7, 6.5], 6: [5.4, 6.1, 6.9],
  7: [5.7, 6.5, 7.3], 8: [6.0, 6.9, 7.7], 9: [6.4, 7.3, 8.2], 10: [6.7, 7.6, 8.5],
  11: [7.0, 8.0, 9.0], 12: [7.4, 8.5, 9.5], 13: [7.8, 8.9, 10.0], 14: [8.1, 9.2, 10.3],
  15: [8.2, 9.4, 10.6], 16: [8.4, 9.5, 10.7], 17: [8.4, 9.6, 10.8], 18: [8.5, 9.7, 10.9],
};
const COL = { 1.4: 0, 1.6: 1, 1.8: 2 } as const;
type P = keyof typeof COL;
const AGES: Record<Exclude<PortionBand, "adult">, [number, number]> = {
  standard: [5, 12], kindy: [3, 4], primary: [5, 10], intermediate: [11, 12], college: [13, 17],
};

function avg(from: number, to: number, p: P): number {
  const xs: number[] = [];
  for (let a = from; a <= to; a++) xs.push(BOYS[a][COL[p]], GIRLS[a][COL[p]]);
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
function expectedRaw(band: PortionBand, p: P = 1.6): number {
  if (band === "adult") {
    return ((10.8 + 8.1) / 2 / avg(5, 12, 1.4) + (13.8 + 10.5) / 2 / avg(5, 12, 1.8)) / 2;
  }
  return avg(...AGES[band], p) / avg(5, 12, p);
}
const r2 = (x: number) => Number(x.toFixed(2));

describe("배율 = 표에서 독립 재계산한 값", () => {
  it("코드의 표가 출처 리터럴과 같다", () => {
    for (let age = 3; age <= 18; age++) {
      expect([...EER_BOYS[age]], `boys ${age}`).toEqual(BOYS[age]);
      expect([...EER_GIRLS[age]], `girls ${age}`).toEqual(GIRLS[age]);
    }
  });

  it("🔴 나이대마다 반올림한 배율이 독립 재계산과 같다", () => {
    for (const b of PORTION_BANDS) {
      expect(PORTION_BAND_FACTORS[b], b).toBe(r2(expectedRaw(b)));
    }
  });

  it("standard는 정확히 1 — 사이트의 다른 모든 금액이 이 기준이다", () => {
    expect(PORTION_BAND_FACTORS.standard).toBe(1);
    expect(rawBandFactor("standard")).toBe(1);
  });

  it("순서: kindy < primary < standard < intermediate < college < adult", () => {
    const f = PORTION_BAND_FACTORS;
    const order: PortionBand[] = ["kindy", "primary", "standard", "intermediate", "college", "adult"];
    for (let i = 1; i < order.length; i++) {
      expect(f[order[i]], `${order[i - 1]} < ${order[i]}`).toBeGreaterThan(f[order[i - 1]]);
    }
  });

  it("🔴 PAL 1.6 대신 1.8을 써도 모든 아이 나이대에서 0.02 안이다 — 고른 열이 결과를 몰래 바꾸지 않는다", () => {
    for (const b of PORTION_BANDS) {
      if (b === "adult") continue;
      expect(Math.abs(expectedRaw(b, 1.6) - expectedRaw(b, 1.8)), b).toBeLessThanOrEqual(0.02);
      expect(Math.abs(rawBandFactor(b, 1.6) - rawBandFactor(b, 1.8)), `${b} (code)`).toBeLessThanOrEqual(0.02);
    }
  });

  it("라벨에 찍는 배율 = 계산에 쓰는 배율", () => {
    for (const b of PORTION_BANDS) {
      expect(bandFactorLabel(b)).toBe(`×${PORTION_BAND_FACTORS[b].toFixed(2)}`);
      expect(portionFor("Cheese", b)).toBe(PORTION_FACTORS.Cheese * PORTION_BAND_FACTORS[b]);
    }
  });
});

const raw = menuData as unknown as { MENU_DATA: { en: MenuItem[] }; SNACK_DATA: SnackData };
const MENUS = raw.MENU_DATA.en;
const SNACKS = raw.SNACK_DATA;
const STORES: StoreId[] = ["woolworths", "newworld"];

/** 센트 아래가 남는 가격 — 딱 떨어지면 반올림 오차가 안 생겨 합계 검사가 알리바이가 된다. */
function stubPrice(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 1.13 + (h % 900) / 97;
}
const stub = async (ings: string[]): Promise<PriceInfo[]> =>
  ings.map((name) => ({ name, price: stubPrice(name), image: "", source: "test" }));

/** 장보기 목록 쪽 계산 — PlannerClient의 `totalCost`와 같은 식(나이대 포함). */
function shoppingListTotal(plan: GeneratePlanResponse, band: PortionBand): number {
  const counts: Record<string, number> = {};
  for (const ing of plan.shoppingList) counts[ing] = (counts[ing] ?? 0) + 1;
  const priceMap = new Map(Object.entries(plan.prices));
  const sales = saleMapFor(plan.planData.flatMap((d) => d.saleMatches ?? []));
  return Object.entries(counts).reduce((sum, [ing, n]) => {
    const base = priceMap.get(ing)?.price ?? 0;
    return sum + effectivePackPrice(base, sales.get(ing)) * portionFor(ing, band) * n;
  }, 0);
}

/** 이 기능 **이전**의 식 그대로 — 배율이 없다. standard가 이것과 비트 단위로 같아야 한다. */
function preFeatureDayCost(ings: string[], prices: Record<string, PriceInfo>, sales: Map<string, SaleMatch>): number {
  let cost = 0;
  for (const ing of ings) {
    const portion = PORTION_FACTORS[ing] ?? DEFAULT_PORTION;
    cost += effectivePackPrice(prices[ing]?.price ?? 0, sales.get(ing)) * portion;
  }
  return cost;
}

const dayIngs = (d: GeneratePlanResponse["planData"][number]) =>
  [...d.rawIngredients, ...d.snacks.flatMap((s) => s.ingredients ?? [])];

const sharedOf = (plan: GeneratePlanResponse, band?: PortionBand): SharedPlan => ({
  days: plan.planData.map((d) => ({ menu: d.menuName, snacks: d.snacks.map((s) => s.name) })),
  allergies: [], excluded: [], prepStyles: [], thermosOnly: false,
  useSales: true, saleStores: STORES,
  ...(band ? { band } : {}),
});

describe("🔴 나이대마다: 상단 합계 = 장보기 합계, 원가 = 배율 × 기준 원가", () => {
  it("생성 — 나이대 × 10회, 특가 켬", async () => {
    for (const band of PORTION_BANDS) {
      for (let run = 0; run < 10; run++) {
        const plan = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stub, { useSales: true, saleStores: STORES }, undefined, band);
        expect(weekTotalFrom(plan.planData)!, `${band} run ${run}`).toBeCloseTo(shoppingListTotal(plan, band), 6);
      }
    }
  }, 60_000);

  it("같은 식단을 나이대만 바꿔 매기면 하루 원가·열량·절약액이 배율만큼 움직인다", async () => {
    let savingsSeen = 0;
    for (let run = 0; run < 6; run++) {
      const base = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stub, { useSales: true, saleStores: STORES });
      for (const band of PORTION_BANDS) {
        const f = PORTION_BAND_FACTORS[band];
        const scaled = await buildSharedPlan(MENUS, SNACKS, sharedOf(base, band), stub);
        expect(scaled.planData.map((d) => d.menuName), "메뉴가 나이대로 바뀌었다").toEqual(base.planData.map((d) => d.menuName));
        expect(scaled.shoppingList).toEqual(base.shoppingList);
        for (let i = 0; i < 5; i++) {
          const b = base.planData[i];
          const s = scaled.planData[i];
          expect(s.estCostValue!, `${band} ${b.day}`).toBeCloseTo(f * b.estCostValue!, 9);
          const cal = estimateMenuCalories(b.rawIngredients) + estimateSnackCalories(b.snacks);
          expect(b.nutrition.calories).toBe(cal);
          expect(s.nutrition.calories, `${band} ${b.day} kcal`).toBe(Math.round(cal * f));
          // 절약액도 1인분 단위다 — 같은 배율로 움직인다
          const promos = activePromotionsFor({ useSales: true, saleStores: STORES });
          const pm = new Map(Object.entries(base.prices));
          const savedStd = priceDay(dayIngs(b), pm, promos).saved;
          const savedBand = priceDay(dayIngs(b), pm, promos, band).saved;
          expect(savedBand).toBeCloseTo(f * savedStd, 9);
          if (savedStd > 0) savingsSeen++;
        }
        expect(weekTotalFrom(scaled.planData)!).toBeCloseTo(shoppingListTotal(scaled, band), 6);
        if ((base.totalSavings ?? 0) > 0) {
          expect(Math.abs(scaled.totalSavings! - f * base.totalSavings!), `${band} 주간 절약액`).toBeLessThanOrEqual(0.015);
        }
      }
    }
    expect(savingsSeen, "특가가 한 번도 안 걸렸다 — 절약액 검사가 알리바이다").toBeGreaterThan(0);
  }, 60_000);

  it("하루 교체도 같은 나이대로 매긴다", async () => {
    const band: PortionBand = "college";
    const plan = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stub, undefined, undefined, band);
    const next = await swapPlanDay(
      MENUS, SNACKS, plan.planData.map((d) => ({ menu: d.menuName, snacks: d.snacks.map((s) => s.name) })), 2,
      { allergies: [], excluded: [], favorites: [], leftover: "", band }, stub,
    );
    for (const d of next.planData) {
      const std = costForIngredients(dayIngs(d), new Map(Object.entries(next.prices))).cost;
      expect(d.estCostValue!).toBeCloseTo(PORTION_BAND_FACTORS[band] * std, 9);
    }
    expect(weekTotalFrom(next.planData)!).toBeCloseTo(shoppingListTotal(next, band), 6);
  });
});

describe("🔴 기준(standard)은 이 기능 전과 비트 단위로 같다", () => {
  it("생성 결과의 하루 원가·열량이 옛 식과 === 같다(배율 생략 = standard 명시)", async () => {
    for (let run = 0; run < 8; run++) {
      const plan = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stub, { useSales: true, saleStores: STORES });
      const sales = saleMapFor(plan.planData.flatMap((d) => d.saleMatches ?? []));
      for (const d of plan.planData) {
        expect(d.estCostValue).toBe(preFeatureDayCost(dayIngs(d), plan.prices, sales));
        expect(d.nutrition.calories).toBe(estimateMenuCalories(d.rawIngredients) + estimateSnackCalories(d.snacks));
      }
      const explicit = await buildSharedPlan(MENUS, SNACKS, sharedOf(plan, "standard"), stub);
      const omitted = await buildSharedPlan(MENUS, SNACKS, sharedOf(plan), stub);
      expect(JSON.stringify(explicit)).toBe(JSON.stringify(omitted));
      expect(JSON.stringify(omitted.planData)).toBe(JSON.stringify(plan.planData));
    }
  });

  it("양성 대조 — 배율이 1이 아니면 옛 식과 다르다(위 검사가 아무거나 통과하지 않는다)", async () => {
    const plan = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stub);
    const college = await buildSharedPlan(MENUS, SNACKS, { ...sharedOf(plan, "college"), useSales: false, saleStores: [] }, stub);
    const d = college.planData[0];
    expect(d.estCostValue).not.toBe(preFeatureDayCost(dayIngs(d), college.prices, new Map()));
  });
});

describe("공유 링크 — 나이대", () => {
  it("🔴 나이대마다 왕복하면 같은 나이대, 같은 원가", async () => {
    const plan = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stub);
    for (const band of PORTION_BANDS) {
      const param = encodeSharedPlan(sharedOf(plan, band))!;
      expect(param, band).toBeTruthy();
      const decoded = decodeSharedPlan(param)!;
      expect(normalizePortionBand(decoded.band), band).toBe(band);
      const opened = await buildSharedPlan(MENUS, SNACKS, decoded, stub);
      const direct = await buildSharedPlan(MENUS, SNACKS, sharedOf(plan, band), stub);
      expect(opened.totalWeekCost, band).toBe(direct.totalWeekCost);
    }
  });

  it("🔴 옛 링크(키 b 없음)는 standard — 그리고 standard 링크는 이 기능 전과 같은 문자열이다", async () => {
    const plan = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stub);
    const d = plan.planData.map((x) => [x.menuName, ...x.snacks.map((s) => s.name)]);
    // 이 기능 전의 인코더가 만들던 모양 그대로(특가 마트 0,1 인덱스 = paknsave 빼고 woolworths·newworld)
    const old = Buffer.from(JSON.stringify({ v: 1, d, s: [1, 2] })).toString("base64url");
    const decoded = decodeSharedPlan(old)!;
    expect(decoded).not.toBeNull();
    expect(decoded.band).toBeUndefined();
    expect(normalizePortionBand(decoded.band)).toBe("standard");
    expect(encodeSharedPlan(sharedOf(plan, "standard"))).toBe(old);
    expect(encodeSharedPlan(sharedOf(plan))).toBe(old);
    const opened = await buildSharedPlan(MENUS, SNACKS, decoded, stub);
    const std = await buildSharedPlan(MENUS, SNACKS, sharedOf(plan, "standard"), stub);
    expect(opened.totalWeekCost).toBe(std.totalWeekCost);
  });

  it("나이대 키가 어긋나면 풀지 않는다", async () => {
    const plan = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stub);
    const d = plan.planData.map((x) => [x.menuName, ...x.snacks.map((s) => s.name)]);
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
    for (const b of [0, -1, PORTION_BANDS.length, 1.5, "1", null, [1]]) {
      expect(decodeSharedPlan(b64({ v: 1, d, b })), JSON.stringify(b)).toBeNull();
    }
    expect(decodeSharedPlan(b64({ v: 1, d, b: PORTION_BANDS.indexOf("college") }))!.band).toBe("college");
  });
});

describe("API — 나이대 검증", () => {
  it("모르는 값은 standard", () => {
    for (const v of [undefined, null, "", "teen", "Standard", 3, {}, "__proto__", "constructor", "toString"]) {
      expect(normalizePortionBand(v), String(v)).toBe("standard");
    }
    for (const b of PORTION_BANDS) expect(normalizePortionBand(b)).toBe(b);
  });

  it("🔴 라우트: 모르는 나이대는 기준 원가로, 아는 나이대는 배율대로 (생성·교체)", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supermarketApi", () => ({ fetchBatchPrices: stub }));
    const { POST } = await import("@/app/api/plans/generate/route");
    const { NextRequest } = await import("next/server");
    let ip = 0;
    const call = async (body: object) => {
      const res = await POST(new NextRequest("http://localhost/api/plans/generate", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ip}` },
        body: JSON.stringify({ locale: "en", allergies: [], excludedIngredients: [], favoriteIngredients: [], fridgeLeftover: "", ...body }),
      }));
      expect(res.status).toBe(200);
      const json = (await res.json()) as GeneratePlanResponse;
      // 🔴 가짜 가격이 실제로 쓰였는지 — 모의가 안 걸리면 실제 가격 조회(외부 요청)가 된다
      expect(Object.values(json.prices).every((p) => p.source === "test"), "가격 모의가 안 걸렸다").toBe(true);
      return json;
    };
    const ratio = (p: GeneratePlanResponse) =>
      p.planData.map((d) => d.estCostValue! / costForIngredients(dayIngs(d), new Map(Object.entries(p.prices))).cost);
    for (const [sent, expected] of [["teen", 1], [42, 1], [undefined, 1], ["college", PORTION_BAND_FACTORS.college], ["kindy", PORTION_BAND_FACTORS.kindy]] as const) {
      const plan = await call({ portionBand: sent });
      for (const r of ratio(plan)) expect(r, String(sent)).toBeCloseTo(expected, 9);
      const swapped = await call({
        mode: "swap", dayIndex: 1, portionBand: sent,
        week: plan.planData.map((d) => ({ menu: d.menuName, snacks: d.snacks.map((s) => s.name) })),
      });
      for (const r of ratio(swapped)) expect(r, `swap ${String(sent)}`).toBeCloseTo(expected, 9);
    }
    vi.doUnmock("@/lib/supermarketApi");
  });
});

describe("킨디 체크 → 양도 킨디", () => {
  it("새로 켜면 kindy, 끄거나 다른 것을 바꾸면 그대로", () => {
    expect(bandAfterAllergyToggle([], ["Kindy"], "standard")).toBe("kindy");
    expect(bandAfterAllergyToggle(["Vegan"], ["Vegan", "Kindy"], "college")).toBe("kindy");
    expect(bandAfterAllergyToggle(["Kindy"], [], "kindy")).toBe("kindy");
    expect(bandAfterAllergyToggle(["Kindy"], [], "primary")).toBe("primary");
    expect(bandAfterAllergyToggle(["Kindy"], ["Kindy", "Vegan"], "primary")).toBe("primary");
    expect(bandAfterAllergyToggle([], ["Vegan"], "adult")).toBe("adult");
  });

  it("화면이 그 함수를 쓰고, 킨디 이름표는 그대로다", () => {
    const src = read("components/PlannerClient.tsx");
    expect(src).toMatch(/setPortionBand\(\(cur\) => bandAfterAllergyToggle\(allergies, next, cur\)\)/);
    for (const l of ["en", "ko", "zh"]) {
      const m = JSON.parse(read(`messages/${l}.json`));
      expect(m.planner_allergy_kindy, l).toBe({ en: "Kindy (under 5)", ko: "킨디 (5세 미만)", zh: "幼儿园（5岁以下）" }[l]);
    }
  });

  it("kindy 양을 골라도 질식 필터는 켜지지 않는다 — 생성기는 알레르기 목록만 본다", async () => {
    const plan = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stub, undefined, undefined, "kindy");
    expect(plan.planData.every((d) => !d.kindyPrep)).toBe(true);
  });
});

describe("화면·문구가 같은 배율을 쓴다", () => {
  const src = read("components/PlannerClient.tsx");

  it("장보기·레시피·복원·요청이 모두 이 계획의 나이대로 몫을 낸다", () => {
    expect(src, "PORTION_FACTORS를 직접 곱하는 자리가 남았다").not.toMatch(/PORTION_FACTORS\[/);
    // 2026-10-26: 몫은 「1번 나이대 + 추가 도시락」의 합 배율이다 — 한 자리라도 band만 넘기면 둘째 아이 몫이 빠진다.
    expect(src).toMatch(/const planPortions = portionsOf\(planOptions\.band, planOptions\.extraBoxes\)/);
    expect(src).toMatch(/\(item\.price \?\? 0\) \* portionFor\(item\.name, planPortions\) \* item\.count/);
    expect(src, "portionFor에 band만 넘기는 자리가 남았다").not.toMatch(/portionFor\([^)]*planOptions\.band\)/);
    expect(src).toMatch(/priceDay\(all, priceMap, promos, portionsOf\(opts\.band, opts\.extraBoxes\), opts\.island\)/);
    expect(src).toMatch(/portionBand: planOptions\.band/);
    expect(src).toMatch(/extraBoxes: planOptions\.extraBoxes/);
    expect(src).toMatch(/band: normalizePortionBand\(parsed\.portionBand\)/);
    expect(src).toMatch(/extraBoxes: normalizeExtraBoxes\(parsed\.extraBoxes\)/);
    const route = read("app/api/plans/generate/route.ts");
    expect(route).toMatch(/portionsOf\(normalizePortionBand\(body\.portionBand\), normalizeExtraBoxes\(body\.extraBoxes\)\)/);
  });

  it("FAQ는 배율을 손으로 적지 않고 placeholder로 받는다", () => {
    const keys: Record<string, string[]> = {
      faq_a24: ["kindyFactor", "primaryFactor", "intermediateFactor", "collegeFactor", "adultFactor"],
      faq_a32: ["adultFactor"],
      faq_a33: ["kindyFactor"],
    };
    for (const l of ["en", "ko", "zh"]) {
      const m = JSON.parse(read(`messages/${l}.json`)) as Record<string, string>;
      for (const [k, ph] of Object.entries(keys)) {
        for (const p of ph) expect(m[k], `${l}.${k}`).toContain(`{${p}}`);
        expect(m[k], `${l}.${k}: 배율 숫자를 손으로 적었다`).not.toMatch(/×\s*\d/);
      }
    }
    const page = read("app/[locale]/faq/page.tsx");
    const calls = (page.match(/boxMedian:/g) ?? []).length;
    expect((page.match(/\.\.\.portionBandFigures\(\)/g) ?? []).length).toBe(calls);
    expect(Object.keys(portionBandFigures()).sort()).toEqual(
      ["adultFactor", "collegeFactor", "intermediateFactor", "kindyFactor", "primaryFactor"],
    );
  });

  it("새 문구가 세 언어에 다 있다", () => {
    const en = JSON.parse(read("messages/en.json")) as Record<string, string>;
    const newKeys = Object.keys(en).filter((k) => k.startsWith("portion_band_") || k.startsWith("planner_portion_") || k.startsWith("planner_kindy_portion_"));
    expect(newKeys.length).toBeGreaterThanOrEqual(PORTION_BANDS.length + 8);
    for (const b of PORTION_BANDS) expect(newKeys).toContain(`portion_band_${b}`);
    for (const l of ["ko", "zh"]) {
      const m = JSON.parse(read(`messages/${l}.json`)) as Record<string, string>;
      for (const k of newKeys) expect(m[k], `${l}.${k}`).toBeTruthy();
    }
  });
});
