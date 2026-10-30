import { NextResponse } from "next/server";
import { PORTION_BASIS, PORTION_FACTORS, DEFAULT_PORTION } from "@/lib/planConfig";
import priceCache from "@/data/price_cache.json";
import { PINNED_SKUS } from "@/lib/priceSearch.mjs";

/**
 * 플래너가 실제로 값을 매기는 재료 전체의 원자료.
 *
 * 🔴 2026-09-09 외부 감사 — 분석 글들이 "180개 재료"를 인용하는데, 공개된 것은
 *    가격지수 **20행**뿐이라 독자가 그 분석을 재검산할 방법이 없었다.
 *    지수 20행과 이 180행은 **다른 데이터셋**이다. 지수는 두(세) 체인을 같은 규격으로
 *    비교하려고 사람이 고른 장바구니고, 이쪽은 플래너가 원가를 계산하는 전체 재료다.
 *
 * 🔴 `serve_fraction`이 이 파일에서 유일한 **추정치**다 — 도시락 하나가 팩의 몇 분의
 *    몇을 쓰는가. 우리 집 분량이지 공표된 값이 아니다. 그래서 `measurement` 열에
 *    `pack_price=observed`와 `serve=estimated`를 나눠 적는다.
 */

const CACHE = priceCache as Record<
  string,
  { timestamp?: number; data?: { price?: number; source?: string } }
>;
const PINS = PINNED_SKUS as Record<string, { sku: string; name: string; size?: string }>;

const q = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const isoDay = (ms?: number) =>
  typeof ms === "number" && ms > 0 ? new Date(ms).toISOString().slice(0, 10) : "";

const HEADER = [
  "ingredient",
  "pinned_product",
  "sku",
  "pack_size",
  "pack_price_aud",
  "pack_price_read_on",
  "serve_size",
  "serve_fraction_of_pack",
  "serve_cost_aud",
  "serves_per_pack",
  "source",
  "measurement",
].join(",");

export function GET() {
  const lines: string[] = [HEADER];

  for (const [key, basis] of Object.entries(PORTION_BASIS)) {
    const entry = CACHE[key];
    const price = entry?.data?.price;
    if (typeof price !== "number" || !(price > 0)) continue;
    const factor = PORTION_FACTORS[key] ?? DEFAULT_PORTION;
    lines.push(
      [
        q(key),
        q(PINS[key]?.name ?? ""),
        q(PINS[key]?.sku ?? ""),
        q(basis.pack),
        q(price.toFixed(2)),
        q(isoDay(entry?.timestamp)),
        q(basis.serve),
        q(factor),
        q((price * factor).toFixed(4)),
        q(Math.floor(1 / factor)),
        q(entry?.data?.source ?? ""),
        q("pack_price=observed; serve=estimated (our household portion)"),
      ].join(","),
    );
  }

  return new NextResponse(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="aussie-lunchbox-ingredients.csv"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
