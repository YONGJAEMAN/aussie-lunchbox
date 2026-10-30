import { getMenuData, getSnackData } from "@/data/menuDataLoader";
import { BLOG_CARDS } from "@/content/posts";
import { GUIDE_CARDS } from "@/content/guides";
import type { Locale, SnackItem } from "@/lib/types";

/**
 * 사이트 내 검색.
 *
 * 왜 만들었나 (2026-08-18): 점심 메뉴 94 + 스낵 41 + 글 21 = **156개 항목**인데
 * 찾는 방법이 플래너 필터뿐이었다. "치킨 들어간 거", "달걀 없는 샌드위치"처럼
 * 이름이나 재료로 바로 찾을 길이 없었다.
 *
 * 🔴 검색 결과 페이지는 **색인시키지 않는다**(실측 `noindex, nofollow`). 쿼리마다 URL이
 * 생기는 얇은 페이지가 무한히 늘어나는데, 이 사이트가 AdSense에서 다섯 번 받은 사유가
 * 정확히 "가치 없는 얇은 페이지"였다. 사람에게는 쓸모 있고 색인엔 독이다.
 *
 * 🔴 랭킹을 만들 때 **여러 항목이 같은 점수를 받으면 순서가 흔들린다.** 동점일 때는
 * 이름 사전순으로 확정한다 — 그래야 같은 검색어가 항상 같은 화면을 준다.
 */

export type SearchHit =
  | {
      kind: "menu";
      name: string;
      category: string;
      image: string;
      detail: string;
      href: string;
    }
  | { kind: "snack"; name: string; category: string; detail: string }
  | {
      kind: "post" | "guide";
      slug: string;
      title: string;
      excerpt: string;
      image: string;
      category: string;
      href: string;
    };

export interface SearchResults {
  menus: Extract<SearchHit, { kind: "menu" }>[];
  snacks: Extract<SearchHit, { kind: "snack" }>[];
  articles: Extract<SearchHit, { kind: "post" | "guide" }>[];
  total: number;
}

const EMPTY: SearchResults = { menus: [], snacks: [], articles: [], total: 0 };

/** 대소문자·여분 공백을 지운다. 검색어와 대상 양쪽에 같은 함수를 쓴다. */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** 공백으로 끊은 검색어 토큰. 빈 검색어는 빈 배열 — 호출부가 "전부 반환"으로 오해하면 안 된다. */
export function tokenize(query: string): string[] {
  return normalize(query).split(" ").filter(Boolean);
}

/** 모든 토큰이 들어 있어야 맞는 것으로 본다 (AND). */
function matches(tokens: string[], haystack: string): boolean {
  return tokens.every((t) => haystack.includes(t));
}

/**
 * 이름에 맞으면 위로 올린다. 재료에만 맞은 항목이 이름이 정확히 같은 항목보다
 * 위에 오면 검색이 고장 난 것처럼 보인다.
 */
function rank(tokens: string[], name: string): number {
  const n = normalize(name);
  if (n === tokens.join(" ")) return 0;
  if (tokens.every((t) => n.startsWith(t))) return 1;
  if (matches(tokens, n)) return 2;
  return 3;
}

const byRankThenName = <T extends { name?: string; title?: string }>(
  tokens: string[],
) => (a: T, b: T) => {
  const an = a.name ?? a.title ?? "";
  const bn = b.name ?? b.title ?? "";
  const d = rank(tokens, an) - rank(tokens, bn);
  return d !== 0 ? d : an.localeCompare(bn);
};

export function searchAll(query: string, locale: Locale): SearchResults {
  const tokens = tokenize(query);
  if (!tokens.length) return EMPTY;

  const menus = getMenuData(locale)
    .filter((m) => matches(tokens, normalize([m.name, m.category, ...m.ingredients].join(" "))))
    .map(
      (m): Extract<SearchHit, { kind: "menu" }> => ({
        kind: "menu",
        name: m.name,
        category: m.category,
        image: m.image,
        detail: m.ingredients.slice(0, 5).join(", "),
        href: `/${locale}/planner`,
      }),
    )
    .sort(byRankThenName(tokens));

  const snackData = getSnackData();
  const snacks = (Object.entries(snackData) as [string, SnackItem[]][])
    .flatMap(([category, items]) =>
      items.map((s) => ({ category, ...s })),
    )
    .filter((s) => matches(tokens, normalize([s.name, s.category, ...s.ingredients].join(" "))))
    .map(
      (s): Extract<SearchHit, { kind: "snack" }> => ({
        kind: "snack",
        name: s.name,
        category: s.category,
        detail: s.ingredients.join(", "),
      }),
    )
    .sort(byRankThenName(tokens));

  const articles = [
    ...BLOG_CARDS.map((c) => ({ ...c, kind: "post" as const, base: "blog" })),
    ...GUIDE_CARDS.map((c) => ({ ...c, kind: "guide" as const, base: "guides" })),
  ]
    .filter((c) => matches(tokens, normalize([c.title, c.excerpt, c.category].join(" "))))
    .map(
      (c): Extract<SearchHit, { kind: "post" | "guide" }> => ({
        kind: c.kind,
        slug: c.slug,
        title: c.title,
        excerpt: c.excerpt,
        image: c.image,
        category: c.category,
        href: `/${locale}/${c.base}/${c.slug}`,
      }),
    )
    .sort(byRankThenName(tokens));

  return { menus, snacks, articles, total: menus.length + snacks.length + articles.length };
}

/** 검색 대상이 몇 개인지 — 화면에 "156개 중에서 찾습니다"로 쓴다. 손으로 적지 않는다. */
export function searchableCount(locale: Locale): number {
  const snacks = Object.values(getSnackData()).reduce((n, list) => n + list.length, 0);
  return getMenuData(locale).length + snacks + BLOG_CARDS.length + GUIDE_CARDS.length;
}
