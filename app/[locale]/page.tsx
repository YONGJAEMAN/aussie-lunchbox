import Link from "next/link";
import Image from "next/image";
import { getLocale } from "next-intl/server";
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
        <h1 className="relative z-10 text-5xl font-bold text-white mb-4 drop-shadow-lg">Aussie Lunchbox</h1>
        <p className="relative z-10 text-xl text-white/90 mb-8 max-w-xl drop-shadow">Fresh Ideas for Happy Kids</p>
        <Link
          href={`/${locale}/planner`}
          className="relative z-10 bg-[#F5A623] hover:bg-white hover:text-[#7B3F00] text-white font-bold py-4 px-10 rounded-full text-lg transition-colors shadow-lg"
        >
          ✨ START PLANNING NOW ✨
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto py-16 px-4">
        <h2 className="text-3xl font-bold text-center text-[#7B3F00] mb-12">
          🌟 Why Aussie Lunchbox?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: "🍱", title: "Nutritious Menus", desc: "Balanced meals approved by nutrition guidelines." },
            { icon: "🛒", title: "Smart Shopping", desc: "Auto-generated shopping lists with smooth categorization." },
            { icon: "⏱️", title: "Save Time", desc: "Plan your entire week of lunches in under 1 minute." },
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
          <h2 className="text-3xl font-bold text-center text-[#7B3F00] mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              { step: "1", title: "Set your filters", desc: "Choose allergy filters, excluded ingredients, or add fridge leftovers. Takes 30 seconds." },
              { step: "2", title: "Generate your plan", desc: "Get a balanced 5-day school lunch plan with recipes, ingredients, and estimated costs." },
              { step: "3", title: "Shop & pack with ease", desc: "Download a categorised shopping list as a PDF or email it to yourself." },
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
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Example weekly plan</p>
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
              <span className="text-gray-500">Est. weekly cost: <strong className="text-[#7B3F00]">~$12.40</strong></span>
              <Link
                href={`/${locale}/planner`}
                className="text-[#F5A623] font-semibold hover:underline"
              >
                Generate your own →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How AU Families Use It */}
      <section className="bg-[#FDFAF2] py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#7B3F00] mb-3">How Aussie Families Use It</h2>
          <p className="text-center text-gray-500 mb-10 max-w-xl mx-auto text-sm">Real use cases from parents planning school lunches across Australia.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "📅",
                title: "Sunday Evening, Done",
                desc: "Open the planner on Sunday, hit Generate, and you're sorted before the kids' bedtime. No Monday morning scramble, no forgotten lunchbox.",
              },
              {
                icon: "🚫🥜",
                title: "Allergy Filters That Actually Work",
                desc: "Select nut-free, dairy-free, gluten-free, or vegan — every meal in the generated plan respects your filters. No manual ingredient checking.",
              },
              {
                icon: "💵",
                title: "Under $3 Per Lunch",
                desc: "Woolworths and Coles price estimates are built in. See your full weekly lunchbox cost before you shop.",
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
          <h2 className="text-3xl font-bold text-[#7B3F00]">📖 Lunchbox Tips</h2>
          <Link
            href={`/${locale}/blog`}
            className="text-[#F5A623] text-sm font-semibold hover:underline"
          >
            View all articles →
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

      {/* Footer */}
      <footer className="bg-[#7B3F00] text-white py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm opacity-75">
            © {new Date().getFullYear()} Aussie Lunchbox — The Lunch Planner for Australian Families.
          </p>
          <div className="flex gap-6 text-sm opacity-75">
            <Link href={`/${locale}/blog`} className="hover:opacity-100">Blog</Link>
            <Link href={`/${locale}/faq`} className="hover:opacity-100">FAQ</Link>
            <Link href={`/${locale}/about`} className="hover:opacity-100">About</Link>
            <Link href={`/${locale}/contact`} className="hover:opacity-100">Contact</Link>
            <Link href={`/${locale}/terms`} className="hover:opacity-100">Terms</Link>
            <Link href={`/${locale}/policies`} className="hover:opacity-100">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
