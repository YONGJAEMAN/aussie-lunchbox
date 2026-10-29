import { withReadTime } from "@/lib/readTime";
import priceIndex from "@/data/priceIndex.json";
import priceIndexSources from "@/data/priceIndexSources.json";
import priceCache from "@/data/price_cache.json";
import {
  isComparableRow, isThreeWayComparableRow, aisleTotals,
  winnerFlips, winnerTally, firstRoundDate, winnerRows,
  basketTotals, woolworthsCheaperClause,
} from "@/lib/priceIndexCompare";

/** 글 본문이 쓰는 금액 표기 — 한 자리에서만 정한다. */
const liveMoney = (n: number) => `$${n.toFixed(2)}`;
import { sundayShopLabel } from "@/lib/sundayShop";
import {
  chainCoverageTable, twoChainItems, movedAtBoth, movedAtNeither,
  movedAtBothTable, neverMovedList, overlapStart, sameDayItems, sameDayList,
  producePhrase, sameDayPhrase, chainReadingsClause, sharedMovesSentence, clusterVerdict,
} from "@/lib/priceMovement";
import {
  costClause, dietMoney, snackPool, droppedList, declaredProducts, dietGroup,
} from "@/lib/dietEconomics";
import {
  snackCount, unpricedSnacks, categoryTable, categoryRows, betweenCategorySpread,
  widestCategory, tightestCategory, cheapestCategory, dearestVerdict, spreadVerdict,
  widestPairClause, extremesTable, twoSnackCost, swapSaving, weeklySwapSaving,
  money as snackMoney, EXCLUDED_CATEGORY, betweenCategoryGap,
} from "@/lib/snackEconomics";
import {
  trackedProducts, labelledProducts, anyWarningCount, declaredCount, warnedCount, warnedKeysClause,
  hiddenRows, hiddenTable, freeFromTable, declaredVsWarnedTable, unlabelledPackagedExamples,
} from "@/lib/allergenFacts";
import { moversSentence, fullSpanItems } from "@/lib/priceSeries";
import {
  sesameDeclaredKeys, sesameWarnedKeys, productTable, breadRows, breadVerdict, breadTable,
  sesameMains, keptWithWarning, keptIfWarningsExcluded, keptWithKindy, unverifiedList, passesButOftenSesame, sandwichWarning,
} from "@/lib/sesameFacts";
import { PORTION_FACTORS, DEFAULT_PORTION } from "@/lib/planConfig";
import {
  swapCount,
  swapRows,
  swapTable,
  packSizeTable,
  samePackRows,
  smallerPackRows,
  cheaperRows,
  dearestRow,
  perLunchboxExtra,
  menuTotal,
  gfMenus,
  gfMedian,
  otherMedian,
  swapMenus,
  naturalGfMenus,
  swapMenuMedian,
  naturalGfMedian,
  swapLabelTable,
  swapLabelRows,
  labelledSwaps,
  unlabelledSwaps,
  swapsAddingDeclared,
  swapsAddingWarned,
  addedDeclaredBullets,
  addedWarnedClause,
  removalHoldsCount,
  swapProductName,
} from "@/lib/substituteCosts";
import {
  readingCount,
  readingDates,
  windowStart,
  windowEnd,
  longestGapDays,
  weekSpan,
  trackedCount,
  stableCount,
  stableList,
  stableMix,
  busiestClause,
  movedCount,
  movedOnceCount,
  movementTable,
  redefinedNames,
  basketMove,
  upDownSame,
  busiestRows,
} from "@/lib/priceMovement";
import {
  pricedCount,
  medianPack,
  medianServe,
  medianServes,
  packTotal,
  serveTotal,
  rankCorrelation,
  misrankedCount,
  singleServeCount,
  rowOf,
  cheapLookingTable,
  dearLookingTable,
  dearPacksCheapServes,
  dearestServe,
  servesSpreadTable,
  exposureRows,
  exposureTable,
  exposureShare,
  exposureTotal,
  menusCounted,
  usedAndPricedCount,
  usedUnpricedCount,
  threeAnswers,
  threeAnswersDiffer,
  menuCountVsServeCorr,
  commonVsRare,
  mostUsedExposureRank,
} from "@/lib/portionEconomics";
import {
  budgetWeekRows,
  budgetWeekTotalLabel,
  BUDGET_WEEKS,
  bigMoney,
  wrapVsBreadClause,
  wrapYearlyGapLabel,
  SCHOOL_YEAR_DAYS,
  money,
  packPrice,
  packServes,
  packSize,
  servePrice,
  serveLabel,
  priceMonth,
  multipleWord,
  isMultiple,
  pctMore,
  numberWord,
  roundPct,
  joinList,
  cheeseVsProteinsClause,
  boxMedianLabel,
  boxWeekLabel,
  approxMoney,
  boxFloorLabel,
  boxCeilingLabel,
  boxUnderCount,
  mainMedianLabel,
} from "@/lib/servePrice";
import {
  THERMOS_COUNT,
  DAIRY_FREE_COUNT,
  GLUTEN_FREE_COUNT,
  NO_COOK_COUNT,
  MAKE_AHEAD_COUNT,
  COOK_FRESH_COUNT,
  AHEAD_OR_NOCOOK_PCT,
  pctWord,
  MENU_COUNT,
} from "@/lib/menuCounts";
import menuDataJson from "@/data/menuData.json";
import {
  ironCostTableMarkdown, ironCostSummary, ironCostRows, portionIron, portionGrams, per100Iron, ideaIron,
  ironWeekSentence, thighVsBreastClause, wholemealVsWhiteClause, ironReferenceTableMarkdown,
  fortifiedTableMarkdown, practicalTipSentence, cheapestIronSourcesClause, NRV_IRON_4_8,
} from "@/lib/ironCost";
import {
  PROMO_WEEK_COUNT,
  firstWeek,
  lastWeek,
  prettyDate,
  frequencyTableMarkdown,
  seriesLine,
  everyWeekSentence,
  everyWeekCount,
  distinctKeyCount,
  onceOnlyCount,
  pricedWeeksFor,
  medianPctFor,
  minPctFor,
  maxPctFor,
  clubShareOverall,
  clubShareByWeek,
  promoCountByWeek,
  storeSplitMarkdown,
  storeSplit,
  churnTableMarkdown,
  churnFor,
  longestSingleProductRun,
  mostRotatedEveryWeek,
} from "@/lib/promoHistory";
import enMessages from "@/messages/en.json";

/**
 * 🔴 개수는 `@/lib/menuCounts`에서만 가져온다 — **`@/lib/siteCounts`가 아니다.**
 * siteCounts는 `POST_COUNT`를 만들려고 이 파일을 import하므로, 여기서 siteCounts를
 * 부르면 순환이 닫히고 `BLOG_SLUGS`가 undefined인 채로 로드된다(2026-08-20 실측).
 */
type MenuRow = {
  name: string;
  ingredients: string[];
  is_thermos?: boolean;
  prep_style?: string;
  is_dairy_free?: boolean;
  is_gluten_free?: boolean;
  is_vegetarian?: boolean;
  is_nut_free?: boolean;
  is_egg_free?: boolean;
  is_vegan?: boolean;
};

const ALL_MENUS = (menuDataJson as unknown as { MENU_DATA: { en: MenuRow[] } }).MENU_DATA.en;

/**
 * 🔴 예시 메뉴를 손으로 적지 말 것 — 메뉴가 바뀌면 글이 조용히 거짓말이 된다.
 * 이 사이트가 다섯 번 거절당한 사유가 정확히 "문구끼리의 모순"이었다.
 */
const namesWhere = (pred: (m: MenuRow) => boolean, n: number) =>
  ALL_MENUS.filter(pred).slice(0, n).map((m) => m.name);

const isThermos = (m: MenuRow) => m.is_thermos === true;

/** 보온병 메뉴 전부를 마크다운 목록으로. 개수도 이름도 데이터에서 온다. */
const thermosBullets = () =>
  namesWhere(isThermos, THERMOS_COUNT)
    .map((n) => `- **${n}**`)
    .join("\n");

/** 보온병 메뉴 중 조건을 만족하는 개수. 본문의 "14개 중 N개"를 손으로 적지 않으려고 있다. */
const thermosCountWhere = (pred: (m: MenuRow) => boolean) =>
  ALL_MENUS.filter((m) => isThermos(m) && pred(m)).length;

const isDairyFree = (m: MenuRow) => m.is_dairy_free === true;

/** Dairy-Free 글의 예시 메뉴. 이름을 손으로 적으면 메뉴가 바뀔 때 글만 안 따라온다. */
const dairyFreeList = () => namesWhere(isDairyFree, 8).join(", ");

/** 유제품 미포함 메뉴 중 조건을 만족하는 개수. 본문의 "44개 중 N개"를 손으로 안 적으려고 있다. */
const dairyFreeCountWhere = (pred: (m: MenuRow) => boolean) =>
  ALL_MENUS.filter((m) => isDairyFree(m) && pred(m)).length;

/** 조리 없이 담을 수 있는 유제품 미포함 메뉴를 마크다운 목록으로. 개수도 이름도 데이터에서 온다. */
const dairyFreeNoCookBullets = () =>
  ALL_MENUS.filter((m) => isDairyFree(m) && m.prep_style === "no-cook")
    .map((m) => `- **${m.name}**`)
    .join("\n");

const isGlutenFree = (m: MenuRow) => m.is_gluten_free === true;

/** Gluten-Free 글의 예시 메뉴. 이름을 손으로 적으면 메뉴가 바뀔 때 글만 안 따라온다. */
const glutenFreeList = () => namesWhere(isGlutenFree, 8).join(", ");

/** 글루텐 미포함 메뉴 중 조건을 만족하는 개수. 본문의 "그중 N개"를 손으로 안 적으려고 있다. */
const glutenFreeCountWhere = (pred: (m: MenuRow) => boolean) =>
  ALL_MENUS.filter((m) => isGlutenFree(m) && pred(m)).length;

/** 조리 없이 담을 수 있는 글루텐 미포함 메뉴를 마크다운 목록으로. 개수도 이름도 데이터에서 온다. */
const glutenFreeNoCookBullets = () =>
  ALL_MENUS.filter((m) => isGlutenFree(m) && m.prep_style === "no-cook")
    .map((m) => `- **${m.name}**`)
    .join("\n");

/**
 * 곡물 이름이 든 재료를 찾는 스캐너. 본문의 "밀·보리·호밀도, 보통의 빵·파스타·밀가루·
 * 귀리·크래커도 재료에 없다"는 단언을 **플래그가 아니라 재료로** 검산하는 데 쓴다.
 *
 * 🔴 `GF Pasta`·`Gluten-Free Bread`·`Rice Noodles`는 곡물 이름을 달고 있지만 대체품이다.
 *    이 예외를 안 두면 가드가 잔소리가 되고, 잔소리가 된 가드는 결국 꺼진다.
 *    (`lib/contentClaims.test.ts`가 같은 두 정규식을 들고 반대편에서 검산한다.)
 */
const GRAIN_WORD =
  /\b(wheat|barley|rye|bread|pasta|spaghetti|macaroni|noodles?|flour|couscous|semolina|oats?|crackers?|buns?|bagel|pita|croissant|scone|panini|muesli|pastry|pie|biscuits?|breadcrumbs?|tortilla|wrap)\b/i;
const GRAIN_SUBSTITUTE = /\b(GF|gluten[- ]?free|rice|corn|maize|quinoa|buckwheat|potato)\b/i;

/**
 * 귀리가 든 글루텐 미포함 메뉴. Coeliac NZ는 귀리도 빼는 것을 글루텐프리 식단으로 정의하므로
 * 그런 메뉴가 남아 있으면 본문이 **이름으로** 짚어야 한다.
 */
const glutenFreeOatMenus = () =>
  ALL_MENUS.filter((m) => isGlutenFree(m) && m.ingredients.some((i) => /\boats?\b/i.test(i)))
    .map((m) => m.name)
    .join(", ");

/**
 * 귀리 문장 **전체**. 목록이 아니라 문장을 돌려주는 게 요점이다.
 *
 * 🔴 2026-08-20: 앞 판은 본문에 `**${glutenFreeOatMenus()}** is built on oats`를 그대로
 *    박아 뒀다. `Date & Oat Slice`의 플래그를 내리자 목록이 비어
 *    **"And **** is built on oats."**가 라이브 문장이 됐다 — 그리고 그때 깨진 테스트는
 *    전부 손으로 적은 개수뿐이라, 숫자만 고치면 깨진 문장이 그대로 배포된다.
 *    (`0건`은 "바뀌었다"가 아니라 "아무것도 없다"이기도 하다.)
 *
 *    그래서 **문장과 목록이 한 몸으로 나타나고 한 몸으로 사라진다.** 귀리 메뉴가 있으면
 *    이름을 부르고, 없으면 "없다"고 말한다. 어느 쪽이든 빈 굵은글씨는 나올 수 없다.
 *    `lib/contentClaims.test.ts`가 두 갈래를 데이터와 대조한다.
 */
const glutenFreeOatSentence = () => {
  const names = glutenFreeOatMenus();
  return names
    ? `**${names}** is built on oats — for a coeliac child that is a menu to raise with your specialist rather than assume.`
    : `No menu behind the **Gluten Allergy** filter is built on oats.`;
};

/** 글루텐 미포함 메뉴가 실제로 쓰는 "대체 곡물" 재료 이름. 손으로 적으면 데이터와 갈라진다. */
const glutenSubstituteIngredients = () => {
  const seen = new Set<string>();
  for (const m of ALL_MENUS.filter(isGlutenFree)) {
    for (const i of m.ingredients) if (GRAIN_WORD.test(i)) seen.add(i);
  }
  return [...seen].join(", ");
};

const isNoCook = (m: MenuRow) => m.prep_style === "no-cook";

/** No-Cook 글의 예시 메뉴. 이름을 손으로 적으면 메뉴가 바뀔 때 글만 안 따라온다. */
const noCookList = () => namesWhere(isNoCook, 8).join(", ");

/** 무조리 메뉴 전부를 마크다운 목록으로. 개수도 이름도 데이터에서 온다. */
const noCookBullets = () =>
  ALL_MENUS.filter(isNoCook)
    .map((m) => `- **${m.name}**`)
    .join("\n");

/** 무조리 메뉴 중 조건을 만족하는 개수. 본문의 "그중 N개"를 손으로 안 적으려고 있다. */
const noCookCountWhere = (pred: (m: MenuRow) => boolean) =>
  ALL_MENUS.filter((m) => isNoCook(m) && pred(m)).length;

/**
 * 조리방식별 개수. `no-cook`은 `NO_COOK_COUNT`가 있지만 나머지 둘은 상수가 없다 —
 * 세 값을 한 문장에 쓰면서 하나만 손으로 적으면 그 하나가 먼저 낡는다.
 */
const prepStyleCount = (style: string) => ALL_MENUS.filter((m) => m.prep_style === style).length;

/**
 * 냉장을 전제로 하는 재료를 찾는 스캐너. 이 글의 중심 문장 —
 * **"불을 안 쓴다고 아이스팩이 필요 없어지는 게 아니다"** — 를 `prep_style` 플래그가 아니라
 * **재료 목록으로** 검산하는 데 쓴다. 무조리 메뉴의 3분의 2가 햄·닭·참치·마요·치즈·요구르트를
 * 재료로 갖고 있고, 그건 식품안전 글이 "가장 위험한 군"으로 분류한 바로 그 음식들이다.
 *
 * 🔴 `Peanut Butter`·`Vegan Mayo`는 이름에 걸리지만 냉장 의존 식품이 아니다. 이 예외를
 *    안 두면 가드가 잔소리가 되고, 잔소리가 된 가드는 결국 꺼진다. 예외가 너무 넓어도
 *    가드가 아무것도 안 지키므로 `lib/contentClaims.test.ts`가 양성 대조를 두 방향으로 든다.
 * 🔴 `Butter`는 일부러 뺐다. 넣으면 Jam Sandwich(빵·잼·버터)까지 "냉장 의존"으로 세어
 *    본문 문장이 데이터보다 과장된다. 문장은 "재료에 고기·생선·마요·치즈·요구르트가 있다"는
 *    **문자 그대로의 사실**만 말하고, 안전 판단은 식품안전 글에 맡긴다.
 */
const CHILL_WORD =
  /\b(ham|chicken|turkey|beef|salami|pork|bacon|tuna|salmon|fish|prawns?|mayo|mayonnaise|cheese|yoghurt|yogurt|cream|feta|mozzarella)\b/i;
const CHILL_EXCEPTION = /\b(peanut|vegan|plant|coconut|soy|almond|cashew|sesame)\b/i;
const chillIngredients = (m: MenuRow) =>
  m.ingredients.filter((i) => CHILL_WORD.test(i) && !CHILL_EXCEPTION.test(i));

/** 재료에 냉장 의존 식품이 있는 무조리 메뉴 수. */
const noCookChillCount = () => ALL_MENUS.filter((m) => isNoCook(m) && chillIngredients(m).length > 0).length;

/** 그런 재료가 하나도 없는 무조리 메뉴 수. */
const noCookAmbientCount = () =>
  ALL_MENUS.filter((m) => isNoCook(m) && chillIngredients(m).length === 0).length;

/** 그런 재료가 하나도 없는 무조리 메뉴를 마크다운 목록으로. */
const noCookAmbientBullets = () =>
  ALL_MENUS.filter((m) => isNoCook(m) && chillIngredients(m).length === 0)
    .map((m) => `- **${m.name}**`)
    .join("\n");

/**
 * "그 제한식을 빼면 더 비싼가" — 두 중앙값과 그 격차를 **한 번에** 만든다.
 *
 * 🔴 손으로 적지 말 것. 가격 캐시는 주간으로 갱신되므로 여기 적힌 센트는 반드시 낡는다
 *    (iron-rich 글은 같은 자리에서 배수를 네 번 연속 틀렸다). 그리고 값을 세 번 따로
 *    부르면 문장 안에서 서로 다른 주의 값이 섞일 여지가 생긴다 —
 *    `biggestWoolworthsWinSentence`를 한 번에 만든 것과 같은 이유다.
 *
 * 🔴 유제품·글루텐·계란이 **같은 계산을 세 벌** 갖고 있었고, 계란 것만 손으로 적혀 있었다.
 *    그 결과 본문이 "median $2.55 / $2.45 — 열 센트 차이"라고 말하는 동안 실제 값은
 *    $2.54 / $2.52(1센트)였다 — 헤드라인이 **8배 틀렸다.** 같은 일을 하는 자리가 둘 이상이면
 *    하나만 고치게 된다. 그래서 한 자리로 모았다.
 */
const perIngredientCost = (ing: string) => {
  const p = CACHE[ing]?.data?.price;
  return (typeof p === "number" && p > 0 ? p : 0) * (PORTION_FACTORS[ing] ?? DEFAULT_PORTION);
};

/** 메뉴 하나의 재료비. 메인 가격을 말하는 자리는 전부 여기를 거친다. */
const menuCost = (ings: string[]) => ings.reduce((t, i) => t + perIngredientCost(i), 0);

/* ────────────────────────────────────────────────────────────────────────────
 * "가장 싼 메인" 표 — 이름·금액·순서를 전부 데이터에서 만든다.
 *
 * 🔴 손으로 적혀 있는 동안 조용히 벌어져 있었다: 렌틸수프 84c(실제 92c),
 *    사보리라이스 94c($1.08), 그리고 "Cheese scones"는 상위 일곱 안에 있지도 않았다.
 *    표 아래 두 문장이 이 표의 값을 다시 말하므로, 표만 고치면 문장이 표를 반박한다.
 * ──────────────────────────────────────────────────────────────────────────── */

const CHEAPEST_MAINS_SHOWN = 7;

const cheapestMainRows = () =>
  ALL_MENUS.map((m) => ({ name: m.name, cost: menuCost(m.ingredients) }))
    .sort((a, b) => a.cost - b.cost)
    .slice(0, CHEAPEST_MAINS_SHOWN);

/** 첫 줄만 굵게 — 바로 아래 문장이 "the single cheapest option"이라고 짚는 줄이다. */
const cheapestMainsTableMarkdown = () =>
  cheapestMainRows()
    .map((r, i) => `| ${r.name} | ${i === 0 ? `**${serveLabel(r.cost)}**` : serveLabel(r.cost)} |`)
    .join("\n");

/** 표에 실제로 실린 줄에서만 값을 읽는다 — 표에서 빠진 메뉴를 문장이 인용하면 던진다. */
function shownMainCost(name: string): string {
  const row = cheapestMainRows().find((r) => r.name === name);
  if (!row) {
    throw new Error(
      `본문 최저가 표: "${name}"이 상위 ${CHEAPEST_MAINS_SHOWN}위 밖으로 밀렸다 — ` +
        `표를 인용하는 문장을 같이 고칠 것`,
    );
  }
  return serveLabel(row.cost);
}

const cheapestMainSentence = () => {
  const top = cheapestMainRows()[0];
  return `**the single cheapest option, ${top.name.toLowerCase()} at ${serveLabel(top.cost)}, is also one of the more filling**`;
};

function restrictionMedians(pred: (m: MenuRow) => boolean) {
  const cost = menuCost;
  const median = (xs: number[]) => {
    const a = [...xs].sort((x, y) => x - y);
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };
  const freeRows = ALL_MENUS.filter(pred);
  const otherRows = ALL_MENUS.filter((m) => !pred(m));
  // 한쪽이 비면 중앙값이 NaN이 되고 본문에 "$NaN"이 조용히 실린다.
  if (!freeRows.length || !otherRows.length) {
    throw new Error("본문 중앙값: 한쪽 메뉴 집합이 비었다 — 플래그가 바뀌었는지 볼 것");
  }
  const free = median(freeRows.map((m) => cost(m.ingredients)));
  const other = median(otherRows.map((m) => cost(m.ingredients)));
  const gap = Math.abs(free - other);
  return { free, other, gap, gapLabel: gap < 1 ? `${Math.round(gap * 100)}c` : money(gap) };
}

/** "the median X-free main works out at $a against $b … — Nc apart" */
function restrictionCostSentence(
  pred: (m: MenuRow) => boolean,
  freeNoun: string,
  containsClause: string,
): string {
  const { free, other, gapLabel } = restrictionMedians(pred);
  return (
    `the median ${freeNoun} main works out at **${money(free)}** against ` +
    `**${money(other)}** for the mains that ${containsClause} — ${gapLabel} apart`
  );
}

const dairyCostSentence = () => restrictionCostSentence(isDairyFree, "dairy-free", "contain it");

/**
 * 🔴 이 글의 가격표는 손으로 적으면 반드시 낡는다 — 실제로 2026-03부터 5개월 낡은 채
 * 사과 배너를 달고 서 있었다. 그 배너는 "Pak'nSave는 읽을 수 있는 피드가 없다"고
 * 말했는데 그건 확인 안 해본 추측이었고, 08-11에 양쪽 열이 주간 자동으로 바뀌었다.
 * → 표와 점수는 **`data/priceIndex.json`에서 생성한다.** 다시는 손으로 적지 않는다.
 */
const IDX = priceIndex as {
  woolworthsUpdated: string;
  paknsaveUpdated: string;
  newworldUpdated: string;
  items: {
    name: string;
    /** 통로. 통로별 합계(`aisleTotals`)가 이 값을 쓴다. */
    category?: string;
    unit: string;
    note?: string;
    countdown: number | null;
    paknsave: number | null;
    newworld?: number | null;
    paknsaveAsOf?: string;
    newworldAsOf?: string;
  }[];
};

/**
 * 🔴 규칙을 여기서 다시 구현하지 말 것. 예전엔 이 파일과 price-index 페이지에
 *    같은 30일 규칙이 복붙돼 있었고, **정작 페이지 바구니 합계는 둘 다 안 썼다.**
 *    그 틈으로 "You save $28.50"(실제 $4.99)가 라이브로 나갔다.
 */
const rowComparable = (i: (typeof IDX.items)[number]) =>
  isComparableRow(i, IDX.woolworthsUpdated);


/**
 * 🔴 제외 사유를 `paknsave === null`로 추론했다가 8건 중 5건을 틀렸다.
 *    **오늘 아침 price-index 페이지에서 고친 것과 똑같은 실수다** — 제외 경로는 둘이고
 *    값이 비었는지로는 구분되지 않는다. 진짜 근거는 sources 파일의 `blocked` 플래그다.
 *      · blocked  → 양쪽에 같은 규격의 상품이 없다 (상품 미매칭)
 *      · 그 외 낡은 행 → 그 주 Pak'nSave 특가라 정상가를 못 읽었다
 */
const SOURCES = priceIndexSources as {
  items: Record<string, {
    sku?: string;
    paknsave?: { blocked?: boolean; sku?: string };
    newworld?: { sku?: string };
  }>;
};
const isBlocked = (name: string) => SOURCES.items[name]?.paknsave?.blocked === true;

/**
 * 제외 사유 문구. **순수 함수로 빼 둔다** — 표에 제외 행이 0건이면 본문만 보는
 * 가드는 이 분기를 한 번도 못 밟는다(2026-08-24에 실제로 그랬고, 두 사유를
 * 서로 바꿔치기해도 가드가 안 잡혔다). 이제 값으로 직접 검사한다.
 *
 * 🔴 제외 경로는 **둘**이다. 값이 비었는지로 추론했다가 8건 중 5건을 틀렸다 —
 *    특가라 갱신을 건너뛴 것과, 한쪽 체인에 같은 상품이 없는 것은 다르다.
 */
export const exclusionReasonFor = (blocked: boolean): string =>
  blocked ? "no matching product at one chain" : "on special at Pak'nSave, so no regular price";

function priceTableMarkdown(): string {
  const rows = IDX.items.map((i) => {
    const label = i.note ? `${i.name} — ${i.note}` : i.name;
    if (!rowComparable(i)) {
      const why = exclusionReasonFor(isBlocked(i.name));
      return `| ${label} | ${i.paknsave === null ? "—" : money(i.paknsave)} | ${i.countdown === null ? "—" : money(i.countdown)} | _excluded (${why})_ |`;
    }
    const p = i.paknsave as number;
    const w = i.countdown as number;
    const winner = p < w ? "Pak'nSave" : w < p ? "Woolworths" : "Tie";
    return `| ${label} | ${money(p)} | ${money(w)} | ${winner} |`;
  });
  return rows.join("\n");
}

function scorecardMarkdown(): string {
  const rows = IDX.items.filter(rowComparable);
  const p = rows.reduce((a, b) => a + (b.paknsave as number), 0);
  const w = rows.reduce((a, b) => a + (b.countdown as number), 0);
  const pWins = rows.filter((r) => (r.paknsave as number) < (r.countdown as number)).length;
  const wWins = rows.filter((r) => (r.countdown as number) < (r.paknsave as number)).length;
  const ties = rows.length - pWins - wWins;
  const diff = w - p;
  const pct = ((diff / w) * 100).toFixed(1);
  return [
    `- **Pak'nSave cheaper on:** ${pWins} of the ${rows.length} comparable items`,
    `- **Woolworths cheaper on:** ${wWins}`,
    ties ? `- **Tie:** ${ties}` : null,
    ``,
    `**Basket total for those ${rows.length} items:**`,
    ``,
    `- Pak'nSave: ${money(p)}`,
    `- Woolworths: ${money(w)}`,
    `- **Difference: ${money(diff)} — about ${pct}% cheaper at Pak'nSave**`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

const COMPARABLE_COUNT = IDX.items.filter(rowComparable).length;

/**
 * 월간 분석 글용 — 격차가 어디에 몰려 있는지.
 * 🔴 손으로 적지 말 것. 이 글의 논지 자체가 "격차는 바구니 전체가 아니라 몇 품목"인데,
 *    그 몇 품목이 바뀌는 달에 숫자만 남으면 논지와 표가 어긋난다.
 */
const gapRows = () =>
  IDX.items
    .filter(rowComparable)
    .map((i) => ({ ...i, gap: (i.countdown as number) - (i.paknsave as number) }))
    .sort((a, b) => b.gap - a.gap);

const TOP_GAP_N = 4;

function topGapMarkdown(): string {
  return gapRows()
    .slice(0, TOP_GAP_N)
    .map(
      (i) =>
        `| ${i.name}${i.note ? ` — ${i.note}` : ""} | ${money(i.countdown as number)} | ${money(i.paknsave as number)} | ${money(i.gap)} |`,
    )
    .join("\n");
}

/** 상위 N품목이 전체 격차에서 차지하는 비율 (반올림 정수 %) */
function topGapShare(): number {
  const rows = gapRows();
  const total = rows.reduce((a, b) => a + b.gap, 0);
  const top = rows.slice(0, TOP_GAP_N).reduce((a, b) => a + b.gap, 0);
  return Math.round((top / total) * 100);
}

/**
 * 격차가 가장 큰 Woolworths 승리 품목을 **문장 조각으로** 돌려준다.
 * 🔴 `{name, note}`로 돌려주고 본문에서 조립했더니 note가 optional이라 타입이 깨졌고,
 *    무엇보다 호출을 두 번 하면 서로 다른 달의 값이 섞일 여지가 생긴다. 한 번에 만든다.
 */
/**
 * 반대 방향 최대 격차가 위 표의 상위 N품목보다 **큰지**를 데이터에서 판정한다.
 *
 * 🔴 2026-09-09 외부 감사가 잡은 것 — 본문에 "a bigger single-item gap than any of
 *    the four above"가 **손으로 적혀** 있었다. 쓸 당시엔 참이었지만 표가 갱신되면서
 *    오이 $1.00이 상위 네 품목($1.51·$1.51·$1.41·$1.20)보다 작아졌고, 문장만 남았다.
 *    순위·최댓값을 말하는 문장은 반드시 값에서 만든다.
 */
function reverseGapComparison(): string {
  const rows = gapRows();
  const back = rows.filter((i) => i.gap < 0);
  const worst = back[back.length - 1];
  if (!worst) return "";
  const biggest = Math.abs(worst.gap);
  const top = rows.slice(0, TOP_GAP_N).map((i) => i.gap);
  if (top.length === 0) return "";
  const max = Math.max(...top);
  const min = Math.min(...top);
  if (biggest > max) return " — a bigger single-item gap than any of the rows above, running the other way";
  if (biggest > min) return " — bigger than some of the rows above, running the other way";
  return " — smaller than any of the rows above, but running the other way";
}

function biggestWoolworthsWinSentence(): string {
  const rows = gapRows().filter((i) => i.gap < 0);
  const worst = rows[rows.length - 1];
  if (!worst) return "No item runs the other way this month";
  const label = worst.note ? `${worst.name} (${worst.note.toLowerCase()})` : worst.name;
  return `${label} is **${money(Math.abs(worst.gap))} cheaper at Woolworths**`;
}

/* ── 봄 글의 5월↔현재 변동표 ── */

/**
 * 🔴 2026-09-10까지 이 표는 **손으로 적혀 있었다.** 당근이 $2.25 → $2.18로 움직이자
 *    주간 수집이 곧바로 막혔다(가드가 잡았다). 품목 하나만 움직여도 매번 깨지는 자리다.
 *
 * **행 선택은 사람이 한다.** 표에서 뺀 것(사과·치즈)은 물가 변동이 아니라 항목 재정의라
 * 본문이 이유를 따로 밝힌다. 그 편집 판단은 데이터에서 나오지 않는다.
 * **값은 사람이 적지 않는다.** 5월은 `priceIndex.history[0]`, 현재는 `items`에서 온다.
 */
const MAY_TO_NOW_ROWS: Array<[string, string]> = [
  ["Pasta (500g)", "Pasta 500g"],
  ["Carrots (1kg)", "Carrots 1kg"],
  ["Bagels 4-pack", "Bagels 4-pack"],
  ["Wholegrain Bread (700g)", "Wholegrain bread 700g"],
  ["Lettuce", "Iceberg lettuce"],
  ["Bananas (1kg)", "Bananas 1kg"],
  ["Sliced Ham (200g)", "Shaved ham 200g"],
  ["Eggs (12-pack)", "Eggs 12-pack"],
  ["Butter (500g)", "Butter 500g"],
  ["Canned Tuna (185g)", "Canned tuna 185g"],
];

/** 변동이 20% 이상이면 굵게 — 표에서 눈에 걸려야 하는 행이다. */
function mayToNowTable(): string {
  const now = new Map(IDX.items.map((i) => [i.name, i.countdown]));
  const may = new Map(
    ((IDX as unknown as { history?: Array<{ items: Array<{ name: string; countdown: number | null }> }> })
      .history?.[0]?.items ?? []).map((i) => [i.name, i.countdown]),
  );
  return MAY_TO_NOW_ROWS.map(([key, label]) => {
    const a = may.get(key);
    const b = now.get(key);
    if (typeof a !== "number" || typeof b !== "number") return null;
    const pct = Math.round(((b - a) / a) * 100);
    const cell = `${pct >= 0 ? "+" : "−"}${Math.abs(pct)}%`;
    const shown = Math.abs(pct) >= 20 ? `**${cell}**` : cell;
    return { pct, line: `| ${label} | ${money(a)} | ${money(b)} | ${shown} |` };
  })
    .filter((r): r is { pct: number; line: string } => r !== null)
    .sort((x, y) => x.pct - y.pct)
    .map((r) => r.line)
    .join("\n");
}

/**
 * 표 아래 「무엇이 20% 넘게 움직였나」 문장. 표와 **같은 계산**을 쓴다.
 * 🔴 09-28 감사 B — 「Pasta and carrots both came down by more than 20%. Butter and tuna went up by
 *    more than half.」가 손으로 적혀 있었는데 표는 당근 −18%·버터 +49%였다. 문장이 표를 반박했다.
 */
function springMoversSentence(): string {
  const now = new Map(IDX.items.map((i) => [i.name, i.countdown]));
  const may = new Map(
    ((IDX as unknown as { history?: Array<{ items: Array<{ name: string; countdown: number | null }> }> })
      .history?.[0]?.items ?? []).map((i) => [i.name, i.countdown]),
  );
  const rows = MAY_TO_NOW_ROWS.map(([key, label]) => {
    const a = may.get(key);
    const b = now.get(key);
    if (typeof a !== "number" || typeof b !== "number") return null;
    return { name: label.replace(/\s+\d.*$/, "").toLowerCase(), pct: Math.round(((b - a) / a) * 100) };
  }).filter((r): r is { name: string; pct: number } => r !== null);
  const list = (xs: string[]) =>
    xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : xs[0];
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const down = rows.filter((r) => r.pct <= -20).sort((x, y) => x.pct - y.pct).map((r) => r.name);
  const up = rows.filter((r) => r.pct >= 20).sort((x, y) => y.pct - x.pct).map((r) => r.name);
  const parts: string[] = [];
  if (down.length) parts.push(`${cap(list(down))} came down by 20% or more.`);
  if (up.length) parts.push(`${cap(list(up))} went up by 20% or more.`);
  return parts.join(" ");
}

/** 본문이 인용하는 당근 하락률. 표와 **같은 계산**을 쓴다 — 두 자리가 갈라지면 안 된다. */
function carrotsFallPct(): number {
  const now = IDX.items.find((i) => i.name === "Carrots (1kg)")?.countdown;
  const may = ((IDX as unknown as { history?: Array<{ items: Array<{ name: string; countdown: number | null }> }> })
    .history?.[0]?.items ?? []).find((i) => i.name === "Carrots (1kg)")?.countdown;
  if (typeof now !== "number" || typeof may !== "number" || !(may > 0)) return 0;
  return Math.abs(Math.round(((now - may) / may) * 100));
}

/**
 * 🔴 09-28 전수 감사 B — 예산·배치쿠킹 글이 계란을 「개당 $0.43」「12구 $5.00」으로 손으로 적고 있었다.
 *    가격지수의 Pak'nSave 12구(방목)는 그 두 배다. 값은 지수에서 읽는다.
 */
function eggsDozenPnS(): number | null {
  const v = IDX.items.find((i) => i.name === "Eggs (12-pack)")?.paknsave;
  return typeof v === "number" && v > 0 ? v : null;
}

/** "about 92c each at Pak'nSave (a free-range dozen at $10.99)" */
function eggEachClause(): string {
  const d = eggsDozenPnS();
  if (d === null) return "the price on our [price index](/en/price-index)";
  const each = d / 12;
  const eachLabel = each < 1 ? `${Math.round(each * 100)}c` : money(each);
  return `about ${eachLabel} each for the free-range dozen we track at Pak'nSave, ${money(d)} a dozen`;
}

/** "~$10.99 for a free-range dozen at Pak'nSave in our latest reading" */
function eggsDozenLabel(): string {
  const d = eggsDozenPnS();
  if (d === null) return "see the [price index](/en/price-index) for this week's dozen";
  return `~${money(d)} for a free-range dozen at Pak'nSave in our latest [price index](/en/price-index) reading`;
}

/** "$8.99 at Pak'nSave and $10.50 at Woolworths" — Mainland 500g 블록. */
function cheeseBlockClause(): string {
  const r = IDX.items.find((i) => i.name === "Cheese Block (500g)");
  const parts: string[] = [];
  if (typeof r?.paknsave === "number") parts.push(`${money(r.paknsave)} at Pak'nSave`);
  if (typeof r?.countdown === "number") parts.push(`${money(r.countdown)} at Woolworths`);
  return parts.length ? parts.join(" and ") : "higher than that";
}

/**
 * 랩 글의 Farrah's 6구 — 가격지수 「Wraps 6-pack」 행에서 세 체인 값을 읽는다.
 * 🔴 09-28 감사 B: 손 표가 「~$4.00 (New World)」라 적었는데 같은 글이 $6.99, 지수의 New World도 $6.99였다.
 */
function farrahsClause(): string {
  const r = IDX.items.find((i) => i.name === "Wraps 6-pack") as
    | { countdown: number | null; paknsave: number | null; newworld?: number | null }
    | undefined;
  if (!r) return "";
  const parts: string[] = [];
  if (typeof r.paknsave === "number") parts.push(`${money(r.paknsave)} at Pak'nSave`);
  if (typeof r.countdown === "number") parts.push(`${money(r.countdown)} at Woolworths`);
  if (typeof r.newworld === "number") parts.push(`${money(r.newworld)} at New World`);
  if (!parts.length) return "";
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
  return `The one branded wrap we track at every chain is a Farrah's six-pack: ${list} in our latest [price index](/en/price-index) reading.`;
}

/**
 * 🔴 09-28 감사 B — 달걀 글 제목이 「Egg Is the Least Constraining of the Big Four」였다.
 *    메뉴 데이터로는 nut-free 89 > egg-free 65 > dairy-free 43 > gluten-free 23이라 **견과가 더 가볍다.**
 *    순위를 말하는 문장은 값에서 만든다.
 */
const BIG_FOUR = ["nut-free", "egg-free", "dairy-free", "gluten-free"] as const;

function eggLightnessHeading(): string {
  const egg = dietGroup("egg-free").count;
  const lighter = BIG_FOUR.filter((k) => k !== "egg-free" && dietGroup(k).count > egg).length;
  if (lighter === 0) return "Egg Is the Least Constraining of the Big Four";
  if (lighter === 1) return "Egg Is the Second-Lightest of the Big Four";
  return "Egg Is One of the Lighter Restrictions";
}

function eggVsNutClause(): string {
  const egg = dietGroup("egg-free").count;
  const nut = dietGroup("nut-free").count;
  if (nut <= egg) return "";
  return `Not the lightest, though: a nut filter leaves more of the menu standing (${nut} of ${menuTotal()} menus against egg's ${egg}) and, on the snack side, removes ${snackPool("Nut Allergy").dropped.length === 0 ? "nothing at all" : droppedList("Nut Allergy")}.`;
}

/**
 * 🔴 09-28 감사 B — 보온병 글 제목이 「Cheaper, Not Dearer」, 본문이 「costs less」였는데
 *    바로 위 생성 문장은 「about the same — $2.14 against $2.27」이었다. 판정은 `costClause`와 같은 문턱(8%)으로 낸다.
 */
function thermosCostVerdict(): string {
  const pct = dietGroup("thermos").pct;
  if (Math.abs(pct) < 8) return "So on our numbers the food in a flask is neither a saving nor a premium.";
  return pct < 0
    ? "So on our numbers the food in a flask is the cheaper option."
    : "So on our numbers the food in a flask costs more than a cold lunch.";
}

/** 현재 라운드의 달 이름 — 표 머리글과 본문이 같은 값을 쓰게 한다. */
const ROUND_MONTH = () =>
  new Date(`${IDX.woolworthsUpdated}T00:00:00Z`).toLocaleString("en-NZ", {
    month: "long",
    timeZone: "UTC",
  });

/* ── 3사 비교 (New World 포함) — 「세 체인, 같은 주」 글이 쓰는 수치 ── */
const THREE = () => IDX.items.filter((i) => isThreeWayComparableRow(i, IDX.woolworthsUpdated));
const NW_ROUND = () => roundDate(IDX.newworldUpdated);
const sum3 = (k: "countdown" | "paknsave" | "newworld") =>
  THREE().reduce((a, r) => a + (r[k] as number), 0);
const T3 = () => ({ n: THREE().length, w: sum3("countdown"), p: sum3("paknsave"), nw: sum3("newworld") });

/** 각 체인이 최저가인 품목 수. 「어디가 싸냐」를 총액이 아니라 칸으로 센다. */
const cheapestCounts = () => {
  const c = { w: 0, p: 0, n: 0 };
  for (const r of THREE()) {
    const w = r.countdown as number, pk = r.paknsave as number, nw = r.newworld as number;
    const m = Math.min(w, pk, nw);
    if (m === pk) c.p++; else if (m === w) c.w++; else c.n++;
  }
  return c;
};

/**
 * 2열 비교에 들어간 Pak'nSave 행 중 **Woolworths 라운드와 8일 이상 벌어진 것**.
 *
 * 🔴 2026-09-10 외부 감사 — 이 글은 두 열이 "close enough to the same day"라고
 *    말했는데, 실제로는 20행 중 6행이 2~3주 전 관측이었다. 문장을 데이터에서 만든다.
 */
function twoChainStale() {
  const rows = IDX.items.filter((r) => isComparableRow(r, IDX.woolworthsUpdated));
  const newest = Date.parse(IDX.woolworthsUpdated);
  return rows
    .filter((r) => r.paknsaveAsOf && (newest - Date.parse(r.paknsaveAsOf)) / 86_400_000 > 7)
    .map((r) => ({ name: r.name, on: r.paknsaveAsOf as string }))
    .sort((a, b) => Date.parse(a.on) - Date.parse(b.on));
}

/**
 * 3사 비교에 실제로 들어간 **관측일의 분포**.
 *
 * 🔴 2026-09-10 외부 감사 — 이 글은 "read in the same week"라고 말했는데,
 *    18개 공통 품목 중 Pak'nSave 6행·New World 6행이 8월 관측이었다.
 *    합계는 맞았다. 틀린 건 **문장**이다.
 *
 *    행을 받아들이는 규칙은 원래부터 「Woolworths 조사일 ±30일」이고
 *    (`isThreeWayComparableRow`) 그건 코드에 적혀 있었다. Foodstuffs 두 간판은
 *    매장별 가격이라 사람이 하나씩 확인해야 하고 아무 때나 다시 못 읽는다.
 *    그러니 규칙을 바꿀 게 아니라 **글이 그 규칙을 말하게** 한다.
 *
 * 손으로 다시 세지 않는다 — 데이터가 바뀌면 이 문장도 같이 바뀐다.
 */
function readingSpread() {
  const rows = THREE();
  const readings: Array<{ item: string; chain: string; on: string }> = [];
  for (const r of rows) {
    readings.push({ item: r.name, chain: "Woolworths", on: IDX.woolworthsUpdated });
    if (r.paknsaveAsOf) readings.push({ item: r.name, chain: "Pak'nSave", on: r.paknsaveAsOf });
    if (r.newworldAsOf) readings.push({ item: r.name, chain: "New World", on: r.newworldAsOf });
  }
  const newest = Math.max(...readings.map((x) => Date.parse(x.on)));
  const daysOld = (x: { on: string }) => Math.round((newest - Date.parse(x.on)) / 86_400_000);
  const older = readings.filter((x) => daysOld(x) > 7).sort((a, b) => daysOld(b) - daysOld(a));
  return {
    total: readings.length,
    inWeek: readings.length - older.length,
    older,
    oldestDays: older.length ? daysOld(older[0]) : 0,
    oldestDate: older.length ? roundDate(older[0].on) : "",
  };
}

/** 8일 이상 된 관측을 품목·체인·날짜로 늘어놓은 표. */
function olderReadingsTable(): string {
  return readingSpread().older
    .map((x) => `| ${x.item} | ${x.chain} | ${roundDate(x.on)} |`)
    .join("\n");
}

/**
 * 체인별로 **고정 상품(SKU)이 기록된 행이 몇 개인지**.
 *
 * 🔴 같은 감사 — 글은 CSV에 "each chain's pinned product, SKU and reading date"가
 *    있다고 말했지만 New World는 20행 중 2행에만 있었다. 빈칸이 가격을 지어냈다는
 *    뜻은 아니고, 어느 브랜드·규격을 비교했는지 독자가 되짚을 수 없다는 뜻이다.
 *    없는 SKU를 채워 넣을 수는 없으니 **몇 개가 비었는지를 글이 밝힌다.**
 */
function pinnedCoverage() {
  const rows = THREE();
  const has = { Woolworths: 0, "Pak'nSave": 0, "New World": 0 };
  for (const r of rows) {
    const src = (SOURCES.items as Record<string, {
      sku?: string;
      paknsave?: { sku?: string };
      newworld?: { sku?: string };
    }>)[r.name] ?? {};
    if (src.sku) has.Woolworths++;
    if (src.paknsave?.sku) has["Pak'nSave"]++;
    // 🔴 09-28 — 수집기(`update_newworld_prices.mjs`)는 `newworld ?? paknsave` SKU로
    //    읽는다. `newworld.sku`만 세면 실제로 고정 SKU로 읽힌 16행이 「기록 없음」이 된다.
    if ((src.newworld ?? src.paknsave)?.sku) has["New World"]++;
  }
  return { n: rows.length, has };
}

/** 세 체인 합계를 싼 순으로. 「가장 싸다/비싸다」를 손으로 적지 않는다. */
const RANK3 = () =>
  ([
    { chain: "Pak'nSave", total: T3().p },
    { chain: "Woolworths", total: T3().w },
    { chain: "New World", total: T3().nw },
  ] as const).slice().sort((a, b) => a.total - b.total);

/** 3사 글 두 번째 관찰 — New World가 어디에 서는지 데이터가 말하게 한다. */
function newWorldPlacement(): string {
  const r = RANK3();
  const nw = r.findIndex((x) => x.chain === "New World");
  const coop = "New World and Pak'nSave are the same co-operative. Foodstuffs runs both.";
  if (nw === 2) {
    return `The second is that **New World is dearest** — ${money(r[2].total - r[1].total)} above ${r[1].chain} — and ${coop} ` +
      (T3().nw > T3().p ? `Whatever the gap between the two banners is, it is not a difference in buying power.` : "");
  }
  return `The second is where New World lands: ${nw === 0 ? "cheapest" : "in the middle"}, at ${money(T3().nw)}. ${coop}`;
}

/** 통로별로 격차가 「없는」 통로가 몇 개인지 — 본문의 「absent from one aisle」을 생성한다. */
function aisleShapeClause(): string {
  const n = levelAisles().length;
  if (n === 0) return "It leans the same way in every aisle, by different amounts.";
  if (n === AISLES().length) return "It is close to level in every aisle.";
  return `It is *absent* from ${numberWord(n)} ${n === 1 ? "aisle" : "aisles"} and present in ${n === AISLES().length - 1 ? "the other" : "every other"}.`;
}

/**
 * 5월 라운드와 지금 라운드에서 **격차가 몇 행에 몰려 있나** — 두 라운드 다 값이 있는 행만.
 * 🔴 09-28 — 두 글이 「the concentration held」를 손으로 적고 있었는데
 *    같은 16행으로 재 보면 5월 34% → 지금 50%대였다. 비율과 겹치는 행 수를 생성한다.
 */
function concentrationThenNow() {
  const rows = winnerRows();
  const share = (gap: (r: (typeof rows)[number]) => number) => {
    const sorted = [...rows].sort((a, b) => gap(b) - gap(a));
    const total = rows.reduce((s, r) => s + gap(r), 0);
    const top = sorted.slice(0, TOP_GAP_N);
    return { pct: total > 0 ? Math.round((top.reduce((s, r) => s + gap(r), 0) / total) * 100) : 0, names: top.map((r) => r.name) };
  };
  const then = share((r) => r.thenW - r.thenP);
  const now = share((r) => r.nowW - r.nowP);
  return { n: rows.length, thenPct: then.pct, nowPct: now.pct, same: now.names.filter((x) => then.names.includes(x)).length };
}

/** 위 값을 문장으로 — 두 글이 같은 문장을 쓴다. */
function concentrationSentence(): string {
  const c = concentrationThenNow();
  return `On the ${c.n} rows priced at both chains in both rounds, the ${numberWord(TOP_GAP_N)} widest gaps made up ` +
    `${c.thenPct}% of the Woolworths–Pak'nSave difference in ${MAY_ROUND()} and ${c.nowPct}% in ${WOOLIES_ROUND()}, ` +
    `and ${c.same === 0 ? "none" : numberWord(c.same)} of those ${numberWord(TOP_GAP_N)} rows ${c.same === 1 ? "is" : "are"} the same in both rounds`;
}

/** 승자가 바뀐 행이 전부 「진 쪽이 올라서」였나 — 본문의 「방향이 한결같았다」를 조건으로. */
const flipsAllLoserRose = () =>
  FLIPS().length > 0 && FLIPS().every((x) => (x.now === "Woolworths" ? x.moveP : x.moveW) > 0);

const gapWP = (r: { countdown: unknown; paknsave: unknown }) => (r.countdown as number) - (r.paknsave as number);

/** W−P 격차 상위 N행 표. 어디에 격차가 쏠려 있는지 보여준다. */
function gapTable3(n: number): string {
  return [...THREE()].sort((a, b) => gapWP(b) - gapWP(a)).slice(0, n)
    .map((r) => `| ${r.name} | ${money(r.countdown as number)} | ${money(r.paknsave as number)} | ${money(r.newworld as number)} | **${money(gapWP(r))}** |`)
    .join("\n");
}
/** 상위 N행이 전체 격차에서 차지하는 비율. */
function gapShare3(n: number): number {
  const rows = THREE(); const total = rows.reduce((a, r) => a + gapWP(r), 0);
  const top = [...rows].sort((a, b) => gapWP(b) - gapWP(a)).slice(0, n).reduce((a, r) => a + gapWP(r), 0);
  return Math.round((top / total) * 100);
}
/** Woolworths가 Pak'nSave보다 싼 행 — 「무조건 Pak'nSave」가 틀렸다는 근거. */
function woolliesWins3(): string {
  return THREE().filter((r) => gapWP(r) < 0)
    .sort((a, b) => gapWP(a) - gapWP(b))
    .map((r) => `| ${r.name} | ${money(r.countdown as number)} | ${money(r.paknsave as number)} | **${money(-gapWP(r))}** |`)
    .join("\n");
}
const woolliesWinCount = () => THREE().filter((r) => gapWP(r) < 0).length;

/* ── 통로별 승자 (2026-09-11 신설) ──
 *
 * 🔴 이 절이 왜 생겼나 — 이 글은 「Pak'nSave가 싸다」(총액 하나)와 18줄짜리 품목 표
 *    사이에 아무것도 없었다. 독자가 실제로 알고 싶은 것은 그 사이에 있다:
 *    **어느 통로에서 갈리나.** `category`는 데이터에 처음부터 있었는데 안 쓰고 있었다.
 *
 * 🔴 「사실상 같다」의 기준을 손으로 정하지 않는다 — 임계값 하나를 두고 통로가
 *    스스로 갈리게 한다. 지금 라운드는 0.1% 다음이 7.4%라 임계값을 2%로 두든
 *    5%로 두든 같은 답이 나온다. 그 여유가 없어지면 문장이 먼저 바뀔 것이다.
 */
const LEVEL_PCT = 2;
const AISLES = () => aisleTotals();
const pctLabel = (p: number) => `${p < 0 ? "−" : ""}${Math.abs(p).toFixed(1)}%`;

function aisleTable(): string {
  return AISLES()
    .map((a) =>
      `| ${a.aisle} | ${a.n} | ${money(a.woolworths)} | ${money(a.paknsave)} | ${money(a.newworld)} | ${a.gapWP < 0 ? "−" : ""}${money(Math.abs(a.gapWP))} (${pctLabel(a.pctWP)}) |`)
    .join("\n");
}

/** 통로 합계가 가장 낮은 체인별 통로 수. 「칸으로 세기」를 통로 단위로. */
const aisleWins = (chain: "Woolworths" | "Pak'nSave" | "New World") =>
  AISLES().filter((a) => a.cheapest === chain).length;

/** W−P 격차가 통로 합계의 2% 미만인 통로 — 사실상 같은 통로. */
const levelAisles = () => AISLES().filter((a) => Math.abs(a.pctWP) < LEVEL_PCT);
const steepAisles = () => AISLES().filter((a) => Math.abs(a.pctWP) >= LEVEL_PCT);

/** 사실상 같은 통로를 뺀 나머지가 전체 격차에서 차지하는 비율. */
function gapOutsideLevel(): number {
  const total = AISLES().reduce((s, a) => s + a.gapWP, 0);
  if (total === 0) return 0;
  return Math.round((steepAisles().reduce((s, a) => s + a.gapWP, 0) / total) * 100);
}

/**
 * 「사실상 같은 통로」 문단. 통로가 0개·1개·여러 개인 경우를 다 처리한다 —
 * 데이터가 바뀌면 문장이 바뀌어야 하고, 그때 없는 통로를 가리키면 안 된다.
 */
function levelAisleClause(): string {
  const level = levelAisles();
  if (level.length === 0) {
    return `Every aisle leans the same way this round — Pak'nSave is cheaper in all ${numberWord(AISLES().length)} of them.`;
  }
  const a = level[0];
  const names = joinList(level.map((x) => x.aisle.toLowerCase()));
  const one = level.length === 1;
  return `The aisle Woolworths takes is also the one that is level. ${names.charAt(0).toUpperCase()}${names.slice(1)} ` +
    `${one ? "comes" : "come"} to ${money(a.woolworths)} at Woolworths against ${money(a.paknsave)} at Pak'nSave ` +
    `across ${numberWord(a.n)} ${one ? "lines" : "lines"} — ${money(Math.abs(a.gapWP))} apart on a ${money(a.woolworths)} sub-basket. ` +
    `Every other aisle sits between ${steepRange()} apart. ` +
    (gapOutsideLevel() >= 100
      ? `The whole Woolworths–Pak'nSave gap therefore comes from outside ${one ? "it" : "them"} — ${gapOutsideLevel()}% of it by the arithmetic, because ${one ? "this aisle runs" : "these aisles run"} a couple of cents the other way.`
      : `That is why ${gapOutsideLevel()}% of the whole Woolworths–Pak'nSave gap comes from outside ${one ? "it" : "them"}.`);
}

/** 기울어진 통로들의 격차 폭 — "7%에서 14% 사이" 같은 문장을 만든다. */
function steepRange(): string {
  const ps = steepAisles().map((a) => Math.abs(a.pctWP)).sort((x, y) => x - y);
  if (ps.length === 0) return "";
  if (ps.length === 1) return pctLabel(ps[0]);
  return `${ps[0].toFixed(0)}% and ${ps[ps.length - 1].toFixed(0)}%`;
}

/**
 * Woolworths가 이긴 행의 **성격**.
 * 🔴 2026-09-11 — 여기에 "Three of those are salad vegetables"가 손으로 적혀 있었고,
 *    표에는 Cucumber·Lettuce·**Rice (1kg)** 셋이 찍혀 있었다. 둘만 채소다.
 *    표는 생성인데 그 표를 요약하는 문장이 손글씨였다.
 */
function woolliesWinShape(): string {
  const wins = THREE().filter((r) => gapWP(r) < 0);
  const produce = wins.filter((r) => r.category === "Produce");
  const rest = wins.filter((r) => r.category !== "Produce");
  if (wins.length === 0) return "There is no row where Woolworths comes in cheaper this round.";
  const head =
    `${numberWord(produce.length)[0].toUpperCase()}${numberWord(produce.length).slice(1)} of the ` +
    `${numberWord(wins.length)} ${produce.length === 1 ? "is" : "are"} fresh produce`;
  if (rest.length === 0) return `${head}.`;
  const widest = Math.max(...rest.map((r) => -gapWP(r)));
  return `${head}. The ${rest.length === 1 ? "other line" : "other lines"} — ` +
    `${joinList(rest.map((r) => r.name.toLowerCase().replace(/\s*\([^)]*\)/, "")))} — ` +
    `${rest.length === 1 ? "sits" : "sit"} inside ${money(widest)}, which is a rounding difference rather than a finding.`;
}

/* ── 승자가 바뀐 품목 (2026-09-11 신설) ──
 *
 * 🔴 이 글은 "Whether the four-item concentration holds"를 지켜보겠다고 써 두고
 *    라운드가 두 개 쌓인 뒤에도 답을 하지 않고 있었다. 5월 라운드가 데이터에
 *    들어 있는데 이 글은 현재 라운드만 읽고 있었다.
 */
const FLIPS = () => winnerFlips();
const TALLY = () => winnerTally();
const MAY_ROUND = () => roundDate(firstRoundDate());
/** 부호를 사이트 표기(−)로. ASCII 하이픈이 섞이면 표와 산문이 달라 보인다. */
/** 반복비용 표에 몇 줄을 보일지. 본문 문장과 표가 같은 값을 쓴다. */
const EXPOSURE_ROWS = 10;
const EXPOSURE_TOP = 3;

const signed = (n: number, digits = 2) =>
  `${n < 0 ? "−" : ""}${Math.abs(n).toFixed(digits)}`;

/** 두 라운드 간격을 달로. "four months apart"를 손으로 적지 않는다. */
const roundGapMonths = () =>
  Math.round(
    (Date.parse(IDX.woolworthsUpdated) - Date.parse(firstRoundDate())) / (86_400_000 * 30.44),
  );

/** 이동 칸. 0원이면 부호를 붙이지 않는다 — "+$0.00"은 움직인 것처럼 읽힌다. */
const moveCell = (v: number) =>
  Math.round(v * 100) === 0 ? "unchanged" : `${v > 0 ? "+" : "−"}${money(Math.abs(v))}`;

function flipTable(): string {
  return FLIPS()
    .map((f) =>
      `| ${f.name} | ${money(f.thenW)} / ${money(f.thenP)} | ${money(f.nowW)} / ${money(f.nowP)} | ` +
      `${moveCell(f.moveW)} | ${moveCell(f.moveP)} |`)
    .join("\n");
}

/**
 * 승자가 바뀐 이유가 **이긴 쪽이 내렸기 때문인가, 진 쪽이 올랐기 때문인가.**
 * 문장을 손으로 적지 않는다 — 다음 라운드에 방향이 바뀌면 문장도 바뀌어야 한다.
 */
/** 승자가 어느 쪽으로 넘어갔나. 방향을 손으로 적지 않는다. */
function flipShape(): string {
  const f = FLIPS();
  const toW = f.filter((x) => x.now === "Woolworths").length;
  const toP = f.filter((x) => x.now === "Pak'nSave").length;
  if (f.length === 0) return "";
  if (toP === 0) return "every one of them from Pak'nSave to Woolworths";
  if (toW === 0) return "every one of them from Woolworths to Pak'nSave";
  return `${numberWord(toW)} to Woolworths and ${numberWord(toP)} to Pak'nSave`;
}

/** 승자가 바뀐 폭이 가장 큰 행의 이름 / 이긴 체인 / 진 체인. */
function flipExample(winner?: boolean): string {
  const f = FLIPS()[0];
  if (!f) return "";
  if (winner === undefined) return f.name.toLowerCase().replace(/\s*\([^)]*\)/, "");
  return winner ? f.now : f.was;
}

/** 5월 라운드에 양쪽 값이 없어서 이 비교에 못 들어간 행. */
function noMayRows(): string[] {
  const may = new Map(
    ((IDX as unknown as { history?: Array<{ items: Array<{ name: string; countdown: number | null; paknsave: number | null }> }> })
      .history?.[0]?.items ?? []).map((i) => [i.name, i]),
  );
  return IDX.items
    .filter((r) => isComparableRow(r, IDX.woolworthsUpdated))
    .filter((r) => {
      const t = may.get(r.name);
      return !t || t.countdown === null || t.paknsave === null;
    })
    .map((r) => r.name.toLowerCase().replace(/\s*\([^)]*\)/, ""));
}

function flipDirection(): string {
  const f = FLIPS();
  if (f.length === 0) return "";
  const loserRose = f.filter((x) => (x.now === "Woolworths" ? x.moveP : x.moveW) > 0);
  const winnerFell = f.filter((x) => (x.now === "Woolworths" ? x.moveW : x.moveP) < 0);
  if (loserRose.length === f.length && winnerFell.length < f.length) {
    const winnerMove = (x: (typeof f)[number]) => (x.now === "Woolworths" ? x.moveW : x.moveP);
    const still = f.filter((x) => Math.round(winnerMove(x) * 100) === 0);
    const tail = still.length
      ? ` — and on ${joinList(still.map((x) => x.name.toLowerCase().replace(/\s*\([^)]*\)/, "")))} the winning chain did not move a cent.`
      : ".";
    return `In all ${numberWord(f.length)}, the chain that lost the row **went up**. ` +
      `That is a different story from the other one getting cheaper${tail}`;
  }
  return `Of the ${numberWord(f.length)}, ${numberWord(loserRose.length)} changed hands because the losing chain went up and ` +
    `${numberWord(winnerFell.length)} because the winning chain came down.`;
}
/** 3사에서 빠진 행과 사유. */
const missing3 = () => IDX.items.filter((i) => !isThreeWayComparableRow(i, IDX.woolworthsUpdated))
  .map((i) => i.name.toLowerCase().replace(/\s*\([^)]*\)/, ""));


/**
 * 🔴 이 글의 수치는 **데이터에서 생성**되므로 주간 크론이 돌면 같이 바뀐다.
 *    그런데 제목·본문이 "August 2026"이라고 못박혀 있었다 — 09-09 실측 결과
 *    「August」 글이 9월 수치($112.47/$103.93·20개)를 보여주고 있었다.
 *    제목에서 달을 빼고, 본문이 **자기 수치의 날짜를 스스로 말하게** 한다.
 */
const roundDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${d.toLocaleString("en-NZ", { month: "long", timeZone: "UTC" })} ${d.getUTCFullYear()}`;
};
const WOOLIES_ROUND = () => roundDate(IDX.woolworthsUpdated);
const PNS_ROUND = () => roundDate(IDX.paknsaveUpdated);

const BASKET = (() => {
  const rows = IDX.items.filter(rowComparable);
  const w = rows.reduce((a, b) => a + (b.countdown as number), 0);
  const p = rows.reduce((a, b) => a + (b.paknsave as number), 0);
  return { n: rows.length, w, p, diff: w - p, pct: ((w - p) / w) * 100 };
})();

/**
 * 생성 문장이 문단을 열 때 첫 글자를 올린다.
 * 🔴 소문자로 시작하는 문장이 라이브에 세 군데 있었다("nothing is excluded…",
 *    "wholegrain bread and cheese block are…"). 값을 바꾸지 말고 표기만 고친다.
 */
const cap = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t);

/** 제외된 행의 이름을 문장으로 — 사유는 전부 같은 주의 Pak'nSave 특가일 수도, 미매칭일 수도 있다 */
function excludedSentence(): string {
  const ex = IDX.items.filter((i) => !rowComparable(i));
  const names = ex.map((i) => i.name.toLowerCase().replace(/\s*\([^)]*\)/, ""));
  if (names.length === 0) return "nothing is excluded this round";
  const blocked = ex.filter((i) => isBlocked(i.name)).length;
  const why =
    blocked === 0
      ? "every one of them because the Pak'nSave price that week was a special, and a special is not a shelf price"
      : `${ex.length - blocked} because the Pak'nSave price was a special that week, ${blocked} because no product at one chain matches the stated spec`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} — ${why}`;
}

/** "telegraph cucumber, iceberg lettuce and long-grain rice" 처럼 이번 주 실제 승자를 문장으로 */
/** 비교 가능 행 수 문장 — 20/20인 주에 「나머지는 제외 사유를 보였다」고 말하지 않게. */
function comparableSentence(): string {
  const total = IDX.items.length;
  if (COMPARABLE_COUNT === total) return `All ${total} items tracked are priced at both chains on comparable dates this week.`;
  return `Of the ${total} items tracked, ${COMPARABLE_COUNT} are currently priced at both chains on comparable dates. The rest are shown above with the reason they are excluded, rather than estimated — an estimated number in a price index is worse than a missing one.`;
}

/** 점수판과 같은 행으로 어느 쪽 바구니가 싼지 — 전략 문단이 데이터와 어긋나지 않게. */
function cheaperBasketStore(): string {
  const rows = IDX.items.filter(rowComparable);
  const p = rows.reduce((a, r) => a + (r.paknsave as number), 0);
  const w = rows.reduce((a, r) => a + (r.countdown as number), 0);
  return p < w ? "Pak'nSave" : w < p ? "Woolworths" : "a tie";
}

/** woolworthsWinsSentence의 짝 — Pak'nSave가 싼 품목. 「Pak'nSave는 기본 식료품에서 압도적」 같은 손글씨 규칙을 대신한다. */
function paknsaveWinsSentence(): string {
  const names = IDX.items
    .filter(rowComparable)
    .filter((i) => (i.paknsave as number) < (i.countdown as number))
    .map((i) => (i.note ? `${i.name.toLowerCase()} (${i.note.toLowerCase()})` : i.name.toLowerCase()));
  if (names.length === 0) return "none of the comparable items this week";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function woolworthsWinsSentence(): string {
  const names = IDX.items
    .filter(rowComparable)
    .filter((i) => (i.countdown as number) < (i.paknsave as number))
    .map((i) => (i.note ? `${i.name.toLowerCase()} (${i.note.toLowerCase()})` : i.name.toLowerCase()));
  if (names.length === 0) return "none of the comparable items this week";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * iron-rich 글의 가격 문단 — `data/price_cache.json`에서 생성한다.
 *
 * 🔴 이걸 생성으로 바꾼 이유 (2026-08-18):
 * "렌틸은 다진소고기의 N분의 1"이라는 주장이 **네 번 연속 거짓이 됐다** —
 * 실제 배수가 10.2 → 11.13 → 13.41 → 9.37로 움직이는 동안 본문은 "one-tenth" →
 * "roughly a tenth" → "under a tenth"로 세 번 고쳐 썼고, 매번 다음 갱신에서 또 깨졌다.
 * 표현을 고르는 문제가 아니었다. **손으로 적은 배수는 가격이 움직이면 무조건 깨진다.**
 *
 * 더 나빴던 건 표와 문장이 갈라져 있었다는 것 — 표는 소고기 $2.55, 바로 아래 문장은
 * $3.35였다. 둘 다 1인칭 주장이라 하나는 반드시 거짓이었고 아무 가드도 안 보고 있었다.
 * 이제 둘 다 같은 함수에서 나온다.
 *
 * 🔴 캐시에 키가 없으면 **던진다.** 재료 이름이 바뀌었을 때 "0c"가 조용히 실리는 것보다
 *    빌드가 죽는 게 낫다 — 이 저장소가 반복해서 당한 게 정확히 조용한 폴백이다.
 * ──────────────────────────────────────────────────────────────────────────── */

const CACHE = priceCache as Record<string, { timestamp?: number; data?: { price?: number } }>;

/**
 * 🔴 `servePrice`·`serveLabel`·`packPrice`·`money`는 **`@/lib/servePrice`에 있다.**
 *    2026-08-20까지 이 파일이 자기 사본을 들고 있었고, `content/guides.ts`는 아예
 *    아무것도 없이 금액을 손으로 적고 있었다 — 같은 치즈가 한쪽은 39c, 캐시는 34c였다.
 *    사본을 다시 만들지 말 것. 두 벌이 되는 순간 갈라진다.
 */

/**
 * 표에 싣는 철분 급원. 라벨은 사람이 정하고, 값은 캐시에서 온다.
 *
 * 🔴 **이 목록은 일부러 가나다순이다 — 가격순으로 적지 말 것.**
 * 처음엔 우연히 가격순으로 적어 뒀는데, 그러면 `ironPriceTableMarkdown()`에서 정렬을
 * 통째로 지워도 결과가 똑같아서 **정렬 가드가 발화하지 않는다**(돌연변이로 확인).
 * 선언 순서가 결과 순서와 달라야 정렬이 실제로 일하는 코드가 되고, 가드도 살아난다.
 */
const IRON_SOURCES: { label: string; key: string }[] = [
  { label: "Beef mince", key: "Beef Mince" },
  { label: "Black beans (tinned)", key: "Black Beans" },
  { label: "Brown lentils (tinned)", key: "Red Lentils" },
  { label: "Chicken breast", key: "Chicken Breast" },
  { label: "Chickpeas (tinned)", key: "Chickpeas" },
  { label: "Dried apricots", key: "Dried Apricots" },
  { label: "Egg", key: "Egg" },
  { label: "Rolled oats", key: "Rolled Oats" },
  { label: "Sultanas", key: "Sultanas" },
];

/** 가격을 언제 잰 값인지 — 캐시 타임스탬프에서 만든다. 손으로 적으면 이것도 낡는다. */
const ironPriceMonth = priceMonth;

/** 싼 순으로 정렬해서 낸다 — "the spread was enormous"가 표로 보여야 한다. */
function ironPriceTableMarkdown(): string {
  const rows = IRON_SOURCES.map((s) => ({ ...s, cost: servePrice(s.key) })).sort(
    (a, b) => a.cost - b.cost,
  );
  const cheapest = rows[0];
  return rows
    .map((r) =>
      r.key === cheapest.key
        ? `| ${r.label} | **${serveLabel(r.cost)}** |`
        : `| ${r.label} | ${serveLabel(r.cost)} |`,
    )
    .join("\n");
}

/**
 * "가장 싼 철분 급원은 …" — 순위가 바뀌면 문장이 저절로 바뀐다.
 *
 * 🔴 2026-09-15까지 이 자리에 **손으로 적은 문장**이 있었다:
 *    "Red lentils (in soup) and Weet-Bix (in trail mix) deliver the most iron per dollar."
 *    Weet-Bix는 우리가 **추적하지 않는 품목**이라 뒷받침할 근거가 아예 없었다.
 *    말할 수 있는 것만 말한다 — 추적하는 표에서 제일 싼 것.
 */
function cheapestIronClause(): string {
  const rows = IRON_SOURCES.map((s) => ({ ...s, cost: servePrice(s.key) })).sort(
    (a, b) => a.cost - b.cost,
  );
  const [first, second] = rows;
  const dearest = rows[rows.length - 1];
  return (
    `**Best value of the sources we track:** ${first.label} at ${serveLabel(first.cost)} a serve, ` +
    `then ${second.label} at ${serveLabel(second.cost)} — against ${serveLabel(dearest.cost)} for ` +
    `${dearest.label} at the other end. Leftovers change the sum for the meat rows, but not the order.`
  );
}

/** 배수는 반올림 정수로만 말한다. 분수 표현("a tenth")은 쓰지 않는다 — 그게 네 번 깨졌다. */
function lentilsVsMinceMultiple(): number {
  return Math.round(servePrice("Beef Mince") / servePrice("Red Lentils"));
}

/** 1mg당 배수 — 1회분 가격 배수만 말하면 1회분에 든 철분이 달라 렌틸이 실제보다 유리해 보인다(10-02). */
function lentilsVsMincePerMgMultiple(): number {
  const rows = ironCostRows();
  const per = (k: string) => rows.find((r) => r.key === k)!.perMg;
  return Math.round(per("Beef Mince") / per("Red Lentils"));
}

function lentilsVsMinceSentence(): string {
  return (
    `**Tinned lentils deliver iron at ${serveLabel(servePrice("Red Lentils"))} a serve, ` +
    `against ${serveLabel(servePrice("Beef Mince"))} for beef mince — about ` +
    `${lentilsVsMinceMultiple()}× the price.**`
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Gluten-Free 글의 "대체품이 얼마나 비싼가" 표 — `data/price_cache.json`에서 생성한다.
 *
 * 🔴 손으로 적지 말 것. 캐시는 주간으로 갱신되므로 여기 적힌 금액은 반드시 낡는다.
 *    그리고 이 절의 논지 자체가 **"대체품은 비싸고, 원래 밀이 아니던 요리는 안 비싸다"**라
 *    금액이 낡으면 논지와 표가 통째로 어긋난다 — iron-rich 글이 같은 자리에서
 *    배수를 네 번 연속 틀렸다.
 *
 * 🔴 캐시에 키가 없으면 **던진다.** 재료 이름이 바뀌었을 때 "$0.00"이 조용히 실리는 것보다
 *    빌드가 죽는 게 낫다.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * 라벨은 사람이 정하고, 두 값은 캐시에서 온다. 짝은 **같은 쓰임의 제품**끼리만 짓는다.
 *
 * 🔴 귀리 짝(`Rolled Oats` ↔ `Rolled Oats (GF)`)은 2026-08-20에 뺐다. 이 표는 "글루텐프리로
 *    사려면 얼마나 더 드나"를 말하므로, 한 줄을 넣는 건 **그 제품을 글루텐프리 구매 선택지로
 *    제시하는 것**이다. Coeliac NZ가 귀리를 뺀 식단을 글루텐프리로 정의하는 이상 그 줄은
 *    같은 글이 몇 줄 뒤에서 하는 말과 정면으로 어긋난다. 다시 넣지 말 것.
 *    (`Rolled Oats (GF)`는 이제 어떤 메뉴의 재료도 아니라 가격 캐시에서도 곧 사라진다 —
 *     `packPrice`가 던지므로 되살리면 빌드가 죽는다.)
 */
const GLUTEN_SWAPS: { label: string; ordinary: string; free: string }[] = [
  { label: "Sandwich loaf", ordinary: "Bread", free: "Gluten-Free Bread" },
  { label: "Dry pasta", ordinary: "Pasta", free: "GF Pasta" },
  { label: "Plain flour", ordinary: "Flour", free: "Gluten-Free Flour" },
  { label: "Crackers", ordinary: "Crackers", free: "GF Crackers" },
];

const glutenSwapRows = () =>
  GLUTEN_SWAPS.map((s) => {
    const ordinary = packPrice(s.ordinary);
    const free = packPrice(s.free);
    return { ...s, ordinary, free, ratio: free / ordinary };
  });

function glutenSwapTableMarkdown(): string {
  return glutenSwapRows()
    .map((r) => {
      const d = r.free - r.ordinary;
      const gap = d > 0 ? `+${money(d)}` : d < 0 ? `−${money(-d)}` : "no difference";
      return `| ${r.label} | ${money(r.ordinary)} | ${money(r.free)} | ${gap} |`;
    })
    .join("\n");
}

/** 격차가 가장 큰 짝을 **문장 조각으로** 돌려준다 — 세 값을 따로 부르면 서로 다른 주가 섞인다. */
function biggestGlutenSwapSentence(): string {
  const worst = [...glutenSwapRows()].sort((a, b) => b.ratio - a.ratio)[0];
  return (
    `${worst.label.toLowerCase()} — ${money(worst.free)} against ${money(worst.ordinary)}, ` +
    `**${worst.ratio.toFixed(1)}× the price**`
  );
}

/** 반대로 가는 짝. 없으면 없다고 말한다 — 있지도 않은 예외를 문장에 남기지 않으려고 있다. */
function glutenSwapExceptionSentence(): string {
  const cheaper = glutenSwapRows().filter((r) => r.free <= r.ordinary);
  if (cheaper.length === 0) {
    return "This week every pair runs the same way: the gluten-free line costs more";
  }
  const names = cheaper.map(
    (r) => `${r.label.toLowerCase()} (${money(r.free)} against ${money(r.ordinary)})`,
  );
  return `${names.join(" and ")} runs the other way`;
}

/**
 * 메뉴 단위 중앙값 비교 — "제품을 바꾸는 길은 비싸고, 원래 밀이 아니던 요리는 안 비싸다"의 근거.
 * 🔴 두 중앙값과 격차를 **한 번에** 만든다. 세 번 따로 부르면 문장 안에서 다른 주의 값이 섞인다.
 */
const glutenCostSentence = () =>
  restrictionCostSentence(isGlutenFree, "gluten-free", "contain gluten");

/* ────────────────────────────────────────────────────────────────────────────
 * Nut-Free 글의 스프레드 표 — `data/price_cache.json`에서 생성한다.
 *
 * 🔴 2026-08-20까지 여덟 줄이 전부 손으로 적혀 있었고, **아홉 개 값 중 여섯 개가
 *    캐시와 달랐다**(치즈 39c→34c, 훔무스 68c→60c, 계란 88c→82c …). 더 나쁜 건
 *    바로 아래 문장이 그 낡은 값 위에 **논증을 세워 뒀다**는 것이다 —
 *    "치즈는 땅콩버터보다 약 80% 비싸다"가 실제로는 약 60%였다.
 *    값이 움직이면 배수도 움직인다. **표와 배수를 같은 함수에서 낸다.**
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * 라벨·단백질 여부는 사람이 정하고, 금액은 캐시에서 온다.
 *
 * 🔴 **일부러 라벨 가나다순이다 — 가격순으로 적지 말 것.** iron-rich 표에서 배운 것:
 *    선언 순서가 출력 순서와 같으면 `nutFreeSpreadTableMarkdown()`의 정렬을 통째로
 *    지워도 결과가 같아서 **정렬 가드가 발화하지 않는다.**
 */
type Spread = {
  /** 표에 찍히는 이름 */
  label: string;
  key: string;
  protein: string;
  isProtein: boolean;
  /** 문장 주어로 쓸 때 ("Hummus is triple.") */
  subject: string;
  /** 문장 중간에 쓸 때 ("swapping peanut butter for cheese from a block") */
  noun: string;
};

const NUT_FREE_SPREADS: Spread[] = [
  { label: "Cheese (from a block)", key: "Cheese", protein: "Yes", isProtein: true,
    subject: "Cheese from a block", noun: "cheese from a block" },
  { label: "Cream cheese", key: "Cream Cheese", protein: "A little", isProtein: false,
    subject: "Cream cheese", noun: "cream cheese" },
  { label: "Hard-boiled egg", key: "Eggs", protein: "Yes", isProtein: true,
    subject: "An egg", noun: "a hard-boiled egg" },
  { label: "Honey", key: "Honey", protein: "No", isProtein: false,
    subject: "Honey", noun: "honey" },
  { label: "Hummus", key: "Hummus", protein: "Yes", isProtein: true,
    subject: "Hummus", noun: "hummus" },
  { label: "Jam", key: "Jam", protein: "No", isProtein: false,
    subject: "Jam", noun: "jam" },
  { label: "Marmite", key: "Marmite", protein: "No", isProtein: false,
    subject: "Marmite", noun: "Marmite" },
  { label: "Peanut butter", key: "Peanut Butter", protein: "**Yes** — and banned", isProtein: true,
    subject: "Peanut butter", noun: "peanut butter" },
];

const PEANUT_BUTTER = "Peanut Butter";

/** 싼 순으로 — 이 절의 논지가 "땅콩버터 아래에는 단백질이 없다"라 순서가 곧 논증이다. */
const nutFreeSpreadRows = () =>
  NUT_FREE_SPREADS.map((s) => ({ ...s, cost: servePrice(s.key) })).sort((a, b) => a.cost - b.cost);

function nutFreeSpreadTableMarkdown(): string {
  return nutFreeSpreadRows()
    .map((r) =>
      r.key === PEANUT_BUTTER
        ? `| **${r.label}** | **${serveLabel(r.cost)}** | ${r.protein} |`
        : `| ${r.label} | ${serveLabel(r.cost)} | ${r.protein} |`,
    )
    .join("\n");
}

/**
 * 땅콩버터보다 싼 스프레드 — 개수·이름·금액·"단백질이 아니다"까지 전부 데이터에서 만든다.
 * 🔴 단백질인 스프레드가 땅콩버터 밑으로 내려오면 문장이 **다른 말을 해야 한다.**
 *    그래서 `isProtein`을 보고 갈라진다 — 안 갈라 두면 조용히 거짓이 된다.
 */
function cheaperThanPeanutButterSentence(): string {
  const pb = servePrice(PEANUT_BUTTER);
  const cheaper = nutFreeSpreadRows().filter((r) => r.cost < pb);
  if (cheaper.length === 0) {
    return `**Nothing on the list undercuts peanut butter at ${serveLabel(pb)}.**`;
  }
  const list = joinList(cheaper.map((r) => `${r.noun} at ${serveLabel(r.cost)}`));
  const noun = cheaper.length === 1 ? "spread" : "spreads";
  if (cheaper.every((r) => !r.isProtein)) {
    return `**The ${numberWord(cheaper.length)} ${noun} that undercut peanut butter — ${list} — aren't protein.**`;
  }
  const proteinNames = joinList(cheaper.filter((r) => r.isProtein).map((r) => r.noun));
  return `**${numberWord(cheaper.length)[0].toUpperCase()}${numberWord(cheaper.length).slice(1)} ${noun} undercut peanut butter — ${list} — and ${proteinNames} carries protein too.**`;
}

/** 땅콩버터를 실제로 대체하는(=단백질이 있는) 것 중 최저가. */
const cheapestNutFreeProtein = () =>
  nutFreeSpreadRows().filter((r) => r.isProtein && r.key !== PEANUT_BUTTER)[0];

/**
 * "치즈는 약 60% 비싸다. 훔무스는 세 배. 계란은 네 배."
 * 🔴 배수·퍼센트를 손으로 적지 말 것 — iron-rich 글이 같은 자리에서 네 번 연속 틀렸다.
 */
function nutFreeReplacementSentence(): string {
  const pb = servePrice(PEANUT_BUTTER);
  const cheapest = cheapestNutFreeProtein();
  const pct = roundPct((cheapest.cost / pb - 1) * 100);
  const others = nutFreeSpreadRows().filter(
    (r) => r.isProtein && r.key !== PEANUT_BUTTER && r.key !== cheapest.key,
  );
  // 🔴 1.5배 미만은 배수로 말하지 않는다 — 반올림하면 1.18배도 "double"이 된다.
  const tail = others
    .map((r) => {
      const ratio = r.cost / pb;
      return `${r.subject} is ${isMultiple(ratio) ? multipleWord(ratio) : pctMore(ratio)}.`;
    })
    .join(" ");
  return (
    `The cheapest nut-free option that actually replaces what peanut butter was doing is ` +
    `${cheapest.noun} at ${serveLabel(cheapest.cost)}, roughly ${pct}% more. ${tail}`
  );
}

/** 학교 1년 = 40주 × 주 5일. 두 숫자를 문장에 박지 않으려고 상수로 둔다. */
const SCHOOL_WEEKS = 40;
const SCHOOL_LUNCHES = SCHOOL_WEEKS * 5;

/** "매일 치즈로 바꾸면 1년에 약 $26" — 차액×끼니수. 표와 같은 값에서 나온다. */
function nutFreeYearCostSentence(): string {
  const pb = servePrice(PEANUT_BUTTER);
  const cheapest = cheapestNutFreeProtein();
  const hummus = nutFreeSpreadRows().find((r) => r.key === "Hummus")!;
  const yearly = (r: { cost: number }) => `$${Math.round((r.cost - pb) * SCHOOL_LUNCHES)}`;
  return (
    `Over a ${SCHOOL_WEEKS}-week year, swapping peanut butter for ${cheapest.noun} every day ` +
    `is about **${yearly(cheapest)} per child**; for ${hummus.noun}, about ${yearly(hummus)}.`
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Egg-Free 글의 단백질 가격 비교 — 같은 캐시에서.
 *
 * 🔴 이 문단은 **순서를 주장한다**("계란은 치즈보다 비싸고 병아리콩과 비슷하다").
 *    금액만 생성으로 바꾸고 순서를 손으로 두면 값이 움직였을 때 **문장이 표를 반박한다** —
 *    실제로 2026-08-20에 병아리콩이 74c→30c가 되면서 "close to"가 거짓이 돼 있었다.
 *    그래서 **누가 싸고 누가 비싼지도 정렬해서 만든다.**
 * ──────────────────────────────────────────────────────────────────────────── */

const EGG_PROTEINS: { label: string; key: string }[] = [
  { label: "black beans", key: "Black Beans" },
  { label: "cheese", key: "Cheese" },
  { label: "chicken breast", key: "Chicken Breast" },
  { label: "tinned chickpeas", key: "Chickpeas" },
];

const EGG_KEY = "Eggs";

const isEggFree = (m: MenuRow) => m.is_egg_free === true;
const eggFreeCount = () => ALL_MENUS.filter(isEggFree).length;

const eggCostSentence = () => restrictionCostSentence(isEggFree, "egg-free", "contain egg");

/**
 * 격차를 말하는 판정 문장.
 *
 * 🔴 본문은 "median $2.55 / $2.45 — **A difference of ten cents.**"라고 손으로 적혀 있었다.
 *    같은 방식으로 다시 계산하니 $2.54 / $2.52, **1.3센트**였다 — 헤드라인이 8배 틀렸다.
 *    그리고 이 문장은 격차의 **부호가 뒤집혀도** 깨지면 안 된다(계란 있는 쪽이 비싸질 수 있다).
 *    그래서 부호를 말하지 않고 절대 격차만 말한다 — 어느 쪽이 비싼지는 위 문장이 이미 말한다.
 */
function eggCostVerdictSentence(): string {
  const { gap, gapLabel } = restrictionMedians(isEggFree);
  if (gap < 0.25) {
    return (
      `**A difference of ${gapLabel} a lunch.** Egg allergy is one of the few dietary ` +
      `restrictions that costs you almost nothing at the till.`
    );
  }
  return (
    `**A difference of ${gapLabel} a lunch** — small against a weekly shop, but no longer ` +
    `nothing. It is worth planning around rather than ignoring.`
  );
}

function eggProteinRankSentence(): string {
  const egg = servePrice(EGG_KEY);
  const rows = EGG_PROTEINS.map((p) => ({ ...p, cost: servePrice(p.key) })).sort(
    (a, b) => a.cost - b.cost,
  );
  const label = (r: { label: string; cost: number }) => `${r.label} (${serveLabel(r.cost)})`;
  const cheaper = rows.filter((r) => r.cost < egg).map(label);
  const dearer = rows.filter((r) => r.cost >= egg).map(label);
  const parts = [`An egg is ${serveLabel(egg)} a serve on current prices`];
  if (cheaper.length) parts.push(`dearer than ${joinList(cheaper)}`);
  if (dearer.length) parts.push(`and far cheaper than ${joinList(dearer)}`);
  return `${parts.join(", ")}.`;
}

/** 콩류가 계란보다 몇 배 싼지. 분수("roughly half")는 쓰지 않는다 — 그게 깨진 표현이다. */
function legumeVsEggSentence(): string {
  const egg = servePrice(EGG_KEY);
  const legumes = ["Chickpeas", "Black Beans"]
    .map((key) => ({
      key,
      label: EGG_PROTEINS.find((p) => p.key === key)!.label,
      cost: servePrice(key),
    }))
    .sort((a, b) => a.cost - b.cost);
  const parts = legumes.map((l) => {
    const ratio = egg / l.cost;
    // 🔴 1.5배 미만이면 "double"이 거짓이 된다. 실측 비율이 1.73이라 경계가 두 칸 거리다.
    return isMultiple(ratio)
      ? `about ${multipleWord(ratio)} a serve of ${l.label} (${serveLabel(l.cost)})`
      : `${pctMore(ratio)} than a serve of ${l.label} (${serveLabel(l.cost)})`;
  });
  return `An egg costs ${joinList(parts)}.`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Batch-cooking 글의 "팩당 회분" 표 — 팩 가격·회분·1인분 단가를 **한 번에** 만든다.
 *
 * 🔴 여기가 세 열이 서로 어긋난 채 라이브였다: 치즈 1kg 블록을 $9.75라고 적어 뒀는데
 *    캐시는 $8.49였고, 버터는 $10.40 대 $9.99, 쌀은 $2.80 대 $3.29였다.
 *    세 열이 **각각 손으로** 적혀 있었으니 어긋나는 게 당연했다.
 *    이제 팩 가격·회분·단가가 전부 같은 키에서 나온다 — 서로 다를 수가 없다.
 * ──────────────────────────────────────────────────────────────────────────── */

const PACK_ECONOMICS: { label: string; key: string }[] = [
  { label: "Butter", key: "Butter" },
  // 🔴 라벨의 팩 크기를 손으로 적지 말 것 — 여기 "1kg"이라고 적혀 있는 동안 고정 SKU는 500g이었다.
  { label: `Cheese (${packSize("Cheese")} block)`, key: "Cheese" },
  { label: "Eggs (dozen)", key: "Eggs" },
  { label: "Pasta", key: "Pasta" },
  { label: "Plain flour", key: "Flour" },
  { label: "Rice", key: "Rice" },
  { label: "Rolled oats", key: "Rolled Oats" },
  { label: "Sugar", key: "Sugar" },
];

const packEconomicsRows = () =>
  PACK_ECONOMICS.map((p) => ({
    ...p,
    pack: packPrice(p.key),
    serves: packServes(p.key),
    cost: servePrice(p.key),
  })).sort((a, b) => a.cost - b.cost);

/** 가장 싼 두 줄만 굵게 — "팩은 크고 한 끼는 작다"의 극단값이다. */
function packEconomicsTableMarkdown(): string {
  const rows = packEconomicsRows();
  return rows
    .map((r, i) => {
      const cost = i < 2 ? `**${serveLabel(r.cost)}**` : serveLabel(r.cost);
      return `| ${r.label} | ${money(r.pack)} | ~${r.serves} | ${cost} |`;
    })
    .join("\n");
}

const packRow = (key: string) => packEconomicsRows().find((r) => r.key === key)!;

/** 표 바로 다음 문장. 표와 다른 숫자를 말하면 안 되므로 같은 행에서 읽는다. */
function packEconomicsPunchline(): string {
  const butter = packRow("Butter");
  const flour = packRow("Flour");
  return (
    `**A ${money(butter.pack)} block of butter is ${butter.serves} lunches.** ` +
    `A ${money(flour.pack)} bag of flour is ${flour.serves} batches of muffins. ` +
    `The sticker price feels big; the per-lunch number is nearly always small.`
  );
}

function flourWasteSentence(): string {
  const flour = packRow("Flour");
  return (
    `Flour that goes stale in the cupboard was a ${money(flour.pack)} loss, ` +
    `not a ${serveLabel(flour.cost)} serve.`
  );
}

/** 머핀 재료(밀가루·설탕·버터·귀리)의 팩당 회분 범위. "12-33"을 손으로 적지 않으려고 있다. */
function muffinStapleServeRange(): string {
  const serves = ["Flour", "Sugar", "Butter", "Rolled Oats"].map(packServes);
  return `${Math.min(...serves)}-${Math.max(...serves)}`;
}

export interface Post {
  title: string;
  /**
   * 검색결과용 제목. 없으면 `title`을 쓴다.
   *
   * 🔴 2026-08-13에 재어 보니 글·가이드 **21편 중 19편의 title이 60자를 넘어**
   * 검색결과에서 잘리고 있었다. 7편은 접미사 없이도 넘었다. H1은 길어도 읽히지만
   * 검색결과는 잘린 자리에서 끝난다 — 그래서 **표시용 제목과 분리**한다.
   * 여기를 채우는 건 제목이 60자를 넘을 때뿐이다.
   */
  seoTitle?: string;
  excerpt: string;
  date: string;
  lastReviewed?: string;
  /**
   * 본문을 실제로 고친 날짜 (YYYY-MM-DD). sitemap의 lastModified에 쓰인다.
   * `lastReviewed`는 화면 표시용이라 월 단위("July 2026")이고, 그대로 파싱하면
   * 그 달 1일이 된다 — 7월 28일에 크게 고친 글이 7월 1일 수정으로 신고돼
   * 재크롤 우선순위가 떨어진다. 내용을 실질적으로 바꿨을 때만 갱신할 것.
   */
  contentUpdated?: string;
  readTime: string;
  image: string;
  /** 실사진일 때 hero 아래 표시되는 캡션 — 운영자 직접 촬영 증거용 */
  imageCaption?: string;
  category: string;
  author?: string;
  /**
   * 본문의 금액이 **손으로 적은 스냅샷**일 때 true.
   *
   * 🔴 2026-09-09 전수 조사 — 10편에 손으로 적은 금액이 **611개** 있는데
   *    언제·어디서 읽은 값인지 밝힌 건 예산 가이드 한 편뿐이었다. 주간 추적가는
   *    매주 움직이므로, 날짜 없는 금액은 시간이 지나면 반드시 지수와 어긋난다.
   *    이 플래그가 켜지면 글 머리에 「이 금액은 스냅샷이다」 안내가 붙는다.
   *
   * 🔴 새 글에 손으로 금액을 적으면 가드가 이 플래그를 요구한다.
   *    금액을 데이터에서 생성하면 플래그가 필요 없다 — 그쪽이 낫다.
   */
  staticPrices?: boolean;
  body: string;
}

const RAW_POSTS: Record<string, Omit<Post, "readTime"> & { readTime?: string }> = {
  /**
   * 월간 분석 — 지수의 사람이 쓴 해설.
   * 🔴 **주간 자동 페이지를 양산하지 말 것.** AdSense 거절 사유가 정확히 "얇은 자동 상세"였다.
   *    이 글은 월 1편이고, 표는 데이터에서 생성하되 **논지는 사람이 쓴다.**
   *    다음 달 글을 쓸 땐 이 글을 갱신하지 말고 새 슬러그로 만들 것 — 월별 스냅샷이라야
   *    "이번 달엔 이랬다"가 검증 가능한 기록으로 남는다.
   */
  "supermarket-price-gap-nz-lunchbox": {
    title: "Where the Supermarket Gap Between NZ Chains Actually Is",
    excerpt:
      `${cheaperBasketStore()} came out cheaper on our ${BASKET.n}-item lunchbox basket, but ${TOP_GAP_N} items carry ${topGapShare() > 50 ? "most" : `${topGapShare()}%`} of the gap. What that means if you only shop one store.`,
    date: "August 13, 2026",
    // 🔴 본문 수치는 매 라운드 갱신된다(WOOLIES_ROUND/PNS_ROUND). 검토 시점을 8월로
    //    두면 "9월 수치 · 8월 검토"라는 모순이 화면에 그대로 나간다 — 09-09에 겪었다.
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-28",
    // 🔴 2026-08-14: 이 글과 nut-free가 같은 히어로를 쓰고 있었다(마마이트 치즈 샌드위치).
    // 블로그 목록에서 두 카드가 같은 사진으로 뜬다. 마마이트는 nut-free 글의 실제 발견
    // (땅콩버터 22c의 대체재)이라 그쪽이 임자다.
    // ⚠️ 이건 임시방편이다 — 가격지수 글에 맞는 사진은 매대·장바구니이고 우리에겐 없다.
    // 영수증 3장을 쓰지 않은 이유: 이 글은 본문에서 **온라인 숍에서 읽었다**고 밝힌다.
    // 6~7월 매장 영수증을 히어로로 걸면 쓰지도 않은 증거를 그림으로 주장하게 된다.
    image: "/assets/kiwi_planner_cheesymite_scrolls.webp",
    category: "Price Index",
    author: "Yong Jae Lee",
    body: `Every week I read the price of the same 20 lunchbox staples from Woolworths' and Pak'nSave's own online shops and publish the table. The figures below are from the round read on ${WOOLIES_ROUND()} (Woolworths) and ${PNS_ROUND()} (Pak'nSave). **They update when the tracking does**, so the numbers you are reading are the current round, not a frozen snapshot of when this was written.

${twoChainStale().length === 0
  ? `Every Pak'nSave row in this round was read within a week of the Woolworths one.`
  : `One caveat before the numbers, because this article used to wave it away. Both columns are re-read automatically every week from each chain's online shop, but when a Pak'nSave read fails or the item is on special that week, the row keeps its previous regular price — and a row stays in the table for up to 30 days. In this round ${numberWord(twoChainStale().length)} of the ${BASKET.n} Pak'nSave readings ${twoChainStale().length === 1 ? "is" : "are"} older than a week — ${joinList(twoChainStale().map((r) => `${r.name.toLowerCase().replace(/\s*\([^)]*\)/, "")} (${roundDate(r.on)})`))}. The rest were read within a week of the Woolworths round.`}

The headline is unremarkable: on the ${BASKET.n} items priced at both stores, Woolworths comes to ${money(BASKET.w)} and Pak'nSave to ${money(BASKET.p)}. A difference of ${money(BASKET.diff)}, or about ${BASKET.pct.toFixed(1)}%.

That number is lower than most people expect, and on its own it is not very useful. The useful part is where the difference sits.

## ${cap(numberWord(TOP_GAP_N))} items carry ${topGapShare() > 50 ? "most of it" : `${topGapShare()}% of it`}

| Item | Woolworths | Pak'nSave | Difference |
|---|---|---|---|
${topGapMarkdown()}

Those ${TOP_GAP_N} lines account for about **${topGapShare()}% of the entire gap**. The other ${BASKET.n - TOP_GAP_N} rows share the rest${gapRows().some((i) => i.gap < 0) ? ", and they do not all lean the same way" : ""}.

This is the practical finding, and it is not the one the "Pak'nSave is cheaper" shorthand gives you. If you do one shop a week at one store, you are not losing money across the board by picking the wrong one. You are losing most of it on ${joinList(gapRows().slice(0, TOP_GAP_N).map((i) => i.name.toLowerCase().replace(/\s*\([^)]*\)/, "")))}. A household that buys those ${numberWord(TOP_GAP_N)} things somewhere cheap and everything else wherever is convenient captures most of the available saving without driving anywhere twice.

## And it is not one-way

Woolworths is cheaper on ${woolworthsWinsSentence()}.

One of those is worth pausing on. ${biggestWoolworthsWinSentence()}${reverseGapComparison()}. Fresh produce moves week to week and is the least reliable part of any "which supermarket is cheaper" claim, including mine.

## The winner changed on ${numberWord(FLIPS().length)} ${FLIPS().length === 1 ? "item" : "items"}

The index keeps every reading, and comparing two of them — the first full round, ${MAY_ROUND()}, and the latest, ${WOOLIES_ROUND()} — lets me ask something a single round cannot. Not who is cheaper, but **whether who is cheaper stays put.**

Of the ${TALLY().n} items priced at both chains in both rounds, Pak'nSave was cheaper on ${TALLY().thenP === TALLY().n ? `every one of them` : `${TALLY().thenP}`} back in May and is cheaper on ${TALLY().nowP} now. ${numberWord(FLIPS().length)[0].toUpperCase()}${numberWord(FLIPS().length).slice(1)} rows changed hands, ${flipShape()}.

| Item | ${MAY_ROUND()} (W / P) | ${WOOLIES_ROUND()} (W / P) | Woolworths moved | Pak'nSave moved |
|---|---|---|---|---|
${flipTable()}

${flipDirection()}

That distinction is the whole value of comparing two rounds. Take the widest of them, ${flipExample()}. "${flipExample(true)} got cheaper" would be a reason to shop there. "${flipExample(false)} put it up" is a reason to look at the price of that one item wherever you shop — and it is the one the data actually supports.

Two rounds ${numberWord(roundGapMonths())} months apart, with the readings in between set aside, is the weakest possible version of this test.${noMayRows().length > 0 ? ` ${cap(numberWord(noMayRows().length))} of the ${BASKET.n} rows could not take part at all — ${joinList(noMayRows())} had no comparable pair of figures in ${MAY_ROUND()}, mostly because those are the rows whose spec I had to change.` : ""}${flipsAllLoserRose() ? ` I am publishing it because the direction was consistent on every row that changed hands, not because ${numberWord(FLIPS().length)} rows prove anything.` : ` ${cap(numberWord(FLIPS().length))} rows do not prove anything; this is a first look.`}

## What is not in the table, and why

${cap(excludedSentence())}.

A special price is not a shelf price. If you let specials into an index, the index starts reporting deflation every time something goes on promotion, which is the opposite of what a price index is for. Those rows keep their last regular figure and sit out the comparison rather than being estimated. An estimated number in a price index is worse than a missing one.

Three rows changed definition along the way. They had been stuck for months because the spec I had written down did not exist at both chains: an 8-pack of wraps Woolworths does not sell, loose Royal Gala apples my Pak'nSave does not stock, and a 200g hummus tub that turns out to be 220g at both. Each is now pinned to a product both stores actually carry. That makes those rows useful from here on and useless for looking backwards — an older figure for them measured something else.

## What I would not claim

The ${MAY_ROUND()} round was checked in store at both chains; every later round comes from the chains' online Click & Collect prices, and online and shelf prices can differ — so part of any May-to-now change could be that switch rather than the shelf. Pak'nSave prices by store, and mine is Ormiston, so this is one store's answer rather than the country's. And the index only started pinning each row to a specific product code on 30 July 2026 — figures from before that were collected against the same written specs but without the brand recorded, so an individual percentage from the older rounds is worth less than the pattern it sits in.

New World is now in the index too, and the three-chain comparison — which chain wins which row, and which aisle the gap actually comes out of — is in [Three NZ Supermarkets](/en/blog/three-supermarkets-nz-lunchbox-basket-compared).

A basket total is also not a lunchbox. The same tracked prices, divided by how much of each pack one lunchbox actually uses, are in [The shelf price is not the lunchbox price](/en/blog/pack-price-vs-cost-per-serve-nz-lunchbox) — where the cheap-looking items turn out to be the expensive ones.

The full table, with every row's date and the reason for each exclusion, is on the [NZ Lunchbox Price Index](/en/price-index) page. Every figure above is also in [price-index.csv](/price-index.csv) — one row per chain per item, with the pinned product name, its SKU, the pack size and the date that price was read — so the totals and the gap can be rebuilt from the raw rows rather than taken on trust. Published under CC BY.

## What I will be watching

How much of this is even movement is a fair question, and I have started answering it separately: [what actually moved across every reading so far](/en/blog/what-moved-nz-supermarket-shelf-prices) counts how many of these items changed price at all.

Whether the ${numberWord(TOP_GAP_N)}-item concentration holds. The May round gives a first partial answer. ${concentrationSentence()}. If the gap stays in the same few rows month after month, that is a genuinely actionable finding for anyone packing lunches, and it is more useful than a single percentage that changes every week. If it moves around, that is worth knowing too, and it would mean the tidy advice above was an artefact of a single round.

[Plan a week of lunches →](/en/planner)`,
  },
  /**
   * 특가 이력 분석 1편 — "매주 특가인 것"을 찾는다.
   *
   * 🔴 **건수 추세를 쓰지 말 것.** 주당 특가가 29 → 89로 늘었지만 그건 09-07부터
   *    전단 PDF를 통째로 입력한 **내 수집이 바뀐 것**이다. 회원 전용 비율도 같다
   *    (주차별로 0%~100%를 튄다). 이 글이 쓰는 건 전부 "몇 주에 걸쳐 나왔나"이고,
   *    그건 수집이 성길수록 **내려가는** 값이라 부실한 관측이 주장을 부풀리지 않는다.
   */
  "what-is-always-on-special-nz-supermarkets": {
    title: `Always On Special: ${PROMO_WEEK_COUNT} Weeks of NZ Supermarket Mailers`,
    excerpt:
      `${cap(numberWord(everyWeekCount()))} lunchbox ${everyWeekCount() === 1 ? "staple was" : "staples were"} on special in every one of ${PROMO_WEEK_COUNT} weeks — but almost never the same packet. The category is always discounted; your brand is not.`,
    date: "September 7, 2026",
    lastReviewed: "October 2026",
    contentUpdated: "2026-10-02",
    // 실사진이다. 전단이나 영수증 사진을 걸면 **이 글이 쓰지 않은 증거**를 그림으로
    // 주장하게 된다 — 이 글이 읽은 건 전단이고, 영수증은 다른 걸 보여준다.
    // (플래너 페이지도 같은 사진을 쓴다. 히어로가 겹치는 건 아니다.)
    image: "/assets/real-packed-lunchbox-snacks-fruit.jpg",
    imageCaption:
      "A lunchbox from this term — onigiri, cucumber, apple, a mandarin and ring snacks. " +
      "Nothing in it was bought on special on purpose; that is rather the point of the article. " +
      "Photographed at home by the operator.",
    category: "Price Index",
    author: "Yong Jae Lee",
    body: `Every Monday the Woolworths and New World mailers are transcribed, recording each lunchbox item on special along with the regular price where the mailer prints one. Any special that changes a price in the planner is first checked against that product's own online listing. That file now holds ${PROMO_WEEK_COUNT} unbroken weeks, ${prettyDate(firstWeek())} to ${prettyDate(lastWeek())}.

It answers a question a single week's mailer cannot: is the thing on special this week actually a bargain, or is it on special every week?

For ${everyWeekCount() === 3 ? "three" : String(everyWeekCount())} items, the answer is every week.

## The ${PROMO_WEEK_COUNT}-week record

| Item | On special | Discount measured | Median | Range |
|---|---|---|---|---|
${frequencyTableMarkdown(12)}

"On special" counts a week where at least one product with that ingredient was discounted at either chain. "Discount measured" is the smaller number of those weeks where a regular price was printed next to the sale price, so I could work out how much came off. Where that number is under three I do not report a median at all — carrots were on special in nine weeks but priced in one, and a median of one reading is not a median.

## ${everyWeekSentence().charAt(0).toUpperCase() + everyWeekSentence().slice(1)}

Those ${numberWord(everyWeekCount())} were discounted somewhere in all ${PROMO_WEEK_COUNT} weeks. Not most weeks. All of them.

## But never the same packet

That sentence needs one qualification before it is worth anything, and it is the qualification that makes it useful.

"On special" here counts a week where **at least one product** carrying that ingredient was discounted at either chain. It does not mean the same cheese. So I went back and counted products rather than categories:

| Item | Different products discounted | Most weeks for one product | That product |
|---|---|---|---|
${churnTableMarkdown()}

${everyWeekCount() === 3 ? "Three categories" : `${numberWord(everyWeekCount())} categories`} that never came off promotion, and the most weeks any single packet was discounted was ${numberWord(longestSingleProductRun())} out of ${PROMO_WEEK_COUNT}.${mostRotatedEveryWeek() ? ` ${cap(mostRotatedEveryWeek()!.name)} ran through ${mostRotatedEveryWeek()!.products} different products to stay discounted for ${PROMO_WEEK_COUNT} weeks straight.` : ""}

That is a different claim from the one a mailer invites you to make, and a more practical one. The promotional price is closer to what the category actually costs than the shelf tag is — **if you are willing to take whichever brand and size is down this week.** ${mostRotatedEveryWeek() ? `If you buy one particular ${mostRotatedEveryWeek()!.name}, you are not shopping a permanent discount. You are waiting for a rotation — and the most often any single ${mostRotatedEveryWeek()!.name} product came round was ${numberWord(mostRotatedEveryWeek()!.maxWeeks)} ${mostRotatedEveryWeek()!.maxWeeks === 1 ? "week" : "weeks"} in ${PROMO_WEEK_COUNT}.` : ""}

There is a second-order effect worth naming. Because these items are always discounted, they are also the items where a mailer looks most generous. A front page full of ${everyWeekSentence()} is a front page full of things that were going to be discounted anyway.

## The discount moves even when the discounting does not

Yoghurt's best discount, week by week:

${seriesLine("yoghurt")}

Discounted in every one of those weeks, and priced in every one of them too, so this row is as solid as anything here gets. But the size ran from ${minPctFor("yoghurt")}% to ${maxPctFor("yoghurt")}%, median ${medianPctFor("yoghurt")}%.

That is the useful shape. *Whether* yoghurt is discounted is not a question. *How much* is, and the difference between a ${minPctFor("yoghurt")}% week and a ${maxPctFor("yoghurt")}% week is real money across a term. It is also completely invisible if all you look at is the word "special" on the shelf edge.

Bread does the same thing with gaps in it:

${seriesLine("bread")}

The dashes are weeks where bread was on special but the mailer did not print a regular price to compare against, or weeks it did not appear. Either way I will not put a number there.

## The two chains do not discount the same things

Cheese and yoghurt are near-constant at both chains — ${storeSplit("cheese").woolworths} and ${storeSplit("cheese").newworld} weeks for cheese, ${storeSplit("yoghurt").woolworths} and ${storeSplit("yoghurt").newworld} for yoghurt. Below those two the chains diverge, and the split matters if you only shop one of them.

| Item | On special at Woolworths | On special at New World |
|---|---|---|
${storeSplitMarkdown(6)}

Bread is a Woolworths habit — ${storeSplit("bread").woolworths} weeks of ${PROMO_WEEK_COUNT} against ${storeSplit("bread").newworld}. Carrots run the other way, ${storeSplit("carrot").newworld} against ${storeSplit("carrot").woolworths}. Neither is a big enough sample to be a law, and both chains are perfectly capable of changing habit next month, but it is the sort of thing worth knowing if you have already decided which supermarket you use and are choosing what to buy there rather than where to go.

## What I would actually do with this

**Stop treating the always-discounted categories as opportunities — and stop treating your usual brand as one.** ${cap(everyWeekSentence())} ${everyWeekCount() === 1 ? "does" : "do"} not need timing, but ${everyWeekCount() === 1 ? "it does" : "they do"} need flexibility.${mostRotatedEveryWeek() ? ` There is a discounted ${mostRotatedEveryWeek()!.name} every week; there is not a discount on *your* ${mostRotatedEveryWeek()!.name} every week,` : ""} and over ${PROMO_WEEK_COUNT} weeks the best any single packet managed was ${numberWord(longestSingleProductRun())}. Buying whichever one is down pays every week. Waiting for a particular one does not.

**Do not confuse a big discount with a cheap lunch.** Across this week's mailers the dollars saved track the price of the thing being discounted almost exactly, while the discount *rate* does not track price at all. A big number off is mostly information about how expensive the item was.

**Spend the attention on the rare ones instead.** Of the ${distinctKeyCount()} different items that turned up at all, ${onceOnlyCount()} appeared in exactly one week. Those are the ones where a special genuinely is an event, and where buying two is worth it if the thing keeps.

I want to flag something about that second number, because it cuts the other way from everything else here. A "${PROMO_WEEK_COUNT} out of ${PROMO_WEEK_COUNT}" claim gets *stronger* the patchier my collection is — if I missed items some weeks and yoghurt still showed up every week, that is more convincing, not less. The once-only count does not work like that. If my reading was thin in the early weeks, some of those ${onceOnlyCount()} items were probably on special in weeks I did not catch. Treat it as a floor on how much variety there is, not a fact about the mailers.

## Why there is no "specials are getting more common" section

I nearly wrote one. The count of promotions I recorded per week runs ${promoCountByWeek().join(", ")} — from the twenties in July to past a hundred in September. That looks like a clear trend and would have been an easy paragraph.

It is not a trend. It is me. From September I started entering the mailer PDFs in full instead of picking items off the chains' websites, so I am recording roughly three times as much of the same reality. The supermarkets did not triple their specials; my notebook got bigger.

The same problem sank a second finding. Across those ${PROMO_WEEK_COUNT} weeks, ${clubShareOverall()}% of New World's specials are member-only prices, which would be worth knowing. Split by week it goes ${clubShareByWeek().map((v) => `${v}%`).join(", ")}. A supermarket's membership policy does not flip between nothing and everything from one week to the next. I was labelling them inconsistently, and the total was hiding it.

Both are in this article as absences on purpose. If a number in a time series moves at exactly the point my method changed, the method is the more likely explanation, and splitting the total by interval is what shows it.

## What I would not claim

This is two chains, not three. Pak'nSave is in the [price index](/en/price-index) but not in this file — I read its mailer differently and do not have ${PROMO_WEEK_COUNT} clean weeks of it, so including it would mean padding.

"On special" here means on special in a mailer I read, which is a North Island mailer. Chains vary promotions by region and New World stores are individually owned, so your store may differ.

And the median discounts lean on weeks where a regular price was printed. New World frequently does not print one. Where that made a row too thin to trust, the table says so rather than guessing.

The planner's "${enMessages.sale_toggle_label}" option reads the current week from this same file, so you can check this week's entries against what it offers you.

[Plan a week of lunches →](/en/planner)`,
  },
  /**
   * 3사 비교 — New World가 지수에 들어온 뒤 처음 쓰는 글.
   *
   * 🔴 기존 「Where the Supermarket Gap Actually Is」는 **2사(W/P)** 글이다.
   *    이 글은 3사 18개 행만 쓴다. 두 글이 같은 수치를 말하지 않도록 분모를 다르게 뒀다.
   * 🔴 수치는 전부 데이터에서 나온다. 본문이 **자기 수치의 조사일을 스스로 말한다** —
   *    「August 2026」 글이 9월 수치를 보여주던 사고를 반복하지 않으려는 것이다.
   */
  "three-supermarkets-nz-lunchbox-basket-compared": {
    title: "Three NZ Supermarkets: Where the Lunchbox Basket Differs",
    excerpt:
      `Pak'nSave, Woolworths and New World on one ${T3().n}-item basket. ${RANK3()[0].chain} is cheapest overall, and an aisle-by-aisle breakdown shows where the gap comes from.`,
    date: "September 9, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-28",
    image: "/assets/real-paknsave-ormiston-receipt-jun.jpg",
    imageCaption:
      "A Pak'nSave Ormiston receipt from one of the in-store rounds, with the loyalty barcode and card digits cropped out. " +
      "The figures in this article come from the chains' online shops rather than this docket. " +
      "Photographed by the operator.",
    category: "Price Index",
    author: "Yong Jae Lee",
    body: `Until recently I could only compare two chains honestly. New World is now in the index, and this is the first write-up with all three columns in it.

What it is not is one morning's shopping, and an earlier version of this article said it was. Behind the table are ${readingSpread().total} readings — ${T3().n} items across three chains. ${readingSpread().inWeek} of them were taken in the week ending ${WOOLIES_ROUND()}. The other ${readingSpread().older.length} ${readingSpread().older.length === 1 ? "is" : "are"} older than that, the oldest by ${readingSpread().oldestDays} days.

That is the rule the table runs on rather than a slip: a row joins the three-way comparison when each chain's reading is within 30 days of the Woolworths round. All three columns are re-read automatically every week from each chain's online shop, but a Pak'nSave or New World row keeps its previous regular price in any week the item is on special or the read fails, because a special is not a regular price. Dropping every such row until all three land in one week would leave less to compare.

But it does mean part of what follows is measuring the calendar as well as the shops, so here is exactly which part:

| Item | Chain | Read on |
|---|---|---|
${olderReadingsTable()}

Every other reading in the table was taken within a week of ${WOOLIES_ROUND()}.

## The totals

On the ${T3().n} items I can price at all three on those days:

| Chain | Basket |
|---|---|
| Pak'nSave | **${money(T3().p)}** |
| Woolworths | ${money(T3().w)} |
| New World | ${money(T3().nw)} |

${RANK3()[0].chain} is cheapest${RANK3()[0].chain === "Pak'nSave" ? ", which surprises nobody" : ""}. Two things about that are worth more than the ranking.

${T3().w >= T3().p
  ? `The first is the size. Woolworths is ${money(T3().w - T3().p)} dearer than Pak'nSave across ${T3().n} items — real money, but not the chasm the "Pak'nSave is way cheaper" shorthand implies.`
  : `The first is the direction. Woolworths is ${money(T3().p - T3().w)} cheaper than Pak'nSave across ${T3().n} items this round, which is the opposite of the usual shorthand.`}

${newWorldPlacement()}

## ${gapShare3(5) > 50 ? "Most of the gap is five items" : `Five items carry ${gapShare3(5)}% of the gap`}

| Item | Woolworths | Pak'nSave | New World | W − P |
|---|---|---|---|---|
${gapTable3(5)}

Those five lines are **${gapShare3(5)}% of the entire Woolworths–Pak'nSave gap**. The other ${T3().n - 5} items, added together, account for the rest.

This is the practical finding and it is not the one the shorthand gives you. If you do one shop a week at one chain, you are not losing money across the board by picking the "wrong" one. You are losing it on a short list — and it is a list you could buy somewhere else without driving anywhere twice.

## Which aisles the gap comes out of

Five items is a list, not a pattern. Grouping the same ${T3().n} rows by aisle gives one, and it says something the list cannot: the gap is not thinly spread everywhere and then piled up in five places. ${aisleShapeClause()}

| Aisle | Items | Woolworths | Pak'nSave | New World | Pak'nSave saves |
|---|---|---|---|---|---|
${aisleTable()}

Pak'nSave has the cheapest sub-total in ${numberWord(aisleWins("Pak'nSave"))} of the ${numberWord(AISLES().length)} aisles, Woolworths in ${aisleWins("Woolworths") === 0 ? "none" : numberWord(aisleWins("Woolworths"))}, and New World in ${aisleWins("New World") === 0 ? "none" : numberWord(aisleWins("New World"))}.${RANK3()[2].chain === "New World" && aisleWins("New World") === 0 ? " New World being dearest overall is one thing; not having a single aisle where it comes out lowest is a different and harder fact about it." : ""}

${levelAisleClause()}

I would not turn that into shopping advice yet — ${levelAisles().length > 0 ? `${numberWord(levelAisles()[0].n)} lines is a small sub-basket, and these are weekly prices` : "one round of aisle totals is one round"}. But it is a sharper thing to re-test next round than "is Pak'nSave cheaper" — that one is answered, and it stopped being interesting.

## And it runs the other way on fresh produce

Woolworths is cheaper than Pak'nSave on ${numberWord(woolliesWinCount())} of the ${T3().n} items:

| Item | Woolworths | Pak'nSave | Woolworths saves |
|---|---|---|---|
${woolliesWins3()}

${woolliesWinShape()} That is not a coincidence I can prove from one round, but it is the second time the fresh produce rows have leaned this way, and it is the sort of thing worth watching rather than announcing.

Counting cheapest-per-item rather than totals: Pak'nSave wins ${cheapestCounts().p} of the ${T3().n}, Woolworths ${cheapestCounts().w}, New World ${cheapestCounts().n}.

## What is not in the table

${missing3().length > 0 ? `${cap(joinList(missing3()))} ${missing3().length === 1 ? "is" : "are"} missing from the three-way comparison — I do not have a New World price for ${missing3().length === 1 ? "it" : "them"} in this round, so ${missing3().length === 1 ? "it sits" : "they sit"} out rather than being estimated.` : "Nothing is excluded from this round."} An estimated number in a price index is worse than a missing one.

The same rule applies to specials. Every figure here is a regular shelf price. If a chain has something on promotion this week, that is real money in your pocket, but it is not what an index measures — let specials in and the index reports deflation every time something goes on sale. The weekly deals are tracked separately, and what that record shows is [its own article](/en/blog/what-is-always-on-special-nz-supermarkets).

## What I would not claim

These are online Click & Collect prices, not shelf tags, and the two can differ.

Pak'nSave and New World price by store, and mine are both Ormiston in East Auckland. This is one corner of one city's answer, not the country's.

And it is one round, not a trend. Whether these prices move at all is a separate question I track separately: [what actually moved across every reading so far](/en/blog/what-moved-nz-supermarket-shelf-prices). The five items carrying the gap here are not guaranteed to be the five carrying it next month. On the two-chain basket I can check that against May. ${concentrationSentence()} — and [which chain wins which row has already changed](/en/blog/supermarket-price-gap-nz-lunchbox) on ${numberWord(FLIPS().length)} ${FLIPS().length === 1 ? "item" : "items"}. *Which* items carry the gap is the part to re-check every round.

The full table, with every row's reading date and the reason for each exclusion, is on the [NZ Lunchbox Price Index](/en/price-index) page, and the same rows are downloadable as [price-index.csv](/price-index.csv) — one row per chain per item, each carrying its own reading date.

One more thing that file will tell you about itself. A pinned product and SKU — so you can see exactly which brand and size was priced — is recorded for ${pinnedCoverage().has["Pak'nSave"]} of the ${pinnedCoverage().n} Pak'nSave rows, ${pinnedCoverage().has["New World"]} of the ${pinnedCoverage().n} New World rows and ${pinnedCoverage().has.Woolworths} of the ${pinnedCoverage().n} Woolworths rows. New World and Pak'nSave share product codes, so unless a row needed a different product at New World, both banners are read against the same SKU. ${pinnedCoverage().has.Woolworths < pinnedCoverage().n ? `Where a SKU is missing, the price is still a real reading, but you cannot check exactly which product was priced. ` : ""}The CSV marks every row either way. Three-chain totals are the kind of number that is easy to assemble wrongly, so the rows are there to be checked. Published under CC BY.

[Plan a week of lunches →](/en/planner)`,
  },
  /**
   * 1인분 원가 글(2026-09-09 신설).
   *
   * 🔴 이 글이 성립하는 유일한 이유는 `PORTION_BASIS`의 팩 크기가 **상품 API로 확인된
   *    것**이고 serve를 factor에서 역산하지 않았다는 데 있다. 역산한 값이었다면
   *    "팩값과 1인분값이 어긋난다"는 이 글의 논지가 통째로 순환논증이다.
   *    planConfig의 그 주석을 지우면 이 글도 같이 내려야 한다.
   *
   * 🔴 숫자를 손으로 적지 말 것 — 전부 `lib/portionEconomics.ts`에서 생성한다.
   *    히어로 영수증의 금액만 예외다. 그건 **사진에 찍힌 값**이고 추적 데이터가 아니라서
   *    캐시가 갱신돼도 변하지 않는다. 그래서 날짜와 출처를 캡션에 못박는다.
   */
  "pack-price-vs-cost-per-serve-nz-lunchbox": {
    title: "The Shelf Price Is Not the Lunchbox Price",
    excerpt: `${pricedCount()} lunchbox ingredients priced two ways: what the pack costs, and what one lunchbox actually uses. The shelf ranking gets ${misrankedCount()} of them backwards.`,
    date: "September 9, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-28",
    image: "/assets/real-paknsave-ormiston-receipt-jul.jpg",
    imageCaption:
      "A Pak'nSave Ormiston docket from one of the in-store rounds, with the card digits masked. " +
      "Every line on it is a pack price. The dearest line is 893g of white-flesh nectarines at $19.64, " +
      "and the second dearest a 24-pack of soft drink at $17.99 — 75c a can. " +
      "Photographed by the operator; the prices in this article come from the chains' online shops, not this docket.",
    category: "Price Index",
    author: "Yong Jae Lee",
    body: `A supermarket shelf tells you what a pack costs. It does not tell you what a lunchbox costs, and the two disagree often enough to be worth writing down.

I track ${pricedCount()} lunchbox ingredients. For each one I hold two things the shelf does not put together: the pack the shop actually sells, and how much of that pack goes into one lunchbox. The second number is the one that took the longest to get honestly, and it is the one that changes the answer.

## The trolley and the lunchbox

Across those ${pricedCount()} ingredients, the median pack is ${money(medianPack())} and the median lunchbox serve is ${money(medianServe())}. The median pack holds ${medianServes()} serves.

Buying one of everything would come to ${money(packTotal())}. One lunchbox serve of everything comes to ${money(serveTotal())}. That ratio is the whole point: most of what you carry out of the shop is not for today.

## How many lunchboxes a pack is

| Serves per pack | Ingredients |
|---|---|
${servesSpreadTable()}

Only ${singleServeCount()} of the ${pricedCount()} are effectively single-serve. Those are the ones worth watching, and they are almost never the ones that look expensive.

## The shelf ranking is about half right

Rank every ingredient by pack price, then rank it again by what one serve costs. The two orders agree, but loosely — the rank correlation is **${rankCorrelation().toFixed(2)}**.

That number is doing real work in both directions. It is not near zero, so the shelf price is not noise: the ${rowOf("Chicken Thigh").pack} pack of chicken thigh at ${money(rowOf("Chicken Thigh").packCost)} really is expensive in a lunchbox too, at ${money(rowOf("Chicken Thigh").serveCost)} a serve. But it is not near one either. **${misrankedCount()} of the ${pricedCount()} ingredients sit on opposite sides of the median in the two rankings** — cheap-looking and dear to use, or dear-looking and cheap to use.

## Dear on the shelf, cheap in the box

| Ingredient | Pack | Pack price | Serve | Cost per serve | Serves |
|---|---|---|---|---|---|
${dearLookingTable(6)}

These are the items people flinch at and shouldn't. Of the ${dearPacksCheapServes().packs} ingredients whose pack costs more than ${dearPacksCheapServes().packLabel}, ${dearPacksCheapServes().cheap} come to under ${dearPacksCheapServes().serveLabel} a serve. A large bottle of oil is one of the most expensive single things in the shop and one of the cheapest things in the lunchbox.

## Cheap on the shelf, dear in the box

| Ingredient | Pack | Pack price | Serve | Cost per serve | Serves |
|---|---|---|---|---|---|
${cheapLookingTable(6)}

The mechanism is the same every time: the pack is the serve, or close to it. The ${dearestServe().key.toLowerCase()} row is the clearest case — ${money(dearestServe().packCost)}, and one lunchbox uses ${dearestServe().serves === 1 ? "the whole thing" : `${dearestServe().serves} of them`}. It is the most expensive serve in the entire set while sitting in the bottom half of the shelf prices.

This is not an argument against buying any of them. It is an argument for knowing which line in the trolley is the one you are paying for repeatedly.

## "Expensive" has three answers, and they are three different ingredients

Everything above ranks ingredients two ways: what the pack costs and what one serve costs. There is a third ranking this data can produce and a shelf cannot, because it needs the recipes as well as the prices — what an ingredient costs **across the whole menu set.** That is its cost per serve multiplied by the number of menus that use it.

Of the ${menusCounted()} lunch menus in the planner, ${usedAndPricedCount()} distinct ingredients appear that I can also price.${usedUnpricedCount() > 0 ? ` Another ${usedUnpricedCount()} appear that I cannot — they have no pinned product yet, so they are missing from the totals below rather than guessed at.` : ""}

| What "expensive" means | Ingredient | Figure |
|---|---|---|
| Dearest pack on the shelf | ${threeAnswers().pack.key} | ${money(threeAnswers().pack.packCost)} |
| Dearest single lunchbox serve | ${threeAnswers().serve.key} | ${money(threeAnswers().serve.serveCost)} |
| Most across the whole menu set | ${threeAnswers().exposure.key} | ${money(threeAnswers().exposure.exposure)} |

${threeAnswersDiffer()
  ? `Three questions, three answers, three different ingredients. And the first two are ${
      [threeAnswers().pack, threeAnswers().serve].every((r) => r.menus === 1)
        ? "each in exactly one menu, which makes them trivia"
        : `in ${joinList([threeAnswers().pack, threeAnswers().serve].map((r) => `${r.menus} ${r.menus === 1 ? "menu" : "menus"}`))}`
    }. ${threeAnswers().exposure.key} is in ${threeAnswers().exposure.menus}, and at ${money(threeAnswers().exposure.serveCost)} a serve it carries more of the menu set's ingredient cost than anything else I track.`
  : `This round the same ingredient tops more than one of those columns, which is the less interesting case — normally they disagree.`}

| Ingredient | Menus | Cost per serve | Across the set |
|---|---|---|---|
${exposureTable(EXPOSURE_ROWS)}

Those ${EXPOSURE_ROWS} lines are ${exposureShare(EXPOSURE_ROWS)}% of the ${money(exposureTotal())} it would cost in ingredients to make every menu in the planner once. The top ${EXPOSURE_TOP} alone are ${exposureShare(EXPOSURE_TOP)}%.

This is the table the article should have opened with, and it is the one I did not have until the recipes and the prices were in the same place. ${threeAnswers().mostUsed.key} appears in more menus than anything else — ${threeAnswers().mostUsed.menus} of ${menusCounted()} — and comes ${mostUsedExposureRank()}${mostUsedExposureRank() === 1 ? "st" : mostUsedExposureRank() === 2 ? "nd" : mostUsedExposureRank() === 3 ? "rd" : "th"} on it.

## Does the ingredient you use most often cost less?

It would be a tidy story, and the data does not support it. The rank correlation between how many menus an ingredient appears in and what one serve of it costs is **${signed(menuCountVsServeCorr())}** — near enough to zero to mean nothing.

The medians do split. The ${commonVsRare().commonN} ingredients used in ${commonVsRare().threshold} or more menus have a median serve of ${money(commonVsRare().commonMedian)}; the ${commonVsRare().rareN} used in fewer have a median of ${money(commonVsRare().rareMedian)}. That is the right direction for the tidy story. It is also ${commonVsRare().commonN} ingredients against ${commonVsRare().rareN}, split at a threshold I chose, with a correlation of ${signed(menuCountVsServeCorr())} sitting underneath it. I am writing the numbers down rather than the conclusion.

What the ranking does support is narrower and more useful: the recurring cost of a menu set is not carried by its commonest ingredient or by its dearest pack. It is carried by the few items that are both dear per serve and not rare.

## What the serve sizes are, and are not

They are our portions. Recording a cheese serve as ${rowOf("Cheese Block").serve} out of a ${rowOf("Cheese Block").pack} block is a choice, not a standard, and a family that cuts a thicker slice will get different numbers out of the same shelf.

What they are not is reverse-engineered. When these were written down, the serve size for each ingredient was recorded first — how much actually goes in a lunchbox — and the portion factors were corrected afterwards where the two disagreed. Five ingredients had to be fixed that way. Had the serve sizes been derived from the factors instead, every table above would be a circular argument dressed as a finding.

Pack sizes are not estimates either. Each one was read off the product listing at the chain that sells it, which is why a 220g hummus tub is recorded as 220g and not as the 200g I had originally written down.

## What I would not claim

The same pack-size effect shows up sharply in the free-from aisle, where the alternative often comes in a smaller bag: [what gluten-free and dairy-free swaps actually cost](/en/blog/gluten-free-dairy-free-swap-cost-nz) puts numbers on that.

These are one household's portions against one chain's online prices — the per-serve figures use Woolworths. Fresh produce sold by weight — bananas, potatoes, courgettes — moves week to week, so its position in either ranking is the least stable part of this — and [how much anything actually moves](/en/blog/what-moved-nz-supermarket-shelf-prices) is measured separately.

And the ${rankCorrelation().toFixed(2)} correlation is a snapshot. It is high enough that "expensive pack, expensive lunchbox" is a reasonable default; the useful part is knowing the ${misrankedCount()} places where the default is wrong.

Every row behind this article is downloadable: [lunchbox-ingredients.csv](/lunchbox-ingredients.csv) has each ingredient's pinned product, SKU, pack size, pack price, serve and cost per serve, so the whole table above can be rebuilt from it. The 20-item cross-chain basket is a separate file and a separate dataset — both are on the [NZ Lunchbox Price Index](/en/price-index) page, published under CC BY. The chain-by-chain comparison of the same basket is in [Where the supermarket gap actually is](/en/blog/supermarket-price-gap-nz-lunchbox).

[Plan a week of lunches →](/en/planner)`,
  },
  /**
   * 진열가 시계열 글(2026-09-09 신설).
   *
   * 🔴 이 글이 셀 수 있는 이유는 **SKU 고정(2026-07-30) 이후만 본다**는 것 하나다.
   *    그 전 관측은 실행마다 다른 브랜드를 집었으므로 "값이 바뀌었다"가 물가가 아니라
   *    브랜드 교체였다. `data/priceHistory.json`의 Woolworths 열이 마침 그 날부터 시작한다.
   *
   * 🔴 제목에 달·주 수를 **손으로 적지 말 것.** 「August 2026」 글이 9월 수치를 보여주던
   *    사고가 정확히 그것이었다. 여기서는 제목의 주 수도 데이터에서 만든다.
   */
  "what-moved-nz-supermarket-shelf-prices": {
    title: `${weekSpan()} Weeks of NZ Shelf Prices: What Actually Moved`,
    excerpt: `${readingCount()} readings of the same ${trackedCount()} products at one supermarket. ${stableCount()} never changed price at all, and the whole basket moved ${money(Math.abs(basketMove().diff))}.`,
    date: "September 9, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-28",
    image: "/assets/real-paknsave-ormiston-receipt-masked.jpg",
    imageCaption:
      "A Pak'nSave Ormiston docket from one of the in-store price rounds, card digits masked. " +
      "It is here as a sample of how the in-store readings are recorded — the series in this " +
      "article is the Woolworths column, read from that chain's online shop, not from this docket. " +
      "Photographed by the operator.",
    category: "Price Index",
    author: "Yong Jae Lee",
    body: `Groceries are said to be going up all the time. I have ${readingCount()} readings of the same products at the same supermarket, taken between ${windowStart()} and ${windowEnd()}, and that is not what the shelf did.

## What is being counted

Since 30 July 2026 each row of the index has been pinned to a specific product code rather than looked up by search, so a reading is the same jar this week as last week. Before that date, a change in the number could just as easily have been the crawler picking a different brand.

The readings are not evenly spaced — they land on ${readingDates().join(", ")} — because a point is only recorded when the shop's own column date moves.

Two things are deliberately not in here. These are **regular shelf prices**: when an item is on special the index records the ordinary price, because an index that drops every time something is promoted reports deflation instead of prices. And it is one chain's online shop, not a basket of stores.

## ${stableCount()} of ${trackedCount()} did not move at all

Across the whole window, these never changed price by a single cent: ${stableList()}.

That list is not exotic, and it is not the cupboard half of a lunchbox either — which is what I assumed before I sorted it. ${joinList(stableMix().ambient)} keep at room temperature; ${joinList(stableMix().chilled)} come out of the chiller. It splits ${stableMix().ambient.length}–${stableMix().chilled.length}. Over ${weekSpan()} weeks not one of the ${stableMix().total} changed by a cent.

## What did move

| Item | First reading | Last reading | Change | Times it changed |
|---|---|---|---|---|
${movementTable()}

${movedCount()} items moved, and ${movedOnceCount()} of those moved exactly once — one step, then flat again. That is a different shape from the one the phrase "prices keep going up" suggests. The exceptions are ${busiestRows().map((r) => r.name).join(" and ")}, which changed ${busiestRows()[0].moves} times each ${busiestClause()}.

## The basket

Adding the ${trackedCount()} tracked items together: ${money(basketMove().first)} at the first reading, ${money(basketMove().last)} at the last. A change of ${basketMove().diff >= 0 ? "+" : "−"}${money(Math.abs(basketMove().diff))}, or ${basketMove().pct.toFixed(1)}%.

${upDownSame().up} items ended higher, ${upDownSame().down} ended lower, ${upDownSame().same} ended where they started. The movement did not cancel out because it was small — it cancelled out because it went both ways.

## What I took out, and why

${redefinedNames().dropped.length} rows changed specification during the window and are excluded from every number above. They went in as ${redefinedNames().dropped.join(", ")}, and they now read ${redefinedNames().added.join(", ")} — each re-pinned to a product both chains actually carry. Counting those as price movements would be measuring my own spec sheet, not the shelf.

This is the same discipline the specials work needed. Over the weeks of mailers I have logged, the number of promotions per week appears to roughly triple — and the cause is that I started entering whole flyers instead of individual finds. It is a change in me, not in the shops, which is why [the specials analysis](/en/blog/what-is-always-on-special-nz-supermarkets) counts how many weeks an item appears rather than how many promotions there were.

## Now with the other two columns

Everything above is the Woolworths column, because when this article was first written that was the only column with enough readings to say anything. It is not any more. Here is what each column holds:

| Chain | Readings | Items | Window |
|---|---|---|---|
${chainCoverageTable()}

That table is also the reason the next section does **not** compare how *often* each chain changes a price. The columns do not have the same readings: ${chainReadingsClause()}, over windows that start on different dates. A point is only recorded when a column's date moves, and a longer gap between points is a bigger window for a change to happen inside, so a column with fewer readings will look calmer than it is. Counting frequency here would measure our reading schedule, not the shops.

What survives that objection is **which items** move. So: over the ${twoChainItems().length} items tracked at both Woolworths and Pak'nSave, across the window both columns share (from ${overlapStart().slice(8)} ${new Date(overlapStart() + "T00:00:00Z").toLocaleString("en-NZ", { month: "long", timeZone: "UTC" })} onwards), ${movedAtBoth().length} moved at both chains and ${movedAtNeither().length} moved at neither.

| Item | Moved at Woolworths | Moved at Pak'nSave |
|---|---|---|
${movedAtBothTable()}

${producePhrase()}. The ${movedAtNeither().length} that sat still at both are ${neverMovedList()}.

## Same items, different days

The list above is the same shopping list at both chains. The dates are not.

${sameDayPhrase()}${sameDayItems().length ? ` — ${sameDayList()}` : ""}. ${sharedMovesSentence()}

That is worth holding onto, because it is a test of a common idea. If shelf prices moved because of a shared upstream cost — a wholesale price, a fuel surcharge, a season — you would expect most of the changes to land together. ${clusterVerdict()}

I am not going to tell you why. One chain reads a spot market and the other holds a contract, or one reprices weekly and the other on delivery — those are guesses, and the price feed cannot separate them. And a shared date here means the change was first seen at both chains on the same reading date, not that both chains changed on that exact day.

Where the three chains sit against each other on one day — rather than how they move — is [Three NZ Supermarkets](/en/blog/three-supermarkets-nz-lunchbox-basket-compared), which breaks the gap down aisle by aisle.

## What I would not claim

${weekSpan()} weeks is short, and a ${Math.abs(basketMove().pct).toFixed(1)}% move over that window is not an inflation figure. It is one basket at one chain.

A price that did not change between two readings could still have moved and moved back in the gap — the longest gap here is ${longestGapDays()} days. And because specials are excluded by design, an item listed above as unchanged may well have been half price for a week. What a special is worth against the everyday price is a separate question, and often the answer is "nothing" — several of this week's advertised specials land at or above the price we already track.

Every reading behind this is downloadable as [price-history.csv](/price-history.csv) — one row per observation, with its date and chain, so you can redo the counting above and disagree with it. The page it comes from is the [NZ Lunchbox Price Index](/en/price-index), published under CC BY.

[Plan a week of lunches →](/en/planner)`,
  },
  /**
   * free-from 대체품 값 글(2026-09-09 신설).
   *
   * 🔴 **1인분끼리 비교하지 말 것.** DF 페스토는 1인분이 10g, 일반은 15g이라
   *    1인분으로 재면 "DF가 싸다"가 나온다. 이 글은 전부 100g/100mL 단가로 잰다.
   *
   * 🔴 **비교 상대를 하나 고르는 순간 체리피킹이다.** GF 파스타의 상대를 무엇으로
   *    잡느냐에 따라 배수가 1.8~3.6배로 움직인다. 비교군 전체의 중앙값을 쓰고,
   *    **본문 표에 비교군 이름을 그대로 싣는다** — 내가 골랐다는 사실이 남아야 한다.
   *
   * 🔴 메뉴 비교는 **관찰이지 실험이 아니다.** 우리 메뉴 94개가 어쩌다 그렇게
   *    구성된 결과다. 본문이 그렇게 못박는다.
   */
  /**
   * 🔴 알레르겐 라벨 글(2026-09-10 신설).
   *
   *    간식 알레르기 필터를 만들면서 추적 상품 95개의 **실제 라벨**을 읽게 됐다.
   *    그 부산물이 이 글이다 — 뉴질랜드 도시락 재료로 이걸 정리해 공개한 곳이 없다.
   *
   * 🔴 숫자·표는 전부 `lib/allergenFacts.ts`에서 생성한다. 상품이 바뀌면 문장도
   *    같이 바뀌어야 한다 — 09-10에 고정 SKU 하나가 이름이 바뀌어 있었다.
   *
   * 🔴 이 글은 **라벨을 읽으라고** 말하는 글이지 안전을 보장하는 글이 아니다.
   *    「우리가 걸러 줬으니 안심하라」로 읽히면 안 된다.
   */
  "allergen-labels-nz-lunchbox-staples": {
    title: "What the Allergen Labels Actually Say",
    excerpt: `I read the allergen label on ${labelledProducts()} tracked NZ supermarket products. ${hiddenRows().length} declare something the name never suggests, and ${anyWarningCount()} carry a "may contain" warning.`,
    date: "September 10, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-10-23",
    // 🔴 캡션 없음 — 생성 이미지다. 캡션은 「직접 찍었다」는 주장을 달 수 있는
    //    자리라 실사에만 붙인다(저장소 가드가 실제로 막는다).
    image: "/assets/diy_snack_box.png",
    category: "Allergy Friendly",
    author: "Yong Jae Lee",
    body: `I did not set out to write this. I was fixing the planner — it was picking snacks without checking anyone's allergy settings — and to fix it properly I had to stop guessing from names and read what the packets actually declare. That meant reading the allergen label on every product I track.

I track ${trackedProducts()} products for the planner's prices. ${labelledProducts()} of them carry an allergen label in the retailer's product listing. Most of the rest are loose produce, meat and pantry basics${unlabelledPackagedExamples().length ? `, but not all — packaged foods such as ${joinList(unlabelledPackagedExamples().map((k) => k.replace(/^GF /, "gluten-free ").toLowerCase()))} also came with nothing in the allergen field` : ""}. For those, the planner uses tags I set by hand.


What came back was more interesting than the bug.

## The name is not the label

${hiddenRows().length} of those products declare an allergen that nothing in the product name suggests. Not a trace warning — a **declaration**, the bold "Contains" line.

| Ingredient | Product | Declares |
|---|---|---|
${hiddenTable()}

Read that list as a parent packing around an allergy. Rice crackers with sesame. A rice cereal with gluten. Roti with milk. A chicken-flavoured rice snack with milk in it. None of those are obscure products; they are the ordinary contents of an ordinary lunchbox.

This is the whole reason our planner reads labels instead of names. A tag written from the recipe name would have passed every one of these. Sesame turned out to need [its own article](/en/blog/sesame-free-school-lunches-nz): almost every bread we track carries a sesame warning.

## "Free from" tells you what it is free from

The free-from aisle is the sharpest version of the same problem. A product named for the thing it removes says nothing about what remains.

| Ingredient | Product | Declares | May contain |
|---|---|---|---|
${freeFromTable()}

A dairy-free pesto that declares tree nuts. A gluten-free bread that declares egg. A gluten-free flour with a warning covering peanuts, tree nuts, milk and sesame. Each of those is doing exactly what it says on the front — and none of them is safe to hand to a child with a different allergy on the strength of that front label.

## The warnings outnumber the declarations

Every figure so far has been about declared allergens. The other half of a label is the precautionary line: "may be present", "made on a line that also produces", "packed in a facility where".

| Allergen | Products that declare it | Products that only warn |
|---|---|---|
${declaredVsWarnedTable()}

${anyWarningCount()} of the ${labelledProducts()} labelled products carry at least one such warning.

Look at the nuts row. ${declaredCount("nuts")} products declare nuts. ${warnedCount("nuts")} more warn about them without declaring. A parent who reads only the bold line sees the first number. A school with a nut-free policy is, in practice, dealing with the second.

I am not going to tell you what to do with that, because the two honest answers point in opposite directions and which one is right depends on the child. Some families treat a precautionary warning as a hard no. Others would never get a packed lunch out the door if they did. That is a decision for you and whoever manages the allergy, not for a website.

## What our planner does with this, and why

When you tick an allergy filter, the planner excludes snacks on **declared** allergens only. A "may contain" warning does not remove a snack.

That is a choice, and it is worth saying out loud rather than burying it. If precautionary warnings excluded items too, ${anyWarningCount()} of ${labelledProducts()} products would drop out and the filter would return so little that it would stop being useful. So the line we drew is the one a label-reading parent draws at the shelf: the bold line decides, the warning is information you weigh yourself.

Two more limits, stated plainly:

- **We track one product per ingredient.** The label we read is that product's label. Yours may be a different brand with a different line.
- **Manufacturers change formulations.** These labels are what the retailer published on the day we read them, and one of our pinned products quietly became a different item in September 2026 — same code, same price, different product. If it can happen to us it can happen on the shelf.

So this article is not "we checked, you're fine". It is the opposite: here is how often the name and the label disagree, which is why the packet in your hand is the only thing that settles it.

The free-from products in this set have a price story as well as a label one, and the two turn out to be connected — [what gluten-free and dairy-free swaps actually cost](/en/blog/gluten-free-dairy-free-swap-cost-nz) puts numbers on the premium and then reads the same labels back. For the cooking side of it, [gluten-free school lunches in New Zealand](/en/blog/gluten-free-school-lunches-nz) is the practical version.

## The data

The label readings behind every number here are in [allergen-labels.csv](/allergen-labels.csv) — one row per product, with the declared allergens, the precautionary text, and the date we read it. Published under CC BY, like the price data.

If you want the planner side of this: [set your filters and generate a week](/en/planner). Snacks are filtered on these labels. Main meals are filtered on dietary flags I set by hand for each recipe, and the labels are used to check those flags rather than to replace them.`,
  },
  "gluten-free-dairy-free-swap-cost-nz": {
    title: "Gluten-Free and Dairy-Free Swaps: What They Cost",
    excerpt: `${swapCount()} free-from products priced per 100g and read off their allergen labels. ${cap(numberWord(swapsAddingDeclared().length))} of them declare an allergen the ordinary version does not.`,
    date: "September 9, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-28",
    // 🔴 캡션 없음 — 이건 생성 이미지지 실사가 아니다. 캡션은 「직접 찍었다」는
    //    주장을 달 수 있는 자리라 실사에만 붙인다(저장소 가드가 실제로 막는다).
    image: "/assets/kiwi_planner_rice_paper_rolls.webp",
    category: "Price Index",
    author: "Yong Jae Lee",
    body: `If someone in the house cannot eat wheat or dairy, the shelf price of the alternative is not a mystery — it is obviously higher. What is less obvious is how much, and whether that translates into a more expensive lunchbox. I track both the free-from products and the ordinary ones at the same shop, so I can put numbers on it.

## How this is measured

Two rules, because both were easy to get wrong.

**Per 100g, not per serve.** A serve of dairy-free pesto in our recipes is a smaller spoonful than a serve of the ordinary kind. Comparing serve to serve would say the dairy-free jar is cheaper, which is an artefact of my recipe rather than a fact about the shop.

**Every ordinary version I track, not one of them.** How much dearer the gluten-free pasta looks depends on which of the ${numberWord(swapRows().find((r) => r.free === "GF Pasta")?.standard.length ?? 0)} wheat pastas I price it against. So each free-from product is compared with the median of *all* the ordinary equivalents I price, and the table below lists them so you can see what went into it.

Products that are naturally free of the thing — rice crackers, for instance — are not counted as "ordinary" versions. Including them would shrink the gap for free.

## The gap

| Free-from product | Free of | Its unit price | Ordinary median | Multiple | Compared with |
|---|---|---|---|---|---|
${swapTable()}

## It is smaller than the reputation, except where it isn't

${samePackRows().length} of the ${swapCount()} pairs come in **exactly the same pack size** as the ordinary version — ${joinList(samePackRows().map((r) => `${r.free} at ${r.multiple.toFixed(2)}×`))} the ordinary unit price.${samePackRows().every((r) => r.multiple > 1) ? " That is a real premium." : ""}

${smallerPackRows().some((r) => r.free === dearestRow().free) ? "The largest multiple is in the other group. " : ""}${smallerPackRows().length} products come in a **smaller pack** than the ordinary version${smallerPackRows().some((r) => r.free === dearestRow().free) ? `, and that is where ${dearestRow().free} sits at ${dearestRow().multiple.toFixed(2)}×` : ""}.

| Product | Its pack vs the ordinary pack | Unit price multiple |
|---|---|---|
${packSizeTable()}

Read down that table and a pattern is visible: the smaller the free-from pack relative to the ordinary one, the bigger the unit-price gap. ${cheaperRows().length > 0 ? `The one product that comes in a *larger* pack than its ordinary counterpart — ${cheaperRows()[0].free} — is the one that is actually **cheaper** per 100g.` : ""}

I am not going to put a correlation on ${swapCount()} pairs. But it is worth naming what the pattern would mean if it holds: part of what gets called the gluten-free premium is a **small-pack premium**, the same thing that makes a 450g bag of anything dear next to a 1.5kg one. ${smallerPackRows().find((r) => r.free.includes("Crackers")) ? `And it does not hold everywhere — ${smallerPackRows().find((r) => r.free.includes("Crackers"))!.free} is in a small pack too and is only ${smallerPackRows().find((r) => r.free.includes("Crackers"))!.multiple.toFixed(2)}× dearer.` : ""}

## What it costs a lunchbox

Take the ordinary product's serve size and apply it to both, so the only thing changing is the price:

- A sandwich's worth of bread — ${perLunchboxExtra("Gluten-Free Bread").serve}${perLunchboxExtra("Gluten-Free Bread").unit} — costs **${money(perLunchboxExtra("Gluten-Free Bread").extra)} more** in the gluten-free version.
- A serve of pasta — ${perLunchboxExtra("GF Pasta").serve}${perLunchboxExtra("GF Pasta").unit} — costs **${money(perLunchboxExtra("GF Pasta").extra)} more**.

If every school-day lunch were a sandwich, that first figure comes to about ${money(perLunchboxExtra("Gluten-Free Bread").extra * SCHOOL_YEAR_DAYS)} over a ${SCHOOL_YEAR_DAYS}-day school year. That is the worst case rather than the expected one, and the menu comparison further down is why.

## Price is not the only thing the swap changes

Everything above is money. The labels are the other half of the question, and they are the half I got wrong in my own shopping.

Of the ${swapCount()} pairs, ${labelledSwaps().length} carry an allergen statement I can read off the product page.${unlabelledSwaps().length > 0 ? ` ${joinList(unlabelledSwaps().map((r) => r.free))} ${unlabelledSwaps().length === 1 ? "has" : "have"} none at all, so ${unlabelledSwaps().length === 1 ? "it appears" : "they appear"} in the table with nothing filled in — not because ${unlabelledSwaps().length === 1 ? "it is" : "they are"} clean, but because I have not seen a statement either way and I am not going to read an empty field as a reassurance.` : ""}

| Free-from product | Free of | It declares | It warns about | Ordinary version declares |
|---|---|---|---|---|
${swapLabelTable()}

The larger part of this is good news, so it goes first. ${removalHoldsCount() === labelledSwaps().length ? `On all ${removalHoldsCount()} products with a statement, the swap does what the front of the pack says` : `On ${removalHoldsCount()} of the ${labelledSwaps().length} products with a statement, the swap does what the front of the pack says — and on ${labelledSwaps().length - removalHoldsCount()} it does not`}: the ordinary version declares the thing, the free-from version does not. That is worth checking rather than assuming — the same label reading turned up a "nut-free" muesli with a nut warning and a vegan mayonnaise that was ordinary egg mayonnaise, both elsewhere in what I track.

Then the part I did not expect. ${cap(numberWord(swapsAddingDeclared().length))} of ${
  labelledSwaps().length === swapCount() ? `the ${swapCount()}` : `the ${labelledSwaps().length}`
} ${swapsAddingDeclared().length === 1 ? "declares" : "declare"} an allergen that **none** of the ordinary counterparts declare:

${addedDeclaredBullets()}
${swapsAddingDeclared().some((r) => r.free === "Plant Milk" && r.addedDeclared.includes("gluten"))
  ? `\nThe ${swapProductName("Plant Milk").includes("oat") ? "oat milk" : "plant milk"} is the one worth sitting with. The gluten is the oats — so on this shelf, the dairy-free option is not available to a household that is also avoiding gluten. The word on the front of the carton is true and it is answering a different question than the one that household is asking.`
  : ""}

${swapsAddingWarned().length > 0 ? `And one that is not a declaration but deserves the same attention. ${addedWarnedClause()} That is the free-from aisle's manufacturing reality rather than its recipe: short runs share equipment, and the warning is the honest consequence.` : ""}

Two things follow that the price table cannot tell you. If a household is avoiding two things rather than one, the free-from aisle is not a shortcut — "free of X" is a claim about X, and it carries no information at all about the other four. And a label is the only place that claim can be checked, which is an argument for reading them per product rather than per aisle.

I classify ${numberWord(5)} allergens here — nuts, milk, egg, gluten and sesame — because those are the ones that come up in school lunchboxes. Soy, lupin and sulphites appear on several of these labels and I am not counting them, so "nothing tracked" in the table means nothing *among those five*, not nothing. The parsed labels for every product I track, with the raw label text next to my reading of it so you can disagree with the parse, are in [allergen-labels.csv](/allergen-labels.csv) and written up in [what the labels on NZ lunchbox staples actually say](/en/blog/allergen-labels-nz-lunchbox-staples).

## The swap versus the dish that never needed it

Of the ${menuTotal()} lunch menus in the planner, ${gfMenus().length} are gluten-free. Their median cost is ${money(gfMedian())} against ${money(otherMedian())} for the rest — a difference of ${money(Math.abs(gfMedian() - otherMedian()))}, not a multiple.

Behind that, only ${swapMenus().length} of those ${gfMenus().length} menus buy a substitute product at all. The other ${naturalGfMenus().length} were never wheat-based in the first place.

| Group | Menus | Median cost |
|---|---|---|
| Gluten-free using a substitute product | ${swapMenus().length} | ${money(swapMenuMedian())} |
| Gluten-free that never used wheat | ${naturalGfMenus().length} | ${money(naturalGfMedian())} |

${swapMenuMedian() > naturalGfMedian()
  ? `The menus that buy a substitute are the dearer group by median, ${money(swapMenuMedian() - naturalGfMedian())} a lunch above the ones that never needed one.`
  : `By median, the menus that buy a substitute are not the dearer group in this planner — ${money(swapMenuMedian())} against ${money(naturalGfMedian())}. A dearer product per 100g does not automatically make a dearer lunch: what else goes in the box matters too.`} The dearest of the substitute menus is ${swapMenus()[0].name} at ${money(swapMenus()[0].cost)}, which buys ${joinList(swapMenus()[0].subs.map((x) => x.toLowerCase()))}. The cheapest menus that never needed a substitute are ${naturalGfMenus()[0].name} at ${money(naturalGfMenus()[0].cost)} and ${naturalGfMenus()[1].name} at ${money(naturalGfMenus()[1].cost)}.

That is the practical finding: the per-100g premium only reaches the lunches that buy a substitute, and in this planner that is ${swapMenus().length} of ${gfMenus().length} gluten-free menus. Rice, corn, potato and lentils never needed one. Which of the planner's menus those are, and what a gluten-free week looks like when you stop swapping, is in [gluten-free school lunches in New Zealand](/en/blog/gluten-free-school-lunches-nz).

## What I would not claim

${swapCount()} pairs is a small set, and I chose the pairings. Someone else might reasonably pair the gluten-free flour with a different flour and get a different multiple — which is why the comparison set is printed in the table rather than summarised away.

The menu comparison is an observation about ${menuTotal()} recipes I happen to have written, not an experiment. If our gluten-free menus skew towards rice and lentils, that is a fact about this planner, not about gluten-free eating.

These are one chain's online prices, and free-from ranges vary more between stores than staples do. And nothing here is dietary advice — a coeliac household's bread is not optional, and "just eat rice instead" is not a serving suggestion for everybody.

Every pack price and pack size used above is in [lunchbox-ingredients.csv](/lunchbox-ingredients.csv), so each multiple in the table can be recomputed from the two numbers it came from — and a different pairing can be tried against the same rows if you disagree with mine. The tracked prices also sit behind the [NZ Lunchbox Price Index](/en/price-index) page. The same pack-size effect, across every ingredient rather than these ${swapCount()}, is in [the shelf price is not the lunchbox price](/en/blog/pack-price-vs-cost-per-serve-nz-lunchbox). The snack slots get the same treatment in [what the snacks themselves cost](/en/blog/what-lunchbox-snacks-cost-nz), where the spread inside one category turns out to dwarf the gap between categories.

[Plan a gluten-free week →](/en/planner)`,
  },
  "what-lunchbox-snacks-cost-nz": {
    title: "What Lunchbox Snacks Actually Cost",
    excerpt: `${snackCount()} snacks priced a serve at a time. The gap inside one category turns out to be ${widestCategory().spread.toFixed(1)}\u00d7 — ${widestCategory().spread > betweenCategorySpread() ? "wider than" : "no wider than"} the ${betweenCategorySpread().toFixed(1)}\u00d7 gap between the category medians.`,
    date: "September 14, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-28",
    // 🔴 캡션 없음 — 생성 이미지지 실사가 아니다. 캡션은 실사에만 붙인다.
    image: "/assets/carrot_hummus.png",
    category: "Price Index",
    author: "Yong Jae Lee",
    body: `Most of what I have written about lunchbox cost is about the main — the sandwich, the pasta, the thing in the Thermos. That is where the recipes are. But a complete lunchbox in this planner is a main plus a piece of fruit plus a second snack, and those two snack slots come to about ${approxMoney(twoSnackCost())} of it. On a ${boxMedianLabel()} box that is well over a third of the money, decided in the ten seconds you spend at the fruit bowl.

So this one is about the snacks. All ${snackCount()} of them, priced a serve at a time.

## How this is measured

Each snack is costed the way the planner costs it: the pack price we track for the ingredient, multiplied by the fraction of that pack one serve uses. An apple is a share of a 1kg bag; crackers are a share of the box. That is the number that ends up in your week, rather than the shelf price of the whole pack.

${unpricedSnacks().length === 0 ? `Every one of the ${snackCount()} snacks priced cleanly — no missing ingredient prices, so nothing here is an average with a hole in it.` : `\u{1F534} ${unpricedSnacks().length} snacks could not be priced (${unpricedSnacks().join(", ")}), so treat the medians below as incomplete.`}

## The four boxes

${categoryTable()}

${categoryRows().some((r) => !r.inPlannerPool) ? `\u2020 ${EXCLUDED_CATEGORY} is priced here for comparison but the planner's generator does not draw from it. It is in the data because it is in the kitchen, not because the tool recommends it.` : ""}

${dearestVerdict()}. And ${cheapestCategory().cat} is the cheapest at ${snackMoney(cheapestCategory().median)} — which is the part that matches what most people expect. Packet snacks are cheap; fresh fruit is not.

That is where the usual story stops, and it is the least interesting thing in the table.

## The gap is inside the box, not between the boxes

Look at the spread column instead of the median column. What it shows is that ${spreadVerdict()}.

${widestPairClause()}. Same category, same slot in the lunchbox, ${snackMoney(swapSaving())} apart${swapSaving() > betweenCategoryGap() ? " — more than the entire distance between the dearest category median and the cheapest one" : ""}.

Meanwhile ${tightestCategory().cat} barely moves at all: ${tightestCategory().spread.toFixed(1)}\u00d7 from ${tightestCategory().cheapest} to ${tightestCategory().dearest}. If you are packing something from that box, which one you grab is very nearly a free choice.

${extremesTable(5)}

Read those two blocks together and the practical question changes shape. "Fruit or a packet of something?" moves you between ${snackMoney(cheapestCategory().median)} and ${snackMoney(categoryRows()[0].median)} — ${snackMoney(betweenCategoryGap())}. "Which one inside the ${widestCategory().cat} box?" moves you ${snackMoney(swapSaving())}. Over a five-day week, holding everything else the same, that one habit is about ${snackMoney(weeklySwapSaving())}.

## What this does not say

It does not say to pack ${widestCategory().cheapest} instead of ${widestCategory().dearest}. Packing ${widestCategory().dearest.toLowerCase()} is not a budgeting mistake, and a child who eats the ${widestCategory().dearest.toLowerCase()} and leaves the ${widestCategory().cheapest.toLowerCase()} has cost you nothing at ${snackMoney(widestCategory().max)} and everything at ${snackMoney(widestCategory().min)}. Cost per serve is one axis. It is not the only one, and this site has no opinion on your child's appetite.

It also is not a nutrition claim. Cheapest in the table is not healthiest in the lunchbox, and nothing here is arranged to suggest otherwise — the ${cheapestCategory().cat} box wins on price precisely because crackers and dried things are cheap per gram, which is not an argument for packing more of them.

These are one chain's tracked prices, read weekly. Fresh produce moves the most of anything we track, so the fruit rows in particular will look different in a month — the spread is the durable finding, not the individual figures. And the categories are mine: I decided that a Probiotic Drink is ${categoryRows().find((r) => r.dearest === "Probiotic Drink")?.cat ?? "Protein & Dairy"} and not a sweet treat, and a different split would produce different medians.

## The data

Every pack price and pack size behind these numbers is in [lunchbox-ingredients.csv](/lunchbox-ingredients.csv), so any serve cost above can be recomputed from the two numbers it came from. The same pack-size effect across mains rather than snacks is in [the shelf price is not the lunchbox price](/en/blog/pack-price-vs-cost-per-serve-nz-lunchbox), and the weekly shelf-price movements behind the produce rows are on the [NZ Lunchbox Price Index](/en/price-index).

If you want this applied rather than read: [generate a week](/en/planner) and the snack slots get costed with everything else.`,
  },
  "nut-free-school-lunches-new-zealand": {
    title: "Nut-Free School Lunches & Snacks: A Guide for NZ Parents",
    excerpt:
      "A \"no nuts, please\" note can land in any NZ school bag. Nut-free lunch and snack ideas from NZ supermarkets, label by label, and what it costs.",
    date: "February 15, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-29",
    image: "/assets/real-onigiri-lunchbox.webp",
    imageCaption:
      "One of our own boxes, packed the morning of 19 August 2026: onigiri rolled with furikake, broccoli, kiwifruit and grapes \u2014 plus corn chips and two biscuits, because that is what actually goes in. Nut-free without trying. Photographed at home by the operator, not a stock image.",
    category: "Allergy Friendly",
    author: "Yong Jae Lee",
    staticPrices: true,
    body: `
In our own house we've not had a nut allergy to manage — but a "no nuts, please" note can still land in any New Zealand family's school bag, because a nut-free rule is there to protect a classmate, not only your own child. The first time one comes home the reaction is usually the same: you look at the peanut-butter sandwich that's been your default for a year and realise it's suddenly off the table. This guide is the NZ-specific, label-by-label walkthrough I put together for exactly that moment — so you don't have to spend half a Saturday decoding "may contain" lines to work out what's still safe to pack.

Most NZ nut-free notices are practical rather than dramatic — they rarely try to ban every trace ingredient. The common asks are to leave three things at home: peanut butter, chocolate-hazelnut spreads (the Nutella type), and loose nuts or trail-mix snack packs. Every school words it differently, though, so the notice that actually matters is the one your school sends — read that one closely rather than leaning on a general guide like this.

For what it's worth, the lunches that work best in our own house are already nut-free without trying: onigiri with furikake, veggie sticks (cucumber, carrot, capsicum are the ones that actually get eaten here), and whatever fruit is in season. None of it leans on peanut butter, which is usually the one thing a nut-free note really rules out — so if you're staring at a peanut-butter sandwich wondering what's left, there's far more than it feels like in that moment.

---

## Why Nut-Free Policies Exist in NZ Schools

Nut allergies are among the most common and potentially severe food allergies in New Zealand children. Anaphylaxis — a life-threatening allergic reaction — almost always comes from eating the food. Severe reactions from touching nut or breathing it in are rare, according to ASCIA; the realistic classroom risk is a child eating something that contains nut, and shared food, swapped snacks and unwashed hands are how that happens.

Under the **Health and Safety at Work Act 2015**, New Zealand schools have a duty of care to minimise foreseeable risks. Nut-free lunchbox policies are one of the most practical measures schools use to protect anaphylactic students.

Peanut allergy affects around 3% of children across Australia and New Zealand, according to [ASCIA](https://www.allergy.org.au/patients/fast-facts/peanut-allergy) — but in a classroom of 25 children, the probability of at least one student having a nut allergy is statistically significant. This is why policies exist at the school or classroom level rather than relying on individual families to manage risk alone. For a label-by-label walkthrough covering every major allergen — not just nuts — see our [allergy management guide for NZ school lunchboxes](/en/guides/allergy-management-school-lunchbox-nz).

**The NZ landscape:** Unlike some countries, New Zealand does not have a national mandatory nut-free school policy. Each school or board of trustees sets its own food policy. This means the rules can vary significantly between schools — and even between classrooms within the same school. Always confirm your specific school's policy at the start of each year, as it may change when new students with allergies enrol. Our [school lunchbox policy guide](/en/guides/school-lunchbox-policy-guide-nz) covers the other restrictions that commonly sit alongside a nut rule, and what each one actually means for what you pack.

> **Important:** This article is reviewed for accuracy and reflects current NZ school policies, manufacturer guidance, and Allergy NZ resources. It is not medical advice. If your child has a diagnosed nut allergy, work with your allergist and school to develop an individualised management plan.

---

## NZ School Policy Levels — What's the Difference?

Not all schools use the same language. Here's what the different levels mean in practice:

| Policy Type | What it means | What to pack |
|---|---|---|
| **Nut-free zone** | No nuts in the school at all | Nothing containing nuts or nut derivatives |
| **Nut-aware** | Nuts discouraged but not banned | Avoid nuts where possible; keep away from allergic students |
| **Class-specific** | Only certain classrooms are nut-free | Check if your child's class is affected |
| **No policy** | No official restriction | Still be considerate — ask the teacher |

**What to do first:** At the start of every year, email the school office and ask: "Does our class or school have a nut-free lunchbox policy?" Policies change year to year depending on which students are enrolled.

---

## What to Avoid — and Why Each One Is Tricky

### Obvious nut products
- **Peanut butter** — the most common swap-out needed
- **Trail mix, nut blends** — even "just a few cashews" is a risk
- **Almond milk / cashew milk** cartons

### Hidden nuts in common NZ products

| Product | The nut risk | NZ-safe alternative |
|---|---|---|
| **Muesli bars** (Eta, Pams, Carman's) | Often contain almonds, cashews, or "may contain" | Woolworths Own Brand oat bar (check label) |
| **Basil pesto** (most brands) | Pine nuts | Pams Basil Paste, or Woolworths Own Brand (check label each time) |
| **Satay sauce** | Always peanuts | Hoisin sauce or tomato-based stir-fry sauce |
| **Nutella / chocolate spreads** | Hazelnuts | Jam, cream cheese, hummus, or Vegemite |
| **Some muesli / granola** | Almonds, pecans | Plain rolled oats or Weet-Bix |
| **Asian noodle snacks** | Often sesame or peanut in seasoning | Rice crackers without seasoning |
| **Some biscuits** (e.g. Arnott's varieties) | "May contain tree nuts" | Plain wine biscuits, Krispies, rice crackers |

> **Label reading tip:** Since 25 February 2024, FSANZ's [allergen labelling rules](https://www.foodstandards.gov.au/consumer/labelling/allergen-labelling) have required declared allergens — peanut and the tree nuts among them — to appear in the ingredient list under their plain-English name in bold, **and** in a separate bolded summary statement starting with "Contains". "May contain traces of..." is a different kind of statement: it is voluntary and not regulated by the Food Standards Code, but it is the manufacturer flagging a cross-contact risk, and for a severely allergic child that is a real one.

---

## What a Nut-Free Policy Costs You

Before the replacements, the honest part: peanut butter is the cheapest protein spread on the shelf, and a nut-free policy takes it away.

These are cost-per-lunch figures from the prices I track weekly for the [NZ Lunchbox Price Index](/en/price-index):

| Spread | Cost per lunch | Protein? |
|---|---|---|
${nutFreeSpreadTableMarkdown()}

${cheaperThanPeanutButterSentence()} ${nutFreeReplacementSentence()}

So the honest framing is: a nut-free policy doesn't wreck your budget, but it does remove the single most cost-efficient protein in the lunchbox, and the replacements cost real money. ${nutFreeYearCostSentence()}

Worth knowing rather than discovering. It also explains why "just use Marmite" is such common advice and such incomplete advice — it's cheap, but you've quietly removed the protein rather than replaced it.

---

## Nut-Free Protein Sources: What Actually Works for School Lunches

Peanut butter is so common because it's calorie-dense, protein-rich, and doesn't need refrigeration. Here's what genuinely replaces it:

| Replacement | Protein per serve | Fridge needed? | NZ availability |
|---|---|---|---|
| **Sunflower seed butter** | 5g / 2 tbsp | No | Woolworths, health food stores |
| **Hummus** | 4g / 2 tbsp | Yes | All supermarkets |
| **Cream cheese** | 3g / 2 tbsp | Yes | All supermarkets |
| **Hard-boiled egg** | 6g / egg | Yes (stays fine 4 hrs) | All supermarkets |
| **Canned tuna** | 20g / ½ can | No | All supermarkets |
| **Edamame (shelled, frozen)** | 8g / ½ cup | Thaw overnight | Woolworths, Asian supermarkets |
| **Cheddar/tasty cheese** | 7g / 30g | Yes | All supermarkets |

If egg is off the table too, [Egg-Free Lunchbox Ideas for NZ Schools](/en/blog/egg-free-lunchbox-ideas-nz) covers the same protein gap without it.

---

## 5 Nut-Free Lunchbox Ideas for Schools With Allergy Policies (NZ Ingredients)

### 1. Tuna Sushi Rolls (~$2.00)
Sushi rice, nori sheets, cucumber, canned tuna. Completely nut-free, popular with NZ school kids, and keeps well until noon.

### 2. Hummus & Veggie Dip Box (~$2.20)
Carrot sticks, cucumber, capsicum strips, cherry tomatoes, and hummus. Add standard wholegrain crackers (check label) or a small bread roll.

### 3. Cream Cheese & Smoked Salmon Bagel (~$2.80)
A plain or wholegrain bagel (Woolworths bakery) with cream cheese, smoked salmon, and thin cucumber. No nuts, high protein, genuinely liked by older primary kids.

### 4. Chicken & Salad Wrap (~$2.50)
Leftover roast chicken, cos lettuce, tomato, and a nut-free caesar dressing (check label on Eta/Pams) in a tortilla wrap.

### 5. Pasta with Nut-Free Pesto (~$1.80)
Spiral pasta, Pams Basil Paste (check current label), cherry tomatoes. **Always verify the label** — "nut-free" status can change with reformulation.

---

## Communicating with Your School

If your child is the one with a nut allergy (not just a classmate), here's a practical checklist for the start of the year:

- Request a copy of the school's **Anaphylaxis Management Plan** and Emergency Action Plan
- Ensure your child's **EpiPen** is stored in the correct location (office or classroom) per your allergist's advice
- Meet with the classroom teacher to clarify the "no nuts" zone boundaries
- Ask whether school camps, sports days, or class baking activities have separate protocols
- Update the school when your child's allergy management plan changes

---

## Nut-Free Baking for School Lunches

Homemade baking is one of the safest options for nut-free lunchboxes because you control every ingredient. Here are three nut-free baking staples that freeze well:

**Anzac Biscuits (naturally nut-free, makes 24):** Oats, flour, desiccated coconut, sugar, butter, golden syrup, and baking soda. At about $0.15 per biscuit, they are cheap to make in a batch. Note: some schools classify coconut as a tree nut — check your specific school's policy.

**Cheese and Zucchini Muffins (makes 12):** Self-raising flour, grated cheese, grated zucchini, eggs, milk, and oil. At $0.35 per muffin, these provide protein and hidden vegetables. Freeze individually and defrost overnight.

**Sunflower Seed Bliss Balls (makes 20):** Rolled oats, sunflower seed butter (~$7.50 at Woolworths), honey, cocoa, and coconut. These replace traditional peanut butter bliss balls and are school-safe. At $0.20 per ball, they freeze well for up to 3 months.

---

## Managing Nut-Free Lunchboxes Across NZ School Terms

**Term 1 (Summer):** Heat increases the risk of melting items that may contain hidden nut traces (chocolate bars, some muesli bars). Stick to clearly labelled, verified nut-free items. Pack with ice packs.

**Terms 2-3 (Winter):** Thermos lunches are popular but check commercial soup bases for hidden nut traces. Massel vegetable stock is reliably nut-free. Homemade soups with fresh ingredients are the safest option.

**Term 4 (Spring):** NZ asparagus and strawberries make excellent nut-free seasonal additions. End-of-year shared lunches and class parties require extra vigilance — offer to bring a clearly nut-free plate.

---

## Understanding "May Contain" Labels in NZ

The phrase "may contain traces of nuts" on NZ food labels is voluntary, not legally required. This creates confusion:

- **A product WITH a "may contain" warning** has identified cross-contamination risk from shared manufacturing equipment
- **A product WITHOUT a "may contain" warning** does NOT guarantee it is nut-free — the manufacturer may simply not use precautionary labelling
- **Discuss with your allergist** what level of "may contain" risk is acceptable for your child's specific allergy severity

We put numbers on that gap: across the supermarket products we track, [${declaredCount("nuts")} declare nuts while ${warnedCount("nuts")} more only warn about them](/en/blog/allergen-labels-nz-lunchbox-staples). Reading the bold line alone finds the first group.

For school lunchboxes in nut-free classrooms, the safest approach is to avoid all "may contain" products — even if your own child does not have the allergy. This protects the allergic children in the class and respects the spirit of the school's policy.

---

## Using Kiwi Lunchbox Planner

The **Nut Allergy filter** automatically removes any menus containing nuts from your weekly plan. Tick "Nut Allergy" before generating — every suggested menu will be nut-free and sourced from NZ-available ingredients.

[Generate a nut-free meal plan →](/en/planner)

---

## NZ Supermarket Nut-Free Shopping Tips

Navigating NZ supermarkets with a nut allergy requires vigilance. Here are store-specific tips:

**Pak'nSave:**
- Pams brand products have generally clear allergen labelling. Pams Own Brand crackers, Pams canned goods, and Pams bread are frequently nut-free — but always verify each purchase.
- The bulk bins at Pak'nSave (and all NZ supermarkets) should be avoided entirely. Cross-contamination from shared scoops and adjacent nut products is virtually guaranteed.
- Pak'nSave's in-store bakery uses shared equipment — ask staff about nut cross-contamination before purchasing bakery items.

**Woolworths:**
- Woolworths' Own Brand products generally display "Contains" and "May Contain" allergen statements clearly on packaging.
- The Woolworths Free From range includes several nut-free options specifically marketed for allergy families.
- Woolworths' Click and Collect service is useful for allergy shopping — you can read allergen labels on the website before adding items to your cart.

**New World:**
- Similar range to Woolworths. New World may carry specialty allergy-friendly brands not available at Pak'nSave.
- Ask at the deli counter about nut cross-contamination in prepared foods.

---

## Nut-Free Weekly Lunchbox Planner

Here is a complete week of nut-free lunches using NZ-available ingredients:

| Day | Main | Side | Fruit | Snack | Cost |
|-----|------|------|-------|-------|------|
| Mon | Tuna sushi rolls | Cucumber sticks | Mandarin | Rice crackers | ~$2.30 |
| Tue | Hummus & veggie dip box | Carrot sticks | Apple | Cheese cubes | ~$2.40 |
| Wed | Cream cheese & salmon bagel | Cherry tomatoes | Banana | Homemade pikelets | ~$3.00 |
| Thu | Chicken & salad wrap | Capsicum strips | Kiwifruit | Bliss ball (sunflower seed) | ~$2.70 |
| Fri | Pasta with nut-free pesto | Celery sticks | Grapes | Anzac biscuit | ~$2.10 |

**Weekly total: ~$12.50** — about $2.50 per lunch average.

> **Note, July 2026.** The per-day figures in this table were produced by an earlier version of our costing model that we've since found to be unreliable, so treat them as indicative rather than exact. Across our full menu set, a lunchbox with a fruit and a second snack currently works out at a median of about **${boxMedianLabel()}**, ranging from roughly ${boxFloorLabel()} to ${boxCeilingLabel()} depending on the main. The cheapest boxes are bread-and-cheese based; the dearest are the ones built on meat. For a costed plan on this week's prices, use the [free planner](/en/planner).

---

## Nut-Free Snack Ideas Available at NZ Supermarkets

Finding safe snack options can be tricky. Here are reliably nut-free snacks available at Woolworths and Pak'nSave (always confirm on the current label):

- **Rice crackers** (Woolworths Own Brand, Pams) — most are nut-free
- **Arnott's Shapes** — Original flavour is typically nut-free
- **Weet-Bix** — nut-free (great crumbled into trail mix with dried fruit)
- **Tasti Fruit Bars** — check the specific flavour; some are nut-free
- **Homemade Anzac biscuits** — naturally nut-free (oats, coconut, butter, golden syrup)
- **Homemade pikelets** — at about $0.08 each, cheaper again than the Anzacs
- **Cheese and crackers** — simple, reliable, and nut-free
- **Plain popcorn** — naturally nut-free, fun for kids, very cheap

---

## What to Do if Your Child is Exposed

If your child has a known nut allergy and is accidentally exposed at school:

1. **Follow the allergy action plan** — this should be on file with the school
2. **Administer the EpiPen** if prescribed and symptoms indicate anaphylaxis (difficulty breathing, swelling of throat, dizziness)
3. **Call 111** — anaphylaxis is a medical emergency in New Zealand
4. **Stay calm** — reassure the child while waiting for emergency services
5. **Notify the school office** and your child's allergist as soon as possible

At the start of the year, ask the school which staff members have been trained to use your child's adrenaline auto-injector, and where it is kept during lunch, sport and trips.
`,
  },
  "budget-friendly-lunchbox-ideas-nz": {
    title: "Budget-Friendly Lunchbox Ideas Under $3 Per Meal",
    excerpt:
      "With grocery prices rising, here are practical lunchbox ideas that cost under $3 per serving — without cutting corners on nutrition.",
    date: "February 5, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-29",
    image: "/assets/kiwi_cheese_cracker_box.webp",
    category: "Budget",
    author: "Yong Jae Lee",
    staticPrices: true,
    body: `
Around May last year, I sat down with a week's worth of lunchbox receipts and added them up. Each meal was running well over $5.50, and honestly, I let out a long sigh. The culprits were obvious — winter tomatoes priced like gold, and individually wrapped snacks. I went back through the supermarket aisles, leaning hard on frozen vegetables and whatever fruit was actually in season, and pulled the per-meal cost back under $3. The kid still came home saying "this is yum" — that's the budget list this post is built around. For the full week-by-week planning framework — shopping order, batch-cook schedule and a $15/week breakdown — see our [budget lunchbox planning guide](/en/guides/budget-lunchbox-planning-guide-nz).

One thing I have stopped pretending: in a normal week I do not buy every lunchbox item from one supermarket. I shop mostly at the Ormiston PAK'nSAVE and Woolworths — and the Botany branches when they are on the way — and the things that move the total most are the boring basics: bread, wraps, cheese, yoghurt, and fruit. So those are the prices I check first.

---

## The Real Cost of School Lunches in New Zealand

Statistics NZ data shows food prices in New Zealand rose significantly between 2022 and 2025 — with grocery items up an average of 22% over that period. For a family with two school-age children packing five lunches a week, the annual cost can easily reach **$1,500–$2,500** depending on what you buy.

That is the national picture. Here is ours, from the same shelves: ${moversSentence()} Those are the three biggest moves among the ${fullSpanItems().length} staples we have tracked at all three chains, measured from each item's own first reading — we started the columns on different dates, so a single "since May" figure would be wrong.

One of those is not inflation. Produce swings with the season in a way that packaged food does not, which is why we keep the reading dates attached to every number rather than averaging them away. Every reading we hold is on the [price history page](/en/price-history).

### What the cheapest mains actually cost

I cost every menu in our database against tracked supermarket prices for the [NZ Lunchbox Price Index](/en/price-index). Here are the cheapest mains as they currently stand — main item only, before you add fruit and a snack:

| Main | Cost |
|---|---|
${cheapestMainsTableMarkdown()}

Add a piece of fruit and a second snack — which is what actually goes in the box — and these land between **$2 and $2.60**. That's the real floor. A complete lunchbox across our whole menu set has a median of about ${boxMedianLabel()}, so the cheap end is genuinely half the typical box, not a rounding difference.

Two things the list makes obvious. **The cheapest mains are carbohydrate-led**, and several are low on protein — a jam sandwich at ${shownMainCost("Jam Sandwich")} is cheap because it's mostly bread and sugar. And ${cheapestMainSentence()}, which is why it earns its place rather than just being the bottom of a table.

The good news: some of the most nutritious lunchbox options are also the cheapest. This guide shows how to pack a complete, balanced lunch for under $3 per serving.

> **Prices note:** The tables and sentences built from our [NZ Lunchbox Price Index](/en/price-index) are regular shelf prices (not on special), read from each chain's own price feed with the store set to Auckland, and they refresh when we re-read the shelf. Prices vary by region and store type. Rather than guess at the gap between the two chains: across the ${basketTotals().count} items in the [NZ Lunchbox Price Index](/en/price-index) that both stores had priced, Pak'nSave came to ${liveMoney(basketTotals().paknsave)} against Woolworths' ${liveMoney(basketTotals().woolworths)} — **about ${Math.round((basketTotals().savings / basketTotals().woolworths) * 100)}%** — read on ${priceIndex.woolworthsUpdated}. Of the ${winnerTally().n} items we can follow back to our first round on ${firstRoundDate()}, Pak'nSave is cheaper on ${winnerTally().nowP}.${woolworthsCheaperClause()}

---

## The Budget Lunchbox Formula

Every solid school lunch covers four components:

| Component | Budget pick | Notes |
|---|---|---|
| **Carb** | Wholegrain bread (2 slices) | Freeze half the loaf so none of it goes mouldy |
| **Protein** | Egg / tuna / cheese / chickpeas | See the per-serve costs below before assuming eggs are the cheap one |
| **Fruit/Veg** | Seasonal fruit + 1 veg | Buy what is in season |
| **Snack** | Crackers / homemade muffin | Homemade baking uses pantry staples |

On the prices we track, an egg is not the cheap protein it is often taken for: ${cheeseVsProteinsClause()}. The [egg-free article](/en/blog/egg-free-lunchbox-ideas-nz) goes through the same comparison from the other side.

> **A correction.** This section used to carry a hand-typed price for each component, totalling **$1.25–$2.65** a lunch, and two item-by-item tables "checked in March 2026". Several of those figures were a long way off what we now read from the shelf — eggs were listed at 43c each, against ${eggEachClause()} — and the totals sat below the cheapest complete box our own costing produces (about ${boxFloorLabel()}). They have been taken out rather than left to mislead. The two-chain comparison, item by item and refreshed every week, is in [Pak'nSave vs Woolworths: lunchbox staples](/en/blog/paknsave-vs-countdown-lunchbox-staples).

### Seasonal fruit guide (NZ seasons)

| Fruit | Season |
|---|---|
| Apples (Gala, Fuji) | Feb–Jun |
| Feijoas | Mar–May (often free from neighbours!) |
| Mandarins | May–Aug |
| Bananas | Year-round |
| Oranges | Jun–Sep |
| Kiwifruit | May–Oct |
| Strawberries | Nov–Jan |

---

## 5 Budget Lunch Ideas

These are the five combinations this post was originally built around. They used to carry hand-costed totals of $1.55 to $2.40; the note under the [Weekly Budget Tracker](#weekly-budget-tracker) explains why those were retracted. For what a box actually costs on this week's prices, use the tracker below or the [free planner](/en/planner).

### 1. Egg & Cheese Sandwich
- 2 slices wholegrain bread
- 1 hard-boiled egg
- 1 slice tasty cheese
- 2 lettuce leaves
- 1 apple

### 2. Tuna & Rice Box
- ½ cup cooked rice
- ½ can tuna
- 1 tsp soy sauce
- Cucumber slices
- 1 mandarin
- 4 rice crackers

### 3. Pasta Salad
- ¾ cup cooked pasta
- 2 tbsp pesto
- 6 cherry tomatoes
- 1 banana
- 4 crackers
- 20g feta, optional

### 4. Cheese & Crackers Snack Box
- 8 crackers
- 30g tasty cheese
- Carrot sticks
- 2 tbsp hummus
- 1 apple
- Homemade oat slice (1 piece, see below)

### 5. Leftover Chicken Wrap
- 1 tortilla
- 50g leftover roast chicken
- 1 tbsp mayo
- Lettuce + tomato
- Small bunch grapes
- 2 rice crackers

---

## The Whole Chicken Strategy

Buying a whole chicken is one of the better budget moves for school lunches. Here's the maths:

- Woolworths whole chicken (size 16): ~$9.00
- Pak'nSave whole chicken (size 16): ~$7.50
- Usable meat yield: ~800–900g after roasting
- Per 50g lunchbox portion: **$0.50 (Woolworths) / $0.42 (PnS)**

Pre-cut chicken breast at PnS: ~$14.99/kg = **$0.75 per 50g portion**

Whole chicken is usually the cheapest way to buy chicken per gram of usable protein — we have not measured that gap on a fixed basket, so treat it as a direction rather than a number. Roast on Sunday, portion out for Mon–Wed lunches, freeze the rest.

---

## Homemade Snack Batch: Oat & Banana Slice

Makes 16 pieces.

**Ingredients:**
- 2 cups rolled oats
- 2 ripe bananas
- 2 tbsp honey
- 1 egg
- ½ cup raisins
- 1 tsp cinnamon

Mix, press into a lined tray, bake at 180°C for 20 minutes. Cut into 16 pieces. Freeze in batches of 5. Takes 25 minutes total.

Most of it is pantry staples, which is where homemade baking gets its edge over a packet: one bag of oats holds many batches' worth. We have not costed this slice against a store-bought muesli bar on current prices, so there is no saving figure here — an earlier version quoted one, and its ingredient prices did not add up to its own total.

---

## Weekly Budget Tracker

Use this to estimate your weekly spend before you shop:

| Menu | Category | Cost per box |
|---|---|---|
${budgetWeekRows().map((r) => r.split(" | ").filter((_, i) => i !== 2).join(" | ")).join("\n")}
| **Total (1 child)** | | **${budgetWeekTotalLabel()}/week** |
| **Total (2 children)** | | **${money(Number(budgetWeekTotalLabel().slice(1)) * 2)}/week** |
| **Annual (2 children, ${BUDGET_WEEKS} weeks)** | | **${bigMoney(Number(budgetWeekTotalLabel().slice(1)) * 2 * BUDGET_WEEKS)}** |

These are the cheapest school-safe boxes in the menu set, priced from the same weekly Woolworths reading that feeds the planner — main plus a fruit snack and one other snack. The [Budget Lunchbox Planning Guide](/en/guides/budget-lunchbox-planning-guide-nz) explains how the week is chosen.

> **This table used to be hand-typed**, at $1.55 to $2.40 a box for a $9.75 week. Those figures were roughly half what the same food costs at the prices I track, and they sat below the cheapest box our own costing produces. It is generated now, so it moves when the shelf does.

Set that against buying lunch instead. Pre-made and convenience lunches run about $4–6 per child per day; for two children over ${BUDGET_WEEKS} school weeks that is **${bigMoney(4 * 2 * BUDGET_WEEKS * 5)}–${bigMoney(6 * 2 * BUDGET_WEEKS * 5)} a year**, against ${bigMoney(Number(budgetWeekTotalLabel().slice(1)) * 2 * BUDGET_WEEKS)} for the week above. The gap is **${bigMoney(4 * 2 * BUDGET_WEEKS * 5 - Number(budgetWeekTotalLabel().slice(1)) * 2 * BUDGET_WEEKS)}–${bigMoney(6 * 2 * BUDGET_WEEKS * 5 - Number(budgetWeekTotalLabel().slice(1)) * 2 * BUDGET_WEEKS)}** — and that is against the cheap end of our own range, so treat it as the best case rather than the typical one.

---

## NZ Government Support for Families

If your family is struggling with food costs, there are NZ-specific resources that can help:

**Ka Ora, Ka Ako (Healthy School Lunches Programme):**
The NZ government's free school lunch programme provides a healthy lunch to every child at participating schools. As of 2026, over 1,000 NZ schools participate. Check if your child's school is part of the programme — if so, you may not need to pack a lunch at all (or can supplement the provided lunch with extra snacks). Visit the Ministry of Education website for a list of participating schools.

**Community food support:**
- **KidsCan** — provides food, clothing, and health support to children through partner schools and early childhood centres
- **Salvation Army food parcels** — available to families in need through local centres
- **Community food banks** — many NZ communities have food banks that provide grocery items

**Budgeting support:**
- **MoneyTalks** (0800 345 123) — free financial helpline run by FinCap, the national body for budgeting services, with government funding
- **Budget Advisory Services** — free face-to-face budgeting help available in most NZ cities and towns

There is no shame in using these services — they exist specifically to help NZ families feed their children well.

---

## Buying in Bulk: The Smart NZ Approach

Buying the larger pack is usually cheaper per serve — but check the unit price on the shelf ticket rather than assuming it. The staples where it tends to matter for lunchboxes are cheese blocks, crackers (a big box against individual packs), pasta, rice, canned tuna and frozen vegetables.

> **A correction.** A table of bulk prices used to sit here. It was typed by hand, and it did not survive a check against the prices we track: it put a 1kg cheese block at about $11.50, when the 500g Mainland block alone was ${cheeseBlockClause()} in our latest reading. We have not tracked the larger pack sizes, so the table is gone rather than corrected.

**Storage tip:** Buying in bulk only saves money if nothing goes to waste. Freeze bread in portions, wrap cheese tightly in cling film and portion into weekly amounts, and store pasta and rice in airtight containers to maintain freshness.

---

## Cheap and Nutritious NZ Ingredients for Lunchboxes

Some of the most nutritious lunchbox ingredients are also the cheapest:

- **Eggs**: ${eggEachClause()}. One of the most nutrient-dense foods available, though not the cheapest protein per serve on our numbers. 6g protein, iron, vitamin D, and B12 per egg. Hard-boil 6 on Sunday for the week.
- **Rolled oats** (~$0.15 per serve): Use in muffins, Anzac biscuits, bliss balls, and as a porridge base. Incredibly versatile.
- **Canned chickpeas** (~$1.20 per can at Pak'nSave): Make hummus at home for a fraction of the cost of pre-made. One can makes a week's worth of lunchbox hummus.
- **Bananas**: Available year-round, and high in potassium and natural energy.
- **Frozen vegetables** (~$3.00/kg at Pak'nSave): Just as nutritious as fresh (often more so, as they are frozen at peak freshness). Add to fried rice, pasta, and soup.
- **Kumara** (~$3.50/kg): A uniquely NZ ingredient that is cheap, versatile, and packed with vitamin A. Roast, mash into baking, or make chips.

---

## The Freezer Strategy for Budget Lunchboxes

A well-stocked freezer is the budget-conscious family's greatest lunchbox asset. Here is how to build a freezer inventory that slashes costs:

**Sunday baking freezer rotation:** Spend 60-90 minutes on one Sunday per month baking in bulk. A single session can produce:
- 24 Anzac biscuits
- 12 banana muffins
- 20 bliss balls

Total yield: 56 snack items — enough for 2-3 weeks of lunchbox treats for two children. An earlier version of this section put the ingredients at $8–$10 and the store-bought equivalent at $35–$50; its own per-item prices multiplied out to neither figure, and we have not re-costed either on current prices, so both are gone.

**Freezing bread:** Buy bread when it is on special and freeze it immediately. Frozen bread defrosts perfectly and prevents the common problem of bread going mouldy before the loaf is finished — a major source of food waste in NZ households.

**Batch-cooking protein:** Cook a large batch of bolognese, shredded chicken, or tuna salad on Sunday. Portion into daily containers. Use Monday-Wednesday portions from the fridge; freeze Thursday-Friday portions and defrost the night before.

---

## Free and Nearly-Free Lunchbox Ingredients in NZ

Some of the best lunchbox ingredients cost almost nothing:

**Feijoas (March-May):** If you do not have your own tree, ask neighbours — feijoa trees are ubiquitous in NZ and many people are desperate to give away their surplus. Cut in half and pack with a small spoon. Nutritious, delicious, and free.

**Garden produce:** A $5 packet of carrot seeds produces enough carrots for an entire year of lunchboxes. Cherry tomato plants ($5 each from Mitre 10) produce hundreds of tomatoes over summer. Even a small balcony can support a few pots.

**Leftover dinner portions:** The cheapest lunchbox is one you did not have to "make" at all. Cook 50% extra at dinner and portion into a lunchbox container. The marginal ingredient cost is roughly $1.00-$1.50 — and the prep time is zero.

**Water:** Replacing juice boxes ($1.00-$1.50 each) with a refillable water bottle saves $200-$300 per child per year. Many NZ schools also ask for water only in the lunchbox, so check your school's policy — the swap may already be expected.

---

## Track Your Spending with Kiwi Lunchbox

The planner uses real Woolworths prices to estimate your weekly lunchbox cost — see estimated cost per meal before you shop.

[Generate a budget-friendly plan →](/en/planner)
`,
  },
  "easy-wraps-for-school-lunches-nz": {
    title: "Easy Wraps & Rolls for NZ School Lunches",
    excerpt:
      "Wrap ideas that hold their shape until lunch, the rolling method that stops them bursting, and what they actually cost against ordinary bread.",
    date: "March 3, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-29",
    image: "/assets/kiwi_shredded_chicken_wrap.webp",
    category: "Recipes",
    author: "Yong Jae Lee",
    staticPrices: true,
    body: `
Wraps come up constantly as the answer to sandwich fatigue, so this is a plain guide to them rather than a personal favourite — sandwiches and rice are what actually run the week in our house. Rolled tightly, a wrap holds its shape until lunch and doesn't turn to mush the way soft bread can in a warm bag. The catch is that an overstuffed wrap bursts open by lunchtime, so most of the value here is in the rolling, not the filling. Below is the method that holds together all morning, plus what a wrap actually costs against an ordinary sandwich.

---

## Why Wraps Work So Well in Lunchboxes

If you've ever opened your child's lunchbox at the end of the day to find a soggy, half-eaten sandwich, wraps might be the answer. Tortilla wraps hold up far better than sliced bread — they don't go soggy as quickly, they're easier for small hands to hold, and they travel well in a lunchbox without falling apart.

### What a wrap actually costs against bread

I want to correct something this article used to say. It claimed wraps work out cheaper than two slices of sandwich bread. On the prices I track weekly for the [NZ Lunchbox Price Index](/en/price-index), that isn't right:

| Base | Cost per lunch |
|---|---|
| Two slices of sandwich bread | **${serveLabel(servePrice("Bread"))}** |
| One wrap (supermarket own-brand) | **${serveLabel(servePrice("Tortilla"))}** |
| Bread roll | ${serveLabel(servePrice("Roll"))} |
| Pita pocket | ${serveLabel(servePrice("Pita Bread"))} |
| Bagel | ${serveLabel(servePrice("Bagel"))} |

Bread is the cheapest base on the list, and it is not close. A wrap runs ${wrapVsBreadClause()}, and every other base costs more again. Over a ${SCHOOL_YEAR_DAYS}-day school year, swapping bread for a wrap every day is about **${wrapYearlyGapLabel()} more per child** — real, but not the number I used to quote.

> **A correction on top of the correction.** Until August 2026 this table was typed by hand and said a wrap costs "roughly double" bread, at 90c against 43c, and put the yearly gap near $90. The 90c was a branded wrap; the tracked own-brand one is ${serveLabel(servePrice("Tortilla"))}. The table is generated now, so it moves with the shelf. Branded wraps do still land near the old figure — Farrah's six-packs were $6.99 in August 2026, about $1.17 a wrap — so if that is what you buy, the gap roughly doubles again.

I still use them, and I'd still recommend them for the reasons above — a wrap that gets eaten beats a sandwich that comes home. But it's a texture-and-appetite decision, not a saving, and this article shouldn't have implied otherwise. If budget is the binding constraint, bread wins on the numbers.

Wraps also fit neatly into most NZ lunchbox brands — Sistema, Yumbox, and Bentgo all accommodate a halved wrap without squashing. For schools with nude food policies, roll the wrap in a beeswax wrap (Honeywrap, made in Nelson, available at most Woolworths stores) instead of cling film.

---

## Choosing the Right Tortilla

Not all wraps are created equal. Here is what is available at NZ supermarkets:

| Brand | Type | Notes |
|-------|------|-------|
| Mission Original | White flour | Most popular, soft and pliable |
| Mission Wholemeal | Wholemeal | Higher fibre, slightly denser |
| Pams (Pak'nSave's own brand) | White flour | Own-brand option at Pak'nSave |
| Farrah's Wraps | White/wholemeal | Premium, very soft |
| Woolworths own brand | Wholemeal | The wrap our per-lunch table above is costed on |

${farrahsClause()}

**For allergy-friendly options:** Most flour tortillas are dairy-free and nut-free. Some contain egg — check the label if egg allergy is a concern. For gluten-free, corn tortillas are available at most Woolworths stores (~$4.50 for 12) but are less flexible for rolling and may crack when folded tightly around fillings.

---

## Wrap #1: Classic Chicken & Salad

**Ingredients per wrap:**
- 1 flour tortilla (~$0.50)
- 40g shredded cooked chicken (~$0.80)
- 1 tbsp mayonnaise (~$0.10)
- Handful of lettuce, shredded (~$0.15)
- 2 slices of cucumber (~$0.10)
- Pinch of grated cheese (~$0.20)

**Total cost: ~$1.85**

**Method:** Spread mayo down the centre of the tortilla. Layer chicken, lettuce, cucumber, and cheese. Fold the bottom edge up, then roll tightly from one side. Cut in half diagonally and wrap in baking paper or beeswax wrap.

**Tip:** Use leftover roast chicken from Sunday dinner. Shred it while it's still warm — it pulls apart much more easily. Store in a sealed container in the fridge for up to 3 days.

---

## Wrap #2: Hummus & Veggie Rainbow Roll

**Ingredients per wrap:**
- 1 wholemeal tortilla (~$0.55)
- 2 tbsp hummus (~$0.40)
- Grated carrot (~$0.15)
- Sliced capsicum strips (~$0.20)
- Baby spinach leaves (~$0.15)
- Grated beetroot, optional (~$0.15)

**Total cost: ~$1.60**

This is a great option for meat-free days. The hummus provides protein and healthy fats, while the vegetables cover multiple food groups. Kids who like dipping often enjoy this one because the hummus acts as the flavour base.

**School-friendly note:** This is naturally nut-free and can be made dairy-free and egg-free, making it safe for most NZ school allergy policies.

---

## Wrap #3: Ham, Cheese & Pineapple

**Ingredients per wrap:**
- 1 flour tortilla (~$0.50)
- 2 slices shaved ham (~$0.50)
- 1 slice tasty cheese (~$0.40)
- 2 pineapple rings, drained and chopped (~$0.20)

**Total cost: ~$1.60**

This is the "pizza wrap" that kids love. The sweetness of pineapple combined with salty ham and cheese mimics pizza flavours without any of the mess. Roll it tight, cut in half, and it holds together perfectly.

**Buying tip:** A 425g can of pineapple rings (Pams at Pak'nSave, or any own brand) covers a school week of these wraps, and keeps in the pantry in a way fresh pineapple does not.

---

## Wrap #4: Peanut Butter & Banana (Where Permitted)

**Ingredients per wrap:**
- 1 wholemeal tortilla (~$0.55)
- 1 tbsp peanut butter (~$0.15)
- 1/2 banana, sliced (~$0.25)
- Drizzle of honey, optional (~$0.05)

**Total cost: ~$1.00**

**Important:** Many NZ schools have nut-free policies. Always [check your school's lunchbox policy](/en/guides/school-lunchbox-policy-guide-nz) before packing this one. If nuts aren't allowed, substitute with sunflower seed butter — available at most Woolworths stores for around $7.50.

This wrap is a powerhouse of energy — great for kids who have sport or swimming after lunch. The banana adds natural sweetness and potassium, while the nut butter provides sustained energy through the afternoon.

---

## Wrap #5: Tuna & Corn

**Ingredients per wrap:**
- 1 flour tortilla (~$0.50)
- 1/2 can tuna in spring water, drained (~$0.90)
- 2 tbsp canned corn, drained (~$0.15)
- 1 tbsp mayonnaise (~$0.10)
- Squeeze of lemon juice (~$0.05)

**Total cost: ~$1.70**

Mix the tuna, corn, mayo, and lemon juice together. Spread along the centre of the tortilla and roll. It is a high-protein filling that needs no cooking on the morning.

**Batch tip:** Make a double batch of the tuna-corn filling on Sunday evening. It keeps in the fridge for 2 days, so Monday and Tuesday wraps take under 2 minutes to assemble.

---

## Rolling Tips for Parents

Getting a tight roll makes all the difference for lunchbox survival:

1. **Warm the tortilla** for 10 seconds in the microwave — it becomes more pliable and less likely to crack
2. **Don't overfill** — leave 3cm clear at each side
3. **Fold the bottom up first**, then roll from the side
4. **Cut diagonally** so kids can see the filling (this actually matters — kids eat more when they can see what's inside)
5. **Wrap in baking paper** or a beeswax wrap to hold shape until lunchtime

---

## Weekly Wrap Rotation

| Day | Wrap | Approx. Cost |
|-----|------|-------------|
| Monday | Chicken & Salad | $1.85 |
| Tuesday | Hummus & Veggie | $1.60 |
| Wednesday | Ham, Cheese & Pineapple | $1.60 |
| Thursday | Tuna & Corn | $1.70 |
| Friday | PB & Banana (or sub) | $1.00 |

**Weekly total: ~$7.75 per child** — these are wrap fillings only, not a whole lunchbox.

> **Note, July 2026.** The figures above cover the wrap itself. Add a piece of fruit and a second snack — which is what most kids actually take — and a complete box across our menu set currently has a median of about **${boxMedianLabel()}**. The per-day costs here came from an earlier costing model we've since found unreliable; treat them as indicative. The [free planner](/en/planner) prices a full box on this week's specials.

---

## Wrap Filling Ideas by Season

NZ's southern hemisphere seasons affect what is cheap and available for wrap fillings:

**Term 1 (Summer — Jan to April):**
- Sliced avocado + chicken + cherry tomato
- Fresh corn kernels + tuna + mayo (corn in season Jan-Mar)
- Capsicum strips + hummus + feta (capsicums cheapest in summer)

**Term 2 (Autumn/Winter — May to July):**
- Roasted kumara + black bean + cheese (kumara abundant and cheap)
- Shredded leftover roast lamb + mint sauce + lettuce
- Pumpkin hummus + spinach + ham (pumpkin practically given away in autumn)

**Term 3 (Winter — July to September):**
- Warm chicken + cheese melt (toast under grill for 2 min before packing)
- Leftover bolognese + cheese in a wrap (surprisingly good cold)
- Hummus + grated carrot + beetroot (root vegetables at their cheapest)

**Term 4 (Spring/Summer — Oct to December):**
- Strawberry + cream cheese sweet wrap (strawberries in season from October)
- Asparagus + cream cheese + ham (NZ asparagus season Sep-Nov)
- Fresh salad wrap with new-season lettuce and spring onion

---

## Nutritional Benefits of Wraps

Wraps are an easy way to get several food groups into one item, because they naturally combine them:

- **Grains:** The tortilla itself
- **Protein:** Chicken, tuna, ham, hummus, cheese
- **Vegetables:** Lettuce, carrot, capsicum, cucumber, spinach
- **Dairy:** Cheese, cream cheese, yoghurt-based dressings

A well-filled wrap with a piece of fruit on the side covers all four food groups in a single lunchbox, which is the practical reason wraps keep turning up here. Covering the food groups is not the same as meeting a nutrient target, and this site does not check the latter.

---

## Keeping Wraps Fresh Until Lunchtime

The number one complaint about wraps is that they can dry out or go soggy by lunchtime. Here are proven tricks:

- **The moisture barrier:** Spread a thin layer of hummus, cream cheese, or mayo across the entire tortilla before adding fillings. This creates a barrier between the wet ingredients and the wrap itself.
- **Pack dressing separately:** If using a sauce (ranch, sweet chilli, soy), pack it in a small container for your child to add at lunchtime.
- **Wrap tightly in baking paper:** This holds the shape and prevents the wrap from drying out. Beeswax wraps work even better.
- **Don't pre-cut if possible:** Cutting exposes the interior to air. For older children, let them bite directly. For younger kids who need smaller pieces, cut just before packing.

---

## Plan Your Week Automatically

The [Kiwi Lunchbox Planner](/en/planner) will not build a wraps-only week — it deliberately spreads the five days across categories, so a week normally includes a hot main and a baked one whenever your filters leave any. What it does do: filter mains and snacks for the allergies and diets you tick, drop any ingredient you exclude, favour menus that use up a fridge leftover you type in, and cost every box and the week's shopping list from the Woolworths prices we read each week.

---

## Allergy-Friendly Wrap Options for NZ Schools

Many NZ schools have nut-free policies, and some classrooms are egg-aware or dairy-free. Wraps are one of the most adaptable lunchbox formats for allergy-friendly eating:

**Nut-free wraps:** All five wraps above are naturally nut-free (except Wrap #4 with peanut butter). For schools with strict nut-free policies, the Chicken & Salad, Hummus & Veggie, Ham Cheese & Pineapple, and Tuna & Corn wraps are all safe choices. Check tortilla labels — most flour tortillas sold in NZ (Mission, Pams, Woolworths own brand) are nut-free.

**Egg-free wraps:** Most flour tortillas are egg-free, but always check. Mission Original wraps are egg-free. For egg-free schools, wraps are one of the safest lunch options because the tortilla replaces bread (which sometimes contains egg).

**Dairy-free wraps:** Omit cheese and use avocado or hummus as the creamy element. The Tuna & Corn wrap is naturally dairy-free. The Hummus & Veggie wrap has no dairy in its filling as written — check the tortilla and hummus labels.

**Gluten-free wraps:** Corn tortillas are available at most Woolworths stores (~$4.50 for 12). They are less flexible than flour tortillas and may crack, so warm them for 15 seconds in the microwave before rolling. Alternatively, use rice paper wrappers for a Vietnamese-style roll — available at Asian supermarkets for about $2.50 for 22 sheets.

---

## Wraps vs Sandwiches: Is the Premium Worth It?

The costed side of this is settled earlier in the article — [what a wrap actually costs against bread](#what-a-wrap-actually-costs-against-bread), read from the prices tracked weekly rather than typed in here. A wrap runs ${wrapVsBreadClause()}, and that figure moves when the shelf price moves.

What that table cannot tell you is whether the premium is worth paying, and that is the honest answer: it depends on your child. Wraps travel better in a lunchbox, stay fresh longer, and are easier for small hands to hold. For many NZ families the modest premium is worth the reduced food waste — a wrap that gets eaten is better value than a sandwich that comes home uneaten. If the sandwiches come home empty at your place, the cheaper base is also the better one, and there is nothing here that says otherwise.

---

## NZ-Specific Ingredients That Elevate Wraps

**Kumara:** Roast and mash into a spread for wraps — it adds natural sweetness and a vibrant orange colour. One kumara (~$1.00 at Pak'nSave) makes enough spread for 4-5 wraps. Particularly good in Terms 2 and 3 when kumara is cheap and abundant.

**Feijoa chutney:** In April-May when feijoas are in season (often free from neighbours' trees), make a simple feijoa chutney and use it as a wrap condiment with ham and cheese. The sweet-tart flavour is uniquely NZ.

**Silver beet:** Finely shred silver beet leaves and use them instead of lettuce in wraps. Silver beet is one of the cheapest greens in NZ ($2.00-$3.00 per bunch at Pak'nSave) and provides more iron than lettuce.

**Smoked salmon:** Sealord smoked salmon pieces from the fridge section at Woolworths (~$5.00 for 100g, enough for 3-4 wraps) elevate a simple cream cheese wrap into something genuinely special.

---

## Wrap Storage and Make-Ahead Tips

**The night before:** Prepare all filling components — shred chicken, grate cheese, wash and chop vegetables, mix tuna salad. Store each in a separate small container in the fridge. Pre-portioned fillings mean morning assembly takes under 2 minutes.

**Do NOT pre-roll wraps the night before.** A rolled wrap stored overnight becomes dry on the outside and soggy where wet fillings touch the tortilla. Always assemble in the morning — it takes only 2-3 minutes with pre-prepared fillings.

**Freezing wraps:** Unopened packets of flour tortillas freeze well for up to 3 months. Buy when on special at Pak'nSave and freeze extras. Defrost in the fridge overnight — they will be perfectly pliable by morning.

**Sistema containers for wraps:** The Sistema Bento Lunch (available at Woolworths, ~$12-$15) fits a halved wrap perfectly in its main compartment, with smaller sections for fruit, veggie sticks, and a dip.

[Try the planner →](/en/planner)
`,
  },
  "sesame-free-school-lunches-nz": {
    // 참깨 (2026-10-23) — 10-22 Bucklands Beach Playcentre 학부모 요청으로 필터를 만들며 라벨을 전부 읽었다.
    // 🔴 수치·목록은 `lib/sesameFacts.ts`가 생성한다. 손으로 적지 말 것 — 가드 `lib/sesameArticle.test.ts`.
    title: "Sesame-Free School Lunches in NZ: What the Labels Say",
    excerpt: `${breadRows().filter((r) => r.status !== "neither").length} of the ${breadRows().length} breads we track carry a sesame warning. What that means for a sesame-free lunchbox, read off ${labelledProducts()} New Zealand supermarket labels.`,
    date: "October 23, 2026",
    lastReviewed: "October 2026",
    contentUpdated: "2026-10-23",
    image: "/assets/quinoa_salad.png",
    category: "Allergy Friendly",
    author: "Yong Jae Lee",
    body: `A parent at a Playcentre wrote to me this week. Their tamariki has a sesame allergy, and the planner had no way to plan around it — the allergy filters covered nuts, dairy, gluten and egg, and stopped there. They were right, so I added one. Building it meant reading the sesame line on every allergen label I track, and some of what came back is worth setting out on its own.

## Sesame has to be declared — "may contain" does not

Sesame is one of the foods that must be declared on packaged food in New Zealand. Under the Plain English Allergen Labelling rules, mandatory across Australia and New Zealand since 25 February 2024, it has to appear in the ingredient list and in a bold summary statement starting with "Contains" ([FSANZ](https://www.foodstandards.gov.au/consumer/labelling/allergen-labelling)).

The other kind of line is different. "May contain sesame", "made on equipment that also processes sesame" — FSANZ describes these as voluntary statements made by suppliers, which the Food Standards Code does not regulate. One product can carry a declaration, a warning, both, or neither. That split runs through everything below.

## Where sesame is declared

Of the ${labelledProducts()} tracked products with an allergen label, ${numberWord(sesameDeclaredKeys().length)} declare sesame:

| Ingredient | Product we track |
|---|---|
${productTable(sesameDeclaredKeys())}

Some of these you would expect: tahini is sesame, and hummus is made with it. Others you would not pick from the front of the pack.${sesameDeclaredKeys().includes("Curry Spices") ? " A curry powder declares sesame." : ""}${sesameDeclaredKeys().includes("Wholegrain Crackers") ? " So does a multigrain rice cracker whose name mentions no seed at all." : ""}${sesameDeclaredKeys().some((k) => /Sauce$/.test(k)) ? ` And ${joinList(sesameDeclaredKeys().filter((k) => /Sauce$/.test(k)).map((k) => k.toLowerCase()))} — the bottles that turn up in a quick stir-fry or a bento — declare it too.` : ""}

## The bread problem

${breadVerdict()}

| Ingredient | Product we track | What the label says about sesame |
|---|---|---|
${breadTable()}

For a parent packing around sesame, that is the most useful line in this article, and it is not something you can see on the shelf. A plain sandwich loaf with no seed on it can still carry the warning.

Bread is not the only place the warning turns up. ${numberWord(sesameWarnedKeys().filter((k) => !breadRows().some((r) => r.key === k)).length)} other products we track warn about sesame without declaring it: ${joinList(sesameWarnedKeys().filter((k) => !breadRows().some((r) => r.key === k)).map((k) => k.toLowerCase()))}.

## What the planner does with it

Tick **Sesame Allergy** on the [planner](/en/planner), under Allergies / Restrictions, and three rules apply.

- **Anything that declares sesame is left out** — mains and snacks alike. ${numberWord(sesameMains().declared.length)} mains drop for this reason: ${joinList(sesameMains().declared)}.
- **Unlabelled bread, pastry and spices are left out too.** A few ingredients have no label I can read: ${joinList(unverifiedList().map((k) => k.toLowerCase()))}. For the other allergens I checked those by hand. For sesame there is nothing to check against — and the labelled breads above say why that matters — so the filter treats them as unsafe rather than guess. That removes ${numberWord(sesameMains().unverified.length)} more: ${joinList(sesameMains().unverified)}.
- **"May contain" stays in, with a warning.** ${keptWithWarning()} of the ${sesameMains().kept} mains that remain use an ingredient carrying a precautionary sesame line, and the planner marks that day with ⚠ so you know which packet to read. If those were excluded as well, ${keptIfWarningsExcluded()} mains would remain — and ${sandwichWarning().warned} of the ${sandwichWarning().kept} sandwich mains would go with them. Some families will want exactly that; the ⚠ is there so you can make that call yourself.

That leaves ${sesameMains().kept} of ${sesameMains().total} mains. Of the snacks the planner draws from, ${snackPool("Sesame Allergy").kept} of ${snackPool("Sesame Allergy").total} remain — ${droppedList("Sesame Allergy")} drop out. The mains that pass have a median ingredient cost of ${dietMoney("sesame-free").inMedian} a serve against ${dietMoney("sesame-free").outMedian} for the ${sesameMains().total - sesameMains().kept} that drop — the sesame-free set ${costClause("sesame-free")}, so the filter does not push a week's cost up.

For under-5s, the filter combines with **Kindy (under 5)**, which follows the Ministry of Health's choking guidance for early learning services. Ticked together, ${keptWithKindy()} mains remain.

## Dishes that pass only because of how I wrote them

${joinList(passesButOftenSesame())} all pass the filter. Each is often made with sesame — sesame oil in a stir-fry or a dumpling filling, seeds on sushi or onigiri, sesame in a satay or dipping sauce — but the versions in this planner do not use it, so there is nothing for the filter to catch. If you make them your own way, read your recipe the way the filter reads ours.

## What this does not do

- **It reads one product per ingredient.** The label above is the one on the product I track. Yours may be a different brand with a different line.
- **Labels change.** These are what the retailer published when I read them. A product that carries no warning today can carry one next month.
- **It is a planning aid, not a safety check.** For a diagnosed allergy, the packet in your hand and the advice of your child's doctor come first.

## The data

Every label reading behind these figures is in [allergen-labels.csv](/allergen-labels.csv) — one row per product, with a column for declaring sesame and another for warning about it. The wider label story — what other allergens hide behind product names — is in [What the Allergen Labels Actually Say](/en/blog/allergen-labels-nz-lunchbox-staples).`,
  },
  "egg-free-lunchbox-ideas-nz": {
    title: "Egg-Free Lunchbox Ideas for NZ Schools",
    excerpt:
      "Egg hides in sandwiches, baking, mayo and even some wraps. An egg-free playbook for shared-lunch days, costed against the versions that use egg.",
    date: "March 13, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-29",
    image: "/assets/kiwi_bagel_cream_cheese.webp",
    category: "Allergy Friendly",
    author: "Yong Jae Lee",
    staticPrices: true,
    body: `
Egg turns up in so many lunchbox staples — sandwiches, baking, mayo, even some wraps — that an egg allergy in the class quietly rules out a lot of the usual go-tos. We've not had to manage egg allergy at home, but a shared-lunch day or an egg-aware classroom puts the question in front of any family: what do you pack that's still filling, still appealing, and safe for the kids who can't have egg? This guide is the egg-free playbook I pulled together from Allergy NZ guidance and what's actually on NZ supermarket shelves — recipes that work without egg, and the hidden-egg traps to watch for on labels.

---

## Egg Allergy in New Zealand: What Parents Need to Know

Egg allergy affects approximately 1 in 25 New Zealand children, making it one of the most common food allergies in the country. According to [Allergy New Zealand](https://www.allergy.org.nz/), most children outgrow egg allergy by age 5-7, but until then, parents need to navigate school lunches carefully.

The challenge isn't just avoiding whole eggs — it's the hidden egg in baked goods, pasta, sauces, and even some processed meats. Many store-bought items that seem egg-free actually contain egg in some form: albumin, lysozyme, or lecithin (though soy lecithin is generally safe).

This guide focuses on practical, egg-free lunch ideas using ingredients readily available at NZ supermarkets.

> **Note:** This guide is written for informational purposes only. It is not medical advice. Always work with your child's allergist or GP to determine what is safe for your family.

---

## Does Going Egg-Free Cost More? Not Really

This is usually the first practical worry, and the answer surprised me when I checked it against our own numbers.

Our menu database has ${MENU_COUNT} school lunches, ${eggFreeCount()} of which are egg-free. Costed against tracked supermarket prices for the [NZ Lunchbox Price Index](/en/price-index), ${eggCostSentence()}.

${eggCostVerdictSentence()}

[Going dairy-free](/en/blog/dairy-free-school-lunches-nz) looks similar at the median — a dairy-free main ${costClause("dairy-free")} — but it takes cheese out, and ${cheeseVsProteinsClause()}. That is where a restriction stings: not in the median, but in the particular boxes that were built on the thing you removed.

### What you do lose

${eggProteinRankSentence()} So eggs aren't the budget hero people sometimes assume — they're a *convenient* protein rather than a cheap one.

The genuinely cheap egg substitutes are the legumes. ${legumeVsEggSentence()} That's why several of the lunch ideas below lean on beans and pulses rather than reaching for a commercial egg replacer, which costs more than the egg it replaces.

**The real cost of egg-free isn't money — it's label reading**, and that's what the next section is about.

---

## NZ Supermarket Egg-Free Shopping Guide

Navigating the supermarket with an egg allergy takes practice. Here is where to focus at each major NZ chain:

**Woolworths:**
- The Woolworths Free From range includes several egg-free baked goods and snack options. Check the shelf label — products marketed as "free from" are clearly labelled.
- Best Foods Vegan Mayo (~$5.50 for 370ml) is reliably egg-free and works well as a sandwich spread or in tuna salad mixes.
- Woolworths' in-store bakery items often contain egg — always ask staff or check the allergen folder kept at the bakery counter.

**Pak'nSave:**
- Pams brand products generally have clear allergen labelling. Pams Basil Paste, Pams canned goods, and Pams rice crackers are frequently egg-free — but verify each time you buy.
- Pams bread (Pak'nSave's own brand, white and wholemeal) is often egg-free, though formulations can vary by bakery supplier and region.
- The butchery section at Pak'nSave is useful — fresh unprocessed meats are naturally egg-free, unlike some processed meats.

**New World:**
- Similar product range to Woolworths but occasionally carries specialty items. New World's deli section may stock egg-free options not found at other chains.

**Asian supermarkets (Tai Ping, Lim Chhour):**
- Rice paper wrappers, vermicelli noodles, rice crackers, and many Asian sauces are naturally egg-free — making them excellent, affordable lunchbox staples for egg-allergic children.

---

## Understanding Where Eggs Hide

Before we get to recipes, here are common lunchbox items that often contain egg:

| Item | Usually Contains Egg? | Egg-Free Alternative |
|------|----------------------|---------------------|
| Bread (most brands) | Sometimes — check label | Vogel's Original, Nature's Fresh White |
| Pasta (dried) | Usually no | Most dried pasta is egg-free |
| Mayonnaise | Yes | Best Foods Vegan Mayo (Woolworths, ~$5.50) |
| Muesli bars | Often | Tasti Fruit Bars, Mother Earth Vegan Bars |
| Biscuits | Usually yes | Arnott's Shapes, rice crackers |
| Sausages/processed meat | Sometimes | Hellers beef sausages (check label each time) |

**Golden rule:** Always read the label every time you buy, even for products you've bought before. Manufacturers change recipes.

---

## Egg-Free Lunch Idea 1: Loaded Veggie & Cheese Wrap

- 1 wholemeal tortilla
- 2 tbsp hummus
- Grated carrot
- Sliced cucumber
- Grated cheese
- Baby spinach

**Total: ~$1.80**

Hummus is your best friend in egg-free lunches. It provides the protein and creaminess that egg often brings. Most commercial hummus sold in NZ (Woolworths own brand, Sabra, Delmaine) is egg-free — but always verify.

---

## Egg-Free Lunch Idea 2: Tuna & Rice Bowl

- 1/2 can tuna in spring water
- 1 cup cooked rice
- 2 tbsp corn kernels
- 1 tbsp soy sauce
- Sesame seeds

**Total: ~$1.50**

This is a filling, protein-rich lunch that contains zero egg. Canned tuna is a reliable egg-free protein source, and rice is naturally free of all top-8 allergens.

---

## Egg-Free Lunch Idea 3: Ham & Cheese Pinwheels

- 2 slices wholemeal bread (confirm egg-free brand)
- Butter or dairy-free spread
- 2 slices ham (Beehive or Hellers — check labels)
- 1 slice cheese

**Total: ~$1.40**

Flatten the bread with a rolling pin. Spread with butter, layer ham and cheese, roll up tightly, and cut into rounds. Kids love these because they look different from regular sandwiches.

**Important:** Some processed hams contain egg as a binding agent. Beehive Shaved Ham (available at both Woolworths and Pak'nSave) is generally egg-free, but always confirm on the current label.

---

## Egg-Free Lunch Idea 4: Pasta Salad with Pesto

- 1 cup cooked pasta spirals
- 1 tbsp basil pesto (most are egg-free — check label)
- Cherry tomatoes, halved
- Cucumber, diced
- Olives, optional

**Total: ~$1.60**

Barilla and San Remo dried pasta are both egg-free. Fresh pasta (the kind in the fridge section) almost always contains egg — stick to dried.

---

## Egg-Free Lunch Idea 5: Rice Paper Rolls

- 4 rice paper wrappers (~$0.60)
- Vermicelli noodles, cooked (~$0.30)
- Shredded carrot, cucumber, mint
- Dipping sauce: sweet chilli (~$0.10)

**Total: ~$1.50**

Rice paper rolls are naturally egg-free and gluten-free. They're surprisingly easy to make — dip the rice paper in warm water for 10 seconds, fill, and roll. They hold well in lunchboxes if wrapped individually in cling film or beeswax wraps.

**Filling variations:** For extra protein, add shredded cooked chicken (always check marinades for egg), smoked tofu, or surimi (imitation crab — ~$3.50 per pack at Pak'nSave, enough for 4-5 lunches). Most surimi brands sold in NZ are egg-free, but always check the label.

---

## Egg-Free Lunch Idea 6: Kumara & Black Bean Quesadilla

- 1 flour tortilla (~$0.50)
- 1/4 cup mashed roasted kumara (~$0.30)
- 2 tbsp canned black beans, rinsed (~$0.20)
- 2 tbsp grated cheese (~$0.30)
- Pinch of cumin (~$0.02)

**Total: ~$1.32**

Spread mashed kumara on half the tortilla, top with black beans and cheese, fold, and toast in a dry pan for 2 minutes per side. Cut into wedges. This packs well and travels beautifully in a lunchbox without going soggy.

Kumara is a quintessential NZ ingredient — cheap and abundant from autumn through winter. A whole kumara costs about $0.80-$1.50 at Pak'nSave and makes enough filling for 3-4 quesadillas.

---

## Weekly Egg-Free Lunchbox Plan

| Day | Main | Side | Fruit | Snack |
|-----|------|------|-------|-------|
| Mon | Loaded veggie wrap | Carrot sticks | Apple | Anzac biscuit |
| Tue | Tuna & rice bowl | Cucumber rounds | Mandarin | Rice crackers |
| Wed | Ham & cheese pinwheels | Cherry tomatoes | Banana | Banana oat muffin |
| Thu | Pasta salad with pesto | Capsicum strips | Kiwifruit | Bliss ball |
| Fri | Rice paper rolls | Snow peas | Grapes | Pikelets (egg-free) |

> **A correction.** This plan used to say it cost about $8.00 a week, under $1.60 a lunch. That figure added up the main-only totals of the ideas above ($1.32–$1.80 each) and left out the side, the fruit and the snack in every row of the table. A complete lunchbox across our menu set currently has a median of about **${boxMedianLabel()}**, and the cheapest complete box we can cost is about ${boxFloorLabel()} — so a realistic week of five is nearer **${boxWeekLabel()}** than $8. The [free planner](/en/planner) costs a full week on this week's prices.

---

## Egg-Free Baking Substitutes

For Sunday baking, you can replace eggs in most recipes:

- **1 mashed banana** = 1 egg (adds sweetness, works in muffins)
- **3 tbsp applesauce** = 1 egg (works in cakes and muffins)
- **1 tbsp ground flaxseed + 3 tbsp water** = 1 egg (mix and let sit 5 min)
- **1/4 cup silken tofu, blended** = 1 egg (works in dense baking)

The banana substitute works best for lunchbox muffins. Your child's classmates won't even notice the difference.

---

## NZ Resources for Egg Allergy

- **Allergy New Zealand** (allergy.org.nz) — free resources, allergen guides, and school policy templates
- **Starship Hospital Allergy Clinic** — referrals through your GP for testing and management plans
- **School allergy action plans** — ask your school office for their anaphylaxis policy and ensure your child's EpiPen (if prescribed) is registered with the school nurse

---

## ${eggLightnessHeading()}

Here is the part that is hard to see from inside the problem: as restrictions go, egg is a light one. ${eggVsNutClause()}

${dietGroup("egg-free").count} of our ${menuTotal()} menus are already egg-free, and costed against the prices behind our [NZ Lunchbox Price Index](/en/price-index) an egg-free main ${costClause("egg-free")}. On the snack side the filter removes exactly one item: turn it on and ${snackPool("Egg Allergy").kept} of ${snackPool("Egg Allergy").total} snacks survive, with ${droppedList("Egg Allergy")} the only casualty.

The label side is the same shape. ${declaredProducts("egg")} of the products we track declare egg — against ${declaredProducts("gluten")} that declare gluten. Egg simply is not in as many packets.

That is not a reason to relax. It is a reason to spend your label-reading attention where it actually pays: on the baked goods, the mayonnaise, and the products whose names give nothing away. [What the allergen labels actually say](/en/blog/allergen-labels-nz-lunchbox-staples) has the list of the ones that surprised us.

---

## Label Reading Quick Guide

When checking NZ food labels for egg, look for these terms:

- Egg, egg powder, egg solids
- Albumin / albumen
- Globulin
- Lysozyme
- Ovomucin, ovalbumin, ovoglobulin
- Meringue, mayonnaise
- **"May contain traces of egg"** — discuss with your allergist whether this level of risk is acceptable for your child

**Tip:** Keep a "safe list" on your phone of products you have verified as egg-free. Update it every few months when you re-check labels — formulations do change. The Allergy New Zealand website also provides downloadable allergen wallet cards for quick reference.

---

## Communicating with Your School

If your child has an egg allergy, take these steps at the start of each school year:

1. **Meet with the teacher** to discuss your child's allergy severity and management plan
2. **Provide an allergy action plan** signed by your child's doctor or allergist
3. **Ensure medications are on-site** — if your child carries an EpiPen, register it with the school office and confirm where it is stored
4. **Ask about food-related activities** — class baking days, science experiments with food, and shared lunches may pose risks
5. **Discuss birthday treats** — some schools allow shared food; request advance notice so you can provide a safe alternative for your child

Under the **Health and Safety at Work Act 2015**, NZ schools have a duty of care to manage known health risks. A clear allergy action plan protects your child and gives the school the information they need to respond appropriately in an emergency.

---

## NZ Supermarket Egg-Free Product Quick Reference

Knowing which everyday products are reliably egg-free saves time on your weekly shop. Here is a quick reference for popular items at NZ supermarkets (always confirm on the current label — formulations change):

| Product | Egg-Free? | Where to Buy | Notes |
|---------|-----------|-------------|-------|
| Vogel's Original bread | Yes | Woolworths, Pak'nSave | Check other Vogel's varieties individually |
| Nature's Fresh White bread | Yes | Woolworths, Pak'nSave | One of the most reliably egg-free white breads |
| Pams Wholemeal bread | Usually | Pak'nSave | Verify each time; bakery supplier may vary |
| Mission flour tortillas | Yes | Woolworths | Standard white variety |
| Barilla dried pasta | Usually | Woolworths, Pak'nSave | Their plain dried range; avoid egg pasta lines, and check each shape |
| San Remo dried pasta | Yes | Woolworths | Avoid their fresh pasta range |
| Best Foods Vegan Mayo | Yes | Woolworths (~$5.50) | Reliable egg-free mayo substitute |
| Pams Basil Paste | Yes | Pak'nSave | Good pesto substitute without egg |
| Sanitarium Weet-Bix | Yes | All supermarkets | Excellent egg-free snack |
| Arnott's Shapes (Original) | Yes | All supermarkets | Check other flavours individually |
| Woolworths Classic Hummus | Usually | Woolworths | Plain hummus is chickpea-based; flavoured and aioli-style tubs differ |

**This list does not replace the label, and it is not a shortcut past it.** Two of the products I actually track make that concrete: ${warnedKeysClause("egg", ["Pasta", "Hummus", "Bread", "Tortilla", "Wraps", "Crackers"]) || "several everyday staples"} declare no egg but carry a *may contain egg* warning. Nothing above is wrong about the recipe; the warning is about the factory. For a diagnosed egg allergy that line is the one that decides, and it is not in any list I can write for you.

Use this as a shortlist of what is worth picking up and turning over — not as a reason to turn fewer packets over.

---

## Egg-Free Lunchbox Ideas by NZ School Term

Seasonal ingredients affect what is available and affordable for egg-free lunches:

**Term 1 (Late January – April):** Summer produce is abundant. Use avocado in wraps and sandwiches as a creamy, egg-free spread. Cherry tomatoes, capsicums, and corn are at their cheapest. Pack feijoa halves from late March — a uniquely NZ treat that requires no preparation.

**Term 2 (May – July):** Transition to warmer options. Egg-free lentil soup in a thermos is a filling, protein-rich lunch. Kumara is cheap and abundant — mash it into egg-free quesadillas or bake into egg-free muffins using banana as the binding agent. Mandarins replace summer berries as the ideal lunchbox fruit.

**Term 3 (July – September):** Continue with thermos soups and warm options. Root vegetables (carrots, parsnips, pumpkin) are at their cheapest. Make egg-free pumpkin and cheese scrolls — use milk as the glaze instead of egg wash. Citrus remains the best-value fruit.

**Term 4 (October – December):** Spring produce arrives. NZ asparagus (September-November) works beautifully in egg-free tarts using a simple flour-and-butter pastry. Strawberries from October make a sweet addition to cream cheese wraps. As temperatures rise, ensure egg-free deli meats and dairy items are packed with an ice pack.

---

## Egg-Free Baking for NZ School Nude Food Policies

Many NZ schools encourage "nude food" — wrapper-free lunches. Homemade egg-free baking is the perfect fit because it comes in reusable containers with zero packaging waste. Here are three egg-free baking staples that freeze well:

**Egg-Free Banana Oat Muffins (makes 12):**
Replace eggs with 2 extra mashed bananas (5 total). Mix with 2 cups rolled oats (blended to rough flour), 1/3 cup honey, 1/3 cup oil, 1 tsp baking powder, and 1 tsp cinnamon. Bake at 180C for 22 minutes. Cost: ~$0.25 per muffin. Freeze for up to 3 months.

**Egg-Free Anzac Biscuits (makes 24):**
Traditional Anzac biscuits are naturally egg-free — oats, flour, coconut, sugar, butter, golden syrup, and baking soda. At about $0.15 per biscuit, they are cheap to make in a batch. They keep for 2 weeks in an airtight container.

**Egg-Free Bliss Balls (makes 20):**
Rolled oats, desiccated coconut, sunflower seed butter, honey, and cocoa powder — no egg needed. Roll into balls, refrigerate, then freeze. Cost: ~$0.20 per ball. These are nut-free and egg-free, making them safe for virtually all NZ school policies.

---

## Plan Egg-Free Lunches Easily

The [Kiwi Lunchbox Planner](/en/planner) has an **Egg Allergy** filter. Tick it and the week's mains are drawn only from the ${dietGroup("egg-free").count} egg-free menus, and snacks are checked against the egg declared on the labels of the products we track — today that removes ${droppedList("Egg Allergy")}. The filter is not remembered between visits, so tick it each time you plan. It works from our tagging and from declared allergens, not from "may contain" warnings, so the packets you actually buy still need reading.

[Try the planner →](/en/planner)
`,
  },
  "paknsave-vs-countdown-lunchbox-staples": {
    title: "Pak'nSave vs Woolworths: Lunchbox Staples Price Comparison 2026",
    seoTitle: "Pak'nSave vs Woolworths: Lunchbox Staple Prices 2026",
    excerpt:
      "I compared the prices of 20 common lunchbox staples at Pak'nSave and Woolworths. Here's where to shop for the best deals on school lunch ingredients in NZ.",
    date: "March 25, 2026",
    // 2026-09-28 재검토: 표는 08-11부터 주간 데이터로 생성되고 있었다(3월 실사 주석은 낡았다).
    // 표 밖 산문의 낡은·잰 적 없는 주장(Onecard·수요일 특가·「Pak'nSave 온라인 없음」·Costco 확장·
    // $0.85 도시락 등)을 걷어내고 데이터 문장으로 바꿨다. 뺀 것은 글 끝 「What changed」에 밝힌다.
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-28",
    image: "/assets/real-paknsave-ormiston-cart.jpg",
    imageCaption:
      "A real weekly shop in my trolley at Pak'nSave Ormiston — the kind of basket this comparison is built on. Photographed by the operator, not a stock image.",
    category: "Budget",
    author: "Yong Jae Lee",
    staticPrices: true,
    body: `
> **This table updates itself.** The prices below are read each week from each chain's own
> online shop — Woolworths on ${IDX.woolworthsUpdated}, Pak'nSave Ormiston on
> ${IDX.paknsaveUpdated} — and this page is generated from the same data as the
> [NZ Lunchbox Price Index](/en/price-index). You are not reading a snapshot from months ago.
>
> **What changed, and why I was wrong.** This article used to carry a hand-typed table from a
> March 2026 store walk, with a note saying I could not refresh the Pak'nSave column because
> "Pak'nSave sets prices per store and publishes no feed I can read." That was a guess I never
> checked, and it was wrong — Pak'nSave publishes store-level prices on its own website. It
> held this page stale for about five months. Both columns are now read weekly.
>
> **One trade-off, stated plainly.** These are online (Click & Collect) prices, not shelf tags,
> and the two are not guaranteed to match.
>
> **And a correction I am leaving visible.** The "$1.41 per lunch" figure further down came
> from an earlier costing model we later found to be wrong by roughly four times, and it used
> the cheapest price of either store on every item — which is not how anyone shops. Across our
> full menu set a complete lunchbox (main, fruit, second snack) works out at a median of about
> **${boxMedianLabel()}**, with a realistic floor around **${boxFloorLabel()} to $2.60**. Use those, not $1.41. The
> [free planner](/en/planner) costs a week on this week's real prices.

The trip that started this was a deliberate Saturday in East Auckland — same shopping list, two stops: Pak'nSave Ormiston and the Woolworths nearby. The biggest surprise was a block of cheese: same brand, same size, a $2.50 difference. Loose fruit went the other way. That walk is what set the basket below; the prices in it are now refreshed every week without me going back.

---

## The Great NZ Supermarket Debate

Every NZ parent has an opinion: Pak'nSave or Woolworths? For lunchbox shopping specifically, the answer isn't as simple as "Pak'nSave is always cheaper" — it usually wins the basket, but not every item, and which items it loses changes from week to week.

I track the same 20 lunchbox staples at both chains. The Pak'nSave store is Ormiston, in East Auckland, which is where I actually shop. Your local branch may differ — Pak'nSave in particular sets prices store by store, so treat these as one real store rather than a national average.

Two rules keep the table honest. **Specials are excluded**: when an item is on special at Pak'nSave that week, its regular price is not in the response, and dropping a special into an index makes the whole thing look like deflation — so that row is left at its previous value and marked. And **an item only counts in the scorecard if both columns were read within a month of each other**; anything older is shown but excluded.

---

## The Full Price Comparison

Woolworths read ${IDX.woolworthsUpdated} · Pak'nSave Ormiston read ${IDX.paknsaveUpdated}

| Item | Pak'nSave | Woolworths | Winner |
|------|-----------|-----------|--------|
${priceTableMarkdown()}

---

## The Scorecard

${scorecardMarkdown()}

${comparableSentence()}

---

## Where Woolworths Wins

Woolworths isn't always more expensive, and there are good reasons to shop there:

**It is never a clean sweep.** In the current read, Woolworths is cheaper on ${woolworthsWinsSentence()}. Which items those are moves week to week, and fresh produce is where it moves most — so if fruit and salad vegetables are a big part of your child's lunchbox, the cheaper store is genuinely not a fixed answer.

The gap also is not spread evenly across the basket. [Where the supermarket gap actually is](/en/blog/supermarket-price-gap-nz-lunchbox) works through the current round and finds that a handful of items carry most of it — which changes what you would actually do about it.

**Weekly specials:** Woolworths' specials run Monday to Sunday, and a special can undercut Pak'nSave's everyday price for that week. Some of them are Everyday Rewards member prices, which you only get with the card — the [planner](/en/planner) reads each week's mailer and marks member-only prices as such.

**Convenience:** if a Woolworths is closer, the fuel and time of a longer drive can eat a small price gap. Only you can put a number on that.

---

## Where Pak'nSave Wins

In the current read, Pak'nSave is cheaper on ${paknsaveWinsSentence()}. That list is generated from the same table above, so it changes when the prices do — I would rather show you this week's list than repeat a rule of thumb about which aisles Pak'nSave "always" wins.

---

## The Smart Hybrid Strategy

The most cost-effective approach for many NZ families:

1. **Do your main weekly shop where the scorecard above says the basket is cheaper** — this round that is ${cheaperBasketStore()}
2. **Check the "Where Woolworths Wins" list before a top-up shop** — it is short, and it changes week to week
3. **Check both chains' weekly specials** for lunchbox items (they run Monday to Sunday)
4. **Stock up** when your preferred store has a deep discount on non-perishables (canned tuna, pasta, rice, crackers)

---

## Price Per Lunch Breakdown

Using the cheapest available prices between both stores, here's what a week of budget lunches costs:

| Day | Lunch | Cost |
|-----|-------|------|
| Mon | Ham & cheese sandwich + apple + carrot sticks | $1.45 |
| Tue | Tuna & corn wrap + mandarin | $1.60 |
| Wed | Pasta salad with cheese + banana | $1.30 |
| Thu | Egg fried rice + cucumber sticks | $0.90 |
| Fri | Hummus & crackers + cherry tomatoes + kiwifruit | $1.80 |

**Weekly total: $7.05** — that's $1.41 per lunch average.

> ⚠️ **This is the figure corrected at the top of the article.** It assumes the cheapest
> price of either store on every item, on March prices, and it was produced by a costing
> model we have since found to be wrong by about four times. Our current figure for a
> complete lunchbox — main, fruit and a second snack — is a median of about **${boxMedianLabel()}**, ranging
> from roughly **${boxFloorLabel()} to ${boxCeilingLabel()}** depending on the main. I have left the original table here
> because deleting it would hide the error rather than correct it.

---

## When to Buy What

Seasonal awareness saves money:

- **Autumn (March-May):** Apples, pears, feijoas are cheapest. Buy NZ-grown.
- **Winter (June-Aug):** Citrus (mandarins, oranges) at their cheapest. Root vegetables (carrots, kumara) are abundant.
- **Spring (Sep-Nov):** Berries start appearing. Asparagus and peas are in season.
- **Summer (Dec-Feb):** Stone fruit, berries, watermelon. Tomatoes and capsicums are cheapest.

Buying seasonal fruit instead of imported out-of-season fruit can cut the fruit portion of your shop noticeably. Stats NZ's Food Price Index shows steep seasonal swings in produce, but we have not put a single percentage on it — the size of the swing depends entirely on which fruit you compare.

---

## What About New World?

New World often gets overlooked in the NZ supermarket comparison, but it is worth considering:

- **Pricing:** I now read New World's prices each week as well. [Three supermarkets compared](/en/blog/three-supermarkets-nz-lunchbox-basket-compared) puts all three chains side by side on the same basket, so I am not going to quote a percentage for it here that the data might contradict next week.
- **Specials:** New World runs its own weekly specials independently of Woolworths (they are different companies — New World and Pak'nSave are both Foodstuffs). Check the New World app for deals on lunchbox items.
- **Location advantage:** In some towns, New World may be the most convenient supermarket, and the time saved can offset the slight price premium.

---

## What changed in this review (28 September 2026)

I re-read this article against current data and removed claims I could not stand behind:

- a section on online grocery shopping that said Pak'nSave offers no online shopping — while the table at the top of this page is read from Pak'nSave's own online store
- references to the Woolworths Onecard (now Everyday Rewards) and to specials starting on Wednesdays (they start on Mondays)
- seasonal produce prices, homebrand savings of "$5–$8 a week", a Costco section and a meal-kit comparison, none of which I had measured
- a "$0.85 fried rice lunchbox" line that contradicted this site's own costing
- a fixed list of aisles Pak'nSave "wins decisively", now replaced by this week's list from the data

The $1.41 table above stays, with its correction, because deleting it would hide the error.

---

## Track Your Spending

The [Kiwi Lunchbox Planner](/en/planner) estimates costs for each meal plan using current NZ supermarket prices, helping you see your weekly lunchbox budget at a glance.

[Try the planner →](/en/planner)
`,
  },
  "batch-cooking-save-money-nz": {
    title: "Batch Cooking to Save Money on School Lunches in NZ",
    excerpt:
      "Batch cooking costed per serve rather than per hour saved — including what my daughter won't eat reheated, and where the savings quietly stop working.",
    date: "March 28, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-29",
    image: "/assets/kiwi_chicken_pesto_panini.webp",
    category: "Budget",
    author: "Yong Jae Lee",
    staticPrices: true,
    body: `
When mornings get away from me, my fallback is onigiri (rice balls) or a quick kimbap made from the previous night's dinner rice — a habit that comes with being a Korean family in East Auckland. The rice and nori come from the Korean grocer, the furikake from the Japanese one, and it takes about ten minutes to roll a few. What I've learned is that rice doesn't freeze or reheat well for my daughter: she eats by texture, and the moment rice turns soft and mushy it's an instant no. So my rule is simple — rice-based lunches get made from fresh leftover rice the night before, never batch-frozen weeks ahead. That one lesson shaped my whole routine: I only batch-cook and freeze the dishes that actually hold their texture, and make the rest fresh. Done that way, the weekly prep takes about an hour and nothing tastes like it came out of a freezer.

---

## Why Batch Cooking Works for Lunchboxes

Batch cooking is the simple idea of cooking larger quantities at once and portioning them out for the week (or freezing for later weeks). For school lunchboxes, it works brilliantly because:

1. **It eliminates the daily morning scramble.** Lunches are already made or nearly made.
2. **It reduces food waste.** You use ingredients completely instead of letting half a capsicum wilt in the fridge.
3. **It saves money.** Buying in bulk and cooking in bulk is cheaper per serve than making individual meals each day.
4. **It improves nutrition.** When you're not rushing, you make better food choices.

The NZ Ministry of Health's Eating and Activity Guidelines recommend that school-aged children eat from all four food groups daily. Batch cooking makes it far easier to hit this target consistently.

---

## The Sunday Batch Cook: A Realistic Plan

You don't need to spend all Sunday in the kitchen. Here's a 90-minute session that sets up your entire week:

**0:00-0:10 — Start the rice and put on a pot of pasta**
- Cook 4 cups of rice (enough for 4-5 lunchboxes)
- Cook 500g pasta (enough for 3-4 lunchboxes)
- Total cost: rice ~$0.60, pasta ~$0.50

**0:10-0:30 — Prepare proteins**
- Hard-boil 8 eggs (${eggsDozenLabel()})
- Shred leftover roast chicken (or cook 2 chicken breasts — ~$4.50 at Pak'nSave)
- Mix a batch of tuna salad: 1 can tuna, corn, mayo (~$3.50 total, serves 4)

**0:30-0:50 — Prepare vegetables**
- Cut carrot sticks (from a 1kg bag, ~$1.50)
- Slice cucumber (2 cucumbers, ~$4.00)
- Halve cherry tomatoes (1 punnet, ~$4.00)
- Wash and portion baby spinach (~$3.50 for a bag)
- Store all in airtight containers with a damp paper towel

**0:50-1:10 — Make sauces and fillings**
- Batch of homemade tomato sauce (1 can tomatoes + onion + garlic + herbs = ~$2.50, makes 8 serves)
- Pesto pasta salad mix (toss half the cooked pasta with pesto, cherry tomatoes, cheese)
- Season the rice with soy sauce and sesame oil for fried rice base

**1:10-1:30 — Baking (if time allows)**
- Quick batch of savoury muffins or bliss balls
- Or portion out store-bought snacks into daily bags

---

## Why Batch Cooking Wins: You're Buying Pack Sizes, Not Meals

Here's the mechanism, in numbers. Supermarkets sell in pack sizes designed for a household, not for one lunch. When you buy a pack for a single meal you eat the whole pack price against one lunch. Batch cooking is really just amortising the pack.

From the prices I track weekly for the [NZ Lunchbox Price Index](/en/price-index), here's how many lunchbox servings are actually in one standard pack:

| Ingredient | Pack price | Servings in the pack | Cost per serve |
|---|---|---|---|
${packEconomicsTableMarkdown()}

${packEconomicsPunchline()}

This is why baking beats buying so consistently: the ingredients for homemade muffins are pantry staples with ${muffinStapleServeRange()} servings per pack, while a packet of six muffins is six servings and then it's gone.

**The catch is waste.** The maths above only holds if you actually use the pack. ${flourWasteSentence()} Batch cooking works because it converts the pack into finished food while you're already in the kitchen — the amortising and the using-it-up happen in the same session.

---

## What This Costs

The session above produces enough components for **10 lunchbox mains** (5 days x 2 children) plus sides and snacks.

> **A correction.** This section used to put the session at "$25-$30" and then say each lunch cost "$1.30-$1.50". Those two cannot both be true: $25–$30 across ten mains is $2.50–$3.00 a main before the sides, and the same session also buys the sides. It then set that figure against the cost of *complete* bought lunches in an annual table and reported a saving of $880–$1,400 a year. The per-lunch figure, the comparison list and the annual table are gone.

What we can say from our own tracking rather than an estimate: across our whole menu set a complete lunchbox — main, a piece of fruit, a second snack — has a median of ${boxMedianLabel()}, of which the main is ${mainMedianLabel()}. Batch cooking attacks that main slot: the per-serve figures in the recipes below are for a main made in bulk. We have not measured what the same mains cost bought ready-made, so this article does not claim a weekly or yearly saving.

Those two medians are recomputed every time we re-read prices; the per-recipe figures in this article are not. [Every reading we hold is here](/en/price-history).

---

## Five Batch-Friendly Lunchbox Mains

### 1. Big-Batch Fried Rice (makes 5 serves)

**Ingredients:**
- 4 cups cooked rice (~$0.60)
- 3 eggs (~${money(3 * servePrice("Eggs"))})
- 1 cup frozen mixed vegetables (~$0.80)
- 3 tbsp soy sauce (~$0.15)
- 2 tbsp sesame oil (~$0.20)

**Total: ~${money(1.75 + 3 * servePrice("Eggs"))} | Per serve: ~${money((1.75 + 3 * servePrice("Eggs")) / 5)}**

Cook the whole batch at once in a large pan or wok. Cool quickly, portion into 5 containers. Refrigerate. Each morning, grab a container and add to the lunchbox.

### 2. Pasta Salad Base (makes 4 serves)

**Ingredients:**
- 500g cooked pasta spirals (~$0.65)
- 4 tbsp pesto (~$1.60)
- 200g cherry tomatoes, halved (~$3.20)
- 100g cheese, cubed (~$1.30)

**Total: ~$6.75 | Per serve: ~$1.69**

Mix everything together. Portion into containers. Add fresh spinach each morning for a nutrient boost.

### 3. Chicken Wraps Prep (makes 5 wraps)

**Ingredients:**
- 5 flour tortillas (~$2.00)
- 200g shredded cooked chicken (~$2.25)
- Lettuce, grated carrot (~$0.80)
- Mayo (~$0.50)

**Total: ~$5.55 | Per serve: ~$1.11**

Prep the chicken and vegetables. Store separately. Assemble each morning in under 2 minutes. Don't pre-roll and store wraps, as they get soggy.

### 4. Savoury Muffin Batch (makes 12)

**Ingredients:**
- 2 cups self-raising flour (~$0.30)
- 1 cup cheese (~$1.50)
- 1 zucchini, grated (~$0.50)
- 2 eggs, milk, oil (~$1.50)

**Total: ~$3.80 | Per muffin: ~$0.32**

Bake, cool completely, freeze. Grab 2 per lunchbox the night before. Thawed by morning tea.

### 5. Soup for Thermos (makes 6 serves)

**Ingredients:**
- 1 cup red lentils (~$1.00)
- 2 carrots, 2 celery sticks, 1 onion (~$1.50)
- 1 can diced tomatoes (~$1.20)
- Vegetable stock, spices (~$0.50)

**Total: ~$4.20 | Per serve: ~$0.70**

Make a big pot. Freeze in individual portions. Reheat and pour into a preheated thermos each morning. Perfect for Terms 2 and 3 (NZ winter).

---

## Batch Cooking Storage Guide

| Item | Fridge Life | Freezer Life | Container |
|------|-------------|-------------|-----------|
| Cooked rice | 3 days | 3 months | Airtight container |
| Cooked pasta | 4 days | 2 months | Airtight container |
| Hard-boiled eggs | 5 days (unpeeled) | Don't freeze | In shell, in fridge |
| Shredded chicken | 3 days | 3 months | Ziplock bag |
| Tuna salad mix | 2 days | Don't freeze | Airtight container |
| Cut vegetables | 4-5 days | Don't freeze | Container with damp paper towel |
| Muffins | 3 days | 3 months | Ziplock bag |
| Soup | 4 days | 3 months | Portion containers |

---

## Making It a Habit

The hardest part of batch cooking is starting. Here's how to make it stick:

1. **Pick the same time each week.** Sunday 3-4:30pm works for many NZ families.
2. **Start small.** Just cook extra rice and boil eggs in week one. Add more as it becomes routine.
3. **Involve the kids.** Even young children can wash vegetables, crack eggs, or stir batter.
4. **Play music or a podcast.** Make it enjoyable, not a chore.
5. **Reward yourself.** That cup of tea after the batch cook is complete? You've earned it.

---

## Seasonal Batch Cooking in NZ

Adapting your batch cook to NZ seasons keeps costs down and flavours fresh:

**Term 1 (Summer — Late January to April):**
- Batch cook pasta salads with fresh cherry tomatoes and capsicums (at their cheapest)
- Make sushi rice in bulk — sushi rolls are a summer lunchbox favourite
- Prepare fruit salad cups using seasonal stone fruit, berries, and grapes
- Avoid hot thermos meals — focus on cold lunches that stay safe in the heat

**Term 2 (Autumn/Winter — Late April to July):**
- Big-batch lentil soup using cheap seasonal root vegetables (carrots, kumara, pumpkin)
- Bake savoury muffins with seasonal pumpkin and cheese
- Cook extra rice for fried rice — a warming, filling option for cold days
- Feijoas are free or very cheap in April/May — make feijoa muffins or chutney

**Term 3 (Winter — Late July to September):**
- Thermos soups are your best friend: pumpkin, carrot and lentil, broccoli and cheese
- Batch cook bolognese sauce (hide vegetables by blending them in) — use for wraps, pasta, and pizza scrolls
- Citrus is at its cheapest — pack mandarins and oranges daily

**Term 4 (Spring/Summer — Mid October to December):**
- Transition back to cold salads and wraps
- NZ asparagus and strawberries appear — use in tarts and sweet wraps
- Batch cook quinoa salads with fresh spring vegetables

---

## Getting Started Costs Little

You need airtight containers (Sistema, ~$5-$15 at Woolworths), ziplock bags, and a Sunday afternoon. The annual-savings table that used to sit here compared main-only batch costs against whole bought lunches, so it overstated the saving; see the correction above.

---

## Involving Kids in the Batch Cook

Batch cooking is an opportunity to involve children in meal preparation, which research shows makes them more likely to eat the food:

- **Ages 4-6:** Wash vegetables, tear lettuce, stir batter
- **Ages 7-9:** Grate cheese, fill muffin tins, measure ingredients
- **Ages 10+:** Chop vegetables (with supervision), assemble wraps, follow simple recipes independently

Play music, make it a family activity, and let each child taste-test the results. A child who helped make Tuesday's pasta salad is far more likely to eat it than one who had no input.

The NZ Curriculum includes food preparation as part of the health and physical education strand — involving children in batch cooking supports this learning at home and builds practical life skills they will use for years.

---

## Batch Cooking Equipment: What NZ Families Need

You do not need expensive equipment to batch cook effectively. Here is what makes a real difference:

**Essential:**
- A large pot or stockpot (for soup, pasta, and rice) — $15-$30 at The Warehouse
- A large baking tray (for roasting vegetables and kumara) — $10-$15 at Briscoes
- Airtight containers — Sistema Klip It range at Woolworths ($5-$15 per set) is the NZ standard for lunchbox storage
- Ziplock bags — for freezing muffins, bliss balls, and portioned meats

**Nice to have:**
- A rice cooker — $25-$50 at The Warehouse. Set and forget; frees up stovetop space during the batch cook
- A stick blender — $30-$50 at Briscoes. Essential for blending soup smooth (children are more likely to eat smooth lentil soup than chunky)
- A muffin tin — $10 at The Warehouse. Crucial for the savoury muffin batch

**Not necessary:**
- Expensive food processors — a box grater handles zucchini and cheese perfectly well
- Vacuum sealers — ziplock bags with the air squeezed out work fine for 2-3 month freezer storage
- Slow cookers — useful for dinner but add unnecessary time to a 90-minute lunchbox batch cook

The total startup cost for essential batch cooking equipment is approximately $40-$60, most of which a family kitchen already has.

---

## Common Batch Cooking Mistakes NZ Families Make

**Cooking too much of one thing.** Making 10 serves of pasta salad sounds efficient, but by Thursday the family is sick of pasta. Instead, make 3-4 different items in smaller quantities. Variety keeps lunchboxes interesting and prevents waste from food rejection.

**Not labelling containers.** After a week in the fridge, pre-made tuna salad and pre-made pasta with pesto look surprisingly similar. Spend 30 seconds labelling each container with the item name and date using masking tape and a marker. This small step prevents confusion and ensures food is used within its safe window.

**Forgetting to cool before freezing.** Putting warm food in the freezer raises the internal temperature, which can partially thaw surrounding items and affect food safety. Always cool food to room temperature on the bench before transferring to the fridge or freezer. Speed up cooling by spreading rice or pasta thinly on a tray.

**Over-relying on the fridge.** Cooked rice lasts 3 days in the fridge; cooked chicken lasts 3 days; tuna salad lasts 2 days. If your batch cook is on Sunday, items prepared for Thursday and Friday should be frozen on Sunday and defrosted the night before use. This is the most common food safety mistake in batch cooking.

---

## Plan Your Batch Cook

The [Kiwi Lunchbox Planner](/en/planner) generates a weekly plan and a combined shopping list for it. Tick **Make ahead (night before)** to draw the week's mains only from menus that can be cooked or assembled ahead, and the plan groups the week into prep-ahead, cook-that-morning and just-assemble days so you can see what to batch.

[Try the planner →](/en/planner)
`,
  },
  "iron-rich-lunchbox-foods-nz": {
    title: "Iron-Rich Foods for NZ Kids: High-Iron Lunchbox Meals & Snacks",
    seoTitle: "Iron-Rich Lunchbox Foods for NZ Kids: Meals & Snacks",
    excerpt:
      "Iron deficiency is the most common nutritional deficiency in NZ children. Iron-rich foods and high-iron meal and snack ideas for the lunchbox.",
    date: "March 31, 2026",
    lastReviewed: "October 2026",
    contentUpdated: "2026-10-02",
    image: "/assets/kiwi_tuna_mayo_sandwich.webp",
    category: "Nutrition",
    author: "Yong Jae Lee",
    body: `
Iron is one of those nutrients you don't think about until someone points at it — and in growing kids it's the one most quietly missing from an otherwise fine-looking lunchbox. When I went digging through the NZ Ministry of Health guidance on iron for children, the thing that surprised me wasn't "just add more meat" — it was pairing: a little vitamin C alongside an iron source actually changes how much your body absorbs. This guide is built around those combinations, sized for what realistically fits in a school lunch. Iron is one nutrient among several that go missing this way — our [complete nutrition guide for NZ school lunches](/en/guides/complete-nutrition-guide-school-lunches-nz) covers calcium, protein and fibre the same way, with the food-group targets behind them.

---

## Iron Deficiency in NZ Children

Iron deficiency is the most common nutritional deficiency among New Zealand children. According to the [NZ Ministry of Health](https://www.health.govt.nz/publications/food-and-nutrition-guidelines-for-healthy-children-and-young-people-aged-2-18-years-a-background), approximately 1 in 14 children under 5 and a significant number of school-aged children have low iron stores. The consequences are real: fatigue, poor concentration, reduced learning capacity, and weakened immunity.

For school-aged children, the recommended daily intake of iron is:
- **Ages 4-8:** ${NRV_IRON_4_8}mg per day
- **Ages 9-13:** 8mg per day
- **Ages 14-18 (girls):** 15mg per day
- **Ages 14-18 (boys):** 11mg per day

School lunch accounts for roughly one-third of a child's daily food intake, so it's a critical opportunity to boost iron.

---

## Two Types of Iron

Understanding the difference helps you plan better:

**Haem iron** (from animal sources) — absorbed more readily than non-haem iron:
- Red meat (beef, lamb)
- Chicken (especially dark meat — thighs and drumsticks)
- Fish (tuna, salmon)

**Non-haem iron** (from plant sources) — less efficiently absorbed but still valuable:
- Legumes (lentils, chickpeas, kidney beans)
- Dark leafy greens (spinach, silverbeet)
- Fortified cereals (Weet-Bix, some breads)
- Dried fruit (apricots, raisins)
- Pumpkin seeds

**Key tip:** Vitamin C helps the body absorb non-haem iron. Pairing iron-rich plant foods with vitamin C sources (citrus fruit, capsicum, kiwifruit, tomatoes) in the same meal is the simplest way to get more out of them.

---

## Iron-Rich Lunchbox Ideas

### Idea 1: Beef & Veggie Wrap

- Leftover cooked beef mince (${portionGrams("wrapMince")} provides ${portionIron("wrapMince")} iron, at ${per100Iron("Beef mince, cooked")} per 100g)
- Flour tortilla
- Grated cheese
- Shredded lettuce
- Tomato sauce

**Iron content: ${ideaIron("wrap")} from the mince**, plus whatever the tortilla adds — its nutrition panel will say. A bigger scoop of mince is the easy way to raise it.

Cook extra beef mince at dinner (bolognese, tacos, etc.) and repurpose it for wraps. Season simply with salt and a pinch of cumin. Kids love this because it feels like a burrito.

### Idea 2: Chicken & Spinach Pasta

- 1 cup cooked pasta
- ${portionGrams("pastaThigh")} shredded chicken thigh (${portionIron("pastaThigh")} iron, at ${per100Iron("Chicken thigh, cooked")} per 100g)
- A cup of baby spinach (${portionGrams("pastaSpinach")}, ${portionIron("pastaSpinach")} iron)
- 1 tbsp pesto
- Cherry tomatoes (vitamin C to boost iron absorption)

**Iron content: ${ideaIron("pasta")} from the chicken and spinach**, plus a little from the pasta.

Use chicken thighs rather than breast — ${thighVsBreastClause()}. Shred the thighs from last night's roast or buy pre-cooked thighs from the Woolworths deli.

### Idea 3: Lentil Soup Thermos

- Red lentil soup made with ${portionGrams("soupLentils")} cooked red lentils (${portionIron("soupLentils")} iron from the lentils)
- Rice crackers on the side
- Mandarin (vitamin C booster)

**Iron content: ${ideaIron("soup")} from the lentils**

Lentils are a cheap plant source of iron: tinned lentils work out at ${ironCostRows().find((r) => r.key === "Red Lentils")!.perMgLabel} per milligram of iron in the cost table further down. Cooked red lentils have ${per100Iron("Red lentils, cooked")} per 100g, drained tinned lentils ${per100Iron("Red Lentils")}. Making soup is the easiest way to get kids to eat lentils, especially when blended smooth.

### Idea 4: Fortified Cereal Snack Mix

- 2 Weet-Bix, crumbled (${portionGrams("mixWeetBix")}, ${portionIron("mixWeetBix")} iron)
- A snack pack of raisins (${portionGrams("mixRaisins")}, ${portionIron("mixRaisins")} iron)
- Pumpkin seed kernels (${portionGrams("mixPumpkin")}, ${portionIron("mixPumpkin")} iron, where permitted)
- 4 dried apricot halves (${portionGrams("mixApricots")}, ${portionIron("mixApricots")} iron)

**Iron content: ${ideaIron("mix")} per serve** (${portionIron("mixWeetBix")} of it from the two Weet-Bix)

Crush 2 Weet-Bix into a container, mix with dried fruit and seeds. This is a high-iron snack that kids can eat at morning tea. Pair with an orange or kiwifruit for vitamin C.

### Idea 5: Hummus & Veggie Box with Capsicum

- 3 tbsp hummus (${portionGrams("boxHummus")}, ${portionIron("boxHummus")} iron)
- Red capsicum strips (~vitamin C booster)
- Carrot sticks
- Wholegrain crackers
- Kiwifruit on the side (~vitamin C booster)

**Iron content: ${ideaIron("hummus")} from the hummus**, plus whatever the crackers add — their nutrition panel will say (with enhanced absorption from vitamin C)

This plant-based lunch relies on the vitamin C from capsicum and kiwifruit to maximise absorption of the non-haem iron in the hummus and crackers. (For more meat-free ideas, see our [vegetarian & vegan school lunch guide](/en/guides/vegetarian-vegan-school-lunch-guide-nz).)

---

## Iron Absorption: What Helps and What Hinders

**Enhancers (pair these with iron-rich foods):**
- Vitamin C: citrus, kiwifruit, capsicum, tomatoes, strawberries
- Meat: even a small amount of meat eaten with plant-based iron increases absorption

**Inhibitors (avoid pairing these with iron-rich foods):**
- Calcium: milk and cheese reduce iron absorption when consumed at the same time
- Tea and coffee: tannins block iron absorption (not usually an issue for kids)
- Phytates: found in wholegrains and legumes (cooking and soaking reduces their effect)

**Practical lunchbox application:** Don't pack a glass of milk with an iron-rich meal. Instead, pack water and save the milk for afternoon tea. Include a vitamin C fruit (mandarin, kiwifruit) with every iron-rich lunch.

---

## Weekly Iron-Boosting Lunchbox Plan

| Day | Main (Iron Source) | Side | Fruit (Vitamin C) |
|-----|-------------------|------|-------------------|
| Mon | Beef mince wrap | Carrot sticks | Mandarin |
| Tue | Lentil soup + crackers | Cucumber sticks | Kiwifruit |
| Wed | Chicken & spinach pasta | Cherry tomatoes | Orange slices |
| Thu | Hummus & veggie box | Capsicum strips | Strawberries |
| Fri | Weet-Bix trail mix + cheese sandwich | Celery sticks | Mandarin |

${ironWeekSentence()} Worth setting that against the norm: in the 2002 Child Nutrition Survey, everything eaten across the whole school day supplied just **24.9% of daily iron**, and the lunch window alone 16.3% (Table 1 of the Ministry of Education's [Ka Ora, Ka Ako nutrition evaluation](https://web-assets.education.govt.nz/s3fs-public/2024-11/Ka-Ora-Ka-Ako_Nutrition-Evaluation-v2.pdf)). Iron was also one of the five nutrients that same evaluation found sitting below target in the free-lunch programme itself.

---

## When to See a Doctor

If your child shows signs of iron deficiency — persistent fatigue, pale skin, frequent illness, difficulty concentrating at school — see your GP. A simple blood test can check iron levels. Treatment may include dietary changes, iron supplements, or both.

In New Zealand that blood test is ordered through your GP.

---

## NZ Iron-Rich Ingredients: Price Guide

Here's the thing that changed how I think about iron in a lunchbox. I re-read regular Woolworths shelf prices from their online shop each week, and when I lined the iron sources up by what one lunch's worth actually costs, the spread was enormous:

| Iron source | Cost per lunchbox serve (${ironPriceMonth()}) |
|---|---|
${ironPriceTableMarkdown()}

${lentilsVsMinceSentence()} A lentil serve carries less iron than a mince serve, though, so per milligram of iron (the table further down) the gap is about ${lentilsVsMincePerMgMultiple()}×, not ${lentilsVsMinceMultiple()}×. Lentils are also non-haem iron, which the body absorbs less readily — the vitamin C pairing covered above helps with that. Squeeze lemon over the lentils, or pack a mandarin alongside, and the cheap option stops being the compromise it looks like.

This is the practical version of the advice: **you do not need to buy more red meat to fix iron.** A tin of lentils and a piece of citrus does more for the budget than it does damage to the nutrition.

The table below carries the iron content, so you can weigh the costs above against actual milligrams. It deliberately does **not** repeat prices — the costed figures on this page come from one place, the tracked table above. Every figure on this page for the iron in a food comes from the [New Zealand Food Composition Database](https://www.foodcomposition.co.nz/) (Plant & Food Research and the Ministry of Health); the last column is the record, so you can look it up:

${ironReferenceTableMarkdown()}

Note that the serve sizes here are the ones each food is normally measured in, not our lunchbox portions, so read them against each other rather than multiplying them into the costs above.

${cheapestIronClause()}

### What a serve of iron costs

The iron table above uses the measures foods are usually quoted in; the price table uses our lunchbox serves. This one puts both on the same serve: iron per 100g from the same New Zealand database, multiplied by our serve weight, against the regular Woolworths shelf price of the product we track (${ironPriceMonth()}). For tinned beans and lentils only the drained share is counted — the legume percentage printed on that tin's ingredient list — not the liquid.

${ironCostTableMarkdown()}

${ironCostSummary()}

These iron figures are approximate. They come from reference values for each type of food, not from each product's own label, and a particular brand can differ. How much iron a child actually absorbs also depends on the rest of the meal. Treat this as a price comparison, not dietary advice — if your child has low iron, follow your GP's advice.

---

## Iron and NZ School Terms

Iron needs fluctuate with activity levels and growth spurts, both of which coincide with the school year:

**Term 1 (Summer):** Children are active and sweating, which increases iron loss. Focus on iron-rich mains like beef wraps and chicken pasta. Pair with summer vitamin C sources — strawberries, capsicum, cherry tomatoes.

**Terms 2-3 (Winter):** This is peak cold and flu season. Iron supports immune function, so lentil soup in a thermos is an excellent choice. Pair with citrus — mandarins and oranges are at their cheapest and provide the vitamin C boost for iron absorption.

**Term 4 (Spring):** Growth spurts are common as the year ends. Ensure iron-rich foods feature prominently. NZ asparagus (in season Sep-Nov) contains moderate iron and pairs well with beef or chicken in wraps and tarts.

---

## Common Signs of Low Iron in School-Aged Children

As a parent, watch for these signs that may indicate your child's iron levels need attention:

- Persistent tiredness or lethargy, especially after school
- Pale skin, particularly around the inner eyelids, gums, and nail beds
- Difficulty concentrating or declining school performance
- Frequent colds and infections
- Unusual cravings (ice, dirt, or chalk — known as pica)
- Headaches

These symptoms overlap with many other conditions, so a blood test is the only way to confirm iron deficiency. If you notice several of these signs, book an appointment with your GP. The test is straightforward and results are usually available within a few days.

---

## Easy Iron-Boosting Additions for Any Lunchbox

You do not need to overhaul your child's entire lunchbox to increase iron intake. Small additions to their existing favourite foods make a meaningful difference:

- **Add baby spinach** to any sandwich or wrap — the ${portionGrams("addSpinach")} handful we cost above adds ${portionIron("addSpinach")} iron
- **Swap white bread for wholemeal** — wholemeal bread contains ${wholemealVsWhiteClause()}
- **Include a Weet-Bix** as a snack — crushed Weet-Bix in a container with dried fruit makes a high-iron trail mix
- **Pack dried apricots** instead of (or alongside) fresh fruit — 4 dried apricot halves (${portionGrams("mixApricots")}) contain ${portionIron("mixApricots")} iron
- **Use leftover dinner meat** — even a small amount of beef or lamb from last night's dinner, sliced into a sandwich, adds significant haem iron

These small changes, applied consistently across a school week, can meaningfully increase your child's total iron intake without requiring completely new lunch ideas.

---

## Traditional NZ Foods and Iron

Traditional foods can be excellent partners for iron in a lunchbox:
- **Kumara** — while not high in iron itself, kumara is rich in vitamin C which enhances iron absorption from other foods in the same meal
- **Puha and watercress** — traditional Maori greens that contain moderate iron, available at some farmers' markets and supermarkets
- **Mussels (kutai)** — high in iron (${per100Iron("Mussels, boiled")} per 100g, boiled) and often available cheaply at NZ fish markets. Not ideal for lunchboxes in warm weather, but excellent in winter thermos soups
- **Rewena (Māori potato bread)** — a traditional fermented potato bread; check the recipe or packet for its iron content

For families working with tight budgets, the cheapest milligrams of iron in our cost table above are ${cheapestIronSourcesClause()} — and leftover dinner meat costs nothing extra if it would otherwise go unused.

---

## Iron-Fortified Products Available at NZ Supermarkets

Several products commonly found in NZ supermarkets are iron-fortified, making them easy additions to any lunchbox:

${fortifiedTableMarkdown()}

${practicalTipSentence()}

---

## When Supplements Are Needed

Dietary changes alone may not be sufficient for children with confirmed iron deficiency. If your GP identifies low iron through a blood test, they may recommend:

- **Iron supplements:** Available over the counter at NZ pharmacies (Ferro-F-Tabs, Ferrograd C) but should only be given to children on medical advice. Over-supplementation can be harmful.
- **Dietary counselling:** Your GP can refer to a dietitian (partially funded through the public health system) for personalised advice on increasing dietary iron.
- **Follow-up testing:** Iron levels should be re-tested after 3 months of dietary changes or supplementation to confirm improvement.

The school lunchbox is one piece of the iron puzzle — breakfast and dinner are equally important. But for children who skip breakfast (common in older primary and intermediate students), the lunchbox becomes an even more critical source of daily iron.

---

## Plan Iron-Rich Lunches

The [Kiwi Lunchbox Planner](/en/planner) does not score or rank menus by iron, and it does not pair foods for vitamin C — that part is still yours. What it can do: type an iron source you already have in the fridge — lentils, say, or leftover beef mince — into **Fridge Leftovers**, and it will favour menus that use it. Add the mandarin or kiwifruit yourself.

[Try the planner →](/en/planner)
`,
  },
  "spring-lunchbox-ideas-nz": {
    title: "Spring Lunchbox Ideas Using NZ Seasonal Produce",
    excerpt:
      "Spring in New Zealand brings asparagus, strawberries, and new potatoes. Here's how to use fresh seasonal produce to create exciting, affordable lunchboxes.",
    date: "April 6, 2026",
    lastReviewed: "October 2026",
    contentUpdated: "2026-10-12",
    image: "/assets/kiwi_turkey_club_sandwich.webp",
    category: "Seasonal",
    author: "Yong Jae Lee",
    staticPrices: true,
    body: `
My daughter is genuinely good with vegetables — cucumber, carrot and capsicum sticks disappear from her lunchbox while other things come home half-eaten — and I pack seasonal fruit every single day. So spring is the easy season in our house: when the winter prices on produce finally drop at Pak'nSave, the lunchbox gets cheaper and more colourful at the same time. These are the NZ-spring ideas I build around the fruit and veg my kid actually eats.

---

## Why Seasonal Eating Matters for Lunchboxes

Eating seasonally isn't just a trendy concept — it's one of the most practical ways to save money and improve the quality of your child's lunchbox. (Our [NZ seasonal produce calendar](/en/guides/nz-seasonal-produce-calendar) breaks down what's cheapest and freshest each month.) Seasonal produce in New Zealand is:

- **Cheaper:** the seasonal swing is real, but uneven. Between our May and ${ROUND_MONTH()} rounds carrots fell ${carrotsFallPct()}% — but it is not a clean story: no vegetable on our list rose over the same period, and yet the protein on the list went the other way sharply
- **Fresher:** Less time in transport and cold storage means better taste and more nutrients
- **More sustainable:** Lower food miles and less energy-intensive growing methods
- **More flavourful:** Kids are more likely to eat produce that actually tastes good

NZ spring (September to November) brings a wonderful transition from winter root vegetables to lighter, brighter produce.

---

## What's in Season in NZ Spring

**Vegetables:**
- Asparagus (September-November) — NZ-grown asparagus is world-class
- New potatoes (October onwards)
- Spring onions
- Peas and snow peas
- Baby spinach (year-round but thrives in spring)
- Lettuce and salad greens
- Radishes
- Broad beans

**Fruit:**
- Strawberries (October-November, early season)
- Kiwifruit (Zespri gold, late season)
- Citrus (mandarins winding down, oranges still going)
- Apples (NZ-stored from autumn harvest, still good quality)

**What to avoid in spring (expensive because they're off-season):**
- Stone fruit (not until December)
- Berries other than strawberries (not until summer)
- Capsicums (expensive until mid-spring)
- Tomatoes (still pricey until November)

---

## What Actually Happened to Prices Between May and September

Seasonal advice is easy to give and hard to check, so here is what our own tracking
shows. We price the same 20 lunchbox staples at Woolworths and record the regular
shelf price — not the weekly special — and these are the moves from our May round to
our latest round, read on ${WOOLIES_ROUND()}:

| Item | May | ${ROUND_MONTH()} | Change |
|---|---|---|---|
${mayToNowTable()}

Two rows are missing from that table, and it is worth saying why rather than quietly
dropping them. Apples were in it at −1% until we changed what the apples row measures:
the index tracked loose Royal Gala, Pak'nSave Ormiston does not sell Royal Gala loose,
and the row could never be compared across the two stores. It now tracks Granny Smith,
which both sell by the kilo. Cheese is out for a blunter reason — the May figure looks
like a supermarket own-brand block and the September one is Mainland, so the +6% it would
have shown is a change of brand, not a change in the price of cheese.

That points at a real limit of the older half of this table. **We only started pinning
each row to a specific product on 30 July 2026.** The May round was walked in store
against the same written specs — 500g of butter, a 185g can of tuna, a dozen eggs — but
the exact brand behind each line was not recorded at the time. Tight specs make a
brand swap unlikely on most rows, and the overall direction here is broad enough to
survive a wobble on any single one. An individual percentage from before that date is
worth less than the pattern it sits in, and we would rather say so than let the table
imply a precision it does not have. Everything from 30 July on is pinned by product
code, so the same problem cannot recur.

The pattern is not subtle: **the vegetables held steady or fell while most of the protein and dairy
rose sharply.** ${springMoversSentence()}

That changes what "eat seasonally to save money" actually means in practice. The saving
is real on the produce side, and it is being swallowed on the dairy and protein side —
so the spring swap that helps most is the one that leans on cheap in-season vegetables
*without* adding an expensive protein alongside it.

Full basket, both stores, with dates: [NZ Lunchbox Price Index](/en/price-index).

## Spring Lunchbox Idea 1: Asparagus & Cheese Tarts

**Ingredients (makes 6 small tarts):**
- 1 sheet frozen puff pastry (~$1.00)
- 6 asparagus spears, trimmed and halved (~$1.50 for a small bunch)
- 1/2 cup grated cheese (~$0.75)
- 1 egg (~$0.40)
- 2 tbsp cream or milk (~$0.10)

**Total: ~$3.75 | Per tart: ~$0.63**

**Method:**
1. Cut pastry into 6 rectangles. Place on a lined tray.
2. Score a 1cm border around each rectangle (don't cut through).
3. Whisk egg and cream. Pour a little inside each border.
4. Lay asparagus pieces inside. Sprinkle with cheese.
5. Bake at 200C for 15-18 minutes until golden and puffed.
6. Cool. These freeze well for up to 2 months.

NZ asparagus season is short (roughly 8-10 weeks), so make the most of it. Waikato and Manawatu produce some of the best asparagus in the country.

---

## Spring Lunchbox Idea 2: New Potato Salad

**Ingredients (makes 3-4 lunchbox serves):**
- 500g new potatoes (~$2.50)
- 2 spring onions, sliced (~$0.30)
- 2 tbsp mayo (~$0.20)
- 1 tbsp wholegrain mustard (~$0.15)
- Handful of fresh parsley (~$0.30)
- Salt and pepper

**Total: ~$3.45 | Per serve: ~$0.86**

Boil new potatoes until tender (about 15 minutes). Cut in half. Toss with spring onion, mayo, mustard, and parsley while still warm (they absorb the dressing better). Cool and portion.

NZ new potatoes in spring are so creamy and flavourful they barely need seasoning. Pair with some sliced ham or chicken for a complete lunchbox meal.

---

## Spring Lunchbox Idea 3: Strawberry & Cream Cheese Wraps

**Ingredients per wrap:**
- 1 flour tortilla (~$0.40)
- 2 tbsp cream cheese (~$0.30)
- 4-5 strawberries, sliced (~$0.50)
- Drizzle of honey (~$0.05)

**Total: ~$1.25**

This sweet wrap is a spring treat. Spread cream cheese on the tortilla, layer sliced strawberries, drizzle with honey, and roll. Cut in half. Kids love the combination of creamy and fruity.

**Buying tip:** Early-season NZ strawberries (September-October) are more expensive — around $5-$6 per punnet at Woolworths. By late October/November, prices drop to $3-$4. The sweetest strawberries come from Hawke's Bay and Auckland regions.

---

## Spring Lunchbox Idea 4: Pea & Mint Rice Salad

**Ingredients (makes 3 serves):**
- 2 cups cooked rice (~$0.30)
- 1 cup frozen peas, thawed (~$0.50)
- Fresh mint leaves, chopped (~$0.30)
- 1 tbsp olive oil (~$0.10)
- Juice of 1/2 lemon (~$0.20)
- 30g feta, crumbled (~$0.60)

**Total: ~$2.00 | Per serve: ~$0.67**

Mix everything together while the rice is still slightly warm. The peas add sweetness and protein, the mint adds freshness (very spring), and the feta adds a salty tang. This holds well in a lunchbox all morning.

Frozen peas are one of the most underrated lunchbox ingredients. They're cheap, nutritious, sweet enough that most kids like them, and they thaw by themselves in the lunchbox by lunchtime (or thaw them in warm water for 2 minutes in the morning).

---

## Spring Lunchbox Idea 5: Snow Pea & Hummus Crunch Box

**Ingredients:**
- 15 snow peas (~$0.60)
- 2 tbsp hummus (~$0.40)
- Carrot sticks (~$0.15)
- 4 rice crackers (~$0.30)
- 1 kiwifruit (~$0.40)

**Total: ~$1.85**

Snow peas are a spring superstar. They're sweet, crunchy, and kids can eat them raw like chips. Most NZ kids who "don't eat vegetables" will happily munch raw snow peas — try it if you haven't already.

Available at both Woolworths and Pak'nSave, typically $4-$5 per 200g bag in spring (cheaper at Asian grocers, often $2-$3).

---

## Spring Produce Price Guide (NZ, September-November)

| Produce | Approx. Price | Best Value Month |
|---------|--------------|-----------------|
| Asparagus (bunch) | $3.00-$5.00 | October |
| Strawberries (punnet) | $3.00-$6.00 | November |
| New potatoes (kg) | $3.00-$4.50 | October-November |
| Snow peas (200g) | $4.00-$5.00 | October |
| Spring onions (bunch) | $2.00-$3.00 | Throughout spring |
| NZ apples (kg) | $3.00-$4.00 | Throughout spring |
| Kiwifruit (each) | $0.30-$0.60 | September (end of season) |
| Mandarins (kg) | $4.00-$5.00 | September (end of season) |

---

## Spring Baking: Using Seasonal Ingredients

Spring is a great time to update your Sunday baking rotation with seasonal produce:

**Strawberry Muffins (Makes 12, ~$0.35 each):**
- 2 cups self-raising flour
- 1/2 cup sugar
- 1 egg
- 3/4 cup milk
- 1/4 cup oil
- 1 cup chopped NZ strawberries

Mix dry, mix wet, combine gently, fold in strawberries. Bake 180C for 20 minutes. Freeze extras.

**Asparagus & Feta Scrolls (Makes 10, ~$0.45 each):**
- 2 cups self-raising flour + 1/2 cup milk + 30g butter = quick dough
- Roll out, spread with cream cheese, lay asparagus spears and crumbled feta
- Roll up, slice, bake at 200C for 15 minutes

These make use of the short asparagus season (just 8-10 weeks) and freeze well for 2 months.

---

## Spring Lunchbox Weekly Plan

| Day | Main | Seasonal Highlight | Cost |
|-----|------|--------------------|------|
| Mon | Asparagus & cheese tart + ham | NZ asparagus | $1.80 |
| Tue | New potato salad + chicken | New potatoes, spring onion | $1.60 |
| Wed | Strawberry cream cheese wrap + cheese sticks | NZ strawberries | $1.75 |
| Thu | Pea & mint rice salad + crackers | Fresh peas, mint | $1.40 |
| Fri | Snow pea crunch box + hummus | Snow peas | $1.85 |

**Weekly total: ~$8.40** for the mains in the table — see the note below for what a complete box costs.

> **Note, July 2026.** These per-day figures came from an earlier costing model we've since found unreliable, so read them as indicative. Seasonal produce genuinely does bring a box down, but a full lunchbox including a fruit and a second snack has a median of about **${boxMedianLabel()}** across our menu set on current numbers. The [free planner](/en/planner) costs a week on live prices.

---

## Where to Find the Best Spring Produce in NZ

**Supermarkets:** Woolworths and Pak'nSave both stock NZ-grown asparagus, strawberries, and snow peas in spring. Prices tend to be highest in early September and drop as the season progresses into October and November.

**Farmers' markets:** Often the best value for spring produce. Asparagus from Waikato or Manawatu growers is frequently cheaper and fresher than supermarket stock. Strawberry growers from Hawke's Bay and Auckland often sell punnets at market for $3-$4 — compared to $5-$6 at Woolworths.

**Pick-your-own:** Several NZ regions offer pick-your-own strawberry farms (especially Auckland, Waikato, and Hawke's Bay). A family outing that also stocks the lunchbox at wholesale prices — often $8-$12 per kg, with the fun factor included.

**The garden:** Spring is planting season. A single strawberry plant (~$5 from Mitre 10) produces fruit from October through March. Snow peas grow easily from seed and produce prolifically within 8-10 weeks of planting.

---

## Transitioning from Winter to Spring Lunchboxes

Spring in NZ is unpredictable — September can still feel like winter, while November can be genuinely warm. Adjust your lunchbox strategy:

**Early spring (September):** Continue with thermos soups and warm options. Citrus is still available and cheap. Start introducing early-season snow peas and asparagus as they appear.

**Mid spring (October):** Transition to a mix of warm and cold options. Pack an ice pack on warmer days. Strawberries start appearing but are premium-priced — wait for prices to drop.

**Late spring (November):** Shift fully to cold lunchbox strategies. Strawberries are now affordable. Salads, wraps, and fresh fruit take centre stage. Remember ice packs — November days can hit 22-25C.

Throughout spring, keep an eye on your local Woolworths and Pak'nSave weekly specials — as NZ-grown produce comes into season, supermarkets often run promotional pricing that makes seasonal items even cheaper than usual. The Woolworths app and Pak'nSave website both list current specials. Some Woolworths specials are Everyday Rewards member prices, so check whether a deal needs the card before you count on it.

---

## Spring Gardening for NZ Lunchboxes

Spring is the ideal planting season in New Zealand. Even a small garden bed or a few pots on a balcony can produce lunchbox ingredients:

**Plant now for Term 4 lunchboxes:**
- **Cherry tomato seedlings** (from Mitre 10 or Bunnings, ~$5 each) — plant in September, harvest from December. One plant produces hundreds of tomatoes over summer.
- **Snow pea seeds** (~$4 per packet) — sow directly into soil in September. Harvest in 8-10 weeks. Kids love picking and eating them straight from the plant.
- **Lettuce seedlings** — plant every 3 weeks for continuous supply. A $3 punnet of seedlings produces salad for months.
- **Strawberry plants** (~$5 each from garden centres) — plant in September, harvest from October through March. A dozen plants produce enough for daily lunchbox strawberries through summer.

**The NZ school garden connection:** If your school has a Garden to Table programme, spring is when planting happens. Encourage your child to participate — children who grow food are more likely to eat it. Some schools send surplus garden produce home with students, which is a free source of lunchbox vegetables.

---

## Spring Food Safety Considerations

Spring in NZ is unpredictable — temperatures can swing from 12C to 25C in a single week. This affects lunchbox food safety:

**September (still cool):** Thermos soups are still appropriate. Ice packs may not be necessary on cool days, but keep one in the bag for unexpected warm spells.

**October (warming up):** Start using ice packs regularly. Dairy items (cheese, yoghurt) need cold storage. The transition month means packing for variable conditions — include both a thermos option and cold items, letting your child choose based on the day's temperature.

**November (approaching summer):** Full summer food safety mode. Ice packs are essential every day. Avoid mayo-based fillings on days forecast above 25C. A frozen water bottle serves double duty — keeping food cold and providing a refreshing drink by lunchtime.

New Zealand Food Safety puts the danger zone at 5°C to 60°C and says food should not sit in it for more than four hours. On a warm November day, a lunchbox packed at 8am without an ice pack is well inside that zone by 10am — and the clock has been running since it left the fridge, not since the bell went.

---

## Plan Seasonal Lunchboxes

The [Kiwi Lunchbox Planner](/en/planner) does not know what month it is — it has no seasonal logic, so it will not steer you to asparagus in October. The seasonal choices in this article are yours to make. What it can do: type something already in your fridge into **Fridge Leftovers** and it will favour menus that use it, and every box is costed on the Woolworths prices we read each week.

[Try the planner →](/en/planner)
`,
  },
  "back-to-school-lunchbox-prep-nz": {
    title: "Back-to-School Lunchbox Prep: NZ Term 1 Guide",
    excerpt:
      "Term 1 starts in late January, in summer heat. A complete guide to preparing for the NZ school lunchbox season — gear, planning and first-week recipes.",
    date: "April 8, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-29",
    image: "/assets/kiwi_roast_beef_roll.webp",
    category: "Seasonal",
    author: "Yong Jae Lee",
    staticPrices: true,
    body: `
NZ school terms kick off late January or early February, around Waitangi Day. Here's the honest truth about our mornings: packing the lunch itself is quick — it's *deciding what to pack* that eats the time. I still spend about 30 minutes most mornings, and almost all of it is standing at the bench running through options. That daily decision is the single biggest reason the first weeks back feel harder than they should, so my whole back-to-school routine is built around removing choices in advance: I check whether last year's container is still big enough, restock the staples I know I'll lean on, and rough out a week of menus before Monday so I'm not starting from a blank page at 7am. (It's also, honestly, the reason I ended up building the planner in the first place.)

---

## Term 1: The Fresh Start

The NZ school year begins in late January or early February. Term 1 runs through summer and into autumn (roughly late January to mid-April), which means your lunchbox strategy needs to account for hot days, end-of-summer produce, and the transition to cooler weather. (Our [school lunchbox food safety guide](/en/guides/lunchbox-food-safety-guide-nz) covers keeping perishables safe through the summer-heat months.)

Whether your child is starting school for the first time or returning for another year, the first week sets the tone. A little preparation before term starts makes the difference between calm mornings and daily chaos.

---

## The Pre-Term Checklist

**Two weeks before term starts:**

- [ ] Check existing lunchbox and drink bottle — do they still work? Are seals intact?
- [ ] If buying new gear, get it now (stock sells out fast in January)
- [ ] Check ice packs — do they still freeze solid? Replace if cracked or leaking
- [ ] Clear out and clean the freezer — make room for batch cooking
- [ ] Check pantry staples — restock bread, crackers, canned goods, pasta, rice

**One week before:**

- [ ] Plan the first week's lunches (5 days)
- [ ] Do a lunchbox-specific grocery shop
- [ ] Sunday batch cook: bake muffins, prep vegetable sticks, cook rice/pasta
- [ ] Involve your child — let them choose 2-3 options for the week

**Night before Day 1:**

- [ ] Pack the lunchbox completely (first day nerves affect everyone, including parents)
- [ ] Freeze the water bottle
- [ ] Put ice packs in the freezer
- [ ] Set out lunchbox, bag, and hat together

---

## How Much of the Week You Can Actually Do in Advance

The deciding is the slow part, so it helps to know how much of the menu can be moved off
the morning entirely. Across our ${MENU_COUNT} lunchbox menus:

| Prep style | Menus | What it means for your morning |
|---|---|---|
| **Make-ahead** | ${MAKE_AHEAD_COUNT} | Cook or assemble on Sunday, pack cold |
| **No-cook** | ${NO_COOK_COUNT} | Assembled in the moment, no stove at all |
| **Cook-fresh** | ${COOK_FRESH_COUNT} | Needs cooking the same day |
| *of which thermos-friendly* | *${THERMOS_COUNT}* | *Cooked and sent hot in a flask* |

**${pctWord(AHEAD_OR_NOCOOK_PCT)} percent of the menu set never needs a hot pan on a school morning.** Half of it
can be made the day before. That is the number worth planning around — not a list of
recipes, but the fact that most of the week can be decided and prepared once.

On cost, a complete lunchbox from our menu set — a main, a fruit and a second snack —
currently works out at a median of about **${boxMedianLabel()}**, ranging from roughly
${boxFloorLabel()} to ${boxCeilingLabel()} depending on the main. ${boxUnderCount(3)} of the
${MENU_COUNT} come in under $3. The prices behind those
figures are in the [price index](/en/price-index); the [free planner](/en/planner) will
cost a week on whatever is on special right now.

## Essential Gear for NZ Schools

**Lunchbox:** The Yumbox, Bentgo, and Sistema brands are all widely available in NZ. Compartmented lunchboxes are ideal because they prevent food items from touching and getting soggy.

| Brand | Price Range | Where to Buy | Best For |
|-------|-----------|-------------|----------|
| Sistema Bento | $10-$18 | Woolworths, The Warehouse | Budget-friendly |
| Yumbox Original | $35-$45 | Farmers, online | Portion control, no leak |
| Bentgo Kids | $30-$40 | Online NZ stores | Sturdy, good compartments |
| Fridge-to-Go | $25-$35 | Farmers, Briscoes | Built-in cooling |

**Water bottle:** Stainless steel insulated bottles keep water cold all day. Frank Green, Cheeki, and 360 Degrees are popular NZ choices ($25-$40). BPA-free plastic bottles from Sistema are fine too ($8-$12).

**Insulated bag:** Essential for Term 1 (summer heat). A PackIt or Sistema insulated bag ($15-$40) keeps food safe — see our [comparison of five insulated lunch bags in NZ](/en/blog/insulated-lunch-bags-review-nz) for which type suits your child's lunchbox and budget.

**Extras:**
- Small sauce containers for dips (~$5 for a set at Woolworths)
- Beeswax wraps or reusable sandwich bags (~$12-$20)
- A small thermos for soup (for when autumn hits in March)

---

## First Week Lunch Plan

Keep it simple for the first week. Don't try anything too adventurous — stick to foods your child already likes and eats reliably. [Here is what our own first week actually looked like](/en/blog/term-1-first-week-lunchbox-routine-auckland-parent), day by day.

**Monday — The Safe Start**
- Ham and cheese sandwich on wholemeal bread
- Carrot and cucumber sticks
- Apple slices
- 2 Anzac biscuits
- Frozen water bottle

**Tuesday — Something Different**
- Chicken and salad wrap
- Cherry tomatoes
- Banana
- Cheese and crackers
- Ice pack

**Wednesday — Leftovers Win**
- Last night's pasta in a container
- Capsicum strips
- Mandarin
- Homemade muffin
- Ice pack

**Thursday — Fun Format**
- Sushi rolls (homemade or store-bought)
- Edamame or carrot sticks
- Kiwifruit
- Bliss ball
- Ice pack

**Friday — Treat Day**
- Pizza scrolls (homemade from the freezer)
- Cucumber sticks
- Grapes
- Yoghurt tube (frozen, doubles as ice pack)

---

## Navigating School Policies

Every NZ school has its own food policy. Before term starts, check:

**Nut policy:** Many NZ primary schools have a nut policy, and the words mean different things. **Nut-free** usually means no peanut butter, no tree nuts, no Nutella. **Nut-aware** usually means nuts are discouraged but not banned. Our [nut-free guide](/en/blog/nut-free-school-lunches-new-zealand) sets out the levels; ask the school office or check the newsletter for which one yours uses.

**Wrapper-free/nude food policy:** Some NZ schools encourage or require "nude food" — lunches without packaging waste. This means reusable containers instead of cling wrap, and no individually packaged snack items. (Our [healthy school snacks guide](/en/guides/healthy-snacks-guide-nz) has plenty of nude-food-friendly options.)

**Birthday treats:** Some schools allow birthday food to be shared, others don't. Check the policy before sending cupcakes.

**Water only:** Many NZ schools ask for water as the only drink in the lunchbox — no juice boxes, no flavoured water, no cordial. Check your school's policy, and invest in a good water bottle either way.

---

## Dealing with the Heat in Term 1

Term 1 runs through the hottest months of the NZ school year. Key strategies:

- **Always use ice packs** in January, February, and March
- **Choose heat-stable mains** on days forecast above 28C
- **Freeze the water bottle** — it doubles as an ice pack
- **Pack fruit that doesn't brown easily** — mandarins, bananas (in skin), grapes, kiwifruit
- **Avoid mayo-based fillings** on the hottest days — use hummus or pesto instead

---

## For New Entrants (5-Year-Olds Starting School)

If your child is starting school for the first time, lunchbox tips are different:

- **Practice at home first.** Pack a lunchbox and let your child eat from it at home a few times before school starts. They need to learn how to open containers, unwrap items, and manage the lunchbox independently.
- **Keep it simple.** Small hands struggle with complicated packaging. Use easy-open containers.
- **Pack less than you think.** New entrants often eat very little at school due to excitement and distraction. A small, manageable lunch is better than an overwhelming one.
- **Include familiar favourites.** Now is not the time to introduce new foods. Pack what they know and love.
- **Label everything.** Lunchboxes, water bottles, ice packs — all with your child's name. Use a permanent marker or purchased labels.

---

## The Ongoing Routine

After the first week, establish a routine:

- **Saturday:** Check what's in the fridge and pantry. Plan next week's lunches.
- **Sunday:** Batch cook if needed. Prep vegetables. Bake if you're motivated.
- **Sunday night:** Pack Monday's lunchbox.
- **Mon-Fri 7:45am:** Assemble from pre-prepared components (5 minutes).

The routine gets easier every week. By Term 2, it'll be second nature.

---

## Budget Planning for the School Year

Before term starts, it is worth planning your lunchbox budget for the year:

**Weekly lunchbox cost (per child, on the Woolworths prices behind the planner):**

| Week | Weekly cost | Over ${BUDGET_WEEKS} school weeks |
|----------|-----------|----------------------|
| Five of our cheapest boxes ([how they are chosen](/en/guides/budget-lunchbox-planning-guide-nz)) | ${budgetWeekTotalLabel()} | ${bigMoney(Number(budgetWeekTotalLabel().slice(1)) * BUDGET_WEEKS)} |
| Five boxes at the median of our menu set | ${boxWeekLabel()} | ${bigMoney(Number(boxWeekLabel().slice(1)) * BUDGET_WEEKS)} |

Both rows are generated from the same prices as the rest of this page, so they move when the shelf does. This table used to quote a "budget" week of $8–$12 "at Pak'nSave prices", typed by hand and never re-checked against a shelf, alongside mid-range and convenience weeks we have never measured. Those rows are gone.

**Tips for keeping costs down in Term 1:**
- Summer fruit is at its cheapest (stone fruit, berries, grapes) — take advantage before prices rise in autumn
- Buy a whole watermelon ($5-$8 at Pak'nSave) — it lasts a week of lunchboxes and kids love it
- Roast a whole chicken on Sunday (~$7.50 at Pak'nSave) for wraps and sandwiches all week

---

## Allergen Awareness: The Term 1 Conversation

The start of the school year is when allergen management is most critical. New students may join the class with allergies that affect the entire room.

**Steps for every parent (not just allergy families):**
1. Check the class newsletter for any allergy notifications
2. Ask the teacher: "Are there any food allergies I should know about in our class?"
3. If the class is nut-free, understand what that means — no peanut butter, no tree nuts, no "may contain" products
4. Teach your child not to share food at school, even with friends
5. If your child has an allergy, ensure the action plan and medications are up to date

Many NZ parents are surprised to learn that their child's class has become nut-free or egg-aware due to a new student. Being proactive at the start of term prevents accidental exposure.

---

## Essential Apps and Resources for NZ School Parents

**Skool Loop or Hero app:** Most NZ schools use a parent communication app. Download it before term starts — school policy updates, including lunchbox guidelines, are often communicated through these apps.

**Woolworths app:** Save a "lunchbox staples" shopping list. Weekly specials change every Monday.

**Love Food Hate Waste NZ (lovefoodhatewaste.co.nz):** Free tips on reducing lunchbox food waste and using leftovers creatively.

**Allergy New Zealand (allergy.org.nz):** Free downloadable school allergy action plan templates, allergen guides, and parent support resources.

**Kiwi Lunchbox Planner (kiwilunchbox.co.nz):** Generates a five-day lunch plan with allergy and diet filters, an estimated cost for every box from the Woolworths prices we read each week, and a shopping list. There is no budget setting, and it does not remember your filters between visits — tick them each time you plan.

---

## NZ School Stationery and Lunchbox Shopping Timeline

Timing your back-to-school shopping makes a significant difference to both availability and price:

**November-December (before the holidays):** Lunchbox gear (Sistema, Yumbox) starts appearing in stores. Selection is at its widest. Briscoes runs sales frequently, including in late November — the best time to buy premium insulated lunch bags (PackIt, Fridge-to-Go) at discounted prices.

**Early January:** Peak back-to-school shopping season. Woolworths, The Warehouse, and Kmart all stock lunchbox essentials. Competition between retailers means prices are competitive, but popular items (specific Yumbox colours, PackIt designs) sell out quickly.

**Late January (week before term):** Last chance shopping. You will find what you need, but the popular items may be gone. Pak'nSave runs back-to-school specials on food staples — stock up on non-perishable lunchbox items (canned tuna, pasta, rice, crackers) during these promotions.

**Where to buy lunchbox gear in NZ:**

| Item | Best Value | Premium Option |
|------|-----------|---------------|
| Lunchbox | Sistema Bento ($10-$18, Woolworths) | Yumbox ($35-$45, Farmers) |
| Water bottle | Sistema Hydrate ($8-$12, Woolworths) | Frank Green ($35-$45, Farmers) |
| Insulated bag | Sistema ($15-$20, Woolworths) | PackIt ($35-$45, Briscoes on sale) |
| Ice packs | Komax 2-pack ($6, Woolworths) | Built into PackIt bag |
| Small containers | Sistema sauce pots ($6/set, Woolworths) | Stainless steel ($15-$25, online) |

---

## Preparing Your Child Emotionally for Lunchbox Independence

For children starting school (New Entrants) or transitioning to a new school, the lunchbox is more than just food — it is a source of comfort and routine in an unfamiliar environment.

**Practice runs:** In the two weeks before school starts, pack a "school lunchbox" and have your child eat from it at home. This familiarises them with opening containers, unwrapping items, and managing the lunchbox independently. Many new entrants struggle with clip-lock containers on their first day — practice eliminates this stress.

**Familiar foods first:** The first week of school is not the time to introduce new foods. Pack your child's absolute favourites — the foods they will definitely eat, even if they are not the most nutritionally diverse. Comfort and familiarity matter more than perfect nutrition during the adjustment period.

**Include a note:** Many NZ parents tuck a small note or drawing into their child's lunchbox, especially in the first weeks of school. A simple "I love you" or a drawn smiley face can provide reassurance at lunchtime for children feeling overwhelmed by the new environment.

---

## Plan Your Term with the Planner

The [Kiwi Lunchbox Planner](/en/planner) generates a five-day plan from our ${MENU_COUNT} menus, balanced across categories, with the allergy, diet and morning-effort filters you tick and a costed shopping list. It does not adjust for your child's age or the season — portion size and what is cheap this month are still your call.

[Try the planner →](/en/planner)
`,
  },
  "insulated-lunch-bags-review-nz": {
    title: "Best Insulated Lunch Bags in NZ (2026): 5 Compared",
    excerpt:
      "NZ insulated lunch bags compared — PackIt, Sistema, Fridge-to-Go, Kmart and Bentgo. What actually keeps food cold, and where to buy. Not a lab test.",
    date: "April 13, 2026",
    lastReviewed: "August 2026",
    contentUpdated: "2026-09-29",
    image: "/assets/real-kmart-lunchbag-shelf.webp",
    imageCaption:
      "The lunch bag aisle at Kmart Botany, photographed 18 August 2026. Every price in the shelf section below was read off these tags, not from a website. Photographed by the operator, not a stock image.",
    category: "Gear & Tips",
    author: "Yong Jae Lee",
    staticPrices: true,
    body: `
An insulated lunch bag is one of those purchases where the marketing ("keeps food cold all day!") runs well ahead of what a $10 bag actually manages in a warm Auckland classroom. I don't personally rely on an insulated bag — I pack my daughter's lunch around a frozen drink bottle as the cold source — but the question of which one to buy comes up constantly, so this is a plain buying guide: the main types you'll find in NZ, what actually keeps food cold, and what to look for before you pay.

The thing that matters most isn't the brand on the label. It's whether the bag fits a flat ice pack or a frozen bottle, a yoghurt, and the lunchbox all at once without squashing everything — and whether the zip and lining survive a year of being shoved into a school cubby.

---

## Why an Insulated Lunch Bag Matters

A standard plastic lunchbox sitting in a school bag provides virtually zero insulation — left in a warm room it drifts toward the temperature of that room, and on a Term 1 afternoon that room is well above 5°C. That puts perishable foods like dairy, meat, and eggs firmly in the bacterial "danger zone" (5–60°C).

An insulated bag with a cold source in it keeps food meaningfully cooler than the bag around it — enough to matter by lunchtime. **I have not measured that gap and I am not going to quote a number for it**, because the figures that circulate come from manufacturer copy rather than from any test with a stated method, bag, ice pack and ambient temperature. What I can say is what the cold source does: it is the cold source doing the work, not the fabric. Which foods are actually at risk, and which sail through a warm classroom untouched, is set out in our [lunchbox food safety guide](/en/guides/lunchbox-food-safety-guide-nz) — the bag matters much less if what's inside doesn't need chilling in the first place.

How well any bag holds that depends far more on its design — and on whether you add a cold source — than on the brand name. Below are the five types you'll actually see on NZ shelves, what each is good and bad at, and roughly what they cost, so you can match one to your child's lunchbox and your budget.

---

## Putting the Price in Context

On our tracked prices a complete lunchbox runs a median of about ${boxMedianLabel()} a day,
so five days is about ${boxWeekLabel()} — inside the $10-$22 range of the bags on the Kmart shelf
below. The difference is that lunches are bought every week and a bag is not.

That is the honest way to think about the spend: not "is $20 a lot for a bag" but "is it
worth about one week of lunches to give the cold source somewhere to work." The
prices behind that ${boxMedianLabel()} median are in our [price index](/en/price-index).

## Product 1: PackIt Freezable Lunch Bag

**Price:** $35-$45 | **Where to buy:** Woolworths, Farmers (Briscoes stocks PackIt but had no lunch bag in stock when I last checked — see the stock check below)

**How it works:** The entire bag is lined with freezable gel. You freeze the whole bag overnight, then pack food into it in the morning. No separate ice pack needed (though you can add one for extra cooling).

**Best for:** Families who can remember to freeze it overnight and want the cold source built into the bag rather than packed separately. The trade-off is the pre-freeze step, and it's bulkier and pricier than a basic bag. I have not measured how long it stays cold.

**Pros:**
- No separate ice pack needed
- Folds flat when not frozen (storage friendly)
- Comes in kid-friendly designs

**Cons:**
- Must remember to freeze the night before
- Slightly heavier when frozen
- More expensive than basic bags
- Limited sizes for larger lunchboxes

---

## Product 2: Sistema Insulated Lunch Bag

**Price:** $15-$22 | **Where to buy:** Woolworths, Farmers (The Warehouse doesn't currently list one online — see the stock check below)

**How it works:** Traditional insulated bag with foam padding and a thermal lining. Requires a separate ice pack.

**Best for:** The default, do-everything pick for most NZ families — affordable, easy to find, and fits standard lunchboxes. It needs a cold source of its own; how long that keeps food out of the danger zone is not something I have measured, and the four-hour rule applies to this bag exactly as it applies to any other.

**Pros:**
- Affordable
- Fits most NZ lunchbox brands (Sistema, Yumbox)
- Machine washable
- Widely available

**Cons:**
- Needs separate ice pack (not included)
- Zippers can be stiff for young children

---

## Product 3: Fridge-to-Go Medium Lunch Bag

**Price:** $28-$38 | **Where to buy:** Farmers, selected Woolworths stores, online

**How it works:** Insulated bag with a removable, rechargeable ice panel (instead of a standard ice pack). The ice panel sits in the lid of the bag.

**Best for:** Parents who keep forgetting a loose ice pack. The rechargeable panel sits in the lid and covers the whole top of the bag, so the cooling is built in — a genuinely good design idea. The trade-offs are weight, a higher price, and narrower availability than Sistema.

**Pros:**
- Built-in ice panel (no separate ice pack to remember)
- Good size range
- Well-made construction

**Cons:**
- Mid-to-high price range
- Ice panel adds weight
- Less widely available than Sistema

---

## Product 4: Kmart Basic Insulated Bag

**Price:** $10-$22 in store (read off the shelf at Kmart Botany, 18 August 2026) | **Where to buy:** Kmart

**How it works:** Budget insulated bag with thin foam lining. Requires a separate ice pack.

**Best for:** A tight budget, a New Entrant with a light lunch, or a spare/backup bag. The insulation is thin, so on a hot day it leans on whatever cold source you put in it — make that generous. Cheap enough that it's no disaster if it goes missing in Term 1.

**Pros:**
- Very affordable
- Lightweight
- Good for younger children with lighter lunchboxes
- Wide range of designs

**Cons:**
- Thin insulation
- Needs a generous cold source on hot days

---

## Product 5: Bentgo Insulated Sleeve

**Price:** $22-$28 | **Where to buy:** Online NZ stores (Mighty Ape, Amazon NZ)

**How it works:** Designed specifically to fit Bentgo lunchboxes. Neoprene-style insulated sleeve with a zippered closure.

**Best for:** Anyone who already owns a Bentgo box. The snug, purpose-made fit means less dead air space, but it only fits Bentgo boxes and is online-only in NZ.

**Pros:**
- Perfect fit for Bentgo boxes
- Easy-grip handle
- Compact design

**Cons:**
- Only fits Bentgo boxes
- Not available in NZ physical stores (online only)
- Limited design options

---

## What's Actually on the Shelf (Kmart Botany, 18 August 2026)

Prices and ranges move, and mid-winter is the low point of the NZ lunch-bag year: the back-to-school range thins out from about May and rebuilds from November.

I stood in the aisle at **Kmart Botany on 18 August 2026** and read the tags. The photo at the top of this page is that shelf. Here is what was actually there:

| What it is | Ticket price |
|---|---|
| Camo Cold Box | $10 |
| Black Expandable Cold Box | $12 |
| Character lunch bags (Harry Potter, Pikachu, unicorn, dinosaur) | $12-$18 |
| Gingham / bow print insulated bags | $14 |
| Twin Handle Bow Lunch Bag | $18 |
| Check Extra Large Insulated Lunch Bag | $20 |
| Harry Potter Twin Compartment Lunch Bag | $22 |

So the everyday range in store is **$10-$22**, and the bulk of it sits at $12-$18.

⚠️ **A correction to what this article said before.** Checking Kmart's website in late July, I wrote that the range ran $14-$22 with clearance stock at $4.25-$7, and concluded that the "$8-$12 Kmart basic" figure quoted around the web no longer matched the shelf. Standing in the aisle three weeks later, that was wrong on both counts: the winter clearance has ended (the Camo Cold Box is back to its normal $10, not the $5 it was marked down to), and there are still plenty of basics at $10-$12. **The website listing and the shelf are not the same thing, and the shelf is what you actually pay.**

**The Warehouse** lists only three insulated lunch bags of its own — everything else in its search results comes from third-party Marketplace sellers, which ship separately and vary a lot in quality. Its own Living & Co Expandable Insulated Lunch Bag was **$13.98 on clearance**. Worth knowing: it does **not** currently list a Sistema insulated lunch bag online, so don't make a special trip for one.

**Briscoes** had **no PackIt lunch bag in stock at all** — the only PackIt item listed was a wine bag at $59.99. If you want a PackIt, try Woolworths or Farmers, or wait for the spring restock.

The practical takeaway: clearance prices do not last — the $5 Camo Cold Box of late July was back to $10 by 18 August — so trust the ticket in front of you rather than a month you read about. If you want a particular brand, or a full range to choose from, the range rebuilds from November.

---

## Quick Picks by Situation

**If you keep forgetting the ice pack:** a freezable gel bag like the PackIt — the whole bag is the cold source, so there's no separate ice pack to forget. Just remember to freeze it overnight.

**Best all-rounder for most families:** a Sistema-style foam bag. At $15–$22 it fits standard NZ lunchboxes, is sold everywhere, and does the job once you add a frozen drink bottle or a cheap ice pack.

**On the tightest budget:** a Kmart or Warehouse basic bag plus a generous cold source — the $10 bags on the Kmart shelf above are enough to carry one.

---

## Tips for Any Insulated Bag

- **Pre-chill the bag** by putting it in the fridge (or freezer, if applicable) overnight
- **Pack food cold** — cold food straight from the fridge stays cold longer
- **Minimise opening** — every time the bag is opened, warm air enters
- **Fill dead space** — a full bag stays colder than a half-empty one

---

## What Tends to Matter Most

Two things hold regardless of brand or price — neither needs a test to see:

**A built-in or freezable cold source is one less thing to remember.** Whether it's a freezable gel bag or a built-in ice panel, the designs that don't depend on a loose ice pack remove the most common way a lunch goes out with no cold source at all.

**The cold source matters more than the bag.** Almost any decent bag copes if there's a frozen drink bottle inside; almost none cope if there isn't.

---

## Maintaining Your Insulated Lunch Bag

A few habits that keep a bag clean and usable:

**Weekly cleaning:** Turn the bag inside out and wipe the interior with a damp cloth and mild dish soap. For stubborn food residue, use a baking soda paste (2 tbsp baking soda + 1 tbsp water). Rinse with a damp cloth and leave open to air dry completely.

**Deep cleaning (monthly):** Most fabric insulated bags (Sistema, Bentgo) can be hand-washed in warm soapy water. PackIt bags should be wiped clean only — the freezable gel panels can be damaged by submersion. Check the manufacturer’s care instructions.

**Preventing odours:** The most common complaint about insulated lunch bags is lingering food odours. Prevention is better than cure: always remove all food and containers from the bag at the end of the school day. Leave the bag open overnight to air out. If odours develop, place an open box of baking soda inside the bag overnight.

**Storage between terms:** During school holidays, clean the bag thoroughly, dry completely, and store with the zipper open in a cool, dry place. PackIt is the exception: its maker suggests keeping the bag in the freezer so it is frozen and ready when you need it.

---

## Insulated Bag vs. Insulated Lunchbox: Which Is Better?

Some products combine the lunchbox and insulation into one unit. Here’s how they differ in the ways you can see without a thermometer:

| Feature | Insulated Bag + Separate Lunchbox | All-in-One Insulated Lunchbox |
|---------|-----------------------------------|-------------------------------|
| Flexibility | Can use different lunchboxes | Locked to one container |
| Cleaning | Wash separately | One item to clean |
| Examples | PackIt + Yumbox, Sistema bag + Sistema box | Thermos branded boxes |

**My take:** A separate insulated bag and lunchbox gives you more flexibility, and every bag in this article — the Fridge-to-Go included — is that kind. If your child prefers carrying one item, an all-in-one is simpler. I have not compared how well the two keep food cold, so I do not rank them on it.

---

## Where to Buy: NZ Retailers Compared

| Retailer | Brands Available | Price Range | Notes |
|----------|-----------------|-------------|-------|
| Woolworths | Sistema, PackIt | $12-$45 | |
| The Warehouse | Living & Co, generic | $8-$25 | **No Sistema lunch bag listed online** when I checked |
| Briscoes | Fridge-to-Go | $25-$45 | Frequently discounted — **no PackIt lunch bag in stock** when I checked |
| Farmers | Yumbox, PackIt, Fridge-to-Go | $25-$50 | Premium brands, loyalty points |
| Kmart | Generic insulated bags | $10-$22 | Prices read in store 18 Aug 2026 |
| Mighty Ape (online) | Bentgo, PackIt, various | $20-$50 | Good range, fast NZ shipping |

**Pro tip:** Briscoes runs sales often enough that paying full price for an insulated bag is rarely necessary. We have not tracked how deep those discounts go, so check the ticket rather than trusting a rule of thumb.

---

## Plan Temperature-Safe Lunches

The [Kiwi Lunchbox Planner](/en/planner) does **not** do this part for you: it has no seasonal data and does not flag what needs chilling. What it does have is a thermos filter you can switch on yourself, and every menu tagged for how it is prepared. Which foods actually need a cold source is in the [lunchbox food safety guide](/en/guides/lunchbox-food-safety-guide-nz).

[Try the planner →](/en/planner)
`,
  },
  "lunchbox-food-safety-nz-term-1-heat": {
    title: "NZ Lunchbox Food Safety: A Term 1 Heat Guide Based on MPI Standards",
    seoTitle: "NZ Lunchbox Food Safety: Term 1 Heat Guide (MPI)",
    excerpt:
      "Auckland Term 1 afternoons hit 25–30°C. MPI food safety rules for lunchboxes — the danger zone, what spoils fastest, and the 2-hour rule.",
    date: "May 6, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-29",
    image: "/assets/real-packed-lunchbox-sandwich-yoghurt.jpg",
    imageCaption:
      "One of our actual lunchboxes from this term — seeded-bread sandwich, mandarin, cucumber sticks, and a small yoghurt drink that goes in straight from the fridge. Photographed at home by the operator.",
    category: "Food Safety",
    author: "Yong Jae Lee",
    body: `
The first week of Term 1, 2025, Auckland sat at 28°C every afternoon. I sent my daughter off with a ham and cheese sandwich, an apple, and a yoghurt pouch in her usual lunchbox. When the bag came home at 3:30pm, the yoghurt was warm to the touch and the sandwich had developed that slightly sour smell that means you should not eat it. I threw it out, and then I spent the next evening reading every Ministry for Primary Industries (MPI) food safety document I could find — because if I'm going to send food with my child for six hours, I want to know exactly which items are gambling with bacteria and which are safe.

This guide is the version of that research I wish I'd had before Term 1 started. Everything below is based on **MPI**, **NZ Food Safety**, and the **Heart Foundation** — not blogs, not opinion. Where I add personal practice, I label it as that.

Term 1 is when I get the most careful with dairy. Even after a normal shop around Ormiston, yoghurt and cheese can feel warm pretty quickly in the car — so I pack school lunches with the same mindset I use carrying groceries home: dairy goes in cold, with an ice pack, or it does not go in.

---

## Why Lunchbox Food Safety Matters More in NZ Than You Think

NZ Term 1 (late January – early April) and Term 4 (mid-October – mid-December) both fall in our warmest months. Auckland averages 23–25°C in February with peaks near 30°C, and Wellington and Christchurch are not far behind on summer days. Inside a school bag left in a classroom corner — or worse, hung outside on a hook — the lunchbox sits at whatever the room or the sun makes it. I have not measured that, so I give no figure for it; the outside temperature alone already puts it well inside the danger zone.

MPI's core principle is straightforward: **bacteria multiply fastest between 5°C and 60°C**. They call this the **"danger zone"**. Inside that range, bacteria in a moist, protein-rich food can multiply quickly — under ideal conditions some double in as little as 20 minutes. Real lunchboxes are rarely ideal, so I do not turn that into a count; the point is that time in the danger zone adds up, which is why the rules below are written in hours.

The lunchbox problem: most school days last 5–6 hours. A regular insulated bag with no ice pack will sit comfortably inside the danger zone for almost the entire day (the [insulated lunch bag guide](/en/blog/insulated-lunch-bags-review-nz) covers the bag types sold here and why an ice pack still matters). If your child eats lunch at 12:30pm — five hours after you packed it at 7:30am — and the food has been at 20–25°C the whole time, it has spent **five hours in the danger zone**, past the four-hour limit below before the box is even opened.

For a healthy adult, this is mostly an unpleasant outcome (stomach upset for a day). For young children, with smaller bodies and developing immune systems, even non-fatal food poisoning can mean dehydration, missed school, and a hospital visit. This is the YMYL ("your money or your life") angle that makes food safety worth treating seriously, not casually.

---

## The Three Rules MPI Wants Every Parent to Know

NZ Food Safety publishes consumer guidance on safe food handling at home, and the three rules that translate most directly to lunchboxes are:

### Rule 1: Keep cold food at 5°C or below

Anything dairy, meat, fish, or egg-based should leave home at or below 5°C and stay close to it. Practically, this means the food was in the fridge until you packed it, and it goes into a bag with at least one cold source (frozen drink bottle, ice pack, or both).

### Rule 2: Keep hot food at 60°C or above

If you pack a hot thermos meal (pasta, soup, fried rice), it must go in **steaming hot from the stove** and into a pre-warmed insulated container. Lukewarm leftovers are worse than fridge-cold leftovers, because lukewarm sits in the middle of the danger zone for the whole trip.

### Rule 3: The 2-hour rule, with a 1-hour heat clause

**New Zealand Food Safety's limit is four hours in the danger zone** — past that, food should be thrown out. Food Standards Australia New Zealand splits that window in two in its guidance for Australian food businesses (its food-safety standards apply in Australia; New Zealand food businesses work under the Food Act 2014 and MPI): under 2 hours the food can still go back in the fridge, between 2 and 4 hours it should be eaten and not refrigerated again. The **1 hour** I use above 30°C (Auckland summer afternoons, a sunny classroom, a school bus) is my own margin, not a published limit — neither agency states it.

For a NZ school day in February, this rule is genuinely hard to meet without active cooling. That is why ice packs and frozen water bottles are not optional in summer — they are how you stop the clock on the 2-hour rule.

---

## The High-Risk Foods in a NZ Lunchbox

Not every lunchbox food is equally vulnerable. Moist, protein-rich, low-acid foods support bacterial growth best; dry or acidic foods slow it down. The grouping below is my own, built on that principle — it is not an official MPI list.

### Highest risk (need active cold)

- **Plain cooked rice** — surprising, but cooked rice supports *Bacillus cereus* growth at room temperature. Fried rice and rice salads are common food poisoning sources.
- **Cooked chicken, ham, turkey** — sliced deli meats are pasteurised but no longer sterile.
- **Boiled or scrambled eggs** — including hard-boiled eggs still in their shell. Cooked eggs belong in the fridge, peeled or not.
- **Cut melon** — once the skin is cut, the moist flesh can carry *Listeria*. Keep it cold.
- **Soft cheeses** (brie, ricotta, cottage cheese, cream cheese spreads)
- **Yoghurt and yoghurt-based dressings**
- **Tuna mayo, egg mayo, chicken mayo** — the mayonnaise itself is fine, but combined with protein it becomes a fast-growth medium.

### Medium risk (cold preferred, but more forgiving)

- **Hard cheeses** (cheddar, edam, parmesan, colby) — lower water activity, slower growth.
- **Plain cooked pasta** — still risky, but slower than rice.
- **Hummus and bean dips** — high protein, but lower pH (acidic) slows things down.
- **Other cut fruit** (mango, pineapple) — keep it cold where you can; it also goes brown and mushy in heat.

### Low risk (lunchbox-friendly at any reasonable temperature)

- **Whole fresh fruit** (apple, banana, mandarin, pear)
- **Hard vegetables** (carrot sticks, cucumber, capsicum, celery)
- **Crackers, breadsticks, rice cakes**
- **Wholegrain bread with low-moisture fillings** (peanut butter — where allowed — , vegemite, tahini)
- **Dried fruit and nut-free trail mixes** (where school policy permits seeds)

This is the framework I now use when I am packing on a hot Monday morning: high-risk foods only go in if I am also packing an ice pack, and I check the weather forecast.

---

## How Many Lunches Avoid the Problem Entirely

The safest lunchbox in a hot classroom is the one that never needed to be cold. Of our
${MENU_COUNT} menus, **${NO_COOK_COUNT} are no-cook** — no hob, no oven, no reheating at any point — and
**${THERMOS_COUNT} are thermos-friendly**, which solves the opposite problem
by keeping food hot rather than trying to keep it cold.

Skipping the stove is not the same as skipping the chill, and the difference matters here:
**most of the no-cook menus are built on** ham, chicken, tuna, mayonnaise, cheese or
yoghurt — the same foods in the highest-risk group above. They need the ice pack exactly as
much as a cooked lunch does. The [no-cook article](/en/blog/no-cook-lunchbox-ideas-nz) goes
through which of them carry those ingredients and which do not.

So the foods that actually need active cold cut across all three prep styles: sandwiches
with meat or egg, anything with mayonnaise, dairy that isn't in a sealed pouch.

It is worth knowing which group you are packing from before you worry about the bag.
Our [lunchbox food safety guide](/en/guides/lunchbox-food-safety-guide-nz) sets out the
temperature rules; the [planner](/en/planner) lets you filter to no-cook or
thermos-friendly menus directly, which is the fastest way to sidestep a 28°C afternoon.

The thermos group has its own set of rules, because holding food *hot* has a different
threshold and a different failure mode from holding it cold — that side is covered in
[Thermos School Lunches for a New Zealand Winter](/en/blog/thermos-hot-lunches-nz-winter).

## How to Pack: NZ-Specific Practical Routine

NZ MPI does not prescribe a single packing method. What follows is my routine, built from MPI guidance plus what actually fits the NZ school day (early start, long bus ride, classroom storage, late lunch).

### The night before

1. Pack everything that can be pre-prepared and put the assembled lunchbox in the fridge. Cold food going *in* cold is more effective than cold food added to a room-temperature box.
2. Freeze a small drink bottle (water or a fruit juice pouch). I use a 250–330ml bottle — big enough to be a real cold source, small enough that the child can drink the melted water at lunch. I have not timed how long it stays frozen.
3. If using a Thermos for hot food, leave it on the bench. Pre-warming happens in the morning.

### The morning of

4. Pull the lunchbox from the fridge. Drop the frozen bottle in alongside.
5. If packing hot food: fill the Thermos with **freshly boiled water**, leave for 1–2 minutes, tip out, immediately add piping hot food, and seal. Skipping the pre-warm step is the single most common reason hot Thermos meals end up lukewarm by lunch.
6. Put the assembled bag in the coldest part of the kitchen until the child leaves. Avoid leaving it on a sunny bench.

### At school

7. Encourage your child (or their teacher, with younger years) to keep the bag in the classroom, ideally in a shaded corner, not outside on a hook in summer.
8. Frozen bottle should still feel cold-to-cool at lunch. If it is fully thawed and warm by 12pm, your bag's insulation is the bottleneck — upgrade it (see the [Best Insulated Lunch Bags in NZ](/en/blog/insulated-lunch-bags-review-nz) guide).

### After school

9. Anything uneaten that contained high-risk food and has been out >2 hours — discard. Do not reuse it for after-school snack, do not save for tomorrow. This is the rule I find hardest to follow with my own kid's half-eaten ham sandwich, but it is the rule that actually matters.

---

## What "Safe" Looks Like by Auckland Temperature

| Outside temp | Bag conditions | Cold pack required? | High-risk foods OK? |
|--------------|----------------|---------------------|---------------------|
| Below 18°C (Term 2–3 most days) | Insulated bag | Recommended | Only with a cold source — lunch is usually more than four hours after packing |
| 18–24°C (Term 1 mornings, autumn afternoons) | Insulated bag | Strongly recommended | Yes, with cold pack |
| 25–29°C (typical Term 1 afternoons) | Insulated bag + ice | Required | Only with frozen bottle + insulated bag |
| 30°C and above (summer extreme) | Insulated bag + ice, kept indoors | Required | Avoid soft cheese, mayo, tuna salad; switch to hard cheese, peanut butter (where allowed), whole fruit |

This table is my personal framework, derived from MPI's danger-zone rule (5–60°C) combined with how Auckland weather actually behaves through the school year. Treat it as a starting point, not a regulation.

---

## The Bag Itself: Insulation, Not Marketing

A "lunch bag" labelled insulated is not automatically capable of keeping food at or below 5°C.

An earlier version of this section put three price bands against three durations. I have taken that out. **I have never put a thermometer in a lunch bag**, and a price band is not a test result. Nothing in a food-safety guideline tells you how long a particular bag holds a particular temperature in a particular classroom; the guideline tells you the four-hour limit, and the bag is a separate question that somebody would have to measure.

What I can say without measuring anything:

- **The cold source does the work, not the fabric.** An insulated bag with nothing cold in it is a slower version of no bag. A frozen drink bottle is the cheapest cold source there is, and it is the one we use.
- **Price buys things you can see, not hours you cannot.** Thicker insulation, a zip that closes all the way round rather than a fold-over flap, a lining that wipes clean, a pocket that holds an ice pack against the food instead of beside it. Judge those in the shop.
- **The clock starts at the fridge door**, not at the bell. Four hours in the danger zone is the limit either way, and no bag resets it.

If you want a number for a specific bag, it has to come from someone who tested that bag and published the method, the ambient temperature and the cold source. I have not found one for the bags sold here, and I am not going to invent it.

For how to choose between the bag types and where to buy them in NZ, see the [insulated lunch bag buying guide](/en/blog/insulated-lunch-bags-review-nz).

---

## Cross-Contamination: The Hidden Risk

NZ Food Safety treats cross-contamination as separately important from temperature control. The two most common lunchbox cross-contamination sources:

### 1. The same knife for raw and cooked

If you slice raw chicken with a knife on Sunday and then use the same knife (rinsed but not washed with soap) to slice cucumber for Monday's lunchbox, you have transferred bacteria. Use **separate knives or boards** for raw meat, and run anything that touched raw protein through hot soapy water before reusing.

### 2. Reusing yesterday's lunchbox without washing

I am guilty of this on busy mornings. The lunchbox came home with crumbs and a wet smudge of yoghurt, I gave it a quick wipe with a paper towel, and packed today's sandwich. **MPI's recommendation is to wash lunchboxes daily with hot soapy water** — silicone seals included, because that is where bacteria and mould love to grow. Once a week, I now also run mine through the dishwasher's hot cycle.

---

## What About Specific Allergens?

This guide is about *food safety* (bacteria, spoilage, temperature). For *food allergies* (anaphylaxis, intolerance), the rules are different and stricter. NZ schools with nut-free policies, for example, exist to protect children whose reaction to even trace contamination is potentially fatal — that is a separate body of guidance.

For comprehensive coverage of school allergy policies and how to pack within them, see:
- [Nut-Free School Lunches & Snacks: A Guide for NZ Parents](/en/blog/nut-free-school-lunches-new-zealand)
- [Egg-Free Lunchbox Ideas for NZ Schools](/en/blog/egg-free-lunchbox-ideas-nz)

---

## A Quick Daily Checklist

Before the bag leaves the kitchen, I run through this mentally. It takes about 10 seconds once it's habit:

- [ ] Did the lunchbox come from the fridge, not the bench?
- [ ] Is there a cold source in the bag (frozen drink bottle or ice pack)?
- [ ] If there is hot food in a Thermos, did I pre-warm with boiling water?
- [ ] Is today over 25°C? If so, did I swap out the mayo-based items for something more heat-stable?
- [ ] Is the lunchbox itself clean from yesterday, including the seals?

Five questions. Zero food poisoning so far.

---

## References

- New Zealand Food Safety (Ministry for Primary Industries): *Food safety at home* — [mpi.govt.nz/food-safety-home](https://www.mpi.govt.nz/food-safety-home)
- New Zealand Food Safety (Ministry for Primary Industries): *Food safety at home* booklet — [mpi.govt.nz/dmsdocument/3662-Food-Safety-in-the-Home](https://www.mpi.govt.nz/dmsdocument/3662-Food-Safety-in-the-Home). Page 5 puts the danger zone at 5°C–60°C with a four-hour limit; page 10 gives the two-hour rule for refrigerating leftovers and the over-75°C reheating line; page 14 covers school lunch boxes.
- Food Standards Australia New Zealand: *2-hour / 4-hour rule* — [foodstandards.gov.au/business/food-safety/2-hour-4-hour-rule](https://www.foodstandards.gov.au/business/food-safety/2-hour-4-hour-rule), which splits that four-hour window at the two-hour mark. FSANZ writes it for Australian food businesses; applying it to a packed lunch is my judgement, not theirs.
- Heart Foundation NZ: *Healthy food for children* — [heartfoundation.org.nz](https://www.heartfoundation.org.nz/)
- Ministry of Health NZ: *Healthy Food and Drink Guidance for Schools*, 2020 update.

This article is informational and aligned with publicly available NZ Government and Heart Foundation guidance. It is not medical advice. If your child has a specific food allergy or medical condition, talk to your GP or a registered dietitian.

---

## What the Planner Can and Cannot Do Here

The [Kiwi Lunchbox Planner](/en/planner) does not know the weather — it has no temperature or season data, and it will suggest the same menus in February as in July. What it can do is filter to no-cook or thermos-friendly menus, and every plan it gives you still needs the cold source and the four-hour limit above.

[Try the planner →](/en/planner)
`,
  },
  "term-1-first-week-lunchbox-routine-auckland-parent": {
    title: "Term 1, First Week: An Auckland Parent's 5-Day Lunchbox Routine",
    seoTitle: "Term 1 First Week: An Auckland Parent's Lunchbox Routine",
    excerpt:
      "The 5-day prep routine I run for the first week of Term 1 — the Sunday session, the weekly shop, and the morning fail-safes that save the week.",
    date: "May 9, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-28",
    image: "/assets/kiwi_ham_cheese_croissant.webp",
    category: "Routines",
    author: "Yong Jae Lee",
    body: `
The first Monday of Term 1 is the hardest morning of the NZ parenting year. Six weeks of late starts and long beach days, and suddenly the alarm goes at 6:50am, class starts at 8:45am, and somewhere between those two events you have to produce a lunchbox that complies with a heat warning and a school food policy you have not thought about since December.

This is the routine I run in our Auckland house. It is not perfect, and it is not the only way — but it survives Term 1 every year without a lunchbox crisis. The times below are rough but real: think of them as the order of operations, not a stopwatch study. If you are new to NZ schools or have a child starting Year 1 this term, this is what a workable week actually looks like from the inside.

One thing up front, because it is the part most weekly-routine articles get wrong: **the weekday headings below are the rhythm, not a fixed menu.** The mains here rotate between sandwiches and rice depending on what the night before left in the fridge. I have never managed to run a set Monday-to-Friday menu and I have stopped pretending I do — what actually repeats is the Sunday prep and the order of the morning, not the contents of the box.

---

## Sunday: The Session That Saves the Week

Most of Term 1 stress comes from doing too much on Monday morning. The fix is to move the volume of work to Sunday evening, when nobody is in a hurry.

### Sunday afternoon — the grocery run

I do the week's shop in person — usually Pak'nSave, alternating between the Ormiston and Botany stores, with the occasional top-up at Woolworths Meadowlands for anything cheaper there that week. It is rebuilt from the same template every time, with two or three swaps based on what is on this week's mailer:

- Wholegrain bread × 1 loaf
- Cheese block (Edam or Colby) × 1
- Plain Greek yoghurt × 1 tub
- Cucumbers × 2
- Carrots × 1kg bag
- Cherry tomatoes × 1 punnet
- Apples × 6
- Bananas × 6
- Mandarins (in season) × 6
- Sliced chicken × 1 pack
- Hummus × 1 tub

This template was built from the **Ministry of Health's Healthy Food and Drink Guidance** — see the [nutrition guide](/en/guides/complete-nutrition-guide-school-lunches-nz) for the full breakdown. Priced against the regular shelf prices we track at Pak'nSave, the list above comes to about **${sundayShopLabel()}** — before any of the swaps you make off the mailer, which usually pull it lower.

That is the whole list, not one child's lunches: the cheese block, the yoghurt tub and the hummus get eaten by everyone in the house across the week. The per-lunchbox number is further down, and the two are meant to reconcile.

If you would rather check the actual best store this week, see [Pak'nSave vs Woolworths: Lunchbox Staples Price Comparison](/en/blog/paknsave-vs-countdown-lunchbox-staples).

### Wash and sort

- Wash the week's fruit and sort out roughly what goes in which day. Air-dry on a tea towel.
- **Blanch a head of broccoli** and portion it. It goes in cold, and it is the vegetable that actually gets eaten in this house.
- Cut the carrots into sticks. A container with a paper towel and a little water keeps them crisp.
- Cut cucumbers into half-rounds. Same container method.
- Slice the cheese into cube portions and put them in a small sealed container.
- Wash the cherry tomatoes and put them straight back in the punnet.

### Boil and chill

- Hard-boil **about ten eggs** — cold-water start, simmer 8 minutes, then an ice bath. That covers the week with a few spare.
- If there is rice this week, it gets cooked fresh the night before rather than batch-frozen. Rice does not survive freezing here — see the midweek section below.

### Freeze the drink bottles

We run three small 330ml plastic drink bottles, two-thirds full of water, lids loose, into the freezer overnight. Three is enough for five school days because they rotate — the one that comes home goes straight back in the freezer that evening, so there is always a frozen one ready for the morning. They act as both ice pack and drink, and they are the single most important food-safety tool for an Auckland Term 1 week (see [NZ Lunchbox Food Safety](/en/blog/lunchbox-food-safety-nz-term-1-heat) for why).

### Done

The fridge now contains: washed fruit sorted roughly by day, blanched broccoli, cut carrots and cucumber, cheese portions, about ten boiled eggs, a tub of hummus, sliced chicken, yoghurt, and bread. The drink bottles are in the freezer.

---

### What the week costs

Because someone always asks: a complete lunchbox from our menu set — main, fruit and a
second snack — runs a median of about **${boxMedianLabel()}** on current tracked prices, with a realistic
floor around **${boxFloorLabel()}**. Five days comes to about **${boxWeekLabel()}** a child for the week.

That figure comes from pricing the ingredients, not from a guess. The shelf prices behind
it are published in our [price index](/en/price-index), and the
[free planner](/en/planner) will build and cost a week around whatever is actually on
special. I mention it here because the Sunday session above is where the cost is decided
— once you are standing in the kitchen on Thursday morning, the number is already set.

## Monday: The First Morning of the Year

This is the morning that breaks people. She is exhausted, the bag is missing a sock, the school uniform was put away in the wrong drawer, and the lunchbox needs to be packed and out the door by 8:10am.

### 6:50am — Alarm

Coffee. Five minutes of staring at the kitchen counter. The morning starts.

### Lunchbox stage 1

Pull the lunchbox from the dishwasher. Wipe dry. Open it on the counter. Mentally walk through:
- One main
- One fruit
- One vegetable
- One dairy
- One protein
- One drink

If yours is a Year 1, also: smaller portions (see the [nutrition guide](/en/guides/complete-nutrition-guide-school-lunches-nz) for age-appropriate portions).

### Pack the main

Whatever the rotation lands on. Most often that is a sandwich — wholegrain bread, sliced chicken and hummus, cucumber — cut in half. (A Year 1 will usually only get through half; keep the rest for the next day. An older child takes the whole one.)

### Pack everything else

- 1 apple
- 4 carrot sticks + 4 cucumber rounds
- 1 cheese cube
- 1 hard-boiled egg (peeled and in a small container)
- 1 frozen drink bottle from the freezer

The frozen bottle goes into the bag right alongside the lunchbox — it doubles as the cold source that keeps everything out of the danger zone until lunch.

### 7:10am — Done

About twenty minutes from cold start to packed bag. That only works because of Sunday's prep — the fruit is washed, the carrots are cut, the eggs are boiled. ([Our back-to-school prep checklist](/en/blog/back-to-school-lunchbox-prep-nz) is what that Sunday is built on.) Washing and cutting everything on the morning is what turns twenty minutes into a morning that collapses.

### 7:15am — Wake her

The lunchbox is already done and out of the way, which is the whole point. From here it is breakfast, uniform and bag — about ten more minutes of me in it, and the rest is her.

### 8:10am — Out the door
### 8:35am — At school
### 8:45am — Class starts

This is the Term 1 baseline. Five out of five days in the first week should hit this rhythm. If even one morning slips, the rest of the week catches up.

---

## Tuesday: Use Yesterday's Knowledge

By Tuesday I know what came home untouched. If the carrot sticks came back at 50%, today's lunch gets cucumber instead. If the apple came back whole, today's fruit is grapes or a mandarin (more finishable).

This is not "fussy kid management" — this is **observational feedback**. Children's food preferences shift over time, and the lunchbox is a low-pressure place to test what works.

### A typical lunch pattern that day

- **Main:** Half a wholegrain sandwich with cheese + cucumber + a thin layer of hummus
- **Fruit:** 1 mandarin
- **Vegetable:** Cherry tomatoes (a switch from yesterday's carrots)
- **Dairy:** Small Greek yoghurt with a few berries
- **Protein:** 1 boiled egg
- **Drink:** Frozen drink bottle from the freezer

By Tuesday the packing is quicker — not because anything is different, but because I am not re-deciding what goes in.

---

## Midweek: Breaking the Bread Run

Somewhere around the middle of the week the bread runs out of goodwill, and the lunch that breaks it here is **rice** — onigiri, or a quick kimbap rolled from the previous night's dinner rice. That is a habit that comes with being a Korean family in East Auckland: the rice and nori come from the Korean grocer, the furikake from the Japanese one, and it takes about ten minutes to roll a few.

I cannot put this on a fixed weekday, and I have stopped trying. It happens on the mornings when there is leftover rice from the night before — which is also, usually, the morning I am running late. That is the honest version: it is a fallback that earns its place, not a scheduled slot.

### The rule that shapes the whole week: rice gets made fresh

Rice does not survive freezing and reheating here. My daughter eats by texture, and the moment rice turns soft and mushy it is an instant no. So rice-based lunches are rolled from the previous night's leftover rice and packed cold the next morning — never batch-frozen weeks ahead.

That single lesson is why the rest of the prep looks the way it does: I only batch-cook and freeze the dishes that actually hold their texture, and make the rest fresh. [Batch cooking to save money](/en/blog/batch-cooking-save-money-nz) covers what does and does not survive a freezer.

Onigiri also happens to be nut-free without trying, which matters if your school has a nut-free policy — see [nut-free school lunches](/en/blog/nut-free-school-lunches-new-zealand).

### The rice-day lunch pattern

- **Main:** Onigiri (or kimbap) rolled from last night's rice, packed cold
- **Fruit:** 1 apple
- **Vegetable:** Carrot sticks
- **Dairy:** Cheese cube
- **Protein:** Tuna and mayonnaise in the onigiri filling
- **Drink:** Frozen drink bottle from the freezer

---

## The Active Days: More Energy, More Snack

There is no single hard day here, and that took me a while to work out. Swimming is Monday, PE is Thursday, and cheerleading lands on Wednesday and Friday. So instead of one big lunchbox on one fixed day, the bigger lunch moves around the week and follows whatever is on that day's timetable.

The adjustment is the same wherever it lands: more energy, and an extra snack.

### The active-day adaptation

- **Main:** Full wholegrain sandwich (a bigger main than usual)
- **Fruit:** 1 banana + 1 mandarin
- **Vegetable:** Cucumber + cherry tomatoes
- **Dairy:** Yoghurt pouch (within 15g sugar)
- **Protein:** 1 boiled egg
- **Snack:** 1 muesli bar (under 15g sugar) + extra cheese cube
- **Drink:** Frozen drink bottle from the freezer + a small plain milk

This is roughly a Year-level-up lunchbox, accounting for the higher activity level. Ministry of Health guidance is explicit that energy needs vary by activity — so the day the bigger lunch goes in is whichever day the timetable is heaviest, not a day you can fix in advance.

---

## Friday: Treat Day Within Limits

Friday is our treat day — but within the **Healthy Food and Drink Guidance** framework, the treat is one Amber/Red item, not the whole lunchbox.

### The Friday pattern

- **Main:** Whatever the rotation lands on — most often a sandwich with chicken
- **Fruit:** 1 apple
- **Vegetable:** Carrot sticks (optional — Friday I do not push it)
- **Dairy:** Cheese cube
- **Protein:** Chicken in the main
- **Treat:** Small piece of dark chocolate, OR a homemade banana muffin, OR a chocolate-coated muesli bar
- **Drink:** Frozen drink bottle from the freezer

The Friday treat is intentional, and it is our house rule rather than official guidance — the Ministry of Health's Green/Amber/Red system is written for food that schools provide, not for what parents pack. One small treat inside the week, and inside whatever your school allows. A lunchbox a child won't eat saves nothing.

---

## Saturday: Lunchbox Reset

Saturday morning I run the dishwasher hot cycle with **all the empty lunchboxes, all the drink bottles, all the silicone seals**. This is the deep clean that prevents mould and bacterial buildup over a long Term — see [NZ Lunchbox Food Safety](/en/blog/lunchbox-food-safety-nz-term-1-heat) for the MPI rationale.

I also throw away anything that came home half-eaten on Friday. The 2-hour rule does not stretch over a weekend.

---

## Sunday: Repeat

The cycle resets: one prep session on Sunday evening, then mornings that stay at about twenty minutes instead of collapsing. Over a 10-week Term that is the difference between a routine and a scramble — and it prevents the small mistakes that compound (a forgotten frozen bottle, a lukewarm yoghurt, a string of uneaten lunchboxes in a row).

---

## Four Pitfalls I Hit in My First Term 1

### 1. Packing the same lunch every day

Even with the prep template above, I rotate the **main**, the **fruit**, and the **vegetable** to avoid lunchbox boredom. The boring lunchbox is the unfinished lunchbox.

### 2. Forgetting the school's allergy policy

Auckland schools have a wide range of nut-related policies — strict nut-free, "no nuts in shared areas", or no restrictions. Read your school's policy in **the first week** and update your shopping list immediately. The [Nut-Free Schools Guide](/en/blog/nut-free-school-lunches-new-zealand) covers this in detail.

### 3. Skipping the frozen bottle on cool days

Auckland Term 1 has cooler days mixed in. The temptation is to skip the frozen bottle and just use a normal water bottle. The risk: even a 20°C morning can become a 27°C afternoon, and the bag is in the danger zone for the whole afternoon if there is no cold source. I now freeze the bottle every day regardless of forecast.

### 4. Underestimating the Year 1 transition

The first month of Year 1 is genuinely overwhelming for a 5-year-old. Lunch portions need to be **smaller than you think**, particularly in the first 2 weeks. See the [nutrition guide](/en/guides/complete-nutrition-guide-school-lunches-nz) for age-appropriate portions.

---

## References

- Ministry of Education NZ: *NZ school term dates* — [education.govt.nz](https://www.education.govt.nz/)
- Ministry of Health NZ: *Healthy Food and Drink Guidance for Schools*, 2020 update.
- Ministry for Primary Industries (NZ Food Safety): consumer food safety at home.

This article is the personal Term-1 routine of the operator behind Kiwi Lunchbox. Your school's exact start time, allergy policy, and the local climate may differ — adapt the rhythm to your conditions. It is informational, not medical or dietary advice.

---

## Plan Your Own Term 1 Routine

The [Kiwi Lunchbox Planner](/en/planner) generates a weekly menu based on your child's Year level, your allergy constraints, and this week's NZ supermarket sales. The Sunday session gets a lot shorter once you have the menu in hand.

[Try the planner →](/en/planner)
`,
  },
  /**
   * 🔴 이 글에는 **보온 시간 수치가 없다.** 재지 않았기 때문이다.
   * 원래 계획은 "보온병 실사진이 이미 있다"는 전제로 서 있었는데, 사진의 가격표를
   * 확대해 보니 물병 매대였다(2026-08-20). 그래서 히어로는 생성 이미지이고
   * `imageCaption`은 없다 — 촬영 문구는 실사진에만 붙인다.
   * 메뉴 이름과 개수는 전부 `data/menuData.json`·`THERMOS_COUNT`에서 만든다.
   */
  "thermos-hot-lunches-nz-winter": {
    title: "Thermos School Lunches for a New Zealand Winter",
    excerpt:
      "Which of our menus survive a flask, what the morning actually involves, and the hot-food rules we take from NZ Food Safety — and what we have not measured.",
    date: "August 20, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-29",
    image: "/assets/kiwi_thermos_lentil_soup.webp",
    category: "Gear & Tips",
    author: "Yong Jae Lee",
    body: `
Terms 2 and 3 are the stretch of the New Zealand school year where a cold sandwich stops being appealing and starts being a negotiation. A hot lunch is the obvious answer. Some schools can already provide one — [Ka Ora, Ka Ako](https://www.education.govt.nz/our-work/overall-strategies-and-policies/wellbeing-in-education/free-and-healthy-school-lunches), the government's Healthy School Lunches Programme, serves hot meals at participating schools, so the first thing worth checking is whether yours is one of them. For everyone else, the delivery problem is blunt: a New Zealand primary classroom has no microwave, no oven a child can reach, and no one to reheat anything at midday. Whatever leaves your kitchen hot has to arrive hot on its own, and the only container that does that is a vacuum flask.

---

## Why a Flask, Specifically

A lunchbox has no heat source. Whatever temperature the food is when the lid closes is the best it will ever be — from there it drifts toward the temperature of the bag, and then of the classroom. Insulation slows the drift. Nothing in a school bag reverses it.

That drift is the whole problem, and New Zealand Food Safety (MPI) names it for this exact case: [when school lunches get too warm](https://www.mpi.govt.nz/food-safety-home/preparing-and-storing-food-safely-at-home/keeping-school-lunches-safe), the food can become unsafe to eat. Almost all of their packed-lunch advice is about holding the box on the cold side — freeze the drink bottle overnight, pack perishables between chilled items, have children eat the chilled food first. A flask is the other way out of the same problem. Instead of holding the food below the range where bacteria multiply — what our [lunchbox food safety guide](/en/guides/lunchbox-food-safety-guide-nz) calls the danger zone — you hold it above.

The failure sits between the two, and it is worth naming plainly. Warm food in an ordinary container is not a halfway compromise — it is the worst of both. It has left the cold side and it cannot hold the hot side, so it spends the whole morning drifting through the middle. **A flask filled carelessly is a bigger food-safety problem than a cold sandwich, not a smaller one.** That is why the preparation steps further down are not optional polish; they are the entire mechanism.

One thing to settle before buying anything: ask your school what it allows and what it can help with. Schools differ on glass-lined flasks — the same question a glass drink bottle raises — on where lunch is eaten, and on whether a staff member will open a stiff lid for a new entrant. An article cannot answer that for you, and the answer changes what is worth owning.

---

## Which of Our ${THERMOS_COUNT} Menus Are Built for a Flask

The planner has a **Thermos-friendly only** toggle. Turning it on narrows the library to the ${THERMOS_COUNT} menus that are meant to be sent hot:

${thermosBullets()}

That list is generated from our menu data rather than typed out, so it stays true as the library changes. A few things fall out of it that shape the week rather than the single lunch:

- **All ${THERMOS_COUNT} are cook-fresh.** Not one is a no-cook assembly job. A flask lunch is a cooked meal by definition, and that — not the container — is the real cost of the format.
- **${thermosCountWhere((m) => m.is_dairy_free === true)} of the ${THERMOS_COUNT} are dairy-free** and **${thermosCountWhere((m) => m.is_gluten_free === true)} are gluten-free**, so the toggle composes with the allergy filters instead of emptying the plan.
- **${thermosCountWhere((m) => m.is_vegetarian === true)} are vegetarian**, which is usually the group people expect a hot-lunch list to be short on.
- **All ${THERMOS_COUNT} are nut-free**, so a flask lunch fits a nut-free classroom without further substitution. Our [nut-free article](/en/blog/nut-free-school-lunches-new-zealand) covers what those policies usually ask for.

The pattern in the list is not an accident. What survives a flask is wet, dense and already soft: sauced rice, mince in a sauce, a thick soup, pasta cooked past al dente. What does not survive is anything whose appeal is a texture contrast — crisp, crunchy, or crumbed goes in crisp and comes out steamed. That is not a food-safety rule, it is a texture one, and it is the reason a meal that reheats beautifully at home can still come back uneaten.

---

## What the Morning Actually Involves

The flask itself is the easy part. The two steps that decide whether it works are both about temperature, and both happen before the food goes in.

**Pre-warm the flask.** An empty steel flask sits at room temperature, and a New Zealand kitchen in July — in a house that in most of the country is heated in one room and not the others — is a long way below serving temperature. Fill it with freshly boiled water, put the lid on, and leave it while you finish the meal, then tip the water out immediately before filling. Skip this and the flask takes its warm-up heat out of the food — which is why a hot lunch can arrive lukewarm even when the food went in steaming. Our [Term 1 food safety article](/en/blog/lunchbox-food-safety-nz-term-1-heat) describes the same step from the opposite season.

**Fill it hot, and fill it full.** MPI's instruction for reheated food is *piping hot* — [over 75°C](https://www.mpi.govt.nz/food-safety-home/preparing-and-storing-food-safely-at-home/safe-food-preparation-cooking-and-storage-at-home) — and a flask cannot add heat later, so the food has to go in at that point rather than near it: steaming, straight off the heat, not rested on the bench while you pack the rest. Air is the other cost. A part-filled flask is carrying a pocket of air that has to be warmed too, and the smaller the portion the more that costs you — which is an argument for buying the flask that matches what your child actually eats rather than the largest one on the shelf.

Both steps mean a flask lunch is a cook-fresh morning, and all ${THERMOS_COUNT} of our thermos menus carry that tag for exactly that reason. There is one way around it worth planning for: cook the meal the night before as part of dinner, refrigerate it, and reheat a single portion to steaming in the morning. That is a batch-cooking pattern rather than a different recipe, and our [batch cooking article](/en/blog/batch-cooking-save-money-nz) covers how to build a week around it.

Note the order there. Reheat, *then* fill. A flask holds heat; it does not create it, and it cannot lift cold food back up to a safe temperature.

---

## Food Safety for Hot Lunches

The cold-lunch rules most parents know do not transfer to a flask. The short version, drawn from New Zealand Food Safety's [packed-lunch advice](https://www.mpi.govt.nz/food-safety-home/preparing-and-storing-food-safely-at-home/keeping-school-lunches-safe) and from its [*Food safety at home* booklet](https://www.mpi.govt.nz/dmsdocument/3662-Food-Safety-in-the-Home), which is where the actual numbers live:

- **Reheated food goes in piping hot — MPI's line is over 75°C.** That is the number the morning routine is built around, and it is the one figure in this article that a thermometer in your own kitchen can check.
- **The two-hour clock runs at the cooking end, not just the eating end.** MPI's rule for leftovers is to refrigerate or freeze them within two hours of cooking. Last night's dinner earns its place in a flask by having gone into the fridge fast — not by having sat out cooling on the bench.
- **A flask is not a way to carry last night's dinner warm.** Refrigerate it cold, reheat it to steaming, then fill.
- **Wash it properly, seal included.** The rubber seal in the lid is the part that gets skipped, and it is the part that stays damp between washes. Removable seals get cleaned; moulded ones get forgotten.

Our [lunchbox food safety guide](/en/guides/lunchbox-food-safety-guide-nz) sets out the temperature rules in full, and the [Term 1 heat article](/en/blog/lunchbox-food-safety-nz-term-1-heat) covers the cold-side version of the same problem.

> This article is informational and follows publicly available New Zealand Food Safety guidance. It is not medical or dietary advice. If your child has a medical condition affecting what they can eat, talk to your GP or a registered dietitian.

---

## Choosing a Flask: What to Look At

**Mouth width — the one that decides whether it is usable at all.** A narrow-mouthed drink flask will take a thin soup and nothing else. No rice, no pasta, no mince, and a child cannot get a spoon into it or clean it out afterwards. A food flask has a mouth wide enough to eat straight out of. The two are easy to confuse, so read the description rather than the silhouette: something labelled a bottle, with a screw cap sized for drinking, is not a food container whatever it is made of.

**Vacuum-insulated stainless steel, not merely "insulated".** The word insulated appears on foam-walled containers too. What holds heat through a school morning is a double wall with a vacuum between the layers.

**A lid the child can open unaided.** A seal tight enough to hold heat is tight enough to defeat small hands, and the adult who packed it is not there when the lid has to come off. This is worth testing at the kitchen table before it is tested at school.

**Capacity matched to the portion.** Bigger is not better here, for the air-pocket reason above.

**Serviceability.** Lids with removable seals can actually be cleaned. Sealed-in ones cannot.

---

## What a Flask Lunch Costs

The flask itself costs money once. What goes in it is the part that repeats.

${THERMOS_COUNT} of our ${menuTotal()} menus are built for a flask, and costed against the prices behind our [NZ Lunchbox Price Index](/en/price-index) a thermos main ${costClause("thermos")} — median ${dietMoney("thermos").inMedian} against ${dietMoney("thermos").outMedian} for everything else.

${thermosCostVerdict()} A flask suits soup, pasta, rice and stew: dishes built on legumes, grains and small amounts of meat rather than on sliced deli meat and cheese.

What the winter switch does cost is the flask, a cooked (or reheated) meal on a school morning — every one of the ${THERMOS_COUNT} is cook-fresh — and the pre-heating the section above describes. It saves no morning effort; it moves the effort to the stove.

---

## What We Have Not Measured

Saying this plainly is more useful than a number we would have to invent:

- **Heat retention.** We have not put a thermometer in a flask, of any brand, at any price. That is why no hours figure appears anywhere above, and why this article does not rank brands. A duration printed on packaging is a manufacturer's claim, not something we can hand you as our own.
- **Prices.** We have not price-checked food flasks in a New Zealand store, so this article names no retailer and no range. Our [insulated lunch bag review](/en/blog/insulated-lunch-bags-review-nz) quotes prices because those were read off a shelf and the tickets photographed; we have no equivalent for flasks, and quoting an online listing as though it were a shelf is precisely the mistake that article exists to avoid.
- **Whether the food is still appetising at lunchtime**, which is a different question from whether it is still safe, and the one that actually decides whether the box comes home empty.

If any of those get measured, this article gets the numbers and the date they were taken. That is how the rest of the site works, and an article about winter lunches is not a good place to start making exceptions.

---

## Plan a Week of Thermos Lunches

The [Kiwi Lunchbox Planner](/en/planner) has the **Thermos-friendly only** toggle built in. Tick it — alone, or alongside your allergy filters — and the week's main dishes are drawn only from the ${THERMOS_COUNT} menus above, costed on this week's New Zealand supermarket prices. The toggle applies to the main only; snacks still follow any allergy filters you tick.

[Try the planner →](/en/planner)

---

## References

- New Zealand Food Safety (Ministry for Primary Industries): *Keeping school lunches safe* — [mpi.govt.nz/…/keeping-school-lunches-safe](https://www.mpi.govt.nz/food-safety-home/preparing-and-storing-food-safely-at-home/keeping-school-lunches-safe) — for the packed-lunch advice this article is built on. That page is deliberately qualitative; the temperatures and times below come from the booklet instead.
- New Zealand Food Safety: *Food safety at home* booklet — [mpi.govt.nz/dmsdocument/3662-Food-Safety-in-the-Home](https://www.mpi.govt.nz/dmsdocument/3662-Food-Safety-in-the-Home) — page 5 for the 5°C–60°C danger zone and its four-hour limit, page 10 for the two-hour leftovers rule and the over-75°C reheating line.
- New Zealand Food Safety (Ministry for Primary Industries): *Safe food preparation, cooking, and storage at home* — [mpi.govt.nz/…/safe-food-preparation-cooking-and-storage-at-home](https://www.mpi.govt.nz/food-safety-home/preparing-and-storing-food-safely-at-home/safe-food-preparation-cooking-and-storage-at-home) — for the over-75°C reheating line and the two-hour rule on leftovers.
- Ministry of Education: *Ka Ora, Ka Ako — Healthy School Lunches Programme* — [education.govt.nz](https://www.education.govt.nz/our-work/overall-strategies-and-policies/wellbeing-in-education/free-and-healthy-school-lunches) — for whether your school already serves a hot lunch.

Both MPI pages were opened and read on 20 August 2026. MPI's older \`/food-safety/food-safety-for-consumers/\` address now redirects to a section index that carries no temperature figures of its own, so it is not cited here.
`,
  },
  /**
   * 🔴 이 글에는 **칼슘 권장량 수치가 없다.** 1차 출처를 열어서 확인하지 못했기 때문이다.
   * 영양소 이름을 대는 것과 밀리그램을 대는 것은 다른 주장이고, 뒤엣것은 기관을 실제로
   * 읽은 사람만 할 수 있다. 브랜드 목록도 없다 — NZ 매장에서 라벨을 직접 확인한 적이 없다.
   * 개수·메뉴 이름·비용은 전부 `data/menuData.json`·`DAIRY_FREE_COUNT`·가격 캐시에서 만든다.
   * 히어로는 생성 이미지이고 `imageCaption`은 없다 — 촬영 문구는 실사진에만 붙는다.
   */
  "dairy-free-school-lunches-nz": {
    title: "Dairy-Free School Lunches: A Guide for NZ Parents",
    excerpt:
      `Milk allergy and lactose intolerance are not the same thing. What changes in the box, where milk hides on an NZ label, and our ${DAIRY_FREE_COUNT} dairy-free menus.`,
    date: "August 20, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-29",
    image: "/assets/kiwi_dairy_free_falafel_wrap.webp",
    category: "Allergy Friendly",
    author: "Yong Jae Lee",
    body: `
A dairy-free lunchbox usually starts with one of two conversations: a doctor's, or a school office's. They lead to very different boxes, and the first thing worth getting straight is which one you are in — because "no dairy" covers two conditions that are not the same, do not carry the same risk, and do not ask the same things of the school.

The practical news first. The planner's **Dairy Allergy** filter leaves ${DAIRY_FREE_COUNT} of our ${MENU_COUNT} menus standing, and they are not substitute versions of dairy lunches. They are lunches that never contained dairy in the first place, which is a different and much easier thing to pack.

---

## Milk Allergy and Lactose Intolerance Are Not the Same Problem

Healthify He Puna Waiora — the New Zealand health information service run by the Health Navigator Charitable Trust — puts it in one line: ["Lactose intolerance is often confused with milk allergy. These are different conditions"](https://healthify.nz/health-a-z/l/lactose-intolerance/).

**Cow's milk allergy** is an immune reaction to the *protein* in cow's milk. Healthify describes two patterns: a fast one, where symptoms appear within minutes and up to two hours, and a delayed one, where they appear after two hours and up to a few days later. The delayed kind is the one that hides, because by the time a child is unwell the lunchbox is long since washed up.

**Lactose intolerance** is about the *sugar*, not the protein. Healthify's practical distinction is the sentence to hang your label-reading on: people with lactose intolerance can usually manage small amounts of milk products, whereas in milk allergy small amounts usually cause symptoms.

That difference decides how strict you have to be, and it has an immediate consequence at the supermarket:

**Lactose-free is not milk-free.** Lactose-free milk has had the sugar dealt with and still contains the milk protein. It is the right answer for intolerance and the wrong one for allergy. "Non-dairy" is a marketing phrase rather than a regulated one; the word that carries legal weight on a New Zealand label is **milk**, and that is the section further down.

> This article is informational and follows publicly available New Zealand health and food-labelling guidance. It is not medical advice. If dairy has come out of your child's diet on medical advice — or you suspect it should — that belongs with your GP, an allergist, or an NZ Registered Dietitian, not with a lunchbox website.

---

## What to Tell the School, and How Much Detail

Schools act on what is written on the dietary form, and "dairy-free" on its own does not tell them whether a shared birthday cupcake is a problem or an inconvenience. This is what each situation actually asks for:

| What your child has | What the school needs from you | What it means at lunchtime |
|---|---|---|
| **Milk allergy, fast reaction** | An allergy action plan on file, where any prescribed adrenaline auto-injector is kept, and staff who have read both | No milk protein at all. Baking days, shared kai and class parties need an alternative you supplied |
| **Milk allergy, delayed reaction** | The same avoidance, plus a note that symptoms can appear hours later — so a reaction may not look like one | Same avoidance. The risk is that nobody connects the cause to the lunch |
| **Lactose intolerance** | A line on the dietary form. It is not an emergency and does not need an action plan | Small amounts are usually fine. The stake is comfort, not safety |
| **Dairy-free by choice** (vegan, religious, family) | The dietary form again — this is what school-provided lunches are matched against | Treated as a diet requirement rather than a medical one |

Our [school lunchbox policy guide](/en/guides/school-lunchbox-policy-guide-nz) covers the other restrictions that usually sit alongside this one, and the [allergy management guide](/en/guides/allergy-management-school-lunchbox-nz) walks the same ground for every major allergen.

**A note worth sending in week one.** Adapt the bracketed parts and delete what does not apply:

> Kia ora,
>
> [Child's name] in Room [x] does not have any dairy. It is [a diagnosed cow's milk allergy / lactose intolerance], which means [even traces are a problem / small amounts are usually fine].
>
> Could you let me know:
>
> 1. Whether the class has regular food activities — baking, shared kai, class parties — so I can send an alternative on those days;
> 2. [If allergy] Where our allergy action plan is kept, and which staff have seen it;
> 3. Whether the school takes part in Ka Ora, Ka Ako, and if so how dietary requirements are recorded for it.
>
> Ngā mihi

Point three matters more than it looks, and it is the last section of this article.

---

## The ${DAIRY_FREE_COUNT} Menus That Need No Dairy at All

Ticking **Dairy Allergy** in the planner narrows the library to ${DAIRY_FREE_COUNT} of ${MENU_COUNT} menus. The first few, straight from the data: ${dairyFreeList()}.

That list is generated rather than chosen, so it is not curated around any other restriction — dairy-free and nut-free are separate filters, and the planner lets you stack them.

**Not one of the ${DAIRY_FREE_COUNT} lists milk, cheese, butter, cream or yoghurt among its ingredients.** That is the claim worth checking, because a menu that merely omits the cheese from a cheese sandwich is not a dairy-free lunch — it is a worse sandwich.

Here is how the ${DAIRY_FREE_COUNT} overlap with the other filters, which is what decides whether you can stack restrictions without emptying the week:

| Of the ${DAIRY_FREE_COUNT} dairy-free menus | How many |
|---|---|
| Also nut-free | ${dairyFreeCountWhere((m) => m.is_nut_free === true)} |
| Also egg-free | ${dairyFreeCountWhere((m) => m.is_egg_free === true)} |
| Also vegetarian | ${dairyFreeCountWhere((m) => m.is_vegetarian === true)} |
| Also gluten-free | ${dairyFreeCountWhere((m) => m.is_gluten_free === true)} |
| Also thermos-friendly | ${dairyFreeCountWhere((m) => m.is_thermos === true)} |

The ones that need no cooking at all — the assembly-only end of the list, for the mornings that have gone wrong before they started:

${dairyFreeNoCookBullets()}

There is a pattern in the full list, and it is worth naming because it changes what you shop for. What survives the filter is mostly rice, wraps, legumes and cold meat: the dishes whose cuisines never leaned on dairy to begin with. The lunches that fail the filter are the ones built around a cheese slice or a yoghurt. So the shortest route to a dairy-free week is not to buy dairy-free versions of what you already packed — it is to cook from the part of the library that was never going to have dairy in it.

---

## What Cheese Was Actually Doing

Cheese survives in lunchboxes because it does three jobs at once, and the mistake is replacing it with one product instead of replacing the three jobs.

| The job cheese was doing | What can do it without dairy |
|---|---|
| **Protein** | Tinned tuna or salmon, cold roast meat, chickpeas and hummus, falafel, tofu, edamame, egg (if egg is still on the menu) |
| **Fat, and staying full until the bell** | Avocado, tahini, olive oil in a dressing, seeds where the school's policy allows them |
| **Making bread edible** | Hummus, avocado, a dairy-free spread, chutney, or simply a wetter filling |

Commercial dairy-free cheese is aimed almost entirely at the third job. It melts and it binds; it is not usually a protein. If it goes in as a like-for-like swap, the protein quietly leaves the box, and that is the same trap our [nut-free article](/en/blog/nut-free-school-lunches-new-zealand) describes when peanut butter is replaced with jam — cheap, easy, and no longer doing the work. Our [egg-free article](/en/blog/egg-free-lunchbox-ideas-nz) covers the same protein gap from the other side, which is worth reading if both restrictions apply at once.

For hot lunches, ${dairyFreeCountWhere((m) => m.is_thermos === true)} of the dairy-free menus are built to travel in a flask — our [thermos article](/en/blog/thermos-hot-lunches-nz-winter) covers how that morning works.

---

## Calcium Is the Nutrient to Actually Watch

Our [complete nutrition guide](/en/guides/complete-nutrition-guide-school-lunches-nz) names milk, cheese and yoghurt as the lunchbox calcium sources. Take dairy out and that entire column goes with it, which is the one genuine nutritional consequence of this restriction rather than an inconvenience.

Sources that fit in a lunchbox and contain no dairy:

- **Calcium-fortified plant milk** — but fortification is not automatic. Some are fortified and some are not, and the only way to tell is the nutrition information panel on the carton in your hand.
- **Calcium-set tofu** — the setting agent is what makes the difference, and it is listed in the ingredients.
- **Tinned salmon or sardines with the bones left in.**
- **Tahini**, which doubles as the spread that replaces cheese's binding job.
- **Leafy greens and broccoli**, in a wrap or a salad box.

Our [vegetarian and vegan guide](/en/guides/vegetarian-vegan-school-lunch-guide-nz) lists the same set for the same reason, because a vegan lunchbox faces this problem every day.

**This article deliberately gives you no milligram target.** Naming the nutrient is something we can stand behind; naming a daily figure would mean pointing at an authority we have not opened and read. If your child came off dairy on medical advice, the intake question is one for a dietitian, who can look at the whole day rather than one box.

---

## Where Milk Hides on a New Zealand Label

Milk is one of the allergens that must be declared under the Australia New Zealand Food Standards Code. Food Standards Australia New Zealand (FSANZ) lists milk among the allergens that [must be declared on the food label](https://www.foodstandards.gov.au/consumer/foodallergies) whenever they are present as ingredients, however small the amount.

Since **25 February 2024**, that declaration has had to be in plain English. FSANZ's [allergen labelling rules for consumers](https://www.foodstandards.gov.au/consumer/labelling/allergen-labelling) require the allergen to appear in the ingredient list under its exact name and in bolded text, together with "a bolded, separate allergen summary statement starting with the word 'contains'". For dairy the required word is **milk**, so casein, whey and milk solids can no longer carry the declaration on their own.

Two things follow, and they pull in opposite directions:

1. **A Contains statement is now a genuinely useful shortcut.** If milk is an ingredient, it has to be in there, in that word.
2. **"May contain milk" is not the same kind of statement.** FSANZ is explicit that precautionary statements are voluntary and that the Food Standards Code does not regulate them. So a may-contain is neither proof of risk nor proof of safety, and how much of it your child can live with is a question for your allergist rather than for a label. Our [nut-free article](/en/blog/nut-free-school-lunches-new-zealand) makes the same point about nuts. And when we read the label on every product we track, [${hiddenRows().length} of them declared an allergen the product name never suggests](/en/blog/allergen-labels-nz-lunchbox-staples) — roti with milk, a rice cereal with gluten.

The categories worth slowing down on in a New Zealand trolley, because milk turns up in them for reasons that have nothing to do with the product being dairy:

- **Table spreads and margarine** — milk solids are common, and this is the one that catches people who have carefully bought dairy-free bread.
- **Sandwich bread, buns and wraps** — milk powder is a routine softener.
- **Crackers and crispbread.**
- **Flavoured chips, instant noodles and seasoning sachets**, where the flavour base does it.
- **Processed and deli meats**, where milk protein can act as a binder.
- **Chocolate, including dark**, and anything labelled "compound".
- **Stock powder, gravy and instant soup.**
- **Crumb and batter** on frozen chicken, fish or vegetable products.

None of that is a claim about any particular product. Formulations change, and the point of the list is which shelf deserves a second look rather than which packet to trust.

---

## Does Dairy-Free Cost More?

Costed against the supermarket prices behind our [NZ Lunchbox Price Index](/en/price-index), ${dairyCostSentence()}. At the median, this restriction is close to free.

The median hides the swap that stings, though. On tracked prices ${cheeseVsProteinsClause()}, so losing it is a real cost in the boxes that were built on it — our [egg-free article](/en/blog/egg-free-lunchbox-ideas-nz) makes exactly that point from the other direction. What keeps the two medians close is that most dairy-free menus never needed cheese: they are built on rice, legumes or meat.

Which gives the same answer as the menu list did. The expensive way to go dairy-free is to buy the substitute version of everything you already ate. The cheap way is to cook the things that were never dairy in the first place.

---

## The Snack Is Where It Leaked

The main was never the hard part. ${DAIRY_FREE_COUNT} of our ${menuTotal()} menus are dairy-free and the planner filtered those correctly from the start. The snack beside it was a different story: until 10 September 2026 the planner picked snacks **without checking your allergy settings at all**, so a dairy-free week could arrive with cottage cheese sitting next to the soup. An outside review found it, we fixed it, and the fix is worth describing because of what it turned up.

Turn the dairy filter on now and ${snackPool("Dairy Allergy").kept} of ${snackPool("Dairy Allergy").total} snacks survive. These drop out: ${droppedList("Dairy Allergy")}.

Most of that list is obvious. One is not. Rice Wheels is a chicken-flavoured rice snack, and its packet declares milk — nothing in the name says so. That is why the filter now reads the allergen label on the product we track rather than the snack's name. A list written from names would have passed it, and ours did.

${declaredProducts("milk")} of the products we track declare milk on the label. How often the name and the label disagree turned out to be its own subject: [what the allergen labels actually say](/en/blog/allergen-labels-nz-lunchbox-staples).

---

## If Your School Is in Ka Ora, Ka Ako

Some New Zealand schools already provide lunch through [Ka Ora, Ka Ako](https://www.education.govt.nz/our-work/overall-strategies-and-policies/wellbeing-in-education/free-and-healthy-school-lunches), the Ministry of Education's Healthy School Lunches Programme. Where it operates, suppliers must provide "safe options for all children including those with allergens, intolerances", along with ethical and religious diet requirements.

The same page puts the parent's half of it in one sentence: "If your child has an allergy or special diet, notify your school." At a participating school the dairy-free lunch is the programme's job — but only once someone has been told, and the telling is not automatic. That is why it is question three in the note above.

---

## What This Article Does Not Have

Saying this plainly is more useful than filling the gaps with numbers we would have to invent:

- **No calcium figures.** No milligram target appears above, because we have not opened and verified an official New Zealand intake figure against its primary source. A nutrient name we can stand behind; a number needs a source we have actually read.
- **No brand list.** We have not label-checked dairy-free products in a New Zealand store, so no product is named safe here. A list like that is out of date the week after it is written, which is why the labelling section above teaches the label instead.
- **No prices for dairy-free substitute products.** Our price index tracks staples, not specialty items. The cost comparison above is between menus, not between a block of cheese and the thing that replaces it.
- **Whether a dairy-free box comes home empty.** That is a taste question rather than a safety one, and it is the one that actually decides whether any of this worked.

If any of those get measured, they get added here with the date they were taken.

---

## Plan a Dairy-Free Week

The [Kiwi Lunchbox Planner](/en/planner) has the **Dairy Allergy** filter built in. Tick it — on its own, or stacked with nut-free, egg-free or gluten-free — and the week's mains are drawn only from the ${DAIRY_FREE_COUNT} menus above, costed on this week's New Zealand supermarket prices. Snacks go through the same filter — checked against the milk declared on the label of each product we track, as the section above describes — but not against "may contain" warnings, so read the packets yourself if the allergy is a strict one.

[Try the planner →](/en/planner)

---

## References

- Healthify He Puna Waiora (Health Navigator Charitable Trust): *Lactose intolerance | Mate miraka* — [healthify.nz/…/lactose-intolerance](https://healthify.nz/health-a-z/l/lactose-intolerance/) — for the distinction from milk allergy and the small-amounts difference.
- Healthify He Puna Waiora: *Cows' milk allergy* — [healthify.nz/…/cows-milk-allergy](https://healthify.nz/health-a-z/c/cows-milk-allergy/) — for the immune reaction to milk protein and the fast and delayed reaction patterns.
- Food Standards Australia New Zealand: *Food allergies* — [foodstandards.gov.au/consumer/foodallergies](https://www.foodstandards.gov.au/consumer/foodallergies) — for milk being among the allergens that must be declared however small the amount present.
- Food Standards Australia New Zealand: *Allergen labelling for consumers* — [foodstandards.gov.au/consumer/labelling/allergen-labelling](https://www.foodstandards.gov.au/consumer/labelling/allergen-labelling) — for the 25 February 2024 plain English requirements, the bolded "contains" statement, and the unregulated status of "may contain".
- Ministry of Education: *Healthy School Lunches Programme (Ka Ora, Ka Ako)* — [education.govt.nz](https://www.education.govt.nz/our-work/overall-strategies-and-policies/wellbeing-in-education/free-and-healthy-school-lunches) — for the dietary-requirements obligation and the instruction to notify your school.
- [Allergy New Zealand](https://www.allergy.org.nz/) — the national membership organisation for people living with allergies, worth knowing about if a diagnosis is new.

All five source pages above were opened and read on 20 August 2026. No figure in this article comes from a page we did not open.
`,
  },

  "gluten-free-school-lunches-nz": {
    title: "Gluten-Free School Lunches: A Guide for NZ Parents",
    excerpt:
      `Coeliac disease, gluten sensitivity and wheat allergy are three different things. Where crumbs get in, and our ${GLUTEN_FREE_COUNT} gluten-free menus.`,
    date: "August 20, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-10-22",
    image: "/assets/kiwi_gluten_free_burrito_bowl.webp",
    category: "Allergy Friendly",
    author: "Yong Jae Lee",
    body: `
Swapping the bread is the easy part of a gluten-free lunchbox. The hard part is the toaster the ordinary bread went into an hour earlier, the board it was cut on, and the knife that went back into the butter with crumbs still on it. Nothing on the shopping list fixes any of that.

That is what makes this restriction different from the others in the planner. A nut-free or dairy-free box is mostly a question of what you buy; a coeliac-safe box is also a question of how the kitchen was used that morning. So this guide spends most of its length on preparation rather than products.

The practical news first: the planner's **Gluten Allergy** filter leaves ${GLUTEN_FREE_COUNT} of our ${MENU_COUNT} menus standing. But a filter reads an ingredient list, not a kitchen — and before any of that, it matters which of three quite different conditions you are packing for.

---

## Coeliac Disease, Gluten Sensitivity and Wheat Allergy Are Three Things

They get flattened into "gluten-free" on a dietary form, and the flattening is where the trouble starts, because they do not ask the same things of you or the school.

**Coeliac disease** is autoimmune. Healthify He Puna Waiora — the New Zealand health information service run by the Health Navigator Charitable Trust — describes it as ["a permanent autoimmune disorder that causes a reaction to gluten"](https://healthify.nz/health-a-z/c/coeliac-disease/), in which the immune system mistakes gluten for a threat and the lining of the small intestine is damaged in the process. [Coeliac New Zealand](https://coeliac.org.nz/how-to-eat-gluten-free/), the national organisation for people with the condition, puts the consequence plainly: "Coeliacs need strict gluten-free diet for life. Eating even small amounts of gluten can trigger your immune system and cause your symptoms to return."

**Non-coeliac gluten sensitivity** is a different animal. Coeliac New Zealand describes it as ["a set of symptoms that people think is caused by gluten or other proteins within wheat cereal"](https://coeliac.org.nz/non-coeliac-gluten-sensitivity/), and draws the line that decides how strict you have to be: in coeliac disease "any exposure to gluten, irrespective of whether it causes symptoms or not, causes damage to the small intestine", whereas someone with sensitivity "may well be able to tolerate these trace amounts". The same page is blunt about diagnosis — "There is NO specific gluten intolerance test!" — and Healthify says the same thing from the other side: ["There's a blood test to diagnose coeliac disease but there's no blood test for gluten intolerance or sensitivity"](https://healthify.nz/health-a-z/g/gluten-intolerance-or-sensitivity).

**Wheat allergy** is neither of those. It is an allergy, which Healthify defines as ["your immune system overreacting to certain types of protein in your food"](https://healthify.nz/health-a-z/f/food-allergies), and wheat sits on its list of the main foods causing food allergy in Aotearoa New Zealand alongside dairy, egg, fish, peanuts, sesame, shellfish, soy, tree nuts and kiwifruit. Two things follow that matter in a lunchbox. Reactions can be immediate and severe — the same page describes anaphylaxis as "a severe allergic reaction with noisy breathing, swelling of tongue or throat, wheeze or persistent cough, difficulty talking or hoarse voice, dizziness or collapse". And it is often outgrown: "About 80% of children eventually tolerate these foods by 5 years of age."

| | What it is | What a trace does | What the school needs |
|---|---|---|---|
| **Coeliac disease** | A permanent autoimmune disorder | Damages the small intestine whether or not symptoms show | Strict avoidance, and staff who understand that shared food and shared surfaces count |
| **Non-coeliac gluten sensitivity** | Symptoms without the autoimmune damage | Usually tolerated | A line on the dietary form. The stake is comfort |
| **Wheat allergy** | An immune reaction to wheat protein | Can be immediate and, at the severe end, anaphylactic | An allergy action plan, and where any prescribed adrenaline auto-injector is kept |

There is one more wrinkle worth knowing before you shop. Gluten is not only in wheat: Coeliac New Zealand lists it as ["a protein found in the following grains: wheat, barley, rye and oats"](https://coeliac.org.nz/common-sources-of-gluten/). So a wheat-free product is not automatically gluten-free — it can still contain barley — and a gluten-free product is more than a wheat-allergic child strictly needs. Which of the four grains your child actually has to avoid is a question for your GP or allergist, not for a label.

> This article is informational and follows publicly available New Zealand health and food guidance. It is not medical advice, and it is not a diagnosis. Coeliac New Zealand's advice for parents is explicit on one point worth repeating here: **do not remove gluten from your child's diet until they have received a diagnosis by a healthcare professional** — taking it out first makes the test harder to run.

---

## Cross-Contamination Is the Whole Problem

For coeliac disease the threshold is not a portion, it is a trace. That single fact reorganises a morning, because the gluten that reaches the box mostly does not arrive as an ingredient. It arrives as a crumb.

Coeliac New Zealand's [advice on tackling cross contamination](https://coeliac.org.nz/tackling-cross-contamination/) is a short list, and every item on it is a bench-top habit rather than a purchase:

- "Keep all utensils and cutlery separate during the preparation and cooking of gluten-free food."
- "Always use clean surfaces and pots, and pans to cook gluten-free food."
- "Use a clean grill, pan, or toaster bag (these can be purchased from Coeliac New Zealand), when you are making gluten-free toast."
- "Avoid frying gluten-free food in the same oil as food that contains gluten."
- "When cooking gluten-free pasta, do not use the same water as pasta containing gluten."
- At a barbecue: "Make sure separate tongs are used on your food."

The organisation's own [advice sheet for childcare providers and schools](https://coeliac.org.nz/wp-content/uploads/2019/07/Advice-for-Childcare-Providers.pdf) compresses the same thing into four numbered steps, which is a useful shape for a note home because it is short enough that a busy teacher will read it.

Three places in a family kitchen deserve naming, because they are the ones that survive an otherwise careful morning:

**The toaster.** A pop-up toaster that has ever had ordinary bread in it is a crumb reservoir with a heating element. The gluten-free slice goes in clean and comes out otherwise. This is the one that a separate appliance or a toaster bag actually solves.

**The board and the knife.** Cutting a wheat sandwich and then a gluten-free one on the same board, with the same knife, moves crumbs from the first to the second. Doing the gluten-free one first, on a clean board, is free.

**The jar.** A knife that has been in the bread goes back into the butter, the peanut butter, the jam, the Marmite. Every later spoonful carries what it left behind. Separate jars for the gluten-free box cost nothing but a second lid.

And then there is the half of the day you do not control. Shared kai, a birthday cupcake, a classmate's offer of half a sandwich, and the food that turns up in a classroom activity. The Coeliac New Zealand schools sheet covers the last of these in a way almost nothing else does: "Gluten cannot be absorbed through the skin so paints, crayons and glues should not be a problem", but dried pasta used for art "may be a tempting snack for small children" so gluten-free pasta or close supervision is advised — "This is also true for playdough, so it is advisable that gluten free playdough is used." That advice is worth one line in the note to the teacher, because nobody thinks of the craft cupboard as food.

---

## The ${GLUTEN_FREE_COUNT} Menus That Need No Gluten at All

Ticking **Gluten Allergy** in the planner narrows the library to ${GLUTEN_FREE_COUNT} of ${MENU_COUNT} menus. The first few, straight from the data: ${glutenFreeList()}.

That list is generated rather than curated, so it is not shaped around any other restriction — the filters stack, and the table below is how you tell in advance whether stacking two of them empties the week.

**Not one of the ${GLUTEN_FREE_COUNT} lists wheat, barley or rye — or ordinary bread, pasta, flour, oats, crackers or wraps — among its ingredients.** Where one of those foods does appear, the data names the substitute instead: ${glutenSubstituteIngredients()}.

| Of the ${GLUTEN_FREE_COUNT} gluten-free menus | How many |
|---|---|
| Also nut-free | ${glutenFreeCountWhere((m) => m.is_nut_free === true)} |
| Also dairy-free | ${glutenFreeCountWhere((m) => m.is_dairy_free === true)} |
| Also egg-free | ${glutenFreeCountWhere((m) => m.is_egg_free === true)} |
| Also vegetarian | ${glutenFreeCountWhere((m) => m.is_vegetarian === true)} |
| Also thermos-friendly | ${glutenFreeCountWhere((m) => m.is_thermos === true)} |

The ones that need no cooking at all, for the mornings that have gone wrong before they started:

${glutenFreeNoCookBullets()}

> **A gluten-free flag is not a gluten-free kitchen.** The filter reads the ingredients of a recipe. It knows nothing about the toaster you make it in, the board you cut it on, or which brand of stock or sauce you reach for — and it cannot see what a manufacturer changed last month. For a coeliac child, every menu here is a starting point that still needs your own label check and your own preparation. It is not a safe meal delivered.

An example of exactly that gap, from this list. **Sushi Rolls** is on it, and its ingredients are rice, nori, a filling and mayonnaise — none of them gluten. The soy sauce that someone adds at the table is not in the recipe, and soy sauce is on Coeliac New Zealand's list of foods that commonly contain gluten. The filter reads the recipe; it cannot read the table.

Oats are a different kind of edge, and we have settled it in the data rather than footnote it here. Coeliac New Zealand defines the diet as "the removal of wheat, barley, oats and rye from a person's diet" — oats included — so a lunch built on oats is not a gluten-free lunch by that definition, whatever the packet it came in says. ${glutenFreeOatSentence()} If your specialist has told you that oats are fine for your child, that is a conversation to keep having with the specialist; it is not a setting to change here.

There is a pattern in the full list worth naming, because it changes what you shop for. What survives the filter is mostly rice, corn, legumes, eggs and meat: the dishes whose cuisines never leaned on wheat in the first place. What fails is the sandwich, the wrap, the pasta and the baking. The shortest route to a gluten-free week is not to buy gluten-free versions of what you already packed.

---

## Where Gluten Hides in a New Zealand Trolley

Coeliac New Zealand's page on [common sources of gluten](https://coeliac.org.nz/common-sources-of-gluten/) says flatly that "many processed foods can contain hidden gluten", and its list is the useful part, because most of it is not food anyone would call bready:

- **Sausages, saveloys, cocktail sausages, luncheon meats and deli meats** — binders and fillers.
- **Stocks, soups, gravy and pasta or mince sauces.**
- **Soy sauce**, which is the one that catches sushi, stir-fries and marinades.
- **Baked beans**, breakfast cereals including corn flakes and rice bubbles, chips and crisps, hot chips, imitation seafood, marinated meat, dry roasted nuts and lollies.

Two New Zealand specifics that surprise people. The organisation's schools advice sheet lists **Marmite and Vegemite** among the foods to avoid, and its list of gluten sources includes malt and brewer's yeast. In a country where those are staple spreads, that is worth saying out loud. And going the other way, the same sheet says **maltodextrin, glucose syrup and dextrose** are gluten-free "even if the label says 'from wheat'", because they are processed to the point where no gluten can be detected. That one saves a lot of unnecessary shelf-anxiety.

---

## What the Label Has to Tell You

Cereals containing gluten are among the allergens that must be declared under the Australia New Zealand Food Standards Code. Food Standards Australia New Zealand (FSANZ) is specific about the wording: ["If a cereal containing gluten such as wheat, barley, oats and rye, (including hybrids of these cereals such as triticale) is present, the label will need to identify this in the summary statement using the word 'gluten'"](https://www.foodstandards.gov.au/consumer/labelling/allergen-labelling).

Since February 2024 that declaration has had to be in plain English. FSANZ's rules require "a bolded, separate allergen summary statement starting with the word 'contains'" near the ingredient list. So on a current label, a **Contains gluten** line is a genuine shortcut — if a gluten-containing cereal is an ingredient, it has to be there, in that word.

The other kind of statement is not the same kind of thing. FSANZ is explicit that "may contain" lines "are voluntary statements made by food suppliers and the Food Standards Code does not regulate them". A may-contain is therefore neither proof of risk nor proof of safety, and how much of it your child can live with is a question for your allergist rather than for a packet. Our [nut-free article](/en/blog/nut-free-school-lunches-new-zealand) makes the same point about nuts, and our [dairy-free article](/en/blog/dairy-free-school-lunches-nz) about milk.

Above the label there is a certification mark. Coeliac New Zealand runs the [Crossed Grain logo](https://coeliac.org.nz/crossed-grain-logo/), which it describes as "a certified trademark owned by Coeliac New Zealand for the certification of products produced and licensed in New Zealand". Products carrying it "have been reviewed and approved by Coeliac New Zealand as part of our certification programme", are re-verified "every 12 months, including random audit testing", and — the sentence that matters — "In New Zealand, gluten free products are tested to have no detectable gluten according to the FSANZ (Food Standards Australia and New Zealand) guidelines."

---

## What Gluten-Free Actually Costs Here

This is the one part of the subject where a general answer is useless, so here are pairs, costed against the supermarket prices behind our [NZ Lunchbox Price Index](/en/price-index). These are the price of one retail pack as we last read it in ${ironPriceMonth()}, not a per-serve figure:

| Staple | Ordinary | Gluten-free | Difference |
|---|---|---|---|
${glutenSwapTableMarkdown()}

The worst of them is the ${biggestGlutenSwapSentence()}. That is the swap that hurts, because bread is the daily one. Not every line runs that way — ${glutenSwapExceptionSentence()} — and where a gluten-free line is not dearer, the price feed alone cannot tell us why, so this article does not guess.

Now the same question asked of whole lunches instead of products. Costed across our menus, ${glutenCostSentence()}. At the median, the restriction is close to free.

Both of those are true at once, and the gap between them is the practical advice. Rebuilding your existing lunchbox out of substitute products is expensive, one pack at a time. Cooking from the part of the library that was never made of wheat is not.

---

## The Snack Side Is Easier Than the Main

Worth saying, because it runs against the feel of the thing: the snack is not where gluten-free bites.

Turn the gluten filter on and ${snackPool("Gluten Allergy").kept} of ${snackPool("Gluten Allergy").total} snacks survive. Only ${droppedList("Gluten Allergy")} drop out — fruit, vegetables, rice crackers, popcorn, chickpeas and hummus were never made of wheat.

The main is the opposite. ${GLUTEN_FREE_COUNT} of ${menuTotal()} menus qualify, the tightest of the five allergy filters — only the Vegan diet filter (${ALL_MENUS.filter((m) => m.is_vegan === true).length}) and the thermos-only switch (${THERMOS_COUNT}) leave fewer — and ${declaredProducts("gluten")} of the products we track declare gluten, more than any other allergen we follow (milk is next, at ${declaredProducts("milk")}).

So the effort is not evenly spread. Fill the snack half from the produce aisle and it mostly takes care of itself; the main is where the reading, the substitution and the cost all land. That is also why the cross-contamination section above matters more here than in any other diet on this site. Where a name and a label disagree is [its own article](/en/blog/allergen-labels-nz-lunchbox-staples).

---

## What to Tell the School

Schools act on what is written on the dietary form, and "gluten-free" on its own does not tell them whether a shared birthday cupcake is a medical problem or a disappointment. Our [allergy management guide](/en/guides/allergy-management-school-lunchbox-nz) walks the same ground for every major allergen, and the [school lunchbox policy guide](/en/guides/school-lunchbox-policy-guide-nz) covers the other restrictions that usually sit alongside this one.

**A note worth sending in week one.** Adapt the bracketed parts and delete what does not apply:

> Kia ora,
>
> [Child's name] in Room [x] eats gluten-free. It is [coeliac disease / gluten sensitivity / a wheat allergy], which means [even traces from shared surfaces are a problem / small amounts are usually fine / wheat must be avoided and a reaction can be fast].
>
> Could you let me know:
>
> 1. Whether the class has regular food activities — baking, shared kai, class parties — so I can send an alternative on those days;
> 2. Whether pasta or playdough is used for art or play in the classroom, since both are usually wheat;
> 3. [If coeliac or allergy] Where our action plan is kept, and which staff have seen it;
> 4. Whether the school takes part in Ka Ora, Ka Ako, and if so how dietary requirements are recorded for it.
>
> Ngā mihi

That last question is not a formality. Some New Zealand schools provide lunch through [Ka Ora, Ka Ako](https://www.education.govt.nz/our-work/overall-strategies-and-policies/wellbeing-in-education/free-and-healthy-school-lunches), the Ministry of Education's Healthy School Lunches Programme, where suppliers "must provide safe options for all children including those with allergens, intolerances, ethical or religious diet requirements". The same page puts the parent's half of it in one line: "If your child has an allergy or special diet, notify your school." At a participating school the gluten-free lunch is the programme's job — but only after someone has been told, and the telling is not automatic.

If hot food is the plan for winter, ${glutenFreeCountWhere((m) => m.is_thermos === true)} of the gluten-free menus are built to travel in a flask; our [thermos article](/en/blog/thermos-hot-lunches-nz-winter) covers how that morning works.

---

## What This Article Does Not Have

Saying this plainly is more useful than filling the gaps with numbers we would have to invent:

- **No prevalence figure for New Zealand.** Coeliac New Zealand says "International research indicates there could be up to 100,000 people in our NZ team of 5 million with coeliac disease and of those 30,000 are likely to be children under the age of 18" — but that is an estimate extrapolated from overseas research, and this article will not restate it as a measured New Zealand rate.
- **No brand list.** We have not label-checked gluten-free products in a New Zealand store, so no product is named safe here. A list like that is out of date the week after it is written, which is why the labelling section teaches the label instead.
- **No parts-per-million threshold.** The FSANZ testing standard is quoted above through Coeliac New Zealand's own wording; we have not opened the Food Standards Code clause itself, so no number appears.
- **No claim that our filter is coeliac-safe.** It reads ingredient lists. Preparation, cross-contamination and manufacturer reformulation are all outside what it can see.
- **Whether a gluten-free box comes home empty.** That is a taste question rather than a safety one, and it is the one that actually decides whether any of this worked.

If any of those get measured, they get added here with the date they were taken.

---

## Plan a Gluten-Free Week

The [Kiwi Lunchbox Planner](/en/planner) has the **Gluten Allergy** filter built in. Tick it — on its own, or stacked with nut-free, dairy-free or egg-free — and the week's mains are drawn only from the ${GLUTEN_FREE_COUNT} menus above, costed on this week's New Zealand supermarket prices. Snacks are filtered by it too — ${snackPool("Gluten Allergy").kept} of ${snackPool("Gluten Allergy").total} stay in — but it reads ingredient names, not packets, so the label check is still yours.

[Try the planner →](/en/planner)

---

## References

- Healthify He Puna Waiora (Health Navigator Charitable Trust): *Coeliac disease* — [healthify.nz/…/coeliac-disease](https://healthify.nz/health-a-z/c/coeliac-disease/) — for coeliac disease as a permanent autoimmune disorder.
- Healthify He Puna Waiora: *Gluten intolerance or sensitivity* — [healthify.nz/…/gluten-intolerance-or-sensitivity](https://healthify.nz/health-a-z/g/gluten-intolerance-or-sensitivity) — for there being a blood test for coeliac disease and none for sensitivity.
- Healthify He Puna Waiora: *Food allergies* — [healthify.nz/…/food-allergies](https://healthify.nz/health-a-z/f/food-allergies) — for wheat among the main NZ food allergens, the definition of a food allergy, the description of anaphylaxis, and the 80%-by-five figure.
- Coeliac New Zealand: *How to eat gluten free* — [coeliac.org.nz/how-to-eat-gluten-free](https://coeliac.org.nz/how-to-eat-gluten-free/) — for the strict, lifelong diet and small amounts triggering the immune system.
- Coeliac New Zealand: *Non-coeliac gluten sensitivity* — [coeliac.org.nz/non-coeliac-gluten-sensitivity](https://coeliac.org.nz/non-coeliac-gluten-sensitivity/) — for the trace-tolerance difference and the absence of a test.
- Coeliac New Zealand: *Common sources of gluten* — [coeliac.org.nz/common-sources-of-gluten](https://coeliac.org.nz/common-sources-of-gluten/) — for the four gluten grains and the hidden-source list.
- Coeliac New Zealand: *Tackling cross contamination* — [coeliac.org.nz/tackling-cross-contamination](https://coeliac.org.nz/tackling-cross-contamination/) — for the utensils, surfaces, toast, oil, pasta water and barbecue tongs advice.
- Coeliac New Zealand: *Advice for childcare providers/schools* (PDF) — [coeliac.org.nz/…/Advice-for-Childcare-Providers.pdf](https://coeliac.org.nz/wp-content/uploads/2019/07/Advice-for-Childcare-Providers.pdf) — for the four cross-contamination steps, the playdough and pasta-art advice, Marmite and Vegemite, and the maltodextrin exception.
- Coeliac New Zealand: *Crossed Grain logo* — [coeliac.org.nz/crossed-grain-logo](https://coeliac.org.nz/crossed-grain-logo/) — for the certification programme, the annual audit, and no detectable gluten under FSANZ guidelines.
- Coeliac New Zealand: *Children with coeliac disease* — [coeliac.org.nz/children-with-coeliac](https://coeliac.org.nz/children-with-coeliac/) — for not removing gluten before diagnosis.
- Coeliac New Zealand: *What is coeliac disease* — [coeliac.org.nz/what-is-coeliac-disease](https://coeliac.org.nz/what-is-coeliac-disease/) — for the estimated New Zealand numbers quoted as an estimate.
- Food Standards Australia New Zealand: *Allergen labelling for consumers* — [foodstandards.gov.au/consumer/labelling/allergen-labelling](https://www.foodstandards.gov.au/consumer/labelling/allergen-labelling) — for the word "gluten" in the summary statement, the plain English requirements, the bolded "contains" statement, and the unregulated status of "may contain".
- Ministry of Education: *Healthy School Lunches Programme (Ka Ora, Ka Ako)* — [education.govt.nz](https://www.education.govt.nz/our-work/overall-strategies-and-policies/wellbeing-in-education/free-and-healthy-school-lunches) — for the dietary-requirements obligation and the instruction to notify your school.

Every source page above was opened and read on 20 August 2026. No figure in this article comes from a page we did not open.
`,
  },
  "no-cook-lunchbox-ideas-nz": {
    title: "No-Cook School Lunches: NZ Ideas With No Stove",
    excerpt:
      `The planner's no-cook filter leaves ${NO_COOK_COUNT} menus that never meet a stove — and why skipping the cooking does not let you skip the ice pack.`,
    date: "August 20, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-29",
    image: "/assets/kiwi_marmite_cheese_sandwich.webp",
    category: "Routines",
    author: "Yong Jae Lee",
    body: `
Three prep styles sit in the planner's sidebar, and only one of them is a promise about appliances. **Make-ahead** means the cooking happened last night. **Cook-fresh** means it happens this morning. **No-cook** means it does not happen at all — no hob, no oven, no kettle, no reheating, on any day, by anyone.

That is a narrower promise than it sounds, and a more useful one for being narrow. It is also the one most easily misread as a safety claim, which it is not. Taking the stove out removes a task from the morning. It does not remove the ice pack from the bag.

Ticking **No-cook** leaves ${NO_COOK_COUNT} of our ${MENU_COUNT} menus standing. What follows is what those ${NO_COOK_COUNT} have in common, what they do not, and where this article stops because we have not measured the thing it would need to keep going.

---

## Where No-Cook Sits Next to Batch Cooking

The library splits three ways: ${NO_COOK_COUNT} no-cook, ${prepStyleCount("make-ahead")} make-ahead, ${prepStyleCount("cook-fresh")} cook-fresh. The first two get confused constantly, because both of them empty the morning. They are different ideas and they fail in different ways.

**Batch cooking is about *when* you cook.** The stove is still involved; it has been moved to a time when you are not also finding a PE uniform. The saving is real and it comes mostly from pack sizes rather than from bulk technique — our [batch cooking article](/en/blog/batch-cooking-save-money-nz) works that out per serve. The costs are real too: a session has to be scheduled, containers have to be labelled, and food has to survive a fridge or a freezer without turning into something your child will refuse.

**No-cook is about *whether* you cook.** There is no session to schedule, nothing to reheat, nothing that has to come back from a freezer with its texture intact. The work moves from the kitchen to the trolley — a no-cook week is bought more than it is made, so the shopping list carries the weight that the Sunday session carries in the other model.

It is worth noticing that the standard NZ advice for saving lunchbox time is the *other* route. The Heart Foundation of New Zealand's time-saving tips say: "Cook extra at dinner and use leftovers, or use your days off to batch cook items that can go in the fridge or freezer." That is good advice, and it assumes there is a cooking session somewhere to borrow from. This article is for the weeks when there is not one.

One line in the data marks the far boundary: **not one of the ${NO_COOK_COUNT} is thermos-friendly.** A flask lunch is a cooked meal by definition, which is why [thermos lunches](/en/blog/thermos-hot-lunches-nz-winter) are the opposite end of the same problem. Nothing sits in both groups, so the two filters never stack.

---

## The ${NO_COOK_COUNT} Menus That Never Meet a Stove

The first few, straight from the data: ${noCookList()}.

The full list is generated rather than curated, so it is not shaped around any other restriction:

${noCookBullets()}

Filters stack, and the table below is how you tell in advance whether adding a second one empties the week:

| Of the ${NO_COOK_COUNT} no-cook menus | How many |
|---|---|
| Also nut-free | ${noCookCountWhere((m) => m.is_nut_free === true)} |
| Also egg-free | ${noCookCountWhere((m) => m.is_egg_free === true)} |
| Also vegetarian | ${noCookCountWhere((m) => m.is_vegetarian === true)} |
| Also dairy-free | ${noCookCountWhere((m) => m.is_dairy_free === true)} |
| Also gluten-free | ${noCookCountWhere((m) => m.is_gluten_free === true)} |

Two things are worth reading off that list before anything else. The first is how much of it is bread — sandwiches, wraps, rolls, bagels, pita. Assembly without heat is what bread is *for*, and a stove-free week that refuses bread is a much shorter list than this one. The second is the thing the filter's name quietly does not say, which is the whole of the next section.

---

## No Cooking Is Not No Chilling

Here is the number that matters most in this article, and it cuts against the filter's own name:

**${noCookChillCount()} of the ${NO_COOK_COUNT} no-cook menus list meat, fish, mayonnaise, cheese or yoghurt among their ingredients.**

Those are the same foods our [Term 1 heat guide](/en/blog/lunchbox-food-safety-nz-term-1-heat) puts in its highest-risk group. Not cooking them changes nothing about how they behave in a school bag between 7:30am and lunchtime. The temperature rules and the two-hour clause live in that article, sourced there — this one deliberately does not restate them, because a number restated from memory is exactly how two pages on one site end up disagreeing.

There is a second thing that changes when the stove drops out, and it is easier to miss. Healthify He Puna Waiora — the New Zealand health information service run by the Health Navigator Charitable Trust — lists among the [common causes of foodborne illness](https://healthify.nz/hauora-wellbeing/f/food-safety) both "storing food for too long and at the wrong temperature" and "cross-contaminating ready-to-eat foods with raw foods". A no-cook lunchbox is made *entirely* of ready-to-eat food. There is no later heating step to fall back on, so whatever is picked up at the bench travels the whole way to the classroom.

Healthify's bench advice follows straight from that, and it is the part of a no-cook morning that actually needs care rather than time:

- "Use different chopping boards for raw meat, seafood, and ready-to-eat foods such as salads and cheese. If you only have 1 chopping board wash it in hot, soapy water, and dry it well before using it for other food."
- "Wash and dry fresh fruit and vegetables and remove any damaged parts before eating them."
- "Wash your hands with soap and clean water."
- On anything you are unsure about: "When in doubt, throw it out."

The ${noCookAmbientCount()} menus that carry none of the meat, fish, mayonnaise, cheese or yoghurt ingredients above:

${noCookAmbientBullets()}

Read that list for what it is: a statement about ingredient lists, not a food-safety clearance. Hummus and falafel still want a cold bag, and a fruit box in a 30°C classroom can be a quality problem long before it is a safety one. What the list does tell you is that the shortest route to a lunch that tolerates a warm afternoon runs through the same part of the library as the shortest route to a lunch that tolerates a missing stove — legumes, spreads, bread and fruit rather than deli meat and dairy.

---

## Where the Work Actually Goes

No-cook does not mean no work. It means the work changes shape.

Nothing here needs heat, so nothing here needs watching. What is left is buying, washing, slicing and assembling — tasks that can be interrupted halfway and picked up again, which is a genuinely different tolerance from a pot that has to come off the element at the right moment. That, rather than a number of minutes, is the honest description of what the filter buys you.

Which of these can be assembled the night before is a texture question, and it varies by menu rather than by rule. A dry filling against firm bread, a box of cut vegetables and a sealed dip behave very differently overnight from a dressed salad or a wet filling sitting on soft bread. The planner does not model that, and we have not tested it dish by dish, so the only useful advice is to find out with one menu at a time rather than committing a week to it.

The Heart Foundation's other two tips apply here without any cooking attached: "Take 10 minutes to plan each week", and "Many families rotate a few go-to lunches rather than trying to come up with new ideas every day." Rotation is what makes a stove-free week survive contact with a Wednesday — the decision gets made once, on the shopping list, and the mornings stop being decisions at all.

---

## Can a Lunchbox Be Complete Without a Stove?

The Heart Foundation asks for the same four groups every day: "Fruit and vegetables", "Grain food (wholemeal or whole grain)", "Dairy food", and "Proteins such as legumes, fish, seafood, eggs, poultry and meat". On top of that sits one proportion rule, which is the only instruction in their guidance shaped like a measurement: "Aim to fill half your lunchbox with colourful vegetables and fruit."

None of the four groups needs a stove to reach. Their own examples make the point — under fruit and vegetables they list apple, banana, canned fruit, carrot, celery or capsicum sticks, cucumber slices, grapes, kiwifruit and mandarin; under grain foods, crackers, sandwiches and wraps; under dairy, cottage cheese, cheese and yoghurt; under proteins, baked beans and tuna. A trolley can satisfy all four.

The gap a no-cook week has to watch is the vegetable half, because a sandwich is a grain-and-protein delivery system and it is easy to stop there. That is a packing habit rather than a filter setting: the planner's prep styles apply to the main only, and snacks come from a separate list that the prep filter does not touch, so the fruit and vegetable half of the box is yours to check either way.

The Heart Foundation's own closing line is the right proportion to hold all of this in: "And remember, healthy eating isn't about strict rules. What matters most is the overall pattern of eating over time."

---

## Does Skipping the Stove Cost You?

No, and it is worth having the number rather than the assurance.

${NO_COOK_COUNT} of our ${menuTotal()} menus never meet a stove. Costed against the prices behind our [NZ Lunchbox Price Index](/en/price-index), a no-cook main ${costClause("no-cook")} — median ${dietMoney("no-cook").inMedian} against ${dietMoney("no-cook").outMedian} for everything else.

That is close enough that the honest reading is "the same". No-cook is not the expensive convenience option, and it is not the cheap corner-cutting one either. It buys you the morning, not money.

The snack half sits outside this comparison. The prep-style filter applies to mains only, and the snack list is not a no-cook list — a boiled egg, for one, needs a pot.

---

## What This Article Does Not Have

Saying this plainly is more useful than filling the gaps with numbers we would have to invent:

- **No minutes.** Nobody here has timed a no-cook morning against a cook-fresh one, so no "saves you N minutes" figure appears. The claim in this article is about the *shape* of the work, not its duration.
- **No temperature figures.** Deliberate. They belong to the [Term 1 heat guide](/en/blog/lunchbox-food-safety-nz-term-1-heat), which sources its rules, and restating them here is how a site ends up contradicting itself.
- **No claim that a no-cook menu is safe in a hot bag.** The prep-style tag describes how a recipe is made. It knows nothing about how it travels, what brand of mayonnaise went in, or whether the bag had an ice pack.
- **No overnight-assembly test.** Which of these hold up when built the night before is exactly the question a parent wants answered, and it is the one we have not run.

If any of those get measured, they get added here with the date they were taken.

---

## Plan a No-Cook Week

The [Kiwi Lunchbox Planner](/en/planner) has the **No-cook** prep style built in. Tick it — on its own, or stacked with nut-free, dairy-free, egg-free or gluten-free — and the week's mains are drawn only from the ${NO_COOK_COUNT} menus above, costed on this week's New Zealand supermarket prices. Snacks come from a separate list and are not filtered by prep style, so check those yourself.

[Try the planner →](/en/planner)

---

## References

- Heart Foundation New Zealand: *Healthy lunchbox ideas for school and work* — [heartfoundation.org.nz](https://www.heartfoundation.org.nz/about-us/news/blogs/healthy-lunchbox-ideas-for-school-and-work) — for the four food groups and their examples, the half-the-lunchbox proportion rule, the cook-extra-and-batch-cook time-saving tip, the ten-minute planning and rotation tips, and the closing line about strict rules.
- Healthify He Puna Waiora (Health Navigator Charitable Trust): *Food safety* — [healthify.nz/…/food-safety](https://healthify.nz/hauora-wellbeing/f/food-safety) — for the common causes of foodborne illness including cross-contamination of ready-to-eat foods, the chopping-board advice, the produce-washing and hand-washing advice, and "when in doubt, throw it out".

Both source pages above were opened and read on 20 August 2026. No figure in this article comes from a page we did not open, and every menu name and count on this page is generated from our own menu data rather than typed in.
`,
  },
};

/**
 * 읽기 시간은 본문에서 만든다 — 항목에 적힌 값이 있어도 덮어쓴다(`lib/readTime.ts` 참조).
 */
export const POSTS = withReadTime(RAW_POSTS);

export const BLOG_SLUGS = Object.keys(POSTS);

export const BLOG_CARDS = Object.entries(POSTS).map(([slug, post]) => ({
  slug,
  title: post.title,
  excerpt: post.excerpt,
  date: post.date,
  readTime: post.readTime,
  image: post.image,
  category: post.category,
}));
