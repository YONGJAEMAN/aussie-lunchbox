/**
 * 가격지수 표에 붙이는 **단위 가격**(슈퍼마켓 매대 라벨과 같은 것).
 *
 * 🔴 크기를 **품목명에서 뽑는다.** `priceIndexSources.json`의 `pinnedSize`가 더
 *    권위 있어 보이지만, 그 값은 화면에 안 나온다. 독자가 눈으로 보는 것은
 *    "Wholemeal Bread (700g)"이고, 그 700g으로 나눈 값이라야 **독자가 검산할 수
 *    있다.** 이 사이트는 "check my arithmetic"이라고 써 놓고 파는 곳이다.
 *
 *    대신 가드가 이름에서 뽑은 크기를 `pinnedSize`와 **대조한다** — 둘이 갈라지면
 *    이름이 낡았거나 SKU가 바뀐 것이고, 어느 쪽이든 사람이 봐야 한다.
 *
 * 🔴 크기를 모르는 행(Cucumber·Lettuce·Bananas)은 **아무것도 안 쓴다.** 개당 파는 물건은
 *    진열가가 곧 단위 가격이라 덧붙일 말이 없고, 없는 크기를 지어내면 그게 날조다.
 */

export type PackSize = { n: number; unit: "g" | "ml" | "ea" };

/**
 * "Wholemeal Bread (700g)" → 700g · "Apples (1kg)" → 1000g
 * "Wraps 6-pack" → 6ea · "Eggs (12-pack)" → 12ea · "Cucumber" → null
 */
export function packSizeFromName(name: string): PackSize | null {
  const weight = /\((\d+(?:\.\d+)?)\s*(kg|g|ml|l)\)/i.exec(name);
  if (weight) {
    const n = Number(weight[1]);
    switch (weight[2].toLowerCase()) {
      case "kg":
        return { n: n * 1000, unit: "g" };
      case "g":
        return { n, unit: "g" };
      case "l":
        return { n: n * 1000, unit: "ml" };
      default:
        return { n, unit: "ml" };
    }
  }
  const pack = /(\d+)\s*-?\s*pack/i.exec(name);
  if (pack) return { n: Number(pack[1]), unit: "ea" };
  return null;
}

/**
 * 매대 라벨과 같은 규칙: 1kg/1L 이상은 **kg·L 단위**로, 그 아래는 **100g·100mL**로,
 * 개수 팩은 **개당**으로 말한다. 매대 라벨이 채소를 per kg로 붙이는 것과 맞춘다.
 */
export function unitPriceLabel(name: string, price: number | null | undefined): string | null {
  if (typeof price !== "number" || !(price > 0)) return null;
  const size = packSizeFromName(name);
  if (!size) return null;
  if (size.unit === "ea") {
    return size.n > 1 ? `$${(price / size.n).toFixed(2)} each` : null;
  }
  const big = size.n >= 1000;
  const per = big ? size.n / 1000 : size.n / 100;
  // 🔴 정확히 1kg·1L짜리는 단위 가격이 진열가와 **같은 숫자**다. 그대로 찍으면
  //    같은 값을 두 번 보여주는 것이라 정보가 0이고 표만 시끄러워진다.
  //    낱개 상품에 아무것도 안 쓰는 것과 같은 이유다.
  if (per === 1) return null;
  const label = big ? (size.unit === "g" ? "kg" : "L") : size.unit === "g" ? "100g" : "100mL";
  return `$${(price / per).toFixed(2)}/${label}`;
}
