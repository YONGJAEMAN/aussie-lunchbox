#!/usr/bin/env node
/**
 * 글·가이드 본문을 고친 뒤 기록을 갱신한다. 순서:
 *   1. 본문을 고친다
 *   2. 그 글의 `contentUpdated`를 오늘로 올린다 (정정이면 `lastReviewed`도 이번 달로)
 *   3. node scripts/record_content_revisions.mjs
 *
 * 날짜를 안 올렸거나(stale) 본문 없이 날짜만 올렸으면(fake) 기록하지 않고 멈춘다.
 * 이유는 lib/contentRevisions.mjs 머리 주석.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { currentRevisions, problems, RECORD_PATH } from "../lib/contentRevisions.mjs";

const current = currentRevisions();
const recorded = existsSync(RECORD_PATH) ? JSON.parse(readFileSync(RECORD_PATH, "utf8")) : {};

// 같은 날 두 번 고치면 날짜를 더 올릴 수 없다 — 수정일이 오늘(NZ)이면 stale로 막지 않는다(09-28 실제로 막혔다).
const todayNZ = new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" });
const blocking = problems(recorded, current)
  .filter((p) => !(p.kind === "stale" && current[p.key].contentUpdated === todayNZ))
  .filter((p) => ["stale", "fake", "backwards"].includes(p.kind));
if (blocking.length) {
  const why = {
    stale: "본문이 바뀌었는데 contentUpdated가 그대로다 — 날짜를 올린 뒤 다시 돌릴 것",
    fake: "본문은 그대로인데 contentUpdated만 바뀌었다 — 되돌릴 것",
    backwards: "contentUpdated가 기록보다 과거로 갔다",
  };
  for (const p of blocking) console.error(`❌ ${p.key}: ${why[p.kind]}`);
  process.exit(1);
}

const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(RECORD_PATH, JSON.stringify(sorted, null, 2) + "\n");
console.log(`✅ ${Object.keys(sorted).length}편 기록 — ${RECORD_PATH}`);
