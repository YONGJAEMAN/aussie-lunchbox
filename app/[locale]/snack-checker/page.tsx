import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { buildPageMetadata, withBrand } from "@/lib/seo/pageMetadata";
import {
  CHECKER_ALLERGIES, CHECKER_LABEL, checkerRows, checkerSummary, checkerDescription, labelReadRange, auDate,
} from "@/lib/snackChecker";
import { CHOKING_SOURCE } from "@/lib/chokingRisk";
import REVIEW from "@/data/allergenReview.au.json";
import SnackCheckerClient from "@/components/SnackCheckerClient";
import Footer from "@/components/Footer";
import { BRAND } from "@/lib/brand";
import { PLANNER_CATEGORIES, EXCLUDED_CATEGORY } from "@/lib/snackEconomics";

const TITLE = "Lunchbox Snack Allergen Checker (Australia) — read from the label";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    path: "/snack-checker",
    locale: await getLocale(),
    title: withBrand(TITLE),
    description: checkerDescription(),
  });
}

export default async function SnackCheckerPage() {
  const locale = await getLocale();
  const rows = checkerRows();
  const sum = checkerSummary(rows);
  const { oldest, newest } = labelReadRange();
  const first = auDate(oldest);
  const last = auDate(newest);
  // 판정표 승인일 — 원문은 매주 다시 읽지만, 그 원문을 사람이 읽은 날은 이날이다.
  const reviewedOn = auDate(new Date(`${(REVIEW as { reviewed: string }).reviewed}T12:00:00+10:00`).getTime());
  const readWhen = first === last ? `on ${last}` : `between ${first} and ${last}`;
  const words = CHECKER_ALLERGIES.map((a) => CHECKER_LABEL[a].toLowerCase());
  const allergyList = `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;

  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Australian lunchbox allergen labels",
    description:
      `Allergen declarations and precautionary ("may contain") text from the Woolworths Australia product tracked for each lunchbox ingredient, with a hand-checked reading of the ingredient list. This page shows the ${sum.total} snacks the planner packs; the CSV has every tracked product.`,
    creator: { "@type": "Person", name: "Yong Jae Lee", url: "https://www.linkedin.com/in/francescolee/" },
    dateModified: new Date(newest).toISOString().slice(0, 10),
    spatialCoverage: "Australia",
    license: "https://creativecommons.org/licenses/by/4.0/",
    distribution: [{
      "@type": "DataDownload",
      encodingFormat: "text/csv",
      contentUrl: `${BRAND.SITE_URL}/allergen-labels.csv`,
    }],
  };

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd).replace(/</g, "\\u003c") }}
      />

      <section className="bg-[#F7F9FC] pt-24 pb-16 px-4 text-center">
        <p className="text-[#366A1B] font-semibold text-sm uppercase tracking-widest mb-4">Original Data</p>
        <h1 className="text-3xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-3xl mx-auto leading-tight">
          Lunchbox snack allergen checker
        </h1>
        <p className="text-[#555] max-w-2xl mx-auto text-lg">
          These are the {sum.total} snacks the <Link href={`/${locale}/planner`} className="text-[#366A1B] underline font-semibold">planner</Link>{" "}
          can put in a lunchbox. Tick an allergy and the list shows what it would still pack — this page
          runs the same check the planner runs, so the two cannot disagree.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">Where the answers come from</h2>
        <p className="text-[#555] mb-3">
          For each packaged ingredient I track one Woolworths Australia product. From its listing I read the
          allergen declaration (&ldquo;Contains&rdquo;), the ingredient list and the precautionary label
          (&ldquo;May contain&rdquo;). The Contains line alone was not enough — the tracked teriyaki sauce lists
          sesame seeds in its ingredients but not on its Contains line — so I read the ingredient lists as well
          and checked every reading by hand on {reviewedOn}. The listing text and prices below were read {readWhen}.
        </p>
        <p className="text-[#555] mb-3">
          {sum.labelBacked} of the {sum.total} snacks are checked against at least one packet label.
          The other {sum.handOnly} have no Contains line on the tracked listing (fresh produce, for example), so
          their reading comes from the ingredient list, from what the food is (fresh produce), or — for a few
          with neither — from my own check. Each line below says which.
        </p>
        {/* 🔴 가격은 PR #120 이후 정가다(특가·회원가 아님). 그 전 캐시는 salePrice라 이 줄을 못 썼다. */}
        <p className="text-[#555] mb-3">
          Each snack also shows the regular Woolworths Australia shelf price of its tracked product — not a
          special or member price — per pack, or per kg or each where it is sold loose. That is the price
          the planner costs the snack at, and &ldquo;a serve&rdquo; is that price times the share of the pack
          the planner counts as one lunchbox serve. Prices at other supermarkets, and on special, will differ.
        </p>
        <p className="text-[#555]">
          The planner filters on the &ldquo;Contains&rdquo; line only. A &ldquo;May contain&rdquo; warning does
          not take a snack out of a plan — here those are marked ⚠ so you can decide.
        </p>
        {/* 🔴 개수는 전부 checkerSummary → chokingRisk 표에서 온다. 손으로 적지 말 것. */}
        <p className="text-[#555] mt-3">
          Each snack also has a Kindy (under 5) line, read from the same table the planner&apos;s Kindy option
          uses. {sum.kindyExcluded} of the {sum.total} are left out of kindy plans
          ({sum.kindyExcluded - sum.kindyOurs} because the {CHOKING_SOURCE.publisher}&apos;s choking guidance for
          early learning services lists them, {sum.kindyOurs} on our own judgement), and {sum.kindyAlter} are kept
          with a prep note from that guidance.
        </p>
      </section>

      {/* 🔴 필터별 개수를 서버 HTML에 먼저 싣는다 — 토글을 안 눌러도 답이 보이게. 전부 checkerSummary에서 온다. */}
      <section className="max-w-4xl mx-auto px-4 pb-10">
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Each filter at a glance</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-[#e5e5e5] text-sm text-[#666]">
              <th className="py-2">Filter</th>
              <th className="py-2">Still packed</th>
              <th className="py-2">Of those, ⚠ may contain</th>
              <th className="py-2">Filtered out</th>
            </tr>
          </thead>
          <tbody>
            {sum.perAllergy.map((p) => (
              <tr key={p.allergy} className="border-b border-[#f0f0f0]">
                <td className="py-2 font-semibold">{CHECKER_LABEL[p.allergy]}-free</td>
                <td className="py-2">{p.pass} of {sum.total}</td>
                <td className="py-2">{p.passButWarned}</td>
                <td className="py-2">{sum.total - p.pass}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-4">
        <div className="rounded-xl border-2 border-[#E0A800] bg-[#FFF8E1] p-4 text-[#333]">
          <p className="font-bold mb-1">Read the packet anyway.</p>
          <p className="text-sm">
            Labels change when products are reformulated, and the pack in your hand is the one that counts.
            Precautionary (&ldquo;may contain&rdquo;) labelling is voluntary in Australia, so no warning here
            is not a promise of no cross-contact. This page covers the allergies the planner filters —{" "}
            {allergyList} — not soy or anything else.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-10">
        <SnackCheckerClient rows={rows} allergies={CHECKER_ALLERGIES} labels={CHECKER_LABEL} />
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12 border-t border-[#f0f0f0]">
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">More on the labels</h2>
        <p className="text-[#555] mb-3">
          Every tracked product&apos;s label text, with my reading of it next to the raw text, is in{" "}
          <a href="/allergen-labels.csv" className="text-[#366A1B] underline font-semibold">allergen-labels.csv</a>{" "}
          (CC BY 4.0).
        </p>
        <p className="text-[#555]">
          Each day the planner packs one {PLANNER_CATEGORIES[0]} snack and one from the rest of this list; if
          nothing in a group passes your filters, that slot is left empty. {EXCLUDED_CATEGORY} snacks are not
          listed because the planner never packs them.
        </p>
      </section>

      <Footer locale={locale} />
    </main>
  );
}
