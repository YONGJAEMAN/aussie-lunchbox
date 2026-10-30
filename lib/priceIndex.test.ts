import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import INDEX from "@/data/priceIndex.json";
import SOURCES from "@/data/priceIndexSources.json";
import HISTORY from "@/data/priceHistory.json";
import { indexItems, indexUpdated, basketTotal, colesStatus } from "./priceIndex";
import { packSizeFromName } from "./unitPrice";
import { coverage, seriesFor, changeSince, MIN_POINTS } from "./priceSeries";
import { indexReading } from "../scripts/update_price_index.mjs";
import { columnReadEnough, oldestColumnDate, COLUMN_DATE_KEYS } from "../scripts/_priceIndexMeta.mjs";
import { observationsFrom, merge } from "../scripts/update_price_history.mjs";

/**
 * 🔴 AU 가격지수(3단계, 2026-10-30) 가드. Kiwi `priceIndex.test.ts`·`priceSeries.test.ts`에서 AU에 맞는 것만 가져왔다.
 *    한 체인(Woolworths) 고정 장바구니다 — Coles는 Imperva 봇 확인으로 추적하지 않는다.
 */

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf-8");
type Src = { sku: string; pinnedName: string; pinnedSize: string };
const SRC = (SOURCES as unknown as { items: Record<string, Src> }).items;
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]/g, " ").split(/\s+/).filter(Boolean);

describe("🔴 고정 상품 — 행 이름·note가 말하는 상품이 실제로 고정한 상품이다", () => {
  it("모든 행에 고정 SKU가 있고, 고정 목록에 지수에 없는 행이 없다", () => {
    const names = indexItems().map((i) => i.name);
    expect(names.filter((n) => !SRC[n]?.sku)).toEqual([]);
    expect(Object.keys(SRC).filter((n) => !names.includes(n))).toEqual([]);
    expect(names.length, "양성 대조 — Kiwi 20품목 틀").toBe(20);
  });

  it("note의 낱말이 전부 고정 상품명에 있다 — Kiwi 07-30: note를 안 읽어 17건 중 9건 브랜드가 어긋났다", () => {
    const off = indexItems()
      .filter((i) => i.note)
      .filter((i) => words(i.note).some((w) => !words(SRC[i.name].pinnedName).includes(w)))
      .map((i) => `${i.name}: note "${i.note}" ↔ "${SRC[i.name].pinnedName}"`);
    expect(off).toEqual([]);
  });

  it("행 이름의 규격이 고정 규격과 같다 — 독자가 보는 700g으로 단위가격을 나누니까", () => {
    const parse = (s: string) => {
      const w = /(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i.exec(s);
      if (w) return { n: Number(w[1]) * (/^(kg|l)$/i.test(w[2]) ? 1000 : 1), unit: /^(g|kg)$/i.test(w[2]) ? "g" : "ml" };
      const p = /(\d+)\s*-?\s*pack/i.exec(s);
      return p ? { n: Number(p[1]), unit: "ea" } : null;
    };
    const off: string[] = [];
    for (const i of indexItems()) {
      const fromName = packSizeFromName(i.name);
      if (!fromName) continue;
      // 계란은 개수(12)로 부르고 Woolworths는 무게(700g)로 적는다 — 개수는 상품명에서 본다.
      const pinned = i.name.startsWith("Eggs") ? parse(SRC[i.name].pinnedName) : parse(SRC[i.name].pinnedSize);
      if (!pinned || pinned.unit !== fromName.unit || pinned.n !== fromName.n) {
        off.push(`${i.name}: 이름 ${fromName.n}${fromName.unit} ↔ 고정 ${SRC[i.name].pinnedSize} / ${SRC[i.name].pinnedName}`);
      }
    }
    expect(off).toEqual([]);
  });
});

describe("🔴 값 — 0은 가격이 아니고, 날짜는 실제로 읽은 날이다", () => {
  it("값은 양수이거나 null(못 읽음)이다 — 0은 품절 응답이다(Kiwi 10-04 쌀 $0)", () => {
    expect(indexItems().filter((i) => !(i.woolworths === null || i.woolworths > 0)).map((i) => i.name)).toEqual([]);
  });

  it("lastUpdated = 가장 오래된 열 날짜 · 미래가 아니다", () => {
    expect(COLUMN_DATE_KEYS).toEqual(["woolworthsUpdated"]);
    expect(INDEX.lastUpdated).toBe(oldestColumnDate(INDEX));
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
    expect(indexUpdated()! <= today).toBe(true);
  });

  it("합계는 값이 있는 행만 더하고 몇 행인지 같이 말한다", () => {
    const { total, counted, of } = basketTotal();
    const priced = indexItems().filter((i) => typeof i.woolworths === "number");
    expect(counted).toBe(priced.length);
    expect(of).toBe(20);
    expect(total).toBeCloseTo(priced.reduce((s, i) => s + (i.woolworths as number), 0), 2);
  });
});

describe("🔴 수집기 판정 — 특가·품절·상품 변경을 지수에 넣지 않는다", () => {
  const src = { sku: "1", pinnedName: "bega peanut butter smooth", pinnedSize: "375g" };
  const p = (o: Record<string, unknown>) => ({ Name: "Bega Peanut Butter Smooth", PackageSize: "375g", Price: 5.8, WasPrice: 5.8, IsOnSpecial: false, ...o });

  it("평소엔 진열가", () => expect(indexReading(p({}), src)).toEqual({ kind: "ok", regular: 5.8 }));
  it("특가 주엔 WasPrice(정상가) — 특가는 넣지 않는다", () =>
    expect(indexReading(p({ Price: 4.5, IsOnSpecial: true }), src)).toEqual({ kind: "ok", regular: 5.8, sale: 4.5 }));
  it("특가인데 WasPrice가 없으면 SPECIAL(기존 값 유지)", () =>
    expect(indexReading(p({ Price: 4.5, WasPrice: 0, IsOnSpecial: true }), src).kind).toBe("special"));
  it("가격 0·null은 FAIL", () => {
    expect(indexReading(p({ Price: 0 }), src).kind).toBe("fail");
    expect(indexReading(p({ Price: null }), src).kind).toBe("fail");
  });
  it("이름이나 규격이 바뀌면 DRIFT — 공백·대소문자만 다른 건 같은 상품", () => {
    expect(indexReading(p({ Name: "Bega Peanut Butter Crunchy" }), src).kind).toBe("drift");
    expect(indexReading(p({ PackageSize: "470g" }), src).kind).toBe("drift");
    expect(indexReading(p({ Name: "  BEGA  Peanut Butter Smooth " }), src).kind).toBe("ok");
  });
  it("검색에 없으면 FAIL", () => expect(indexReading(undefined, src).kind).toBe("fail"));

  it("80% 규칙 — 특가보류는 읽은 것으로 센다", () => {
    expect(columnReadEnough({ updated: 16, failed: 4 })).toBe(true);
    expect(columnReadEnough({ updated: 15, failed: 5 })).toBe(false);
    expect(columnReadEnough({ updated: 10, specials: 6, drifted: 4 })).toBe(true);
    expect(columnReadEnough({})).toBe(false);
  });
});

describe("🔴 시계열 — 읽은 날의 값만, 0은 들어오는 단계에서 버린다", () => {
  it("observationsFrom: 날짜 없는 열은 통째로 건너뛰고 0·null은 관측이 아니다", () => {
    expect(observationsFrom({ items: [{ name: "A", woolworths: 1 }] })).toEqual([]);
    const [o] = observationsFrom({ woolworthsUpdated: "2026-11-01", items: [{ name: "A", woolworths: 0 }, { name: "B", woolworths: null }, { name: "C", woolworths: 2.5 }] });
    expect(o).toEqual({ label: "woolworths", date: "2026-11-01", items: { C: 2.5 } });
  });

  it("merge: 같은 날짜는 덮어쓰고(added → unchanged → updated) 날짜순을 지킨다", () => {
    const h = { columns: { woolworths: [] as { date: string; items: Record<string, number> }[] } };
    expect(merge(h, { label: "woolworths", date: "2026-11-08", items: { A: 1 } })).toBe("added");
    expect(merge(h, { label: "woolworths", date: "2026-11-01", items: { A: 2 } })).toBe("added");
    expect(merge(h, { label: "woolworths", date: "2026-11-08", items: { A: 1 } })).toBe("unchanged");
    expect(merge(h, { label: "woolworths", date: "2026-11-08", items: { A: 3 } })).toBe("updated");
    expect(h.columns.woolworths.map((r) => r.date)).toEqual(["2026-11-01", "2026-11-08"]);
  });

  it("이력의 마지막 관측 = 지금 지수 — 수집기가 지수 다음에 이력을 쌓는다", () => {
    const rounds = (HISTORY as unknown as { columns: { woolworths: { date: string; items: Record<string, number> }[] } }).columns.woolworths;
    const last = rounds.at(-1)!;
    expect(last.date).toBe(indexUpdated());
    const now = Object.fromEntries(indexItems().filter((i) => typeof i.woolworths === "number" && i.woolworths > 0).map((i) => [i.name, i.woolworths]));
    expect(last.items).toEqual(now);
  });

  it("관측이 2회 미만이면 변동은 null — 「변동 없음」이 아니라 「모른다」", () => {
    const [cov] = coverage();
    for (const i of indexItems()) {
      if (seriesFor(i.name).byChain.woolworths.length < 2) expect(changeSince(i.name, "woolworths")).toBeNull();
    }
    expect(cov.rounds, "양성 대조 — 이력이 있다").toBeGreaterThan(0);
    expect(MIN_POINTS).toBe(3);
  });
});

describe("🔴 화면이 데이터와 같은 말을 한다", () => {
  const PAGE = read("app/[locale]/price-index/page.tsx");
  const HIST = read("app/[locale]/price-history/page.tsx");

  it("Coles를 안 읽는 동안 두 페이지가 그렇다고 말하고, 「더 싸다」를 말하지 않는다", () => {
    expect(colesStatus().tracked).toBe(false);
    expect(PAGE).toMatch(/Coles is not tracked/);
    expect(HIST).toMatch(/Coles is not tracked/);
    for (const src of [PAGE, HIST]) expect(src).not.toMatch(/cheaper (at|than)|you save|save \$/i);
  });

  it("CSV가 표와 같은 값이다 — 행 수·합계를 독자가 다시 맞출 수 있다", async () => {
    const { GET } = await import("../app/price-index.csv/route");
    const [head, ...rows] = (await GET().text()).trim().split("\n");
    expect(head).toContain("price_aud");
    expect(rows.length).toBe(indexItems().length);
    const pi = head.split(",").indexOf("price_aud");
    // note에 쉼표가 있다("Don leg ham, shaved") — 따옴표를 존중해 자른다
    const cells = (r: string) => [...r.matchAll(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/g)].map((m) => m[1]);
    const sum = rows.map((r) => Number(cells(r)[pi]) || 0).reduce((a, b) => a + b, 0);
    expect(rows.filter((r) => cells(r)[pi] === "").length, "빈 값은 못 읽은 행만").toBe(20 - basketTotal().counted);
    expect(sum).toBeCloseTo(basketTotal().total, 2);
  });

  it("시계열 CSV 줄 수 = 관측 수", async () => {
    const { GET } = await import("../app/price-history.csv/route");
    const rows = (await GET().text()).trim().split("\n").slice(1);
    const points = indexItems().reduce((n, i) => n + seriesFor(i.name).byChain.woolworths.length, 0);
    expect(rows.length).toBe(points);
    expect(rows.every((r) => r.includes(",Woolworths,"))).toBe(true);
  });

  it("「매주 일요일」이라 말하는 자리가 launchd 요일과 같다", () => {
    const plist = read("ops/aussie-prices.plist");
    expect(plist).toMatch(/<key>Weekday<\/key><integer>0<\/integer>/);
    expect(PAGE).toMatch(/re-read every Sunday/);
    expect(JSON.parse(read("messages/en.json")).planner_price_index_link).toMatch(/every Sunday/);
    expect(read("scripts/collect_prices_local.sh")).toMatch(/update_price_index\.mjs --write[\s\S]*update_price_history\.mjs --write/);
  });

  it("내비·푸터·플래너가 링크하고, 재런칭 sitemap에 데이터 날짜로 들어 있다", async () => {
    expect(read("components/Navbar.tsx")).toContain('href: "/price-index"');
    expect(read("components/Footer.tsx")).toContain("/price-index`}");
    expect(read("components/Footer.tsx")).toContain("/price-history`}");
    expect(read("components/PlannerClient.tsx")).toContain("/price-index`}");
    const { sitemapEntries } = await import("../app/sitemap");
    const e = sitemapEntries().find((x) => x.url.endsWith("/en/price-index"));
    expect(new Date(e!.lastModified as Date).toISOString().slice(0, 10)).toBe(indexUpdated());
    expect(sitemapEntries().some((x) => x.url.endsWith("/en/price-history"))).toBe(true);
  });
});
