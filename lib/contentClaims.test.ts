import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { GUIDES } from "@/content/guides";
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

describe("🔴 사이트 문구가 실제 구현·About과 어긋나지 않는다", () => {
  // 2026-08-10: Kiwi에서 같은 종류의 자기모순을 고친 뒤 Aussie를 대조했더니
  // 그대로 남아 있었다. **같은 자리가 둘이면 하나만 고치게 된다.**
  //
  // Aussie에서 실제로 거짓이던 것:
  //   - FAQ가 "team member 시식 + editorial review"라 했지만
  //     About은 "This is a solo project. There's no team"이라고 명시한다
  //   - "매월 3~5개 신규 레시피" — menuData는 두 번 바뀌었다(3월 43 -> 6월 63)
  //   - "Woolworths와 **Coles** 가격을 갱신" — **Coles는 코드에 존재하지 않는다.**
  //     문구에만 있고 데이터도 계산도 없다
  //   - "AI-powered" — 생성기에 LLM 호출이 없다
  //   - 계정 혜택 "Save Weekly Plans" — 쓰는 테이블은 favorites 하나뿐
  //
  // ⚠️ 반대로 **"Sign in with Google"은 참이다** — Aussie엔 signInWithOAuth가 있다.
  //    Kiwi 기준으로 일괄 수정했다면 맞는 문장을 지울 뻔했다. 사이트마다 확인할 것.
  const src = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf-8");
  const LOCALES = ["en", "ko", "zh"] as const;
  const messages = Object.fromEntries(
    LOCALES.map((l) => [
      l,
      JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8")) as Record<string, string>,
    ]),
  );

  it("1인 프로젝트인데 팀·편집 검수를 말하지 않는다", () => {
    const about = src("app/[locale]/about/page.tsx");
    expect(about, "About이 solo project라고 말하는지").toMatch(/solo project/i);
    for (const l of LOCALES) {
      const all = JSON.stringify(messages[l]);
      expect(all, `${l}: 팀 주장`).not.toMatch(/team member|editorial review|팀원|编辑审核/i);
    }
  });

  it("AI라고 말하지 않는다 (생성기에 LLM 호출이 없다)", () => {
    const gen = src("lib/planGenerator.ts");
    expect(gen).not.toMatch(/openai|anthropic|\bllm\b/i);
    for (const l of LOCALES) {
      expect(JSON.stringify(messages[l]), `${l}: AI 주장`).not.toMatch(/AI[- ]powered|AI 기반|AI ?驱动/i);
    }
  });

  it("추적하지 않는 매장을 광고하지 않는다", () => {
    // Coles를 다루는 코드가 생기면 이 가드를 풀고 문구를 되살릴 것.
    const hasColesCode = ["lib", "components", "app/api"].some((d) => {
      try {
        return readFileSync(new URL(`../${d}/planGenerator.ts`, import.meta.url), "utf-8").match(/coles/i);
      } catch {
        return false;
      }
    });
    expect(hasColesCode, "Coles 코드가 생겼다면 문구를 복원할 것").toBe(false);
    for (const l of LOCALES) {
      // ⚠️ "Coles"라는 단어 자체를 막으면 안 된다. 정직한 고지("Coles 가격은
      //    아직 추적하지 않습니다")까지 걸린다. **추적한다는 주장만** 잡는다.
      expect(messages[l].faq_a30, `${l}: 없는 Coles 갱신 주장`).not.toMatch(
        /Coles.{0,20}(update|refresh|갱신|업데이트|更新)|(update|refresh).{0,20}Coles/i,
      );
      expect(messages[l].planner_seo_intro, `${l}: 없는 Coles 추정치 주장`).not.toMatch(
        /Coles.{0,12}(estimate|추정|估算)/i,
      );
    }
  });

  it("계정 혜택이 실제 테이블과 맞는다 (favorites 하나뿐)", () => {
    const tables = new Set<string>();
    for (const f of ["components/PlannerClient.tsx", "app/[locale]/account/page.tsx"]) {
      for (const m of src(f).matchAll(/\.from\("([a-z_]+)"\)/g)) tables.add(m[1]);
    }
    expect([...tables].sort()).toEqual(["favorites"]);
    for (const l of LOCALES) {
      expect(messages[l].account_save_plans_feature, `${l}: 없는 기능`).toBeUndefined();
    }
    expect(src("app/[locale]/account/page.tsx"), "하드코딩 통계 타일").not.toContain('">–</p>');
  });

  it("출처 없는 비교 수치를 쓰지 않는다", () => {
    const bodies = [
      ...Object.values(GUIDES).map((g) => String(g.body)),
      ...Object.values(POSTS).map((p) => String(p.body)),
    ];
    for (const b of bodies) {
      expect(b, "근거 없는 퍼센트 범위").not.toMatch(/\d+-\d+% (less|lower|cheaper)/);
    }
  });
});

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
