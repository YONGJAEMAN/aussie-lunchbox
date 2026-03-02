"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function PoliciesPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "en";
  const [tab, setTab] = useState<"privacy" | "disclaimer">("privacy");

  return (
    <main className="min-h-screen bg-[#F5F7FA]">
      {/* Hero */}
      <section className="text-white text-center py-16 px-4" style={{ background: "linear-gradient(135deg, #314A37 0%, #78B159 100%)" }}>
        <h1 className="text-4xl font-bold mb-3">Privacy Policy & Disclaimer</h1>
        <p className="text-lg opacity-90">Your trust and safety are our top priorities.</p>
      </section>

      <section className="max-w-3xl mx-auto py-16 px-4">
        {/* Tabs */}
        <div className="flex rounded-2xl overflow-hidden border border-gray-200 mb-8 bg-white shadow">
          <button
            onClick={() => setTab("privacy")}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
              tab === "privacy" ? "bg-[#78B159] text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            🔒 Privacy Policy
          </button>
          <button
            onClick={() => setTab("disclaimer")}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
              tab === "disclaimer" ? "bg-[#78B159] text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            ⚠️ Disclaimer
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow p-10">
          {tab === "privacy" ? (
            <div className="prose prose-gray max-w-none">
              <h2 className="text-2xl font-bold text-[#314A37] mt-0">Privacy Policy</h2>
              <p className="text-sm text-gray-400 mb-6">Effective Date: February 11, 2026</p>
              <p className="text-gray-600 leading-relaxed">
                At <strong>Aussie Lunchbox Planner</strong>, we are committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, and safeguard your information.
              </p>

              <h3 className="text-lg font-bold text-[#314A37]">1. Information We Collect</h3>
              <ul className="text-gray-600 space-y-2">
                <li>
                  <strong>Personal Information:</strong> When you sign up, we may collect your name and
                  email address.
                </li>
                <li>
                  <strong>Usage Data:</strong> We may collect anonymous data on how you use the app
                  (e.g., recipes viewed, plans generated) to improve our service.
                </li>
                <li>
                  <strong>Cookies:</strong> We use cookies to store your preferences (e.g., language
                  selection, dietary restrictions) and session status.
                </li>
              </ul>

              <h3 className="text-lg font-bold text-[#314A37]">2. How We Use Your Information</h3>
              <ul className="text-gray-600 space-y-1">
                <li>To provide and maintain the Service.</li>
                <li>To customize your meal plans based on your preferences.</li>
                <li>To communicate with you regarding updates or support.</li>
              </ul>

              <h3 className="text-lg font-bold text-[#314A37]">3. Advertising (Google AdSense)</h3>
              <p className="text-gray-600 leading-relaxed">
                We use <strong>Google AdSense</strong> to display advertisements on this website.
                Google AdSense uses cookies (including the DoubleClick cookie) to serve ads based on
                your prior visits to this or other websites. You may opt out of personalised
                advertising by visiting{" "}
                <a
                  href="https://adssettings.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#78B159] hover:underline"
                >
                  Google Ads Settings
                </a>
                . For more information on how Google uses data when you visit our site, see{" "}
                <a
                  href="https://policies.google.com/technologies/partner-sites"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#78B159] hover:underline"
                >
                  Google&apos;s Privacy &amp; Terms
                </a>
                .
              </p>

              <h3 className="text-lg font-bold text-[#314A37]">4. Analytics (Google Analytics)</h3>
              <p className="text-gray-600 leading-relaxed">
                We use <strong>Google Analytics 4</strong> to collect anonymous usage statistics
                (pages visited, session duration, device type). This data helps us improve the
                service. Google Analytics uses cookies and IP anonymisation is enabled. You can
                opt out using the{" "}
                <a
                  href="https://tools.google.com/dlpage/gaoptout"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#78B159] hover:underline"
                >
                  Google Analytics Opt-out Browser Add-on
                </a>
                .
              </p>

              <h3 className="text-lg font-bold text-[#314A37]">5. Other Third-Party Services</h3>
              <p className="text-gray-600 leading-relaxed">
                We also use Supabase for authentication and database storage, and Resend for
                transactional emails. These services operate under their own privacy policies. We
                do not sell your personal data to advertisers.
              </p>

              <h3 className="text-lg font-bold text-[#314A37]">6. Data Security</h3>
              <p className="text-gray-600 leading-relaxed">
                We implement reasonable security measures to protect your data. However, no method of
                transmission over the Internet is 100% secure.
              </p>

              <h3 className="text-lg font-bold text-[#314A37]">7. Contact Us</h3>
              <p className="text-gray-600 leading-relaxed">
                If you have questions about this Privacy Policy, please contact us at{" "}
                <a href="mailto:aussielunchboxplanner@gmail.com" className="text-[#78B159] hover:underline">
                  aussielunchboxplanner@gmail.com
                </a>
                .
              </p>
            </div>
          ) : (
            <div className="prose prose-gray max-w-none">
              <h2 className="text-2xl font-bold text-[#314A37] mt-0">⚠️ Medical & Allergy Disclaimer</h2>

              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <p className="text-red-700 font-semibold text-sm">
                  Please Read Carefully: The Aussie Lunchbox Planner is a tool designed to assist with
                  meal planning and grocery organization. The content provided is for{" "}
                  <strong>informational purposes only</strong> and does not constitute medical,
                  nutritional, or professional health advice.
                </p>
              </div>

              <h3 className="text-lg font-bold text-[#314A37]">1. Not Medical Advice</h3>
              <p className="text-gray-600 leading-relaxed">
                Always consult with a qualified healthcare professional or nutritionist before making
                drastic changes to your diet, especially if you have underlying health conditions.
              </p>

              <h3 className="text-lg font-bold text-[#314A37]">2. Food Allergies & Intolerances</h3>
              <ul className="text-gray-600 space-y-2">
                <li>
                  While we provide filters for common allergens (e.g., &ldquo;Nut-free&rdquo;,
                  &ldquo;Dairy-free&rdquo;), <strong>we cannot guarantee</strong> that any recipe is
                  completely free of allergens.
                </li>
                <li>Manufacturers may change ingredient formulations at any time.</li>
                <li>
                  <strong>Check every label</strong> of the actual products you buy to ensure they are
                  safe for your specific dietary needs.
                </li>
                <li>
                  Cross-contamination can occur in your own kitchen; you are responsible for safe food
                  preparation.
                </li>
              </ul>

              <h3 className="text-lg font-bold text-[#314A37]">3. Accuracy of Information</h3>
              <ul className="text-gray-600 space-y-2">
                <li>
                  Nutritional values are automatic estimates based on generic databases and may not
                  reflect the exact nutritional content of the ingredients you use.
                </li>
                <li>
                  Price estimates are based on average supermarket prices in Australia and are
                  subject to change without notice.
                </li>
              </ul>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-6">
                <p className="text-gray-600 text-sm leading-relaxed">
                  By using this application, you acknowledge that you have read and understood this
                  disclaimer and agree to use the information at your own risk.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#314A37] text-white py-8 px-4">
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
