import type { Metadata } from "next";

const BASE_URL = "https://www.aussielunchbox.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const canonical = `${BASE_URL}/${locale}/policies`;
  return {
    title: "Privacy Policy & Disclaimer | Aussie Lunchbox",
    description:
      "Read the Aussie Lunchbox privacy policy, including how we use Google AdSense, Google Analytics, Supabase, and how we handle your data under Australian law.",
    alternates: {
      canonical,
      languages: {
        en: `${BASE_URL}/en/policies`,
        ko: `${BASE_URL}/ko/policies`,
        "zh-CN": `${BASE_URL}/zh/policies`,
      },
    },
    openGraph: { url: canonical },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
