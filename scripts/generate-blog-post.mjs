#!/usr/bin/env node
/**
 * Aussie Lunchbox — Automated Blog Post Generator
 * Calls Google Gemini API to generate a new Australian lunchbox blog post,
 * then inserts it into blog/page.tsx, blog/[slug]/page.tsx, and sitemap.ts.
 *
 * Usage: node scripts/generate-blog-post.mjs
 * Requires: GOOGLE_API_KEY environment variable
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function readFile(rel) {
  return readFileSync(join(ROOT, rel), "utf-8");
}

function writeFile(rel, content) {
  writeFileSync(join(ROOT, rel), content, "utf-8");
  console.log(`✅ Updated ${rel}`);
}

function getExistingSlugs() {
  const content = readFile("app/[locale]/blog/page.tsx");
  return [...content.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);
}

function todayDate() {
  const d = new Date();
  return d.toLocaleDateString("en-AU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function generatePost(existingSlugs) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are a content writer for Aussie Lunchbox (aussielunchbox.com), a school lunchbox planner for Australian families.

Generate a NEW blog post that is NOT any of these existing slugs:
${existingSlugs.map((s) => `- ${s}`).join("\n")}

Return a single JSON object with these exact fields (no markdown code blocks, just raw JSON):

{
  "slug": "kebab-case-unique-slug",
  "title": "Post title (under 70 chars)",
  "excerpt": "2-3 sentence excerpt describing the post",
  "date": "${todayDate()}",
  "readTime": "X min read",
  "image": "https://images.unsplash.com/photo-XXXXXXXXXXXXXXXXXX?w=800&q=80",
  "category": "one of: Recipes / Allergy Friendly / Budget / Parenting Tips / Meal Prep / Nutrition / Sustainability / Gear & Tips / Seasonal",
  "author": "Aussie Lunchbox Team",
  "body": "Full post body in markdown (800-1200 words). Use ## for headings, ### for subheadings, - for bullet points, | for tables. Do NOT use backticks anywhere."
}

Requirements for the post:
- Relevant to Australian school families
- Mention Woolworths or Coles by name where relevant
- Reference Australian seasonal produce (mango, stone fruit, avocado etc.) if appropriate
- Reference Australian school terms (Term 1-4), NAPLAN, school canteen guidelines if appropriate
- Mention Australian states/cities naturally (Sydney, Melbourne, Brisbane, Perth, Adelaide)
- Include at least 2 markdown tables or bullet-point lists
- Include a CTA at the end linking to [Try the Aussie Lunchbox Planner](/en/planner)
- The image URL must use a real Unsplash photo ID (16-character format)

Choose a topic that fills a gap not covered by the existing posts. Think about:
- State-specific lunchbox tips (Queensland heat, Victoria cold, WA remoteness)
- Australian multicultural lunchbox ideas (Vietnamese, Greek, Lebanese, Indian for Aussie schools)
- Sports carnival / athletics day lunchbox ideas
- OSHC (Out of School Hours Care) snack ideas
- Lunchbox ideas for Australian public holiday periods
- Bush tucker / native Australian ingredients for kids
- Specific dietary needs popular in Australia (paleo, whole foods)

Return ONLY the JSON object.`;

  console.log("🤖 Calling Gemini API...");
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const json = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(json);
}

function insertIntoListingPage(post) {
  const filePath = "app/[locale]/blog/page.tsx";
  let content = readFile(filePath);

  const newEntry = `  {
    slug: "${post.slug}",
    title: "${post.title.replace(/"/g, '\\"')}",
    excerpt:
      "${post.excerpt.replace(/"/g, '\\"')}",
    date: "${post.date}",
    readTime: "${post.readTime}",
    image: "${post.image}",
    category: "${post.category}",
  },\n`;

  content = content.replace(/^(\];)/m, `${newEntry}$1`);
  writeFile(filePath, content);
}

function insertIntoSlugPage(post) {
  const filePath = "app/[locale]/blog/[slug]/page.tsx";
  let content = readFile(filePath);

  const safeBody = post.body.replace(/`/g, "'").replace(/\${/g, "\\${");

  const newEntry = `  "${post.slug}": {
    title: "${post.title.replace(/"/g, '\\"')}",
    excerpt: "${post.excerpt.replace(/"/g, '\\"')}",
    date: "${post.date}",
    readTime: "${post.readTime}",
    image: "${post.image.replace("w=800", "w=1200")}",
    category: "${post.category}",
    author: "${post.author}",
    body: \`
${safeBody}
\`,
  },\n`;

  content = content.replace(
    /^(\};\s*\nexport async function generateStaticParams)/m,
    `${newEntry}$1`
  );
  writeFile(filePath, content);
}

function insertIntoSitemap(slug) {
  const filePath = "app/sitemap.ts";
  let content = readFile(filePath);
  content = content.replace(/^(\];)/m, `  "${slug}",\n$1`);
  writeFile(filePath, content);
}

async function main() {
  if (!process.env.GOOGLE_API_KEY) {
    console.error("❌ GOOGLE_API_KEY is not set");
    process.exit(1);
  }

  const existingSlugs = getExistingSlugs();
  console.log(`📋 Found ${existingSlugs.length} existing posts`);

  let post;
  try {
    post = await generatePost(existingSlugs);
  } catch (err) {
    console.error("❌ Failed to generate post:", err.message);
    process.exit(1);
  }

  const required = ["slug", "title", "excerpt", "date", "readTime", "image", "category", "body"];
  for (const field of required) {
    if (!post[field]) {
      console.error(`❌ Missing field: ${field}`);
      process.exit(1);
    }
  }

  if (existingSlugs.includes(post.slug)) {
    console.error(`❌ Duplicate slug: ${post.slug}`);
    process.exit(1);
  }

  console.log(`\n📝 New post: "${post.title}"`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Category: ${post.category}`);
  console.log(`   Read time: ${post.readTime}\n`);

  insertIntoListingPage(post);
  insertIntoSlugPage(post);
  insertIntoSitemap(post.slug);

  console.log("\n🎉 Done! New blog post added successfully.");
  console.log(`   Preview: /en/blog/${post.slug}`);
}

main();
