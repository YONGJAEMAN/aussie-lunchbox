#!/usr/bin/env node
/**
 * 매주 전단을 입력한 뒤 **어느 특가가 어느 재료의 가격에 쓰일 수 있는지** 후보를 뽑는다.
 *
 * ## 왜 사람이 봐야 하나 (2026-09-09 외부 감사)
 *
 * 전에는 `matchKey`(분류)로 자동 연결했다. 그 결과:
 *   Milk $3.75 → $2.58   근거: Alpro **식물성** 음료
 *   Rice Crackers $2.25 → $1.12   근거: Griffin's **Toffee Pops**(초콜릿 비스킷)
 * 180개 재료 중 32개가 그런 값이었다. 분류로는 유제품과 귀리음료를 **원리상** 구별할 수 없다.
 *
 * 그래서 `pricesIngredients`에 사람이 적은 것만 가격에 쓴다(fail-closed).
 * 이 스크립트는 그 표기를 **대신 하지 않는다** — 판단할 재료를 줄여 줄 뿐이다.
 *
 * ## 후보가 되는 조건
 *   1. 전단 상품명에서 팩 크기를 읽을 수 있다(범위·복수 규격·"A or B"는 못 읽는다)
 *   2. 우리가 추적하는 재료 중 **팩 크기가 정확히 같은** 것이 있다
 *   3. 전단 특가가 우리 추적가보다 **실제로 싸다**
 *
 * 세 조건을 통과해도 **같은 식품이라는 보장은 없다.** 요거트 1kg와 닭고기 1kg는
 * 팩 크기가 같다. 마지막 판단은 사람이 한다.
 *
 * Usage:
 *   node scripts/suggest_promo_ingredients.mjs                      # 후보 목록
 *   node scripts/suggest_promo_ingredients.mjs --check              # 현재 표기 상태 점검
 *   node scripts/suggest_promo_ingredients.mjs --write \
 *     --map "Doritos Corn Chips 300g=Corn Chips" \
 *     --map "Better Eggs Free Range Size 7 12 Pack=Egg,Eggs"
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROMOS_PATH = join(ROOT, "data", "promotions.json");
const CACHE_PATH = join(ROOT, "data", "price_cache.json");
const CONFIG_PATH = join(ROOT, "lib", "planConfig.ts");

const argv = process.argv.slice(2);
const WRITE = argv.includes("--write");
const CHECK = argv.includes("--check");
const MAPS = argv.reduce((acc, a, i) => {
  if (a === "--map" && argv[i + 1]) acc.push(argv[i + 1]);
  return acc;
}, []);

/** `PORTION_BASIS`를 TS 소스에서 읽는다 — 이 스크립트는 노드라 import를 못 한다. */
function readPortionBasis() {
  const src = readFileSync(CONFIG_PATH, "utf8");
  const start = src.indexOf("export const PORTION_BASIS");
  const end = src.indexOf("\n};", start);
  if (start === -1 || end === -1) throw new Error("PORTION_BASIS를 planConfig.ts에서 못 찾았다");
  const body = src.slice(start, end);
  const out = {};
  for (const m of body.matchAll(
    /["']?([A-Za-z0-9 ()/'&+.-]+)["']?\s*:\s*\{\s*pack:\s*"([^"]+)",\s*serve:\s*"([^"]+)"\s*\}/g,
  )) {
    out[m[1].trim()] = { pack: m[2], serve: m[3] };
  }
  return out;
}

/** 전단 상품명에서 팩 크기. 애매하면 null — `lib/promotions.ts`의 promoPackSize와 같은 규칙. */
function promoPackSize(name) {
  if (/\d+\s*[-–]\s*\d+(?:\.\d+)?\s*(kg|g|ml|l|pack|pk)\b/i.test(name)) return null;
  const weights = [...name.matchAll(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/gi)];
  const packs = [...name.matchAll(/(\d+)\s*(?:pack|pk)\b/gi)];
  if (weights.length + packs.length !== 1) return null;
  if (/\bor\b/i.test(name)) return null;
  if (weights.length === 1) {
    const n = Number(weights[0][1]);
    const u = weights[0][2].toLowerCase();
    if (u === "kg") return { n: n * 1000, unit: "g" };
    if (u === "l") return { n: n * 1000, unit: "ml" };
    return { n, unit: u === "g" ? "g" : "ml" };
  }
  return { n: Number(packs[0][1]), unit: "ea" };
}

function normalisePack(pack) {
  const v = pack.trim().toLowerCase();
  if (/^per\s*kg$/.test(v)) return { n: 1000, unit: "g" };
  if (/^(each|ea|1ea)$/.test(v)) return null;
  const c = /^(\d+)\s*pack$/.exec(v);
  if (c) return { n: Number(c[1]), unit: "ea" };
  const m = /^(\d+(?:\.\d+)?)\s*(kg|g|ml|l)$/.exec(v);
  if (!m) return null;
  const n = Number(m[1]);
  if (m[2] === "kg") return { n: n * 1000, unit: "g" };
  if (m[2] === "l") return { n: n * 1000, unit: "ml" };
  return { n, unit: m[2] };
}

const words = (s) => new Set(s.toLowerCase().match(/[a-z]{3,}/g) ?? []);
/** 이름이 얼마나 겹치나 — 순위용 힌트일 뿐, 판단 근거가 아니다. */
function overlap(a, b) {
  const A = words(a);
  const B = words(b);
  let n = 0;
  for (const w of B) if (A.has(w)) n++;
  return n;
}

const promos = JSON.parse(readFileSync(PROMOS_PATH, "utf8"));
const cache = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
const BASIS = readPortionBasis();
const week = promos.weeks[promos.currentWeek];
if (!week) throw new Error(`currentWeek "${promos.currentWeek}"에 해당하는 주가 없다`);

const allItems = [];
// 북섬 전단(`stores`)만 본다. 남섬 전단은 `week.southStores`에 따로 있다.
for (const [store, v] of Object.entries(week.stores)) {
  for (const it of v.items) allItems.push({ store, it });
}

if (CHECK) {
  const declared = allItems.filter(({ it }) => (it.pricesIngredients ?? []).length > 0);
  console.log(`주차 ${promos.currentWeek} · 특가 ${allItems.length}건 중 재료 표기 ${declared.length}건\n`);
  let live = 0;
  for (const { store, it } of declared) {
    for (const key of it.pricesIngredients) {
      const basis = BASIS[key];
      const base = cache[key]?.data?.price;
      const theirs = promoPackSize(it.name);
      const ours = basis ? normalisePack(basis.pack) : null;
      const problems = [];
      if (!basis) problems.push("PORTION_BASIS에 없음");
      if (typeof base !== "number" || !(base > 0)) problems.push("가격 캐시에 없음");
      if (!theirs) problems.push("전단 이름에서 팩 크기를 못 읽음");
      if (theirs && ours && (theirs.n !== ours.n || theirs.unit !== ours.unit))
        problems.push(`용량 불일치 (전단 ${theirs.n}${theirs.unit} vs 우리 ${ours.n}${ours.unit})`);
      if (typeof base === "number" && it.salePrice >= base)
        problems.push(`전단가가 더 비쌈 ($${it.salePrice} vs $${base})`);
      if (!(it.regularPrice > 0) || !(it.salePrice < it.regularPrice))
        problems.push("할인 중이 아님 (정가 = 특가)");
      if (problems.length === 0) {
        live++;
        console.log(`  ✅ ${key.padEnd(16)} $${base.toFixed(2)} → $${it.salePrice.toFixed(2)}   ${it.name}`);
      } else {
        console.log(`  ⏸  ${key.padEnd(16)} ${problems.join(" · ")}   [${store}] ${it.name}`);
      }
    }
  }
  console.log(`\n실제로 가격에 반영되는 것: ${live}건`);
  console.log("⏸ 는 잘못된 게 아니다 — 조건을 못 맞추면 정가가 남는 것이 의도된 동작이다.");
  process.exit(0);
}

if (WRITE) {
  if (MAPS.length === 0) {
    console.error("--write 에는 --map \"전단 상품명=재료[,재료]\" 가 하나 이상 필요하다");
    process.exit(2);
  }
  let applied = 0;
  for (const spec of MAPS) {
    const idx = spec.indexOf("=");
    if (idx === -1) throw new Error(`--map 형식이 아니다: ${spec}`);
    const promoName = spec.slice(0, idx).trim();
    const keys = spec.slice(idx + 1).split(",").map((s) => s.trim()).filter(Boolean);
    for (const k of keys) {
      if (!BASIS[k]) throw new Error(`"${k}"가 PORTION_BASIS에 없다 — 재료 키를 정확히 적을 것`);
    }
    const hit = allItems.filter(({ it }) => it.name === promoName);
    if (hit.length === 0) throw new Error(`이번 주 전단에 "${promoName}"이 없다`);
    for (const { it } of hit) {
      it.pricesIngredients = keys;
      applied++;
      console.log(`적음: ${promoName} → ${keys.join(", ")}`);
    }
  }
  writeFileSync(PROMOS_PATH, JSON.stringify(promos, null, 2) + "\n");
  console.log(`\n${applied}건 기록했다. 반드시 --check 로 다시 볼 것.`);
  process.exit(0);
}

// 기본: 후보 뽑기
console.log(`주차 ${promos.currentWeek} · 특가 ${allItems.length}건\n`);
console.log("아래는 **후보**다. 팩 크기가 같고 전단가가 더 싼 것뿐이고,");
console.log("같은 식품이라는 뜻은 아니다 (요거트 1kg와 닭고기 1kg는 팩 크기가 같다).\n");

let shown = 0;
for (const { store, it } of allItems) {
  if ((it.pricesIngredients ?? []).length > 0) continue;
  // 🔴 실제로 할인 중인 것만 후보다. New World 전단은 정가=특가로 들어오는 항목이
  //    많은데, 그걸 반영하면 할인이 아니라 체인 간 가격차를 특가라고 말하게 된다.
  if (!(it.regularPrice > 0) || !(it.salePrice < it.regularPrice)) continue;
  const theirs = promoPackSize(it.name);
  if (!theirs) continue;
  const cands = [];
  for (const [key, basis] of Object.entries(BASIS)) {
    const ours = normalisePack(basis.pack);
    if (!ours || ours.n !== theirs.n || ours.unit !== theirs.unit) continue;
    const base = cache[key]?.data?.price;
    if (typeof base !== "number" || !(base > 0) || it.salePrice >= base) continue;
    cands.push({ key, base, score: overlap(it.name, key) });
  }
  if (cands.length === 0) continue;
  cands.sort((a, b) => b.score - a.score || a.base - b.base);
  shown++;
  console.log(`[${store}] ${it.name}  $${it.regularPrice} → $${it.salePrice}  (${theirs.n}${theirs.unit})`);
  for (const c of cands.slice(0, 6)) {
    const mark = c.score > 0 ? "→" : " ";
    console.log(`   ${mark} ${c.key.padEnd(18)} 추적가 $${c.base.toFixed(2)}  ⇒ $${it.salePrice.toFixed(2)} (−$${(c.base - it.salePrice).toFixed(2)})`);
  }
  console.log(`   표기하려면:  --map "${it.name}=${cands[0].key}"\n`);
}

if (shown === 0) {
  console.log("후보 없음. 이번 주 전단에 우리 규격과 맞는 더 싼 특가가 없다는 뜻이고, 그건 정상일 수 있다.");
} else {
  console.log(`후보 ${shown}건. → 표시가 붙은 것은 이름이 겹친다는 뜻일 뿐이다. 상품을 보고 정할 것.`);
}
