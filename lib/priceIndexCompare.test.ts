import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import index from "@/data/priceIndex.json";
import { basketTotals, comparableRows, isComparableRow, type PriceRow } from "./priceIndexCompare";

/**
 * 🔴 2026-08-12 실측 사고를 코드로 묶는다.
 * 라이브 페이지가 "You save at Pak'nSave $28.50 per week"를 띄우고 있었다.
 * $111.47(Woolworths 20품목) − $82.97(Pak'nSave 18품목). Pak'nSave 값이 없는
 * Yoghurt·Peanut Butter의 Woolworths 값 $15.54가 한쪽에만 들어가 있었다.
 * 진짜 like-for-like는 $4.99(12품목)다.
 */

const IDX = index as { woolworthsUpdated: string; items: PriceRow[] };

const row = (o: Partial<PriceRow>): PriceRow => ({
  name: "x",
  countdown: 10,
  paknsave: 8,
  paknsaveAsOf: IDX.woolworthsUpdated,
  ...o,
});

describe("isComparableRow", () => {
  it("양쪽 값이 있고 날짜가 가까우면 비교 가능", () => {
    expect(isComparableRow(row({}), IDX.woolworthsUpdated)).toBe(true);
  });

  it("한쪽 값이 없으면 비교 불가 — 0으로 채워 세지 않는다", () => {
    expect(isComparableRow(row({ paknsave: null }), IDX.woolworthsUpdated)).toBe(false);
    expect(isComparableRow(row({ countdown: null }), IDX.woolworthsUpdated)).toBe(false);
  });

  it("값이 0원이어도 null과 구분한다 — 0은 유효한 값이다", () => {
    expect(isComparableRow(row({ paknsave: 0 }), IDX.woolworthsUpdated)).toBe(true);
  });

  it("그 행의 조사일이 30일 넘게 벌어지면 비교 불가", () => {
    expect(isComparableRow(row({ paknsaveAsOf: "2026-05-16" }), "2026-08-10")).toBe(false);
    expect(isComparableRow(row({ paknsaveAsOf: "2026-07-20" }), "2026-08-10")).toBe(true);
  });

  it("조사일이 아예 없으면 비교 불가 — 옛 데이터다", () => {
    expect(isComparableRow(row({ paknsaveAsOf: undefined }), IDX.woolworthsUpdated)).toBe(false);
  });
});

describe("basketTotals", () => {
  it("🔴 두 합계는 반드시 같은 행 집합에서 나온다", () => {
    const rows: PriceRow[] = [
      row({ name: "a", countdown: 10, paknsave: 8 }),
      row({ name: "b", countdown: 5, paknsave: null }), // Pak'nSave 값 없음
    ];
    const t = basketTotals(rows, IDX.woolworthsUpdated);
    expect(t.count).toBe(1);
    expect(t.woolworths).toBe(10); // b의 $5가 한쪽에만 들어가면 안 된다
    expect(t.paknsave).toBe(8);
    expect(t.savings).toBe(2);
  });

  it("🔴 낡은 행은 합계에서 빠진다 — 시차를 매장 차이로 팔지 않는다", () => {
    const rows: PriceRow[] = [
      row({ name: "fresh", countdown: 10, paknsave: 8, paknsaveAsOf: "2026-08-10" }),
      // 버터 사례: 5월 Pak'nSave 값이 8월 Woolworths 값 옆에 서면 45% 싸 보인다
      row({ name: "butter", countdown: 10.4, paknsave: 5.79, paknsaveAsOf: "2026-05-16" }),
    ];
    const t = basketTotals(rows, "2026-08-10");
    expect(t.count).toBe(1);
    expect(t.savings).toBe(2);
  });

  it("실데이터: 합계 품목 수가 비교 가능 행 수와 정확히 일치한다", () => {
    const t = basketTotals();
    expect(t.count).toBe(comparableRows().length);
    expect(t.count).toBeGreaterThan(0);
    expect(t.count).toBeLessThanOrEqual(t.total);
  });

  it("🔴 실데이터: 절약액이 '전체 합계 뺄셈'과 같으면 그 버그가 돌아온 것이다", () => {
    const naive =
      IDX.items.reduce((s, i) => s + (i.countdown ?? 0), 0) -
      IDX.items.reduce((s, i) => s + (i.paknsave ?? 0), 0);
    const t = basketTotals();
    // 한쪽만 값이 있는 행이 하나라도 있으면 두 값은 달라야 한다
    const lopsided = IDX.items.filter(
      (i) => (i.countdown === null) !== (i.paknsave === null),
    ).length;
    if (lopsided > 0) {
      expect(t.savings).not.toBeCloseTo(naive, 2);
    }
  });
});

describe("규칙이 한 곳에만 있어야 한다", () => {
  /**
   * 🔴 이 사고의 원인은 계산이 세 군데였다는 것이다(페이지·비교 글·그리고 아무도 안 쓰는 합계).
   *    같은 일을 하는 자리가 둘 이상이면 하나만 고치게 된다.
   */
  const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

  it("price-index 페이지는 자체 reduce로 바구니를 합치지 않는다", () => {
    // 🔴 처음 쓴 정규식은 `[a-z]`로 누산기를 한 글자만 봤다. 돌연변이가 `s2`를
    //    쓰자 통과해 버렸다. 서식·식별자 이름에 묶지 말고 **`?? 0`이 reduce 안에
    //    있는가**만 본다.
    const flat = read("app/[locale]/price-index/page.tsx").replace(/\s+/g, " ");
    expect(flat, "한쪽만 있는 값을 0으로 채워 더하면 뺄셈이 성립하지 않는다").not.toMatch(
      /\.reduce\([^;]{0,160}\?\?\s*0/,
    );
    expect(flat).toMatch(/basket\s*=\s*basketTotals\(/);
  });

  it("비교 글도 같은 헬퍼를 쓴다", () => {
    const src = read("content/posts.ts");
    expect(src).toContain("isComparableRow");
    expect(src, "30일 규칙을 다시 구현하면 안 된다").not.toMatch(/\/\s*DAY\s*<=\s*30/);
  });

  it("🔴 세 카드 모두 품목 수를 적는다 — 숫자만 두면 20품목 바구니로 읽힌다", () => {
    // 🔴 처음엔 `basket.count`가 한 번이라도 있으면 통과했는데, 그 한 번이
    //    조건문(`comparable && basket.count > 0`)이었다. 카드에서 표기를 다 지워도
    //    초록불이었다. **표시 구간 안에서** 세야 한다.
    const flat = read("app/[locale]/price-index/page.tsx").replace(/\s+/g, " ");
    const cards = flat.slice(flat.indexOf("Summary Cards"), flat.indexOf("Store comparison paused"));
    expect(cards, "Summary Cards 구간을 못 찾았다").not.toHaveLength(0);
    const shown = cards.match(/\{basket\.count\}/g) ?? [];
    expect(shown.length, "Woolworths·Pak'nSave·절약액 세 카드 전부에 품목 수가 붙어야 한다")
      .toBeGreaterThanOrEqual(3);
  });
});
