import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * 🔴 `docs/outreach-placements.md` 는 「게재 몇 곳」의 유일한 출처다
 *    (`scripts/check_outreach_body.mjs` 가 `## 게재 N곳` 만 읽는다).
 *
 *    그런데 같은 수를 **손으로 적은 사본이 두 벌 더** 있다: 맨 위 요약 줄과
 *    표 아래 「확인된 게재 N · 답만 받은 것 M」. 파일 스스로 "표의 ✔/○ 를 세서
 *    맞출 것"이라고 적어 두고도 **2026-09-07과 09-21에 두 번 낡았다**
 *    (09-21엔 실제 10·36인데 9·34라고 적혀 있었다).
 *
 *    사본을 없애는 게 맞지만 이 파일은 사람이 읽는 감사 기록이라 문장을 남긴다.
 *    대신 **세 자리가 서로 맞는지**를 여기서 강제한다.
 */
const DOC = "docs/outreach-placements.md";

describe("🔴 게재 명단 문서의 숫자가 표와 맞는다", () => {
  const doc = readFileSync(DOC, "utf-8");
  const rows = [...doc.matchAll(/^\|\s*(\d+)\s*\|.*\|\s*(✔|○)\s*\|$/gm)];
  const confirmed = rows.filter((m) => m[2] === "✔").length;
  const promised = rows.filter((m) => m[2] === "○").length;

  it("양성 대조 — 표를 실제로 읽었다", () => {
    expect(rows.length, "표 행을 하나도 못 읽었다 — 표 서식이 바뀌었을 가능성").toBeGreaterThan(40);
    expect(confirmed).toBeGreaterThan(0);
    expect(promised).toBeGreaterThan(0);
  });

  it("행 번호가 1부터 빠짐없이 이어진다", () => {
    const nums = rows.map((m) => Number(m[1]));
    expect(nums).toEqual(nums.map((_, i) => i + 1));
  });

  it("`## 게재 N곳` 이 표 행 수와 같다 — 본문 문구가 이 값을 쓴다", () => {
    const m = doc.match(/^##\s*게재\s*(\d+)곳/m);
    expect(m, "`## 게재 N곳` 제목을 못 찾았다 — 검사기도 여기를 읽는다").toBeTruthy();
    expect(Number(m![1]), "제목의 수가 표 행 수와 다르다").toBe(rows.length);
  });

  it("맨 위 요약이 표와 같다", () => {
    const m = doc.match(/게재 \*\*(\d+)곳\*\*\(발행 확인 \*\*(\d+)\*\*\)/);
    expect(m, "맨 위 요약 줄을 못 찾았다").toBeTruthy();
    expect(Number(m![1]), "요약의 게재 수가 표와 다르다").toBe(rows.length);
    expect(Number(m![2]), "요약의 발행 확인 수가 ✔ 개수와 다르다").toBe(confirmed);
  });

  it("표 아래 「확인된 게재 N · 답만 받은 것 M」이 ✔/○ 개수와 같다", () => {
    const m = doc.match(/\*\*확인된 게재 (\d+) · 답만 받은 것 (\d+)\.\*\*/);
    expect(m, "표 아래 요약 문장을 못 찾았다").toBeTruthy();
    expect(Number(m![1]), "✔ 개수와 다르다").toBe(confirmed);
    expect(Number(m![2]), "○ 개수와 다르다").toBe(promised);
  });
});
