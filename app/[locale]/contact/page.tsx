"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ContactPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "en";

  const [form, setForm] = useState({ name: "", email: "", subject: "General Inquiry", message: "" });
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setStatus("error");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setStatus("success");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#FFF8EE] pt-24 pb-16 px-4 text-center">
        <p className="text-[#F5A623] font-semibold text-sm uppercase tracking-widest mb-4">Get In Touch</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] mb-4 max-w-2xl mx-auto leading-tight">
          Contact Aussie Lunchbox
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
          We&apos;d love to hear from you! Whether you have a question, feedback, or a partnership inquiry.
        </p>
      </section>

      {/* Content */}
      <section className="max-w-5xl mx-auto py-20 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Left: contact info */}
          <div>
            <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-4">Get in Touch</h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              If you have any questions about our meal plans, recipes, or how to use the planner, please drop us a message.
            </p>
            <div className="space-y-4 text-gray-700 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF8EE] flex items-center justify-center text-lg">✉️</div>
                <span className="text-sm">aussielunchboxplanner@gmail.com</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF8EE] flex items-center justify-center text-lg">📍</div>
                <span className="text-sm">Sydney, Australia</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF8EE] flex items-center justify-center text-lg">🕐</div>
                <span className="text-sm">Mon–Fri, 9am–5pm AEST</span>
              </div>
            </div>
            <div className="bg-[#FFF8EE] rounded-3xl p-5 text-gray-600 text-sm leading-relaxed">
              💡 For technical support, please include your browser version and a screenshot if possible.
            </div>
          </div>

          {/* Right: contact form */}
          <div className="bg-[#FFF8EE] rounded-3xl p-8">
            <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-6">Send us a Message</h2>
            {status === "success" ? (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-3xl p-8 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-semibold text-lg">Message sent!</p>
                <p className="text-sm mt-1">Thank you! We&apos;ll get back to you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-orange-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors bg-white"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Your Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-orange-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors bg-white"
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Subject</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full border border-orange-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors bg-white"
                  >
                    <option>General Inquiry</option>
                    <option>Technical Support</option>
                    <option>Feedback / Feature Request</option>
                    <option>Partnership</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Message *</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={5}
                    className="w-full border border-orange-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors resize-none bg-white"
                    placeholder="Tell us how we can help..."
                  />
                </div>
                {status === "error" && (
                  <p className="text-red-500 text-sm">Please fill in all required fields.</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#7B3F00] hover:bg-[#F5A623] text-white font-bold py-3 rounded-full transition-colors disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Editorial Corrections */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-sm text-amber-800">
          <strong>Editorial Corrections:</strong> Found an error in one of our articles? We review corrections within 48 hours. Please include the article title and the specific issue when contacting us.
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
