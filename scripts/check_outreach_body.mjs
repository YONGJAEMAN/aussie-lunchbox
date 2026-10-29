#!/usr/bin/env node
/**
 * 아웃리치 메일 본문의 **수치 주장**을 사이트 데이터에 대고 확인한다.
 *
 *   node scripts/check_outreach_body.mjs ~/Downloads/kiwi_wave38_tpl_body.txt
 *
 * 🔴 왜 있나 — 메일 본문은 저장소 밖(`~/Downloads`)에 산다. 그래서 사이트의
 *    금액·개수 가드가 **원리상 닿지 않는다.** 실제로 두 번 샜다:
 *      2026-09-14  "pasta fell 28% … butter rose 49%"가 **어느 라운드 조합으로도**
 *                  재현되지 않았다. 36차부터 실측값으로 교체했다.
 *      2026-09-15  상한이 $7.30이었다. 사이트 게시값은 $7.20이다(PR #73에서 바로잡힘).
 *    「발송 전에 재계산할 것」은 절차였고, 절차는 잊힌다. 명령으로 바꾼다.
 *
 * 🔴 **모르는 수치를 통과시키지 않는다.** 본문에 있는 금액·퍼센트 중 여기서
 *    설명하지 못하는 게 있으면 **실패**로 낸다 — 「검사한 것」과 「안 본 것」을
 *    섞으면 초록이 아무 뜻도 없어진다.
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const path = process.argv[2];
if (!path || !existsSync(path)) {
  console.error("사용: node scripts/check_outreach_body.mjs <본문.txt> [--island south]");
  process.exit(2);
}
// 남섬에 보내는 본문은 남섬 캐시(`price_cache.south.json`)로 잰 도시락 금액을 말해야 한다(2026-10-28).
const ISLAND = process.argv.includes("--island") ? process.argv[process.argv.indexOf("--island") + 1] : "north";
if (ISLAND !== "north" && ISLAND !== "south") {
  console.error(`--island는 north|south다 (받은 값: ${ISLAND})`);
  process.exit(2);
}
const body = readFileSync(path, "utf-8");
const UA_BROWSER =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/* 사이트 생성값을 그대로 가져온다 — 여기서 다시 계산하지 않는다. */
const derived = JSON.parse(
  execFileSync("npx", ["tsx", "-e", `
    import { boxLabelsFor } from "./lib/servePrice";
    console.log(JSON.stringify(boxLabelsFor(${JSON.stringify(ISLAND)})));
  `], { encoding: "utf-8", cwd: process.cwd() }).trim().split("\n").pop(),
);

/* Pak'nSave 5월 → 최신 라운드 변동 */
const hist = JSON.parse(readFileSync("data/priceHistory.json", "utf-8")).columns.paknsave;
const first = hist.find((r) => r.date === "2026-05-16");
const last = hist[hist.length - 1];
const movePct = (key) => {
  const a = first?.items?.[key];
  const b = last?.items?.[key];
  return typeof a === "number" && typeof b === "number" ? ((b - a) / a) * 100 : null;
};
/**
 * 🔴 **이중 반올림 주의** (2026-09-15에 실제로 당했다). 참치는 2.30 → 3.99 이라
 *    정확히 73.478%다. 이걸 1자리로 보고(73.5%) 다시 반올림하면 74%가 나온다.
 *    36·37차 본문이 그렇게 74%로 나갔다. 정수 반올림은 **원값에서 한 번만** 한다.
 */
const MOVES = {
  carrots: "Carrots (1kg)", pasta: "Pasta (500g)", butter: "Butter (500g)",
  eggs: "Eggs (12-pack)", tuna: "Canned Tuna (185g)",
};

/* 게재 수 — `docs/outreach-placements.md` 가 유일한 출처 */
const placements = Number(
  (readFileSync("docs/outreach-placements.md", "utf-8").match(/^##\s*게재\s*(\d+)곳/m) ?? [, "0"])[1],
);
const WORDS = {
  40: "Forty", 41: "Forty-one", 42: "Forty-two", 43: "Forty-three", 44: "Forty-four",
  45: "Forty-five", 46: "Forty-six", 47: "Forty-seven", 48: "Forty-eight", 49: "Forty-nine",
  50: "Fifty",
};

const fail = [];
const ok = [];
const seen = new Set();          // 설명한 토큰
const note = (tok) => seen.add(tok);

/* 1. 도시락 금액 */
for (const [label, want] of [["중앙값", derived.median], ["하한", derived.floor], ["상한", derived.ceiling]]) {
  if (body.includes(want)) { ok.push(`${label} ${want}`); note(want); }
  else fail.push(`${label}: 본문에 ${want} 가 없다 (사이트 게시값)`);
}

/* 2. 가격 변동 — 본문이 "fell 32%" / "rose 60%" 꼴로 말한다 */
for (const [name, key] of Object.entries(MOVES)) {
  const pct = movePct(key);
  if (pct === null) { fail.push(`${key}: priceHistory 에서 못 읽었다`); continue; }
  const rounded = Math.abs(Math.round(pct));
  /**
   * 🔴 품목 **뒤**에 오는 첫 퍼센트만 본다. 처음엔 앞뒤 어느 쪽이든 40자 안이면
   *    잡게 했는데, "carrots fell 32% and pasta 16%"에서 `pasta` 앞의 **32%**를
   *    집어 네 품목이 전부 빨간불이 났다 — 본문은 멀쩡했고 스크립트가 틀렸다.
   *    (그때 「설명 못 한 수치: 16%, 29%, 74%」가 같이 떠서 드러났다.)
   */
  const at = body.toLowerCase().indexOf(name.toLowerCase());
  if (at < 0) continue;                              // 본문이 그 품목을 안 말할 수도 있다
  const after = body.slice(at, at + 60);
  const m = after.match(/(\d{1,3})%/);
  if (!m) continue;
  const said = Number(m[1]);
  note(`${said}%`);
  if (said === rounded) ok.push(`${name} ${said}% (실측 ${pct.toFixed(2)}%)`);
  else fail.push(`${name}: 본문 ${said}% ≠ 실측 ${pct.toFixed(2)}% (${first.date}→${last.date})`);
}

/* 3. 게재 수 */
const word = WORDS[placements];
if (!word) fail.push(`게재 수 ${placements} 에 해당하는 낱말이 목록에 없다 — WORDS 를 늘릴 것`);
else if (body.includes(`${word} schools`)) ok.push(`게재 ${word} schools (${placements}곳)`);
else fail.push(`게재: 본문이 "${word} schools" 라고 말하지 않는다 (docs 기준 ${placements}곳)`);

/**
 * 3-b. 🔴 **본문이 이름을 대고 「지금 올라가 있다」고 말하는 학교** — 실제로 올라가 있나.
 *
 *    본문 문장: "... and Grey Lynn School has it up on their community notices page **now**."
 *    이건 현재형 주장이고, 회차마다 **70곳에 나간다.** 그 학교가 내리면 우리는
 *    매주 70곳에 거짓을 말하게 된다. 아무도 안 보고 있었다 —
 *    2026-09-18에 훑어보니 Kaharoa는 **08-20에 올려 둔 것을 한 달간 몰랐고**,
 *    Grey Lynn이 내렸는지도 확인한 적이 없었다.
 *
 * 🔴 학교 사이트 상당수가 JS 렌더라 `fetch`로는 본문이 안 보인다. 그때 「없음」으로
 *    찍으면 알리바이다 — **본문이 400자 미만이면 판단 불가로 exit 2**를 낸다.
 *    「못 봤다」와 「내려갔다」는 다르다.
 */
/**
 * 🔴 **본문이 이름을 대고 하는 현재형 주장은 전부 확인한다.**
 *    처음엔 정규식이 **한 곳만** 잡았다(2026-09-18). 42차부터 Kaharoa 를 같이 대기로
 *    했는데, 그대로 두면 **둘째 학교는 아무도 안 보는** 주장이 된다 —
 *    「한 곳만 보는 가드」는 이 저장소가 아홉 번 고쳐 온 모양이다(PR #73~#82).
 *
 *    주장 문장을 먼저 찾고(has/have it up … now), 그 문장 안의 학교 이름을 **전부** 뽑는다.
 */
const claimSentence = (body.match(/[^.]*\b(?:has|have)\s+(?:it|theirs)\s+up[^.]*\bnow\b[^.]*\./) ?? [])[0] ?? "";
const claimedSchools = [...new Set(
  [...claimSentence.matchAll(/([A-Z][A-Za-z'\-]*(?:\s+[A-Z][A-Za-z'\-]*)*\s+School)/g)].map((m) => m[1].trim()),
)];

if (claimedSchools.length === 0) {
  ok.push("현재형 게재 주장 없음 — 확인할 것이 없다");
} else {
  const doc = readFileSync("docs/outreach-placements.md", "utf-8");
  for (const school of claimedSchools) {
    const row = doc.split("\n").find((l) => l.includes(`| ${school} |`) && l.includes("`"));
    const dom = row && (row.match(/`([^`]+)`/) ?? [])[1];
    if (!dom) {
      fail.push(`현재형 주장: 본문이 "${school}"을 대는데 게재 문서에 그 학교가 없다`);
      continue;
    }
    let found = false, best = 0, err = null;
    for (const url of [`https://www.${dom}`, `https://${dom}`]) {
      try {
        const res = await fetch(url, { headers: { "User-Agent": UA_BROWSER }, redirect: "follow" });
        const html = await res.text();
        const text = html.replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
                         .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        best = Math.max(best, text.length);
        if (/kiwilunchbox/i.test(html)) { found = true; break; }
        for (const m of [...html.matchAll(/href="([^"]{1,120})"/g)].slice(0, 200)) {
          let u = m[1];
          if (!/newsletter|notice|communit|link|parent/i.test(u)) continue;
          if (u.startsWith("/")) u = url.replace(/\/$/, "") + u;
          if (!u.startsWith("http")) continue;
          const r2 = await fetch(u, { headers: { "User-Agent": UA_BROWSER } }).catch(() => null);
          if (!r2) continue;
          const h2 = await r2.text();
          best = Math.max(best, h2.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length);
          if (/kiwilunchbox/i.test(h2)) { found = true; break; }
        }
        if (found) break;
      } catch (e) { err = e.message; }
    }
    if (found) ok.push(`현재형 주장 ✅ ${school} (${dom}) 에 우리 언급이 살아 있다`);
    else if (best < 400) {
      console.error(`🔴 ${school}(${dom}) 사이트를 못 읽었다 (본문 ${best}자${err ? ", " + err : ""}).`);
      console.error("   JS 렌더일 수 있다. 「못 봤다」는 「내려갔다」가 아니다 — 눈으로 확인할 것.");
      process.exit(2);
    } else {
      fail.push(`🔴 현재형 주장: ${school}(${dom}) 에서 우리 언급을 못 찾았다 (본문 ${best}자를 읽었다). 내려갔을 수 있다 — 본문 문장을 고칠 것`);
    }
  }
}

/* 4. 🔴 설명 못 한 수치가 남아 있으면 실패 — 초록의 뜻을 지킨다 */
const tokens = [...body.matchAll(/\$\d+(?:\.\d{2})?|\b\d{1,3}%/g)].map((m) => m[0]);
const unexplained = [...new Set(tokens)].filter((t) => !seen.has(t));
if (unexplained.length) {
  fail.push(`설명 못 한 수치: ${unexplained.join(", ")} — 근거를 이 스크립트에 추가하거나 본문에서 뺄 것`);
}

console.log(`본문 ${path}${ISLAND === "south" ? " · 🏝️ 남섬 금액으로 검사" : ""}`);
console.log(`라운드 ${first?.date} → ${last?.date} · 게재 ${placements}곳\n`);
for (const o of ok) console.log(`  ✅ ${o}`);
for (const f of fail) console.log(`  🔴 ${f}`);
console.log(fail.length ? `\n🔴 ${fail.length}건 — 발송 전에 고칠 것` : "\n본문의 수치가 전부 데이터와 맞는다.");
process.exit(fail.length ? 1 : 0);
