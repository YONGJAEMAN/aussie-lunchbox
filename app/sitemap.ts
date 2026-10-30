import { MetadataRoute } from "next";
import { BLOG_SLUGS, POSTS } from "@/content/posts";
import { GUIDE_SLUGS, GUIDES } from "@/content/guides";
import { BRAND, SITE_NOINDEX } from "@/lib/brand";
import { lastModified } from "@/lib/contentDates";
import { labelReadRange } from "@/lib/snackChecker";

const BASE_URL = BRAND.SITE_URL;
// AdSense 승인 단계: 영어만 sitemap에 포함.
// /ko, /zh는 layout.tsx에서 robots: noindex 처리되므로 sitemap에서도 빼서
// crawler가 무의미한 URL을 시도하지 않게 함. 승인 후 다국어 운영 본격화 시
// `[...BRAND.LOCALES]`로 복원.
const LOCALES: string[] = ["en"];
void BRAND.LOCALES;

const STATIC_ROUTES = [
  "",
  "/planner",
  "/about",
  "/contact",
  "/policies",
  "/terms",
  "/faq",
  "/blog",
  "/guides",
  "/snack-checker",
];

export default function sitemap(): MetadataRoute.Sitemap {
  // 🔴 사이트 전체가 noindex인 동안 sitemap이 URL을 색인 요청하면 신호가 갈라진다(2026-08-23, lib/brand.ts).
  return SITE_NOINDEX ? [] : sitemapEntries();
}

/** 재런칭 때 열릴 목록. noindex 동안에도 테스트가 이것을 본다 — 스위치를 내리는 날 빈 목록이 아니게. */
export function sitemapEntries(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const route of STATIC_ROUTES) {
      // 🔴 2026-08-14(Kiwi): 여기가 `new Date()`였다 — 매번 갱신되는 lastmod는 신뢰할 수 없는 신호다.
      // 실제 근거가 있는 날짜가 없으면 lastmod를 생략한다(가격 페이지는 3단계에서 데이터 갱신일과 함께 다시 붙는다).
      entries.push({
        url: `${BASE_URL}/${locale}${route}`,
        // 데이터 페이지만 근거 있는 날짜를 준다 — 간식 확인은 라벨 최신 관측일.
        ...(route === "/snack-checker" ? { lastModified: new Date(labelReadRange().newest) } : {}),
        changeFrequency: route === "" ? "weekly" : "monthly",
        priority: route === "" ? 1.0 : route === "/planner" ? 0.9 : 0.7,
      });
    }

    for (const slug of BLOG_SLUGS) {
      const post = POSTS[slug];
      entries.push({
        url: `${BASE_URL}/${locale}/blog/${slug}`,
        lastModified: lastModified(post),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    for (const slug of GUIDE_SLUGS) {
      const guide = GUIDES[slug];
      entries.push({
        url: `${BASE_URL}/${locale}/guides/${slug}`,
        lastModified: lastModified(guide),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      });
    }
  }

  return entries;
}
