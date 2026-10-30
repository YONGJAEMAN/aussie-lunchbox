/**
 * 가격지수 메타(열 날짜) 계산 — **한 곳에서만** 한다.
 *
 * 🔴 Kiwi 2026-08-17: 이 계산이 세 스크립트에 복붙돼 있었고 한 곳만 고쳐졌다. 증상이 없는 고장이었다.
 *
 * Aussie(2026-10-30): 열은 Woolworths 하나다. Coles는 상품 페이지 세 건째부터 Imperva 봇 확인
 * 「Pardon Our Interruption」이 떠서 추적하지 않는다(우회하지 않는다 — `data/priceIndexSources.json` `coles`).
 */

/** 지수에 존재하는 모든 열의 갱신일. 열이 늘면 여기만 고친다. */
export const COLUMN_DATE_KEYS = ["woolworthsUpdated"];

/** 지수 전체의 신선도 = **가장 오래된 열**. 한쪽만 갱신했다고 전체가 최신인 척하면 안 된다. */
export function oldestColumnDate(index) {
  const dates = COLUMN_DATE_KEYS.map((k) => index[k]).filter(Boolean);
  if (!dates.length) return undefined;
  return dates.sort()[0];
}

/**
 * 열 날짜를 오늘로 올려도 되는가 — 그 열을 **실제로 읽은 비율**이 기준 이상일 때만.
 * 🔴 Kiwi 2026-10-26: 조회 결과와 무관하게 `*Updated = today`를 찍어 옛 값이 새 관측으로 시계열에 6점 들어갔다.
 * 특가보류는 「읽었다」로 센다 — 응답은 왔고 정상가가 없어 값을 안 바꾼 것이다.
 */
export const MIN_COLUMN_READ_RATE = 0.8;

export function columnReadRate({ updated = 0, specials = 0, failed = 0, drifted = 0 }) {
  const attempted = updated + specials + failed + drifted;
  return attempted > 0 ? (updated + specials) / attempted : 0;
}

export function columnReadEnough(counts) {
  return columnReadRate(counts) >= MIN_COLUMN_READ_RATE;
}
