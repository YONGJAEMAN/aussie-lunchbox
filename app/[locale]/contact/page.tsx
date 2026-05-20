"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function ContactPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "en";
  const t = useTranslations();

  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setStatus("error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#FFF8EE] pt-24 pb-16 px-4 text-center">
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest mb-4">{t("section_get_in_touch")}</p>
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
                <div className="w-10 h-10 rounded-2xl bg-[#FFF8EE] flex items-center justify-center text-lg">✉️</div>
                <span className="text-sm">{t("contact_email_addr")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF8EE] flex items-center justify-center text-lg">📍</div>
                <span className="text-sm">{t("contact_location")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF8EE] flex items-center justify-center text-lg">🕐</div>
                <span className="text-sm">{t("contact_hours")}</span>
              </div>
            </div>
            <div className="bg-[#FFF8EE] rounded-3xl p-5 text-gray-600 text-sm leading-relaxed">
              💡 {t("contact_support_tip")}
            </div>
          </div>

          {/* Right: contact form */}
          <div className="bg-[#FFF8EE] rounded-3xl p-8">
            <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-6">{t("contact_form_title")}</h2>
            {status === "success" ? (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-3xl p-8 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-semibold text-lg">{t("contact_success_title")}</p>
                <p className="text-sm mt-1">{t("contact_success_msg")}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t("contact_name_label")}</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-orange-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors bg-white"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t("contact_email_label")}</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-orange-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors bg-white"
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t("contact_subject_label")}</label>
                  <select
                    value={form.subject || t("contact_subject_general")}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full border border-orange-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors bg-white"
                  >
                    <option>{t("contact_subject_general")}</option>
                    <option>{t("contact_subject_support")}</option>
                    <option>{t("contact_subject_feedback")}</option>
                    <option>{t("contact_subject_partner")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t("contact_message_label")}</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={5}
                    className="w-full border border-orange-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors resize-none bg-white"
                    placeholder={t("contact_message_placeholder")}
                  />
                </div>
                {status === "error" && (
                  <p className="text-red-500 text-sm">{t("contact_error")}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#7B3F00] hover:bg-[#F5A623] text-white font-bold py-3 rounded-full transition-colors disabled:opacity-60"
                >
                  {loading ? t("contact_sending") : t("contact_send_btn")}
                </button>
              </form>
            )}
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
            Designer and a parent of school-age children — the same audience the site is
            built for.
          </p>
          <p className="text-gray-700 leading-relaxed mb-8">
            This direct line is part of what makes Aussie Lunchbox sustainable as a solo
            project: feedback from real Australian parents shapes which articles get written
            next, which allergy filters get refined, and which Woolworths and Coles prices
            get checked most often. If you have already read the{" "}
            <Link href={`/${locale}/about`} className="text-[#F5A623] underline">About page</Link>
            {" "}and the{" "}
            <Link href={`/${locale}/faq`} className="text-[#F5A623] underline">FAQ</Link>,
            this email goes straight to me.
          </p>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mb-4 mt-10">What you can write about</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            The contact form handles five common categories. Picking the right one helps
            me reply faster:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-3 mb-8">
            <li>
              <strong>General questions about the planner</strong> — how it works, how to
              save plans, why a particular menu was suggested, or how to interpret the
              shopping list. These are usually answered within 24 hours AEST.
            </li>
            <li>
              <strong>Content corrections</strong> — an incorrect ingredient measurement, a
              broken external reference, an outdated Australian price, or a recipe step
              that does not read clearly. Corrections are reviewed within 48 hours and the
              article is updated with a new <code>lastReviewed</code> date. The original is
              not silently overwritten — if a meaningful factual change is made, the change
              is noted in the article footer.
            </li>
            <li>
              <strong>Allergy-tagging errors</strong> — the most important category.
              Aussie Lunchbox cross-references allergy tags against FSANZ
              Plain English Allergen Labelling (PEAL) ingredient declarations, but
              real-world ingredient changes by manufacturers can outpace site updates.
              If you spot a tag that does not match the latest packaging, flag it and I
              will update the database within 24 hours.
            </li>
            <li>
              <strong>Advertising and partnership enquiries</strong> — Aussie Lunchbox is
              monetised through Google AdSense only. The site does not currently accept
              sponsored content, affiliate partnerships, or brand-sponsored articles. If
              your enquiry is editorial-content related (a recipe collaboration or a
              guest-author piece), that is welcome — sponsored placements are not.
            </li>
            <li>
              <strong>Privacy and data enquiries</strong> — under the Australian Privacy
              Act 1988 and the Australian Privacy Principles, you have a right to ask what
              personal information Aussie Lunchbox holds about you and to request
              correction or deletion. Email the contact form with the subject "Privacy
              enquiry" and I will respond within 30 days as required by the Office of the
              Australian Information Commissioner (OAIC). See the{" "}
              <Link href={`/${locale}/policies`} className="text-[#F5A623] underline">Privacy Policy</Link>
              {" "}for the full data-handling overview.
            </li>
          </ul>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mb-4 mt-10">Response times</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Aussie Lunchbox is operated from Australia. Typical reply windows:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-8">
            <li><strong>Planner / general questions:</strong> within 24 hours AEST, Monday–Friday.</li>
            <li><strong>Allergy-tagging errors:</strong> within 24 hours, including weekends. This is the highest priority category.</li>
            <li><strong>Content corrections:</strong> within 48 hours AEST, Monday–Friday.</li>
            <li><strong>Advertising / partnership enquiries:</strong> within 5 working days.</li>
            <li><strong>Privacy enquiries (Privacy Act 1988):</strong> up to 30 days per OAIC guidance.</li>
            <li>Australian public holidays may extend the above windows. School holidays do not — the operator is a parent during school holidays too.</li>
          </ul>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mb-4 mt-10">What this contact form does not cover</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Three categories I cannot help with through this form:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
            <li>
              <strong>Medical or dietary advice for an individual child.</strong> Articles
              on Aussie Lunchbox follow public NHMRC (National Health and Medical Research
              Council) and Department of Health guidance, but I am not a registered
              dietitian or paediatric clinician. If your child has a diagnosed condition,
              allergy with anaphylaxis risk, growth concern, or specific nutritional need,
              talk to your GP, an accredited practising dietitian (APD), or contact{" "}
              <strong>Healthdirect Australia (1800 022 222)</strong>.
            </li>
            <li>
              <strong>Account or login issues for the planner.</strong> The planner uses
              Supabase Auth — if you cannot sign in, use the password-reset flow on the
              login page. Email recovery is not handled through this form because I do not
              have direct access to user credentials.
            </li>
            <li>
              <strong>Bulk content licensing or scraping requests.</strong> All
              Aussie Lunchbox content is original and copyrighted to the operator. Use the{" "}
              <Link href={`/${locale}/terms`} className="text-[#F5A623] underline">Terms</Link>
              {" "}page for the licensing details, or email with the subject "Licensing"
              and a clear use-case description.
            </li>
          </ul>
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
                <Link href={`/${locale}/guides`} className="block hover:text-white transition-colors">{t("nav_guides")}</Link>
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
