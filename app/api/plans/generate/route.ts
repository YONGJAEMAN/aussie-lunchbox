import { NextRequest, NextResponse } from "next/server";
import { buildWeeklyPlan, swapPlanDay, buildSharedPlan, PlanInputError } from "@/lib/planGenerator";
import { decodeSharedPlan, sanitizeWeek, normalizeLunchDays } from "@/lib/planShare";
import { fetchBatchPrices } from "@/lib/supermarketApi";
import { getMenuData, getSnackData } from "@/data/menuDataLoader";
import { GeneratePlanRequest, Locale, PrepStyle } from "@/lib/types";
import type { StoreId, Island } from "@/data/promotions.types";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { normalizePortionBand, normalizeExtraBoxes, portionsOf } from "@/lib/portionBands";

const VALID_STORES: StoreId[] = ["paknsave", "woolworths", "newworld"];

const VALID_PREP_STYLES: PrepStyle[] = ["no-cook", "make-ahead", "cook-fresh"];

const VALID_LOCALES: Locale[] = ["en", "ko", "zh"];

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  let body: GeneratePlanRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const mode = body?.mode === "swap" || body?.mode === "shared" ? body.mode : "generate";

  // Rate limit: 10 plan generations per IP per minute.
  // 하루 교체·공유 링크는 한 주를 새로 뽑는 것보다 자주 누른다 — 별도 버킷으로 센다.
  const allowed = mode === "generate"
    ? checkRateLimit(`plan:${ip}`, 10, 60 * 1000)
    : checkRateLimit(`plan-${mode}:${ip}`, 30, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
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

    // Sale 옵션 (선택) — 사용자가 토글 ON 시 사용
    const useSales = body.useSales === true;
    const saleStores: StoreId[] = Array.isArray(body.saleStores)
      ? body.saleStores
          .filter((s): s is StoreId => VALID_STORES.includes(s as StoreId))
          .slice(0, VALID_STORES.length)
      : [];
    // 전단을 고른 섬 — "south"만 받는다. 그 밖의 값·없음은 north(이 기능 전과 같다).
    const island: Island = body.island === "south" ? "south" : "north";

    // 조리 방식/보온병 필터 (선택)
    const prepStyles: PrepStyle[] = Array.isArray(body.prepStyles)
      ? body.prepStyles
          .filter((p): p is PrepStyle => VALID_PREP_STYLES.includes(p as PrepStyle))
          .slice(0, VALID_PREP_STYLES.length)
      : [];
    const thermosOnly = body.thermosOnly === true;

    // 나이대별 양 (선택) — 모르는 값은 기준(5–12세)으로 둔다. 공유 링크는 링크 안의 값을 쓴다.
    // 같은 식단을 더 싸는 도시락(2번부터). 한도를 넘으면 자르고, 모르는 나이대는 기준으로 둔다.
    const portions = portionsOf(normalizePortionBand(body.portionBand), normalizeExtraBoxes(body.extraBoxes));
    // 도시락을 싸는 요일. 모양이 어긋나면 다섯 날 전부로 둔다.
    const lunchDays = normalizeLunchDays(body.lunchDays);

    const menus = getMenuData(locale);
    const snackData = getSnackData();

    if (mode === "shared") {
      const shared = decodeSharedPlan(body.share);
      if (!shared) {
        return NextResponse.json({ error: "Invalid share link", code: "BAD_INPUT" }, { status: 400 });
      }
      const result = await buildSharedPlan(menus, snackData, shared, (ingredients) => fetchBatchPrices(ingredients, shared.island ?? "north"));
      return NextResponse.json(result);
    }

    if (mode === "swap") {
      const week = sanitizeWeek(body.week);
      if (!week) {
        return NextResponse.json({ error: "Invalid plan", code: "BAD_INPUT" }, { status: 400 });
      }
      const result = await swapPlanDay(
        menus,
        snackData,
        week,
        typeof body.dayIndex === "number" ? body.dayIndex : -1,
        {
          allergies,
          excluded: excludedIngredients,
          favorites: favoriteIngredients,
          leftover: fridgeLeftover,
          saleOptions: useSales && saleStores.length > 0 ? { useSales, saleStores, island } : undefined,
          prepOptions: prepStyles.length > 0 || thermosOnly ? { prepStyles, thermosOnly } : undefined,
          band: portions,
          lunchDays,
          island,
        },
        (ingredients) => fetchBatchPrices(ingredients, island),
      );
      return NextResponse.json(result);
    }

    const result = await buildWeeklyPlan(
      menus,
      allergies,
      excludedIngredients,
      favoriteIngredients,
      fridgeLeftover,
      snackData,
      (ingredients) => fetchBatchPrices(ingredients, island),
      useSales && saleStores.length > 0
        ? { useSales, saleStores, island }
        : undefined,
      prepStyles.length > 0 || thermosOnly
        ? { prepStyles, thermosOnly }
        : undefined,
      portions,
      lunchDays,
      island,
    );

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PlanInputError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code === "NO_ALTERNATIVE" ? 409 : 400 },
      );
    }
    const message = err instanceof Error ? err.message : "Failed to generate plan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
