import type { Metadata } from "next";

const BASE_URL = "https://aussielunchbox.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const canonical = `${BASE_URL}/contact`;
  // title+description added
  return {
    title: "Contact Us | Aussie Lunchbox",
    description:
      "Get in touch with the Aussie Lunchbox team — questions about meal plans, allergy filters, recipe suggestions, or content corrections. We respond within 48 hours.",
    alternates: {
      canonical,
      languages: {
        "x-default": `${BASE_URL}/contact`,
        en: `${BASE_URL}/contact`,
      },
    },
    openGraph: { url: canonical },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
