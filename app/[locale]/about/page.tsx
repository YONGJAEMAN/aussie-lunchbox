import Link from "next/link";
import { getLocale } from "next-intl/server";
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

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#FFF8EE] pt-24 pb-16 px-4 text-center">
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest mb-4">Our Story</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          About Aussie Lunchbox
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
          Making school lunches easier, healthier, and stress-free for Australian families.
        </p>
      </section>

      {/* Origin Story */}
      <section className="max-w-5xl mx-auto py-20 px-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 items-center">
          <div className="md:col-span-3 bg-[#FFF8EE] rounded-3xl p-10">
            <h2 className="text-2xl font-bold text-[#F5A623] mb-4">G&apos;day!</h2>
            <p className="text-gray-700 text-lg leading-relaxed mb-4">
              Welcome to <strong>Aussie Lunchbox</strong>, your trusted partner in simplifying school mornings for Australian families.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              We understand the daily challenge of packing lunchboxes that are nutritious, affordable, and actually eaten by kids. Our mission is to empower parents with balanced meal plans that reduce decision fatigue and food waste.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Started in Sydney by parents who were tired of googling the same lunchbox ideas every Sunday night. Everyone involved has school-age children in Australia.
            </p>
          </div>
          <div className="md:col-span-2">
            <img
              src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop"
              alt="Fresh Australian ingredients"
              className="rounded-3xl shadow-lg w-full object-cover"
            />
            <p className="text-center text-sm text-gray-400 mt-2">Fresh, local Australian ingredients</p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-[#FFF8EE] py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest text-center mb-3">Why Us</p>
          <h2 className="text-3xl font-extrabold text-center text-[#1a1a1a] mb-12">Why Choose Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "🚀",
                title: "Streamlined Mornings",
                desc: "Generate a complete weekly plan in seconds. Say goodbye to the morning rush and hello to organized, stress-free starts to your day.",
              },
              {
                icon: "🌿",
                title: "Sustainable & Local",
                desc: "We prioritize seasonal ingredients accessible in Australian supermarkets to help you reduce food miles and minimize waste.",
              },
              {
                icon: "🥗",
                title: "Nutritionally Balanced",
                desc: "Our algorithms ensure a mix of protein, fresh produce, and treats, aligned with Australian Dietary Guidelines for active kids.",
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
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest text-center mb-3">The Team</p>
        <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-3 text-center">Who Runs Aussie Lunchbox</h2>
        <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12 leading-relaxed">
          We&apos;re not a faceless content farm. Aussie Lunchbox was started in Sydney by parents who were tired of googling the same lunchbox ideas every Sunday night. Everyone involved has school-age children in Australia.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest text-center mb-3">Editorial Standards</p>
          <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-3 text-center">How We Research & Verify Content</h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12 leading-relaxed">
            Everything we publish goes through a consistent review process. Here&apos;s exactly how we work.
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

      {/* What We Are Not */}
      <section className="max-w-5xl mx-auto py-12 px-4">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-7">
          <h3 className="font-bold text-amber-800 mb-3">Important: what Aussie Lunchbox is not</h3>
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
          <h3 className="text-3xl font-extrabold text-white mb-4">Join Our Community</h3>
          <p className="text-white/80 mb-8 leading-relaxed">
            We are constantly improving based on your feedback. Together, let&apos;s make healthy eating the easy choice for Australian kids.
          </p>
          <Link
            href={`/${locale}/planner`}
            className="bg-[#F5A623] hover:bg-white hover:text-[#7B3F00] text-white font-bold py-4 px-10 rounded-full text-lg transition-colors shadow-lg inline-block"
          >
            Start Planning Now
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
              <p className="text-gray-400 text-sm leading-relaxed">Free school lunch planner for Australian families.</p>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4">Product</p>
              <div className="space-y-3 text-gray-400 text-sm">
                <Link href={`/${locale}/planner`} className="block hover:text-white transition-colors">Planner</Link>
                <Link href={`/${locale}/blog`} className="block hover:text-white transition-colors">Blog</Link>
                <Link href={`/${locale}/faq`} className="block hover:text-white transition-colors">FAQ</Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4">Company</p>
              <div className="space-y-3 text-gray-400 text-sm">
                <Link href={`/${locale}/about`} className="block hover:text-white transition-colors">About</Link>
                <Link href={`/${locale}/contact`} className="block hover:text-white transition-colors">Contact</Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4">Legal</p>
              <div className="space-y-3 text-gray-400 text-sm">
                <Link href={`/${locale}/terms`} className="block hover:text-white transition-colors">Terms</Link>
                <Link href={`/${locale}/policies`} className="block hover:text-white transition-colors">Privacy</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Aussie Lunchbox — The Lunch Planner for Australian Families.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
