import Link from "next/link";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";

const BASE_URL = "https://www.aussielunchbox.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const canonical = `${BASE_URL}/${locale}/faq`;
  return {
    title: "FAQ – Aussie Lunchbox | Frequently Asked Questions",
    description:
      "Answers to common questions about the Aussie Lunchbox planner — allergies, dietary restrictions, shopping lists, PDF export, and more.",
    alternates: {
      canonical,
      languages: {
        en: `${BASE_URL}/en/faq`,
        ko: `${BASE_URL}/ko/faq`,
        "zh-CN": `${BASE_URL}/zh/faq`,
      },
    },
    openGraph: { url: canonical },
  };
}

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "Is Aussie Lunchbox Planner free to use?",
    a: "Yes! The core weekly planner — generating meal plans, viewing recipes, and downloading shopping lists — is completely free. We may introduce premium features in the future, but the essentials will always remain free.",
  },
  {
    q: "How does the meal plan generator work?",
    a: "Our planner selects a balanced mix of 5 lunch menus for the week from our curated database of Australian-friendly recipes. It prioritises variety across categories (Sandwich, Hot, Baking, Cold) and applies any allergy or dietary filters you've set. You can also add fridge leftovers or favourite ingredients to influence the selection.",
  },
  {
    q: "Can I filter for allergies or dietary requirements?",
    a: "Yes. Before generating your plan, you can select from the following filters: Nut Allergy, Dairy Allergy, Gluten Allergy, Egg Allergy, Vegetarian, and Vegan. The planner will exclude any menus that contain those allergens.",
  },
  {
    q: "Are the allergy filters 100% reliable?",
    a: "We take allergy safety seriously and have carefully tagged every recipe in our database. However, we cannot guarantee that commercial products you buy are free from allergens — manufacturers change formulations and cross-contamination can occur. Always read the label on every product you purchase. For severe allergies, consult your healthcare provider.",
  },
  {
    q: "Where do the supermarket prices come from?",
    a: "Price estimates are based on regular Woolworths AU prices, updated periodically. Prices are approximations and may differ at your local store or on sale days. Coles and Aldi prices may vary. Use the estimates as a planning guide rather than exact values.",
  },
  {
    q: "How are calorie estimates calculated?",
    a: "Calorie estimates are based on standard portion sizes and average nutritional values from generic food databases. They are rough estimates intended to give a ballpark idea of energy content — not a substitute for precise nutritional tracking. Actual calories will vary based on specific brands and portion sizes used.",
  },
  {
    q: "Can I save or favourite meal plans?",
    a: "Yes, if you create a free account (sign in with Google), you can save favourite meal plans to revisit later. Sign up is quick and your data is securely stored.",
  },
  {
    q: "Can I download the shopping list?",
    a: "Yes! Once your weekly plan is generated, you can download a PDF of the shopping list, grouped by category (Produce, Meat & Seafood, Dairy & Eggs, Bakery, etc.) with estimated prices. You can also email the list to yourself.",
  },
  {
    q: "Is the app suitable for schools with nut-free policies?",
    a: "Yes. Enable the 'Nut Allergy' filter and the planner will only suggest nut-free menus. All menus in our database are reviewed for nut content. Remember to also check snack items separately.",
  },
  {
    q: "What languages does the app support?",
    a: "Aussie Lunchbox Planner supports English, Korean (한국어), and Chinese (中文). Use the language selector in the top navigation bar to switch.",
  },
  {
    q: "Can I suggest new recipes or report an error?",
    a: "Absolutely! We'd love your feedback. Use our Contact page to send us recipe suggestions, report incorrect allergy tags, or flag any issues. We review all submissions and update the database regularly.",
  },
  {
    q: "How do I use the fridge leftovers feature?",
    a: "In the Planner sidebar, you'll find a 'Fridge Leftovers' field. Type in an ingredient you already have (e.g., 'chicken', 'spinach'), and the planner will prioritise menus that use that ingredient. This helps reduce food waste and save money.",
  },
  {
    q: "Does the app work on mobile?",
    a: "Yes. Aussie Lunchbox Planner is fully responsive and works on smartphones and tablets. You can plan your week and view shopping lists on the go.",
  },
  {
    q: "How often are recipes updated?",
    a: "We review and add new recipes regularly, typically monthly. Supermarket prices are refreshed weekly. If you notice a recipe that looks outdated or a price that seems wrong, please let us know via the Contact page.",
  },
];

export default async function FAQPage() {
  const locale = await getLocale();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero */}
      <section className="bg-[#FFF8EE] pt-24 pb-16 px-4 text-center">
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest mb-4">Help Centre</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
          Everything you need to know about Aussie Lunchbox Planner.
        </p>
      </section>

      {/* FAQ accordion */}
      <section className="max-w-3xl mx-auto px-4 py-20">
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <details key={i} className="bg-[#FFF8EE] rounded-3xl overflow-hidden group">
              <summary className="w-full text-left px-7 py-5 flex items-center justify-between gap-4 hover:bg-orange-50 transition-colors cursor-pointer list-none">
                <span className="font-semibold text-[#1a1a1a] text-sm md:text-base leading-snug">
                  {item.q}
                </span>
                <span className="text-[#F5A623] text-xl shrink-0 transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="px-7 pb-6 text-gray-600 text-sm leading-relaxed border-t border-orange-100 pt-4">
                {item.a}
              </div>
            </details>
          ))}
        </div>

        {/* Still have questions CTA */}
        <div className="mt-12 bg-[#7B3F00] text-white rounded-3xl p-10 text-center">
          <h2 className="text-2xl font-extrabold mb-2">Still have questions?</h2>
          <p className="text-white/80 text-sm mb-6">
            Can&apos;t find the answer you&apos;re looking for? Send us a message — we&apos;d love to help.
          </p>
          <Link
            href={`/${locale}/contact`}
            className="inline-block bg-[#F5A623] hover:bg-white hover:text-[#7B3F00] text-white px-8 py-3 rounded-full font-bold text-sm transition-colors"
          >
            Contact Us →
          </Link>
        </div>
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
