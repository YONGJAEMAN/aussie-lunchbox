import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { getIngredientCategory } from "@/lib/utils";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import React from "react";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", backgroundColor: "#FDFAF2" },
  header: { marginBottom: 20, borderBottom: "2 solid #7B3F00", paddingBottom: 10 },
  title: { fontSize: 24, fontFamily: "Helvetica-Bold", color: "#7B3F00" },
  subtitle: { fontSize: 11, color: "#666", marginTop: 4 },
  section: { marginBottom: 16 },
  dayTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#7B3F00", marginBottom: 4 },
  menuName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#333", marginBottom: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  label: { fontSize: 10, color: "#555" },
  value: { fontSize: 10, color: "#333", fontFamily: "Helvetica-Bold" },
  divider: { borderBottom: "1 solid #ddd", marginVertical: 8 },
  shoppingSection: { marginTop: 20 },
  shoppingTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#7B3F00", marginBottom: 10 },
  catTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#555", marginBottom: 4, marginTop: 8 },
  ingredient: { fontSize: 10, color: "#333", marginLeft: 10, marginBottom: 2 },
});

// Only the fields the PDF actually renders — the request is sanitised down to this.
interface PdfPlanItem {
  day: string;
  menuName: string;
  rawIngredients: string[];
  estCost: string;
  nutrition: { calories: number; label: string };
}

interface PdfDocProps {
  planData: PdfPlanItem[];
  shoppingList: string[];
}

function PdfDocument({ planData, shoppingList }: PdfDocProps) {
  const catMap: Record<string, Set<string>> = {};
  for (const ing of shoppingList) {
    const cat = getIngredientCategory(ing);
    if (!catMap[cat]) catMap[cat] = new Set();
    catMap[cat].add(ing);
  }

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, "🦘 Aussie Lunchbox Plan"),
        React.createElement(Text, { style: styles.subtitle }, "Your weekly lunchbox meal plan")
      ),
      ...planData.map((item) =>
        React.createElement(
          View,
          { key: item.day, style: styles.section },
          React.createElement(Text, { style: styles.dayTitle }, item.day),
          React.createElement(Text, { style: styles.menuName }, item.menuName),
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, "Ingredients: "),
            React.createElement(Text, { style: styles.value }, item.rawIngredients.join(", "))
          ),
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, "Est. Cost: "),
            React.createElement(Text, { style: styles.value }, item.estCost)
          ),
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, "Calories: "),
            React.createElement(Text, { style: styles.value }, `${item.nutrition.calories} ${item.nutrition.label}`)
          ),
          React.createElement(View, { style: styles.divider })
        )
      ),
      React.createElement(
        View,
        { style: styles.shoppingSection },
        React.createElement(Text, { style: styles.shoppingTitle }, "🛒 Shopping List"),
        ...Object.entries(catMap).map(([cat, items]) =>
          React.createElement(
            View,
            { key: cat },
            React.createElement(Text, { style: styles.catTitle }, cat),
            ...[...items].map((ing) =>
              React.createElement(Text, { key: ing, style: styles.ingredient }, `• ${ing}`)
            )
          )
        )
      )
    )
  );
}

export async function POST(req: NextRequest) {
  // Rate limit: 10 PDF exports per IP per minute
  const ip = getClientIp(req);
  if (!checkRateLimit(`pdf:${ip}`, 10, 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Reject oversized bodies before parsing (cheap DoS guard).
  if (Number(req.headers.get("content-length") ?? 0) > 256_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  try {
    const body = await req.json();
    if (!Array.isArray(body?.planData) || body.planData.length === 0) {
      return NextResponse.json({ error: "Missing or empty planData" }, { status: 400 });
    }

    // Sanitise every field to a bounded string/number so a malformed or hostile
    // item can neither throw nor bloat the render.
    const cap = (v: unknown, n: number): string =>
      (typeof v === "string" ? v : String(v ?? "")).slice(0, n);
    const planData: PdfPlanItem[] = body.planData
      .slice(0, 7)
      .map((it: Record<string, unknown>) => {
        const nut = (it?.nutrition ?? {}) as Record<string, unknown>;
        return {
          day: cap(it?.day, 40),
          menuName: cap(it?.menuName, 120),
          rawIngredients: (Array.isArray(it?.rawIngredients) ? it.rawIngredients : [])
            .slice(0, 40)
            .map((g: unknown) => cap(g, 80)),
          estCost: cap(it?.estCost, 24),
          nutrition: {
            calories: Number.isFinite(Number(nut.calories)) ? Number(nut.calories) : 0,
            label: cap(nut.label, 24),
          },
        };
      });
    const rawShopping: unknown[] = Array.isArray(body?.shoppingList) ? body.shoppingList : [];
    const shoppingList: string[] = rawShopping
      .filter((s): s is string => typeof s === "string")
      .slice(0, 200)
      .map((s) => s.slice(0, 80));

    const docElement = PdfDocument({ planData, shoppingList });
    const buffer = await renderToBuffer(docElement);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="aussie_lunchbox_plan.pdf"',
      },
    });
  } catch (err) {
    console.error("export-pdf error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
