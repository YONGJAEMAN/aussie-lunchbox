import { NextRequest, NextResponse } from "next/server";
import { buildWeeklyPlan } from "@/lib/planGenerator";
import { fetchBatchPrices } from "@/lib/supermarketApi";
import { getMenuData, getSnackData } from "@/data/menuDataLoader";
import { GeneratePlanRequest, Locale } from "@/lib/types";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const VALID_LOCALES: Locale[] = ["en", "ko", "zh"];

export async function POST(req: NextRequest) {
  // Rate limit: 10 plan generations per IP per minute
  const ip = getClientIp(req);
  if (!checkRateLimit(`plan:${ip}`, 10, 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body: GeneratePlanRequest = await req.json();

    // Validate locale
    const locale = VALID_LOCALES.includes(body.locale as Locale)
      ? (body.locale as Locale)
      : "en";

    // Validate array inputs
    const allergies = Array.isArray(body.allergies) ? body.allergies.slice(0, 20) : [];
    const excludedIngredients = Array.isArray(body.excludedIngredients)
      ? body.excludedIngredients.slice(0, 50)
      : [];
    const favoriteIngredients = Array.isArray(body.favoriteIngredients)
      ? body.favoriteIngredients.slice(0, 50)
      : [];
    const fridgeLeftover =
      typeof body.fridgeLeftover === "string"
        ? body.fridgeLeftover.slice(0, 500)
        : "";

    const menus = getMenuData(locale);
    const snackData = getSnackData();

    const result = await buildWeeklyPlan(
      menus,
      allergies,
      excludedIngredients,
      favoriteIngredients,
      fridgeLeftover,
      snackData,
      (ingredients) => fetchBatchPrices(ingredients)
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate plan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
