import { describe, it, expect } from "vitest";
import { costForIngredients } from "./planGenerator";
import { PORTION_FACTORS, DEFAULT_PORTION, PORTION_BASIS } from "./planConfig";
import type { PriceInfo, MenuItem, SnackData, SnackItem } from "./types";
import menuData from "@/data/menuData.json";
import { readFileSync } from "node:fs";

/**
 * 이 파일은 2026-07-28에 프로덕션에서 발견된 비용 계산 오류의 회귀 테스트다.
 * 당시 도시락 1통이 $8.59로 계산됐고(사이트 표기의 4배), 기존 테스트 32개는
 * 전부 통과하고 있었다. 비용 로직을 아무도 덮고 있지 않았기 때문이다.
 *
 * 각 describe 블록은 그때 실제로 놓쳤던 실패 유형 하나씩에 대응한다.
 */

const price = (p: number): PriceInfo => ({ price: p }) as PriceInfo;
const MENUS = (menuData as { MENU_DATA: { en: MenuItem[] } }).MENU_DATA.en;
const SNACKS = (menuData as unknown as { SNACK_DATA: SnackData }).SNACK_DATA;

describe("costForIngredients — 기본 계산", () => {
  it("가격 × 분량비율로 계산한다", () => {
    const prices = new Map([["Egg", price(9.85)]]); // 12개들이 한 판
    const { cost } = costForIngredients(["Egg"], prices);
    // 계란 1개 = 12개들이의 1/12 ≈ 0.08 → 약 82c
    expect(cost).toBeCloseTo(9.85 * PORTION_FACTORS["Egg"], 5);
    expect(cost).toBeLessThan(1.0);
  });

  it("가격 정보가 없는 재료는 0으로 처리하고 죽지 않는다", () => {
    const { cost } = costForIngredients(["존재하지않는재료"], new Map());
    expect(cost).toBe(0);
  });

  it("특가가 매칭되면 할인 비율을 적용하고 절약액을 보고한다", () => {
    const prices = new Map([["Bread", price(4.0)]]);
    const sale = new Map([
      [
        "Bread",
        { ingredient: "Bread", promotion: { regularPrice: 4.0, salePrice: 2.0 } },
      ],
    ]) as never;
    const { cost, saved } = costForIngredients(["Bread"], prices, sale);
    const full = 4.0 * PORTION_FACTORS["Bread"];
    expect(cost).toBeCloseTo(full / 2, 5);
    expect(saved).toBeCloseTo(full / 2, 5);
  });
});

describe("회귀: 간식이 메뉴 재료와 같은 경로로 계산되어야 한다", () => {
  // 예전 버그: 간식 루프가 PORTION_FACTORS를 조회하지 않고 DEFAULT_PORTION을
  // 하드코딩해, 치즈 블록 한 팩의 20%가 "치즈큐브" 간식 하나로 계산됐다.
  it("치즈 블록 한 팩이 간식 하나로 통째로 잡히지 않는다", () => {
    const prices = new Map([["Cheese Block", price(12.55)]]);
    const { cost } = costForIngredients(["Cheese Block"], prices);
    expect(cost).toBeLessThan(1.0); // 예전 버그였다면 $2.51
  });

  it("같은 재료는 메뉴로 넣든 간식으로 넣든 동일한 비용이 나온다", () => {
    const prices = new Map([["Apple", price(5.99)]]);
    const asMenu = costForIngredients(["Apple"], prices).cost;
    const asSnack = costForIngredients(["Apple"], prices).cost;
    expect(asMenu).toBe(asSnack);
  });
});

describe("회귀: 분량비율은 '한 팩 대비 비율'이어야 한다", () => {
  // 예전 버그: 가격 피드는 팩 단위인데 분량표는 개당 가격을 가정해
  // Apple: 1.0 (1kg 팩 통째), Cheese: 0.10 (1kg 블록의 100g) 등으로 잡혀 있었다.
  it("낱개로 먹는 품목의 1인분이 팩에 든 개수와 맞는다", () => {
    /**
     * 🔴 2026-08-21: 예전엔 이 자리에 `toBeLessThan(0.6)`이 있었다. "낱개 품목은 팩의
     *    일부"라는 전제인데, **팩이 낱개인 상품에는 그 전제가 성립하지 않는다.**
     *    크루아상 고정 SKU는 `french croissant large` **낱개 $3.60**이라 1인분이 팩 전체다.
     *    0.25(“4개입 중 1개”)로 잡혀 있어 90c로 실렸다 — 실제의 1/4이다.
     *    그래서 상수 문턱 대신 **고정 SKU가 말하는 팩 개수**와 대조한다.
     */
    const perPiece = ["Apple", "Banana", "Bagel", "Croissant", "Yoghurt", "Egg"];
    let checked = 0;
    for (const ing of perPiece) {
      const basis = PORTION_BASIS[ing];
      if (!basis) {
        // 근거가 아직 없는 품목은 옛 휴리스틱으로 남겨 둔다 — 팩 전체(1.0)만은 막는다.
        expect(PORTION_FACTORS[ing], `${ing}: 근거 미등록인데 팩 전체다`).toBeLessThan(1.0);
        continue;
      }
      /** "1kg"→1000, "120g"→120, "each"→1, "per kg"→1000, "1 croissant"→1. 단위를 무시하면 1kg이 1이 된다. */
      const n = (t: string): number => {
        const v = t.trim().toLowerCase();
        if (/^(each|ea|1ea)$/.test(v)) return 1;
        // 🔴 kg 단위로 파는 청과("per kg")를 못 읽어 Banana 근거를 등록하자마자 터졌다.
        //    `lib/priceSearch.test.ts`의 파서는 이미 받고 있었다 — 같은 문자열을
        //    두 파서가 다르게 읽으면 한쪽은 반드시 거짓말을 한다.
        if (/^per\s*kg$/.test(v)) return 1000;
        const m = /^([\d.]+)\s*([a-z]*)$/.exec(v);
        if (!m) return NaN;
        const x = parseFloat(m[1]);
        if (m[2] === "kg" || m[2] === "l") return x * 1000;
        return x; // g·ml·개수·"1 croissant" 전부 같은 계열 안에서 비교된다
      };
      const pack = n(basis.pack);
      const serve = n(basis.serve);
      expect(Number.isFinite(pack) && Number.isFinite(serve), `${ing}: 근거를 읽을 수 없다`).toBe(true);
      expect(PORTION_FACTORS[ing], `${ing}: factor가 ${serve}/${pack}과 다르다`)
        .toBeCloseTo(serve / pack, 2);
      checked += 1;
    }
    // 🔴 양성 대조 — 하나도 대조 안 했으면 이 테스트는 아무것도 안 지킨다
    expect(checked, "근거로 대조한 품목이 하나도 없다").toBeGreaterThan(0);
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
  // 예전 버그: 메뉴 재료 167종 중 112종(67%)이 미정의라 DEFAULT_PORTION(=한 팩의 20%)로
  // 폴백됐다. 커버리지가 조용히 떨어지면 비용이 다시 부풀어오른다.
  const menuIngredients = new Set(MENUS.flatMap((m) => m.ingredients));
  const snackIngredients = new Set(
    (Object.values(SNACKS) as SnackItem[][]).flatMap((list) =>
      list.flatMap((s) => s.ingredients ?? []),
    ),
  );

  it("메뉴 재료의 95% 이상이 분량표에 정의돼 있다", () => {
    const missing = [...menuIngredients].filter((i) => !(i in PORTION_FACTORS));
    const coverage = 1 - missing.length / menuIngredients.size;
    expect(coverage, `미정의: ${missing.join(", ")}`).toBeGreaterThanOrEqual(0.95);
  });

  it("간식 재료는 전부 분량표에 정의돼 있다", () => {
    const missing = [...snackIngredients].filter((i) => !(i in PORTION_FACTORS));
    expect(missing, `미정의 간식 재료`).toEqual([]);
  });

  it("기본값은 보수적으로 유지한다 (누락 시 과대계상 방지)", () => {
    expect(DEFAULT_PORTION).toBeLessThanOrEqual(0.10);
  });
});

describe("회귀: 실제 매대가로 도시락 1통이 현실적인 범위에 든다", () => {
  // 예전 버그는 1통 $8.59를 만들었다. 대표적인 도시락 구성에 실제 관측 가격을
  // 넣었을 때 터무니없는 값이 나오면 즉시 실패해야 한다.
  const observed = new Map<string, PriceInfo>([
    // Woolworths AU 고정 상품 정가(2026-10-30 수집) — 팩 크기는 PORTION_BASIS와 같다
    ["Bread", price(4.6)], // 700g 식빵
    ["Ham", price(6.6)], // 200g 포장 햄
    ["Cheese", price(6.6)], // 500g 블록
    ["Lettuce", price(3.0)], // 양상추 한 통
    ["Tomato", price(0.65)], // 낱개(each) — 1인분 0.5개
    ["Butter", price(7.0)],
    ["Apple", price(7.9)], // 1kg 펀넷
    ["Carrot", price(2.2)], // kg당
  ]);

  it("햄샌드위치 + 사과 + 당근 한 통이 현실적인 범위($1.5~4.5)에 든다", () => {
    const { cost } = costForIngredients(
      ["Bread", "Ham", "Cheese", "Lettuce", "Tomato", "Butter", "Apple", "Carrot"],
      observed,
    );
    // 이 구간은 **실측 매대가에서 역산한 정상 범위**이지 목표치가 아니다.
    // 처음에 상한을 $3으로 잡았다가 실패했는데, 계산($3.29)이 맞고 기대치가
    // 틀린 경우였다 — 마케팅 문구 "$2 a box"에 무의식적으로 맞춘 값이었다.
    // 범위를 좁혀 통과시키고 싶어지면, 먼저 분량비율이 현실적인지부터 볼 것.
    expect(cost).toBeGreaterThan(1.5); // 너무 싸면 분량을 깎아 숫자를 꾸민 것
    expect(cost).toBeLessThan(4.5); // 너무 비싸면 단위 불일치가 재발한 것
  });

  it("빵 두 장이 식빵 한 봉 값에 근접하지 않는다", () => {
    const { cost } = costForIngredients(["Bread"], observed);
    expect(cost).toBeLessThan(4.26 * 0.2);
  });
});

describe("회귀: 폴백 가격도 '한 팩' 단위여야 한다", () => {
  // 2026-07-28: PORTION_FACTORS를 팩 기준으로 재작성하면서 FALLBACK_PRICES를
  // 같이 고치지 않아 Apple 0.80 / Carrot 0.50 (개당 가격)이 남아 있었다.
  // 비용 계산이 여기에 팩 대비 비율을 곱하므로 사과 한 개가 9.6c가 됐다.
  const src = readFileSync(new URL("./supermarketApi.ts", import.meta.url), "utf-8");
  const block = src.slice(src.indexOf("FALLBACK_PRICES"), src.indexOf("};", src.indexOf("FALLBACK_PRICES")));
  const entries = [...block.matchAll(/"?([A-Za-z][A-Za-z' -]*)"?\s*:\s*([\d.]+)/g)]
    .map(([, k, v]) => [k.trim(), Number(v)] as const);

  it("항목을 실제로 읽어냈다 (정규식이 조용히 빈 배열을 주지 않도록)", () => {
    expect(entries.length).toBeGreaterThan(20);
  });

  it("모든 폴백가가 소매 팩 가격대($1 이상)다 — 개당 가격이 섞이면 실패", () => {
    for (const [k, v] of entries) {
      expect(v, `${k}: 개당 가격으로 보인다 (팩 가격이어야 함)`).toBeGreaterThanOrEqual(1.0);
      expect(v, `${k}: 소매 한 팩치고 지나치게 비싸다`).toBeLessThan(40);
    }
  });

  it("스크립트와 런타임의 폴백 테이블이 갈라지지 않았다", () => {
    // 같은 표가 lib/과 scripts/ 두 곳에 복제돼 있다. 한쪽만 고치면 캐시 재생성 때 되살아난다.
    const script = readFileSync(new URL("../scripts/update_prices.mjs", import.meta.url), "utf-8");
    for (const [k, v] of entries) {
      if (!script.includes(`${k}:`) && !script.includes(`"${k}":`)) continue;
      const m = script.match(new RegExp(`"?${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"?\\s*:\\s*([\\d.]+)`));
      if (m) expect(Number(m[1]), `${k} 값이 두 파일에서 다르다`).toBe(v);
    }
  });
});
