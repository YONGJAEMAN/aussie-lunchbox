import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import "@/content/guides"; // contentClaims.test.ts와 같은 순서 — guides를 먼저 불러 순환을 연다
import { POSTS } from "@/content/posts";
import { ironCostRows, ironCostTableMarkdown, IRON_COST_FOODS } from "./ironCost";

/**
 * 🔴 기대값은 `lib/ironCost.ts`의 헬퍼를 거치지 않고 **원본 파일을 직접 읽어** 다시 계산한다.
 *    같은 함수로 기대값을 뽑으면 그 함수가 틀려도 전부 초록이다(guard-expectations-from-same-source).
 */
const RAW_IRON = JSON.parse(readFileSync(new URL("../data/ironContent.json", import.meta.url), "utf-8")) as {
  foods: Record<string, {
    ironPer100g: number; recordId: string; matched: string; url: string; dataUrl: string; accessed: string;
    haem: boolean; edibleShare?: { share: number; productSku: string; label: string; url: string; accessed: string };
    measure?: { text: string; grams: number };
  }>;
  reference: Record<string, { ironPer100g: number; recordId: string; matched: string; url: string; dataUrl: string; accessed: string; measure?: { text: string; grams: number } }>;
  excluded: Record<string, string>;
};
const RAW_PRICES = JSON.parse(readFileSync(new URL("../data/price_cache.json", import.meta.url), "utf-8")) as
  Record<string, { data?: { price?: number; sku?: string } }>;
const PLAN_SRC = readFileSync(new URL("./planConfig.ts", import.meta.url), "utf-8");

/** planConfig.ts 소스에서 `"Key": { pack: "500g", serve: "75g" }`를 직접 읽는다. */
function basisFromSource(key: string): { pack: number; serve: number } {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = PLAN_SRC.match(new RegExp(`(?:"${esc}"|\\b${esc}):\\s*\\{\\s*pack:\\s*"(\\d+(?:\\.\\d+)?)g",\\s*serve:\\s*"(\\d+(?:\\.\\d+)?)g"`));
  expect(m, `planConfig.ts에서 "${key}"의 g 단위 pack/serve를 못 읽었다`).toBeTruthy();
  return { pack: Number(m![1]), serve: Number(m![2]) };
}

const BODY = POSTS["iron-rich-lunchbox-foods-nz"].body;
const SECTION_START = "### What a serve of iron costs";
const SECTION_END = "## Iron and NZ School Terms";

describe("iron-rich: 「철분 1인분 원가」 표", () => {
  const rows = ironCostRows();

  it("표가 실제로 채워져 있다 (양성 대조)", () => {
    expect(rows.length, "행이 4개 미만이다 — 키가 빠졌으면 아래 검사가 전부 알리바이다").toBeGreaterThanOrEqual(4);
    expect(rows.length).toBe(IRON_COST_FOODS.length);
    expect(rows.some((r) => r.haem), "haem 행이 하나도 없다 — 흡수율 문장이 설 자리가 없다").toBe(true);
    expect(rows.some((r) => !r.haem)).toBe(true);
  });

  it("모든 행에 출처가 있다 — 레코드 ID·설명·URL·접속일", () => {
    for (const { key } of IRON_COST_FOODS) {
      const r = RAW_IRON.foods[key];
      expect(r, `${key}: ironContent.json에 없다`).toBeTruthy();
      expect(r.ironPer100g, key).toBeGreaterThan(0);
      expect(r.recordId, key).toMatch(/^[A-Z]\d+$/);
      expect(r.matched.length, key).toBeGreaterThan(3);
      expect(r.url, key).toMatch(/^https:\/\/www\.foodcomposition\.co\.nz\//);
      expect(r.dataUrl, key).toBe(`https://api.foodcomposition.co.nz/api/fiav/food/${r.recordId}?comp_group_id=12`);
      expect(r.accessed, key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof r.haem, key).toBe("boolean");
      expect(RAW_IRON.excluded[key], `${key}: 표에도 있고 제외 목록에도 있다`).toBeUndefined();
    }
  });

  it("참고 전용 음식·제공량에도 출처가 있다", () => {
    const all = { ...RAW_IRON.foods, ...RAW_IRON.reference };
    expect(Object.keys(RAW_IRON.reference).length, "참고 음식이 비었다").toBeGreaterThan(5);
    for (const [key, r] of Object.entries(all)) {
      expect(r.ironPer100g, key).toBeGreaterThan(0);
      expect(r.dataUrl, key).toBe(`https://api.foodcomposition.co.nz/api/fiav/food/${r.recordId}?comp_group_id=12`);
      expect(r.accessed, key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (r.measure) {
        expect(r.measure.grams, `${key}: 제공량 무게`).toBeGreaterThan(0);
        expect(r.measure.text.length, key).toBeGreaterThan(0);
      }
    }
  });

  it("강화식품 표는 레코드에 철(Fe) 강화가 적힌 것만 싣는다", () => {
    const body = BODY.slice(BODY.indexOf("| Product | Iron Content |"));
    const rows = body.split("\n\n")[0].split("\n").slice(2);
    expect(rows.length, "강화식품 표가 비었다").toBeGreaterThan(0);
    const fortified = Object.values(RAW_IRON.reference).filter((r) => /\bFe\b/.test(r.matched));
    expect(rows.length).toBe(fortified.length);
  });

  it("건더기 비율은 그 상품 라벨에서 왔다 — 가격을 읽은 상품과 같은 SKU", () => {
    const withShare = IRON_COST_FOODS.filter(({ key }) => RAW_IRON.foods[key].edibleShare);
    expect(withShare.length, "통조림 콩 행이 하나도 없다 — 이 검사가 알리바이다").toBeGreaterThan(0);
    for (const { key } of withShare) {
      const s = RAW_IRON.foods[key].edibleShare!;
      expect(RAW_PRICES[key]?.data?.sku, `${key}: 가격 캐시의 상품이 라벨을 읽은 상품과 다르다`).toBe(s.productSku);
      expect(s.label, key).toContain(`(${Math.round(s.share * 100)}%)`);
      expect(s.url, key).toBe(`https://www.woolworths.co.nz/shop/productdetails?stockcode=${s.productSku}`);
      expect(s.share).toBeGreaterThan(0);
      expect(s.share).toBeLessThan(1);
    }
  });

  it("1인분 원가 = 캐시 가격 × (1인분 g ÷ 팩 g) — 독립 재계산", () => {
    for (const r of rows) {
      const price = RAW_PRICES[r.key]?.data?.price;
      expect(typeof price, r.key).toBe("number");
      const { pack, serve } = basisFromSource(r.key);
      expect(r.cost, `${r.key}: 1인분 원가가 캐시×분량과 다르다`).toBeCloseTo(price! * (serve / pack), 6);
    }
  });

  it("1인분 철분 = 100g당 × 1인분 g × 건더기 비율 ÷ 100 — 독립 재계산", () => {
    for (const r of rows) {
      const ref = RAW_IRON.foods[r.key];
      const { serve } = basisFromSource(r.key);
      const expected = (ref.ironPer100g * serve * (ref.edibleShare?.share ?? 1)) / 100;
      expect(r.ironMg, `${r.key}: 1인분 철분이 다르다`).toBeCloseTo(expected, 6);
    }
  });

  it("본문에 표가 그대로 실렸고, 화면의 숫자끼리 나누면 1mg당 가격이 나오며 싼 순이다", () => {
    const i = BODY.indexOf("| Food (tracked product, pack) |");
    expect(i, "본문에 표가 없다").toBeGreaterThan(-1);
    expect(BODY).toContain(ironCostTableMarkdown());
    const lines = BODY.slice(i).split("\n\n")[0].split("\n").slice(2);
    expect(lines.length).toBe(rows.length);
    const dollars = (s: string) => {
      const m = s.replace(/\*/g, "").trim().match(/^(?:\$(\d+\.\d{2})|(\d+)c)$/);
      expect(m, `금액을 못 읽었다: ${s}`).toBeTruthy();
      return m![1] ? Number(m![1]) : Number(m![2]) / 100;
    };
    const perMg = lines.map((l) => {
      const cells = l.split("|").slice(1, -1).map((c) => c.trim());
      expect(cells.length, l).toBe(5);
      for (const c of cells) expect(c, l).not.toMatch(/NaN|undefined|Infinity/);
      const mg = cells[2].match(/^~(\d+(?:\.\d+)?)mg$/);
      expect(mg, `철분 칸을 못 읽었다: ${cells[2]}`).toBeTruthy();
      const cost = dollars(cells[3]);
      const shown = dollars(cells[4]);
      // 독자가 표의 두 숫자로 검산했을 때 맞아야 한다(반올림 1c 이내).
      expect(Math.abs(cost / Number(mg![1]) - shown), `${cells[0]}: 원가÷철분이 1mg당 칸과 다르다`).toBeLessThanOrEqual(0.005 + 1e-9);
      return cost / Number(mg![1]);
    });
    expect(perMg, "1mg당 가격 싼 순 정렬이 깨졌다").toEqual([...perMg].sort((a, b) => a - b));
  });

  it("🔴 새 절의 소스에 손으로 적은 금액·mg 수치가 없다", () => {
    const src = readFileSync(new URL("../content/posts.ts", import.meta.url), "utf-8");
    const a = src.indexOf(SECTION_START);
    const b = src.indexOf(SECTION_END, a);
    expect(a, "새 절을 소스에서 못 찾았다").toBeGreaterThan(-1);
    const strip = (s: string) => s.replace(/\$\{[^{}]*\}/g, "");
    const HAND = [/\$\s?\d/, /\b\d+(?:\.\d+)?\s?mg\b/i, /\b\d+c\b/, /\b\d+(?:\.\d+)?\s?g\b/];
    // 「per 100g」은 단위 설명이지 데이터가 아니다 — 그것만 지우고 본다.
    const section = strip(src.slice(a, b)).replace(/per 100g/g, "per HUNDRED");
    for (const re of HAND) expect(section, `새 절에 손으로 적은 수치가 있다: ${re}`).not.toMatch(re);
    // 양성 대조 — 예전 손글씨 모양을 정규식 넷이 각각 잡는다(생성 보간은 지워져 안 잡힌다).
    const sample = "Dried apricots (30g) ~0.9mg, ~$5.50/box, 34c a serve";
    for (const re of HAND) expect(strip(sample), `정규식이 손글씨를 못 잡는다 — 가드가 죽었다: ${re}`).toMatch(re);
    expect(strip("${portionIron(\"mixApricots\")} at ${x}")).not.toMatch(HAND[1]);
  });

  it("요약 문장이 표의 첫 행과 같은 말을 한다", () => {
    const first = rows[0];
    expect(BODY).toContain(`**Cheapest per milligram of iron: ${first.label.toLowerCase()}, at ${first.perMgLabel}**`);
    const last = rows[rows.length - 1];
    expect(BODY).toContain(`${last.label.toLowerCase()} works out at ${last.perMgLabel} a milligram`);
  });
});
