import { describe, it, expect } from "vitest";
import {
  matchIngredient,
  matchMenuIngredients,
  calculateSavings,
  calculateSaleBonus,
  getActivePromotions,
  getCurrentWeekPromotions,
  getPromotionsStatus,
  nzToday,
  pricedMenuMatches,
} from "./promotions";
import type { Promotion, StoreId } from "@/data/promotions.types";

const fakeCandidate = (
  matchKey: string,
  store: StoreId = "woolworths",
  savings = 1.0,
  fit: "lunchbox" | "snack-only" | "excluded" = "lunchbox",
): Promotion & { store: StoreId } => ({
  name: `Test ${matchKey}`,
  matchKey,
  category: "Produce",
  regularPrice: 5,
  salePrice: 5 - savings,
  savings,
  savingsPercent: (savings / 5) * 100,
  promoType: "sale",
  lunchboxFit: fit,
  store,
});

/**
 * 🔴 "오늘"에 의존하면 데이터가 한 주 낡는 순간 테스트가 통째로 깨진다.
 * currentWeek 의 validFrom 을 그대로 쓰면 데이터가 갱신돼도 항상 유효한 날짜다.
 */
import promotionsFile from "@/data/promotions.json";
const CURRENT_WEEK = (promotionsFile as { currentWeek: string; weeks: Record<string, { validFrom: string }> })
  .weeks[(promotionsFile as { currentWeek: string }).currentWeek];
/**
 * 🔴 Aussie(2026-10-30): AU 전단은 아직 없다(계획 5단계) — `promotions.json`의 weeks가 비어 있다.
 *    전단에 기대는 검사는 `skipIf(!HAS_PROMOS)`로 미룬다. 대신 「특가가 없으면 화면이 missing이라고 말한다」를
 *    아래에서 따로 확인한다 — 건너뛴 검사가 「통과」로 읽히지 않게.
 */
const HAS_PROMOS = !!CURRENT_WEEK;
const WITHIN_WEEK = new Date(`${CURRENT_WEEK?.validFrom ?? "2026-01-01"}T09:00:00+12:00`);

describe.skipIf(HAS_PROMOS)("특가 데이터가 없으면 「없다」고 말한다(Aussie, 전단 전)", () => {
  it("상태는 missing이고 특가 목록은 비어 있다 — 지난 주 것이나 지어낸 것이 나가지 않는다", () => {
    expect(getPromotionsStatus().state).toBe("missing");
    expect(getCurrentWeekPromotions()).toBeNull();
    expect(getActivePromotions(["woolworths", "newworld"])).toEqual([]);
  });
});

describe("matchIngredient", () => {
  it("returns null for empty input", () => {
    expect(matchIngredient("", [fakeCandidate("bacon")])).toBeNull();
    expect(matchIngredient("bacon", [])).toBeNull();
  });

  it("matches exact key (case-insensitive)", () => {
    const c = [fakeCandidate("bacon")];
    expect(matchIngredient("Bacon", c)?.matchKey).toBe("bacon");
    expect(matchIngredient("BACON", c)?.matchKey).toBe("bacon");
  });

  it("matches partial — matchKey ⊂ ingredient", () => {
    const c = [fakeCandidate("bacon")];
    // "Streaky Bacon" ingredient → matched by "bacon" key
    expect(matchIngredient("Streaky Bacon", c)?.matchKey).toBe("bacon");
  });

  // 🔴 2026-08-24: 역방향(ingredient ⊂ matchKey)은 더 이상 자동으로 붙지 않는다.
  //    "cherry tomato" 특가를 `Tomato` 재료에 붙이는 건 다른 상품을 파는 것이다.
  //    (같은 규칙이 땅콩버터를 `Butter` 에 붙이고 있었다.) 필요하면 alsoMatches 에 적는다.
  it("역방향은 자동으로 붙지 않고, alsoMatches 에 적어야 붙는다", () => {
    expect(matchIngredient("tomato", [fakeCandidate("cherry tomato")])).toBeNull();
    const withOptIn = { ...fakeCandidate("cherry tomato"), alsoMatches: ["Tomato"] };
    expect(matchIngredient("tomato", [withOptIn])?.matchKey).toBe("cherry tomato");
  });

  it("prefers exact over partial when both exist", () => {
    const c = [
      fakeCandidate("cherry tomato", "woolworths", 0.5),
      fakeCandidate("tomato", "newworld", 1.5),
    ];
    expect(matchIngredient("tomato", c)?.matchKey).toBe("tomato");
  });

  it("when multiple matches, picks highest savings", () => {
    const c = [
      fakeCandidate("apple", "woolworths", 0.5),
      fakeCandidate("apple", "newworld", 1.5),
    ];
    expect(matchIngredient("apple", c)?.store).toBe("newworld");
  });

  it("returns null when no key relates to ingredient", () => {
    expect(matchIngredient("xyz-unknown", [fakeCandidate("apple")])).toBeNull();
  });
});

describe("matchMenuIngredients", () => {
  it("returns empty for empty inputs", () => {
    expect(matchMenuIngredients([], [fakeCandidate("apple")])).toEqual([]);
    expect(matchMenuIngredients(["apple"], [])).toEqual([]);
  });

  it("matches multiple ingredients", () => {
    const c = [fakeCandidate("apple"), fakeCandidate("bacon")];
    const matches = matchMenuIngredients(["Apple", "Streaky Bacon"], c);
    expect(matches).toHaveLength(2);
    expect(matches.map((m) => m.promotion.matchKey).sort()).toEqual(["apple", "bacon"]);
  });

  it("dedupes when same promo matches multiple ingredients", () => {
    const c = [fakeCandidate("tomato")];
    // "tomato" matches both "Cherry Tomato" and "Tomato Sauce" by partial match
    // but we only count it once
    const matches = matchMenuIngredients(["Cherry Tomato", "Tomato Sauce"], c);
    expect(matches).toHaveLength(1);
  });

  it("preserves SaleMatch shape (ingredient, promotion, store)", () => {
    const c = [fakeCandidate("bacon", "newworld")];
    const [m] = matchMenuIngredients(["Bacon"], c);
    expect(m.ingredient).toBe("Bacon");
    expect(m.promotion.matchKey).toBe("bacon");
    expect(m.store).toBe("newworld");
  });
});

describe("calculateSavings", () => {
  it("sums savings of all matches", () => {
    const matches = [
      { ingredient: "apple", promotion: fakeCandidate("apple", "woolworths", 1.0), store: "woolworths" as StoreId },
      { ingredient: "bacon", promotion: fakeCandidate("bacon", "newworld", 4.09), store: "newworld" as StoreId },
    ];
    expect(calculateSavings(matches)).toBeCloseTo(5.09);
  });

  it("returns 0 for no matches", () => {
    expect(calculateSavings([])).toBe(0);
  });
});

describe("calculateSaleBonus", () => {
  it("returns 1.0 when no candidates", () => {
    expect(calculateSaleBonus(["apple"], [])).toBe(1.0);
  });

  it("returns 1.0 when no ingredients", () => {
    expect(calculateSaleBonus([], [fakeCandidate("apple")])).toBe(1.0);
  });

  it("returns 1.5 when all ingredients on sale", () => {
    const c = [fakeCandidate("apple"), fakeCandidate("bacon")];
    expect(calculateSaleBonus(["apple", "bacon"], c)).toBeCloseTo(1.5);
  });

  it("returns 1.25 when half ingredients on sale", () => {
    const c = [fakeCandidate("apple")];
    expect(calculateSaleBonus(["apple", "unknown"], c)).toBeCloseTo(1.25);
  });
});

describe.skipIf(!HAS_PROMOS)("getCurrentWeekPromotions / getActivePromotions", () => {
  it("loads current week from JSON", () => {
    const week = getCurrentWeekPromotions(WITHIN_WEEK);
    expect(week).not.toBeNull();
    expect(week?.validFrom).toBeTruthy();
    expect(week?.validUntil).toBeTruthy();
  });

  it("filters out 'excluded' items by default", () => {
    const active = getActivePromotions(["woolworths", "newworld"], WITHIN_WEEK);
    expect(active.length).toBeGreaterThan(0);
    for (const p of active) {
      expect(["lunchbox", "snack-only"]).toContain(p.lunchboxFit);
    }
  });

  it("respects store selection", () => {
    const wOnly = getActivePromotions(["woolworths"], WITHIN_WEEK);
    const nOnly = getActivePromotions(["newworld"], WITHIN_WEEK);
    expect(wOnly.every((p) => p.store === "woolworths")).toBe(true);
    expect(nOnly.every((p) => p.store === "newworld")).toBe(true);
  });
});

// 2026-08-17: getActivePromotions 가 validUntil 을 보지 않아, currentWeek 가 만료돼도
// 그대로 반환하고 있었다. 특가가 opt-in 이라 갇혀 있었을 뿐 — 기본값을 켜면
// 모든 방문자가 지난주 특가를 이번 주 것으로 받는다.
describe.skipIf(!HAS_PROMOS)("🔴 만료된 주의 특가는 나가지 않는다", () => {
  // 🔴 날짜를 리터럴로 박으면 데이터가 갱신되는 순간 깨진다.
  // (실제로 2026-08-17 갱신 때 이 블록이 통째로 깨졌다 — 같은 파일 위쪽에서
  //  똑같은 실수를 이미 고쳐 놓고 새 테스트에서 반복했다.)
  // 그래서 전부 currentWeek 의 validFrom/validUntil 에서 유도한다.
  const FILE = promotionsFile as unknown as {
    currentWeek: string;
    weeks: Record<string, { validFrom: string; validUntil: string }>;
  };
  const WEEK = FILE.weeks[FILE.currentWeek] ?? { validFrom: "2026-01-01", validUntil: "2026-01-07" };
  /** NZ 기준 그 날짜의 오전 9시 */
  const nzMorning = (ymd: string) => new Date(`${ymd}T09:00:00+12:00`);
  const plusDays = (ymd: string, n: number) => {
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  it("유효기간 안이면 active", () => {
    expect(getPromotionsStatus(nzMorning(WEEK.validFrom)).state).toBe("active");
  });

  it("validUntil 당일은 아직 유효하다 (경계)", () => {
    expect(getPromotionsStatus(nzMorning(WEEK.validUntil)).state).toBe("active");
    expect(getActivePromotions(["woolworths"], nzMorning(WEEK.validUntil)).length).toBeGreaterThan(0);
  });

  it("validUntil 다음 날이면 expired 이고 특가가 0건이 된다", () => {
    const after = nzMorning(plusDays(WEEK.validUntil, 1));
    expect(getPromotionsStatus(after).state).toBe("expired");
    expect(getActivePromotions(["woolworths", "newworld"], after)).toEqual([]);
  });

  it("validFrom 이전이면 upcoming 이고 특가가 0건이 된다", () => {
    const before = nzMorning(plusDays(WEEK.validFrom, -1));
    expect(getPromotionsStatus(before).state).toBe("upcoming");
    expect(getActivePromotions(["woolworths", "newworld"], before)).toEqual([]);
  });

  it("🔴 UTC 로 비교하면 하루 밀린다 — NZ 벽시계로 판정해야 한다", () => {
    // NZ 로 (validUntil + 1일) 00:30 = UTC 로는 아직 validUntil 당일 12:30.
    // UTC 날짜로 보면 만료를 하루 놓친다.
    const nextDay = plusDays(WEEK.validUntil, 1);
    const justAfterMidnightNZ = new Date(`${nextDay}T00:30:00+12:00`);
    expect(nzToday(justAfterMidnightNZ)).toBe(nextDay);
    expect(justAfterMidnightNZ.toISOString().slice(0, 10)).toBe(WEEK.validUntil);
    expect(getPromotionsStatus(justAfterMidnightNZ).state).toBe("expired");
  });
});

// 2026-08-24: note 는 사람이 손으로 적는 유일한 필드다. "Save 89c" 나 "$1.49 per 100g"
// 은 salePrice/regularPrice 에서 나오는 값을 **다시 적은 것**이라, 한쪽만 고치면
// 조용히 거짓말이 된다. 매주 갱신되는 데이터라 한 번 어긋나면 그대로 라이브로 나간다.
// 그래서 note 안의 숫자를 전부 가격에서 다시 계산해 대조한다.
describe.skipIf(!HAS_PROMOS)("🔴 note 의 금액 주장은 가격에서 다시 계산해 맞아야 한다", () => {
  const FILE = promotionsFile as unknown as {
    currentWeek: string;
    weeks: Record<
      string,
      { stores: Record<string, { items: Promotion[] }> }
    >;
  };
  const rows: Array<{ store: string; item: Promotion }> = [];
  for (const [store, sp] of Object.entries((FILE.weeks[FILE.currentWeek]?.stores ?? {}))) {
    for (const item of sp.items) rows.push({ store, item });
  }

  /** 상품명에서 총 용량(g/ml)을 뽑는다. "6 x 125g" 은 750 이지 125 가 아니다. */
  const totalGrams = (name: string): number | null => {
    const multi = name.match(/(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(g|ml)\b/i);
    if (multi) return Number(multi[1]) * Number(multi[2]);
    const one = name.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i);
    if (!one) return null;
    return Number(one[1]) * (/^(kg|l)$/i.test(one[2]) ? 1000 : 1);
  };
  /** 낱개 수 — "12 Pack", "6 x 125g" 둘 다 */
  const unitCount = (name: string): number | null => {
    const m = name.match(/(\d+)\s*(?:Pack|pk)\b/i) ?? name.match(/(\d+)\s*x\s*\d/i);
    return m ? Number(m[1]) : null;
  };

  it("항목이 비어 있지 않다 — 빈 목록은 모든 검사를 공짜로 통과시킨다", () => {
    expect(rows.length).toBeGreaterThan(20);
  });

  it.each(rows.map((r) => [`${r.store}: ${r.item.name}`, r] as const))(
    "%s",
    (_label, { item }) => {
      const expected = Math.round((item.regularPrice - item.salePrice) * 100) / 100;
      expect(item.savings).toBeCloseTo(expected, 2);
      expect(item.savingsPercent).toBe(
        item.regularPrice ? Math.round((expected / item.regularPrice) * 100) : 0,
      );

      const note = item.note ?? "";
      const save = note.match(/Save \$(\d+\.\d{2})|Save (\d{1,2})c/);
      if (save) {
        const claimed = save[1] ? Number(save[1]) : Number(save[2]) / 100;
        expect(claimed).toBeCloseTo(item.savings, 2);
      }

      const grams = totalGrams(item.name);
      const units = unitCount(item.name);
      for (const m of note.matchAll(/\$(\d+\.\d+) per 100g/g)) {
        expect(grams).not.toBeNull();
        expect((item.salePrice / grams!) * 100).toBeCloseTo(Number(m[1]), 1);
      }
      for (const m of note.matchAll(/(\d+)c per 100g/g)) {
        expect(grams).not.toBeNull();
        expect((item.salePrice / grams!) * 100).toBeCloseTo(Number(m[1]) / 100, 1);
      }
      for (const m of note.matchAll(/\$(\d+\.\d+) per kg/g)) {
        expect(grams).not.toBeNull();
        expect((item.salePrice / grams!) * 1000).toBeCloseTo(Number(m[1]), 0);
      }
      for (const m of note.matchAll(/(\d+)c (?:per egg|each|per wrap|per pottle)/g)) {
        expect(units).not.toBeNull();
        expect(item.salePrice / units!).toBeCloseTo(Number(m[1]) / 100, 1);
      }
    },
  );
});

// 2026-08-24: New World 특가는 사실상 전부 Club Plus Deal 이고 Woolworths 에도
// Everyday Rewards 회원가가 섞여 있다. 카드 없는 사람은 그 값에 못 사는데
// 화면은 절약액에 그대로 더하고 있었다. 회원가가 하나라도 실려 있으면
// 그 사실을 밝히는 문구가 **세 언어 모두**와 플래너 컴포넌트에 있어야 한다.
describe.skipIf(!HAS_PROMOS)("🔴 회원 전용가는 회원가라고 밝혀야 한다", () => {
  const FILE = promotionsFile as unknown as {
    currentWeek: string;
    weeks: Record<string, { stores: Record<string, { items: Promotion[] }> }>;
  };
  const items = Object.values((FILE.weeks[FILE.currentWeek]?.stores ?? {})).flatMap((s) => s.items);
  const clubItems = items.filter((i) => i.promoType === "club");

  it("이번 주에 회원가가 실려 있다 — 없으면 아래 검사는 공짜로 통과한다", () => {
    expect(clubItems.length).toBeGreaterThan(0);
  });

  it("고지 문구가 세 언어 모두에 있고 마트 이름 자리가 비어 있지 않다", async () => {
    for (const locale of ["en", "ko", "zh"]) {
      const m = (await import(`@/messages/${locale}.json`)).default as Record<string, string>;
      expect(m.sale_club_price_note, locale).toBeTruthy();
      expect(m.sale_club_price_note, locale).toContain("{stores}");
    }
  });

  it("플래너가 그 문구를 실제로 렌더한다", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("components/PlannerClient.tsx", "utf8");
    expect(src).toContain('t("sale_club_price_note"');
    // promoType 을 보고 고르는지까지 — 문구만 있고 조건이 없으면 항상 뜨거나 안 뜬다
    expect(src).toContain('promoType === "club"');
  });
});

// 2026-08-24: 매칭이 **양방향 부분일치**라 다른 식품에 특가를 붙이고 있었다.
// 화면에 "🔖 Butter"라고 뜨고 절약액에도 더해진 채로 라이브였다.
describe("🔴 다른 식품에 특가를 붙이지 않는다", () => {
  const promo = (matchKey: string, name: string, alsoMatches?: string[]) =>
    ({ ...fakeCandidate(matchKey), name, alsoMatches }) as Promotion & { store: StoreId };

  it.each([
    ["Butter", "peanut butter", "Fix & Fogg Smooth Peanut Butter 375g"],
    ["Cheese Sauce", "cheese", "Mainland Colby Cheese Block 1kg"],
    ["Butter Chicken Sauce", "chicken", "Tegel Shaved Chicken Breast 200g"],
    ["Rice Paper", "rice", "SunRice Jasmine Rice 1kg"],
    ["Rice Bubbles", "rice", "SunRice Jasmine Rice 1kg"],
    ["Breadcrumbs", "bread", "Tip Top Toast Bread 700g"],
    ["Bread Roll", "bread", "Tip Top Toast Bread 700g"],
  ])("%s 에 '%s' 특가가 붙지 않는다", (ingredient, key, name) => {
    expect(matchIngredient(ingredient, [promo(key, name)])).toBeNull();
  });

  it.each([
    ["Streaky Bacon", "bacon"],
    ["Cottage Cheese", "cheese"],
    ["Rolled Oats", "oats"],
    ["Wholegrain Crackers", "cracker"],
    ["Corn Tortilla", "tortilla"],
    ["Boiled Eggs", "eggs"],
  ])("%s 에는 '%s' 특가가 그대로 붙는다 — 조이기만 하면 기능이 죽는다", (ingredient, key) => {
    expect(matchIngredient(ingredient, [promo(key, `Test ${key}`)])).not.toBeNull();
  });

  it("alsoMatches 에 적힌 이름은 붙는다 — 사람이 명시한 예외", () => {
    expect(matchIngredient("Tuna", [promo("canned tuna", "Sealord Tuna 185g")])).toBeNull();
    expect(
      matchIngredient("Tuna", [promo("canned tuna", "Sealord Tuna 185g", ["Tuna"])]),
    ).not.toBeNull();
  });

  it("🔴 글루텐프리 재료에 일반 상품 특가가 붙지 않는다", () => {
    const wheat = promo("cracker", "Huntley & Palmers Wholegrain Crackers 250g");
    const gf = promo("cracker", "Woolworths Free From Gluten Crackers 250g");
    expect(matchIngredient("GF Crackers", [wheat])).toBeNull();
    expect(matchIngredient("GF Crackers", [gf])).not.toBeNull();
    expect(matchIngredient("Crackers", [wheat])).not.toBeNull();
  });
});

// alsoMatches 는 사람이 손으로 적는다 — 오타는 조용히 "아무것도 안 붙음"이 된다.
describe.skipIf(!HAS_PROMOS)("🔴 alsoMatches 에 적힌 이름은 실제 재료여야 한다", () => {
  it("모든 alsoMatches 가 메뉴의 재료 이름과 일치한다", async () => {
    const menu = (await import("@/data/menuData.json")).default as {
      MENU_DATA: { en: { ingredients?: string[] }[] };
    };
    const ings = new Set<string>();
    for (const m of menu.MENU_DATA.en) for (const i of m.ingredients ?? []) ings.add(i.toLowerCase());
    const FILE = promotionsFile as unknown as {
      currentWeek: string;
      weeks: Record<string, { stores: Record<string, { items: Promotion[] }> }>;
    };
    const named = Object.values((FILE.weeks[FILE.currentWeek]?.stores ?? {}))
      .flatMap((s) => s.items)
      .flatMap((i) => (i.alsoMatches ?? []).map((n) => [i.name, n] as const));
    expect(named.length, "alsoMatches 가 하나도 없다 — 이 검사가 무의미하다").toBeGreaterThan(0);
    for (const [item, n] of named) {
      expect(ings.has(n.toLowerCase()), `${item}: alsoMatches "${n}" 는 존재하지 않는 재료다`).toBe(true);
    }
  });
});

// 2026-08-24: 전단 멀티바이("2 for $5")를 실으면서 salePrice 에 **묶음 단가**를 넣었다.
// 하나만 사면 정가를 낸다 — 안 밝히면 절약액이 부풀어 보인다. 회원가와 같은 종류의 문제다.
describe.skipIf(!HAS_PROMOS)("🔴 묶음 가격은 묶음이라고 밝혀야 한다", () => {
  const FILE = promotionsFile as unknown as {
    currentWeek: string;
    weeks: Record<string, { stores: Record<string, { items: Promotion[] }> }>;
  };
  const items = Object.values((FILE.weeks[FILE.currentWeek]?.stores ?? {})).flatMap((s) => s.items);
  const multi = items.filter((i) => i.multibuy);

  it("이번 주에 묶음 특가가 실려 있다 — 없으면 아래 검사가 공짜로 통과한다", () => {
    expect(multi.length).toBeGreaterThan(0);
  });

  it.each(multi.map((i) => [i.name, i] as const))(
    "%s — 묶음 총액 ÷ 개수가 salePrice 와 같다",
    (_n, item) => {
      const m = item.multibuy!.match(/^(\d+) for \$(\d+\.\d{2})$/);
      expect(m, `multibuy 형식이 "N for $X.XX" 가 아니다: ${item.multibuy}`).toBeTruthy();
      const qty = Number(m![1]);
      expect(qty).toBeGreaterThan(1);
      expect(Number(m![2]) / qty).toBeCloseTo(item.salePrice, 2);
      // note 도 같은 조건을 말해야 한다 — 한쪽만 고치면 갈라진다
      expect(item.note ?? "").toContain(item.multibuy!);
    },
  );

  it("note 에 'N for $X' 가 있는데 multibuy 필드가 비어 있으면 안 된다", () => {
    const missed = items.filter((i) => /\d+ for \$\d+\.\d{2}/.test(i.note ?? "") && !i.multibuy);
    expect(missed.map((i) => i.name), "묶음인데 multibuy 표시가 없다").toEqual([]);
  });

  it("묶음 조건을 밝히는 문구가 세 언어와 플래너에 있다", async () => {
    for (const locale of ["en", "ko", "zh"]) {
      const m = (await import(`@/messages/${locale}.json`)).default as Record<string, string>;
      expect(m.sale_multibuy_note, locale).toBeTruthy();
      expect(m.sale_multibuy_note, locale).toContain("{offers}");
    }
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("components/PlannerClient.tsx", "utf8");
    expect(src).toContain('t("sale_multibuy_note"');
    // 🔴 `toContain("m.promotion.multibuy")` 로 걸었더니 **map 줄에도 같은 문자열이 있어**
    //    필터를 통째로 꺼도 통과했다(돌연변이로 잡음). 조건식 자체를 본다.
    expect(src, "멀티바이 고지 조건이 사라졌다").toContain(
      ".filter((m) => m.promotion.multibuy)",
    );
  });
});

// 2026-10-05: 같은 분류(matchKey "sauce")의 특가 둘이 같은 날 메뉴에 있으면 둘째가 할인을 잃었다.
//    주간 합계와 장보기 합계가 30회 생성 중 가끔 $0.3~0.4 갈렸다(shoppingListTotal.test.ts).
describe("🔴 같은 분류의 가격 특가 둘이 같은 날 둘 다 붙는다", () => {
  const priced = (name: string, ingredient: string): Promotion & { store: StoreId } => ({
    name, matchKey: "sauce", category: "Pantry", regularPrice: 9, salePrice: 1, savings: 8,
    savingsPercent: 89, promoType: "sale", lunchboxFit: "lunchbox", pricesIngredients: [ingredient], store: "woolworths",
  });
  it("Soy Sauce와 Teriyaki Sauce가 각자 제 특가를 받는다", () => {
    const promos = [priced("Test Soy Sauce 500ml", "Soy Sauce"), priced("Test Teriyaki Sauce 200g", "Teriyaki Sauce")];
    // 양성 대조 — 하나씩이면 각자 붙는다(팩·추적가 조건을 통과한다)
    expect(pricedMenuMatches(["Soy Sauce"], promos)).toHaveLength(1);
    expect(pricedMenuMatches(["Teriyaki Sauce"], promos)).toHaveLength(1);
    expect(pricedMenuMatches(["Soy Sauce", "Teriyaki Sauce"], promos).map((m) => m.ingredient))
      .toEqual(["Soy Sauce", "Teriyaki Sauce"]);
  });
});
