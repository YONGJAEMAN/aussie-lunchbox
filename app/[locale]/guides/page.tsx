import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GUIDE_CARDS } from "@/content/guides";
import { BRAND } from "@/lib/brand";

const BASE_URL = BRAND.SITE_URL;
const SUPPORTED_LOCALES: string[] = [...BRAND.LOCALES];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const canonical = `${BASE_URL}/${locale}/guides`;
  return {
    title: "Lunchbox Guides & Resources | Aussie Lunchbox",
    description: "In-depth guides for Australian school families — nutrition, allergies, budget planning, seasonal produce, food safety, and more.",
    alternates: {
      canonical,
      languages: {
        "x-default": `${BASE_URL}/en/guides`,
        en: `${BASE_URL}/en/guides`,
      },
    },
    openGraph: { url: canonical },
  };
}

export default async function GuidesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale)) notFound();

  const t = await getTranslations();

  const categories = [
    "All",
    "Nutrition",
    "Allergy Friendly",
    "Budget",
    "Seasonal",
    "Parenting Tips",
    "Gear & Tips",
    "Recipes",
  ];

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#FFF8EE] pt-24 pb-16 px-4 text-center">
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest mb-4">Resources</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          Lunchbox Guides & Resources
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-2 leading-relaxed">
          In-depth, expert-reviewed guides to help Australian families pack healthier, smarter school lunches.
        </p>
        <p className="text-sm text-gray-400 max-w-2xl mx-auto mb-10">
          {GUIDE_CARDS.length} comprehensive guides — updated regularly
        </p>
        {/* Category filter bar */}
        <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
          {categories.map((cat, i) => (
            <span
              key={cat}
              className={`px-4 py-1.5 rounded-full text-sm font-medium cursor-default select-none ${
                i === 0
                  ? "bg-[#7B3F00] text-white"
                  : "bg-white text-[#7B3F00] border border-orange-100"
              }`}
            >
              {cat}
            </span>
          ))}
        </div>
      </section>

      {/* Guides grid */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {GUIDE_CARDS.map((guide) => (
            <Link
              key={guide.slug}
              href={`/${locale}/guides/${guide.slug}`}
              className="bg-[#FFF8EE] rounded-3xl overflow-hidden hover:shadow-lg transition-shadow group"
            >
              <div className="relative h-48 overflow-hidden rounded-t-3xl">
                <Image
                  src={guide.image}
                  alt={guide.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 bg-[#7B3F00] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {guide.category}
                </span>
              </div>
              <div className="p-6">
                <p className="text-xs text-gray-400 mb-2">
                  {guide.date} · {guide.readTime}
                </p>
                <h2 className="text-lg font-bold text-[#1a1a1a] mb-2 leading-snug group-hover:text-[#F5A623] transition-colors">
                  {guide.title}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                  {guide.excerpt}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Editorial framework — how guides are researched */}
      <section className="bg-[#FFF8EE] py-20 px-4">
        <div className="max-w-3xl mx-auto prose prose-gray">
          <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-6">How these guides are researched</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Every guide on Aussie Lunchbox is written by{" "}
            <Link href={`/${locale}/about`} className="text-[#F5A623] underline">Yong Jae Lee</Link>
            , the solo operator of the site, and reviewed against publicly available
            Australian Government, NHMRC, Heart Foundation, and state health-department
            guidance before publishing. The aim is to translate dense official documents —
            often 40 to 100 pages — into a parent-readable framework that survives a
            Monday-morning lunchbox decision.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            The sources I lean on most often:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
            <li>
              <strong>National Health and Medical Research Council (NHMRC)</strong> —
              <em>Australian Dietary Guidelines</em> (2013), <em>Australian Guide to
              Healthy Eating</em>, and the <em>Nutrient Reference Values for Australia
              and New Zealand</em>. These are the backbone of all age-band serving
              recommendations.
            </li>
            <li>
              <strong>Heart Foundation Australia</strong> — children&apos;s nutrition
              resources, healthy eating fact sheets, and sodium / saturated fat
              recommendations. Used wherever a guide discusses heart-healthy eating
              patterns for school-age children.
            </li>
            <li>
              <strong>Food Standards Australia New Zealand (FSANZ)</strong> — particularly
              the <em>Food Standards Code Standard 1.2.3</em> and the <em>Plain English
              Allergen Labelling (PEAL)</em> guidance that became mandatory in February
              2024. Allergy guides on this site assume PEAL-format labels.
            </li>
            <li>
              <strong>State Health Departments &amp; Healthy Canteen frameworks</strong> —
              NSW Healthy School Canteen Strategy, Queensland Smart Choices Healthy Food
              and Drink Supply Strategy, Victorian Healthy Choices guidelines, WA Healthy
              Options program, SA Right Bite, Tasmania Move Well Eat Well, ACT Public
              School Food and Drink Policy, and NT Healthy Eating Guidelines. These define
              what schools serve and inform what counts as a healthy lunchbox.
            </li>
            <li>
              <strong>Allergy &amp; Anaphylaxis Australia (A&amp;AA)</strong> and{" "}
              <strong>ASCIA</strong> (Australasian Society of Clinical Immunology and
              Allergy) — ASCIA Action Plans, school-policy guidance, and the prevalence
              statistics quoted in the allergy guides.
            </li>
            <li>
              <strong>Department of Education (Federal + State)</strong> — term dates,
              healthy canteen programs, and the broader policy framework that informs
              what schools accept in lunches.
            </li>
          </ul>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mt-12 mb-4">Editorial process for each guide</h3>
          <ol className="list-decimal pl-6 text-gray-700 space-y-2 mb-6">
            <li>
              <strong>Topic selection</strong> — driven by recurring questions from parent
              feedback (contact-form messages), gaps in the existing guide library, or
              changes in Australian public health guidance (e.g., the PEAL allergen
              labelling transition).
            </li>
            <li>
              <strong>Source review</strong> — I work through the latest version of the
              relevant NHMRC / FSANZ / state health document, plus any peer-reviewed
              Australian-specific data referenced inside.
            </li>
            <li>
              <strong>Drafting</strong> — guides aim for 1,500–3,000 words and translate
              official guidance into practical decisions a parent can make at a
              Woolworths or Coles aisle, or a kitchen counter.
            </li>
            <li>
              <strong>Cross-check</strong> — facts that affect food safety, allergy, or
              nutrient adequacy are re-verified against the source before publishing.
              Any specific numerical threshold (sugar 15g per serve, sodium 400mg per
              100g, iron 10mg per day, etc.) traces back to a named Australian source in
              the References section.
            </li>
            <li>
              <strong>Last-reviewed dating</strong> — each guide carries a publish date
              and a last-reviewed date. Guides are reviewed annually at minimum, sooner
              when the underlying guidance changes.
            </li>
            <li>
              <strong>Corrections process</strong> — readers can flag errors through the{" "}
              <Link href={`/${locale}/contact`} className="text-[#F5A623] underline">Contact page</Link>
              . Verified corrections are applied within 48 hours and the last-reviewed
              date is updated. Substantial factual corrections are noted in the article
              footer.
            </li>
          </ol>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mt-12 mb-4">Who these guides are for</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Each guide is written for adults responsible for school-age children in
            Australia. The default reader assumption is:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
            <li>You have a child between Foundation / Prep and Year 12 in an Australian school (government, Catholic, or independent).</li>
            <li>You are the parent, caregiver, grandparent, or legal guardian who actually packs the lunchbox.</li>
            <li>You are not looking for medical or allergy advice tailored to your child — for that, the right step is a GP visit, an Accredited Practising Dietitian (APD), or a clinical immunology/allergy specialist.</li>
            <li>You are interested in <em>practical</em> decisions: which ingredient to choose, which day of the week to do prep, which supermarket has the better price this fortnight.</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mb-6">
            If a guide drifts into territory that should be handled by a clinician (a
            child with diagnosed coeliac, anaphylaxis, growth concerns, or a sensory
            feeding condition), the guide says so explicitly and points to the right
            professional. The site does not pretend to substitute for medical advice.
          </p>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mt-12 mb-4">What each category covers</h3>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
            <li>
              <strong>Nutrition</strong> — the five Australian food groups, age-band
              serving guidance, Green/Amber/Red food classification under state healthy
              canteen frameworks, and nutrient-specific deep dives (iron, calcium, protein).
            </li>
            <li>
              <strong>Allergy &amp; intolerance</strong> — nut-free policies in Australian
              schools, egg-free lunches, dairy alternatives, FSANZ PEAL label reading,
              school policy navigation, and ASCIA Action Plan overview.
            </li>
            <li>
              <strong>Budget &amp; supermarket</strong> — Woolworths vs Coles vs ALDI vs
              IGA price tracking, batch-cooking economics, and seasonal price patterns
              for Australian produce.
            </li>
            <li>
              <strong>Seasonal produce</strong> — what is in season month-by-month in
              Australia, state timing differences (QLD vs VIC vs WA), term-by-term
              lunchbox themes, and storage strategies for the Australian climate.
            </li>
            <li>
              <strong>Safety &amp; gear</strong> — Australian summer heat (35–40°C)
              food safety, insulated bag comparisons, container material safety
              (polypropylene / silicone / stainless steel), and dishwasher / microwave use.
            </li>
            <li>
              <strong>Policy &amp; school environment</strong> — Department of Education
              programmes, Healthy Heart Award equivalents, and the practical implications
              of school food-policy letters most parents receive but never fully read.
            </li>
          </ul>

          <p className="text-gray-700 leading-relaxed text-sm bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <strong>Editorial scope.</strong> Guides on this site are general
            information, aligned with public Australian Government, NHMRC, and Heart
            Foundation guidance. They are not personalised medical or dietary advice.
            For specific concerns about your child&apos;s growth, allergies, nutrient
            adequacy, or feeding behaviour, please consult your GP, paediatrician, or
            an Accredited Practising Dietitian. See the{" "}
            <Link href={`/${locale}/terms`} className="text-[#F5A623] underline">Terms</Link>
            {" "}and{" "}
            <Link href={`/${locale}/policies`} className="text-[#F5A623] underline">Privacy Policy</Link>
            {" "}for the full disclaimer and data-handling overview.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#7B3F00] py-20 px-4 text-center">
        <h2 className="text-3xl font-extrabold text-white mb-3">
          {t("blog_cta_title")}
        </h2>
        <p className="text-white/80 mb-8 max-w-md mx-auto">
          {t("blog_cta_desc")}
        </p>
        <Link
          href={`/${locale}/planner`}
          className="inline-block bg-[#F5A623] hover:bg-white hover:text-[#7B3F00] text-white font-bold px-10 py-4 rounded-full transition-colors shadow-lg"
        >
          {t("blog_cta_btn")}
        </Link>
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
                <Link href={`/${locale}/guides`} className="block hover:text-white transition-colors">Guides</Link>
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
