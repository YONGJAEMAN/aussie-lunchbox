import { describe, it, expect } from "vitest";
import { extractReferences, getReferences, getIngredientCategory, getIngredientEmoji } from "./utils";
import { POSTS } from "@/content/posts";
import { GUIDES } from "@/content/guides";

describe("extractReferences", () => {
  it("returns empty array when body has no links", () => {
    expect(extractReferences("Plain text with no links")).toEqual([]);
  });

  it("extracts a single markdown link", () => {
    const body = "See [Ministry of Health](https://www.health.govt.nz/) for details.";
    expect(extractReferences(body)).toEqual([
      { text: "Ministry of Health", url: "https://www.health.govt.nz/" },
    ]);
  });

  it("dedupes by URL keeping the first text", () => {
    const body = `
First mention: [Ministry of Health](https://example.com/).
Second mention: [MoH](https://example.com/).
`;
    expect(extractReferences(body)).toEqual([
      { text: "Ministry of Health", url: "https://example.com/" },
    ]);
  });

  it("ignores non-http links (e.g. relative)", () => {
    const body = "[Link](/contact) and [External](https://example.com)";
    const refs = extractReferences(body);
    expect(refs).toHaveLength(1);
    expect(refs[0].url).toBe("https://example.com");
  });

  it("preserves multiple distinct external links", () => {
    const body = "[A](https://a.com) and [B](https://b.com) and [C](https://c.com)";
    expect(extractReferences(body)).toHaveLength(3);
  });
});

describe("getReferences", () => {
  it("returns extracted references when body has links", () => {
    const body = "[X](https://x.com)";
    const refs = getReferences(body);
    expect(refs).toHaveLength(1);
    expect(refs[0].url).toBe("https://x.com");
  });

  // 🔴 2026-08-14: 이 테스트는 원래 "인용이 없으면 표준 4개를 대신 보여준다"를 지키고 있었다.
  // 그 폴백 때문에 보온가방 리뷰와 가격지수 글이 영양·알레르기 기관을 출처로 달고 있었다.
  // **테스트가 잘못된 동작을 지키고 있었던 것이다.** 동작을 바꿨으니 테스트도 바꾼다.
  it("본문에 인용이 없으면 아무 출처도 만들어내지 않는다", () => {
    expect(getReferences("Plain content with no links.")).toEqual([]);
  });
});

describe("getIngredientCategory", () => {
  it("categorises produce items", () => {
    expect(getIngredientCategory("apple")).toBe("Produce");
    expect(getIngredientCategory("Carrot")).toBe("Produce");
  });

  it("categorises meat & seafood", () => {
    expect(getIngredientCategory("chicken breast")).toBe("Meat & Seafood");
    expect(getIngredientCategory("Tuna")).toBe("Meat & Seafood");
  });

  it("falls back to General for unknown items", () => {
    expect(getIngredientCategory("xyz-unknown-thing-123")).toBe("General");
  });
});

describe("getIngredientEmoji", () => {
  it("returns exact emoji for matching ingredient", () => {
    expect(getIngredientEmoji("Apple")).toBe("🍎");
    expect(getIngredientEmoji("chicken")).toBe("🍗");
  });

  it("falls back to a category emoji for unknown items", () => {
    const emoji = getIngredientEmoji("very-obscure-ingredient");
    expect(typeof emoji).toBe("string");
    expect(emoji.length).toBeGreaterThan(0);
  });
});

describe("🔴 References 라벨에 마크다운이 새지 않는다", () => {
  it("링크 라벨의 굵게·기울임 표시를 벗긴다", () => {
    const refs = extractReferences("see [*Food and Nutrition Guidelines*](https://a.example/x) and [**Bold Doc**](https://b.example/y)");
    expect(refs.map((r) => r.text)).toEqual(["Food and Nutrition Guidelines", "Bold Doc"]);
  });

  it("모든 글의 References 라벨에 별표가 없다", () => {
    const all = [...Object.values(POSTS), ...Object.values(GUIDES)];
    expect(all.length, "글을 하나도 못 읽었다").toBeGreaterThan(20);
    const bad = all.flatMap((e) => getReferences(e.body)).filter((r) => r.text.includes("*"));
    expect(bad, `References 라벨에 별표가 있다 → ${JSON.stringify(bad)}`).toEqual([]);
  });
});
