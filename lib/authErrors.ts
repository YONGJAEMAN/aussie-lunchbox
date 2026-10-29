/**
 * 인증 오류를 사람이 읽을 수 있는 문장으로 바꾼다.
 *
 * 🔴 2026-08-30에 사용자(Zoe)가 가입에 실패하고 "It says failed input"이라고 신고했다.
 *    화면에 뜬 건 supabase-js가 그대로 돌려준 `Failed to fetch`였다 — 백엔드에
 *    닿지 못했다는 뜻인데, 부모가 읽으면 자기가 뭘 잘못 넣은 줄 안다.
 *    Supabase 프로젝트 주소가 DNS에서 사라져 있었고(NXDOMAIN), 그 사이
 *    **가입·로그인이 모두 실패**했다.
 *
 * 원칙: 사용자가 고칠 수 있는 것(비밀번호가 짧다, 이미 가입됐다)은 원문을 살리고,
 * 사용자가 못 고치는 것(우리 백엔드가 안 붙는다)은 우리 잘못이라고 밝힌다.
 */

/** 백엔드에 닿지 못했을 때 — 사용자 입력과 무관하다. */
export const AUTH_UNREACHABLE =
  "We can't reach our sign-in service right now — this is a problem on our side, not with what you entered. Please try again later. The planner itself works without an account.";

/** 무엇이 잘못됐는지 우리도 모를 때. */
export const AUTH_UNKNOWN =
  "Something went wrong on our side. Please try again, or email aussielunchbox@gmail.com.";

/** 비밀번호 최소 길이 — 가입 화면 두 곳이 서로 다른 값을 쓰고 있었다(8 vs 6). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_TOO_SHORT = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;

/**
 * 네트워크/설정 실패를 가리키는 문구들. supabase-js는 이것들을 `error.message`에
 * 그대로 담아 돌려주고, 잘못된 URL이면 생성 단계에서 던지기도 한다.
 */
const UNREACHABLE_PATTERNS = [
  "failed to fetch",
  "networkerror",
  "network request failed",
  "load failed",
  "fetch failed",
  "err_name_not_resolved",
  "getaddrinfo",
  "enotfound",
  "econnrefused",
  "supabaseurl is required",
  "invalid url",
  "timeout",
  "timed out",
  "aborted",
];

export function authErrorMessage(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "";

  const text = raw.trim();
  if (!text) return AUTH_UNKNOWN;

  const lower = text.toLowerCase();
  if (UNREACHABLE_PATTERNS.some((p) => lower.includes(p))) return AUTH_UNREACHABLE;

  // 사용자가 고칠 수 있는 것은 Supabase 원문이 이미 명확하다
  // (예: "User already registered", "Password should be at least 6 characters").
  return text;
}

/**
 * 확인메일이 돌아올 주소.
 *
 * 🔴 2026-08-31: signUp에 emailRedirectTo가 없어 Supabase가 Site URL(사이트 루트)로
 *    보내고 있었다. `/auth/callback`만 코드를 세션으로 바꾸는데 링크는 `/?code=…`로
 *    떨어져, **이메일 확인은 되지만 로그인은 안 되는** 상태가 됐다.
 *    (같은 날 Site URL이 localhost:3000이던 것도 함께 고쳤다 — 그건 대시보드 설정이다.)
 *
 * next는 `/auth/callback`의 허용목록에 있는 값만 의미가 있다. 목록에 없으면
 * 그쪽에서 `/en/planner`로 떨어뜨린다.
 */
const LOCALES = new Set(["en", "ko", "zh"]);

export function emailRedirectTo(pathname?: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const seg = (pathname ?? (typeof window === "undefined" ? "" : window.location.pathname))
    .split("/")
    .filter(Boolean)[0];
  const locale = LOCALES.has(seg ?? "") ? seg : "en";
  return `${origin}/auth/callback?next=/${locale}/account`;
}
