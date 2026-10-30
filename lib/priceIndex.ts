import INDEX from "@/data/priceIndex.json";
import SOURCES from "@/data/priceIndexSources.json";

/**
 * 가격지수(고정 장바구니) — 페이지·CSV·가드가 같은 값을 읽는 자리.
 *
 * 🔴 Kiwi는 세 체인 비교였다. Aussie(2026-10-30)는 **Woolworths 한 체인의 고정 장바구니**다 —
 *    Coles는 상품 페이지 넷째부터 Imperva 봇 확인이 떠서 추적하지 않는다(우회하지 않는다).
 *    그래서 「어느 마트가 싼가」를 말하지 않는다. 말할 수 있는 것은 「같은 20개가 지금 얼마인가」와
 *    시간이 지나며 어떻게 변하는가뿐이다.
 * 🔴 합계는 **값이 있는 행만** 더하고, 몇 행을 더했는지 같이 낸다. 없는 값을 0으로 세면 싸 보인다.
 */

export type IndexItem = { name: string; category: string; unit: string; note: string; woolworths: number | null };
type Source = { sku: string; pinnedName: string; pinnedSize: string };

const IDX = INDEX as unknown as {
  lastUpdated: string | null; woolworthsUpdated: string | null; woolworthsMethod: string; items: IndexItem[];
};
const SRC = SOURCES as unknown as {
  store: string; coles: { tracked: boolean; checkedOn: string; reason: string }; items: Record<string, Source>;
};

export const indexItems = (): IndexItem[] => IDX.items;
export const indexUpdated = (): string | null => IDX.woolworthsUpdated;
export const indexMethod = (): string => IDX.woolworthsMethod;
export const indexStore = (): string => SRC.store;
export const colesStatus = () => SRC.coles;
export const sourceFor = (name: string): Source | undefined => SRC.items[name];

export function basketTotal(): { total: number; counted: number; of: number } {
  const priced = IDX.items.filter((i) => typeof i.woolworths === "number" && i.woolworths > 0);
  const total = priced.reduce((s, i) => s + (i.woolworths as number), 0);
  return { total: Math.round(total * 100) / 100, counted: priced.length, of: IDX.items.length };
}

export const CATEGORIES = [...new Set(IDX.items.map((i) => i.category))];
