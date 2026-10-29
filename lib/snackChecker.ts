import menuData from "@/data/menuData.json";
import PRICES from "@/data/price_cache.json";
import { labelFor } from "./allergenLabels";
import { productName } from "./allergenFacts";
import { snackAllowed, dietTagsFor, mayContainNotes, SESAME_UNVERIFIED, type DietTag } from "./ingredientDiet";
import { PLANNER_CATEGORIES, serveCost } from "./snackEconomics";
import { PORTION_BASIS } from "./planConfig";
import { snackChokingFlag, type ChokingFlag } from "./chokingRisk";
import type { AllergyType, SnackData } from "./types";

/**
 * /snack-checker 페이지의 데이터 — 플래너가 도시락에 넣을 수 있는 간식 전부와 그 근거.
 *
 * 🔴 통과 여부는 **플래너와 같은 함수(`snackAllowed`)** 로만 낸다. 페이지가 자기 규칙을
 *    따로 가지면 언젠가 「페이지는 통과, 플래너는 제외」가 생긴다.
 * 🔴 「May contain」은 플래너가 **거르지 않는다**(`ingredientDiet.ts`는 선언분만 본다).
 *    그래서 여기서도 통과/실패를 바꾸지 않고 따로 표시만 한다.
 */

const SN = (menuData as unknown as { SNACK_DATA: SnackData }).SNACK_DATA;
const CACHE = PRICES as Record<string, { timestamp?: number; data?: { price?: number } }>;

/** 페이지 필터 = 플래너의 알레르기 선택지 중 라벨로 판정되는 다섯. 참깨는 2026-10-23 플래너에 선택지가 생겨 넣었다(#140). */
export const CHECKER_ALLERGIES = ["Nut Allergy", "Dairy Allergy", "Egg Allergy", "Gluten Allergy", "Sesame Allergy"] as const;
export type CheckerAllergy = (typeof CHECKER_ALLERGIES)[number];

export const CHECKER_LABEL: Record<CheckerAllergy, string> = {
  "Nut Allergy": "Nut",
  "Dairy Allergy": "Dairy",
  "Egg Allergy": "Egg",
  "Gluten Allergy": "Gluten",
  "Sesame Allergy": "Sesame",
};

const ALLERGEN_TAGS: DietTag[] = ["nuts", "milk", "egg", "gluten", "sesame"];

export type Evidence =
  | { kind: "label"; ingredient: string; product: string; declared: string; precautionary: string; readOn: string }
  /** `unverified` = 라벨이 없어 **확인 못 한** 알레르겐(현재 참깨만). 「들어 있다」가 아니다 — 화면이 따로 말한다. */
  | { kind: "hand"; ingredient: string; flagged: DietTag[]; unverified: DietTag[] }
  | { kind: "unknown"; ingredient: string };

/**
 * 재료 하나의 추적 상품 가격 — 플래너가 원가를 매기는 바로 그 값(`price_cache.json`의 `data.price`).
 * 🔴 PR #120 이후 이 값은 특가·회원가가 아닌 **정가(shelfPrice)** 다. 팩 크기는 플래너 레시피 창과
 *    같은 `PORTION_BASIS`에서 읽고, 없으면 `null` — 크기를 지어내지 않는다.
 */
export type PackPrice = { ingredient: string; product: string; price: number | null; pack: string | null; readOn: string };

export type CheckerRow = {
  name: string;
  category: string;
  keepCold: boolean;
  passes: Record<CheckerAllergy, boolean>;
  /** 선언은 없지만 추적 상품 라벨이 주의 문구로 그 알레르겐을 적은 경우. 통과 여부와는 별개다. */
  mayContain: Record<CheckerAllergy, boolean>;
  evidence: Evidence[];
  packs: PackPrice[];
  /** 플래너가 이 간식 한 칸에 매기는 값(`serveCost`). 가격 없는 재료가 하나라도 있으면 `null` — 0으로 채워 싸 보이게 하지 않는다. */
  serve: number | null;
  /** 「Kindy (under 5)」에서 빠지는지·손질 안내가 붙는지. 플래너와 **같은 표**(`chokingRisk.ts`)에서 온다. */
  choking: ChokingFlag;
};

/** 관측일은 뉴질랜드 날짜로 쓴다 — 독자가 NZ에 있다. */
export const nzDate = (ms: number) =>
  new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(ms));

function packFor(ing: string): PackPrice {
  const p = CACHE[ing]?.data?.price;
  const ts = CACHE[ing]?.timestamp;
  return {
    ingredient: ing,
    product: productName(ing).trim(),
    price: typeof p === "number" && p > 0 ? p : null,
    pack: PORTION_BASIS[ing]?.pack ?? null,
    readOn: typeof ts === "number" ? nzDate(ts) : "",
  };
}

function evidenceFor(ing: string): Evidence {
  const label = labelFor(ing);
  if (label) {
    const ts = CACHE[ing]?.timestamp;
    return {
      kind: "label",
      ingredient: ing,
      product: productName(ing),
      declared: label.declared.trim(),
      precautionary: label.precautionary.trim(),
      readOn: typeof ts === "number" ? nzDate(ts) : "",
    };
  }
  const tags = dietTagsFor(ing);
  if (tags === null) return { kind: "unknown", ingredient: ing };
  const unverified: DietTag[] = SESAME_UNVERIFIED.has(ing) ? ["sesame"] : [];
  return { kind: "hand", ingredient: ing, flagged: ALLERGEN_TAGS.filter((t) => tags.has(t) && !unverified.includes(t)), unverified };
}

export function checkerRows(): CheckerRow[] {
  const rows: CheckerRow[] = [];
  for (const category of PLANNER_CATEGORIES) {
    for (const s of SN[category] ?? []) {
      const ings = s.ingredients ?? [];
      const passes = {} as Record<CheckerAllergy, boolean>;
      const mayContain = {} as Record<CheckerAllergy, boolean>;
      for (const a of CHECKER_ALLERGIES) {
        passes[a] = snackAllowed(s, [a]);
        // 🔴 플래너 카드의 ⚠와 같은 함수 — 두 화면이 「may contain」을 다르게 읽지 않게.
        mayContain[a] = mayContainNotes(ings, [a]).length > 0;
      }
      rows.push({
        name: s.name,
        category,
        keepCold: !!s.keepCold,
        passes,
        mayContain,
        evidence: ings.map(evidenceFor),
        packs: ings.map(packFor),
        serve: ings.length && ings.every((i) => packFor(i).price !== null) ? serveCost(s) : null,
        choking: snackChokingFlag(s),
      });
    }
  }
  return rows;
}

/** 필터 여러 개 = 플래너에 여러 개를 넘긴 것. 페이지는 이 교집합을 쓴다(테스트가 `snackAllowed`와 대조한다). */
export const passesAll = (r: CheckerRow, selected: readonly CheckerAllergy[]) =>
  selected.every((a) => r.passes[a]);

export function checkerSummary(rows: CheckerRow[] = checkerRows()) {
  const hasLabel = (r: CheckerRow) => r.evidence.some((e) => e.kind === "label");
  return {
    total: rows.length,
    labelBacked: rows.filter(hasLabel).length,
    handOnly: rows.filter((r) => !hasLabel(r) && r.evidence.every((e) => e.kind === "hand")).length,
    unknown: rows.filter((r) => r.evidence.some((e) => e.kind === "unknown")).length,
    keepCold: rows.filter((r) => r.keepCold).length,
    kindyExcluded: rows.filter((r) => r.choking.kind === "exclude").length,
    kindyOurs: rows.filter((r) => r.choking.kind === "exclude" && r.choking.rule.basis === "ours").length,
    kindyAlter: rows.filter((r) => r.choking.kind === "alter").length,
    perAllergy: CHECKER_ALLERGIES.map((a) => ({
      allergy: a,
      pass: rows.filter((r) => r.passes[a]).length,
      passButWarned: rows.filter((r) => r.passes[a] && r.mayContain[a]).length,
    })),
  };
}

/** 페이지에 실린 간식 재료의 라벨 관측 범위(ms). 페이지 날짜·sitemap lastmod가 여기서 나온다. */
export function labelReadRange(): { oldest: number; newest: number } {
  const ings = new Set(PLANNER_CATEGORIES.flatMap((c) => (SN[c] ?? []).flatMap((s) => s.ingredients ?? [])));
  const stamps = [...ings].map((i) => CACHE[i]?.timestamp).filter((t): t is number => typeof t === "number");
  if (!stamps.length) throw new Error("snack-checker: 간식 재료에 timestamp가 하나도 없다");
  return { oldest: Math.min(...stamps), newest: Math.max(...stamps) };
}

export function checkerDescription(): string {
  const { total } = checkerSummary();
  const w = CHECKER_ALLERGIES.map((a) => CHECKER_LABEL[a].toLowerCase());
  return `Which of the ${total} snacks our NZ lunchbox planner packs pass a ${w.slice(0, -1).join(", ")} or ${w.at(-1)} filter, and what each tracked product's allergen label says.`;
}
