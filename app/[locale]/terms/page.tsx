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
  const canonical = `${BASE_URL}/${locale}/terms`;
  return {
    title: "Terms & Conditions - Aussie Lunchbox",
    alternates: {
      canonical,
      languages: {
        "x-default": `${BASE_URL}/en/terms`,
        en: `${BASE_URL}/en/terms`,
        ko: `${BASE_URL}/ko/terms`,
        "zh-CN": `${BASE_URL}/zh/terms`,
      },
    },
    openGraph: { url: canonical },
  };
}

export default async function TermsPage() {
  const locale = await getLocale();
  const t = await getTranslations();

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#FFF8EE] pt-24 pb-16 px-4 text-center">
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest mb-4">{t("section_legal")}</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          {t("terms_title")}
        </h1>
        <p className="text-gray-500 text-lg">{t("terms_updated")}</p>
      </section>

      <section className="max-w-3xl mx-auto py-20 px-4">
        <div className="bg-[#FFF8EE] rounded-3xl p-10 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-[#1a1a1a] mt-0">{t("terms_1_h")}</h2>
          <p className="text-gray-600 leading-relaxed">
            {t("terms_1_p")}
          </p>

          <h2 className="text-xl font-bold text-[#1a1a1a]">{t("terms_2_h")}</h2>
          <p className="text-gray-600 leading-relaxed">
            {t("terms_2_p")}
          </p>
          <ul className="text-gray-600 space-y-1">
            <li>{t("terms_2_li1")}</li>
            <li>{t("terms_2_li2")}</li>
          </ul>

          <h2 className="text-xl font-bold text-[#1a1a1a]">{t("terms_3_h")}</h2>
          <p className="text-gray-600 leading-relaxed">
            {t("terms_3_p")}
          </p>

          <h2 className="text-xl font-bold text-[#1a1a1a]">{t("terms_4_h")}</h2>
          <p className="text-gray-600 leading-relaxed">
            {t("terms_4_p")}
          </p>

          <h2 className="text-xl font-bold text-[#1a1a1a]">{t("terms_5_h")}</h2>
          <p className="text-gray-600 leading-relaxed">
            {t("terms_5_p")}
          </p>
          <ul className="text-gray-600 space-y-1">
            <li>{t("terms_5_li1")}</li>
            <li>{t("terms_5_li2")}</li>
          </ul>

          <h2 className="text-xl font-bold text-[#1a1a1a]">{t("terms_6_h")}</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <p className="text-amber-800 font-semibold text-sm">
              {t("terms_6_warning")}
            </p>
          </div>
          <ul className="text-gray-600 space-y-1">
            <li>{t("terms_6_li1")}</li>
            <li>{t("terms_6_li2")}</li>
          </ul>

          <h2 className="text-xl font-bold text-[#1a1a1a]">{t("terms_7_h")}</h2>
          <p className="text-gray-600 leading-relaxed">
            {t("terms_7_p")}
          </p>

          <h2 className="text-xl font-bold text-[#1a1a1a]">{t("terms_8_h")}</h2>
          <p className="text-gray-600 leading-relaxed">
            {t("terms_8_p")}{" "}
            <a href={`mailto:${t("terms_contact_email")}`} className="text-[#F5A623] hover:underline">
              {t("terms_contact_email")}
            </a>
            .
          </p>
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
