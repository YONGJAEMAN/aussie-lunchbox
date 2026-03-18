import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const BASE_URL = "https://www.aussielunchbox.com.au";
const SUPPORTED_LOCALES = ["en", "ko", "zh"];

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
    slug: "5-healthy-lunchbox-ideas-for-au-kids",
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
  {
    slug: "sunday-meal-prep-lunchbox-guide",
    title: "Sunday Meal Prep: Pack 5 School Lunches in 30 Minutes",
    excerpt:
      "Spending just 30 minutes on Sunday can mean stress-free school mornings all week. Here's our step-by-step guide to lunchbox meal prep for Australian families.",
    date: "January 20, 2026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
    category: "Meal Prep",
  },
  {
    slug: "dairy-free-school-lunches-australia",
    title: "Dairy-Free School Lunches Australian Kids Will Actually Eat",
    excerpt:
      "Whether your child has a dairy allergy or intolerance, packing a delicious, dairy-free lunchbox is easier than you think. Here are our top ideas using ingredients from Woolworths and Coles.",
    date: "January 14, 2026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80",
    category: "Allergy Friendly",
  },
  {
    slug: "vegetarian-lunchbox-ideas-australia",
    title: "10 Vegetarian Lunchbox Ideas for Australian School Kids",
    excerpt:
      "Going meat-free at lunchtime? These plant-based lunchbox ideas are protein-rich, filling, and totally kid-approved — perfect for vegetarian families across Australia.",
    date: "January 7, 2026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80",
    category: "Recipes",
  },
  {
    slug: "high-protein-lunchbox-ideas",
    title: "High-Protein Lunchbox Ideas for Active & Growing Kids",
    excerpt:
      "Active kids need more protein to fuel their bodies and support healthy growth. Discover easy, high-protein lunchbox ideas that keep kids energised through afternoon sport.",
    date: "December 30, 2025",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&q=80",
    category: "Nutrition",
  },
  {
    slug: "waste-free-lunchbox-guide-australia",
    title: "The Zero-Waste Lunchbox Guide for Australian Families",
    excerpt:
      "Australia generates thousands of tonnes of lunchbox waste each year. Here's how to pack a delicious, nutritious lunch with zero single-use plastic — and save money doing it.",
    date: "December 22, 2025",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
    category: "Sustainability",
  },
  {
    slug: "best-lunchbox-containers-australia",
    title: "Best Lunchbox Containers for Australian Schools in 2026",
    excerpt:
      "The right container keeps food fresh, prevents leaks, and makes packing easier. We've tested the most popular lunchbox containers available in Australia — here's what we found.",
    date: "December 15, 2025",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&q=80",
    category: "Gear & Tips",
  },
  {
    slug: "woolworths-vs-coles-lunchbox-budget",
    title: "Woolworths vs Coles: Which Is Cheaper for School Lunches?",
    excerpt:
      "We compared the price of a full week's worth of lunchbox ingredients at both major Australian supermarkets. The results might surprise you.",
    date: "December 8, 2025",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1583263086011-8d01b6b2b9c6?w=800&q=80",
    category: "Budget",
  },
  {
    slug: "rainbow-lunchbox-guide",
    title: "The Rainbow Lunchbox: How to Pack Every Colour",
    excerpt:
      "Eating a rainbow of colours ensures kids get a wide range of vitamins and minerals. Learn how to build a colourful, nutritious lunchbox that kids love to open.",
    date: "December 1, 2025",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&q=80",
    category: "Nutrition",
  },
  {
    slug: "thermos-hot-lunch-ideas-australia",
    title: "Thermos Lunch Ideas: Hot Meals for Cold Australian School Days",
    excerpt:
      "When the Melbourne cold snap hits or the Canberra frost arrives, a hot thermos lunch can be a game-changer. Here are our favourite warm lunchbox ideas for Australian winters.",
    date: "November 24, 2025",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80",
    category: "Recipes",
  },
  {
    slug: "multicultural-lunchbox-ideas-australia",
    title: "Multicultural Lunchbox Ideas Celebrating Australia's Diversity",
    excerpt:
      "Australia is one of the world's most multicultural nations. Celebrate our rich food culture with lunchbox ideas inspired by Indigenous, Asian, Mediterranean, and Pacific Island flavours.",
    date: "November 17, 2025",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
    category: "Recipes",
  },
  {
    slug: "lunchbox-ideas-by-age-australia",
    title: "Lunchbox Ideas by Age: From 5-Year-Olds to Teenagers",
    excerpt:
      "A 6-year-old and a 14-year-old have very different nutritional needs and taste preferences. Here's your complete age-by-age guide to packing the right lunchbox for every stage.",
    date: "November 10, 2025",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80",
    category: "Parenting Tips",
  },
  {
    slug: "summer-lunchbox-ideas-australia",
    title: "Summer Lunchbox Ideas for Hot Australian School Days",
    excerpt:
      "Australian summers can be brutal, and a warm lunchbox isn't appetising. Here's how to pack fresh, cool, and safe lunches that survive the heat and keep kids energised.",
    date: "November 3, 2025",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&q=80",
    category: "Seasonal",
  },
  {
    slug: "kids-make-own-lunchbox",
    title: "Let Kids Pack Their Own Lunchbox: A Practical Guide",
    excerpt:
      "When children help pack their own lunches, they're far more likely to actually eat them. Here's how to set up a simple lunchbox station that gives kids independence while keeping nutrition on track.",
    date: "October 27, 2025",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=800&q=80",
    category: "Parenting Tips",
  },
  {
    slug: "school-canteen-vs-packed-lunch",
    title: "School Canteen vs Packed Lunch: The Complete Comparison",
    excerpt:
      "Should you pack lunch every day or let your kids buy from the canteen? We break down the cost, nutrition, and convenience of both options to help Australian parents decide.",
    date: "October 20, 2025",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80",
    category: "Gear & Tips",
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
