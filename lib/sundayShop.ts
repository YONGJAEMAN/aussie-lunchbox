/**
 * Term 1 글의 "일요일 장보기 목록" 총액 — **가격 데이터에서 만든다.**
 *
 * 🔴 2026-08-24까지 본문에 `about **NZ$60**`이라고 손으로 적혀 있었다. 그 값은
 * 매주 가격이 움직일 때마다 조용히 낡고, 가드는 밴드(55~65)로만 지켜서 실제로는
 * "아직 틀리지 않았다"만 확인하고 있었다. Pak'nSave 열을 갱신하자 $54.11이 되어
 * 밴드를 벗어났다 — 즉 그동안은 운이었다.
 *
 * 목록 자체는 본문에 있고, 여기서는 **줄 → 가격 항목**만 정의한다.
 * 본문에 줄이 추가되면 가드가 매핑 없는 줄에서 멈춘다.
 */
import index from "@/data/priceIndex.json";
import priceCache from "@/data/price_cache.json";

type IndexRow = { name: string; paknsave?: number | null; countdown?: number | null };
type CacheRow = { data?: { price: number }; price?: number };

/** 본문 한 줄 → [priceIndex 품목명 (또는 `__CACHE:` 접두), 곱할 수량] */
export const SUNDAY_SHOP: Record<string, [string, number]> = {
  "Wholegrain bread × 1 loaf": ["Wholegrain Bread (700g)", 1],
  "Cheese block (Edam or Colby) × 1": ["Cheese Block (500g)", 1],
  "Plain Greek yoghurt × 1 tub": ["Yoghurt (1kg)", 1],
  "Cucumbers × 2": ["Cucumber", 2],
  "Carrots × 1kg bag": ["Carrots (1kg)", 1],
  "Cherry tomatoes × 1 punnet": ["Cherry Tomatoes (180g)", 1],
  "Apples × 6": ["Apples (1kg)", 0.95],
  "Bananas × 6": ["Bananas (1kg)", 0.9],
  "Sliced chicken × 1 pack": ["Sliced Chicken (200g)", 1],
  "Hummus × 1 tub": ["Hummus (220g)", 1],
  // priceIndex에 없는 품목만 price_cache(Woolworths)로 보완한다.
  "Mandarins (in season) × 6": ["__CACHE:Mandarin", 0.6],
};

function priceOf(key: string): number {
  if (key.startsWith("__CACHE:")) {
    const row = (priceCache as Record<string, CacheRow>)[key.slice(8)];
    const p = row?.data?.price ?? row?.price;
    if (p == null) throw new Error(`price_cache에 없는 품목: ${key}`);
    return p;
  }
  const row = (index.items as IndexRow[]).find((i) => i.name === key);
  if (!row) throw new Error(`priceIndex에 없는 품목: ${key}`);
  // Pak'nSave 값이 없으면 더 비싼 Woolworths 값을 쓴다 — 총액을 과소평가하지 않기 위해서다.
  const p = row.paknsave ?? row.countdown;
  if (p == null) throw new Error(`가격이 없는 품목: ${key}`);
  return p;
}

/** 목록 줄들의 실제 합계 (NZD) */
export function sundayShopTotal(lines: string[] = Object.keys(SUNDAY_SHOP)): number {
  return lines.reduce((sum, line) => {
    const entry = SUNDAY_SHOP[line];
    if (!entry) throw new Error(`장보기 목록에 매핑 없는 줄: ${line}`);
    return sum + priceOf(entry[0]) * entry[1];
  }, 0);
}

/**
 * 본문에 싣는 표기. **$5 단위로 반올림**한다 — 산문이 "about NZ$55"라고 말하는데
 * 센트가 붙으면 실측처럼 읽히고, 매주 몇십 센트 움직일 때마다 문장이 바뀐다.
 */
export function sundayShopLabel(): string {
  return `NZ$${Math.round(sundayShopTotal() / 5) * 5}`;
}
