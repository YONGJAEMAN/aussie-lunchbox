import type { AllergyType, MenuItem, SnackItem } from "./types";

/**
 * 질식 위험 표 — 플래너의 「Kindy (under 5)」 선택지, 간식 확인 페이지의 질식 칸,
 * 킨디 가이드 글이 **모두 이 표 하나**에서 읽는다(2026-10-12).
 *
 * 근거: Ministry of Health (2020) 「Reducing food-related choking for babies and young
 * children at early learning services」, CC BY 4.0. 가이드가 말하지 않는 음식에는
 * 위험을 주장하지 않는다(오이·파프리카·치즈 큐브·삶은 달걀·프레첼 등은 표에 없다).
 * 가이드 밖의 판단은 `basis: "ours"`로 따로 표시하고, 화면·글이 그렇게 밝힌다.
 *
 * 🔴 이 파일은 플래너 클라이언트 번들에 들어간다 — 데이터 JSON·글 본문을 import하지 말 것.
 *    개수 계산은 데이터를 **인자로** 받는다.
 * 🔴 재료 이름은 `data/menuData.json`과 글자까지 같아야 한다(가드가 본다).
 */

export const KINDY: AllergyType = "Kindy";

export const CHOKING_SOURCE = {
  publisher: "New Zealand Ministry of Health",
  title: "Reducing food-related choking for babies and young children at early learning services",
  published: "December 2020",
  url: "https://health.govt.nz/system/files/2020-12/reducing-food-related-choking-babies-young-children-early-learning-services-apr21.pdf",
  licence: "CC BY 4.0",
  licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
} as const;

/** 가이드 「High-risk food to exclude」의 아홉 줄, 가이드에 적힌 순서 그대로. 문구는 messages `kindy_cat_<id>`. */
export const EXCLUDE_CATEGORIES = [
  "nuts", "large_seeds", "hard_lollies", "chips", "rice_crackers",
  "dried_fruit", "sausages", "popcorn", "marshmallows",
] as const;
export type ExcludeCategory = (typeof EXCLUDE_CATEGORIES)[number];

/** 가이드 「How to alter high-risk food」의 표제 여덟 개. */
export const ALTER_CATEGORIES = [
  "small_hard", "small_round", "fruit_skin", "skin_leaves",
  "compressible", "bones", "fibrous", "thick_paste",
] as const;
export type AlterCategory = (typeof ALTER_CATEGORIES)[number];

/**
 * 손질법. 문구는 messages의 `kindy_prep_<id>`(전 연령)와, `older`면 `kindy_prep_<id>_46`
 * (가이드의 「For tamariki aged 4–6 years you can also」)에 있다.
 * 🔴 `older: false`는 가이드가 그 음식에 4–6세 대안을 주지 않았거나, 표 배치로 어느 줄의
 *    대안인지 확정할 수 없는 경우다(수박·올리브). 대안을 빼면 덜 허용하는 쪽이라 안전하다.
 */
export const PREPS = {
  small_hard: { category: "small_hard", older: true },
  small_round: { category: "small_round", older: true },
  peas: { category: "small_round", older: true },
  large_seeds: { category: "small_round", older: false },
  stone: { category: "small_round", older: false },
  tomato: { category: "fruit_skin", older: false },
  leaves: { category: "skin_leaves", older: false },
  chicken_skin: { category: "skin_leaves", older: false },
  meat: { category: "compressible", older: true },
  bones: { category: "bones", older: false },
  paste: { category: "thick_paste", older: false },
} as const satisfies Record<string, { category: AlterCategory; older: boolean }>;
export type PrepId = keyof typeof PREPS;

export type ExcludeRule =
  | { basis: "guide"; category: ExcludeCategory }
  /** 가이드 목록에 없는 우리 판단. `like`는 가장 가까운 가이드 분류, `reason`은 messages `kindy_ours_<reason>`. */
  | { basis: "ours"; like: ExcludeCategory; reason: string };

const guide = (category: ExcludeCategory): ExcludeRule => ({ basis: "guide", category });

/** 재료 단위로 빼는 것 — 메인이든 간식이든 이 재료가 들어 있으면 킨디 식단에서 빠진다. */
export const EXCLUDE_INGREDIENTS: Record<string, ExcludeRule> = {
  "Corn Chips": guide("chips"),
  "Veggie Straws": guide("chips"),
  "Rice Wheels": guide("chips"),
  "Rice Crackers": guide("rice_crackers"),
  "Dried Apricots": guide("dried_fruit"),
  "Sultanas": guide("dried_fruit"),
  "Real Fruit Strip": guide("dried_fruit"),
  "Dates": guide("dried_fruit"),
  "Popcorn": guide("popcorn"),
  "Cocktail Sausages": guide("sausages"),
  "GF Sausages": guide("sausages"),
  // 🔴 아래 셋은 재료 **이름**이 아니라 우리가 추적하는 **상품**으로 판정했다(2026-10-12 검토).
  //    GF Crackers = Woolworths brown rice & black sesame, Wholegrain Crackers = Woolworths brown rice
  //    multigrain — 둘 다 쌀과자다. Muesli = Woolworths toasted berry — 말린 과일이 든다.
  //    추적 상품이 바뀌면 이 판정도 다시 볼 것.
  "GF Crackers": guide("rice_crackers"),
  "Wholegrain Crackers": guide("rice_crackers"),
  "Muesli": guide("dried_fruit"),
};

/**
 * 간식 **이름** 단위로 빼는 것. 재료로 걸면 안 되는 경우다 —
 * `Chickpeas`는 메뉴(커리·병아리콩 샌드위치)에선 익혀서 무르다. 볶아서 딱딱한 것은 이 간식뿐이다.
 */
export const EXCLUDE_SNACKS: Record<string, ExcludeRule> = {
  "Roasted Chickpeas": { basis: "ours", like: "nuts", reason: "roasted_chickpeas" },
};

/** 남기되 손질 안내를 붙이는 재료. 순서대로 보여 준다. */
export const ALTER_INGREDIENTS: Record<string, PrepId[]> = {
  "Apple": ["small_hard"],
  "Pear": ["small_hard"],
  "Carrot": ["small_hard"],
  "Celery": ["small_hard"],
  "Sugar Snap Peas": ["small_hard"],
  "Grapes": ["small_round"],
  "Cherry Tomatoes": ["small_round"],
  "Blueberries": ["small_round"],
  "Strawberries": ["small_round"],
  "Berries": ["small_round"],
  "Edamame": ["small_round"],
  "Peas": ["peas"],
  "Watermelon": ["large_seeds"],
  "Olives": ["stone"],
  "Tomato": ["tomato"],
  "Lettuce": ["leaves"],
  "Cos Lettuce": ["leaves"],
  "Spinach": ["leaves"],
  "Cabbage": ["leaves"],
  "Rocket": ["leaves"],
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
  "Smoked Salmon": ["bones"],
  "Peanut Butter": ["paste"],
};

/**
 * 메뉴 안에서 익혀서 무른 재료 — 재료 단위 안내가 맞지 않는 곳. 구운 머핀 속 블루베리에
 * 「4등분하라」를 붙이면 안내가 엉터리가 된다. 간식 블루베리에는 그대로 붙는다.
 */
export const COOKED_IN_MENU: Record<string, readonly string[]> = {
  "Blueberry Muffins": ["Blueberries"],
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
