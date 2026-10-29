import ironContent from "@/data/ironContent.json";
import priceCache from "@/data/price_cache.json";
import {
  servePrice, serveLabel, serveSize, packSize, joinList, isMultiple, multipleWord, pctMore,
} from "@/lib/servePrice";

/**
 * iron-rich 글의 「철분 1mg이 얼마인가」 표 — **철분 값은 `data/ironContent.json`(NZ 식품성분 DB),
 * 가격·분량은 `@/lib/servePrice`에서만 온다.** 본문에 숫자를 손으로 적지 않는다.
 *
 * 🔴 철분 값을 짐작하지 말 것. 표에 넣을 재료는 DB 레코드를 찾아 `ironContent.json`에
 *    출처·레코드 ID·접속일과 함께 먼저 적는다. 맞는 레코드가 없으면 `excluded`에 사유를 적고 뺀다.
 *
 * 🔴 통조림 콩류는 DB 값이 **건더기(drained) 기준**인데 우리 1인분은 **캔 순중량의 비율**(국물 포함)이다.
 *    그대로 곱하면 철분이 부풀려진다 — 그래서 상품 원재료 표시의 콩 비율(`edibleShare`)을 곱한다.
 *    참치는 DB에 국물 포함(undrained) 레코드가 있어 비율 없이 쓴다.
 *
 * 🔴 1mg당 가격은 **화면에 찍힌 두 라벨로** 나눈다 — 원값으로 나누면 독자가 표의 숫자로
 *    검산했을 때 어긋난다(09-20 「86c × 3」, 08-21 「$1.67 × 190」과 같은 고장).
 */

type ShareRef = { share: number; productSku: string; label: string; url: string; accessed: string };
export type IronRef = {
  ironPer100g: number;
  recordId: string;
  matched: string;
  url: string;
  dataUrl: string;
  accessed: string;
  haem: boolean;
  note?: string;
  edibleShare?: ShareRef;
  /** 그 DB 레코드에 적힌 1회 제공량(「1 cup」 = 40g). 컵·스푼 무게를 짐작하지 않으려고 쓴다. */
  measure?: { text: string; grams: number; source: string };
};

export const IRON_CONTENT = ironContent as unknown as {
  source: string;
  foods: Record<string, IronRef>;
  reference: Record<string, IronRef>;
  excluded: Record<string, string>;
};

const CACHE = priceCache as Record<string, { data?: { name?: string; sku?: string } }>;

/**
 * 표에 싣는 재료와 화면 이름. 🔴 **일부러 가격순이 아니다** — 선언 순서가 결과 순서와 같으면
 * 정렬을 지워도 표가 그대로라 정렬 가드가 발화하지 않는다(`ironPriceTableMarkdown`과 같은 이유).
 */
export const IRON_COST_FOODS: { key: string; label: string }[] = [
  { key: "Beef Mince", label: "Beef mince" },
  { key: "Black Beans", label: "Black beans (tinned)" },
  { key: "Chicken Breast", label: "Chicken breast" },
  { key: "Chickpeas", label: "Chickpeas (tinned)" },
  { key: "Dried Apricots", label: "Dried apricots" },
  { key: "Hummus", label: "Hummus" },
  { key: "Kidney Beans", label: "Red kidney beans (tinned)" },
  { key: "Red Lentils", label: "Lentils (tinned)" },
  { key: "Rolled Oats", label: "Rolled oats" },
  { key: "Spinach", label: "Baby spinach" },
  { key: "Sultanas", label: "Sultanas" },
  { key: "Tuna", label: "Tuna in spring water (tinned)" },
];

/** 1인분의 g수. `PORTION_BASIS`의 "75g"을 읽는다 — "1 egg"처럼 g가 아니면 던진다. */
export function serveGrams(key: string): number {
  const s = serveSize(key);
  const m = s.match(/^(\d+(?:\.\d+)?)g$/);
  if (!m) throw new Error(`철분 표: "${key}"의 1인분이 g가 아니다("${s}") — 철분을 곱할 무게가 없다`);
  return Number(m[1]);
}

function ref(key: string): IronRef {
  const r = IRON_CONTENT.foods[key];
  if (!r || !(r.ironPer100g > 0)) {
    throw new Error(`철분 표: data/ironContent.json에 "${key}"가 없다 — 출처를 찾아 적기 전엔 표에 넣지 말 것`);
  }
  return r;
}

/** 화면 라벨을 달러로 되읽는다("30c" → 0.30, "$2.55" → 2.55). */
const shownDollars = (label: string) =>
  label.endsWith("c") ? Number(label.slice(0, -1)) / 100 : Number(label.slice(1));

export type IronCostRow = {
  key: string;
  label: string;
  haem: boolean;
  product: string;
  pack: string;
  grams: number;
  /** 철분을 곱한 무게 — 콩 통조림은 건더기 몫. */
  edibleGrams: number;
  ironMg: number;
  cost: number;
  ironLabel: string;
  costLabel: string;
  /** 화면 라벨끼리 나눈 1mg당 가격. 정렬도 이 값으로 한다. */
  perMg: number;
  perMgLabel: string;
};

export function ironCostRows(): IronCostRow[] {
  return IRON_COST_FOODS.map(({ key, label }) => {
    const r = ref(key);
    const grams = serveGrams(key);
    const edibleGrams = grams * (r.edibleShare?.share ?? 1);
    const ironMg = (r.ironPer100g * edibleGrams) / 100;
    const cost = servePrice(key);
    // 유효숫자 두 자리 — DB 값 자체가 두 자리다. 소수 첫째 자리로 자르면 0.168mg가 0.2mg가 되어
    // 1mg당 가격이 19% 틀어지고 순위가 뒤집힌다(시금치·렌틸·살구에서 실제로 그랬다).
    const shownMg = ironMg.toPrecision(2);
    if (!(Number(shownMg) > 0)) {
      throw new Error(`철분 표: "${key}"의 1인분 철분이 0으로 찍힌다 — 1mg당 가격을 낼 수 없다`);
    }
    const ironLabel = `${shownMg}mg`;
    const costLabel = serveLabel(cost);
    const perMg = shownDollars(costLabel) / Number(shownMg);
    return {
      key, label, haem: r.haem,
      product: (CACHE[key]?.data?.name ?? "").trim().toLowerCase(),
      pack: packSize(key),
      grams, edibleGrams, ironMg, cost, ironLabel, costLabel,
      perMg, perMgLabel: serveLabel(perMg),
    };
  }).sort((a, b) => a.perMg - b.perMg || a.label.localeCompare(b.label));
}

export function ironCostTableMarkdown(): string {
  const head =
    "| Food (tracked product, pack) | Serve | Iron per serve | Cost per serve | Cost per mg of iron |\n" +
    "|---|---|---|---|---|";
  const rows = ironCostRows().map((r, i) => {
    const serve = r.edibleGrams === r.grams
      ? `${r.grams}g`
      : `${r.grams}g of the tin (about ${Math.round(r.edibleGrams)}g drained)`;
    const perMg = i === 0 ? `**${r.perMgLabel}**` : r.perMgLabel;
    return `| ${r.label} — *${r.product}*, ${r.pack} | ${serve} | ~${r.ironLabel} | ${r.costLabel} | ${perMg} |`;
  });
  return [head, ...rows].join("\n");
}

/** 표 아래 문장 — 순위·배수가 바뀌면 문장도 저절로 바뀐다. */
export function ironCostSummary(): string {
  const rows = ironCostRows();
  const first = rows[0];
  const rest = rows.slice(1);
  const secondCost = rest[0].perMgLabel;
  const seconds = rest.filter((r) => r.perMgLabel === secondCost).map((r) => r.label.toLowerCase());
  const last = rows[rows.length - 1];
  const s1 =
    `**Cheapest per milligram of iron: ${first.label.toLowerCase()}, at ${first.perMgLabel}**, ` +
    `then ${joinList(seconds)} at ${secondCost}${seconds.length > 1 ? " each" : ""}. ` +
    `At the other end, ${last.label.toLowerCase()} works out at ${last.perMgLabel} a milligram.`;

  const haem = rows.filter((r) => r.haem);
  const plant = rows.filter((r) => !r.haem);
  const haemFirst = haem[0];
  const plantFirst = plant[0];
  // 배수도 화면 라벨끼리 — 독자는 「$1.45 ÷ 9c」로 검산한다.
  const ratio = shownDollars(haemFirst.perMgLabel) / shownDollars(plantFirst.perMgLabel);
  const gap = !(ratio > 1)
    ? `Here the cheapest milligram of all is a meat or fish one — ${haemFirst.label.toLowerCase()}.`
    : `The cheapest meat or fish row, ${haemFirst.label.toLowerCase()} at ${haemFirst.perMgLabel} a milligram, ` +
      (isMultiple(ratio)
        ? `costs ${multipleWord(ratio)} the ${plantFirst.label.toLowerCase()} figure`
        : `costs ${pctMore(ratio)} than ${plantFirst.label.toLowerCase()}`) +
      `; pairing the plant rows with vitamin C, as covered above, is the cheap way to get more out of them.`;
  const s2 =
    `${joinList(haem.map((r) => r.label.toLowerCase()))} carry haem iron, which the body absorbs more readily ` +
    `than the non-haem iron in the plant foods (see *Two Types of Iron* above), so a milligram is not worth ` +
    `the same in every row. ${gap}`;
  return `${s1}\n\n${s2[0].toUpperCase()}${s2.slice(1)}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 글의 나머지 철분 수치 — 아이디어 1~5, 합계, 주간 요약, 참고표, 강화식품 표.
 *
 * 🔴 왜 있나 (2026-09-29) — 이 글은 철분 수치를 **두 벌** 갖고 있었다. 위의 원가 표는 NZ 식품성분 DB,
 *    본문 나머지는 출처 없는 손글씨(대부분 미국 값)였다. 한 페이지가 말린 살구 30g을 ~0.9mg이라 하고
 *    바로 아래 표는 20g을 ~0.24mg이라 했다(g당 세 배 차이). 이제 전부 같은 파일에서 나온다.
 *
 * 🔴 양(g)도 여기서만 정한다. DB 레코드에 제공량이 적혀 있으면(시금치 1컵 40g, Weet-Bix 2개 34g)
 *    그걸 쓰고, 없으면 g로 적는다 — 컵·스푼 무게를 짐작하지 않는다.
 * ──────────────────────────────────────────────────────────────────────────── */

/** 원가 표의 추적 재료와 참고 전용 음식을 한 이름공간에서 찾는다. */
export function ironRef(key: string): IronRef {
  const r = IRON_CONTENT.foods[key] ?? IRON_CONTENT.reference[key];
  if (!r || !(r.ironPer100g > 0)) {
    throw new Error(`철분 수치: data/ironContent.json에 "${key}"가 없다 — DB 레코드를 찾아 적기 전엔 본문에 쓰지 말 것`);
  }
  return r;
}

/** DB 레코드의 제공량 n개의 무게. 레코드에 제공량이 없으면 던진다. */
function measureGrams(key: string, n: number): number {
  const m = ironRef(key).measure;
  if (!m) throw new Error(`철분 수치: "${key}" 레코드에 제공량이 없다 — g로 적을 것`);
  return m.grams * n;
}

type Portion = { ref: string; grams: number };

/**
 * 본문이 말하는 양 하나하나. 🔴 `grams`를 손으로 적은 것은 **글이 정한 양**(다짐육 40g 등)이고,
 * 컵·스푼·개수는 전부 `measureGrams`로 DB 레코드에서 온다.
 */
export const IRON_PORTIONS = {
  wrapMince: { ref: "Beef mince, cooked", grams: 40 },
  pastaThigh: { ref: "Chicken thigh, cooked", grams: 40 },
  pastaSpinach: { ref: "Spinach", grams: measureGrams("Spinach", 1) },
  soupLentils: { ref: "Red lentils, cooked", grams: 100 },
  mixWeetBix: { ref: "Weet-Bix", grams: measureGrams("Weet-Bix", 1) },
  mixRaisins: { ref: "Raisins", grams: measureGrams("Raisins", 1) },
  mixPumpkin: { ref: "Pumpkin seeds", grams: 15 },
  mixApricots: { ref: "Dried Apricots", grams: measureGrams("Dried Apricots", 1) },
  boxHummus: { ref: "Hummus", grams: measureGrams("Hummus", 3) },
  addSpinach: { ref: "Spinach", grams: serveGrams("Spinach") },
  tipBread: { ref: "Wholemeal bread", grams: measureGrams("Wholemeal bread", 1) },
} satisfies Record<string, Portion>;
export type PortionName = keyof typeof IRON_PORTIONS;

/** 화면에 찍는 mg — 유효숫자 두 자리(원가 표와 같은 규칙). */
const sig2 = (mg: number) => Number(mg.toPrecision(2));
export const mgText = (mg: number) => `~${mg.toPrecision(2)}mg`;

/** 한 양의 철분(화면 값). */
export function portionMg(name: PortionName): number {
  const p: Portion = IRON_PORTIONS[name];
  return sig2((ironRef(p.ref).ironPer100g * p.grams) / 100);
}
export const portionIron = (name: PortionName) => mgText(portionMg(name));
export const portionGrams = (name: PortionName) => `${IRON_PORTIONS[name].grams}g`;
/** 100g당 — 「at ~2.1mg per 100g」. */
export const per100Iron = (key: string) => mgText(ironRef(key).ironPer100g);

/** 도시락 아이디어별 구성. 합계는 **화면에 찍힌 구성 값의 합**이다 — 독자가 더해 보면 맞아야 한다. */
export const IRON_IDEAS = {
  wrap: ["wrapMince"],
  pasta: ["pastaThigh", "pastaSpinach"],
  soup: ["soupLentils"],
  mix: ["mixWeetBix", "mixRaisins", "mixPumpkin", "mixApricots"],
  hummus: ["boxHummus"],
} as const satisfies Record<string, readonly PortionName[]>;
export type IdeaName = keyof typeof IRON_IDEAS;

export const ideaMg = (idea: IdeaName) =>
  Math.round(IRON_IDEAS[idea].reduce((t, n) => t + portionMg(n), 0) * 100) / 100;
/** 합계는 0.01mg 단위로 — 구성 값을 더한 그대로라 반올림을 한 번 더 하지 않는다. */
export const ideaIron = (idea: IdeaName) => `~${ideaMg(idea)}mg`;

/**
 * 뉴질랜드에서 쓰는 영양 기준치(NRV) 4–8세 철분 RDI. 🔴 이 값은 글이 이미 싣고 있던 것이다 —
 * 출처: https://www.eatforhealth.gov.au/nutrient-reference-values/nutrients/iron
 * (2026-09-29 세션에서는 그 사이트가 응답하지 않아 다시 확인하지 못했다.)
 */
export const NRV_IRON_4_8 = 10;

const pctOfNrv = (mg: number) => Math.round((mg / NRV_IRON_4_8) * 100);

/** 주간 표 아래 요약. 아이디어 합계에서 만든다. */
export function ironWeekSentence(): string {
  const everyday: [IdeaName, string][] = [
    ["wrap", "the beef wrap"], ["pasta", "the chicken pasta"], ["hummus", "the hummus box"], ["soup", "the lentil soup"],
  ];
  const pcts = everyday.map(([i]) => pctOfNrv(ideaMg(i)));
  const lo = Math.min(...pcts);
  const hi = Math.max(...pcts);
  return (
    `**Estimated iron from the ideas above: ${everyday.map(([i, l]) => `${ideaIron(i)} for ${l}`).join(", ")}, ` +
    `and ${ideaIron("mix")} on the day the Weet-Bix mix goes in.** Against the Nutrient Reference Value used in ` +
    `New Zealand — ${NRV_IRON_4_8}mg a day for ages 4–8 — those four lunches supply roughly ${lo}–${hi}% of the ` +
    `day's iron, and the Weet-Bix day about ${pctOfNrv(ideaMg("mix"))}%.`
  );
}

/** 「허벅지살은 가슴살보다 철분이 약 두 배」 — 배수는 DB 값에서. */
export function thighVsBreastClause(): string {
  const t = ironRef("Chicken thigh, cooked").ironPer100g;
  const b = ironRef("Chicken breast, cooked").ironPer100g;
  const r = t / b;
  const how = isMultiple(r) ? `about ${multipleWord(r)} the iron` : `${pctMore(r)} iron`;
  return `dark meat contains ${how} (${mgText(t)} against ${mgText(b)} per 100g, cooked)`;
}

/** 「통밀빵은 흰빵의 약 두 배」. */
export function wholemealVsWhiteClause(): string {
  const r = ironRef("Wholemeal bread").ironPer100g / ironRef("White bread").ironPer100g;
  return isMultiple(r) ? `roughly ${multipleWord(r)} the iron of white bread` : `${pctMore(r)} iron than white bread`;
}

/** 참고표 한 줄 = (화면 이름, 키, 양). 양이 없으면 100g당. */
const REFERENCE_ROWS: { label: string; key: string; measure?: boolean; grams?: number }[] = [
  { label: "Beef mince, prime, cooked", key: "Beef mince, cooked" },
  { label: "Chicken thigh, cooked", key: "Chicken thigh, cooked" },
  { label: "Chicken breast, cooked", key: "Chicken breast, cooked" },
  { label: "Tuna in spring water, with the liquid", key: "Tuna", measure: true },
  { label: "Red lentils, cooked", key: "Red lentils, cooked" },
  { label: "Lentils, tinned, drained", key: "Red Lentils" },
  { label: "Chickpeas, tinned, drained", key: "Chickpeas" },
  { label: "Weet-Bix", key: "Weet-Bix", measure: true },
  { label: "Baby spinach, raw", key: "Spinach", measure: true },
  { label: "Dried apricots", key: "Dried Apricots", measure: true },
  { label: "Pumpkin seed kernels", key: "Pumpkin seeds", grams: IRON_PORTIONS.mixPumpkin.grams },
];

export function ironReferenceTableMarkdown(): string {
  const rows = REFERENCE_ROWS.map(({ label, key, measure, grams }) => {
    const r = ironRef(key);
    const g = measure ? measureGrams(key, 1) : grams ?? 100;
    const amount = measure ? `${r.measure!.text} (${g}g)` : `${g}g`;
    return `| ${label} | ${amount} | ${mgText((r.ironPer100g * g) / 100)} | ${r.recordId} |`;
  });
  return ["| Food | Amount | Iron | NZ database record |", "|---|---|---|---|", ...rows].join("\n");
}

/** 강화식품 표 — 레코드 이름에 철(Fe) 강화가 적힌 것만 싣는다. */
const FORTIFIED_ROWS: { label: string; key: string; where: string; use: string }[] = [
  { label: "Sanitarium Weet-Bix", key: "Weet-Bix", where: "All supermarkets", use: "Crushed as trail mix base" },
  { label: "Sanitarium Skippy Cornflakes", key: "Skippy Cornflakes", where: "Cereal aisle", use: "Trail mix component" },
];

export function fortifiedTableMarkdown(): string {
  const rows = FORTIFIED_ROWS.map(({ label, key, where, use }) => {
    const r = ironRef(key);
    if (!/\bFe\b/.test(r.matched)) {
      throw new Error(`강화식품 표: "${key}" 레코드에 철 강화(Fe)가 적혀 있지 않다 — 강화식품이라고 부를 수 없다`);
    }
    const g = measureGrams(key, 1);
    return `| ${label} | ${mgText((r.ironPer100g * g) / 100)} per ${r.measure!.text} (${g}g) | ${where} | ${use} |`;
  });
  return ["| Product | Iron Content | Where to Buy | Lunchbox Use |", "|---------|-------------|-------------|--------------|", ...rows].join("\n");
}

/** 「통밀빵 샌드위치 + Weet-Bix 믹스」 조합. 합계는 화면 값의 합. */
export function practicalTipSentence(): string {
  const bread = portionMg("tipBread");
  const total = Math.round((bread + ideaMg("mix")) * 100) / 100;
  return (
    `**Practical tip:** A lunchbox containing a wholemeal bread sandwich (${portionGrams("tipBread")} of bread, ` +
    `${portionIron("tipBread")} iron), the Weet-Bix trail mix above (${ideaIron("mix")}), and a mandarin ` +
    `(vitamin C to boost absorption) delivers about ${total}mg of iron — roughly ${pctOfNrv(total)}% of the ` +
    `${NRV_IRON_4_8}mg Nutrient Reference Value for ages 4–8. It takes 5 minutes to prepare.`
  );
}

/** 예산 가족에게 권하는 급원 — 원가 표의 1mg당 최저 셋. 손으로 고르면 표와 갈라진다. */
export function cheapestIronSourcesClause(): string {
  // 셋째와 같은 값(동률)은 같이 싣는다 — 하나만 고르면 표에서 같은 값인 행을 문장이 빠뜨린다.
  const rows = ironCostRows();
  const cut = rows[2].perMg;
  return joinList(rows.filter((r) => r.perMg <= cut).map((r) => r.label.toLowerCase()));
}
