#!/usr/bin/env node
/**
 * Pak'nSave 매장 실사용 체크리스트 출력.
 *
 * 🔴 2026-08-10 정정: 여기 "Pak'nSave 열은 자동화할 수 없다 (점포별 가격, 읽을 수
 *    있는 피드 없음)"이라고 적혀 있었다. **틀린 판단이었다.** paknsave.co.nz는
 *    쿠키로 매장을 정하면 그 매장 가격을 그대로 내려준다. 확인도 안 해보고
 *    "없다"고 적어둔 탓에 두 열이 86일 벌어진 채 석 달을 갔다.
 *    → 이제 가격은 scripts/update_paknsave_prices.mjs가 주 단위로 갱신한다.
 *
 * 그래서 이 체크리스트의 용도가 바뀌었다. **가격을 받아 적으러 가는 목록이 아니라,
 * 온라인으로 해결이 안 되는 것만 보러 가는 목록**이다:
 *   ① 온라인가 ↔ 매대 태그가 실제로 같은지 표본 대조 (같다는 보장이 없다)
 *   ② paknsave 쪽이 blocked인 항목 — 매장에만 있는 상품인지 확인해야 풀린다
 *   ③ 특가 주간이라 자동 갱신이 건너뛴 항목의 정상 진열가
 *
 * Usage: node scripts/paknsave_checklist.mjs
 *        node scripts/paknsave_checklist.mjs --md > ~/Downloads/paknsave_checklist.md
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const index = JSON.parse(readFileSync(join(ROOT, "data", "priceIndex.json"), "utf8"));
const sources = JSON.parse(
  readFileSync(join(ROOT, "data", "priceIndexSources.json"), "utf8"),
);
const md = process.argv.includes("--md");

const blockedNotes = [];
for (const [name, src] of Object.entries(sources.items ?? {})) {
  if (src.blocked) blockedNotes.push({ name, reason: src.reason });
}

const lines = [];
lines.push(md ? "# Pak'nSave 가격지수 체크리스트" : "Pak'nSave 가격지수 체크리스트");
lines.push("");
lines.push(`매장: ${index.checkedAt ?? "Pak'nSave Ormiston"}`);
lines.push(`Pak'nSave 열 기준일: ${index.paknsaveUpdated ?? index.lastUpdated} (온라인 자동 갱신)`);
lines.push(`Woolworths 열 기준일: ${index.woolworthsUpdated ?? "-"} (자동 갱신)`);
lines.push("");
lines.push("⚠️ 가격은 이미 온라인으로 갱신돼 있다. 여기 적힌 '직전 P'nS' 값은 그 온라인가다.");
lines.push("   매장에서 할 일은 **그 값이 매대 태그와 같은지 표본으로 대조**하는 것이다.");
lines.push("   어긋나면 페이지에 오차를 적어야 하므로, 다른 값이 나온 항목을 꼭 기록할 것.");
lines.push("");
lines.push("규칙 세 가지:");
lines.push("① **정상 진열가**를 적는다. 노란 Super Saver 딱지 가격이 아니다.");
lines.push("   특가를 넣으면 지수가 물가 하락처럼 보인다. 특가는 promotions.json 몫이다.");
lines.push("   그 주 정상가 태그가 아예 없으면 값을 비우고 메모를 남긴다.");
lines.push("② **note에 적힌 그 상품**을 찾는다. 없으면 비워 둔다 — 다른 브랜드로 대체하지 않는다.");
lines.push("③ 품절이면 **비워 둔다.** 추정치로 채우지 않는다.");
lines.push("");
lines.push("증빙: 진열 태그를 폰으로 찍어두면 나중에 값이 의심될 때 근거가 된다.");
lines.push("     영수증도 남기면 페이지의 감사기록을 갱신할 수 있다(카드번호는 가릴 것).");
lines.push("");

/**
 * ⚠️ 매장에서 봐야 하는 건 **지수 항목의 `note`**(지정 브랜드/품종)다.
 * Woolworths 고정상품명이 아니다 — 그건 다른 매장 상품이다.
 *
 * 2026-07-30에 Woolworths SKU를 고정하면서 이 note를 안 읽어 17건 중 9건의
 * 브랜드가 어긋났다(Butter의 note가 'Anchor'인데 자체브랜드로 잡음).
 * 매장 실사에서 같은 실수를 하면 두 열이 다른 상품을 가리키게 되고,
 * 그 순간 이 지수는 매장 비교로서 무의미해진다.
 */
/**
 * 온라인 참고가. `node scripts/paknsave_reference.mjs`로 만든다.
 * 없거나 낡아도 목록은 나온다 — 다만 특가 표시가 빠진다.
 */
const REFERENCE = (() => {
  try {
    const raw = readFileSync(new URL("../data/paknsave_online_reference.json", import.meta.url), "utf-8");
    const doc = JSON.parse(raw);
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" });
    if (doc.collectedAt !== today) {
      lines.push(`⚠️ 온라인 참고가가 ${doc.collectedAt}자다 (오늘 ${today}). 특가 표시가 낡았을 수 있다 — \`node scripts/paknsave_reference.mjs\`로 다시 뽑을 것.`);
      lines.push("");
    }
    return doc.items ?? {};
  } catch {
    lines.push("⚠️ 온라인 참고가 파일이 없다 — `node scripts/paknsave_reference.mjs`를 먼저 돌리면 특가 항목이 표시된다.");
    lines.push("");
    return {};
  }
})();

const w = 28;
if (md) {
  lines.push("| ✓ | 품목 | **찾을 상품 (note)** | 직전 P'nS | 참고: Woolworths | 새 P'nS |");
  lines.push("|---|---|---|---|---|---|");
} else {
  lines.push(
    "   " + "품목".padEnd(w) + "찾을상품(note)".padEnd(24) + "직전P'nS".padEnd(10) + "참고W".padEnd(9) + "새 가격",
  );
  lines.push("   " + "-".repeat(w + 52));
}

for (const item of index.items) {
  const src = sources.items?.[item.name] ?? {};
  // note = 지수가 정의한 상품 정체성. 비어 있으면 품목명의 규격만 맞으면 된다.
  const want = (item.note ?? "").trim() || "(브랜드 지정 없음)";
  // paknsave가 null = 값이 없다. 신규 항목이거나, 항목 정의가 바뀌어 과거 값이
  // 다른 상품 기준이 된 경우다. 어느 쪽이든 **이번 실사에서 최우선**으로 채워야 한다.
  const p = item.paknsave === null ? "❗없음" : `$${item.paknsave}`;
  const c = item.countdown === null ? "—" : `$${item.countdown}`;
  const flag = src.blocked ? " ⚠️" : "";
  // 🔴 매장에서 가장 중요한 정보는 "이 줄이 지금 특가인가"다. 규칙 ①이 정상 진열가를
  //    적으라고 말하는데, 어느 줄이 노란 딱지인지 모르면 지킬 수가 없다.
  //    참고 파일(paknsave_online_reference.json)이 그걸 들고 있는데 아무도 안 읽고
  //    있었다 — 08-24에 연결했다. 파일이 없거나 낡아도 목록은 그대로 나온다.
  const ref = REFERENCE[item.name];
  const special = ref?.status === "on-special"
    ? `🟡 온라인 특가 $${ref.online}${ref.normalOnline ? ` (정상 $${ref.normalOnline})` : ""} — **정상가 태그를 찾을 것**`
    : ref?.status === "not-found"
      ? "❓ 온라인에 상품 없음 — 단종 확인"
      : "";
  if (md) {
    lines.push(`| ☐ | ${item.name}${flag} | **${want}**${special ? `<br>${special}` : ""} | ${p} | ${c} | |`);
  } else {
    lines.push(
      "☐  " + (item.name + flag).padEnd(w) + want.padEnd(24) + p.padEnd(10) + c.padEnd(9) + "______",
    );
    if (special) lines.push("      " + special.replace(/\*\*/g, ""));
  }
}
lines.push("");
lines.push("⚠️ 표시 = 규격/상품 문제로 자동갱신 보류 중인 항목. 하단 설명 참조.");

if (blockedNotes.length) {
  lines.push("");
  lines.push(md ? "## 매장에서 확인할 규격 문제" : "매장에서 확인할 규격 문제");
  lines.push("");
  lines.push(
    "아래 항목은 Woolworths 자동 갱신에서 제외돼 있다. 지수 항목의 규격 자체가",
  );
  lines.push("현실과 안 맞아서다. 매장에서 실제 규격을 확인해 지수 라벨을 고쳐야 한다.");
  lines.push("");
  for (const b of blockedNotes) {
    lines.push(`${md ? "- " : "☐  "}**${b.name}**`);
    lines.push(`      ${b.reason}`);
  }
}

lines.push("");
lines.push(md ? "## 돌아온 뒤" : "돌아온 뒤");
lines.push("");
lines.push("1. `data/priceIndex.json`의 `paknsave` 값 갱신");
lines.push("2. `paknsaveUpdated`를 오늘 날짜로");
lines.push(
  "3. `lastUpdated`는 **두 열 중 더 오래된 날짜**로 (둘 다 갱신됐으면 오늘)",
);
lines.push("4. `npm test` — 가격 범위·매장 간 3배 가드가 오타를 잡는다");
lines.push("5. 영수증 사진을 `public/assets/`에 추가하면 증빙이 갱신된다");

console.log(lines.join("\n"));
