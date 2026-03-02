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
