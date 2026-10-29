export const BRAND = {
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.kiwilunchbox.co.nz",
  SITE_NAME: "Kiwi Lunchbox",
  COUNTRY: "NZ",
  OG_LOCALE: "en_NZ",
  LOCALES: ["en", "ko", "zh"] as const,
  SUPERMARKETS: ["Woolworths", "Pak'nSave"],
  PRIMARY_COLOR: "#78B159",
  SECONDARY_COLOR: "#314A37",
  BG_COLOR: "#F5F7FA",
} as const;
