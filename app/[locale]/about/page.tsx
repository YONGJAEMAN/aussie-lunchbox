import Link from "next/link";
import { getLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

const BASE_URL = "https://www.aussielunchbox.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const canonical = `${BASE_URL}/${locale}/about`;
  return {
    title: "About – Aussie Lunchbox | Built by a Parent",
    description:
      "Aussie Lunchbox is a free school lunch planner built by Yong Jae Lee, a Senior Product Designer. Learn how content is researched and verified for Australian families.",
    alternates: {
      canonical,
      languages: {
        "x-default": `${BASE_URL}/en/about`,
        en: `${BASE_URL}/en/about`,
        ko: `${BASE_URL}/ko/about`,
        "zh-CN": `${BASE_URL}/zh/about`,
      },
    },
    openGraph: { url: canonical },
  };
}

export default async function AboutPage() {
  const locale = await getLocale();
  const t = await getTranslations();

  const creatorJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Yong Jae Lee",
    jobTitle: "Senior Product Designer",
    url: "https://www.linkedin.com/in/francescolee/",
    sameAs: ["https://www.linkedin.com/in/francescolee/"],
    worksFor: {
      "@type": "Organization",
      name: "Aussie Lunchbox",
      url: BASE_URL,
    },
  };

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(creatorJsonLd) }}
      />

      {/* Hero */}
      <section className="bg-[#FFF8EE] pt-24 pb-16 px-4 text-center">
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest mb-4">About</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          A lunch planner built by a parent, for parents
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
          Free, practical, and made with real Australian supermarket ingredients.
        </p>
      </section>

      {/* About the Creator */}
      <section className="max-w-5xl mx-auto py-20 px-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 items-start">
          <div className="md:col-span-3 bg-[#FFF8EE] rounded-3xl p-10">
            <h2 className="text-2xl font-bold text-[#7B3F00] mb-4">Hi, I&apos;m Yong Jae Lee.</h2>
            <p className="text-gray-700 text-lg leading-relaxed mb-4">
              I&apos;m a Senior Product Designer based in Auckland. I built Aussie Lunchbox alongside Kiwi Lunchbox &mdash; the same tool, adapted for Australian supermarkets and dietary guidelines, because the morning lunchbox stress is the same problem on both sides of the Tasman.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              I wanted parents to be able to pack proper, balanced lunches using ingredients actually available at Woolworths and Coles &mdash; without spending 20 minutes each night planning. So I built this: a free tool that generates a week of school lunches in seconds, with shopping lists and price estimates.
            </p>
            <p className="text-gray-600 leading-relaxed">
              This is a solo project. There&apos;s no team, no investors, no sponsored content. Just a parent building something useful.
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="bg-[#FFF8EE] rounded-3xl p-8">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-[#7B3F00] flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  YJ
                </div>
                <div>
                  <p className="font-bold text-[#1a1a1a] text-lg">Yong Jae Lee</p>
                  <p className="text-sm text-[#F5A623]">Senior Product Designer</p>
                  <p className="text-xs text-gray-400">Auckland</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <a
                  href="https://www.linkedin.com/in/francescolee/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#7B3F00] hover:underline"
                >
                  <span>in</span> LinkedIn Profile
                </a>
                <a
                  href="mailto:yongjaeman@gmail.com"
                  className="flex items-center gap-2 text-[#7B3F00] hover:underline"
                >
                  <span>@</span> yongjaeman@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Aussie Lunchbox */}
      <section className="bg-[#FFF8EE] py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest text-center mb-3">{t("section_why_us")}</p>
          <h2 className="text-3xl font-extrabold text-center text-[#1a1a1a] mb-12">{t("about_why_title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: "🚀", title: t("about_feat1_title"), desc: t("about_feat1_desc") },
              { icon: "🌿", title: t("about_feat2_title"), desc: t("about_feat2_desc") },
              { icon: "🥗", title: t("about_feat3_title"), desc: t("about_feat3_desc") },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-3xl p-8 text-center shadow-sm hover:-translate-y-1 transition-transform">
                <div className="text-5xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-[#1a1a1a] text-xl mb-3">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How I Research Content */}
      <section className="max-w-5xl mx-auto py-20 px-4">
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest text-center mb-3">Editorial Standards</p>
        <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-3 text-center">How I Research Content</h2>
        <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12 leading-relaxed">
          Every piece of content on this site goes through a consistent research and verification process.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              num: "1",
              title: "Australian health guidelines first",
              content: (
                <p className="text-gray-500 text-sm leading-relaxed">
                  All nutrition content is benchmarked against the{" "}
                  <a href="https://www.eatforhealth.gov.au/guidelines" target="_blank" rel="noopener noreferrer" className="text-[#F5A623] hover:underline">
                    Australian Dietary Guidelines (Eat for Health)
                  </a>{" "}
                  and the{" "}
                  <a href="https://www.heartfoundation.org.au/" target="_blank" rel="noopener noreferrer" className="text-[#F5A623] hover:underline">
                    National Heart Foundation of Australia
                  </a>{" "}
                  food guidance. I do not publish nutrition claims without a credible Australian or international source.
                </p>
              ),
            },
            {
              num: "2",
              title: "Tested with Australian ingredients",
              content: (
                <p className="text-gray-500 text-sm leading-relaxed">
                  Every recipe is checked for ingredient availability at Woolworths and Coles. I don&apos;t recommend products that aren&apos;t reliably stocked in Australian supermarkets. Price estimates are based on regular shelf prices, updated quarterly.
                </p>
              ),
            },
            {
              num: "3",
              title: "Allergy information cross-referenced",
              content: (
                <p className="text-gray-500 text-sm leading-relaxed">
                  Allergy-related content is cross-referenced against product labels, manufacturer allergen statements, and{" "}
                  <a href="https://allergyfacts.org.au/" target="_blank" rel="noopener noreferrer" className="text-[#F5A623] hover:underline">
                    Allergy &amp; Anaphylaxis Australia
                  </a>{" "}
                  guidance. However, I always advise readers to check product labels directly &mdash; formulations change.
                </p>
              ),
            },
            {
              num: "4",
              title: "School context is AU-specific",
              content: (
                <p className="text-gray-500 text-sm leading-relaxed">
                  Australian primary schools vary in their lunchbox policies. I note where school rules may differ (e.g., nut-free zones, no glass containers, no hot food without insulated containers). When in doubt, check your school&apos;s lunchbox policy directly.
                </p>
              ),
            },
            {
              num: "5",
              title: "Regular review cycle",
              content: (
                <p className="text-gray-500 text-sm leading-relaxed">
                  Articles are reviewed when Australian dietary guidelines change, when prices shift substantially, or when a reader flags an issue. Each article shows its publication date and last review date.
                </p>
              ),
            },
            {
              num: "6",
              title: "Corrections welcome",
              content: (
                <p className="text-gray-500 text-sm leading-relaxed">
                  I take accuracy seriously. If you find an error &mdash; whether a wrong price, an incorrect allergy tag, or outdated school policy &mdash; please{" "}
                  <Link href={`/${locale}/contact`} className="text-[#F5A623] hover:underline">
                    contact me
                  </Link>
                  . I aim to respond and update within 48 hours.
                </p>
              ),
            },
          ].map((item) => (
            <div key={item.num} className="bg-[#FFF8EE] rounded-3xl p-7">
              <div className="flex items-start gap-3 mb-3">
                <span className="bg-[#7B3F00] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.num}
                </span>
                <h3 className="font-bold text-[#1a1a1a]">{item.title}</h3>
              </div>
              {item.content}
            </div>
          ))}
        </div>
      </section>

      {/* What This Site Is NOT */}
      <section className="max-w-5xl mx-auto py-12 px-4">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-7">
          <h3 className="font-bold text-amber-800 mb-3">Important: What This Site Is NOT</h3>
          <ul className="text-amber-700 text-sm space-y-2 leading-relaxed">
            <li>This is <strong>not a medical or dietetic service</strong>. Content is general guidance for healthy children, not personalised nutrition advice. If your child has a medical condition or complex dietary needs, consult a registered dietitian.</li>
            <li>This site is <strong>not affiliated with Woolworths, Coles, or any supermarket</strong>. Price data is collected independently. I do not receive payment for product recommendations.</li>
            <li>I am <strong>not responsible for allergic reactions</strong>. Always verify product labels yourself. Manufacturers change formulations and cross-contamination risks vary.</li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#7B3F00] py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-3xl font-extrabold text-white mb-4">{t("about_community_title")}</h3>
          <p className="text-white/80 mb-8 leading-relaxed">
            {t("about_community_desc")}
          </p>
          <Link
            href={`/${locale}/planner`}
            className="bg-[#F5A623] hover:bg-white hover:text-[#7B3F00] text-white font-bold py-4 px-10 rounded-full text-lg transition-colors shadow-lg inline-block"
          >
            {t("about_start_btn")}
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
