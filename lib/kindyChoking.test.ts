import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  EXCLUDE_CATEGORIES, ALTER_CATEGORIES, EXCLUDE_INGREDIENTS, EXCLUDE_SNACKS, ALTER_INGREDIENTS, PREPS,
  CHOKING_SOURCE, snackChokingFlag, dayKindyPrep, type PrepId,
} from "./chokingRisk";
import { buildWeeklyPlan, swapPlanDay, buildSharedPlan, PlanInputError } from "./planGenerator";
import { dietViolations, mayContainNotes, savedPlanIsStale, snackAllowed, PLAN_SCHEMA } from "./ingredientDiet";
import { encodeSharedPlan, decodeSharedPlan, SHARE_ALLERGIES } from "./planShare";
import { checkerRows, checkerSummary } from "./snackChecker";
import { FILTER_ARTICLES } from "./relatedPosts";
import { GUIDES } from "@/content/guides";
import type { AllergyType, MenuItem, PlanItem, PriceInfo, SnackData, SnackItem } from "./types";

/**
 * 「Kindy (under 5)」 — Ministry of Health (2020) 유아교육기관 질식 예방 지침 (2026-10-12).
 *
 * 🔴 기대값은 `chokingRisk.ts`에서 뽑지 않는다. 사용자가 승인한 분류를 **여기 리터럴로** 적고,
 *    데이터는 JSON 원본을 직접 읽는다(guard-expectations-from-same-source). 표를 고치면 여기도
 *    같이 고쳐야 한다 — 그게 의도한 과속방지턱이다(승인 없이 분류가 바뀌지 않게).
 */

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf-8");
const RAW = JSON.parse(read("data/menuData.json")) as { MENU_DATA: { en: MenuItem[] }; SNACK_DATA: SnackData };
const MENUS = RAW.MENU_DATA.en;
const SNACKS = RAW.SNACK_DATA;
/** 플래너가 뽑는 칸 — 생성기 소스의 `snackData["…"]`에서 읽는다(snackChecker.test와 같은 방식). */
const PLANNER_CATS = [...new Set([...read("lib/planGenerator.ts").matchAll(/snackData\["([^"]+)"\]/g)].map((m) => m[1]))];
const POOL: SnackItem[] = PLANNER_CATS.flatMap((c) => SNACKS[c as keyof SnackData] ?? []);
const ALL_SNACKS: SnackItem[] = Object.values(SNACKS).flat();
const LOCALES = ["en", "ko", "zh"] as const;
const MSG = Object.fromEntries(LOCALES.map((l) => [l, JSON.parse(read(`messages/${l}.json`)) as Record<string, string>]));

/** 지침 「High-risk food to exclude」 아홉 줄 — PDF 3쪽 문구 그대로. */
const GUIDE_EXCLUDE_LINES = [
  "whole nuts or pieces of nuts",
  "large seeds, like pumpkin or sunflower seeds",
  "hard or chewy sweets or lollies",
  "crisps or chippies and corn chips",
  "hard rice crackers",
  "dried fruit",
  "sausages, saveloys and cheerios",
  "popcorn",
  "marshmallows",
];

/** 승인된 「빼는」 재료 → 지침의 줄. */
const APPROVED_EXCLUDE: Record<string, string> = {
  "Corn Chips": "crisps or chippies and corn chips",
  "Veggie Straws": "crisps or chippies and corn chips",
  "Rice Wheels": "crisps or chippies and corn chips",
  "Rice Crackers": "hard rice crackers",
  "Dried Apricots": "dried fruit",
  "Sultanas": "dried fruit",
  "Real Fruit Strip": "dried fruit",
  "Dates": "dried fruit",
  "Popcorn": "popcorn",
  "Cocktail Sausages": "sausages, saveloys and cheerios",
  "GF Sausages": "sausages, saveloys and cheerios",
  // 10-12 검토: 이름이 아니라 추적 **상품**으로 판정 — 둘 다 쌀과자, 뮤즐리는 말린 베리가 든다.
  "GF Crackers": "hard rice crackers",
  "Wholegrain Crackers": "hard rice crackers",
  "Muesli": "dried fruit",
};
/** 우리 판단 — 간식 이름 단위. 재료(Chickpeas)는 메뉴에서 익혀 무르므로 빼지 않는다. */
const APPROVED_OURS_SNACKS = ["Roasted Chickpeas"];

/** 승인된 「손질」 재료 → 손질법(전 연령 문구의 첫머리로 확인). */
const APPROVED_ALTER: Record<string, string[]> = {
  "Apple": ["Grate"], "Pear": ["Grate"], "Carrot": ["Grate"], "Celery": ["Grate"], "Sugar Snap Peas": ["Grate"],
  "Grapes": ["Quarter"], "Cherry Tomatoes": ["Quarter"], "Blueberries": ["Quarter"], "Strawberries": ["Quarter"],
  "Berries": ["Quarter"], "Edamame": ["Quarter"],
  "Peas": ["Cook, then squash"],
  "Watermelon": ["Remove large seeds"],
  "Olives": ["Remove the stone"],
  "Tomato": ["Finely chop"],
  "Lettuce": ["Finely slice"], "Cos Lettuce": ["Finely slice"], "Spinach": ["Finely slice"],
  "Cabbage": ["Finely slice"], "Rocket": ["Finely slice"],
  "Chicken": ["Remove the skin", "Cook until very tender"],
  "Chicken Breast": ["Remove the skin", "Cook until very tender"],
  "Chicken Thigh": ["Remove the skin", "Cook until very tender"],
  "Cooked Chicken": ["Remove the skin", "Cook until very tender"],
  "Ham": ["Cook until very tender"], "Beef": ["Cook until very tender"], "Roast Beef": ["Cook until very tender"],
  "Turkey": ["Cook until very tender"], "Salami": ["Cook until very tender"], "Pork Shoulder": ["Cook until very tender"],
  // 10-12 검토: 같은 「pieces of cooked meat」 줄 — 처음 목록에서 빠져 있던 고기들.
  "Bacon": ["Cook until very tender"], "Ham/Bacon": ["Cook until very tender"], "Meatballs": ["Cook until very tender"],
  "Beef Patty": ["Cook until very tender"], "Chicken Skewers": ["Cook until very tender"],
  "Chicken/Tofu": ["Cook until very tender"], "Tuna/Chicken/Avocado": ["Cook until very tender"],
  "Smoked Salmon": ["Remove all bones"],
  "Peanut Butter": ["Use sparingly"],
};

const EXCLUDED_INGS = new Set(Object.keys(APPROVED_EXCLUDE));
const isExcludedSnack = (s: SnackItem) =>
  APPROVED_OURS_SNACKS.includes(s.name) || (s.ingredients ?? []).some((i) => EXCLUDED_INGS.has(i));
const isExcludedMenu = (m: { ingredients: string[] }) => m.ingredients.some((i) => EXCLUDED_INGS.has(i));

const KINDY: AllergyType[] = ["Kindy"];
const stubPrices = async (ings: string[]): Promise<PriceInfo[]> =>
  ings.map((name) => ({ name, price: 2, image: "", source: "test" }));

/** 메뉴 안에서 익혀 무른 재료 — 재료 단위 안내를 붙이지 않는다(구운 머핀 속 블루베리). */
const APPROVED_COOKED: Record<string, string[]> = { "Blueberry Muffins": ["Blueberries"] };

/** 하루치 기대 손질 안내 — 리터럴 표와 원본 재료에서. `재료|간식|전연령 문구`. */
const expectedPrep = (main: string[], snacks: SnackItem[], menuName = "") => [
  ...[...new Set(main)].filter((i) => !(APPROVED_COOKED[menuName] ?? []).includes(i)).flatMap((i) => (APPROVED_ALTER[i] ?? []).map((h) => `${i}||${h}`)),
  ...snacks.flatMap((s) => [...new Set(s.ingredients)].flatMap((i) => (APPROVED_ALTER[i] ?? []).map((h) => `${i}|${s.name}|${h}`))),
].sort();
const actualPrep = (d: PlanItem) =>
  (d.kindyPrep ?? []).map((n) => {
    const text = MSG.en[`kindy_prep_${n.prep}`];
    const head = (APPROVED_ALTER[n.ingredient] ?? []).find((h) => text.startsWith(h)) ?? `?${text}`;
    return `${n.ingredient}|${n.snack ?? ""}|${head}`;
  }).sort();

describe("🔴 질식 표 = 지침의 분류 + 승인된 목록", () => {
  it("지침의 「빼라」 아홉 줄이 전부 표에 있다 — 데이터에 해당 재료가 없는 줄도", () => {
    expect(EXCLUDE_CATEGORIES.length).toBe(GUIDE_EXCLUDE_LINES.length);
    expect(EXCLUDE_CATEGORIES.map((c) => MSG.en[`kindy_cat_${c}`])).toEqual(GUIDE_EXCLUDE_LINES);
    for (const l of LOCALES) for (const c of EXCLUDE_CATEGORIES) expect(MSG[l][`kindy_cat_${c}`], `${l}: kindy_cat_${c}`).toBeTruthy();
    for (const l of LOCALES) for (const c of ALTER_CATEGORIES) expect(MSG[l][`kindy_alter_${c}`], `${l}: kindy_alter_${c}`).toBeTruthy();
  });

  it("빼는 재료가 승인 목록과 같고, 각자 지침의 줄을 댄다", () => {
    const got = Object.fromEntries(
      Object.entries(EXCLUDE_INGREDIENTS).map(([i, r]) => [i, r.basis === "guide" ? MSG.en[`kindy_cat_${r.category}`] : `ours:${r.reason}`]),
    );
    expect(got).toEqual(APPROVED_EXCLUDE);
  });

  it("우리 판단은 「ours」로 표시되고 간식 이름 단위다 — 재료 Chickpeas는 빼지 않는다", () => {
    expect(Object.keys(EXCLUDE_SNACKS)).toEqual(APPROVED_OURS_SNACKS);
    for (const [name, r] of Object.entries(EXCLUDE_SNACKS)) {
      expect(r.basis, name).toBe("ours");
      if (r.basis !== "ours") continue;
      for (const l of LOCALES) expect(MSG[l][`kindy_ours_${r.reason}`], `${l}: kindy_ours_${r.reason}`).toBeTruthy();
      expect(MSG.en[`kindy_ours_${r.reason}`]).toMatch(/our own call/i);
    }
    expect(EXCLUDE_INGREDIENTS["Chickpeas"]).toBeUndefined();
    const softChickpeaMains = MENUS.filter((m) => m.ingredients.includes("Chickpeas"));
    expect(softChickpeaMains.length, "Chickpeas가 든 메인이 없다 — 이 대조가 빈 집합이다").toBeGreaterThan(0);
    for (const m of softChickpeaMains) expect(isExcludedMenu(m), m.name).toBe(false);
  });

  it("손질 재료가 승인 목록과 같고, 손질법마다 지침의 표제와 세 언어 문구가 있다", () => {
    const got = Object.fromEntries(
      Object.entries(ALTER_INGREDIENTS).map(([i, ps]) => [i, ps.map((p) => APPROVED_ALTER[i]?.find((h) => MSG.en[`kindy_prep_${p}`].startsWith(h)) ?? `?${p}`)]),
    );
    expect(got).toEqual(APPROVED_ALTER);
    for (const [id, p] of Object.entries(PREPS)) {
      expect(ALTER_CATEGORIES as readonly string[], id).toContain(p.category);
      for (const l of LOCALES) {
        expect(MSG[l][`kindy_prep_${id}`], `${l}: kindy_prep_${id}`).toBeTruthy();
        // 4–6세 대안은 지침이 준 것에만 — 없는 대안을 지어내지 않는다
        expect(!!MSG[l][`kindy_prep_${id}_46`], `${l}: kindy_prep_${id}_46`).toBe(p.older);
      }
    }
  });

  it("표의 이름은 전부 데이터에 글자까지 같게 있다 (오타면 아무것도 안 거른다)", () => {
    const ings = new Set([...MENUS.flatMap((m) => m.ingredients), ...ALL_SNACKS.flatMap((s) => s.ingredients ?? [])]);
    const missing = [...Object.keys(EXCLUDE_INGREDIENTS), ...Object.keys(ALTER_INGREDIENTS)].filter((i) => !ings.has(i));
    expect(missing).toEqual([]);
    const snackNames = new Set(ALL_SNACKS.map((s) => s.name));
    expect(Object.keys(EXCLUDE_SNACKS).filter((n) => !snackNames.has(n))).toEqual([]);
  });

  it("지침이 말하지 않는 음식에는 아무것도 주장하지 않는다 (글이 이름을 대는 넷)", () => {
    for (const i of ["Cucumber", "Capsicum", "Cheese", "Boiled Egg"]) {
      expect(EXCLUDE_INGREDIENTS[i], i).toBeUndefined();
      expect(ALTER_INGREDIENTS[i], i).toBeUndefined();
    }
  });
});

describe("🔴 킨디 식단 — 생성·교체·공유 어느 경로로도 뺀 음식이 안 나온다", () => {
  const COMBOS: AllergyType[][] = [KINDY, ["Kindy", "Vegetarian"], ["Kindy", "Gluten Allergy", "Dairy Allergy"]];

  it("50번씩 생성: 뺀 재료·간식 0, 그리고 손질 안내가 리터럴 표와 같다", async () => {
    let days = 0, prepped = 0;
    for (const allergies of COMBOS) {
      for (let n = 0; n < 50; n++) {
        const plan = await buildWeeklyPlan(MENUS, allergies, [], [], "", SNACKS, stubPrices);
        for (const d of plan.planData) {
          days++;
          expect(isExcludedMenu({ ingredients: d.rawIngredients }), `${allergies}: ${d.menuName}`).toBe(false);
          for (const s of d.snacks) expect(isExcludedSnack(s), `${allergies}: ${s.name}`).toBe(false);
          expect(actualPrep(d), `${d.menuName} / ${d.snacks.map((s) => s.name)}`).toEqual(expectedPrep(d.rawIngredients, d.snacks, d.menuName));
          if ((d.kindyPrep ?? []).length) prepped++;
          // 킨디는 알레르겐이 아니다 — ⚠는 같이 켠 진짜 알레르기에서만
          expect((d.mayContain ?? []).every((x) => x.allergy !== "Kindy")).toBe(true);
        }
      }
    }
    expect(days).toBe(COMBOS.length * 50 * 5);
    expect(prepped, "손질 안내가 하나도 안 붙었다 — 양성 대조가 비었다").toBeGreaterThan(days / 2);
  });

  it("양성 대조: 킨디를 끄면 뺀 음식이 실제로 나오고, 손질 안내는 없다", async () => {
    let menusHit = 0, snacksHit = 0;
    for (let n = 0; n < 50; n++) {
      const plan = await buildWeeklyPlan(MENUS, [], [], [], "", SNACKS, stubPrices);
      for (const d of plan.planData) {
        if (isExcludedMenu({ ingredients: d.rawIngredients })) menusHit++;
        snacksHit += d.snacks.filter(isExcludedSnack).length;
        expect(d.kindyPrep).toBeUndefined();
      }
    }
    expect(menusHit, "킨디 없이도 뺀 메인이 0 — 가드가 빈 집합을 보고 있다").toBeGreaterThan(0);
    expect(snacksHit, "킨디 없이도 뺀 간식이 0 — 가드가 빈 집합을 보고 있다").toBeGreaterThan(0);
  });

  it("하루 교체: 30번 바꿔도 뺀 음식이 안 들어오고, 다섯 날 손질 안내가 다시 계산된다", async () => {
    for (let n = 0; n < 30; n++) {
      const plan = await buildWeeklyPlan(MENUS, KINDY, [], [], "", SNACKS, stubPrices);
      const week = plan.planData.map((d) => ({ menu: d.menuName, snacks: d.snacks.map((s) => s.name) }));
      const next = await swapPlanDay(MENUS, SNACKS, week, n % 5, { allergies: KINDY, excluded: [], favorites: [], leftover: "" }, stubPrices);
      for (const d of next.planData) {
        expect(isExcludedMenu({ ingredients: d.rawIngredients }), d.menuName).toBe(false);
        for (const s of d.snacks) expect(isExcludedSnack(s), s.name).toBe(false);
        expect(actualPrep(d)).toEqual(expectedPrep(d.rawIngredients, d.snacks, d.menuName));
      }
    }
  });

  it("공유 링크: 킨디가 실린 링크에 뺀 메인·간식을 넣으면 거절, 정상 링크는 손질 안내까지 되살린다", async () => {
    const nachos = MENUS.find((m) => m.name === "Nachos")!;
    expect(isExcludedMenu(nachos), "Nachos가 더는 뺀 메인이 아니다 — 대조 대상을 바꿀 것").toBe(true);
    const ok = MENUS.filter((m) => !isExcludedMenu(m) && m.ingredients.some((i) => APPROVED_ALTER[i])).slice(0, 5);
    const base = { allergies: KINDY, excluded: [], prepStyles: [], thermosOnly: false, useSales: false, saleStores: [] };

    const decoded = decodeSharedPlan(encodeSharedPlan({ ...base, days: ok.map((m) => ({ menu: m.name, snacks: ["Grapes"] })) })!)!;
    expect(decoded.allergies).toEqual(KINDY);
    const opened = await buildSharedPlan(MENUS, SNACKS, decoded, stubPrices);
    for (const d of opened.planData) {
      expect(actualPrep(d)).toEqual(expectedPrep(d.rawIngredients, d.snacks, d.menuName));
      expect((d.kindyPrep ?? []).length).toBeGreaterThan(0);
    }

    const badMenu = { ...base, days: [nachos, ...ok.slice(1)].map((m) => ({ menu: m.name, snacks: [] })) };
    await expect(buildSharedPlan(MENUS, SNACKS, badMenu, stubPrices)).rejects.toMatchObject({ code: "FILTER_MISMATCH" });
    const badSnack = { ...base, days: ok.map((m, i) => ({ menu: m.name, snacks: i ? [] : ["Popcorn"] })) };
    await expect(buildSharedPlan(MENUS, SNACKS, badSnack, stubPrices)).rejects.toBeInstanceOf(PlanInputError);
    // 같은 링크라도 킨디가 없으면 통과한다 — 거절의 이유가 킨디다
    await expect(buildSharedPlan(MENUS, SNACKS, { ...badMenu, allergies: [] }, stubPrices)).resolves.toBeTruthy();
    // 익힌 병아리콩이 든 메인은 킨디에서도 남는다 — 「우리 판단」은 간식 하나에만 걸린다
    const chickpeaMains = MENUS.filter((m) => m.ingredients.includes("Chickpeas"));
    expect(chickpeaMains.length).toBeGreaterThan(0);
    const withChickpeas = { ...base, days: [...chickpeaMains, ...ok].slice(0, 5).map((m) => ({ menu: m.name, snacks: [] })) };
    await expect(buildSharedPlan(MENUS, SNACKS, withChickpeas, stubPrices)).resolves.toBeTruthy();
  });

  it("공유 링크 인덱스: Kindy는 끝에 붙었다 — 이미 나간 링크의 뜻이 안 바뀐다", () => {
    expect(SHARE_ALLERGIES.slice(0, 6)).toEqual(["Nut Allergy", "Dairy Allergy", "Gluten Allergy", "Egg Allergy", "Vegetarian", "Vegan"]);
    expect(SHARE_ALLERGIES.indexOf("Kindy")).toBe(6);
  });
});

describe("🔴 킨디는 알레르겐이 아니다", () => {
  it("모르는 재료를 킨디만으로 위반으로 세지 않는다 · ⚠를 만들지 않는다", () => {
    expect(dietViolations(["Not A Real Ingredient"], KINDY)).toEqual([]);
    expect(dietViolations(["Not A Real Ingredient"], ["Kindy", "Vegan"])).toEqual([{ ingredient: "Not A Real Ingredient", reason: "unknown" }]);
    const nachos = MENUS.find((m) => m.name === "Nachos")!;
    expect(mayContainNotes(nachos.ingredients, KINDY)).toEqual([]);
  });

  it("간식 통과 판정: 킨디 = 리터럴 목록, 다른 조건과 겹쳐도 그대로", () => {
    for (const s of POOL) {
      expect(snackAllowed(s, KINDY), s.name).toBe(!isExcludedSnack(s));
      expect(snackAllowed(s, []), s.name).toBe(true);
    }
  });

  it("저장분: 킨디로 저장된 식단에 뺀 음식이 있으면 되살리지 않는다", () => {
    const day = (main: string[], snacks: SnackItem[]) => ({ rawIngredients: main, snacks });
    const popcorn = POOL.find((s) => s.name === "Popcorn")!;
    const chick = POOL.find((s) => s.name === "Roasted Chickpeas")!;
    const grapes = POOL.find((s) => s.name === "Grapes")!;
    const saved = (allergies: AllergyType[], d: ReturnType<typeof day>) => ({ schema: PLAN_SCHEMA, filters: { allergies, excluded: [] }, planData: [d] });
    expect(savedPlanIsStale(saved(KINDY, day(["Corn Chips", "Salsa"], [grapes])))).toBe(true);
    expect(savedPlanIsStale(saved(KINDY, day(["Rice"], [popcorn])))).toBe(true);
    expect(savedPlanIsStale(saved(KINDY, day(["Rice"], [chick])))).toBe(true);
    expect(savedPlanIsStale(saved(KINDY, day(["Rice"], [grapes])))).toBe(false);
    expect(savedPlanIsStale(saved([], day(["Corn Chips", "Salsa"], [popcorn])))).toBe(false);
  });

  it("화면: 생성·복원이 같은 함수로 안내를 내고, 문구를 표의 id로 찾는다", () => {
    const src = read("components/PlannerClient.tsx");
    expect(src).toMatch(/dayKindyPrep\(d\.rawIngredients \?\? \[\], d\.snacks \?\? \[\], opts\.allergies, d\.menuName\)/);
    expect(src).toMatch(/item\.kindyPrep\.map/);
    expect(src).toMatch(/activeRecipe\.kindyPrep\.map/);
    expect(src).toMatch(/t\(`kindy_prep_\$\{n\.prep\}`\)/);
    expect(src).toMatch(/"Kindy": "planner_allergy_kindy"/);
    // 모바일 첫 화면의 Kindy 토글 = 사이드바와 같은 함수(양 연동 포함). 10-20 유치원이 휴대폰에서 못 찾았다
    expect(src).toMatch(/onClick=\{\(\) => toggleAllergy\(a\)\}/);
    expect(src).toMatch(/onClick=\{\(\) => toggleAllergy\("Kindy"\)\}/);
    expect(read("lib/planGenerator.ts")).toMatch(/dayKindyPrep\(menu\.ingredients, dailySnacks, allergies, menu\.name\)/);
    // 킨디 안내 링크 = 관련 글 매핑 = 간식 확인 페이지 링크
    const slug = (FILTER_ARTICLES.Kindy as { slug: string }).slug;
    expect(GUIDES[slug], slug).toBeTruthy();
    expect(src).toContain(`const KINDY_GUIDE = "${slug}"`);
    expect(read("app/[locale]/snack-checker/page.tsx")).toContain(`/guides/${slug}`);
  });

  it("dayKindyPrep: 킨디가 꺼져 있으면 빈 배열", () => {
    expect(dayKindyPrep(["Grapes", "Chicken"], [], ["Vegetarian"])).toEqual([]);
    expect(dayKindyPrep(["Grapes", "Chicken"], [], KINDY).length).toBe(3);
  });
});

describe("🔴 간식 확인 페이지의 Kindy 줄 = 같은 표", () => {
  it("행마다: 뺀 것 = 리터럴 목록, 손질 = 리터럴 손질표, 나머지는 none", () => {
    const rows = checkerRows();
    expect(rows.map((r) => r.name).sort()).toEqual(POOL.map((s) => s.name).sort());
    for (const r of rows) {
      const s = POOL.find((x) => x.name === r.name)!;
      expect(r.choking, r.name).toEqual(snackChokingFlag(s));
      if (isExcludedSnack(s)) {
        expect(r.choking.kind, r.name).toBe("exclude");
        if (r.choking.kind === "exclude") expect(r.choking.rule.basis, r.name).toBe(APPROVED_OURS_SNACKS.includes(r.name) ? "ours" : "guide");
      } else if (s.ingredients.some((i) => APPROVED_ALTER[i])) {
        expect(r.choking.kind, r.name).toBe("alter");
        if (r.choking.kind === "alter") {
          expect(r.choking.notes.map((n) => `${n.ingredient}|${MSG.en[`kindy_prep_${n.prep}`]}`).every((x) => {
            const [ing, text] = x.split("|");
            return APPROVED_ALTER[ing].some((h) => text.startsWith(h));
          }), r.name).toBe(true);
        }
      } else {
        expect(r.choking.kind, r.name).toBe("none");
      }
    }
  });

  it("요약 개수가 행과 리터럴 목록에서 다시 센 값과 같다 (양성 대조 포함)", () => {
    const s = checkerSummary();
    const out = POOL.filter(isExcludedSnack);
    expect(s.kindyExcluded).toBe(out.length);
    expect(s.kindyOurs).toBe(out.filter((x) => APPROVED_OURS_SNACKS.includes(x.name)).length);
    expect(s.kindyAlter).toBe(POOL.filter((x) => !isExcludedSnack(x) && x.ingredients.some((i) => APPROVED_ALTER[i])).length);
    expect(s.kindyExcluded, "뺀 간식 0 — 대조가 비었다").toBeGreaterThan(0);
    expect(s.kindyAlter, "손질 간식 0 — 대조가 비었다").toBeGreaterThan(0);
  });

  it("클라이언트가 같은 문구 키로 그린다", () => {
    const src = read("components/SnackCheckerClient.tsx");
    expect(src).toMatch(/kindy_cat_\$\{c\.rule\.category\}/);
    expect(src).toMatch(/kindy_prep_\$\{n\.prep\}/);
    expect(src).toMatch(/<KindyLine r=\{r\} \/>/);
  });
});

describe("🔴 킨디 가이드 글 — 숫자·이름·문구가 데이터와 같다", () => {
  const g = GUIDES["kindy-lunchbox-choking-guide-nz"];
  const body = g.body;
  const menusOut = MENUS.filter(isExcludedMenu).map((m) => m.name);
  const snacksOut = POOL.filter(isExcludedSnack).map((s) => s.name);

  it("「N of our M mains」·「N of the M snacks」가 원본에서 다시 센 값이다", () => {
    expect(body).toContain(`${menusOut.length} of our ${MENUS.length} mains`);
    expect(body).toContain(`${snacksOut.length} of the ${POOL.length} snacks the planner packs`);
    for (const n of [...menusOut, ...snacksOut]) expect(body, n).toContain(n);
    expect(menusOut.length).toBeGreaterThan(0);
  });

  it("손질 표가 플래너 카드와 같은 문구를 쓴다 — 쓰이는 손질법 전부", () => {
    const used = new Set(Object.values(ALTER_INGREDIENTS).flat());
    for (const p of used) {
      expect(body, p).toContain(MSG.en[`kindy_prep_${p}`]);
      if (PREPS[p as PrepId].older) expect(body, `${p}_46`).toContain(MSG.en[`kindy_prep_${p}_46`]);
    }
    for (const i of Object.keys(APPROVED_ALTER)) expect(body, i).toContain(i);
  });

  it("지침의 아홉 줄을 다 싣고, 우리 판단을 우리 것이라 밝히고, 출처·라이선스·PDF를 단다", () => {
    for (const line of GUIDE_EXCLUDE_LINES) expect(body.toLowerCase(), line).toContain(line);
    expect(body).toMatch(/our own judgement, not something the Ministry of Health says/);
    expect(body).toContain("Roasted Chickpeas");
    expect(body).toContain(CHOKING_SOURCE.url);
    expect(body).toContain(CHOKING_SOURCE.licenceUrl);
    expect(body).toMatch(/adapts and summarises/);
    expect(body).toMatch(/has not reviewed or endorsed/);
    expect(g.contentUpdated).toBe("2026-10-21");
  });

  it("양은 5–12세 기준이라는 것을 글·화면·FAQ가 모두 말한다", () => {
    expect(body).toMatch(/sized for primary school children aged 5–12/);
    for (const l of LOCALES) {
      expect(MSG[l].planner_kindy_note, l).toMatch(/5–12/);
      expect(MSG[l].faq_a33, l).toMatch(/5–12/);
      expect(MSG[l].faq_a24, `${l}: faq_a24가 킨디 선택지를 말한다`).toContain(MSG[l].planner_allergy_kindy);
      expect(MSG[l].faq_a33, `${l}: faq_a33이 선택지 이름을 그대로 쓴다`).toContain(MSG[l].planner_allergy_kindy);
    }
  });

  it("FAQ 33: 세 언어에 있고, 페이지에 실리고, 예로 든 손질·우리 판단이 표와 맞는다", () => {
    for (const l of LOCALES) {
      expect(MSG[l].faq_q33, l).toBeTruthy();
      expect(MSG[l].faq_a33, l).toBeTruthy();
    }
    expect(read("app/[locale]/faq/page.tsx")).toMatch(/keys: \[[^\]]*\b33\b[^\]]*\]/);
    expect(ALTER_INGREDIENTS["Grapes"]).toContain("small_round");
    expect(ALTER_INGREDIENTS["Cherry Tomatoes"]).toContain("small_round");
    expect(MSG.en.kindy_prep_small_round).toMatch(/^Quarter/);
    expect(MSG.en.faq_a33).toMatch(/quartering grapes and cherry tomatoes/);
    expect(MSG.en.faq_a33).toMatch(/roasted chickpeas; that one is our own call/);
    expect(Object.keys(EXCLUDE_SNACKS)).toContain("Roasted Chickpeas");
  });
});

describe("🔴 익혀서 무른 재료에는 손질 안내를 안 붙인다", () => {
  it("블루베리 머핀엔 블루베리 안내가 없고, 간식 블루베리엔 있다", () => {
    const muffin = MENUS.find((m) => m.name === "Blueberry Muffins")!;
    expect(muffin.ingredients).toContain("Blueberries");
    expect(dayKindyPrep(muffin.ingredients, [], KINDY, muffin.name).map((n) => n.ingredient)).not.toContain("Blueberries");
    // 양성 대조 — 메뉴 이름 없이 부르면 붙는다(규칙이 실제로 걸러 낸 것이다)
    expect(dayKindyPrep(muffin.ingredients, [], KINDY).map((n) => n.ingredient)).toContain("Blueberries");
    expect(dayKindyPrep([], [{ name: "Blueberries", ingredients: ["Blueberries"] }], KINDY, muffin.name).map((n) => n.ingredient)).toContain("Blueberries");
  });
});

describe("🔴 메일이 말하는 「under 5」를 양 목록에서도 찾을 수 있다", () => {
  // 10-21 Wainui Playcentre: 「you cant select under 5 for portion sizes. Only for allergens.」
  // 양 목록에 Kindy가 있었지만 라벨에 「under 5」가 없어 못 찾았다.
  const msg = (lang: string) => JSON.parse(readFileSync(`messages/${lang}.json`, "utf8"));

  it("en: 알레르기 토글과 양 목록이 둘 다 「under 5」를 쓴다", () => {
    const en = msg("en");
    expect(en.planner_allergy_kindy.toLowerCase()).toContain("under 5");
    expect(en.portion_band_kindy.toLowerCase()).toContain("under 5");
  });

  it("ko·zh 양 목록에도 「5세 미만」에 해당하는 말이 있다", () => {
    expect(msg("ko").portion_band_kindy).toContain("5세 미만");
    expect(msg("zh").portion_band_kindy).toContain("5岁以下");
  });
});
