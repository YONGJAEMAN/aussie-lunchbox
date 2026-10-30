/**
 * 조리법 본문에 **실제로 적혀 있는** 투입량을, 재료별로 옮겨 적은 것.
 *
 * 🔴 왜 생겼나 (2026-09-10 외부 감사 2번) — 레시피 창의 재료 옆 분량은
 *    `PORTION_BASIS`의 **재료별 전역 1인분**이지 그 조리법의 투입량이 아니다.
 *    Tamagoyaki 조리법은 달걀 3개인데 화면은 1개, 간장은 1 tsp인데 화면은 10ml였다.
 *    안내 문구를 붙여 한계를 밝히긴 했지만, 감사의 지적이 맞다 —
 *    **설명을 더한다고 그 도시락의 비용을 검산할 수 있게 되지는 않는다.**
 *
 * 🔴 그래서 없는 값을 만들지 않고, **이미 사이트에 적혀 있는 값을 끌어온다.**
 *    94개 중 조리법이 분량을 말하는 건 12개다. 그 12개만 여기 옮겨 적는다.
 *    나머지 82개는 빈칸이고 화면도 아무 말 하지 않는다.
 *
 * 🔴 자동 추출은 쓰지 않았다. 정규식으로 뽑아 보니 7쌍 중 2쌍을 엉뚱한 재료에
 *    붙였다("rub 50g butter into 2 cups self-raising flour"의 50g을 Flour에).
 *    사람이 읽어 옮겨 적고, 가드가 **본문 대조로** 검증한다:
 *      ① 값이 그 조리법 본문에 글자 그대로 있는가
 *      ② 그 값 근처(±60자)에 그 재료 이름이 있는가  ← 오배치를 잡는 검사
 *      ③ 키가 그 레시피의 재료 목록에 있는가
 *
 * 🔴 **1인분으로 환산하지 않는다.** 조리법이 몇 인분을 만드는지는 대부분 안 적혀
 *    있고(94개 중 4개), 환산하면 그게 곧 지어내는 것이다. 화면은 두 값을 나란히
 *    보여 주고, 배치 원가는 독자가 곱하면 나온다 — 달걀 1개가 $0.83이면
 *    3개짜리 계란말이는 $2.49다.
 */
export const RECIPE_METHOD_AMOUNTS: Record<string, Record<string, string>> = {
  "ANZAC Biscuits": {
    "Rolled Oats": "1 cup",
    Flour: "1 cup",
    "Desiccated Coconut": "1 cup",
    Sugar: "1 cup",
    Butter: "125g",
    "Golden Syrup": "2 tbsp",
    "Baking Soda": "1 tsp",
  },
  "Cheesymite Scrolls": {
    Butter: "50g",
    Flour: "2 cups",
    Milk: "¾ cup",
  },
  "Savoury Cheese Muffins": {
    Egg: "1 egg",
    Milk: "1 cup",
    Butter: "50g",
    Flour: "2 cups",
    Cheese: "1 cup",
    Sweetcorn: "½ cup",
  },
  "Bacon & Egg Muffins": {
    Egg: "6 eggs",
  },
  "Bircher / Overnight Oats": {
    "Rolled Oats": "½ cup",
    Yoghurt: "½ cup",
    Milk: "¼ cup",
    "Grated Apple": "1 grated apple",
  },
  "Rice Balls (Onigiri)": {
    Mayonnaise: "1 tbsp",
  },
  "Tamagoyaki (Rolled Omelette)": {
    Egg: "3 eggs",
    "Soy Sauce": "1 tsp",
    Sugar: "1 tsp",
  },
  "Hash Browns": {
    Potato: "2 potatoes",
    Flour: "2 tbsp",
  },
  Waffles: {
    Egg: "1 egg",
    Milk: "1 cup",
    Butter: "50g",
    Flour: "1½ cups",
    Sugar: "2 tbsp",
    "Baking Powder": "2 tsp",
  },
  "Date & Oat Slice": {
    Dates: "1 cup",
    "Coconut Oil": "60g",
    "Golden Syrup": "2 tbsp",
    "Rolled Oats": "2 cups",
    "Desiccated Coconut": "½ cup",
  },
  "Vegan Banana Muffins": {
    Banana: "2 ripe bananas",
    "Plant Milk": "½ cup",
    Oil: "⅓ cup",
    Sugar: "½ cup",
    Flour: "1½ cups",
    "Baking Powder": "2 tsp",
  },
  "GF Banana Bread": {
    Banana: "3 ripe bananas",
    Egg: "1 egg",
    Oil: "⅓ cup",
    Sugar: "½ cup",
    "Gluten-Free Flour": "1½ cups",
    "Baking Powder": "2 tsp",
  },
};

/** 이 레시피의 이 재료에 조리법이 말하는 투입량. 없으면 `undefined` — 화면은 침묵한다. */
export function methodAmountFor(recipe: string, ingredient: string): string | undefined {
  return RECIPE_METHOD_AMOUNTS[recipe]?.[ingredient];
}

/** 투입량이 적힌 레시피 수 — 「12개뿐」이라는 문장을 손으로 적지 않으려고 있다. */
export const RECIPES_WITH_METHOD_AMOUNTS = Object.keys(RECIPE_METHOD_AMOUNTS).length;
