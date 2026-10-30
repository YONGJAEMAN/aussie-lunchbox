import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * WCAG 2.4.1 (Bypass Blocks, Level A).
 *
 * 🔴 2026-09-01: 라이브 35쪽 전수 크롤에서 건너뛰기 링크가 **한 쪽도 없었다.**
 * `<main>`에 id조차 없어서, 키보드·스크린리더 사용자는 페이지마다 내비게이션을
 * 전부 지나야 본문에 닿았다. 화면상으로는 아무 이상이 없어 보이는 종류의 고장이다.
 *
 * `<main>`은 페이지마다 따로 렌더되므로 로케일 레이아웃의 래퍼에 id를 두고,
 * 링크도 같은 곳에 둔다. 이 테스트는 **링크와 목적지가 갈라지는 것**을 막는다 —
 * 둘 중 하나만 이름이 바뀌면 링크는 조용히 아무 데도 가지 않는다.
 *
 * ⚠️ 이건 소스 검사다. 소스에 있다고 화면에 나온다는 뜻은 아니므로,
 * 배포 후에는 라이브 HTML에서 `href="#..."`와 같은 id를 실제로 확인할 것.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAYOUT = path.join(ROOT, "app", "[locale]", "layout.tsx");
const LOCALES = ["en", "ko", "zh"] as const;

function layoutSource(): string {
  return readFileSync(LAYOUT, "utf8");
}

describe("건너뛰기 링크 (WCAG 2.4.1)", () => {
  it("로케일 레이아웃에 건너뛰기 링크가 있다", () => {
    expect(layoutSource(), "레이아웃에 skip link가 없다").toMatch(
      /href="#[a-z-]+"[\s\S]{0,600}?skip_to_content/,
    );
  });

  it("링크의 앵커와 본문 래퍼의 id가 같다", () => {
    const src = layoutSource();
    const anchor = src.match(/href="#([a-z-]+)"/);
    expect(anchor, "건너뛰기 링크의 href를 못 찾았다").not.toBeNull();

    const target = anchor![1];
    expect(src, `href="#${target}"는 있는데 id="${target}"인 요소가 없다`).toContain(
      `id="${target}"`,
    );
  });

  it("본문 래퍼가 포커스를 받을 수 있다", () => {
    // tabIndex={-1}이 없으면 일부 브라우저에서 링크를 눌러도 포커스가 옮겨가지 않고,
    // 이후 Tab이 다시 내비게이션으로 돌아간다 — 링크가 있으나 마나가 된다.
    const src = layoutSource();
    const target = src.match(/href="#([a-z-]+)"/)![1];
    const wrapper = src.match(new RegExp(`id="${target}"[^>]*`));
    expect(wrapper, "본문 래퍼를 못 찾았다").not.toBeNull();
    expect(wrapper![0], "본문 래퍼에 tabIndex={-1}이 없다").toContain("tabIndex={-1}");
  });

  it("링크가 내비게이션보다 먼저 나온다", () => {
    // 내비게이션 뒤에 있으면 건너뛸 것을 이미 다 지난 뒤라 아무 의미가 없다.
    const src = layoutSource();
    const link = src.indexOf("skip_to_content");
    const navbar = src.indexOf("<Navbar");
    expect(link, "skip_to_content를 못 찾았다").toBeGreaterThan(-1);
    expect(navbar, "<Navbar />를 못 찾았다").toBeGreaterThan(-1);
    expect(link, "건너뛰기 링크가 Navbar 뒤에 있다").toBeLessThan(navbar);
  });

  it.each(LOCALES)("%s 메시지에 skip_to_content가 있고 비어 있지 않다", (locale) => {
    const messages = JSON.parse(
      readFileSync(path.join(ROOT, "messages", `${locale}.json`), "utf8"),
    ) as Record<string, string>;
    expect(messages.skip_to_content, `${locale}.json에 skip_to_content가 없다`).toBeTruthy();
    expect(messages.skip_to_content.trim().length).toBeGreaterThan(0);
  });

  it("세 로케일이 같은 문구를 쓰지 않는다 (번역 누락 탐지)", () => {
    // en 문구를 ko/zh에 그대로 복사해 두면 「키는 있는데 번역은 없는」 상태가
    // 어떤 검사에도 안 걸린다. 폴백이 있는 필드의 고장이 화면에 안 드러나는 것과 같다.
    const texts = LOCALES.map((l) =>
      (
        JSON.parse(
          readFileSync(path.join(ROOT, "messages", `${l}.json`), "utf8"),
        ) as Record<string, string>
      ).skip_to_content,
    );
    expect(new Set(texts).size, "로케일별 문구가 겹친다 — 번역이 빠졌을 수 있다").toBe(
      LOCALES.length,
    );
  });
});
