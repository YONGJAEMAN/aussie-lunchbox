import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { buildPageMetadata, withBrand } from "@/lib/seo/pageMetadata";
import {
  CHAINS, CHAIN_LABEL, allItems, coverage, seriesItems, seriesFor, changeSince, MIN_POINTS,
} from "@/lib/priceSeries";
import Footer from "@/components/Footer";
import { BRAND } from "@/lib/brand";

/**
 * 가격 추이 — 관측한 값을 전부, 관측한 그대로(Kiwi 페이지의 AU판).
 *
 * 🔴 Aussie 이력은 2026-10-30에 시작했다. 관측이 적은 동안 「추이」라고 부르지 않는다 —
 *    `MIN_POINTS` 미만인 품목은 변동 표에 안 싣고, 그 사실을 화면이 먼저 말한다.
 */

export async function generateMetadata(): Promise<Metadata> {
  const [cov] = coverage();
  return buildPageMetadata({
    path: "/price-history",
    locale: await getLocale(),
    title: withBrand("Lunchbox Staples Price History (Australia)"),
    description:
      `Every regular Woolworths shelf price we have recorded for Australian lunchbox staples since ${cov.first}. Fixed products, no specials, no interpolation.`,
  });
}

const money = (n: number) => `$${n.toFixed(2)}`;
const pctLabel = (p: number) => `${p > 0 ? "+" : ""}${p.toFixed(1)}%`;

export default async function PriceHistoryPage() {
  const locale = await getLocale();
  const cov = coverage();
  const items = allItems();
  const trended = seriesItems();
  const totalPoints = items.reduce((n, it) => n + CHAINS.reduce((m, c) => m + seriesFor(it).byChain[c].length, 0), 0);
  const first = cov.map((c) => c.first).filter(Boolean).sort()[0] ?? "";
  const last = cov.map((c) => c.last).filter(Boolean).sort().at(-1) ?? "";

  const movers = trended
    .map((it) => ({ it, ch: changeSince(it, "woolworths") }))
    .filter((r): r is { it: string; ch: NonNullable<ReturnType<typeof changeSince>> } => r.ch !== null)
    .sort((a, b) => Math.abs(b.ch.pct) - Math.abs(a.ch.pct));

  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Australian Lunchbox Price History",
    description: `Every recorded regular shelf price for lunchbox staples at Woolworths Australia online, ${first} to ${last}. Fixed SKUs. Specials excluded. ${totalPoints} observations.`,
    creator: { "@type": "Person", name: "Yong Jae Lee", url: "https://www.linkedin.com/in/francescolee/" },
    dateModified: last,
    spatialCoverage: "Australia",
    temporalCoverage: `${first}/${last}`,
    license: "https://creativecommons.org/licenses/by/4.0/",
    variableMeasured: "Regular shelf price (AUD)",
    distribution: [{ "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: `${BRAND.SITE_URL}/price-history.csv` }],
  };

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd).replace(/</g, "\\u003c") }}
      />

      <section className="bg-[#F7F9FC] pt-24 pb-16 px-4 text-center">
        <p className="text-[#366A1B] font-semibold text-sm uppercase tracking-widest mb-4">Original Data</p>
        <h1 className="text-3xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-3xl mx-auto leading-tight">
          Every price reading we have
        </h1>
        <p className="text-[#555] max-w-2xl mx-auto text-lg">
          {totalPoints} readings of {items.length} lunchbox staples at Woolworths,{" "}
          {first === last ? <>all on {first}</> : <>{first} to {last}</>}. Regular shelf prices, not specials.
        </p>
        <p className="text-[#555] max-w-2xl mx-auto mt-4">
          For this week&apos;s prices in one table, use the{" "}
          <Link href={`/${locale}/price-index`} className="text-[#366A1B] underline font-semibold">price index</Link>.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">How often each chain was read</h2>
        <p className="text-[#555] mb-6">
          A point exists only where the price was actually read, so gaps are real gaps — no line is
          drawn through days that were not measured. Coles is not tracked: its website stops automated readers with a
          bot check, and I don&apos;t work around that.
        </p>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-[#e5e5e5] text-sm text-[#666]">
              <th className="py-2">Chain</th><th className="py-2">Readings</th><th className="py-2">First</th><th className="py-2">Most recent</th>
            </tr>
          </thead>
          <tbody>
            {cov.map((c) => (
              <tr key={c.chain} className="border-b border-[#f0f0f0]">
                <td className="py-2 font-semibold">{CHAIN_LABEL[c.chain]}</td>
                <td className="py-2">{c.rounds}</td>
                <td className="py-2">{c.first}</td>
                <td className="py-2">{c.last}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12 border-t border-[#f0f0f0]">
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">What moved, first reading to last</h2>
        {movers.length === 0 ? (
          <p className="text-[#555]">
            Not yet. An item needs at least {MIN_POINTS} readings before a change is shown here — one or two readings
            are a snapshot, not a trend. The readings so far are listed below.
          </p>
        ) : (
          <>
            <p className="text-[#555] mb-6">
              {movers.length} staples have at least {MIN_POINTS} readings. Change is from that item&apos;s first reading
              to its most recent one.
            </p>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[#e5e5e5] text-sm text-[#666]">
                  <th className="py-2">Item</th><th className="py-2">First</th><th className="py-2">Latest</th><th className="py-2">Change</th>
                </tr>
              </thead>
              <tbody>
                {movers.map(({ it, ch }) => (
                  <tr key={it} className="border-b border-[#f0f0f0]">
                    <td className="py-2 font-semibold">{it}</td>
                    <td className="py-2 text-[#666]">{money(ch.from.price)}<span className="text-xs block">{ch.from.date}</span></td>
                    <td className="py-2">{money(ch.to.price)}<span className="text-xs block text-[#666]">{ch.to.date}</span></td>
                    <td className={`py-2 font-bold ${ch.pct > 0 ? "text-[#B23B3B]" : "text-[#366A1B]"}`}>{pctLabel(ch.pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12 border-t border-[#f0f0f0]">
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-6">Every reading, item by item</h2>
        <div className="space-y-4">
          {items.map((it) => {
            const s = seriesFor(it);
            return (
              <div key={it} className="text-sm">
                <span className="font-semibold text-[#1a1a1a] inline-block w-56">{it}</span>
                <span className="text-[#333]">{s.byChain.woolworths.map((p) => `${p.date} ${money(p.price)}`).join("  ·  ")}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12 border-t border-[#f0f0f0]">
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">How this was collected</h2>
        <p className="text-[#555] mb-3">
          Each item is pinned to one Woolworths product code, so a reading compares the same pack with itself over
          time. Prices are the regular shelf price; on special, the price it returns to.
        </p>
        <p className="text-[#555]">
          Every reading on this page, one row per observation, is downloadable as{" "}
          <a href="/price-history.csv" className="text-[#366A1B] underline font-semibold">price-history.csv</a>{" "}
          (CC BY 4.0). The row count is the number of observations, not the number of weeks — an item only gets a new
          row when its price was read on a new date.
        </p>
      </section>

      <Footer locale={locale} />
    </main>
  );
}
