"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function PoliciesPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "en";
  const [tab, setTab] = useState<"privacy" | "disclaimer">("privacy");

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#FFF8EE] pt-24 pb-16 px-4 text-center">
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest mb-4">Legal</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          Privacy Policy & Disclaimer
        </h1>
        <p className="text-gray-500 text-lg">Your trust and safety are our top priorities.</p>
      </section>

      <section className="max-w-3xl mx-auto py-20 px-4">
        {/* Tabs */}
        <div className="flex rounded-2xl overflow-hidden border border-orange-100 mb-8 bg-[#FFF8EE]">
          <button
            onClick={() => setTab("privacy")}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors rounded-l-2xl ${
              tab === "privacy" ? "bg-[#7B3F00] text-white" : "text-gray-500 hover:bg-orange-50"
            }`}
          >
            🔒 Privacy Policy
          </button>
          <button
            onClick={() => setTab("disclaimer")}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors rounded-r-2xl ${
              tab === "disclaimer" ? "bg-[#7B3F00] text-white" : "text-gray-500 hover:bg-orange-50"
            }`}
          >
            ⚠️ Disclaimer
          </button>
        </div>

        <div className="bg-[#FFF8EE] rounded-3xl p-10">
          {tab === "privacy" ? (
            <div className="prose prose-gray max-w-none">
              <h2 className="text-2xl font-bold text-[#1a1a1a] mt-0">Privacy Policy</h2>
              <p className="text-sm text-gray-400 mb-6">Effective Date: February 11, 2026</p>
              <p className="text-gray-600 leading-relaxed">
                At <strong>Aussie Lunchbox Planner</strong>, we are committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, and safeguard your information.
              </p>

              <h3 className="text-lg font-bold text-[#1a1a1a]">1. Information We Collect</h3>
              <ul className="text-gray-600 space-y-2">
                <li><strong>Personal Information:</strong> When you sign up, we may collect your name and email address.</li>
                <li><strong>Usage Data:</strong> We may collect anonymous data on how you use the app (e.g., recipes viewed, plans generated) to improve our service.</li>
                <li><strong>Cookies:</strong> We use cookies to store your preferences (e.g., language selection, dietary restrictions) and session status.</li>
              </ul>

              <h3 className="text-lg font-bold text-[#1a1a1a]">2. How We Use Your Information</h3>
              <ul className="text-gray-600 space-y-1">
                <li>To provide and maintain the Service.</li>
                <li>To customize your meal plans based on your preferences.</li>
                <li>To communicate with you regarding updates or support.</li>
              </ul>

              <h3 className="text-lg font-bold text-[#1a1a1a]">3. Advertising (Google AdSense)</h3>
              <p className="text-gray-600 leading-relaxed">
                We use <strong>Google AdSense</strong> to display advertisements on this website. You may opt out of personalised advertising by visiting{" "}
                <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-[#F5A623] hover:underline">Google Ads Settings</a>. For more information, see{" "}
                <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" className="text-[#F5A623] hover:underline">Google&apos;s Privacy &amp; Terms</a>.
              </p>

              <h3 className="text-lg font-bold text-[#1a1a1a]">4. Analytics (Google Analytics)</h3>
              <p className="text-gray-600 leading-relaxed">
                We use <strong>Google Analytics 4</strong> to collect anonymous usage statistics. You can opt out using the{" "}
                <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-[#F5A623] hover:underline">Google Analytics Opt-out Browser Add-on</a>.
              </p>

              <h3 className="text-lg font-bold text-[#1a1a1a]">5. Other Third-Party Services</h3>
              <p className="text-gray-600 leading-relaxed">
                We also use Supabase for authentication and database storage, and Resend for transactional emails. We do not sell your personal data to advertisers.
              </p>

              <h3 className="text-lg font-bold text-[#1a1a1a]">6. Data Security</h3>
              <p className="text-gray-600 leading-relaxed">We implement reasonable security measures to protect your data. However, no method of transmission over the Internet is 100% secure.</p>

              <h3 className="text-lg font-bold text-[#1a1a1a]">7. Contact Us</h3>
              <p className="text-gray-600 leading-relaxed">
                If you have questions, please contact us at{" "}
                <a href="mailto:aussielunchboxplanner@gmail.com" className="text-[#F5A623] hover:underline">aussielunchboxplanner@gmail.com</a>.
              </p>
            </div>
          ) : (
            <div className="prose prose-gray max-w-none">
              <h2 className="text-2xl font-bold text-[#1a1a1a] mt-0">⚠️ Medical & Allergy Disclaimer</h2>

              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                <p className="text-red-700 font-semibold text-sm">
                  Please Read Carefully: The Aussie Lunchbox Planner is a tool designed to assist with meal planning. The content is for <strong>informational purposes only</strong> and does not constitute medical, nutritional, or professional health advice.
                </p>
              </div>

              <h3 className="text-lg font-bold text-[#1a1a1a]">1. Not Medical Advice</h3>
              <p className="text-gray-600 leading-relaxed">Always consult with a qualified healthcare professional or nutritionist before making drastic changes to your diet, especially if you have underlying health conditions.</p>

              <h3 className="text-lg font-bold text-[#1a1a1a]">2. Food Allergies & Intolerances</h3>
              <ul className="text-gray-600 space-y-2">
                <li>While we provide filters for common allergens, <strong>we cannot guarantee</strong> that any recipe is completely free of allergens.</li>
                <li>Manufacturers may change ingredient formulations at any time.</li>
                <li><strong>Check every label</strong> of the actual products you buy to ensure they are safe for your specific dietary needs.</li>
                <li>Cross-contamination can occur in your own kitchen; you are responsible for safe food preparation.</li>
              </ul>

              <h3 className="text-lg font-bold text-[#1a1a1a]">3. Accuracy of Information</h3>
              <ul className="text-gray-600 space-y-2">
                <li>Nutritional values are automatic estimates and may not reflect the exact nutritional content of the ingredients you use.</li>
                <li>Price estimates are based on average supermarket prices in Australia and are subject to change without notice.</li>
              </ul>

              <div className="bg-white border border-gray-200 rounded-2xl p-4 mt-6">
                <p className="text-gray-600 text-sm leading-relaxed">
                  By using this application, you acknowledge that you have read and understood this disclaimer and agree to use the information at your own risk.
                </p>
              </div>
            </div>
          )}
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
