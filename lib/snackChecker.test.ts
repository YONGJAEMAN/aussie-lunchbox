import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import PRICES from "@/data/price_cache.json";
import { snackAllowed, dietTagsFor } from "./ingredientDiet";
import { declares, labelFor } from "./allergenLabels";
import {
  CHECKER_ALLERGIES, checkerRows, checkerSummary, passesAll, labelReadRange, checkerDescription,
  type CheckerAllergy,
} from "./snackChecker";
import type { SnackItem } from "./types";

/**
 * /snack-checker — 페이지가 플래너와 다른 말을 하지 않는지.
 *
 * 🔴 기대값은 `snackChecker.ts`를 거치지 않고 **원본에서 다시** 만든다 —
 *    간식 풀은 JSON 파일을 직접 읽고, 칸 목록은 `planGenerator.ts` 소스에서 뽑는다.
 *    같은 원본(`PLANNER_CATEGORIES`)에서 뽑으면 둘이 같이 틀려도 초록이다.
 */

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf-8");
const RAW = JSON.parse(read("data/menuData.json")) as { SNACK_DATA: Record<string, SnackItem[]> };

/** 플래너가 실제로 뽑는 칸 — 생성기 소스의 `snackData["…"]`에서 읽는다. */
const plannerCats = () => [...new Set([...read("lib/planGenerator.ts").matchAll(/snackData\["([^"]+)"\]/g)].map((m) => m[1]))];
const pool = () => plannerCats().flatMap((c) => RAW.SNACK_DATA[c] ?? []);

const subsets = <T,>(xs: readonly T[]): T[][] =>
  xs.reduce<T[][]>((acc, x) => acc.concat(acc.map((s) => [...s, x])), [[]]);

describe("🔴 간식 알레르겐 확인 페이지 = 플래너", () => {
  it("플래너가 뽑는 간식 전부, 그리고 그것만 싣는다", () => {
    expect(plannerCats().length, "planGenerator에서 칸을 못 읽었다 — 가드가 빈 집합이다").toBeGreaterThan(0);
    const names = checkerRows().map((r) => r.name).sort();
    expect(names).toEqual(pool().map((s) => s.name).sort());
  });

  it.each([...CHECKER_ALLERGIES])("%s — 통과 집합이 snackAllowed와 같다", (a) => {
    const expected = pool().filter((s) => snackAllowed(s, [a])).map((s) => s.name).sort();
    const actual = checkerRows().filter((r) => r.passes[a]).map((r) => r.name).sort();
    expect(actual).toEqual(expected);
  });

  it("필터를 여러 개 켜도 플래너와 같다 — 페이지는 교집합을 쓴다", () => {
    const rows = new Map(checkerRows().map((r) => [r.name, r]));
    const bad: string[] = [];
    for (const sel of subsets<CheckerAllergy>(CHECKER_ALLERGIES)) {
      for (const s of pool()) {
        if (passesAll(rows.get(s.name)!, sel) !== snackAllowed(s, sel)) bad.push(`${s.name} × [${sel.join(", ")}]`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("🧊 표시가 데이터의 keepCold와 같다", () => {
    const cold = new Set(pool().filter((s) => s.keepCold).map((s) => s.name));
    expect(checkerRows().filter((r) => r.keepCold).map((r) => r.name).sort()).toEqual([...cold].sort());
  });

  it("개수 요약이 행과 맞는다", () => {
    const s = checkerSummary();
    expect(s.total).toBe(pool().length);
    expect(s.unknown, "모르는 재료가 생겼다 — 필터를 켜면 그 간식은 빠진다").toBe(0);
    expect(s.labelBacked + s.handOnly + s.unknown).toBe(s.total);
  });
});

describe("🔴 양성 대조 — 가드가 실제로 뭔가를 보고 있다", () => {
  it("라벨 근거 간식과 손 플래그 간식이 둘 다 있다", () => {
    const s = checkerSummary();
    expect(s.labelBacked).toBeGreaterThan(0);
    expect(s.handOnly).toBeGreaterThan(0);
  });

  it("Rice Wheels — 이름엔 유제품이 없는데 라벨이 우유를 선언하고, 페이지가 Dairy에서 뺀다", () => {
    expect(declares("Rice Wheels", "milk")).toBe(true);
    const r = checkerRows().find((x) => x.name === "Rice Wheels");
    expect(r?.passes["Dairy Allergy"]).toBe(false);
    expect(r?.evidence.some((e) => e.kind === "label" && /milk/i.test(e.declared))).toBe(true);
  });

  it("어느 필터든 최소 한 간식은 걸러진다", () => {
    const failing = checkerSummary().perAllergy.filter((p) => p.pass < checkerSummary().total);
    expect(failing.length).toBeGreaterThan(0);
  });

  it("⚠ 「may contain」 표시가 실제로 켜진다 — 견과 주의가 붙은 간식이 있다", () => {
    const nut = checkerSummary().perAllergy.find((p) => p.allergy === "Nut Allergy")!;
    expect(nut.passButWarned).toBeGreaterThan(0);
  });

  /**
   * 🔴 지금 플래너 간식 풀에는 견과를 **선언한** 간식이 하나도 없다(33/33 통과).
   *    「견과 필터에서 빠지는 간식」을 양성 대조로 걸 수 없어서, 견과를 선언한
   *    추적 상품을 캐시에서 골라 가짜 간식으로 넣어 본다 — 필터가 살아 있는지만 본다.
   */
  it("견과 필터가 살아 있다 — 견과를 선언한 재료가 든 간식은 빠진다", () => {
    const nutKey = Object.keys(PRICES).find((k) => labelFor(k) && declares(k, "nuts"));
    expect(nutKey, "견과를 선언한 추적 상품이 하나도 없다").toBeTruthy();
    expect(snackAllowed({ name: "probe", ingredients: [nutKey!] }, ["Nut Allergy"])).toBe(false);
  });
});

describe("🔴 가격 — 페이지 값이 가격 캐시와 같다", () => {
  /** 원본을 직접 읽는다 — `snackChecker.ts`가 import한 캐시 객체를 거치지 않는다. */
  const RAW_PRICE = JSON.parse(read("data/price_cache.json")) as Record<string, { data?: { price?: number } }>;

  it("모든 간식의 모든 재료: 페이지 가격 = price_cache의 data.price", () => {
    const rows = checkerRows();
    const bad: string[] = [];
    let priced = 0;
    for (const r of rows) {
      expect(r.packs.map((p) => p.ingredient), r.name).toEqual(pool().find((s) => s.name === r.name)!.ingredients);
      for (const p of r.packs) {
        const raw = RAW_PRICE[p.ingredient]?.data?.price;
        const want = typeof raw === "number" && raw > 0 ? raw : null;
        if (p.price !== want) bad.push(`${r.name}/${p.ingredient}: ${p.price} ≠ ${want}`);
        if (p.price !== null) priced++;
      }
    }
    expect(bad).toEqual([]);
    expect(priced, "가격이 붙은 재료가 0개 — 가드가 빈 집합이다").toBeGreaterThan(0);
  });

  it("손 플래그 간식도 추적 상품이 있으면 가격이 있다", () => {
    const hand = checkerRows().filter((r) => r.evidence.every((e) => e.kind === "hand"));
    expect(hand.length).toBeGreaterThan(0);
    expect(hand.filter((r) => r.packs.some((p) => p.price !== null)).length).toBeGreaterThan(0);
  });

  it("1회분 값은 가격이 다 있을 때만 — 없으면 null(0으로 싸 보이게 하지 않는다)", () => {
    for (const r of checkerRows()) {
      const all = r.packs.every((p) => p.price !== null);
      expect(r.serve === null, r.name).toBe(!all);
      if (r.serve !== null) expect(r.serve).toBeGreaterThan(0);
    }
  });
});

describe("🔴 페이지가 수치·날짜·간식 이름을 손으로 적지 않는다", () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const PAGE = strip(read("app/[locale]/snack-checker/page.tsx"));
  const CLIENT = strip(read("components/SnackCheckerClient.tsx"));
  /**
   * JSX 텍스트 노드 — 태그 사이, 중괄호 밖. className의 숫자(px-4)는 여기 안 들어온다.
   * ⚠️ `length > 0 && (`의 `>`를 태그 끝으로 읽었다 — 앞이 공백·`=`인 `>`는 비교·화살표라 뺀다.
   */
  const jsxText = (src: string) =>
    [...src.matchAll(/(?<![\s=])>([^<>{}]+)</g)].map((m) => m[1].trim()).filter(Boolean);

  it("금액·ISO 날짜·「27 September」식 날짜가 없다", () => {
    for (const src of [PAGE, CLIENT]) {
      expect(src.match(/\$\d/g) ?? []).toEqual([]);
      expect(src.match(/20\d\d-\d\d-\d\d/g) ?? []).toEqual([]);
      expect(src.match(/\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/g) ?? []).toEqual([]);
    }
  });

  it("화면 문장에 숫자·수 단어가 없다 — 개수는 전부 계산에서 온다", () => {
    expect(jsxText(PAGE).length, "텍스트 노드를 못 읽었다 — 빈 집합은 알리바이다").toBeGreaterThan(10);
    expect(jsxText(PAGE).some((t) => /Read the packet anyway/.test(t))).toBe(true);
    const bad = [...jsxText(PAGE), ...jsxText(CLIENT)].filter(
      (t) => /\d/.test(t.replace(/CC BY 4\.0/, "")) ||
        /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen)\b/i.test(t),
    );
    expect(bad).toEqual([]);
  });

  it("간식 이름을 적지 않는다", () => {
    const named = pool().map((s) => s.name).filter((n) => PAGE.includes(n) || CLIENT.includes(n));
    expect(named).toEqual([]);
  });

  it("제목이 넛프리 CTR 실험의 검색어를 쓰지 않는다(10-22까지) · 설명은 155자 이하", () => {
    expect(PAGE).not.toMatch(/nut[- ]free snacks/i);
    expect(checkerDescription().length).toBeLessThanOrEqual(155);
  });

  it("클라이언트 컴포넌트는 lib를 값으로 import하지 않는다 — 가격 캐시가 번들에 딸려 온다", () => {
    expect(CLIENT).not.toMatch(/^import\s+(?!type\b)[^;]*from\s+"@\/lib\//m);
  });
});

describe("🔴 사이트 안에서 이 페이지로 오는 길", () => {
  it("sitemap에 있고 lastmod가 간식 라벨의 최신 관측일이다", async () => {
    // Aussie: noindex 동안 sitemap()은 빈 목록이다 — 재런칭 때 열릴 목록을 본다.
    const { sitemapEntries } = await import("../app/sitemap");
    const e = sitemapEntries().find((x) => x.url.endsWith("/en/snack-checker"));
    expect(e, "sitemap에 /en/snack-checker가 없다").toBeTruthy();
    expect(new Date(e!.lastModified as Date).getTime()).toBe(labelReadRange().newest);
  });

  it("푸터가 링크하고 세 언어에 키가 있다", () => {
    expect(read("components/Footer.tsx")).toContain("/snack-checker`}");
    for (const l of ["en", "ko", "zh"]) {
      expect(JSON.parse(read(`messages/${l}.json`)).nav_snack_checker, l).toBeTruthy();
    }
  });

  it("CSV·플래너로 가는 링크가 있다 — 글을 링크하면 그 글이 실제로 있다", async () => {
    const page = read("app/[locale]/snack-checker/page.tsx");
    const { POSTS } = await import("../content/posts");
    // Aussie(10-30): 라벨 글은 아직 없다(Kiwi 글은 NZ 상품 이야기라 안 옮겼다). 링크를 걸면 그 글이 있어야 한다.
    const missing = [...page.matchAll(/\/blog\/([a-z0-9-]+)/g)].map((m) => m[1]).filter((s) => !(s in POSTS));
    expect(missing).toEqual([]);
    expect(page).toContain('href="/allergen-labels.csv"');
    expect(page).toContain("/planner`}");
  });
});

describe("🔴 참깨 — 라벨 없어 확인 못 한 재료를 「들어 있다」로 쓰지 않는다 (2026-10-23)", () => {
  // Aussie(10-30): Kiwi에선 Spices가 라벨 없는 「확인 못 함」이었다. AU 판정표는 원재료로 읽어 참깨 없음 —
  //   그래서 Roasted Chickpeas가 참깨 필터를 통과하고, unverified 증거는 하나도 없어야 한다.
  it("Roasted Chickpeas의 Spices: AU 판정표가 원재료로 읽었다 — 참깨 필터를 통과하고 unverified가 없다", () => {
    const row = checkerRows().find((r) => r.name === "Roasted Chickpeas")!;
    expect(row, "Roasted Chickpeas가 체커에서 사라졌다 — 대조 대상을 바꿀 것").toBeTruthy();
    expect(row.passes["Sesame Allergy"]).toBe(true);
    const spices = row.evidence.find((e) => e.ingredient === "Spices")!;
    // 상품 목록에 Contains 줄이 비어 있어 원문 라벨은 없다(hand) — 그래도 근거는 원재료 판독이다.
    expect(spices.kind).toBe("hand");
    if (spices.kind === "hand") {
      expect(spices.flagged).not.toContain("sesame");
      expect(spices.basis).toBe("read from the Contains line and the ingredient list");
    }
    const unverified = checkerRows().flatMap((r) => r.evidence).filter((e) => e.kind === "hand" && e.unverified.length);
    expect(unverified).toEqual([]);
  });

  it("라벨이 참깨를 선언한 간식은 참깨 필터에서 빠진다(양성 대조)", () => {
    const row = checkerRows().find((r) => r.name === "Hummus & Veg")!;
    expect(row.passes["Sesame Allergy"]).toBe(false);
    expect(row.passes["Nut Allergy"]).toBe(true);
  });
});

describe("🔴 Aussie — 근거는 승인 판정표가 먼저다 (2026-10-30)", () => {
  it("화면의 「My reading」이 플래너가 거르는 판정(`dietTagsFor`)과 같다 — 원문 선언이 아니라", () => {
    const off = checkerRows().flatMap((r) => r.evidence).filter((e) => {
      if (e.kind !== "label") return false;
      const t = dietTagsFor(e.ingredient)!;
      return e.reading.join() !== (["nuts", "milk", "egg", "gluten", "sesame"] as const).filter((x) => t.has(x)).join();
    });
    expect(off).toEqual([]);
    expect(checkerRows().flatMap((r) => r.evidence).filter((e) => e.kind === "label").length, "양성 대조").toBeGreaterThan(10);
  });

  it("본문의 Teriyaki 문장이 아직 참이다 — 원문 선언엔 참깨가 없고 판정은 참깨", () => {
    expect(read("app/[locale]/snack-checker/page.tsx")).toMatch(/teriyaki sauce lists\s+sesame seeds in its ingredients but not on its Contains line/);
    expect(labelFor("Teriyaki Sauce")?.declared ?? "").not.toMatch(/sesame/i);
    expect(dietTagsFor("Teriyaki Sauce")?.has("sesame")).toBe(true);
  });

  it("CSV의 reading_contains가 판정표와 같고, 원문 없는 원물도 줄이 있다", async () => {
    const { GET } = await import("../app/allergen-labels.csv/route");
    const [head, ...rows] = (await GET().text()).trim().split("\n");
    const cols = head.split(",");
    const ri = cols.indexOf("reading_contains");
    expect(ri).toBeGreaterThan(0);
    const byIng = new Map(rows.map((l) => [l.split(",")[0], l.split(",")]));
    expect(byIng.get("Teriyaki Sauce")?.[ri]).toBe("sesame");
    // Apple은 라벨 원문이 없다 — 예전 규칙이면 줄이 없었다
    expect(byIng.get("Apple")?.[ri]).toBe("none");
    expect(head).not.toMatch(/nzd|NZ/);
  });
});
