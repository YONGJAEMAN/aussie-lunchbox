import Link from "next/link";
import { lastModified } from "@/lib/contentDates";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { POSTS, BLOG_CARDS } from "@/content/posts";
import { GUIDE_CARDS } from "@/content/guides";
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
  return Object.keys(POSTS).flatMap((slug) =>
    ["en", "ko", "zh"].map((locale) => ({ locale, slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = POSTS[slug];
  if (!post) return {};

  const canonical = `${BASE_URL}/${locale}/blog/${slug}`;

  return {
    title: withBrand(post.seoTitle ?? post.title),
    description: post.excerpt,
    alternates: {
      canonical,
      // ko/zh hreflang은 AdSense 승인 단계에서 제거 (helper와 동일 정책).
      languages: {
        "x-default": `${BASE_URL}/en/blog/${slug}`,
        en: `${BASE_URL}/en/blog/${slug}`,
      },
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: new Date(post.date).toISOString(),
      url: canonical,
      images: [{ url: post.image, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [post.image],
    },
  };
}


export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = POSTS[slug];
  if (!post) notFound();

  const t = await getTranslations();
  const author = post.author ?? "Aussie Lunchbox Team";

  // Related posts: same category first, then fill from others
  const sameCat = BLOG_CARDS.filter(p => p.category === post.category && p.slug !== slug);
  const others = BLOG_CARDS.filter(p => p.slug !== slug && p.category !== post.category);
  const relatedPosts = [...sameCat, ...others].slice(0, 3);

  // Cross-type related guides: category match first, then fill
  const matchingGuides = GUIDE_CARDS.filter(g => g.category === post.category);
  const otherGuides = GUIDE_CARDS.filter(g => g.category !== post.category);
  const relatedGuides = [...matchingGuides, ...otherGuides].slice(0, 3);

  const references = getReferences(post.body);

  // Aussie Lunchbox는 solo operator 사이트. 글 author가 비어있거나 "team"이면
  // 운영자 본인(Yong Jae Lee)으로 통일 — About 페이지의 "solo operator" 톤과 일치시킴.
  // "Editorial Team" Organization은 사용 안 함 (실제 운영 구조와 모순되어 신뢰 신호 깎임).
  const authorName = author && author !== "Aussie Lunchbox Team" ? author : "Yong Jae Lee";

  // 사이트맵 lastmod와 같은 값 — lib/contentDates.ts
  const dateModified = lastModified(post).toISOString();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    // 로컬 실사진 경로(/assets/...)면 절대 URL로 변환 — JSON-LD image는 절대경로 권장
    image: post.image.startsWith("http") ? post.image : `${BASE_URL}${post.image}`,
    datePublished: new Date(post.date).toISOString(),
    dateModified,
    author: {
      "@type": "Person",
      name: authorName,
      url: `${BASE_URL}/en/about`,
    },
    publisher: {
      "@type": "Organization",
      name: "Aussie Lunchbox",
      url: BASE_URL,
      logo: { "@type": "ImageObject", url: `${BASE_URL}/assets/kiwi_lunchbox_logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/${locale}/blog/${slug}` },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/${locale}` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/${locale}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${BASE_URL}/${locale}/blog/${slug}` },
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
        <Image src={post.image} alt={post.title} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-[#6B3600]/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <Link
            href={`/${locale}/blog`}
            className="min-h-touch inline-flex items-center px-2 -ml-2 text-xs text-white/90 hover:text-white mb-2 transition-colors"
          >
            ← {t("blog_post_back")}
          </Link>
          <span className="bg-primary-deep text-xs font-semibold px-3 py-1 rounded-full mb-4">
            {post.category}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold max-w-3xl leading-tight mb-3">
            {post.title}
          </h1>
          <p className="text-sm opacity-80">
            {post.date} · {post.readTime}
          </p>
        </div>
      </div>

      {/* 실사진 캡션 — 운영자 직접 촬영 증거 (있을 때만) */}
      {post.imageCaption && (
        <p className="max-w-3xl mx-auto px-4 mt-3 text-xs text-gray-500 italic text-center leading-relaxed">
          📷 {post.imageCaption}
        </p>
      )}

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
            <p className="text-sm font-semibold text-[#6B3600]">{author}</p>
            <p className="text-xs text-gray-500">
              {t("blog_post_published")} {post.date}
              {post.lastReviewed && <> · {t("blog_post_reviewed")} {post.lastReviewed}</>}
              {" · "}{post.readTime}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("blog_post_reviewed_by")}{" "}
              <Link href={`/${locale}/about`} className="min-h-touch inline-flex items-center text-[#8C4A00] hover:underline">
                {t("blog_post_editorial_team")}
              </Link>
              {" "}· {t("blog_post_content_follows")}{" "}
              <Link href="https://www.health.govt.nz/publications/food-and-nutrition-guidelines-for-healthy-children-and-young-people-aged-2-18-years-a-background" target="_blank" rel="noopener noreferrer" className="min-h-touch inline-flex items-center text-[#8C4A00] hover:underline">
                {t("blog_post_nz_guidelines")}
              </Link>
            </p>
          </div>
          <Link
            href={`/${locale}/blog?category=${encodeURIComponent(post.category)}`}
            className="min-h-touch inline-flex items-center text-xs text-[#8C4A00] border border-[#F5A623] rounded-full px-3 hover:bg-primary-deep hover:text-white transition-colors whitespace-nowrap flex-shrink-0"
          >
            {post.category}
          </Link>
        </div>

        {/* Excerpt */}
        <p className="text-lg text-gray-500 leading-relaxed mb-8 border-l-4 border-[#F5A623] pl-4">
          {post.excerpt}
        </p>

        {/* Ad slot: mid-article rectangle */}
        {SLOT_RECTANGLE && (
          <div className="my-8" aria-label="Advertisement">
            <AdUnit slot={SLOT_RECTANGLE} format="rectangle" />
          </div>
        )}

        {/* 🔴 2026-09-09 전수 조사 — 글 10편에 손으로 적은 금액이 611개 있는데
            언제 읽은 값인지 밝힌 건 한 편뿐이었다. 주간 추적가는 매주 움직이므로
            날짜 없는 금액은 시간이 지나면 반드시 지수와 어긋난다.
            🔴 금액을 고쳐 적지 않는다 — 언제 잰 값인지 모르는 채로 새 숫자를 넣으면
               그게 더 나쁘다. 무엇인지 밝히고 지금 값으로 가는 길을 준다. */}
        {post.staticPrices && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 leading-relaxed">
            <strong>About the dollar figures in this article.</strong> They were written into
            the text by hand, not taken from the weekly tracked prices, and they are not updated when prices
            move.{post.lastReviewed ? ` This article was last reviewed in ${post.lastReviewed}.` : ""}{" "}
            For current figures, generate a plan in the{" "}
            <Link href={`/${locale}/planner`} className="underline font-semibold">
              planner
            </Link>
            , which prices each ingredient from the weekly Woolworths Australia cache.
          </div>
        )}

        {/* Body */}
        <div className="prose-like">{renderBody(post.body)}</div>

        {/* References — auto-extracted from body links (E-E-A-T) */}
        {references.length > 0 && (
          <section className="mt-10 pt-6 border-t border-gray-100">
            <h2 className="text-sm font-bold text-[#6B3600] uppercase tracking-wide mb-3">
              {t("blog_post_references")}
            </h2>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside leading-relaxed">
              {references.map((ref) => (
                <li key={ref.url}>
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#8C4A00] hover:underline break-words"
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
            <p className="text-xs font-semibold text-[#6B3600] uppercase tracking-wide mb-2">{t("blog_post_about_article")}</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {t("blog_post_about_desc")}{" "}
              <a href="https://www.health.govt.nz/publications/food-and-nutrition-guidelines-for-healthy-children-and-young-people-aged-2-18-years-a-background" target="_blank" rel="noopener noreferrer" className="min-h-touch inline-flex items-center text-[#8C4A00] hover:underline">
                {t("blog_post_nz_eating_guidelines")}
              </a>
              . {t("blog_post_spot_error")}{" "}
              <Link href={`/${locale}/contact`} className="min-h-touch inline-flex items-center text-[#8C4A00] hover:underline">
                {t("blog_post_contact_us")}
              </Link>
              .
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-gray-500">
              <span>{t("blog_post_published")} {post.date}</span>
              {post.lastReviewed && <span>{t("blog_post_last_reviewed")} {post.lastReviewed}</span>}
              <Link href={`/${locale}/about`} className="min-h-touch inline-flex items-center text-[#8C4A00] hover:underline">{t("blog_post_editorial_standards")}</Link>
              <Link href={`/${locale}/policies`} className="min-h-touch inline-flex items-center text-[#8C4A00] hover:underline">{t("blog_post_privacy_disclaimer")}</Link>
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

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-bold text-[#6B3600] mb-6">
            {t("blog_post_more_articles", { category: post.category })}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPosts.map((related) => (
              <Link
                key={related.slug}
                href={`/${locale}/blog/${related.slug}`}
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
                  <h3 className="text-sm font-bold text-[#6B3600] leading-snug group-hover:text-[#8C4A00] transition-colors line-clamp-2">
                    {related.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related guides — cross-type internal linking (E-E-A-T) */}
      {relatedGuides.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-bold text-[#6B3600] mb-6">
            {t("blog_post_related_guides")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedGuides.map((g) => (
              <Link
                key={g.slug}
                href={`/${locale}/guides/${g.slug}`}
                className="bg-[#F7F9FC] rounded-3xl overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="relative h-36 overflow-hidden">
                  <Image
                    src={g.image}
                    alt={g.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 left-2 bg-[#8C4A00] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    {g.category}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-1">{g.date}</p>
                  <h3 className="text-sm font-bold text-[#6B3600] leading-snug group-hover:text-[#8C4A00] transition-colors line-clamp-2">
                    {g.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA + internal links */}
      <section className="bg-[#8C4A00] py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-extrabold text-white mb-3">
            {t("blog_post_cta_title")}
          </h2>
          <p className="text-white/80 mb-8">
            {t("blog_post_cta_desc")}
          </p>
          <Link
            href={`/${locale}/planner`}
            className="inline-block bg-white hover:bg-[#F7F9FC] text-[#8C4A00] font-bold px-10 py-4 rounded-full transition-colors shadow-lg mb-8"
          >
            {t("blog_post_cta_btn")}
          </Link>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white">
            <Link href={`/${locale}/blog`} className="min-h-touch min-w-touch inline-flex items-center justify-center px-2 hover:text-white transition-colors">{t("blog_post_all_articles")}</Link>
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
