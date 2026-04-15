import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GUIDE_CARDS } from "@/content/guides";
import { BRAND } from "@/lib/brand";

const BASE_URL = BRAND.SITE_URL;
const SUPPORTED_LOCALES: string[] = [...BRAND.LOCALES];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const canonical = `${BASE_URL}/${locale}/guides`;
  return {
    title: "Lunchbox Guides & Resources | Aussie Lunchbox",
    description: "In-depth guides for Australian school families — nutrition, allergies, budget planning, seasonal produce, food safety, and more.",
    alternates: {
      canonical,
      languages: {
        "x-default": `${BASE_URL}/en/guides`,
        en: `${BASE_URL}/en/guides`,
        ko: `${BASE_URL}/ko/guides`,
        "zh-CN": `${BASE_URL}/zh/guides`,
      },
    },
    openGraph: { url: canonical },
  };
}

export default async function GuidesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale)) notFound();

  const t = await getTranslations();

  const categories = [
    "All",
    "Nutrition",
    "Allergy Friendly",
    "Budget",
    "Seasonal",
    "Parenting Tips",
    "Gear & Tips",
    "Recipes",
  ];

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#FFF8EE] pt-24 pb-16 px-4 text-center">
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest mb-4">Resources</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          Lunchbox Guides & Resources
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-2 leading-relaxed">
          In-depth, expert-reviewed guides to help Australian families pack healthier, smarter school lunches.
        </p>
        <p className="text-sm text-gray-400 max-w-2xl mx-auto mb-10">
          {GUIDE_CARDS.length} comprehensive guides — updated regularly
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

      {/* Guides grid */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {GUIDE_CARDS.map((guide) => (
            <Link
              key={guide.slug}
              href={`/${locale}/guides/${guide.slug}`}
              className="bg-[#FFF8EE] rounded-3xl overflow-hidden hover:shadow-lg transition-shadow group"
            >
              <div className="relative h-48 overflow-hidden rounded-t-3xl">
                <Image
                  src={guide.image}
                  alt={guide.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 bg-[#7B3F00] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {guide.category}
                </span>
              </div>
              <div className="p-6">
                <p className="text-xs text-gray-400 mb-2">
                  {guide.date} · {guide.readTime}
                </p>
                <h2 className="text-lg font-bold text-[#1a1a1a] mb-2 leading-snug group-hover:text-[#F5A623] transition-colors">
                  {guide.title}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                  {guide.excerpt}
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
                <Link href={`/${locale}/guides`} className="block hover:text-white transition-colors">Guides</Link>
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
