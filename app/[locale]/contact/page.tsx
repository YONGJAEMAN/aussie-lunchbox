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
    // Simulate sending (no backend endpoint for contact form yet)
    await new Promise((r) => setTimeout(r, 800));
    setStatus("success");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#FDFAF2]">
      {/* Hero */}
      <section className="text-white text-center py-16 px-4" style={{ background: "linear-gradient(135deg, #7B3F00 0%, #F5A623 100%)" }}>
        <h1 className="text-4xl font-bold mb-3">📬 Contact Aussie Lunchbox</h1>
        <p className="text-lg opacity-90 max-w-xl mx-auto">
          We&apos;d love to hear from you! Whether you have a question, feedback, or a partnership inquiry.
        </p>
      </section>

      {/* Content */}
      <section className="max-w-5xl mx-auto py-16 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Left: contact info */}
          <div>
            <h2 className="text-2xl font-bold text-[#7B3F00] mb-4">Get in Touch</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              If you have any questions about our meal plans, recipes, or how to use the planner,
              please drop us a message.
            </p>
            <div className="space-y-3 text-gray-700 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-xl">✉️</span>
                <span>aussielunchboxplanner@gmail.com</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">📍</span>
                <span>Sydney, Australia</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">🕐</span>
                <span>Mon–Fri, 9am–5pm NZT</span>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 text-sm">
              💡 For technical support, please include your browser version and a screenshot if possible.
            </div>
          </div>

          {/* Right: contact form */}
          <div className="bg-white rounded-2xl shadow p-8">
            <h2 className="text-2xl font-bold text-[#7B3F00] mb-6">Send us a Message</h2>
            {status === "success" ? (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-semibold text-lg">Message sent!</p>
                <p className="text-sm mt-1">Thank you! We&apos;ll get back to you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors"
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors bg-white"
                  >
                    <option>General Inquiry</option>
                    <option>Technical Support</option>
                    <option>Feedback / Feature Request</option>
                    <option>Partnership</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={5}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F5A623] transition-colors resize-none"
                    placeholder="Tell us how we can help..."
                  />
                </div>
                {status === "error" && (
                  <p className="text-red-500 text-sm">Please fill in all required fields.</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#F5A623] hover:bg-[#7B3F00] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </form>
            )}
          </div>
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
