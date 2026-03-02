import Link from "next/link";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us - Aussie Lunchbox",
  description: "Making school lunches easier, healthier, and stress-free for Australian families.",
};

export default async function AboutPage() {
  const locale = await getLocale();

  return (
    <main className="min-h-screen bg-[#F5F7FA]">
      {/* Hero */}
      <section className="text-white text-center py-16 px-4" style={{ background: "linear-gradient(135deg, #314A37 0%, #78B159 100%)" }}>
        <h1 className="text-4xl font-bold mb-3">🥝 About Aussie Lunchbox</h1>
        <p className="text-lg opacity-90 max-w-xl mx-auto">
          Making school lunches easier, healthier, and stress-free for Australian families.
        </p>
      </section>

      {/* Mission Section */}
      <section className="max-w-5xl mx-auto py-16 px-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
          <div className="md:col-span-3 bg-white rounded-2xl shadow p-8">
            <h2 className="text-2xl font-bold text-[#78B159] mb-4">👋 Kia Ora!</h2>
            <p className="text-gray-700 text-lg leading-relaxed mb-4">
              Welcome to <strong>Aussie Lunchbox Planner</strong>, your trusted partner in simplifying
              school mornings for Australia families.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              We understand the daily challenge of packing lunchboxes that are nutritious, affordable,
              and actually eaten by kids. Our mission is to empower parents with automated, balanced
              meal plans that reduce decision fatigue and food waste.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Founded by a team of parents and tech enthusiasts in Sydney, we combine local
              supermarket data with kid-approved recipes to bring you a seamless planning experience.
            </p>
          </div>
          <div className="md:col-span-2">
            <img
              src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop"
              alt="Fresh, Local Ingredients"
              className="rounded-2xl shadow-lg w-full object-cover"
            />
            <p className="text-center text-sm text-gray-400 mt-2">Fresh, Local Ingredients</p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#314A37] mb-12">Why Choose Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "🚀",
                title: "Streamlined Mornings",
                desc: "Generate a complete weekly plan in seconds. Say goodbye to the morning rush and hello to organized, stress-free starts to your day.",
              },
              {
                icon: "🌿",
                title: "Sustainable & Local",
                desc: "We prioritize seasonal ingredients accessible in Australian supermarkets to help you reduce food miles and minimize waste.",
              },
              {
                icon: "🥗",
                title: "Nutritionally Balanced",
                desc: "Our algorithms ensure a mix of protein, fresh produce, and treats, aligned with Ministry of Health guidelines for active kids.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-[#F5F7FA] rounded-2xl p-8 text-center hover:-translate-y-1 transition-transform"
              >
                <div className="text-5xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-[#314A37] text-xl mb-3">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community CTA */}
      <section className="py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-[#314A37] mb-4">Join Our Community</h3>
          <p className="text-gray-600 mb-8 leading-relaxed">
            We are constantly improving based on your feedback. Together, let&apos;s make healthy
            eating the easy choice for our tamariki.
          </p>
          <Link
            href={`/${locale}/planner`}
            className="bg-[#78B159] hover:bg-[#314A37] text-white font-bold py-4 px-10 rounded-full text-lg transition-colors shadow-lg inline-block"
          >
            Start Planning Now
          </Link>
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
