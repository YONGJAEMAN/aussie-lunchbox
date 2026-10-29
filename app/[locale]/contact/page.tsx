import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import ContactForm from "./ContactForm";
import { buildPageMetadata } from "@/lib/seo/pageMetadata";
import Footer from "@/components/Footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    path: "/contact",
    locale,
    title: "Contact – Aussie Lunchbox | Reach the Solo Operator Directly",
    description:
      "A free school lunch planner for Australian families, run as a solo project by Yong Jae Lee in Auckland, New Zealand. Corrections, feedback and data requests reach me directly.",
  });
}

export default async function ContactPage() {
  const locale = await getLocale();
  const t = await getTranslations();

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#F7F9FC] pt-24 pb-16 px-4 text-center">
        <p className="text-[#8C4A00] font-semibold text-sm uppercase tracking-widest mb-4">{t("section_get_in_touch")}</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          {t("contact_title")}
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
          {t("contact_subtitle")}
        </p>
      </section>

      {/* Content */}
      <section className="max-w-5xl mx-auto py-20 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Left: contact info */}
          <div>
            <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-4">{t("contact_get_in_touch")}</h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              {t("contact_desc")}
            </p>
            <div className="space-y-4 text-gray-700 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F7F9FC] flex items-center justify-center text-lg">✉️</div>
                <span className="text-sm">{t("contact_email_addr")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F7F9FC] flex items-center justify-center text-lg">📍</div>
                <span className="text-sm">{t("contact_location")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F7F9FC] flex items-center justify-center text-lg">🕐</div>
                <span className="text-sm">{t("contact_hours")}</span>
              </div>
            </div>
            <div className="bg-[#F7F9FC] rounded-3xl p-5 text-gray-600 text-sm leading-relaxed">
              {t("contact_support_tip")}
            </div>
          </div>

          {/* Right: contact form (client component) */}
          <div className="bg-[#F7F9FC] rounded-3xl p-8">
            <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-6">{t("contact_form_title")}</h2>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Editorial Corrections */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-sm text-amber-800">
          <strong>{t("contact_editorial_title")}</strong> {t("contact_editorial_desc")}
        </div>
      </section>

      {/* About the operator + scope of enquiry */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="prose prose-gray max-w-none">
          <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-6">Who answers your email</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Every message sent through this page is read by <strong>Yong Jae Lee</strong>, the
            solo operator of Aussie Lunchbox. There is no support team, no ticketing system,
            and no virtual assistant in front of the inbox. Yong Jae is a Senior Product
            Designer based in Auckland and a parent of school-age children — the same
            audience the site is built for.
          </p>
          <p className="text-gray-700 leading-relaxed mb-8">
            This direct line is part of what makes Aussie Lunchbox sustainable as a solo
            project: feedback from parents shapes which articles get written next,
            which allergy filters get refined, and which supermarket prices get checked
            most often. If you have already read the{" "}
            <Link href={`/${locale}/about`} className="text-[#8C4A00] underline">About page</Link>
            {" "}and the{" "}
            <Link href={`/${locale}/faq`} className="text-[#8C4A00] underline">FAQ</Link>,
            this email goes straight to me.
          </p>

          {/* 🔴 09-29: 「five common categories」라 했는데 폼(ContactForm.tsx)의 제목 선택지는 넷이고,
              아래 목록은 선택지와 짝이 안 맞았다(없는 「Privacy enquiry」를 고르라고 했다).
              선택지 이름은 폼과 같은 키에서 가져온다 — 손으로 적으면 한쪽만 바뀐다. */}
          <h3 className="text-2xl font-bold text-[#1a1a1a] mb-4 mt-10">What you can write about</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            The subject menu on the form has four options &mdash; {t("contact_subject_general")},{" "}
            {t("contact_subject_support")}, {t("contact_subject_feedback")} and{" "}
            {t("contact_subject_partner")}. These are the things people most often write
            about, and which option to pick for each:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-3 mb-8">
            <li>
              <strong>General questions about the planner</strong> ({t("contact_subject_general")})
              — how it works, how favourites work, why a particular menu was suggested, or how
              to interpret the shopping list. Ideas and feature requests go under{" "}
              {t("contact_subject_feedback")}. I aim to reply within 48 hours NZT.
            </li>
            <li>
              <strong>Content corrections</strong> ({t("contact_subject_support")}) — an
              incorrect ingredient measurement, a broken external reference, an outdated
              price, or a recipe step that does not read clearly. I aim to review a correction
              within 48 hours and to fix a confirmed one within one week, and the article is
              updated with a new <code>lastReviewed</code> date. The original is not
              silently overwritten — if a meaningful factual change is made, the change
              is noted in the article footer.
            </li>
            <li>
              <strong>Allergy-tagging errors</strong> ({t("contact_subject_support")}) — the
              most important category. Lunch recipes are flagged by hand from their ingredient
              lists and snacks are checked against the tracked product&apos;s allergen
              declaration where one is on file, but manufacturers change recipes faster than
              any site can follow. If you spot a flag that does not match the latest
              packaging, tell me and I aim to fix a confirmed error within 48 hours.
            </li>
            <li>
              <strong>Advertising and partnership enquiries</strong> ({t("contact_subject_partner")})
              — Aussie Lunchbox is
              monetised through Google AdSense only. The site does not currently accept
              sponsored content, affiliate partnerships, or brand-sponsored articles. If
              your enquiry is editorial-content related (a recipe collaboration or a
              guest-author piece), that is welcome — sponsored placements are not.
            </li>
            <li>
              <strong>Privacy and data enquiries</strong> ({t("contact_subject_general")}) —
              under the New Zealand Privacy Act 2020, you have a right to ask what personal
              information Aussie Lunchbox holds about you and to ask for it to be corrected, and
              I will also delete an account on request. Pick{" "}
              {t("contact_subject_general")} and start the message with &quot;Privacy
              request&quot;. The Act (section 44) requires a decision on an access request as
              soon as reasonably practicable and no later than 20 working days after it
              arrives; I aim to reply within 10 working days. See the{" "}
              <Link href={`/${locale}/policies`} className="text-[#8C4A00] underline">Privacy Policy</Link>
              {" "}for the full data-handling overview.
            </li>
          </ul>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mb-4 mt-10">Response times</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Aussie Lunchbox is run from Auckland, New Zealand. Typical reply windows:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-8">
            {/* 🔴 09-29: 이 목록이 24시간(알레르기·일반)·48시간(정정)을 약속했고 FAQ(faq_a27)는
                알레르기 48시간·그 밖의 정정 1주를 약속했다. 한 사이트가 두 시한을 말하고 있었다.
                FAQ·머리말(contact_subtitle 48시간)에 맞춘다. 법정 기한도 10일이 아니라 20 working days다. */}
            <li><strong>Planner / general questions:</strong> a reply within 48 hours NZT, Monday–Friday.</li>
            <li><strong>Allergy-tagging errors:</strong> a confirmed error fixed within 48 hours. This is the highest priority category.</li>
            <li><strong>Content corrections:</strong> reviewed within 48 hours NZT, and a confirmed correction fixed within one week.</li>
            <li><strong>Advertising / partnership / privacy enquiries:</strong> within 5 working days for most cases, and within 10 working days for privacy requests &mdash; well inside the Privacy Act 2020 limit of 20 working days.</li>
            <li>NZ public holidays may extend the above windows. School holidays do not — the operator is a parent during school holidays too.</li>
          </ul>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mb-4 mt-10">Where the operator is based</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Aussie Lunchbox is operated from Auckland, New Zealand, for families in Australia.
            What that means for the content:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-8">
            {/* 🔴 09-29: 「Botany 지점을 격주로 확인」은 수집기(.github/workflows/update_prices.yml)에 없다.
                세 열 모두 매주 온라인 매장에서 읽고, 매장을 고르는 두 체인은 Ormiston으로 고정돼 있다. */}
            <li>Prices are read from <strong>Woolworths Australia</strong>&apos;s own online shop rather than walked in store — I don&apos;t live in Australia. Prices at your local store, and in other states, may differ.</li>
            <li>The seasonal produce calendar describes general Australian seasons; what is in season varies a lot between the tropical north and the southern states (see the{" "}
              <Link href={`/${locale}/guides/australian-seasonal-produce-calendar`} className="text-[#8C4A00] underline">seasonal calendar guide</Link>
              ).
            </li>
            <li>School food rules are set by each state&apos;s healthy canteen framework and by individual schools, so the guides describe the common ground and point to the state documents rather than one national rule.</li>
            <li>The site is hosted on Vercel infrastructure with content delivered from the nearest available edge node, regardless of where you are reading from.</li>
          </ul>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mb-4 mt-10">What this contact form does not cover</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Three categories I cannot help with through this form:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
            <li>
              <strong>Medical or dietary advice for an individual child.</strong> Articles
              on Aussie Lunchbox follow public Australian Government and NHMRC
              guidance, but I am not a registered dietitian or paediatric clinician. If
              your child has a diagnosed condition, allergy with anaphylaxis risk, growth
              concern, or specific nutritional need, talk to your GP or a registered
              health professional.
            </li>
            <li>
              {/* 🔴 09-29: 「로그인 페이지의 비밀번호 재설정」을 쓰라고 했지만 그런 흐름이 없다
                  (AuthModal·AccountClient는 signIn/signUp뿐). 계정이 담는 것은 즐겨찾기 이름뿐이다. */}
              <strong>Password recovery for the planner.</strong> The planner uses Supabase
              Auth, I do not have access to anyone&apos;s password, and there is no
              self-service password reset on the login page. An account only holds your
              favourite menu names, so if you are locked out the quickest route is a new
              account &mdash; and you can ask for the old one to be deleted as a privacy
              request.
            </li>
            <li>
              <strong>Bulk content licensing or scraping requests.</strong> All
              Aussie Lunchbox content is original and copyrighted to the operator. Use the{" "}
              <Link href={`/${locale}/terms`} className="text-[#8C4A00] underline">Terms</Link>
              {" "}page for the licensing details, or email with the subject "Licensing"
              and a clear use-case description.
            </li>
          </ul>
        </div>
      </section>

      {/* Footer */}
      <Footer locale={locale} />
    </main>
  );
}
