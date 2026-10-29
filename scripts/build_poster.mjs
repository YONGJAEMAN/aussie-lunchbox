#!/usr/bin/env node
/**
 * 포스터 HTML → PDF(A4 1쪽) + PNG(200dpi)를 뽑고, 뽑은 것을 검사한다.
 *
 *   node scripts/build_poster.mjs ~/Downloads/_Kiwi_포스터/kiwi_school_poster_A4.html
 *
 * 🔴 왜 있나 (2026-09-22) — 포스터를 고친 뒤 재출력을 **손으로** 했다(⌘P).
 *    그 방법이 사람 머리에만 있으면 다음에 또 낡았을 때 재현이 안 되고,
 *    재현이 안 되면 **양성 대조를 못 세운다**. 09-16에 명단 뽑는 스크립트가
 *    저장소 밖에 있어 두 세션 전 임시폴더에서 겨우 건진 것과 같은 자리다.
 *
 * 전제: 산출물은 HTML과 같은 폴더의
 *   Kiwi_Lunchbox_poster_A4.pdf · Kiwi_Lunchbox_poster_digital.png
 * 🔴 덮어쓰기 전에 `_backup_<날짜>/`로 사본을 뜬다.
 */
import { existsSync, mkdirSync, copyFileSync, renameSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";

const src = process.argv[2];
if (!src) { console.error("사용: node scripts/build_poster.mjs <포스터.html>"); process.exit(2); }
if (!existsSync(src)) { console.error(`🔴 포스터 HTML이 없다: ${src}`); process.exit(2); }

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
/** 🔴 없는 도구를 「실패」로 뭉개지 않는다 — 무엇이 없는지 말하고 exit 2. */
for (const [p, what, how] of [
  [CHROME, "Google Chrome", "Chrome을 설치할 것"],
  ["pdftoppm", "pdftoppm (poppler)", "brew install poppler"],
  ["pdftotext", "pdftotext (poppler)", "brew install poppler"],
]) {
  const ok = p.startsWith("/") ? existsSync(p)
    : (() => { try { execFileSync("/usr/bin/which", [p], { stdio: "ignore" }); return true; } catch { return false; } })();
  if (!ok) { console.error(`🔴 ${what}이 없다 — ${how}`); process.exit(2); }
}

const dir = dirname(src);
// 킨디 포스터(`data-poster="kindy"`)는 이름을 갈라 학교 포스터와 섞여 첨부되지 않게 한다.
const kind = /data-poster="kindy"/.test(readFileSync(src, "utf-8")) ? "kindy_" : "";
const pdf = join(dir, `Kiwi_Lunchbox_${kind}poster_A4.pdf`);
const png = join(dir, `Kiwi_Lunchbox_${kind}poster_digital.png`);
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "").slice(4);
const backup = join(dir, `_backup_${stamp}`);

/* 1) 사본 — 되돌릴 수 있게 */
mkdirSync(backup, { recursive: true });
for (const f of [pdf, png]) {
  if (existsSync(f)) {
    const to = join(backup, f.split("/").pop());
    if (!existsSync(to)) copyFileSync(f, to);
  }
}
console.log(`사본 ${backup}`);

/* 2) PDF — @page{size:A4;margin:0}와 @media print가 파일 안에 있다 */
const tmpPdf = `${pdf}.new`;
execFileSync(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox",
  "--virtual-time-budget=8000", "--run-all-compositor-stages-before-draw",
  "--no-pdf-header-footer", `--print-to-pdf=${tmpPdf}`, `file://${src}`,
], { stdio: "ignore" });

/* 3) 🔴 뽑은 것을 **읽어서** 확인한 뒤에 제자리로 옮긴다 */
const bytes = readFileSync(tmpPdf);
const box = /\/MediaBox\s*\[([^\]]+)\]/.exec(bytes.toString("latin1"))?.[1] ?? "";
const pages = (bytes.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
const [, , w, h] = box.split(/\s+/).map(Number);
const A4 = Math.abs(w - 595) < 2 && Math.abs(h - 842) < 2;
if (!A4 || pages !== 1) {
  console.error(`🔴 PDF가 A4 1쪽이 아니다: MediaBox[${box}] 쪽수 ${pages}`);
  process.exit(1);
}
renameSync(tmpPdf, pdf);
console.log(`PDF  ${pdf}  A4 ${w}×${h}pt · ${pages}쪽`);

/* 4) PNG — 잘린 뷰포트 스크린샷이 아니라 PDF를 200dpi로 래스터화한다 */
execFileSync("pdftoppm", ["-png", "-r", "200", "-singlefile", pdf, png.replace(/\.png$/, "")]);
console.log(`PNG  ${png}`);

/* 5) 🔴 뽑았다 ≠ 맞다 — 수치 검사기를 이어서 돌린다 */
console.log("");
execFileSync("node", [join(import.meta.dirname, "check_poster.mjs"), src], { stdio: "inherit" });
console.log("\n🔴 QR은 이 스크립트가 못 읽는다 — 디코더가 없다. 레이아웃을 바꿨다면 손으로 확인할 것.");
