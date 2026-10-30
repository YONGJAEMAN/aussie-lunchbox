import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { specialFrom, groupBySku, mergeWeek } from "../scripts/update_specials.mjs";
import { specialsWeek, auToday } from "./auWeek.mjs";
import { PINNED_SKUS } from "./priceSearch.mjs";
import { encodeSharedPlan, decodeSharedPlan, SHARE_STORES } from "./planShare";
import promotionsFile from "@/data/promotions.json";
import menuData from "@/data/menuData.json";

/**
 * Aussie 5단계(2026-10-30) — Woolworths 특가는 **추적 SKU**에서만 읽는다(수요일, `scripts/update_specials.mjs`).
 * Coles는 사용자가 붙여 넣은 주에만 있다.
 */

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf-8");
const PIN = { sku: "144821", name: "John West Tuna Olive Oil Blend", size: "95g" };
const prod = (o: Record<string, unknown> = {}) => ({
  Stockcode: 144821, Name: "John West Tuna Olive Oil Blend", PackageSize: "95g",
  Price: 2.3, WasPrice: 2.95, IsOnSpecial: true, IsEdrSpecial: false, CupString: "$24.21 / 1KG", ...o,
});

describe("🔴 특가로 인정하는 것 — 누구나 내는 할인가만", () => {
  it("추적 SKU 특가 → 항목. 이름 끝에 팩 크기, 가격 반영 키는 그 SKU의 재료 키 전부", () => {
    const r = specialFrom(prod(), PIN, ["Tuna", "Canned Tuna"]);
    expect(r.kind).toBe("special");
    if (r.kind !== "special") return;
    expect(r.item).toMatchObject({
      name: "John West Tuna Olive Oil Blend 95g", matchKey: "tuna", alsoMatches: ["Canned Tuna"],
      regularPrice: 2.95, salePrice: 2.3, savings: 0.65, savingsPercent: 22, promoType: "sale",
      pricesIngredients: ["Tuna", "Canned Tuna"], sku: "144821",
    });
  });

  it("회원가·정가 없는 특가·특가 아님·0원은 넣지 않는다", () => {
    expect(specialFrom(prod({ IsEdrSpecial: true }), PIN, ["Tuna"]).kind).toBe("member");
    expect(specialFrom(prod({ WasPrice: null }), PIN, ["Tuna"]).kind).toBe("none");
    expect(specialFrom(prod({ WasPrice: 2.3 }), PIN, ["Tuna"]).kind).toBe("none");
    expect(specialFrom(prod({ IsOnSpecial: false }), PIN, ["Tuna"]).kind).toBe("none");
    expect(specialFrom(prod({ Price: 0 }), PIN, ["Tuna"]).kind).toBe("fail");
    expect(specialFrom(undefined, PIN, ["Tuna"]).kind).toBe("fail");
  });

  it("고정 이름이 바뀐 상품은 넣지 않는다(DRIFT) — 표기만 다른 규격은 DRIFT가 아니다", () => {
    expect(specialFrom(prod({ Name: "John West Tuna in Springwater" }), PIN, ["Tuna"]).kind).toBe("drift");
    // 10-30 첫 실행: 고정 `4pack` vs API `4 pack`, `per kg` vs `1kg` 30건이 거짓 DRIFT였다
    const bagel = { sku: "270580", name: "Abe's Bagels The Natural Bagels", size: "4pack" };
    const r = specialFrom(prod({ Stockcode: 270580, Name: bagel.name, PackageSize: "4 pack" }), bagel, ["Bagel"]);
    expect(r.kind).toBe("special");
    if (r.kind === "special") expect(r.item.name).toBe("Abe's Bagels The Natural Bagels 4pack");
  });

  it("kg당 재료는 CupString의 kg당 값, 이름엔 1kg", () => {
    const pin = { sku: "1", name: "Carrots", size: "per kg" };
    const r = specialFrom(prod({ Stockcode: 1, Name: "Carrots", PackageSize: "per kg", Price: 1.5, WasPrice: 2, CupString: "$3.00 / 1KG" }), pin, ["Carrot"]);
    expect(r.kind).toBe("special");
    if (r.kind === "special") expect([r.item.name, r.item.salePrice, r.item.regularPrice]).toEqual(["Carrots 1kg", 3, 4]);
  });
});

describe("기간 — 시드니 날짜의 수요일 ~ 화요일", () => {
  const at = (iso: string) => specialsWeek(new Date(iso));
  it("수요일 아침이면 그날부터, 화요일 밤이면 지난 수요일부터", () => {
    expect(at("2026-11-04T07:00:00+11:00")).toEqual({ validFrom: "2026-11-04", validUntil: "2026-11-10" });
    expect(at("2026-11-03T23:30:00+11:00")).toEqual({ validFrom: "2026-10-28", validUntil: "2026-11-03" });
    expect(at("2026-10-30T12:00:00+11:00")).toEqual({ validFrom: "2026-10-28", validUntil: "2026-11-03" });
    expect(at("2026-11-01T19:00:00+11:00")).toEqual({ validFrom: "2026-10-28", validUntil: "2026-11-03" });
  });
  it("🔴 UTC로는 아직 화요일이어도 시드니가 수요일이면 새 주다", () => {
    const d = new Date("2026-11-04T00:30:00+11:00");
    expect(d.toISOString().slice(0, 10)).toBe("2026-11-03");
    expect(auToday(d)).toBe("2026-11-04");
    expect(specialsWeek(d).validFrom).toBe("2026-11-04");
  });
  it("수요일 launchd가 그 주를 읽는다 — plist는 수요일(3)이고, FAQ가 Wednesday라고 말한다", () => {
    const plist = read("ops/aussie-specials.plist");
    expect(plist).toMatch(/<key>Weekday<\/key><integer>3<\/integer>/);
    expect(plist).toMatch(/collect_prices_local\.sh" specials/);
    expect(JSON.parse(read("messages/en.json")).faq_a21).toMatch(/every Wednesday/);
    expect(read("scripts/collect_prices_local.sh")).toMatch(/node scripts\/update_specials\.mjs --write/);
  });
});

describe("파일 병합 — 같은 주에 붙여 넣은 Coles는 그대로 둔다", () => {
  const week = { validFrom: "2026-10-28", validUntil: "2026-11-03" };
  it("Coles 보존 · Woolworths 교체 · 지난 주 누적 · currentWeek 이동", () => {
    const coles = { storeName: "Coles", items: [{ name: "x" }] };
    const file = {
      currentWeek: "2026-10-21",
      weeks: {
        "2026-10-21": { validFrom: "2026-10-21", validUntil: "2026-10-27", stores: {} },
        "2026-10-28": { validFrom: "2026-10-28", validUntil: "2026-11-03", stores: { coles, woolworths: { storeName: "Woolworths", items: [{ name: "old" }] } } },
      },
    };
    const out = mergeWeek(file, week, [{ name: "new" }], "t");
    expect(out.currentWeek).toBe("2026-10-28");
    expect(out.weeks["2026-10-28"].stores.coles).toEqual(coles);
    expect(out.weeks["2026-10-28"].stores.woolworths.items).toEqual([{ name: "new" }]);
    expect(Object.keys(out.weeks)).toEqual(["2026-10-21", "2026-10-28"]);
  });
});

describe("고정 SKU 묶음 — 같은 SKU를 쓰는 재료 키가 함께 간다", () => {
  it("Egg·Egg (glaze)처럼 여럿인 SKU가 있고, 키는 하나도 빠지지 않는다", () => {
    const g = groupBySku();
    const keys = [...g.values()].flatMap((x) => x.keys);
    expect(keys.sort()).toEqual(Object.keys(PINNED_SKUS).sort());
    expect([...g.values()].some((x) => x.keys.length > 1), "양성 대조 — 여러 키 SKU가 없다").toBe(true);
  });
});

describe("🔴 기록된 Woolworths 특가는 전부 추적 SKU의 것이다", () => {
  type Item = { name: string; sku?: string; regularPrice: number; salePrice: number; pricesIngredients?: string[] };
  const file = promotionsFile as unknown as { weeks: Record<string, { validFrom: string; validUntil: string; stores: { woolworths?: { items: Item[] } } }> };
  const weeks = Object.entries(file.weeks ?? {});
  it.skipIf(weeks.length === 0)("SKU가 고정 표에 있고, 가격 반영 키가 그 SKU의 키와 같고, 특가 < 정가", () => {
    const g = groupBySku();
    for (const [key, w] of weeks) {
      expect(w.validFrom, key).toBe(key);
      expect(specialsWeek(new Date(`${key}T12:00:00+11:00`))).toEqual({ validFrom: w.validFrom, validUntil: w.validUntil });
      for (const it of w.stores.woolworths?.items ?? []) {
        const grp = g.get(it.sku ?? "");
        expect(grp, `${key}: ${it.name} — 추적 SKU가 아니다`).toBeTruthy();
        expect(it.pricesIngredients, it.name).toEqual(grp!.keys);
        expect(it.salePrice, it.name).toBeGreaterThan(0);
        expect(it.salePrice, it.name).toBeLessThan(it.regularPrice);
      }
    }
  });
});

describe("공유 링크 마트 인덱스 — 이미 나간 링크의 뜻이 그대로다", () => {
  it("1 = woolworths, 2 = coles, 0(Kiwi Pak'nSave 자리)은 거절", () => {
    expect([...SHARE_STORES]).toEqual([null, "woolworths", "coles"]);
    const names = (menuData as unknown as { MENU_DATA: { en: { name: string }[] } }).MENU_DATA.en.slice(0, 5).map((m) => m.name);
    const base = { days: names.map((menu) => ({ menu, snacks: [] })), allergies: [], excluded: [], prepStyles: [], thermosOnly: false, useSales: true };
    const enc = encodeSharedPlan({ ...base, saleStores: ["coles"] })!;
    expect(decodeSharedPlan(enc)?.saleStores).toEqual(["coles"]);
    const d = names.map((n) => [n]);
    const zero = Buffer.from(JSON.stringify({ v: 1, d, s: [0] })).toString("base64url");
    expect(decodeSharedPlan(zero)).toBeNull();
    const old = Buffer.from(JSON.stringify({ v: 1, d, s: [1, 2] })).toString("base64url");
    expect(decodeSharedPlan(old)?.saleStores).toEqual(["woolworths", "coles"]);
  });
});
