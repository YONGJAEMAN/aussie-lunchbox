import type { Metadata } from "next";

const BASE_URL = "https://www.aussielunchbox.com.au";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const canonical = `${BASE_URL}/${locale}/contact`;
  return {
    alternates: {
      canonical,
      languages: {
        en: `${BASE_URL}/en/contact`,
        ko: `${BASE_URL}/ko/contact`,
        "zh-CN": `${BASE_URL}/zh/contact`,
      },
    },
    openGraph: { url: canonical },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
