/**
 * 미고정 재료의 검색 후보를 **읽기 전용**으로 훑는다. 아무 파일도 쓰지 않는다.
 * PINNED_SKUS에 뭘 넣을지 사람이 눈으로 고르기 위한 도구다.
 *
 * 🔴 update_prices.mjs는 실행이 곧 캐시 쓰기다. 탐색에 그걸 쓰지 말 것.
 *
 *   node scripts/inspect_candidates.mjs > /tmp/cands.txt
 *   node scripts/inspect_candidates.mjs Onion Spinach     # 일부만
 */
import { SEARCH_BASE, searchTermFor, deriveTokens, avoidTokensFor, PINNED_SKUS } from "../lib/priceSearch.mjs";
import { readFileSync } from "node:fs";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const cache = JSON.parse(readFileSync(new URL("../data/price_cache.json", import.meta.url), "utf8"));

const only = process.argv.slice(2);
const targets = (only.length ? only : Object.keys(cache).filter((k) => !PINNED_SKUS[k])).sort();

async function search(term) {
  const res = await fetch(`${SEARCH_BASE}?target=search&search=${encodeURIComponent(term)}`, {
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": UA, Accept: "application/json", "X-Requested-With": "OnlineShopping.WebApp" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  return j?.products?.items ?? [];
}

console.log(`# 미고정 후보 훑기 — ${targets.length}개 · ${new Date().toISOString().slice(0, 10)}`);
for (const [i, name] of targets.entries()) {
  const cur = cache[name]?.data;
  const term = searchTermFor(name);
  const tokens = deriveTokens(name);
  const avoid = avoidTokensFor(name);
  let items = [];
  let err = null;
  try {
    items = await search(term);
  } catch (e) {
    err = e.message;
  }
  const ok = items
    .filter((x) => x?.type === "Product" && x?.price?.salePrice > 0)
    .filter((x) => {
      const n = String(x.name ?? "").toLowerCase();
      return !avoid.some((a) => n.includes(a)) && tokens.every((t) => n.includes(t));
    });
  console.log(`\n## [${i + 1}/${targets.length}] ${name}`);
  console.log(`   검색어 "${term}" | 필수토큰 [${tokens}] | 제외 ${avoid.length}개`);
  console.log(`   현재 캐시: $${cur?.price} ${cur?.name ?? "(없음)"}`);
  if (err) { console.log(`   🔴 검색 실패: ${err}`); continue; }
  console.log(`   통과 ${ok.length}/${items.length}`);
  for (const x of ok.slice(0, 8)) {
    console.log(`     ${String(x.sku).padStart(7)}  $${String(x.price.salePrice).padEnd(6)} ${x.name}${x.size?.volumeSize ? ` [${x.size.volumeSize}]` : ""}`);
  }
  await new Promise((r) => setTimeout(r, 350));
}
