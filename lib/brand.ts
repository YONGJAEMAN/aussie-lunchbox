/**
 * 🔴 사이트 전체를 색인에서 빼 둔 상태인지 — **여기가 유일한 출처다.**
 *
 * 2026-07에 `layout.tsx`가 전 페이지에 `robots: index:false`를 걸었는데,
 * **광고 코드와 sitemap은 그걸 모르고 있었다**(2026-08-23 발견):
 *   · 광고 로더가 noindex인 영어 페이지 전부에 실려 나갔다
 *   · sitemap이 noindex URL **27개**를 색인 요청하고 있었다
 * 애드센스 심사는 **계정 단위**라 Kiwi 신청에 그대로 얹히는 문제였다.
 *
 * 셋(robots 메타 · 광고 코드 · sitemap)이 갈라지지 않도록 같은 값을 본다.
 * 색인을 복원할 땐 **여기만** false로 바꾸면 셋이 같이 움직인다.
 */
export const SITE_NOINDEX = true;

export const BRAND = {
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "https://aussielunchbox.com",
  SITE_NAME: "Aussie Lunchbox",
  COUNTRY: "AU",
  OG_LOCALE: "en_AU",
  LOCALES: ["en", "ko", "zh"] as const,
  SUPERMARKETS: ["Woolworths", "Coles"],
  PRIMARY_COLOR: "#F5A623",
  SECONDARY_COLOR: "#7B3F00",
  BG_COLOR: "#FDFAF2",
} as const;
