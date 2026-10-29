import type { Metadata } from "next";

const BASE_URL = "https://www.kiwilunchbox.co.nz";

const PLANNER_TITLE = "Weekly Lunch Planner | Kiwi Lunchbox";
// 🔴 09-29: 「Woolworths & Pak'nSave prices」였다 — 플래너 원가는 Woolworths 캐시에서만 나온다.
//    page.tsx의 generateMetadata가 title·description·og·twitter를 덮어써 지금은 <head>에 안 나가지만,
//    page 쪽 metadata가 빠지는 날 그대로 노출된다.
const PLANNER_DESC =
  "Generate a 5-day school lunch plan for NZ families. Set allergy filters, get a shopping list costed at regular Woolworths prices, and download it as a PDF.";

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
      // ko/zh hreflang은 AdSense 승인 단계에서 제거.
      languages: {
        "x-default": `${BASE_URL}/en/planner`,
        en: `${BASE_URL}/en/planner`,
      },
    },
    openGraph: {
      title: PLANNER_TITLE,
      description: PLANNER_DESC,
      url: canonical,
      siteName: "Kiwi Lunchbox",
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
