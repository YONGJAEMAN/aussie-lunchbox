import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

// CSP allowlist for Google AdSense + GA + Supabase. Shipped as Report-Only
// first so it CANNOT break ad serving — it only reports violations. Once the
// browser console shows no violations on an ad-serving page, switch the header
// key below to "Content-Security-Policy" to enforce.
//
// 🔴 2026-08-17 Lighthouse 실측: 이 allowlist에 **AdSense가 실제로 쓰는 호스트가 빠져 있었다.**
// 광고를 띄우면 콘솔에 위반이 계속 쌓이고 있었다 —
//   · frame-src  → `ep2.adtrafficquality.google` 프레임 차단 위반
//   · script-src → `ep2.adtrafficquality.google/sodar/sodar2.js`
//   · connect-src→ `ep1.adtrafficquality.google/getconfig/sodar`, `csi.gstatic.com/csi`
// Report-Only라 광고가 깨지진 않았지만, **enforce로 바꾸는 순간 광고가 죽는 목록이었다.**
// Report-Only의 목적이 정확히 이걸 미리 보여주는 것이었는데 그동안 안 읽었다.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google.com https://adservice.google.com https://tpc.googlesyndication.com https://*.adtrafficquality.google",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // images.unsplash.com 제거 (2026-08-05). 기사·홈·플래너 히어로를 전부
  // 자체 호스팅 /assets/kiwi_*.webp로 바꿔 코드에 unsplash 참조가 남지 않았다.
  "img-src 'self' data: blob: https://assets.woolworths.com.au https://pagead2.googlesyndication.com https://*.googlesyndication.com https://www.google-analytics.com https://*.google.com https://*.gstatic.com https://*.g.doubleclick.net",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://*.google-analytics.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.g.doubleclick.net https://*.adtrafficquality.google https://csi.gstatic.com",
  "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.google.com https://www.googletagmanager.com https://*.adtrafficquality.google",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  // ⚠️ `upgrade-insecure-requests`는 여기 두면 **아무 일도 하지 않는다.**
  //    Report-Only 정책에서는 무시되고, 브라우저가 그 사실을 콘솔 경고로 남긴다
  //    (2026-08-17 실측: 페이지당 5건). 아래 enforce 헤더로 옮겼다.
].join("; ");

const securityHeaders = [
  // Report-only: collect violations without blocking. Flip to enforcing later.
  { key: "Content-Security-Policy-Report-Only", value: csp },
  // fetch 지시어가 하나도 없는 정책이라 **차단하는 것이 없다** — http:// 하위 리소스를
  // https로 올려 요청할 뿐이다. 그래서 enforce로 둬도 광고·이미지에 영향이 없고,
  // Report-Only에 있을 때와 달리 실제로 동작한다.
  { key: "Content-Security-Policy", value: "upgrade-insecure-requests" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      // 가격 캐시의 상품 이미지는 assets.woolworths.com.au에서 온다.
      // countdown.co.nz는 2024년 폐기된 도메인 — 남겨두면 next/image가 실제
      // 이미지 호스트를 차단한다. (2026-07-29 정리)
      { protocol: "https", hostname: "assets.woolworths.com.au" },
      // images.unsplash.com 제거 (2026-08-05) — 히어로가 전부 자체 호스팅으로 바뀌었다.
      // 되살릴 일이 생기면 CSP img-src에도 같이 넣어야 한다.
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    // 🔴 재포크 때 Kiwi의 「non-www → www」 규칙이 도메인 일괄 치환으로
    //    「aussielunchbox.com → aussielunchbox.com」이 돼 무한 리다이렉트가 될 뻔했다.
    //    Aussie는 non-www가 canonical이고 www→non-www는 Vercel 도메인 설정이 한다. 여기서는 하지 않는다.
    //    Kiwi의 NZ 글 주소 리다이렉트도 Aussie에는 없던 주소라 옮기지 않았다.
    //
    // 2026-08-10: Woolworths vs Coles 비교글 3편을 내렸다. 표의 가격도 영양수치도
    // 실제 조사가 아니었다(사용자 확인). 404 대신 실제 근거가 있는 예산 가이드로 보낸다.
    const gone = [
      "woolworths-vs-coles-lunchbox-budget",
      "woolworths-vs-coles-lunchbox-staples",
      "woolworths-macro-vs-coles-branded-lunchbox-comparison",
    ];
    return gone.flatMap((slug) => [
      {
        source: `/:locale/blog/${slug}`,
        destination: `/:locale/guides/budget-lunchbox-planning-guide-australia`,
        permanent: true,
      },
      {
        source: `/blog/${slug}`,
        destination: `/en/guides/budget-lunchbox-planning-guide-australia`,
        permanent: true,
      },
    ]);
  },
};

export default withSerwist(withNextIntl(nextConfig));
