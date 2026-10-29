import { MetadataRoute } from "next";
import { BLOG_SLUGS, POSTS } from "@/content/posts";
import { GUIDE_SLUGS, GUIDES } from "@/content/guides";
import { BRAND } from "@/lib/brand";
import priceIndex from "@/data/priceIndex.json";
import { lastModified } from "@/lib/contentDates";
import { coverage } from "@/lib/priceSeries";
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
  "/price-index",
  "/price-history",
  "/snack-checker",
  "/blog",
  "/guides",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const route of STATIC_ROUTES) {
      // 🔴 2026-08-14: 여기가 `new Date()`였다. 배포할 때마다 정적 페이지 10개가
      // 전부 "방금 수정됨"으로 신고됐다 — 내용이 안 바뀐 날에도 그랬다.
      // 매번 갱신되는 lastmod는 신선도 신호가 아니라 **신뢰할 수 없는 신호**다.
      // 실제 근거가 있는 곳(price-index는 데이터 갱신일)만 주고 나머지는 생략한다.
      // price-history는 09-18에 열었는데 lastmod가 없어 구글이 아직 크롤조차 안 했다(09-28 GSC).
      const dataDate =
        route === "/price-index"
          ? new Date(priceIndex.woolworthsUpdated)
          : route === "/price-history"
            ? new Date(coverage().map((c) => c.last).sort().at(-1) ?? "")
            : route === "/snack-checker"
              ? new Date(labelReadRange().newest) // 페이지에 실린 간식 재료의 가장 최근 라벨 관측
              : null;
      entries.push({
        url: `${BASE_URL}/${locale}${route}`,
        ...(dataDate && !isNaN(dataDate.getTime()) ? { lastModified: dataDate } : {}),
        changeFrequency: route === "" ? "weekly" : "monthly",
        priority: route === "" ? 1.0 : route === "/planner" ? 0.9 : route === "/price-index" ? 0.8 : 0.7,
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
