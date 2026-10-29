/**
 * 조리법 본문에 **적혀 있는** 배치 생산량을 읽는다.
 *
 * 🔴 2026-09-09 외부 감사 — Cheesymite Scrolls가 $2.34 / 676 kcal로 뜨는데 조리법은
 *    스크롤 **8개**를 만든다. 두 값은 도시락 하나 기준인데 화면이 그 말을 안 했고,
 *    8개분으로 읽으면 몇 배 틀리게 읽힌다.
 *
 * 🔴 **없는 생산량을 만들지 않는다.** 94개 중 본문에 생산량이 적힌 건 4개뿐이다.
 *    나머지에 그럴듯한 숫자를 채우면 그게 곧 날조다. 못 읽으면 `null`이고,
 *    화면은 아무 말도 하지 않는다.
 */

export type RecipeYield = { count: number; unit: string };

/**
 * "slice into 8 scrolls" → {8, "scrolls"} · "divide into 4 portions" → {4, "portions"}
 * "makes 12 muffins" → {12, "muffins"}
 */
export function parseYield(instructions: string | undefined): RecipeYield | null {
  if (!instructions) return null;
  const m =
    /\b(?:slice|cut|divide|roll|shape|form)\s+(?:it\s+|them\s+|the\s+\w+\s+)?into\s+(\d+)\s+([a-z]+)/i.exec(
      instructions,
    ) ?? /\bmakes\s+(?:about\s+)?(\d+)\s+([a-z]+)/i.exec(instructions);
  if (!m) return null;
  const count = Number(m[1]);
  if (!Number.isFinite(count) || count < 2 || count > 60) return null;
  const unit = m[2].toLowerCase();
  // "into 2 halves"처럼 배치가 아닌 것은 제외한다 — 한 끼를 자르는 동작이다.
  if (/^(half|halves|pieces?|strips?|sticks?|quarters?)$/.test(unit)) return null;
  return { count, unit };
}
