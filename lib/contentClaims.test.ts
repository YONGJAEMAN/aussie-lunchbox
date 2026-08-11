import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { GUIDES } from "@/content/guides";
import menuData from "@/data/menuData.json";
import PRICES from "@/data/price_cache.json";
import { POSTS } from "@/content/posts";
import { servingFactor } from "./planGenerator";
import type { PriceInfo } from "./types";
import type { MenuItem, SnackData, SnackItem } from "./types";

/**
 * 본문에 써 넣은 주장이 앱이 실제로 계산하는 값과 어긋나면 실패한다.
 *
 * 2026-08-06: 글 두 편이 "packed lunch는 하루 $3~5"이라고 쓰고 있는데,
 * 정작 플래너는 분량표 단위 착오 때문에 **중앙값 $5.88, 최대 $11.68**을 계산하고
 * 있었다. 사이트가 자기 글과 어긋난 숫자를 보여주고 있었다는 뜻이다.
 * 분량표를 고친 뒤 중앙값 $3.49가 되어 본문과 맞는다.
 *
 * ⚠️ 가격은 AU 캐시(data/price_cache.json)만 쓴다. NZ 값을 가져오지 않는다.
 *    가격이 갱신되면 이 테스트가 먼저 어긋난다 — 그때 고칠 것은 **본문**이지
 *    밴드가 아니다.
 */
const MENUS = (menuData as { MENU_DATA: { en: MenuItem[] } }).MENU_DATA.en;
const SNACKS = (menuData as unknown as { SNACK_DATA: SnackData }).SNACK_DATA;

// ⚠️ 계산은 앱과 **같은 함수**를 쓴다. 여기서 따로 곱하면 단위 규약이 갈라져
//    테스트만 통과하고 화면은 틀리는 상태가 된다.
const infoFor = (ing: string) =>
  (PRICES as Record<string, { data?: PriceInfo }>)[ing]?.data;
const per = (ing: string) => {
  const info = infoFor(ing);
  return (info?.price ?? 0) * servingFactor(ing, info);
};
const cost = (ings: string[]) => ings.reduce((t, i) => t + per(i), 0);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * 플래너의 실제 구성과 같아야 한다 (planGenerator):
 *   1통 = 메뉴 재료 + Fruit&Veg 간식 1개 + (Protein&Dairy ∪ Savoury Crunch) 간식 1개
 * 간식은 무작위로 뽑히므로 대표값으로 **각 풀의 중앙값**을 쓴다.
 */
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

describe("🔴 사이트 문구가 실제 구현·About과 어긋나지 않는다", () => {
  // 2026-08-10: Kiwi에서 같은 종류의 자기모순을 고친 뒤 Aussie를 대조했더니
  // 그대로 남아 있었다. **같은 자리가 둘이면 하나만 고치게 된다.**
  //
  // Aussie에서 실제로 거짓이던 것:
  //   - FAQ가 "team member 시식 + editorial review"라 했지만
  //     About은 "This is a solo project. There's no team"이라고 명시한다
  //   - "매월 3~5개 신규 레시피" — menuData는 두 번 바뀌었다(3월 43 -> 6월 63)
  //   - "Woolworths와 **Coles** 가격을 갱신" — **Coles는 코드에 존재하지 않는다.**
  //     문구에만 있고 데이터도 계산도 없다
  //   - "AI-powered" — 생성기에 LLM 호출이 없다
  //   - 계정 혜택 "Save Weekly Plans" — 쓰는 테이블은 favorites 하나뿐
  //
  // ⚠️ 반대로 **"Sign in with Google"은 참이다** — Aussie엔 signInWithOAuth가 있다.
  //    Kiwi 기준으로 일괄 수정했다면 맞는 문장을 지울 뻔했다. 사이트마다 확인할 것.
  const src = (rel: string) => readFileSync(new URL("../" + rel, import.meta.url), "utf-8");
  const LOCALES = ["en", "ko", "zh"] as const;
  const messages = Object.fromEntries(
    LOCALES.map((l) => [
      l,
      JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf-8")) as Record<string, string>,
    ]),
  );

  /**
   * ⚠️ 금지어 가드는 **정직한 부인문까지 막는다** — 이 저장소에서 Coles·실시간
   *    두 번 겪었다. 팀도 마찬가지다: ko "편집팀도 없습니다", zh "没有编辑团队",
   *    en "not a support team"은 우리가 **반드시 해야 하는 말**이지 잡을 말이 아니다.
   *    그래서 문장 단위로 자르고 부정 표지가 든 문장은 빼고 본다.
   */
  const DENIAL = /없습니다|없다|아닙니다|没有|不是|\bno (team|editorial team|test kitchen)\b|\bnot a (company|team|support team)\b/i;
  const assertiveText = (l: string) =>
    Object.values(messages[l])
      .filter((v) => typeof v === "string")
      .join("\n")
      .split(/(?<=[.!?。！？])\s+|\n+|—|--/)
      .filter((sentence) => !DENIAL.test(sentence))
      .join("\n");

  it("1인 프로젝트인데 팀·편집 검수를 말하지 않는다", () => {
    const about = src("app/[locale]/about/page.tsx");
    expect(about, "About이 solo project라고 말하는지").toMatch(/solo project/i);
    for (const l of LOCALES) {
      // 🔴 2026-08-11: 여기 패턴이 /team member|editorial review|팀원|编辑审核/ 였다.
      //    Kiwi에서 같은 좁은 패턴이 ko "편집팀"·zh "团队"·"试做"를 통과시켜,
      //    **ko/zh 블로그 글 전부가 가상의 "편집팀" 명의로 나가고 있었다.**
      //    Aussie는 지금 깨끗하지만 가드에 같은 구멍이 있었다 — 미리 막는다.
      expect(assertiveText(l), `${l}: 팀 주장`).not.toMatch(
        /\bour team\b|\ba team member\b|\bteam of parents\b|editorial review|팀원|편집팀|우리 팀|편집 검토|편집 검수|团队|编辑审核|试做|시험 조리/i,
      );
    }
  });

  it("블로그 작성자 표기가 사람 이름이다 (가상의 편집팀이 아니다)", () => {
    // 🔴 Kiwi에서 `blog_post_editorial_team`이 en만 "Yong Jae Lee"였고 ko/zh는
    //    "키위 런치박스 편집팀"·"编辑团队"였다. 글 전체의 저자 표기라 파급이 컸다.
    for (const l of LOCALES) {
      const byline = messages[l].blog_post_editorial_team;
      if (byline === undefined) continue;
      expect(byline, `${l}: 작성자 표기에 '팀'이 들어간다`).not.toMatch(/team|팀|团队/i);
    }
  });

  it("AI라고 말하지 않는다 (생성기에 LLM 호출이 없다)", () => {
    const gen = src("lib/planGenerator.ts");
    expect(gen).not.toMatch(/openai|anthropic|\bllm\b/i);
    for (const l of LOCALES) {
      // ⚠️ 처음엔 /AI[- ]powered|our AI/ 로만 봤다가 "Let **the AI** Do the Work"를
      //    놓쳤다. 좁은 패턴은 알리바이가 된다 — AI라는 단어 자체를 본다.
      expect(JSON.stringify(messages[l]), `${l}: AI 주장`).not.toMatch(/\bAI\b|AI 기반|AI ?驱动/i);
    }
  });

  it("가격을 실시간이라고 말하지 않는다 (주 1회 캐시다)", () => {
    // lib/supermarketApi.ts는 빌드 시 로드한 주간 캐시를 먼저 본다.
    expect(src("lib/supermarketApi.ts")).toMatch(/Weekly price cache/i);
    // UI 배지도 마찬가지 — 캐시값에 "Live"를 붙이고 있었다.
    expect(src("components/PlannerClient.tsx")).not.toMatch(/\? "Live" :/);
    for (const l of LOCALES) {
      const all = JSON.stringify(messages[l]);
      // 부정문("실시간이 아니라")은 걸리면 안 되므로 **주장 형태**만 본다.
      expect(all, `${l}: 실시간 주장`).not.toMatch(
        /(live|real-?time)[ -](Woolworths |supermarket |Australian supermarket )?pric|실시간 (가격|조회)를|实时(查询|价格)的/i,
      );
    }
  });

  it("확인할 수 없는 이용자 증언을 싣지 않는다", () => {
    for (const l of LOCALES) {
      const all = JSON.stringify(messages[l]);
      expect(all, `${l}: 증언 주장`).not.toMatch(
        /(families|parents) tell us|typically s(ave|pend)|대부분의 가정(은|이)|大多数家庭每/i,
      );
    }
  });

  it("메시지 파일에 깨진 문자가 없다", () => {
    // 2026-08-10: ko.json 3건이 U+FFFD로 깨져 있었다("글루텐"→"��루텐").
    for (const l of LOCALES) {
      const bad = Object.entries(messages[l]).filter(([, v]) => String(v).includes("\uFFFD"));
      expect(bad.map(([k]) => k), `${l}: 깨진 문자`).toEqual([]);
    }
  });

  /**
   * 🔴 2026-08-11: 아래 Coles 가드는 `messages[l].faq_a30`과 `planner_seo_intro`
   *    **두 키만** 봤다. 그래서 정작 거짓 주장이 있던 자리를 통째로 놓쳤다 —
   *    번역파일은 Coles에 대해 정직했고(전부 "추적하지 않습니다"), 거짓은
   *    **페이지 metadata**에 있었다:
   *      app/[locale]/layout.tsx  "price estimates from Woolworths & Coles" (en·ko)
   *      app/[locale]/layout.tsx  Organization JSON-LD "with Woolworths & Coles prices"
   *      app/[locale]/planner/layout.tsx  "shopping list with Woolworths & Coles prices"
   *      app/[locale]/about/page.tsx  "checked for ingredient availability at ... Coles"
   *    metadata는 검색결과·공유카드에 그대로 나가는 자리라 오히려 더 많이 읽힌다.
   *    **"이 키"가 아니라 "이 주장"을 단위로 저장소 전체를 훑는다.**
   */
  const repoFiles = (() => {
    const out: string[] = [];
    const walk = (p: string) => {
      const abs = new URL(`../${p}`, import.meta.url);
      let st;
      try {
        st = statSync(abs);
      } catch {
        return;
      }
      if (st.isDirectory()) {
        for (const e of readdirSync(abs)) walk(`${p}/${e}`);
      } else if (/\.(ts|tsx|json)$/.test(p) && !p.includes(".test.")) {
        out.push(p);
      }
    };
    ["app", "content", "messages", "components"].forEach(walk);
    return out;
  })();

  it("저장소 어디에서도 Coles 가격을 쓴다고 말하지 않는다", () => {
    expect(repoFiles.length, "훑을 파일을 못 찾았다").toBeGreaterThan(20);
    // ⚠️ "Coles"라는 낱말을 막으면 안 된다 — 정직한 고지("Coles는 추적하지 않습니다"),
    //    제휴 부인("not affiliated with Woolworths, Coles"), 장보기 팁("Coles 앱에서
    //    특가를 비교하세요")은 전부 참이고 남아야 한다. **우리 가격의 출처가 Coles라는
    //    형태**만 잡는다.
    const CLAIM =
      /(price|prices|pricing|estimates?|shopping list|가격|价格|估算)[^.\n]{0,40}Woolworths\s*(&amp;|&|and|·)\s*Coles|Woolworths\s*(&amp;|&|and)\s*Coles[^.\n]{0,25}(price|prices|pricing|가격|价格)|availability at Woolworths and Coles/i;
    const hits: string[] = [];
    for (const f of repoFiles) {
      const body = readFileSync(new URL(`../${f}`, import.meta.url), "utf-8");
      for (const line of body.split("\n")) {
        const m = line.match(CLAIM);
        if (m) hits.push(`${f}: ${m[0].slice(0, 90)}`);
      }
    }
    expect(hits, `우리 가격이 Coles에서 온다고 말하는 곳:\n${hits.join("\n")}`).toEqual([]);
  });

  it("저장소 어디에서도 가격을 매장 실사라고 말하지 않는다", () => {
    // 가격은 Woolworths AU 온라인 카탈로그의 주간 캐시다. 매장에 간 적이 없다.
    // (Kiwi에서 08-11에 같은 문장을 6개 파일에서 찾아 고쳤다. 여기도 있었다 — terms)
    const CLAIM = /in-?store (check|visit|survey)s?|shelf tag[^.\n]{0,30}(record|read|check)|매장에서 (직접 )?확인한 가격|门店实地/i;
    const hits: string[] = [];
    for (const f of repoFiles) {
      const body = readFileSync(new URL(`../${f}`, import.meta.url), "utf-8");
      for (const line of body.split("\n")) {
        const m = line.match(CLAIM);
        if (m) hits.push(`${f}: ${line.trim().slice(0, 110)}`);
      }
    }
    expect(hits, `가격을 매장 실사라고 말하는 곳:\n${hits.join("\n")}`).toEqual([]);
  });

  it("레시피 개수 주장이 실제 데이터와 맞는다 (같은 파일 안에서도 갈라진다)", () => {
    // 🔴 2026-08-11: en `faq_a16`이 "over 100 recipes"라고 했는데 실제는 63이고,
    //    **같은 messages 파일 안의 다른 세 키는 63이라고 말하고 있었다.**
    //    한 파일이 제 자신과 모순된 상태였다. ko/zh도 같았다.
    const real = (menuData as { MENU_DATA: Record<string, unknown[]> }).MENU_DATA.en.length;
    for (const l of LOCALES) {
      for (const [k, v] of Object.entries(messages[l])) {
        if (typeof v !== "string") continue;
        for (const m of v.matchAll(/(\d{2,4})\s*\+?\s*(recipes|개 레시피|개의 레시피|道食谱|个食谱)/gi)) {
          expect(Number(m[1]), `${l}.${k}: "${m[0]}" — 실제 메뉴는 ${real}개다`).toBe(real);
        }
        expect(v, `${l}.${k}: 개수를 "100개 이상"처럼 부풀리고 있다`).not.toMatch(
          /over \d{2,4} recipes|\d{2,4}개 이상 레시피|\d{2,4}多个食谱/i,
        );
      }
    }
  });

  it("추적하지 않는 매장을 광고하지 않는다", () => {
    // Coles를 다루는 코드가 생기면 이 가드를 풀고 문구를 되살릴 것.
    const hasColesCode = ["lib", "components", "app/api"].some((d) => {
      try {
        return readFileSync(new URL(`../${d}/planGenerator.ts`, import.meta.url), "utf-8").match(/coles/i);
      } catch {
        return false;
      }
    });
    expect(hasColesCode, "Coles 코드가 생겼다면 문구를 복원할 것").toBe(false);
    for (const l of LOCALES) {
      // ⚠️ "Coles"라는 단어 자체를 막으면 안 된다. 정직한 고지("Coles 가격은
      //    아직 추적하지 않습니다")까지 걸린다. **추적한다는 주장만** 잡는다.
      expect(messages[l].faq_a30, `${l}: 없는 Coles 갱신 주장`).not.toMatch(
        /Coles.{0,20}(update|refresh|갱신|업데이트|更新)|(update|refresh).{0,20}Coles/i,
      );
      expect(messages[l].planner_seo_intro, `${l}: 없는 Coles 추정치 주장`).not.toMatch(
        /Coles.{0,12}(estimate|추정|估算)/i,
      );
    }
  });

  it("계정 혜택이 실제 테이블과 맞는다 (favorites 하나뿐)", () => {
    const tables = new Set<string>();
    for (const f of ["components/PlannerClient.tsx", "app/[locale]/account/page.tsx"]) {
      for (const m of src(f).matchAll(/\.from\("([a-z_]+)"\)/g)) tables.add(m[1]);
    }
    expect([...tables].sort()).toEqual(["favorites"]);
    for (const l of LOCALES) {
      expect(messages[l].account_save_plans_feature, `${l}: 없는 기능`).toBeUndefined();
    }
    expect(src("app/[locale]/account/page.tsx"), "하드코딩 통계 타일").not.toContain('">–</p>');
  });

  it("플랜이 계정에 저장된다고 말하지 않는다 (저장은 그 기기의 localStorage뿐)", () => {
    // 🔴 위 검사는 **키 하나가 사라졌는지**만 봤다. 그래서 `faq_a7`이 3개 언어 모두
    //    "생성한 모든 플랜이 계정에 자동 저장됩니다 / automatically saved to your
    //    account / 自动保存到账户"라고 말하는 동안 통과했다. 실제로 쓰는 테이블은
    //    favorites 하나뿐이고, 플랜은 `localStorage("lunchbox-plan")`에만 남는다.
    //    → 키 목록이 아니라 **주장**을 건다.
    const planner = src("components/PlannerClient.tsx");
    expect(planner, "계정 저장이 생겼다면 문구를 되살릴 것")
      .toMatch(/localStorage\.setItem\("lunchbox-plan"/);
    // ⚠️ 이 가드도 곧바로 **내가 새로 쓴 정직한 부인문**을 잡았다
    //    ("但它并未保存到账户"). 이 저장소에서 Coles·실시간·팀에 이어 네 번째다.
    //    부인문은 우리가 반드시 해야 하는 말이다 — 문장 단위로 잘라 걸러낸다.
    const NOT_SAVED = /並未|并未|不会|没有|않습니다|않으며|아니라서|아닙니다|\bnot\b|\bnever\b/i;
    const CLAIMS: [RegExp, string][] = [
      [/plans?[^.]{0,40}saved to your account|saved to your account|계정에 자동 저장|플랜[^.]{0,20}계정에 저장|保存到账户|保存到帐户/i,
        "없는 계정 저장을 광고한다"],
      [/meal plans,? and shopping lists synced|식단,? 쇼핑 리스트를 모든 기기|餐食计划和购物清单/i,
        "계정이 식단·쇼핑리스트를 동기화한다고 말한다"],
    ];
    for (const l of LOCALES) {
      for (const [k, v] of Object.entries(messages[l])) {
        if (typeof v !== "string") continue;
        // 🔴 문장 단위로 자르면 **절 단위 알리바이**가 생긴다. 돌연변이로 확인했다:
        //    "但它会自动保存到账户，因此不会同步到其他设备。"는 뒤 절의 "不会" 때문에
        //    앞 절의 거짓 주장까지 통째로 면제됐다. 쉼표까지 잘라야 한다.
        for (const sentence of v.split(/(?<=[.!?。！？；;，,])\s*|—|--/)) {
          if (NOT_SAVED.test(sentence)) continue;
          for (const [re, why] of CLAIMS) {
            expect(sentence, `${l}.${k}: ${why}`).not.toMatch(re);
          }
        }
      }
    }
  });

  it("하지 않은 조사를 했다고 말하지 않는다", () => {
    // 🔴 2026-08-10: Woolworths vs Coles 비교글 3편이 "우리가 25개 품목을 양 매장에서
    //    비교했다", "시드니 메트로에서 매장·온라인으로 기록했다"고 썼다. **전부 실제
    //    조사가 아니었다**(사용자 확인). 근거: 수집 상품 146건 중 Coles 0건,
    //    영양 데이터 파일은 존재하지도 않는다. 3편 모두 삭제하고 308로 보냈다.
    //    같은 검사에서 heat-safe 가이드의 "In our testing ... 5 hours at 34 degrees"도
    //    나왔다 - 온도 측정 기록이 없다. 문구를 원리 설명으로 바꿨다.
    const bodies = [
      ...Object.entries(GUIDES).map(([k, g]) => [k, String(g.body)] as const),
      ...Object.entries(POSTS).map(([k, p]) => [k, String(p.body)] as const),
    ];
    const CLAIMS = /\b(we (compared|tested|surveyed|priced|measured|visited)|in our testing|were recorded (in-store|at))\b/i;
    const bad = bodies.filter(([, b]) => CLAIMS.test(b)).map(([k]) => k);
    expect(bad, `근거 없는 1인칭 조사 주장: ${bad.join(", ")}`).toEqual([]);
  });

  it("출처 없는 비교 수치를 쓰지 않는다", () => {
    const bodies = [
      ...Object.values(GUIDES).map((g) => String(g.body)),
      ...Object.values(POSTS).map((p) => String(p.body)),
    ];
    for (const b of bodies) {
      expect(b, "근거 없는 퍼센트 범위").not.toMatch(/\d+-\d+% (less|lower|cheaper)/);
    }
  });
});

describe("본문의 도시락 비용 주장이 실제 계산과 맞는다", () => {
  it("간식 풀이 비어 있지 않다 (비면 아래가 메인 비용만 재고 조용히 통과한다)", () => {
    expect(((SNACKS["Fruit & Veg"] ?? []) as SnackItem[]).length).toBeGreaterThan(3);
    expect(
      ((SNACKS["Protein & Dairy"] ?? []) as SnackItem[]).length +
        ((SNACKS["Savoury Crunch"] ?? []) as SnackItem[]).length,
    ).toBeGreaterThan(3);
  });

  it("계산한 1통 중앙값이 본문이 말하는 $3~5 안에 든다", () => {
    const m = median(boxCosts());
    expect(m).toBeGreaterThanOrEqual(3.0);
    expect(m).toBeLessThanOrEqual(5.0);
  });

  it("가장 비싼 조합도 두 자릿수로 가지 않는다 (단위 착오 재발 감지)", () => {
    // 수정 전 최대 $11.68 → 지금 $8.98(Fruit Salad. 포도 한 송이 $17.91이 끌어올린다).
    // ⚠️ 임계값을 실제값에 바짝 붙이지 않는다. 이 가드가 잡으려는 것은
    //    "단위를 잘못 곱해 두 자릿수가 되는 것"이지 주간 가격 변동이 아니다.
    //    8.98에 맞춰 9.0으로 조이면 다음 주 가격에 흔들려 가드가 아니라 소음이 된다.
    expect(Math.max(...boxCosts())).toBeLessThan(10.0);
  });

  it("본문의 $3~5 주장이 실제로 남아 있다 (숫자만 고치고 문장을 놓치는 것 방지)", () => {
    expect(POSTS["school-canteen-vs-packed-lunch"].body).toContain("$3–5 per day");
    expect(POSTS["australian-school-canteen-guidelines-2026"].body).toContain(
      "$600 to $1,000 per child per year",
    );
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

  // 🔴 여는 태그를 통째로 떠서 본다. Kiwi에서 `<aside className="order-2`로 걸었다가
  //    속성을 하나 추가해 줄바꿈이 생긴 순간 가드가 조용히 깨졌다(테스트는 통과한 채로).
  //    **가드를 코드 서식에 묶지 말 것.**
  const openTag = (tag: string) =>
    planner.match(new RegExp(`<${tag}\\b[\\s\\S]{0,400}?>`))?.[0] ?? "";

  it("모바일에서 플랜이 필터보다 먼저 온다", () => {
    // 첫 화면이 설문지면 "몇 초 만에 한 주 도시락"이라는 약속과 어긋난다.
    // Kiwi 실측: Monday가 y=1550 → 고친 뒤 659.
    expect(openTag("aside")).toMatch(/order-2 lg:order-1/);
    expect(openTag("main")).toMatch(/order-1 lg:order-2/);
  });

  it("모바일 1단계 안내가 필터를 '위'라고 가리키지 않는다 (3개 언어)", () => {
    // 🔴 배치를 바꾸면 문구가 조용히 거짓이 된다. `order-2`로 필터를 아래로 내린
    //    순간 3개 언어의 "icons above / 위의 / 上方"가 전부 틀린 말이 됐다.
    expect(openTag("aside"), "필터가 모바일에서 아래에 있어야 이 검사가 성립한다")
      .toMatch(/order-2 /);
    for (const l of L3) {
      expect(m3[l].planner_step1_mobile ?? "", `${l}: 필터는 아래에 있다`)
        .not.toMatch(/\babove\b|위의|위에|上方|上面/);
    }
  });

  it("플랜이 있을 때 모바일에서 필터로 돌아갈 길이 있다", () => {
    // 순서를 뒤집으면 필터가 카드 전부 아래로 간다. 앵커가 없으면
    // "다시 뽑기"가 사실상 불가능해진다 — Kiwi에서 만든 회귀다.
    expect(planner).toMatch(/id="planner-filters"/);
    expect(planner).toMatch(/href="#planner-filters"/);
  });

  it("로그인 버튼이 생성 CTA와 같은 무게로 보이지 않는다", () => {
    // 계정 없이 플랜 생성이 전부 동작한다. 로그인이 주황 채움 버튼이면
    // 최상단에서 가장 눈에 띄는 것이 로그인이 된다 — "무료·가입 불필요"와 어긋난다.
    const i = planner.indexOf("onClick={() => setShowAuth(true)}\n              className");
    expect(i, "로그인 버튼을 못 찾았다").toBeGreaterThan(-1);
    expect(planner.slice(i, i + 400)).not.toMatch(/bg-\[#F5A623\]/);
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
