import type { AllergyType, MenuItem, SnackItem } from "./types";

/**
 * 질식 위험 표 — 플래너의 「Kindy (under 5)」 선택지, 간식 확인 페이지의 질식 칸,
 * 킨디 가이드 글이 **모두 이 표 하나**에서 읽는다(Kiwi 2026-10-12 구조, Aussie 2026-10-30 NSW로 교체).
 *
 * 근거: NSW Ministry of Health 「Helping to prevent children from choking」(NSW Menu Planning Guide,
 * 웹페이지 Current as at 24 August 2026). 웹사이트 저작권 페이지가 CC BY 4.0이라고 밝힌다 —
 * 🔴 같은 내용의 **PDF는 「not … for commercial usage」**라 PDF는 옮기지 않는다. 웹페이지를 링크하고 우리 말로 요약한다.
 *
 * 🔴 지침의 목록은 **3세 미만**(`appliesUnder`) 기준이다. 우리는 「Kindy (under 5)」 전체에 적용한다 —
 *    사용자 결정(10-30). 화면·글·FAQ가 그것을 「우리 판단」이라고 밝힌다(가드가 본다).
 * 지침이 말하지 않는 음식에는 위험을 주장하지 않는다(딸기·토마토·잎채소·오이·치즈 큐브·삶은 달걀·프레첼 등은 표에 없다).
 * 지침 밖의 판단은 `basis: "ours"`로 따로 표시하고, 화면·글이 그렇게 밝힌다.
 *
 * 🔴 이 파일은 플래너 클라이언트 번들에 들어간다 — 데이터 JSON·글 본문을 import하지 말 것.
 *    개수 계산은 데이터를 **인자로** 받는다.
 * 🔴 재료 이름은 `data/menuData.json`과 글자까지 같아야 한다(가드가 본다).
 */

export const KINDY: AllergyType = "Kindy";

export const CHOKING_SOURCE = {
  publisher: "NSW Ministry of Health",
  title: "Helping to prevent children from choking",
  partOf: "NSW Menu Planning Guide",
  currentAt: "24 August 2026",
  url: "https://www.health.nsw.gov.au/heal/child/menu/Pages/prevent-choking.aspx",
  licence: "CC BY 4.0",
  licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
  copyrightUrl: "https://www.health.nsw.gov.au/Pages/copyright.aspx",
  attribution: "© State of New South Wales NSW Ministry of Health",
  /** 지침의 「Do not serve to children under 3 years」. */
  appliesUnder: 3,
} as const;

/**
 * 지침 「High-risk foods」의 열 줄, 지침에 적힌 순서 그대로. 문구는 messages `kindy_cat_<id>`.
 * 이 중 형태(날것·통째·껍질·큰 조각)를 말하는 넷은 지침의 손질표에 방법이 있다 → `FORM_LINES`, 손질로 다룬다.
 * 나머지 여섯은 손질법이 없다 → `EXCLUDE_CATEGORIES`, 뺀다(내 해석, 10-30 승인).
 */
export const AVOID_LINES = [
  "raw_hard", "nuts_seeds", "popcorn_corn_chips", "grapes_peas", "sultanas_raisins",
  "hard_biscuits", "skins_bones", "meat_sausage", "lollies", "chewy_sticky",
] as const;
export type AvoidLine = (typeof AVOID_LINES)[number];

export const EXCLUDE_CATEGORIES = [
  "nuts_seeds", "popcorn_corn_chips", "sultanas_raisins", "hard_biscuits", "lollies", "chewy_sticky",
] as const satisfies readonly AvoidLine[];
export type ExcludeCategory = (typeof EXCLUDE_CATEGORIES)[number];

/** 지침 「How to make foods safer」 표의 세 분류. */
export const ALTER_CATEGORIES = ["hard", "skins_strings_bones", "round_slippery"] as const;
export type AlterCategory = (typeof ALTER_CATEGORIES)[number];

/** 손질로 다루는 네 줄 → 그 줄을 받는 손질 분류(글이 「이 줄은 아래 표로」라고 잇는 데 쓴다). */
export const FORM_LINES = {
  raw_hard: "hard",
  grapes_peas: "round_slippery",
  skins_bones: "skins_strings_bones",
  meat_sausage: "skins_strings_bones",
} as const satisfies Record<Exclude<AvoidLine, ExcludeCategory>, AlterCategory>;

/** 손질법. 문구는 messages의 `kindy_prep_<id>`. NSW에는 NZ 지침의 「4–6세 대안」이 없다. */
export const PREPS = {
  hard_veg: { category: "hard" },
  hard_fruit: { category: "hard" },
  dried_fruit: { category: "hard" },
  nut_butter: { category: "hard" },
  mash_peas_corn: { category: "skins_strings_bones" },
  bean_strings: { category: "skins_strings_bones" },
  chicken_skin: { category: "skins_strings_bones" },
  bones: { category: "skins_strings_bones" },
  meat: { category: "skins_strings_bones" },
  sausage: { category: "skins_strings_bones" },
  fruit_seeds_skin: { category: "skins_strings_bones" },
  round_slippery: { category: "round_slippery" },
} as const satisfies Record<string, { category: AlterCategory }>;
export type PrepId = keyof typeof PREPS;

export type ExcludeRule =
  | { basis: "guide"; category: ExcludeCategory }
  /** 지침 목록에 없는 우리 판단. `like`는 가장 가까운 지침 줄, `reason`은 messages `kindy_ours_<reason>`. */
  | { basis: "ours"; like: ExcludeCategory; reason: string };

const guide = (category: ExcludeCategory): ExcludeRule => ({ basis: "guide", category });

/** 재료 단위로 빼는 것 — 메인이든 간식이든 이 재료가 들어 있으면 킨디 식단에서 빠진다. */
export const EXCLUDE_INGREDIENTS: Record<string, ExcludeRule> = {
  "Corn Chips": guide("popcorn_corn_chips"),
  "Popcorn": guide("popcorn_corn_chips"),
  "Rice Crackers": guide("hard_biscuits"),
  "Rice Wheels": guide("hard_biscuits"),
  // 🔴 아래는 재료 **이름**이 아니라 우리가 추적하는 **상품**으로 판정했다(10-30 검토).
  //    Wholegrain Crackers = Woolworths multigrain brown rice crackers, GF Crackers = Arnott's GF Jatz,
  //    Crackers = Captain's Table water crackers — 셋 다 딱딱한 크래커다.
  //    Muesli = Woolworths Toasted Honey & Cinnamon — 라벨에 아몬드·캐슈가 든다.
  //    추적 상품이 바뀌면 이 판정도 다시 볼 것.
  "Wholegrain Crackers": guide("hard_biscuits"),
  "GF Crackers": guide("hard_biscuits"),
  "Crackers": guide("hard_biscuits"),
  "Muesli": guide("nuts_seeds"),
  "Sultanas": guide("sultanas_raisins"),
  "Real Fruit Strip": guide("chewy_sticky"),
};

/**
 * 간식 **이름** 단위로 빼는 것. 재료로 걸면 안 되는 경우다 —
 * `Chickpeas`는 메뉴(커리·병아리콩 샌드위치)에선 익혀서 무르다(손질표 「으깨기」가 붙는다). 볶아서 딱딱한 것은 이 간식뿐이다.
 */
export const EXCLUDE_SNACKS: Record<string, ExcludeRule> = {
  "Roasted Chickpeas": { basis: "ours", like: "nuts_seeds", reason: "roasted_chickpeas" },
  "Veggie Straws": { basis: "ours", like: "popcorn_corn_chips", reason: "veggie_straws" },
};

/** 남기되 손질 안내를 붙이는 재료. 순서대로 보여 준다. */
export const ALTER_INGREDIENTS: Record<string, PrepId[]> = {
  "Apple": ["hard_fruit"],
  "Pear": ["hard_fruit"],
  "Carrot": ["hard_veg"],
  "Celery": ["hard_veg"],
  "Sugar Snap Peas": ["hard_veg", "bean_strings"],
  "Dried Apricots": ["dried_fruit"],
  "Dates": ["dried_fruit"],
  "Peanut Butter": ["nut_butter"],
  "Grapes": ["round_slippery"],
  "Blueberries": ["round_slippery"],
  "Berries": ["round_slippery"],
  "Cherry Tomatoes": ["round_slippery"],
  "Chickpeas": ["round_slippery"],
  "Olives": ["fruit_seeds_skin", "round_slippery"],
  "Peas": ["mash_peas_corn"],
  "Corn": ["mash_peas_corn"],
  "Sweetcorn": ["mash_peas_corn"],
  "Edamame": ["mash_peas_corn"],
  "Watermelon": ["fruit_seeds_skin"],
  "Chicken": ["chicken_skin", "meat"],
  "Chicken Breast": ["chicken_skin", "meat"],
  "Chicken Thigh": ["chicken_skin", "meat"],
  "Cooked Chicken": ["chicken_skin", "meat"],
  "Ham": ["meat"],
  "Beef": ["meat"],
  "Roast Beef": ["meat"],
  "Turkey": ["meat"],
  "Salami": ["meat"],
  "Pork Shoulder": ["meat"],
  "Bacon": ["meat"],
  "Ham/Bacon": ["meat"],
  "Meatballs": ["meat"],
  "Beef Patty": ["meat"],
  "Chicken Skewers": ["meat"],
  "Chicken/Tofu": ["meat"],
  "Tuna/Chicken/Avocado": ["meat"],
  "Cocktail Sausages": ["sausage"],
  "GF Sausages": ["sausage"],
  "Smoked Salmon": ["bones"],
};

/**
 * 메뉴 안에서 익혀서 무른 재료 — 재료 단위 안내가 맞지 않는 곳. 구운 머핀 속 블루베리에
 * 「잘게 자르라」를 붙이면 안내가 엉터리가 된다. 간식 블루베리에는 그대로 붙는다.
 */
export const COOKED_IN_MENU: Record<string, readonly string[]> = {
  "Blueberry Muffins": ["Blueberries"],
  "Date & Oat Slice": ["Dates"],
};

export const kindyOn = (allergies: readonly AllergyType[]) => allergies.includes(KINDY);

/** 이 메인을 킨디 식단에서 빼게 만드는 재료(첫 번째). 없으면 null. */
export function menuExclusion(ingredients: readonly string[]): { ingredient: string; rule: ExcludeRule } | null {
  for (const ingredient of ingredients) {
    const rule = EXCLUDE_INGREDIENTS[ingredient];
    if (rule) return { ingredient, rule };
  }
  return null;
}

/** 이 간식을 킨디 식단에서 빼는 근거. 이름 규칙이 재료 규칙보다 먼저다. 없으면 null. */
export function snackExclusion(snack: Pick<SnackItem, "name" | "ingredients">): { ingredient?: string; rule: ExcludeRule } | null {
  const byName = EXCLUDE_SNACKS[snack.name];
  if (byName) return { rule: byName };
  return menuExclusion(snack.ingredients ?? []);
}

/** 플래너 카드·레시피 창의 손질 안내 한 줄. 문구는 화면이 `prep`으로 messages에서 찾는다. */
export interface KindyPrepNote {
  ingredient: string;
  prep: PrepId;
  snack?: string;
}

export function prepNotes(ingredients: readonly string[]): KindyPrepNote[] {
  return [...new Set(ingredients)].flatMap((ingredient) =>
    (ALTER_INGREDIENTS[ingredient] ?? []).map((prep) => ({ ingredient, prep })),
  );
}

/** 하루치(메인 + 간식) 손질 안내. 킨디가 꺼져 있으면 빈 배열. 생성·교체·공유·저장분 복원이 같이 쓴다. */
export function dayKindyPrep(
  mainIngredients: readonly string[],
  snacks: readonly Pick<SnackItem, "name" | "ingredients">[],
  allergies: readonly AllergyType[],
  menuName?: string,
): KindyPrepNote[] {
  if (!kindyOn(allergies)) return [];
  const cooked = new Set(menuName ? COOKED_IN_MENU[menuName] ?? [] : []);
  return [
    ...prepNotes(mainIngredients.filter((i) => !cooked.has(i))),
    ...snacks.flatMap((sn) => prepNotes(sn.ingredients ?? []).map((n) => ({ ...n, snack: sn.name }))),
  ];
}

/** 간식 확인 페이지의 질식 칸. */
export type ChokingFlag =
  | { kind: "exclude"; rule: ExcludeRule; ingredient?: string }
  | { kind: "alter"; notes: KindyPrepNote[] }
  | { kind: "none" };

export function snackChokingFlag(snack: Pick<SnackItem, "name" | "ingredients">): ChokingFlag {
  const ex = snackExclusion(snack);
  if (ex) return { kind: "exclude", ...ex };
  const notes = prepNotes(snack.ingredients ?? []);
  return notes.length ? { kind: "alter", notes } : { kind: "none" };
}

/** 킨디 식단에서 빠지는 메인·간식 — 글의 개수 문장이 여기서 나온다. 데이터는 인자로 받는다. */
export const kindyExcludedMenus = (menus: readonly Pick<MenuItem, "name" | "ingredients">[]) =>
  menus.filter((m) => menuExclusion(m.ingredients) !== null);
export const kindyExcludedSnacks = <T extends Pick<SnackItem, "name" | "ingredients">>(snacks: readonly T[]) =>
  snacks.filter((s) => snackExclusion(s) !== null);
