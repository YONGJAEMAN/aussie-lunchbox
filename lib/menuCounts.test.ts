import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { MenuItem, SnackData } from "./types";

/**
 * 🔴 `lib/menuCounts.ts`가 `lib/siteCounts.ts`에서 갈라져 나온 걸 지키는 테스트.
 *
 * 갈라지기 전 실측(2026-08-20, 글 모듈이 `@/lib/siteCounts`를 import하는 프로브를
 * 넣고 vitest 실행):
 *
 *   TypeError: Cannot read properties of undefined (reading 'length')
 *    ❯ lib/siteCounts.ts:46:38   (export const POST_COUNT = BLOG_SLUGS.length)
 *    ❯ content/posts.ts:6:31
 *
 * `content/posts.ts`를 **먼저** 로드하면 순환이 닫히면서 `BLOG_SLUGS`가 아직
 * undefined다. 블로그·가이드 페이지는 항상 글 모듈을 먼저 로드하므로 그게 기본
 * 순서다. 갈라 놓은 지금은 `@/lib/menuCounts`가 글 모듈에 안 닿으므로 안전하다.
 */

const raw = JSON.parse(
  readFileSync(new URL("../data/menuData.json", import.meta.url), "utf-8"),
) as { MENU_DATA: { en: MenuItem[] }; SNACK_DATA: SnackData };
const MENUS = raw.MENU_DATA.en;

/** menuCounts가 export해야 하는 이름 — siteCounts도 같은 이름을 re-export해야 한다. */
const MENU_DERIVED = [
  "MENU_COUNT",
  "SNACK_COUNT",
  "NUT_CONTAINING_COUNT",
  "NUT_FREE_COUNT",
  "THERMOS_COUNT",
  "DAIRY_FREE_COUNT",
  "GLUTEN_FREE_COUNT",
  "NO_COOK_COUNT",
] as const;

describe("🔴 menuCounts는 글 모듈과 무관하게 로드된다", () => {
  it("content/posts를 먼저 로드해도 menuCounts·siteCounts가 터지지 않는다", async () => {
    // 로드 순서가 이 테스트의 전부다. 글 모듈을 **먼저** 세우는 게 나쁜 순서였다.
    await import("@/content/posts");
    await import("@/content/guides");

    const menuCounts = (await import("@/lib/menuCounts")) as unknown as Record<string, number>;
    const siteCounts = (await import("@/lib/siteCounts")) as unknown as Record<string, number>;

    for (const name of MENU_DERIVED) {
      expect(menuCounts[name], `menuCounts.${name}이 undefined다`).toBeTypeOf("number");
    }
    // 갈라지기 전에 정확히 여기서 죽었다 (`BLOG_SLUGS.length`).
    expect(siteCounts.POST_COUNT, "POST_COUNT가 undefined다 — 순환이 되살아났다").toBeGreaterThan(0);
    expect(siteCounts.GUIDE_COUNT, "GUIDE_COUNT가 undefined다 — 순환이 되살아났다").toBeGreaterThan(0);
    expect(siteCounts.BLOG_PAGE_CARD_COUNT).toBe(siteCounts.POST_COUNT + siteCounts.GUIDE_COUNT);
  });
});

describe("🔴 menuCounts의 값이 menuData.json 실측과 같다", () => {
  it("여덟 개 상수가 데이터와 일치한다", async () => {
    const c = await import("@/lib/menuCounts");
    // 양성 대조: 데이터를 못 읽으면 0 === 0으로 전부 통과하는 알리바이가 된다.
    expect(MENUS.length, "menuData.json에서 메뉴를 못 읽었다").toBeGreaterThan(50);

    expect(c.MENU_COUNT).toBe(MENUS.length);
    expect(c.SNACK_COUNT).toBe(
      Object.values(raw.SNACK_DATA).reduce((n, list) => n + list.length, 0),
    );
    expect(c.NUT_CONTAINING_COUNT).toBe(MENUS.filter((m) => !m.is_nut_free).length);
    expect(c.NUT_FREE_COUNT).toBe(MENUS.filter((m) => m.is_nut_free).length);
    expect(c.THERMOS_COUNT).toBe(MENUS.filter((m) => m.is_thermos).length);
    expect(c.DAIRY_FREE_COUNT).toBe(MENUS.filter((m) => m.is_dairy_free).length);
    expect(c.GLUTEN_FREE_COUNT).toBe(MENUS.filter((m) => m.is_gluten_free).length);
    expect(c.NO_COOK_COUNT).toBe(MENUS.filter((m) => m.prep_style === "no-cook").length);
  });

  /**
   * 🔴 값이 하나도 바뀌면 안 된다 — 분리는 리팩터링이지 데이터 변경이 아니다.
   * 여기 숫자는 분리 **직전**에 재어 둔 값이다. 메뉴가 실제로 늘어서 이게 깨지면
   * 그때는 이 목록을 갱신하는 게 맞다(위 실측 대조가 진짜 판정이다).
   */
  it("분리 직전에 재어 둔 여덟 값이 그대로다", async () => {
    const c = await import("@/lib/menuCounts");
    expect({
      MENU_COUNT: c.MENU_COUNT,
      SNACK_COUNT: c.SNACK_COUNT,
      NUT_CONTAINING_COUNT: c.NUT_CONTAINING_COUNT,
      NUT_FREE_COUNT: c.NUT_FREE_COUNT,
      THERMOS_COUNT: c.THERMOS_COUNT,
      DAIRY_FREE_COUNT: c.DAIRY_FREE_COUNT,
      GLUTEN_FREE_COUNT: c.GLUTEN_FREE_COUNT,
      NO_COOK_COUNT: c.NO_COOK_COUNT,
    }).toEqual({
      MENU_COUNT: 94,
      SNACK_COUNT: 41,
      NUT_CONTAINING_COUNT: 5,
      NUT_FREE_COUNT: 89,
      THERMOS_COUNT: 14,
      // 🔴 2026-08-23: 44 → 43. Char Siu Bao의 is_dairy_free를 내렸다 (바오번이 우유 선언)
      DAIRY_FREE_COUNT: 43,
      GLUTEN_FREE_COUNT: 23,
      NO_COOK_COUNT: 28,
    });
  });
});

describe("🔴 siteCounts의 re-export 배선이 살아 있다", () => {
  it("여덟 개를 전부 다시 내보내고 값이 menuCounts와 같다", async () => {
    const menuCounts = (await import("@/lib/menuCounts")) as unknown as Record<string, number>;
    const siteCounts = (await import("@/lib/siteCounts")) as unknown as Record<string, number>;

    // 기존 소비자 세 곳이 `@/lib/siteCounts`에서 그대로 가져오는 게 이 분리의 조건이다.
    // 배선이 끊기면 이름이 사라져 undefined가 된다 — 값 비교보다 이름 존재를 먼저 본다.
    const missing = MENU_DERIVED.filter((n) => !(n in siteCounts));
    expect(missing, `siteCounts가 re-export를 빠뜨렸다: ${missing.join(", ")}`).toEqual([]);

    for (const name of MENU_DERIVED) {
      expect(siteCounts[name], `siteCounts.${name} !== menuCounts.${name}`).toBe(menuCounts[name]);
    }
  });
});
