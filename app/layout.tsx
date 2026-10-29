import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aussie Lunchbox - Stress-Free School Lunches",
  description: "Plan your kids' weekly lunchbox in seconds. Nutritious menus, shopping lists, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
