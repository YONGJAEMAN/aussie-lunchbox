import { describe, it, expect } from "vitest";
import { buildWeeklyPlan, effectivePackPrice } from "./planGenerator";
import { getActivePromotions, matchMenuIngredients } from "./promotions";
import { PORTION_FACTORS, DEFAULT_PORTION } from "./planConfig";
import { fetchBatchPrices } from "./supermarketApi";
import menuData from "../data/menuData.json";
import type { StoreId, SaleMatch } from "@/data/promotions.types";
import type { MenuItem, SnackData, PriceInfo } from "./types";
// Aussie: AU 전단은 아직 없다(5단계) — 특가에 기대는 검사는 데이터가 들어오면 자동으로 다시 켜진다.
// 「없으면 missing」은 lib/promotions.test.ts가 따로 확인한다.
const HAS_PROMOS = getActivePromotions(["woolworths", "coles"]).length > 0;


const raw = menuData as unknown as { MENU_DATA: { en: MenuItem[] }; SNACK_DATA: SnackData };
const MENUS = raw.MENU_DATA.en;
const SNACKS = raw.SNACK_DATA;
const STORES = ["woolworths", "coles"] as StoreId[];
const PROMOS = getActivePromotions(STORES);

/** 총액이 없으면 0으로 때우지 말고 던진다 — 0이 섞이면 중앙값이 조용히 내려간다. */
function must(n: number | undefined): number {
  if (typeof n !== "number") throw new Error("totalWeekCost가 없다 — 측정이 성립하지 않는다");
  return n;
}

function stats(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(s.length * p))];
  return {
    n: s.length,
    mean: s.reduce((a, b) => a + b, 0) / s.length,
    p25: q(0.25), med: q(0.5), p75: q(0.75),
  };
}
const f = (o: ReturnType<typeof stats>) =>
  `중앙 $${o.med.toFixed(2)}  평균 $${o.mean.toFixed(2)}  p25 $${o.p25.toFixed(2)}  p75 $${o.p75.toFixed(2)}`;

/** 이 플랜의 재료를 이번 주 특가로 다시 계산했을 때의 원가와 절약액. */
function repriceWithSales(
  ingLists: string[][],
  prices: Record<string, PriceInfo>,
) {
  let cost = 0, saved = 0;
  for (const ings of ingLists) {
    const matches: SaleMatch[] = matchMenuIngredients(ings, PROMOS);
    const byIng = new Map<string, SaleMatch>();
    for (const m of matches) byIng.set(m.ingredient, m);
    for (const ing of ings) {
      const portion = PORTION_FACTORS[ing] ?? DEFAULT_PORTION;
      const base = prices[ing]?.price ?? 0;
      const eff = effectivePackPrice(base, byIng.get(ing));
      cost += eff * portion;
      saved += (base - eff) * portion;
    }
  }
  return { cost, saved };
}

/** 하루치 = 메뉴 재료 + 그날 간식 재료. 원가 계산 경로와 같게 묶는다. */
function ingListsOf(p: Awaited<ReturnType<typeof buildWeeklyPlan>>): string[][] {
  const out: string[][] = [];
  for (const d of p.planData) {
    out.push(d.rawIngredients);
    out.push((d.snacks ?? []).flatMap((s) => s.ingredients ?? []));
  }
  return out;
}

/**
 * 🔴 사용자가 「Plan around this week's specials」를 켜서 **실제로 돈을 아끼는지**를 잰다.
 *
 * 위 `salePriority.test.ts`는 순위가 의도대로 도는지를 본다. 여기는 그 결과로
 * **지갑에서 나가는 돈**을 본다. 2026-09-07에 둘이 갈라졌다 — 순위 가드는 초록인데
 * 켠 사용자가 주당 $1.84를 더 내고 있었다.
 *
 * 공정한 비교 대상은 「끔 정가 원가」가 아니라 **「끔 실제 지불액」**이다. 특가는
 * 토글을 켜든 끄든 계산대에서 적용되므로, 토글의 값어치는 "특가를 알고 짠 주" 대
 * "모르고 짰지만 특가는 받은 주"의 차이다.
 *
 * 기록값 (n=1500/arm, 활성 특가 104건):
 *
 *      끔 정가 원가     중앙 $20.14      끔 실제 지불액  중앙 $18.82
 *      켬 실제 지불액   중앙 $15.70   →  순효과 -$3.12/주
 *
 * 여기 N은 CI가 매번 도니까 250이다. 위 숫자를 다시 재려면 N을 1500으로 올릴 것.
 */
describe.skipIf(!HAS_PROMOS)("특가를 켜면 주간 지출이 실제로 줄어든다", () => {
  it("공정 비교로 순효과가 음수다", async () => {
    const N = 250;
    const offNet: number[] = [];        // 끔 — 화면에 찍히는 값(정가)
    const offWithSales: number[] = [];  // 끔이지만 특가는 어차피 적용된다(실제 지불액)
    const onNet: number[] = [];         // 켬 — 실제 지불액
    const onGross: number[] = [];       // 켬 — 할인 전 원가(선택 편향만 본다)
    const onSaved: number[] = [];

    for (let i = 0; i < N; i++) {
      const off = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, fetchBatchPrices);
      offNet.push(must(off.totalWeekCost));
      offWithSales.push(repriceWithSales(ingListsOf(off), off.prices).cost);

      const on = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, fetchBatchPrices,
        { useSales: true, saleStores: STORES });
      onNet.push(must(on.totalWeekCost));
      onSaved.push(on.totalSavings ?? 0);
      onGross.push(must(on.totalWeekCost) + (on.totalSavings ?? 0));
    }

    console.log(`\n활성 특가 ${PROMOS.length}건 · n=${N}/arm\n`);
    console.log(`끔  정가 원가        ${f(stats(offNet))}`);
    console.log(`끔  실제 지불액      ${f(stats(offWithSales))}   ← 특가는 켜든 끄든 계산대에서 적용된다`);
    console.log(`켬  실제 지불액      ${f(stats(onNet))}`);
    console.log(`켬  할인 전 원가     ${f(stats(onGross))}   ← 선택 편향만`);
    console.log(`켬  화면 절약액      ${f(stats(onSaved))}`);
    const d = stats(onNet).med - stats(offWithSales).med;
    console.log(`\n▶ 토글의 순효과(공정 비교): ${d >= 0 ? "+" : ""}$${d.toFixed(2)} / 주 (중앙값)`);
    const g = stats(onGross).med - stats(offNet).med;
    console.log(`▶ 선택 편향(할인 전 원가): ${g >= 0 ? "+" : ""}$${g.toFixed(2)} / 주 (중앙값)\n`);

    expect(
      d,
      `특가를 켠 주가 끈 주보다 $${d.toFixed(2)} 더 든다 — 토글이 사용자에게 손해다`,
    ).toBeLessThan(-1);
    expect(
      stats(onGross).med,
      "할인 전 원가마저 싸야 한다 — 아닌데 총액만 싸다면 할인에만 기대고 있는 것이다",
    ).toBeLessThan(stats(offNet).med);
  }, 300_000);
});
