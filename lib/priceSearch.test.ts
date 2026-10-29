import { describe, it, expect } from "vitest";
import {
  AVOID_TOKENS,
  SEARCH_TERMS,
  PINNED_SKUS,
  avoidTokensFor,
  pinnedFor,
  pickRepresentative,
} from "./priceSearch.mjs";
import menuData from "@/data/menuData.json";
import {
  PORTION_FACTORS,
  PORTION_BASIS,
  PORTION_BASIS_UNVERIFIED,
} from "./planConfig";
import type { MenuItem } from "./types";

/**
 * 상품 선별 규칙의 가드 — **넛프리 안전이 핵심이다.**
 *
 * 2026-08-06 전수 감사에서 나온 것들:
 *   Croissant          → "woolworths french croissant chocolate hazelnut"  🔴 헤이즐넛
 *                        (검색 후보에 "yarrows croissants almond"도 있다)
 *   Spring Onion       → "fresh vegetable onions brown"   (양파. 다른 채소다)
 *   Desiccated Coconut → "essentials coconut milk"        (형태가 다르다)
 *   Cinnamon           → "sticky cinnamon brioche"        (향신료가 아니라 빵)
 *
 * Croissant은 `Ham & Cheese Croissant`(is_nut_free=true)의 재료다. 주간 자동
 * 가격업데이트가 중앙값으로 상품을 다시 고르므로, 언제든 헤이즐넛 쪽으로 넘어갈 수
 * 있었다. 이건 문구를 고칠 문제가 아니라 상품을 고정할 문제다 —
 * Hummus가 "beetroot with roasted cashews"로 잡혔을 때 내린 것과 같은 결론이다.
 */
const MENUS = (menuData as { MENU_DATA: { en: MenuItem[] } }).MENU_DATA.en;

type Item = { type: string; name: string; price: { salePrice: number } };
const P = (name: string, salePrice: number): Item => ({ type: "Product", name, price: { salePrice } });

describe("🔴 넛프리: 견과류 제품이 재료로 선택되지 않는다", () => {
  const nutty: [string, string][] = [
    ["Croissant", "woolworths french croissant chocolate hazelnut"],
    ["Croissant", "yarrows croissants almond"],
    ["Muesli", "hubbards amazing muesli toasted almond & pecan"],
    ["Muesli", "muesli toasted cashew macadamia"],
    ["Dark Chocolate", "whittakers chocolate almond gold"],
  ];

  for (const [ingredient, product] of nutty) {
    it(`${ingredient}: "${product.slice(0, 40)}"를 고르지 않는다`, () => {
      expect(pickRepresentative([P(product, 5)], ingredient)).toBeFalsy();
    });
  }

  it("견과류 토큰은 구체적이어야 한다 (맨 'nut'은 Coconut·Peanut Butter를 같이 죽인다)", () => {
    expect(AVOID_TOKENS).not.toContain("nut");
    expect(AVOID_TOKENS).toContain("hazelnut");
    // Coconut 계열은 살아 있어야 한다
    expect(pickRepresentative([P("macro coconut desiccated", 3.99)], "Coconut")).toBeTruthy();
  });
});

describe("AVOID_TOKENS가 재료 자신을 죽이지 않는다", () => {
  it("Dark Chocolate은 'chocolate' 토큰에서 면제된다", () => {
    expect(AVOID_TOKENS).toContain("chocolate");
    expect(avoidTokensFor("Dark Chocolate")).not.toContain("chocolate");
    expect(pickRepresentative([P("whittakers chocolate dark ghana 72%", 8.49)], "Dark Chocolate")).toBeTruthy();
  });

  it("면제는 그 재료에만 적용된다 (Croissant에는 여전히 'chocolate'이 산다)", () => {
    expect(avoidTokensFor("Croissant")).toContain("chocolate");
  });
});

describe("오매칭이 확인된 재료는 SKU로 고정돼 있다", () => {
  const pinned: [string, string][] = [
    // Woolworths AU SKU(2026-10-30) — 오매칭 이력은 Kiwi(NZ)에서 나온 것이고, AU도 같은 재료를 고정했다
    ["Croissant", "33593"],
    ["Spring Onion", "147603"],
    ["Desiccated Coconut", "28708"],
    ["Cinnamon", "251000"],
  ];

  for (const [ingredient, sku] of pinned) {
    it(`${ingredient}이 ${sku}로 고정돼 있다`, () => {
      expect(pinnedFor(ingredient)?.sku).toBe(sku);
    });
  }

  it("모든 고정 항목이 sku·name·why를 갖는다 (근거 없는 고정 방지)", () => {
    for (const [ing, pin] of Object.entries(PINNED_SKUS as Record<string, Record<string, string>>)) {
      expect(pin.sku, `${ing}: sku 없음`).toMatch(/^\d+$/);
      expect(String(pin.name ?? "").trim(), `${ing}: name 없음`).not.toBe("");
    }
  });

  it("Croissant 고정 상품명에 견과류·초콜릿이 없다", () => {
    const n = String(pinnedFor("Croissant")?.name ?? "").toLowerCase();
    for (const bad of ["hazelnut", "almond", "chocolate", "cashew"]) {
      expect(n, `고정 상품에 ${bad}`).not.toContain(bad);
    }
  });
});

describe("넛프리 메뉴가 쓰는 재료는 견과류 이름을 갖지 않는다", () => {
  // 재료명 자체에 견과류가 들어간 채로 is_nut_free가 붙는 것을 막는다.
  // (가격 매칭과 별개로, 데이터 쪽에서 어긋나는 경우)
  it("is_nut_free 메뉴의 재료명에 견과류가 없다", () => {
    const NUTS = ["almond", "cashew", "hazelnut", "walnut", "pecan", "macadamia", "pistachio"];
    const bad: string[] = [];
    for (const m of MENUS.filter((x) => x.is_nut_free)) {
      for (const ing of m.ingredients) {
        const l = ing.toLowerCase();
        if (NUTS.some((n) => l.includes(n))) bad.push(`${m.name}: ${ing}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("검색어 테이블 위생", () => {
  it("빈 검색어가 없다", () => {
    for (const [k, v] of Object.entries(SEARCH_TERMS as Record<string, string>)) {
      expect(String(v).trim(), `SEARCH_TERMS[${k}]`).not.toBe("");
    }
  });

  it("고정된 재료는 검색어를 따로 둘 필요가 없지만, 두더라도 서로 어긋나지 않는다", () => {
    // SKU 고정이 검색어보다 우선한다. 둘 다 있으면 의도가 갈리지 않는지만 본다.
    for (const ing of Object.keys(PINNED_SKUS as Record<string, unknown>)) {
      const pin = pinnedFor(ing);
      expect(pin, `${ing}`).toBeTruthy();
    }
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * 🔴 factor가 가정한 팩 크기 ↔ 고정 SKU의 실제 팩 크기 (2026-08-20 신설)
 *
 * 사연: `PORTION_FACTORS.Cheese = 0.04`에 "1kg 블록에서 슬라이스 2장(≈30g)"이라는
 * 주석이 달려 있었다. 그런데 같은 저장소의 `PINNED_SKUS.Cheese`는 **500g**을 고정하고
 * 있었다. 둘이 정면으로 어긋나는데 **테스트 359개가 전부 통과했다** — 주석은 검사 대상이
 * 아니기 때문이다. 결과로 본문에 실린 치즈 1인분 가격이 2배 쌌다(34c, 실제 51c).
 *
 * 그래서 가정을 주석이 아니라 `PORTION_BASIS`(구조화된 값)로 옮기고, 여기서 대조한다.
 *   ① pack이 고정 SKU의 size와 글자 그대로 같은가
 *   ② factor × pack(g) 이 serve(g)와 같은가  ← 1kg용 factor를 500g 핀에 붙이면 여기서 깨진다
 * ──────────────────────────────────────────────────────────────────────────── */
describe("🔴 PORTION_FACTORS가 가정한 팩 크기가 고정 SKU와 같다", () => {
  const PINS = PINNED_SKUS as Record<string, { size?: string }>;

  /**
   * 팩·1인분 표기를 **같은 계열 안에서** 비교 가능한 수로 바꾼다.
   *
   * 🔴 처음엔 g만 읽고 나머지는 null이었다. 그러면 "12pack"인 계란과 "1L"인 우유가
   *    대조에서 **조용히 빠진다** — 이 가드가 막으려는 게 정확히 그 종류의 누락이다.
   *    그래서 계열(mass·volume·count)을 같이 돌려주고, 계열이 다르면 실패시킨다.
   */
  type Qty = { n: number; family: "mass" | "volume" | "count" };
  const qty = (size: string): Qty | null => {
    const t = size.trim().toLowerCase();
    if (t === "per kg") return { n: 1000, family: "mass" };
    // 낱개 판매("each"/"1ea"). 상품 API가 volumeSize를 안 주는 품목(다발·개당)이 여기 온다.
    if (t === "each" || t === "ea" || t === "1ea") return { n: 1, family: "count" };
    let m = /^([\d.]+)\s*(g|kg)$/.exec(t);
    if (m) return { n: parseFloat(m[1]) * (m[2] === "kg" ? 1000 : 1), family: "mass" };
    m = /^([\d.]+)\s*(ml|l)$/.exec(t);
    if (m) return { n: parseFloat(m[1]) * (m[2] === "l" ? 1000 : 1), family: "volume" };
    // "12pack", "4pack", "1 egg", "1 bagel", "2ea"
    m = /^([\d.]+)\s*(pack|ea|[a-z]+)$/.exec(t);
    if (m) return { n: parseFloat(m[1]), family: "count" };
    return null;
  };
  const grams = (size: string): number | null => qty(size)?.n ?? null;

  it("양성 대조: 대조할 항목이 실제로 있다 (0건은 결과가 아니라 증상이다)", () => {
    expect(Object.keys(PORTION_BASIS).length, "PORTION_BASIS가 비었다").toBeGreaterThan(0);
    // 등록된 키는 전부 고정 SKU가 있어야 대조가 성립한다.
    for (const key of Object.keys(PORTION_BASIS)) {
      expect(PINS[key], `PORTION_BASIS["${key}"]에 대응하는 고정 SKU가 없다`).toBeTruthy();
      const pk = qty(PORTION_BASIS[key].pack);
      const sv = qty(PORTION_BASIS[key].serve);
      expect(pk, `PORTION_BASIS["${key}"].pack("${PORTION_BASIS[key].pack}")을 읽을 수 없다`).not.toBeNull();
      expect(sv, `PORTION_BASIS["${key}"].serve("${PORTION_BASIS[key].serve}")를 읽을 수 없다`).not.toBeNull();
      // 🔴 계열이 다르면 factor × pack = serve 계산이 애초에 성립하지 않는다.
      expect(sv!.family, `${key}: 팩은 ${pk!.family}인데 1인분은 ${sv!.family}다`).toBe(pk!.family);
    }
  });

  it("등록된 재료의 pack이 고정 SKU의 size와 같다", () => {
    for (const [key, basis] of Object.entries(PORTION_BASIS)) {
      expect(
        basis.pack,
        `${key}: factor는 ${basis.pack} 팩을 가정하는데 고정 SKU는 ${PINS[key]?.size}다 — ` +
          `factor가 그 비율만큼 틀린다(치즈가 정확히 이 경우였다)`,
      ).toBe(PINS[key]?.size);
    }
  });

  it("factor × 팩 크기 = 1인분 g수", () => {
    for (const [key, basis] of Object.entries(PORTION_BASIS)) {
      const factor = PORTION_FACTORS[key];
      expect(factor, `${key}: PORTION_FACTORS에 없다`).toBeGreaterThan(0);
      const pk = qty(basis.pack)!;
      const sv = qty(basis.serve)!;
      const got = factor * pk.n;
      /**
       * 🔴 처음엔 양쪽을 `Math.round`로 비교했다. 그래서 **개수 팩에서 오차가 삼켜졌다** —
       *    베이글 factor를 0.25에서 0.22로 되돌려도 0.22 × 4 = 0.88이 1로 반올림돼 통과했다.
       *    개수는 반올림할 여지가 없다(4개입에서 1개는 정확히 0.25다). 계열별로 허용오차를 나눈다.
       */
      const tol = pk.family === "count" ? 0.05 : Math.max(1, sv.n * 0.02);
      expect(
        Math.abs(got - sv.n) <= tol,
        `${key}: factor ${factor} × ${basis.pack} = ${got.toFixed(2)}인데 ` +
          `1인분은 ${basis.serve}라고 적혀 있다 (허용오차 ${tol})`,
      ).toBe(true);
    }
  });

  it("고정 SKU는 전부 PORTION_BASIS이거나 '미확인' 목록에 있다 — 조용히 빠지지 않는다", () => {
    const unverified = new Set(PORTION_BASIS_UNVERIFIED);
    const missing = Object.keys(PINS).filter(
      (k) => PORTION_FACTORS[k] !== undefined && !PORTION_BASIS[k] && !unverified.has(k),
    );
    expect(
      missing,
      `고정 SKU가 있는데 팩 크기 근거도, 미확인 표시도 없다: ${missing.join(", ")}. ` +
        `상품 API로 확인해 PORTION_BASIS에 넣거나, PORTION_BASIS_UNVERIFIED에 적을 것`,
    ).toEqual([]);
    // 확인했다고 적은 것과 미확인이라고 적은 것이 겹치면 둘 중 하나는 거짓말이다.
    const both = Object.keys(PORTION_BASIS).filter((k) => unverified.has(k));
    expect(both, `확인/미확인 양쪽에 있다: ${both.join(", ")}`).toEqual([]);
  });
});
