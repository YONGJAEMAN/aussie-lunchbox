import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import history from "@/data/priceHistory.json";
import index from "@/data/priceIndex.json";

/**
 * 가격 시계열의 유일한 가치는 **각 점이 진짜로 그날 잰 값이라는 것**이다.
 * 그게 깨지면 그래프는 데이터가 아니라 장식이 된다.
 *
 * 🔴 실제로 그 위험이 있었다 — `paknsaveUpdated`가 2026-05-16에 석 달 동안 얼어 있었고,
 * 그동안 지수 커밋은 10번 났다. 커밋 날짜로 점을 찍었으면 **같은 값이 10주 연속
 * "새 관측"으로 그려졌을 것이다.** 물가가 완벽히 안정된 것처럼 보이는 거짓 그래프다.
 */

type Obs = { date: string; items: Record<string, number> };
const columns = history.columns as unknown as Record<string, Obs[]>;

describe("가격 시계열 아카이브", () => {
  it("양성 대조 — 열이 비어 있지 않다 (비면 아래 검사가 전부 무의미하다)", () => {
    expect(Object.keys(columns).length).toBeGreaterThan(2);
    const total = Object.values(columns).reduce((n, l) => n + l.length, 0);
    expect(total, "관측이 하나도 없다").toBeGreaterThan(5);
  });

  it("한 열 안에서 날짜가 중복되지 않는다", () => {
    for (const [label, list] of Object.entries(columns)) {
      const dates = list.map((o) => o.date);
      expect(new Set(dates).size, `${label}에 같은 날짜가 두 번 있다`).toBe(dates.length);
    }
  });

  it("날짜순으로 정렬돼 있다", () => {
    for (const [label, list] of Object.entries(columns)) {
      const dates = list.map((o) => o.date);
      expect(dates, `${label} 정렬 깨짐`).toEqual([...dates].sort());
    }
  });

  it("얼어 있던 Pak'nSave 값이 한 점으로만 남아 있다 — 커밋 날짜로 찍지 않았다는 증거", () => {
    // 2026-05-16 값은 08-10에 자동 갱신이 붙기 전까지 지수 커밋 여러 개에 그대로 실려 있었다.
    const frozen = columns.paknsave.filter((o) => o.date === "2026-05-16");
    expect(frozen.length, "얼어 있던 값이 여러 점으로 퍼졌다").toBe(1);
    // 그리고 그 다음 점은 실제로 자동 갱신이 시작된 날이어야 한다.
    const after = columns.paknsave.map((o) => o.date).filter((d) => d > "2026-05-16");
    expect(after[0]).toBe("2026-08-10");
  });

  it("미래 날짜가 없다", () => {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" });
    for (const [label, list] of Object.entries(columns)) {
      for (const o of list) {
        expect(o.date <= today, `${label} ${o.date}가 오늘(${today})보다 뒤다`).toBe(true);
      }
    }
  });

  it("지금 지수의 열 날짜가 이력에 들어 있다 — 적재를 빠뜨리지 않았다", () => {
    const pairs: [string, string | undefined][] = [
      ["woolworths", index.woolworthsUpdated],
      ["paknsave", index.paknsaveUpdated],
      ["newworld", (index as { newworldUpdated?: string }).newworldUpdated],
    ];
    for (const [label, date] of pairs) {
      if (!date) continue;
      expect(columns[label].map((o) => o.date), `${label} ${date}가 이력에 없다`).toContain(date);
    }
  });

  it("값이 가격다운 범위 안에 있다", () => {
    for (const [label, list] of Object.entries(columns)) {
      for (const o of list) {
        for (const [name, v] of Object.entries(o.items)) {
          expect(Number.isFinite(v), `${label} ${o.date} ${name} 숫자가 아니다`).toBe(true);
          expect(v, `${label} ${o.date} ${name}=${v}`).toBeGreaterThan(0);
          expect(v, `${label} ${o.date} ${name}=${v}`).toBeLessThan(100);
        }
      }
    }
  });

  it("적재 스크립트가 열 날짜로 dedupe한다 — 커밋 날짜를 쓰면 안 된다", () => {
    const src = readFileSync("scripts/update_price_history.mjs", "utf8");
    expect(src).toContain("dateField");
    expect(src, "커밋 날짜를 키로 쓰고 있다").not.toMatch(/date:\s*commitDate/);
  });
});
