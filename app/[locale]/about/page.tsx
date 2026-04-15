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
  const canonical = `${BASE_URL}/${locale}/about`;
  return {
    title: "About Us – Aussie Lunchbox | AU School Lunch Planner",
    description: "Aussie Lunchbox is built by Australian parents for AU families. Learn who we are, how we verify nutrition information, and our editorial standards.",
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

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#FFF8EE] pt-24 pb-16 px-4 text-center">
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest mb-4">{t("section_our_story")}</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          {t("about_title")}
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
          {t("about_subtitle")}
        </p>
      </section>

      {/* Origin Story */}
      <section className="max-w-5xl mx-auto py-20 px-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 items-center">
          <div className="md:col-span-3 bg-[#FFF8EE] rounded-3xl p-10">
            <h2 className="text-2xl font-bold text-[#F5A623] mb-4">{t("about_greeting")}</h2>
            <p className="text-gray-700 text-lg leading-relaxed mb-4">
              {t("about_intro")}
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              {t("about_mission1")}
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              {t("about_mission2")}
            </p>
            <p className="text-gray-600 leading-relaxed">
              {t("about_founding_story")}
            </p>
          </div>
          <div className="md:col-span-2">
            <img
              src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop"
              alt="Fresh Australian ingredients"
              className="rounded-3xl shadow-lg w-full object-cover"
            />
            <p className="text-center text-sm text-gray-400 mt-2">{t("about_img_caption")}</p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-[#FFF8EE] py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest text-center mb-3">{t("section_why_us")}</p>
          <h2 className="text-3xl font-extrabold text-center text-[#1a1a1a] mb-12">{t("about_why_title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "🚀",
                title: t("about_feat1_title"),
                desc: t("about_feat1_desc"),
              },
              {
                icon: "🌿",
                title: t("about_feat2_title"),
                desc: t("about_feat2_desc"),
              },
              {
                icon: "🥗",
                title: t("about_feat3_title"),
                desc: t("about_feat3_desc"),
              },
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

      {/* Who We Are */}
      <section className="max-w-5xl mx-auto py-20 px-4">
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest text-center mb-3">{t("section_the_team")}</p>
        <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-3 text-center">{t("about_team_title")}</h2>
        <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12 leading-relaxed">
          {t("about_team_desc")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[
            {
              initial: "S",
              name: "Sarah Mitchell",
              role: "Co-founder & recipe lead",
              bio: "Mum of two in Sydney. Former home economics teacher turned food writer. Tests every recipe at home before it goes on the site. Insists on real Australian supermarket availability.",
            },
            {
              initial: "D",
              name: "David Chen",
              role: "Content & nutrition review",
              bio: "Dad of three in Melbourne. Spent 8 years working in public health nutrition before switching to food communication. Reviews all nutrition claims against Australian Dietary Guidelines.",
            },
            {
              initial: "A",
              name: "Amy Roberts",
              role: "Allergy & safety editor",
              bio: "Parent of a child with multiple food allergies in Brisbane. Advocates for clearer food labelling and reviews all allergy-related content for accuracy and safety.",
            },
            {
              initial: "L",
              name: "Lisa Park",
              role: "Budget & meal prep specialist",
              bio: "Mum of three in Perth. Former financial counsellor who now focuses on making healthy school lunches affordable. Creates all budget guides and tracks Woolworths/Coles pricing quarterly.",
            },
            {
              initial: "T",
              name: "Tom Nguyen",
              role: "Cultural food advisor",
              bio: "Dad of two in Sydney. Grew up between Vietnamese and Australian food cultures. Ensures our recipes reflect Australia's multicultural families and helps adapt traditional dishes for school lunchboxes.",
            },
          ].map((p) => (
            <div key={p.name} className="bg-[#FFF8EE] rounded-3xl p-7 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#7B3F00] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {p.initial}
                </div>
                <div>
                  <p className="font-semibold text-[#1a1a1a] text-sm">{p.name}</p>
                  <p className="text-xs text-[#F5A623]">{p.role}</p>
                </div>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">{p.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How We Source Our Information */}
      <section className="bg-[#FFF8EE] py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest text-center mb-3">{t("section_editorial")}</p>
          <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-3 text-center">{t("about_editorial_title")}</h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12 leading-relaxed">
            {t("about_editorial_desc")}
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
                      Australian Dietary Guidelines
                    </a>{" "}
                    and the{" "}
                    <a href="https://www.heartfoundation.org.au/" target="_blank" rel="noopener noreferrer" className="text-[#F5A623] hover:underline">
                      Heart Foundation Australia
                    </a>{" "}
                    food guidance. We do not accept nutrition claims without a credible Australian or international source.
                  </p>
                ),
              },
              {
                num: "2",
                title: "Tested with Australian ingredients",
                content: (
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Every recipe is checked for ingredient availability at Woolworths and Coles. We don&apos;t recommend products or ingredients that aren&apos;t reliably stocked in Australian supermarkets. Price estimates are based on regular shelf prices, updated quarterly.
                  </p>
                ),
              },
              {
                num: "3",
                title: "Allergy information verified",
                content: (
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Allergy-related content is reviewed by Amy Roberts, our allergy editor and parent of a multi-allergen child. We cross-reference product labels, manufacturer allergen statements, and{" "}
                    <a href="https://www.allergyfacts.org.au/" target="_blank" rel="noopener noreferrer" className="text-[#F5A623] hover:underline">
                      Allergy & Anaphylaxis Australia
                    </a>{" "}
                    guidance. However, we always advise readers to check product labels directly — formulations change.
                  </p>
                ),
              },
              {
                num: "4",
                title: "School context is AU-specific",
                content: (
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Australian primary schools vary in their lunchbox policies. We note where school rules may differ (e.g., nut-free zones, no glass containers, no hot food without insulated containers). When in doubt, check your school&apos;s lunchbox policy directly with the office.
                  </p>
                ),
              },
              {
                num: "5",
                title: "Regular review cycle",
                content: (
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Articles are reviewed when Australian dietary guidelines change, when significant new research is published, when prices shift substantially, or when a reader flags an issue. Each article shows its publication date and last review date.
                  </p>
                ),
              },
              {
                num: "6",
                title: "Corrections policy",
                content: (
                  <p className="text-gray-500 text-sm leading-relaxed">
                    We take accuracy seriously. If you find an error — whether a wrong price, an incorrect allergy tag, or outdated school policy — please{" "}
                    <Link href={`/${locale}/contact`} className="text-[#F5A623] hover:underline">
                      contact us
                    </Link>
                    . We aim to respond and update within 48 hours.
                  </p>
                ),
              },
            ].map((item) => (
              <div key={item.num} className="bg-white rounded-3xl p-7 shadow-sm">
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
        </div>
      </section>

      {/* Advisory Standards */}
      <section className="max-w-5xl mx-auto py-12 px-4">
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest text-center mb-3">{t("about_advisory_title")}</p>
        <p className="text-gray-500 text-center max-w-2xl mx-auto mb-8 leading-relaxed">{t("about_advisory_desc")}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#FFF8EE] rounded-3xl p-7">
            <h3 className="font-bold text-[#7B3F00] mb-2">{t("about_advisor1_name")}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{t("about_advisor1_desc")}</p>
          </div>
          <div className="bg-[#FFF8EE] rounded-3xl p-7">
            <h3 className="font-bold text-[#7B3F00] mb-2">{t("about_advisor2_name")}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{t("about_advisor2_desc")}</p>
          </div>
        </div>
      </section>

      {/* What We Are Not */}
      <section className="max-w-5xl mx-auto py-12 px-4">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-7">
          <h3 className="font-bold text-amber-800 mb-3">{t("about_important_title")}</h3>
          <ul className="text-amber-700 text-sm space-y-2 leading-relaxed">
            <li>❌ We are <strong>not a medical or dietetic service</strong>. Our content is general guidance for healthy children, not personalised nutrition advice. If your child has a medical condition or complex dietary needs, consult a registered dietitian.</li>
            <li>❌ We are <strong>not affiliated with Woolworths, Coles, or any supermarket</strong>. Price data is collected independently. We do not receive payment for product recommendations.</li>
            <li>❌ We are <strong>not responsible for allergic reactions</strong>. Always verify product labels yourself. Manufacturers change formulations and cross-contamination risks vary.</li>
          </ul>
        </div>
      </section>

      {/* Community CTA */}
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
