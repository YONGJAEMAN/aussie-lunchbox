#!/usr/bin/env node
/**
 * 학교 발송용 포스터의 **수치 주장**을 사이트 생성값에 대고 확인한다.
 *
 *   node scripts/check_poster.mjs ~/Downloads/_Kiwi_포스터/kiwi_school_poster_A4.html
 *
 * 🔴 왜 있나 (2026-09-22) — 포스터는 저장소 밖에 살고 **얼어붙은 사본**이다.
 *    PR #94·#95에서 저장소 안의 얼어붙은 수치를 전부 생성으로 바꿨는데
 *    포스터는 그 청소에서 통째로 빠졌다. 8월에 만든 뒤 주간 수집이 돌 때마다
 *    조용히 낡았고, 09-22에 재어 보니 상한이 **$7.80(실제 $7.10)**,
 *    학기 총액이 **$390(실제 $355)**이었다. 게재 47곳에 이미 나간 파일이다.
 *    「보낼 때 확인할 것」은 절차였고 절차는 잊힌다 — 명령으로 바꾼다.
 *
 * 🔴 **모르는 금액을 통과시키지 않는다.** 포스터에 있는 $금액 중 여기서
 *    설명하지 못하는 게 있으면 실패다. 안 본 것을 초록으로 세면 초록이 뜻을 잃는다.
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const path = process.argv[2];
if (!path) {
  console.error("사용: node scripts/check_poster.mjs <포스터.html>");
  process.exit(2);
}
if (!existsSync(path)) {
  console.error(`🔴 포스터 파일이 없다: ${path}`);
  console.error("   기본 위치: ~/Downloads/_Kiwi_포스터/kiwi_school_poster_A4.html");
  process.exit(2);
}

const html = readFileSync(path, "utf-8");
/* base64로 박힌 이미지는 금액처럼 보이는 문자열을 만든다 — 먼저 걷어낸다. */
const text = html
  .replace(/data:[^"')]+/g, " ")
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&[a-z]+;/g, " ")
  .replace(/\s+/g, " ");

/* 사이트 생성값 — 여기서 다시 계산하지 않는다. */
const derived = JSON.parse(
  execFileSync("npx", ["tsx", "-e", `
    import { boxMedianLabel, boxFloorLabel, boxCeilingLabel } from "./lib/servePrice";
    import menuData from "./data/menuData.json";
    const M = (menuData as any).MENU_DATA.en;
    console.log(JSON.stringify({
      median: boxMedianLabel(), floor: boxFloorLabel(), ceiling: boxCeilingLabel(),
      menus: M.length, nutFree: M.filter((m: any) => !!m.is_nut_free).length,
    }));
  `], { encoding: "utf-8", cwd: process.cwd() }).trim().split("\n").pop(),
);

const num = (label) => Number(String(label).replace(/[^0-9.]/g, ""));
const fails = [];
const ok = (cond, msg) => { console.log(`  ${cond ? "✅" : "🔴"} ${msg}`); if (!cond) fails.push(msg); };
const seen = new Set();

/*
 * 🔴 킨디 포스터(2026-10-14, 유치원 아웃리치) — `data-poster="kindy"`.
 *    금액을 **아예 싣지 않는다**: 학교 1인분 금액을 킨디 부모에게 보이면 틀린 숫자고,
 *    킨디 양 금액은 메뉴마다 달라 띠로 적을 근거가 없다. 그래서 $가 하나라도 있으면 실패.
 *    싣는 수치는 둘 — 킨디 필터를 통과하는 메인 수, 킨디 양 배율. 둘 다 사이트 생성값과 대조.
 */
if (/data-poster="kindy"/.test(html)) {
  const k = JSON.parse(
    execFileSync("npx", ["tsx", "-e", `
      import { kindyFacts } from "./content/guides";
      import { bandFactor } from "./lib/portionBands";
      const f = kindyFacts();
      console.log(JSON.stringify({ total: f.menuTotal, pass: f.menuTotal - f.menusOut.length, factor: bandFactor("kindy").toFixed(2) }));
    `], { encoding: "utf-8", cwd: process.cwd() }).trim().split("\n").pop(),
  );
  console.log(`포스터 ${path} (킨디)`);
  console.log(`사이트 값 메인 ${k.total} 중 킨디 통과 ${k.pass} · 킨디 양 ×${k.factor}\n`);
  const mains = text.match(/(\d+)\s+of our\s+(\d+)\s+lunch mains/);
  if (!mains) fails.push("메인 수 「N of our M lunch mains」를 못 찾았다");
  else {
    ok(Number(mains[1]) === k.pass, `킨디 통과 메인 ${mains[1]} (사이트 ${k.pass})`);
    ok(Number(mains[2]) === k.total, `전체 메인 ${mains[2]} (사이트 ${k.total})`);
  }
  const factors = [...text.matchAll(/×\s*(\d+\.\d+)/g)].map((m) => m[1]);
  if (!factors.length) fails.push("킨디 양 배율 「×0.NN」을 못 찾았다");
  for (const f of new Set(factors)) ok(f === k.factor, `킨디 양 ×${f} (사이트 ×${k.factor})`);
  const money = [...new Set([...text.matchAll(/~?\s*\$\d+(?:\.\d{2})?/g)].map((m) => m[0].replace(/\s+/g, "")))];
  ok(money.length === 0, money.length ? `금액이 실려 있다: ${money.join(", ")} — 킨디 포스터는 금액을 싣지 않는다` : "금액 없음");
  console.log("");
  if (fails.length) {
    console.error(`🔴 ${fails.length}건 어긋난다. 포스터를 고치고 PDF·PNG를 다시 뽑을 것.`);
    process.exit(1);
  }
  console.log("포스터의 수치가 전부 사이트와 맞는다.");
  process.exit(0);
}

console.log(`포스터 ${path}`);
console.log(`사이트 값 중앙 ${derived.median} · 하한 ${derived.floor} · 상한 ${derived.ceiling}`
  + ` · 메뉴 ${derived.menus}(nut-free ${derived.nutFree})\n`);

/* 1) 범위 — 하한·상한 라벨과 글자까지 같아야 한다 */
const range = text.match(/\$(\d+(?:\.\d{2})?)\s*[–-]\s*\$(\d+(?:\.\d{2})?)/);
if (!range) fails.push("범위 「$A–$B」를 못 찾았다");
else {
  seen.add("$" + range[1]); seen.add("$" + range[2]);
  ok("$" + range[1] === derived.floor, `하한 $${range[1]} (사이트 ${derived.floor})`);
  ok("$" + range[2] === derived.ceiling, `상한 $${range[2]} (사이트 ${derived.ceiling})`);
}

/* 2) 학기 총액 — 🔴 포스터가 **화면에 찍은 라벨**을 되읽어 곱한다.
 *    반올림 전 값으로 곱하면 화면과 갈린다 (09-20 PR #97에서 당한 그 고장). */
const term = text.match(/(\d+)-week term[\s\S]{0,120}?\$(\d+(?:\.\d{2})?)\s*to\s*\$(\d+(?:\.\d{2})?)\s*a child/);
if (!term) fails.push("학기 총액 「$A to $B a child」를 못 찾았다");
else if (!range) fails.push("범위를 못 읽어 학기 총액을 검산할 수 없다");
else {
  const lunches = Number(term[1]) * 5;
  seen.add("$" + term[2]); seen.add("$" + term[3]);
  const lo = Math.round(num(range[1]) * lunches);
  const hi = Math.round(num(range[2]) * lunches);
  ok(Number(term[2]) === lo, `학기 하한 $${term[2]} = $${range[1]} × ${lunches}끼 = $${lo}`);
  ok(Number(term[3]) === hi, `학기 상한 $${term[3]} = $${range[2]} × ${lunches}끼 = $${hi}`);
}

/* 3) 중앙값 — 포스터는 반올림한 띠(~$4)로 적는다. 주간 드리프트를 견디라고 그렇게 뒀다. */
const med = text.match(/~\s*\$(\d+)/);
if (!med) fails.push("중앙값 「~$N」을 못 찾았다");
else {
  seen.add("~$" + med[1]);
  ok(Math.round(num(derived.median)) === Number(med[1]),
    `중앙값 ~$${med[1]} (사이트 ${derived.median} → 반올림 $${Math.round(num(derived.median))})`);
}

/* 4) 메뉴 수 */
const menus = text.match(/(\d+)\s+lunch menus\s*—?\s*(\d+)\s+of them nut-free/);
if (!menus) fails.push("메뉴 수 「N lunch menus — M of them nut-free」를 못 찾았다");
else {
  ok(Number(menus[1]) === derived.menus, `메뉴 ${menus[1]}종 (데이터 ${derived.menus})`);
  ok(Number(menus[2]) === derived.nutFree, `nut-free ${menus[2]}종 (데이터 ${derived.nutFree})`);
}

/* 5) 🔴 설명하지 못한 금액이 남아 있으면 실패 */
const allMoney = [...text.matchAll(/~?\s*\$\d+(?:\.\d{2})?/g)]
  .map((m) => m[0].replace(/\s+/g, ""));
const unexplained = [...new Set(allMoney)].filter((m) => !seen.has(m));
if (unexplained.length) {
  console.log(`  🔴 설명 못 한 금액: ${unexplained.join(", ")}`);
  fails.push("포스터에 이 검사기가 모르는 금액이 있다");
} else {
  console.log(`  ✅ 금액 ${[...seen].length}개 전부 설명됨 — 안 본 금액 없다`);
}

console.log("");
if (fails.length) {
  console.error(`🔴 ${fails.length}건 어긋난다. 포스터를 고치고 PDF·PNG를 다시 뽑을 것.`);
  console.error("   🔴 이미 받은 학교에는 정정을 보내지 않는다 —");
  console.error("      본문이 「I won't follow up」을 약속한다. 다음 발송분부터 고친 것을 쓴다.");
  process.exit(1);
}
console.log("포스터의 수치가 전부 사이트와 맞는다.");
