import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

const SUPPORTED_LOCALES = ["en", "ko", "zh"];

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  image: string;
  category: string;
}

const POSTS: Post[] = [
  {
    slug: "5-healthy-lunchbox-ideas-for-nz-kids",
    title: "5 Healthy Lunchbox Ideas for Australian Kids",
    excerpt:
      "Struggling to come up with fresh lunchbox ideas every week? Here are five nutritious, kid-approved lunches using ingredients easily found at Woolworths or Coles.",
    date: "February 20, 2026",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
    category: "Recipes",
  },
  {
    slug: "nut-free-school-lunches-australia",
    title: "Nut-Free School Lunches: A Complete Guide for Australian Parents",
    excerpt:
      "Many Australian schools have nut-free policies. Discover how to pack safe, delicious lunches that comply with school rules without sacrificing nutrition or taste.",
    date: "February 15, 2026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80",
    category: "Allergy Friendly",
  },
  {
    slug: "gluten-free-lunchbox-tips",
    title: "Gluten-Free Lunchbox Tips That Kids Will Actually Eat",
    excerpt:
      "Going gluten-free doesn't mean boring lunches. Learn our top strategies for packing gluten-free school lunches that are satisfying, colourful, and easy to prepare.",
    date: "February 10, 2026",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
    category: "Allergy Friendly",
  },
  {
    slug: "budget-friendly-lunchbox-ideas",
    title: "Budget-Friendly Lunchbox Ideas Under $3 Per Meal",
    excerpt:
      "With grocery prices rising, we've put together practical lunchbox ideas that cost under $3 per serving — without cutting corners on nutrition.",
    date: "February 5, 2026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    category: "Budget",
  },
  {
    slug: "getting-kids-to-eat-healthy-lunches",
    title: "How to Get Picky Eaters to Enjoy Their Lunchbox",
    excerpt:
      "Does your child come home with an untouched lunchbox? We share tried-and-true strategies for encouraging picky eaters to actually enjoy their school lunches.",
    date: "January 28, 2026",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80",
    category: "Parenting Tips",
  },
];

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale)) notFound();

  return (
    <main className="min-h-screen bg-[#F5F7FA]">
      {/* Hero */}
      <section
        className="text-white text-center py-16 px-4"
        style={{ background: "linear-gradient(135deg, #314A37 0%, #78B159 100%)" }}
      >
        <h1 className="text-4xl font-bold mb-3">Lunchbox Tips & Ideas</h1>
        <p className="text-lg opacity-90 max-w-xl mx-auto">
          Practical advice, healthy recipes, and inspiration for Australian school lunches.
        </p>
      </section>

      {/* Posts grid */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {POSTS.map((post) => (
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
                <span className="absolute top-3 left-3 bg-[#78B159] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {post.category}
                </span>
              </div>
              <div className="p-6">
                <p className="text-xs text-gray-400 mb-2">
                  {post.date} · {post.readTime}
                </p>
                <h2 className="text-lg font-bold text-[#314A37] mb-2 leading-snug group-hover:text-[#78B159] transition-colors">
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
        <h2 className="text-2xl font-bold text-[#314A37] mb-3">
          Ready to Plan Your Week?
        </h2>
        <p className="text-gray-500 mb-6">
          Use our free planner to generate a week of healthy lunches in seconds.
        </p>
        <Link
          href={`/${locale}/planner`}
          className="inline-block bg-[#78B159] hover:bg-[#5d9040] text-white font-semibold px-8 py-3 rounded-full transition-colors"
        >
          Try the Planner →
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-[#314A37] text-white py-8 px-4 mt-8">
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
