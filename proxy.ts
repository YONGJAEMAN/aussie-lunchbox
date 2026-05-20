import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * AdSense 승인 단계 proxy (Next.js 16 — 이전의 middleware):
 *
 * 1. /ko/*, /zh/* 요청은 같은 경로의 / (영어 root) 로 307 redirect.
 *    Aussie는 localePrefix: "as-needed"라 영어는 prefix 없음 (예: /blog).
 *    /ko/blog → /blog 로 redirect.
 *
 * 2. next-intl이 자동 생성하는 HTTP Link header (ko/zh hreflang 포함) 삭제.
 *    HTML <link rel="alternate">에서는 이미 ko/zh 제거됨 — header 잔존만 정리.
 *
 * 3. x-pathname response header 설정.
 *    layout.tsx에서 AdSense script 조건부 로드용 (noindex 페이지 제외).
 *
 * 승인 후 다국어 운영 재개 시: redirect 블록 제거, headers.delete("link") 제거.
 */
export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /ko, /zh, /ko/..., /zh/... → /... (영어 root) 307
  if (
    pathname === "/ko" ||
    pathname === "/zh" ||
    pathname.startsWith("/ko/") ||
    pathname.startsWith("/zh/")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/(ko|zh)/, "") || "/";
    return NextResponse.redirect(url, 307);
  }

  // next-intl 라우팅 처리
  const response = intlMiddleware(req);

  // next-intl이 자동 추가한 ko/zh hreflang Link header 삭제
  response.headers.delete("link");

  // layout.tsx의 AdSense conditional 용
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  // 적용 범위: api, _next, _vercel 경로 제외, 확장자가 있는 정적 파일 제외
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/"],
};
