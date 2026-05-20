import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.woolworths.com.au" },
      { protocol: "https", hostname: "images.unsplash.com" },
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
      {
        source: "/:path*",
        has: [{ type: "host", value: "aussielunchbox.com" }],
        destination: "https://www.aussielunchbox.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default withSerwist(withNextIntl(nextConfig));
