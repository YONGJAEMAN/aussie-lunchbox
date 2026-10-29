#!/usr/bin/env node
/**
 * Woolworths 주간 특가 초안 생성기 — 월요일 루틴 1~2단계 보조.
 *
 * 하는 일: 우리 메뉴에 실제로 쓰이는 재료만 Woolworths에서 훑어 **이번 주 특가**를
 * 찾고, `promotions.json`에 붙일 수 있는 형태로 초안을 만든다.
 *
 * ⚠️ 이건 전단 PDF를 **대체하지 않는다.** 보조다. 이유:
 *  - **New World(Foodstuffs)는 이런 API가 없다.** New World 절반은 여전히 전단을 봐야 한다.
 *  - Club+ / 멀티바이(2 for $5 등)는 온라인 표시가 전단과 다를 수 있다.
 *  - 온라인 특가 ≠ 전단 특가인 경우가 있다(온라인 전용/매장 전용).
 * → 초안을 만들고 **전단과 대조**하는 용도로 쓴다. 그게 손으로 처음부터 만드는 것보다 빠르다.
 *
 * 특가 여부는 검색 결과의 isSpecial로 판단하고, 기간(promotionStartDate/EndDate)은
 * 특가로 잡힌 상품만 개별 조회해 확인한다. 전체를 개별 조회하면 수백 콜이 된다.
 *
 * ## 실측 재현율 (2026-08-02, 07-27 주차 수작업 11건과 대조)
 *   재료명만 쓸 때  2/11  ← 브랜드 상품에 안 닿음
 *   브랜드 검색어 추가 후  **8/11**
 * 놓친 3건의 성격:
 *   - "Carrots or Brown Onions" : regularPrice == salePrice(할인 0, Fresh Deal).
 *     스크립트가 **의도적으로** 제외한다(할인만 잡는다). 이런 promo는 전단에서 봐야 한다.
 *   - "Fresh Chicken Thighs"    : 정육 kg단가 표기라 검색·할인율 판정에서 빠졌다
 *   - "Leggo's Canned Tomatoes" : 검색어 미커버(원래 lunchboxFit=excluded인 조리용)
 * → **전단 대조는 여전히 필요하다.** 다만 8할을 자동으로 채워 주므로 시간이 크게 준다.
 * 반대로 후보는 219건이 나온다(수작업 11건 대비). 대부분은 도시락과 무관하니 **골라내는**
 * 작업이 남는다. 이 스크립트의 역할은 '찾기'가 아니라 '빠뜨리지 않기'다.
 *
 * Usage: node scripts/find_specials.mjs            # 이번 주 특가 초안 출력
 *        node scripts/find_specials.mjs --json     # promotions.json 붙여넣기용 JSON만
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { SEARCH_BASE, searchTermFor, AVOID_TOKENS } from "../lib/priceSearch.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "data", "specials_draft.json");
const jsonOnly = process.argv.includes("--json");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  "X-Requested-With": "OnlineShopping.WebApp",
};

/**
 * 재료 → promotions.json의 matchKey / category 매핑.
 * matchKey는 플래너가 특가를 재료에 연결하는 열쇠라 **기존 값과 일치해야** 한다.
 */
const MATCH = {
  Bread: ["bread", "Bakery"], Tortilla: ["wrap", "Bakery"], Bagel: ["bread", "Bakery"],
  Cheese: ["cheese", "Dairy & Eggs"], "Cheese Block": ["cheese", "Dairy & Eggs"],
  Yoghurt: ["yoghurt", "Dairy & Eggs"], Butter: ["spread", "Dairy & Eggs"],
  Eggs: ["eggs", "Dairy & Eggs"], Milk: ["milk", "Dairy & Eggs"],
  Ham: ["ham", "Meat"], Chicken: ["chicken", "Meat"], "Chicken Breast": ["chicken", "Meat"],
  "Beef Mince": ["mince", "Meat"], Bacon: ["bacon", "Meat"],
  "Canned Tuna": ["canned tuna", "Meat & Seafood"],
  Apple: ["fruit", "Produce"], Banana: ["fruit", "Produce"], Mandarin: ["fruit", "Produce"],
  Carrot: ["carrot", "Produce"], Cucumber: ["cucumber", "Produce"],
  "Cherry Tomatoes": ["tomato", "Produce"], Lettuce: ["lettuce", "Produce"],
  Pasta: ["pasta", "Pantry"], Rice: ["rice", "Pantry"], "Sushi Rice": ["rice", "Pantry"],
  "Peanut Butter": ["spread", "Pantry"], Hummus: ["spread", "Pantry"],
  Crackers: ["cracker", "Snacks"], "Rice Crackers": ["cracker", "Snacks"],
  "Muesli Bar": ["fruit-bar", "Snacks"], Popcorn: ["snack", "Snacks"],
};

/**
 * 재료명만으로는 안 잡히는 **브랜드/카테고리 검색어**.
 *
 * 첫 실행에서 수작업 11건 중 2건만 잡혔다. 원인은 API에 상품이 없어서가 아니라
 * (전부 있었고 가격도 정확히 일치했다) MATCH의 일반 재료명으로는 Ploughmans·
 * Moogurt·Best Foods·Patties·Bluebird 같은 브랜드 상품에 닿지 못해서였다.
 * NZ 전단에 반복 등장하는 도시락 관련 브랜드를 여기에 모아 둔다.
 */
const BRAND_TERMS = {
  ploughmans: ["bread", "Bakery"], vogels: ["bread", "Bakery"],
  molenberg: ["bread", "Bakery"], "natures fresh": ["bread", "Bakery"],
  "tip top bread": ["bread", "Bakery"], "abes bagels": ["bread", "Bakery"],
  moogurt: ["yoghurt", "Dairy & Eggs"], "anchor uno": ["yoghurt", "Dairy & Eggs"],
  "fresh n fruity": ["yoghurt", "Dairy & Eggs"], chobani: ["yoghurt", "Dairy & Eggs"],
  mainland: ["cheese", "Dairy & Eggs"], chesdale: ["cheese", "Dairy & Eggs"],
  "best foods mayonnaise": ["spread", "Pantry"], vegemite: ["spread", "Pantry"],
  marmite: ["spread", "Pantry"], "pics peanut butter": ["spread", "Pantry"],
  sealord: ["canned tuna", "Meat & Seafood"], "john west": ["canned tuna", "Meat & Seafood"],
  hellers: ["ham", "Meat"], beehive: ["ham", "Meat"], "chicken thighs": ["chicken", "Meat"],
  "patties sausage rolls": ["sausage rolls", "Freezer"], mccain: ["freezer", "Freezer"],
  tasti: ["fruit-bar", "Snacks"], "mother earth": ["fruit-bar", "Snacks"],
  griffins: ["cracker", "Snacks"], "huntley palmers": ["cracker", "Snacks"],
  bluebird: ["chips", "Snacks"], "nature valley": ["fruit-bar", "Snacks"],
  sunrice: ["rice", "Pantry"], "brown onions": ["vegetable", "Produce"],
};

async function search(term) {
  const res = await fetch(
    `${SEARCH_BASE}?target=search&search=${encodeURIComponent(term)}`,
    { signal: AbortSignal.timeout(15000), headers: HEADERS },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json())?.products?.items ?? [];
}

async function promoWindow(sku) {
  try {
    const res = await fetch(`${SEARCH_BASE}/${encodeURIComponent(sku)}`, {
      signal: AbortSignal.timeout(12000), headers: HEADERS,
    });
    if (!res.ok) return {};
    const p = (await res.json())?.price ?? {};
    return {
      from: (p.promotionStartDate ?? "").slice(0, 10),
      until: (p.promotionEndDate ?? "").slice(0, 10),
    };
  } catch { return {}; }
}

async function main() {
  const found = [];
  // 재료명 + 브랜드 검색어를 함께 훑는다. 브랜드 쪽은 검색어를 그대로 쓴다.
  const ALL = { ...MATCH, ...BRAND_TERMS };
  const names = Object.keys(ALL);
  if (!jsonOnly) console.log(`🔎 재료 ${names.length}종에서 이번 주 Woolworths 특가 탐색\n`);

  for (const ing of names) {
    let items = [];
    // MATCH 항목은 SEARCH_TERMS 보정을 거치고, BRAND_TERMS는 검색어 자체가 이미 구체적이다.
    const term = ing in MATCH ? searchTermFor(ing) : ing;
    try { items = await search(term); }
    catch (err) { if (!jsonOnly) console.warn(`  ⚠️ ${ing}: ${err.message}`); continue; }

    for (const x of items) {
      const p = x?.price ?? {};
      const orig = parseFloat(String(p.originalPrice));
      const sale = parseFloat(String(p.salePrice));
      if (!p.isSpecial || !Number.isFinite(orig) || !Number.isFinite(sale)) continue;
      if (sale >= orig) continue;                       // 실제 할인만
      const pct = Math.round(((orig - sale) / orig) * 100);
      if (pct < 15) continue;                           // 소폭 변동은 전단 특가가 아니다
      const name = String(x.name ?? "");
      const low = name.toLowerCase();
      if (!name || low.includes("cartology")) continue;
      // 비식품·엉뚱한 카테고리 제거. 재료명이 화장품/유아용품 이름에도 들어간다 —
      // 첫 실행에서 "huggies baby wipes cucumber"와 "glow lab mask ... cucumber"가
      // Cucumber 특가로 잡혔다. price_cache에서 이미 겪은 오탐이라 같은 목록을 재사용한다.
      if (AVOID_TOKENS.some((tok) => low.includes(tok))) continue;
      if (/wipes|mask|shampoo|lotion|juice|dog food|cat food|nappy|nappies/.test(low)) continue;
      const [matchKey, category] = ALL[ing];
      found.push({
        ingredient: ing, sku: x.sku, name,
        size: x?.size?.volumeSize ?? "",
        regularPrice: orig, salePrice: sale,
        savings: Math.round((orig - sale) * 100) / 100, savingsPercent: pct,
        // 🔴 2026-08-24: 이걸 안 읽어서 회원 전용가 3건을 "누구나 이 값"으로 실을 뻔했다.
        // Everyday Rewards 카드가 있어야 받는 가격이라 promoType 을 "club" 으로 둬야 한다.
        isClubPrice: p.isClubPrice === true,
        matchKey, category,
      });
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  // 같은 상품이 여러 재료 검색에 걸리는 경우 제거
  const seen = new Set();
  const uniq = found.filter((f) => !seen.has(f.sku) && seen.add(f.sku));
  uniq.sort((a, b) => b.savingsPercent - a.savingsPercent);

  // 상위 항목만 기간 확인 (전수 조회는 콜이 너무 많다)
  for (const f of uniq.slice(0, 25)) {
    Object.assign(f, await promoWindow(f.sku));
    await new Promise((r) => setTimeout(r, 250));
  }

  const draft = {
    _doc: [
      "Woolworths 온라인 특가에서 자동 추출한 **초안**이다. 그대로 쓰지 말고 전단과 대조할 것.",
      "New World는 이런 API가 없어 여전히 전단을 봐야 한다.",
      "lunchboxFit은 자동 판단하지 않는다 — 과자/음료를 'lunchbox'로 넣으면 영양 가이드라인과 어긋난다.",
    ],
    generatedAt: new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" }), // 🔴 UTC 금지 — NZ 자정~정오에 하루 밀린다
    source: "woolworths.co.nz product search (isSpecial)",
    candidates: uniq,
  };
  writeFileSync(OUT, JSON.stringify(draft, null, 2) + "\n");

  if (jsonOnly) { console.log(JSON.stringify(draft.candidates, null, 2)); return; }

  console.log(`\n특가 후보 ${uniq.length}건 → ${OUT}\n`);
  console.log(`${"할인".padStart(5)}  ${"품목".padEnd(46)} ${"정상→특가".padEnd(16)} 기간`);
  console.log("-".repeat(96));
  for (const f of uniq.slice(0, 25)) {
    const win = f.from ? `${f.from}~${f.until}` : "";
    console.log(
      `${String(f.savingsPercent).padStart(4)}%  ${f.name.slice(0, 46).padEnd(46)} ` +
      `${("$" + f.regularPrice + "→$" + f.salePrice).padEnd(16)} ${win}`,
    );
  }
  console.log(`\n⚠️ lunchboxFit(lunchbox/snack-only/excluded)은 **직접 판단**해서 붙일 것.`);
  console.log(`⚠️ New World 절반은 전단에서 따로 채워야 한다.`);
}

main();
