#!/usr/bin/env node
/**
 * Price Index — SKU 고정 후보 뽑기 (사람이 고르기 위한 도구)
 *
 * 왜 SKU를 고정해야 하는가:
 *   검색 결과의 중앙값을 쓰면 실행할 때마다 **다른 브랜드**가 잡힌다.
 *   그러면 월별 변동이 물가가 아니라 브랜드 교체를 반영한다 — 지수로선 무의미.
 *   (2026-07-30 실측: Cheese Block이 Woolworths 자체브랜드 $9.90 →
 *    Mainland $13.90으로 잡혀 40% 인상처럼 보였다. 물가가 아니라 브랜드 차이였다.)
 *
 * Usage: node scripts/price_index_discover.mjs > /tmp/candidates.txt
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEARCH_BASE = "https://www.woolworths.co.nz/api/v1/products";

/** 항목별 검색어 여러 개 — 후보 풀을 넓게 잡고 사람이 고른다 */
const QUERIES = {
  "Wholegrain Bread (700g)": ["wholegrain bread", "wholemeal bread", "vogels bread"],
  "Wraps 8-pack": ["tortilla wraps", "wraps flour"],
  "Bagels 4-pack": ["bagels"],
  "Apples (1kg)": ["apples royal gala", "apples 1kg"],
  "Bananas (1kg)": ["bananas"],
  "Carrots (1kg)": ["carrots"],
  "Cherry Tomatoes (250g)": ["cherry tomatoes"],
  "Cucumber": ["cucumber telegraph", "cucumber"],
  "Lettuce": ["lettuce iceberg"],
  "Sliced Chicken (200g)": ["chicken breast shaved", "sliced chicken"],
  "Canned Tuna (185g)": ["tuna spring water"],
  "Sliced Ham (200g)": ["shaved ham"],
  "Cheese Block (500g)": ["cheese tasty block", "cheese colby block"],
  "Eggs (12-pack)": ["eggs size 7", "eggs dozen"],
  "Yoghurt (1kg)": ["greek yoghurt natural", "yoghurt natural 1kg"],
  "Butter (500g)": ["butter salted"],
  "Rice (1kg)": ["long grain rice", "white rice 1kg"],
  "Pasta (500g)": ["pasta spirals", "pasta penne"],
  "Hummus (200g)": ["hummus"],
  "Peanut Butter (375g)": ["peanut butter"],
};

async function search(term) {
  const res = await fetch(
    `${SEARCH_BASE}?target=search&search=${encodeURIComponent(term)}`,
    {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        "X-Requested-With": "OnlineShopping.WebApp",
      },
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json())?.products?.items ?? [];
}

const index = JSON.parse(
  readFileSync(join(ROOT, "data", "priceIndex.json"), "utf8"),
);

for (const item of index.items) {
  console.log(`\n${"=".repeat(78)}`);
  console.log(`${item.name}   [현재 지수값: Woolworths $${item.countdown} / Pak'nSave $${item.paknsave}]`);
  console.log("=".repeat(78));
  const seen = new Set();
  const rows = [];
  for (const q of QUERIES[item.name] ?? []) {
    let items = [];
    try {
      items = await search(q);
    } catch (err) {
      console.log(`  (검색 실패 "${q}": ${err.message})`);
      continue;
    }
    for (const p of items) {
      const sku = p?.sku;
      const price = parseFloat(String(p?.price?.salePrice ?? ""));
      if (!sku || seen.has(sku) || !Number.isFinite(price) || price <= 0) continue;
      const name = String(p?.name ?? "");
      if (!name || name.toLowerCase().includes("cartology")) continue;
      seen.add(sku);
      rows.push({
        sku,
        name,
        size: p?.size?.volumeSize ?? "",
        price,
        orig: p?.price?.originalPrice ?? price,
        special: !!p?.price?.isSpecial,
        brand: p?.brand ?? "",
      });
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  rows.sort((a, b) => a.orig - b.orig);
  for (const r of rows.slice(0, 12)) {
    console.log(
      `  ${r.sku.padEnd(8)} $${String(r.orig.toFixed(2)).padEnd(6)}` +
        `${r.special ? " SPECIAL" : "        "} ${(r.size || "-").padEnd(9)} ${r.name}`,
    );
  }
  if (!rows.length) console.log("  후보 없음");
}
