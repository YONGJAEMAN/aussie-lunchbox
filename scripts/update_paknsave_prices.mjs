#!/usr/bin/env node
/**
 * Kiwi Lunchbox — Price Index: Pak'nSave 열 갱신
 *
 * ⚠️ 2026-08-10까지 이 저장소는 "Pak'nSave는 점포별 가격이라 읽을 수 있는 피드가
 *    없다"고 적어두고 매장 실사만 해 왔다. **틀린 판단이었다.** paknsave.co.nz는
 *    쿠키 eCom_STORE_ID로 매장을 정하고 그 매장 가격을 그대로 내려준다.
 *    실측: Pams Value Standard Milk 2L = Royal Oak $4.79 / Ormiston $4.55.
 *
 * 이 값은 **온라인(Click & Collect) 가격**이다. 매대 태그와 같다는 보장이 없으므로
 * 페이지에도 온라인 가격이라고 적는다. 실사값을 흉내내지 않는다.
 *
 * robots.txt가 /shop/search를 막는다 → 검색을 쓰지 않는다.
 * priceIndexSources.json에 사람이 고정한 SKU의 상품 페이지만 조회한다.
 *
 * Usage: node scripts/update_paknsave_prices.mjs           # dry-run
 *        node scripts/update_paknsave_prices.mjs --write    # 적용
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { execFileSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { oldestColumnDate, columnReadEnough, columnReadRate, MIN_COLUMN_READ_RATE } from "./_priceIndexMeta.mjs";
import { islandArg, FOODSTUFFS_STORES, foodstuffsCookie, indexPath, reviewPath, foodstuffsSource, southIndexFrom } from "./_island.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// `--island south` → 크라이스트처치 매장 · data/priceIndex.south.json (scripts/_island.mjs). 생략 = 북섬(이전과 같다).
const ISLAND = islandArg();
const STORE = FOODSTUFFS_STORES.paknsave[ISLAND];
const INDEX_PATH = indexPath(ROOT, ISLAND);
const SOURCES_PATH = join(ROOT, "data", "priceIndexSources.json");
const REVIEW_PATH = reviewPath(ROOT, "paknsave_index_review.txt", ISLAND);

const STORE_ID = STORE.id;
const STORE_LABEL = STORE.label;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const COOKIE = foodstuffsCookie(STORE);

/**
 * Next.js의 데이터 경로에는 배포마다 바뀌는 buildId가 들어간다.
 * HTML은 node의 fetch로 받으면 403이고 `curl --http1.1`이면 200이다
 * (HTTP/2로 붙을 때만 막힌다). 그래서 buildId만 curl로 가져온다.
 * buildId가 낡으면 상품 조회가 404로 시끄럽게 실패하므로 조용히 썩지 않는다.
 */
function fetchBuildId() {
  const html = execFileSync(
    "curl",
    [
      "-s",
      "--http1.1",
      "--max-time",
      "25",
      "-A",
      UA,
      "https://www.paknsave.co.nz/shop/product/5000527_ea_000pns",
    ],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  const m = html.match(/"buildId":"([^"]+)"/);
  if (!m) throw new Error("buildId를 찾지 못했다 — 사이트 구조가 바뀌었을 수 있다");
  return m[1];
}

async function fetchSku(buildId, sku) {
  const slug = `${sku.toLowerCase().replace(/-/g, "_")}pns`;
  const url = `https://www.paknsave.co.nz/_next/data/${buildId}/en/shop/product/${slug}.json?slug=${slug}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": UA, Accept: "application/json", Cookie: COOKIE },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();

  // 🔴 쿠키가 빠지거나 무시되면 **조용히 기본 매장(Royal Oak) 가격**이 돌아온다.
  //    에러가 안 나므로 확인하지 않으면 다른 매장 값을 Ormiston이라고 싣게 된다.
  const got = j?.pageProps?.serverStoreId;
  if (got !== STORE_ID) {
    throw new Error(`매장이 다르다 (기대 ${STORE_ID.slice(0, 8)}, 응답 ${String(got).slice(0, 8)})`);
  }

  const p = j?.pageProps?.product;
  if (!p) throw new Error("product 없음 (단종되었을 수 있다)");

  // 특가는 decal/saleValue/promotionUnitPrice로 드러난다. 정상가 상품은 셋 다 없다.
  // 특가일 때 price.value와 retailValue가 **둘 다 특가로** 내려오기 때문에
  // 정상가를 복원할 방법이 없다 → 값을 건드리지 않는 것이 유일하게 정직한 처리다.
  const isSpecial = !!(p.price?.decal || p.price?.saleValue || p.promotionUnitPrice);
  return {
    name: String(p.name ?? ""),
    size: String(p.subtitle ?? ""),
    price: (p.price?.value ?? 0) / 100,
    unitPrice: p.unitPrice?.plainText ?? "",
    isSpecial,
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
  let specials = 0;

  // 🔴 UTC 금지. NZST는 UTC+12라 NZ 자정~정오에 돌리면 날짜가 하루 뒤로 찍힌다.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" });

  console.log(`🥝 Price Index — Pak'nSave 열 ${write ? "적용" : "dry-run"}`);
  const buildId = fetchBuildId();
  console.log(`   buildId ${buildId} / ${STORE_LABEL}\n`);

  for (const item of index.items) {
    const src = foodstuffsSource(sources, item.name, "paknsave", ISLAND);
    if (!src) {
      lines.push(`SKIP    ${item.name}\n          priceIndexSources.json에 paknsave 정의 없음`);
      blocked++;
      continue;
    }
    if (src.blocked) {
      lines.push(`BLOCKED ${item.name}\n          ${src.reason}\n          → 기존값 ${item.paknsave === null ? "(없음)" : "$" + item.paknsave} 유지`);
      blocked++;
      continue;
    }

    let got;
    try {
      got = await fetchSku(buildId, src.sku);
    } catch (err) {
      lines.push(`FAIL    ${item.name} (sku ${src.sku})\n          ${err.message} → 기존값 유지`);
      failed++;
      continue;
    }

    const norm = (s) => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
    if (norm(got.name) !== norm(src.pinnedName) || norm(got.size) !== norm(src.pinnedSize)) {
      lines.push(
        `DRIFT   ${item.name} (sku ${src.sku})\n` +
          `          고정: "${src.pinnedName}" [${src.pinnedSize || "-"}]\n` +
          `          현재: "${got.name}" [${got.size || "-"}]\n` +
          `          → 상품이 바뀌었다. 기존값 유지. SKU 재선정 필요`,
      );
      drifted++;
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }

    if (got.isSpecial) {
      lines.push(
        `SPECIAL ${item.name} (sku ${src.sku})\n` +
          `          이번 주 특가 $${got.price.toFixed(2)} — 정상가를 알 수 없어 **값을 건드리지 않는다**\n` +
          `          기존값 ${item.paknsave === null ? "(없음)" : "$" + item.paknsave} 유지`,
      );
      specials++;
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }

    const before = item.paknsave;
    lines.push(
      `OK      ${item.name} (sku ${src.sku})\n` +
        `          ${before === null ? "(없음)" : "$" + before} → $${got.price.toFixed(2)}\n` +
        `          ${got.name} [${got.size || "-"}]${got.unitPrice ? "  " + got.unitPrice : ""}`,
    );
    if (write) {
      item.paknsave = Math.round(got.price * 100) / 100;
      // 🔴 행 단위 날짜가 필요하다. 열 날짜만 오늘로 올리면, 특가라 건너뛴 행이
      //    5월 값을 든 채 "오늘 잰 값"인 척하게 된다. 실제로 그럴 뻔했다 —
      //    버터는 5월 $5.79를 들고 8월 Woolworths와 비교돼 격차가 $4.61로 부풀었다.
      item.paknsaveAsOf = today;
    }
    updated++;
    await new Promise((r) => setTimeout(r, 300));
  }

  const report =
    `Kiwi Lunchbox — Price Index / Pak'nSave 열 갱신 리포트\n` +
    `생성 ${today}   갱신 ${updated} / 특가보류 ${specials} / 보류 ${blocked} / 실패 ${failed} / 상품변경 ${drifted}\n` +
    `매장 ${STORE_LABEL}\n\n` +
    `이 열은 **온라인(Click & Collect) 가격**이다. 매대 태그와 같다는 보장이 없다.\n` +
    `특가(SPECIAL)는 값을 갱신하지 않는다 — 특가 주간엔 정상가가 응답에 없어서,\n` +
    `특가를 넣으면 지수가 물가 하락처럼 보인다. 오래된 값이 틀린 값보다 낫고\n` +
    `오래된 것은 페이지에 날짜로 드러난다.\n` +
    `${"=".repeat(74)}\n\n` +
    lines.join("\n\n") +
    "\n";

  writeFileSync(REVIEW_PATH, report);
  console.log(report);

  // 🔴 읽은 게 거의 없으면 **열 날짜를 올리지도, 파일을 쓰지도 않는다** — 옛 값이 오늘 잰 값인 척하게 된다
  //    (`_priceIndexMeta.mjs` 2026-10-26). 리포트는 위에서 이미 남겼다.
  const counts = { updated, specials, failed, drifted };
  if (write && !columnReadEnough(counts)) {
    console.error(
      `\n🔴 Pak'nSave 열을 ${(columnReadRate(counts) * 100).toFixed(0)}%만 읽었다 — ` +
        `${MIN_COLUMN_READ_RATE * 100}% 미만이라 priceIndex.json을 쓰지 않는다(paknsaveUpdated 그대로).`,
    );
    process.exit(1);
  }

  if (write) {
    index.paknsaveUpdated = today;
    index.paknsaveMethod =
      ISLAND === "south"
        ? "Pak'nSave Riccarton (Christchurch) online price feed (fixed SKUs, Click & Collect pricing)"
        : "Pak'nSave Ormiston online price feed (fixed SKUs, Click & Collect pricing)";
    index.lastUpdated = oldestColumnDate(index);
    writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n");
    console.log(
      `✅ priceIndex.json 갱신 — paknsaveUpdated=${index.paknsaveUpdated}, ` +
        `woolworthsUpdated=${index.woolworthsUpdated}, lastUpdated=${index.lastUpdated}`,
    );
  } else {
    console.log("ℹ️  dry-run — 파일 안 바꿈. 적용하려면 --write");
  }
}

main();
