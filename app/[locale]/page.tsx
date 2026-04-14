import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";

const BASE_URL = "https://www.aussielunchbox.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const canonical = `${BASE_URL}/${locale}`;
  return {
    title: "Aussie Lunchbox – Free School Lunch Planner for Australian Families",
    description:
      "Generate a personalised week of healthy Australian school lunches in seconds. Free planner with allergy filters, shopping list, and PDF export.",
    alternates: {
      canonical,
      languages: {
        en: `${BASE_URL}/en`,
        ko: `${BASE_URL}/ko`,
        "zh-CN": `${BASE_URL}/zh`,
      },
    },
    openGraph: {
      url: canonical,
      title: "Aussie Lunchbox – Free School Lunch Planner for Australian Families",
      description:
        "Generate a personalised week of healthy Australian school lunches in seconds.",
      images: [{ url: `${BASE_URL}/aussie_lunchbox_logo.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Aussie Lunchbox – Free School Lunch Planner for Australian Families",
      description:
        "Generate a personalised week of healthy Australian school lunches in seconds. Free planner with allergy filters, shopping list, and PDF export.",
      images: [`${BASE_URL}/aussie_lunchbox_logo.png`],
    },
  };
}

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getTranslations();

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Aussie Lunchbox",
    url: BASE_URL,
    description: "Free school lunch planner for Australian families.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${BASE_URL}/${locale}/blog?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <main className="min-h-screen bg-[#FDFAF2]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center py-32 px-4 overflow-hidden min-h-[480px]">
        <Image
          src="/assets/kiwi_lunchbox_hero_bg.png"
          alt="Aussie Lunchbox hero"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-[#7B3F00]/55" />
        <h1 className="relative z-10 text-5xl font-bold text-white mb-4 drop-shadow-lg">{t("home_hero_title")}</h1>
        <p className="relative z-10 text-xl text-white/90 mb-8 max-w-xl drop-shadow">{t("home_hero_subtitle")}</p>
        <Link
          href={`/${locale}/planner`}
          className="relative z-10 bg-[#F5A623] hover:bg-white hover:text-[#7B3F00] text-white font-bold py-4 px-10 rounded-full text-lg transition-colors shadow-lg"
        >
          {t("home_cta")}
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto py-16 px-4">
        <h2 className="text-3xl font-bold text-center text-[#7B3F00] mb-12">
          {t("home_why")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: "🍱", title: t("home_feat1_title"), desc: t("home_feat1_desc") },
            { icon: "🛒", title: t("home_feat2_title"), desc: t("home_feat2_desc") },
            { icon: "⏱️", title: t("home_feat3_title"), desc: t("home_feat3_desc") },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl shadow p-8 text-center hover:-translate-y-1 transition-transform"
            >
              <div className="text-5xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-[#7B3F00] text-xl mb-2">{f.title}</h3>
              <p className="text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#7B3F00] mb-12">{t("home_how_heading")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              { step: "1", title: t("home_step1_title"), desc: t("home_step1_desc") },
              { step: "2", title: t("home_step2_title"), desc: t("home_step2_desc") },
              { step: "3", title: t("home_step3_title"), desc: t("home_step3_desc") },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#F5A623] text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-bold text-[#7B3F00] text-lg mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Sample plan preview */}
          <div className="bg-[#FDFAF2] rounded-2xl p-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">{t("home_example_label")}</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { day: "Mon", menu: "Vegemite & Cheese Scrolls", cost: "$1.80", tag: "Baking" },
                { day: "Tue", menu: "Chicken Rice Paper Rolls", cost: "$2.80", tag: "Cold" },
                { day: "Wed", menu: "Pesto Pasta Salad", cost: "$2.10", tag: "Cold" },
                { day: "Thu", menu: "Mini Quiches", cost: "$2.50", tag: "Hot" },
                { day: "Fri", menu: "Homemade Sushi Rolls", cost: "$3.20", tag: "Cold" },
              ].map((d) => (
                <div key={d.day} className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <p className="text-xs font-bold text-[#F5A623] mb-1">{d.day}</p>
                  <p className="text-xs font-semibold text-[#7B3F00] leading-tight mb-2">{d.menu}</p>
                  <span className="text-xs bg-[#FFF4DE] text-[#7B3F00] px-2 py-0.5 rounded-full">{d.tag}</span>
                  <p className="text-xs font-bold text-gray-500 mt-1">{d.cost}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-500">{t("home_example_cost")} <strong className="text-[#7B3F00]">~$12.40</strong></span>
              <Link
                href={`/${locale}/planner`}
                className="text-[#F5A623] font-semibold hover:underline"
              >
                {t("home_example_generate")} →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How AU Families Use It */}
      <section className="bg-[#FDFAF2] py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#7B3F00] mb-3">{t("home_usecases_heading")}</h2>
          <p className="text-center text-gray-500 mb-10 max-w-xl mx-auto text-sm">{t("home_usecases_label")}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "📅",
                title: t("home_usecase1_title"),
                desc: t("home_usecase1_desc"),
              },
              {
                icon: "🚫🥜",
                title: t("home_usecase2_title"),
                desc: t("home_usecase2_desc"),
              },
              {
                icon: "💵",
                title: t("home_usecase3_title"),
                desc: t("home_usecase3_desc"),
              },
            ].map((card) => (
              <div key={card.title} className="bg-white rounded-2xl shadow p-8 text-center hover:-translate-y-1 transition-transform">
                <div className="text-5xl mb-4">{card.icon}</div>
                <h3 className="font-bold text-[#7B3F00] text-lg mb-2">{card.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog preview */}
      <section className="max-w-5xl mx-auto py-16 px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-[#7B3F00]">📖 {t("home_blog_heading")}</h2>
          <Link
            href={`/${locale}/blog`}
            className="text-[#F5A623] text-sm font-semibold hover:underline"
          >
            {t("home_blog_view_all")} →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              slug: "5-healthy-lunchbox-ideas-for-au-kids",
              title: "5 Healthy Lunchbox Ideas for Australian Kids",
              excerpt: "Quick, nutritious, and kid-approved meals using ingredients from Woolworths.",
              category: "Recipes",
            },
            {
              slug: "nut-free-school-lunches-australia",
              title: "Nut-Free School Lunches: A Complete Guide",
              excerpt: "How to pack safe, delicious lunches that comply with your school's nut-free policy.",
              category: "Allergy Friendly",
            },
            {
              slug: "budget-friendly-lunchbox-ideas",
              title: "Budget-Friendly Lunchbox Ideas Under $3",
              excerpt: "Practical and nutritious lunchbox ideas without breaking the budget.",
              category: "Budget",
            },
          ].map((post) => (
            <Link
              key={post.slug}
              href={`/${locale}/blog/${post.slug}`}
              className="bg-white rounded-2xl shadow p-6 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <span className="inline-block bg-[#FFF4DE] text-[#7B3F00] text-xs font-semibold px-3 py-1 rounded-full mb-3">
                {post.category}
              </span>
              <h3 className="font-bold text-[#7B3F00] mb-2 leading-snug">{post.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-[#FFF8EE] py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[#F5A623] text-sm font-semibold uppercase tracking-widest mb-3">{t("home_testimonials_label")}</p>
          <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-12">{t("home_testimonials_heading")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { text: t("home_testimonial1_text"), name: t("home_testimonial1_name") },
              { text: t("home_testimonial2_text"), name: t("home_testimonial2_name") },
              { text: t("home_testimonial3_text"), name: t("home_testimonial3_name") },
            ].map((item) => (
              <div key={item.name} className="bg-white rounded-3xl p-8 text-left shadow-sm">
                <p className="text-gray-600 text-sm leading-relaxed mb-4">&ldquo;{item.text}&rdquo;</p>
                <p className="text-sm font-semibold text-[#7B3F00]">— {item.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Nutrition Commitment ── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto bg-[#FFF4DE] rounded-3xl p-10 md:p-14 text-center">
          <p className="text-[#F5A623] text-sm font-semibold uppercase tracking-widest mb-3">{t("home_commitment_label")}</p>
          <h2 className="text-3xl font-extrabold text-[#7B3F00] mb-4">{t("home_commitment_heading")}</h2>
          <p className="text-gray-600 leading-relaxed mb-6 max-w-2xl mx-auto">
            {t("home_commitment_desc")}
          </p>
          <Link href={`/${locale}/about`} className="text-[#7B3F00] font-semibold text-sm hover:underline">
            {t("home_commitment_link")}
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#7B3F00] py-16 px-4 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">{t("home_cta_heading")}</h2>
        <p className="text-white/80 mb-8 max-w-xl mx-auto">{t("home_cta_desc")}</p>
        <Link
          href={`/${locale}/planner`}
          className="bg-[#F5A623] hover:bg-white hover:text-[#7B3F00] text-white font-bold py-4 px-10 rounded-full text-lg transition-colors shadow-lg inline-block"
        >
          {t("home_start_planning")}
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
                <Link href={`/${locale}/guides`} className="block hover:text-white transition-colors">{t("nav_guides")}</Link>
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
