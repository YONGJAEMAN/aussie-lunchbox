import type { AllergyType, PrepStyle } from "./types";
import type { StoreId, Island } from "@/data/promotions.types";
import { PORTION_BANDS, DEFAULT_PORTION_BAND, MAX_LUNCHBOXES, type PortionBand } from "./portionBands";

/**
 * 공유 링크 `?plan=` 인코딩 (2026-09-29).
 *
 * DB 없이 URL 하나에 식단을 싣는다: 다섯 날의 메뉴·간식 **이름**과, 그 식단을 다시
 * 가격 매기고 이후 하루 교체에 쓸 필터. 메뉴에는 안정 id가 없다(`menuData.json`은
 * 이름뿐이고 `menuIndex`는 배열 위치라 데이터가 바뀌면 다른 메뉴를 가리킨다).
 *
 * 🔴 이 파일은 **클라이언트 번들**에 들어간다 — 메뉴 데이터·가격 캐시를 import하지 말 것.
 *    여기서는 모양만 본다. 이름이 실제로 있는지는 서버의 `resolveWeek`가 본다.
 */

/** 인덱스로 싣는 값들. **순서를 바꾸지 말 것** — 이미 나간 링크의 뜻이 바뀐다. 새 값은 끝에만 붙인다. */
export const SHARE_ALLERGIES: readonly AllergyType[] = [
  "Nut Allergy", "Dairy Allergy", "Gluten Allergy", "Egg Allergy", "Vegetarian", "Vegan",
  "Kindy", // 2026-10-12
  "Sesame Allergy", // 2026-10-22
];
export const SHARE_PREP: readonly PrepStyle[] = ["no-cook", "make-ahead", "cook-fresh"];
export const SHARE_STORES: readonly StoreId[] = ["paknsave", "woolworths", "newworld"];

/** `?plan=` 값의 최대 길이. 넘는 입력은 풀어 보지도 않는다. */
export const SHARE_PARAM_MAX = 2000;
const NAME_MAX = 60;
const EXCLUDED_MAX = 50;
const NAME_RE = /^[\p{L}\p{N} &'/().,+-]+$/u;

export type WeekDayNames = { menu: string; snacks: string[] };

export type SharedPlan = {
  days: WeekDayNames[];
  allergies: AllergyType[];
  excluded: string[];
  prepStyles: PrepStyle[];
  thermosOnly: boolean;
  useSales: boolean;
  saleStores: StoreId[];
  /**
   * 나이대별 양(2026-10-12). 키 `b` = `PORTION_BANDS`의 인덱스.
   * **생략 = standard** — 옛 링크와 기준 식단은 이 필드가 없다(해독 결과도 이 기능 전과 같은 모양).
   */
  band?: PortionBand;
  /**
   * 같은 식단을 더 싸는 도시락(2번부터)의 나이대(2026-10-26). 키 `k` = `PORTION_BANDS` 인덱스 배열.
   * **생략 = 도시락 한 개** — 옛 링크·한 개짜리 링크는 이 필드가 없다(문자열도 이 기능 전과 같다).
   * 아이 둘이 같은 나이일 수 있으므로 중복과 standard(0)를 허용한다.
   */
  extraBoxes?: PortionBand[];
  /**
   * 도시락을 싸는 요일(2026-10-26). 키 `w` = 월(1)·화(2)·수(4)·목(8)·금(16) 비트 합.
   * **생략 = 다섯 날 전부** — 31은 싣지 않는다(같은 식단에 링크가 두 개 생기지 않게).
   */
  lunchDays?: boolean[];
  /**
   * 전단을 고른 섬(2026-10-27). 키 `i` = 1(남섬)만.
   * **생략 = north** — 옛 링크는 전부 북섬이다(문자열도 이 기능 전과 같다).
   */
  island?: Island;
};

export const ALL_LUNCH_DAYS: readonly boolean[] = [true, true, true, true, true];

/** 신뢰하지 않는 입력 → 요일. 길이 5의 boolean이고 하나 이상 켜졌을 때만 받는다. 아니면 다섯 날 전부. */
export function normalizeLunchDays(v: unknown): boolean[] {
  if (Array.isArray(v) && v.length === 5 && v.every((x) => typeof x === "boolean") && v.some(Boolean)) return [...v];
  return [...ALL_LUNCH_DAYS];
}

const daysMask = (days: readonly boolean[]) => days.reduce((m, on, i) => (on ? m | (1 << i) : m), 0);

function isName(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= NAME_MAX && NAME_RE.test(v);
}

/** 중복 없는 정수 인덱스 배열을 값으로 바꾼다. 하나라도 어긋나면 null. */
function fromIndexes<T>(raw: unknown, table: readonly T[]): T[] | null {
  if (!Array.isArray(raw) || raw.length > table.length) return null;
  const out: T[] = [];
  for (const i of raw) {
    if (!Number.isInteger(i) || i < 0 || i >= table.length) return null;
    if (out.includes(table[i])) return null;
    out.push(table[i]);
  }
  return out;
}

/**
 * 하루 교체 요청의 `week` 모양 검사. 서버 라우트와 링크 해독이 같이 쓴다.
 * 이름이 **있는지**는 여기서 보지 않는다(모양만).
 */
export function sanitizeWeek(raw: unknown): WeekDayNames[] | null {
  if (!Array.isArray(raw) || raw.length !== 5) return null;
  const out: WeekDayNames[] = [];
  for (const d of raw) {
    if (typeof d !== "object" || d === null || Array.isArray(d)) return null;
    const { menu, snacks } = d as { menu?: unknown; snacks?: unknown };
    if (!isName(menu)) return null;
    if (!Array.isArray(snacks) || snacks.length > 2 || !snacks.every(isName)) return null;
    if (new Set(snacks).size !== snacks.length) return null;
    out.push({ menu, snacks: [...snacks] });
  }
  return out;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string | null {
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** 식단 → `?plan=` 값. 너무 길어지면(빼는 재료가 많을 때) null — 풀 수 없는 링크를 만들지 않는다. */
export function encodeSharedPlan(p: SharedPlan): string | null {
  const compact: Record<string, unknown> = {
    v: 1,
    d: p.days.map((d) => [d.menu, ...d.snacks]),
  };
  if (p.allergies.length) compact.a = p.allergies.map((a) => SHARE_ALLERGIES.indexOf(a));
  if (p.excluded.length) compact.x = p.excluded;
  if (p.prepStyles.length) compact.p = p.prepStyles.map((s) => SHARE_PREP.indexOf(s));
  if (p.thermosOnly) compact.t = 1;
  if (p.useSales && p.saleStores.length) compact.s = p.saleStores.map((s) => SHARE_STORES.indexOf(s));
  // standard는 싣지 않는다 — 기준 식단의 링크는 이 기능 전과 **같은 문자열**이다.
  if (p.band !== undefined && p.band !== DEFAULT_PORTION_BAND) compact.b = PORTION_BANDS.indexOf(p.band);
  if (p.extraBoxes?.length) compact.k = p.extraBoxes.map((b) => PORTION_BANDS.indexOf(b));
  if (p.lunchDays && daysMask(p.lunchDays) !== 31) compact.w = daysMask(p.lunchDays);
  if (p.island === "south") compact.i = 1;
  const out = toBase64Url(JSON.stringify(compact));
  // 스스로 못 푸는 값은 내보내지 않는다(범위 밖 인덱스·긴 이름 등).
  return out.length <= SHARE_PARAM_MAX && decodeSharedPlan(out) ? out : null;
}

const ALLOWED_KEYS = new Set(["v", "d", "a", "x", "p", "t", "s", "b", "k", "w", "i"]);

/**
 * `?plan=` 값 → 식단. **신뢰하지 않는 URL 입력이다.** 모양이 조금이라도 어긋나면 null.
 * eval 없음 · JSON.parse만 · 허용 키 밖의 키(`__proto__` 포함)는 거절.
 */
export function decodeSharedPlan(param: unknown): SharedPlan | null {
  if (typeof param !== "string" || param.length === 0 || param.length > SHARE_PARAM_MAX) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(param)) return null;
  const text = fromBase64Url(param);
  if (text === null) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return null;
  const o = obj as Record<string, unknown>;
  if (!Object.keys(o).every((k) => ALLOWED_KEYS.has(k))) return null;
  if (o.v !== 1) return null;

  if (!Array.isArray(o.d)) return null;
  const week = sanitizeWeek(
    o.d.map((row) =>
      Array.isArray(row) && row.length >= 1 && row.length <= 3
        ? { menu: row[0], snacks: row.slice(1) }
        : null,
    ),
  );
  if (!week) return null;

  const allergies = o.a === undefined ? [] : fromIndexes(o.a, SHARE_ALLERGIES);
  const prepStyles = o.p === undefined ? [] : fromIndexes(o.p, SHARE_PREP);
  const saleStores = o.s === undefined ? [] : fromIndexes(o.s, SHARE_STORES);
  if (!allergies || !prepStyles || !saleStores) return null;
  if (o.s !== undefined && saleStores.length === 0) return null;

  let excluded: string[] = [];
  if (o.x !== undefined) {
    if (!Array.isArray(o.x) || o.x.length === 0 || o.x.length > EXCLUDED_MAX || !o.x.every(isName)) return null;
    if (new Set(o.x).size !== o.x.length) return null;
    excluded = [...o.x];
  }
  if (o.t !== undefined && o.t !== 1) return null;

  // 0(standard)은 인코더가 싣지 않는 값이다 — 같은 식단에 링크가 두 개 생기지 않게 거절한다.
  let band: PortionBand | undefined;
  if (o.b !== undefined) {
    if (!Number.isInteger(o.b) || (o.b as number) < 1 || (o.b as number) >= PORTION_BANDS.length) return null;
    band = PORTION_BANDS[o.b as number];
  }

  // 빈 배열은 인코더가 싣지 않는 값이다 — 한 개짜리 식단에 링크가 두 개 생기지 않게 거절한다.
  let extraBoxes: PortionBand[] | undefined;
  if (o.k !== undefined) {
    if (!Array.isArray(o.k) || o.k.length < 1 || o.k.length > MAX_LUNCHBOXES - 1) return null;
    if (!o.k.every((i) => Number.isInteger(i) && i >= 0 && i < PORTION_BANDS.length)) return null;
    extraBoxes = o.k.map((i) => PORTION_BANDS[i as number]);
  }

  // 0 = 싸는 날 없음(뜻 없는 식단) · 31 = 다섯 날 전부(인코더가 싣지 않는 값) — 둘 다 거절한다.
  let lunchDays: boolean[] | undefined;
  if (o.w !== undefined) {
    if (!Number.isInteger(o.w) || (o.w as number) < 1 || (o.w as number) > 30) return null;
    lunchDays = [0, 1, 2, 3, 4].map((i) => ((o.w as number) & (1 << i)) !== 0);
  }

  // north는 인코더가 싣지 않는 값이다 — 1(남섬) 말고는 거절한다.
  if (o.i !== undefined && o.i !== 1) return null;

  return {
    days: week,
    allergies,
    excluded,
    prepStyles,
    thermosOnly: o.t === 1,
    useSales: saleStores.length > 0,
    saleStores,
    ...(band ? { band } : {}),
    ...(extraBoxes ? { extraBoxes } : {}),
    ...(lunchDays ? { lunchDays } : {}),
    ...(o.i === 1 ? { island: "south" as const } : {}),
  };
}
