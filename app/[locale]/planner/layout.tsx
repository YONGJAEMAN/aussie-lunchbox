import type { Metadata } from "next";

const BASE_URL = "https://www.aussielunchbox.com";

const PLANNER_TITLE = "Weekly Lunch Planner | Aussie Lunchbox";
const PLANNER_DESC =
  "Generate a personalised 5-day school lunch plan for Australian families. Set allergy filters, get a shopping list with Woolworths & Coles prices, and download as PDF.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const canonical = `${BASE_URL}/${locale}/planner`;

  return {
    title: PLANNER_TITLE,
    description: PLANNER_DESC,
    alternates: {
      canonical,
      languages: {
        en: `${BASE_URL}/en/planner`,
        ko: `${BASE_URL}/ko/planner`,
        "zh-CN": `${BASE_URL}/zh/planner`,
      },
    },
    openGraph: {
      title: PLANNER_TITLE,
      description: PLANNER_DESC,
      url: canonical,
      siteName: "Aussie Lunchbox",
      type: "website",
      images: [{ url: `${BASE_URL}/assets/kiwi_lunchbox_logo.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: PLANNER_TITLE,
      description: PLANNER_DESC,
      images: [`${BASE_URL}/assets/kiwi_lunchbox_logo.png`],
    },
  };
}

export default function PlannerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
