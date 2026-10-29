import history from "@/data/priceHistory.json";
import priceIndex from "@/data/priceIndex.json";
import { money } from "@/lib/servePrice";

/**
 * 「같은 상품의 진열가가 실제로 얼마나 움직였나」를 재는 한 벌.
 *
 * 🔴 **Woolworths 열만 쓴다.** 이 열만 SKU를 사람이 고정한 뒤(2026-07-30) 자동으로
 *    같은 상품코드를 조회한다. Pak'nSave·New World 열은 매장 확인이라 관측이 성기고,
 *    성긴 관측을 시계열로 그리면 "안 움직였다"가 관측 부족과 구별되지 않는다.
 *
 * 🔴 **진열가지 특가가 아니다.** `scripts/update_price_index.mjs`가 특가 주간에
 *    `originalPrice`를 넣는다 — 특가를 넣으면 물가가 내린 것처럼 보이는 거짓 신호가 된다.
 *    그래서 "안 움직였다"는 **그 주에 특가가 없었다는 뜻이 아니다.** 본문이 그렇게 말한다.
 *
 * 🔴 **모든 관측에 다 있는 품목만 센다.** 규격이 바뀐 행(랩 8개→6개, 후무스 200g→220g 등)은
 *    앞뒤가 다른 상품이라 "가격이 변했다"로 세면 그건 물가가 아니라 내 명세가 바뀐 것이다.
 *    2026-09-07에 특가 이력 글에서 같은 함정을 한 번 피했다 — 여기서도 같은 규칙을 쓴다.
 */

type Reading = { date: string; items: Record<string, number> };

const COLUMN: Reading[] = (history as unknown as { columns: Record<string, Reading[]> }).columns
  .woolworths;

/** "30 July 2026" 꼴. 본문이 ISO 날짜를 그대로 내보내지 않게 한다. */
function fmt(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${d.toLocaleString("en-NZ", { month: "long", timeZone: "UTC" })} ${d.getUTCFullYear()}`;
}

/** 관측일. 오름차순이고, 간격이 고르지 않다 — 본문이 그 사실을 밝힌다. */
export function readingDates(): string[] {
  return COLUMN.map((r) => fmt(r.date));
}

/** 첫·마지막 관측일. */
export function windowStart(): string {
  return fmt(COLUMN[0].date);
}

export function windowEnd(): string {
  return fmt(COLUMN[COLUMN.length - 1].date);
}

/** 관측 사이 가장 긴 공백(일). 「그 사이에 올랐다 내렸을 수 있다」를 몇 일로 말하게 한다. */
export function longestGapDays(): number {
  let worst = 0;
  for (let i = 1; i < COLUMN.length; i++) {
    const gap =
      (new Date(COLUMN[i].date).getTime() - new Date(COLUMN[i - 1].date).getTime()) /
      (24 * 3600 * 1000);
    if (gap > worst) worst = gap;
  }
  return Math.round(worst);
}

export function readingCount(): number {
  return COLUMN.length;
}

/** 첫 관측부터 마지막 관측까지의 주 수(반올림). */
export function weekSpan(): number {
  const a = new Date(COLUMN[0].date).getTime();
  const b = new Date(COLUMN[COLUMN.length - 1].date).getTime();
  return Math.round((b - a) / (7 * 24 * 3600 * 1000));
}

export type MovementRow = {
  name: string;
  first: number;
  last: number;
  min: number;
  max: number;
  /** 관측 사이에서 값이 바뀐 횟수. 관측 사이에 오르내린 건 안 보인다. */
  moves: number;
};

/** 모든 관측에 이름이 그대로 있는 품목만. 규격이 바뀐 행은 여기서 빠진다. */
export function movementRows(): MovementRow[] {
  let common = new Set(Object.keys(COLUMN[0].items));
  for (const r of COLUMN) common = new Set([...common].filter((k) => k in r.items));
  return [...common]
    .sort()
    .map((name) => {
      const vals = COLUMN.map((r) => r.items[name]);
      return {
        name,
        first: vals[0],
        last: vals[vals.length - 1],
        min: Math.min(...vals),
        max: Math.max(...vals),
        moves: vals.slice(1).filter((v, i) => v !== vals[i]).length,
      };
    });
}

export function trackedCount(): number {
  return movementRows().length;
}

/** 관측 내내 값이 한 번도 안 바뀐 품목. */
export function stableRows(): MovementRow[] {
  return movementRows().filter((r) => r.moves === 0);
}

export function stableCount(): number {
  return stableRows().length;
}

/**
 * 규격이 바뀌어 앞뒤를 이을 수 없는 행. 첫 관측에만 있던 이름과 마지막에만 있던 이름을
 * 같이 돌려준다 — 본문이 **무엇을 왜 뺐는지** 이름으로 밝히게 하려는 것이다.
 */
export function redefinedNames(): { dropped: string[]; added: string[] } {
  const kept = new Set(movementRows().map((r) => r.name));
  const first = Object.keys(COLUMN[0].items).filter((k) => !kept.has(k)).sort();
  const last = Object.keys(COLUMN[COLUMN.length - 1].items).filter((k) => !kept.has(k)).sort();
  return { dropped: first, added: last };
}

export function basketMove(): { first: number; last: number; diff: number; pct: number } {
  const rows = movementRows();
  const first = rows.reduce((a, r) => a + r.first, 0);
  const last = rows.reduce((a, r) => a + r.last, 0);
  return { first, last, diff: last - first, pct: ((last - first) / first) * 100 };
}

export function upDownSame(): { up: number; down: number; same: number } {
  const rows = movementRows();
  const up = rows.filter((r) => r.last > r.first).length;
  const down = rows.filter((r) => r.last < r.first).length;
  return { up, down, same: rows.length - up - down };
}

const signed = (n: number) => `${n >= 0 ? "+" : "−"}${money(Math.abs(n))}`;

/** 움직인 품목만, 변화가 큰 순서로. 안 움직인 품목은 문장으로 따로 센다. */
export function movementTable(): string {
  return movementRows()
    .filter((r) => r.moves > 0)
    .sort((a, b) => Math.abs(b.last - b.first) - Math.abs(a.last - a.first))
    .map(
      (r) =>
        `| ${r.name} | ${money(r.first)} | ${money(r.last)} | ${signed(r.last - r.first)} | ${r.moves} |`,
    )
    .join("\n");
}

/** 안 움직인 품목을 문장 안에 넣을 목록으로. */
export function stableList(): string {
  const names = stableRows().map((r) => r.name);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** 움직이긴 했는데 **딱 한 번** 움직인 품목의 수. 「계속 오른다」와 「한 계단 올랐다」는 다르다. */
export function movedOnceCount(): number {
  return movementRows().filter((r) => r.moves === 1).length;
}

/** 값이 한 번이라도 바뀐 품목의 수. */
export function movedCount(): number {
  return movementRows().filter((r) => r.moves > 0).length;
}

/** 관측 사이에서 가장 자주 값이 바뀐 품목들(동률 포함). */
export function busiestRows(): MovementRow[] {
  const rows = movementRows();
  const top = Math.max(...rows.map((r) => r.moves));
  return rows.filter((r) => r.moves === top);
}

/* ────────────────────────────────────────────────────────────────
 * 품목의 성격을 말하는 문장 (2026-09-10 외부 감사 4번 뒷부분)
 *
 * 🔴 두 문장이 손으로 적혀 있었고 둘 다 틀렸다:
 *
 *      "It is the shelf-stable half of a lunchbox — the tins, the block, the dry goods"
 *        → 그 목록에 Cucumber · Eggs · Cheese Block · Sliced Chicken이 들어 있다.
 *
 *      "…and are both produce sold by weight"  (Apples와 Lettuce)
 *        → Lettuce는 `each`다. Iceberg 한 통이지 무게로 팔지 않는다.
 *
 *    판매 단위는 `priceIndex.json`의 `unit`에 이미 들어 있었다. 문장이 그걸 안 읽고
 *    있었을 뿐이다. 이제 읽는다 — 품목이 바뀌면 문장도 같이 바뀐다.
 * ──────────────────────────────────────────────────────────────── */

const INDEX_UNITS: Record<string, string> = Object.fromEntries(
  (priceIndex as unknown as { items: Array<{ name: string; unit?: string }> }).items.map((i) => [
    i.name,
    i.unit ?? "",
  ]),
);

/**
 * 냉장·신선 보관이 필요한 품목. 판매 단위로는 알 수 없어 손으로 적는다 —
 * 지수 20품목뿐이고, 가드가 「지수에 없는 이름」과 「분류 안 된 품목」을 잡는다.
 */
const CHILLED = new Set<string>([
  "Cherry Tomatoes (180g)", "Cucumber", "Lettuce", "Sliced Chicken (200g)",
  "Sliced Ham (200g)", "Cheese Block (500g)", "Eggs (12-pack)", "Yoghurt (1kg)",
  "Butter (500g)", "Hummus (220g)", "Apples (1kg)", "Bananas (1kg)", "Carrots (1kg)",
]);

export const isChilledOrFresh = (name: string) => CHILLED.has(name);
export const indexUnitFor = (name: string) => INDEX_UNITS[name] ?? "";

/** 안 움직인 목록이 상온인지 냉장인지 — 「shelf-stable」이라고 부를 수 있나. */
export function stableMix() {
  const names = stableRows().map((r) => r.name);
  const chilled = names.filter(isChilledOrFresh);
  return { total: names.length, chilled, ambient: names.filter((n) => !isChilledOrFresh(n)) };
}

/** 가장 자주 움직인 품목들을 **판매 단위까지** 정확히 말하는 절. */
export function busiestClause(): string {
  const rows = busiestRows();
  const byWeight = rows.filter((r) => indexUnitFor(r.name) === "per kg");
  const each = rows.filter((r) => indexUnitFor(r.name) === "each");
  if (rows.length === byWeight.length) return "and are both produce sold by weight";
  if (rows.length === each.length) return "and are both produce sold by the item";
  if (byWeight.length && each.length) {
    return `— ${byWeight.map((r) => r.name.replace(/\s*\([^)]*\)/, "")).join(" and ")} sold by weight, ${each.map((r) => r.name.replace(/\s*\([^)]*\)/, "")).join(" and ")} by the item`;
  }
  return `and are all fresh produce`;
}

/* ────────────────────────────────────────────────────────────────
 * 세 열로 넓히기 (2026-09-10)
 *
 * 🔴 이 글은 Woolworths **한 열**만 보고 있었다. 그 사이 Pak'nSave 열이 5월까지,
 *    New World 열이 8월까지 쌓였다. 「무엇이 움직였나」는 한 체인이 아니라
 *    **여러 체인에서 같이 물어야** 답이 되는 질문이다.
 *
 * 🔴 **체인끼리 변동 「빈도」를 비교하지 않는다.** 읽는 간격이 다르다 —
 *    Woolworths는 하루 간격으로 읽힌 구간도 있고 Pak'nSave는 2주에 한 번이다.
 *    간격이 길면 그 사이에 바뀔 기회도 많다. 빈도를 비교하면
 *    [[observation-method-changed-not-the-world]]를 그대로 반복하게 된다.
 *    그래서 「얼마나 자주」가 아니라 **「어떤 품목이」**만 말한다.
 * ──────────────────────────────────────────────────────────────── */

type ChainKey = "woolworths" | "paknsave" | "newworld";
const ALL_COLUMNS = (history as unknown as {
  columns: Record<ChainKey, Array<{ date?: string; on?: string; items: Record<string, number> }>>;
}).columns;

export const CHAIN_LABEL: Record<ChainKey, string> = {
  woolworths: "Woolworths", paknsave: "Pak'nSave", newworld: "New World",
};

/** 한 체인의 품목별 시계열. 관측이 4회 미만인 품목은 뺀다 — 변동을 말할 근거가 없다. */
function chainSeries(chain: ChainKey, minReadings = 4, from?: string) {
  const out = new Map<string, Array<{ on: string; price: number }>>();
  const rows = [...(ALL_COLUMNS[chain] ?? [])].sort(
    (a, b) => String(a.date ?? a.on).localeCompare(String(b.date ?? b.on)),
  );
  for (const r of rows) {
    const on = String(r.date ?? r.on);
    if (from && on < from) continue;
    for (const [k, v] of Object.entries(r.items)) {
      if (!out.has(k)) out.set(k, []);
      out.get(k)!.push({ on, price: v });
    }
  }
  for (const [k, pts] of out) if (pts.length < minReadings) out.delete(k);
  return out;
}

const moveDates = (pts: Array<{ on: string; price: number }>) =>
  pts.filter((p, i) => i > 0 && Math.abs(p.price - pts[i - 1].price) > 0.005).map((p) => p.on);

/** 체인별 관측 규모 — 빈도를 비교하지 않는다는 말을 **수치로** 뒷받침한다. */
export function chainCoverage() {
  return (Object.keys(CHAIN_LABEL) as ChainKey[]).map((c) => {
    const s = chainSeries(c);
    const dates = [...new Set((ALL_COLUMNS[c] ?? []).map((r) => String(r.date ?? r.on)))].sort();
    return {
      chain: CHAIN_LABEL[c],
      readings: dates.length,
      items: s.size,
      first: dates[0] ?? "",
      last: dates[dates.length - 1] ?? "",
    };
  });
}

export function chainCoverageTable(): string {
  return chainCoverage()
    .map((c) => `| ${c.chain} | ${c.readings} | ${c.items} | ${roundDate(c.first)} – ${roundDate(c.last)} |`)
    .join("\n");
}

/**
 * 두 열이 **겹치는 창**의 시작일.
 *
 * 🔴 이걸 안 하면 Pak'nSave가 5월부터라 「거의 다 한 번은 움직였다」가 되고,
 *    그건 세상이 아니라 창 길이를 재는 것이다. 두 열 중 늦게 시작한 쪽에 맞춘다.
 */
export function overlapStart(): string {
  const first = (c: ChainKey) =>
    [...new Set((ALL_COLUMNS[c] ?? []).map((r) => String(r.date ?? r.on)))].sort()[0] ?? "";
  return [first("woolworths"), first("paknsave")].sort().reverse()[0];
}

/** Woolworths와 Pak'nSave 양쪽에 충분한 관측이 있는 품목 — **겹치는 창에서만**. */
export function twoChainItems() {
  const from = overlapStart();
  const w = chainSeries("woolworths", 4, from);
  const p = chainSeries("paknsave", 4, from);
  return [...w.keys()].filter((k) => p.has(k)).sort()
    .map((k) => ({ name: k, w: moveDates(w.get(k)!), p: moveDates(p.get(k)!) }));
}

export const movedAtBoth = () => twoChainItems().filter((r) => r.w.length && r.p.length);
export const movedAtNeither = () => twoChainItems().filter((r) => !r.w.length && !r.p.length);

/** 두 체인에서 다 움직인 품목 표. 날짜를 그대로 실어 독자가 직접 맞춰 볼 수 있게 한다. */
export function movedAtBothTable(): string {
  return movedAtBoth()
    .map((r) => `| ${r.name} | ${r.w.map(roundShort).join(", ")} | ${r.p.map(roundShort).join(", ")} |`)
    .join("\n");
}

/** 어느 쪽에서도 안 움직인 품목을 문장 안에 넣을 목록으로. */
export function neverMovedList(): string {
  const names = movedAtNeither().map((r) => r.name);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const roundShort = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${d.toLocaleString("en-NZ", { month: "short", timeZone: "UTC" })}`;
};
const roundDate = (iso: string) => {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${d.toLocaleString("en-NZ", { month: "long", timeZone: "UTC" })}`;
};

/** 두 체인에서 **같은 날** 움직인 품목. 「같이 오른다」는 통념을 재는 자리다. */
export function sameDayItems() {
  return movedAtBoth().filter((r) => r.w.some((d) => r.p.includes(d)));
}
export function sameDayList(): string {
  const names = sameDayItems().map((r) => r.name);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * 두 체인에서 다 움직인 것 중 **농산물**(무게 또는 개수로 파는 것).
 * 「신선/냉장」으로 가르면 안 된다 — 안 움직인 쪽에도 냉장이 4개 있다.
 * 가르는 건 냉장 여부가 아니라 **농산물이냐**다. 판매 단위가 그걸 말해 준다.
 */
export const producedMovedRows = () =>
  movedAtBoth().filter((r) => ["per kg", "each", "per punnet"].includes(indexUnitFor(r.name)));

export function producePhrase(): string {
  const n = producedMovedRows().length;
  const total = movedAtBoth().length;
  const word = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ?? String(n);
  return `${word.charAt(0).toUpperCase()}${word.slice(1)} of those ${total} are produce — sold by weight or by the item`;
}

/** 같은 날 움직인 비율을 문장으로. 하나도 없을 수도 있으므로 문장이 갈린다. */
export function sameDayPhrase(): string {
  const shared = sameDayItems().length;
  const total = movedAtBoth().length;
  if (shared === 0) return `Not one of the ${total} shares a single date with the other chain`;
  return `${shared} of the ${total} share even one date with the other chain`;
}

/* ────────────────────────────────────────────────────────────────
 * 09-28 전수 감사 — 「읽는 간격」과 「같이 움직이나」를 손으로 말하지 않는다.
 *
 * 🔴 본문이 "the two Foodstuffs banners are read by hand a fortnight apart"라고
 *    적고 있었다. 세 열 다 주간 자동 수집이다(`scripts/collect_prices_local.sh`).
 *    빈도를 비교하지 않는 이유는 그대로 참이다 — 열마다 관측 수와 창이 다르다.
 *    그 이유를 관측 수로 말한다.
 *
 * 🔴 같은 글이 "you would expect the changes to cluster in time. They do not."라고
 *    단정했는데 같은 표에서 8개 중 4개가 날짜를 공유했다. 변동 **건수**로 세고
 *    비율에 따라 문장이 갈리게 한다.
 * ──────────────────────────────────────────────────────────────── */

/** "17 readings for Woolworths, 11 for Pak'nSave and 7 for New World" */
export function chainReadingsClause(): string {
  const c = chainCoverage();
  const parts = c.map((x, i) => (i === 0 ? `${x.readings} readings for ${x.chain}` : `${x.readings} for ${x.chain}`));
  return parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** 두 체인에서 다 움직인 품목의 변동 건수 중, 같은 날 상대 체인도 움직인 건수. */
export function sharedMoves(): { shared: number; total: number } {
  let shared = 0;
  let total = 0;
  for (const r of movedAtBoth()) {
    total += r.w.length + r.p.length;
    shared += r.w.filter((d) => r.p.includes(d)).length + r.p.filter((d) => r.w.includes(d)).length;
  }
  return { shared, total };
}

export function sharedMovesSentence(): string {
  const { shared, total } = sharedMoves();
  return `Counting individual price changes rather than items, ${shared} of the ${total} changes on those items — at either chain — fell on a reading date when the same item also changed at the other.`;
}

/** 「같이 움직인다」는 가설에 대한 판정. 비율에 따라 문장이 갈린다. */
export function clusterVerdict(): string {
  const { shared, total } = sharedMoves();
  if (total === 0) return "There are no changes at both chains to test it on yet.";
  if (shared * 2 < total) {
    return `Most of them do not. What clusters is the *item* more than the date: whatever makes these items reprice is happening at both chains, but more often than not each chain is acting on its own clock.`;
  }
  return `At least half of them do here, so this data does not rule a shared cause out.`;
}
