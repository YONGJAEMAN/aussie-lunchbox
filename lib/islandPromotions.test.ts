import { describe, it, expect, vi } from "vitest";

/**
 * 섬별 전단(2026-10-27). 남섬 전단이 들어온 주를 흉내 내려고 현재 주에 `southStores`를 붙인다.
 * 남섬 품목은 북섬에 없는 이름으로 만들어, 섞이면 바로 드러나게 한다.
 */
vi.mock("@/data/promotions.json", async (importOriginal) => {
  const real = (await importOriginal()) as { default: { currentWeek: string; weeks: Record<string, Record<string, unknown>> } };
  const file = structuredClone(real.default);
  const week = file.weeks[file.currentWeek];
  const item = (name: string, fit = "lunchbox") => ({
    name, matchKey: name.toLowerCase(), category: "Pantry", regularPrice: 5, salePrice: 4,
    savings: 1, savingsPercent: 20, promoType: "sale", lunchboxFit: fit,
  });
  week.southStores = {
    woolworths: { storeName: "Woolworths (South Island)", items: [item("SouthOnly Crackers"), item("SouthOnly Bin", "excluded")] },
    newworld: { storeName: "New World (South Island)", items: [item("SouthOnly Yoghurt", "snack-only")] },
  };
  return { default: file };
});

const { getActivePromotions, getPromotionsStatus, storesFor } = await import("./promotions");
const { activePromotionsFor } = await import("./planGenerator");
const promotionsFile = (await import("@/data/promotions.json")).default as unknown as {
  currentWeek: string;
  weeks: Record<string, { validFrom: string; validUntil: string }>;
};
const WEEK = promotionsFile.weeks[promotionsFile.currentWeek];
const WITHIN = new Date(`${WEEK.validFrom}T09:00:00+12:00`);

describe("섬별 전단 — 남섬 전단이 들어온 주", () => {
  it("🔴 남섬은 남섬 품목만, 북섬은 북섬 품목만 받는다", () => {
    const south = getActivePromotions(["woolworths", "newworld"], WITHIN, "south");
    const north = getActivePromotions(["woolworths", "newworld"], WITHIN, "north");
    expect(south.map((p) => p.name).sort()).toEqual(["SouthOnly Crackers", "SouthOnly Yoghurt"]);
    expect(north.length).toBeGreaterThan(0);
    expect(north.some((p) => p.name.startsWith("SouthOnly"))).toBe(false);
  });

  it("섬을 안 넘기면 북섬이다 — 이 기능 전 호출부가 그대로 동작한다", () => {
    expect(getActivePromotions(["woolworths", "newworld"], WITHIN)).toEqual(
      getActivePromotions(["woolworths", "newworld"], WITHIN, "north"),
    );
    expect(activePromotionsFor({ useSales: true, saleStores: ["woolworths", "newworld"] })).toEqual(
      activePromotionsFor({ useSales: true, saleStores: ["woolworths", "newworld"], island: "north" }),
    );
  });

  it("마트 선택과 「excluded」 거르기는 남섬에도 똑같이 적용된다", () => {
    const wOnly = getActivePromotions(["woolworths"], WITHIN, "south");
    expect(wOnly.map((p) => [p.name, p.store])).toEqual([["SouthOnly Crackers", "woolworths"]]);
  });

  it("유효기간은 섬과 상관없이 같은 주를 따른다", () => {
    expect(getPromotionsStatus(WITHIN, "south").state).toBe("active");
    const after = new Date(`${WEEK.validUntil}T09:00:00+12:00`);
    after.setUTCDate(after.getUTCDate() + 1);
    expect(getPromotionsStatus(after, "south").state).toBe("expired");
    expect(getActivePromotions(["woolworths", "newworld"], after, "south")).toEqual([]);
  });

  it("storesFor — 남섬 전단이 없는 주는 빈 것(북섬 값이 아니다)", () => {
    const week = { validFrom: "2026-01-05", validUntil: "2026-01-11", stores: { woolworths: { storeName: "W", items: [] } } };
    expect(storesFor(week, "south")).toEqual({});
    expect(storesFor(week, "north")).toBe(week.stores);
  });
});
