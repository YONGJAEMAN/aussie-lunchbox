import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 어른 몫 안내 (2026-09-01).
 *
 * 한 사용자가 자발적으로 이렇게 썼다 — 도시락 싸는 게 매주 힘든데 "정작 내 점심은
 * 눅눅한 상추와 오래된 빵"이라고. 사이트의 어떤 문구도 그 상황을 다루지 않고 있었다.
 *
 * 🔴 이 가드가 지키는 핵심은 문구의 존재가 아니라 **비용 고지**다.
 * 플래너의 통당 금액은 아이 도시락 기준이다. "양만 늘리면 된다"만 말하고 비용이
 * 더 든다는 걸 빼면, 우리가 보여준 숫자로 한 주 예산을 짜는 사람이 틀린 계획을
 * 세우게 된다. 문구를 다듬다가 이 절이 먼저 떨어져 나가는 것이 실제로 잦다
 * (About 재작성에서 OpenWeather 표기가 그렇게 사라졌다).
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES = ["en", "ko", "zh"] as const;
const KEYS = [
  "planner_adult_note_title",
  "planner_adult_note_body",
  "faq_q32",
  "faq_a32",
] as const;

function messages(locale: string): Record<string, string> {
  return JSON.parse(readFileSync(path.join(ROOT, "messages", `${locale}.json`), "utf8"));
}

/** 비용이 더 든다는 뜻을 담고 있는지 — 로케일별 표현. */
const COST_CAVEAT: Record<(typeof LOCALES)[number], RegExp> = {
  en: /cost more|more than the (figure|per-box)/i,
  ko: /더 듭니다|더 든다/,
  zh: /更贵|更高|高于/,
};

describe("어른 몫 안내", () => {
  it.each(LOCALES)("%s에 네 개 문구가 모두 있고 비어 있지 않다", (locale) => {
    const m = messages(locale);
    for (const k of KEYS) {
      expect(m[k], `${locale}.json에 ${k}가 없다`).toBeTruthy();
      expect(m[k].trim().length, `${locale}.json의 ${k}가 비었다`).toBeGreaterThan(0);
    }
  });

  it.each(LOCALES)("%s의 플래너 문구가 비용 고지를 담고 있다", (locale) => {
    expect(
      messages(locale).planner_adult_note_body,
      `${locale}: "어른 몫이 더 든다"는 고지가 빠졌다 — 이게 없으면 아이 기준 금액으로 예산을 짜게 된다`,
    ).toMatch(COST_CAVEAT[locale]);
  });

  it.each(LOCALES)("%s의 FAQ 답변도 같은 고지를 담고 있다", (locale) => {
    expect(
      messages(locale).faq_a32,
      `${locale}: FAQ 답변에서 비용 고지가 빠졌다`,
    ).toMatch(COST_CAVEAT[locale]);
  });

  it("플래너가 두 문구를 실제로 렌더한다", () => {
    // 메시지 키만 있고 아무 데서도 안 쓰면 화면에는 없는 것과 같다.
    const src = readFileSync(path.join(ROOT, "components", "PlannerClient.tsx"), "utf8");
    expect(src, "planner_adult_note_title을 쓰는 곳이 없다").toContain(
      "planner_adult_note_title",
    );
    expect(src, "planner_adult_note_body를 쓰는 곳이 없다").toContain(
      "planner_adult_note_body",
    );
  });

  it("FAQ 32번이 카테고리에 올라가 있다", () => {
    // messages에만 있고 FAQ_CATEGORIES에 없으면 페이지에도, FAQPage 구조화 데이터에도
    // 안 나온다 — 키는 있는데 아무도 못 보는 상태가 된다.
    const src = readFileSync(path.join(ROOT, "app", "[locale]", "faq", "page.tsx"), "utf8");
    const cats = [...src.matchAll(/keys:\s*\[([^\]]*)\]/g)].flatMap((m) =>
      m[1].split(",").map((n) => Number(n.trim())),
    );
    expect(cats, "FAQ_CATEGORIES에 32가 없다").toContain(32);
  });

  it("세 로케일이 같은 문구를 복사해 쓰지 않는다", () => {
    for (const k of KEYS) {
      const texts = LOCALES.map((l) => messages(l)[k]);
      expect(new Set(texts).size, `${k}: 로케일별 문구가 겹친다 — 번역이 빠졌을 수 있다`).toBe(
        LOCALES.length,
      );
    }
  });

  it("아이 전용이 아니라는 말과 '양을 늘린다'는 말이 같이 있다", () => {
    // 둘 중 하나만 있으면 조언이 실행 가능하지 않다.
    const en = messages("en");
    expect(en.planner_adult_note_body).toMatch(/only for kids|scales up|bigger portion/i);
    expect(en.faq_a32).toMatch(/bigger portion/i);
  });
});
