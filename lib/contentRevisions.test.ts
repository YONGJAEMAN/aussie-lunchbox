import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { currentRevisions, problems, RECORD_PATH } from "./contentRevisions.mjs";
import { lastModified } from "./contentDates";

// 2026-09-28: 9월에 고친 글 23편이 contentUpdated를 안 올려, 구글에 「7월 이후 안 바뀜」으로 신고됐다.
// 이유와 한계는 lib/contentRevisions.mjs 머리 주석.
describe("🔴 본문을 고치면 수정일도 같이 바뀐다", () => {
  const recorded = JSON.parse(readFileSync(RECORD_PATH, "utf8"));
  const current = currentRevisions();

  it("기록이 비어 있지 않다 — 빈 기록은 모든 글을 공짜로 통과시킨다", () => {
    // Aussie는 글 10 + 가이드 8 = 18편이다(Kiwi는 20편 넘게).
    expect(Object.keys(current).length).toBeGreaterThanOrEqual(18);
    expect(Object.keys(recorded).length).toBe(Object.keys(current).length);
  });

  it("기록과 현재가 어긋나지 않는다", () => {
    const why: Record<string, string> = {
      stale: "본문이 바뀌었는데 contentUpdated가 그대로다 → 날짜를 올리고 `node scripts/record_content_revisions.mjs`",
      fake: "본문은 그대로인데 contentUpdated만 바뀌었다 → 되돌릴 것",
      backwards: "contentUpdated가 기록보다 과거로 갔다",
      rerecord: "본문·날짜를 같이 고쳤다 → `node scripts/record_content_revisions.mjs`",
      unrecorded: "새 글이다 → `node scripts/record_content_revisions.mjs`",
      missing: "기록에만 있다(지운 글) → `node scripts/record_content_revisions.mjs`",
    };
    const found = problems(recorded, current).map((p) => `${p.key}: ${why[p.kind]}`);
    expect(found).toEqual([]);
  });

  it("판정 규칙이 네 경우를 가른다 — 가드 자체의 양성·음성 대조", () => {
    const rec = { a: { hash: "h1", contentUpdated: "2026-09-01" } };
    expect(problems(rec, { a: { hash: "h1", contentUpdated: "2026-09-01" } })).toEqual([]);
    expect(problems(rec, { a: { hash: "h2", contentUpdated: "2026-09-01" } })[0].kind).toBe("stale");
    expect(problems(rec, { a: { hash: "h1", contentUpdated: "2026-09-28" } })[0].kind).toBe("fake");
    expect(problems(rec, { a: { hash: "h2", contentUpdated: "2026-08-01" } })[0].kind).toBe("backwards");
  });
});

describe("🔴 사이트맵과 JSON-LD가 같은 수정일을 말한다", () => {
  it("contentUpdated가 lastReviewed(월 1일)보다 늦으면 contentUpdated를 쓴다", () => {
    const d = lastModified({ date: "March 28, 2026", lastReviewed: "September 2026", contentUpdated: "2026-09-19" });
    expect(d.toISOString().slice(0, 10)).toBe("2026-09-19");
  });

  it("발행일보다 앞서지 않는다 — dateModified < datePublished는 schema 위반", () => {
    const d = lastModified({ date: "February 15, 2026", lastReviewed: "February 2026" });
    expect(d.getTime()).toBe(new Date("February 15, 2026").getTime());
  });

  it("두 페이지와 사이트맵이 모두 lastModified를 쓴다 — 따로 계산하면 다시 갈라진다", () => {
    for (const f of ["app/sitemap.ts", "app/[locale]/blog/[slug]/page.tsx", "app/[locale]/guides/[slug]/page.tsx"]) {
      const src = readFileSync(f, "utf8");
      expect(src, f).toContain('from "@/lib/contentDates"');
      expect(src, `${f}: lastReviewed를 직접 파싱하고 있다`).not.toMatch(/new Date\(`1 \$\{/);
    }
  });
});
