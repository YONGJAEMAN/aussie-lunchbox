import history from "@/data/priceHistory.json";

/**
 * 가격 이력을 **그릴 수 있는 형태**로 내주는 단 하나의 자리.
 *
 * 🔴 왜 있나 (2026-09-18) — `priceHistory.json` 에는 세 체인 27개 라운드가 쌓여
 *    있는데 사이트는 **이번 주 스냅숏만** 보여주고 있었다. NZ에서 고정 SKU로
 *    세 체인을 넉 달 추적한 공개 데이터는 우리 말고 없는데 90%가 안 나가 있었다.
 *
 * 🔴 **그냥 이으면 거짓이 된다.** 데이터를 실제로 세어 보고 알게 된 것 셋:
 *
 *    1. **SKU가 중간에 바뀐 품목이 있다.** `Wraps 8-pack`(5/16~8/11) 다음에
 *       `Wraps 6-pack`(8/12~)이 온다. 한 선으로 이으면 8개들이와 6개들이를
 *       같은 상품으로 보여주게 된다. → 다른 계열로 둔다.
 *    2. **모든 품목이 세 열에 다 있지는 않다.** Bread·Cheese 는 New World 관측이
 *       0이다. 없는 열을 0으로 세면 2026-08-12 사고("$28.50 절약")가 되풀이된다.
 *    3. **관측 간격이 고르지 않다.** Pak'nSave 는 5/16 한 번 뒤 8/10까지 공백이고,
 *       New World 는 8/17부터다. **「매주 넉 달」이라고 말하면 안 된다.**
 *
 * 점 하나 = 그 열이 **실제로 그 날짜에 관측한 값**이다. 빠진 주는 점이 없다.
 * 보간하지 않는다 — 안 재 본 날의 값을 그리는 것이기 때문이다.
 */

export type Chain = "woolworths" | "paknsave" | "newworld";
export const CHAINS: Chain[] = ["woolworths", "paknsave", "newworld"];

type Round = { date: string; items: Record<string, number> };
const COLUMNS = (history as unknown as { columns: Record<Chain, Round[]> }).columns;

export type Point = { date: string; price: number };
export type ItemSeries = { item: string; byChain: Record<Chain, Point[]> };

const allItems = (): string[] => {
  const s = new Set<string>();
  for (const rounds of Object.values(COLUMNS)) for (const r of rounds) for (const k of Object.keys(r.items)) s.add(k);
  return [...s].sort();
};

export function seriesFor(item: string): ItemSeries {
  const byChain = {} as Record<Chain, Point[]>;
  for (const c of CHAINS) {
    byChain[c] = (COLUMNS[c] ?? [])
      /**
       * 🔴 **0 이하는 가격이 아니라 「안 재었다」이다.** 2026-08-12에 없는 열을 0으로
       *    세는 바람에 "You save at Pak'nSave $28.50"이 라이브로 나갔다(실제 $4.99).
       *    돌연변이로 확인했다(2026-09-18): New World 에 0을 넣었더니 그 품목이
       *    **「관측 없는 열」에서 빠져** 검사 대상이 아니게 됐다 — 가드가 알리바이였다.
       *    그래서 여기서 **들어오는 단계에서** 떨어뜨린다.
       */
      .filter((r) => typeof r.items[item] === "number" && r.items[item] > 0)
      .map((r) => ({ date: r.date, price: r.items[item] }));
  }
  return { item, byChain };
}

/** 그 품목을 실제로 관측한 횟수(세 열 합). */
export const observationCount = (item: string): number =>
  CHAINS.reduce((n, c) => n + seriesFor(item).byChain[c].length, 0);

/**
 * 🔴 **싣는 기준.** 한 열에서라도 3회 이상 관측된 품목만 계열로 낸다.
 *    1~2회짜리는 추이가 아니라 점이다. 추이라고 부르면 안 된다.
 */
export const MIN_POINTS = 3;
export const seriesItems = (): string[] =>
  allItems().filter((it) => CHAINS.some((c) => seriesFor(it).byChain[c].length >= MIN_POINTS));

/** 세 열 전부에서 MIN_POINTS 이상 관측된 품목 — 매장 비교까지 되는 뼈대. */
export const fullSpanItems = (): string[] =>
  allItems().filter((it) => CHAINS.every((c) => seriesFor(it).byChain[c].length >= MIN_POINTS));

/** 그 열에서 한 번도 관측 안 된 품목. 없는 열을 0으로 세지 않기 위해 밖으로 낸다. */
export const missingChains = (item: string): Chain[] =>
  CHAINS.filter((c) => seriesFor(item).byChain[c].length === 0);

/** 열별 관측 범위와 횟수. 「매주」라고 말하지 않기 위한 근거다. */
export function coverage(): { chain: Chain; rounds: number; first: string; last: string }[] {
  return CHAINS.map((c) => {
    const rs = COLUMNS[c] ?? [];
    return { chain: c, rounds: rs.length, first: rs[0]?.date ?? "", last: rs[rs.length - 1]?.date ?? "" };
  });
}

/**
 * 🔴 **SKU가 갈린 쌍.** 이름이 `무엇 (용량)` 또는 `무엇 N-pack` 꼴이라,
 *    괄호/개수를 뗀 몸통이 같은데 관측 구간이 겹치지 않으면 **교체된 것**이다.
 *    자동으로 잇지 않는다 — 같은 상품이 아니라고 화면에 적기 위해 뽑는다.
 */
const stem = (s: string) => s.replace(/\s*\(([^)]*)\)\s*$/, "").replace(/\s+\d+-pack$/, "").trim();
export function skuChanges(): { stem: string; from: string; to: string; fromLast: string; toFirst: string }[] {
  const byStem = new Map<string, string[]>();
  for (const it of allItems()) byStem.set(stem(it), [...(byStem.get(stem(it)) ?? []), it]);
  const out: { stem: string; from: string; to: string; fromLast: string; toFirst: string }[] = [];
  for (const [st, names] of byStem) {
    if (names.length < 2) continue;
    const spans = names
      .map((n) => {
        const pts = CHAINS.flatMap((c) => seriesFor(n).byChain[c]).map((p) => p.date).sort();
        return { n, first: pts[0], last: pts[pts.length - 1] };
      })
      .filter((s) => s.first)
      .sort((a, b) => a.first.localeCompare(b.first));
    for (let i = 0; i + 1 < spans.length; i++) {
      if (spans[i].last < spans[i + 1].first) {
        out.push({ stem: st, from: spans[i].n, to: spans[i + 1].n, fromLast: spans[i].last, toFirst: spans[i + 1].first });
      }
    }
  }
  return out.sort((a, b) => a.stem.localeCompare(b.stem));
}

/** 첫 관측 → 마지막 관측 변동. 관측이 2회 미만이면 null — 변동이 없는 게 아니라 **모르는 것**이다. */
export function changeSince(item: string, chain: Chain): { from: Point; to: Point; pct: number } | null {
  const pts = seriesFor(item).byChain[chain];
  if (pts.length < 2) return null;
  const from = pts[0], to = pts[pts.length - 1];
  if (!(from.price > 0)) return null;
  return { from, to, pct: ((to.price - from.price) / from.price) * 100 };
}

/**
 * 첫 관측 이후 가장 크게 움직인 품목 몇 개를 **문장으로** 낸다.
 *
 * 🔴 왜 있나 (2026-09-19) — `budget-friendly-lunchbox-ideas-nz` 가 물가를 말하는 자리에서
 *    Stats NZ 2022~2025 총계를 인용하고 있었다. 맞는 인용이지만 **누구나 쓸 수 있는 문장**이고,
 *    구글이 그 글을 읽고 색인하지 않기로 한 이유와 무관하지 않다.
 *    우리는 같은 상품을 같은 매장에서 직접 재고 있다 — 그걸 말하는 게 우리 몫이다.
 *
 * ⚠️ **첫 관측일은 품목마다 다르다.** 열이 나중에 추가됐기 때문이다.
 *    그래서 「5월 이후」라고 뭉뚱그리지 않고 **그 품목의 첫 관측일을 같이 낸다.**
 */
export function topMovers(n = 3): { item: string; chain: Chain; from: Point; to: Point; pct: number }[] {
  const out: { item: string; chain: Chain; from: Point; to: Point; pct: number }[] = [];
  for (const item of fullSpanItems()) {
    /**
     * 🔴 **가장 오래 따라간 열** = 첫 관측이 가장 이른 열이다.
     *    처음엔 관측 **횟수**로 골랐는데, 그러면 7/30에 시작한 Woolworths(13회)가
     *    5/16에 시작한 Pak'nSave(9회)를 이겨서 **넉 달짜리 기록을 버리고** 두 달치를
     *    말하게 된다. 같은 수 관측이면 더 자주 잰 쪽을 쓴다.
     */
    const chain = CHAINS.slice()
      .filter((c) => seriesFor(item).byChain[c].length >= 2)
      .sort((a, b) => {
        const fa = seriesFor(item).byChain[a][0].date, fb = seriesFor(item).byChain[b][0].date;
        if (fa !== fb) return fa < fb ? -1 : 1;
        return seriesFor(item).byChain[b].length - seriesFor(item).byChain[a].length;
      })[0];
    if (!chain) continue;
    const ch = changeSince(item, chain);
    if (ch) out.push({ item, chain, ...ch });
  }
  return out.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, n);
}

const bare = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, "").toLowerCase();

/** 글 본문에 그대로 넣는 한 문장. 관측이 모자라면 빈 문자열 — 없는 말을 지어내지 않는다. */
export function moversSentence(n = 3): string {
  const m = topMovers(n);
  if (m.length === 0) return "";
  const parts = m.map(
    (x) => `${bare(x.item)} ${x.pct > 0 ? "rose" : "fell"} ${Math.abs(Math.round(x.pct))}% ` +
           `($${x.from.price.toFixed(2)} to $${x.to.price.toFixed(2)}, first read ${x.from.date})`,
  );
  const last = parts.pop() as string;
  return parts.length ? `${parts.join("; ")}; and ${last}.` : `${last}.`;
}
