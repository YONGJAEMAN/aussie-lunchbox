import { describe, it, expect } from "vitest";
import {
  AVOID_TOKENS,
  SEARCH_TERMS,
  REQUIRE_TOKENS,
  avoidTokensFor,
  deriveTokens,
  isPricedPerEach,
  pickRepresentative,
} from "./priceSearch.mjs";

/**
 * 상품 선별 규칙의 가드.
 *
 * 2026-08-06 이전에는 수집기가 검색 첫 결과를 그냥 집었고, 그 결과 이런 값들이
 * 캐시에 들어가 있었다 (실측):
 *   Ripe Bananas → 바나나 걸이 $34.28 · GF Sausages → 소시지 제조기 $27.63
 *   Chicken/Tofu → 새 장난감 $23.88 · Berries → 셰이크 파우더 $40.00
 *   Muesli (Nut-free) → "Fruit & Nut" 제품  ← 넛프리 사이트에서 가장 위험한 것
 *
 * 아래는 그 사례들을 실제 API 응답 모양으로 고정해 둔 것이다. 규칙을 손보다가
 * 다시 통과시키면 여기서 걸린다.
 */
const P = (Name: string, Price: number, CupString = "$1.00 / 100G") => ({
  Name,
  Price,
  CupString,
  IsAvailable: true,
});

describe("비식품·오매칭이 후보에서 걸러진다 (전부 실제로 잡혔던 상품이다)", () => {
  const cases: [string, ReturnType<typeof P>, string][] = [
    ["Ripe Bananas", P("Banana Rack, Banana Hanger, Cotton Rope Banana Holder", 34.28, ""), "바나나 걸이"],
    ["GF Sausages", P("JOYBUY Sausage filling machine, Sausage stuffer", 27.63, ""), "소시지 제조기"],
    ["Chicken/Tofu", P("Avi One Chicken Toy Glockenspiel 12.5x69cm", 23.88, ""), "새 장난감"],
    ["Beef Patty", P("Hamburger Press Beef Meat Cooking Maker Patty Mould", 31.78, ""), "햄버거 프레스"],
    ["Cos Lettuce", P("Yates Cos Lettuce Seeds", 4.3, ""), "상추 씨앗"],
    ["Berries", P("The Man Shake Mixed Berry Powder", 40.0), "셰이크 파우더"],
    ["Orange", P("Daily Juice Co Pulp Free Orange Fruit Juice", 7.8), "오렌지주스"],
    ["Mince", P("Impossible Plant Based Beef Mince", 9.5), "식물성 대체육"],
    ["Mozzarella", P("Made With Plants Shredded Mozzarella Dairy Free", 6.9), "비유제품"],
    ["Kidney Beans", P("Edgell Snack Time Red Kidney Beans Salad Topper", 1.6), "스낵팟"],
  ];

  for (const [ingredient, product, why] of cases) {
    it(`${ingredient}: ${why}를 고르지 않는다`, () => {
      expect(pickRepresentative([product], ingredient)).toBeNull();
    });
  }

  it("🔴 Muesli (Nut-free)에 견과류 제품이 잡히지 않는다", () => {
    // 넛프리를 표방하는 사이트에서 이건 문구 문제가 아니라 안전 문제다.
    const nutty = P("Carman's Muesli Toasted Classic Fruit & Nut", 9.9);
    expect(pickRepresentative([nutty], "Muesli (Nut-free)")).toBeNull();
  });
});

describe("정상 식품은 통과한다 (규칙이 과하게 조여 전부 죽이는 것 방지)", () => {
  it("실제 상품을 고른다", () => {
    const items = [
      P("Woolworths Beef Mince", 9.0, "$18.00 / 1KG"),
      P("Woolworths Beef Mince Premium", 12.0, "$24.00 / 1KG"),
    ];
    const picked = pickRepresentative(items, "Mince");
    expect(picked).not.toBeNull();
    expect(picked!.Name).toContain("Beef Mince");
  });

  it("최저가가 아니라 중앙값을 고른다 (소용량·프리미엄 쏠림 방지)", () => {
    const items = [P("Tasty Cheese Block A", 6), P("Tasty Cheese Block B", 8), P("Tasty Cheese Block C", 10)];
    expect(pickRepresentative(items, "Cheese")!.Price).toBe(8);
  });

  it("규격이 다른 고가품은 트림된다 (통다리 햄 vs 슬라이스 햄)", () => {
    const items = [
      P("Don Leg Ham Shaved", 6.6, "$33.00 / 1KG"),
      P("Primo Ham Shaved", 7.0, "$35.00 / 1KG"),
      P("Whole Leg Ham", 60.0, "$12.00 / 1KG"),
    ];
    // $60은 $6.60의 2.5배를 넘으므로 후보에서 잘린다
    expect(pickRepresentative(items, "Ham")!.Price).toBeLessThan(10);
  });
});

describe("낱개/팩 판정", () => {
  it("비교단가가 Price와 같고 1EA면 낱개다", () => {
    expect(isPricedPerEach("$0.83 / 1EA", 0.83)).toBe(true);
  });

  it("⚠️ 1EA여도 Price가 다르면 팩이다 (4개입 롤이 여기서 걸렸다)", () => {
    // Woolworths Ciabatta Rolls: Price $3.75, CupString "$0.94 / 1EA" → 4개들이
    expect(isPricedPerEach("$0.94 / 1EA", 3.75)).toBe(false);
  });

  it("무게 단위는 팩이다", () => {
    expect(isPricedPerEach("$15.40 / 1KG", 7.7)).toBe(false);
    expect(isPricedPerEach("$1.14 / 100G", 0.8)).toBe(false);
  });

  it("비교단가가 없으면 팩으로 본다 (판정 불가를 낱개로 오인하지 않는다)", () => {
    expect(isPricedPerEach("", 5)).toBe(false);
    expect(isPricedPerEach(undefined, 5)).toBe(false);
  });
});

describe("비교단가(CupString)가 없는 상품은 식품이 아니다", () => {
  // 3차 검수에서 비식품이 전부 이 조건 하나로 걸러졌다. 개별 토큰을 계속
  // 추가하는 것보다 일반적이라 새로운 잡동사니에도 자동으로 대응한다.
  it("CupString이 없으면 후보에서 빠진다", () => {
    const noCup = { Name: "Woolworths Tasty Cheese Block", Price: 8, CupString: "", IsAvailable: true };
    expect(pickRepresentative([noCup], "Cheese")).toBeNull();
  });
});

describe("AVOID_TOKENS가 재료 자신을 죽이지 않는다", () => {
  // 1차 검수에서 "muffin"을 AVOID에 넣었더니 Muffin 재료가 후보 0이 됐다.
  it("재료명에 든 토큰은 그 재료에 한해 무시한다", () => {
    expect(AVOID_TOKENS).toContain("cake");
    expect(avoidTokensFor("Muffin")).not.toContain("muffin");
    const m = P("Woolworths English Muffins 6 Pack", 3.5);
    expect(pickRepresentative([m], "Muffin")).not.toBeNull();
  });
});

describe("규칙 테이블 자체의 위생", () => {
  it("SEARCH_TERMS·REQUIRE_TOKENS에 빈 값이 없다", () => {
    for (const [k, v] of Object.entries(SEARCH_TERMS)) {
      expect(String(v).trim(), `SEARCH_TERMS[${k}]`).not.toBe("");
    }
    for (const [k, v] of Object.entries(REQUIRE_TOKENS)) {
      expect((v as string[]).length, `REQUIRE_TOKENS[${k}]`).toBeGreaterThan(0);
    }
  });

  it("deriveTokens가 복수형·슬래시를 처리한다", () => {
    expect(deriveTokens("Grapes")).toEqual(["grape"]);
    expect(deriveTokens("Cherry Tomatoes")).toEqual(["tomatoe"]);
    expect(deriveTokens("Ham/Bacon")).toEqual(["ham"]); // REQUIRE_TOKENS 우선
  });
});
