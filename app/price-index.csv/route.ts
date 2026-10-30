import { NextResponse } from "next/server";
import { indexItems, indexUpdated, indexStore, sourceFor } from "@/lib/priceIndex";
import { packSizeFromName, unitPriceLabel } from "@/lib/unitPrice";

/**
 * 가격지수 원자료 — 한 줄 = 한 품목. 페이지 표와 **같은 함수**(`lib/priceIndex.ts`)에서 나온다.
 *
 * 🔴 값을 못 읽은 행도 싣는다(price_aud 빈칸). 빼면 합계를 검산하는 독자가 「몇 개를 더했나」를 못 맞춘다.
 * 🔴 상품명·규격은 고정 당시 값(`priceIndexSources.json`)이다 — 수집기가 다르면 그 주 값을 안 바꾼다(DRIFT).
 */

const q = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const HEADER = [
  "index_item", "category", "unit", "note", "chain", "product_name", "sku", "pack_size",
  "price_aud", "unit_price", "observed_on", "store", "price_type",
].join(",");

export function GET() {
  const observed = indexUpdated() ?? "";
  const lines: string[] = [HEADER];
  for (const i of indexItems()) {
    const src = sourceFor(i.name);
    const size = packSizeFromName(i.name);
    lines.push([
      q(i.name), q(i.category), q(i.unit), q(i.note), "Woolworths",
      q(src?.pinnedName), q(src?.sku), q(size ? `${size.n}${size.unit}` : ""),
      q(typeof i.woolworths === "number" ? i.woolworths.toFixed(2) : ""),
      q(unitPriceLabel(i.name, i.woolworths) ?? ""),
      q(observed), q(indexStore()), "regular",
    ].join(","));
  }
  return new NextResponse(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="aussie-lunchbox-price-index.csv"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
