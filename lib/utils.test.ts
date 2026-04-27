import { describe, it, expect } from "vitest";
import { extractReferences, getReferences, getIngredientCategory, getIngredientEmoji } from "./utils";

describe("extractReferences", () => {
  it("returns empty array when body has no links", () => {
    expect(extractReferences("Plain text with no links")).toEqual([]);
  });

  it("extracts a single markdown link", () => {
    const body = "See [Eat for Health](https://www.eatforhealth.gov.au/) for details.";
    expect(extractReferences(body)).toEqual([
      { text: "Eat for Health", url: "https://www.eatforhealth.gov.au/" },
    ]);
  });

  it("dedupes by URL keeping the first text", () => {
    const body = `[Health](https://example.com/) and [Same](https://example.com/)`;
    expect(extractReferences(body)).toEqual([
      { text: "Health", url: "https://example.com/" },
    ]);
  });

  it("ignores non-http links", () => {
    const refs = extractReferences("[Local](/contact) and [Ext](https://x.com)");
    expect(refs).toHaveLength(1);
    expect(refs[0].url).toBe("https://x.com");
  });
});

describe("getReferences", () => {
  it("returns extracted references when body has links", () => {
    const refs = getReferences("[X](https://x.com)");
    expect(refs).toHaveLength(1);
    expect(refs[0].url).toBe("https://x.com");
  });

  it("returns standard AU fallback when body has no links", () => {
    const refs = getReferences("Plain content with no links.");
    expect(refs.length).toBeGreaterThan(0);
    expect(refs.some((r) => r.url.includes("eatforhealth.gov.au"))).toBe(true);
    expect(refs.some((r) => r.url.includes("allergyfacts.org.au"))).toBe(true);
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
