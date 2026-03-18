import Link from "next/link";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";

const BASE_URL = "https://www.aussielunchbox.com.au";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const canonical = `${BASE_URL}/${locale}`;
  return {
    alternates: {
      canonical,
      languages: {
        en: `${BASE_URL}/en`,
        ko: `${BASE_URL}/ko`,
        "zh-CN": `${BASE_URL}/zh`,
      },
    },
    openGraph: { url: canonical },
  };
}

export default async function HomePage() {
  const locale = await getLocale();

  return (
    <main className="min-h-screen bg-[#FDFAF2]">
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

      {/* Testimonials */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#7B3F00] mb-8">
            💬 What Parents Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <blockquote className="bg-[#FFF4DE] p-6 rounded-xl text-gray-700 italic">
              &ldquo;This app saved my mornings! No more arguing about what to pack.&rdquo;
              <footer className="mt-2 font-bold text-[#7B3F00] not-italic">— Sarah J., Sydney</footer>
            </blockquote>
            <blockquote className="bg-[#FFF4DE] p-6 rounded-xl text-gray-700 italic">
              &ldquo;Love the shopping list feature. Makes Sunday groceries a breeze.&rdquo;
              <footer className="mt-2 font-bold text-[#7B3F00] not-italic">— Mike T., Melbourne</footer>
            </blockquote>
            <blockquote className="bg-[#FFF4DE] p-6 rounded-xl text-gray-700 italic">
              &ldquo;My daughter has a nut allergy and this planner makes it so easy to stay safe.&rdquo;
              <footer className="mt-2 font-bold text-[#7B3F00] not-italic">— Emma R., Brisbane</footer>
            </blockquote>
            <blockquote className="bg-[#FFF4DE] p-6 rounded-xl text-gray-700 italic">
              &ldquo;The price estimates help me keep the lunchbox budget under control every week.&rdquo;
              <footer className="mt-2 font-bold text-[#7B3F00] not-italic">— Lisa K., Perth</footer>
            </blockquote>
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
              slug: "5-healthy-lunchbox-ideas-for-nz-kids",
              title: "5 Healthy Lunchbox Ideas for Australian Kids",
              excerpt: "Quick, nutritious, and kid-approved meals using ingredients from Woolworths.",
              category: "Recipes",
            },
            {
              slug: "nut-free-school-lunches-new-zealand",
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
