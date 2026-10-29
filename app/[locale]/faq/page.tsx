import Link from "next/link";
import { getLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { boxMedianLabel, boxFloorLabel, boxCeilingLabel } from "@/lib/servePrice";
import { MENU_COUNT } from "@/lib/menuCounts";
import { portionBandFigures } from "@/lib/portionBands";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/pageMetadata";
import Footer from "@/components/Footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    path: "/faq",
    locale,
    title: "FAQ – Aussie Lunchbox | Frequently Asked Questions",
    description:
      "Answers to common questions about the Aussie Lunchbox planner — allergies, dietary restrictions, shopping lists, PDF export, and more.",
  });
}

export default async function FAQPage() {
  const locale = await getLocale();
  const t = await getTranslations();

  const FAQ_CATEGORIES = [
    { label: t("faq_cat_getting_started"), keys: [1, 2, 7, 8, 10, 13, 15, 16, 32] },
    { label: t("faq_cat_allergies"), keys: [3, 4, 9, 17, 18, 19, 33] },
    { label: t("faq_cat_budget"), keys: [31, 5, 20, 21, 22] },
    { label: t("faq_cat_nutrition"), keys: [6, 23, 24, 25] },
    { label: t("faq_cat_technical"), keys: [11, 12, 14, 26, 27, 28, 29, 30] },
  ];

  const ALL_FAQ_KEYS = FAQ_CATEGORIES.flatMap((c) => c.keys);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ALL_FAQ_KEYS.map((n) => ({
      "@type": "Question",
      name: t(`faq_q${n}`),
      acceptedAnswer: {
        "@type": "Answer",
        text: t(`faq_a${n}`, { boxMedian: boxMedianLabel(), boxFloor: boxFloorLabel(), boxCeiling: boxCeilingLabel(), menuCount: String(MENU_COUNT), ...portionBandFigures() }),
      },
    })),
  };

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />

      {/* Hero */}
      <section className="bg-[#F7F9FC] pt-24 pb-16 px-4 text-center">
        <p className="text-[#366A1B] font-semibold text-sm uppercase tracking-widest mb-4">{t("section_help_centre")}</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          {t("faq_title")}
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
          {t("faq_subtitle")}
        </p>
      </section>

      {/* FAQ accordion by category */}
      <section className="max-w-3xl mx-auto px-4 py-20">
        <div className="space-y-10">
          {FAQ_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <h2 className="text-xl font-bold text-[#314A37] mb-4">{cat.label}</h2>
              <div className="space-y-3">
                {cat.keys.map((n) => (
                  <details key={n} className="bg-[#F7F9FC] rounded-3xl overflow-hidden group">
                    <summary className="w-full text-left px-7 py-5 flex items-center justify-between gap-4 hover:bg-gray-100 transition-colors cursor-pointer list-none">
                      <span className="font-semibold text-[#1a1a1a] text-sm md:text-base leading-snug">
                        {t(`faq_q${n}`)}
                      </span>
                      <span className="text-[#366A1B] text-xl shrink-0 transition-transform duration-200 group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <div className="px-7 pb-6 text-gray-600 text-sm leading-relaxed border-t border-gray-200 pt-4">
                      {t(`faq_a${n}`, { boxMedian: boxMedianLabel(), boxFloor: boxFloorLabel(), boxCeiling: boxCeilingLabel(), menuCount: String(MENU_COUNT), ...portionBandFigures() })}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Still have questions CTA */}
        <div className="mt-12 bg-[#366A1B] text-white rounded-3xl p-10 text-center">
          <h2 className="text-2xl font-extrabold mb-2">{t("faq_still_title")}</h2>
          <p className="text-white/80 text-sm mb-6">
            {t("faq_still_desc")}
          </p>
          <Link
            href={`/${locale}/contact`}
            className="inline-block bg-white hover:bg-[#F7F9FC] text-[#366A1B] px-8 py-3 rounded-full font-bold text-sm transition-colors"
          >
            {t("faq_contact_btn")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer locale={locale} />
    </main>
  );
}
