import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 언어 전환 복원(2026-10-29).
 *
 * 5-19부터 /ko, /zh는 /en으로 redirect됐고 내비게이션의 전환 버튼도 숨겨져 있었다(AdSense 심사 대응).
 * 그런데 FAQ(`faq_a10`)는 계속 「상단 내비게이션의 언어 선택기를 쓰라」고 말하고 있었다 — 없는 버튼을.
 *
 * 버튼을 되살리면서 **심사 대응 장치는 그대로 둔다**: ko/zh는 noindex · hreflang 없음 · 광고 코드 없음.
 * 이 테스트는 전환이 열려 있는 것과, 그 세 장치가 함께 남아 있는 것을 같이 본다.
 *
 * ⚠️ 소스 검사다. 배포 후 라이브에서 /ko가 200이고 robots noindex·광고 스크립트 없음을 확인할 것.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p: string[]) => readFileSync(path.join(ROOT, ...p), "utf8");

describe("언어 전환", () => {
  it("내비게이션에 en·ko·zh 세 버튼이 있다", () => {
    const nav = read("components", "Navbar.tsx");
    const block = nav.match(/const LOCALES = \[([\s\S]*?)\];/)?.[1] ?? "";
    const codes = [...block.matchAll(/code: "(\w+)"/g)].map((m) => m[1]);
    expect(codes).toEqual(["en", "ko", "zh"]);
  });

  it("FAQ가 말하는 언어 선택기가 실제로 있다(문구와 화면이 같은 말을 한다)", () => {
    const faq = JSON.parse(read("messages", "en.json")).faq_a10 as string;
    expect(faq).toMatch(/language selector/);
    expect(read("components", "Navbar.tsx")).toMatch(/onClick=\{\(\) => switchLocale\(loc\.code\)\}/);
  });

  it("미들웨어가 /ko, /zh를 /en으로 돌려보내지 않는다", () => {
    const mw = read("middleware.ts");
    expect(mw).not.toMatch(/NextResponse\.redirect\(/);
    expect(mw).not.toMatch(/startsWith\("\/(ko|zh)\/"\)/);
  });
});

describe("ko/zh는 열려도 심사 대상이 아니다", () => {
  const layout = read("app", "[locale]", "layout.tsx");

  it("🔴 robots index는 영어일 때만", () => {
    expect(layout).toMatch(/const isEnglish = locale === "en";/);
    // Aussie: 영어여도 `SITE_NOINDEX`(재런칭 전) 동안은 noindex다 — 둘 다 걸려 있어야 한다.
    expect(layout).toMatch(/const indexable = isEnglish && !SITE_NOINDEX/);
    expect(layout).toMatch(/index: indexable,[\s\S]*googleBot: \{\s*index: indexable,/);
  });

  it("🔴 광고 코드는 영어 페이지에만", () => {
    expect(layout).toMatch(/const showAdSenseScript = locale === "en" &&/);
  });

  it("🔴 hreflang alternate에 ko·zh를 광고하지 않는다", () => {
    const meta = read("lib", "seo", "pageMetadata.ts");
    // `${BASE_URL}`의 중괄호 때문에 `{…}` 매칭은 첫 줄에서 끊긴다 — openGraph 직전까지 자른다.
    const langs = meta.match(/languages: \{([\s\S]*?)\n\s*openGraph:/)?.[1] ?? "";
    expect(langs, "languages 블록을 못 찾으면 이 검사는 알리바이다").toMatch(/en:/);
    expect(langs).not.toMatch(/\bko\b|zh/);
  });
});
