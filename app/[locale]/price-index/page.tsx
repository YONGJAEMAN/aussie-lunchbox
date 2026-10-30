import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { buildPageMetadata, withBrand } from "@/lib/seo/pageMetadata";
import {
  indexItems, indexUpdated, basketTotal, colesStatus, sourceFor, CATEGORIES,
} from "@/lib/priceIndex";
import { unitPriceLabel } from "@/lib/unitPrice";
import { coverage } from "@/lib/priceSeries";
import Footer from "@/components/Footer";
import { BRAND } from "@/lib/brand";

/**
 * 가격지수 — Woolworths 한 체인의 고정 장바구니(Kiwi 1,024줄 페이지의 AU판, 작게).
 *
 * 🔴 「어느 마트가 싼가」를 말하지 않는다 — Coles를 읽을 수 없다(`lib/priceIndex.ts`).
 * 🔴 숫자는 전부 `lib/priceIndex.ts`·`lib/priceSeries.ts`에서 온다. 손으로 적지 말 것(가드가 본다).
 */

const TITLE = "Lunchbox Staples Price Index (Australia) — Woolworths basket";

const auLong = (iso: string) =>
  new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${iso}T12:00:00+10:00`));
const money = (n: number) => `$${n.toFixed(2)}`;

export async function generateMetadata(): Promise<Metadata> {
  const { of } = basketTotal();
  return buildPageMetadata({
    path: "/price-index",
    locale: await getLocale(),
    title: withBrand(TITLE),
    description: `The regular Woolworths shelf price of ${of} fixed lunchbox staples, read on ${indexUpdated()}. Same products every week, specials excluded.`,
  });
}

export default async function PriceIndexPage() {
  const locale = await getLocale();
  const items = indexItems();
  const updated = indexUpdated();
  const { total, counted, of } = basketTotal();
  const coles = colesStatus();
  const [cov] = coverage();

  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Australian lunchbox staples price index",
    description: `Regular shelf prices of ${of} fixed lunchbox staples at Woolworths Australia online. Fixed SKUs, specials excluded.`,
    creator: { "@type": "Person", name: "Yong Jae Lee", url: "https://www.linkedin.com/in/francescolee/" },
    dateModified: updated,
    spatialCoverage: "Australia",
    license: "https://creativecommons.org/licenses/by/4.0/",
    variableMeasured: "Regular shelf price (AUD)",
    distribution: [{ "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: `${BRAND.SITE_URL}/price-index.csv` }],
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
          What a basket of lunchbox staples costs
        </h1>
        <p className="text-[#555] max-w-2xl mx-auto text-lg">
          The same {of} products, read at their regular Woolworths shelf price
          {updated ? <> on {auLong(updated)}</> : null}. Not specials, not member prices.
        </p>
        {counted > 0 && (
          <p className="text-[#1a1a1a] max-w-2xl mx-auto text-2xl font-extrabold mt-6">
            {money(total)}
            <span className="block text-sm font-normal text-[#666]">
              for all {counted === of ? of : `${counted} of ${of}`} items, one of each
            </span>
          </p>
        )}
      </section>

      {!coles.tracked && (
        <section className="max-w-4xl mx-auto px-4 pt-10">
          <div className="rounded-xl border-2 border-[#E0A800] bg-[#FFF8E1] p-4 text-[#333]">
            <p className="font-bold mb-1">Coles is not tracked.</p>
            <p className="text-sm">
              Coles&apos; website stopped my price reader with a bot check after a few product pages, and I
              don&apos;t work around those. So this page does not say which supermarket is cheaper — only what
              this basket costs at Woolworths and, as the weeks add up, how that changes.
            </p>
          </div>
        </section>
      )}

      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-6">The basket</h2>
        {CATEGORIES.map((cat) => (
          <div key={cat} className="mb-8">
            <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">{cat}</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[#e5e5e5] text-sm text-[#666]">
                  <th className="py-2">Item</th>
                  <th className="py-2">Product</th>
                  <th className="py-2 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {items.filter((i) => i.category === cat).map((i) => {
                  const unit = unitPriceLabel(i.name, i.woolworths);
                  return (
                    <tr key={i.name} className="border-b border-[#f0f0f0] align-top">
                      <td className="py-2 font-semibold">
                        {i.name}
                        <span className="block text-xs font-normal text-[#666]">{i.unit}</span>
                      </td>
                      <td className="py-2 text-sm text-[#555]">
                        {i.note || "Woolworths own brand"}
                        <span className="block text-xs text-[#888]">SKU {sourceFor(i.name)?.sku}</span>
                      </td>
                      <td className="py-2 text-right">
                        {typeof i.woolworths === "number" ? money(i.woolworths) : <span className="text-[#888]">not read</span>}
                        {unit && <span className="block text-xs text-[#666]">{unit}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12 border-t border-[#f0f0f0]">
        <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-4">How the index is built</h2>
        <p className="text-[#555] mb-3">
          Each item is pinned to one Woolworths product code, chosen by hand, so every reading compares the same
          pack with itself. Where I could, I picked a national brand rather than a store brand. If Woolworths renames
          a product or changes its size, the reader stops for that item and keeps the last value until I pick a
          replacement — a different product would look like a price change.
        </p>
        <p className="text-[#555] mb-3">
          Prices are the regular shelf price. When an item is on special, I record the price it returns to
          (the &ldquo;was&rdquo; price), and if Woolworths doesn&apos;t show one, I keep last week&apos;s value. A
          special is a promotion, not the price of the item.
        </p>
        <p className="text-[#555] mb-3">
          Readings come from Woolworths&apos; online prices with no store or postcode selected. Your local store may
          differ. The basket is re-read every Sunday; if fewer than eight in ten items can be read, nothing
          is updated that week and the date above stays where it was.
        </p>
        <p className="text-[#555]">
          Every row is in{" "}
          <a href="/price-index.csv" className="text-[#366A1B] underline font-semibold">price-index.csv</a>{" "}
          (CC BY 4.0).{" "}
          {cov.rounds > 0 && (
            <>
              Every past reading is on the{" "}
              <Link href={`/${locale}/price-history`} className="text-[#366A1B] underline font-semibold">
                price history
              </Link>{" "}
              page.
            </>
          )}{" "}
          What the{" "}
          <Link href={`/${locale}/planner`} className="text-[#366A1B] underline font-semibold">planner</Link>{" "}
          costs a lunchbox at is a separate, larger set of ingredients, listed in{" "}
          <a href="/lunchbox-ingredients.csv" className="text-[#366A1B] underline font-semibold">lunchbox-ingredients.csv</a>.
        </p>
      </section>

      <Footer locale={locale} />
    </main>
  );
}
