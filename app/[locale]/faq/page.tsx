"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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
    a: "Our planner selects a balanced mix of 5 lunch menus for the week from our curated database of NZ-friendly recipes. It prioritises variety across categories (Sandwich, Hot, Baking, Cold) and applies any allergy or dietary filters you've set. You can also add fridge leftovers or favourite ingredients to influence the selection.",
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

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";

  return (
    <main className="min-h-screen bg-[#FDFAF2]">
      {/* Hero */}
      <section
        className="text-white text-center py-16 px-4"
        style={{ background: "linear-gradient(135deg, #7B3F00 0%, #F5A623 100%)" }}
      >
        <h1 className="text-4xl font-bold mb-3">Frequently Asked Questions</h1>
        <p className="text-lg opacity-90 max-w-xl mx-auto">
          Everything you need to know about Aussie Lunchbox Planner.
        </p>
      </section>

      {/* FAQ accordion */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="bg-white rounded-2xl shadow overflow-hidden">
              <button
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
              >
                <span className="font-semibold text-[#7B3F00] text-sm md:text-base leading-snug">
                  {item.q}
                </span>
                <span
                  className={`text-[#F5A623] text-xl shrink-0 transition-transform duration-200 ${
                    openIndex === i ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
              </button>
              {openIndex === i && (
                <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still have questions CTA */}
        <div className="mt-12 bg-[#7B3F00] text-white rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Still have questions?</h2>
          <p className="text-sm opacity-80 mb-5">
            Can&apos;t find the answer you&apos;re looking for? Send us a message — we&apos;d love to help.
          </p>
          <Link
            href={`/${locale}/contact`}
            className="inline-block bg-[#F5A623] hover:bg-[#D4850A] px-7 py-3 rounded-full font-semibold text-sm transition-colors"
          >
            Contact Us →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#7B3F00] text-white py-8 px-4">
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
