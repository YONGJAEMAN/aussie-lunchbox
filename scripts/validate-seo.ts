import { existsSync } from "node:fs";
import { POSTS } from "../content/posts";
import { GUIDES } from "../content/guides";
import { BRAND } from "../lib/brand";

/**
 * prebuild 게이트. 배포되는 모든 글이 최소 SEO 조건을 갖췄는지 본다.
 *
 * 2026-08-06: **가이드 8편이 이 검사에서 빠져 있었다.** 블로그 13편만 보고 있었다.
 * (Kiwi도 같은 구멍이 있었고 같은 날 같이 고쳤다.) 두 컬렉션은 필드 모양이
 * 같으므로 같은 규칙을 적용한다.
 *
 * 로컬 이미지(/assets/...) 파일 존재 확인도 넣었다. 경로를 잘못 적어도
 * 타입체크·빌드는 통과하고 히어로만 조용히 깨진다. 현재 21편은 전부 Unsplash라
 * 이 분기를 타지 않지만, 자체 호스팅으로 옮길 때 필요하다.
 */
type Article = {
  title: string;
  excerpt: string;
  body: string;
  image: string;
  date: string;
  category: string;
};

const COLLECTIONS: [label: string, urlSegment: string, items: Record<string, Article>][] = [
  ["post", "blog", POSTS as Record<string, Article>],
  ["guide", "guides", GUIDES as Record<string, Article>],
];

const errors: string[] = [];

for (const [label, urlSegment, items] of COLLECTIONS) {
  const slugs = Object.keys(items);

  if (new Set(slugs).size !== slugs.length) {
    errors.push(`Duplicate slugs detected in ${label}s`);
  }
  // 컬렉션을 못 읽으면 루프가 0회 돌고 조용히 "통과"가 된다.
  if (slugs.length === 0) {
    errors.push(`${label}: 항목이 하나도 없다 — import가 깨졌을 수 있다`);
  }

  for (const [slug, article] of Object.entries(items)) {
    const id = `${label} ${slug}`;

    if (!article.title || article.title.trim() === "") {
      errors.push(`${id}: missing title`);
    }
    if (!article.excerpt || article.excerpt.trim() === "") {
      errors.push(`${id}: missing excerpt`);
    }
    if (!article.body || article.body.trim().length < 200) {
      errors.push(`${id}: body too short (< 200 chars)`);
    }
    if (!article.date) {
      errors.push(`${id}: missing date`);
    }
    if (!article.category) {
      errors.push(`${id}: missing category`);
    }

    const image = article.image ?? "";
    if (!image.startsWith("https://") && !image.startsWith("/assets/")) {
      errors.push(`${id}: invalid image URL (must start with https:// or /assets/): ${image || "(none)"}`);
    } else if (image.startsWith("/assets/") && !existsSync(`public${image}`)) {
      errors.push(`${id}: image file not found on disk: public${image}`);
    }

    const canonical = `${BRAND.SITE_URL}/en/${urlSegment}/${slug}`;
    if (!canonical.startsWith("https://")) {
      errors.push(`${id}: canonical URL invalid: ${canonical}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`\nSEO validation failed (${errors.length} error${errors.length > 1 ? "s" : ""}):\n`);
  errors.forEach((e) => console.error(`  ✗ ${e}`));
  process.exit(1);
}

const counts = COLLECTIONS.map(([label, , items]) => `${Object.keys(items).length} ${label}s`).join(" + ");
console.log(`✅ SEO validation passed — ${counts}, site: ${BRAND.SITE_URL}`);
