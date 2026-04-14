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
