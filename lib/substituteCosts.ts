import { PORTION_BASIS, PORTION_FACTORS, DEFAULT_PORTION } from "@/lib/planConfig";
import { packPrice, money } from "@/lib/servePrice";
import { parsePack } from "@/lib/recipeCost";
import menuDataJson from "@/data/menuData.json";
import priceCache from "@/data/price_cache.json";

/**
 * 「free-from 제품이 일반 제품보다 얼마나 비싼가」를 **단위당 가격**으로 잰다.
 *
 * 🔴 **1인분으로 재면 안 된다.** 두 제품의 1인분 크기가 다르기 때문이다 —
 *    DF 페스토는 10g, 일반 페스토는 15g이 1인분이라 1인분끼리 비교하면
 *    "DF가 61% 싸다"가 나온다. 같은 양을 살 때 얼마인지가 물어야 할 질문이다.
 *
 * 🔴 **비교 상대를 하나만 고르면 그게 곧 체리피킹이다.** GF 파스타의 상대를
 *    Pasta($2.99/500g)로 잡느냐 Macaroni($1.49/500g)로 잡느냐에 따라 배수가
 *    1.8배에서 3.6배까지 움직인다. 그래서 **추적 중인 일반 제품을 전부 넣고
 *    중앙값**과 비교하고, 본문이 그 목록을 그대로 보여준다.
 *
 * 🔴 **자연적으로 그 성분이 없는 제품은 비교군에서 뺀다.** 쌀 크래커는 원래
 *    글루텐이 없으므로 "일반 크래커"가 아니다. 넣으면 GF 프리미엄이 저절로 줄어든다.
 */

export type SwapPair = {
  /** 대체품 키 */
  free: string;
  /** 비교군 — 추적 중인 일반 제품 전부 */
  standard: string[];
  /** 무엇을 뺀 제품인가 */
  kind: string;
};

/**
 * 짝은 손으로 정한다. 이름 규칙으로 자동 매칭하면 "Rice Crackers"처럼
 * 원래 글루텐이 없는 것이 비교군에 섞여 들어간다.
 *
 * ⚠️ 단위가 다르면(`g` vs `mL`) 짝이 될 수 없다 — 그래서 Vegan Mayo의 상대는
 *    405g짜리 `Mayo`가 아니라 340mL짜리 `Mayonnaise` 하나뿐이다.
 */
export const SWAP_PAIRS: SwapPair[] = [
  { free: "Gluten-Free Bread", standard: ["Bread"], kind: "gluten-free" },
  {
    free: "GF Pasta",
    standard: ["Pasta", "Pasta spirals", "Macaroni", "Spaghetti"],
    kind: "gluten-free",
  },
  { free: "GF Crackers", standard: ["Crackers", "Wholegrain Crackers"], kind: "gluten-free" },
  { free: "Gluten-Free Flour", standard: ["Flour", "Plain Flour"], kind: "gluten-free" },
  { free: "Plant Milk", standard: ["Milk"], kind: "dairy-free" },
  { free: "Vegan Mayo", standard: ["Mayonnaise"], kind: "egg-free" },
  { free: "Dairy-Free Pesto", standard: ["Pesto"], kind: "dairy-free" },
];

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** 100g 또는 100mL당 가격. 팩 표기를 못 읽거나 개수 단위면 던진다. */
function per100(key: string): { price: number; size: number; unit: "g" | "ml" } {
  const basis = PORTION_BASIS[key];
  if (!basis) throw new Error(`대체품 비교: "${key}"의 팩 크기 근거가 없다`);
  const pack = parsePack(basis.pack);
  if (pack.unit === "ea") {
    throw new Error(`대체품 비교: "${key}"는 개수 단위라 100g당 값을 못 만든다`);
  }
  return { price: (packPrice(key) / pack.n) * 100, size: pack.n, unit: pack.unit };
}

export type SwapRow = {
  free: string;
  kind: string;
  freePack: string;
  freePer100: number;
  unit: "g" | "ml";
  standard: string[];
  standardPer100: number;
  /** 대체품이 일반 제품 중앙값의 몇 배인가 */
  multiple: number;
  /** 대체품 팩이 일반 제품 팩 중앙값의 몇 배인가 */
  packRatio: number;
};

export function swapRows(): SwapRow[] {
  return SWAP_PAIRS.map((p) => {
    const f = per100(p.free);
    const s = p.standard.map(per100);
    const mismatched = s.find((x) => x.unit !== f.unit);
    if (mismatched) {
      throw new Error(`대체품 비교: "${p.free}"의 비교군에 단위가 다른 제품이 있다`);
    }
    const standardPer100 = median(s.map((x) => x.price));
    return {
      free: p.free,
      kind: p.kind,
      freePack: PORTION_BASIS[p.free].pack,
      freePer100: f.price,
      unit: f.unit,
      standard: p.standard,
      standardPer100,
      multiple: f.price / standardPer100,
      packRatio: f.size / median(s.map((x) => x.size)),
    };
  }).sort((a, b) => b.multiple - a.multiple);
}

export function swapCount(): number {
  return swapRows().length;
}

const u = (r: SwapRow) => (r.unit === "g" ? "100g" : "100mL");

/** 배수 큰 순서. 비교군을 그대로 보여준다 — 짝을 내가 골랐다는 사실이 표에 남아야 한다. */
export function swapTable(): string {
  return swapRows()
    .map(
      (r) =>
        `| ${r.free} (${r.freePack}) | ${r.kind} | ${money(r.freePer100)} / ${u(r)} | ${money(r.standardPer100)} / ${u(r)} | **${r.multiple.toFixed(2)}×** | ${r.standard.join(", ")} |`,
    )
    .join("\n");
}

/** 팩 크기가 일반 제품과 **같은** 짝. 여기서 프리미엄이 가장 작다. */
export function samePackRows(): SwapRow[] {
  return swapRows().filter((r) => Math.abs(r.packRatio - 1) < 0.01);
}

/** 팩이 일반 제품보다 작은 짝. */
export function smallerPackRows(): SwapRow[] {
  return swapRows().filter((r) => r.packRatio < 0.99);
}

/** 일반 제품보다 오히려 싼 짝. */
export function cheaperRows(): SwapRow[] {
  return swapRows().filter((r) => r.multiple < 1);
}

export function dearestRow(): SwapRow {
  return swapRows()[0];
}

/** 팩 크기와 배수를 나란히 놓은 표. 「작은 팩일수록 비싸다」를 눈으로 보게 한다. */
export function packSizeTable(): string {
  return [...swapRows()]
    .sort((a, b) => a.packRatio - b.packRatio)
    .map(
      (r) =>
        `| ${r.free} | ${r.packRatio.toFixed(2)}× | ${r.multiple.toFixed(2)}× |`,
    )
    .join("\n");
}

/**
 * 같은 양을 썼을 때 도시락 하나에 붙는 차액.
 * 🔴 대체품의 1인분이 아니라 **일반 제품의 1인분**을 양쪽에 똑같이 적용한다 —
 *    분량이 다르면 그건 제품 값 차이가 아니라 내 레시피 차이다.
 */
export function perLunchboxExtra(key: string): { serve: number; extra: number; unit: string } {
  const row = swapRows().find((r) => r.free === key);
  if (!row) throw new Error(`대체품 비교: "${key}" 짝이 없다`);
  const std = PORTION_BASIS[row.standard[0]];
  const serve = parsePack(std.serve.replace(/^(\d+(?:\.\d+)?)\s*(g|ml|kg|l)$/i, "$1$2"));
  const extra = ((row.freePer100 - row.standardPer100) / 100) * serve.n;
  return { serve: serve.n, extra, unit: row.unit };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 제품 값이 아니라 **끼니 값**. 대체품이 비싸다고 글루텐프리 한 주가 그만큼
 * 비싸지는 것은 아니다 — 밀을 대체하지 않고 원래 밀이 없던 요리를 고르면 된다.
 *
 * 🔴 이건 **관찰**이지 실험이 아니다. 우리 메뉴 94개가 어쩌다 그렇게 구성된
 *    결과이지, "글루텐프리가 싸다"는 뜻이 아니다. 본문이 그렇게 못박는다.
 * ──────────────────────────────────────────────────────────────────────────── */

type Menu = { name: string; ingredients: string[]; is_gluten_free?: boolean };
const MENUS = (menuDataJson as unknown as { MENU_DATA: { en: Menu[] } }).MENU_DATA.en;
const CACHE = priceCache as Record<string, { data?: { price?: number } }>;

const menuCost = (m: Menu) =>
  m.ingredients.reduce((t, i) => {
    const p = CACHE[i]?.data?.price;
    return t + (typeof p === "number" && p > 0 ? p : 0) * (PORTION_FACTORS[i] ?? DEFAULT_PORTION);
  }, 0);

/** 대체품을 쓰는 재료인가 — `SWAP_PAIRS`의 대체품 목록에 GF 소시지를 더한다. */
const SUBSTITUTE_KEYS = new Set([...SWAP_PAIRS.map((p) => p.free), "GF Sausages"]);
const usesSubstitute = (m: Menu) => m.ingredients.some((i) => SUBSTITUTE_KEYS.has(i));

export function menuTotal(): number {
  return MENUS.length;
}

export function gfMenus(): Menu[] {
  return MENUS.filter((m) => m.is_gluten_free);
}

export function gfMedian(): number {
  return median(gfMenus().map(menuCost));
}

export function otherMedian(): number {
  return median(MENUS.filter((m) => !m.is_gluten_free).map(menuCost));
}

/** 글루텐프리 메뉴 중 **대체품을 사서** 만드는 것. */
export function swapMenus(): Array<{ name: string; cost: number; subs: string[] }> {
  return gfMenus()
    .filter(usesSubstitute)
    .map((m) => ({
      name: m.name,
      cost: menuCost(m),
      subs: m.ingredients.filter((i) => SUBSTITUTE_KEYS.has(i)),
    }))
    .sort((a, b) => b.cost - a.cost);
}

/** 글루텐프리 메뉴 중 **원래 밀이 없던** 것. */
export function naturalGfMenus(): Array<{ name: string; cost: number }> {
  return gfMenus()
    .filter((m) => !usesSubstitute(m))
    .map((m) => ({ name: m.name, cost: menuCost(m) }))
    .sort((a, b) => a.cost - b.cost);
}

export function swapMenuMedian(): number {
  return median(swapMenus().map((m) => m.cost));
}

export function naturalGfMedian(): number {
  return median(naturalGfMenus().map((m) => m.cost));
}

/* ────────────────────────────────────────────────────────────────────────────
 * 라벨 차원 (2026-09-11 신설)
 *
 * 🔴 이 글은 **값만** 말하고 있었다. 그런데 free-from 제품을 살 때 실제로 위험한 것은
 *    값이 아니라 「무엇이 없다」는 이름이 **무엇이 있는지**를 안 말한다는 점이다.
 *    라벨을 읽어 보면 이 짝들에서 그게 실제로 일어난다:
 *      · Vogel's 글루텐프리 빵은 **달걀을 선언**한다 (일반 빵은 안 한다)
 *      · MilkLab 오트 「Plant Milk」는 **글루텐을 선언**한다 (유제품프리인데)
 *      · 쌀가루는 선언은 없지만 **땅콩·트리넛·우유·참깨 주의**가 붙는다 (일반 밀가루는 없다)
 *
 * 🔴 **다섯 알레르겐만 분류한다**(`ALLERGEN_PATTERNS`). 콩·루핀·아황산염은 라벨에
 *    있어도 여기서 세지 않는다 — 학교 도시락에서 실제로 문제되는 것만 본다.
 *    글이 그 한계를 밝힌다. 조용히 좁히면 「추가된 것 없음」이 거짓이 된다.
 *
 * 🔴 **라벨이 없는 제품을 「깨끗하다」고 읽지 않는다.** GF Pasta는 상품 페이지에
 *    알레르겐 항목이 통째로 비어 있다. 그건 없다는 뜻이 아니라 못 봤다는 뜻이다.
 * ──────────────────────────────────────────────────────────────────────────── */

import { labelFor, declares, warnsAbout, ALLERGEN_PATTERNS } from "@/lib/allergenLabels";

type Allergen = keyof typeof ALLERGEN_PATTERNS;
const ALL: Allergen[] = ["nuts", "milk", "egg", "gluten", "sesame"];
const NICE: Record<Allergen, string> = {
  nuts: "nuts", milk: "milk", egg: "egg", gluten: "gluten", sesame: "sesame",
};

/** `kind`("gluten-free")가 빼기로 한 알레르겐. */
const REMOVES: Record<string, Allergen> = {
  "gluten-free": "gluten",
  "dairy-free": "milk",
  "egg-free": "egg",
};

export type SwapLabelRow = {
  free: string;
  kind: string;
  /** 이 제품이 빼기로 한 알레르겐 */
  removes: Allergen;
  /** 상품 페이지에 알레르겐 항목이 있나. 없으면 아무것도 판정하지 않는다. */
  hasLabel: boolean;
  freeDeclared: Allergen[];
  freeWarned: Allergen[];
  /** 비교군 **중 하나라도** 선언·주의한 것 */
  stdDeclared: Allergen[];
  stdWarned: Allergen[];
  /** 빼기로 한 것을 일반은 선언하고 대체품은 선언하지 않나 */
  removalHolds: boolean;
  /** 대체품이 선언하는데 **어떤** 일반 제품도 선언하지 않는 것 */
  addedDeclared: Allergen[];
  /** 주의만 놓고 같은 비교 */
  addedWarned: Allergen[];
};

export function swapLabelRows(): SwapLabelRow[] {
  return SWAP_PAIRS.map((p) => {
    const removes = REMOVES[p.kind];
    if (!removes) throw new Error(`대체품 라벨: "${p.kind}"가 무엇을 빼는지 정의되지 않았다`);
    const hasLabel = labelFor(p.free) !== null;
    const freeDeclared = ALL.filter((a) => declares(p.free, a));
    const freeWarned = ALL.filter((a) => !declares(p.free, a) && warnsAbout(p.free, a));
    const stdDeclared = ALL.filter((a) => p.standard.some((s) => declares(s, a)));
    const stdWarned = ALL.filter((a) => p.standard.some((s) => warnsAbout(s, a)));
    return {
      free: p.free,
      kind: p.kind,
      removes,
      hasLabel,
      freeDeclared,
      freeWarned,
      stdDeclared,
      stdWarned,
      removalHolds: hasLabel && stdDeclared.includes(removes) && !freeDeclared.includes(removes),
      addedDeclared: freeDeclared.filter((a) => !stdDeclared.includes(a)),
      addedWarned: freeWarned.filter((a) => !stdWarned.includes(a) && !stdDeclared.includes(a)),
    };
  });
}

const list = (xs: Allergen[]) => {
  const n = xs.map((a) => NICE[a]);
  return n.length <= 1 ? (n[0] ?? "") : `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
};
const dash = "—";

/** 라벨을 든 짝만. 라벨이 없는 것은 판정하지 않는다. */
export const labelledSwaps = () => swapLabelRows().filter((r) => r.hasLabel);
export const unlabelledSwaps = () => swapLabelRows().filter((r) => !r.hasLabel);

/** 대체품이 **새로 선언한** 알레르겐이 있는 짝. */
export const swapsAddingDeclared = () => labelledSwaps().filter((r) => r.addedDeclared.length > 0);
/** 선언은 없지만 **주의가 새로 붙은** 짝. */
export const swapsAddingWarned = () =>
  labelledSwaps().filter((r) => r.addedDeclared.length === 0 && r.addedWarned.length > 0);

export function swapLabelTable(): string {
  return swapLabelRows()
    .map((r) => {
      const decl = r.hasLabel ? (r.freeDeclared.length ? list(r.freeDeclared) : "nothing tracked") : "no statement";
      const warn = r.hasLabel ? (r.freeWarned.length ? list(r.freeWarned) : dash) : dash;
      const std = r.stdDeclared.length ? list(r.stdDeclared) : dash;
      return `| ${r.free} | ${NICE[r.removes]} | ${decl} | ${warn} | ${std} |`;
    })
    .join("\n");
}

/** 상품 페이지의 실제 상품명 — 어느 제품을 읽었는지 독자가 되짚을 수 있어야 한다. */
const NAMES = priceCache as Record<string, { data?: { name?: string } }>;
export const swapProductName = (key: string) => (NAMES[key]?.data?.name ?? "").toLowerCase();

/**
 * 「새로 선언된 알레르겐」을 줄마다 문장으로. 손으로 적지 않는다 —
 * 고정 SKU 하나가 이름이 바뀌면 이 목록도 바뀌어야 한다.
 */
export function addedDeclaredBullets(): string {
  return swapsAddingDeclared()
    .map((r) => {
      return `- **${r.free}** (${swapProductName(r.free)}) declares **${list(r.addedDeclared)}**. ` +
        `None of the ordinary versions it is compared with declare ${list(r.addedDeclared)} at all.`;
    })
    .join("\n");
}

/** 선언은 없지만 주의가 새로 붙은 짝의 문장. */
export function addedWarnedClause(): string {
  const rows = swapsAddingWarned();
  if (rows.length === 0) return "";
  return rows
    .map(
      (r) =>
        `**${r.free}** (${swapProductName(r.free)}) declares none of the five, but carries a *may contain* for ` +
        `${list(r.addedWarned)} — and the ordinary versions it is compared with carry no warning at all.`,
    )
    .join(" ");
}

/** 「빼기로 한 것은 실제로 뺐다」가 몇 건인지. 양성 대조로 쓰기도 한다. */
export const removalHoldsCount = () => swapLabelRows().filter((r) => r.removalHolds).length;
