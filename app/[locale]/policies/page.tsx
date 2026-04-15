import Link from "next/link";
import { getTranslations } from "next-intl/server";
import PolicyTabs from "@/components/PolicyTabs";

export default async function PoliciesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const privacyContent = (
    <div className="prose prose-gray max-w-none">
      <h2 className="text-2xl font-bold text-[#1a1a1a] mt-0">{t("privacy_h")}</h2>
      <p className="text-sm text-gray-400 mb-6">{t("privacy_effective")}</p>
      <p className="text-gray-600 leading-relaxed">{t("privacy_intro")}</p>

      <h3 className="text-lg font-bold text-[#1a1a1a]">{t("privacy_1_h")}</h3>
      <ul className="text-gray-600 space-y-2">
        <li><strong>{t("privacy_1_li1_bold")}</strong> {t("privacy_1_li1")}</li>
        <li><strong>{t("privacy_1_li2_bold")}</strong> {t("privacy_1_li2")}</li>
        <li><strong>{t("privacy_1_li3_bold")}</strong> {t("privacy_1_li3")}</li>
      </ul>

      <h3 className="text-lg font-bold text-[#1a1a1a]">{t("privacy_2_h")}</h3>
      <ul className="text-gray-600 space-y-1">
        <li>{t("privacy_2_li1")}</li>
        <li>{t("privacy_2_li2")}</li>
        <li>{t("privacy_2_li3")}</li>
      </ul>

      <h3 className="text-lg font-bold text-[#1a1a1a]">{t("privacy_3_h")}</h3>
      <p className="text-gray-600 leading-relaxed">
        {t("privacy_3_p")}{" "}
        <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-[#F5A623] hover:underline">{t("privacy_3_link1")}</a>. {t("privacy_3_mid")}{" "}
        <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" className="text-[#F5A623] hover:underline">{t("privacy_3_link2")}</a>.
      </p>

      <h3 className="text-lg font-bold text-[#1a1a1a]">{t("privacy_4_h")}</h3>
      <p className="text-gray-600 leading-relaxed">
        {t("privacy_4_p")}{" "}
        <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-[#F5A623] hover:underline">{t("privacy_4_link")}</a>.
      </p>

      <h3 className="text-lg font-bold text-[#1a1a1a]">{t("privacy_5_h")}</h3>
      <p className="text-gray-600 leading-relaxed">{t("privacy_5_p")}</p>

      <h3 className="text-lg font-bold text-[#1a1a1a]">{t("privacy_6_h")}</h3>
      <p className="text-gray-600 leading-relaxed">{t("privacy_6_p")}</p>

      <h3 className="text-lg font-bold text-[#1a1a1a]">{t("privacy_7_h")}</h3>
      <p className="text-gray-600 leading-relaxed">
        {t("privacy_7_p")}{" "}
        <a href={`mailto:${t("privacy_contact_email")}`} className="text-[#F5A623] hover:underline">{t("privacy_contact_email")}</a>.
      </p>
    </div>
  );

  const disclaimerContent = (
    <div className="prose prose-gray max-w-none">
      <h2 className="text-2xl font-bold text-[#1a1a1a] mt-0">{t("disclaimer_h")}</h2>

      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
        <p className="text-red-700 font-semibold text-sm">{t("disclaimer_warning")}</p>
      </div>

      <h3 className="text-lg font-bold text-[#1a1a1a]">{t("disclaimer_1_h")}</h3>
      <p className="text-gray-600 leading-relaxed">{t("disclaimer_1_p")}</p>

      <h3 className="text-lg font-bold text-[#1a1a1a]">{t("disclaimer_2_h")}</h3>
      <ul className="text-gray-600 space-y-2">
        <li>{t("disclaimer_2_li1")}</li>
        <li>{t("disclaimer_2_li2")}</li>
        <li>{t("disclaimer_2_li3")}</li>
        <li>{t("disclaimer_2_li4")}</li>
      </ul>

      <h3 className="text-lg font-bold text-[#1a1a1a]">{t("disclaimer_3_h")}</h3>
      <ul className="text-gray-600 space-y-2">
        <li>{t("disclaimer_3_li1")}</li>
        <li>{t("disclaimer_3_li2")}</li>
      </ul>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mt-6">
        <p className="text-gray-600 text-sm leading-relaxed">{t("disclaimer_footer")}</p>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#FFF8EE] pt-24 pb-16 px-4 text-center">
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest mb-4">{t("section_legal")}</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          {t("policies_title")}
        </h1>
        <p className="text-gray-500 text-lg">{t("policies_subtitle")}</p>
      </section>

      <section className="max-w-3xl mx-auto py-20 px-4">
        <PolicyTabs
          privacyContent={privacyContent}
          disclaimerContent={disclaimerContent}
          privacyLabel={`🔒 ${t("policies_tab_privacy")}`}
          disclaimerLabel={`⚠️ ${t("policies_tab_disclaimer")}`}
        />
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
