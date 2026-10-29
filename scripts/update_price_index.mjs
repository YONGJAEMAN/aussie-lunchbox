#!/usr/bin/env node
/**
 * Kiwi Lunchbox — Price Index: Woolworths 열만 자동 갱신
 *
 * update_prices.mjs와 다른 점:
 *   update_prices.mjs = 플래너 비용계산용. "재료 한 팩" 값이면 규격이 달라도 무해.
 *   이 스크립트      = 공개 가격지수용. **규격/브랜드가 어긋나면 그 자체로 거짓 데이터다.**
 *
 * 그래서 검색을 쓰지 않는다. `data/priceIndexSources.json`에 사람이 고정한 SKU를
 * 그대로 조회한다. 검색 중앙값 방식은 실행마다 다른 브랜드를 집어서, 월별 변동이
 * 물가가 아니라 브랜드 교체를 반영했다. (2026-07-30 실측 근거는 그 파일 _doc 참조)
 *
 * 두 가지를 반드시 지킨다:
 *  1. **정상가(originalPrice)를 쓴다.** 특가 주간의 salePrice를 지수에 넣으면
 *     물가가 내린 것처럼 보이는 거짓 신호가 된다. 지수는 진열가 추이다.
 *  2. **Pak'nSave 열은 건드리지 않는다.** 점포별 가격이라 매장 확인만이 근거다.
 *
 * Usage: node scripts/update_price_index.mjs          # dry-run
 *        node scripts/update_price_index.mjs --write   # 적용
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { oldestColumnDate, columnReadEnough, columnReadRate, MIN_COLUMN_READ_RATE } from "./_priceIndexMeta.mjs";
import { shelfPrice } from "../lib/priceSearch.mjs";
import { islandArg, indexPath, reviewPath, woolworthsSource, southIndexFrom, woolworthsSouthCookie, WOOLWORTHS_SOUTH_PICKUP } from "./_island.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
import { pathToFileURL } from "node:url";

// `--island south` → Church Corner 픽업 세션 · data/priceIndex.south.json (scripts/_island.mjs). 생략 = 북섬(기본 세션 = Glenfield).
const ISLAND = islandArg();
const INDEX_PATH = indexPath(ROOT, ISLAND);
const SOURCES_PATH = join(ROOT, "data", "priceIndexSources.json");
const REVIEW_PATH = reviewPath(ROOT, "price_index_review.txt", ISLAND);
const PRODUCT_BASE = "https://www.woolworths.co.nz/api/v1/products";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// shelfPrice는 플래너 수집기(update_prices.mjs)와 같이 쓴다 — lib/priceSearch.mjs로 옮겼다(2026-09-29).
// 테스트가 이 경로에서 import하므로 다시 내보낸다.
export { shelfPrice };

async function fetchSku(sku, cookie) {
  const res = await fetch(`${PRODUCT_BASE}/${encodeURIComponent(sku)}`, {
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
      "X-Requested-With": "OnlineShopping.WebApp",
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const p = await res.json();
  const price = p?.price ?? {};
  return {
    ...shelfPrice(price),
    name: String(p?.name ?? ""),
    size: p?.size?.volumeSize ?? "",
    availability: String(p?.availabilityStatus ?? ""),
  };
}

async function main() {
  const write = process.argv.includes("--write");
  // 남섬 파일은 품목 목록을 북섬 지수에서 받는다 — 값은 남섬 것만, 없으면 null.
  const index = ISLAND === "south"
    ? southIndexFrom(
        JSON.parse(readFileSync(indexPath(ROOT, "north"), "utf8")),
        existsSync(INDEX_PATH) ? JSON.parse(readFileSync(INDEX_PATH, "utf8")) : null,
      )
    : JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const sources = JSON.parse(readFileSync(SOURCES_PATH, "utf8"));
  const lines = [];
  let updated = 0;
  let blocked = 0;
  let failed = 0;
  let drifted = 0;

  console.log(`🥝 Price Index — Woolworths 열 ${write ? "적용" : "dry-run"}${ISLAND === "south" ? ` · ${WOOLWORTHS_SOUTH_PICKUP.label}` : ""}\n`);
  const cookie = ISLAND === "south" ? await woolworthsSouthCookie(UA) : undefined;

  for (const item of index.items) {
    const src = woolworthsSource(sources, item.name, ISLAND);
    if (!src) {
      lines.push(`SKIP    ${item.name}\n          priceIndexSources.json에 정의 없음`);
      blocked++;
      continue;
    }
    if (src.blocked) {
      lines.push(`BLOCKED ${item.name}\n          ${src.reason}\n          → 기존값 $${item.countdown} 유지`);
      blocked++;
      continue;
    }

    let got;
    try {
      got = await fetchSku(src.sku, cookie);
    } catch (err) {
      lines.push(`FAIL    ${item.name} (sku ${src.sku})\n          조회 실패: ${err.message} → 기존값 $${item.countdown} 유지`);
      failed++;
      continue;
    }

    // 단종·리뉴얼 감지: 고정 당시와 이름/규격이 달라졌으면 사람이 봐야 한다.
    // 공백만 다른 건 상품 변경이 아니다 — API가 이름 끝에 공백을 붙여 보내는
    // 상품이 있어서, 정규화하지 않으면 매번 오탐이 뜬다. (2026-07-30 실측)
    const norm = (s) => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
    const nameDrift = norm(got.name) !== norm(src.pinnedName);
    const sizeDrift = norm(got.size) !== norm(src.pinnedSize);
    if (nameDrift || sizeDrift) {
      lines.push(
        `DRIFT   ${item.name} (sku ${src.sku})\n` +
          `          고정: "${src.pinnedName}" [${src.pinnedSize || "-"}]\n` +
          `          현재: "${got.name}" [${got.size || "-"}]\n` +
          `          → 상품이 바뀌었다. 기존값 $${item.countdown} 유지. SKU 재선정 필요`,
      );
      drifted++;
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }

    // 🔴 2026-10-04: 품절이면 API가 originalPrice·salePrice를 둘 다 0.0으로 준다(쌀 316761, "Out of Stock").
    //    그 0이 지수에 들어가 「Woolworths 쌀 $0」이 될 뻔했다 — 가드가 푸시를 막았다. 0은 가격이 아니다.
    if (!(got.regular > 0)) {
      lines.push(
        `FAIL    ${item.name} (sku ${src.sku})\n` +
          `          가격 $${Number(got.regular).toFixed(2)}${got.availability ? ` (${got.availability})` : ""} → 기존값 $${item.countdown} 유지`,
      );
      failed++;
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }

    const before = item.countdown;
    lines.push(
      `OK      ${item.name} (sku ${src.sku})\n` +
        `          $${before} → $${got.regular.toFixed(2)}` +
        (got.isSpecial ? `   (이번 주 특가 $${got.sale.toFixed(2)} — 지수엔 정상가를 넣는다)` : "") +
        (got.usedFallback ? `   ⚠️ originalPrice 없어 salePrice 사용` : "") +
        (got.markdownWithoutSpecial
          ? `   ⚠️ 특가 딱지 없이 내려간 값 — originalPrice $${got.listPrice.toFixed(2)} 대신 진열가 $${got.regular.toFixed(2)}`
          : "") +
        `\n          ${got.name} [${got.size || "-"}]`,
    );
    if (write) item.countdown = Math.round(got.regular * 100) / 100;
    updated++;
    await new Promise((r) => setTimeout(r, 300));
  }

  // 🔴 UTC를 쓰면 안 된다. NZST는 UTC+12라 NZ 자정~정오 사이에 돌리면
  //    날짜가 하루 뒤로 찍힌다 (2026-08-10 10:52 NZST 실행에서 08-09로 기록됐다).
  //    이 값은 가격지수 페이지에 "언제 잰 값인지"로 그대로 노출된다.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" });
  const report =
    `Kiwi Lunchbox — Price Index / Woolworths 열 갱신 리포트\n` +
    `생성 ${today}   갱신 ${updated} / 보류 ${blocked} / 실패 ${failed} / 상품변경 ${drifted}\n\n` +
    `Woolworths 열: 고정 SKU의 **정상 진열가**(originalPrice). 특가는 지수에 넣지 않는다.\n` +
    `Pak'nSave 열: 이 스크립트가 건드리지 않는다. 점포별 가격이라 매장 확인만이 근거.\n\n` +
    `BLOCKED/FAIL/DRIFT 항목은 기존 값을 그대로 뒀다. 어긋난 상품으로 채우는 것보다\n` +
    `오래된 값이 낫고, 오래된 것은 페이지에 날짜로 드러난다.\n` +
    `${"=".repeat(74)}\n\n` +
    lines.join("\n\n") +
    "\n";

  writeFileSync(REVIEW_PATH, report);
  console.log(report);

  // 🔴 읽은 게 거의 없으면 **열 날짜를 올리지도, 파일을 쓰지도 않는다** — 옛 값이 오늘 잰 값인 척하게 된다
  //    (`_priceIndexMeta.mjs` 2026-10-26). 리포트는 위에서 이미 남겼다.
  const counts = { updated, failed, drifted };
  if (write && !columnReadEnough(counts)) {
    console.error(
      `\n🔴 Woolworths 열을 ${(columnReadRate(counts) * 100).toFixed(0)}%만 읽었다 — ` +
        `${MIN_COLUMN_READ_RATE * 100}% 미만이라 priceIndex.json을 쓰지 않는다(woolworthsUpdated 그대로).`,
    );
    process.exit(1);
  }

  if (write) {
    index.woolworthsUpdated = today;
    index.woolworthsMethod = ISLAND === "south"
      ? `Woolworths NZ online price feed, ${WOOLWORTHS_SOUTH_PICKUP.label} pickup (fixed SKUs, regular shelf price)`
      : "Woolworths NZ online price feed (fixed SKUs, regular shelf price)";
    if (ISLAND === "north" && !index.paknsaveUpdated) index.paknsaveUpdated = index.lastUpdated;
    if (ISLAND === "north" && !index.paknsaveMethod)
      index.paknsaveMethod = "checked in store at Pak'nSave Ormiston, Auckland";
    // 지수 전체의 신선도는 **가장 오래된 열**을 따른다. 한쪽만 갱신했다고
    // 전체가 최신인 척하면 안 된다.
    index.lastUpdated = oldestColumnDate(index);
    writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n");
    console.log(
      `✅ priceIndex.json 갱신 — woolworthsUpdated=${index.woolworthsUpdated}, ` +
        `paknsaveUpdated=${index.paknsaveUpdated}, lastUpdated=${index.lastUpdated}`,
    );
  } else {
    console.log("ℹ️  dry-run — 파일 안 바꿈. 적용하려면 --write");
  }
}

// 테스트에서 import 할 수 있도록, 직접 실행일 때만 돈다.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
