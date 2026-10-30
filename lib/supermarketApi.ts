import { PriceInfo } from "./types";
import { getIngredientCategory, CATEGORY_EMOJIS, SPECIFIC_EMOJIS } from "./utils";
import priceCacheRaw from "@/data/price_cache.json";

// Weekly price cache loaded at build time
type CacheEntry = { timestamp: number; data: PriceInfo };
const PRICE_CACHE = priceCacheRaw as Record<string, CacheEntry>;

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
  Bread: 4.00, Vegemite: 6.50, Cheese: 13.00, Butter: 9.00,
  Croissant: 4.50, Ham: 6.00, "Chicken Breast": 15.00, Lettuce: 4.50, Mayo: 7.00,
  "Sushi Rice": 5.00, Seaweed: 3.50, "Canned Tuna": 2.80, Cucumber: 3.50,
  Eggs: 9.50, Milk: 3.80, Spinach: 4.50, Pastry: 5.50,
  Pasta: 2.50, Pesto: 6.50, "Cherry Tomatoes": 5.00, "Olive Oil": 11.00,
  Apple: 5.50, // 1kg 봉지 — Aussie의 옛 0.90은 사과 1개 값이었다(Kiwi 07-28 수정과 같은 단위 문제)
  Carrot: 2.50, // 1kg 봉지 (옛 0.60은 당근 1개 값)
  Hummus: 5.50,
  Yoghurt: 7.00, Muesli: 8.00, Crackers: 3.50, Tortilla: 5.00,
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

function findInCache(name: string): PriceInfo | null {
  // Exact match
  if (PRICE_CACHE[name]) return PRICE_CACHE[name].data;
  // Case-insensitive partial match
  const lower = name.toLowerCase();
  const key = Object.keys(PRICE_CACHE).find((k) => k.toLowerCase() === lower);
  if (key) return PRICE_CACHE[key].data;
  return null;
}

export function getIngredientPrice(name: string): PriceInfo {
  const cached = findInCache(name);
  if (cached) return { ...cached, image: getEmoji(name) };
  return getFallbackData(name);
}

export async function fetchIngredientPrice(name: string): Promise<PriceInfo> {
  // Check static weekly cache first
  const cached = findInCache(name);
  if (cached) return { ...cached, image: getEmoji(name) };

  // Live fallback (with 3s timeout) if not in cache
  try {
    // ⚠️ 이 경로는 캐시에 없는 재료에만 쓰이는 폴백이고, 첫 상품을 그대로 집는다.
    //    대표 상품 선별 규칙은 lib/priceSearch.mjs에 있으며 캐시 생성 시 적용된다.
    const url = `https://www.woolworths.com.au/apis/ui/Search/products?searchTerm=${encodeURIComponent(name)}&pageNumber=1&pageSize=5&sortType=TraderRelevance`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3000),
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Accept-Language": "en-AU,en;q=0.9",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return getFallbackData(name);
    const data = await res.json();
    const item = data?.Products?.[0]?.Products?.[0];
    if (item) {
      // 정상가만 쓴다 — 특가 주에는 WasPrice가 정상가다(Kiwi shelfPrice와 같은 규칙).
      const regular = item.IsOnSpecial && item.WasPrice > 0 ? item.WasPrice : item.Price;
      return {
        price: regular > 0 ? regular : 5.0,
        image: getEmoji(name),
        name: item.Name ?? name,
        source: "Woolworths AU",
      };
    }
  } catch {
    // fallthrough
  }
  return getFallbackData(name);
}

export async function fetchBatchPrices(ingredients: string[]): Promise<PriceInfo[]> {
  // Most ingredients will be served from the weekly cache (synchronous, no network)
  return Promise.all(ingredients.map((ing) => fetchIngredientPrice(ing)));
}
