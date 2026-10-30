/**
 * 호주 날짜와 특가 주 — 플래너(`lib/promotions.ts`)와 수요일 수집기(`scripts/update_specials.mjs`)가 같이 쓴다.
 *
 * 🔴 UTC로 비교하면 날짜가 밀린다(Kiwi 2026-08-10·08-17). 특가 기간은 **시드니 날짜** 문자열이다.
 *    서머타임 오프셋을 직접 계산하지 말 것 — Intl에 맡긴다.
 * Woolworths·Coles 주간 특가는 **수요일에 시작해 화요일에 끝난다.** API는 특가 기간을 주지 않아서
 * 읽은 날이 속한 수~화를 그 특가의 기간으로 잡는다(Aussie 2026-10-30).
 */

/** 시드니 벽시계 기준 YYYY-MM-DD. */
export function auToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const addDays = (ymd, n) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** 시드니 날짜로 「가장 최근 수요일 ~ 그다음 화요일」. */
export function specialsWeek(now = new Date()) {
  const today = auToday(now);
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0=일 … 3=수
  const validFrom = addDays(today, -((dow - 3 + 7) % 7));
  return { validFrom, validUntil: addDays(validFrom, 6) };
}
