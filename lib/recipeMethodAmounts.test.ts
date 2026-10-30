import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { RECIPE_METHOD_AMOUNTS, RECIPES_WITH_METHOD_AMOUNTS, methodAmountFor } from "./recipeMethodAmounts";
import type { MenuItem } from "./types";

/**
 * 🔴 옮겨 적은 값이 조리법 본문과 맞는지 **본문으로** 대조한다.
 *    자동 추출이 7쌍 중 2쌍을 엉뚱한 재료에 붙였던 것이 이 가드가 있는 이유다.
 */
const MENUS = (
  JSON.parse(readFileSync(new URL("../data/menuData.json", import.meta.url), "utf-8")) as {
    MENU_DATA: { en: MenuItem[] };
  }
).MENU_DATA.en;
const byName = new Map(MENUS.map((m) => [m.name, m]));

/** 재료 이름에서 본문에서 찾을 낱말들. "Desiccated Coconut"은 본문에 "coconut"으로 나온다. */
const wordsOf = (ing: string) =>
  ing.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3);

describe("조리법 투입량 옮겨 적기", () => {
  it("모든 레시피 이름이 실재한다", () => {
    for (const name of Object.keys(RECIPE_METHOD_AMOUNTS)) {
      expect(byName.has(name), `"${name}"이라는 레시피가 없다`).toBe(true);
    }
  });

  it("모든 재료 키가 그 레시피의 재료 목록에 있다", () => {
    for (const [name, amounts] of Object.entries(RECIPE_METHOD_AMOUNTS)) {
      const menu = byName.get(name)!;
      for (const ing of Object.keys(amounts)) {
        expect(menu.ingredients, `${name}: ${ing}`).toContain(ing);
      }
    }
  });

  it("적은 값이 조리법 본문에 글자 그대로 있다", () => {
    let checked = 0;
    for (const [name, amounts] of Object.entries(RECIPE_METHOD_AMOUNTS)) {
      const text = byName.get(name)!.instructions ?? "";
      for (const [ing, amount] of Object.entries(amounts)) {
        checked++;
        expect(text, `${name} / ${ing}: "${amount}"가 본문에 없다`).toContain(amount);
      }
    }
    // 🔴 양성 대조 — 0쌍을 검사하고 통과하는 알리바이를 막는다.
    expect(checked, "검사한 짝이 없다").toBeGreaterThan(40);
  });

  it("그 값이 가장 가까이 붙은 재료가 맞다 — 오배치를 잡는 검사", () => {
    // 🔴 처음엔 「±60자 안에 재료 이름이 있으면 통과」로 짰다. 그런데
    //    "rub 50g butter into 2 cups self-raising flour"에서는 Butter와 Flour를
    //    **서로 바꿔 적어도 둘 다 통과**했다(2026-09-10 돌연변이로 확인) —
    //    두 재료가 60자 안에 같이 있기 때문이다. 자동 추출이 저지른 바로 그 오류다.
    //
    //    그래서 규칙을 바꿨다: 그 분량 **뒤에 가장 먼저 나오는** 재료가 임자다.
    //    "1 cup each of rolled oats, flour, coconut and sugar"처럼 `each`가 붙어
    //    여러 재료를 한꺼번에 말하는 경우만 예외로 둔다.
    const misplaced: string[] = [];
    for (const [name, amounts] of Object.entries(RECIPE_METHOD_AMOUNTS)) {
      const menu = byName.get(name)!;
      const text = (menu.instructions ?? "").toLowerCase();
      /**
       * 위치 pos 뒤에서 이 레시피의 재료가 처음 언급되는 지점의 **후보 전부**.
       *
       * 🔴 동률을 하나로 좁히면 안 된다 — "½ cup coconut"의 `coconut`은
       *    `Coconut Oil`과 `Desiccated Coconut` 둘 다에 걸린다. 본문이 그 둘을
       *    구별하지 않으므로 가드도 구별하는 척하면 안 된다.
       */
      const firstIngredientsAfter = (pos: number) => {
        let bestAt = Infinity;
        let names: string[] = [];
        for (const ing of menu.ingredients) {
          for (const w of wordsOf(ing)) {
            const at = text.indexOf(w, pos);
            if (at === -1) continue;
            if (at < bestAt) { bestAt = at; names = [ing]; }
            else if (at === bestAt && !names.includes(ing)) names.push(ing);
          }
        }
        return names;
      };
      for (const [ing, amount] of Object.entries(amounts)) {
        const words = wordsOf(ing);
        let ok = false;
        let from = 0;
        for (;;) {
          const at = text.indexOf(amount.toLowerCase(), from);
          if (at === -1) break;
          const end = at + amount.length;
          // "1 cup each of A, B, C and D" — 한 분량이 여러 재료에 걸린다
          if (/^\s*each\b/.test(text.slice(end, end + 8))) {
            if (words.some((w) => text.slice(end, end + 90).includes(w))) { ok = true; break; }
          }
          if (firstIngredientsAfter(end).includes(ing)) { ok = true; break; }
          // "2 potatoes" / "3 eggs" — 재료 이름이 분량 표현 자체에 들어 있다
          if (words.some((w) => amount.toLowerCase().includes(w))) { ok = true; break; }
          from = at + 1;
        }
        if (!ok) misplaced.push(`${name} / ${ing} / "${amount}"`);
      }
    }
    expect(misplaced).toEqual([]);
  });

  it("분량을 말하지 않는 레시피에는 아무것도 적혀 있지 않다", () => {
    // 🔴 94개 중 12개다. 나머지에 그럴듯한 값을 채우면 그게 날조다.
    expect(RECIPES_WITH_METHOD_AMOUNTS).toBe(12);
    expect(methodAmountFor("Ham & Cheese Croissant", "Ham")).toBeUndefined();
    // 같은 레시피 안에서도 본문이 말하지 않는 재료는 비어 있다
    expect(methodAmountFor("Tamagoyaki (Rolled Omelette)", "Egg")).toBe("3 eggs");
    expect(methodAmountFor("Tamagoyaki (Rolled Omelette)", "Oil")).toBeUndefined();
    expect(methodAmountFor("Cheesymite Scrolls", "Cheese")).toBeUndefined();
  });
});

describe("화면이 조리법 투입량을 실제로 보여준다", () => {
  const src = readFileSync(new URL("../components/PlannerClient.tsx", import.meta.url), "utf-8");

  /**
   * ⚠️ 이건 **소스 문자열 검사**다. 값이 실제로 화면에 그려지는지는 못 본다 —
   *    이 프로젝트에는 DOM 테스트 환경이 없고 vitest가 `.ts`만 수집한다.
   *    처음엔 「두 문자열이 있으면 통과」로 짰는데, `{false && methodAmount && (`로
   *    바꿔도 통과했다(2026-09-10 돌연변이). 그래서 **조건식을 통째로** 고정한다.
   *    이걸로 잡는 것: 렌더를 죽이거나 조건을 갈아 끼우는 변경.
   *    못 잡는 것: 부모 블록이 통째로 사라지는 변경.
   */
  it("레시피 창이 methodAmountFor를 쓰고, 조건을 죽이지 않는다", () => {
    expect(src, "methodAmountFor를 안 쓴다").toContain("methodAmountFor(activeRecipe.menuName, ing)");
    expect(src, "조건식이 바뀌었다 — 렌더가 죽었을 수 있다").toContain("{methodAmount && (");
    expect(src, "화면에 안 그린다").toContain('t("planner_method_uses", { amount: methodAmount })');
  });

  it("안내 문구의 개수가 데이터와 같다 — 손으로 적지 않는다", () => {
    expect(src).toContain("withAmounts: String(RECIPES_WITH_METHOD_AMOUNTS)");
    for (const l of ["en", "ko", "zh"]) {
      const m = JSON.parse(
        readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8"),
      ) as Record<string, string>;
      expect(m.planner_portion_vs_method, `${l}: 개수를 손으로 적었다`).toContain("{withAmounts}");
      expect(m.planner_portion_vs_method, `${l}: 총 개수를 손으로 적었다`).toContain("{total}");
      expect(m.planner_method_uses, `${l}: 분량 자리가 없다`).toContain("{amount}");
      expect(m.planner_portion_vs_method, `${l}: 마크다운`).not.toMatch(/\*\*/);
    }
  });
});
