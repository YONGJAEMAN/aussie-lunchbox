#!/usr/bin/env node
/**
 * MPI 『Food safety at home』 소책자 원문에 대고 **우리가 인용한 숫자와 쪽수**를 확인한다.
 *
 * 🔴 왜 있나 (2026-09-15) — 이 저장소는 "mpi.govt.nz는 Imperva 뒤라 curl·WebFetch·
 *    인앱 브라우저 전부 막힌다"고 적어 두고 있었다. **HTML 페이지는 맞다** — 실제로
 *    브라우저로 열면 Imperva CAPTCHA가 뜨고, CAPTCHA는 풀지 않는다.
 *    그런데 **`/dmsdocument/` PDF는 그냥 받아진다.** 확인해 보지 않은 「불가능하다」가
 *    숫자 검증을 통째로 막고 있었다.
 *
 * 우리 글이 업고 있는 건 HTML 페이지가 아니라 이 소책자의 숫자다(글이 스스로
 * "That page is deliberately qualitative; the temperatures and times come from the
 * booklet instead"라고 밝힌다). 그러니 검증해야 할 것도 소책자다.
 *
 * 사용: node scripts/verify_mpi_citations.mjs
 * 필요: pdftotext (poppler). 없으면 **건너뛰지 않고 exit 2**로 끝낸다 —
 *       「도구가 없다」와 「검사를 통과했다」는 다르다.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PDF = "https://www.mpi.govt.nz/dmsdocument/3662-Food-Safety-in-the-Home";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/** 글이 주장하는 것 — 인쇄 쪽번호 기준. 바꾸려면 원문을 다시 열어 볼 것. */
const CLAIMS = [
  { printedPage: 5, what: "위험구간 5°C–60°C", must: [/DANGER ZONE/i, /5°C/, /60°C/] },
  { printedPage: 5, what: "위험구간 4시간 제한", must: [/4 hours/i] },
  { printedPage: 10, what: "남은 음식 2시간 안에 냉장", must: [/within 2 hours/i] },
  { printedPage: 10, what: "재가열 75°C 초과", must: [/over 75°C/i] },
  { printedPage: 14, what: "학교 도시락", must: [/lunch box/i] },
];

const have = (cmd) => {
  try { execFileSync("which", [cmd], { stdio: "ignore" }); return true; } catch { return false; }
};

if (!have("pdftotext")) {
  console.error("🔴 pdftotext 가 없다 (brew install poppler). 검사를 못 돌린 것이지 통과한 게 아니다.");
  process.exit(2);
}

const dir = mkdtempSync(join(tmpdir(), "mpi-"));
const pdf = join(dir, "booklet.pdf");
try {
  const res = await fetch(PDF, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    console.error(`🔴 소책자를 못 받았다: HTTP ${res.status}`);
    process.exit(2);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.subarray(0, 5).toString().startsWith("%PDF")) {
    // 🔴 Imperva 차단 페이지는 HTTP 200에 HTML을 준다. 확장자가 아니라 **내용**으로 본다.
    console.error(`🔴 PDF가 아니다 (${buf.length}B) — 차단 페이지일 가능성이 높다.`);
    process.exit(2);
  }
  writeFileSync(pdf, buf);
  console.log(`소책자 수신 ${(buf.length / 1024).toFixed(0)}KB`);

  /**
   * 🔴 PDF 쪽수와 **인쇄 쪽번호**가 다르다(표지·목차 때문에 2쪽 어긋난다).
   *    우리 글은 인쇄 쪽번호로 인용하므로, 찾을 때도 인쇄 쪽번호로 찾아야 한다.
   */
  const pageText = (p) =>
    execFileSync("pdftotext", ["-layout", "-f", String(p), "-l", String(p), pdf, "-"], {
      encoding: "utf-8",
    });
  const total = Number(
    (execFileSync("pdfinfo", [pdf], { encoding: "utf-8" }).match(/Pages:\s+(\d+)/) ?? [, "0"])[1],
  ) || 40;

  const printedIndex = new Map();
  for (let p = 1; p <= total; p++) {
    const t = pageText(p);
    const nums = t.split(/\s+/).filter((s) => /^\d{1,2}$/.test(s));
    const printed = nums.length ? Number(nums[nums.length - 1]) : null;
    if (printed !== null && !printedIndex.has(printed)) printedIndex.set(printed, { pdfPage: p, text: t });
  }

  let bad = 0;
  for (const c of CLAIMS) {
    const hit = printedIndex.get(c.printedPage);
    if (!hit) {
      console.log(`🔴 인쇄 ${c.printedPage}쪽을 못 찾았다 — ${c.what}`);
      bad++;
      continue;
    }
    const missing = c.must.filter((re) => !re.test(hit.text));
    if (missing.length) {
      console.log(`🔴 인쇄 ${c.printedPage}쪽(PDF p${hit.pdfPage}) — ${c.what}: ${missing.join(", ")} 없음`);
      bad++;
    } else {
      console.log(`✅ 인쇄 ${c.printedPage}쪽(PDF p${hit.pdfPage}) — ${c.what}`);
    }
  }
  console.log(bad === 0 ? "\n인용한 숫자와 쪽수가 전부 원문과 맞는다." : `\n🔴 어긋남 ${bad}건`);
  process.exit(bad === 0 ? 0 : 1);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
