import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { routing } from "@/i18n/routing";
import { getMessages, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/app/globals.css";
import Navbar from "@/components/Navbar";
import CookieConsent from "@/components/CookieConsent";
import ConsentScripts from "@/components/ConsentScripts";
import { Analytics } from "@vercel/analytics/next";

const BASE_URL = "https://www.kiwilunchbox.co.nz";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const titles: Record<string, string> = {
    en: "Kiwi Lunchbox — Stress-Free School Lunches for New Zealand Families",
    ko: "키위 런치박스 — 뉴질랜드 가족을 위한 간편한 도시락 플래너",
    zh: "Kiwi Lunchbox — 新西兰家庭轻松搭配学校午餐",
  };
  const descriptions: Record<string, string> = {
    en: "Plan your kids' weekly school lunchbox in seconds. Healthy New Zealand menus, shopping lists, allergy filters, and price estimates from Woolworths & Pak'nSave.",
    ko: "아이들의 한 주 도시락을 몇 초 만에 계획하세요. 건강한 뉴질랜드 메뉴, 쇼핑 목록, 알레르기 필터, 카운트다운 & 팩앤세이브 가격 정보를 제공합니다.",
    zh: "几秒内规划孩子一周的学校午餐盒。提供健康的新西兰菜单、购物清单、过敏原过滤器和超市价格估算。",
  };

  const title = titles[locale] ?? titles.en;
  const description = descriptions[locale] ?? descriptions.en;

  // /ko, /zh는 언어 전환으로 열리지만(2026-10-29~, redirect 제거) noindex로 둔다 —
  // 블로그·가이드 본문이 영어라 색인하면 번역 미완성 중복 페이지가 된다.
  const isEnglish = locale === "en";

  return {
    title,
    description,
    metadataBase: new URL(BASE_URL),
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}`,
      siteName: "Kiwi Lunchbox",
      locale: locale === "ko" ? "ko_KR" : locale === "zh" ? "zh_CN" : "en_NZ",
      type: "website",
      images: [
        {
          url: `${BASE_URL}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: "Kiwi Lunchbox – NZ School Lunch Planner",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${BASE_URL}/opengraph-image`],
    },
    robots: {
      index: isEnglish,
      follow: true,
      googleBot: {
        index: isEnglish,
        follow: true,
        "max-image-preview": "large",
      },
    },
    other: {
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "default",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const messages = await getMessages();
  const t = await getTranslations();

  // middleware가 x-pathname header를 설정함 (middleware.ts 참고).
  // AdSense 정책상 noindex / auth-gated / 비-EN locale 페이지에는 광고 코드를 두지 않는 게 안전.
  // index 가능한 영어 콘텐츠 페이지에서만 SSR <script>로 광고 코드 로드 → 크롤러는
  // 영어 콘텐츠 페이지에서 광고 코드 발견 + noindex 페이지에서는 광고 코드 없음.
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  // 🔴 2026-08-22: `/search`가 이 목록에 없어서 **31단어짜리 빈 검색결과 페이지에
  // 광고 코드가 실려 나가고 있었다.** `?q=zzzz` 같은 무결과 쿼리마다 그런 URL이
  // 무한히 생기고, noindex라 색인은 안 되지만 **심사 크롤러는 별도로 사이트를 돈다.**
  // 우리 거절 사유가 문자 그대로 "가치가 별로 없는 콘텐츠"였다.
  // 이 목록과 실제 noindex 선언이 갈라지지 않는지는 contentClaims 가드가 지킨다.
  const isNoindexPath =
    pathname.includes("/account") ||
    pathname.includes("/search") ||
    pathname.startsWith("/ko") ||
    pathname.startsWith("/zh");

  // 🔴 2026-08-14: 게시자 콘텐츠가 없는 유틸리티 페이지에는 광고 코드를 두지 않는다.
  // Google Publisher Policies "Inventory value" — 약관·정책·문의가 그 범주다.
  // 지금은 미승인이라 광고가 렌더되진 않지만, **심사 크롤러가 보는 건 이 코드다.**
  const isUtilityPath =
    pathname.includes("/policies") ||
    pathname.includes("/terms") ||
    pathname.includes("/contact");

  const showAdSenseScript = locale === "en" && !isNoindexPath && !isUtilityPath;

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Kiwi Lunchbox",
    url: BASE_URL,
    logo: `${BASE_URL}/assets/kiwi_lunchbox_logo.png`,
    // 🔴 09-29: 「Woolworths & Pak'nSave prices」였다 — 모든 페이지 <head>에 실리는데, 플래너 원가는 Woolworths 캐시뿐이다.
    description: "Free school lunch planner for New Zealand families. Weekly meal plans, allergy filters, and shopping lists costed at regular Woolworths prices.",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "kiwilunchboxplanner@gmail.com",
    },
    sameAs: [],
  };

  return (
    <html lang={locale}>
      <head>
        {showAdSenseScript && (
          /*
            AdSense 광고 코드. index 가능한 영어 공개 페이지에만 SSR <script>로 추가.
            - AdSense crawler/Googlebot이 SSR HTML에서 즉시 광고 코드 존재 확인
            - noindex 페이지(/account, /ko/*, /zh/*)에서는 자동 제외
            GDPR: 실제 personalization은 npa 신호로 별도 제어 — script 자체는 안전.
          */
          <script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2079938386322416"
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd).replace(/</g, "\\u003c") }}
        />
        <NextIntlClientProvider messages={messages}>
          {/*
            WCAG 2.4.1 (Bypass Blocks, Level A). 이게 없으면 키보드·스크린리더
            사용자는 페이지마다 내비게이션을 전부 지나야 본문에 닿는다.
            `<main>`은 페이지마다 따로 렌더되므로 여기서 래퍼에 id를 준다 —
            링크는 한 곳에만 두고, 모든 페이지가 같은 목적지를 갖는다.
          */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#1F2937] focus:shadow-lg focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#2563EB]"
          >
            {t("skip_to_content")}
          </a>
          <Navbar />
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
          <CookieConsent />
        </NextIntlClientProvider>
        <ConsentScripts />
        <Analytics />
      </body>
    </html>
  );
}
