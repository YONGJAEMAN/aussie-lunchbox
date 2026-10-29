import { portionsFactor, DEFAULT_PORTION_BAND, type Portions } from "./portionBands";

/**
 * PORTION_FACTORS — 재료별 "1인분이 소비하는 소매 팩의 비율".
 *
 * ⚠️ 단위 규약 (2026-07-28 전면 재작성)
 * 가격 피드(`getPrices`)는 **판매 단위 한 팩의 가격**을 돌려준다.
 *   예) "woolworths apples kids" $5.99 = 1kg 팩(사과 8~10개)
 *       "woolworths cheese cheddar everyday" $8.49 = **500g** 블록
 *
 * 🔴 위 치즈 예시는 2026-08-20까지 "$12.55 = 1kg 블록"이라고 적혀 있었다. 실제 상품은
 *    500g이다(Woolworths 상품 API sku 434914: size.volumeSize "500g", price $8.49,
 *    cupPrice $1.70/100g). 그 틀린 예시 위에 `Cheese: 0.04`가 세워져 있었고, 그래서
 *    본문에 실린 1인분 가격이 **2배 쌌다**. 팩 크기를 가정한 factor는 `PORTION_BASIS`에
 *    적어 두고 `lib/priceSearch.test.ts`가 고정 SKU와 대조한다 — 다시는 주석만 남기지 말 것.
 * 따라서 factor는 **개수가 아니라 팩 대비 비율**이어야 한다.
 * 사과 1개 = 1kg 팩의 약 1/8 → 0.12  (이전 값 1.0은 팩 전체를 한 끼에 먹는다는 뜻이었음)
 *
 * 이전 표는 "개당 가격"을 가정해 작성돼 있어 도시락 1통이 $8~13으로 계산됐다.
 * 값은 실제 1회 제공량 기준으로 정했고, 마케팅 문구($2 a box)에 맞추지 않았다.
 * 숫자가 문구와 다르면 고쳐야 하는 쪽은 문구다.
 */
export const PORTION_FACTORS: Record<string, number> = {
  // ── 2026-08-23: 가이드 레시피 전용 재료 (RECIPE_ONLY_INGREDIENTS).
  //    메뉴에는 안 쓰이지만 PORTION_BASIS 항목은 전부 factor가 있어야 한다는 규칙이
  //    `lib/priceSearch.test.ts`에 있다 — 근거와 비율을 짝지어 두는 게 그 규칙의 취지다.
  "Plain Flour": 0.08,
  Tahini: 0.04,
  Courgette: 0.10,
  "Vanilla Essence": 0.05,

  // ── 빵·베이커리 (다개입 팩 중 1인분) ─────────────────────────
  Bread: 0.10, // 20장들이 식빵 2장
  "Gluten-Free Bread": 0.15,
  Bagel: 0.25, // 4개입 팩 중 1개 (고정 SKU 270580 = 4pack. 0.22는 4.5개입을 뜻해 팩과 안 맞았다)
  // 🔴 2026-08-21: 0.25 // "300g 4개입 중 1개"였다. 고정 SKU 6003482는
  //    `woolworths french croissant large`로 **낱개 $3.60**이다(size "1ea", cup $3.60/1ea).
  //    한 개가 곧 판매 단위라 1인분은 팩 전체다 — 90c로 실리던 값이 실제로는 $3.60이었다.
  Croissant: 1.0,
  "Burger Bun": 0.167, "Bread Roll": 0.17, Roll: 0.167, "Sub Roll": 0.167,
  "Pita Bread": 0.20, Roti: 0.143, "Bao Buns": 0.25, Ciabatta: 0.25,
  Tortilla: 0.1, "Corn Tortilla": 0.1, Wrap: 0.15,
  "Muffin Splits": 0.20, Muffin: 0.125,

  // ── 과일 (kg/팩 단위 → 1개분) ────────────────────────────────
  Apple: 0.12, "Grated Apple": 0.12, Banana: 1.00, "Ripe Bananas": 0.40,
  Pear: 0.75, Orange: 0.75, Mandarin: 0.12, Kiwifruit: 0.15,
  Grapes: 0.15, Blueberries: 0.20, Strawberries: 0.20, Berries: 0.20,
  Rockmelon: 0.15, Watermelon: 0.05, Lemon: 0.10,
  Sultanas: 0.08, Dates: 0.10, "Dried Apricots": 0.10,

  // ── 채소 ────────────────────────────────────────────────────
  Carrot: 0.10, "Carrot Stick": 0.10, Celery: 0.10, Cucumber: 0.15,
  Capsicum: 0.25, Tomato: 0.50, "Cherry Tomatoes": 0.15,
  Lettuce: 0.08, "Cos Lettuce": 0.10, Rocket: 0.15, Cabbage: 0.30,
  Spinach: 0.10, Onion: 0.10, "Spring Onion": 0.10, Potato: 0.15,
  Broccoli: 0.15, Sweetcorn: 0.15, Corn: 0.05, Peas: 0.05,
  "Sugar Snap Peas": 0.20, Edamame: 0.15, "Mixed Vegetables": 0.10,
  Avocado: 0.50, Pickle: 0.05,

  // ── 육류·해산물·단백질 ───────────────────────────────────────
  Chicken: 0.20, "Chicken Breast": 0.20, "Cooked Chicken": 0.20,
  "Chicken Thigh": 0.20, "Chicken Skewers": 0.2, "Chicken/Tofu": 0.20,
  Ham: 0.12, "Ham/Bacon": 0.12, Turkey: 0.12, Salami: 0.10,
  "Roast Beef": 0.12, Beef: 0.20, "Beef Patty": 0.25, "Beef Mince": 0.15,
  Mince: 0.15, "Pork Mince": 0.15, "Pork Shoulder": 0.08,
  Meatballs: 0.20, Bacon: 0.12, "Sausage Meat": 0.20,
  "Cocktail Sausages": 0.220, "GF Sausages": 0.1,
  "Smoked Salmon": 0.20, Shrimp: 0.15,
  Tuna: 0.50, "Canned Tuna": 0.50, "Tuna/Chicken/Avocado": 0.30,
  Egg: 0.08, Eggs: 0.08, "Boiled Egg": 0.08, "Boiled Eggs": 0.17,
  "Egg (glaze)": 0.02,
  Tofu: 0.25, Paneer: 0.25, Falafel: 0.25,
  Chickpeas: 0.25, "Black Beans": 0.25, "Kidney Beans": 0.25,
  "Red Lentils": 0.10,

  // ── 유제품 (대용량 블록·통 → 1회분) ──────────────────────────
  // 🔴 500g 블록에서 슬라이스 2장(≈30g)이므로 0.06이다. 옛 값 0.04는 1kg을 가정한 것이었다.
  //    교차검증(2026-08-20): 같은 API가 주는 단위가가 $1.70/100g이니 30g = $0.51이고,
  //    0.06 × $8.49 = $0.51로 맞는다. 팩 크기 근거는 아래 `PORTION_BASIS`에 있다.
  Cheese: 0.06,
  // `data/priceIndex.json`이 "Cheese Block (500g)"으로 추적한다 — 같은 30g 기준.
  "Cheese Block": 0.06,
  "Cheese Stick": 0.10, "Cheese Sauce": 0.10,
  Mozzarella: 0.08, Feta: 0.10, "Feta Cheese": 0.10, Parmesan: 0.03,
  "Cream Cheese": 0.06, "Cottage Cheese": 0.12,
  Yoghurt: 0.12, // 1kg 통에서 1회분(≈120g)
  Milk: 0.05, "Plant Milk": 0.05, "Cream/Milk": 0.05, "Coconut Milk": 0.25,
  Butter: 0.03,

  // ── 곡물·건식 재료 ──────────────────────────────────────────
  Rice: 0.06, // 1kg 봉지에서 도시락 1회분(≈60g 건조)
  "Sushi Rice": 0.06, Quinoa: 0.10, Couscous: 0.10,
  Pasta: 0.12, Spaghetti: 0.12, Macaroni: 0.12, "Pasta spirals": 0.12,
  "GF Pasta": 0.12, Noodles: 0.20, "Rice Noodles": 0.20,
  Vermicelli: 0.20, "Vermicelli Noodles": 0.20,
  Flour: 0.08, "Gluten-Free Flour": 0.08, "Rolled Oats": 0.08,
  "Rolled Oats (GF)": 0.08, Muesli: 0.08,
  "Rice Bubbles": 0.08, Breadcrumbs: 0.05,
  "Desiccated Coconut": 0.05, Coconut: 0.05,
  Seaweed: 0.10, Nori: 0.10, "Rice Paper": 0.05,
  "Dumpling Wrappers": 0.15, Pastry: 0.25, "Puff Pastry": 0.25,
  "Pastry Cases": 0.2,

  // ── 포장 간식 (다개입 중 1회분) ──────────────────────────────
  Crackers: 0.15, "Wholegrain Crackers": 0.15, "GF Crackers": 0.15,
  "Rice Crackers": 0.20, "Rice Wheels": 0.20, Breadsticks: 0.20,
  Pretzels: 0.15, Popcorn: 0.15, "Veggie Straws": 0.20,
  "Corn Chips": 0.15, "Real Fruit Strip": 0.15, "Oat Cookie": 0.15,
  "Dark Chocolate": 0.10, "Probiotic Drink": 0.2, Croutons: 0.10,
  Olives: 0.08,

  // ── 스프레드·소스·향신료 (대용량 → 1회 사용량은 미미) ────────
  Butter_Spread: 0.03, Vegemite: 0.026, Jam: 0.03, Honey: 0.03,
  "Peanut Butter": 0.04, "Peanut Sauce": 0.04, "Golden Syrup": 0.03,
  Mayo: 0.03, Mayonnaise: 0.03, "Vegan Mayo": 0.03, Mustard: 0.02,
  Hummus: 0.15, Pesto: 0.15, "Pesto/Mayo": 0.05, "Dairy-Free Pesto": 0.05,
  Salsa: 0.10, "Tomato Sauce": 0.03, "Tomato Paste": 0.05,
  "Soy Sauce": 0.02, "Teriyaki Sauce": 0.03, "Hoisin Sauce": 0.03,
  "Mango Chutney": 0.05, "Curry Paste": 0.05, "Butter Chicken Sauce": 0.25,
  "Caesar Dressing": 0.05, "Lemon Dressing": 0.05,
  "Olive Oil": 0.02, Oil: 0.02, "Sesame Oil": 0.02, "Coconut Oil": 0.03,
  "Vegetable Stock": 0.05,

  // ── 베이킹·향신료 (한 통으로 수십 회) ────────────────────────
  Sugar: 0.03, "Baking Powder": 0.02, "Baking Soda": 0.02, Yeast: 0.05,
  Cocoa: 0.03, Cinnamon: 0.01, Cumin: 0.01, Ginger: 0.02,
  Spices: 0.01, "Curry Spices": 0.05, Herbs: 0.05, Basil: 0.10,
};

/**
 * PORTION_FACTORS가 **가정한 소매 팩 크기와 1인분 g수**.
 *
 * 🔴 왜 있나 (2026-08-20): `Cheese: 0.04`의 근거는 주석 한 줄("1kg 블록에서 슬라이스 2장")뿐이었고,
 *    그 1kg은 어디에도 확인된 적이 없었다. 실제 고정 SKU는 500g이었으므로 factor가 2배 틀렸고,
 *    **아무 테스트도 그걸 볼 수 없었다** — 주석은 검사 대상이 아니기 때문이다.
 *    그래서 가정을 구조화해서 적고, `lib/priceSearch.test.ts`가 `PINNED_SKUS`의 `size`와 대조한다:
 *      pack이 고정 SKU와 다르거나, factor × pack ≠ serve면 테스트가 깨진다.
 *
 * 🔴 **여기에 새 줄을 추가하려면 팩 크기를 실제로 확인할 것.** 확인 방법은 상품 API다:
 *      curl -H 'x-requested-with: OnlineShopping.WebApp' \
 *           https://www.woolworths.co.nz/api/v1/products/<sku>
 *    추측으로 채우면 지금 막으려는 바로 그 오류를 새로 만든다. 확인 안 된 재료는
 *    아래 `PORTION_BASIS_UNVERIFIED`에 사유와 함께 남긴다.
 */
export const PORTION_BASIS: Record<string, { pack: string; serve: string }> = {
  // ── 2026-09-07: 남은 재료를 전부 고정하며 팩 크기를 상품 API로 확인해 함께 적는다.
  //    🔴 serve는 factor에서 역산하지 않았다 — 역산하면 아래 대조 가드가 무조건
  //    통과해 알리바이가 된다. **도시락 1인분이 얼마인가**를 먼저 적었고,
  //    안 맞는 다섯 건은 factor를 고쳤다(Muffin·Cocktail Sausages·Burger Bun·Sub Roll·GF Sausages).
  Bacon: { pack: "250g", serve: "30g" },
  "Boiled Eggs": { pack: "12pack", serve: "2ea" },
  "Burger Bun": { pack: "6pack", serve: "1ea" },
  "Caesar Dressing": { pack: "300mL", serve: "12.5mL" }, // NZ 250mL
  Celery: { pack: "300g", serve: "30g" },
  "Cheese Block": { pack: "500g", serve: "30g" },
  "Cheese Stick": { pack: "160g", serve: "20g" }, // NZ 200g
  "Cocktail Sausages": { pack: "500g", serve: "40g" }, // NZ 9pack
  Coconut: { pack: "250g", serve: "12.5g" },
  "Coconut Milk": { pack: "400mL", serve: "100mL" },
  "Corn Chips": { pack: "300g", serve: "45g" },
  Couscous: { pack: "500g", serve: "50g" },
  Crackers: { pack: "125g", serve: "28g" }, // NZ 185g
  Croutons: { pack: "150g", serve: "12g" }, // NZ 120g
  "Curry Paste": { pack: "190g", serve: "11g" }, // NZ 220g
  "Dairy-Free Pesto": { pack: "190g", serve: "10g" }, // NZ 200g
  "Dark Chocolate": { pack: "100g", serve: "10g" },
  "Dried Apricots": { pack: "200g", serve: "20g" },
  Edamame: { pack: "1kg", serve: "68g" }, // NZ 454g
  Egg: { pack: "12pack", serve: "1ea" },
  Feta: { pack: "200g", serve: "20g" },
  "GF Crackers": { pack: "100g", serve: "15g" },
  "GF Pasta": { pack: "600g", serve: "42g" }, // NZ 350g
  Ginger: { pack: "230g", serve: "4.6g" },
  "Gluten-Free Bread": { pack: "440g", serve: "78g" }, // NZ 520g
  "Gluten-Free Flour": { pack: "750g", serve: "36g" }, // NZ 450g
  "Golden Syrup": { pack: "500g", serve: "16g" }, // NZ 540g
  "Lemon Dressing": { pack: "250mL", serve: "14mL" }, // NZ 280mL
  Mayo: { pack: "440g", serve: "12g" }, // NZ 405g
  Mince: { pack: "500g", serve: "75g" },
  "Mixed Vegetables": { pack: "1kg", serve: "100g" },
  Muffin: { pack: "8pack", serve: "1ea" },
  Mustard: { pack: "175g", serve: "3.4g" }, // NZ 170g
  Paneer: { pack: "200g", serve: "75g" }, // NZ 300g
  Parmesan: { pack: "250g", serve: "7.5g" },
  "Pasta spirals": { pack: "500g", serve: "60g" },
  Pastry: { pack: "6 sheets", serve: "1.5sheets" },
  "Peanut Sauce": { pack: "175g", serve: "8g" }, // NZ 200g
  "Pesto/Mayo": { pack: "190g", serve: "9.5g" },
  "Pita Bread": { pack: "5pack", serve: "2ea" }, // NZ 10pack
  "Plant Milk": { pack: "1L", serve: "50mL" },
  Popcorn: { pack: "80g", serve: "19.5g" }, // NZ 130g
  "Pork Mince": { pack: "500g", serve: "75g" },
  Potato: { pack: "per kg", serve: "150g" },
  Pretzels: { pack: "180g", serve: "27g" },
  "Puff Pastry": { pack: "6 sheets", serve: "1.5sheets" },
  "Real Fruit Strip": { pack: "120g", serve: "13.5g" }, // NZ 90g
  "Rice Crackers": { pack: "100g", serve: "20g" },
  "Rice Noodles": { pack: "375g", serve: "75g" },
  "Rice Paper": { pack: "150g", serve: "12.5g" }, // NZ 250g
  "Rice Wheels": { pack: "6pack", serve: "1ea" }, // NZ 126g
  "Roast Beef": { pack: "80g", serve: "12g" }, // NZ 100g
  "Rockmelon": { pack: "200g", serve: "30g" },
  "Sausage Meat": { pack: "500g", serve: "90g" }, // NZ 450g
  "Sub Roll": { pack: "6pack", serve: "1ea" },
  Sultanas: { pack: "375g", serve: "30g" },
  Sweetcorn: { pack: "1kg", serve: "112g" }, // NZ 750g
  "Teriyaki Sauce": { pack: "200g", serve: "6g" },
  Tofu: { pack: "450g", serve: "112g" },
  "Tomato Paste": { pack: "170g", serve: "8.5g" },
  "Tomato Sauce": { pack: "500mL", serve: "15mL" }, // NZ 565g
  Tuna: { pack: "95g", serve: "47.5g" },
  "Veggie Straws": { pack: "5pack", serve: "1ea" },
  "Wholegrain Crackers": { pack: "100g", serve: "15g" },
  Yeast: { pack: "280g", serve: "7.5g" }, // NZ 150g

  // ── 2026-09-06: 검색이 엉뚱한 상품을 집던 재료를 고정하면서, 팩 크기를 상품 API로
  //    확인해 함께 적는다. 🔴 serve는 factor에서 역산하지 않았다 — 그러면 아래 가드가
  //    무조건 통과해 알리바이가 된다. **도시락 1인분이 얼마인가**를 먼저 적고,
  //    factor가 안 맞으면 factor를 고쳤다(Bread Roll·Corn Tortilla 두 건).
  "Beef Patty": { pack: "400g", serve: "100g" },
  Berries: { pack: "500g", serve: "100g" },
  Blueberries: { pack: "500g", serve: "100g" },
  "Bread Roll": { pack: "6pack", serve: "1ea" },
  Breadcrumbs: { pack: "375g", serve: "15g" }, // NZ 300g
  "Cherry Tomatoes": { pack: "250g", serve: "27g" }, // NZ 180g
  "Chicken Breast": { pack: "650g", serve: "90g" }, // NZ 450g
  "Corn Tortilla": { pack: "10pack", serve: "1ea" },
  "Cream/Milk": { pack: "300mL", serve: "15mL" },
  "Dumpling Wrappers": { pack: "275g", serve: "45g" }, // NZ 300g
  Herbs: { pack: "12g", serve: "0.6g" },
  Kiwifruit: { pack: "8pack", serve: "1ea" }, // NZ 680g
  Nori: { pack: "25g", serve: "3g" }, // NZ 30g
  Oil: { pack: "750mL", serve: "15mL" },
  Onion: { pack: "per kg", serve: "100g" },
  Pickle: { pack: "490g", serve: "25g" }, // NZ 500g
  "Smoked Salmon": { pack: "100g", serve: "16g" }, // NZ 80g
  Spinach: { pack: "120g", serve: "12g" },
  Strawberries: { pack: "500g", serve: "100g" },
  // Watermelon: AU는 1/4통 낱개라 무게를 모른다 → PORTION_BASIS_UNVERIFIED
  "Butter Chicken Sauce": { pack: "500g", serve: "20g" }, // NZ 80g
  Cumin: { pack: "30g", serve: "0.3g" },
  Spaghetti: { pack: "500g", serve: "60g" },

  // 2026-08-20 Woolworths 상품 API로 확인(sku 434914, "500g", $8.49, $1.70/100g).
  Cheese: { pack: "500g", serve: "30g" },

  // ── 2026-08-20 전수 확인: 본문 표에 실리는 재료를 상품 API로 하나씩 조회했다.
  //    캐시가 집은 상품을 **가격으로 대조해** 특정하고(이름만으로는 250g/500g을 못 가른다),
  //    volumeSize를 읽어 factor가 함의하는 1인분 g수를 계산해 상식 범위를 확인했다.
  Vegemite: { pack: "380g", serve: "10g" },
  Jam: { pack: "375g", serve: "20g" }, // NZ 660g
  "Peanut Butter": { pack: "375g", serve: "15g" },
  Honey: { pack: "500g", serve: "15g" },
  "Cream Cheese": { pack: "250g", serve: "15g" },
  Hummus: { pack: "200g", serve: "30g" },
  Eggs: { pack: "12pack", serve: "1 egg" },
  Sugar: { pack: "2kg", serve: "45g" }, // NZ 1.5kg
  Pasta: { pack: "500g", serve: "60g" },
  // 🔴 팩이 바뀌었다 — 고정 전엔 가공 시리얼 500g이었고 지금은 rolled oats 750g이다.
  "Rolled Oats": { pack: "750g", serve: "60g" },
  Chickpeas: { pack: "400g", serve: "105g" }, // NZ 420g
  Salami: { pack: "80g", serve: "10g" }, // NZ 100g
  Milk: { pack: "1L", serve: "50ml" },
  Carrot: { pack: "per kg", serve: "100g" },
  Yoghurt: { pack: "1kg", serve: "120g" },
  Grapes: { pack: "900g", serve: "75g" }, // NZ 500g
  Bagel: { pack: "4pack", serve: "1 bagel" },

  // 상품을 새로 고정하면서 근거를 같이 등록한 셋 (아래 PINNED_SKUS 주석 참조)
  Rice: { pack: "1kg", serve: "60g" },
  "Black Beans": { pack: "400g", serve: "100g" },
  Butter: { pack: "500g", serve: "15g" },
  // ── 2026-08-21: 남아 있던 미확인 12건을 상품 API로 전수 대조했다.
  //    10건은 기록된 size가 실제와 같았고, 둘이 어긋났다(크루아상 factor·시나몬 팩 크기).
  Breadsticks: { pack: "125g", serve: "20g" }, // NZ 2pack
  "Rice Bubbles": { pack: "365g", serve: "37g" }, // NZ 460g
  Macaroni: { pack: "500g", serve: "60g" },
  Meatballs: { pack: "400g", serve: "80g" },
  Cocoa: { pack: "250g", serve: "8g" },
  Falafel: { pack: "200g", serve: "75g" }, // NZ 300g
  "Red Lentils": { pack: "375g", serve: "39g" }, // NZ 390g
  Croissant: { pack: "4pack", serve: "1 croissant" }, // NZ each
  // API가 volumeSize를 안 준다(packageType "bunch", $2.50/1ea). 다발 하나가 판매 단위다.
  "Spring Onion": { pack: "each", serve: "0.1 bunch" },
  "Desiccated Coconut": { pack: "250g", serve: "12g" },
  Cinnamon: { pack: "32g", serve: "0.3g" },
  "Beef Mince": { pack: "500g", serve: "75g" },

  // ── 2026-08-23: 레시피 원가를 파생값으로 되살리려고 마지막 남은 팩 크기를 확인했다.
  //    (스낵 가이드에서 "약 $0.15/개"를 지운 이유가 이 셋이 비어 있어서였다.)
  /* ── 2026-08-23 3차: 크론 churn 때문에 고정한 31건의 팩 크기를 상품 API로 확인했다.
   *    `Cucumber`·`Lettuce`는 `volumeSize`가 비어 있고 `cupPrice`가 `/1ea`라 **낱개 판매**다.
   *    `Chicken`은 "min order 1.65kg"이라 파서가 못 읽는다 — 가격이 kg당이므로 "per kg"로 적는다.
   *
   *    🔴 개수 팩 넷은 factor가 **낱개를 안 가리키고 있었다** — Roti 1.4장, Tortilla 1.8장,
   *       Roll 1.2개, Probiotic Drink 0.85병. 낱개로 맞췄다.
   *    🔴 Pesto는 100g의 5%(=5g)였다. 파니니 한 번 바르는 양도 안 된다 — 1큰술(15g)로.
   */
  Pesto: { pack: "190g", serve: "15g" }, // NZ 100g
  Spices: { pack: "30g", serve: "0.3g" },
  Noodles: { pack: "440g", serve: "80g" }, // NZ 400g
  Roti: { pack: "8pack", serve: "1 roti" }, // NZ 7pack
  Rocket: { pack: "60g", serve: "6.75g" }, // NZ 45g
  Quinoa: { pack: "500g", serve: "50g" },
  Cucumber: { pack: "each", serve: "0.15 cucumber" },
  Salsa: { pack: "312g", serve: "31.2g" },
  Lettuce: { pack: "each", serve: "0.08 lettuce" },
  Ham: { pack: "200g", serve: "24g" },
  Peas: { pack: "1kg", serve: "50g" },
  "Egg (glaze)": { pack: "12pack", serve: "0.2 egg" }, // NZ 10pack
  Tortilla: { pack: "8pack", serve: "1 wrap" }, // NZ 10pack
  "Chicken Thigh": { pack: "550g", serve: "90g" }, // NZ 450g
  Mozzarella: { pack: "125g", serve: "10g" },
  Roll: { pack: "6pack", serve: "1 roll" },
  "Canned Tuna": { pack: "95g", serve: "47.5g" },
  Tomato: { pack: "each", serve: "0.5ea" }, // NZ 600g
  Chicken: { pack: "per kg", serve: "200g" },
  "Cheese Sauce": { pack: "29g", serve: "3g" }, // NZ 30g
  "Soy Sauce": { pack: "500mL", serve: "10ml" },
  Olives: { pack: "280g", serve: "22.4g" },
  Dates: { pack: "500g", serve: "40g" }, // NZ 400g
  Bread: { pack: "700g", serve: "70g" },
  "Vegetable Stock": { pack: "1L", serve: "50ml" },
  "Cooked Chicken": { pack: "200g", serve: "50g" }, // NZ 250g
  "Olive Oil": { pack: "1L", serve: "20ml" },
  Lemon: { pack: "500g", serve: "100g" }, // NZ 1kg
  "Boiled Egg": { pack: "12pack", serve: "1 egg" },
  Mayonnaise: { pack: "440g", serve: "12g" }, // NZ 340mL
  "Probiotic Drink": { pack: "5pack", serve: "1 bottle" },

  // ── 2026-08-23 2차: 상품명 전수 대조에서 **다른 음식**이 잡혀 있던 15건.
  //    고정하면서 팩 크기도 같이 확인해 여기 넣는다.
  Muesli: { pack: "750g", serve: "52g" }, // NZ 650g
  "Pork Shoulder": { pack: "per kg", serve: "80g" },
  "Mango Chutney": { pack: "250g", serve: "17g" }, // NZ 340g
  "Sesame Oil": { pack: "150mL", serve: "4.14ml" }, // NZ 207mL
  "Vegan Mayo": { pack: "270mL", serve: "10.2ml" }, // NZ 340mL
  "Chicken Skewers": { pack: "6pack", serve: "1 skewer" }, // NZ 5pack
  "Curry Spices": { pack: "50g", serve: "2g" }, // NZ 40g
  "Sugar Snap Peas": { pack: "150g", serve: "20g" }, // NZ 100g
  "Ripe Bananas": { pack: "5pack", serve: "2ea" }, // NZ per kg 250g — AU는 작은 바나나 5개 봉지에서 2개
  "Cottage Cheese": { pack: "250g", serve: "30g" },
  "Hoisin Sauce": { pack: "300mL", serve: "9.6ml" }, // NZ 320mL
  "Sushi Rice": { pack: "1kg", serve: "60g" },
  "Kidney Beans": { pack: "420g", serve: "105g" },
  "Vermicelli Noodles": { pack: "200g", serve: "50g" }, // NZ 250g
  "Oat Cookie": { pack: "350g", serve: "46.5g" }, // NZ 310g
  "Bao Buns": { pack: "16pack", serve: "2 buns" }, // NZ 8pack
  "Pastry Cases": { pack: "5pack", serve: "1 sheet" },

  Flour: { pack: "2kg", serve: "120g" }, // NZ 1.5kg
  Banana: { pack: "each", serve: "1ea" }, // NZ per kg
  "Coconut Oil": { pack: "300g", serve: "9g" },
  "Baking Powder": { pack: "300g", serve: "8g" }, // NZ 400g
  "Baking Soda": { pack: "500g", serve: "3.7g" }, // NZ 185g
  Corn: { pack: "420g", serve: "21g" },

  // 메뉴에는 없고 가이드 레시피에만 쓰는 재료 (RECIPE_ONLY_INGREDIENTS).
  // serve는 레시피 원가에 쓰이지 않지만(그램으로 센다) 비워 두면 규칙이 갈라진다.
  "Plain Flour": { pack: "2kg", serve: "120g" }, // NZ 1.5kg
  Tahini: { pack: "375g", serve: "15g" },
  Courgette: { pack: "per kg", serve: "100g" },
  "Vanilla Essence": { pack: "100mL", serve: "5ml" },
  // 2026-08-24 Woolworths 상품 API로 확인(sku 292795, "1kg", $6.80, $6.80/1kg).
  //   factor 0.12 × 1kg = 120g ≈ 귤 1~2개. 도시락 한 통 분량으로 맞다.
  //   🔴 이 재료는 고정이 없어서 크론이 **오렌지주스**($6.49)를 집고 있었다.
  Mandarin: { pack: "1kg", serve: "120g" },

  /* ── 2026-10-30 Aussie: Woolworths AU 고정 SKU의 `PackageSize`로 확인했다(검색 응답에 그대로 있다).
   *    NZ에선 상품 API가 volumeSize를 안 줘 미확인이던 낱개 품목도 AU는 「each」·「4 pack」으로 준다.
   *    serve는 Kiwi factor가 뜻하던 양(사과 120g·아보카도 반 개 등)을 그대로 옮겼다 — 도시락 1인분은 나라가 바뀌어도 같다.
   *    🔴 Cabbage는 **1/4통** 상품이라 0.3개 = 통배추 약 1/13이다(Kiwi 0.08통과 같은 양). */
  Apple: { pack: "1kg", serve: "120g" },
  "Grated Apple": { pack: "1kg", serve: "120g" },
  Beef: { pack: "500g", serve: "100g" },
  "Chicken/Tofu": { pack: "650g", serve: "90g" },
  Turkey: { pack: "160g", serve: "20g" },
  Avocado: { pack: "each", serve: "0.5ea" },
  Basil: { pack: "each", serve: "0.1ea" },
  Broccoli: { pack: "each", serve: "0.15ea" },
  Cabbage: { pack: "each", serve: "0.3ea" },
  Capsicum: { pack: "each", serve: "0.25ea" },
  Orange: { pack: "each", serve: "0.75ea" },
  Pear: { pack: "each", serve: "0.75ea" },
  Ciabatta: { pack: "4pack", serve: "1ea" },
  "Cos Lettuce": { pack: "2pack", serve: "0.2ea" },
};

/**
 * 고정 SKU가 있는데 팩 크기를 **아직 확인하지 않은** 재료.
 *
 * 🔴 이 목록은 "괜찮다"는 뜻이 아니라 **"치즈와 같은 2배 오류가 있을 수 있다"**는 뜻이다.
 *    한 줄씩 상품 API로 확인해 `PORTION_BASIS`로 옮길 것. 비워 두지 말고 줄여 나갈 것.
 */
export const PORTION_BASIS_UNVERIFIED: readonly string[] = [
  // ── 2026-10-30 Aussie: Kiwi의 낱개 품목 13개는 AU `PackageSize`로 확인해 PORTION_BASIS로 옮겼다.
  "Watermelon", // 1/4통 낱개(each) — 통마다 무게가 달라 100g이 몇 분의 몇인지 모른다

];

/**
 * PORTION_FACTORS에 없는 재료의 기본값.
 * 이전 값 0.20(한 팩의 20%)은 대부분의 소매 팩에서 과대계상이었다.
 * 표 커버리지를 올린 뒤에도 누락은 생기므로, 보수적으로 낮춰 잡는다.
 */
export const DEFAULT_PORTION = 0.10;

/* ────────────────────────────────────────────────────────────────────────────
 * 🔴 2026-09-09 재점검 — 저장된 factor가 **중간 계산에서 이미 반올림된 값**이었다.
 *
 *    달걀 한 개는 12팩의 1/12 = 0.08333인데 표에는 `0.08`로 적혀 있었다(4% 낮다).
 *    반올림은 **마지막 표시에서만** 해야 한다. 174개 중 15개가 0.5% 넘게,
 *    8개가 2% 넘게 어긋나 있었다(달걀·삶은 달걀·빵롤·코코아·시나몬 등).
 *
 *    `PORTION_BASIS`가 「1인분 / 팩」을 정확히 말하는 재료는 그 비율을 **여기서 다시
 *    계산해 덮어쓴다.** 호출부는 그대로 `PORTION_FACTORS`를 쓰면 되고, 근거가 없는
 *    재료(개당 판매 등)는 손대지 않는다.
 *
 *    🔴 손으로 적은 값을 지우지 않는다 — 덮어쓰는 건 **근거가 있는 것만**이다.
 *       근거가 없는데 그럴듯한 비율을 만들면 그게 곧 지어낸 값이다.
 * ──────────────────────────────────────────────────────────────────────────── */

/** "1.5kg" → 1500 · "12pack" → 12 · "per kg" → 1000 · "each" → null */
function packUnits(pack: string): number | null {
  const v = pack.trim().toLowerCase();
  if (/^per\s*kg$/.test(v)) return 1000;
  if (/^(each|ea|1ea)$/.test(v)) return null;
  const count = /^(\d+)\s*pack$/.exec(v);
  if (count) return Number(count[1]);
  const m = /^(\d+(?:\.\d+)?)\s*(kg|g|ml|l)$/.exec(v);
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] === "kg" || m[2] === "l" ? n * 1000 : n;
}

/** "30g" → 30 · "2ea" → 2 · "1 egg" → 1 · "12.5mL" → 12.5 */
function serveUnits(serve: string): number | null {
  const m = /^(\d+(?:\.\d+)?)/.exec(serve.trim());
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return /\bkg\b|\bl\b/i.test(serve) ? n * 1000 : n;
}

for (const [key, basis] of Object.entries(PORTION_BASIS)) {
  const pack = packUnits(basis.pack);
  const serve = serveUnits(basis.serve);
  if (pack === null || serve === null || !(pack > 0)) continue;
  const exact = serve / pack;
  // 근거에서 나온 비율이 1을 넘으면 표기가 어긋난 것이다 — 덮어쓰지 않고 남긴다.
  if (exact > 0 && exact <= 1) PORTION_FACTORS[key] = exact;
}

/**
 * 재료 하나가 도시락 한 개에서 쓰는 팩의 비율 — **나이대 배율까지** 곱한 값 (2026-10-12).
 *
 * 🔴 원가·장보기·레시피 창이 모두 이 함수로 몫을 낸다. 한 자리라도 `PORTION_FACTORS`를
 *    직접 곱하면 상단 합계와 장보기 합계가 나이대마다 갈라진다(`shoppingListTotal.test.ts`).
 *    standard의 배율은 정확히 1이라 `x * 1 === x` — 기존 값이 비트 단위로 그대로다.
 */
export function portionFor(ingredient: string, portions: Portions = DEFAULT_PORTION_BAND): number {
  return (PORTION_FACTORS[ingredient] ?? DEFAULT_PORTION) * portionsFactor(portions);
}
