/**
 * 🔴 이 파일에서 `@/lib/siteCounts`를 import하지 말 것.
 *
 * 아래 `{ none: … }` 사유에 개수를 적고 싶어지면(2026-08-20까지 no-cook 사유가
 * "무조리 메뉴 28개"였다) `NO_COOK_COUNT` 같은 상수로 바꾸는 게 자연스러운
 * 정리처럼 보인다. 하지만 `lib/siteCounts.ts`가
 * `@/content/posts`·`@/content/guides`에서 `BLOG_SLUGS`/`GUIDE_SLUGS`를 가져온다.
 * 이 파일은 `PlannerClient`("use client")의 import 그래프 안에 있으므로,
 * siteCounts를 한 줄 넣는 순간 글 본문 320KB가 브라우저 번들에 통째로 실린다.
 * contentClaims.test.ts의 번들 가드가 그때 발화한다(2026-08-20에 실제로 확인).
 * 개수를 자동화하고 싶으면 사유 문자열이 아니라 **서버 쪽**에서 계산해 넘길 것.
 */
import type { AllergyType, PrepStyle } from "@/lib/types";

export type RelatedLink = { slug: string; kind: "blog" | "guide" };

/**
 * 🔴 `FILTER_ARTICLES`의 키 집합을 **타입으로** 고정한다.
 *
 * 2026-08-20 리뷰: `Record<string, …>`이라 필터가 늘어도 이 파일에서는 아무 일도
 * 안 났다. `AllergyType`에 값을 하나 더하면 `tsc`는 `PlannerClient`의
 * 표시 키 맵만 지적했고, 그걸 고치면 매핑 테이블은 조용히 불완전한 채 남았다.
 * 테스트의 `ALL_ALLERGIES`도 손으로 적은 배열이라 유니온과 같이 늙지 않는다.
 * 이제 필터 값이 늘면 **이 파일에서** TS2741이 난다.
 */
export type FilterKey = AllergyType | PrepStyle | "thermosOnly";
export type FilterState = {
  allergies: AllergyType[];
  prepStyles: PrepStyle[];
  thermosOnly: boolean;
};

/**
 * 🔴 이 테이블은 플래너 필터 값을 **하나도 빠짐없이** 담는다.
 *
 * 이 파일이 생긴 이유 (2026-08-20): 글에서 플래너로 가는 링크는 42개인데
 * **플래너에서 글로 나가는 링크가 0개였다.** 계획을 만든 사람은 거기서 막혔다.
 *
 * 글이 아직 없는 필터는 지우지 말고 `{ none: "사유" }`로 남긴다. 지우면
 * "필터 값이 전부 있다" 가드가 못 잡고, 다음에 필터가 늘 때 콘텐츠가
 * 조용히 뒤처진다. 실사진 UNPLACED 목록과 같은 방식이다 —
 * **사유가 적힌 항목에 글이 생기면 사유도 같이 지워야 한다.**
 */
export const FILTER_ARTICLES: Record<FilterKey, RelatedLink | { none: string }> = {
  "Nut Allergy": { slug: "allergy-management-school-lunchbox-australia", kind: "guide" },
  "Egg Allergy": { slug: "allergy-management-school-lunchbox-australia", kind: "guide" },
  "Dairy Allergy": { slug: "allergy-management-school-lunchbox-australia", kind: "guide" },
  "Gluten Allergy": { slug: "allergy-management-school-lunchbox-australia", kind: "guide" },
  "Sesame Allergy": { slug: "fsanz-peal-allergen-labelling-australian-30-second-read", kind: "blog" },
  Vegetarian: { slug: "vegetarian-vegan-school-lunch-guide-australia", kind: "guide" },
  Vegan: { slug: "vegetarian-vegan-school-lunch-guide-australia", kind: "guide" },
  "make-ahead": { slug: "budget-lunchbox-planning-guide-australia", kind: "guide" },
  thermosOnly: { slug: "lunchbox-food-safety-guide-australia", kind: "guide" },
  Kindy: { slug: "kindy-lunchbox-choking-guide-australia", kind: "guide" },
  "no-cook": { none: "호주 글에 무조리 도시락만 다룬 글이 아직 없다" },
  "cook-fresh": {
    none: "글을 만들지 않는다 — '아침에 조리한다'는 별도 글의 주제가 되기 어렵고 기존 레시피 글들이 이미 다룬다",
  },
};

/** 필터를 하나도 안 켠 사용자에게 보여줄 글. 어떤 필터와도 무관하게 모두에게 해당한다. */
export const FALLBACK: RelatedLink[] = [
  { slug: "budget-lunchbox-planning-guide-australia", kind: "guide" },
  { slug: "australian-lunchbox-food-safety-summer-heat-fsanz", kind: "blog" },
  { slug: "school-canteen-vs-packed-lunch", kind: "blog" },
];

const MAX = 3;

/**
 * 🔴 필터 → `FILTER_ARTICLES` 키. `relatedPosts`와 `matchedFilters`가 **같은 키 집합**을
 *    봐야 한다. 따로 만들면 한쪽만 고쳐져서 "필터에 맞췄다"는 제목 아래
 *    필터와 무관한 카드가 뜬다(2026-08-20에 실제로 그랬다).
 */
function filterKeys(filters: FilterState): FilterKey[] {
  return [
    ...filters.allergies,
    ...filters.prepStyles,
    // `as const` 없이는 `string[]`으로 넓어져서 반환 타입이 안 맞는다.
    ...(filters.thermosOnly ? (["thermosOnly"] as const) : []),
  ];
}

/**
 * 🔴 "글이 있는 키인가"를 판정하는 자리는 여기 하나여야 한다. `relatedPosts`와
 *    `matchedFilters`가 각자 판정하면 한쪽만 고쳐질 수 있다 — 키 집합을 `filterKeys`로
 *    합친 것과 같은 이유다.
 */
function hasArticle(k: FilterKey): boolean {
  const entry = FILTER_ARTICLES[k];
  return !!entry && !("none" in entry);
}

export function relatedPosts(filters: FilterState): RelatedLink[] {
  const out: RelatedLink[] = [];
  const seen = new Set<string>();
  for (const k of filterKeys(filters)) {
    if (!hasArticle(k)) continue;
    const entry = FILTER_ARTICLES[k] as RelatedLink;
    if (seen.has(entry.slug)) continue;
    seen.add(entry.slug);
    out.push(entry);
    if (out.length === MAX) break;
  }

  // 🔴 폴백은 **참조 그대로** 돌려준다. `[...FALLBACK]`으로 "방어적" 복사를 하면
  //    `relatedPosts(f) === FALLBACK`으로 폴백 여부를 보는 matchedFilters 정합성
  //    테스트가 알아보기 힘든 메시지로 깨진다. 이 동일성은 계약이다.
  return out.length > 0 ? out : FALLBACK;
}

/**
 * 🔴 "선택하신 필터에 맞춰"라고 쓸 수 있는가. **입력이 아니라 결과로 판정한다.**
 *
 * 필터를 켰다는 것만으로는 부족하다. 10개 필터 중 1개가 아직 `{ none }`이라
 * (cook-fresh) 켜도 폴백 3개가 나온다.
 * (thermosOnly·Dairy Allergy·Gluten Allergy·no-cook는 2026-08-20에 글이 생겨 `{ none }`에서 빠졌다.)
 * 입력으로 판정하면 cook-fresh 필터 위에 예산·식품안전 글을 얹고 "필터에 맞췄다"고 한다.
 */
export function matchedFilters(filters: FilterState): boolean {
  return filterKeys(filters).some(hasArticle);
}

/** 글 종류에 따라 경로가 갈린다 — blog는 `/blog/`, guide는 `/guides/`(복수형). */
export function articleHref(locale: string, link: RelatedLink): string {
  return `/${locale}/${link.kind === "blog" ? "blog" : "guides"}/${link.slug}`;
}
