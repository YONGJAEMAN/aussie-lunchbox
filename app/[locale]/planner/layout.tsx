import type { Metadata } from "next";

const BASE_URL = "https://www.aussielunchbox.com";

export const metadata: Metadata = {
  title: "Weekly Lunch Planner | Aussie Lunchbox",
  description:
    "Generate a personalised 5-day school lunch plan for Australian families. Set allergy filters, get a shopping list with Woolworths & Coles prices, and download as PDF.",
  alternates: {
    canonical: `${BASE_URL}/en/planner`,
  },
};

export default function PlannerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
