import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * middleware:
 *
 * 1. /ko/*, /zh/*는 2026-05-19~10-28 동안 /en/*으로 307 redirect했다(AdSense 심사 대응).
 *    10-29 언어 전환을 되살리며 redirect를 뺐다. 대신 그 페이지들은 계속
 *    noindex · hreflang 없음 · 광고 코드 없음이다(app/[locale]/layout.tsx isEnglish 가드).
 *
 * 2. x-pathname header 설정.
 *    - layout.tsx에서 AdSense script를 조건부로 로드할 때 사용
 *      (예: /account 같은 noindex 페이지에는 AdSense 코드 미포함)
 */
/**
 * 로케일 접두사가 없는 루트 레벨 메타데이터 라우트.
 * app/opengraph-image.tsx, app/icon.tsx 등은 next-intl의 [locale] 밖에 있어서
 * 미들웨어가 /en/... 으로 리다이렉트하면 404가 된다.
 *
 * ⚠️ 2026-07-29: 실제로 그 상태였다. GSC "찾을 수 없음(404)"에 /opengraph-image가
 * 올라와 있었고, 그래서 **링크를 공유해도 미리보기 이미지가 안 떴다.**
 * 확장자가 없는 경로라 matcher의 `.*\..*` 제외에도 걸리지 않았다.
 */
const ROOT_METADATA_ROUTES = new Set([
  "/opengraph-image",
  "/icon",
  "/apple-icon",
  "/manifest.webmanifest",
]);

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 루트 레벨 메타데이터 라우트는 로케일 처리 없이 그대로 통과시킨다.
  if (ROOT_METADATA_ROUTES.has(pathname) || pathname.startsWith("/icons/")) {
    return NextResponse.next();
  }

  // next-intl 라우팅 처리
  const response = intlMiddleware(req);

  // next-intl이 자동 생성하는 HTTP Link header에는 routing.locales 전체 (en, ko, zh)
  // hreflang alternate가 박혀있음. HTML <link rel="alternate">에서는 이미 ko/zh 제거했지만
  // HTTP header에는 잔존 → AdSense 봇 입장: "국제화 미정리" 신호.
  // 단순 삭제 — HTML alternates만으로 충분.
  response.headers.delete("link");

  // layout.tsx에서 AdSense script 조건부 로드용
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  // 미들웨어 적용 범위:
  // - api, _next, _vercel 경로 제외
  // - 확장자가 있는 정적 파일 제외 (ads.txt, robots.txt, sitemap.xml, *.ico 등)
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/"],
};
