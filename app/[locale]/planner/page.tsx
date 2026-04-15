import { getTranslations } from "next-intl/server";
import PlannerClient from "@/components/PlannerClient";

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
