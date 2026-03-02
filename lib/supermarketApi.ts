import { PriceInfo } from "./types";
import { getIngredientCategory, CATEGORY_EMOJIS, SPECIFIC_EMOJIS } from "./utils";
import priceCacheRaw from "@/data/price_cache.json";

// Weekly price cache loaded at build time
// Refresh by running: POST /api/prices/refresh (re-fetches from Woolworths and redeploys)
type CacheEntry = { timestamp: number; data: PriceInfo };
const PRICE_CACHE = priceCacheRaw as Record<string, CacheEntry>;

// AU fallback prices (AUD) used when Woolworths API is unavailable
const FALLBACK_PRICES: Record<string, number> = {
  Bread: 4.00, Vegemite: 6.50, Cheese: 13.00, Butter: 9.00,
  Croissant: 4.50, Ham: 6.00, "Chicken Breast": 15.00, Lettuce: 4.50, Mayo: 7.00,
  "Sushi Rice": 5.00, Seaweed: 3.50, "Canned Tuna": 2.80, Cucumber: 3.50,
  Eggs: 9.50, Milk: 3.80, Spinach: 4.50, Pastry: 5.50,
  Pasta: 2.50, Pesto: 6.50, "Cherry Tomatoes": 5.00, "Olive Oil": 11.00,
  Apple: 0.90, Carrot: 0.60, Hummus: 5.50,
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
  if (PRICE_CACHE[name]) return PRICE_CACHE[name].data;
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

  // Live fallback: Woolworths AU search API
  try {
    const url = `https://www.woolworths.com.au/apis/ui/Search/products?searchTerm=${encodeURIComponent(name)}&pageNumber=1&pageSize=5&sortType=TraderRelevance`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-AU,en;q=0.9",
        "Referer": "https://www.woolworths.com.au/",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return getFallbackData(name);
    const data = await res.json();
    // Woolworths API response: { Products: [{ Products: [{ Name, Price, SalePrice }] }] }
    const product = data?.Products?.[0]?.Products?.[0];
    if (product) {
      const price = product.SalePrice ?? product.Price;
      return {
        price: price ? parseFloat(String(price)) : 5.0,
        image: getEmoji(name),
        name: product.Name ?? name,
        source: "Woolworths AU",
      };
    }
  } catch {
    // fallthrough to fallback
  }
  return getFallbackData(name);
}

export async function fetchBatchPrices(ingredients: string[]): Promise<PriceInfo[]> {
  return Promise.all(ingredients.map((ing) => fetchIngredientPrice(ing)));
}
