import { BLOG_SLUGS } from "@/content/posts";
import { GUIDE_SLUGS } from "@/content/guides";

/**
 * 페이지 본문에 쓰는 개수를 **데이터에서만** 만든다.
 *
 * 여기는 **글 모듈에서 파생되는 개수**만 정의한다. 메뉴 데이터에서 나오는 개수
 * 여덟 개는 `lib/menuCounts.ts`로 옮겼고 아래에서 그대로 re-export한다 —
 * 기존 소비자(`app/[locale]/page.tsx`, `app/[locale]/planner/page.tsx`,
 * `app/[locale]/blog/page.tsx`)는 지금까지처럼 `@/lib/siteCounts` 한 곳에서 다 가져온다.
 *
 * 🔴 왜 갈랐는지, 그리고 손으로 적은 개수가 왜 재발 장치인지는
 * **`lib/menuCounts.ts` 상단 주석**에 전부 적혀 있다. 요약하면:
 * 이 파일은 글 본문을 import하므로 (a) 글 모듈이 여길 import하면 순환이 닫혀
 * `BLOG_SLUGS`가 undefined인 채로 죽고, (b) 클라이언트 번들에 320KB가 실린다.
 *
 * 🔴 그래서 `content/posts.ts`·`content/guides.ts`에서 이 파일을 import하지 말 것.
 * 글 본문에 개수가 필요하면 `@/lib/menuCounts`를 쓴다.
 * (`lib/contentClaims.test.ts`가 두 방향을 다 가드한다.)
 */
export {
  MENU_COUNT,
  SNACK_COUNT,
  NUT_CONTAINING_COUNT,
  NUT_FREE_COUNT,
  THERMOS_COUNT,
  DAIRY_FREE_COUNT,
  GLUTEN_FREE_COUNT,
  NO_COOK_COUNT,
} from "./menuCounts";

/** 블로그 글 수 */
export const POST_COUNT = BLOG_SLUGS.length;

/** 레퍼런스 가이드 수 */
export const GUIDE_COUNT = GUIDE_SLUGS.length;

/**
 * `/[locale]/blog`에서 **실제로 보이는 카드 수**.
 *
 * 🔴 2026-08-13에 발견: `blog_count`가 en "44 guides" · ko/zh "19개"로
 * 서로 다른 값을 말하고 있었고, 셋 다 틀렸다(실제 21). 그 문장 바로 아래에
 * 카드가 깔려 있으니 세어 보면 즉시 드러나는 자기모순이었다.
 * 개수는 "DB에 몇 개"가 아니라 **"그 페이지에서 몇 개가 보이나"**여야 한다 —
 * 이 페이지는 글 카드와 가이드 카드를 **둘 다** 렌더하므로 합계다.
 */
export const BLOG_PAGE_CARD_COUNT = POST_COUNT + GUIDE_COUNT;
