"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { CheckerAllergy, CheckerRow, Evidence, PackPrice } from "@/lib/snackChecker";

/**
 * 간식 알레르겐 확인 — 필터 토글과 목록.
 *
 * 🔴 판정은 서버가 `snackAllowed`로 끝내서 넘긴다. 여기는 **고르고 가리기만** 한다 —
 *    lib를 import하면 가격 캐시 전체가 클라이언트 번들로 딸려 온다(타입만 가져온다).
 * 기본은 필터 없음이라 서버 HTML에 목록 전체가 그대로 실린다.
 */

const TAG_WORD: Record<string, string> = { nuts: "nuts", milk: "milk", egg: "egg", gluten: "gluten", sesame: "sesame" };

const money = (n: number) => `$${n.toFixed(2)}`;

/** 🔴 무게로 파는 것(per kg)·낱개(each)는 팩값이 아니라 단가다 — 플래너 레시피 창과 같은 읽기. 크기를 모르면 모른다고 쓴다. */
function packText(p: PackPrice): string {
  if (p.price === null) return "—";
  if (p.pack === "per kg") return `${money(p.price)}/kg`;
  if (p.pack === "each") return `${money(p.price)} each`;
  return p.pack ? `${money(p.price)} for ${p.pack}` : money(p.price);
}

function PriceLine({ r }: { r: CheckerRow }) {
  return (
    <p className="text-sm text-[#444] mb-3">
      <span className="font-semibold text-[#1a1a1a]">Regular Woolworths shelf price:</span>{" "}
      {r.packs.map((p, i) => {
        // 라벨 근거 줄이 이미 상품명을 보여 준다. 손 플래그 재료는 여기서라도 어느 상품 값인지 밝힌다.
        const named = r.evidence.some((e) => e.kind === "label" && e.ingredient === p.ingredient);
        return (
          <span key={p.ingredient}>
            {i > 0 && "; "}
            {r.packs.length > 1 && `${p.ingredient} `}
            {packText(p)}
            {!named && p.price !== null && p.product && <span className="text-[#666]"> · {p.product}</span>}
            {p.price !== null && !p.pack && <span className="text-[#666]"> (pack size not recorded)</span>}
          </span>
        );
      })}
      {r.serve !== null && (
        <span className="text-[#666]"> — about {money(r.serve)} a serve at the planner&apos;s portion</span>
      )}
    </p>
  );
}

function EvidenceLine({ e }: { e: Evidence }) {
  if (e.kind === "label") {
    return (
      <li className="text-sm text-[#444]">
        <span className="font-semibold text-[#1a1a1a]">{e.ingredient}</span>{" "}
        <span className="text-[#666]">— tracked product: {e.product}{e.readOn && `, label read ${e.readOn}`}</span>
        <span className="block">
          <span className="font-semibold">My reading:</span>{" "}
          {e.reading.length ? `contains ${e.reading.map((t) => TAG_WORD[t]).join(", ")}` : "none of nuts, milk, egg, gluten or sesame"}
          {e.basis && <span className="text-[#666]"> ({e.basis})</span>}
        </span>
        <span className="block text-[#666]">
          Listing says — Contains: {e.declared || "nothing declared"} · May contain: {e.precautionary || "no warning"}
        </span>
      </li>
    );
  }
  if (e.kind === "hand") {
    return (
      <li className="text-sm text-[#444]">
        <span className="font-semibold text-[#1a1a1a]">{e.ingredient}</span>{" "}
        <span className="text-[#666]">— {e.basis || "no packet label, flagged by hand"}: </span>
        {e.flagged.length ? `contains ${e.flagged.map((t) => TAG_WORD[t]).join(", ")}` : (e.unverified.length ? "none of nuts, milk, egg or gluten" : "none of nuts, milk, egg, gluten or sesame")}
        {e.unverified.length ? ` · ${e.unverified.map((t) => TAG_WORD[t]).join(", ")} not checked — no label to read, so the ${e.unverified.map((t) => TAG_WORD[t]).join(", ")} filter leaves it out` : ""}
      </li>
    );
  }
  return (
    <li className="text-sm text-[#B23B3B]">
      <span className="font-semibold">{e.ingredient}</span> — not in my data, so the planner leaves this snack out
      whenever any allergy filter is on.
    </li>
  );
}

/**
 * 「Kindy (under 5)」 줄. 판정은 서버가 `snackChokingFlag`로 끝내서 넘긴다 — 플래너와 같은 표.
 * 문구는 플래너 카드와 같은 messages 키(`kindy_prep_*`·`kindy_cat_*`)를 쓴다.
 */
function KindyLine({ r }: { r: CheckerRow }) {
  const t = useTranslations();
  const c = r.choking;
  let text: string;
  let cls: string;
  if (c.kind === "exclude") {
    text = c.rule.basis === "guide"
      ? t("checker_kindy_excluded", { category: t(`kindy_cat_${c.rule.category}`) })
      : t("checker_kindy_ours", { reason: t(`kindy_ours_${c.rule.reason}`) });
    cls = "bg-[#FDECEC] text-[#B23B3B]";
  } else if (c.kind === "alter") {
    text = t("checker_kindy_alter", { how: c.notes.map((n) => t(`kindy_prep_${n.prep}`)).join(" ") });
    cls = "bg-[#EEF5FB] text-[#1F4466]";
  } else {
    text = t("checker_kindy_none");
    cls = "bg-[#F3F4F6] text-[#444]";
  }
  return (
    <p className={`text-xs font-semibold rounded-lg px-3 py-1.5 mb-3 ${cls}`} data-kindy={c.kind}>
      {t("planner_allergy_kindy")}: {text}
    </p>
  );
}

export default function SnackCheckerClient({
  rows,
  allergies,
  labels,
}: {
  rows: CheckerRow[];
  allergies: readonly CheckerAllergy[];
  labels: Record<CheckerAllergy, string>;
}) {
  const t = useTranslations();
  const [selected, setSelected] = useState<CheckerAllergy[]>([]);
  const toggle = (a: CheckerAllergy) =>
    setSelected((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]));

  const shown = rows.filter((r) => selected.every((a) => r.passes[a]));
  const warned = shown.filter((r) => selected.some((a) => r.mayContain[a]));
  const categories = [...new Set(rows.map((r) => r.category))];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4" role="group" aria-label="Allergy filters">
        {allergies.map((a) => {
          const on = selected.includes(a);
          return (
            <button
              key={a}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(a)}
              className={`min-h-touch px-4 rounded-full border-2 font-semibold text-sm transition-colors ${
                on ? "bg-[#366A1B] border-[#366A1B] text-white" : "bg-white border-[#ccc] text-[#333] hover:border-[#366A1B]"
              }`}
            >
              {on ? "✓ " : ""}{labels[a]}-free
            </button>
          );
        })}
        {selected.length > 0 && (
          <button type="button" onClick={() => setSelected([])} className="min-h-touch px-3 text-sm underline text-[#555]">
            Clear
          </button>
        )}
      </div>

      <p className="text-[#333] mb-8" aria-live="polite">
        {selected.length === 0 ? (
          <>Showing all {rows.length} snacks. Tick an allergy to see what the planner would still pack.</>
        ) : (
          <>
            {shown.length} of {rows.length} snacks pass {selected.map((a) => labels[a]).join(" + ")}.{" "}
            {warned.length > 0 && (
              <span className="text-[#8A5A00] font-semibold">
                ⚠ {warned.length} of those carry a &ldquo;may contain&rdquo; warning for what you ticked — the planner still packs them.
              </span>
            )}
          </>
        )}
      </p>

      {categories.map((cat) => {
        const list = shown.filter((r) => r.category === cat);
        if (!list.length) return null;
        return (
          <section key={cat} className="mb-10">
            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">{cat}</h2>
            <ul className="space-y-4">
              {list.map((r) => {
                const warnHere = selected.filter((a) => r.mayContain[a]);
                return (
                  <li
                    key={r.name}
                    className={`rounded-xl border p-4 ${warnHere.length ? "border-[#E0A800] bg-[#FFF8E1]" : "border-[#e5e5e5] bg-white"}`}
                  >
                    <h3 className="text-lg font-bold text-[#1a1a1a]">
                      {r.name}
                      {r.keepCold && <span aria-label={t("planner_snack_keep_cold")} title={t("planner_snack_keep_cold")}> 🧊</span>}
                    </h3>
                    {warnHere.length > 0 && (
                      <p className="text-sm font-semibold text-[#8A5A00] mt-1">
                        ⚠ May contain {warnHere.map((a) => labels[a].toLowerCase()).join(", ")} (precautionary label). The planner does not exclude on this.
                      </p>
                    )}
                    <ul className="flex flex-wrap gap-2 mt-2 mb-3" aria-label="Filter results">
                      {allergies.map((a) => {
                        const status = !r.passes[a] ? "fail" : r.mayContain[a] ? "warn" : "pass";
                        const cls =
                          status === "fail" ? "bg-[#FDECEC] text-[#B23B3B]"
                            : status === "warn" ? "bg-[#FFF3CD] text-[#8A5A00]"
                              : "bg-[#EAF4E4] text-[#366A1B]";
                        const word = status === "fail" ? "✗ filtered out" : status === "warn" ? "✓ passes · ⚠ may contain" : "✓ passes";
                        return (
                          <li key={a} className={`text-xs font-semibold rounded-full px-3 py-1 ${cls}`}>
                            {labels[a]}: {word}
                          </li>
                        );
                      })}
                    </ul>
                    <KindyLine r={r} />
                    <PriceLine r={r} />
                    <ul className="space-y-2">
                      {r.evidence.map((e) => <EvidenceLine key={e.ingredient} e={e} />)}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
