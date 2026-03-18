export const BRAND = {
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aussielunchbox.com",
  SITE_NAME: "Aussie Lunchbox",
  COUNTRY: "AU",
  OG_LOCALE: "en_AU",
  LOCALES: ["en", "ko", "zh"] as const,
  SUPERMARKETS: ["Woolworths", "Coles"],
  PRIMARY_COLOR: "#F5A623",
  SECONDARY_COLOR: "#7B3F00",
  BG_COLOR: "#FDFAF2",
} as const;
