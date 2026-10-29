import { describe, it, expect } from "vitest";
import north from "@/data/priceIndex.json";
import south from "@/data/priceIndex.south.json";
import sources from "@/data/priceIndexSources.json";
import southHistory from "@/data/priceHistory.south.json";
import { islandPairs, islandSummary, southTableRows, CHAINS } from "./islandPrices";
import type { PriceRow } from "./priceIndexCompare";

type Row = PriceRow & { unit?: string; category?: string };
type File = { woolworthsUpdated?: string; lastUpdated?: string; items: Row[] };

const isl = () => import("../scripts/_island.mjs");

describe("남섬 지수 파일 — 북섬 값으로 채우지 않는다", () => {
  it("🔴 southIndexFrom은 남섬 값만 잇고, 없는 값은 null이다", async () => {
    const { southIndexFrom } = await isl();
    const n = { items: [
      { name: "Apples", category: "Fruit", unit: "per kg", countdown: 4, paknsave: 3, newworld: 5, paknsaveAsOf: "2026-10-25" },
      { name: "Bread", category: "Bakery", unit: "each", countdown: 4.4, paknsave: 2.99, newworld: 4.39 },
    ] };
    const s = { island: "south", woolworthsUpdated: "2026-10-28", items: [{ name: "Apples", countdown: 5.95, paknsave: null, newworld: null }] };
    const out = southIndexFrom(n, s) as unknown as File;
    expect(out.items.map((i: Row) => i.name)).toEqual(["Apples", "Bread"]);
    expect(out.items[0]).toMatchObject({ countdown: 5.95, paknsave: null, newworld: null });
    expect(out.items[1]).toMatchObject({ countdown: null, paknsave: null, newworld: null });
    expect(out.items[0].paknsaveAsOf).toBeUndefined();
    expect(out.woolworthsUpdated).toBe("2026-10-28");
    // 처음(남섬 파일 없음)에도 전부 null
    expect(southIndexFrom(n, null).items.every((i: Row) => i.countdown === null && i.paknsave === null)).toBe(true);
  });

  it("실제 남섬 파일의 품목 목록이 북섬과 같다(품목이 늘면 같이 는다)", () => {
    expect((south as File).items.map((i) => i.name)).toEqual((north as File).items.map((i) => i.name));
  });

  it("🔴 남섬 Foodstuffs 값에는 행 날짜가 있다 — 날짜 없는 값은 언제 잰 것인지 모른다", () => {
    for (const i of (south as File).items) {
      if (i.paknsave != null) expect(i.paknsaveAsOf, `${i.name} paknsave`).toBeTruthy();
      if (i.newworld != null) expect(i.newworldAsOf, `${i.name} newworld`).toBeTruthy();
    }
  });

  it("남섬 lastUpdated는 가장 오래된 열이고, 시계열 마지막 점과 같은 날이다", async () => {
    const { oldestColumnDate } = await import("../scripts/_priceIndexMeta.mjs");
    const s = south as File;
    expect(s.lastUpdated).toBe(oldestColumnDate(s));
    const cols = (southHistory as { columns: Record<string, { date: string }[]> }).columns;
    for (const c of ["woolworths", "paknsave", "newworld"]) {
      const key = `${c}Updated` as keyof typeof south;
      if (south[key]) expect(cols[c].at(-1)?.date, c).toBe(south[key]);
    }
  });
});

describe("남섬 SKU 조회 순서", () => {
  it("체인별 남섬 값 → 남섬 공용 → 북섬 체인 → 북섬 공용, blocked에서 멈춘다", async () => {
    const { foodstuffsSource } = await isl();
    const S = sources as unknown as Parameters<typeof foodstuffsSource>[0];
    // 쌀: NW 남섬은 SunRice(북섬 NW는 Fortune)
    expect(foodstuffsSource(S, "Rice (1kg)", "newworld", "south").sku).toBe("5002645-EA-000");
    expect(foodstuffsSource(S, "Rice (1kg)", "newworld", "north").sku).toBe("5303223-EA-000");
    // 양상추: 남섬 공용(paknsave_si)을 NW도 쓴다
    expect(foodstuffsSource(S, "Lettuce", "newworld", "south").sku).toBe("5252172-EA-000");
    expect(foodstuffsSource(S, "Lettuce", "paknsave", "south").sku).toBe("5252172-EA-000");
    // 🔴 남섬에 같은 규격이 없는 품목은 북섬 SKU로 새지 않는다
    for (const name of ["Bananas (1kg)", "Cherry Tomatoes (180g)", "Cheese Block (500g)"]) {
      for (const chain of ["paknsave", "newworld"] as const) {
        expect(foodstuffsSource(S, name, chain, "south").blocked, `${name} ${chain}`).toBe(true);
      }
    }
    expect(foodstuffsSource(S, "Eggs (12-pack)", "newworld", "south").blocked).toBe(true);
    // 양성 대조 — 같은 계란이 Pak'nSave 남섬에선 북섬 고정 SKU로 열린다
    expect(foodstuffsSource(S, "Eggs (12-pack)", "paknsave", "south").sku).toBe("5342311-EA-000");
  });

  it("북섬 조회는 이 기능 전과 같다(남섬 키를 보지 않는다)", async () => {
    const { foodstuffsSource } = await isl();
    const S = sources as unknown as { items: Record<string, Record<string, unknown>> };
    for (const [name, e] of Object.entries(S.items)) {
      expect(foodstuffsSource(S, name, "paknsave", "north"), name).toBe(e.paknsave);
      expect(foodstuffsSource(S, name, "newworld", "north"), name).toBe(e.newworld ?? e.paknsave);
    }
  });

  it("--island는 north|south만 받는다", async () => {
    const { islandArg } = await isl();
    expect(islandArg(["node", "x"])).toBe("north");
    expect(islandArg(["node", "x", "--island", "south"])).toBe("south");
    expect(() => islandArg(["node", "x", "--island", "SI"])).toThrow();
    expect(() => islandArg(["node", "x", "--island"])).toThrow();
  });
});

describe("두 섬 비교 — 같은 행 집합에서만 더한다", () => {
  const N: File = { woolworthsUpdated: "2026-10-25", items: [
    { name: "A", countdown: 4, paknsave: 3, paknsaveAsOf: "2026-10-25" },
    { name: "B", countdown: 2, paknsave: 2, paknsaveAsOf: "2026-08-01" },
    { name: "C", countdown: 5, paknsave: null },
  ] };
  const S: File = { woolworthsUpdated: "2026-10-28", items: [
    { name: "A", countdown: 5, paknsave: 4, paknsaveAsOf: "2026-10-28" },
    { name: "B", countdown: 2, paknsave: 2.5, paknsaveAsOf: "2026-10-28" },
    { name: "C", countdown: null, paknsave: 6, paknsaveAsOf: "2026-10-28" },
  ] };

  it("🔴 한쪽이 비었거나(특가 주·미취급) 관측일이 30일 넘게 벌어진 품목은 뺀다", () => {
    expect(islandPairs("paknsave", N, S).map((p) => p.name)).toEqual(["A"]); // B: 북섬이 88일 전 · C: 북섬 없음
    expect(islandPairs("woolworths", N, S).map((p) => p.name)).toEqual(["A", "B"]); // C: 남섬 없음
  });

  it("합계와 개수는 같은 쌍에서 나온다", () => {
    const s = islandSummary("woolworths", N, S);
    expect(s).toMatchObject({ count: 2, total: 3, north: 6, south: 7, southDearer: 1, same: 1, southCheaper: 0 });
  });

  it("실제 데이터 — 비교된 품목 수는 남섬 값이 있는 품목 수를 넘지 않는다", () => {
    for (const c of CHAINS) {
      const key = c === "woolworths" ? "countdown" : c;
      const southValues = (south as File).items.filter((i) => typeof i[key] === "number").length;
      const s = islandSummary(c);
      expect(s.count, c).toBeLessThanOrEqual(southValues);
      expect(s.count, `${c}: 남섬 첫 라운드부터 비교가 하나도 안 되면 날짜·키가 틀린 것이다`).toBeGreaterThan(0);
    }
  });

  it("🔴 Woolworths에서 막아 둔 품목의 북섬 옛 실사값은 표에 「오클랜드 값」으로 세우지 않는다", () => {
    const S = sources as unknown as { items: Record<string, { blocked?: boolean; sku?: string }> };
    const unread = Object.entries(S.items).filter(([, e]) => e.blocked || !e.sku).map(([n]) => n);
    expect(unread.length, "막아 둔 품목이 없으면 이 검사는 알리바이다").toBeGreaterThan(0);
    const rows = southTableRows();
    for (const name of unread) {
      const n = (north as File).items.find((i) => i.name === name);
      expect(typeof n?.countdown, `${name}: 북섬 파일엔 옛 값이 있다(양성 대조)`).toBe("number");
      expect(rows.find((r) => r.name === name)?.north.woolworths, name).toBeNull();
    }
  });
});
