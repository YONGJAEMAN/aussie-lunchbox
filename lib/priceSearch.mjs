/**
 * 재료명 → Woolworths AU 상품 선별 규칙.
 *
 * 배경 (2026-08-06):
 * 기존 수집기는 검색 결과의 첫 상품(`Products[0].Products[0]`)을 무조건 집었다.
 * 검색 랭킹 상단에 비식품·가공식품이 오는 경우가 많아 이런 값이 캐시에 들어갔다:
 *   Ripe Bananas → "Banana Rack, Banana Hanger, Cotton Rope..."  $34.28 (바나나 걸이)
 *   Berries      → "The Man Shake Mixed Berry Powder"            $40.00 (단백질 셰이크)
 *   GF Sausages  → "JOYBUY Sausage filling machine"              $27.63 (제조기)
 *   Chicken/Tofu → "Avi One Chicken Toy Glockenspiel"            $23.88 (새 장난감)
 *   Orange       → "Daily Juice Co Pulp Free Orange Juice"       $7.80  (주스)
 * 이 값들이 도시락 1통 최대 $12.91을 만들고 있었다.
 *
 * 규칙 (Kiwi에서 검증된 것을 AU API에 맞춰 이식):
 *   1) SEARCH_TERMS로 모호한 재료명을 구체적 검색어로 치환
 *   2) AVOID_TOKENS가 이름에 있으면 후보에서 제외 (비식품·가공식품·업소용 등)
 *   3) REQUIRE_TOKENS(없으면 재료명에서 유도)를 이름에 포함해야 후보로 인정
 *   4) 남은 후보 중 **가격 중앙값** 상품을 선택
 *      — 최저가는 소용량, 최고가는 프리미엄으로 치우친다. 우리가 원하는 것은
 *        "보통 가정이 사는 값"이므로 중앙값이 가장 방어 가능하다.
 *
 * ⚠️ Kiwi의 PINNED_SKUS는 가져오지 않았다. NZ 재고코드라 AU에서 다른 상품을 가리킨다.
 *    AU 코드를 확인하지 않고 지어내지 않는다.
 */

export const SEARCH_BASE = "https://www.woolworths.com.au/apis/ui/Search/products";

/** 검색어를 바꿔야 엉뚱한 상품이 안 잡히는 재료들 */
export const SEARCH_TERMS = {
  // ── 실제 오매칭이 확인돼 추가한 것들 (2026-08-06) ──
  Orange: "oranges fresh", // ← 오렌지주스
  Berries: "frozen mixed berries", // ← 단백질 셰이크 파우더
  "Ripe Bananas": "cavendish bananas", // ← 바나나 걸이(비식품)
  "GF Sausages": "gluten free sausages", // ← 소시지 제조기(비식품)
  "Chicken/Tofu": "chicken breast fillets", // ← 새 장난감(비식품)
  "Canned Tuna": "tuna in springwater 95g", // ← Value 멀티팩
  Ham: "shaved ham", // ← 통다리 햄
  "Tuna/Chicken/Avocado": "tuna in springwater 95g",
  "Ham/Bacon": "shaved ham",

  // ── 일반적으로 모호한 재료명 ──
  Bread: "sandwich bread loaf",
  "Gluten-Free Bread": "gluten free bread loaf",
  Croissant: "croissants",
  Pastry: "puff pastry",
  "Puff Pastry": "puff pastry",
  Cheese: "tasty cheese block",
  "Cheese Block": "tasty cheese block",
  Oil: "canola oil",
  "Olive Oil": "olive oil",
  Yoghurt: "greek yoghurt tub",
  Milk: "full cream milk",
  Butter: "butter block",
  Egg: "free range eggs 12",
  Eggs: "free range eggs 12",
  "Boiled Eggs": "free range eggs 12",
  Chicken: "chicken breast fillets",
  "Chicken Breast": "chicken breast fillets",
  "Beef Mince": "beef mince",
  "Soy Sauce": "soy sauce",
  "Curry Paste": "curry paste",
  "Curry Spices": "curry powder",
  Apple: "apples fresh",
  Banana: "cavendish bananas",
  Carrot: "carrots fresh",
  Cucumber: "cucumber lebanese",
  Tomato: "tomatoes fresh",
  "Cherry Tomatoes": "cherry tomatoes punnet",
  Lettuce: "lettuce iceberg",
  Mandarin: "mandarins fresh",
  Celery: "celery fresh",
  Potato: "potatoes washed",
  Onion: "brown onions",
  Lemon: "lemons fresh",
  Croutons: "croutons",
  Breadsticks: "grissini breadsticks",
  Meatballs: "beef meatballs fresh",
  Chickpeas: "chickpeas can 400g",
  "Red Lentils": "red lentils dried",
  Coconut: "desiccated coconut",
  "Desiccated Coconut": "desiccated coconut",
  "Dried Apricots": "dried apricots",
  Falafel: "falafel",
  Cocoa: "cocoa powder baking",
  "Corn Chips": "corn chips plain",
  "Rice Bubbles": "rice bubbles cereal",
  "Cheese Sauce": "cheese sauce jar",
  "Golden Syrup": "golden syrup",
  Vermicelli: "rice vermicelli noodles",
  Marmite: "vegemite", // AU는 Vegemite가 표준
  // ── 2차 검수(2026-08-06) ──
  Hummus: "hommus", // ⚠️ AU는 "hommus" 철자가 표준이라 "hummus"로는 0건이 나온다
  "Pesto/Mayo": "green pesto",
  "GF Crackers": "gluten free crackers",
  "Pastry Cases": "shortcrust pastry sheets",
  "Rice Crackers": "rice crackers plain",
  Muffin: "english muffins",
  "Muffin Splits": "english muffins",
  Grapes: "seedless grapes",
  Mince: "beef mince regular",
  Rice: "long grain white rice",
  "Sausage Meat": "sausage mince",
  "Muesli (Nut-free)": "natural muesli", // ⚠️ "fruit free"(무건과일) 제품이 잡힌다. 견과류는 AVOID가 막는다
  Muesli: "muesli cereal",
  Mozzarella: "mozzarella shredded cheese",
  Macaroni: "macaroni elbow pasta",
  "Kidney Beans": "red kidney beans canned",
  Turkey: "turkey breast sliced",
  "Roast Beef": "roast beef sliced",
  Noodles: "egg noodles dried",
  Spices: "mixed spice ground",
  Herbs: "mixed herbs dried",
  // ── 3차 검수 후 남은 매칭 실패 (2026-08-06) ──
  "Beef Patty": "beef burger patties",
  "Boiled Egg": "free range eggs 12",
  "Egg (glaze)": "free range eggs 12",
  "Chicken Skewers": "chicken kebabs",
  "Cooked Chicken": "chicken breast cooked sliced",
  // ⚠️ Cheese Sauce는 검색어를 고치지 않는다. Woolworths AU에 병입 치즈소스가
  //    없고 분말 사셰만 잡힌다. 매칭 실패로 두고 폴백가를 쓰는 편이 정직하다
  //    (Kiwi도 같은 이유로 같은 결론이었다).
};

/** 이름에 이게 들어가면 후보에서 뺀다 */
export const AVOID_TOKENS = [
  // ── 비식품 (AU 검색에서 실제로 잡혔다) ──
  "hanger",
  "rack",
  "machine",
  "stuffer",
  "filling machine",
  "toy",
  "glockenspiel",
  "storage",
  "container",
  "keeper",
  "slicer",
  "peeler",
  "wipes",
  "shampoo",
  "body wash",
  "candle",
  "air freshener",
  "cutlery",
  "bag ",
  // ── 재료가 아니라 완제품·가공식품 ──
  "juice", // Orange → 오렌지주스
  "powder", // Berries → 셰이크 파우더 (cocoa powder는 SEARCH_TERMS로 따로 잡는다)
  "shake",
  "smoothie",
  "cordial",
  "sports drink",
  "in syrup",
  "cup a soup",
  "easy mac",
  "nutella",
  "mints",
  "lollies",
  "life savers",
  "chips flavoured",
  "loaf slices",
  "banana bread",
  "cake",
  "biscuit",
  "ready to bake",
  "meal sauce",
  "frozen meal",
  "pasta meal",
  "snack pot",
  // ── 규격·용도가 다른 것 ──
  "value pack", // Canned Tuna → 멀티팩
  "bulk",
  "catering",
  "platter",
  "hamper",
  "gift",
  "wagyu",
  "infant",
  "baby food",
  "pet ",
  "dog ",
  "cat ",
  // ── 2차 검수(2026-08-06)에서 걸린 것들 ──
  "mincer", // Sausage Meat → 핸드크랭크 고기 분쇄기
  "crank",
  "grinder",
  "plant based", // Mince → Impossible 식물성
  "made with plants", // Mozzarella → 비유제품
  "dairy free", // 대표가가 아님 (해당 재료는 별도 키로 관리)
  "fruit & nut", // 🔴 Muesli (Nut-free) → 견과류 제품. 넛프리 사이트에서 치명적
  "with nuts",
  "salad topper", // Kidney Beans → 스낵팟
  "snack time",
  "single snack", // Macaroni → 마카로니치즈 간편식
  "macaroni cheese",
  "flavour ", // Rice → 치킨맛 즉석밥
  "flavoured",
  "cheesy bite", // Marmite → Vegemite 변종
  "stir fry sauce",
  // ── 3차 검수(2026-08-06) ──
  "seeds", // Cos Lettuce → 상추 씨앗
  "recipe base", // Beef Mince → 시즈닝 소스
  "with croutons", // Croutons → 크루통 든 수프
  "soup",
  "apricot balls", // Dried Apricots → 가공 스낵볼
  "loadables", // Corn Chips → 조미 변종
  // ── 4차 검수: 비교단가가 있는데도 비식품인 것들 ──
  // "CupString 없으면 비식품" 규칙을 통과해 버렸다. 주방기구는 낱개 단가가 붙는다.
  "stainless steel", // Cooked Chicken → 에어프라이어 로스트 포크 $26.06
  "air fryer",
  "fork",
  "utensil",
  "skewers metal",
];

/**
 * AVOID_TOKENS는 전역이라 **재료명 자체와 충돌할 수 있다.**
 * 1차 검수에서 "muffin"을 넣었더니 `Muffin` 재료가 후보 0이 됐다.
 * 재료명·검색어에 그 토큰이 들어 있으면 그 재료에 한해 무시한다.
 */
export function avoidTokensFor(ingredient) {
  const self = `${ingredient} ${SEARCH_TERMS[ingredient] ?? ""}`.toLowerCase();
  return AVOID_TOKENS.filter((t) => !self.includes(t.trim()));
}

/**
 * 후보 중 최저가의 몇 배까지를 "같은 규격"으로 볼지.
 * 예) shaved ham $4대와 leg ham 통다리 $24는 같은 물건이 아니다.
 */
export const TRIM_RATIO = 2.5;

/** 재료명만으로 유도하기 어려운 필수 토큰 */
export const REQUIRE_TOKENS = {
  Bread: ["bread"],
  "Soy Sauce": ["soy"],
  "Curry Paste": ["curry"],
  Croissant: ["croissant"],
  Pastry: ["pastry"],
  Cheese: ["cheese"],
  "Cheese Block": ["cheese"],
  Yoghurt: ["yoghurt"],
  Egg: ["egg"],
  Eggs: ["egg"],
  "Boiled Eggs": ["egg"],
  Berries: ["berries"],
  "Ripe Bananas": ["banana"],
  "Chicken/Tofu": ["chicken"],
  "Canned Tuna": ["tuna"],
  "Tuna/Chicken/Avocado": ["tuna"],
  "Ham/Bacon": ["ham"],
  Marmite: ["vegemite"],
  Hummus: ["hommus"],
  "Muesli (Nut-free)": ["muesli"],
  Muffin: ["muffin"],
  "Muffin Splits": ["muffin"],
  "Pastry Cases": ["pastry"],
  "Pesto/Mayo": ["pesto"],
  "Sausage Meat": ["sausage"],
  Mince: ["beef", "mince"],
  Rice: ["rice"],
  "Beef Patty": ["patt"],
  "Boiled Egg": ["egg"],
  "Egg (glaze)": ["egg"],
  "Chicken Skewers": ["chicken"],
  "Cooked Chicken": ["chicken"],
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
 * 이 상품의 Price가 **낱개 하나 값**인지 판정한다.
 *
 * ⚠️ `/1EA`만 보면 안 된다 (2026-08-06 검수에서 걸렸다):
 *     Orange Navel            Price $0.83  CupString "$0.83 / 1EA"  → 낱개 1개
 *     Ciabatta Rolls (4개입)  Price $3.75  CupString "$0.94 / 1EA"  → 4개들이 한 팩
 *   `/1EA`는 **비교단가 표기**일 뿐이다. 낱개 판정은 비교단가가 Price와 같을 때만 성립한다.
 *
 * AU는 신선농산물이 낱개로 팔려 이 구분이 필수다 (NZ는 대부분 팩·kg 단위).
 */
export function isPricedPerEach(cupString, price) {
  const s = String(cupString ?? "").trim();
  const m = s.match(/^\$?([\d.]+)\s*\/\s*1\s*EA$/i);
  if (!m) return false;
  const cup = Number(m[1]);
  const p = Number(price);
  if (!Number.isFinite(cup) || !Number.isFinite(p) || p <= 0) return false;
  return Math.abs(cup - p) < 0.01;
}

/**
 * 검색 결과에서 대표 상품 하나를 고른다. 후보가 없으면 null.
 * @param products Woolworths AU API에서 평탄화한 상품 배열
 * @param ingredient 원본 재료명
 */
export function pickRepresentative(products, ingredient) {
  const tokens = deriveTokens(ingredient);
  const avoid = avoidTokensFor(ingredient);
  const priceOf = (p) => Number(p?.Price ?? 0);
  const valid = (products ?? [])
    .filter((p) => p?.IsAvailable !== false && priceOf(p) > 0)
    // 🔑 비교단가(CupString)가 없는 것은 식품이 아니다. 3차 검수에서 비식품이
    //    **전부** 이 조건 하나로 걸러졌다 — 햄버거 프레스, 계란 몰드, 소스 병,
    //    로티세리 꼬치포크, 차완무시 잔, 상추 씨앗. 마트가 단위가격을 표시할
    //    의무가 있는 것은 식품이기 때문이다.
    .filter((p) => String(p?.CupString ?? "").trim() !== "")
    .filter((p) => {
      const n = String(p.Name ?? "").toLowerCase();
      if (avoid.some((a) => n.includes(a))) return false;
      return tokens.every((t) => n.includes(t));
    })
    .slice(0, 12);

  if (!valid.length) return null;
  const sorted = [...valid].sort((a, b) => priceOf(a) - priceOf(b));
  // 규격이 다른 상품(통다리 햄, 업소용 대용량 등)을 먼저 잘라낸 뒤 중앙값을 고른다.
  const floor = priceOf(sorted[0]);
  const trimmed = sorted.filter((p) => priceOf(p) <= floor * TRIM_RATIO);
  return trimmed[Math.floor(trimmed.length / 2)];
}
