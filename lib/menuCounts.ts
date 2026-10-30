import { getMenuData, getSnackData } from "@/data/menuDataLoader";

/**
 * 페이지 본문에 쓰는 개수를 **메뉴 데이터에서만** 만든다.
 *
 * 🔴 개수를 손으로 적으면 안 되는 이유 (2026-08-13):
 * `/en/planner`가 같은 페이지에서 "our database of 94 New Zealand-friendly recipes"라고
 * 말하면서 몇 문단 아래에서는 "a library of 43 lunch recipes plus snacks"라고 말했다.
 * 이어서 "That leaves 38 recipes eligible"까지 있었는데, 38은 43에서 5를 뺀 값이다 —
 * 즉 **라이브러리가 43개이던 시절의 숫자가 통째로 남아 있었다.** 실제는 94개이고
 * 견과 포함이 5개이므로 89개가 맞다. 손으로 적은 숫자는 데이터가 자라도 따라오지 않는다.
 *
 * 이 사이트의 거절 이력이 "문구끼리의 모순"이었다는 걸 생각하면, 개수를 손으로
 * 적는 것 자체가 재발 장치다. 본문에 개수를 쓸 일이 생기면 **반드시 여기를 거칠 것.**
 *
 * 🔴 이 파일이 `lib/siteCounts.ts`에서 갈라져 나온 이유 (2026-08-20):
 *
 * 1. **순환 import.** `lib/siteCounts.ts`는 `POST_COUNT`/`GUIDE_COUNT`를 만들려고
 *    `@/content/posts`·`@/content/guides`를 import한다. 글 본문에서 개수를 쓰려고
 *    글 모듈이 `@/lib/siteCounts`를 import하면 순환이 닫히고, 나쁜 순서로 로드될 때
 *    `TypeError: Cannot read properties of undefined (reading 'length')`로 죽는다
 *    (`BLOG_SLUGS`가 아직 undefined다). 블로그·가이드 페이지는 **항상** 글 모듈을
 *    먼저 로드하므로 그 나쁜 순서가 기본값이다. 실측으로 재현했다.
 * 2. **클라이언트 번들.** `lib/siteCounts.ts`는 글 본문(posts+guides 320KB)에 닿기
 *    때문에 `"use client"` 그래프에서 import할 수 없다. 그쪽에서 개수가 필요하면
 *    이 파일을 쓴다.
 *
 * 그래서 여기는 **글 모듈에 절대 닿지 않는다.** import는 `@/data/menuDataLoader`
 * 하나뿐이고, 그 규칙은 `lib/contentClaims.test.ts`의 import 그래프 가드가 지킨다.
 * 글 파생 개수(`POST_COUNT`·`GUIDE_COUNT`·`BLOG_PAGE_CARD_COUNT`)는 `lib/siteCounts.ts`에
 * 남아 있고, 서버 쪽 소비자는 여전히 `@/lib/siteCounts` 한 곳에서 전부 가져올 수 있다
 * (siteCounts가 이 파일을 re-export한다).
 */
const menus = getMenuData("en");
const snacks = getSnackData();

/** 전체 점심 메뉴 수 */
export const MENU_COUNT = menus.length;

/** 전체 스낵 수 */
export const SNACK_COUNT = Object.values(snacks).reduce((n, list) => n + list.length, 0);

/** 견과를 포함해 Nut Allergy 필터에서 빠지는 메뉴 수 */
export const NUT_CONTAINING_COUNT = menus.filter((m) => !m.is_nut_free).length;

/** Nut Allergy 필터를 켰을 때 남는 메뉴 수 */
export const NUT_FREE_COUNT = MENU_COUNT - NUT_CONTAINING_COUNT;

/** 보온병에 담아 보낼 수 있는 메뉴 수 */
export const THERMOS_COUNT = menus.filter((m) => m.is_thermos).length;

/** 유제품이 없어 Dairy Allergy 필터에서 살아남는 메뉴 수 */
export const DAIRY_FREE_COUNT = menus.filter((m) => m.is_dairy_free).length;

/** 글루텐이 없어 Gluten Allergy 필터에서 살아남는 메뉴 수 */
export const GLUTEN_FREE_COUNT = menus.filter((m) => m.is_gluten_free).length;

/** 조리 없이 담을 수 있는 메뉴 수 */
export const NO_COOK_COUNT = menus.filter((m) => m.prep_style === "no-cook").length;

/** 전날 만들어 두는 메뉴 수 */
export const MAKE_AHEAD_COUNT = menus.filter((m) => m.prep_style === "make-ahead").length;

/** 아침에 조리하는 메뉴 수 */
export const COOK_FRESH_COUNT = menus.filter((m) => m.prep_style === "cook-fresh").length;

/**
 * "전날 만들거나 아예 안 익히는" 비율(%). 반올림 정수.
 * 🔴 본문이 "Eighty percent"라고 **낱말로** 말하므로 여기서 함께 만든다 —
 *    숫자만 생성하고 낱말을 손으로 적으면 정확히 그 자리에서 갈라진다.
 */
export const AHEAD_OR_NOCOOK_PCT = Math.round(((MAKE_AHEAD_COUNT + NO_COOK_COUNT) / MENU_COUNT) * 100);

/**
 * 퍼센트를 문장 첫머리에 쓸 낱말로 — "Eighty".
 * 🔴 본문이 숫자가 아니라 **낱말**로 말한다. 숫자만 생성하고 낱말을 손으로 적으면
 *    정확히 그 자리에서 갈라진다(비율이 80→79로 움직여도 "Eighty"는 그대로 남는다).
 *    10 단위가 아니면 숫자로 말한다 — 어설픈 낱말("Seventy-nine")보다 낫다.
 */
const TENS: Record<number, string> = {
  50: "Fifty", 60: "Sixty", 70: "Seventy", 80: "Eighty", 90: "Ninety", 100: "A hundred",
};
export const pctWord = (n: number): string => TENS[n] ?? String(n);
