import { PriceInfo } from "./types";
import { getIngredientCategory, CATEGORY_EMOJIS, SPECIFIC_EMOJIS } from "./utils";
import { shelfPrice } from "./priceSearch.mjs";
import { cacheFor, type PriceCache } from "./priceCaches";
import type { Island } from "@/data/promotions.types";

// Weekly price cache loaded at build time
// Refresh by running: POST /api/prices/refresh (re-fetches from Woolworths and redeploys)
const PRICE_CACHE: PriceCache = cacheFor("north");

/**
 * 가격 캐시에 없는 재료의 추정가. **반드시 "판매 단위 한 팩" 가격**이어야 한다.
 *
 * ⚠️ 2026-07-28: 여기에도 단위 불일치가 남아 있었다. `Apple: 0.80`과 `Carrot: 0.50`은
 * 개당 가격이었는데, 비용 계산은 이 값에 PORTION_FACTORS(팩 대비 비율)를 곱한다.
 * 그 결과 사과 한 개가 0.80 × 0.12 = 9.6c로 계산됐다.
 * PORTION_FACTORS를 팩 기준으로 재작성하면서 이 테이블을 같이 고치지 않아 남은 잔여물이다.
 * 새 항목을 넣을 때는 **마트에서 집어 드는 그 포장 하나의 값**을 넣을 것.
 */
const FALLBACK_PRICES: Record<string, number> = {
  Bread: 3.50, Marmite: 6.00, Cheese: 12.00, Butter: 8.50,
  Croissant: 4.00, Ham: 5.50, "Chicken Breast": 14.00, Lettuce: 4.00, Mayo: 6.50,
  "Sushi Rice": 4.50, Seaweed: 3.00, "Canned Tuna": 2.50, Cucumber: 3.00,
  Eggs: 9.00, Milk: 3.50, Spinach: 4.00, Pastry: 5.00,
  Pasta: 2.00, Pesto: 6.00, "Cherry Tomatoes": 4.50, "Olive Oil": 10.00,
  Apple: 5.99, // 1kg 팩 (이전 0.80은 사과 1개 값이었다)
  Carrot: 1.95, // 1kg 봉지 (이전 0.50은 당근 1개 값이었다)
  Hummus: 5.00,
  Yoghurt: 6.50, Muesli: 7.00, Crackers: 3.00, Tortilla: 4.50,
};

function getEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, em] of Object.entries(SPECIFIC_EMOJIS)) {
    if (lower.includes(key)) return em;
  }
  const cat = getIngredientCategory(name);
  return CATEGORY_EMOJIS[cat] ?? "🛒";
}

function getFallbackData(name: string): PriceInfo {
  let price = FALLBACK_PRICES[name];
  if (!price) {
    const key = Object.keys(FALLBACK_PRICES).find((k) =>
      k.toLowerCase().includes(name.toLowerCase())
    );
    price = key ? FALLBACK_PRICES[key] : 5.0;
  }
  return { price, image: getEmoji(name), name, source: "Est." };
}

function findInCache(name: string, cache: PriceCache = PRICE_CACHE): PriceInfo | null {
  // Exact match
  if (cache[name]) return cache[name].data;
  // Case-insensitive partial match
  const lower = name.toLowerCase();
  const key = Object.keys(cache).find((k) => k.toLowerCase() === lower);
  if (key) return cache[key].data;
  return null;
}

export function getIngredientPrice(name: string): PriceInfo {
  const cached = findInCache(name);
  if (cached) return { ...cached, image: getEmoji(name) };
  return getFallbackData(name);
}

export async function fetchIngredientPrice(name: string, island: Island = "north"): Promise<PriceInfo> {
  // Check static weekly cache first — 고른 섬의 캐시. 남섬 캐시에 없는 재료는 북섬 경로(아래)와 같다.
  const cached = findInCache(name, cacheFor(island)) ?? (island === "south" ? findInCache(name) : null);
  if (cached) return { ...cached, image: getEmoji(name) };

  // Live fallback (with 3s timeout) if not in cache
  try {
    // countdown.co.nz는 2024년 폐기돼 301로 넘어간다. 직접 woolworths를 부른다.
    // ⚠️ 이 경로는 캐시에 없는 재료에만 쓰이는 폴백이고, items[0]을 그대로 집는다.
    //    대표 상품 선별 규칙은 lib/priceSearch.mjs에 있으며 캐시 생성 시 적용된다.
    //    (scripts/update_prices.mjs) 폴백까지 규칙을 태우려면 그 모듈을 TS로 옮길 것.
    const url = `https://www.woolworths.co.nz/api/v1/products?target=search&search=${encodeURIComponent(name)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3000),
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "X-Requested-With": "OnlineShopping.WebApp",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return getFallbackData(name);
    const data = await res.json();
    const items = data?.products?.items;
    if (items?.length > 0) {
      const item = items[0];
      const price = shelfPrice(item?.price).regular;
      return {
        price: price > 0 ? price : 5.0,
        image: getEmoji(name),
        name: item?.name ?? name,
        source: "Woolworths NZ",
      };
    }
  } catch {
    // fallthrough
  }
  return getFallbackData(name);
}

export async function fetchBatchPrices(ingredients: string[], island: Island = "north"): Promise<PriceInfo[]> {
  // Most ingredients will be served from the weekly cache (synchronous, no network)
  return Promise.all(ingredients.map((ing) => fetchIngredientPrice(ing, island)));
}
