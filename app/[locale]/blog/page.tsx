import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BLOG_CARDS } from "@/content/posts";
import { BRAND } from "@/lib/brand";

const BASE_URL = BRAND.SITE_URL;
const SUPPORTED_LOCALES: string[] = [...BRAND.LOCALES];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const canonical = `${BASE_URL}/${locale}/blog`;
  return {
    title: "Lunchbox Tips & Recipes Blog | Aussie Lunchbox",
    description: "Practical lunchbox tips, AU-friendly recipes, allergy guides, and budget ideas for Australian school families.",
    alternates: {
      canonical,
      languages: {
        en: `${BASE_URL}/en/blog`,
        ko: `${BASE_URL}/ko/blog`,
        "zh-CN": `${BASE_URL}/zh/blog`,
      },
    },
    openGraph: { url: canonical },
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale)) notFound();

  const t = await getTranslations();

  const categories = [
    t("blog_cat_all"),
    t("blog_cat_recipes"),
    t("blog_cat_allergy"),
    t("blog_cat_budget"),
    t("blog_cat_nutrition"),
    t("blog_cat_meal_prep"),
    t("blog_cat_seasonal"),
    t("blog_cat_parenting"),
    t("blog_cat_sustainability"),
    t("blog_cat_gear"),
  ];

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#FFF8EE] pt-24 pb-16 px-4 text-center">
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest mb-4">{t("blog_section_label")}</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          {t("blog_title")}
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-2 leading-relaxed">
          {t("blog_subtitle")}
        </p>
        <p className="text-sm text-gray-400 max-w-2xl mx-auto mb-10">
          {t("blog_count")}
        </p>
        {/* Category filter bar */}
        <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
          {categories.map((cat, i) => (
            <span
              key={cat}
              className={`px-4 py-1.5 rounded-full text-sm font-medium cursor-default select-none ${
                i === 0
                  ? "bg-[#7B3F00] text-white"
                  : "bg-white text-[#7B3F00] border border-orange-100"
              }`}
            >
              {cat}
            </span>
          ))}
        </div>
      </section>

      {/* Posts grid */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {BLOG_CARDS.map((post) => (
            <Link
              key={post.slug}
              href={`/${locale}/blog/${post.slug}`}
              className="bg-[#FFF8EE] rounded-3xl overflow-hidden hover:shadow-lg transition-shadow group"
            >
              <div className="relative h-48 overflow-hidden rounded-t-3xl">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 bg-[#7B3F00] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {post.category}
                </span>
              </div>
              <div className="p-6">
                <p className="text-xs text-gray-400 mb-2">
                  {post.date} · {post.readTime}
                </p>
                <h2 className="text-lg font-bold text-[#1a1a1a] mb-2 leading-snug group-hover:text-[#F5A623] transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                  {post.excerpt}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#7B3F00] py-20 px-4 text-center">
        <h2 className="text-3xl font-extrabold text-white mb-3">
          {t("blog_cta_title")}
        </h2>
        <p className="text-white/80 mb-8 max-w-md mx-auto">
          {t("blog_cta_desc")}
        </p>
        <Link
          href={`/${locale}/planner`}
          className="inline-block bg-[#F5A623] hover:bg-white hover:text-[#7B3F00] text-white font-bold px-10 py-4 rounded-full transition-colors shadow-lg"
        >
          {t("blog_cta_btn")}
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] text-white py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#F5A623] flex items-center justify-center">
                  <span className="text-white font-bold text-xs">AL</span>
                </div>
                <span className="font-bold">Aussie Lunchbox</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{t("footer_tagline")}</p>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4">{t("footer_product")}</p>
              <div className="space-y-3 text-gray-400 text-sm">
                <Link href={`/${locale}/planner`} className="block hover:text-white transition-colors">{t("nav_planner")}</Link>
                <Link href={`/${locale}/blog`} className="block hover:text-white transition-colors">{t("footer_blog")}</Link>
                <Link href={`/${locale}/faq`} className="block hover:text-white transition-colors">{t("footer_faq")}</Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4">{t("footer_company")}</p>
              <div className="space-y-3 text-gray-400 text-sm">
                <Link href={`/${locale}/about`} className="block hover:text-white transition-colors">{t("footer_about")}</Link>
                <Link href={`/${locale}/contact`} className="block hover:text-white transition-colors">{t("footer_contact")}</Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4">{t("footer_legal_label")}</p>
              <div className="space-y-3 text-gray-400 text-sm">
                <Link href={`/${locale}/terms`} className="block hover:text-white transition-colors">{t("footer_terms")}</Link>
                <Link href={`/${locale}/policies`} className="block hover:text-white transition-colors">{t("footer_privacy")}</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8">
            <p className="text-gray-500 text-sm">{t("footer_copyright", { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
