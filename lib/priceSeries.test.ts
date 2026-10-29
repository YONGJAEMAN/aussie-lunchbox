import { describe, it, expect } from "vitest";
import {
  CHAINS, coverage, fullSpanItems, seriesItems, seriesFor, skuChanges,
  changeSince, missingChains, observationCount, MIN_POINTS, moversSentence,
} from "./priceSeries";
import { readFileSync } from "node:fs";

describe("가격 이력 계열", () => {
  it("모든 점은 실제 관측이다 — 보간하지 않는다", () => {
    const raw = JSON.parse(readFileSync("data/priceHistory.json", "utf-8")).columns;
    for (const item of seriesItems()) {
      for (const c of CHAINS) {
        for (const p of seriesFor(item).byChain[c]) {
          const round = raw[c].find((r: { date: string }) => r.date === p.date);
          expect(round, `${c} ${p.date} 라운드가 없다`).toBeTruthy();
          expect(round.items[item], `${item} ${c} ${p.date}`).toBe(p.price);
        }
      }
    }
  });

  it("🔴 관측이 MIN_POINTS 미만인 품목은 계열로 안 낸다 — 점은 추이가 아니다", () => {
    for (const item of seriesItems()) {
      const most = Math.max(...CHAINS.map((c) => seriesFor(item).byChain[c].length));
      expect(most, item).toBeGreaterThanOrEqual(MIN_POINTS);
    }
  });

  it("🔴 관측이 없는 열은 0이 아니라 '없음'이다", () => {
    for (const item of seriesItems()) {
      for (const c of missingChains(item)) {
        expect(seriesFor(item).byChain[c]).toHaveLength(0);
        expect(changeSince(item, c)).toBeNull();
      }
    }
  });

  it("🔴 0 이하 값은 계열에 들어오지 않는다 — 가격이 아니라 '안 재었다'이다", () => {
    for (const item of seriesItems()) {
      for (const c of CHAINS) {
        for (const p of seriesFor(item).byChain[c]) {
          expect(p.price, `${item} ${c} ${p.date}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("🔴 관측 1회짜리는 변동을 말하지 않는다", () => {
    for (const item of seriesItems()) {
      for (const c of CHAINS) {
        if (seriesFor(item).byChain[c].length < 2) expect(changeSince(item, c)).toBeNull();
      }
    }
  });

  it("🔴 SKU가 갈린 쌍은 구간이 겹치지 않는다 — 겹치면 교체가 아니라 병행이다", () => {
    for (const k of skuChanges()) {
      expect(k.fromLast < k.toFirst, `${k.from} → ${k.to}`).toBe(true);
      // 두 이름을 한 계열로 합치지 않는다
      expect(k.from).not.toBe(k.to);
    }
  });

  it("🔴 알려진 SKU 교체를 실제로 잡는다 (양성 대조)", () => {
    const pairs = skuChanges().map((k) => `${k.from}→${k.to}`);
    expect(pairs).toContain("Wraps 8-pack→Wraps 6-pack");
    expect(pairs).toContain("Hummus (200g)→Hummus (220g)");
  });

  it("커버리지는 열마다 첫·마지막 관측과 맞는다", () => {
    for (const c of coverage()) {
      expect(c.rounds).toBeGreaterThan(0);
      expect(c.first <= c.last).toBe(true);
    }
  });

  it("뼈대 품목은 세 열 전부에서 MIN_POINTS 이상이다", () => {
    for (const item of fullSpanItems()) {
      for (const c of CHAINS) expect(seriesFor(item).byChain[c].length, `${item} ${c}`).toBeGreaterThanOrEqual(MIN_POINTS);
    }
    expect(fullSpanItems().length).toBeGreaterThan(0);
  });

  it("observationCount는 세 열 합과 같다", () => {
    for (const item of seriesItems()) {
      const sum = CHAINS.reduce((n, c) => n + seriesFor(item).byChain[c].length, 0);
      expect(observationCount(item)).toBe(sum);
    }
  });
});

describe("가격 이력 페이지는 수치를 손으로 적지 않는다", () => {
  const page = readFileSync("app/[locale]/price-history/page.tsx", "utf-8");

  it("🔴 금액 리터럴이 없다", () => {
    const body = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(body.match(/\$\d/g) ?? []).toHaveLength(0);
  });

  it("🔴 날짜 리터럴이 없다 — 관측일은 데이터가 정한다", () => {
    const body = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(body.match(/20\d\d-\d\d-\d\d/g) ?? []).toHaveLength(0);
  });

  it("🔴 품목 수·관측 수를 손으로 적지 않는다", () => {
    const body = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    // 화면에 나가는 개수는 전부 priceSeries 에서 온다
    expect(body).toContain("totalPoints");
    expect(body).toContain("items.length");
    expect(body).toContain("spine.length");
    expect(body).toContain("changes.length");
  });
});

describe("예산 글이 라운드 값을 얼어붙게 두지 않는다", () => {
  /**
   * 🔴 2026-09-19 — 이 글은 "$102.43 against $113.75 on 24 August" 와 "17 of those 20" 을
   *    **손으로** 적고 있었다. 실측은 $101.83/$112.20 · 16개 중 13개였다.
   *    구글이 읽고 색인하지 않기로 한 3편 중 하나이기도 하다.
   */
  it("🔴 본문이 지금 바구니 총액과 승패를 말한다", async () => {
    const { POSTS } = await import("../content/posts");
    const { basketTotals, winnerTally } = await import("./priceIndexCompare");
    const body = (POSTS as Record<string, { body: string }>)["budget-friendly-lunchbox-ideas-nz"].body;
    const b = basketTotals(), t = winnerTally();
    expect(body).toContain(`$${b.paknsave.toFixed(2)}`);
    expect(body).toContain(`$${b.woolworths.toFixed(2)}`);
    expect(body).toContain(`Pak'nSave is cheaper on ${t.nowP}`);
    // 옛 라운드가 남아 있으면 실패한다
    expect(body).not.toContain("102.43");
    expect(body).not.toContain("113.75");
    expect(body).not.toContain("17 of those 20");
  });

  it("🔴 본문의 변동 문장이 지금 계열에서 나온다", async () => {
    const { POSTS } = await import("../content/posts");
    const body = (POSTS as Record<string, { body: string }>)["budget-friendly-lunchbox-ideas-nz"].body;
    expect(body).toContain(moversSentence());
    expect(moversSentence().length).toBeGreaterThan(40);
  });

  it("⚠️ 계절 변동을 물가로 읽지 않게 단서를 단다", async () => {
    const { POSTS } = await import("../content/posts");
    const body = (POSTS as Record<string, { body: string }>)["budget-friendly-lunchbox-ideas-nz"].body;
    expect(body).toContain("not inflation");
  });
});

describe("배치쿠킹 글이 자기 주장을 실측에 붙인다", () => {
  /**
   * 🔴 2026-09-19 — 이 글은 "Cost per lunch: approximately $1.30-$1.50" 이라고 손으로 적고 있었다.
   *    같은 사이트가 도시락 중앙값을 $3.80 이라고 말하는데 둘을 나란히 읽으면 서로를 반박하는
   *    것처럼 보인다. 배치쿠킹이 공략하는 건 **메인 한 칸**이고 그 값은 잴 수 있다.
   */
  it("🔴 본문이 지금 도시락·메인 중앙값을 말한다", async () => {
    const { POSTS } = await import("../content/posts");
    const { boxMedianLabel, mainMedianLabel } = await import("./servePrice");
    const body = (POSTS as Record<string, { body: string }>)["batch-cooking-save-money-nz"].body;
    expect(body).toContain(boxMedianLabel());
    expect(body).toContain(mainMedianLabel());
  });

  it("🔴 메인 중앙값은 도시락 중앙값 − 간식 두 칸과 정확히 같다", async () => {
    const { boxMedian, mainMedian, snackSlotsCost } = await import("./servePrice");
    expect(mainMedian()).toBeCloseTo(boxMedian() - snackSlotsCost(), 10);
  });
});
