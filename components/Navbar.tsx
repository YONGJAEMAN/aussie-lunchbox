"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "ko", label: "한" },
  { code: "zh", label: "中" },
];

const NAV_LINKS = [
  { href: "", label: "Home" },
  { href: "/planner", label: "Planner" },
  { href: "/blog", label: "Blog" },
  { href: "/guides", label: "Guides" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Extract current locale from pathname (e.g., /en/planner -> en)
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
    // Replace current locale prefix with new one
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
        {/* Logo */}
        <Link href={`/${currentLocale}`} className="flex items-center gap-2">
          <span className="text-2xl">🦘</span>
          <span className="font-bold text-[#7B3F00] text-lg hidden sm:block">Aussie Lunchbox</span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={`/${currentLocale}${link.href}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-[#FFF4DE] text-[#7B3F00]"
                  : "text-gray-600 hover:text-[#7B3F00] hover:bg-gray-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side: Locale switcher + Account */}
        <div className="hidden md:flex items-center gap-2">
          {/* Locale switcher */}
          <div className="flex items-center border border-gray-200 rounded-full overflow-hidden text-sm">
            {LOCALES.map((loc) => (
              <button
                key={loc.code}
                onClick={() => switchLocale(loc.code)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  currentLocale === loc.code
                    ? "bg-[#F5A623] text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {loc.label}
              </button>
            ))}
          </div>

          {/* Account button */}
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/${currentLocale}/account`}
                className="text-sm text-[#7B3F00] font-medium hover:underline"
              >
                👤 {user.email?.split("@")[0]}
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href={`/${currentLocale}/account`}
              className="bg-[#F5A623] hover:bg-[#7B3F00] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            >
              Log In
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
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

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={`/${currentLocale}${link.href}`}
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-[#FFF4DE] text-[#7B3F00]"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center border border-gray-200 rounded-full overflow-hidden text-sm">
              {LOCALES.map((loc) => (
                <button
                  key={loc.code}
                  onClick={() => { switchLocale(loc.code); setMenuOpen(false); }}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    currentLocale === loc.code
                      ? "bg-[#F5A623] text-white"
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
                className="text-sm text-red-500 font-medium"
              >
                Sign out
              </button>
            ) : (
              <Link
                href={`/${currentLocale}/account`}
                onClick={() => setMenuOpen(false)}
                className="bg-[#F5A623] text-white text-sm font-semibold px-4 py-2 rounded-full"
              >
                Log In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
