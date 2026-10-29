import { PORTION_BASIS } from "@/lib/planConfig";
import { packPrice, servePrice, packServes, money } from "@/lib/servePrice";

/**
 * 「팩 값」과 「도시락 1인분 값」의 차이를 재는 한 벌.
 * `content/posts.ts`의 1인분 원가 글이 쓰는 숫자가 전부 여기서 나온다.
 *
 * 🔴 왜 이게 쓸 수 있는 데이터인가 — `PORTION_BASIS`는 2026-09-07에 팩 크기를
 *    **상품 API로 확인해** 적은 것이고, serve는 factor에서 역산하지 않고
 *    "도시락 1인분이 얼마인가"를 먼저 적은 뒤 안 맞는 다섯 건의 factor를 고쳤다.
 *    역산이었다면 이 글의 모든 표가 순환논증이 된다.
 *
 * 🔴 값을 손으로 적지 말 것. 팩값은 주간 크론이 갱신하므로 본문에 박은 금액은 낡는다.
 *
 * 🔴 가격 캐시에 없는 키는 **건너뛴다**(던지지 않는다). 크론이 키 하나를 놓치면
 *    사이트 빌드가 통째로 죽는 것보다 표가 179줄이 되는 편이 낫고, 개수를 본문에서
 *    생성하므로 179줄이어도 거짓말이 되지 않는다. 대신 **가드가 0건을 확인한다** —
 *    조용히 줄어드는 걸 막는 건 폴백 금지가 아니라 세는 가드다.
 */

export type PortionRow = {
  key: string;
  /** 상점이 실제로 파는 팩 표기 — "500g" · "12pack" · "per kg" */
  pack: string;
  /** 도시락 하나에 들어가는 양 — "30g" · "2ea" */
  serve: string;
  packCost: number;
  serveCost: number;
  /** 팩 하나에서 나오는 1인분 개수(내림) */
  serves: number;
};

/** 가격을 붙일 수 있는 모든 재료. 붙일 수 없는 키는 빠진다 — 개수는 `pricedCount()`. */
export function portionRows(): PortionRow[] {
  const out: PortionRow[] = [];
  for (const [key, basis] of Object.entries(PORTION_BASIS)) {
    let packCost: number;
    try {
      packCost = packPrice(key);
    } catch {
      continue;
    }
    out.push({
      key,
      pack: basis.pack,
      serve: basis.serve,
      packCost,
      serveCost: servePrice(key),
      serves: packServes(key),
    });
  }
  return out;
}

export function pricedCount(): number {
  return portionRows().length;
}

/** `PORTION_BASIS`에 있지만 값을 못 붙인 키. 가드가 이게 비어 있는지 본다. */
export function unpricedKeys(): string[] {
  const priced = new Set(portionRows().map((r) => r.key));
  return Object.keys(PORTION_BASIS).filter((k) => !priced.has(k));
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function medianPack(): number {
  return median(portionRows().map((r) => r.packCost));
}

export function medianServe(): number {
  return median(portionRows().map((r) => r.serveCost));
}

export function medianServes(): number {
  return median(portionRows().map((r) => r.serves));
}

export function packTotal(): number {
  return portionRows().reduce((a, r) => a + r.packCost, 0);
}

export function serveTotal(): number {
  return portionRows().reduce((a, r) => a + r.serveCost, 0);
}

/** 팩값 순위와 1인분값 순위를 각각 매긴다(1 = 가장 비쌈). */
function ranks(): { byPack: Map<string, number>; byServe: Map<string, number> } {
  const rows = portionRows();
  const byPack = new Map(
    [...rows].sort((a, b) => b.packCost - a.packCost).map((r, i) => [r.key, i + 1] as const),
  );
  const byServe = new Map(
    [...rows].sort((a, b) => b.serveCost - a.serveCost).map((r, i) => [r.key, i + 1] as const),
  );
  return { byPack, byServe };
}

/**
 * 팩값 순위와 1인분값 순위의 스피어만 상관.
 * 1이면 매대 가격이 도시락 가격을 그대로 말해주는 것이고, 0이면 아무 말도 안 하는 것이다.
 */
export function rankCorrelation(): number {
  const rows = portionRows();
  const { byPack, byServe } = ranks();
  const n = rows.length;
  const d2 = rows.reduce((a, r) => a + (byPack.get(r.key)! - byServe.get(r.key)!) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}

/**
 * 두 순위가 **중앙값을 사이에 두고 갈리는** 재료. 순위 차이를 그냥 세면
 * 180개 중 한두 칸씩 어긋난 것까지 다 잡혀 「거의 전부 틀렸다」가 되어 버린다.
 * 여기서 세는 건 "매대에서 싼 축인데 도시락에선 비싼 축" 같은 **편이 바뀐 것**뿐이다.
 */
export function misranked(): { cheapLookingDear: PortionRow[]; dearLookingCheap: PortionRow[] } {
  const rows = portionRows();
  const { byPack, byServe } = ranks();
  const half = rows.length / 2;
  return {
    cheapLookingDear: rows
      .filter((r) => byPack.get(r.key)! > half && byServe.get(r.key)! <= half)
      .sort((a, b) => b.serveCost - a.serveCost),
    dearLookingCheap: rows
      .filter((r) => byPack.get(r.key)! <= half && byServe.get(r.key)! > half)
      .sort((a, b) => b.packCost - a.packCost),
  };
}

export function misrankedCount(): number {
  const m = misranked();
  return m.cheapLookingDear.length + m.dearLookingCheap.length;
}

function tableOf(rows: PortionRow[], n: number): string {
  return rows
    .slice(0, n)
    .map(
      (r) =>
        `| ${r.key} | ${r.pack} | ${money(r.packCost)} | ${r.serve} | ${money(r.serveCost)} | ${r.serves} |`,
    )
    .join("\n");
}

export function cheapLookingTable(n = 6): string {
  return tableOf(misranked().cheapLookingDear, n);
}

export function dearLookingTable(n = 6): string {
  return tableOf(misranked().dearLookingCheap, n);
}

/**
 * 팩이 `threshold`를 넘는 것 중 1인분이 `cheapUnder` 미만인 개수.
 * 🔴 본문이 임계값을 **손으로 적지 않도록** 라벨을 같이 돌려준다 —
 *    숫자와 문장이 따로 놀면 둘 중 하나가 반드시 낡는다.
 */
export function dearPacksCheapServes(
  threshold = 5,
  cheapUnder = 0.5,
): { packs: number; cheap: number; packLabel: string; serveLabel: string } {
  const rows = portionRows().filter((r) => r.packCost > threshold);
  return {
    packs: rows.length,
    cheap: rows.filter((r) => r.serveCost < cheapUnder).length,
    packLabel: money(threshold),
    serveLabel: `${Math.round(cheapUnder * 100)}c`,
  };
}

/** 팩 하나가 사실상 1인분인 재료의 수 — 「싸 보이는데 비싼」 함정이 전부 여기 있다. */
export function singleServeCount(): number {
  return portionRows().filter((r) => r.serves <= 2).length;
}

/** 재료 한 줄을 이름으로 찾는다. 없으면 던진다 — 본문이 조용히 빈칸이 되지 않게. */
export function rowOf(key: string): PortionRow {
  const row = portionRows().find((r) => r.key === key);
  if (!row) {
    throw new Error(
      `1인분 원가 글: "${key}"가 PORTION_BASIS나 가격 캐시에 없다. ` +
        `본문이 이 재료를 이름으로 부르고 있으므로 이름을 같이 고칠 것.`,
    );
  }
  return row;
}

/** 1인분이 가장 비싼 재료 한 줄. */
export function dearestServe(): PortionRow {
  return [...portionRows()].sort((a, b) => b.serveCost - a.serveCost)[0];
}

/** 팩 하나가 몇 인분인지의 분포 표. */
export function servesSpreadTable(): string {
  const buckets: Array<[string, (n: number) => boolean]> = [
    ["1–2", (n) => n <= 2],
    ["3–5", (n) => n >= 3 && n <= 5],
    ["6–10", (n) => n >= 6 && n <= 10],
    ["11–25", (n) => n >= 11 && n <= 25],
    ["26 or more", (n) => n >= 26],
  ];
  const rows = portionRows();
  return buckets
    .map(([label, test]) => {
      const hit = rows.filter((r) => test(r.serves));
      return `| ${label} | ${hit.length} |`;
    })
    .join("\n");
}

/* ────────────────────────────────────────────────────────────────────────────
 * 「반복해서 내는 값」 (2026-09-11 신설)
 *
 * 🔴 이 글은 "knowing which line in the trolley is the one you are paying for
 *    repeatedly"로 끝나면서 **반복을 한 번도 재지 않았다.** 팩과 1인분만 있었다.
 *    메뉴 94개가 어느 재료를 몇 번 쓰는지는 우리가 이미 가진 데이터다 —
 *    그걸 1인분 값과 곱하면 「비싸다」의 세 번째 답이 나오고, 셋이 서로 다르다.
 *
 * 🔴 상관을 과장하지 않는다. 등장 횟수와 1인분 값의 순위상관은 −0.1대로 **없다.**
 *    중앙값은 갈리지만 자주 쓰는 재료가 21개뿐이라 패턴이라고 부를 수 없다.
 *    본문이 그 두 문장을 다 말한다.
 *
 * 🔴 가격을 못 붙이는 재료는 세지 않는다. 몇 개를 못 셌는지 본문이 밝힌다 —
 *    조용히 빠지면 「전체 재료 비용」이 실제보다 작아진다.
 * ──────────────────────────────────────────────────────────────────────────── */

import menuDataJson from "@/data/menuData.json";

type MenuRow = { name: string; ingredients: string[] };
const MENUS = (menuDataJson as unknown as { MENU_DATA: { en: MenuRow[] } }).MENU_DATA.en;

/** 한 메뉴 안에서 같은 재료가 두 번 나와도 한 번으로 센다. */
const menuUseCounts = () => {
  const uses = new Map<string, number>();
  for (const m of MENUS) {
    for (const i of new Set(m.ingredients)) uses.set(i, (uses.get(i) ?? 0) + 1);
  }
  return uses;
};

export type ExposureRow = {
  key: string;
  /** 이 재료를 쓰는 메뉴 수 */
  menus: number;
  serveCost: number;
  packCost: number;
  /** 메뉴 수 × 1인분 값 — 메뉴 전체를 한 번씩 만들 때 이 재료에 내는 돈 */
  exposure: number;
};

export function exposureRows(): ExposureRow[] {
  const uses = menuUseCounts();
  const byKey = new Map(portionRows().map((r) => [r.key, r]));
  return [...uses.entries()]
    .filter(([k]) => byKey.has(k))
    .map(([k, menus]) => {
      const r = byKey.get(k)!;
      return { key: k, menus, serveCost: r.serveCost, packCost: r.packCost, exposure: menus * r.serveCost };
    })
    .sort((a, b) => b.exposure - a.exposure);
}

export const menusCounted = () => MENUS.length;
export const usedAndPricedCount = () => exposureRows().length;
/** 메뉴가 쓰는데 값을 못 붙인 재료 수 — 본문이 밝힌다. */
export const usedUnpricedCount = () => {
  const priced = new Set(portionRows().map((r) => r.key));
  return new Set(MENUS.flatMap((m) => m.ingredients).filter((k) => !priced.has(k))).size;
};

export const exposureTotal = () => exposureRows().reduce((s, r) => s + r.exposure, 0);
export function exposureShare(n: number): number {
  const t = exposureTotal();
  if (t <= 0) return 0;
  return Math.round((exposureRows().slice(0, n).reduce((s, r) => s + r.exposure, 0) / t) * 100);
}

export function exposureTable(n: number): string {
  return exposureRows()
    .slice(0, n)
    .map((r) => `| ${r.key} | ${r.menus} | ${money(r.serveCost)} | **${money(r.exposure)}** |`)
    .join("\n");
}

/** 「비싸다」의 세 답. 세 행이 서로 다르다는 것이 이 절의 논지다. */
export function threeAnswers() {
  const rows = exposureRows();
  const pick = (f: (r: ExposureRow) => number) => [...rows].sort((a, b) => f(b) - f(a))[0];
  return {
    pack: pick((r) => r.packCost),
    serve: pick((r) => r.serveCost),
    exposure: rows[0],
    mostUsed: [...rows].sort((a, b) => b.menus - a.menus)[0],
  };
}

/** 세 답이 서로 다른 재료인가. 같아지면 절의 논지가 사라지므로 문장이 바뀌어야 한다. */
export const threeAnswersDiffer = () => {
  const a = threeAnswers();
  return new Set([a.pack.key, a.serve.key, a.exposure.key]).size === 3;
};

/** 등장 횟수와 1인분 값의 순위상관(스피어만). 동점은 평균 순위로. */
export function menuCountVsServeCorr(): number {
  const rows = exposureRows();
  const rank = (v: number[]) => {
    const s = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
    const out = new Array(v.length).fill(0);
    let i = 0;
    while (i < s.length) {
      let j = i;
      while (j + 1 < s.length && s[j + 1][0] === s[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) out[s[k][1]] = avg;
      i = j + 1;
    }
    return out;
  };
  const a = rank(rows.map((r) => r.menus));
  const b = rank(rows.map((r) => r.serveCost));
  const n = rows.length;
  if (n < 3) return 0;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}

const mid = (xs: number[]) => {
  const s = [...xs].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** 자주 쓰는 재료와 드물게 쓰는 재료의 1인분 값 중앙값. */
export const COMMON_MENUS = 5;
export function commonVsRare() {
  const rows = exposureRows();
  const common = rows.filter((r) => r.menus >= COMMON_MENUS);
  const rare = rows.filter((r) => r.menus < COMMON_MENUS);
  return {
    threshold: COMMON_MENUS,
    commonN: common.length,
    rareN: rare.length,
    commonMedian: common.length ? mid(common.map((r) => r.serveCost)) : 0,
    rareMedian: rare.length ? mid(rare.map((r) => r.serveCost)) : 0,
  };
}

/** 가장 많이 쓰는 재료가 「반복 비용」 순위에서 몇 등인가. */
export function mostUsedExposureRank(): number {
  const rows = exposureRows();
  const mostUsed = [...rows].sort((a, b) => b.menus - a.menus)[0];
  return rows.findIndex((r) => r.key === mostUsed.key) + 1;
}
