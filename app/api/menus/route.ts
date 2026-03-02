import { NextRequest, NextResponse } from "next/server";
import { getMenuData, getSnackData } from "@/data/menuDataLoader";
import { Locale } from "@/lib/types";

export async function GET(req: NextRequest) {
  const locale = (req.nextUrl.searchParams.get("locale") ?? "en") as Locale;
  const menus = getMenuData(locale);
  const snacks = getSnackData();
  return NextResponse.json({ menus, snacks });
}
