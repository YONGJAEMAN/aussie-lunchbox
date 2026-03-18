import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getMessages } from "next-intl/server";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import "@/app/globals.css";
import Navbar from "@/components/Navbar";
import CookieConsent from "@/components/CookieConsent";

const BASE_URL = "https://www.aussielunchbox.com.au";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

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
      url: `${BASE_URL}/${locale}`,
      siteName: "Aussie Lunchbox",
      locale: locale === "ko" ? "ko_KR" : locale === "zh" ? "zh_CN" : "en_AU",
      type: "website",
      images: [
        {
          url: `${BASE_URL}/og-image.png`,
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
      images: [`${BASE_URL}/og-image.png`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
      },
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

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Navbar />
          {children}
          <CookieConsent />
        </NextIntlClientProvider>
        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2079938386322416"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { anonymize_ip: true });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
