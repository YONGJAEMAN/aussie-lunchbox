import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

const BASE_URL = BRAND.SITE_URL;
const DEFAULT_OG_IMAGE = `${BASE_URL}/opengraph-image`;

/** 구글이 검색결과 제목을 자르기 시작하는 지점. 픽셀 폭 기준이라 정확한 경계는 없지만 60자면 거의 안전하다. */
export const TITLE_MAX = 60;

/**
 * 브랜드 접미사를 **자리가 남을 때만** 붙인다.
 *
 * 🔴 2026-08-13 실측: 글·가이드 21편 중 **19편의 title이 60자를 넘었다.**
 * 접미사가 `| Aussie Lunchbox Blog`(20자) · `| Aussie Lunchbox Guides`(22자)였고,
 * 제목이 40자만 돼도 넘어간다. 검색결과에서 잘리면 브랜드도 같이 잘리므로
 * **붙여서 잘리는 것보다 안 붙이는 쪽이 낫다.** (og:siteName에는 그대로 남는다)
 */
export function withBrand(title: string, max = TITLE_MAX): string {
  const suffix = " | Aussie Lunchbox";
  return title.length + suffix.length <= max ? title + suffix : title;
}

/**
 * 페이지별 metadata 일관성 보장 helper.
 *
 * App Router에서 Page metadata가 누락되면 Layout의 generic site-wide metadata가
 * 그대로 노출됨 (특히 twitter:title / og:title이 홈페이지 그대로). 이건 검색엔진과
 * AdSense bot에 "각 페이지가 고유 가치 없음" 신호로 작용함.
 *
 * 이 helper는 hub/static 페이지가 page-specific title/description/canonical 위에서
 * og + twitter도 자동으로 일관되게 생성되도록 강제함.
 */
export function buildPageMetadata({
  path,
  locale,
  title,
  description,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  publishedTime,
  modifiedTime,
  noindex = false,
}: {
  /** locale 다음에 붙는 경로. 예: "/about", "/blog/some-slug", "" (홈) */
  path: string;
  locale: string;
  title: string;
  description: string;
  /** 페이지 고유 OG 이미지 (예: 블로그 글의 hero image). 기본은 사이트 공통 OG 이미지. */
  ogImage?: string;
  ogType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  /** 로그인 페이지처럼 검색 노출 막을 페이지에 사용 */
  noindex?: boolean;
}): Metadata {
  const canonical = `${BASE_URL}/${locale}${path}`;

  const meta: Metadata = {
    title,
    description,
    alternates: {
      canonical,
      // ko/zh hreflang은 넣지 않는다. /ko, /zh는 언어 전환으로 열리지만(2026-10-29~) noindex이고
      // 본문(블로그·가이드)은 영어다 — alternate로 광고하면 "translated/duplicate content" 신호가 된다.
      languages: {
        "x-default": `${BASE_URL}/en${path}`,
        en: `${BASE_URL}/en${path}`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: ogType,
      siteName: "Aussie Lunchbox",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };

  if (noindex) {
    meta.robots = {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    };
  }

  return meta;
}
