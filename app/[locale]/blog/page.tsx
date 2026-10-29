import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BLOG_CARDS } from "@/content/posts";
import { GUIDE_CARDS } from "@/content/guides";
import { BRAND } from "@/lib/brand";
import { POST_COUNT, GUIDE_COUNT, BLOG_PAGE_CARD_COUNT } from "@/lib/siteCounts";
import { buildPageMetadata } from "@/lib/seo/pageMetadata";
import Footer from "@/components/Footer";
import CategoryFilter from "@/components/CategoryFilter";

const SUPPORTED_LOCALES: string[] = [...BRAND.LOCALES];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    path: "/blog",
    locale,
    title: "Lunchbox Tips & Recipes Blog | Aussie Lunchbox",
    description:
      "Practical lunchbox tips, NZ-friendly recipes, allergy guides, and budget ideas for New Zealand school families.",
  });
}


export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale)) notFound();

  const t = await getTranslations();

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#F7F9FC] pt-24 pb-16 px-4 text-center">
        <p className="text-[#366A1B] font-semibold text-sm uppercase tracking-widest mb-4">{t("blog_section_label")}</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          {t("blog_title")}
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-2 leading-relaxed">
          {t("blog_subtitle")}
        </p>
        <p className="text-sm text-gray-500 max-w-2xl mx-auto mb-10">
          {t("blog_count", {
            posts: POST_COUNT,
            guides: GUIDE_COUNT,
            total: BLOG_PAGE_CARD_COUNT,
          })}
        </p>
      </section>

      {/* Category filter + posts grid */}
      <CategoryFilter items={BLOG_CARDS} allLabel={t("blog_cat_all")} basePath={`/${locale}/blog`} />

      {/*
        허브가 카드 그리드뿐이라 고유 텍스트가 없었고 /guides로 나가는 링크도 없었다.
        GSC에서 이 페이지는 "크롤링됨 - 색인 생성되지 않음"에 걸려 있다(2026-08-04 확인).
        가이드 8편은 sitemap에만 있고 블로그 쪽에서 들어가는 경로가 없어 크롤 도달도 얕았다.
        본문은 영어 고정 — 이 사이트의 기사 콘텐츠는 전부 영어이고 /ko·/zh는 /en으로 리다이렉트된다.
      */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="border-t border-gray-200 pt-16">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#1a1a1a] mb-3">
            Longer reference guides
          </h2>
          <p className="text-gray-500 leading-relaxed max-w-2xl mb-2">
            The posts above are single topics — one week&apos;s ideas, one comparison, one
            problem. The guides below are the reference material behind them: longer pieces
            we revisit and re-date as NZ prices, school policies and supermarket ranges
            change.
          </p>
          <p className="text-gray-500 leading-relaxed max-w-2xl mb-10">
            Read a post when you need something for tomorrow morning. Read a guide when you
            want to understand how the whole thing fits together.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {GUIDE_CARDS.map((guide) => (
              <Link
                key={guide.slug}
                href={`/${locale}/guides/${guide.slug}`}
                className="block bg-[#F7F9FC] rounded-2xl p-5 hover:shadow-md transition-shadow group"
              >
                <p className="text-xs text-[#366A1B] font-semibold uppercase tracking-wide mb-1">
                  {guide.category} · {guide.readTime}
                </p>
                <h3 className="font-bold text-[#1a1a1a] leading-snug group-hover:text-[#366A1B] transition-colors">
                  {guide.title}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#366A1B] py-20 px-4 text-center">
        <h2 className="text-3xl font-extrabold text-white mb-3">
          {t("blog_cta_title")}
        </h2>
        <p className="text-white/80 mb-8 max-w-md mx-auto">
          {t("blog_cta_desc")}
        </p>
        <Link
          href={`/${locale}/planner`}
          className="inline-block bg-white hover:bg-[#F7F9FC] text-[#366A1B] font-bold px-10 py-4 rounded-full transition-colors shadow-lg"
        >
          {t("blog_cta_btn")}
        </Link>
      </section>

      {/* Footer */}
      <Footer locale={locale} />
    </main>
  );
}
