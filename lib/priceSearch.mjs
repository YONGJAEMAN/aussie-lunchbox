/**
 * 재료명 → Woolworths 상품 선별 규칙.
 *
 * 배경 (2026-07-28):
 * 기존에는 검색 결과의 `items[0]`을 무조건 집었다. 검색 랭킹 상단에 프리미엄/특수
 * 상품이 오는 경우가 많아 대표성이 없는 값이 캐시에 들어갔다.
 *   Bread     → "la famiglia garlic bread" $6.40   (마늘빵)
 *   Croissant → "paneton ready to bake ..." $11.99 (생지)
 *   Soy Sauce → "abc sweet soy sauce kecap manis"  (단간장)
 *   Curry Paste → "in a hurry meal sauce kiwi curry" (페이스트 아님)
 *
 * 규칙:
 *   1) SEARCH_TERMS로 모호한 재료명을 구체적 검색어로 치환
 *   2) AVOID_TOKENS가 이름에 있으면 후보에서 제외 (생지·특수식이·비식품 등)
 *   3) REQUIRE_TOKENS(없으면 재료명에서 유도)를 이름에 포함해야 후보로 인정
 *   4) 남은 후보 중 **가격 중앙값** 상품을 선택
 *      — 최저가는 소용량, 최고가는 프리미엄으로 치우친다. 우리가 원하는 것은
 *        "보통 가정이 사는 값"이므로 중앙값이 가장 방어 가능하다.
 *
 * 이 모듈은 scripts/update_prices.mjs(캐시 생성)와 lib/supermarketApi.ts(런타임
 * 폴백) 양쪽에서 쓰인다. 규칙이 갈라지면 캐시와 실시간 값이 어긋나므로 한 곳에 둔다.
 */

// Woolworths Australia 검색 API. 🔴 상품 상세(`/apis/ui/product/detail/{sku}`)는 이 Mac에서 20초 넘게 응답이 없다(2026-10-30) —
// 대신 **검색어에 Stockcode를 넣으면 그 상품 하나만** 돌아오고, 알레르겐(`AdditionalAttributes`)도 검색 응답에 있다.
export const SEARCH_BASE = "https://www.woolworths.com.au/apis/ui/Search/products";

/** 검색어를 바꿔야 엉뚱한 상품이 안 잡히는 재료들 */
export const SEARCH_TERMS = {
  Bread: "sandwich bread",
  "Gluten-Free Bread": "gluten free bread loaf",
  Croissant: "croissants",
  Pastry: "puff pastry",
  "Puff Pastry": "puff pastry",
  "Pastry Cases": "pastry cases",
  "Soy Sauce": "soy sauce",
  "Curry Paste": "curry paste",
  "Curry Spices": "curry powder",
  Cheese: "cheese block tasty",
  "Cheese Block": "cheese block tasty",
  Oil: "canola oil",
  "Olive Oil": "olive oil",
  Milk: "milk blue standard",
  "Plant Milk": "oat milk",
  Ham: "shaved ham",
  Chicken: "chicken breast skinless",
  "Cooked Chicken": "cooked chicken",
  Rice: "long grain rice",
  Flour: "plain flour",
  Sugar: "white sugar",
  Butter: "butter block",
  Yoghurt: "greek yoghurt tub",
  Eggs: "eggs size 7",
  Egg: "eggs size 7",
  Crackers: "water crackers",
  Tomato: "tomatoes loose",
  Lettuce: "lettuce iceberg",
  Potato: "potatoes washed",
  Onion: "brown onions",
  Apple: "apples royal gala",
  Spices: "mixed spice",
  Herbs: "mixed herbs dried",
  "Spring Onion": "spring onion fresh", // ← "onions brown"(양파)이 잡혔다
  "Desiccated Coconut": "coconut desiccated", // ← "essentials coconut milk"가 잡혔다
  Cinnamon: "cinnamon ground", // ← "sticky cinnamon brioche"(빵)가 잡혔다
  // 재료명 그대로 검색해 후보 0이었다(괄호가 그대로 나간다). 견과류는 AVOID가 막는다.
  "Muesli": "muesli toasted",

  // ── 검수 파일(price_cache_review.txt)에서 오매칭이 확인돼 추가한 것들 ──
  // 아래는 전부 "사람이 목록을 훑어야만" 드러났다. 합계만 보면 안 보인다.
  Banana: "bananas loose", // ← "banana bread caramel swirl"
  Cucumber: "cucumber telegraph", // ← 하기스 물티슈(!)
  Mandarin: "mandarins fresh", // ← 스포츠음료
  Grapes: "grapes fresh", // ← 포도맛 과자
  Carrot: "carrots loose fresh", // ← 냉동 혼합채소
  Celery: "celery fresh", // ← 셀러리+후무스 스낵팟
  "Chicken Skewers": "chicken skewers", // ← 새우꼬치
  "Pork Shoulder": "pork shoulder roast",
  Croutons: "croutons", // ← 컵스프
  "Corn Tortilla": "corn tortillas soft", // ← 토르티야칩
  "GF Sausages": "gluten free sausages", // ← 일반 소시지
  "GF Pasta": "gluten free pasta", // ← 일반 파스타
  "Gluten-Free Flour": "gluten free flour", // ← 통밀가루
  "Kidney Beans": "red kidney beans", // ← 카넬리니콩
  "Cocktail Sausages": "cocktail sausages",
  "Oat Cookie": "oat biscuits",
  Noodles: "egg noodles dry",
  "Cherry Tomatoes": "cherry tomatoes",
  Lemon: "lemons fresh",
  Kiwifruit: "kiwifruit green",
  Broccoli: "broccoli fresh",
  Capsicum: "capsicum red fresh",
  Cabbage: "cabbage green",

  // ── 2차 검수 반영 ──
  "Golden Syrup": "chelsea golden syrup", // ← "maple syrup flavoured"
  Macaroni: "macaroni elbow dried pasta", // ← 마카로니치즈 간편식
  Coconut: "coconut desiccated shredded", // ← 코코넛밀크·코코넛크림
  "Dried Apricots": "dried apricots pack", // ← 시럽 통조림
  Breadsticks: "grissini breadsticks", // ← 누텔라앤고. 현재는 매칭 실패로 폴백
  Meatballs: "beef meatballs fresh", // ← 스파게티미트볼 통조림·소스 베이스
  "Rice Bubbles": "rice bubbles cereal", // ← 매칭 실패(폴백)
  "Cheese Sauce": "cheese sauce jar", // ← 소스 믹스 분말
  Cocoa: "cocoa powder baking", // ← 베이킹파우더 제품
  Mozzarella: "mozzarella grated cheese", // ← 부팔로 모짜렐라(프리미엄)
  Falafel: "falafel balls", // ← 팔라펠 믹스(분말). "balls"라야 완제품이 잡힘
  "Corn Chips": "corn chips plain", // ← 살사맛 통합상품
  Chickpeas: "chickpeas can 400g", // ← 비네그레트 스낵팟

  // ── 검색으로 해결되지 않는 항목 (2026-07-29 확인) ──
  // 아래는 여러 검색어를 시도해도 대표 상품이 잡히지 않는다. Woolworths 온라인이
  // 해당 품목을 그 이름으로 취급하지 않거나, 검색 랭킹이 가공식품을 우선한다.
  // 전부 사용 빈도 1~2회의 부재료라 총비용 영향은 작다. 억지 검색어로 엉뚱한
  // 상품을 끌어오느니 폴백가를 쓰는 편이 낫다고 판단해 그대로 둔다.
  //   Breadsticks   → grissini/bread sticks 모두 크래커가 잡힘
  //   Rice Bubbles  → LCM 시리얼바가 잡힘 (원물 시리얼이 상단에 없음)
  //   Macaroni      → 마카로니치즈 간편식이 계속 상단
  //   Meatballs     → 소스 베이스 또는 $13 대용량
  //   Cocoa         → 베이킹파우더 제품이 상단
  //   Cheese Sauce  → 소스 믹스(분말)만 잡힘
};

/**
 * 이름에 포함되면 후보에서 제외.
 * ⚠️ 보수적으로 유지할 것. "leg"·"whole"·"roast" 같은 일반 단어를 넣었더니
 * Roast Beef가 소시지로 잡히는 등 **새로운 오매칭**이 생겼다. 규격 차이로 인한
 * 이상치는 토큰 금지가 아니라 아래 가격 절삭(TRIM_RATIO)으로 거른다.
 */
export const AVOID_TOKENS = [
  "ready to bake", // 생지 (크루아상·페이스트리가 프리미엄으로 잡히던 원인)
  "kecap manis", // 단간장
  "sauce kit",
  "meal sauce",
  "frozen meal", // 냉동간편식이 육류로 잡히는 경우
  "gluten free", // 대표가가 아님 (해당 재료는 별도 키로 관리)
  "kitkat",
  "wagyu",
  "infant",
  "baby food",
  "pet ",
  "dog ",
  "cat ",
  "gift",
  "hamper",
  "platter",
  "catering",
  // ── 비식품 / 다른 카테고리 (검수 파일에서 발견) ──
  "wipes", // Cucumber → 하기스 물티슈
  "shampoo",
  "body wash",
  "candle",
  "air freshener",
  // ── 재료가 아니라 완제품/가공식품으로 잡히는 경우 ──
  "in syrup", // Dried Apricots·Mandarin → 시럽 통조림
  "cup a soup", // Croutons
  "easy mac", // Macaroni
  "nutella", // Breadsticks
  "mints", // Grapes → 포도맛 사탕
  "sherbert",
  "sports drink",
  "flavoured syrup",
  "maple flavoured", // Golden Syrup
  "spaghetti with", // Meatballs → 스파게티미트볼 통조림
  "pasta meal",
  "snack pot",
  // ── 2026-08-06: 넛프리 사이트인데 견과류 제품이 잡히고 있었다 ──
  // Croissant 검색 결과에 "french croissant chocolate hazelnut"과
  // "yarrows croissants almond"가 있고, 중앙값 선택이 언제든 이쪽으로 넘어간다.
  // ⚠️ 맨 "nut"는 넣지 않는다 — Coconut·Peanut Butter가 같이 죽는다. 구체 토큰만 쓴다.
  "hazelnut",
  "almond",
  "cashew",
  "walnut",
  "pecan",
  "macadamia",
  "pistachio",
  "mixed nuts",
  "with nuts",
  "fruit & nut",
  // ── 재료가 아니라 그 재료로 만든 완제품 ──
  "brioche", // Cinnamon → "sticky cinnamon brioche"
  "chocolate", // Croissant → "mini croissants chocolate" (Dark Chocolate 재료는 아래에서 예외)
  "kitkat filled",
];

/**
 * AVOID_TOKENS는 전역이라 **재료명 자체와 충돌할 수 있다.**
 * 예) "chocolate"를 넣으면 `Dark Chocolate` 재료가 후보 0이 된다.
 * 재료명·검색어에 그 토큰이 들어 있으면 그 재료에 한해 무시한다.
 * (Aussie에서 "muffin"을 넣었다가 Muffin 재료를 죽인 뒤 도입한 규칙이다.)
 */
export function avoidTokensFor(ingredient) {
  const self = `${ingredient} ${SEARCH_TERMS[ingredient] ?? ""}`.toLowerCase();
  return AVOID_TOKENS.filter((t) => !self.includes(t.trim()));
}

/**
 * 후보 중 최저가의 몇 배까지를 "같은 규격"으로 볼지.
 * 예) shaved ham $4대와 ham leg(통다리) $18.90은 같은 물건이 아니다.
 */
export const TRIM_RATIO = 2.5;

/** 재료명만으로 유도하기 어려운 필수 토큰 */
export const REQUIRE_TOKENS = {
  "Curry Paste": ["curry"],
  "Soy Sauce": ["soy sauce"],
  Bread: ["bread"],
  Croissant: ["croissant"],
  Pastry: ["pastry"],
  Cheese: ["cheese"],
  "Cheese Block": ["cheese"],
  Yoghurt: ["yoghurt"],
  Eggs: ["eggs"],
  Egg: ["eggs"],
};

/** 재료명에서 필수 토큰을 유도한다 (복수형 s 제거, 괄호·슬래시 앞부분만) */
export function deriveTokens(ingredient) {
  if (REQUIRE_TOKENS[ingredient]) return REQUIRE_TOKENS[ingredient];
  const base = ingredient.split("/")[0].split("(")[0].trim().toLowerCase();
  const last = base.split(" ").pop() ?? base;
  return [last.endsWith("s") && last.length > 3 ? last.slice(0, -1) : last];
}

export function searchTermFor(ingredient) {
  return SEARCH_TERMS[ingredient] ?? ingredient;
}

/**
 * 재료 → Woolworths Australia 고정 SKU (2026-10-30, 194개).
 *
 * Kiwi(NZ)는 검색 중앙값이 매주 다른 브랜드를 집어 본문 수치가 어긋나서 결국 전 재료를 고정했다
 * (2026-07-30~09-07). Aussie는 처음부터 고정한다 — 🔴 자동 선택을 한 번 돌려 보니 마켓플레이스 상품이
 * 섞여 Baking Soda 자리에 치약, Boiled Egg에 달걀틀, Sausage Meat에 고기 분쇄기, Meatballs에 개 사료를 집었다.
 *
 * 고른 방법: 재료마다 AU 검색 후보(`IsMarketProduct` 제외)를 사람이 보고, Kiwi가 고정한 상품과
 * **같은 품목·가까운 규격**을 골랐다. 자체 브랜드가 있으면 자체 브랜드(Kiwi도 그랬다).
 *   - 델리 kg당 상품(Ham·Salami·Roast Beef·Turkey)은 피하고 포장 상품을 골랐다 — kg당 값이 팩 가격 자리에 들어가면 원가가 틀린다.
 *   - 호주는 바나나·토마토·오렌지 등을 **개당**으로 판다 → `size: "each"`. 그 재료의 1인분은 `PORTION_BASIS`가 개수로 적는다.
 * `size`는 검색 응답의 `PackageSize`를 옮긴 것이다(`lib/priceSearch.test.ts`가 `PORTION_BASIS.pack`과 대조한다).
 * 상품이 바뀌면 `scripts/update_prices.mjs`가 이름 변경을 경고한다.
 *
 * 고정하지 않은 것: 복합 이름(`Ham/Bacon`·`Tuna/Chicken/Avocado`)과 `GF Sausages`(AU 검색에 글루텐프리 소시지가 없다).
 */
export const PINNED_SKUS = {
  Apple: { sku: "314012", name: "Woolworths Royal Gala Apple Punnet", size: "1kg" },
  Avocado: { sku: "120080", name: "Hass Avocado", size: "each" },
  Bacon: { sku: "266794", name: "Woolworths Middle Bacon Middle Cut Rashers", size: "250g" },
  Bagel: { sku: "270580", name: "Abe's Bagels The Natural Bagels", size: "4pack" },
  "Baking Powder": { sku: "574616", name: "McKenzie's Baking Powder", size: "300g" },
  "Baking Soda": { sku: "251189", name: "Woolworths Essentials Bicarbonate Soda", size: "500g" },
  Banana: { sku: "133211", name: "Cavendish Bananas", size: "each", why: "AU 바나나는 개당 가격만 나온다(kg당 없음)" },
  "Bao Buns": { sku: "277300", name: "Mr Chen's Bao Buns", size: "16pack" },
  Basil: { sku: "133621", name: "Woolworths Green Basil Bunch", size: "each" },
  Beef: { sku: "6044171", name: "Woolworths Lean Beef Strips", size: "500g" },
  "Beef Mince": { sku: "577863", name: "Woolworths Beef Mince", size: "500g" },
  "Beef Patty": { sku: "899860", name: "Woolworths 8 Pack Slider Beef Burgers", size: "400g" },
  Berries: { sku: "260010", name: "Woolworths Frozen Mixed Berries", size: "500g" },
  "Black Beans": { sku: "930176", name: "Edgell Black Beans Plant Protein", size: "400g" },
  Blueberries: { sku: "260007", name: "Woolworths Frozen Blueberries", size: "500g" },
  "Boiled Egg": { sku: "165367", name: "Woolworths 12 Pack Extra Large Cage Free Eggs", size: "12pack" },
  "Boiled Eggs": { sku: "165367", name: "Woolworths 12 Pack Extra Large Cage Free Eggs", size: "12pack" },
  Bread: { sku: "713816", name: "Tip Top The One White Sandwich Slice Bread Loaf Bakery", size: "700g" },
  "Bread Roll": { sku: "130502", name: "Woolworths Soft Round Rolls Extra Soft Lunch", size: "6pack", why: "Soft Round Rolls(baps 대응)" },
  Breadcrumbs: { sku: "36440", name: "Krummies Breadcrumbs", size: "375g" },
  Breadsticks: { sku: "84864", name: "Vita Vigor Grissini Bread Sticks Grissini Bread Sticks", size: "125g" },
  Broccoli: { sku: "134681", name: "Fresh Broccoli", size: "each" },
  "Burger Bun": { sku: "6016711", name: "Woolworths Hamburger Buns", size: "6pack" },
  Butter: { sku: "48650", name: "Woolworths Salted Butter", size: "500g" },
  "Butter Chicken Sauce": { sku: "157531", name: "Woolworths Butter Chicken Simmer Sauce", size: "500g", why: "AU엔 80g 파스타 사셰가 없어 조리 소스" },
  Cabbage: { sku: "134968", name: "Woolworths Green Cabbage Quarter", size: "each", why: "1/4통" },
  "Caesar Dressing": { sku: "296531", name: "Woolworths Caesar Salad Dressing", size: "300mL" },
  "Canned Tuna": { sku: "827211", name: "Woolworths Lemon & Pepper Tuna", size: "95g" },
  Capsicum: { sku: "135306", name: "Red Capsicum", size: "each" },
  Carrot: { sku: "135369", name: "Woolworths Australian Grown Carrots", size: "per kg", why: "1kg 봉지의 kg당 값" },
  Celery: { sku: "745467", name: "Woolworths Celery Sticks Punnet", size: "300g" },
  Cheese: { sku: "310237", name: "Woolworths Tasty Cheese Block", size: "500g" },
  "Cheese Block": { sku: "310237", name: "Woolworths Tasty Cheese Block", size: "500g" },
  "Cheese Sauce": { sku: "757571", name: "Gravox Cheese Sauce Mix CHEESE", size: "29g" },
  "Cheese Stick": { sku: "453303", name: "Woolworths Natural Cheese Sticks", size: "160g" },
  "Cherry Tomatoes": { sku: "149620", name: "Woolworths Cherry Tomatoes Punnet", size: "250g" },
  Chicken: { sku: "969723", name: "Woolworths RSPCA Approved Chicken Breast Fillet", size: "per kg", why: "kg당 값" },
  "Chicken Breast": { sku: "6078623", name: "Woolworths RSPCA Approved Chicken Breast Fillets", size: "650g" },
  "Chicken Skewers": { sku: "908166", name: "Woolworths 6 Pack Honey Soy Chicken Kebabs", size: "6pack" },
  "Chicken Thigh": { sku: "6078692", name: "Woolworths RSPCA Approved Chicken Thigh Fillets", size: "550g" },
  "Chicken/Tofu": { sku: "6078623", name: "Woolworths RSPCA Approved Chicken Breast Fillets", size: "650g" },
  Chickpeas: { sku: "227107", name: "Edgell Australian Grown Chickpeas", size: "400g" },
  Ciabatta: { sku: "125496", name: "Woolworths Plain Ciabatta Rolls", size: "4pack" },
  Cinnamon: { sku: "251000", name: "Woolworths Cinnamon Ground", size: "32g" },
  "Cocktail Sausages": { sku: "391575", name: "Primo Hot Dog Cocktail Frankfurts", size: "500g" },
  Cocoa: { sku: "267413", name: "Cadbury Baking Bournville Cocoa Powder", size: "250g" },
  Coconut: { sku: "172405", name: "Woolworths Shredded Coconut", size: "250g" },
  "Coconut Milk": { sku: "168", name: "TCC Coconut Milk", size: "400mL" },
  "Coconut Oil": { sku: "751353", name: "Macro Organic Virgin Coconut Oil", size: "300g" },
  "Cooked Chicken": { sku: "904897", name: "Mt Barker Free Range Roasted Shredded Chicken", size: "200g" },
  Corn: { sku: "34437", name: "Edgell Corn Kernels", size: "420g" },
  "Corn Chips": { sku: "6058084", name: "Old El Paso Nachips Tortilla Nacho Corn Chips Original", size: "300g" },
  "Corn Tortilla": { sku: "169871", name: "Old El Paso Street Market White Corn Tortilla Taco Wraps", size: "10pack" },
  "Cos Lettuce": { sku: "141496", name: "Woolworths Cos Hearts Lettuce", size: "2pack" },
  "Cottage Cheese": { sku: "757097", name: "Brancourts Cottage Cheese Classic", size: "250g" },
  Courgette: { sku: "825869", name: "The Odd Bunch Zucchini Prepacked", size: "per kg", why: "주키니 750g 팩의 kg당 값" },
  Couscous: { sku: "720060", name: "Woolworths Cous Cous", size: "500g" },
  Crackers: { sku: "140784", name: "Captain's Table Classic Water Crackers", size: "125g" },
  "Cream Cheese": { sku: "48062", name: "Philadelphia Original Cream Cheese Block", size: "250g" },
  "Cream/Milk": { sku: "44317", name: "Woolworths Thickened Cream", size: "300mL" },
  Croissant: { sku: "33593", name: "Woolworths All Butter Croissants", size: "4pack" },
  Croutons: { sku: "279869", name: "Praise Caesar Salad Croutons", size: "150g" },
  Cucumber: { sku: "137102", name: "Woolworths Continental Cucumbers", size: "each" },
  Cumin: { sku: "251007", name: "Woolworths Cumin Ground Ground", size: "30g" },
  "Curry Paste": { sku: "224632", name: "Mr Chen's Thai Red Curry Paste", size: "190g" },
  "Curry Spices": { sku: "716890", name: "Hoyt's Curry Powder Mild", size: "50g" },
  "Dairy-Free Pesto": { sku: "190944", name: "Barilla Basil Pesto Vegan Pasta Sauce", size: "190g" },
  "Dark Chocolate": { sku: "19731", name: "Lindt Excellence Dark Chocolate 70% Cocoa Block", size: "100g" },
  Dates: { sku: "18160", name: "Woolworths Pitted Dates", size: "500g" },
  "Desiccated Coconut": { sku: "28708", name: "McKenzie's Coconut Fine Desiccated", size: "250g" },
  "Dried Apricots": { sku: "89722", name: "Woolworths Dried & Diced Apricots", size: "200g" },
  "Dumpling Wrappers": { sku: "85721", name: "Double Merino Pastry Gow Gee", size: "275g" },
  Edamame: { sku: "386006", name: "Umami Frozen Edamame Whole Baby Soy Beans", size: "1kg" },
  Egg: { sku: "224763", name: "Woolworths 12 Pack X Large Free Range Eggs", size: "12pack" },
  "Egg (glaze)": { sku: "224763", name: "Woolworths 12 Pack X Large Free Range Eggs", size: "12pack" },
  Eggs: { sku: "165367", name: "Woolworths 12 Pack Extra Large Cage Free Eggs", size: "12pack" },
  Falafel: { sku: "106765", name: "Kings Falafel Mix", size: "200g", why: "믹스(Kiwi도 믹스)" },
  Feta: { sku: "452083", name: "Woolworths Greek Style Fetta", size: "200g" },
  Flour: { sku: "94124", name: "Woolworths Essentials Self Raising Flour", size: "2kg" },
  "GF Crackers": { sku: "331286", name: "Woolworths Original Rice Crackers", size: "100g" },
  "GF Pasta": { sku: "188832", name: "Buontempo Gluten Free Pasta Spirals", size: "600g" },
  Ginger: { sku: "680510", name: "Woolworths Crushed Ginger", size: "230g" },
  "Gluten-Free Bread": { sku: "277578", name: "Woolworths Free From Gluten White Bread Loaf", size: "440g" },
  "Gluten-Free Flour": { sku: "770057", name: "Woolworths Free From Gluten Plain Flour", size: "750g" },
  "Golden Syrup": { sku: "92491", name: "CSR Golden Syrup Squeeze", size: "500g" },
  Grapes: { sku: "138801", name: "White Seedless Grapes Bag Approx. 900g", size: "900g", why: "봉지 약 900g" },
  "Grated Apple": { sku: "314012", name: "Woolworths Royal Gala Apple Punnet", size: "1kg" },
  Ham: { sku: "290324", name: "Don Leg Ham Shaved", size: "200g", why: "포장 상품(델리 kg당 제외)" },
  Herbs: { sku: "251120", name: "Woolworths Mixed Herbs Dried", size: "12g" },
  "Hoisin Sauce": { sku: "6031454", name: "Lantern Alley Hoisin Sauce", size: "300mL" },
  Honey: { sku: "805353", name: "Adley's Nothing But Honey", size: "500g" },
  Hummus: { sku: "323320", name: "Willow Farm Dip Hommus", size: "200g" },
  Jam: { sku: "292796", name: "Cottee's Strawberry Jam", size: "375g" },
  "Kidney Beans": { sku: "907049", name: "Woolworths Red Kidney Beans", size: "420g" },
  Kiwifruit: { sku: "760907", name: "Woolworths Kiwi Fruit Green", size: "8pack" },
  Lemon: { sku: "830353", name: "The Odd Bunch Lemon Prepacked", size: "500g" },
  "Lemon Dressing": { sku: "710191", name: "Birch & Waite Greek Lemon Dressing", size: "250mL" },
  Lettuce: { sku: "154340", name: "Iceberg Lettuce", size: "each" },
  Macaroni: { sku: "346837", name: "Woolworths Pasta Macaroni", size: "500g" },
  Mandarin: { sku: "845671", name: "The Odd Bunch Mandarin Prepacked", size: "1kg" },
  "Mango Chutney": { sku: "298987", name: "MasterFoods Mango Chutney Relish", size: "250g" },
  Mayo: { sku: "360680", name: "Woolworths Whole Egg Mayonnaise", size: "440g" },
  Mayonnaise: { sku: "360680", name: "Woolworths Whole Egg Mayonnaise", size: "440g" },
  Meatballs: { sku: "84993", name: "Woolworths 20 Pack Beef & Vegetable Meatballs", size: "400g" },
  Milk: { sku: "50923", name: "Woolworths Full Cream Milk", size: "1L" },
  Mince: { sku: "577863", name: "Woolworths Beef Mince", size: "500g" },
  "Mixed Vegetables": { sku: "93915", name: "Woolworths Essentials Frozen Mixed Vegetables", size: "1kg" },
  Mozzarella: { sku: "732059", name: "La Casa Del Formaggio Fresh Mozzarella", size: "125g" },
  Muesli: { sku: "743268", name: "Woolworths Toasted Honey & Cinnamon Muesli", size: "750g" },
  Muffin: { sku: "6035082", name: "Woolworths Mini Choc Chip Muffin", size: "8pack" },
  Mustard: { sku: "32822", name: "MasterFoods Wholegrain Mustard", size: "175g" },
  Noodles: { sku: "106256", name: "Wokka Shelf Fresh Thin Hokkien Noodles", size: "440g" },
  Nori: { sku: "185395", name: "Obento Japanese Yaki Nori For Sushi", size: "25g" },
  "Oat Cookie": { sku: "6059965", name: "Arnott's Cookies Fruit & Oat", size: "350g" },
  Oil: { sku: "750736", name: "Woolworths Canola Oil", size: "750mL" },
  "Olive Oil": { sku: "698863", name: "Woolworths Classic Mediterranean Olive Oil", size: "1L" },
  Olives: { sku: "329746", name: "Sandhurst Olives Green Sicilian", size: "280g" },
  Onion: { sku: "144336", name: "Woolworths Onion Brown Bag", size: "per kg", why: "1kg 봉지의 kg당 값" },
  Orange: { sku: "259450", name: "Orange Navel", size: "each" },
  Paneer: { sku: "185281", name: "Lemnos Paneer Cheese", size: "200g" },
  Parmesan: { sku: "85587", name: "Woolworths Shredded Parmesan Cheese", size: "250g" },
  Pasta: { sku: "48900", name: "San Remo Bows Ties Pasta No 23", size: "500g" },
  "Pasta spirals": { sku: "346833", name: "Woolworths Pasta Spirals", size: "500g" },
  Pastry: { sku: "18366", name: "Woolworths Puff Pastry Sheets", size: "6 sheets" },
  "Pastry Cases": { sku: "32897", name: "Pampas Shortcrust Pastry 5 Sheets", size: "5pack", why: "쇼트크러스트 5장" },
  "Peanut Butter": { sku: "33605", name: "Bega Peanut Butter Smooth", size: "375g" },
  "Peanut Sauce": { sku: "345635", name: "MasterFoods Satay Chicken Stir Fry Recipe Base", size: "175g" },
  Pear: { sku: "115330", name: "Fresh Packham Pear", size: "each" },
  Peas: { sku: "754181", name: "Woolworths Frozen Australian Baby Peas", size: "1kg" },
  Pesto: { sku: "753340", name: "Woolworths Pesto Basil", size: "190g" },
  "Pesto/Mayo": { sku: "753340", name: "Woolworths Pesto Basil", size: "190g" },
  Pickle: { sku: "9228", name: "Fehlbergs Burger Pickles", size: "490g" },
  "Pita Bread": { sku: "391891", name: "MEB Foods Khobz White Pita", size: "5pack" },
  "Plain Flour": { sku: "45813", name: "Woolworths Essentials Plain Flour", size: "2kg" },
  "Plant Milk": { sku: "899852", name: "MILKLAB Home Barista Oat Long Life Milk", size: "1L" },
  Popcorn: { sku: "377589", name: "Cobs Popcorn Sea Salt Gluten Free", size: "80g" },
  "Pork Mince": { sku: "582608", name: "Woolworths Lean Pork Mince", size: "500g" },
  "Pork Shoulder": { sku: "764541", name: "Woolworths Pork Shoulder Roast Boneless Boneless Small", size: "per kg", why: "kg당 값" },
  Potato: { sku: "262783", name: "Woolworths Washed Potatoes Bag", size: "per kg", why: "2kg 봉지의 kg당 값" },
  Pretzels: { sku: "695577", name: "Macy and Tailor Oven Baked Pressed Pretzels Sea Salt", size: "180g" },
  "Probiotic Drink": { sku: "256106", name: "Yakult Probiotic Drink Light", size: "5pack" },
  "Puff Pastry": { sku: "18366", name: "Woolworths Puff Pastry Sheets", size: "6 sheets" },
  Quinoa: { sku: "717631", name: "Macro Organic Quinoa Tri Colour", size: "500g" },
  "Real Fruit Strip": { sku: "119059", name: "True Fruit Apple & Strawberry Straps", size: "120g" },
  "Red Lentils": { sku: "8088", name: "McKenzie's Lentils Red", size: "375g" },
  Rice: { sku: "35007", name: "Woolworths Essentials Long Grain Rice Long Grain", size: "1kg" },
  "Rice Bubbles": { sku: "6055324", name: "Kellogg's Rice Bubbles Breakfast Cereal", size: "365g" },
  "Rice Crackers": { sku: "35231", name: "Fantastic Rice Crackers Original", size: "100g" },
  "Rice Noodles": { sku: "40313", name: "Erawan Rice Stick Medium", size: "375g" },
  "Rice Paper": { sku: "121531", name: "Pandaroo Ingredients Rice Paper Spring Roll", size: "150g" },
  "Rice Wheels": { sku: "116987", name: "Healtheries Rice Wheels Chicken Gluten Free Lunchbox Snacks", size: "6pack", why: "21g×6=126g" },
  "Ripe Bananas": { sku: "106218", name: "Bananas Kids", size: "5pack", why: "바나나빵용 2개 — 낱개(each)로 두면 1인분이 「팩 2개」가 된다(분량비율 ≤ 1 규칙). 작은 바나나 5개 봉지" },
  "Roast Beef": { sku: "544698", name: "Primo Roast Beef", size: "80g", why: "포장 상품(델리 kg당 제외)" },
  Rocket: { sku: "380580", name: "Woolworths Baby Leaf Rocket", size: "60g" },
  Rockmelon: { sku: "73197", name: "Woolworths Fresh Rockmelon Tub", size: "200g" },
  Roll: { sku: "130502", name: "Woolworths Soft Round Rolls Extra Soft Lunch", size: "6pack" },
  "Rolled Oats": { sku: "321220", name: "Woolworths Rolled Traditional Oats", size: "750g" },
  Roti: { sku: "6004830", name: "Katoomba Roti Bread Plain", size: "8pack" },
  Salami: { sku: "544764", name: "Primo Mild Hungarian Sliced Salami Mild", size: "80g", why: "포장 상품" },
  Salsa: { sku: "231416", name: "Old El Paso Chunky Salsa Dip Mild Mild", size: "312g" },
  "Sausage Meat": { sku: "109099", name: "Woolworths Beef Sausage Mince", size: "500g" },
  "Sesame Oil": { sku: "76240", name: "Chang's Sesame Oil", size: "150mL" },
  "Smoked Salmon": { sku: "345350", name: "Ocean Blue Smoked Salmon", size: "100g" },
  "Soy Sauce": { sku: "198763", name: "Lee Kum Kee Soy Sauce Premium", size: "500mL" },
  Spaghetti: { sku: "346830", name: "Woolworths Pasta Spaghetti", size: "500g" },
  Spices: { sku: "250995", name: "Woolworths Chilli Ground", size: "30g" },
  Spinach: { sku: "524322", name: "Woolworths Baby Leaf Spinach", size: "120g" },
  "Spring Onion": { sku: "147603", name: "Spring Onion Bunch", size: "each" },
  Strawberries: { sku: "777899", name: "Woolworths Frozen Strawberries", size: "500g" },
  "Sub Roll": { sku: "202570", name: "Woolworths Jumbo Crusty Long Rolls Crusty Jumbo Long", size: "6pack" },
  Sugar: { sku: "33157", name: "CSR White Sugar", size: "2kg" },
  "Sugar Snap Peas": { sku: "163783", name: "Woolworths Sugar Snap Peas Bag", size: "150g" },
  Sultanas: { sku: "726367", name: "Woolworths Sultanas", size: "375g" },
  "Sushi Rice": { sku: "6091997", name: "Sun Rice Sushi Rice", size: "1kg" },
  Sweetcorn: { sku: "374274", name: "Woolworths Frozen Australian Corn Cobs", size: "1kg" },
  Tahini: { sku: "334757", name: "Macro Organic Hulled Tahini Spread", size: "375g" },
  "Teriyaki Sauce": { sku: "703375", name: "Passage To Asia Teriyaki Chicken", size: "200g" },
  Tofu: { sku: "23038", name: "Macro Firm Tofu", size: "450g" },
  Tomato: { sku: "134034", name: "Gourmet Tomato", size: "each", why: "호주는 개당 판매" },
  "Tomato Paste": { sku: "90260", name: "Woolworths Essentials Tomato Paste", size: "170g" },
  "Tomato Sauce": { sku: "230519", name: "Woolworths Tomato Sauce Squeeze", size: "500mL" },
  Tortilla: { sku: "634919", name: "Woolworths Wholegrain Wrap 8Pk", size: "8pack", why: "360g" },
  Tuna: { sku: "476700", name: "Woolworths Tuna In Springwater", size: "95g" },
  Turkey: { sku: "290982", name: "Don Shaved Turkey", size: "160g", why: "포장 상품" },
  "Vanilla Essence": { sku: "37420", name: "Queen Organic Vanilla Extract", size: "100mL" },
  "Vegan Mayo": { sku: "164531", name: "Heinz Seriously Good Mayonnaise Vegan Mayo", size: "270mL" },
  Vegemite: { sku: "796439", name: "Vegemite Spread", size: "380g" },
  "Vegetable Stock": { sku: "310254", name: "Woolworths Vegetable Liquid Stock", size: "1L" },
  "Veggie Straws": { sku: "453873", name: "Infuzions Veggie Straws Sour Cream & Herb", size: "5pack" },
  "Vermicelli Noodles": { sku: "103214", name: "Double Phoenix Bean Vermicelli Noodles", size: "200g" },
  Watermelon: { sku: "120384", name: "Woolworths Red Watermelon Cut Quarter", size: "each", why: "1/4 통" },
  "Wholegrain Crackers": { sku: "378069", name: "Woolworths Multigrain Brown Rice Crackers", size: "100g" },
  Yeast: { sku: "184917", name: "Lowan Yeast Dried Instant", size: "280g" },
  Yoghurt: { sku: "571487", name: "Woolworths Natural Greek Style Yoghurt", size: "1kg" },
};

/**
 * 메뉴에는 없고 **가이드 레시피에만** 나오는 재료.
 *
 * 🔴 왜 필요한가 — 가격 캐시는 `menuData.json`의 재료만 채운다. 그래서 가이드의
 *    레시피(머핀·스콘·에너지볼·프리터)에만 나오는 재료는 캐시에 아예 없었고,
 *    원가를 파생시킬 수가 없어서 2026-08-23에 "약 $0.15/개" 같은 **추정치**가
 *    실측 표 옆에 실려 있었다. 추정을 지우는 대신, 추적 대상을 넓힌다.
 *
 */
export const RECIPE_ONLY_INGREDIENTS = [
  "Plain Flour",
  "Tahini",
  "Courgette",
  "Vanilla Essence",
];

export function pinnedFor(ingredient) {
  return PINNED_SKUS[ingredient] ?? null;
}

/**
 * 검색 결과에서 대표 상품 하나를 고른다. 후보가 없으면 null.
 * @param items Woolworths API의 products.items
 * @param ingredient 원본 재료명
 */
export function pickRepresentative(items, ingredient) {
  const tokens = deriveTokens(ingredient);
  const avoid = avoidTokensFor(ingredient);
  const valid = (items ?? [])
    .filter((x) => x?.type === "Product" && x?.price?.salePrice > 0)
    .filter((x) => {
      const n = String(x.name ?? "").toLowerCase();
      if (avoid.some((a) => n.includes(a))) return false;
      return tokens.every((t) => n.includes(t));
    })
    .slice(0, 10);

  if (!valid.length) return null;
  const sorted = [...valid].sort((a, b) => a.price.salePrice - b.price.salePrice);
  // 규격이 다른 상품(통다리 햄, 업소용 대용량 등)을 먼저 잘라낸 뒤 중앙값을 고른다.
  const floor = sorted[0].price.salePrice;
  const trimmed = sorted.filter((x) => x.price.salePrice <= floor * TRIM_RATIO);
  return trimmed[Math.floor(trimmed.length / 2)];
}

/**
 * Woolworths 상품 API의 price 객체에서 **지수에 넣을 값**을 고른다.
 *
 * 🔴 2026-08-24: originalPrice를 무조건 쓰다가 **진열가보다 비싼 값**을 지수에
 * 넣고 있었다. isSpecial=false 인데 originalPrice > salePrice 인 경우가 있다 —
 * 특가 딱지 없이 내려간 값(주로 농산물)이고, 매대에 붙어 있는 건 salePrice 다.
 * 실측 3건: 사과 $4.95→실제 $4.50, 양상추 $4.00→$3.49, 당근 $2.75→$2.25.
 * 양상추는 이 오차 때문에 **매장 승자가 뒤집혀** 있었다(W $4.00 vs PnS $3.99).
 *
 * 특가 주간(isSpecial=true)에는 originalPrice 를 쓴다 — 지수는 특가가 아니라
 * 정상 진열가 추이를 보는 것이라 특가를 넣으면 물가 하락처럼 보인다.
 *
 * 🔴 2026-09-29: 플래너 수집기(update_prices.mjs)는 이 함수를 안 쓰고 `salePrice`를 그대로
 * 저장하고 있었다. 사이트는 「regular shelf prices」라고 말하는데 09-27 캐시에 **회원가 10개**
 * (계란 $9.95 vs 정가 $11.79 등)가 들어가 있었다. 회원가는 주를 넘겨 이어져서 매주 들어간다.
 * 이제 두 수집기가 이 함수 하나를 쓴다.
 */
export function shelfPrice(price = {}) {
  const orig = parseFloat(String(price.originalPrice));
  const sale = parseFloat(String(price.salePrice));
  // 회원가(isClubPrice)도 특가로 친다 — 정상가는 회원카드 없이 내는 값이다. 관측상 늘 isSpecial과 같이 오지만
  // 둘이 갈라지는 날 회원가가 「정가」로 들어가지 않게 둘 다 본다.
  const isSpecial = !!price.isSpecial || !!price.isClubPrice;
  const shelf = isSpecial ? orig : Math.min(orig, sale);
  return {
    regular: Number.isFinite(shelf) ? shelf : sale,
    sale,
    isSpecial,
    listPrice: orig,
    markdownWithoutSpecial:
      !isSpecial && Number.isFinite(orig) && Number.isFinite(sale) && sale < orig,
    usedFallback: !Number.isFinite(orig),
  };
}
