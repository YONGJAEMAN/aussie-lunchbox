import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildWeeklyPlan } from "./planGenerator";
import { dietTagsFor, dietViolations, snackAllowed, AU_REVIEW } from "./ingredientDiet";
import { labelFor, declares } from "./allergenLabels";
import { productName } from "./allergenFacts";
import menuData from "../data/menuData.json";
import type { AllergyType, MenuItem, PriceInfo, SnackData, SnackItem } from "./types";

/**
 * 🔴 2026-09-10 외부 감사가 두 번 재현한 것:
 *      Dairy Allergy 단독            → 간식 Cottage Cheese, 장보기에도 포함
 *      Nut+Dairy+Egg + No-cook       → 간식 Cheese Cubes, 장보기에 Cheese Block
 *
 *    원인은 단순했다 — `buildWeeklyPlan`이 간식을 `randomChoice`로 **아무 필터 없이**
 *    뽑고 있었다. 메인 94개만 걸러지고 간식 41개는 통과였다.
 *
 * 이 파일은 **행동을 재는 가드**다. 필터를 지우면 아래 전수 생성 검사가 터진다.
 */
const raw = menuData as unknown as { MENU_DATA: { en: MenuItem[] }; SNACK_DATA: SnackData };
const MENUS = raw.MENU_DATA.en;
const SNACKS = raw.SNACK_DATA;
const ALL_SNACKS: SnackItem[] = Object.values(SNACKS).flat();
const PLANNER_POOL: SnackItem[] = [
  ...SNACKS["Fruit & Veg"],
  ...SNACKS["Protein & Dairy"],
  ...SNACKS["Savoury Crunch"],
];

const stubPrices = async (ings: string[]): Promise<PriceInfo[]> =>
  ings.map((name) => ({ name, price: 5, source: "test" }) as PriceInfo);

describe("재료 식이 분류", () => {
  it("메뉴·간식이 쓰는 재료에 모르는 것이 없다", () => {
    const used = new Set<string>();
    for (const m of MENUS) m.ingredients.forEach((i) => used.add(i));
    for (const s of ALL_SNACKS) (s.ingredients ?? []).forEach((i) => used.add(i));

    const unknown = [...used].filter((i) => dietTagsFor(i) === null);
    // Aussie(10-30): Falafel Mix는 원재료 목록이 없고 글루텐 「may contain」뿐이라 **일부러 모르는 재료**로 뒀다(사용자 결정).
    //   필터가 켜지면 빠진다. 다른 재료가 여기 늘면 판정표(`data/allergenReview.au.json`)에 줄이 빠진 것이다.
    expect(unknown).toEqual(["Falafel"]);
    // 양성 대조 — 실제로 193개를 봤다는 것까지 세어 둔다. 재료가 늘면 여기가 먼저 틀린다.
    expect(used.size).toBe(193);
  });

  it("라벨이 있는 재료는 라벨이 근거다 — 손으로 적은 값이 라벨을 덮지 않는다", () => {
    // Veggie Straws·Rice Wheels는 **이름에 유제품이 없다.** 손으로 적었으면 통과했을
    // 것들이고, 실제로 상품 라벨이 Milk를 선언한다. 이 둘이 라벨에서 나온 것임을 고정한다.
    for (const ing of ["Veggie Straws", "Rice Wheels"]) {
      expect(labelFor(ing), `${ing}에 라벨이 있어야 한다`).not.toBeNull();
      expect(declares(ing, "milk"), `${ing} 라벨이 Milk를 선언해야 한다`).toBe(true);
      expect(dietTagsFor(ing)!.has("milk")).toBe(true);
    }
  });

  it("메뉴가 free라고 적은 곳을 상품 라벨이 정면으로 반박하지 않는다", () => {
    // 🔴 검사 대상(메뉴 플래그)과 **다른 원본**(상품 라벨)으로 재는 대조다.
    //    손으로 적은 우리 추측은 여기 안 들어온다 — 라벨이 선언한 것만 본다.
    const FIELD: Array<[("nuts"|"milk"|"gluten"|"egg"), keyof MenuItem]> = [
      ["nuts", "is_nut_free"], ["milk", "is_dairy_free"],
      ["gluten", "is_gluten_free"], ["egg", "is_egg_free"],
    ];
    const clashes: string[] = [];
    let checked = 0;
    for (const m of MENUS) {
      for (const [tag, field] of FIELD) {
        if (!m[field]) continue;
        for (const ing of m.ingredients) {
          // Aussie(10-30): 상품 선언 필드 대신 **승인한 판정표**(선언 ∪ 원재료)로 잰다 — 선언 필드가 Teriyaki 참깨처럼 빠뜨린다.
          //   이 대조로 메뉴 표시 9곳을 고쳤다(Mayo·Breadcrumbs·Cocktail Sausages 우유, Pesto·Butter Chicken 달걀, Muesli 견과).
          const r = AU_REVIEW[ing];
          if (!r || r.tags === null) continue;
          checked++;
          if (r.tags.includes(tag)) clashes.push(`${m.name}: ${field}=true 인데 ${ing} 판정이 ${tag}다`);
        }
      }
    }
    expect(clashes).toEqual([]);
    // 🔴 양성 대조 — 라벨 없는 재료만 보고 "0건"이 나오는 알리바이를 막는다.
    expect(checked).toBeGreaterThan(400);
  });
});

/**
 * 🔴 채식·비건 플래그를 **재료와 대조하는 자리가 없었다** (2026-09-15).
 *
 * 알레르겐 쪽은 촘촘하다 — 모르는 재료 0개, 라벨이 손으로 적은 값을 덮고,
 * "메뉴가 free라고 적은 곳을 라벨이 반박하지 않는다"까지 본다.
 * 그런데 `is_vegetarian`·`is_vegan`은 **손으로 적은 플래그인데 아무도 안 봤다.**
 * 비건 가족이 태그를 믿고 고르는 자리다.
 *
 * 🔴 알레르겐 개수 가드(`contentClaims.test.ts`)가 **일부러 리터럴**인 것과 구별할 것.
 *    거기 89·43·23은 안전 플래그를 움직일 때 테스트를 같이 고치게 하는 **속도 방지턱**이고,
 *    실제로 Char Siu Bao·Dumplings 변경을 그렇게 잡았다. 그건 파생으로 바꾸면 안 된다.
 *    여기서 거는 건 개수가 아니라 **플래그와 재료의 모순**이다 — 성격이 다르다.
 */
describe("🔴 채식·비건 플래그가 재료와 모순되지 않는다", () => {
  const meatOf = (m: { ingredients?: string[] }) =>
    (m.ingredients ?? []).filter((i) => dietTagsFor(i)?.has("meat"));
  const animalOf = (m: { ingredients?: string[] }) =>
    (m.ingredients ?? []).filter((i) => {
      const t = dietTagsFor(i);
      return !!t && (t.has("meat") || t.has("animal") || t.has("milk") || t.has("egg"));
    });

  it("고기 재료를 실제로 알아본다 (양성 대조)", () => {
    // 🔴 `meat` 태그가 하나도 안 붙으면 아래 「위반 0건」은 알리바이다.
    const seen = new Set<string>();
    for (const m of MENUS) for (const i of m.ingredients) if (dietTagsFor(i)?.has("meat")) seen.add(i);
    expect(seen.size, "meat 태그가 붙은 재료가 없다 — 분류표부터 볼 것").toBeGreaterThan(10);
  });

  it("채식이라고 적은 메뉴에 고기 재료가 없다", () => {
    const bad = MENUS.filter((m) => m.is_vegetarian && meatOf(m).length)
      .map((m) => `${m.name} → ${meatOf(m).join(", ")}`);
    expect(bad, `채식 플래그가 재료와 어긋난다:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("비건이라고 적은 메뉴에 동물성 재료가 없다", () => {
    const bad = MENUS.filter((m) => m.is_vegan && animalOf(m).length)
      .map((m) => `${m.name} → ${animalOf(m).join(", ")}`);
    expect(bad, `비건 플래그가 재료와 어긋난다:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("비건이면 채식이기도 하다", () => {
    const bad = MENUS.filter((m) => m.is_vegan && !m.is_vegetarian).map((m) => m.name);
    expect(bad, `비건인데 채식이 아니다: ${bad.join(", ")}`).toEqual([]);
    // 양성 대조 — 비건 메뉴가 하나도 없으면 위 검사는 빈 검사다
    expect(MENUS.filter((m) => m.is_vegan).length).toBeGreaterThan(5);
  });
});

describe("간식 필터", () => {
  it("유제품을 빼면 감사가 본 것과 라벨로만 잡히는 것이 함께 사라진다", () => {
    const kept = PLANNER_POOL.filter((s) => snackAllowed(s, ["Dairy Allergy"]));
    const dropped = PLANNER_POOL.filter((s) => !snackAllowed(s, ["Dairy Allergy"])).map((s) => s.name);
    expect(dropped.sort()).toEqual([
      "Breadsticks", "Cheese Cubes", "Cheese Stick", "Cottage Cheese",
      "Probiotic Drink", "Rice Wheels", "Veggie Straws", "Yoghurt Pot",
    ]);
    // Aussie: Breadsticks(Vita Vigor 그리시니)는 우유를 선언한다 — NZ 상품은 안 했다
    expect(kept.length).toBe(25);
  });

  it("어떤 조합에서도 간식 풀이 비지 않는다", () => {
    const ALL: AllergyType[] = ["Nut Allergy", "Dairy Allergy", "Gluten Allergy", "Egg Allergy"];
    for (let mask = 0; mask < 1 << ALL.length; mask++) {
      const combo = ALL.filter((_, i) => mask & (1 << i));
      const fv = SNACKS["Fruit & Veg"].filter((s) => snackAllowed(s, combo));
      const pool = [...SNACKS["Protein & Dairy"], ...SNACKS["Savoury Crunch"]]
        .filter((s) => snackAllowed(s, combo));
      expect(fv.length, combo.join("+")).toBeGreaterThan(0);
      expect(pool.length, combo.join("+")).toBeGreaterThan(0);
    }
    // 채식·비건도 따로 — 고기는 라벨이 말해 주지 않는다
    expect([...SNACKS["Protein & Dairy"], ...SNACKS["Savoury Crunch"]]
      .filter((s) => snackAllowed(s, ["Vegan"])).length).toBeGreaterThan(0);
    expect(PLANNER_POOL.filter((s) => snackAllowed(s, ["Vegetarian"])).map((s) => s.name))
      .not.toContain("Ham Roll-ups");
  });

  it("빼고 싶은 재료도 간식에 적용된다", () => {
    expect(snackAllowed({ name: "Cheese Cubes", ingredients: ["Cheese Block"] }, [], ["Cheese Block"]))
      .toBe(false);
  });
});

describe("생성된 식단 전수 검사", () => {
  const CASES: Array<{ label: string; allergies: AllergyType[] }> = [
    { label: "Dairy 단독", allergies: ["Dairy Allergy"] },
    { label: "Nut+Dairy+Egg", allergies: ["Nut Allergy", "Dairy Allergy", "Egg Allergy"] },
    { label: "Gluten 단독", allergies: ["Gluten Allergy"] },
    { label: "Vegetarian", allergies: ["Vegetarian"] },
    { label: "Vegan", allergies: ["Vegan"] },
  ];

  for (const { label, allergies } of CASES) {
    it(`${label} — 30회 생성 동안 메인·간식·장보기 어디에도 위반이 없다`, async () => {
      let snacksSeen = 0;
      for (let run = 0; run < 30; run++) {
        const plan = await buildWeeklyPlan(MENUS, allergies, [], [], "", SNACKS, stubPrices);
        for (const day of plan.planData) {
          const snackIngs = (day.snacks ?? []).flatMap((s) => s.ingredients ?? []);
          snacksSeen += day.snacks?.length ?? 0;
          expect(dietViolations(snackIngs, allergies), `${day.day} ${day.menuName}`).toEqual([]);
        }
        // 장보기 목록은 화면·PDF가 함께 쓴다. 같은 조건으로 다시 본다.
        const snackNames = new Set(
          plan.planData.flatMap((d) => (d.snacks ?? []).flatMap((s) => s.ingredients ?? [])),
        );
        const fromSnacks = plan.shoppingList.filter((i) => snackNames.has(i));
        expect(dietViolations(fromSnacks, allergies)).toEqual([]);
      }
      // 🔴 양성 대조 — 간식을 하나도 안 담고 "위반 0"을 통과하는 알리바이를 막는다.
      expect(snacksSeen).toBe(300);
    });
  }
});

describe("화면 문구가 동작과 맞나", () => {
  const LOCALES = ["en", "ko", "zh"] as const;
  const load = (l: string) =>
    JSON.parse(
      readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "messages", `${l}.json`), "utf8"),
    ) as Record<string, string>;

  it("FAQ가 예로 든 간식은 실제로 유제품 식단에서 빠진다", () => {
    // 🔴 문구가 상품 이름을 대면 그 이름은 **주장이 된다.** 데이터가 바뀌어
    //    라벨이 사라지면 문구가 거짓이 되는데 화면은 아무 말도 안 한다.
    //
    // 🔴 2026-09-10 정정 — 처음엔 Veggie Straws도 「이름에 힌트가 없다」는 예로 썼는데,
    //    전체 상품명이 `...veggie straws sour cream 65g`라 **이름이 이미 말하고 있었다.**
    //    잘린 이름만 보고 쓴 문장이었다. 예시를 Rice Wheels 하나로 줄였다.
    for (const l of LOCALES) {
      const m = load(l);
      for (const name of ["Rice Wheels"]) {
        expect(m.faq_a3, `${l}: faq_a3`).toContain(name);
        // 이름이 그 알레르겐을 이미 말하고 있으면 「힌트가 없다」는 예로 쓸 수 없다
        expect(productName(name).includes("cream") || productName(name).includes("milk"),
          `${l}: ${name} 상품명이 이미 유제품을 말한다 — 예시로 못 쓴다`).toBe(false);
        const snack = PLANNER_POOL.find((s) => s.name === name)!;
        expect(snack, `${name}이 간식 풀에 있어야 한다`).toBeTruthy();
        expect(snackAllowed(snack, ["Dairy Allergy"]), `${l}: ${name}`).toBe(false);
      }
    }
  });

  it("문구에 마크다운 별표가 섞이지 않는다", () => {
    for (const l of LOCALES) {
      const m = load(l);
      for (const k of ["planner_allergy_safe_desc", "faq_a3", "faq_a4", "faq_a9"]) {
        expect(m[k], `${l}:${k}`).not.toMatch(/\*\*/);
      }
    }
  });
});

/**
 * 🔴 옛 저장 식단 (2026-09-10 외부 감사, 두 번째 지적).
 *
 * 새 식단은 고쳐졌는데 **처음 접속하면 수정 전에 저장된 식단이 되살아났다** —
 * 감사가 실제로 본 것은 `Lentil Soup` + 간식 `Cottage Cheese`(Dairy Allergy)다.
 * 복원 경로가 가격만 갱신하고 메뉴·간식은 저장된 것을 그대로 썼기 때문이다.
 */
describe("저장된 식단 되살리기", () => {
  const day = (main: string[], snacks: string[][]) => ({
    rawIngredients: main,
    snacks: snacks.map((ingredients) => ({ ingredients })),
  });

  it("감사가 본 그 저장분은 되살리지 않는다", async () => {
    const { savedPlanIsStale, PLAN_SCHEMA } = await import("./ingredientDiet");
    const audit = {
      schema: PLAN_SCHEMA,
      filters: { allergies: ["Dairy Allergy"] as AllergyType[], excluded: [] },
      planData: [day(["Red Lentils", "Carrot", "Onion", "Vegetable Stock"], [["Apple"], ["Cottage Cheese"]])],
    };
    expect(savedPlanIsStale(audit)).toBe(true);
  });

  it("스키마 표시가 없으면 조건과 무관하게 되살리지 않는다", async () => {
    const { savedPlanIsStale } = await import("./ingredientDiet");
    // 🔴 09-10 이전 저장분에는 표시가 없다. 그 저장분의 간식이 필터를 거쳤다는
    //    근거가 없으므로, 겉보기에 깨끗해도 되살릴 값이 아니다.
    const clean = { filters: { allergies: [] as AllergyType[] }, planData: [day(["Apple"], [["Banana"]])] };
    expect(savedPlanIsStale(clean)).toBe(true);
    expect(savedPlanIsStale({ ...clean, schema: 1 })).toBe(true);
    expect(savedPlanIsStale({ ...clean, schema: 2 })).toBe(false);
  });

  it("조건에 맞는 저장분은 되살린다 — 무조건 버리는 것이 아니다", async () => {
    const { savedPlanIsStale, PLAN_SCHEMA } = await import("./ingredientDiet");
    const good = {
      schema: PLAN_SCHEMA,
      filters: { allergies: ["Dairy Allergy"] as AllergyType[], excluded: ["Ham"] },
      planData: [day(["Red Lentils", "Carrot"], [["Apple"], ["Edamame"]])],
    };
    expect(savedPlanIsStale(good)).toBe(false);
    // 빼고 싶은 재료도 본다
    const withExcluded = { ...good, planData: [day(["Red Lentils"], [["Apple"], ["Ham"]])] };
    expect(savedPlanIsStale(withExcluded)).toBe(true);
  });

  it("생성된 식단은 그대로 저장·복원된다 — 새 식단이 버려지면 기능이 죽는다", async () => {
    const { savedPlanIsStale, PLAN_SCHEMA } = await import("./ingredientDiet");
    const cases: AllergyType[][] = [[], ["Dairy Allergy"], ["Nut Allergy", "Dairy Allergy", "Egg Allergy"], ["Vegan"]];
    for (const allergies of cases) {
      const plan = await buildWeeklyPlan(MENUS, allergies, [], [], "", SNACKS, stubPrices);
      const saved = {
        schema: PLAN_SCHEMA,
        filters: { allergies, excluded: [] as string[] },
        planData: plan.planData,
      };
      expect(savedPlanIsStale(saved), allergies.join("+") || "필터 없음").toBe(false);
    }
  });

  it("화면이 판정을 직접 하지 않고 라이브러리를 쓴다", () => {
    const src = readFileSync(new URL("../components/PlannerClient.tsx", import.meta.url), "utf8");
    expect(src, "savedPlanIsStale을 안 쓴다").toContain("savedPlanIsStale(parsed)");
    expect(src, "버린 것을 화면이 안 알린다").toContain('t("planner_saved_plan_discarded")');
    expect(src, "저장할 때 스키마를 안 적는다").toContain("schema: PLAN_SCHEMA");
    expect(src, "빼고 싶은 재료를 저장하지 않는다").toMatch(/filters:\s*\{[^}]*excluded/);
  });
});
