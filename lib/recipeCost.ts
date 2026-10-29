import { packPrice, money } from "@/lib/servePrice";
import { PORTION_BASIS } from "@/lib/planConfig";

/**
 * 가이드 레시피의 원가를 **레시피에 적힌 그램 수**에서 만든다.
 *
 * 🔴 왜 생겼나 (2026-08-23) — 스낵 가이드의 네 레시피가 "Cost: approximately $0.15 per
 *    muffin" 같은 값을 달고 있었는데, 추적가로 재보면 몇 배 높았다. 그날은 지웠다.
 *    지운 이유는 분량 때문이었다: 원가를 만들려면 *1 cup of flour*를 그램으로,
 *    다시 팩의 몇 분의 몇으로 바꿔야 하는데 **밀가루·바나나·코코넛오일은 팩 크기가
 *    확인돼 있지 않았다.** 그 셋(+베이킹파우더·소다·옥수수)을 상품 API로 확인해
 *    `PORTION_BASIS`에 넣고, 레시피를 그램으로 다시 써서 되살린 게 이 모듈이다.
 *
 * 🔴 컵→그램 환산을 여기서 **하지 않는다.** 레시피 본문이 그램을 적고, 이 함수는
 *    그 그램을 쓴다. 화면의 숫자와 계산에 쓰인 숫자가 같아야 독자가 검산할 수 있다.
 *    (환산표를 쓸 때는 본문에 Edmonds 표를 근거로 밝힌다.)
 *
 * 🔴 팩 크기의 유일한 출처는 `PORTION_BASIS`다. 못 읽는 형식이면 **던진다** —
 *    조용한 폴백이 이 저장소를 반복해서 물어 왔다.
 */

export type Unit = "g" | "ml" | "ea";

/** 레시피 한 줄: 재료 키, 수량, 단위. */
export type RecipeItem = [key: string, amount: number, unit: Unit];

/** "1.5kg" → {n:1500, unit:"g"} · "12pack" → {n:12, unit:"ea"} · "per kg" → {n:1000, unit:"g"} */
export function parsePack(pack: string): { n: number; unit: Unit } {
  const v = pack.trim().toLowerCase();
  if (/^per\s*kg$/.test(v)) return { n: 1000, unit: "g" };
  if (/^(each|ea|1ea)$/.test(v)) return { n: 1, unit: "ea" };
  const count = /^(\d+)\s*pack$/.exec(v);
  if (count) return { n: Number(count[1]), unit: "ea" };
  const m = /^(\d+(?:\.\d+)?)\s*(kg|g|ml|l)$/.exec(v);
  if (m) {
    const x = Number(m[1]);
    switch (m[2]) {
      case "kg": return { n: x * 1000, unit: "g" };
      case "g": return { n: x, unit: "g" };
      case "l": return { n: x * 1000, unit: "ml" };
      default: return { n: x, unit: "ml" };
    }
  }
  throw new Error(
    `레시피 원가: 팩 크기 "${pack}"을 못 읽는다. PORTION_BASIS의 표기를 확인할 것 ` +
      `(허용: 500g · 1.5kg · 1L · 100mL · 12pack · per kg · each)`,
  );
}

/** 재료 한 줄의 값. 팩 크기 근거가 없거나 단위 계열이 다르면 던진다. */
export function ingredientCost([key, amount, unit]: RecipeItem): number {
  const basis = PORTION_BASIS[key];
  if (!basis) {
    throw new Error(
      `레시피 원가: "${key}"의 팩 크기 근거가 없다. 상품 API로 확인해 PORTION_BASIS에 넣을 것 — ` +
        `근거 없이 원가를 실으면 그건 추정이지 실측이 아니다`,
    );
  }
  const pack = parsePack(basis.pack);
  if (pack.unit !== unit) {
    throw new Error(
      `레시피 원가: "${key}"는 ${pack.unit} 단위로 팔리는데 레시피가 ${unit}로 적었다 ` +
        `(팩 "${basis.pack}"). 단위를 맞추지 않으면 값이 1000배 틀린다`,
    );
  }
  if (!(amount > 0)) throw new Error(`레시피 원가: "${key}" 수량이 이상하다(${amount})`);
  return packPrice(key) * (amount / pack.n);
}

/** 레시피 전체 원가. */
export const recipeCost = (items: RecipeItem[]) =>
  items.reduce((t, it) => t + ingredientCost(it), 0);

/**
 * 게시용 "한 개에 N". 🔴 총액도 **게시된 개당 값에서** 되돌릴 수 있어야 한다 —
 * 독자가 표를 검산했을 때 어긋나면 안 된다는 규칙(`vegTermSaving` 참조)과 같다.
 */
export function perItemLabel(items: RecipeItem[], makes: number): string {
  if (!(makes > 0)) throw new Error(`레시피 원가: 개수가 이상하다(${makes})`);
  const each = recipeCost(items) / makes;
  return each < 1 ? `${Math.round(each * 100)}c` : money(each);
}

/** 게시용 배치 총액. */
export const batchLabel = (items: RecipeItem[]) => money(recipeCost(items));
