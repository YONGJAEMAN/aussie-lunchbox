import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo/pageMetadata";
import {
  CHAINS, coverage, fullSpanItems, seriesItems, seriesFor, skuChanges, changeSince, missingChains,
  MIN_POINTS, type Chain,
} from "@/lib/priceSeries";
import Footer from "@/components/Footer";
import { BRAND } from "@/lib/brand";

const CHAIN_LABEL: Record<Chain, string> = {
  woolworths: "Woolworths",
  paknsave: "Pak'nSave",
  newworld: "New World",
};

export async function generateMetadata(): Promise<Metadata> {
  const cov = coverage();
  const first = cov.map((c) => c.first).filter(Boolean).sort()[0];
  const last = cov.map((c) => c.last).filter(Boolean).sort().at(-1);
  return buildPageMetadata({
    path: "/price-history",
    locale: await getLocale(),
    title: "NZ Lunchbox Price History — every reading we have | Kiwi Lunchbox",
    description:
      `Every shelf price we have recorded for NZ school lunchbox staples at Woolworths, Pak'nSave and New World, ${first} to ${last}. Fixed products, regular prices, no interpolation.`,
  });
}

const money = (n: number) => `$${n.toFixed(2)}`;
const pctLabel = (p: number) => `${p > 0 ? "+" : ""}${p.toFixed(1)}%`;

export default async function PriceHistoryPage() {
  const locale = await getLocale();
  const cov = coverage();
  const spine = fullSpanItems();
  const items = seriesItems();
  const changes = skuChanges();
  const totalPoints = items.reduce(
    (n, it) => n + CHAINS.reduce((m, c) => m + seriesFor(it).byChain[c].length, 0), 0,
  );
  const first = cov.map((c) => c.first).filter(Boolean).sort()[0];
  const last = cov.map((c) => c.last).filter(Boolean).sort().at(-1) ?? "";

  /* 🔴 뼈대 품목의 변동 — 첫 관측 대비. 관측이 모자라면 null 이고, 그 행은 안 그린다. */
  const movers = spine
    .map((it) => ({ it, ch: changeSince(it, "paknsave") ?? changeSince(it, "woolworths") }))
    .filter((r): r is { it: string; ch: NonNullable<ReturnType<typeof changeSince>> } => r.ch !== null)
    .sort((a, b) => Math.abs(b.ch.pct) - Math.abs(a.ch.pct));

  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "NZ Lunchbox Price History",
    description:
      `Every recorded regular shelf price for school lunchbox staples at three New Zealand supermarket chains, ${first} to ${last}. Fixed SKUs. Specials excluded. ${totalPoints} observations.`,
    creator: { "@type": "Person", name: "Yong Jae Lee", url: "https://www.linkedin.com/in/francescolee/" },
    dateModified: last,
    spatialCoverage: "Auckland, New Zealand",
    temporalCoverage: `${first}/${last}`,
    license: "https://creativecommons.org/licenses/by/4.0/",
    variableMeasured: "Regular shelf price (NZD)",
    /* 🔴 읽을 수 있는 원자료가 실제로 있다 — 2026-09-09 외부 감사가 지적한 자리다. */
    distribution: [{
      "@type": "DataDownload",
      encodingFormat: "text/csv",
      contentUrl: `${BRAND.SITE_URL}/price-history.csv`,
    }],
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
          {totalPoints} readings of {items.length} lunchbox staples at {CHAINS.length} New Zealand
          supermarket chains, {first} to {last}. Regular shelf prices, not specials.
        </p>
        <p className="text-[#555] max-w-2xl mx-auto mt-4">
          For this week&apos;s side-by-side comparison, use the{" "}
          <Link href={`/${locale}/price-index`} className="text-[#366A1B] underline font-semibold">price index</Link>.
        </p>
      </section>

      {/* 🔴 커버리지를 먼저 말한다. 「넉 달 매주」가 아니기 때문이다. */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">How often each chain was read</h2>
        <p className="text-[#555] mb-6">
          These are not evenly spaced. A point exists only where that column was actually read and the
          value had changed, so gaps are real gaps — we do not draw a line through days we did not measure.
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

      {/* 뼈대 — 세 열 전부 관측된 품목 */}
      <section className="max-w-4xl mx-auto px-4 py-12 border-t border-[#f0f0f0]">
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">
          What moved most, first reading to last
        </h2>
        <p className="text-[#555] mb-6">
          {spine.length} staples have at least {MIN_POINTS} readings in every chain. Change is measured
          from that item&apos;s own first reading to its most recent one — not from a fixed date, because
          the chains did not all start on the same day.
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
      </section>

      {/* 🔴 SKU 교체 — 숨기지 않고 적는다 */}
      {changes.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-12 border-t border-[#f0f0f0]">
          <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">Where the product itself changed</h2>
          <p className="text-[#555] mb-6">
            {changes.length} of the products we track were replaced part-way through — a different pack
            size, usually. We keep these as separate records rather than joining them, because a
            6-pack and an 8-pack are not the same thing and joining them would read as a price move.
          </p>
          <ul className="space-y-3">
            {changes.map((k) => (
              <li key={`${k.from}->${k.to}`} className="text-[#333]">
                <span className="font-semibold">{k.from}</span>{" "}
                <span className="text-[#666]">(last read {k.fromLast})</span>{" "}→{" "}
                <span className="font-semibold">{k.to}</span>{" "}
                <span className="text-[#666]">(first read {k.toFirst})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 품목별 전체 관측 */}
      <section className="max-w-4xl mx-auto px-4 py-12 border-t border-[#f0f0f0]">
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-6">Every reading, item by item</h2>
        <div className="space-y-10">
          {items.map((it) => {
            const s = seriesFor(it);
            const absent = missingChains(it);
            return (
              <div key={it}>
                <h3 className="text-lg font-bold text-[#1a1a1a] mb-1">{it}</h3>
                {absent.length > 0 && (
                  <p className="text-sm text-[#B23B3B] mb-2">
                    Not stocked in a matching size at {absent.map((c) => CHAIN_LABEL[c]).join(", ")} — no readings at all, which is not the same as a price of zero.
                  </p>
                )}
                <div className="space-y-2">
                  {CHAINS.filter((c) => s.byChain[c].length > 0).map((c) => (
                    <div key={c} className="text-sm">
                      <span className="font-semibold text-[#366A1B] inline-block w-28">{CHAIN_LABEL[c]}</span>
                      <span className="text-[#333]">
                        {s.byChain[c].map((p) => `${p.date} ${money(p.price)}`).join("  ·  ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12 border-t border-[#f0f0f0]">
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">How this was collected</h2>
        <p className="text-[#555] mb-3">
          Each item is pinned to one product code per chain, so a reading compares the same pack to
          itself over time. Prices are the regular shelf price; when an item is on special the chain
          does not publish its regular price, so we skip that item that week rather than record the
          special as if it were the shelf price.
        </p>
        <p className="text-[#555] mb-3">
          Readings come from each chain&apos;s own online price feed, with the store set to Auckland.
          The data is free to reuse with attribution (CC BY 4.0).
        </p>
        <p className="text-[#555]">
          Every reading on this page, one row per observation, is downloadable as{" "}
          <a href="/price-history.csv" className="text-[#366A1B] underline font-semibold">
            price-history.csv
          </a>
          . The row count is the number of observations, not the number of weeks — an item only
          gets a new row when its price actually changed.
        </p>
      </section>

      <Footer locale={locale} />
    </main>
  );
}
