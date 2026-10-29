import Link from "next/link";
import { getLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/pageMetadata";
import Footer from "@/components/Footer";
import { termsUpdated } from "@/lib/policyRevisions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    path: "/terms",
    locale,
    title: "Terms & Conditions — Kiwi Lunchbox",
    description:
      "Terms of use for Kiwi Lunchbox, a free school lunch planner for New Zealand families. Includes acceptable use, liability scope, and content licensing.",
  });
}

export default async function TermsPage() {
  const locale = await getLocale();
  const t = await getTranslations();

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#F7F9FC] pt-24 pb-16 px-4 text-center">
        <p className="text-[#366A1B] font-semibold text-sm uppercase tracking-widest mb-4">{t("section_legal")}</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          {t("terms_title")}
        </h1>
        <p className="text-gray-500 text-lg">{t("terms_updated", { updated: termsUpdated() })}</p>
      </section>

      <section className="max-w-3xl mx-auto py-20 px-4">
        <div className="bg-[#F7F9FC] rounded-3xl p-10 prose prose-gray max-w-none">
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
            <a href={`mailto:${t("terms_contact_email")}`} className="text-[#366A1B] hover:underline">
              {t("terms_contact_email")}
            </a>
            .
          </p>

          {/* Expanded scope sections — AdSense / AI / allergy / data */}
          {/* 🔴 제목이 바로 아래 본문("does not ... use a large language model")과 모순이었다. */}
          <h2 className="text-xl font-bold text-[#1a1a1a] mt-12">Use of the Meal Planner</h2>
          <p className="text-gray-600 leading-relaxed">
            The Kiwi Lunchbox planner assembles a weekly plan from a fixed library of
            lunchbox recipes maintained by hand. It applies the allergy and dietary filters
            you tick, drops any menu that conflicts, and varies the recipe categories across
            the week so you do not get five sandwiches. It does <strong>not</strong> check a
            week against the Ministry of Health food groups &mdash; there is no food-group
            logic in the code &mdash; and it does not generate novel recipes or use a large
            language model to write content. Treat its output as a starting point, not a
            finished medical or dietary plan:
          </p>
          <ul className="text-gray-600 space-y-1 list-disc pl-6">
            <li>The planner does not know your child individually. It applies the allergy filters you tick and an estimated calorie figure per lunch based on standard portion sizes — it does not account for medical conditions, growth concerns, sensory issues, or cultural and religious requirements unless you exclude relevant ingredients manually.</li>
            <li>Generated plans may include ingredients that conflict with a school&apos;s specific food policy (e.g., a school that restricts seeds in addition to nuts, or a school with a sugar-free Friday). Always cross-check the plan against your school&apos;s current letter.</li>
            <li>Allergy filters operate on the recipe ingredient list, not on the live PEAL allergen statement of any commercial product you may buy to make the recipe. If you are managing an anaphylactic allergy, always read the actual product packaging before purchase.</li>
            <li>Prices shown alongside the plan are estimates drawn from weekly readings of regular Woolworths shelf prices in their own online shop, and may not reflect the current price at your local store — particularly outside Auckland, or where a Click &amp; Collect price differs from the shelf tag.</li>
          </ul>

          <h2 className="text-xl font-bold text-[#1a1a1a]">Allergy, Nutrition, and Food Safety Disclaimer</h2>
          <p className="text-gray-600 leading-relaxed">
            Kiwi Lunchbox content covers allergy management, food safety, and child
            nutrition — topics that fall within the Your Money or Your Life (YMYL)
            category where errors can have real consequences. Articles are written and
            reviewed against publicly available NZ Government and Heart Foundation
            guidance, but they are general educational content, not personalised advice.
          </p>
          <ul className="text-gray-600 space-y-1 list-disc pl-6">
            <li><strong>For diagnosed allergies, particularly with anaphylaxis risk:</strong> follow your child&apos;s allergy action plan from your GP, paediatrician, or allergist. Do not rely on a planner-generated label as your only safety check.</li>
            <li><strong>For nutrient adequacy concerns</strong> (iron, calcium, protein, vitamin D, growth tracking): consult a registered NZ dietitian or your GP. Site articles can illustrate the general framework but cannot diagnose deficiency.</li>
            <li><strong>For food safety in extreme conditions</strong> (long bus rides in summer, unrefrigerated school trips, camp food): the Ministry for Primary Industries (NZ Food Safety) consumer guidance overrides anything written on this site if the two differ.</li>
            <li><strong>Reactions or adverse events:</strong> always stop the food in question, manage the immediate reaction per your allergy plan, and contact Healthline (0800 611 116) or emergency services as appropriate. Do not contact this site as a first response.</li>
          </ul>

          <h2 className="text-xl font-bold text-[#1a1a1a]">Parent / Guardian Responsibility</h2>
          <p className="text-gray-600 leading-relaxed">
            Kiwi Lunchbox is built for use by adults responsible for school-age children
            (parents, caregivers, grandparents, guardians). By using the planner or
            relying on site content for a child&apos;s lunch, you confirm:
          </p>
          <ul className="text-gray-600 space-y-1 list-disc pl-6">
            <li>You are the parent or legal guardian of the child the plan is for, or you have been given clear instructions by that parent or guardian (allergy list, cultural restrictions, school policy).</li>
            <li>You have read the current school food and allergy policy and will cross-check the generated plan against it before sending food in.</li>
            <li>You will physically prepare and check each lunchbox item before it leaves your home — the planner does not handle packaging, food safety on the day, or temperature control on the route to school. See the{" "}
              <Link href={`/${locale}/blog/lunchbox-food-safety-nz-term-1-heat`} className="text-[#366A1B] hover:underline">NZ Lunchbox Food Safety guide</Link>
              {" "}for the practical handling rules.
            </li>
            <li>You accept that supermarket prices, allergen labels, and school policies change over time — the planner cannot be more current than the data it was last updated with.</li>
          </ul>

          <h2 className="text-xl font-bold text-[#1a1a1a]">Account and Data Provisions</h2>
          <p className="text-gray-600 leading-relaxed">
            The Kiwi Lunchbox planner offers an optional free account (via Supabase Auth)
            for saving favourite meals. The following apply when you create an account:
          </p>
          <ul className="text-gray-600 space-y-1 list-disc pl-6">
            <li>Account data is limited to what you provide at sign-up (email address, password hash) and what you choose to save (favourite menu names only — we do not store plan history or allergy preferences). Your most recent generated plan is kept in your own browser&apos;s local storage so it survives a refresh; it is never sent to or stored on our servers, and clearing your browser data removes it.</li>
            <li>No child name, age, school name, or precise location is collected or stored — the planner asks only for the number of days and your dietary filters, and holds nothing that identifies the child.</li>
            <li>You can request export or deletion of your account data at any time by contacting{" "}
              <a href={`mailto:${t("terms_contact_email")}`} className="text-[#366A1B] hover:underline">{t("terms_contact_email")}</a>
              . The export covers your account email and your saved favourite menu names, which is everything we hold; deletion is irreversible and processed within 10 working days.
            </li>
            <li>Account data is stored on Supabase infrastructure in the Australia-Sydney region. By creating an account you consent to this data location.</li>
          </ul>

          <h2 className="text-xl font-bold text-[#1a1a1a]">Advertising and Third-Party Services</h2>
          <p className="text-gray-600 leading-relaxed">
            Kiwi Lunchbox has no paywall, subscription, or affiliate links; the site is
            funded by display advertising through <strong>Google AdSense</strong>. Google
            (including third-party vendors that Google may use) may use cookies to serve
            ads based on your prior visits to this site or other sites. Google&apos;s use
            of advertising cookies enables it and its partners to serve ads based on your
            visits to this site and/or other sites on the Internet. You may opt out of
            personalised advertising by visiting{" "}
            <a href="https://www.google.com/settings/ads" rel="nofollow noopener" target="_blank" className="text-[#366A1B] hover:underline">Google Ads Settings</a>.
            More about third-party advertising opt-out is available at{" "}
            <a href="https://www.aboutads.info/" rel="nofollow noopener" target="_blank" className="text-[#366A1B] hover:underline">aboutads.info</a>.
            See the{" "}
            <Link href={`/${locale}/policies`} className="text-[#366A1B] hover:underline">Privacy Policy</Link>
            {" "}for the full data-handling overview, including the cookie consent banner.
          </p>
        </div>
      </section>

      {/* Footer */}
      <Footer locale={locale} />
    </main>
  );
}
