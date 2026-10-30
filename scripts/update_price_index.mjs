#!/usr/bin/env node
/**
 * Aussie Lunchbox — Price Index: Woolworths 열 갱신
 *
 * update_prices.mjs와 다른 점:
 *   update_prices.mjs = 플래너 비용계산용. "재료 한 팩" 값이면 규격이 달라도 무해.
 *   이 스크립트      = 공개 가격지수용. **규격/브랜드가 어긋나면 그 자체로 거짓 데이터다.**
 *
 * 그래서 검색으로 고르지 않는다. `data/priceIndexSources.json`에 사람이 고정한 SKU를 Stockcode로 조회한다
 * (검색어에 Stockcode를 넣으면 그 상품 하나만 온다 — `_woolworthsAu.mjs`).
 *
 * 반드시 지킨다(Kiwi에서 가져온 규칙):
 *  1. **정상가를 쓴다.** 특가 주의 값을 넣으면 물가가 내린 것처럼 보이는 거짓 신호가 된다.
 *     특가인데 WasPrice가 없으면(정상가를 모른다) 그 행은 기존 값을 둔다(SPECIAL).
 *  2. 0원·품절은 가격이 아니다(Kiwi 2026-10-04 쌀 $0). 기존 값을 둔다.
 *  3. 상품명·규격이 고정 당시와 다르면(DRIFT) 기존 값을 둔다 — 사람이 SKU를 다시 고른다.
 *  4. 읽은 비율이 80% 미만이면 **파일도 열 날짜도 안 바꾼다**(Kiwi 2026-10-26, `_priceIndexMeta.mjs`).
 *
 * Usage: node scripts/update_price_index.mjs          # dry-run
 *        node scripts/update_price_index.mjs --write   # 적용
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { oldestColumnDate, columnReadEnough, columnReadRate, MIN_COLUMN_READ_RATE } from "./_priceIndexMeta.mjs";
import { auSearch } from "./_woolworthsAu.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_PATH = join(ROOT, "data", "priceIndex.json");
const SOURCES_PATH = join(ROOT, "data", "priceIndexSources.json");
const REVIEW_PATH = join(ROOT, "data", "price_index_review.txt");

const norm = (s) => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/**
 * 검색 응답의 상품 하나 → 지수에 넣을 판정. 네트워크 없이 테스트한다.
 * @returns {{ kind: "ok", regular: number, sale?: number } | { kind: "special" | "fail" | "drift", why: string }}
 */
export function indexReading(p, src) {
  if (!p) return { kind: "fail", why: "검색에 없다(단종·품절 목록 제외일 수 있다)" };
  if (norm(p.Name) !== norm(src.pinnedName) || norm(p.PackageSize) !== norm(src.pinnedSize)) {
    return { kind: "drift", why: `고정 "${src.pinnedName}" [${src.pinnedSize}] → 현재 "${norm(p.Name)}" [${norm(p.PackageSize)}]` };
  }
  const price = Number(p.Price);
  const was = Number(p.WasPrice);
  if (!(price > 0)) return { kind: "fail", why: `가격 ${p.Price ?? "null"} — 품절이면 0/null이 온다` };
  if (p.IsOnSpecial) {
    if (was > price) return { kind: "ok", regular: was, sale: price };
    return { kind: "special", why: `특가 $${price}인데 WasPrice가 없다 — 정상가를 모른다` };
  }
  return { kind: "ok", regular: price };
}

async function main() {
  const write = process.argv.includes("--write");
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const sources = JSON.parse(readFileSync(SOURCES_PATH, "utf8"));
  const lines = [];
  const counts = { updated: 0, specials: 0, failed: 0, drifted: 0 };
  let skipped = 0;

  console.log(`🦘 Price Index — Woolworths 열 ${write ? "적용" : "dry-run"}\n`);

  for (const item of index.items) {
    const src = sources.items[item.name];
    const keep = `기존값 ${item.woolworths === null ? "없음" : `$${item.woolworths}`} 유지`;
    if (!src) {
      lines.push(`SKIP    ${item.name}\n          priceIndexSources.json에 정의 없음`);
      skipped++;
      continue;
    }
    let p;
    try {
      p = (await auSearch(src.sku)).find((x) => String(x.Stockcode) === src.sku);
    } catch (err) {
      lines.push(`FAIL    ${item.name} (sku ${src.sku})\n          조회 실패: ${err.message} → ${keep}`);
      counts.failed++;
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    const r = indexReading(p, src);
    if (r.kind === "ok") {
      lines.push(
        `OK      ${item.name} (sku ${src.sku})\n          $${item.woolworths ?? "-"} → $${r.regular.toFixed(2)}` +
          (r.sale !== undefined ? `   (이번 주 특가 $${r.sale.toFixed(2)} — 지수엔 정상가를 넣는다)` : ""),
      );
      if (write) item.woolworths = Math.round(r.regular * 100) / 100;
      counts.updated++;
    } else {
      const tag = { special: "SPECIAL", fail: "FAIL   ", drift: "DRIFT  " }[r.kind];
      lines.push(`${tag} ${item.name} (sku ${src.sku})\n          ${r.why} → ${keep}`);
      counts[{ special: "specials", fail: "failed", drift: "drifted" }[r.kind]]++;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  // 🔴 UTC를 쓰면 안 된다 — 날짜가 하루 밀린다(Kiwi 2026-08-10). 이 값은 페이지에 「언제 잰 값」으로 나간다.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
  const report =
    `Aussie Lunchbox — Price Index / Woolworths 열 갱신 리포트\n` +
    `생성 ${today}   갱신 ${counts.updated} / 특가보류 ${counts.specials} / 실패 ${counts.failed} / 상품변경 ${counts.drifted} / 정의없음 ${skipped}\n\n` +
    `Woolworths 열: 고정 SKU의 **정상 진열가**(특가 주엔 WasPrice). 특가는 지수에 넣지 않는다.\n` +
    `Coles: 추적하지 않는다(priceIndexSources.json \`coles\` — Imperva 봇 확인, 우회 안 함).\n\n` +
    `SPECIAL/FAIL/DRIFT 항목은 기존 값을 그대로 뒀다. 어긋난 상품으로 채우는 것보다 오래된 값이 낫고,\n` +
    `오래된 것은 페이지에 날짜로 드러난다.\n` +
    `${"=".repeat(74)}\n\n` +
    lines.join("\n\n") +
    "\n";
  writeFileSync(REVIEW_PATH, report);
  console.log(report);

  if (write && !columnReadEnough(counts)) {
    console.error(
      `\n🔴 Woolworths 열을 ${(columnReadRate(counts) * 100).toFixed(0)}%만 읽었다 — ` +
        `${MIN_COLUMN_READ_RATE * 100}% 미만이라 priceIndex.json을 쓰지 않는다(woolworthsUpdated 그대로).`,
    );
    process.exit(1);
  }

  if (write) {
    index.woolworthsUpdated = today;
    index.woolworthsMethod = "Woolworths Australia online price feed, default guest session (fixed SKUs, regular shelf price)";
    index.lastUpdated = oldestColumnDate(index);
    writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n");
    console.log(`✅ priceIndex.json 갱신 — woolworthsUpdated=${index.woolworthsUpdated}, lastUpdated=${index.lastUpdated}`);
  } else {
    console.log("ℹ️  dry-run — 파일 안 바꿈. 적용하려면 --write");
  }
}

// 테스트에서 import 할 수 있도록, 직접 실행일 때만 돈다.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
