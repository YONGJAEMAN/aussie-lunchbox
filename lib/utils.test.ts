import { describe, it, expect } from "vitest";
import { getIngredientCategory, getIngredientEmoji } from "./utils";

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
