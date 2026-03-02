import { PriceInfo } from "./types";
import { getIngredientCategory, CATEGORY_EMOJIS, SPECIFIC_EMOJIS } from "./utils";
import priceCacheRaw from "@/data/price_cache.json";

// Weekly price cache loaded at build time
// Refresh by running: POST /api/prices/refresh (re-fetches from Woolworths and redeploys)
type CacheEntry = { timestamp: number; data: PriceInfo };
const PRICE_CACHE = priceCacheRaw as Record<string, CacheEntry>;

const FALLBACK_PRICES: Record<string, number> = {
  Bread: 3.50, Marmite: 6.00, Cheese: 12.00, Butter: 8.50,
  Croissant: 4.00, Ham: 5.50, "Chicken Breast": 14.00, Lettuce: 4.00, Mayo: 6.50,
  "Sushi Rice": 4.50, Seaweed: 3.00, "Canned Tuna": 2.50, Cucumber: 3.00,
  Eggs: 9.00, Milk: 3.50, Spinach: 4.00, Pastry: 5.00,
  Pasta: 2.00, Pesto: 6.00, "Cherry Tomatoes": 4.50, "Olive Oil": 10.00,
  Apple: 0.80, Carrot: 0.50, Hummus: 5.00,
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
    const url = `https://www.woolworths.com.au/api/v1/products?target=search&search=${encodeURIComponent(name)}`;
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
      const price = item?.price?.salePrice;
      return {
        price: price ? parseFloat(price) : 5.0,
        image: getEmoji(name),
        name: item?.name ?? name,
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
