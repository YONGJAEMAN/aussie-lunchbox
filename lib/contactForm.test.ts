import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { rateLimit, getClientIp, isUnknownIp, UNKNOWN_IP, __resetRateLimitStore } from "./rateLimit";

const ROOT = join(__dirname, "..");
const FORM = readFileSync(join(ROOT, "app/[locale]/contact/ContactForm.tsx"), "utf8");
const ROUTE = readFileSync(join(ROOT, "app/api/contact/route.ts"), "utf8");
const LOCALES = ["en", "ko", "zh"] as const;
const msgs = Object.fromEntries(
  LOCALES.map((l) => [l, JSON.parse(readFileSync(join(ROOT, `messages/${l}.json`), "utf8"))]),
) as Record<string, Record<string, string>>;

describe("문의폼 오류를 원인별로 가른다", () => {
  // 🔴 429·500·입력누락이 전부 "필수 항목을 채우세요"로 떴다.
  it("세 상태가 서로 다른 문구를 쓴다", () => {
    expect(FORM).toMatch(/setStatus\("missing"\)/);
    expect(FORM).toMatch(/setStatus\(res\.status === 429 \? "rate" : "server"\)/);
    expect(FORM).toMatch(/status === "rate"[\s\S]{0,120}contact_error_rate/);
    expect(FORM).toMatch(/status === "server"[\s\S]{0,120}contact_error_server/);
    // 뭉뚱그린 "error" 상태가 남아 있으면 안 된다
    expect(FORM).not.toMatch(/setStatus\("error"\)/);
  });

  it("네트워크 예외도 사용자 입력 탓으로 돌리지 않는다", () => {
    expect(FORM).toMatch(/catch\s*\{[\s\S]{0,160}setStatus\("server"\)/);
  });

  it("세 언어 모두에 새 문구가 있다 — 없으면 조용히 영어로 떨어진다", () => {
    for (const l of LOCALES) {
      for (const k of ["contact_error", "contact_error_rate", "contact_error_server"]) {
        expect(msgs[l][k], `${l}.${k}`).toBeTruthy();
      }
      // 서버 실패 문구는 "네 잘못이 아니다"를 말해야 한다
      expect(msgs[l].contact_error_server).toMatch(/aussielunchbox@gmail\.com/);
      expect(msgs[l].contact_error_rate).toMatch(/aussielunchbox@gmail\.com/);
    }
    // 세 문구가 서로 달라야 가른 의미가 있다
    for (const l of LOCALES) {
      const set = new Set([msgs[l].contact_error, msgs[l].contact_error_rate, msgs[l].contact_error_server]);
      expect(set.size, `${l}: 문구가 겹친다`).toBe(3);
    }
  });
});

describe("문의폼 한도", () => {
  it("공용 rateLimit을 쓴다 — 복사본을 다시 만들지 않는다", () => {
    // 🔴 이 라우트만 자기 Map을 들고 있어서, lib을 고쳐도 여기가 안 바뀌었다.
    expect(ROUTE).toContain('from "@/lib/rateLimit"');
    expect(ROUTE).not.toMatch(/new Map<string, number\[\]>/);
    expect(ROUTE).not.toMatch(/function checkIpRateLimit/);
  });

  it("시간당 3건이 아니다 — 문의폼은 고장 신고가 들어오는 통로다", () => {
    const m = ROUTE.match(/const MAX_PER_HOUR = (\d+)/);
    expect(m, "MAX_PER_HOUR 상수가 없다").not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(10);
  });

  it("429에 Retry-After를 붙인다", () => {
    expect(ROUTE).toMatch(/status: 429[\s\S]{0,120}Retry-After/);
  });
});

describe("rateLimit 동작", () => {
  beforeEach(() => __resetRateLimitStore());

  it("max까지 허용하고 그다음을 막는다", () => {
    for (let i = 0; i < 10; i++) expect(rateLimit("k", 10, 60_000).allowed, `${i + 1}번째`).toBe(true);
    const v = rateLimit("k", 10, 60_000);
    expect(v.allowed).toBe(false);
    expect(v.retryAfterSec).toBeGreaterThan(0);
  });

  it("키가 다르면 서로 영향을 주지 않는다", () => {
    for (let i = 0; i < 10; i++) rateLimit("a", 10, 60_000);
    expect(rateLimit("a", 10, 60_000).allowed).toBe(false);
    expect(rateLimit("b", 10, 60_000).allowed).toBe(true);
  });
});

describe("클라이언트 IP 판별", () => {
  const req = (h: Record<string, string>) => new Request("https://x.test", { headers: h });

  it.each([
    [{ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }, "203.0.113.7"],
    [{ "x-real-ip": "203.0.113.8" }, "203.0.113.8"],
    [{ "x-vercel-forwarded-for": "203.0.113.9" }, "203.0.113.9"],
    [{ "cf-connecting-ip": "203.0.113.10" }, "203.0.113.10"],
  ])("헤더에서 뽑는다 %#", (h, want) => {
    expect(getClientIp(req(h as Record<string, string>))).toBe(want);
  });

  it("빈 값은 건너뛰고 다음 헤더를 본다", () => {
    expect(getClientIp(req({ "x-forwarded-for": "  ", "x-real-ip": "203.0.113.11" }))).toBe("203.0.113.11");
  });

  it("못 뽑으면 unknown이고, 라우트가 그 사실을 알린다", () => {
    // 🔴 unknown이면 전 방문자가 한 바구니를 쓴다. 조용히 지나가면 안 된다.
    expect(getClientIp(req({}))).toBe(UNKNOWN_IP);
    expect(isUnknownIp(UNKNOWN_IP)).toBe(true);
    expect(ROUTE).toMatch(/isUnknownIp\(ip\)[\s\S]{0,200}console\.warn/);
  });
});
