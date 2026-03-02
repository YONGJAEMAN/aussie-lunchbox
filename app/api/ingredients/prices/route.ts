import { NextRequest, NextResponse } from "next/server";
import { fetchBatchPrices } from "@/lib/supermarketApi";

const MAX_ITEMS = 100;
const MAX_ITEM_LENGTH = 100;

export async function GET(req: NextRequest) {
  const items = req.nextUrl.searchParams.get("items");
  if (!items) {
    return NextResponse.json({ error: "items query param required" }, { status: 400 });
  }

  const ingredients = items
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_ITEMS);

  if (ingredients.some((i) => i.length > MAX_ITEM_LENGTH)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const prices = await fetchBatchPrices(ingredients);
  return NextResponse.json({ prices });
}
