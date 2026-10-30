import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ko", "zh"],
  defaultLocale: "en",
  // English-only phase (AdSense): don't auto-redirect based on Accept-Language or the
  // NEXT_LOCALE cookie. Keeps ko/zh browsers on /en directly (no "/ko" bounce) and
  // avoids any locale-detection interplay with the middleware. Remove when multilingual
  // operation resumes.
  localeDetection: false,
});
