export type Locale = "en" | "ko" | "zh";

export type AllergyType =
  | "Nut Allergy"
  | "Dairy Allergy"
  | "Gluten Allergy"
  | "Egg Allergy"
  | "Vegetarian"
  | "Vegan";

export interface MenuItem {
  name: string;
  category: "Sandwich" | "Hot" | "Baking" | "Cold";
  ingredients: string[];
  image: string;
  instructions: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_dairy_free: boolean;
  is_nut_free: boolean;
  is_egg_free: boolean;
}

export interface SnackItem {
  name: string;
  ingredients: string[];
}

export interface SnackData {
  "Fruit & Veg": SnackItem[];
  "Protein & Dairy": SnackItem[];
  "Savoury Crunch": SnackItem[];
  "Sweet Treat": SnackItem[];
}

export interface PriceInfo {
  price: number;
  image: string;
  name: string;
  source: string;
  /**
   * price가 **낱개 하나 값**인지. AU는 신선농산물이 낱개로 팔려
   * (`Apple $1.38 / 1EA`) 팩 상품과 분량 계산이 달라진다.
   * 수집기(scripts/update_prices.mjs)가 CupString으로 판정해 채운다.
   * 없으면 팩 가격으로 본다 — 예전 캐시 항목과의 호환.
   */
  perEach?: boolean;
  /** 판정 근거를 남겨 검수 때 눈으로 볼 수 있게 한다 (예: "$1.38 / 1EA") */
  cupString?: string;
  /** 실제로 사용한 검색어. 오매칭을 추적할 때 쓴다 */
  searchTerm?: string;
}

export interface NutritionInfo {
  calories: number;
  label: string;
}

export interface PlanItem {
  day: string;
  menuIndex: number;
  menuName: string;
  description: string;
  estCost: string;
  image: string;
  instructions: string;
  rawIngredients: string[];
  category: string;
  nutrition: NutritionInfo;
  snacks: SnackItem[];
}

export interface GeneratePlanRequest {
  locale: Locale;
  allergies: AllergyType[];
  excludedIngredients: string[];
  favoriteIngredients: string[];
  fridgeLeftover: string;
}

export interface GeneratePlanResponse {
  planData: PlanItem[];
  shoppingList: string[];
  prices: Record<string, PriceInfo>;
  warning?: string;
}
