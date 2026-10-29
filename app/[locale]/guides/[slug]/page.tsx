import Link from "next/link";
import { lastModified } from "@/lib/contentDates";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GUIDES, GUIDE_CARDS } from "@/content/guides";
import { BLOG_CARDS } from "@/content/posts";
import { BRAND } from "@/lib/brand";
import { withBrand } from "@/lib/seo/pageMetadata";
import { getReferences } from "@/lib/utils";
import { renderBody } from "@/lib/markdown";
import AdUnit from "@/components/AdUnit";
import Footer from "@/components/Footer";

const BASE_URL = BRAND.SITE_URL;
const SLOT_LEADERBOARD = process.env.NEXT_PUBLIC_ADSENSE_SLOT_LEADERBOARD ?? "";
const SLOT_RECTANGLE = process.env.NEXT_PUBLIC_ADSENSE_SLOT_RECTANGLE ?? "";

export async function generateStaticParams() {
  return Object.keys(GUIDES).flatMap((slug) =>
    ["en", "ko", "zh"].map((locale) => ({ locale, slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = GUIDES[slug];
  if (!guide) return {};

  const canonical = `${BASE_URL}/${locale}/guides/${slug}`;

  return {
    title: withBrand(guide.seoTitle ?? guide.title),
    description: guide.excerpt,
    alternates: {
      canonical,
      languages: {
        "x-default": `${BASE_URL}/en/guides/${slug}`,
        en: `${BASE_URL}/en/guides/${slug}`,
      },
    },
    openGraph: {
      title: guide.title,
      description: guide.excerpt,
      type: "article",
      publishedTime: new Date(guide.date).toISOString(),
      url: canonical,
      images: [{ url: guide.image, width: 1200, height: 630, alt: guide.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.excerpt,
      images: [guide.image],
    },
  };
}


export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const guide = GUIDES[slug];
  if (!guide) notFound();

  const t = await getTranslations();
  const author = guide.author ?? "Kiwi Lunchbox Team";

  // Related guides: same category first, then fill from others
  const sameCat = GUIDE_CARDS.filter(g => g.category === guide.category && g.slug !== slug);
  const others = GUIDE_CARDS.filter(g => g.slug !== slug && g.category !== guide.category);
  const relatedGuides = [...sameCat, ...others].slice(0, 3);

  // Cross-type related blog articles: category match first, then fill
  const matchingPosts = BLOG_CARDS.filter(p => p.category === guide.category);
  const otherPosts = BLOG_CARDS.filter(p => p.category !== guide.category);
  const relatedArticles = [...matchingPosts, ...otherPosts].slice(0, 3);

  const references = getReferences(guide.body);

  // Solo operator 사이트 — author 통일 (blog/[slug]와 동일 정책).
  const authorName = author && author !== "Kiwi Lunchbox Team" ? author : "Yong Jae Lee";

  // 사이트맵 lastmod와 같은 값 — lib/contentDates.ts
  const dateModified = lastModified(guide).toISOString();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.excerpt,
    // 로컬 실사진 경로(/assets/...)면 절대 URL로 변환 — JSON-LD image는 절대경로 권장.
    // blog/[slug]에는 이미 있던 처리인데 여기만 빠져 있었다 (2026-08-04).
    image: guide.image.startsWith("http") ? guide.image : `${BASE_URL}${guide.image}`,
    datePublished: new Date(guide.date).toISOString(),
    dateModified,
    author: {
      "@type": "Person",
      name: authorName,
      url: `${BASE_URL}/en/about`,
    },
    publisher: {
      "@type": "Organization",
      name: "Kiwi Lunchbox",
      url: BASE_URL,
      logo: { "@type": "ImageObject", url: `${BASE_URL}/assets/kiwi_lunchbox_logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/${locale}/guides/${slug}` },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/${locale}` },
      { "@type": "ListItem", position: 2, name: "Guides", item: `${BASE_URL}/${locale}/guides` },
      { "@type": "ListItem", position: 3, name: guide.title, item: `${BASE_URL}/${locale}/guides/${slug}` },
    ],
  };

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumbLd]).replace(/</g, "\\u003c") }}
      />

      {/* Hero image */}
      <div className="relative h-64 md:h-96 w-full">
        <Image src={guide.image} alt={guide.title} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-[#314A37]/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <Link
            href={`/${locale}/guides`}
            className="min-h-touch inline-flex items-center px-2 -ml-2 text-xs text-white/90 hover:text-white mb-2 transition-colors"
          >
            ← {t("guides_back")}
          </Link>
          <span className="bg-primary-deep text-xs font-semibold px-3 py-1 rounded-full mb-4">
            {guide.category}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold max-w-3xl leading-tight mb-3">
            {guide.title}
          </h1>
          <p className="text-sm opacity-80">
            {guide.date} · {guide.readTime}
          </p>
        </div>
      </div>

      {/* Ad slot: leaderboard — top of content */}
      {SLOT_LEADERBOARD && (
        <div className="max-w-3xl mx-auto px-4 mt-4" aria-label="Advertisement">
          <AdUnit slot={SLOT_LEADERBOARD} format="horizontal" />
        </div>
      )}

      {/* Article */}
      <article className="max-w-3xl mx-auto bg-white rounded-3xl shadow px-8 py-10 mt-4 relative z-10">

        {/* Author byline — E-E-A-T signal */}
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-primary-deep flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {author.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#314A37]">{author}</p>
            <p className="text-xs text-gray-500">
              {t("blog_post_published")} {guide.date}
              {guide.lastReviewed && <> · {t("blog_post_reviewed")} {guide.lastReviewed}</>}
              {" · "}{guide.readTime}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("blog_post_reviewed_by")}{" "}
              <Link href={`/${locale}/about`} className="min-h-touch inline-flex items-center text-[#366A1B] hover:underline">
                {t("blog_post_editorial_team")}
              </Link>
              {" "}· {t("blog_post_content_follows")}{" "}
              <Link href="https://www.health.govt.nz/publications/food-and-nutrition-guidelines-for-healthy-children-and-young-people-aged-2-18-years-a-background" target="_blank" rel="noopener noreferrer" className="min-h-touch inline-flex items-center text-[#366A1B] hover:underline">
                {t("blog_post_nz_guidelines")}
              </Link>
            </p>
          </div>
          <Link
            href={`/${locale}/guides?category=${encodeURIComponent(guide.category)}`}
            className="min-h-touch inline-flex items-center text-xs text-[#366A1B] border border-[#78B159] rounded-full px-3 hover:bg-primary-deep hover:text-white transition-colors whitespace-nowrap flex-shrink-0"
          >
            {guide.category}
          </Link>
        </div>

        {/* Excerpt */}
        <p className="text-lg text-gray-500 leading-relaxed mb-8 border-l-4 border-[#78B159] pl-4">
          {guide.excerpt}
        </p>

        {/* Ad slot: mid-article rectangle */}
        {SLOT_RECTANGLE && (
          <div className="my-8" aria-label="Advertisement">
            <AdUnit slot={SLOT_RECTANGLE} format="rectangle" />
          </div>
        )}

        {/* Body */}
        {/* 🔴 2026-09-09 — 글과 같은 이유. 손으로 적은 금액은 스냅샷이라고 밝힌다. */}
        {guide.staticPrices && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 leading-relaxed">
            <strong>About the dollar figures in this guide.</strong> They are hand-checked
            snapshots, not the weekly tracked prices, and they are not updated when the index
            moves.{guide.lastReviewed ? ` This guide was last reviewed in ${guide.lastReviewed}.` : ""}{" "}
            For current figures use the{" "}
            <Link href={`/${locale}/price-index`} className="underline font-semibold">
              NZ Lunchbox Price Index
            </Link>
            , or the raw rows in{" "}
            <a href="/lunchbox-ingredients.csv" className="underline font-semibold">
              lunchbox-ingredients.csv
            </a>
            .
          </div>
        )}

        <div className="prose-like">{renderBody(guide.body)}</div>

        {/* References — auto-extracted from body links (E-E-A-T) */}
        {references.length > 0 && (
          <section className="mt-10 pt-6 border-t border-gray-100">
            <h2 className="text-sm font-bold text-[#314A37] uppercase tracking-wide mb-3">
              {t("blog_post_references")}
            </h2>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside leading-relaxed">
              {references.map((ref) => (
                <li key={ref.url}>
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#366A1B] hover:underline break-words"
                  >
                    {ref.text}
                  </a>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* E-E-A-T: editorial note */}
        <div className="mt-10 pt-6 border-t border-gray-100">
          <div className="bg-[#F7F9FC] rounded-2xl p-5">
            <p className="text-xs font-semibold text-[#314A37] uppercase tracking-wide mb-2">{t("blog_post_about_article")}</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {t("blog_post_about_desc")}{" "}
              <a href="https://www.health.govt.nz/publications/food-and-nutrition-guidelines-for-healthy-children-and-young-people-aged-2-18-years-a-background" target="_blank" rel="noopener noreferrer" className="min-h-touch inline-flex items-center text-[#366A1B] hover:underline">
                {t("blog_post_nz_eating_guidelines")}
              </a>
              . {t("blog_post_spot_error")}{" "}
              <Link href={`/${locale}/contact`} className="min-h-touch inline-flex items-center text-[#366A1B] hover:underline">
                {t("blog_post_contact_us")}
              </Link>
              .
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-gray-500">
              <span>{t("blog_post_published")} {guide.date}</span>
              {guide.lastReviewed && <span>{t("blog_post_last_reviewed")} {guide.lastReviewed}</span>}
              <Link href={`/${locale}/about`} className="min-h-touch inline-flex items-center text-[#366A1B] hover:underline">{t("blog_post_editorial_standards")}</Link>
              <Link href={`/${locale}/policies`} className="min-h-touch inline-flex items-center text-[#366A1B] hover:underline">{t("blog_post_privacy_disclaimer")}</Link>
            </div>
          </div>
        </div>

      </article>

      {/* Ad slot: after-article rectangle */}
      {SLOT_RECTANGLE && (
        <div className="max-w-3xl mx-auto px-4 my-8" aria-label="Advertisement">
          <AdUnit slot={SLOT_RECTANGLE} format="rectangle" />
        </div>
      )}

      {/* Related guides */}
      {relatedGuides.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-bold text-[#314A37] mb-6">
            {t("blog_post_more_articles", { category: guide.category })}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedGuides.map((related) => (
              <Link
                key={related.slug}
                href={`/${locale}/guides/${related.slug}`}
                className="bg-[#F7F9FC] rounded-3xl overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="relative h-36 overflow-hidden">
                  <Image
                    src={related.image}
                    alt={related.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 left-2 bg-primary-deep text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    {related.category}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-1">{related.date}</p>
                  <h3 className="text-sm font-bold text-[#314A37] leading-snug group-hover:text-[#366A1B] transition-colors line-clamp-2">
                    {related.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related blog articles — cross-type internal linking (E-E-A-T) */}
      {relatedArticles.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-bold text-[#314A37] mb-6">
            {t("blog_post_related_articles")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedArticles.map((p) => (
              <Link
                key={p.slug}
                href={`/${locale}/blog/${p.slug}`}
                className="bg-[#F7F9FC] rounded-3xl overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="relative h-36 overflow-hidden">
                  <Image
                    src={p.image}
                    alt={p.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 left-2 bg-primary-deep text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    {p.category}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-1">{p.date}</p>
                  <h3 className="text-sm font-bold text-[#314A37] leading-snug group-hover:text-[#366A1B] transition-colors line-clamp-2">
                    {p.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA + internal links */}
      <section className="bg-[#366A1B] py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-extrabold text-white mb-3">
            {t("blog_post_cta_title")}
          </h2>
          <p className="text-white/80 mb-8">
            {t("blog_post_cta_desc")}
          </p>
          <Link
            href={`/${locale}/planner`}
            className="inline-block bg-white hover:bg-[#F7F9FC] text-[#366A1B] font-bold px-10 py-4 rounded-full transition-colors shadow-lg mb-8"
          >
            {t("blog_post_cta_btn")}
          </Link>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white">
            <Link href={`/${locale}/guides`} className="min-h-touch min-w-touch inline-flex items-center justify-center px-2 hover:text-white transition-colors">{t("guides_all")}</Link>
            <Link href={`/${locale}/blog`} className="min-h-touch min-w-touch inline-flex items-center justify-center px-2 hover:text-white transition-colors">{t("nav_blog")}</Link>
            <Link href={`/${locale}/faq`} className="min-h-touch min-w-touch inline-flex items-center justify-center px-2 hover:text-white transition-colors">{t("blog_post_faqs")}</Link>
            <Link href={`/${locale}/about`} className="min-h-touch min-w-touch inline-flex items-center justify-center px-2 hover:text-white transition-colors">{t("blog_post_about_us")}</Link>
            <Link href={`/${locale}/contact`} className="min-h-touch min-w-touch inline-flex items-center justify-center px-2 hover:text-white transition-colors">{t("blog_post_contact")}</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer locale={locale} />
    </main>
  );
}
