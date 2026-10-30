import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { searchAll, searchableCount, tokenize, normalize } from "@/lib/search";
import { getMenuData, getSnackData } from "@/data/menuDataLoader";
import { BLOG_CARDS } from "@/content/posts";
import { GUIDE_CARDS } from "@/content/guides";

/**
 * 검색은 "안 나온다"가 조용한 고장이라 특히 위험하다. 실패해도 에러가 없고
 * 화면은 "결과 없음"으로 멀쩡해 보인다. 그래서 **양성 대조부터 깐다** —
 * 데이터에 확실히 있는 것을 못 찾으면 나머지 검사는 전부 알리바이다.
 */

const menus = getMenuData("en");
const snacks = Object.values(getSnackData()).flat();

describe("사이트 내 검색", () => {
  it("양성 대조 — 데이터에 있는 메뉴 이름을 실제로 찾는다", () => {
    expect(menus.length, "메뉴가 0개면 이 파일의 모든 검사가 무의미하다").toBeGreaterThan(50);
    for (const m of menus.slice(0, 20)) {
      const r = searchAll(m.name, "en");
      expect(r.menus.map((x) => x.name), `"${m.name}"을 못 찾았다`).toContain(m.name);
    }
  });

  it("양성 대조 — 모든 글 제목이 검색된다", () => {
    for (const c of [...BLOG_CARDS, ...GUIDE_CARDS]) {
      const r = searchAll(c.title, "en");
      expect(r.articles.map((a) => a.title), `"${c.title}"을 못 찾았다`).toContain(c.title);
    }
  });

  it("양성 대조 — 스낵도 검색된다", () => {
    expect(snacks.length).toBeGreaterThan(20);
    const s = snacks[0];
    expect(searchAll(s.name, "en").snacks.map((x) => x.name)).toContain(s.name);
  });

  it("재료로도 찾는다 — 이름에 없는 재료여야 의미가 있다", () => {
    const target = menus.find(
      (m) =>
        m.ingredients.length > 0 &&
        !normalize(m.name).includes(normalize(m.ingredients[0].split(" ")[0])),
    );
    expect(target, "이름에 없는 재료를 가진 메뉴가 하나도 없다 — 검사 불가").toBeTruthy();
    const word = target!.ingredients[0].split(" ")[0];
    const hits = searchAll(word, "en").menus.map((m) => m.name);
    expect(hits, `재료 "${word}"로 "${target!.name}"이 안 나온다`).toContain(target!.name);
  });

  it("빈 검색어는 아무것도 돌려주지 않는다 (전부 반환이 아니다)", () => {
    for (const q of ["", "   ", "\t"]) {
      const r = searchAll(q, "en");
      expect(r.total, `"${q}"가 결과를 냈다`).toBe(0);
    }
  });

  it("모든 토큰이 들어 있어야 맞는 것으로 본다 (AND)", () => {
    const wide = searchAll("cheese", "en").total;
    const narrow = searchAll("cheese sandwich", "en").total;
    expect(wide).toBeGreaterThan(0);
    expect(narrow).toBeLessThanOrEqual(wide);
  });

  it("대소문자·여분 공백을 무시한다", () => {
    const a = searchAll("Cheese", "en").total;
    const b = searchAll("  cHeEsE  ", "en").total;
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(0);
  });

  it("같은 검색어는 항상 같은 순서를 준다 (동점 시 이름순으로 확정)", () => {
    const once = searchAll("cheese", "en");
    const twice = searchAll("cheese", "en");
    expect(once.menus.map((m) => m.name)).toEqual(twice.menus.map((m) => m.name));
    const names = once.menus.map((m) => m.name);
    expect(new Set(names).size, "같은 메뉴가 두 번 나왔다").toBe(names.length);
  });

  it("이름이 정확히 맞는 항목이 재료로만 맞은 항목보다 위에 온다", () => {
    const m = menus.find((x) => searchAll(x.name, "en").menus.length > 1);
    if (!m) return; // 항상 단독 결과면 검사할 게 없다
    expect(searchAll(m.name, "en").menus[0].name).toBe(m.name);
  });

  it("결과 링크가 실제 라우트를 가리킨다", () => {
    const r = searchAll("lunch", "en");
    for (const a of r.articles) {
      expect(a.href).toMatch(/^\/en\/(blog|guides)\/[a-z0-9-]+$/);
    }
    for (const m of r.menus) expect(m.href).toBe("/en/planner");
  });

  it("tokenize가 빈 토큰을 만들지 않는다", () => {
    expect(tokenize("  a   b  ")).toEqual(["a", "b"]);
    expect(tokenize("   ")).toEqual([]);
  });

  it("검색 대상 개수를 손으로 적지 않는다", () => {
    expect(searchableCount("en")).toBe(
      menus.length + snacks.length + BLOG_CARDS.length + GUIDE_CARDS.length,
    );
  });

  it("검색 페이지는 noindex다 — 쿼리마다 얇은 페이지가 색인되면 안 된다", () => {
    const src = readFileSync("app/[locale]/search/page.tsx", "utf8");
    expect(src, "noindex가 빠졌다").toContain("noindex: true");
  });

  it("검색 폼이 JS 없이 동작한다 — method=get 이어야 한다", () => {
    const src = readFileSync("app/[locale]/search/page.tsx", "utf8");
    expect(src).toContain('method="get"');
    expect(src).toContain('name="q"');
    expect(src, "클라이언트 컴포넌트로 만들면 SSR이 꺼진다").not.toContain('"use client"');
  });
});
