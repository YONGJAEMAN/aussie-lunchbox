/**
 * 글·가이드 본문이 바뀌면 `contentUpdated`도 같이 바뀌게 한다 — 기록 파일 `data/contentRevisions.json`과 대조.
 *
 * 🔴 왜 있나 (2026-09-28): 9월에 글 17편·가이드 6편을 고치면서 `contentUpdated`를 하나도 안 올렸다.
 *    사이트맵은 구글에 「7월 이후 안 바뀜」이라 신고했고, GSC에서 색인을 거부당한 글 9편의
 *    마지막 크롤이 전부 4~7월이었다 — 고친 판본을 구글이 한 번도 안 읽었다.
 *    반대로 **날짜만 올리는 것**도 막는다. 안 바뀐 글의 lastmod를 올리면 구글이 그 신호를 안 믿게 된다.
 *
 * ⚠️ 못 보는 것: 본문 문장을 `lib/*`의 함수가 만드는 경우(예: 가격 수치 절). 그 함수를 고쳐도 여기 블록은
 *    안 바뀐다. 주간 데이터로 숫자가 움직이는 것은 「고친 것」이 아니라서 일부러 안 본다.
 *
 * 이 모듈은 가드 테스트와 기록 스크립트(scripts/record_content_revisions.mjs)가 같이 쓴다.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

export const SOURCES = ["content/posts.ts", "content/guides.ts"];
export const RECORD_PATH = "data/contentRevisions.json";

/** 날짜·읽기 시간 줄은 해시에서 뺀다 — 날짜 자체가 바뀌었다고 「본문이 바뀌었다」고 치면 안 된다. */
const IGNORED = /^\s*(contentUpdated|lastReviewed|readTime):/;

/** 파일에서 `  "slug": {` 블록을 잘라 slug → { hash, contentUpdated }. 다음 블록 시작까지가 한 블록이다. */
export function revisionsOf(path, root = ".") {
  const src = readFileSync(`${root}/${path}`, "utf8");
  const starts = [...src.matchAll(/\n {2}"([a-z0-9-]+)":\s*\{/g)];
  const out = {};
  starts.forEach((m, i) => {
    const block = src.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : src.length);
    const updated = block.match(/\n {4}contentUpdated: "([^"]+)",/);
    if (!updated) return; // POSTS/GUIDES 밖의 같은 모양 객체는 건너뛴다
    const body = block
      .split("\n")
      .filter((l) => !IGNORED.test(l))
      .join("\n");
    out[`${path}#${m[1]}`] = {
      hash: createHash("sha256").update(body).digest("hex").slice(0, 16),
      contentUpdated: updated[1],
    };
  });
  return out;
}

export function currentRevisions(root = ".") {
  return Object.assign({}, ...SOURCES.map((p) => revisionsOf(p, root)));
}

/**
 * 기록과 현재를 비교해 문제를 돌려준다. 빈 배열이면 통과.
 *   stale    본문이 바뀌었는데 contentUpdated가 그대로다
 *   fake     본문은 그대로인데 contentUpdated만 바뀌었다
 *   unrecorded / missing / backwards / rerecord
 */
export function problems(recorded, current) {
  const out = [];
  for (const [key, cur] of Object.entries(current)) {
    const rec = recorded[key];
    if (!rec) { out.push({ key, kind: "unrecorded" }); continue; }
    const bodyChanged = rec.hash !== cur.hash;
    const dateChanged = rec.contentUpdated !== cur.contentUpdated;
    if (bodyChanged && !dateChanged) out.push({ key, kind: "stale" });
    else if (!bodyChanged && dateChanged) out.push({ key, kind: "fake" });
    else if (dateChanged && cur.contentUpdated < rec.contentUpdated) out.push({ key, kind: "backwards" });
    else if (bodyChanged && dateChanged) out.push({ key, kind: "rerecord" });
  }
  for (const key of Object.keys(recorded)) if (!current[key]) out.push({ key, kind: "missing" });
  return out;
}
