#!/usr/bin/env node
/**
 * 가격지수 시계열 아카이브.
 *
 * `data/priceIndex.json`은 **매번 덮어쓴다.** 과거값을 런타임에서 읽을 수 있는 파일로 남긴다.
 *
 * 🔴 **열 날짜로 키를 잡는다. 커밋 날짜가 아니다.** (Kiwi 2026-08-18: 한 열이 석 달 얼어 있었는데
 *    커밋 날짜로 찍었으면 같은 값이 10주 연속 「새 관측」으로 그려질 뻔했다.) 값이 안 바뀐 주는 점이 없다.
 * 🔴 0 이하는 관측이 아니다 — 품절이면 API가 0을 준다. 들어오는 단계에서 버린다.
 *
 * Aussie(2026-10-30): 열은 Woolworths 하나, 이력은 첫 수집부터 쌓는다(git 백필 없음 — 그 전 AU 지수가 없다).
 *
 * Usage: node scripts/update_price_history.mjs           # dry-run
 *        node scripts/update_price_history.mjs --write   # 적재
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_PATH = join(ROOT, "data", "priceIndex.json");
const HISTORY_PATH = join(ROOT, "data", "priceHistory.json");

/** 지수의 열 이름 ↔ 그 열의 갱신일 필드. 열이 늘면 여기만 고친다. */
export const COLUMNS = [{ key: "woolworths", label: "woolworths", dateField: "woolworthsUpdated" }];

function emptyHistory() {
  return {
    _doc:
      "가격지수 시계열. 점 하나 = 그 열이 실제로 그 날짜에 관측된 값. " +
      "값이 안 바뀐 주는 점이 없다 — 열 날짜로 dedupe하기 때문이다. 생성: scripts/update_price_history.mjs",
    columns: Object.fromEntries(COLUMNS.map((c) => [c.label, []])),
  };
}

/** 스냅샷 하나에서 열별 관측을 뽑는다. 열 날짜가 없으면 그 열은 통째로 건너뛴다. */
export function observationsFrom(index) {
  const out = [];
  for (const col of COLUMNS) {
    const date = index[col.dateField];
    if (!date) continue;
    const items = {};
    for (const item of index.items ?? []) {
      const v = item[col.key];
      if (typeof v === "number" && v > 0) items[item.name] = v;
    }
    if (Object.keys(items).length) out.push({ label: col.label, date, items });
  }
  return out;
}

/** 같은 열·같은 날짜가 이미 있으면 덮어쓴다 — 같은 날 두 번 돌렸으면 나중 것이 맞다. */
export function merge(history, obs) {
  const list = history.columns[obs.label] ?? (history.columns[obs.label] = []);
  const existing = list.find((o) => o.date === obs.date);
  if (!existing) {
    list.push({ date: obs.date, items: obs.items });
    list.sort((a, b) => a.date.localeCompare(b.date));
    return "added";
  }
  if (JSON.stringify(existing.items) === JSON.stringify(obs.items)) return "unchanged";
  existing.items = obs.items;
  return "updated";
}

function main() {
  const write = process.argv.includes("--write");
  const history = existsSync(HISTORY_PATH) ? JSON.parse(readFileSync(HISTORY_PATH, "utf8")) : emptyHistory();
  for (const c of COLUMNS) history.columns[c.label] ??= [];

  const obs = observationsFrom(JSON.parse(readFileSync(INDEX_PATH, "utf8")));
  if (!obs.length) {
    console.error("❌ 지금 지수에 열 날짜가 하나도 없다 — 적재할 게 없다.");
    process.exit(1);
  }
  const tally = { added: 0, updated: 0, unchanged: 0 };
  for (const o of obs) tally[merge(history, o)]++;

  console.log(`적재 ${tally.added} / 갱신 ${tally.updated} / 이미있음 ${tally.unchanged}`);
  for (const c of COLUMNS) {
    const list = history.columns[c.label];
    const range = list.length ? `${list[0].date} ~ ${list[list.length - 1].date}` : "-";
    console.log(`  ${c.label.padEnd(11)} ${String(list.length).padStart(3)}점   ${range}`);
  }

  if (write) {
    history.generated = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
    writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2) + "\n");
    console.log(`\n✅ ${HISTORY_PATH} 저장`);
  } else {
    console.log("\nℹ️  dry-run — 파일 안 바꿈. 적용하려면 --write");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
