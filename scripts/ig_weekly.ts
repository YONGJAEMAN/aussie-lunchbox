#!/usr/bin/env tsx
/**
 * 주간 IG 캐러셀 생성기 — "이번 주 특가로 짠 도시락 5개"
 *
 * 매주 월요일 루틴의 6번(포스트 소재 정리)을 자동화한다.
 * `promotions.json`을 갱신한 뒤 이 스크립트를 돌리면 업로드할 PNG와 캡션이 나온다.
 *
 *   npx tsx scripts/ig_weekly.ts            # ~/Downloads/ig_upload/ 에 생성
 *   npx tsx scripts/ig_weekly.ts --dry      # 렌더 없이 선정 결과만 출력
 *
 * ⚠️ 설계 원칙 — 사이트와 같은 함수를 쓴다.
 * 매칭은 `lib/promotions.ts`의 matchMenuIngredients, 비용은 `costForIngredients`와
 * 같은 정의(메뉴 + Fruit&Veg 간식 1 + (Protein&Dairy ∪ Savoury) 1, 각 풀의 중앙값).
 * IG에 올린 숫자와 플래너가 보여주는 숫자가 갈라지면 그게 가장 비싼 종류의 오류다.
 * (2026-07-28 FB 지적 → 비용 버그 발견 건이 정확히 그 사례였다.)
 *
 * ⚠️ 렌더 함정 (실측)
 * - 헤드리스 Chrome에 `·` `–` `—` 글리프가 없다 → 네모로 렌더된다. ASCII만 쓸 것.
 * - IG 그리드 썸네일은 1:1도 더 크롭한다 → 가장자리 6%(65px) 안에 콘텐츠 금지.
 *   생성 후 `python3 ~/Downloads/kiwi_scripts/ig_safe.py check <파일>`로 검사한다.
 * - 로컬 http 서버를 쓰지 말 것. execFileSync가 이벤트 루프를 막아 교착한다.
 *   외부 리소스가 없으므로 임시 파일 + file:// 로 렌더한다(PDF 때와 다르다).
 */
import { writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import promotionsData from "../data/promotions.json";
import menuData from "../data/menuData.json";
import PRICES from "../data/price_cache.json";
import { PORTION_FACTORS, DEFAULT_PORTION } from "../lib/planConfig";
import { matchMenuIngredients } from "../lib/promotions";
import type { MenuItem, SnackData, SnackItem } from "../lib/types";
import type { Promotion, StoreId, PromotionsFile } from "../data/promotions.types";

const OUT_DIR = join(homedir(), "Downloads", "ig_upload");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DRY = process.argv.includes("--dry");

const MENUS = (menuData as { MENU_DATA: { en: MenuItem[] } }).MENU_DATA.en;
const SNACKS = (menuData as unknown as { SNACK_DATA: SnackData }).SNACK_DATA;

// ── 비용 (사이트와 같은 정의) ────────────────────────────────
const per = (ing: string) => {
  const p = (PRICES as Record<string, { data: { price?: number } }>)[ing]?.data?.price ?? 0;
  return p * (PORTION_FACTORS[ing] ?? DEFAULT_PORTION);
};
const cost = (ings: string[]) => ings.reduce((t, i) => t + per(i), 0);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const snackFloor = () => {
  const fruit = median(((SNACKS["Fruit & Veg"] ?? []) as SnackItem[]).map((s) => cost(s.ingredients ?? [])));
  const other = median(
    [...((SNACKS["Protein & Dairy"] ?? []) as SnackItem[]), ...((SNACKS["Savoury Crunch"] ?? []) as SnackItem[])]
      .map((s) => cost(s.ingredients ?? [])),
  );
  return fruit + other;
};

// ── 이번 주 특가 ─────────────────────────────────────────────
type Promo = Promotion & { store: StoreId };
const data = promotionsData as unknown as PromotionsFile;
const week = data.weeks[data.currentWeek];
if (!week) throw new Error(`currentWeek(${data.currentWeek})가 weeks에 없다`);

// `stores`는 북섬 전단이다 — 게시물 문구도 「Auckland stores」라 남섬 전단(`southStores`)은 싣지 않는다.
const candidates: Promo[] = Object.entries(week.stores).flatMap(([store, sd]) =>
  sd.items.map((it) => ({ ...it, store: store as StoreId })),
);
const storeLabel = Object.fromEntries(Object.entries(week.stores).map(([k, v]) => [k, v.storeName]));

// ── 메뉴 선정: 특가를 가장 많이 쓰는 5개, 카테고리 중복 회피 ──
const scored = MENUS.map((m) => {
  const matches = matchMenuIngredients(m.ingredients, candidates);
  const saved = matches.reduce((t, x) => t + (x.promotion.savings ?? 0), 0);
  return { menu: m, matches, saved, box: cost(m.ingredients) + snackFloor() };
})
  .filter((r) => r.matches.length > 0)
  // 🔴 넛프리만 싣는다. 학교 도시락 포스트이고, 이 계정은 학교 129곳에
  //    "94종 중 89종이 넛프리"라고 밝히고 나갔다. NZ 학교 상당수가 넛 금지다.
  //    (첫 실행에서 Peanut Butter Sandwich가 화요일로 뽑혔다 — 걸러야 한다.)
  .filter((r) => r.menu.is_nut_free)
  // ⚠️ 매칭 개수로 정렬하면 안 된다. 재료가 많은 메뉴가 위로 오는데 그게 곧 비싼 메뉴다.
  //    (첫 시도에서 1통 평균 $5.16이 나왔다 — "특가로 싸게 짰다"는 논지가 성립하지 않는다.)
  //    특가를 쓰는 메뉴 중 **싼 순**으로 고른다. 그게 이 포스트가 말하려는 것이다.
  .sort((a, b) => a.box - b.box);

const picked: typeof scored = [];
const usedCat = new Map<string, number>();
const usedHero = new Set<string>();
for (const r of scored) {
  if (picked.length === 5) break;
  const c = r.menu.category ?? "?";
  if ((usedCat.get(c) ?? 0) >= 2) continue; // 같은 카테고리 최대 2개
  // 같은 특가 품목을 주인공으로 쓰는 메뉴가 겹치면 한 주가 단조로워진다
  const hero = r.matches[0]?.promotion.matchKey ?? "";
  if (usedHero.has(hero)) continue;
  usedCat.set(c, (usedCat.get(c) ?? 0) + 1);
  usedHero.add(hero);
  picked.push(r);
}
if (picked.length < 5) throw new Error(`특가와 겹치는 메뉴가 ${picked.length}개뿐이다 — 전단 갱신을 확인할 것`);

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const weekTotal = picked.reduce((t, r) => t + r.box, 0);
const fmt = (n: number) => (n < 1 ? `${Math.round(n * 100)}c` : `$${n.toFixed(2)}`);

console.log(`\n주차 ${week.validFrom} ~ ${week.validUntil} · 특가 ${candidates.length}건\n`);
for (let i = 0; i < 5; i++) {
  const r = picked[i];
  const on = r.matches.map((x) => x.ingredient).join(", ");
  console.log(`${DAYS[i].padEnd(10)} ${r.menu.name.padEnd(30)} ${fmt(r.box).padStart(7)}   특가: ${on}`);
}
console.log(`\n주간 합계 ${fmt(weekTotal)} · 1통 평균 ${fmt(weekTotal / 5)}`);

// 🔴 게시 수치는 사이트 주장과 같은 범위 안에 있어야 한다.
if (weekTotal / 5 > 7.6 || weekTotal / 5 < 1.5) {
  throw new Error(`1통 평균 ${fmt(weekTotal / 5)}가 게시 범위($2~$7.60) 밖이다 — 데이터를 확인할 것`);
}

if (DRY) process.exit(0);

// ── 렌더 ─────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// ⚠️ ASCII만. 헤드리스에 유니코드 구분자 글리프가 없다.
const ascii = (s: string) => s.replace(/[·•]/g, "|").replace(/[–—]/g, "-");

const SHELL = (body: string, bg: string, fg: string) => `<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1080px;overflow:hidden;background:${bg};color:${fg};
 font-family:-apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif;
 display:flex;flex-direction:column;padding:78px 78px 96px}
.kicker{font-size:22px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;opacity:.75;margin-bottom:24px}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;font-size:20px;opacity:.72;line-height:1.5}
.brand{font-size:25px;font-weight:800;opacity:1}
</style>${body}`;

const cover = SHELL(
  `<div class="kicker">Week of ${ascii(week.validFrom)} | built from this week's specials</div>
   <h1 style="font-size:80px;line-height:1.03;font-weight:800;letter-spacing:-.02em">
     Five lunchboxes,<br><span style="color:#A8D5A2">${fmt(weekTotal)}</span> for the week.</h1>
   <p style="margin-top:26px;font-size:28px;line-height:1.45;color:#D7E4D5;max-width:880px">
     I go through the Woolworths and New World specials first, then build the week around whatever is
     actually on special. This week that came to ${fmt(weekTotal / 5)} a box.</p>
   <div style="margin-top:44px;display:flex;flex-direction:column;gap:13px">
   ${picked
     .map(
       (r, i) => `<div style="background:rgba(255,255,255,.09);border-radius:16px;padding:19px 26px;display:flex;align-items:center;gap:20px">
       <span style="font-size:20px;font-weight:800;color:#A8D5A2;min-width:112px">${DAYS[i].toUpperCase()}</span>
       <span style="flex:1;font-size:29px;font-weight:600">${esc(ascii(r.menu.name))}</span>
       <span style="font-size:31px;font-weight:800;color:#A8D5A2">${fmt(r.box)}</span></div>`,
     )
     .join("")}
   </div>
   <div class="foot"><div>Woolworths &amp; New World specials,<br>${ascii(week.validFrom)} to ${ascii(week.validUntil)} | Auckland</div>
   <div class="brand">kiwilunchbox.co.nz</div></div>`,
  "#314A37",
  "#fff",
);

const dealRows = picked
  .flatMap((r) => r.matches.map((m) => ({ ...m, menu: r.menu.name })))
  .filter((v, i, a) => a.findIndex((x) => x.promotion.name === v.promotion.name) === i)
  // 카드에 6줄을 넣으면 하단 문구가 밀려 잘린다(ig_safe가 잡았다). 4줄이 상한.
  // 대형 팩(닭다리살 $17.99 등)은 "싸게 짠 주" 카드의 근거로 읽히지 않으므로 뺀다 —
  // 그 메뉴의 1통 비용은 앞 장에 이미 나와 있다.
  .filter((d) => d.promotion.salePrice <= 10)
  .sort((a, b) => (b.promotion.savingsPercent ?? 0) - (a.promotion.savingsPercent ?? 0))
  .slice(0, 4);

const deals = SHELL(
  `<div class="kicker" style="color:#5E7C61">What made it cheap</div>
   <h1 style="font-size:72px;line-height:1.05;font-weight:800;color:#314A37;letter-spacing:-.02em">
     The specials doing<br>the heavy lifting.</h1>
   <div style="margin-top:40px;display:flex;flex-direction:column;gap:13px">
   ${dealRows
     .map(
       (d) => `<div style="background:#fff;border-radius:18px;padding:22px 28px;display:flex;align-items:center;gap:20px">
       <div style="flex:1">
         <b style="display:block;font-size:27px;color:#1a1a1a;line-height:1.25">${esc(ascii(d.promotion.name))}</b>
         <span style="display:block;margin-top:4px;font-size:20px;color:#6b7280">${esc(storeLabel[d.store] ?? d.store)}</span>
       </div>
       <div style="text-align:right;min-width:150px">
         <b style="display:block;font-size:34px;font-weight:800;color:#314A37">$${d.promotion.salePrice.toFixed(2)}</b>
         ${d.promotion.savingsPercent ? `<span style="display:inline-block;margin-top:6px;font-size:17px;font-weight:800;padding:4px 11px;border-radius:999px;background:#EDF5EC;color:#314A37">${d.promotion.savingsPercent}% off</span>` : ""}
       </div></div>`,
     )
     .join("")}
   </div>
   <p style="margin-top:32px;font-size:26px;line-height:1.5;color:#374151">
     Costs include every ingredient plus a fruit and a second snack. No drink.
     Free planner, no sign-up.</p>
   <div class="foot" style="color:#7d8f7e"><div>Prices from this week's specials,<br>${ascii(week.validFrom)} to ${ascii(week.validUntil)} | Auckland</div>
   <div class="brand" style="color:#314A37">kiwilunchbox.co.nz</div></div>`,
  "#F4F7F3",
  "#1a1a1a",
);

mkdirSync(OUT_DIR, { recursive: true });
for (const f of ["kiwi_ig_week_1.png", "kiwi_ig_week_2.png"]) {
  const p = join(OUT_DIR, f);
  if (existsSync(p)) rmSync(p);
}
// ⚠️ 로컬 http 서버를 쓰면 안 된다. execFileSync가 Node 이벤트 루프를 막아
//    같은 프로세스의 서버가 Chrome 요청에 응답하지 못하고 **교착**한다(실제로 걸렸다).
//    이 페이지들은 외부 리소스가 0이라 file:// 로 충분하다(렌더 확인함).
const tmp = mkdtempSync(join(tmpdir(), "kiwi-ig-"));
try {
  for (const [i, html] of [cover, deals].entries()) {
    const src = join(tmp, `${i + 1}.html`);
    writeFileSync(src, html, "utf-8");
    execFileSync(CHROME, [
      "--headless", "--disable-gpu", "--hide-scrollbars",
      "--force-device-scale-factor=1", "--window-size=1080,1080",
      "--virtual-time-budget=6000",
      `--screenshot=${join(OUT_DIR, `kiwi_ig_week_${i + 1}.png`)}`,
      `file://${src}`,
    ], { stdio: "ignore" });
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const caption = `Five school lunches for ${fmt(weekTotal)} this week - about ${fmt(weekTotal / 5)} a box.

I go through the Woolworths and New World specials on Monday and build the week around whatever is actually on special, instead of picking lunches first and paying whatever they cost.

${picked.map((r, i) => `${DAYS[i]} - ${ascii(r.menu.name)}, ${fmt(r.box)}`).join("\n")}

The specials doing the work: ${dealRows.slice(0, 4).map((d) => `${ascii(d.promotion.name)} $${d.promotion.salePrice.toFixed(2)}${d.promotion.savingsPercent ? ` (${d.promotion.savingsPercent}% off)` : ""}${d.promotion.promoType === "club" ? " *" : ""}`).join(", ")}.${dealRows.slice(0, 4).some((d) => d.promotion.promoType === "club") ? "\n\n* Loyalty-card price - you need the store's free card (New World Club Plus or Woolworths Everyday Rewards) to pay it." : ""}

Each figure covers every ingredient in the meal plus a piece of fruit and a second snack, costed as the share of a pack you actually use. It does not include a drink. Prices from this week's specials, ${ascii(week.validFrom)} to ${ascii(week.validUntil)}, Auckland stores.

#schoollunchnz #nzmum #nzdad #aucklandmum #nzgroceries #budgetlunchbox #nzparents #lunchboxnz`;

writeFileSync(join(OUT_DIR, "CAPTION_week.txt"), caption, "utf-8");

console.log(`\n생성 완료 -> ${OUT_DIR}`);
console.log("  kiwi_ig_week_1.png / kiwi_ig_week_2.png / CAPTION_week.txt");
console.log("\n게시 전 반드시:");
console.log(`  python3 ~/Downloads/kiwi_scripts/ig_safe.py check ${OUT_DIR}/kiwi_ig_week_*.png`);
process.exit(0);
