import { describe, it, expect } from "vitest";
import northCache from "@/data/price_cache.json";
import southCache from "@/data/price_cache.south.json";
import { fetchBatchPrices } from "./supermarketApi";
import { cacheFor, southCacheCoverage, type PriceCache } from "./priceCaches";
import { pricedMenuMatches, promoPackSize } from "./promotions";
import { PORTION_BASIS } from "./planConfig";
import { buildSharedPlan, priceDay } from "./planGenerator";
import { getMenuData, getSnackData } from "@/data/menuDataLoader";
import type { Promotion, StoreId } from "@/data/promotions.types";
import type { SharedPlan } from "./planShare";

const N = northCache as unknown as PriceCache;
const S = southCache as unknown as PriceCache;

/** 두 섬 가격이 다른 실제 재료 — 이게 없으면 아래 검사는 섬을 구분하지 못해도 통과한다(양성 대조). */
const DIFFERS = Object.keys(S).filter(
  (k) => N[k] && !S[k].data.fromNorth && N[k].data.price !== S[k].data.price,
);

describe("남섬 플래너 캐시", () => {
  it("두 섬 가격이 다른 재료가 실제로 있다(양성 대조)", () => {
    expect(DIFFERS.length).toBeGreaterThan(20);
  });

  it("🔴 남섬을 고르면 남섬 캐시 값, 생략하면 이전과 같은 북섬 값", async () => {
    const ings = DIFFERS.slice(0, 15);
    const south = await fetchBatchPrices(ings, "south");
    const north = await fetchBatchPrices(ings);
    ings.forEach((ing, i) => {
      expect(south[i].price, ing).toBe(S[ing].data.price);
      expect(north[i].price, ing).toBe(N[ing].data.price);
    });
  });

  it("남섬 캐시에 없는 재료는 북섬 캐시 경로로 간다(외부 조회로 새지 않는다)", async () => {
    const missing = Object.keys(N).filter((k) => !S[k]);
    for (const ing of missing) {
      expect((await fetchBatchPrices([ing], "south"))[0].price, ing).toBe(N[ing].data.price);
    }
  });

  it("🔴 fromNorth 표시가 붙은 값은 북섬 수집가와 같고, 화면의 개수와 맞는다", () => {
    const cov = southCacheCoverage();
    // 분모 = 크라이스트처치에서 읽은 것 + 오클랜드 값을 쓴 것(추정가 제외) — 화면의 「나머지는 오클랜드」가 참이 되게
    expect(cov.total).toBe(cov.read + cov.fromNorth.length);
    expect(cov.total).toBeLessThan(Object.keys(S).length);
    for (const ing of cov.fromNorth) {
      expect(S[ing].data.price, ing).toBe(N[ing].data.price);
      expect(S[ing].data.source, ing).toMatch(/Auckland price/);
    }
    // 남섬에서 실제로 읽은 값에는 표시가 없다
    const read = Object.entries(S).filter(([, v]) => !v.data.fromNorth && !/^est\./i.test(v.data.source ?? ""));
    expect(read.length).toBe(cov.read);
    expect(cov.read / cov.total, "남섬 캐시가 80% 미만이면 수집기가 쓰지 않았어야 한다").toBeGreaterThanOrEqual(0.8);
  });
});

describe("특가 매칭은 그 섬의 추적가로 잰다", () => {
  it("🔴 북섬보다 비싼 남섬 재료 — 그 사이 값의 특가는 남섬에서만 「더 싸다」", () => {
    // 팩 크기가 전단 이름과 맞아야 매칭된다(`pricedMatchFor`) — 무게·부피 팩을 가진 재료만 고른다.
    const ing = DIFFERS.find((k) => {
      const pack = PORTION_BASIS[k]?.pack ?? "";
      return S[k].data.price > N[k].data.price + 0.2 && /^\d+(\.\d+)?\s*(g|ml|kg|l)$/i.test(pack) && promoPackSize(`${k} ${pack}`) !== null;
    })!;
    expect(ing, "남섬이 더 비싸고 팩 크기가 있는 재료가 없다").toBeTruthy();
    const mid = Math.round(((N[ing].data.price + S[ing].data.price) / 2) * 100) / 100;
    const promo: Promotion & { store: StoreId } = {
      name: `${ing} ${PORTION_BASIS[ing]!.pack}`, matchKey: ing.toLowerCase(), category: "Pantry", regularPrice: S[ing].data.price,
      salePrice: mid, savings: S[ing].data.price - mid, savingsPercent: 10, promoType: "sale",
      lunchboxFit: "lunchbox", pricesIngredients: [ing], store: "woolworths",
    };
    const south = pricedMenuMatches([ing], [promo], cacheFor("south"));
    const north = pricedMenuMatches([ing], [promo]);
    expect(north.length, `${ing}: 북섬 추적가 $${N[ing].data.price}보다 비싼 특가 $${mid}는 매칭되면 안 된다`).toBe(0);
    expect(south.length, `${ing}: 남섬 추적가 $${S[ing].data.price}보다 싼 특가 $${mid}는 매칭돼야 한다`).toBe(1);
    // 화면 원가를 내는 경로(priceDay)도 그 섬 캐시로 잰다 — 생성·교체·공유·복원이 모두 이 함수다.
    const map = new Map([[ing, S[ing].data]]);
    expect(priceDay([ing], map, [promo], undefined, "south").saleMatches.length, "priceDay 남섬").toBe(1);
    expect(priceDay([ing], new Map([[ing, N[ing].data]]), [promo]).saleMatches.length, "priceDay 북섬").toBe(0);
  });
});

describe("공유 링크 — 남섬 식단은 남섬 가격으로 다시 매긴다", () => {
  it("🔴 같은 식단이 섬에 따라 다른 원가, 각자 그 섬 캐시와 같은 값", async () => {
    const menus = getMenuData("en");
    const snacks = getSnackData();
    const pick = menus.filter((m) => m.ingredients.some((i) => DIFFERS.includes(i))).slice(0, 5);
    expect(pick.length).toBe(5);
    const shared: SharedPlan = {
      days: pick.map((m) => ({ menu: m.name, snacks: [] })),
      allergies: [], excluded: [], prepStyles: [], thermosOnly: false, useSales: false, saleStores: [],
    };
    const north = await buildSharedPlan(menus, snacks, shared, (i) => fetchBatchPrices(i));
    const south = await buildSharedPlan(menus, snacks, { ...shared, island: "south" }, (i) => fetchBatchPrices(i, "south"));
    expect(south.totalWeekCost).not.toBe(north.totalWeekCost);
    for (const [plan, island] of [[north, "north"], [south, "south"]] as const) {
      const map = new Map(Object.entries(plan.prices ?? {}));
      for (const d of plan.planData) {
        expect(d.estCostValue, `${island} ${d.menuName}`).toBe(priceDay(d.rawIngredients, map, [], undefined, island).cost);
      }
    }
  });
});

describe("남섬 전용 고정 SKU(2026-10-28, 7개)", () => {
  it("🔴 남섬 고정은 남섬에서만 쓰이고, 북섬 조회는 이전과 같다", async () => {
    const { pinnedFor, PINNED_SKUS, PINNED_SKUS_SOUTH } = await import("./priceSearch.mjs");
    const south = PINNED_SKUS_SOUTH as Record<string, { sku: string }>;
    const north = PINNED_SKUS as Record<string, { sku: string }>;
    expect(Object.keys(south).length).toBe(7);
    for (const [ing, pin] of Object.entries(south)) {
      expect(north[ing], `${ing}: 북섬에 고정이 없는 재료를 남섬에만 고정했다`).toBeTruthy();
      expect(pinnedFor(ing, "south")?.sku, ing).toBe(pin.sku);
      expect(pinnedFor(ing)?.sku, `${ing}: 북섬이 남섬 SKU를 집었다`).toBe(north[ing].sku);
      expect(pin.sku, ing).not.toBe(north[ing].sku);
    }
    // 남섬 전용이 없는 재료는 남섬에서도 북섬 고정 상품을 읽는다
    expect(pinnedFor("Apple", "south")?.sku).toBe(north.Apple.sku);
  });

  it("🔴 kg당 상품은 kg당 재료에만 — 팩 재료 자리에 kg당 가격을 넣지 않는다", async () => {
    const { PINNED_SKUS_SOUTH } = await import("./priceSearch.mjs");
    for (const [ing, pin] of Object.entries(PINNED_SKUS_SOUTH as Record<string, { size?: string }>)) {
      const pack = PORTION_BASIS[ing]?.pack ?? "";
      const pinPerKg = /per\s*kg/i.test(pin.size ?? "");
      if (pinPerKg) expect(pack, `${ing}: kg당 상품인데 재료 팩이 「${pack}」`).toMatch(/per\s*kg/i);
      if (/per\s*kg/i.test(pack)) expect(pinPerKg, `${ing}: 재료는 kg당인데 상품이 팩`).toBe(true);
    }
  });

  it("남섬 캐시가 남섬 고정 상품을 실제로 읽었다(북섬 값 표시 없음)", async () => {
    const { PINNED_SKUS_SOUTH } = await import("./priceSearch.mjs");
    for (const [ing, pin] of Object.entries(PINNED_SKUS_SOUTH as Record<string, { sku: string }>)) {
      expect((S[ing].data as { sku?: string }).sku, ing).toBe(pin.sku);
      expect(S[ing].data.fromNorth, ing).toBeFalsy();
    }
  });
});

describe("섬별 도시락 어림 — 남섬 아웃리치 본문 검사용(2026-10-28)", () => {
  it("🔴 북섬은 사이트 게시값과 같다(본문 검사가 바뀌지 않았다)", async () => {
    const sp = await import("./servePrice");
    expect(sp.boxLabelsFor("north")).toEqual({
      median: sp.boxMedianLabel(), floor: sp.boxFloorLabel(), ceiling: sp.boxCeilingLabel(),
    });
    expect(sp.boxLabelsFor()).toEqual(sp.boxLabelsFor("north"));
  });

  it("남섬은 남섬 캐시로 잰다 — 북섬과 다른 값(양성 대조)", async () => {
    const sp = await import("./servePrice");
    expect(sp.boxLabelsFor("south")).not.toEqual(sp.boxLabelsFor("north"));
  });
});
