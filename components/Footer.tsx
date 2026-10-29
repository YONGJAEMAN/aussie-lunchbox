"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * 사이트 공용 푸터.
 *
 * 🔴 이 컴포넌트가 생긴 이유 (2026-08-13):
 * 푸터가 **12개 파일에 복붙**돼 있었고, 이미 **6가지 버전으로 갈라져** 있었다.
 *   - 9개 페이지에 Guides 링크가 없었다 (guides·contact 2곳에만 있었다)
 *   - price-index만 번역키 대신 영어를 하드코딩하고 있었다
 *   - 홈·account는 구조가 아예 달랐다
 * 소셜 링크를 붙이려면 12곳을 고쳐야 했고, 그건 병을 키우는 일이다.
 * **같은 일을 하는 자리가 둘 이상이면 하나만 고치게 된다** — 실제로 그렇게 갈라졌다.
 *
 * 클라이언트 컴포넌트인 이유: `AccountClient`처럼 클라이언트 트리에서도 쓰이기 때문이다.
 * layout에 `NextIntlClientProvider`가 있어 서버 페이지에서 렌더해도 번역이 동작한다.
 */

/** 우리 계정 — 여러 곳에 흩어지면 또 갈라진다 */
export const SOCIAL = {
  instagram: "https://www.instagram.com/kiwi_lunchbox_planner/",
  facebook: "https://www.facebook.com/profile.php?id=61591764696235",
} as const;

export default function Footer({ locale }: { locale: string }) {
  const t = useTranslations();
  // 🔴 푸터 링크가 높이 20px에 간격 12px였다(2026-09-11 모바일 실측).
  //    WCAG 2.5.8은 간격 예외로 통과하지만 Lighthouse는 48px로 본다.
  //    세로 패딩만 준다 — 글자 크기와 줄 간격은 그대로다.
  const link = "flex items-center min-h-touch hover:text-white transition-colors";

  return (
    <footer className="bg-[#1a1a1a] text-white py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary-deep flex items-center justify-center">
                <span className="text-white font-bold text-xs">KL</span>
              </div>
              <span className="font-bold">Aussie Lunchbox</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">{t("footer_tagline")}</p>

            {/* 🔴 2026-08-13까지 사이트 어디에도 우리 계정으로 가는 링크가 없었다.
                IG 캡션은 "link in bio"라고 말하고 사이트는 계정을 안 가리켰다 —
                양쪽이 서로를 안 가리키면 어느 쪽도 다른 쪽을 키우지 못한다. */}
            <div className="flex items-center gap-3">
              <a
                href={SOCIAL.instagram}
                target="_blank"
                rel="noopener noreferrer me"
                aria-label="Aussie Lunchbox on Instagram"
                className="text-gray-400 hover:text-white transition-colors min-h-touch min-w-touch inline-flex items-center justify-center -m-2"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5" fill="currentColor">
                  <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 1.44c-3.14 0-3.51.01-4.75.07-1.15.05-1.77.24-2.18.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.35 1.03-.4 2.18-.06 1.24-.07 1.61-.07 4.75s.01 3.51.07 4.75c.05 1.15.24 1.77.4 2.18.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.35 2.18.4 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c1.15-.05 1.77-.24 2.18-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.35-1.03.4-2.18.06-1.24.07-1.61.07-4.75s-.01-3.51-.07-4.75c-.05-1.15-.24-1.77-.4-2.18-.21-.55-.47-.94-.88-1.35-.41-.41-.8-.67-1.35-.88-.41-.16-1.03-.35-2.18-.4-1.24-.06-1.61-.07-4.75-.07Zm0 2.45a5.95 5.95 0 1 1 0 11.9 5.95 5.95 0 0 1 0-11.9Zm0 9.81a3.86 3.86 0 1 0 0-7.72 3.86 3.86 0 0 0 0 7.72Zm7.58-10.05a1.39 1.39 0 1 1-2.78 0 1.39 1.39 0 0 1 2.78 0Z" />
                </svg>
              </a>
              <a
                href={SOCIAL.facebook}
                target="_blank"
                rel="noopener noreferrer me"
                aria-label="Aussie Lunchbox on Facebook"
                className="text-gray-400 hover:text-white transition-colors min-h-touch min-w-touch inline-flex items-center justify-center -m-2"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5" fill="currentColor">
                  <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.19 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22c4.78-.75 8.44-4.92 8.44-9.94Z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <p className="font-semibold text-sm mb-4">{t("footer_product")}</p>
            <div className="space-y-3 text-gray-400 text-sm">
              <Link href={`/${locale}/planner`} className={link}>{t("nav_planner")}</Link>
              <Link href={`/${locale}/blog`} className={link}>{t("nav_blog")}</Link>
              {/* 🔴 Guides는 12곳 중 2곳에만 있었다 — 나머지 9개 페이지에서 가이드로 가는 길이 없었다 */}
              <Link href={`/${locale}/guides`} className={link}>{t("nav_guides")}</Link>
              <Link href={`/${locale}/faq`} className={link}>{t("nav_faq")}</Link>
            </div>
          </div>

          <div>
            <p className="font-semibold text-sm mb-4">{t("footer_company")}</p>
            <div className="space-y-3 text-gray-400 text-sm">
              <Link href={`/${locale}/about`} className={link}>{t("nav_about")}</Link>
              <Link href={`/${locale}/contact`} className={link}>{t("nav_contact")}</Link>
            </div>
          </div>

          <div>
            <p className="font-semibold text-sm mb-4">{t("footer_legal_label")}</p>
            <div className="space-y-3 text-gray-400 text-sm">
              <Link href={`/${locale}/terms`} className={link}>{t("footer_terms")}</Link>
              <Link href={`/${locale}/policies`} className={link}>{t("footer_privacy")}</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8">
          <p className="text-gray-400 text-sm">
            {t("footer_copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
