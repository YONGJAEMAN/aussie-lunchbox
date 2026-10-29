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
  "img-src 'self' data: blob: https://assets.woolworths.com.au https://*.woolworths.co.nz https://pagead2.googlesyndication.com https://*.googlesyndication.com https://www.google-analytics.com https://*.google.com https://*.gstatic.com https://*.g.doubleclick.net",
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
      { protocol: "https", hostname: "**.woolworths.co.nz" },
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
    return [
      // non-www → www 301 redirect (canonical 단일화)
      // www가 canonical인데 non-www도 200 응답하면 duplicate content 신호 → AdSense 감점.
      //
      // 단, ads.txt / robots.txt / sitemap.xml 은 redirect에서 제외.
      // AdSense 등록 도메인이 non-www(kiwilunchbox.co.nz)인데, 이 파일들까지
      // 308로 www에 튕기면 ads.txt crawler가 308을 못 따라가 "찾을 수 없음" 판정.
      // → 등록 도메인에서 직접 200으로 서빙되도록 negative lookahead로 예외 처리.
      {
        source: "/:path((?!ads\\.txt|robots\\.txt|sitemap\\.xml).*)",
        has: [{ type: "host", value: "kiwilunchbox.co.nz" }],
        destination: "https://www.kiwilunchbox.co.nz/:path",
        permanent: true,
      },
      // 2026-09-09: `lunchbox-price-index-august-2026`은 **본문이 매주 갱신되는 글**인데
      // 주소에만 8월이 박혀 있었다. 제목·본문의 「August」는 09-09에 지웠지만
      // 검색결과에는 주소가 그대로 나온다 — 갱신되는 표를 8월 글로 읽게 만든다.
      // GSC에 색인된 주소라 삭제가 아니라 308로 넘긴다.
      {
        source: "/:locale/blog/lunchbox-price-index-august-2026",
        destination: "/:locale/blog/supermarket-price-gap-nz-lunchbox",
        permanent: true,
      },
      // 2026-09-10: 「One Week」가 제목·주소·본문에서 거짓이었다.
      // 3사 비교 18행 중 Pak'nSave 6행·New World 6행이 8월 관측이었다(가장 오래된 것 21일 전).
      // 규칙 자체는 원래부터 「±30일」이었고 코드에 적혀 있었다 — 글만 「같은 주」라고 말했다.
      // 규칙을 좁히면 표가 비므로 문장을 데이터에서 생성하게 고치고, 주소에서 same-week를 뺀다.
      {
        source: "/:locale/blog/three-supermarkets-same-week-nz-lunchbox-basket",
        destination: "/:locale/blog/three-supermarkets-nz-lunchbox-basket-compared",
        permanent: true,
      },
      // 2026-09-09: `biggest-discount-is-not-the-cheapest-lunch`를 내렸다.
      // 본문의 모든 금액($1.84 · $18.89 · $15.70 …)이 **조작된 할인가**로 측정된 것이었다 —
      // 전단 상품의 할인 비율을 우리 기준가에 곱하던 계산(그날 함께 고쳤다).
      // 논지("큰 할인 ≠ 싼 끼니")는 전단 자체 데이터로도 서지만(절약액 vs 정가 r=0.91,
      // 할인율 vs 정가 r=0.04), 그건 다시 쓸 글이지 고쳐 쓸 글이 아니다.
      // 주소는 이틀밖에 안 됐지만 색인됐을 수 있으므로 살아 있는 특가 글로 보낸다.
      {
        source: "/:locale/blog/biggest-discount-is-not-the-cheapest-lunch",
        destination: "/:locale/blog/what-is-always-on-special-nz-supermarkets",
        permanent: true,
      },
      // 기존: -nz 접미사 추가된 새 slug로 정리
      {
        source: "/:locale/blog/budget-friendly-lunchbox-ideas",
        destination: "/:locale/blog/budget-friendly-lunchbox-ideas-nz",
        permanent: true,
      },
      // 외부 inbound link / search index에 잔존하는 dead slug → blog index로 보냄.
      // 콘텐츠 mismatch 위험 없는 안전한 fallback. AdSense bot이 404 만나는 일 방지.
      // (실측: /en/blog/5-healthy-lunchbox-ideas-for-nz-kids 가 외부에서 들어와 404 반환되고 있었음)
      {
        source: "/:locale/blog/5-healthy-lunchbox-ideas-for-nz-kids",
        destination: "/:locale/blog",
        permanent: true,
      },
      {
        source: "/:locale/blog/healthy-lunchbox-ideas-for-nz-kids",
        destination: "/:locale/blog",
        permanent: true,
      },
      {
        source: "/:locale/blog/healthy-lunchbox-ideas",
        destination: "/:locale/blog",
        permanent: true,
      },
      {
        source: "/:locale/blog/lunchbox-ideas",
        destination: "/:locale/blog",
        permanent: true,
      },
      // 2026-07-29: GSC "찾을 수 없음(404)" 8건 중 blog dead slug 6개.
      // 삭제된 글인데 Google이 계속 크롤링 중이었다(최종 크롤 2026-06). 주제가
      // 가까운 정본으로 301 — 404를 방치하면 크롤 예산을 계속 태우고 soft-404 신호가 된다.
      {
        source: "/:locale/blog/autumn-winter-lunchbox-ideas-nz",
        destination: "/:locale/guides/nz-seasonal-produce-calendar",
        permanent: true,
      },
      {
        source: "/:locale/blog/best-lunchbox-containers-nz",
        destination: "/:locale/blog/insulated-lunch-bags-review-nz",
        permanent: true,
      },
      {
        source: "/:locale/blog/high-protein-lunchbox-ideas",
        destination: "/:locale/guides/complete-nutrition-guide-school-lunches-nz",
        permanent: true,
      },
      {
        source: "/:locale/blog/fridge-leftovers-lunchbox-ideas-nz",
        destination: "/:locale/blog/batch-cooking-save-money-nz",
        permanent: true,
      },
      {
        source: "/:locale/blog/kids-make-own-lunchbox",
        destination: "/:locale/blog",
        permanent: true,
      },
      {
        source: "/:locale/blog/getting-kids-to-eat-healthy-lunches",
        destination: "/:locale/blog",
        permanent: true,
      },
      // ⚠️ 로케일 없이 크롤된 것도 있었지만(/blog/getting-kids-to-eat-healthy-lunches)
      //    `/blog/:slug*` 포괄 규칙은 넣지 않는다. 로케일 없이 들어온 **정상 글 링크**까지
      //    블로그 목록으로 보내버려 멀쩡한 유입을 망친다. 미들웨어가 /en/ 을 붙인 뒤
      //    위의 개별 규칙이 걸리는 경로에 맡긴다.

      // 2026-07: AdSense "가치 없는 콘텐츠" 대응 — 정부지침 재편집이던 thin 글 4개 삭제.
      // 색인/외부링크에 잔존하는 dead slug를 주제별 정본으로 301 (soft-404 방지).
      // 레퍼런스성 주제는 guides(상록 레퍼런스), 경험성은 blog로 보냄(B안 역할분리).
      {
        source: "/:locale/blog/top-8-allergen-free-lunches-nz",
        destination: "/:locale/blog/nut-free-school-lunches-new-zealand",
        permanent: true,
      },
      {
        source: "/:locale/blog/nz-healthy-food-drink-guidance-schools-parent-translation",
        destination: "/:locale/guides/complete-nutrition-guide-school-lunches-nz",
        permanent: true,
      },
      {
        source: "/:locale/blog/nz-lunchbox-iron-calcium-protein-three-missed-nutrients",
        destination: "/:locale/blog/iron-rich-lunchbox-foods-nz",
        permanent: true,
      },
      {
        source: "/:locale/blog/nz-allergen-labelling-plain-english-30-second-read",
        destination: "/:locale/guides/allergy-management-school-lunchbox-nz",
        permanent: true,
      },
      // 2026-07 Phase 2(B안): 경험 없이 정부지침·규격을 옮긴 reference성 블로그 3개 삭제.
      // blog=경험 / guides=상록 reference 원칙에 따라 정본 가이드로 301.
      {
        source: "/:locale/blog/understanding-food-groups-school-lunch-nz",
        destination: "/:locale/guides/complete-nutrition-guide-school-lunches-nz",
        permanent: true,
      },
      {
        source: "/:locale/blog/nz-year-level-portion-guide-school-lunches",
        destination: "/:locale/guides/complete-nutrition-guide-school-lunches-nz",
        permanent: true,
      },
      {
        source: "/:locale/blog/nz-lunchbox-material-safety-plastic-silicone-stainless",
        destination: "/:locale/guides/lunchbox-food-safety-guide-nz",
        permanent: true,
      },
    ];
  },
};

export default withSerwist(withNextIntl(nextConfig));
