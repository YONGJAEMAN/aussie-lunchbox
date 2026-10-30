import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { costForIngredients, effectivePackPrice, saleMapFor, weekTotalFrom } from "./planGenerator";
import { PORTION_FACTORS, DEFAULT_PORTION } from "./planConfig";
import type { PriceInfo } from "./types";
import type { SaleMatch } from "@/data/promotions.types";
import { getActivePromotions as activePromosForGate } from "./promotions";
// Aussie: AU 전단은 5단계 — 특가에 기대는 검사는 데이터가 들어오면 다시 켜진다(「없으면 missing」은 promotions.test).
const HAS_PROMOS = activePromosForGate(["woolworths", "newworld"]).length > 0;


/**
 * 플랜 총액과 쇼핑 목록 총액은 **같은 숫자**여야 한다.
 *
 * 🔴 2026-09-02 실측: 안 맞았다. 플랜 카드는 특가를 적용하는데 쇼핑 목록은
 *    정가표로 따로 재계산해서, 같은 화면에 총액 두 개가 뜨고 어긋났다.
 *
 *      특가 켬 → 플랜 $20.25 vs 목록 $21.38  (+5.6%)
 *      특가 끔 → 플랜 $23.65 vs 목록 $23.64  (반올림)
 *
 *    차이의 정체가 정확히 할인액이었다. 하필 **장 보러 갈 때 들고 가는 화면**에서만
 *    이 사이트의 핵심 가치(특가 절약)가 안 보였고, 바로 위 헤드라인과 모순됐다.
 *    방향도 비싼 쪽이라 우리가 학교에 보낸 "중앙값 $3.80" 주장을 스스로 깎아먹었다.
 *
 * 이 테스트는 쇼핑 목록이 쓰는 계산을 **플랜과 같은 함수로** 재현해서 둘이 갈라지지
 * 않는지 본다. 정적 크롤로는 못 잡는 종류였다 — 플래너를 실제로 돌려야 나온다.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** 쇼핑 목록 쪽 계산 — PlannerClient가 하는 것과 같은 식. */
function shoppingListTotal(
  counts: Record<string, number>,
  priceMap: Map<string, PriceInfo>,
  sales: Map<string, SaleMatch>,
): number {
  return Object.entries(counts).reduce((sum, [ing, count]) => {
    const base = priceMap.get(ing)?.price ?? 0;
    const portion = PORTION_FACTORS[ing] ?? DEFAULT_PORTION;
    return sum + effectivePackPrice(base, sales.get(ing)) * portion * count;
  }, 0);
}

const price = (name: string, p: number): [string, PriceInfo] =>
  [name, { name, price: p, source: "test" } as PriceInfo];

const sale = (ingredient: string, regular: number, salePrice: number): SaleMatch =>
  ({
    ingredient,
    store: "woolworths",
    promotion: { name: ingredient, regularPrice: regular, salePrice },
  }) as SaleMatch;

describe("플랜 총액 = 쇼핑 목록 총액", () => {
  const priceMap = new Map([price("Cheese", 8.0), price("Bread", 4.0), price("Apple", 1.0)]);
  // 하루치 재료(중복 포함) — 같은 재료가 여러 날 쓰이는 상황을 만든다.
  const days = [
    ["Cheese", "Bread"],
    ["Bread", "Apple"],
    ["Cheese", "Apple"],
  ];
  const counts = days.flat().reduce<Record<string, number>>((a, i) => {
    a[i] = (a[i] ?? 0) + 1;
    return a;
  }, {});

  it("특가가 없으면 두 총액이 같다", () => {
    const none = new Map<string, SaleMatch>();
    const plan = days.reduce((t, d) => t + costForIngredients(d, priceMap, none).cost, 0);
    expect(shoppingListTotal(counts, priceMap, none)).toBeCloseTo(plan, 10);
  });

  it("🔴 특가가 있어도 두 총액이 같다 — 이게 안 맞았던 고장이다", () => {
    const sales = saleMapFor([sale("Cheese", 8.0, 6.0)]);
    const plan = days.reduce((t, d) => t + costForIngredients(d, priceMap, sales).cost, 0);
    const list = shoppingListTotal(counts, priceMap, sales);
    expect(list).toBeCloseTo(plan, 10);
  });

  it("특가가 총액을 실제로 낮춘다 (할인이 조용히 무시되지 않는다)", () => {
    // 이게 없으면 "두 총액이 같다"는 둘 다 특가를 무시해도 통과한다 — 동어반복이 된다.
    const none = new Map<string, SaleMatch>();
    const sales = saleMapFor([sale("Cheese", 8.0, 6.0)]);
    expect(shoppingListTotal(counts, priceMap, sales)).toBeLessThan(
      shoppingListTotal(counts, priceMap, none),
    );
  });

  it("절약액이 두 총액의 차이와 맞는다", () => {
    const none = new Map<string, SaleMatch>();
    const sales = saleMapFor([sale("Cheese", 8.0, 6.0)]);
    const saved = days.reduce((t, d) => t + costForIngredients(d, priceMap, sales).saved, 0);
    const diff =
      shoppingListTotal(counts, priceMap, none) - shoppingListTotal(counts, priceMap, sales);
    expect(diff).toBeCloseTo(saved, 10);
  });

  it("🔴 전단 정가는 이제 계산에 안 쓴다 — 특가 자체가 값이다", () => {
    // 2026-09-09 이전엔 `basePrice * salePrice / regularPrice`였다. 그래서 정가가 0인
    // New World 전단이 0으로 나누기를 만들었고, 이 검사는 그걸 막던 것이다.
    // 이제는 비율을 안 쓰므로 정가가 없어도 특가 값 그대로가 답이다.
    const noRegular = saleMapFor([sale("Cheese", 0, 6.0)]);
    expect(effectivePackPrice(8.0, noRegular.get("Cheese"))).toBe(6.0);
    expect(Number.isFinite(shoppingListTotal(counts, priceMap, noRegular))).toBe(true);
  });

  it("🔴 표시 가격이 추적가보다 올라가지 않는다", () => {
    // 전단 특가가 우리 상시가보다 비싼 경우가 실제로 있다(John West 참치 $1.59 vs 추적 $1.35).
    const dearer = saleMapFor([sale("Cheese", 12.0, 9.0)]);
    expect(effectivePackPrice(8.0, dearer.get("Cheese"))).toBe(8.0);
  });
});

describe("쇼핑 목록이 정가표로 따로 계산하지 않는다", () => {
  const SRC = readFileSync(path.join(ROOT, "components", "PlannerClient.tsx"), "utf8");

  it("공유 함수를 쓴다", () => {
    expect(SRC, "effectivePackPrice를 안 쓴다 — 또 따로 계산하고 있을 수 있다").toContain(
      "effectivePackPrice(",
    );
    expect(SRC).toContain("saleMapFor(");
  });

  it("총액이 특가 반영 가격에서 나온다", () => {
    // `prices[ing].price`를 그대로 곱해 총액을 만들던 옛 코드로 돌아가면 잡는다.
    const line = SRC.split("\n").find((l) => l.includes("const totalCost"));
    const idx = SRC.indexOf("const totalCost");
    expect(line, "totalCost 계산을 못 찾았다").toBeTruthy();
    const block = SRC.slice(idx, idx + 400);
    expect(block, "totalCost가 item.price(특가 반영값)에서 나오지 않는다").toContain("item.price");
  });

  it("할인된 행은 정가를 취소선으로 같이 보여 준다", () => {
    // 총액만 고치고 행은 정가인 채로 두면, 행을 더한 값과 총액이 또 안 맞는다.
    //
    // 🔴 처음에 이걸 `toContain("item.regularPrice")` + `toContain("line-through")`로
    //    썼다가 돌연변이가 통과했다. 둘 다 **다른 줄에도** 있어서(취소선은 절약액
    //    표시에도 쓰인다) 블록을 통째로 지워도 초록이었다. 한 블록 안에서 볼 것.
    expect(
      SRC,
      "쇼핑 목록 행에서 정가를 취소선으로 보여 주는 블록이 없다",
    ).toMatch(
      /item\.regularPrice !== undefined && \([\s\S]{0,200}line-through[\s\S]{0,160}item\.regularPrice\.toFixed/,
    );
  });
});

/**
 * 🔴 2026-09-10 외부 감사 5번 — 두 총액이 **1센트** 어긋나 있었다.
 *
 *      할인 요약·장보기 $15.81   ·   주간 식단 상단 $15.82
 *      복합 필터 표본  $22.26   ·   상단 $22.25
 *
 *    할인 적용은 이미 한 자리로 합쳐져 있었다(위 2026-09-02 건). 남은 원인은
 *    상단이 **카드에 찍힌 문자열**(`$3.16`처럼 이미 센트로 자른 값)을 다섯 번
 *    더한 것이었다. 반올림을 다섯 번 한 뒤 더하면 정밀합과 최대 2.5센트까지 벌어진다.
 *
 *    이제 `PlanItem.estCostValue`(반올림 전)를 더하고 마지막에 한 번만 자른다.
 */
describe("🔴 주간 상단 합계와 장보기 합계가 센트까지 같다", () => {
  const menuData = JSON.parse(readFileSync(path.join(ROOT, "data/menuData.json"), "utf-8")) as {
    MENU_DATA: { en: import("./types").MenuItem[] };
    SNACK_DATA: import("./types").SnackData;
  };
  const stub = async (ings: string[]): Promise<PriceInfo[]> =>
    // 🔴 딱 떨어지는 가격을 쓰면 반올림 오차가 안 생겨 이 검사가 알리바이가 된다.
    //    센트 아래가 남는 값을 준다.
    ings.map((name, i) => ({ name, price: 3.33 + (i % 7) * 0.47, source: "test" }) as PriceInfo);

  it("30회 생성 동안 두 합계의 표시값이 같다", async () => {
    const { buildWeeklyPlan } = await import("./planGenerator");
    let roundingWouldHaveDiffered = 0;
    for (let run = 0; run < 30; run++) {
      const plan = await buildWeeklyPlan(
        menuData.MENU_DATA.en, [], [], [], "", menuData.SNACK_DATA, stub,
        { useSales: true, saleStores: ["woolworths", "newworld"] },
      );
      const counts: Record<string, number> = {};
      for (const ing of plan.shoppingList) counts[ing] = (counts[ing] ?? 0) + 1;
      const priceMap = new Map(Object.entries(plan.prices));
      const sales = saleMapFor(plan.planData.flatMap((d) => d.saleMatches ?? []));

      const listTotal = shoppingListTotal(counts, priceMap, sales);
      const headline = weekTotalFrom(plan.planData)!;
      // 🔴 `toFixed(2)` 문자열로 비교하면 안 된다(2026-09-15). 두 합계는 **수학적으로
      //    같은데** 더하는 순서가 달라 마지막 비트가 다르다. 그 값이 마침 반올림
      //    경계(…x5)에 앉으면 문자열만 갈린다 — 6,000회 중 2회 나왔고, 재료 단위로
      //    분해하면 차이가 0이었다. 화면은 장보기 합계를 **찍지도 않는다**
      //    (`shoppingListTotal`은 여기 있는 모델이다). 수치로 비교하는 쪽이
      //    옛 버그(반올림한 문자열 다섯 개를 더해 최대 2.5센트 오차)도 **더 날카롭게** 잡는다.
      expect(headline, `run ${run}`).toBeCloseTo(listTotal, 6);

      // 옛 방식(카드 문자열을 파싱해 더하기)이 실제로 달라졌을 run을 센다.
      const oldWay = plan.planData.reduce(
        (a, d) => a + parseFloat(d.estCost.replace(/[^0-9.]/g, "")), 0,
      );
      if (oldWay.toFixed(2) !== listTotal.toFixed(2)) roundingWouldHaveDiffered++;
    }
    // 🔴 양성 대조 — 옛 방식이 한 번도 안 어긋났다면 이 가드는 아무것도 안 지킨다.
    expect(roundingWouldHaveDiffered, "옛 방식이 한 번도 안 어긋났다 — 이 검사가 알리바이다")
      .toBeGreaterThan(0);
  });
});

/** 🔴 합계 식이 컴포넌트로 되돌아가면 위 가드가 알리바이가 된다. 화면이 그 함수를 쓰는지 본다. */
describe("🔴 화면이 합계를 직접 계산하지 않는다", () => {
  const src = readFileSync(path.join(ROOT, "components/PlannerClient.tsx"), "utf-8");
  it("주간 상단이 weekTotalFrom을 쓴다", () => {
    expect(src, "weekTotalFrom을 안 쓴다").toContain("weekTotalFrom(planData)");
    expect(src, "카드 문자열을 다시 파싱하고 있다")
      .not.toMatch(/estCost\.replace\(\/\[\^0-9\.\]\/g/);
  });
});

/**
 * 🔴 2026-09-15: 간식 재료가 특가 대조를 통째로 건너뛰고 있었다.
 *
 * `buildWeeklyPlan`이 `pricedMenuMatches(menu.ingredients, …)`로만 맵을 만들고
 * **그 맵으로 간식 비용까지** 계산했다. 특가인 간식이 정가로 잡혔고, 그날 메뉴에
 * 같은 재료가 우연히 들어 있을 때만 할인을 받아 날마다 동작이 달랐다.
 *
 * 위 합계 가드는 이걸 **가끔만** 잡았다(무작위 30회 중 1/6 확률로). 결함을
 * 직접 겨누는 검사가 따로 있어야 한다.
 */
describe.skipIf(!HAS_PROMOS)("🔴 간식 재료도 특가 대조를 거친다", () => {
  const menuData2 = JSON.parse(readFileSync(path.join(ROOT, "data/menuData.json"), "utf-8")) as {
    MENU_DATA: { en: import("./types").MenuItem[] };
    SNACK_DATA: import("./types").SnackData;
  };

  it("특가 대상인 간식 재료가 실제로 존재한다 — 없으면 아래 검사가 알리바이다", async () => {
    const { getActivePromotions, pricedMenuMatches } = await import("./promotions");
    const promos = getActivePromotions(["woolworths", "newworld"]);
    const snackIngs = [
      ...new Set(
        Object.values(menuData2.SNACK_DATA).flatMap((arr) =>
          (arr as import("./types").SnackItem[]).flatMap((s) => s.ingredients ?? []),
        ),
      ),
    ];
    const matched = pricedMenuMatches(snackIngs, promos);
    expect(
      matched.length,
      "특가에 걸리는 간식 재료가 0개다 — 이 주차 데이터로는 아래 검사가 아무것도 안 지킨다",
    ).toBeGreaterThan(0);
  });

  it("간식으로만 쓰인 특가 재료에도 할인이 닿는다", async () => {
    const { getActivePromotions, pricedMenuMatches } = await import("./promotions");
    const { buildWeeklyPlan } = await import("./planGenerator");
    const promos = getActivePromotions(["woolworths", "newworld"]);
    const stub2 = async (ings: string[]): Promise<PriceInfo[]> =>
      ings.map((name, i) => ({ name, price: 3.33 + (i % 7) * 0.47, source: "test" }) as PriceInfo);

    let checked = 0;
    for (let run = 0; run < 60 && checked < 3; run++) {
      const plan = await buildWeeklyPlan(
        menuData2.MENU_DATA.en, [], [], [], "", menuData2.SNACK_DATA, stub2,
        { useSales: true, saleStores: ["woolworths", "newworld"] },
      );
      for (const d of plan.planData) {
        const snackIngs = (d.snacks ?? []).flatMap((s) => s.ingredients ?? []);
        const menuIngs = d.rawIngredients ?? [];
        // 그날 **간식에만** 있고 메뉴엔 없는 재료 중 특가 대상인 것
        const onlySnack = [...new Set(snackIngs)].filter((x) => !menuIngs.includes(x));
        const shouldMatch = pricedMenuMatches(onlySnack, promos).map((m) => m.ingredient);
        if (!shouldMatch.length) continue;
        const got = new Set((d.saleMatches ?? []).map((m) => m.ingredient));
        for (const ing of shouldMatch) {
          expect(got.has(ing), `${d.day}: 간식 재료 ${ing} 가 특가인데 saleMatches 에 없다`).toBe(true);
        }
        checked++;
      }
    }
    expect(checked, "간식 전용 특가 재료가 한 번도 안 뽑혔다 — 검사가 안 돌았다").toBeGreaterThan(0);
  });
});
