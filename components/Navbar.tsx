"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// 2026-10-29 언어 전환 복원. /ko, /zh는 열리지만 noindex·hreflang 없음·광고 코드 없음 그대로다
// (app/[locale]/layout.tsx의 isEnglish 가드). 영어 페이지만 색인·심사 대상.
const LOCALES = [
  { code: "en", label: "EN", name: "English" },
  { code: "ko", label: "한", name: "한국어" },
  { code: "zh", label: "中", name: "中文" },
];

const NAV_KEYS = [
  { href: "", key: "nav_home" },
  { href: "/planner", key: "nav_planner" },
  { href: "/price-index", key: "nav_price_index" },
  { href: "/blog", key: "nav_blog" },
  { href: "/guides", key: "nav_guides" },
  { href: "/faq", key: "nav_faq" },
  { href: "/about", key: "nav_about" },
  { href: "/contact", key: "nav_contact" },
] as const;

export default function Navbar() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const segments = pathname.split("/").filter(Boolean);
  const currentLocale = LOCALES.find((l) => l.code === segments[0])?.code ?? "en";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  function switchLocale(locale: string) {
    const withoutLocale = segments.slice(1).join("/");
    router.push(`/${locale}${withoutLocale ? `/${withoutLocale}` : ""}`);
  }

  function isActive(href: string) {
    const fullHref = `/${currentLocale}${href}`;
    return pathname === fullHref || (href !== "" && pathname.startsWith(fullHref));
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${currentLocale}`);
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href={`/${currentLocale}`} className="flex items-center gap-2 min-h-touch min-w-touch">
          <span className="text-2xl">🥝</span>
          <span className="font-bold text-[#314A37] text-lg hidden sm:block">Kiwi Lunchbox</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {NAV_KEYS.map((link) => (
            <Link
              key={link.href}
              href={`/${currentLocale}${link.href}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-[#E8F5E9] text-[#314A37]"
                  : "text-gray-600 hover:text-[#314A37] hover:bg-gray-50"
              }`}
            >
              {t(link.key)}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {/* 검색은 NAV_KEYS에 넣지 않는다 — 이미 8개라 데스크톱에서 줄이 넘친다.
              아이콘만 두고 이름은 aria-label로 준다. 링크라서 JS 없이도 동작한다. */}
          <Link
            href={`/${currentLocale}/search`}
            aria-label={t("nav_search")}
            className={`p-2 rounded-full transition-colors ${
              isActive("/search")
                ? "bg-[#E8F5E9] text-[#314A37]"
                : "text-gray-600 hover:text-[#314A37] hover:bg-gray-50"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
          </Link>

          <div className="flex items-center border border-gray-200 rounded-full overflow-hidden text-sm">
            {LOCALES.map((loc) => (
              <button
                key={loc.code}
                lang={loc.code}
                aria-label={loc.name}
                aria-pressed={currentLocale === loc.code}
                onClick={() => switchLocale(loc.code)}
                className={`min-h-touch inline-flex items-center justify-center px-3 py-1.5 font-medium transition-colors ${
                  currentLocale === loc.code
                    ? "bg-primary-deep text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {loc.label}
              </button>
            ))}
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/${currentLocale}/account`}
                className="text-sm text-[#314A37] font-medium hover:underline"
              >
                👤 {user.email?.split("@")[0]}
              </Link>
              <button
                onClick={handleSignOut}
                className="min-h-touch inline-flex items-center justify-center text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                {t("nav_sign_out")}
              </button>
            </div>
          ) : (
            <Link
              href={`/${currentLocale}/account`}
              className="bg-primary-deep hover:bg-[#314A37] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            >
              {t("nav_log_in")}
            </Link>
          )}
        </div>

        <button
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 min-h-touch min-w-touch flex items-center justify-center"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-1">
          {NAV_KEYS.map((link) => (
            <Link
              key={link.href}
              href={`/${currentLocale}${link.href}`}
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-[#E8F5E9] text-[#314A37]"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t(link.key)}
            </Link>
          ))}
          <Link
            href={`/${currentLocale}/search`}
            onClick={() => setMenuOpen(false)}
            className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive("/search")
                ? "bg-[#E8F5E9] text-[#314A37]"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t("nav_search")}
          </Link>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center border border-gray-200 rounded-full overflow-hidden text-sm">
              {LOCALES.map((loc) => (
                <button
                  key={loc.code}
                  lang={loc.code}
                  aria-label={loc.name}
                  aria-pressed={currentLocale === loc.code}
                  onClick={() => { switchLocale(loc.code); setMenuOpen(false); }}
                  className={`min-h-touch inline-flex items-center justify-center px-3 py-1.5 font-medium transition-colors ${
                    currentLocale === loc.code
                      ? "bg-primary-deep text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {loc.label}
                </button>
              ))}
            </div>
            {user ? (
              <button
                onClick={() => { handleSignOut(); setMenuOpen(false); }}
                className="min-h-touch inline-flex items-center justify-center text-sm text-red-500 font-medium"
              >
                {t("nav_sign_out")}
              </button>
            ) : (
              <Link
                href={`/${currentLocale}/account`}
                onClick={() => setMenuOpen(false)}
                className="bg-primary-deep text-white text-sm font-semibold px-4 py-2 rounded-full"
              >
                {t("nav_log_in")}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
