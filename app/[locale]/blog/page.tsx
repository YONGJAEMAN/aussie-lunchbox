import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
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

  const categories = ["All", "Recipes", "Allergy Friendly", "Budget", "Nutrition", "Meal Prep", "Seasonal", "Parenting Tips", "Sustainability", "Gear & Tips"];

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#FFF8EE] pt-24 pb-16 px-4 text-center">
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest mb-4">The Blog</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          Lunchbox Tips & Ideas
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-2 leading-relaxed">
          Practical advice, healthy recipes, and inspiration for Australian school lunches.
        </p>
        <p className="text-sm text-gray-400 max-w-2xl mx-auto mb-10">
          18 guides covering recipes, allergy-safe meals, budget tips, and AU seasonal produce — written for Aussie families.
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
          Ready to Plan Your Week?
        </h2>
        <p className="text-white/80 mb-8 max-w-md mx-auto">
          Use our free planner to generate a week of healthy lunches in seconds.
        </p>
        <Link
          href={`/${locale}/planner`}
          className="inline-block bg-[#F5A623] hover:bg-white hover:text-[#7B3F00] text-white font-bold px-10 py-4 rounded-full transition-colors shadow-lg"
        >
          Try the Planner →
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
              <p className="text-gray-400 text-sm leading-relaxed">Free school lunch planner for Australian families.</p>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4">Product</p>
              <div className="space-y-3 text-gray-400 text-sm">
                <Link href={`/${locale}/planner`} className="block hover:text-white transition-colors">Planner</Link>
                <Link href={`/${locale}/blog`} className="block hover:text-white transition-colors">Blog</Link>
                <Link href={`/${locale}/faq`} className="block hover:text-white transition-colors">FAQ</Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4">Company</p>
              <div className="space-y-3 text-gray-400 text-sm">
                <Link href={`/${locale}/about`} className="block hover:text-white transition-colors">About</Link>
                <Link href={`/${locale}/contact`} className="block hover:text-white transition-colors">Contact</Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4">Legal</p>
              <div className="space-y-3 text-gray-400 text-sm">
                <Link href={`/${locale}/terms`} className="block hover:text-white transition-colors">Terms</Link>
                <Link href={`/${locale}/policies`} className="block hover:text-white transition-colors">Privacy</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Aussie Lunchbox — The Lunch Planner for Australian Families.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
