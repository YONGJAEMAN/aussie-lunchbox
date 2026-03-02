"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("cookie-consent", "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#314A37] text-white shadow-2xl"
    >
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm leading-relaxed flex-1">
          🍪 We use cookies to improve your experience and to display relevant ads via{" "}
          <strong>Google AdSense</strong>. By clicking &ldquo;Accept&rdquo;, you consent to our use of cookies.{" "}
          <Link
            href={`/${locale}/policies`}
            className="underline hover:text-[#A8D88A] whitespace-nowrap"
          >
            Learn more
          </Link>
          .
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-sm border border-white/40 rounded-lg hover:bg-white/10 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-5 py-2 text-sm bg-[#78B159] hover:bg-[#5d9040] rounded-lg font-semibold transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
