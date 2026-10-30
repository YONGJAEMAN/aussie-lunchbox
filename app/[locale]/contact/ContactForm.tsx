"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Contact form (client-only)
 *
 * 'use client' 범위를 form interaction으로만 좁혀, 같은 폴더의 page.tsx는
 * Server Component로 유지 → metadata API 사용 가능 + AdSense bot이
 * Hero/contact info/editorial corrections 텍스트를 정적 HTML에서 직접 읽음.
 */
export default function ContactForm() {
  const t = useTranslations();

  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  /**
   * 🔴 2026-08-31까지 "입력 누락"과 "서버 실패"가 같은 상태를 썼다.
   *    속도 제한(429)에 걸려도 화면은 "필수 항목을 채우세요"라고 말했고,
   *    필드를 아무리 정확히 채워도 같은 문구가 떠서 원인을 못 찾았다.
   *    사용자가 고칠 수 있는 것과 없는 것을 갈라 놓는다.
   */
  const [status, setStatus] = useState<"idle" | "success" | "missing" | "rate" | "server">("idle");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setStatus("missing");
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
        setStatus(res.status === 429 ? "rate" : "server");
      }
    } catch {
      // 네트워크 실패도 사용자 입력 탓이 아니다
      setStatus("server");
    } finally {
      setLoading(false);
    }
  }

  if (status === "success") {
    return (
      <div className="bg-green-50 border border-green-200 text-green-700 rounded-3xl p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="font-semibold text-lg">{t("contact_success_title")}</p>
        <p className="text-sm mt-1">{t("contact_success_msg")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{t("contact_name_label")}</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors bg-white"
          placeholder="Jane Smith"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{t("contact_email_label")}</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors bg-white"
          placeholder="jane@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{t("contact_subject_label")}</label>
        <select
          value={form.subject || t("contact_subject_general")}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors bg-white"
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
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors resize-none bg-white"
          placeholder={t("contact_message_placeholder")}
        />
      </div>
      {status === "missing" && (
        <p className="text-red-500 text-sm">{t("contact_error")}</p>
      )}
      {status === "rate" && (
        <p className="text-amber-600 text-sm">{t("contact_error_rate")}</p>
      )}
      {status === "server" && (
        <p className="text-red-500 text-sm">{t("contact_error_server")}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#8C4A00] hover:bg-primary-deep text-white font-bold py-3 rounded-full transition-colors disabled:opacity-60"
      >
        {loading ? t("contact_sending") : t("contact_send_btn")}
      </button>
    </form>
  );
}
