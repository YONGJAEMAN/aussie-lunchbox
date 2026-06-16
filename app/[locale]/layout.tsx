import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { routing } from "@/i18n/routing";
import { getMessages } from "next-intl/server";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/app/globals.css";
import Navbar from "@/components/Navbar";
import CookieConsent from "@/components/CookieConsent";
import ConsentScripts from "@/components/ConsentScripts";

const BASE_URL = "https://aussielunchbox.com";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const titles: Record<string, string> = {
    en: "Aussie Lunchbox — Stress-Free School Lunches for Australian Families",
    ko: "오지 런치박스 — 호주 가족을 위한 간편한 도시락 플래너",
    zh: "Aussie Lunchbox — 澳洲家庭轻松搭配学校午餐",
  };
  const descriptions: Record<string, string> = {
    en: "Plan your kids' weekly school lunchbox in seconds. Healthy Australian menus, shopping lists, allergy filters, and price estimates from Woolworths & Coles.",
    ko: "아이들의 한 주 도시락을 몇 초 만에 계획하세요. 건강한 호주 메뉴, 쇼핑 목록, 알레르기 필터, 울워스 & 콜스 가격 정보를 제공합니다.",
    zh: "几秒内规划孩子一周的学校午餐盒。提供健康的澳洲菜单、购物清单、过敏原过滤器和超市价格估算。",
  };

  const title = titles[locale] ?? titles.en;
  const description = descriptions[locale] ?? descriptions.en;

  return {
    title,
    description,
    metadataBase: new URL(BASE_URL),
    openGraph: {
      title,
      description,
      url: `${BASE_URL}`,
      siteName: "Aussie Lunchbox",
      locale: locale === "ko" ? "ko_KR" : locale === "zh" ? "zh_CN" : "en_AU",
      type: "website",
      images: [
        {
          url: `${BASE_URL}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: "Aussie Lunchbox – Australian School Lunch Planner",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${BASE_URL}/opengraph-image`],
    },
    // AdSense 승인 단계: 영어 페이지만 index. /ko, /zh는 middleware에서 redirect되지만
    // direct navigation 대비 noindex 보존. Kiwi 승인 후 다국어 운영 재개 시 isEnglish 가드 제거.
    robots: {
      index: locale === "en",
      follow: true,
      googleBot: {
        index: locale === "en",
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

  // middleware가 x-pathname header를 설정함. AdSense 정책상 noindex / auth-gated /
  // 비-EN locale 페이지에는 광고 코드를 두지 않는 게 안전. index 가능한 영어 콘텐츠
  // 페이지에서만 SSR <script>로 광고 코드 로드 → 크롤러는 영어 콘텐츠 페이지에서
  // 광고 코드 발견 + noindex 페이지에서는 광고 코드 없음.
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isNoindexPath =
    pathname.includes("/account") ||
    pathname.startsWith("/ko") ||
    pathname.startsWith("/zh");
  const showAdSenseScript = locale === "en" && !isNoindexPath;

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Aussie Lunchbox",
    url: BASE_URL,
    logo: `${BASE_URL}/opengraph-image`,
    description: "Free school lunch planner for Australian families. Weekly meal plans, allergy filters, and shopping lists with Woolworths & Coles prices.",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "aussielunchbox@gmail.com",
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <NextIntlClientProvider messages={messages}>
          <Navbar />
          {children}
          <CookieConsent />
        </NextIntlClientProvider>
        <ConsentScripts />
      </body>
    </html>
  );
}
