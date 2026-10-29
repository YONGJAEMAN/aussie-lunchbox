import Link from "next/link";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";
import priceData from "@/data/priceIndex.json";
import { buildPageMetadata } from "@/lib/seo/pageMetadata";
import { basketTotals, isComparableRow, isThreeWayComparableRow, threeWayRows } from "@/lib/priceIndexCompare";
import Footer from "@/components/Footer";
import { unitPriceLabel } from "@/lib/unitPrice";

interface PriceItem {
  name: string;
  category: string;
  countdown: number | null;
  paknsave: number | null;
  newworld?: number | null;
  newworldAsOf?: string;
  unit: string;
  note: string;
  /**
   * 이 행의 Pak'nSave 값을 마지막으로 실제 확인한 날. **열 날짜와 다를 수 있다.**
   * 특가 주간이면 정상가를 알 수 없어 갱신을 건너뛰는데, 그때 열 날짜만 오늘로
   * 올리면 옛 값이 오늘 잰 값인 척하게 된다. 2026-08-10에 실제로 그럴 뻔했다 —
   * 버터가 5월 $5.79를 든 채 8월 Woolworths와 비교돼 격차가 $4.61로 부풀었다.
   */
  paknsaveAsOf?: string;
  /**
   * 이 행의 **정의 자체를 바꾼** 날과 옛 정의. 값이 바뀐 게 아니라 상품이 바뀐 것이므로
   * 여기서 시계열이 끊긴다. 5월 라운드(history)는 다른 상품을 잰 기록이라 그대로 둔다.
   * 🔴 조용히 바꾸면 "사과가 −1% 움직였다"처럼 **품종 교체를 물가 변동으로** 읽게 된다.
   */
  respec?: { on: string; was: string };
}

const data: {
  // lastUpdated = 두 열 중 **더 오래된** 날짜. 한쪽만 갱신했다고 전체가
  // 최신인 척하면 안 된다 (scripts/update_price_index.mjs가 그렇게 계산한다).
  lastUpdated: string;
  woolworthsUpdated?: string;
  paknsaveUpdated?: string;
  checkedAt: string;
  checkedBy: string;
  items: PriceItem[];
  // 양 열이 같은 날짜였던 과거 라운드. 본문의 매장 비교 서술은 여기서 읽는다 —
  // 현재 표는 시차가 있어 비교 서술의 근거가 될 수 없다.
  history?: {
    date: string;
    comparable?: boolean;
    woolworthsTotal: number;
    paknsaveTotal: number;
    gap: number;
    paknsaveCheaperCount: number;
    woolworthsCheaperCount: number;
    biggestGapItem: string;
    biggestGap: number;
  }[];
} = priceData as typeof data;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMonth(dateStr: string) {
  const d = new Date(dateStr);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const month = formatMonth(data.lastUpdated);
  return buildPageMetadata({
    path: "/price-index",
    locale,
    title: `NZ Lunchbox Price Index — ${month} | Kiwi Lunchbox`,
    // ⚠️ 구글은 ~155자에서 자른다. 자르는 지점 뒤에 있는 말은 없는 말이다.
    //    잘려도 되는 것(Ormiston 지점명)을 빼고, 남길 것(주간·정상가·갱신월)을 앞에 뒀다.
    description: `Regular prices for 20 school lunchbox staples at Woolworths vs Pak'nSave in Auckland, read weekly from each chain's online shop. Updated ${month}.`,
    ogType: "article",
    modifiedTime: data.lastUpdated,
  });
}

export default async function PriceIndexPage() {
  const locale = await getLocale();
  const month = formatMonth(data.lastUpdated);

  const items = data.items;
  const categories = [...new Set(items.map((i) => i.category))];

  /**
   * 🔴 2026-08-12: 여기가 `(i.paknsave ?? 0)`로 전체를 더하고 있었다.
   *    Woolworths 20품목 − Pak'nSave 18품목 = "You save $28.50"가 라이브로 나갔다.
   *    같은 시점 진짜 like-for-like는 $4.99다. 합계는 반드시 같은 행 집합에서 나와야 한다.
   */
  const basket = basketTotals(items, data.woolworthsUpdated);
  const hasData = items.some((i) => i.countdown !== null || i.paknsave !== null);
  const maxPrice = Math.max(...items.map((i) => Math.max(i.countdown ?? 0, i.paknsave ?? 0)), 1);

  /**
   * 두 열의 조사 날짜가 크게 벌어졌는지.
   *
   * ⚠️ 이게 왜 필요한가 (2026-07-30): Woolworths 열을 자동 갱신하기 시작하면서
   * 한쪽만 최신인 상태가 생겼다. 그러면 표의 매장 비교가 **시차를 매장 차이로**
   * 보여준다. 실제로 Anchor 버터가 5월 $6.49 → 7월 $10.40으로 60% 올랐는데,
   * Pak'nSave 열은 5월 $5.79 그대로라 "Pak'nSave가 45% 싸다"로 읽힌다. 거짓이다.
   *
   * 이 페이지의 존재 이유가 매장 비교이므로, 비교가 성립하지 않는 동안에는
   * 비교 신호(승자 표시·절약액)를 끄고 그 사실을 말한다. 데이터는 그대로 보여준다.
   */
  const DAY = 86_400_000;
  const colDates = [data.woolworthsUpdated, data.paknsaveUpdated].filter(Boolean) as string[];
  const dateGapDays =
    colDates.length === 2
      ? Math.round(Math.abs(Date.parse(colDates[0]) - Date.parse(colDates[1])) / DAY)
      : 0;
  const comparable = dateGapDays <= 30;

  /**
   * 🔴 New World 열의 실제 커버리지. 2026-08-23에 이 페이지가 "New World는 아직 지수에
   * 없다 — 세 곳으로 확장하는 건 로드맵"이라고 말하면서 **표에는 New World 열을 띄우고
   * 있었다.** 신뢰를 파는 페이지가 자기 화면을 부정하고 있었던 셈이다.
   * 문구를 고치면서 개수를 손으로 적을 뻔했다 — 데이터에서 만든다.
   */
  const threeWayCount = threeWayRows(items, data.woolworthsUpdated).length;
  const newworldGaps = items.filter((i) => i.newworld === null || i.newworld === undefined);

  /**
   * 행 단위 신선도. 열 날짜가 같아도 그 행의 Pak'nSave 값이 오래됐으면 비교가
   * 성립하지 않는다 — 특가 주간엔 정상가를 알 수 없어 그 행만 갱신을 건너뛰기
   * 때문이다. 날짜가 없는 행은 옛 데이터이므로 신선하지 않은 것으로 본다.
   */
  const rowIsFresh = (item: PriceItem) => isComparableRow(item, data.woolworthsUpdated);
  /** 정의를 바꾼 행 — 표 아래에서 반드시 밝힌다 */
  const respecRows = data.items.filter((i) => i.respec);
  const staleRows = data.items.filter(
    (i) => i.countdown !== null && i.paknsave !== null && !rowIsFresh(i),
  );

  /** 양 열이 같은 날짜였던 마지막 라운드 — 매장 비교 서술의 유일한 근거 */
  const lastFull = (data.history ?? []).filter((h) => h.comparable !== false).at(-1);

  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `NZ Lunchbox Price Index — ${month}`,
    // 🔴 "Monthly"였다 — 바로 위 meta description은 "read weekly"라고 말하는데
    //    구글에 넘기는 스키마만 월간이라고 신고하고 있었다. 같은 페이지가 제 자신과 모순.
    description: "Weekly comparison of 20 school lunchbox staple prices at Woolworths and Pak'nSave in Auckland, New Zealand. Regular shelf prices only — specials excluded.",
    creator: {
      "@type": "Person",
      name: "Yong Jae Lee",
      url: "https://www.linkedin.com/in/francescolee/",
    },
    dateModified: data.lastUpdated,
    spatialCoverage: "Auckland, New Zealand",
    temporalCoverage: data.lastUpdated,
    license: "https://creativecommons.org/licenses/by/4.0/",
  };

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd).replace(/</g, "\\u003c") }}
      />

      {/* Hero */}
      <section className="bg-[#F7F9FC] pt-24 pb-16 px-4 text-center">
        <p className="text-[#366A1B] font-semibold text-sm uppercase tracking-widest mb-4">Original Data</p>
        <h1 className="text-3xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-3xl mx-auto leading-tight">
          NZ Lunchbox Price Index
        </h1>
        <p className="text-xl text-[#366A1B] font-bold mb-2">{month}</p>
        <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
          20 school lunchbox staples, priced at Woolworths and Pak&apos;nSave in Auckland.
          Regular shelf prices, not specials.
        </p>
        {/* 열마다 갱신 방식과 날짜가 다르다. 하나의 날짜로 뭉개면 오래된 열이 숨는다. */}
        <div className="text-xs text-gray-500 mt-4 leading-relaxed">
          <p>
            Woolworths column: {data.woolworthsUpdated ?? data.lastUpdated} — read from
            Woolworths NZ&apos;s online price feed
          </p>
          {/* 🔴 2026-08-12: 여기가 "checked in store by ..."였다. 08-11에 온라인
              자동 갱신으로 바꿨는데 이 줄만 옛 방식을 계속 주장하고 있었고, 같은
              페이지 아래 방법론은 "Pak'nSave's online shop"이라고 말한다 — 한 페이지가
              제 방법을 두 번 다르게 말했다. 매장 실사는 이제 표본 대조용이다. */}
          <p>
            Pak&apos;nSave column: {data.paknsaveUpdated ?? data.lastUpdated} — read from
            Pak&apos;nSave&apos;s online shop, store set to Ormiston
          </p>
        </div>
        {/*
          🔴 갱신 시점을 맨 위에 세운다 — 이 사이트에서 **일정대로 바뀌는 것은 이 페이지 하나뿐이다.**
             그게 안 보이면 플래너에서 링크를 눌러 와도 다시 올 이유가 생기지 않는다.

          🔴 요일은 **실제로 읽는 수집기**의 일정이다 — `ops/kiwi-prices.plist`(launchd, 이 기계의 NZ 시각
             일요일 18:00). 2026-10-26까지 이 문장은 「Monday morning」이었다. 그건 GitHub Actions 크론의
             요일이었는데, 러너에서는 마트 사이트에 닿지 않아 **그 크론은 한 번도 제대로 읽지 못했다**
             (08-23 이후 12회 중 Woolworths 지수 성공 1회). 읽는 것은 일요일 로컬 수집뿐이었고
             「Last read」 날짜도 일요일로 찍혀 있었다. lib/contentClaims.test.ts가 plist의 요일과 이 문장을 대조한다.

          ⚠️ 다음 갱신을 **날짜로** 계산해 적지 않는다. 한 회차라도 걸러뛰면 그 날짜는 과거가 되는데,
             이 페이지는 정적 생성이라 화면은 지나간 날짜를 자신 있게 계속 보여준다. 요일은 늙지 않는다.
             (바로 아래 문단의 "경과일 표시는 넣지 않는다"와 같은 이유다.)
        */}
        <p className="text-sm text-gray-600 max-w-xl mx-auto mt-4 leading-relaxed">
          <strong className="text-[#366A1B]">Last read {data.lastUpdated}.</strong>{" "}
          The next re-read is Sunday evening, New Zealand time — every column on
          this page is pulled again each week.
        </p>
        {/*
          이 페이지는 "매월 갱신"을 주장했지만 실제로는 재가격조사를 한 라운드마다
          갱신된다. 날짜만 봐서는 독자가 최신가로 오해할 수 있으므로, 무엇을 보고
          있는지 명시하고 주간 특가는 플래너로 보낸다. (2026-07-29)
          ⚠️ "현재 시각"에 의존하는 경과일 표시는 넣지 않는다 — 정적 생성 시점에
          얼어붙어 오히려 틀린 숫자를 자신 있게 보여주게 된다.
        */}
        <p className="text-sm text-gray-500 max-w-xl mx-auto mt-4 leading-relaxed">
          These are the shelf prices recorded on that date — not today&apos;s prices. Supermarket
          pricing moves week to week, so treat this as a baseline for comparing stores and
          formats, not a live quote. For this week&apos;s specials, use the{" "}
          <Link href={`/${locale}/planner`} className="text-[#366A1B] underline">
            weekly planner
          </Link>
          , which tracks the current Woolworths and New World mailers. South Island prices for the same
          products are on the{" "}
          <Link href={`/${locale}/price-index/south-island`} className="text-[#366A1B] underline">
            South Island page
          </Link>
          . Every reading we have
          taken, going back to our first round, is on the{" "}
          <Link href={`/${locale}/price-history`} className="text-[#366A1B] underline">
            price history page
          </Link>
          .
        </p>
      </section>

      {/* Summary Cards */}
      {hasData && (
        <section className="max-w-5xl mx-auto -mt-8 px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 🔴 품목 수를 숫자 바로 옆에 적는다. 안 적으면 20품목 바구니로 읽힌다 —
                이번 사고의 절반은 "$28.50"이 무엇의 합계인지 화면이 말하지 않은 것이었다. */}
            <div className="bg-white rounded-2xl p-6 shadow-md text-center border border-gray-100">
              <p className="text-sm text-gray-500 mb-1">Woolworths basket</p>
              <p className="text-3xl font-extrabold text-[#1a1a1a]">${basket.woolworths.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {basket.count} of {basket.total} items
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-md text-center border border-gray-100">
              <p className="text-sm text-gray-500 mb-1">Pak&apos;nSave basket</p>
              <p className="text-3xl font-extrabold text-[#1a1a1a]">${basket.paknsave.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">same {basket.count} items</p>
            </div>
            {comparable && basket.count > 0 ? (
              <div className="bg-[#E8F5E9] rounded-2xl p-6 shadow-md text-center border border-[#78B159]/20">
                <p className="text-sm text-[#366A1B] mb-1">You save at {basket.savings >= 0 ? "Pak'nSave" : "Woolworths"}</p>
                <p className="text-3xl font-extrabold text-[#366A1B]">${Math.abs(basket.savings).toFixed(2)}</p>
                <p className="text-xs text-gray-600 mt-1">
                  on these {basket.count} items ({((Math.abs(basket.savings) / basket.woolworths) * 100).toFixed(1)}%)
                </p>
              </div>
            ) : (
              /* 시차가 크면 절약액은 매장 차이가 아니라 시차를 재게 된다 → 숫자를 내리고 이유를 말한다 */
              <div className="bg-amber-50 rounded-2xl p-6 text-center border border-amber-300">
                <p className="text-sm font-semibold text-amber-900 mb-1">Store comparison paused</p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  The two columns were checked {dateGapDays} days apart, so a difference
                  between them measures the gap in time as much as the gap between stores.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 열 날짜가 벌어졌을 때의 경고. 이 페이지의 핵심 기능이 매장 비교라서,
          비교가 성립하지 않는 동안에는 그 사실을 가장 먼저 말해야 한다. */}
      {!comparable && (
        <section className="max-w-5xl mx-auto mt-10 px-4">
          <div className="rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-6">
            <h2 className="text-base font-bold text-amber-900 mb-2">
              Don&apos;t compare the two columns right now
            </h2>
            <p className="text-sm text-amber-900 leading-relaxed mb-3">
              The Woolworths column was refreshed on {data.woolworthsUpdated}. The
              Pak&apos;nSave column is from {data.paknsaveUpdated} — {dateGapDays} days
              earlier. Prices moved a long way in between: Anchor butter went from
              ${" "}
              {items.find((i) => i.name.startsWith("Butter"))?.paknsave?.toFixed(2) ?? "—"}
              -ish territory to ${items.find((i) => i.name.startsWith("Butter"))?.countdown?.toFixed(2) ?? "—"}
              {" "}at Woolworths over that period, which is a real 60% rise rather than a
              store difference.
            </p>
            <p className="text-sm text-amber-900 leading-relaxed">
              So each column is useful on its own — as a record of what that store charged
              on that date — but putting them side by side and reading off a winner would
              be wrong until the Pak&apos;nSave round is done. Per-item winner marks are
              switched off below for the same reason.
            </p>
          </div>
        </section>
      )}

      {/* Price Table */}
      <section className="max-w-5xl mx-auto py-16 px-4">
        <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-8">Price Comparison Table</h2>

        {categories.map((cat) => {
          const catItems = items.filter((i) => i.category === cat);
          return (
            <div key={cat} className="mb-10">
              <h3 className="text-lg font-bold text-[#366A1B] mb-4 border-b border-gray-200 pb-2">{cat}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 text-xs uppercase">
                      <th className="pb-3 pr-4 font-medium">Item</th>
                      <th className="pb-3 pr-4 font-medium text-right">Woolworths</th>
                      <th className="pb-3 pr-4 font-medium text-right">Pak&apos;nSave</th>
                      <th className="pb-3 pr-4 font-medium text-right">New World</th>
                      <th className="pb-3 font-medium text-right">P &minus; W</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catItems.map((item) => {
                      const cd = item.countdown;
                      const ps = item.paknsave;
                      // 열 날짜가 벌어졌으면 diff/승자 자체를 계산하지 않는다.
                      // 시차를 매장 차이로 표시하는 것이 이 페이지의 가장 큰 오독 위험이다.
                      //
                      // 🔴 열 날짜만으로는 부족하다. 특가라 갱신을 건너뛴 행은 열이
                      //    오늘이어도 값은 몇 달 전 것이다. **행 단위로도** 봐야 한다.
                      const nw = item.newworld ?? null;
                      const rowComparable = comparable && rowIsFresh(item);
                      const diff = rowComparable && cd !== null && ps !== null ? cd - ps : null;
                      const cheaper = diff !== null ? (diff > 0 ? "paknsave" : diff < 0 ? "countdown" : "tie") : null;
                      // 🔴 세 열이 다 최신인 행에서만 3자 최저가를 표시한다.
                      //    한 열이 낡았는데 최저가라고 칠하면 시차를 매장 차이로 읽게 된다.
                      const threeWay = isThreeWayComparableRow(item, data.woolworthsUpdated);
                      const trio = threeWay ? [cd as number, ps as number, nw as number] : null;
                      const min = trio ? Math.min(...trio) : null;
                      const strictLow = trio && trio.filter((v) => v === min).length === 1 ? min : null;

                      return (
                        <tr key={item.name} className="border-b border-gray-50">
                          <td className="py-3 pr-4">
                            <p className="font-medium text-[#1a1a1a]">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.unit}</p>
                          </td>
                          <td className={`py-3 pr-4 text-right font-semibold ${cheaper === "countdown" ? "text-[#366A1B]" : "text-[#1a1a1a]"}`}>
                            {cd !== null ? `$${cd.toFixed(2)}` : <span className="text-gray-400" title="Not tracked at this chain">&mdash;</span>}
                            {cheaper === "countdown" && <span className="text-xs ml-1 text-[#366A1B]">*</span>}
                            {/* 매대 라벨과 같은 단위 가격. 크기를 모르는 행(오이·양상추)은 아무것도 안 쓴다. */}
                            {unitPriceLabel(item.name, cd) && (
                              <p className="text-[11px] font-normal text-gray-500">{unitPriceLabel(item.name, cd)}</p>
                            )}
                          </td>
                          <td className={`py-3 pr-4 text-right font-semibold ${cheaper === "paknsave" ? "text-[#366A1B]" : "text-[#1a1a1a]"}`}>
                            {ps !== null ? `$${ps.toFixed(2)}` : <span className="text-gray-400" title="Not tracked at this chain">&mdash;</span>}
                            {cheaper === "paknsave" && <span className="text-xs ml-1 text-[#366A1B]">*</span>}
                            {unitPriceLabel(item.name, ps) && (
                              <p className="text-[11px] font-normal text-gray-500">{unitPriceLabel(item.name, ps)}</p>
                            )}
                          </td>
                          <td className={`py-3 pr-4 text-right font-semibold ${strictLow !== null && nw === strictLow ? "text-[#366A1B]" : "text-[#1a1a1a]"}`}>
                            {nw !== null ? `$${nw.toFixed(2)}` : <span className="text-gray-400" title="Not tracked at this chain">&mdash;</span>}
                            {strictLow !== null && nw === strictLow && <span className="text-xs ml-1 text-[#366A1B]">*</span>}
                            {unitPriceLabel(item.name, nw) && (
                              <p className="text-[11px] font-normal text-gray-500">{unitPriceLabel(item.name, nw)}</p>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            {diff !== null ? (
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                diff > 0 ? "bg-[#E8F5E9] text-[#366A1B]" : diff < 0 ? "bg-orange-50 text-orange-700" : "bg-gray-100 text-gray-500"
                              }`}>
                                {/* 🔴 2026-08-24: 열 머리글이 "W − P"인데 여기서 부호를 뒤집어
                                    찍고 있었다. 라벨과 값이 정면으로 어긋난 채 라이브였다.
                                    표시되는 것은 **P − W**다(Pak'nSave가 싸면 음수·초록).
                                    머리글을 값에 맞췄고, 아래 각주에서 뜻을 한 번 말한다. */}
                                {diff > 0 ? `-$${diff.toFixed(2)}` : diff < 0 ? `+$${Math.abs(diff).toFixed(2)}` : "Tie"}
                              </span>
                            ) : (
                              <span className="text-gray-500 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        {/*
          각주는 `comparable`을 같이 봐야 한다. 비교가 꺼져 있으면 별표가 한 개도
          안 붙는데(diff/cheaper가 null), 각주만 무조건 렌더링돼 "저렴한 쪽을
          강조했다"고 말하고 있었다. 승자 표시를 끈 이유를 페이지 위에서 길게
          설명해 놓고 표 밑에서 뒤집는 셈이라 고쳤다. (2026-08-06)
        */}
        <p className="text-xs text-gray-500 mt-2">
          {comparable
            ? "* Cheaper option highlighted. Prices are regular prices, not specials."
            : "Per-item winner marks are off while the two columns are more than 30 days apart. Prices are regular prices, not specials."}
          {" "}
          {/*
            🔴 2026-08-23: 값이 없는 칸이 **"TBD"**로 나가고 있었다(9칸). 개발용 자리표시자를
               독자에게 그대로 보인 것이고, 읽는 사람은 "아직 안 만든 페이지"로 읽는다.
               대시로 바꾸고, 왜 비었는지 여기서 한 번 말한다.
          */}
          A dash means that chain does not carry a directly comparable product, so there is
          nothing to put in the cell. The last column is Pak&apos;nSave minus Woolworths:
          a green negative is how much less the item costs at Pak&apos;nSave, an orange
          positive how much more.
        </p>
        {/*
          🔴 특가 주간이라 갱신을 건너뛴 행은 열 날짜가 오늘이어도 값은 옛것이다.
             그 행에는 승자 표시를 붙이지 않는데, **왜 안 붙었는지 말하지 않으면**
             독자는 그냥 비교가 빠진 줄 안다. 어느 행이 왜 그런지 이름으로 밝힌다.
        */}
        {comparable && staleRows.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            No winner mark on{" "}
            {staleRows
              .map((i) => `${i.name} (Pak'nSave figure from ${i.paknsaveAsOf ?? "an earlier round"})`)
              .join(", ")}
            . The Pak&apos;nSave figure for these rows is older than the Woolworths one, so
            comparing them would show the passage of time rather than a difference between
            the stores. A row falls behind when the item was on special that week — a special
            price can&apos;t stand in for a regular one — or when the store sells no product
            matching this row&apos;s spec. The last regular price is still shown.
          </p>
        )}
        {/*
          🔴 정의를 바꾼 행은 **값이 아니라 상품이 바뀐 것**이라 앞 라운드와 이어 읽으면 안 된다.
             조용히 바꾸면 "사과가 −1% 움직였다"가 되는데, 그건 품종 교체지 물가가 아니다.
        */}
        {respecRows.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Re-specified on {respecRows[0].respec!.on}:{" "}
            {respecRows.map((i) => `${i.name} (was ${i.respec!.was})`).join("; ")}. These rows
            were stuck because no single product matched the stated spec at both chains, so the
            spec was changed to one that does. The price history for these rows starts again
            from that date — an earlier figure measured a different product, and comparing the
            two would read as a price move when it is a change of product.
          </p>
        )}
      </section>

      {/* Visual Comparison (CSS Bar Chart) */}
      {hasData && (
        <section className="bg-[#F7F9FC] py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-8">Visual Comparison</h2>
            <div className="space-y-3">
              {items.filter((i) => i.countdown !== null && i.paknsave !== null).map((item) => (
                <div key={item.name} className="bg-white rounded-xl p-4">
                  <p className="text-sm font-medium text-[#1a1a1a] mb-2">{item.name}</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20 shrink-0">Woolworths</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                          className="bg-primary-deep h-full rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${((item.countdown ?? 0) / maxPrice) * 100}%`, minWidth: "2rem" }}
                        >
                          <span className="text-[10px] font-bold text-white">${item.countdown?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20 shrink-0">Pak&apos;nSave</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                          className="bg-[#A85F00] h-full rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${((item.paknsave ?? 0) / maxPrice) * 100}%`, minWidth: "2rem" }}
                        >
                          <span className="text-[10px] font-bold text-white">${item.paknsave?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-6 mt-6 text-xs text-gray-500">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary-deep" /> Woolworths</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#A85F00]" /> Pak&apos;nSave</div>
            </div>
          </div>
        </section>
      )}

      {/* First-party observation note — derived from the actual recorded numbers */}
      <section className="max-w-3xl mx-auto pt-16 px-4">
        <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-4">
          What the last full comparison showed
        </h2>
        <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed space-y-4">
          {/* ⚠️ 이 단락은 **양 열이 같은 날짜였던 마지막 라운드**(2026-05-16)를 서술한다.
              현재는 Woolworths 열만 갱신돼 시차가 있으므로, 아래 수치를 '지금'이라고
              쓰면 거짓이 된다. 수치는 data.history[0]에 스냅샷으로 보존돼 있고
              lib/priceIndex.test.ts가 본문과 스냅샷의 일치를 검사한다. */}
          <p>
            The last time both columns were priced in the same round —{" "}
            {lastFull?.date ?? "2026-05-16"} — one thing jumped out:{" "}
            <strong>
              Pak&apos;nSave Ormiston was cheaper on all {lastFull?.paknsaveCheaperCount ?? 20} items
            </strong>
            , with Woolworths Ormiston not coming out ahead on anything in that basket. The
            20-item basket came to{" "}
            <strong>${lastFull?.woolworthsTotal?.toFixed(2)} at Woolworths</strong> versus{" "}
            <strong>${lastFull?.paknsaveTotal?.toFixed(2)} at Pak&apos;nSave</strong> — a $
            {lastFull?.gap?.toFixed(2)} gap for one week of staples, or roughly $
            {lastFull ? (lastFull.gap * 40).toFixed(0) : "—"} across a 40-week school year.
          </p>
          <p>
            The single biggest gap was the 500g cheese block, ${lastFull?.biggestGap?.toFixed(2)}{" "}
            cheaper at Pak&apos;nSave. Dairy and bakery were where the difference stacked up
            fastest; fresh produce was closer between the two stores.
          </p>
          {!comparable && (
            <p>
              <strong>Since then, only the Woolworths column has moved.</strong> It was
              refreshed on {data.woolworthsUpdated} and some of those prices changed a great
              deal — Anchor butter is up about 60% on the May figure, and free-range eggs
              about 24%. That means the two columns can no longer be read against each other,
              and the basket totals at the top of this page are not a store comparison until
              the Pak&apos;nSave round is done. What the fresh Woolworths column does show is
              that the prices in this basket have not been stable, which is the more useful
              thing to know.
            </p>
          )}
          <p>
            Something doing this repeatedly has taught me: the biggest difference is usually not
            obvious from the shelf price at first glance. I end up checking the <em>unit price</em>{" "}
            (per 100g, per litre) on the items that quietly move the weekly total — cheese, wraps,
            and yoghurt especially. Two blocks of cheese can look similarly priced until you notice
            one is 500g and the other 700g. That habit is most of where the gap above actually
            comes from, not any single headline price. It is also why every row of this index is
            pinned to one named product in one named size — and why each price in the table now
            carries that unit price underneath it, worked out from the size in the row&apos;s own
            name so you can check the division yourself. Some rows do not get one, and that is
            deliberate: where a thing is sold singly, or sold in exactly one kilo or one litre,
            the shelf price already <em>is</em> the unit price, and printing it twice would only
            make the table louder.
          </p>
          <p>
            None of this means Woolworths is the wrong choice. The Woolworths store has longer trading
            hours and a wider range, which matters more than a weekly ten-dollar gap to a time-poor parent doing a single
            evening shop. The index is here so you can make that trade-off with the actual numbers in
            front of you, not a vague sense that &quot;one is cheaper.&quot;
          </p>
        </div>
      </section>

      {/* Receipt Photos */}
      <section className="max-w-5xl mx-auto py-16 px-4">
        <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-4">Receipt Verification</h2>
        <p className="text-gray-500 mb-8 leading-relaxed max-w-2xl">
          Both columns are read from the supermarkets&apos; own online shops, so neither
          figure comes from a till receipt. As proof that we actually shop at the store
          behind the Pak&apos;nSave column, here is a real receipt from one of our family
          shops at Pak&apos;nSave Ormiston — it is evidence that this is our store, not the
          source of the numbers in the table. The dates above each column are the check.
        </p>
        <figure className="max-w-sm mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-md border border-gray-100 bg-white">
            <Image
              src="/assets/real-paknsave-ormiston-receipt-masked.jpg"
              alt="A real Pak'nSave Ormiston receipt totalling NZ$101.83, with the card number and auth code blacked out and the bottom payment details cropped away"
              width={840}
              height={648}
              className="w-full h-auto"
              sizes="(max-width: 768px) 100vw, 384px"
            />
          </div>
          <figcaption className="text-xs text-gray-500 italic text-center mt-3 leading-relaxed">
            📷 A real Pak&apos;nSave Ormiston receipt (14 June 2026, total NZ$101.83). This is an
            ordinary family shop, not the 20-item index basket itself — it is here to show I genuinely
            buy and check prices at this store in person. The card number, auth code, and cashier
            details are masked or cropped out for privacy; the store, items, and totals are untouched.
          </figcaption>
        </figure>

        <figure className="max-w-sm mx-auto mt-10">
          <div className="rounded-2xl overflow-hidden shadow-md border border-gray-100 bg-white">
            <Image
              src="/assets/real-paknsave-ormiston-receipt-jun.jpg"
              alt="The top of a real Pak'nSave Ormiston receipt from 18 June 2026, showing the store header at 1 Bellingham Road, Flat Bush, and itemised grocery shelf prices"
              width={1000}
              height={1340}
              className="w-full h-auto"
              sizes="(max-width: 768px) 100vw, 384px"
            />
          </div>
          <figcaption className="text-xs text-gray-500 italic text-center mt-3 leading-relaxed">
            📷 The top of another Pak&apos;nSave Ormiston shop (18 June 2026) — the store address,
            <strong> 1 Bellingham Road, Flat Bush</strong>, matches the methodology above, and you can
            read the itemised shelf prices straight off the docket. The entire payment section (card,
            auth code, and EFTPOS terminal details) is cropped away for privacy; the store name and
            item prices are untouched.
          </figcaption>
        </figure>

        <figure className="max-w-sm mx-auto mt-10">
          <div className="rounded-2xl overflow-hidden shadow-md border border-gray-100 bg-white">
            <Image
              src="/assets/real-paknsave-ormiston-receipt-jul.jpg"
              alt="A real Pak'nSave Ormiston receipt from 18 July 2026 totalling NZ$100.18, showing the store header at 1 Bellingham Road, Flat Bush, and itemised grocery shelf prices with the card number, auth code and payment details masked or cropped out"
              width={1170}
              height={2830}
              className="w-full h-auto"
              sizes="(max-width: 768px) 100vw, 384px"
            />
          </div>
          <figcaption className="text-xs text-gray-500 italic text-center mt-3 leading-relaxed">
            📷 A more recent shop at the same store (18 July 2026, total NZ$100.18). You can read the
            itemised shelf prices, including <strong>Ploughmans wholemeal bread $3.79</strong> and{" "}
            <strong>Yummy apples 6-pack $4.99</strong>, straight off the docket. The card number and
            auth code are blacked out and the EFTPOS terminal section is cropped away for privacy; the
            store name, items, and totals are untouched. The index above is re-read weekly and is now
            newer than this docket; the receipts are here as evidence of which branches stand behind
            the columns, not as the source of the figures. The dates at the top of the page are the
            ones that count.
          </figcaption>
        </figure>
      </section>

      {/* 🔴 2026-09-09 외부 감사 — 화면의 표만으로는 한 칸의 근거를 되짚을 수 없었고,
          분석 글이 인용하는 180개 재료·시계열 관측은 아예 공개돼 있지 않았다.
          세 파일을 원자료로 내보낸다. 20행 지수와 180행 재료 캐시는 **다른 데이터셋**이라
          그 구분을 여기서 말한다 — 20행으로 180행 분석까지 뒷받침하는 것처럼 보이면 안 된다. */}
      <section className="bg-white py-14 px-4 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-3">The raw data</h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            Everything on this page and in the price articles comes from three files, and all
            three are downloadable so you can check the arithmetic rather than take it on trust.
            They are published under CC BY — reuse them, and please say where they came from.
          </p>
          <ul className="space-y-4 mb-6">
            <li className="border border-gray-200 rounded-xl px-5 py-4">
              <a href="/price-index.csv" className="text-[#366A1B] font-bold underline">price-index.csv</a>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                One row per chain per item on this page: reading date, chain, store, the pinned
                product name and SKU, pack size, price, and the normalised unit price. The reading
                date is the column date for Woolworths (automated) and a per-row date for the two
                chains checked individually — blank where a date was never recorded, rather than
                filled in from somewhere else.
              </p>
            </li>
            <li className="border border-gray-200 rounded-xl px-5 py-4">
              <a href="/price-history.csv" className="text-[#366A1B] font-bold underline">price-history.csv</a>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                Every reading kept since each column was pinned to fixed product codes, one row per
                observation. A week where a price did not change has no row: points are recorded by
                the shop&apos;s own column date, so the row count is a count of readings, not of weeks.
              </p>
            </li>
            <li className="border border-gray-200 rounded-xl px-5 py-4">
              <a href="/allergen-labels.csv" className="text-[#366A1B] font-bold underline">allergen-labels.csv</a>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                The allergen label on every tracked product that carries one, as the retailer
                published it — the declared line and the precautionary line kept as separate raw
                text, plus our reading of each. Where the two disagree with the product name, the
                raw text is there so you can judge it yourself rather than take our parse on trust.
              </p>
            </li>
            <li className="border border-gray-200 rounded-xl px-5 py-4">
              <a href="/lunchbox-ingredients.csv" className="text-[#366A1B] font-bold underline">lunchbox-ingredients.csv</a>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                <strong>A different dataset from the table above.</strong> The 20-item index is a
                basket chosen so the same specification can be compared across chains. This file is
                the full set of ingredients the planner prices — pack size, pack price, the serve
                one lunchbox uses, and the cost of that serve. The articles that cite a number of
                ingredients are counting this file, not the table above.
              </p>
            </li>
          </ul>
          <p className="text-sm text-gray-500 leading-relaxed">
            One column in these files is an estimate and is labelled as one: how much of a pack a
            single lunchbox uses. Pack prices are read from the chains; the serve is our household&apos;s
            portion. Every other figure is an observation with a date against it.
          </p>
        </div>
      </section>

      {/* Methodology */}
      <section className="bg-[#F7F9FC] py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-8">How I Collect This Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                num: "1",
                title: "Both columns are read from the stores' own online shops",
                desc: `The Woolworths column comes from Woolworths NZ's online price feed, read automatically for a fixed list of products. The Pak'nSave column is read the same way from Pak'nSave's online shop with the store set to Ormiston — Pak'nSave prices vary by store, so the branch is pinned and every reading is checked to confirm it came back for that branch. These are Click & Collect prices and may differ from the shelf tag. Each column carries its own date above.`,
              },
              {
                num: "2",
                title: "The same product every time",
                desc: "Each of the 20 rows is pinned to one specific product — a named brand, in a named size. I don't take an average of whatever a search returns, because that quietly swaps brands between updates and turns a brand change into a fake price rise. If a pinned product is discontinued or renamed, the update stops and says so rather than substituting something else.",
              },
              {
                num: "3",
                title: "Regular shelf price, never the special",
                desc: "The figure recorded is the normal shelf price, even in a week when the item is on promotion. A half-price week would otherwise show up as deflation. Weekly specials are tracked separately in the planner, which is where they belong.",
              },
              {
                num: "4",
                title: "Auckland stores — South Island on its own page",
                // 2026-10-28: 남섬 매장을 따로 읽기 시작했다 — 같은 상품을 크라이스트처치에서 잰 표가 따로 있다.
                desc: "Prices on this page are from Auckland stores. Prices differ between the islands at all three chains, so the same products are also read at Christchurch stores, on the South Island page. Smaller towns may differ again. I note when a product is unavailable.",
              },
            ].map((item) => (
              <div key={item.num} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <span className="bg-[#366A1B] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {item.num}
                  </span>
                  <h3 className="font-bold text-[#1a1a1a]">{item.title}</h3>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Extended methodology + verification + update history */}
      <section className="bg-[#F7F9FC] py-20 px-4">
        <div className="max-w-3xl mx-auto prose prose-gray">
          <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-6">How the Price Index is built</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            The Kiwi Lunchbox Price Index tracks 20 staple lunchbox ingredients at three
            Auckland supermarkets &mdash; Woolworths and Pak&apos;nSave on all 20, and New
            World on the {threeWayCount} whose price is fresh enough to sit beside them. It exists because supermarket promotional pricing moves
            quickly, and parents need a stable reference point when planning a weekly shop.
            The Woolworths and Pak&apos;nSave columns are the two that carry every item, and
            they are built the same way. The
            Woolworths column is pulled automatically each week from Woolworths&apos; own
            online price feed, with a fixed product code per item so the same product is
            followed over time rather than whatever a search happens to return. The
            Pak&apos;nSave column is pulled the same way, from Pak&apos;nSave&apos;s own
            online shop with the store set to Ormiston &mdash; so it is that
            branch&apos;s <strong>Click &amp; Collect price</strong>, which is not
            guaranteed to match the shelf tag &mdash; the dates for both are shown
            above. When those two dates drift more than
            30 days apart, this page switches off the per-item winner marks and says so
            rather than presenting a stale gap as a store difference. There are no
            third-party data brokers and no marketing partnerships influencing what is
            recorded.
          </p>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mt-10 mb-4">Where the prices are collected</h3>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
            <li>
              <strong>Pak&apos;nSave Ormiston</strong> — 1 Bellingham Road, Flat Bush, East
              Auckland. This is our main supermarket; roughly 60% of our weekly shops happen
              here. Pak&apos;nSave is consistently the lowest-price option for most items,
              which makes it a useful floor benchmark. Using the store I actually buy from is
              deliberate: these are prices I am paying, not a shelf I visited once for a
              comparison.
            </li>
            <li>
              <strong>Woolworths Ormiston</strong> — the Woolworths (formerly Countdown) store at Ormiston
              Town Centre, checked on the same trips. House-brand and branded items are both
              recorded. We also shop the Botany branches of both chains maybe 40% of the time;
              prices between the Ormiston and Botany branches are usually within a few cents,
              so the Ormiston branch is the one pinned for both columns.
            </li>
            <li>
              Where a product is unavailable at one store on the check date, the entry
              is left blank rather than substituted with an online estimate. Blank
              entries are visible in the table above.
            </li>
            <li>
              Both columns are <strong>online prices</strong>, not shelf tags. Woolworths
              figures come from Woolworths NZ&apos;s online price feed; Pak&apos;nSave figures
              come from Pak&apos;nSave&apos;s online shop with the store set to Ormiston.
              Either can lag an in-store change, and a Click &amp; Collect price can differ
              from the shelf tag outright. That trade-off buys a weekly refresh of both
              columns instead of a quarterly one, and it is stated here rather than hidden.
              The May 2026 round below was walked in store, and is kept as-is.
            </li>
            <li>
              Some rows are <strong>not auto-updated</strong> on one side or the other,
              because no product at that chain matches the stated spec, or because the row is
              on special that week and the index records regular prices only. The two examples
              that used to sit here — an 8-pack wrap Woolworths does not sell, and loose Royal
              Gala apples Pak&apos;nSave Ormiston does not stock — were re-pinned on 12 August 2026
              to products both chains actually carry, and are no longer held back. Rows that are
              held back keep their
              last recorded figure until the spec is corrected. Leaving an old number visible
              is better than substituting a different product and calling it the same thing.
            </li>
          </ul>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mt-10 mb-4">The 20 items in the basket</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            The basket is fixed across months so the index is comparable over time. It
            was chosen to represent a typical Term-1 NZ lunchbox week and includes:
          </p>
          {/*
            🔴 2026-08-10: 이 목록은 손으로 적혀 있었고 **위의 표와 달랐다.**
            감귤·우유 2종·토마토소스가 적혀 있었는데 표에 없었고, 버터·쌀·피넛버터·
            슬라이스햄은 표에 있는데 목록엔 없었다. 같은 페이지가 제 표와 모순됐다.
            그래서 이제 표와 같은 데이터에서 만든다 — 손으로 적으면 또 갈라진다.
          */}
          <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-6">
            {Object.entries(
              data.items.reduce<Record<string, string[]>>((acc, it) => {
                (acc[it.category] ??= []).push(
                  it.note ? `${it.name.toLowerCase()} — ${it.note.toLowerCase()}` : it.name.toLowerCase(),
                );
                return acc;
              }, {}),
            ).map(([category, names]) => (
              <li key={category}>
                <strong>{category}</strong> — {names.join(", ")}.
              </li>
            ))}
          </ul>
          <p className="text-gray-700 leading-relaxed mb-6">
            Where a recipe-specific item changes between supermarkets (e.g., Woolworths
            stocks Anchor cheese; Pak&apos;nSave stocks Mainland and house-brand), the
            cheapest comparable house-brand and brand-name version are both checked and
            the recorded price is the one most parents would actually buy.
          </p>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mt-10 mb-4">How a round works now</h3>
          <ol className="list-decimal pl-6 text-gray-700 space-y-2 mb-6">
            <li>
              <strong>Weekly, online, one operator.</strong> Each column is re-read from
              that chain&apos;s own online shop, with the store pinned to Ormiston, and each
              column carries its own reading date at the top of this page. I do it
              personally — no third-party shoppers or paid couriers.
              <br />
              <span className="text-sm text-gray-500">
                Until August 2026 this was a monthly in-store walk instead: both stores
                visited within the same two-hour window, normally on the third Saturday of
                the month. That is how the May 2026 round below was collected, and it is
                kept as-is. It is not how the current table is produced.
              </span>
            </li>
            <li>
              <strong>Receipts kept from our own shops.</strong> The figures in the table
              are read from each chain&apos;s online shop, not from a till, but we keep
              receipts from our own shopping at these stores as evidence that they really
              are the branches behind the columns. Receipts are shown
              with the card number, auth code, and cashier details masked or cropped
              out (see the sample above) — the store name, items, and totals stay
              untouched.
            </li>
            <li>
              <strong>Specials and member-only prices.</strong> Where a product is on a
              promotional special or requires a OneCard / club price, the table keeps its
              regular shelf price (at Pak&apos;nSave and New World, whose online shops show only
              the special price that week, the last non-special price recorded) — so the figure is what a parent would pay without any loyalty programme and
              stays comparable across promotional cycles. Specials themselves are not shown
              in this table.
            </li>
            <li>
              <strong>Which figure is canonical, per column.</strong> For Woolworths, the
              price feed is canonical — it is the retailer&apos;s own published number for
              the pinned product, and it is what allows a weekly refresh. For Pak&apos;nSave,
              the canonical figure is that chain&apos;s own published price <em>for the
              Ormiston store specifically</em>, because Pak&apos;nSave sets prices per store;
              every reading is checked to confirm which store it came back for. Both are
              the retailer&apos;s own online number rather than a shelf tag read by hand,
              and both refresh weekly.
            </li>
            <li>
              <strong>What the automation refuses to do.</strong> The update job will not
              substitute a different product for a pinned one. If a pinned item is renamed,
              resized, or discontinued, the job reports it and leaves the old figure in
              place rather than filling the row with a near-enough match. An earlier
              version picked the median of a keyword search instead of a fixed product,
              and it swapped a Woolworths own-brand cheese block for a premium brand —
              a 40% jump that was a brand change, not a price change. That is the failure
              this design exists to prevent.
            </li>
          </ol>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mt-10 mb-4">What the Price Index does not include</h3>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
            <li>
              <strong>A complete New World column.</strong> New World is in the table, but
              only on the items whose price is fresh enough to sit beside the other two
              &mdash; {threeWayCount} of the {items.length} on the last read. {newworldGaps.length} items
              are blank in that column ({newworldGaps.map((i) => i.name).join(", ")}), so the
              three-way basket is a smaller basket than the two-way one and the two totals
              are not interchangeable. Filling those gaps is the next thing on the list.
            </li>
            <li>
              <strong>Regional NZ stores.</strong> Every price on this page comes from
              two Ormiston stores in East Auckland. We have not measured Wellington,
              Hawke&apos;s Bay, Christchurch or Dunedin, so we publish no adjustment factor
              for them — a number we had not measured would be worth less than none here.
              Treat the index as an Auckland benchmark and check your own shelf.
            </li>
            <li>
              <strong>Online-only retailers.</strong> Costco, online specialty stores
              (FreshChoice online, Bin Inn, etc.) are not included. The 20-item basket
              focuses on mainstream supermarket pricing that most NZ families actually
              experience.
            </li>
            <li>
              <strong>Bulk and farmers&apos; market pricing.</strong> Farmer&apos;s
              market produce in Auckland (Avondale, La Cigale, Parnell, etc.) is often
              cheaper for in-season fruit and vegetables, but the index uses
              supermarket prices because that is where the bulk of NZ families shop.
            </li>
          </ul>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mt-10 mb-4">Limitations and disclaimers</h3>
          <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
            <li>
              Prices are accurate <strong>as of the check date</strong> only. Supermarket
              prices change weekly, and the last-updated banner at the top of the table
              should be checked before relying on a figure for an actual shop.
            </li>
            <li>
              The index reflects <strong>two specific stores</strong>. Other Woolworths
              or Pak&apos;nSave branches may differ by NZ$0.20–0.80 on most items.
              Central-city branches like Sylvia Park or Newmarket, for instance, tend to
              run slightly higher than the Ormiston stores due to retail rent differential.
            </li>
            <li>
              The index is <strong>not endorsed by Woolworths, Pak&apos;nSave, Foodstuffs,
              or Woolworths NZ</strong>. It is an independent reader-facing reference.
              Brand and logo references are nominative use only.
            </li>
            <li>
              Where a price is unavailable or out of stock, the entry is left blank in
              the table. Blanks are not imputed or estimated.
            </li>
          </ul>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mt-10 mb-4">How the index is used by the planner</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            The{" "}
            <Link href={`/${locale}/planner`} className="text-[#366A1B] underline">Kiwi Lunchbox Planner</Link>
            {" "}does not read this 20-item table. It prices from a larger weekly cache of
            pinned supermarket products (<code>data/price_cache.json</code>), refreshed by the
            same routine; this page is the part of that work published for scrutiny. When the
            planner generates a weekly menu, the cost shown on the results screen is the sum of
            each ingredient&apos;s pack price multiplied by the share of the pack one lunchbox uses. If you toggle on &quot;use this week&apos;s sales&quot; in the planner sidebar,
            the planner additionally consults a separate weekly promotions feed
            (Woolworths and New World mailers) and discounts the affected ingredients
            on the spot.
          </p>
          <p className="text-gray-700 leading-relaxed mb-6">
            Every <em>pack price</em> in the planner traces back to a named product at a
            named chain — that chain&apos;s own published price for that exact product, with the
            Pak&apos;nSave store pinned to Ormiston. None of them is an industry average.
            What <em>is</em> an estimate, and is labelled &quot;Est.&quot; on the results screen, is the
            second half of the sum: how much of a pack one lunchbox uses. A 30g serve of cheese
            out of a 500g block is our household&apos;s portion, not a published figure, and a
            family that cuts thicker slices will spend more than the screen says.
          </p>

          <h3 className="text-2xl font-bold text-[#1a1a1a] mt-10 mb-4">Editorial accountability</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            If you spot a price you think is wrong — perhaps you shopped at the same
            store the same week and saw a different number — please email it through
            the{" "}
            <Link href={`/${locale}/contact`} className="text-[#366A1B] underline">contact form</Link>
            . Submitted corrections are checked against the store&apos;s own online listing
            for the pinned product and against the prices recorded for that week, and where
            the reader is right the figure is corrected and a new <code>lastUpdated</code>{" "}
            stamp is published. Every recorded round is kept and published in full as{" "}
            <a href="/price-history.csv" className="text-[#366A1B] underline">price-history.csv</a>.
            The same applies to the update date itself: this page shows when the index
            was last re-priced, not when the page was last touched, so a stale date is
            visible rather than hidden.
          </p>
          <p className="text-gray-700 leading-relaxed mb-6">
            This page is owned, written, and maintained by{" "}
            <Link href={`/${locale}/about`} className="text-[#366A1B] underline">Yong Jae Lee</Link>
            , a Senior Product Designer based in Auckland and the solo operator of
            Kiwi Lunchbox. There is no team. The same person who designs the site,
            checks the prices, and replies to your email is the person whose name is on
            this page.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#366A1B] py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          {/* 🔴 09-29: 「이 가격을 플래너에 쓰세요」·「Woolworths와 Pak'nSave 가격」 — 플래너는 이 표가 아니라
              Woolworths 주간 캐시로 계산한다(플래너 페이지가 「not the 20-item table」이라고 스스로 밝힌다). */}
          <h3 className="text-3xl font-extrabold text-white mb-4">See what a week of lunches costs</h3>
          <p className="text-white/80 mb-8 leading-relaxed">
            The Kiwi Lunchbox planner estimates your weekly lunchbox cost from a separate weekly
            cache of regular Woolworths prices &mdash; one tracked product per ingredient &mdash;
            not from the table on this page.
          </p>
          <Link
            href={`/${locale}/planner`}
            className="bg-white hover:bg-[#F7F9FC] text-[#366A1B] font-bold py-4 px-10 rounded-full text-lg transition-colors shadow-lg inline-block"
          >
            Try the Planner
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer locale={locale} />
    </main>
  );
}
