import {
  MenuItem, SnackItem, SnackData, PriceInfo, PlanItem,
  AllergyType, GeneratePlanResponse,
} from "./types";
import { PORTION_FACTORS, DEFAULT_PORTION } from "./planConfig";
import { estimateMenuCalories, estimateSnackCalories } from "./nutritionCalc";

function filterMenus(
  menus: MenuItem[],
  allergies: AllergyType[],
  excluded: string[]
): MenuItem[] {
  return menus.filter((menu) => {
    if (menu.name.toLowerCase().includes("popcorn")) return false;
    if (allergies.includes("Nut Allergy") && !menu.is_nut_free) return false;
    if (allergies.includes("Dairy Allergy") && !menu.is_dairy_free) return false;
    if (allergies.includes("Gluten Allergy") && !menu.is_gluten_free) return false;
    if (allergies.includes("Egg Allergy") && !menu.is_egg_free) return false;
    if (allergies.includes("Vegetarian") && !menu.is_vegetarian) return false;
    if (allergies.includes("Vegan") && !menu.is_vegan) return false;
    if (excluded.some((ex) => menu.ingredients.includes(ex))) return false;
    return true;
  });
}

function splitPriorityNormal(
  menus: MenuItem[],
  favorites: string[],
  leftover: string
): [MenuItem[], MenuItem[]] {
  const priority: MenuItem[] = [];
  const normal: MenuItem[] = [];
  for (const menu of menus) {
    const lower = menu.ingredients.map((i) => i.toLowerCase());
    let isPriority = false;
    if (leftover.trim()) {
      const lv = leftover.trim().toLowerCase();
      if (lower.some((i) => i.includes(lv))) isPriority = true;
    }
    if (!isPriority && favorites.length) {
      if (favorites.some((fav) => lower.some((i) => i.includes(fav.toLowerCase())))) {
        isPriority = true;
      }
    }
    (isPriority ? priority : normal).push(menu);
  }
  return [priority, normal];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function countCat(cat: string, selection: MenuItem[]): number {
  return selection.filter((m) => m.category === cat).length;
}

function selectFiveMenus(pool: MenuItem[]): MenuItem[] {
  let p = [...pool];
  while (p.length < 5) p = [...p, ...p];

  const final: MenuItem[] = [];
  const remaining = shuffle(p);

  while (final.length < 5 && remaining.length) {
    if (countCat("Hot", final) === 0) {
      const idx = remaining.findIndex((m) => m.category === "Hot");
      if (idx !== -1) { final.push(remaining.splice(idx, 1)[0]); continue; }
    }
    if (countCat("Baking", final) === 0) {
      const idx = remaining.findIndex((m) => m.category === "Baking");
      if (idx !== -1) { final.push(remaining.splice(idx, 1)[0]); continue; }
    }
    if (countCat("Sandwich", final) >= 2) {
      const idx = remaining.findIndex((m) => m.category !== "Sandwich");
      if (idx !== -1) { final.push(remaining.splice(idx, 1)[0]); continue; }
    }
    final.push(remaining.shift()!);
  }

  return shuffle(final).slice(0, 5);
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 재료 목록의 비용을 계산한다. 메뉴 재료와 간식이 **같은 경로**를 쓰도록 하기 위한
 * 단일 진입점.
 *
 * 2026-08-06에 뽑아냈다. 그전에는 두 곳에 나뉘어 있었고 간식 쪽이
 * `PORTION_FACTORS`를 조회하지 않고 `DEFAULT_PORTION`을 하드코딩하고 있었다 —
 * 치즈 블록 한 팩의 20%가 "치즈 큐브" 간식 하나로 계산됐다는 뜻이다.
 * (Kiwi에서 먼저 발견돼 회귀 테스트가 붙은 것과 같은 버그였다.)
 *
 * price는 "판매 단위 한 팩" 가격이고, PORTION_FACTORS는 1인분이 소비하는 팩의 비율.
 * 자세한 단위 규약은 planConfig.ts 상단 주석 참조.
 */
export function costForIngredients(
  ingredients: string[],
  priceMap: Map<string, PriceInfo>,
): number {
  let cost = 0;
  for (const ing of ingredients) {
    const portion = PORTION_FACTORS[ing] ?? DEFAULT_PORTION;
    cost += (priceMap.get(ing)?.price ?? 0) * portion;
  }
  return cost;
}

export async function buildWeeklyPlan(
  menus: MenuItem[],
  allergies: AllergyType[],
  excluded: string[],
  favorites: string[],
  leftover: string,
  snackData: SnackData,
  getPrices: (ingredients: string[]) => Promise<PriceInfo[]>
): Promise<GeneratePlanResponse> {
  const available = filterMenus(menus, allergies, excluded);
  if (!available.length) {
    throw new Error("No menus match your criteria. Try removing some filters.");
  }

  const [priority, normal] = splitPriorityNormal(available, favorites, leftover);
  const pool = [...shuffle(priority), ...shuffle(normal)];

  let warning: string | undefined;
  if (pool.length < 5) {
    warning = `Found only ${pool.length} unique menus. Some meals will be repeated.`;
  }

  const selected = selectFiveMenus(pool);
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const shoppingList: string[] = [];

  // Pick snacks for each day first (before price fetching)
  const dailySnacksList: SnackItem[][] = selected.map(() => {
    const snacks: SnackItem[] = [];
    if (snackData["Fruit & Veg"]?.length) {
      snacks.push(randomChoice(snackData["Fruit & Veg"]));
    }
    const snackPool = [
      ...(snackData["Protein & Dairy"] ?? []),
      ...(snackData["Savoury Crunch"] ?? []),
    ];
    if (snackPool.length) snacks.push(randomChoice(snackPool));
    return snacks;
  });

  // Collect ALL unique ingredients across all menus + snacks in one shot
  const allIngredients: string[] = [];
  for (let i = 0; i < selected.length; i++) {
    allIngredients.push(...selected[i].ingredients);
    for (const snack of dailySnacksList[i]) {
      allIngredients.push(...(snack.ingredients ?? []));
    }
  }
  const uniqueIngredients = [...new Set(allIngredients)];

  // Single batch price fetch (runs all requests in parallel)
  const priceList = await getPrices(uniqueIngredients);
  const priceMap = new Map<string, PriceInfo>();
  uniqueIngredients.forEach((ing, idx) => priceMap.set(ing, priceList[idx]));

  // Build plan using cached prices
  const planData: PlanItem[] = [];

  for (let i = 0; i < days.length; i++) {
    const menu = selected[i];
    const dailySnacks = dailySnacksList[i];

    const snackIngredients = dailySnacks.flatMap((s) => s.ingredients ?? []);
    const cost =
      costForIngredients(menu.ingredients, priceMap) +
      costForIngredients(snackIngredients, priceMap);
    shoppingList.push(...snackIngredients);

    const calories =
      estimateMenuCalories(menu.ingredients) +
      estimateSnackCalories(dailySnacks);

    planData.push({
      day: days[i],
      menuIndex: menus.indexOf(menu),
      menuName: menu.name,
      description: menu.ingredients.join(", "),
      estCost: `$${cost.toFixed(2)}`,
      image: menu.image,
      instructions: menu.instructions,
      rawIngredients: menu.ingredients,
      category: menu.category,
      nutrition: { calories, label: "kcal (Est.)" },
      snacks: dailySnacks,
    });

    shoppingList.push(...menu.ingredients);
  }

  // Convert priceMap to plain object for JSON serialization
  const prices: Record<string, PriceInfo> = {};
  priceMap.forEach((val, key) => { prices[key] = val; });

  return { planData, shoppingList, prices, warning };
}
