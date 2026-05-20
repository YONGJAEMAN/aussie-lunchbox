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

          {/* Expanded scope sections — AdSense / AI / allergy / data */}
          <h2 className="text-xl font-bold text-[#1a1a1a] mt-12">Use of the AI Meal Planner</h2>
          <p className="text-gray-600 leading-relaxed">
            The Aussie Lunchbox planner generates weekly meal plans by combining a curated
            library of Australian-friendly recipes with rules drawn from the National Health
            and Medical Research Council (NHMRC) <em>Australian Dietary Guidelines</em> and
            the <em>Australian Guide to Healthy Eating</em>, plus state health department
            healthy-canteen frameworks (NSW Healthy School Canteen Strategy, Queensland
            Smart Choices, Victorian Healthy Choices). The planner does not generate novel
            recipes or use a large language model to write content. However, you should
            treat its output as a starting point, not a finished medical or dietary plan:
          </p>
          <ul className="text-gray-600 space-y-1 list-disc pl-6">
            <li>The planner does not know your child individually. It applies general age-band serving guidance and the allergy filters you tick — it does not account for medical conditions, growth concerns, sensory issues, or cultural and religious requirements unless you exclude relevant ingredients manually.</li>
            <li>Generated plans may include ingredients that conflict with a school&apos;s specific food policy (e.g., a school that restricts seeds in addition to nuts, or a school with a sugar-free Friday). Always cross-check the plan against your school&apos;s current letter.</li>
            <li>Allergy filters operate on the recipe ingredient list, not on the live FSANZ Plain English Allergen Labelling (PEAL) statement of any commercial product you may buy to make the recipe. If you are managing an anaphylactic allergy, always read the actual product packaging before purchase.</li>
            <li>Prices shown alongside the plan are estimates drawn from periodic in-store checks at Australian supermarkets and may not reflect the current price at your local store, particularly in regional or remote areas.</li>
          </ul>

          <h2 className="text-xl font-bold text-[#1a1a1a]">Allergy, Nutrition, and Food Safety Disclaimer</h2>
          <p className="text-gray-600 leading-relaxed">
            Aussie Lunchbox content covers allergy management, food safety, and child
            nutrition — topics that fall within the Your Money or Your Life (YMYL)
            category where errors can have real consequences. Articles are written and
            reviewed against publicly available Australian Government, NHMRC, and
            Heart Foundation guidance, but they are general educational content, not
            personalised advice.
          </p>
          <ul className="text-gray-600 space-y-1 list-disc pl-6">
            <li><strong>For diagnosed allergies, particularly with anaphylaxis risk:</strong> follow your child&apos;s ASCIA Action Plan (developed by your GP, paediatrician, or clinical immunology/allergy specialist). Do not rely on a planner-generated label as your only safety check.</li>
            <li><strong>For nutrient adequacy concerns</strong> (iron, calcium, protein, vitamin D, growth tracking): consult an Accredited Practising Dietitian (APD) via the Dietitians Australia directory, or your GP. Site articles can illustrate the general framework but cannot diagnose deficiency.</li>
            <li><strong>For food safety in extreme conditions</strong> (long bus rides in summer, unrefrigerated school trips, camp food): the Food Standards Australia New Zealand (FSANZ) consumer guidance and your state health department (NSW Food Authority, Queensland Health, Vic Health, etc.) override anything written on this site if the two differ.</li>
            <li><strong>Reactions or adverse events:</strong> always stop the food in question, manage the immediate reaction per your child&apos;s ASCIA Action Plan, and contact <strong>Healthdirect Australia (1800 022 222)</strong> or call <strong>000</strong> for emergency services as appropriate. Do not contact this site as a first response.</li>
          </ul>

          <h2 className="text-xl font-bold text-[#1a1a1a]">Parent / Guardian Responsibility</h2>
          <p className="text-gray-600 leading-relaxed">
            Aussie Lunchbox is built for use by adults responsible for school-age children
            in Australia (parents, caregivers, grandparents, guardians). By using the
            planner or relying on site content for a child&apos;s lunch, you confirm:
          </p>
          <ul className="text-gray-600 space-y-1 list-disc pl-6">
            <li>You are the parent or legal guardian of the child the plan is for, or you have been given clear instructions by that parent or guardian (allergy list, cultural restrictions, school policy).</li>
            <li>You have read the current school food and allergy policy and will cross-check the generated plan against it before sending food in. Policies vary by state — NSW, Victoria, Queensland, WA, SA, Tasmania, ACT, and NT each have distinct healthy-canteen frameworks.</li>
            <li>You will physically prepare and check each lunchbox item before it leaves your home — the planner does not handle packaging, food safety on the day, or temperature control on the route to school. Australian summer temperatures (often 35–40°C in QLD, NSW, VIC) make this particularly important.</li>
            <li>You accept that supermarket prices, allergen labels, and school policies change over time — the planner cannot be more current than the data it was last updated with.</li>
          </ul>

          <h2 className="text-xl font-bold text-[#1a1a1a]">Account and Data Provisions</h2>
          <p className="text-gray-600 leading-relaxed">
            The Aussie Lunchbox planner offers an optional free account (via Supabase Auth)
            for saving favourite meals and previously generated plans. The following apply
            when you create an account:
          </p>
          <ul className="text-gray-600 space-y-1 list-disc pl-6">
            <li>Account data is limited to what you provide at sign-up (email address, password hash) and what you choose to save (favourite meal names, plan history, allergy preferences).</li>
            <li>No child name, age, school name, or precise location is collected or stored — the planner operates on year-level and allergy filters, not personally identifying information about the child.</li>
            <li>You can request export or deletion of your account data at any time by contacting{" "}
              <a href={`mailto:${t("terms_contact_email")}`} className="text-[#F5A623] hover:underline">{t("terms_contact_email")}</a>
              . The data export covers all favourite meals and saved plans; deletion is irreversible and processed within 30 days as required under the Australian Privacy Act 1988.
            </li>
            <li>Account data is stored on Supabase infrastructure in the Australia-Sydney region. By creating an account you consent to this data location.</li>
            <li>If you believe your privacy has been mishandled, you can complain to the Office of the Australian Information Commissioner (OAIC) at <a href="https://www.oaic.gov.au/" rel="nofollow noopener" target="_blank" className="text-[#F5A623] hover:underline">oaic.gov.au</a>.</li>
          </ul>

          <h2 className="text-xl font-bold text-[#1a1a1a]">Advertising and Third-Party Services</h2>
          <p className="text-gray-600 leading-relaxed">
            Aussie Lunchbox is monetised through <strong>Google AdSense</strong>. Google
            (including third-party vendors that Google may use) may use cookies to serve
            ads based on your prior visits to this site or other sites. Google&apos;s use
            of advertising cookies enables it and its partners to serve ads based on your
            visits to this site and/or other sites on the Internet. You may opt out of
            personalised advertising by visiting{" "}
            <a href="https://www.google.com/settings/ads" rel="nofollow noopener" target="_blank" className="text-[#F5A623] hover:underline">Google Ads Settings</a>.
            More about third-party advertising opt-out is available at{" "}
            <a href="https://www.aboutads.info/" rel="nofollow noopener" target="_blank" className="text-[#F5A623] hover:underline">aboutads.info</a>.
            Australian users may also wish to consult the Australian Association of
            National Advertisers&apos; opt-out resources. See the{" "}
            <Link href={`/${locale}/policies`} className="text-[#F5A623] hover:underline">Privacy Policy</Link>
            {" "}for the full data-handling overview, including the cookie consent banner.
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
