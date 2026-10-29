import Link from "next/link";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Calendar, Leaf, ShoppingCart, Tag, ArrowRight, Play, ChevronRight } from "lucide-react";
import Footer from "@/components/Footer";
import { POST_COUNT, GUIDE_COUNT } from "@/lib/siteCounts";
import { exampleWeekRows, exampleWeekTotal, portionExample } from "@/lib/servePrice";

const BASE_URL = "https://www.kiwilunchbox.co.nz";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const canonical = `${BASE_URL}/${locale}`;
  return {
    title: "Kiwi Lunchbox – Free School Lunch Planner for NZ Families",
    description:
      "Generate a personalised week of healthy New Zealand school lunches in seconds. Free planner with allergy filters, shopping list, and PDF export.",
    alternates: {
      canonical,
      // ko/zh hreflang은 AdSense 승인 단계에서 제거 (helper와 동일 정책).
      languages: {
        "x-default": `${BASE_URL}/en`,
        en: `${BASE_URL}/en`,
      },
    },
    openGraph: {
      url: canonical,
      title: "Kiwi Lunchbox – Free School Lunch Planner for NZ Families",
      description:
        "Generate a personalised week of healthy New Zealand school lunches in seconds.",
      images: [{ url: `${BASE_URL}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Kiwi Lunchbox – Free School Lunch Planner for NZ Families",
      description:
        "Generate a personalised week of healthy New Zealand school lunches in seconds. Free planner with allergy filters, shopping list, and PDF export.",
      images: [`${BASE_URL}/opengraph-image`],
    },
  };
}

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getTranslations();

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Kiwi Lunchbox",
    url: BASE_URL,
    description: "Free school lunch planner for New Zealand families.",
    potentialAction: {
      "@type": "SearchAction",
      // 🔴 09-29: `/blog?q=`였다 — 블로그 페이지는 q를 안 읽는다. q를 처리하는 것은 /search다.
      target: `${BASE_URL}/${locale}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }}
      />

      {/* ── Hero ── */}
      <section className="bg-[#F7F9FC] pt-10 pb-0 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left */}
          <div className="py-12 md:py-20">
            <span className="inline-flex items-center gap-2 bg-[#E8F5E9] text-[#366A1B] text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
              <Leaf size={13} />
              {t("home_badge_free")}
            </span>
            <h1 className="text-5xl md:text-6xl font-extrabold text-[#1a1a1a] leading-[1.1] mb-6">
              {t("home_heading_line1")}{" "}
              <em className="not-italic text-[#366A1B]">{t("home_heading_highlight")}</em>
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-md">
              {t("home_hero_desc")}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={`/${locale}/planner`}
                className="inline-flex items-center gap-2 bg-[#366A1B] hover:bg-primary-deep text-white font-bold py-4 px-8 rounded-full text-base transition-colors shadow-lg"
              >
                {t("home_start_planning")}
                <ArrowRight size={18} />
              </Link>
              <Link
                href={`/${locale}/blog`}
                className="min-h-touch inline-flex items-center gap-2 text-[#366A1B] font-semibold text-base hover:gap-3 transition-all"
              >
                <span className="w-9 h-9 rounded-full border-2 border-[#366A1B] flex items-center justify-center">
                  <Play size={14} fill="#366A1B" />
                </span>
                {t("home_see_tips")}
              </Link>
            </div>
            {/* Trust badges */}
            <div className="flex flex-wrap gap-6 mt-10 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">✅ {t("home_trust_free")}</span>
              <span className="flex items-center gap-1.5">🥜 {t("home_trust_allergy")}</span>
              <span className="flex items-center gap-1.5">📄 {t("home_trust_pdf")}</span>
              <span className="flex items-center gap-1.5 text-[#366A1B] font-medium">🔖 {t("home_trust_sales")}</span>
            </div>
          </div>
          {/* Right — image */}
          <div className="relative h-[420px] md:h-[560px] rounded-t-3xl overflow-hidden self-end">
            <Image
              src="/assets/kiwi_hero_lunchbox.webp"
              alt="Fresh healthy lunchbox ingredients"
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 560px"
              priority
            />
            {/* Floating stat card */}
            <div className="absolute bottom-6 left-6 bg-white rounded-2xl shadow-xl px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E8F5E9] flex items-center justify-center text-xl">🍱</div>
              <div>
                <p className="text-xs text-gray-500">{t("home_stat_label")}</p>
                <p className="font-bold text-[#366A1B] text-sm">{t("home_stat_value")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto py-20 px-4">
        <div className="text-center mb-14">
          <p className="text-[#366A1B] text-sm font-semibold uppercase tracking-widest mb-3">{t("home_features_label")}</p>
          <h2 className="text-4xl font-extrabold text-[#1a1a1a]">{t("home_features_heading")}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: <Tag size={24} className="text-[#366A1B]" />,
              title: t("home_feat_sales_title"),
              desc: t("home_feat_sales_desc"),
              highlight: true,
            },
            {
              icon: <Calendar size={24} className="text-[#366A1B]" />,
              title: t("home_feat_scheduling_title"),
              desc: t("home_feat_scheduling_desc"),
            },
            {
              icon: <Leaf size={24} className="text-[#366A1B]" />,
              title: t("home_feat_nutrition_title"),
              desc: t("home_feat_nutrition_desc"),
            },
            {
              icon: <ShoppingCart size={24} className="text-[#366A1B]" />,
              title: t("home_feat_shopping_title"),
              desc: t("home_feat_shopping_desc"),
            },
          ].map((f) => (
            <div
              key={f.title}
              className={`rounded-3xl p-8 hover:shadow-md hover:-translate-y-1 transition-all ${
                f.highlight
                  ? "bg-[#F0F7E8] border border-[#78B159]/40"
                  : "bg-[#F7F9FC]"
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${
                f.highlight ? "bg-white" : "bg-[#E8F5E9]"
              }`}>
                {f.icon}
              </div>
              <h3 className="font-bold text-[#1a1a1a] text-lg mb-3">{f.title}</h3>
              {/* 이 카드는 배경이 두 가지다(#F0F7E8 / #F7F9FC). gray-500은 연초록 위에서
                  4.41:1로 4.5에 못 미친다 — 둘 다에서 통과하는 gray-600을 쓴다. */}
              <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-[#F7F9FC] py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#366A1B] text-sm font-semibold uppercase tracking-widest mb-3">{t("home_how_label")}</p>
            <h2 className="text-4xl font-extrabold text-[#1a1a1a]">{t("home_how_heading")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                title: t("home_step1_title"),
                desc: t("home_step1_desc"),
                image: "/assets/kiwi_veggie_wrap.webp",
              },
              {
                num: "02",
                title: t("home_step2_title"),
                desc: t("home_step2_desc"),
                image: "/assets/kiwi_ham_salad_sandwich.webp",
              },
              {
                num: "03",
                title: t("home_step3_title"),
                desc: t("home_step3_desc"),
                image: "/assets/kiwi_yoghurt_fruit_box.webp",
              },
            ].map((s) => (
              <div key={s.num} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="relative h-44 overflow-hidden">
                  <Image
                    src={s.image}
                    alt={s.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 360px"
                  />
                  <span className="absolute top-4 left-4 text-5xl font-extrabold text-white/30 leading-none select-none">
                    {s.num}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-[#1a1a1a] text-lg mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Sample plan preview */}
          <div className="mt-12 bg-white rounded-3xl p-6 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-5">{t("home_example_label")}</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* 🔴 금액을 여기 손으로 적지 말 것. 2026-09-15까지 다섯 줄과 총액이 전부
                    리터럴이었고, 주간 크론이 가격을 갱신하는 동안 낡아 있었다
                    (Chicken Pesto Panini 한 줄만 8% 낮게 떠 있었다). 합계는 다섯 줄과
                    맞아 있어서 검산으로는 안 잡혔다. 이제 `lib/servePrice.ts`가 만든다.
                    금액 리터럴은 가드가 막는다 — 주석에도 적지 말 것. */}
              {exampleWeekRows().map((d) => (
                <div key={d.day} className="bg-[#F7F9FC] rounded-2xl p-3 text-center">
                  <p className="text-xs font-bold text-[#366A1B] mb-1">{d.day}</p>
                  <p className="text-xs font-semibold text-[#314A37] leading-tight mb-2">{d.menu}</p>
                  <span className="text-xs bg-[#E8F5E9] text-[#314A37] px-2 py-0.5 rounded-full">{d.tag}</span>
                  <p className="text-xs font-bold text-gray-500 mt-1">{d.cost}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-sm border-t border-gray-100 pt-4">
              <span className="text-gray-500">{t("home_example_cost")} <strong className="text-[#314A37]">~{exampleWeekTotal()}</strong></span>
              <Link href={`/${locale}/planner`} className="min-h-touch inline-flex items-center gap-1 text-[#366A1B] font-semibold hover:gap-2 transition-all text-sm">
                {t("home_example_generate")} <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── How NZ Families Use It ── */}
      <section className="max-w-6xl mx-auto py-20 px-4">
        <div className="text-center mb-14">
          <p className="text-[#366A1B] text-sm font-semibold uppercase tracking-widest mb-3">{t("home_usecases_label")}</p>
          <h2 className="text-4xl font-extrabold text-[#1a1a1a]">{t("home_usecases_heading")}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <div key={card.title} className="bg-[#F7F9FC] rounded-3xl p-8 hover:-translate-y-1 transition-transform">
              <div className="text-4xl mb-5">{card.icon}</div>
              <h3 className="font-bold text-[#1a1a1a] text-lg mb-3">{card.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why I Built This ── */}
      <section className="bg-[#F7F9FC] py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[#366A1B] text-sm font-semibold uppercase tracking-widest mb-3">The Story</p>
          <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-12">Why I Built This</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: "📅", text: "I was spending 15 minutes every night deciding what to pack — now it takes about five." },
              { icon: "🛒", text: "I wanted one shopping list for the whole week, not five separate mental notes." },
              { icon: "💡", text: "No app existed that used real NZ supermarket ingredients and prices. So I made one." },
            ].map((item) => (
              <div key={item.icon} className="bg-white rounded-3xl p-8 text-left shadow-sm">
                <div className="text-3xl mb-4">{item.icon}</div>
                <p className="text-gray-600 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-8">
            — Yong Jae Lee, Senior Product Designer, Auckland
          </p>
        </div>
      </section>

      {/* ── Price Index Banner ── */}
      <section className="py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href={`/${locale}/price-index`}
            className="block bg-[#F7F9FC] border border-gray-200 rounded-3xl p-8 md:p-10 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#366A1B] text-xs font-semibold uppercase tracking-widest mb-2">Original Data</p>
                <h3 className="text-xl md:text-2xl font-extrabold text-[#1a1a1a] mb-2">NZ Lunchbox Price Index</h3>
                {/*
                  ⚠️ 예전엔 이 줄이 Pak'nSave 열을 매달 실사한다고 말했다. 사실이 아니었다 —
                  Woolworths 열은 주간 자동 갱신이지만 Pak'nSave 열은 매장에 직접
                  가야 해서 2026-05-16 이후 멈춰 있었다(85일). 사이트의 대표 자산을
                  소개하는 문장이 거짓이면 그게 가장 비싸다. 실제 동작대로 고쳤다.
                */}
                {/* 🔴 09-29: 「both」 — 지수에는 New World 열도 있다(대부분 행). 전 품목을 싣는 것은 두 열뿐이라 그렇게 나눠 말한다. */}
                <p className="text-gray-500 text-sm">20 staples tracked every week at Woolworths and Pak&apos;nSave Ormiston, with New World Ormiston alongside on most of them, all read from each chain&apos;s own online shop &mdash; specials are left out, and any row whose price is older than the rest says so.</p>
              </div>
              <ChevronRight size={24} className="text-[#366A1B] group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </Link>
        </div>
      </section>

      {/* ── Nutrition Commitment ── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto bg-[#E8F5E9] rounded-3xl p-10 md:p-14 text-center">
          <p className="text-[#366A1B] text-sm font-semibold uppercase tracking-widest mb-3">{t("home_commitment_label")}</p>
          <h2 className="text-3xl font-extrabold text-[#314A37] mb-4">{t("home_commitment_heading")}</h2>
          <p className="text-gray-600 leading-relaxed mb-6 max-w-2xl mx-auto">
            {t("home_commitment_desc")}
          </p>
          <Link href={`/${locale}/about`} className="min-h-touch inline-flex items-center text-[#366A1B] font-semibold text-sm hover:underline">
            {t("home_commitment_link")}
          </Link>
        </div>
      </section>

      {/* ── Editorial / Blog ── */}
      <section className="bg-[#F7F9FC] py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-[#366A1B] text-sm font-semibold uppercase tracking-widest mb-2">{t("home_blog_label")}</p>
              <h2 className="text-3xl font-extrabold text-[#1a1a1a]">📖 {t("home_blog_heading")}</h2>
            </div>
            <Link href={`/${locale}/blog`} className="min-h-touch inline-flex items-center gap-1 text-[#366A1B] font-semibold text-sm hover:gap-2 transition-all">
              {t("home_blog_view_all")} <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                slug: "easy-wraps-for-school-lunches-nz",
                title: "Easy Wraps & Rolls for NZ School Lunches",
                excerpt: "Quick, versatile wrap ideas using ingredients from Woolworths and Pak'nSave.",
                category: "Recipes",
                image: "/assets/kiwi_shredded_chicken_wrap.webp",
              },
              {
                slug: "nut-free-school-lunches-new-zealand",
                title: "Nut-Free School Lunches & Snacks: A Guide",
                excerpt: "How to pack safe lunches and snacks that comply with your school's nut-free policy.",
                category: "Allergy Friendly",
                image: "/assets/kiwi_marmite_cheese_sandwich.webp",
              },
              {
                slug: "budget-friendly-lunchbox-ideas-nz",
                title: "Budget-Friendly Lunchbox Ideas Under $3",
                excerpt: "Practical and nutritious lunchbox ideas without breaking the budget.",
                category: "Budget",
                image: "/assets/kiwi_cheese_cracker_box.webp",
              },
            ].map((post) => (
              <Link
                key={post.slug}
                href={`/${locale}/blog/${post.slug}`}
                className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, 360px"
                  />
                  <span className="absolute top-3 left-3 bg-[#366A1B] text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {post.category}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-[#1a1a1a] mb-2 leading-snug group-hover:text-[#366A1B] transition-colors">{post.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto bg-[#366A1B] rounded-3xl px-8 py-16 text-center relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#78B159]/20 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-[#78B159]/10 pointer-events-none" />
          <p className="relative text-[#a8d98c] text-sm font-semibold uppercase tracking-widest mb-4">{t("home_cta_label")}</p>
          <h2 className="relative text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight whitespace-pre-line">
            {t("home_cta_heading")}
          </h2>
          <p className="relative text-white/90 mb-8 max-w-md mx-auto">
            {t("home_cta_desc")}
          </p>
          <Link
            href={`/${locale}/planner`}
            className="relative inline-flex items-center gap-2 bg-white text-[#366A1B] font-bold py-4 px-10 rounded-full text-lg hover:bg-[#E8F5E9] transition-colors shadow-lg"
          >
            {t("home_start_planning")}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── NZ School Lunchbox Guide ── */}
      <section className="bg-[#F7F9FC] py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-[#366A1B] text-sm font-semibold uppercase tracking-widest mb-3">{t("home_guide_label")}</p>
          <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-8">{t("home_guide_heading")}</h2>

          <div className="space-y-8 text-gray-600 leading-relaxed">
            <div>
              <h3 className="text-xl font-bold text-[#314A37] mb-3">{t("home_guide_rules_h")}</h3>
              <p className="mb-3">{t("home_guide_rules_p1")}</p>
              <p>{t("home_guide_rules_p2")}</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#314A37] mb-3">{t("home_guide_seasonal_h")}</h3>
              <p className="mb-3">{t("home_guide_seasonal_p1")}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-white rounded-xl p-4">
                  <p className="font-bold text-[#314A37] text-sm mb-1">{t("home_guide_term1")}</p>
                  <p className="text-sm text-gray-500">{t("home_guide_term1_desc")}</p>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <p className="font-bold text-[#314A37] text-sm mb-1">{t("home_guide_term2")}</p>
                  <p className="text-sm text-gray-500">{t("home_guide_term2_desc")}</p>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <p className="font-bold text-[#314A37] text-sm mb-1">{t("home_guide_term3")}</p>
                  <p className="text-sm text-gray-500">{t("home_guide_term3_desc")}</p>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <p className="font-bold text-[#314A37] text-sm mb-1">{t("home_guide_term4")}</p>
                  <p className="text-sm text-gray-500">{t("home_guide_term4_desc")}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#314A37] mb-3">{t("home_guide_nutrition_h")}</h3>
              <p className="mb-3">{t("home_guide_nutrition_p1")}</p>
              <p>{t("home_guide_nutrition_p2")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Get the Most from Kiwi Lunchbox ── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-[#366A1B] text-sm font-semibold uppercase tracking-widest mb-3">{t("home_tips_label")}</p>
          <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-8">{t("home_tips_heading")}</h2>

          <div className="space-y-8 text-gray-600 leading-relaxed">
            <div>
              <h3 className="text-xl font-bold text-[#314A37] mb-3">{t("home_tips_prep_h")}</h3>
              <p>{t("home_tips_prep_p")}</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#314A37] mb-3">{t("home_tips_combo_h")}</h3>
              <p>{t("home_tips_combo_p", { posts: POST_COUNT, guides: GUIDE_COUNT })}</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#314A37] mb-3">{t("home_tips_allergy_h")}</h3>
              <p>{t("home_tips_allergy_p")}</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#314A37] mb-3">{t("home_tips_price_h")}</h3>
              <p>
                {t("home_tips_price_p", {
                  cheesePack: portionExample().pack,
                  cheesePackPrice: portionExample().packPrice,
                  cheeseServes: portionExample().serves,
                  cheeseServe: portionExample().serve,
                })}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <Footer locale={locale} />
    </main>
  );
}
