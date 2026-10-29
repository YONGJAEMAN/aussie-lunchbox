import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderBody } from "@/lib/markdown";
import { POSTS } from "@/content/posts";
import { GUIDES } from "@/content/guides";

/**
 * 🔴 2026-08-17에 실제로 라이브였던 고장을 지키는 가드다.
 * 본문의 불릿이 `<ul>` 없이 `<li>`로만 나가고 있었다 — 유효하지 않은 HTML이고,
 * 스크린리더가 "목록, 항목 N개"를 읽지 못한다. Lighthouse 접근성 `listitem` 실패.
 *
 * 테스트가 있다고 옳은 게 아니라는 걸 이 저장소에서 이미 겪었으므로,
 * 규칙을 여기서 다시 구현하지 않는다. **원문의 `- ` 줄 수**와 렌더된 `<li>` 수를 맞춘다 —
 * 이건 그룹핑 규칙과 독립적인 근거다.
 */

function html(body: string): string {
  return renderToStaticMarkup(
    React.createElement(React.Fragment, null, ...renderBody(body)),
  );
}

/** `<ul>` 밖에 있는 `<li>` 개수. 0이 아니면 고장이다. */
function orphanListItems(markup: string): number {
  let depth = 0;
  let orphans = 0;
  for (const tag of markup.match(/<\/?(?:ul|li)\b[^>]*>/g) ?? []) {
    if (tag.startsWith("</ul")) depth = Math.max(0, depth - 1);
    else if (tag.startsWith("<ul")) depth++;
    else if (tag.startsWith("<li") && depth === 0) orphans++;
  }
  return orphans;
}

const BODIES: [string, string][] = [
  ...Object.entries(POSTS).map(([slug, p]) => [`blog/${slug}`, p.body] as [string, string]),
  ...Object.entries(GUIDES).map(([slug, g]) => [`guides/${slug}`, g.body] as [string, string]),
];

describe("본문 렌더러 — 목록 구조", () => {
  it("글이 실제로 있다 (양성 대조 — 목록이 0개면 아래 검사가 전부 무의미하다)", () => {
    expect(BODIES.length).toBeGreaterThan(15);
    const totalBullets = BODIES.reduce(
      (n, [, body]) => n + body.split("\n").filter((l) => l.startsWith("- ")).length,
      0,
    );
    expect(totalBullets).toBeGreaterThan(300);
  });

  it.each(BODIES)("%s — `<ul>` 밖의 `<li>`가 없다", (_slug, body) => {
    expect(orphanListItems(html(body))).toBe(0);
  });

  it("렌더된 `<li>` 수가 원문의 `- ` 줄 수와 같다 (묶다가 흘리지 않았다)", () => {
    for (const [slug, body] of BODIES) {
      const source = body.split("\n").filter((l) => l.startsWith("- ")).length;
      const rendered = (html(body).match(/<li\b/g) ?? []).length;
      expect(rendered, slug).toBe(source);
    }
  });

  it("연속한 불릿만 한 목록으로 묶는다 — 문단이 끼면 목록이 갈린다", () => {
    const one = html("- a\n- b\n- c");
    expect((one.match(/<ul\b/g) ?? []).length).toBe(1);
    expect((one.match(/<li\b/g) ?? []).length).toBe(3);

    const split = html("- a\n- b\n\nsome paragraph\n\n- c");
    expect((split.match(/<ul\b/g) ?? []).length).toBe(2);
    expect(orphanListItems(split)).toBe(0);
  });

  it("불릿이 표 바로 앞뒤에 붙어도 목록이 표 안으로 새지 않는다", () => {
    const markup = html("- before\n| A | B |\n| --- | --- |\n| 1 | 2 |\n- after");
    expect(orphanListItems(markup)).toBe(0);
    expect((markup.match(/<ul\b/g) ?? []).length).toBe(2);
    expect(markup.indexOf("<table")).toBeGreaterThan(markup.indexOf("before"));
  });

  it("고아 `<li>` 탐지기 자체가 동작한다 (돌연변이 확인)", () => {
    expect(orphanListItems("<li>x</li>")).toBe(1);
    expect(orphanListItems("<ul><li>x</li></ul>")).toBe(0);
    expect(orphanListItems("<ul><li>x</li></ul><li>y</li>")).toBe(1);
  });
});

/**
 * 🔴 2026-08-23: `*기울임*`을 렌더러가 몰라서 **별표가 화면에 그대로 나가고 있었다.**
 *
 * 영양 가이드의 NRV 표를 고치다 렌더 결과를 실제로 읽어 보고서야 발견했다 —
 * `*none set*`이 별표째 나왔다. 새 글 문제가 아니었다: 기존 본문에도
 * `*balanced sounds expensive*` 같은 곳이 71군데 있었고 425개 테스트가 전부 통과 중이었다.
 *
 * 규칙: **렌더된 텍스트에 별표가 남아 있으면 렌더러가 모르는 문법이 샌 것이다.**
 * 특정 문법을 열거하지 않는다 — 다음번에 다른 문법이 새도 여기서 걸리게.
 */
describe("🔴 렌더러가 모르는 마크다운이 화면으로 새지 않는다", () => {
  /**
   * 화면 텍스트. 🔴 **블록 태그를 줄바꿈으로 바꾼 뒤에** 태그를 걷어낸다 —
   *    그냥 걷어내면 `<p>&gt;</p><p>What`이 `>What`이 되어 "줄 첫머리의 `>`" 검사가
   *    통과해 버린다. 로컬은 초록인데 라이브에서 `>`가 보이던 이유가 정확히 이거였다.
   */
  const visibleText = (body: string) =>
    html(body)
      .replace(/<\/(p|h[1-6]|li|tr|td|th|blockquote|div)>/g, "\n")
      .replace(/<[^>]+>/g, "")
      // 🔴 그리고 **엔티티를 되돌린다.** 새는 `>`는 마크업에서 `&gt;`로 나오므로
      //    엔티티를 남겨 두면 "화면에 `>`가 있나" 검사가 통과해 버린다.
      //    라이브에서는 보이는데 로컬은 초록이던 두 번째 이유가 이거였다.
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&amp;/g, "&");

  it("양성 대조 — 글을 실제로 렌더하고 있다", () => {
    expect(BODIES.length).toBeGreaterThan(20);
    expect(visibleText(BODIES[0][1]).length).toBeGreaterThan(500);
  });

  it("기울임·굵게가 태그로 나온다", () => {
    expect(html("a *b* c")).toContain("<em>b</em>");
    expect(html("a **b** c")).toContain("<strong>b</strong>");
    // 🔴 굵게가 기울임보다 먼저여야 한다 — 아니면 `**a**`가 `*`+`*a*`+`*`로 쪼개진다.
    expect(html("a **b** c")).not.toContain("<em>");
  });

  it("굵게 안의 기울임·링크 안의 기울임이 살아난다", () => {
    // 실제로 본문에 있던 두 형태다.
    expect(html("**Batch cooking is about *when* you cook.**")).toContain("<em>when</em>");
    expect(html("see the [*Food safety at home* booklet](https://example.com)")).toContain("<em>Food safety at home</em>");
    expect(html("### 1. Egg Sandwich — **$1.55**")).toContain("<strong>$1.55</strong>");
  });

  it("문단은 빈 줄에서만 끊긴다 (하드랩은 한 문단이다)", () => {
    const m = html("first half of a sentence\nsecond half of it.\n\nnext paragraph.");
    expect((m.match(/<p\b/g) ?? []).length, `문단 수 → ${m}`).toBe(2);
    expect(m).toContain("first half of a sentence second half of it.");
    // 줄을 걸친 굵게도 한 문단 안에서 매칭된다.
    expect(html("**bold across\nthe line break**")).toContain("<strong>");
  });

  it("인용 블록이 blockquote로 나온다", () => {
    const m = html("intro.\n\n> quoted line\n> second line\n\nafter.");
    expect(m).toContain("<blockquote");
    expect(m).toContain("quoted line second line");
    expect(m).not.toContain("&gt; quoted");
  });

  /**
   * 🔴 특정 문법을 열거하지 않는다. `*기울임*`을 고친 날 같은 자리에서 `> 인용`도
   *    새고 있었다(14편 58줄) — 열거식 가드였다면 두 번째는 못 잡았다.
   *    **원문에만 있어야 할 기호가 화면 텍스트에 남으면 실패**로 건다.
   */
  const LEAKS: { name: string; find: (t: string) => number }[] = [
    { name: "별표", find: (t) => t.indexOf("*") },
    { name: "인용 부호", find: (t) => t.search(/(^|\n)\s*>\s/) },
    { name: "제목 우물정", find: (t) => t.search(/(^|\n)#{1,4}\s/) },
  ];

  it("어떤 글의 화면 텍스트에도 마크다운 기호가 남지 않는다", () => {
    const bad: string[] = [];
    for (const [name, body] of BODIES) {
      const t = visibleText(body);
      for (const leak of LEAKS) {
        const i = leak.find(t);
        if (i >= 0) bad.push(`${name} [${leak.name}]: …${t.slice(Math.max(0, i - 40), i + 60)}…`);
      }
    }
    expect(bad, `마크다운이 화면에 그대로 나간다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });
});
