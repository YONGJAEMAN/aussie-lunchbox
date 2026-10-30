import { NextResponse } from "next/server";
import PRICES from "@/data/price_cache.json";
import { labelFor } from "@/lib/allergenLabels";
import { ALLERGENS, ALLERGEN_LABEL, productName } from "@/lib/allergenFacts";
import { declares, warnsAbout } from "@/lib/allergenLabels";
import { AU_REVIEW, dietTagsFor } from "@/lib/ingredientDiet";
import { reviewBasis } from "@/lib/snackChecker";
import REVIEW from "@/data/allergenReview.au.json";

/**
 * 알레르겐 라벨 원자료.
 *
 * 🔴 글이 말하는 모든 수치가 이 파일에서 다시 나와야 한다. 한 줄 = 한 상품이고,
 *    그 줄만 보고 「선언인가 주의인가」를 되짚을 수 있어야 한다.
 *
 * 🔴 **라벨 원문을 그대로 싣는다.** 우리 파싱(선언/주의 경계)을 믿으라고 하지 않고,
 *    독자가 같은 문자열을 보고 직접 판단할 수 있게 한다 — 그 경계가 이 사이트에서
 *    실제로 틀린 적이 있다(`Dates`의 선언 필드에 주의 문구가 들어와 있다).
 *
 * ⚠️ 관측일은 가격 캐시의 `timestamp`다. 라벨은 상품 조회와 같은 호출에서 받는다.
 *
 * 🔴 Aussie(2026-10-30): `reading_*` 열은 **승인 판정표**(`data/allergenReview.au.json`)다 — 플래너가 거르는 값이
 *    이것이다. 원문 선언과 다를 수 있어서(Teriyaki: 원문 선언엔 참깨가 없고 원재료엔 있다) 둘 다 싣는다.
 *    라벨 원문이 없는 원물도 판정표에 줄이 있으면 싣는다(원문 열은 빈칸).
 */

type Entry = { timestamp?: number; data?: { name?: string; sku?: string; allergens?: string[]; allergenMaybePresent?: string } };
const CACHE = PRICES as Record<string, Entry>;

const q = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const HEADER = [
  "ingredient",
  "product_name",
  "sku",
  "observed_on",
  "chain",
  "declared_raw",
  "precautionary_raw",
  ...ALLERGENS.map((a) => `declares_${a}`),
  ...ALLERGENS.map((a) => `warns_${a}`),
  "reading_contains",
  "reading_basis",
  "reading_checked_on",
  "measurement",
].join(",");

export function GET() {
  const lines: string[] = [HEADER];
  for (const [key, entry] of Object.entries(CACHE)) {
    const label = labelFor(key);
    const reviewed = AU_REVIEW[key];
    // 라벨도 판정도 없는 재료는 줄을 만들지 않는다 — 빈 줄은 「없다」가 아니다
    if (!label && !reviewed) continue;
    const tags = dietTagsFor(key);
    const reading = tags === null ? "unknown" : ALLERGENS.filter((t) => tags.has(t)).join("; ") || "none";
    const d = entry.data ?? {};
    const observed = entry.timestamp ? new Date(entry.timestamp).toISOString().slice(0, 10) : "";
    lines.push(
      [
        q(key),
        q(productName(key)),
        q(d.sku ?? ""),
        q(observed),
        q("Woolworths Australia"),
        q(label?.declared.trim() ?? ""),
        q(label?.precautionary.trim() ?? ""),
        ...ALLERGENS.map((a) => q(label ? (declares(key, a) ? "yes" : "no") : "")),
        ...ALLERGENS.map((a) => q(label ? (warnsAbout(key, a) ? "yes" : "no") : "")),
        q(reading),
        q(reviewed ? reviewBasis(key) || "unknown" : ""),
        q(reviewed ? (REVIEW as { reviewed: string }).reviewed : ""),
        q("raw columns = label text as published by the retailer on observed_on (declared/precautionary split is ours); reading_* = our hand-checked reading of the Contains line and ingredient list, which is what the planner filters on"),
      ].join(","),
    );
  }
  return new NextResponse(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="aussie-lunchbox-allergen-labels.csv"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
