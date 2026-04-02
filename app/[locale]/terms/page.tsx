import Link from "next/link";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";

const BASE_URL = "https://www.aussielunchbox.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const canonical = `${BASE_URL}/${locale}/terms`;
  return {
    title: "Terms & Conditions - Aussie Lunchbox",
    alternates: {
      canonical,
      languages: {
        en: `${BASE_URL}/en/terms`,
        ko: `${BASE_URL}/ko/terms`,
        "zh-CN": `${BASE_URL}/zh/terms`,
      },
    },
    openGraph: { url: canonical },
  };
}

export default async function TermsPage() {
  const locale = await getLocale();

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#FFF8EE] pt-24 pb-16 px-4 text-center">
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest mb-4">Legal</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          Terms and Conditions
        </h1>
        <p className="text-gray-500 text-lg">Last Updated: February 2026</p>
      </section>

      <section className="max-w-3xl mx-auto py-20 px-4">
        <div className="bg-[#FFF8EE] rounded-3xl p-10 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-[#1a1a1a] mt-0">1. Introduction</h2>
          <p className="text-gray-600 leading-relaxed">
            Welcome to <strong>Aussie Lunchbox Planner</strong>. By accessing our website and using our
            services, you agree to be bound by these Terms and Conditions. If you do not agree with
            any part of these terms, please do not use our services.
          </p>

          <h2 className="text-xl font-bold text-[#1a1a1a]">2. Use of Service</h2>
          <p className="text-gray-600 leading-relaxed">
            Aussie Lunchbox Planner provides automated lunchbox meal planning and grocery list generation.
          </p>
          <ul className="text-gray-600 space-y-1">
            <li>You must use the service only for lawful purposes.</li>
            <li>You agree not to misuse or attempt to disrupt our services.</li>
          </ul>

          <h2 className="text-xl font-bold text-[#1a1a1a]">3. Intellectual Property</h2>
          <p className="text-gray-600 leading-relaxed">
            The content, layout, design, data, libraries, and graphics on this website are protected
            by Australia and international intellectual property laws. Content is owned by Aussie
            Lunchbox unless otherwise stated (e.g., third-party recipes or images).
          </p>

          <h2 className="text-xl font-bold text-[#1a1a1a]">4. User Accounts</h2>
          <p className="text-gray-600 leading-relaxed">
            To access certain features, you may need to register an account. You are responsible for
            maintaining the confidentiality of your account credentials and for all activities that
            occur under your account.
          </p>

          <h2 className="text-xl font-bold text-[#1a1a1a]">5. Limitation of Liability</h2>
          <p className="text-gray-600 leading-relaxed">
            To the maximum extent permitted by law, Aussie Lunchbox Planner shall not be liable for any
            indirect, incidental, special, or consequential damages arising out of or in connection
            with your use of the service.
          </p>
          <ul className="text-gray-600 space-y-1">
            <li>We do not guarantee that the service will be uninterrupted or error-free.</li>
            <li>
              We are not responsible for the accuracy of nutritional information or pricing data,
              which are estimates only.
            </li>
          </ul>

          <h2 className="text-xl font-bold text-[#1a1a1a]">6. Disclaimer regarding Food and Health</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <p className="text-amber-800 font-semibold text-sm">
              ⚠️ Crucial: This application provides suggestions for meal plans. It is{" "}
              <strong>not</strong> a substitute for professional medical or nutritional advice.
            </p>
          </div>
          <ul className="text-gray-600 space-y-1">
            <li>You are strictly responsible for checking ingredients for allergies.</li>
            <li>
              We cannot guarantee that any recipe is 100% free of allergens due to cross-contamination
              risks in your own kitchen or ingredient manufacturing.
            </li>
          </ul>

          <h2 className="text-xl font-bold text-[#1a1a1a]">7. Changes to Terms</h2>
          <p className="text-gray-600 leading-relaxed">
            We reserve the right to modify these terms at any time. We will notify users of any
            significant changes by posting the new terms on this site.
          </p>

          <h2 className="text-xl font-bold text-[#1a1a1a]">8. Contact</h2>
          <p className="text-gray-600 leading-relaxed">
            For any questions regarding these Terms, please contact us at{" "}
            <a href="mailto:aussielunchboxplanner@gmail.com" className="text-[#F5A623] hover:underline">
              aussielunchboxplanner@gmail.com
            </a>
            .
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] text-white py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#F5A623] flex items-center justify-center">
                  <span className="text-white font-bold text-xs">AL</span>
                </div>
                <span className="font-bold">Aussie Lunchbox</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">Free school lunch planner for Australian families.</p>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4">Product</p>
              <div className="space-y-3 text-gray-400 text-sm">
                <Link href={`/${locale}/planner`} className="block hover:text-white transition-colors">Planner</Link>
                <Link href={`/${locale}/blog`} className="block hover:text-white transition-colors">Blog</Link>
                <Link href={`/${locale}/faq`} className="block hover:text-white transition-colors">FAQ</Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4">Company</p>
              <div className="space-y-3 text-gray-400 text-sm">
                <Link href={`/${locale}/about`} className="block hover:text-white transition-colors">About</Link>
                <Link href={`/${locale}/contact`} className="block hover:text-white transition-colors">Contact</Link>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm mb-4">Legal</p>
              <div className="space-y-3 text-gray-400 text-sm">
                <Link href={`/${locale}/terms`} className="block hover:text-white transition-colors">Terms</Link>
                <Link href={`/${locale}/policies`} className="block hover:text-white transition-colors">Privacy</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Aussie Lunchbox — The Lunch Planner for Australian Families.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
