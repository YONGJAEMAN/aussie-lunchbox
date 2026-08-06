import { describe, it, expect } from "vitest";
import menuData from "@/data/menuData.json";
import PRICES from "@/data/price_cache.json";
import { POSTS } from "@/content/posts";
import { servingFactor } from "./planGenerator";
import type { PriceInfo } from "./types";
import type { MenuItem, SnackData, SnackItem } from "./types";

/**
 * 본문에 써 넣은 주장이 앱이 실제로 계산하는 값과 어긋나면 실패한다.
 *
 * 2026-08-06: 글 두 편이 "packed lunch는 하루 $3~5"이라고 쓰고 있는데,
 * 정작 플래너는 분량표 단위 착오 때문에 **중앙값 $5.88, 최대 $11.68**을 계산하고
 * 있었다. 사이트가 자기 글과 어긋난 숫자를 보여주고 있었다는 뜻이다.
 * 분량표를 고친 뒤 중앙값 $3.49가 되어 본문과 맞는다.
 *
 * ⚠️ 가격은 AU 캐시(data/price_cache.json)만 쓴다. NZ 값을 가져오지 않는다.
 *    가격이 갱신되면 이 테스트가 먼저 어긋난다 — 그때 고칠 것은 **본문**이지
 *    밴드가 아니다.
 */
const MENUS = (menuData as { MENU_DATA: { en: MenuItem[] } }).MENU_DATA.en;
const SNACKS = (menuData as unknown as { SNACK_DATA: SnackData }).SNACK_DATA;

// ⚠️ 계산은 앱과 **같은 함수**를 쓴다. 여기서 따로 곱하면 단위 규약이 갈라져
//    테스트만 통과하고 화면은 틀리는 상태가 된다.
const infoFor = (ing: string) =>
  (PRICES as Record<string, { data?: PriceInfo }>)[ing]?.data;
const per = (ing: string) => {
  const info = infoFor(ing);
  return (info?.price ?? 0) * servingFactor(ing, info);
};
const cost = (ings: string[]) => ings.reduce((t, i) => t + per(i), 0);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * 플래너의 실제 구성과 같아야 한다 (planGenerator):
 *   1통 = 메뉴 재료 + Fruit&Veg 간식 1개 + (Protein&Dairy ∪ Savoury Crunch) 간식 1개
 * 간식은 무작위로 뽑히므로 대표값으로 **각 풀의 중앙값**을 쓴다.
 */
const boxCosts = () => {
  const fruit = median(
    ((SNACKS["Fruit & Veg"] ?? []) as SnackItem[]).map((s) => cost(s.ingredients ?? [])),
  );
  const other = median(
    [
      ...((SNACKS["Protein & Dairy"] ?? []) as SnackItem[]),
      ...((SNACKS["Savoury Crunch"] ?? []) as SnackItem[]),
    ].map((s) => cost(s.ingredients ?? [])),
  );
  return MENUS.map((m) => cost(m.ingredients) + fruit + other);
};

describe("본문의 도시락 비용 주장이 실제 계산과 맞는다", () => {
  it("간식 풀이 비어 있지 않다 (비면 아래가 메인 비용만 재고 조용히 통과한다)", () => {
    expect(((SNACKS["Fruit & Veg"] ?? []) as SnackItem[]).length).toBeGreaterThan(3);
    expect(
      ((SNACKS["Protein & Dairy"] ?? []) as SnackItem[]).length +
        ((SNACKS["Savoury Crunch"] ?? []) as SnackItem[]).length,
    ).toBeGreaterThan(3);
  });

  it("계산한 1통 중앙값이 본문이 말하는 $3~5 안에 든다", () => {
    const m = median(boxCosts());
    expect(m).toBeGreaterThanOrEqual(3.0);
    expect(m).toBeLessThanOrEqual(5.0);
  });

  it("가장 비싼 조합도 두 자릿수로 가지 않는다 (단위 착오 재발 감지)", () => {
    // 수정 전 최대 $11.68 → 지금 $8.98(Fruit Salad. 포도 한 송이 $17.91이 끌어올린다).
    // ⚠️ 임계값을 실제값에 바짝 붙이지 않는다. 이 가드가 잡으려는 것은
    //    "단위를 잘못 곱해 두 자릿수가 되는 것"이지 주간 가격 변동이 아니다.
    //    8.98에 맞춰 9.0으로 조이면 다음 주 가격에 흔들려 가드가 아니라 소음이 된다.
    expect(Math.max(...boxCosts())).toBeLessThan(10.0);
  });

  it("본문의 $3~5 주장이 실제로 남아 있다 (숫자만 고치고 문장을 놓치는 것 방지)", () => {
    expect(POSTS["school-canteen-vs-packed-lunch"].body).toContain("$3–5 per day");
    expect(POSTS["australian-school-canteen-guidelines-2026"].body).toContain(
      "$600 to $1,000 per child per year",
    );
  });
});
