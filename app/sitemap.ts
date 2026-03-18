import { MetadataRoute } from "next";

const BASE_URL = "https://www.aussielunchbox.com.au";
const LOCALES = ["en", "ko", "zh"];

const STATIC_ROUTES = [
  "",
  "/planner",
  "/about",
  "/contact",
  "/policies",
  "/terms",
  "/faq",
  "/blog",
];

const BLOG_SLUGS = [
  "5-healthy-lunchbox-ideas-for-au-kids",
  "nut-free-school-lunches-australia",
  "gluten-free-lunchbox-tips",
  "budget-friendly-lunchbox-ideas",
  "getting-kids-to-eat-healthy-lunches",
  "sunday-meal-prep-lunchbox-guide",
  "dairy-free-school-lunches-australia",
  "vegetarian-lunchbox-ideas-australia",
  "high-protein-lunchbox-ideas",
  "waste-free-lunchbox-guide-australia",
  "best-lunchbox-containers-australia",
  "woolworths-vs-coles-lunchbox-budget",
  "rainbow-lunchbox-guide",
  "thermos-hot-lunch-ideas-australia",
  "multicultural-lunchbox-ideas-australia",
  "lunchbox-ideas-by-age-australia",
  "summer-lunchbox-ideas-australia",
  "kids-make-own-lunchbox",
  "school-canteen-vs-packed-lunch",
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
      entries.push({
        url: `${BASE_URL}/${locale}/blog/${slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
