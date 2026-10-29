import Link from "next/link";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/pageMetadata";
import Footer from "@/components/Footer";

const BASE_URL = "https://www.kiwilunchbox.co.nz";
const OPERATOR_PHOTO = "/assets/operator-yong-jae-lee.jpg";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    path: "/about",
    locale,
    title: "About – Kiwi Lunchbox | Built by a Parent in Auckland",
    description:
      "Kiwi Lunchbox is a free school lunch planner built by Yong Jae Lee, a Senior Product Designer in Auckland. Learn how content is researched and verified.",
  });
}

export default async function AboutPage() {
  const locale = await getLocale();
  const t = await getTranslations();

  const creatorJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Yong Jae Lee",
    jobTitle: "Senior Product Designer",
    image: `${BASE_URL}${OPERATOR_PHOTO}`,
    url: "https://www.linkedin.com/in/francescolee/",
    sameAs: ["https://www.linkedin.com/in/francescolee/"],
    worksFor: {
      "@type": "Organization",
      name: "Kiwi Lunchbox",
      url: BASE_URL,
    },
  };

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(creatorJsonLd).replace(/</g, "\\u003c") }}
      />

      {/* Hero */}
      <section className="bg-[#F7F9FC] pt-24 pb-16 px-4 text-center">
        <p className="text-[#366A1B] font-semibold text-sm uppercase tracking-widest mb-4">About</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          A lunch planner built by a parent, for parents
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
          Free, practical, and made with real NZ supermarket ingredients.
        </p>
      </section>

      {/* About the Creator */}
      <section className="max-w-5xl mx-auto py-20 px-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 items-start">
          <div className="md:col-span-3 bg-[#F7F9FC] rounded-3xl p-10">
            <h2 className="text-2xl font-bold text-[#366A1B] mb-4">Hi, I&apos;m Yong Jae Lee.</h2>
            <p className="text-gray-700 text-lg leading-relaxed mb-4">
              I&apos;m a Senior Product Designer based in Auckland. Every morning I&apos;d find myself standing in front of the fridge, wondering what to pack in my child&apos;s lunchbox &mdash; and every weekend I&apos;d stress about what groceries to buy for the week ahead.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              I wanted to make proper, balanced lunches using ingredients actually available at Woolworths and Pak&apos;nSave &mdash; without spending 20 minutes each night planning. So I built Kiwi Lunchbox: a free tool that generates a week of school lunches in seconds, complete with shopping lists and price estimates.
            </p>
            {/* 🔴 09-29: 「both columns are read weekly」 — 수집기(update_prices.yml)는 New World 열까지 셋을 매주 읽는다.
                5월 라운드 매장도 「those branches」(Botany·Meadowlands까지 읽혔다)가 아니라 priceIndex.json의 checkedAt 두 곳이다. */}
            <p className="text-gray-600 leading-relaxed mb-4">
              I&apos;m based in East Auckland and do most of our family shopping at Pak&apos;nSave, split fairly evenly between the Ormiston and Botany stores, with the odd top-up at Woolworths Meadowlands or the Tai Ping Asian grocer. Being a Korean family, the rice and nori for my daughter&apos;s onigiri come from the Korean grocer and the furikake from the Japanese one &mdash; so the prices and examples across this site come from the shops I actually push a trolley around. The May 2026 round of the price index was walked in store at Pak&apos;nSave Ormiston and Woolworths Ormiston. Since then the Woolworths, Pak&apos;nSave and New World columns are all read weekly from each chain&apos;s own online shop &mdash; Woolworths and Pak&apos;nSave on every item, New World on most of them &mdash; that is what makes a weekly refresh possible, and it is spelled out on the <Link href={`/${locale}/price-index`} className="underline">Price Index</Link> page along with what it costs in accuracy.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              This is a solo project. There&apos;s no team, no investors, no sponsored content. Just a parent building something useful.
            </p>
            <p className="text-gray-600 leading-relaxed">
              <strong>🔖 What&apos;s a bit different here:</strong> each Monday the Woolworths and New World mailers are transcribed and I record which specials match a product the planner actually prices, at the same pack size, checked against that product&apos;s own online listing. The planner&apos;s <em>&quot;Rank by cost after this week&apos;s specials&quot;</em> option &mdash; on by default &mdash; then ranks lunches by what they cost after those specials, so cheaper lunches come up more often. It ranks; it does not build the week around the mailer, and most advertised specials don&apos;t clear the matching bar (the <Link href={`/${locale}/faq`} className="underline">FAQ</Link> explains why).
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="bg-[#F7F9FC] rounded-3xl p-8">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative w-32 h-32 rounded-full overflow-hidden mb-4 ring-4 ring-white shadow-md">
                  <Image
                    src={OPERATOR_PHOTO}
                    alt="Yong Jae Lee, the parent and Senior Product Designer who builds and runs Kiwi Lunchbox in Auckland"
                    fill
                    className="object-cover object-top"
                    sizes="128px"
                  />
                </div>
                <p className="font-bold text-[#1a1a1a] text-lg">Yong Jae Lee</p>
                <p className="text-sm text-[#366A1B]">Senior Product Designer</p>
                <p className="text-xs text-gray-500">Auckland, New Zealand</p>
              </div>
              <div className="space-y-3 text-sm">
                <a
                  href="https://www.linkedin.com/in/francescolee/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#366A1B] hover:underline"
                >
                  <span>in</span> LinkedIn Profile
                </a>
                <a
                  href="mailto:kiwilunchboxplanner@gmail.com"
                  className="flex items-center gap-2 text-[#366A1B] hover:underline"
                >
                  <span>@</span> kiwilunchboxplanner@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Kiwi Lunchbox */}
      <section className="bg-[#F7F9FC] py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#366A1B] font-semibold text-sm uppercase tracking-widest text-center mb-3">{t("section_why_us")}</p>
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
        <p className="text-[#366A1B] font-semibold text-sm uppercase tracking-widest text-center mb-3">Editorial Standards</p>
        <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-3 text-center">How I Research Content</h2>
        <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12 leading-relaxed">
          Every piece of content on this site goes through a consistent research and verification process.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              num: "1",
              title: "NZ health guidelines first",
              content: (
                <p className="text-gray-500 text-sm leading-relaxed">
                  All nutrition content is benchmarked against the{" "}
                  <a href="https://www.health.govt.nz/publications/food-and-nutrition-guidelines-for-healthy-children-and-young-people-aged-2-18-years-a-background" target="_blank" rel="noopener noreferrer" className="text-[#366A1B] hover:underline">
                    Ministry of Health NZ Healthy Eating Guidelines
                  </a>{" "}
                  and the{" "}
                  <a href="https://www.heartfoundation.org.nz/" target="_blank" rel="noopener noreferrer" className="text-[#366A1B] hover:underline">
                    Heart Foundation NZ
                  </a>{" "}
                  food guidance. I do not publish nutrition claims without a credible NZ or international source.
                </p>
              ),
            },
            {
              num: "2",
              // 🔴 2026-09-09 외부 감사 — 제목은 "Tested"인데 본문은 "재고를 확인한다"였다.
              //    재고 확인은 시험이 아니다. 본문이 맞으므로 제목을 본문에 맞춘다.
              title: "Checked against NZ supermarket stock",
              content: (
                <p className="text-gray-500 text-sm leading-relaxed">
                  Every recipe is checked for ingredient availability at Woolworths and Pak&apos;nSave. I don&apos;t recommend products that aren&apos;t reliably stocked in New Zealand supermarkets. Price estimates are based on regular shelf prices, refreshed weekly.
                </p>
              ),
            },
            {
              num: "3",
              title: "Allergy information cross-referenced",
              content: (
                <p className="text-gray-500 text-sm leading-relaxed">
                  Allergy-related content is cross-referenced against product labels, manufacturer allergen statements, and{" "}
                  <a href="https://www.allergy.org.nz/" target="_blank" rel="noopener noreferrer" className="text-[#366A1B] hover:underline">
                    Allergy New Zealand
                  </a>{" "}
                  guidance. However, I always advise readers to check product labels directly &mdash; formulations change.
                </p>
              ),
            },
            {
              num: "4",
              title: "School context is NZ-specific",
              content: (
                <p className="text-gray-500 text-sm leading-relaxed">
                  NZ primary schools vary in their lunchbox policies. I note where school rules may differ (e.g., nut-free zones, no glass containers, no hot food without insulated containers). When in doubt, check your school&apos;s lunchbox policy directly.
                </p>
              ),
            },
            {
              num: "5",
              title: "Regular review cycle",
              content: (
                <p className="text-gray-500 text-sm leading-relaxed">
                  Articles are reviewed when MoH guidelines change, when prices shift substantially, or when a reader flags an issue. Each article shows its publication date and last review date.
                </p>
              ),
            },
            {
              num: "6",
              title: "Corrections welcome",
              content: (
                <p className="text-gray-500 text-sm leading-relaxed">
                  I take accuracy seriously. If you find an error &mdash; whether a wrong price, an incorrect allergy tag, or outdated school policy &mdash; please{" "}
                  <Link href={`/${locale}/contact`} className="text-[#366A1B] hover:underline">
                    contact me
                  </Link>
                  . I aim to respond and update within 48 hours.
                </p>
              ),
            },
          ].map((item) => (
            <div key={item.num} className="bg-[#F7F9FC] rounded-3xl p-7">
              <div className="flex items-start gap-3 mb-3">
                <span className="bg-[#366A1B] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
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
            <li>This site is <strong>not affiliated with Woolworths, Pak&apos;nSave, or any supermarket</strong>. Price data is collected independently. I do not receive payment for product recommendations.</li>
            <li>I am <strong>not responsible for allergic reactions</strong>. Always verify product labels yourself. Manufacturers change formulations and cross-contamination risks vary.</li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#366A1B] py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-3xl font-extrabold text-white mb-4">{t("about_community_title")}</h3>
          <p className="text-white/80 mb-8 leading-relaxed">
            {t("about_community_desc")}
          </p>
          <Link
            href={`/${locale}/planner`}
            className="bg-white hover:bg-[#F7F9FC] text-[#366A1B] font-bold py-4 px-10 rounded-full text-lg transition-colors shadow-lg inline-block"
          >
            {t("about_start_btn")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer locale={locale} />
    </main>
  );
}
