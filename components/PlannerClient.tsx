"use client";

import { useState, useEffect, memo } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PlanItem, AllergyType, Locale, PriceInfo, PrepStyle, GeneratePlanResponse, MayContainNote } from "@/lib/types";
import type { StoreId } from "@/data/promotions.types";
import { getIngredientCategory, getIngredientEmoji, CATEGORY_EMOJIS } from "@/lib/utils";
import { PORTION_BASIS, portionFor } from "@/lib/planConfig";
import {
  PORTION_BANDS, DEFAULT_PORTION_BAND, PORTION_BAND_SOURCE, bandFactorLabel,
  bandAfterAllergyToggle, normalizePortionBand, type PortionBand,
  MAX_LUNCHBOXES, normalizeExtraBoxes, portionsOf, portionsFactor, portionsLabel, type Portions,
} from "@/lib/portionBands";
import { parseYield } from "@/lib/recipeYield";
import { effectivePackPrice, saleMapFor, priceDay, activePromotionsFor, weekTotalFrom } from "@/lib/planGenerator";
import { encodeSharedPlan, decodeSharedPlan, normalizeLunchDays, ALL_LUNCH_DAYS } from "@/lib/planShare";
import { methodAmountFor, RECIPES_WITH_METHOD_AMOUNTS } from "@/lib/recipeMethodAmounts";
import { MENU_COUNT } from "@/lib/menuCounts";
import { savedPlanIsStale, PLAN_SCHEMA, dayMayContain, ALLERGY_TAG } from "@/lib/ingredientDiet";
import { dayKindyPrep, kindyOn, PREPS, type KindyPrepNote } from "@/lib/chokingRisk";
import AuthModal from "@/components/AuthModal";
import { useParams } from "next/navigation";
import { SOCIAL } from "@/components/Footer";
import type { FilterState } from "@/lib/relatedPosts";
import { relatedPosts, matchedFilters, articleHref } from "@/lib/relatedPosts";

type ArticleMeta = { title: string; category: string; readTime: string };

const ALLERGY_OPTIONS: AllergyType[] = [
  "Nut Allergy", "Dairy Allergy", "Gluten Allergy",
  "Egg Allergy", "Sesame Allergy", "Vegetarian", "Vegan", "Kindy",
];

const ALLERGY_DISPLAY_KEYS: Record<AllergyType, string> = {
  "Nut Allergy": "planner_allergy_nut",
  "Dairy Allergy": "planner_allergy_dairy",
  "Gluten Allergy": "planner_allergy_gluten",
  "Egg Allergy": "planner_allergy_egg",
  "Sesame Allergy": "planner_allergy_sesame",
  "Vegetarian": "planner_allergy_vegetarian",
  "Vegan": "planner_allergy_vegan",
  "Kindy": "planner_allergy_kindy",
};

/** 킨디 안내가 링크하는 글. `FILTER_ARTICLES.Kindy`와 같은 글이다(가드가 대조한다). */
// 킨디 필터는 아직 뉴질랜드 보건부 지침을 따른다(4단계에서 호주 지침으로 교체).
// 그 지침을 풀어 쓴 가이드는 자매 사이트에 있으므로 그리로 보낸다 — Aussie에는 아직 킨디 가이드가 없다.
const KINDY_GUIDE_URL = "https://www.kiwilunchbox.co.nz/en/guides/kindy-lunchbox-choking-guide-nz";

const PREP_OPTIONS: PrepStyle[] = ["no-cook", "make-ahead", "cook-fresh"];

const PREP_DISPLAY_KEYS: Record<PrepStyle, string> = {
  "no-cook": "planner_prep_nocook",
  "make-ahead": "planner_prep_makeahead",
  "cook-fresh": "planner_prep_cookfresh",
};

const PREP_BADGE_KEYS: Record<PrepStyle, string> = {
  "no-cook": "planner_prep_badge_nocook",
  "make-ahead": "planner_prep_badge_makeahead",
  "cook-fresh": "planner_prep_badge_cookfresh",
};

/**
 * 화면의 계획을 **만든** 조건 전부 — 하루 교체가 같은 조건으로 후보를 거르고,
 * 공유 링크가 같은 조건으로 가격을 다시 매기는 데 쓴다. 사이드바의 실시간 값과 다르다.
 */
type PlanOptions = {
  allergies: AllergyType[];
  excluded: string[];
  prepStyles: PrepStyle[];
  thermosOnly: boolean;
  useSales: boolean;
  saleStores: StoreId[];
  /** 나이대별 양 — 원가·장보기·레시피 창이 모두 이 값으로 몫을 낸다(`portionFor`). */
  band: PortionBand;
  /** 같은 식단을 더 싸는 도시락(2번부터)의 나이대. 빈 배열 = 도시락 한 개. 몫은 `portionsOf(band, extraBoxes)`. */
  extraBoxes: PortionBand[];
  /** 월~금 도시락을 싸는 날(길이 5). 끈 날은 카드에 「No lunchbox」, 합계·장보기에서 빠진다(서버가 뺀다). */
  lunchDays: boolean[];
};

const DEFAULT_SALE_STORES: StoreId[] = ["woolworths", "newworld"];

/**
 * 「$0.86 ×1.39 = $1.20」의 오른쪽 — **화면에 찍힌 두 값**을 곱한다. 반올림 전 값으로 곱하면
 * 독자가 되짚은 곱셈과 1센트씩 어긋난다(2026-09-20 86c vs 85.75c와 같은 자리).
 */
function labelledProduct(baseServeCost: number, portions: Portions): string {
  return (Math.round(Math.round(baseServeCost * 100) * portionsFactor(portions)) / 100).toFixed(2);
}

/** 「Ages 5–12 (standard) ×1.00 + Under 5 / Kindy (ages 3–4) ×0.76」 — 화면의 배율을 더하면 합 배율이 된다. */
function boxesList(boxes: readonly PortionBand[], t: (key: string) => string): string {
  return boxes.map((b) => `${t(`portion_band_${b}`)} ${bandFactorLabel(b)}`).join(" + ");
}

/** ⚠ 「may contain」 줄의 알레르겐 낱말. 라벨로 판정되는 다섯만 — 채식·비건은 해당이 없다. */
const MAY_CONTAIN_WORD: Partial<Record<AllergyType, string>> = {
  "Nut Allergy": "planner_may_contain_nuts",
  "Dairy Allergy": "planner_may_contain_milk",
  "Egg Allergy": "planner_may_contain_egg",
  "Gluten Allergy": "planner_may_contain_gluten",
  "Sesame Allergy": "planner_may_contain_sesame",
};

const DAY_KEYS = ["planner_day_mon", "planner_day_tue", "planner_day_wed", "planner_day_thu", "planner_day_fri"] as const;

const EXAMPLE_IMAGES: Record<string, string> = {
  "Rice Paper Rolls": "/assets/kiwi_planner_rice_paper_rolls.webp",
  "Chicken Pesto Panini": "/assets/kiwi_planner_chicken_pesto_panini.webp",
  "Sushi Rolls": "/assets/kiwi_planner_sushi_rolls.webp",
  "Cheesymite Scrolls": "/assets/kiwi_planner_cheesymite_scrolls.webp",
  "Mini Spinach Quiche": "/assets/kiwi_planner_mini_spinach_quiche.webp",
};

export default function PlannerClient({
  salesActive = false,
  articleMeta,
  methodExample,
  exampleWeek,
}: {
  salesActive?: boolean;
  articleMeta: Record<string, ArticleMeta>;
  /** 「1인분 vs 조리법 투입량」 안내에 쓰는 값. 서버에서 `lib/servePrice.ts`가 만든다. */
  methodExample: { one: string; count: number; many: string };
  /** 빈 화면의 예시 주간. 홈과 같은 `exampleWeekRows()`/`exampleWeekTotal()` — 서버에서 만든다. */
  exampleWeek: { rows: { menu: string; tag?: string; ingredients: string[]; cost: string }[]; total: string };
}) {
  const t = useTranslations();
  // 예시 장보기 목록 = 예시 다섯 메인의 재료를 실제 목록과 같은 분류로 묶은 것.
  const exampleShopping = Object.entries(
    [...new Set(exampleWeek.rows.flatMap((r) => r.ingredients))].reduce<Record<string, string[]>>((acc, ing) => {
      (acc[getIngredientCategory(ing)] ??= []).push(ing);
      return acc;
    }, {}),
  ).map(([cat, items]) => ({ cat, items }));
  const params = useParams();
  const locale = (params.locale as Locale) ?? "en";
  const supabase = createClient();

  // Auth state
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  // Sidebar state
  const [allergies, setAllergies] = useState<AllergyType[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [leftover, setLeftover] = useState("");
  const [allIngredients, setAllIngredients] = useState<string[]>([]);
  // 특가를 기본으로 켠다 — 홈 히어로와 학교 안내문이 이미 "specials built in"이라고 말한다.
  // 🔴 단, 특가 주가 만료됐으면 켜지 않는다. 지난주 특가를 이번 주 것으로 보여주게 된다.
  const [useSales, setUseSales] = useState(salesActive);
  const [saleStores, setSaleStores] = useState<StoreId[]>(DEFAULT_SALE_STORES);
  const [prepStyles, setPrepStyles] = useState<PrepStyle[]>([]);
  const [thermosOnly, setThermosOnly] = useState(false);
  const [portionBand, setPortionBand] = useState<PortionBand>(DEFAULT_PORTION_BAND);
  const [extraBoxes, setExtraBoxes] = useState<PortionBand[]>([]);
  const [lunchDays, setLunchDays] = useState<boolean[]>([...ALL_LUNCH_DAYS]);

  // Plan state
  const [planData, setPlanData] = useState<PlanItem[]>([]);
  /**
   * 🔴 **화면의 계획을 만든** 필터. 사이드바의 실시간 체크박스와 다르다.
   *    2026-08-21 리뷰: 카드가 라이브 상태를 읽어서 (a) 계획을 만든 뒤 체크박스만
   *    건드리면 계획은 그대로인데 카드만 바뀌고, (b) 복원된 계획은 필터를 잃어
   *    항상 폴백 카드를 받았다. 카드는 **눈앞의 계획**을 설명해야 한다.
   */
  const [planFilters, setPlanFilters] = useState<FilterState>({
    allergies: [], prepStyles: [], thermosOnly: false,
  });
  const [planOptions, setPlanOptions] = useState<PlanOptions>({
    allergies: [], excluded: [], prepStyles: [], thermosOnly: false, useSales: false, saleStores: [],
    band: DEFAULT_PORTION_BAND, extraBoxes: [], lunchDays: [...ALL_LUNCH_DAYS],
  });
  const [shoppingList, setShoppingList] = useState<string[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});
  const [totalSavings, setTotalSavings] = useState<number | undefined>(undefined);
  const [totalWeekCost, setTotalWeekCost] = useState<number | undefined>(undefined);
  const [generating, setGenerating] = useState(false);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");

  // PDF / Email state
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [emailAddr, setEmailAddr] = useState("");
  const [sending, setSending] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");

  // Share state
  const [listCopied, setListCopied] = useState(false);
  const [restored, setRestored] = useState(false);
  /** 🔴 수정 전 저장분을 복원하지 않고 버렸다 — 화면이 왜 그런지 말해야 한다. */
  const [stalePlan, setStalePlan] = useState(false);
  /** 공유 링크로 연 계획을 보는 중 — 방문자 자신의 저장분은 건드리지 않았다. */
  const [sharedView, setSharedView] = useState(false);
  const [shareInvalid, setShareInvalid] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareLinkState, setShareLinkState] = useState<"" | "copied" | "manual" | "too_long">("");

  // Swap one day
  const [swappingDay, setSwappingDay] = useState<number | null>(null);
  const [swapNote, setSwapNote] = useState<{ day: number; text: string } | null>(null);

  // Recipe modal
  const [activeRecipe, setActiveRecipe] = useState<PlanItem | null>(null);

  // Saved favorites from DB
  const [dbFavorites, setDbFavorites] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ? { email: data.session.user.email ?? "" } : null);
      if (data.session?.user?.email) setEmailAddr(data.session.user.email);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ? { email: session.user.email ?? "" } : null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetch(`/api/menus?locale=${locale}`)
      .then((r) => r.json())
      .then(({ menus }) => {
        const ings = new Set<string>();
        for (const m of menus) for (const i of m.ingredients) ings.add(i);
        setAllIngredients([...ings].sort());
      });
  }, [locale]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("favorites")
      .select("name")
      .then(({ data }) => setDbFavorites(data?.map((r) => r.name) ?? []));
  }, [user]);

  // Restore last plan from localStorage
  function restoreSavedPlan() {
    try {
      const saved = localStorage.getItem("lunchbox-plan");
      if (saved) {
        const parsed = JSON.parse(saved);
        const age = Date.now() - (parsed.generatedAt ?? 0);
        if (age < 24 * 60 * 60 * 1000) {
          /**
           * 🔴 2026-09-09 재점검 — 저장된 판을 **그대로** 되살리고 있었다.
           *    카드의 금액·할인 배지는 저장 시점의 값인데, 아래 장보기 목록은
           *    같은 화면에서 **지금 가격**으로 다시 계산한다. 그래서 한 화면에
           *    총액이 두 개 떴다(주간 $13.51 vs 목록 $14.47), 그리고 이미 걷어낸
           *    Alpro 할인 배지가 옛 카드에만 살아 있었다.
           *
           *    되살릴 때 **지금 값으로 다시 계산한다.** 메뉴와 간식은 그대로 두고
           *    가격·할인만 갱신한다 — 그게 저장의 목적이다(무엇을 먹기로 했는지).
           */
          /**
           * 🔴 2026-09-10 외부 감사 — 위 재계산은 **가격만** 갱신했다. 메뉴와 간식은
           *    저장된 것을 그대로 살렸는데, 09-10 이전 저장분의 간식은 알레르기 필터를
           *    **한 번도 거치지 않은 것**이다. 그래서 처음 접속하면 수정 전에 만들어진
           *    `Lentil Soup + Cottage Cheese`(Dairy Allergy)가 그대로 되살아났다.
           *    새로 만들면 정상이라 고쳐진 것처럼 보이는데, 기존 방문자는 계속 봤다.
           *
           *    두 겹으로 막는다:
           *      ① `schema` 표시가 없는 저장분은 **복원하지 않는다.** 그 저장분의 간식이
           *         필터를 거쳤다는 근거가 없고, 근거 없이 되살릴 값이 아니다.
           *      ② 표시가 있어도 저장된 조건으로 **메인·간식을 다시 검증한다.**
           *         한 건이라도 걸리면 복원하지 않는다(필터가 또 새더라도 여기서 멈춘다).
           *    복원하지 않을 때는 화면이 왜 그런지 말하고 다시 만들라고 안내한다.
           */
          if (savedPlanIsStale(parsed)) {
            localStorage.removeItem("lunchbox-plan");
            setStalePlan(true);
            return;
          }

          const savedPrices = (parsed.prices ?? {}) as Record<string, PriceInfo>;
          const priceMap = new Map(Object.entries(savedPrices));
          // 🔴 09-29까지 특가 토글과 무관하게 두 마트 특가를 붙였다 — 특가를 끄고 만든 식단이
          //    새로고침하면 더 싸졌다. 이제 저장된 토글(`sale`)을 따른다. 토글을 안 적은
          //    옛 저장분은 예전 동작(두 마트) 그대로다.
          const opts: PlanOptions = {
            allergies: parsed.filters?.allergies ?? [],
            excluded: parsed.filters?.excluded ?? [],
            prepStyles: parsed.filters?.prepStyles ?? [],
            thermosOnly: parsed.filters?.thermosOnly ?? false,
            useSales: typeof parsed.sale?.useSales === "boolean" ? parsed.sale.useSales : true,
            saleStores: Array.isArray(parsed.sale?.saleStores) ? parsed.sale.saleStores : DEFAULT_SALE_STORES,
            // 이 값이 없는 옛 저장분은 기준(5–12세)으로 만든 것이다.
            band: normalizePortionBand(parsed.portionBand),
            // 이 값이 없는 옛 저장분은 도시락 한 개로 만든 것이다.
            extraBoxes: normalizeExtraBoxes(parsed.extraBoxes),
            // 끈 날은 저장된 planData의 `off`가 들고 있다 — 옛 저장분은 다섯 날 전부다.
            lunchDays: normalizeLunchDays(parsed.lunchDays),
          };
          const promos = activePromotionsFor({ useSales: opts.useSales, saleStores: opts.saleStores });
          // 생성·교체·공유와 **같은 함수**(priceDay)로 매긴다.
          const refreshed = (parsed.planData ?? []).map((d: PlanItem) => {
            const snackIngs = (d.snacks ?? []).flatMap((s) => s.ingredients ?? []);
            const all = [...(d.rawIngredients ?? []), ...snackIngs];
            const { cost, saleMatches: matches } = priceDay(all, priceMap, promos, portionsOf(opts.band, opts.extraBoxes));
            // 🔴 ⚠도 지금 라벨로 다시 낸다 — 옛 저장분엔 필드가 없고, 라벨은 매주 바뀐다.
            const mayContain = dayMayContain(d.rawIngredients ?? [], d.snacks ?? [], opts.allergies);
            // 킨디 손질 안내도 같은 함수로 다시 낸다 — 표가 바뀌면 저장분도 새 안내를 받는다.
            const kindyPrep = dayKindyPrep(d.rawIngredients ?? [], d.snacks ?? [], opts.allergies, d.menuName);
            return {
              ...d,
              estCost: `$${cost.toFixed(2)}`,
              estCostValue: cost,
              ...(matches.length > 0 ? { saleMatches: matches } : { saleMatches: undefined }),
              mayContain: mayContain.length > 0 ? mayContain : undefined,
              kindyPrep: kindyPrep.length > 0 ? kindyPrep : undefined,
            };
          });
          setPlanData(refreshed);
          setShoppingList(parsed.shoppingList ?? []);
          setPrices(savedPrices);
          // 옛 저장분에는 filters가 없다 — 그때는 빈 필터(=폴백 카드)가 정직한 값이다.
          setPlanFilters({
            allergies: opts.allergies,
            prepStyles: opts.prepStyles,
            thermosOnly: opts.thermosOnly,
          });
          setPlanOptions(opts);
          setRestored(true);
        }
      }
    } catch {}
  }

  /**
   * 공유 링크(`?plan=`)로 들어왔으면 그 식단을 연다.
   *
   * 🔴 방문자 자신의 저장분(`lunchbox-plan`)은 **덮어쓰지 않는다.** 남의 링크를 한 번
   *    열어 봤다고 어제 만든 내 식단이 사라지면 안 된다. 방문자가 이 식단에서 하루를
   *    바꾸거나 새로 만들면 그때부터 「내 식단」이므로 저장한다.
   *    링크가 깨졌으면 짧게 알리고 평소처럼 내 저장분을 되살린다.
   */
  async function openSharedPlan(param: string) {
    const decoded = decodeSharedPlan(param);
    if (!decoded) {
      setShareInvalid(true);
      restoreSavedPlan();
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "shared", locale, share: param }),
      });
      if (!res.ok) throw new Error("shared");
      const data: GeneratePlanResponse = await res.json();
      applyPlan(data, {
        allergies: decoded.allergies,
        excluded: decoded.excluded,
        prepStyles: decoded.prepStyles,
        thermosOnly: decoded.thermosOnly,
        useSales: decoded.useSales,
        saleStores: decoded.saleStores,
        band: decoded.band ?? DEFAULT_PORTION_BAND,
        extraBoxes: decoded.extraBoxes ?? [],
        lunchDays: decoded.lunchDays ?? [...ALL_LUNCH_DAYS],
      }, false);
      setSharedView(true);
    } catch {
      setShareInvalid(true);
      restoreSavedPlan();
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (planData.length > 0) return;
    const param = new URLSearchParams(window.location.search).get("plan");
    if (param !== null) {
      openSharedPlan(param);
      return;
    }
    restoreSavedPlan();
  }, []);

  /** 이 계획이 이제 방문자의 것이 됐다 — 주소창의 `?plan=`을 걷는다(새로고침하면 남의 식단이 다시 뜬다). */
  function leaveSharedView() {
    setSharedView(false);
    setShareInvalid(false);
    const url = new URL(window.location.href);
    if (url.searchParams.has("plan")) {
      url.searchParams.delete("plan");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  }

  /** 서버가 돌려준 계획을 화면에 올린다. 생성·하루 교체·공유 링크가 같이 쓴다. */
  function applyPlan(data: GeneratePlanResponse, opts: PlanOptions, save: boolean) {
    setPlanData(data.planData);
    // 🔴 카드가 설명할 대상은 방금 만든 이 계획이다 — 이후 체크박스 변경과 분리한다
    setPlanFilters({ allergies: opts.allergies, prepStyles: opts.prepStyles, thermosOnly: opts.thermosOnly });
    setPlanOptions(opts);
    setShoppingList(data.shoppingList);
    setPrices(data.prices ?? {});
    setTotalSavings(data.totalSavings);
    setTotalWeekCost(data.totalWeekCost);
    setShareUrl("");
    setShareLinkState("");
    setSwapNote(null);

    // Save to localStorage for offline access
    if (save) {
      const { allergies, prepStyles, thermosOnly, excluded, useSales, saleStores, band, extraBoxes, lunchDays } = opts;
      try {
        localStorage.setItem("lunchbox-plan", JSON.stringify({
          planData: data.planData,
          shoppingList: data.shoppingList,
          prices: data.prices ?? {},
          totalSavings: data.totalSavings,
          // 🔴 `schema`는 「이 저장분의 간식이 알레르기 필터를 거쳤다」는 표시다.
          //    2026-09-10 이전 저장분에는 없다 — 그때 간식은 필터를 안 거쳤으므로
          //    복원하면 유제품 알레르기 식단에 Cottage Cheese가 되살아난다.
          schema: PLAN_SCHEMA,
          filters: { allergies, prepStyles, thermosOnly, excluded },
          // 특가 토글은 안전 조건이 아니라 가격 조건이라 filters와 따로 둔다 — 복원·하루 교체가 쓴다.
          sale: { useSales, saleStores },
          // 양도 가격 조건이다 — 복원 때 같은 배율로 다시 매긴다.
          portionBand: band,
          extraBoxes,
          lunchDays,
          generatedAt: Date.now(),
        }));
      } catch {}
    }

    // Auto-generate PDF
    setPdfBlob(null);
    fetch("/api/plans/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 안 싸는 날은 PDF에도 싣지 않는다 — 장보기 목록은 서버가 이미 뺐다.
      body: JSON.stringify({ planData: data.planData.filter((d) => !d.off), shoppingList: data.shoppingList }),
    })
      .then(async (pdfRes) => { if (pdfRes.ok) setPdfBlob(await pdfRes.blob()); })
      .catch(() => {});
  }

  function toggleAllergy(a: AllergyType) {
    const next = allergies.includes(a) ? allergies.filter((x) => x !== a) : [...allergies, a];
    // 킨디를 켜면 양도 킨디로 맞춘다(바꿀 수 있다). 끄는 것은 아무것도 되돌리지 않는다.
    setPortionBand((cur) => bandAfterAllergyToggle(allergies, next, cur));
    setAllergies(next);
  }

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    setWarning("");
    setPdfBlob(null);

    try {
      const res = await fetch("/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          allergies,
          excludedIngredients: excluded,
          favoriteIngredients: dbFavorites,
          fridgeLeftover: leftover,
          useSales,
          saleStores: useSales ? saleStores : [],
          prepStyles,
          thermosOnly,
          portionBand,
          extraBoxes,
          lunchDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      applyPlan(data, {
        allergies, excluded, prepStyles, thermosOnly,
        useSales, saleStores: useSales ? saleStores : [],
        band: portionBand,
        extraBoxes,
        lunchDays,
      }, true);
      if (data.warning) setWarning(data.warning);
      setRestored(false);
      leaveSharedView();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setGenerating(false);
    }
  }

  /**
   * 하루(메인 + 그날 간식)만 바꾼다. 선택은 서버가 한다 — 생성과 같은 필터·가중치·
   * 가격 경로를 쓰게(`swapPlanDay`). 필터는 사이드바의 지금 값이 아니라 **이 계획을
   * 만든 조건**(planOptions)이다 — 체크박스만 바꿔 둔 채 누르면 알레르기 조건이 달라진다.
   * 즐겨찾기·남은 재료는 취향이라 지금 값을 쓴다.
   */
  async function handleSwap(dayIndex: number) {
    setSwappingDay(dayIndex);
    setSwapNote(null);
    setError("");
    try {
      const res = await fetch("/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "swap",
          locale,
          dayIndex,
          week: planData.map((d) => ({ menu: d.menuName, snacks: (d.snacks ?? []).map((s) => s.name) })),
          allergies: planOptions.allergies,
          excludedIngredients: planOptions.excluded,
          favoriteIngredients: dbFavorites,
          fridgeLeftover: leftover,
          useSales: planOptions.useSales,
          saleStores: planOptions.useSales ? planOptions.saleStores : [],
          prepStyles: planOptions.prepStyles,
          thermosOnly: planOptions.thermosOnly,
          portionBand: planOptions.band,
          extraBoxes: planOptions.extraBoxes,
          lunchDays: planOptions.lunchDays,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.code === "NO_ALTERNATIVE") {
        setSwapNote({ day: dayIndex, text: t("planner_swap_none") });
        return;
      }
      if (!res.ok) throw new Error(data.error);
      applyPlan(data, planOptions, true);
      setRestored(false);
      leaveSharedView();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to swap");
    } finally {
      setSwappingDay(null);
    }
  }

  async function handleCopyShareLink() {
    const param = encodeSharedPlan({
      days: planData.map((d) => ({ menu: d.menuName, snacks: (d.snacks ?? []).map((s) => s.name) })),
      ...planOptions,
    });
    if (!param) {
      setShareUrl("");
      setShareLinkState("too_long");
      return;
    }
    const url = `${window.location.origin}/${locale}/planner?plan=${param}`;
    setShareUrl(url);
    // 🔴 await 전에 부른다 — iOS Safari는 클릭 직후(사용자 제스처 안)가 아니면 클립보드를 막는다.
    //    http(비보안 컨텍스트)에서는 navigator.clipboard 자체가 없다 → 입력칸으로 보여 준다.
    try {
      await navigator.clipboard.writeText(url);
      setShareLinkState("copied");
    } catch {
      setShareLinkState("manual");
    }
  }

  async function toggleFavorite(name: string) {
    if (!user) { setShowAuth(true); return; }
    const isFav = dbFavorites.includes(name);
    if (isFav) {
      await supabase.from("favorites").delete().eq("name", name);
      setDbFavorites((prev) => prev.filter((f) => f !== name));
    } else {
      await supabase.from("favorites").insert({ name });
      setDbFavorites((prev) => [...prev, name]);
    }
  }

  async function handleSendEmail() {
    if (!emailAddr || !pdfBlob) return;
    setSending(true);
    setEmailMsg("");
    try {
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailAddr, pdfBase64: base64 }),
      });
      const data = await res.json();
      setEmailMsg(res.ok ? t("email_success") : data.error);
    } catch {
      setEmailMsg(t("email_fail"));
    } finally {
      setSending(false);
    }
  }

  async function handleCopyList() {
    const items = Object.entries(ingredientCounts)
      .map(([ing, count]) => `${getIngredientEmoji(ing)} ${ing}${count > 1 ? ` \u00d7${count}` : ""}`)
      .join("\n");
    const text = `🛒 ${t("shopping_list")}\n\n${items}`;
    await navigator.clipboard.writeText(text);
    setListCopied(true);
    setTimeout(() => setListCopied(false), 2000);
  }

  async function handleNativeShare() {
    const shareData: ShareData = {
      title: t("share_plan_text"),
      text: `${t("share_plan_text")}\n\n🛒 ${t("shopping_list")}:\n${shoppingList.slice(0, 10).join(", ")}${shoppingList.length > 10 ? "..." : ""}`,
    };

    if (pdfBlob && navigator.canShare?.({ files: [new File([pdfBlob], "plan.pdf", { type: "application/pdf" })] })) {
      shareData.files = [new File([pdfBlob], "kiwi_lunchbox_plan.pdf", { type: "application/pdf" })];
    }

    try {
      await navigator.share(shareData);
    } catch {}
  }

  function handleWhatsAppShare() {
    const items = shoppingList.slice(0, 15).join(", ");
    const text = `${t("share_plan_text")} 🦘\n\n🛒 ${t("shopping_list")}: ${items}${shoppingList.length > 15 ? "..." : ""}\n\nhttps://aussielunchbox.com/en/planner`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function handleFacebookShare() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://aussielunchbox.com/en/planner")}`, "_blank", "width=600,height=400");
  }

  // Shopping list summary
  const ingredientCounts = shoppingList.reduce<Record<string, number>>((acc, ing) => {
    acc[ing] = (acc[ing] ?? 0) + 1;
    return acc;
  }, {});
  /* 🔴 2026-09-02: 여기서 정가표로 따로 계산하고 있었다. 플랜 카드는 특가를
     적용하는데 쇼핑 목록만 안 해서, 같은 화면의 총액 두 개가 5.6% 어긋났다
     (특가 켬 $20.25 vs $21.38, 특가 끔 $23.65 vs $23.64 — 차이가 정확히 할인액).
     하필 장 보러 갈 때 들고 가는 화면에서만 특가가 안 보였다.
     이제 플랜과 **같은 함수**(effectivePackPrice)를 쓴다. */
  const saleByIngredient = saleMapFor(planData.flatMap((d) => d.saleMatches ?? []));
  /** 레시피 창이 쓰는 할인 맵 — 합계와 **같은 출처**여야 두 값이 어긋나지 않는다. */
  const recipeSales = saleByIngredient;

  /** 간식 재료면 「간식 — 재료」로 쓴다. 이름이 같으면(Rice Crackers) 한 번만. */
  const mayContainLine = (n: MayContainNote) => {
    const word = MAY_CONTAIN_WORD[n.allergy];
    return t("planner_may_contain_item", {
      item: n.snack && n.snack !== n.ingredient ? `${n.snack} — ${n.ingredient}` : n.ingredient,
      allergen: word ? t(word) : n.allergy,
    });
  };

  /** 킨디 손질 안내 한 줄. 문구는 표(`PREPS`)의 id로 messages에서 찾는다. 이름 규칙은 ⚠ 줄과 같다. */
  const kindyItem = (n: KindyPrepNote) => (n.snack && n.snack !== n.ingredient ? `${n.snack} — ${n.ingredient}` : n.ingredient);
  const kindyPrepLine = (n: KindyPrepNote) => t("planner_kindy_prep_item", { item: kindyItem(n), how: t(`kindy_prep_${n.prep}`) });
  const kindyOlderLine = (n: KindyPrepNote) =>
    PREPS[n.prep].older ? t("planner_kindy_prep_older", { how: t(`kindy_prep_${n.prep}_46`) }) : null;

  const catItems = Object.entries(ingredientCounts).reduce<
    Record<
      string,
      { name: string; count: number; emoji: string; price?: number; regularPrice?: number; source?: string }[]
    >
  >((acc, [ing, count]) => {
    const cat = getIngredientCategory(ing);
    if (!acc[cat]) acc[cat] = [];
    const priceInfo = prices[ing];
    const base = priceInfo?.price;
    const effective =
      base !== undefined ? effectivePackPrice(base, saleByIngredient.get(ing)) : undefined;
    acc[cat].push({
      name: ing,
      count,
      emoji: getIngredientEmoji(ing),
      price: effective,
      // 할인이 붙은 경우에만 정가를 남긴다 — 행에 취소선으로 같이 보여 준다.
      regularPrice: base !== undefined && effective !== undefined && effective < base ? base : undefined,
      source: priceInfo?.source,
    });
    return acc;
  }, {});

  const storeLabel = (store: string) =>
    store === "newworld" ? "New World" : store === "woolworths" ? "Woolworths" : "Pak'nSave";

  /** 정가가 전단에 없어 절약액이 0으로 잡히는 마트 목록 (중복 제거) */
  const noRegularPriceStores = [
    ...new Set(
      planData
        .flatMap((d) => d.saleMatches ?? [])
        .filter((m) => m.promotion.savings === 0)
        .map((m) => storeLabel(m.store)),
    ),
  ];

  // 🔴 2026-08-24: 회원 전용가를 그냥 "특가"로 보여주고 있었다. New World 특가는
  // 사실상 전부 Club Plus Deal 이고 Woolworths 에도 Everyday Rewards 회원가가 섞인다.
  // 카드가 없는 사람은 그 값에 못 사는데 화면은 절약액에 그대로 더하고 있었다.
  // 🔴 2026-08-24: salePrice 가 **묶음 단가**인 특가가 있다(전단 멀티바이).
  //    하나만 사면 정가를 낸다. 안 밝히면 절약액이 부풀어 보인다.
  const multibuyOffers = [
    ...new Set(
      planData
        .flatMap((d) => d.saleMatches ?? [])
        .filter((m) => m.promotion.multibuy)
        .map((m) => m.promotion.multibuy as string),
    ),
  ];

  const clubPriceStores = [
    ...new Set(
      planData
        .flatMap((d) => d.saleMatches ?? [])
        .filter((m) => m.promotion.promoType === "club")
        .map((m) => storeLabel(m.store)),
    ),
  ];

  // 이 계획의 몫 — 도시락이 여러 개면 나이대 배율의 합이다. 원가·장보기·레시피 창이 모두 이 값을 쓴다.
  const planPortions = portionsOf(planOptions.band, planOptions.extraBoxes);
  const planBoxes = [planOptions.band, ...planOptions.extraBoxes];
  // 합계·평균이 세는 도시락 수 — 안 싸는 날은 빠진다.
  const lunchDayCount = planData.filter((d) => !d.off).length;

  const totalCost = Object.values(catItems)
    .flat()
    .reduce((sum, item) => sum + (item.price ?? 0) * portionFor(item.name, planPortions) * item.count, 0);

  /**
   * 🔴 2026-09-09 외부 감사 — 화면에 **한 가지 총액만** 있었다. 그 값은 「이번 주 도시락이
   *    쓰는 양」의 합인데, 계산대에서는 팩을 통째로 산다. 찬장이 비어 있으면 실제로 내는
   *    돈은 이보다 훨씬 크고, 그 차이가 화면 어디에도 없었다.
   *
   *    두 값을 나란히 둔다. 위 값은 「쓰는 양」, 이 값은 「사는 양」이다.
   *    같은 팩 가격에서 나오므로 독자가 둘의 관계를 직접 검산할 수 있다.
   */
  const tillTotal = Object.values(catItems)
    .flat()
    .reduce((sum, item) => sum + (item.price ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col lg:flex-row">
      {/* Sidebar — 모바일에서는 플랜 아래로 내린다(order-2). 첫 화면이 설문지가 되면
          "몇 초 만에 한 주 도시락"이라는 약속과 어긋난다. 데스크톱은 기존 그대로. */}
      <aside
        id="planner-filters"
        className="order-2 lg:order-1 w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-r border-gray-100 p-6 flex-shrink-0 scroll-mt-4"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[#6B3600]">🦘 {t("sidebar_header")}</h2>
          {user ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-xs text-gray-500 hover:text-red-500 min-h-touch inline-flex items-center px-2 -mr-2"
            >
              {t("logout")}
            </button>
          ) : (
            // 🔴 로그인은 선택이다(계정 없이 전부 동작). 초록 채움 버튼이면 생성 CTA와
            //    같은 무게로 보여 "가입 불필요" 홍보 문구와 어긋난다 — 외곽선으로 낮춘다.
            <button
              onClick={() => setShowAuth(true)}
              className="text-xs text-gray-500 border border-gray-200 px-3 min-h-touch inline-flex items-center rounded-full hover:border-[#F5A623] hover:text-[#6B3600] transition-colors"
            >
              {t("login")}
            </button>
          )}
        </div>

        {/* Allergies */}
        <details open className="mb-4">
          <summary className="cursor-pointer font-semibold text-sm text-gray-600 py-3">{t("allergies")}</summary>
          <div className="flex flex-wrap gap-2 mt-2">
            {ALLERGY_OPTIONS.map((a) => (
              <button
                key={a}
                onClick={() => toggleAllergy(a)}
                className={`px-3.5 min-h-touch inline-flex items-center rounded-full text-xs border transition-colors ${
                  allergies.includes(a)
                    ? "bg-primary-deep text-white border-[#F5A623]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#F5A623]"
                }`}
              >
                {t(ALLERGY_DISPLAY_KEYS[a])}
              </button>
            ))}
          </div>
          {kindyOn(allergies) && (
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              {t("planner_kindy_sidebar")}{" "}
              <a href={KINDY_GUIDE_URL} target="_blank" rel="noopener noreferrer" className="underline text-[#6B3600]">
                {t("planner_kindy_guide_link")}
              </a>
            </p>
          )}
        </details>

        {/* 나이대별 양 — 메뉴는 그대로, 재료마다 쓰는 몫만 배율을 곱한다(`lib/portionBands.ts`).
            배율은 표에서 계산한 값이고, 화면에 찍는 값과 계산에 쓰는 값이 같다. */}
        <details open className="mb-4">
          <summary className="cursor-pointer font-semibold text-sm text-gray-600 py-3">
            {t("planner_portion_title")}
          </summary>
          <select
            aria-label={t("planner_portion_title")}
            value={portionBand}
            onChange={(e) => setPortionBand(normalizePortionBand(e.target.value))}
            className="w-full min-h-touch border border-gray-200 rounded-lg px-3 py-2 text-sm mt-2 bg-white focus:outline-none focus:border-[#F5A623]"
          >
            {PORTION_BANDS.map((b) => (
              <option key={b} value={b}>
                {t(b === DEFAULT_PORTION_BAND ? "planner_portion_option_standard" : "planner_portion_option", {
                  label: t(`portion_band_${b}`),
                  factor: bandFactorLabel(b),
                })}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">
            {t("planner_portion_note")}{" "}
            <a
              href={PORTION_BAND_SOURCE.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-[#6B3600]"
            >
              {t("planner_portion_source")}
            </a>
          </p>
          {[portionBand, ...extraBoxes].includes("kindy") && !kindyOn(allergies) && (
            <p className="mt-2 text-xs leading-relaxed text-[#1F4466] bg-[#EEF5FB] rounded-lg px-3 py-2">
              {t("planner_portion_kindy_hint", { kindy: t("planner_allergy_kindy"), allergies: t("allergies") })}
            </p>
          )}
        </details>

        {/* 고급 설정 — 같은 식단을 도시락 여러 개로 싼다(2026-10-26 「아이 둘, 나이가 다르다」 문의).
            메뉴는 하나, 양은 도시락마다 그 나이대 배율. 몫 = 배율의 합(`portionsOf`). */}
        <details className="mb-4">
          <summary className="cursor-pointer font-semibold text-sm text-gray-600 py-3">
            {t("planner_advanced_title")}
            {extraBoxes.length > 0 && ` · ${t("planner_boxes_count", { count: String(extraBoxes.length + 1) })}`}
            {lunchDays.some((d) => !d) && ` · ${t("planner_days_count", { count: String(lunchDays.filter(Boolean).length) })}`}
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">{t("planner_boxes_intro")}</p>
          <ol className="mt-3 space-y-2">
            <li className="text-xs text-gray-600">
              {t("planner_boxes_first", { band: t(`portion_band_${portionBand}`) })}
            </li>
            {extraBoxes.map((b, i) => (
              <li key={i} className="flex items-center gap-2">
                <select
                  aria-label={t("planner_boxes_label", { n: String(i + 2) })}
                  value={b}
                  onChange={(e) => {
                    const v = normalizePortionBand(e.target.value);
                    setExtraBoxes((prev) => prev.map((x, j) => (j === i ? v : x)));
                  }}
                  className="flex-1 min-w-0 min-h-touch border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#F5A623]"
                >
                  {PORTION_BANDS.map((o) => (
                    <option key={o} value={o}>
                      {t("planner_boxes_label", { n: String(i + 2) })}: {t(`portion_band_${o}`)} · {bandFactorLabel(o)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setExtraBoxes((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={t("planner_boxes_remove", { n: String(i + 2) })}
                  className="min-h-touch min-w-touch inline-flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-[#F5A623]"
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
          {extraBoxes.length + 1 < MAX_LUNCHBOXES && (
            <button
              type="button"
              onClick={() => setExtraBoxes((prev) => [...prev, DEFAULT_PORTION_BAND])}
              className="mt-3 px-3.5 min-h-touch inline-flex items-center rounded-full text-xs border border-gray-200 bg-white text-[#6B3600] hover:border-[#F5A623]"
            >
              {t("planner_boxes_add")}
            </button>
          )}

          {/* 도시락을 싸는 요일 — 급식 날·주 3일 킨디. 마지막 하나는 끌 수 없다. */}
          <p className="mt-5 font-semibold text-xs text-gray-600">{t("planner_days_title")}</p>
          <div className="flex flex-wrap gap-2 mt-2" role="group" aria-label={t("planner_days_title")}>
            {DAY_KEYS.map((k, i) => (
              <button
                key={k}
                type="button"
                aria-pressed={lunchDays[i]}
                disabled={lunchDays[i] && lunchDays.filter(Boolean).length === 1}
                onClick={() => setLunchDays((prev) => prev.map((on, j) => (j === i ? !on : on)))}
                className={`px-3.5 min-h-touch min-w-touch inline-flex items-center justify-center rounded-full text-xs border transition-colors disabled:opacity-60 ${
                  lunchDays[i]
                    ? "bg-primary-deep text-white border-[#F5A623]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#F5A623]"
                }`}
              >
                {t(k)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">{t("planner_days_note")}</p>
        </details>

        {/* Prep style & thermos */}
        <details open className="mb-4">
          <summary className="cursor-pointer font-semibold text-sm text-gray-600 py-3">{t("planner_prep_title")}</summary>
          <div className="flex flex-wrap gap-2 mt-2">
            {PREP_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() =>
                  setPrepStyles((prev) =>
                    prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
                  )
                }
                className={`px-3.5 min-h-touch inline-flex items-center rounded-full text-xs border transition-colors ${
                  prepStyles.includes(p)
                    ? "bg-primary-deep text-white border-[#F5A623]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#F5A623]"
                }`}
              >
                {t(PREP_DISPLAY_KEYS[p])}
              </button>
            ))}
            <button
              onClick={() => setThermosOnly((v) => !v)}
              className={`px-3.5 min-h-touch inline-flex items-center rounded-full text-xs border transition-colors ${
                thermosOnly
                  ? "bg-[#E67E22] text-white border-[#E67E22]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#E67E22]"
              }`}
            >
              🫙 {t("planner_prep_thermos")}
            </button>
          </div>
        </details>

        {/* Exclude Ingredients */}
        <details className="mb-4">
          <summary className="cursor-pointer font-semibold text-sm text-gray-600 py-3">{t("exclude")}</summary>
          <div className="flex flex-wrap gap-2 mt-2 max-h-64 overflow-y-auto">
            {allIngredients.map((ing) => (
              <button
                key={ing}
                onClick={() =>
                  setExcluded((prev) =>
                    prev.includes(ing) ? prev.filter((x) => x !== ing) : [...prev, ing]
                  )
                }
                className={`px-3 min-h-touch min-w-touch inline-flex items-center justify-center rounded text-xs border transition-colors ${
                  excluded.includes(ing)
                    ? "bg-red-100 text-red-700 border-red-200"
                    : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
                }`}
              >
                {ing}
              </button>
            ))}
          </div>
        </details>

        {/* Fridge Leftover */}
        <details className="mb-4">
          <summary className="cursor-pointer font-semibold text-sm text-gray-600 py-3">{t("leftovers")}</summary>
          <input
            type="text"
            value={leftover}
            onChange={(e) => setLeftover(e.target.value)}
            placeholder={t("leftovers_placeholder")}
            className="w-full min-h-touch border border-gray-200 rounded-lg px-3 py-2 text-sm mt-2 focus:outline-none focus:border-[#F5A623]"
          />
        </details>

        {/* Saved Favorites */}
        {user && dbFavorites.length > 0 && (
          <details className="mb-4">
            <summary className="cursor-pointer font-semibold text-sm text-gray-600 py-3">{t("favorites")}</summary>
            <ul className="mt-2 space-y-1">
              {dbFavorites.map((f) => (
                <li key={f} className="text-sm text-gray-600 flex items-center gap-1">
                  <span>❤️</span> {f}
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* This Week's Sales — NZ supermarket promotions (default open: 핵심 차별화) */}
        <details className="mb-6 bg-[#FFF7EC] border border-[#F5A623]/40 rounded-xl p-3" open>
          <summary className="cursor-pointer font-bold text-sm text-[#6B3600] py-3">
            🔖 {t("sale_section_title")}
          </summary>
          <div className="mt-2 space-y-3 text-sm">
            <label className="flex items-start gap-2 cursor-pointer min-h-touch py-1">
              <input
                type="checkbox"
                checked={useSales}
                onChange={(e) => setUseSales(e.target.checked)}
                disabled={!salesActive}
                className="rounded mt-1 w-5 h-5 disabled:opacity-40"
              />
              <span className={salesActive ? "text-gray-700" : "text-gray-500"}>
                {t("sale_toggle_label")}
              </span>
            </label>
            <p className="text-xs text-gray-600 leading-relaxed pl-6">
              {salesActive ? t("sale_toggle_hint") : t("sale_unavailable")}
            </p>
            {useSales && (
              <div className="pl-6 space-y-2">
                <p className="text-xs font-semibold text-gray-600">
                  {t("sale_store_label")}
                </p>
                {([
                  { id: "woolworths" as StoreId, label: t("sale_store_woolworths") },
                  { id: "newworld" as StoreId, label: t("sale_store_newworld") },
                ]).map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer min-h-touch"
                  >
                    <input
                      type="checkbox"
                      checked={saleStores.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSaleStores([...saleStores, s.id]);
                        } else {
                          setSaleStores(saleStores.filter((x) => x !== s.id));
                        }
                      }}
                      className="rounded w-5 h-5"
                    />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </details>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="min-h-touch flex items-center justify-center w-full bg-primary-deep hover:bg-[#6B3600] text-white font-bold py-3 rounded-xl transition-colors mt-4 disabled:opacity-60"
        >
          {generating ? t("generating") : t("generate_btn")}
        </button>

        {/* 주간 비용 — 정가와 특가 적용을 같이 보여준다.
            🔴 특가를 기본으로 켜면서 화면 숫자가 정가 기준 $4 중앙값보다 낮아진다.
            한 줄만 보여주면 글·학교 안내문의 $4와 어긋난 것처럼 읽힌다. */}
        {typeof totalWeekCost === "number" && totalWeekCost > 0 && (
          <div className="mt-6 bg-[#FFF7EC] border border-[#F5A623]/50 rounded-xl p-4 text-xs">
            <p className="text-gray-600">
              {t("cost_regular_label")}:{" "}
              <span className={totalSavings ? "line-through text-gray-500" : "font-semibold text-[#6B3600]"}>
                ${(totalWeekCost + (totalSavings ?? 0)).toFixed(2)}
              </span>
            </p>
            {typeof totalSavings === "number" && totalSavings > 0 && (
              <>
                <p className="font-semibold text-[#6B3600] mt-1">
                  {t("cost_with_specials_label")}: ${totalWeekCost.toFixed(2)}
                </p>
                <p className="text-[#8C4A00] font-semibold mt-1">
                  🔖 {t("sale_savings_label")}: ${totalSavings.toFixed(2)}
                </p>
              </>
            )}
            {/* 절약액이 0인 특가가 섞여 있으면 이유를 밝힌다.
                New World 전단은 정가를 인쇄하지 않아 salePrice = regularPrice 로 들어간다.
                그대로 두면 "특가 5건인데 절약 0"으로 보여서 기능이 고장난 것처럼 읽힌다. */}
            {noRegularPriceStores.length > 0 && (
              <p className="text-gray-500 mt-2 leading-relaxed">
                {t("sale_no_regular_price", { stores: noRegularPriceStores.join(", ") })}
              </p>
            )}
            {multibuyOffers.length > 0 && (
              <p className="text-gray-500 mt-2 leading-relaxed">
                {t("sale_multibuy_note", { offers: multibuyOffers.join(", ") })}
              </p>
            )}
            {clubPriceStores.length > 0 && (
              <p className="text-gray-500 mt-2 leading-relaxed">
                {t("sale_club_price_note", { stores: clubPriceStores.join(", ") })}
              </p>
            )}
            <p className="text-gray-500 mt-2 leading-relaxed">
              {t("sale_pricing_disclaimer")}
            </p>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="order-1 lg:order-2 flex-1 p-6 lg:p-10 overflow-y-auto">
        <h1 className="text-3xl font-bold text-[#6B3600] mb-2">{t("title")}</h1>
        <p className="text-gray-500 mb-8">{t("subtitle")}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>
        )}
        {warning && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl p-4 mb-6">{warning}</div>
        )}
        {restored && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-4 mb-6 flex items-center justify-between">
            <span>📱 {t("planner_restored")}</span>
            <button onClick={() => setRestored(false)} className="min-h-touch inline-flex items-center justify-center text-blue-400 hover:text-blue-600 text-sm font-medium">{t("planner_restore_dismiss")}</button>
          </div>
        )}
        {/* 🔴 2026-09-10 외부 감사 — 09-10 이전 저장분의 간식은 알레르기 필터를 거치지
            않았다. 조용히 버리면 사용자는 저장이 사라진 이유를 모른다. */}
        {stalePlan && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 mb-6 flex items-start justify-between gap-3">
            <span className="leading-relaxed">⚠️ {t("planner_saved_plan_discarded")}</span>
            <button onClick={() => setStalePlan(false)} className="min-h-touch inline-flex items-center justify-center text-amber-500 hover:text-amber-700 text-sm font-medium flex-shrink-0">{t("planner_restore_dismiss")}</button>
          </div>
        )}
        {sharedView && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 mb-6 flex items-start justify-between gap-3">
            <span className="leading-relaxed">🔗 {t("planner_shared_notice")}</span>
            <button onClick={() => setSharedView(false)} className="min-h-touch inline-flex items-center justify-center text-blue-400 hover:text-blue-600 text-sm font-medium flex-shrink-0">{t("planner_restore_dismiss")}</button>
          </div>
        )}
        {shareInvalid && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 mb-6 flex items-start justify-between gap-3">
            <span className="leading-relaxed">⚠️ {t("planner_shared_invalid")}</span>
            <button onClick={() => setShareInvalid(false)} className="min-h-touch inline-flex items-center justify-center text-amber-500 hover:text-amber-700 text-sm font-medium flex-shrink-0">{t("planner_restore_dismiss")}</button>
          </div>
        )}

        {/* Plan Grid */}
        {planData.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-[#6B3600] mb-4">📅 {t("weekly_plan")}</h2>

            {/* Weekly total cost headline */}
            {(() => {
              // 🔴 합계 식은 `weekTotalFrom`에 있다 (2026-09-10 외부 감사 5번).
              //    여기서 카드에 찍힌 문자열을 파싱해 더하다가 장보기 합계와
              //    1센트 어긋났다. 식을 라이브러리에 두어야 가드가 진짜로 지킨다.
              const total = weekTotalFrom(planData);
              if (total === null) return null;
              return (
                <div className="bg-[#6B3600] text-white rounded-2xl px-6 py-4 mb-6 flex items-center gap-3">
                  <span className="text-2xl">💰</span>
                  <span className="font-bold text-lg">
                    {planBoxes.length > 1
                      ? t("planner_week_total_boxes", {
                          total: `$${total.toFixed(2)}`,
                          count: String(lunchDayCount * planBoxes.length),
                          boxes: String(planBoxes.length),
                          avg: `$${(total / (lunchDayCount * planBoxes.length)).toFixed(2)}`,
                        })
                      : lunchDayCount < planData.length
                      ? t("planner_week_total_days", {
                          total: `$${total.toFixed(2)}`,
                          count: String(lunchDayCount),
                          avg: `$${(total / lunchDayCount).toFixed(2)}`,
                        })
                      : t("planner_week_total", {
                          total: `$${total.toFixed(2)}`,
                          avg: `$${(total / planData.length).toFixed(2)}`,
                        })}
                  </span>
                </div>
              );
            })()}

            {/* 기준(5–12세)이 아니면 이 계획의 금액이 배율을 곱한 값이라는 것을 합계 바로 아래에 말한다 */}
            {planOptions.extraBoxes.length > 0 ? (
              <p className="mb-6 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-[#6B3600]">
                {t("planner_boxes_plan_line", {
                  count: String(planBoxes.length),
                  boxes: boxesList(planBoxes, t),
                  factor: portionsLabel(planPortions),
                })}
              </p>
            ) : planOptions.band !== DEFAULT_PORTION_BAND && (
              <p className="mb-6 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-[#6B3600]">
                {t("planner_portion_plan_line", {
                  band: t(`portion_band_${planOptions.band}`),
                  factor: bandFactorLabel(planOptions.band),
                })}
              </p>
            )}

            {/* 🔴 ⚠가 없는 카드를 「교차오염 없음」으로 읽지 않게 — 라벨로 판정되는 알레르기를 골랐으면 늘 싣는다 */}
            {planOptions.allergies.some((a) => ALLERGY_TAG[a]) && (
              <p className="mb-6 rounded-xl border border-[#E0A800]/60 bg-[#FFF8E1] px-4 py-3 text-sm leading-relaxed text-[#6B4700]">
                {t("planner_may_contain_note")}
              </p>
            )}

            {/* 킨디: 뺀 것·손질 안내·양이 5–12세 기준이라는 것을 함께 말한다 */}
            {kindyOn(planOptions.allergies) && (
              <p className="mb-6 rounded-xl border border-[#4A7FB5]/50 bg-[#EEF5FB] px-4 py-3 text-sm leading-relaxed text-[#1F4466]">
                {t("planner_kindy_note")}{" "}
                {/* 도시락이 여러 개면 나이대는 위 줄이 이미 도시락별로 말했다 */}
                {planOptions.extraBoxes.length > 0
                  ? null
                  : planOptions.band === "kindy"
                    ? t("planner_kindy_portion_kindy", { factor: bandFactorLabel("kindy") })
                    : t("planner_kindy_portion_other", { band: t(`portion_band_${planOptions.band}`) })}{" "}
                <a href={KINDY_GUIDE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                  {t("planner_kindy_guide_link")}
                </a>
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
              {planData.map((item, dayIndex) => item.off ? (
                // 안 싸는 날 — 메뉴는 남겨 두지만(요일을 다시 켜면 같은 메뉴) 금액·교체 버튼은 보이지 않는다.
                <div key={item.day} className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/60 p-6 flex flex-col justify-center">
                  <p className="font-bold text-gray-500">{t(DAY_KEYS[dayIndex])}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-600">{t("planner_day_off")}</p>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">{t("planner_day_off_note")}</p>
                </div>
              ) : (
                <div key={item.day} className="bg-white rounded-2xl shadow overflow-hidden flex flex-col">
                  {/* Image */}
                  <div className="relative w-full h-44 bg-gray-100 flex items-center justify-center overflow-hidden">
                    {item.image && !item.image.startsWith("assets/") ? (
                      <Image
                        src={item.image}
                        alt={item.menuName}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      />
                    ) : (
                      <span className="text-6xl">🥗</span>
                    )}
                  </div>

                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-bold text-[#6B3600] text-base leading-tight">{item.menuName}</h3>
                      <button
                        onClick={() => toggleFavorite(item.menuName)}
                        aria-pressed={dbFavorites.includes(item.menuName)}
                        aria-label={`${t("favorite_toggle")}: ${item.menuName}`}
                        className="text-xl -mr-2 flex-shrink-0 min-h-touch min-w-touch flex items-center justify-center"
                      >
                        {dbFavorites.includes(item.menuName) ? "❤️" : "🤍"}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500 font-medium">{item.day}</span>
                      <span className="text-xs bg-[#FFF3E0] text-[#6B3600] px-2 py-0.5 rounded-full">{item.category}</span>
                      {item.cuisine && (
                        <span className="text-xs bg-[#F1EDF7] text-[#5B4B7A] px-2 py-0.5 rounded-full">
                          {t(`cuisine_${item.cuisine}`)}
                        </span>
                      )}
                      {item.prepStyle && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {t(PREP_BADGE_KEYS[item.prepStyle])}
                        </span>
                      )}
                      {item.isThermos && (
                        <span className="text-xs bg-[#FDF2E5] text-[#B35C00] px-2 py-0.5 rounded-full" title={t("planner_prep_thermos")}>
                          🫙
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.description}</p>

                    {/* Snacks */}
                    {item.snacks?.length > 0 && (
                      <div className="text-xs text-gray-500 mb-3">
                        🍎 {item.snacks.map((s) => (s.keepCold ? `${s.name} 🧊` : s.name)).join(" • ")}
                      </div>
                    )}

                    {/* ⚠ may contain — 서버(`assembleWeek`)·복원이 채운 목록을 그리기만 한다 */}
                    {item.mayContain && item.mayContain.length > 0 && (
                      <ul className="mb-3 space-y-1 rounded-lg border border-[#E0A800] bg-[#FFF8E1] px-3 py-2 text-xs font-medium text-[#8A5A00]">
                        {item.mayContain.map((n) => (
                          <li key={`${n.snack ?? ""}:${n.ingredient}:${n.allergy}`}>⚠ {mayContainLine(n)}</li>
                        ))}
                      </ul>
                    )}

                    {/* ✂️ 킨디 손질 — 서버(`assembleWeek`)·복원이 채운 목록을 그리기만 한다. 4–6세 대안은 레시피 창에 */}
                    {item.kindyPrep && item.kindyPrep.length > 0 && (
                      <div className="mb-3 rounded-lg border border-[#4A7FB5]/60 bg-[#EEF5FB] px-3 py-2 text-xs text-[#1F4466]">
                        <p className="font-semibold mb-1">✂️ {t("planner_kindy_prep_title")}</p>
                        <ul className="space-y-1">
                          {item.kindyPrep.map((n) => (
                            <li key={`${n.snack ?? ""}:${n.ingredient}:${n.prep}`}>{kindyPrepLine(n)}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Sale matches — 이번 주 sale 식재료 표시 */}
                    {item.saleMatches && item.saleMatches.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1">
                        {item.saleMatches.slice(0, 3).map((m) => (
                          <span
                            key={`${m.store}:${m.promotion.matchKey}`}
                            className="text-[11px] bg-[#FFF7EC] text-[#6B3600] border border-[#F5A623]/50 rounded-full px-2 py-0.5 leading-tight"
                            title={`${m.promotion.name} — $${m.promotion.salePrice} (was $${m.promotion.regularPrice})`}
                          >
                            🔖 {m.ingredient}
                          </span>
                        ))}
                        {item.saleMatches.length > 3 && (
                          <span className="text-[11px] text-gray-500 px-1">
                            +{item.saleMatches.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between">
                      {/* 금액 옆에 산정 근거를 명시한다. 사진은 완성된 도시락을 보여주는데
                          금액은 재료만 반영하다 보니 "사진의 주스박스·과일은 왜 빠졌냐"는
                          지적을 받았다. 무엇이 포함된 값인지 화면에서 바로 알 수 있어야 한다. */}
                      <span
                        className="font-bold text-[#6B3600] border-b border-dotted border-gray-300 cursor-help"
                        title={t("planner_cost_basis")}
                      >
                        {item.estCost}
                      </span>
                      <button
                        onClick={() => setActiveRecipe(item)}
                        className="text-sm bg-[#FFF3E0] text-[#6B3600] px-3 min-h-touch inline-flex items-center rounded-lg hover:bg-primary-deep hover:text-white transition-colors"
                      >
                        {t("view_recipe")}
                      </button>
                    </div>
                    <button
                      onClick={() => handleSwap(dayIndex)}
                      disabled={swappingDay !== null}
                      aria-label={`${t("planner_swap_day")}: ${item.day}`}
                      className="mt-2 min-h-touch inline-flex items-center justify-center w-full text-sm border border-gray-200 text-gray-600 rounded-lg hover:border-[#F5A623] hover:text-[#6B3600] transition-colors disabled:opacity-50"
                    >
                      {swappingDay === dayIndex ? t("planner_swapping") : `🔄 ${t("planner_swap_day")}`}
                    </button>
                    {swapNote?.day === dayIndex && (
                      <p role="status" className="mt-2 text-xs text-amber-700 leading-relaxed">{swapNote.text}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 모바일에서만: 순서를 뒤집으면서 필터가 카드 전부 아래(y=5,809)로 갔다.
                카드를 다 읽은 자리에 앵커를 둔다 — 첫 화면 위에 두면 정작 플랜을
                밀어내서(Monday 659→839) 이번 작업의 목적과 어긋난다. */}
            <a
              href="#planner-filters"
              className="lg:hidden flex items-center justify-center gap-2 w-full border border-[#F5A623] text-[#6B3600] font-semibold py-3 rounded-xl mb-10 hover:bg-[#FFF7EC] transition-colors"
            >
              ⚙️ {t("sidebar_header")}
            </a>

            {/* Prep game plan — grouped by prep_style */}
            {planData.some((p) => p.prepStyle && !p.off) && (
              <div className="bg-white rounded-2xl shadow p-6 mb-10">
                <h2 className="text-xl font-bold text-[#6B3600] mb-4">🗓️ {t("planner_prep_summary_title")}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {([
                    ["make-ahead", "planner_prep_summary_ahead", "🍳"],
                    ["cook-fresh", "planner_prep_summary_fresh", "🔥"],
                    ["no-cook", "planner_prep_summary_nocook", "🥪"],
                  ] as const).map(([style, labelKey, emoji]) => {
                    const items = planData.filter((p) => p.prepStyle === style && !p.off);
                    if (!items.length) return null;
                    return (
                      <div key={style} className="bg-[#F7F9FC] rounded-xl p-4">
                        <p className="font-semibold text-[#6B3600] mb-2">{emoji} {t(labelKey)}</p>
                        <ul className="space-y-1 text-gray-600">
                          {items.map((p) => (
                            <li key={p.day}>
                              <span className="text-gray-500">{p.day.slice(0, 3)}</span> — {p.menuName}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
                {planData.some((p) => p.isThermos && !p.off) && (
                  <p className="mt-4 text-sm text-[#B35C00] bg-[#FDF2E5] rounded-xl px-4 py-2">
                    🫙 {t("planner_prep_summary_thermos")}:{" "}
                    {planData.filter((p) => p.isThermos && !p.off).map((p) => p.menuName).join(", ")}
                  </p>
                )}
              </div>
            )}

            {/* 어른 몫 안내.
                🔴 2026-09-01: 한 사용자가 자발적으로 이렇게 썼다 — 도시락 싸는 게
                매주 힘든데 "정작 내 점심은 눅눅한 상추와 오래된 빵"이라고. 사이트의
                어떤 문구도 그 상황을 다루지 않고 있었다.
                메뉴를 새로 만들지 않는다. 이미 만드는 것을 조금 더 만들면 된다는 사실만
                말한다. 다만 위의 통당 금액은 아이 기준이므로 어른 몫이 더 든다는 것을
                같이 적는다 — 안 적으면 우리 숫자로 잘못된 예산을 짜게 된다. */}
            <div className="bg-[#FFF3E0] rounded-2xl p-6 mb-10">
              <h2 className="text-lg font-bold text-[#6B3600] mb-2">
                🥪 {t("planner_adult_note_title")}
              </h2>
              <p className="text-sm text-[#6B3600] leading-relaxed">
                {t("planner_adult_note_body")}
              </p>
            </div>

            {/* Export, Share & Email */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white rounded-2xl shadow p-6 flex flex-col">
                <h3 className="font-bold text-[#6B3600] mb-3">📥 {t("download_pdf")}</h3>
                <div className="flex-1 flex flex-col justify-end">
                  {pdfBlob ? (
                    <a
                      href={URL.createObjectURL(pdfBlob)}
                      download="kiwi_lunchbox_plan.pdf"
                      className="block w-full bg-primary-deep hover:bg-[#6B3600] text-white font-bold py-3 rounded-xl text-center transition-colors"
                    >
                      ⬇️ {t("download_pdf")}
                    </a>
                  ) : (
                    <div className="text-gray-500 text-sm py-3">{t("planner_generating_pdf")}</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow p-6 flex flex-col">
                <h3 className="font-bold text-[#6B3600] mb-3">📤 {t("share_title")}</h3>
                <div className="flex-1 flex flex-col gap-2 justify-end">
                  <button
                    onClick={handleCopyList}
                    className="min-h-touch flex items-center justify-center w-full bg-[#FFF3E0] text-[#6B3600] font-bold py-3 rounded-xl hover:bg-primary-deep hover:text-white transition-colors"
                  >
                    {listCopied ? `✅ ${t("share_copied")}` : `📋 ${t("share_copy_list")}`}
                  </button>
                  {typeof navigator !== "undefined" && "share" in navigator && (
                    <button
                      onClick={handleNativeShare}
                      className="min-h-touch flex items-center justify-center w-full bg-primary-deep hover:bg-[#6B3600] text-white font-bold py-3 rounded-xl transition-colors"
                    >
                      📤 {t("share_native")}
                    </button>
                  )}
                  <button
                    onClick={handleCopyShareLink}
                    className="min-h-touch flex items-center justify-center w-full bg-[#FFF3E0] text-[#6B3600] font-bold py-3 rounded-xl hover:bg-primary-deep hover:text-white transition-colors"
                  >
                    {shareLinkState === "copied" ? `✅ ${t("planner_share_link_copied")}` : `🔗 ${t("planner_share_link_btn")}`}
                  </button>
                  {shareLinkState === "too_long" && (
                    <p role="status" className="text-xs text-amber-700 leading-relaxed">{t("planner_share_link_too_long")}</p>
                  )}
                  {/* 클립보드가 막힌 환경(비보안 http·일부 인앱 브라우저)에서도 링크를 가져갈 수 있게 칸으로 보여 준다. */}
                  {shareUrl && (
                    <div>
                      {shareLinkState === "manual" && (
                        <p role="status" className="text-xs text-gray-600 mb-1">{t("planner_share_link_manual")}</p>
                      )}
                      <input
                        type="text"
                        readOnly
                        value={shareUrl}
                        aria-label={t("planner_share_link_btn")}
                        onFocus={(e) => e.currentTarget.select()}
                        onClick={(e) => e.currentTarget.setSelectionRange(0, e.currentTarget.value.length)}
                        className="w-full min-h-touch border border-gray-200 rounded-lg px-3 text-xs text-gray-700 bg-gray-50"
                      />
                    </div>
                  )}
                  <div className="flex gap-2 mt-1">
                    <button onClick={handleWhatsAppShare} className="min-h-touch flex items-center justify-center flex-1 bg-[#25D366] text-white font-bold py-2 rounded-xl text-sm hover:opacity-90 transition-opacity">
                      {t("share_whatsapp")}
                    </button>
                    <button onClick={handleFacebookShare} className="min-h-touch flex items-center justify-center flex-1 bg-[#1877F2] text-white font-bold py-2 rounded-xl text-sm hover:opacity-90 transition-opacity">
                      {t("share_facebook")}
                    </button>
                  </div>

                  {/*
                    🔴 팔로우 유도를 **여기** 둔 이유 (2026-08-13):
                    헤더에 소셜 아이콘을 올리자는 안이 있었는데, 헤더는 사람을 **안으로**
                    들이는 자리다. 맨 위에 나가는 문을 만들면 아직 플래너를 써 보지도 않은
                    사람을 가로챈다 — 그것도 팔로워 15명짜리 계정으로.
                    이 자리는 **플랜을 막 받아 든 직후**, 즉 가치를 이미 얻은 사람만 본다.
                    푸터(모든 페이지 하단)와 함께 두 자리면 충분하다.
                  */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500 leading-snug">{t("share_follow")}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={SOCIAL.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Aussie Lunchbox on Instagram"
                        className="text-gray-500 hover:text-[#6B3600] transition-colors min-h-touch min-w-touch inline-flex items-center justify-center -m-2"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5" fill="currentColor">
                          <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 1.44c-3.14 0-3.51.01-4.75.07-1.15.05-1.77.24-2.18.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.35 1.03-.4 2.18-.06 1.24-.07 1.61-.07 4.75s.01 3.51.07 4.75c.05 1.15.24 1.77.4 2.18.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.35 2.18.4 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c1.15-.05 1.77-.24 2.18-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.35-1.03.4-2.18.06-1.24.07-1.61.07-4.75s-.01-3.51-.07-4.75c-.05-1.15-.24-1.77-.4-2.18-.21-.55-.47-.94-.88-1.35-.41-.41-.8-.67-1.35-.88-.41-.16-1.03-.35-2.18-.4-1.24-.06-1.61-.07-4.75-.07Zm0 2.45a5.95 5.95 0 1 1 0 11.9 5.95 5.95 0 0 1 0-11.9Zm0 9.81a3.86 3.86 0 1 0 0-7.72 3.86 3.86 0 0 0 0 7.72Zm7.58-10.05a1.39 1.39 0 1 1-2.78 0 1.39 1.39 0 0 1 2.78 0Z" />
                        </svg>
                      </a>
                      <a
                        href={SOCIAL.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Aussie Lunchbox on Facebook"
                        className="text-gray-500 hover:text-[#6B3600] transition-colors min-h-touch min-w-touch inline-flex items-center justify-center -m-2"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5" fill="currentColor">
                          <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.19 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22c4.78-.75 8.44-4.92 8.44-9.94Z" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow p-6 flex flex-col">
                <h3 className="font-bold text-[#6B3600] mb-3">✉️ {t("planner_email_title")}</h3>
                <div className="flex-1 flex flex-col justify-end">
                  {!user ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      🔒 {t("email_login_required")}
                    </p>
                  ) : (
                    <>
                      <input
                        type="email"
                        value={emailAddr}
                        onChange={(e) => setEmailAddr(e.target.value)}
                        placeholder={t("email_placeholder")}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm mb-3 focus:outline-none focus:border-[#F5A623]"
                      />
                      <button
                        onClick={handleSendEmail}
                        disabled={sending || !pdfBlob}
                        className="min-h-touch flex items-center justify-center w-full bg-primary-deep hover:bg-[#6B3600] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                      >
                        {sending ? t("planner_sending") : t("email_btn")}
                      </button>
                      {emailMsg && <p className="text-sm mt-2 text-gray-600">{emailMsg}</p>}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Shopping List */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#6B3600]">{t("shopping_list")}</h2>
              {totalCost > 0 && (
                <span className="bg-[#FFF3E0] text-[#6B3600] font-bold px-4 py-1.5 rounded-full text-sm">
                  {t("planner_est_total")} ${totalCost.toFixed(2)}
                </span>
              )}
            </div>
            {totalCost > 0 && (
              <div className="mb-4 rounded-2xl border border-gray-200 bg-white px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-sm text-gray-600">{t("planner_used_basis")}</span>
                  <span className="font-bold text-[#6B3600]">${totalCost.toFixed(2)}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-sm text-gray-600">{t("planner_till_basis")}</span>
                  <span className="font-bold text-[#6B3600]">${tillTotal.toFixed(2)}</span>
                </div>
                <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                  {t("planner_two_totals_note")}
                </p>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              {/* Column header */}
              <div className="grid grid-cols-[1fr_auto] gap-2 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <span>{t("planner_ingredient_col")}</span>
                <span className="text-right">{t("planner_portion_col")}</span>
              </div>
              {Object.entries(catItems).map(([cat, items]) => (
                <div key={cat}>
                  <div className="px-5 py-2 bg-[#F5F7FA] border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {CATEGORY_EMOJIS[cat] ?? "🛒"} {cat}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {items.sort((a, b) => a.name.localeCompare(b.name)).map((item) => {
                      const portion = portionFor(item.name, planPortions);
                      const portionCost = item.price !== undefined ? item.price * portion : undefined;
                      const totalItemCost = portionCost !== undefined ? portionCost * item.count : undefined;
                      return (
                        <div key={item.name} className="flex items-center gap-3 px-5 py-2.5">
                          <span className="text-xl w-7 flex-shrink-0 text-center">{item.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-800 font-medium">{item.name}</span>
                            {item.count > 1 && (
                              <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">×{item.count}</span>
                            )}
                          </div>
                          {item.price !== undefined && (
                            <div className="text-right flex-shrink-0 space-y-0.5">
                              <div className="flex items-center justify-end gap-1.5">
                                {item.regularPrice !== undefined && (
                                  <span className="text-xs text-gray-400 line-through">
                                    ${item.regularPrice.toFixed(2)}
                                  </span>
                                )}
                                <span
                                  className={`text-xs ${item.regularPrice !== undefined ? "text-[#F5A623] font-semibold" : "text-gray-500"}`}
                                >
                                  ${item.price.toFixed(2)}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  item.source === "Woolworths Australia"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}>
                                  {/* 🔴 "Live"는 거짓 — 가격은 주 1회 갱신 캐시다(lib/supermarketApi.ts). */}
                                  {item.source === "Woolworths Australia" ? "Weekly" : "Est."}
                                </span>
                              </div>
                              {totalItemCost !== undefined && (
                                <div className="text-sm font-bold text-[#6B3600]">
                                  ${totalItemCost.toFixed(2)}
                                  <span className="text-xs font-normal text-gray-500 ml-1">portion</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* 🔴 플래너에서 글로 나가는 유일한 길이다. 지우면 링크가 다시 0이 된다. */}
            {(() => {
              const links = relatedPosts(planFilters);
              // 🔴 켠 필터가 아니라 **나온 결과**로 판정한다. 글이 없는 필터(Dairy 등)를
              //    켜면 폴백이 나오는데, 그 위에 "필터에 맞춰"라고 쓰면 거짓말이 된다.
              const filtered = matchedFilters(planFilters);
              return (
                <div className="mt-10">
                  <h2 className="text-xl font-bold text-[#6B3600] mb-1">
                    {filtered ? t("planner_read_next_filtered") : t("planner_read_next")}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-3 mt-4">
                    {links.map((l) => {
                      const meta = articleMeta[l.slug];
                      if (!meta) return null;
                      return (
                        <Link
                          key={l.slug}
                          href={articleHref(locale, l)}
                          className="block bg-white rounded-2xl shadow p-4 hover:shadow-md transition-shadow"
                        >
                          <p className="text-xs font-bold text-[#F5A623] uppercase tracking-wide">
                            {meta.category}
                          </p>
                          <p className="font-bold text-[#6B3600] mt-1 leading-snug">
                            {meta.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">{meta.readTime}</p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {planData.length === 0 && !generating && (
          <div>
            {/* Desktop: subtle pointer to sidebar button */}
            <div className="hidden lg:flex items-center gap-2 mb-5 bg-[#FFF3E0] border border-[#F5A623]/30 rounded-xl px-4 py-3 text-sm text-[#6B3600]">
              <span className="text-lg">👈</span>
              <span>{t("planner_desktop_hint")}</span>
            </div>
            {/* 모바일에서만: 필터는 플랜 아래(Kindy 버튼 y≈3,319)라 유치원이 「under 5 메뉴에 못 들어간다」고
                회신했다(10-20 Stoke). 유치원 메일이 「Tick Kindy」라고 안내하므로 그 하나만 CTA 위에 같은 상태로 둔다. */}
            <div className="lg:hidden flex items-center justify-between gap-3 mb-3">
              <button
                onClick={() => toggleAllergy("Kindy")}
                aria-pressed={allergies.includes("Kindy")}
                className={`px-4 min-h-touch inline-flex items-center rounded-full text-sm border transition-colors ${
                  allergies.includes("Kindy")
                    ? "bg-primary-deep text-white border-[#F5A623]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#F5A623]"
                }`}
              >
                {allergies.includes("Kindy") ? "✓ " : ""}{t("planner_allergy_kindy")}
              </button>
              <a href="#planner-filters" className="text-sm text-[#6B3600] underline min-h-touch inline-flex items-center">
                {t("planner_mobile_more_options")}
              </a>
            </div>
            {/* Mobile: button-style CTA */}
            <button
              onClick={handleGenerate}
              className="min-h-touch flex items-center justify-center lg:hidden w-full bg-primary-deep hover:bg-[#6B3600] text-white font-bold py-4 rounded-xl transition-colors mb-5 text-lg"
            >
              ✨ {t("planner_mobile_cta")}
            </button>
            <div className="flex flex-col items-center justify-center py-6 text-center mb-4">
              <div className="text-6xl mb-4">🥗</div>
              <h2 className="text-2xl font-bold text-[#6B3600] mb-2">{t("planner_empty_title")}</h2>
              <p className="text-gray-500 max-w-sm text-sm mb-5">
                {t("planner_empty_desc")}
              </p>
              <ol className="text-left text-sm space-y-2 max-w-xs w-full">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-deep text-white text-xs font-bold flex items-center justify-center mt-0.5">1</span>
                  <span className="text-gray-600"><span className="hidden lg:inline">{t("planner_step1_desktop")}</span><span className="lg:hidden">{t("planner_step1_mobile")}</span></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-deep text-white text-xs font-bold flex items-center justify-center mt-0.5">2</span>
                  <span className="text-gray-600">{t("planner_step2")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-deep text-white text-xs font-bold flex items-center justify-center mt-0.5">3</span>
                  <span className="text-gray-600">{t("planner_step3")}</span>
                </li>
              </ol>
            </div>

            {/* Sample plan preview */}
            <div className="bg-white rounded-2xl shadow p-6 mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">{t("planner_example_plan")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-5">
                {/* 🔴 금액·태그를 여기 손으로 적지 말 것. 09-29까지 리터럴이라 홈(09-15에 생성으로 바꿈)과
                      달리 낡아 있었다(금액·열량·예시에 없는 재료가 든 장보기 목록). */}
                {exampleWeek.rows.map((r, i) => ({ ...r, day: t(DAY_KEYS[i]), image: EXAMPLE_IMAGES[r.menu] })).map((d) => (
                  <div key={d.day} className="bg-[#F5F7FA] rounded-xl overflow-hidden flex flex-col">
                    <div className="h-24 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.image} alt={d.menu} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-3 flex flex-col gap-1 flex-1">
                      <p className="text-xs font-bold text-[#8C4A00]">{d.day}</p>
                      <p className="text-sm font-semibold text-[#6B3600] leading-tight">{d.menu}</p>
                      <div className="flex items-center gap-1.5 mt-auto pt-1">
                        <span className="text-xs bg-[#FFF3E0] text-[#6B3600] px-2 py-0.5 rounded-full">{d.tag}</span>
                      </div>
                      <p className="text-sm font-bold text-[#6B3600]">{d.cost}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
                <div className="text-gray-500">
                  {t("planner_example_weekly_cost")} <strong className="text-[#6B3600]">~{exampleWeek.total}</strong>
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  🛒 {t("planner_example_shopping_summary", { items: exampleShopping.reduce((n, s) => n + s.items.length, 0), categories: exampleShopping.length })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-6 px-1">
              <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                {t("planner_allergy_safe")}
              </span>
              <span className="text-xs text-gray-500">{t("planner_allergy_safe_desc")}</span>
            </div>

            {/* Sample shopping list preview */}
            <div className="bg-white rounded-2xl shadow p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">{t("planner_example_shopping")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {exampleShopping.map((section) => (
                  <div key={section.cat}>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{CATEGORY_EMOJIS[section.cat] ?? "🛒"} {section.cat}</p>
                    <ul className="space-y-1">
                      {section.items.map((item) => (
                        <li key={item} className="text-sm text-gray-600 flex items-center gap-2">
                          <span className="w-4 h-4 border border-gray-200 rounded flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Recipe Modal */}
      {activeRecipe && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setActiveRecipe(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu image */}
            {activeRecipe.image && activeRecipe.image.startsWith("/assets/") ? (
              <div className="relative w-full h-48 overflow-hidden rounded-t-2xl bg-gray-100">
                <Image
                  src={activeRecipe.image}
                  alt={activeRecipe.menuName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 512px"
                />
                <button
                  onClick={() => setActiveRecipe(null)}
                  className="min-h-touch flex items-center justify-center absolute top-3 right-3 bg-white/80 hover:bg-white text-gray-600 rounded-full w-8 h-8 flex items-center justify-center shadow text-lg font-bold"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="relative w-full h-32 bg-gradient-to-br from-[#FFF3E0] to-[#F5F7FA] rounded-t-2xl flex items-center justify-center">
                <span className="text-6xl">🥗</span>
                <button
                  onClick={() => setActiveRecipe(null)}
                  className="min-h-touch flex items-center justify-center absolute top-3 right-3 bg-white/80 hover:bg-white text-gray-600 rounded-full w-8 h-8 flex items-center justify-center shadow text-lg font-bold"
                >
                  ×
                </button>
              </div>
            )}

            <div className="p-6">
              {/* Title & badges */}
              <h2 className="text-xl font-bold text-[#6B3600] mb-2">{activeRecipe.menuName}</h2>
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="bg-[#FFF3E0] text-[#6B3600] text-xs font-semibold px-3 py-1 rounded-full">📅 {activeRecipe.day}</span>
                <span className="bg-[#FFF3E0] text-[#6B3600] text-xs font-semibold px-3 py-1 rounded-full">💰 {activeRecipe.estCost}</span>
                <span className="bg-orange-50 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full">🔥 {(activeRecipe.nutrition.perBox ?? [activeRecipe.nutrition.calories]).join(" / ")} kcal</span>
              </div>
              {/* 🔴 2026-09-09 외부 감사 — 숫자의 **기준**이 화면에 없었다.
                  조리법은 배치(예: 스크롤 8개)를 만드는데 위 두 값은 **하루 도시락 한 개
                  (메인 + 그날 간식)** 기준이라, 8개분으로 읽으면 4배쯤 틀리게 읽힌다.
                  값을 못 바꾸면 최소한 무엇을 세는 값인지는 말해야 한다. */}
              <p className="text-xs text-gray-500 -mt-3 mb-2 leading-relaxed">
                {t("planner_basis_note")}
              </p>
              {/* 🔴 2026-09-09 재점검 — 재료 옆의 분량은 **재료별 전역 1인분**이지
                  아래 조리법의 투입량이 아니다. Tamagoyaki는 조리법이 달걀 3개인데
                  화면은 1개라고 적혀 있었다. 어제 분량을 화면에 내보내면서 원래 있던
                  모델 한계가 **눈에 보이는 모순**이 됐다.
                  🔴 94개 레시피의 재료별 투입량은 우리에게 없다. 지어내면 그게 날조다.
                     그래서 두 숫자가 다른 것을 말한다는 사실을 화면이 먼저 밝힌다. */}
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-5 leading-relaxed">
                {t("planner_portion_vs_method", {
                  total: String(MENU_COUNT),
                  withAmounts: String(RECIPES_WITH_METHOD_AMOUNTS),
                  // 🔴 값은 서버에서 계산해 넘긴다 — 여기서 price_cache를 import하면
                  //    클라이언트 번들에 가격 캐시가 통째로 실린다(위 31행 주석과 같은 이유).
                  eggOne: methodExample.one,
                  eggCount: String(methodExample.count),
                  eggMany: methodExample.many,
                })}
              </p>
              {/* 🔴 조리법이 배치를 만든다고 **본문에 적었을 때만** 말한다.
                  94개 중 2개다. 나머지에 그럴듯한 생산량을 채우면 그게 날조다. */}
              {(() => {
                const y = parseYield(activeRecipe.instructions);
                if (!y) return null;
                return (
                  <p className="text-xs font-medium text-[#8C4A00] mb-5 leading-relaxed">
                    {t("planner_batch_note", { count: String(y.count), unit: y.unit })}
                  </p>
                );
              })()}

              {/* Ingredients
                  🔴 2026-09-09 외부 감사 — 재료 목록에 **양이 없었다.** 그래서 화면의
                     $2.34가 어디서 나온 값인지 독자가 되짚을 수 없었다.
                     이제 재료마다 「1인분 양 · 팩 크기 · 팩값 · 그 몫의 값」을 적는다.
                     네 값의 관계가 곧 산수이므로 독자가 직접 검산할 수 있다.
                     🔴 근거가 없는 재료는 **빈칸으로 둔다** — 양을 지어내지 않는다. */}
              <h3 className="font-bold text-[#6B3600] mb-2">{t("ingredients")}</h3>
              {planOptions.extraBoxes.length > 0 ? (
                <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                  {t("planner_boxes_recipe_note", {
                    count: String(planBoxes.length),
                    boxes: boxesList(planBoxes, t),
                    factor: portionsLabel(planPortions),
                  })}
                </p>
              ) : planOptions.band !== DEFAULT_PORTION_BAND && (
                <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                  {t("planner_portion_recipe_note", {
                    band: t(`portion_band_${planOptions.band}`),
                    factor: bandFactorLabel(planOptions.band),
                  })}
                </p>
              )}
              <ul className="mb-3 space-y-1.5">
                {activeRecipe.rawIngredients.map((ing) => {
                  const basis = PORTION_BASIS[ing];
                  const base = prices[ing]?.price;
                  // 🔴 2026-09-09 재점검 — 상세는 **정가**를, 합계는 **할인가**를 쓰고 있었다
                  //    (달걀: 상세 $9.95 vs 합계 $9.49). 같은 화면에서 두 기준이 섞이면
                  //    독자가 검산할 수 없다. 상세도 합계와 같은 함수를 쓴다.
                  const sale = recipeSales.get(ing);
                  const packPrice =
                    typeof base === "number" ? effectivePackPrice(base, sale) : undefined;
                  const onSale = typeof base === "number" && packPrice !== undefined && packPrice < base;
                  // 기준 1인분의 값과 배율을 따로 보여 준다 — 「기준값 × 배율 = 청구액」을 독자가 되짚을 수 있게.
                  const baseServeCost = typeof packPrice === "number" ? packPrice * portionFor(ing) : undefined;
                  const serveCost = typeof packPrice === "number" ? packPrice * portionFor(ing, planPortions) : undefined;
                  const methodAmount = methodAmountFor(activeRecipe.menuName, ing);
                  return (
                    <li key={ing} className="flex flex-wrap items-baseline gap-x-2 text-sm text-gray-700">
                      <span className="text-base">{getIngredientEmoji(ing)}</span>
                      <span className="font-medium">{ing}</span>
                      {basis && <span className="text-gray-500">{basis.serve}</span>}
                      {/* 🔴 조리법이 **본문에 적은** 투입량 (2026-09-10 외부 감사 2번).
                          94개 중 12개만 말한다. 나머지는 침묵한다 — 지어내지 않는다.
                          1인분으로 환산하지 않는 이유: 배치가 몇 개를 만드는지 대부분
                          안 적혀 있고, 환산하는 순간 그게 지어낸 값이 된다. */}
                      {methodAmount && (
                        <span className="text-xs text-amber-700 bg-amber-50 rounded px-1.5 py-0.5">
                          {t("planner_method_uses", { amount: methodAmount })}
                        </span>
                      )}
                      {basis && typeof packPrice === "number" && (
                        <span className="text-xs text-gray-400">
                          {/* 🔴 팩이 "per kg"인 재료는 "(of per kg @ $3.75 …)"로 찍히고 있었다.
                              무게로 파는 것은 팩이 아니라 단가다 — 그렇게 읽히게 쓴다. */}
                          ({basis.pack === "per kg" ? "at" : `of ${basis.pack} @`}{" "}
                          {onSale && typeof base === "number" && (
                            <span className="line-through mr-1">${base.toFixed(2)}</span>
                          )}
                          <span className={onSale ? "text-[#8C4A00] font-semibold" : ""}>
                            ${packPrice.toFixed(2)}
                            {basis.pack === "per kg" ? "/kg" : ""}
                          </span>
                          {serveCost !== undefined && baseServeCost !== undefined
                            ? planPortions === DEFAULT_PORTION_BAND
                              ? ` → $${serveCost.toFixed(2)}`
                              : ` → $${baseServeCost.toFixed(2)} ${portionsLabel(planPortions)} = $${labelledProduct(baseServeCost, planPortions)}`
                            : ""})
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {(() => {
                const sub = activeRecipe.rawIngredients.reduce((t, ing) => {
                  const p = prices[ing]?.price;
                  if (typeof p !== "number") return t;
                  return t + effectivePackPrice(p, recipeSales.get(ing)) * portionFor(ing, planPortions);
                }, 0);
                if (!(sub > 0)) return null;
                return (
                  <p className="mb-5 text-xs text-gray-500 leading-relaxed">
                    {t("planner_main_subtotal", { amount: `$${sub.toFixed(2)}` })}
                  </p>
                );
              })()}

              {/* Instructions — parsed into steps */}
              <h3 className="font-bold text-[#6B3600] mb-3">👩‍🍳 {t("planner_instructions_label")}</h3>
              <RecipeInstructions text={activeRecipe.instructions} noInstructionsText={t("planner_no_instructions")} />

              {/* Snacks */}
              {activeRecipe.snacks && activeRecipe.snacks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h3 className="font-bold text-[#6B3600] mb-2">🍎 {t("planner_snacks_label")}</h3>
                  <div className="flex flex-wrap gap-2">
                    {activeRecipe.snacks.map((s) => (
                      <span key={s.name} className="bg-[#FFF3E0] text-[#6B3600] text-xs font-medium px-3 py-1.5 rounded-full">
                        {getIngredientEmoji(s.name)} {s.name}{s.keepCold && <span aria-label={t("planner_snack_keep_cold")}> 🧊</span>}
                      </span>
                    ))}
                  </div>
                  {activeRecipe.snacks.some((s) => s.keepCold) && (
                    <p className="text-xs text-gray-500 mt-2">🧊 {t("planner_snack_keep_cold")}</p>
                  )}
                </div>
              )}

              {activeRecipe.mayContain && activeRecipe.mayContain.length > 0 && (
                <div className="mt-4 rounded-xl border border-[#E0A800] bg-[#FFF8E1] p-3 text-[#6B4700]">
                  <ul className="space-y-1 text-sm font-medium text-[#8A5A00]">
                    {activeRecipe.mayContain.map((n) => (
                      <li key={`${n.snack ?? ""}:${n.ingredient}:${n.allergy}`}>⚠ {mayContainLine(n)}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs leading-relaxed">{t("planner_may_contain_note")}</p>
                </div>
              )}

              {activeRecipe.kindyPrep && activeRecipe.kindyPrep.length > 0 && (
                <div className="mt-4 rounded-xl border border-[#4A7FB5]/60 bg-[#EEF5FB] p-3 text-[#1F4466]">
                  <h3 className="font-bold mb-2 text-sm">✂️ {t("planner_kindy_prep_title")}</h3>
                  <ul className="space-y-2 text-sm">
                    {activeRecipe.kindyPrep.map((n) => {
                      const older = kindyOlderLine(n);
                      return (
                        <li key={`${n.snack ?? ""}:${n.ingredient}:${n.prep}`}>
                          {kindyPrepLine(n)}
                          {older && <span className="block text-xs text-[#1F4466]/80">{older}</span>}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 text-xs leading-relaxed">
                    <a href={KINDY_GUIDE_URL} target="_blank" rel="noopener noreferrer" className="underline">
                      {t("planner_kindy_guide_link")}
                    </a>
                  </p>
                </div>
              )}

              <button
                onClick={() => setActiveRecipe(null)}
                className="min-h-touch flex items-center justify-center mt-6 w-full bg-[#FFF3E0] text-[#6B3600] font-bold py-3 rounded-xl hover:bg-primary-deep hover:text-white transition-colors"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Parses instruction text (may contain **Bold:** and numbered lists) into steps
const RecipeInstructions = memo(function RecipeInstructions({ text, noInstructionsText }: { text?: string; noInstructionsText: string }) {
  if (!text) return <p className="text-sm text-gray-500">{noInstructionsText}</p>;

  // Split into lines, clean markdown bold markers
  const raw = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  const lines = raw.split(/\\n|\n/).map((l) => l.trim()).filter(Boolean);

  const steps: { type: "header" | "step" | "text"; content: string; num?: number }[] = [];
  for (const line of lines) {
    const numbered = line.match(/^(\d+)\.\s+(.+)/);
    if (numbered) {
      steps.push({ type: "step", content: numbered[2], num: parseInt(numbered[1]) });
    } else if (line.endsWith(":")) {
      steps.push({ type: "header", content: line });
    } else {
      steps.push({ type: "text", content: line });
    }
  }

  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        if (s.type === "header") {
          return (
            <p key={i} className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-3">
              {s.content}
            </p>
          );
        }
        if (s.type === "step") {
          return (
            <div key={i} className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-deep text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {s.num}
              </span>
              <p className="text-sm text-gray-700 leading-relaxed">{s.content}</p>
            </div>
          );
        }
        return (
          <p key={i} className="text-sm text-gray-700 leading-relaxed">{s.content}</p>
        );
      })}
    </div>
  );
});
