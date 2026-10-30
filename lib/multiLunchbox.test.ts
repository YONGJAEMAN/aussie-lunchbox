import { describe, it, expect } from "vitest";
import menuData from "../data/menuData.json";
import {
  PORTION_BANDS, MAX_LUNCHBOXES, bandFactorLabel, normalizeExtraBoxes, portionsFactor, portionsLabel, portionsOf,
  type PortionBand, type Portions,
} from "./portionBands";
import { portionFor } from "./planConfig";
import {
  buildWeeklyPlan, buildSharedPlan, swapPlanDay, costForIngredients, effectivePackPrice, saleMapFor,
  weekTotalFrom, priceDay, activePromotionsFor,
} from "./planGenerator";
import { encodeSharedPlan, decodeSharedPlan, type SharedPlan } from "./planShare";
import type { MenuItem, PriceInfo, SnackData, GeneratePlanResponse } from "./types";
import type { StoreId } from "@/data/promotions.types";
import { getActivePromotions } from "./promotions";
// Aussie: AU 전단은 아직 없다(5단계) — 특가에 기대는 검사는 데이터가 들어오면 자동으로 다시 켜진다.
// 「없으면 missing」은 lib/promotions.test.ts가 따로 확인한다.
const HAS_PROMOS = getActivePromotions(["woolworths", "newworld"]).length > 0;


/**
 * 도시락 여러 개 (2026-10-26 — 「아이 둘, 나이가 다르다. 어떻게 설정하나요?」 문의).
 *
 * 같은 메뉴를 아이마다 그 나이대 양으로 싼다. 배율이 재료 몫에 선형으로 곱해지므로
 * **도시락 N개로 매긴 값 = 나이대별로 하나씩 따로 매긴 값의 합**이어야 한다.
 * 🔴 기대값은 합 배율을 쓰지 않고 **나이대마다 따로 만든 식단**에서 더해 낸다 —
 *    검사 대상(`portionsFactor`)과 같은 식으로 기대값을 내면 가드가 자기 자신을 베낀다.
 */

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

const dayIngs = (d: GeneratePlanResponse["planData"][number]) =>
  [...d.rawIngredients, ...d.snacks.flatMap((s) => s.ingredients ?? [])];

const sharedOf = (plan: GeneratePlanResponse, boxes: PortionBand[]): SharedPlan => ({
  days: plan.planData.map((d) => ({ menu: d.menuName, snacks: d.snacks.map((s) => s.name) })),
  allergies: [], excluded: [], prepStyles: [], thermosOnly: false,
  useSales: true, saleStores: STORES,
  ...(boxes[0] !== "standard" ? { band: boxes[0] } : {}),
  ...(boxes.length > 1 ? { extraBoxes: boxes.slice(1) } : {}),
});

/** PlannerClient의 장보기 합계와 같은 식 — 몫은 이 계획의 도시락 전부. */
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

const HOUSEHOLDS: PortionBand[][] = [
  ["standard", "kindy"],
  ["primary", "primary"],
  ["college", "primary", "kindy"],
  ["adult", "intermediate", "kindy", "standard"],
];

describe("합 배율", () => {
  it("화면에 찍힌 나이대 배율을 더한 값이다", () => {
    for (const h of HOUSEHOLDS) {
      const fromLabels = h.reduce((s, b) => s + Number(bandFactorLabel(b).slice(1)), 0);
      expect(portionsFactor(h), h.join("+")).toBeCloseTo(fromLabels, 9);
      expect(portionsLabel(h)).toBe(`×${fromLabels.toFixed(2)}`);
    }
  });

  it("추가 도시락이 없으면 예전과 같은 단일 값이다 — 기존 계산이 비트 단위로 그대로", () => {
    for (const b of PORTION_BANDS) {
      expect(portionsOf(b, [])).toBe(b);
      expect(portionFor("Cheese", portionsOf(b))).toBe(portionFor("Cheese", b));
    }
  });

  it("신뢰하지 않는 입력: 배열 아님 → [] · 한도까지 자름 · 모르는 나이대 → standard", () => {
    expect(normalizeExtraBoxes(undefined)).toEqual([]);
    expect(normalizeExtraBoxes("kindy")).toEqual([]);
    expect(normalizeExtraBoxes(["kindy", "nope", 3])).toEqual(["kindy", "standard", "standard"]);
    expect(normalizeExtraBoxes(Array(9).fill("adult"))).toHaveLength(MAX_LUNCHBOXES - 1);
  });
});

describe("🔴 도시락 N개 = 나이대별로 따로 매긴 값의 합", () => {
  it("공유 식단 — 하루 원가·절약액이 합이고, 열량은 도시락별이며, 상단 합계 = 장보기 합계", async () => {
    const promos = activePromotionsFor({ useSales: true, saleStores: STORES });
    let savingsSeen = 0;
    for (let run = 0; run < 4; run++) {
      const base = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stub, { useSales: true, saleStores: STORES });
      for (const h of HOUSEHOLDS) {
        const multi = await buildSharedPlan(MENUS, SNACKS, sharedOf(base, h), stub);
        const singles = await Promise.all(h.map((b) => buildSharedPlan(MENUS, SNACKS, sharedOf(base, [b]), stub)));
        expect(multi.planData.map((d) => d.menuName), "도시락 수로 메뉴가 바뀌었다").toEqual(base.planData.map((d) => d.menuName));
        expect(multi.shoppingList).toEqual(base.shoppingList);
        const pm = new Map(Object.entries(base.prices));
        for (let i = 0; i < 5; i++) {
          const d = multi.planData[i];
          const sum = singles.reduce((s, p) => s + p.planData[i].estCostValue!, 0);
          expect(d.estCostValue!, `${h.join("+")} ${d.day}`).toBeCloseTo(sum, 9);
          const savedSum = h.reduce((s, b) => s + priceDay(dayIngs(d), pm, promos, b).saved, 0);
          expect(priceDay(dayIngs(d), pm, promos, h).saved).toBeCloseTo(savedSum, 9);
          if (savedSum > 0) savingsSeen++;
          // 열량은 합치지 않는다 — 1번 도시락 값 + 도시락별 목록
          expect(d.nutrition.calories).toBe(singles[0].planData[i].nutrition.calories);
          expect(d.nutrition.perBox).toEqual(singles.map((p) => p.planData[i].nutrition.calories));
        }
        expect(weekTotalFrom(multi.planData)!).toBeCloseTo(shoppingListTotal(multi, h), 6);
        const weekSum = singles.reduce((s, p) => s + weekTotalFrom(p.planData)!, 0);
        expect(weekTotalFrom(multi.planData)!).toBeCloseTo(weekSum, 6);
      }
    }
    // 전단이 없으면(Aussie 5단계 전) 절약액 검사는 볼 것이 없다 — 그 사실은 promotions.test가 따로 확인한다
    if (HAS_PROMOS)
  expect(savingsSeen, "특가가 한 번도 안 걸렸다 — 절약액 검사가 알리바이다").toBeGreaterThan(0);
  }, 60_000);

  it("한 개짜리 식단엔 도시락별 열량을 싣지 않는다(옛 모양 그대로)", async () => {
    const plan = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stub, undefined, undefined, "college");
    for (const d of plan.planData) expect(d.nutrition.perBox).toBeUndefined();
  });

  it("생성·하루 교체도 같은 합 배율로 매긴다", async () => {
    const h: PortionBand[] = ["college", "kindy"];
    const plan = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stub, { useSales: true, saleStores: STORES }, undefined, h);
    expect(weekTotalFrom(plan.planData)!).toBeCloseTo(shoppingListTotal(plan, h), 6);
    const next = await swapPlanDay(
      MENUS, SNACKS, plan.planData.map((d) => ({ menu: d.menuName, snacks: d.snacks.map((s) => s.name) })), 1,
      { allergies: [], excluded: [], favorites: [], leftover: "", band: h }, stub,
    );
    const pm = new Map(Object.entries(next.prices));
    for (const d of next.planData) {
      const sum = h.reduce((s, b) => s + costForIngredients(dayIngs(d), pm, new Map(), b).cost, 0);
      expect(d.estCostValue!).toBeCloseTo(sum, 9);
    }
  });
});

describe("공유 링크 `k`", () => {
  const days = Array.from({ length: 5 }, () => ({ menu: "Ham Sandwich", snacks: ["Apple"] }));
  const plan = (extra?: PortionBand[], band?: PortionBand): SharedPlan => ({
    days, allergies: [], excluded: [], prepStyles: [], thermosOnly: false, useSales: false, saleStores: [],
    ...(band ? { band } : {}),
    ...(extra ? { extraBoxes: extra } : {}),
  });
  const raw64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const d = days.map((x) => [x.menu, ...x.snacks]);

  it("도시락 한 개면 링크 문자열이 이 기능 전과 같다", () => {
    expect(encodeSharedPlan(plan([]))).toBe(encodeSharedPlan(plan()));
    expect(encodeSharedPlan(plan([], "kindy"))).toBe(encodeSharedPlan(plan(undefined, "kindy")));
    expect(decodeSharedPlan(encodeSharedPlan(plan())!)).not.toHaveProperty("extraBoxes");
  });

  it("왕복 — 같은 나이 둘·standard 포함·최대 개수", () => {
    for (const [extra, band] of [
      [["standard"], undefined],
      [["primary"], "primary"],
      [["kindy", "college", "adult"], "intermediate"],
    ] as [PortionBand[], PortionBand | undefined][]) {
      const back = decodeSharedPlan(encodeSharedPlan(plan(extra, band))!);
      expect(back?.extraBoxes).toEqual(extra);
      expect(back?.band).toBe(band);
    }
  });

  it("모양이 어긋나면 거절한다", () => {
    expect(decodeSharedPlan(raw64({ v: 1, d, k: [1] }))?.extraBoxes).toEqual(["kindy"]);
    for (const k of [[], [1, 2, 3, 4], [PORTION_BANDS.length], [-1], [1.5], ["1"], 1, null]) {
      expect(decodeSharedPlan(raw64({ v: 1, d, k })), JSON.stringify(k)).toBeNull();
    }
  });
});
