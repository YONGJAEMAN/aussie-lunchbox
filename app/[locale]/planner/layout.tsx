import type { Metadata } from "next";

const BASE_URL = "https://www.aussielunchbox.com";

const PLANNER_TITLE = "Weekly Lunch Planner | Aussie Lunchbox";
const PLANNER_DESC =
  "Generate a personalised 5-day school lunch plan for Australian families. Set allergy filters, get a shopping list with Woolworths & Coles prices, and download as PDF.";

export const metadata: Metadata = {
  title: PLANNER_TITLE,
  description: PLANNER_DESC,
  alternates: {
    canonical: `${BASE_URL}/en/planner`,
  },
  openGraph: {
    title: PLANNER_TITLE,
    description: PLANNER_DESC,
    url: `${BASE_URL}/en/planner`,
    siteName: "Aussie Lunchbox",
    type: "website",
    images: [{ url: `${BASE_URL}/aussie_lunchbox_logo.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: PLANNER_TITLE,
    description: PLANNER_DESC,
    images: [`${BASE_URL}/aussie_lunchbox_logo.png`],
  },
};

export default function PlannerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
