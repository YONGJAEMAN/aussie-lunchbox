import { describe, it, expect } from "vitest";
import promotionsJson from "@/data/promotions.json";
import type { PromotionsFile } from "@/data/promotions.types";
import { getActivePromotions, getPromotionsStatus } from "./promotions";
import { encodeSharedPlan, decodeSharedPlan, type SharedPlan } from "./planShare";

const FILE = promotionsJson as unknown as PromotionsFile;
const WEEK = FILE.weeks[FILE.currentWeek];
const WITHIN = new Date(`${WEEK.validFrom}T09:00:00+12:00`);

describe("섬별 전단 — 실제 데이터", () => {
  it("🔴 남섬 특가는 그 주 `southStores`에 품목이 있을 때만 켜진다 — 없으면 북섬 값을 대신 주지 않는다", () => {
    const southItems = Object.values(WEEK.southStores ?? {}).reduce((n, sp) => n + (sp?.items.length ?? 0), 0);
    const status = getPromotionsStatus(WITHIN, "south").state;
    const promos = getActivePromotions(["woolworths", "newworld"], WITHIN, "south");
    if (southItems === 0) {
      expect(status).toBe("missing");
      expect(promos).toEqual([]);
    } else {
      expect(status).toBe("active");
      const northNames = new Set(Object.values(WEEK.stores).flatMap((sp) => sp?.items.map((p) => p.name) ?? []));
      const southNames = new Set(Object.values(WEEK.southStores ?? {}).flatMap((sp) => sp?.items.map((p) => p.name) ?? []));
      for (const p of promos) expect(southNames.has(p.name) || !northNames.has(p.name), p.name).toBe(true);
    }
    // 양성 대조 — 같은 날 북섬은 특가가 있다(위 분기가 「아무 날이나 0」이라 통과하는 것이 아니다)
    expect(getPromotionsStatus(WITHIN, "north").state).toBe("active");
    expect(getActivePromotions(["woolworths", "newworld"], WITHIN, "north").length).toBeGreaterThan(0);
  });
});

const b64 = (o: unknown) =>
  Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const BASE: SharedPlan = {
  days: [
    { menu: "Sushi Rolls", snacks: ["Apple Slices"] },
    { menu: "Rice Paper Rolls", snacks: [] },
    { menu: "Cheesymite Scrolls", snacks: [] },
    { menu: "Mini Spinach Quiche", snacks: [] },
    { menu: "Chicken Pesto Panini", snacks: [] },
  ],
  allergies: [],
  excluded: [],
  prepStyles: [],
  thermosOnly: false,
  useSales: true,
  saleStores: ["woolworths", "newworld"],
};

describe("공유 링크 — 섬(`i`)", () => {
  it("🔴 북섬(생략)의 링크 문자열은 이 기능 전과 같다", () => {
    const before = encodeSharedPlan(BASE)!;
    expect(encodeSharedPlan({ ...BASE, island: "north" })).toBe(before);
    expect(Buffer.from(before, "base64url").toString()).not.toContain('"i"');
    expect(decodeSharedPlan(before)).toEqual(BASE);
  });

  it("남섬은 `i:1`로 실리고 왕복한다", () => {
    const param = encodeSharedPlan({ ...BASE, island: "south" })!;
    expect(param).not.toBe(encodeSharedPlan(BASE));
    expect(decodeSharedPlan(param)).toEqual({ ...BASE, island: "south" });
  });

  it("1 말고는 거절한다 — 북섬을 명시한 두 번째 링크가 생기지 않게", () => {
    const d = BASE.days.map((x) => [x.menu, ...x.snacks]);
    const s = [1, 2];
    for (const i of [0, 2, "1", true, null, [1]]) {
      expect(decodeSharedPlan(b64({ v: 1, d, s, i })), JSON.stringify(i)).toBeNull();
    }
    // 양성 대조
    expect(decodeSharedPlan(b64({ v: 1, d, s, i: 1 }))?.island).toBe("south");
    expect(decodeSharedPlan(b64({ v: 1, d, s }))?.island).toBeUndefined();
  });
});
