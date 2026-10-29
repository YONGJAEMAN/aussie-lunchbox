#!/usr/bin/env node
/**
 * Kiwi Lunchbox — Weekly Price Updater
 * Fetches ingredient prices from Woolworths NZ and saves to data/price_cache.json
 * 상품 선별 규칙은 lib/priceSearch.mjs 참조 (items[0] 무조건 집기 금지)
 *
 * Usage: node scripts/update_prices.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { islandArg, woolworthsSouthCookie, WOOLWORTHS_SOUTH_PICKUP } from "./_island.mjs";
import {
  SEARCH_BASE, searchTermFor, pickRepresentative, pinnedFor, PINNED_SKUS,
  RECIPE_ONLY_INGREDIENTS, shelfPrice,
} from "../lib/priceSearch.mjs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
// `--island south` → Church Corner 픽업 세션으로 같은 규칙(고정 SKU + 검색 선별)을 돌려 data/price_cache.south.json에 쓴다.
// 생략 = 북섬(기본 세션 = Glenfield, 이전과 같다). 🔴 2026-10-28 실측: 같은 SKU 193개 중 112개가 남섬에서 가격이 달랐다.
const ISLAND = islandArg();
const CACHE_PATH = join(ROOT, "data", ISLAND === "south" ? "price_cache.south.json" : "price_cache.json");
const NORTH_CACHE_PATH = join(ROOT, "data", "price_cache.json");
const REVIEW_FILE = ISLAND === "south" ? "price_cache_review.south.txt" : "price_cache_review.txt";
/** 남섬 세션 쿠키 — main()에서 한 번 만든다. 북섬은 비어 있다(헤더에 안 붙는다). */
let COOKIE = "";

// NZ fallback prices (NZD) — **반드시 '판매 단위 한 팩' 가격**.
// 비용 계산이 여기에 PORTION_FACTORS(팩 대비 비율)를 곱하므로 개당 가격을 넣으면 안 된다.
// lib/supermarketApi.ts의 같은 테이블과 값을 맞출 것.
const FALLBACK_PRICES = {
  Bread: 3.50, Marmite: 6.00, Cheese: 12.00, Butter: 8.50,
  Croissant: 4.00, Ham: 5.50, "Chicken Breast": 14.00, Lettuce: 4.00, Mayo: 6.50,
  "Sushi Rice": 4.50, Seaweed: 3.00, "Canned Tuna": 2.50, Cucumber: 3.00,
  Eggs: 9.00, Milk: 3.50, Spinach: 4.00, Pastry: 5.00,
  Pasta: 2.00, Pesto: 6.00, "Cherry Tomatoes": 4.50, "Olive Oil": 10.00,
  Apple: 5.99, // 1kg 팩 (이전 0.80은 사과 1개 값)
  Carrot: 1.95, // 1kg 봉지 (이전 0.50은 당근 1개 값)
  Hummus: 5.00,
  Yoghurt: 6.50, Muesli: 7.00, Crackers: 3.00, Tortilla: 4.50,
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

/** SKU가 고정된 재료는 검색을 건너뛰고 그 상품을 직접 조회한다 */
async function fetchPinned(name, pin) {
  try {
    const res = await fetch(`${SEARCH_BASE}/${encodeURIComponent(pin.sku)}`, {
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "X-Requested-With": "OnlineShopping.WebApp",
        ...(COOKIE ? { Cookie: COOKIE } : {}),
      },
    });
    if (!res.ok) {
      console.warn(`  ⚠️  ${name}: 고정 SKU ${pin.sku} HTTP ${res.status}`);
      return null;
    }
    const p = await res.json();
    // 정가를 저장한다 — 특가·회원가는 promotions.json 쪽에서만 반영한다(shelfPrice 머리 주석).
    const price = shelfPrice(p?.price).regular;
    if (!Number.isFinite(price) || price <= 0) return null;
    // 상품이 바뀌었는지 확인 — 고정의 의미가 사라지면 알려야 한다.
    const norm = (s) => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
    if (norm(p?.name) !== norm(pin.name)) {
      console.warn(
        `  ⚠️  ${name}: 고정 SKU ${pin.sku}의 상품명이 변경됨 — "${pin.name}" → "${p?.name}". PINNED_SKUS 재확인 필요`,
      );
    }
    return {
      price,
      // 🔴 2026-08-23: 여기가 `p?.images?.big`이었다. **단일 상품 엔드포인트의
      //    `images`는 배열**이라 항상 undefined였고, 고정 SKU 재료 43개 중 26개가
      //    이미지 없이 저장돼 있었다(검색 경로는 객체를 줘서 안 걸렸다).
      //    지금은 화면이 이 필드를 안 쓰지만(`lib/supermarketApi.ts`가 이모지로 덮는다),
      //    쓰는 순간 조용히 빈 값이 나간다.
      //    ⚠️ `bigImageUrl`은 **URL이 아니라 파일명**이다("9414742036288.jpg").
      //       배열의 첫 항목이 전체 URL을 준다.
      image: p?.images?.[0]?.big ?? "",
      name: p?.name ?? name,
      source: "Woolworths NZ",
      // 🔴 2026-08-23: SKU를 저장한다. 고정과 캐시가 **같은 상품인지**를 이름으로만
      //    대조하면 SKU만 바뀐 경우를 못 잡는다(돌연변이로 확인했다 — 침묵했다).
      sku: String(p?.sku ?? ""),
      // 🔴 2026-08-23: 상품 API가 알레르겐을 준다는 걸 그제야 알았다.
      //    `Muesli (Nut-free)`라는 재료가 **견과류 경고가 붙은 뮤즐리**로 잡혀 있었고,
      //    참기름 자리엔 미강유, 비건 마요 자리엔 달걀이 든 일반 마요가 있었다.
      //    이름만 보고는 못 잡는다 — 라벨을 같이 저장해서 가드가 보게 한다.
      allergens: Array.isArray(p?.allergens) ? p.allergens : [],
      allergenMaybePresent: typeof p?.allergenMaybePresent === "string" ? p.allergenMaybePresent : "",
    };
  } catch (err) {
    console.warn(`  ⚠️  ${name}: 고정 SKU 조회 실패 ${err.message}`);
    return null;
  }
}

/**
 * 알레르겐 라벨은 **검색 응답에 없다** — 단일 상품 엔드포인트에만 있다.
 * 그래서 상품을 고른 뒤 한 번 더 부른다(재료당 요청 1회 추가).
 *
 * 🔴 2026-08-23: 라벨을 안 읽어서 `Muesli (Nut-free)`가 견과류 경고가 붙은 뮤즐리로,
 *    `Vegan Mayo`가 달걀이 든 마요로 잡혀 있었다. 이름 토큰 필터로는 못 잡는다.
 *    라벨이 없으면 **빈 값으로 두고 넘어간다** — 여기서 실패하면 가격까지 못 받는다.
 */
async function fetchAllergens(sku) {
  try {
    const res = await fetch(`${SEARCH_BASE}/${encodeURIComponent(sku)}`, {
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "X-Requested-With": "OnlineShopping.WebApp",
        ...(COOKIE ? { Cookie: COOKIE } : {}),
      },
    });
    if (!res.ok) return { allergens: [], allergenMaybePresent: "" };
    const p = await res.json();
    return {
      allergens: Array.isArray(p?.allergens) ? p.allergens : [],
      allergenMaybePresent: typeof p?.allergenMaybePresent === "string" ? p.allergenMaybePresent : "",
    };
  } catch {
    return { allergens: [], allergenMaybePresent: "" };
  }
}

async function fetchWoolworths(name) {
  // 검색으로 못 잡히는 재료는 SKU로 직접 간다 (PINNED_SKUS 참조).
  const pin = pinnedFor(name, ISLAND);
  if (pin) {
    const pinned = await fetchPinned(name, pin);
    if (pinned) return pinned;
    // 고정 조회가 실패하면 검색으로 후퇴하지 않는다 — 검색이 안 되니까 고정한 것이다.
    return null;
  }

  // 검색어는 재료명 그대로가 아니라 SEARCH_TERMS를 거친다 (모호한 이름 보정).
  const url = `${SEARCH_BASE}?target=search&search=${encodeURIComponent(searchTermFor(name))}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "X-Requested-With": "OnlineShopping.WebApp",
        ...(COOKIE ? { Cookie: COOKIE } : {}),
      },
    });

    if (!res.ok) {
      console.warn(`  ⚠️  ${name}: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    // items[0]을 그냥 집지 않는다 — 대표성 없는 상품이 상단에 오는 경우가 많다.
    const item = pickRepresentative(data?.products?.items, name);
    const price = item ? shelfPrice(item.price).regular : NaN;
    // 품절이면 가격이 0.0으로 온다(2026-10-04 쌀) — 고정 SKU 경로(위)와 같이 거른다.
    if (item && Number.isFinite(price) && price > 0) {
      // 검색 응답의 `images`는 **객체**다(단일 상품 엔드포인트는 배열이다 — 다르다).
      return {
        price,
        image: item?.images?.big ?? "",
        name: item?.name ?? name,
        source: "Woolworths NZ",
        sku: String(item?.sku ?? ""),
        ...(await fetchAllergens(item.sku)),
      };
    }
  } catch (err) {
    console.warn(`  ⚠️  ${name}: ${err.message}`);
  }
  return null;
}

async function main() {
  console.log(`🥝 Kiwi Lunchbox — Woolworths NZ Price Updater${ISLAND === "south" ? ` · ${WOOLWORTHS_SOUTH_PICKUP.label}` : ""}\n`);
  if (ISLAND === "south") COOKIE = await woolworthsSouthCookie("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  // 남섬에서 한 번도 못 읽은 재료는 **북섬 수집가를 표시를 붙여** 쓴다 — 지어낸 추정가보다 낫고,
  // `fromNorth`로 드러난다(플래너가 원가를 매겨야 해서 비울 수는 없다).
  const northCache = ISLAND === "south" && existsSync(NORTH_CACHE_PATH) ? JSON.parse(readFileSync(NORTH_CACHE_PATH, "utf-8")) : {};

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
      const prevIsReal = prev && !/fallback/i.test(prev.source ?? "") && !prev.fromNorth;
      const north = northCache[name]?.data;
      if (prevIsReal) {
        keptCount++;
        console.log(`↩️  유지 $${Number(prev.price).toFixed(2)} (이전 수집가)`);
      } else if (ISLAND === "south" && north && !/fallback|est/i.test(north.source ?? "")) {
        cache[name] = { timestamp: now, data: { ...north, source: `${north.source} (Auckland price — not read at ${WOOLWORTHS_SOUTH_PICKUP.label})`, fromNorth: true } };
        fallbackCount++;
        console.log(`🏝️  북섬 값 $${Number(north.price).toFixed(2)} (남섬에서 못 읽음 — fromNorth)`);
      } else {
        const fallback = getFallback(name);
        cache[name] = { timestamp: now, data: fallback };
        fallbackCount++;
        console.log(`💾 fallback $${fallback.price.toFixed(2)}`);
      }
    }

    if (i < ingredients.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
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
  const fromNorth = Object.entries(cache).filter(([, v]) => v.data?.fromNorth).map(([ing]) => ing).sort();

  writeFileSync(
    join(ROOT, "data", REVIEW_FILE),
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
${ISLAND === "south" ? `# 남섬에서 못 읽어 북섬(오클랜드) 수집가를 쓴 재료 (${fromNorth.length}종, fromNorth):\n${fromNorth.length ? fromNorth.map((i) => `#      ${i}`).join("\n") : "#      (없음)"}\n#\n` : ""}# SKU로 고정한 재료 (${pinned.length}종) — 검색 대신 상품을 직접 지정한다:
${pinned.map((i) => `#      ${i}`).join("\n")}

${review}
`,
    "utf-8",
  );
  console.log(`📝 검수 목록: data/${REVIEW_FILE}`);

  console.log(`\n✅ Fetched from Woolworths: ${successCount}`);
  console.log(`💾 Fallback used: ${fallbackCount}`);
  console.log(`↩️  이전 수집가 유지: ${keptCount}`);
  console.log(`📁 Saved to ${CACHE_PATH}`);
}

main();
