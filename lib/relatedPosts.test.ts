import { describe, it, expect } from "vitest";
import { relatedPosts, matchedFilters, articleHref, FILTER_ARTICLES, FALLBACK } from "./relatedPosts";
import type { FilterState, RelatedLink } from "./relatedPosts";
import { BLOG_SLUGS } from "@/content/posts";
import { GUIDE_SLUGS } from "@/content/guides";
import type { AllergyType, PrepStyle } from "@/lib/types";

const ALL_ALLERGIES: AllergyType[] = [
  "Nut Allergy", "Dairy Allergy", "Gluten Allergy", "Egg Allergy", "Sesame Allergy", "Vegetarian", "Vegan", "Kindy",
];
const ALL_PREP: PrepStyle[] = ["no-cook", "make-ahead", "cook-fresh"];

const exists = (l: { slug: string; kind: string }) =>
  l.kind === "blog" ? BLOG_SLUGS.includes(l.slug) : GUIDE_SLUGS.includes(l.slug);

describe("relatedPosts", () => {
  it("🔴 필터 값 12개가 전부 매핑에 있다 — 필터가 늘면 여기서 걸린다", () => {
    const want = [...ALL_ALLERGIES, ...ALL_PREP, "thermosOnly"];
    expect(Object.keys(FILTER_ARTICLES).sort()).toEqual(want.sort());
  });

  it("🔴 매핑이 가리키는 글이 실제로 존재한다 — 개명하면 여기서 걸린다", () => {
    for (const [key, v] of Object.entries(FILTER_ARTICLES)) {
      if ("none" in v) {
        expect(v.none.length, `${key}: 사유가 비어 있다`).toBeGreaterThan(10);
        continue;
      }
      expect(exists(v), `${key} → ${v.slug} 가 존재하지 않는다`).toBe(true);
    }
    for (const f of FALLBACK) expect(exists(f), `폴백 ${f.slug} 가 없다`).toBe(true);
  });

  it("최대 3개를 넘지 않는다", () => {
    const all = relatedPosts({ allergies: ALL_ALLERGIES, prepStyles: ALL_PREP, thermosOnly: true });
    expect(all.length).toBeLessThanOrEqual(3);
  });

  it("필터를 안 켜면 폴백 3개를 준다", () => {
    expect(relatedPosts({ allergies: [], prepStyles: [], thermosOnly: false })).toEqual(FALLBACK);
  });

  it("켠 필터에 해당하는 글을 준다", () => {
    const r = relatedPosts({ allergies: ["Nut Allergy"], prepStyles: [], thermosOnly: false });
    expect(r.map((x) => x.slug)).toContain("allergy-management-school-lunchbox-australia");
  });

  it("중복을 내지 않는다 — Vegetarian과 Vegan은 같은 가이드다", () => {
    const r = relatedPosts({ allergies: ["Vegetarian", "Vegan"], prepStyles: [], thermosOnly: false });
    expect(new Set(r.map((x) => x.slug)).size).toBe(r.length);
  });

  it("🔴 글이 없는 필터는 결과에 안 나온다 — 죽은 링크가 화면에 뜨면 안 된다", () => {
    const r = relatedPosts({ allergies: [], prepStyles: ["cook-fresh"], thermosOnly: false });
    expect(r).toEqual(FALLBACK);
  });
});

/**
 * 🔴 제목이 "선택하신 필터에 맞춰"라고 약속하면 카드가 그 약속을 지켜야 한다.
 *
 * 2026-08-20 리뷰에서 잡힌 것: 화면은 **입력**(필터를 켰나)으로 제목을 골랐는데
 * 10개 필터 중 5개는 아직 글이 없어서(`{ none }`) 켜도 폴백이 나온다.
 * Gluten Allergy 하나만 켜면 "필터에 맞춰" 아래 예산·식품안전·개학 글이 떴다.
 * 그래서 판정을 **결과**로 옮겼다. 이 describe가 그 계약을 지킨다.
 */
describe("matchedFilters", () => {
  it("🔴 글이 없는 필터만 켜면 false — 폴백이 나오는데 '필터에 맞췄다'고 하면 거짓말이다", () => {
    // 🔴 2026-08-20: 여기에 `thermosOnly: true`가 들어 있었다. 보온병 글이 생기면서
    //    이 조합이 더 이상 "글이 없는 필터만"이 아니게 됐다 — 전제 단언이 그걸 잡았다.
    //    글이 생기면 **픽스처에서 빼는 것**이 맞다. 남겨 두면 이 테스트가 지키려던
    //    계약(폴백↔matchedFilters 정합)이 아니라 낡은 목록을 지키게 된다.
    //    같은 날 `"Dairy Allergy"`도 같은 이유로 뺐다 — Dairy-Free 글이 생겼다.
    //    같은 날 `"Gluten Allergy"`까지 뺐다 — Gluten-Free 글이 생겼고, 이제 글이 없는
    //    필터는 `no-cook`·`cook-fresh` 둘뿐이라 이 픽스처에 남길 알레르기 값이 없다.
    //    같은 날 `"no-cook"`도 뺐다 — No-Cook 글이 생겼다. 이제 **글이 없는 필터는
    //    `cook-fresh` 하나뿐**이고, 그건 안 쓰기로 결정한 글이다. 다음에 이 픽스처가
    //    빌 일은 없다는 뜻이지만, 그래서 전제 단언(폴백이 나온다)이 더 중요해진다 —
    //    cook-fresh에 글이 생기면 이 테스트는 지킬 대상 자체가 없어진다.
    const onlyNone: FilterState = {
      allergies: [],
      prepStyles: ["cook-fresh"],
      thermosOnly: false,
    };
    expect(relatedPosts(onlyNone), "전제: 이 조합은 폴백이 나온다").toEqual(FALLBACK);
    expect(matchedFilters(onlyNone)).toBe(false);
  });

  it("글이 있는 필터를 켜면 true", () => {
    expect(
      matchedFilters({ allergies: ["Nut Allergy"], prepStyles: [], thermosOnly: false }),
    ).toBe(true);
    expect(
      matchedFilters({ allergies: [], prepStyles: ["make-ahead"], thermosOnly: false }),
    ).toBe(true);
  });

  it("필터를 하나도 안 켜면 false", () => {
    expect(matchedFilters({ allergies: [], prepStyles: [], thermosOnly: false })).toBe(false);
  });

  it("🔴 relatedPosts가 폴백을 줄 때는 반드시 false다 — 두 함수가 어긋나면 여기서 걸린다", () => {
    // 필터 10개의 모든 단일 조합을 훑는다. 하나라도 어긋나면 제목이 카드를 배신한다.
    const singles: FilterState[] = [
      ...ALL_ALLERGIES.map((a) => ({ allergies: [a], prepStyles: [], thermosOnly: false })),
      ...ALL_PREP.map((p) => ({ allergies: [], prepStyles: [p], thermosOnly: false })),
      { allergies: [], prepStyles: [], thermosOnly: true },
    ];
    for (const f of singles) {
      const isFallback = relatedPosts(f) === FALLBACK;
      expect(matchedFilters(f), `${JSON.stringify(f)}: 결과와 판정이 어긋난다`).toBe(!isFallback);
    }
  });
});

describe("articleHref", () => {
  it("blog는 /blog/, guide는 /guides/ — 복수형이 갈린다", () => {
    expect(articleHref("en", { slug: "nut-free-school-lunches-new-zealand", kind: "blog" }))
      .toBe("/en/blog/nut-free-school-lunches-new-zealand");
    expect(articleHref("en", { slug: "vegetarian-vegan-school-lunch-guide-nz", kind: "guide" }))
      .toBe("/en/guides/vegetarian-vegan-school-lunch-guide-nz");
  });

  it("로케일이 앞에 붙는다", () => {
    expect(articleHref("ko", { slug: "x", kind: "blog" })).toBe("/ko/blog/x");
    expect(articleHref("zh", { slug: "x", kind: "guide" })).toBe("/zh/guides/x");
  });

  it("🔴 실제 매핑·폴백 전부가 살아 있는 경로를 만든다", () => {
    const links = [
      ...Object.values(FILTER_ARTICLES).filter((v): v is RelatedLink => !("none" in v)),
      ...FALLBACK,
    ];
    for (const l of links) {
      const href = articleHref("en", l);
      expect(href, `${l.slug}: 경로가 종류와 안 맞는다`).toBe(
        `/en/${l.kind === "blog" ? "blog" : "guides"}/${l.slug}`,
      );
      expect(exists(l), `${l.slug}: 이 경로의 글이 없다`).toBe(true);
    }
  });
});
