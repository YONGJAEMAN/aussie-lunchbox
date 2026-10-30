/**
 * Woolworths Australia 검색 API 조회와 정상가 규칙 — 플래너 캐시(`update_prices.mjs`)와 가격지수
 * (`update_price_index.mjs`)가 **같은 함수**를 쓴다. Kiwi 2026-08-17: 같은 계산이 스크립트마다 복붙돼
 * 한 곳만 고쳐진 적이 있다.
 */
import { SEARCH_BASE } from "../lib/priceSearch.mjs";

export const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Woolworths AU 검색 — 마켓플레이스(제3자 판매) 상품은 뺀다(치약·개 사료가 여기서 왔다). */
export async function auSearch(term) {
  const url = `${SEARCH_BASE}?searchTerm=${encodeURIComponent(term)}&pageNumber=1&pageSize=24&sortType=TraderRelevance`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": UA, Accept: "application/json", "Accept-Language": "en-AU,en;q=0.9" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data?.Products ?? []).flatMap((g) => g?.Products ?? []).filter((p) => p && !p.IsMarketProduct);
}

/**
 * AU 상품 → 캐시에 넣을 **정상가**. 특가 주에는 `WasPrice`가 정상가다(Kiwi `shelfPrice`와 같은 규칙 —
 * 특가는 promotions.json 쪽에서만 반영한다). `IsOnSpecial` 딱지 없이 Was > Price인 경우는 매대 값(Price)을 쓴다.
 *
 * kg당 재료(`size: "per kg"`)는 팩 가격이 아니라 `CupString`("$2.20 / 1KG")의 kg당 값을 쓴다 —
 * 🔴 AU 응답은 Unit이 전부 "Each"라 kg당 값이 따로 없다. 특가 중이면 CupString도 특가 기준이라 같은 비율로 되돌린다.
 */
export function auShelfPrice(p, perKg = false) {
  const price = Number(p?.Price);
  const was = Number(p?.WasPrice);
  const regular = p?.IsOnSpecial && was > price ? was : price;
  if (!Number.isFinite(regular) || regular <= 0) return NaN;
  if (!perKg) return regular;
  const m = /\$([\d.]+)\s*\/\s*(1KG|100G)/i.exec(String(p?.CupString ?? ""));
  if (!m) return NaN;
  const perKgNow = parseFloat(m[1]) * (/100G/i.test(m[2]) ? 10 : 1);
  return Math.round(perKgNow * (regular / price) * 100) / 100;
}

