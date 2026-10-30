import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";

import en from "@/messages/en.json";
import ko from "@/messages/ko.json";
import zh from "@/messages/zh.json";

const messages: Record<string, Record<string, string>> = { en, ko, zh };

export const metadata: Metadata = {
  title: "Page Not Found | Aussie Lunchbox",
  description: "The page you were looking for doesn't exist. Return to the Aussie Lunchbox homepage.",
  robots: { index: false, follow: true },
};

export default async function NotFound() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value ?? "en";
  const t = (key: string) => messages[locale]?.[key] ?? messages.en[key] ?? key;

  return (
    <main className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-8xl mb-6">🦘</div>
      <h1 className="text-4xl font-bold text-[#6B3600] mb-3">{t("notfound_title")}</h1>
      <p className="text-gray-500 max-w-md mb-8 leading-relaxed">
        {t("notfound_desc")}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`/${locale}`}
          className="bg-primary-deep hover:bg-[#6B3600] text-white font-bold py-3 px-8 rounded-full transition-colors"
        >
          {t("notfound_home")}
        </Link>
        <Link
          href={`/${locale}/planner`}
          className="border border-[#F5A623] text-[#8C4A00] hover:bg-primary-deep hover:text-white font-bold py-3 px-8 rounded-full transition-colors"
        >
          {t("notfound_planner")}
        </Link>
        <Link
          href={`/${locale}/blog`}
          className="border border-gray-200 text-gray-500 hover:border-[#F5A623] hover:text-[#8C4A00] font-bold py-3 px-8 rounded-full transition-colors"
        >
          {t("notfound_blog")}
        </Link>
      </div>
    </main>
  );
}
