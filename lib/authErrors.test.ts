import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  authErrorMessage,
  emailRedirectTo,
  AUTH_UNREACHABLE,
  AUTH_UNKNOWN,
  PASSWORD_MIN_LENGTH,
  PASSWORD_TOO_SHORT,
} from "./authErrors";

const ROOT = join(__dirname, "..");
const ACCOUNT = readFileSync(join(ROOT, "app/[locale]/account/AccountClient.tsx"), "utf8");
const MODAL = readFileSync(join(ROOT, "components/AuthModal.tsx"), "utf8");

describe("authErrorMessage — 사용자가 못 고치는 실패는 우리 잘못이라고 밝힌다", () => {
  // 🔴 2026-08-30 Zoe가 본 실제 문구가 "Failed to fetch"였다.
  it.each([
    "Failed to fetch",
    "TypeError: Failed to fetch",
    "NetworkError when attempting to fetch resource.",
    "fetch failed",
    "Load failed",
    "getaddrinfo ENOTFOUND eedxwtpbwguqhkgrjtnq.supabase.co",
    "supabaseUrl is required.",
    "signal timed out",
  ])("네트워크/설정 실패는 안내 문구로 바뀐다: %s", (raw) => {
    expect(authErrorMessage(new Error(raw))).toBe(AUTH_UNREACHABLE);
  });

  it.each([
    "User already registered",
    "Invalid login credentials",
    "Password should be at least 6 characters",
    "Unable to validate email address: invalid format",
  ])("사용자가 고칠 수 있는 것은 원문을 살린다: %s", (raw) => {
    expect(authErrorMessage(new Error(raw))).toBe(raw);
  });

  it("Supabase가 주는 {message} 객체도 받는다", () => {
    expect(authErrorMessage({ message: "Failed to fetch" })).toBe(AUTH_UNREACHABLE);
    expect(authErrorMessage({ message: "User already registered" })).toBe("User already registered");
  });

  it("빈 값이면 모른다고 말한다", () => {
    expect(authErrorMessage(null)).toBe(AUTH_UNKNOWN);
    expect(authErrorMessage(new Error("   "))).toBe(AUTH_UNKNOWN);
  });

  it("안내 문구는 계정 없이도 쓸 수 있다는 사실을 담는다", () => {
    // 사이트 전체 홍보 문구가 "no account needed"다. 장애 때 그 사실을 알려야 한다.
    expect(AUTH_UNREACHABLE).toMatch(/without an account/i);
    expect(AUTH_UNREACHABLE).toMatch(/on our side/i);
  });
});

describe("가입 화면 두 곳이 같은 규칙을 쓴다", () => {
  it("비밀번호 최소 길이를 손으로 적은 곳이 없다", () => {
    // 🔴 계정 페이지는 8, 모달은 6이었다 — 같은 계정인데 규칙이 둘이었다.
    for (const [name, src] of [
      ["AccountClient", ACCOUNT],
      ["AuthModal", MODAL],
    ] as const) {
      expect(src, `${name}가 PASSWORD_MIN_LENGTH를 쓰지 않는다`).toContain("PASSWORD_MIN_LENGTH");
      expect(src, `${name}에 손으로 적은 길이 비교가 남아 있다`).not.toMatch(
        /password\.length\s*<\s*\d/,
      );
    }
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(PASSWORD_TOO_SHORT).toContain(String(PASSWORD_MIN_LENGTH));
  });

  it("두 곳 모두 원문 대신 authErrorMessage를 통한다", () => {
    for (const [name, src] of [
      ["AccountClient", ACCOUNT],
      ["AuthModal", MODAL],
    ] as const) {
      expect(src, `${name}가 authErrorMessage를 안 쓴다`).toContain("authErrorMessage(");
      // 원문을 그대로 화면에 넣던 자리들
      expect(src, `${name}에 error.message 직접 표시가 남아 있다`).not.toMatch(
        /set(Auth)?Error\((error|err)\.message\)/,
      );
    }
  });

  it("계정 페이지는 실패해도 로딩이 풀린다", () => {
    // 🔴 try/finally가 없어 예외가 나면 버튼이 영영 도는 상태가 됐다.
    expect(ACCOUNT).toMatch(/finally\s*\{\s*setAuthLoading\(false\);/);
  });

  it("가입 성공 문구를 에러 자리에 넣지 않는다", () => {
    // 🔴 "Check your email…"이 빨간 에러로 떴다.
    expect(MODAL).not.toMatch(/setError\("Check your email/);
    expect(MODAL).toMatch(/setNotice\("Check your email/);
  });
});

describe("확인메일이 코드를 교환하는 자리로 돌아온다", () => {
  // 🔴 emailRedirectTo가 없어 Supabase가 Site URL(루트)로 보냈다.
  //    `/auth/callback`만 exchangeCodeForSession을 하는데 링크는 `/?code=…`로 떨어져,
  //    이메일 확인은 되지만 로그인은 안 되는 상태가 됐다.
  const ORIGIN = "https://www.kiwilunchbox.co.nz";
  beforeEach(() => {
    vi.stubGlobal("window", { location: { origin: ORIGIN, pathname: "/en/account" } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("항상 /auth/callback 으로 돌아온다", () => {
    expect(emailRedirectTo()).toBe(`${ORIGIN}/auth/callback?next=/en/account`);
    // 🔴 루트로 돌아오면 코드를 교환할 곳이 없다
    expect(new URL(emailRedirectTo()).pathname).toBe("/auth/callback");
  });

  it("로케일을 유지한다", () => {
    for (const l of ["en", "ko", "zh"]) {
      expect(emailRedirectTo(`/${l}/account`)).toBe(`${ORIGIN}/auth/callback?next=/${l}/account`);
    }
  });

  it("모르는 로케일은 en으로 떨어뜨린다 — next는 callback 허용목록에만 있는 값이어야 한다", () => {
    for (const bad of ["/", "/xx/account", "/../etc", "/https:evil.com"]) {
      expect(emailRedirectTo(bad)).toBe(`${ORIGIN}/auth/callback?next=/en/account`);
    }
  });

  it("가입 호출 두 곳이 모두 emailRedirectTo를 넘긴다", () => {
    for (const [name, src] of [
      ["AccountClient", ACCOUNT],
      ["AuthModal", MODAL],
    ] as const) {
      expect(src, `${name}의 signUp에 emailRedirectTo가 없다`).toMatch(
        /signUp\(\{[\s\S]{0,200}emailRedirectTo: emailRedirectTo\(\)/,
      );
    }
  });
});
