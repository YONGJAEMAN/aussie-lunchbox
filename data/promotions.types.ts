/**
 * Weekly supermarket promotions schema.
 * 사용자가 마트 메일을 paste → AI 파싱 → 이 구조로 저장됨.
 *
 * 단일 파일 (data/promotions.json) 에 주차별 keyed 로 누적.
 */

export type StoreId = "paknsave" | "woolworths" | "newworld";

/** 전단이 섬마다 다르다. 고르지 않으면 north — 이 기능 전의 모든 링크·저장 식단이 북섬이다. */
export type Island = "north" | "south";
export const ISLANDS: readonly Island[] = ["north", "south"];

/**
 * Promotion 종류:
 * - "sale": 정가 → 세일가 직접 할인 (Super Saver, 1/2 price 등). 누구나 즉시 적용.
 * - "club": 회원 전용 가격 (New World Club Deal 등). 회원 카드 있는 사용자에만.
 * - "points": 포인트 적립 배수 (Woolworths Boost 10x 등). 가격 할인 아니라
 *   적립이라 도시락 비용 계산엔 영향 0. 표시만 가능.
 * - "everyday-low": 정가 자체가 저렴 (New World Everyday Low Price). 매주 동일.
 */
export type PromoType = "sale" | "club" | "points" | "everyday-low";

/**
 * 도시락 적합성 — 자동 필터 + 사용자 컨펌용.
 * - "lunchbox": 도시락 식재료/스낵으로 직접 사용 가능
 * - "snack-only": 도시락 디저트/간식 정도로만 (예: 초콜릿)
 * - "excluded": 도시락 부적합 (주류, 비식품, 알레르겐 정책 위반 등)
 */
export type LunchboxFit = "lunchbox" | "snack-only" | "excluded";

export interface Promotion {
  /** 상품명 (마트 메일에 표시된 그대로) */
  name: string;
  /** 정규화된 매칭 키 — planGenerator의 ingredient name과 매칭 */
  matchKey: string;
  /** 식재료 카테고리 (utils.ts의 INGREDIENT_CATEGORIES 와 일치) */
  category: string;
  /** 정가 (NZD). points 타입이면 0 또는 단가. */
  regularPrice: number;
  /** 세일 가격 (NZD). points 타입이면 일반 가격. */
  salePrice: number;
  /** 절약 금액 (계산값) */
  savings: number;
  /** 절약 비율 % (계산값) */
  savingsPercent: number;
  /** Promotion 종류 */
  promoType: PromoType;
  /** 도시락 적합성 (자동 필터 또는 사용자 라벨) */
  lunchboxFit: LunchboxFit;
  /** 마트 메일/사이트의 promo URL (선택) */
  url?: string;
  /** 이미지 URL (선택) */
  image?: string;
  /**
   * matchKey 로는 안 붙지만 **같은 식품인** 재료 이름들. 사람이 명시한 것만 붙는다.
   * 🔴 2026-08-24 이전엔 양방향 부분일치라 땅콩버터가 `Butter` 에, 치즈가
   * `Cheese Sauce` 에 자동으로 붙었다. 이제 이 목록에 적힌 것만 예외로 붙는다.
   * (예: matchKey "canned tuna" 에 alsoMatches ["Tuna"])
   */
  alsoMatches?: string[];
  /**
   * 🔴 **가격에 반영하려면 여기에 우리 재료 키를 직접 적어야 한다.** 안 적으면
   *    이 특가는 「이번 주 특가」 목록에만 뜨고 **가격은 손대지 않는다**(fail-closed).
   *
   *    2026-09-09 외부 감사에서 드러난 것 — `matchKey`는 **분류**지 상품이 아니다.
   *    `matchKey: "milk"` 하나에 유제품 우유와 귀리음료가 같이 들어 있었고,
   *    전단 상품의 **할인 비율**을 우리 기준가에 곱하는 계산과 겹쳐서
   *    화면에 아무 데도 없는 가격이 떴다(Milk $3.75 → $2.58, 근거는 Alpro 식물성 음료).
   *    180개 재료 중 32개가 그런 값이었다.
   *
   *    분류로는 이 오분류를 원리상 못 막는다 — 같은 키·같은 용량·더 싼 값을
   *    전부 통과하기 때문이다. 그래서 사람이 상품을 보고 적는 것만 가격에 쓴다.
   *
   *    적는 값은 `PORTION_BASIS`/가격 캐시의 **정확한 키**다(예: "Bacon", "Plant Milk").
   *    용량이 우리 추적 팩과 다르거나 전단가가 더 비싸면 적어도 안 붙는다.
   */
  pricesIngredients?: string[];
  /**
   * 묶음 조건. salePrice 는 **묶음 단가**라 하나만 사면 그 값이 아니다
   * (예: "2 for $5.00" 이면 낱개는 regularPrice $3.29 그대로).
   * 화면이 이 사실을 밝히지 않으면 절약액이 부풀어 보인다.
   */
  multibuy?: string;
  /** 추가 노트 (예: "회원 전용", "10x points", "nut-allergy 위반 — 학교 정책 X") */
  note?: string;
}

export interface StorePromotions {
  /** 마트 표시 이름 ("Pak'nSave", "Woolworths" 등) */
  storeName: string;
  /** 메일/페이지 source URL */
  sourceUrl?: string;
  /** 마트 로고 URL (UI 표시용, 선택) */
  logoUrl?: string;
  /** 그 주의 promotion 항목들 */
  items: Promotion[];
}

export interface WeeklyPromotions {
  /** 유효 시작일 (YYYY-MM-DD) */
  validFrom: string;
  /** 유효 만료일 (YYYY-MM-DD) */
  validUntil: string;
  /** 마트별 promo 데이터 — **북섬 전단**이다(2026-10-27까지 들어온 것은 전부 북섬판) */
  stores: Partial<Record<StoreId, StorePromotions>>;
  /**
   * 남섬 전단. 없으면 그 주 남섬 특가는 「아직 없음」이다 — 🔴북섬 값으로 대신하지 않는다.
   * `stores`를 섬별로 중첩하지 않은 이유: 기존 주차·테스트·promoHistory가 전부 `stores`를 읽는다.
   */
  southStores?: Partial<Record<StoreId, StorePromotions>>;
  /** 사용자(본인)가 입력한 시점 */
  enteredAt?: string;
  /** AI 파싱 사용 여부 (감사용) */
  aiParsed?: boolean;
}

export interface PromotionsFile {
  /** 현재 주차 키 (YYYY-MM-DD, 월요일) */
  currentWeek: string;
  /** 주차별 데이터 (오래된 주차도 누적, 통계/회고용) */
  weeks: Record<string, WeeklyPromotions>;
}

/**
 * 매칭 결과 — planGenerator가 메뉴와 promo를 연결할 때 사용.
 */
export interface SaleMatch {
  ingredient: string;
  promotion: Promotion;
  store: StoreId;
}
