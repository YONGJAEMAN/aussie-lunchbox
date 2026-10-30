import { NextResponse } from "next/server";
import history from "@/data/priceHistory.json";

/**
 * 가격지수 시계열 원자료 — 한 줄 = 한 관측일의 한 품목 한 체인.
 *
 * 🔴 Kiwi 2026-09-09 외부 감사 — 관측을 인용하는데 독자가 그 관측을 볼 방법이 없었다.
 *
 * 🔴 **값이 안 바뀐 주에는 점이 없다.** 열 날짜로 dedupe하기 때문이다 —
 *    커밋 날짜로 점을 찍으면 같은 값이 몇 주 연속 「새로 관측된 값」으로 그려져
 *    물가가 완벽히 안정된 것처럼 보이는 거짓 그래프가 된다.
 *    그러므로 이 파일의 줄 수는 관측 횟수이지 주 수가 아니다.
 */

type Reading = { date: string; items: Record<string, number> };
const COLUMNS = (history as unknown as { columns: Record<string, Reading[]> }).columns;

const LABEL: Record<string, string> = { woolworths: "Woolworths" };

const q = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function GET() {
  const lines: string[] = ["observed_on,chain,index_item,price_aud,price_type"];
  for (const [col, readings] of Object.entries(COLUMNS)) {
    for (const r of readings) {
      for (const [name, price] of Object.entries(r.items)) {
        lines.push([q(r.date), q(LABEL[col] ?? col), q(name), q(price.toFixed(2)), "regular"].join(","));
      }
    }
  }
  return new NextResponse(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="aussie-lunchbox-price-history.csv"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
