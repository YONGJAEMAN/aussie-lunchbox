import priceCache from "@/data/price_cache.json";
import { cacheFor } from "@/lib/priceCaches";
import type { Island } from "@/data/promotions.types";
import menuDataJson from "@/data/menuData.json";
import { PORTION_FACTORS, DEFAULT_PORTION, PORTION_BASIS } from "@/lib/planConfig";
import { PINNED_SKUS } from "@/lib/priceSearch.mjs";

/**
 * 본문에 싣는 **1인분 가격 한 벌**. `content/posts.ts`와 `content/guides.ts`가
 * 같은 함수를 쓴다 — 두 파일이 각자 자기 헬퍼를 두면 같은 재료가 서로 다른 값으로
 * 실린다(2026-08-20 실측: nut-free 글은 치즈 39c, 가격 캐시는 34c였다).
 *
 * 🔴 **여기가 유일한 창구다.** 새 표를 붙일 때 손으로 금액을 적지 말 것.
 *    주간 크론이 `data/price_cache.json`을 갱신하므로 손으로 적은 금액은 **반드시** 낡는다.
 *    이 사이트가 AdSense에서 다섯 번 거절당한 사유가 정확히 "문구끼리의 모순"이었다.
 *
 * 🔴 왜 `lib/`에 있나 — `content/guides.ts`가 `@/lib/siteCounts`를 import하면 순환이
 *    닫혀 사이트가 죽는다. 이 모듈은 데이터(`price_cache.json`·`menuData.json`)와
 *    `@/lib/planConfig`·`@/lib/priceSearch.mjs`만 보므로 — 넷 다 content에 안 닿는다 —
 *    어느 content 파일에서 불러도 순환이 안 생긴다.
 *    (`lib/contentClaims.test.ts`의 import 그래프 가드가 이걸 실제로 걸어서 확인한다.)
 *    (`lib/contentClaims.test.ts`가 guides를 **먼저** 로드해서 이걸 확인한다.)
 *
 * 🔴 캐시에 키가 없으면 **던진다.** 재료 이름이 바뀌었을 때 "0c"가 조용히 실리는 것보다
 *    빌드가 죽는 게 낫다 — 이 저장소가 반복해서 당한 게 정확히 조용한 폴백이다.
 */
const CACHE = priceCache as Record<string, { timestamp?: number; data?: { price?: number } }>;

/** 소매 팩 한 개의 가격. 1인분 환산(`servePrice`)과 달리 팩 대 팩으로 비교할 때 쓴다. */
export function packPrice(key: string): number {
  const p = CACHE[key]?.data?.price;
  if (typeof p !== "number" || !(p > 0)) {
    throw new Error(
      `본문 가격: price_cache.json에 "${key}"가 없거나 값이 이상하다(${p}). ` +
        `재료 이름이 바뀌었다면 그 표의 키 목록을 같이 고칠 것.`,
    );
  }
  return p;
}

/** 한 끼 분량 기준 가격. 캐시에 없거나 값이 이상하면 던진다. */
export function servePrice(key: string): number {
  return packPrice(key) * (PORTION_FACTORS[key] ?? DEFAULT_PORTION);
}

/**
 * 팩 하나에서 나오는 1인분 개수. **내림이다** — 팩에서 0.5인분을 꺼낼 수는 없고,
 * 올림/반올림을 쓰면 계란 한 판(12.5인분)이 "13개"가 되어 눈에 보이는 팩과 어긋난다.
 */
export function packServes(key: string): number {
  packPrice(key); // 키 존재를 여기서도 확인한다 — 개수만 쓰는 자리도 조용히 늙지 않게.
  return Math.floor(1 / (PORTION_FACTORS[key] ?? DEFAULT_PORTION));
}

export const money = (n: number) => `$${n.toFixed(2)}`;

/** $1 미만은 센트로 쓴다 — 표에서 "$0.23"보다 "23c"가 읽힌다. */
export function serveLabel(n: number): string {
  return n < 1 ? `${Math.round(n * 100)}c` : money(n);
}

/** 캐시를 마지막으로 읽은 달. 손으로 적으면 이것도 낡는다. */
export function priceMonth(): string {
  const stamps = Object.values(CACHE)
    .map((v) => v.timestamp)
    .filter((t): t is number => typeof t === "number");
  if (!stamps.length) throw new Error("본문 가격: 캐시에 timestamp가 하나도 없다");
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    month: "long",
    year: "numeric",
  }).format(new Date(Math.max(...stamps)));
}

/* ────────────────────────────────────────────────────────────────────────────
 * 배수·퍼센트·목록 — **문장 안의 주장도 데이터에서 만든다.**
 *
 * 🔴 iron-rich 글이 "렌틸은 소고기의 N분의 1"을 네 번 연속 틀렸다. 값만 생성으로
 *    바꾸고 배수를 손으로 적으면 **정확히 같은 자리에서 다시 깨진다.**
 *    분수 표현("a tenth")은 쓰지 않는다 — 그게 네 번 깨진 표현이다.
 * ──────────────────────────────────────────────────────────────────────────── */

const MULTIPLE_WORDS: Record<number, string> = {
  2: "double",
  3: "triple",
  4: "four times",
  5: "five times",
  6: "six times",
  7: "seven times",
  8: "eight times",
  9: "nine times",
  10: "ten times",
};

/**
 * 배수로 말할 수 있는 최저 비율.
 *
 * 🔴 예전 구현은 `Math.max(2, Math.round(ratio))`였다. 그래서 `mw(1.18)`·`mw(1.4)`·
 *    `mw(0.5)`가 **전부 "double"**을 돌려줬다. 가격이 한 주만 움직여도 문장이 곧바로
 *    거짓이 된다 — 실제로 계란/블랙빈 비율은 1.73이라 경계에서 두 칸 거리다.
 *    1.5 미만은 배수가 아니라 퍼센트로 말해야 한다.
 */
export const MULTIPLE_MIN = 1.5;

/** 배수 표현을 써도 되는 비율인가. 호출부는 이걸로 분기한다. */
export const isMultiple = (ratio: number) =>
  Number.isFinite(ratio) && ratio >= MULTIPLE_MIN;

/**
 * "triple" / "four times" — 반올림 정수 배수만 말한다.
 *
 * 🔴 1.5배 미만이면 **던진다.** 값이 없을 때 던지는 것과 같은 이유다 —
 *    "double"이 조용히 실리는 것보다 빌드가 죽는 게 낫다.
 */
export function multipleWord(ratio: number): string {
  if (!isMultiple(ratio)) {
    throw new Error(
      `본문 배수: ${ratio}배는 배수로 말할 수 없다(최소 ${MULTIPLE_MIN}배). ` +
        `호출한 문장을 퍼센트 표현(pctMore)으로 분기할 것 — 반올림하면 "double"이 되어 거짓이 된다.`,
    );
  }
  const n = Math.round(ratio);
  return MULTIPLE_WORDS[n] ?? `${n} times`;
}

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight"];

export const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);

/**
 * 퍼센트 차이는 **5% 단위로** 반올림해서 말한다.
 * "about 62%"라고 적으면 다음 주에 61.4%가 되어 곧바로 거짓이 되고, 반올림한 센트
 * 표기(34c/21c=62%)와 원값(60.5%)이 갈라져 **표와 문장이 서로 다른 말을 한다.**
 * 5% 단위면 두 계산이 같은 답으로 모인다.
 */
export const roundPct = (n: number) => Math.round(n / 5) * 5;

/**
 * 1.5배 미만일 때 쓰는 표현 — "about 40% more".
 * 🔴 비율이 1 이하면 던진다. "-20% more"라고 쓰면 문장이 정확히 거꾸로 거짓말한다.
 */
export function pctMore(ratio: number): string {
  if (!(ratio > 1)) {
    throw new Error(
      `본문 배수: 비율이 ${ratio}로 1 이하다 — 비싼 쪽/싼 쪽이 뒤집혔다. ` +
        `퍼센트가 아니라 문장 자체를 다시 써야 한다.`,
    );
  }
  return `about ${roundPct((ratio - 1) * 100)}% more`;
}

/** "a, b and c" — 항목이 하나뿐일 때 접속사를 남기지 않는다. */
export function joinList(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 팩 크기·1인분 g수 — **본문에 손으로 적지 않는다.**
 *
 * 🔴 batch-cooking 글이 "Cheese (1kg block)"이라고 적어 두고 있었다. 고정 SKU는 500g이다.
 *    라벨 하나가 틀리면 그 옆의 팩값·회분·단가가 전부 맞아도 독자는 다른 상품을 본다.
 * ──────────────────────────────────────────────────────────────────────────── */

// 🔴 2026-09-06: `size`를 필수로 두어 **빌드가 깨졌다.** 낱개/무게 판매(Apple·Broccoli·
//    Orange·Pear)는 상품 API가 volumeSize를 안 줘서 size가 없다. vitest는 타입을
//    안 보므로 682건이 전부 통과했고, `next build`의 tsc에서야 드러났다.
//    아래 packSize()가 이미 없을 때 던지므로 런타임 계약은 그대로다.
const PINS = PINNED_SKUS as Record<string, { sku: string; name: string; size?: string }>;

/** 고정 SKU가 말하는 소매 팩 크기("500g"). 고정 안 된 재료면 던진다. */
export function packSize(key: string): string {
  const size = PINS[key]?.size;
  if (!size) {
    throw new Error(
      `본문 팩 크기: PINNED_SKUS에 "${key}"가 없다. 팩 크기를 본문에 쓰려면 상품을 먼저 고정할 것 — ` +
        `고정하지 않으면 주간 크론이 매주 다른 크기의 상품을 집는다.`,
    );
  }
  return size;
}

/** 1인분이 실제로 몇 g인지("30g"). `PORTION_BASIS`에 근거가 없으면 던진다. */
export function serveSize(key: string): string {
  const basis = PORTION_BASIS[key];
  if (!basis) {
    throw new Error(
      `본문 분량: PORTION_BASIS에 "${key}"가 없다 — 팩 크기를 상품 API로 확인하고 등록할 것.`,
    );
  }
  return basis.serve;
}

/* ────────────────────────────────────────────────────────────────────────────
 * "치즈는 싼 단백질인가" — **논증도 데이터에서 만든다.**
 *
 * 🔴 2026-08-20: 치즈 factor가 2배 틀려 34c로 실렸고, 그 위에 "가장 싼 단백질 중 하나"라는
 *    문장이 네 편에 얹혀 있었다. 51c에서는 병아리콩(30c)·블랙빈(48c)이 밑으로 내려온다.
 *    값만 생성으로 바꾸고 **논증을 손으로 남기면** 정확히 같은 자리에서 다시 깨진다.
 * ──────────────────────────────────────────────────────────────────────────── */

const CHEESE_PEERS: { key: string; label: string }[] = [
  { key: "Chickpeas", label: "tinned chickpeas" },
  { key: "Black Beans", label: "black beans" },
  { key: "Eggs", label: "an egg" },
  { key: "Ham", label: "sliced ham" },
  { key: "Chicken Breast", label: "chicken breast" },
];

/**
 * "cheese is 51c a serve — cheaper than an egg (82c) …, though tinned chickpeas (30c) … undercut it"
 * 순위가 뒤집히면 문장이 저절로 뒤집힌다.
 */
export function cheeseVsProteinsClause(): string {
  const cheese = servePrice("Cheese");
  const fmt = (ps: typeof CHEESE_PEERS) =>
    joinList(ps.map((p) => `${p.label} (${serveLabel(servePrice(p.key))})`));
  const dearer = CHEESE_PEERS.filter((p) => servePrice(p.key) > cheese);
  const cheaper = CHEESE_PEERS.filter((p) => servePrice(p.key) < cheese);
  const parts: string[] = [];
  if (dearer.length) parts.push(`cheaper than ${fmt(dearer)}`);
  if (cheaper.length) parts.push(`though ${fmt(cheaper)} undercut it`);
  return `cheese runs ${serveLabel(cheese)} a serve — ${parts.join(", ")}`;
}

/** 치즈보다 싼 단백질이 하나라도 있나. "가장 싸다"류 표현을 붙일지 결정한다. */
export const cheeseIsCheapestProtein = () =>
  CHEESE_PEERS.every((p) => servePrice(p.key) > servePrice("Cheese"));

/* ────────────────────────────────────────────────────────────────────────────
 * 도시락 한 통 비용 분포 — 게시된 "약 $4", "$2~$7.70", "$3 미만 N종"의 출처.
 *
 * 🔴 이 세 숫자는 여덟 자리에 손으로 적혀 있었다. 한 곳(`posts.ts`)은 이미
 *    "Nineteen of the 94"라고, 다른 곳(`guides.ts`)은 "Twenty of our ninety-four"라고
 *    **서로 다른 말을 하고 있었다.** 이 사이트가 다섯 번 거절당한 사유가 그것이다.
 *
 * 정의는 `planGenerator`의 실제 구성과 같다:
 *   1통 = 메인 재료 + Fruit&Veg 간식 1개 + (Protein&Dairy ∪ Savoury Crunch) 간식 1개
 * 플래너는 두 간식을 무작위로 고르므로 각 풀의 **중앙값**을 대표값으로 쓴다.
 * ⚠️ 두 풀을 하나로 합쳐 중앙값을 한 번 구하고 2배 하면 안 된다 — 두 풀의 중앙값이 다르다.
 * ──────────────────────────────────────────────────────────────────────────── */

type Row = { ingredients?: string[] };
const MENU_DATA = (menuDataJson as unknown as {
  MENU_DATA: { en: Row[] };
  SNACK_DATA: Record<string, Row[]>;
}).MENU_DATA.en;
const SNACK_DATA = (menuDataJson as unknown as { SNACK_DATA: Record<string, Row[]> }).SNACK_DATA;

type Cache = Record<string, { data?: { price?: number } }>;

const perIngredient = (ing: string, cache: Cache = CACHE) => {
  const p = cache[ing]?.data?.price;
  return (typeof p === "number" && p > 0 ? p : 0) * (PORTION_FACTORS[ing] ?? DEFAULT_PORTION);
};

const sumCost = (ings: string[], cache: Cache = CACHE) => ings.reduce((t, i) => t + perIngredient(i, cache), 0);

export function median(xs: number[]): number {
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/**
 * 도시락 한 통의 **간식 두 칸** 합계.
 *
 * 🔴 2026-09-15: `lib/snackEconomics.ts`가 이 계산을 **따로 한 벌 더** 갖고 있었고,
 *    둘째 칸을 세 풀 전부(과일 포함)의 중앙값으로 잡았다. 생성기는 둘째 칸을
 *    과일에서 뽑지 않는다(`planGenerator.ts:368-374`). 그래서 간식 글은 $1.54 / $3.85로,
 *    나머지 사이트 전부는 $1.47 / $3.80으로 **같은 것을 다르게** 말하고 있었다.
 *    바로 위 ⚠️ 주석이 경고하던 그 실수인데, 경고가 이 파일 안에만 있어서
 *    밖에서 새로 쓴 모듈에는 닿지 않았다. 이제 밖에서도 **여기를** 부른다.
 */
export function snackSlotsCost(cache: Cache = CACHE): number {
  const poolCost = (rows: Row[]) => rows.map((r) => sumCost(r.ingredients ?? [], cache));
  const fruit = median(poolCost(SNACK_DATA["Fruit & Veg"] ?? []));
  const other = median(
    poolCost([...(SNACK_DATA["Protein & Dairy"] ?? []), ...(SNACK_DATA["Savoury Crunch"] ?? [])]),
  );
  if (!(fruit > 0) || !(other > 0)) {
    throw new Error("도시락 총액: 간식 풀이 비었거나 값이 0이다 — 풀이 비면 전부 메인 비용이 된다");
  }
  return fruit + other;
}

function boxCosts(cache: Cache = CACHE): number[] {
  const slots = snackSlotsCost(cache);
  return MENU_DATA.map((m) => sumCost(m.ingredients ?? [], cache) + slots);
}

/** 도시락 중앙값의 **숫자**. 게시 문구는 `boxMedianLabel()`을 쓸 것. */
export const boxMedian = () => median(boxCosts());

/**
 * 어림 금액. 10c 단위로 말하고, 딱 떨어지는 달러는 센트를 안 붙인다.
 * ($4.03 → "$4",  $7.7085 → "$7.70",  $2.0138 → "$2")
 * 🔴 센트 단위로 실으면 다음 주에 곧바로 거짓이 된다. 어림값이라고 밝히고 어림으로 쓴다.
 */
export function approxMoney(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? `$${r}` : `$${r.toFixed(2)}`;
}

/** 게시하는 "약 $4". */
export const boxMedianLabel = () => approxMoney(boxMedian());

/**
 * 한 주(5일) 어림. 🔴 **화면 라벨을 되읽어 곱한다** — 원값으로 곱하면 「$3.70 × 5」를 직접 해 본 독자와
 * 어긋난다(09-20 「86c × 3」 사고). term-1 글이 손으로 「near $20」이라 적고 있었다(09-28 실제 $18.50).
 */
export const boxWeekLabel = () => approxMoney(Number(boxMedianLabel().slice(1)) * 5);

/** 게시하는 범위의 아래끝("$2")·위끝("$7.70"). */
/**
 * 도시락에서 **메인 한 칸**의 중앙값. = 도시락 중앙값 − 간식 두 칸.
 *
 * 🔴 왜 뺄셈이 정확한가 — `boxCosts()` 는 모든 메뉴에 **같은 간식 값**을 더한다.
 *    상수를 더한 집합의 중앙값은 (원래 중앙값 + 상수)이므로 되빼면 정확히 메인이다.
 *    근사치가 아니다.
 *
 * 🔴 왜 있나 (2026-09-19) — `batch-cooking-save-money-nz` 가 "Cost per lunch:
 *    approximately $1.30-$1.50" 이라고 손으로 적고 있었다. 같은 사이트가 도시락
 *    중앙값을 $3.80 이라고 말하는데, 둘을 나란히 읽으면 서로를 반박하는 것처럼 보인다.
 *    배치쿠킹이 공략하는 건 **메인 한 칸**이고, 그 값은 우리가 잴 수 있다.
 */
export const mainMedian = () => boxMedian() - snackSlotsCost();
export const mainMedianLabel = () => approxMoney(mainMedian());

export const boxFloorLabel = () => approxMoney(Math.min(...boxCosts()));
export const boxCeilingLabel = () => approxMoney(Math.max(...boxCosts()));

/**
 * 섬별 도시락 어림(중앙·아래끝·위끝) — 남섬 아웃리치 본문이 쓴다(2026-10-28).
 * 북섬은 위 `boxMedianLabel` 등과 **같은 값**이다(같은 캐시·같은 식). 남섬은 `price_cache.south.json`.
 * 🔴 사이트 본문(글·홈)은 지금도 북섬 값만 말한다 — 이 함수는 남섬에 보내는 메일 본문 검사용이다.
 */
export function boxLabelsFor(island: Island = "north") {
  const costs = boxCosts(cacheFor(island) as Cache);
  return {
    median: approxMoney(median(costs)),
    floor: approxMoney(Math.min(...costs)),
    ceiling: approxMoney(Math.max(...costs)),
  };
}

/** "$3 미만 N종". 개수는 반올림할 수 없으므로 정확히 센다. */
export const boxUnderCount = (threshold: number) =>
  boxCosts().filter((c) => c < threshold).length;

/* ────────────────────────────────────────────────────────────────────────────
 * 「분량 비용이 뭔가」를 설명하는 예시 — **숫자는 생성한다.**
 *
 * 🔴 2026-09-15까지 3개 언어 UI 문구에 손으로 박혀 있었다:
 *    "a block of cheese costs $10.50 (the index price on 17 August 2026) but you only
 *     use a quarter for the week's lunches, the portion cost shown will be about $2.63".
 *    실측하면 치즈 팩값은 $8.50이고 캐시는 9월이다. 가격은 24% 낡았고 날짜도 낡았다.
 *
 * 🔴 더 나쁜 건 **화면이 그렇게 안 찍는다**는 것이다. 바로 앞 문장이 분량 비용을
 *    "한 끼에 쓰는 양"이라고 정의해 놓고, 예시는 **한 주치**($2.63)를 「표시되는
 *    분량 비용」이라고 말했다. 쇼핑 목록이 실제로 치즈 옆에 찍는 값은 1회분이다
 *    (`components/PlannerClient.tsx`의 `portionCost = price × portion`).
 *
 * 🔴 분수 표현("a quarter")을 쓰지 않는다 — 분량비율이 바뀌면 곧바로 거짓이 된다.
 *    대신 팩에서 나오는 **회분 수**로 말한다(`packServes`는 내림이라 눈에 보이는 팩과 맞는다).
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * 「재료 옆 1인분」과 「조리법 투입량」이 다르다는 걸 설명하는 예시.
 *
 * 🔴 2026-09-15까지 3개 언어에 "if one egg costs $0.83, the three-egg roll costs $2.49"로
 *    손으로 적혀 있었다. 실측하면 계란 1회분은 70c다(×3 = $2.10) — 19% 높았다.
 *    이 문장은 **독자에게 화면을 보고 직접 곱해 보라고** 권한다. 화면은 70c를 찍는다.
 */
export const METHOD_EXAMPLE_KEY = "Eggs";
export const METHOD_EXAMPLE_COUNT = 3;

export function methodExample() {
  const one = servePrice(METHOD_EXAMPLE_KEY);
  /**
   * 🔴 2026-09-20: 곱셈을 **반올림 전 값**으로 하고 있었다. 화면은 86c를 찍는데
   *    86.6c × 3으로 $2.57을 찍어, 독자가 권유대로 곱해 보면 $2.58과 갈라졌다.
   *    (2026-08-21 "$1.67 × 190 = $317.40"과 같은 고장이다.)
   *    라벨을 되읽어 곱한다 — 반올림 규칙을 여기 한 번 더 적으면 둘이 갈라진다.
   */
  const label = serveLabel(one);
  const shown = label.endsWith("c") ? Number(label.slice(0, -1)) / 100 : Number(label.slice(1));
  return {
    one: label,
    count: METHOD_EXAMPLE_COUNT,
    many: money(shown * METHOD_EXAMPLE_COUNT),
  };
}

export const PORTION_EXAMPLE_KEY = "Cheese";

export function portionExample() {
  const key = PORTION_EXAMPLE_KEY;
  return {
    pack: packSize(key),
    packPrice: money(packPrice(key)),
    serves: packServes(key),
    serve: serveLabel(servePrice(key)),
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 홈 「주간 계획 예시」 — 요일·메뉴·태그는 편집 선택이고 **금액만 생성한다.**
 *
 * 🔴 2026-09-15까지 다섯 줄과 총액이 전부 `app/[locale]/page.tsx`에 손으로 적혀
 *    있었다. 그 자리의 주석 스스로 "가격 갱신 시 함께 재계산할 것"이라고 적어
 *    뒀는데, 실제로는 낡아 있었다 — Chicken Pesto Panini가 $5.93으로 떠 있고
 *    실제는 $6.43이었다(50c, 8%). 주간 크론이 가격을 갱신하므로 이건 필연이다.
 *
 * 🔴 **합계는 다섯 줄과 맞아 있었다.** 검산으로는 안 잡힌다는 뜻이다 —
 *    다섯 줄이 같이 낡으면 총액도 같이 낡아서 내부적으로는 여전히 일관된다.
 *    사이트에서 가장 많이 보는 페이지에 실린 금액 여섯 개가 그 상태였다.
 *
 * 🔴 한 통의 정의는 `boxCosts()`와 **같다**(메인 + 과일 한 칸 + 간식 한 칸).
 *    옛 주석은 "간식 1개 포함"이라고 적혀 있었지만 실제 값은 두 칸이었다.
 * ──────────────────────────────────────────────────────────────────────────── */

// 태그는 menuData의 category를 그대로 쓴다 — 손으로 적은 태그가 홈("Hot")과 플래너("Cold")에서
// 서로 달랐고 둘 다 데이터("Sandwich")와 달랐다(2026-09-29).
export const EXAMPLE_WEEK = [
  { day: "Mon", menu: "Rice Paper Rolls" },
  { day: "Tue", menu: "Chicken Pesto Panini" },
  { day: "Wed", menu: "Sushi Rolls" },
  { day: "Thu", menu: "Cheesymite Scrolls" },
  { day: "Fri", menu: "Mini Spinach Quiche" },
] as const;

/** 메뉴 이름 하나의 행. 이름이 바뀌면 **던진다** — 0원이 조용히 실리는 것보다 낫다. */
function namedMenu(name: string): MenuRow {
  const m = (MENU_DATA as MenuRow[]).find((x) => x.name === name);
  if (!m) {
    throw new Error(
      `홈 예시 주간: menuData에 "${name}"이 없다. 메뉴 이름이 바뀌었다면 EXAMPLE_WEEK도 같이 고칠 것.`,
    );
  }
  return m;
}

/** 메뉴 이름 하나의 완성 도시락 비용. */
function namedBoxCost(name: string): number {
  return sumCost(namedMenu(name).ingredients ?? []) + snackSlotsCost();
}

export const exampleWeekRows = () =>
  EXAMPLE_WEEK.map((r) => {
    const m = namedMenu(r.menu);
    return { ...r, tag: m.category, ingredients: m.ingredients ?? [], cost: money(namedBoxCost(r.menu)) };
  });

export const exampleWeekTotal = () =>
  money(EXAMPLE_WEEK.reduce((t, r) => t + namedBoxCost(r.menu), 0));

/* ────────────────────────────────────────────────────────────────────────────
 * 채식 vs 육류 메인 — 가이드가 "약 50% 싸다 / $1.61 아낀다 / 학기당 $80"을
 * **손으로 적고 있었고, 가드가 그 값을 또 손으로 복사**하고 있었다(2026-08-21).
 * 크루아상 분량비율을 고치자 둘 다 어긋났다. 한 곳에서 만든다.
 * ──────────────────────────────────────────────────────────────────────────── */

const menuCost = (m: Row) => sumCost(m.ingredients ?? []);
const vegRows = () => MENU_DATA.filter((m) => (m as { is_vegetarian?: boolean }).is_vegetarian);
const meatRows = () => MENU_DATA.filter((m) => !(m as { is_vegetarian?: boolean }).is_vegetarian);

export const vegMedian = () => median(vegRows().map(menuCost));
export const meatMedian = () => median(meatRows().map(menuCost));
export const veganMedian = () =>
  median(MENU_DATA.filter((m) => (m as { is_vegan?: boolean }).is_vegan).map(menuCost));
/** 육류 → 채식으로 하루 바꿀 때 아끼는 금액. */
export const vegSaving = () => meatMedian() - vegMedian();
/** "약 50% 싸다" — 5% 단위로 반올림한다. */
export const vegPctLess = () => roundPct((1 - vegMedian() / meatMedian()) * 100);

/** 한 학기(10주 × 5일 = 50일) · 한 학년(190일) 누적. 일수는 여기 한 번만 적는다. */
export const TERM_DAYS = 50;
export const SCHOOL_YEAR_DAYS = 190;
/**
 * 🔴 누적액은 **게시된(반올림된) 일일 금액**에서 만든다. 반올림 전 값으로 곱하면
 *    독자가 페이지의 숫자로 검산했을 때 어긋난다 — 2026-08-21 라이브에서 실제로 그랬다:
 *    본문이 `$1.67`과 `$317.40`을 동시에 말했는데 `1.67 × 190 = 317.30`이다.
 *    이 사이트가 AdSense에서 다섯 번 떨어진 사유가 "검산하면 드러나는 모순"이다.
 *    **화면에 보이는 숫자끼리 맞아야 한다.**
 */
const publishedDaily = () => Number(money(vegSaving()).slice(1));
export const vegTermSaving = () => publishedDaily() * TERM_DAYS;
export const vegYearSaving = () => publishedDaily() * SCHOOL_YEAR_DAYS;

/* ────────────────────────────────────────────────────────────────────────────
 * 예산 가이드의 "$15/주" 다섯 날 — **데이터에서 고른다.**
 *
 * 🔴 2026-08-23까지 이 표가 통째로 손으로 적혀 있었고, 같은 글 첫 문단이
 *    파생값으로 말하는 것과 정면으로 어긋났다:
 *      · 첫 문단: 도시락 중앙값 $3.90 · 범위 $2~$7.70 · 94종 중 **20종만** $3 미만
 *      · 다섯 날 표: $1.75 · $1.85 · $2.00 · $2.10 · $2.23 — 닷새 중 **사흘이 그 범위의
 *        바닥($2)보다 싸다.** 주간 합계 $9.93은 같은 재료를 우리 추적가로 다시 세면 $22 대다.
 *    이 글은 **똑같은 이유로 이미 한 번 공개 정정**을 달았다("$2.09 a box" 건).
 *    두 번째는 없어야 한다 — 그래서 이제 손으로 안 적는다.
 *
 * 고르는 규칙(플래너가 실제로 하는 것과 같다):
 *   1. 통 가격이 싼 순서로 훑는다 (통 = 메인 + Fruit&Veg 간식 + 다른 간식 하나)
 *   2. **넛프리만** — 학교에 보내는 글이다
 *   3. 카테고리를 겹치지 않게 채우고(플래너의 variety 규칙), 다 차면 다시 싼 순서로
 * ──────────────────────────────────────────────────────────────────────────── */

type MenuRow = Row & { name?: string; category?: string; is_nut_free?: boolean };

export type BudgetDay = {
  name: string;
  category: string;
  ingredients: string[];
  /** 통 하나의 값 — 메인 + 간식 둘. */
  box: number;
};

/** 통 가격이 싼 순서로 정렬한 넛프리 메뉴. */
function nutFreeBoxesAscending(): BudgetDay[] {
  // 🔴 여기도 같은 계산을 한 벌 더 갖고 있었다(2026-09-15에 합쳤다).
  //    한 통의 정의는 `snackSlotsCost()` 하나뿐이다 — 밖에서도 그걸 부른다.
  const slots = snackSlotsCost();
  return (MENU_DATA as MenuRow[])
    .filter((m) => m.is_nut_free && m.name && m.category)
    .map((m) => ({
      name: m.name as string,
      category: m.category as string,
      ingredients: m.ingredients ?? [],
      box: sumCost(m.ingredients ?? []) + slots,
    }))
    .sort((a, b) => a.box - b.box);
}

/**
 * 한 주(기본 5일)치. 카테고리를 먼저 한 바퀴 돌리고 남은 자리는 다시 싼 순서로 채운다.
 * 🔴 개수를 손으로 적지 말 것 — `SCHOOL_WEEK_DAYS`가 유일한 출처다.
 */
export const SCHOOL_WEEK_DAYS = 5;

/**
 * 큰 누적액 표기. `money()`는 센트를 붙여서 "$1600.00"처럼 읽히는데,
 * 연 단위 금액에 센트는 정밀도의 착각을 준다. $100 이상은 달러로 반올림하고 천 단위를 끊는다.
 */
export const bigMoney = (n: number) =>
  n >= 100 ? `$${Math.round(n).toLocaleString("en-NZ")}` : money(n);

/**
 * "랩이 식빵보다 얼마나 비싼가" — easy-wraps 글이 이 값 위에 서 있다.
 * 🔴 예전엔 "roughly double"이라고 손으로 적었는데, 추적 상품이 **타코용 소형 토르티야**라
 *    비율이 1.0 근처였다. 상품을 랩으로 바로잡고 문장도 데이터에서 만든다.
 */
export function wrapVsBreadClause(): string {
  const wrap = servePrice("Tortilla");
  const bread = servePrice("Bread");
  const ratio = wrap / bread;
  // 🔴 `pctMore()`가 이미 "about"을 붙인다 — 여기서 또 붙이면 "about about"이 된다.
  return isMultiple(ratio) ? `${multipleWord(ratio)} that` : `${pctMore(ratio)} than that`;
}

/**
 * 매일 식빵 대신 랩을 쌌을 때의 **한 학년 누적**. 센트까지 적으면 정밀도의 착각을 준다 —
 * 추정치이므로 달러로 반올림한다.
 */
export const wrapYearlyGapLabel = () =>
  `$${Math.round((servePrice("Tortilla") - servePrice("Bread")) * SCHOOL_YEAR_DAYS)}`;

/** 학년 하나의 주 수. 누적 금액을 손으로 곱하지 않게 여기 한 번만 적는다. */
export const BUDGET_WEEKS = 40;

export function budgetWeek(days: number = SCHOOL_WEEK_DAYS): BudgetDay[] {
  const rows = nutFreeBoxesAscending();
  if (rows.length < days) {
    throw new Error(`예산 주간: 넛프리 메뉴가 ${rows.length}종뿐이라 ${days}일을 못 채운다`);
  }
  const picked: BudgetDay[] = [];
  const usedCategories = new Set<string>();
  const usedNames = new Set<string>();
  // 1바퀴: 카테고리가 겹치지 않게
  for (const r of rows) {
    if (picked.length >= days) break;
    if (usedCategories.has(r.category)) continue;
    usedCategories.add(r.category);
    usedNames.add(r.name);
    picked.push(r);
  }
  // 남은 자리: 다시 싼 순서로 (같은 메뉴는 두 번 안 쓴다)
  for (const r of rows) {
    if (picked.length >= days) break;
    if (usedNames.has(r.name)) continue;
    usedNames.add(r.name);
    picked.push(r);
  }
  // 표는 싼 순서로 읽히는 게 낫다 — 채우기 단계 때문에 순서가 흐트러진다.
  return picked.sort((a, b) => a.box - b.box);
}

/** 그 주의 합계. */
export const budgetWeekTotal = (days: number = SCHOOL_WEEK_DAYS) =>
  budgetWeek(days).reduce((t, d) => t + d.box, 0);

/**
 * 본문에 싣는 주간 합계. 🔴 **게시된 일일 금액의 합**이다 — 반올림 전 값으로 더하면
 * 독자가 표의 숫자를 더했을 때 어긋난다(`vegTermSaving`이 같은 이유로 이렇게 돼 있다).
 */
export const budgetWeekTotalLabel = (days: number = SCHOOL_WEEK_DAYS) =>
  money(budgetWeek(days).reduce((t, d) => t + Number(money(d.box).slice(1)), 0));

/** 표 한 줄. 요일 이름은 본문이 정하고, 값은 전부 여기서 온다. */
export function budgetWeekRows(days: number = SCHOOL_WEEK_DAYS): string[] {
  return budgetWeek(days).map(
    (d) => `| ${d.name} | ${d.category} | ${d.ingredients.join(", ")} | **${money(d.box)}** |`,
  );
}
