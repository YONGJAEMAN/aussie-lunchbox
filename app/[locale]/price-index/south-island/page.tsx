import Link from "next/link";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/pageMetadata";
import Footer from "@/components/Footer";
import { CHAINS, CHAIN_LABEL, NORTH, SOUTH, islandSummary, southTableRows } from "@/lib/islandPrices";

/**
 * 남섬 가격지수(2026-10-28~). 북섬 페이지와 **같은 고정 상품**을 크라이스트처치 매장에서 읽는다.
 * 🔴 모든 수치는 `lib/islandPrices.ts`가 데이터에서 낸다 — 손으로 적은 금액이 없다.
 * 🔴 비교 합계는 두 섬 값이 다 있는 품목만 더하고, 그 수를 바로 옆에 적는다(08-12 $28.50 사고).
 */

const STORES = {
  woolworths: "Woolworths Church Corner (online, pickup store set)",
  paknsave: "Pak'nSave Riccarton (online, store set)",
  newworld: "New World Ilam (online, store set)",
} as const;

const money = (v: number | null) => (v === null ? "—" : `$${v.toFixed(2)}`);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    path: "/price-index/south-island",
    locale,
    title: "South Island Lunchbox Prices — Christchurch vs Auckland | Kiwi Lunchbox",
    description: `The same ${SOUTH.items.length} pinned lunchbox staples, priced at Woolworths, Pak'nSave and New World in Christchurch and compared with Auckland. Regular prices, read weekly.`,
    ogType: "article",
    modifiedTime: SOUTH.lastUpdated,
  });
}

export default async function SouthIslandPriceIndexPage() {
  const locale = await getLocale();
  const rows = southTableRows();
  const summaries = CHAINS.map((c) => islandSummary(c));

  return (
    <main className="min-h-screen bg-white">
      <section className="bg-[#F7F9FC] pt-24 pb-16 px-4 text-center">
        <p className="text-[#366A1B] font-semibold text-sm uppercase tracking-widest mb-4">Original Data</p>
        <h1 className="text-3xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-3xl mx-auto leading-tight">
          South Island Lunchbox Prices
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
          The same {SOUTH.items.length} school lunchbox staples as our{" "}
          <Link href={`/${locale}/price-index`} className="text-[#366A1B] underline">
            Auckland price index
          </Link>
          , priced at Christchurch stores. Regular prices, not specials.
        </p>
        <div className="text-xs text-gray-500 mt-4 leading-relaxed">
          {CHAINS.map((c) => (
            <p key={c}>
              {CHAIN_LABEL[c]}: {SOUTH[`${c}Updated`] ?? "not read yet"} — {STORES[c]}
            </p>
          ))}
        </div>
        <p className="text-sm text-gray-600 max-w-xl mx-auto mt-4 leading-relaxed">
          <strong className="text-[#366A1B]">Last read {SOUTH.lastUpdated}.</strong> Every column
          is read again each Sunday evening, New Zealand time, alongside the Auckland stores.
        </p>
      </section>

      <section className="max-w-5xl mx-auto -mt-8 px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summaries.map((s) => (
            <div key={s.chain} className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <p className="text-sm font-semibold text-[#1a1a1a] mb-2">{CHAIN_LABEL[s.chain]}</p>
              {s.count > 0 ? (
                <>
                  <p className="text-sm text-gray-600">
                    Christchurch <strong>${s.south.toFixed(2)}</strong> vs Auckland{" "}
                    <strong>${s.north.toFixed(2)}</strong>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    on the same {s.count} of {s.total} items · dearer in Christchurch for {s.southDearer},
                    cheaper for {s.southCheaper}
                    {s.same ? `, the same for ${s.same}` : ""}
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-500">No item has a regular price in both cities yet.</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto mt-12 px-4">
        <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-2">Christchurch prices, item by item</h2>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          The small figure under each price is the same product at the Auckland store. A dash means
          there is no regular price to show: either the item was on special that week (we record
          regular prices only, and a special hides the regular one), or the Christchurch store does
          not stock the same product in the same size, so the row is left empty rather than filled
          with something different.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-3 font-semibold">Item</th>
                {CHAINS.map((c) => (
                  <th key={c} className="py-2 px-2 sm:px-3 font-semibold text-right">
                    {CHAIN_LABEL[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-b border-gray-100 align-top">
                  <td className="py-2 pr-3">
                    <span className="font-medium text-[#1a1a1a]">{r.name}</span>
                    {r.unit && <span className="block text-xs text-gray-400">{r.unit}</span>}
                  </td>
                  {CHAINS.map((c) => (
                    <td key={c} className="py-2 px-2 sm:px-3 text-right">
                      <span className="font-semibold">{money(r.south[c])}</span>
                      <span className="block text-xs text-gray-400 whitespace-nowrap">Akl {money(r.north[c])}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="max-w-5xl mx-auto mt-12 px-4 mb-16">
        <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-4">How this is measured</h2>
        <ul className="space-y-3 text-sm text-gray-600 leading-relaxed list-disc pl-5">
          <li>
            Each row is pinned to the same named product and size as the Auckland index. Where the
            Christchurch store does not stock it, we left the row empty instead of choosing a
            different product.
          </li>
          <li>
            Prices come from each chain&apos;s online shop with a Christchurch store selected, and
            every reading is checked to confirm it came back for that store. These are online
            prices and may differ from the shelf tag.
          </li>
          <li>
            Prices differ between the islands at all three chains, Woolworths included. The
            Christchurch and Auckland figures above are compared only on items read within the same
            30 days in both cities, and the count is always shown next to the total.
          </li>
          <li>
            The South Island columns started on {SOUTH.items.length ? (SOUTH.woolworthsUpdated ?? SOUTH.lastUpdated) : "—"};
            the Auckland columns go back further, on the{" "}
            <Link href={`/${locale}/price-history`} className="text-[#366A1B] underline">
              price history page
            </Link>
            . Auckland data on this page was last read {NORTH.lastUpdated}.
          </li>
        </ul>
        <p className="text-sm text-gray-600 mt-6 leading-relaxed">
          In the{" "}
          <Link href={`/${locale}/planner`} className="text-[#366A1B] underline">
            planner
          </Link>
          , choose South Island to use the South Island supermarket mailers for specials.
        </p>
      </section>

      <Footer locale={locale} />
    </main>
  );
}
