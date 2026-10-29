import index from "@/data/priceIndex.json";

/**
 * 어떤 행이 "매장 비교"로 셀 수 있는지를 정하는 **단 하나의** 규칙.
 *
 * 🔴 이 파일이 생긴 이유 (2026-08-12):
 * 같은 규칙이 price-index 페이지와 비교 글에 각각 복붙돼 있었는데,
 * **정작 페이지 상단 바구니 합계는 둘 중 어느 것도 쓰지 않았다.**
 * `items.reduce((s, i) => s + (i.paknsave ?? 0), 0)` 이 Pak'nSave 값이 없는 행을
 * 0으로 세는 바람에 Woolworths 20품목과 Pak'nSave 18품목을 빼고 있었고,
 * "You save at Pak'nSave $28.50 per week"가 라이브로 나갔다.
 * 같은 시점 진짜 like-for-like는 $4.99다 — 실제의 5.7배를 광고한 셈이다.
 *
 * 열 날짜가 같아도 그 행이 낡을 수 있다는 게 핵심이다. 특가 주간엔 정상가를
 * 읽을 수 없어 그 행만 갱신을 건너뛴다. 그래서 열 단위 검사(dateGapDays)는
 * 행 단위 낡음을 잡지 못한다 — 실제로 Pak'nSave 열이 자동 갱신으로 바뀌면서
 * 열 간격이 86일→1일이 된 순간 그 가드가 통째로 꺼졌다.
 */
const DAY = 86_400_000;
export const FRESH_WINDOW_DAYS = 30;

export type PriceRow = {
  name: string;
  /** 통로. `priceIndex.json`에 원래부터 있다 — 통로별 합계가 이 값을 쓴다. */
  category?: string;
  countdown: number | null;
  paknsave: number | null;
  paknsaveAsOf?: string;
  newworld?: number | null;
  newworldAsOf?: string;
  /** 규격 재정의 — 이날 뒤의 값은 그 전 값과 **다른 상품**이다(예: 사과 Royal Gala → Granny Smith). */
  respec?: { on: string; was: string };
};

/**
 * 두 열의 값이 모두 있고, 그 행의 Pak'nSave 조사일이 Woolworths 조사일과 30일 이내인가.
 * 기준일이 없으면 **비교 근거가 없는 것**이므로 false다 — 없는 날짜를 관대하게
 * 넘겨주면 옛 값이 최신인 척하게 된다.
 */
export function isComparableRow(row: PriceRow, woolworthsUpdated: string | undefined): boolean {
  if (row.countdown === null || row.paknsave === null) return false;
  if (!row.paknsaveAsOf || !woolworthsUpdated) return false;
  const gap = Math.abs(Date.parse(row.paknsaveAsOf) - Date.parse(woolworthsUpdated)) / DAY;
  return Number.isFinite(gap) && gap <= FRESH_WINDOW_DAYS;
}

const IDX = index as { woolworthsUpdated: string; items: PriceRow[] };

export function comparableRows(
  rows: PriceRow[] = IDX.items,
  woolworthsUpdated: string | undefined = IDX.woolworthsUpdated,
): PriceRow[] {
  return rows.filter((r) => isComparableRow(r, woolworthsUpdated));
}

/**
 * 바구니 합계. **비교 가능한 행만** 더한다.
 *
 * 🔴 두 합계는 반드시 같은 행 집합에서 나와야 한다. 한쪽에만 값이 있는 행을
 *    0으로 채워 더하면 뺄셈이 성립하지 않는다 — 그게 $28.50 사고였다.
 */
export function basketTotals(
  rows: PriceRow[] = IDX.items,
  woolworthsUpdated: string | undefined = IDX.woolworthsUpdated,
) {
  const used = comparableRows(rows, woolworthsUpdated);
  const woolworths = used.reduce((s, i) => s + (i.countdown as number), 0);
  const paknsave = used.reduce((s, i) => s + (i.paknsave as number), 0);
  return {
    woolworths,
    paknsave,
    savings: woolworths - paknsave,
    /** 합계에 실제로 들어간 품목 수 — 화면에 반드시 같이 적는다 */
    count: used.length,
    total: rows.length,
  };
}


/* ────────────────────────────────────────────────────────────────
 * New World 열 (2026-08-17 신설)
 *
 * 🔴 2열 함수(isComparableRow·basketTotals)는 건드리지 않는다.
 * 그 숫자는 비교 글과 학교 안내문이 인용하고 있고 가드가 붙어 있다.
 * 3열은 **더 좁은 별개 집합**이다 — 세 열이 다 있고 셋 다 최신인 행만.
 *
 * 🔴 $28.50 사고의 교훈이 여기서도 그대로다: 세 합계는 **같은 행 집합**에서
 * 나와야 한다. NW가 없는 행을 0으로 채워 더하면 "New World가 싸다"가 된다.
 * ──────────────────────────────────────────────────────────────── */

/** 세 열이 모두 있고, PnS·NW 조사일이 Woolworths 조사일과 30일 이내인가. */
export function isThreeWayComparableRow(
  row: PriceRow,
  woolworthsUpdated: string | undefined,
): boolean {
  if (!isComparableRow(row, woolworthsUpdated)) return false;
  if (row.newworld === null || row.newworld === undefined) return false;
  if (!row.newworldAsOf || !woolworthsUpdated) return false;
  const gap = Math.abs(Date.parse(row.newworldAsOf) - Date.parse(woolworthsUpdated)) / DAY;
  return Number.isFinite(gap) && gap <= FRESH_WINDOW_DAYS;
}

export function threeWayRows(
  rows: PriceRow[] = IDX.items,
  woolworthsUpdated: string | undefined = IDX.woolworthsUpdated,
): PriceRow[] {
  return rows.filter((r) => isThreeWayComparableRow(r, woolworthsUpdated));
}

/**
 * 세 매장 바구니 합계. **세 열이 다 있는 행만** 더한다.
 * count 는 화면에 반드시 같이 적는다 — 20품목 중 몇 개인지 안 밝히면
 * 합계가 전체인 것처럼 읽힌다.
 */
export function threeWayBasketTotals(
  rows: PriceRow[] = IDX.items,
  woolworthsUpdated: string | undefined = IDX.woolworthsUpdated,
) {
  const used = threeWayRows(rows, woolworthsUpdated);
  const woolworths = used.reduce((s, i) => s + (i.countdown as number), 0);
  const paknsave = used.reduce((s, i) => s + (i.paknsave as number), 0);
  const newworld = used.reduce((s, i) => s + (i.newworld as number), 0);
  /** 각 매장이 단독 최저가인 행 수 (동점이면 아무에게도 주지 않는다) */
  const wins = { woolworths: 0, paknsave: 0, newworld: 0 };
  for (const r of used) {
    const trio = [r.countdown as number, r.paknsave as number, r.newworld as number];
    const min = Math.min(...trio);
    if (trio.filter((v) => v === min).length > 1) continue;
    if (r.countdown === min) wins.woolworths++;
    else if (r.paknsave === min) wins.paknsave++;
    else wins.newworld++;
  }
  return { woolworths, paknsave, newworld, wins, count: used.length, total: rows.length };
}

/* ────────────────────────────────────────────────────────────────
 * FAQ가 쓰는 바구니 수치 (2026-09-10 신설)
 *
 * 🔴 `faq_a20`이 금액을 **세 언어에 손으로** 들고 있었다. 주간 수집이 돌 때마다
 *    거짓이 되고, 실제로 이번 수집에서 네 건 중 두 건이 그것 때문에 깨졌다.
 *    가드가 매번 잡아 주긴 했지만, 잡아 줘야 한다는 것 자체가 설계 문제다.
 *
 * 🔴 같은 문단이 "on the same day" / "같은 날"이라고 말하고 있었다. 규칙은 원래부터
 *    **Woolworths 라운드 ±30일**이다(`isComparableRow`). 오늘 글에서 고친 것과
 *    같은 거짓말이 FAQ에 남아 있었다 — 문구도 규칙을 말하게 바꾼다.
 * ──────────────────────────────────────────────────────────────── */

/** "10 September 2026" — 로케일과 무관한 표기다(en-NZ 월 이름). */
export function roundDateLabel(iso: string = IDX.woolworthsUpdated): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${d.toLocaleString("en-NZ", { month: "long", timeZone: "UTC" })} ${d.getUTCFullYear()}`;
}

/** FAQ 문구에 꽂아 넣는 값들. **전부 데이터에서 나온다.** */
export function basketFigures() {
  const two = basketTotals();
  const three = threeWayBasketTotals();
  const money = (n: number) => `$${n.toFixed(2)}`;
  const pct = two.woolworths > 0 ? ((two.woolworths - two.paknsave) / two.woolworths) * 100 : 0;
  return {
    basketN: String(two.count),
    basketW: money(two.woolworths),
    basketP: money(two.paknsave),
    // 소수점이 0이면 산문에서 "9.0%"가 어색하다. 값은 그대로다.
    basketPct: pct.toFixed(1).endsWith(".0") ? pct.toFixed(0) : pct.toFixed(1),
    threeN: String(three.count),
    threeW: money(three.woolworths),
    threeP: money(three.paknsave),
    threeNW: money(three.newworld),
    basketAsOf: roundDateLabel(),
  };
}

/* ────────────────────────────────────────────────────────────────
 * 통로별 승자 (2026-09-11 신설)
 *
 * 🔴 왜 필요했나 — 이 데이터로 「어디가 싸냐」를 말하는 방법이 두 개뿐이었다:
 *    바구니 총액 하나(= "Pak'nSave가 싸다")와 18줄짜리 품목 표(= 패턴이 안 보인다).
 *    그 사이 눈금이 통로다. `category`는 `priceIndex.json`에 **처음부터 있었는데**
 *    어느 글도 쓰지 않았다.
 *
 * 🔴 행 집합은 3열 비교와 **똑같아야 한다**(`threeWayRows`). 통로별로 규칙을 느슨하게
 *    하면 통로 합계의 총합이 바구니 총액과 안 맞는다 — $28.50 사고의 변형이다.
 *    그래서 여기서 행을 다시 고르지 않고 `threeWayRows()`를 받아 나눈다.
 * ──────────────────────────────────────────────────────────────── */

export type AisleRow = {
  aisle: string;
  n: number;
  woolworths: number;
  paknsave: number;
  newworld: number;
  /** Woolworths − Pak'nSave. 양수면 Pak'nSave가 싸다. */
  gapWP: number;
  /** 같은 값을 그 통로의 Woolworths 합계에 대한 비율로. */
  pctWP: number;
  /** 그 통로 합계가 가장 낮은 체인 */
  cheapest: "Woolworths" | "Pak'nSave" | "New World";
};

/** 통로별 3열 합계. Pak'nSave 우위가 큰 통로부터. */
export function aisleTotals(
  rows: PriceRow[] = IDX.items,
  woolworthsUpdated: string | undefined = IDX.woolworthsUpdated,
): AisleRow[] {
  const used = threeWayRows(rows, woolworthsUpdated);
  const byAisle = new Map<string, PriceRow[]>();
  for (const r of used) {
    const key = r.category ?? "Uncategorised";
    byAisle.set(key, [...(byAisle.get(key) ?? []), r]);
  }
  return [...byAisle.entries()]
    .map(([aisle, group]) => {
      const woolworths = group.reduce((s, r) => s + (r.countdown as number), 0);
      const paknsave = group.reduce((s, r) => s + (r.paknsave as number), 0);
      const newworld = group.reduce((s, r) => s + (r.newworld as number), 0);
      const low = Math.min(woolworths, paknsave, newworld);
      return {
        aisle,
        n: group.length,
        woolworths,
        paknsave,
        newworld,
        gapWP: woolworths - paknsave,
        pctWP: woolworths > 0 ? ((woolworths - paknsave) / woolworths) * 100 : 0,
        cheapest:
          low === paknsave ? ("Pak'nSave" as const)
          : low === newworld ? ("New World" as const)
          : ("Woolworths" as const),
      };
    })
    .sort((a, b) => b.pctWP - a.pctWP);
}

/* ────────────────────────────────────────────────────────────────
 * 품목별 승자가 **바뀌었나** (2026-09-11 신설)
 *
 * 🔴 이 글들은 「지금 어디가 싸냐」만 말할 수 있었다. 라운드가 두 개 있으면
 *    그보다 나은 질문을 할 수 있다 — **어느 품목에서 승자가 바뀌었나, 그리고
 *    바뀐 이유가 이긴 쪽이 내렸기 때문인가 진 쪽이 올랐기 때문인가.**
 *
 * 🔴 5월 라운드는 행별 조사일이 없다(`history[0]`에는 이름·두 값뿐이다). 그래서
 *    신선도 게이트를 적용할 수 없고, **양쪽 값이 다 있는 행만** 쓴다. 한쪽이 없던
 *    행을 0으로 채우면 승자가 조작된다 — $28.50 사고와 같은 실수다.
 *
 * 🔴 New World는 5월에 없었다. 이 비교는 **2열 전용**이다. 3열로 늘리지 말 것.
 * ──────────────────────────────────────────────────────────────── */

type HistoryRound = { date: string; items: Array<{ name: string; countdown: number | null; paknsave: number | null }> };
const HIST = (index as unknown as { history?: HistoryRound[] }).history ?? [];

export type WinnerChange = {
  name: string;
  /** 그때 싼 쪽 / 지금 싼 쪽 */
  was: "Woolworths" | "Pak'nSave" | "tie";
  now: "Woolworths" | "Pak'nSave" | "tie";
  thenW: number; thenP: number; nowW: number; nowP: number;
  /** 각 체인이 그 사이 얼마나 움직였나 */
  moveW: number; moveP: number;
};

const cheaperOf = (w: number, p: number): "Woolworths" | "Pak'nSave" | "tie" =>
  Math.round(w * 100) === Math.round(p * 100) ? "tie" : w < p ? "Woolworths" : "Pak'nSave";

/** 5월 라운드와 지금 라운드에서 **양쪽 값이 다 있는** 행만. */
export function winnerRows(
  rows: PriceRow[] = IDX.items,
  history: HistoryRound[] = HIST,
): WinnerChange[] {
  const first = history[0];
  if (!first) return [];
  const then = new Map(first.items.map((i) => [i.name, i]));
  const out: WinnerChange[] = [];
  for (const r of rows) {
    const t = then.get(r.name);
    if (!t) continue;
    // 🔴 09-29: 이름이 같아도 그 라운드 뒤에 규격이 바뀐 행은 다른 상품이다. 사과가 5월 Royal Gala와
    //    지금 Granny Smith로 비교행에 섞여 「승자가 바뀌었다」·집중도 계산에 들어가 있었다.
    if (r.respec && r.respec.on > first.date) continue;
    // 🔴 10-19: 지금 라운드에서 비교할 수 없는 행(Pak'nSave 값이 30일 넘게 묵은 Eggs 09-13)도 승자 집계에
    //    들어가 글이 「15개」를 말했다. 표·합계(`comparableRows`)와 같은 행만 센다.
    if (!isComparableRow(r, IDX.woolworthsUpdated)) continue;
    if (t.countdown === null || t.paknsave === null) continue;
    if (r.countdown === null || r.paknsave === null) continue;
    out.push({
      name: r.name,
      was: cheaperOf(t.countdown, t.paknsave),
      now: cheaperOf(r.countdown, r.paknsave),
      thenW: t.countdown, thenP: t.paknsave, nowW: r.countdown, nowP: r.paknsave,
      moveW: r.countdown - t.countdown,
      moveP: r.paknsave - t.paknsave,
    });
  }
  return out;
}

/** 승자가 바뀐 행. 지금 이긴 쪽의 이득이 큰 순서. */
export function winnerFlips(
  rows: PriceRow[] = IDX.items,
  history: HistoryRound[] = HIST,
): WinnerChange[] {
  return winnerRows(rows, history)
    .filter((r) => r.was !== r.now)
    .sort((a, b) => Math.abs(b.nowW - b.nowP) - Math.abs(a.nowW - a.nowP));
}

/**
 * 지금 라운드에서 **Woolworths가 더 싼 품목 이름들.**
 *
 * 🔴 왜 있나 (2026-09-19) — `budget-friendly-lunchbox-ideas-nz` 가
 *    "Woolworths was cheaper on cucumber, lettuce and rice" 를 **손으로** 적고 있었다.
 *    같은 문단의 금액($102.43/$113.75)과 승패("17 of those 20")도 전부 손글씨였고,
 *    실측은 $101.83/$112.20 · 16개 중 13개였다. **글이 옛 라운드를 붙잡고 있었다.**
 */
export function woolworthsCheaperItems(rows: PriceRow[] = IDX.items, history: HistoryRound[] = HIST): string[] {
  return winnerRows(rows, history).filter((r) => r.now === "Woolworths").map((r) => r.name);
}

/** 위 목록을 문장에 넣을 수 있게 — 0개면 그 절을 아예 안 쓴다. */
export function woolworthsCheaperClause(rows: PriceRow[] = IDX.items, history: HistoryRound[] = HIST): string {
  const names = woolworthsCheaperItems(rows, history).map((n) => n.replace(/\s*\([^)]*\)\s*$/, "").toLowerCase());
  if (names.length === 0) return "";
  if (names.length === 1) return ` Woolworths was cheaper on ${names[0]}.`;
  return ` Woolworths was cheaper on ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}.`;
}

/** 5월 라운드의 날짜 — 글이 자기 비교 구간을 스스로 말하게 한다. */
export const firstRoundDate = (history: HistoryRound[] = HIST) => history[0]?.date ?? "";

/** 그 라운드에서 각 체인이 이긴 행 수. */
export function winnerTally(rows: PriceRow[] = IDX.items, history: HistoryRound[] = HIST) {
  const all = winnerRows(rows, history);
  const count = (k: "was" | "now", chain: "Woolworths" | "Pak'nSave") =>
    all.filter((r) => r[k] === chain).length;
  return {
    n: all.length,
    thenW: count("was", "Woolworths"), thenP: count("was", "Pak'nSave"),
    nowW: count("now", "Woolworths"), nowP: count("now", "Pak'nSave"),
  };
}

/* ────────────────────────────────────────────────────────────────
 * 5월 라운드를 **인용하는 자리**가 쓰는 창구.
 *
 * 🔴 2026-09-15: `app/[locale]/planner/page.tsx`가 그 라운드의 세 행(빵·랩·베이글)과
 *    날짜를 **JSX에 손으로** 적고 있었다. 값 자체는 `history[0]`과 일치했지만,
 *    같은 기록이 두 곳에 사는 순간 한쪽만 고치게 된다.
 *
 * 🔴 더 나쁜 건 **규격 재정의를 못 따라간 것**이다. "Wraps 8-pack" 행은 2026-08-12에
 *    「Woolworths가 8-pack을 팔지 않는다」는 이유로 6-pack으로 재정의됐고, 가격지수
 *    페이지는 그렇게 말하고 있다. 그런데 플래너 페이지는 같은 시각에 **Woolworths
 *    8-pack 가격 $5.00**을 싣고 있었다. 두 페이지가 서로를 반박했다.
 *    5월 기록은 1차 자료이므로 **지우지 않는다** — 대신 그 뒤에 무슨 일이
 *    있었는지 페이지가 스스로 말하게 한다(`respecifiedSince`).
 * ──────────────────────────────────────────────────────────────── */

export type FirstRoundRow = { name: string; woolworths: number; paknsave: number };

/** 5월 라운드에서 이름으로 꺼낸 행. 이름이 바뀌면 **던진다** — 조용히 빠지면 표가 짧아질 뿐이다. */
export function firstRoundRows(
  names: readonly string[],
  history: HistoryRound[] = HIST,
): FirstRoundRow[] {
  const first = history[0];
  if (!first) throw new Error("5월 라운드: priceIndex.json 에 history 가 없다");
  return names.map((name) => {
    const r = first.items.find((i) => i.name === name);
    if (!r || r.countdown === null || r.paknsave === null) {
      throw new Error(
        `5월 라운드: "${name}" 행이 없거나 한쪽 값이 비었다. ` +
          `인용하는 쪽의 이름 목록을 history[0]과 맞출 것 — 조용히 빼면 표만 짧아진다.`,
      );
    }
    return { name, woolworths: r.countdown, paknsave: r.paknsave };
  });
}

/**
 * 인용한 행 중 **지금 바구니에 그 이름이 없는** 것 — 그 사이 규격이 재정의된 행이다.
 * 이걸 세는 곳이 없으면, 재정의를 말하는 페이지와 옛 규격을 싣는 페이지가 공존한다.
 */
export function respecifiedSince(
  names: readonly string[],
  rows: PriceRow[] = IDX.items,
  history: HistoryRound[] = HIST,
): string[] {
  const current = new Map(rows.map((r) => [r.name, r]));
  const since = history[0]?.date ?? "";
  // 이름이 사라진 행 + 이름은 같지만 그 라운드 뒤에 규격이 바뀐 행(09-29: 사과)
  return names.filter((n) => !current.has(n) || (current.get(n)!.respec?.on ?? "") > since);
}
