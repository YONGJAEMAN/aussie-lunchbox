"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

/**
 * Consent-gated analytics scripts.
 *
 * AdSense (adsbygoogle.js)는 app/[locale]/layout.tsx <head>에 raw script로 직접
 * 추가됨 (consent 무관 항상 로드 — crawler가 광고 코드 검증할 수 있도록).
 *
 * 여기서는 user-level tracking에 해당하는 GA만 consent 후에 로드.
 */
export default function ConsentScripts() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    setConsented(localStorage.getItem("cookie-consent") === "accepted");

    function handleChange() {
      setConsented(localStorage.getItem("cookie-consent") === "accepted");
    }
    window.addEventListener("cookie-consent-changed", handleChange);
    return () => window.removeEventListener("cookie-consent-changed", handleChange);
  }, []);

  if (!consented || !GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
