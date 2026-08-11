"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";
  const t = useTranslations();

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem("cookie-consent", "accepted");
    window.dispatchEvent(new Event("cookie-consent-changed"));
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("cookie-consent", "declined");
    window.dispatchEvent(new Event("cookie-consent-changed"));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#7B3F00] text-white shadow-2xl"
    >
      {/* ⚠️ 이 배너는 지우면 안 된다 — AdSense GDPR 동의 요건이다.
          모바일 첫 화면을 크게 먹고 있어 **높이만** 줄인다. */}
      <div className="max-w-5xl mx-auto px-4 py-2.5 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
        <p className="text-xs sm:text-sm leading-snug sm:leading-relaxed flex-1">
          🍪 {t("cookie_message")}{" "}
          <Link
            href={`/${locale}/policies`}
            className="underline hover:text-[#A8D88A] whitespace-nowrap"
          >
            {t("cookie_learn_more")}
          </Link>
          .
        </p>
        <div className="flex gap-2 sm:gap-3 shrink-0 self-end sm:self-auto">
          <button
            onClick={decline}
            className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm border border-white/40 rounded-lg hover:bg-white/10 transition-colors"
          >
            {t("cookie_decline")}
          </button>
          <button
            onClick={accept}
            className="px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm bg-[#F5A623] hover:bg-[#D4850A] rounded-lg font-semibold transition-colors"
          >
            {t("cookie_accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
