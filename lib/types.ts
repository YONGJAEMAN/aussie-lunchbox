export type Locale = "en" | "ko" | "zh";

export type AllergyType =
  | "Nut Allergy"
  | "Dairy Allergy"
  | "Gluten Allergy"
  | "Egg Allergy"
  /** 2026-10-22 — 메인은 손 태그가 없어 재료 라벨로 판정한다(`ingredientDiet.ts` `SESAME_UNVERIFIED`). */
  | "Sesame Allergy"
  | "Vegetarian"
  | "Vegan"
  /** 알레르기가 아니라 질식 위험 규칙이다(`lib/chokingRisk.ts`). 식이 판정(`dietViolations`)·⚠에는 안 들어간다. */
  | "Kindy";

export type PrepStyle = "no-cook" | "make-ahead" | "cook-fresh";

export const CUISINES = [
  "kiwi", "pacific", "british", "american", "european", "italian",
  "mediterranean", "middle_eastern", "indian", "chinese", "japanese",
  "korean", "southeast_asian", "mexican",
] as const;

/** 요리 스타일 — **표시 전용 태그다.** 플래너 필터로 쓰지 않는다.
 *  94개를 14칸으로 쪼개면 한식 1·태평양 1처럼 5일치를 못 채우는 칸이 생기고,
 *  알레르기 필터와 곱해지면 0개가 된다. 자세한 실측은 cuisineTags.test.ts 참고. */
export type Cuisine = (typeof CUISINES)[number];

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
  prep_style?: PrepStyle;
  is_thermos?: boolean;
  cuisine?: Cuisine;
}

export interface SnackItem {
  name: string;
  ingredients: string[];
  /**
   * 냉장이 필요한 간식 — 식품안전 가이드의 「High Risk (Must Stay Cold)」 분류(유제품·달걀·햄·후무스·자른 과일)와 같다.
   * 🔴 09-29: 글은 「자른 멜론은 냉장 필요」라고 말하는데 플래너는 안내 없이 수박·멜론을 배정하고 있었다.
   */
  keepCold?: boolean;
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
  /** 도시락이 여러 개일 때만 — 도시락별 열량(1번이 `calories`와 같다). 아이마다 양이 달라 합치지 않는다. */
  perBox?: number[];
}

/** 추적 상품의 주의 문구(may contain)가 선택된 알레르겐을 적은 재료. `snack`이 있으면 그 간식의 재료다. */
export interface MayContainNote {
  ingredient: string;
  allergy: AllergyType;
  snack?: string;
}

import type { SaleMatch, StoreId } from "@/data/promotions.types";
import type { KindyPrepNote } from "./chokingRisk";

export interface PlanItem {
  day: string;
  menuIndex: number;
  menuName: string;
  description: string;
  estCost: string;
  /**
   * 🔴 반올림 **전** 하루치 원가 (2026-09-10 외부 감사 5번).
   *    상단 주간 합계가 `estCost` 문자열을 파싱해서 더하고 있었다. 카드마다
   *    센트로 자른 값을 다섯 번 더한 것이라 장보기 합계와 1센트가 어긋났다
   *    ($15.82 vs $15.81). 합계는 이 값으로 낸다 — 반올림은 마지막에 한 번만.
   */
  estCostValue?: number;
  image: string;
  instructions: string;
  rawIngredients: string[];
  category: string;
  nutrition: NutritionInfo;
  snacks: SnackItem[];
  /** Promotion 매칭된 식재료들 (sale 토글 ON 시 채워짐) */
  saleMatches?: SaleMatch[];
  prepStyle?: PrepStyle;
  isThermos?: boolean;
  cuisine?: Cuisine;
  /**
   * 🔴 선택된 알레르기에 대해 포장이 「may contain」이라고만 적은 재료(2026-09-29).
   *    필터는 선언분만 거르므로 이것들은 식단에 남는다 — 화면이 ⚠로 알린다. 없으면 생략.
   */
  mayContain?: MayContainNote[];
  /** 「Kindy (under 5)」를 켰을 때만 — 가이드가 손질하라고 한 재료의 안내. 없으면 생략. */
  kindyPrep?: KindyPrepNote[];
  /**
   * 이 요일엔 도시락을 안 싼다(2026-10-26 「요일 선택」). 메뉴는 그대로 두되(다시 켜면 같은 메뉴)
   * 주간 합계·장보기 목록·절약액에서 뺀다. 없으면 싸는 날이다.
   */
  off?: true;
}

export interface GeneratePlanRequest {
  locale: Locale;
  allergies: AllergyType[];
  excludedIngredients: string[];
  favoriteIngredients: string[];
  fridgeLeftover: string;
  /** 이번 주 sale 활용 여부 */
  useSales?: boolean;
  /** 사용자가 선택한 마트 (sale 적용 대상) */
  saleStores?: StoreId[];
  /** 조리 방식 필터 (빈 배열 = 전체) */
  prepStyles?: PrepStyle[];
  /** 보온병 도시락만 */
  thermosOnly?: boolean;
  /** 나이대별 양 (`lib/portionBands.ts`). 모르는 값·생략 = "standard" */
  portionBand?: string;
  /** 같은 식단을 더 싸는 도시락(2번부터)의 나이대. 생략 = 도시락 한 개 */
  extraBoxes?: string[];
  /** 월~금 도시락을 싸는 날. 길이 5·하나 이상 true가 아니면 다섯 날 전부로 둔다 */
  lunchDays?: boolean[];
  /** 생략하면 새 주간 생성. "swap" = 하루 교체, "shared" = 공유 링크 열기 */
  mode?: "generate" | "swap" | "shared";
  /** swap: 지금 화면의 다섯 날(이름만) */
  week?: { menu: string; snacks: string[] }[];
  /** swap: 바꿀 날 (0 = 월요일) */
  dayIndex?: number;
  /** shared: `?plan=` 값 그대로. 서버가 직접 해독·검증한다 */
  share?: string;
}

export interface GeneratePlanResponse {
  planData: PlanItem[];
  shoppingList: string[];
  prices: Record<string, PriceInfo>;
  /** 5일치 plan에서 sale로 절약한 총 금액 (NZD) */
  totalSavings?: number;
  /**
   * 5일치 plan의 총 비용 (NZD). 특가가 켜져 있으면 특가가 반영된 금액이다.
   * 정가 기준 금액은 `totalWeekCost + totalSavings`. 화면에는 둘 다 보여준다 —
   * 한 줄만 보여주면 정가 기준으로 발표한 중앙값 $4와 어긋난 것처럼 읽힌다.
   */
  totalWeekCost?: number;
  warning?: string;
}
