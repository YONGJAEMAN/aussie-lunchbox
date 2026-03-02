import rawData from "./menuData.json";
import { MenuItem, SnackData, Locale } from "@/lib/types";

const data = rawData as {
  MENU_DATA: Record<string, MenuItem[]>;
  SNACK_DATA: SnackData;
};

export function getMenuData(locale: Locale): MenuItem[] {
  return data.MENU_DATA[locale] ?? data.MENU_DATA["en"] ?? [];
}

export function getSnackData(): SnackData {
  return data.SNACK_DATA;
}
