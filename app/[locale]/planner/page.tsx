import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PlannerClient from "@/components/PlannerClient";

const BASE_URL = "https://www.aussielunchbox.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const canonical = `${BASE_URL}/${locale}/planner`;

  const titles: Record<string, string> = {
    en: "Lunch Planner — Aussie Lunchbox",
    ko: "도시락 플래너 — Aussie Lunchbox",
    zh: "午餐计划器 — Aussie Lunchbox",
  };
  const descriptions: Record<string, string> = {
    en: "Generate a personalised week of healthy Australian school lunches in seconds. Set allergies, dietary preferences, and budget — get a full meal plan with shopping list.",
    ko: "몇 초 만에 건강한 호주 학교 도시락 1주일 계획을 생성하세요. 알레르기, 식단 선호도, 예산을 설정하고 쇼핑 목록이 포함된 식단을 받아보세요.",
    zh: "几秒钟内生成一周健康的澳洲学校午餐计划。设置过敏原、饮食偏好和预算，获取完整的膳食计划和购物清单。",
  };

  return {
    title: titles[locale] ?? titles.en,
    description: descriptions[locale] ?? descriptions.en,
    alternates: {
      canonical,
      languages: {
        "x-default": `${BASE_URL}/en/planner`,
        en: `${BASE_URL}/en/planner`,
        ko: `${BASE_URL}/ko/planner`,
        "zh-CN": `${BASE_URL}/zh/planner`,
      },
    },
    openGraph: { url: canonical },
  };
}

export default async function PlannerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: t("planner_seo_howto_name"),
    description: t("planner_seo_howto_desc"),
    step: [
      {
        "@type": "HowToStep",
        name: t("planner_seo_step1_name"),
        text: t("planner_seo_step1_text"),
      },
      {
        "@type": "HowToStep",
        name: t("planner_seo_step2_name"),
        text: t("planner_seo_step2_text"),
      },
      {
        "@type": "HowToStep",
        name: t("planner_seo_step3_name"),
        text: t("planner_seo_step3_text"),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#7B3F00] mb-6">
            {t("planner_seo_title")}
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed mb-8">
            {t("planner_seo_intro")}
          </p>

          <div className="grid md:grid-cols-3 gap-8 mb-10">
            <div className="bg-[#FDFAF2] rounded-2xl p-6">
              <div className="text-2xl mb-3">1️⃣</div>
              <h3 className="font-bold text-[#7B3F00] mb-2">{t("planner_seo_step1_name")}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{t("planner_seo_step1_text")}</p>
            </div>
            <div className="bg-[#FDFAF2] rounded-2xl p-6">
              <div className="text-2xl mb-3">2️⃣</div>
              <h3 className="font-bold text-[#7B3F00] mb-2">{t("planner_seo_step2_name")}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{t("planner_seo_step2_text")}</p>
            </div>
            <div className="bg-[#FDFAF2] rounded-2xl p-6">
              <div className="text-2xl mb-3">3️⃣</div>
              <h3 className="font-bold text-[#7B3F00] mb-2">{t("planner_seo_step3_name")}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{t("planner_seo_step3_text")}</p>
            </div>
          </div>

          <div className="space-y-6 text-gray-600 leading-relaxed">
            <div>
              <h2 className="text-xl font-bold text-[#7B3F00] mb-2">{t("planner_seo_allergy_h")}</h2>
              <p>{t("planner_seo_allergy_p")}</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#7B3F00] mb-2">{t("planner_seo_price_h")}</h2>
              <p>{t("planner_seo_price_p")}</p>
            </div>
          </div>
        </div>
      </section>
      <PlannerClient />
    </>
  );
}
