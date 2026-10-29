import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo/pageMetadata";
import { searchAll, searchableCount } from "@/lib/search";
import type { Locale } from "@/lib/types";
import Footer from "@/components/Footer";

/**
 * 사이트 내 검색.
 *
 * 🔴 **JS 없이 동작해야 한다.** 평범한 `<form method="get">`이고 결과는 서버에서 그린다.
 * 08-17에 블로그 카테고리 칩을 고치다가 렌더프롭을 써서 SSR을 통째로 껐고, 그때
 * 블로그 카드가 초기 HTML에서 사라졌다. 이 사이트는 색인이 최대 현안이라 정반대 방향이다.
 * 검색은 클라이언트 상태가 전혀 필요 없는 기능이므로 처음부터 서버로 짠다.
 *
 * 🔴 **결과 페이지는 색인시키지 않는다.** 쿼리마다 URL이 생기는 얇은 페이지가 무한히
 * 늘어나는데, AdSense가 다섯 번 든 사유가 정확히 그것이었다.
 * `buildPageMetadata({ noindex: true })`는 실측상 **`noindex, nofollow`**를 내보낸다
 * (라이브 HTML로 확인). 여기선 그래도 무해하다 — 결과에 나오는 글·가이드는 전부
 * 다른 페이지에서도 링크되고 있어서(인바운드 0인 글 0건, 08-17 실측) 크롤 경로가 따로 있다.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    path: "/search",
    locale,
    title: "Search – Kiwi Lunchbox",
    description:
      "Search Kiwi Lunchbox lunch recipes, snacks, guides and posts by name or ingredient.",
    noindex: true,
  });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations();
  const { q } = await searchParams;
  const query = (q ?? "").slice(0, 100);
  const results = searchAll(query, locale);
  const hasQuery = query.trim().length > 0;

  return (
    <main
      className="min-h-screen bg-white"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}
    >
      <section className="bg-[#F7F9FC] pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4">
            {t("search_title")}
          </h1>
          <p className="text-gray-600 mb-8">
            {t("search_intro", { count: searchableCount(locale) })}
          </p>

          {/* method=get 이라 JS가 없어도 동작한다. 자동 제출·디바운스 같은 건 넣지 않는다. */}
          <form method="get" role="search" className="flex gap-2 max-w-xl mx-auto">
            <label htmlFor="q" className="sr-only">
              {t("search_label")}
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={query}
              maxLength={100}
              placeholder={t("search_placeholder")}
              className="flex-1 px-4 py-3 rounded-full border border-gray-200 text-[#1a1a1a] placeholder:text-gray-500 focus:outline-none focus:border-[#366A1B]"
            />
            <button
              type="submit"
              className="bg-[#366A1B] hover:bg-[#314A37] text-white font-semibold px-6 py-3 rounded-full transition-colors"
            >
              {t("search_button")}
            </button>
          </form>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12">
        {!hasQuery ? (
          <p className="text-center text-gray-600">{t("search_prompt")}</p>
        ) : results.total === 0 ? (
          <div className="text-center">
            <p className="text-gray-600 mb-6">{t("search_none", { query })}</p>
            <Link
              href={`/${locale}/planner`}
              className="text-[#366A1B] underline hover:text-[#24470F]"
            >
              {t("nav_planner")}
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-8">
              {t("search_count", { count: results.total, query })}
            </p>

            {results.articles.length > 0 && (
              <section className="mb-12">
                <h2 className="text-xl font-bold text-[#314A37] mb-5">
                  {t("search_section_articles")} ({results.articles.length})
                </h2>
                <ul className="grid gap-5 md:grid-cols-2">
                  {results.articles.map((a) => (
                    <li key={a.href}>
                      <Link
                        href={a.href}
                        className="flex gap-4 bg-[#F7F9FC] rounded-2xl overflow-hidden hover:shadow-md transition-shadow h-full"
                      >
                        <div className="relative w-28 shrink-0">
                          <Image src={a.image} alt="" fill className="object-cover" />
                        </div>
                        <div className="py-4 pr-4">
                          <p className="text-xs text-[#366A1B] font-semibold mb-1">{a.category}</p>
                          <h3 className="font-bold text-[#1a1a1a] leading-snug mb-1">{a.title}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2">{a.excerpt}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {results.menus.length > 0 && (
              <section className="mb-12">
                <h2 className="text-xl font-bold text-[#314A37] mb-5">
                  {t("search_section_menus")} ({results.menus.length})
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {results.menus.map((m) => (
                    <li
                      key={m.name}
                      className="bg-[#F7F9FC] rounded-2xl overflow-hidden flex flex-col"
                    >
                      <div className="relative h-32">
                        <Image src={m.image} alt="" fill className="object-cover" />
                      </div>
                      <div className="p-4 flex-1">
                        <p className="text-xs text-[#366A1B] font-semibold mb-1">{m.category}</p>
                        <h3 className="font-bold text-[#1a1a1a] leading-snug mb-1">{m.name}</h3>
                        <p className="text-xs text-gray-600 leading-relaxed">{m.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-gray-600 mt-4">
                  <Link
                    href={`/${locale}/planner`}
                    className="text-[#366A1B] underline hover:text-[#24470F]"
                  >
                    {t("search_menus_cta")}
                  </Link>
                </p>
              </section>
            )}

            {results.snacks.length > 0 && (
              <section className="mb-12">
                <h2 className="text-xl font-bold text-[#314A37] mb-5">
                  {t("search_section_snacks")} ({results.snacks.length})
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {results.snacks.map((s) => (
                    <li key={s.name} className="bg-[#F7F9FC] rounded-xl px-4 py-3">
                      <p className="text-xs text-[#366A1B] font-semibold mb-0.5">{s.category}</p>
                      <h3 className="font-semibold text-[#1a1a1a] text-sm">{s.name}</h3>
                      <p className="text-xs text-gray-600">{s.detail}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </section>

      <Footer locale={locale} />
    </main>
  );
}
