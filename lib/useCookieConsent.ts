"use client";

import { useState, useEffect, useCallback } from "react";

export function useCookieConsent() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    setConsented(localStorage.getItem("cookie-consent") === "accepted");

    function handleChange() {
      setConsented(localStorage.getItem("cookie-consent") === "accepted");
    }
    window.addEventListener("cookie-consent-changed", handleChange);
    return () => window.removeEventListener("cookie-consent-changed", handleChange);
  }, []);

  return consented;
}
