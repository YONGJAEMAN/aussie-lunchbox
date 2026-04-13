import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
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

export default async function FAQPage() {
  const locale = await getLocale();
  const t = await getTranslations();

  const FAQ_CATEGORIES = [
    { label: t("faq_cat_getting_started"), keys: [1, 2, 7, 8, 10, 13, 15, 16] },
    { label: t("faq_cat_allergies"), keys: [3, 4, 9, 17, 18, 19] },
    { label: t("faq_cat_budget"), keys: [5, 20, 21, 22] },
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
        text: t(`faq_a${n}`),
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
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest mb-4">{t("section_help_centre")}</p>
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
              <h2 className="text-xl font-bold text-[#7B3F00] mb-4">{cat.label}</h2>
              <div className="space-y-3">
                {cat.keys.map((n) => (
                  <details key={n} className="bg-[#FFF8EE] rounded-3xl overflow-hidden group">
                    <summary className="w-full text-left px-7 py-5 flex items-center justify-between gap-4 hover:bg-orange-50 transition-colors cursor-pointer list-none">
                      <span className="font-semibold text-[#1a1a1a] text-sm md:text-base leading-snug">
                        {t(`faq_q${n}`)}
                      </span>
                      <span className="text-[#F5A623] text-xl shrink-0 transition-transform duration-200 group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <div className="px-7 pb-6 text-gray-600 text-sm leading-relaxed border-t border-orange-100 pt-4">
                      {t(`faq_a${n}`)}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Still have questions CTA */}
        <div className="mt-12 bg-[#7B3F00] text-white rounded-3xl p-10 text-center">
          <h2 className="text-2xl font-extrabold mb-2">{t("faq_still_title")}</h2>
          <p className="text-white/80 text-sm mb-6">
            {t("faq_still_desc")}
          </p>
          <Link
            href={`/${locale}/contact`}
            className="inline-block bg-[#F5A623] hover:bg-white hover:text-[#7B3F00] text-white px-8 py-3 rounded-full font-bold text-sm transition-colors"
          >
            {t("faq_contact_btn")}
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
              <p className="text-gray-400 text-sm leading-relaxed">{t("footer_tagline")}</p>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4">{t("footer_product")}</p>
              <div className="space-y-3 text-gray-400 text-sm">
                <Link href={`/${locale}/planner`} className="block hover:text-white transition-colors">{t("nav_planner")}</Link>
                <Link href={`/${locale}/blog`} className="block hover:text-white transition-colors">{t("footer_blog")}</Link>
                <Link href={`/${locale}/faq`} className="block hover:text-white transition-colors">{t("footer_faq")}</Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4">{t("footer_company")}</p>
              <div className="space-y-3 text-gray-400 text-sm">
                <Link href={`/${locale}/about`} className="block hover:text-white transition-colors">{t("footer_about")}</Link>
                <Link href={`/${locale}/contact`} className="block hover:text-white transition-colors">{t("footer_contact")}</Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4">{t("footer_legal_label")}</p>
              <div className="space-y-3 text-gray-400 text-sm">
                <Link href={`/${locale}/terms`} className="block hover:text-white transition-colors">{t("footer_terms")}</Link>
                <Link href={`/${locale}/policies`} className="block hover:text-white transition-colors">{t("footer_privacy")}</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8">
            <p className="text-gray-500 text-sm">{t("footer_copyright", { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
