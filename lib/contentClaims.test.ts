import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import menuData from "@/data/menuData.json";
import { GUIDES, RECIPES } from "@/content/guides";
import { POSTS, exclusionReasonFor } from "@/content/posts";
import type { MenuItem, SnackData, SnackItem, PriceInfo } from "./types";
import { PORTION_FACTORS, DEFAULT_PORTION, PORTION_BASIS, PORTION_BASIS_UNVERIFIED } from "./planConfig";
import { ingredientCost, type RecipeItem } from "./recipeCost";
import { labelFor, declares, warnsAbout, labelledCount, ALLERGEN_PATTERNS } from "./allergenLabels";
import { PINNED_SKUS, RECIPE_ONLY_INGREDIENTS } from "./priceSearch.mjs";
import { costForIngredients } from "./planGenerator";
import { readTimeFor } from "./readTime";
import PRICES from "@/data/price_cache.json";
import { serveLabel, wrapVsBreadClause, boxMedianLabel, boxWeekLabel, boxMedian, snackSlotsCost, exampleWeekRows, exampleWeekTotal, EXAMPLE_WEEK, portionExample, methodExample, boxFloorLabel, boxCeilingLabel, budgetWeek, budgetWeekTotal, budgetWeekTotalLabel, budgetWeekRows } from "./servePrice";
import index from "@/data/priceIndex.json";
import { isComparableRow, isThreeWayComparableRow, basketFigures, firstRoundRows, respecifiedSince, type PriceRow } from "./priceIndexCompare";
import { SUNDAY_SHOP, sundayShopLabel, sundayShopTotal } from "./sundayShop";
import { packSize, packPrice, servePrice, cheeseIsCheapestProtein } from "./servePrice";
import { POST_COUNT, GUIDE_COUNT, BLOG_PAGE_CARD_COUNT } from "./siteCounts";
import { withBrand, TITLE_MAX } from "./seo/pageMetadata";
import {
  policyFingerprint, PRIVACY_FINGERPRINT, TERMS_FINGERPRINT,
  PRIVACY_REVISIONS, TERMS_REVISIONS, privacyEffective, termsUpdated,
} from "./policyRevisions";
// 🔴 정적 import 여야 한다 — 동적 import 는 다른 모듈 인스턴스를 줘서
//    가격 캐시를 변형해도 안 보인다(09-14에 양성 대조가 그래서 조용히 통과했다).
import * as SNACK from "./snackEconomics";
import * as SP_VEG from "./servePrice";

/**
 * 가이드 본문에 써 넣은 "우리 데이터 기반 수치"가 실제 데이터와 어긋나면 실패한다.
 *
 * 2026-07-28에 가이드 몇 편을 일반론에서 벗어나게 하려고 자체 데이터에서 뽑은
 * 숫자(전체 94종 중 nut-free 89종 등)를 본문에 직접 박았다. 메뉴가 추가·수정되면
 * 이 숫자들은 조용히 거짓이 된다. 실제 가격·수치로 신뢰를 사는 사이트에서
 * 그건 가장 비싼 종류의 오류다.
 */
const MENUS = (menuData as { MENU_DATA: { en: MenuItem[] } }).MENU_DATA.en;
const count = (pred: (m: MenuItem) => boolean) => MENUS.filter(pred).length;

describe("🔴 계정 기능 설명이 실제 구현과 일치한다", () => {
  // 2026-08-10: 계정을 "선택사항"으로 남기기로 하면서 설명을 전수 대조했더니
  // 네 군데가 사실이 아니었다. 기능을 지우는 대신 **문구를 사실에 맞췄다**.
  //   - FAQ 3개 언어가 "sign in with Google"이라 했지만 코드는 이메일+비밀번호뿐
  //   - 계정 페이지가 "Save Weekly Plans"를 내세웠지만 그런 저장은 없다
  //   - 대시보드의 Saved Plans/Favourites 숫자가 하드코딩된 "–"였다
  //   - 약관이 plan history·allergy preferences를 저장한다고 했다
  const src = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf-8");
  const LOCALES = ["en", "ko", "zh"] as const;
  const messages = Object.fromEntries(
    LOCALES.map((l) => [
      l,
      JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8")) as Record<string, string>,
    ]),
  );

  it("쓰는 DB 테이블은 favorites 하나뿐이다 (혜택 주장의 근거)", () => {
    const files = [
      "components/PlannerClient.tsx",
      "app/[locale]/account/AccountClient.tsx",
      "app/api/email/send/route.ts",
    ];
    const tables = new Set<string>();
    for (const f of files) {
      for (const m of src(f).matchAll(/\.from\("([a-z_]+)"\)/g)) tables.add(m[1]);
    }
    // 테이블이 늘면 혜택 문구도 같이 바뀌어야 한다 — 여기서 멈춰서 확인할 것.
    expect([...tables].sort()).toEqual(["favorites"]);
  });

  it("존재하지 않는 로그인 수단을 광고하지 않는다", () => {
    const auth = src("components/AuthModal.tsx");
    expect(auth, "코드에 OAuth가 생겼다면 문구를 되살릴 것").not.toMatch(/signInWithOAuth/);
    for (const l of LOCALES) {
      const all = JSON.stringify(messages[l]);
      expect(all, `${l}: 없는 Google 로그인을 광고한다`).not.toMatch(/Google.?(로그인|登录)|sign in with Google/i);
    }
  });

  it("계정 혜택으로 '주간 계획 저장'을 내세우지 않는다", () => {
    for (const l of LOCALES) {
      expect(messages[l].account_save_plans_feature, `${l}: 없는 기능이 되살아났다`).toBeUndefined();
    }
    const account = src("app/[locale]/account/AccountClient.tsx");
    expect(account, "하드코딩된 통계 타일이 되살아났다").not.toContain('">–</p>');
  });

  it("가입 시 수집하지 않는 항목을 수집한다고 말하지 않는다", () => {
    // 가입 폼은 email + password뿐이다. 이름 칸이 없다.
    for (const l of LOCALES) {
      // ⚠️ 부정문("we do not ask for your name")까지 잡히면 안 된다.
      //    "수집한다"는 **주장**만 잡도록 동사에 붙여서 본다.
      expect(messages[l].privacy_1_li1, `${l}: 이름 수집 주장`).not.toMatch(
        /collect[^.]*your name|이름[^.]*수집|收集[^。]*姓名/i,
      );
    }
    const terms = src("app/[locale]/terms/page.tsx");
    expect(terms, "저장하지 않는 항목을 저장한다고 말한다").not.toContain("plan history, allergy preferences");
  });
});

describe("🔴 3개 언어·UI까지 같은 기준을 지킨다", () => {
  // 🔴 2026-08-10: Aussie를 정리하며 만든 검사를 Kiwi에 되돌려 돌렸더니 또 나왔다.
  //   - 08-09에 AI 문구를 지웠는데 **영어만** 했다. ko/zh에 "AI 기반"·"AI 驱动"이 남았고,
  //     영어에도 "the AI will try to incorporate them"이 남아 있었다(가드가 /our AI/ 였다)
  //   - 약관 제목 "Use of the AI Meal Planner" ↔ 바로 아래 본문
  //     "does not ... use a large language model" — 한 화면 안에서 모순
  //   - UI 배지가 주간 캐시값에 "Live"를 붙이고 있었다
  //   - planner_seo_price_p가 "estimates for Pak'nSave"라 했지만 플래너엔 없다
  //   - "most NZ families find ... $10-$15" ← 우리 계산은 하루 $4.11 → 5일 $20.56.
  //     **우리 데이터보다 싸게 말하는 증언**이었다
  const src2 = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf-8");
  const LOC = ["en", "ko", "zh"] as const;
  const msg = Object.fromEntries(
    LOC.map((l) => [l, JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8")) as Record<string, string>]),
  );

  it("세 언어와 약관까지 AI라고 말하지 않는다", () => {
    for (const l of LOC) expect(JSON.stringify(msg[l]), `${l}: AI 주장`).not.toMatch(/\bAI\b|AI 기반|AI ?驱动/i);
    expect(src2("app/[locale]/terms/page.tsx"), "약관 제목").not.toMatch(/AI Meal Planner/);
  });

  it("가격을 실시간이라고 말하지 않는다 (주 1회 캐시)", () => {
    expect(src2("lib/supermarketApi.ts")).toMatch(/Weekly price cache/i);
    expect(src2("components/PlannerClient.tsx"), "UI 배지").not.toMatch(/\? "Live" :/);
    for (const l of LOC)
      expect(JSON.stringify(msg[l]), `${l}: 실시간 주장`).not.toMatch(
        /(live|real-?time)[ -](Woolworths |NZ supermarket )?pric|실시간 데이터|实时价格/i,
      );
  });

  it("확인할 수 없는 이용자 증언을 싣지 않는다", () => {
    for (const l of LOC)
      expect(JSON.stringify(msg[l]), `${l}: 증언`).not.toMatch(
        // ⚠️ 조사(은/이/은/도)와 어미가 바뀌면 좁은 패턴은 그냥 통과한다. 08-10에
        //    "대부분의 가족**이**"를 놓쳤다. 어미를 열어 둔다.
        /typically s(ave|pend)|most (nz )?families (find|land)|대부분의 (NZ )?(가족|가정)|大多数家庭/i,
      );
  });

  it("메시지 파일에 깨진 문자가 없다", () => {
    for (const l of LOC) {
      const bad = Object.entries(msg[l]).filter(([, v]) => String(v).includes("\uFFFD"));
      expect(bad.map(([k]) => k), `${l}: 깨진 문자`).toEqual([]);
    }
  });
});

describe("🔴 데이터 수집 방식을 사실대로 말한다", () => {
  // 🔴 2026-08-10: Aussie에서 "하지 않은 조사를 했다"는 글 3편을 지운 뒤 같은 검사를
  //    Kiwi에 돌렸더니, **가격지수 페이지 본문**이 이렇게 말하고 있었다:
  //      "Every figure on this page is verified by hand at a real store on a real day.
  //       There are no scraped APIs..."
  //    실제로는 Woolworths 열을 `scripts/update_price_index.mjs`가
  //    `woolworths.co.nz/api/v1/products`에서 **자동으로** 받아온다.
  //    사이트 신뢰가 걸린 바로 그 페이지에서 정반대를 말하고 있었다.
  //
  //    같은 검사에서 "re-checked in person every month"도 나왔다(08-09에 홈의
  //    "checked in-store monthly"는 고쳤는데 **기사를 놓쳤다** — 같은 자리가 셋이었다).
  const src = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf-8");

  it("자동 수집을 손수 확인이라고 말하지 않는다", () => {
    const script = src("scripts/update_price_index.mjs");
    expect(script, "자동 수집이 사라졌다면 문구를 되살릴 것").toMatch(/api\/v1\/products/);
    const page = src("app/[locale]/price-index/page.tsx");
    expect(page).not.toMatch(/no scraped APIs?/i);
    expect(page).not.toMatch(/Every figure on this page is verified by hand/i);
    expect(page, "자동 수집을 밝히는 문장이 있어야 한다").toMatch(/pulled automatically/i);
  });

  it("지키지 않는 갱신 주기를 약속하지 않는다", () => {
    // Woolworths=주간 자동, Pak'nSave=매장 방문(2026-05-16 이후 멈춰 있다).
    // "매월"이라고 쓰면 그 순간 거짓이 된다.
    const bodies = [
      ...Object.values(GUIDES).map((g) => String(g.body)),
      ...Object.values(POSTS).map((p) => String(p.body)),
      src("app/[locale]/price-index/page.tsx"),
      src("app/[locale]/page.tsx"),
    ];
    for (const b of bodies) {
      expect(b).not.toMatch(/re-checked in person every month|checked in-store monthly|monthly snapshot/i);
    }
  });
});

describe("내부 링크", () => {
  // 🔴 2026-08-09: GSC 미색인을 파고들다 나왔다. 색인 안 된 기사 3편 중 2편이
  //    내부 인바운드 0~1이었고, spring은 **아무 글도 링크하지 않는 고아**였다.
  //    (인바운드가 색인을 보장하진 않는다 - back-to-school은 0이어도 색인됐다.
  //     다만 고아 페이지를 안 만드는 건 우리가 쥔 몇 안 되는 레버다.)
  const docs: [string, string][] = [
    ...Object.entries(POSTS).map(([k, p]) => ["/blog/" + k, String(p.body)] as [string, string]),
    ...Object.entries(GUIDES).map(([k, g]) => ["/guides/" + k, String(g.body)] as [string, string]),
  ];

  it("고아 문서가 없다 (모든 기사·가이드가 최소 1곳에서 링크된다)", () => {
    const orphans = docs
      .filter(([path]) => !docs.some(([other, body]) => other !== path && body.includes(path)))
      .map(([path]) => path);
    expect(orphans, `어디서도 링크되지 않는 문서: ${orphans.join(", ")}`).toEqual([]);
  });

  it("내부 링크가 실재하는 문서를 가리킨다", () => {
    const slugs = new Set(docs.map(([p]) => p));
    const dead: string[] = [];
    for (const [from, body] of docs) {
      for (const m of body.matchAll(/\]\(\/en(\/(?:blog|guides)\/[a-z0-9-]+)\)/g)) {
        if (!slugs.has(m[1])) dead.push(`${from} -> ${m[1]}`);
      }
    }
    expect(dead, `존재하지 않는 문서로 가는 링크: ${dead.join(", ")}`).toEqual([]);
  });
});

// 언어별로 따로 쓴다 — 한 정규식으로 셋을 다 덮으려다 zh(띄어쓰기 없음)를 놓쳤다.
const RECIPE_COUNT_PATTERNS = [
  /(\d{2,4})\s*\+?\s*(?:(?!guides?\b|posts?\b|articles?\b|pages?\b)[\w'’-]+\s+){0,4}recipes/gi,
  /(\d{2,4})\s*(?:개|종|가지)?(?:의|\s*이상(?:의)?)?\s*(?:(?!가이드|글|편)[가-힣]+\s+){0,4}레시피/g,
  /(\d{2,4})\s*多?\s*[种道个]?(?!指南|文章)\p{sc=Han}{0,8}食谱/gu,
];

describe("가이드 본문의 수치가 메뉴 데이터와 일치한다", () => {
  it("전체 메뉴 수", () => {
    expect(MENUS.length).toBe(94);
  });

  it("문구가 말하는 레시피 개수가 실제 개수와 같다 (3개 언어)", () => {
    // 🔴 위의 `toBe(94)`는 **데이터만** 고정한다. 문구가 "over 200 recipes"라고
    //    말해도 통과한다. 실제로 오늘 `faq_a16`이 "over 60 recipes"였고 실제는
    //    94였다. 그리고 Aussie에서는 en/ko/zh `faq_a16`이 "over 100"인데
    //    **같은 파일의 다른 세 키는 63**이라, 한 파일이 제 자신과 모순돼 있었다.
    //    데이터가 아니라 **주장**을 데이터에 묶어야 한다.
    for (const l of ["en", "ko", "zh"] as const) {
      const m = JSON.parse(
        readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8"),
      ) as Record<string, string>;
      for (const [k, v] of Object.entries(m)) {
        if (typeof v !== "string") continue;
        // 🔴 숫자와 "recipes"가 **붙어 있다고 가정**했다가 또 놓쳤다. `planner_seo_allergy_p`가
        //    3개 언어 모두 "over 100 New Zealand-friendly recipes"(실제 94)였는데,
        //    수식어 하나가 끼어 있다는 이유로 이 검사를 통과했다. 사이 수식어를 허용하되,
        //    "44 guides covering recipes"처럼 **다른 셈 단위**가 끼면 레시피 개수가 아니다.
        for (const re of RECIPE_COUNT_PATTERNS) {
          for (const hit of v.matchAll(re)) {
            expect(Number(hit[1]), `${l}.${k}: "${hit[0]}" — 실제 메뉴는 ${MENUS.length}개다`)
              .toBe(MENUS.length);
          }
        }
        // "60개 이상"처럼 흐리면 개수가 바뀌어도 아무도 못 잡는다.
        expect(v, `${l}.${k}: 개수를 흐리게 말한다`).not.toMatch(
          new RegExp(
            String.raw`over \d{2,4} (?:[\w'’\-]+ ){0,4}recipes|\d{2,4}개 이상[^.]{0,20}레시피|\d{2,4}\s*多[^。]{0,20}食谱`,
            "i",
          ),
        );
      }
    }
  });

  it("식이제한별 메뉴 수 (school-lunchbox-policy-guide-nz 표)", () => {
    expect(count((m) => !!m.is_nut_free)).toBe(89);
    // 🔴 2026-09-06: Dumplings의 is_egg_free를 내렸다 — Woolworths의 유일한 만두피가
    //    「Gluten, Eggs and Soy를 다루는 시설에서 제조」를 선언한다. 그동안 이 가드가
    //    통과한 건 폴백 가격이라 **알레르겐 라벨 자체가 없었기 때문**이다. 66 → 65.
    expect(count((m) => !!m.is_egg_free)).toBe(65);
    expect(count((m) => !!m.is_vegetarian)).toBe(53);
    // 🔴 2026-08-23: Char Siu Bao의 is_dairy_free를 내렸다 — 유일하게 파는 플레인 바오번이
    //    우유를 **선언**한다(상품 API). 그래서 dairy가 걸린 값들이 하나씩 줄었다.
    expect(count((m) => !!m.is_dairy_free)).toBe(43);
    expect(count((m) => !!m.is_gluten_free)).toBe(23);
    expect(count((m) => !!m.is_vegan)).toBe(21);
  });

  it("조리방식별 메뉴 수 (lunchbox-food-safety-guide-nz 표)", () => {
    expect(count((m) => m.prep_style === "no-cook")).toBe(28);
    expect(count((m) => m.prep_style === "make-ahead")).toBe(47);
    expect(count((m) => m.prep_style === "cook-fresh")).toBe(19);
    expect(count((m) => !!m.is_thermos)).toBe(14);
  });

  it("알레르기 조합별 메뉴 수 (allergy-management-school-lunchbox-nz 표)", () => {
    const and = (...fs: ((m: MenuItem) => boolean)[]) =>
      count((m) => fs.every((f) => f(m)));
    const nut = (m: MenuItem) => !!m.is_nut_free;
    const dairy = (m: MenuItem) => !!m.is_dairy_free;
    const egg = (m: MenuItem) => !!m.is_egg_free;
    const gluten = (m: MenuItem) => !!m.is_gluten_free;
    expect(and(nut, egg)).toBe(61); // 09-06 Dumplings is_egg_free 해제
    expect(and(nut, dairy)).toBe(40);
    expect(and(nut, gluten)).toBe(23);
    expect(and(nut, dairy, egg)).toBe(29); // 09-06 Dumplings is_egg_free 해제
    expect(and(nut, dairy, egg, gluten)).toBe(11);
  });

  it("계절 가이드의 전단 빈도 표가 데이터에서 나오고, 따로 센 값과 맞는다", async () => {
    // 09-28까지 손으로 적은 6주 표였고 같은 기간 파일 데이터와도 어긋났다(당근 5 vs 4).
    const seasonal = GUIDES["nz-seasonal-produce-calendar"].body;
    expect(seasonal).not.toContain("Weeks featured (of 6)");
    const promo = (await import("@/data/promotions.json")).default as unknown as {
      weeks: Record<string, { stores: Record<string, { items: { name: string; category: string }[] }> }>;
    };
    // 독립 재계산 — lib/promoHistory의 코드를 쓰지 않고 연속 구간과 사과 주 수를 다시 센다
    const all = Object.keys(promo.weeks).sort();
    const run: string[] = [all[all.length - 1]];
    for (let i = all.length - 2; i >= 0; i--) {
      const next = new Date(`${all[i]}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 7);
      if (next.toISOString().slice(0, 10) !== run[0]) break;
      run.unshift(all[i]);
    }
    const apples = run.filter((w) =>
      Object.values(promo.weeks[w].stores).some((st) =>
        st.items.some((it) => it.category === "Produce" && /\bapple/i.test(it.name)),
      ),
    ).length;
    expect(seasonal).toContain(`Weeks featured (of ${run.length})`);
    expect(seasonal).toMatch(new RegExp(`\\| [^|]*Apples[^|]*\\| (\\*\\*)?${apples}(\\*\\*)?( each)? \\|`));
  });

  it("🔴 09-28 재검토 — 옛 가이드 3편이 사실·실제 동작과 다시 어긋나지 않는다", () => {
    const policy = GUIDES["school-lunchbox-policy-guide-nz"].body;
    // 「모든 플랜이 견과 제외가 기본값」이라 적혀 있었는데 알레르기 초기값은 빈 배열이다(PlannerClient).
    expect(policy).not.toMatch(/nut-free defaults/);
    expect(readFileSync("components/PlannerClient.tsx", "utf8")).toContain("useState<AllergyType[]>([])");
    // Ka Ora, Ka Ako는 교육부가 Equity Index로 지정한다 — 학교가 신청하지 않는다.
    expect(policy).not.toMatch(/Schools apply to participate/);

    const seasonal = GUIDES["nz-seasonal-produce-calendar"].body;
    // 손으로 적은 농산물 가격이 서로·우리 데이터와 어긋나 있었다(11월 딸기 $2-3과 $5.49, 6월 귤 $2-3/kg vs 전단 $5.49).
    expect(seasonal, "계절 가이드에 손으로 적은 가격이 돌아왔다").not.toMatch(/\$\d/);
    // 남반구 햇사과는 2~3월이다. 9~10월 사과는 저장품이다.
    expect(seasonal).not.toMatch(/new-season (varieties|NZ apples)/);
    expect(seasonal).not.toMatch(/Heart Foundation 5\+ A Day/);

    const term1 = POSTS["term-1-first-week-lunchbox-routine-auckland-parent"].body;
    expect(term1).toContain(`about **${boxWeekLabel()}** a child for the week`);
    expect(term1).not.toMatch(/Heart Foundation framework/);
  });

  it("본문에 그 수치가 실제로 적혀 있다 (표만 고치고 문장을 놓치는 것 방지)", () => {
    const policy = GUIDES["school-lunchbox-policy-guide-nz"].body;
    expect(policy).toContain("89 of them");
    // 🔴 09-28: 여기가 "94%"였다 — 89/94 = 94.7%라 같은 글의 표(95%)와 어긋난 채로 고정돼 있었다. 반올림값과 대조한다.
    expect(policy).toContain(`89 of them — ${Math.round((89 / count(() => true)) * 100)}% —`);

    const safety = GUIDES["lunchbox-food-safety-guide-nz"].body;
    expect(safety).toContain("**28 are no-cook**");
    expect(safety).toContain("**47 are make-ahead**");
    expect(safety).toContain(`**${count((m) => !!m.is_thermos)} menus are thermos-friendly**`);

    const allergy = GUIDES["allergy-management-school-lunchbox-nz"].body;
    expect(allergy).toContain("| **11** | **12%** |");

    const veg = GUIDES["vegetarian-vegan-school-lunch-guide-nz"].body;
    // 🔴 09-28: 여기가 손글씨 중앙값($1.80·$3.08·$1.85)을 고정하고 있었다 — 계산값은 그때 $1.74·$3.03·$1.90.
    //    이 파일 안에서 독립적으로 다시 계산한 중앙값과 대조한다.
    const med = (xs: number[]) => {
      const a = [...xs].sort((x, y) => x - y);
      const k = Math.floor(a.length / 2);
      return a.length % 2 ? a[k] : (a[k - 1] + a[k]) / 2;
    };
    const mainCost = (m: MenuItem) =>
      m.ingredients.reduce((t, i) => {
        const p = (PRICES as Record<string, { data: { price?: number } }>)[i]?.data?.price;
        return t + (typeof p === "number" && p > 0 ? p : 0) * (PORTION_FACTORS[i] ?? DEFAULT_PORTION);
      }, 0);
    const $ = (n: number) => `$${n.toFixed(2)}`;
    const vegRows = MENUS.filter((m) => m.is_vegetarian);
    const meatRows = MENUS.filter((m) => !m.is_vegetarian);
    const veganRows = MENUS.filter((m) => m.is_vegan);
    expect(veg).toContain(`| Vegetarian | ${vegRows.length} | **${$(med(vegRows.map(mainCost)))}** |`);
    expect(veg).toContain(`| Contains meat or fish | ${meatRows.length} | **${$(med(meatRows.map(mainCost)))}** |`);
    expect(veg).toContain(`| Vegan | ${veganRows.length} | ${$(med(veganRows.map(mainCost)))} |`);
  });
});

describe("가이드 본문의 비용 수치가 실제 계산과 일치한다", () => {
  // 채식/비채식 메인의 중앙값을 본문에 박아 뒀다. 가격 캐시나 분량표가 바뀌면
  // 이 문장은 조용히 거짓이 된다. 값 자체보다 **본문과 계산이 갈라지는 것**을 잡는다.
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const cost = (ings: string[]) =>
    ings.reduce((t, i) => {
      const p = (PRICES as Record<string, { data: { price?: number } }>)[i]?.data?.price ?? 0;
      return t + p * (PORTION_FACTORS[i] ?? DEFAULT_PORTION);
    }, 0);

  /**
   * 🔴 2026-08-21: 여기 `PUBLISHED = { veg: 1.72, meat: 3.33, gap: 1.61 }`이 손으로 적혀
   *    있었다. 본문도 `$1.61`·`$80 a term`·`$306`을 손으로 적고 있었으니 **같은 값이 두 벌**이고,
   *    주간 갱신마다 둘 다 고쳐야 했다(주석이 그 이력을 두 줄 담고 있었다).
   *    크루아상 분량비율을 고치자 둘 다 어긋났다.
   *    → 본문을 `vegSaving()`·`vegPctLess()` 등으로 파생시키고, 여기서는
   *      **본문이 그 함수를 실제로 쓰는지**와 계산이 서로 맞는지를 본다.
   */
  it("채식/육류 수치를 본문이 파생으로 만든다 — 리터럴로 되돌아가면 실패한다", () => {
    const guide = readFileSync(new URL("../content/guides.ts", import.meta.url), "utf-8");
    for (const fn of ["vegPctLess()", "vegSaving()", "vegTermSaving()", "vegYearSaving()"]) {
      expect(guide, `가이드가 ${fn}을 안 쓴다 — 값을 손으로 적었을 가능성`).toContain(fn);
    }
    // 본문 문장 안에 리터럴 금액이 되살아났는지: 이 문장 블록만 잘라서 본다.
    const i = guide.indexOf("A meat-free main costs about");
    expect(i, "채식 절약 문장을 못 찾았다 — 문구가 바뀌면 여기부터 고칠 것").toBeGreaterThan(-1);
    const sentence = guide.slice(i, i + 420).replace(/\$\{[^}]*\}/g, "§");
    expect(sentence.match(/\$\d/g) ?? [], "문장에 손으로 적은 금액이 남아 있다").toEqual([]);
  });

  it("🔴 게시된 숫자끼리 검산이 맞는다 — 독자가 곱해 보면 드러난다", async () => {
    // 2026-08-21 라이브: 본문이 "$1.67"과 "$317.40"을 같이 말했는데 1.67 × 190 = 317.30이었다.
    // 반올림 전 값으로 누적을 만들면 화면의 숫자끼리 어긋난다.
    const { money, approxMoney, vegSaving, vegTermSaving, vegYearSaving, TERM_DAYS, SCHOOL_YEAR_DAYS } =
      await import("./servePrice");
    const daily = Number(money(vegSaving()).slice(1)); // 화면에 실제로 실리는 값
    expect(approxMoney(vegTermSaving()), "학기 누적이 게시된 일일값 × 일수와 다르다")
      .toBe(approxMoney(daily * TERM_DAYS));
    expect(approxMoney(vegYearSaving()), "학년 누적이 게시된 일일값 × 일수와 다르다")
      .toBe(approxMoney(daily * SCHOOL_YEAR_DAYS));
  });

  it("파생 함수와 이 파일의 독립 계산이 같은 값을 낸다", async () => {
    // 🔴 같은 코드를 두 번 부르면 서로를 검증하지 못한다. 여기서는 `price_cache`에서
    //    **독립적으로** 다시 계산해 servePrice의 파생과 맞춰 본다.
    const { vegSaving, vegPctLess } = await import("./servePrice");
    const veg = median(MENUS.filter((m) => m.is_vegetarian).map((m) => cost(m.ingredients)));
    const meat = median(MENUS.filter((m) => !m.is_vegetarian).map((m) => cost(m.ingredients)));
    expect(vegSaving()).toBeCloseTo(meat - veg, 2);
    expect(vegPctLess()).toBe(Math.round(((1 - veg / meat) * 100) / 5) * 5);
  });

  it('"about 50% less"라는 표현이 유지된다', () => {
    const veg = median(MENUS.filter((m) => m.is_vegetarian).map((m) => cost(m.ingredients)));
    const meat = median(MENUS.filter((m) => !m.is_vegetarian).map((m) => cost(m.ingredients)));
    // ⚠️ 이 테스트의 이름·주석이 '42%'라고 말하는 동안 본문은 '45% less'였다.
    //    가드가 지키는 대상을 주석이 잘못 적고 있으면 다음 사람이 틀린 값을 맞다고 믿는다.
    //    그래서 이제 **본문 문자열을 직접 확인한다** — 숫자와 문장이 같이 움직이게.
    // 본문이 'about 45% less' → veg/meat ≈ 0.55. 밴드는 그 주장의 정밀도(±3%p)에 맞춘다.
    //    (roundPct는 5단위 반올림이라 실측 43.5%가 45%로 게시된다.)
    // 🔴 2026-09-06~07: 미고정 SKU를 전부 고정하며 50% → 45% → 40%로 움직였다.
    // 🔴 2026-09-20: 주간 수집으로 40% → 45%로 돌아왔다. **밴드는 넓히지 말고 주장을 따라 옮길 것** —
    //    40% 기준 밴드(0.56~0.62)를 그대로 두면 실측 0.565가 경계에 붙어 다음 주에 문구가 아니라
    //    밴드 때문에 터진다.
    // 🔴 2026-09-29: 회원가 10개를 정가로 되돌리자(수집기가 salePrice를 저장하던 것) 45% → 40%.
    //    밴드는 40%로 반올림되는 구간(37.5~42.5% less = 0.575~0.625)으로 옮겼다. 실측 0.613.
    expect(GUIDES["vegetarian-vegan-school-lunch-guide-nz"].body).toContain(
      "A meat-free main costs about 40% less.",
    );
    expect(veg / meat).toBeLessThan(0.625);
    expect(veg / meat).toBeGreaterThan(0.575);
  });
});

describe("도시락 1통 비용 분포 (budget 가이드 + 블로그 3편 + 학교 포스터)", () => {
  // 2026-08-06에 붙였다. 이 수치들은 **테스트가 하나도 안 묶고 있었다** —
  // 게시된 값 중 유일하게 계산과 갈라져도 조용히 넘어가는 자리였다.
  // 이 숫자는 사이트 밖으로도 나갔다: A4 학교 포스터, 학교 89곳에 보낸 메일,
  // Sorted에 보낸 회신. 여기가 어긋나면 되돌릴 수 없는 곳까지 어긋난다.
  //
  // 계산 정의는 planGenerator의 실제 구성과 같아야 한다:
  //   1통 = 메뉴 재료 + Fruit&Veg 간식 1개 + (Protein&Dairy ∪ Savoury Crunch) 간식 1개
  // 플래너는 두 간식을 무작위로 고르므로, 게시 수치는 **각 풀의 중앙값**을 대표값으로 쓴다.
  // ⚠️ 두 풀을 하나로 합쳐 중앙값을 한 번만 구하고 2배 하면 안 된다 —
  //    과일 풀과 나머지 풀의 중앙값이 서로 다르다.
  const per = (ing: string) => {
    const p = (PRICES as Record<string, { data: { price?: number } }>)[ing]?.data?.price ?? 0;
    return p * (PORTION_FACTORS[ing] ?? DEFAULT_PORTION);
  };
  const cost = (ings: string[]) => ings.reduce((t, i) => t + per(i), 0);
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  const SNACKS = (menuData as unknown as { SNACK_DATA: SnackData }).SNACK_DATA;
  const boxCosts = () => {
    const fruit = median(
      ((SNACKS["Fruit & Veg"] ?? []) as SnackItem[]).map((s) => cost(s.ingredients ?? [])),
    );
    const other = median(
      [
        ...((SNACKS["Protein & Dairy"] ?? []) as SnackItem[]),
        ...((SNACKS["Savoury Crunch"] ?? []) as SnackItem[]),
      ].map((s) => cost(s.ingredients ?? [])),
    );
    return MENUS.map((m) => cost(m.ingredients) + fruit + other);
  };

  it("간식 풀이 비어 있지 않다 (풀이 비면 아래가 전부 메인 비용이 되어 조용히 통과한다)", () => {
    expect(((SNACKS["Fruit & Veg"] ?? []) as SnackItem[]).length).toBeGreaterThan(5);
    expect(
      ((SNACKS["Protein & Dairy"] ?? []) as SnackItem[]).length +
        ((SNACKS["Savoury Crunch"] ?? []) as SnackItem[]).length,
    ).toBeGreaterThan(5);
  });

  it("중앙값이 게시한 '약 $4'와 맞다", () => {
    const m = median(boxCosts());
    // 실제 $4.08. "about $4"로 읽히는 구간을 벗어나면 문구를 고쳐야 한다.
    expect(m).toBeGreaterThan(3.5);
    expect(m).toBeLessThan(4.5);
  });

  it("범위가 게시한 '약 $2 ~ $7.10'과 맞다", () => {
    const b = boxCosts();
    // 실제 $2.02 ~ $7.09. toBeCloseTo(x, 1)은 ±5c다 — 반올림 표기 폭 안에서만 허용한다.
    // 밴드를 늘려 문구를 살리고 싶어지면, 늘리지 말고 **문구를 고칠 것.**
    // (변이 테스트로 확인: 두 간식 풀을 합쳐 중앙값을 2배 하면 $2.12/17종이 되어 여기서 잡힌다)
    expect(Math.min(...b)).toBeCloseTo(2.02, 1);
    expect(Math.max(...b)).toBeCloseTo(7.09, 1);
  });

  it("'$3 미만 N종'이 본문과 계산에서 같은 수다", () => {
    // 🔴 예전엔 여기에 `toBe(20)`이 박혀 있었고 **본문 두 곳은 서로 다른 말을 하고 있었다**
    //    (guides "Twenty of our ninety-four" vs posts "Nineteen of the 94").
    //    이제 본문이 값을 생성하므로, 여기서는 **생성된 값이 실제 계산과 같은지**를 본다.
    const n = boxCosts().filter((c) => c < 3).length;
    expect(n, "$3 미만이 하나도 없다 — 0건은 결과가 아니라 증상이다").toBeGreaterThan(0);
    expect(GUIDES["budget-lunchbox-planning-guide-nz"].body).toContain(
      `${n} of our 94 menus come in under $3`,
    );
    expect(POSTS["back-to-school-lunchbox-prep-nz"].body).toContain(`${n} of the\n94 come in under $3`);
  });

  it("본문 세 곳이 같은 값을 말한다 (한 곳만 고치고 놓치는 것 방지)", () => {
    const budget = GUIDES["budget-lunchbox-planning-guide-nz"].body;
    // 🔴 "$4"를 여기 손으로 적으면 가드가 문구의 두 번째 복사본이 된다 —
    //    2026-08-21에 쌀 factor를 고치자 중앙값이 $3.90이 되어 이 줄이 깨졌다.
    expect(budget).toContain(`median cost of about ${boxMedianLabel()}`);
    // 🔴 여기도 손으로 적으면 458행과 같은 함정에 빠진다 — 라벨에서 만든다.
    expect(budget).toContain(`from about ${boxFloorLabel()} to ${boxCeilingLabel()}`);
    expect(budget).toMatch(/\d+ of our 94 menus come in under \$3/);
    /**
     * 반올림 문구로 통일했다. 센트 단위 표기가 되살아나면 밴드 테스트가 알리바이가 된다.
     *
     * 🔴 2026-08-23: 여기가 `not.toContain("$2.03")`이었다 — **문자열 하나를 금지**하는 가드였다.
     *    그날 Mac 'n Cheese 도시락이 마침 $2.03이 되면서, 파생된 주간 표에 그 금액이
     *    정당하게 등장하자 가드가 터졌다. 금지해야 하는 건 문자열이 아니라
     *    **"범위를 말하는 문장에서 센트 단위를 쓰는 것"**이다. 문장으로 범위를 좁힌다.
     */
    const rangeSentence = budget.slice(
      budget.indexOf("median cost of about"),
      budget.indexOf("median cost of about") + 260,
    );
    expect(rangeSentence.length, "범위 문장을 못 찾았다").toBeGreaterThan(50);
    const centPrecise = [Math.min(...boxCosts()), Math.max(...boxCosts())].map(
      (n) => `$${n.toFixed(2)}`,
    );
    for (const v of centPrecise) {
      expect(rangeSentence, `범위 문장이 센트 단위(${v})를 쓴다 — 반올림 표기로`).not.toContain(v);
    }
    // 같은 범위를 인용하는 블로그 3곳도 반올림 표기여야 한다.
    expect(Object.values(POSTS).filter((p) => p.body.includes("$7.62") || p.body.includes("$7.60"))).toEqual([]);
    expect(
      Object.values(POSTS).filter((p) => p.body.includes(`${boxFloorLabel()} to ${boxCeilingLabel()}`)).length,
    ).toBe(3);
  });
});

describe("블로그 본문의 비용 수치가 실제 계산과 일치한다", () => {
  // 2026-07-28에 블로그 3편에도 자체 가격 데이터를 넣었다. 가이드와 같은 이유로
  // 가격 캐시나 분량표가 바뀌면 이 문장들은 조용히 거짓이 된다.
  const per = (ing: string) => {
    const p = (PRICES as Record<string, { data: { price?: number } }>)[ing]?.data?.price ?? 0;
    return p * (PORTION_FACTORS[ing] ?? DEFAULT_PORTION);
  };

  it("iron-rich: 가격 문단이 캐시에서 생성된다 (손으로 적힌 수치가 없다)", () => {
    const body = POSTS["iron-rich-lunchbox-foods-nz"].body;
    const lentils = per("Red Lentils");
    const mince = per("Beef Mince");
    const mult = Math.round(mince / lentils);

    // 양성 대조 — 값이 0이면 아래가 전부 "0c"끼리 맞아떨어져 조용히 통과한다.
    expect(lentils, "렌틸 단가가 0이다 — 캐시 키가 바뀌었을 수 있다").toBeGreaterThan(0);
    expect(mince).toBeGreaterThan(0);

    // 생성된 값이 본문에 그대로 실려 있는가. 리터럴을 박지 않고 캐시에서 계산해 비교한다.
    const c = (n: number) => (n < 1 ? `${Math.round(n * 100)}c` : `$${n.toFixed(2)}`);
    expect(body, "표의 다진소고기 값이 캐시와 다르다").toContain(`| Beef mince | ${c(mince)} |`);
    expect(body, "문장이 표와 다른 값을 말한다").toContain(
      `${c(lentils)} a serve, against ${c(mince)} for beef mince — about ${mult}× the price.`,
    );
    // 같은 배수를 뒤 문장도 써야 한다 — 예전엔 표 $2.55 / 문장 $3.35로 갈라져 있었다.
    // 🔴 10-02: 1회분 배수만 말하면 1회분에 든 철분이 달라 렌틸이 실제보다 유리해 보였다 → 1mg당 배수를 같이 말한다.
    //    흡수율 격차의 크기(「nothing like N-fold」)는 출처가 없어 뺐다.
    expect(body, "1회분 배수를 뒤 문장도 말한다").toContain(`not ${mult}×`);
    expect(body, "출처 없는 흡수율 비교가 돌아왔다").not.toMatch(/nothing like \d+-fold|2-3 times more efficiently|up to 6 times|higher in bioavailable iron/);

    // 🔴 손으로 적은 분수 표현은 **네 번 연속 거짓이 됐다**(10.2 → 11.13 → 13.41 → 9.37).
    //    표현을 고르는 문제가 아니라 손으로 적는 것 자체가 문제였다. 되살아나면 잡는다.
    for (const banned of ["one-thirteenth", "one-tenth", "a tenth the cost", "ten-fold"]) {
      expect(body, `손으로 적은 분수 표현이 되살아났다: "${banned}"`).not.toContain(banned);
    }

    // 데이터 파손 감지용 — 주장의 정밀도가 아니라 "말이 되는 값인가"만 본다.
    // 문장이 캐시에서 생성되므로 배수가 움직여도 본문은 저절로 맞고, 여기서 볼 것은
    // 캐시가 망가졌는지뿐이다.
    expect(mince / lentils).toBeGreaterThan(3);
    expect(mince / lentils).toBeLessThan(40);
  });

  it("iron-rich: 가격표가 싼 순으로 정렬돼 있고 급원이 다 실려 있다", () => {
    const body = POSTS["iron-rich-lunchbox-foods-nz"].body;
    const table = body.slice(body.indexOf("| Iron source |"));
    const rows = table.slice(0, table.indexOf("\n\n")).split("\n").slice(2);
    expect(rows.length, "표 행 수가 줄었다").toBe(9);
    const cents = rows.map((r) => {
      const m = r.match(/\|\s*\*{0,2}(?:\$(\d+\.\d{2})|(\d+)c)\*{0,2}\s*\|/);
      expect(m, `값을 못 읽은 행: ${r}`).toBeTruthy();
      return m![1] ? Math.round(parseFloat(m![1]) * 100) : parseInt(m![2], 10);
    });
    expect(cents, "싼 순 정렬이 깨졌다").toEqual([...cents].sort((a, b) => a - b));
    expect(Math.min(...cents), "0원짜리 행이 있다 — 캐시 키 누락").toBeGreaterThan(0);
  });

  it("iron-rich: 가격을 잰 달이 캐시 타임스탬프에서 나온다", () => {
    const body = POSTS["iron-rich-lunchbox-foods-nz"].body;
    const stamps = Object.values(
      PRICES as Record<string, { timestamp?: number }>,
    )
      .map((v) => v.timestamp)
      .filter((t): t is number => typeof t === "number");
    expect(stamps.length).toBeGreaterThan(100);
    const label = new Intl.DateTimeFormat("en-NZ", {
      timeZone: "Pacific/Auckland",
      month: "long",
      year: "numeric",
    }).format(new Date(Math.max(...stamps)));
    expect(body, `표 제목의 달이 캐시와 다르다 (캐시: ${label})`).toContain(
      `Cost per lunchbox serve (${label})`,
    );
  });

  it("easy-wraps: 랩이 식빵보다 비싸다 — 배수는 손으로 적지 않는다", () => {
    /**
     * 🔴 2026-08-23: 이 가드가 **"두 배"라는 문구를 문자열로 요구**하고 있었다.
     *    추적 상품이 `farrah's **taco tortillas small**`이라 실제 비율은 1.0 근처였는데,
     *    그때는 factor가 1.8장을 가정해서 우연히 1.9가 나와 통과하고 있었다.
     *    상품을 랩으로 바로잡자 비율이 1.29가 됐고 "두 배"는 거짓이 됐다.
     *    → 지켜야 하는 주장은 **"식빵이 제일 싸다"**이고, 배수는 `wrapVsBreadClause()`가 만든다.
     */
    const body = POSTS["easy-wraps-for-school-lunches-nz"].body;
    const bread = per("Bread");
    for (const base of ["Tortilla", "Roll", "Pita Bread", "Bagel"]) {
      expect(per(base), `${base}이 식빵보다 싸다 — 본문의 논지가 뒤집힌다`).toBeGreaterThan(bread);
    }
    expect(body, "손으로 적은 '두 배'가 돌아왔다").not.toContain("roughly double what two slices");
    expect(body, "배수 문장이 파생을 안 쓴다").toContain(wrapVsBreadClause());
    /**
     * 🔴 표의 칸을 손으로 적어도 위 검산은 통과한다(돌연변이로 확인 — 침묵했다).
     *    **화면에 그 값이 실제로 있는지**를 따로 본다.
     */
    // 🔴 `toContain`은 **글 어디든** 있으면 통과한다 — Bagel 칸을 92c로 바꿔도
    //    "$1.20"이 다른 문단에 있어서 침묵했다. **그 표의 줄 안에서** 본다.
    const rows = body.split("\n").filter((l) => l.startsWith("| ") && /\d/.test(l));
    const rowFor = (label: string) => rows.find((l) => l.toLowerCase().includes(label.toLowerCase())) ?? "";
    const CELLS: [string, string][] = [
      ["Two slices of sandwich bread", "Bread"],
      ["One wrap (supermarket own-brand)", "Tortilla"],
      ["Bread roll", "Roll"],
      ["Pita pocket", "Pita Bread"],
      ["Bagel", "Bagel"],
    ];
    for (const [label, key] of CELLS) {
      const row = rowFor(label);
      expect(row, `"${label}" 줄을 표에서 못 찾았다`).not.toBe("");
      expect(row, `"${label}" 칸이 파생값(${serveLabel(per(key))})과 다르다 — 손으로 적었다`).toContain(
        serveLabel(per(key)),
      );
    }
  });

  it("egg-free: 계란 유무로 도시락 중앙값이 사실상 같다 (본문 '3센트 차이')", () => {
    const cost = (ings: string[]) => ings.reduce((t, i) => t + per(i), 0);
    const med = (xs: number[]) => {
      const a = [...xs].sort((x, y) => x - y);
      const m = Math.floor(a.length / 2);
      return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
    };
    const free = med(MENUS.filter((m) => m.is_egg_free).map((m) => cost(m.ingredients)));
    const withEgg = med(MENUS.filter((m) => !m.is_egg_free).map((m) => cost(m.ingredients)));
    // 🔴 본문은 이제 차이를 **생성**한다("— 20c apart"). 그래서 이 숫자를 지키는 게 아니라
    //    제목 「Does Going Egg-Free Cost More? Not Really」가 아직 정직한지를 지킨다.
    //    여기를 넘으면 밴드를 늘리지 말고 **제목을 고칠 것.**
    expect(Math.abs(free - withEgg)).toBeLessThan(0.30);
  });
});

describe("paknsave-vs-countdown: 표가 데이터에서 나오고, 정정이 살아 있다", () => {
  // 이 글은 색인돼 있고 GSC 노출이 가장 빠르게 늘고 있다. 그런데 본문 표가
  // **2026년 3월 손으로 적은 가격**이었고, 5개월간 사과 배너를 단 채 서 있었다.
  // 그 배너는 "Pak'nSave publishes no feed I can read"라고 말했는데
  // 🔴 **그건 확인 안 해본 추측이었고 틀렸다**(2026-08-11에 주간 자동으로 전환).
  // 이제 표·점수는 data/priceIndex.json에서 생성한다. 손으로 되돌리지 못하게 묶는다.
  const post = POSTS["paknsave-vs-countdown-lunchbox-staples"];
  const src = readFileSync(new URL("../content/posts.ts", import.meta.url), "utf-8");

  it("표와 점수를 손으로 적지 않는다 (지수에서 생성)", () => {
    expect(src, "표 생성기가 사라졌다").toMatch(/function priceTableMarkdown/);
    expect(src, "점수 생성기가 사라졌다").toMatch(/function scorecardMarkdown/);
    expect(src, "지수를 읽지 않는다").toMatch(/from "@\/data\/priceIndex\.json"/);
  });

  it("본문 가격이 지수의 현재 값과 일치한다", () => {
    // 🔴 생성기가 있어도 본문에 안 꽂혀 있으면 소용없다 — 실제 숫자로 확인한다.
    const rows = index.items.filter(
      (i) => i.countdown !== null && i.paknsave !== null && i.paknsaveAsOf,
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows.slice(0, 5)) {
      expect(post.body, `${r.name}의 Pak'nSave 값이 본문에 없다`).toContain(
        `$${(r.paknsave as number).toFixed(2)}`,
      );
    }
  });

  it("🔴 제외 사유가 실제 사유와 맞는다 (특가 ≠ 상품 미매칭)", () => {
    // 제외 경로는 **둘**이다. 값이 비었는지로 추론했다가 8건 중 5건을 틀렸고,
    // 이건 같은 날 아침 price-index 페이지에서 이미 한 번 고친 실수였다.
    // 진짜 근거는 sources 파일의 blocked 플래그다 — 그것과 대조한다.
    const sources = JSON.parse(
      readFileSync(new URL("../data/priceIndexSources.json", import.meta.url), "utf-8"),
    ) as { items: Record<string, { paknsave?: { blocked?: boolean } }> };
    const lines = post.body.split("\n").filter((l) => l.includes("_excluded ("));
    // 🔴 2026-08-24: 전엔 "0건이면 무의미"라고 실패시켰는데, 세 열을 같은 날로 갱신하니
    //    제외가 실제로 0건이 됐다. 데이터가 좋아졌는데 가드가 빨개지면 안 된다.
    //    ⚠️ 처음엔 "본문 제외 행 수 == 비교불가 행 수"로 고쳤는데 **동어반복이었다** —
    //       본문 표도 가드도 같은 `isComparableRow`를 쓴다. 세어 봐야 늘 같다.
    //    그래서 개수 대신 **분기가 살아 있는지**와 **사유 문구가 데이터와 맞는지**를 본다.
    // 사유 분기는 **값으로** 검사한다. 표에 제외 행이 0건이면 아래 루프는 한 번도
    // 안 돌아서, 두 사유를 서로 바꿔치기해도 안 잡혔다(2026-08-24 돌연변이로 확인).
    expect(exclusionReasonFor(true)).toBe("no matching product at one chain");
    expect(exclusionReasonFor(false)).toBe("on special at Pak'nSave, so no regular price");
    const src = readFileSync(new URL("../content/posts.ts", import.meta.url), "utf-8");
    expect(src, "제외 사유를 blocked 플래그가 아니라 값으로 추론하고 있다").toContain(
      "exclusionReasonFor(isBlocked(i.name))",
    );
    // 표 자체는 비어 있으면 안 된다 — 행이 0이면 아래 사유 검사가 공짜로 통과한다
    expect(
      post.body.split("\n").filter((l) => /^\| .+ \| \$/.test(l)).length,
      "가격 표에 행이 없다",
    ).toBeGreaterThan(10);
    for (const line of lines) {
      const name = line.split("|")[1].trim().split(" — ")[0];
      const blocked = sources.items[name]?.paknsave?.blocked === true;
      if (blocked) {
        expect(line, `${name}: 상품 미매칭인데 특가라고 적혀 있다`).toContain("no matching product");
      } else {
        expect(line, `${name}: 특가인데 미매칭이라고 적혀 있다`).toContain("on special");
      }
    }
  });

  it("🔴 09-28 재검토에서 걷어낸 주장이 되살아나지 않는다", () => {
    // 표는 08-11부터 생성인데 표 밖 산문이 서로·데이터와 모순됐다 — 맨 위는 「Pak'nSave 온라인가를 읽는다」,
    // 아래는 「Pak'nSave는 온라인이 없다」. Onecard는 Everyday Rewards가 됐고 특가는 월요일에 바뀐다.
    // 「What changed」 절이 뺀 것을 설명하느라 같은 낱말을 쓰므로 그 절은 빼고 본다.
    const main = post.body.split("## What changed in this review")[0];
    expect(main).not.toMatch(/Onecard/);
    expect(main).not.toMatch(/Wednesday/);
    expect(main).not.toMatch(/does not offer online shopping/i);
    expect(main).not.toMatch(/\$0\.85/);
    expect(main).not.toMatch(/wins decisively/);
    expect(post.body, "뺀 것을 밝히는 절이 없다").toContain("## What changed in this review");
  });

  it("「어느 쪽이 싸다」는 문장이 이번 주 데이터에서 나온다", () => {
    expect(src).toMatch(/In the current read, Pak'nSave is cheaper on \$\{paknsaveWinsSentence\(\)\}/);
    expect(src).toMatch(/this round that is \$\{cheaperBasketStore\(\)\}/);
    const rows = index.items.filter((i) => i.countdown !== null && i.paknsave !== null);
    const p = rows.reduce((a, r) => a + (r.paknsave as number), 0);
    const w = rows.reduce((a, r) => a + (r.countdown as number), 0);
    expect(post.body).toContain(`this round that is ${p < w ? "Pak'nSave" : w < p ? "Woolworths" : "a tie"}`);
  });

  it("낡은 3월 스냅샷 문구가 되살아나지 않는다", () => {
    expect(post.body).not.toContain("March snapshot");
    expect(post.body).not.toContain("Correction and update, 30 July 2026");
  });

  it("🔴 '읽을 수 있는 피드가 없다'는 틀린 주장이 되살아나지 않는다", () => {
    // 확인 안 해본 부정 주장이 이 글을 5개월 막았다. 주장으로 되돌아오면 실패시킨다.
    const stale = /publishes no feed I can read|cannot update it without walking back in/i;
    expect(post.body.split("\n").filter((l) => !/was wrong|used to carry|That was a guess/.test(l)).join("\n"))
      .not.toMatch(stale);
  });

  it("내가 틀렸다는 사실이 본문에 남아 있다", () => {
    // ⚠️ 인용 블록이라 줄바꿈에 "> "가 낀다 — 공백류만 허용하면 놓친다.
    expect(post.body.replace(/\n>\s*/g, " ")).toMatch(
      /That was a guess I never checked, and it was wrong/,
    );
  });

  it("$1.41 주장 옆에 정정이 붙어 있고, 현재 기준값을 제시한다", () => {
    const i = post.body.indexOf("$1.41 per lunch average");
    expect(i).toBeGreaterThan(-1);
    const after = post.body.slice(i, i + 800);
    expect(after).toContain("corrected at the top");
    expect(after, "$1.41 정정이 현재 중앙값을 제시하지 않는다").toContain(boxMedianLabel());
  });

  it("두 열의 읽은 날짜가 본문에 드러난다", () => {
    expect(post.body).toContain(index.woolworthsUpdated);
    expect(post.body).toContain((index as { paknsaveUpdated?: string }).paknsaveUpdated ?? "___");
  });
});

describe("블로그 2차 3편의 수치 (2026-07-29)", () => {
  const per = (ing: string) => {
    const p = (PRICES as Record<string, { data: { price?: number } }>)[ing]?.data?.price ?? 0;
    return p * (PORTION_FACTORS[ing] ?? DEFAULT_PORTION);
  };

  /**
   * 🔴 2026-08-20 개편. 예전엔 여기 주석이 "치즈 39c(약 80% 비쌈)"이라고 적혀 있었고
   *    검사는 비율이 **1.5~2.2 사이**인지만 봤다. 그 창은 너무 헐거워서, 치즈가
   *    39c→34c로 내려가고 본문의 "80% more"가 실제 60%와 어긋난 뒤에도 **통과했다.**
   *    이제 리터럴을 보지 않고 **관계**를 본다: 땅콩버터가 단백질 스프레드 중 최저가이고,
   *    본문이 말하는 퍼센트가 캐시에서 계산한 값과 같은가.
   */
  it("nut-free: 땅콩버터가 단백질 스프레드 중 최저가고, 본문 퍼센트가 캐시와 맞다", () => {
    const pb = per("Peanut Butter");
    // 표에서 단백질로 표시한 스프레드 — 하나라도 땅콩버터보다 싸면 본문 논지가 무너진다.
    for (const k of ["Cheese", "Hummus", "Eggs"]) {
      expect(pb, `${k}가 땅콩버터보다 싸다 — 본문의 "가장 싼 단백질" 주장이 거짓이 된다`)
        .toBeLessThan(per(k));
    }
    // 대체재 최저가는 치즈여야 한다(본문이 치즈를 지목한다). 순서가 바뀌면 문장도 바뀌어야 한다.
    expect(per("Cheese")).toBeLessThan(per("Hummus"));
    expect(per("Cheese")).toBeLessThan(per("Eggs"));

    const body = POSTS["nut-free-school-lunches-new-zealand"].body;
    // 🔴 값이 아니라 **문장이 말하는 퍼센트**를 캐시와 대조한다.
    const stated = body.match(/cheese from a block at \d+c, roughly (\d+)% more/);
    expect(stated, "본문에서 치즈 대체 문장을 못 찾았다 — 문구가 바뀌면 이 가드부터 고칠 것")
      .toBeTruthy();
    const derived = Math.round(((per("Cheese") / pb - 1) * 100) / 5) * 5;
    expect(Number(stated![1]), `본문 ${stated![1]}% vs 캐시 ${derived}%`).toBe(derived);
  });

  it("batch-cooking: 팩당 회분 표가 분량비율과 일치한다", () => {
    // 표에 적은 "servings in the pack" = 1 / PORTION_FACTOR.
    // 본문은 "~12"처럼 근사로 쓰므로 ±1까지 허용한다.
    // (Math.round를 쓰면 12.5가 13이 되어 본문의 "~12"와 어긋난다 — 반올림이 아니라
    //  근사 표기라는 점을 테스트가 반영해야 한다.)
    const servings = (ing: string) => 1 / PORTION_FACTORS[ing];
    expect(servings("Sugar")).toBeGreaterThanOrEqual(32);
    expect(servings("Sugar")).toBeLessThanOrEqual(34);
    expect(servings("Flour")).toBeGreaterThanOrEqual(11);
    expect(servings("Flour")).toBeLessThanOrEqual(13);
    expect(servings("Butter")).toBeGreaterThanOrEqual(32);
    expect(servings("Butter")).toBeLessThanOrEqual(34);
    // 🔴 여기엔 25가 박혀 있었다 — 1kg 블록을 가정한 값이다. 고정 SKU는 500g이고
    //    1인분 30g이므로 500/30 ≈ 16.7이다. (팩 크기 대조는 lib/priceSearch.test.ts가 한다.)
    expect(servings("Cheese")).toBeGreaterThanOrEqual(16);
    expect(servings("Cheese")).toBeLessThanOrEqual(17);
  });

  it("budget-friendly: 최저가 메인이 표의 값과 일치한다", () => {
    const cost = (ings: string[]) => ings.reduce((t, i) => t + per(i), 0);
    const cheapest = MENUS.map((m) => ({ n: m.name, c: cost(m.ingredients) }))
      .sort((a, b) => a.c - b.c)[0];
    expect(cheapest.n).toBe("Mac 'n Cheese");
    // 🔴 2026-09-06: 미고정 SKU를 고정하며 파스타·치즈 상품이 바뀌어 48c → 55c가 됐다.
    expect(cheapest.c).toBeCloseTo(0.55, 1);
  });
});

describe("2026-08-03 보강 5편의 수치", () => {
  // 5편에 자체 데이터 섹션을 붙였다. 아래는 그 수치가 실제 데이터와 갈라지는 것을 잡는다.
  const S = (slug: string) => POSTS[slug].body;

  it("spring: 5월→8월 변동표가 priceIndex의 history와 현재값에 일치한다", () => {
    // ⚠️ 이 표는 **정의가 바뀌지 않은 항목만** 넣었다. Peanut Butter(375g→380g),
    // Cherry Tomatoes(250g→180g), Yoghurt(브랜드 변경)는 물가 변동이 아니라 항목
    // 재정의라 뺐다. 보류 4건(Wraps·Cucumber·Sliced Chicken·Hummus)도 갱신을 안 한
    // 것뿐이라 "변동 없음"으로 제시하면 거짓이 된다.
    type Row = { name: string; countdown: number | null };
    const idx = index as { items: Row[]; history?: { items: Row[] }[] };
    const now = new Map(idx.items.map((i) => [i.name, i.countdown]));
    const may = new Map((idx.history?.[0]?.items ?? []).map((i) => [i.name, i.countdown]));
    const body = S("spring-lunchbox-ideas-nz");

    // 🔴 2026-08-18: 여기가 **손으로 고른 4행만** 보고 있었다(표는 10행이다).
    //    안 보던 Iceberg lettuce가 $3.50 → $4.00으로 움직여 표는 "flat"이라고,
    //    본문은 "no vegetable on our list rose"라고 말하고 있었다 — 둘 다 거짓이었다.
    //    **표에서 행을 읽어와 전부 검사한다.** 손으로 고른 목록은 다음번에 또 놓친다.
    //    (Apples 같은 respec 행은 애초에 표에 못 올라온다 — 아래 가드가 강제한다)
    const tableRows = body
      .split("\n")
      .filter((l) => /^\| .+ \| \$[\d.]+ \| \$[\d.]+ \|/.test(l));
    expect(tableRows.length, "5월↔8월 표를 못 찾았다 — 검사가 무의미하다").toBeGreaterThan(8);

    // 표의 라벨은 사람이 쓴 말이라 지수의 name과 다르다. 8월 값으로 행을 짚는다.
    const augValues = tableRows.map((l) => {
      const m = l.match(/\| \$([\d.]+) \| \$([\d.]+) \|/);
      return { line: l, may: Number(m![1]), aug: Number(m![2]) };
    });
    // 🔴 2026-08-24: 8월 값만으로 행을 짚다가 **사과($4.95→$4.50)가 통조림 참치와
    //    같은 값이 되면서** 참치 행이 사과에 붙었다. 값은 언제든 겹친다.
    //    후보가 둘 이상이면 표의 라벨과 겹치는 낱말로 가른다.
    const words = (s: string) => new Set(s.toLowerCase().match(/[a-z]+/g) ?? []);
    /** 표의 각 행이 실제로 가리키는 지수 항목 이름 */
    const resolvedNames = new Set<string>();
    for (const row of augValues) {
      const label = row.line.split("|")[1] ?? "";
      const cands = idx.items.filter(
        (i) => i.countdown !== null && Math.abs((i.countdown as number) - row.aug) < 0.005,
      );
      let hit = cands[0];
      if (cands.length > 1) {
        const lw = words(label);
        const scored = cands
          .map((c) => ({ c, n: [...words(c.name)].filter((w) => lw.has(w)).length }))
          .sort((a, b) => b.n - a.n);
        expect(
          scored[0].n > (scored[1]?.n ?? -1),
          `표의 8월 값 $${row.aug}에 지수 항목이 ${cands.length}개 걸린다(${cands
            .map((c) => c.name)
            .join(", ")}) — 라벨 "${label.trim()}"로도 못 가른다`,
        ).toBe(true);
        hit = scored[0].c;
      }
      expect(hit, `표의 8월 값 $${row.aug}에 해당하는 지수 항목이 없다 — 낡았다: ${row.line}`)
        .toBeTruthy();
      resolvedNames.add(hit!.name);
      const mayVal = may.get(hit!.name);
      expect(mayVal, `${hit!.name}: history 값 없음`).toBeCloseTo(row.may, 2);
    }
    // 기사 논지: 채소는 안 오르거나 내리고 단백질·유제품은 크게 올랐다
    // 🔴 09-28 전수 감사 B — 여기가 "the produce held steady or fell"을 요구했는데 표의 바나나(과일)는
    //    +7%였다. 문구만 박으면 가드가 거짓 문장을 지킨다. 문구를 "vegetables"로 좁히고,
    //    **그 문장이 데이터로 참인지**를 같이 본다(채소 행 ≤ +2%, 단백질·유제품 행 ≥ +20%).
    // 10-11 수집: 햄 정가가 $5.99로 내려가 +8.9% — 「전부 크게 올랐다」가 거짓이 됐다. 이제 「대부분」이고 과반을 본다.
    expect(body).toContain("the vegetables held steady or fell while most of the protein and dairy");
    {
      const pctOf = (n: string) => {
        const a = may.get(n), b = now.get(n);
        expect(a && b, `${n}: 5월/현재 값이 없다 — 논지 검산이 무의미하다`).toBeTruthy();
        return ((b! - a!) / a!) * 100;
      };
      for (const v of ["Carrots (1kg)", "Lettuce"]) {
        expect(pctOf(v), `${v}가 올랐는데 본문은 "vegetables held steady or fell"이라 한다`).toBeLessThanOrEqual(2);
      }
      const protein = ["Eggs (12-pack)", "Sliced Ham (200g)", "Butter (500g)", "Canned Tuna (185g)"];
      const sharp = protein.filter((p) => pctOf(p) >= 20);
      expect(sharp.length * 2, `+20% 이상이 ${sharp.length}/${protein.length}뿐인데 본문은 「대부분 rose sharply」라 한다`)
        .toBeGreaterThan(protein.length);
      for (const p of protein) expect(pctOf(p), `${p}가 내렸는데 본문은 단백질·유제품이 올랐다고 한다`).toBeGreaterThan(0);
    }

    // 🔴 예전엔 "in-season은 30-60% 싸다"고 썼다. 출처도 자체 데이터도 없는 수치였다.
    //    (같은 계열로 messages의 "Pak'nSave가 15-25% 저렴"도 실측 12%였다.)
    //    남의 어림수 대신 **우리가 잰 값**을 쓴다.
    expect(body, "근거 없는 30-60% 주장이 되살아났다").not.toContain("30-60%");
    // 🔴 "no vegetable on our list rose"는 lettuce가 +15%가 되면서 거짓이 됐다.
    //    이제 주장을 데이터에서 검산한다 — 문장을 박아 두면 또 조용히 틀린다.
    {
      // 🔴 숫자를 박아 두면 다음 주에 조용히 틀린다. 지수에서 다시 계산한다.
      const a = may.get("Carrots (1kg)"), b = now.get("Carrots (1kg)");
      expect(a && b, "Carrots 값이 없다 — 검산이 무의미하다").toBeTruthy();
      const pct = Math.round(((a! - b!) / a!) * 100);
      expect(body, `본문의 carrots 하락률이 데이터(${pct}%)와 다르다`).toContain(
        `carrots fell ${pct}%`,
      );
    }
    {
      const veg = ["Carrots (1kg)", "Cucumber", "Lettuce"];
      const risers = veg.filter((n) => {
        const a = may.get(n), b = now.get(n);
        return a && b && b > a * 1.02;
      });
      if (risers.length) {
        expect(body, `채소 ${risers.join(", ")}가 올랐는데 본문이 그걸 말하지 않는다`)
          .toContain("iceberg lettuce rose 15%");
      } else {
        expect(body).toContain("no vegetable on our list rose");
      }
    }

    /**
     * 🔴 정의를 바꾼 행(respec)은 5월↔8월 변동표에 **절대** 올리면 안 된다.
     *    2026-08-12에 사과를 Royal Gala → Granny Smith로 바꿨는데, 표에 그대로
     *    두면 품종 교체가 "−1% 하락"으로 보고된다. 값이 아니라 상품이 바뀐 것이다.
     *    이 가드는 respec가 새로 붙는 행에도 자동으로 걸린다 — 목록을 손으로
     *    관리하면 다음번에 또 놓친다.
     */
    const respec = (index as { items: { name: string; countdown: number | null; respec?: unknown }[] }).items.filter(
      (i) => i.respec,
    );
    expect(respec.length, "respec 행이 하나도 없다면 이 가드가 무의미해진 것이다").toBeGreaterThan(0);
    for (const r of respec) {
      const label = r.name.replace(/\s*\(([^)]*)\)/, " $1").trim(); // "Apples (1kg)" → "Apples 1kg"
      // 라벨을 바꿔 놓고 슬쩍 되살리는 것도 막는다 — 다만 **값이 같다는 이유만으로**
      // 걸면 안 된다. 2026-08-24에 사과가 $4.50이 되면서 통조림 참치 행과 값이 겹쳐
      // 이 검사가 오탐을 냈다. 행이 실제로 그 항목을 가리킬 때만 위반이다.
      expect(
        resolvedNames.has(r.name),
        `${r.name}: 정의가 바뀐 행이 5월→8월 변동표에 들어 있다`,
      ).toBe(false);
      expect(
        body.includes(`| ${label} |`),
        `${r.name}: 정의가 바뀐 행이 기사 변동표에 남아 있다`,
      ).toBe(false);
    }
    /**
     * 🔴 표에서 뺀 행은 **왜 뺐는지** 본문이 말해야 한다. 조용히 지우면 표가
     *    줄어든 이유를 아무도 모르고, 다음 사람이 "빠졌네" 하고 되살린다.
     *    ⚠️ 처음엔 특정 문장(`"Apples are not in that table any more"`)을 통째로
     *    요구했는데, 문단을 다시 쓰자 **설명은 멀쩡한데 가드가 깨졌다.**
     *    가드를 문구가 아니라 **설명의 존재**에 걸어야 한다.
     */
    for (const [label, token] of [
      ["사과", "Apples"],
      ["치즈", "Cheese"],
    ] as const) {
      expect(body, `${label} 행이 왜 빠졌는지 본문에 설명이 없다`).toMatch(
        new RegExp(`${token}[^|]{0,400}?(not in that table|is out|were in it|missing)`, "i"),
      );
    }

    /**
     * 🔴 SKU 고정은 2026-07-30에 시작됐다. 5월 라운드는 매장을 걸으며 쟀지만
     *    **어떤 상품이었는지 기록이 없다.** 그 한계를 본문이 밝혀야 한다 —
     *    밝히지 않으면 개별 퍼센트가 실제보다 정밀해 보인다.
     */
    // ⚠️ 처음엔 `/30 July 2026|pinning each row|not recorded at the time/`로 느슨하게 걸었다가
    //    돌연변이가 **핵심 문장만 지웠는데도** 뒷문장의 "not recorded at the time"이 대신
    //    걸려 통과했다. 공시의 알맹이는 **날짜**다 — 날짜 없는 한계 고백은 알맹이가 없다.
    expect(body, "SKU 고정 시작일(2026-07-30)이 본문에 없다").toContain("30 July 2026");
    expect(body, "무엇이 고정됐는지가 본문에 없다").toMatch(/pinn(ed|ing)|product code/i);

    // 뺀 행이 표에 되살아나면 실패
    for (const row of ["| Cheese block 500g |", "| Apples 1kg |"]) {
      expect(body, `${row} 가 변동표에 되살아났다`).not.toContain(row);
    }
  });

  /**
   * 🔴 2026-09-15: 이 가드가 기대값을 **리터럴로** 들고 있었다(47·28·19·14·94).
   *    본문을 생성으로 바꾸면 가드도 같이 손으로 고쳐야 하는 구조였고, 그러면
   *    「가드가 본문을 베끼는」 상태가 된다. 기대값은 전부 **데이터에서** 뽑는다.
   */
  it("back-to-school: 조리방식 분류 수가 메뉴 데이터와 일치한다", () => {
    const b = S("back-to-school-lunchbox-prep-nz");
    const ma = count((m) => m.prep_style === "make-ahead");
    const nc = count((m) => m.prep_style === "no-cook");
    const cf = count((m) => m.prep_style === "cook-fresh");
    expect(ma + nc + cf, "prep_style 세 갈래가 전체를 덮지 않는다").toBe(MENUS.length);
    expect(b).toContain(`| **Make-ahead** | ${ma} |`);
    expect(b).toContain(`| **No-cook** | ${nc} |`);
    expect(b).toContain(`| **Cook-fresh** | ${cf} |`);
    expect(b).toContain(`*${count((m) => !!m.is_thermos)}*`);
    // 낱말도 파생이다 — 비율이 움직이면 "Eighty"가 저절로 바뀐다
    const pct = Math.round(((ma + nc) / MENUS.length) * 100);
    const WORD: Record<number, string> = { 50: "Fifty", 60: "Sixty", 70: "Seventy", 80: "Eighty", 90: "Ninety", 100: "A hundred" };
    expect(b, `비율 ${pct}% 를 본문이 말하지 않는다`).toContain(`${WORD[pct] ?? String(pct)} percent`);
  });

  it("food-safety: no-cook / thermos 개수가 본문에 그대로 적혀 있다", () => {
    const b = S("lunchbox-food-safety-nz-term-1-heat");
    expect(b).toContain(`**${count((m) => m.prep_style === "no-cook")} are no-cook**`);
    expect(b).toContain(`**${count((m) => !!m.is_thermos)} are thermos-friendly**`);
  });

  it("$4 중앙값을 인용한 3편이 서로 같은 값을 말한다", () => {
    // 같은 수치를 여러 글에 적으면 한 곳만 고치고 나머지를 놓치기 쉽다.
    for (const slug of [
      "back-to-school-lunchbox-prep-nz",
      "term-1-first-week-lunchbox-routine-auckland-parent",
      "insulated-lunch-bags-review-nz",
    ]) {
      expect(S(slug), `${slug}: 중앙값 ${boxMedianLabel()} 언급 없음`).toContain(boxMedianLabel());
    }
  });
});

describe("FAQ(messages/*.json)도 같은 수치를 말한다", () => {
  /**
   * 2026-08-07: 가격 갱신으로 가이드·블로그를 $7.60으로 고쳤는데 **FAQ만 $7.50에
   * 남아 있었다.** `messages/*.json`은 그때까지 어떤 테스트도 보고 있지 않았다.
   *
   * 이 FAQ 항목은 특히 중요하다. FB에서 비용 계산을 지적받은 뒤
   * "무엇이 포함되고 무엇이 안 되는지"를 밝히려고 추가한 답변이고,
   * 그 답변 안의 숫자가 본문과 어긋나면 지적을 받아들인 의미가 없어진다.
   */
  const LOCALES = ["en", "ko", "zh"] as const;
  const messages = Object.fromEntries(
    LOCALES.map((l) => [
      l,
      JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8")) as Record<string, string>,
    ]),
  );

  it("세 로케일 전부 faq_a31을 갖고 있다", () => {
    for (const l of LOCALES) {
      expect(String(messages[l].faq_a31 ?? "").trim(), `${l}`).not.toBe("");
    }
  });

  it("FAQ의 '채식이 몇 % 저렴' 수치가 가이드와 일치한다", () => {
    // 🔴 2026-08-18: 가이드 본문의 "45% less"를 50%로 고치고 배포했는데,
    //    **라이브에 45%가 하나 남아 있었다** — FAQ a20이 3개 언어로 같은 주장을 하고 있었다.
    //    "본문 세 곳이 같은 값을 말한다" 가드가 있었지만 그건 **비용 범위**만 봤고,
    //    이 비율은 아무도 안 보고 있었다. 리터럴로 박지 않고 가이드에서 읽어 온다.
    const guide = GUIDES["vegetarian-vegan-school-lunch-guide-nz"].body;
    const m = guide.match(/A meat-free main costs about (\d+)% less\./);
    expect(m, "가이드에서 '% less' 문장을 못 찾았다 — 문구가 바뀌면 여기부터 고칠 것").toBeTruthy();
    const pct = m![1];
    for (const l of LOCALES) {
      expect(String(messages[l].faq_a20 ?? ""), `${l}: ${pct}%가 없다 (가이드와 어긋남)`)
        .toContain(`${pct}%`);
    }
  });

  it("FAQ의 범위 표기가 가이드와 일치한다", () => {
    // 🔴 2026-08-18: 이 테스트는 이름이 "가이드와 일치한다"인데 실제로는 `$7.80`이라는
    //    **리터럴을 세 자리에 각자 박아** 두고 있었다. 가격이 움직여 가이드가 $7.70이 된
    //    순간, 이 가드는 "FAQ가 가이드와 다르다"가 아니라 "가이드에 7.80이 없다"고 실패했다.
    //    일치 검사가 리터럴 검사면 고칠 곳이 셋으로 늘어난다 — 정확히 이 저장소가
    //    반복해서 밟는 함정이다. **가이드에서 값을 읽어와 비교한다.**
    const budget = GUIDES["budget-lunchbox-planning-guide-nz"].body;
    // 🔴 2026-09-06: 하한이 $2 → $2.20이 되며 센트가 붙었다. 정규식이 하한에
    //    센트를 허용하지 않아 문장을 통째로 못 찾았다 — 양쪽 다 선택적으로 받는다.
    const m = budget.match(/from about \$(\d+(?:\.\d{2})?) to \$(\d+(?:\.\d{2})?)/);
    expect(m, "가이드에서 범위 문장을 못 찾았다 — 문구가 바뀌면 여기부터 고칠 것").toBeTruthy();
    const [, lo, hi] = m!;
    // 🔴 2026-08-21: FAQ가 placeholder로 바뀌면서 이 대조의 방향이 달라졌다.
    //    FAQ와 가이드가 같은 값을 말하는 건 이제 **구조적으로** 보장된다(아래 테스트).
    //    여기서는 가이드에 실제로 실린 범위가 파생값과 같은지를 본다 —
    //    가이드가 리터럴로 되돌아가면 여기서 걸린다.
    expect(`$${lo}`, "가이드의 하한이 파생값과 다르다").toBe(boxFloorLabel());
    expect(`$${hi}`, "가이드의 상한이 파생값과 다르다").toBe(boxCeilingLabel());
  });

  it("FAQ가 중앙값·범위를 파생값으로 받는다", () => {
    const page = readFileSync(new URL("../app/[locale]/faq/page.tsx", import.meta.url), "utf-8");
    expect(page, "FAQ 페이지가 boxMedianLabel을 안 쓴다").toMatch(/boxMedianLabel\(\)/);
    // 🔴 `toMatch`는 **한 곳만** 맞으면 통과한다. faq/page.tsx는 t()를 두 번 부르고
    //    (JSON-LD와 화면), 처음엔 그중 하나에 리터럴 "$4"를 넣어도 가드가 통과했다.
    //    자리마다 파생 함수를 쓰는지 **개수를 세어** 확인한다.
    const count = (re: RegExp) => (page.match(re) ?? []).length;
    const calls = count(/boxMedian:/g);
    expect(calls, "faq/page.tsx가 boxMedian을 한 번도 안 넘긴다").toBeGreaterThan(0);
    expect(count(/boxMedian:\s*boxMedianLabel\(\)/g), "boxMedian에 리터럴을 넘기는 자리가 있다").toBe(calls);
    expect(count(/boxFloor:\s*boxFloorLabel\(\)/g), "boxFloor 자리 수가 안 맞는다").toBe(calls);
    expect(count(/boxCeiling:\s*boxCeilingLabel\(\)/g), "boxCeiling 자리 수가 안 맞는다").toBe(calls);
    for (const l of LOCALES) {
      // 🔴 FAQ는 정적 JSON이라 값을 파생시킬 수 없다. 그래서 2026-08-21에 문구를
      //    placeholder로 바꾸고 `app/[locale]/faq/page.tsx`가 본문·가드와 **같은 함수**에서
      //    값을 넘긴다. 리터럴을 대조하면 매주 손으로 세 로케일을 고쳐야 하고,
      //    실제로 그렇게 두었더니 $4가 $3.90이 될 때까지 아무도 몰랐다.
      expect(messages[l].faq_a31, `${l}: FAQ가 중앙값 placeholder를 안 쓴다`)
        .toContain("{boxMedian}");
      expect(messages[l].faq_a31, `${l}: FAQ가 범위 placeholder를 안 쓴다`)
        .toMatch(/\{boxFloor\}[\s\S]*\{boxCeiling\}/);
    }
  });

  it("사진이 예시라는 고지가 남아 있다 (FB 지적에 대한 답이다)", () => {
    expect(messages.en.faq_a31).toContain("illustrative");
    expect(messages.en.faq_a31).toContain("does not include a drink");
  });
});

describe("🔴 UI 문구가 사이트의 실제 동작·About과 어긋나지 않는다", () => {
  /**
   * 2026-08-09. AdSense가 5회 연속 "가치가 별로 없는 콘텐츠"로 거절했는데,
   * 그동안의 점검은 **기술 요건과 기사 본문만** 봤다. `messages/*.json`의 UI 문구는
   * 한 번도 대상이 아니었고, 거기에 사실이 아닌 주장이 17건 있었다.
   *
   * 가장 심한 것: **About 페이지가 자기 자신과 모순됐다.**
   *   about_mission2 "Founded by a team of parents and tech enthusiasts"
   *   About 본문     "Yong Jae Lee. I'm a Senior Product Designer..."
   *   기사 schema    author: Person(Yong Jae Lee)  ← 1인
   * 그리고 FAQ가 "우리는 주간 특가를 추적하지 않는다"고 말하는데
   * 홈은 "This Week's Sales, Built In"이라고 말하고 있었다.
   *
   * 심사관이 About → FAQ → 홈을 훑으면 **자기가 뭔지 모르는 사이트**로 읽힌다.
   * 이건 문장을 예쁘게 쓰는 문제가 아니라 **신뢰의 문제**라 테스트로 묶는다.
   */
  const LOCALES = ["en", "ko", "zh"] as const;
  const msgs = Object.fromEntries(
    LOCALES.map((l) => [
      l,
      JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8")) as Record<string, string>,
    ]),
  );
  /**
   * ⚠️ 금지어 가드는 **정직한 부인문까지 막는다** — 이미 두 번 겪었다
   *    ("we do not ask for your name", "Coles is not tracked yet").
   *    "팀이 없습니다 / 没有团队 / not a support team"은 우리가 반드시 해야 하는
   *    말이지, 잡아야 하는 말이 아니다. 그래서 검사 전에 **부인 문장을 걷어낸다.**
   *    문장 단위로 자르고, 부정 표지가 든 문장은 빼고 본다.
   */
  const DENIAL = /없습니다|없다|아닙니다|没有|不是|\bno (team|editorial team)\b|\bnot a (company|team|support team)\b/i;
  const allText = (l: string) =>
    Object.values(msgs[l])
      .filter((v) => typeof v === "string")
      .join("\n")
      .split(/(?<=[.!?。！？])\s+|\n+|—|--/)
      .filter((sentence) => !DENIAL.test(sentence))
      .join("\n");

  const BANNED: [RegExp, string][] = [
    // 🔴 08-11: 이 루프는 ko/zh를 다 돌지만 **패턴이 영어뿐이었다.** 그래서
    //    ko `faq_a30`의 "팀원의 시험 조리, 편집 검토"와 zh의 "团队成员试做、编辑审核"이
    //    3개 언어 검사를 통과한 채 남아 있었다 — 08-09에 고쳤다고 기록된 항목이다.
    //    **언어를 도는 것과 언어를 보는 것은 다르다.**
    [/\bour team\b|\ba team member\b|\bteam of parents\b|팀원|편집팀|우리 팀|团队/i,
      "1인 운영인데 '팀'을 말한다 (About 본문·author schema와 모순)"],
    [/editorial review|편집 검토|편집 검수|编辑审核/i, "편집 검수 절차는 존재하지 않는다"],
    [/시험 조리|试做/i, "시험 조리를 하는 사람이 없다 — 검증 불가 주장"],
    // ⚠️ 08-10: /our AI/ 로 좁게 잡았다가 "the AI will try to incorporate them"과
    //    ko/zh의 "AI 기반"·"AI 驱动"을 놓쳤다. 단어 자체를 본다.
    [/\bAI\b/i, "플래너는 결정적 알고리즘이다. FB에서 이미 'AI garbage' 소리를 들었다"],
    [/don'?t track weekly specials|do not track weekly specials/i, "특가를 추적한다 — 홈의 'This Week's Sales, Built In'과 정면 모순"],
    [/update[sd]? prices monthly|monthly Woolworths vs/i, "Woolworths 가격은 주간 갱신이다"],
    [/I test each meal|test preparation by/i, "검증할 수 없는 주장은 싣지 않는다"],
    [/15-25%/, "실측은 12%였다(2026-05-16, 20품목 $87.42 vs $99.48)"],
  ];

  for (const l of LOCALES) {
    it(`${l}: 사실이 아닌 주장이 없다`, () => {
      const text = allText(l);
      for (const [re, why] of BANNED) {
        expect(re.test(text), `${l}에 "${re.source}" 가 남아 있다 — ${why}`).toBe(false);
      }
    });
  }

  it("플래너 문맥에서 Pak'nSave 가격을 쓴다고 말하지 않는다", () => {
    // 플래너는 Woolworths 가격 + Woolworths/New World 특가를 쓴다.
    // Pak'nSave는 **가격지수에서만** 비교 대상이고, 그 열은 매장 방문이 필요해 자주 멈춘다.
    for (const k of ["home_hero_desc", "home_feat_shopping_desc", "home_usecase3_desc",
                     "planner_seo_intro", "planner_seo_step3_text"]) {
      // 🔴 09-29: en만 보고 있어서 ko/zh 세 키가 「Pak'nSave 가격 내장」이라고 말하고 있었다.
      for (const l of LOCALES) {
        expect(msgs[l][k] ?? "", `${l}:${k}`).not.toMatch(/Pak'?nSave|팩앤세이브/i);
      }
    }
  });

  it("'Our Promise' 헤딩이 마케팅 배지가 아니라 검증 가능한 것을 말한다", () => {
    // ⚠️ 이 금지는 **헤딩에만** 건다. 저자 소개의 "every recipe is tested at home with
    //    my own kids" 같은 1인칭 진술은 About과 일관된 정상 문구이고 오히려 E-E-A-T에
    //    도움이 된다. 처음에 전역 금지로 걸었다가 그 문장들까지 잡았다.
    for (const l of LOCALES) {
      expect(msgs[l].home_commitment_heading ?? "", `${l}`).not.toMatch(/tested at home/i);
    }
    expect(msgs.en.home_commitment_heading).toMatch(/corrected in public/i);
  });

  it("홈의 가격지수 소개가 실제 갱신 주기를 말한다 (JSX 하드코딩)", () => {
    // ⚠️ 주장은 네 곳에 산다: guides.ts · posts.ts · messages/*.json · **JSX**.
    //    messages만 훑다가 이 문장을 놓쳤다 — "checked in-store monthly"라고
    //    적혀 있었는데 Pak'nSave 열은 2026-05-16 이후 85일 멈춰 있었다.
    const home = readFileSync(new URL("../app/[locale]/page.tsx", import.meta.url), "utf-8");
    expect(home).not.toMatch(/checked in-store monthly/i);
    expect(home).toMatch(/every week/i);
  });

  it("1인 운영이라는 사실이 About 문구에 남아 있다", () => {
    expect(msgs.en.about_mission2).toMatch(/one parent|not a company|one-person/i);
  });
});

describe("화면 안내 문구가 실제 배치와 어긋나지 않는다", () => {
  const planner = readFileSync(
    new URL("../components/PlannerClient.tsx", import.meta.url),
    "utf-8",
  );
  const L3 = ["en", "ko", "zh"] as const;
  const m3 = Object.fromEntries(
    L3.map((l) => [
      l,
      JSON.parse(
        readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8"),
      ) as Record<string, string>,
    ]),
  ) as Record<(typeof L3)[number], Record<string, string>>;

  // 🔴 여는 태그를 통째로 떠서 본다. 처음엔 `<aside className="order-2`로 걸었다가
  //    속성을 하나 추가해 줄바꿈이 생긴 순간 가드가 조용히 깨졌다.
  //    **가드를 코드 서식에 묶지 말 것.**
  const openTag = (tag: string) =>
    planner.match(new RegExp(`<${tag}\\b[\\s\\S]{0,400}?>`))?.[0] ?? "";

  it("모바일에서 플랜이 필터보다 먼저 온다", () => {
    // 첫 화면이 설문지면 "몇 초 만에 한 주 도시락"이라는 약속과 어긋난다.
    // 실측: Monday가 y=1550(첫 화면 738px 아래)이었다 → 고친 뒤 y=659.
    expect(openTag("aside")).toMatch(/order-2 lg:order-1/);
    expect(openTag("main")).toMatch(/order-1 lg:order-2/);
  });

  it("모바일 1단계 안내가 필터를 '위'라고 가리키지 않는다 (3개 언어)", () => {
    // 🔴 배치를 바꾸면 문구가 조용히 거짓이 된다. `order-2`로 필터를 아래로 내린
    //    순간 3개 언어의 "위의 필터 / icons above / 上方"가 전부 틀린 말이 됐다.
    //    en만 고치고 ko/zh를 남기는 사고가 이 저장소에서 반복됐다 — 셋 다 건다.
    expect(openTag("aside"), "필터가 모바일에서 아래에 있어야 이 검사가 성립한다")
      .toMatch(/order-2 /);

    // 🔴 Aussie에서 이 가드가 알리바이였다. 거기선 같은 문구가 **JSX에 하드코딩**돼
    //    있고 번역키는 어디서도 안 쓰여서, 번역파일만 고친 채 화면은 "icons above"로
    //    라이브에 나갔는데 가드는 통과했다. Kiwi는 지금 `t()`를 쓰지만 같이 막는다.
    expect(planner, "모바일 안내가 JSX에 하드코딩됐다면 그것도 봐야 한다")
      .not.toMatch(/lg:hidden">[^<{]*\babove\b[^<]*<\/span>/);
    for (const l of L3) {
      expect(m3[l].planner_step1_mobile ?? "", `${l}: 필터는 아래에 있다`)
        .not.toMatch(/\babove\b|위의|위에|上方|上面/);
    }
  });

  it("플랜이 있을 때 모바일에서 필터로 돌아갈 길이 있다", () => {
    // 순서를 뒤집으면서 필터가 플랜 카드 전부 아래(y=5,633)로 내려갔다.
    // 앵커가 없으면 "다시 뽑기"가 사실상 불가능해진다 — 내가 만든 회귀다.
    expect(planner).toMatch(/id="planner-filters"/);
    expect(planner).toMatch(/href="#planner-filters"/);
  });

  it("로그인 버튼이 생성 CTA와 같은 무게로 보이지 않는다", () => {
    // 계정 없이 전부 동작한다("가입 불필요"). 로그인이 초록 채움 버튼이면
    // 최상단에서 가장 눈에 띄는 것이 로그인이 된다 — 홍보 문구와 어긋난다.
    const loginBtn = planner.slice(
      planner.indexOf("onClick={() => setShowAuth(true)}"),
      planner.indexOf("onClick={() => setShowAuth(true)}") + 400,
    );
    expect(loginBtn).not.toMatch(/bg-\[#78B159\]/);
  });

  /**
   * 🔴 2026-08-13 실측: `/en/planner`가 한 페이지에서 두 개수를 동시에 말하고 있었다.
   *    "our database of 94 New Zealand-friendly recipes" ← 맞음
   *    "a library of 43 lunch recipes plus snacks"      ← 라이브러리가 43개이던 시절의 값
   *    "That leaves 38 recipes eligible"                ← 43 − 5. 실제는 94 − 5 = 89
   *    **손으로 적은 개수는 데이터가 자라도 따라오지 않는다.** 그래서 lib/siteCounts.ts로 옮겼다.
   *    이 사이트의 AdSense 거절 사유가 "문구끼리의 모순"이었다는 걸 생각하면
   *    개수를 손으로 적는 것 자체가 재발 장치다.
   */
  it("🔴 planner 본문의 개수는 손으로 적지 않는다", () => {
    const src = readFileSync(
      new URL("../app/[locale]/planner/page.tsx", import.meta.url),
      "utf-8",
    );
    const flat = src.replace(/\s+/g, " ");

    // 서식·낱말에 묶지 않는다: "<숫자> ... recipes|snacks" 꼴이 **리터럴로** 있으면 실패.
    // 헤딩·표의 숫자는 대상이 아니므로 명사와 4단어 이내로 붙어 있을 때만 본다.
    const hardcoded = [
      ...flat.matchAll(/\b(\d{2,4})\s+(?:[a-zA-Z'’-]+\s+){0,4}(recipes|snacks|meals|menus)\b/g),
    ];
    expect(
      hardcoded.map((m) => m[0]),
      "개수를 본문에 직접 쓰지 말고 lib/siteCounts.ts에서 가져올 것",
    ).toEqual([]);

    // 그리고 실제로 헬퍼를 쓰고 있어야 한다 — 위 검사는 "숫자를 지우기만" 해도 통과한다
    expect(flat, "siteCounts를 import하지 않는다").toMatch(/from "@\/lib\/siteCounts"/);
    for (const token of ["{MENU_COUNT}", "{SNACK_COUNT}", "{NUT_CONTAINING_COUNT}", "{NUT_FREE_COUNT}"]) {
      expect(flat, `${token}이 본문에 렌더되지 않는다`).toContain(token);
    }
  });

  it("🔴 siteCounts는 데이터와 일치한다 — 헬퍼가 거짓말하면 전부 거짓말이 된다", async () => {
    const counts = await import("./siteCounts");
    const menus = MENUS;
    expect(counts.MENU_COUNT).toBe(menus.length);
    expect(counts.NUT_CONTAINING_COUNT).toBe(menus.filter((m) => !m.is_nut_free).length);
    expect(counts.NUT_FREE_COUNT).toBe(counts.MENU_COUNT - counts.NUT_CONTAINING_COUNT);
    expect(counts.MENU_COUNT).toBeGreaterThan(0);
    expect(counts.SNACK_COUNT).toBeGreaterThan(0);
    expect(counts.DAIRY_FREE_COUNT).toBe(MENUS.filter((m) => m.is_dairy_free).length);
    expect(counts.GLUTEN_FREE_COUNT).toBe(MENUS.filter((m) => m.is_gluten_free).length);
    expect(counts.NO_COOK_COUNT).toBe(MENUS.filter((m) => m.prep_style === "no-cook").length);
  });

  /**
   * 🔴 2026-08-13 실측: 라이브 30페이지 중 **19개**의 meta description이 160자를 넘었다
   *    (최대 293자). 구글은 ~155자에서 자르므로 뒤쪽 문장은 검색결과에 존재하지 않는다.
   *    excerpt 하나가 카드 문구와 meta description을 겸하므로 여기서 함께 지킨다.
   *    ⚠️ 처음엔 상한을 165로 뒀다 — 155는 목표치이고 몇 자 넘겼다고 실패시키면
   *    가드가 잔소리가 되어 결국 꺼진다고 봤기 때문이다. 그런데 그 느슨함 때문에
   *    **5편이 156~165 구간에 그대로 남아 있었고**, 전부 "Discover how to…" 류의
   *    상투구라 줄이면서 내용도 구체적으로 바뀌었다. 지금은 전 편이 155 이하이므로
   *    상한을 목표치에 맞춘다 — **아무도 넘지 않을 때 조이는 것이 비용이 0이다.**
   */
  it("🔴 excerpt는 검색결과에서 잘리지 않는 길이여야 한다", () => {
    const tooLong: string[] = [];
    for (const [slug, p] of Object.entries(POSTS)) {
      if (p.excerpt.length > 155) tooLong.push(`post/${slug}: ${p.excerpt.length}자`);
    }
    for (const [slug, g] of Object.entries(GUIDES)) {
      if (g.excerpt.length > 155) tooLong.push(`guide/${slug}: ${g.excerpt.length}자`);
    }
    expect(tooLong, "구글이 ~155자에서 자른다 — 뒤쪽은 없는 말이 된다").toEqual([]);
  });

  it("excerpt가 비거나 지나치게 짧지 않다 — 짧은 쪽으로 도망가면 안 된다", () => {
    const tooShort = [
      ...Object.entries(POSTS).map(([s, p]) => [`post/${s}`, p.excerpt] as const),
      ...Object.entries(GUIDES).map(([s, g]) => [`guide/${s}`, g.excerpt] as const),
    ].filter(([, e]) => e.trim().length < 70);
    expect(tooShort.map(([s, e]) => `${s}: ${e.length}자`)).toEqual([]);
  });

  /**
   * 월간 분석 글(2026-08-13 신설). 이 글의 논지는 **"격차가 몇 품목에 몰려 있다"**이므로
   * 표와 논지가 어긋나면 글 자체가 무너진다. 그래서 수치를 전부 데이터에서 생성한다.
   */
  describe("월간 가격지수 분석 글", () => {
    const SLUG = "supermarket-price-gap-nz-lunchbox";
    const body = () => POSTS[SLUG].body;

    it("존재하고, 데이터에서 생성된 값이 실제로 렌더된다", () => {
      const b = body();
      const comp = (index as { items: PriceRow[] }).items.filter((i) =>
        isComparableRow(i, (index as { woolworthsUpdated: string }).woolworthsUpdated),
      );
      const w = comp.reduce((a, c) => a + (c.countdown as number), 0);
      const p = comp.reduce((a, c) => a + (c.paknsave as number), 0);
      expect(b, "Woolworths 합계가 본문에 없다").toContain(`$${w.toFixed(2)}`);
      expect(b, "Pak'nSave 합계가 본문에 없다").toContain(`$${p.toFixed(2)}`);
      expect(b, "차액이 본문에 없다").toContain(`$${(w - p).toFixed(2)}`);
      expect(b, "비교 품목 수가 본문에 없다").toContain(`${comp.length} items`);
    });

    it("🔴 상위 격차 표의 품목이 실제 상위 품목과 같다", () => {
      const idx = index as { items: PriceRow[]; woolworthsUpdated: string };
      const top = idx.items
        .filter((i) => isComparableRow(i, idx.woolworthsUpdated))
        .map((i) => ({ n: i.name, g: (i.countdown as number) - (i.paknsave as number) }))
        .sort((a, b) => b.g - a.g)
        .slice(0, 4);
      const b = body();
      for (const t of top) {
        expect(b, `상위 격차 품목 ${t.n}이 표에 없다`).toContain(`| ${t.n}`);
      }
    });

    it("🔴 한계 고백이 빠지지 않는다 — 이 글은 인용되라고 쓴 글이다", () => {
      const b = body();
      expect(b, "온라인 가격이라는 한계가 없다").toMatch(/Click & Collect|online/i);
      expect(b, "매장이 하나라는 한계가 없다").toMatch(/Ormiston|one store/i);
      expect(b, "SKU 고정 시작일이 없다").toContain("30 July 2026");
      expect(b, "CC BY 라이선스 안내가 없다").toMatch(/CC BY/);
    });

    it("본문에 개수·금액을 손으로 적지 않는다", () => {
      const src = readFileSync(new URL("../content/posts.ts", import.meta.url), "utf-8");
      // 🔴 끝을 이웃 글 이름으로 잡으면, 그 사이에 글이 하나 끼는 순간 가드가
      //    남의 글까지 검사한다(2026-09-07에 실제로 그랬다). 다음 최상위 키까지만 본다.
      const start = src.indexOf(`"${SLUG}"`);
      const rest = src.slice(start + SLUG.length + 2);
      const next = rest.search(/\n {2}"[a-z0-9-]+": \{/);
      const section = rest.slice(0, next === -1 ? undefined : next);
      // 금액 리터럴($12.34)과 "N items"가 본문에 직접 박히면 실패
      expect(section.match(/\$\d+\.\d{2}/g) ?? [], "금액을 손으로 적었다").toEqual([]);
      expect(section.match(/\b\d{1,3} items\b/g) ?? [], "품목 수를 손으로 적었다").toEqual([]);
    });
  });

  /**
   * 🔴 2026-08-13: 푸터가 **12개 파일에 복붙**돼 있었고 이미 **6가지 버전으로 갈라져**
   *    있었다. 9개 페이지엔 Guides 링크가 없었고, price-index만 영어를 하드코딩했다.
   *    공용 컴포넌트로 합쳤다. **다시 인라인으로 쓰면 같은 병이 재발한다.**
   */
  describe("푸터", () => {
    const pages = () => {
      const out: [string, string][] = [];
      const walk = (dir: string) => {
        for (const e of readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true })) {
          const p = `${dir}/${e.name}`;
          if (e.isDirectory()) walk(p);
          else if (e.name.endsWith(".tsx")) {
            out.push([p, readFileSync(new URL(`../${p}`, import.meta.url), "utf-8")]);
          }
        }
      };
      walk("app");
      return out;
    };

    it("🔴 인라인 <footer>를 쓰지 않는다 — 공용 컴포넌트만", () => {
      const inline = pages()
        .filter(([, s]) => /<footer\b/.test(s))
        .map(([p]) => p);
      expect(inline, "components/Footer.tsx를 쓸 것 (복붙하면 또 갈라진다)").toEqual([]);
    });

    it("푸터를 렌더하는 페이지는 Footer를 import 한다", () => {
      const broken = pages()
        .filter(([, s]) => s.includes("<Footer ") && !s.includes('from "@/components/Footer"'))
        .map(([p]) => p);
      expect(broken).toEqual([]);
    });

    it("🔴 푸터가 가격 이력 페이지로 링크한다 — 사이트 안에서 이 페이지로 오는 길", () => {
      // 09-28 GSC: /en/price-history가 「발견됨 - 색인 안 됨 · 참조 페이지 없음」. 링크는 가격지수와 글 두 편에만 있었고
      // 그 페이지들을 구글이 9월 이후 다시 안 읽었다. 모든 페이지의 푸터에 두면 어디를 크롤해도 닿는다.
      const src = readFileSync(new URL("../components/Footer.tsx", import.meta.url), "utf-8");
      expect(src).toContain("/price-history`}");
      for (const l of ["en", "ko", "zh"]) {
        const m = JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8"));
        expect(m.nav_price_history, l).toBeTruthy();
      }
    });

    it("🔴 소셜 링크가 우리 계정을 가리킨다", async () => {
      const { SOCIAL } = await import("../components/Footer");
      expect(SOCIAL.instagram).toContain("kiwi_lunchbox_planner");
      expect(SOCIAL.facebook).toContain("61591764696235"); // Kiwi Lunchbox 페이지 id
      const src = readFileSync(new URL("../components/Footer.tsx", import.meta.url), "utf-8");
      expect(src, "새 탭으로 열리지 않는다").toMatch(/target="_blank"/);
      expect(src, "rel=noopener가 없다 — 새 탭에 opener를 넘기면 안 된다").toMatch(/rel="noopener/);
      expect(src, "스크린리더용 이름이 없다").toMatch(/aria-label="Kiwi Lunchbox on Instagram"/);
      expect(src, "스크린리더용 이름이 없다").toMatch(/aria-label="Kiwi Lunchbox on Facebook"/);
    });

    /**
     * 🔴 2026-08-13: `/en/planner`에만 푸터가 없었다. 하필 가장 중요한 페이지다 —
     *    IG 바이오 링크가 가리킬 곳, 학교 메일이 보내는 곳, AdSense가 정책 페이지
     *    접근성을 보는 곳이다. 약관·개인정보 링크가 통째로 없었다.
     *    ⚠️ 페이지가 클라이언트 컴포넌트에 위임하는 경우가 있어(account → AccountClient)
     *    **한 단계 위임까지 따라가서** 판단한다. 안 그러면 멀쩡한 페이지를 잡는다.
     */
    it("🔴 모든 로케일 페이지가 푸터를 렌더한다 (위임 포함)", () => {
      const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf-8");
      const rendersFooter = (src: string, depth = 0): boolean => {
        if (src.includes("<Footer")) return true;
        if (depth > 0) return false;
        // 로컬 컴포넌트로 위임하는 경우 한 단계만 따라간다
        for (const m of src.matchAll(/^import\s+(\w+)\s+from\s+"(\.\/[\w/.]+|@\/components\/[\w/.]+)"/gm)) {
          if (!src.includes(`<${m[1]}`)) continue;
          const rel = m[2].startsWith("@/") ? m[2].slice(2) : null;
          for (const cand of rel ? [`${rel}.tsx`] : []) {
            try {
              if (rendersFooter(read(cand), depth + 1)) return true;
            } catch {
              /* 파일이 없으면 그냥 넘어간다 */
            }
          }
        }
        return false;
      };

      const missing: string[] = [];
      const walk = (dir: string) => {
        for (const e of readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true })) {
          const p = `${dir}/${e.name}`;
          if (e.isDirectory()) walk(p);
          else if (e.name === "page.tsx") {
            const src = readFileSync(new URL(`../${p}`, import.meta.url), "utf-8");
            if (/\bredirect\s*\(/.test(src)) continue; // 리다이렉트 전용 페이지는 제외
            // 같은 폴더의 클라이언트 컴포넌트로 위임하는 경우도 본다
            const sibling = readdirSync(new URL(`../${dir}/`, import.meta.url))
              .filter((f) => f.endsWith("Client.tsx"))
              .map((f) => {
                try {
                  return readFileSync(new URL(`../${dir}/${f}`, import.meta.url), "utf-8");
                } catch {
                  return "";
                }
              });
            if (rendersFooter(src) || sibling.some((s) => s.includes("<Footer"))) continue;
            missing.push(p);
          }
        }
      };
      walk("app");
      expect(missing, "푸터가 없으면 약관·개인정보·소셜로 가는 길이 없다").toEqual([]);
    });

    it("푸터가 주요 섹션으로 가는 길을 전부 연다", () => {
      const src = readFileSync(new URL("../components/Footer.tsx", import.meta.url), "utf-8");
      for (const seg of ["planner", "price-index", "blog", "guides", "faq", "about", "contact", "terms", "policies"]) {
        expect(src, `푸터에 /${seg} 링크가 없다`).toContain(`/\${locale}/${seg}\``);
      }
    });
  });

  it("쿠키 동의 배너는 남아 있다 (AdSense GDPR 요건)", () => {
    // 높이를 줄이는 작업 중에 통째로 지우는 사고를 막는다.
    const banner = readFileSync(
      new URL("../components/CookieConsent.tsx", import.meta.url),
      "utf-8",
    );
    expect(banner).toMatch(/cookie-consent/);
    expect(banner).toMatch(/cookie_accept/);
    expect(banner).toMatch(/cookie_decline/);
  });
});

/**
 * 🔴 UI 번역 파일(`messages/*.json`)의 수치 가드 — 2026-08-13 신설
 *
 * 이 파일들은 오늘까지 **어떤 테스트도 보고 있지 않았다.** 그 결과:
 *   - `blog_count`가 en "44 guides" · ko/zh "19개"라고 **서로 다른 값**을 말했고,
 *     셋 다 틀렸다(실제 21). 그 문장 바로 아래에 카드가 21장 깔려 있다.
 *   - `home_tips_combo_p`가 "12 in-depth posts" — 오늘 글을 하나 추가하면서 13이 됐다.
 *   - `faq_a20`이 "the last time I priced ... 16 May 2026"이라고 했다.
 *     그 뒤 8월에 다시 쟀고, price-index 페이지는 8.7%/15개를 말하고 있었다.
 *     **같은 사이트의 두 페이지가 서로 다른 최신값을 말하는 상태**였다.
 *   - 가이드 본문은 오늘 "about $4"(반올림)로 통일했는데 여기는 "$4.11"이 9곳 남아 있었다.
 *   - zh `faq_a20`은 「首先 … 第三 … 第四」로 **둘째 항목이 통째로 빠져** 있었다.
 *
 * 공통 원인은 하나다: **같은 사실을 말하는 자리가 content/와 messages/ 둘인데
 * 가드는 한쪽만 보고 있었다.** 그래서 여기서는 로케일 간 일치까지 본다.
 */
describe("🔴 UI 번역 파일의 수치가 데이터·서로와 일치한다", () => {
  const LOCALES = ["en", "ko", "zh"] as const;
  const msg = (loc: string) =>
    JSON.parse(
      readFileSync(new URL(`../messages/${loc}.json`, import.meta.url), "utf-8"),
    ) as Record<string, string>;
  const MSGS = Object.fromEntries(LOCALES.map((l) => [l, msg(l)])) as Record<string, Record<string, string>>;

  /**
   * 문장에 등장하는 금액·퍼센트를 전부 뽑는다 (로케일이 달라도 숫자는 같아야 한다).
   *
   * ⚠️ 처음엔 `[\d,]+`로 썼다가 한국어 문장의 **문장부호 쉼표까지 삼켜서**
   * `"$4,"`와 `"$4"`가 다른 값으로 잡혔다. 쉼표는 **천단위 구분자 자리에서만** 허용한다.
   */
  const figures = (s: string) =>
    (s.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?%/g) ?? []).map((x) => x.replace(/\s/g, ""));

  it("개수를 손으로 적지 않는다 — ICU 인자여야 한다", () => {
    // 리터럴 숫자가 돌아오면 여기서 잡힌다. 44·19·12가 전부 이렇게 들어왔다.
    for (const loc of LOCALES) {
      expect(MSGS[loc].blog_count, `${loc}.blog_count`).toContain("{posts}");
      expect(MSGS[loc].blog_count, `${loc}.blog_count`).toContain("{guides}");
      expect(MSGS[loc].blog_count, `${loc}.blog_count`).toContain("{total}");
      expect(MSGS[loc].blog_count, `${loc}.blog_count에 리터럴 개수가 있다`).not.toMatch(/\d\d/);
      expect(MSGS[loc].home_tips_combo_p, `${loc}.home_tips_combo_p`).toContain("{posts}");
      expect(MSGS[loc].home_tips_combo_p, `${loc}.home_tips_combo_p`).toContain("{guides}");
    }
  });

  it("ICU 인자를 실제로 넘겨준다 (문구만 고치고 호출부를 놓치면 '{posts}'가 그대로 보인다)", () => {
    const blog = readFileSync(new URL("../app/[locale]/blog/page.tsx", import.meta.url), "utf-8");
    expect(blog).toMatch(/t\("blog_count",[\s\S]{0,200}?posts:[\s\S]{0,200}?guides:[\s\S]{0,200}?total:/);
    const home = readFileSync(new URL("../app/[locale]/page.tsx", import.meta.url), "utf-8");
    expect(home).toMatch(/t\("home_tips_combo_p",[\s\S]{0,120}?posts:[\s\S]{0,120}?guides:/);
  });

  it("blog 페이지가 세는 대상이 실제 렌더하는 카드와 같다", () => {
    // "DB에 몇 개"가 아니라 "그 페이지에서 몇 개가 보이나"여야 한다.
    const blog = readFileSync(new URL("../app/[locale]/blog/page.tsx", import.meta.url), "utf-8");
    // 2026-08-17: 칩이 실제 필터가 되면서 `BLOG_CARDS.map`이 `items={BLOG_CARDS}`로 옮겨갔다.
    // 탐지 방식만 바꾸고 의도는 그대로 둔다 — **두 출처가 다 렌더되는지**를 본다.
    const rendersPosts = /BLOG_CARDS\.map|items=\{BLOG_CARDS\}/.test(blog);
    const rendersGuides = /GUIDE_CARDS\.map|items=\{GUIDE_CARDS\}/.test(blog);
    expect(rendersPosts && rendersGuides, "렌더 대상이 바뀌면 total의 정의도 바뀌어야 한다").toBe(true);
    expect(BLOG_PAGE_CARD_COUNT).toBe(POST_COUNT + GUIDE_COUNT);
  });

  it("세 로케일이 같은 수치를 말한다", () => {
    // en 44 / ko 19 / zh 19처럼 갈라지는 걸 잡는다. 번역이 아니라 사실의 문제다.
    for (const key of ["faq_a20", "planner_seo_price_p", "home_tips_price_p", "home_stat_value"]) {
      const sets = LOCALES.map((l) => figures(MSGS[l][key]).sort().join(" | "));
      expect(new Set(sets).size, `${key}가 로케일마다 다른 숫자를 말한다:\n${LOCALES.map((l, i) => `  ${l}: ${sets[i]}`).join("\n")}`).toBe(1);
    }
  });

  it("중앙값을 센트 단위로 말하지 않는다 (가이드 본문은 '약 $4'로 통일했다)", () => {
    // 두 층이 다른 정밀도로 같은 값을 말하면, 데이터가 움직일 때 한쪽만 틀린다.
    for (const loc of LOCALES) {
      for (const key of ["faq_a20", "planner_seo_price_p", "home_tips_price_p"]) {
        expect(MSGS[loc][key], `${loc}.${key}에 센트 단위 중앙값이 있다`).not.toMatch(/\$\s?4\.\d/);
      }
    }
  });

  /**
   * 🔴 2026-09-10 — `faq_a20`이 금액을 **세 언어에 손으로** 들고 있어 주간 수집 때마다
   *    깨졌다. 이제 `{basketW}` 같은 자리표시자이고 값은 `basketFigures()`가 채운다.
   *    가드는 **채워 넣은 뒤의 문장**을 검사한다 — 자리표시자만 확인하면
   *    값이 틀려도 통과하는 알리바이가 된다.
   */
  const filled = (tpl: string) => {
    const v = basketFigures() as Record<string, string>;
    return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
  };

  it("FAQ가 말하는 매장 비교값이 price-index 데이터와 같다", () => {
    // "the last time I priced"가 5월을 가리킨 채 남아 있던 자리다.
    const rows = (index.items as PriceRow[]).filter((r) => isComparableRow(r, index.woolworthsUpdated));
    const w = rows.reduce((s, r) => s + (r.countdown as number), 0);
    const p = rows.reduce((s, r) => s + (r.paknsave as number), 0);
    const pct = ((w - p) / w) * 100;
    for (const loc of LOCALES) {
      const f = figures(filled(MSGS[loc].faq_a20));
      expect(f, `${loc}.faq_a20에 Woolworths 합계가 없다`).toContain(`$${w.toFixed(2)}`);
      expect(f, `${loc}.faq_a20에 Pak'nSave 합계가 없다`).toContain(`$${p.toFixed(2)}`);
      // 소수점이 0이면 "10%"와 "10.0%" 둘 다 허용한다 — 산문에서 "10.0%"는 어색하다.
      // 🔴 값이 다르면 여전히 실패한다. 허용하는 건 표기뿐이다.
      const pctForms = [`${pct.toFixed(1)}%`];
      if (pct.toFixed(1).endsWith(".0")) pctForms.push(`${pct.toFixed(0)}%`);
      expect(
        pctForms.some((form) => f.includes(form)),
        `${loc}.faq_a20의 절감률이 데이터(${pct.toFixed(1)}%)와 다르다 — 본문 숫자: ${f.join(", ")}`,
      ).toBe(true);
      expect(filled(MSGS[loc].faq_a20), `${loc}.faq_a20에 비교 가능 품목 수(${rows.length})가 없다`).toMatch(
        new RegExp(`\\b${rows.length}\\b`),
      );
    }
  });

  // 🔴 2026-08-24: New World SKU 3건을 재선정해 3사 비교가 16 → 18품목이 됐는데
  //    **아무 가드도 안 걸렸다.** 위 검사가 2사 합계만 보고 있었기 때문이다.
  //    FAQ는 그동안 $88.95/$83.66/$76.04라는 낡은 3사 수치를 말하고 있었다.
  it("FAQ가 말하는 3사 비교값도 데이터와 같다", () => {
    const rows = (index.items as PriceRow[]).filter((r) =>
      isThreeWayComparableRow(r, index.woolworthsUpdated),
    );
    expect(rows.length, "3사 비교 가능 행이 없다 — 검사가 무의미하다").toBeGreaterThan(5);
    const sum = (k: "countdown" | "paknsave" | "newworld") =>
      rows.reduce((s, r) => s + (r[k] as number), 0).toFixed(2);
    for (const loc of LOCALES) {
      const f = figures(filled(MSGS[loc].faq_a20));
      for (const [label, k] of [
        ["Woolworths", "countdown"],
        ["Pak'nSave", "paknsave"],
        ["New World", "newworld"],
      ] as const) {
        expect(f, `${loc}.faq_a20의 3사 ${label} 합계가 데이터와 다르다`).toContain(`$${sum(k)}`);
      }
      expect(
        filled(MSGS[loc].faq_a20),
        `${loc}.faq_a20에 3사 비교 품목 수(${rows.length})가 없다`,
      ).toMatch(new RegExp(`\\b${rows.length}\\b`));
    }
  });

  it("중국어 FAQ의 순서 표현이 빠짐없이 이어진다", () => {
    // 「首先 … 第三 … 第四」로 둘째가 통째로 없었다. 번역 파일이라 아무도 안 읽는다.
    const zh = MSGS.zh.faq_a20;
    for (const marker of ["首先", "其次", "第三", "第四"]) {
      expect(zh, `zh.faq_a20에 '${marker}'가 없다`).toContain(marker);
    }
    expect(zh.indexOf("首先")).toBeLessThan(zh.indexOf("其次"));
    expect(zh.indexOf("其次")).toBeLessThan(zh.indexOf("第三"));
    expect(zh.indexOf("第三")).toBeLessThan(zh.indexOf("第四"));
  });
});

/**
 * 🔴 검색결과 제목 길이 — 2026-08-13 신설
 *
 * 어제 meta description을 고치면서 **title은 재어 보지 않았다.** 오늘 라이브를 재니
 * 글·가이드 **21편 중 19편의 title이 60자를 넘어** 전부 잘리고 있었다.
 * 원인은 두 가지가 겹친 것이다:
 *   1. 접미사가 `| Kiwi Lunchbox Blog`(20자)·`| Kiwi Lunchbox Guides`(22자)로 길었다
 *   2. 제목 자체가 60자를 넘는 글이 7편 있었다
 *
 * 잘리면 브랜드도 같이 잘리므로 **접미사는 자리가 남을 때만** 붙이고(`withBrand`),
 * 제목이 그 자체로 넘으면 `seoTitle`로 검색용 제목을 따로 준다(H1은 그대로 둔다).
 */
describe("🔴 검색결과 제목이 잘리지 않는다", () => {
  const rendered = (item: { title: string; seoTitle?: string }) =>
    withBrand(item.seoTitle ?? item.title);

  it("모든 글·가이드의 metadata title이 60자 이하다", () => {
    const tooLong: string[] = [];
    for (const [slug, p] of Object.entries(POSTS)) {
      const t = rendered(p);
      if (t.length > TITLE_MAX) tooLong.push(`post/${slug}: ${t.length}자 — ${t}`);
    }
    for (const [slug, g] of Object.entries(GUIDES)) {
      const t = rendered(g);
      if (t.length > TITLE_MAX) tooLong.push(`guide/${slug}: ${t.length}자 — ${t}`);
    }
    expect(tooLong, "구글이 ~60자에서 자른다 — 넘으면 브랜드까지 같이 잘린다").toEqual([]);
  });

  it("seoTitle은 필요할 때만 둔다 (제목이 짧은데 두면 둘이 갈라진다)", () => {
    // 두 개의 제목을 유지하는 건 비용이다. 원래 제목으로 60자 안에 들어가면 seoTitle은 없어야 한다.
    const pointless: string[] = [];
    for (const [slug, p] of Object.entries(POSTS)) {
      if (p.seoTitle && withBrand(p.title).length <= TITLE_MAX) pointless.push(`post/${slug}`);
    }
    for (const [slug, g] of Object.entries(GUIDES)) {
      if (g.seoTitle && withBrand(g.title).length <= TITLE_MAX) pointless.push(`guide/${slug}`);
    }
    expect(pointless, "원제목이 이미 들어가는데 seoTitle을 두면 나중에 한쪽만 고치게 된다").toEqual([]);
  });

  it("seoTitle이 원제목의 핵심어를 버리지 않는다", () => {
    // 짧게 만들려다 검색어 자체가 빠지면 줄인 의미가 없다. 첫 두 단어는 남아 있어야 한다.
    const drifted: string[] = [];
    const head = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2);
    for (const [kind, entries] of [["post", POSTS], ["guide", GUIDES]] as const) {
      for (const [slug, item] of Object.entries(entries)) {
        if (!item.seoTitle) continue;
        const words = item.seoTitle.toLowerCase().replace(/[^a-z0-9 ]/g, "");
        if (!head(item.title).every((w) => words.includes(w))) drifted.push(`${kind}/${slug}: ${item.seoTitle}`);
      }
    }
    expect(drifted, "줄이면서 첫머리 검색어가 사라졌다").toEqual([]);
  });

  it("정적 페이지의 meta description도 155자 이하다", () => {
    // contact가 172자였는데 아무 테스트도 보고 있지 않았다. excerpt만 지키면 절반만 지킨 것이다.
    const tooLong: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(rel);
        else if (e.name === "page.tsx") {
          const src = readFileSync(new URL(`../${rel}`, import.meta.url), "utf-8");
          // ⚠️ 처음엔 `buildPageMetadata`를 쓰는 파일만 봤다 — 그래서 helper를 안 쓰던
          // /planner(159자)를 통째로 놓쳤다. **가드가 helper 사용 여부에 의존하면
          // helper를 안 쓰는 곳이 사각지대가 된다.** 컴포넌트 앞부분(=metadata 정의부)만
          // 잘라서 본다. JSON-LD의 description은 컴포넌트 안이라 자연히 제외된다.
          // ⚠️ 처음엔 `description:` 키만 찾았다. planner는 설명이
          // `const descriptions = { en: "..." }` 안에 있어서 **한 글자도 안 보였다.**
          // 키 이름에 기대면 키 이름을 바꾼 순간 가드가 꺼진다.
          // metadata 정의부에 155자를 넘는 문자열이 있다면 그건 사실상 설명이다.
          // ⚠️ 두 번째 실수: `//` 주석을 지우려다 문자열 안의 `https://`를 잘라
          // 따옴표 짝이 어긋났고, 코드 여러 줄이 통째로 "문자열"로 잡혀 4건이 오탐이었다.
          // JS 문자열 리터럴은 줄바꿈을 넘지 못하므로 **줄바꿈을 금지**하면 저절로 걸러진다.
          const head = src.split("export default")[0];
          for (const m of head.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) {
            const d = m[1].replace(/\\(.)/g, "$1");
            if (d.length > 155) tooLong.push(`${rel}: ${d.length}자 — ${d.slice(0, 50)}…`);
          }
        }
      }
    };
    walk("app");
    expect(tooLong, "구글이 ~155자에서 자른다").toEqual([]);
  });
});

/**
 * 🔴 og와 twitter가 서로 다른 말을 하지 않는다 — 2026-08-13 신설
 *
 * `/en/planner`가 라이브에서 이 상태였다:
 *   og:title      "Lunch Planner — Kiwi Lunchbox"        ← 페이지가 준 값
 *   twitter:title "Weekly Lunch Planner | Kiwi Lunchbox" ← 레이아웃 기본값
 *   twitter:image 정사각 로고 (summary_large_image 카드에)
 * metadata를 손으로 짜면서 `openGraph`만 채우고 `twitter`를 빠뜨리면
 * Next.js가 레이아웃의 사이트 공통값으로 메운다. **에러도 안 나고 화면에도 안 보인다.**
 * `buildPageMetadata`가 정확히 이걸 막으려고 있는데 정작 안 쓰는 페이지가 있었다.
 */
describe("🔴 페이지 metadata가 og·twitter를 함께 채운다", () => {
  it("metadata를 정의하는 페이지는 helper를 쓰거나 og·twitter를 둘 다 채운다", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(rel);
        else if (e.name === "page.tsx") {
          const src = readFileSync(new URL(`../${rel}`, import.meta.url), "utf-8");
          if (!/generateMetadata|export const metadata/.test(src)) continue;
          const head = src.split("export default")[0];
          // ⚠️ 처음엔 `includes("buildPageMetadata")`로 봤다 — **import 줄에 걸려**
          // helper를 실제로는 안 쓰는 페이지까지 통째로 건너뛰었다. 호출을 봐야 한다.
          if (/return\s+buildPageMetadata\s*\(/.test(head)) continue;
          // noindex 페이지는 카드가 뿌려질 일이 없으므로 제외한다.
          if (/index:\s*false/.test(head)) continue;
          const hasOg = /openGraph:\s*\{[\s\S]*?title:/.test(head);
          const hasTw = /twitter:\s*\{[\s\S]*?title:/.test(head);
          if (!hasOg || !hasTw) offenders.push(`${rel} (og=${hasOg} twitter=${hasTw})`);
        }
      }
    };
    walk("app");
    expect(offenders, "한쪽만 채우면 나머지는 레이아웃 기본값이 조용히 들어간다").toEqual([]);
  });
});

/**
 * 🔴 죽은 것으로 확인된 출처가 되살아나지 않는다 — 2026-08-13 신설
 *
 * 라이브 31페이지의 외부 링크 27개를 처음 전수 확인했더니 두 개가 죽어 있었다:
 *   · `kaora.govt.nz` — **DNS 레코드 자체가 없다.** 예산 가이드가 "여기서 학교
 *     참여 여부를 확인하세요"라고 안내하던 정부 프로그램 주소다.
 *   · `health.govt.nz/your-health/healthy-living/food-and-physical-activity/healthy-eating`
 *     — 404. `lib/utils.ts`의 기본 출처라 **글·가이드 21편 전부의 하단**에 실려 있었다.
 *
 * ⚠️ 이 테스트는 네트워크를 타지 않는다(오프라인에서 죽은 링크를 새로 발견할 수는 없다).
 *    **새로 썩는 링크를 찾는 건 `scripts/check_external_links.mjs`의 일**이고,
 *    여기서는 이미 죽은 걸로 확인된 주소가 다시 들어오는 것만 막는다.
 *    ⚠️ 그 스크립트는 403/999를 죽었다고 하지 않는다 — health.govt.nz와 linkedin은
 *    자동 요청을 막을 뿐 사람에게는 열린다. 실제 사망은 브라우저로 확인해야 한다.
 */
describe("🔴 죽은 출처가 되살아나지 않는다", () => {
  const DEAD = [
    ["kaora.govt.nz", "DNS 레코드가 없다 (2026-08-13 확인). Ka Ora Ka Ako는 education.govt.nz에 있다"],
    [
      "health.govt.nz/your-health/healthy-living",
      "MoH 사이트 개편으로 404 (2026-08-13 브라우저 확인)",
    ],
  ] as const;

  const sources: Array<[string, string]> = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".next") continue;
        walk(rel);
      } else if (/\.(ts|tsx|json|mjs)$/.test(e.name)) {
        sources.push([rel, readFileSync(new URL(`../${rel}`, import.meta.url), "utf-8")]);
      }
    }
  };
  for (const d of ["app", "content", "lib", "messages"]) walk(d);

  it.each(DEAD)("%s 는 다시 쓰이지 않는다", (needle, why) => {
    const hits = sources
      // 이 테스트 파일 자체와 점검 스크립트는 그 문자열을 설명으로 갖고 있으므로 제외한다.
      .filter(([f]) => !f.endsWith("contentClaims.test.ts") && !f.endsWith("check_external_links.mjs"))
      .filter(([, src]) => src.includes(needle))
      .map(([f]) => f);
    expect(hits, `${needle} — ${why}`).toEqual([]);
  });

  it("점검 스크립트가 존재한다 (이 테스트만으로는 새로 썩는 링크를 못 잡는다)", () => {
    const s = readFileSync(new URL("../scripts/check_external_links.mjs", import.meta.url), "utf-8");
    expect(s, "403·999를 죽음으로 오판하지 않는 처리가 있어야 한다").toContain("BOT_BLOCKED");
  });
});

/**
 * 🔴 히어로 이미지는 글마다 달라야 한다 — 2026-08-14 신설
 *
 * `supermarket-price-gap-nz-lunchbox`와 `nut-free-school-lunches-new-zealand`가
 * **같은 사진**(마마이트 치즈 샌드위치)을 쓰고 있었다. 블로그 목록에서 두 카드가
 * 나란히 같은 그림으로 뜬다 — 어떤 테스트도, 어떤 페이지도 이걸 알려주지 않는다.
 * 사진이 21편에 하나씩 필요하고 실사진은 2장뿐이라, 돌려쓰기는 앞으로도 생긴다.
 */
describe("🔴 히어로 이미지가 글끼리 겹치지 않는다", () => {
  it("같은 이미지를 두 글이 쓰지 않는다", () => {
    const byImage = new Map<string, string[]>();
    for (const [kind, entries] of [["post", POSTS], ["guide", GUIDES]] as const) {
      for (const [slug, item] of Object.entries(entries)) {
        const img = (item as { image: string }).image;
        byImage.set(img, [...(byImage.get(img) ?? []), `${kind}/${slug}`]);
      }
    }
    const dupes = [...byImage.entries()]
      .filter(([, uses]) => uses.length > 1)
      .map(([img, uses]) => `${img} ← ${uses.join(", ")}`);
    expect(dupes, "목록 페이지에서 같은 사진이 두 번 뜬다").toEqual([]);
  });

  it("모든 히어로 파일이 실제로 존재한다", () => {
    // 파일명을 바꾸면서 참조를 놓치면 목록에 깨진 이미지가 뜬다. 404는 안 난다.
    const missing: string[] = [];
    for (const [kind, entries] of [["post", POSTS], ["guide", GUIDES]] as const) {
      for (const [slug, item] of Object.entries(entries)) {
        const img = (item as { image: string }).image;
        if (!img.startsWith("/assets/")) continue;
        try {
          readFileSync(new URL(`../public${img}`, import.meta.url));
        } catch {
          missing.push(`${kind}/${slug}: ${img}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

/**
 * 🔴 AdSense 심사 신호 — 2026-08-14 신설
 *
 * 외부 점검에서 **페이지마다 다른 사실을 말하고 있다**는 지적을 받았고, 실측해 보니 맞았다:
 *   · `/en/about` "the prices … come from the shops I actually push a trolley around,
 *     **not numbers scraped off a website**"
 *   · `/en/price-index` "Both columns are **read from the supermarkets' own online shops**"
 *   · `/en/planner` "not scraped blindly — **anchored to prices I check in person**"
 *   · `/en/about` "Price estimates … **updated quarterly**" ↔ 나머지 전부 weekly
 *
 * 사실은 **5월 라운드는 매장 실사, 그 이후는 온라인 주간 자동**이다.
 * 이 사이트의 거절 사유가 5회 연속 "가치가 별로 없는 콘텐츠"였고, 우리 진단은
 * **분량이 아니라 문구끼리의 모순**이었다([[adsense-self-contradiction-copy]]).
 * 검증 가능한 주장(가격·알레르기)이 서로 어긋나면 사이트 전체 신뢰도가 깎인다.
 */
describe("🔴 가격·알레르기·작성자 주장이 사이트 전체에서 하나다", () => {
  const sources: Array<[string, string]> = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".next") continue;
        walk(rel);
      } else if (/\.(tsx?|json)$/.test(e.name) && !e.name.endsWith(".test.ts")) {
        sources.push([rel, readFileSync(new URL(`../${rel}`, import.meta.url), "utf-8")]);
      }
    }
  };
  for (const d of ["app", "components", "content", "messages"]) walk(d);
  const find = (needle: string) => sources.filter(([, s]) => s.includes(needle)).map(([f]) => f);

  it("가격을 '온라인에서 긁은 게 아니다'라고 말하지 않는다", () => {
    // 실제로는 온라인 피드에서 주간 자동으로 읽는다. 이 문장은 그 자체로 거짓이다.
    expect(find("not numbers scraped off a website")).toEqual([]);
    expect(find("anchored to prices I check in person")).toEqual([]);
    expect(find("not scraped blindly")).toEqual([]);
  });

  it("가격 갱신 주기를 quarterly라고 말하지 않는다", () => {
    // price-index는 "weekly refresh instead of a quarterly one"이라고 대비시켜 쓰므로
    // 그 문장은 허용하고, **우리 주기를 quarterly라고 주장하는 형태**만 막는다.
    const claims = sources.filter(([, s]) =>
      /(updated|refreshed|checked)\s+quarterly/i.test(s),
    ).map(([f]) => f);
    expect(claims, "우리 갱신 주기는 weekly다").toEqual([]);
  });

  it("알레르기 필터를 보장처럼 말하지 않는다 (YMYL)", () => {
    // 면책문구는 "위험을 줄일 뿐 제거하지 못한다"고 말한다. 홍보 문구가 그걸 뒤집으면 안 된다.
    expect(find("Filters That Actually Work")).toEqual([]);
    expect(find("every meal in the generated plan respects your filters")).toEqual([]);
    for (const bad of ["completely nut-free", "guaranteed allergen", "100% safe"]) {
      expect(find(bad), `보장성 표현: ${bad}`).toEqual([]);
    }
  });

  it("비전문가가 건강 콘텐츠를 '검토했다'고 말하지 않는다", () => {
    // 철분 결핍·알레르기·식중독을 다루면서 작성자와 검토자가 같은 비전문가면
    // 'reviewed'는 신뢰 신호가 아니라 위험 신호가 된다. 영양사 검토가 붙으면 그때 되살릴 것.
    for (const [f, s] of sources) {
      if (!f.startsWith("messages/")) continue;
      const d = JSON.parse(s) as Record<string, string>;
      expect(d.blog_post_reviewed_by ?? "", `${f}: 작성자 라벨`).not.toMatch(/reviewed|검토|审核/i);
      expect(d.blog_post_about_desc ?? "", `${f}: 작성자 설명`).not.toMatch(/reviewed by|검토했|撰写和审核/i);
    }
  });

  it("sitemap의 정적 페이지가 배포할 때마다 '방금 수정됨'으로 신고되지 않는다", () => {
    // `new Date()`를 쓰면 내용이 안 바뀐 날에도 10개 페이지가 갱신됐다고 나간다.
    // 매번 갱신되는 lastmod는 신선도 신호가 아니라 신뢰할 수 없는 신호다.
    const sm = readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf-8");
    expect(sm, "정적 라우트에 lastModified: new Date() 금지").not.toMatch(
      /lastModified:\s*new Date\(\s*\)/,
    );
  });

  it("게시자 콘텐츠가 없는 페이지에는 광고 코드를 두지 않는다", () => {
    // Google Publisher Policies "Inventory value" — 약관·정책·문의는 콘텐츠 페이지가 아니다.
    const layout = readFileSync(new URL("../app/[locale]/layout.tsx", import.meta.url), "utf-8");
    for (const seg of ["/policies", "/terms", "/contact", "/account"]) {
      expect(layout, `광고 제외 경로에 ${seg}가 없다`).toContain(`"${seg}"`);
    }
    expect(layout).toMatch(/showAdSenseScript\s*=[\s\S]{0,160}isUtilityPath/);
  });
});

/**
 * 🔴 출처는 실제로 인용한 것만 보여준다 — 2026-08-14 신설
 *
 * `getReferences`가 "본문에 인용이 없으면 표준 4개(MoH·Allergy NZ·Heart Foundation·FSANZ)를
 * 대신 보여준다"였다. 재어 보니 **글 21편 중 14편이 그 폴백**이었고, 그래서
 * **보온가방 리뷰와 가격지수 글이 영양·알레르기 기관을 출처로 달고 있었다.**
 * 참조하지 않은 것을 참조했다고 표시하는 것은 신뢰 신호가 아니라 정확히 그 반대다.
 *
 * 같은 날 그 표준 4개 중 하나(MoH 링크)가 **404**였던 것도 이 구조 탓이다 —
 * 아무도 실제로 쓰지 않는 링크라 아무도 눌러 보지 않았다.
 */
describe("🔴 출처가 실제 인용에서만 나온다", () => {
  it("인용이 없으면 폴백 목록을 대신 보여주지 않는다", () => {
    const src = readFileSync(new URL("../lib/utils.ts", import.meta.url), "utf-8");
    expect(src, "표준 출처 폴백이 되살아났다").not.toMatch(/STANDARD_NZ_REFERENCES/);
    expect(src).toMatch(/export function getReferences[\s\S]{0,200}return extractReferences\(body\)/);
  });

  it("권위를 인용한 문장에는 링크가 붙어 있다", () => {
    // "According to the NZ Ministry of Health, 1 in 14 children…" 처럼 기관을 대고
    // 수치를 말하면서 링크가 없으면, 독자는 확인할 길이 없고 우리는 검산할 길이 없다.
    const bodies: Array<[string, string]> = [
      ...Object.entries(POSTS).map(([s, p]) => [`post/${s}`, p.body] as [string, string]),
      ...Object.entries(GUIDES).map(([s, g]) => [`guide/${s}`, g.body] as [string, string]),
    ];
    const ATTRIBUTED: Array<string | { re: RegExp; why: string }> = [
      // 🔴 2026-08-22: 여기 있던 값은 `according to data from [Allergy New Zealand](` 두 줄이었다.
      //    유병률을 ASCIA(호주뉴질랜드 임상면역알레르기학회) 실측으로 바꾸자 또 깨졌다 —
      //    위 두시간 규칙과 **똑같은 실패**다. 기관명을 박지 말고 문장 모양으로 잡는다:
      //    알레르기 유병률을 말하면 그 문장 안에 링크가 있어야 한다.
      { re: /Food allergy affects[^.]{0,200}\]\(https?:\/\//i, why: "식품알레르기 유병률에 링크가 없다" },
      { re: /Peanut allergy affects[^.]{0,200}\]\(https?:\/\//i, why: "땅콩알레르기 유병률에 링크가 없다" },
      "According to the [NZ Ministry of Health](",
      // 🔴 2026-08-20: 여기 있던 값은 `the two-hour rule as [MPI](` 였다. 본문에서
      //    "MPI"를 "NZ Food Safety"로 바꾸자(같은 기관의 식품안전 부문 이름) 이 가드가
      //    깨졌다 — 가드가 **문구의 두 번째 손복사본**이라 문구를 고칠 때마다 같이 고쳐야 한다.
      //    기관명이 아니라 **문장 모양**으로 잡는다: 두시간 규칙을 누군가에게 귀속시키면
      //    그 자리에 마크다운 링크가 있어야 한다.
      { re: /the two-hour rule as \[[^\]]+\]\(https?:\/\//, why: "두시간 규칙 귀속에 링크가 없다" },
      "in line with the [NZ Ministry of Health guidelines](",
    ];
    const all = bodies.map(([, b]) => b).join("\n");
    for (const a of ATTRIBUTED) {
      if (typeof a !== "string") {
        expect(all, a.why).toMatch(a.re);
        continue;
      }
      expect(all, `링크가 떨어진 인용: ${a}`).toContain(a);
    }
  });

  it("출처로 쓰는 도메인이 오늘 죽은 걸로 확인된 곳이 아니다", () => {
    // 오프라인 테스트라 새로 썩는 건 못 잡는다 — 그건 check_external_links.mjs의 일이다.
    const bodies = [
      ...Object.values(POSTS).map((p) => p.body),
      ...Object.values(GUIDES).map((g) => g.body),
    ].join("\n");
    expect(bodies).not.toContain("kaora.govt.nz");
    expect(bodies).not.toContain("health.govt.nz/your-health/healthy-living");
  });
});

// 2026-08-16에 실제로 터진 것: 랩 글은 "딸이 통곡물빵을 안 먹어서 샌드위치가
// 그대로 돌아온다"고 썼는데, Term 1 루틴 글은 같은 통곡물 샌드위치를 주 2회 싸고
// 장보기 목록에도 통곡물빵이 있었다. 둘 다 1인칭이라 둘 중 하나는 반드시 거짓이다.
// 같은 날 "Wednesday: The Pasta Day" 절이 통째로 지어낸 것으로 확인됐다
// (보온병은 있지만 파스타를 싸 본 적이 없다). 테스트 196개가 전부 통과하고 있었다.
describe("🔴 1인칭 주장이 서로 모순되지 않는다", () => {
  const bodies: Array<[string, string]> = [
    ...Object.entries(POSTS).map(([s, p]) => [`post/${s}`, p.body] as [string, string]),
    ...Object.entries(GUIDES).map(([s, g]) => [`guide/${s}`, g.body] as [string, string]),
  ];
  const excerpts: Array<[string, string]> = Object.entries(POSTS).map(
    ([s, p]) => [`excerpt/${s}`, p.excerpt] as [string, string],
  );
  const all = [...bodies, ...excerpts];

  // 우리가 루틴으로 "싼다"고 말하는 것 ↔ "거부당한다"고 말하면 안 되는 것
  const STAPLES = [
    { food: "wholegrain", packed: /wholegrain (sandwich|bread)/i },
    { food: "sandwich", packed: /\b(half a|full)\s+\w*\s*sandwich/i },
  ];
  const REFUSAL =
    /(won'?t touch|will not touch|refuses|came home (barely )?untouched|barely touched|losing battle|purgatory)/i;

  it("루틴으로 싸는 주식을 다른 글에서 '거부당한다'고 말하지 않는다", () => {
    const packedFoods = STAPLES.filter(({ packed }) =>
      all.some(([, text]) => packed.test(text)),
    ).map((s) => s.food);

    const offenders: string[] = [];
    for (const [where, text] of all) {
      // 거부 표현이 나오는 문장만 좁혀서 본다 (글 전체가 아니라)
      for (const sentence of text.split(/(?<=[.!?])\s+/)) {
        if (!REFUSAL.test(sentence)) continue;
        for (const food of packedFoods) {
          if (new RegExp(`\\b${food}`, "i").test(sentence)) {
            offenders.push(`${where}: "${sentence.trim().slice(0, 110)}"`);
          }
        }
      }
    }
    expect(offenders, `루틴과 모순되는 거부 주장:\n${offenders.join("\n")}`).toEqual([]);
  });

  // ⚠️ 여기에 "루틴 Main이 메뉴 데이터에 있나" 가드를 넣었다가 지웠다.
  // menuData에 Pasta Salad 등 파스타가 3개 있어서, 지어낸 파스타 절을 그대로 통과시킨다.
  // 데이터에 있다는 건 "만들 수 있다"는 뜻이지 "우리가 실제로 쌌다"는 뜻이 아니다.
  // 🔴 날조는 테스트로 못 잡는다 — 1인칭 주장은 운영자만 검증할 수 있다.
});

// 2026-08-17: 본문이 이 목록의 총액을 **$80~100**이라고 적고 있었다.
// 실제로 우리 데이터로 계산하면 Pak'nSave $58.57 / Woolworths $60.13다. $21~41 과다.
// 도시락 1통 $4는 가드가 있었는데 **장보기 총액은 아무도 보지 않았다.**
// 숫자가 틀렸다기보다 "무엇의 총액인가"가 어긋나 있었다 — 목록은 도시락 재료 11종이고
// $80~100은 가정 전체 장보기에 가까운 금액이다.
describe("🔴 일요일 장보기 목록의 총액이 본문 숫자와 맞는다", () => {
  const ROUTINE = POSTS["term-1-first-week-lunchbox-routine-auckland-parent"];

  /** 본문의 장보기 목록을 실제로 파싱한다 — 하드코딩하면 목록이 바뀔 때 안 따라온다. */
  const listItems = (() => {
    const after = ROUTINE.body.split("this week's mailer:")[1] ?? "";
    const block = after.split("\n\n").map((c) => c.trim()).find(Boolean) ?? "";
    return block
      .split("\n")
      .map((l) => l.replace(/^-\s*/, "").trim())
      .filter(Boolean);
  })();

  it("목록을 파싱했고, 본문과 매핑이 정확히 맞는다", () => {
    // 🔴 매핑 없는 줄을 건너뛰면 가드가 알리바이가 된다.
    expect(listItems.length, "장보기 목록을 못 찾았다").toBeGreaterThanOrEqual(10);
    const unmapped = listItems.filter((l) => !(l in SUNDAY_SHOP));
    expect(unmapped, `가격 매핑이 없는 품목:\n${unmapped.join("\n")}`).toEqual([]);
    // 반대쪽도 본다 — 매핑에만 있고 본문엔 없는 줄은 총액을 조용히 부풀린다
    const orphan = Object.keys(SUNDAY_SHOP).filter((k) => !listItems.includes(k));
    expect(orphan, `본문에 없는 매핑:\n${orphan.join("\n")}`).toEqual([]);
  });

  // 🔴 2026-08-24까지 본문에 `NZ$60`이 손으로 적혀 있었고 가드는 55~65 밴드로만 봤다.
  //    Pak'nSave 열을 갱신하니 $54.11이 나왔다 — 그동안 맞았던 건 운이었다.
  //    이제 본문이 파생값을 보간하므로, 가드는 **본문과 계산이 같은지**를 본다.
  it("본문 표기가 계산 결과와 같다 — 손으로 적은 값이 아니다", () => {
    const m = ROUTINE.body.match(/comes to about \*\*([^*]+)\*\*/);
    expect(m, "본문에서 장보기 총액 표기를 못 찾았다").toBeTruthy();
    expect(m![1]).toBe(sundayShopLabel());
    // 보간이 문자 그대로 나가면 여기서 잡힌다
    expect(ROUTINE.body).not.toContain("sundayShopLabel");
  });

  it("반올림 표기가 실제 총액에서 $2.50 넘게 벗어나지 않는다", () => {
    const shown = Number(sundayShopLabel().replace(/[^\d.]/g, ""));
    expect(Math.abs(shown - sundayShopTotal(listItems))).toBeLessThanOrEqual(2.5);
  });

  it("옛 $80~100 표기가 되살아나지 않는다", () => {
    expect(ROUTINE.body).not.toContain("$80");
    expect(ROUTINE.body).not.toContain("80–100");
    expect(ROUTINE.body).not.toContain("80-100");
  });

  it("장보기 총액과 도시락 1통 비용이 서로 모순되지 않는다", () => {
    // 한 아이 5일치가 장보기 총액을 넘으면 둘 중 하나가 틀렸다.
    const perWeekOneChild = 4 * 5; // 본문·가이드가 말하는 중앙값 $4 × 5일
    expect(perWeekOneChild).toBeLessThan(sundayShopTotal(listItems));
  });
});

// 2026-08-17: 자동 가격 갱신이 **수집 전량 실패**한 결과를 커밋·푸시·배포했다.
// 194개 전부 source가 "Est. (Fallback)"이 됐고(이전 187개는 실제 Woolworths 가격),
// 134개가 똑같이 $5였다. 상품 이미지도 171개 → 0개.
// 라이브 플래너가 가짜 가격으로 도시락 비용을 계산하는 상태로 배포돼 있었다.
//
// 🔴 실패가 에러를 내지 않았다 — 폴백으로 "성공"한 척 파일을 채웠다.
// 그래서 개수나 스키마로는 안 잡힌다. **출처와 분포를 봐야 한다.**
describe("🔴 가격 캐시가 실제 수집물이다 (폴백 범벅이 아니다)", () => {
  const cache = PRICES as Record<string, { data?: { price: number; source?: string; image?: string } }>;
  const rows = Object.values(cache).map((v) => v.data ?? (v as never)) as Array<{
    price: number; source?: string; image?: string;
  }>;

  it("폴백 비율이 20%를 넘지 않는다", () => {
    const fallback = rows.filter((r) => /fallback/i.test(r.source ?? "")).length;
    const ratio = fallback / rows.length;
    // 08-17 사고 당시 100%. 정상은 7/194 = 3.6%.
    expect(ratio, `폴백 ${fallback}/${rows.length} — 수집이 실패한 파일일 수 있다`).toBeLessThan(0.2);
  });

  it("실제 마트에서 온 가격이 대부분이다", () => {
    const real = rows.filter((r) => /woolworths|pak/i.test(r.source ?? "")).length;
    expect(real / rows.length).toBeGreaterThan(0.8);
  });

  it("한 가격에 몰려 있지 않다", () => {
    // 수집이 실패하면 폴백 상수 몇 개로 쏠린다. 08-17엔 $5 하나가 134/194였다.
    const c = new Map<number, number>();
    for (const r of rows) c.set(r.price, (c.get(r.price) ?? 0) + 1);
    const top = Math.max(...c.values());
    expect(top / rows.length, `최빈 가격이 ${top}/${rows.length}개를 차지한다`).toBeLessThan(0.25);
  });

  it("상품 이미지가 남아 있다", () => {
    // 실제 수집물에는 마트 이미지 URL이 붙는다. 폴백에는 없다.
    const withImage = rows.filter((r) => r.image).length;
    expect(withImage / rows.length, "이미지가 사라졌다면 수집물이 아니다").toBeGreaterThan(0.5);
  });
});

/**
 * 🔴 2026-08-18: 이 글은 유입 1위인데 **직접 찍은 사진이 0장**이었고, 히어로가
 * 「연어 베이글」이었다(보온가방 리뷰인데). 그리고 Kmart 가격이 **세 자리에서 서로 달랐다** —
 * 본문 절 `$14-$22`, 상품 절 `$14-$22 / 클리어런스 $4-$7`, 소매점 표 `$8-$15`.
 * 운영자가 Kmart Botany에서 매대를 찍어 와 실측으로 통일했다($10-$22).
 *
 * 온라인 목록과 매대는 다르다 — 이 글의 절 제목이 "What's Actually on the Shelf"이므로
 * **매장에서 읽은 값**이 근거다. 그 사실을 가드로 묶는다.
 */
describe("insulated-lunch-bags: 매대 실측 근거", () => {
  const post = POSTS["insulated-lunch-bags-review-nz"];
  const body = post.body;

  it("히어로가 이 글의 주제와 무관한 폴백 이미지가 아니다", () => {
    expect(post.image, "연어 베이글이 히어로로 돌아왔다").not.toContain("smoked_salmon");
    expect(post.image).toContain("kmart");
  });

  it("직접 찍은 사진임을 캡션이 밝힌다", () => {
    expect(post.imageCaption, "캡션이 없다 — 실사진인지 스톡인지 독자가 알 수 없다").toBeTruthy();
    expect(post.imageCaption).toContain("Kmart Botany");
    expect(post.imageCaption).toMatch(/Photographed by the operator/i);
  });

  it("Kmart 가격 범위가 본문 전체에서 하나다", () => {
    // 정정 문단은 **옛 값을 인용**하므로 제외하고 센다.
    const withoutCorrection = body
      .split("\n")
      .filter((l) => !l.includes("A correction to what this article said before"))
      .join("\n");
    for (const stale of ["$14-$22", "$8-$15", "$4.25-$7", "$4-$7"]) {
      expect(withoutCorrection, `옛 Kmart 값 "${stale}"이 정정 문단 밖에 남아 있다`)
        .not.toContain(stale);
    }
    // 실측값은 최소 세 자리(절 본문·상품 절·소매점 표)에 같은 값으로 있어야 한다.
    expect((body.match(/\$10-\$22/g) ?? []).length, "실측 범위가 세 자리에 안 걸려 있다")
      .toBeGreaterThanOrEqual(3);
  });

  it("실측 날짜·매장이 캡션과 본문에서 일치한다", () => {
    expect(body).toContain("Kmart Botany, 18 August 2026");
    expect(post.imageCaption).toContain("18 August 2026");
    expect(post.lastReviewed).toBe("August 2026");
    // lastReviewed는 매장 실측일(8월)에 묶어 두고, contentUpdated는 그 뒤 본문 수정을 따라간다.
    expect((post.contentUpdated ?? "") >= "2026-08-18").toBe(true);
  });

  it("정정을 조용히 지우지 않고 남겨 뒀다", () => {
    expect(body, "틀렸던 값을 조용히 고치면 독자가 무엇이 바뀌었는지 모른다")
      .toContain("A correction to what this article said before");
  });
});

/**
 * 🔴 2026-08-18: **직접 찍은 사진이 몇 장인지 아무 데서도 세지 않고 있었다.**
 *
 * 그날 아침 나는 "이 사이트의 E-E-A-T 최대 약점은 실사진 0장"이라고 쓰고,
 * 그 전제 위에서 하루치 계획을 세웠다. 실제로는 **7월 1일부터 6장이 라이브**였다 —
 * 도시락 2장, Pak'nSave 카트 1장, 영수증 3장. 에셋 폴더를 한 번도 열지 않았다.
 *
 * 왜 grep으로도 안 잡혔나: 주먹밥이 찍힌 사진의 파일명이 `…snacks-fruit.jpg`였고,
 * **alt에도 캡션에도 주먹밥이 없었다.** 과자 링과 살라미는 세면서, 그 사진에서
 * 유일하게 대체 불가능한 것 — 동아시아 가족이 실제로 싸는 주먹밥 — 을 빠뜨렸다.
 * 스크린리더도, 구글도, 나도 그래서 못 봤다.
 *
 * 그러니 이 블록이 지키는 건 사진 자체가 아니라 **사진의 목록이 존재한다는 사실**이다.
 * 다음에 누가 "실사진이 없다"고 말하려면 먼저 이 테스트를 지워야 한다.
 */
describe("🔴 직접 찍은 사진의 인벤토리", () => {
  const REPO = new URL("../", import.meta.url);
  const read = (p: string) => readFileSync(new URL(p, REPO), "utf-8");

  // 실사진은 `real-` 접두사로만 식별한다. 생성 이미지와 섞이면 세는 의미가 없다.
  const realPhotos = readdirSync(new URL("public/assets/", REPO))
    .filter((f) => f.startsWith("real-"))
    .sort();

  // 참조를 찾을 곳. 새 자리가 생기면 여기에 추가한다.
  const SURFACES = [
    "content/posts.ts",
    "content/guides.ts",
    "app/[locale]/planner/page.tsx",
    "app/[locale]/price-index/page.tsx",
    "app/[locale]/page.tsx",
    "app/[locale]/about/page.tsx",
  ];
  const allSurfaces = SURFACES.map(read).join("\n");

  it("실사진이 실제로 존재한다 — 0장이라고 말하기 전에 여기서 걸린다", () => {
    expect(realPhotos.length, "public/assets/real-* 가 하나도 없다").toBeGreaterThanOrEqual(6);
  });

  /**
   * 🔴 2026-08-19: 이 가드에 **눈이 없었다.** `real-` 접두사만 세는데, Kmart 실사진 3장은
   * 접두사 규칙이 생기기 전에 `kiwi_kmart_*`로 이름이 붙어 **인벤토리 밖에 있었다.**
   * 그중 **2장은 아무 데도 안 붙은 고아**였다 — 이 가드가 잡으라고 만든 바로 그 경우인데
   * 이름 때문에 안 보였다. 셋 다 `real-`로 개명했다.
   * **규칙을 나중에 만들면, 규칙 이전의 것들은 규칙 밖에 남는다.**
   *
   * 안 붙인 사진은 **사유와 함께 여기 적는다.** 조용히 통과시키지 않는다 —
   * 목록에 남아야 다음에 붙일 자리를 찾는다.
   */
  const UNPLACED: Record<string, string> = {
    "real-kmart-check-cooler-bags.webp":
      "보온가방 글 히어로는 매대 전경이 이겼다. 본문 중간엔 못 넣는다(markdown이 ![]() 미지원)",
    "real-kmart-drink-bottles.webp":
      "🔴 파일명이 thermos-flasks였는데 실제로는 **물병 매대**다(2026-08-20 가격표 확대 확인: " +
      "METAL WATER BOTTLE ×2, 1L BTL W/HANDLE, INSUL CHROME CYLINDER BTL). " +
      "음식용 wide-mouth 보온병은 한 개도 없어서 보온병 글 히어로로 쓸 수 없다. " +
      "음료 관련 글이 생기면 그때 후보",
  };

  it("실사진은 전부 쓰이거나, 안 쓴 사유가 적혀 있다", () => {
    const unused = realPhotos.filter((f) => !allSurfaces.includes(f));
    const undocumented = unused.filter((f) => !UNPLACED[f]);
    expect(undocumented, "실사진을 만들어 두고 어디에도 안 붙였고 사유도 없다").toEqual([]);
  });

  it("UNPLACED에 적힌 파일이 실제로 존재한다 — 낡은 항목은 목록을 거짓말로 만든다", () => {
    const stale = Object.keys(UNPLACED).filter((f) => !realPhotos.includes(f));
    expect(stale, "UNPLACED에 없는 파일이 적혀 있다").toEqual([]);
  });

  it("UNPLACED는 실제로 안 쓰이는 것만 담는다 — 붙였으면 목록에서 빼야 한다", () => {
    const actuallyUsed = Object.keys(UNPLACED).filter((f) => allSurfaces.includes(f));
    expect(actuallyUsed, "이미 붙였는데 UNPLACED에 남아 있다").toEqual([]);
  });

  // JSX는 텍스트 노드를 줄바꿈으로 쪼갠다 — "by the\n  operator"를 리터럴로 찾으면 못 만난다.
  const near = (f: string) =>
    allSurfaces.slice(allSurfaces.indexOf(f), allSurfaces.indexOf(f) + 1600).replace(/\s+/g, " ");

  const receipts = realPhotos.filter((f) => f.includes("receipt"));
  const scenes = realPhotos.filter((f) => !f.includes("receipt"));

  it("장면 사진은 촬영자 표기를 갖는다 — 스톡과 구별되지 않으면 찍은 의미가 없다", () => {
    expect(scenes.length, "장면 실사진이 하나도 없다").toBeGreaterThanOrEqual(3);
    // 안 붙인 사진은 캡션이 있을 자리 자체가 없다. 붙인 것만 본다.
    for (const f of scenes.filter((x) => allSurfaces.includes(x))) {
      expect(near(f), `${f}: 촬영자 표기(operator)가 근처에 없다`).toMatch(
        /Photographed[^.]*by the operator/i,
      );
    }
  });

  /**
   * 영수증은 "촬영했다"가 아니라 **무엇을 가렸는지**가 신뢰의 근거다.
   * 촬영자 문구를 요구하면 실제 관행과 어긋나므로 마스킹 고지를 본다.
   */
  it("영수증 사진은 매장과 마스킹 범위를 밝힌다", () => {
    expect(receipts.length, "영수증 실사진이 없다").toBeGreaterThanOrEqual(3);
    for (const f of receipts) {
      const n = near(f);
      expect(n, `${f}: 어느 매장인지 밝히지 않았다`).toMatch(/Ormiston/);
      expect(n, `${f}: 무엇을 가렸는지 밝히지 않았다`).toMatch(/masked|cropped/i);
    }
  });

  /**
   * 사진에 **찍혀 있는데 설명에 없는 것**을 잡는다.
   * 08-18 이전의 alt는 이 사진을 "popcorn bites … ring snacks"로만 묘사했다.
   */
  it("🔴 주먹밥이 찍힌 사진은 alt와 캡션이 주먹밥을 말한다", () => {
    const planner = read("app/[locale]/planner/page.tsx");
    const photo = "real-packed-lunchbox-snacks-fruit.jpg";
    expect(planner, "주먹밥 사진이 플래너에서 빠졌다").toContain(photo);

    const block = planner.slice(planner.indexOf(photo), planner.indexOf(photo) + 1400);
    const flat = block.replace(/\s+/g, " ");

    const alt = flat.match(/alt="([^"]+)"/)?.[1] ?? "";
    expect(alt, "alt가 주먹밥을 빠뜨렸다 — 스크린리더가 못 본다").toMatch(
      /onigiri|rice ball/i,
    );

    const caption = flat.slice(flat.indexOf("figcaption"));
    expect(caption, "캡션이 주먹밥을 빠뜨렸다").toMatch(/onigiri|rice ball/i);
    expect(caption, "촬영자 표기가 없다").toMatch(/by the operator/i);
  });

  /**
   * 🔴 `onigiri.jpg`는 **장어 초밥롤**이었다(08-18에 열어보고 알았다).
   * 참조가 0이라 라이브 피해는 없었지만, 이름만 보고 집어 쓰면 그날 바로 사고다.
   * 파일을 지웠으니 되살아나면 실패한다.
   */
  it("이름과 내용이 어긋난 onigiri.jpg가 돌아오지 않았다", () => {
    const assets = readdirSync(new URL("public/assets/", REPO));
    expect(assets, "onigiri.jpg는 주먹밥이 아니라 초밥롤이다").not.toContain("onigiri.jpg");
  });
});

/**
 * 🔴 2026-08-19: 사이트에서 **경쟁자가 복제할 수 없는 유일한 문단**에 드디어 사진이 붙었다.
 *
 * 견과금지 글(평균순위 6.9, 사이트 최고)이 *"the lunches that work best in our own house
 * are already nut-free without trying: onigiri with furikake…"*라고 말하면서
 * 히어로는 **AI 마마이트 샌드위치**였다. 이제 08-19 아침에 실제로 싼 도시락이다.
 *
 * 🔴 캡션이 **과자와 비스킷을 숨기지 않는다.** 도시락엔 콘칩과 비스킷 두 개도 들어 있다.
 *    그걸 빼고 "주먹밥·브로콜리·과일"만 적으면 연출된 도시락이 되고,
 *    이 사이트가 실사진을 쓰는 이유가 통째로 사라진다.
 *    ([[fabricated-first-person-routine]] — 안 하는 일을 "우리 집 루틴"이라 쓴 적이 있다)
 */
describe("🔴 nut-free: 주먹밥 실사진", () => {
  const post = POSTS["nut-free-school-lunches-new-zealand"];

  it("히어로가 이 글의 주장과 무관한 생성 이미지가 아니다", () => {
    expect(post.image, "AI 마마이트 샌드위치로 돌아갔다").not.toContain("marmite");
    expect(post.image).toBe("/assets/real-onigiri-lunchbox.webp");
  });

  it("캡션이 촬영 날짜와 촬영자를 밝힌다", () => {
    expect(post.imageCaption, "캡션이 없다 — 실사진인지 스톡인지 독자가 알 수 없다").toBeTruthy();
    expect(post.imageCaption).toContain("19 August 2026");
    expect(post.imageCaption).toMatch(/Photographed[^.]*by the operator/i);
    expect(post.imageCaption).toMatch(/not a stock image/i);
  });

  it("🔴 캡션이 실제로 담긴 것을 말한다 — 과자를 지우면 연출이 된다", () => {
    const c = post.imageCaption ?? "";
    for (const real of ["onigiri", "furikake", "chips", "biscuits"]) {
      expect(c.toLowerCase(), `캡션이 "${real}"를 빠뜨렸다 — 사진에는 있다`).toContain(real);
    }
  });

  it("본문의 주먹밥 주장과 사진이 같은 것을 가리킨다", () => {
    expect(post.body, "본문에서 onigiri·furikake 문장이 사라졌다면 히어로가 근거를 잃는다")
      .toMatch(/onigiri with furikake/i);
  });

  it("메뉴 카드도 생성 이미지로 돌아가지 않았다", () => {
    const rice = MENUS.find((m) => m.name === "Rice Balls (Onigiri)");
    expect(rice, "Rice Balls (Onigiri) 메뉴가 없다").toBeTruthy();
    expect((rice as MenuItem & { image?: string }).image).toBe("/assets/real-onigiri-lunchbox.webp");
  });
});

describe("🔴 플래너에서 글로 나가는 길", () => {
  const plannerSrc = () =>
    readFileSync(new URL("../components/PlannerClient.tsx", import.meta.url), "utf-8");

  /**
   * 🔴 2026-08-21: 카드가 사이드바의 **실시간** 체크박스를 읽고 있었다. 그래서
   *    (a) 계획을 만든 뒤 체크박스만 건드리면 계획은 그대로인데 카드만 바뀌고,
   *    (b) 24시간 안에 복원된 계획은 필터를 잃어 항상 폴백 카드를 받았다.
   *    카드는 **눈앞의 계획**을 설명해야 한다. 계획 시점의 필터를 따로 들고 간다.
   */
  it("🔴 카드가 라이브 체크박스가 아니라 계획 시점 필터를 읽는다", () => {
    const src = plannerSrc();
    expect(src, "planFilters 상태가 없다").toMatch(/const \[planFilters, setPlanFilters\]/);
    expect(src, "relatedPosts가 라이브 상태를 읽는다").toMatch(/relatedPosts\(planFilters\)/);
    expect(src, "matchedFilters가 라이브 상태를 읽는다").toMatch(/matchedFilters\(planFilters\)/);
    // 라이브 상태를 다시 넘기는 자리가 생기면 실패한다
    expect(src, "relatedPosts에 라이브 필터를 넘기는 자리가 있다")
      .not.toMatch(/relatedPosts\(\{\s*allergies/);
  });

  it("🔴 계획을 저장·복원할 때 필터도 같이 간다 — 안 그러면 복원본이 늘 폴백이다", () => {
    const src = plannerSrc();
    // 🔴 2026-09-10에 `excluded`가 더해졌다 — 옛 저장분 재검증이 「빼고 싶은 재료」도
    //    봐야 하는데, 저장하지 않으면 볼 수가 없다. 네 개를 다 요구한다.
    expect(src, "저장 payload에 filters가 없다").toMatch(/filters:\s*\{\s*allergies,\s*prepStyles,\s*thermosOnly,\s*excluded\s*\}/);
    expect(src, "복원할 때 planFilters를 안 세운다").toMatch(/parsed\.filters\?\.allergies/);
    expect(src, "생성 시점에 planFilters를 안 세운다").toMatch(/setPlanFilters\(\{\s*allergies/);
  });

  const src = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf-8");
  const ROOT = fileURLToPath(new URL("../", import.meta.url));

  /**
   * 주석을 지운 원문. 주석 한 줄이 "쓰고 있다" 가드를 만족시키는 걸 막는다.
   *
   * 🔴 줄 **처음**의 `//`만 지우면 `const links = []; // relatedPosts(filters);` 같은
   *    꼬리 주석이 가드를 그대로 통과시킨다(2026-08-20에 돌연변이로 확인). 그래서
   *    꼬리 주석도 지운다. `https://`만 남긴다 — 따옴표·백틱 뒤에 붙은 `//`는
   *    (`""// relatedPosts(filters)` 같은 자리) 이제 같이 지운다. 과하게 지워도
   *    안전한 자리에만 쓴다 — 여기서 더 지우면 "쓰고 있다" 단언이 헛되이
   *    **실패**할 뿐이다(시끄러운 쪽). 번들 가드는 반대 방향이라 원문을 쓴다.
   */
  const stripComments = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/.*$/gm, "$1");

  /**
   * import 지정자를 전부 뽑는다 — `from "x"`, 부작용 `import "x"`,
   * 동적 `import("x")`, `require("x")`. 따옴표 종류를 안 가린다(이 저장소엔
   * prettier가 없어서 따옴표 스타일은 기계가 강제하지 않는다).
   */
  const SPEC_RE =
    /\bfrom\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']|\brequire\s*\(\s*["']([^"']+)["']|^\s*import\s+["']([^"']+)["']/gm;

  const specifiers = (code: string): string[] => {
    const out: string[] = [];
    for (const m of code.matchAll(SPEC_RE)) out.push(m[1] ?? m[2] ?? m[3] ?? m[4]);
    return out;
  };

  /** `@/x`와 상대경로만 따라간다. 외부 패키지는 글 본문을 담을 수 없다. */
  const resolveSpec = (spec: string, fromFile: string): string | null => {
    let base: string;
    if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
    else if (spec.startsWith("./") || spec.startsWith("../")) base = path.resolve(path.dirname(fromFile), spec);
    else return null;
    for (const ext of ["", ".ts", ".tsx", ".mts", ".js", ".jsx", "/index.ts", "/index.tsx"]) {
      const c = base + ext;
      if (existsSync(c) && statSync(c).isFile()) return c;
    }
    return null;
  };

  const CONTENT_FILE = /^content\/(posts|guides)\.tsx?$/;
  const CONTENT_SPEC = /^(@\/|\.\.?\/)(?:[^"']*\/)?content\/(posts|guides)(\.tsx?)?$/;

  /** 시작 파일에서 import 그래프를 닫힐 때까지 따라간다. */
  const walkImports = (entryRel: string) => {
    const violations: string[] = [];
    const visited: string[] = [];
    const seen = new Set<string>();
    const queue = [path.join(ROOT, entryRel)];
    while (queue.length > 0) {
      const file = queue.pop() as string;
      if (seen.has(file)) continue;
      seen.add(file);
      const rel = path.relative(ROOT, file);
      visited.push(rel);
      if (CONTENT_FILE.test(rel)) continue;
      // 🔴 여기서는 주석을 **안** 지운다. 번들 가드는 "없다"를 단언하는 쪽이라,
      //    과하게 지우면 진짜 import를 조용히 놓친다. 주석 처리된 import가 걸려서
      //    시끄럽게 실패하는 쪽이 낫다.
      for (const spec of specifiers(readFileSync(file, "utf-8"))) {
        const resolved = resolveSpec(spec, file);
        // resolve가 실패해도 지정자 문자열로 한 번 더 본다 — 놓치는 쪽보다 시끄러운 쪽으로.
        const hit = resolved
          ? CONTENT_FILE.test(path.relative(ROOT, resolved))
          : CONTENT_SPEC.test(spec);
        if (hit) violations.push(`${rel} → ${spec}`);
        if (resolved) queue.push(resolved);
      }
    }
    return { violations, visited };
  };

  const LOCALES = ["en", "ko", "zh"] as const;
  const messages = Object.fromEntries(
    LOCALES.map((l) => [
      l,
      JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8")) as Record<string, string>,
    ]),
  );

  it("🔴 플래너가 글로 나가는 링크를 렌더한다 — 0으로 돌아가면 실패한다", () => {
    // 🔴 주석 처리된 import가 가드를 통과시키던 자리다(2026-08-20 리뷰).
    //    ①import는 줄 처음에 고정하고 ②import 철자가 아니라 **호출 자리**를 본다.
    //    호출 자리는 주석을 걷어낸 원문에서 찾는다 — 주석 한 줄로 만족시킬 수 없게.
    const planner = src("components/PlannerClient.tsx");
    const code = stripComments(planner);

    expect(planner, "relatedPosts를 import하지 않는다 (주석은 통과 못 한다)")
      .toMatch(/^import \{[^}]*\brelatedPosts\b[^}]*\} from ["']@\/lib\/relatedPosts["'];?$/m);
    expect(code, "relatedPosts를 호출하지 않는다 — 링크가 다시 0이 된다")
      .toMatch(/\brelatedPosts\(/);
    // 제목이 카드를 배신하지 않도록 판정은 결과로 한다(lib/relatedPosts.test.ts가 동작을 지킨다).
    expect(code, "matchedFilters를 안 쓴다 — 제목을 입력으로 판정하면 거짓말이 된다")
      .toMatch(/\bmatchedFilters\(/);
    // href 철자를 여기서 박지 않는다. 경로 생성은 articleHref의 단위 테스트가 지킨다.
    expect(code, "articleHref로 경로를 만들지 않는다 — 링크 경로가 검증 밖으로 나간다")
      .toMatch(/\barticleHref\(\s*locale/);
  });

  it("문구가 세 로케일에 다 있다", () => {
    for (const l of LOCALES) {
      expect(messages[l].planner_read_next, `${l}: planner_read_next 없음`).toBeTruthy();
      expect(messages[l].planner_read_next_filtered, `${l}: planner_read_next_filtered 없음`).toBeTruthy();
    }
  });

  it("🔴 클라이언트 번들에 글 본문을 넣지 않는다 — posts+guides가 320KB다", () => {
    const planner = src("components/PlannerClient.tsx");
    expect(planner, '"use client" 파일이 아니게 바뀌었다면 이 가드를 다시 볼 것')
      .toMatch(/^"use client"/);

    /**
     * 🔴 파일 하나의 본문만 보는 가드는 **경유 import를 통째로 놓친다**(2026-08-20 리뷰).
     *    lib/relatedPosts.ts가 `@/content/posts`를 import하면 320KB가 그대로 실리는데
     *    PlannerClient.tsx의 본문에는 아무 흔적도 안 남는다. 홑따옴표·상대경로
     *    (`../content/posts`)·`await import(...)`도 옛 정규식은 못 봤다.
     *    그래서 PlannerClient에서 시작해 **import 그래프를 닫힐 때까지 따라간다.**
     */
    const { violations, visited } = walkImports("components/PlannerClient.tsx");

    // 양성 대조: 걷지도 않은 워크가 "위반 0"이라고 하는 알리바이를 막는다.
    expect(visited, "import 그래프를 못 따라갔다 — 0건은 결과가 아니라 증상이다")
      .toContain("lib/relatedPosts.ts");
    expect(visited.length, "그래프가 너무 얕다 — resolve가 죄다 실패하고 있다")
      .toBeGreaterThan(3);

    expect(
      violations,
      `클라이언트 번들이 글 본문에 닿는다:\n${violations.join("\n")}`,
    ).toEqual([]);
  });

  it("🔴 posts와 guides의 slug가 겹치지 않는다 — 겹치면 메타 맵에서 조용히 덮어쓴다", async () => {
    const { BLOG_SLUGS } = await import("@/content/posts");
    const { GUIDE_SLUGS } = await import("@/content/guides");
    const dupes = BLOG_SLUGS.filter((s: string) => GUIDE_SLUGS.includes(s));
    expect(dupes, `겹치는 slug: ${dupes.join(", ")}`).toEqual([]);
  });

  /**
   * 🔴 검사 대상은 **페이지가 실제로 넘기는 객체**여야 한다(2026-08-20 리뷰).
   *
   * 예전엔 여기서 `{...POSTS, ...GUIDES}`를 새로 합쳐 검사했다. 그건 페이지가
   * 넘기는 맵이 아니라 "넘길 수 있었던 맵"이다. 실제로 `ARTICLE_META`를 slug
   * 하나로 좁혀 보니 필터 카드가 전멸하고 폴백 3장 중 2장이 사라지는데도
   * 테스트 302개와 `tsc`가 전부 통과했다. 페이지 쪽은 소스 정규식 세 개만
   * 보고 있었기 때문이다. 이제 export된 진짜 객체를 import해서 본다.
   * (`{...POSTS, ...GUIDES}` 쪽 절반은 lib/relatedPosts.test.ts의 `exists()`와
   *  같은 것을 보고 있었다 — 중복이라 지웠다.)
   */
  it("🔴 서버가 넘기는 메타가 관련글 slug를 전부 덮는다 — 빠지면 카드가 조용히 사라진다", async () => {
    const { FILTER_ARTICLES, FALLBACK } = await import("@/lib/relatedPosts");
    const { ARTICLE_META } = await import("@/app/[locale]/planner/page");
    const slugs = [
      ...Object.values(FILTER_ARTICLES).filter((v) => !("none" in v)).map((v) => (v as { slug: string }).slug),
      ...FALLBACK.map((v) => v.slug),
    ];
    // 양성 대조: slug 목록이 비면 missing이 공허하게 0이 된다 — 0건은 결과가 아니라 증상이다.
    expect(slugs.length, "덮어야 할 slug가 없다 — 매핑·폴백이 통째로 비었나").toBeGreaterThan(3);
    const missing = slugs.filter((s) => !ARTICLE_META[s]);
    expect(missing, `메타에 없는 slug: ${missing.join(", ")}`).toEqual([]);
    // 소스 정규식은 여기 하나만 남긴다 — 데이터 검사로는 볼 수 없는 **배선**이다.
    // (POSTS·GUIDES에서 맵을 만드는지는 이제 실제 객체가 증명한다.)
    const page = src("app/[locale]/planner/page.tsx");
    expect(page, "articleMeta를 안 넘긴다").toMatch(/articleMeta=\{ARTICLE_META\}/);
  });
  /**
   * 🔴 개수 상수를 글 본문에서 쓰려면 `@/lib/menuCounts`여야 한다 (2026-08-20).
   *
   * `lib/siteCounts.ts`는 `POST_COUNT`/`GUIDE_COUNT`를 만들려고 `@/content/posts`·
   * `@/content/guides`를 import한다. 그래서 글 모듈이 `@/lib/siteCounts`를 import하면
   * 순환이 닫힌다. 프로브를 넣고 재어 보니 글 모듈을 먼저 로드하는 **기본 순서**에서
   * 그대로 죽었다:
   *   TypeError: Cannot read properties of undefined (reading 'length')
   *    ❯ lib/siteCounts.ts:46:38  (export const POST_COUNT = BLOG_SLUGS.length)
   * 같은 뿌리로 클라이언트 번들 문제도 생긴다 — siteCounts는 글 본문 320KB에 닿는다.
   *
   * 그래서 메뉴 파생 개수를 `lib/menuCounts.ts`로 갈랐다. 아래 두 가드가
   * **양쪽 방향**을 지킨다. 워커는 새로 짜지 않고 번들 가드의 것을 그대로 쓴다 —
   * 경유 import까지 따라가야 하는 건 여기도 똑같다.
   */
  it("🔴 lib/menuCounts.ts는 글 본문에 닿지 않는다 — 직접도, 경유도", () => {
    const { violations, visited } = walkImports("lib/menuCounts.ts");

    // 양성 대조: 걷지도 않은 워크가 "위반 0"이라고 하는 알리바이를 막는다.
    expect(visited, "import 그래프를 못 따라갔다 — 0건은 결과가 아니라 증상이다")
      .toContain("data/menuDataLoader.ts");

    expect(
      violations,
      `menuCounts가 글 본문에 닿는다 — 순환과 번들이 같이 돌아온다:\n${violations.join("\n")}`,
    ).toEqual([]);
  });

  /**
   * 🔴 `lib/servePrice.ts`도 같은 규칙 아래 있다(2026-08-20 리뷰 F7).
   *
   * 이 모듈은 `content/posts.ts`와 `content/guides.ts`가 **둘 다** import한다. 여기서
   * content에 닿는 순간 `menuCounts`와 똑같은 순환이 닫힌다. 파일 상단에 그 이유가
   * 주석으로만 적혀 있었는데, **주석은 검사 대상이 아니다** — 이 저장소가 오늘 치즈
   * 분량비율에서 정확히 그걸로 당했다. 그래서 menuCounts와 같은 워커로 실제로 걷는다.
   */
  it("🔴 lib/servePrice.ts는 글 본문에 닿지 않는다 — 직접도, 경유도", () => {
    const { violations, visited } = walkImports("lib/servePrice.ts");

    // 양성 대조: 걷지도 않은 워크가 "위반 0"이라고 하는 알리바이를 막는다.
    expect(visited, "import 그래프를 못 따라갔다 — 0건은 결과가 아니라 증상이다")
      .toContain("lib/planConfig.ts");
    expect(visited.length, "그래프가 너무 얕다 — resolve가 죄다 실패하고 있다")
      .toBeGreaterThan(2);

    expect(
      violations,
      `servePrice가 글 본문에 닿는다 — 순환이 닫혀 사이트가 죽는다:\n${violations.join("\n")}`,
    ).toEqual([]);
  });

  it("🔴 content/posts.ts·content/guides.ts가 @/lib/siteCounts를 import하지 않는다", () => {
    const SITE_COUNTS = /^(@\/lib|\.\.?\/(?:[^"']*\/)?lib|\.)\/siteCounts(\.tsx?)?$/;
    const offenders: string[] = [];
    for (const rel of ["content/posts.ts", "content/guides.ts"]) {
      // 주석은 안 지운다 — 이건 "없다"를 단언하는 가드라, 시끄럽게 실패하는 쪽이 낫다.
      for (const spec of specifiers(src(rel))) {
        if (SITE_COUNTS.test(spec)) offenders.push(`${rel} → ${spec}`);
      }
    }
    // 양성 대조: 지정자를 하나도 못 뽑았다면 0건은 결과가 아니라 증상이다.
    expect(specifiers(src("content/posts.ts")).length, "posts.ts에서 import를 못 뽑았다")
      .toBeGreaterThan(0);

    expect(
      offenders,
      `글 모듈이 siteCounts를 import한다 — 순환이 되살아난다. @/lib/menuCounts를 쓸 것:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});

/**
 * 🔴 보온병 글 — 2026-08-20 신설
 *
 * `THERMOS_COUNT`는 export돼 있는데 **소비자가 한 곳도 없었다.** 플래너의
 * `thermosOnly` 토글에도 나가는 글이 없어 `{ none: … }`으로 남아 있었다.
 *
 * 이 글을 쓰면서 원래 계획의 전제가 틀렸다는 것도 드러났다. 계획서는 "보온병 실사진이
 * 이미 있다"고 했지만, 사진의 가격표를 확대해 보니 **물병 매대**였다(METAL WATER
 * BOTTLE ×2, 1L BTL W/HANDLE, INSUL CHROME CYLINDER BTL). 음식용 wide-mouth
 * 보온병은 한 개도 없었다. 그래서 히어로는 생성 이미지이고, **캡션은 달지 않는다** —
 * 촬영 문구는 실사진에만 붙는다.
 */
describe("🔴 보온병 글", () => {
  const SLUG = "thermos-hot-lunches-nz-winter";
  const srcOf = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf-8");

  it("글이 존재하고 생성 이미지를 쓴다", async () => {
    const { POSTS } = await import("@/content/posts");
    const p = POSTS[SLUG];
    expect(p, "보온병 글이 없다").toBeTruthy();
    expect(p.image, "생성 이미지를 쓴다 — 보온병 실사진은 없다").not.toMatch(/\/real-/);
    expect(p.imageCaption ?? "", "생성 이미지에 캡션을 달지 않는다").toBe("");
  });

  /**
   * 🔴 2026-08-20 재작성. 앞 판은 **파일 어딘가에** `${THERMOS_COUNT}`가 있고
   * **본문 어딘가에** "14"가 있으면 통과했다. 둘 다 손으로 적어도 참이다 —
   * 리뷰어가 보간 하나를 리터럴 `14`로 바꿔도 316개가 전부 초록이었다.
   *
   * 그래서 **이 글의 구간만 잘라내고, 보간을 지운 뒤, 맨 숫자를 찾는다.**
   * 보간이 남아 있으면 숫자는 소스에 없으므로, 걸리는 건 손으로 적은 것뿐이다.
   */
  it("🔴 개수를 손으로 적지 않는다", async () => {
    const raw = srcOf("content/posts.ts");
    // 🔴 siteCounts가 아니라 menuCounts다 — siteCounts는 content/posts를 import해서 순환이 된다
    expect(raw, "menuCounts를 import하지 않는다").toMatch(/from "@\/lib\/menuCounts"/);

    const start = raw.indexOf(`"${SLUG}": {`);
    expect(start, "글 구간을 못 찾았다 — 0건은 결과가 아니라 증상이다").toBeGreaterThan(-1);
    const seg = raw.slice(start, raw.indexOf("\n  },", start));
    expect(seg.length, "잘라낸 구간이 비었다").toBeGreaterThan(1000);

    expect(seg, "이 글이 ${THERMOS_COUNT} 보간을 안 쓴다").toContain("${THERMOS_COUNT}");

    const { THERMOS_COUNT } = await import("./menuCounts");
    const prose = seg.replace(/\$\{[^}]*\}/g, "§");
    expect(
      prose.match(new RegExp(`\\b${THERMOS_COUNT}\\b`, "g")) ?? [],
      "본문에 손으로 적은 보온병 개수가 있다 — ${THERMOS_COUNT}를 쓸 것",
    ).toEqual([]);

    // 런타임에서도 실제로 값이 렌더되는지 — 보간이 있어도 값이 안 나오면 소용없다.
    const { POSTS } = await import("@/content/posts");
    expect(POSTS[SLUG].body).toContain(String(THERMOS_COUNT));
  });

  it("🔴 예시로 든 메뉴가 실제로 보온병 메뉴다 — 지어내면 걸린다", async () => {
    const { POSTS } = await import("@/content/posts");
    const body = POSTS[SLUG].body;
    const thermosNames = MENUS.filter((m) => m.is_thermos).map((m) => m.name);
    const mentioned = MENUS.filter((m) => body.includes(m.name)).map((m) => m.name);
    expect(mentioned.length, "메뉴를 하나도 언급하지 않는다").toBeGreaterThan(2);
    for (const n of mentioned) {
      expect(thermosNames, `"${n}"은 보온병 메뉴가 아닌데 이 글에 나온다`).toContain(n);
    }
  });



  /**
   * 🔴 본문은 "All 14 are cook-fresh" · "All 14 are nut-free"라고 단언한다.
   * 오늘 데이터에선 참이지만, **보온병 메뉴가 하나 늘면 조용히 거짓이 된다.**
   * 개수는 `THERMOS_COUNT`가 따라오는데 "전부"라는 말은 따라오지 않는다 —
   * 폴백이 없는 주장이라 화면에도 아무 표시가 안 난다. 양쪽을 같이 묶는다:
   * 문장이 아직 있는지, 그리고 데이터가 아직 그 문장을 지탱하는지.
   */
  it("🔴 '전부 …이다' 주장이 데이터와 같이 늙는다", async () => {
    const { POSTS } = await import("@/content/posts");
    const { THERMOS_COUNT } = await import("./menuCounts");
    const body = POSTS[SLUG].body;
    const thermos = MENUS.filter((m) => m.is_thermos);
    const claims: Array<[string, (m: MenuItem) => boolean]> = [
      [`All ${THERMOS_COUNT} are cook-fresh`, (m) => m.prep_style === "cook-fresh"],
      [`All ${THERMOS_COUNT} are nut-free`, (m) => m.is_nut_free === true],
    ];
    for (const [claim, holds] of claims) {
      // 문장이 사라지면 아래 단언은 아무것도 지키지 않는다 — 먼저 문장의 존재를 본다.
      expect(body, `본문이 "${claim}"을 더 이상 말하지 않는다 — 가드가 헛돈다`).toContain(claim);
      expect(
        thermos.filter((m) => !holds(m)).map((m) => m.name),
        `"${claim}"이 거짓이다`,
      ).toEqual([]);
    }
  });

  it("🔴 매핑에 붙었고, 낡은 사유가 남아 있지 않다", async () => {
    const { FILTER_ARTICLES } = await import("./relatedPosts");
    const e = FILTER_ARTICLES["thermosOnly"];
    expect("none" in e, "글이 생겼는데 사유가 그대로다").toBe(false);
    expect((e as { slug: string }).slug).toBe(SLUG);
  });

  /**
   * 🔴 2026-08-20 재작성. 앞 판은 금지어 목록이었다 — `photograph`·`our own`·
   * `not a stock image` 따위를 안 쓰기만 하면 통과했다. 리뷰어가
   * "Taken in our kitchen on 19 August 2026." · "Shot at home, not stock." ·
   * "A real flask from our bench."를 넣었더니 셋 다 초록이었다. **촬영 주장을
   * 하는 방법은 무한하고 금지어는 유한하다.**
   *
   * 그래서 단어를 세지 않고 규칙 하나로 바꾼다: **생성 이미지에는 캡션 자체를 안 단다.**
   * 이건 이미 실제 관행이다 — 캡션이 달린 4편은 전부 `/assets/real-` 이미지다.
   * 보온병 글만이 아니라 **모든 글**을 본다.
   */
  it("🔴 생성 이미지에는 캡션을 달지 않는다 — 전체 글 대상", async () => {
    const { POSTS } = await import("@/content/posts");
    const entries = Object.entries(POSTS);
    // 양성 대조: 캡션을 쓰는 글이 하나도 없으면 이 가드는 아무것도 안 지킨다.
    expect(
      entries.filter(([, p]) => (p.imageCaption ?? "") !== "").length,
      "캡션을 쓰는 글이 0편이다 — 규칙이 아니라 증상이다",
    ).toBeGreaterThan(0);

    for (const [slug, p] of entries) {
      if (p.image.includes("/real-")) continue;
      expect(p.imageCaption ?? "", `${slug}: 생성 이미지엔 캡션을 달지 않는다`).toBe("");
    }
  });
});

/**
 * 🔴 저장소 전체를 보는 가드 두 개 — 2026-08-20 신설
 *
 * 보온병 글 하나만 지키는 가드는, 같은 실수를 **다른 글에서** 반복하는 걸 못 막는다.
 * 실제로 그랬다:
 *   - 손으로 적은 보온병 개수 `14`가 세 곳에 살아 있었다
 *     (`content/posts.ts` 2곳, `content/guides.ts` 1곳). 전부 초록이었다.
 *   - "Goes in hot, stays hot until lunch"(back-to-school 표)와
 *     "keeps food warm for 4-5 hours"·브랜드별 "Keeps hot for" 표(food-safety 가이드)가
 *     **보온병 글이 "우리는 보온 시간을 재지 않았다"고 쓰는 동안** 라이브였다.
 *
 * 앞으로 글 세 편이 이 글의 패턴으로 더 나온다. 그래서 대상을 글 하나가 아니라
 * `content/*.ts` 전체로 둔다.
 */
describe("🔴 개수·보온시간 주장은 저장소 전체에서 하나의 규칙을 따른다", () => {
  const CONTENT = ["content/posts.ts", "content/guides.ts"] as const;
  const rawOf = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf-8");
  /** 보간을 지운다 — `${THERMOS_COUNT}`가 만든 숫자는 소스에 없으므로 절대 안 걸린다. */
  const deinterpolate = (s: string) => s.replace(/\$\{[^}]*\}/g, "§");

  it("🔴 보온병 개수를 손으로 적은 곳이 한 군데도 없다 — posts·guides 전체", async () => {
    const { THERMOS_COUNT } = await import("./menuCounts");
    // 숫자가 "보온병 개수"를 뜻하는 자리에서만 본다. `$25`·`60°C`·"5 minutes"까지
    // 잡으면 가드가 잔소리가 되고, 잔소리가 된 가드는 결국 꺼진다.
    const CLAIM = /thermos[- ]?friendly|thermos menus|menus are thermos/gi;
    const WINDOW = 70;
    const offenders: string[] = [];

    for (const rel of CONTENT) {
      const src = deinterpolate(rawOf(rel));
      const lines = src.split("\n");
      lines.forEach((line, i) => {
        for (const m of line.matchAll(CLAIM)) {
          const from = Math.max(0, m.index - WINDOW);
          const near = line.slice(from, m.index + m[0].length + WINDOW);
          // 값·단위가 붙은 숫자는 개수가 아니다: $25, 60°C, 5 minutes, 290ml, 70%
          const bare = new RegExp(
            `(?<![$\\w.])${THERMOS_COUNT}(?![\\w.]|\\s*(?:[°º%]|ml\\b|g\\b|min\\b|minutes?\\b|hours?\\b))`,
            "g",
          );
          if (bare.test(near)) offenders.push(`${rel}:${i + 1} → ${line.trim().slice(0, 110)}`);
        }
      });
    }

    // 양성 대조: 주장 자체를 하나도 못 찾았다면 "0건"은 결과가 아니라 증상이다.
    const claimCount = CONTENT.map((r) => deinterpolate(rawOf(r)).match(CLAIM)?.length ?? 0)
      .reduce((a, b) => a + b, 0);
    expect(claimCount, "thermos-friendly 주장을 한 군데도 못 찾았다 — 가드가 헛돈다")
      .toBeGreaterThan(2);

    expect(
      offenders,
      `보온병 개수를 손으로 적었다 — \${THERMOS_COUNT}를 쓸 것:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  /**
   * 🔴 앞 판은 문구 대조였다: `stays/keeps/holds` + `hot` + 숫자 + `hours`가
   * **한 정규식 안에서 이어질 때**만 걸렸다. 리뷰어가 넣은 넷이 전부 통과했다:
   *   - "A good food flask keeps a hot lunch hot for six hours."   (영어 수사)
   *   - "In our kitchen the soup was still steaming 4 hours later." (동사가 다르다)
   *   - "Most food flasks are rated for 6 hours of heat retention." (어순이 다르다)
   *   - "Expect around 5 hours of heat from a filled flask."        (동사가 없다)
   *
   * 그래서 **문구가 아니라 모양**으로 본다: 한 문장에 (열을 붙잡는다는 말)과
   * (지속시간)이 같이 있으면 실패한다. 지속시간은 숫자+시간단위만이 아니라
   * "until lunch"·"all day"·"for hours" 같은 **무기한 종료점**도 포함한다 —
   * 숫자가 없다고 주장이 아닌 게 아니다.
   */
  describe("🔴 재지 않은 보온 시간을 주장하지 않는다 — posts·guides 전체", () => {
    /** 열을 "붙잡는다"는 주장. 조리·예열 시간(“boil for 5 minutes”)은 여기 안 걸린다. */
    const HOLD = [
      /\b(?:keeps?|keeping|stays?|staying|holds?|holding|remains?|retains?|maintains?)\b[^.\n|]{0,45}?\b(?:hot|warm|warmth|heat|piping|above\s*\d+\s*[°º]?C)\b/i,
      /\b(?:still|already)\b[^.\n|]{0,35}?\b(?:hot|warm|steaming|piping)\b/i,
      /\bheat retention\b/i,
      /\b(?:hours?|minutes?)\b[^.\n|]{0,15}\bof (?:heat|warmth)\b/i,
      /\b(?:rated|guaranteed)\b[^.\n|]{0,30}?\b(?:hours?|heat)\b/i,
    ];
    /** 지속시간: 수치가 붙은 것과, 수치 없이 끝점을 약속하는 것 둘 다. */
    const DURATION = [
      /\b(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|several)\b[^.\n|]{0,20}?\b(?:hours?|hrs?|minutes?|mins?)\b/i,
      /\buntil (?:lunch(?:time)?|the bell|midday|home time)\b/i,
      /\ball (?:day|morning|afternoon)\b/i,
      /\bfor hours\b/i,
    ];
    /**
     * 🔴 MPI의 2시간/4시간 문장은 **보온 주장이 아니라 식품안전 규칙**이다.
     * 문자열로 명시해 둔다 — 정규식을 느슨하게 해서 통과시키면, 진짜 주장도 같이 샌다.
     */
    const ALLOWED = [
      "refrigerate or freeze them within two hours of cooking",
      "The two-hour clock runs at the cooking end, not just the eating end.",
      "The 2-hour rule, with a 1-hour heat clause",
      "the two-hour rule as [MPI](",
    ];

    const sentences = (body: string) =>
      body
        .split("\n")
        .flatMap((line) => line.split("|"))
        .flatMap((chunk) => chunk.split(/(?<=[.!?])\s+/))
        .map((x) => x.trim())
        .filter(Boolean);

    it("주장 형태를 실제로 잡는다 — 양성 대조 (이게 없으면 '0건'은 알리바이다)", () => {
      const bait = [
        "A good food flask keeps a hot lunch hot for six hours.",
        "In our kitchen the soup was still steaming 4 hours later.",
        "Most food flasks are rated for 6 hours of heat retention.",
        "Expect around 5 hours of heat from a filled flask.",
        "Goes in hot, stays hot until lunch",
        "A good thermos keeps food warm for 4-5 hours.",
        "hot soup, pasta, or rice stays above 60°C for hours",
      ];
      for (const b of bait) {
        expect(
          HOLD.some((r) => r.test(b)) && DURATION.some((r) => r.test(b)),
          `이 문장을 못 잡는다: ${b}`,
        ).toBe(true);
      }
    });

    it("조리·예열 시간을 보온 주장으로 오판하지 않는다 — 음성 대조", () => {
      const fine = [
        "Pre-heat the thermos by filling it with boiling water for 5 minutes before adding the food.",
        "Warm chicken + cheese melt (toast under grill for 2 min before packing)",
        "Stainless steel insulated bottles keep water cold all day.",
        "Rolled tightly, a wrap holds its shape until lunch and doesn't turn to mush in a warm bag.",
      ];
      for (const f of fine) {
        expect(
          HOLD.some((r) => r.test(f)) && DURATION.some((r) => r.test(f)),
          `멀쩡한 문장을 잡는다: ${f}`,
        ).toBe(false);
      }
    });

    it("🔴 글·가이드 어디에도 보온 시간 주장이 없다", async () => {
      const { POSTS } = await import("@/content/posts");
      const { GUIDES: G } = await import("@/content/guides");
      const bodies: Array<[string, string]> = [
        ...Object.entries(POSTS).map(([s, p]) => [`post/${s}`, p.body] as [string, string]),
        ...Object.entries(G).map(([s, g]) => [`guide/${s}`, g.body] as [string, string]),
      ];
      const offenders: string[] = [];
      for (const [where, body] of bodies) {
        for (const sent of sentences(body)) {
          if (ALLOWED.some((a) => sent.includes(a))) continue;
          if (HOLD.some((r) => r.test(sent)) && DURATION.some((r) => r.test(sent))) {
            offenders.push(`${where}: ${sent.slice(0, 130)}`);
          }
        }
      }
      // 양성 대조: 문장을 하나도 못 쪼갰다면 0건은 결과가 아니라 증상이다.
      expect(
        bodies.flatMap(([, b]) => sentences(b)).length,
        "본문을 문장으로 못 쪼갰다",
      ).toBeGreaterThan(1000);

      expect(
        offenders,
        `재지 않은 보온 시간 주장:\n${offenders.join("\n")}`,
      ).toEqual([]);
    });
  });
});

/**
 * 🔴 Dairy-Free 글 — 2026-08-20 신설
 *
 * 플래너 필터 10개 중 `Dairy Allergy`가 **가장 큰 미대응 필터**였다. 메뉴 94개 중
 * 44개가 이 필터에서 살아남는데도 켜면 폴백 3개가 떴다 — 필터를 켠 사람에게
 * 예산·식품안전·개학 글을 얹고 "선택하신 필터에 맞춰"라고 말하고 있었다는 뜻이다.
 *
 * 가드는 보온병 글에서 그대로 가져오되 **한 가지를 더 본다**: 본문이 약속하는
 * "유제품이 하나도 없다"를 플래그가 아니라 **재료 목록으로** 검산한다.
 * `is_dairy_free`가 잘못 붙은 메뉴는 플래그만 보는 가드로는 영원히 안 걸린다 —
 * 그 메뉴 이름이 본문의 목록에 실려 나가는 동안에도 전부 초록이다.
 * (그래서 "예시 메뉴가 유제품 미포함이다" 가드와 이 가드는 **다른 것을 지킨다.**
 *  앞엣것은 글이 데이터를 배신하는 걸, 뒤엣것은 데이터가 글을 배신하는 걸 잡는다.)
 */
describe("🔴 Dairy-Free 글", () => {
  const SLUG = "dairy-free-school-lunches-nz";
  const srcOf = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf-8");

  it("글이 존재하고 생성 이미지를 쓴다", async () => {
    const { POSTS: P } = await import("@/content/posts");
    const p = P[SLUG];
    expect(p, "Dairy-Free 글이 없다").toBeTruthy();
    expect(p.image, "생성 이미지를 쓴다 — 유제품 관련 실사진은 없다").not.toMatch(/\/real-/);
    // 캡션 규칙 자체는 "생성 이미지에는 캡션을 달지 않는다"(보온병 절)가 전체 글을 본다.
    expect(p.imageCaption ?? "", "생성 이미지에 캡션을 달지 않는다").toBe("");
  });

  /**
   * 🔴 보온병 글에서 배운 형태를 그대로 쓴다. **파일 어딘가에** 보간이 있고
   * **본문 어딘가에** 44가 있으면 통과하는 가드는 손으로 적은 숫자를 그냥 통과시킨다.
   * 이 글의 구간만 잘라내고, 보간을 지운 뒤, 맨 44를 찾는다.
   */
  it("🔴 개수를 손으로 적지 않는다", async () => {
    const raw = srcOf("content/posts.ts");
    // 🔴 siteCounts가 아니라 menuCounts다 — siteCounts는 content/posts를 import해서 순환이 된다
    expect(raw, "menuCounts를 import하지 않는다").toMatch(/from "@\/lib\/menuCounts"/);

    const start = raw.indexOf(`"${SLUG}": {`);
    expect(start, "글 구간을 못 찾았다 — 0건은 결과가 아니라 증상이다").toBeGreaterThan(-1);
    const seg = raw.slice(start, raw.indexOf("\n  },", start));
    expect(seg.length, "잘라낸 구간이 비었다").toBeGreaterThan(1000);

    expect(seg, "이 글이 ${DAIRY_FREE_COUNT} 보간을 안 쓴다").toContain("${DAIRY_FREE_COUNT}");

    const { DAIRY_FREE_COUNT } = await import("./menuCounts");
    const prose = seg.replace(/\$\{[^}]*\}/g, "§");
    expect(
      prose.match(new RegExp(`\\b${DAIRY_FREE_COUNT}\\b`, "g")) ?? [],
      "본문에 손으로 적은 유제품 미포함 개수가 있다 — ${DAIRY_FREE_COUNT}를 쓸 것",
    ).toEqual([]);

    // 런타임에서도 값이 실제로 렌더되는지 — 보간이 있어도 값이 안 나오면 소용없다.
    const { POSTS: P } = await import("@/content/posts");
    expect(P[SLUG].body).toContain(String(DAIRY_FREE_COUNT));
  });

  it("🔴 예시로 든 메뉴가 실제로 유제품 미포함이다 — 지어내면 걸린다", async () => {
    const { POSTS: P } = await import("@/content/posts");
    const body = P[SLUG].body;
    const ok = MENUS.filter((m) => m.is_dairy_free).map((m) => m.name);
    const mentioned = MENUS.filter((m) => body.includes(m.name)).map((m) => m.name);
    expect(mentioned.length, "메뉴를 하나도 언급하지 않는다").toBeGreaterThan(2);
    for (const n of mentioned) {
      expect(ok, `"${n}"은 유제품이 들어 있는데 이 글에 나온다`).toContain(n);
    }
  });

  /**
   * 🔴 이 글의 중심 약속을 **플래그가 아니라 재료로** 검산한다.
   *
   * 본문은 "이 44개는 재료에 milk·cheese·butter·cream·yoghurt가 하나도 없다"고
   * 단언한다. 오늘 데이터에선 참이지만, `is_dairy_free: true`가 잘못 붙은 메뉴가
   * 하나 들어오면 조용히 거짓이 된다 — 그리고 그 메뉴는 본문의 목록에 실려 나간다.
   * 보온병 글의 "All 14 are …" 가드와 같은 형태로, **문장의 존재**와
   * **데이터가 그 문장을 지탱하는지**를 한 테스트에 묶는다.
   */
  it("🔴 '유제품이 하나도 없다'는 문장이 재료 목록과 같이 늙는다", async () => {
    const { POSTS: P } = await import("@/content/posts");
    const { DAIRY_FREE_COUNT } = await import("./menuCounts");

    const DAIRY_WORD =
      /\b(milk|cheese|butter|cream|yoghurt|yogurt|ghee|custard|mozzarella|feta|parmesan|paneer|halloumi|ricotta)\b/i;
    // "Peanut Butter"·"Coconut Milk"·"Plant Milk"은 유제품이 아니다. 이걸 빼지 않으면
    // 가드가 잔소리가 되고, 잔소리가 된 가드는 결국 꺼진다.
    const NOT_DAIRY = /\b(peanut|coconut|plant|soy|almond|oat|cashew|sesame|vegan|dairy-free)\b/i;
    const dairyIngredients = (m: MenuItem) =>
      (m.ingredients ?? []).filter((i) => DAIRY_WORD.test(i) && !NOT_DAIRY.test(i));

    // 양성 대조: 스캐너가 유제품 재료를 한 개도 못 찾으면 아래 "0건"은 알리바이다.
    expect(
      MENUS.filter((m) => dairyIngredients(m).length > 0).length,
      "재료에서 유제품을 한 개도 못 찾았다 — 스캐너가 헛돈다",
    ).toBeGreaterThan(20);

    const claim = `Not one of the ${DAIRY_FREE_COUNT} lists milk, cheese, butter, cream or yoghurt among its ingredients.`;
    // 문장이 사라지면 아래 단언은 아무것도 지키지 않는다 — 먼저 문장의 존재를 본다.
    expect(P[SLUG].body, `본문이 "${claim}"을 더 이상 말하지 않는다 — 가드가 헛돈다`).toContain(
      claim,
    );

    expect(
      MENUS.filter((m) => m.is_dairy_free)
        .filter((m) => dairyIngredients(m).length > 0)
        .map((m) => `${m.name}: ${dairyIngredients(m).join(", ")}`),
      "유제품 미포함으로 표시됐는데 재료에 유제품이 있다",
    ).toEqual([]);
  });

  /**
   * 🔴 "유제품을 빼면 더 비싼가"는 이 글에서 가장 검산하기 쉬운 주장이고,
   * 그래서 손으로 적으면 가장 먼저 낡는다 — 가격 캐시는 주간으로 갱신된다.
   * iron-rich 글에서 배수를 네 번 연속 틀린 것과 같은 자리다. 문장을 통째로 생성한다.
   */
  it("🔴 비용 문장이 가격 캐시에서 생성된다", async () => {
    const { POSTS: P } = await import("@/content/posts");
    const per = (ing: string) => {
      const p = (PRICES as Record<string, { data: { price?: number } }>)[ing]?.data?.price ?? 0;
      return p * (PORTION_FACTORS[ing] ?? DEFAULT_PORTION);
    };
    const cost = (ings: string[]) => ings.reduce((t, i) => t + per(i), 0);
    const med = (xs: number[]) => {
      const a = [...xs].sort((x, y) => x - y);
      const m = Math.floor(a.length / 2);
      return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
    };
    const free = med(MENUS.filter((m) => m.is_dairy_free).map((m) => cost(m.ingredients)));
    const withDairy = med(MENUS.filter((m) => !m.is_dairy_free).map((m) => cost(m.ingredients)));

    // 양성 대조 — 값이 0이면 아래가 전부 "$0.00"끼리 맞아떨어져 조용히 통과한다.
    expect(free, "유제품 미포함 중앙값이 0이다 — 캐시 키가 바뀌었을 수 있다").toBeGreaterThan(0);
    expect(withDairy).toBeGreaterThan(0);

    const money = (n: number) => `$${n.toFixed(2)}`;
    const gap = Math.abs(free - withDairy);
    const gapLabel = gap < 1 ? `${Math.round(gap * 100)}c` : money(gap);
    expect(P[SLUG].body, "중앙값이 캐시와 다르다").toContain(
      `**${money(free)}** against **${money(withDairy)}**`,
    );
    expect(P[SLUG].body, "격차 표기가 두 중앙값과 어긋난다").toContain(`${gapLabel} apart`);
  });

  it("🔴 매핑에 붙었고, 낡은 사유가 남아 있지 않다", async () => {
    const { FILTER_ARTICLES } = await import("./relatedPosts");
    const e = FILTER_ARTICLES["Dairy Allergy"];
    expect("none" in e, "글이 생겼는데 사유가 그대로다").toBe(false);
    expect((e as { slug: string }).slug).toBe(SLUG);
    // 사유 문자열이 주석·다른 파일에 남으면 다음 사람이 그걸 읽고 또 "글이 없다"고 판단한다.
    const related = srcOf("lib/relatedPosts.ts");
    expect(related, "relatedPosts.ts에 낡은 사유가 남아 있다").not.toContain(
      "유제품 미포함 메뉴가 44개로 가장 큰 미대응 필터다",
    );
  });
});

/**
 * 🔴 Gluten-Free 글 — 2026-08-20 신설
 *
 * 플래너 필터 10개 중 `Gluten Allergy`가 남은 알레르기 필터 중 유일한 미대응이었다.
 * 글이 생기면서 `{ none }`으로 남는 건 `no-cook`·`cook-fresh` 둘뿐이다.
 *
 * 가드는 보온병·유제품 글에서 가져오되 **이 주제 고유의 두 가지**를 더 본다:
 *
 * 1. **교차오염.** 다른 필터는 "무엇을 사느냐"지만 글루텐은 "아침에 부엌을 어떻게
 *    썼느냐"다. 이 축이 본문에서 빠지면 글이 다른 알레르기 글의 복사본이 된다.
 * 2. **곡물 대체품 예외.** 유제품 글은 "재료에 유제품이 하나도 없다"를 단언할 수 있었지만,
 *    글루텐 메뉴는 `GF Pasta`·`Gluten-Free Bread`처럼 **곡물 이름을 단 대체품**을 쓴다.
 *    그래서 재료 스캐너에 예외가 필요하고, 예외가 들어가면 스캐너가 헛돌 수 있다 —
 *    양성 대조를 두 방향으로 둔다.
 */
describe("🔴 Gluten-Free 글", () => {
  const SLUG = "gluten-free-school-lunches-nz";
  const srcOf = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf-8");

  it("글이 존재하고 생성 이미지를 쓴다", async () => {
    const { POSTS: P } = await import("@/content/posts");
    const p = P[SLUG];
    expect(p, "Gluten-Free 글이 없다").toBeTruthy();
    expect(p.image, "생성 이미지를 쓴다 — 글루텐 관련 실사진은 없다").not.toMatch(/\/real-/);
    // 캡션 규칙 자체는 "생성 이미지에는 캡션을 달지 않는다"(보온병 절)가 전체 글을 본다.
    expect(p.imageCaption ?? "", "생성 이미지에 캡션을 달지 않는다").toBe("");
  });

  /**
   * 🔴 보온병·유제품 글에서 배운 형태를 그대로 쓴다. **파일 어딘가에** 보간이 있고
   * **본문 어딘가에** 값이 있으면 통과하는 가드는 손으로 적은 숫자를 그냥 통과시킨다.
   * 이 글의 구간만 잘라내고, 보간을 지운 뒤, 맨 숫자를 찾는다.
   *
   * ⚠️ 이 가드는 그날의 `GLUTEN_FREE_COUNT`와 같은 맨 숫자를 전부 잡는다. 2026-08-20에
   *    값이 25에서 **23**으로 내려갔다(`Chicken Satay`·`Date & Oat Slice`의 플래그를 내렸다).
   *    본문이 FSANZ 시행일을 "February 2024"로 쓰는 건 값이 25이던 시절 "25 February 2024"가
   *    걸렸기 때문이고, 일자를 뺀 표기도 참이라 그대로 둔다 — 값이 다시 25가 될 수 있다.
   */
  it("🔴 개수를 손으로 적지 않는다", async () => {
    const raw = srcOf("content/posts.ts");
    // 🔴 siteCounts가 아니라 menuCounts다 — siteCounts는 content/posts를 import해서 순환이 된다
    expect(raw, "menuCounts를 import하지 않는다").toMatch(/from "@\/lib\/menuCounts"/);

    const start = raw.indexOf(`"${SLUG}": {`);
    expect(start, "글 구간을 못 찾았다 — 0건은 결과가 아니라 증상이다").toBeGreaterThan(-1);
    const seg = raw.slice(start, raw.indexOf("\n  },", start));
    expect(seg.length, "잘라낸 구간이 비었다").toBeGreaterThan(1000);

    expect(seg, "이 글이 ${GLUTEN_FREE_COUNT} 보간을 안 쓴다").toContain("${GLUTEN_FREE_COUNT}");

    const { GLUTEN_FREE_COUNT } = await import("./menuCounts");
    const prose = seg.replace(/\$\{[^}]*\}/g, "§");
    expect(
      prose.match(new RegExp(`\\b${GLUTEN_FREE_COUNT}\\b`, "g")) ?? [],
      "본문에 손으로 적은 글루텐 미포함 개수가 있다 — ${GLUTEN_FREE_COUNT}를 쓸 것",
    ).toEqual([]);

    // 런타임에서도 값이 실제로 렌더되는지 — 보간이 있어도 값이 안 나오면 소용없다.
    const { POSTS: P } = await import("@/content/posts");
    expect(P[SLUG].body).toContain(String(GLUTEN_FREE_COUNT));
  });

  /**
   * 🔴 브리프의 원안(`MENUS.filter((m) => body.includes(m.name))`)은 이 글에서 **오탐**을 낸다.
   * 메뉴 이름이 다른 메뉴 이름을 통째로 품고 있기 때문이다:
   *   - "Corn Tortilla Veggie Wrap"(글루텐 미포함) ⊃ "Veggie Wrap"(글루텐 포함)
   *   - "GF Banana Bread"(글루텐 미포함) ⊃ "Banana Bread"(글루텐 포함)
   * 원안대로면 이 글은 **자기 메뉴 두 개를 이름으로 부를 수 없다.** 그래서 긴 이름부터
   * 가려낸 뒤 남는 것만 본다. 가려내기가 가드를 무디게 하지 않는다는 걸 미끼로 확인한다.
   */
  it("🔴 예시로 든 메뉴가 실제로 글루텐 미포함이다 — 지어내면 걸린다", async () => {
    const { POSTS: P } = await import("@/content/posts");
    const ok = MENUS.filter((m) => m.is_gluten_free).map((m) => m.name);
    // 긴 이름부터 지운다 — 짧은 이름이 긴 이름 안에 있어서 딸려 걸리는 걸 막는다.
    const maskGlutenFree = (text: string) =>
      [...ok].sort((a, b) => b.length - a.length).reduce((t, n) => t.split(n).join("§"), text);

    const body = P[SLUG].body;
    const mentioned = MENUS.filter((m) => body.includes(m.name)).map((m) => m.name);
    expect(mentioned.length, "메뉴를 하나도 언급하지 않는다").toBeGreaterThan(2);

    // 양성 대조: 가려내기가 가드를 죽이지 않는다 — 글루텐 든 메뉴를 넣으면 걸려야 한다.
    const bait = MENUS.find((m) => !m.is_gluten_free)!.name;
    expect(
      MENUS.filter((m) => !m.is_gluten_free && maskGlutenFree(`${body}\n${bait}`).includes(m.name))
        .length,
      "미끼를 넣었는데도 0건이다 — 가려내기가 가드를 통째로 껐다",
    ).toBeGreaterThan(0);

    const masked = maskGlutenFree(body);
    expect(
      MENUS.filter((m) => !m.is_gluten_free && masked.includes(m.name)).map((m) => m.name),
      "글루텐이 들어 있는 메뉴가 이 글에 나온다",
    ).toEqual([]);
  });

  /**
   * 🔴 이 글의 축은 재료가 아니라 **교차오염**이다. 다른 알레르기 글과 달리
   * "무엇을 사느냐"만으로는 답이 안 나오는 유일한 필터이고, 그 절이 빠지면
   * 이 글은 유제품 글의 복사본이 된다. 본문에 실제로 남아 있는지 본다.
   */
  it("🔴 교차오염이 각주가 아니라 절이다", async () => {
    const { POSTS: P } = await import("@/content/posts");
    const body = P[SLUG].body;
    expect(body, "교차오염이라는 말 자체가 없다").toMatch(/cross.?contamination/i);

    /**
     * 🔴 앞 판은 본문 전체에서 단어를 찾았고, 그래서 **알리바이였다.**
     * 교차오염 절을 통째로 지우고 돌려 봤더니 7개가 전부 초록이었다 —
     * "What This Article Does Not Have"의 `cross-contamination`, 플래그 경고 인용문의
     * `toaster`·`board`, 도입부의 `board`가 남아서 네 패턴을 전부 만족시켰다.
     * 그래서 **제목이 이 주제인 절을 잘라내고 그 안에서만** 본다.
     */
    const heads = [...body.matchAll(/^## (.+)$/gm)];
    const i = heads.findIndex((h) => /cross.?contamination/i.test(h[1]));
    expect(i, "교차오염이 절 제목이 아니다 — 축이 아니라 각주로 내려갔다").toBeGreaterThan(-1);
    const from = heads[i].index as number;
    const to = i + 1 < heads.length ? (heads[i + 1].index as number) : body.length;
    const section = body.slice(from, to);

    expect(section.length, "교차오염 절이 제목만 남았다").toBeGreaterThan(1200);
    // 말만 있고 실체가 없으면 축이 아니다 — 부엌에서 실제로 벌어지는 자리를 짚는지 본다.
    for (const thing of [/toaster/i, /board/i, /utensils?/i, /crumb/i]) {
      expect(section, `교차오염 절이 ${thing}를 짚지 않는다`).toMatch(thing);
    }

    /**
     * 🔴 여기까지는 **알리바이였다.** 2026-08-20 리뷰가 이 절을 1,648자짜리 무내용
     * 채움글로 통째로 갈아치우면서 제목과 네 단어만 남겼더니 169개가 전부 초록이었다.
     * 길이와 키워드는 흉내낼 수 있다 — 흉내낼 수 없는 건 **출처와 인용문**이다.
     * (좁은 정규식 가드는 알리바이가 된다: 돌연변이로 발화를 확인할 것.)
     */
    expect(section, "교차오염 절이 Coeliac NZ 출처 링크를 잃었다").toContain(
      "coeliac.org.nz/tackling-cross-contamination",
    );

    // Coeliac NZ 페이지에서 그대로 옮긴 문장들. 절이 갈리면 이것들이 가장 먼저 사라진다.
    const QUOTES = [
      '"Keep all utensils and cutlery separate during the preparation and cooking of gluten-free food."',
      '"Always use clean surfaces and pots, and pans to cook gluten-free food."',
      '"Use a clean grill, pan, or toaster bag (these can be purchased from Coeliac New Zealand), when you are making gluten-free toast."',
      '"Avoid frying gluten-free food in the same oil as food that contains gluten."',
      '"When cooking gluten-free pasta, do not use the same water as pasta containing gluten."',
      '"Make sure separate tongs are used on your food."',
    ];
    const present = QUOTES.filter((q) => section.includes(q));
    expect(
      present.length,
      `교차오염 절에 Coeliac NZ 인용문이 ${present.length}개뿐이다 — 절이 갈렸다`,
    ).toBeGreaterThanOrEqual(4);

    // 이름 붙인 세 자리. 인용문만 남기고 우리 관찰을 지우는 것도 갈아치우기다.
    for (const point of ["**The toaster.**", "**The board and the knife.**", "**The jar.**"]) {
      expect(section, `교차오염 절이 ${point}를 잃었다`).toContain(point);
    }
  });

  /**
   * 🔴 F3 — 귀리 문장과 그 문장이 부르는 목록이 **한 몸으로** 나타나고 사라진다.
   *
   * 앞 판은 본문에 `**${glutenFreeOatMenus()}** is built on oats`를 박아 뒀다.
   * `Date & Oat Slice`의 `is_gluten_free`를 내리자 목록이 비어 라이브 문장이
   * **"And **** is built on oats."**가 됐는데, 그때 깨진 테스트는 전부 손으로 적은
   * 개수뿐이었다 — 숫자만 고치면 깨진 문장이 그대로 나간다.
   *
   * 그래서 유제품·무조리 글의 주장 가드와 같은 계약을 쓴다: **데이터에서 문장을 만들어
   * 본문과 대조한다.** 귀리 메뉴가 있으면 이름을 부르는 쪽이, 없으면 "없다"고 말하는
   * 쪽이 정확히 하나만 본문에 있어야 한다.
   */
  it("🔴 귀리 문장이 데이터와 한 몸으로 나타나고 사라진다", async () => {
    const { POSTS: P } = await import("@/content/posts");
    const body = P[SLUG].body;

    const OAT = /\boats?\b/i;
    const hasOats = (m: MenuItem) => (m.ingredients ?? []).some((i) => OAT.test(i));

    // 양성 대조: 스캐너가 귀리를 아예 못 찾으면 아래 분기는 결과가 아니라 증상이다.
    expect(
      MENUS.filter(hasOats).map((m) => m.name),
      "재료에서 귀리를 한 개도 못 찾았다 — 스캐너가 헛돈다",
    ).not.toEqual([]);

    // 본문이 문장을 손으로 적지 않고 헬퍼로 만든다 — 두 갈래를 사람이 고르면 갈라진다.
    const raw = srcOf("content/posts.ts");
    const start = raw.indexOf(`"${SLUG}": {`);
    const seg = raw.slice(start, raw.indexOf("\n  },", start));
    expect(seg, "귀리 문장을 손으로 적었다 — ${glutenFreeOatSentence()}를 쓸 것").toContain(
      "${glutenFreeOatSentence()}",
    );

    // 어느 갈래든 이 정의는 본문에 남아 있어야 한다 — 귀리를 뺀 근거가 이 문장이다.
    expect(body, "Coeliac NZ의 식단 정의 인용이 사라졌다").toContain(
      '"the removal of wheat, barley, oats and rye from a person\'s diet"',
    );

    const oatMenus = MENUS.filter((m) => m.is_gluten_free && hasOats(m)).map((m) => m.name);
    const NAMED = /\*\*[^*]*\*\* is built on oats/;
    const NONE = "No menu behind the **Gluten Allergy** filter is built on oats.";

    if (oatMenus.length > 0) {
      expect(body, "귀리가 든 글루텐 미포함 메뉴가 있는데 이름을 안 부른다").toContain(
        `**${oatMenus.join(", ")}** is built on oats`,
      );
      expect(body, '귀리 메뉴가 있는데 본문은 "하나도 없다"고 말한다').not.toContain(NONE);
    } else {
      expect(body, '귀리 메뉴가 없는데 본문이 그렇게 말하지 않는다').toContain(NONE);
      // 빈 보간(`**** is built on oats`)도 이 정규식에 걸린다 — 그게 이 가드의 요점이다.
      expect(body, "귀리 메뉴가 0개인데 이름을 부르는 문장이 남아 있다 — 빈 굵은글씨다").not.toMatch(
        NAMED,
      );
    }

    // 어느 갈래에서도 빈 굵은글씨는 본문에 없다.
    expect(body, "본문에 빈 굵은글씨가 있다 — 보간이 빈 문자열을 돌려줬다").not.toMatch(/\*\*\*\*/);
  });

  /**
   * 🔴 이 글의 중심 약속을 **플래그가 아니라 재료로** 검산한다.
   *
   * 본문은 "이 메뉴들은 재료에 밀·보리·호밀도, 보통의 빵·파스타·밀가루·귀리·크래커도
   * 없다"고 단언한다. 오늘 데이터에선 참이지만, `is_gluten_free: true`가 잘못 붙은
   * 메뉴가 하나 들어오면 조용히 거짓이 된다 — 그리고 그 메뉴는 본문 목록에 실려 나간다.
   *
   * ⚠️ 유제품 글과 다른 점: 글루텐 메뉴는 `GF Pasta`처럼 **곡물 이름을 단 대체품**을
   *    실제로 쓴다. 예외를 안 두면 가드가 잔소리가 되고, 예외가 너무 넓으면 가드가
   *    아무것도 안 지킨다. 그래서 양성 대조를 **두 방향**으로 둔다.
   */
  it("🔴 '곡물이 하나도 없다'는 문장이 재료 목록과 같이 늙는다", async () => {
    const { POSTS: P } = await import("@/content/posts");
    const { GLUTEN_FREE_COUNT } = await import("./menuCounts");

    // content/posts.ts의 GRAIN_WORD·GRAIN_SUBSTITUTE와 같은 것을 반대편에서 든다.
    const GRAIN_WORD =
      /\b(wheat|barley|rye|bread|pasta|spaghetti|macaroni|noodles?|flour|couscous|semolina|oats?|crackers?|buns?|bagel|pita|croissant|scone|panini|muesli|pastry|pie|biscuits?|breadcrumbs?|tortilla|wrap)\b/i;
    const GRAIN_SUBSTITUTE = /\b(GF|gluten[- ]?free|rice|corn|maize|quinoa|buckwheat|potato)\b/i;
    const glutenIngredients = (m: MenuItem) =>
      (m.ingredients ?? []).filter((i) => GRAIN_WORD.test(i) && !GRAIN_SUBSTITUTE.test(i));

    // 양성 대조 ①: 스캐너가 곡물 재료를 한 개도 못 찾으면 아래 "0건"은 알리바이다.
    expect(
      MENUS.filter((m) => glutenIngredients(m).length > 0).length,
      "재료에서 곡물을 한 개도 못 찾았다 — 스캐너가 헛돈다",
    ).toBeGreaterThan(20);

    // 양성 대조 ②: 예외가 너무 넓으면 대체품까지 통째로 사라진다. 대체품은 실재해야 한다.
    expect(
      MENUS.filter((m) => m.is_gluten_free)
        .flatMap((m) => m.ingredients ?? [])
        .filter((i) => GRAIN_WORD.test(i)),
      "글루텐 미포함 메뉴에 곡물 대체품이 하나도 없다 — 예외가 전부를 삼켰다",
    ).not.toEqual([]);

    const claim = `**Not one of the ${GLUTEN_FREE_COUNT} lists wheat, barley or rye — or ordinary bread, pasta, flour, oats, crackers or wraps — among its ingredients.**`;
    // 문장이 사라지면 아래 단언은 아무것도 지키지 않는다 — 먼저 문장의 존재를 본다.
    expect(P[SLUG].body, `본문이 "${claim}"을 더 이상 말하지 않는다 — 가드가 헛돈다`).toContain(
      claim,
    );

    expect(
      MENUS.filter((m) => m.is_gluten_free)
        .filter((m) => glutenIngredients(m).length > 0)
        .map((m) => `${m.name}: ${glutenIngredients(m).join(", ")}`),
      "글루텐 미포함으로 표시됐는데 재료에 곡물이 있다",
    ).toEqual([]);
  });

  /**
   * 🔴 "대체품이 얼마나 비싼가"는 이 글에서 가장 검산하기 쉬운 주장이고, 그래서
   * 손으로 적으면 가장 먼저 낡는다 — 가격 캐시는 주간으로 갱신된다. iron-rich 글이
   * 같은 자리에서 배수를 네 번 연속 틀렸다. 표와 문장을 **같은 값에서** 만든다.
   */
  it("🔴 대체품 가격표가 가격 캐시에서 생성된다", async () => {
    const { POSTS: P } = await import("@/content/posts");
    const cache = PRICES as Record<string, { data?: { price?: number } }>;
    const price = (k: string) => cache[k]?.data?.price ?? 0;
    const money = (n: number) => `$${n.toFixed(2)}`;
    const PAIRS: Array<[string, string, string]> = [
      ["Sandwich loaf", "Bread", "Gluten-Free Bread"],
      ["Dry pasta", "Pasta", "GF Pasta"],
      ["Plain flour", "Flour", "Gluten-Free Flour"],
      ["Crackers", "Crackers", "GF Crackers"],
    ];

    const rows = PAIRS.map(([label, a, b]) => ({
      label,
      ordinary: price(a),
      free: price(b),
      ratio: price(b) / price(a),
    }));
    // 양성 대조 — 값이 0이면 아래가 "$0.00"끼리 맞아떨어져 조용히 통과한다.
    for (const r of rows) {
      expect(r.ordinary, `${r.label}: 일반 제품 가격이 0이다 — 캐시 키가 바뀌었나`).toBeGreaterThan(0);
      expect(r.free, `${r.label}: 글루텐프리 제품 가격이 0이다 — 캐시 키가 바뀌었나`).toBeGreaterThan(0);
    }

    const body = P[SLUG].body;
    for (const r of rows) {
      expect(body, `${r.label} 행이 캐시와 다르다`).toContain(
        `| ${r.label} | ${money(r.ordinary)} | ${money(r.free)} |`,
      );
    }

    const worst = [...rows].sort((a, b) => b.ratio - a.ratio)[0];
    expect(body, "가장 비싼 짝의 문장이 표와 어긋난다").toContain(
      `${worst.label.toLowerCase()} — ${money(worst.free)} against ${money(worst.ordinary)}, **${worst.ratio.toFixed(1)}× the price**`,
    );
  });

  it("🔴 매핑에 붙었고, 낡은 사유가 남아 있지 않다", async () => {
    const { FILTER_ARTICLES } = await import("./relatedPosts");
    const e = FILTER_ARTICLES["Gluten Allergy"];
    expect("none" in e, "글이 생겼는데 사유가 그대로다").toBe(false);
    expect((e as { slug: string }).slug).toBe(SLUG);
    // 사유 문자열이 주석·다른 파일에 남으면 다음 사람이 그걸 읽고 또 "글이 없다"고 판단한다.
    const related = srcOf("lib/relatedPosts.ts");
    expect(related, "relatedPosts.ts에 낡은 사유가 남아 있다").not.toContain(
      "아직 글이 없다 — 글루텐프리 메뉴",
    );
  });
});

/**
 * 🔴 No-Cook 글 — 2026-08-20 신설
 *
 * 이 글로 플래너 필터 10개 중 9개에 짝이 생기고, `{ none }`으로 남는 건
 * `cook-fresh` 하나 — **안 쓰기로 결정한 글** 하나뿐이 된다.
 *
 * 가드는 보온병·유제품·글루텐 글에서 가져오되 **이 주제 고유의 두 가지**를 더 본다:
 *
 * 1. **"불을 안 쓴다 ≠ 차게 안 해도 된다".** 이 글을 쓰다가 식품안전 글이 무조리 메뉴를
 *    "shelf-stable or only mildly perishable"이라고 설명하고 있는 걸 발견했다. 실제 재료를
 *    세어 보면 무조리 메뉴의 3분의 2가 햄·닭·참치·마요·치즈·요구르트를 들고 있다 —
 *    같은 글이 몇 줄 위에서 "가장 위험한 군"으로 분류한 바로 그 음식이다. 문구를 고쳤고,
 *    **두 글이 같은 사실을 말하는지**를 아래에서 같이 본다. 한쪽만 고치는 게 이 저장소의
 *    반복 실패다(같은 일을 하는 자리가 둘이면 하나만 고치게 된다).
 * 2. **각주가 아니라 절.** 글루텐 글의 교차오염 가드와 같은 이유로, 이 축이 본문에
 *    남아 있는지를 **제목이 그 주제인 절 안에서만** 본다. 본문 어딘가에서 단어를 찾는
 *    가드는 절을 통째로 지워도 초록이다.
 */
describe("🔴 No-Cook 글", () => {
  const SLUG = "no-cook-lunchbox-ideas-nz";
  const srcOf = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf-8");

  it("글이 존재하고 생성 이미지를 쓴다", async () => {
    const { POSTS: P } = await import("@/content/posts");
    const p = P[SLUG];
    expect(p, "No-Cook 글이 없다").toBeTruthy();
    expect(p.image, "생성 이미지를 쓴다 — 무조리 관련 실사진은 없다").not.toMatch(/\/real-/);
    // 캡션 규칙 자체는 "생성 이미지에는 캡션을 달지 않는다"(보온병 절)가 전체 글을 본다.
    expect(p.imageCaption ?? "", "생성 이미지에 캡션을 달지 않는다").toBe("");
  });

  /**
   * 🔴 앞선 세 글에서 배운 형태를 그대로 쓴다. **파일 어딘가에** 보간이 있고
   * **본문 어딘가에** 값이 있으면 통과하는 가드는 손으로 적은 숫자를 그냥 통과시킨다.
   * 이 글의 구간만 잘라내고, 보간을 지운 뒤, 맨 숫자를 찾는다.
   */
  it("🔴 개수를 손으로 적지 않는다", async () => {
    const raw = srcOf("content/posts.ts");
    // 🔴 siteCounts가 아니라 menuCounts다 — siteCounts는 content/posts를 import해서 순환이 된다
    expect(raw, "menuCounts를 import하지 않는다").toMatch(/from "@\/lib\/menuCounts"/);

    const start = raw.indexOf(`"${SLUG}": {`);
    expect(start, "글 구간을 못 찾았다 — 0건은 결과가 아니라 증상이다").toBeGreaterThan(-1);
    const seg = raw.slice(start, raw.indexOf("\n  },", start));
    expect(seg.length, "잘라낸 구간이 비었다").toBeGreaterThan(1000);

    expect(seg, "이 글이 ${NO_COOK_COUNT} 보간을 안 쓴다").toContain("${NO_COOK_COUNT}");

    const { NO_COOK_COUNT } = await import("./menuCounts");
    const prose = seg.replace(/\$\{[^}]*\}/g, "§");
    expect(
      prose.match(new RegExp(`\\b${NO_COOK_COUNT}\\b`, "g")) ?? [],
      "본문에 손으로 적은 무조리 개수가 있다 — ${NO_COOK_COUNT}를 쓸 것",
    ).toEqual([]);

    // 런타임에서도 값이 실제로 렌더되는지 — 보간이 있어도 값이 안 나오면 소용없다.
    const { POSTS: P } = await import("@/content/posts");
    expect(P[SLUG].body).toContain(String(NO_COOK_COUNT));
  });

  /**
   * 🔴 글루텐 글에서 배운 것: 메뉴 이름은 서로를 통째로 품는다.
   *   - "Corn Tortilla Veggie Wrap"(무조리) ⊃ "Veggie Wrap"(무조리)
   * 오늘은 무조리 이름 안에 들어 있는 **조리 필요** 메뉴가 없지만, 그건 오늘의 데이터일
   * 뿐이다. 긴 이름부터 가려낸 뒤 남는 것만 보고, 가려내기가 가드를 무디게 하지 않는다는
   * 걸 미끼로 확인한다 — 미끼 없이 "0건"이면 그건 결과가 아니라 증상이다.
   */
  it("🔴 예시로 든 메뉴가 실제로 무조리다 — 지어내면 걸린다", async () => {
    const { POSTS: P } = await import("@/content/posts");
    const ok = MENUS.filter((m) => m.prep_style === "no-cook").map((m) => m.name);
    const maskNoCook = (text: string) =>
      [...ok].sort((a, b) => b.length - a.length).reduce((t, n) => t.split(n).join("§"), text);

    const body = P[SLUG].body;
    const mentioned = MENUS.filter((m) => body.includes(m.name)).map((m) => m.name);
    expect(mentioned.length, "메뉴를 하나도 언급하지 않는다").toBeGreaterThan(2);

    // 양성 대조: 가려내기가 가드를 죽이지 않는다 — 조리가 필요한 메뉴를 넣으면 걸려야 한다.
    const bait = MENUS.find((m) => m.prep_style !== "no-cook")!.name;
    expect(
      MENUS.filter((m) => m.prep_style !== "no-cook" && maskNoCook(`${body}\n${bait}`).includes(m.name))
        .length,
      "미끼를 넣었는데도 0건이다 — 가려내기가 가드를 통째로 껐다",
    ).toBeGreaterThan(0);

    const masked = maskNoCook(body);
    expect(
      MENUS.filter((m) => m.prep_style !== "no-cook" && masked.includes(m.name)).map((m) => m.name),
      "조리가 필요한 메뉴가 무조리 글에 나온다",
    ).toEqual([]);
  });

  /**
   * 🔴 이 글의 중심 문장을 **플래그가 아니라 재료로** 검산한다.
   *
   * 본문은 "무조리 메뉴 N개가 고기·생선·마요·치즈·요구르트를 재료로 갖고 있다"고 단언하고,
   * 글 전체가 그 사실 위에 서 있다("불을 안 쓴다고 아이스팩이 필요 없어지는 게 아니다").
   * 재료가 바뀌면 N도 바뀌어야 하고, **문장이 사라지면 이 가드는 아무것도 안 지킨다** —
   * 그래서 문장의 존재와 데이터를 한 테스트에 묶는다.
   *
   * 그리고 **같은 사실을 말하는 자리가 둘**이다: 식품안전 글도 같은 문단을 갖고 있다.
   * 이 저장소가 가장 자주 밟는 함정이 "같은 일을 하는 자리가 둘 이상인데 하나만 고치는
   * 것"이라, 두 글을 한 테스트에서 같이 본다.
   */
  it("🔴 '무조리라도 냉장이 필요하다'는 문장이 재료 목록과 같이 늙는다", async () => {
    const { POSTS: P } = await import("@/content/posts");
    const { NO_COOK_COUNT } = await import("./menuCounts");

    // content/posts.ts의 CHILL_WORD·CHILL_EXCEPTION과 같은 것을 반대편에서 든다.
    const CHILL_WORD =
      /\b(ham|chicken|turkey|beef|salami|pork|bacon|tuna|salmon|fish|prawns?|mayo|mayonnaise|cheese|yoghurt|yogurt|cream|feta|mozzarella)\b/i;
    const CHILL_EXCEPTION = /\b(peanut|vegan|plant|coconut|soy|almond|cashew|sesame)\b/i;
    const chill = (m: MenuItem) =>
      (m.ingredients ?? []).filter((i) => CHILL_WORD.test(i) && !CHILL_EXCEPTION.test(i));

    // 양성 대조 ①: 스캐너가 냉장 의존 재료를 한 개도 못 찾으면 아래 숫자는 알리바이다.
    expect(
      MENUS.filter((m) => chill(m).length > 0).length,
      "재료에서 고기·생선·유제품을 한 개도 못 찾았다 — 스캐너가 헛돈다",
    ).toBeGreaterThan(20);

    // 양성 대조 ②: 예외가 너무 넓으면 Peanut Butter·Vegan Mayo 말고도 전부 삼킨다.
    //   예외에 걸리는 재료가 실재해야 하고, 그것들이 무조리 목록에 남아 있어야 한다.
    expect(
      MENUS.filter((m) => m.prep_style === "no-cook")
        .flatMap((m) => m.ingredients ?? [])
        .filter((i) => CHILL_WORD.test(i) && CHILL_EXCEPTION.test(i)),
      "예외가 하나도 안 걸린다 — 예외 목록이 죽었거나 데이터가 바뀌었다",
    ).not.toEqual([]);

    const noCook = MENUS.filter((m) => m.prep_style === "no-cook");
    const withChill = noCook.filter((m) => chill(m).length > 0).length;
    const without = noCook.length - withChill;

    const body = P[SLUG].body;
    const claim = `**${withChill} of the ${NO_COOK_COUNT} no-cook menus list meat, fish, mayonnaise, cheese or yoghurt among their ingredients.**`;
    expect(body, `본문이 "${claim}"을 더 이상 말하지 않는다 — 가드가 헛돈다`).toContain(claim);
    expect(body, "냉장 의존이 아닌 메뉴 개수가 데이터와 어긋난다").toContain(
      `The ${without} menus that carry none of`,
    );

    /**
     * 🔴 식품안전 글도 같은 사실을 말한다. 2026-08-20 이전에는 같은 자리에서
     *    "shelf-stable or only mildly perishable"이라고 **반대로** 말하고 있었다.
     *    "most"라고 쓰려면 데이터에서 실제로 과반이어야 한다.
     */
    const safety = P["lunchbox-food-safety-nz-term-1-heat"].body;
    expect(safety, "식품안전 글이 옛 문구로 돌아갔다").not.toContain(
      "shelf-stable or only mildly perishable",
    );
    expect(safety, "식품안전 글이 무조리≠냉장불필요를 더 이상 말하지 않는다").toContain(
      "**most of the no-cook menus are built on**",
    );

    /**
     * 🔴 F4 — **자리가 둘이 아니라 셋이었다.** 글만 고치고 가이드를 놔뒀더니,
     *    `lunchbox-food-safety-guide-nz`가 같은 28개를 "assembled cold and packed cold,
     *    never passing through the danger zone at home at all"이라 설명하고 표에서
     *    **"Lowest risk"**로 매기고 있었다. 이 가드가 `POSTS[...]`만 봐서 가이드는
     *    바깥에 있었다. 이제 같이 본다.
     */
    const guide = GUIDES["lunchbox-food-safety-guide-nz"].body;
    expect(guide, "가이드가 옛 문구로 돌아갔다 — 무조리를 위험 없는 것으로 설명한다").not.toContain(
      "never passing through the danger zone at home at all",
    );
    expect(guide, "가이드 표가 무조리를 다시 '가장 낮은 위험'으로 매긴다").not.toContain(
      "Lowest risk",
    );
    expect(guide, "가이드가 무조리≠냉장불필요를 말하지 않는다").toContain(
      "**most of the no-cook menus are built on**",
    );
    expect(guide, "가이드가 무조리 글로 넘기지 않는다").toContain(
      "/en/blog/no-cook-lunchbox-ideas-nz",
    );

    expect(
      withChill * 2 > noCook.length,
      `"most"라고 썼는데 데이터는 ${withChill}/${noCook.length}다 — 세 자리의 문구를 같이 고칠 것`,
    ).toBe(true);
  });

  /**
   * 🔴 "무조리라도 차게 보내야 한다"가 이 글의 축이다. 그 절이 빠지면 이 글은
   * 그냥 샌드위치 목록이 되고, 필터 이름을 안전 주장으로 오해하게 두는 글이 된다.
   * 글루텐 글의 교차오염 가드와 같은 이유로 **제목이 이 주제인 절 안에서만** 본다.
   */
  it("🔴 '무조리 ≠ 냉장 불필요'가 각주가 아니라 절이다", async () => {
    const { POSTS: P } = await import("@/content/posts");
    const body = P[SLUG].body;

    const heads = [...body.matchAll(/^## (.+)$/gm)];
    const i = heads.findIndex((h) => /chill/i.test(h[1]));
    expect(i, "냉장이 절 제목이 아니다 — 축이 아니라 각주로 내려갔다").toBeGreaterThan(-1);
    const from = heads[i].index as number;
    const to = i + 1 < heads.length ? (heads[i + 1].index as number) : body.length;
    const section = body.slice(from, to);

    expect(section.length, "냉장 절이 제목만 남았다").toBeGreaterThan(1200);
    // 온도 수치는 식품안전 글이 든다 — 여기서는 **그 글로 넘긴다**는 사실을 지킨다.
    expect(section, "식품안전 글로 넘기지 않는다 — 수치를 여기서 다시 쓰게 된다").toContain(
      "/en/blog/lunchbox-food-safety-nz-term-1-heat",
    );
    // 말만 있고 실체가 없으면 축이 아니다 — 조리 단계가 없어서 달라지는 지점을 짚는지 본다.
    for (const thing of [/ready-to-eat/i, /chopping board/i, /cross-contaminat/i]) {
      expect(section, `냉장 절이 ${thing}를 짚지 않는다`).toMatch(thing);
    }

    /**
     * 🔴 온도 수치를 여기서 다시 적지 않기로 했다. 적으면 식품안전 글과 갈라진다 —
     *    이 사이트가 다섯 번 거절당한 사유가 "문구끼리의 모순"이었다.
     */
    expect(body, "온도 수치가 이 글에 들어왔다 — 식품안전 글이 든다").not.toMatch(
      /\d+\s*°C\s*(and|to|–|-)\s*\d+\s*°C/,
    );
  });

  it("🔴 매핑에 붙었고, 낡은 사유가 남아 있지 않다", async () => {
    const { FILTER_ARTICLES } = await import("./relatedPosts");
    const e = FILTER_ARTICLES["no-cook"];
    expect("none" in e, "글이 생겼는데 사유가 그대로다").toBe(false);
    expect((e as { slug: string }).slug).toBe(SLUG);
    // 사유 문자열이 주석·다른 파일에 남으면 다음 사람이 그걸 읽고 또 "글이 없다"고 판단한다.
    const related = srcOf("lib/relatedPosts.ts");
    expect(related, "relatedPosts.ts에 낡은 사유가 남아 있다").not.toContain(
      "아직 글이 없다 — 무조리 메뉴",
    );
  });

  /**
   * 🔴 cook-fresh만 `{ none }`으로 남는다 — **없어서가 아니라 안 쓰기로 해서**다.
   *
   * 남은 항목이 하나뿐이 되면 이 가드는 "아직 안 쓴 글"이 아니라 "쓰지 않기로 한 결정"을
   * 지키는 가드가 된다. 그래서 개수만 보지 않고 **사유가 결정을 말하는지**까지 본다.
   * 나중에 cook-fresh 글을 쓰기로 마음이 바뀌면 여기서 멈춰서 결정을 다시 적게 된다.
   */
  it("🔴 cook-fresh는 여전히 사유만 남는다 — 안 쓰기로 한 글이다", async () => {
    const { FILTER_ARTICLES } = await import("./relatedPosts");
    const entry = FILTER_ARTICLES["cook-fresh"];
    expect("none" in entry, "cook-fresh에 글이 붙었다 — 결정이 바뀌었으면 사유도 지울 것").toBe(true);
    expect((entry as { none: string }).none, "사유가 '아직 없다'로 약해졌다").toContain(
      "글을 만들지 않는다",
    );

    const stillNone = Object.entries(FILTER_ARTICLES)
      .filter(([, v]) => "none" in v)
      .map(([k]) => k);
    // 2026-10-23 Sesame Allergy에 글이 붙었다(sesame-free-school-lunches-nz) — 다시 cook-fresh 하나.
    expect(stillNone, "짝 없는 필터가 cook-fresh 하나가 아니다").toEqual(["cook-fresh"]);
  });
});

/**
 * 🔴 주간 허브 — 플래너 특가 섹션에서 `/price-index`로.
 *
 * 이 사이트에서 **일정에 맞춰 바뀌는 것은 가격지수 하나뿐이다.** 나머지는 다 정적이라
 * 한 번 보면 다시 올 이유가 없다. 그래서 플래너의 "이번 주 세일" 옆에서 지수로 보내고,
 * 지수 페이지 맨 위에 **언제 읽었고 언제 또 바뀌는지**를 세운다.
 *
 * 🔴 그런데 갱신 요일을 화면에 적는 순간 그건 **검증 대상 주장**이 된다.
 *    🔴 2026-10-26: 이 가드는 GitHub Actions 크론(일 20:00 UTC = NZ 월요일 아침)과 대조하고 있었다.
 *    그런데 **그 크론은 읽지 못했다** — 러너에서 마트 사이트가 막혀 08-23 이후 12회 중 1회만 읽었다.
 *    실제로 읽는 것은 로컬 launchd(`ops/kiwi-prices.plist`, 일요일 18:00 NZ)였고 「Last read」도 일요일이었다.
 *    가드가 **주장과 다른 곳**을 보고 초록이었다. 이제 실제 수집기의 일정과 대조한다.
 *    (plist의 시각은 이 Mac의 현지 시각 = NZ다. UTC 환산이 없다.)
 *
 * ⚠️ 이 사이트는 "refresh weekly"라고 써 놓고 스케줄러가 없던 전력이 있다(08-18).
 *    그래서 주기를 말하는 문구와 실제 크론을 한 곳에서 묶어 둔다.
 */
describe("🔴 주간 특가에서 가격지수로", () => {
  const src = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf-8");
  const LOCALES = ["en", "ko", "zh"] as const;
  const messages = Object.fromEntries(
    LOCALES.map((l) => [
      l,
      JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8")) as Record<string, string>,
    ]),
  ) as Record<(typeof LOCALES)[number], Record<string, string>>;

  const SCHEDULE = "ops/kiwi-prices.plist";
  const WORKFLOW = ".github/workflows/update_prices.yml";
  const PRICE_PAGE = "app/[locale]/price-index/page.tsx";

  /** launchd `StartCalendarInterval` — 요일(0=일)·시. 요일이 없으면 주간이 아니다. */
  const readSchedule = (xml: string) => {
    const block = xml.match(/<key>StartCalendarInterval<\/key>\s*<dict>([\s\S]*?)<\/dict>/)?.[1] ?? "";
    const num = (k: string) => block.match(new RegExp(`<key>${k}</key>\\s*<integer>(\\d+)</integer>`))?.[1];
    const dow = num("Weekday");
    const hour = num("Hour");
    return dow !== undefined && hour !== undefined ? { dow: Number(dow), hour: Number(hour) } : null;
  };

  // 요일을 세 언어로 적는 법. 크론이 옮겨가면 **어느 요일을 적어야 하는지**까지 여기서 나온다.
  const WEEKDAY_WORDS: Record<(typeof LOCALES)[number], string[]> = {
    en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    ko: ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"],
    zh: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
  };

  it("플래너 특가 섹션이 price-index로 링크한다", () => {
    const planner = src("components/PlannerClient.tsx");
    expect(planner, "price-index 링크가 없다").toMatch(/\/\$\{locale\}\/price-index/);

    // 아무 데나 있으면 안 된다 — "이번 주 세일" 블록 안에 있어야 주간 허브가 된다.
    const start = planner.indexOf('t("sale_section_title")');
    const end = planner.indexOf('t("generate_btn")');
    expect(start, "sale_section_title 헤딩을 못 찾았다").toBeGreaterThan(-1);
    const at = planner.indexOf("/price-index");
    expect(
      at > start && at < end,
      "price-index 링크가 특가 섹션 밖에 있다 — 세일을 보러 온 사람이 지나치게 된다",
    ).toBe(true);
  });

  it("문구가 세 로케일에 다 있다", () => {
    for (const l of LOCALES) {
      expect(messages[l].planner_price_index_link, `${l}: 없음`).toBeTruthy();
    }
  });

  it("🔴 '매주 갱신'이라고 쓴다면 주간으로 **읽는** 수집기가 실제로 있어야 한다", () => {
    const sched = readSchedule(src(SCHEDULE));
    expect(sched, `주간 갱신을 약속했는데 ${SCHEDULE}에 요일 지정 일정이 없다`).not.toBeNull();
    expect(src(SCHEDULE), "일정이 수집 스크립트를 부르지 않는다").toContain("scripts/collect_prices_local.sh");
    const collector = src("scripts/collect_prices_local.sh");
    for (const step of ["update_prices.mjs", "update_price_index.mjs --write", "update_paknsave_prices.mjs --write", "update_newworld_prices.mjs --write", "update_price_history.mjs --write"]) {
      expect(collector, `로컬 수집기에 ${step} 단계가 없다`).toContain(step);
    }

    // 페이지도 갱신 시점을 실제로 말하고 있어야 한다. 크론만 있고 화면이 조용하면
    // 다시 올 이유가 안 생긴다 — 그게 이 태스크의 목적이다.
    const page = src(PRICE_PAGE);
    expect(page, "가격지수 페이지가 다음 갱신 시점을 말하지 않는다").toMatch(/next re-read/i);
    expect(page, "마지막 갱신일을 손으로 적었다 — 데이터에서 읽을 것").toMatch(/data\.lastUpdated/);
  });

  it("🔴 화면이 말하는 갱신 요일이 수집기가 실제로 도는 NZ 요일과 같다", () => {
    const sched = readSchedule(src(SCHEDULE));
    if (!sched) throw new Error(`${SCHEDULE}에 주간 일정이 없다`);
    const nzDow = sched.dow;
    // 저녁에 돈다면 「evening」이라고, 아침이면 「morning」이라고 — 시각대도 주장이다.
    expect(src(PRICE_PAGE), "시각대(evening)가 일정과 다르다").toMatch(sched.hour >= 17 ? /Sunday evening|evening, New Zealand time/ : /morning, New Zealand time/);

    const page = src(PRICE_PAGE);
    expect(
      page,
      `수집기는 NZ ${WEEKDAY_WORDS.en[nzDow]}에 도는데 페이지가 그 요일을 말하지 않는다`,
    ).toContain(WEEKDAY_WORDS.en[nzDow]);

    for (const l of LOCALES) {
      const s = String(messages[l].planner_price_index_link ?? "");
      // 주간 크론인데 "매일"이라고 말하면 안 된다.
      expect(/daily|매일|每天|每日/i.test(s), `${l}: 매일이라고 쓰는데 크론은 주간이다`).toBe(false);
      // 요일을 말한다면 크론이 실제로 도는 NZ 요일이어야 한다.
      const named = WEEKDAY_WORDS[l].findIndex((w) => s.includes(w));
      expect(
        named === -1 || named === nzDow,
        `${l}: "${WEEKDAY_WORDS[l][named]}"이라고 쓰는데 수집기는 NZ ${WEEKDAY_WORDS[l][nzDow]}에 돈다`,
      ).toBe(true);
      expect(named, `${l}: 갱신 요일을 말하지 않는다 — 다시 올 이유가 안 생긴다`).toBe(nzDow);
    }
  });

  it("🔴 Actions는 감시만 한다 — 읽지 못하는 러너에서 수집기를 돌려 커밋하지 않는다(10-26)", () => {
    const wf = src(WORKFLOW);
    expect(wf, "양성 대조 — 신선도 가드").toMatch(/Fail if the published data has gone stale/);
    expect(wf, "양성 대조 — vitest").toMatch(/npx vitest run/);
    expect(wf, "수집 스크립트가 다시 들어왔다").not.toMatch(/update_(prices|price_index|paknsave_prices|newworld_prices|price_history)\.mjs/);
    expect(wf, "Actions가 다시 push한다").not.toMatch(/git push|git commit/);
    expect(wf, "쓰기 권한이 다시 생겼다").not.toMatch(/contents:\s*write/);
  });

  it("설치된 launchd 일정이 저장소 사본과 같다(이 Mac에서만 — CI엔 없다)", () => {
    const installed = `${process.env.HOME}/Library/LaunchAgents/nz.kiwilunchbox.prices.plist`;
    if (!existsSync(installed)) return;
    expect(readSchedule(readFileSync(installed, "utf-8")), "설치본과 저장소 사본의 요일·시각이 다르다 — 화면 문구는 저장소 사본을 본다").toEqual(readSchedule(src(SCHEDULE)));
  });
});

/**
 * 🔴 영수증 사진의 캡션은 **사진에 실제로 보이는 것**만 말해야 한다 (2026-09-15 대조).
 *
 * 세 장을 눈으로 읽고 캡션과 맞춰 봤다. 전부 일치했다:
 *   masked  TOTAL $101.83 · 점포 머리글 1 Bellingham Road, Flat Bush · 카드번호 검은 칠
 *   jul     TOTAL $100.18 · PLOUGHMANS … WHOLEML 750G $3.79 · YUMMY APPLES … 6S $4.99
 *   jun     상단부만 — 총액을 주장하지 않는다(사진에 총액이 없다)
 *
 * ⚠️ **날짜는 어느 사진에도 안 보인다**(결제부를 잘라냈기 때문). 캡션의 날짜는 촬영자의
 *    기록이지 독자가 검산할 수 있는 값이 아니다 — 거짓은 아니지만 성격이 다르다.
 *
 * 🔴 여기서 막는 건 **사진과 캡션이 따로 바뀌는 것**이다. 사진을 갈아 끼우거나 금액만
 *    고치면 둘이 조용히 갈라진다. 이 저장소가 같은 모양으로 여러 번 당했다.
 */
/**
 * 🔴 알레르기 글이 **라벨을 덜 읽으라고 말하면 안 된다** (2026-09-15 실측).
 *
 * 달걀 프리 글의 「빠른 참조표」는 머리글에서 "always confirm on the current label —
 * formulations change"라고 해 놓고, 표 바로 아래 팁이 이렇게 말하고 있었다:
 *
 *   "Save this list on your phone … Having a pre-checked list means you spend
 *    **less time reading labels in the aisle** and more time actually shopping."
 *
 * 한 절 안에서 서로를 반박했고, 반박하는 쪽이 **위험한 방향**이었다.
 *
 * 🔴 그리고 그 표의 두 줄이 절대형이었다 — "All dried Barilla is egg-free",
 *    "All standard hummus is egg-free". 우리가 **실제로 추적하는** 그 두 품목의 라벨은
 *      diamond pasta bow ties  선언 Gluten, Wheat · **주의 Egg, Soy**
 *      lisas hummus plain      선언 Sesame       · **주의 Egg, Milk, …**
 *    선언은 없지만 「달걀이 들어갈 수 있다」고 적힌 상품이다. 우리 데이터가 글을
 *    반박하고 있었다.
 *
 * 플래너 필터가 주의 문구로 거르지 **않는** 것은 문서화된 선택이다
 * (`ingredientDiet.ts`) — 대신 화면이 "라벨을 확인하세요"라고 안내한다.
 * 그 선택이 성립하려면 **글이 그 안내를 깎아내리지 않아야** 한다.
 */
describe("🔴 알레르기 글은 라벨 읽기를 깎지 않는다", () => {
  const SURF = ["content/posts.ts", "content/guides.ts"] as const;
  const read = (rel: string) =>
    readFileSync(new URL("../" + rel, import.meta.url), "utf-8");

  it("「라벨을 덜 읽어도 된다」는 말이 없다", () => {
    const BAD = [
      /less time reading labels/i,
      /skip (?:the |reading )?labels?/i,
      /no need to (?:read|check) (?:the )?labels?/i,
      /instead of reading labels/i,
      /saves? you (?:from )?reading labels?/i,
    ];
    const bad: string[] = [];
    for (const rel of SURF) {
      read(rel).split("\n").forEach((line, i) => {
        for (const re of BAD) if (re.test(line)) bad.push(`${rel}:${i + 1}  ${line.trim().slice(0, 110)}`);
      });
    }
    expect(bad, `알레르기 안내를 깎는 문장:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("「전부/모두 ~free」라고 브랜드 단위로 단정하지 않는다", () => {
    const bad: string[] = [];
    for (const rel of SURF) {
      read(rel).split("\n").forEach((line, i) => {
        // "All dried Barilla is egg-free" 꼴. 「All … is X-free」만 본다.
        if (/\bAll\b[^.|]{0,40}\bis\s+(?:nut|dairy|gluten|egg)[- ]free\b/i.test(line)) {
          bad.push(`${rel}:${i + 1}  ${line.trim().slice(0, 110)}`);
        }
      });
    }
    expect(bad, `브랜드 단위 절대 주장:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("주의 문구가 붙은 상품이 실제로 있다 — 그래서 위 규칙에 뜻이 있다 (양성 대조)", async () => {
    // 이 파일 관행대로 allergenFacts 는 동적으로 가져온다
    const F = await import("./allergenFacts");
    // 🔴 주의 문구가 0건이면 「라벨을 보라」는 말이 공허해지고 위 두 검사도 빈 검사가 된다.
    expect(F.warnedCount("egg"), "달걀 주의 문구가 붙은 상품이 없다").toBeGreaterThan(0);
    const clause = F.warnedKeysClause("egg", ["Pasta", "Hummus", "Bread", "Tortilla", "Wraps", "Crackers"]);
    expect(clause, "문장에 넣을 주의 품목이 없다").not.toBe("");
  });

  it("달걀 프리 참조표가 라벨 우선을 직접 말한다", () => {
    const body = Object.values(POSTS).find((p) =>
      p.body.includes("Egg-Free Product Quick Reference"),
    )?.body;
    expect(body, "달걀 프리 참조표를 못 찾았다").toBeTruthy();
    expect(body!, "표가 라벨 우선을 말하지 않는다").toContain("does not replace the label");
    expect(body!, "주의 문구 사실을 데이터에서 말하지 않는다").toContain("may contain egg");
  });
});

describe("🔴 영수증 캡션은 사진과 함께 움직인다", () => {
  const page = readFileSync(
    new URL("../app/[locale]/price-index/page.tsx", import.meta.url),
    "utf-8",
  );

  /** 사진 파일 → 그 사진을 눈으로 읽어 확인한 값(2026-09-15) */
  const VERIFIED: { file: string; must: string[]; mustNot?: string[] }[] = [
    { file: "real-paknsave-ormiston-receipt-masked.jpg", must: ["101.83"] },
    {
      file: "real-paknsave-ormiston-receipt-jul.jpg",
      must: ["100.18", "3.79", "4.99", "1 Bellingham Road"],
    },
    // 🔴 상단부 사진이라 총액이 없다. 총액을 적으면 **사진에 없는 것을 말하는 것**이다.
    { file: "real-paknsave-ormiston-receipt-jun.jpg", must: ["1 Bellingham Road"], mustNot: ["total NZ$"] },
  ];

  it("사진 세 장이 실제로 페이지에 있다 (양성 대조)", () => {
    for (const v of VERIFIED) expect(page, `${v.file} 이 페이지에 없다`).toContain(v.file);
    expect(existsSync(new URL(`../public/assets/${VERIFIED[0].file}`, import.meta.url)))
      .toBe(true);
  });

  for (const v of VERIFIED) {
    it(`${v.file} 캡션이 확인된 값을 말한다`, () => {
      const i = page.indexOf(v.file);
      expect(i, "사진을 못 찾았다").toBeGreaterThan(-1);
      // 그 사진의 figure 범위만 본다 — 옆 사진 캡션을 읽으면 아무것도 안 지킨다
      const end = page.indexOf("</figure>", i);
      expect(end, `${v.file}: </figure> 를 못 찾았다`).toBeGreaterThan(i);
      const block = page.slice(i, end);
      for (const m of v.must) expect(block, `${v.file}: "${m}" 가 캡션에 없다`).toContain(m);
      for (const m of v.mustNot ?? []) {
        expect(block, `${v.file}: 사진에 없는 "${m}" 를 말한다`).not.toContain(m);
      }
      // 사진 파일이 실제로 있어야 한다 — 캡션만 남고 사진이 사라지는 걸 막는다
      expect(
        existsSync(new URL(`../public/assets/${v.file}`, import.meta.url)),
        `${v.file} 파일이 없다`,
      ).toBe(true);
    });
  }

  it("개인정보 마스킹을 말했으면 실제로 그렇게 적혀 있다", () => {
    // 카드번호·승인번호 처리를 캡션이 약속한다. 약속을 지우면 red.
    for (const word of ["card number", "auth code"]) {
      expect(page.toLowerCase(), `캡션이 ${word} 처리를 말하지 않는다`).toContain(word);
    }
  });
});

describe("🔴 NZ Food Safety(MPI) 인용", () => {
  // 이 파일의 관행대로 describe 안에서 지역 정의한다
  const src = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf-8");
  const SURFACES = ["content/posts.ts", "content/guides.ts"] as const;

  /**
   * 🔴 2026-08-20: MPI 인용 두 곳이 **죽은 랜딩 URL**을 가리키고 있었고, 그 옆의 숫자는
   * MPI가 쓰는 값이 아니었다. 사이트는 위험구간을 `4°C`라고 아홉 곳에서 말했는데
   * **MPI는 `5°C`~60°C**다. 한 곳(`posts.ts`)은 그걸 "MPI's core principle"이라고
   * 직접 귀속시키기까지 했다.
   *
   * 🔴 그리고 `mpi.govt.nz`의 **HTML 페이지**는 Imperva 뒤에 있어 **차단 페이지를
   * HTTP 200에 212바이트로** 돌려준다. 인앱 브라우저로 열면 CAPTCHA가 뜬다(2026-09-15
   * 확인. CAPTCHA는 풀지 않는다). 즉 **링크 점검 스크립트는 죽은 MPI HTML 링크를
   * 절대 못 잡는다.** 그래서 여기서 문자열로 막는다.
   *
   * ⚠️ 단, **`/dmsdocument/` PDF는 막히지 않는다** — 2026-09-15에 받아서 원문을 읽었다.
   *    "MPI는 전부 검증 불가"라고 알고 있던 게 틀렸고, 그동안 숫자 검증을 못 하고 있었다.
   */
  /**
   * 🔴 2026-09-15 정정 — 위 주석은 "curl·WebFetch·인앱 브라우저 전부 막힌다"고
   *    적어 뒀다. **HTML 페이지는 맞다**(브라우저로 열면 Imperva CAPTCHA가 뜨고,
   *    CAPTCHA는 풀지 않는다). 그런데 **`/dmsdocument/` PDF는 그냥 받아진다.**
   *    확인해 보지 않은 「불가능하다」가 숫자 검증을 통째로 막고 있었다.
   *
   *    `node scripts/verify_mpi_citations.mjs` 로 원문에 대고 확인한다.
   *    2026-09-15 실행 결과: 인쇄 5쪽(위험구간 5°C–60°C·4시간) · 10쪽(2시간 냉장·
   *    75°C 재가열) · 14쪽(학교 도시락) **전부 일치**.
   *
   * 🔴 여기서는 **글이 그 쪽수·시간을 그대로 말하는지**만 본다. 네트워크는 안 탄다 —
   *    쪽수를 고치고 싶으면 위 스크립트를 먼저 돌려야 한다.
   */
  it("🔴 소책자 인용의 쪽수·시간이 검증된 값과 같다", () => {
    // 🔴 쪽수 인용은 **두 글**에 있다. 한 글만 보면 다른 글이 조용히 갈라진다.
    const bodies = ["lunchbox-food-safety-nz-term-1-heat", "thermos-hot-lunches-nz-winter"]
      .map((slug) => POSTS[slug].body)
      .join("\n\n@@\n\n");
    const b = bodies;
    // 스크립트의 CLAIMS 와 같은 값이어야 한다
    expect(b, "위험구간 쪽수·온도·시간 인용이 바뀌었다")
      .toContain("Page 5 puts the danger zone at 5°C–60°C with a four-hour limit");
    expect(b, "남은 음식·재가열 쪽수 인용이 바뀌었다")
      .toContain("page 10 gives the two-hour rule for refrigerating leftovers and the over-75°C reheating line");
    expect(b, "학교 도시락 쪽수 인용이 바뀌었다").toContain("page 14 covers school lunch boxes");
    // 🔴 양성 대조 — 소책자 URL 자체가 살아 있어야 이 인용이 의미가 있다
    expect(b).toContain("mpi.govt.nz/dmsdocument/3662-Food-Safety-in-the-Home");
  });

  it("🔴 확인 스크립트가 존재하고 같은 쪽수를 들고 있다", () => {
    const script = readFileSync(
      new URL("../scripts/verify_mpi_citations.mjs", import.meta.url),
      "utf-8",
    );
    for (const pageNo of [5, 10, 14]) {
      expect(script, `스크립트에 인쇄 ${pageNo}쪽이 없다`).toContain(`printedPage: ${pageNo}`);
    }
    // 도구가 없을 때 조용히 통과하지 않는지 — 「못 돌렸다」와 「통과했다」는 다르다
    expect(script, "pdftotext 가 없을 때 그냥 넘어간다").toContain("process.exit(2)");
  });

  it("🔴 폐기된 소비자 랜딩 URL을 쓰지 않는다 — 링크 점검기는 이걸 200으로 본다", () => {
    for (const f of SURFACES) {
      const raw = src(f);
      // 하위 페이지(.../tips-for-food-safety/)는 살아 있다. 랜딩 그 자체만 막는다.
      const dead = raw.match(/mpi\.govt\.nz\/food-safety\/food-safety-for-consumers\/(?![a-z])/g) ?? [];
      expect(dead, `${f}: 폐기된 MPI 랜딩 URL ${dead.length}건`).toEqual([]);
    }
  });

  it("🔴 위험구간을 4°C라고 쓰지 않는다 — MPI는 5°C다", () => {
    for (const f of SURFACES) {
      const raw = src(f);
      const hits = raw.match(/(?<!\d)4\s?°C/g) ?? [];
      expect(hits, `${f}: 4°C가 ${hits.length}건 — MPI는 5°C~60°C다`).toEqual([]);
    }
  });

  it("🔴 60°C를 살균 온도라고 말하지 않는다 — 보온 온도다. MPI 재가열 지시는 75°C", () => {
    // ⚠️ 부정문을 잡으면 안 된다. 이 가드의 첫 판은 "60°C는 kill step이 **아니다**"라고
    //    말하는 수정 문장 자체를 잡았다. 이 저장소는 같은 실수를 한 번 했다
    //    ("a buying guide, **not** a lab test"를 지울 뻔했다).
    const NEGATED = /\b(not|never|isn't|is not|rather than)\b[^.|]{0,40}\bkill/i;
    for (const f of SURFACES) {
      const bad = src(f)
        .split("\n")
        .filter((l) => /60\s?°C/.test(l) && /\bkill(s|ed|ing)?\b/i.test(l) && !NEGATED.test(l));
      expect(bad, `${f}: 60°C를 살균으로 설명한다 → ${bad[0]?.slice(0, 90)}`).toEqual([]);
    }
  });

  it("위험구간의 온도 범위는 5°C~60°C로 쓴다", () => {
    // ⚠️ "danger zone이 나오고 °C가 있는 줄"을 전부 보면 오탐이 난다 — 첫 판은
    //    "food has been at 20–25°C"를 잡았다. **범위를 실제로 진술하는 줄**만 본다.
    const RANGE = /(\d+)\s?°C\s*(?:-|–|—|to|and)\s*(\d+)\s?°C/g;
    let checked = 0;
    for (const f of SURFACES) {
      for (const line of src(f).split("\n")) {
        if (!/danger zone/i.test(line)) continue;
        for (const m of line.matchAll(RANGE)) {
          checked += 1;
          expect([m[1], m[2]], `${f}: 위험구간이 ${m[1]}~${m[2]}다 → ${line.slice(0, 90)}`)
            .toEqual(["5", "60"]);
        }
      }
    }
    // 🔴 양성 대조 — 하나도 안 걸렸다면 이 테스트는 아무것도 검사하지 않았다
    expect(checked, "위험구간 범위를 진술하는 줄이 하나도 없다 — 검사가 헛돌았다")
      .toBeGreaterThan(0);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * 🔴 본문에 실린 1인분 금액 (2026-08-20 신설)
 *
 * 사연: 사용자가 "치즈 39c가 안 맞는다"고 짚었는데, 재어 보니 **아홉 개가 틀렸다.**
 * 글 두 편과 가이드 한 편이 1인분 금액을 손으로 적어 두고 있었고, 주간 가격 크론이
 * 그 밑에서 움직였다. 더 나빴던 건 그 금액 위에 **논증**이 얹혀 있었다는 것이다 —
 * "치즈는 땅콩버터보다 약 80% 비싸다"(실제 60%), "닭가슴살은 살라미의 여덟 배"(7배),
 * "계란은 병아리콩과 비슷하다"(계란 82c, 병아리콩 30c).
 *
 * 이 블록이 막는 것은 두 가지다.
 *   1) **이름표×값 짝** — 값만 맞는지 보면 다른 행의 값으로 통과한다(이 저장소가 3회 당했다).
 *   2) **소스에 손으로 적은 금액이 다시 생기는 것** — `${…}`를 지운 뒤 금액 모양이
 *      남아 있으면 실패시킨다. 개수 가드가 쓰는 방식과 같다.
 * ──────────────────────────────────────────────────────────────────────────── */
describe("🔴 본문 1인분 금액은 전부 price_cache에서 나온다", () => {
  const serve = (key: string) => {
    const p = (PRICES as Record<string, { data: { price?: number } }>)[key]?.data?.price;
    expect(p, `price_cache에 "${key}"가 없다`).toBeGreaterThan(0);
    return (p as number) * (PORTION_FACTORS[key] ?? DEFAULT_PORTION);
  };
  const label = (n: number) => (n < 1 ? `${Math.round(n * 100)}c` : `$${n.toFixed(2)}`);
  const dollars = (n: number) => `$${n.toFixed(2)}`;
  const serves = (key: string) => Math.floor(1 / (PORTION_FACTORS[key] ?? DEFAULT_PORTION));
  /** 재료 하나의 1인분 비용. 캐시에 없으면 0 — 메뉴 재료를 훑을 때 쓴다. */
  const serveOf = (ing: string) => {
    const p = (PRICES as Record<string, { data: { price?: number } }>)[ing]?.data?.price;
    return (typeof p === "number" && p > 0 ? p : 0) * (PORTION_FACTORS[ing] ?? DEFAULT_PORTION);
  };
  const pack = (key: string) =>
    (PRICES as Record<string, { data: { price?: number } }>)[key].data.price as number;

  const NUT_FREE = POSTS["nut-free-school-lunches-new-zealand"].body;
  const EGG_FREE = POSTS["egg-free-lunchbox-ideas-nz"].body;
  const BATCH = POSTS["batch-cooking-save-money-nz"].body;
  const NUTRITION = GUIDES["complete-nutrition-guide-school-lunches-nz"].body;

  /**
   * 헤더로 **하나의 표만** 잘라 온다.
   * 🔴 본문 전체에서 이름표를 찾으면 다른 표가 대신 걸린다 — 처음 만들 때 nut-free 글의
   *    "Replacement" 표(Hummus·Cream cheese·Hard-boiled egg가 또 나온다)가 걸려서
   *    정렬 검사가 11줄을 봤다.
   */
  const table = (body: string, header: string) => {
    const lines = body.split("\n");
    const i = lines.findIndex((l) => l.trim() === header);
    expect(i, `표 헤더 "${header}"를 못 찾았다 — 헤더가 바뀌면 이 가드부터 고칠 것`)
      .toBeGreaterThan(-1);
    const out: string[][] = [];
    for (const l of lines.slice(i + 2)) {
      if (!l.startsWith("|")) break;
      out.push(l.split("|").slice(1, -1).map((c) => c.trim().replace(/\*\*/g, "")));
    }
    expect(out.length, `"${header}" 표에 행이 없다`).toBeGreaterThan(0);
    return out;
  };

  /** 표 안에서 이름표로 행을 짚는다 — 값만 보면 다른 행이 대신 통과한다. */
  const row = (rows: string[][], rowLabel: string) => {
    const hit = rows.find((c) => c[0] === rowLabel);
    expect(hit, `"${rowLabel}" 행을 못 찾았다 — 라벨이 바뀌었으면 이 가드도 같이 고칠 것`)
      .toBeTruthy();
    return hit as string[];
  };

  it("nut-free 스프레드 표: 여덟 줄이 전부 이름표에 맞는 캐시 값이다", () => {
    const rows: [string, string][] = [
      ["Marmite", "Marmite"],
      ["Jam", "Jam"],
      ["Peanut butter", "Peanut Butter"],
      ["Honey", "Honey"],
      ["Cream cheese", "Cream Cheese"],
      ["Cheese (from a block)", "Cheese"],
      ["Hummus", "Hummus"],
      ["Hard-boiled egg", "Eggs"],
    ];
    const t = table(NUT_FREE, "| Spread | Cost per lunch | Protein? |");
    expect(t.length, "스프레드 표의 줄 수가 바뀌었다").toBe(rows.length);
    for (const [name, key] of rows) {
      expect(row(t, name)[1], `${name}: 표 값이 캐시(${key})와 다르다`).toBe(label(serve(key)));
    }
    // 🔴 정렬도 주장이다 — 이 절의 논지가 "땅콩버터 아래에는 단백질이 없다"라서
    //    싼 순이 아니면 문장이 표를 반박한다.
    const sorted = [...rows].sort((a, b) => serve(a[1]) - serve(b[1])).map(([n]) => n);
    expect(t.map((c) => c[0]), "스프레드 표가 싼 순이 아니다").toEqual(sorted);
  });

  it("nut-free 본문의 배수·연간 금액이 표와 같은 값에서 나온다", () => {
    const pb = serve("Peanut Butter");
    expect(NUT_FREE).toContain(`Marmite at ${label(serve("Marmite"))}`);
    expect(NUT_FREE).toContain(`jam at ${label(serve("Jam"))}`);
    expect(NUT_FREE).toContain(`cheese from a block at ${label(serve("Cheese"))}`);
    // 배수는 반올림 정수로만 말한다(분수 표현이 네 번 깨졌다).
    const word: Record<number, string> = { 2: "double", 3: "triple", 4: "four times", 5: "five times" };
    expect(NUT_FREE).toContain(`Hummus is ${word[Math.round(serve("Hummus") / pb)]}.`);
    expect(NUT_FREE).toContain(`An egg is ${word[Math.round(serve("Eggs") / pb)]}.`);
    // 연간 금액 = 차액 × 40주 × 5일. 표가 움직이면 여기도 움직여야 한다.
    const yearly = (key: string) => `$${Math.round((serve(key) - pb) * 200)}`;
    expect(NUT_FREE).toContain(`about **${yearly("Cheese")} per child**`);
    expect(NUT_FREE).toContain(`for hummus, about ${yearly("Hummus")}.`);
  });

  it("batch-cooking 팩 표: 팩값·회분·1인분 단가가 한 키에서 나온다", () => {
    const rows: [string, string][] = [
      ["Sugar", "Sugar"],
      ["Plain flour", "Flour"],
      ["Rolled oats", "Rolled Oats"],
      ["Butter", "Butter"],
      ["Rice", "Rice"],
      [`Cheese (${packSize("Cheese")} block)`, "Cheese"],
      ["Pasta", "Pasta"],
      ["Eggs (dozen)", "Eggs"],
    ];
    const t = table(BATCH, "| Ingredient | Pack price | Servings in the pack | Cost per serve |");
    expect(t.length, "팩 표의 줄 수가 바뀌었다").toBe(rows.length);
    expect(t.map((c) => c[0]), "팩 표가 1인분 단가 싼 순이 아니다").toEqual(
      [...rows].sort((a, b) => serve(a[1]) - serve(b[1])).map(([n]) => n),
    );
    for (const [name, key] of rows) {
      const [, packCell, servesCell, costCell] = row(t, name);
      expect(packCell, `${name}: 팩 가격이 캐시와 다르다`).toBe(dollars(pack(key)));
      expect(servesCell, `${name}: 회분이 PORTION_FACTORS와 다르다`).toBe(`~${serves(key)}`);
      expect(costCell, `${name}: 1인분 단가가 캐시와 다르다`).toBe(label(serve(key)));
    }
    // 표 아래 문장이 표와 다른 숫자를 말하면 안 된다 — 예전엔 실제로 갈라져 있었다.
    expect(BATCH).toContain(`**A ${dollars(pack("Butter"))} block of butter is ${serves("Butter")} lunches.**`);
    expect(BATCH).toContain(`A ${dollars(pack("Flour"))} bag of flour is ${serves("Flour")} batches`);
    expect(BATCH).toContain(`was a ${dollars(pack("Flour"))} loss, not a ${label(serve("Flour"))} serve`);
    const staples = ["Flour", "Sugar", "Butter", "Rolled Oats"].map(serves);
    expect(BATCH).toContain(`with ${Math.min(...staples)}-${Math.max(...staples)} servings per pack`);
  });

  it("egg-free 문단: 계란과 비교 대상의 순서·금액이 캐시와 맞다", () => {
    // 🔴 예전엔 "one of the cheapest proteins on the shelf at 34c"였다. 그 34c는 치즈
    //    분량비율이 2배 틀려서 나온 값이고(실제 51c), **그 위에 "가장 싼 축"이라는 논증이
    //    얹혀 있었다.** 51c에서는 병아리콩·블랙빈이 치즈를 밑돈다. 그래서 이제 본문이
    //    순위를 생성하고, 여기서는 **순위와 문장이 같은 말을 하는지**를 본다.
    expect(EGG_FREE).toContain(`cheese runs ${label(serve("Cheese"))} a serve`);
    const undercut = ["Chickpeas", "Black Beans", "Eggs", "Ham", "Chicken Breast"].filter(
      (k) => serve(k) < serve("Cheese"),
    );
    expect(cheeseIsCheapestProtein()).toBe(undercut.length === 0);
    if (undercut.length) {
      expect(EGG_FREE, `치즈보다 싼 단백질(${undercut.join(", ")})이 있는데 본문이 말하지 않는다`)
        .toContain("undercut it");
      // 값이 뒤집혔는데 옛 주장이 남아 있으면 안 된다.
      expect(EGG_FREE).not.toContain("one of the cheapest proteins on the shelf");
    } else {
      expect(EGG_FREE).not.toContain("undercut it");
    }
    expect(EGG_FREE).toContain(`An egg is ${label(serve("Eggs"))} a serve`);
    for (const [name, key] of [
      ["tinned chickpeas", "Chickpeas"],
      ["cheese", "Cheese"],
      ["black beans", "Black Beans"],
      ["chicken breast", "Chicken Breast"],
    ] as [string, string][]) {
      expect(EGG_FREE, `${name}: 금액이 캐시(${key})와 다르다`).toContain(
        `${name} (${label(serve(key))})`,
      );
    }
    // 🔴 순서도 주장이다 — "dearer than …, and far cheaper than …"
    const egg = serve("Eggs");
    for (const k of ["Chickpeas", "Cheese", "Black Beans"]) {
      expect(serve(k), `${k}가 계란보다 비싸졌다 — 문장이 반대로 말하게 된다`).toBeLessThan(egg);
    }
    expect(serve("Chicken Breast")).toBeGreaterThan(egg);
  });

  /**
   * 🔴 F3 — 계란 유무 중앙값. 본문은 "median $2.55 / $2.45 — A difference of ten cents"라고
   *    손으로 적혀 있었고, 같은 방식으로 다시 재니 $2.54 / $2.52(1.3c)였다. **8배 틀린 헤드라인.**
   *    유제품·글루텐 문장은 파생이었는데 계란 것만 손으로 적혀 있었다 — 같은 일을 하는 자리가
   *    셋이면 하나는 빠진다. 여기서는 세 문장을 **같은 계산으로** 확인한다.
   */
  it("egg-free 중앙값 문단이 dairy·gluten과 같은 계산에서 나온다", () => {
    const cost = (ings: string[]) => ings.reduce((t, i) => t + serveOf(i), 0);
    const med = (xs: number[]) => {
      const a = [...xs].sort((x, y) => x - y);
      const m = Math.floor(a.length / 2);
      return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
    };
    const rows = MENUS as MenuItem[];
    const pair = (pred: (m: MenuItem) => boolean) => {
      const free = med(rows.filter(pred).map((m) => cost(m.ingredients)));
      const other = med(rows.filter((m) => !pred(m)).map((m) => cost(m.ingredients)));
      const gap = Math.abs(free - other);
      return { free, other, gap, gapLabel: gap < 1 ? `${Math.round(gap * 100)}c` : dollars(gap) };
    };
    const egg = pair((m) => !!m.is_egg_free);
    expect(egg.free, "계란 미포함 중앙값이 0이다 — 플래그가 바뀌었나").toBeGreaterThan(0);
    expect(EGG_FREE).toContain(
      `the median egg-free main works out at **${dollars(egg.free)}** against ` +
        `**${dollars(egg.other)}** for the mains that contain egg — ${egg.gapLabel} apart`,
    );
    // 🔴 격차가 커지면 "at the till에서 거의 공짜"라는 **논증 자체**가 거짓이 된다.
    //    본문이 그때 다른 말을 하도록 갈라져 있는지 본다.
    if (egg.gap < 0.25) {
      expect(EGG_FREE).toContain(`**A difference of ${egg.gapLabel} a lunch.**`);
      expect(EGG_FREE).toContain("costs you almost nothing at the till");
    } else {
      expect(EGG_FREE).toContain(`**A difference of ${egg.gapLabel} a lunch**`);
      expect(EGG_FREE).not.toContain("costs you almost nothing at the till");
    }
    // 부호가 뒤집혀도 문장이 깨지지 않아야 한다 — 판정문은 어느 쪽이 비싼지 말하지 않는다.
    expect(EGG_FREE).not.toContain("A difference of ten cents");
    // 세 제한식이 같은 문장 틀을 쓴다(하나만 손으로 적히는 것을 막는다).
    const dairy = pair((m) => !!m.is_dairy_free);
    expect(POSTS["dairy-free-school-lunches-nz"].body).toContain(
      `the median dairy-free main works out at **${dollars(dairy.free)}**`,
    );
  });

  it("nutrition 가이드 네 식품군 표: 여덟 칸이 전부 이름표에 맞는 캐시 값이다", () => {
    // [식품군, 싼 쪽 이름표, 싼 쪽 캐시 키, 비싼 쪽 이름표, 비싼 쪽 캐시 키]
    const rows: [string, string, string, string, string][] = [
      ["Protein", "Sliced salami", "Salami", "Chicken breast", "Chicken Breast"],
      ["Dairy / calcium", "Milk", "Milk", "Yoghurt (1kg tub)", "Yoghurt"],
      ["Fruit & veg", "Carrot sticks", "Carrot", "Grapes", "Grapes"],
      ["Grains", "Microwave rice", "Rice", "Bagel", "Bagel"],
    ];
    const t = table(
      NUTRITION,
      "| Food group | A cheap option | Cost per lunch | A dearer option |",
    );
    expect(t.length, "식품군 표의 줄 수가 바뀌었다").toBe(rows.length);
    let total = 0;
    for (const [group, cheapLabel, cheapKey, dearLabel, dearKey] of rows) {
      const cells = row(t, group);
      // 🔴 이름표와 값을 **짝으로** 본다 — 값만 보면 옆 행의 값으로도 통과한다.
      expect(cells[1], `${group}: 싼 쪽 이름표가 바뀌었다`).toBe(cheapLabel);
      expect(cells[2], `${group}: 최저가가 캐시(${cheapKey})와 다르다`).toBe(label(serve(cheapKey)));
      expect(cells[3], `${group}: 최고가 칸이 "${dearLabel}, 캐시값"이 아니다`).toBe(
        `${dearLabel}, ${label(serve(dearKey))}`,
      );
      total += serve(cheapKey);
    }
    expect(NUTRITION, "네 군 합계가 표와 따로 논다").toContain(
      `costs about ${dollars(total)}** at the cheap end`,
    );
  });

  it("nutrition 가이드 본문의 배수·금액이 같은 캐시에서 나온다", () => {
    const chicken = serve("Chicken Breast");
    // 🔴 2026-09-06: 이 표에 5가 없어서 `word[5]`가 undefined가 됐다. 가이드는
    //    lib/servePrice.ts의 MULTIPLE_WORDS로 문장을 만드는데, 여기 사본은 그걸
    //    손으로 옮겨 적은 것이라 갈라졌다. 원본과 같은 범위(2~10)로 맞춘다.
    const word: Record<number, string> = { 2: "double", 3: "triple", 4: "four times", 5: "five times",
      6: "six times", 7: "seven times", 8: "eight times", 9: "nine times", 10: "ten times" };
    expect(NUTRITION).toContain(
      `Chicken breast at ${label(chicken)} a serve costs ${word[Math.round(chicken / serve("Salami"))]} what sliced salami does, and roughly ${word[Math.round(chicken / serve("Eggs"))]} what an egg does.`,
    );
    expect(NUTRITION).toContain(
      `A carrot is ${label(serve("Carrot"))} and a banana is ${label(serve("Banana"))}.`,
    );
    const cents = (n: number) => Math.round(n * 100);
    const legumes = [serve("Black Beans"), serve("Chickpeas")];
    expect(NUTRITION).toContain(
      `Eggs (${label(serve("Eggs"))}), tinned legumes (${cents(Math.min(...legumes))}-${cents(Math.max(...legumes))}c) and cheese (${label(serve("Cheese"))})`,
    );
    const eggAndLegumes = [serve("Eggs"), ...legumes];
    expect(NUTRITION).toContain(
      `eggs and legumes at ${cents(Math.min(...eggAndLegumes))}-${cents(Math.max(...eggAndLegumes))}c`,
    );
    // 🔴 "살라미가 제일 싸다"는 표 안에서만 참이다. 콩류가 밑으로 내려오면
    //    본문이 그 사실을 말해야 한다 — 안 말하면 두 문단이 서로를 반박한다.
    const salami = serve("Salami");
    const under = ["Black Beans", "Chickpeas"].filter((k) => serve(k) < salami);
    if (under.length) {
      expect(NUTRITION, `콩류 ${under.join(", ")}가 살라미보다 싼데 본문이 그걸 말하지 않는다`)
        .toMatch(/undercut it anyway/);
    } else {
      expect(NUTRITION).not.toMatch(/undercut it anyway/);
    }
  });

  /**
   * 🔴 소스에 손으로 적은 금액이 다시 생기면 실패한다.
   *
   * `${…}` 보간을 지운 뒤 금액 모양(`$3.08`, `39c`)이 남아 있으면 그건 **크론이 못 따라오는
   * 숫자**다. 개수 가드가 쓰는 방식과 같다.
   */
  it("네 자리의 소스 블록에 손으로 적은 금액이 없다", () => {
    const read = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf-8");
    const BLOCKS: { file: string; from: string; to: string; allow?: string[] }[] = [
      {
        file: "content/posts.ts",
        from: "| Spread | Cost per lunch | Protein? |",
        to: "Worth knowing rather than discovering.",
      },
      {
        file: "content/posts.ts",
        from: "| Ingredient | Pack price | Servings in the pack | Cost per serve |",
        to: "Batch cooking works because",
      },
      {
        // 🔴 시작점이 "### What you do lose"였다. 그 **네 줄 위**에 손으로 적은
        //    "median $2.55 / $2.45 — A difference of ten cents"가 있었고, 가드는
        //    그걸 한 번도 본 적이 없다. 실제 값은 $2.54 / $2.52(1c)로 8배 틀려 있었다.
        //    블록은 그 절의 **제목부터** 잡는다.
        file: "content/posts.ts",
        from: "## Does Going Egg-Free Cost More?",
        to: "**The real cost of egg-free isn't money",
      },
      {
        file: "content/posts.ts",
        from: "| Main | Cost |",
        to: "Add a piece of fruit and a second snack",
      },
      {
        // 🔴 F2: "cheese runs about 39c a serve"가 여기 살아 있었다 — 이 파일이 이미
        //    servePrice를 import하는데도. 가드가 이 절을 안 보고 있었기 때문이다.
        file: "content/guides.ts",
        from: "### What that means in practice",
        to: "You can run these filters yourself",
      },
      {
        // 🔴 이 글에 「1인분 원가」 표가 **두 개** 있었다(2026-09-15). 위는 생성,
        //    아래는 손글씨였고 같은 음식에 다른 값을 실었다 — 소고기 다짐육이
        //    위에서 $2.55, 아래에서 ~$0.70. 아래 표에서 가격 두 열을 빼고,
        //    그 절 전체를 가드 안으로 들였다.
        file: "content/posts.ts",
        from: "The table below carries the iron content",
        to: "## Iron and NZ School Terms",
      },
      {
        file: "content/guides.ts",
        from: "| Food group | A cheap option | Cost per lunch | A dearer option |",
        to: "The point of the table isn't",
        // 🔴 예전엔 여기 `allow: ["$2", "$4"]`가 있었다. 그건 **토큰 허용**이라
        //    블록 어디에 새로 생긴 `$2`·`$4`도 같이 통과시켰다 — 실측으로 확인했다:
        //    "Sliced salami is $2 a serve and a bagel is $4."를 넣어도 182개가 전부 통과.
        //    두 값은 이제 파생이다(`midpointBoxTotal()`·`boxMedianLabel()`)이므로 허용이 아예 없다.
      },
    ];
    // 🔴 `39 cents`처럼 **풀어 쓴 금액**도 손으로 적은 금액이다(실측: "Cheese is 39 cents
    //    a serve."를 넣어도 통과했다). 숫자와 cent(s) 사이의 공백은 하나 이상 요구한다 —
    //    공백 없이 붙은 `39c`는 앞의 갈래가 이미 잡는다.
    const PRICE_SHAPED = /\$\s?\d[\d,]*(?:\.\d+)?|\b\d+\s?c\b|\b\d+\s+cents?\b/g;
    for (const b of BLOCKS) {
      const src = read(b.file);
      const i = src.indexOf(b.from);
      expect(i, `${b.file}: "${b.from}" 블록을 못 찾았다 — 이름이 바뀌면 가드가 헛돈다`)
        .toBeGreaterThan(-1);
      const j = src.indexOf(b.to, i);
      expect(j, `${b.file}: "${b.to}" 끝 표지를 못 찾았다`).toBeGreaterThan(i);
      const block = src.slice(i, j);
      // 🔴 양성 대조 — 보간이 하나도 없으면 이 블록은 애초에 생성이 아니다.
      expect(block.match(/\$\{/g)?.length ?? 0, `${b.file}: ${b.from} 블록에 보간이 없다`)
        .toBeGreaterThan(0);
      const stripped = block.replace(/\$\{[^}]*\}/g, "");
      const left = (stripped.match(PRICE_SHAPED) ?? []).filter((m) => !(b.allow ?? []).includes(m));
      expect(left, `${b.file}: 손으로 적은 금액이 남아 있다 → ${left.join(", ")}`).toEqual([]);
    }
  });

  /**
   * 🔴 `content/guides.ts`가 `@/lib/siteCounts`를 import하면 순환이 닫혀 사이트가 죽는다.
   *    `@/lib/servePrice`를 새로 물렸으니 **guides를 먼저 로드해도** 멀쩡한지 본다.
   *    (정적 import는 이 파일의 순서에 묻어가므로, 모듈 캐시를 비우고 다시 확인한다.)
   */
  it("content/guides.ts를 먼저 로드해도 순환이 안 생긴다", async () => {
    vi.resetModules();
    const g = await import("@/content/guides");
    expect(Object.keys(g.GUIDES).length).toBeGreaterThan(0);
    expect(g.GUIDES["complete-nutrition-guide-school-lunches-nz"].body).toContain("| Protein |");
    const sp = await import("./servePrice");
    expect(sp.servePrice("Cheese")).toBeGreaterThan(0);
    vi.resetModules();
  });
});

/**
 * 2026-08-22 애드센스 전체 점검에서 나온 세 가지를 가드로 굳힌다.
 *
 * 셋 다 "한 자리만 고치고 다른 자리를 놓쳤다"가 원인이었다:
 *   - 위험구간을 5°C로 고쳤는데 `4-60C`가 기사 두 편과 **JSX 한 곳**에 남아 있었다.
 *     사이트가 안전 수치를 두 가지로 말하고 있었다 — 심사관 눈엔 곧 신뢰 불가다.
 *   - MPI가 소비자 페이지를 개편하면서 `tips-for-food-safety`가 404가 됐는데,
 *     그 URL이 "2시간 규칙의 출처"로 두 곳에 걸려 있었다. curl로는 212바이트
 *     차단 페이지가 200으로 와서 링크 점검이 원리상 못 잡는다.
 *   - 알레르겐 비교표의 `| Nuts | 89 | 94% |`가 자기 행 안에서 안 맞았다(89/94 = 94.7%).
 */
describe("🔴 식품안전 수치와 출처 (2026-08-22 점검)", () => {
  const readAll = () => {
    const out: { file: string; text: string }[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true })) {
        const p = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx|json)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name))
          out.push({ file: p, text: readFileSync(new URL(`../${p}`, import.meta.url), "utf-8") });
      }
    };
    walk("content");
    walk("app");
    walk("messages");
    return out;
  };

  it("위험구간은 5–60°C 하나로만 말한다 (MPI booklet p.5)", () => {
    const BAD = /4\s*[-–—]\s*60\s*°?C|danger zone[^.]{0,40}\b4\s*°?C/gi;
    const hits = readAll().flatMap(({ file, text }) =>
      (text.match(BAD) ?? []).map((m) => `${file}: ${m}`),
    );
    expect(hits, `위험구간 하한이 4°C로 남아 있다 → ${hits.join(" · ")}`).toEqual([]);

    // 🔴 양성 대조 — 5–60°C를 실제로 말하는 자리가 있어야 이 가드가 의미를 갖는다.
    const good = readAll().filter(({ text }) => /5\s*[-–—]?\s*(°C)?\s*(and|to|-|–)\s*60\s*°?C|between 5°C and 60°C/i.test(text));
    expect(good.length, "5–60°C를 말하는 자리가 하나도 없다 — 가드가 헛돌고 있다").toBeGreaterThan(0);
  });

  it("MPI의 죽은 소비자 경로를 인용하지 않는다", () => {
    // 2026-08-22 브라우저 실측: /food-safety/food-safety-for-consumers/... 는
    // /food-safety-home/... 로 리다이렉트된 뒤 "Sorry, we couldn't find what you wanted"를 낸다.
    // curl은 212바이트 차단 페이지를 200으로 돌려주므로 링크 점검으로는 안 잡힌다.
    const DEAD = /mpi\.govt\.nz\/food-safety\/food-safety-for-consumers/gi;
    const hits = readAll().flatMap(({ file, text }) =>
      (text.match(DEAD) ?? []).map((m) => `${file}: ${m}`),
    );
    expect(hits, `죽은 MPI 경로가 살아 있다 → ${hits.join(" · ")}`).toEqual([]);
  });

  it("알레르겐 비교표의 개수·비율이 메뉴 데이터와 맞는다", () => {
    const body = GUIDES["allergy-management-school-lunchbox-nz"].body;
    const PRED: Record<string, (m: MenuItem) => boolean> = {
      "Nuts": (m) => m.is_nut_free,
      "Nuts + egg": (m) => m.is_nut_free && m.is_egg_free,
      "Nuts + dairy": (m) => m.is_nut_free && m.is_dairy_free,
      "Nuts + gluten": (m) => m.is_nut_free && m.is_gluten_free,
      "Nuts + dairy + egg": (m) => m.is_nut_free && m.is_dairy_free && m.is_egg_free,
      "Nuts + dairy + egg + gluten": (m) =>
        m.is_nut_free && m.is_dairy_free && m.is_egg_free && m.is_gluten_free,
    };
    const rows = [...body.matchAll(/^\|\s*(Nuts[^|]*?)\s*\|\s*\*{0,2}(\d+)\*{0,2}\s*\|\s*\*{0,2}(\d+)%\*{0,2}\s*\|/gm)];

    // 🔴 양성 대조 — 표를 못 찾으면 "위반 0건"은 알리바이다.
    expect(rows.length, "비교표 행을 하나도 못 찾았다 — 표가 바뀌었으면 이 가드부터 고칠 것")
      .toBe(Object.keys(PRED).length);

    for (const [, label, nStr, pStr] of rows) {
      const pred = PRED[label.trim()];
      expect(pred, `표에 모르는 행이 있다: "${label}"`).toBeTruthy();
      const actual = count(pred);
      expect(Number(nStr), `"${label}" 개수가 데이터와 다르다`).toBe(actual);
      expect(Number(pStr), `"${label}" 비율이 개수와 안 맞는다 (${actual}/${MENUS.length})`)
        .toBe(Math.round((actual / MENUS.length) * 100));
    }
  });
});

/**
 * 🔴 범위형 수치("30-50% 싸다")는 이 사이트가 반복해서 밟은 지뢰다.
 *
 * 08-09에 `15-25%`(실측 12%)와 `30-60%`를 지우면서 **문자열 두 개만** 금지했다.
 * 08-22에 다시 세어 보니 같은 종류가 열 곳에 되살아나 있었다 — `10–20%`, `40-50%`,
 * `35–45%`, `30-35%`… 문자열 금지는 두더지잡기고, 새 문장은 늘 새 숫자를 데려온다.
 *
 * 그래서 **모양**을 잡는다: 범위형 퍼센트는 근거가 곁에 있어야 한다.
 * 근거란 (a) 링크, (b) 우리가 쟀다는 명시, (c) 안 쟀다는 명시 중 하나다.
 *
 * ⚠️ 셸 `grep -E`로는 이걸 못 쓴다 — BSD grep이 대괄호 안 en대시에서 헛돈다(08-22 실측:
 *    `20–50%`·`30–50%`·`5–15%` 세 건을 놓쳤다). 그래서 이 가드는 TS에 산다.
 */
describe("🔴 범위형 퍼센트는 근거를 달고 다닌다", () => {
  const RANGE = /\d+\s*[-–—]\s*\d+\s*%/g;
  const EVIDENCE =
    /\]\(https?:|\bASCIA\b|Child Nutrition Survey|Nutrient Reference Value|Food Price Index|Ka Ora|price[- ]index|we (?:measured|track|do not track|have not)|I have (?:not|deliberately)|not measured|do not publish/i;
  const WINDOW = 420;

  const scan = () => {
    const out: { file: string; hit: string; line: number; ok: boolean }[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true })) {
        const p = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx|json)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
          const text = readFileSync(new URL(`../${p}`, import.meta.url), "utf-8");
          for (const m of text.matchAll(RANGE)) {
            const i = m.index ?? 0;
            const ctx = text.slice(Math.max(0, i - WINDOW), i + WINDOW);
            out.push({
              file: p,
              hit: m[0],
              line: text.slice(0, i).split("\n").length,
              ok: EVIDENCE.test(ctx),
            });
          }
        }
      }
    };
    walk("content");
    walk("app");
    walk("messages");
    return out;
  };

  it("근거 없는 범위형 퍼센트가 없다", () => {
    const all = scan();
    // 🔴 양성 대조 — 하나도 못 찾으면 "위반 0건"은 스캐너가 죽은 것이다.
    expect(all.length, "범위형 퍼센트를 하나도 못 찾았다 — 스캐너가 죽었다").toBeGreaterThan(0);

    const bare = all.filter((x) => !x.ok).map((x) => `${x.file}:${x.line} «${x.hit}»`);
    expect(
      bare,
      `근거 없이 범위를 주장하는 자리가 있다. 재서 쓰거나, 못 쟀다고 쓰거나, 수치를 빼라 →\n  ${bare.join("\n  ")}`,
    ).toEqual([]);
  });
});

/**
 * 🔴 noindex를 선언한 라우트에는 광고 코드가 실리면 안 된다 (2026-08-22).
 *
 * `app/[locale]/layout.tsx`가 광고 `<script>`를 뿌릴지 정하는 목록과, 각 페이지가
 * `noindex`를 선언하는 자리가 **서로 다른 파일에 손으로** 적혀 있다. 08-22에 실제로
 * 갈라져 있었다 — `/search`가 `noindex: true`인데 제외 목록에 없어서, 결과 0건인
 * `?q=…` 페이지(본문 31단어)에 광고 코드가 나가고 있었다.
 *
 * 색인이 안 되니 검색에는 안 뜨지만 **AdSense 심사 크롤러는 별도로 돈다**. 그리고
 * 우리가 다섯 번 받은 거절 사유가 "가치가 별로 없는 콘텐츠"다.
 *
 * 그래서 "목록에 /search를 넣었다"를 검사하지 않는다 — 그건 세 번째 손복사본이다.
 * **noindex를 선언한 라우트를 실제로 세어서**, 전부 제외 목록에 걸리는지 본다.
 */
describe("🔴 noindex 라우트에는 광고 코드가 없다", () => {
  const layout = readFileSync(new URL("../app/[locale]/layout.tsx", import.meta.url), "utf-8");

  const noindexRoutes = () => {
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true })) {
        const p = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(p);
        else if (e.name === "page.tsx") {
          const src = readFileSync(new URL(`../${p}`, import.meta.url), "utf-8");
          if (/noindex:\s*true|index:\s*false/.test(src)) {
            // app/[locale]/search/page.tsx → /search
            const seg = p.replace(/^app\/\[locale\]/, "").replace(/\/page\.tsx$/, "");
            if (seg) found.push(seg);
          }
        }
      }
    };
    walk("app/[locale]");
    return found;
  };

  it("noindex를 선언한 라우트가 실제로 있다 (양성 대조)", () => {
    // 0건이면 아래 검사는 아무것도 안 한 것이다.
    expect(noindexRoutes().length, "noindex 라우트를 하나도 못 찾았다 — 스캐너가 죽었다")
      .toBeGreaterThan(0);
  });

  it("noindex 라우트가 전부 광고 제외 목록에 걸린다", () => {
    const block = layout.slice(layout.indexOf("const isNoindexPath"), layout.indexOf("showAdSenseScript"));
    expect(block.length, "레이아웃에서 광고 조건 블록을 못 찾았다").toBeGreaterThan(50);

    const missing = noindexRoutes().filter((r) => !block.includes(`"${r}"`));
    expect(
      missing,
      `noindex인데 광고 제외 목록에 없다 → ${missing.join(", ")}\n` +
        `  app/[locale]/layout.tsx 의 isNoindexPath / isUtilityPath 에 추가할 것.`,
    ).toEqual([]);
  });

  it("광고 스크립트는 en + 제외되지 않은 경로에서만 뿌린다", () => {
    expect(layout).toMatch(/showAdSenseScript\s*=\s*locale === "en" && !isNoindexPath && !isUtilityPath/);
  });
});

/**
 * 🔴 없는 기능을 주장하지 않는다 — 주장을 코드·데이터에 묶는다 (2026-08-22).
 *
 * About의 "Why Choose Us" 카드가 **We prioritize seasonal ingredients**라고 말하고 있었다.
 * 메뉴 데이터에는 계절 필드가 아예 없고 `lib/`에 계절 로직도 없다. 없는 기능이었다.
 * FAQ도 같은 계열로 셋이었다 — "다섯 가지 식품군을 중심으로 설계", "balanced mix를 선택",
 * "레시피를 보통 매달 추가"(마지막 추가는 2026-07-15). 셋 다 사실이 아니었다.
 *
 * 이건 이 사이트가 다섯 번 거절당한 사유의 정확한 형태다 — 플래너 "AI 기반"(실제는
 * 결정적 알고리즘), FAQ "특가를 추적하지 않는다"(홈은 추적한다고 말함)와 같은 계열.
 *
 * 문자열을 하나씩 금지하면 두더지잡기가 된다(08-09에 그렇게 했다가 08-22에 열 곳이
 * 되살아나 있었다). 그래서 **주장이 참이 되려면 있어야 할 것**을 같이 검사한다.
 * 부정문은 파싱하지 않는다 — 긍정 표현만 잡으면 "…하지 않는다"는 자연히 통과한다.
 */
describe("🔴 없는 기능을 주장하지 않는다", () => {
  const LOCALES = ["en", "ko", "zh"] as const;
  const msgs = Object.fromEntries(
    LOCALES.map((l) => [
      l,
      readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8"),
    ]),
  );
  const libSrc = readdirSync(new URL("../lib/", import.meta.url))
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => readFileSync(new URL(`../lib/${f}`, import.meta.url), "utf-8"))
    .join("\n");

  it("계절 우선 선택을 주장하지 않는다 — 계절 데이터가 없다", () => {
    // 🔴 근거를 먼저 확인한다. 계절 필드가 생기면 이 가드는 스스로 무의미해져야 한다.
    const hasSeasonField = MENUS.some((m) =>
      Object.keys(m).some((k) => /season|month|winter|summer/i.test(k)),
    );
    // 🔴 2026-08-24: `/season/i` 는 **문자열 안의 낱말에도 걸린다.** lib/sundayShop.ts 가
    //    본문 줄 "Mandarins (in season) × 6" 을 키로 갖자 이 가드가 빨개졌다 —
    //    계절 로직이 생긴 게 아니라 남의 산문을 읽은 것이었다.
    //    식별자·속성으로 쓰인 season 만 본다.
    const hasSeasonLogic = /\bseason(al|s)?\s*[:=(]|\.season\b|\bseason(al)?[A-Z]\w*/i.test(libSrc);
    expect(
      hasSeasonField || hasSeasonLogic,
      "계절 데이터·로직이 생겼다면 이 가드를 지우고 문구를 되살려도 된다",
    ).toBe(false);

    const CLAIMS: Array<[string, RegExp]> = [
      ["en", /prioriti[sz]e[sd]?\s+seasonal\s+ingredients/i],
      ["ko", /제철\s*식재료를?\s*우선/],
      ["zh", /优先(选择|考虑)[^。]{0,12}时令食材/],
    ];
    for (const [l, re] of CLAIMS) {
      expect(re.test(msgs[l]), `${l}: 계절 우선 선택을 주장한다 — 그런 데이터가 없다`).toBe(false);
    }
  });

  it("식품군 기준 설계를 주장하지 않는다 — 그런 로직이 없다", () => {
    const hasFoodGroupLogic = /food[_ ]?group|foodGroup/i.test(libSrc);
    expect(hasFoodGroupLogic, "식품군 로직이 생겼다면 이 가드를 고칠 것").toBe(false);

    // 긍정 표현만 잡는다. "does not check … five food groups"는 통과해야 한다.
    const CLAIMS: Array<[string, RegExp]> = [
      ["en", /designed around the five food groups/i],
      ["ko", /5가지\s*식품군을\s*중심으로\s*설계/],
      ["zh", /围绕[^。]{0,14}五大食物类别设计/],
    ];
    for (const [l, re] of CLAIMS) {
      expect(re.test(msgs[l]), `${l}: 식품군 기준 설계를 주장한다 — 그런 로직이 없다`).toBe(false);
    }
  });

  it("플래너가 '영양 균형'을 맞춘다고 말하지 않는다 (카테고리 다양성이다)", () => {
    // planGenerator는 카테고리 다양성을 지킬 뿐 영양 구성을 검증하지 않는다.
    const gen = readFileSync(new URL("../lib/planGenerator.ts", import.meta.url), "utf-8");
    expect(gen, "planGenerator가 카테고리로 고른다는 전제가 깨졌다").toMatch(/m\.category ===/);

    expect(/selects a balanced mix/i.test(msgs.en), "en: 'balanced mix' 과장").toBe(false);
    expect(/균형\s*있게\s*선택/.test(msgs.ko), "ko: '균형 있게 선택' 과장").toBe(false);
    expect(/均衡的午餐菜单/.test(msgs.zh), "zh: '均衡的午餐菜单' 과장").toBe(false);
  });
});

/**
 * 🔴 `messages/*.json`은 금액·링크 가드의 **사각지대였다** (2026-08-22 발견).
 *
 * 기존 금액 가드는 `content/posts.ts`·`content/guides.ts`의 **지정된 블록만** 본다.
 * 그래서 이 세션에서 박스 중앙값을 $4 → $3.90으로 고쳤을 때 messages 사본들이
 * 그대로 남아, 홈·플래너·팁이 여전히 "$4 a day, roughly $20"이라고 말하고 있었다.
 * 같은 자리에서 치즈 예시도 $8.50(실제 $10.50)이었고, 그 1/4을 $2.10이라 적어
 * **산수까지 어긋나** 있었다.
 *
 * 그리고 JSON 메시지는 마크다운을 렌더하지 않는다. `[텍스트](/경로)`를 넣으면
 * **대괄호째 화면에 나온다** — 실제로 `/en/faq`에 그렇게 나가 있었다.
 */
describe("🔴 messages의 링크·금액", () => {
  const LOCALES = ["en", "ko", "zh"] as const;
  const load = (l: string) =>
    JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8")) as Record<string, unknown>;

  it("마크다운 링크를 넣지 않는다 — JSON 메시지는 렌더되지 않는다", () => {
    const MD = /\[[^\]\n]{2,60}\]\((?:\/|https?:)[^)\s]{2,120}\)/;
    let scanned = 0;
    const bad: string[] = [];
    for (const l of LOCALES) {
      for (const [k, v] of Object.entries(load(l))) {
        if (typeof v !== "string") continue;
        scanned++;
        if (MD.test(v)) bad.push(`${l}/${k}`);
      }
    }
    // 🔴 양성 대조 — 문자열을 못 읽었으면 "위반 0건"은 알리바이다.
    expect(scanned, "messages 문자열을 하나도 못 읽었다").toBeGreaterThan(300);
    expect(bad, `마크다운이 그대로 화면에 나온다 → ${bad.join(", ")}`).toEqual([]);
  });

  it("박스 중앙값·주간 합계가 파생값과 같다", () => {
    /**
     * 🔴 2026-08-23: 이 가드가 **키 두 개만** 보고 있었다(`planner_seo_price_p`,
     *    `home_tips_price_p`). 중앙값이 $3.90 → $3.80으로 움직였을 때 그 둘은 고쳤는데
     *    `home_stat_value`·`home_usecase3_desc`에 옛값이 3개 언어로 살아남아
     *    **라이브 홈에 $3.90이 그대로 떠 있었다.** 키를 열거하지 않고 모양으로 본다.
     */
    const median = boxMedianLabel();                    // "$3.80"
    const weekAmount = Number(median.slice(1)) * 5;     // 19
    const week = `$${weekAmount.toFixed(2)}`;           // "$19.00"
    const weekShort = Number.isInteger(weekAmount) ? `$${weekAmount}` : week; // "$19"
    const bad: string[] = [];
    let scanned = 0;
    for (const l of LOCALES) {
      for (const [k, v] of Object.entries(load(l))) {
        if (typeof v !== "string") continue;
        // 도시락 1통/주간 총액을 말하는 문장만 — 다른 금액(치즈 값 등)은 대상이 아니다.
        if (!/box|lunchbox|한 통|도시락|餐盒|5-day|5일|5天|week/i.test(v)) continue;
        scanned += 1;
        for (const m of v.matchAll(/\$\d+(?:\.\d{2})?/g)) {
          const amount = Number(m[0].slice(1));
          /**
           * 중앙값 근처인데 게시값과 다르면 낡은 것이다.
           * 🔴 처음엔 ±0.20이었는데 돌연변이 `$4.10`이 **밴드 밖이라 빠져나갔다.**
           *    ±0.60으로 넓히고, 측정값이 아닌 정책 수치("$3 미만")는 허용한다.
           */
          const POLICY_AMOUNTS = new Set(["$3"]); // "hold most days under $3"
          if (!POLICY_AMOUNTS.has(m[0]) &&
              Math.abs(amount - Number(median.slice(1))) <= 0.6 && m[0] !== median) {
            bad.push(`${l}/${k}: ${m[0]} (기대 ${median})`);
          }
          // 주간 합계 근처(±1.00)인데 게시값과 다르면 낡은 것이다.
          if (Math.abs(amount - Number(week.slice(1))) <= 1 && m[0] !== week && m[0] !== weekShort) {
            bad.push(`${l}/${k}: ${m[0]} (기대 ${weekShort})`);
          }
        }
      }
    }
    expect(scanned, "금액을 말하는 문구를 하나도 못 읽었다").toBeGreaterThan(5);
    expect(bad, `messages의 중앙값이 파생값과 다르다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });});

/**
 * 🔴 코드가 물고 있는 분석 도구는 개인정보 방침에 이름이 있어야 한다 (2026-08-23).
 *
 * `app/[locale]/layout.tsx`가 `<Analytics />`(@vercel/analytics)를 렌더하는데
 * 방침에는 Supabase·Resend·AdSense·GA4만 있었다. 실측해 보니 배포된 HTML에
 * `_vercel` 문자열이 0건이라 **지금은 수집이 없다** — Vercel 쪽에서 꺼져 있기 때문이다.
 *
 * 문제는 그게 **대시보드 토글 하나**라는 점이다. 켜지는 순간 수집이 시작되는데
 * 코드는 그대로라 방침을 고칠 계기가 없다. 그래서 "지금 켜져 있나"가 아니라
 * **"코드가 물고 있나"**를 기준으로 고지를 강제한다.
 *
 * Weekend Planner가 같은 자리에서 걸렸다(구독자 메일이 Resend로 나가는데 미고지).
 * 한 사이트에서 고친 건 다른 사이트에서도 본다.
 */
describe("🔴 코드가 쓰는 서비스는 방침에 있다", () => {
  const layout = readFileSync(new URL("../app/[locale]/layout.tsx", import.meta.url), "utf-8");
  const privacyOf = (l: string) => {
    const d = JSON.parse(
      readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8"),
    ) as Record<string, string>;
    return Object.entries(d)
      .filter(([k, v]) => k.startsWith("privacy") && typeof v === "string")
      .map(([, v]) => v)
      .join("\n");
  };

  const SERVICES: { name: string; usedWhen: RegExp; mustAppear: RegExp }[] = [
    { name: "Vercel Analytics", usedWhen: /@vercel\/analytics|<Analytics\b/, mustAppear: /Vercel/i },
  ];

  for (const s of SERVICES) {
    it(`${s.name}: 코드가 쓰면 3개 언어 방침에 이름이 있다`, () => {
      const used = s.usedWhen.test(layout);
      // 🔴 양성 대조 — 안 쓰고 있으면 이 검사는 아무것도 안 한 것이다.
      expect(used, `${s.name}이 레이아웃에서 사라졌다면 이 항목을 지울 것`).toBe(true);
      for (const l of ["en", "ko", "zh"]) {
        expect(
          s.mustAppear.test(privacyOf(l)),
          `${l}: 코드는 ${s.name}을 쓰는데 개인정보 방침에 없다`,
        ).toBe(true);
      }
    });
  }
});

/**
 * 🔴 가격지수 페이지가 자기 화면에 있는 열을 "없다"고 말하지 않는다 (2026-08-23).
 *
 * 표에는 `<th>New World</th>`가 있고 데이터도 살아 있는데(마지막 읽기에서 10품목),
 * 같은 페이지의 "What the Price Index does not include" 항목이
 * **"New World … is not in the index yet … on the roadmap"**이라고 말하고 있었다.
 * 도입부도 "two Auckland supermarkets"였다. 신뢰를 파는 페이지가 자기 화면을 부정한 셈이다.
 *
 * 개수는 이제 `threeWayRows()`에서 파생하므로 손으로 적힌 숫자가 없다.
 * 여기서는 **부재 주장이 되살아나지 않는지**만 지킨다.
 */
describe("🔴 가격지수는 자기 화면을 부정하지 않는다", () => {
  const page = readFileSync(new URL("../app/[locale]/price-index/page.tsx", import.meta.url), "utf-8");

  it("New World 열을 렌더하면서 '지수에 없다'고 말하지 않는다", () => {
    const rendersColumn = /<th[^>]*>\s*New World\s*<\/th>/.test(page);
    // 🔴 양성 대조 — 열이 사라졌다면 이 검사는 의미가 없고, 그때는 문구를 되살려야 한다.
    expect(rendersColumn, "New World 열이 없어졌다면 이 가드와 문구를 함께 고칠 것").toBe(true);

    const ABSENCE = [
      /not in the index yet/i,
      /on the roadmap for the next index revision/i,
      /expand to three\s+stores rather than two/i,
      /at two\s+Auckland supermarkets/i,
    ];
    const hit = ABSENCE.filter((re) => re.test(page)).map((re) => re.source);
    expect(hit, `표에 New World가 있는데 없다고 말한다 → ${hit.join(" · ")}`).toEqual([]);
  });

  it("개수를 손으로 적지 않는다 — threeWayRows에서 만든다", () => {
    expect(page, "threeWayCount 파생이 사라졌다").toMatch(/const threeWayCount = threeWayRows\(/);
    // 🔴 "어딘가에 {threeWayCount}가 있으면 통과"로 두면, 두 자리 중 한 곳만 하드코딩해도
    //    가드가 넘어간다(2026-08-23에 돌연변이로 실제 확인). 자리 수를 센다.
    const uses = (page.match(/\{threeWayCount\}/g) ?? []).length;
    expect(uses, `문구가 파생값을 쓰는 자리가 ${uses}곳뿐이다 — 도입부와 한계 항목 둘 다여야 한다`)
      .toBeGreaterThanOrEqual(2);
    // 그리고 그 두 문장에 맨 숫자가 끼어들지 않았는지 본다.
    for (const re of [/New\s+World on the ([^\s{]+) whose price/, /&mdash; ([^\s{]+) of the/]) {
      const m = page.match(re);
      if (m) expect(m[1], `개수를 손으로 적었다 → "${m[1]}"`).toMatch(/^\{/);
    }
  });
});

/**
 * 🔴 "제약 → 남는 메뉴 수 → 비율" 표는 **글마다 따로 산다**. 한 편만 보면 놓친다 (2026-08-23).
 *
 * 08-22에 알레르기 가이드의 `| Nuts | 89 | 94% |`를 95%로 고치면서 가드를 붙였는데,
 * 그 가드가 **그 한 편만** 봤다. 08-23에 다시 세어 보니 학교 정책 가이드에 같은 모양의
 * 표가 하나 더 있었고 세 행이 틀려 있었다:
 *   - Nut-free 94% (같은 반올림 오류의 두 번째 사본)
 *   - Dairy-free 46% (실제 47%)
 *   - 🔴 Gluten-free **25개** — 08-20에 셀리악 안전 문제로 23개로 고친 값인데 여기만 안 따라왔다.
 *
 * 그래서 이 가드는 슬러그를 지정하지 않는다. **모든 글·가이드에서 그 모양의 표를 찾아**
 * 라벨을 아는 것마다 데이터와 대조한다. 표가 새로 생겨도 자동으로 걸린다.
 */
describe("🔴 제약 표는 어느 글에 있든 데이터와 맞는다", () => {
  const PRED: Record<string, (m: MenuItem) => boolean> = {
    "nut-free": (m) => m.is_nut_free,
    "nuts": (m) => m.is_nut_free,
    "egg-free": (m) => m.is_egg_free,
    "dairy-free": (m) => m.is_dairy_free,
    "gluten-free": (m) => m.is_gluten_free,
    "vegetarian": (m) => m.is_vegetarian,
    "vegan": (m) => m.is_vegan,
    "nuts + egg": (m) => m.is_nut_free && m.is_egg_free,
    "nuts + dairy": (m) => m.is_nut_free && m.is_dairy_free,
    "nuts + gluten": (m) => m.is_nut_free && m.is_gluten_free,
    "nuts + dairy + egg": (m) => m.is_nut_free && m.is_dairy_free && m.is_egg_free,
    "nuts + dairy + egg + gluten": (m) =>
      m.is_nut_free && m.is_dairy_free && m.is_egg_free && m.is_gluten_free,
  };
  const ROW = /^\|\s*\*{0,2}([A-Za-z][A-Za-z +'-]*?)\*{0,2}\s*\|\s*\*{0,2}(\d{1,3})\*{0,2}\s*\|\s*\*{0,2}(\d{1,3})%\*{0,2}\s*\|/gm;

  const bodies: Array<[string, string]> = [
    ...Object.entries(POSTS).map(([s, p]) => [`post/${s}`, p.body] as [string, string]),
    ...Object.entries(GUIDES).map(([s, g]) => [`guide/${s}`, g.body] as [string, string]),
  ];

  it("라벨을 아는 행은 개수·비율이 전부 맞는다", () => {
    let matched = 0;
    const bad: string[] = [];
    for (const [where, body] of bodies) {
      for (const m of body.matchAll(ROW)) {
        const label = m[1].trim().toLowerCase();
        const pred = PRED[label];
        if (!pred) continue;
        matched++;
        const actual = count(pred);
        const pct = Math.round((actual / MENUS.length) * 100);
        if (Number(m[2]) !== actual) bad.push(`${where} «${m[1]}» 개수 ${m[2]} ≠ ${actual}`);
        if (Number(m[3]) !== pct) bad.push(`${where} «${m[1]}» 비율 ${m[3]}% ≠ ${pct}% (${actual}/${MENUS.length})`);
      }
    }
    // 🔴 양성 대조 — 표를 못 찾으면 "위반 0건"은 알리바이다. 08-23 기준 두 편에 걸쳐 12행이다.
    expect(matched, "제약 표 행을 하나도 못 찾았다 — 표 모양이 바뀌었으면 이 가드부터 고칠 것")
      .toBeGreaterThanOrEqual(10);
    expect(bad, `제약 표가 데이터와 다르다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });
});

/**
 * 🔴 홈의 "예시 주간 계획" — 금액은 **생성**이다 (2026-08-23 신설, 2026-09-15 전면 교체).
 *
 * 원래 다섯 날치 금액과 총액이 `app/[locale]/page.tsx`에 문자열로 박혀 있었다.
 * 그때 이 가드는 값을 고치지 못하고 **범위로** 묶었다 — 어떤 간식을 골랐는지 모르니
 * "메뉴 원가 ~ 메뉴 원가 + 가장 비싼 간식"이면 통과시켰다.
 *
 * 🔴 그 범위가 $2.20 폭이라 **드리프트를 원리상 못 잡았다.** 09-15에 실제로
 *    Chicken Pesto Panini가 $5.93으로 떠 있고 실제는 $6.43이었는데, 허용 구간
 *    $4.96~$7.16 한가운데라 가드는 초록이었다. 총액도 다섯 줄과 맞아 있었다 —
 *    다섯이 같이 낡으면 합계도 같이 낡는다. **내부 검산은 낡음을 못 본다.**
 *
 * 이제 금액은 `lib/servePrice.ts`가 만들고, 이 가드는 범위가 아니라 **값**을 본다.
 */
/**
 * 🔴 플래너 페이지의 5월 라운드 표 — 기록도 **한 곳**에서만 인용한다 (2026-09-15).
 *
 * 세 행의 여섯 금액과 라운드 날짜가 `app/[locale]/planner/page.tsx`에 손으로 적혀
 * 있었다. 값 자체는 `priceIndex.json`의 `history[0]`과 맞았지만, 같은 기록이 두 곳에
 * 살면 한쪽만 고치게 된다 — 그리고 실제로 그랬다.
 *
 * 🔴 **두 페이지가 서로를 반박하고 있었다.** 가격지수 페이지는 "an 8-pack wrap
 *    Woolworths does not sell"이라고 적어 두고 그 행을 2026-08-12에 6-pack으로
 *    재정의했는데, 플래너 페이지는 같은 시각에 **Woolworths 8-pack $5.00**을 싣고
 *    있었다. 5월 기록은 1차 자료라 지우지 않는다 — 대신 그 뒤에 무슨 일이
 *    있었는지 페이지가 스스로 말한다.
 */
/**
 * 🔴 「분량 비용이 뭔가」 예시의 숫자는 생성이어야 한다 (2026-09-15).
 *
 * 3개 언어 UI 문구에 "a block of cheese costs $10.50 (the index price on 17 August 2026)
 * … the portion cost shown will be about $2.63"이 손으로 박혀 있었다.
 * 실측하면 치즈 팩값은 $8.50이고 캐시는 9월이다 — 가격이 24% 낡았다.
 *
 * 🔴 그리고 **화면이 그렇게 안 찍는다.** 바로 앞 문장이 분량 비용을 "한 끼에 쓰는 양"
 *    이라고 정의해 놓고 예시는 한 주치를 「표시되는 분량 비용」이라고 말했다.
 *    기존 messages 가드는 도시락 중앙값 근처(±0.60)와 주간 합계 근처(±1.00)만 봐서
 *    $10.50·$2.63은 **두 밴드 밖이라 원리상 안 보였다.**
 */
/**
 * 🔴 「1인분 vs 조리법 투입량」 예시도 생성이어야 한다 (2026-09-15).
 *
 * 3개 언어에 "if one egg costs $0.83, the three-egg roll costs $2.49"로 적혀 있었다.
 * 실측하면 계란 1회분은 70c다(×3 = $2.10) — 19% 높았다.
 *
 * 🔴 이 문장은 독자에게 **화면을 보고 직접 곱해 보라고** 권한다. 화면은 70c를 찍는다.
 *    독자가 시키는 대로 하면 곧바로 어긋나는 문장이었다.
 */
/**
 * 🔴 한 글 안에 「1인분 원가」 표가 둘이면, 하나는 반드시 낡는다 (2026-09-15).
 *
 * 실측 두 건:
 *  - `iron-rich-lunchbox-foods-nz` — 위 표는 생성(소고기 다짐육 $2.55), 네 문단 뒤
 *    손글씨 표가 같은 열 이름("Cost per Lunchbox Serve")으로 ~$0.70을 실었다.
 *  - `easy-wraps-for-school-lunches-nz` — 글이 **스스로 "정정합니다"**라고 쓰고
 *    생성 표로 빵 44c를 보인 뒤, 200줄 아래 손글씨 표가 빵을 ~$0.28로 되돌렸다.
 *
 * 🔴 기존 금액 가드는 **여섯 블록을 열거**한다. 목록 밖에 새 표가 생기면 기본값이
 *    「안 봄」이다 — #74(JSX)·#76(messages)가 같은 자리에서 났다. 그래서 목록이 아니라
 *    **규칙**으로 건다: 원가 표가 둘 이상이고 그중 하나라도 손글씨면 실패.
 *    둘 다 생성이면 같은 출처라 어긋날 수 없으므로 통과시킨다.
 */
/**
 * 🔴 개수 가드가 **플래너 페이지 한 파일만** 보고 있었다 (2026-09-15).
 *
 * 그 가드(「planner 본문의 개수는 손으로 적지 않는다」)는 2026-08-13에 만들어졌다.
 * 그때 이유는 정확했다 — 한 페이지가 "94 recipes"와 "43 lunch recipes"를 동시에
 * 말하고 있었다. 그런데 **보는 범위가 그 파일 하나**였다.
 *
 * 전수로 훑으니 같은 "94"가 손으로 적힌 자리가 더 있었다:
 *   content/guides.ts 3곳 · content/posts.ts 1곳 · messages/{en,ko,zh}.json 9곳
 * 값은 전부 맞았다 — 메뉴가 하나 늘기 전까지만. 금액 가드가 여섯 블록을 열거해서
 * #74·#76·#78을 놓친 것과 **같은 모양**이다. 그래서 목록이 아니라 corpus 전체를 본다.
 */
/**
 * 🔴 방침 본문이 바뀌면 시행일도 바뀌어야 한다 (2026-09-15 실측).
 *
 * 화면은 "Effective Date: February 11, 2026"이라고 말하고 있었는데, 방침 본문은
 * 그 뒤로 **세 번** 바뀌었다:
 *   2026-04-17 NZ Privacy Act 2020 명시 · 2026-08-10 계정 설명 정정 ·
 *   2026-08-23 **Vercel(호스팅·Analytics)을 처리자로 추가**
 * 처리자를 새로 넣고 시행일을 그대로 두면, 이용자가 **언제 바뀐 조건에 동의한
 * 것인지** 화면이 거짓으로 말한다. 애드센스/GDPR 심사가 보는 자리이기도 하다.
 *
 * 🔴 날짜만 고치면 다음에 또 잊는다. 본문 **지문**을 고정해 두고, 지문이 달라지면
 *    실패시킨다 — 이력에 줄을 넣고 지문을 갱신하는 행위가 곧 「시행일을 고쳤는가」를
 *    묻는 자리가 된다. 날짜를 잊는 것이 불가능해진다.
 */
describe("🔴 방침·약관 시행일은 본문 개정과 함께 움직인다", () => {
  it("본문 지문이 고정값과 같다 — 다르면 이력에 줄을 넣고 지문을 갱신할 것", () => {
    expect(
      policyFingerprint("privacy_"),
      "개인정보 방침 본문이 바뀌었다. lib/policyRevisions.ts 의 PRIVACY_REVISIONS 에 " +
        "개정 줄을 넣고 PRIVACY_FINGERPRINT 를 새 값으로 바꿀 것 — 시행일이 같이 움직인다.",
    ).toBe(PRIVACY_FINGERPRINT);
    expect(
      policyFingerprint("terms_"),
      "약관 본문이 바뀌었다. TERMS_REVISIONS 와 TERMS_FINGERPRINT 를 같이 고칠 것.",
    ).toBe(TERMS_FINGERPRINT);
  });

  it("지문이 본문에 실제로 반응한다 (양성 대조)", () => {
    // 🔴 지문이 상수를 돌려주기만 해도 위 검사는 통과한다. 실제로 본문을 보는지 확인한다.
    const a = policyFingerprint("privacy_");
    const b = policyFingerprint("terms_");
    expect(a, "두 지문이 같다 — 접두사를 안 보고 있다").not.toBe(b);
    expect(a).toMatch(/^\d+:[0-9a-f]+$/);
    // 키를 하나도 못 읽었으면 개수가 0이 된다
    expect(Number(a.split(":")[0]), "privacy_ 키를 하나도 못 읽었다").toBeGreaterThan(10);
    expect(Number(b.split(":")[0]), "terms_ 키를 하나도 못 읽었다").toBeGreaterThan(10);
  });

  it("이력이 날짜순이고, 화면 값이 마지막 줄이다", () => {
    for (const [name, rs] of [["PRIVACY", PRIVACY_REVISIONS], ["TERMS", TERMS_REVISIONS]] as const) {
      expect(rs.length, `${name}_REVISIONS 가 비었다`).toBeGreaterThan(0);
      const dates = rs.map((r) => r.date);
      expect(dates, `${name}_REVISIONS 가 날짜순이 아니다`).toEqual([...dates].sort());
      for (const d of dates) expect(d, `${name}: 날짜 모양이 아니다 — ${d}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(privacyEffective()).toBe(PRIVACY_REVISIONS[PRIVACY_REVISIONS.length - 1].date);
    expect(termsUpdated()).toBe(TERMS_REVISIONS[TERMS_REVISIONS.length - 1].date);
  });

  it("🔴 방침이 코드가 무는 처리자를 실제로 담고 있다", () => {
    // 2026-08-23에 이 이력이 생긴 이유 자체를 지킨다 — 고지가 사라지면 red.
    const en = JSON.parse(
      readFileSync(new URL("../messages/en.json", import.meta.url), "utf-8"),
    ) as Record<string, string>;
    const all = Object.entries(en).filter(([k]) => k.startsWith("privacy_")).map(([, v]) => v).join(" ");
    for (const svc of ["Supabase", "Resend", "Vercel"]) {
      expect(all, `방침에 ${svc} 고지가 없다`).toContain(svc);
    }
  });
});

describe("🔴 개수는 어느 파일에서도 손으로 적지 않는다", () => {
  const CORPUS = [
    "content/posts.ts",
    "content/guides.ts",
    "messages/en.json",
    "messages/ko.json",
    "messages/zh.json",
    "app/[locale]/page.tsx",
    "app/[locale]/planner/page.tsx",
    "app/[locale]/faq/page.tsx",
  ];
  /** 세는 대상의 명사 — 이 말 앞의 두 자리 이상 숫자는 파생이어야 한다. */
  const NOUNS = /(recipes|menus|meals|snacks|레시피|개 레시피|道食谱|份食谱)/;

  const scan = () => {
    const bad: string[] = [];
    let scanned = 0;
    for (const rel of CORPUS) {
      const src = readFileSync(new URL("../" + rel, import.meta.url), "utf-8");
      src.split("\n").forEach((raw, i) => {
        // 생성 보간(`${…}`)과 ICU 자리표시자(`{menuCount}`)는 지운다 — 그게 정답이다.
        const line = raw
          .replace(/\$\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, "@GEN@")
          .replace(/\{[a-zA-Z][a-zA-Z0-9_]*\}/g, "@ICU@");
        scanned++;
        for (const m of line.matchAll(
          // 🔴 숫자를 2~3자리로 묶는다. 4자리를 허용하면 "2026 … snacks"처럼
          //    **연도**가 걸린다(실측: content/posts.ts:5881). 개수는 전부 2~3자리다.
          new RegExp(`\\b(\\d{2,3})\\b\\s*(?:[a-zA-Z'’\\-]+\\s+){0,3}${NOUNS.source}`, "g"),
        )) {
          bad.push(`${rel}:${i + 1}  "${m[0].trim()}"`);
        }
      });
    }
    return { bad, scanned };
  };

  it("줄을 실제로 읽어냈다 (양성 대조)", () => {
    const { scanned } = scan();
    expect(scanned, "corpus를 하나도 못 읽었다").toBeGreaterThan(2000);
  });

  it("「<숫자> … recipes|menus|meals|snacks」가 리터럴로 없다", () => {
    const { bad } = scan();
    expect(
      bad,
      `개수를 손으로 적었다 — @/lib/menuCounts 에서 가져오거나 ICU 자리표시자로 넘길 것:\n  ${bad.join("\n  ")}`,
    ).toEqual([]);
  });

  it("messages의 {menuCount}를 세 로케일이 모두 쓰고, 호출부가 값을 넘긴다", () => {
    for (const l of ["en", "ko", "zh"]) {
      const raw = readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8");
      expect((raw.match(/\{menuCount\}/g) ?? []).length, `${l}: {menuCount} 가 없다`)
        .toBeGreaterThan(0);
    }
    for (const rel of ["app/[locale]/faq/page.tsx", "app/[locale]/planner/page.tsx"]) {
      const src = readFileSync(new URL("../" + rel, import.meta.url), "utf-8");
      expect(src, `${rel}: menuCount 를 안 넘긴다`).toContain("menuCount:");
    }
  });

  it("조리 방식 개수가 데이터와 같다 — 기대값도 데이터에서 뽑는다", async () => {
    const c = await import("./menuCounts");
    const styles = MENUS.map((m) => (m as unknown as { prep_style?: string }).prep_style);
    expect(c.NO_COOK_COUNT).toBe(styles.filter((s) => s === "no-cook").length);
    expect(c.MAKE_AHEAD_COUNT).toBe(styles.filter((s) => s === "make-ahead").length);
    expect(c.COOK_FRESH_COUNT).toBe(styles.filter((s) => s === "cook-fresh").length);
    // 세 갈래가 전체를 덮는지 — 새 prep_style 이 생기면 비율 문장이 조용히 틀어진다
    expect(c.NO_COOK_COUNT + c.MAKE_AHEAD_COUNT + c.COOK_FRESH_COUNT).toBe(c.MENU_COUNT);
    expect(c.AHEAD_OR_NOCOOK_PCT).toBe(
      Math.round(((c.MAKE_AHEAD_COUNT + c.NO_COOK_COUNT) / c.MENU_COUNT) * 100),
    );
  });
});

describe("🔴 한 글에 원가 표가 둘이면 하나는 손글씨가 아니어야 한다", () => {
  const COST_HEADER =
    /\|[^|\n]*\b(cost per (serve|lunch|box|day)|per serve|serve cost|portion cost)\b[^|\n]*\|/i;
  const MONEY = /\$\s?\d[\d,]*(?:\.\d+)?|\b\d+\s?c\b/g;
  const GEN = /\$\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;

  const scan = (rel: string) => {
    const src = readFileSync(new URL("../" + rel, import.meta.url), "utf-8");
    const marks: Array<[number, string]> = [];
    const re = /\n {2}"([a-z0-9-]+)": \{/g;
    for (let m = re.exec(src); m; m = re.exec(src)) marks.push([m.index, m[1]]);
    const out: { slug: string; tables: { gen: number; hand: number; head: string }[] }[] = [];
    marks.forEach(([pos, slug], i) => {
      const end = i + 1 < marks.length ? marks[i + 1][0] : src.length;
      const seg = src.slice(pos, end);
      const bi = seg.indexOf("body: `");
      if (bi === -1) return;
      const lines = seg.slice(bi).split("\n");
      const tables: { gen: number; hand: number; head: string }[] = [];
      lines.forEach((line, li) => {
        if (!COST_HEADER.test(line)) return;
        const rows: string[] = [];
        for (let k = li + 1; k < lines.length && lines[k].trim().startsWith("|"); k++) rows.push(lines[k]);
        const joined = rows.join("\n");
        tables.push({
          gen: (joined.match(/\$\{/g) ?? []).length,
          hand: (joined.replace(GEN, "").match(MONEY) ?? []).length,
          head: line.trim().slice(0, 70),
        });
      });
      if (tables.length) out.push({ slug, tables });
    });
    return out;
  };

  const FILES = ["content/posts.ts", "content/guides.ts"];

  it("원가 표를 실제로 찾아냈다 (양성 대조)", () => {
    // 🔴 표를 하나도 못 읽으면 아래 「위반 0건」은 알리바이다.
    const n = FILES.flatMap(scan).reduce((t, a) => t + a.tables.length, 0);
    expect(n, "원가 표를 하나도 못 찾았다 — 표 모양이 바뀌었으면 이 가드부터 고칠 것")
      .toBeGreaterThan(8);
  });

  it("생성 표와 손글씨 표가 같은 글에 공존하지 않는다", () => {
    const bad: string[] = [];
    for (const rel of FILES) {
      for (const { slug, tables } of scan(rel)) {
        const withMoney = tables.filter((t) => t.gen + t.hand > 0);
        if (withMoney.length < 2) continue;
        if (!withMoney.some((t) => t.hand > 0)) continue; // 전부 생성이면 어긋날 수 없다
        bad.push(
          `${slug} → ` + withMoney.map((t) => `[생성 ${t.gen}/손글씨 ${t.hand}] ${t.head}`).join(" ‖ "),
        );
      }
    }
    expect(
      bad,
      `한 글에 원가 표가 둘 이상인데 하나가 손글씨다 — 반드시 갈라진다:\n  ${bad.join("\n  ")}`,
    ).toEqual([]);
  });
});

describe("🔴 조리법 투입량 예시는 데이터에서 나온다", () => {
  const L3 = ["en", "ko", "zh"] as const;
  const KEY = "planner_portion_vs_method";
  const HOLES = ["eggOne", "eggCount", "eggMany"] as const;
  const load = (l: string) =>
    JSON.parse(
      readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8"),
    ) as Record<string, string>;

  it("3개 언어 모두 자리표시자를 쓰고 옛 수치가 없다", () => {
    for (const l of L3) {
      const v = load(l)[KEY];
      for (const h of HOLES) expect(v, `${l}: {${h}} 가 없다`).toContain(`{${h}}`);
      for (const stale of ["$0.83", "$2.49"])
        expect(v, `${l}: 옛 수치 ${stale} 가 남아 있다`).not.toContain(stale);
    }
  });

  it("곱셈이 실제로 맞는다 (양성 대조)", () => {
    const ex = methodExample();
    const one = ex.one.endsWith("c") ? Number(ex.one.slice(0, -1)) / 100 : Number(ex.one.slice(1));
    expect(one, "1회분을 못 읽었다").toBeGreaterThan(0);
    expect(Number(ex.many.slice(1)), `${ex.one} × ${ex.count} ≠ ${ex.many}`)
      .toBeCloseTo(one * ex.count, 2);
  });

  it("클라이언트가 값을 직접 계산하지 않는다 — 서버에서 받는다", () => {
    const client = readFileSync(new URL("../components/PlannerClient.tsx", import.meta.url), "utf-8");
    // 🔴 여기서 price_cache를 import하면 클라이언트 번들에 가격 캐시가 통째로 실린다.
    expect(client, "PlannerClient가 servePrice를 직접 import한다")
      .not.toMatch(/from\s+"@\/lib\/servePrice"/);
    // import 문만 본다 — 주석에 파일 이름이 나오는 건 위반이 아니다.
    const imports = [...client.matchAll(/^import[^;]+;/gm)].map((m) => m[0]).join("\n");
    expect(imports, "PlannerClient가 price_cache를 직접 import한다").not.toContain("price_cache");
    for (const h of HOLES) expect(client, `${h} 를 안 넘긴다`).toContain(`${h}:`);

    const page = readFileSync(new URL("../app/[locale]/planner/page.tsx", import.meta.url), "utf-8");
    expect(page, "서버 페이지가 methodExample을 안 넘긴다").toContain("methodExample={methodExample()}");
  });
});

describe("🔴 분량 비용 예시는 데이터에서 나온다", () => {
  const load = (l: string) =>
    JSON.parse(
      readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8"),
    ) as Record<string, string>;
  const L3 = ["en", "ko", "zh"] as const;
  const KEY = "home_tips_price_p";
  const HOLES = ["cheesePack", "cheesePackPrice", "cheeseServes", "cheeseServe"] as const;

  it("3개 언어 모두 자리표시자를 쓴다", () => {
    for (const l of L3) {
      const v = load(l)[KEY];
      expect(v, `${l}: ${KEY} 가 없다`).toBeTruthy();
      for (const h of HOLES) expect(v, `${l}: {${h}} 가 없다`).toContain(`{${h}}`);
    }
  });

  it("옛 손글씨 수치가 남아 있지 않다", () => {
    const STALE = ["$10.50", "$2.63", "17 August 2026", "8월 17일", "8 月 17 日", "四分之一", "a quarter"];
    for (const l of L3) {
      const v = load(l)[KEY];
      const found = STALE.filter((x) => v.includes(x));
      expect(found, `${l}: 옛 예시 수치가 남아 있다 → ${found.join(", ")}`).toEqual([]);
    }
  });

  it("자리표시자를 채우면 실제 값이 들어간다 (양성 대조)", () => {
    const ex = portionExample();
    // 🔴 값 자체가 비어 있으면 위 검사들은 전부 알리바이다.
    expect(ex.pack).toMatch(/\d/);
    expect(ex.packPrice).toMatch(/^\$\d/);
    expect(ex.serves).toBeGreaterThan(1);
    expect(ex.serve).toMatch(/\d/);
    // 1회분은 팩값보다 **반드시** 싸다 — 이 예시가 말하려는 게 정확히 그것이다.
    const serveNum = ex.serve.endsWith("c") ? Number(ex.serve.slice(0, -1)) / 100 : Number(ex.serve.slice(1));
    expect(serveNum, "1회분이 팩값보다 싸지 않다").toBeLessThan(Number(ex.packPrice.slice(1)));

    for (const l of L3) {
      const filled = load(l)[KEY]
        .replaceAll("{cheesePack}", ex.pack)
        .replaceAll("{cheesePackPrice}", ex.packPrice)
        .replaceAll("{cheeseServes}", String(ex.serves))
        .replaceAll("{cheeseServe}", ex.serve);
      expect(filled, `${l}: 채운 뒤에도 자리표시자가 남았다`).not.toMatch(/\{cheese\w+\}/);
      expect(filled, `${l}: 채운 문장에 팩값이 없다`).toContain(ex.packPrice);
      expect(filled, `${l}: 채운 문장에 1회분 값이 없다`).toContain(ex.serve);
    }
  });

  it("홈이 그 자리표시자를 전부 넘긴다", () => {
    const home = readFileSync(new URL("../app/[locale]/page.tsx", import.meta.url), "utf-8");
    const i = home.indexOf(`t("${KEY}"`);
    expect(i, "홈이 home_tips_price_p 를 안 쓴다").toBeGreaterThan(-1);
    const call = home.slice(i, i + 500);
    for (const h of HOLES) expect(call, `홈이 ${h} 를 안 넘긴다`).toContain(`${h}:`);
  });
});

describe("🔴 플래너의 5월 라운드 표는 기록에서 나온다", () => {
  const page = readFileSync(new URL("../app/[locale]/planner/page.tsx", import.meta.url), "utf-8");
  const SHOWN = ["Wholegrain Bread (700g)", "Wraps 8-pack", "Bagels 4-pack"] as const;

  it("페이지가 인용하는 이름 목록이 이 가드와 같다 (양성 대조)", () => {
    // 🔴 목록이 어긋나면 아래 검사는 **다른 표**를 재게 된다.
    for (const n of SHOWN) expect(page, `${n} 가 페이지에 없다`).toContain(n);
    expect(page, "페이지가 firstRoundRows를 안 쓴다").toContain("firstRoundRows(MAY_ROWS_SHOWN)");
  });

  it("JSX에 손으로 적은 금액·날짜가 없다", () => {
    const lits = [...page.matchAll(/\$\d+\.\d{2}/g)].map((m) => m[0]);
    expect(lits, `플래너에 손으로 적은 금액이 있다 → ${lits.join(", ")}`).toEqual([]);
    expect(page, "라운드 날짜가 손으로 적혀 있다").not.toMatch(/\d{1,2} May 2026/);
  });

  it("표의 값이 history[0]과 같다", () => {
    const rows = firstRoundRows(SHOWN);
    expect(rows).toHaveLength(3);
    const hist = (index as unknown as {
      history?: { items: { name: string; countdown: number | null; paknsave: number | null }[] }[];
    }).history?.[0];
    expect(hist, "priceIndex.json 에 history[0] 이 없다").toBeTruthy();
    for (const r of rows) {
      const h = hist!.items.find((i) => i.name === r.name);
      expect(h, `${r.name} 이 history[0] 에 없다`).toBeTruthy();
      expect(r.woolworths, r.name).toBe(h!.countdown);
      expect(r.paknsave, r.name).toBe(h!.paknsave);
    }
  });

  it("이름이 바뀌면 조용히 빠지지 않고 던진다", () => {
    expect(() => firstRoundRows(["Definitely Not A Real Row"])).toThrow(/5월 라운드/);
  });

  it("그 사이 규격이 바뀐 행이 있으면 페이지가 그걸 말한다", () => {
    const changed = respecifiedSince(SHOWN);
    // 🔴 양성 대조 — 지금 실제로 한 행(Wraps 8-pack)이 바뀐 상태다. 0이면 이 검사는 빈 검사다.
    expect(changed.length, "재정의된 행이 하나도 없다 — 이 가드가 아무것도 안 지키고 있다")
      .toBeGreaterThan(0);
    expect(page, "재정의를 말하는 분기가 페이지에 없다").toContain("respecifiedSince(MAY_ROWS_SHOWN)");
    expect(page).toContain("re-pinned");
  });
});

describe("🔴 홈 예시 계획의 금액", () => {
  const page = readFileSync(new URL("../app/[locale]/page.tsx", import.meta.url), "utf-8");

  it("JSX에 손으로 적은 금액이 없다", () => {
    const i = page.indexOf("exampleWeekRows()");
    expect(i, "홈이 exampleWeekRows()를 안 쓴다 — 금액이 다시 리터럴이 됐다").toBeGreaterThan(-1);
    const lits = [...page.matchAll(/\$\d+\.\d{2}/g)].map((m) => m[0]);
    expect(lits, `홈에 손으로 적은 금액이 있다 → ${lits.join(", ")}`).toEqual([]);
  });

  it("행과 총액을 실제로 만들어냈다 (양성 대조)", () => {
    const rows = exampleWeekRows();
    expect(rows.length, "예시 행이 5개가 아니다").toBe(5);
    for (const r of rows) expect(Number(r.cost.slice(1)), r.menu).toBeGreaterThan(0);
    expect(Number(exampleWeekTotal().slice(1))).toBeGreaterThan(0);
  });

  it("총액이 행 합계와 같다", () => {
    const sum = exampleWeekRows().reduce((t, r) => t + Number(r.cost.slice(1)), 0);
    // 센트 반올림이 다섯 번 쌓이므로 5c 안이면 같은 계산이다.
    expect(Math.abs(sum - Number(exampleWeekTotal().slice(1)))).toBeLessThan(0.05);
  });

  it("각 행이 사이트의 통 정의와 **정확히** 같다 — 메인 + 간식 두 칸", () => {
    const cost = (ings: string[]) =>
      ings.reduce(
        (t, i) => t + ((PRICES as unknown as Record<string, { data?: { price?: number } }>)[i]
          ?.data?.price ?? 0) * (PORTION_FACTORS[i] ?? DEFAULT_PORTION),
        0,
      );
    for (const r of exampleWeekRows()) {
      const m = MENUS.find((x) => x.name === r.menu);
      expect(m, `예시에 없는 메뉴가 있다: ${r.menu}`).toBeTruthy();
      expect(Number(r.cost.slice(1)), r.menu)
        .toBeCloseTo(cost(m!.ingredients as string[]) + snackSlotsCost(), 2);
    }
  });

  it("예시 메뉴 이름이 바뀌면 0원이 아니라 던진다", () => {
    const names = new Set(MENUS.map((m) => m.name));
    for (const r of EXAMPLE_WEEK) expect(names, `${r.menu} 가 menuData에 없다`).toContain(r.menu);
  });
});

/**
 * 🔴 읽기 시간은 손으로 적지 않는다 (2026-08-23).
 *
 * 25편 중 **10편이 어긋나 있었다**. 가이드 7편은 실제의 1.6~2배로 부풀려져 있었고
 * (2,346단어에 "20 min read"), 블로그 3편은 모자랐다 — gluten-free가 3,900단어인데
 * "13 min read". 그중 둘은 이 세션에 내가 본문을 늘린 글이다.
 *
 * 저장소에 같은 전례가 이미 적혀 있었는데도 다시 어긋났다. 손으로 적는 한 반복된다.
 * 이제 `lib/readTime.ts`가 본문에서 만든다 — 이 가드는 **그 상태가 유지되는지**만 본다.
 */
describe("🔴 읽기 시간은 본문에서 만든다", () => {
  const raw = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf-8");

  it("콘텐츠 파일에 손으로 적은 readTime이 없다", () => {
    for (const f of ["content/posts.ts", "content/guides.ts"]) {
      const hits = raw(f).match(/^\s*readTime:\s*"/gm) ?? [];
      expect(hits, `${f}에 손으로 적은 readTime이 ${hits.length}개 있다`).toEqual([]);
    }
  });

  it("모든 글의 readTime이 본문 분량과 일치한다", () => {
    const all = [...Object.entries(POSTS), ...Object.entries(GUIDES)];
    // 🔴 양성 대조 — 항목을 못 읽으면 "위반 0건"은 알리바이다.
    expect(all.length, "글을 하나도 못 읽었다").toBeGreaterThan(20);
    const bad: string[] = [];
    for (const [slug, e] of all) {
      const want = readTimeFor(e.body);
      if (e.readTime !== want) bad.push(`${slug}: "${e.readTime}" ≠ "${want}"`);
    }
    expect(bad, `읽기 시간이 본문과 어긋난다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("분량을 늘리면 읽기 시간도 늘어난다 (파생이 살아 있다)", () => {
    const one = Object.values(POSTS)[0];
    const longer = readTimeFor(one.body + " word".repeat(2000));
    expect(longer).not.toBe(one.readTime);
  });
});

/**
 * 🔴 2026-08-23: 영양 가이드의 NRV 표가 통째로 근거 없이 적혀 있었다.
 *
 * "Daily Totals (Ages 5-12)"라는 표에 다섯 줄이 "Daily Recommended"로 실려 있었는데,
 * 보건부 배경문서를 직접 읽어 보니:
 *   - **탄수화물과 지방은 아예 권장량이 없다.** RDI·AI·UL 어느 것도 설정되지 않았고
 *     %에너지 범위(AMDR)조차 14세 이상에만 적용된다. 우리는 없는 권장량을 지어냈다.
 *   - 섬유질 상한을 22g으로 적었는데 9–13세 남아 AI는 **24g**이다.
 *   - 나이 구간 "5-12"는 NRV의 어느 구간(4–8, 9–13)과도 맞지 않는다.
 *   - "수분 1–1.2L"는 4–8세 AI 1.2L보다 낮게 시작한다.
 * 건강 수치(YMYL)라 가장 위험한 종류의 오류였다. 전부 표 번호까지 출처를 달아 고쳤다.
 *
 * 이 가드는 **모양이 아니라 값**을 본다 — 표에서 숫자를 뽑아 보건부 표와 대조한다.
 */
describe("🔴 영양 가이드의 NRV 수치는 보건부 표와 일치한다", () => {
  const NUTRITION = GUIDES["complete-nutrition-guide-school-lunches-nz"];
  const body = NUTRITION.body;

  /** 보건부 *Food and Nutrition Guidelines … A background paper* (2015 개정판) */
  const MOH_URL =
    "https://www.health.govt.nz/publications/food-and-nutrition-guidelines-for-healthy-children-and-young-people-aged-2-18-years-a-background";

  /** 표 8·14·33에서 직접 옮긴 값. 여기를 고치려면 PDF를 다시 읽을 것. */
  const NRV_ROWS: { label: string; age4to8: string; age9to13: string }[] = [
    { label: "Protein", age4to8: "20g/day", age9to13: "40g boys, 35g girls" }, // 표 14
    { label: "Fibre", age4to8: "18g/day", age9to13: "24g boys, 20g girls" }, // 표 8
    { label: "Fluids from drinks", age4to8: "1.2L/day", age9to13: "1.6L boys, 1.4L girls" }, // 표 33
  ];

  /**
   * NRV 표 **안에서만** 첫 칸이 `label`인 줄을 찾는다.
   * 🔴 처음엔 본문 전체에서 찾았는데 식품군 **원가** 표의 `| Protein | Sliced salami |`이
   *    먼저 걸렸다. 같은 첫 칸을 쓰는 표가 둘이면 범위를 좁히지 않은 쪽이 진다.
   */
  const nrvTable = () => {
    const head = body.indexOf("| What kind of figure this is |");
    if (head < 0) return "";
    const rest = body.slice(head);
    const end = rest.indexOf("\n\n");
    return end < 0 ? rest : rest.slice(0, end);
  };
  const rowFor = (label: string) =>
    nrvTable()
      .split("\n")
      .find((l) => l.startsWith(`| ${label} |`)) ?? "";

  it("출처가 본문에 있다 (보건부 배경문서 + 표 번호)", () => {
    expect(body, "보건부 배경문서 링크가 없다").toContain(MOH_URL);
    expect(body, "어느 표에서 온 값인지 밝히지 않았다").toMatch(
      /Tables?\s+5,\s*7,\s*8,\s*12,\s*14 and 33/,
    );
  });

  it.each(NRV_ROWS)("$label 행이 NRV 값과 같다", ({ label, age4to8, age9to13 }) => {
    const row = rowFor(label);
    expect(row, `"${label}" 행을 표에서 못 찾았다 — 표가 사라졌거나 이름이 바뀌었다`).not.toBe("");
    expect(row, `${label} 4–8세 값이 다르다`).toContain(age4to8);
    expect(row, `${label} 9–13세 값이 다르다`).toContain(age9to13);
  });

  it("권장량이 없는 영양소(탄수화물·지방·에너지)를 권장량처럼 적지 않는다", () => {
    // 보건부: "insufficient data ... to set an RDI, AI or UL" — 셋 다 설정된 값이 없다.
    for (const label of ["Energy", "Carbohydrate", "Fat"]) {
      const row = rowFor(label);
      expect(row, `"${label}" 행이 표에 없다`).not.toBe("");
      expect(
        row,
        `${label}에 권장량이 있는 것처럼 적혀 있다 → ${row}`,
      ).toContain("*none set*");
    }
  });

  it("표 머리글이 '권장량'과 '실제 섭취량'을 구분한다", () => {
    expect(body).toContain("| What kind of figure this is |");
    expect(body, "실제 섭취량 표시가 없다").toMatch(/Median intake:/);
  });

  it("수분 권장량은 '음료에서'라고 밝힌다 (총수분과 다른 값이다)", () => {
    expect(body).toMatch(/fluids from drinks/i);
  });
});

/**
 * 🔴 2026-08-23: 유병률·권고 수치 네 건이 1차 출처와 반대 방향이었다.
 *
 *   - "Most NZ children eat less than half the recommended fibre" → 실제 중앙값은
 *     AI의 **85~95%**다(15–21g 대 18–24g). "절반 미만"은 그냥 틀렸다.
 *   - "Many NZ children … are low in iron" → 2002년 조사 부족 섭취는 **6.6%**.
 *     방향(월경 시작한 여아 43.9%)은 맞지만 크기가 틀렸다.
 *   - "WHO recommends children consume less than 25g of free sugars per day" →
 *     WHO 권고는 **총에너지의 10% 미만**이고, 25g은 성인 2,000kcal의 5% 수치다.
 *   - 인용 "(Massey University and the Ministry of Education, 2022)" → 그 평가서는
 *     **Massey와 무관한** 교육부 내부 보고서다.
 */
describe("🔴 영양 유병률·권고 인용", () => {
  const body = GUIDES["complete-nutrition-guide-school-lunches-nz"].body;
  const ALL_BODIES = [...Object.values(POSTS), ...Object.values(GUIDES)].map((e) => e.body);

  it("양성 대조 — 글을 실제로 읽고 있다", () => {
    expect(ALL_BODIES.length).toBeGreaterThan(20);
    expect(body.length).toBeGreaterThan(5000);
  });

  it("WHO 유리당 권고를 g/일로 적지 않는다 (실제 권고는 %에너지)", () => {
    const bad: string[] = [];
    for (const b of ALL_BODIES) {
      for (const m of b.matchAll(/WHO|World Health Organisation|World Health Organization/g)) {
        const window = b.slice(m.index ?? 0, (m.index ?? 0) + 220);
        // "less than 25g of free sugars per day" 꼴 — 숫자+g이 하루 권고로 붙는 형태
        if (/less than \d+\s?g[^.]{0,60}per day/i.test(window)) bad.push(window.slice(0, 120));
      }
    }
    expect(bad, `WHO 권고를 g/일로 적었다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("유리당 문단이 10%·5% 기준을 밝힌다", () => {
    expect(body).toMatch(/free sugars below 10% of total daily energy/);
    expect(body).toMatch(/below 5%/);
    // 25g을 쓰더라도 "성인 수치"라고 못 박아야 한다.
    if (body.includes("25g a day")) {
      expect(body).toMatch(/\*adult\*|for an \*?adult/);
    }
  });

  it("섬유질 부족을 과장하지 않는다", () => {
    expect(body, "'절반 미만' 주장이 되살아났다").not.toMatch(/less than half the recommended fibre/i);
    expect(body, "실제 섭취량 범위가 없다").toContain("15–21g");
    expect(body, "AI 범위가 없다").toContain("18–24g");
  });

  it("철분 부족을 과장하지 않는다 (수치와 함께 적는다)", () => {
    expect(body).not.toMatch(/Many NZ children[^.]*low in iron/i);
    expect(body, "전체 유병률이 없다").toContain("6.6%");
    expect(body, "월경 시작한 여아 수치가 없다").toContain("43.9%");
  });

  it("칼슘 부족에 수치가 붙어 있다", () => {
    expect(body).toContain("15.1%");
  });

  it("학교급식 평가서를 실제 발행자로 인용한다", () => {
    expect(body, "없는 저자(Massey)를 인용하고 있다").not.toMatch(/Massey/);
    expect(body, "평가서 링크가 없다").toContain(
      "Ka-Ora-Ka-Ako_Nutrition-Evaluation-v2.pdf",
    );
    // 급식 결과를 도시락 결과로 넘겨 짚지 않는다.
    expect(body).not.toMatch(/the same gaps show up in home-packed lunchboxes/i);
  });

  it("근거 없는 per-100g 합격선·별점 문턱을 내걸지 않는다", () => {
    expect(body, "출처 없는 별점 문턱이 되살아났다").not.toMatch(/3\.5 stars or above/i);
    expect(body, "Health Star가 카테고리 안 비교라는 설명이 없다").toMatch(
      /compared within category/i,
    );
  });
});

/**
 * 🔴 2026-08-23: 본문의 1인분 금액이 **어디서 왔는지**를 다섯 군데가 틀리게 적고 있었다.
 *
 * 금액은 전부 `data/price_cache.json`에서 나오고 그 캐시는 **Woolworths 한 곳**이다
 * (187/194가 "Woolworths NZ", 나머지는 추정 폴백). 그런데 본문은
 * "I track regular shelf prices at **Woolworths and New World** each week
 *  for the [NZ Lunchbox Price Index], and the numbers below come from that"라고 적었다.
 * 두 번 틀렸다 — 가격지수는 **다른 데이터셋**이고(20개 품목·3개 체인),
 * 캐시에는 New World 값이 **한 건도 없다**.
 *
 * 이 가드는 문자열이 아니라 **캐시의 실제 출처 집합**에서 판정한다.
 */
describe("🔴 본문이 밝히는 가격 출처가 실제 캐시와 같다", () => {
  const CACHE = PRICES as Record<string, { data?: { source?: string } }>;
  const CHAINS = ["Woolworths", "Pak'nSave", "New World", "Countdown"] as const;

  /** 캐시에 실제로 등장하는 소매 체인. 폴백("Est. (Fallback)")은 체인이 아니다. */
  const cacheChains = () => {
    const found = new Set<string>();
    for (const v of Object.values(CACHE)) {
      const s = v.data?.source ?? "";
      for (const c of CHAINS) if (s.includes(c.replace("'", "'")) || s.includes(c)) found.add(c);
    }
    return found;
  };

  const bodies = () =>
    [...Object.entries(POSTS), ...Object.entries(GUIDES)].map(([slug, e]) => ({ slug, body: e.body }));

  it("양성 대조 — 캐시와 글을 실제로 읽고 있다", () => {
    expect(Object.keys(CACHE).length).toBeGreaterThan(100);
    expect(bodies().length).toBeGreaterThan(20);
    expect([...cacheChains()]).toEqual(["Woolworths"]);
  });

  it("정상가 출처로 New World를 대지 않는다 (캐시에 한 건도 없다)", () => {
    // 🔴 처음엔 "캐시에 없는 체인 전부"로 걸었더니 **정당한 네 곳**이 걸렸다 —
    //    예산 가이드의 매장 실사(Pak'nSave Ormiston·Botany)와 가격지수 글이다.
    //    항상 빨간 가드는 항상 초록인 가드다. 실제로 불가능한 것만 남긴다:
    //    New World는 캐시에 **0건**이고 지수에서도 20개 중 11개만 있어
    //    1인분 정상가의 출처가 될 수 없다.
    if (cacheChains().has("New World")) return; // 캐시가 바뀌면 전제부터 다시 볼 것
    const bad: string[] = [];
    for (const { slug, body } of bodies()) {
      // 마침표로 자르면 `$3.90`이 쪼개진다 — 소문자/괄호 뒤 마침표에서만 자른다.
      for (const sentence of body.split(/(?<=[a-z)\]])\.\s/)) {
        if (!/shelf price/i.test(sentence)) continue;
        if (!sentence.includes("New World")) continue;
        bad.push(`${slug}: New World를 정상가 출처로 적었다 → ${sentence.trim().slice(0, 140)}`);
      }
    }
    expect(bad, `가격 출처 주장이 캐시와 다르다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("본문 금액이 가격지수에서 왔다고 말하지 않는다 (다른 데이터셋이다)", () => {
    const bad: string[] = [];
    for (const { slug, body } of bodies()) {
      for (const m of body.matchAll(/for the \[NZ Lunchbox Price Index\]\([^)]*\)/g)) {
        const window = body.slice(m.index ?? 0, (m.index ?? 0) + 160);
        if (/the numbers below come from that|the price tracking behind/i.test(window)) {
          bad.push(`${slug}: ${window.slice(0, 140)}`);
        }
      }
    }
    expect(bad, `가격지수를 본문 금액의 출처라고 적었다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("가격지수의 체인 열 개수를 문구에 손으로 박지 않는다", () => {
    const LOCALES = ["en", "ko", "zh"] as const;
    const bad: string[] = [];
    for (const l of LOCALES) {
      const msgs = JSON.parse(
        readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8"),
      ) as Record<string, string>;
      for (const [k, v] of Object.entries(msgs)) {
        if (typeof v !== "string" || !/price index|가격지수|价格指数/i.test(v)) continue;
        if (/both columns|두 열|两列|Woolworths and Pak'nSave columns|Woolworths 열과 Pak'nSave 열|Woolworths栏和Pak'nSave栏/.test(v)) {
          bad.push(`${l}.${k}`);
        }
      }
    }
    expect(bad, `가격지수 열 개수를 문구에 박았다 → ${bad.join(", ")}`).toEqual([]);
  });
});

/**
 * 🔴 2026-08-23: 약관이 사이트의 나머지와 정면으로 어긋나 있었다.
 *
 *   - FAQ는 "플래너는 보건부 식품군을 확인하지 않는다 — 코드에 식품군 로직이 없다"고
 *     정직하게 적어 뒀는데(08-22 수정), **약관은 여전히** "rules drawn from the
 *     Ministry of Health *Healthy Food and Drink Guidance for Schools* and the Heart
 *     Foundation"으로 플랜을 만든다고 주장하고 있었다. 법적 페이지 쪽이 더 나쁘다.
 *   - "an optional free account … for saving favourite meals and **previously generated
 *     plans**"라고 해 놓고 두 줄 뒤에 "we do not store plan history"라고 적었다.
 *     실제로 서버에 저장되는 건 `favorites.name` 하나뿐이고 플랜은 localStorage다.
 *   - "The data export covers all favourite meals and **saved plans**" — 그런 게 없다.
 *   - "Last Updated: February 2026"인데 8월에 절이 여러 개 추가돼 있었다.
 */
describe("🔴 약관이 실제 동작·다른 페이지와 어긋나지 않는다", () => {
  const src = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf-8");
  const TERMS = src("app/[locale]/terms/page.tsx");
  const LOCALES = ["en", "ko", "zh"] as const;
  const msgs = Object.fromEntries(
    LOCALES.map((l) => [
      l,
      JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8")) as Record<string, string>,
    ]),
  ) as Record<(typeof LOCALES)[number], Record<string, string>>;

  it("양성 대조 — 약관을 실제로 읽고 있다", () => {
    expect(TERMS.length).toBeGreaterThan(5000);
    expect(TERMS).toContain("Use of the Meal Planner");
  });

  it("플래너 설명이 FAQ와 같은 말을 한다 (식품군 로직 없음)", () => {
    const PHRASE = "food-group logic in the code";
    expect(msgs.en.faq_a23, "FAQ에서 이 문구가 사라졌다 — 약관도 같이 볼 것").toContain(PHRASE);
    // JSX는 문장을 줄바꿈으로 쪼갠다 — 공백을 눌러서 본다.
    const flat = TERMS.replace(/\s+/g, " ");
    expect(flat, "약관이 FAQ와 다른 말을 한다").toContain("no food-group logic in the code");
  });

  it("플래너가 보건부·Heart Foundation 규칙으로 식단을 만든다고 하지 않는다", () => {
    expect(TERMS).not.toMatch(/rules drawn from the New Zealand Ministry/);
    // 플래너 절 안에서 기관 이름이 근거처럼 쓰이면 걸린다.
    const section = TERMS.slice(
      TERMS.indexOf("Use of the Meal Planner"),
      TERMS.indexOf("Allergy, Nutrition, and Food Safety Disclaimer"),
    );
    expect(section.length).toBeGreaterThan(500); // 절을 실제로 잘라냈는지 확인
    for (const org of ["Heart\n            Foundation", "Healthy Food and Drink Guidance"]) {
      expect(section, `플래너 절이 ${org}를 근거로 들고 있다`).not.toContain(org);
    }
  });

  it("서버에 저장되지 않는 것을 저장한다고 하지 않는다", () => {
    // 쓰는 테이블은 favorites 하나 — 위 describe의 대조와 같은 사실.
    const tables = new Set<string>();
    for (const f of ["components/PlannerClient.tsx", "app/[locale]/account/AccountClient.tsx"]) {
      for (const m of src(f).matchAll(/\.from\("([a-z_]+)"\)/g)) tables.add(m[1]);
    }
    expect([...tables].sort()).toEqual(["favorites"]);
    expect(TERMS, "저장하지 않는 플랜을 내보내기 대상으로 적었다").not.toMatch(/covers all favourite meals and saved plans/);
    expect(TERMS, "플랜 저장을 계정 혜택으로 적었다").not.toMatch(/for saving favourite meals and\s+previously generated plans/);
    expect(TERMS, "플랜이 브라우저에만 있다는 설명이 없다").toMatch(/local storage/i);
  });

  it("플래너에 없는 입력을 있는 것처럼 적지 않는다", () => {
    // 🔴 약관이 "the planner operates on **year-level** and allergy filters"라고 했는데
    //    학년 입력은 코드 어디에도 없다. 개인정보를 안 받는다는 문단이라 더 나쁘다.
    const planner = src("components/PlannerClient.tsx");
    expect(planner.length).toBeGreaterThan(3000); // 양성 대조
    const hasYearLevel = /year.?[Ll]evel|yearGroup|schoolYear/.test(planner);
    if (!hasYearLevel) {
      expect(TERMS, "약관이 없는 학년 입력을 언급한다").not.toMatch(/year-level/);
    }
  });

  it("가격 출처를 실제보다 넓게 적지 않는다", () => {
    expect(TERMS).not.toMatch(/Auckland supermarkets&apos; own online shops/);
    expect(TERMS).toMatch(/regular Woolworths shelf prices/);
  });

  /**
   * 🔴 2026-09-15: 이 검사는 세 로케일이 **각자 적은 날짜**가 같은 달인지 봤다.
   *    이제 날짜는 `lib/policyRevisions.ts`가 만들고 세 로케일은 자리표시자만
   *    들고 있으므로, 갈라지는 것 자체가 불가능하다. 그래서 「자리표시자를 쓰는가」와
   *    「호출부가 값을 넘기는가」를 본다.
   */
  it("최종 수정일을 세 언어가 손으로 적지 않는다", () => {
    for (const l of ["en", "ko", "zh"] as const) {
      expect(msgs[l].terms_updated, `${l}: {updated} 자리표시자가 없다`).toContain("{updated}");
      expect(msgs[l].terms_updated, `${l}: 날짜를 손으로 적었다`).not.toMatch(/\d{4}/);
      expect(msgs[l].privacy_effective, `${l}: {effective} 자리표시자가 없다`).toContain("{effective}");
      expect(msgs[l].privacy_effective, `${l}: 날짜를 손으로 적었다`).not.toMatch(/\d{4}/);
    }
    const terms = readFileSync(new URL("../app/[locale]/terms/page.tsx", import.meta.url), "utf-8");
    const pol = readFileSync(new URL("../app/[locale]/policies/page.tsx", import.meta.url), "utf-8");
    expect(terms, "약관 페이지가 updated 를 안 넘긴다").toContain("updated: termsUpdated()");
    expect(pol, "방침 페이지가 effective 를 안 넘긴다").toContain("effective: privacyEffective()");
  });
});

/**
 * 🔴 2026-08-23: 홈의 "우리의 약속"이 세 언어에서 각각 다른 거짓말을 하고 있었다.
 *
 *   - 영어: "Menus follow New Zealand Ministry of Health dietary guidance" —
 *     FAQ가 "식품군 로직 없음"이라고 정정한 바로 그 주장이 여기 남아 있었다.
 *   - 한국어·중국어: 위에 더해 **"발행 전 직접 가정에서 테스트한다"**(안 한다)와
 *     **"매월 가격 업데이트"**(주간이다)까지. 안 하는 일을 1인칭으로 적는 건
 *     이 저장소가 이미 한 번 크게 당한 패턴이다.
 */
describe("🔴 홈의 '약속' 문구가 실제 동작과 같다", () => {
  const LOCALES = ["en", "ko", "zh"] as const;
  const msgs = Object.fromEntries(
    LOCALES.map((l) => [
      l,
      JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8")) as Record<string, string>,
    ]),
  ) as Record<(typeof LOCALES)[number], Record<string, string>>;

  it("양성 대조 — 세 언어 모두 문구를 읽었다", () => {
    for (const l of LOCALES) expect(msgs[l].home_commitment_desc?.length ?? 0).toBeGreaterThan(50);
  });

  it("메뉴가 보건부 지침을 '따른다'고 하지 않는다 (식품군 로직이 없다)", () => {
    const bad: string[] = [];
    for (const l of LOCALES) {
      const v = msgs[l].home_commitment_desc;
      if (/Menus follow New Zealand Ministry of Health/i.test(v)) bad.push(l);
      if (/(레시피|메뉴|식단)[^.]{0,20}보건부[^.]{0,20}지침을 따릅니다/.test(v)) bad.push(l);
      if (/(食谱|菜单|膳食计划)[^。]{0,20}遵循新西兰卫生部/.test(v)) bad.push(l);
    }
    expect(bad, `보건부 준수 주장이 남아 있다 → ${bad.join(", ")}`).toEqual([]);
  });

  it("하지 않는 일을 1인칭으로 적지 않는다 (가정 시식·월간 갱신)", () => {
    const bad: string[] = [];
    for (const l of LOCALES) {
      const v = msgs[l].home_commitment_desc;
      if (/발행 전 직접 가정에서 테스트|亲自在家测试/.test(v)) bad.push(`${l}: 가정 시식`);
      if (/매월 가격을 업데이트|每月更新价格/.test(v)) bad.push(`${l}: 월간 갱신(실제는 주간)`);
    }
    expect(bad, `안 하는 일을 적었다 → ${bad.join(", ")}`).toEqual([]);
  });
});

/**
 * 🔴 2026-08-23: 예산 가이드의 "$15/주" 표가 **같은 글 첫 문단과 정면으로 어긋났다.**
 *
 *   · 첫 문단(파생): 도시락 중앙값 $3.90 · 범위 $2~$7.70 · 94종 중 20종만 $3 미만
 *   · 다섯 날 표(손으로 적음): $1.75 · $1.85 · $2.00 · $2.10 · $2.23
 *     → 닷새 중 **사흘이 우리 자신의 범위 바닥($2)보다 쌌다.**
 *     → 같은 재료를 추적가로 다시 세면 주간 합계는 $22 대다(글은 $9.93).
 *
 * 이 글은 **똑같은 이유로 이미 공개 정정을 한 번 달았다**("a week at $2.09 a box").
 * 그래서 이제 표를 손으로 안 적는다 — `budgetWeek()`이 데이터에서 고른다.
 */
describe("🔴 예산 가이드의 한 주는 데이터에서 나온다", () => {
  const GUIDE = GUIDES["budget-lunchbox-planning-guide-nz"];
  const body = GUIDE.body;
  const week = budgetWeek();
  const MENUS_ALL = (menuData as { MENU_DATA: { en: MenuItem[] } }).MENU_DATA.en;

  it("양성 대조 — 주간을 실제로 만들었다", () => {
    expect(week.length).toBe(5);
    expect(body.length).toBeGreaterThan(5000);
  });

  it("고른 다섯 개가 전부 넛프리다 (학교에 보내는 글이다)", () => {
    for (const d of week) {
      const m = MENUS_ALL.find((x) => x.name === d.name);
      expect(m, `${d.name}을 메뉴 데이터에서 못 찾았다`).toBeTruthy();
      expect((m as unknown as { is_nut_free?: boolean }).is_nut_free, `${d.name}이 넛프리가 아니다`).toBe(true);
    }
  });

  it("같은 메뉴를 두 번 쓰지 않고, 카테고리를 최대한 흩는다", () => {
    expect(new Set(week.map((d) => d.name)).size).toBe(week.length);
    const cats = new Set(MENUS_ALL.map((m) => m.category));
    // 카테고리가 5개 미만이면 겹치는 게 정상이다 — 있는 만큼은 다 써야 한다.
    expect(new Set(week.map((d) => d.category)).size).toBe(Math.min(cats.size, week.length));
  });

  it("주간 합계가 $15 목표 아래고, 하루하루가 $3 아래다", () => {
    // 🔴 글의 제목이 "Under $15/Week"다. 데이터가 움직여 이 조건이 깨지면
    //    제목이 거짓이 되므로 **여기서 멈춰야** 한다.
    expect(budgetWeekTotal(), `주간 합계가 $15을 넘었다 — 제목을 고칠 것`).toBeLessThan(15);
    for (const d of week) {
      expect(d.box, `${d.name}이 $3을 넘었다 — 글이 "$3 a box"라고 말한다`).toBeLessThan(3);
    }
  });

  it("표가 싼 순서로 읽힌다", () => {
    const shown = budgetWeekRows().map((r) => Number(r.match(/\*\*\$([0-9.]+)\*\*/)![1]));
    expect(shown, `표 순서가 흐트러졌다 → ${shown.join(", ")}`).toEqual([...shown].sort((a, b) => a - b));
  });

  it("게시된 합계 = 게시된 일일 금액의 합", () => {
    // 반올림 전 값으로 더하면 독자가 표를 더했을 때 어긋난다 (vegTermSaving과 같은 이유).
    const shown = budgetWeekRows().map((r) => Number(r.match(/\*\*\$([0-9.]+)\*\*/)![1]));
    const sum = shown.reduce((a, b) => a + b, 0);
    expect(budgetWeekTotalLabel()).toBe(`$${sum.toFixed(2)}`);
  });

  it("본문의 표가 파생 함수를 그대로 쓴다 (손으로 적은 날이 없다)", () => {
    for (const d of budgetWeek()) {
      expect(body, `"${d.name}" 줄이 본문에 없다 — 표가 파생을 안 쓰고 있다`).toContain(d.name);
    }
    // 옛 손 표의 흔적이 되살아나면 걸린다.
    for (const dead of ["Daily total: $2.23", "Weekly Total: $9.93", "Daily total: $1.75"]) {
      expect(body, `손으로 적은 옛 표가 돌아왔다 → ${dead}`).not.toContain(dead);
    }
  });

  it("배치 준비 표에 추적가와 어긋나는 금액이 없다", () => {
    // 열을 통째로 뺐다: 계란 10개 $3.75(실제 팩 $10 초과)·파스타 500g 95c(실제 약 $3).
    const i = body.indexOf("Sunday Batch Prep");
    expect(i, "배치 절을 못 찾았다").toBeGreaterThan(0);
    const section = body.slice(i, i + 1400);
    expect(section, "배치 표에 다시 금액이 들어왔다").not.toMatch(/\|\s*\$[0-9]/);
  });
});

/**
 * 🔴 2026-08-23: 절약률 세 줄이 **서로 다른 수량**을 비교하고 있었다.
 *    "Muesli bars (5 pack) $4.50 vs $1.20 (batch of 12) → 73%" —
 *    5개와 12개를 견줘 놓고 73%라고 했다. 낱개로 보면 90c 대 10c, **89%**다.
 *    예산 글에서 퍼센트가 틀리면 그 글의 존재 이유가 없어진다.
 */
describe("🔴 퍼센트는 자기 표의 숫자와 맞는다", () => {
  const body = GUIDES["budget-lunchbox-planning-guide-nz"].body;

  /**
   * `| 이름 | $A for N | $B for M | ... | **NN%** |` 꼴에서 **팩 열**을 읽는다.
   *
   * 🔴 처음엔 "낱개" 열(`90c vs 10c`)로 검산했는데 두 번 틀렸다:
   *    ① `$1.60 vs 20c`는 달러와 센트가 섞여 있어 **단위가 상쇄되지 않는다**(-1150%가 나왔다)
   *    ② 낱개 열은 읽기 좋으라고 반올림한 값이라 퍼센트가 1%p씩 어긋난다
   *    → 반올림 안 된 **팩 가격과 개수**에서 계산한다. 이게 표의 근거이기도 하다.
   */
  const savingRows = () =>
    [...body.matchAll(
      /\|\s*([^|]+?)\s*\|\s*\$([0-9.]+) for (?:a )?([0-9.]+)[^|]*\|\s*\$([0-9.]+) for (?:a )?(?:batch of )?([0-9.]+)[^|]*\|[^|]*\|\s*\*\*(\d+)%\*\*\s*\|/g,
    )];

  it("양성 대조 — 절약률 표를 실제로 읽었다", () => {
    // 🔴 09-28: 손으로 적은 「집에서 만든」 원가 세 줄(뮤즐리바·후무스·스시)을 근거가 없어 뺐다.
    //    그래서 「4줄 이상」 대신 **표의 모든 데이터 행이 정규식에 잡히는지**를 본다 — 빠져나가는 줄이 없어야 한다.
    const head = body.indexOf("| Item | Store-bought | Homemade | Per unit | Saving |");
    expect(head, "절약률 표 머리글을 못 찾았다").toBeGreaterThan(-1);
    const dataRows = body.slice(head).split("\n").slice(2).filter((l, i, a) => a.slice(0, i + 1).every((x) => x.startsWith("|")));
    expect(dataRows.length, "절약률 표에 행이 없다").toBeGreaterThanOrEqual(1);
    expect(savingRows().length, "표의 행 중 정규식이 못 읽는 줄이 있다").toBe(dataRows.length);
  });

  it("게시된 절약률이 팩 가격·개수에서 계산한 값과 같다", () => {
    const bad: string[] = [];
    for (const [, label, storeP, storeQ, homeP, homeQ, pct] of savingRows()) {
      const store = Number(storeP) / Number(storeQ);
      const home = Number(homeP) / Number(homeQ);
      const want = Math.round((1 - home / store) * 100);
      if (want !== Number(pct)) bad.push(`${label}: 게시 ${pct}% ≠ 계산 ${want}% (${store.toFixed(4)} vs ${home.toFixed(4)})`);
    }
    expect(bad, `절약률이 자기 표와 안 맞는다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("서로 다른 수량을 견줘 퍼센트를 내지 않는다", () => {
    // 🔴 이게 원래 고장이었다: 5개 $4.50과 12개 $1.20을 견줘 "73%"라고 했다.
    const bad: string[] = [];
    for (const [full, label, , storeQ, , homeQ] of savingRows()) {
      if (storeQ === homeQ) continue;
      // 수량이 다르면 **낱개 열이 반드시 있어야** 한다 — 총액끼리 견준 퍼센트는 무의미하다.
      if (!/vs/.test(full)) bad.push(`${label}: 수량이 ${storeQ} 대 ${homeQ}인데 낱개 비교가 없다`);
    }
    expect(bad, `수량이 다른 채로 퍼센트를 냈다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("스토어 브랜드 표의 절약률도 자기 두 열과 맞는다", () => {
    const bad: string[] = [];
    for (const m of body.matchAll(/\|\s*([^|]+?)\s*\|\s*\$([0-9.]+)[^|]*\|\s*\$([0-9.]+)[^|]*\|\s*(\d+)% saving\s*\|/g)) {
      const [, label, storeRaw, nameRaw, pct] = m;
      const want = Math.round((1 - Number(storeRaw) / Number(nameRaw)) * 100);
      if (Math.abs(want - Number(pct)) > 1) bad.push(`${label}: 게시 ${pct}% ≠ 계산 ${want}%`);
    }
    expect(bad, `스토어 브랜드 절약률이 안 맞는다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("음식물 쓰레기 수치에 출처와 연도가 붙어 있다", () => {
    expect(body, "낡은 $1,500 추정이 남아 있다").not.toMatch(/\$1,500 of food a year/);
    expect(body).toContain("$1,364");
    expect(body).toMatch(/Rabobank-KiwiHarvest/);
  });
});

/**
 * 🔴 2026-08-23: 스낵 가이드가 **날짜 없는 어림 가격 10개**를 표 두 개에 싣고 있었고,
 *    그중 둘은 같은 글의 실측 표와 모순이었다:
 *      · "Anchor yoghurt tubs (**6 pack**) | $9.89 (**12 pack**, ...)" — 한 줄이 자기모순
 *      · "Flavoured yoghurt pouches ~$6.50 (8 pack)" → 낱개 81c인데, 같은 글의 실측은
 *        파우치 **$1.99~$2.40**이고 글 전체가 "파우치세"를 논증하고 있었다
 *    그리고 레시피 네 개가 "약 $0.15/개" 같은 **검증 불가능한 원가**를 달고 있었다 —
 *    밀가루·바나나·코코넛오일은 팩 크기가 확인 목록에 없어서 파생시킬 수가 없다.
 */
describe("🔴 스낵 가이드의 가격은 날짜와 근거를 달고 다닌다", () => {
  const body = GUIDES["healthy-snacks-guide-nz"].body;

  it("양성 대조 — 실측 표를 읽고 있다", () => {
    expect(body).toContain("Cost per morning tea");
    expect(body.length).toBeGreaterThan(5000);
  });

  it("실측 표의 1인분 값이 팩 가격 ÷ 개수와 맞는다", () => {
    const rows = [...body.matchAll(/\|\s*([^|]+?)\s*\|\s*\$([0-9.]+)[^|]*\|\s*(\d+)\s*\|\s*\*\*(?:\$)?([0-9.]+)(c?)\*\*\s*\|/g)];
    expect(rows.length, "표에서 행을 못 읽었다").toBeGreaterThanOrEqual(6);
    const bad: string[] = [];
    for (const [, label, pack, serves, valRaw, cents] of rows) {
      const want = Number(pack) / Number(serves);
      const got = cents ? Number(valRaw) / 100 : Number(valRaw);
      if (Math.abs(want - got) > 0.011) bad.push(`${label}: 게시 ${got.toFixed(2)} ≠ ${pack}/${serves} = ${want.toFixed(3)}`);
    }
    expect(bad, `1인분 값이 팩 ÷ 개수와 안 맞는다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("'~$X' 어림 가격을 표에 싣지 않는다", () => {
    const hits = body.match(/\|\s*~\$[0-9.]+/g) ?? [];
    expect(hits, `날짜 없는 어림 가격이 돌아왔다 → ${hits.join(", ")}`).toEqual([]);
  });

  it("파우치 가격 주장이 실측 표와 어긋나지 않는다", () => {
    // 실측: 파우치 $1.99~$2.40. 8팩 $6.50(=81c) 같은 값이 다시 들어오면 걸린다.
    const bad: string[] = [];
    for (const m of body.matchAll(/pouch[^|\n]{0,60}\$([0-9.]+)\s*\((\d+)\s*pack\)/gi)) {
      const each = Number(m[1]) / Number(m[2]);
      if (each < 1.5) bad.push(`${m[0]} → 낱개 $${each.toFixed(2)}`);
    }
    expect(bad, `파우치 낱개 값이 실측($1.99~$2.40)과 다르다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("한 줄 안에서 팩 개수가 두 번 다르게 말해지지 않는다", () => {
    const bad: string[] = [];
    for (const line of body.split("\n")) {
      if (!line.startsWith("|")) continue;
      const packs = [...line.matchAll(/\((\d+)\s*pack/gi)].map((m) => m[1]);
      if (new Set(packs).size > 1) bad.push(line.trim().slice(0, 120));
    }
    expect(bad, `한 줄이 팩 개수를 두 가지로 말한다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("손으로 적은 레시피 원가('approximately')가 돌아오지 않는다", () => {
    // 레시피 머리줄만 본다 — 본문이 옛 문구를 인용하고 있다.
    const hits = body.match(/Makes \d+ [^.\n]*\.\s*Cost:\s*approximately[^\n]*/g) ?? [];
    expect(hits, `추정 원가가 돌아왔다 → ${hits.join(", ")}`).toEqual([]);
  });
});

/**
 * 🔴 2026-08-23: 스낵 가이드의 레시피 원가를 **파생값으로 되살렸다.**
 *
 * 오전에는 지웠다 — 밀가루·바나나·코코넛오일의 팩 크기가 `PORTION_BASIS`에 없어
 * 원가를 만들 수가 없었고, 실려 있던 "약 $0.15/개"는 추정이었기 때문이다.
 * 오후에 그 셋(+베이킹파우더·소다·옥수수)을 상품 API로 확인해 넣고 되살렸다.
 * 확인해 보니 옛 값은 실제의 1/2~1/3이었다 — 머핀 15c → **50c**.
 *
 * 되살리면서 두 가지가 새로 참이어야 한다:
 *   ① 원가는 **본문에 적힌 그램 수**에서 나온다 (독자가 검산할 수 있어야 한다)
 *   ② 레시피가 쓰는 재료는 전부 팩 크기 근거가 있다 (없으면 다시 추정이 된다)
 */
describe("🔴 레시피 원가는 본문의 그램 수에서 파생된다", () => {
  const body = GUIDES["healthy-snacks-guide-nz"].body;

  /** 본문의 레시피 머리줄: "Makes 12. **$5.98 the batch — 50c a muffin**" */
  const headers = () => [...body.matchAll(/Makes (\d+)\.\s*\*\*\$([0-9.]+) the batch — (\$?[0-9.]+c?) a[n]? ([a-z]+)/g)];

  it("양성 대조 — 레시피 머리줄을 실제로 읽었다", () => {
    expect(headers().length, "레시피 머리줄을 하나도 못 읽었다").toBe(4);
  });

  it("배치 ÷ 개수 = 게시된 개당 값", () => {
    const bad: string[] = [];
    for (const [, makesRaw, batchRaw, eachRaw, noun] of headers()) {
      const each = eachRaw.endsWith("c") ? Number(eachRaw.replace("c", "")) / 100 : Number(eachRaw.replace("$", ""));
      const want = Number(batchRaw) / Number(makesRaw);
      // 게시값은 센트/달러로 반올림된다 — 반올림 폭 안이면 통과.
      if (Math.abs(want - each) > 0.006) bad.push(`${noun}: ${batchRaw}/${makesRaw} = ${want.toFixed(4)} ≠ 게시 ${eachRaw}`);
    }
    expect(bad, `배치와 개당이 안 맞는다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("모든 레시피 원가가 팩 크기 근거가 있는 재료로만 만들어진다", () => {
    // recipeCost는 근거가 없으면 던진다 — 여기서 실제로 계산해 그 계약을 확인한다.
    const items: RecipeItem[] = [
      ["Plain Flour", 125, "g"], ["Banana", 240, "g"], ["Coconut Oil", 28, "g"],
      ["Tahini", 30, "g"], ["Courgette", 250, "g"], ["Vanilla Essence", 5, "ml"],
      ["Baking Powder", 5, "g"], ["Baking Soda", 3, "g"], ["Corn", 200, "g"],
    ];
    for (const it of items) {
      expect(() => ingredientCost(it), `${it[0]}: 팩 크기 근거가 없다`).not.toThrow();
      expect(ingredientCost(it), `${it[0]}: 값이 0 이하다`).toBeGreaterThan(0);
    }
  });

  it("단위 계열이 다르면 던진다 (1000배 오류 방지)", () => {
    // "per kg"로 파는 바나나를 ml로 적으면 조용히 통과하면 안 된다.
    expect(() => ingredientCost(["Banana", 240, "ml"])).toThrow();
    expect(() => ingredientCost(["Eggs", 50, "g"])).toThrow();
    expect(() => ingredientCost(["Milk", 190, "g"])).toThrow();
  });

  it("본문이 계산에 쓰인 그램 수를 그대로 보여 준다", () => {
    /**
     * 🔴 손으로 적은 목록으로 확인하다 돌연변이에 뚫렸다: `RECIPES`의 버터를 80g→800g로
     *    바꿔도 배치와 개당이 **같이** 커져서 비율 검산은 통과하고, 본문은 여전히 80g였다.
     *    그래서 **RECIPES에서 목록을 만든다** — 정의를 고치면 본문도 고쳐야 통과한다.
     */
    expect(Object.keys(RECIPES).length, "레시피 정의를 못 읽었다").toBe(4);
    const missing: string[] = [];
    for (const [name, r] of Object.entries(RECIPES)) {
      for (const [key, amount, unit] of r.items) {
        if (unit === "ea") continue; // "1 egg"은 그램으로 안 적는다
        const token = `${amount}${unit === "ml" ? "ml" : "g"}`;
        if (!body.toLowerCase().includes(token.toLowerCase())) {
          missing.push(`${name}/${key}: 본문에 "${token}"이 없다`);
        }
      }
      // 개수도 본문이 말해야 한다.
      if (!body.includes(`Makes ${r.makes}.`)) missing.push(`${name}: "Makes ${r.makes}."이 본문에 없다`);
    }
    expect(missing, `계산에 쓴 분량이 본문에 없다 →\n  ${missing.join("\n  ")}`).toEqual([]);
  });

  it("원가 표가 레시피 머리줄과 같은 값을 말한다", () => {
    // 🔴 표를 하드코딩해도 머리줄 검산은 통과했다 — 두 자리가 서로를 안 보고 있었다.
    const rows = [...body.matchAll(/\|\s*([A-Z][^|]+?)\s*\|\s*(\d+)\s*\|\s*\$([0-9.]+)\s*\|\s*\*\*(\$?[0-9.]+c?)\*\*\s*\|/g)];
    expect(rows.length, "원가 표 행을 못 읽었다").toBe(4);
    const fromHeaders = new Map(headers().map((h) => [`${h[2]}|${h[3]}`, true]));
    const bad: string[] = [];
    for (const [, label, , batch, each] of rows) {
      if (!fromHeaders.has(`${batch}|${each}`)) bad.push(`${label}: 표 $${batch}/${each}가 어느 머리줄과도 안 맞는다`);
    }
    expect(bad, `표와 레시피 머리줄이 다른 값을 말한다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("레시피가 쓰는 재료는 전부 가격이 갱신되는 경로에 있다", () => {
    /**
     * 🔴 `RECIPE_ONLY_INGREDIENTS`에서 키를 빼도 지금은 캐시에 남아 있어 조용히 통과한다.
     *    **다음 크론에서 캐시가 다시 만들어질 때** 그 키가 사라지고 빌드가 죽는다.
     *    메뉴 재료이거나 레시피 전용 목록에 있거나, 둘 중 하나여야 한다.
     */
    const menuIngredients = new Set<string>();
    const md = menuData as { MENU_DATA: { en: MenuItem[] }; SNACK_DATA: Record<string, SnackItem[]> };
    for (const m of md.MENU_DATA.en) for (const i of m.ingredients ?? []) menuIngredients.add(i);
    for (const items of Object.values(md.SNACK_DATA)) {
      for (const sn of items) for (const i of (sn as unknown as { ingredients?: string[] }).ingredients ?? []) menuIngredients.add(i);
    }
    expect(menuIngredients.size, "메뉴 재료를 못 읽었다").toBeGreaterThan(50);
    const recipeOnly = new Set<string>(RECIPE_ONLY_INGREDIENTS);
    const orphans: string[] = [];
    for (const r of Object.values(RECIPES)) {
      for (const [key] of r.items) {
        if (!menuIngredients.has(key) && !recipeOnly.has(key)) orphans.push(key);
      }
    }
    expect(
      [...new Set(orphans)],
      `레시피가 쓰는데 주간 가격 갱신 대상이 아니다 — 다음 크론에서 캐시가 비면 빌드가 죽는다`,
    ).toEqual([]);
  });

  it("팩 크기가 확인 안 된 재료를 레시피에 쓰지 않는다", () => {
    // 근거 없는 재료가 레시피에 들어오면 원가는 다시 추정이 된다.
    const unverified = new Set(PORTION_BASIS_UNVERIFIED);
    for (const k of RECIPE_ONLY_INGREDIENTS) {
      expect(PORTION_BASIS[k], `${k}: 레시피 전용인데 팩 크기 근거가 없다`).toBeTruthy();
      expect(unverified.has(k), `${k}: 미확인 목록에 있다`).toBe(false);
      const pins = PINNED_SKUS as Record<string, { sku: string; size?: string } | undefined>;
      expect(pins[k], `${k}: 고정 SKU가 없다 — 다음 크론이 다른 상품을 집는다`).toBeTruthy();
    }
  });

  it("레시피 전용 재료가 가격 캐시에 실제로 들어 있다", () => {
    // 🔴 `update_prices.mjs`가 RECIPE_ONLY_INGREDIENTS를 안 읽으면 캐시에 안 들어오고,
    //    빌드는 `packPrice`에서 던진다. 여기서 먼저 멈추는 게 낫다.
    const cache = PRICES as Record<string, { data?: { price?: number; source?: string } }>;
    for (const k of RECIPE_ONLY_INGREDIENTS) {
      const p = cache[k]?.data?.price;
      expect(typeof p === "number" && p > 0, `${k}: 가격 캐시에 없다`).toBe(true);
      expect(cache[k]?.data?.source, `${k}: 폴백 추정가다`).toBe("Woolworths NZ");
    }
  });
});

/**
 * 🔴 2026-08-23: 고정 SKU 재료의 이미지가 **43개 중 26개** 비어 있었다.
 *
 * `scripts/update_prices.mjs`의 고정 경로가 `p?.images?.big`을 읽는데,
 * **단일 상품 엔드포인트의 `images`는 배열**이라 항상 undefined였다
 * (검색 경로는 객체를 줘서 같은 코드가 그쪽에선 동작했다).
 * 고치면서 `bigImageUrl`을 썼다가 그건 **URL이 아니라 파일명**이라 또 틀렸다.
 *
 * 지금은 화면이 이 필드를 안 쓴다 — `lib/supermarketApi.ts`가 이모지로 덮는다.
 * 그래서 **아무도 못 보는 채로 낡아 갔다.** 쓰기 시작하는 날 조용히 빈 값이 나간다.
 */
describe("🔴 가격 캐시의 이미지 필드", () => {
  const cache = PRICES as Record<string, { data?: { image?: string; source?: string } }>;

  it("양성 대조 — 캐시를 실제로 읽었다", () => {
    expect(Object.keys(cache).length).toBeGreaterThan(150);
  });

  it("이미지는 빈 문자열이거나 전체 URL이다 (파일명만 있으면 실패)", () => {
    const bad: string[] = [];
    for (const [k, v] of Object.entries(cache)) {
      const img = v.data?.image;
      if (img === undefined || img === "") continue;
      if (!/^https?:\/\//.test(img)) bad.push(`${k}: "${img.slice(0, 60)}"`);
    }
    expect(bad, `이미지가 URL이 아니다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("이번에 확인한 재료들은 이미지가 채워져 있다", () => {
    // 08-23에 팩 크기를 확인하면서 다시 받은 것들 — 여기가 비면 배열/객체 버그가 돌아온 것이다.
    for (const k of ["Flour", "Banana", "Coconut Oil", "Corn", ...RECIPE_ONLY_INGREDIENTS]) {
      expect(cache[k]?.data?.image ?? "", `${k}: 이미지가 비었다`).toMatch(/^https?:\/\//);
    }
  });
});

/**
 * 🔴 2026-08-23: 캐시의 **상품명**과 재료명을 전수 대조했더니 37건이 어긋났고,
 *    15건은 아예 다른 음식이었다. 그중 셋은 **식이 표시와 정면으로 어긋났다**:
 *      · `Muesli (Nut-free)` → 견과류 주의가 붙은 뮤즐리
 *      · `Sesame Oil` → 미강유 (참깨가 안 든 기름)
 *      · `Vegan Mayo` → 달걀이 든 일반 마요네즈
 *      · `Chicken Skewers` → **새우** 꼬치
 *    기존 안전장치(`avoidTokensFor`)는 **상품명 토큰**만 봤다. 라벨은 상품 API가
 *    주는데 아무도 안 읽고 있었다. 이제 캐시에 저장하고 여기서 본다.
 */
describe("🔴 추적 상품의 알레르겐 라벨이 메뉴 표시와 맞는다", () => {
  const MENUS_ALL = (menuData as { MENU_DATA: { en: MenuItem[] } }).MENU_DATA.en;
  const RULES: [keyof MenuItem, keyof typeof ALLERGEN_PATTERNS][] = [
    ["is_nut_free", "nuts"],
    ["is_dairy_free", "milk"],
    ["is_egg_free", "egg"],
    ["is_gluten_free", "gluten"],
  ];

  it("양성 대조 — 라벨을 실제로 읽고 있다", () => {
    expect(labelledCount(), "라벨을 가진 재료가 하나도 없다").toBeGreaterThan(25);
    // 파서가 선언과 주의를 실제로 가르는지 — 둘 다 있는 상품이 있어야 한다.
    const both = Object.keys(PRICES as Record<string, unknown>).filter((k) => {
      const l = labelFor(k);
      return l && l.declared.trim() !== "" && l.precautionary.trim() !== "";
    });
    expect(both.length, "선언·주의가 함께 있는 상품을 못 찾았다 — 파서가 안 가르고 있다").toBeGreaterThan(0);
  });

  it.each(RULES)("%s 메뉴의 재료가 %s를 선언하지 않는다", (flag, allergen) => {
    const bad: string[] = [];
    let checked = 0;
    for (const m of MENUS_ALL) {
      if (!m[flag]) continue;
      for (const ing of m.ingredients ?? []) {
        if (labelFor(ing) === null) continue;
        checked += 1;
        if (declares(ing, allergen)) {
          bad.push(`${m.name} / ${ing} :: ${labelFor(ing)!.declared.trim()}`);
        }
      }
    }
    expect(checked, `${String(flag)}: 라벨이 있는 재료를 하나도 못 봤다 — 검사가 알리바이다`).toBeGreaterThan(0);
    expect(bad, `${String(flag)} 메뉴의 상품이 ${allergen}를 선언한다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("주의(may contain) 문구가 붙는 재료를 알레르기 가이드가 공개한다", () => {
    // 🔴 선언이 없다고 안전한 게 아니다. 개수·목록을 본문이 **파생값으로** 말해야
    //    라벨이 바뀌었을 때 글도 같이 바뀐다.
    const body = GUIDES["allergy-management-school-lunchbox-nz"].body;
    const warned = new Set<string>();
    for (const m of MENUS_ALL) {
      if (!m.is_nut_free) continue;
      for (const ing of m.ingredients ?? []) if (warnsAbout(ing, "nuts")) warned.add(ing);
    }
    expect(warned.size, "주의 문구가 붙는 재료가 0건 — 라벨을 못 읽고 있을 수 있다").toBeGreaterThan(0);
    expect(body, "주의 문구를 다루는 절이 없다").toContain("Is Not the Same as Nut-Free in the Recipe");
    for (const ing of warned) {
      expect(body, `"${ing}"이 목록에서 빠졌다 — 본문이 파생을 안 쓰고 있다`).toContain(ing);
    }
    expect(body).toContain(`${warned.size} of the ingredients carry a precautionary nut warning`);
  });

  it("'Nut-free'를 상품 이름에 넣지 않는다 (매대에 없는 약속)", () => {
    // Woolworths 뮤즐리 30종 전수 조회 결과 견과류 경고가 없는 제품이 하나도 없었다.
    const names = new Set(MENUS_ALL.flatMap((m) => m.ingredients ?? []));
    const bad = [...names].filter((n) => /nut[- ]?free/i.test(n));
    expect(bad, `살 수 없는 것을 재료명으로 쓰고 있다 → ${bad.join(", ")}`).toEqual([]);
  });
});

/**
 * 🔴 2026-08-23: 고정 SKU를 바꿔도 **가드가 아무 말을 안 했다.**
 *
 * 가드는 `price_cache.json`을 읽는데 고정은 `PINNED_SKUS`에 있다. 둘이 갈라지면
 * "고정은 A인데 캐시엔 B가 들어 있는" 상태가 되고, 다음 크론이 돌기 전까지
 * 아무도 모른다. 돌연변이로 `Noodles`의 SKU를 **달걀면**으로 바꿔 봤는데 침묵했다.
 *
 * `fetchPinned`가 이름 불일치를 경고로 찍긴 하지만 경고는 실패가 아니다.
 * 여기서 멈춘다 — 고정을 바꾸면 **다시 받아서 커밋**해야 한다.
 */
describe("🔴 고정 SKU와 가격 캐시가 같은 상품을 가리킨다", () => {
  const cache = PRICES as Record<string, { data?: { name?: string; source?: string } }>;
  const pins = PINNED_SKUS as Record<string, { sku: string; name: string }>;
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

  it("양성 대조 — 고정과 캐시를 실제로 읽었다", () => {
    expect(Object.keys(pins).length).toBeGreaterThan(50);
    expect(Object.keys(cache).length).toBeGreaterThan(150);
  });

  it("고정한 상품명이 캐시에 실제로 들어 있다", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const [key, pin] of Object.entries(pins)) {
      const got = cache[key]?.data?.name;
      if (got === undefined) {
        bad.push(`${key}: 고정했는데 캐시에 없다`);
        continue;
      }
      checked += 1;
      if (norm(got) !== norm(pin.name)) {
        bad.push(`${key}: 고정 "${pin.name}" ≠ 캐시 "${got}" — 고정을 바꿨으면 다시 받아서 커밋할 것`);
      }
    }
    expect(checked, "고정 재료를 하나도 대조 못 했다").toBeGreaterThan(50);
    expect(bad, `고정과 캐시가 다른 상품을 가리킨다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("고정한 SKU가 캐시에 그대로 들어 있다", () => {
    /**
     * 🔴 이름만 대조하면 **SKU만 바뀐 경우를 못 잡는다.** 돌연변이로 `Tortilla` 고정을
     *    다른 SKU(같은 이름 아님)로 바꿨을 땐 잡았지만, 이름이 같은 다른 SKU로 바꾸면
     *    침묵했다. 캐시에 SKU를 저장하고 그것으로 대조한다.
     */
    const withSku = Object.entries(pins).filter(([k]) => (cache[k]?.data as { sku?: string } | undefined)?.sku);
    expect(withSku.length, "SKU가 저장된 고정 재료가 없다 — 크론을 한 번 돌려야 한다").toBeGreaterThan(50);
    const bad: string[] = [];
    for (const [key, pin] of withSku) {
      const got = (cache[key]?.data as { sku?: string }).sku;
      if (got !== pin.sku) bad.push(`${key}: 고정 ${pin.sku} ≠ 캐시 ${got}`);
    }
    expect(bad, `고정 SKU와 캐시 SKU가 다르다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("고정한 재료는 폴백 추정가가 아니다", () => {
    const bad = Object.keys(pins).filter((k) => cache[k]?.data?.source !== "Woolworths NZ");
    expect(bad, `고정했는데 폴백가로 저장돼 있다 → ${bad.join(", ")}`).toEqual([]);
  });
});

/**
 * 🔴 2026-08-23: 예산 가이드의 손 표를 파생으로 바꿨는데 **같은 표가 블로그에 하나 더**
 *    있었다("Weekly Budget Tracker", $1.55~$2.40 · 주 $9.75). 발견 경로가 우연이다 —
 *    중앙값을 고치다 `$19.50`을 grep했더니 나왔다.
 *    이 저장소가 반복해서 밟는 함정이 정확히 그것이라, 이제 **두 자리를 묶어서** 본다.
 */
describe("🔴 주간 도시락 표는 저장소에 하나의 값만 있다", () => {
  const bodies = () => [
    ["guides/budget-lunchbox-planning-guide-nz", GUIDES["budget-lunchbox-planning-guide-nz"].body],
    ["blog/budget-friendly-lunchbox-ideas-nz", POSTS["budget-friendly-lunchbox-ideas-nz"].body],
  ] as const;

  it("양성 대조 — 두 글을 실제로 읽었다", () => {
    for (const [name, b] of bodies()) expect(b.length, name).toBeGreaterThan(3000);
  });

  it("두 글의 주간 합계가 같은 파생값이다", () => {
    const total = budgetWeekTotalLabel();
    for (const [name, b] of bodies()) {
      expect(b, `${name}: 주간 합계 ${total}이 없다`).toContain(total);
    }
  });

  it("두 글이 같은 다섯 메뉴를 싣는다", () => {
    for (const d of budgetWeek()) {
      for (const [name, b] of bodies()) {
        expect(b, `${name}: "${d.name}"이 없다 — 표가 파생을 안 쓰고 있다`).toContain(d.name);
      }
    }
  });

  it("손으로 적은 옛 주간 합계가 되살아나지 않는다", () => {
    // 두 글이 각각 $9.93·$9.75로 서로 다른 주를 말하고 있었다.
    for (const [name, b] of bodies()) {
      for (const dead of ["$9.75/week", "Weekly Total: $9.93", "~$19.50/week"]) {
        expect(b, `${name}: 손 표가 돌아왔다 → ${dead}`).not.toContain(dead);
      }
    }
  });
});

/**
 * 🔴 2026-08-23: 가격지수 표의 빈 칸이 **"TBD"**로 나가고 있었다 — 9칸.
 *    개발용 자리표시자를 독자에게 그대로 보인 것이고, 사이트의 간판 데이터 페이지에서
 *    "아직 안 만든 페이지"로 읽힌다. 애드센스 거절 사유가 "가치가 별로 없는 콘텐츠"였다.
 *
 * 전수 크롤(35쪽)에서 발견했다 — 어떤 가드도 JSX 페이지의 **화면 문구**를 안 보고 있었다.
 */
describe("🔴 자리표시자 문구가 화면으로 나가지 않는다", () => {
  const PAGES = () => {
    const root = new URL("../app/", import.meta.url);
    const out: string[] = [];
    const walk = (dir: URL) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const child = new URL(e.name + (e.isDirectory() ? "/" : ""), dir);
        if (e.isDirectory()) walk(child);
        else if (e.name.endsWith(".tsx")) out.push(fileURLToPath(child));
      }
    };
    walk(root);
    return out;
  };

  /** 주석을 걷어낸 소스 — 주석 안의 "TBD"는 설명이지 화면 문구가 아니다. */
  const withoutComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

  const PLACEHOLDERS = [/\bTBD\b/, /\bTODO\b/, /\bFIXME\b/, /\bLorem ipsum\b/i, /\bplaceholder text\b/i, /\bXXX\b/];

  it("양성 대조 — 페이지 파일을 실제로 읽었다", () => {
    expect(PAGES().length, "app 아래 tsx를 하나도 못 찾았다").toBeGreaterThan(10);
  });

  it("app의 어느 페이지에도 자리표시자가 없다", () => {
    const bad: string[] = [];
    for (const f of PAGES()) {
      const src = withoutComments(readFileSync(f, "utf-8"));
      for (const re of PLACEHOLDERS) {
        const m = re.exec(src);
        if (m) bad.push(`${f.split("/app/")[1]}: "${m[0]}" — ${src.slice(Math.max(0, m.index - 50), m.index + 40).replace(/\s+/g, " ")}`);
      }
    }
    expect(bad, `자리표시자가 화면 문구에 남아 있다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("글 본문에도 자리표시자가 없다", () => {
    const all = [...Object.entries(POSTS), ...Object.entries(GUIDES)];
    expect(all.length).toBeGreaterThan(20);
    const bad: string[] = [];
    for (const [slug, e] of all) {
      for (const re of PLACEHOLDERS) if (re.test(e.body)) bad.push(`${slug}: ${re.source}`);
    }
    expect(bad, `본문에 자리표시자가 있다 → ${bad.join(", ")}`).toEqual([]);
  });
});

/**
 * 🔴 2026-08-23: 사이트가 연락처 주소를 **두 개** 쓰고 있었다.
 *    브랜드 주소(`kiwilunchboxplanner@`)가 약관·방침·문의·JSON-LD에 있는데,
 *    About과 **개인정보 방침의 정정 절**은 운영자 개인 주소를 적고 있었다 —
 *    같은 방침 페이지가 한 화면에서 두 주소를 말하는 상태였다.
 *    심사자가 "어디로 연락하라는 건가"를 묻게 되는 종류의 모순이다.
 */
describe("🔴 공개 연락처는 하나다", () => {
  const src = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf-8");
  const FILES = [
    "app/[locale]/about/page.tsx",
    "app/[locale]/policies/page.tsx",
    "app/[locale]/terms/page.tsx",
    "app/[locale]/contact/page.tsx",
    "app/[locale]/layout.tsx",
  ];

  it("양성 대조 — 페이지에서 주소를 실제로 읽었다", () => {
    const found = FILES.flatMap((f) => [...src(f).matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)].map((m) => m[0]));
    expect(found.length, "이메일 주소를 하나도 못 찾았다").toBeGreaterThan(0);
  });

  it("공개 페이지에 브랜드 주소 말고 다른 주소가 없다", () => {
    const BRAND = "kiwilunchboxplanner@gmail.com";
    const bad: string[] = [];
    for (const f of FILES) {
      for (const m of src(f).matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)) {
        if (m[0] !== BRAND) bad.push(`${f.split("/").pop()}: ${m[0]}`);
      }
    }
    expect(bad, `공개 페이지에 다른 연락처가 있다 →\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("messages 세 언어의 연락처 키가 모두 같은 주소다", () => {
    const LOCALES = ["en", "ko", "zh"] as const;
    const keys = ["terms_contact_email", "privacy_contact_email", "contact_email_addr"];
    const seen = new Set<string>();
    for (const l of LOCALES) {
      const m = JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8")) as Record<string, string>;
      for (const k of keys) {
        expect(m[k], `${l}/${k}가 없다`).toBeTruthy();
        seen.add(m[k]);
      }
    }
    expect([...seen], `연락처가 여러 개다 → ${[...seen].join(", ")}`).toHaveLength(1);
  });
});

/**
 * 🔴 특가 이력 2편 (2026-09-07).
 *
 * 이 두 글은 **관측 방법이 바뀐 자리**에 서 있다. 09-07부터 전단 PDF를 통째로
 * 입력하기 시작해서 주당 특가 건수가 세 배가 됐는데, 그건 마트가 아니라 내 수집이
 * 바뀐 것이다. 그래서 여기가 지키는 건 숫자의 정확성만이 아니라 **어떤 형태의
 * 주장을 했는가**다 — 「N/N주」는 수집이 성길수록 내려가는 값이라 안전하고,
 * 「건수가 늘었다」는 수집이 커지면 저절로 참이 되므로 쓰면 안 된다.
 */
describe("🔴 특가 이력 글 2편", () => {
  describe("always-on-special: 매주 특가였던 것", () => {
    const SLUG = "what-is-always-on-special-nz-supermarkets";
    const body = () => POSTS[SLUG].body;

    it("존재하고, 매주 특가였던 재료가 실제로 그 재료다", async () => {
      const { everyWeekKeys, PROMO_WEEK_COUNT, label } = await import("./promoHistory");
      const keys = everyWeekKeys();
      expect(keys.length, "매주 특가인 재료가 하나도 없으면 이 글의 논지가 사라진다")
        .toBeGreaterThan(0);
      const b = body();
      for (const s of keys) {
        expect(s.weeks).toBe(PROMO_WEEK_COUNT);
        expect(b, `${s.key}가 매주 특가인데 본문에 없다`).toContain(label(s.key).toLowerCase());
      }
    });

    it("🔴 표의 「할인율을 잰 주」가 「특가였던 주」와 섞이지 않는다", async () => {
      const { keyStats, frequencyTableMarkdown } = await import("./promoHistory");
      const thin = keyStats().filter((s) => s.weeks >= 5 && s.pricedWeeks < 3);
      expect(thin.length, "표본이 얇은 행이 하나도 없으면 이 검사가 공허하다")
        .toBeGreaterThan(0);
      const table = frequencyTableMarkdown(12);
      for (const s of thin) {
        if (!table.includes(`| ${s.key[0].toUpperCase()}${s.key.slice(1)}`)) continue;
        // 잰 주가 3주 미만이면 중앙값을 숫자로 내지 않는다 — 1주 측정이 9주처럼 읽힌다.
        const row = table.split("\n").find((r) => r.toLowerCase().includes(s.key));
        expect(row, `${s.key}: 표본 ${s.pricedWeeks}주인데 중앙값을 숫자로 냈다`)
          .toContain("too few to say");
      }
    });

    it("🔴 건수 추세를 사실로 주장하지 않는다 — 그건 내 수집이 바뀐 것이다", () => {
      const b = body();
      expect(b, "건수 이야기를 꺼냈으면 그게 추세가 아니라는 말이 반드시 붙어야 한다")
        .toMatch(/It is not a trend/);
      expect(b, "수집 방식이 바뀌었다는 고백이 없다").toMatch(/mailer PDFs in full|my notebook got bigger/);
    });

    it("🔴 「한 주만 나온 것」이 반대 방향임을 밝힌다", () => {
      // 10/10은 관측이 성길수록 강해지고, "한 주만"은 성길수록 부풀려진다.
      // 두 주장을 같은 신뢰도로 내놓으면 안 된다.
      expect(body(), "once-only 수치의 한계를 밝히지 않았다")
        .toMatch(/floor on how much variety/i);
    });

    it("한계 고백이 빠지지 않는다", () => {
      const b = body();
      expect(b, "체인이 둘뿐이라는 한계가 없다").toMatch(/two chains, not three/i);
      expect(b, "지역 한계가 없다").toMatch(/North Island/);
      expect(b, "정가가 안 찍히는 주가 있다는 한계가 없다").toMatch(/does not print one/i);
    });
  });

});

/**
 * 🔴 2026-09-08. PR #24가 특가 순위 방식을 바꿨는데 **홈 기능 설명은 옛 동작을 말하고
 * 있었다** — 세 언어 전부 "on sale 재료를 우선한다"(초기 동작). 그게 바로 사용자에게
 * 주당 $1.84 손해를 끼치던 방식이라 고친 것인데, 문구만 남아 있었다.
 *
 * 애드센스가 여섯 번 지적한 게 정확히 이 형태다 — **사이트가 없는 기능을 주장하는 것.**
 * 기능을 바꿀 때 문구를 같이 못 고치는 걸 여기서 잡는다.
 */
describe("🔴 홈 기능 설명이 실제 순위 방식과 일치한다", () => {
  const SRC = () => readFileSync(new URL("./planGenerator.ts", import.meta.url), "utf-8");

  it("코드가 「할인 후 원가」로 순위를 매긴다", () => {
    const src = SRC();
    expect(src, "CHEAPNESS_WEIGHT_SCALE이 없다 — 순위 방식이 또 바뀌었나").toContain("CHEAPNESS_WEIGHT_SCALE");
    expect(src, "menuNetCost가 없다").toContain("menuNetCost");
  });

  it("🔴 세 언어 모두 「on sale 재료를 우선한다」고 말하지 않는다", () => {
    // 옛 동작이다. 절약액이 큰 재료를 우선하면 비싼 메뉴로 끌려간다(r = 0.56).
    const bad: string[] = [];
    for (const loc of ["en", "ko", "zh"] as const) {
      const m = JSON.parse(
        readFileSync(new URL(`../messages/${loc}.json`, import.meta.url), "utf-8"),
      ) as Record<string, string>;
      const v = m.home_feat_sales_desc ?? "";
      if (/prioritise ingredients on sale|prioritize ingredients on sale|세일 식재료를 우선|优先使用.*特价食材/.test(v)) {
        bad.push(`${loc}: ${v.slice(0, 60)}`);
      }
      // 별표가 화면으로 나가지 않게 (UI 문자열은 평문으로 렌더된다)
      expect(v, `${loc}: 마크다운 별표가 UI 문구에 있다`).not.toMatch(/\*\*/);
    }
    expect(bad, "홈 기능 설명이 PR #24 이전 동작을 말한다").toEqual([]);
  });

  it("특가 문구가 세 언어 모두 채워져 있다", () => {
    for (const loc of ["en", "ko", "zh"] as const) {
      const m = JSON.parse(
        readFileSync(new URL(`../messages/${loc}.json`, import.meta.url), "utf-8"),
      ) as Record<string, string>;
      expect((m.home_feat_sales_desc ?? "").length, `${loc}: 비어 있다`).toBeGreaterThan(20);
    }
  });
});

/**
 * 🔴 1인분 원가 글(2026-09-09 신설) — `pack-price-vs-cost-per-serve-nz-lunchbox`.
 *
 * 이 글의 논지는 **"매대 가격 순위와 도시락 1인분 순위가 어긋난다"**이므로,
 * 어긋남의 개수와 방향이 본문과 다르면 글이 통째로 무너진다.
 *
 * 🔴 기대값을 `lib/portionEconomics.ts`에서 **가져오지 않는다.** 같은 함수로 만든 값을
 *    같은 함수로 검사하면 어떤 값이 들어 있어도 초록이다(08-31에 첫인사 빠진 초안 70건이
 *    그렇게 전부 통과했다). 아래는 `PORTION_BASIS`와 가격 캐시에서 **다시 계산한다.**
 */
describe("🔴 1인분 원가 글", () => {
  const SLUG = "pack-price-vs-cost-per-serve-nz-lunchbox";
  const cache = JSON.parse(
    readFileSync(new URL("../data/price_cache.json", import.meta.url), "utf-8"),
  ) as Record<string, { data?: { price?: number } }>;

  /** 본문과 무관하게 다시 만든 표. 팩값·1인분값·인분수를 여기서 직접 계산한다. */
  const recomputed = Object.entries(PORTION_BASIS)
    .map(([key, basis]) => {
      const packCost = cache[key]?.data?.price;
      if (typeof packCost !== "number" || !(packCost > 0)) return null;
      const factor = PORTION_FACTORS[key] ?? DEFAULT_PORTION;
      return {
        key,
        pack: basis.pack,
        packCost,
        serveCost: packCost * factor,
        serves: Math.floor(1 / factor),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const body = () => POSTS[SLUG].body;

  it("글이 존재하고 템플릿이 남김없이 전개됐다", () => {
    expect(POSTS[SLUG], "글이 없다").toBeDefined();
    expect(body(), "전개 안 된 템플릿이 본문에 남았다").not.toContain("${");
    expect(body(), "표가 비었다").toContain("| Ingredient | Pack | Pack price |");
  });

  it("🔴 팩 크기 근거가 있는 재료가 조용히 줄지 않았다", () => {
    // portionRows()는 캐시에 없는 키를 건너뛴다. 그 폴백이 조용하지 않게 여기서 센다.
    const missing = Object.keys(PORTION_BASIS).filter((k) => {
      const p = cache[k]?.data?.price;
      return !(typeof p === "number" && p > 0);
    });
    expect(missing, "PORTION_BASIS에 있는데 값을 못 붙인 재료가 생겼다").toEqual([]);
    expect(body(), "본문의 재료 개수가 실제와 다르다").toContain(`${recomputed.length} lunchbox ingredients`);
  });

  it("🔴 어긋남 개수가 본문과 같다 — 다시 계산해서 대조한다", () => {
    const byPack = [...recomputed].sort((a, b) => b.packCost - a.packCost).map((r) => r.key);
    const byServe = [...recomputed].sort((a, b) => b.serveCost - a.serveCost).map((r) => r.key);
    const half = recomputed.length / 2;
    const flipped = recomputed.filter((r) => {
      const p = byPack.indexOf(r.key) + 1;
      const s = byServe.indexOf(r.key) + 1;
      return (p > half && s <= half) || (p <= half && s > half);
    }).length;
    expect(flipped, "어긋남이 0이면 이 글은 쓸 게 없다").toBeGreaterThan(0);
    expect(body(), `어긋남 ${flipped}건이 본문에 없다`).toContain(`**${flipped} of the ${recomputed.length} ingredients`);
  });

  it("🔴 순위 상관이 본문과 같고, 「반은 맞다」는 표현이 값과 어긋나지 않는다", () => {
    const byPack = [...recomputed].sort((a, b) => b.packCost - a.packCost).map((r) => r.key);
    const byServe = [...recomputed].sort((a, b) => b.serveCost - a.serveCost).map((r) => r.key);
    const n = recomputed.length;
    const d2 = recomputed.reduce(
      (a, r) => a + (byPack.indexOf(r.key) - byServe.indexOf(r.key)) ** 2,
      0,
    );
    const rho = 1 - (6 * d2) / (n * (n * n - 1));
    expect(body(), `상관 ${rho.toFixed(2)}이 본문에 없다`).toContain(`**${rho.toFixed(2)}**`);
    // 본문은 "0도 1도 아니다"라고 말한다. 값이 극단으로 가면 그 문장이 거짓이 된다.
    expect(rho, "상관이 0에 가까우면 「노이즈가 아니다」가 거짓이 된다").toBeGreaterThan(0.2);
    expect(rho, "상관이 1에 가까우면 이 글의 논지 자체가 없어진다").toBeLessThan(0.9);
  });

  it("🔴 「팩이 곧 1인분」이라는 설명이 실제 그 재료에 들어맞는다", () => {
    const dearest = [...recomputed].sort((a, b) => b.serveCost - a.serveCost)[0];
    expect(body(), "가장 비싼 1인분 재료가 본문과 다르다").toContain(
      `The ${dearest.key.toLowerCase()} row is the clearest case`,
    );
    expect(dearest.serves, "가장 비싼 1인분이 팩을 여러 번 나눠 쓰는 것이면 설명이 틀린다").toBeLessThanOrEqual(2);
  });

  it("🔴 본문에 손으로 적은 금액이 없다 — 캐시가 갱신되면 낡는다", () => {
    const src = readFileSync(new URL("../content/posts.ts", import.meta.url), "utf-8");
    const start = src.indexOf(`"${SLUG}"`);
    expect(start, "글을 소스에서 못 찾았다").toBeGreaterThan(-1);
    const rest = src.slice(start + SLUG.length + 2);
    const next = rest.search(/\n {2}"[a-z0-9-]+": \{/);
    const section = rest.slice(0, next === -1 ? undefined : next);
    // imageCaption은 예외다 — 사진에 찍힌 값이라 추적 데이터가 갱신돼도 변하지 않는다.
    const withoutCaption = section.replace(/imageCaption:[\s\S]*?category:/, "category:");
    expect(withoutCaption.match(/\$\d/g) ?? [], "본문에 손으로 적은 금액이 있다").toEqual([]);
  });
});

/**
 * 🔴 진열가 시계열 글(2026-09-09 신설) — `what-moved-nz-supermarket-shelf-prices`.
 *
 * 이 글은 **"안 움직였다"**를 주장한다. 안 움직였다는 주장은 관측이 성길수록 저절로
 * 강해지므로, 관측 자체가 조건을 만족하는지를 가드가 먼저 본다.
 *
 * 🔴 기대값을 `lib/priceMovement.ts`에서 가져오지 않는다 — `data/priceHistory.json`을
 *    직접 읽어 다시 계산해 본문과 대조한다.
 */
describe("🔴 진열가 시계열 글", () => {
  const SLUG = "what-moved-nz-supermarket-shelf-prices";
  /** SKU를 사람이 고정한 날. 이 전 관측은 브랜드 교체를 가격 변동으로 읽는다. */
  const PINNED_FROM = "2026-07-30";

  const hist = JSON.parse(
    readFileSync(new URL("../data/priceHistory.json", import.meta.url), "utf-8"),
  ) as { columns: Record<string, Array<{ date: string; items: Record<string, number> }>> };
  const col = hist.columns.woolworths;

  const common = col.reduce<string[]>(
    (acc, r) => acc.filter((k) => k in r.items),
    Object.keys(col[0].items),
  );
  const series = common.map((name) => ({
    name,
    vals: col.map((r) => r.items[name]),
  }));
  const stable = series.filter((s) => s.vals.every((v) => v === s.vals[0]));

  const body = () => POSTS[SLUG].body;

  it("글이 존재하고 템플릿이 남김없이 전개됐다", () => {
    expect(POSTS[SLUG], "글이 없다").toBeDefined();
    expect(body(), "전개 안 된 템플릿이 본문에 남았다").not.toContain("${");
    expect(POSTS[SLUG].title, "제목의 주 수도 생성돼야 한다").toMatch(/^\d+ Weeks/);
  });

  it("🔴 관측 창이 SKU 고정일 이후다 — 그 전 값은 브랜드 교체를 가격으로 읽는다", () => {
    const earliest = col.map((r) => r.date).sort()[0];
    expect(
      earliest >= PINNED_FROM,
      `가장 이른 관측 ${earliest}이 SKU 고정일 ${PINNED_FROM}보다 앞선다 — 이 글의 전제가 깨졌다`,
    ).toBe(true);
    expect(body(), "고정일이 본문에 없다").toContain("30 July 2026");
  });

  it("🔴 「안 움직였다」가 관측 부족 때문이 아니다", () => {
    // 관측이 두세 번뿐이면 "안 움직였다"는 자동으로 참이 된다. 최소 관측 수를 요구한다.
    expect(col.length, "관측이 너무 적어 안정성을 주장할 수 없다").toBeGreaterThanOrEqual(6);
    // 전부 움직였거나 전부 안 움직였으면 이 글의 대조 자체가 없다.
    expect(stable.length, "안 움직인 게 0이면 글의 논지가 없다").toBeGreaterThan(0);
    expect(stable.length, "전부 안 움직였으면 「무엇이 움직였나」가 빈 표가 된다").toBeLessThan(
      series.length,
    );
  });

  it("🔴 개수가 본문과 같다 — 다시 계산해서 대조한다", () => {
    expect(body(), `관측 ${col.length}회가 본문에 없다`).toContain(`I have ${col.length} readings`);
    expect(body(), `안 움직인 ${stable.length}/${series.length}이 본문에 없다`).toContain(
      `## ${stable.length} of ${series.length} did not move at all`,
    );
    for (const s of stable) {
      expect(body(), `안 움직인 품목 "${s.name}"이 본문 목록에 없다`).toContain(s.name);
    }
  });

  it("🔴 바구니 합계가 본문과 같다", () => {
    const first = series.reduce((a, s) => a + s.vals[0], 0);
    const last = series.reduce((a, s) => a + s.vals[s.vals.length - 1], 0);
    expect(body(), `첫 합계 ${first.toFixed(2)}이 본문에 없다`).toContain(`$${first.toFixed(2)}`);
    expect(body(), `끝 합계 ${last.toFixed(2)}이 본문에 없다`).toContain(`$${last.toFixed(2)}`);
  });

  it("🔴 규격이 바뀐 행이 변동 표에 섞이지 않았다", () => {
    const kept = new Set(common);
    const redefined = [
      ...Object.keys(col[0].items).filter((k) => !kept.has(k)),
      ...Object.keys(col[col.length - 1].items).filter((k) => !kept.has(k)),
    ];
    expect(redefined.length, "규격 변경 행이 하나도 없으면 그 절이 거짓말이다").toBeGreaterThan(0);
    const table = body().split("## What did move")[1]?.split("##")[0] ?? "";
    for (const name of redefined) {
      expect(table, `규격이 바뀐 "${name}"이 변동 표에 있다 — 내 명세 변경을 물가로 센 것`).not.toContain(
        `| ${name} |`,
      );
      expect(body(), `"${name}"을 왜 뺐는지 본문이 안 밝힌다`).toContain(name);
    }
  });

  it("🔴 본문에 손으로 적은 금액이 없다", () => {
    const src = readFileSync(new URL("../content/posts.ts", import.meta.url), "utf-8");
    const start = src.indexOf(`"${SLUG}"`);
    expect(start, "글을 소스에서 못 찾았다").toBeGreaterThan(-1);
    const rest = src.slice(start + SLUG.length + 2);
    const next = rest.search(/\n {2}"[a-z0-9-]+": \{/);
    const section = rest.slice(0, next === -1 ? undefined : next);
    const withoutCaption = section.replace(/imageCaption:[\s\S]*?category:/, "category:");
    expect(withoutCaption.match(/\$\d/g) ?? [], "본문에 손으로 적은 금액이 있다").toEqual([]);
  });
});

/**
 * 🔴 free-from 대체품 값 글(2026-09-09 신설) — `gluten-free-dairy-free-swap-cost-nz`.
 *
 * 이 글은 **배수**를 주장한다. 배수는 비교 상대를 누구로 잡느냐로 얼마든지 움직이므로,
 * 가드가 보는 것은 값이 아니라 **비교군이 정직하게 구성됐는가**다.
 *
 * 🔴 기대값을 `lib/substituteCosts.ts`에서 가져오지 않는다 — `PORTION_BASIS`와
 *    가격 캐시에서 다시 계산한다.
 */
describe("🔴 free-from 대체품 값 글", () => {
  const SLUG = "gluten-free-dairy-free-swap-cost-nz";
  const cache = JSON.parse(
    readFileSync(new URL("../data/price_cache.json", import.meta.url), "utf-8"),
  ) as Record<string, { data?: { price?: number } }>;

  /** "500g" → 500 · "1.5kg" → 1500 · "340mL" → 340 */
  const grams = (pack: string) => {
    const m = /^(\d+(?:\.\d+)?)\s*(kg|g|ml|l)$/i.exec(pack.trim());
    if (!m) return null;
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    return { n: unit === "kg" || unit === "l" ? n * 1000 : n, unit: unit === "kg" ? "g" : unit === "l" ? "ml" : unit };
  };
  const per100 = (key: string) => {
    const g = grams(PORTION_BASIS[key].pack)!;
    return { price: (cache[key]!.data!.price! / g.n) * 100, size: g.n, unit: g.unit };
  };
  const med = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  /** 본문과 무관하게 다시 적은 짝. 여기와 모듈이 어긋나면 둘 중 하나가 틀린 것이다. */
  const PAIRS: Array<[string, string[]]> = [
    ["Gluten-Free Bread", ["Bread"]],
    ["GF Pasta", ["Pasta", "Pasta spirals", "Macaroni", "Spaghetti"]],
    ["GF Crackers", ["Crackers", "Wholegrain Crackers"]],
    ["Gluten-Free Flour", ["Flour", "Plain Flour"]],
    ["Plant Milk", ["Milk"]],
    ["Vegan Mayo", ["Mayonnaise"]],
    ["Dairy-Free Pesto", ["Pesto"]],
  ];

  const body = () => POSTS[SLUG].body;

  it("글이 존재하고 템플릿이 남김없이 전개됐다", () => {
    expect(POSTS[SLUG], "글이 없다").toBeDefined();
    expect(body(), "전개 안 된 템플릿이 남았다").not.toContain("${");
  });

  it("🔴 비교군에 원래 그 성분이 없는 제품이 섞이지 않았다", () => {
    // 쌀 크래커·쌀국수 같은 것을 「일반 제품」으로 세면 GF 프리미엄이 공짜로 줄어든다.
    const NATURALLY_FREE = ["Rice Crackers", "Rice Noodles", "Rice Paper", "Corn Tortilla", "Rice", "Quinoa"];
    const allStandards = PAIRS.flatMap(([, std]) => std);
    for (const n of NATURALLY_FREE) {
      expect(allStandards, `"${n}"은 원래 글루텐이 없다 — 비교군에 넣으면 안 된다`).not.toContain(n);
    }
    // 표에 비교군 이름이 실제로 실려 있어야 한다. 요약해 버리면 독자가 검산할 수 없다.
    for (const [, std] of PAIRS) {
      for (const s of std) expect(body(), `비교군 "${s}"이 표에 없다`).toContain(s);
    }
  });

  it("🔴 배수가 본문과 같다 — 다시 계산해서 대조한다", () => {
    for (const [free, std] of PAIRS) {
      const f = per100(free);
      const s = std.map(per100);
      expect(s.every((x) => x.unit === f.unit), `"${free}" 비교군에 단위가 다른 것이 있다`).toBe(true);
      const mult = f.price / med(s.map((x) => x.price));
      expect(body(), `"${free}"의 배수 ${mult.toFixed(2)}×가 본문에 없다`).toContain(`${mult.toFixed(2)}×`);
    }
  });

  it("🔴 「1인분으로 재면 결론이 뒤집힌다」가 실제로 참이다", () => {
    // 본문이 방법론의 근거로 드는 사실이다. 거짓이면 그 절 전체가 거짓이 된다.
    const factor = (k: string) => PORTION_FACTORS[k] ?? DEFAULT_PORTION;
    const serveCost = (k: string) => cache[k]!.data!.price! * factor(k);
    expect(
      serveCost("Dairy-Free Pesto") < serveCost("Pesto"),
      "1인분끼리 비교해도 DF 페스토가 싸지 않다 — 본문의 방법론 설명이 근거를 잃었다",
    ).toBe(true);
    expect(
      per100("Dairy-Free Pesto").price < per100("Pesto").price,
      "단위 가격에서도 DF 페스토가 싸야 본문의 「더 싼 것」 절이 선다",
    ).toBe(true);
  });

  it("🔴 메뉴 분류가 빠짐없이 나뉜다", () => {
    const menus = (
      JSON.parse(readFileSync(new URL("../data/menuData.json", import.meta.url), "utf-8")) as {
        MENU_DATA: { en: Array<{ ingredients: string[]; is_gluten_free?: boolean }> };
      }
    ).MENU_DATA.en;
    const subs = new Set([...PAIRS.map(([f]) => f), "GF Sausages"]);
    const gf = menus.filter((m) => m.is_gluten_free);
    const withSub = gf.filter((m) => m.ingredients.some((i) => subs.has(i)));
    expect(withSub.length + (gf.length - withSub.length), "분류 합이 GF 메뉴 수와 다르다").toBe(gf.length);
    expect(withSub.length, "대체품을 쓰는 GF 메뉴가 0이면 그 표가 빈다").toBeGreaterThan(0);
    expect(gf.length - withSub.length, "원래 밀이 없는 GF 메뉴가 0이면 이 글의 결론이 없다").toBeGreaterThan(0);
    // 🔴 개수를 본문과 직접 대조한다. 0보다 크기만 확인하면 대체품 목록에서 하나를
    //    빼도 가드가 전부 초록이다(2026-09-09에 돌연변이로 실제로 확인했다).
    expect(body(), `대체품을 쓰는 GF 메뉴 ${withSub.length}/${gf.length}가 본문과 다르다`).toContain(
      `only ${withSub.length} of those ${gf.length} menus`,
    );
    expect(body(), `원래 밀이 없는 GF 메뉴 ${gf.length - withSub.length}가 본문과 다르다`).toContain(
      `The other ${gf.length - withSub.length} were never wheat-based`,
    );
    expect(body(), `GF 메뉴 ${gf.length}개가 본문에 없다`).toContain(`${gf.length} are gluten-free`);
    expect(body(), `전체 메뉴 ${menus.length}개가 본문에 없다`).toContain(`${menus.length} lunch menus`);
  });

  it("🔴 본문에 손으로 적은 금액이 없다", () => {
    const src = readFileSync(new URL("../content/posts.ts", import.meta.url), "utf-8");
    const start = src.indexOf(`"${SLUG}"`);
    expect(start, "글을 소스에서 못 찾았다").toBeGreaterThan(-1);
    const rest = src.slice(start + SLUG.length + 2);
    const next = rest.search(/\n {2}"[a-z0-9-]+": \{/);
    const section = rest.slice(0, next === -1 ? undefined : next);
    expect(section.match(/\$\d/g) ?? [], "본문에 손으로 적은 금액이 있다").toEqual([]);
  });
});

/**
 * 🔴 가격지수 표의 단위 가격(2026-09-09 신설).
 *
 * 크기를 **품목명에서** 뽑는다 — 독자가 화면에서 보는 것이 그 이름이라 검산이 가능하다.
 * 그 대신 여기서 `priceIndexSources.json`의 `pinnedSize`와 **대조한다.**
 * 둘이 갈라지면 이름이 낡았거나 SKU가 바뀐 것이고, 어느 쪽이든 사람이 봐야 한다.
 */
describe("🔴 가격지수 단위 가격", () => {
  const idx = JSON.parse(
    readFileSync(new URL("../data/priceIndex.json", import.meta.url), "utf-8"),
  ) as { items: Array<{ name: string; countdown: number | null; paknsave: number | null }> };
  const sources = JSON.parse(
    readFileSync(new URL("../data/priceIndexSources.json", import.meta.url), "utf-8"),
  ) as {
    items: Record<
      string,
      { pinnedSize?: string; paknsave?: { pinnedSize?: string }; newworld?: { pinnedSize?: string } }
    >;
  };

  /** "6pk" · "6pack" · "per kg" · "kg" 를 같은 것으로 본다. 표기 차이는 규격 차이가 아니다. */
  const normalise = (raw: string): string | null => {
    const v = raw.trim().toLowerCase().replace(/^per\s+/, "");
    if (!v || v === "ea" || v === "each") return null;
    const pack = /^(\d+)\s*(pack|pk)$/.exec(v);
    // "1pk"는 낱개다(양상추). 1개들이 팩에 단위 가격을 붙이면 진열가를 되풀이할 뿐이다 —
    // `unitPriceLabel`도 n<=1이면 아무것도 안 만든다. 두 곳의 뜻을 맞춰 둔다.
    if (pack) return Number(pack[1]) > 1 ? `${pack[1]}ea` : null;
    const wv = /^(\d+(?:\.\d+)?)\s*(kg|g|ml|l)$/.exec(v);
    if (wv) {
      const n = Number(wv[1]);
      switch (wv[2]) {
        case "kg": return `${n * 1000}g`;
        case "l": return `${n * 1000}ml`;
        default: return `${n}${wv[2]}`;
      }
    }
    if (v === "kg") return "1000g";
    if (v === "l") return "1000ml";
    return null;
  };

  it("🔴 이름에서 뽑은 크기가 고정된 SKU 규격과 일치한다", async () => {
    const { packSizeFromName } = await import("./unitPrice");
    const mismatched: string[] = [];
    let checked = 0;
    for (const item of idx.items) {
      const fromName = packSizeFromName(item.name);
      const src = sources.items[item.name];
      if (!src) continue;
      const pinned = [src.pinnedSize, src.paknsave?.pinnedSize, src.newworld?.pinnedSize]
        .filter((x): x is string => typeof x === "string" && x.trim() !== "")
        .map(normalise)
        .filter((x): x is string => x !== null);
      for (const p of pinned) {
        checked++;
        const mine = fromName ? `${fromName.n}${fromName.unit}` : null;
        if (mine !== p) mismatched.push(`${item.name}: 이름 ${mine} vs 고정 ${p}`);
      }
    }
    expect(checked, "대조한 규격이 하나도 없다 — 이 가드가 알리바이가 됐다").toBeGreaterThan(10);
    expect(mismatched, "품목명의 크기와 고정된 상품 규격이 어긋난다").toEqual([]);
  });

  it("🔴 단위 가격이 실제로 산수에 맞고, 모르는 행엔 안 붙는다", async () => {
    const { unitPriceLabel, packSizeFromName } = await import("./unitPrice");
    let labelled = 0;
    for (const item of idx.items) {
      const size = packSizeFromName(item.name);
      const label = unitPriceLabel(item.name, item.countdown);
      // 크기를 모르거나, 단위 가격이 진열가와 같은 숫자가 되는 행(정확히 1kg·1L·1개)은
      // 아무것도 안 붙는 것이 맞다.
      const redundant =
        size !== null &&
        (size.unit === "ea" ? size.n <= 1 : (size.n >= 1000 ? size.n / 1000 : size.n / 100) === 1);
      if (!size || item.countdown === null || redundant) {
        expect(label, `"${item.name}"에 붙을 이유가 없는 단위 가격이 붙었다`).toBeNull();
        continue;
      }
      labelled++;
      const n = Number(/\$([\d.]+)/.exec(label!)![1]);
      const expected =
        size.unit === "ea"
          ? item.countdown / size.n
          : size.n >= 1000
            ? item.countdown / (size.n / 1000)
            : item.countdown / (size.n / 100);
      expect(n, `"${item.name}" 단위 가격이 산수와 다르다`).toBeCloseTo(expected, 2);
    }
    expect(labelled, "단위 가격이 붙은 행이 없다").toBeGreaterThan(10);
  });

  it("🔴 개당 파는 행은 단위 가격을 안 만든다", async () => {
    const { unitPriceLabel } = await import("./unitPrice");
    const singles = idx.items.filter((i) => !/\(|pack/i.test(i.name));
    expect(singles.length, "개당 파는 행이 하나도 없으면 이 분기를 못 밟는다").toBeGreaterThan(0);
    for (const s of singles) {
      expect(unitPriceLabel(s.name, s.countdown), `"${s.name}"에 단위 가격이 붙었다`).toBeNull();
    }
  });

  it("페이지가 단위 가격을 실제로 렌더한다 (JSX 하드코딩 아님)", () => {
    const page = readFileSync(
      new URL("../app/[locale]/price-index/page.tsx", import.meta.url),
      "utf-8",
    );
    expect(page, "페이지가 unitPriceLabel을 쓰지 않는다").toContain("unitPriceLabel(item.name");
    expect((page.match(/unitPriceLabel\(item\.name/g) ?? []).length, "세 열 모두에 붙어야 한다")
      .toBeGreaterThanOrEqual(6);
  });
});

/**
 * 🔴 화면에 찍히는 재료 가격(2026-09-09 외부 감사).
 *
 * 이 파일에서 가장 비싼 가드다 — 여기가 틀리면 **사용자가 낼 수 없는 값**이 화면에 뜬다.
 *
 * 감사가 재현한 것:
 *   Milk  $3.75 → $2.58   근거: Alpro **식물성** 음료 1L $5.79→$3.99
 *   Bread $4.40 → $3.38   근거: Turkish Loaf **400g** $6.50→$5.00
 * 원인은 `basePrice * (salePrice / regularPrice)` — 전단 상품의 **할인 비율**을
 * 우리 기준가에 곱하는 계산이었다. 180개 재료 중 32개가 그런 값이었다.
 */
describe("🔴 표시 가격은 실제로 낼 수 있는 값이어야 한다", () => {
  it("🔴 옛 비율 전이 공식이 소스에서 사라졌다", () => {
    const src = readFileSync(new URL("./planGenerator.ts", import.meta.url), "utf-8");
    const body = src.slice(src.indexOf("export function effectivePackPrice"));
    // 주석에는 옛 공식이 **일부러** 적혀 있다(왜 바꿨는지 남기려고). 코드만 본다.
    const fn = body
      .slice(0, body.indexOf("\n}"))
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
      .join("\n");
    expect(fn, "할인 비율을 우리 기준가에 곱하는 계산이 돌아왔다").not.toMatch(
      /salePrice\s*\/\s*.*regularPrice/,
    );
    expect(fn, "표시 가격이 추적가를 넘지 않게 막는 min이 없다").toContain("Math.min");
  });

  it("🔴 표시 가격은 추적가 아니면 전단 특가, 둘 중 하나다", async () => {
    const { effectivePackPrice } = await import("./planGenerator");
    const mk = (regular: number, sale: number) =>
      ({ ingredient: "X", store: "woolworths", promotion: { regularPrice: regular, salePrice: sale } }) as never;
    // 전단이 더 싸면 전단 값 그대로 — 비율로 만든 제3의 숫자가 아니다
    expect(effectivePackPrice(8, mk(12, 6))).toBe(6);
    // 전단이 더 비싸면 추적가 그대로
    expect(effectivePackPrice(8, mk(12, 9))).toBe(8);
    // 특가 없으면 추적가
    expect(effectivePackPrice(8, undefined)).toBe(8);
    // 옛 공식이었다면 8 * 6/12 = 4가 나왔다. 그 값은 어디에도 없어야 한다.
    expect(effectivePackPrice(8, mk(12, 6))).not.toBe(4);
  });

  it("🔴 애매한 상품명에서는 팩 크기를 만들지 않는다", async () => {
    const { promoPackSize } = await import("./promotions");
    // 범위·복수 규격·"or"는 어느 상품의 크기인지 알 수 없다. 추측하면 없는 가격이 나온다.
    for (const n of [
      "Griffin's Toffee Pops 185-200g or MallowPuff",
      "Mainland Block Cheese 700g/Tasty 500g",
      "San Remo Pasta 375-500g",
      "SunRice Calrose, Jasmine or Brown 5kg",
      "Alpro Soya or Coconut Soy Barista Milk 1L",
    ]) {
      expect(promoPackSize(n), `"${n}"에서 팩 크기를 지어냈다`).toBeNull();
    }
    // 반대로 명확한 것은 읽어야 한다 — 전부 null이면 이 가드가 알리바이다
    expect((await import("./promotions")).promoPackSize("Turkish Loaf 400g")).toEqual({ n: 400, unit: "g" });
    expect((await import("./promotions")).promoPackSize("Better Eggs Free Range Size 7 12 Pack")).toEqual({ n: 12, unit: "ea" });
  });

  it("🔴 이번 주 실제 데이터로: 붙은 할인이 전부 같은 용량·더 싼 값이다", async () => {
    const { getActivePromotions, pricedMatchFor, promoPackSize } = await import("./promotions");
    const { packPrice } = await import("./servePrice");
    const promos = getActivePromotions();
    const applied: string[] = [];
    for (const key of Object.keys(PORTION_BASIS)) {
      let base = 0;
      try { base = packPrice(key); } catch { continue; }
      const m = pricedMatchFor(key, PORTION_BASIS[key].pack, base, promos);
      if (!m) continue;
      applied.push(key);
      expect(m.pricesIngredients ?? [], `"${key}"에 사람이 안 적은 특가가 붙었다`).toContain(key);
      expect(m.salePrice, `"${key}"의 전단가가 추적가보다 싸지 않은데 붙었다`).toBeLessThan(base);
      // 🔴 실제로 할인 중이어야 한다. New World 전단은 정가=특가로 들어오는 항목이 많고,
      //    그걸 반영하면 할인이 아니라 **체인 간 가격차**를 「이번 주 특가」로 찍게 된다.
      //    (2026-09-09 후보 도구를 만들다 드러났다 — 5건 중 2건이 그랬다.)
      expect(m.salePrice, `"${key}": 정가와 특가가 같은데 할인으로 붙었다`).toBeLessThan(m.regularPrice);
      const theirs = promoPackSize(m.name);
      expect(theirs, `"${key}"에 팩 크기를 못 읽는 특가가 붙었다`).not.toBeNull();
    }
    // 양성 대조 — 0건이면 위 검사가 한 번도 안 돈다
    expect(applied.length, "가격에 반영된 특가가 0건이라 이 가드가 알리바이다").toBeGreaterThan(0);
  });

  it("🔴 사람이 적지 않은 특가는 가격을 못 건드린다 (fail-closed)", async () => {
    const { pricedMatchFor } = await import("./promotions");
    const undeclared = [{
      name: "Cheese 500g", matchKey: "cheese", category: "Dairy",
      regularPrice: 12, salePrice: 6, savings: 6, savingsPercent: 50,
      promoType: "sale", lunchboxFit: "lunchbox", store: "woolworths",
    }] as never;
    expect(
      pricedMatchFor("Cheese", "500g", 8.49, undeclared),
      "pricesIngredients 없이도 가격이 붙었다 — fail-closed가 열렸다",
    ).toBeNull();
  });
});

/**
 * 🔴 UI 문자열에 마크다운을 넣지 말 것 — 화면에 별표가 그대로 찍힌다.
 *
 * 2026-09-07에 `home_feat_sales_desc` 하나만 막는 가드를 뒀는데, 2026-09-09에
 * `planner_basis_note`를 새로 쓰면서 **같은 실수를 그대로 반복했다.** 한 키만
 * 막는 가드는 다음 키를 못 막는다 — 파일 전체로 넓힌다.
 */
describe("🔴 UI 문자열에 마크다운이 없다", () => {
  it("세 언어의 모든 문구에 ** 가 없다", () => {
    const bad: string[] = [];
    for (const loc of ["en", "ko", "zh"] as const) {
      const m = JSON.parse(
        readFileSync(new URL(`../messages/${loc}.json`, import.meta.url), "utf-8"),
      ) as Record<string, unknown>;
      for (const [k, v] of Object.entries(m)) {
        if (typeof v === "string" && v.includes("**")) bad.push(`${loc}:${k}`);
      }
    }
    expect(bad, "마크다운 별표가 화면 문구에 있다 — 그대로 찍힌다").toEqual([]);
  });
});

/**
 * 🔴 순위·최댓값을 말하는 문장은 값에서 만들어야 한다(2026-09-09 외부 감사 2번).
 *
 * 가격 격차 글에 "a bigger single-item gap than any of the four above"가 **손으로**
 * 적혀 있었다. 쓸 당시엔 참이었는데 표가 갱신되며 오이 $1.00이 상위 네 품목보다
 * 작아졌고, 문장만 남아 정면으로 거짓이 됐다.
 */
describe("🔴 가격 격차 글의 비교 문장이 표와 어긋나지 않는다", () => {
  const SLUG = "supermarket-price-gap-nz-lunchbox";

  it("비교 문장이 소스에 손으로 박혀 있지 않다", () => {
    const src = readFileSync(new URL("../content/posts.ts", import.meta.url), "utf-8");
    const start = src.indexOf(`"${SLUG}"`);
    const rest = src.slice(start);
    const section = rest.slice(0, rest.search(/\n {2}"[a-z0-9-]+": \{/));
    expect(section, "「위 네 품목보다 크다」가 손으로 적혀 돌아왔다").not.toMatch(
      /than any of the (four|five|three) above/,
    );
  });

  it("🔴 본문의 비교가 실제 수치와 같은 방향이다", () => {
    const body = POSTS[SLUG].body;
    const idx = index as { items: PriceRow[]; woolworthsUpdated: string };
    const rows = idx.items
      .filter((i) => isComparableRow(i, idx.woolworthsUpdated))
      .map((i) => ({ gap: (i.countdown as number) - (i.paknsave as number) }))
      .sort((a, b) => b.gap - a.gap);
    const back = rows.filter((r) => r.gap < 0);
    expect(back.length, "반대 방향 품목이 0이면 그 절 자체가 없어야 한다").toBeGreaterThan(0);
    const biggest = Math.abs(back[back.length - 1].gap);
    const top = rows.slice(0, 4).map((r) => r.gap);
    const claimsBigger = /bigger single-item gap than any of the rows above/.test(body);
    const claimsSmaller = /smaller than any of the rows above/.test(body);
    if (biggest > Math.max(...top)) {
      expect(claimsBigger, `반대 격차 $${biggest.toFixed(2)}가 위 전부보다 큰데 본문이 그렇게 안 말한다`).toBe(true);
    } else if (biggest < Math.min(...top)) {
      expect(claimsSmaller, `반대 격차 $${biggest.toFixed(2)}가 위 전부보다 작은데 본문이 그렇게 안 말한다`).toBe(true);
      expect(claimsBigger, "작은데 「더 크다」고 말한다").toBe(false);
    }
  });
});

/**
 * 🔴 공개 원자료 CSV(2026-09-09 외부 감사 ②).
 *
 * 감사의 요지는 "표만으로는 한 칸의 근거를 되짚을 수 없다"였다. CSV를 냈다는 것만으로는
 * 그게 해결되지 않는다 — **그 줄로 화면의 값을 다시 만들 수 있어야** 한다.
 * 그래서 이 가드는 파일이 존재하는지가 아니라 **산수가 닫히는지**를 본다.
 */
/** 따옴표를 아는 CSV 한 줄 분해. `split(",")`은 `"Ormiston, Auckland"`에서 어긋난다. */
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

describe("🔴 원자료 CSV가 실제로 검산 가능하다", () => {
  it("재료 CSV의 한 줄로 1인분 원가가 재현된다", async () => {
    const { GET } = await import("../app/lunchbox-ingredients.csv/route");
    const text = await (GET() as Response).text();
    const rows = text.trim().split("\n");
    const head = rows[0].split(",");
    expect(head, "감사가 요구한 열이 빠졌다").toEqual(
      expect.arrayContaining([
        "ingredient", "pinned_product", "sku", "pack_size",
        "pack_price_nzd", "pack_price_read_on", "serve_size",
        "serve_fraction_of_pack", "serve_cost_nzd", "measurement",
      ]),
    );
    expect(rows.length, "행이 거의 없으면 이 가드가 알리바이다").toBeGreaterThan(100);

    const iPack = head.indexOf("pack_price_nzd");
    const iFrac = head.indexOf("serve_fraction_of_pack");
    const iServe = head.indexOf("serve_cost_nzd");
    let checked = 0;
    for (const line of rows.slice(1)) {
      // 따옴표가 없는 줄만 단순 분해로 검산한다 — 이 세 열은 항상 숫자다.
      const c = splitCsv(line);
      const pack = Number(c[iPack]);
      const frac = Number(c[iFrac]);
      const serve = Number(c[iServe]);
      if (!Number.isFinite(pack) || !Number.isFinite(frac) || !Number.isFinite(serve)) continue;
      checked++;
      expect(serve, `${c[0]}: 팩값 × 비율 ≠ 1인분 원가`).toBeCloseTo(pack * frac, 3);
    }
    expect(checked, "검산한 줄이 없다").toBeGreaterThan(100);
  });

  it("🔴 추정치가 추정이라고 적혀 있다 — 감사가 짚은 「추측 없음」의 반대편", async () => {
    const { GET } = await import("../app/lunchbox-ingredients.csv/route");
    const text = await (GET() as Response).text();
    expect(text, "1인분 비율이 실측인 척한다").toContain("serve=estimated");
    expect(text, "팩 가격이 관측값이라고 안 적혀 있다").toContain("pack_price=observed");
  });

  it("지수 CSV가 체인·관측일·SKU를 줄마다 들고 있다", async () => {
    const { GET } = await import("../app/price-index.csv/route");
    const text = await (GET() as Response).text();
    const rows = text.trim().split("\n");
    const head = rows[0].split(",");
    for (const col of ["observed_on", "chain", "store", "product_name", "sku", "pack_size", "price_type"]) {
      expect(head, `${col} 열이 없다`).toContain(col);
    }
    expect(rows.length, "지수 행이 없다").toBeGreaterThan(20);
    // 🔴 지수는 정상가만 기록한다. 특가가 섞이면 지수의 뜻 자체가 달라진다.
    //    🔴 처음엔 따옴표가 있는 줄을 건너뛰었는데, store 열이 항상 `"Ormiston, Auckland"`라
    //       **한 줄도 검사하지 않았다**(2026-09-09 돌연변이로 확인). 제대로 분해한다.
    const iType = head.indexOf("price_type");
    const types = new Set(rows.slice(1).map((l) => splitCsv(l)[iType]));
    expect(types.size, "price_type을 한 줄도 못 읽었다 — 이 검사가 알리바이다").toBeGreaterThan(0);
    expect([...types].filter((t) => t && t !== "regular"), "정상가 아닌 값이 섞였다").toEqual([]);
  });

  it("시계열 CSV의 줄 수가 실제 관측 수와 같다", async () => {
    const { GET } = await import("../app/price-history.csv/route");
    const text = await (GET() as Response).text();
    const hist = JSON.parse(
      readFileSync(new URL("../data/priceHistory.json", import.meta.url), "utf-8"),
    ) as { columns: Record<string, Array<{ items: Record<string, number> }>> };
    const expected = Object.values(hist.columns)
      .flat()
      .reduce((n, r) => n + Object.keys(r.items).length, 0);
    expect(text.trim().split("\n").length - 1, "관측 수와 CSV 줄 수가 다르다").toBe(expected);
    expect(expected, "관측이 없으면 이 가드가 알리바이다").toBeGreaterThan(50);
  });

  it("가격지수 페이지가 세 파일을 실제로 링크한다", () => {
    const page = readFileSync(
      new URL("../app/[locale]/price-index/page.tsx", import.meta.url),
      "utf-8",
    );
    for (const f of ["/price-index.csv", "/price-history.csv", "/lunchbox-ingredients.csv"]) {
      expect(page, `${f} 링크가 없다`).toContain(f);
    }
    // 🔴 20행 지수와 180행 캐시가 다른 데이터셋이라는 말이 있어야 한다.
    expect(page, "두 데이터셋의 구분을 말하지 않는다").toContain("A different dataset");
  });
});

/**
 * 🔴 레시피 창의 분량 표시(2026-09-09 외부 감사 ④·⑤).
 *
 * 감사가 짚은 것: Cheesymite Scrolls가 $2.34 / 676 kcal로 뜨는데 조리법은 8개를 만들고,
 * 두 값이 어느 분량 기준인지 화면에 없었다.
 */
describe("🔴 레시피 분량과 비용 근거", () => {
  const menus = (
    JSON.parse(readFileSync(new URL("../data/menuData.json", import.meta.url), "utf-8")) as {
      MENU_DATA: { en: Array<{ name: string; ingredients: string[]; instructions?: string }> };
    }
  ).MENU_DATA.en;

  it("🔴 본문에 적힌 배치 생산량만 읽는다 — 없는 것을 만들지 않는다", async () => {
    const { parseYield } = await import("./recipeYield");
    const found = menus.filter((m) => parseYield(m.instructions));
    expect(found.length, "하나도 못 읽으면 이 기능이 죽은 것이다").toBeGreaterThan(0);
    for (const m of found) {
      const y = parseYield(m.instructions)!;
      // 읽었다면 그 숫자가 본문에 **실제로** 있어야 한다. 추론한 값이면 안 된다.
      expect(m.instructions, `${m.name}: ${y.count}이 조리법 본문에 없다`).toContain(String(y.count));
    }
    // 재료 계량("into 2 cups")을 생산량으로 읽으면 안 된다.
    expect(parseYield("rub 50g butter into 2 cups self-raising flour"), "계량을 생산량으로 읽었다").toBeNull();
    expect(parseYield("cut into 2 halves"), "한 끼를 자르는 것을 배치로 읽었다").toBeNull();
    expect(parseYield("Roll up and slice into 8 scrolls")).toEqual({ count: 8, unit: "scrolls" });
  });

  it("🔴 감사가 지목한 레시피가 실제로 배치라고 읽힌다", async () => {
    const { parseYield } = await import("./recipeYield");
    const cheesymite = menus.find((m) => m.name === "Cheesymite Scrolls");
    expect(cheesymite, "감사가 지목한 메뉴가 사라졌다").toBeDefined();
    expect(parseYield(cheesymite!.instructions)).toEqual({ count: 8, unit: "scrolls" });
  });

  it("🔴 재료마다 분량 근거가 있다 — 비용을 검산할 수 있어야 한다", () => {
    // 감사의 완료 기준: "사용자가 상품 가격과 사용량으로 화면의 비용을 직접 계산할 수 있어야".
    // 화면이 1인분 양을 보여주려면 PORTION_BASIS에 그 근거가 있어야 한다.
    const cheesymite = menus.find((m) => m.name === "Cheesymite Scrolls")!;
    const missing = cheesymite.ingredients.filter((i) => !PORTION_BASIS[i]);
    expect(missing, "이 레시피의 재료 중 분량 근거가 없는 것이 있다").toEqual([]);
  });

  it("레시피 창이 분량과 소계를 실제로 렌더한다 (JSX 하드코딩 아님)", () => {
    const src = readFileSync(new URL("../components/PlannerClient.tsx", import.meta.url), "utf-8");
    expect(src, "재료별 1인분 양을 안 보여준다").toContain("basis.serve");
    expect(src, "팩 크기·팩값을 안 보여준다").toContain("basis.pack");
    expect(src, "메인 소계가 없다").toContain("planner_main_subtotal");
    expect(src, "배치 안내가 없다").toContain("planner_batch_note");
  });
});

/**
 * 🔴 데이터를 인용하는 글은 그 데이터를 **가리켜야** 한다(2026-09-09 외부 감사 ⑥).
 *
 * 감사의 지적: "180개 가격 행이나 10회 관측을 독자가 재검산할 수 있도록" 원자료가 필요하다.
 * CSV를 낸 것만으로는 부족하고, 그 수치를 쓰는 글에서 닿을 수 있어야 한다.
 */
describe("🔴 가격 분석 글이 원자료를 가리킨다", () => {
  const PRICE_POSTS = [
    "supermarket-price-gap-nz-lunchbox",
    "three-supermarkets-nz-lunchbox-basket-compared",
    "pack-price-vs-cost-per-serve-nz-lunchbox",
    "what-moved-nz-supermarket-shelf-prices",
    "gluten-free-dairy-free-swap-cost-nz",
  ];

  it("각 글이 CSV 원자료를 링크한다", () => {
    const missing: string[] = [];
    for (const slug of PRICE_POSTS) {
      const post = POSTS[slug];
      expect(post, `${slug}이 없다`).toBeDefined();
      if (!/\/(price-index|price-history|lunchbox-ingredients)\.csv/.test(post.body)) {
        missing.push(slug);
      }
    }
    expect(missing, "수치를 쓰면서 원자료를 안 가리키는 글이 있다").toEqual([]);
  });

  it("🔴 링크한 CSV 경로가 실제로 존재하는 라우트다", () => {
    // 🔴 목록을 손으로 들지 않는다 — `app/`을 훑어 만든다. 2026-09-11에 손으로 적힌
    //    허용목록이 낡아서 **멀쩡한 새 라우트**(allergen-labels.csv)를 오탐으로 잡았다.
    const appDir = fileURLToPath(new URL("../app", import.meta.url));
    const routes = readdirSync(appDir).filter(
      (d) => d.endsWith(".csv") && existsSync(path.join(appDir, d, "route.ts")),
    );
    expect(routes.length, "CSV 라우트를 하나도 못 찾았다 — 이 검사가 알리바이다")
      .toBeGreaterThan(2);
    for (const r of ["price-index.csv", "price-history.csv", "lunchbox-ingredients.csv"]) {
      expect(routes, `/${r} 를 링크하는데 라우트가 없다`).toContain(r);
    }
    // 본문이 없는 경로를 가리키지 않는지도 본다
    for (const slug of PRICE_POSTS) {
      for (const m of POSTS[slug].body.matchAll(/\/([a-z-]+\.csv)/g)) {
        expect(routes, `${slug}이 존재하지 않는 ${m[1]}을 가리킨다`).toContain(m[1]);
      }
    }
  });
});

/**
 * 🔴 특가 토글 문구가 실제 동작을 말한다(2026-09-09).
 *
 * 정직한 가격으로 재측정한 결과: 토글의 순효과 −$3.38/주 중 **할인 기여는 −$0.04**이고
 * 나머지 −$3.66은 「싼 메뉴 선택」이었다. 문구는 특가가 일하는 것처럼 말하고 있었다.
 *
 * 🔴 이 가드가 지키는 건 특정 문장이 아니라 **두 가지 사실**이다 —
 *    ① 특가가 조건부로만 적용된다는 것을 문구가 말할 것
 *    ② 「특가가 절약을 만든다」는 무조건적 약속을 하지 않을 것
 */
describe("🔴 특가 토글 문구가 동작과 같다", () => {
  const load = (loc: string) =>
    JSON.parse(
      readFileSync(new URL(`../messages/${loc}.json`, import.meta.url), "utf-8"),
    ) as Record<string, string>;

  it("문구가 「확인된 특가만」이라는 조건을 말한다", () => {
    const bad: string[] = [];
    for (const loc of ["en", "ko", "zh"] as const) {
      const m = load(loc);
      const desc = m.home_feat_sales_desc ?? "";
      const faq = m.faq_a21 ?? "";
      // 조건을 말하는 표현이 하나라도 있어야 한다(언어별 표현이 다르므로 넓게 본다)
      const conditional =
        /matched|match|verified|확인된|같은 용량|核对|同样包装/.test(desc + faq);
      if (!conditional) bad.push(`${loc}: 조건 없이 특가를 약속한다`);
      // 옛 무조건형 약속이 돌아오면 잡는다
      if (/built around those deals by default|deals by default|특가 중심으로 계획|围绕这些优惠/.test(faq)) {
        bad.push(`${loc}: faq가 무조건 특가 중심이라고 말한다`);
      }
    }
    expect(bad, "문구가 동작보다 넓게 약속한다").toEqual([]);
  });

  it("🔴 FAQ가 「대부분의 특가는 통과하지 못한다」를 밝힌다", () => {
    // 이게 이번 재측정의 핵심 사실이다. 빼면 다시 과장이 된다.
    for (const loc of ["en", "ko", "zh"] as const) {
      const faq = load(loc).faq_a21 ?? "";
      expect(
        /do not clear it|not clear it|통과하지 못|통과하는 특가는 많지|都通不过|门槛/.test(faq),
        `${loc}: 대부분의 특가가 적용되지 않는다는 사실이 빠졌다`,
      ).toBe(true);
    }
  });

  it("토글 라벨이 「특가로 계획한다」가 아니라 「특가 반영 후 가격순」이다", () => {
    for (const loc of ["en", "ko", "zh"] as const) {
      const label = load(loc).sale_toggle_label ?? "";
      expect(label.length, `${loc}: 라벨이 비었다`).toBeGreaterThan(5);
      expect(
        /Plan around this week's specials$|^특가 중심으로/.test(label),
        `${loc}: 옛 라벨이 돌아왔다 — 토글은 순위를 매기지 계획을 특가로 짜지 않는다`,
      ).toBe(false);
    }
  });
});

/**
 * 🔴 2026-09-09 재점검에서 나온 것들.
 */
describe("🔴 재점검 — 화면의 숫자가 한 기준을 쓴다", () => {
  it("🔴 1인분 비율이 중간에서 반올림돼 있지 않다", async () => {
    const { PORTION_BASIS, PORTION_FACTORS } = await import("./planConfig");
    const packUnits = (p: string) => {
      const v = p.trim().toLowerCase();
      if (/^per\s*kg$/.test(v)) return 1000;
      if (/^(each|ea|1ea)$/.test(v)) return null;
      const c = /^(\d+)\s*pack$/.exec(v);
      if (c) return Number(c[1]);
      const m = /^(\d+(?:\.\d+)?)\s*(kg|g|ml|l)$/.exec(v);
      if (!m) return null;
      const n = Number(m[1]);
      return m[2] === "kg" || m[2] === "l" ? n * 1000 : n;
    };
    const serveUnits = (s: string) => {
      const m = /^(\d+(?:\.\d+)?)/.exec(s.trim());
      if (!m) return null;
      const n = Number(m[1]);
      return /\bkg\b|\bl\b/i.test(s) ? n * 1000 : n;
    };
    const off: string[] = [];
    let checked = 0;
    for (const [key, basis] of Object.entries(PORTION_BASIS)) {
      const p = packUnits(basis.pack);
      const sv = serveUnits(basis.serve);
      if (p === null || sv === null || !(p > 0)) continue;
      const exact = sv / p;
      if (!(exact > 0 && exact <= 1)) continue;
      checked++;
      if (Math.abs(PORTION_FACTORS[key] - exact) > 1e-9) {
        off.push(`${key}: ${PORTION_FACTORS[key]} vs 정확 ${exact}`);
      }
    }
    expect(checked, "비율을 검산한 재료가 없다 — 이 가드가 알리바이다").toBeGreaterThan(100);
    expect(off, "근거가 있는데 반올림된 비율이 남아 있다").toEqual([]);
    // 감사가 지목한 사례 — 달걀은 정확히 1/12이어야 한다
    expect(PORTION_FACTORS["Egg"]).toBeCloseTo(1 / 12, 12);
  });

  it("🔴 열량 단위가 화면과 설명에서 같다 (kcal vs kJ)", () => {
    const gen = readFileSync(new URL("./planGenerator.ts", import.meta.url), "utf-8");
    expect(gen, "화면 배지가 kcal이 아니다").toContain('label: "kcal (Est.)"');
    for (const loc of ["en", "ko", "zh"] as const) {
      const m = JSON.parse(
        readFileSync(new URL(`../messages/${loc}.json`, import.meta.url), "utf-8"),
      ) as Record<string, string>;
      for (const k of ["planner_basis_note", "planner_batch_note"]) {
        expect(m[k] ?? "", `${loc}:${k}이 kJ라고 말한다 — 배지는 kcal이다`).not.toMatch(/kilojoule|kJ/i);
      }
    }
  });

  it("🔴 분량이 조리법 투입량이 아니라는 사실을 화면이 밝힌다", () => {
    const src = readFileSync(new URL("../components/PlannerClient.tsx", import.meta.url), "utf-8");
    expect(src, "분량과 조리법의 차이를 안 밝힌다").toContain("planner_portion_vs_method");
    for (const loc of ["en", "ko", "zh"] as const) {
      const m = JSON.parse(
        readFileSync(new URL(`../messages/${loc}.json`, import.meta.url), "utf-8"),
      ) as Record<string, string>;
      expect((m.planner_portion_vs_method ?? "").length, `${loc}: 비어 있다`).toBeGreaterThan(40);
    }
  });

  it("🔴 저장된 식단을 되살릴 때 가격·할인을 다시 계산한다", () => {
    const src = readFileSync(new URL("../components/PlannerClient.tsx", import.meta.url), "utf-8");
    const restore = src.slice(src.indexOf("Restore last plan from localStorage"));
    const block = restore.slice(0, restore.indexOf("async function handleGenerate"));
    expect(block, "저장된 planData를 그대로 되살린다").not.toMatch(/setPlanData\(parsed\.planData/);
    // 09-29: 복원·생성·하루 교체·공유 링크가 `priceDay` 하나로 값을 낸다(식이 한 자리).
    //        그 함수가 특가 재매칭과 원가 재계산을 실제로 하는지는 아래에서 본다.
    // 10-12: 나이대별 양 — 복원도 저장된 나이대로 매긴다(빠지면 새로고침 뒤 기준 1인분 값으로 돌아간다).
    expect(block, "복원이 생성과 같은 가격 함수(priceDay)를 저장된 나이대로 안 쓴다").toMatch(/priceDay\(all, priceMap, promos, portionsOf\(opts\.band, opts\.extraBoxes\)\)/);
    const gen = readFileSync(new URL("./planGenerator.ts", import.meta.url), "utf-8");
    const fn = gen.slice(gen.indexOf("export function priceDay"), gen.indexOf("\n}\n", gen.indexOf("export function priceDay")));
    expect(fn, "지금 특가로 다시 매칭하지 않는다").toContain("pricedMenuMatches(ingredients, promotions)");
    expect(fn, "지금 가격으로 총액을 다시 계산하지 않는다").toContain("costForIngredients(ingredients, priceMap");
  });

  it("🔴 알레르기 필터를 절대 보증하지 않는다", () => {
    const bad: string[] = [];
    for (const loc of ["en", "ko", "zh"] as const) {
      const m = JSON.parse(
        readFileSync(new URL(`../messages/${loc}.json`, import.meta.url), "utf-8"),
      ) as Record<string, string>;
      const v = m.planner_seo_allergy_p ?? "";
      if (/never contain|絶対|绝不包含|절대 포함/.test(v)) bad.push(`${loc}: 절대 보증`);
      if (v.length < 40) bad.push(`${loc}: 비어 있다`);
    }
    expect(bad, "알레르기 문구가 태그를 보증처럼 말한다").toEqual([]);
  });
});

/**
 * 🔴 손으로 적은 금액은 「스냅샷」이라고 밝혀야 한다(2026-09-09 재신청 전 전수 조사).
 *
 * 글 10편에 손으로 적은 금액이 **611개** 있었는데, 언제·어디서 읽은 값인지 밝힌 건
 * 예산 가이드 한 편뿐이었다. 주간 추적가는 매주 움직이므로 날짜 없는 금액은
 * 시간이 지나면 **반드시** 지수와 어긋난다 — 애드센스가 여섯 번 지적한 그 모양이다.
 *
 * 🔴 금액을 지우거나 고쳐 적지 않는다. 언제 잰 값인지 모르는 채 새 숫자를 넣는 것이
 *    더 나쁘다. 무엇인지 밝히고, 지금 값으로 가는 길을 준다.
 */
describe("🔴 손으로 적은 금액이 있는 글은 스냅샷이라고 밝힌다", () => {
  const src = readFileSync(new URL("../content/posts.ts", import.meta.url), "utf-8");

  /** 소스에서 글별 본문 구간을 잘라낸다 — 렌더된 본문은 템플릿이 이미 전개돼 구별이 안 된다. */
  const bodies = () => {
    const out: Array<{ slug: string; body: string; flagged: boolean }> = [];
    const re = /\n {2}"([a-z0-9-]+)": \{/g;
    const marks: Array<[number, string]> = [];
    for (let m = re.exec(src); m; m = re.exec(src)) marks.push([m.index, m[1]]);
    marks.forEach(([pos, slug], i) => {
      const end = i + 1 < marks.length ? marks[i + 1][0] : src.length;
      const seg = src.slice(pos, end);
      const bi = seg.indexOf("body: `");
      if (bi === -1) return;
      out.push({ slug, body: seg.slice(bi), flagged: /staticPrices: true/.test(seg) });
    });
    return out;
  };

  it("🔴 금액을 손으로 적었으면 staticPrices 플래그가 있다", () => {
    const missing: string[] = [];
    let withMoney = 0;
    for (const { slug, body, flagged } of bodies()) {
      const hard = body.match(/\$\d/g) ?? [];
      if (hard.length < 5) continue;
      withMoney++;
      if (!flagged) missing.push(`${slug}: 손으로 적은 금액 ${hard.length}개`);
    }
    expect(withMoney, "금액이 든 글이 없다 — 이 가드가 알리바이다").toBeGreaterThan(5);
    expect(missing, "손으로 적은 금액이 있는데 스냅샷이라고 안 밝힌 글이 있다").toEqual([]);
  });

  it("플래그가 붙은 글은 실제로 손으로 적은 금액이 있다 (남용 방지)", () => {
    const stray = bodies()
      .filter((b) => b.flagged && (b.body.match(/\$\d/g) ?? []).length < 5)
      .map((b) => b.slug);
    expect(stray, "금액이 없는데 스냅샷 안내를 붙였다").toEqual([]);
  });

  it("🔴 가이드도 같은 규칙을 지킨다", () => {
    const gsrc = readFileSync(new URL("../content/guides.ts", import.meta.url), "utf-8");
    const missing: string[] = [];
    let withMoney = 0;
    const re = /\n {2}"([a-z0-9-]+)": \{/g;
    const marks: Array<[number, string]> = [];
    for (let m = re.exec(gsrc); m; m = re.exec(gsrc)) marks.push([m.index, m[1]]);
    marks.forEach(([pos, slug], i) => {
      const end = i + 1 < marks.length ? marks[i + 1][0] : gsrc.length;
      const seg = gsrc.slice(pos, end);
      const bi = seg.indexOf("body: `");
      if (bi === -1) return;
      const hard = seg.slice(bi).match(/\$\d/g) ?? [];
      if (hard.length < 5) return;
      withMoney++;
      if (!/staticPrices: true/.test(seg)) missing.push(`${slug}: ${hard.length}개`);
    });
    expect(withMoney, "금액이 든 가이드가 없다").toBeGreaterThan(0);
    expect(missing, "가이드에 손으로 적은 금액이 있는데 안 밝혔다").toEqual([]);
  });

  it("🔴 안내가 실제로 렌더된다 (플래그만 있고 화면엔 없으면 무의미)", () => {
    const page = readFileSync(
      new URL("../app/[locale]/blog/[slug]/page.tsx", import.meta.url),
      "utf-8",
    );
    expect(page, "staticPrices를 보지 않는다").toContain("post.staticPrices");
    expect(page, "지금 값으로 가는 길이 없다").toContain("/lunchbox-ingredients.csv");
    expect(page, "가격지수로 가는 길이 없다").toContain("price-index");
    const gpage = readFileSync(
      new URL("../app/[locale]/guides/[slug]/page.tsx", import.meta.url),
      "utf-8",
    );
    expect(gpage, "가이드가 staticPrices를 안 본다").toContain("guide.staticPrices");
  });
});

/**
 * 🔴 관측일과 상품 식별 (2026-09-10 외부 감사 3번).
 *
 * 감사가 짚은 것:
 *   · 「같은 주에 읽었다」는 글의 18개 공통 품목 중 Pak'nSave 6행·New World 6행이 8월 관측
 *   · 가격지수 CSV의 New World 18행 중 16행에 상품명·SKU가 없다
 *
 * 합계는 맞았다. 틀린 건 문장이다. 그래서 이 가드는 **문장이 데이터를 말하는지**만 본다.
 */
describe("🔴 관측일·상품 식별을 글이 스스로 밝힌다", () => {
  const THREE = (index as { items: PriceRow[]; woolworthsUpdated: string }).items.filter((r) =>
    isThreeWayComparableRow(r, (index as { woolworthsUpdated: string }).woolworthsUpdated),
  );
  const WOOLIES = (index as { woolworthsUpdated: string }).woolworthsUpdated;
  const DAY = 86_400_000;
  const fmt = (iso: string) => {
    const d = new Date(`${iso}T00:00:00Z`);
    return `${d.getUTCDate()} ${d.toLocaleString("en-NZ", { month: "long", timeZone: "UTC" })} ${d.getUTCFullYear()}`;
  };
  const post = POSTS["three-supermarkets-nz-lunchbox-basket-compared"];

  /** 3사 표에서 Woolworths 라운드보다 8일 이상 오래된 관측. */
  const stale = THREE.flatMap((r) =>
    [
      { item: r.name, chain: "Pak'nSave", on: r.paknsaveAsOf },
      { item: r.name, chain: "New World", on: r.newworldAsOf },
    ].filter((x) => x.on && (Date.parse(WOOLIES) - Date.parse(x.on)) / DAY > 7),
  ) as Array<{ item: string; chain: string; on: string }>;

  it("낡은 관측을 하나도 빠짐없이 이름과 날짜로 밝힌다", () => {
    // 🔴 양성 대조 — 낡은 행이 0이면 이 검사는 아무것도 안 본다.
    expect(stale.length, "낡은 관측이 없으면 이 가드가 알리바이다").toBeGreaterThan(0);
    const missing = stale.filter(
      (x) => !post.body.includes(x.item) || !post.body.includes(fmt(x.on)),
    );
    expect(missing.map((x) => `${x.item} / ${x.chain} / ${x.on}`)).toEqual([]);
  });

  it("「같은 주에 읽었다」는 말이 남아 있지 않다", () => {
    for (const phrase of ["read in the same week", "close enough to the same day"]) {
      expect(post.body, `3사 글에 "${phrase}"`).not.toContain(phrase);
      expect(POSTS["supermarket-price-gap-nz-lunchbox"].body, `2열 글에 "${phrase}"`)
        .not.toContain(phrase);
    }
  });

  it("2열 글도 낡은 Pak'nSave 행을 이름으로 밝힌다", () => {
    const rows = (index as { items: PriceRow[] }).items.filter((r) => isComparableRow(r, WOOLIES));
    const old = rows.filter(
      (r) => r.paknsaveAsOf && (Date.parse(WOOLIES) - Date.parse(r.paknsaveAsOf)) / DAY > 7,
    );
    const body = POSTS["supermarket-price-gap-nz-lunchbox"].body;
    // 10-19: 이번 라운드처럼 낡은 행이 0개일 수 있다 — 데이터 모양을 강요하지 않고, 본문이 그 경우를 같은 말로 하는지 본다
    if (old.length === 0) {
      expect(body).toContain("Every Pak'nSave row in this round was read within a week of the Woolworths one.");
      expect(body).not.toContain("older than a week —");
      return;
    }
    expect(body).not.toContain("Every Pak'nSave row in this round was read within a week");
    for (const r of old) {
      expect(body, `${r.name} 누락`).toContain(r.name.toLowerCase().replace(/\s*\([^)]*\)/, ""));
      expect(body, `${r.name} 날짜 누락`).toContain(fmt(r.paknsaveAsOf as string));
    }
  });

  it("CSV가 상품 식별이 없는 줄을 빈칸으로 두지 않는다", async () => {
    const { GET } = await import("../app/price-index.csv/route");
    const text = await (GET() as Response).text();
    const rows = text.trim().split("\n");
    const head = rows[0].split(",");
    const iId = head.indexOf("product_identified");
    const iSku = head.indexOf("sku");
    const iPrice = head.indexOf("price_nzd");
    expect(iId, "product_identified 열이 없다").toBeGreaterThan(-1);

    let blank = 0;
    let pinned = 0;
    for (const line of rows.slice(1)) {
      const c = splitCsv(line);
      if (!c[iPrice]) continue;
      if (c[iSku]) { pinned++; expect(c[iId]).toBe("pinned SKU"); }
      else { blank++; expect(c[iId], "SKU 없는 줄이 이유를 안 밝힌다").toContain("not recorded"); }
    }
    // 🔴 두 갈래가 **둘 다** 실제로 있었는지 센다 — 한쪽이 0이면 그 분기는 안 밟혔다.
    expect(blank, "SKU 없는 줄이 없으면 이 가드가 알리바이다").toBeGreaterThan(0);
    expect(pinned, "SKU 있는 줄이 없다").toBeGreaterThan(0);
  });

  it("글이 말하는 고정 상품 개수가 데이터와 같다", () => {
    const src = (
      JSON.parse(readFileSync(new URL("../data/priceIndexSources.json", import.meta.url), "utf-8")) as {
        items: Record<string, { sku?: string; paknsave?: { sku?: string }; newworld?: { sku?: string } }>;
      }
    ).items;
    // 🔴 09-28 — 수집기는 `newworld ?? paknsave` SKU로 읽는다. `newworld.sku`만 세던 기대값이
    //    「only 2 of 18」이라는 거짓을 고정하고 있었다 — 수집기와 같은 규칙으로 센다.
    const nw = THREE.filter((r) => (src[r.name]?.newworld ?? src[r.name]?.paknsave)?.sku).length;
    const w = THREE.filter((r) => src[r.name]?.sku).length;
    const p = THREE.filter((r) => src[r.name]?.paknsave?.sku).length;
    expect(post.body).toContain(`${p} of the ${THREE.length} Pak'nSave rows`);
    expect(post.body).toContain(`${w} of the ${THREE.length} Woolworths rows`);
    expect(post.body).toContain(`${nw} of the ${THREE.length} New World rows`);
    // 🔴 셋이 다 같은 수면 이 문장은 아무것도 구별하지 않는다.
    expect(new Set([nw, w, p]).size).toBeGreaterThan(1);
  });
});

/**
 * 🔴 카테고리 관측을 상품 수준 주장으로 넓히지 않는다 (2026-09-10 외부 감사 4번).
 *
 * 「On special」은 그 재료의 상품이 **하나라도** 할인된 주를 센다. 정의는 글에
 * 적혀 있었는데 결론이 그 정의를 넘어 "같은 치즈가 두 달간 정가였던 적이 없다"로
 * 읽혔다. 실제로는 한 상품이 버틴 최대 주 수가 훨씬 짧다.
 */
describe("🔴 할인 분석의 범위", () => {
  const post = POSTS["what-is-always-on-special-nz-supermarkets"];

  it("상품 회전을 실제 수치로 밝힌다", async () => {
    const { churnFor, longestSingleProductRun, PROMO_WEEK_COUNT, everyWeekKeys } =
      await import("./promoHistory");
    const runs = everyWeekKeys().map((s) => churnFor(s.key));
    // 🔴 양성 대조 — 회전이 없으면(한 상품이 전 주에 걸렸으면) 이 글의 새 논지가 허구다.
    expect(runs.length, "매주 특가인 재료가 없으면 알리바이다").toBeGreaterThan(0);
    expect(longestSingleProductRun(), "한 상품이 전 주를 버텼다면 원래 문장이 맞았다")
      .toBeLessThan(PROMO_WEEK_COUNT);

    for (const c of runs) {
      expect(post.body, `${c.key} 상품 수`).toContain(`| ${c.products} | ${c.maxWeeks} |`);
    }
    // 🔴 09-28 — 예시 재료를 치즈로 고정하던 문장이 「가장 많이 회전한 매주 특가 재료」를
    //    생성하게 바뀌었다. 기대값도 같은 계산으로 — 치즈가 매주 목록에서 빠져도 안 깨진다.
    const { mostRotatedEveryWeek } = await import("./promoHistory");
    const top = mostRotatedEveryWeek()!;
    expect(top, "매주 특가 재료가 없으면 알리바이다").toBeTruthy();
    expect(post.body).toContain(`${top.name[0].toUpperCase()}${top.name.slice(1)} ran through ${top.products} different products`);
  });

  it("같은 상품이 계속 할인됐다고 읽히는 문장이 없다", () => {
    for (const phrase of [
      "has not been at full price in over two months",
      "it is a description of Tuesday",
    ]) {
      expect(post.body, `"${phrase}"가 남아 있다`).not.toContain(phrase);
    }
    // 브랜드를 바꿀 수 있다는 조건이 결론에 실제로 붙어 있어야 한다.
    expect(post.body).toContain("whichever brand and size is down this week");
  });
});

/**
 * 🔴 품목의 성격을 손으로 적지 않는다 (2026-09-10 외부 감사 4번 뒷부분).
 *
 * 두 문장이 손으로 적혀 있었고 둘 다 틀렸다:
 *   "the shelf-stable half of a lunchbox"  ← 목록에 오이·달걀·치즈블록·슬라이스치킨이 있다
 *   "both produce sold by weight"          ← Lettuce는 `each`(Iceberg 한 통)다
 * 판매 단위는 `priceIndex.json`의 `unit`에 처음부터 있었다.
 */
describe("🔴 가격 추세 글이 품목의 성격을 데이터에서 말한다", () => {
  const post = POSTS["what-moved-nz-supermarket-shelf-prices"];

  it("「무게로 판다」를 판매 단위와 대조한다", async () => {
    const { busiestRows, indexUnitFor, busiestClause } = await import("./priceMovement");
    const rows = busiestRows();
    expect(rows.length, "가장 자주 움직인 행이 없다").toBeGreaterThan(0);
    // 🔴 양성 대조 — 전부 per kg이면 옛 문장이 맞았던 것이고 이 가드는 아무것도 안 지킨다.
    expect(rows.some((r) => indexUnitFor(r.name) !== "per kg"),
      "전부 무게 판매면 옛 문장이 옳았다").toBe(true);
    expect(post.body, "글이 그 절을 안 쓴다").toContain(busiestClause());
    expect(post.body, "「both produce sold by weight」가 남아 있다")
      .not.toContain("are both produce sold by weight");
  });

  it("「shelf-stable」이라고 부르지 않는다 — 절반이 냉장이다", async () => {
    const { stableMix } = await import("./priceMovement");
    const mix = stableMix();
    // 🔴 양성 대조 — 냉장이 하나도 없으면 옛 문장이 맞았다.
    expect(mix.chilled.length, "냉장 품목이 없으면 옛 문장이 옳았다").toBeGreaterThan(0);
    expect(post.body, "「shelf-stable half」가 남아 있다").not.toContain("shelf-stable half");
    for (const n of mix.chilled) expect(post.body, `${n} 누락`).toContain(n);
    expect(post.body).toContain(`splits ${mix.ambient.length}–${mix.chilled.length}`);
  });

  it("지수의 모든 품목이 상온/냉장 중 하나로 분류돼 있다", async () => {
    const { isChilledOrFresh, indexUnitFor } = await import("./priceMovement");
    const items = (index as { items: Array<{ name: string }> }).items;
    for (const it of items) {
      // 분류 자체는 손으로 적었지만, **이름이 지수에 실재하는지**는 데이터가 정한다.
      expect(indexUnitFor(it.name), `${it.name}의 판매 단위가 없다`).not.toBe("");
    }
    const chilled = items.filter((i) => isChilledOrFresh(i.name));
    expect(chilled.length, "냉장 분류가 비었다").toBeGreaterThan(0);
    expect(chilled.length, "전부 냉장으로 분류됐다 — 분류가 무의미하다").toBeLessThan(items.length);
  });
});

/**
 * 🔴 가격대를 성능 시간에 묶지 않는다 (2026-09-10 외부 감사 6번).
 *
 * 같은 사이트가 한쪽에서는 "I have not measured that gap and I am not going to
 * quote a number for it"이라고 써 놓고, 다른 쪽에서는 이렇게 적고 있었다:
 *
 *      A mid-range bag ($25–40) with a frozen drink bottle:
 *      stays cool for several hours — generally fine for a standard school morning.
 *
 * 근거는 "general food-safety advice and published consumer reviews such as
 * Choice Australia"였다. 식품안전 지침은 4시간 한계를 말할 뿐 **어느 가방이
 * 몇 시간 버티는지** 말하지 않는다. 이건 자기모순이고, 그 자기모순이
 * 이 사이트가 전에 거절당한 이유이기도 하다([[adsense-self-contradiction-copy]]).
 */
describe("🔴 시험하지 않은 제품 성능 수치를 쓰지 않는다", () => {
  const SLUGS = ["lunchbox-food-safety-nz-term-1-heat", "insulated-lunch-bags-review-nz"];
  const PRICE = /\$\d+(?:[–-]\s*\$?\d+|\+)/;
  const PERFORMANCE =
    /\b(stays? cool|keeps? (?:food )?(?:cold|coolest)|for (?:several|\d+\+?) hours|all day|school morning|coldest for longest)\b/i;

  it("한 문장 안에 가격대와 지속시간 주장이 같이 있지 않다", () => {
    const offenders: string[] = [];
    let sentencesChecked = 0;
    for (const slug of SLUGS) {
      const post = POSTS[slug];
      expect(post, `${slug}가 없다`).toBeTruthy();
      for (const raw of post.body.split(/(?<=[.!?])\s+|\n/)) {
        const line = raw.trim();
        if (!line) continue;
        sentencesChecked++;
        if (PRICE.test(line) && PERFORMANCE.test(line)) offenders.push(`${slug}: ${line.slice(0, 110)}`);
      }
    }
    // 🔴 양성 대조 — 두 정규식이 각각 실제로 무언가를 맞히는지 확인한다.
    //    둘 중 하나가 아무것도 안 맞히면 "0건"은 알리바이다.
    const all = SLUGS.map((s) => POSTS[s].body).join("\n");
    expect(PRICE.test(all), "가격대 패턴이 한 번도 안 맞는다").toBe(true);
    expect(PERFORMANCE.test(all), "성능 표현 패턴이 한 번도 안 맞는다").toBe(true);
    expect(sentencesChecked, "검사한 문장이 없다").toBeGreaterThan(100);
    expect(offenders).toEqual([]);
  });

  it("측정하지 않았다는 말이 두 글에 다 있다", () => {
    expect(POSTS["insulated-lunch-bags-review-nz"].body)
      .toContain("I have not measured that gap");
    expect(POSTS["lunchbox-food-safety-nz-term-1-heat"].body)
      .toContain("never put a thermometer in a lunch bag");
  });
});

/** 🔴 라이브 화면에서 눈으로 잡은 두 가지 (2026-09-10). 가드가 아니라 재발 방지용이다. */
describe("🔴 레시피 창의 표기", () => {
  const src = readFileSync(new URL("../components/PlannerClient.tsx", import.meta.url), "utf-8");

  it("제목 이모지를 두 번 찍지 않는다", () => {
    // i18n 값이 이미 📝로 시작하는데 JSX가 하나 더 붙여 "📝 📝 Ingredients"로 나갔다.
    for (const l of ["en", "ko", "zh"]) {
      const m = JSON.parse(
        readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8"),
      ) as Record<string, string>;
      expect(m.ingredients.startsWith("📝"), `${l}: i18n에 이모지가 없다`).toBe(true);
    }
    expect(src, "JSX가 이모지를 또 붙인다").not.toContain('>📝 {t("ingredients")}<');
  });

  it("무게로 파는 재료를 「of per kg」라고 쓰지 않는다", async () => {
    const { PORTION_BASIS } = await import("./planConfig");
    const perKg = Object.entries(PORTION_BASIS).filter(([, b]) => b.pack === "per kg");
    // 🔴 양성 대조 — per kg 재료가 없으면 이 검사가 알리바이다.
    expect(perKg.length, "per kg 재료가 없다").toBeGreaterThan(0);
    expect(src, "per kg 분기가 없다").toContain('basis.pack === "per kg" ? "at"');
    expect(src, "단가 표시가 없다").toContain('basis.pack === "per kg" ? "/kg"');
  });
});

/**
 * 🔴 알레르겐 라벨 글 (2026-09-10 신설).
 *
 * 이 글의 값은 전부 상품 라벨에서 생성된다. 상품이 바뀌면 문장도 바뀌어야 한다 —
 * 같은 날 고정 SKU 하나가 **같은 값·같은 규격으로 다른 상품**이 돼 있었다.
 */
describe("🔴 알레르겐 라벨 글이 라벨과 어긋나지 않는다", () => {
  const post = POSTS["allergen-labels-nz-lunchbox-staples"];

  it("본문의 수치가 데이터에서 다시 나온다", async () => {
    const F = await import("./allergenFacts");
    expect(post, "글이 없다").toBeTruthy();
    expect(post.body).toContain(`I track ${F.trackedProducts()} products`);
    expect(post.body).toContain(`${F.labelledProducts()} of them carry an allergen label`);
    expect(post.body).toContain(`${F.hiddenRows().length} of those products declare`);
    expect(post.body).toContain(`${F.anyWarningCount()} of the ${F.labelledProducts()} labelled products`);
  });

  it("선언·주의 개수를 원본에서 독립적으로 다시 센다", async () => {
    // 🔴 처음엔 `warnedCount()`로 기대값을 만들었다. 그러면 그 함수를 0으로 바꿔도
    //    본문과 기대값이 **같이** 0이 돼 통과한다(2026-09-10 돌연변이로 확인).
    //    [[guard-expectations-from-same-source]] 그대로다. 여기서는 라벨 원본에서 센다.
    const { declares, warnsAbout } = await import("./allergenLabels");
    const PRICES = (await import("@/data/price_cache.json")).default as Record<string, unknown>;
    const keys = Object.keys(PRICES);
    const dec = (a: "nuts" | "milk" | "egg" | "gluten" | "sesame") => keys.filter((k) => declares(k, a)).length;
    const wrn = (a: "nuts" | "milk" | "egg" | "gluten" | "sesame") =>
      keys.filter((k) => !declares(k, a) && warnsAbout(k, a)).length;

    expect(post.body).toContain(`${dec("nuts")} products declare nuts`);
    expect(post.body).toContain(`${wrn("nuts")} more warn about them`);
    // 🔴 이 글의 논지 자체 — 견과는 주의가 선언보다 많다. 뒤집히면 글을 다시 써야 한다.
    expect(wrn("nuts"), "견과 주의가 선언보다 많지 않다 — 글의 논지가 무너진다")
      .toBeGreaterThan(dec("nuts"));
    for (const a of ["nuts", "milk", "egg", "gluten", "sesame"] as const) {
      const label = { nuts: "Nuts", milk: "Milk", egg: "Egg", gluten: "Gluten", sesame: "Sesame" }[a];
      expect(post.body, `${label} 줄이 데이터와 다르다`).toContain(`| ${label} | ${dec(a)} | ${wrn(a)} |`);
    }
  });

  it("표의 모든 줄이 실제 라벨과 일치한다", async () => {
    const F = await import("./allergenFacts");
    const { declares } = await import("./allergenLabels");
    const hidden = F.hiddenRows();
    // 🔴 양성 대조 — 숨은 줄이 없으면 이 글의 논지가 허구다.
    expect(hidden.length, "이름이 숨긴 상품이 없다").toBeGreaterThan(5);
    for (const r of hidden) {
      expect(post.body, `${r.key} 줄이 본문에 없다`).toContain(`| ${r.key} | ${r.product} |`);
      for (const a of r.declared) {
        expect(declares(r.key, a), `${r.key}가 ${a}를 선언하지 않는다`).toBe(true);
      }
    }
  });

  it("「이름이 숨겼다」가 실제로 이름에 없는 것만 고른다", async () => {
    const F = await import("./allergenFacts");
    // 🔴 09-10에 Veggie Straws를 이 부류로 잘못 넣었다 — 전체 상품명이
    //    `...veggie straws sour cream 65g`라 이름이 이미 말하고 있었다.
    //    잘린 이름만 보고 쓴 것이었다. 그 유형을 여기서 막는다.
    const NAME_HINT: Record<string, RegExp> = {
      milk: /milk|dairy|cheese|yoghurt|yogurt|butter|cream|paneer|feta|mozzarella|parmesan/,
      nuts: /nut|almond|peanut|cashew|hazelnut|macadamia|walnut|pecan|pistachio/,
      sesame: /sesame|hummus|tahini/,
    };
    for (const r of F.hiddenRows()) {
      const hay = (r.product + " " + r.key).toLowerCase();
      for (const a of r.declared) {
        const re = NAME_HINT[a];
        if (!re) continue;
        expect(re.test(hay), `${r.key}: 상품명 "${r.product}"이 이미 ${a}를 말한다 — 숨겼다고 못 한다`).toBe(false);
      }
    }
    expect(F.hiddenRows().some((r) => r.key === "Veggie Straws"),
      "Veggie Straws는 이름이 sour cream이라 이 부류가 아니다").toBe(false);
  });

  it("CSV가 본문의 근거를 줄마다 들고 있다", async () => {
    const { GET } = await import("../app/allergen-labels.csv/route");
    const F = await import("./allergenFacts");
    const text = await (GET() as Response).text();
    const rows = text.trim().split("\n");
    const head = rows[0].split(",");
    for (const col of ["ingredient", "product_name", "sku", "observed_on", "declared_raw", "precautionary_raw"]) {
      expect(head, `${col} 열이 없다`).toContain(col);
    }
    expect(rows.length - 1, "CSV 행 수가 라벨 보유 상품 수와 다르다").toBe(F.labelledProducts());
    // 🔴 두 갈래가 둘 다 실제로 있는지 센다 — 한쪽이 0이면 그 분기는 안 밟혔다
    const iD = head.indexOf("declares_milk"), iW = head.indexOf("warns_nuts");
    const body = rows.slice(1).map((l) => splitCsv(l));
    expect(body.filter((c) => c[iD] === "yes").length, "우유 선언이 한 줄도 없다").toBeGreaterThan(0);
    expect(body.filter((c) => c[iW] === "yes").length, "견과 주의가 한 줄도 없다").toBeGreaterThan(0);
    expect(post.body, "글이 CSV를 링크하지 않는다").toContain("/allergen-labels.csv");
  });

  it("안전을 보장하는 말을 쓰지 않는다", () => {
    for (const phrase of ["safe for", "guaranteed", "we have checked so you", "allergy-safe"]) {
      expect(post.body.toLowerCase(), `"${phrase}"가 들어 있다`).not.toContain(phrase.toLowerCase());
    }
    // 한계를 실제로 밝히는지
    expect(post.body).toContain("We track one product per ingredient");
    expect(post.body).toContain("Manufacturers change formulations");
  });
});

/**
 * 🔴 크롤조차 되지 않던 다섯 편에 붙인 자체 데이터 (2026-09-10).
 *
 * GSC 「발견됨 - 현재 색인이 생성되지 않음」에 살아 있는 글 다섯이 들어 있었다.
 * 다섯 다 어디에나 있는 일반 조언이라, 우리만 잴 수 있는 것을 한 절씩 넣었다.
 */
describe("🔴 다섯 편의 자체 데이터 절", () => {
  const SLUGS = {
    dairy: "dairy-free-school-lunches-nz",
    egg: "egg-free-lunchbox-ideas-nz",
    gluten: "gluten-free-school-lunches-nz",
    nocook: "no-cook-lunchbox-ideas-nz",
    thermos: "thermos-hot-lunches-nz-winter",
  };

  it("간식 수치가 실제 간식 풀과 같다 — 원본에서 독립적으로 다시 센다", async () => {
    const { dietTagsFor } = await import("./ingredientDiet");
    const raw = JSON.parse(
      readFileSync(new URL("../data/menuData.json", import.meta.url), "utf8"),
    ) as { SNACK_DATA: Record<string, Array<{ name: string; ingredients: string[] }>> };
    const pool = [...raw.SNACK_DATA["Fruit & Veg"], ...raw.SNACK_DATA["Protein & Dairy"], ...raw.SNACK_DATA["Savoury Crunch"]];
    const survive = (tag: "milk" | "egg" | "gluten") =>
      pool.filter((s) => !s.ingredients.some((i) => dietTagsFor(i)?.has(tag)));

    const cases: Array<[keyof typeof SLUGS, "milk" | "egg" | "gluten"]> = [
      ["dairy", "milk"], ["egg", "egg"], ["gluten", "gluten"],
    ];
    for (const [slug, tag] of cases) {
      const kept = survive(tag).length;
      expect(POSTS[SLUGS[slug]].body, `${slug}: 간식 ${kept}/${pool.length}이 본문에 없다`)
        .toContain(`${kept} of ${pool.length} snacks survive`);
      // 빠지는 간식 이름이 실제로 빠지는 것이어야 한다
      const dropped = pool.filter((s) => !survive(tag).includes(s));
      for (const d of dropped) {
        expect(POSTS[SLUGS[slug]].body, `${slug}: ${d.name}이 본문에 없다`).toContain(d.name);
      }
      // 🔴 양성 대조 — 빠지는 것이 없으면 그 절은 아무것도 말하지 않는다
      if (slug !== "egg") expect(dropped.length, `${slug}: 빠지는 간식이 없다`).toBeGreaterThan(0);
    }
  });

  it("원가 문장이 빠듯한 주장을 하지 않는다", async () => {
    const D = await import("./dietEconomics");
    // 🔴 유제품 프리는 −6.7%다. 「더 싸다」로 쓰면 한 상품 값이 움직이는 순간 거짓이 된다.
    //    8% 미만이면 문장이 스스로 「비슷하다」고 말해야 한다.
    for (const k of ["dairy-free", "gluten-free", "no-cook", "thermos", "egg-free"] as const) {
      const g = D.dietGroup(k);
      const clause = D.costClause(k);
      if (Math.abs(g.pct) < 8) {
        expect(clause, `${k}: ${g.pct.toFixed(1)}%인데 크기를 주장한다`).toContain("about the same");
      } else {
        expect(clause, `${k}: ${g.pct.toFixed(1)}%인데 비슷하다고 한다`).not.toContain("about the same");
      }
    }
    // 🔴 양성 대조 — 두 갈래가 **둘 다** 동작해야 이 검사가 의미가 있다.
    //    10-11 수집에서 여섯 식단이 전부 ≥8%가 되자 「비슷하다가 데이터에 있어야 한다」가 빨개졌다.
    //    데이터 모양을 강요하지 않고 분기 자체를 가상 값으로 본다.
    expect(D.clauseForPct(-6.7)).toContain("about the same");
    expect(D.clauseForPct(7.9)).toContain("about the same");
    expect(D.clauseForPct(-12.5)).toBe("costs about 13% less than the rest of the menu set");
    expect(D.clauseForPct(9)).toBe("costs about 9% more than the rest of the menu set");
  });

  it("본문에 적힌 중앙값이 데이터와 같다", async () => {
    const D = await import("./dietEconomics");
    for (const [slug, key] of [["nocook", "no-cook"], ["thermos", "thermos"]] as const) {
      const m = D.dietMoney(key);
      expect(POSTS[SLUGS[slug]].body, `${slug}: 중앙값이 다르다`)
        .toContain(`median ${m.inMedian} against ${m.outMedian}`);
    }
  });

  it("다섯 편이 알레르겐 라벨 글로 이어진다", () => {
    for (const slug of [SLUGS.dairy, SLUGS.egg, SLUGS.gluten]) {
      expect(POSTS[slug].body, `${slug}: 라벨 글 링크가 없다`)
        .toContain("/en/blog/allergen-labels-nz-lunchbox-staples");
    }
  });
});

/**
 * 🔴 「무엇이 움직였나」를 세 열로 넓힌 절 (2026-09-10).
 *
 * 이 절의 위험은 하나다 — **관측 간격이 다른 열을 나란히 놓고 빈도를 비교하는 것.**
 * [[observation-method-changed-not-the-world]]가 정확히 그 실패다.
 */
describe("🔴 세 열 비교가 창을 맞추고 빈도를 말하지 않는다", () => {
  const post = POSTS["what-moved-nz-supermarket-shelf-prices"];

  it("겹치는 창에서만 비교한다", async () => {
    const M = await import("./priceMovement");
    const hist = JSON.parse(
      readFileSync(new URL("../data/priceHistory.json", import.meta.url), "utf8"),
    ) as { columns: Record<string, Array<{ date?: string; on?: string }>> };
    const first = (c: string) =>
      [...new Set((hist.columns[c] ?? []).map((r) => String(r.date ?? r.on)))].sort()[0];
    // 🔴 기대값을 원본에서 독립적으로 만든다
    const expected = [first("woolworths"), first("paknsave")].sort().reverse()[0];
    expect(M.overlapStart()).toBe(expected);
    // Pak'nSave 가 더 일찍 시작한다 — 창을 안 맞추면 「거의 다 움직였다」가 된다
    expect(first("paknsave") < first("woolworths"),
      "두 열 시작이 같으면 이 검사가 알리바이다").toBe(true);
  });

  it("빈도를 비교하지 않겠다고 말하고, 실제로 안 한다", () => {
    expect(post.body, "간격이 다르다는 설명이 없다").toContain("measure our reading schedule, not the shops");
    // 빈도 비교로 읽힐 문장이 없어야 한다
    for (const bad of ["changes prices more often", "reprices more often than", "more volatile than"]) {
      expect(post.body.toLowerCase(), `"${bad}"`).not.toContain(bad.toLowerCase());
    }
  });

  it("표와 문장이 데이터에서 다시 나온다", async () => {
    const M = await import("./priceMovement");
    const both = M.movedAtBoth(), neither = M.movedAtNeither(), all = M.twoChainItems();
    // 🔴 양성 대조 — 세 갈래가 전부 실제로 있어야 이 절이 의미가 있다
    expect(both.length, "둘 다 움직인 것이 없다").toBeGreaterThan(0);
    expect(neither.length, "둘 다 안 움직인 것이 없다").toBeGreaterThan(0);
    expect(all.length, "비교 품목이 없다").toBeGreaterThan(both.length + neither.length - 1);

    // 🔴 기대값을 `priceMovement`가 아니라 **원본 시계열에서 직접** 만든다.
    //    같은 함수로 만들면 창 맞추기를 없애도 본문과 기대값이 **같이** 움직여
    //    통과한다(2026-09-10 돌연변이로 확인). [[guard-expectations-from-same-source]]
    const hist2 = JSON.parse(
      readFileSync(new URL("../data/priceHistory.json", import.meta.url), "utf8"),
    ) as { columns: Record<string, Array<{ date?: string; on?: string; items: Record<string, number> }>> };
    const firstOf = (c: string) =>
      [...new Set((hist2.columns[c] ?? []).map((r) => String(r.date ?? r.on)))].sort()[0];
    const from = [firstOf("woolworths"), firstOf("paknsave")].sort().reverse()[0];
    const seriesOf = (c: string) => {
      const m = new Map<string, number[]>();
      for (const r of [...(hist2.columns[c] ?? [])].sort((x, y) =>
        String(x.date ?? x.on).localeCompare(String(y.date ?? y.on)))) {
        if (String(r.date ?? r.on) < from) continue;
        for (const [k, v] of Object.entries(r.items)) {
          if (!m.has(k)) m.set(k, []);
          m.get(k)!.push(v);
        }
      }
      for (const [k, v] of m) if (v.length < 4) m.delete(k);
      return m;
    };
    const W = seriesOf("woolworths"), Pk = seriesOf("paknsave");
    const moved = (v: number[]) => v.some((x, i) => i > 0 && Math.abs(x - v[i - 1]) > 0.005);
    const shared = [...W.keys()].filter((k) => Pk.has(k));
    const expBoth = shared.filter((k) => moved(W.get(k)!) && moved(Pk.get(k)!)).length;
    const expNeither = shared.filter((k) => !moved(W.get(k)!) && !moved(Pk.get(k)!)).length;

    expect(post.body).toContain(`${shared.length} items tracked at both`);
    expect(post.body).toContain(`${expBoth} moved at both chains and ${expNeither} moved at neither`);
    expect(both.length, "모듈과 원본 계산이 다르다").toBe(expBoth);
    for (const r of both) {
      expect(post.body, `${r.name} 줄이 없다`).toContain(`| ${r.name} |`);
    }
    expect(post.body).toContain(M.producePhrase());
    expect(post.body).toContain(M.sameDayPhrase());
  });

  it("농산물 판정을 냉장 여부로 하지 않는다", async () => {
    const M = await import("./priceMovement");
    // 🔴 「신선/냉장」으로 가르면 안 된다 — 안 움직인 쪽에도 냉장이 여럿이다.
    //    그걸로 갈랐다면 이 검사가 터진다.
    const stillChilled = M.movedAtNeither().filter((r) => M.isChilledOrFresh(r.name));
    expect(stillChilled.length, "냉장인데 안 움직인 것이 없다 — 냉장으로 갈라도 되는 상황이다")
      .toBeGreaterThan(0);
    for (const r of M.producedMovedRows()) {
      expect(["per kg", "each", "per punnet"], `${r.name}의 판매 단위가 농산물이 아니다`)
        .toContain(M.indexUnitFor(r.name));
    }
  });
});

/**
 * 🔴 통로별 승자와 승자 변화 (2026-09-11 신설)
 *
 * 🔴 기대값을 `aisleTotals()`·`winnerFlips()`에서 뽑지 않는다. `priceIndex.json`에서
 *    **직접 다시 센다.** 어제 하루에 네 번 같은 자리에서 미끄러졌다 —
 *    본문과 기대값이 같은 함수에서 나오면 그 함수를 망가뜨려도 둘이 같이 움직여
 *    통과한다. [[guard-expectations-from-same-source]]
 *
 * 🔴 라이브 오류가 정확히 이 종류였다: 표는 Cucumber·Lettuce·**Rice**를 생성해
 *    찍고 있었는데 그 표를 요약하는 문장이 "Three of those are salad vegetables"로
 *    손글씨였다. 둘만 채소다. 표는 데이터에서 나오고 요약은 안 나오면 이렇게 된다.
 */
describe("🔴 통로별 승자와 승자 변화가 원본에서 다시 나온다", () => {
  const three = POSTS["three-supermarkets-nz-lunchbox-basket-compared"];
  const two = POSTS["supermarket-price-gap-nz-lunchbox"];
  const RAW = JSON.parse(
    readFileSync(new URL("../data/priceIndex.json", import.meta.url), "utf8"),
  ) as {
    woolworthsUpdated: string;
    items: Array<PriceRow & { category?: string }>;
    history: Array<{ date: string; items: Array<{ name: string; countdown: number | null; paknsave: number | null }> }>;
  };
  const cash = (n: number) => `$${n.toFixed(2)}`;
  /** 행 선택 규칙만 모듈에서 가져온다 — 규칙은 한 군데에만 있어야 한다. */
  const rows3 = RAW.items.filter((r) => isThreeWayComparableRow(r, RAW.woolworthsUpdated));
  const rows2 = RAW.items.filter((r) => isComparableRow(r, RAW.woolworthsUpdated));

  it("통로별 합계를 원본에서 다시 세고 표와 대조한다", () => {
    const aisles = [...new Set(rows3.map((r) => r.category ?? "Uncategorised"))];
    expect(aisles.length, "통로가 하나뿐이면 이 검사가 알리바이다").toBeGreaterThan(1);
    let sumW = 0, sumP = 0, sumNW = 0;
    for (const a of aisles) {
      const g = rows3.filter((r) => (r.category ?? "Uncategorised") === a);
      const w = g.reduce((s, r) => s + (r.countdown as number), 0);
      const p = g.reduce((s, r) => s + (r.paknsave as number), 0);
      const nw = g.reduce((s, r) => s + (r.newworld as number), 0);
      sumW += w; sumP += p; sumNW += nw;
      expect(three.body, `${a} 통로 줄이 원본과 다르다`)
        .toContain(`| ${a} | ${g.length} | ${cash(w)} | ${cash(p)} | ${cash(nw)} |`);
    }
    // 🔴 통로 합계의 총합이 바구니 총액과 같아야 한다 — 안 맞으면 $28.50 사고의 변형이다
    expect(three.body).toContain(`| Woolworths | ${cash(sumW)} |`);
    expect(three.body).toContain(`| Pak'nSave | **${cash(sumP)}** |`);
    expect(three.body).toContain(`| New World | ${cash(sumNW)} |`);
  });

  it("「사실상 같은 통로」를 원본에서 골라내고 본문이 그 통로를 이름으로 말한다", () => {
    const aisles = [...new Set(rows3.map((r) => r.category ?? "Uncategorised"))].map((a) => {
      const g = rows3.filter((r) => (r.category ?? "Uncategorised") === a);
      const w = g.reduce((s, r) => s + (r.countdown as number), 0);
      const p = g.reduce((s, r) => s + (r.paknsave as number), 0);
      return { a, w, p, pct: ((w - p) / w) * 100 };
    });
    const level = aisles.filter((x) => Math.abs(x.pct) < 2);
    const steep = aisles.filter((x) => Math.abs(x.pct) >= 2);
    expect(steep.length, "기울어진 통로가 없다").toBeGreaterThan(0);

    /**
     * 🔴 2026-09-21: 이 가드가 `level.length > 0` 을 양성 대조로 걸고 있었는데,
     *    그 주 라운드에 평평한 통로가 **하나도 없자 실패했다.** 본문은 그 경우를
     *    스스로 처리한다(`levelAisleClause` 의 `level.length === 0` 가지가
     *    "Every aisle leans the same way this round" 를 쓴다).
     *
     *    즉 깨진 건 본문이 아니라 **가드가 데이터 모양을 강요한 것**이다.
     *    가드가 통제할 수 없는 조건을 단언하면, 세상이 바뀔 때마다 빨간불이 되고
     *    그러면 사람이 가드를 끄게 된다. 여기서는 **본문이 데이터와 같은 말을 하는지**만 본다.
     */
    if (level.length === 0) {
      expect(three.body, "평평한 통로가 없는데 본문이 그렇게 말하지 않는다")
        .toContain("Every aisle leans the same way this round");
      expect(three.body, "평평한 통로가 없는데 있다고 말한다")
        .not.toContain("The aisle Woolworths takes is also the one that is level.");
      return;
    }
    expect(three.body, "평평한 통로가 있는데 본문이 '전부 같은 쪽'이라고 말한다")
      .not.toContain("Every aisle leans the same way this round");
    // 🔴 임계값 2%가 임의로 갈라놓은 게 아닌지 — 두 무리 사이가 벌어져 있어야 한다
    const worstLevel = Math.max(...level.map((x) => Math.abs(x.pct)));
    const bestSteep = Math.min(...steep.map((x) => Math.abs(x.pct)));
    expect(bestSteep - worstLevel, "평평한 통로와 기울어진 통로가 임계값에 붙어 있다")
      .toBeGreaterThan(2);
    for (const x of level) {
      expect(three.body, `${x.a} 통로를 본문이 안 말한다`).toContain(x.a);
      expect(three.body).toContain(`${cash(x.w)} at Woolworths against ${cash(x.p)} at Pak'nSave`);
    }
  });

  it("각 체인이 최저 소계를 가진 통로 수가 원본과 같다", () => {
    const tally = { W: 0, P: 0, NW: 0 };
    for (const a of new Set(rows3.map((r) => r.category ?? "Uncategorised"))) {
      const g = rows3.filter((r) => (r.category ?? "Uncategorised") === a);
      const w = g.reduce((s, r) => s + (r.countdown as number), 0);
      const p = g.reduce((s, r) => s + (r.paknsave as number), 0);
      const nw = g.reduce((s, r) => s + (r.newworld as number), 0);
      const low = Math.min(w, p, nw);
      if (low === p) tally.P++; else if (low === nw) tally.NW++; else tally.W++;
    }
    const word = ["none", "one", "two", "three", "four", "five", "six", "seven", "eight"];
    expect(three.body).toContain(
      `Pak'nSave has the cheapest sub-total in ${word[tally.P]} of the ` +
      `${word[new Set(rows3.map((r) => r.category ?? "Uncategorised")).size]} aisles, ` +
      `Woolworths in ${word[tally.W]}, and New World in ${word[tally.NW]}`,
    );
  });

  it("🔴 Woolworths가 이긴 행의 성격을 요약한 문장이 표와 어긋나지 않는다", () => {
    const wins = rows3.filter((r) => (r.countdown as number) < (r.paknsave as number));
    const produce = wins.filter((r) => r.category === "Produce");
    // 🔴 양성 대조 — 채소가 아닌 승리 행이 하나라도 있어야 이 검사가 의미가 있다.
    //    없으면 "전부 채소다"라고 적어도 통과하고, 그게 라이브에 나간 오류였다.
    expect(wins.length - produce.length,
      "승리 행이 전부 농산물이면 이 검사가 알리바이다").toBeGreaterThan(0);
    const word = ["none", "one", "two", "three", "four", "five", "six"];
    expect(three.body, "요약 문장의 개수가 표와 다르다")
      .toContain(`${word[produce.length][0].toUpperCase()}${word[produce.length].slice(1)} of the ${word[wins.length]}`);
    // 🔴 이 문장이 손으로 적혀 있던 형태가 되살아나지 않게
    expect(three.body).not.toContain("Three of those are salad vegetables");
    for (const r of wins) {
      expect(three.body, `${r.name} 줄이 표에 없다`).toContain(`| ${r.name} |`);
    }
  });

  it("승자가 바뀐 행을 5월 라운드에서 직접 다시 센다", () => {
    const may = new Map(RAW.history[0].items.map((i) => [i.name, i]));
    const pairs = rows2
      .map((r) => ({ r, t: may.get(r.name) }))
      .filter((x) => x.t && x.t.countdown !== null && x.t.paknsave !== null)
      // 09-29: 5월 뒤 규격이 바뀐 행(사과 Royal Gala → Granny Smith)은 다른 상품이다 — 원본의 respec 표시로 뺀다
      .filter((x) => ((x.r as { respec?: { on: string } }).respec?.on ?? "") <= RAW.history[0].date);
    const cheaper = (w: number, p: number) =>
      Math.round(w * 100) === Math.round(p * 100) ? "tie" : w < p ? "W" : "P";
    const flips = pairs.filter(
      (x) =>
        cheaper(x.t!.countdown as number, x.t!.paknsave as number) !==
        cheaper(x.r.countdown as number, x.r.paknsave as number),
    );
    const held = pairs.length - flips.length;
    // 🔴 양성 대조 — 바뀐 것과 안 바뀐 것이 다 있어야 「세 개가 바뀌었다」가 주장이다
    expect(flips.length, "승자가 바뀐 행이 없다").toBeGreaterThan(0);
    expect(held, "모든 행의 승자가 바뀌었다 — 그러면 절의 논지가 다르다").toBeGreaterThan(0);

    const word = ["none", "one", "two", "three", "four", "five", "six", "seven"];
    expect(two.body).toContain(`## The winner changed on ${word[flips.length]} item`);
    expect(two.body).toContain(`Of the ${pairs.length} items priced at both chains in both rounds`);
    for (const x of flips) {
      expect(two.body, `${x.r.name} 줄이 없다`).toContain(
        `| ${x.r.name} | ${cash(x.t!.countdown as number)} / ${cash(x.t!.paknsave as number)} ` +
        `| ${cash(x.r.countdown as number)} / ${cash(x.r.paknsave as number)} |`,
      );
    }
  });

  it("🔴 「진 쪽이 올랐다」가 실제로 원본에서 그렇다", () => {
    const may = new Map(RAW.history[0].items.map((i) => [i.name, i]));
    const cheaper = (w: number, p: number) =>
      Math.round(w * 100) === Math.round(p * 100) ? "tie" : w < p ? "W" : "P";
    const flips = rows2
      .map((r) => ({ r, t: may.get(r.name) }))
      .filter((x) => x.t && x.t.countdown !== null && x.t.paknsave !== null)
      .filter((x) =>
        cheaper(x.t!.countdown as number, x.t!.paknsave as number) !==
        cheaper(x.r.countdown as number, x.r.paknsave as number));
    const loserRose = flips.filter((x) => {
      const nowW = cheaper(x.r.countdown as number, x.r.paknsave as number) === "W";
      return nowW
        ? (x.r.paknsave as number) > (x.t!.paknsave as number)
        : (x.r.countdown as number) > (x.t!.countdown as number);
    });
    if (loserRose.length === flips.length) {
      expect(two.body, "본문이 「진 쪽이 올랐다」를 말하지 않는다")
        .toContain("the chain that lost the row **went up**");
    } else {
      expect(two.body, "일부만 그런데 본문이 전부라고 말한다")
        .not.toContain("the chain that lost the row **went up**");
    }
    // 🔴 손으로 적힌 「four months apart」가 되살아나지 않게 — 라운드 간격은 계산한다
    const months = Math.round(
      (Date.parse(RAW.woolworthsUpdated) - Date.parse(RAW.history[0].date)) / (86_400_000 * 30.44),
    );
    const word = ["none", "one", "two", "three", "four", "five", "six", "seven", "eight"];
    expect(two.body).toContain(`Two rounds ${word[months]} months apart`);
  });
});

/**
 * 🔴 GF/DF 스왑 글의 라벨 절 (2026-09-11 신설)
 *
 * 🔴 기대값을 `swapLabelRows()`에서 뽑지 않는다. `price_cache.json`의 라벨 원문에서
 *    `labelFor`/`declares`/`warnsAbout`만 써서 **다시 센다**. 같은 함수로 만들면
 *    「추가된 알레르겐 없음」으로 망가뜨려도 본문과 기대값이 같이 0이 되어 통과한다 —
 *    어제 `warnedCount()`에서 정확히 그렇게 미끄러졌다.
 *    [[guard-expectations-from-same-source]]
 */
describe("🔴 대체품 라벨 절이 라벨과 어긋나지 않는다", () => {
  const post = POSTS["gluten-free-dairy-free-swap-cost-nz"];
  const REMOVES: Record<string, keyof typeof ALLERGEN_PATTERNS> = {
    "gluten-free": "gluten", "dairy-free": "milk", "egg-free": "egg",
  };
  const FIVE = ["nuts", "milk", "egg", "gluten", "sesame"] as const;

  it("표의 모든 줄이 라벨 원문에서 다시 나온다", async () => {
    const { SWAP_PAIRS } = await import("./substituteCosts");
    const nice = (xs: readonly string[]) =>
      xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
    for (const p of SWAP_PAIRS) {
      const has = labelFor(p.free) !== null;
      const decl = FIVE.filter((a) => declares(p.free, a));
      const warn = FIVE.filter((a) => !declares(p.free, a) && warnsAbout(p.free, a));
      const std = FIVE.filter((a) => p.standard.some((s) => declares(s, a)));
      const cells = [
        p.free,
        REMOVES[p.kind],
        has ? (decl.length ? nice(decl) : "nothing tracked") : "no statement",
        has && warn.length ? nice(warn) : "—",
        std.length ? nice(std) : "—",
      ];
      expect(post.body, `${p.free} 줄이 라벨과 다르다`).toContain(`| ${cells.join(" | ")} |`);
    }
  });

  it("🔴 「새로 선언된 알레르겐」을 원본에서 독립적으로 다시 센다", async () => {
    const { SWAP_PAIRS } = await import("./substituteCosts");
    const added = SWAP_PAIRS.filter((p) => labelFor(p.free) !== null)
      .map((p) => ({
        p,
        add: FIVE.filter(
          (a) => declares(p.free, a) && !p.standard.some((s) => declares(s, a)),
        ),
      }))
      .filter((x) => x.add.length > 0);
    // 🔴 양성 대조 — 추가된 게 하나도 없으면 이 절의 논지가 없고, 검사도 알리바이다
    expect(added.length, "새로 선언된 알레르겐이 없다 — 절을 내려야 한다").toBeGreaterThan(0);
    // 🔴 반대 방향 양성 대조 — 전부 추가면 「예상 밖」이 아니라 규칙이다
    const labelled = SWAP_PAIRS.filter((p) => labelFor(p.free) !== null).length;
    expect(added.length, "라벨 있는 짝 전부가 추가한다 — 문장이 달라져야 한다").toBeLessThan(labelled);

    const word = ["None", "One", "Two", "Three", "Four", "Five", "Six", "Seven"];
    expect(post.body, "새로 선언된 짝 수가 원본과 다르다")
      .toContain(`${word[added.length]} of the ${labelled} ${added.length === 1 ? "declares" : "declare"} an allergen`);
    for (const x of added) {
      expect(post.body, `${x.p.free} 항목이 없다`).toContain(`- **${x.p.free}**`);
      for (const a of x.add) {
        expect(post.body, `${x.p.free}의 ${a}가 본문에 없다`)
          .toContain(`declares **${a}**`);
      }
    }
  });

  it("🔴 라벨이 없는 짝을 「깨끗하다」고 읽지 않는다", async () => {
    const { SWAP_PAIRS } = await import("./substituteCosts");
    const unlabelled = SWAP_PAIRS.filter((p) => labelFor(p.free) === null);
    const labelled = SWAP_PAIRS.length - unlabelled.length;
    expect(post.body).toContain(`Of the ${SWAP_PAIRS.length} pairs, ${labelled} carry an allergen statement`);
    if (unlabelled.length > 0) {
      // 라벨 없는 것이 「no statement」로 찍히고, 빈칸을 안심으로 읽지 않는다고 말한다
      for (const p of unlabelled) {
        expect(post.body, `${p.free}가 "no statement"로 안 찍혔다`)
          .toContain(`| ${p.free} | ${REMOVES[p.kind]} | no statement |`);
      }
      expect(post.body).toContain("not because it is clean");
    }
  });

  it("🔴 「빼기로 한 것은 실제로 뺐다」를 원본에서 확인한다", async () => {
    const { SWAP_PAIRS } = await import("./substituteCosts");
    const labelled = SWAP_PAIRS.filter((p) => labelFor(p.free) !== null);
    const holds = labelled.filter((p) => {
      const a = REMOVES[p.kind];
      return p.standard.some((s) => declares(s, a)) && !declares(p.free, a);
    });
    if (holds.length === labelled.length) {
      expect(post.body).toContain(`On all ${holds.length} products with a statement, the swap does what the front of the pack says`);
    } else {
      expect(post.body).toContain(`On ${holds.length} of the ${labelled.length} products with a statement`);
    }
  });

  it("추적하지 않는 알레르겐이 있다는 사실을 밝힌다", () => {
    // 🔴 다섯 개만 분류한다. 그걸 안 밝히면 "nothing tracked"가 「아무것도 없다」로 읽힌다
    expect(post.body).toContain("Soy, lupin and sulphites appear on several of these labels and I am not counting them");
    expect(post.body).toContain("/allergen-labels.csv");
    // 🔴 안전 보증으로 읽힐 말을 쓰지 않는다
    for (const bad of ["safe for", "guaranteed", "guarantee", "allergen-free"]) {
      expect(post.body.toLowerCase(), `"${bad}"`).not.toContain(bad);
    }
  });
});

/**
 * 🔴 「반복해서 내는 값」 절 (2026-09-11 신설)
 *
 * 🔴 기대값을 `exposureRows()`에서 뽑지 않는다. `menuData.json`에서 등장 횟수를
 *    직접 세고 1인분 값은 `servePrice`로 따로 구해 **곱을 여기서 다시 만든다.**
 *    같은 함수를 쓰면 등장 횟수를 1로 고정해도 본문과 기대값이 같이 움직인다.
 *    [[guard-expectations-from-same-source]]
 */
describe("🔴 「반복해서 내는 값」이 메뉴 데이터에서 다시 나온다", () => {
  const post = POSTS["pack-price-vs-cost-per-serve-nz-lunchbox"];
  const menus = (menuData as unknown as { MENU_DATA: { en: Array<{ ingredients: string[] }> } })
    .MENU_DATA.en;

  /** 메뉴별로 중복을 뺀 등장 횟수 — 모듈을 쓰지 않고 여기서 센다. */
  const counts = (() => {
    const m = new Map<string, number>();
    for (const menu of menus) for (const i of new Set(menu.ingredients)) m.set(i, (m.get(i) ?? 0) + 1);
    return m;
  })();

  /** 값을 붙일 수 있는 키. 팩값이 안 나오는 키는 본문에서도 빠진다(`portionRows`와 같은 조건). */
  const priced = (() => {
    const out = new Map<string, { serve: number; pack: number }>();
    for (const key of Object.keys(PORTION_BASIS)) {
      let pack: number;
      try { pack = packPrice(key); } catch { continue; }
      out.set(key, { serve: servePrice(key), pack });
    }
    return out;
  })();

  const scored = [...counts.entries()]
    .filter(([k]) => priced.has(k))
    .map(([k, n]) => ({ k, n, serve: priced.get(k)!.serve, exposure: n * priced.get(k)!.serve }))
    .sort((a, b) => b.exposure - a.exposure);

  it("메뉴 수와 재료 수가 원본과 같다", () => {
    expect(post.body).toContain(`Of the ${menus.length} lunch menus in the planner, ${scored.length} distinct ingredients`);
    const unpriced = new Set(menus.flatMap((m) => m.ingredients).filter((k) => !priced.has(k))).size;
    if (unpriced > 0) {
      expect(post.body, "값을 못 붙인 재료 수를 밝히지 않는다")
        .toContain(`Another ${unpriced} appear that I cannot`);
    }
  });

  it("🔴 표의 줄이 메뉴 등장 횟수 × 1인분 값과 같다", () => {
    // 🔴 양성 대조 — 등장 횟수가 전부 1이면 「반복」을 재는 의미가 없고 검사도 알리바이다
    expect(scored.filter((x) => x.n > 1).length, "여러 메뉴에 쓰이는 재료가 없다")
      .toBeGreaterThan(5);
    for (const x of scored.slice(0, 10)) {
      expect(post.body, `${x.k} 줄이 원본과 다르다`).toContain(
        `| ${x.k} | ${x.n} | $${x.serve.toFixed(2)} | **$${x.exposure.toFixed(2)}** |`,
      );
    }
  });

  it("🔴 「비싸다」의 세 답이 실제로 서로 다른 재료다", () => {
    const dearestPack = [...scored].sort(
      (a, b) => priced.get(b.k)!.pack - priced.get(a.k)!.pack,
    )[0];
    const dearestServe = [...scored].sort((a, b) => b.serve - a.serve)[0];
    const biggest = scored[0];
    const keys = new Set([dearestPack.k, dearestServe.k, biggest.k]);
    // 🔴 양성 대조 — 셋이 같은 재료면 이 절의 논지가 없다. 그때는 문장이 바뀌어야 한다
    if (keys.size === 3) {
      expect(post.body).toContain("Three questions, three answers, three different ingredients");
      expect(post.body).toContain(`| Dearest single lunchbox serve | ${dearestServe.k} | $${dearestServe.serve.toFixed(2)} |`);
      expect(post.body).toContain(`| Most across the whole menu set | ${biggest.k} | $${biggest.exposure.toFixed(2)} |`);
    } else {
      expect(post.body).not.toContain("Three questions, three answers, three different ingredients");
    }
  });

  it("🔴 가장 많이 쓰는 재료의 순위를 원본에서 다시 센다", () => {
    const mostUsed = [...scored].sort((a, b) => b.n - a.n)[0];
    const rank = scored.findIndex((x) => x.k === mostUsed.k) + 1;
    // 🔴 양성 대조 — 1등이면 「가장 많이 쓰는 것이 가장 비싸지 않다」가 거짓이 된다
    expect(rank, "최다 등장 재료가 반복비용 1등이다 — 절의 논지가 반대다").toBeGreaterThan(1);
    const suffix = rank === 2 ? "nd" : rank === 3 ? "rd" : "th";
    expect(post.body).toContain(`${mostUsed.k} appears in more menus than anything else — ${mostUsed.n} of ${menus.length}`);
    expect(post.body).toContain(`and comes ${rank}${suffix} on it`);
  });

  it("🔴 자주/드물게 쓰는 재료의 중앙값을 원본에서 다시 낸다", () => {
    // 🔴 기준(5개 메뉴)과 중앙값을 모듈에서 받지 않고 여기서 다시 만든다.
    //    모듈만 믿으면 기준을 1로 바꿔도 본문과 기대값이 같이 움직여 통과한다.
    const mid = (v: number[]) => {
      const t = [...v].sort((a, b) => a - b); const m = t.length >> 1;
      return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2;
    };
    const T = 5;
    const common = scored.filter((x) => x.n >= T);
    const rare = scored.filter((x) => x.n < T);
    // 🔴 양성 대조 — 한쪽이 비면 중앙값 비교가 성립하지 않는다
    expect(common.length, "자주 쓰는 재료가 없다").toBeGreaterThan(3);
    expect(rare.length, "드물게 쓰는 재료가 없다").toBeGreaterThan(3);
    expect(post.body, "중앙값 문장이 원본과 다르다").toContain(
      `The ${common.length} ingredients used in ${T} or more menus have a median serve of ` +
      `$${mid(common.map((x) => x.serve)).toFixed(2)}; the ${rare.length} used in fewer have a median of ` +
      `$${mid(rare.map((x) => x.serve)).toFixed(2)}`,
    );
    expect(post.body).toContain(`It is also ${common.length} ingredients against ${rare.length}`);
  });

  it("🔴 약한 상관을 패턴이라고 말하지 않는다", async () => {
    const P = await import("./portionEconomics");
    const r = P.menuCountVsServeCorr();
    expect(Math.abs(r), "상관이 실제로 강하다 — 그러면 문장을 바꿔야 한다").toBeLessThan(0.3);
    expect(post.body, "약한 상관인데 「없다」고 말하지 않는다")
      .toContain("near enough to zero to mean nothing");
    // 결론으로 쓰이면 안 되는 문장들
    for (const bad of [
      "the more often you use it, the cheaper",
      "staples are cheaper because",
      "proves that",
    ]) {
      expect(post.body.toLowerCase(), `"${bad}"`).not.toContain(bad);
    }
  });
});

/**
 * 🔴 크롤을 위한 내부 링크 (2026-09-11 신설)
 *
 * 🔴 왜 — GSC가 살아 있는 글 다섯 편을 「발견됨, 현재 색인 생성되지 않음」으로 들고 있다.
 *    발견은 했는데 크롤할 만큼 중요해 보이지 않는다는 뜻이고, 그 판단의 가장 큰 입력이
 *    **내부 링크**다. 09-11 전수 크롤에서 그 다섯 편 중 셋이 본문 링크를 **한 개**만
 *    받고 있었다(나머지는 목록 페이지에서 온 것이라 신호가 약하다).
 *
 * 🔴 기대값을 `relatedPosts`나 렌더 결과에서 뽑지 않는다. **본문 소스에서 직접 센다** —
 *    자동 관련글은 어느 글에나 붙으므로 그걸 세면 전부 통과한다.
 *    [[guard-expectations-from-same-source]]
 */
describe("🔴 모든 글이 다른 글에서 본문 링크를 받는다", () => {
  /** slug → 그 글을 본문에서 가리키는 **다른** 글/가이드 수 */
  const inbound = (slug: string) => {
    let n = 0;
    for (const [s, p] of Object.entries(POSTS)) {
      if (s === slug) continue;
      if (p.body.includes(`/blog/${slug})`)) n++;
    }
    for (const g of Object.values(GUIDES)) {
      if (g.body.includes(`/blog/${slug})`)) n++;
    }
    return n;
  };

  it("🔴 본문 링크가 0인 글이 없다", () => {
    const orphans = Object.keys(POSTS).filter((s) => inbound(s) === 0);
    expect(orphans, "다른 글이 한 번도 안 가리키는 글이 있다").toEqual([]);
  });

  it("🔴 GSC가 「크롤 안 함」으로 들고 있던 글은 본문 링크가 둘 이상이다", () => {
    // 2026-09-04 GSC 드릴다운에서 「발견됨 - 현재 색인이 생성되지 않음」이던 살아 있는 글.
    // 나머지 한 건은 폐기된 slug(lunchbox-price-index-august-2026)라 여기 없다.
    const DISCOVERED_NOT_CRAWLED = [
      "dairy-free-school-lunches-nz",
      "egg-free-lunchbox-ideas-nz",
      "gluten-free-school-lunches-nz",
      "no-cook-lunchbox-ideas-nz",
      "thermos-hot-lunches-nz-winter",
    ];
    for (const s of DISCOVERED_NOT_CRAWLED) {
      expect(POSTS[s], `${s}이 없다 — 목록이 낡았다`).toBeDefined();
      expect(inbound(s), `${s}의 본문 인바운드가 부족하다`).toBeGreaterThanOrEqual(2);
    }
  });

  it("🔴 가격지수 글끼리 서로를 가리킨다", () => {
    // 서로 근거를 나눠 가진 글들이다. 한 편만 크롤되면 나머지가 고아처럼 보인다.
    const PRICE = [
      "supermarket-price-gap-nz-lunchbox",
      "three-supermarkets-nz-lunchbox-basket-compared",
      "pack-price-vs-cost-per-serve-nz-lunchbox",
      "what-moved-nz-supermarket-shelf-prices",
      "gluten-free-dairy-free-swap-cost-nz",
      "what-is-always-on-special-nz-supermarkets",
      "allergen-labels-nz-lunchbox-staples",
    ];
    const thin = PRICE.filter((s) => inbound(s) < 2);
    expect(thin, "가격지수 글인데 본문 링크가 둘 미만이다").toEqual([]);
  });

  it("🔴 가리키는 slug가 실제로 존재한다 — 죽은 링크를 세지 않는다", () => {
    const slugs = new Set(Object.keys(POSTS));
    const bad: string[] = [];
    for (const [s, p] of Object.entries(POSTS)) {
      for (const m of p.body.matchAll(/\/en\/blog\/([a-z0-9-]+)\)/g)) {
        if (!slugs.has(m[1])) bad.push(`${s} → ${m[1]}`);
      }
    }
    for (const [s, g] of Object.entries(GUIDES)) {
      for (const m of g.body.matchAll(/\/en\/blog\/([a-z0-9-]+)\)/g)) {
        if (!slugs.has(m[1])) bad.push(`guide/${s} → ${m[1]}`);
      }
    }
    expect(bad, "없는 글을 가리키는 링크가 있다").toEqual([]);
    // 🔴 양성 대조 — 링크를 하나도 못 찾았으면 이 검사가 알리바이다
    const total = Object.values(POSTS).reduce(
      (n, p) => n + [...p.body.matchAll(/\/en\/blog\/([a-z0-9-]+)\)/g)].length, 0);
    expect(total, "본문 blog 링크를 하나도 못 찾았다").toBeGreaterThan(20);
  });
});

/**
 * 🔴 탭 타깃 최소 크기 (2026-09-11 신설)
 *
 * 🔴 왜 — 09-11 모바일 375px 실측에서 플래너의 누를 수 있는 요소 **185개가 22~32px**였다.
 *    가장 작은 건 재료 제외 칩 166개(22px)와 즐겨찾기 하트(22×28)다.
 *    WCAG 2.5.8(AA)은 24px, 애플 44px, 구글 Lighthouse 48px를 본다.
 *    **44px으로 잡았다** — 24는 낮고 48은 166개짜리 칩 목록이 화면을 다 먹는다.
 *
 * 🔴 픽셀을 컴포넌트에 적지 않는다. `--spacing-touch` 토큰 하나가 정한다.
 *    `min-h-[44px]`를 손으로 쓰면 다음 사람이 40px로 적어도 아무도 모른다.
 */
describe("🔴 누를 수 있는 것은 44px 이상이다", () => {
  const read = (f: string) =>
    readFileSync(new URL(`../${f}`, import.meta.url), "utf-8");
  const CSS = read("app/globals.css");
  const FILES = [
    "components/PlannerClient.tsx",
    "components/Navbar.tsx",
    "components/Footer.tsx",
    "components/CookieConsent.tsx",
    "components/CategoryFilter.tsx",
  ];

  it("🔴 최소 크기가 토큰 하나로 정의돼 있다", () => {
    expect(CSS, "--spacing-touch 토큰이 없다").toMatch(/--spacing-touch:\s*44px/);
  });

  it("🔴 픽셀을 컴포넌트에 직접 적지 않는다", () => {
    for (const f of FILES) {
      expect(read(f), `${f}에 min-h-[..px]가 손으로 적혀 있다 — min-h-touch를 쓸 것`)
        .not.toMatch(/min-[hw]-\[\d+px\]/);
    }
  });

  /**
   * `<button ... >` 여는 태그 한 덩어리씩.
   * 🔴 `/<button[\s\S]*?>/`로 잡으면 **화살표 함수의 `>`에서 끊긴다**
   *    (`onClick={() =>` 까지만 잡혀 className을 못 본다). 첫 시도가 그래서
   *    멀쩡한 버튼 25개를 실패로 올렸다 — 중괄호 깊이를 세며 직접 훑는다.
   */
  const buttons = (rawSrc: string) => {
    // 🔴 주석 안의 `<button>` 언급을 세면 안 된다 — CategoryFilter의 설명 주석이
    //    그대로 실패로 올라왔다. 블록/라인 주석을 먼저 걷어낸다.
    const src = rawSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const out: string[] = [];
    for (let i = src.indexOf("<button"); i >= 0; i = src.indexOf("<button", i + 1)) {
      let depth = 0, quote = "";
      for (let j = i + 7; j < src.length; j++) {
        const ch = src[j];
        if (quote) { if (ch === quote && src[j - 1] !== "\\") quote = ""; continue; }
        if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
        else if (ch === ">" && depth === 0) { out.push(src.slice(i, j + 1)); break; }
      }
    }
    return out;
  };

  it("🔴 모든 button이 최소 크기를 갖는다", () => {
    // 면제: 본문 안에 섞여 있는 텍스트 버튼(간격 예외) — 이유를 적고 개수를 못박는다
    const EXEMPT = [
      "Dismiss",           // 안내 배너 안의 인라인 텍스트 버튼
    ];
    const bad: string[] = [];
    let total = 0;
    for (const f of FILES) {
      for (const b of buttons(read(f))) {
        total++;
        if (b.includes("min-h-touch") || b.includes("min-w-touch")) continue;
        if (EXEMPT.some((e) => b.includes(e))) continue;
        bad.push(`${f}: ${b.replace(/\s+/g, " ").slice(0, 90)}`);
      }
    }
    // 🔴 양성 대조 — button을 하나도 못 찾았으면 이 검사가 알리바이다
    expect(total, "button을 하나도 못 찾았다 — 정규식이 깨졌다").toBeGreaterThan(10);
    expect(bad, "최소 크기 없는 button이 있다").toEqual([]);
  });

  it("🔴 고쳤던 작은 패딩이 되살아나지 않는다", () => {
    const planner = read("components/PlannerClient.tsx");
    // 22px짜리 재료 칩과 26px짜리 필터 칩의 원래 클래스
    expect(planner, "재료 제외 칩이 py-0.5로 돌아갔다")
      .not.toContain("px-2 py-0.5 rounded text-xs border");
    expect(planner, "필터 칩이 py-1로 돌아갔다")
      .not.toContain("px-3 py-1 rounded-full text-xs border");
    // 칩이 44px이면 128px 상자에는 두 줄밖에 안 들어간다 — 상자도 같이 커야 한다
    expect(planner, "제외 목록 상자가 max-h-32로 돌아갔다")
      .not.toContain("gap-1 mt-2 max-h-32");
  });

  it("🔴 아이콘만 있는 버튼에 접근 가능한 이름이 있다", () => {
    // 하트는 이모지뿐이라 스크린리더가 읽을 게 없었다
    const planner = read("components/PlannerClient.tsx");
    expect(planner).toMatch(/aria-label=\{`\$\{t\("favorite_toggle"\)\}/);
    for (const loc of ["en", "ko", "zh"]) {
      const m = JSON.parse(read(`messages/${loc}.json`)) as Record<string, string>;
      expect(m.favorite_toggle, `${loc}에 favorite_toggle이 없다`).toBeTruthy();
    }
  });
});

/**
 * 🔴 흰 글자를 얹는 면의 대비 (2026-09-11 신설)
 *
 * 🔴 왜 — Lighthouse 모바일이 플래너·홈·글·가격지수에서 color-contrast를 실패로 올렸다.
 *    브랜드 초록 `#78B159` 위의 흰 글자가 **2.55:1**, 가격지수 막대의 주황
 *    `#F5A623` 위가 **2.02:1**이었다. WCAG AA는 본문 4.5, 큰 글자 3.0이다.
 *    걸린 자리가 하필 **「Generate Plan」 CTA와 쿠키 「Accept」 버튼** —
 *    사이트의 제1 행동 버튼과 GDPR 동의 버튼이다.
 *
 * 🔴 문자열 비교가 아니라 **대비를 실제로 계산한다.** 색을 바꿔 적어도 수치가
 *    기준을 못 넘으면 터진다. 그리고 **옛 색이 반드시 걸리는지**를 같이 검사한다 —
 *    그게 없으면 계산이 틀려도 전부 통과한다. [[guard-expectations-from-same-source]]
 */
describe("🔴 흰 글자를 얹는 면이 WCAG AA를 넘는다", () => {
  const srcOf = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf-8");
  /** WCAG 2.x 상대휘도 */
  const relLum = (hex: string) => {
    const h = hex.replace("#", "");
    const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const lin = ch.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  };
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const AA = 4.5;

  it("🔴 계산이 맞는지 먼저 확인한다 — 알려진 값으로", () => {
    // 검은 글자/흰 배경은 21:1, 같은 색끼리는 1:1 — 공식이 틀리면 여기서 터진다
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrast("#777777", "#777777")).toBeCloseTo(1, 3);
    // 🔴 양성 대조 — **옛 색이 반드시 실패해야** 이 검사가 의미가 있다
    expect(contrast("#78B159", "#ffffff"), "옛 브랜드 초록이 통과한다 — 계산이 틀렸다").toBeLessThan(AA);
    expect(contrast("#F5A623", "#ffffff"), "옛 주황이 통과한다 — 계산이 틀렸다").toBeLessThan(AA);
  });

  it("🔴 흰 글자를 얹는 색이 전부 4.5:1을 넘는다", () => {
    const css = srcOf("app/globals.css");
    const m = /--color-primary-deep:\s*(#[0-9A-Fa-f]{6})/.exec(css);
    expect(m, "--color-primary-deep 토큰이 없다").not.toBeNull();
    const deep = m![1];
    expect(contrast(deep, "#ffffff"), `${deep} 위의 흰 글자가 AA를 못 넘는다`).toBeGreaterThanOrEqual(AA);
    // 가격지수 막대의 Pak'nSave 색 — 소스에서 읽어 계산한다
    const pi = srcOf("app/[locale]/price-index/page.tsx");
    const bar = /bg-\[(#[0-9A-Fa-f]{6})\] h-full rounded-full/.exec(pi);
    expect(bar, "Pak'nSave 막대 색을 못 찾았다 — 셀렉터가 낡았다").not.toBeNull();
    expect(contrast(bar![1], "#ffffff"), `막대 ${bar![1]} 위의 흰 숫자가 AA를 못 넘는다`)
      .toBeGreaterThanOrEqual(AA);
  });

  it("🔴 막대와 범례가 같은 색이다 — 범례가 거짓이면 안 된다", () => {
    const pi = srcOf("app/[locale]/price-index/page.tsx");
    const bars = [...pi.matchAll(/bg-(\[#[0-9A-Fa-f]{6}\]|primary-deep) h-full rounded-full/g)].map((x) => x[1]);
    const dots = [...pi.matchAll(/w-3 h-3 rounded-full bg-(\[#[0-9A-Fa-f]{6}\]|primary-deep)/g)].map((x) => x[1]);
    expect(bars.length, "막대를 못 찾았다").toBe(2);
    expect(dots.length, "범례 점을 못 찾았다").toBe(2);
    expect(dots, "범례 색이 막대 색과 다르다").toEqual(bars);
  });

  it("🔴 흰 글자 옆에 옛 초록이 남아 있지 않다", () => {
    const FILES = [
      "components/PlannerClient.tsx", "components/Navbar.tsx", "components/Footer.tsx",
      "components/CookieConsent.tsx", "components/AuthModal.tsx", "components/CategoryFilter.tsx",
      "app/[locale]/page.tsx", "app/[locale]/blog/[slug]/page.tsx",
      "app/[locale]/guides/[slug]/page.tsx", "app/[locale]/price-index/page.tsx",
      "app/not-found.tsx",
    ];
    /** 소스 한 덩어리에서 「흰 글자가 얹힌 옛 초록」을 찾는다. */
    const offenders = (src: string, label: string) => {
      const out: string[] = [];
      for (const m of src.matchAll(/bg-\[#78B159\](?!\/)/g)) {
        const win = src.slice(Math.max(0, m.index! - 200), m.index! + 200);
        if (/text-white/.test(win)) out.push(`${label}: …${win.replace(/\s+/g, " ").slice(150, 260)}…`);
      }
      return out;
    };
    // 🔴 양성 대조 — 스캐너가 실제로 잡는지 **가짜 소스로 먼저 터뜨려 본다.**
    //    이게 없으면 정규식이 깨져도 「위반 0건」으로 조용히 통과한다.
    expect(offenders('<div className="bg-[#78B159] text-white">x</div>', "fake"),
      "스캐너가 명백한 위반을 못 잡는다").toHaveLength(1);
    expect(offenders('<div className="bg-[#78B159]/40 text-white">x</div>', "fake"),
      "투명도 붙은 면까지 잡는다 — 오탐이다").toHaveLength(0);

    const bad: string[] = [];
    let mentions = 0;
    for (const f of FILES) {
      const s = srcOf(f);
      mentions += [...s.matchAll(/#78B159/g)].length;
      bad.push(...offenders(s, f));
    }
    // 🔴 브랜드 초록은 **테두리·연한 면에는 그대로 남아 있어야 한다.**
    //    전부 사라졌다면 색을 통째로 갈아치운 것이고 이 검사의 의도가 아니다.
    expect(mentions, "#78B159이 코드에서 통째로 사라졌다 — 테두리까지 바꾼 것이다")
      .toBeGreaterThan(10);
    expect(bad, "흰 글자가 얹힌 자리에 옛 초록이 남아 있다").toEqual([]);
  });
});

// 2026-09-14: 간식 글. 완성 도시락 $3.85 중 간식 두 칸이 $1.54다 — 3분의 1이 넘는데
// 간식을 **주제로** 다룬 글이 한 편도 없었다. 수치는 전부 lib/snackEconomics.ts에서 생성한다.
//
// 🔴 이 글을 쓰다가 실제로 밟은 함정: PORTION_FACTORS를 정규식으로 긁어 계산했더니
//    일부가 기본값으로 떨어져 과일칸 중앙값이 $0.72로 나왔고, 그 값으로 "논지가 깨졌다"는
//    결론까지 냈다. 진짜 import로 재니 $0.82였다. 그래서 본문에 금액을 못 박게 막는다.
describe("🔴 간식 글의 수치는 전부 데이터에서 나온다", () => {
  const SNACK_SLUG = "what-lunchbox-snacks-cost-nz";
  const src = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "content", "posts.ts"),
    "utf8",
  );
  /** posts.ts 안에서 이 글의 객체 리터럴만 잘라낸다 — 옆 글의 문자열을 읽지 않기 위해. */
  function snackPostSource(text = src): string {
    const start = text.indexOf(`"${SNACK_SLUG}": {`);
    expect(start, "간식 글을 posts.ts에서 못 찾았다").toBeGreaterThan(-1);
    const end = text.indexOf("\n  },\n", start);
    expect(end, "간식 글의 끝을 못 찾았다").toBeGreaterThan(start);
    return text.slice(start, end);
  }

  it("본문에 손으로 적은 금액이 없다", () => {
    const body = snackPostSource();
    // `${...}` 보간을 걷어낸 뒤에도 $N.NN 이 남으면 손으로 적은 것이다.
    const literal = body.replace(/\$\{[^}]*\}/g, "");
    const money = literal.match(/\$\d+(?:\.\d+)?/g) ?? [];
    expect(money, `손으로 적은 금액: ${money.join(", ")}`).toEqual([]);
  });

  it("돌연변이: 금액을 하나 박으면 위 검사가 터진다", () => {
    const mutated = snackPostSource().replace(
      "So this one is about the snacks.",
      "So this one is about the snacks, all for $2.50.",
    );
    const literal = mutated.replace(/\$\{[^}]*\}/g, "");
    expect(literal.match(/\$\d+(?:\.\d+)?/g) ?? []).toContain("$2.50");
  });

  // 🔴 소스에서 × 는 `\u00d7` 이스케이프로 적혀 있다. 문자 × 만 찾으면 영원히 0건이라
  //    가드가 알리바이가 된다 — 09-14에 돌연변이가 통과해서 드러났다. 둘 다 본다.
  it("배수(N.N×)도 손으로 적지 않는다", () => {
    const literal = snackPostSource().replace(/\$\{[^}]*\}/g, "");
    const mult = literal.match(/\d+(?:\.\d+)?\s*(?:×|\\u00d7)/g) ?? [];
    expect(mult, `손으로 적은 배수: ${mult.join(", ")}`).toEqual([]);
  });

  it("돌연변이: 배수를 하나 박으면 위 검사가 터진다", () => {
    const mutated = snackPostSource().replace(
      "So this one is about the snacks.",
      "So this one is about the snacks, all 9.9\\u00d7 apart.",
    ).replace(/\$\{[^}]*\}/g, "");
    expect(mutated.match(/\d+(?:\.\d+)?\s*(?:×|\\u00d7)/g) ?? []).not.toEqual([]);
  });

  it("글이 실제로 실려 있고 Price Index 묶음에 든다", () => {
    const post = POSTS[SNACK_SLUG];
    expect(post, "간식 글이 POSTS에 없다").toBeTruthy();
    expect(post.category).toBe("Price Index");
  });
});

describe("🔴 간식 수치 생성기가 데이터와 맞다", () => {
  const SN = (menuData as unknown as { SNACK_DATA: SnackData }).SNACK_DATA;

  it("카테고리 표의 건수 합이 간식 총수와 같다", async () => {
    const all = Object.values(SN).reduce((t, arr) => t + (arr as SnackItem[]).length, 0);
    expect(SNACK.snackCount()).toBe(all);
    expect(SNACK.categoryRows().reduce((t, r) => t + r.n, 0)).toBe(all);
  });

  it("가격이 비는 간식이 없다 — 있으면 중앙값이 거짓이 된다", async () => {
    expect(SNACK.unpricedSnacks()).toEqual([]);
  });

  it("양성 대조: 가격을 지우면 unpricedSnacks 가 잡아낸다", async () => {
    // 🔴 vi.resetModules() 를 쓰면 안 된다 — 새로 import 된 모듈이 JSON 을 다시 읽어
    //    내가 넣은 변형을 잃는다. 09-14에 이걸로 양성 대조가 조용히 통과했다.
    //    같은 객체를 그대로 건드리고, 이미 import 한 함수를 부른다.
    const S = SNACK;
    const P = PRICES as Record<string, { data?: { price?: number } }>;
    const victim = SN["Fruit & Veg"][0].ingredients[0];
    const keep = P[victim];
    expect(S.unpricedSnacks(), "변형 전에는 비어 있어야 한다").toEqual([]);
    try {
      P[victim] = { data: {} };
      expect(S.unpricedSnacks().length).toBeGreaterThan(0);
    } finally {
      P[victim] = keep;
    }
    expect(S.unpricedSnacks(), "복원 뒤 다시 비어야 한다").toEqual([]);
  });

  it("플래너가 안 쓰는 칸은 표에 별표가 붙고 본문이 그걸 밝힌다", async () => {
    const { categoryRows, categoryTable, EXCLUDED_CATEGORY } = SNACK;
    const excluded = categoryRows().filter((r) => !r.inPlannerPool);
    expect(excluded.map((r) => r.cat)).toEqual([EXCLUDED_CATEGORY]);
    expect(categoryTable()).toContain(`| ${EXCLUDED_CATEGORY} \u2020 |`);
    expect(POSTS["what-lunchbox-snacks-cost-nz"].body).toContain(
      "the planner's generator does not draw from it",
    );
  });

  it("「가장 비싸다」는 차이가 8% 넘을 때만 말한다", async () => {
    const { dearestVerdict, categoryRows, TIGHT_PCT } = SNACK;
    const [a, b] = categoryRows();
    const gap = (a.median - b.median) / b.median;
    if (gap < TIGHT_PCT) {
      expect(dearestVerdict()).toContain("too close to call");
    } else {
      expect(dearestVerdict()).toContain("dearest box");
    }
  });

  it("「칸 안이 더 넓다」는 실제로 그럴 때만 말한다", async () => {
    const { spreadVerdict, widestCategory, betweenCategorySpread } = SNACK;
    const inside = widestCategory().spread;
    const between = betweenCategorySpread();
    if (inside > between) {
      expect(spreadVerdict()).toContain("far wider than the gap between categories");
    } else {
      expect(spreadVerdict()).toContain("which box you pick is the bigger decision");
    }
    // 지금 데이터에서 실제로 성립하는지도 함께 본다 — 글의 논지가 여기 걸려 있다
    expect(inside).toBeGreaterThan(between);
  });

  it("본문의 배수·금액이 생성기 값과 자리까지 일치한다", async () => {
    const S = SNACK;
    const body = POSTS["what-lunchbox-snacks-cost-nz"].body;
    expect(body).toContain(`${S.widestCategory().spread.toFixed(1)}×`);
    expect(body).toContain(S.money(S.swapSaving()));
    expect(body).toContain(S.money(S.weeklySwapSaving()));
    // 도시락 한 통은 **사이트가 게시하는 라벨**로 말한다 — 아래 describe를 볼 것.
    expect(body).toContain(boxMedianLabel());
  });
});

/**
 * 🔴 도시락 한 통의 정의는 **한 곳**에만 있어야 한다 (2026-09-15).
 *
 * `snackEconomics`가 자기 몫의 계산을 따로 갖고 있었고, 둘째 칸을 세 풀 전부의
 * 중앙값으로 잡았다. 생성기는 둘째 칸을 `Protein & Dairy ∪ Savoury Crunch`에서만
 * 뽑는다(`planGenerator.ts:368-374`). 결과는 **라이브 자기모순**이었다 —
 * 간식 글만 $3.85, FAQ·홈·플래너 문구는 3개 언어로 $3.80.
 * AdSense가 이 사이트를 거절한 사유가 정확히 "문구끼리의 모순"이다.
 *
 * 🔴 `servePrice.ts` 안에는 이미 "두 풀을 합쳐 중앙값을 한 번 구하면 안 된다"는
 *    경고가 있었다. **경고가 그 파일 안에만 있어서** 밖에서 새로 쓴 모듈에 안 닿았다.
 *    그래서 주석이 아니라 가드로 건다.
 */
describe("🔴 도시락 한 통의 정의는 한 곳뿐이다", () => {
  it("snackEconomics가 servePrice와 같은 값을 준다", () => {
    expect(SNACK.medianLunchbox()).toBeCloseTo(boxMedian(), 10);
    expect(SNACK.twoSnackCost()).toBeCloseTo(snackSlotsCost(), 10);
  });

  it("간식 두 칸 = 과일 중앙값 + (단백·과자) 중앙값 — 세 풀을 합치지 않는다", () => {
    const SN = (menuData as unknown as { SNACK_DATA: SnackData }).SNACK_DATA;
    const cost = (s: SnackItem) =>
      s.ingredients.reduce(
        (t, i) => t + ((PRICES as unknown as Record<string, { data?: { price?: number } }>)[i]
          ?.data?.price ?? 0) * (PORTION_FACTORS[i] ?? DEFAULT_PORTION),
        0,
      );
    const med = (xs: number[]) => {
      const a = [...xs].sort((x, y) => x - y);
      const m = Math.floor(a.length / 2);
      return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
    };
    const fruit = med((SN["Fruit & Veg"] ?? []).map(cost));
    const other = med([...(SN["Protein & Dairy"] ?? []), ...(SN["Savoury Crunch"] ?? [])].map(cost));
    const allThree = med([
      ...(SN["Fruit & Veg"] ?? []),
      ...(SN["Protein & Dairy"] ?? []),
      ...(SN["Savoury Crunch"] ?? []),
    ].map(cost));

    expect(snackSlotsCost()).toBeCloseTo(fruit + other, 10);

    // 🔴 양성 대조 — 옛 공식이 **실제로 다른 값**이어야 이 검사에 의미가 있다.
    //    두 값이 우연히 같아지면 위 검사는 통과해도 아무것도 안 지킨 것이다.
    expect(Math.abs(fruit + allThree - (fruit + other))).toBeGreaterThan(0.01);
    expect(snackSlotsCost()).not.toBeCloseTo(fruit + allThree, 2);
  });

  it("글과 사이트 문구가 같은 금액을 말한다", () => {
    const body = POSTS["what-lunchbox-snacks-cost-nz"].body;
    const label = boxMedianLabel();
    expect(body, `글이 게시 중앙값 ${label}을 말하지 않는다`).toContain(label);

    // 🔴 글에 중앙값 자리의 **다른** 금액이 있으면 그게 09-15의 $3.85다.
    const near = [...body.matchAll(/\$\d+(?:\.\d{2})?/g)]
      .map((m) => m[0])
      .filter((m) => Math.abs(Number(m.slice(1)) - boxMedian()) <= 0.12 && m !== label);
    expect(near, `글이 게시값과 다른 도시락 금액을 말한다 → ${near.join(", ")}`).toEqual([]);
  });
});

/**
 * 🔴 09-28 전수 감사 A — 가격지수·특가·알레르겐·대체품·간식 글 8편.
 *    손으로 적힌 문장이 수집 방식·생성값·플래너 동작과 어긋나 있던 자리들.
 */
describe("🔴 09-28 전수 감사 A", () => {
  const P = (slug: string) => POSTS[slug];
  const GAP = "supermarket-price-gap-nz-lunchbox";
  const THREE3 = "three-supermarkets-nz-lunchbox-basket-compared";
  const MOVED = "what-moved-nz-supermarket-shelf-prices";

  it("세 열 다 주간 자동 수집이다 — 「손으로 읽는다」가 가격 글에 없다", () => {
    // 근거: scripts/collect_prices_local.sh 가 update_paknsave/newworld_prices.mjs 를 매주 돌린다
    const src = readFileSync(new URL("../scripts/collect_prices_local.sh", import.meta.url), "utf-8");
    expect(src, "양성 대조 — 수집 스크립트가 두 Foodstuffs 수집기를 돌린다").toMatch(/update_paknsave_prices\.mjs[\s\S]*update_newworld_prices\.mjs/);
    for (const slug of [GAP, THREE3, MOVED]) {
      expect(P(slug).body, slug).not.toMatch(/(read|checked) by hand/i);
    }
    expect(P(THREE3).body).not.toMatch(/product was not logged/);
    const route = readFileSync(new URL("../app/price-index.csv/route.ts", import.meta.url), "utf-8");
    expect(route).not.toMatch(/read by hand/);
  });

  it("New World SKU를 수집기와 같은 규칙(newworld ?? paknsave)으로 센다", async () => {
    const { GET } = await import("../app/price-index.csv/route");
    const rows = (await (GET() as Response).text()).trim().split("\n");
    const head = rows[0].split(",");
    const iChain = head.indexOf("chain"), iSku = head.indexOf("sku"), iPrice = head.indexOf("price_nzd");
    const nw = rows.slice(1).map(splitCsv).filter((c) => c[iChain] === "New World" && c[iPrice]);
    expect(nw.length, "양성 대조 — New World 줄이 있다").toBeGreaterThan(5);
    const src = (
      JSON.parse(readFileSync(new URL("../data/priceIndexSources.json", import.meta.url), "utf-8")) as {
        items: Record<string, { paknsave?: { sku?: string }; newworld?: { sku?: string } }>;
      }
    ).items;
    const collectorHasSku = (name: string) => Boolean((src[name]?.newworld ?? src[name]?.paknsave)?.sku);
    const iItem = head.indexOf("index_item");
    for (const c of nw) {
      const name = c[iItem].split(" — ")[0];
      if (collectorHasSku(name)) expect(c[iSku], `${name}: 수집기가 SKU로 읽는데 CSV가 비워 둔다`).not.toBe("");
    }
    expect(P(THREE3).body).not.toMatch(/only \d+ of the \d+ New World ones/);
  });

  it("2열 글의 손글씨 단정이 돌아오지 않는다", () => {
    const b = P(GAP).body;
    expect(b).not.toMatch(/twelve items/);
    expect(b).not.toMatch(/There are two rounds of this basket/);
    expect(b).not.toMatch(/loose change/);
    // 머리글은 TOP_GAP_N·비율에서 생성한다 — 원본에 손글씨 머리글이 돌아오면 안 된다
    const postsSrc = readFileSync(new URL("../content/posts.ts", import.meta.url), "utf-8");
    expect(postsSrc).not.toContain("## Four items carry most of it");
    // 5월 라운드는 매장 확인이었다 — 본문이 그 사실을 말한다
    const may = (index as unknown as { history: Array<{ method: string }> }).history[0].method;
    expect(may, "양성 대조 — 5월 라운드 방식").toMatch(/in store/);
    expect(b).toMatch(/round was checked in store at both chains/);
  });

  it("「the concentration held」가 두 글 어디에도 없다 — 5월 대비 비율은 생성한다", () => {
    for (const slug of [GAP, THREE3]) {
      expect(P(slug).body, slug).not.toMatch(/concentration held/);
      expect(P(slug).body, slug).toMatch(/widest gaps made up \d+% of the Woolworths–Pak'nSave difference/);
    }
  });

  it("통로 문장이 두 글 사이에서 같은 말을 한다", () => {
    expect(P(MOVED).body).not.toMatch(/gap coming out of one aisle/);
    expect(P(THREE3).excerpt).not.toMatch(/every cent of the gap/);
  });

  it("「같이 움직이지 않는다」를 단정하지 않는다 — 변동 건수로 판정한다", async () => {
    const { sharedMoves } = await import("./priceMovement");
    const { shared, total } = sharedMoves();
    expect(total, "양성 대조").toBeGreaterThan(0);
    expect(P(MOVED).body).not.toMatch(/cluster in time\. They do not\./);
    expect(P(MOVED).body).toContain(`${shared} of the ${total} changes`);
  });

  it("특가 글이 실제 토글 라벨과 생성된 주 수를 쓴다", async () => {
    const en = JSON.parse(readFileSync(new URL("../messages/en.json", import.meta.url), "utf-8"));
    const { PROMO_WEEK_COUNT } = await import("./promoHistory");
    const p = P("what-is-always-on-special-nz-supermarkets");
    expect(p.body).toContain(`"${en.sale_toggle_label}"`);
    expect(p.body).not.toMatch(/Plan around this week's specials/);
    expect(p.excerpt).not.toMatch(/ten weeks/);
    expect(p.excerpt).toContain(`${PROMO_WEEK_COUNT} weeks`);
    expect(p.body).not.toMatch(/came round twice/);
  });

  it("알레르겐 글이 라벨 없는 포장 식품과 메인 필터 방식을 사실대로 말한다", async () => {
    const F = await import("./allergenFacts");
    const b = P("allergen-labels-nz-lunchbox-staples").body;
    expect(b).not.toMatch(/the rest are loose produce, meat and dry goods/);
    expect(b).not.toMatch(/all come out of the same check/);
    expect(b).not.toMatch(/different item this week/);
    expect(F.unlabelledPackagedExamples().length, "양성 대조 — 라벨 없는 포장 식품").toBeGreaterThan(0);
    expect(b).toMatch(/Main meals are filtered on dietary flags I set by hand/);
  });

  it("대체품 글의 배수·방향이 생성값을 따른다", async () => {
    const S = await import("./substituteCosts");
    const b = P("gluten-free-dairy-free-swap-cost-nz").body;
    expect(b).not.toMatch(/1\.8× dearer|3\.6× dearer/);
    expect(b).not.toMatch(/near a third dearer/);
    expect(b).not.toMatch(/The swap is expensive/);
    for (const r of S.samePackRows()) expect(b).toContain(`${r.free} at ${r.multiple.toFixed(2)}×`);
    if (S.swapMenuMedian() <= S.naturalGfMedian()) {
      expect(b).not.toMatch(/menus that buy a substitute are the dearer group/);
    }
  });

  it("간식 글의 「칸 안」 비교가 플래너가 뽑는 칸만 쓴다", () => {
    const w = SNACK.widestCategory();
    expect(w.inPlannerPool, `${w.cat}는 생성기가 안 뽑는 칸이다`).toBe(true);
    // 양성 대조 — 제외 칸이 실제로 있고 표에 남아 있다
    expect(SNACK.categoryRows().some((r) => !r.inPlannerPool)).toBe(true);
    const b = P("what-lunchbox-snacks-cost-nz").body;
    expect(b).toContain(`"Which one inside the ${w.cat} box?"`);
    expect(b).toContain(`eats the ${w.dearest.toLowerCase()} and leaves the ${w.cheapest.toLowerCase()}`);
    expect(b).not.toMatch(/"Which fruit\?"/);
  });

  it("영수증 캡션의 1·2위가 금액 순서와 맞다", () => {
    const cap = P("pack-price-vs-cost-per-serve-nz-lunchbox").imageCaption ?? "";
    const first = /dearest line is [^$]*\$(\d+\.\d\d)/.exec(cap);
    const second = /second dearest [^$]*\$(\d+\.\d\d)/.exec(cap);
    expect(first && second, "양성 대조 — 캡션에서 두 금액을 읽었다").toBeTruthy();
    expect(Number(first![1])).toBeGreaterThan(Number(second![1]));
    expect(P("pack-price-vs-cost-per-serve-nz-lunchbox").body).not.toMatch(/Pak'nSave prices by store/);
  });
});

/**
 * 🔴 09-28 전수 감사 B — 10편(견과·예산·랩·달걀·배치쿠킹·철분·봄·개학·보온병·유제품).
 *
 * 세 부류였다.
 *  ① **플래너가 안 하는 일을 약속했다** — 계절 반영·철분 우선·비타민C 짝짓기·연령·예산 설정·
 *     「한 번 설정하면」(필터는 방문마다 [] 로 초기화된다)·「Pak'nSave 가격」(캐시는 Woolworths).
 *     유제품 글은 「간식은 안 거른다」고 했는데 `planGenerator`는 `snackAllowed`로 거른다.
 *  ② **같은 글 안에서 스스로를 반박했다** — 봄 글 「당근 20% 넘게 하락」 옆 표가 −18%,
 *     철분 글 「다짐육 40g ~2mg」 옆 표가 100g당 ~2.5mg, 보온병 제목 「Cheaper」 옆 생성문 「about the same」.
 *  ③ **틀린 외부 사실** — 「top 14 allergens … either … or」(FSANZ PEAL은 둘 다 요구),
 *     MoneyTalks 「정부 운영」(FinCap), 「low-decile」(2023년 Equity Index로 대체), Pak'nSave 「Homebrand」(Pams).
 *
 * 문구 금지는 두더지잡기라, 가능한 곳은 **본문 안의 표·데이터로 문장을 검산**한다.
 */
describe("🔴 09-28 전수 감사 B", () => {
  const SLUGS = [
    "nut-free-school-lunches-new-zealand", "budget-friendly-lunchbox-ideas-nz",
    "easy-wraps-for-school-lunches-nz", "egg-free-lunchbox-ideas-nz", "batch-cooking-save-money-nz",
    "iron-rich-lunchbox-foods-nz", "spring-lunchbox-ideas-nz", "back-to-school-lunchbox-prep-nz",
    "thermos-hot-lunches-nz-winter", "dairy-free-school-lunches-nz",
  ] as const;
  const B = (slug: (typeof SLUGS)[number]) => POSTS[slug].body;

  it("양성 대조 — 10편을 실제로 읽었다", () => {
    for (const s of SLUGS) expect(B(s).length, s).toBeGreaterThan(3000);
  });

  it("🔴 플래너에 없는 기능을 약속하지 않는다", () => {
    const FAKE: [RegExp, string][] = [
      [/based on what's in season|season-aware|what's in season in NZ, so you/i, "계절 반영(생성기에 계절 로직 없음)"],
      [/prioritise iron-rich|automatically pair them with vitamin C/i, "철분 우선·비타민C 짝짓기"],
      [/age-appropriate/i, "연령 반영"],
      [/\b(?:Set|set) (?:it|your child's [^.]{0,60}) once\b/, "「한 번 설정」(필터는 방문마다 초기화)"],
      [/Woolworths or Pak'nSave prices/i, "Pak'nSave 가격(캐시는 Woolworths NZ)"],
      [/designed for batch cooking/i, "배치쿠킹용 설계"],
      [/Snacks come from (?:a|the) separate (?:snack )?list and are not filtered by it/i, "간식 무필터(snackAllowed가 거른다)"],
      [/kiwilunchbox\.com\b/, "틀린 도메인"],
    ];
    const hits: string[] = [];
    for (const s of SLUGS) for (const [re, why] of FAKE) if (re.test(B(s))) hits.push(`${s}: ${why}`);
    expect(hits, `없는 기능·틀린 사실이 되살아났다 →\n  ${hits.join("\n  ")}`).toEqual([]);
    // 근거가 여전히 코드에 있는지 — 기능이 생기면 이 가드를 풀 차례다
    const client = readFileSync(new URL("../components/PlannerClient.tsx", import.meta.url), "utf-8");
    expect(client, "알레르기 초기값이 []가 아니다 — 「방문마다 다시 체크」 문장을 재검토").toContain(
      "useState<AllergyType[]>([])",
    );
    const gen = readFileSync(new URL("./planGenerator.ts", import.meta.url), "utf-8");
    expect(gen, "간식이 알레르기 필터를 안 거친다 — 유제품 글의 문장이 거짓이 된다").toContain(
      "snackAllowed(sn, allergies, excluded)",
    );
    expect(gen, "생성기에 계절 로직이 생겼다 — 봄 글 CTA를 재검토").not.toMatch(/season|getMonth\(/i);
  });

  it("🔴 달걀 글 제목의 순위가 메뉴 데이터와 맞다", () => {
    const n = (f: (m: MenuItem) => boolean) => MENUS.filter(f).length;
    const egg = n((m) => m.is_egg_free);
    const lighter = [n((m) => m.is_nut_free), n((m) => m.is_dairy_free), n((m) => m.is_gluten_free)]
      .filter((c) => c > egg).length;
    const body = B("egg-free-lunchbox-ideas-nz");
    if (lighter > 0) expect(body, "달걀보다 가벼운 제한이 있는데 「가장 가볍다」고 한다").not.toContain("Egg Is the Least Constraining");
    if (lighter === 1) expect(body).toContain("Egg Is the Second-Lightest of the Big Four");
    // 🔴 반쪽 주간 합계(메인만)를 한 주 전체처럼 말하던 줄
    expect(body).not.toContain("**Weekly cost: ~$8.00 per child**");
    expect(body, "유제품 비교가 생성 판정을 안 쓴다").toMatch(/a dairy-free main costs about/);
  });

  it("🔴 보온병 글의 제목·판정이 생성 비교를 따른다", () => {
    const body = B("thermos-hot-lunches-nz-winter");
    const t = MENUS.filter((m) => m.is_thermos);
    expect(t.length).toBeGreaterThan(0);
    const m = body.match(/median \$(\d+\.\d{2}) against \$(\d+\.\d{2}) for everything else/);
    expect(m, "생성 비교 문장을 못 찾았다").toBeTruthy();
    const pct = ((Number(m![1]) - Number(m![2])) / Number(m![2])) * 100;
    if (pct > -8) {
      expect(body, "보온병이 싸지 않은데 싸다고 한다").not.toMatch(/Cheaper, Not Dearer|costs less and takes less|the cheaper option/);
    }
    if (pct < 8) expect(body, "보온병이 비싸지 않은데 비싸다고 한다").not.toMatch(/costs more than a cold lunch/);
    // 전부 cook-fresh 인데 「아침 수고가 준다」고 하던 줄
    expect(body).not.toMatch(/takes less morning effort/);
  });

  it("🔴 봄 글: 「20% 넘게 움직였다」고 이름 댄 품목이 본문 표에서 실제로 그만큼 움직였다", () => {
    const body = B("spring-lunchbox-ideas-nz");
    const pctByName = new Map<string, number>();
    for (const l of body.split("\n")) {
      const r = l.match(/^\| ([^|]+?) \| \$[\d.]+ \| \$[\d.]+ \| \**([+−-])(\d+)%\** \|$/);
      if (r) pctByName.set(r[1].replace(/\s+\d.*$/, "").toLowerCase(), (r[2] === "+" ? 1 : -1) * Number(r[3]));
    }
    expect(pctByName.size, "5월↔현재 표를 못 읽었다").toBeGreaterThan(8);
    const names = (sentence: string) =>
      sentence.replace(/\band\b/g, ",").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    const down = body.match(/([A-Za-z ,]+) came down by 20% or more\./);
    const up = body.match(/([A-Za-z ,]+) went up by 20% or more\./);
    expect(down && up, "움직임 문장이 없다 — 표를 말로 옮기는 자리가 사라졌다").toBeTruthy();
    for (const n of names(down![1])) expect(pctByName.get(n), `${n}: 20% 넘게 내리지 않았다`).toBeLessThanOrEqual(-20);
    for (const n of names(up![1])) expect(pctByName.get(n), `${n}: 20% 넘게 오르지 않았다`).toBeGreaterThanOrEqual(20);
    // 반대로 — 표에서 20% 넘게 움직인 품목을 문장이 빠뜨리지 않는다
    const said = new Set([...names(down![1]), ...names(up![1])]);
    for (const [n, p] of pctByName) if (Math.abs(p) >= 20) expect(said.has(n), `${n}(${p}%)가 문장에서 빠졌다`).toBe(true);
    expect(body).not.toContain("Pasta and carrots both came down by more than 20%");
    // 재료표는 아스파라거스가 치즈보다 비싼데 「치즈 때문에 비싸다」고 하던 줄
    expect(body).not.toContain("mostly because of the cheese, not the asparagus");
  });

  it("🔴 철분 글: 본문의 철분 수치가 전부 NZ 식품성분 DB에서 독립 재계산한 값과 같다", () => {
    /**
     * 🔴 2026-09-29: 이 글은 철분 수치를 두 벌 갖고 있었다 — 원가 표는 NZ DB, 나머지는 출처 없는 손글씨.
     *    말린 살구 30g ~0.9mg(손글씨) vs 20g ~0.24mg(DB) — 같은 페이지가 g당 세 배 다른 값을 말했다.
     *    예전 가드는 손글씨 두 곳끼리(다짐육 문장 ↔ 손글씨 100g당 표)만 맞춰 봐서 **둘 다 틀려도 초록**이었다.
     *    이제 기대값을 `data/ironContent.json`에서 **lib을 거치지 않고** 다시 계산한다.
     */
    const body = B("iron-rich-lunchbox-foods-nz");
    const raw = JSON.parse(readFileSync(new URL("../data/ironContent.json", import.meta.url), "utf-8")) as {
      foods: Record<string, { ironPer100g: number; measure?: { grams: number; text: string } }>;
      reference: Record<string, { ironPer100g: number; measure?: { grams: number; text: string } }>;
    };
    const ref = (k: string) => {
      const r = raw.foods[k] ?? raw.reference[k];
      expect(r, `ironContent.json에 ${k}가 없다`).toBeTruthy();
      return r;
    };
    const shown = (mg: number) => `~${mg.toPrecision(2)}mg`;
    const iron = (k: string, g: number) => shown((ref(k).ironPer100g * g) / 100);
    const measure = (k: string) => ref(k).measure!.grams;

    // 아이디어별 구성 — 컵·스푼·개수 무게는 DB 레코드의 제공량에서, 글이 정한 g는 본문에서 읽는다.
    const g = (re: RegExp) => {
      const m = body.match(re);
      expect(m, `본문에서 못 찾았다: ${re}`).toBeTruthy();
      return Number(m![1]);
    };
    const minceG = g(/Leftover cooked beef mince \((\d+)g provides/);
    const thighG = g(/- (\d+)g shredded chicken thigh/);
    const lentilG = g(/made with (\d+)g cooked red lentils/);
    const seedG = g(/Pumpkin seed kernels \((\d+)g,/);
    const parts: Record<string, [string, number, string][]> = {
      wrap: [["Beef mince, cooked", minceG, `Leftover cooked beef mince (${minceG}g provides ${iron("Beef mince, cooked", minceG)} iron, at ${shown(ref("Beef mince, cooked").ironPer100g)} per 100g)`]],
      pasta: [
        ["Chicken thigh, cooked", thighG, `- ${thighG}g shredded chicken thigh (${iron("Chicken thigh, cooked", thighG)} iron`],
        ["Spinach", measure("Spinach"), `A cup of baby spinach (${measure("Spinach")}g, ${iron("Spinach", measure("Spinach"))} iron)`],
      ],
      soup: [["Red lentils, cooked", lentilG, `${lentilG}g cooked red lentils (${iron("Red lentils, cooked", lentilG)} iron`]],
      mix: [
        ["Weet-Bix", measure("Weet-Bix"), `- 2 Weet-Bix, crumbled (${measure("Weet-Bix")}g, ${iron("Weet-Bix", measure("Weet-Bix"))} iron)`],
        ["Raisins", measure("Raisins"), `A snack pack of raisins (${measure("Raisins")}g, ${iron("Raisins", measure("Raisins"))} iron)`],
        ["Pumpkin seeds", seedG, `Pumpkin seed kernels (${seedG}g, ${iron("Pumpkin seeds", seedG)} iron`],
        ["Dried Apricots", measure("Dried Apricots"), `4 dried apricot halves (${measure("Dried Apricots")}g, ${iron("Dried Apricots", measure("Dried Apricots"))} iron)`],
      ],
      hummus: [["Hummus", measure("Hummus") * 3, `3 tbsp hummus (${measure("Hummus") * 3}g, ${iron("Hummus", measure("Hummus") * 3)} iron)`]],
    };
    const totals: Record<string, number> = {};
    for (const [idea, ps] of Object.entries(parts)) {
      for (const [, , text] of ps) expect(body, `${idea}: 구성 수치가 DB 재계산과 다르다`).toContain(text);
      totals[idea] = Math.round(ps.reduce((t, [k, grams]) => t + Number(iron(k, grams).slice(1, -2)), 0) * 100) / 100;
    }
    // 개수 표현이 DB 제공량과 같은 것을 말한다
    expect(ref("Weet-Bix").measure!.text).toBe("2 biscuits");
    expect(body).toContain("Crush 2 Weet-Bix");
    expect(ref("Dried Apricots").measure!.text).toBe("4 apricot halves");
    expect(ref("Hummus").measure!.text).toBe("1 tablespoon");

    // 합계 줄 = 구성의 합(화면 값)
    expect(body).toContain(`**Iron content: ~${totals.wrap}mg from the mince**`);
    expect(body).toContain(`**Iron content: ~${totals.pasta}mg from the chicken and spinach**`);
    expect(body).toContain(`**Iron content: ~${totals.soup}mg from the lentils**`);
    expect(body).toContain(`**Iron content: ~${totals.mix}mg per serve**`);
    expect(body).toContain(`**Iron content: ~${totals.hummus}mg from the hummus**`);

    // 주간 요약 — 합계와 NRV 비율
    const pct = (mg: number) => Math.round(mg * 10);
    const four = [totals.wrap, totals.pasta, totals.hummus, totals.soup].map(pct);
    expect(body).toContain(`~${totals.wrap}mg for the beef wrap, ~${totals.pasta}mg for the chicken pasta`);
    expect(body).toContain(`roughly ${Math.min(...four)}–${Math.max(...four)}% of the day's iron, and the Weet-Bix day about ${pct(totals.mix)}%`);

    // 참고표·강화식품 표·팁 — 같은 DB
    expect(body).toContain(`| Weet-Bix | 2 biscuits (${measure("Weet-Bix")}g) | ${iron("Weet-Bix", measure("Weet-Bix"))} |`);
    expect(body).toContain(`| Baby spinach, raw | 1 cup (${measure("Spinach")}g) | ${iron("Spinach", measure("Spinach"))} |`);
    expect(body).toContain(`| Beef mince, prime, cooked | 100g | ${shown(ref("Beef mince, cooked").ironPer100g)} |`);
    expect(body).toContain(`| Sanitarium Weet-Bix | ${iron("Weet-Bix", measure("Weet-Bix"))} per 2 biscuits`);
    const bread = Number(iron("Wholemeal bread", measure("Wholemeal bread")).slice(1, -2));
    expect(body).toContain(`delivers about ${Math.round((bread + totals.mix) * 100) / 100}mg of iron`);

    // 🔴 옛 손글씨가 되살아나면 잡는다 — 전부 DB와 어긋나던 값이다
    for (const dead of [
      "NZ Health Survey", "Well Child provider", "iron-enriched", "enriched pasta",
      "at ~2.5mg per 100g", "~0.9mg", "6 dried apricots contain about 1mg", "A cup of baby spinach (~0.8mg",
      "3-4 leaves adds 0.3mg", "about 6.6mg of iron", "~7.5mg per serve", "more than half a child's daily requirement",
      "$5.50", "Up&Go", "Pams cornflakes", "7.5mg per 100g", "costs under $2", "iron powerhouse",
    ]) {
      expect(body, `되살아났다: ${dead}`).not.toContain(dead);
    }
  });

  it("🔴 철분 글: 소스에 손으로 적은 mg 수치는 NRV 줄뿐이다", () => {
    const src = readFileSync(new URL("../content/posts.ts", import.meta.url), "utf-8");
    const a = src.indexOf('"iron-rich-lunchbox-foods-nz": {');
    const b = src.indexOf("\n  \"", a + 10);
    expect(a).toBeGreaterThan(-1);
    expect(src.slice(a, b), "글 끝까지 못 읽었다 — 아래 「NRV 줄뿐」이 알리바이가 된다").toContain("## Plan Iron-Rich Lunches");
    const GEN = /\$\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    const found = [...src.slice(a, b).replace(GEN, "").matchAll(/\b\d+(?:\.\d+)?\s?mg\b[^\n]{0,12}/g)].map((m) => m[0]);
    // NRV 줄(9–13·14–18세)만 손으로 남는다 — 4–8세 값은 NRV_IRON_4_8에서 생성한다
    expect(found).toEqual(["8mg per day", "15mg per day", "11mg per day"]);
  });

  it("🔴 예산 글: 스스로 철회한 손 수치와 틀린 기관 설명이 없다", () => {
    const body = B("budget-friendly-lunchbox-ideas-nz");
    for (const dead of [
      "Egg & Cheese Sandwich — **$1.55**", "(March 2026 Prices)", "| Eggs (12-pack, own brand) | per egg | $0.43",
      "1kg block: ~$11.50", "The equivalent in store-bought products would cost $35-$50",
      "**Ingredients (~$5.20 total):**", "run by the NZ government", "low-decile",
      "Most NZ schools now require water only", "Eggs are cheapest per gram protein",
    ]) expect(body, `되살아났다: ${dead}`).not.toContain(dead);
    // 계란 값은 가격지수에서 — 손으로 적은 43c가 실측의 절반이었다
    const eggs = (index as { items: PriceRow[] }).items.find((i) => i.name === "Eggs (12-pack)")?.paknsave;
    expect(typeof eggs, "지수에 Pak'nSave 계란이 없다 — 검산이 무의미하다").toBe("number");
    expect(body).toContain(`$${(eggs as number).toFixed(2)} a dozen`);
  });

  it("🔴 배치쿠킹 글: 메인만 잰 값을 도시락 전체와 비교하지 않는다", () => {
    const body = B("batch-cooking-save-money-nz");
    expect(body).not.toContain("**Cost per lunch: approximately $1.30-$1.50**");
    expect(body).not.toMatch(/\| Full batch cook \|/);
    expect(body).not.toContain("Saving from full batch cooking vs no prep");
    expect(body).not.toContain("~$5.00 for a dozen free-range");
  });

  it("🔴 개학 글: 주간 예산이 생성값이고, nut-aware 정의가 견과 글과 같다", () => {
    const body = B("back-to-school-lunchbox-prep-nz");
    expect(body).toContain(`| ${boxWeekLabel()} |`);
    expect(body).toContain(`| ${budgetWeekTotalLabel()} |`);
    expect(body).not.toContain("| Budget (batch cook, seasonal) | $8-$12 |");
    expect(body, "nut-aware를 「땅콩버터 금지」로 정의한다").not.toMatch(/nut-aware or nut-free\. This means no peanut butter/);
    expect(B("nut-free-school-lunches-new-zealand")).toContain("| **Nut-aware** | Nuts discouraged but not banned |");
  });

  it("🔴 견과 글: 표가 끊기지 않고, 라벨 규정·최저가 주장이 맞다", () => {
    const body = B("nut-free-school-lunches-new-zealand");
    const t = body.slice(body.indexOf("| Replacement | Protein per serve |"));
    const tbl = t.slice(0, t.indexOf("\n\n"));
    expect(tbl, "단백질 표가 문단에 끊겨 뒷줄이 머리글 없이 렌더된다").toContain("Cheddar/tasty cheese");
    expect(body).not.toContain("top 14 allergens");
    expect(body).not.toMatch(/either in the ingredients list \(bolded\) or in a "Contains:" statement/);
    expect(body).not.toContain("recommends that at least two staff");
    expect(body, "Anzac $0.15를 「가장 싸다」고 하는데 같은 글의 pikelet은 $0.08이다").not.toContain("the cheapest safe school snack");
  });

  it("🔴 랩·달걀 글: Pak'nSave 자체 브랜드는 Pams, Farrah's는 지수값", () => {
    for (const s of SLUGS) expect(B(s), `${s}: Pak'nSave Homebrand`).not.toMatch(/Pak'nSave(?:'s)? home ?brand/i);
    const wraps = B("easy-wraps-for-school-lunches-nz");
    const row = (index as { items: (PriceRow & { newworld?: number | null })[] }).items.find((i) => i.name === "Wraps 6-pack");
    expect(row?.newworld, "지수에 New World Farrah's가 없다").toBeTruthy();
    expect(wraps).toContain(`$${(row!.newworld as number).toFixed(2)} at New World`);
    expect(wraps).not.toContain("~$4.00 (New World)");
    expect(wraps, "Hummus & Veggie 랩에는 feta가 없다").not.toContain("skip the optional feta");
    expect(wraps).not.toContain("that the NZ Ministry of Health recommends for growing children");
    expect(wraps).not.toContain("avocados cheapest Feb-Apr");
  });
});

/**
 * 🔴 09-28 전수 감사 C — 글 10편(식품안전·알레르기·예산·영양·스낵·채식·글루텐·무조리·보온가방)을
 *    코드·데이터·외부 사실과 대조해 고쳤다. 가장 위험했던 두 부류를 여기서 지킨다:
 *    ① 플래너가 **하지 않는 일**을 한다고 적은 문장(계절 반영·보관 메모·예산 입력·Pak'nSave 가격)
 *    ② 식품안전 사실(껍질째 삶은 달걀을 「저위험」, 자른 멜론을 「위험하지 않다」, FSANZ 기준을 NZ 규칙으로)
 */
describe("🔴 09-28 전수 감사 C", () => {
  const P = (slug: string) => POSTS[slug].body;
  const G = (slug: string) => GUIDES[slug].body;
  const HEAT = "lunchbox-food-safety-nz-term-1-heat";
  const SAFETY = "lunchbox-food-safety-guide-nz";
  /** `### 제목` 한 절만 잘라 온다 — 본문 전체를 보면 다른 절의 달걀·멜론이 대신 걸린다. */
  const section = (body: string, heading: string) => {
    const i = body.indexOf(heading);
    expect(i, `"${heading}" 절을 못 찾았다 — 제목이 바뀌면 이 가드부터 고칠 것`).toBeGreaterThan(-1);
    const rest = body.slice(i + heading.length);
    const end = rest.search(/\n#{2,3} /);
    return end < 0 ? rest : rest.slice(0, end);
  };

  it("플래너가 날씨·계절을 본다고 말하지 않는다 — 실제로 그런 코드가 없다", () => {
    const gen = readFileSync(new URL("./planGenerator.ts", import.meta.url), "utf-8");
    // 양성 대조: 코드가 정말 계절을 안 본다. 이게 바뀌면 문장도 다시 검토할 것.
    expect(gen, "planGenerator가 계절·기온을 보기 시작했다 — 글을 다시 읽을 것").not.toMatch(/season|temperat|weather/i);
    const all = [...Object.values(POSTS), ...Object.values(GUIDES)].map((e) => e.body).join("\n");
    expect(all).not.toMatch(/factors heat-stability|hotter weeks lean|cooler weeks open up/i);
    expect(G(SAFETY), "보관 메모가 없는데 있다고 말한다").not.toMatch(/Every recipe includes storage notes/i);
    expect(P(HEAT)).toContain("has no temperature or season data");
  });

  it("삶은 달걀·자른 멜론을 저위험으로 분류하지 않는다", () => {
    const low = section(P(HEAT), "### Low risk");
    expect(low, "삶은 달걀이 저위험 목록으로 돌아왔다 — 익힌 달걀은 껍질째여도 냉장이다").not.toMatch(/egg/i);
    const medium = section(P(HEAT), "### Medium risk");
    expect(medium, "자른 멜론이 중간 위험으로 돌아왔다 — 리스테리아 위험, 냉장 필요").not.toMatch(/melon/i);
    expect(`${medium}\n${low}`).not.toMatch(/not dangerous/i);
    const high = section(P(HEAT), "### Highest risk");
    expect(high).toMatch(/hard-boiled eggs still in their shell/);
    expect(high).toMatch(/Cut melon/);
    // 가이드의 표도 같은 음식을 두 등급에 동시에 두지 않는다(통과일·크래커가 중간·저위험 둘 다에 있었다).
    const gMedium = section(G(SAFETY), "### Medium Risk");
    expect(gMedium).not.toMatch(/Whole fruit|Crackers/i);
    expect(section(G(SAFETY), "### Low Risk")).toMatch(/Whole, uncut fruit/);
  });

  it("규정·기관 이름이 사실과 맞는다", () => {
    // FSANZ의 식품안전 기준(3장)은 호주에만 적용된다. NZ는 Food Act 2014 · MPI.
    expect(P(HEAT)).not.toMatch(/both sides of the Tasman/i);
    // NZFSA는 2010년에 MPI로 합쳐졌다.
    expect(G(SAFETY)).not.toMatch(/New Zealand Food Safety Authority/);
    // 2시간/4시간 표는 FSANZ의 것이다 — NZ Food Safety의 규칙으로 적지 않는다.
    expect(G(SAFETY)).not.toMatch(/NZ Food Safety uses a time-based approach/);
    expect(P(HEAT)).not.toMatch(/\d+ doublings/);
    expect(G("allergy-management-school-lunchbox-nz")).not.toMatch(/Top 8 Allergens/i);
    // 계절: NZ 여름은 12~2월이다. 「여름 10~4월」「겨울 5~9월」로 돌아오지 않는다.
    expect(G(SAFETY)).not.toMatch(/Summer \(October|Winter \(May/);
    // PackIt 제조사는 냉동실 보관을 권한다.
    expect(P("insulated-lunch-bags-review-nz")).not.toMatch(/do NOT store them in the freezer/i);
  });

  it("글루텐 글의 「가장 좁은 필터」·「가장 많은 알레르겐」이 데이터와 맞는다", () => {
    const body = P("gluten-free-school-lunches-nz");
    expect(body, "간식도 걸러지는데 안 걸러진다고 말한다").not.toMatch(/not filtered by it/);
    const n = (f: (m: MenuItem) => boolean) => MENUS.filter(f).length;
    const gluten = n((m) => !!m.is_gluten_free);
    for (const [label, c] of [["nut", n((m) => !!m.is_nut_free)], ["dairy", n((m) => !!m.is_dairy_free)], ["egg", n((m) => !!m.is_egg_free)]] as const) {
      expect(gluten, `글루텐(${gluten})이 ${label}(${c})보다 좁지 않다 — 「네 알레르기 필터 중 가장 좁다」가 거짓`).toBeLessThan(c);
    }
    expect(n((m) => !!m.is_vegan), "비건이 글루텐보다 좁지 않다").toBeLessThan(gluten);
    expect(n((m) => !!m.is_thermos), "보온병이 글루텐보다 좁지 않다").toBeLessThan(gluten);
    const count = (a: "nuts" | "milk" | "egg" | "gluten" | "sesame") =>
      Object.keys(PRICES).filter((k) => declares(k, a)).length;
    const others = (["nuts", "milk", "egg", "sesame"] as const).map(count);
    expect(count("gluten"), "글루텐 선언이 가장 많지 않다").toBeGreaterThan(Math.max(...others));
    expect(count("milk"), "「milk is next」가 거짓").toBe(Math.max(...others));
    expect(body).toContain(`milk is next, at ${count("milk")}`);
  });

  it("무조리 글이 간식 목록을 「조리가 필요 없다」고 말하지 않는다", () => {
    const body = P("no-cook-lunchbox-ideas-nz");
    expect(body).not.toMatch(/nothing in the snack list needs cooking/i);
    // 양성 대조 — 실제로 조리가 필요한 간식이 풀에 있다.
    const pool = Object.values((menuData as unknown as { SNACK_DATA: Record<string, SnackItem[]> }).SNACK_DATA)
      .flat().map((s) => s.name);
    expect(pool).toContain("Boiled Egg");
    // 가격 비교를 하고 있으면서 「비교 안 했다」고 말하지 않는다.
    expect(body).not.toMatch(/No cost comparison/);
  });

  it("플래너가 없는 기능(예산 입력·Pak'nSave 가격)을 약속하지 않는다", () => {
    const all = [...Object.values(POSTS), ...Object.values(GUIDES)].map((e) => e.body).join("\n");
    expect(all, "가격 캐시는 Woolworths뿐이다").not.toMatch(/(estimated costs|price estimates) from Woolworths and Pak'nSave|Woolworths and Pak'nSave price estimates/);
    expect(G("healthy-snacks-guide-nz")).not.toMatch(/within your budget/);
    const budget = G("budget-lunchbox-planning-guide-nz");
    expect(budget, "플래너는 가중 셔플이다 — 제일 싼 통을 고르지 않는다").not.toMatch(/the one the planner uses/);
    expect(budget).not.toMatch(/Use this week's sale items/);
    const en = JSON.parse(readFileSync(new URL("../messages/en.json", import.meta.url), "utf-8")) as Record<string, string>;
    expect(budget, "특가 옵션 이름이 화면과 다르다").toContain(`"${en.sale_toggle_label}"`);
  });

  it("글이 말하는 순서·범위가 계산과 맞는다", () => {
    // 「비건은 가장 싼 선택이 아니다 — 채식보다 위」
    const { vegMedian, veganMedian } = SP_VEG;
    // 10-04 수집에서 둘이 같아졌다($1.82) — 「above」는 거짓, 「not the cheapest」는 참. 문장이 관계를 따라간다.
    const cents = (x: number) => Math.round(x * 100);
    expect(cents(veganMedian()), "비건 중앙값이 채식보다 낮아졌다 — 「not the cheapest」를 고칠 것").toBeGreaterThanOrEqual(cents(vegMedian()));
    const vegBody = G("vegetarian-vegan-school-lunch-guide-nz");
    expect(vegBody).toContain(
      cents(veganMedian()) > cents(vegMedian()) ? "above vegetarian, because" : "level with vegetarian rather than below it, because",
    );
    // 보온가방 글: 「닷새 도시락값이 매대 $10-$22 범위 안」
    const week = Number(boxWeekLabel().replace("$", ""));
    expect(week).toBeGreaterThanOrEqual(10);
    expect(week).toBeLessThanOrEqual(22);
    expect(P("insulated-lunch-bags-review-nz")).toContain(`five days is about ${boxWeekLabel()}`);
    // 알레르기 표: 95%를 두 번 다르게 말하지 않는다.
    const allergy = G("allergy-management-school-lunchbox-nz");
    expect(allergy).not.toMatch(/94% coverage/);
    // 조개류 행이 표 밖(문단 뒤)에 떨어져 머리글 없이 그려지지 않는다.
    const lines = allergy.split("\n");
    const i = lines.findIndex((l) => l.startsWith("| Shellfish"));
    expect(i).toBeGreaterThan(0);
    expect(lines[i - 1].startsWith("|"), "Shellfish 행이 표에서 떨어져 있다").toBe(true);
    // 채식 가이드: 측정하지 않는 단백질 수치·B12 강화가 확인 안 된 상표를 싣지 않는다.
    const veg = G("vegetarian-vegan-school-lunch-guide-nz");
    expect(veg).not.toMatch(/Protein: ~\d/);
    expect(veg).not.toMatch(/Weet-Bix/);
  });
});

describe("🔴 09-29 FAQ — 원가는 Woolworths 캐시에서만 나온다", () => {
  it("세 언어 FAQ 15번이 Pak'nSave 원가 추정을 말하지 않는다", () => {
    // 플래너 원가는 price_cache(Woolworths NZ)에서만 나온다. 「Woolworths 또는 Pak'nSave 예상 비용」이 세 언어에 있었다.
    for (const l of ["en", "ko", "zh"]) {
      const m = JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8"));
      expect(m.faq_a15, l).not.toMatch(/Pak'nSave/);
      expect(m.faq_a15, l).toMatch(/Woolworths/);
    }
  });

  it("세 언어 FAQ 20번이 「손으로 읽는다」고 말하지 않는다 — 세 열 모두 주간 자동 수집이다", () => {
    for (const l of ["en", "ko", "zh"]) {
      const m = JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8"));
      expect(m.faq_a20, l).not.toMatch(/read by hand|사람이 하나씩|人工查核/);
    }
  });
});

describe("🔴 09-29 데이터 정정 — 스파게티 건면 · 냉장 간식 · 규격 바뀐 행", () => {
  it("스파게티 고정 상품이 통조림이 아니라 건면 500g이다(볼로네제)", async () => {
    // 912755 「shortstrand 410g」은 통조림이었다 — 캐시 $0.33으로 볼로네제 원가와 GF 파스타 배수를 왜곡했다.
    const { PINNED_SKUS } = await import("./priceSearch.mjs");
    const pin = (PINNED_SKUS as unknown as Record<string, { name: string; size?: string }>).Spaghetti;
    expect(pin.name).not.toMatch(/shortstrand|tomato|sauce/i);
    expect(pin.name).toMatch(/pasta spaghetti/);
    expect(pin.size).toBe("500g");
    expect(readFileSync("lib/planConfig.ts", "utf8")).toContain('Spaghetti: { pack: "500g"');
  });

  it("식품안전 가이드의 「반드시 차갑게」 간식에 냉장 표시가 있고, 플래너가 그린다", async () => {
    // 가이드 High Risk 표: 유제품 · 달걀 · 햄 · 후무스 · 자른 과일(멜론·베리). 글은 「냉장 필요」인데 플래너는 안내 없이 배정했다.
    const guide = GUIDES["lunchbox-food-safety-guide-nz"].body;
    expect(guide).toMatch(/Cut fruit \(melon, berries\)/);
    const menu = (await import("@/data/menuData.json")).default as unknown as {
      SNACK_DATA: Record<string, { name: string; keepCold?: boolean }[]>;
    };
    const cold = Object.values(menu.SNACK_DATA).flat().filter((s) => s.keepCold).map((s) => s.name).sort();
    expect(cold).toEqual([
      "Blueberries", "Boiled Egg", "Cheese Cubes", "Cheese Stick", "Cottage Cheese", "Ham Roll-ups",
      "Hummus & Veg", "Probiotic Drink", "Rockmelon", "Strawberries", "Watermelon", "Yoghurt Pot",
    ]);
    const src = readFileSync("components/PlannerClient.tsx", "utf8");
    expect(src).toContain('t("planner_snack_keep_cold")');
    expect(src).toContain("s.keepCold");
    for (const l of ["en", "ko", "zh"]) {
      const m = JSON.parse(readFileSync(`messages/${l}.json`, "utf8"));
      expect(m.planner_snack_keep_cold, l).toBeTruthy();
    }
  });

  it("5월 라운드 뒤 규격이 바뀐 행(사과)은 5월↔지금 비교에서 빠진다", async () => {
    const { winnerRows, respecifiedSince } = await import("./priceIndexCompare");
    const raw = JSON.parse(readFileSync("data/priceIndex.json", "utf8")) as {
      history: { date: string }[]; items: { name: string; respec?: { on: string } }[];
    };
    const changed = raw.items.filter((i) => (i.respec?.on ?? "") > raw.history[0].date).map((i) => i.name);
    expect(changed, "양성 대조 — 5월 뒤 규격이 바뀐 행이 있어야 이 검사가 공허하지 않다").toContain("Apples (1kg)");
    const names = winnerRows().map((r) => r.name);
    for (const n of changed) expect(names, n).not.toContain(n);
    expect(respecifiedSince(["Apples (1kg)"])).toEqual(["Apples (1kg)"]);
  });
});

/**
 * 🔴 09-29 UI 문구 감사 — 글(#114)과 달리 messages·페이지 하드코딩 문구는 같은 강도로 본 적이 없었다.
 * 목록: ~/Downloads/kiwi_ui_copy_audit_0929.md. 여기는 그중 고친 것만 지킨다.
 */
describe("🔴 09-29 UI 문구 감사", () => {
  const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf-8");
  const LOCALES_UI = ["en", "ko", "zh"] as const;
  const msg = Object.fromEntries(LOCALES_UI.map((l) => [l, JSON.parse(read(`messages/${l}.json`)) as Record<string, string>]));
  const planner = read("components/PlannerClient.tsx");

  it("장보기 배지가 비교하는 source가 가격 캐시에 실제로 있다 — 없으면 전부 「Est.」가 된다", () => {
    const compared = [...planner.matchAll(/item\.source === "([^"]+)"/g)].map((m) => m[1]);
    expect(compared.length, "배지 비교를 못 찾았다 — 이 검사가 빈 검사가 됐다").toBeGreaterThan(0);
    const sources = new Set(
      Object.values(PRICES as unknown as Record<string, { data?: { source?: string } }>).map((v) => v.data?.source),
    );
    for (const s of compared) expect([...sources], `"${s}"는 캐시에 없는 source다`).toContain(s);
  });

  it("플래너 빈 화면 예시에 손으로 적은 금액·열량이 없다", () => {
    const i = planner.indexOf("planner_example_plan");
    const block = planner.slice(i, planner.indexOf("planner_example_shopping\")", i) + 2000);
    expect(i).toBeGreaterThan(-1);
    expect(block, "예시가 exampleWeek prop을 안 쓴다").toContain("exampleWeek.rows");
    expect(block.match(/\$\d+\.\d{2}/g) ?? [], "예시에 금액 리터럴").toEqual([]);
    expect(block, "예시에 열량 리터럴").not.toMatch(/\d+ kcal/);
    for (const l of LOCALES_UI) {
      expect(msg[l].planner_example_shopping_summary, `${l}: 품목 수가 리터럴이다`).toContain("{items}");
    }
  });

  it("기본값이 알레르기 안전하다거나 학교 정책에 맞춘다고 말하지 않는다 — 필터 0개가 기본이다", () => {
    for (const l of LOCALES_UI) {
      expect(msg[l].planner_allergy_safe, l).not.toMatch(/by default|기본 알레르기 안전|默认过敏安全/i);
      expect(msg[l].home_guide_rules_p2, l).not.toMatch(/align with these common policies|정책에 맞는 식단을 생성|生成的计划符合/);
    }
    // 양성 대조 — 기본 풀에 실제로 땅콩버터가 있어서 위 문구가 거짓이었던 것이다
    const names = (menuData as unknown as { MENU_DATA: { en: { name: string }[] } }).MENU_DATA.en.map((m) => m.name);
    expect(names).toContain("Peanut Butter Sandwich");
  });

  it("가격 정정을 영수증·매대 사진으로 대조한다고 말하지 않는다 — 가격은 온라인에서 읽는다", () => {
    for (const f of ["app/[locale]/price-index/page.tsx", "app/[locale]/policies/page.tsx"]) {
      const src = read(f);
      expect(src, f).not.toMatch(/shelf-tag photo|receipt scan/);
      expect(src, `${f}: 표에 없는 Notes 열`).not.toMatch(/&quot;Notes&quot;\s+column/);
    }
    expect(read("app/[locale]/guides/page.tsx")).not.toMatch(/monthly\{" "\}\s*<Link[^>]*price-index/);
  });

  it("About이 특가를 「할인 재료로 짠다」고 말하지 않는다 — 할인 후 원가로 순위를 매길 뿐이다", () => {
    const about = read("app/[locale]/about/page.tsx");
    expect(about).not.toMatch(/lean on those discounted|three flyers|Use this week&apos;s sales/);
    expect(about, "토글의 실제 이름을 쓴다").toContain(msg.en.sale_toggle_label.replace(/'/g, "&apos;"));
    expect(msg.en.planner_seo_intro).not.toMatch(/builds the week around/);
  });
});

/**
 * 🔴 09-29 UI 문구 감사 2차 (pages) — 페이지 .tsx에 하드코딩된 문구가 코드·데이터와 어긋난 곳.
 * 목록: ~/Downloads/kiwi_ui_copy_audit_0929.md 14·16·5·9·경미. 기대값은 되도록 **다른 파일**에서 뽑는다
 * (폼의 <option> 개수, export-pdf 라우트, menuData 조리법, 수집 워크플로, content/guides.ts).
 */
describe("🔴 09-29 UI 문구 감사 2차 (pages)", () => {
  const rd = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf-8");
  // 주석을 걷는다 — 고친 이유를 적은 주석이 옛 문구를 인용하므로, 안 걷으면 가드가 주석에 걸린다.
  const src = (f: string) =>
    rd(f).replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const flat = (s: string) => s.replace(/\s+/g, " ");
  const ent = (s: string) => s.replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
  const CONTACT = flat(src("app/[locale]/contact/page.tsx"));
  const POLICIES = flat(src("app/[locale]/policies/page.tsx"));
  const PLANNER_PAGE = flat(src("app/[locale]/planner/page.tsx"));
  const GUIDES_HUB = flat(src("app/[locale]/guides/page.tsx"));
  const EN = JSON.parse(rd("messages/en.json")) as Record<string, string>;
  const MENU_EN = (JSON.parse(rd("data/menuData.json")) as {
    MENU_DATA: { en: { name: string; category: string; instructions: string }[] };
  }).MENU_DATA.en;
  const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

  it("정책 페이지가 없는 「일수 설정」을 말하지 않는다 — 생성기는 늘 월~금이다", () => {
    const gen = rd("lib/planGenerator.ts");
    const days = gen.match(/const days = \[([^\]]+)\]/)?.[1].split(",").length;
    expect(days, "양성 대조 — 생성기의 요일 배열을 못 찾았다").toBe(5);
    expect(rd("components/PlannerClient.tsx"), "일수 입력이 생겼다면 이 가드를 다시 볼 것").not.toMatch(/numDays|dayCount|setDays\(/);
    expect(POLICIES).not.toMatch(/number of days/i);
  });

  it("정책 페이지가 메인 플래그의 근거를 약관·플래너 페이지와 같게 말한다 (손으로 본 재료 목록)", () => {
    expect(PLANNER_PAGE, "양성 대조 — 플래너 페이지의 근거 문장").toMatch(/ingredient list by hand/);
    expect(rd("lib/ingredientDiet.ts"), "양성 대조 — 메인은 라벨로 재계산하지 않는다").toMatch(/메인 메뉴의 플래그는 이 표로 다시 계산하지 않는다/);
    expect(POLICIES).not.toMatch(/Recipes are tagged from product labels/);
    expect(POLICIES).toMatch(/flagged by hand from its own ingredient list/);
  });

  it("문의 페이지가 말하는 선택지 수·이름이 폼(ContactForm.tsx)의 <option>과 같다", () => {
    const form = rd("app/[locale]/contact/ContactForm.tsx");
    const opts = [...form.matchAll(/<option>\{t\("(contact_subject_\w+)"\)\}<\/option>/g)].map((m) => m[1]);
    expect(opts.length, "양성 대조 — 폼 선택지를 못 읽었다").toBeGreaterThan(1);
    expect(CONTACT, "선택지 수를 폼에서 센 값과 다르게 적었다").toContain(`form has ${WORDS[opts.length]} options`);
    expect(CONTACT).not.toMatch(/five common categories/);
    const named = new Set([...CONTACT.matchAll(/t\("(contact_subject_\w+)"\)/g)].map((m) => m[1]));
    for (const k of named) expect(opts, `폼에 없는 선택지 ${k}`).toContain(k);
    for (const k of opts) expect([...named], `폼 선택지 ${k}를 페이지가 말하지 않는다`).toContain(k);
    // 폼에 없는 제목을 고르라고 하지 않는다 (「Licensing」은 폼이 아니라 메일 제목이라 대상이 아니다)
    expect(CONTACT).not.toMatch(/subject (?:"|&quot;)Privacy enquiry/);
  });

  it("개인정보 요청 기한을 법대로 적는다 — Privacy Act 2020 s44는 20 working days다", () => {
    expect(CONTACT).not.toMatch(/10 working days as required|up to 10 working days for privacy requests per/);
    expect(CONTACT).toMatch(/section 44/);
    expect(CONTACT).toMatch(/no later than 20 working days/);
  });

  it("문의 페이지의 응답 시한이 FAQ(faq_a27)와 같다", () => {
    const a27 = EN.faq_a27;
    const allergyH = a27.match(/within (\d+) hours for allergy/)?.[1];
    const other = a27.match(/within ([\w ]+?) for other corrections/)?.[1];
    expect(allergyH, "faq_a27에서 알레르기 시한을 못 읽었다 — 문구가 바뀌었으면 이 가드를 고칠 것").toBeTruthy();
    expect(other, "faq_a27에서 그 밖의 정정 시한을 못 읽었다").toBeTruthy();
    const allergyLines = [...CONTACT.matchAll(/Allergy-tagging errors[\s\S]{0,700}?<\/li>/g)].map((m) => m[0]);
    expect(allergyLines.length, "양성 대조 — 알레르기 항목을 못 찾았다").toBe(2);
    for (const l of allergyLines) {
      const hours = [...l.matchAll(/(\d+) hours/g)].map((m) => m[1]);
      expect(hours.length, l).toBeGreaterThan(0);
      for (const h of hours) expect(h, `알레르기 시한이 FAQ(${allergyH}시간)와 다르다`).toBe(allergyH);
    }
    const corr = [...CONTACT.matchAll(/Content corrections[\s\S]{0,700}?<\/li>/g)].map((m) => m[0]);
    expect(corr.length).toBe(2);
    for (const l of corr) expect(l).toContain(`within ${other}`);
  });

  it("문의 페이지가 「플랜 저장」을 약속하지 않는다 — 서버에 저장하는 것은 favorites뿐이다", () => {
    const code = ["components/PlannerClient.tsx", "app/[locale]/account/AccountClient.tsx"].map(rd).join("\n");
    const tables = new Set([...code.matchAll(/\.from\("(\w+)"\)/g)].map((m) => m[1]));
    expect([...tables], "양성 대조 — 저장 테이블이 favorites 하나가 아니게 됐다면 문구를 다시 볼 것").toEqual(["favorites"]);
    expect(CONTACT).not.toMatch(/save plans|saved plans/i);
  });

  it("문의 페이지가 없는 비밀번호 재설정 흐름을 안내하지 않는다", () => {
    const auth = ["components/AuthModal.tsx", "app/[locale]/account/AccountClient.tsx"].map(rd).join("\n");
    expect(auth, "양성 대조 — 로그인은 signInWithPassword로 한다").toMatch(/signInWithPassword/);
    if (!/resetPasswordForEmail/.test(auth)) expect(CONTACT).not.toMatch(/password-reset flow on the login page/);
  });

  it("플래너 페이지가 PDF에 없는 것을 PDF에 있다고 말하지 않는다", () => {
    const route = rd("app/api/plans/export-pdf/route.ts");
    expect(route, "양성 대조 — PDF에 재료가 들어간다").toMatch(/"Ingredients: "/);
    expect(PLANNER_PAGE).not.toMatch(/download the whole thing as a PDF/);
    if (!/instructions/.test(route)) {
      expect(PLANNER_PAGE, "PDF에 조리법이 없는데 안 밝혔다").toMatch(/methods stay on screen/);
    }
  });

  it("플래너 예시 주간의 메뉴명·분류·조리법 인용이 menuData와 같다", () => {
    const table = PLANNER_PAGE.slice(PLANNER_PAGE.indexOf("What a generated week actually looks like"));
    const rows = [...table.slice(0, table.indexOf("</table>")).matchAll(
      /<td className="px-4 py-3">([^<]+)<\/td> <td className="px-4 py-3 text-gray-500">([^<]+)<\/td>/g,
    )].map((m) => [ent(m[1].trim()), m[2].trim()]);
    expect(rows.length, "양성 대조 — 예시 표를 못 읽었다").toBe(5);
    for (const [name, cat] of rows) {
      const m = MENU_EN.find((x) => x.name === name);
      expect(m, `예시의 "${name}"은 menuData에 없는 이름이다`).toBeTruthy();
      expect(m?.category, name).toBe(cat);
    }
    const wrap = MENU_EN.find((x) => x.name === "Chicken Wrap")!.instructions;
    expect(PLANNER_PAGE).not.toMatch(/keep the mayo cold/);
    for (const q of ["4cm", "baking paper"]) {
      expect(PLANNER_PAGE).toContain(q);
      expect(wrap, `조리법에 "${q}"가 없다`).toContain(q);
    }
    expect(PLANNER_PAGE, "나이·학년 입력이 없다").not.toMatch(/for a Year \d+ child/);
  });

  it("플래너 메타 설명·사이트 JSON-LD·가격지수 CTA가 없는 예산 설정·Pak'nSave 가격을 말하지 않는다", () => {
    const sources = new Set(
      Object.values(JSON.parse(rd("data/price_cache.json")) as Record<string, { data?: { source?: string } }>)
        .map((v) => v.data?.source ?? ""),
    );
    expect([...sources].some((s) => /pak/i.test(s)), "양성 대조 — 캐시에 Pak'nSave가 생겼으면 다시 볼 것").toBe(false);
    expect(src("app/[locale]/planner/layout.tsx")).not.toMatch(/Pak'nSave prices/);
    expect(src("app/[locale]/layout.tsx"), "모든 페이지의 Organization JSON-LD").not.toMatch(/Pak'nSave prices/);
    expect(flat(src("app/[locale]/price-index/page.tsx")), "가격지수 CTA").not.toMatch(/planner uses real Woolworths and Pak|Use these prices in your meal plan/);
    expect(PLANNER_PAGE).not.toMatch(/예산을 설정|和预算/);
  });

  it("홈 배너·About이 가격지수를 두 열로 말하지 않는다 — 수집기는 New World 열까지 매주 읽는다", () => {
    // 10-26부터 수집은 로컬 수집기 하나다(Actions는 감시만).
    const wf = rd("scripts/collect_prices_local.sh");
    expect(wf, "양성 대조 — New World 열 수집 단계").toMatch(/update_newworld_prices\.mjs --write/);
    const idx = JSON.parse(rd("data/priceIndex.json")) as { items: { newworld?: number | null }[] };
    expect(idx.items.some((i) => typeof i.newworld === "number"), "양성 대조 — New World 값").toBe(true);
    const home = flat(src("app/[locale]/page.tsx"));
    const banner = home.slice(home.indexOf("NZ Lunchbox Price Index</h3>"), home.indexOf("NZ Lunchbox Price Index</h3>") + 900);
    expect(banner).not.toMatch(/at both Woolworths and Pak/);
    expect(banner).toMatch(/New World/);
    const about = flat(src("app/[locale]/about/page.tsx"));
    expect(about).not.toMatch(/both columns are read weekly/);
    expect(about).toMatch(/New World columns are all read weekly/);
  });

  it("홈 SearchAction이 q를 실제로 읽는 경로를 가리킨다", () => {
    const home = src("app/[locale]/page.tsx");
    const seg = home.match(/target: `\$\{BASE_URL\}\/\$\{locale\}\/(\w+)\?q=\{search_term_string\}`/)?.[1];
    expect(seg, "SearchAction target을 못 찾았다").toBeTruthy();
    const page = rd(`app/[locale]/${seg}/page.tsx`);
    expect(page, `/${seg}는 q를 안 읽는다`).toMatch(/searchParams[\s\S]{0,200}\bq\b/);
  });

  it("가이드 허브가 가이드 본문에 없는 주제를 말하지 않는다", () => {
    const body = rd("content/guides.ts");
    expect(GUIDES_HUB, "양성 대조 — 둘 다 말하는 주제").toMatch(/Ka Ora, Ka Ako|Ka Ora, Ka Ako/);
    expect(body).toMatch(/Ka Ora, Ka Ako/);
    for (const term of ["Dunedin", "Christchurch", "Healthy Heart Award", "Green/Amber/Red", "dishwasher", "400mg"]) {
      if (GUIDES_HUB.includes(term)) expect(body, `허브가 「${term}」을 말하는데 가이드 본문엔 없다`).toContain(term);
    }
    const hf = GUIDES_HUB.match(/<strong>Heart Foundation NZ<\/strong>([\s\S]*?)<\/li>/)?.[1] ?? "";
    expect(hf, "양성 대조 — Heart Foundation 항목").not.toBe("");
    expect(hf, "5+ A Day는 Heart Foundation 캠페인이 아니다 — 가이드 본문도 Charitable Trust라 쓴다").not.toMatch(/5\+ A Day/);
    expect(body).toMatch(/5\+ A Day Charitable Trust/);
  });
});

/**
 * 🔴 09-29 UI 문구 감사 2차 — `messages/*.json`만.
 *
 * 감사 목록(`kiwi_ui_copy_audit_0929.md`) 5(나머지)·8~13·15·17·18·경미·불확실.
 * 공통 원인: UI 문자열은 글·가이드만큼 코드와 대조된 적이 없었고, ko/zh는 en을 고쳐도 따로 남았다.
 * 그래서 가드마다 **세 로케일을 다 보고**, 가능한 곳은 문구가 기대는 코드 사실도 같이 본다
 * (문구만 막으면 코드가 바뀌어 새 문구가 거짓이 돼도 초록이다).
 */
describe("🔴 09-29 UI 문구 감사 2차 (messages)", () => {
  const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf-8");
  const LOCALES2 = ["en", "ko", "zh"] as const;
  const m2 = Object.fromEntries(LOCALES2.map((l) => [l, JSON.parse(read(`messages/${l}.json`)) as Record<string, string>])) as Record<(typeof LOCALES2)[number], Record<string, string>>;
  type Menu = { name: string; ingredients: string[]; is_gluten_free?: boolean };
  const MENUS = (menuData as unknown as { MENU_DATA: { en: Menu[] } }).MENU_DATA.en;
  const SNACKS = (menuData as unknown as { SNACK_DATA: Record<string, { name: string; ingredients?: string[] }[]> }).SNACK_DATA;
  const MENU_INGREDIENTS = new Set(MENUS.flatMap((m) => m.ingredients));

  it("5 · 계정·FAQ가 식단 계획을 서버에 저장한다고 말하지 않는다 — 코드가 쓰는 테이블은 favorites뿐", () => {
    for (const l of LOCALES2) {
      for (const k of ["account_subtitle", "account_welcome_desc", "faq_a28"]) {
        expect(m2[l][k], `${l}:${k}`).not.toMatch(/saved (meal )?plans|meal plans permanently|저장된 (식단 )?계획|식단 계획을 영구|保存的(膳食)?计划|永久保存/);
      }
    }
    // 양성 대조 + 사실 확인 — 코드 전체에서 supabase `.from("…")`이 favorites 하나뿐이다
    const files: string[] = [];
    const walk = (d: string) => {
      for (const e of readdirSync(new URL(`../${d}`, import.meta.url), { withFileTypes: true })) {
        const p = `${d}/${e.name}`;
        if (e.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(e.name) && !/\.test\.ts$/.test(e.name)) files.push(p);
      }
    };
    ["app", "components", "lib"].forEach(walk);
    const tables = new Set(files.flatMap((f) => [...read(f).matchAll(/\.from\(\s*"([a-z_]+)"\s*\)/g)].map((x) => x[1])));
    expect([...tables], "새 테이블이 생겼다 — 계정 문구가 무엇을 저장한다고 말할지 다시 볼 것").toEqual(["favorites"]);
  });

  it("5 · faq_a28의 쿠키 설명이 개인정보 방침과 같은 도구를 말한다 — GA를 빼고 「필수+AdSense만」이라 하지 않는다", () => {
    for (const l of LOCALES2) {
      // 양성 대조 — 방침이 GA를 말하고 있어야 이 비교가 의미 있다
      expect(m2[l].privacy_4_p, `${l}: privacy_4_p`).toMatch(/Google Analytics/);
      expect(m2[l].faq_a28, `${l}: faq_a28`).toMatch(/Google Analytics/);
      expect(m2[l].faq_a28, `${l}: faq_a28`).not.toMatch(/cookies only for essential|필수 기능\([^)]*\)과 광고\(Google AdSense\)에만|仅将Cookie用于/);
    }
    // 「동의해야 GA가 로드된다」는 문구의 근거
    expect(read("components/ConsentScripts.tsx")).toMatch(/if \(!consented \|\| !GA_ID\) return null/);
  });

  it("8 · 가격 필터가 없는데 「싼 메인으로 거르면」이라 말하지 않는다 — $3 미만은 약 다섯 중 하나(파생값)", () => {
    const phrase = { en: /one in five/, ko: /다섯 개 중 하나꼴/, zh: /五分之一/ } as const;
    for (const l of LOCALES2) {
      const v = m2[l].home_usecase3_desc;
      expect(v, l).not.toMatch(/filter for the cheaper|저렴한 메인으로 고르면|选择较便宜的主食/);
      expect(v, `${l}: 「다섯 중 하나」 표현이 빠졌다 — 아래 비율 검사가 빈 검사가 된다`).toMatch(phrase[l]);
    }
    const ratio = SP_VEG.boxUnderCount(3) / MENUS.length;
    expect(ratio, `$3 미만 ${SP_VEG.boxUnderCount(3)}/${MENUS.length} — 「about one in five」가 더는 맞지 않는다`).toBeGreaterThanOrEqual(0.15);
    expect(ratio).toBeLessThan(0.25);
  });

  it("9 · PDF에 없는 조리법·품목 가격을 담는다고 말하지 않는다", () => {
    const route = read("app/api/plans/export-pdf/route.ts");
    expect(route, "PDF가 조리법을 싣기 시작했다 — faq_a8·a26을 다시 볼 것").not.toMatch(/instructions/);
    expect(route, "장보기 줄이 품목 이름만 찍는다는 전제").toContain("`• ${ing}`");
    for (const l of LOCALES2) {
      expect(m2[l].faq_a26, `${l}: faq_a26`).not.toMatch(/all recipes|모든 레시피|所有食谱/);
      expect(m2[l].faq_a8, `${l}: faq_a8`).not.toMatch(/with estimated prices|예상 가격이 포함된|附带估算价格/);
    }
  });

  it("10 · 영양 문구 — 출처 없는 DB·칼로리 범위·「다섯」 식품군·보건부 귀속·「기준」 제목", () => {
    expect(read("lib/nutritionCalc.ts"), "계산기에 출처가 생겼다면 faq_a25를 그 출처로 고칠 것").not.toMatch(/Food Composition|FOODfiles|Plant & Food/i);
    for (const l of LOCALES2) {
      const m = m2[l];
      expect(m.faq_a25, `${l}: faq_a25`).not.toMatch(/Plant & Food|primarily the New Zealand Food Composition/);
      expect(m.faq_a24, `${l}: faq_a24 칼로리 범위`).not.toMatch(/\d{3}\s*[-–~]\s*\d{3}/);
      expect(m.faq_a23, `${l}: faq_a23`).not.toMatch(/five food groups|5가지 식품군|五大/);
      expect(m.faq_a23, `${l}: faq_a23`).toMatch(/four food groups|4가지 식품군|四大/);
      for (const k of ["home_guide_nutrition_p1", "home_guide_nutrition_p2"]) {
        expect(m[k], `${l}:${k}`).not.toMatch(/Ministry of Health recommends|보건부는[^.]*권장합니다|卫生部建议/);
        expect(m[k], `${l}:${k}`).not.toMatch(/comes from published NZ sources|공개된 뉴질랜드 자료에서 온|来自公开的新西兰资料/);
      }
      expect(m.home_feat_nutrition_title, `${l}: 제목이 설명을 부정한다`).not.toMatch(/Standards|영양 기준|营养标准/);
    }
  });

  it("11 · faq_a19가 「인증 귀리」 예외를 두지 않는다 — 그리고 GF 표시 메뉴에 귀리·글루텐 선언 재료가 없다", async () => {
    const rule = { en: /containing oats cannot be labelled gluten-free/, ko: /귀리가 들어간 식품은 글루텐프리로 표시할 수 없습니다/, zh: /含燕麦的食品不能标注为无麸质/ } as const;
    for (const l of LOCALES2) {
      expect(m2[l].faq_a19, l).not.toMatch(/unless specified as certified|인증된 글루텐프리로 명시된 경우 제외|除非标注为认证无麸质/);
      expect(m2[l].faq_a19, l).toMatch(rule[l]);
    }
    // 문구 「wheat, barley, rye or oats가 든 레시피는 GF로 표시하지 않는다」의 근거
    const { dietTagsFor } = await import("./ingredientDiet");
    const OATS = /\boats?\b|muesli/i;
    expect(MENUS.some((m) => !m.is_gluten_free && m.ingredients.some((i) => OATS.test(i))), "양성 대조: 귀리 메뉴를 못 찾았다").toBe(true);
    const gf = MENUS.filter((m) => m.is_gluten_free);
    expect(gf.length).toBeGreaterThan(0);
    for (const m of gf) {
      expect(m.ingredients.filter((i) => OATS.test(i)), `${m.name}: GF 표시인데 귀리`).toEqual([]);
      expect(m.ingredients.filter((i) => dietTagsFor(i)?.has("gluten")), `${m.name}: GF 표시인데 글루텐 선언 재료`).toEqual([]);
    }
  });

  it("12 · 제외 재료 예시가 목록에 실제로 있는 이름이고, 「정확 일치」 설명이 코드와 같다", () => {
    for (const l of LOCALES2) {
      const v = m2[l].home_tips_allergy_p;
      expect(v, l).not.toMatch(/beetroot|비트|甜菜|never appear|절대 나타나지/i);
      for (const name of ["Capsicum", "Avocado", "Tuna/Chicken/Avocado"]) {
        expect(v, `${l}: 예시 ${name}`).toContain(name);
        expect(MENU_INGREDIENTS.has(name), `${name}이 제외 목록(메뉴 재료)에 없다`).toBe(true);
      }
    }
    // 「이름이 정확히 같을 때만 빠진다」 — 부분 일치로 바뀌면 이 설명과 Avocado 예시가 거짓이 된다
    expect(read("lib/planGenerator.ts")).toContain("excluded.some((ex) => menu.ingredients.includes(ex))");
    expect(read("lib/ingredientDiet.ts")).toContain("excluded.some((ex) => ings.includes(ex))");
  });

  it("13 · 가격을 실시간으로 부른다고 말하지 않는다 — 모든 재료가 주간 캐시에 있다", () => {
    for (const l of LOCALES2) {
      // ko/zh faq_a29는 「실시간으로 불러오지 않습니다」처럼 부정문으로 이 낱말을 쓴다 — 호출한다는 주장만 막는다
      expect(m2[l].faq_a29, `${l}:faq_a29`).not.toMatch(/real-?time|실시간으로 호출|实时调用/i);
      expect(m2[l].planner_seo_price_h, `${l}:planner_seo_price_h`).not.toMatch(/real-?time|실시간|实时/i);
    }
    // `fetchIngredientPrice`는 캐시에 없는 재료만 Woolworths를 직접 부른다. 전부 캐시에 있어야
    // 「라이브로 안 부른다」가 참이다.
    const cache = PRICES as unknown as Record<string, unknown>;
    const lower = new Set(Object.keys(cache).map((k) => k.toLowerCase()));
    const all = new Set([...MENU_INGREDIENTS, ...Object.values(SNACKS).flat().flatMap((s) => s.ingredients ?? [])]);
    expect(all.size).toBeGreaterThan(100);
    expect([...all].filter((i) => !(i in cache) && !lower.has(i.toLowerCase())), "캐시에 없는 재료 — 이건 라이브 조회로 간다").toEqual([]);
  });

  it("15 · 학기 — 2학기는 4월에 시작하고 학년은 2월 초에 시작한다", () => {
    for (const l of LOCALES2) {
      expect(m2[l].home_guide_term2, l).not.toMatch(/May|5-7월|5-7月/);
      expect(m2[l].home_guide_term2, l).toMatch(/Apr-Jul|4-7월|4-7月/);
      expect(m2[l].home_guide_seasonal_p1, l).not.toMatch(/late January|1월 말|1月底/);
    }
  });

  it("17 · 코드에 없는 기능의 출시를 약속하지 않는다", () => {
    for (const l of LOCALES2) {
      expect(m2[l].faq_a16, l).not.toMatch(/later in 2026|expect to launch|2026년 후반|출시할 예정|2026年晚些|预计.*推出/);
      expect(m2[l].faq_a16, `${l}: 레시피 수는 자리표시자다`).toContain("{menuCount}");
    }
    // 09-29: 하루 교체가 생겼다 — 이제 반대로, 답이 **그 버튼을 이름으로** 말하고
    //        화면이 그 버튼을 실제로 그리는지 본다. 버튼을 지우면 답이 거짓이 된다.
    const planner = read("components/PlannerClient.tsx");
    expect(planner, "하루 교체 버튼이 사라졌다 — faq_a16을 다시 쓸 것").toContain('t("planner_swap_day")');
    expect(planner, "하루 교체 요청이 사라졌다").toContain('mode: "swap"');
    for (const l of LOCALES2) {
      expect(m2[l].planner_swap_day, `${l}: 버튼 문구 없음`).toBeTruthy();
      expect(m2[l].faq_a16, `${l}: 답이 버튼 이름을 안 말한다`).toContain(m2[l].planner_swap_day);
      expect(m2[l].faq_a16, `${l}: 「하루만 바꿀 수 없다」가 남아 있다`)
        .not.toMatch(/no option to swap|하루씩 바꿀 수는 없|교체하는 기능은 없|没有单独替换|不能逐餐/);
    }
  });

  it("18 · 가격 근거는 「평균가」가 아니라 고정 상품 정상가이고 주 1회 갱신된다", () => {
    for (const l of LOCALES2) {
      expect(m2[l].disclaimer_3_li2, l).not.toMatch(/average|평균|平均/i);
      expect(m2[l].faq_a5, l).not.toMatch(/periodically|정기적으로|定期/);
      for (const k of ["disclaimer_3_li2", "faq_a5"]) expect(m2[l][k], `${l}:${k}`).toMatch(/weekly|매주|每周/);
    }
  });

  it("경미 · 「the the」 없음 · 가격지수는 세 체인 · 간식은 하루 두 개", () => {
    const doubled = Object.entries(m2.en).filter(([, v]) => /\bthe the\b/i.test(v)).map(([k]) => k);
    expect(doubled).toEqual([]);
    for (const l of LOCALES2) {
      expect(m2[l].planner_seo_price_p, l).not.toMatch(/two columns|두 열|两列/);
      expect(m2[l].planner_seo_price_p, l).toContain("New World");
      expect(m2[l].faq_a15, l).not.toMatch(/a suggested snack|추천 간식|推荐零食/);
      expect(m2[l].faq_a15, l).toMatch(/two snacks|간식 최대 두 개|两份零食/);
    }
    const gen = read("lib/planGenerator.ts");
    expect(gen.split("snacks.push(randomChoice(").length - 1, "하루 간식 칸 수가 바뀌었다").toBe(2);
    // 가격지수에 New World 열이 실제로 있다
    expect((index as unknown as { items: Record<string, unknown>[] }).items.some((i) => "newworld" in i)).toBe(true);
  });

  it("불확실 · 「모든 간식을 라벨과 대조」하지 않는다 — 라벨 없는 간식이 실제로 있다", () => {
    for (const l of LOCALES2) {
      expect(m2[l].faq_a9, l).not.toMatch(/every snack is checked|했고, 간식은 추적|每一份零食也都/);
      expect(m2[l].faq_a3, l).not.toMatch(/, snacks on the allergen|, 간식은 저희가 추적하는|，零食依据/);
    }
    const planned = [...(SNACKS["Fruit & Veg"] ?? []), ...(SNACKS["Protein & Dairy"] ?? []), ...(SNACKS["Savoury Crunch"] ?? [])];
    const unlabelled = planned.filter((s) => (s.ingredients ?? []).some((i) => labelFor(i) === null));
    expect(unlabelled.length, "라벨 없는 간식이 0이면 「손으로 표시한다」는 문구를 다시 볼 것").toBeGreaterThan(0);
  });
});

/**
 * 🔴 10-02 전단을 「내가 읽는다」고 말하지 않는다 — 실제로는 옮겨 적고(transcribed) 가격을 바꾸는 특가만
 * 상품 페이지에서 확인한다. 「AI」라는 말은 쓰지 않는다(위 「AI라고 말하지 않는다」 방침 — 사용자 결정 10-02).
 */
describe("🔴 10-02 전단 처리 방식을 사실대로", () => {
  const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf-8");
  const OLD = /I read the (Woolworths and New World )?mailers|I check the Woolworths and New World mailers|read the Woolworths and New World mailers each Monday|전단을 읽어|我每周一阅读/;
  it("본문·About·FAQ(세 언어)에 「내가 전단을 읽는다」가 없다", () => {
    for (const f of ["content/posts.ts", "content/guides.ts", "app/[locale]/about/page.tsx", "messages/en.json", "messages/ko.json", "messages/zh.json"]) {
      expect(read(f), f).not.toMatch(OLD);
    }
  });
  it("양성 대조 — 새 표현이 실제로 들어가 있다", () => {
    expect(read("content/posts.ts")).toMatch(/mailers are transcribed/);
    expect(read("messages/ko.json")).toMatch(/전단을 옮겨 적어/);
  });
});
