#!/usr/bin/env node
/**
 * 아웃리치 재발송 스크리닝.
 *
 *   node scripts/screen_outreach.mjs <후보.txt> <기발송.txt> [CKAN.csv]
 *
 * 🔴 문자열 일치만으로는 못 잡는다. 2026-09-08에 `papakura-central` / `papakuracentral`로
 *    같은 학교(School_Id 1421)에 15일 간격으로 두 번 보냈다.
 *    본문이 "I won't follow up"이라고 약속하므로 이건 약속을 어기는 것이다.
 *
 * CSV를 주면 겹침 후보를 **School_Id로 판정**한다. 안 주면 후보만 나열한다 —
 * 핵심 이름이 같아도 대부분은 다른 학교다(실측 12쌍 중 11쌍).
 */
import { readFileSync, existsSync } from "node:fs";

const core = (d) =>
  String(d).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]
    .replace(/\.(school|ac|co|org|kiwi|maori)\.nz$/, "").replace(/\.(nz|com|net|org)$/, "")
    .replace(/[^a-z0-9]/g, "");

/**
 * 🔴 파일이 없는 것과 검사에 실패한 것은 다르다. 섞으면 도구를 못 믿게 된다 —
 *    `adsense-checklist.sh`가 두 달간 없는 경로를 grep하며 항상 빨간불이던 것과 같은 형태다.
 *    스택 트레이스 대신 무엇이 없는지 말하고 **exit 2**(검사 실패는 exit 1)로 끝낸다.
 */
const mustRead = (p, what) => {
  if (!existsSync(p)) {
    console.error(`🔴 ${what} 파일이 없다: ${p}`);
    console.error("   경로를 확인할 것. 스크래치패드는 세션이 바뀌면 비워진다.");
    console.error("   CKAN CSV 재다운로드:");
    console.error("     curl -s 'https://catalogue.data.govt.nz/api/3/action/resource_show?id=4b292323-9fcc-41f8-814b-3c7b19cf14b3' \\");
    console.error("       | python3 -c \"import json,sys;print(json.load(sys.stdin)['result']['url'])\"");
    process.exit(2);
  }
  return readFileSync(p, "utf-8");
};
/**
 * 🔴 **`office@`를 떼어낸다** (2026-09-16에 발견). 기발송 마스터는 도메인만 적고
 *    (`tirau.school.nz`), 후보 명단은 이메일이다(`office@tirau.school.nz`).
 *    떼어내지 않으면 `core()`가 `officetirau` vs `tirau`로 갈려 **완전일치도,
 *    핵심이름 대조도, 그래서 School_Id 판정도 전부 도달하지 못한다.**
 *    어제 보낸 학교 3곳을 후보에 그대로 섞어도 초록이 나왔다 — Papakura Central
 *    사고 뒤에 넣은 School_Id 판정이 그동안 **한 번도 실행된 적이 없었다.**
 */
const domainOf = (l) => l.trim().toLowerCase().split("@").pop();
const lines = (p, what) => mustRead(p, what).split("\n").map(domainOf).filter(Boolean);

const args = process.argv.slice(2);
const AUDIT = args[0] === "--audit";   // 기발송 명단 자체에 중복이 있는지 본다
const [candPath, sentPath, csvPath] = AUDIT ? [args[1], args[1], args[2]] : args;
if (!candPath || !sentPath) {
  console.error("사용법: node scripts/screen_outreach.mjs <후보.txt> <기발송.txt> [CKAN.csv]");
  console.error("        node scripts/screen_outreach.mjs --audit <기발송.txt> [CKAN.csv]");
  process.exit(2);
}
const cands = lines(candPath, "후보 명단"), sent = lines(sentPath, "기발송 명단");
/* 🔴 도메인으로 접기 **전의** 주소가 필요하다 — 같은 주소를 두 학교가 쓰는지는 여기서만 보인다. */
const rawCands = mustRead(candPath, "후보 명단").split("\n").map((l) => l.trim()).filter(Boolean);

// CKAN CSV → 도메인별 School_Id (있을 때만)
// 🔴 split(",")로는 못 읽는다 — 학교 이름에 쉼표가 있다("St Joseph's School (Fairfield), Hamilton").
//    따옴표를 아는 파서를 쓴다. 안 그러면 열이 밀려 School_Id가 통째로 어긋난다.
function parseCsvLine(line) {
  const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const idOf = new Map();
if (csvPath) {
  const rows = mustRead(csvPath, "CKAN CSV").split(/\r?\n/);
  const head = parseCsvLine(rows[0].replace(/^\ufeff/, ""));
  const iId = head.indexOf("School_Id"), iName = head.indexOf("Org_Name");
  const iUrl = head.indexOf("URL"), iMail = head.indexOf("Email");
  if (iId < 0) { console.error("🔴 CSV에 School_Id 열이 없다 — 판정할 수 없다"); process.exit(2); }
  const dm = (u) => String(u || "").trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  for (const r of rows.slice(1)) {
    if (!r.trim()) continue;
    const c = parseCsvLine(r);
    for (const k of [dm(c[iUrl]), dm(String(c[iMail] || "").split("@").pop())]) {
      if (k && !idOf.has(k)) idOf.set(k, { id: c[iId], name: c[iName] });
    }
  }
  console.log(`CKAN: 도메인 ${idOf.size}개에 School_Id를 붙였다`);
}

if (!cands.length) { console.error("🔴 후보가 0곳이다 — 파일이 비었거나 형식이 다르다"); process.exit(2); }
if (!sent.length) { console.error("🔴 기발송 명단이 0곳이다 — 이대로면 무엇이든 통과한다"); process.exit(2); }

/**
 * 🔴 **양성 대조를 안에 넣는다.** 「0건」은 정규화가 살아 있을 때만 뜻이 있다.
 *    기발송 첫 줄을 이메일 형태로 만들어 넣어 보고, 그게 안 걸리면 판정 자체를
 *    믿을 수 없으므로 **초록 대신 exit 2**로 끝낸다.
 */
const sentSet = new Set(sent);
if (!sentSet.has(domainOf(`office@${sent[0]}`))) {
  console.error(`🔴 양성 대조 실패: office@${sent[0]} 를 기발송으로 못 알아본다.`);
  console.error("   정규화가 깨졌다. 이 상태의 「0건」은 아무 뜻도 없다.");
  process.exit(2);
}
console.log(`양성 대조 ✅ office@${sent[0]} → 기발송으로 잡힌다`);
const byCore = new Map();
for (const d of sent) byCore.set(core(d), [...(byCore.get(core(d)) ?? []), d]);

/**
 * 🔴 **후보끼리도 본다** (2026-09-23). 그전까지 이 검사는 후보를 **기발송 마스터와만**
 *    대조했다. 주립은 학교마다 도메인이 달라 그걸로 충분했는데, 46차에서 사립을
 *    넣자마자 **같은 주소를 두 학교가 쓰는 경우**가 나왔다:
 *      enquiries@wentworth.school.nz  Wentworth Primary + Wentworth College
 *      info@sspx.org.nz               St Anthony's (Wanganui) + St Dominic's College
 *    그대로 보냈으면 **같은 사서함에 똑같은 메일이 두 번** 갔다 — 08-26 사고와 같은 모양이고,
 *    본문이 「I won't follow up」을 약속하므로 약속을 어기는 것이다.
 */
const seenAddr = new Map();
let dupInList = 0;
for (const raw of rawCands) {
  const key = raw.trim().toLowerCase();
  if (!key) continue;
  if (seenAddr.has(key)) {
    console.log(`🔴 DUP-IN-LIST ${key} — 후보 명단 안에 ${seenAddr.get(key) + 1}번째다`);
    dupInList++;
    seenAddr.set(key, seenAddr.get(key) + 1);
  } else seenAddr.set(key, 1);
}

let exact = 0, confirmed = 0, review = 0, cleared = 0;
for (const c of cands) {
  if (!AUDIT && sentSet.has(c)) { console.log(`🔴 EXACT   ${c} — 이미 보냈다`); exact++; continue; }
  // 감사 모드에서는 자기 자신을 빼고 본다
  const hits = (byCore.get(core(c)) ?? []).filter((h) => !AUDIT || h !== c);
  if (!hits.length) continue;
  const a = idOf.get(c), bs = hits.map((h) => idOf.get(h));
  const same = a && bs.find((b) => b && b.id === a.id);
  if (same) { console.log(`🔴 SAME-ID ${c} = ${hits.join(",")} — School_Id ${a.id} ${a.name}`); confirmed++; }
  else if (!csvPath || !a || bs.some((b) => !b)) { console.log(`⚠️ REVIEW  ${c} ~ ${hits.join(",")} — School_Id로 확인 필요`); review++; }
  else { cleared++; }
}
/**
 * 🔴 **감사가 스스로 못 보는 것을 말한다** (2026-09-17). 중복 발송에는 모양이 둘이다:
 *      (a) 철자가 다른 같은 학교   papakura-central ↔ papakuracentral  → 여기서 잡힌다
 *      (b) **같은 주소로 두 번**    st-benedicts 08-21 · 08-22          → **여기서 못 잡는다**
 *    기발송 마스터는 `sort -u` 된 도메인 목록이라 (b)는 한 줄로 합쳐져 사라진다.
 *    그런데 08-26 사고가 바로 (b)였다. 매 회차 「새 중복 0」을 (b)까지 덮는 것으로
 *    읽으면 안 된다 — (b)는 **발송함 전수**로만 보인다.
 */
if (AUDIT) {
  console.log("\n⚠️ 이 감사가 못 보는 것: **같은 주소로 두 번 보낸 것**.");
  console.log("   마스터는 도메인 유일 목록이라 한 줄로 합쳐진다. 발송함 전수로 볼 것.");
  console.log("   🔴 발송함 행은 같은 주소 span을 여러 번 담는다 — **행 단위로 유일화한 뒤** 셀 것.");
  console.log("   (안 하면 회신이 있는 스레드가 전부 「중복」으로 보인다. 2026-09-17에 그렇게 읽었다.)");
}
console.log(`\n후보 ${cands.length} · 기발송 ${sent.length}`);
console.log(`🔴 완전일치 ${exact} · 🔴 같은 학교 ${confirmed} · ⚠️ 확인필요 ${review} · ✅ 다른 학교로 확인 ${cleared}`);
console.log(`🔴 명단 안 같은 주소 중복 ${dupInList}`);
process.exit(exact + confirmed + dupInList > 0 ? 1 : 0);
