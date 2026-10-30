import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CUISINES } from "./types";
import type { Cuisine, MenuItem } from "./types";

/**
 * 요리 스타일 태그는 **표시 전용**이다. 플래너 필터로 쓰지 않는다.
 *
 * 🔴 2026-09-02 실측 — 94개를 요리별로 쪼갠 개수:
 *
 *      american 21 · kiwi 20 · british 10 · italian 7 · european 6
 *      chinese 5 · japanese 5 · mexican 5 · middle_eastern 5 · indian 4
 *      southeast_asian 2 · mediterranean 2 · pacific 1 · korean 1
 *
 *    플래너는 5일치를 뽑는다(`selectFiveMenus`). 한식(1개)으로 거르면 같은 도시락이
 *    월~금 반복되거나 `No menus match your criteria`가 뜬다. 게다가 이 필터는
 *    **기존 알레르기 필터와 곱해진다** — 한식 1개 + 견과류 제외면 0개다.
 *    그래서 태그는 배지로만 보여 주고 후보를 좁히는 데는 쓰지 않는다.
 *
 * 아래 "5일을 못 채우는 칸이 있다" 테스트는 그 판단의 근거를 박아 둔 것이다.
 * 메뉴가 충분히 늘어 이 테스트가 깨지면, 그때가 필터로 승격할지 다시 볼 때다.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES = ["en", "ko", "zh"] as const;

const MENUS = (
  JSON.parse(readFileSync(path.join(ROOT, "data", "menuData.json"), "utf8")) as {
    MENU_DATA: { en: MenuItem[] };
  }
).MENU_DATA.en;

const messagesFor = (locale: string): Record<string, string> =>
  JSON.parse(readFileSync(path.join(ROOT, "messages", `${locale}.json`), "utf8"));

const countByCuisine = (): Map<Cuisine, number> => {
  const m = new Map<Cuisine, number>();
  for (const menu of MENUS) {
    if (menu.cuisine) m.set(menu.cuisine, (m.get(menu.cuisine) ?? 0) + 1);
  }
  return m;
};

describe("요리 스타일 태그 데이터", () => {
  it("94개 전부에 태그가 있다 — 하나라도 빠지면 배지가 조용히 사라진다", () => {
    const untagged = MENUS.filter((m) => !m.cuisine).map((m) => m.name);
    expect(untagged, `태그 없는 메뉴: ${untagged.join(", ")}`).toEqual([]);
    expect(MENUS.length).toBe(94);
  });

  it("모든 태그가 CUISINES 안의 값이다", () => {
    const allowed = new Set<string>(CUISINES);
    const bad = MENUS.filter((m) => m.cuisine && !allowed.has(m.cuisine)).map(
      (m) => `${m.name}=${m.cuisine}`,
    );
    expect(bad, `CUISINES에 없는 값: ${bad.join(", ")}`).toEqual([]);
  });

  it("쓰이지 않는 태그가 없다 — 목록에만 있고 메뉴엔 없는 칸은 죽은 칸이다", () => {
    const used = countByCuisine();
    const dead = CUISINES.filter((c) => !used.has(c));
    expect(dead, `메뉴가 하나도 없는 태그: ${dead.join(", ")}`).toEqual([]);
  });
});

describe("요리 스타일 라벨 (3개 언어)", () => {
  it.each(LOCALES)("%s에 14개 라벨이 전부 있고 비어 있지 않다", (locale) => {
    const msg = messagesFor(locale);
    for (const c of CUISINES) {
      const key = `cuisine_${c}`;
      expect(msg[key], `${locale}.json에 ${key}가 없다`).toBeTruthy();
      expect(msg[key].trim().length).toBeGreaterThan(0);
    }
  });

  it.each(LOCALES)("%s 라벨끼리 겹치지 않는다 — 겹치면 배지가 구별을 못 한다", (locale) => {
    const msg = messagesFor(locale);
    const labels = CUISINES.map((c) => msg[`cuisine_${c}`]);
    expect(new Set(labels).size, `중복 라벨: ${labels.join(", ")}`).toBe(CUISINES.length);
  });

  it("언어마다 번역이 실제로 다르다 — ko/zh가 영어로 떨어지지 않았나", () => {
    // 🔴 폴백이 있는 필드는 고장이 화면에 안 드러난다. 값을 직접 본다.
    const en = messagesFor("en");
    for (const locale of ["ko", "zh"] as const) {
      const msg = messagesFor(locale);
      const same = CUISINES.filter((c) => msg[`cuisine_${c}`] === en[`cuisine_${c}`]);
      expect(same, `${locale}가 영어 그대로인 라벨: ${same.join(", ")}`).toEqual([]);
    }
  });
});

describe("표시 전용이라는 판단의 근거", () => {
  it("5일을 못 채우는 칸이 실제로 있다 (그래서 필터로 안 쓴다)", () => {
    const counts = countByCuisine();
    const thin = [...counts.entries()].filter(([, n]) => n < 5).map(([c, n]) => `${c}=${n}`);
    expect(
      thin.length,
      "모든 칸이 5개 이상이 됐다 — 필터로 승격할지 다시 볼 것 " +
        `(현재: ${[...counts.entries()].map(([c, n]) => `${c}=${n}`).join(", ")})`,
    ).toBeGreaterThan(0);
  });

  it("filterMenus가 cuisine을 보지 않는다", () => {
    // 필터로 승격하려면 위 "얇은 칸" 문제를 먼저 풀어야 한다. 조용히 배선되는 걸 막는다.
    const src = readFileSync(path.join(ROOT, "lib", "planGenerator.ts"), "utf8");
    const start = src.indexOf("function filterMenus");
    expect(start, "filterMenus를 못 찾았다").toBeGreaterThan(-1);
    const body = src.slice(start, src.indexOf("\n}", start));
    expect(body, "filterMenus가 cuisine을 보고 있다 — 표시 전용 약속이 깨졌다").not.toContain(
      "cuisine",
    );
  });
});

describe("배지가 실제로 화면에 붙는다", () => {
  it("planGenerator가 cuisine을 PlanItem으로 넘긴다", () => {
    const src = readFileSync(path.join(ROOT, "lib", "planGenerator.ts"), "utf8");
    expect(src).toMatch(/menu\.cuisine \? \{ cuisine: menu\.cuisine \}/);
  });

  it("PlannerClient가 배지를 렌더한다", () => {
    // 🔴 `toContain("cuisine")` 두 개로 쓰면 블록을 지워도 통과한다(타입·import에도
    //    그 글자가 있다). 한 블록 안에서 조건 → 라벨까지 이어지는지 본다.
    const src = readFileSync(path.join(ROOT, "components", "PlannerClient.tsx"), "utf8");
    expect(src, "일별 카드에 요리 스타일 배지 블록이 없다").toMatch(
      /item\.cuisine && \([\s\S]{0,240}t\(`cuisine_\$\{item\.cuisine\}`\)/,
    );
  });
});
