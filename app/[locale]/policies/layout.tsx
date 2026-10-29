import type { Metadata } from "next";

const BASE_URL = "https://www.kiwilunchbox.co.nz";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const canonical = `${BASE_URL}/${locale}/policies`;
  return {
    title: "Privacy Policy & Disclaimer | Kiwi Lunchbox",
    description:
      "Read the Kiwi Lunchbox privacy policy, including how we use Google AdSense, Google Analytics, Supabase, and how we handle your data under NZ law.",
    alternates: {
      canonical,
      // ko/zh hreflang은 AdSense 승인 단계에서 제거.
      languages: {
        "x-default": `${BASE_URL}/en/policies`,
        en: `${BASE_URL}/en/policies`,
      },
    },
    openGraph: { url: canonical },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
