import { declares, labelFor, warnsAbout } from "./allergenLabels";
import { kindyOn, menuExclusion, snackExclusion } from "./chokingRisk";
import type { AllergyType, MayContainNote, SnackItem } from "./types";

/**
 * 재료 한 가지가 **어느 식이 조건에 걸리는지**.
 *
 * 🔴 왜 생겼나 (2026-09-10 외부 감사) — 간식에는 식이 플래그가 **아예 없었다.**
 *    `buildWeeklyPlan`이 `randomChoice`로 그냥 뽑았고, 그래서:
 *      · Dairy Allergy 단독 → 간식 Cottage Cheese
 *      · Nut+Dairy+Egg + No-cook → 간식 Cheese Cubes, 장보기 목록에 Cheese Block
 *    메인 94개는 손으로 적은 플래그로 제대로 걸러지는데 간식 41개는 통과였다.
 *    **한 도시락 안에서 절반만 검사하고 있었다.**
 *
 *    라벨을 읽어 보니 사람 눈으로는 못 잡을 것이 있었다:
 *      · Rice Wheels   → 상품 라벨이 **Milk, Soy**를 선언한다
 *                        (`healtheries snack rice wheels chicken` — 이름에 유제품이 없다)
 *      · Bao Buns      → **Milk, Sesame** · Roti → **Milk** · Rice Bubbles → **Gluten**
 *    손으로 적었으면 그냥 통과했을 것들이다.
 *
 *    ⚠️ Veggie Straws는 이 부류가 **아니다.** 잘린 이름만 보고 그렇게 적었는데,
 *       전체 상품명이 `...veggie straws **sour cream** 65g`라 이름이 이미 말하고 있다.
 *       라벨이 필요한 이유는 맞지만 예시로는 틀렸다.
 *
 * ## 근거의 순서
 *
 *   1. **상품 라벨이 있으면 라벨이 근거다** — 193개 중 93개. `allergenLabels.ts`가
 *      "may contain" 경계에서 잘라 낸 **선언분**만 본다. 교차오염 주의 문구로는
 *      거르지 않는다(그건 화면이 "라벨을 확인하세요"로 안내한다).
 *   2. 라벨이 없는 100개만 아래 `NO_LABEL`에 손으로 적는다. 대부분 원물이다.
 *   3. 둘 다 없으면 `null` — **모르는 재료다.** 필터가 켜져 있으면 통과시키지 않는다
 *      (fail-closed). 가드가 「모르는 재료 0개」를 지킨다.
 *
 * 🔴 **메인 메뉴의 플래그는 이 표로 다시 계산하지 않는다.** 94개를 대조해 봤더니
 *    어긋난 14곳 중 12곳이 **메뉴 쪽이 더 엄격**했고, 그게 맞았다 —
 *    `Pasta Salad`의 `Pesto/Mayo`는 가격 캐시엔 페스토가 걸려 있지만 조리법은
 *    마요네즈도 쓰므로 달걀이 맞다. 사람이 적은 것이 라벨 유도보다 정확했다.
 *    이 표는 **간식을 거르는 데** 쓰고, 메뉴에는 「라벨이 선언했는데 free라고
 *    적힌 곳이 있는지」 대조하는 가드로만 쓴다.
 */
export type DietTag = "nuts" | "milk" | "gluten" | "egg" | "sesame" | "meat" | "animal";

/** 알레르기 선택지 → 이 표의 태그. 「채식/비건」은 태그 하나로 안 떨어져 따로 본다. */
export const ALLERGY_TAG: Partial<Record<AllergyType, DietTag>> = {
  "Nut Allergy": "nuts",
  "Dairy Allergy": "milk",
  "Gluten Allergy": "gluten",
  "Egg Allergy": "egg",
  "Sesame Allergy": "sesame",
};

/** 고기·생선. 라벨은 알레르겐만 말하므로 채식 판정은 여기서만 나온다. */
const MEAT = new Set<string>([
  "Bacon",
  "Beef",
  "Beef Mince",
  "Beef Patty",
  "Canned Tuna",
  "Chicken",
  "Chicken Breast",
  "Chicken Skewers",
  "Chicken Thigh",
  "Chicken/Tofu",
  "Cocktail Sausages",
  "Cooked Chicken",
  "GF Sausages",
  "Ham",
  "Ham/Bacon",
  "Meatballs",
  "Mince",
  "Pork Mince",
  "Pork Shoulder",
  "Roast Beef",
  "Salami",
  "Sausage Meat",
  "Smoked Salmon",
  "Tuna",
  "Tuna/Chicken/Avocado",
  "Turkey",]);

/**
 * 가격 캐시에 알레르겐 라벨이 없는 재료 100개. 값은 **선언 알레르겐**이고,
 * 빈 배열은 「넷 다 없음」이다(고기 여부는 위 `MEAT`가 따로 정한다).
 * 참깨는 이 표가 아니라 아래 `SESAME_UNVERIFIED`가 정한다 — 원물은 참깨가 없고, 빵·반죽류는 확인할 수 없다.
 */
const NO_LABEL: Record<string, DietTag[]> = {
  "Apple": [],
  "Avocado": [],
  "Baking Powder": [],  // Edmonds NZ는 글루텐 프리 표시 상품이다. 여기를 fail-closed로 뒀더니 GF Banana Bread가 글루텐 식단에서 빠졌다
  "Baking Soda": [],
  "Banana": [],
  "Basil": [],
  "Beef": [],
  "Beef Mince": [],
  "Berries": [],
  "Black Beans": [],
  "Blueberries": [],
  "Boiled Egg": ["egg"],
  "Boiled Eggs": ["egg"],
  "Breadcrumbs": ["gluten"],
  "Broccoli": [],
  "Butter Chicken Sauce": ["milk"],  // 크림 베이스
  "Cabbage": [],
  "Capsicum": [],
  "Carrot": [],
  "Celery": [],
  "Cherry Tomatoes": [],
  "Chicken": [],
  "Chicken Breast": [],
  "Chicken Thigh": [],
  "Chicken/Tofu": [],
  "Ciabatta": ["gluten"],
  "Cinnamon": [],
  "Coconut Milk": [],
  "Coconut Oil": [],
  "Cooked Chicken": [],
  "Corn": [],
  "Corn Tortilla": [],
  "Cos Lettuce": [],
  "Croissant": ["milk", "gluten"],  // 버터 반죽
  "Cucumber": [],
  "Cumin": [],
  "Egg (glaze)": ["egg"],
  "GF Pasta": [],  // 쌀·옥수수 기반
  "Ginger": [],
  "Golden Syrup": [],
  "Grapes": [],
  "Grated Apple": [],
  "Ham": [],
  "Ham/Bacon": [],
  "Herbs": [],
  "Honey": [],  // 알레르겐은 없지만 동물성이라 비건이 아니다
  "Jam": [],
  "Kiwifruit": [],
  "Lemon": [],
  "Lettuce": [],
  "Mandarin": [],
  "Mince": [],
  "Mixed Vegetables": [],
  "Muffin": ["milk", "egg", "gluten"],  // 머핀 반죽은 우유·달걀·밀가루다
  "Nori": [],
  "Oil": [],
  "Olive Oil": [],
  "Olives": [],
  "Onion": [],
  "Orange": [],
  "Paneer": ["milk"],
  "Pastry Cases": ["milk", "gluten"],  // 쇼트크러스트 — 버터·밀가루
  "Pear": [],
  "Peas": [],
  "Pickle": [],
  "Popcorn": [],
  "Pork Mince": [],
  "Pork Shoulder": [],
  "Potato": [],
  "Probiotic Drink": ["milk"],  // 야쿠르트류 발효유 — 라벨이 없어 우유 있음으로 둔다
  "Quinoa": [],
  "Real Fruit Strip": [],
  "Red Lentils": [],
  "Rice": [],
  "Rice Noodles": [],
  "Rice Paper": [],
  "Ripe Bananas": [],
  "Roast Beef": [],
  "Rocket": [],
  "Rockmelon": [],
  "Roll": ["gluten"],
  "Salami": [],
  "Smoked Salmon": [],
  "Spices": [],
  "Spinach": [],
  "Spring Onion": [],
  "Strawberries": [],
  "Sugar": [],
  "Sugar Snap Peas": [],
  "Sultanas": [],
  "Sushi Rice": [],
  "Sweetcorn": [],
  "Tomato": [],
  "Tomato Paste": [],
  "Tomato Sauce": [],
  "Tuna/Chicken/Avocado": [],
  "Turkey": [],
  "Vegetable Stock": [],  // Edmonds·Woolworths 채수는 글루텐 표시가 없다. 메뉴 쪽 Lentil Soup가 GF로 적혀 있는 것과 맞춘다
  "Vermicelli Noodles": [],
  "Watermelon": [],};

/**
 * 참깨를 **확인할 수 없는** 라벨 없는 재료 — 참깨 필터에서는 걸린 것으로 본다(fail-closed).
 *
 * 🔴 2026-10-22 Bucklands Beach Playcentre: 「참깨 알레르기 아이가 있는데 참깨가 없다」.
 *    위 `NO_LABEL`은 넷(견과·우유·글루텐·달걀)만 손으로 판정해 둔 표라 참깨는 아무도 안 봤다.
 *    라벨이 있는 빵(Bread · Bread Roll · Burger Bun · Bagel …)은 전부 참깨 **주의**를 달고 있고
 *    Bao Buns는 **선언**한다 — 라벨 없는 빵·반죽·향신료를 「없음」이라 적을 근거가 없다.
 */
export const SESAME_UNVERIFIED = new Set<string>([
  "Breadcrumbs", "Ciabatta", "Croissant", "Muffin", "Pastry Cases", "Roll", "Spices",
]);

/** 알레르겐은 없지만 동물성이라 비건이 아닌 것. */
const ANIMAL_NOT_MEAT = new Set<string>(["Honey"]);

const ALLERGEN_TAGS = ["nuts", "milk", "gluten", "egg", "sesame"] as const;

/**
 * 이 재료가 걸리는 조건들. **모르는 재료면 `null`** — 「없다」가 아니다.
 */
export function dietTagsFor(ingredient: string): Set<DietTag> | null {
  const hasLabel = labelFor(ingredient) !== null;
  const hand = NO_LABEL[ingredient];
  if (!hasLabel && hand === undefined) return null;

  const tags = new Set<DietTag>();
  if (hasLabel) {
    for (const t of ALLERGEN_TAGS) if (declares(ingredient, t)) tags.add(t);
  }
  for (const t of hand ?? []) tags.add(t);
  if (SESAME_UNVERIFIED.has(ingredient)) tags.add("sesame");
  if (MEAT.has(ingredient)) tags.add("meat");
  if (ANIMAL_NOT_MEAT.has(ingredient)) tags.add("animal");
  return tags;
}

/** 비건이 못 먹는 것 — 고기·우유·달걀·꿀. */
function isAnimal(tags: Set<DietTag>): boolean {
  return tags.has("meat") || tags.has("milk") || tags.has("egg") || tags.has("animal");
}

export type DietViolation = { ingredient: string; reason: AllergyType | "unknown" };

/**
 * 이 재료들이 선택된 조건을 어기는 곳을 **전부** 돌려준다. 빈 배열이면 통과다.
 *
 * 🔴 모르는 재료는 조건이 하나라도 켜져 있으면 위반으로 센다. 「모르니까 괜찮다」로
 *    두면 데이터가 늘 때마다 조용히 새는 구멍이 된다.
 */
export function dietViolations(
  ingredients: string[],
  allergies: AllergyType[],
): DietViolation[] {
  // 🔴 「Kindy」는 식이 조건이 아니다 — 그것만 켰을 때 모르는 재료를 위반으로 세면
  //    질식 규칙과 무관한 이유로 간식·저장분이 빠진다. 질식 판정은 `chokingRisk.ts`가 따로 한다.
  allergies = allergies.filter((a) => a !== "Kindy");
  if (!allergies.length) return [];
  const out: DietViolation[] = [];
  for (const ing of ingredients) {
    const tags = dietTagsFor(ing);
    if (tags === null) {
      out.push({ ingredient: ing, reason: "unknown" });
      continue;
    }
    for (const a of allergies) {
      const tag = ALLERGY_TAG[a];
      if (tag && tags.has(tag)) out.push({ ingredient: ing, reason: a });
      else if (a === "Vegetarian" && tags.has("meat")) out.push({ ingredient: ing, reason: a });
      else if (a === "Vegan" && isAnimal(tags)) out.push({ ingredient: ing, reason: a });
    }
  }
  return out;
}

/**
 * 선택된 알레르기 중 **주의 문구(may contain)만** 그 알레르겐을 적은 재료. 거르는 데는 안 쓴다.
 *
 * 🔴 2026-09-29 — 글루텐 필터를 켠 식단에 Nachos가 나오는데 Salsa 포장이
 *    「May contain Wheat, Gluten」이었다. 플래너는 선언분만 거르므로(위 `dietViolations`)
 *    그대로 통과시키고 아무 말도 안 했다. 필터는 그대로 두고 **알리기만** 한다.
 *    /snack-checker의 ⚠도 이 함수에서 나온다 — 두 화면이 서로 다른 규칙을 갖지 않게.
 * 🔴 선언까지 한 재료는 여기 안 넣는다. 그건 주의가 아니라 위반이고 이미 걸러진다.
 */
export function mayContainNotes(ingredients: string[], allergies: AllergyType[]): MayContainNote[] {
  const out: MayContainNote[] = [];
  for (const allergy of allergies) {
    const tag = ALLERGY_TAG[allergy] as "nuts" | "milk" | "gluten" | "egg" | "sesame" | undefined;
    if (!tag) continue;
    for (const ingredient of new Set(ingredients)) {
      if (!declares(ingredient, tag) && warnsAbout(ingredient, tag)) out.push({ ingredient, allergy });
    }
  }
  return out;
}

/** 하루치(메인 + 간식) ⚠ 목록. 생성·교체·공유(`assembleWeek`)와 저장분 복원이 같이 쓴다. */
export function dayMayContain(
  mainIngredients: string[],
  snacks: SnackItem[],
  allergies: AllergyType[],
): MayContainNote[] {
  return [
    ...mayContainNotes(mainIngredients, allergies),
    ...snacks.flatMap((sn) =>
      mayContainNotes(sn.ingredients ?? [], allergies).map((n) => ({ ...n, snack: sn.name })),
    ),
  ];
}

/** 간식 하나가 조건을 통과하나. 「빼고 싶은 재료」도 메인과 같은 규칙으로 본다. */
export function snackAllowed(
  snack: SnackItem,
  allergies: AllergyType[],
  excluded: string[] = [],
): boolean {
  const ings = snack.ingredients ?? [];
  if (excluded.some((ex) => ings.includes(ex))) return false;
  if (kindyOn(allergies) && snackExclusion(snack)) return false;
  return dietViolations(ings, allergies).length === 0;
}

/* ────────────────────────────────────────────────────────────────
 * 저장된 식단을 되살려도 되는지 (2026-09-10 외부 감사)
 *
 * 🔴 복원 경로가 **가격만** 다시 계산하고 메뉴·간식은 저장된 것을 그대로 살렸다.
 *    09-10 이전 저장분의 간식은 알레르기 필터를 **한 번도 거치지 않은 것**이라,
 *    처음 접속하면 수정 전에 만들어진 `Lentil Soup + Cottage Cheese`(Dairy Allergy)가
 *    되살아났다. 새로 만들면 정상이라 **고쳐진 것처럼 보이는데** 기존 방문자는 계속 봤다.
 *
 * 판정을 컴포넌트가 아니라 여기 둔다 — 안에 두면 가드가 소스 문자열밖에 못 본다.
 * ──────────────────────────────────────────────────────────────── */

/** 저장분이 「간식도 걸러졌다」고 표시하는 스키마 번호. 이보다 낮거나 없으면 못 믿는다. */
export const PLAN_SCHEMA = 2;

export type SavedPlanShape = {
  schema?: number;
  filters?: { allergies?: AllergyType[]; excluded?: string[] };
  planData?: Array<{ rawIngredients?: string[]; snacks?: Array<{ name?: string; ingredients?: string[] }> }>;
};

/**
 * 되살리면 안 되는 저장분인가. `true`면 버리고 다시 만들라고 안내한다.
 *
 * 두 겹이다: ① 스키마 표시가 없으면 근거가 없으므로 버린다
 *            ② 표시가 있어도 저장된 조건으로 메인·간식을 다시 본다
 */
export function savedPlanIsStale(saved: SavedPlanShape): boolean {
  if (saved.schema !== PLAN_SCHEMA) return true;
  const allergies = saved.filters?.allergies ?? [];
  const excluded = saved.filters?.excluded ?? [];
  return (saved.planData ?? []).some((d) => {
    const ings = [
      ...(d.rawIngredients ?? []),
      ...(d.snacks ?? []).flatMap((sn) => sn.ingredients ?? []),
    ];
    const kindyHit =
      kindyOn(allergies) &&
      (menuExclusion(d.rawIngredients ?? []) !== null ||
        (d.snacks ?? []).some((sn) => snackExclusion({ name: sn.name ?? "", ingredients: sn.ingredients ?? [] }) !== null));
    return (
      dietViolations(ings, allergies).length > 0 ||
      ings.some((i) => excluded.includes(i)) ||
      kindyHit
    );
  });
}
