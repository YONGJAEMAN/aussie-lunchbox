import { withReadTime } from "@/lib/readTime";
import { perItemLabel, batchLabel, type RecipeItem } from "@/lib/recipeCost";
import { warnsAbout } from "@/lib/allergenLabels";
import { PROMO_WEEK_COUNT, firstWeek, lastWeek, prettyDate, produceWeeksTableMarkdown, produceTopSentence, produceRareList } from "@/lib/promoHistory";
import menuDataJson from "@/data/menuData.json";
import priceIndexJson from "@/data/priceIndex.json";
import { winnerTally, woolworthsCheaperClause, firstRoundDate } from "@/lib/priceIndexCompare";
import { PLANNER_CATEGORIES, EXCLUDED_CATEGORY } from "@/lib/snackEconomics";
import {
  CHOKING_SOURCE, EXCLUDE_CATEGORIES, EXCLUDE_INGREDIENTS, EXCLUDE_SNACKS, ALTER_CATEGORIES, ALTER_INGREDIENTS, PREPS,
  menuExclusion, kindyExcludedMenus, kindyExcludedSnacks, type PrepId,
} from "@/lib/chokingRisk";
import enMessages from "@/messages/en.json";
import { bandFactorLabel, PORTION_BAND_SOURCE } from "@/lib/portionBands";

type MenuRow = {
  ingredients?: string[]; is_nut_free?: boolean; is_vegetarian?: boolean; is_vegan?: boolean;
  is_dairy_free?: boolean; is_egg_free?: boolean;
};
const menuRowCount = (f: (m: MenuRow) => boolean) =>
  (menuDataJson as unknown as { MENU_DATA: { en: MenuRow[] } }).MENU_DATA.en.filter(f).length;
import {
  THERMOS_COUNT,
  MENU_COUNT,
  NO_COOK_COUNT,
  MAKE_AHEAD_COUNT,
  COOK_FRESH_COUNT } from "@/lib/menuCounts";
import {
  money,
  packPrice,
  servePrice,
  budgetWeekRows,
  budgetWeekTotalLabel,
  serveLabel,
  multipleWord,
  isMultiple,
  pctMore,
  joinList,
  priceMonth,
  packSize,
  serveSize,
  cheeseVsProteinsClause,
  boxMedianLabel,
  boxFloorLabel,
  boxCeilingLabel,
  boxUnderCount,
  approxMoney,
  vegPctLess,
  vegSaving,
  vegTermSaving,
  vegYearSaving,
  vegMedian,
  meatMedian,
  veganMedian,
  SCHOOL_YEAR_DAYS,
} from "@/lib/servePrice";

/**
 * 단백질 재료의 팩값과 1인분 값. 「식물성이 싸다」를 **추적 데이터로** 말하기 위한 표.
 *
 * 🔴 원래 여기엔 「100g 단백질당 가격」 표가 손으로 적혀 있었다(~$1.20 · ~$5.50 …).
 *    출처도 날짜도 없었고, 식품별 단백질 함량은 이 사이트가 재는 값이 아니다.
 *    재지 않는 축으로 정규화한 숫자는 남의 값을 출처 없이 옮긴 것이다.
 */
const PROTEIN_KEYS = [
  "Red Lentils", "Chickpeas", "Peanut Butter", "Eggs",
  "Cheese", "Canned Tuna", "Tofu", "Chicken Breast",
];

function proteinCostTable(): string {
  return PROTEIN_KEYS.map((k) => ({ k, serve: servePrice(k) }))
    .sort((a, b) => a.serve - b.serve)
    .map(({ k, serve }) => `| ${k} | ${packSize(k)} | ${money(packPrice(k))} | ${serveSize(k)} | ${money(serve)} |`)
    .join("\n");
}

/* ────────────────────────────────────────────────────────────────────────────
 * 네 가지 식품군 표 — `data/price_cache.json`에서 생성한다.
 *
 * 🔴 2026-08-20까지 여덟 칸이 전부 손으로 적혀 있었고 절반이 캐시와 달랐다:
 *    닭가슴살 $3.08(실제 $2.56), 살라미 39c(35c), 요거트 99c(93c), 베이글 92c($1.06),
 *    쌀 28c(33c). 그 위에 세워 둔 문장들도 같이 틀려 있었다 —
 *    "여덟 배"(실제 7배), "합계 약 $1.05"(실제 $1.06), "병아리콩 74c"(30c).
 *
 * 🔴 `@/lib/siteCounts`를 import하지 말 것 — 순환이 닫혀 사이트가 죽는다.
 *    `@/lib/servePrice`는 `@/data`와 `@/lib/planConfig`만 보므로 안전하다.
 *    (`lib/contentClaims.test.ts`가 guides를 먼저 로드해서 확인한다.)
 * ──────────────────────────────────────────────────────────────────────────── */

/** 라벨은 사람이 정하고, 두 금액은 캐시에서 온다. */
const FOOD_GROUPS: {
  group: string;
  cheapLabel: string;
  cheapKey: string;
  dearLabel: string;
  dearKey: string;
}[] = [
  { group: "Protein", cheapLabel: "Sliced salami", cheapKey: "Salami",
    dearLabel: "Chicken breast", dearKey: "Chicken Breast" },
  { group: "Dairy / calcium", cheapLabel: "Milk", cheapKey: "Milk",
    dearLabel: "Yoghurt (1kg tub)", dearKey: "Yoghurt" },
  { group: "Fruit & veg", cheapLabel: "Carrot sticks", cheapKey: "Carrot",
    dearLabel: "Grapes", dearKey: "Grapes" },
  { group: "Grains", cheapLabel: "Microwave rice", cheapKey: "Rice",
    dearLabel: "Bagel", dearKey: "Bagel" },
];

const foodGroupRows = () =>
  FOOD_GROUPS.map((g) => ({
    ...g,
    cheap: servePrice(g.cheapKey),
    dear: servePrice(g.dearKey),
  }));

function foodGroupTableMarkdown(): string {
  return foodGroupRows()
    .map(
      (r) =>
        `| ${r.group} | ${r.cheapLabel} | **${serveLabel(r.cheap)}** | ${r.dearLabel}, ${serveLabel(r.dear)} |`,
    )
    .join("\n");
}

/** 표의 싼 쪽을 다 더한 값. 손으로 적으면 표가 움직여도 합계만 안 따라온다. */
const cheapestBoxTotal = () =>
  money(foodGroupRows().reduce((t, r) => t + r.cheap, 0));

/**
 * 각 행의 **중간값**을 고른 도시락.
 * 🔴 여기엔 "Even choosing mid-range from each group lands around $2"라고 적혀 있었다.
 *    표에서 계산 가능한 유일한 읽기(행마다 (싼 쪽+비싼 쪽)/2)로는 $3.55다 — 거의 두 배 차이다.
 *    바로 아래 문장이 "$4 이상이면 특정 선택 때문"이라고 말하므로, 이 값이 틀리면 논증이 통째로 무너진다.
 */
const midpointBoxTotal = () =>
  money(foodGroupRows().reduce((t, r) => t + (r.cheap + r.dear) / 2, 0));

/** 닭가슴살이 살라미·계란의 몇 배인지. 배수도 데이터에서 만든다. */
function chickenMultipleSentence(): string {
  const chicken = servePrice("Chicken Breast");
  // 🔴 1.5배 미만은 배수로 말하지 않는다 — 반올림하면 1.18배도 "double"이 된다.
  const versus = (key: string) => {
    const ratio = chicken / servePrice(key);
    return isMultiple(ratio) ? `${multipleWord(ratio)} what` : `${pctMore(ratio)} than what`;
  };
  return (
    `Chicken breast at ${serveLabel(chicken)} a serve costs ` +
    `${versus("Salami")} sliced salami does, ` +
    `and roughly ${versus("Eggs")} an egg does.`
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 스낵 가이드의 레시피 원가 — **레시피에 적힌 그램 수**에서 만든다.
 *
 * 🔴 2026-08-23 오전에 이 네 값을 지웠다("약 $0.15/개"). 지운 이유는 분량이 아니라
 *    **팩 크기가 확인돼 있지 않아서**였다 — 밀가루·바나나·코코넛오일이 비어 있었다.
 *    같은 날 오후에 상품 API로 확인해 `PORTION_BASIS`에 넣고 되살렸다.
 *    확인해 보니 옛 값들은 실제의 1/2~1/3이었다(머핀 15c → **50c**).
 *
 * 🔴 여기 적는 그램 수는 **본문에 그대로 실리는 값**이어야 한다. 본문이 컵을 적고
 *    여기서 몰래 그램으로 바꾸면 독자가 검산할 수 없다.
 * ──────────────────────────────────────────────────────────────────────────── */
/**
 * 🔴 **export한다.** 가드가 이 정의와 본문을 대조해야 하기 때문이다 —
 *    내보내지 않으면 "본문엔 80g, 계산엔 800g"이 조용히 통과한다(실제로 통과했다).
 */
export const RECIPES: Record<string, { makes: number; items: RecipeItem[] }> = {
  muffins: {
    makes: 12,
    items: [
      ["Banana", 240, "g"], ["Butter", 80, "g"], ["Honey", 90, "g"], ["Eggs", 1, "ea"],
      ["Vanilla Essence", 5, "ml"], ["Rolled Oats", 135, "g"], ["Plain Flour", 125, "g"],
      ["Baking Powder", 5, "g"], ["Baking Soda", 3, "g"], ["Cinnamon", 1.5, "g"],
    ],
  },
  scones: {
    makes: 10,
    items: [["Flour", 250, "g"], ["Butter", 30, "g"], ["Cheese", 100, "g"], ["Milk", 190, "ml"]],
  },
  bites: {
    makes: 20,
    items: [
      ["Rolled Oats", 135, "g"], ["Desiccated Coconut", 37, "g"], ["Honey", 120, "g"],
      ["Tahini", 30, "g"], ["Coconut Oil", 28, "g"], ["Vanilla Essence", 5, "ml"],
    ],
  },
  fritters: {
    makes: 12,
    items: [
      ["Courgette", 250, "g"], ["Corn", 200, "g"], ["Eggs", 2, "ea"],
      ["Plain Flour", 60, "g"], ["Cheese", 50, "g"],
    ],
  },
};

const eachCost = (k: keyof typeof RECIPES | string) =>
  perItemLabel(RECIPES[k].items, RECIPES[k].makes);
const batchCost = (k: keyof typeof RECIPES | string) => batchLabel(RECIPES[k].items);

/**
 * 예산 가이드 「직접 만들기」 표의 머핀 줄 — 집에서 만든 쪽은 위 레시피 원가에서 나온다.
 * 🔴 09-28: 「12개 $1.50(13c)」가 손으로 적혀 있었고, 같은 레시피를 스낵 가이드는 개당
 *    약 50c(파생값)로 싣고 있었다. 퍼센트는 게시된(반올림된) 배치 금액에서 낸다 — 독자가 검산하는 값이다.
 */
function muffinSavingRow(): string {
  const batch = Number(batchCost("muffins").replace("$", ""));
  const each = batch / RECIPES.muffins.makes;
  const pct = Math.round((1 - each / (5 / 6)) * 100);
  return `| Muffin | $5.00 for 6 | ${batchCost("muffins")} for a batch of ${RECIPES.muffins.makes} | 83c vs ${eachCost("muffins")} | **${pct}%** |`;
}

/** 가격지수의 한 행(Woolworths 열). 없으면 조용히 넘어가지 않고 멈춘다. */
function indexWoolworths(name: string): string {
  const row = (priceIndexJson as { items: { name: string; countdown?: number }[] }).items.find((r) => r.name === name);
  if (!row || !(typeof row.countdown === "number" && row.countdown > 0)) {
    throw new Error(`가격지수에 "${name}"의 Woolworths 값이 없다`);
  }
  return money(row.countdown);
}

/** 레시피 원가 표. 개수·배치·개당이 전부 같은 정의에서 나온다. */
const RECIPE_LABELS: Record<string, string> = {
  muffins: "Banana oat muffins",
  scones: "Cheese and herb scones",
  bites: "Oat and coconut energy bites",
  fritters: "Vegetable fritters",
};
function recipeCostTable(): string {
  return Object.keys(RECIPES)
    .map((k) => `| ${RECIPE_LABELS[k]} | ${RECIPES[k].makes} | ${batchCost(k)} | **${eachCost(k)}** |`)
    .join("\n");
}

/* ────────────────────────────────────────────────────────────────────────────
 * "우리 넛프리 메뉴 재료 중 **주의 문구**가 붙는 것" — 라벨에서 만든다.
 *
 * 🔴 2026-08-23: 재료 하나가 `Muesli (Nut-free)`라는 이름을 달고 있었는데,
 *    Woolworths의 뮤즐리 30종을 전수 조회해 보니 **견과류 경고가 없는 제품이 없다.**
 *    레시피에 견과가 없다는 것과, 사 온 봉지에 "may contain nuts"가 없다는 것은
 *    다른 말이다. 이 글이 부모에게 라벨을 읽으라고 하면서 그 사실을 안 적고 있었다.
 * ──────────────────────────────────────────────────────────────────────────── */
function precautionaryNutIngredients(): string[] {
  const menus = (menuDataJson as unknown as { MENU_DATA: { en: MenuRow[] } }).MENU_DATA.en;
  const seen = new Set<string>();
  for (const m of menus) {
    if (!m.is_nut_free) continue;
    for (const ing of m.ingredients ?? []) if (warnsAbout(ing, "nuts")) seen.add(ing);
  }
  return [...seen].sort();
}
const precautionaryNutList = () => joinList(precautionaryNutIngredients());
const precautionaryNutCount = () => precautionaryNutIngredients().length;

const LEGUME_KEYS = ["Black Beans", "Chickpeas"];
const LEGUME_LABELS: Record<string, string> = {
  "Black Beans": "black beans",
  Chickpeas: "tinned chickpeas",
};

/**
 * 가격대("30-48c"). 범위를 손으로 적으면 한쪽 끝만 움직여도 조용히 틀린다.
 * 둘 다 $1 미만이면 단위는 뒤에만 붙인다 — "30c-48c"는 표기가 어색하다.
 */
function costRange(keys: string[]): string {
  const costs = keys.map(servePrice);
  const lo = Math.min(...costs);
  const hi = Math.max(...costs);
  if (lo === hi) return serveLabel(lo);
  if (hi < 1) return `${Math.round(lo * 100)}-${Math.round(hi * 100)}c`;
  return `${serveLabel(lo)}-${serveLabel(hi)}`;
}

/**
 * 🔴 "살라미가 표에서 제일 싼 단백질"은 **표 안에서만** 참이다. 콩류가 그 밑으로
 *    내려오면(2026-08-20: 병아리콩 30c < 살라미 35c) 그냥 두면 거짓이 된다.
 *    그래서 마지막 절을 데이터로 붙였다 뗐다 한다.
 */
function salamiVsLegumeSentence(): string {
  const salami = servePrice("Salami");
  const eggsAndLegumes = ["Eggs", ...LEGUME_KEYS];
  const undercut = LEGUME_KEYS.filter((k) => servePrice(k) < salami);
  const tail = undercut.length
    ? ` — and ${joinList(undercut.map((k) => `${LEGUME_LABELS[k]} at ${serveLabel(servePrice(k))}`))} undercut it anyway`
    : "";
  return (
    `Sliced salami is the cheap option in the protein row above, but it's also processed ` +
    `and salty; eggs and legumes at ${costRange(eggsAndLegumes)} are the better everyday pick${tail}.`
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 킨디 질식 가이드 (2026-10-12) — 표·개수·이름은 전부 `lib/chokingRisk.ts`와 데이터에서 만든다.
 *
 * 🔴 손질 문구는 플래너 카드와 **같은 문자열**(`messages/en.json`의 `kindy_prep_*`)을 읽는다.
 *    글에만 다른 말을 적어 두면 카드와 글이 갈라진다. 가드: `lib/kindyChoking.test.ts`.
 * ──────────────────────────────────────────────────────────────────────────── */
const EN_MSG = enMessages as Record<string, string>;
type KindyItem = { name: string; ingredients: string[] };
const KINDY_DATA = menuDataJson as unknown as { MENU_DATA: { en: KindyItem[] }; SNACK_DATA: Record<string, KindyItem[]> };
const kindySnackPool = () => PLANNER_CATEGORIES.flatMap((c) => KINDY_DATA.SNACK_DATA[c] ?? []);
const kindyTreats = () => KINDY_DATA.SNACK_DATA[EXCLUDED_CATEGORY] ?? [];
const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** 「Kindy」를 켜면 빠지는 메인·간식과 그 개수. 글의 숫자는 전부 여기서 나온다. */
export function kindyFacts() {
  const pool = kindySnackPool();
  return {
    menuTotal: KINDY_DATA.MENU_DATA.en.length,
    menusOut: kindyExcludedMenus(KINDY_DATA.MENU_DATA.en).map((m) => m.name),
    snackTotal: pool.length,
    snacksOut: kindyExcludedSnacks(pool).map((s) => s.name),
    treatsOut: kindyExcludedSnacks(kindyTreats()).map((s) => s.name),
  };
}

/** 가이드의 아홉 분류 × 우리 데이터에서 걸리는 메인·간식. */
function kindyExcludeTable(): string {
  const menus = KINDY_DATA.MENU_DATA.en;
  // 이름이 이미 그 재료를 말하면(Sausage & Mash) 괄호를 달지 않는다 — Nachos (corn chips)만 단다.
  const named = (name: string, ing: string) => name.toLowerCase().includes(ing.toLowerCase().split(" ").at(-1)!.replace(/s$/, ""));
  return EXCLUDE_CATEGORIES.map((cat) => {
    const ings = Object.entries(EXCLUDE_INGREDIENTS)
      .filter(([, r]) => r.basis === "guide" && r.category === cat)
      .map(([i]) => i);
    const label = (s: KindyItem) => {
      const hit = s.ingredients.filter((i) => ings.includes(i));
      return s.ingredients.length > 1 ? `${s.name} (${hit.join(", ").toLowerCase()})` : s.name;
    };
    const hits = (list: KindyItem[]) => list.filter((s) => !EXCLUDE_SNACKS[s.name] && s.ingredients.some((i) => ings.includes(i)));
    const menuHits = hits(menus).map((m) => {
      const hit = m.ingredients.filter((i) => ings.includes(i) && !named(m.name, i));
      return hit.length ? `${m.name} (${hit.join(", ").toLowerCase()})` : m.name;
    });
    const parts = [
      hits(kindySnackPool()).length ? `snacks: ${joinList(hits(kindySnackPool()).map(label))}` : "",
      hits(kindyTreats()).length ? `treats the planner never packs: ${joinList(hits(kindyTreats()).map(label))}` : "",
      menuHits.length ? `mains: ${joinList(menuHits)}` : "",
    ].filter(Boolean);
    return `| ${capFirst(EN_MSG[`kindy_cat_${cat}`])} | ${parts.length ? capFirst(parts.join("; ")) : "Nothing in our menus or snacks"} |`;
  }).join("\n");
}

/** 표의 첫 칸 — 가이드 표제. 「작고 둥근 음식」 쪽은 가이드가 그 안에서 다시 나눈 줄 이름을 붙인다(글에만 쓴다). */
const PREP_SUBHEAD: Partial<Record<PrepId, string>> = {
  peas: "green peas",
  large_seeds: "fruit with large seeds or pips",
  stone: "fruit with stones",
  leaves: "leaves",
  chicken_skin: "chicken skin",
};

/** 손질 안내 표 — 손질법마다 한 줄, 그 손질법이 붙는 재료를 데이터 순서로. */
function kindyAlterTable(): string {
  return (Object.keys(PREPS) as PrepId[])
    .map((prep) => ({ prep, ings: Object.entries(ALTER_INGREDIENTS).filter(([, ps]) => ps.includes(prep)).map(([i]) => i) }))
    .filter((r) => r.ings.length > 0)
    .map(({ prep, ings }) => {
      const older = PREPS[prep].older ? EN_MSG[`kindy_prep_${prep}_46`] : "—";
      const sub = PREP_SUBHEAD[prep] ? ` — ${PREP_SUBHEAD[prep]}` : "";
      return `| ${capFirst(EN_MSG[`kindy_alter_${PREPS[prep].category}`])}${sub} | ${joinList(ings)} | ${EN_MSG[`kindy_prep_${prep}`]} | ${older} |`;
    })
    .join("\n");
}

/** 우리 데이터에 해당 재료가 없는 「손질」 분류 — 가이드가 다루지만 표에 줄이 안 생기는 것. */
function kindyUnusedAlterSentence(): string {
  const used = new Set<string>(Object.values(ALTER_INGREDIENTS).flat().map((p) => PREPS[p].category));
  const unused = ALTER_CATEGORIES.filter((c) => !used.has(c)).map((c) => EN_MSG[`kindy_alter_${c}`]);
  if (!unused.length) return "";
  return `The guidance also covers ${joinList(unused)}; nothing the planner packs falls under ${unused.length === 1 ? "that heading" : "those headings"}, so it has no row here.`;
}

/** 「우리 판단」으로 빼는 간식 → 그 간식의 주재료. 같은 재료가 메인 안에선 익혀 무르게 남는다. */
const OURS_MAIN_INGREDIENT: Record<string, string> = { "Roasted Chickpeas": "Chickpeas" };

function kindyOursSentence(): string {
  const menus = KINDY_DATA.MENU_DATA.en;
  return Object.keys(EXCLUDE_SNACKS).map((name) => {
    const ing = OURS_MAIN_INGREDIENT[name];
    const soft = menus.filter((m) => !menuExclusion(m.ingredients) && m.ingredients.includes(ing)).map((m) => m.name);
    return soft.length ? `Cooked ${ing.toLowerCase()} inside a main are soft, so those mains stay in: ${joinList(soft)}.` : "";
  }).filter(Boolean).join(" ");
}

/**
 * 🔴 개수는 `@/lib/menuCounts`에서만 가져온다 — **`@/lib/siteCounts`가 아니다.**
 * siteCounts는 `GUIDE_COUNT`를 만들려고 이 파일을 import하므로, 여기서 siteCounts를
 * 부르면 순환이 닫힌다. posts.ts와 같은 규칙이고, 같은 가드가 지킨다.
 */
export interface Guide {
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
  category: string;
  author?: string;
  /**
   * 본문의 금액이 **손으로 적은 스냅샷**일 때 true. 글(`Post`)의 같은 플래그와 같은 뜻이다.
   * 🔴 2026-09-09 전수 조사에서 가이드 4편도 같은 상태였다.
   */
  staticPrices?: boolean;
  body: string;
}

const RAW_GUIDES: Record<string, Omit<Guide, "readTime"> & { readTime?: string }> = {
  "complete-nutrition-guide-school-lunches-nz": {
    title: "The Complete Nutrition Guide for NZ School Lunches",
    excerpt:
      "How to pack a balanced NZ school lunch — portion sizes, Ministry of Health guidelines, and what each food group costs per lunch from our price tracking.",
    date: "January 5, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-29",
    image: "/assets/kiwi_ham_salad_sandwich.webp",
    category: "Nutrition",
    author: "Yong Jae Lee",
    body: `
## Why School Lunch Nutrition Matters

A New Zealand lunchbox covers two eating occasions, not one — morning tea and lunch. The best local measurement of what that adds up to comes from the 2002 Child Nutrition Survey: food eaten between 9am and 2pm supplied **31.5% of daily energy**, of which the 12–2pm lunch window alone accounted for **20.4%** (Regan et al. 2008, reproduced as Table 1 in the Ministry of Education's [Ka Ora, Ka Ako nutrition evaluation](https://web-assets.education.govt.nz/s3fs-public/2024-11/Ka-Ora-Ka-Ako_Nutrition-Evaluation-v2.pdf)). For comparison, Ka Ora, Ka Ako sets its own target at 33% of recommended daily intake from a single lunch, and that same evaluation calls it a high standard to hit.

So the box is carrying about a third of the day — but the sandwich alone is carrying about a fifth. That distinction matters when you are deciding whether the morning-tea slot is worth thinking about, and it is why this guide treats it as part of the meal rather than an afterthought.

Yet despite its importance, lunchbox nutrition is often an afterthought. The morning rush takes over, and convenience wins. This guide is designed to give you a clear, practical framework for packing lunches that genuinely support your child's health — without requiring a nutrition degree or a two-hour morning prep session.

> **Note:** The nutrient reference values and national survey intakes in this guide are taken from the Ministry of Health's *Food and Nutrition Guidelines for Healthy Children and Young People (2–18 years): A background paper*, where the two are published together, and each of those is sourced to a table in it. The portion guide and the sugar figures further down are rough, typical values rather than sourced ones — they are labelled where they appear.

There's a second thing worth saying up front, because it's the objection I hear most: *balanced sounds expensive*. It isn't, and I can show the arithmetic. Every cost in this guide is a regular **Woolworths** shelf price, re-read from their online shop each week — the same set of readings the planner uses to price your lunches. (The [NZ Lunchbox Price Index](/en/price-index) is a separate and wider job: the same 20 staples priced at Woolworths, Pak'nSave and New World so you can see which chain is cheaper. It is not where the figures below come from.) So this guide tells you what a balanced box should contain **and** what each part of it actually costs.

---

## Understanding the Basics: What a Balanced Lunchbox Looks Like

The NZ Ministry of Health's guidelines are built around four food groups, eaten in variety every day. A practical rule of thumb for one lunch — mine, not the Ministry's — is items from at least three of them:

### The Four Food Groups

| Food Group | Examples | Role in the Lunchbox |
|---|---|---|
| Vegetables & Fruit | Carrot sticks, apple slices, cherry tomatoes, kiwifruit | Vitamins, minerals, fibre |
| Grain Foods | Wholegrain bread, wraps, rice, pasta, crackers | Energy (carbohydrates), fibre |
| Protein Foods | Chicken, eggs, canned tuna, legumes, cheese | Growth, repair, satiety |
| Milk & Milk Products | Cheese, yoghurt, milk | Calcium, protein |

A practical formula for every lunchbox:

- **1 main item** (sandwich, wrap, pasta, or sushi) — combines grains + protein
- **1-2 fruit/veg items** (whole fruit, veg sticks, salad portion)
- **1 dairy item** (cheese cubes, yoghurt pouch, milk)
- **1 small treat or snack** (homemade muffin, crackers, popcorn)

---

## What Each Food Group Actually Costs

This is the part most nutrition guides leave out, and it's the part that decides whether the advice survives contact with a Tuesday morning.

The figures below are **regular Woolworths shelf prices — not specials** — read from their online shop, ${priceMonth()}. Each is costed as the share of a pack one child's lunch actually uses: two slices from a loaf, ${serveSize("Cheese")} from a ${packSize("Cheese")} cheese block, one carrot from a bag.

| Food group | A cheap option | Cost per lunch | A dearer option |
|---|---|---|---|
${foodGroupTableMarkdown()}

**Hitting all four food groups costs about ${cheapestBoxTotal()}** at the cheap end. Take the midpoint of each row instead and it lands at ${midpointBoxTotal()}.

So when a box comes out at ${boxMedianLabel()} or more — which is where our median sits — the money isn't going on "being healthy". It's going on one or two specific choices, almost always the protein. ${chickenMultipleSentence()}

### Three things this changes in practice

**Fruit and veg are not the expensive part.** A carrot is ${serveLabel(servePrice("Carrot"))} and a banana is ${serveLabel(servePrice("Banana"))}. If your box is over budget, the fruit isn't why. This is the single most common misconception I run into.

**Protein is the whole ballgame.** It's the largest line in almost every box we cost. Eggs (${serveLabel(servePrice("Eggs"))}), tinned legumes (${costRange(LEGUME_KEYS)}) and cheese (${serveLabel(servePrice("Cheese"))}) do the same nutritional job as chicken breast at a fraction of the price. That's not an argument against chicken — it's an argument for knowing which days you're spending on it.

**Cheap does not mean nutritionally poor here.** ${salamiVsLegumeSentence()} The point of the table isn't "buy the cheapest row" — it's that the nutritional target and the budget target are not in conflict nearly as often as people assume.

---

## Macronutrient Targets for School-Age Children

Understanding macronutrients helps you assess whether a lunchbox is genuinely balanced or just looks colourful.

### What the guidelines actually set — and what they don't

New Zealand uses the Nutrient Reference Values, and they are more selective than most lunchbox articles let on. Protein, fibre and fluids have published daily figures for children. **Carbohydrate and fat do not.** The Ministry of Health's own background paper says there were insufficient data to set a recommended intake, adequate intake or upper level for either, and the percentage-of-energy ranges sometimes quoted for them apply from age 14 upwards. So this table gives the actual recommendation where one exists, and what New Zealand children actually eat where one doesn't — rather than inventing a target.

| | Ages 4–8 | Ages 9–13 | What kind of figure this is |
|---|---|---|---|
| Protein | 20g/day | 40g boys, 35g girls | Recommended dietary intake |
| Fibre | 18g/day | 24g boys, 20g girls | Adequate intake |
| Fluids from drinks | 1.2L/day | 1.6L boys, 1.4L girls | Adequate intake |
| Energy | *none set* | *none set* | Median intake: 6.7–7.6 MJ at 5–6yr, 7.8–8.9 MJ at 7–10yr |
| Carbohydrate | *none set* | *none set* | Median intake: 250–279g at 4–8yr, 265–322g at 9–14yr |
| Fat | *none set* | *none set* | 31–35% of energy in NZ children's actual diets |

Source: Ministry of Health, [*Food and Nutrition Guidelines for Healthy Children and Young People (2–18 years)*](https://www.health.govt.nz/publications/food-and-nutrition-guidelines-for-healthy-children-and-young-people-aged-2-18-years-a-background), Tables 5, 7, 8, 12, 14 and 33. The intake figures come from the 2002 National Children's Nutrition Survey.

If you want one number to aim at for the box itself, the honest one is a **share rather than a gram count**. As above: the lunchbox covers morning tea and lunch, roughly 31.5% of the day's energy, so about a third of each daily row is the right ballpark for what leaves the house.

### What This Looks Like in Practice

I have not calculated the nutrients of a specific lunch here, and I would rather not print a kilojoule figure I cannot source. What the table does tell you is where to put the attention. Protein is the nutrient New Zealand children are least likely to be short of — the 2002 survey found intakes exceeded requirements in every age group, at more than double the recommended amount. Fibre, iron and calcium are the ones that repay attention. You don't need exotic superfoods — just real food in the right proportions.

---

## Portion Sizes: How Much Is Enough?

One of the most common mistakes is packing too much or too little. Children's stomachs are smaller than adults', and the eating break at school is short.

### Age-Based Portion Guide

A rough starting point, not a published guideline — appetite varies from child to child.

| Item | Ages 5-7 | Ages 8-10 | Ages 11-13 |
|---|---|---|---|
| Sandwich | 1 slice folded or thin sandwich | 1 full sandwich | 1.5 sandwiches or large wrap |
| Fruit | 1 small piece or 1/2 cup | 1 medium piece | 1-2 pieces |
| Veg sticks | Small handful (4-5 sticks) | Medium handful (6-8 sticks) | Large handful |
| Yoghurt | 100g | 120-150g | 150-200g |
| Cheese | 1 slice or 15g cubes | 1.5 slices or 20g | 2 slices or 25g |

**Tip:** If your child consistently brings home uneaten food, reduce portions slightly rather than changing what you pack. Half a sandwich eaten is better than a full sandwich returned.

---

## Common Nutritional Gaps in NZ Lunchboxes

The Ministry of Education's [Ka Ora, Ka Ako nutrition evaluation](https://web-assets.education.govt.nz/s3fs-public/2024-11/Ka-Ora-Ka-Ako_Nutrition-Evaluation-v2.pdf) measured the meals served under the free school lunch programme against a target of 33% of daily needs. Protein and most vitamins cleared it comfortably; **iron came in under target in half the age and sex groups analysed, and calcium in every one of them.** Those are programme meals rather than lunchboxes, so read it as a signal about which nutrients are genuinely hard to fit into a school meal, not as a finding about your box. It points the same way as what the 2002 Child Nutrition Survey found in children's diets overall, which is the better guide to what to watch:

### Iron

Inadequate iron intake is not widespread among New Zealand children — the 2002 survey put it at 6.6% overall — but it is very unevenly spread: 12.0% of girls against 1.6% of boys, and **43.9% of girls who had started menstruating.** If that describes your child, this is the one to pay attention to. Lunchbox sources include:

- Lean beef or lamb in sandwiches
- Canned tuna or salmon
- Hummus (chickpeas are a good plant-based iron source)
- Dark leafy greens (spinach in a wrap)

Iron is the one gap worth reading further on — plant-based sources need a vitamin C pairing to be absorbed properly. [Iron-Rich Lunchbox Foods](/en/blog/iron-rich-lunchbox-foods-nz) works through the combinations that actually fit in a lunchbox.

### Calcium

Critical for growing bones, and the gap here is wider than most parents expect: 15.1% of children in the 2002 survey had inadequate calcium intake, rising to roughly 30% among 11–14 year olds. Include daily:

- Cheese (cubes, slices, or grated in a sandwich)
- Yoghurt (choose plain and add your own fruit to control sugar)
- Milk (in a small thermos or shelf-stable carton)

### Fibre

New Zealand children are mildly short of fibre rather than dramatically so — median intakes run 15–21g against an adequate intake of 18–24g, and the gap widens with age. Closing it is easy:

- Wholegrain bread instead of white
- Whole fruits instead of fruit juice
- Raw vegetables (carrots, capsicum, cucumber)
- Popcorn (plain or lightly salted — a surprisingly good fibre source)

### Vitamin D

Hard to get from food alone in NZ, but you can help with:

- Eggs (boiled eggs in the lunchbox)
- Canned salmon with bones
- Fortified milk

---

## Reading Labels: A Quick Guide for NZ Parents

When buying packaged items at Woolworths or Pak'nSave, the nutrition information panel (NIP) tells you what matters. Here is what to check:

### Use the per-100g column, not the per-serve one

Serve sizes are set by the manufacturer, so two products doing the same job in a lunchbox can declare wildly different serves — which makes the per-serve column close to useless for comparing them. [Heart Foundation NZ](https://www.heartfoundation.org.nz/wellbeing/healthy-eating/how-to-read-food-labels) puts the rule plainly: because serve size varies between products, the per-100g column is the one to compare on, and you want the food that is lower in saturated fat, sugar and sodium and higher in fibre.

I have deliberately not printed a table of pass/fail numbers here. The thresholds that circulate online mostly come from the UK traffic-light scheme, they differ by food category, and a single cut-off applied across the shop will fail perfectly good foods (plain nuts on saturated fat, tinned fish on sodium) while passing poor ones. Comparing two products in front of you on the same row of the panel is both easier and more reliable.

### The Health Star Rating

New Zealand uses the Health Star Rating system on many packaged foods. The thing most people get wrong about it is the comparison it supports: the Heart Foundation is explicit that products **should be compared within category**. More stars is better when you are choosing between two muesli bars; it tells you very little when you hold a muesli bar against a yoghurt. And as they put it, a high star rating is not a licence to overindulge.

**Practical tip:** Compare the muesli bars at Pak'nSave against each other. Some sit at 2 stars (high sugar, low fibre), while others score 4 or more. The price difference is often minimal.

---

## A Week of Balanced Lunchbox Examples

Here is a practical Monday-to-Friday week built on the food-group balance described above. It is an example of that shape, not a plan checked against any published nutrient reference:

### Monday
- Chicken and lettuce wholegrain sandwich
- Carrot and cucumber sticks with hummus
- Kiwifruit
- Small cheese cubes

### Tuesday
- Homemade sushi rolls (tuna and cucumber)
- Cherry tomatoes
- Banana
- Plain yoghurt with a drizzle of honey

### Wednesday
- Pesto pasta salad with feta and spinach
- Apple slices
- Cheese and crackers

### Thursday
- Hard-boiled eggs (2) with wholegrain crackers
- Capsicum strips and cucumber
- Mandarin
- Homemade banana muffin

### Friday
- Ham and cheese wrap with lettuce
- Grapes
- Popcorn (small bag)
- Yoghurt pouch

Each of these lunches covers at least three of the four food groups.

---

## Sugar: How Much Is Too Much?

The World Health Organisation's recommendation is a **share of energy, not a gram count**: free sugars below 10% of total daily energy, with additional benefit below 5%. The "25g a day" figure you often see quoted is the 5% level for an *adult* eating 2,000 calories, and it is not a children's guideline. For a New Zealand primary schooler eating the median 7.8–8.9 MJ a day, 10% works out around 47–53g of free sugars and the 5% level around 23–27g. Free sugars are the added sugars in processed foods, plus fruit juice and honey — not the natural sugars in whole fruit and plain milk.

### Common Lunchbox Sugar Traps

The sugar figures below are rough, typical ranges for a single item, not readings from a particular product — compare the per-100g column of the packets in front of you, as the label section above explains.

| Item | Typical sugar per item | Better Alternative |
|---|---|---|
| Fruit juice box (250ml) | 24-28g | Water + whole fruit |
| Flavoured yoghurt (150g) | 18-22g | Plain yoghurt + berries |
| Muesli bar (standard) | 8-14g | Homemade oat slice |
| Fruit roll-up | 10-14g | Whole fruit |
| Chocolate chip biscuit | 8-10g | Wholemeal crackers + cheese |

A juice box and a flavoured yoghurt together come to roughly 42–50g. That is in the same territory as the whole day's 10% allowance, and comfortably past the 5% level — before the child has left school.

---

## Hydration

Water is the best drink for school. The NZ Ministry of Health recommends children drink plain water throughout the day. Most NZ schools have water fountains, but a refillable bottle ensures consistent access.

- **Ages 4-8:** 1.2 litres a day from drinks
- **Ages 9-13:** 1.6 litres for boys, 1.4 for girls

Those are the Ministry of Health's adequate intakes for *fluids from drinks*, which is the figure worth carrying — food supplies water on top of it.

Avoid: fruit juice, flavoured water, sports drinks, and fizzy drinks in the lunchbox.

---

## Working Within NZ School Policies

Most New Zealand primary schools have food policies that restrict certain items. Common restrictions include:

- Nut-free or nut-aware rules — common, but they are not the same thing; our [allergy management guide](/en/guides/allergy-management-school-lunchbox-nz) explains the difference
- No sweets, lollies, or chocolate bars
- No fizzy drinks
- Some schools restrict chips and highly processed snacks

Check your school's specific policy at the start of the year. It is usually available on the school website or in the enrolment pack.

---

## Quick Wins: Small Changes, Big Nutritional Impact

If you are looking to improve your child's lunchbox nutrition without a complete overhaul, start here:

- **Switch white bread to wholegrain** — adds fibre and B vitamins with zero extra effort
- **Replace juice with water** — the juice box is the biggest sugar line in the table above
- **Add one extra vegetable** — even just a few carrot sticks fills a nutrient gap
- **Choose plain yoghurt** — flavoured versions can contain as much sugar as dessert
- **Include protein in the main item** — keeps kids full until 3pm instead of crashing at 2pm

---

## Further Reading

- [NZ Ministry of Health: Food and Nutrition Guidelines for Children and Young People (2–18 years)](https://www.health.govt.nz/publications/food-and-nutrition-guidelines-for-healthy-children-and-young-people-aged-2-18-years-a-background)
- [Heart Foundation NZ: School Food Environments](https://www.heartfoundation.org.nz)
- [5+ A Day NZ](https://www.5aday.co.nz)

---

## Start Planning Balanced Lunches Today

You don't need to be a nutritionist to pack a great lunchbox. Focus on three food groups per meal, limit packaged sugar, and keep it simple. Consistency beats perfection — a "good enough" lunch eaten every day is far better than an Instagram-worthy meal that comes home uneaten.

[Try the Kiwi Lunchbox Planner →](/en/planner)
`,
  },

  "allergy-management-school-lunchbox-nz": {
    title: "Allergy Management for School Lunchboxes: A NZ Parent's Complete Guide",
    seoTitle: "Allergy Management for School Lunchboxes: NZ Parent Guide",
    excerpt:
      "Managing food allergies in NZ school lunchboxes — the allergens NZ labels must declare, nut-free school policies, safe swaps and emergency planning.",
    date: "January 22, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-10-23",
    image: "/assets/kiwi_jam_sandwich.webp",
    category: "Allergy Friendly",
    author: "Yong Jae Lee",
    body: `
## Introduction: Allergies and the NZ School Lunchbox

Food allergy affects around 5-10% of children in Australia and New Zealand, according to [ASCIA](https://www.allergy.org.au/patients/fast-facts/food-allergy), the peak clinical immunology body for both countries. For parents of allergic children, packing a school lunchbox is not just about nutrition and taste — it is a daily exercise in risk management.

This guide covers NZ labelling law, how to talk to your child's school, and where the safe alternatives are at Woolworths and Pak'nSave. It also puts a number on something parents in this position keep asking me and rarely get answered: **how much does each allergy actually take off the table?**

> **Important disclaimer:** This guide provides general information only. It is not a substitute for medical advice. If your child has a diagnosed food allergy, work with your GP or allergist to develop a personalised management plan. For anaphylaxis, ensure your school has an up-to-date action plan and access to an adrenaline auto-injector (EpiPen).

---

## How Much Each Allergy Actually Rules Out

Our menu database is 94 school lunches. Filtering it by allergy gives a concrete answer to "how hard is this going to be" — and the answer depends far less on which allergy you're managing than on **how many you're managing at once**.

| What you're avoiding | Menus that still work | Share |
|---|---|---|
| Nuts | 89 | **95%** |
| Nuts + egg | 61 | 65% |
| Nuts + dairy | 40 | 43% |
| Nuts + gluten | 23 | 24% |
| Nuts + dairy + egg | 29 | 31% |
| Nuts + dairy + egg + gluten | **11** | **12%** |

A single nut allergy barely dents the options — you lose about one lunch in twenty. But allergies compound fast: **each one you add roughly halves what's left.** By four, you're down to eleven lunches, and that's the point at which rotation fatigue becomes the real problem rather than safety.

### What that means in practice

**One allergy: substitute, don't rebuild.** At 95% coverage, you're changing a component, not your whole approach. Nuts mostly hide in packet snacks — muesli bars, trail mixes, some biscuits — rather than in lunches themselves.

**Two allergies: the second one decides it.** Nut + egg still leaves 65% of menus, nut + dairy drops to 43%, and nut + gluten to 24% — gluten is the narrowest second allergy in the table. Dairy is doing quiet work across sandwiches, wraps, pasta and snacks, and it is not an expensive way to buy protein: ${cheeseVsProteinsClause()}. Losing it costs you variety *and* budget.

**Three or more: plan for repetition, not variety.** Nuts, dairy and egg together leave ${menuRowCount((m) => m.is_nut_free === true && m.is_dairy_free === true && m.is_egg_free === true)} menus; add gluten and it is eleven. With eleven safe menus, a fortnightly rotation is realistic and a non-repeating month isn't. That's worth saying out loud, because parents in this position often assume they're failing at meal planning when they're actually hitting a genuine ceiling.

You can run these filters yourself in the [free planner](/en/planner) — tick the allergies that apply and it only builds from what's left.

---

## The Allergens a New Zealand Label Must Declare

The Australia New Zealand Food Standards Code, developed by Food Standards Australia New Zealand (FSANZ), sets a list of allergens that packaged food labels must declare. Since the Plain English Allergen Labelling rules took full effect in February 2024, that list includes sesame and lupin alongside the familiar ones, names each tree nut individually rather than as one group, and splits shellfish into crustacea and molluscs. The table below covers the ones most likely to come up in a lunchbox, not the full list — that is on the [FSANZ allergen labelling page](https://www.foodstandards.gov.au/consumer/labelling/allergen-labelling):

| Allergen | Rough prevalence in children (see note) | Common Lunchbox Sources |
|---|---|---|
| Peanuts | ~3% | PB sandwiches, muesli bars, baking |
| Tree nuts | ~2% | Trail mix, muesli bars, pesto, baking |
| Cow's milk | ~2-3% (under 5) | Cheese, yoghurt, butter, baked goods |
| Eggs | ~1.5% | Sandwiches, baking, mayo, pasta |
| Wheat | ~1% | Bread, wraps, pasta, biscuits |
| Soy | ~0.5% | Soy sauce, tofu, many processed foods |
| Fish | ~0.5% | Tuna sandwiches, fish cakes |
| Shellfish (crustacea, molluscs) | ~0.5% | Rare in lunchboxes |
| Sesame | — | Hummus (tahini), sushi, seeded bread |

**A note on those percentages.** ASCIA publishes two of them: food allergy overall at [5-10% of children](https://www.allergy.org.au/patients/fast-facts/food-allergy), and peanut at around 3%. The per-allergen figures below peanut are indicative order-of-magnitude estimates — I have not found an NZ-specific published breakdown for them, so do not lean on the decimal places. What the column is for is relative scale: peanut and tree nut are the ones a lunchbox policy is usually built around, and soy and fish are rare enough that most schools handle them case by case. Sesame has no figure here because I have not found one I can source.

Most children who develop cow's milk and egg allergies will outgrow them by school age. Peanut and tree nut allergies are more likely to persist into adulthood.

---

## Understanding NZ Food Labelling Laws

### What Manufacturers Must Declare

Under the Australia New Zealand Food Standards Code, all packaged foods must declare the presence of major allergens in the ingredient list, regardless of how small the quantity. This includes:

- Allergens in the main ingredients
- Allergens in compound ingredients (e.g., a sauce within a ready meal)
- Allergens used as processing aids

### "May Contain" Statements

"May contain traces of..." statements are **voluntary** in New Zealand. They indicate a possible cross-contamination risk during manufacturing. Key points:

- The absence of a "may contain" statement does not guarantee the product is free from that allergen
- Different manufacturers have different thresholds for using "may contain"
- If your child has severe allergies (anaphylaxis risk), you may need to avoid products with "may contain" warnings

### Practical Label Reading Tips

- **Always read the full ingredient list**, not just the allergen summary
- **Re-read labels regularly** — manufacturers change formulations without warning
- **Be cautious with imported products** — labelling standards differ between countries
- **Look for FSANZ-compliant labels** — NZ-made products must follow local standards

---

## "Nut-Free" on the Shelf Is Not the Same as Nut-Free in the Recipe

This is the gap that catches people out, and I only found the size of it by checking.

A recipe can contain no nuts at all while every packet you buy to make it carries a precautionary line — *may contain traces of tree nuts*, or *processed in a facility that also handles peanuts*. Those two statements answer different questions. The recipe answers "did I put nuts in?" The packet answers "could a nut have got in at the factory?"

I went through the products behind our nut-free menus and read the actual allergen labels. **${precautionaryNutCount()} of the ingredients carry a precautionary nut warning: ${precautionaryNutList()}.** None of them declares nuts as an ingredient. All of them could still be a problem for a child with a severe peanut or tree-nut allergy, depending on what your allergist has told you.

The muesli is the clearest case. I checked every muesli Woolworths sells — all thirty of them — and **not one is free of a nut warning.** Some declare almonds or cashews outright; the rest carry "may contain". That is one supermarket on the day I checked — I have not been through the other chains' muesli, so I will not claim none exists anywhere. But any lunchbox list that offers you a nut-free supermarket muesli should name it, so you can check the packet.

What to do with that:

- **If your child's plan is "avoid nuts as an ingredient",** these products are fine and the labels are doing their job.
- **If your child's plan is "avoid may-contain products too",** which is common with anaphylaxis, you need to substitute: make your own oat mix instead of buying muesli, make hummus from a can of chickpeas rather than buying a tub, and check the cocoa.
- **Either way, read the packet you are holding.** Manufacturers change lines and reformulate, and a warning that was not there last term can appear without the front of the pack changing at all.

## NZ School Nut Policies: What You Need to Know

Most New Zealand primary and intermediate schools have adopted nut-aware or nut-free policies. Understanding the difference matters — and if you are packing for a nut-free classroom day to day, [Nut-Free School Lunches & Snacks: A Guide for NZ Parents](/en/blog/nut-free-school-lunches-new-zealand) covers packing within those policies day to day.

### Nut-Free vs. Nut-Aware

| Policy Type | Meaning | Your Responsibility |
|---|---|---|
| Nut-free | No nut products allowed on school grounds | Must not send any products containing nuts or traces of nuts |
| Nut-aware | School discourages nuts but cannot guarantee a nut-free environment | Avoid obvious nut products; be considerate of allergic classmates |

### Common Items That Breach Nut Policies

Parents are often surprised by hidden nut sources:

- **Pesto** — traditional basil pesto contains pine nuts (technically seeds, but many schools include them in nut bans)
- **Muesli bars** — many mainstream brands contain nuts or are manufactured on shared lines
- **Nutella and other chocolate spreads** — contain hazelnuts
- **Some breads and cereals** — check for almond meal or walnut pieces
- **Energy balls and bliss balls** — often made with cashews or almonds

### Safe Nut-Free Alternatives

- Sunflower seed butter instead of peanut butter, if you can find one — check the label, and your school's policy on seeds
- Pam's basil paste instead of traditional pesto — check label for current formulation
- Woolworths Own Brand muesli bars — some varieties are nut-free (check the label)
- Homemade baking using seeds instead of nuts

---

## Allergy-Safe Lunchbox Swaps

Here is a comprehensive swap table for each major allergen:

### Dairy-Free Swaps

| Instead of... | Use... | Where to Buy |
|---|---|---|
| Cheese slices | Dairy-free cheese (Zenzo, Angel Food) | Woolworths, health stores |
| Yoghurt | Coconut yoghurt (Raglan Coconut Yoghurt) | Woolworths, Pak'nSave |
| Butter in sandwiches | Avocado, hummus, olive oil spread | Any supermarket |
| Milk for baking | Oat milk, soy milk | Woolworths, Pak'nSave |

### Egg-Free Swaps

| Instead of... | Use... | Notes |
|---|---|---|
| Hard-boiled eggs | Chickpea patties, falafel | Good protein alternative |
| Egg in baking | Flax egg (1 tbsp flaxmeal + 3 tbsp water) | Works in muffins and cakes |
| Mayonnaise | Egg-free mayo (Best Foods Vegan) | Available at Woolworths |
| Egg noodles | Rice noodles | Common at Pak'nSave |

For more lunches built around these swaps, see [Egg-Free Lunchbox Ideas for NZ Schools](/en/blog/egg-free-lunchbox-ideas-nz).

### Gluten-Free Swaps

| Instead of... | Use... | Notes |
|---|---|---|
| Bread | GF bread (Bakers Delight, Woolworths GF range) | Toast before using for better texture |
| Wraps | Rice paper rolls, corn tortillas | Corn tortillas available at Pak'nSave |
| Pasta | Rice pasta, corn pasta | Cooks similarly, slightly different texture |
| Crackers | Rice crackers, corn thins | Widely available |

---

## Cross-Contamination: Managing Risk at Home

Even if you buy allergen-free ingredients, cross-contamination during preparation can be a serious risk, especially in households where not everyone shares the same allergy.

### Kitchen Safety Practices

- **Separate chopping boards** — colour-code one for allergen-free food preparation
- **Clean surfaces thoroughly** — allergen proteins are not destroyed by regular wiping; use hot soapy water
- **Wash hands between tasks** — if you make a PB sandwich for one child, wash hands before preparing the allergic child's lunch
- **Store allergen-free items separately** — use a dedicated shelf or container in the pantry and fridge
- **Label containers clearly** — especially if multiple family members pack lunches

### Lunchbox Contamination

- **Use separate lunchboxes** — do not share lunchbox containers between allergic and non-allergic children
- **Wash lunchboxes with hot soapy water daily** — allergen proteins can persist on plastic surfaces
- **Avoid bulk bins** — products from bulk bins at supermarkets have high cross-contamination risk

---

## Communicating with Your Child's School

Effective communication with the school is essential for managing food allergies safely.

### At the Start of Each Year

- Provide the school with an **up-to-date allergy action plan** signed by your GP
- Ensure the school has a **current photo of your child** for the medical room
- Confirm where **adrenaline auto-injectors (EpiPens)** are stored and who is trained to use them
- Discuss the **school's food policy** and any events involving food (bake sales, cultural days, class parties)

### Ongoing Communication

- Notify the teacher of any changes in your child's allergy status
- Ask to be informed about food-related class activities in advance
- Provide safe alternatives for your child to have during class parties or celebrations
- Consider providing a "safe snack box" kept at school for unexpected food events

### Teaching Your Child

Age-appropriate allergy education is crucial:

- **Ages 5-7:** "You have a food allergy. Only eat food from your own lunchbox. If someone offers you food, say 'no thank you' and tell a teacher."
- **Ages 8-10:** Teach them to read simple labels and recognise allergen symbols. Practice saying "I'm allergic to [allergen]" confidently.
- **Ages 11+:** They should be able to read full ingredient lists, ask about ingredients in food offered to them, and know how to use an EpiPen if prescribed.

---

## Emergency Preparedness

### What Every Parent Should Have in Place

- A written **Anaphylaxis Action Plan** (ASCIA template is widely used in NZ) — available from your GP or allergist
- **Two adrenaline auto-injectors** — one at school, one at home (check expiry dates every 6 months)
- A **medical alert bracelet** for your child — especially important for school camps and excursions
- Emergency contact numbers on file at the school and with the classroom teacher

### Recognising Anaphylaxis

Symptoms can include:

- Swelling of the tongue or throat
- Difficulty breathing or wheezing
- Persistent dizziness or collapse
- Widespread hives or skin flushing

**If in doubt, administer the EpiPen and call 111.** It is always safer to treat a suspected reaction than to wait.

---

## Affordable Allergy-Friendly Shopping in NZ

Managing allergies does not have to break the budget. Here is where to find the best value:

### Woolworths

- Good range of free-from products (dedicated shelf in most stores)
- Own-brand gluten-free bread
- Raglan Coconut Yoghurt and other dairy-free options
- Online shopping with allergen filters

### Pak'nSave

- Lower prices on basics (rice, beans, lentils, fruit, vegetables)
- Fewer specialty free-from products, but excellent for whole-food-based allergy-friendly meals
- Great for bulk buying rice crackers, canned fish, and produce

### Tips for Saving Money

- **Cook from scratch where possible** — naturally allergen-free meals (rice + chicken + vegetables) are cheaper than buying specialty products
- **Buy seasonal produce** — cheaper and fresher
- **Batch cook and freeze** — make allergen-free muffins, patties, and pasta sauce in bulk on weekends
- **Check Woolworths' weekly specials** — free-from products regularly go on sale

---

## Five Allergy-Safe Lunchbox Ideas

### 1. Rice Paper Rolls (Nut-free, dairy-free, egg-free, gluten-free)
- Rice paper, shredded chicken, carrot, cucumber, rice vermicelli
- Dipping sauce: tamari (GF soy sauce) with a squeeze of lime

### 2. Chicken and Avocado Sandwich (Nut-free, egg-free)
- Wholegrain bread, sliced chicken, avocado, lettuce
- Add dairy-free cheese if also dairy-free

### 3. Pasta Salad (Nut-free)
- Spiral pasta (or GF pasta), cherry tomatoes, cucumber, feta (or dairy-free alternative), olive oil dressing

### 4. Sushi Rolls (Nut-free, dairy-free)
- Sushi rice, nori, cucumber, canned tuna or smoked salmon, tamari

### 5. Vegetable and Hummus Wrap (Nut-free, dairy-free, egg-free)
- Wholemeal wrap (or GF tortilla), hummus, grated carrot, cucumber, capsicum, baby spinach

---

## Resources for NZ Parents

- [Allergy New Zealand](https://www.allergy.org.nz) — NZ's national allergy charity, offering support and education
- [ASCIA (Australasian Society of Clinical Immunology and Allergy)](https://www.allergy.org.au) — action plan templates and clinical guidelines
- [FSANZ Food Allergen Labelling](https://www.foodstandards.govt.nz) — official NZ food labelling standards
- [Starship Children's Hospital — Allergy Clinic](https://www.starship.org.nz) — specialist paediatric allergy services

---

## Take the Stress Out of Allergy-Safe Lunches

Packing an allergy-safe lunchbox every day is demanding, but it becomes manageable with a system. Use our planner to generate weekly plans with allergy filters built in — select nut-free, dairy-free, gluten-free, egg-free, sesame-free, or vegan, and every meal will respect your child's needs. For sesame, and why almost every bread on the shelf carries a sesame warning, see [Sesame-Free School Lunches in NZ](/en/blog/sesame-free-school-lunches-nz). For the dairy side specifically — milk allergy versus lactose intolerance, and where milk hides on a New Zealand label — see [Dairy-Free School Lunches](/en/blog/dairy-free-school-lunches-nz). For gluten, where the problem is the shared toaster and the crumby knife rather than the shopping list, see [Gluten-Free School Lunches](/en/blog/gluten-free-school-lunches-nz).

[Try the Kiwi Lunchbox Planner →](/en/planner)
`,
  },

  "budget-lunchbox-planning-guide-nz": {
    title: "Budget Lunchbox Planning: Feed Your Kids Well for Under $15/Week",
    seoTitle: "Budget Lunchbox Planning: Feed Kids Well Under $15/Week",
    excerpt:
      "Packing healthy school lunches on a tight budget in NZ — weekly meal plans, Woolworths vs Pak'nSave price comparisons, and batch-cooking that works.",
    date: "February 8, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-29",
    image: "/assets/kiwi_peanut_butter_sandwich.webp",
    category: "Budget",
    staticPrices: true,
    author: "Yong Jae Lee",
    body: `
## The Reality of Lunchbox Costs in New Zealand

Let's be honest about the numbers. Packing school lunches is a meaningful weekly grocery cost — and for a family with two or three children it quietly adds up to thousands of dollars a year, an expense that often flies under the radar.

So let's start with the honest baseline rather than the aspirational one. **Costed against tracked supermarket prices, a lunchbox from our menu set has a median cost of about ${boxMedianLabel()}** — main plus a fruit and a second snack. The range runs from about ${boxFloorLabel()} to ${boxCeilingLabel()} depending on what the main is. ${boxUnderCount(3)} of our ${MENU_COUNT} menus come in under $3.

That means the $15-a-week target this guide is built around — $3 a box — is achievable, but it is not the default. You get there by choosing, not by hoping. This guide is about which choices actually move the number.

> **A correction worth flagging.** Earlier versions of this guide quoted lower figures, including a week at $2.09 a box. Those came from a costing bug we found and fixed in July 2026, which was mis-handling how much of a supermarket pack a single lunch uses. Every figure below has been rechecked. If you saw the old numbers and couldn't reproduce them, that's why — and you were right.

> **Price note:** The weekly plan below is costed from regular **Woolworths** shelf prices — not specials — re-read from their online shop each week and current as of ${priceMonth()}. Those figures are generated from the data, not typed in, so they move when the shelf does. The store-brand comparison further down is a different thing: a hand-recorded in-store snapshot from East Auckland during 2026, not part of the weekly tracking, so read its ratios rather than its absolute prices. Multi-chain regular prices live at the [NZ Lunchbox Price Index](/en/price-index). Prices vary by region and store.

---

## The Budget Lunchbox Principles

Before we get to specific meals and shopping lists, here are four principles that make budget lunchboxes work:

### 1. Cook from Scratch Where It Counts

Baking is where the gap between packaged and homemade is easiest to check. The homemade side below is the banana oat muffin recipe from our [healthy snacks guide](/en/guides/healthy-snacks-guide-nz), costed from its gram weights at the Woolworths prices we track; the store-bought side is the hand-recorded snapshot described in the price note above:

| Item | Store-bought | Homemade | Per unit | Saving |
|---|---|---|---|---|
${muffinSavingRow()}

> **How this table used to be wrong — twice.** Until August 2026 the saving column compared the two *totals* even when the pack sizes differed, which is meaningless; the percentage above is per unit. Then in September 2026 we found that the homemade column had been typed in by hand: it put a batch of twelve muffins at $1.50, while the recipe it describes costs what the row now shows. The muesli bar, hummus and sushi rows had the same problem and no recipe on this site to cost them from, so they have been taken out rather than guessed at.

You don't need to make everything from scratch. Baking is a good place to start.

### 2. Buy Staples at Pak'nSave, Extras at Woolworths

We track the price of 20 staples every week at both chains — read from each one's own online shop, with the Pak'nSave store set to Ormiston. Of the ${winnerTally().n} items we can follow back to our first round on ${firstRoundDate()}, Pak'nSave is cheaper on ${winnerTally().nowP}.${woolworthsCheaperClause()} Flour, sugar and frozen vegetables are not in the index, so this guide makes no claim about them.

What the index does not measure is range — specialty sauces, bakery lines, free-from products. If you need those, that is a separate reason to go to Woolworths, not a price one.

If you shop at one store, Pak'nSave will save you the most. If you have time for two stops, buy your weekly staples at Pak'nSave and pick up fresh items and specials at Woolworths. [Pak'nSave vs Woolworths: Lunchbox Staples Price Comparison](/en/blog/paknsave-vs-countdown-lunchbox-staples) has the 20-item comparison behind this.

### 3. Plan the Whole Week on Sunday

Random daily shopping leads to impulse buys and waste. Set aside 10 minutes on Sunday night to:

- Check what's already in the fridge and pantry
- Plan five lunches for the week
- Write a shopping list grouped by supermarket section
- Check Woolworths and Pak'nSave weekly specials online

### 4. Embrace Repetition (Kids Don't Mind)

Adults get bored with repetition. Children find it comforting. Children generally prefer familiar foods and eat more of them. A rotating cycle of 8-10 lunch options, used over and over, is more effective (and cheaper) than trying a new recipe every day.

---

## A $15/Week Lunchbox Plan

Here is a Monday-to-Friday week that actually hits the target — and rather than costing it by hand, I have let the same data that prices the planner pick it.

The rule for this table is simple: take the cheapest boxes in the menu set, keep them **nut-free** (this food is going to school), and spread them across the four recipe categories so the week is not five of the same thing. That is not how the planner picks a week — it shuffles, weighted towards favourites and leftovers, and only leans towards cheaper boxes when the specials option described further down is on. Each figure is a whole box — the main plus a fruit snack and one other snack — at regular Woolworths shelf prices, ${priceMonth()}.

| Menu | Category | Ingredients | Cost per box |
|---|---|---|---|
${budgetWeekRows().join("\n")}

### Weekly total: ${budgetWeekTotalLabel()}

That clears the $15 target with room to spare, and it does it without a single unusual ingredient. Note what is doing the work: the mains here are pasta, bread, lentils, flour and eggs. None of them is a novelty, and none of them is the expensive part of a lunchbox.

Two honest caveats. First, this is the **cheap end on purpose** — it is the five cheapest school-safe boxes we track, not a week I would pack five weeks running. Second, these are Woolworths prices; Pak'nSave usually runs a little under that on staples, so your own number should land at or below this one rather than above it.

---

## Batch Cooking: The Budget Parent's Secret Weapon

The real savings come from spending 1-2 hours on a Sunday afternoon preparing food for the week. Here is a realistic batch-cooking plan — and [Batch Cooking to Save Money on School Lunches](/en/blog/batch-cooking-save-money-nz) goes further into how it cuts the weekly cost.

### Sunday Batch Prep (Time: ~90 minutes)

| Task | Yield | Time |
|---|---|---|
| Cook rice (2 cups dry) | 3 days of sushi or rice balls | 25 min |
| Boil 10 eggs | 5 days of snacks | 15 min |
| Make hummus (1 can chickpeas) | 5 days of dip | 10 min |
| Bake a batch of 12 muffins | 5+ days of snacks | 30 min |
| Cook pasta (500g) | 2 days of pasta salad | 15 min |
| Chop vegetables (carrots, cucumber, capsicum) | 5 days of veg sticks | 10 min |

**Total batch prep time: ~90 minutes**

> This table used to carry a cost column — $3.75 for ten eggs, 95c for 500g of pasta. Both sat well under the prices we track, and the prices we track are not one number either: the dozen cage-free eggs the planner prices is ${money(packPrice("Eggs"))} at Woolworths, while the free-range dozen in the price index is ${indexWoolworths("Eggs (12-pack)")} there; the 500g of pasta the planner prices is ${money(packPrice("Pasta"))}, the penne in the index ${indexWoolworths("Pasta (500g)")}. Rather than add a third set of figures, I have removed the column. The ingredients here are already inside the weekly total above.

This single session covers a large portion of the week's lunches. For the first few days of the week you are essentially assembling pre-prepared components rather than cooking from scratch each morning.

---

## Store-Brand vs. Name-Brand: What's Worth the Premium?

Not all savings are created equal. Here is an honest comparison of where store brands match name brands — and where they don't:

### Store Brand Is Just as Good

The prices in this table are the hand-recorded in-store snapshot described in the price note above, not the weekly tracked figures. The gap between the two columns is the durable part; the dollar amounts have moved since.

| Product | Store Brand Price | Name Brand Price | Difference |
|---|---|---|---|
| Sliced bread (700g) | $2.80 (PnS) | $4.50 (Vogel's) | 38% saving |
| Pasta (500g) | $1.90 (PnS) | $3.50 (Barilla) | 46% saving |
| Rice (1kg) | $2.50 (PnS) | $4.00 (SunRice) | 38% saving |
| Canned chickpeas | $1.20 (PnS) | $2.20 (Watties) | 45% saving |

### Name Brand Is Worth It

| Product | Why |
|---|---|
| Yoghurt | Store-brand yoghurt often has more sugar and thinner texture |
| Cheese | Mainland or Anchor tends to slice and grate better |
| Wraps | Cheaper wraps crack and tear — Mission brand holds up |

---

## Reducing Food Waste: Saving Money by Not Throwing It Away

The 2025 [Rabobank-KiwiHarvest food waste survey](https://www.farmersweekly.co.nz/news/good-and-bad-news-in-food-waste-trends/) put the average New Zealand household's food waste at **$1,364 a year** — 10.9% of what it buys each week, down from 12.2% in 2023. In the lunchbox context, waste happens in two ways:

### Waste at Home
- Buying ingredients for a recipe you never make
- Lettuce going brown because you bought a whole head for two sandwiches
- Bread going stale before you use the whole loaf

**Solutions:**
- Freeze half a loaf of bread immediately — toast slices as needed
- Buy only what your weekly plan requires

### Waste at School
- Packing too much food that comes home uneaten
- Packing food your child doesn't actually like
- Packing food that's hard to eat in a short lunch break

**Solutions:**
- Start with smaller portions and increase if your child finishes everything
- Ask your child what they actually ate (not what they liked)
- Avoid foods that need cutlery or complex assembly — finger foods get eaten

---

## Smart Shopping Strategies

### Use the Supermarket Apps

Both Woolworths and Pak'nSave have apps that show weekly specials. Check them every Sunday before making your list.

- **Woolworths app:** Digital mailer with the week's specials, some of them Everyday Rewards member-only prices (the depth varies weekly and we do not track it)
- **Pak'nSave:** Check the weekly mailer on their website — great meat specials

### Buy in Season

Seasonal produce is cheaper and better quality. A rough guide for lunchbox staples:

| Season | Cheap & Good | Avoid (Expensive) |
|---|---|---|
| Summer (Dec-Feb) | Stone fruit, berries, tomatoes, cucumber | Citrus, kiwifruit |
| Autumn (Mar-May) | Apples, pears, mandarins, kumara | Berries, stone fruit |
| Winter (Jun-Aug) | Citrus, kiwifruit, carrots, broccoli | Tomatoes, capsicum |
| Spring (Sep-Nov) | Asparagus, new potatoes, strawberries | Apples (old stock), imported fruit |

### Stock Up on Specials

When lunchbox staples go on special, buy extra and store:

- **Canned tuna:** The 185g Sealord can in our price index is ${indexWoolworths("Canned Tuna (185g)")} at Woolworths at regular price — that is the number to beat before you stock up
- **Pasta:** Buy multiple bags when under $1.50
- **Cheese:** Freeze blocks of cheese — grate from frozen for sandwiches

---

## Free and Low-Cost Lunchbox Resources

### Government Support

- **Ka Ora, Ka Ako (Healthy School Lunches Programme):** Some NZ schools provide free lunches through this government programme. Check whether your school takes part on the Ministry of Education's [Healthy School Lunches Programme page](https://www.education.govt.nz/our-work/overall-strategies-and-policies/wellbeing-in-education/free-and-healthy-school-lunches)
- **Community food banks:** No shame in using these when budgets are tight — many provide lunchbox-friendly items

### Free Planning Tools

- Use the Kiwi Lunchbox Planner (free) to generate weekly plans with Woolworths price estimates
- Download and print shopping lists grouped by category

---

## July 2026 Reality Check: Pricing a Week from the Actual Mailers

Guides like this can drift out of date, so here is a concrete check from the week of 20-26 July 2026. I sat down with that week's Woolworths and New World mailers and built five lunchboxes entirely from what was on special, costing each box as pack price divided by the servings actually used:

| Day | Lunchbox | Cost per box |
|---|---|---|
| Monday | Popcorn chicken, carrot sticks, mandarin | $5.06 |
| Tuesday | Ham salad sandwich | $3.00 |
| Wednesday | Bagel with cream cheese | $1.24 |
| Thursday | Apple and cheese box | $1.60 |
| Friday | Toasted cheese jaffle, carrots, apple | $2.17 |

**Week total: $13.07 — about $2.61 a box.** Under the $15/week target this guide is built around, but not by as much as it first looked.

> **Correction, July 2026.** This table previously read $10.43 for the week ($2.09 a box). A reader pointed out on Facebook that the numbers didn't add up against what the photos showed, and they were right — though not for the reason any of us guessed. Our costing code was treating a *fraction of a pack* inconsistently, so some ingredients were counted at a fraction of what they cost and others at several times. The figures above are recalculated. What they include: every ingredient in the meal itself, plus the sides named in the row. What they don't include: a drink, and anything not listed. The dearest box by far is Monday's, and the popcorn chicken is why — protein is what moves a lunchbox budget, not the extras.

The specials doing the heavy lifting that week: Tegel Take Outs at $9.80 (40% off), Beehive shaved ham 200g at $5.50, Anchor cheese slices 250g at $3.90, Abe's bagels 4-pack at $4.79, and Molenberg bread 700g at $4.45. None of these are exotic — they are the same sandwich-and-hot-food staples this guide recommends, just bought in the week the mailer discounts them.

The lesson generalises: **decide the menu after reading the mailers, not before.** Our [free planner](/en/planner) does part of this for you. When a current week of Woolworths and New World specials has been recorded, the option **"Rank by cost after this week's specials"** is on by default: boxes that come out cheaper after the specials are more likely to be picked, though the week is still shuffled rather than built from the cheapest boxes. Untick it to plan on regular shelf prices. When no current mailer has been recorded, the option is off and plans use regular prices.

---

## The $3 Per Day Challenge

If $15/week still feels tight, here's a strict $3-per-day framework:

- **$1.00** — Main item (homemade sandwich, pasta, or rice-based dish)
- **$0.50** — Protein boost (egg, canned fish, or cheese)
- **$0.50** — Fruit (seasonal, bought in bulk)
- **$0.50** — Vegetables (carrots, cucumber — buy whole and chop yourself)
- **$0.50** — Snack (homemade baking, crackers, or popcorn)

This is achievable if you batch cook, buy seasonal, and shop at Pak'nSave. It requires discipline in planning.

---

## Start Saving on School Lunches This Week

Budget lunchbox planning is not about deprivation — it is about being deliberate. The families who spend the least on school lunches are not eating worse food; they are simply wasting less, cooking more strategically, and shopping with a plan.

[Try the Kiwi Lunchbox Planner →](/en/planner)
`,
  },

  "nz-seasonal-produce-calendar": {
    title: "NZ Seasonal Produce Calendar for School Lunches",
    excerpt:
      "What is in season month by month across New Zealand, with lunchbox ideas, storage tips, and what each item has actually done in the weekly mailers.",
    date: "February 19, 2026",
    lastReviewed: "October 2026",
    contentUpdated: "2026-10-02",
    image: "/assets/kiwi_blt_sandwich.webp",
    category: "Seasonal",
    staticPrices: true,
    author: "Yong Jae Lee",
    body: `
## Why Seasonal Eating Matters for NZ School Lunches

Seasonal eating is one of the simplest ways to improve lunchbox quality while reducing cost. When produce is in season in New Zealand, it is:

- **Cheaper** — supply is high, prices drop, and supermarkets run specials
- **Fresher** — it has not spent weeks in cold storage or been shipped from overseas
- **More nutritious** — freshly harvested produce retains more vitamins and minerals
- **Better tasting** — kids are more likely to eat fruit and vegetables that actually taste good

New Zealand's climate is uniquely suited to year-round produce, but there are distinct seasonal peaks that savvy parents can use to their advantage. This guide maps out every month of the school year with the best produce picks for lunchboxes.

---

## What the Mailers Actually Promote

Seasonal charts tell you what's *growing*. What you want to know is what's *cheap*, and the supermarket mailer answers that directly — retailers discount what they have too much of.

Each week the Woolworths and New World mailers are transcribed to tag what is on special in the planner; any special that changes a planner price is first checked against that product's own online listing. Here's how often each lunchbox-relevant produce item turned up across the ${PROMO_WEEK_COUNT} consecutive weekly mailers I have on file, from ${prettyDate(firstWeek())} to ${prettyDate(lastWeek())} ${lastWeek().slice(0, 4)}:

${produceWeeksTableMarkdown()}

**${produceTopSentence()}** If you want one rule, start with the top of this list — those are the ones the supermarkets keep discounting.

At the other end, ${produceRareList()} turned up in only one or two weeks. A lunchbox built around those will feel dearer, because you are rarely buying them on special.

> **Scope of this data.** ${PROMO_WEEK_COUNT} consecutive weeks of the Woolworths and New World mailers I entered into the planner. Earlier weeks on file have gaps, so they are left out rather than counted as zero. This says nothing about summer — so the month-by-month calendar below is based on NZ growing seasons rather than my price tracking. The table updates itself each week a new mailer goes in.

---

## The NZ School Year Calendar (Quick Reference)

NZ schools typically operate from late January/early February through to mid-December, with term breaks. Here is a seasonal overview aligned with the school year:

| Term | Months | Season | Best Produce |
|---|---|---|---|
| Term 1 | Feb-Apr | Late summer / Autumn | Stone fruit, tomatoes, corn, capsicum, grapes |
| Term 2 | May-Jul | Autumn / Winter | Citrus, kiwifruit, apples, carrots, broccoli |
| Term 3 | Jul-Sep | Winter / Early spring | Citrus, pears, mandarins, cauliflower, kumara |
| Term 4 | Oct-Dec | Spring / Early summer | Strawberries, cherries, new potatoes, asparagus |

---

## Month-by-Month Produce Guide

### February — Late Summer

The school year kicks off with an abundance of summer produce. This is the easiest (and cheapest) time for lunchbox fruit and vegetables.

**Best fruit for lunchboxes:**
- Nectarines and peaches
- Plums — excellent in a lunchbox, minimal mess
- Grapes — seedless varieties, easy to portion
- Watermelon — cut into cubes and pack in a container
- Blueberries — in peak season

**Best vegetables:**
- Cherry tomatoes — kids eat these like sweets
- Cucumber — slice into sticks, stays crisp until lunch
- Corn on the cob — microwave a cob, cut in half, send it cold
- Capsicum — red and yellow are sweeter than green; cut into strips

**Lunchbox idea:** Cold pasta salad with cherry tomatoes, cucumber, and feta + nectarine + blueberries.

---

### March — Early Autumn

Summer produce is still available but prices start to rise. Autumn varieties begin appearing.

**Best fruit:**
- Apples — NZ apple season starts; Royal Gala and Braeburn are excellent
- Pears — Packham and Beurre Bosc arrive
- Feijoas — the season starts late in the month; free if you have a tree
- Late grapes — still good value

**Best vegetables:**
- Sweetcorn — tail end of season, buy in bulk and freeze
- Tomatoes — still good, but prices rising
- Carrots — available year-round, but autumn carrots are sweeter
- Courgettes — excellent grated into muffins or fritters

**Lunchbox idea:** Chicken sandwich with lettuce + apple slices + homemade courgette muffin.

**Budget tip:** feijoas are cheapest once the season is in full swing in April and May, and roadside stalls and farmers' markets are worth a look. Buy a bag and make feijoa muffins for the freezer.

---

### April — Autumn

Autumn is NZ's golden season for produce. The variety is excellent and prices are reasonable.

**Best fruit:**
- Apples — peak season
- Pears — perfect ripeness
- Mandarins — early varieties start appearing (Satsuma)
- Persimmons — unusual but delicious, and some kids love them

**Best vegetables:**
- Kumara — NZ-grown, sweet and versatile; roast and add to wraps
- Broccoli — starting its good season
- Carrots — sweet and crunchy, perfect for lunchbox sticks
- Pumpkin — roast and use in sandwiches, muffins, or soup in a thermos

**Lunchbox idea:** Kumara and cheese wrap + carrot sticks with hummus + mandarin.

---

### May — Late Autumn

The transition to winter produce. Citrus begins to dominate the fruit section.

**Best fruit:**
- Mandarins — now in full swing; Easy Peel varieties are perfect for lunchboxes
- Apples — still excellent and cheap
- Kiwifruit — Zespri green kiwifruit arrives; the gold variety is slightly more expensive but sweeter
- Pears — late-season, store well

**Best vegetables:**
- Broccoli — at its best and cheapest
- Cauliflower — cheap and abundant
- Silverbeet and spinach — blanch and add to pasta, wraps, or muffins
- Carrots and celery — reliable, cheap, and crunchy

**Lunchbox idea:** Tuna pasta salad with broccoli florets + kiwifruit + cheese and crackers.

---

### June — Winter

Winter produce is heartier and more limited in variety, but there are still plenty of lunchbox options.

**Best fruit:**
- Mandarins — in season
- Oranges (navel) — excellent for juicing or slicing
- Kiwifruit — widely available and cheap
- Apples — from cold storage, still good quality

**Best vegetables:**
- Carrots — the star of winter lunchboxes
- Broccoli — still in season
- Cabbage — cheap, shred for coleslaw in sandwiches
- Kumara — roasted kumara chips make a great lunchbox snack

**Lunchbox idea:** Homemade sushi + mandarin + roasted kumara chips + yoghurt.

**Winter tip:** Soups and stews in a thermos flask are excellent for winter lunches. Pre-warm the flask with boiling water and fill it with piping-hot food — we have not measured how long any flask holds heat, so we do not quote a figure.

---

### July — Mid-Winter

Similar to June. Citrus is king.

**Best fruit:**
- Mandarins — still cheap and abundant
- Oranges — navel variety at peak
- Lemons — great for homemade lemonade or adding to recipes
- Stored apples — check for freshness; avoid soft or wrinkled ones

**Best vegetables:**
- Root vegetables — carrots, parsnips, beetroot, turnips
- Brassicas — broccoli, cauliflower, cabbage
- Leeks — excellent in savoury muffins and quiches

**Lunchbox idea:** Savoury leek and cheese muffin (homemade) + carrot sticks + mandarin + yoghurt.

---

### August — Late Winter

The first signs of spring produce appear alongside winter staples.

**Best fruit:**
- Citrus — still going strong
- Kiwifruit — last of the stored fruit
- Tamarillos — unique NZ fruit, sweet-tart flavour

**Best vegetables:**
- Spring onions — early growth
- Asparagus — very early season, expensive but a treat
- Spinach — new season leaves are tender and sweet

**Lunchbox idea:** Cheese and spinach pinwheels (using puff pastry) + orange segments + crackers + hummus.

---

### September — Early Spring

The transition month. Winter produce starts to fade, and spring newcomers arrive.

**Best fruit:**
- Strawberries — early season; expensive at first but improving weekly
- Citrus — tail end
- Apples — cool-stored NZ apples (the new season starts in February)

**Best vegetables:**
- Asparagus — now more affordable
- New potatoes — excellent boiled and cold in a salad
- Spring greens — lettuce, rocket, baby spinach at their best

**Lunchbox idea:** Potato salad with egg and mayo + strawberries + wholegrain crackers.

---

### October — Spring

Spring is in full swing. The produce section brightens up significantly. (For lunchboxes built around this month's produce, see [Spring Lunchbox Ideas for NZ Schools](/en/blog/spring-lunchbox-ideas-nz).)

**Best fruit:**
- Strawberries — prices dropping, quality improving
- Apples — cool-stored NZ apples

**Best vegetables:**
- Tomatoes — hothouse varieties appearing
- Cucumber — back in season
- Lettuce — fresh, cheap, and crisp
- Peas — fresh peas are sweet and kids love shelling them

**Lunchbox idea:** Chicken and salad sandwich + strawberries + fresh peas (in pod for fun).

---

### November — Late Spring

Summer produce is arriving in earnest. This is one of the best months for variety.

**Best fruit:**
- Strawberries — in season
- Stone fruit — early peaches and nectarines

**Best vegetables:**
- Tomatoes — local varieties now available
- Cucumber — cheap and plentiful
- Capsicum — prices dropping
- Courgettes — new season

**Lunchbox idea:** Cold rice paper rolls with chicken and vegetables + strawberries + cheese cubes.

---

### December — Early Summer

School winds down mid-December, but term 4 lunches benefit from early summer abundance.

**Best fruit:**
- Cherries — peak and often cheapest of the year
- Strawberries — abundant
- Blueberries — starting their season
- Stone fruit — nectarines, peaches, apricots

**Best vegetables:**
- Everything is available and affordable
- Corn arrives in late December

**Lunchbox idea:** Hummus and vegetable wrap + cherry mix + yoghurt.

---

## Seasonal Produce Storage Tips

Getting the most out of seasonal produce means storing it correctly:

| Produce | Best Storage | Lasts |
|---|---|---|
| Apples | Fridge (produce drawer) | 4-6 weeks |
| Bananas | Bench (away from other fruit) | 5-7 days |
| Mandarins | Cool bench or fridge | 1-2 weeks |
| Carrots | Fridge, in sealed bag | 3-4 weeks |
| Cucumber | Fridge, wrapped in paper towel | 1 week |
| Tomatoes | Bench (never fridge) | 5-7 days |
| Berries | Fridge, unwashed until use | 3-5 days |
| Broccoli | Fridge, in open bag | 5-7 days |

---

## Why Seasonal Matters: Cost, Freshness, and the 5+ A Day Connection

The case for seasonal eating in a NZ lunchbox is not purely sentimental. There are three measurable benefits worth understanding:

### 1. Cost: in-season produce is markedly cheaper

NZ produce prices follow steep seasonal curves. The **Stats NZ Food Price Index** shows large seasonal swings in fruit and vegetable prices, but the size of the swing depends entirely on the item, so I am not putting a single number on it. Buying in season is still one of the biggest levers you have on a weekly shop.


### 2. Freshness: Picked closer to home

Out-of-season produce is either **imported** or **grown under cover**, and it usually costs more for it. Produce picked in season, closer to home, has had less time between the field and your fridge.

### 3. The 5+ A Day connection

The **5+ A Day** message, run in NZ by the 5+ A Day Charitable Trust, asks NZ children and adults to eat at least 5 servings of fruit and vegetables daily, with the implicit assumption that those servings will be affordable, fresh, and varied. Following the seasonal calendar above is the practical mechanism that makes 5+ A Day reachable on a real grocery budget. Out-of-season variety is genuinely harder to sustain financially for a family of four.

---

## Term-by-Term Seasonal Lunchbox Examples

Mapping seasonal produce onto the NZ school term structure makes the calendar above immediately actionable. NZ school terms broadly align with seasonal transitions, so each term has its own produce signature:

### Term 1 (Late January – Early April)

Late summer into early autumn. Stone fruit ending, apples and pears arriving, capsicum and tomato still abundant.

- **Wrap with chicken + cucumber + capsicum + lettuce** | apple | cheese cubes | yoghurt | frozen water bottle
- **Sandwich with egg + lettuce + tomato** | nectarine or peach | carrot sticks | yoghurt
- **Pasta salad with tomato + capsicum + corn** | apple | cheese | small milk
- **Wholegrain wrap + hummus + cucumber + grated carrot** | peach | crackers | yoghurt
- **Sushi rolls with cucumber + capsicum** | grapes | edamame | yoghurt

Term 1 is also the heat-safety term. See [NZ Lunchbox Food Safety](/en/blog/lunchbox-food-safety-nz-term-1-heat) for the heat-pairing rules.

### Term 2 (Late April – Early July)

Autumn into early winter. Apples and pears at peak, citrus arriving, kumara and pumpkin reach the supermarket.

- **Wrap with chicken + apple slices + lettuce** | mandarin | cheese | yoghurt
- **Pumpkin and feta scone (homemade)** | pear slices | carrot sticks | hummus | yoghurt
- **Roast kumara and feta in a Thermos** | apple | cherry tomatoes | yoghurt
- **Egg sandwich + lettuce** | banana | crackers | yoghurt
- **Wholegrain pasta with grated carrot + cheese** | mandarin segments | cucumber

### Term 3 (Mid-July – Late September)

Winter into early spring. Citrus peak. Brassicas (broccoli, cauliflower, cabbage) abundant and affordable. Stored apples + first asparagus toward term end.

- **Sandwich with chicken + grated carrot + lettuce** | orange segments | cheese cubes | hummus | yoghurt
- **Vegetable soup (Thermos) with wholegrain bread** | mandarin | cheese cube | yoghurt
- **Cauliflower fritter (homemade) + dip** | apple | carrot sticks | yoghurt
- **Brown rice + roasted broccoli + grated cheese (Thermos)** | mandarin | cucumber
- **Cheese and spinach pinwheel** | orange segments | crackers | hummus

Term 3 is the highest leverage for citrus — the cheapest and most nutrient-dense fresh fruit available in NZ winter.

### Term 4 (Mid-October – Mid-December)

Spring into early summer. Strawberries arrive, asparagus peaks then ends, new-season tomatoes return. End of term collides with peak cherry and stone fruit availability.

- **Wrap with chicken + lettuce + cucumber** | strawberries | cheese | yoghurt
- **Asparagus and feta tart (homemade)** | apple | crackers | yoghurt
- **Pasta salad with cherry tomatoes + cucumber** | strawberries | cheese cubes
- **Sushi rolls** | strawberries | edamame | yoghurt
- **Sandwich with egg + lettuce + cucumber** | cherries | carrot sticks | yoghurt

This term-by-term mapping is roughly how I rotate my daughter's lunchbox through the year — the themes shift as the produce in the kitchen changes, with minimal planning effort.

---

## Preserved, Frozen, and Dried — Extending the Season

Fresh seasonal produce dominates the calendar, but a NZ pantry that uses preserved forms strategically can keep lunchbox variety high through the leanest weeks (typically September–October for fresh fruit).

### Frozen produce that holds up in a lunchbox

- **Frozen berries** — defrost overnight in the fridge, mix with plain yoghurt in the morning. NZ-grown frozen blueberries last all year and are nutritionally close to fresh.
- **Frozen sweetcorn kernels** — add to pasta salad, cous-cous, or wraps.
- **Frozen peas** — defrost and toss into pasta salad. Peas frozen at the peak of harvest can hold onto more vitamin C than fresh peas that have sat in the fridge for several days.

### Dried produce

- **Dried apricots, dates, sultanas** — high iron, sweet, lunchbox-stable indefinitely. Watch sugar content on commercial dried fruit "snack packs" — many add sugar.
- **Dried apple rings** — keep for months, but drying concentrates the sugar, so treat them as a small-portion snack rather than a swap for fresh fruit.

### Preserved (canned)

- **Tinned tomatoes** — best in Term 3 pasta sauces when fresh tomatoes are expensive and tasteless.
- **Tinned tuna and salmon** — primary protein for non-meat lunches year-round. Pair with vitamin-C produce to boost iron absorption (see [Iron-Rich Lunchbox Foods](/en/blog/iron-rich-lunchbox-foods-nz)).
- **Tinned chickpeas, kidney beans, mixed beans** — vegetarian protein backbone year-round.

---

## A Practical Sunday Routine for Seasonal Eating

Once the seasonal calendar is internalised, the weekly shop becomes a quicker decision:

1. **Open the supermarket mailer or app**. Check what is on this week's specials.
2. **Cross-reference with the current month's calendar** above. Specials on out-of-season produce are still expensive on absolute terms; specials on in-season produce are the genuine deal.
3. **Pick 2–3 fruits and 2–3 vegetables** that are both in season AND on special this week.
4. **Anchor the week's lunchboxes** around those 4–6 items, with the standard protein/dairy/wholegrain bases unchanged.

This routine, applied weekly across a school year, keeps the fruit and vegetable part of the shop in season — without sacrificing variety or freshness.

For more on weekly routine and morning prep, see [Term 1 First Week: An Auckland Parent's 5-Day Lunchbox Routine](/en/blog/term-1-first-week-lunchbox-routine-auckland-parent).

---

## References

- 5+ A Day Charitable Trust — [5aday.co.nz](https://www.5aday.co.nz/)
- 5+ A Day Trust (NZ): seasonal produce calendar and campaign resources — [5aday.co.nz](https://www.5aday.co.nz/)
- Stats NZ: Consumer Price Index, food group breakdowns showing seasonal price variation — [stats.govt.nz](https://www.stats.govt.nz/)
- Horticulture New Zealand: industry-level produce season data.
- Ministry of Health NZ: *Eating and Activity Guidelines for New Zealand Adults / Children*.

This guide is informational and aligned with publicly available NZ nutrition and produce industry guidance. Regional season timing varies year to year with weather; use this calendar as a starting framework, not a fixed schedule.

---

## Plan Your Seasonal Lunches

Use the Kiwi Lunchbox Planner to generate weekly plans that factor in what is in season right now. Less expensive, fresher ingredients, happier kids.

[Try the Kiwi Lunchbox Planner →](/en/planner)
`,
  },

  "school-lunchbox-policy-guide-nz": {
    title: "Understanding Your NZ School's Lunchbox Policy",
    excerpt:
      "Navigating NZ school food policies — what is typically allowed and banned, nut-free rules, cultural food days, and how to talk to your school.",
    date: "March 5, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-28",
    image: "/assets/kiwi_egg_salad_sandwich.webp",
    category: "Parenting Tips",
    author: "Yong Jae Lee",
    body: `
## Why NZ Schools Have Lunchbox Policies

If you are new to the New Zealand school system — whether as a first-time parent or a recent immigrant — you may be surprised to learn that most NZ schools have specific rules about what children can and cannot bring in their lunchboxes.

These policies exist for several important reasons:

- **Allergy safety** — protecting children with severe food allergies, especially nut allergies
- **Health promotion** — encouraging healthier eating habits in line with the [NZ Ministry of Health guidelines](https://www.health.govt.nz/publications/food-and-nutrition-guidelines-for-healthy-children-and-young-people-aged-2-18-years-a-background)
- **Behavioural management** — reducing sugar highs, lunchtime trading of junk food, and associated behavioural issues
- **Equity** — minimising visible disparities between children's lunches
- **Sustainability** — some schools are now incorporating waste-reduction goals

Understanding your school's policy from day one saves confusion, embarrassment, and — most importantly — keeps all children safe.

The one that shapes our house is the nut-free rule. It's the reason the planner has a nut-free filter at all: I got tired of checking labels one at a time and built the check into the tool instead. Two things I've learned the hard way and that this guide will keep coming back to — **"may contain traces" counts**, and **formulations change without warning**, so a bar that was fine last term can quietly stop being fine. Read the packet each time, not once.

---

## How Much a Nut-Free Policy Actually Restricts You

Before the tables, one number that surprised me when I checked it.

Our menu set is ${MENU_COUNT} lunches. **89 of them — 95% — are nut-free.** A nut-free policy rules out about one lunch in twenty, not the half of your options it feels like when you're standing in the biscuit aisle reading labels.

Here's how the other common restrictions compare across the same ${MENU_COUNT} menus:

| Restriction | Menus that still work | Share |
|---|---|---|
| Nut-free | 89 | **95%** |
| Egg-free | 65 | 69% |
| Vegetarian | 53 | 56% |
| Dairy-free | 43 | 46% |
| Gluten-free | 23 | 24% |
| Vegan | 21 | 22% |

The pattern is worth internalising: **nut-free is the easy one, gluten-free is the hard one.** If your school is nut-free and you feel boxed in, the constraint is probably packet snacks rather than lunches — nuts turn up in muesli bars and trail mixes far more than in sandwiches. Swap the snack, not the whole plan.

(These counts come from our own menu database, which you can filter yourself in the [free planner](/en/planner). They're a fair proxy for how restrictive each rule is in practice, not a survey of NZ schools.)

---

## What Most NZ Schools Allow and Restrict

While every school sets its own policy, there are strong common patterns across New Zealand. Here is a general guide based on the food policies NZ schools commonly publish:

### Almost Always Allowed

| Food Category | Examples |
|---|---|
| Fresh fruit | Apples, bananas, mandarins, grapes, kiwifruit |
| Fresh vegetables | Carrot sticks, cucumber, cherry tomatoes, capsicum |
| Sandwiches and wraps | Wholegrain bread, wraps with fillings |
| Dairy | Cheese, yoghurt (plain or low-sugar), milk |
| Protein | Hard-boiled eggs, chicken, canned tuna (in a sandwich) |
| Grains | Rice, pasta, crackers, rice cakes |
| Water | Always encouraged; most schools have fountains |

### Usually Allowed (Check Your School)

| Food | Notes |
|---|---|
| Muesli bars | Must be nut-free; some schools restrict all packaged bars |
| Homemade baking | Allowed if nut-free; some schools require ingredient lists |
| Sushi | Popular and generally accepted |
| Popcorn | Plain or lightly salted usually fine |
| Dried fruit | Small portions; some schools restrict due to sugar content |

### Commonly Restricted or Banned

| Food | Reason |
|---|---|
| Peanut butter | Nut allergy risk — restricted at many schools; check yours |
| Tree nut products | Includes almonds, cashews, walnuts, hazelnuts |
| Nutella / chocolate spread | Contains hazelnuts |
| Lollies and sweets | Sugar, behavioural concerns, trading |
| Chocolate bars | Same as above |
| Fizzy drinks | Sugar, caffeine (in cola) |
| Energy drinks | High caffeine — not suitable for children |
| Chips / crisps | Many schools ban or discourage these |
| Fruit juice boxes | High sugar content |
| Chewing gum | Mess, choking hazard for younger children |

---

## The Nut Policy: What Parents Need to Know

Nut policies are the school food rules with the highest stakes, because the risk is to another child. Here is what you need to understand — [Nut-Free School Lunches & Snacks: A Guide for NZ Parents](/en/blog/nut-free-school-lunches-new-zealand) covers how to pack within these rules without losing nutrition.

### Why Nuts Are Singled Out

Peanut and tree nut allergies are among the most common causes of anaphylaxis (severe allergic reaction) in children. A child with a severe nut allergy can react to:

- Direct ingestion (eating a nut product)
- Skin contact (touching a surface contaminated with nut residue)
- In rare cases, airborne particles (e.g., someone eating peanuts nearby)

Because young children share food, touch each other, and use shared surfaces, schools take a precautionary approach.

### Your Responsibilities as a Parent

Even if your own child does not have a nut allergy, you must:

- **Check every packaged food label** for nut ingredients and "may contain" warnings
- **Avoid sending any nut-based products** — including peanut butter, Nutella, trail mix, and nut-containing muesli bars
- **Be aware of hidden nut sources** — pesto (pine nuts), some Asian sauces (peanut satay), baked goods with almond meal
- **Inform your child** that they should not share food at school

### Common Mistakes with Nut Policies

| Mistake | Why It's a Problem |
|---|---|
| Sending pesto pasta | Traditional pesto contains pine nuts |
| Sending muesli bars without checking | Many contain nuts or are made in facilities that process nuts |
| Sending homemade baking with "hidden" almond meal | Common in gluten-free recipes |
| Assuming "may contain traces" is fine | For severely allergic children, it is not |

---

## Cultural Food Days and Shared Food Events

NZ schools are increasingly multicultural, and many celebrate this through cultural food days, shared morning teas, and class parties. These events create additional considerations:

### Tips for Contributing to Shared Food Events

- **Label your contribution** with a full ingredient list — many schools now require this
- **Avoid common allergens** (nuts, eggs, dairy) unless you know the class is allergy-free
- **Ask the teacher** about specific requirements before preparing food
- **Keep it simple** — foods that are clearly identifiable (fruit platters, sandwiches) are safer than complex dishes where ingredients are hidden

### If Your Child Has Allergies

- Provide a "safe treat box" to the teacher at the start of the year — a container of pre-approved snacks your child can have during class events
- Discuss major events (e.g., end-of-year parties) with the teacher in advance
- Send your child with an alternative treat on cultural food days

---

## The Ka Ora, Ka Ako Programme

New Zealand's government-funded Healthy School Lunches programme (Ka Ora, Ka Ako) provides free lunches to students at participating schools. Key facts:

- Launched in 2020 and funded by the Ministry of Education
- Provides a free lunch to every student at participating schools
- Schools are selected by the Ministry using its Equity Index — a school cannot apply to join
- The way lunches are supplied changed from 2025, so what is served can differ by school and year level
- The Ministry of Education's Ka Ora, Ka Ako pages list which schools take part

If your school participates, your child may receive a provided lunch, reducing or eliminating the need for a packed lunchbox on some days. Some families still send a lunchbox in addition to the provided meal.

---

## Communicating with Your School

### At Enrolment

- Ask for a copy of the **school food policy** — it may be in the enrolment pack or on the school website
- Declare your child's **food allergies or dietary restrictions** on the enrolment form
- Ask about the school's **medical action plan** for allergic reactions

### During the Year

- If you are unsure whether a specific food is allowed, **email the class teacher or office** — it is better to ask than to guess
- If your child reports that other students are bringing banned items, mention it diplomatically to the teacher
- **Volunteer for school food events** if you can — it gives you oversight of what is being served

### For New Immigrants and Multilingual Families

NZ school food policies can be unfamiliar if you have moved from a country with different norms. Some tips:

- Many schools provide translated policy documents — ask the office
- The school may have a **cultural liaison officer** or parent volunteer who speaks your language
- Do not hesitate to ask questions — schools understand that food culture varies and are generally supportive
- Some traditional foods from other cultures may contain allergens that are common in NZ schools (e.g., peanut-based sauces in Southeast Asian cuisine, almond meal in Middle Eastern baking) — check with the school if you are unsure

---

## Waste-Free Lunchbox Policies

A growing number of NZ schools are adopting "waste-free" or "litterless" lunchbox policies. This means:

### What Waste-Free Means

- **No single-use packaging** — avoid plastic wrap, cling film, disposable bags, juice boxes
- **Reusable containers** — use a lunchbox with compartments, reusable silicone bags, or beeswax wraps
- **No pre-packaged snacks** — some schools ask that all food be transferred into reusable containers (no chip packets, muesli bar wrappers, etc.)
- **Bring waste home** — any rubbish generated goes back in the lunchbox for home disposal

### Practical Tips for Waste-Free Lunches

- **Invest in a good lunchbox** — Sistema, Yumbox, and Bentgo are popular in NZ. A compartmentalised lunchbox eliminates the need for individual containers and wrapping.
- **Beeswax wraps** replace cling film for sandwiches — available at Woolworths and many NZ eco-stores
- **Reusable drink bottle** — stainless steel is durable and keeps water cool
- **Silicone snack bags** — washable and reusable; good for crackers, dried fruit, and popcorn

### Cost of Going Waste-Free

| Item | Typical lifespan |
|---|---|
| Reusable plastic lunchbox | 2-3 years |
| Stainless steel water bottle | 5+ years |
| Beeswax wraps | about 1 year |
| Silicone snack bags | 3+ years |

The upfront cost is higher than disposable packaging, and it pays back over the years the items last. I have not priced these, so I am not quoting a figure.

---

## What to Do If Your Child's School Has No Policy

Some schools, particularly smaller rural schools, may not have a formal written food policy. In this case:

- Apply the **common-sense guidelines** above — avoid nuts, minimise sweets, pack balanced meals
- **Talk to the teacher** about whether there are any allergic children in the class
- **Suggest a policy** to the school board if you think one would be beneficial — many schools welcome parent input

---

## Lunchbox Planning That Respects School Policies

The planner is designed with NZ school policies in mind. Switch on the Nut Allergy filter — and any others your school needs — and every menu in the plan will follow it.

[Try the Kiwi Lunchbox Planner →](/en/planner)
`,
  },

  "lunchbox-food-safety-guide-nz": {
    title: "Food Safety for School Lunchboxes: Temperature, Storage & Packing",
    seoTitle: "School Lunchbox Food Safety: Temperature, Storage, Packing",
    excerpt:
      "Keeping school lunches safe from bacteria — the temperature danger zone, insulated bags, ice packs, and which foods need refrigeration in NZ.",
    date: "March 18, 2026",
    lastReviewed: "October 2026",
    contentUpdated: "2026-10-12",
    image: "/assets/kiwi_macaroni_cheese.webp",
    category: "Gear & Tips",
    author: "Yong Jae Lee",
    body: `
## Why Food Safety Matters in School Lunchboxes

A school lunchbox sits in a bag, in a cloakroom or under a desk, for 3-5 hours before your child eats it. During warmer months in New Zealand — and "warmer" can mean anything from October to April in many regions — that lunchbox can reach temperatures where bacteria multiply rapidly.

Symptoms like stomach cramps, nausea, and diarrhoea are easy to put down to "a bug going around", but food that was not kept at a safe temperature can cause exactly the same thing.

The part that does the work is the cold source. I pack my daughter's lunch around a frozen drink bottle — it does the cooling job, it's already in the bag, and there's nothing extra to remember or wash. An insulated bag helps a cold source last; it does not replace one. That's the practical bias running through this guide: the food safety advice that survives a real school morning is the advice that doesn't add a step.

What follows is the temperature science, the two-hour rule as [Food Standards Australia New Zealand](https://www.foodstandards.gov.au/business/food-safety/2-hour-4-hour-rule) actually states it, which foods go off fastest, and what gear is worth buying.

> **Source:** The danger zone and the four-hour limit come from New Zealand Food Safety (part of MPI — Ministry for Primary Industries). The two-hour split inside that window is Food Standards Australia New Zealand's. The food groupings further down are my own.

---

## The Easiest Safety Win Is Choosing the Right Kind of Lunch

Most food safety advice is about managing risk after you've made the food. There's a step before that: some lunches simply don't carry the risk.

Of our ${MENU_COUNT} menus, **${NO_COOK_COUNT} are no-cook** — no hob, no oven, no reheating at any point. Another **${MAKE_AHEAD_COUNT} are make-ahead**, cooked the night before and refrigerated overnight, which is the safest way to handle cooked food because it goes into the fridge fast and comes out cold. Only **${COOK_FRESH_COUNT} are cook-fresh**, and those are the ones where the morning timing matters: food cooked at 7am and packed warm is food that starts its day inside the danger zone.

Skipping the stove is not the same as skipping the chill, and this is where the shortcut goes wrong: **most of the no-cook menus are built on** ham, chicken, tuna, mayonnaise, cheese or yoghurt — perishable protein and dairy, which is exactly what the danger zone below is about. They need the ice pack as much as a cooked lunch does. The [no-cook article](/en/blog/no-cook-lunchbox-ideas-nz) goes through which of them carry those ingredients and which do not.

| Prep style | Menus | Food safety profile |
|---|---|---|
| No-cook | 28 | Never heated — but most carry meat, fish, mayonnaise or dairy, so still pack cold |
| Make-ahead | 47 | Low risk if chilled overnight before packing |
| Cook-fresh | 19 | Needs care — cool fully before it goes in the box |

A separate **${THERMOS_COUNT} menus are thermos-friendly**, which flips the problem: instead of keeping food below 5°C you keep it above 60°C, and the danger zone is skipped from the other side. Both work. What doesn't work is warm food in a cold box.

If you want to sort by these yourself, the [planner](/en/planner) has prep-style and thermos filters.

---

## The Temperature Danger Zone

The single most important concept in lunchbox food safety is the **temperature danger zone**: the range between 5°C and 60°C where bacteria multiply most rapidly.

### Key Facts

| Temperature | What Happens |
|---|---|
| Below 5°C | Bacteria growth slows dramatically — this is where the fridge should keep food |
| 5°C - 60°C | **DANGER ZONE** — bacteria multiply fastest; under ideal conditions some can double in about 20 minutes |
| Above 60°C | Too hot for bacteria to multiply. This is a *holding* temperature, not a kill step — NZ Food Safety's instruction for reheating is 75°C |

### The 2-Hour / 4-Hour Rule

New Zealand Food Safety's limit is four hours in the danger zone. Food Standards Australia New Zealand splits that window at the two-hour mark in its guidance for food businesses — the table is theirs, and applying it to a lunchbox is my judgement:

| Time in Danger Zone | Action |
|---|---|
| Less than 2 hours | Safe to eat or refrigerate |
| 2-4 hours | Safe to eat but do not refrigerate for later |
| More than 4 hours | **Throw it away** |

For a lunchbox packed at 7:30am and eaten at 12:30pm, that is 5 hours. If perishable food is not kept cold, it has been in the danger zone for too long.

---

## Which Lunchbox Foods Need to Stay Cold?

Not all foods are equally risky. Moist, protein-rich foods support bacterial growth best; dry foods barely at all. The grouping below is my own, built on that principle — it is not an official NZ Food Safety list:

### High Risk (Must Stay Cold)

These foods support rapid bacterial growth and must be kept below 5°C:

| Food | Risk Factor |
|---|---|
| Sliced deli meats (ham, chicken, salami) | Protein + moisture = bacterial growth |
| Dairy (yoghurt, cheese, milk) | Protein + moisture |
| Cooked rice and pasta | Bacillus cereus risk when cooled improperly |
| Egg-based items (boiled eggs, egg sandwiches) | Protein + moisture |
| Hummus and dips | Chickpea base supports bacterial growth |
| Cut fruit (melon, berries) | Exposed surface allows contamination |
| Sushi with fish | Raw or cooked fish is high risk |

### Medium Risk (Should Stay Cool, Not Critical)

| Food | Notes |
|---|---|
| Cheese (hard, uncut) | Lower moisture than soft cheese; more resilient |
| Bread and wraps | Low moisture on their own — the filling decides the risk |

### Low Risk (Safe at Room Temperature)

| Food | Notes |
|---|---|
| Whole, uncut fruit | Bananas, apples, mandarins, oranges |
| Dried fruit | Low moisture content |
| Plain crackers and rice cakes | Dry goods |
| Popcorn | Very low moisture |
| Sealed, shelf-stable snacks | Muesli bars (sealed), chips |
| Nut-free seed bars | If sealed |

---

## Keeping Lunchboxes Cold: Gear Guide

### Insulated Lunch Bags

An insulated lunch bag slows down how fast the cold source warms up. It is the ice pack or frozen drink bottle inside that keeps the food cold — a bag with nothing cold in it only slows the food's drift toward room temperature. We have not measured how long any bag holds, so there are no hours here.

| Type | How it works |
|---|---|
| Freezable bag (e.g. PackIt) | The walls are frozen overnight and act as the cold source — no separate ice pack to forget |
| Foam-lined bag (e.g. Sistema, Kmart) | Needs a separate ice pack or frozen drink bottle |
| Bag made for one box (e.g. Yumbox) | Fits one lunchbox; still needs a cold source |

**Prices and stock:** [Best Insulated Lunch Bags in NZ](/en/blog/insulated-lunch-bags-review-nz) compares the five types you'll actually find on NZ shelves, with prices read off the shelf at Kmart Botany on 18 August 2026 — a buying guide rather than a lab test.

### Ice Packs

| Type | Pros | Cons | Best For |
|---|---|---|---|
| Rigid ice packs (reusable) | Long-lasting, reusable, cheap | Takes up space | Large lunchboxes |
| Slim ice packs | Space-efficient, fits alongside food | Slightly less cooling power | Compact lunchboxes |
| Frozen water bottle | Doubles as cold drink; free | Condensation; heavy | Summer |
| Frozen juice box | Keeps food cold + becomes a drink | High sugar content | Occasional use only |

**Tip:** Place the ice pack on top of the food, not underneath. Cold air sinks, so a top-placed ice pack cools the entire lunchbox more effectively.

### Thermos Flasks for Hot Food

In winter, a wide-mouthed vacuum flask is how a hot lunch reaches the classroom at all. This is a great way to add variety during the colder months.

We have not tested flasks and we do not publish heat-retention figures or a brand ranking — a duration printed on packaging is a manufacturer's claim, not a measurement of ours. What to check instead:

| What to look at | Why it matters for a school lunch |
|---|---|
| Mouth width | A narrow drink flask takes thin soup and nothing else — no rice, no pasta, and no spoon |
| Vacuum-insulated stainless steel | "Insulated" also appears on foam-walled containers, which are not the same thing |
| A lid the child can open unaided | A seal tight enough to hold heat is tight enough to defeat small hands |
| Capacity matched to the portion | A part-filled flask carries a pocket of air that has to be warmed too |
| Removable seal | Moulded-in seals cannot actually be cleaned |

**Hot food tip:** Pre-warm the flask with freshly boiled water while you finish cooking, tip it out, then fill with piping-hot food. Our [thermos lunches article](/en/blog/thermos-hot-lunches-nz-winter) sets out the whole routine.

---

## Packing for Food Safety: Step by Step

### The Night Before

- **Cook and cool properly:** If you are making pasta salad, rice dishes, or anything that needs to cool down, cook it in the evening and refrigerate immediately. Do not leave cooked food on the bench overnight.
- **Prep and refrigerate:** Cut vegetables, portion cheese, and assemble sandwiches (if using ingredients that tolerate overnight fridge storage). Store in airtight containers in the fridge.
- **Freeze ice packs:** Put your ice packs in the freezer the night before.

### In the Morning

1. Take food directly from the fridge and pack into the lunchbox
2. Place the ice pack on top of the food
3. Close the insulated bag immediately
4. Store the packed lunchbox in the fridge if there is time before leaving (even 20 minutes helps)
5. Tell your child to keep the lunchbox in their bag (not on a sunny windowsill) until lunchtime

### After School

- **Check what came home:** If perishable food came home uneaten and has been out of the fridge for more than 2 hours, throw it away — under the 2-hour / 4-hour rule above it cannot go back in the fridge for later
- **Wash the lunchbox:** Use hot, soapy water every day. Lunchbox surfaces can harbour bacteria
- **Dry completely:** Moisture encourages mould growth, especially in compartmentalised lunchboxes with corners and crevices

---

## Summer vs. Winter: Adjusting Your Approach

### Warm months (Term 4 and Term 1)

From about October to April, many NZ school days are warm enough that a cloakroom sits well inside the danger zone. During those terms:

- **Always pack a cold source** (ice pack or frozen drink bottle) — non-negotiable. An insulated bag around it helps it last
- **Favour lower-risk foods** — whole fruit, crackers, sealed snacks
- **Avoid mayonnaise-based salads** unless very well chilled
- **Consider a frozen water bottle** as an extra cooling element
- **Pack less perishable food overall** — a slightly less adventurous lunch is better than a unsafe one

Term 1 is the hardest stretch of the NZ summer for lunchboxes. [NZ Lunchbox Food Safety: A Term 1 Heat Guide](/en/blog/lunchbox-food-safety-nz-term-1-heat) translates the MPI standards into packing rules, including the frozen drink bottle method.

### Cool months (Term 2 and Term 3)

Food safety risks are lower from about May to September, but they do not disappear — a heated classroom is still above 5°C:

- **Insulated bags are still helpful** — they keep cold food cold AND hot food warm
- **Thermos lunches are ideal** — hot soup, pasta, or rice goes in piping hot and skips the danger zone from the hot side
- **Be cautious on mild winter days** — NZ winters can have surprisingly warm days, especially in the upper North Island

---

## Common Food Safety Mistakes Parents Make

### 1. Packing Warm Food

Putting freshly cooked food (hot pasta, warm rice) directly into a lunchbox creates a warm, moist environment that bacteria love. Always cool food to fridge temperature before packing — or use a thermos designed for hot food.

### 2. Reusing Uneaten Perishable Food

If your child brings home half a sandwich with chicken and mayo that has been in a 25°C cloakroom for 5 hours, it is not safe to eat. Toss it.

### 3. Not Washing the Lunchbox Daily

A lunchbox that smells fine can still harbour bacteria. Wash with hot, soapy water every single day. Weekly, do a deep clean with a baking soda paste or diluted white vinegar.

### 4. Relying on a Lunchbox Without Insulation

A regular plastic lunchbox in a school bag provides zero temperature control. Without a cold source, the food inside drifts toward the temperature of the room around it.

### 5. Forgetting to Freeze the Ice Pack

An ice pack at room temperature does nothing. Freeze it overnight — every night.

---

## Food Safety for Specific Items

### Rice and Pasta

Cooked rice is one of the highest-risk lunchbox foods due to Bacillus cereus, a bacterium that produces toxins when cooked rice is left at room temperature. The rules:

- Cool cooked rice within 1 hour of cooking
- Refrigerate immediately in a shallow container
- Use within 24 hours
- Keep cold in the lunchbox with an ice pack
- The same applies to cooked pasta

### Eggs

Hard-boiled eggs are a nutritious lunchbox staple, but they need proper handling:

- Cool immediately after boiling (run under cold water)
- Refrigerate with the shell on
- Peel in the morning, not the night before (the shell protects against bacteria)
- Keep cold with an ice pack

### Sandwiches with Meat or Dairy

- Assemble in the morning using cold ingredients straight from the fridge
- Keep on an ice pack
- Avoid leaving sandwiches with ham, chicken, or cheese at room temperature for more than 2 hours

---

## Quick Reference: The Lunchbox Safety Checklist

- Ice packs frozen overnight
- Cold source in the bag (ice pack or frozen drink bottle)
- Perishable items packed cold, straight from fridge
- Ice pack placed on top of food
- Lunchbox kept in school bag (not in sun)
- Uneaten perishable food discarded after school
- Lunchbox washed with hot soapy water daily

---

## Packing for a Child Under 5

Keeping food cold is not the only thing that changes for younger children: under-5s are also more likely to choke. If you are packing for kindy, the Ministry of Health's choking guidance for early learning services lists foods to leave out and says how to cut up others — summarised in [Kindy Lunchboxes in NZ: The Choking Guidance in Plain English](/en/guides/kindy-lunchbox-choking-guide-nz).

---

## Plan Safe, Healthy Lunches

The planner does not tell you which menus need to stay cold — only a handful of its recipe methods mention the fridge or an ice pack, and it has no temperature or season data. Use the high-risk table above for that. What it can do is filter by prep style or to thermos-friendly menus.

[Try the Kiwi Lunchbox Planner →](/en/planner)
`,
  },

  "healthy-snacks-guide-nz": {
    title: "The Complete Guide to Healthy School Snacks in NZ",
    excerpt:
      "School-safe snacks for NZ kids — morning tea ideas, nut-free options, and what each costs per serve at regular Woolworths shelf prices.",
    date: "April 1, 2026",
    lastReviewed: "September 2026",
    contentUpdated: "2026-09-29",
    image: "/assets/kiwi_yoghurt_fruit_box.webp",
    category: "Recipes",
    staticPrices: true,
    author: "Yong Jae Lee",
    body: `
## Why Snacks Matter as Much as Lunch

In New Zealand schools, children typically eat at two break times: morning tea (around 10:30am) and lunch (around 12:30-1pm). That morning tea snack is not a bonus — it is a critical part of your child's daily nutrition.

Between breakfast at 7:30am and lunch at 12:30pm, there is a five-hour gap. Without a mid-morning snack, children can experience blood sugar dips that affect concentration, mood, and learning — and a wholesome morning snack helps them stay focused through to lunchtime, especially if breakfast was light.

Yet morning tea is often where the least nutritious food ends up. A small packet of chips, a sugary muesli bar, or a fruit roll-up is quick to pack but provides a short sugar spike followed by a crash — exactly the wrong pattern for a learning environment.

It's also where the lunchbox budget quietly leaks. I re-read regular Woolworths shelf prices from their online shop every week, and the snack aisle is where the gap between two products that do the same job is widest — more than three times over, for yoghurt in a pouch rather than a tub. So this guide is in two halves: what to pack, and what it actually costs.

---

## The Ideal School Snack: What to Aim For

A good school snack should tick most of these boxes:

- **Sustaining:** Contains some protein, fibre, or healthy fat to maintain energy
- **Portion-appropriate:** Enough to bridge the gap but not so much it replaces lunch
- **Easy to eat:** Can be eaten quickly and cleanly in 10-15 minutes (morning tea is short)
- **School-safe:** Nut-free, not overly messy, no strong odours
- **Appealing to children:** Because the healthiest snack in the world is useless if it comes home untouched

### The Snack Formula

Pair two of these three elements for a balanced snack:

| Element | Examples |
|---|---|
| Protein | Cheese, yoghurt, hard-boiled egg, hummus, edamame |
| Fibre/Complex carbs | Whole fruit, vegetable sticks, wholegrain crackers, oats |
| Healthy fat | Avocado, seed butter, cheese, coconut yoghurt |

**Example combinations:**
- Cheese + wholegrain crackers (protein + fibre)
- Apple slices + sunflower seed butter (fibre + healthy fat)
- Carrot sticks + hummus (fibre + protein)
- Plain yoghurt + berries (protein + fibre)

---

## 20 Healthy Snack Ideas for NZ School Kids

### Fresh Fruit (The Easiest Win)

1. **Whole apple or pear** — wash and send whole; kids prefer eating fruit they can hold
2. **Banana** — nature's perfect portable snack; cheap year-round
3. **Mandarin** — Easy Peel varieties are ideal for young children
4. **Grapes** — seedless, washed, in a small container
5. **Kiwifruit** — cut in half and pack a small spoon, or slice and pack in a container

### Vegetable-Based Snacks

6. **Carrot sticks with hummus** — the classic; buy carrots whole and cut yourself to save money
7. **Cucumber rounds** — cool and refreshing; kids eat these readily
8. **Cherry tomatoes** — sweet, bite-sized, no prep
9. **Capsicum strips** — red and yellow are sweeter; many kids prefer these raw
10. **Edamame (shelled)** — frozen edamame from Woolworths, thaw overnight; excellent protein source

### Protein-Rich Snacks

11. **Hard-boiled egg** — peel in the morning; pack with a pinch of salt
12. **Cheese cubes or slices** — Mainland Edam or Colby cubes are easy to portion
13. **Plain yoghurt with berries** — use a small screw-top container rather than a pouch; on our tracked prices every pouch costs more than twice every tub (see the cost breakdown below)
14. **Cream cheese on wholegrain crackers** — spread a thin layer; affordable and filling

### Homemade Baking (See Recipes Below)

15. **Banana oat muffins** — freezer-friendly, nut-free, low sugar
16. **Cheese and herb scones** — savoury, filling, and cheap to make
17. **Oat and coconut energy bites** — no-bake, uses rolled oats, coconut, and honey
18. **Vegetable fritters** — grated courgette or corn; great cold
19. **Homemade popcorn** — air-popped with a tiny bit of butter and salt; incredibly cheap

### Store-Bought (When You're Short on Time)

20. **Rice crackers** — plain or lightly flavoured; Sakata brand is widely available and affordable

---

## Homemade Snack Recipes

### Banana Oat Muffins (Nut-Free)

Makes 12. **${batchCost("muffins")} the batch — ${eachCost("muffins")} a muffin** at this week's tracked prices.

**Ingredients:**
- 240g ripe bananas (about 2), mashed
- 80g melted butter (1/3 cup — or coconut oil for dairy-free)
- 90g honey or maple syrup (1/4 cup)
- 1 egg
- 5ml vanilla essence (1 tsp)
- 135g rolled oats (1.5 cups)
- 125g plain flour (1 cup)
- 5g baking powder (1 tsp)
- 3g baking soda (1/2 tsp)
- 1.5g cinnamon (1/2 tsp)
- Pinch of salt

**Method:**
- Preheat oven to 180°C. Line a 12-cup muffin tin.
- Mix wet ingredients (banana, butter, honey, egg, vanilla).
- Combine dry ingredients in a separate bowl.
- Fold wet into dry until just combined. Do not over-mix.
- Divide into muffin cups. Bake 18-20 minutes until golden and a skewer comes out clean.
- Cool completely. Freeze extras in zip-lock bags.

**Storage:** 3 days at room temperature, 3 months frozen. Take one from the freezer in the morning; it will be thawed by morning tea.

---

### Cheese and Herb Scones (Nut-Free)

Makes 10. **${batchCost("scones")} the batch — ${eachCost("scones")} a scone.**

**Ingredients:**
- 250g self-raising flour (2 cups)
- 30g cold butter, cubed
- 100g grated cheese (1 cup, Edam or Tasty)
- 2 tbsp chopped chives or parsley (optional)
- 190ml milk (3/4 cup)
- Pinch of salt

**Method:**
- Preheat oven to 200°C. Line a baking tray.
- Rub butter into flour until it resembles breadcrumbs.
- Stir in cheese, herbs, and salt.
- Add milk gradually, mixing with a knife until dough just comes together.
- Turn out, pat to 2cm thick, cut into rounds.
- Bake 12-15 minutes until golden.

**Storage:** 2 days at room temperature in an airtight container, or freeze for up to 2 months.

---

### No-Bake Oat and Coconut Energy Bites (Nut-Free)

Makes 20. **${batchCost("bites")} the batch — ${eachCost("bites")} a bite.**

**Ingredients:**
- 135g rolled oats (1.5 cups)
- 37g desiccated coconut (1/2 cup)
- 120g honey (1/3 cup)
- 30g tahini (2 tbsp)
- 28g coconut oil, melted (2 tbsp)
- 5ml vanilla essence (1 tsp)
- Mini chocolate chips (optional, not costed)

A note on the seed butter: this recipe used to say *sunflower seed butter (or tahini)*. Woolworths does not stock a plain sunflower seed butter, so tahini is what the costing uses. Tahini is nut-free, which is the point here, but sesame is itself a declarable allergen — check your school's policy before it goes in the bag.

**Method:**
- Combine all ingredients in a bowl. Mix well.
- Refrigerate for 30 minutes until firm enough to handle.
- Roll into small balls (about 2cm diameter).
- Store in the fridge in an airtight container.

**Storage:** 1 week in the fridge, 2 months frozen.

---

### Vegetable Fritters (Nut-Free, Freezer-Friendly)

Makes 12. **${batchCost("fritters")} the batch — ${eachCost("fritters")} a fritter.**

**Ingredients:**
- 250g grated courgette (2 cups — squeeze out excess moisture)
- 200g corn kernels, drained (about half a 420g can)
- 2 eggs
- 60g plain flour (1/2 cup)
- 50g grated cheese (1/2 cup)
- Salt and pepper to taste

This is the one recipe here with a real season attached. Courgette is a summer vegetable, and the winter price is what makes this batch the dearest on the list — in season it drops sharply. The [NZ Seasonal Produce Calendar](/en/guides/nz-seasonal-produce-calendar) has the months.

**Method:**
- Squeeze grated courgette in a clean tea towel to remove moisture.
- Mix all ingredients in a bowl.
- Heat a tablespoon of oil in a pan over medium heat.
- Drop spoonfuls of mixture into the pan. Flatten slightly.
- Cook 3 minutes each side until golden.
- Cool on a wire rack.

**Storage:** 3 days in the fridge, 2 months frozen. Pack cold in the lunchbox.

---

## What a Morning Tea Snack Actually Costs

Most snack advice stops at "buy in bulk". That's true but useless without numbers, so here are ours.

The figures below are **regular Woolworths shelf prices — not specials** — recorded from their online shop between April and July 2026. (The [NZ Lunchbox Price Index](/en/price-index) is the separate multi-chain comparison; these are not its numbers.) I've divided each pack by its serve count to get a cost per morning tea. Treat them as a dated snapshot rather than a fixed price list: they move, and they vary by store and region. The gaps between formats are wide enough that a few cents either way doesn't change the conclusion.

| Snack | Pack price (regular) | Serves | **Cost per morning tea** |
|---|---|---|---|
| Mother Earth Fruit Sticks 152g | $2.99 (8 pack) | 8 | **37c** |
| Banana (from a snack pack) | $3.70 (6 pack) | 6 | **62c** |
| Fresh'n Fruity yoghurt tubs | $4.49 (6 pack) | 6 | **75c** |
| Anchor Uno / Calci Yum tubs | $9.89 (12 pack) | 12 | **82c** |
| Mother Earth Baked Oaty Slice | $4.89 (6 pack) | 6 | **82c** |
| Dairyworks cheese & rice crackers | $5.50 (4 pack) | 4 | **$1.38** |
| Moogurt yoghurt **pouch** 70g | $1.99 each | 1 | **$1.99** |
| Chobani no-added-sugar **pouch** 100g | $2.40 each | 1 | **$2.40** |

The same per-serve arithmetic applied to the main part of the lunchbox is in [Budget-Friendly Lunchbox Ideas Under $3 Per Meal](/en/blog/budget-friendly-lunchbox-ideas-nz).

### The pouch tax is real, and it's bigger than you'd guess

This is the widest gap in the snack aisle. On the prices above, a yoghurt pouch costs **2.4 to 3.2 times** a yoghurt tub:

- Moogurt pouch at $1.99 vs Anchor Uno tub at 82c — **2.4×**
- Chobani pouch at $2.40 vs Fresh'n Fruity tub at 75c — **3.2×**

Over a 40-week school year, one pouch a day instead of one tub costs roughly **$230 more per child**, even on the smaller of those two gaps. Those pairs are different brands, so not every cent of it is the spout — but no pouch on the list comes within twice the price of any tub.

If your child genuinely eats better from a pouch, that may be worth it to you. But it should be a decision, not a default. A reusable squeeze pouch filled from a 1kg tub (Fresh'n Fruity 1kg was $4.99 regular) works out at about 50c for a 100g serve, or roughly 35c if you fill it to the 70g a shop pouch holds — either way, a long way under $1.99.

### Where the cheap options actually are

Two things surprised me when I laid the tracked data out:

**Fresh fruit is not the expensive option.** A banana from a snack pack is 62c and a whole apple sits around 60-70c at $3.49/kg — both cheaper per serve than every packaged snack on the list except the fruit sticks. The "fruit is dear" instinct comes from buying it by the kilo and watching some go off, not from the per-serve cost.

**The cheapest packaged nut-free option is a fruit stick, not a muesli bar.** At 37c, Mother Earth Fruit Sticks came in under half the price of the oaty slice I tracked. Cheap is not the same as good, though: a fruit stick is a processed fruit snack, the same family as the fruit roll-ups in the "Avoid or Limit" table below, so it is a price finding, not a recommendation. Compare its label per 100g against the alternatives before it becomes the everyday pick — and check for nuts each time, because formulations change.

---

## Store-Bought Snacks: An Honest Guide

Sometimes you need to grab something off the shelf. Here is an honest assessment of popular NZ store-bought snacks:

These tables used to carry a price for every row. I have taken the prices out, for two reasons that are worth saying out loud. They were undated approximations that had quietly gone stale, and two of them had drifted into contradicting the dated table above — one row said "yoghurt tubs (6 pack)" beside a 12-pack price, and the flavoured-pouch row implied 81c a pouch in an article whose measured figure is $1.99 to $2.40. The prices that are actually tracked are in the table above; what belongs here is the reason.

### Worth Buying

| Snack | Why It's OK |
|---|---|
| Sakata rice crackers | Low sugar, nut-free, crispy, kids love them |
| Bluebird Ready Salted chips (small) | Occasional treat; low sugar, nut-free |
| Mainland cheese slices | Good protein, easy to pack |
| Anchor yoghurt tubs | Plain or low-sugar options; good protein, and far cheaper per serve than the pouch |
| Woolworths popcorn (microwave) | Wholegrain, cheap, filling |

### Avoid or Limit

| Snack | Why to Avoid |
|---|---|
| Muesli bars (most brands) | Often high in sugar for their size; many contain nuts |
| Fruit roll-ups | Mostly sugar; little fibre |
| Flavoured yoghurt pouches | Added sugar, and the dearest format in the aisle |
| Juice boxes | Free sugars with no fibre |
| LCMs / Rice Bubble bars | High sugar, minimal nutrition |

### Reading the Label: Quick Sugar Check

For any packaged snack, compare the **per-100g** column of two products doing the same job, as our [nutrition guide](/en/guides/complete-nutrition-guide-school-lunches-nz) explains. Serve sizes are set by the manufacturer, so a per-serve cut-off mostly rewards a small serve. We have deliberately not printed a pass/fail sugar threshold.

---

## Age-Appropriate Snack Portions

| Age Group | Snack Size | Examples |
|---|---|---|
| 5-6 years | Very small | 1/2 apple + 2 crackers, or 1 small muffin |
| 7-9 years | Small | 1 apple + small yoghurt, or 4-5 crackers + cheese |
| 10-12 years | Medium | 1 large fruit + crackers + hummus, or 2 muffins |
| 13+ years | Larger | May need two snack items plus a substantial lunch |

**Tip:** If your child is in year 1-2 (ages 5-6), morning tea is often short (10-15 minutes). Pack foods they can eat quickly — whole fruit, crackers, cheese cubes — rather than items that require opening, dipping, or assembling.

---

## What Homemade Actually Costs

These are the four recipes above, costed from the grams each one lists and the pack prices I re-read at Woolworths every week. Nothing here is an estimate: change the recipe and the number changes with it.

| Recipe | Makes | Batch | Per item |
|---|---|---|---|
${recipeCostTable()}

Two things worth saying about that table, because both cut against what this section used to claim.

**The old numbers were wrong, and wrong in the flattering direction.** Until August 2026 each recipe carried a line like *"Cost: approximately $0.15 per muffin"*, and this section was a table of annual savings built on those figures. They were estimates dressed as measurements, and when the ingredients were finally costed against tracked pack prices the muffin came out at ${eachCost("muffins")} — several times the published figure. The savings table on top of them went with it.

**Homemade is not automatically the cheap option.** Look at the packaged table further up: the cheapest tracked morning-tea item is a fruit stick at 37c, which undercuts a homemade muffin. Baking wins clearly against the *dear* end of the aisle — an energy bite at ${eachCost("bites")} against a Baked Oaty Slice at 82c, or a yoghurt pouch at $1.99 — and it wins on what goes into the food. It does not win against every packet on the shelf, and a guide that told you otherwise was selling you something.

A caveat on comparing the two tables: the recipe costs above are this week's, while the packaged snapshot is April to July. Treat the comparison as indicative rather than to the cent.

## Weekly Snack Prep Plan

Spend 45 minutes on a Sunday and have snacks sorted for the entire week:

- **Batch bake:** 12 muffins or 20 energy bites (freeze extras)
- **Prep veg sticks:** Cut carrots, cucumber, and capsicum. Store in water in the fridge (stays crisp all week).
- **Make hummus:** One can of chickpeas makes enough for the whole week
- **Portion cheese:** Cut a block into cubes or slices and store in a container
- **Wash fruit:** Wash grapes, berries, and cherry tomatoes so they are ready to grab

---

## Plan Snacks Alongside Lunches

The planner puts two snacks alongside each day's main — one fruit or vegetable, and one from the protein, dairy and savoury lists — filtered by the same allergy and diet settings as the mains. It has no budget setting; it shows what the week costs rather than holding it under a figure.

[Try the Kiwi Lunchbox Planner →](/en/planner)
`,
  },

  "kindy-lunchbox-choking-guide-nz": {
    title: "Kindy Lunchboxes in NZ: The Choking Guidance in Plain English",
    seoTitle: "Kindy Lunchboxes NZ: Choking Guidance in Plain English",
    excerpt:
      "What the Ministry of Health's choking guidance for early learning services says to leave out of a kindy lunchbox, and how to cut up the rest.",
    date: "October 12, 2026",
    lastReviewed: "October 2026",
    contentUpdated: "2026-10-21",
    image: "/assets/lentil_soup.jpg",
    category: "Food Safety",
    author: "Yong Jae Lee",
    body: `
## Why Under-5s Need Different Food

Babies and young children choke on food more easily than older children. The Ministry of Health gives two reasons: their air and food passages are small, and they are still learning to move food around their mouths and to bite, chew and grind it. It takes years to master those skills, and many children don't truly master chewing until about four years of age.

In December 2020 the Ministry published *${CHOKING_SOURCE.title}*. It adapts the Ministry's choking advice for parents to licensed early learning services — early childhood education services, ngā kōhanga reo and certificated playgroups. Staff there can't watch each child as closely as a parent at home, so the guidance is more prescriptive: it names foods to leave out altogether, and says how to change the size, shape or texture of others.

This page puts the food part of that guidance in plain English and shows where it touches the menus and snacks in our planner. It is a summary, not a replacement — the [original PDF](${CHOKING_SOURCE.url}) is short and worth reading in full.

---

## Foods to Leave Out

The guidance says to exclude these foods. They have the highest risk of choking, and are either not practical to alter, have little or no nutritional value, or both. The right-hand column is where each one turns up in our data — these are what the planner's Kindy option removes.

| The guidance says to exclude | Where it appears in our menus and snacks |
|---|---|
${kindyExcludeTable()}

### One extra that is our call, not the guidance's

The guidance does not mention roasted chickpeas. We leave the Roasted Chickpeas snack out of kindy plans anyway: they are small and hard, like nuts, and there is no practical way to cut them down. That is our own judgement, not something the Ministry of Health says. ${kindyOursSentence()}

---

## Foods to Change Before Serving

For foods it calls high-risk to alter, the guidance gives an option for children of all ages and, for some foods, an extra option for tamariki aged 4–6. These are the ones that appear in our menus and snacks, with the same wording the planner shows on each day:

| Type of food (the guidance's heading) | In our menus and snacks | All ages | Aged 4–6, you can also |
|---|---|---|---|
${kindyAlterTable()}

A few measures from the guidance help here:

- **8mm × 8mm** is about half the width of a standard dinner fork.
- **Strips of about 4–6cm** are long enough to be picked up with one hand.
- **"Soft"** means the food can be squashed easily between your thumb and forefinger, or on the roof of your mouth with your tongue.
- Tinned fruit in natural juice, drained, is acceptable.

${kindyUnusedAlterSentence()}

### What we don't flag

We only put a note on foods the guidance names. Cucumber, capsicum, cheese and boiled egg get no note from us — not because they are risk-free, but because the guidance doesn't list them and we won't claim a risk it doesn't state. Supervision still matters for every food.

The ages are based on the expected range of development. If a child has a developmental delay, suspected or diagnosed, the guidance asks services to talk through the child's food with their parents or caregivers.

---

## Eating Safely: The Rest of the Guidance

Food is one of three areas in the guidance. The other two are where and how children eat, and first aid:

- Supervise children while they eat, with enough adults at mealtimes.
- Have a set time when children sit down to eat, rather than grazing.
- Keep distractions down, and ask children not to talk with their mouths full.
- Children should sit up straight — no walking, running or playing while eating.
- Put food directly in front of the child, so they don't twist to the side.
- Teachers and kaiako need to know choking first aid and CPR.

The guidance is written for services, but none of that is hard to copy at home.

---

## Using the Planner's Kindy Option

Tick **Kindy (under 5)** under Allergies / Restrictions before you generate a plan. With it on:

- **Excluded foods are left out.** That takes ${kindyFacts().menusOut.length} of our ${kindyFacts().menuTotal} mains (${joinList(kindyFacts().menusOut)}) and ${kindyFacts().snacksOut.length} of the ${kindyFacts().snackTotal} snacks the planner packs (${joinList(kindyFacts().snacksOut)}) out of the running. The planner never packs treats, so ${joinList(kindyFacts().treatsOut.map((n) => n.toLowerCase()))} don't come up either way.
- **Each day lists prep notes** for anything in the "change before serving" table, and the recipe window adds the 4–6 option.
- **It combines with the other filters**, so a kindy plan can also be nut-free, vegetarian and so on.
- **Portions get smaller.** Ticking Kindy also sets the planner's Portion size to Under 5 / Kindy (ages 3–4): about ${bandFactorLabel("kindy")} of the standard serve, which is sized for primary school children aged 5–12. The ratio is an estimate from average daily energy needs by age in the [Nutrient Reference Values for Australia and New Zealand](${PORTION_BAND_SOURCE.url}), not a prescription, and single items like one egg don't scale neatly. You can change the setting.

The [snack checker](/en/snack-checker) shows the same Kindy line for every snack the planner packs. If your kindy has its own food rules, those come first.

[Try the Kiwi Lunchbox Planner →](/en/planner)

---

## Source and Licence

This page adapts and summarises *${CHOKING_SOURCE.title}* (${CHOKING_SOURCE.publisher}, ${CHOKING_SOURCE.published}), used under the [Creative Commons Attribution 4.0 International licence](${CHOKING_SOURCE.licenceUrl}). We have reworded it, reorganised it around the menus and snacks in our planner, and added one judgement of our own (roasted chickpeas), which is marked as ours above. The Ministry of Health has not reviewed or endorsed this page or the planner.

- [${CHOKING_SOURCE.publisher}: ${CHOKING_SOURCE.title} (PDF)](${CHOKING_SOURCE.url})
`,
  },
  "vegetarian-vegan-school-lunch-guide-nz": {
    title: "Vegetarian & Vegan School Lunches: A Complete NZ Guide",
    excerpt:
      "Vegetarian and vegan NZ school lunches — protein, iron and B12, plus what our price tracking shows: a meat-free main costs about half a meat one.",
    date: "April 14, 2026",
    lastReviewed: "October 2026",
    contentUpdated: "2026-10-04",
    image: "/assets/kiwi_veggie_wrap.webp",
    category: "Nutrition",
    staticPrices: true,
    author: "Yong Jae Lee",
    body: `
## The Rise of Plant-Based Eating in NZ Schools

Vegetarian and vegan eating is increasingly common in New Zealand. New Zealand Health Survey data suggests only a small share of adults (roughly 3%) are fully vegetarian or vegan, but many more are choosing to eat less meat — and meat-free days are increasingly normal in school lunchboxes.

Whether your family is fully plant-based, your child has chosen to be vegetarian, or you're just after more meat-free days, this guide covers the nutrition, the ingredients, and — the part that usually gets skipped — what it costs.

---

## Meat-Free Lunches Are Cheaper, and the Gap Is Bigger Than You'd Think

I cost every menu in our database against tracked supermarket prices for the [NZ Lunchbox Price Index](/en/price-index). When I split those ${MENU_COUNT} menus by whether they contain meat, the difference was larger than I expected:

| | Menus | Median cost of the main |
|---|---|---|
| Vegetarian | ${menuRowCount((m) => m.is_vegetarian === true)} | **${money(vegMedian())}** |
| Contains meat or fish | ${menuRowCount((m) => m.is_vegetarian !== true)} | **${money(meatMedian())}** |
| Vegan | ${menuRowCount((m) => m.is_vegan === true)} | ${money(veganMedian())} |

**A meat-free main costs about ${vegPctLess()}% less.** On the median, swapping one meat lunch for a vegetarian one saves ${money(vegSaving())} — around **${approxMoney(vegTermSaving())} a term** for one child (ten weeks, five days a week), or about ${approxMoney(vegYearSaving())} across a ${SCHOOL_YEAR_DAYS}-day school year if you do it every day.

That tracks with what we found costing the food groups: protein is the single biggest line in almost every lunchbox, and animal protein is where the money goes. Chicken breast runs about ${serveLabel(servePrice("Chicken Breast"))} a serve; tinned chickpeas are ${serveLabel(servePrice("Chickpeas"))} and an egg is ${serveLabel(servePrice("Eggs"))}.

Two honest caveats. **Vegan is not the cheapest option** — it sits at ${money(veganMedian())}, ${Math.round(veganMedian() * 100) > Math.round(vegMedian() * 100) ? "above vegetarian" : "level with vegetarian rather than below it"}, because it loses cheese (${serveLabel(servePrice("Cheese"))}) and eggs (${serveLabel(servePrice("Eggs"))}), which come in under tofu (${serveLabel(servePrice("Tofu"))}) and most commercial substitutes, and often replaces them with pricier specialty products. And **cheap isn't automatically balanced**: a jam sandwich is a very cheap vegetarian lunch and a poor one. The nutrition section below is what makes the saving worth having.

If the budget is the reason you're reading this, the practical version is: **you don't have to go fully vegetarian to get most of the benefit.** Two meat-free days a week captures a good share of the saving with none of the B12 planning.

---

## Nutritional Considerations for Plant-Based Kids

Plant-based diets can be perfectly healthy for school-age children, but they do require more thought about certain nutrients that are naturally abundant in animal products. A vegan diet needs the most planning — B12 above all — so it is worth involving your GP or a dietitian.

### Key Nutrients to Watch

| Nutrient | Why It Matters | Best Plant Sources for Lunchboxes |
|---|---|---|
| Protein | Growth, muscle repair, satiety | Legumes, tofu, tempeh, seeds, cheese (vegetarian), nut butters (if school allows) |
| Iron | Oxygen transport, energy, concentration | Legumes, tofu, fortified cereals, dark leafy greens, dried apricots |
| Vitamin B12 | Nerve function, red blood cells | Fortified plant milk, fortified nutritional yeast, fortified cereals (vegan) / eggs, dairy (vegetarian) |
| Calcium | Bone growth | Fortified plant milk, tofu (calcium-set), tahini, broccoli, kale / dairy (vegetarian) |
| Zinc | Immune function, growth | Legumes, seeds (pumpkin, sunflower), wholegrains, tofu |
| Omega-3 (DHA/EPA) | Brain development | Chia seeds, flaxseeds, walnuts (if allowed), algae-based supplements |
| Iodine | Thyroid function | Iodised salt, seaweed (nori in sushi), some plant milks |

### The Protein Question

The most common concern parents have is: "Will my child get enough protein without meat?" The answer is almost certainly yes, as long as you include protein-rich foods in every meal.

**Daily protein needs for NZ children** (the Ministry of Health's recommended dietary intakes — the same figures, with their source, as in our [nutrition guide](/en/guides/complete-nutrition-guide-school-lunches-nz)):

| Age | Daily protein | About a third (the lunchbox share) |
|---|---|---|
| 4–8 years | 20g | about 7g |
| 9–13 years | 35g girls, 40g boys | about 12–13g |

Eggs, cheese, yoghurt, legumes, tofu and soy milk are the foods that carry that share in a meat-free box. How many grams a particular one brings is on its nutrition panel — this site does not measure protein content, so it does not print a per-food protein table or per-day protein totals of its own.

---

## Iron: The Nutrient to Pay Closest Attention To

Iron deficiency is the most common nutritional concern for vegetarian and vegan children worldwide, and NZ is no exception. Plant-based (non-heme) iron is less readily absorbed than animal-based (heme) iron, but absorption can be significantly improved with vitamin C.

### Maximising Iron Absorption

**Do:**
- Pair iron-rich foods with vitamin C sources — e.g., hummus (chickpeas = iron) with capsicum strips (vitamin C)
- Include citrus fruit, kiwifruit, strawberries, or tomatoes in the same meal
- Use cast-iron cookware when preparing food at home

**Avoid at mealtimes:**
- Tea (tannins block iron absorption — unlikely for kids, but worth noting)
- Large amounts of dairy alongside iron-rich foods (calcium competes with iron)

[Iron-Rich Foods for NZ Kids](/en/blog/iron-rich-lunchbox-foods-nz) has practical iron-rich foods and lunchbox ideas, plant-based included.

### Iron-Rich Lunchbox Ideas

- Falafel wrap with hummus, tomato, and spinach
- Lentil soup in a thermos with a mandarin for dessert
- Tofu stir-fry with rice and edamame
- Baked beans on wholemeal toast (prep at home, send in a thermos)

---

## Vitamin B12: Critical for Vegan Kids

Vitamin B12 is found almost exclusively in animal products. Vegetarian children who eat eggs and dairy typically get enough, but vegan children need fortified foods or a supplement.

### Reliable B12 Sources

| Source | Notes |
|---|---|
| Fortified soy or other plant milk | Check the label — not all brands are fortified |
| Nutritional yeast | Only if the label says it is fortified with B12; unfortified nutritional yeast is not a B12 source |
| Fortified breakfast cereals | Check the label — many cereals are not fortified with B12 |
| Eggs and dairy | Vegetarian option |
| B12 supplement | The most reliable source for a vegan child — ask your GP or dietitian about the dose |

The amounts in fortified foods vary by product, so read the nutrition panel rather than a figure from an article. **Recommendation:** If your child is fully vegan, discuss B12 supplementation with your GP.

---

## Affordable Plant-Based Shopping in NZ

One of the biggest myths about vegetarian and vegan eating is that it is expensive. In reality, plant-based staples are among the cheapest foods in the supermarket.

### What a lunchbox serve of each protein costs

These are pack prices tracked weekly, divided by the amount one lunchbox uses. Both numbers are
shown so you can check the division yourself.

| Protein | Pack | Pack price | One serve | Cost per serve |
|---|---|---|---|---|
${proteinCostTable()}

Legumes and peanut butter come out cheapest per serve. That ordering is what the tracked prices
say, and it is why a meat-free main tends to cost less — but *tends* is the honest word, because
the order is not the same for every swap. A tofu serve costs more than a canned tuna serve.

⚠️ This is cost per **serve**, not per 100g of protein. Protein content per food is not something
this site measures, so a figure normalised that way would be someone else's number repeated
without a source — which is also why the menus below carry no protein totals.

### Budget Plant-Based Staples

Pantry staples worth keeping stocked. This list used to carry a rough price for each, and some had drifted away from what we track (the rice line was well under the price index's 1kg bag), so the prices have come out — the tracked ones are in the table above and on the [price index](/en/price-index):

- Dried lentils (red and brown)
- Canned chickpeas and kidney beans
- Firm tofu
- Rolled oats
- Wholemeal bread
- Rice
- Frozen edamame
- Soy milk
- Sunflower seeds
- Tahini

---

## A Complete Vegetarian Week

### Monday: Egg and Salad Wrap
- Wholemeal wrap + sliced hard-boiled egg + lettuce, tomato, grated carrot + mayo
- Mandarin
- Cheese cubes

Wraps and pita pockets carry most of the meat-free week — [Easy Wraps & Rolls for NZ School Lunches](/en/blog/easy-wraps-for-school-lunches-nz) has more filling combinations.

### Tuesday: Hummus and Veg Pita Pocket
- Wholemeal pita + hummus + cucumber, capsicum, baby spinach
- Apple
- Plain yoghurt with honey

### Wednesday: Cheese and Tomato Pasta Salad
- Spiral pasta + cherry tomatoes + feta + olive oil dressing + basil
- Kiwifruit
- Crackers

### Thursday: Tofu Sushi Rolls
- Sushi rice + nori + marinated tofu strips + cucumber + avocado
- Grapes
- Edamame (shelled)

### Friday: Lentil Soup (Thermos) + Bread Roll
- Red lentil soup (batch-cooked, frozen in portions) in a thermos
- Wholemeal bread roll with butter
- Banana

---

## A Complete Vegan Week

### Monday: Falafel Wrap
- Wholemeal wrap + store-bought falafel (Woolworths sells oven-ready falafel) + hummus + tomato + spinach
- Orange segments
- Rice crackers

### Tuesday: Peanut-Free Pad Thai
- Rice noodles + tofu + carrot + capsicum + tamari + sesame seeds
- Mandarin
- Coconut yoghurt

### Wednesday: Black Bean and Corn Wrap
- Corn tortilla + mashed black beans + corn + avocado + salsa
- Apple
- Popcorn

### Thursday: Vegan Sushi Rolls
- Sushi rice + nori + avocado + cucumber + marinated tofu
- Kiwifruit
- Edamame

### Friday: Vegetable and Lentil Soup (Thermos)
- Red lentil and kumara soup
- Sourdough bread (check for dairy)
- Banana
- Homemade energy bites (oat + coconut + maple syrup)

---

## Common Challenges and Solutions

### "My Child's Friends Eat Meat — They Feel Left Out"

This is real and valid. Some approaches:

- Make plant-based versions of popular foods (veggie sausage rolls, bean burritos, tofu nuggets) so they feel like they are eating "normal" food
- Focus on foods that are naturally plant-based rather than meat substitutes — sushi, pasta, falafel
- Talk to your child about why your family eats this way, in age-appropriate terms

### "The School Serves Meat on Ka Ora, Ka Ako Days"

If your school participates in the government lunch programme, contact the school to ask about vegetarian/vegan options. Many providers offer alternatives, but you may need to request them explicitly.

### "Finding Vegan Food at NZ Supermarkets Is Hard"

It has improved dramatically. Both Woolworths and Pak'nSave now stock:

- Multiple tofu brands (Bean Supreme, Tonzu)
- Plant milks (soy, oat, almond, coconut)
- Vegan cheese (Zenzo, Angel Food)
- Vegan yoghurt (Raglan Coconut Yoghurt, Cocolo)
- Meat alternatives (Beyond Meat at Woolworths, Sunfed Chicken at selected stores)
- Frozen vegan items (Linda McCartney range at Woolworths)

### "I Worry About My Child's Nutrition"

Talk to your GP about whether a check-up makes sense for your child. A blood test can check iron, B12, vitamin D, and zinc levels.

---

## Resources

- [NZ Ministry of Health: Food and Nutrition Guidelines for Children and Young People (2–18 years)](https://www.health.govt.nz/publications/food-and-nutrition-guidelines-for-healthy-children-and-young-people-aged-2-18-years-a-background)
- [Nutrition Foundation NZ](https://nutritionfoundation.org.nz)
- [NZ Vegetarian Society](https://www.vegetarian.org.nz)
- [Allergy NZ](https://www.allergy.org.nz) — for managing allergies alongside plant-based diets

---

## Plan Plant-Based Lunches Easily

The planner includes vegetarian and vegan filters. Select one, and every main and snack in your generated plan will be meat-free (or, with Vegan, free of animal products), with estimated costs from Woolworths shelf prices.

[Try the Kiwi Lunchbox Planner →](/en/planner)
`,
  },
};

/**
 * 읽기 시간은 본문에서 만든다 — 항목에 적힌 값이 있어도 덮어쓴다(`lib/readTime.ts` 참조).
 */
export const GUIDES = withReadTime(RAW_GUIDES);

export const GUIDE_SLUGS = Object.keys(GUIDES);

export const GUIDE_CARDS = Object.entries(GUIDES).map(([slug, guide]) => ({
  slug,
  title: guide.title,
  excerpt: guide.excerpt,
  date: guide.date,
  readTime: guide.readTime,
  image: guide.image,
  category: guide.category,
}));
