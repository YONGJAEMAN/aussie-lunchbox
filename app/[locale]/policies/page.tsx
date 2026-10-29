import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PolicyTabs from "@/components/PolicyTabs";
import { buildPageMetadata } from "@/lib/seo/pageMetadata";
import Footer from "@/components/Footer";
import { privacyEffective } from "@/lib/policyRevisions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    path: "/policies",
    locale,
    title: "Privacy Policy & Disclaimer — Kiwi Lunchbox",
    description:
      "Read the Kiwi Lunchbox privacy policy, cookie usage, data handling practices, and health & nutrition disclaimer.",
  });
}

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
      <p className="text-sm text-gray-500 mb-6">{t("privacy_effective", { effective: privacyEffective() })}</p>
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
        <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-[#366A1B] hover:underline">{t("privacy_3_link1")}</a>
        {t("privacy_3_mid")}{" "}
        <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" className="text-[#366A1B] hover:underline">{t("privacy_3_link2")}</a>.
      </p>

      <h3 className="text-lg font-bold text-[#1a1a1a]">{t("privacy_4_h")}</h3>
      <p className="text-gray-600 leading-relaxed">
        {t("privacy_4_p")}{" "}
        <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-[#366A1B] hover:underline">{t("privacy_4_link")}</a>.
      </p>

      <h3 className="text-lg font-bold text-[#1a1a1a]">{t("privacy_5_h")}</h3>
      <p className="text-gray-600 leading-relaxed">{t("privacy_5_p")}</p>

      <h3 className="text-lg font-bold text-[#1a1a1a]">{t("privacy_6_h")}</h3>
      <p className="text-gray-600 leading-relaxed">{t("privacy_6_p")}</p>

      <h3 className="text-lg font-bold text-[#1a1a1a]">{t("privacy_7_h")}</h3>
      <p className="text-gray-600 leading-relaxed">
        {t("privacy_7_p")}{" "}
        <a href={`mailto:${t("privacy_contact_email")}`} className="text-[#366A1B] hover:underline">{t("privacy_contact_email")}</a>.
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
      <section className="bg-[#F7F9FC] pt-24 pb-16 px-4 text-center">
        <p className="text-[#366A1B] font-semibold text-sm uppercase tracking-widest mb-4">{t("section_legal")}</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          {t("policies_title")}
        </h1>
        <p className="text-gray-500 text-lg">{t("policies_subtitle")}</p>
      </section>

      <section className="max-w-3xl mx-auto py-20 px-4">
        <PolicyTabs
          privacyContent={privacyContent}
          disclaimerContent={disclaimerContent}
          privacyLabel={t("policies_tab_privacy")}
          disclaimerLabel={t("policies_tab_disclaimer")}
        />
      </section>

      {/* Extended policy detail — advertising, planner limits, allergy disclaimer, corrections */}
      <section className="bg-[#F7F9FC] py-20 px-4">
        <div className="max-w-3xl mx-auto prose prose-gray">
          <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-6">Advertising, money, and what I actually earn from</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Kiwi Lunchbox is free to use, and I want to be plain about how it stays online. The
            only thing that earns money here is <strong>Google AdSense display advertising</strong>
            {" "}&mdash; the banner and in-page ad slots Google may serve on the English pages. I do
            not hand-pick those ads; Google fills the slot. That is the whole business model. There
            is no paywall, no subscription, no &quot;premium planner.&quot;
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
            <li>
              <strong>No affiliate links.</strong> When I name a product &mdash; a particular cheese,
              a brand of wrap, an insulated bag &mdash; I earn nothing if you go and buy it. There
              are no tracked affiliate links or referral codes anywhere on this site.
            </li>
            <li>
              <strong>No sponsored content.</strong> No supermarket, food brand, or manufacturer has
              paid for a mention, a review, a ranking, or a placement. If that ever changes, it will
              be labelled <em>Sponsored</em> at the top of the relevant page in plain language &mdash;
              and honestly, I would rather not do it at all.
            </li>
            <li>
              <strong>Brand names are nominative.</strong> Woolworths, Pak&apos;nSave, New
              World, and the product brands I mention are named so you know what to buy and where.
              None of those companies sponsor, endorse, or are affiliated with this site.
            </li>
          </ul>

          <h2 className="text-3xl font-extrabold text-[#1a1a1a] mt-12 mb-6">How the planner works &mdash; and where it stops</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            The{" "}
            <Link href={`/${locale}/planner`} className="text-[#366A1B] underline">planner</Link>
            {" "}is a planning aid, not a dietitian, and it helps to know exactly what it is doing.
            It assembles a Monday-to-Friday menu from a fixed library of lunchbox recipes I maintain
            by hand. When you tick the allergy filters (nut, dairy, egg, gluten), it drops any menu
            that conflicts and builds the week from what remains.
          </p>
          {/* 🔴 09-29: 「일수를 설정하면」이라 적혀 있었다 — 그런 설정은 없다. planGenerator는 늘 월~금 5일이다.
              아래 알레르기 문단도 「제품 라벨로 태깅」이라 했는데 메인은 조리법 재료 목록을 손으로 본 플래그다
              (약관·플래너 페이지·lib/ingredientDiet.ts와 같은 말을 한다). 라벨은 간식 쪽 근거다. */}
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
            <li>
              The cost shown with each plan is an <strong>estimate</strong> built from regular
              (non-special) <strong>Woolworths</strong> prices, re-read weekly from their own online
              shop &mdash; not a live till total. The{" "}
              <Link href={`/${locale}/price-index`} className="text-[#366A1B] underline">Price Index</Link>
              {" "}is a separate, narrower dataset: 20 staples priced across three chains so you can
              compare them. Specials, pack sizes, and your local branch will move the real number.
            </li>
            <li>
              The planner does <strong>not</strong> know your child&apos;s age, weight, medical
              history, or specific dietary needs, and it does not calculate precise nutrient targets.
              It is built for typical, healthy primary-school children.
            </li>
            <li>
              The allergy filters <strong>reduce</strong> risk; they do not remove it. Each lunch
              recipe is flagged by hand from its own ingredient list; snacks are checked against the
              allergen declaration on the tracked product&apos;s label where one is on file, and by
              hand where it is not. Manufacturers reformulate and &quot;may contain&quot; warnings
              change, so read the actual label on the product you buy, every single time.
            </li>
          </ul>

          <h2 className="text-3xl font-extrabold text-[#1a1a1a] mt-12 mb-6">Health, nutrition, and allergy disclaimer</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Everything here is general information for healthy children. It is <strong>not medical,
            dietetic, or allergy advice</strong>, and it must not be used to manage a diagnosed food
            allergy, intolerance, or medical condition. Nutrition guidance is benchmarked against{" "}
            <a href="https://www.health.govt.nz/" target="_blank" rel="noopener noreferrer" className="text-[#366A1B] underline">Ministry of Health NZ</a>
            {" "}and{" "}
            <a href="https://www.heartfoundation.org.nz/" target="_blank" rel="noopener noreferrer" className="text-[#366A1B] underline">Heart Foundation NZ</a>
            {" "}resources, but it is no substitute for personalised advice from a registered dietitian.
          </p>
          <p className="text-gray-700 leading-relaxed mb-6">
            If your child has a diagnosed allergy &mdash; especially one carrying anaphylaxis risk
            &mdash; please work with your GP, allergist, and school to build an individual management
            plan, and keep any prescribed medication (such as an adrenaline auto-injector) registered
            with the school as your clinician advises. When food safety is on the line, follow your
            healthcare team, not a free website.
          </p>

          <h2 className="text-3xl font-extrabold text-[#1a1a1a] mt-12 mb-6">Corrections &mdash; how to flag an error</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            I would much rather fix a mistake than defend it. If you spot a wrong price, an incorrect
            allergy tag, an out-of-date school-policy note, or anything that reads as inaccurate, send
            it through the{" "}
            <Link href={`/${locale}/contact`} className="text-[#366A1B] underline">contact form</Link>
            {" "}or email{" "}
            <a href={`mailto:${t("privacy_contact_email")}`} className="text-[#366A1B] underline">{t("privacy_contact_email")}</a>.
          </p>
          <p className="text-gray-700 leading-relaxed mb-6">
            I aim to acknowledge within 48 hours. Price corrections are checked against the store&apos;s
            own online listing for the pinned product and the prices recorded for that week; where the reader is right, the figure
            is updated and the page&apos;s last-updated date is bumped. Substantive content changes are
            reflected in each article&apos;s &quot;last reviewed&quot; date. This site is run by one
            person, so a correction goes straight to the person who wrote the page &mdash; there is no
            ticket queue and no support team in between.
          </p>
        </div>
      </section>

      {/* Footer — same as original */}
      <Footer locale={locale} />
    </main>
  );
}
