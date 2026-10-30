import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildWeeklyPlan, menuNetCost, menuSaleSavings, menuWeight } from "./planGenerator";
import { getActivePromotions } from "./promotions";
import { PORTION_FACTORS, PORTION_BASIS } from "./planConfig";
import { packPrice } from "./servePrice";
import menuData from "../data/menuData.json";
import type { StoreId, Promotion } from "@/data/promotions.types";
import type { MenuItem, PriceInfo, SnackData } from "./types";
// Aussie: AU 전단은 아직 없다(5단계) — 특가에 기대는 검사는 데이터가 들어오면 자동으로 다시 켜진다.
// 「없으면 missing」은 lib/promotions.test.ts가 따로 확인한다.
const HAS_PROMOS = getActivePromotions(["woolworths", "coles"]).length > 0;


/**
 * 특가 우선순위를 "특가가 걸렸나"(이진)에서 "얼마나 아끼나"(절약액)로 바꾼 것을 지키는 가드.
 *
 * 🔴 2026-09-02에 실측하다 더 큰 걸 찾았다 — **우선순위 자체가 죽어 있었다.**
 *
 *      `selectFiveMenus`가 첫 줄에서 `shuffle(pool)`을 했다. 그래서 앞단이 정한
 *      순서(즐겨찾기 → 남은 재료 → 특가)가 통째로 버려졌다.
 *
 *      즐겨찾기 "Chicken" 등장률 : 14.1%   (우연 기대치 14.9% — 효과 0)
 *      고친 뒤                    : 80.0%
 *
 *    특가만이 아니라 **즐겨찾기와 남은 재료 기능도 아무 일도 안 하고 있었다.**
 *    화면에는 아무 에러도 안 났고, 그럴듯한 주간 계획이 매번 나왔다.
 *
 * 그래서 이 파일의 핵심은 소스를 읽는 가드가 아니라 **행동을 재는 가드**다.
 * 순서를 다시 버리는 변경이 들어오면 등장률이 우연 수준으로 떨어져서 잡힌다.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const raw = menuData as unknown as { MENU_DATA: { en: MenuItem[] }; SNACK_DATA: SnackData };
const MENUS = raw.MENU_DATA.en;
const SNACKS = raw.SNACK_DATA;
const STORES = ["woolworths", "coles"] as StoreId[];

const stubPrices = async (ings: string[]): Promise<PriceInfo[]> =>
  ings.map((name) => ({ name, price: 5, source: "test" }) as PriceInfo);

/**
 * 🔴 2026-09-09 개편 — 특가는 이제 **전단이 우리 재료를 직접 적었을 때만**
 *    가격에 반영되고(`pricesIngredients`), 절약액은 전단의 `savings`가 아니라
 *    **우리 추적가 대비**로 다시 잰다. 그래서 이 헬퍼도 "우리 추적가에서 얼마 깎는가"로
 *    특가를 만든다 — 옛 헬퍼는 전단 정상가 $10을 지어내고 그 비율을 우리 값에 곱했다.
 *
 *    상품명에 우리가 추적하는 팩 크기를 넣는다. 크기가 다르면 매칭이 거부되는데,
 *    그게 Turkish Loaf 400g가 700g짜리 Bread를 할인하던 통로였다.
 */
const promo = (ingredient: string, offOurPrice: number): Promotion & { store: StoreId } => {
  const base = packPrice(ingredient);
  const salePrice = base - offOurPrice;
  return {
    name: `${ingredient} ${PORTION_BASIS[ingredient].pack}`,
    matchKey: ingredient.toLowerCase(),
    pricesIngredients: [ingredient],
    category: "Pantry",
    regularPrice: base,
    salePrice,
    savings: offOurPrice,
    savingsPercent: Math.round((offOurPrice / base) * 100),
    promoType: "sale", lunchboxFit: "lunchbox", store: "woolworths",
  };
};

describe("menuSaleSavings — 1인분 절약액", () => {
  it("특가가 없으면 0이다", () => {
    expect(menuSaleSavings(["Cheese", "Bread"], [])).toBe(0);
  });

  it("팩 절약액에 1인분 비율을 곱한다", () => {
    // Cheese = 0.06 (500g 팩의 30g). 팩에서 $2 싸지면 한 끼에 아끼는 건 $0.12다.
    expect(PORTION_FACTORS["Cheese"]).toBe(0.06);
    expect(menuSaleSavings(["Cheese"], [promo("Cheese", 2)])).toBeCloseTo(0.12, 10);
  });

  it("팩 절약액을 그대로 쓰지 않는다 — 큰 팩이 무조건 이기면 안 된다", () => {
    // 이게 없으면 "$2 팩 할인"을 한 끼 $2 절약으로 세는 옛 방식이 통과한다.
    expect(menuSaleSavings(["Cheese"], [promo("Cheese", 2)])).toBeLessThan(2);
  });

  it("여러 재료가 걸리면 더한다", () => {
    const both = menuSaleSavings(["Cheese", "Bread"], [promo("Cheese", 2), promo("Bread", 1)]);
    const cheeseOnly = menuSaleSavings(["Cheese"], [promo("Cheese", 2)]);
    expect(both).toBeGreaterThan(cheeseOnly);
    expect(both).toBeCloseTo(0.06 * 2 + PORTION_FACTORS["Bread"] * 1, 10);
  });

  it("🔴 팩 크기 근거가 없는 재료엔 특가가 아예 안 붙는다", () => {
    // 2026-09-09 이전엔 DEFAULT_PORTION으로 절약액을 만들어 줬다. 이제는 우리 팩
    // 크기를 모르면 전단 크기와 대조할 수가 없으므로 **아무것도 만들지 않는다** —
    // 크기를 모른 채 만든 금액이 정확히 이번에 걷어낸 문제다.
    expect(PORTION_BASIS["Zzz Unknown"]).toBeUndefined();
    const fake = {
      name: "Zzz Unknown 500g", matchKey: "zzz unknown", pricesIngredients: ["Zzz Unknown"],
      category: "Pantry", regularPrice: 10, salePrice: 7, savings: 3, savingsPercent: 30,
      promoType: "sale", lunchboxFit: "lunchbox", store: "woolworths",
    } as unknown as Promotion & { store: StoreId };
    expect(menuSaleSavings(["Zzz Unknown"], [fake])).toBe(0);
  });

  it("더 많이 아끼는 특가가 더 큰 값을 준다 (이진이 아니다)", () => {
    // 🔴 옛 방식은 $0.042짜리와 $0.756짜리를 똑같이 "우선"으로 취급했다.
    const small = menuSaleSavings(["Cheese"], [promo("Cheese", 0.5)]);
    const big = menuSaleSavings(["Cheese"], [promo("Cheese", 3)]);
    expect(big).toBeGreaterThan(small * 2);
  });
});

describe("순서가 실제로 지켜진다 (shuffle 버그 회귀 가드)", () => {
  /** favorites/leftover를 준 뒤, 그 재료가 든 도시락이 5칸 중 몇 %인지. */
  async function hitRate(favorites: string[], leftover: string, N: number) {
    const want = [...favorites, leftover].filter(Boolean).map((w) => w.toLowerCase());
    let hits = 0, slots = 0;
    for (let i = 0; i < N; i++) {
      const p = await buildWeeklyPlan(MENUS, [], [], favorites, leftover, SNACKS, stubPrices);
      for (const d of p.planData) {
        slots++;
        if (d.rawIngredients.some((x) => want.some((w) => x.toLowerCase().includes(w)))) hits++;
      }
    }
    return (hits / slots) * 100;
  }

  /** 우연히 뽑힐 확률 — 이 값과 붙어 있으면 우선순위가 죽은 것이다. */
  function chanceRate(word: string) {
    const n = MENUS.filter((m) =>
      m.ingredients.some((i) => i.toLowerCase().includes(word.toLowerCase())),
    ).length;
    return (n / MENUS.length) * 100;
  }

  /** 그 재료가 **한 주에 한 번이라도** 나오는 비율. 남은 재료는 이게 중요하다. */
  async function weekRate(favorites: string[], leftover: string, N: number) {
    const want = [...favorites, leftover].filter(Boolean).map((w) => w.toLowerCase());
    let weeks = 0;
    for (let i = 0; i < N; i++) {
      const p = await buildWeeklyPlan(MENUS, [], [], favorites, leftover, SNACKS, stubPrices);
      if (p.planData.some((d) => d.rawIngredients.some((x) =>
        want.some((w) => x.toLowerCase().includes(w))))) weeks++;
    }
    return (weeks / N) * 100;
  }

  it("🔴 즐겨찾기가 우연 수준을 크게 넘는다", async () => {
    const chance = chanceRate("Chicken");   // 14.9%
    const actual = await hitRate(["Chicken"], "", 100);   // 실측 44.1%
    expect(chance).toBeLessThan(25);
    expect(
      actual,
      `즐겨찾기 등장률 ${actual.toFixed(1)}% — 우연 기대치 ${chance.toFixed(1)}%와 붙어 있으면 ` +
        "순서가 또 버려진 것이다 (selectFiveMenus의 shuffle을 의심할 것)",
    ).toBeGreaterThan(30);
  }, 30_000);

  it("🔴 플래너가 실제로 보내는 즐겨찾기(메뉴 이름)도 무게를 받는다 — 09-29까지 0이었다", async () => {
    // 위 두 검사는 재료명("Chicken")을 넣었지만 ☆는 **메뉴 이름**을 저장한다.
    // 그래서 가드가 초록인 동안 실제 사용자의 즐겨찾기는 한 번도 무게를 못 받았다.
    const src = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../components/PlannerClient.tsx"), "utf8");
    expect(src, "☆가 더는 메뉴 이름을 저장하지 않는다 — 이 검사의 전제를 다시 볼 것").toContain("toggleFavorite(item.menuName)");
    const name = "Chicken Pesto Panini";
    let weeks = 0;
    const N = 100;
    for (let i = 0; i < N; i++) {
      const p = await buildWeeklyPlan(MENUS, [], [], [name], "", SNACKS, stubPrices);
      if (p.planData.some((d) => d.menuName === name)) weeks++;
    }
    const chance = (5 / MENUS.length) * 100; // 한 주 5칸에 우연히 들어올 확률 ≈ 5%
    expect(weeks, `메뉴 이름 즐겨찾기가 ${weeks}/${N}주 — 우연(${chance.toFixed(1)}%)과 붙어 있으면 무게가 안 붙는 것이다`)
      .toBeGreaterThan(chance * 3);
  }, 30_000);

  it("🔴 그렇다고 한 주를 지배하지도 않는다", async () => {
    // 처음엔 즐겨찾기를 별도 티어로 올려서 **80.0%** 였다 — 5일 중 4일이 치킨.
    // 좋아한다고 매일 먹고 싶은 건 아니라서 무게로 낮췄다. 티어로 되돌리면 여기서 잡힌다.
    const actual = await hitRate(["Chicken"], "", 100);   // 실측 44.1% = 5일 중 2.2일
    expect(
      actual,
      `즐겨찾기 등장률 ${actual.toFixed(1)}% (5일 중 ${(actual / 20).toFixed(1)}일) — ` +
        "너무 높다. 즐겨찾기가 다시 별도 티어가 됐는지 볼 것",
    ).toBeLessThan(65);
  }, 30_000);

  it("남은 재료는 대부분의 주에 실제로 쓰인다", async () => {
    // 🔴 재료 하나가 든 메뉴 수가 상한을 만든다. Quinoa는 94개 중 1개뿐이라
    //    우연히 나올 확률이 한 주에 5.3%다. 실측 82%.
    const week = await weekRate([], "Quinoa", 120);
    expect(
      week,
      `남은 재료가 쓰인 주 ${week.toFixed(0)}% — 넣어 봐야 안 쓰이면 기능이 없는 것과 같다`,
    ).toBeGreaterThan(60);
  }, 30_000);

  it("남은 재료가 즐겨찾기보다 세다", async () => {
    // 냉장고 사정은 이번 주에 한정된 구체적 요구고, 즐겨찾기는 상시 취향이다.
    expect(menuWeight(["Quinoa"], [], "Quinoa")).toBeGreaterThan(
      menuWeight(["Quinoa"], ["Quinoa"], ""),
    );
  });

});

describe.skipIf(!HAS_PROMOS)("특가를 켜면 실제로 싸진다", () => {
  const promos = getActivePromotions(STORES);
  const poolMean =
    MENUS.reduce((t, m) => t + menuNetCost(m.ingredients, promos), 0) / MENUS.length;

  /**
   * 뽑힌 도시락들의 **할인 후 원가**가 전체 평균의 몇 배인가. 1보다 작아야 싸진 것이다.
   *
   * 🔴 2026-09-07까지 이 자리는 「절약액이 큰 쪽으로 기우나」를 쟀고, 실측 1.30~1.38배로
   *    초록이었다. 그런데 **절약액은 원가와 같이 움직인다**(r = 0.56) — 팩 절약액이 큰
   *    건 비싼 재료다. 그래서 가드는 통과하는데 사용자는 손해를 보고 있었다:
   *
   *      끔 실제 지불액 중앙 $18.89 / 켬 $20.73  (n=1500, 켜면 $1.84 비쌌다)
   *
   *    가드가 「기능이 의도대로 도나」를 재고 「그래서 사용자가 이득인가」는 안 쟀다.
   *    지금은 후자를 잰다. 절약액으로 되돌리면 이 값이 1을 넘어서 잡힌다.
   */
  async function netTilt(useSales: boolean, N: number) {
    let sum = 0, n = 0;
    for (let i = 0; i < N; i++) {
      const p = await buildWeeklyPlan(
        MENUS, [], [], [], "", SNACKS, stubPrices,
        useSales ? { useSales: true, saleStores: STORES } : undefined,
      );
      for (const d of p.planData) { sum += menuNetCost(d.rawIngredients, promos); n++; }
    }
    return sum / n / poolMean;
  }

  it("이번 주 특가가 실제로 걸려 있다 (그래야 아래 검사가 공허하지 않다)", () => {
    expect(promos.length, "활성 특가가 0건이면 아래 검사가 아무것도 안 본다").toBeGreaterThan(0);
    expect(poolMean).toBeGreaterThan(0);
  });

  it("🔴 특가 ON이면 할인 후 원가가 내려간다", async () => {
    const t = await netTilt(true, 200);   // 실측 0.72~0.78배
    expect(
      t,
      `할인 후 원가가 평균의 ${t.toFixed(2)}배 — 1을 넘으면 특가를 켠 사용자가 ` +
        "**더 내고 있다**. 가중치가 다시 절약액 기준으로 돌아갔는지 볼 것",
    ).toBeLessThan(0.9);
  }, 30_000);

  it("🔴 특가 OFF면 기울지 않는다 — 없으면 위 검사가 항상 참일 수 있다", async () => {
    const t = await netTilt(false, 200);  // 실측 0.97~1.03배
    expect(t, `특가를 껐는데 ${t.toFixed(2)}배로 기울었다`).toBeGreaterThan(0.9);
  }, 30_000);

  it("싼 것만 골라 매주 같은 주가 나오지는 않는다", async () => {
    // 할인 후 원가로 그냥 sort하면 Mac 'n Cheese·Peanut Butter Sandwich가 매주 나온다.
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const p = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stubPrices,
        { useSales: true, saleStores: STORES });
      for (const d of p.planData) seen.add(d.menuName);
    }
    expect(seen.size, `60주 동안 ${seen.size}가지만 나왔다 — 너무 고정적이다`).toBeGreaterThan(40);
  }, 30_000);

  it("🔴 싸게 미는 힘이 즐겨찾기·남은 재료를 덮지 않는다", async () => {
    // 가중치를 키우면 여기가 먼저 깨진다. 특가를 켠 채로도 남은 재료가 쓰여야 한다.
    let weeks = 0;
    for (let i = 0; i < 120; i++) {
      const p = await buildWeeklyPlan(MENUS, [], [], [], "Quinoa", SNACKS, stubPrices,
        { useSales: true, saleStores: STORES });
      if (p.planData.some((d) => d.rawIngredients.some((x) => x.toLowerCase().includes("quinoa")))) {
        weeks++;
      }
    }
    const rate = (weeks / 120) * 100;
    expect(
      rate,
      `특가 켠 채로 남은 재료가 쓰인 주 ${rate.toFixed(0)}% — CHEAPNESS_WEIGHT_SCALE이 ` +
        "너무 크면 여기가 먼저 죽는다",
    ).toBeGreaterThan(55);
  }, 40_000);

});

describe("selectFiveMenus가 순서를 다시 버리지 않는다", () => {
  it("remaining을 shuffle로 만들지 않는다", () => {
    // 행동 가드가 본체지만, 원인 지점을 직접 짚어 두면 되돌릴 때 바로 보인다.
    const src = readFileSync(path.join(ROOT, "lib", "planGenerator.ts"), "utf8");
    const start = src.indexOf("function selectFiveMenus");
    expect(start).toBeGreaterThan(-1);
    const body = src.slice(start, src.indexOf("\n}", start));
    expect(body, "selectFiveMenus가 다시 shuffle(p)를 하고 있다 — 우선순위가 무효가 된다")
      .not.toMatch(/const remaining = shuffle\(/);
  });
});

describe("menuWeight — 세 신호를 하나의 무게로 합친다", () => {
  it("아무 신호도 없으면 기본 무게 1이다", () => {
    expect(menuWeight(["Cheese"], [], "")).toBe(1);
  });

  it("즐겨찾기가 걸리면 무게가 오른다", () => {
    expect(menuWeight(["Chicken", "Rice"], ["Chicken"], "")).toBeGreaterThan(
      menuWeight(["Chicken", "Rice"], [], ""),
    );
  });

  it("곱하지 않고 더한다 — 셋 다 걸린 메뉴가 나머지를 밀어내면 안 된다", () => {
    const base = menuWeight(["Quinoa"], [], "");
    const fav = menuWeight(["Quinoa"], ["Quinoa"], "");
    const left = menuWeight(["Quinoa"], [], "Quinoa");
    const both = menuWeight(["Quinoa"], ["Quinoa"], "Quinoa");
    // 곱셈이면 both가 (fav-base)*(left-base) 규모로 튄다. 덧셈이면 정확히 이 값이다.
    expect(both).toBeCloseTo(fav + left - base, 10);
  });

  it("대소문자를 가리지 않는다", () => {
    expect(menuWeight(["Chicken"], ["chicken"], "")).toBe(menuWeight(["Chicken"], ["Chicken"], ""));
  });

  it("빈 남은재료 문자열은 아무 메뉴에도 안 걸린다", () => {
    // "" 를 includes로 보면 **모든 재료가 참**이 돼서 전 메뉴가 똑같이 무거워진다.
    expect(menuWeight(["Cheese"], [], "   ")).toBe(1);
  });
});
