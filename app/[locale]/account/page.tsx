import type { Metadata } from "next";
import AccountClient from "./AccountClient";
import { BRAND } from "@/lib/brand";

const BASE_URL = BRAND.SITE_URL;

/**
 * Account 페이지는 로그인/유저 대시보드라 SEO 인덱싱 대상이 아님.
 * `robots: { index: false, follow: false }` 로 검색 결과 노출을 방지하면서,
 * 봇이 사이트 신뢰도 평가 시 "auth gated content" 로 정확히 인식하게 함.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "My Account – Aussie Lunchbox",
    description: "Sign in or manage your saved lunch plans and favourites on Aussie Lunchbox.",
    alternates: {
      canonical: `${BASE_URL}/${locale}/account`,
    },
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

export default function AccountPage() {
  return <AccountClient />;
}
