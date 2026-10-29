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
    title: "Lunchbox Guides & Resources | Kiwi Lunchbox",
    description:
      "Comprehensive guides covering nutrition, allergies, budget planning, seasonal produce, and food safety for NZ school lunches.",
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
            Every guide on Kiwi Lunchbox is written by{" "}
            <Link href={`/${locale}/about`} className="text-[#366A1B] underline">Yong Jae Lee</Link>
            , the Auckland-based solo operator of the site, and reviewed against publicly
            available New Zealand Government and Heart Foundation NZ guidance before
            publishing. The aim is to translate dense official documents — often 40 to 80
            pages — into a parent-readable framework that survives a Monday-morning
            lunchbox decision.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            The sources I lean on most often:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
            <li>
              <strong>Ministry of Health NZ</strong> — <em>Eating and Activity Guidelines
              for New Zealand Adults and Children</em>, <em>Healthy Food and Drink
              Guidance for Schools (2020 update)</em>, and the <em>Nutrient Reference
              Values</em> jointly published with Australia. These are the backbone of all
              age-band serving recommendations.
            </li>
            {/* 🔴 09-29: 가이드 본문에 없는 Healthy Heart Award를 출처로 댔고, 5+ A Day를 Heart Foundation 것으로
                적었다(가이드 본문은 「5+ A Day Charitable Trust」라고 바르게 쓴다). 본문이 실제로 인용하는 것만 남긴다. */}
            <li>
              <strong>Heart Foundation NZ</strong> — label-reading guidance (why to compare the
              per-100g column, and how the Health Star Rating is meant to be used) and its
              school food environment resources.
            </li>
            <li>
              <strong>5+ A Day Charitable Trust</strong> — the <em>5+ A Day</em> fruit and
              vegetable message and the seasonal produce resources behind the seasonal calendar.
            </li>
            <li>
              <strong>Food Standards Australia New Zealand (FSANZ)</strong> — particularly
              <em>Standard 1.2.3</em> and the <em>Plain English Allergen Labelling (PEAL)</em>
              guidance that became mandatory in February 2024. Allergy guides on this
              site assume PEAL-format labels.
            </li>
            <li>
              <strong>Ministry for Primary Industries (NZ Food Safety)</strong> — the
              <em>5–60°C danger zone</em> with its four-hour limit, the two-hour rule for
              refrigerating leftovers, and the consumer food safety at home guidance. Used
              wherever a guide touches storage, transport, or seasonal heat. The tighter
              one-hour margin we use above 30°C is our own, not theirs.
            </li>
            <li>
              <strong>Allergy New Zealand</strong> — anaphylaxis action plans,
              school-policy guidance, and the prevalence statistics quoted in the allergy
              guides.
            </li>
            <li>
              <strong>Ministry of Education NZ</strong> — term dates, the
              <em>Ka Ora, Ka Ako | Healthy School Lunches Programme</em>, and the broader
              policy framework that informs what schools accept in lunches.
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
              changes in NZ public health guidance (e.g., the PEAL allergen labelling
              transition).
            </li>
            <li>
              <strong>Source review</strong> — I work through the latest version of the
              relevant Ministry document or Heart Foundation resource, plus any
              peer-reviewed NZ-specific data referenced inside. Where international
              guidance is referenced, I confirm it aligns with the NZ position before
              including it.
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
              where there is no NZ figure to cite it says so rather than borrowing one (the
              nutrition guide deliberately prints no pass/fail sugar or sodium cut-offs).
            </li>
            <li>
              <strong>Last-reviewed dating</strong> — each guide carries a publish date
              and a last-reviewed date. Guides are reviewed annually at minimum, and
              sooner when the underlying guidance changes (PEAL, new Ministry update,
              significant NZ price shift).
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
            Each guide is written for adults responsible for school-age children in New
            Zealand. The default reader assumption is:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
            <li>You have a child between Year 1 and Year 13 in a NZ school (mainstream or kura).</li>
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
              {/* 🔴 09-29: 분류 설명이 가이드 본문에 없는 주제(Green/Amber/Red·Dunedin 지역차·Healthy Heart Award·
                  용기 재질·식기세척기)를 말하고 있었다. content/guides.ts의 실제 절 제목에 맞췄다. */}
              <strong>Nutrition</strong> — the four NZ food groups and what each costs,
              age-based portion guidance, reading labels (the per-100g column and the Health
              Star Rating), the common gaps in NZ lunchboxes (iron, calcium, fibre, vitamin D),
              and vegetarian and vegan lunches.
            </li>
            <li>
              <strong>Allergy &amp; intolerance</strong> — nut-free policies, egg-free
              lunches, dairy alternatives, PEAL label reading, school policy navigation,
              and anaphylaxis management overview.
            </li>
            <li>
              <strong>Budget &amp; supermarket</strong> — Pak&apos;nSave vs Woolworths vs
              New World price tracking, weekly{" "}
              <Link href={`/${locale}/price-index`} className="text-[#366A1B] underline">Price Index</Link>
              {" "}methodology, batch-cooking economics, and seasonal price patterns.
            </li>
            <li>
              <strong>Seasonal produce</strong> — what is in season month-by-month in NZ,
              term-by-term lunchbox examples, storage tips, and frozen, dried and canned
              produce for stretching the season.
            </li>
            <li>
              <strong>Safety &amp; gear</strong> — the temperature danger zone and the
              2-hour / 4-hour rule, which lunchbox foods must stay cold, insulated bags, ice
              packs and Thermos flasks, and how to adjust between warm and cool terms.
            </li>
            <li>
              <strong>Policy &amp; school environment</strong> — what NZ schools typically
              allow and ban, nut-free versus nut-aware rules, cultural food days, Ka Ora, Ka
              Ako school lunches, and how to raise a question with your school.
            </li>
          </ul>

          <p className="text-gray-700 leading-relaxed text-sm bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <strong>Editorial scope.</strong> Guides on this site are general
            information, aligned with public NZ Government and Heart Foundation guidance.
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
