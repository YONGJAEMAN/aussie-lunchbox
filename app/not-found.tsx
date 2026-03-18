import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found | Aussie Lunchbox",
  description: "The page you were looking for doesn't exist. Return to the Aussie Lunchbox homepage.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#FDFAF2] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-8xl mb-6">🦘</div>
      <h1 className="text-4xl font-bold text-[#7B3F00] mb-3">Page not found</h1>
      <p className="text-gray-500 max-w-md mb-8 leading-relaxed">
        This page doesn&apos;t exist. It may have been moved or the link might be incorrect.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/en"
          className="bg-[#F5A623] hover:bg-[#7B3F00] text-white font-bold py-3 px-8 rounded-full transition-colors"
        >
          Go to Homepage
        </Link>
        <Link
          href="/en/planner"
          className="border border-[#F5A623] text-[#7B3F00] hover:bg-[#F5A623] hover:text-white font-bold py-3 px-8 rounded-full transition-colors"
        >
          Open Planner
        </Link>
        <Link
          href="/en/blog"
          className="border border-gray-200 text-gray-500 hover:border-[#F5A623] hover:text-[#7B3F00] font-bold py-3 px-8 rounded-full transition-colors"
        >
          Browse Articles
        </Link>
      </div>
    </main>
  );
}
