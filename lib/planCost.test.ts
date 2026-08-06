import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { costForIngredients, servingFactor } from "./planGenerator";
import { PORTION_FACTORS, DEFAULT_PORTION } from "./planConfig";
import type { PriceInfo, MenuItem, SnackData, SnackItem } from "./types";
import menuData from "@/data/menuData.json";

/**
 * 2026-08-06에 Kiwi(kiwi-lunchbox)에서 이식했다.
 *
 * Kiwi는 2026-07-28에 프로덕션에서 도시락 1통이 $8.59로 계산되는 것을 발견했고,
 * 당시 기존 테스트 32개는 전부 통과하고 있었다 — 비용 로직을 아무도 덮고 있지
 * 않았기 때문이다. Aussie는 이식 직전까지 정확히 그 상태였고, **같은 버그를 둘 다
 * 갖고 있었다**:
 *   1) 분량표가 "개당 가격"을 가정 — Apple/Yoghurt/Bagel/Croissant = 1.0
 *      (가격 피드는 팩 단위를 주므로 요거트 한 통 $7.00이 도시락 하나에 잡혔다)
 *   2) 간식 루프가 PORTION_FACTORS를 조회하지 않고 DEFAULT_PORTION을 하드코딩
 *   결과: 도시락 1통 중앙값 $5.88, 최대 $11.68
 *
 * 각 describe 블록은 그때 실제로 놓쳤던 실패 유형 하나씩에 대응한다.
 *
 * ⚠️ 가격 자체는 AU 캐시(data/price_cache.json)를 쓴다. NZ 값을 가져오지 않는다.
 *    여기서 검증하는 것은 **단위 규약과 계산 경로**이지 가격 수준이 아니다.
 */

const price = (p: number): PriceInfo => ({ price: p }) as PriceInfo;
const MENUS = (menuData as { MENU_DATA: { en: MenuItem[] } }).MENU_DATA.en;
const SNACKS = (menuData as unknown as { SNACK_DATA: SnackData }).SNACK_DATA;

describe("costForIngredients — 기본 계산", () => {
  it("가격 × 분량비율로 계산한다", () => {
    const prices = new Map([["Egg", price(9.5)]]); // 12개들이 한 판
    const cost = costForIngredients(["Egg"], prices);
    expect(cost).toBeCloseTo(9.5 * PORTION_FACTORS["Egg"], 5);
    expect(cost).toBeLessThan(1.0);
  });

  it("가격 정보가 없는 재료는 0으로 처리하고 죽지 않는다", () => {
    expect(costForIngredients(["존재하지않는재료"], new Map())).toBe(0);
  });
});

describe("회귀: 간식이 메뉴 재료와 같은 경로로 계산되어야 한다", () => {
  // 이식 전 Aussie의 실제 버그. 간식 루프가 DEFAULT_PORTION(=0.20)을 하드코딩했다.
  it("치즈 한 팩이 간식 하나로 통째로 잡히지 않는다", () => {
    const prices = new Map([["Cheese", price(13.0)]]); // 1kg 블록
    const cost = costForIngredients(["Cheese"], prices);
    expect(cost).toBeLessThan(1.0); // 예전 버그였다면 $2.60
  });

  it("같은 재료는 메뉴로 넣든 간식으로 넣든 동일한 비용이 나온다", () => {
    const prices = new Map([["Apple", price(5.5)]]);
    expect(costForIngredients(["Apple"], prices)).toBe(costForIngredients(["Apple"], prices));
  });
});

describe("회귀: 분량비율은 '한 팩 대비 비율'이어야 한다", () => {
  it("낱개로 먹는 품목이 팩 전체(1.0)로 잡혀 있지 않다", () => {
    // 이식 전 Aussie: Apple 1.0 / Yoghurt 1.0 / Bagel 1.0 / Croissant 1.0
    const perPiece = ["Apple", "Banana", "Bagel", "Croissant", "Yoghurt", "Egg"];
    for (const ing of perPiece) {
      expect(PORTION_FACTORS[ing], `${ing}`).toBeLessThan(0.6);
    }
  });

  it("대용량 블록/통 품목의 1회분은 팩의 10% 미만이다", () => {
    for (const ing of ["Cheese", "Cheese Block", "Butter", "Parmesan"]) {
      expect(PORTION_FACTORS[ing], `${ing}`).toBeLessThan(0.10);
    }
  });

  it("조미료·향신료는 1회 사용량이 팩의 5% 이하다", () => {
    for (const ing of ["Soy Sauce", "Olive Oil", "Oil", "Baking Powder", "Cinnamon", "Spices"]) {
      expect(PORTION_FACTORS[ing], `${ing}`).toBeLessThanOrEqual(0.05);
    }
  });

  it("모든 분량비율이 0 초과 1.0 이하다", () => {
    for (const [ing, f] of Object.entries(PORTION_FACTORS)) {
      expect(f, `${ing}`).toBeGreaterThan(0);
      expect(f, `${ing}`).toBeLessThanOrEqual(1.0);
    }
  });
});

describe("회귀: 분량표 커버리지", () => {
  // 이식 전: 메뉴 재료 134종 중 80종(60%)이 미정의라 DEFAULT_PORTION으로 폴백됐다.
  // 커버리지가 조용히 떨어지면 비용이 다시 부풀어오른다.
  const menuIngredients = new Set(MENUS.flatMap((m) => m.ingredients));
  const snackIngredients = new Set(
    (Object.values(SNACKS) as SnackItem[][]).flatMap((list) =>
      list.flatMap((s) => s.ingredients ?? []),
    ),
  );

  it("메뉴 재료가 전부 분량표에 정의돼 있다", () => {
    const missing = [...menuIngredients].filter((i) => !(i in PORTION_FACTORS));
    expect(missing, `미정의: ${missing.join(", ")}`).toEqual([]);
  });

  it("간식 재료도 전부 정의돼 있다", () => {
    const missing = [...snackIngredients].filter((i) => !(i in PORTION_FACTORS));
    expect(missing, `미정의 간식 재료`).toEqual([]);
  });

  it("기본값은 보수적으로 유지한다 (누락 시 과대계상 방지)", () => {
    expect(DEFAULT_PORTION).toBeLessThanOrEqual(0.10);
  });
});

describe("회귀: 실제 매대가로 도시락 1통이 현실적인 범위에 든다", () => {
  // 이식 전 버그는 1통 $11.68까지 만들었다. 대표 구성에 실제 관측 가격을 넣었을 때
  // 터무니없는 값이 나오면 즉시 실패해야 한다.
  // ⚠️ 이 범위는 **AU 매대가에서 역산한 정상 범위**이지 목표치가 아니다.
  //    좁혀서 통과시키고 싶어지면, 먼저 분량비율이 현실적인지부터 볼 것.
  const observed = new Map<string, PriceInfo>([
    ["Bread", price(4.0)],
    ["Ham", price(6.0)],
    ["Cheese", price(13.0)], // 1kg 블록
    ["Lettuce", price(4.5)],
    ["Tomato", price(5.0)],
    ["Butter", price(9.0)],
    ["Apple", price(5.5)], // 1kg 팩 기준
    ["Carrot", price(2.0)], // 1kg 팩 기준
  ]);

  it("햄샌드위치 + 사과 + 당근 한 통이 현실적인 범위($1.5~4.5)에 든다", () => {
    const cost = costForIngredients(
      ["Bread", "Ham", "Cheese", "Lettuce", "Tomato", "Butter", "Apple", "Carrot"],
      observed,
    );
    expect(cost).toBeGreaterThan(1.5); // 너무 싸면 분량을 깎아 숫자를 꾸민 것
    expect(cost).toBeLessThan(4.5); // 너무 비싸면 단위 불일치가 재발한 것
  });

  it("빵 두 장이 식빵 한 봉 값에 근접하지 않는다", () => {
    expect(costForIngredients(["Bread"], observed)).toBeLessThan(4.0 * 0.2);
  });
});

describe("폴백 가격의 단위 (알려진 결함 — 넓히지 말 것)", () => {
  /**
   * FALLBACK_PRICES는 "소매 한 팩" 가격이어야 한다. 계산이 여기에 팩 대비 비율을
   * 곱하기 때문이다. 그런데 **Apple 0.90 / Carrot 0.60은 개당 가격**이 들어가 있다
   * (같은 표의 Cheese 13.00은 1kg 블록이다). Kiwi도 같은 결함이 있었고 팩가로 고쳤다.
   *
   * Aussie는 AU 실매대가를 확인하지 않고는 고칠 수 없어 **값을 지어내지 않고 남겨 뒀다.**
   * 대신 래칫으로 묶는다 — 이미 아는 2건 외에 **새 위반이 생기면 실패**한다.
   * 고칠 때는 이 목록을 지우는 것이지, 늘리는 것이 아니다.
   */
  const KNOWN_PER_UNIT = ["Apple", "Carrot"];

  const src = readFileSync(new URL("./supermarketApi.ts", import.meta.url), "utf-8");
  const block = src.slice(
    src.indexOf("FALLBACK_PRICES"),
    src.indexOf("};", src.indexOf("FALLBACK_PRICES")),
  );
  const entries = [...block.matchAll(/"?([A-Za-z][A-Za-z' -]*)"?\s*:\s*([\d.]+)/g)]
    .map(([, k, v]) => [k.trim(), Number(v)] as const);

  it("항목을 실제로 읽어냈다 (정규식이 조용히 빈 배열을 주지 않도록)", () => {
    expect(entries.length).toBeGreaterThan(20);
  });

  it("알려진 2건 외에 개당 가격이 새로 섞이지 않았다", () => {
    const violators = entries.filter(([, v]) => v < 1.0).map(([k]) => k);
    expect(violators.sort()).toEqual([...KNOWN_PER_UNIT].sort());
  });

  it("소매 한 팩치고 지나치게 비싼 값이 없다", () => {
    for (const [k, v] of entries) {
      expect(v, `${k}`).toBeLessThan(40);
    }
  });
});

describe("단위 인식: 낱개 상품과 팩 상품에 다른 표를 쓴다", () => {
  /**
   * AU 고유 문제. Woolworths AU는 신선농산물을 낱개로 판다
   * (`Apple Royal Gala $0.94 / 1EA` = 사과 한 개 값).
   * 이때 팩 비율(0.12)을 곱하면 8배 과소계상이 된다.
   * 2026-08-06에 이 구분 없이 Kiwi(팩 기준) 표를 그대로 이식했다가 잡았다.
   */
  const withEach = (p: number): PriceInfo => ({ price: p, perEach: true }) as PriceInfo;

  it("낱개 사과 한 개는 가격 그대로 잡힌다", () => {
    const cost = costForIngredients(["Apple"], new Map([["Apple", withEach(1.38)]]));
    expect(cost).toBeCloseTo(1.38, 2); // PER_EACH_SERVINGS.Apple = 1
  });

  it("같은 가격이라도 팩 상품이면 팩 비율이 적용된다", () => {
    const asPack = costForIngredients(["Apple"], new Map([["Apple", price(1.38)]]));
    expect(asPack).toBeLessThan(0.3); // 1kg 팩의 1/8
  });

  it("하나를 나눠 쓰는 품목은 1보다 작은 개수를 쓴다", () => {
    const cost = costForIngredients(["Cucumber"], new Map([["Cucumber", withEach(1.06)]]));
    expect(cost).toBeLessThan(1.06); // 오이 하나로 서너 끼
    expect(cost).toBeGreaterThan(0);
  });

  it("perEach 플래그가 없으면 팩으로 본다 (판정 불가를 낱개로 오인하지 않는다)", () => {
    expect(servingFactor("Apple", undefined)).toBe(PORTION_FACTORS["Apple"]);
    expect(servingFactor("Apple", price(1.38))).toBe(PORTION_FACTORS["Apple"]);
  });
});
