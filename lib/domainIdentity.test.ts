import { describe, it, expect } from "vitest";
import { schoolDomainCore, collidingDomains, screenCandidates } from "./domainIdentity";

/**
 * 🔴 실제로 재발송이 일어난 사례를 그대로 넣는다. 이 검사가 있었으면 막혔다.
 */
describe("🔴 같은 학교를 다른 도메인으로 두 번 보내지 않는다", () => {
  it("Papakura Central — 하이픈만 다른 도메인을 같은 것으로 본다", () => {
    // 07-29 papakura-central / 08-13 papakuracentral · 둘 다 School_Id 1421
    expect(schoolDomainCore("papakura-central.school.nz"))
      .toBe(schoolDomainCore("papakuracentral.school.nz"));
  });

  it("기발송 명단에 하이픈 변형이 있으면 후보에서 걸린다", () => {
    const r = screenCandidates(["papakuracentral.school.nz"], ["papakura-central.school.nz"]);
    expect(r.exact, "문자열이 달라 exact로는 안 걸린다").toEqual([]);
    expect(r.collide, "🔴 이게 안 걸리면 같은 학교에 두 번 간다").toHaveLength(1);
    expect(r.collide[0].sent).toContain("papakura-central.school.nz");
  });

  it("접미사만 다른 것도 후보로 올린다", () => {
    expect(schoolDomainCore("freyberg.ac.nz")).toBe(schoolDomainCore("freyberg.school.nz"));
  });

  /**
   * 🔴 양성 대조가 없으면 이 검사는 알리바이다 — 전부 같다고 해도 통과한다.
   *    실제로 다른 학교들이 **안 걸리는지**를 같이 본다.
   */
  it("🔴 다른 학교는 서로 다른 핵심 이름을 갖는다", () => {
    const 다름: Array<[string, string]> = [
      ["stannes.school.nz", "stteresas.school.nz"],
      ["kns.ac.nz", "whs.ac.nz"],
      ["rosehill.org.nz", "roslyn.school.nz"],
      ["gladstone.school.nz", "gladstone1.school.nz"],   // 숫자가 구분한다
    ];
    for (const [a, b] of 다름) {
      expect(schoolDomainCore(a), `${a} 와 ${b} 가 같게 나온다`).not.toBe(schoolDomainCore(b));
    }
  });

  /**
   * ⚠️ 핵심 이름이 같아도 **대부분은 다른 학교다.** 실측 12쌍 중 11쌍이 별개였다.
   *    그래서 이 함수는 "중복"이 아니라 "확인 대상"을 낸다 — 판정은 School_Id로 한다.
   */
  it("겹침은 「확인 대상」이지 「중복」이 아니다 — 이름이 같아도 다른 학교가 많다", () => {
    const g = collidingDomains([
      "freyberg.ac.nz", "freyberg.school.nz",   // 실제로는 다른 학교(고등/초등)
      "sjr.nz", "sjr.school.nz",                 // St Joseph's ≠ St John's
      "papakura-central.school.nz", "papakuracentral.school.nz",  // 실제 같은 학교
    ]);
    expect(g.size, "세 묶음이 다 후보로 올라와야 한다").toBe(3);
    expect([...g.values()].every((v) => v.length === 2)).toBe(true);
  });

  it("빈 값·대소문자·www·프로토콜을 견딘다", () => {
    expect(schoolDomainCore("https://WWW.Papakura-Central.School.NZ/"))
      .toBe(schoolDomainCore("papakuracentral.school.nz"));
    expect(schoolDomainCore("")).toBe("");
  });
});
