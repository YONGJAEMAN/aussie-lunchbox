/**
 * 가격지수 메타(열 날짜) 계산 — **한 곳에서만** 한다.
 *
 * 🔴 2026-08-17에 발견: 이 계산이 세 스크립트에 복붙돼 있었고, New World 열을 추가할 때
 * `update_newworld_prices.mjs` 하나만 세 열로 고쳤다. 나머지 둘은 두 열로 남아서,
 * **New World 다음에 Woolworths나 Pak'nSave를 돌리면 `lastUpdated`가 NW를 빼고 계산됐다.**
 * 세 열이 우연히 같은 날짜라 화면에 아무 증상도 없었다 — 에러가 안 나는 고장이다.
 *
 * 더 얄궂은 건 `update_newworld_prices.mjs`에 "여기서 newworld를 빠뜨리면 NW 열만 조용히
 * 늙는다"는 경고가 이미 적혀 있었다는 점이다. 경고를 적은 자리와 고쳐야 할 자리가 달랐다.
 */

/** 지수에 존재하는 모든 열의 갱신일. 열이 늘면 여기만 고친다. */
export const COLUMN_DATE_KEYS = ["woolworthsUpdated", "paknsaveUpdated", "newworldUpdated"];

/**
 * 지수 전체의 신선도 = **가장 오래된 열**.
 * 한쪽만 갱신했다고 전체가 최신인 척하면 안 된다.
 */
export function oldestColumnDate(index) {
  const dates = COLUMN_DATE_KEYS.map((k) => index[k]).filter(Boolean);
  if (!dates.length) return undefined;
  return dates.sort()[0];
}

/**
 * 열 날짜를 오늘로 올려도 되는가 — 그 열을 **실제로 읽은 비율**이 기준 이상일 때만.
 *
 * 🔴 2026-10-26 발견: 세 스크립트가 조회 결과와 무관하게 `*Updated = today`를 찍고 있었다.
 *    GitHub Actions 러너에서는 마트 API가 시간초과·차단(08-23 이후 11회 중 10회 Woolworths 0/18,
 *    Foodstuffs는 매번 buildId 실패)인데도 `woolworthsUpdated`가 그 월요일로 올라갔고,
 *    `update_price_history.mjs`가 그 날짜로 **옛 값을 새 관측**처럼 적었다 — 라이브 시계열에 6점.
 *    플래너 캐시(`update_prices.mjs`)는 08-16부터 80% 규칙으로 막혀 있었는데 지수만 빠져 있었다.
 *
 * 특가보류는 「읽었다」로 센다 — 응답은 왔고 정상가가 없어 값을 안 바꾼 것이다(행 날짜가 따로 있다).
 * 보류(BLOCKED)는 분모에서 뺀다 — 애초에 조회하지 않는 행이다.
 */
export const MIN_COLUMN_READ_RATE = 0.8;

export function columnReadRate({ updated = 0, specials = 0, failed = 0, drifted = 0 }) {
  const attempted = updated + specials + failed + drifted;
  return attempted > 0 ? (updated + specials) / attempted : 0;
}

export function columnReadEnough(counts) {
  return columnReadRate(counts) >= MIN_COLUMN_READ_RATE;
}
