import { MetadataRoute } from "next";
import { BLOG_SLUGS, POSTS } from "@/content/posts";
import { GUIDE_SLUGS, GUIDES } from "@/content/guides";
import { BRAND } from "@/lib/brand";

const BASE_URL = BRAND.SITE_URL;

// AdSense 승인 단계: 영어만 sitemap에 포함.
// /ko, /zh는 layout.tsx에서 robots: noindex 처리 + middleware 307 redirect → sitemap 제외.
// Aussie는 localePrefix: "as-needed"라 영어는 prefix 없음 (예: /blog).
// 승인 후 다국어 운영 본격화 시 BRAND.LOCALES로 복원.

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
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const route of STATIC_ROUTES) {
    entries.push({
      url: `${BASE_URL}${route}`,
      lastModified: new Date(),
      changeFrequency: route === "" ? "weekly" : "monthly",
      priority: route === "" ? 1.0 : route === "/planner" ? 0.9 : 0.7,
    });
  }

  for (const slug of BLOG_SLUGS) {
    const post = POSTS[slug];
    // lastModified는 publish 이후여야 함. lastReviewed가 같은 달이면 day 1로 파싱돼
    // publishDate보다 앞설 수 있음 → schema 위반. Math.max 가드.
    const publishTime = new Date(post.date).getTime();
    const reviewDate = post.lastReviewed ? new Date(`1 ${post.lastReviewed}`) : null;
    const reviewTime = reviewDate && !isNaN(reviewDate.getTime()) ? reviewDate.getTime() : 0;
    entries.push({
      url: `${BASE_URL}/blog/${slug}`,
      lastModified: new Date(Math.max(publishTime, reviewTime)),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  for (const slug of GUIDE_SLUGS) {
    const guide = GUIDES[slug];
    const publishTime = new Date(guide.date).getTime();
    const reviewDate = guide.lastReviewed ? new Date(`1 ${guide.lastReviewed}`) : null;
    const reviewTime = reviewDate && !isNaN(reviewDate.getTime()) ? reviewDate.getTime() : 0;
    entries.push({
      url: `${BASE_URL}/guides/${slug}`,
      lastModified: new Date(Math.max(publishTime, reviewTime)),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    });
  }

  return entries;
}
