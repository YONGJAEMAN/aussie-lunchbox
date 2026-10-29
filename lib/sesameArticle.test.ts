import { describe, it, expect } from "vitest";
import { POSTS } from "@/content/posts";
import { FILTER_ARTICLES } from "./relatedPosts";
import { dietGroup } from "./dietEconomics";
import {
  breadRows, sesameDeclaredKeys, sesameMains, keptWithWarning, keptIfWarningsExcluded,
  sandwichWarning, passesButOftenSesame,
} from "./sesameFacts";

/**
 * 참깨 글(2026-10-23). 수치는 `sesameFacts`가 생성하지만, **문장이 기대는 모양**은 여기서 리터럴로 묶는다
 * — 데이터가 바뀌어 문장이 거짓이 되면(예: 빵이 더는 주의를 안 단다) 여기서 멈추고 글을 다시 본다.
 */
const post = POSTS["sesame-free-school-lunches-nz"];

describe("🔴 참깨 글 — 문장이 데이터와 같은 말을 한다", () => {
  it("글이 있고 생성이 깨지지 않았다(빈 자리·undefined·NaN 없음)", () => {
    expect(post).toBeTruthy();
    for (const t of [post.body, post.excerpt]) {
      expect(t).not.toMatch(/undefined|NaN|\$\{/);
    }
    expect(post.body).toContain("https://www.foodstandards.gov.au/consumer/labelling/allergen-labelling");
  });

  it("빵: 라벨 있는 8개 중 7개가 참깨 주의, 선언은 0, 예외는 Pita Bread (10-23 실측)", () => {
    const rows = breadRows();
    expect(rows.length).toBe(8);
    expect(rows.filter((r) => r.status === "warns").length).toBe(7);
    expect(rows.filter((r) => r.status === "declares").length).toBe(0);
    expect(rows.filter((r) => r.status === "neither").map((r) => r.key)).toEqual(["Pita Bread"]);
    expect(post.excerpt).toMatch(/^7 of the 8 breads/);
  });

  it("「tahini·hummus는 예상대로, 소스도 선언」 문장이 기대는 재료가 선언 목록에 있다", () => {
    const d = sesameDeclaredKeys();
    expect(d).toEqual(expect.arrayContaining(["Tahini", "Hummus", "Hoisin Sauce", "Teriyaki Sauce"]));
  });

  it("메인 수가 세 경로(글 · 식이 표 · 필터)에서 같다", () => {
    const m = sesameMains();
    expect(m.kept).toBe(77);
    expect(dietGroup("sesame-free").count).toBe(m.kept);
    expect(m.declared.length + m.unverified.length).toBe(m.total - m.kept);
    expect(post.body).toContain(`That leaves ${m.kept} of ${m.total} mains.`);
  });

  it("「주의까지 빼면 샌드위치 대부분이 사라진다」 — 실제로 절반 넘게 사라진다", () => {
    const s = sandwichWarning();
    expect(s.warned).toBeGreaterThan(s.kept / 2);
    expect(keptIfWarningsExcluded()).toBe(sesameMains().kept - keptWithWarning());
    expect(post.body).toContain(`${s.warned} of the ${s.kept} sandwich mains would go with them`);
  });

  it("「우리 레시피에선 통과한다」 목록이 비지 않았다", () => {
    expect(passesButOftenSesame().length).toBeGreaterThan(2);
  });

  it("플래너의 참깨 필터가 이 글을 가리킨다", () => {
    expect(FILTER_ARTICLES["Sesame Allergy"]).toEqual({ slug: "sesame-free-school-lunches-nz", kind: "blog" });
  });
});
