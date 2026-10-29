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

// countdown.co.nz는 2024년 폐기됐고 현재 301로 woolworths.co.nz에 넘어간다.
export const SEARCH_BASE = "https://www.woolworths.co.nz/api/v1/products";

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
 * 검색으로는 끝내 잡히지 않는 재료 → 특정 SKU로 직접 고정.
 *
 * 배경 (2026-07-30): price_cache_review.txt에 "매칭 실패, 폴백가 사용 중"으로
 * 남아 있던 항목들이다. 검색어를 아무리 다듬어도 엉뚱한 상품이 잡혔다:
 *   Chickpeas   → 비네그레트 스낵           Cocoa      → 베이킹파우더 제품
 *   Macaroni    → 마카로니치즈 간편식        Meatballs  → $13 대용량
 *   Rice Bubbles→ LCM 시리얼바              Breadsticks→ 누텔라 스낵팩
 *
 * 가격지수에서 검증된 방식(SKU 고정)을 여기에도 쓴다. 검색어 조정과 달리
 * 상품이 고정되므로 실행마다 값이 튀지 않는다.
 * `/api/v1/products/{sku}`로 조회하며, 상품이 바뀌면 update_prices.mjs가 경고한다.
 */
export const PINNED_SKUS = {
  Breadsticks:  { sku: "286072", name: "woolworths bread sticks italian style", size: "2pack" },
  "Rice Bubbles": { sku: "584495", name: "woolworths cereal rice pops", size: "460g",
                    why: "Kellogg's Rice Bubbles는 미취급. 자체브랜드 rice pops가 동일 품목" },
  Macaroni:     { sku: "95268",  name: "essentials pasta macaroni", size: "500g" },
  Meatballs:    { sku: "71205",  name: "woolworths nz beef meatballs", size: "400g" },
  Cocoa:        { sku: "267413", name: "cadbury baking cocoa powder bournville", size: "250g" },
  Chickpeas:    { sku: "259399", name: "woolworths chickpeas no added salt", size: "420g" },
  Falafel:      { sku: "293861", name: "turkish kitchen falafel mix traditional omega 3", size: "300g",
                  why: "완제품 팔라펠은 미취급. 믹스가 레시피 재료로 맞다" },
  // ⚠️ Cheese Sauce는 고정하지 않는다. Woolworths에 병입 치즈소스가 없고
  //    29~30g 인스턴트 분말 사셰만 있다. 폴백가를 쓰는 편이 정직하다.

  // ── 2026-08-03 추가: **게시된 수치를 좌우하는 재료**를 고정한다 ──
  // 원격의 주간 자동 가격업데이트가 검색 중앙값으로 상품을 다시 고르는 바람에
  // 매주 브랜드가 바뀌고, 그때마다 가이드·블로그에 박아 둔 수치가 어긋났다.
  // 실제로 이번 주에는 Hummus가 **"lisas hummus beetroot with roasted cashews"**로
  // 잡혔다 — 넛프리를 표방하는 사이트에서 견과류 제품이 기본 재료가 된 것이다.
  // 이건 문구를 고칠 문제가 아니라 상품을 고정할 문제다.
  Hummus:         { sku: "274487", name: "lisas hummus plain", size: "200g",
                    why: "**플레인 고정 필수.** 검색 중앙값은 beetroot with roasted cashews 같은 견과류 변종을 집는다" },
  "Peanut Butter":{ sku: "33605",  name: "bega peanut butter smooth", size: "375g",
                    why: "essentials($2.39) ~ Pic's($7.49) 사이 주류 중간 티어. 최저가로 흐르면 게시 수치가 매주 튄다" },
  // ── 2026-08-20: 본문 표에 실리는 재료의 팩 크기를 상품 API로 전수 확인하고 그대로 고정했다.
  //    값을 바꾸지 않는다 — **이미 실려 있던 상품을 못 바뀌게 묶는 것**이 목적이다.
  Marmite:        { sku: "269841", name: "sanitarium marmite yeast spread ", size: "500g",
                    why: "2026-08-20 팩 크기 전수 확인 때 캐시가 집고 있던 상품($8.99). 고정하지 않으면 다음 크론이 다른 크기를 집어 PORTION_BASIS가 거짓이 된다" },
  Jam:            { sku: "340004", name: "craigs fruit jam strawberry", size: "660g",
                    why: "2026-08-20 팩 크기 전수 확인 때 캐시가 집고 있던 상품($6.69). 고정하지 않으면 다음 크론이 다른 크기를 집어 PORTION_BASIS가 거짓이 된다" },
  Honey:          { sku: "269766", name: "arataki multiflora honey manuka", size: "500g",
                    why: "2026-08-20 팩 크기 전수 확인 때 캐시가 집고 있던 상품($8.69). 고정하지 않으면 다음 크론이 다른 크기를 집어 PORTION_BASIS가 거짓이 된다" },
  "Cream Cheese": { sku: "79223", name: "philadelphia cream cheese ", size: "250g",
                    why: "2026-08-20 팩 크기 전수 확인 때 캐시가 집고 있던 상품($5.30). 고정하지 않으면 다음 크론이 다른 크기를 집어 PORTION_BASIS가 거짓이 된다" },
  Eggs:           { sku: "52242", name: "farmer brown eggs cage free barn size 7", size: "12pack",
                    why: "2026-08-20 팩 크기 전수 확인 때 캐시가 집고 있던 상품($10.29). 고정하지 않으면 다음 크론이 다른 크기를 집어 PORTION_BASIS가 거짓이 된다" },
  Sugar:          { sku: "266528", name: "chelsea white sugar ", size: "1.5kg",
                    why: "2026-08-20 팩 크기 전수 확인 때 캐시가 집고 있던 상품($3.40). 고정하지 않으면 다음 크론이 다른 크기를 집어 PORTION_BASIS가 거짓이 된다" },
  Pasta:          { sku: "6016648", name: "diamond pasta bow ties", size: "500g",
                    why: "2026-08-20 팩 크기 전수 확인 때 캐시가 집고 있던 상품($2.99). 고정하지 않으면 다음 크론이 다른 크기를 집어 PORTION_BASIS가 거짓이 된다" },
  Salami:         { sku: "260725", name: "verkerks salami sliced italian thin", size: "100g",
                    why: "2026-08-20 팩 크기 전수 확인 때 캐시가 집고 있던 상품($3.50). 고정하지 않으면 다음 크론이 다른 크기를 집어 PORTION_BASIS가 거짓이 된다" },
  Milk:           { sku: "546293", name: "meadow fresh milk standard original", size: "1L",
                    why: "2026-08-20 팩 크기 전수 확인 때 캐시가 집고 있던 상품($3.72). 고정하지 않으면 다음 크론이 다른 크기를 집어 PORTION_BASIS가 거짓이 된다" },
  Carrot:         { sku: "135344", name: "fresh vegetable carrots ", size: "per kg",
                    why: "2026-08-20 팩 크기 전수 확인 때 캐시가 집고 있던 상품($1.99). 고정하지 않으면 다음 크론이 다른 크기를 집어 PORTION_BASIS가 거짓이 된다" },
  Yoghurt:        { sku: "6009233", name: "fresh n fruity greek yoghurt mango & passionfuit", size: "1kg",
                    why: "2026-08-20 팩 크기 전수 확인 때 캐시가 집고 있던 상품($7.75). 고정하지 않으면 다음 크론이 다른 크기를 집어 PORTION_BASIS가 거짓이 된다" },
  Grapes:         { sku: "247942", name: "fresh fruit grapes green", size: "500g",
                    why: "2026-08-20 팩 크기 전수 확인 때 캐시가 집고 있던 상품($9.90). 고정하지 않으면 다음 크론이 다른 크기를 집어 PORTION_BASIS가 거짓이 된다" },
  Bagel:          { sku: "270580", name: "abe's bagels the natural", size: "4pack",
                    why: "2026-08-20 팩 크기 전수 확인 때 캐시가 집고 있던 상품($4.80). 고정하지 않으면 다음 크론이 다른 크기를 집어 PORTION_BASIS가 거짓이 된다" },

  // ── 2026-08-20: 팩 크기 전수 확인 중 **상품 종류 자체가 틀린** 셋을 찾았다 ──
  // 세 건 다 검색이 이름은 맞지만 용도가 다른 상품을 집고 있었고, 그 위에 factor가 얹혀 있었다.
  Rice:           { sku: "316761", name: "kings choice long grain rice", size: "1kg",
                    why: "고정 전엔 bens original **250g 전자레인지 파우치**($3.29)를 집고 있었다. 파우치는 그 자체가 1인분인데 factor 0.1이 얹혀 1인분이 33c로 실렸다 — 실제로는 $3.29다. data/priceIndex.json도 'Rice (1kg) $3.40'을 추적한다" },
  "Black Beans":  { sku: "930176", name: "edgell beans black", size: "400g",
                    why: "고정 전엔 edgell **snack time 70g 스낵팩**(차드콘·라임 맛)이었다. egg-free 글이 이걸 '싼 단백질 대체'로 권하고 있었는데 조미 스낵이지 통조림 콩이 아니다" },
  Butter:         { sku: "281759", name: "anchor butter", size: "500g",
                    why: "고정 전엔 mainland buttersoft **225g 통**($9.99, $44/kg)이었는데 본문은 'block'이라 불렀다. Anchor 500g가 NZ 가정의 기본값이고, 자체브랜드($7.49)로 흐르면 '보통 사는 값'이 아니게 된다" },
  Cheese:         { sku: "234345", name: "woolworths cheese mild", size: "500g",
                    why: "자체브랜드 500g 블록. mainland tasty($11.50)로 흐르면 '보통 가정이 사는 값'이 아니게 된다.\n" +
                         "                          🔴 2026-09-10에 SKU를 434914에서 옮겼다. 그 SKU는 이름이 바뀌어 있었다 —\n" +
                         "                          'woolworths cheese cheddar everyday' → 'woolworths everyday cheese cheddar **alternative dairy free**'.\n" +
                         "                          가격($8.49)도 규격(500g)도 그대로라 값만 보면 안 드러난다. 잡은 건 **고정 이름 대조 가드**다.\n" +
                         "                          더 나쁜 건 그 상품의 라벨이 자기모순이라는 점이다 — 이름은 dairy free인데 allergens는 'Contains: Milk'다.\n" +
                         "                          우리 알레르기 필터가 그 라벨을 읽는다(lib/ingredientDiet.ts). 라벨이 반대로 바뀌면 유제품 알레르기 식단에\n" +
                         "                          치즈 샌드위치가 들어간다. 이름과 라벨이 어긋나는 상품에는 기대지 않는다.\n" +
                         "                          234345는 이름·라벨이 일치하고(allergens ['Milk']), 자체브랜드 일반 라인 500g $8.50으로 종전($8.49)과 같은 가격대다.\n" +
                         "                          체다 everyday 500g은 이제 유제품 프리 버전만 남아 있어 고를 수 없었다(1kg $12.78은 규격이 다르다)" },
  "Red Lentils":  { sku: "324116", name: "delmaine lentils", size: "390g",
                    why: "iron-rich 블로그의 배수 문장이 이 값과 Beef Mince에 함께 묶여 있다. 한쪽만 고정하면 배수가 계속 튄다" },
  // ── 2026-08-06: 넛프리 안전 + 오매칭 고정 ──
  Croissant:      { sku: "6003482", name: "woolworths french croissant large", size: "each",
                    why: "🔴 **넛프리 안전.** 검색 후보에 chocolate hazelnut·almond 크루아상이 있어 중앙값이 언제든 그쪽으로 넘어간다. Ham & Cheese Croissant는 is_nut_free=true 메뉴다" },
  "Spring Onion": { sku: "144522", name: "fresh vegetable spring onion", size: "each",
                    why: "검색이 'onions brown'(양파)을 집고 있었다. 다른 채소다" },
  "Desiccated Coconut": { sku: "6015740", name: "macro coconut desiccated", size: "250g",
                    why: "'essentials coconut milk'가 잡혀 있었다. ANZAC Biscuits·Date & Oat Slice가 쓰는 재료라 형태가 다르면 레시피가 성립하지 않는다" },
  Cinnamon:       { sku: "251000", name: "woolworths cinnamon ground", size: "32g",
                    why: "'sticky cinnamon brioche'(빵)가 잡혔다. 향신료여야 한다" },
  "Beef Mince":   { sku: "921980", name: "woolworths nz angus beef mince grass fed 10% fat", size: "500g",
                    why: "iron-rich 블로그의 '렌틸 대비 배수' 문장이 이 값에 묶여 있다" },

  // ── 2026-08-23: 레시피 원가를 되살리려고 남아 있던 팩 크기를 상품 API로 확인했다.
  //    (스낵 가이드의 "약 $0.15/개"를 08-23에 지운 이유가 정확히 이 셋이었다.)
  Flour:          { sku: "265268", name: "woolworths self raising flour white", size: "1.5kg",
                    why: "🔴 캐시가 집고 있던 건 **셀프라이징**이다($2.40/1.5kg). 16개 메뉴가 이 키를 쓰므로 값을 바꾸지 않고 그대로 고정한다 — 플레인으로 옮기면 16개 메뉴 원가가 한꺼번에 움직인다. 플레인이 필요한 레시피는 아래 'Plain Flour'를 쓴다" },
  Banana:         { sku: "133211", name: "fresh fruit bananas yellow loose", size: "per kg",
                    why: "2026-08-23 확인($3.75/kg). volumeSize는 비어 있고 cupPrice가 3.75/1kg다 — **kg 단위 판매**. Fruit&Veg 간식 풀에 들어 있어 모든 도시락 총액의 중앙값에 닿는다" },
  "Coconut Oil":  { sku: "751353", name: "macro organic virgin coconut oil ", size: "300g",
                    why: "🔴 **상품 종류가 틀렸다.** 고정 전엔 'woolworths coconut oil **spray**' 225g($5.00)이었다 — 레시피는 '2 Tbsp, melted'라 스프레이로는 성립하지 않는다. Rice(전자레인지 파우치)·Black Beans(스낵팩)와 같은 종류의 오류다" },
  "Baking Powder":{ sku: "6074780", name: "woolworths baking powder ", size: "400g",
                    why: "2026-08-23 확인($3.69/400g). 레시피 원가 계산에 들어간다" },
  "Baking Soda":  { sku: "358610", name: "hansells baking soda ", size: "185g",
                    why: "2026-08-23 확인($2.99/185g). 레시피 원가 계산에 들어간다" },
  Corn:           { sku: "34437", name: "edgell corn whole kernel", size: "420g",
                    why: "🔴 캐시가 'edgell corn **creamed**'를 집고 있었다. Savoury Rice·Pasta Salad·프리터는 전부 **낟알**을 쓴다. 같은 브랜드 낟알 캔이 같은 값($2.80)이라 원가는 안 움직이고 정체성만 바로잡힌다" },

  // ── 2026-09-06: 검색이 **그 재료가 아닌 상품**을 집던 것들을 고정한다 ──
  //
  // 🔴 09-06 재수집에서 198개 중 44개가 다른 상품으로 바뀌었다. 44개 **전부 미고정**이었고
  //    고정 92개는 0개 흔들렸다(미고정 106개의 불안정률 42%). 중앙값 선택은 검색 결과
  //    집합이 바뀌면 같이 움직인다 — 규칙이 아니라 우연이다.
  //
  //    셋은 알레르겐 가드를 터뜨렸다: is_nut_free 메뉴에 캐슈(버터치킨 소스),
  //    is_dairy_free에 우유(통조림 스파게티), is_gluten_free에 밀(큐민).
  //    가드가 안 잡은 것 중에도 **Watermelon = 껌**, Kiwifruit = 2L 과일음료,
  //    Onion = 33g 그레이비 가루, Spinach = 시금치 랩이 있었다.
  //
  //    아래는 **실제로 그 재료가 아니었던 것만** 고정한다. 지금 상품이 타당한 나머지
  //    75개는 손대지 않았다 — 팩 크기 근거(PORTION_BASIS)를 함께 대야 하는데
  //    그건 게시된 1인분 금액을 전부 다시 재는 일이라 따로 다룬다.
  //    24개 전부 **SKU를 재조회해 상품명이 일치하는지 확인**했다.
  Apple: { sku: "155003", name: "fresh fruit apples royal gala",
    why: "SEARCH_TERMS가 royal gala인데 ambrosia가 잡혀 있었다" },
  "Beef Patty": { sku: "414358", name: "woolworths beef burger patties", size: "400g",
    why: "후보 0개였다" },
  Berries: { sku: "260010", name: "woolworths frozen mixed berries", size: "500g",
    why: "유기농 프리미엄 → 자체브랜드" },
  Blueberries: { sku: "260007", name: "woolworths frozen blueberries", size: "500g",
    why: "유기농 프리미엄 → 자체브랜드" },
  "Bread Roll": { sku: "324764", name: "woolworths bread rolls baps", size: "6pack",
    why: "현재 상품이 더는 검색에 없다" },
  Breadcrumbs: { sku: "6020501", name: "gerry's bread crumbs fine white", size: "300g",
    why: "토큰 breadcrumb이 너무 좁아 후보 0개였다" },
  Broccoli: { sku: "281082", name: "fresh vegetable broccoli head",
    why: "냉동 모듬채소가 잡혀 있었다" },
  "Cherry Tomatoes": { sku: "58536", name: "woolworths fresh tomatoes cherry", size: "180g",
    why: "조미 통조림 토마토가 잡혀 있었다" },
  "Chicken Breast": { sku: "98508", name: "turk's chicken breast skinless fillets free range", size: "450g",
    why: "min-order 규격 대신 고정 450g 팩" },
  "Corn Tortilla": { sku: "777201", name: "woolworths free from gluten mexican tortillas white corn 280g", size: "10pack",
    why: "토르티야 칩이 잡혀 있었다" },
  "Cream/Milk": { sku: "282771", name: "woolworths cream fresh", size: "300mL",
    why: "현재 상품이 더는 검색에 없다" },
  "Dumpling Wrappers": { sku: "86590", name: "lian huat dumpling pastry", size: "300g",
    why: "후보 0개였다" },
  Herbs: { sku: "251120", name: "woolworths mixed herbs", size: "12g",
    why: "파슬리 화분이 잡혀 있었다" },
  Kiwifruit: { sku: "504011", name: "fresh fruit kiwifruit green", size: "680g",
    why: "2L 과일음료가 잡혀 있었다" },
  Nori: { sku: "865271", name: "dragon foods nori roasted seaweed", size: "30g",
    why: "11g 스낵팩 → 김밥용 30g 시트" },
  Oil: { sku: "750736", name: "woolworths canola oil", size: "750mL",
    why: "검색어가 canola인데 vegetable oil이 잡혀 있었다" },
  Onion: { sku: "144329", name: "fresh vegetable onions brown", size: "per kg",
    why: "그레이비 가루가 잡혀 있었다" },
  Orange: { sku: "149885", name: "fresh fruit oranges navel",
    why: "탄산음료가 잡혀 있었다" },
  Pear: { sku: "115330", name: "fresh fruit pears packham green",
    why: "통조림 배가 잡혀 있었다" },
  Pickle: { sku: "6052314", name: "sun harvest pickles special burger", size: "500g",
    why: "인도식 가지 피클이 잡혀 있었다" },
  "Smoked Salmon": { sku: "390141", name: "ocean blue smoked salmon natural", size: "80g",
    why: "같은 브랜드 고정 80g 팩" },
  Spinach: { sku: "115160", name: "fresh vegetable salad baby leaf spinach", size: "120g",
    why: "시금치 랩이 잡혀 있었다" },
  Strawberries: { sku: "777899", name: "woolworths frozen strawberries", size: "500g",
    why: "9월엔 생딸기가 없다. 연중 있는 자체브랜드 냉동" },
  Watermelon: { sku: "275925", name: "woolworths watermelon cut seedless", size: "per kg",
    why: "코코넛워터가 잡혀 있었다" },

  "Butter Chicken Sauce": { sku: "6046047", name: "continental pasta & sauce butter chicken", size: "80g",
    why: "🔴 캐슈·우유를 선언하는 simmer sauce로 바뀌어 is_nut_free 가드를 터뜨렸다" },
  Cumin: { sku: "128959", name: "mrs rogers eco organic cumin ground", size: "30g",
    why: "🔴 「Contains Wheat Products」 큐민으로 바뀌어 is_gluten_free 가드를 터뜨렸다" },
  Spaghetti: { sku: "346830", name: "woolworths pasta spaghetti", size: "500g",
    why: "🔴 통조림 스파게티(우유·밀 선언)로 바뀌어 is_dairy_free 가드를 터뜨렸다. 그때 고른 912755도 410g **통조림** shortstrand였다(09-29) — 볼로네제엔 건면이다. 다른 파스타와 같은 자체브랜드 500g" },

  // ── 고정하지 않는 것 (사유) ──
  // Chicken/Tofu: 택일 라벨이라 단일 상품이 아니다
  // Ham/Bacon: 택일 라벨
  // Paneer: 즉석식품(matar paneer)이 잡혔다 — 재확인 필요
  // Rice Noodles: 인스턴트 쌀국수 컵이 잡혔다 — 재확인 필요
  // Rolled Oats (GF): Harraways는 GF 인증이 아니다. 메뉴 사용 0회
  // Tuna/Chicken/Avocado: 택일 라벨
  // Rolled Oats (GF): 메뉴 사용 0회인데 GF 인증 오트는 $15.30/500g짜리 니치 상품뿐이다.
  //   고정하면 쓰이지도 않는 값이 비싸게 박힌다. Harraways는 GF 인증이 아니라 대체도 안 된다
  // Turkey: NZ Woolworths에 칠면조 슬라이스가 없다 — 전부 햄·파스트라미

  // ── 2026-09-07: 남아 있던 미고정 재료를 전부 고정한다 ──
  //
  // 🔴 09-06 저녁, 크론을 진단하려고 수집기를 한 번 돌렸더니 **하루 만에 8개가
  //    또 다른 상품으로 바뀌었다.** 그중 `Mince`가 **`woolworths minced garlic` $2.70**이
  //    됐다 — 다진 소고기가 다진 마늘이 됐고, 알레르겐 가드는 둘 다 알레르겐이 없어
  //    잡지 못한다. 「지금 상품이 타당하니 다음에」로 미룰 문제가 아니었다.
  //
  //    아래 75개는 전부 **SKU를 재조회해 상품명이 일치하는지 확인**했다.
  //    why가 붙은 것은 검색이 실제로 엉뚱한 상품을 집던 자리다.
  Avocado: { sku: "354360", name: "fresh avocado pre-ripened",
    why: "5개들이 팩이 잡혔다 — 낱개로" },
  Bacon: { sku: "281979", name: "woolworths streaky bacon honey cured", size: "250g" },
  Basil: { sku: "133631", name: "fresh herb basil living plant",
    why: "말린 향신료가 잡혔다 — 생바질로" },
  Beef: { sku: "257504", name: "woolworths nz beef stir fry premium grass fed",
    why: "브리스킷 $21.99이 잡혔다" },
  "Boiled Eggs": { sku: "352492", name: "henergy eggs cage free size 6", size: "12pack" },
  "Burger Bun": { sku: "324760", name: "woolworths burger buns plain", size: "6pack" },
  Cabbage: { sku: "134923", name: "fresh vegetable cabbage whole" },
  "Caesar Dressing": { sku: "6043731", name: "best foods dressing caesar", size: "250mL" },
  Capsicum: { sku: "281197", name: "fresh vegetable capsicum red" },
  Celery: { sku: "281004", name: "fresh vegetable celery sticks", size: "300g" },
  "Cheese Block": { sku: "281806", name: "woolworths cheese tasty", size: "500g" },
  "Cheese Stick": { sku: "956189", name: "dairyworks cheese snack low lactose cheddar sticks", size: "200g" },
  Ciabatta: { sku: "6043651", name: "woolworths ciabatta pocket single" },
  "Cocktail Sausages": { sku: "335576", name: "woolworths sausages thin pork", size: "9pack" },
  Coconut: { sku: "6015760", name: "macro coconut shredded", size: "250g" },
  "Coconut Milk": { sku: "168", name: "tcc coconut milk premium", size: "400mL" },
  "Corn Chips": { sku: "704052", name: "mexicano corn chips natural", size: "300g" },
  "Cos Lettuce": { sku: "140205", name: "fresh vegetable lettuce cos" },
  Couscous: { sku: "720060", name: "woolworths couscous", size: "500g" },
  Crackers: { sku: "805709", name: "woolworths crackers sea salt", size: "185g" },
  Croutons: { sku: "141371", name: "fresh produce salad croutons garden herb", size: "120g" },
  "Curry Paste": { sku: "745301", name: "exotic food curry paste red", size: "220g" },
  "Dairy-Free Pesto": { sku: "758672", name: "veesey vegan fresh pesto chilled dairy free", size: "200g" },
  "Dark Chocolate": { sku: "6081239", name: "whittaker's dark chocolate block cocoa lovers 70% cocoa togo", size: "100g",
    why: "주마다 카카오 함량이 갈렸다" },
  "Dried Apricots": { sku: "284032", name: "cinderella dried apricots", size: "200g",
    why: "주마다 브랜드가 갈렸다" },
  Edamame: { sku: "702489", name: "mama san frozen edamame soy beans shelled", size: "454g" },
  Egg: { sku: "253878", name: "macro eggs free range size 7", size: "12pack" },
  Feta: { sku: "281755", name: "bouton dor feta cheese", size: "200g",
    why: "바질페스토 맛 페타가 잡혔다 — 플레인으로" },
  "GF Crackers": { sku: "897121", name: "woolworths rice crackers brown rice & black sesame", size: "100g" },
  "GF Pasta": { sku: "276287", name: "buontempo pasta spirals gluten free", size: "350g" },
  "GF Sausages": { sku: "290735", name: "hellers sausages precooked gluten free", size: "1kg pack" },
  Ginger: { sku: "680510", name: "woolworths crushed ginger", size: "230g" },
  "Gluten-Free Bread": { sku: "384849", name: "vogels gluten free sliced bread white", size: "520g" },
  "Gluten-Free Flour": { sku: "29766", name: "freshlife rice flour gluten free", size: "450g" },
  "Golden Syrup": { sku: "266613", name: "chelsea golden syrup", size: "540g",
    why: "메이플 **향** 시럽이 잡혔다" },
  "Grated Apple": { sku: "155003", name: "fresh fruit apples royal gala" },
  "Lemon Dressing": { sku: "111469", name: "barkers dressing greek olive", size: "280mL" },
  Mayo: { sku: "304977", name: "best foods mayonnaise real", size: "405g",
    why: "무명 브랜드가 잡혔다 — 시장 표준으로" },
  Mince: { sku: "42177", name: "woolworths nz beef mince grass fed 18% fat", size: "500g",
    why: "09-06 재수집에서 **다진 마늘 $2.70**이 잡혔다 — 다진 소고기가 아니다" },
  "Mixed Vegetables": { sku: "897151", name: "woolworths frozen mixed vegetables", size: "1kg" },
  Muffin: { sku: "6034209", name: "woolworths muffins double choc chip mini", size: "8pack" },
  Mustard: { sku: "270399", name: "colmans mustard original english", size: "170g",
    why: "머스터드 **가루**가 잡혔다" },
  Paneer: { sku: "726429", name: "gopala paneer cheese", size: "300g",
    why: "즉석식품(matar paneer)이 잡혔다 — 실제 파니르 치즈로" },
  Parmesan: { sku: "6001461", name: "woolworths parmesan cheese", size: "250g",
    why: "주마다 브랜드가 갈렸다" },
  "Pasta spirals": { sku: "346833", name: "woolworths pasta spirals", size: "500g" },
  Pastry: { sku: "18366", name: "woolworths puff pastry 1kg", size: "6 sheets" },
  "Peanut Sauce": { sku: "703559", name: "passage to asia stir fry sauce satay chicken", size: "200g" },
  "Pesto/Mayo": { sku: "3466", name: "barilla pesto alla genovese", size: "190g" },
  "Pita Bread": { sku: "636825", name: "woolworths pita bread wholemeal", size: "10pack",
    why: "마늘맛이 잡혔다" },
  "Plant Milk": { sku: "899852", name: "milklab home barista oat", size: "1L",
    why: "주마다 브랜드가 갈렸다" },
  Popcorn: { sku: "6056701", name: "popcorners corn snacks cinnamon crunch", size: "130g",
    why: "주마다 다른 맛이 잡혔다" },
  "Pork Mince": { sku: "43151", name: "woolworths nz free farmed pork mince 13% fat", size: "500g",
    why: "$10.99↔$19.50으로 갈렸다" },
  Potato: { sku: "147120", name: "fresh vegetable potatoes white washed", size: "per kg" },
  Pretzels: { sku: "695577", name: "macy & tailor pretzels sea salt", size: "180g",
    why: "**땅콩버터** 프레첼이 잡혔다 — 학교 nut-free" },
  "Puff Pastry": { sku: "18366", name: "woolworths puff pastry 1kg", size: "6 sheets" },
  "Real Fruit Strip": { sku: "86871", name: "annies fruit snack strips", size: "90g" },
  "Rice Crackers": { sku: "35117", name: "fantastic rice crackers seaweed", size: "100g" },
  "Rice Noodles": { sku: "40313", name: "erawan rice sticks medium noodles", size: "375g",
    why: "인스턴트 쌀국수 컵이 잡혔다 — 면이 아니다" },
  "Rice Paper": { sku: "752365", name: "valcom rice paper", size: "250g" },
  "Rice Wheels": { sku: "6040446", name: "healtheries snack rice wheels chicken", size: "126g" },
  "Roast Beef": { sku: "68708", name: "woolworths shaved roast beef wafer thin", size: "100g" },
  Rockmelon: { sku: "68530", name: "fresh fruit rockmelon cut", size: "200g",
    why: "통 멜론/손질 팩이 주마다 갈렸다" },
  "Sausage Meat": { sku: "71172", name: "woolworths beef sausage meat", size: "450g" },
  "Sub Roll": { sku: "321327", name: "woolworths bread rolls long plain", size: "6pack",
    why: "디너롤이 잡혔다" },
  Sultanas: { sku: "726367", name: "woolworths sultanas", size: "375g",
    why: "크랜베리 혼합 스낵이 잡혔다" },
  Sweetcorn: { sku: "104113", name: "emma janes sweetcorn cobs", size: "750g" },
  "Teriyaki Sauce": { sku: "703375", name: "passage to asia stir fry sauce teriyaki chicken", size: "200g" },
  Tofu: { sku: "23038", name: "macro firm tofu", size: "450g" },
  "Tomato Paste": { sku: "90260", name: "essentials tomato paste", size: "170g" },
  "Tomato Sauce": { sku: "312185", name: "woolworths tomato sauce", size: "565g" },
  Tuna: { sku: "476700", name: "woolworths tuna in spring water", size: "95g",
    why: "조미 참치(tomato & basil)가 잡혔다 — 스프링워터 플레인으로" },
  "Veggie Straws": { sku: "279893", name: "the natural chip company corn snacks veggie straws sour cream 65g", size: "5pack" },
  "Wholegrain Crackers": { sku: "378069", name: "woolworths brown rice crackers multigrain", size: "100g" },
  Yeast: { sku: "265166", name: "edmonds yeast active dried", size: "150g" },

  // ── 고정하지 않는 것 (사유) ──
  // Chicken/Tofu · Ham/Bacon · Tuna/Chicken/Avocado: 택일 라벨이라 단일 상품이 아니다
  // Rolled Oats (GF): 메뉴 사용 0회인데 GF 인증 오트는 $15.30/500g짜리 니치 상품뿐이다.
  //   고정하면 쓰이지도 않는 값이 비싸게 박힌다. Harraways는 GF 인증이 아니라 대체도 안 된다
  // Turkey: NZ Woolworths에 칠면조 슬라이스가 없다 — 검색 결과가 전부 햄·파스트라미다
};

Object.assign(PINNED_SKUS, {
  /* ──────────────────────────────────────────────────────────────────────────
   * 2026-08-23 전수 대조: 캐시의 **상품명**과 재료명을 맞춰 보니 37건이 어긋났고,
   * 그중 15건은 **아예 다른 음식**이었다. 화면에는 재료명이 나가므로(장보기 목록은
   * 재료 키를 쓴다) 사용자에게 보이진 않았지만, **가격이 통째로 다른 상품의 값**이었다.
   *
   * 셋은 알레르겐·식이 표시와 정면으로 어긋났다 — 그게 이 묶음에서 제일 나쁜 부분이다.
   * ────────────────────────────────────────────────────────────────────────── */

  // 🔴 알레르겐·식이 표시와 어긋나던 것
  "Sesame Oil":     { sku: "16340", name: "lee kum kee sesame oil pure gluten free", size: "207mL",
                      why: "🔴 **참기름 자리에 미강유(rice bran oil)가 잡혀 있었다.** 참깨는 declarable allergen인데 가격도 성분도 다른 기름이었다. Noodle Stir-fry·Bulgogi Rice Bento가 쓴다" },
  "Vegan Mayo":     { sku: "334374", name: "best foods vegan mayonnaise ", size: "340mL",
                      why: "🔴 **`culley's kitchen mayonnaise classic`가 잡혀 있었다 — 달걀이 든 일반 마요다.** Chickpea Salad Sandwich는 is_vegan, Egg-Free Mayo Chicken Sandwich는 egg-free 메뉴다" },
  "Chicken Skewers":{ sku: "275969", name: "woolworths cook nz chicken kebabs satay", size: "5pack",
                      why: "🔴 **`sea treasure prawn skewers`가 잡혀 있었다.** 갑각류는 declarable allergen이고 메뉴는 Chicken Satay다" },
  "Curry Spices":   { sku: "265337", name: "greggs curry powder ", size: "40g",
                      why: "`pataks recipe base korma`(유제품이 흔히 들어가는 페이스트)가 잡혀 있었다. Vegetable Samosa는 is_vegan이다. 향신료 가루여야 한다" },

  // 🔴 게시되는 파생 수치에 닿던 것
  "Rolled Oats":    { sku: "321220", name: "woolworths oats rolled", size: "750g",
                      why: "🔴 **`uncle tobys milk oaties breakfast cereal`(가공 시리얼)이 잡혀 있었다.** 스낵 가이드의 머핀·에너지볼 원가와 ANZAC·Bircher·Date & Oat Slice 세 메뉴가 전부 이 값 위에 서 있다" },
  "Sugar Snap Peas":{ sku: "282909", name: "fresh vegetable snow peas sugar snap", size: "100g",
                      why: "🔴 **`woolworths frozen baby peas` 1kg가 잡혀 있었다.** kg당 $3.90 대 $70 — Fruit & Veg 간식 풀의 중앙값에 들어가므로 **모든 도시락 총액**에 닿는다" },

  // 다른 음식이 잡혀 있던 것
  "Ripe Bananas":   { sku: "133211", name: "fresh fruit bananas yellow loose", size: "per kg",
                      why: "`woolworths free from gluten **banana bread mix**`가 잡혀 있었다. Banana Bread 메뉴의 재료는 바나나다" },
  "Cottage Cheese": { sku: "281753", name: "meadowfresh cottage cheese ", size: "250g",
                      why: "`galaxy **feta** cheese`가 잡혀 있었다. 다른 치즈다" },
  "Hoisin Sauce":   { sku: "230533", name: "woolworths hoisin sauce ", size: "320mL",
                      why: "`ayam **teriyaki** sauce`가 잡혀 있었다" },
  "Sushi Rice":     { sku: "781400", name: "mama san sushi rice ", size: "1kg",
                      why: "`fortune thai **jasmine** rice`가 잡혀 있었다. 초밥용 단립종이어야 뭉쳐진다" },
  "Kidney Beans":   { sku: "259401", name: "woolworths beans red kidney no added salt", size: "420g",
                      why: "`woolworths beans **mexican** 3 bean`이 잡혀 있었다" },
  "Vermicelli Noodles": { sku: "292966", name: "double phoenix asian vermicelli", size: "250g",
                      why: "`trident rice noodles vietnamese **chicken flavour**`(조미 컵면)가 잡혀 있었다. 마른 당면이어야 한다" },
  "Oat Cookie":     { sku: "143495", name: "arnotts farmbake cookies crunchy oat & fruit", size: "310g",
                      why: "`griffin's **cookie bear** biscuits`가 잡혀 있었다 — 오트 쿠키가 아니다" },
  "Bao Buns":       { sku: "64667", name: "united food co bao buns 480g", size: "8pack",
                      why: "`juicy steam buns **bbq pork**`(속이 든 완제품)가 잡혀 있었다. 같은 메뉴가 Char Siu Pork를 따로 세므로 고기를 두 번 세고 있었다" },
  // 🔴 **가게에 없는 것을 재료명으로 쓰고 있던 셋.** 장보기 목록은 재료명을 그대로
  //    보여 주므로, 살 수 없는 이름을 적어 두면 사용자를 빈손으로 보내는 셈이다.
  //    이름을 살 수 있는 것으로 바꾸고 그 상품을 고정했다.
  Muesli:           { sku: "854588", name: "woolworths muesli toasted berry", size: "650g",
                      why: "🔴 재료명이 **`Muesli (Nut-free)`**였는데, Woolworths의 뮤즐리 **30종을 전수 조회한 결과 견과류 경고가 없는 제품이 하나도 없다**(선언 또는 'may be present'). 이름이 약속하는 물건이 매대에 없어서 이름을 바꿨다. 이 상품은 견과류 **선언은 없고** 'may contain Peanuts, Almond'가 붙는다 — 알레르기 가이드에 그대로 적었다" },
  "Pork Shoulder":  { sku: "65815", name: "woolworths free farmed bone in pork shoulder roast nz", size: "per kg",
                      why: "재료명이 `Char Siu Pork`였고 `auntie dai's **siu mai** pork`(만두)가 잡혀 있었다. 완제품 차슈는 안 판다 — 같은 메뉴가 Hoisin Sauce를 이미 세므로 고기는 돼지 어깨살이면 된다" },
  "Mango Chutney":  { sku: "32155", name: "ashoka chutney sweet mango", size: "340g",
                      why: "재료명이 `Mint Chutney`였는데 **민트 처트니를 안 판다**(민트 소스는 다른 것이다). 캐시는 `date & tamarind`를 집고 있었다. Paneer 랩에는 망고 처트니가 흔한 선택이다" },
  "Pastry Cases":   { sku: "763596", name: "woolworths shortcrust pastry 1kg", size: "5pack",
                      why: "`homeliving **baking cups** assorted muffin cases`(종이컵)가 잡혀 있었다. Mini Spinach Quiche는 페이스트리가 필요하다" },
});

Object.assign(PINNED_SKUS, {
  /* ──────────────────────────────────────────────────────────────────────────
   * 2026-08-24: 🔴 **귤 자리에 오렌지주스가 들어 있었다.**
   *   `Mandarin`은 SEARCH_TERMS 로 "mandarins fresh" 보정만 해 두고 **고정은 안 했다.**
   *   그래서 크론이 다시 골라 `charlie's fruit juice mandarin, mango & pineapple`
   *   $6.49 를 집었고, Term 1 글의 일요일 장보기 목록이 그 값으로 계산되고 있었다.
   *   보정어를 적어 두는 것으로는 안 막힌다 — **고정만이 막는다.**
   * ────────────────────────────────────────────────────────────────────────── */
  Mandarin: { sku: "292795", name: "fresh fruit mandarins", size: "1kg",
              why: "마크다운 없는 정상 진열가. loose/prepacked 두 상품은 $6.99→$5.49로 내려가 있다" },

  /* ──────────────────────────────────────────────────────────────────────────
   * 2026-08-23: **주간 크론을 한 번 돌리고 나서 붙인 고정들.**
   *
   * 🔴 한 번 실행에 **28개 재료의 상품이 바뀌었다.** 값이 아니라 **정체성**이다 —
   *    `pickRepresentative`가 매주 검색을 다시 하기 때문이다. 그중 둘은 음식이 아니었다:
   *      · `Peas` → **harvest snaps 완두 칩**(과자)
   *      · `Rocket` → **rocket kitchen 치즈&양파 파이**
   *    이 churn은 매주 조용히 일어나고 있었다. 파일 맨 위 2026-08-03 주석이 말하는
   *    바로 그 문제이고, 답도 같다 — **드리프트한 재료는 고정한다.**
   * ────────────────────────────────────────────────────────────────────────── */

  // ── 크론이 집은 것보다 **더 맞는 상품**으로 바로잡은 것 (알레르겐 라벨이 근거)
  "Pesto": { sku: "343078", name: "genoese fresh pesto chilled ground with fresh basil", size: "100g",
    why: "🔴 알레르겐 라벨이 **Egg**을 선언하고 있었다(`barilla pesto rosso`). Chicken Pesto Panini는 egg-free 메뉴다. 이 상품은 Milk·Cashew 선언이고 Egg은 없다 — 페스토는 견과가 기본이라 nut-free 메뉴엔 안 쓴다" },
  "Spices": { sku: "250995", name: "woolworths chilli ground", size: "30g",
    why: "🔴 `old el paso spice mix crispy chicken`(**Gluten, Wheat 선언**)이 잡혀 있었다. Chilli con Carne는 gluten-free 메뉴다. 향신료 가루여야 한다" },
  "Noodles": { sku: "269637", name: "trident hokkien noodles two pack", size: "400g",
    why: "🔴 주간 크론이 `trident **egg** noodles thin`을 집었다. Noodle Stir-fry는 **vegan·egg-free** 메뉴다. 이 상품은 Gluten만 선언한다" },
  "Roti": { sku: "6063137", name: "giannis roti street style", size: "7pack",
    why: "🔴 `shangri la roti chanai`가 **Egg**을 선언한다. Paneer & Chutney Wrap은 egg-free다. 이 상품은 Milk·Gluten만 선언한다" },
  "Rocket": { sku: "259428", name: "woolworths fresh salad baby rocket mini bag", size: "45g",
    why: "🔴 주간 크론이 `rocket kitchen **cheese & onion pasty**`(파이)를 집었다. dairy-free 메뉴에 우유 선언이 들어왔다. 재료는 루꼴라 잎이다" },
  "Quinoa": { sku: "717631", name: "macro organic quinoa tri colour", size: "500g",
    why: "크론 전후 모두 **쌀 혼합 제품**이었다(`tilda microwave rice basmati & quinoa`). 퀴노아여야 한다" },

  // ── 크론 실행 **전 상품으로 되돌린** 것. 게시된 수치가 전부 이 값들 위에 서 있었다.
  //    SKU는 이전 캐시의 이미지 URL에서 복원했다(`images/2010/<sku>.jpg`).
  "Cucumber": { sku: "281455", name: "fresh vegetable cucumbers telegraph", size: "each",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Salsa": { sku: "231416", name: "old el paso chunky salsa dip mild", size: "312g",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Lettuce": { sku: "137906", name: "fresh vegetable lettuce trio", size: "each",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Ham": { sku: "67511", name: "woolworths shaved ham manuka smoked", size: "200g",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Peas": { sku: "700435", name: "woolworths frozen baby peas ", size: "1kg",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Egg (glaze)": { sku: "774152", name: "woodland eggs free range size 6", size: "10pack",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Tortilla": { sku: "157288", name: "woolworths wraps wholemeal", size: "10pack",
    why: "🔴 되돌린 상품이 `farrah's **taco tortillas small**` 12팩이었다 — 이 키를 쓰는 메뉴 넷은 전부 **랩**이다(Chicken/Veggie/Falafel Wrap·Quesadilla). 타코용 소형 토르티야가 아니라 랩이어야 한다" },
  "Chicken Thigh": { sku: "248010", name: "bostocks organic chicken thighs ", size: "450g",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Mozzarella": { sku: "479232", name: "massimos mozzarella cheese ", size: "125g",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Roll": { sku: "6034908", name: "woolworths bread rolls country grain", size: "6pack",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Canned Tuna": { sku: "827211", name: "woolworths tuna lemon & pepper", size: "95g",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Tomato": { sku: "339889", name: "woolworths fresh tomatoes ", size: "600g",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Chicken": { sku: "82034", name: "woolworths nz chicken breasts skin on", size: "per kg",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Cheese Sauce": { sku: "104706", name: "continental cheese sauce four cheeses instant mix", size: "30g",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Soy Sauce": { sku: "198763", name: "lee kum kee soy sauce premium", size: "500mL",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Olives": { sku: "561968", name: "the olive lady olives green with garlic", size: "280g",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Dates": { sku: "274760", name: "cinderella dates pitted", size: "400g",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Bread": { sku: "275541", name: "molenberg sandwich bread original", size: "700g",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Vegetable Stock": { sku: "30856", name: "campbells real stock vegetable stock liquid", size: "1L",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Cooked Chicken": { sku: "6072668", name: "hellers craft roast chicken shredded", size: "250g",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Olive Oil": { sku: "698863", name: "woolworths olive oil classic", size: "1L",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Lemon": { sku: "626489", name: "the odd bunch fresh fruit lemons ", size: "1kg",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Boiled Egg": { sku: "511810", name: "hens choice eggs cage free mixed grade", size: "12pack",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Mayonnaise": { sku: "577209", name: "best foods mayonnaise real", size: "340mL",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
  "Probiotic Drink": { sku: "256106", name: "yakult probiotic light milk  drink", size: "5pack",
    why: "2026-08-23 크론 실행이 다른 상품으로 바꿔 놓아 되돌렸다. 고정하지 않으면 다음 주에 또 바뀐다" },
});

/**
 * 메뉴에는 없고 **가이드 레시피에만** 나오는 재료.
 *
 * 🔴 왜 필요한가 — 가격 캐시는 `menuData.json`의 재료만 채운다. 그래서 가이드의
 *    레시피(머핀·스콘·에너지볼·프리터)에만 나오는 재료는 캐시에 아예 없었고,
 *    원가를 파생시킬 수가 없어서 2026-08-23에 "약 $0.15/개" 같은 **추정치**가
 *    실측 표 옆에 실려 있었다. 추정을 지우는 대신, 추적 대상을 넓힌다.
 *
 * ⚠️ 여기 넣은 재료는 반드시 PINNED_SKUS와 PORTION_BASIS에도 있어야 한다 —
 *    팩 크기를 모르면 원가를 만들 수 없고, 고정하지 않으면 다음 크론이 다른 걸 집는다.
 */
export const RECIPE_ONLY_INGREDIENTS = [
  "Plain Flour",
  "Tahini",
  "Courgette",
  "Vanilla Essence",
];

Object.assign(PINNED_SKUS, {
  "Plain Flour":     { sku: "265266", name: "woolworths plain flour ", size: "1.5kg",
                       why: "머핀 레시피는 플레인 + 베이킹파우더다. 추적 중인 'Flour'는 셀프라이징이라 다른 상품이다" },
  Tahini:            { sku: "334757", name: "macro organic hulled tahini", size: "375g",
                       why: "🔴 **Woolworths에 해바라기씨 버터가 없다**(2026-08-23 확인). 에너지볼 레시피가 이미 '(or tahini)'라고 적고 있었고, 참깨는 넛프리다 — 다만 주요 알레르겐이라 본문에 밝힌다" },
  Courgette:         { sku: "107325", name: "fresh vegetable courgette ", size: "per kg",
                       why: "프리터의 주재료. 여름 채소라 겨울엔 kg당 값이 크게 오른다 — 그게 사실이므로 그대로 싣는다" },
  "Vanilla Essence": { sku: "6079760", name: "queen vanilla flavoured essence", size: "100mL",
                       why: "베이킹 레시피 둘이 쓴다. 넣지 않으면 원가가 '추적하는 것만 더한 값'이 되어 각주가 필요해진다" },
});

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
