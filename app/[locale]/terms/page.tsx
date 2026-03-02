import Link from "next/link";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions - Aussie Lunchbox",
};

export default async function TermsPage() {
  const locale = await getLocale();

  return (
    <main className="min-h-screen bg-[#FDFAF2]">
      {/* Hero */}
      <section className="text-white text-center py-16 px-4" style={{ background: "linear-gradient(135deg, #7B3F00 0%, #F5A623 100%)" }}>
        <h1 className="text-4xl font-bold mb-3">Terms and Conditions</h1>
        <p className="text-lg opacity-90">Last Updated: February 2026</p>
      </section>

      <section className="max-w-3xl mx-auto py-16 px-4">
        <div className="bg-white rounded-2xl shadow p-10 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-[#7B3F00] mt-0">1. Introduction</h2>
          <p className="text-gray-600 leading-relaxed">
            Welcome to <strong>Aussie Lunchbox Planner</strong>. By accessing our website and using our
            services, you agree to be bound by these Terms and Conditions. If you do not agree with
            any part of these terms, please do not use our services.
          </p>

          <h2 className="text-xl font-bold text-[#7B3F00]">2. Use of Service</h2>
          <p className="text-gray-600 leading-relaxed">
            Aussie Lunchbox Planner provides automated lunchbox meal planning and grocery list generation.
          </p>
          <ul className="text-gray-600 space-y-1">
            <li>You must use the service only for lawful purposes.</li>
            <li>You agree not to misuse or attempt to disrupt our services.</li>
          </ul>

          <h2 className="text-xl font-bold text-[#7B3F00]">3. Intellectual Property</h2>
          <p className="text-gray-600 leading-relaxed">
            The content, layout, design, data, libraries, and graphics on this website are protected
            by Australia and international intellectual property laws. Content is owned by Kiwi
            Lunchbox Planner unless otherwise stated (e.g., third-party recipes or images).
          </p>

          <h2 className="text-xl font-bold text-[#7B3F00]">4. User Accounts</h2>
          <p className="text-gray-600 leading-relaxed">
            To access certain features, you may need to register an account. You are responsible for
            maintaining the confidentiality of your account credentials and for all activities that
            occur under your account.
          </p>

          <h2 className="text-xl font-bold text-[#7B3F00]">5. Limitation of Liability</h2>
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

          <h2 className="text-xl font-bold text-[#7B3F00]">6. Disclaimer regarding Food and Health</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
            <p className="text-yellow-800 font-semibold text-sm">
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

          <h2 className="text-xl font-bold text-[#7B3F00]">7. Changes to Terms</h2>
          <p className="text-gray-600 leading-relaxed">
            We reserve the right to modify these terms at any time. We will notify users of any
            significant changes by posting the new terms on this site.
          </p>

          <h2 className="text-xl font-bold text-[#7B3F00]">8. Contact</h2>
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
      <footer className="bg-[#7B3F00] text-white py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm opacity-75">
            © {new Date().getFullYear()} Aussie Lunchbox — The Lunch Planner for Australian Families.
          </p>
          <div className="flex gap-4 text-sm opacity-75">
            <Link href={`/${locale}/terms`} className="hover:opacity-100">Terms</Link>
            <Link href={`/${locale}/policies`} className="hover:opacity-100">Privacy</Link>
            <Link href={`/${locale}/contact`} className="hover:opacity-100">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
