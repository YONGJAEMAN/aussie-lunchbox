import { NextResponse } from "next/server";
import index from "@/data/priceIndex.json";
import sources from "@/data/priceIndexSources.json";
import { packSizeFromName } from "@/lib/unitPrice";

/**
 * 가격지수 원자료 CSV.
 *
 * 🔴 2026-09-09 외부 감사 — 화면의 표만으로는 **한 칸의 근거를 되짚을 수 없었다.**
 *    어느 상품인지(SKU), 몇 그램짜리인지, 언제 읽은 값인지가 표에 없었다.
 *    한 줄 = 한 체인의 한 품목 관측이고, 그 줄만 보고 재검산할 수 있어야 한다.
 *
 * 🔴 **정상가만 싣는다.** 지수는 특가 주간에 `originalPrice`를 기록한다 —
 *    특가를 넣으면 물가가 내린 것처럼 보이는 거짓 신호가 된다. 그래서 `price_type`은
 *    항상 `regular`이고, 특가라 갱신을 건너뛴 행은 `excluded_reason`에 이유가 붙는다.
 *
 * 🔴 관측일이 열마다 다르다. Woolworths는 자동 갱신이라 **열 날짜**를 쓰고,
 *    매장 확인이 필요한 두 열은 **행마다** 날짜가 있다. 없는 날짜를 열 날짜로
 *    채우지 않는다 — 그건 언제 잰지 모르는 값에 날짜를 지어내는 것이다.
 */

type Row = {
  name: string;
  note?: string;
  unit?: string;
  countdown: number | null;
  paknsave: number | null;
  newworld?: number | null;
  paknsaveAsOf?: string | null;
  newworldAsOf?: string | null;
};

type SourceEntry = {
  sku?: string;
  pinnedName?: string;
  pinnedSize?: string;
  paknsave?: { sku?: string; pinnedName?: string; pinnedSize?: string; blocked?: boolean };
  newworld?: { sku?: string; pinnedName?: string; pinnedSize?: string };
};

const IDX = index as unknown as {
  items: Row[];
  woolworthsUpdated: string;
  paknsaveUpdated: string;
  newworldUpdated: string;
};
const SRC = (sources as unknown as { items: Record<string, SourceEntry> }).items;

const q = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** 100g/100mL/개당 단가. 크기를 모르거나 값이 없으면 빈칸 — 지어내지 않는다. */
function normalisedUnitPrice(name: string, price: number | null): string {
  if (typeof price !== "number" || !(price > 0)) return "";
  const size = packSizeFromName(name);
  if (!size) return "";
  if (size.unit === "ea") return size.n > 1 ? (price / size.n).toFixed(4) : "";
  return ((price / size.n) * 100).toFixed(4);
}

function unitBasis(name: string): string {
  const size = packSizeFromName(name);
  if (!size) return "";
  if (size.unit === "ea") return size.n > 1 ? "per item" : "";
  return size.unit === "g" ? "per 100g" : "per 100mL";
}

const HEADER = [
  "observed_on",
  "date_basis",
  "chain",
  "store",
  "index_item",
  "product_name",
  "sku",
  "pack_size",
  "price_nzd",
  "price_type",
  "unit_price_nzd",
  "unit_basis",
  "measurement",
  "product_identified",
  "excluded_reason",
].join(",");

export function GET() {
  const lines: string[] = [HEADER];

  for (const item of IDX.items) {
    const src = SRC[item.name] ?? {};
    const chains: Array<{
      chain: string;
      price: number | null;
      observed: string | null;
      basis: string;
      sku?: string;
      product?: string;
      size?: string;
      blocked?: boolean;
    }> = [
      {
        chain: "Woolworths",
        price: item.countdown,
        observed: IDX.woolworthsUpdated,
        basis: "column (automated re-read)",
        sku: src.sku,
        product: src.pinnedName,
        size: src.pinnedSize,
      },
      {
        chain: "Pak'nSave",
        price: item.paknsave,
        observed: item.paknsaveAsOf ?? null,
        basis: "row (checked individually)",
        sku: src.paknsave?.sku,
        product: src.paknsave?.pinnedName,
        size: src.paknsave?.pinnedSize,
        blocked: src.paknsave?.blocked,
      },
      {
        chain: "New World",
        price: item.newworld ?? null,
        observed: item.newworldAsOf ?? null,
        basis: "row (checked individually)",
        // 🔴 09-28 — 수집기는 `newworld ?? paknsave` SKU로 읽는다(같은 Foodstuffs 상품번호).
        //    `newworld`만 보면 실제로 SKU로 읽힌 행이 「기록 없음」으로 나갔다.
        sku: (src.newworld ?? src.paknsave)?.sku,
        product: (src.newworld ?? src.paknsave)?.pinnedName,
        size: (src.newworld ?? src.paknsave)?.pinnedSize,
      },
    ];

    for (const c of chains) {
      if (c.price === null && !c.observed) continue; // 추적하지 않는 조합은 줄을 만들지 않는다
      const excluded =
        c.price === null ? (c.blocked ? "no matching product at this chain" : "not tracked or held back") : "";
      // 🔴 2026-09-10 외부 감사 — New World 18행 중 16행의 상품명·SKU가 비어 있는데
      //    글은 "each chain's pinned product, SKU and reading date"라고 말하고 있었다.
      //    빈칸이 가격을 지어냈다는 뜻은 아니지만, 어떤 상품인지 독자가 되짚을 수 없다.
      //    빈칸을 채우는 대신 **왜 비었는지를 줄마다 적는다** — 없는 SKU를 지어낼 수는 없다.
      const identified =
        c.price === null ? "" : c.sku ? "pinned SKU" : "not recorded";
      lines.push(
        [
          q(c.observed ?? ""),
          q(c.observed ? c.basis : "not recorded"),
          q(c.chain),
          q("Ormiston, Auckland"),
          q(item.note ? `${item.name} — ${item.note}` : item.name),
          q(c.product ?? ""),
          q(c.sku ?? ""),
          q(c.size ?? ""),
          q(c.price ?? ""),
          q(c.price === null ? "" : "regular"),
          q(normalisedUnitPrice(item.name, c.price)),
          q(unitBasis(item.name)),
          q("observed"),
          q(identified),
          q(excluded),
        ].join(","),
      );
    }
  }

  return new NextResponse(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="kiwi-lunchbox-price-index.csv"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
