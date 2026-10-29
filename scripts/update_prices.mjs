#!/usr/bin/env node
/**
 * Aussie Lunchbox — Weekly Price Updater
 * Fetches ingredient prices from Woolworths Australia and saves to data/price_cache.json
 * 상품 선별 규칙은 lib/priceSearch.mjs 참조 (items[0] 무조건 집기 금지)
 *
 * Usage: node scripts/update_prices.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import {
  SEARCH_BASE, searchTermFor, pickRepresentative, pinnedFor, PINNED_SKUS,
  RECIPE_ONLY_INGREDIENTS,
} from "../lib/priceSearch.mjs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CACHE_PATH = join(ROOT, "data", "price_cache.json");

// AU fallback prices (AUD) — **반드시 '판매 단위 한 팩' 가격**.
// 비용 계산이 여기에 PORTION_FACTORS(팩 대비 비율)를 곱하므로 개당 가격을 넣으면 안 된다.
// lib/supermarketApi.ts의 같은 테이블과 값을 맞출 것.
const FALLBACK_PRICES = {
  Bread: 4.00, Vegemite: 6.50, Cheese: 13.00, Butter: 9.00,
  Croissant: 4.50, Ham: 6.00, "Chicken Breast": 15.00, Lettuce: 4.50, Mayo: 7.00,
  "Sushi Rice": 5.00, Seaweed: 3.50, "Canned Tuna": 2.80, Cucumber: 3.50,
  Eggs: 9.50, Milk: 3.80, Spinach: 4.50, Pastry: 5.50,
  Pasta: 2.50, Pesto: 6.50, "Cherry Tomatoes": 5.00, "Olive Oil": 11.00,
  Apple: 5.50, // 1kg 봉지
  Carrot: 2.50, // 1kg 봉지
  Hummus: 5.50,
  Yoghurt: 7.00, Muesli: 8.00, Crackers: 3.50, Tortilla: 5.00,
};

function getFallback(name) {
  let price = FALLBACK_PRICES[name];
  if (!price) {
    const key = Object.keys(FALLBACK_PRICES).find((k) =>
      k.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(k.toLowerCase())
    );
    price = key ? FALLBACK_PRICES[key] : 5.0;
  }
  return { price, image: "", name, source: "Est. (Fallback)" };
}

function loadMenuIngredients() {
  const raw = readFileSync(join(ROOT, "data", "menuData.json"), "utf-8");
  const data = JSON.parse(raw);
  const ingredients = new Set();

  const menus = data?.MENU_DATA?.en ?? [];
  for (const menu of menus) {
    for (const ing of menu.ingredients ?? []) ingredients.add(ing);
  }

  const snacks = data?.SNACK_DATA ?? {};
  for (const items of Object.values(snacks)) {
    for (const snack of items) {
      for (const ing of snack.ingredients ?? []) ingredients.add(ing);
    }
  }

  // 가이드 레시피에만 나오는 재료 — 메뉴 데이터엔 없지만 원가를 파생시키려면 필요하다.
  for (const ing of RECIPE_ONLY_INGREDIENTS) ingredients.add(ing);

  return [...ingredients];
}

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Woolworths AU 검색 — 마켓플레이스(제3자 판매) 상품은 뺀다(치약·개 사료가 여기서 왔다). */
async function auSearch(term) {
  const url = `${SEARCH_BASE}?searchTerm=${encodeURIComponent(term)}&pageNumber=1&pageSize=24&sortType=TraderRelevance`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": UA, Accept: "application/json", "Accept-Language": "en-AU,en;q=0.9" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data?.Products ?? []).flatMap((g) => g?.Products ?? []).filter((p) => p && !p.IsMarketProduct);
}

/**
 * AU 상품 → 캐시에 넣을 **정상가**. 특가 주에는 `WasPrice`가 정상가다(Kiwi `shelfPrice`와 같은 규칙 —
 * 특가는 promotions.json 쪽에서만 반영한다). `IsOnSpecial` 딱지 없이 Was > Price인 경우는 매대 값(Price)을 쓴다.
 *
 * kg당 재료(`size: "per kg"`)는 팩 가격이 아니라 `CupString`("$2.20 / 1KG")의 kg당 값을 쓴다 —
 * 🔴 AU 응답은 Unit이 전부 "Each"라 kg당 값이 따로 없다. 특가 중이면 CupString도 특가 기준이라 같은 비율로 되돌린다.
 */
function auShelfPrice(p, perKg = false) {
  const price = Number(p?.Price);
  const was = Number(p?.WasPrice);
  const regular = p?.IsOnSpecial && was > price ? was : price;
  if (!Number.isFinite(regular) || regular <= 0) return NaN;
  if (!perKg) return regular;
  const m = /\$([\d.]+)\s*\/\s*(1KG|100G)/i.exec(String(p?.CupString ?? ""));
  if (!m) return NaN;
  const perKgNow = parseFloat(m[1]) * (/100G/i.test(m[2]) ? 10 : 1);
  return Math.round(perKgNow * (regular / price) * 100) / 100;
}

function auEntry(p, name, perKg) {
  const price = auShelfPrice(p, perKg);
  if (!Number.isFinite(price) || price <= 0) return null; // 품절이면 Price가 null/0으로 온다
  const contains = String(p?.AdditionalAttributes?.allergencontains ?? "").trim();
  return {
    price,
    image: p?.LargeImageFile ?? p?.MediumImageFile ?? "",
    name: p?.Name ?? name,
    source: "Woolworths Australia",
    // 🔴 Kiwi 2026-08-23: 고정과 캐시가 같은 상품인지 이름만으로 대조하면 SKU만 바뀐 경우를 못 잡는다.
    sku: String(p?.Stockcode ?? ""),
    // 🔴 Kiwi 2026-08-23: 라벨을 안 읽어서 `Vegan Mayo` 자리에 달걀 든 마요가 있었다. AU는 검색 응답에 라벨이 있다.
    //    Kiwi 캐시와 같은 모양(쉼표로 이은 문자열 하나를 담은 배열 + 문자열). 라벨이 없는 상품은 빈 값.
    allergens: contains ? [contains] : [],
    allergenMaybePresent: String(p?.AdditionalAttributes?.allergenmaybepresent ?? "").trim(),
  };
}

/** SKU가 고정된 재료 — 검색어에 Stockcode를 넣으면 그 상품 하나만 돌아온다(상세 엔드포인트는 응답이 없다). */
async function fetchPinned(name, pin) {
  try {
    let p = (await auSearch(pin.sku)).find((x) => String(x.Stockcode) === pin.sku);
    // 🔴 SKU가 짧으면(Coconut Milk "168") 번호 검색이 다른 상품들을 준다 — 상품명으로 찾아 같은 Stockcode를 고른다.
    if (!p) {
      await new Promise((r) => setTimeout(r, 1500));
      p = (await auSearch(pin.name)).find((x) => String(x.Stockcode) === pin.sku);
    }
    if (!p) {
      console.warn(`  ⚠️  ${name}: 고정 SKU ${pin.sku}가 검색에 없다(단종·품절 목록 제외일 수 있다)`);
      return null;
    }
    const norm = (s) => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
    if (norm(p.Name) !== norm(pin.name)) {
      console.warn(`  ⚠️  ${name}: 고정 SKU ${pin.sku}의 상품명이 변경됨 — "${pin.name}" → "${p.Name}". PINNED_SKUS 재확인 필요`);
    }
    return auEntry(p, name, /^per\s*kg$/i.test(pin.size ?? ""));
  } catch (err) {
    console.warn(`  ⚠️  ${name}: 고정 SKU 조회 실패 ${err.message}`);
    return null;
  }
}

async function fetchWoolworths(name) {
  const pin = pinnedFor(name);
  if (pin) {
    // 고정 조회가 실패하면 검색으로 후퇴하지 않는다 — 검색이 안 되니까 고정한 것이다.
    return fetchPinned(name, pin);
  }
  try {
    const prods = await auSearch(searchTermFor(name));
    // items[0]을 그냥 집지 않는다 — 규칙(pickRepresentative)이 쓰는 모양으로 바꿔 같은 선별을 거친다.
    const items = prods.map((p) => ({ type: "Product", name: String(p.Name ?? "").toLowerCase(), price: { salePrice: auShelfPrice(p) }, _p: p }));
    const item = pickRepresentative(items, name);
    if (item) return auEntry(item._p, name, false);
  } catch (err) {
    console.warn(`  ⚠️  ${name}: ${err.message}`);
  }
  return null;
}

async function main() {
  console.log("🦘 Aussie Lunchbox — Woolworths Australia Price Updater\n");

  const ingredients = loadMenuIngredients();
  console.log(`📋 Found ${ingredients.length} ingredients to fetch\n`);

  let cache = {};
  try {
    cache = JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
  } catch {
    // Start fresh
  }

  const now = Date.now();
  let successCount = 0;
  let fallbackCount = 0;
  let keptCount = 0;

  for (let i = 0; i < ingredients.length; i++) {
    const name = ingredients[i];
    process.stdout.write(`[${i + 1}/${ingredients.length}] ${name}... `);

    const result = await fetchWoolworths(name);

    if (result) {
      cache[name] = { timestamp: now, data: result };
      successCount++;
      console.log(`✅ $${result.price.toFixed(2)}`);
    } else {
      // 🔴 2026-08-17: 여기서 무조건 폴백으로 덮어쓰고 있었다.
      // 마트 쪽이 막힌 날 194개 전부가 폴백이 됐고, 그게 커밋·푸시·배포까지 갔다
      // (라이브 플래너가 $5 균일가로 도시락을 계산했다).
      // **이미 실제 수집가가 있으면 그걸 남긴다.** 낡은 실제가 > 지어낸 값.
      const prev = cache[name]?.data;
      const prevIsReal = prev && !/fallback/i.test(prev.source ?? "");
      if (prevIsReal) {
        keptCount++;
        console.log(`↩️  유지 $${Number(prev.price).toFixed(2)} (이전 수집가)`);
      } else {
        const fallback = getFallback(name);
        cache[name] = { timestamp: now, data: fallback };
        fallbackCount++;
        console.log(`💾 fallback $${fallback.price.toFixed(2)}`);
      }
    }

    if (i < ingredients.length - 1) {
      // 🔴 Kiwi는 300ms였다. AU는 Akamai 뒤라 1.5초 간격으로 197개를 받아도 막히지 않았다(2026-10-30) — 줄이지 말 것.
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  // 🔴 성공률이 바닥이면 **쓰지 않고 실패로 끝낸다.**
  // 실패가 에러를 내지 않고 폴백으로 "성공"한 척 파일을 채우던 것이 08-17 사고의 원인이다.
  // 개수도 스키마도 정상이라 어떤 검사에도 안 걸렸다.
  const MIN_SUCCESS = 0.8;
  const rate = successCount / ingredients.length;
  if (rate < MIN_SUCCESS) {
    console.error(
      `\n🔴 수집 성공률 ${(rate * 100).toFixed(0)}% (${successCount}/${ingredients.length}) — ` +
        `${MIN_SUCCESS * 100}% 미만이라 **파일을 쓰지 않고 중단한다.**\n` +
        `   마트 API가 막혔거나 응답 형식이 바뀌었을 가능성이 크다. 기존 캐시는 그대로 둔다.`,
    );
    process.exit(1);
  }

  mkdirSync(join(ROOT, "data"), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");

  // 사람이 눈으로 검수할 수 있는 리뷰 파일. 오매칭(마늘빵이 Bread로 잡히는 등)은
  // 합계만 보면 안 보이지만 이 목록을 훑으면 몇 초 만에 드러난다.
  const review = Object.entries(cache)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ing, v]) => `${ing.padEnd(24)} $${String(v.data.price).padEnd(8)} ${v.data.name ?? ""}`)
    .join("\n");
  // ⚠️ 이 머리말은 **실행 결과에서 생성한다.** 예전에는 미해결 목록이 하드코딩돼
  //    있었는데, 그 사이 SKU를 고정해 해결된 항목들(Chickpeas·Cocoa·Macaroni·
  //    Meatballs·Rice Bubbles·Breadsticks·Falafel)을 계속 "미해결"이라고 말하고
  //    있었다. 사람이 눈으로 보는 파일이 거짓을 말하면 검수 자체가 무의미해진다.
  const fellBack = Object.entries(cache)
    .filter(([, v]) => String(v.data?.source ?? "").includes("Est"))
    .map(([ing]) => ing)
    .sort();
  const pinned = Object.keys(PINNED_SKUS).sort();

  writeFileSync(
    join(ROOT, "data", "price_cache_review.txt"),
    `# 재료 → 선택된 상품 (검수용)
# 생성: update_prices.mjs / 선별 규칙: lib/priceSearch.mjs
# 이상한 매칭이 보이면 SEARCH_TERMS 또는 AVOID_TOKENS에 반영할 것
#
# 🔴 넛프리 사이트다. 상품명에 견과류(almond·cashew·hazelnut·walnut·pecan·
#    macadamia·pistachio)가 보이면 그 자리에서 고칠 것. 2026-08-06에 Croissant이
#    "french croissant chocolate hazelnut"으로 넘어가기 직전이었다.
#
# 검색으로 안 잡혀 폴백가를 쓴 재료 (${fellBack.length}종):
${fellBack.length ? fellBack.map((i) => `#      ${i}`).join("\n") : "#      (없음)"}
#
# SKU로 고정한 재료 (${pinned.length}종) — 검색 대신 상품을 직접 지정한다:
${pinned.map((i) => `#      ${i}`).join("\n")}

${review}
`,
    "utf-8",
  );
  console.log(`📝 검수 목록: data/price_cache_review.txt`);

  console.log(`\n✅ Fetched from Woolworths: ${successCount}`);
  console.log(`💾 Fallback used: ${fallbackCount}`);
  console.log(`↩️  이전 수집가 유지: ${keptCount}`);
  console.log(`📁 Saved to data/price_cache.json`);
}

main();
