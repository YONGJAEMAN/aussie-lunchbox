import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ko", "zh"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  // English-only phase (AdSense): never auto-redirect "/" to /ko or /zh based on the
  // Accept-Language header or the NEXT_LOCALE cookie. Without this, next-intl sends
  // "/" → "/ko" (locale detection) while proxy.ts sends "/ko" → "/", producing an
  // infinite redirect loop (ERR_TOO_MANY_REDIRECTS) for every ko/zh browser.
  // Re-enable (remove this line) when multilingual operation resumes.
  localeDetection: false,
});
