#!/usr/bin/env node
/**
 * 가격지수 시계열 아카이브.
 *
 * `data/priceIndex.json`은 **매번 덮어쓴다.** 지금까지 과거값은 git 커밋 안에만 있었고,
 * 그건 질의도 안 되고 rebase 한 번이면 사라진다. 런타임에서 읽을 수 있는 파일로 승격한다.
 *
 * 🔴 **열 날짜로 키를 잡는다. 커밋 날짜가 아니다.**
 *    실측(2026-08-18): 지수 커밋 16개 중 `paknsaveUpdated`가 **2026-05-16에 석 달 동안
 *    얼어 있었다.** 커밋 날짜로 점을 찍으면 같은 값이 10주 연속 "새로 관측된 값"으로
 *    그려진다 — 물가가 완벽히 안정된 것처럼 보이는 **거짓 그래프**가 된다.
 *    그래서 열마다 자기 `*Updated` 날짜로 dedupe한다. 값이 안 바뀐 주는 점이 안 찍힌다.
 *
 * 🔴 **열 날짜가 아예 없는 옛 스냅샷은 버린다.** 07-24 이전 커밋에는 `woolworthsUpdated`
 *    자체가 없다. 커밋 날짜로 채워 넣으면 "언제 잰 값인지 모르는 값"에 날짜를 지어내는
 *    것이다. 버린 개수는 리포트에 찍는다.
 *
 * Usage:
 *   node scripts/update_price_history.mjs                    # dry-run (현재 스냅샷만)
 *   node scripts/update_price_history.mjs --write            # 현재 스냅샷 적재
 *   node scripts/update_price_history.mjs --backfill --write # git 이력까지 백필
 *
 * ⚠️ `--backfill`은 **로컬에서만** 쓴다. CI의 actions/checkout은 기본이 얕은 클론이라
 *    이력이 없다. CI에서는 인자 없이 `--write`만 준다.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { execFileSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { islandArg, indexPath, historyPath } from "./_island.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// `--island south` → data/priceIndex.south.json → data/priceHistory.south.json. 생략 = 북섬(이전과 같다).
const ISLAND = islandArg();
const INDEX_PATH = indexPath(ROOT, ISLAND);
const HISTORY_PATH = historyPath(ROOT, ISLAND);

/** 지수의 열 이름 ↔ 그 열의 갱신일 필드. 열이 늘면 여기만 고친다. */
const COLUMNS = [
  { key: "countdown", label: "woolworths", dateField: "woolworthsUpdated" },
  { key: "paknsave", label: "paknsave", dateField: "paknsaveUpdated" },
  { key: "newworld", label: "newworld", dateField: "newworldUpdated" },
];

function emptyHistory() {
  return {
    _doc:
      "가격지수 시계열. 점 하나 = 그 열이 실제로 그 날짜에 관측된 값. " +
      "값이 안 바뀐 주는 점이 없다 — 열 날짜로 dedupe하기 때문이다. " +
      "생성: scripts/update_price_history.mjs",
    columns: Object.fromEntries(COLUMNS.map((c) => [c.label, []])),
  };
}

/** 스냅샷 하나에서 열별 관측을 뽑는다. 열 날짜가 없으면 그 열은 통째로 건너뛴다. */
function observationsFrom(index) {
  const out = [];
  for (const col of COLUMNS) {
    const date = index[col.dateField];
    if (!date) continue;
    const items = {};
    for (const item of index.items ?? []) {
      const v = item[col.key];
      // 0 이하는 관측이 아니다(품절이면 API가 0.0을 준다 — 2026-10-04 쌀).
      if (typeof v === "number" && v > 0) items[item.name] = v;
    }
    if (Object.keys(items).length) out.push({ label: col.label, date, items });
  }
  return out;
}

/**
 * 관측을 이력에 넣는다. 같은 열·같은 날짜가 이미 있으면 **덮어쓴다** —
 * 같은 날 두 번 돌렸으면 나중 것이 맞다.
 * @returns "added" | "updated" | "unchanged"
 */
function merge(history, obs) {
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

function gitSnapshots() {
  const rel = "data/priceIndex.json";
  const hashes = execFileSync("git", ["log", "--follow", "--format=%H", "--", rel], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  // 오래된 것부터 넣어야 같은 날짜가 겹칠 때 나중 커밋이 이긴다.
  return hashes.reverse().map((h) => {
    try {
      return { hash: h, index: JSON.parse(execFileSync("git", ["show", `${h}:${rel}`], { cwd: ROOT, encoding: "utf8" })) };
    } catch {
      return { hash: h, index: null };
    }
  });
}

function main() {
  const write = process.argv.includes("--write");
  const backfill = process.argv.includes("--backfill");
  // 남섬은 2026-10-28에 시작했다 — git 이력에 남섬 스냅샷이 없고, 북섬 이력을 섞으면 안 된다.
  if (backfill && ISLAND === "south") {
    console.error("❌ --backfill은 북섬 전용이다(남섬 이력은 첫 수집부터 쌓인다).");
    process.exit(1);
  }

  const history = existsSync(HISTORY_PATH)
    ? JSON.parse(readFileSync(HISTORY_PATH, "utf8"))
    : emptyHistory();
  for (const c of COLUMNS) history.columns[c.label] ??= [];

  const tally = { added: 0, updated: 0, unchanged: 0 };
  let skippedNoDate = 0;
  let unreadable = 0;

  if (backfill) {
    const snaps = gitSnapshots();
    console.log(`🥝 git 이력 스냅샷 ${snaps.length}개`);
    for (const s of snaps) {
      if (!s.index) { unreadable++; continue; }
      const obs = observationsFrom(s.index);
      if (!obs.length) skippedNoDate++;
      for (const o of obs) tally[merge(history, o)]++;
    }
  }

  // 현재 파일은 항상 넣는다 (백필을 했든 안 했든 지금 값이 가장 최신이다).
  const current = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const currentObs = observationsFrom(current);
  if (!currentObs.length) {
    console.error("❌ 지금 지수에 열 날짜가 하나도 없다 — 적재할 게 없다.");
    process.exit(1);
  }
  for (const o of currentObs) tally[merge(history, o)]++;

  console.log(
    `\n적재 ${tally.added} / 갱신 ${tally.updated} / 이미있음 ${tally.unchanged}` +
      (backfill ? ` / 날짜없어 버림 ${skippedNoDate} / 못읽음 ${unreadable}` : ""),
  );
  console.log("\n열별 관측 수 (점 하나 = 실제로 그 날 잰 값):");
  for (const c of COLUMNS) {
    const list = history.columns[c.label];
    const range = list.length ? `${list[0].date} ~ ${list[list.length - 1].date}` : "-";
    console.log(`  ${c.label.padEnd(11)} ${String(list.length).padStart(3)}점   ${range}`);
  }

  if (write) {
    history.generated = new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" });
    writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2) + "\n");
    console.log(`\n✅ ${HISTORY_PATH} 저장`);
  } else {
    console.log("\nℹ️  dry-run — 파일 안 바꿈. 적용하려면 --write");
  }
}

main();
