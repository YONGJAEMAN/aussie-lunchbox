import { MetadataRoute } from "next";
import { BLOG_SLUGS, POSTS } from "@/content/posts";
import { GUIDE_SLUGS, GUIDES } from "@/content/guides";
import { BRAND } from "@/lib/brand";

const BASE_URL = BRAND.SITE_URL;
const LOCALES = [...BRAND.LOCALES];

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

  for (const locale of LOCALES) {
    for (const route of STATIC_ROUTES) {
      entries.push({
        url: `${BASE_URL}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === "" ? "weekly" : "monthly",
        priority: route === "" ? 1.0 : route === "/planner" ? 0.9 : 0.7,
      });
    }

    for (const slug of BLOG_SLUGS) {
      const post = POSTS[slug];
      const reviewDate = post.lastReviewed ? new Date(`1 ${post.lastReviewed}`) : null;
      const publishDate = new Date(post.date);
      const lastModified = reviewDate && !isNaN(reviewDate.getTime()) ? reviewDate : publishDate;
      entries.push({
        url: `${BASE_URL}/${locale}/blog/${slug}`,
        lastModified,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    for (const slug of GUIDE_SLUGS) {
      const guide = GUIDES[slug];
      const reviewDate = guide.lastReviewed ? new Date(`1 ${guide.lastReviewed}`) : null;
      const publishDate = new Date(guide.date);
      const lastModified = reviewDate && !isNaN(reviewDate.getTime()) ? reviewDate : publishDate;
      entries.push({
        url: `${BASE_URL}/${locale}/guides/${slug}`,
        lastModified,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
