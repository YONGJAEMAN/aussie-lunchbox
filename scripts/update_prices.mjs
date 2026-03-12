#!/usr/bin/env node
/**
 * Aussie Lunchbox — Weekly Price Updater
 * Fetches ingredient prices from Woolworths AU and saves to data/price_cache.json
 *
 * Usage: node scripts/update_prices.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CACHE_PATH = join(ROOT, "data", "price_cache.json");

// AU fallback prices (AUD)
const FALLBACK_PRICES = {
  Bread: 4.00, Vegemite: 6.50, Cheese: 13.00, Butter: 9.00,
  Croissant: 4.50, Ham: 6.00, "Chicken Breast": 15.00, Lettuce: 4.50, Mayo: 7.00,
  "Sushi Rice": 5.00, Seaweed: 3.50, "Canned Tuna": 2.80, Cucumber: 3.50,
  Eggs: 9.50, Milk: 3.80, Spinach: 4.50, Pastry: 5.50,
  Pasta: 2.50, Pesto: 6.50, "Cherry Tomatoes": 5.00, "Olive Oil": 11.00,
  Apple: 0.90, Carrot: 0.60, Hummus: 5.50,
  Yoghurt: 7.00, Muesli: 8.00, Crackers: 3.50, Tortilla: 5.00,
  Avocado: 2.50, Bacon: 8.00, Banana: 0.40, Berries: 5.00,
  Capsicum: 2.50, Mango: 2.00, "Sweet Potato": 1.50, Tomato: 1.00,
  Rice: 3.50, "Peanut Butter": 6.00, Jam: 4.50, "Cream Cheese": 5.50,
};

function getFallback(name) {
  let price = FALLBACK_PRICES[name];
  if (!price) {
    const key = Object.keys(FALLBACK_PRICES).find((k) =>
      k.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(k.toLowerCase())
    );
    price = key ? FALLBACK_PRICES[key] : 5.0;
  }
  return { price, image: "", name, source: "Est. (Fallback)" };
}

function loadMenuIngredients() {
  const raw = readFileSync(join(ROOT, "data", "menuData.json"), "utf-8");
  const data = JSON.parse(raw);
  const ingredients = new Set();

  const menus = data?.MENU_DATA?.en ?? [];
  for (const menu of menus) {
    for (const ing of menu.ingredients ?? []) ingredients.add(ing);
  }

  const snacks = data?.SNACK_DATA ?? {};
  for (const items of Object.values(snacks)) {
    for (const snack of items) {
      for (const ing of snack.ingredients ?? []) ingredients.add(ing);
    }
  }

  return [...ingredients];
}

async function fetchWoolworths(name) {
  const url = `https://www.woolworths.com.au/apis/ui/Search/products?searchTerm=${encodeURIComponent(name)}&pageNumber=1&pageSize=5&sortType=TraderRelevance`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-AU,en;q=0.9",
        "Referer": "https://www.woolworths.com.au/shop/search/products?searchTerm=" + encodeURIComponent(name),
        "x-requested-with": "XMLHttpRequest",
      },
    });

    if (!res.ok) {
      console.warn(`  ⚠️  ${name}: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const product = data?.Products?.[0]?.Products?.[0];
    if (product) {
      const price = product.SalePrice ?? product.Price;
      return {
        price: price ? parseFloat(String(price)) : 5.0,
        image: product.MediumImageFile ?? "",
        name: product.Name ?? name,
        source: "Woolworths AU",
      };
    }
  } catch (err) {
    console.warn(`  ⚠️  ${name}: ${err.message}`);
  }
  return null;
}

async function main() {
  console.log("🛒 Aussie Lunchbox — Woolworths AU Price Updater\n");

  const ingredients = loadMenuIngredients();
  console.log(`📋 Found ${ingredients.length} ingredients to fetch\n`);

  // Load existing cache
  let cache = {};
  try {
    cache = JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
  } catch {
    // Start fresh
  }

  const now = Date.now();
  let successCount = 0;
  let fallbackCount = 0;

  // Process with small delay to avoid rate limiting
  for (let i = 0; i < ingredients.length; i++) {
    const name = ingredients[i];
    process.stdout.write(`[${i + 1}/${ingredients.length}] ${name}... `);

    const result = await fetchWoolworths(name);

    if (result) {
      cache[name] = { timestamp: now, data: result };
      successCount++;
      console.log(`✅ $${result.price.toFixed(2)}`);
    } else {
      const fallback = getFallback(name);
      cache[name] = { timestamp: now, data: fallback };
      fallbackCount++;
      console.log(`💾 fallback $${fallback.price.toFixed(2)}`);
    }

    // Small delay between requests
    if (i < ingredients.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Save cache
  mkdirSync(join(ROOT, "data"), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");

  console.log(`\n✅ Fetched from Woolworths: ${successCount}`);
  console.log(`💾 Fallback used: ${fallbackCount}`);
  console.log(`📁 Saved to data/price_cache.json`);
}

main();
