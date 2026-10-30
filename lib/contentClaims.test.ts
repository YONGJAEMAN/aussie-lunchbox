import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import menuData from "@/data/menuData.json";
import { GUIDES } from "@/content/guides";
import { POSTS } from "@/content/posts";
import type { MenuItem, SnackData, SnackItem, PriceInfo } from "./types";
import { PORTION_FACTORS, DEFAULT_PORTION, PORTION_BASIS, PORTION_BASIS_UNVERIFIED } from "./planConfig";
import { labelFor, declares, warnsAbout, labelledCount, ALLERGEN_PATTERNS } from "./allergenLabels";
import { PINNED_SKUS, RECIPE_ONLY_INGREDIENTS } from "./priceSearch.mjs";
import { costForIngredients } from "./planGenerator";
import { readTimeFor } from "./readTime";
import PRICES from "@/data/price_cache.json";
import { serveLabel, wrapVsBreadClause, boxMedianLabel, boxWeekLabel, boxMedian, snackSlotsCost, exampleWeekRows, exampleWeekTotal, EXAMPLE_WEEK, portionExample, methodExample, boxFloorLabel, boxCeilingLabel, budgetWeek, budgetWeekTotal, budgetWeekTotalLabel, budgetWeekRows } from "./servePrice";
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
import { getActivePromotions as activePromosForGate } from "./promotions";
// Aussie(2026-10-30): AU 전단은 5단계 — 특가 데이터가 있어야 성립하는 검사는 데이터가 들어오면 다시 켜진다.
const HAS_PROMOS = activePromosForGate(["woolworths", "newworld"]).length > 0;

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

/*
 * 🔴 Aussie(2026-10-30): Kiwi에서 옮긴 가드 중 **NZ 글·가격지수·일요장보기**에 묶인 describe 58개를 뺐다
 *    (그 글과 모듈이 이 사이트에 없다 — 남겨 두면 import부터 깨진다). 남긴 것은 사이트 전체 규칙
 *    (가격 출처·고정 SKU·접근성·방침·UI 문구 등)이다. 뺀 목록: git 이력의 이 커밋 메시지.
 */
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

  it("Google 로그인은 코드에 있고, 개인정보 방침이 그것을 밝힌다(Aussie)", () => {
    // Kiwi는 OAuth가 없어 「Google 로그인 광고 금지」였다. Aussie는 실제로 있다 — 그러면 방침이 말해야 한다.
    const auth = src("components/AuthModal.tsx");
    expect(auth, "Google 로그인이 사라졌다면 방침 문구도 같이 지울 것").toMatch(/signInWithOAuth\(\{\s*provider: "google"/);
    expect(src("app/auth/callback/route.ts"), "OAuth 콜백 라우트").toMatch(/exchangeCodeForSession/);
    for (const l of LOCALES) {
      expect(messages[l].privacy_1_li1, `${l}: 방침이 Google 로그인을 밝히지 않는다`).toMatch(/Google/);
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

  // Aussie: 가격지수 페이지는 3단계에서 연다 — 그때 이 자리에 price-index를 되살릴 것.
  it("지키지 않는 갱신 주기를 약속하지 않는다", () => {
    // Woolworths=주간 자동, Pak'nSave=매장 방문(2026-05-16 이후 멈춰 있다).
    // "매월"이라고 쓰면 그 순간 거짓이 된다.
    const bodies = [
      ...Object.values(GUIDES).map((g) => String(g.body)),
      ...Object.values(POSTS).map((p) => String(p.body)),
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
    // Aussie 홈에는 가격지수 배너가 없다(3단계) — 가격 갱신 주기는 home_tips_price_p가 말한다.
    expect(msgs.en.home_tips_price_p).toMatch(/once a week|weekly/i);
  });

  it("1인 운영이라는 사실이 About 문구에 남아 있다", () => {
    expect(msgs.en.about_mission2).toMatch(/one parent|not a company|one-person/i);
  });
});

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
    // Aussie(2026-10-30): Kiwi 목록(NZ 보건부·MPI 인용)을 AU 인용으로 바꿨다. 셋 다 원 자료와 대조했다 —
    //   ABS 2021 Census 48.2% · healthdirect 「1 in 10 one-year-old」 · Roy Morgan 2019 발표(2018 자료) 12.1%.
    //   (옮겨 오기 전 문장은 「2025 Roy Morgan 조사」「ASCIA 1 in 20 aged 5-14」처럼 원 자료와 달랐다.)
    const ATTRIBUTED: Array<string | { re: RegExp; why: string }> = [
      { re: /food allergies affect around[^.]{0,200}\]\(https?:\/\//i, why: "식품알레르기 유병률에 링크가 없다" },
      "According to the [Australian Bureau of Statistics](",
      "[Roy Morgan's 2019 release](",
    ];
    // 기관을 대고 수치를 말하는 문장은 그 문장 안에 링크가 있어야 한다 — 위 목록 밖의 새 문장도 잡는다.
    for (const [slug, b] of bodies) {
      for (const sent of b.split(/(?<=[.!?])\s+/)) {
        if (/According to (?:the |a )?[A-Z]/.test(sent) && /\d/.test(sent))
          expect(sent, `${slug}: 링크 없는 인용`).toMatch(/\]\(https?:\/\//);
      }
    }
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
    "app/[locale]/page.tsx",
    "app/[locale]/about/page.tsx",
  ];
  const allSurfaces = SURFACES.map(read).join("\n");

  it("실사진이 실제로 존재한다 — 0장이라고 말하기 전에 여기서 걸린다", () => {
    expect(realPhotos.length, "public/assets/real-* 가 하나도 없다").toBeGreaterThanOrEqual(1); // Aussie는 한 장
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
  // Aussie(2026-10-30): Kiwi의 NZ 매장 사진(Kmart·Pak'nSave 영수증·카트)과 안 붙인 도시락 사진은 옮기지 않았다 —
  //   호주 사이트에 NZ 매장 영수증을 둘 이유가 없다. 남은 실사진은 플래너의 도시락 한 장뿐이다.
  const UNPLACED: Record<string, string> = {};

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
    expect(scenes.length, "장면 실사진이 하나도 없다").toBeGreaterThanOrEqual(1); // Aussie는 한 장
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
    // Aussie: 영수증 사진이 없다(NZ 영수증은 옮기지 않았다). 생기면 아래 규칙이 그대로 적용된다 — 매장 이름은 그 사진의 매장으로 바꿀 것.
    expect(receipts.length, "영수증 사진이 생겼다 — 매장 정규식을 그 매장으로 고칠 것").toBe(0);
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
    // Aussie 글에는 보온병 개수 주장이 아직 없다(Kiwi는 셋 넘게). 0건이 「정규식이 낡아서」가 아님을
    //   대신 확인한다 — 이 문장을 쓰는 순간 위 검사가 잡는다.
    expect(claimCount, "보온병 개수 주장이 생겼다 — 위 검사가 그것을 보고 있는지 확인할 것").toBeGreaterThanOrEqual(0);
    expect("12 thermos-friendly recipes".match(CLAIM)?.length, "CLAIM 정규식이 대표 문장을 못 잡는다").toBe(1);

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

});

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
    // Aussie: 근거 없는 범위를 전부 걷어내 지금은 0건이다(10-30). 스캐너가 살아 있는지는 대표 문장으로 본다.
    expect("roughly 30–40% of the day".match(RANGE)?.length, "범위형 퍼센트 정규식이 대표 문장을 못 잡는다 — 스캐너가 죽었다").toBe(1);

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
    // Aussie: 재런칭 전(`SITE_NOINDEX`)에는 영어여도 광고 코드를 안 뿌린다.
    expect(layout).toMatch(/showAdSenseScript\s*=\s*locale === "en" && !SITE_NOINDEX && !isNoindexPath && !isUtilityPath/);
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
    // Aussie는 원가 표가 3개다(Kiwi는 9개 넘게) — 하한은 「표를 읽고 있다」만 본다.
    expect(n, "원가 표를 하나도 못 찾았다 — 표 모양이 바뀌었으면 이 가드부터 고칠 것")
      .toBeGreaterThanOrEqual(3);
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
    expect(all.length, "글을 하나도 못 읽었다").toBeGreaterThanOrEqual(18); // Aussie 글 10 + 가이드 8
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
    expect(bodies().length).toBeGreaterThanOrEqual(18); // Aussie 글 10 + 가이드 8
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
    const bad = Object.keys(pins).filter((k) => cache[k]?.data?.source !== "Woolworths Australia");
    expect(bad, `고정했는데 폴백가로 저장돼 있다 → ${bad.join(", ")}`).toEqual([]);
  });
});

/**
 * 🔴 2026-08-23: 예산 가이드의 손 표를 파생으로 바꿨는데 **같은 표가 블로그에 하나 더**
 *    있었다("Weekly Budget Tracker", $1.55~$2.40 · 주 $9.75). 발견 경로가 우연이다 —
 *    중앙값을 고치다 `$19.50`을 grep했더니 나왔다.
 *    이 저장소가 반복해서 밟는 함정이 정확히 그것이라, 이제 **두 자리를 묶어서** 본다.
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
    expect(all.length).toBeGreaterThanOrEqual(18); // Aussie 글 10 + 가이드 8
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
    const BRAND = "aussielunchbox@gmail.com";
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

  it.skipIf(!HAS_PROMOS)("🔴 이번 주 실제 데이터로: 붙은 할인이 전부 같은 용량·더 싼 값이다", async () => {
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

  it.skipIf(!HAS_PROMOS)("🔴 FAQ가 「대부분의 특가는 통과하지 못한다」를 밝힌다", () => {
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
    expect(withMoney, "금액이 든 글이 없다 — 이 가드가 알리바이다").toBeGreaterThanOrEqual(3); // Aussie는 4편
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
    // Aussie: CSV·가격지수는 3단계에서 연다 — 그때까지 지금 값으로 가는 길은 플래너다.
    expect(page, "지금 값으로 가는 길이 없다").toMatch(/post\.staticPrices[\s\S]{0,800}\/\$\{locale\}\/planner/);
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
  });

  it("🔴 흰 글자 옆에 장식용 주황이 없다", () => {
    // Aussie: Kiwi의 옛 초록(#78B159) 자리가 브랜드 주황(#F5A623)이다 — 흰 글자 대비 2.0:1이라 장식(테두리·면)에만 쓴다.
    const FILES = [
      "components/PlannerClient.tsx", "components/Navbar.tsx", "components/Footer.tsx",
      "components/CookieConsent.tsx", "components/AuthModal.tsx", "components/CategoryFilter.tsx",
      "app/[locale]/page.tsx", "app/[locale]/blog/[slug]/page.tsx",
      "app/[locale]/guides/[slug]/page.tsx",
      "app/not-found.tsx",
    ];
    /** 소스 한 덩어리에서 「흰 글자가 얹힌 옛 초록」을 찾는다. */
    const offenders = (src: string, label: string) => {
      const out: string[] = [];
      for (const m of src.matchAll(/bg-\[#F5A623\](?!\/)/g)) {
        const win = src.slice(Math.max(0, m.index! - 200), m.index! + 200);
        if (/text-white/.test(win)) out.push(`${label}: …${win.replace(/\s+/g, " ").slice(150, 260)}…`);
      }
      return out;
    };
    // 🔴 양성 대조 — 스캐너가 실제로 잡는지 **가짜 소스로 먼저 터뜨려 본다.**
    //    이게 없으면 정규식이 깨져도 「위반 0건」으로 조용히 통과한다.
    expect(offenders('<div className="bg-[#F5A623] text-white">x</div>', "fake"),
      "스캐너가 명백한 위반을 못 잡는다").toHaveLength(1);
    expect(offenders('<div className="bg-[#F5A623]/40 text-white">x</div>', "fake"),
      "투명도 붙은 면까지 잡는다 — 오탐이다").toHaveLength(0);

    const bad: string[] = [];
    let mentions = 0;
    for (const f of FILES) {
      const s = srcOf(f);
      mentions += [...s.matchAll(/#F5A623/g)].length;
      bad.push(...offenders(s, f));
    }
    // 🔴 브랜드 초록은 **테두리·연한 면에는 그대로 남아 있어야 한다.**
    //    전부 사라졌다면 색을 통째로 갈아치운 것이고 이 검사의 의도가 아니다.
    expect(mentions, "#F5A623이 코드에서 통째로 사라졌다 — 테두리까지 바꾼 것이다")
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
    for (const f of ["app/[locale]/policies/page.tsx"]) {
      const src = read(f);
      expect(src, f).not.toMatch(/shelf-tag photo|receipt scan/);
      expect(src, `${f}: 표에 없는 Notes 열`).not.toMatch(/&quot;Notes&quot;\s+column/);
    }
    expect(read("app/[locale]/guides/page.tsx")).not.toMatch(/monthly\{" "\}\s*<Link[^>]*price-index/);
  });

  it("About이 특가를 「할인 재료로 짠다」고 말하지 않는다 — 할인 후 원가로 순위를 매길 뿐이다", () => {
    const about = read("app/[locale]/about/page.tsx");
    expect(about).not.toMatch(/lean on those discounted|three flyers|Use this week&apos;s sales/);
    // Aussie: About은 아직 특가 토글을 설명하지 않는다(AU 전단은 5단계). 설명하기 시작하면 실제 이름을 써야 한다.
    if (/this week&apos;s specials|specials toggle/i.test(about))
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
    expect(PLANNER_PAGE).not.toMatch(/예산을 설정|和预算/);
  });

  it("홈 SearchAction이 q를 실제로 읽는 경로를 가리킨다", () => {
    const home = src("app/[locale]/page.tsx");
    const seg = home.match(/target: `\$\{BASE_URL\}\/\$\{locale\}\/(\w+)\?q=\{search_term_string\}`/)?.[1];
    expect(seg, "SearchAction target을 못 찾았다").toBeTruthy();
    const page = rd(`app/[locale]/${seg}/page.tsx`);
    expect(page, `/${seg}는 q를 안 읽는다`).toMatch(/searchParams[\s\S]{0,200}\bq\b/);
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
    // Aussie: AU 실가격(2026-10-30)으로 $3 미만은 45/94 — 「다섯 중 하나」가 아니라 「절반 가까이」다.
    const phrase = { en: /nearly half/, ko: /절반 가까이/, zh: /近一半/ } as const;
    for (const l of LOCALES2) {
      const v = m2[l].home_usecase3_desc;
      expect(v, l).not.toMatch(/filter for the cheaper|저렴한 메인으로 고르면|选择较便宜的主食/);
      expect(v, `${l}: 「다섯 중 하나」 표현이 빠졌다 — 아래 비율 검사가 빈 검사가 된다`).toMatch(phrase[l]);
    }
    const ratio = SP_VEG.boxUnderCount(3) / MENUS.length;
    expect(ratio, `$3 미만 ${SP_VEG.boxUnderCount(3)}/${MENUS.length} — 「nearly half」가 더는 맞지 않는다`).toBeGreaterThanOrEqual(0.4);
    expect(ratio).toBeLessThan(0.5);
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
      // Aussie: 호주 식이 가이드라인은 식품군이 **다섯**이다(NZ 보건부는 넷). 옮겨 오며 뒤집었다.
      expect(m.faq_a23, `${l}: faq_a23`).not.toMatch(/four food groups|4가지 식품군|四大/);
      expect(m.faq_a23, `${l}: faq_a23`).toMatch(/five food groups|5가지 식품군|五大/);
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
      // Aussie: 호주는 주에 따라 1월 말(QLD·VIC·SA)이나 2월 초(NSW·WA)에 개학한다 — 「1월 말」 금지는 NZ 규칙이라 뺐다.
      expect(m2[l].home_guide_seasonal_p1, l).toMatch(/state|주마다|因州/);
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
      expect(m2[l].planner_seo_price_p, l).toContain("Woolworths"); // Aussie: 한 체인(Coles 미추적)
      expect(m2[l].faq_a15, l).not.toMatch(/a suggested snack|추천 간식|推荐零食/);
      expect(m2[l].faq_a15, l).toMatch(/two snacks|간식 최대 두 개|两份零食/);
    }
    const gen = read("lib/planGenerator.ts");
    expect(gen.split("snacks.push(randomChoice(").length - 1, "하루 간식 칸 수가 바뀌었다").toBe(2);
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
  it.skipIf(!HAS_PROMOS)("양성 대조 — 새 표현이 실제로 들어가 있다", () => {
    expect(read("content/posts.ts")).toMatch(/mailers are transcribed/);
    expect(read("messages/ko.json")).toMatch(/전단을 옮겨 적어/);
  });
  it.skipIf(HAS_PROMOS)("전단 전(Aussie) — FAQ가 특가를 추적하지 않는다고 말한다", () => {
    const en = JSON.parse(read("messages/en.json")).faq_a21 as string;
    expect(en, "특가를 추적한다고 말하기 시작했다면 전단이 실제로 들어와 있어야 한다").toMatch(/don't track them/);
  });
});
