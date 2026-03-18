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

  return (
    <main className="min-h-screen bg-[#FDFAF2]">
      {/* Hero */}
      <section
        className="text-white text-center py-16 px-4"
        style={{ background: "linear-gradient(135deg, #7B3F00 0%, #F5A623 100%)" }}
      >
        <h1 className="text-4xl font-bold mb-3">Lunchbox Tips & Ideas</h1>
        <p className="text-lg opacity-90 max-w-xl mx-auto">
          Practical advice, healthy recipes, and inspiration for Australian school lunches.
        </p>
      </section>

      {/* Posts grid */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {BLOG_CARDS.map((post) => (
            <Link
              key={post.slug}
              href={`/${locale}/blog/${post.slug}`}
              className="bg-white rounded-2xl shadow overflow-hidden hover:shadow-lg transition-shadow group"
            >
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 bg-[#F5A623] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {post.category}
                </span>
              </div>
              <div className="p-6">
                <p className="text-xs text-gray-400 mb-2">
                  {post.date} · {post.readTime}
                </p>
                <h2 className="text-lg font-bold text-[#7B3F00] mb-2 leading-snug group-hover:text-[#F5A623] transition-colors">
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
      <section className="bg-white border-t border-gray-100 py-12 px-4 text-center">
        <h2 className="text-2xl font-bold text-[#7B3F00] mb-3">
          Ready to Plan Your Week?
        </h2>
        <p className="text-gray-500 mb-6">
          Use our free planner to generate a week of healthy lunches in seconds.
        </p>
        <Link
          href={`/${locale}/planner`}
          className="inline-block bg-[#F5A623] hover:bg-[#D4850A] text-white font-semibold px-8 py-3 rounded-full transition-colors"
        >
          Try the Planner →
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-[#7B3F00] text-white py-8 px-4 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm opacity-75">
            © {new Date().getFullYear()} Aussie Lunchbox — The Lunch Planner for Australian Families.
          </p>
          <div className="flex gap-4 text-sm opacity-75">
            <Link href={`/${locale}/terms`} className="hover:opacity-100">Terms</Link>
            <Link href={`/${locale}/policies`} className="hover:opacity-100">Privacy</Link>
            <Link href={`/${locale}/contact`} className="hover:opacity-100">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
