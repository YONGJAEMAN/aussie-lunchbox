import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import menuData from "@/data/menuData.json";
import REVIEW from "@/data/allergenReview.au.json";
import { PINNED_SKUS } from "./priceSearch.mjs";
import { dietTagsFor, dietViolations } from "./ingredientDiet";
import type { MenuItem, SnackData } from "./types";

/**
 * AU 알레르기 판정표(`data/allergenReview.au.json`, 사용자 승인 2026-10-30)를 지키는 가드.
 *
 * 🔴 왜 표가 따로 있나 — AU 검색 응답의 선언 필드를 믿을 수 없었다(194개 중 89개만 선언,
 *    Teriyaki는 원재료에 참깨가 있는데 선언에 없다, `containsgluten`이 밀 베이글에 False).
 *    표는 선언 ∪ 원재료 판독으로 만들어 사람이 승인했다. 상품이 바뀌면 판정도 다시 해야 한다.
 */
type Row = { tags: string[] | null; basis: string; sku?: string };
const ROWS = (REVIEW as unknown as { ingredients: Record<string, Row> }).ingredients;
const RAW = menuData as unknown as { MENU_DATA: { en: MenuItem[] }; SNACK_DATA: SnackData };
const USED = new Set<string>([
  ...RAW.MENU_DATA.en.flatMap((m) => m.ingredients),
  ...Object.values(RAW.SNACK_DATA).flat().flatMap((s) => s.ingredients ?? []),
]);
const PINS = PINNED_SKUS as Record<string, { sku: string }>;

describe("🔴 AU 알레르기 판정표", () => {
  it("메뉴·간식이 쓰는 재료가 전부 표에 있다 — 빠진 재료는 상품 라벨로 떨어져 승인 밖이 된다", () => {
    expect(USED.size, "양성 대조 — 재료를 읽었다").toBe(193);
    expect([...USED].filter((i) => !(i in ROWS))).toEqual([]);
  });

  it("표의 상품이 지금 고정 SKU와 같다 — 상품을 바꿨으면 그 줄을 다시 판정할 것", () => {
    const drift = Object.entries(ROWS)
      .filter(([ing, r]) => r.sku && PINS[ing] && PINS[ing].sku !== r.sku)
      .map(([ing, r]) => `${ing}: 표 ${r.sku} ≠ 고정 ${PINS[ing].sku}`);
    expect(drift).toEqual([]);
    expect(Object.values(ROWS).filter((r) => r.sku).length, "양성 대조 — 상품이 붙은 줄").toBeGreaterThan(150);
  });

  it("10-30에 확인한 위험 셋이 그대로 막혀 있다", () => {
    // 선언 필드엔 Soy뿐인데 원재료에 Sesame Seeds·Sesame Oil
    expect(dietTagsFor("Teriyaki Sauce")?.has("sesame")).toBe(true);
    // 예전 고정(사테 양념 베이스)은 땅콩이 주의뿐이었다
    expect(dietTagsFor("Peanut Sauce")?.has("nuts")).toBe(true);
    // 원재료가 없어 모르는 재료로 둔 것 — 식이 필터가 켜지면 빠진다
    expect(dietTagsFor("Falafel")).toBeNull();
    expect(dietViolations(["Falafel"], ["Vegan"]).map((v) => v.reason)).toEqual(["unknown"]);
  });

  it("근거 표기가 정해진 종류뿐이다 — 근거 없는 판정이 끼어들지 않는다", () => {
    const KINDS = /^(선언 ∪ 원재료|선언|원물 — 라벨 없음|사람 판단 — 원재료·선언 없음|고정 상품 없음 — Kiwi 손 판정 유지|모름 — )/;
    expect(Object.entries(ROWS).filter(([, r]) => !KINDS.test(r.basis)).map(([k]) => k)).toEqual([]);
  });

  it("수집기가 containsgluten을 읽지 않는다 — 밀 베이글에 False로 오는 필드다", () => {
    // 주석은 걷고 본다 — 이 필드를 왜 안 쓰는지 적은 주석이 있다
    const code = (f: string) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code("scripts/update_prices.mjs")).not.toMatch(/containsgluten/i);
    expect(code("lib/ingredientDiet.ts")).not.toMatch(/containsgluten/i);
    expect(code("lib/allergenLabels.ts")).not.toMatch(/containsgluten/i);
  });
});
