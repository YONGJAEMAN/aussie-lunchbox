import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GUIDE_CARDS } from "@/content/guides";
import { BRAND } from "@/lib/brand";
import { buildPageMetadata } from "@/lib/seo/pageMetadata";
import Footer from "@/components/Footer";
import CategoryFilter from "@/components/CategoryFilter";

const SUPPORTED_LOCALES: string[] = [...BRAND.LOCALES];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    path: "/guides",
    locale,
    title: "Lunchbox Guides & Resources | Aussie Lunchbox",
    description:
      "Comprehensive guides covering nutrition, allergies, budget planning, seasonal produce, and food safety for Australian school lunches.",
  });
}

export default async function GuidesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale)) notFound();

  const t = await getTranslations();

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#F7F9FC] pt-24 pb-16 px-4 text-center">
        <p className="text-[#366A1B] font-semibold text-sm uppercase tracking-widest mb-4">{t("guides_section_label")}</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          {t("guides_title")}
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-2 leading-relaxed">
          {t("guides_subtitle")}
        </p>
        <p className="text-sm text-gray-500 max-w-2xl mx-auto mb-10">
          {t("guides_count")}
        </p>
      </section>

      {/* Category filter + guides grid */}
      <CategoryFilter items={GUIDE_CARDS} allLabel={t("blog_cat_all")} basePath={`/${locale}/guides`} />

      {/* Editorial framework — how guides are researched */}
      <section className="bg-[#F7F9FC] py-20 px-4">
        <div className="max-w-3xl mx-auto prose prose-gray">
          <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-6">How these guides are researched</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Every guide on Aussie Lunchbox is written by{" "}
            <Link href={`/${locale}/about`} className="text-[#366A1B] underline">Yong Jae Lee</Link>
            , the solo operator of the site (based in Auckland, New Zealand, and also behind
            Kiwi Lunchbox), and reviewed against publicly available Australian Government,
            NHMRC and state health-department guidance before publishing. The aim is to translate dense official documents — often 40 to 80
            pages — into a parent-readable framework that survives a Monday-morning
            lunchbox decision.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            The sources I lean on most often:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
            <li>
              <strong>National Health and Medical Research Council (NHMRC)</strong> — the{" "}
              <em>Australian Dietary Guidelines</em> and the <em>Australian Guide to Healthy
              Eating</em>. These are the backbone of the food-group and serving guidance.
            </li>
            <li>
              <strong>Food Standards Australia New Zealand (FSANZ)</strong> — the <em>Plain
              English Allergen Labelling (PEAL)</em> rules that became mandatory in February 2024,
              and the 5–60°C temperature danger zone used wherever a guide touches storage or
              transport. Allergy guides on this site assume PEAL-format labels.
            </li>
            <li>
              <strong>State healthy canteen frameworks</strong> — the NSW Healthy School Canteen
              Strategy, Queensland&apos;s Smart Choices, Victoria&apos;s Healthy Choices, WA&apos;s
              Healthy Options, SA&apos;s Right Bite and Tasmania&apos;s Move Well Eat Well. They set
              what school canteens serve and are the reference point for what schools ask of
              lunchboxes.
            </li>
            <li>
              <strong>ASCIA</strong> (Australasian Society of Clinical Immunology and Allergy) and{" "}
              <strong>Allergy &amp; Anaphylaxis Australia</strong> — action plans and the
              school-policy guidance quoted in the allergy guides.
            </li>
            <li>
              <strong>State Departments of Education</strong> — term dates and school food
              policies.
            </li>
          </ul>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mt-12 mb-4">Editorial process for each guide</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            A new guide goes through a consistent pipeline before it is published:
          </p>
          <ol className="list-decimal pl-6 text-gray-700 space-y-2 mb-6">
            <li>
              <strong>Topic selection</strong> — driven by recurring questions from parent
              feedback (contact-form messages), gaps in the existing guide library, or
              changes in Australian public health guidance (e.g., the PEAL allergen labelling
              transition).
            </li>
            <li>
              <strong>Source review</strong> — I work through the latest version of the
              relevant NHMRC, FSANZ or state document, plus any peer-reviewed
              Australian data referenced inside. Where international guidance is referenced,
              I confirm it aligns with the Australian position before including it.
            </li>
            <li>
              <strong>Drafting</strong> — guides aim for 1,500–3,000 words and translate
              official guidance into practical decisions a parent can make at a
              supermarket aisle or kitchen counter. First-person operator voice is kept
              where personal experience adds context.
            </li>
            <li>
              <strong>Cross-check</strong> — facts that affect food safety, allergy, or
              nutrient adequacy are re-verified against the source before publishing.
              Where a guide gives a specific number &mdash; a survey percentage, a
              temperature limit, a price &mdash; it says where the number came from, and
              where there is no Australian figure to cite it says so rather than borrowing one.
            </li>
            <li>
              <strong>Last-reviewed dating</strong> — each guide carries a publish date
              and a last-reviewed date. Guides are reviewed annually at minimum, and
              sooner when the underlying guidance changes.
            </li>
            <li>
              <strong>Corrections process</strong> — readers can flag errors through the{" "}
              <Link href={`/${locale}/contact`} className="text-[#366A1B] underline">Contact page</Link>
              . Verified corrections are applied within 48 hours and the
              last-reviewed date is updated. Substantial factual corrections are noted
              in the article footer.
            </li>
          </ol>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mt-12 mb-4">Who these guides are for</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Each guide is written for adults responsible for school-age children in
            Australia. The default reader assumption is:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
            <li>You have a child between Foundation and Year 12 in an Australian school (government, Catholic or independent).</li>
            <li>You are the parent, caregiver, grandparent, or legal guardian who actually packs the lunchbox.</li>
            <li>You are not looking for medical or allergy advice tailored to your child — for that, the right step is a GP visit or a registered dietitian.</li>
            <li>You are interested in <em>practical</em> decisions: which ingredient to choose, which day of the week to do prep, which supermarket has the better price this term.</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mb-6">
            If a guide drifts into territory that should be handled by a clinician (a
            child with diagnosed coeliac, anaphylaxis, growth concerns, or a sensory
            feeding condition), the guide says so explicitly and points to the right
            professional. The site does not pretend to substitute for medical advice.
          </p>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mt-12 mb-4">What each category covers</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            The guide library is organised into the following themes:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
            <li>
              <strong>Nutrition</strong> — the five food groups in the Australian Dietary
              Guidelines, age-based serving guidance, and vegetarian and vegan lunches.
            </li>
            <li>
              <strong>Allergy &amp; intolerance</strong> — nut-free policies, egg-free lunches,
              dairy alternatives, PEAL label reading, school policy navigation, and anaphylaxis
              action plans.
            </li>
            <li>
              <strong>Budget</strong> — what a lunchbox costs at Woolworths prices, batch-cooking
              economics, and seasonal produce.
            </li>
            <li>
              <strong>Seasonal produce</strong> — what is in season month by month in Australia
              and term-by-term lunchbox examples.
            </li>
            <li>
              <strong>Safety &amp; snacks</strong> — the temperature danger zone, which lunchbox
              foods must stay cold, ice packs and Thermos flasks, and healthier snack swaps.
            </li>
            <li>
              <strong>Policy &amp; school environment</strong> — state canteen frameworks,
              nut-free versus nut-aware rules, and how to raise a question with your school.
            </li>
          </ul>

          <p className="text-gray-700 leading-relaxed text-sm bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <strong>Editorial scope.</strong> Guides on this site are general
            information, aligned with public Australian Government and NHMRC guidance.
            They are not personalised medical or dietary advice. For specific concerns
            about your child&apos;s growth, allergies, nutrient adequacy, or feeding
            behaviour, please consult your GP, paediatrician, or a registered dietitian.
            See the{" "}
            <Link href={`/${locale}/terms`} className="text-[#366A1B] underline">Terms</Link>
            {" "}and{" "}
            <Link href={`/${locale}/policies`} className="text-[#366A1B] underline">Privacy Policy</Link>
            {" "}for the full disclaimer and data-handling overview.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#366A1B] py-20 px-4 text-center">
        <h2 className="text-3xl font-extrabold text-white mb-3">
          {t("guides_cta_title")}
        </h2>
        <p className="text-white/80 mb-8 max-w-md mx-auto">
          {t("guides_cta_desc")}
        </p>
        <Link
          href={`/${locale}/planner`}
          className="inline-block bg-white hover:bg-[#F7F9FC] text-[#366A1B] font-bold px-10 py-4 rounded-full transition-colors shadow-lg"
        >
          {t("guides_cta_btn")}
        </Link>
      </section>

      {/* Footer */}
      <Footer locale={locale} />
    </main>
  );
}
