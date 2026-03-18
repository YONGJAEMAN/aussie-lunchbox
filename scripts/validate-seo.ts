import { POSTS } from "../content/posts";
import { BRAND } from "../lib/brand";

const errors: string[] = [];
const slugs = Object.keys(POSTS);

// Slug collision check
if (new Set(slugs).size !== slugs.length) {
  errors.push("Duplicate slugs detected in POSTS");
}

for (const [slug, post] of Object.entries(POSTS)) {
  if (!post.title || post.title.trim() === "") {
    errors.push(`${slug}: missing title`);
  }
  if (!post.excerpt || post.excerpt.trim() === "") {
    errors.push(`${slug}: missing excerpt`);
  }
  if (!post.body || post.body.trim().length < 200) {
    errors.push(`${slug}: body too short (< 200 chars)`);
  }
  if (!post.image || !post.image.startsWith("https://")) {
    errors.push(`${slug}: invalid image URL (must start with https://)`);
  }
  if (!post.date) {
    errors.push(`${slug}: missing date`);
  }
  if (!post.category) {
    errors.push(`${slug}: missing category`);
  }
  // canonical URL check
  const expectedCanonical = `${BRAND.SITE_URL}/en/blog/${slug}`;
  if (!expectedCanonical.startsWith("https://")) {
    errors.push(`${slug}: canonical URL invalid: ${expectedCanonical}`);
  }
}

if (errors.length > 0) {
  console.error(`\nSEO validation failed (${errors.length} error${errors.length > 1 ? "s" : ""}):\n`);
  errors.forEach((e) => console.error(`  ✗ ${e}`));
  process.exit(1);
}

console.log(`✅ SEO validation passed — ${slugs.length} posts, site: ${BRAND.SITE_URL}`);
