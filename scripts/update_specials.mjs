#!/usr/bin/env node
/**
 * Aussie Lunchbox — 이번 주 Woolworths 특가(추적 SKU만) → `data/promotions.json`
 *
 * Kiwi는 사람이 전단을 붙여 넣고 `pricesIngredients`를 손으로 적었다. 분류(`matchKey`)로 자동 연결했다가
 * 다른 상품의 특가가 우리 재료 가격이 된 적이 있어서다(2026-09-09: 우유 자리에 Alpro 식물성 음료).
 * Aussie는 **우리가 추적하는 바로 그 SKU**(`PINNED_SKUS`)의 특가만 읽는다 — 상품이 같으니 그 사고가 원리상 안 생긴다.
 * 그래서 `pricesIngredients`를 그 SKU를 쓰는 재료 키로 자동으로 채운다. 팩 크기·더 싼가는 플래너의
 * `pricedMatchFor`가 그대로 다시 본다(크기를 못 읽으면 목록에만 뜨고 가격엔 안 붙는다).
 *
 * 넣는 것: `IsOnSpecial && !IsEdrSpecial && WasPrice > Price > 0` — 누구나 내는 할인가.
 * 넣지 않는 것: 회원가(`IsEdrSpecial`, Everyday Rewards) · 멀티바이(가격이 안 바뀐다) · 고정 이름/규격이 바뀐 상품.
 *
 * 기간: API가 특가 기간을 주지 않는다. Woolworths·Coles 주간 특가는 **수~화**라서, 읽은 날(시드니)이 속한
 * 수~화를 기간으로 잡는다(`lib/auWeek.mjs`). 수요일 아침에 돈다(launchd `ops/aussie-specials.plist`).
 *
 * Coles: 사이트가 봇 확인이라 읽지 않는다. 사용자가 그 주 전단을 붙여 주면 세션에서 `weeks[<수요일>].stores.coles`로
 * 옮긴다 — `pricesIngredients`는 상품·크기를 보고 **한 건씩** 적고 사용자 확인을 받는다(Kiwi 규칙). 이 스크립트는
 * 같은 주의 `stores.coles`를 건드리지 않는다.
 *
 * 안전장치: 읽은 비율이 80% 미만이면 파일을 안 쓰고 exit 1(Kiwi `update_prices.mjs`와 같은 선).
 *
 * Usage: node scripts/update_specials.mjs          # dry-run (리뷰만)
 *        node scripts/update_specials.mjs --write  # 적용
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { PINNED_SKUS } from "../lib/priceSearch.mjs";
import { auSearch } from "./_woolworthsAu.mjs";
import { specialsWeek } from "../lib/auWeek.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROMOS_PATH = join(ROOT, "data", "promotions.json");
const REVIEW_PATH = join(ROOT, "data", "specials_review.txt");
const MIN_READ_RATE = 0.8;

const norm = (s) => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const round2 = (n) => Math.round(n * 100) / 100;

/** 고정 SKU → 그 SKU를 쓰는 재료 키들(`Egg`·`Egg (glaze)`처럼 여럿일 수 있다). 고정 표의 순서를 지킨다. */
export function groupBySku(pinned = PINNED_SKUS) {
  const out = new Map();
  for (const [key, pin] of Object.entries(pinned)) {
    if (!out.has(pin.sku)) out.set(pin.sku, { pin, keys: [] });
    out.get(pin.sku).keys.push(key);
  }
  return out;
}

/** kg당 재료의 kg당 값 — `CupString`("$2.20 / 1KG"). 특가 중이면 지금 값이 특가 기준이다. */
function perKgNow(p) {
  const m = /\$([\d.]+)\s*\/\s*(1KG|100G)/i.exec(String(p?.CupString ?? ""));
  return m ? parseFloat(m[1]) * (/100G/i.test(m[2]) ? 10 : 1) : NaN;
}

/**
 * 검색 응답의 상품 하나 → 이번 주 특가 항목(또는 넣지 않는 이유). 네트워크 없이 테스트한다.
 * @returns {{ kind: "special", item: import("../data/promotions.types").Promotion } | { kind: "none" | "member" | "drift" | "fail", why: string }}
 */
export function specialFrom(p, pin, keys) {
  if (!p) return { kind: "fail", why: "검색에 없다" };
  // 동일성은 SKU + 상품명으로 본다(`update_prices.mjs`와 같다). 🔴 `PackageSize`로 보면 안 된다 — 고정 표의 `size`는
  // 우리 팩 표기(`4pack`·`per kg`)라 API 표기(`4 pack`·`1kg`·`700g`)와 글자가 달라 30건이 거짓 DRIFT였다(10-30 첫 실행).
  if (norm(p.Name) !== norm(pin.name)) {
    return { kind: "drift", why: `고정 "${pin.name}" → 현재 "${p.Name}"` };
  }
  const price = Number(p.Price);
  const was = Number(p.WasPrice);
  if (!(price > 0)) return { kind: "fail", why: `가격 ${p.Price ?? "null"}` };
  if (!p.IsOnSpecial) return { kind: "none", why: "특가 아님" };
  if (p.IsEdrSpecial) return { kind: "member", why: "Everyday Rewards 회원가 — 넣지 않는다" };
  if (!(was > price)) return { kind: "none", why: `특가 딱지인데 WasPrice ${p.WasPrice ?? "null"} — 정가를 모른다` };

  let regular = was;
  let sale = price;
  let size = pin.size;
  if (/^per\s*kg$/i.test(pin.size)) {
    const now = perKgNow(p);
    if (!(now > 0)) return { kind: "fail", why: `kg당 값을 못 읽었다 (${p.CupString ?? "CupString 없음"})` };
    regular = round2(now * (was / price));
    sale = round2(now);
    size = "1kg";
  }
  const savings = round2(regular - sale);
  return {
    kind: "special",
    item: {
      // 우리 팩 표기를 이름 끝에 붙인다 — 플래너의 `promoPackSize`가 이 이름에서 크기를 읽어 `PORTION_BASIS`와 대조한다.
      // 「each」·「6 sheets」처럼 못 읽는 표기는 목록에만 뜨고 가격엔 안 붙는다(fail-closed).
      name: `${p.Name} ${size}`,
      matchKey: keys[0].toLowerCase(),
      ...(keys.length > 1 ? { alsoMatches: keys.slice(1) } : {}),
      category: "",
      regularPrice: regular,
      salePrice: sale,
      savings,
      savingsPercent: Math.round((savings / regular) * 100),
      promoType: "sale",
      lunchboxFit: "lunchbox",
      pricesIngredients: [...keys],
      sku: String(p.Stockcode),
    },
  };
}

/** 이번 주 파일 — Woolworths만 새로 쓰고, 같은 주에 붙여 넣은 Coles는 그대로 둔다. 지난 주들은 누적된다. */
export function mergeWeek(file, week, woolworthsItems, enteredAt) {
  const key = week.validFrom;
  const prev = file.weeks?.[key];
  const stores = { ...(prev?.stores ?? {}) };
  stores.woolworths = { storeName: "Woolworths", sourceUrl: "https://www.woolworths.com.au/shop/browse/specials", items: woolworthsItems };
  return {
    ...file,
    currentWeek: key,
    weeks: { ...(file.weeks ?? {}), [key]: { validFrom: week.validFrom, validUntil: week.validUntil, stores, enteredAt, aiParsed: false } },
  };
}

async function main() {
  const write = process.argv.includes("--write");
  const week = specialsWeek();
  const groups = groupBySku();
  const lines = [];
  const items = [];
  const counts = { read: 0, failed: 0, specials: 0, member: 0, drift: 0 };

  console.log(`🦘 Woolworths 이번 주 특가 (${week.validFrom} ~ ${week.validUntil}) ${write ? "적용" : "dry-run"}\n`);
  for (const [sku, { pin, keys }] of groups) {
    let p;
    try {
      p = (await auSearch(sku)).find((x) => String(x.Stockcode) === sku);
      // SKU가 짧으면(Coconut Milk "168") 번호 검색이 다른 상품을 준다 — `update_prices.mjs`와 같은 후퇴.
      if (!p) {
        await new Promise((r) => setTimeout(r, 1500));
        p = (await auSearch(pin.name)).find((x) => String(x.Stockcode) === sku);
      }
    } catch (err) {
      lines.push(`FAIL     ${keys.join(", ")} (sku ${sku}) — ${err.message}`);
      counts.failed++;
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    const r = specialFrom(p, pin, keys);
    if (r.kind === "fail") counts.failed++;
    else counts.read++;
    if (r.kind === "special") {
      items.push(r.item);
      counts.specials++;
      lines.push(`SPECIAL  ${keys.join(", ")} (sku ${sku}) — $${r.item.regularPrice.toFixed(2)} → $${r.item.salePrice.toFixed(2)}`);
    } else if (r.kind === "member") {
      counts.member++;
      lines.push(`MEMBER   ${keys.join(", ")} (sku ${sku}) — ${r.why}`);
    } else if (r.kind === "drift") {
      counts.drift++;
      lines.push(`DRIFT    ${keys.join(", ")} (sku ${sku}) — ${r.why}`);
    } else if (r.kind === "fail") {
      lines.push(`FAIL     ${keys.join(", ")} (sku ${sku}) — ${r.why}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  const total = groups.size;
  const rate = counts.read / total;
  const report =
    `Aussie Lunchbox — 이번 주 Woolworths 특가 리포트\n` +
    `기간 ${week.validFrom}(수) ~ ${week.validUntil}(화)   읽음 ${counts.read}/${total} · 특가 ${counts.specials} · 회원가 제외 ${counts.member} · 상품변경 ${counts.drift} · 실패 ${counts.failed}\n\n` +
    `특가는 우리가 추적하는 SKU의 것만이다. 가격에 붙는지는 플래너가 팩 크기·추적가로 다시 본다\n` +
    `(「each」 단위 재료는 크기를 대조할 수 없어 목록에만 뜬다).\n` +
    `${"=".repeat(74)}\n\n` +
    lines.join("\n") +
    "\n";
  writeFileSync(REVIEW_PATH, report);
  console.log(report);

  if (rate < MIN_READ_RATE) {
    console.error(`🔴 ${(rate * 100).toFixed(0)}%만 읽었다 — ${MIN_READ_RATE * 100}% 미만이라 promotions.json을 쓰지 않는다.`);
    process.exit(1);
  }
  if (!write) {
    console.log("ℹ️  dry-run — 파일 안 바꿈. 적용하려면 --write");
    return;
  }
  const file = JSON.parse(readFileSync(PROMOS_PATH, "utf8"));
  const enteredAt = new Date().toISOString();
  writeFileSync(PROMOS_PATH, JSON.stringify(mergeWeek(file, week, items, enteredAt), null, 2) + "\n");
  console.log(`✅ promotions.json — ${week.validFrom} 주 Woolworths 특가 ${items.length}건`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
