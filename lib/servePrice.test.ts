import { describe, it, expect } from "vitest";
import {
  multipleWord,
  isMultiple,
  pctMore,
  approxMoney,
  packSize,
  serveSize,
  MULTIPLE_MIN,
} from "./servePrice";

/**
 * 🔴 `multipleWord`는 2026-08-20까지 `Math.max(2, Math.round(ratio))`였다.
 *    그래서 **1.18배도, 1.4배도, 0.5배도 전부 "double"**을 돌려줬다. 계란/블랙빈 비율이
 *    1.73이라 경계에서 두 칸 거리이고, 한 주치 가격 변동이면 넘어간다 —
 *    그 순간 egg-free 글이 조용히 거짓말을 시작한다.
 *    이 모듈은 값이 없을 때 던진다. 배수도 같은 규칙을 따라야 한다.
 */
describe("multipleWord — 배수로 말할 수 없는 비율은 던진다", () => {
  it(`${MULTIPLE_MIN}배 미만이면 던진다 (예전엔 전부 "double"이었다)`, () => {
    for (const r of [1.18, 1.4, 1.0, 0.5]) {
      expect(() => multipleWord(r), `multipleWord(${r})가 조용히 값을 돌려준다`).toThrow(
        /배수로 말할 수 없다/,
      );
      expect(isMultiple(r)).toBe(false);
    }
  });

  it("1.5배 이상은 반올림 정수 배수로 말한다", () => {
    expect(multipleWord(1.73)).toBe("double");
    expect(multipleWord(2.74)).toBe("triple");
    expect(multipleWord(7.31)).toBe("seven times");
    expect(multipleWord(12.2)).toBe("12 times");
  });

  it("pctMore는 5% 단위로 말하고, 비율이 뒤집히면 던진다", () => {
    expect(pctMore(1.37)).toBe("about 35% more");
    expect(pctMore(2.41)).toBe("about 140% more");
    // "-20% more"라고 쓰면 문장이 정확히 거꾸로 거짓말한다.
    expect(() => pctMore(0.9)).toThrow(/1 이하/);
    expect(() => pctMore(1)).toThrow(/1 이하/);
  });
});

describe("approxMoney — 어림 금액은 10c 단위", () => {
  it("딱 떨어지는 달러는 센트를 안 붙인다", () => {
    expect(approxMoney(4.0264)).toBe("$4");
    expect(approxMoney(2.0138)).toBe("$2");
    expect(approxMoney(7.7085)).toBe("$7.70");
    expect(approxMoney(3.55)).toBe("$3.60");
  });
});

describe("packSize / serveSize — 팩 크기는 고정 SKU와 PORTION_BASIS에서만 나온다", () => {
  it("치즈는 500g 팩 / 30g 1인분", () => {
    expect(packSize("Cheese")).toBe("500g");
    expect(serveSize("Cheese")).toBe("30g");
  });

  it("근거 없는 재료는 던진다 — 본문에 팩 크기를 손으로 적지 못하게", () => {
    // 🔴 2026-08-23: 예전엔 "Bread"를 썼는데 그날 근거가 등록되면서 더 이상 안 던졌다.
    //    근거가 **끝내 없을** 재료를 쓴다 — API가 한 번도 안 잡히는 폴백 재료다.
    expect(() => packSize("Turkey")).toThrow(/PINNED_SKUS에/);
    expect(() => serveSize("Turkey")).toThrow(/PORTION_BASIS에/);
  });
});
