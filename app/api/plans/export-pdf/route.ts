import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { PlanItem } from "@/lib/types";
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

interface PdfDocProps {
  planData: PlanItem[];
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

  try {
    const body = await req.json();
    const planData: PlanItem[] = Array.isArray(body.planData) ? body.planData.slice(0, 7) : [];
    const shoppingList: string[] = Array.isArray(body.shoppingList)
      ? body.shoppingList.slice(0, 200)
      : [];

    const docElement = PdfDocument({ planData, shoppingList });
    const buffer = await renderToBuffer(docElement);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="aussie_lunchbox_plan.pdf"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
