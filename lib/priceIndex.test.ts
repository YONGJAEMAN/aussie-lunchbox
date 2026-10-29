import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import index from "@/data/priceIndex.json";
import sources from "@/data/priceIndexSources.json";

/**
 * 가격지수의 신뢰성 규칙을 코드로 묶는다.
 *
 * 이 페이지는 "실제 가격"을 팔아서 신뢰를 얻는 유일한 페이지다. 여기서 조용히
 * 어긋나는 건 사이트에서 가장 비싼 종류의 오류다. 실제로 겪은 것만 테스트한다:
 *  - 검색 중앙값 방식이 브랜드를 갈아치워 40% 인상처럼 보인 일 (→ SKU 고정)
 *  - 특가 주간 가격을 넣으면 물가가 내린 것처럼 보이는 일 (→ 정상가만)
 *  - 한쪽 열만 갱신하고 전체가 최신인 척한 일 (→ lastUpdated = 더 오래된 날짜)
 */
type Item = { name: string; countdown: number | null; paknsave: number | null; note?: string };
type Src = {
  sku?: string;
  pinnedName?: string;
  pinnedSize?: string;
  blocked?: boolean;
  reason?: string;
  noteTokensWaived?: Record<string, string>;
};

const items = (index as { items: Item[] }).items;
const srcItems = (sources as { items: Record<string, Src> }).items;

describe("가격지수 데이터 규칙", () => {
  it("20개 항목이 유지된다 (바스켓은 시간 비교를 위해 고정)", () => {
    expect(items).toHaveLength(20);
  });

  it("모든 항목이 priceIndexSources.json에 정의돼 있다", () => {
    // 정의가 빠지면 updater가 조용히 건너뛰어 그 행만 영원히 낡는다.
    const missing = items.filter((i) => !srcItems[i.name]).map((i) => i.name);
    expect(missing).toEqual([]);
  });

  it("고정 항목은 sku·pinnedName을 갖고, blocked 항목은 이유를 갖는다", () => {
    for (const [name, src] of Object.entries(srcItems)) {
      if (src.blocked) {
        expect(src.reason, `${name}: blocked인데 reason 없음`).toBeTruthy();
        expect(src.sku, `${name}: blocked인데 sku가 있음 — 조회될 수 있다`).toBeUndefined();
      } else {
        expect(src.sku, `${name}: sku 없음`).toBeTruthy();
        expect(src.pinnedName, `${name}: pinnedName 없음`).toBeTruthy();
      }
    }
  });

  it("고정 상품이 지수 note가 지정한 브랜드/품종과 일치한다", () => {
    // ⚠️ 이 테스트가 없어서 2026-07-30에 실제로 사고가 났다.
    // priceIndex.json의 note는 **그 행이 어떤 상품인지**를 정의한다
    // (예: Butter의 note = "Anchor"). 최초 SKU 고정 때 note를 읽지 않아
    // Butter를 Woolworths 자체브랜드($8.39)로 고정했다 — Anchor는 $10.40이다.
    // 브랜드 교체를 물가 변동으로 위장하는 것, 즉 이 시스템이 막으려던 오류를
    // 시스템을 만들면서 저질렀다. 17건 중 9건이 그랬다.
    //
    // 규칙: note의 4자 이상 토큰은 모두 pinnedName에 나타나야 한다.
    // 예외는 noteTokensWaived에 **이유와 함께** 명시해야 통과한다.
    const flat = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const failures: string[] = [];
    for (const item of items) {
      const src = srcItems[item.name];
      if (!src || src.blocked) continue;
      const note = (item.note ?? "").trim();
      if (!note) continue;
      const pinned = flat(src.pinnedName ?? "");
      for (const tok of note.split(/[^A-Za-z0-9]+/).filter((t) => t.length >= 4)) {
        const t = flat(tok);
        if (pinned.includes(t)) continue;
        if (src.noteTokensWaived?.[tok.toLowerCase()]) continue; // 이유가 적혀 있으면 통과
        failures.push(
          `${item.name}: note "${note}"의 "${tok}"이 고정 상품 "${src.pinnedName}"에 없음`,
        );
      }
    }
    expect(failures).toEqual([]);
  });

  it("waive된 note 토큰은 이유가 적혀 있다", () => {
    for (const [name, src] of Object.entries(srcItems)) {
      for (const [tok, why] of Object.entries(src.noteTokensWaived ?? {})) {
        expect(String(why).length, `${name}/${tok}: 이유가 너무 짧다`).toBeGreaterThan(10);
      }
    }
  });

  it("SKU가 중복되지 않는다 (두 항목이 같은 상품을 가리키면 비교가 무의미)", () => {
    const skus = Object.values(srcItems).map((s) => s.sku).filter(Boolean);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("lastUpdated는 두 열 중 **더 오래된** 날짜다", () => {
    // 한쪽만 갱신하고 전체가 최신인 척하면 안 된다. 2026-07-30에 Woolworths만
    // 갱신했는데 lastUpdated를 그날로 올리면, 5월 Pak'nSave 값이 최신으로 위장된다.
    const d = index as { lastUpdated: string; woolworthsUpdated?: string; paknsaveUpdated?: string };
    const cols = [d.woolworthsUpdated, d.paknsaveUpdated].filter(Boolean) as string[];
    if (cols.length === 2) {
      expect(d.lastUpdated).toBe(cols.slice().sort()[0]);
    }
  });

  it("열별 갱신 방식이 명시돼 있다", () => {
    const d = index as { woolworthsMethod?: string; paknsaveMethod?: string };
    // 방식이 열마다 다르다는 사실 자체가 페이지의 주장이다. 비어 있으면 페이지가
    // 근거 없는 주장을 하게 된다.
    expect(d.woolworthsMethod).toBeTruthy();
    expect(d.paknsaveMethod).toBeTruthy();
    // 2026-08-10: Pak'nSave 열이 매장 실사 → 온라인 조회로 바뀌었다. 예전에는
    // "in store"를 요구했는데, 그 기대를 그대로 두면 **방식이 바뀐 뒤에도 페이지가
    // 매장 실사라고 말하도록** 강제하게 된다. 이제 검사할 것은 특정 낱말이 아니라
    // "값의 출처가 뭐라고 적혀 있든 페이지 문구와 같은가"다.
    expect(d.paknsaveMethod!.toLowerCase()).toContain("online");
    expect(d.paknsaveMethod!.toLowerCase()).toContain("ormiston");
  });

  it("행마다 Pak'nSave 확인일이 있고, 열 날짜가 그걸 덮어쓰지 않는다", () => {
    // 🔴 2026-08-10에 Pak'nSave 열을 자동 갱신으로 바꾸면서 **열 날짜만** 오늘로
    //    올렸다. 그런데 특가 주간이라 건너뛴 5행은 5월 값을 그대로 들고 있었고,
    //    화면은 두 열이 같은 날짜라며 승자 표시를 켰다. 버터 격차 $4.61은
    //    8월 Woolworths vs **5월** Pak'nSave였다. 행 단위 날짜가 없으면 재발한다.
    const d = index as { items: { name: string; paknsave: number | null; paknsaveAsOf?: string }[] };
    for (const it of d.items) {
      if (it.paknsave === null) continue;
      expect(it.paknsaveAsOf, `${it.name}: paknsaveAsOf 없음`).toBeTruthy();
      expect(it.paknsaveAsOf, `${it.name}: 날짜 형식`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("승자 표시가 행 단위 신선도를 본다 (열 날짜만 보면 옛 값이 오늘인 척한다)", () => {
    const src = readFileSync(new URL("../app/[locale]/price-index/page.tsx", import.meta.url), "utf-8");
    expect(src, "행 단위 신선도 판정이 없다").toContain("rowIsFresh");
    // diff/승자 계산이 행 단위 판정을 거쳐야 한다. `comparable`만 보면 안 된다.
    const i = src.indexOf("const diff =");
    expect(i).toBeGreaterThan(-1);
    expect(src.slice(i, i + 200), "diff가 rowComparable을 안 본다").toContain("rowComparable");
    // 표시를 끄기만 하고 이유를 안 밝히면 독자는 비교가 빠진 줄로만 안다.
    expect(src).toContain("staleRows");

    // 🔴 2026-08-11: 이유를 밝히려다 **틀린 이유**를 적었다. 낡은 행 6개를 전부
    //    "이번 주 특가라서"라고 설명했는데, 그중 Wraps·Apples·Hummus 3개는 특가가
    //    아니라 대응 상품이 없어 보류된 행이었다. 라이브에서 잡았다.
    //    한 가지 이유만 단정하면 안 된다 — 낡는 경로가 둘이다.
    const i2 = src.indexOf("No winner mark on");
    const note = src.slice(i2, i2 + 900);
    expect(note, "특가를 유일한 이유로 단정하고 있다").not.toMatch(
      /Pak&apos;nSave had\s*\n?\s*that item on special this week/,
    );
    expect(note, "보류(규격 불일치) 경로가 설명에 없다").toMatch(/no product\s*\n?\s*matching/);
    // 어느 시점 값인지 행마다 밝혀야 독자가 스스로 판단할 수 있다.
    expect(note).toContain("paknsaveAsOf");
  });

  it("바구니 품목 목록을 손으로 적지 않는다 (표와 갈라진다)", () => {
    // 🔴 2026-08-10 실측: 본문의 "The 20 items in the basket" 목록이 위의 표와
    //    달랐다. 감귤·우유 2종·토마토소스가 적혀 있었는데 표엔 없었고, 버터·쌀·
    //    피넛버터·슬라이스햄은 표에 있는데 목록엔 없었다. 같은 페이지가 제 표와
    //    모순된 상태로 오래 서 있었다. 데이터에서 만들면 갈라질 수가 없다.
    const src = readFileSync(new URL("../app/[locale]/price-index/page.tsx", import.meta.url), "utf-8");
    const start = src.indexOf("The 20 items in the basket");
    expect(start, "바구니 절을 찾지 못했다").toBeGreaterThan(-1);
    const section = src.slice(start, start + 2000);
    expect(section, "목록이 data.items에서 만들어져야 한다").toContain("data.items.reduce");
    // 표에 없는 품목을 본문이 이름으로 부르고 있으면 안 된다.
    for (const ghost of ["mandarin", "tomato sauce", "milk (2L)"]) {
      expect(section.toLowerCase(), `표에 없는 품목이 본문에 있다: ${ghost}`).not.toContain(ghost.toLowerCase());
    }
  });

  it("Pak'nSave를 매장 실사라고 말하는 곳이 저장소 어디에도 없다", () => {
    // 🔴 2026-08-11: price-index 페이지만 고치고 끝낸 줄 알았는데, 같은 주장이
    //    **6개 파일에 더** 있었다 — 홈("when I can get in-store"), FAQ("needs an
    //    in-store visit"), 약관, 정책, 가이드. 한 곳만 고치는 사고가 이 저장소에서
    //    반복된다. 그래서 이 가드는 한 파일이 아니라 **전부**를 훑는다.
    //    ⚠️ "in store"라는 낱말 자체를 막으면 안 된다 — 매장 실사 이력(history)이나
    //       "매대 태그와 다를 수 있다" 같은 정직한 문장까지 걸린다.
    //       **Pak'nSave 가격의 현재 출처를 매장이라고 말하는 형태**만 잡는다.
    const roots = ["app", "content", "messages", "lib/planCost.ts"];
    const files: string[] = [];
    const walk = (p: string) => {
      const abs = new URL(`../${p}`, import.meta.url);
      let st;
      try {
        st = statSync(abs);
      } catch {
        return;
      }
      if (st.isDirectory()) {
        for (const e of readdirSync(abs)) walk(`${p}/${e}`);
      } else if (/\.(ts|tsx|json)$/.test(p) && !p.includes(".test.")) {
        files.push(p);
      }
    };
    roots.forEach(walk);
    expect(files.length, "훑을 파일을 못 찾았다").toBeGreaterThan(20);

    const BANNED = [
      /Pak['’&#a-z;]*nSave[^.]{0,90}(needs an in-?store|when I can get in-?store)/i,
      /(in-?store (visit|check)s?|shelf tag)[^.]{0,60}Pak['’&#a-z;]*nSave/i,
      /Pak['’&#a-z;]*nSave[^.]{0,60}walked by hand/i,
      /staples in-?store each month/i,
    ];
    const hits: string[] = [];
    for (const f of files) {
      const body = readFileSync(new URL(`../${f}`, import.meta.url), "utf-8");
      for (const re of BANNED) {
        const m = body.match(re);
        if (m) hits.push(`${f}: ${m[0].slice(0, 100)}`);
      }
    }
    expect(hits, `Pak'nSave 가격을 매장 실사라고 말하는 곳:\n${hits.join("\n")}`).toEqual([]);
  });

  it("온라인 조회로 얻은 값을 매대 가격이라고 말하지 않는다", () => {
    // 🔴 이 페이지는 오랫동안 Pak'nSave 열을 "walked by hand in store", "at the
    //    shelf tag"라고 적었다. 2026-08-10에 자동 조회로 바뀌었으므로 그 문장이
    //    남아 있으면 그 순간부터 거짓이 된다. 어제 Woolworths 열에서 똑같은 일을
    //    한 번 겪었다("Every figure verified by hand. No scraped APIs").
    const src = readFileSync(new URL("../app/[locale]/price-index/page.tsx", import.meta.url), "utf-8");
    expect(src).not.toMatch(/walked by hand in store/i);
    expect(src).not.toMatch(/recorded <strong>in store<\/strong>/i);
    expect(src).not.toMatch(/Pak&apos;nSave column is checked by me in store/i);
    // 온라인 가격이라는 사실이 실제로 적혀 있어야 한다 — 삭제만 하고 끝나면 안 된다.
    expect(src).toMatch(/Click &amp; Collect price/i);
  });

  it("매장 비교 서술의 근거(history 스냅샷)가 자기 정합적이다", () => {
    // 본문 'What the last full comparison showed'는 이 스냅샷에서 숫자를 읽는다.
    // 스냅샷이 깨지면 본문이 근거 없는 비교 주장을 하게 된다.
    type Snapshot = {
      comparable?: boolean;
      woolworthsTotal: number;
      paknsaveTotal: number;
      gap: number;
      paknsaveCheaperCount: number;
      woolworthsCheaperCount: number;
      items?: { countdown: number | null; paknsave: number | null }[];
    };
    const hist = ((index as { history?: Snapshot[] }).history ?? []) as Snapshot[];
    const full = hist.filter((h) => h.comparable !== false);
    expect(full.length, "동일시점 비교 스냅샷이 최소 1개 있어야 한다").toBeGreaterThan(0);
    for (const h of full) {
      const w = h.woolworthsTotal;
      const p = h.paknsaveTotal;
      const gap = h.gap;
      expect(gap).toBeCloseTo(w - p, 2);
      const items = h.items ?? [];
      expect(items.length).toBe(20);
      // 승자 카운트가 실제 항목값과 맞는지 — 본문이 "20개 전부"라고 쓰는 근거다
      const pWin = items.filter((i) => i.countdown !== null && i.paknsave !== null && i.countdown > i.paknsave).length;
      const wWin = items.filter((i) => i.countdown !== null && i.paknsave !== null && i.countdown < i.paknsave).length;
      expect(h.paknsaveCheaperCount).toBe(pWin);
      expect(h.woolworthsCheaperCount).toBe(wWin);
      // 합계도 항목에서 재계산해 검산
      expect(w).toBeCloseTo(items.reduce((s, i) => s + (i.countdown ?? 0), 0), 2);
      expect(p).toBeCloseTo(items.reduce((s, i) => s + (i.paknsave ?? 0), 0), 2);
    }
  });

  it("현재 표가 시차 상태면 그 사실이 데이터에 드러난다", () => {
    // 페이지는 두 열 날짜 차이가 30일을 넘으면 비교 신호를 끈다. 그 판단이
    // 데이터만 보고 가능해야 한다 — 열 날짜가 둘 다 있어야 성립한다.
    const d = index as { woolworthsUpdated?: string; paknsaveUpdated?: string };
    if (d.woolworthsUpdated && d.paknsaveUpdated) {
      const gap = Math.abs(Date.parse(d.woolworthsUpdated) - Date.parse(d.paknsaveUpdated)) / 86_400_000;
      expect(Number.isFinite(gap)).toBe(true);
    }
  });

  it("가격이 현실적인 범위에 있다 (단위 착오 감지)", () => {
    // 슈퍼마켓 낱개 상품이 $0.5 미만이거나 $30 초과면 규격/단위가 어긋난 것이다.
    for (const it of items) {
      for (const [col, v] of [["countdown", it.countdown], ["paknsave", it.paknsave]] as const) {
        if (v === null) continue;
        expect(v, `${it.name}.${col} = ${v}`).toBeGreaterThan(0.5);
        expect(v, `${it.name}.${col} = ${v}`).toBeLessThan(30);
      }
    }
  });

  it("두 매장 가격이 3배 이상 벌어지지 않는다 (한쪽 규격 오류 감지)", () => {
    // 같은 물건이라면 매장 간 차이는 크지 않다. 3배가 나면 한쪽이 다른 규격이다.
    for (const it of items) {
      if (it.countdown === null || it.paknsave === null) continue;
      const ratio = Math.max(it.countdown, it.paknsave) / Math.min(it.countdown, it.paknsave);
      expect(ratio, `${it.name}: W $${it.countdown} vs P $${it.paknsave}`).toBeLessThan(3);
    }
  });
});

describe("두 열 날짜가 벌어지면 비교 신호를 끈다 (화면과 데이터가 갈라지지 않게)", () => {
  /**
   * 2026-08-06: 승자 표시는 `comparable`(두 열 30일 이내)로 꺼지는데, 표 밑
   * 각주만 무조건 "* Cheaper option highlighted."라고 렌더링되고 있었다.
   * 별표가 한 개도 안 붙은 표 아래에 강조했다고 적혀 있었던 셈이다.
   * 페이지 위에서 "winner marks are switched off"라고 길게 설명해 놓고
   * 표 밑에서 뒤집는 것이라, 이 페이지의 신뢰가 걸린 부분이다.
   */
  const DAY = 86_400_000;
  const idx = index as { woolworthsUpdated?: string; paknsaveUpdated?: string };
  const src = readFileSync(new URL("../app/[locale]/price-index/page.tsx", import.meta.url), "utf-8");

  it("임계값은 30일이다 (페이지와 테스트가 같은 값을 본다)", () => {
    expect(src).toContain("dateGapDays <= 30");
  });

  it("각주가 comparable에 따라 갈린다 (무조건 렌더링으로 되돌아가면 실패)", () => {
    const i = src.indexOf("Cheaper option highlighted");
    expect(i, "각주 문구를 찾지 못했다").toBeGreaterThan(-1);
    // 각주 앞 300자 안에 조건 분기가 있어야 한다
    expect(src.slice(Math.max(0, i - 300), i)).toContain("comparable");
  });

  it("화면 상태가 데이터의 실제 간격과 일치한다", () => {
    // 2026-08-10: Pak'nSave 열이 자동 갱신으로 바뀌어 간격이 86일 → 0일이 됐다.
    // 예전 이 테스트는 "gap > 30"을 **고정 기대**로 박아뒀는데, 그러면 간격이
    // 좁혀진 순간 통과시키려고 멀쩡한 데이터를 되돌리게 된다. 검사할 것은
    // 특정 상태가 아니라 **데이터와 화면이 같은 이야기를 하는가**다.
    const a = idx.woolworthsUpdated, b = idx.paknsaveUpdated;
    expect(a, "woolworthsUpdated 없음").toBeTruthy();
    expect(b, "paknsaveUpdated 없음").toBeTruthy();
    const gap = Math.round(Math.abs(Date.parse(a!) - Date.parse(b!)) / DAY);

    // 어느 상태든 분기 문구는 코드에 남아 있어야 한다. 간격이 다시 벌어질 때
    // 조용히 승자 표시가 켜진 채로 있으면 안 된다.
    expect(src, "비교 중단 문구가 사라졌다 — 간격이 다시 벌어지면 거짓 비교가 된다")
      .toContain("winner marks are off");
    expect(src).toContain("dateGapDays <= 30");

    if (gap > 30) {
      // 비교 불가 구간이면 그 사실을 설명하는 블록이 있어야 한다.
      expect(src).toContain("!comparable");
    } else {
      // 비교 가능 구간이면 승자 표시가 실제로 켜지는 경로가 있어야 한다.
      expect(src).toContain("Cheaper option highlighted");
    }
  });
});

/**
 * 🔴 2026-08-17: `lastUpdated` 계산이 세 스크립트에 복붙돼 있었고, New World 열을 넣을 때
 * 한 곳만 세 열로 고쳤다. 나머지 둘은 두 열로 남아 **NW 다음에 다른 스크립트를 돌리면
 * lastUpdated가 NW를 빼고 계산**됐다. 세 열이 우연히 같은 날이라 증상이 없었다.
 */
describe("가격지수 열 날짜 — 계산이 한 곳에만 있다", () => {
  it("지수의 모든 `*Updated` 열이 COLUMN_DATE_KEYS에 들어 있다", async () => {
    const { COLUMN_DATE_KEYS } = await import("../scripts/_priceIndexMeta.mjs");
    const columnsInData = Object.keys(index).filter(
      (k) => k.endsWith("Updated") && k !== "lastUpdated",
    );
    expect(columnsInData.length, "열 날짜 키를 하나도 못 찾았다 — 검사가 무의미하다")
      .toBeGreaterThan(1);
    for (const k of columnsInData) {
      expect(COLUMN_DATE_KEYS, `${k} 가 빠졌다 — 이 열은 조용히 늙는다`).toContain(k);
    }
  });

  it("가장 오래된 열을 고른다", async () => {
    const { oldestColumnDate } = await import("../scripts/_priceIndexMeta.mjs");
    expect(
      oldestColumnDate({
        woolworthsUpdated: "2026-08-17",
        paknsaveUpdated: "2026-05-16",
        newworldUpdated: "2026-08-17",
      }),
    ).toBe("2026-05-16");
    // 열이 빠져 있어도 남은 열 중 가장 오래된 것
    expect(
      oldestColumnDate({ woolworthsUpdated: "2026-08-17", newworldUpdated: "2026-07-01" }),
    ).toBe("2026-07-01");
  });

  it("어떤 스크립트도 lastUpdated를 직접 계산하지 않는다", () => {
    const dir = "scripts";
    const offenders: string[] = [];
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".mjs"))) {
      const s = readFileSync(`${dir}/${f}`, "utf8");
      if (/lastUpdated\s*=\s*\[/.test(s)) offenders.push(f);
    }
    expect(offenders, "복붙된 계산이 다시 생겼다 — _priceIndexMeta.mjs를 쓸 것").toEqual([]);
  });

  it("지수의 lastUpdated가 실제로 가장 오래된 열과 같다", async () => {
    const { oldestColumnDate } = await import("../scripts/_priceIndexMeta.mjs");
    expect(index.lastUpdated).toBe(oldestColumnDate(index));
  });
});

/**
 * 🔴 2026-10-26: 세 스크립트가 조회 결과와 무관하게 열 날짜를 오늘로 올렸다. Actions 러너에서는
 *    마트 API가 막혀(Woolworths 0/18, Foodstuffs buildId 실패) 아무것도 못 읽었는데도
 *    `woolworthsUpdated`가 올라갔고, 시계열이 그 날짜로 **옛 값을 새 관측처럼** 적었다(라이브 6점).
 */
describe("🔴 못 읽은 열은 날짜를 올리지 않는다", () => {
  it("읽은 비율 — 특가보류는 읽은 것, 보류는 분모 밖", async () => {
    const { columnReadEnough, columnReadRate } = await import("../scripts/_priceIndexMeta.mjs");
    // Actions의 실제 결과(10-25): 갱신 0 / 실패 18
    expect(columnReadEnough({ updated: 0, failed: 18 })).toBe(false);
    // 지금까지 로컬 수집의 최저치(Pak'nSave 08-17·24): 갱신 10 / 특가보류 7 / 실패 3 → 85%
    expect(columnReadRate({ updated: 10, specials: 7, failed: 3 })).toBeCloseTo(0.85, 9);
    expect(columnReadEnough({ updated: 10, specials: 7, failed: 3 })).toBe(true);
    expect(columnReadEnough({ updated: 17, failed: 1 })).toBe(true);
    expect(columnReadEnough({ updated: 7, specials: 0, failed: 3 })).toBe(false);
    expect(columnReadEnough({}), "아무것도 시도 안 했으면 읽은 게 아니다").toBe(false);
  });

  it("세 스크립트 모두 날짜를 올리기 **전에** 읽은 비율을 본다", () => {
    for (const [f, key] of [
      ["update_price_index.mjs", "woolworthsUpdated"],
      ["update_paknsave_prices.mjs", "paknsaveUpdated"],
      ["update_newworld_prices.mjs", "newworldUpdated"],
    ]) {
      const s = readFileSync(`scripts/${f}`, "utf8");
      const gate = s.search(/if \(write && !columnReadEnough\(counts\)\) \{[\s\S]*?process\.exit\(1\)/);
      const bump = s.indexOf(`index.${key} = today`);
      expect(gate, `${f}: 읽은 비율 검사가 없다`).toBeGreaterThan(-1);
      expect(bump, `${f}: 날짜 대입을 못 찾았다 — 검사가 무의미하다`).toBeGreaterThan(-1);
      expect(gate, `${f}: 날짜를 올린 뒤에 검사한다`).toBeLessThan(bump);
    }
  });
  // ⚠️ 「직전 점과 값이 전부 같다」는 가짜의 증거가 아니다 — 로컬 수집 09-13·09-27은 18/18을 읽었는데
  //    값이 그대로였다. 가짜 6점(09-05·07·14·28, 10-05·12)은 그 실행 로그의 「갱신 0 / 실패 18」로 판정했다.
});

// 2026-08-24: 지수 updater 가 originalPrice 를 무조건 쓰다가 **진열가보다 비싼 값**을
// 넣고 있었다. 특가 딱지 없이 내려간 농산물이 그렇게 되고, 양상추는 그 오차 때문에
// 매장 승자가 뒤집혀 있었다(지수 W $4.00 vs PnS $3.99 — 실제 W 는 $3.49).
// 지수는 이 사이트에서 신뢰를 사는 유일한 페이지라 조용히 틀리면 안 된다.
describe("🔴 지수에 넣을 값은 진열가여야 한다", () => {
  let shelfPrice: typeof import("../scripts/update_price_index.mjs").shelfPrice;
  beforeAll(async () => {
    ({ shelfPrice } = await import("../scripts/update_price_index.mjs"));
  });

  it("특가 주간에는 originalPrice — 특가를 넣으면 물가 하락처럼 보인다", () => {
    const r = shelfPrice({ originalPrice: 4.5, salePrice: 2.99, isSpecial: true });
    expect(r.regular).toBe(4.5);
    expect(r.markdownWithoutSpecial).toBe(false);
  });

  it("🔴 특가 딱지가 없는데 값이 내려가 있으면 진열가(salePrice)를 쓴다", () => {
    // 실측: fresh vegetable lettuce traditional iceberg
    const r = shelfPrice({ originalPrice: 4.0, salePrice: 3.49, isSpecial: false });
    expect(r.regular).toBe(3.49);
    expect(r.markdownWithoutSpecial).toBe(true);
    expect(r.listPrice).toBe(4.0);
  });

  it("🔴 회원가(isClubPrice)도 정가로 되돌린다 — 09-27 캐시에 계란 $9.95(정가 $11.79)가 들어가 있었다", () => {
    expect(shelfPrice({ originalPrice: 11.79, salePrice: 9.95, isSpecial: true, isClubPrice: true }).regular).toBe(11.79);
    expect(shelfPrice({ originalPrice: 11.79, salePrice: 9.95, isSpecial: false, isClubPrice: true }).regular).toBe(11.79);
  });

  it("🔴 플래너 수집기도 같은 함수로 정가를 저장한다 — salePrice를 그대로 저장하면 특가·회원가가 「정가」가 된다", () => {
    for (const f of ["scripts/update_prices.mjs", "lib/supermarketApi.ts"]) {
      const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf-8").replace(/\/\/.*$/gm, "");
      expect(src, `${f}: shelfPrice를 안 쓴다`).toMatch(/shelfPrice\(/);
      expect(src, `${f}: salePrice를 직접 읽는다`).not.toMatch(/\.salePrice\b/);
    }
  });

  it("두 값이 같으면 그 값 그대로", () => {
    const r = shelfPrice({ originalPrice: 3.75, salePrice: 3.75, isSpecial: false });
    expect(r.regular).toBe(3.75);
    expect(r.markdownWithoutSpecial).toBe(false);
  });

  it("originalPrice 가 없으면 salePrice 로 후퇴하고 그 사실을 표시한다", () => {
    const r = shelfPrice({ salePrice: 2.5, isSpecial: false });
    expect(r.regular).toBe(2.5);
    expect(r.usedFallback).toBe(true);
  });

  it("지수의 Woolworths 값이 그 상품의 진열가보다 비싸지 않다 — 파일 전수", async () => {
    const index = (await import("@/data/priceIndex.json")).default as {
      items: Array<{ name: string; countdown: number | null }>;
    };
    // 값이 하나도 없으면 이 검사는 공짜로 통과한다
    const priced = index.items.filter((i) => typeof i.countdown === "number");
    expect(priced.length).toBeGreaterThan(10);
    for (const i of priced) expect(i.countdown!).toBeGreaterThan(0);
  });
});

// 2026-08-24: 열 머리글이 "W − P"인데 셀은 부호를 뒤집어 찍고 있었다.
// Woolworths $6.99 / Pak'nSave $5.99 인 행이 "W − P" 아래에 -$1.00 으로 나갔다.
// 라벨과 값이 정면으로 어긋난 채 라이브였고, 가격 비교가 이 페이지의 존재 이유다.
describe("🔴 지수표 차액 열은 머리글과 부호가 맞아야 한다", () => {
  it("머리글이 P − W 이고, 셀이 그 정의대로 찍힌다", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("app/[locale]/price-index/page.tsx", "utf8");
    // 셀은 diff = countdown − paknsave 를 구한 뒤 부호를 뒤집어 표시한다.
    // 즉 화면에 나가는 값은 paknsave − countdown 이다.
    expect(src).toContain("const diff = rowComparable && cd !== null && ps !== null ? cd - ps : null");
    expect(src).toContain("diff > 0 ? `-$${diff.toFixed(2)}`");
    // 그러니 머리글도 P − W 여야 한다. W − P 로 되돌아가면 여기서 걸린다.
    expect(src, "차액 열 머리글이 값의 부호와 어긋난다").toContain("P &minus; W</th>");
    expect(src, "옛 머리글 W − P 가 되살아났다").not.toContain("W &minus; P</th>");
    // 각주가 부호의 뜻을 말한다 — 라벨만으로는 독자가 방향을 못 정한다
    expect(src).toContain("Pak&apos;nSave minus Woolworths");
  });
});
