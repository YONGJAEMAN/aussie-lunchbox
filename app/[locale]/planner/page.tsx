import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import PlannerClient from "@/components/PlannerClient";
import { getPromotionsStatus } from "@/lib/promotions";
import { MENU_COUNT, SNACK_COUNT, NUT_CONTAINING_COUNT, NUT_FREE_COUNT } from "@/lib/siteCounts";
import Footer from "@/components/Footer";
import { buildPageMetadata } from "@/lib/seo/pageMetadata";
import { POSTS } from "@/content/posts";
import { GUIDES } from "@/content/guides";
import {
  firstRoundRows,
  firstRoundDate,
  roundDateLabel,
  respecifiedSince,
} from "@/lib/priceIndexCompare";
import { money, joinList, methodExample, exampleWeekRows, exampleWeekTotal } from "@/lib/servePrice";

/**
 * 표에 싣는 5월 라운드 행 — **이름만** 고른다. 금액·날짜는 `history[0]`에서 나온다.
 * 이름이 바뀌면 `firstRoundRows`가 던진다(조용히 빠지면 표만 짧아진다).
 */
const MAY_ROWS_SHOWN = [
  "Wholegrain Bread (700g)",
  "Wraps 8-pack",
  "Bagels 4-pack",
] as const;

/**
 * 🔴 카드에 필요한 세 필드만 뽑아 클라이언트로 넘긴다.
 *    PlannerClient는 "use client"라, 여기서 POSTS를 넘기면 글 본문 320KB가
 *    통째로 브라우저 번들에 들어간다.
 *
 * 🔴 export하는 이유는 **테스트가 이 객체 자체를 보게 하기 위해서다**(2026-08-20 리뷰).
 *    커버리지 가드가 `{...POSTS, ...GUIDES}`를 따로 합쳐서 검사하고 있었는데,
 *    그건 여기서 실제로 넘기는 맵이 아니다. 이 맵을 slug 하나로 좁혀도
 *    테스트 302개와 `tsc`가 전부 통과했다 — 화면에서는 카드가 거의 다 사라지는데.
 */
export const ARTICLE_META = Object.fromEntries(
  [
    ...Object.entries(POSTS),
    ...Object.entries(GUIDES),
  ].map(([slug, a]) => [slug, { title: a.title, category: a.category, readTime: a.readTime }]),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    en: "Lunch Planner — Kiwi Lunchbox",
    ko: "도시락 플래너 — Kiwi Lunchbox",
    zh: "午餐计划器 — Kiwi Lunchbox",
  };
  const descriptions: Record<string, string> = {
    en: "Generate a personalised week of NZ school lunches in seconds. Set allergy and diet filters, then get a full meal plan with a costed shopping list.",
    // 🔴 09-29: ko/zh만 「예산을 설정」이라 했다 — 플래너에 예산 입력은 없다. en과 같은 말로 맞춘다.
    ko: "몇 초 만에 뉴질랜드 학교 도시락 1주일 계획을 만드세요. 알레르기·식단 필터를 설정하면 비용이 계산된 장보기 목록과 함께 식단을 받습니다.",
    zh: "几秒钟内生成一周新西兰学校午餐计划。设置过敏原和饮食筛选，即可获得完整的午餐计划和估算费用的购物清单。",
  };

  // 🔴 2026-08-13: 이 페이지만 helper를 안 쓰고 metadata를 손으로 짜고 있었다.
  // 결과가 라이브에 그대로 나가 있었다 — og:title은 "Lunch Planner — Kiwi Lunchbox"인데
  // twitter:title은 레이아웃 기본값 "Weekly Lunch Planner | Kiwi Lunchbox"였고,
  // 설명도 서로 달랐으며, twitter:image는 정사각 로고가 large_image 카드에 실리고 있었다.
  // helper가 막으려던 상황이 정작 사이트에서 가장 중요한 페이지에서 벌어져 있었다.
  return buildPageMetadata({
    path: "/planner",
    locale,
    title: titles[locale] ?? titles.en,
    description: descriptions[locale] ?? descriptions.en,
  });
}

export default async function PlannerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: t("planner_seo_howto_name"),
    description: t("planner_seo_howto_desc"),
    step: [
      {
        "@type": "HowToStep",
        name: t("planner_seo_step1_name"),
        text: t("planner_seo_step1_text"),
      },
      {
        "@type": "HowToStep",
        name: t("planner_seo_step2_name"),
        text: t("planner_seo_step2_text"),
      },
      {
        "@type": "HowToStep",
        name: t("planner_seo_step3_name"),
        text: t("planner_seo_step3_text"),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd).replace(/</g, "\\u003c") }}
      />
      <PlannerClient
        salesActive={getPromotionsStatus().state === "active"}
        articleMeta={ARTICLE_META}
        methodExample={methodExample()}
        exampleWeek={{ rows: exampleWeekRows(), total: exampleWeekTotal() }}
      />
      <section className="bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#314A37] mb-6">
            {t("planner_seo_title")}
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-8">
            {t("planner_seo_intro")}
          </p>

          <div className="grid md:grid-cols-3 gap-8 mb-10">
            <div className="bg-[#F5F7FA] rounded-2xl p-6">
              <div className="text-2xl mb-3">1️⃣</div>
              <h3 className="font-bold text-[#314A37] mb-2">{t("planner_seo_step1_name")}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{t("planner_seo_step1_text")}</p>
            </div>
            <div className="bg-[#F5F7FA] rounded-2xl p-6">
              <div className="text-2xl mb-3">2️⃣</div>
              <h3 className="font-bold text-[#314A37] mb-2">{t("planner_seo_step2_name")}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{t("planner_seo_step2_text")}</p>
            </div>
            <div className="bg-[#F5F7FA] rounded-2xl p-6">
              <div className="text-2xl mb-3">3️⃣</div>
              <h3 className="font-bold text-[#314A37] mb-2">{t("planner_seo_step3_name")}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{t("planner_seo_step3_text")}</p>
            </div>
          </div>

          <div className="space-y-6 text-gray-600 leading-relaxed">
            <div>
              <h3 className="text-xl font-bold text-[#314A37] mb-2">{t("planner_seo_allergy_h")}</h3>
              <p>{t("planner_seo_allergy_p", { menuCount: String(MENU_COUNT) })}</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#314A37] mb-2">{t("planner_seo_price_h")}</h3>
              <p>{t("planner_seo_price_p")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Worked examples — fixed, server-rendered content showing exactly how the
          planner behaves. Uses the real menu library, real allergy flags, and the
          operator's own weekly price cache (data/price_cache.json — priceIndex.json is the
          20-item table published on /price-index, which the planner does not read). */}
      <section className="bg-[#F7F9FC] border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-16 space-y-16">

          {/* 1. A real generated week */}
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#314A37] mb-4">
              What a generated week actually looks like
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              The planner pulls from a library of {MENU_COUNT} lunch recipes and {SNACK_COUNT}{" "}
              snacks, and builds a
              Monday-to-Friday plan that varies the category each day so your kid is not eating
              a sandwich five times in a row. Here is one real five-day plan it produced with no
              allergy filters set — the same output you would get on screen, just frozen here so
              you can see the shape of it before you generate your own. (It does not ask for your
              child&apos;s age or year level; portions are the same for everyone.)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse bg-white rounded-2xl overflow-hidden shadow-sm">
                <thead>
                  <tr className="bg-[#314A37] text-white text-left">
                    <th className="px-4 py-3 font-semibold">Day</th>
                    <th className="px-4 py-3 font-semibold">Lunch</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Core ingredients</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 font-medium text-[#314A37]">Monday</td>
                    <td className="px-4 py-3">Chicken Wrap</td>
                    <td className="px-4 py-3 text-gray-500">Sandwich</td>
                    <td className="px-4 py-3 text-gray-500">Tortilla, chicken, lettuce, mayo</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-[#314A37]">Tuesday</td>
                    <td className="px-4 py-3">Sushi Rolls</td>
                    <td className="px-4 py-3 text-gray-500">Cold</td>
                    <td className="px-4 py-3 text-gray-500">Sushi rice, nori, tuna or chicken, avocado, mayo</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-[#314A37]">Wednesday</td>
                    <td className="px-4 py-3">Mac &apos;n Cheese</td>
                    <td className="px-4 py-3 text-gray-500">Hot</td>
                    <td className="px-4 py-3 text-gray-500">Macaroni, cheese sauce, milk</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-[#314A37]">Thursday</td>
                    <td className="px-4 py-3">Egg Salad Sandwich</td>
                    <td className="px-4 py-3 text-gray-500">Sandwich</td>
                    <td className="px-4 py-3 text-gray-500">Bread, boiled eggs, mayo, lettuce</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-[#314A37]">Friday</td>
                    <td className="px-4 py-3">Pizza Muffins</td>
                    <td className="px-4 py-3 text-gray-500">Baking</td>
                    <td className="px-4 py-3 text-gray-500">Flour, milk, cheese, ham, tomato paste</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mt-4">
              {/* 🔴 09-29: 「랩은 마요를 차게 두라고 한다」 — menuData의 Chicken Wrap 조리법에 그런 줄이 없다.
                  조리법이 실제로 말하는 것(가장자리 4cm 비우기·유산지로 싸기)으로 바꿨다. */}
              Each generated lunch comes with a method (Mac &apos;n Cheese tells you to pack it into a
              pre-warmed Thermos, the wrap tells you to leave 4cm clear at the edges and wrap it in
              baking paper), so the plan is not just
              a list of names — it is something you can actually pack on a Tuesday morning. Click
              <em> Generate</em> again and you get a different five-day combination, because it picks
              fresh from the recipe pool each time.
            </p>
            <figure className="mt-8">
              <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-md">
                <Image
                  src="/assets/real-packed-lunchbox-snacks-fruit.jpg"
                  alt="A real packed Kiwi Lunchbox: onigiri rice balls rolled with furikake, cucumber sticks, apple slices, a peeled mandarin, salami in a green silicone cup, and ring snacks in a blue bento box"
                  width={1200}
                  height={900}
                  className="w-full h-auto"
                  sizes="(max-width: 768px) 100vw, 672px"
                />
              </div>
              <figcaption className="text-xs text-gray-500 italic text-center mt-3 leading-relaxed max-w-2xl mx-auto">
                📷 What a planned day actually looks like packed — one of our own boxes from this
                term: onigiri rolled with furikake from the night before, cucumber, apple, a
                mandarin, a small salami cup and ring snacks. The rice balls are the East Auckland
                Korean-family habit described across our guides. Photographed at home by the
                operator, not a stock photo.
              </figcaption>
            </figure>
          </div>

          {/* 2. How allergy filters work — real worked example */}
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#314A37] mb-4">
              How the allergy filters work — a worked example
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              The filters are not cosmetic. When you tick a filter, matching recipes are removed
              from the pool <em>before</em> the week is built, so an excluded ingredient can never
              slip into a generated plan. A concrete example: switch on the <strong>Nut Allergy</strong>{" "}
              filter and the planner drops every recipe currently flagged as containing nuts —
              right now that is {NUT_CONTAINING_COUNT} recipes:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1 mb-4">
              <li>Chicken Pesto Panini and Pasta Salad — the pesto contains cashews</li>
              <li>Peanut Butter Sandwich</li>
              <li>Chicken Satay — the satay sauce is peanut-based</li>
              <li>Dairy-Free Chicken Pesto Pasta — pesto again</li>
            </ul>
            <p className="text-gray-600 leading-relaxed">
              That leaves {NUT_FREE_COUNT} recipes eligible, and the week is built only from those. You can stack
              filters too — Nut Allergy plus Dairy plus Vegetarian — and the pool shrinks accordingly.
              The flags come from checking each recipe&apos;s ingredient list by hand, but they are a
              planning aid, not a substitute for reading the actual product packaging: a brand of
              wrap or cheese can change its recipe, and only the on-pack PEAL allergen statement is
              authoritative. If your child has an anaphylactic allergy, always read the label too.
            </p>
          </div>

          {/* 3. How the price estimate is calculated — first-party data */}
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#314A37] mb-4">
              How the price estimate is calculated
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Every plan comes with a rough weekly cost. The prices behind it are read weekly from
              Woolworths NZ&apos;s own online catalogue, and they started from a round I walked in
              person. On <strong>{roundDateLabel(firstRoundDate())}</strong> I walked the
              aisles at <strong>Pak&apos;nSave Ormiston</strong> and <strong>Woolworths Ormiston</strong>{" "}
              in East Auckland — the two stores I actually shop at — and recorded the shelf price of
              20 lunchbox staples by hand. A few of them:
            </p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border-collapse bg-white rounded-2xl overflow-hidden shadow-sm">
                <thead>
                  <tr className="bg-[#314A37] text-white text-left">
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Woolworths</th>
                    <th className="px-4 py-3 font-semibold">Pak&apos;nSave</th>
                  </tr>
                </thead>
                {/* 🔴 금액과 날짜를 손으로 적지 말 것. 2026-09-15까지 여섯 개가 리터럴이었다.
                    값 자체는 history[0]과 맞았지만, 같은 기록이 두 곳에 살면 한쪽만 고치게 된다.
                    실제로 "Wraps 8-pack"은 08-12에 재정의됐는데 이 표만 옛 규격을 싣고 있었다. */}
                <tbody className="divide-y divide-gray-100">
                  {firstRoundRows(MAY_ROWS_SHOWN).map((r) => (
                    <tr key={r.name}>
                      <td className="px-4 py-3">{r.name}</td>
                      <td className="px-4 py-3 text-gray-500">{money(r.woolworths)}</td>
                      <td className="px-4 py-3 text-gray-500">{money(r.paknsave)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-gray-600 leading-relaxed">
              That May round is where this started, and the table above is that round — a dated
              snapshot, not today&apos;s prices.
              {respecifiedSince(MAY_ROWS_SHOWN).length > 0 && (
                <>
                  {" "}Since then the specification for{" "}
                  <strong>{joinList(respecifiedSince(MAY_ROWS_SHOWN))}</strong>{" "}
                  {respecifiedSince(MAY_ROWS_SHOWN).length === 1 ? "has" : "have"} been re-pinned to a
                  product both chains actually carry, so that row is no longer in the current basket
                  under this name. The May figure is kept as recorded rather than restated — see the{" "}
                  <a href={`/${locale}/price-index`} className="text-[#366A1B] underline">price index</a>{" "}
                  for what it was changed to and why.
                </>
              )}
            </p>
            {/* 🔴 2026-09-09 재점검 — 이 문단이 "maps it onto this price data"라고 해서
                플래너가 **위 20행 표**로 계산하는 것처럼 읽혔다. 실제로는 훨씬 큰 주간
                재료 캐시로 계산하고, 20행 표는 체인 비교용으로 따로 공개하는 것이다. */}
            <p className="text-gray-600 leading-relaxed">
              What the planner actually prices against is a larger weekly cache of pinned supermarket
              products — one tracked product per ingredient, re-read each week — <strong>not</strong> the
              20-item table above. That table is the cross-chain comparison, chosen so the same
              specification can be priced at more than one chain; the planner needs breadth instead.
              For each recipe it takes the ingredient list, looks up that ingredient&apos;s pack price,
              and multiplies by the share of the pack one lunchbox uses. Add the five days together and
              you get the weekly figure under your plan. It is an <em>estimate</em> in one specific
              place — the share of a pack a lunchbox uses is our household&apos;s portion, not a
              published figure — while the pack prices themselves are read from the shop. Both datasets
              are downloadable as CSV from the{" "}
              <a href={`/${locale}/price-index`} className="text-[#366A1B] underline">NZ Lunchbox Price Index</a>,
              so the arithmetic can be checked rather than taken on trust.
            </p>
          </div>

          {/* 4. What you actually get */}
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#314A37] mb-4">
              What you get when you click Generate
            </h2>
            {/* 🔴 09-29: 「download the whole thing as a PDF」였다. export-pdf/route.ts가 싣는 것은
                요일별 메뉴·재료·예상 비용·열량과 분류별 장보기 목록뿐이다 — 조리법·간식명·품목 가격은 없다. */}
            <p className="text-gray-600 leading-relaxed">
              One click produces the full five-day plan above, a consolidated shopping list grouped
              by category (so you are not zig-zagging across the supermarket), a per-recipe method,
              and the weekly cost estimate. You can download a PDF to stick on the fridge or send to a
              partner &mdash; each day&apos;s lunch with its ingredients, estimated cost and calories,
              plus the shopping list grouped by category (the methods stay on screen). If you create a
              free account you can star favourite lunches so they show up more often. No sign-up is
              required just to generate and download &mdash; the account only exists to keep your
              favourites across devices.
            </p>
          </div>

        </div>
      </section>

      {/*
        🔴 2026-08-13까지 이 페이지에만 푸터가 없었다. 하필 가장 중요한 페이지다 —
        IG 바이오 링크가 가리킬 곳이고, 학교 메일이 보내는 곳이고, AdSense가
        정책 페이지 접근성을 보는 곳이다. 약관·개인정보 링크가 통째로 없었다.
      */}
      <Footer locale={locale} />
    </>
  );
}
