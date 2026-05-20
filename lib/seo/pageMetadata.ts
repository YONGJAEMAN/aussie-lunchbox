import type { Metadata } from "next";

const BASE_URL = "https://www.aussielunchbox.com";
const DEFAULT_OG_IMAGE = `${BASE_URL}/opengraph-image`;

/**
 * 페이지별 metadata 일관성 보장 helper.
 *
 * Aussie는 localePrefix: "as-needed"라 영어는 prefix 없음 (예: /blog, /about).
 * hreflang은 AdSense 승인 단계까지 영어(x-default + en)만 노출 — ko/zh 제외.
 * 다국어 운영 재개 시 ko, "zh-CN" 항목 복원.
 */
export function buildPageMetadata({
  path,
  title,
  description,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  publishedTime,
  modifiedTime,
  noindex = false,
}: {
  /** 영어 URL path. 예: "/about", "/blog/some-slug", "" (홈) */
  path: string;
  title: string;
  description: string;
  ogImage?: string;
  ogType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  /** 로그인 페이지처럼 검색 노출 막을 페이지에 사용 */
  noindex?: boolean;
}): Metadata {
  const canonical = `${BASE_URL}${path}`;

  const meta: Metadata = {
    title,
    description,
    alternates: {
      canonical,
      // AdSense 승인 단계: ko/zh hreflang 제거. /ko, /zh는 middleware 307 redirect.
      languages: {
        "x-default": `${BASE_URL}${path}`,
        en: `${BASE_URL}${path}`,
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
