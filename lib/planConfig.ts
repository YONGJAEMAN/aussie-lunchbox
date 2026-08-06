/**
 * PORTION_FACTORS — 재료별 "1인분이 소비하는 소매 팩의 비율".
 *
 * ⚠️ 2026-08-06: Kiwi(kiwi-lunchbox)의 표를 그대로 이식했다.
 * 이 값들은 **가격이 아니라 구조값**이다 — "소매 팩의 몇 %를 한 끼에 쓰는가".
 * AU/NZ 가격은 각자 자기 캐시(data/price_cache.json)를 쓰고 여기서 섞이지 않는다.
 *
 * 이식한 이유: 기존 표는 Kiwi가 2026-07-28에 고친 **단위 착오**를 그대로 갖고 있었다.
 *   Apple 1.0 / Yoghurt 1.0 / Bagel 1.0 / Croissant 1.0
 *   → 가격 피드는 **팩 단위**를 주는데(사과 1kg, 요거트 1kg 통), factor 1.0은
 *     "한 끼에 팩을 통째로 먹는다"는 뜻이었다. 요거트 한 통 $7.00이 도시락 하나에 잡혔다.
 * 게다가 메뉴 재료 134종 중 80종(60%)이 표에 없어 DEFAULT_PORTION 0.20으로 폴백됐다.
 * 결과적으로 도시락 1통 중앙값이 $5.88, 최대 $11.68로 부풀어 있었다.
 *
 * Aussie가 쓰는 재료 146종은 **전부** 아래 표에 있다(지어낸 값이 없다).
 *
 * 아래는 Kiwi 원문 주석이다:
 *
 * 가격 피드(`getPrices`)는 **판매 단위 한 팩의 가격**을 돌려준다.
 *   예) "apples kids" = 1kg 팩(사과 8~10개) / "cheese cheddar everyday" = 1kg 블록
 * 따라서 factor는 **개수가 아니라 팩 대비 비율**이어야 한다.
 * 사과 1개 = 1kg 팩의 약 1/8 → 0.12  (이전 값 1.0은 팩 전체를 한 끼에 먹는다는 뜻이었음)
 *
 * 값은 실제 1회 제공량 기준으로 정했고, 마케팅 문구에 맞추지 않았다.
 * 숫자가 문구와 다르면 고쳐야 하는 쪽은 문구다.
 */
export const PORTION_FACTORS: Record<string, number> = {
  // ── 빵·베이커리 (다개입 팩 중 1인분) ─────────────────────────
  Bread: 0.10, // 20장들이 식빵 2장
  "Gluten-Free Bread": 0.15,
  Bagel: 0.22, // 4~5개입 팩 중 1개
  Croissant: 0.25, // 300g 4개입 중 1개
  "Burger Bun": 0.20, "Bread Roll": 0.20, Roll: 0.20, "Sub Roll": 0.25,
  "Pita Bread": 0.20, Roti: 0.20, "Bao Buns": 0.25, Ciabatta: 0.25,
  Tortilla: 0.15, "Corn Tortilla": 0.15, Wrap: 0.15,
  "Muffin Splits": 0.20, Muffin: 0.15,

  // ── 과일 (kg/팩 단위 → 1개분) ────────────────────────────────
  Apple: 0.12, "Grated Apple": 0.12, Banana: 0.12, "Ripe Bananas": 0.25,
  Pear: 0.15, Orange: 0.15, Mandarin: 0.12, Kiwifruit: 0.15,
  Grapes: 0.15, Blueberries: 0.20, Strawberries: 0.20, Berries: 0.20,
  Rockmelon: 0.15, Watermelon: 0.10, Lemon: 0.10,
  Sultanas: 0.08, Dates: 0.10, "Dried Apricots": 0.10,

  // ── 채소 ────────────────────────────────────────────────────
  Carrot: 0.10, "Carrot Stick": 0.10, Celery: 0.10, Cucumber: 0.15,
  Capsicum: 0.25, Tomato: 0.15, "Cherry Tomatoes": 0.15,
  Lettuce: 0.08, "Cos Lettuce": 0.10, Rocket: 0.15, Cabbage: 0.08,
  Spinach: 0.10, Onion: 0.10, "Spring Onion": 0.10, Potato: 0.15,
  Broccoli: 0.15, Sweetcorn: 0.15, Corn: 0.05, Peas: 0.05,
  "Sugar Snap Peas": 0.20, Edamame: 0.15, "Mixed Vegetables": 0.10,
  Avocado: 0.50, Pickle: 0.05,

  // ── 육류·해산물·단백질 ───────────────────────────────────────
  Chicken: 0.20, "Chicken Breast": 0.20, "Cooked Chicken": 0.20,
  "Chicken Thigh": 0.20, "Chicken Skewers": 0.25, "Chicken/Tofu": 0.20,
  Ham: 0.12, "Ham/Bacon": 0.12, Turkey: 0.12, Salami: 0.10,
  "Roast Beef": 0.12, Beef: 0.20, "Beef Patty": 0.25, "Beef Mince": 0.15,
  Mince: 0.15, "Pork Mince": 0.15, "Char Siu Pork": 0.20,
  Meatballs: 0.20, Bacon: 0.12, "Sausage Meat": 0.20,
  "Cocktail Sausages": 0.20, "GF Sausages": 0.25,
  "Smoked Salmon": 0.20, Shrimp: 0.15,
  Tuna: 0.50, "Canned Tuna": 0.50, "Tuna/Chicken/Avocado": 0.30,
  Egg: 0.08, Eggs: 0.08, "Boiled Egg": 0.08, "Boiled Eggs": 0.17,
  "Egg (glaze)": 0.02,
  Tofu: 0.25, Paneer: 0.25, Falafel: 0.25,
  Chickpeas: 0.25, "Black Beans": 0.25, "Kidney Beans": 0.25,
  "Red Lentils": 0.10,

  // ── 유제품 (대용량 블록·통 → 1회분) ──────────────────────────
  Cheese: 0.04, // 1kg 블록에서 슬라이스 2장(≈30g)
  "Cheese Block": 0.04, "Cheese Stick": 0.10, "Cheese Sauce": 0.10,
  Mozzarella: 0.08, Feta: 0.10, "Feta Cheese": 0.10, Parmesan: 0.03,
  "Cream Cheese": 0.06, "Cottage Cheese": 0.12,
  Yoghurt: 0.12, // 1kg 통에서 1회분(≈120g)
  Milk: 0.05, "Plant Milk": 0.05, "Cream/Milk": 0.05, "Coconut Milk": 0.25,
  Butter: 0.03,

  // ── 곡물·건식 재료 ──────────────────────────────────────────
  Rice: 0.10, "Sushi Rice": 0.10, Quinoa: 0.10, Couscous: 0.10,
  Pasta: 0.12, Spaghetti: 0.12, Macaroni: 0.12, "Pasta spirals": 0.12,
  "GF Pasta": 0.12, Noodles: 0.20, "Rice Noodles": 0.20,
  Vermicelli: 0.20, "Vermicelli Noodles": 0.20,
  Flour: 0.08, "Gluten-Free Flour": 0.08, "Rolled Oats": 0.08,
  "Rolled Oats (GF)": 0.08, Muesli: 0.08, "Muesli (Nut-free)": 0.08,
  "Rice Bubbles": 0.08, Breadcrumbs: 0.05,
  "Desiccated Coconut": 0.05, Coconut: 0.05,
  Seaweed: 0.10, Nori: 0.10, "Rice Paper": 0.05,
  "Dumpling Wrappers": 0.15, Pastry: 0.25, "Puff Pastry": 0.25,
  "Pastry Cases": 0.25,

  // ── 포장 간식 (다개입 중 1회분) ──────────────────────────────
  Crackers: 0.15, "Wholegrain Crackers": 0.15, "GF Crackers": 0.15,
  "Rice Crackers": 0.20, "Rice Wheels": 0.20, Breadsticks: 0.20,
  Pretzels: 0.15, Popcorn: 0.15, "Veggie Straws": 0.20,
  "Corn Chips": 0.15, "Real Fruit Strip": 0.15, "Oat Cookie": 0.15,
  "Dark Chocolate": 0.10, "Probiotic Drink": 0.17, Croutons: 0.10,
  Olives: 0.08,

  // ── 스프레드·소스·향신료 (대용량 → 1회 사용량은 미미) ────────
  Butter_Spread: 0.03, Marmite: 0.02, Jam: 0.03, Honey: 0.03,
  "Peanut Butter": 0.04, "Peanut Sauce": 0.04, "Golden Syrup": 0.03,
  Mayo: 0.03, Mayonnaise: 0.03, "Vegan Mayo": 0.03, Mustard: 0.02,
  Hummus: 0.15, Pesto: 0.05, "Pesto/Mayo": 0.05, "Dairy-Free Pesto": 0.05,
  Salsa: 0.10, "Tomato Sauce": 0.03, "Tomato Paste": 0.05,
  "Soy Sauce": 0.02, "Teriyaki Sauce": 0.03, "Hoisin Sauce": 0.03,
  "Mint Chutney": 0.05, "Curry Paste": 0.05, "Butter Chicken Sauce": 0.25,
  "Caesar Dressing": 0.05, "Lemon Dressing": 0.05,
  "Olive Oil": 0.02, Oil: 0.02, "Sesame Oil": 0.02, "Coconut Oil": 0.03,
  "Vegetable Stock": 0.05,

  // ── 베이킹·향신료 (한 통으로 수십 회) ────────────────────────
  Sugar: 0.03, "Baking Powder": 0.02, "Baking Soda": 0.02, Yeast: 0.05,
  Cocoa: 0.03, Cinnamon: 0.01, Cumin: 0.01, Ginger: 0.02,
  Spices: 0.01, "Curry Spices": 0.01, Herbs: 0.05, Basil: 0.10,
};

/**
 * PORTION_FACTORS에 없는 재료의 기본값.
 * 이전 값 0.20(한 팩의 20%)은 대부분의 소매 팩에서 과대계상이었다.
 * 표 커버리지를 올린 뒤에도 누락은 생기므로, 보수적으로 낮춰 잡는다.
 */
export const DEFAULT_PORTION = 0.10;

/**
 * 🇦🇺 낱개로 팔리는 상품의 **1회분 개수**.
 *
 * AU Woolworths는 신선농산물을 낱개로 판다 — `Apple Royal Gala $0.94 / 1EA`는
 * 사과 **한 개** 값이다. 이 경우 가격에 팩 비율(0.12)을 곱하면 8배 과소계상이 된다.
 * 반대로 `Cheese Block $10.30 ($16.48/1KG)`은 한 팩 값이라 PORTION_FACTORS를 써야 한다.
 *
 * 어느 쪽인지는 캐시의 `perEach` 플래그가 알려준다(수집기가 CupString으로 판정).
 * NZ는 대부분 팩·kg 단위라 Kiwi에는 이 표가 없다 — **AU 고유 문제다.**
 *
 * 값은 "도시락 하나에 몇 개분이 들어가는가"다. 지어낸 수치가 아니라
 * 1회 제공량 기준이며, 애매하면 통째로 하나(1)로 둔다.
 */
export const PER_EACH_SERVINGS: Record<string, number> = {
  // 통째로 하나 들어가는 것
  Apple: 1, Banana: 1, "Ripe Bananas": 1, Pear: 1, Orange: 1, Mandarin: 1,
  Kiwifruit: 1, Carrot: 1, "Carrot Stick": 1, Potato: 1, Croissant: 1,
  Bagel: 1, Roll: 1, "Bread Roll": 1, Muffin: 1,

  // 하나를 여러 끼에 나눠 쓰는 것
  Cucumber: 0.3, // 레바니즈 오이 하나로 서너 끼
  Tomato: 0.5,
  Capsicum: 0.3,
  Onion: 0.25,
  Avocado: 0.5,
  Lemon: 0.2,
  Cabbage: 0.1,
  Lettuce: 0.15, "Cos Lettuce": 0.15,
  Ciabatta: 0.25, // 한 덩이로 네 끼
  Grapes: 0.15, // 한 송이에서 한 줌
  Celery: 0.2,
  Broccoli: 0.25,
};

/** 낱개 상품인데 위 표에 없으면 하나로 본다 (과소계상보다 안전) */
export const DEFAULT_PER_EACH_SERVINGS = 1;
