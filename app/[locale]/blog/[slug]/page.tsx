import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { POSTS, BLOG_CARDS } from "@/content/posts";
import { BRAND } from "@/lib/brand";
import AdUnit from "@/components/AdUnit";

const BASE_URL = BRAND.SITE_URL;
const SLOT_LEADERBOARD = process.env.NEXT_PUBLIC_ADSENSE_SLOT_LEADERBOARD ?? "";
const SLOT_RECTANGLE = process.env.NEXT_PUBLIC_ADSENSE_SLOT_RECTANGLE ?? "";

export async function generateStaticParams() {
  return Object.keys(POSTS).flatMap((slug) =>
    ["en", "ko", "zh"].map((locale) => ({ locale, slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = POSTS[slug];
  if (!post) return {};

  const canonical = `${BASE_URL}/${locale}/blog/${slug}`;

  return {
    title: `${post.title} | Aussie Lunchbox Blog`,
    description: post.excerpt,
    alternates: {
      canonical,
      languages: {
        "x-default": `${BASE_URL}/en/blog/${slug}`,
        en: `${BASE_URL}/en/blog/${slug}`,
      },
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: new Date(post.date).toISOString(),
      url: canonical,
      images: [{ url: post.image, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [post.image],
    },
  };
}

/** Renders inline markdown: **bold** and [text](url) → React elements */
function renderInline(text: string): React.ReactNode[] {
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));

    if (match[1] !== undefined) {
      parts.push(<strong key={key++}>{match[1]}</strong>);
    } else {
      parts.push(
        <a key={key++} href={match[3]} className="text-[#F5A623] underline hover:text-[#D4850A]">
          {match[2]}
        </a>
      );
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function renderBody(body: string) {
  const lines = body.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeader: string[] = [];

  function flushTable() {
    if (!tableRows.length) return;
    elements.push(
      <div key={`table-${elements.length}`} className="overflow-x-auto my-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#7B3F00] text-white">
              {tableHeader.map((h, i) => (
                <th key={i} className="px-4 py-2 text-left font-semibold">{renderInline(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2 border-b border-gray-100">
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    inTable = false;
    tableRows = [];
    tableHeader = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table detection
    if (line.startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => c.match(/^[-:]+$/))) continue; // separator row
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (line === "---") {
      elements.push(<hr key={i} className="my-8 border-gray-200" />);
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-2xl font-bold text-[#7B3F00] mt-10 mb-4">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-xl font-bold text-[#7B3F00] mt-8 mb-3">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={i} className="text-gray-600 ml-4 mb-1 leading-relaxed">
          {renderInline(line.slice(2))}
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="mb-3" />);
    } else {
      elements.push(
        <p key={i} className="text-gray-600 leading-relaxed mb-3">
          {renderInline(line)}
        </p>
      );
    }
  }
  if (inTable) flushTable();
  return elements;
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = POSTS[slug];
  if (!post) notFound();

  const author = post.author ?? "Aussie Lunchbox Team";

  // Related posts: same category first, then fill from others
  const sameCat = BLOG_CARDS.filter(p => p.category === post.category && p.slug !== slug);
  const others = BLOG_CARDS.filter(p => p.slug !== slug && p.category !== post.category);
  const relatedPosts = [...sameCat, ...others].slice(0, 3);

  const isNamedAuthor = author !== "Aussie Lunchbox Team";
  const reviewedDate = post.lastReviewed ? new Date(`1 ${post.lastReviewed}`) : null;
  const dateModified = reviewedDate && !isNaN(reviewedDate.getTime())
    ? reviewedDate.toISOString()
    : new Date(post.date).toISOString();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.image,
    datePublished: new Date(post.date).toISOString(),
    dateModified,
    author: isNamedAuthor
      ? { "@type": "Person", name: author, url: `${BASE_URL}/en/about` }
      : { "@type": "Organization", name: "Aussie Lunchbox Editorial Team", url: `${BASE_URL}/en/about` },
    publisher: {
      "@type": "Organization",
      name: "Aussie Lunchbox",
      url: BASE_URL,
      logo: { "@type": "ImageObject", url: `${BASE_URL}/favicon.ico` },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/${locale}/blog/${slug}`,
    },
  };

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Open Sans', sans-serif" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero image */}
      <div className="relative h-64 md:h-96 w-full">
        <Image src={post.image} alt={post.title} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-[#7B3F00]/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <Link
            href={`/${locale}/blog`}
            className="text-xs text-white/70 hover:text-white mb-2 transition-colors"
          >
            ← Blog
          </Link>
          <span className="bg-[#F5A623] text-xs font-semibold px-3 py-1 rounded-full mb-4">
            {post.category}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold max-w-3xl leading-tight mb-3">
            {post.title}
          </h1>
          <p className="text-sm opacity-80">
            {post.date} · {post.readTime}
          </p>
        </div>
      </div>

      {/* Ad slot: leaderboard — top of content (728×90 / 320×50 mobile) */}
      {SLOT_LEADERBOARD && (
        <div className="max-w-3xl mx-auto px-4 mt-4" aria-label="Advertisement">
          <AdUnit slot={SLOT_LEADERBOARD} format="horizontal" />
        </div>
      )}

      {/* Article */}
      <article className="max-w-3xl mx-auto bg-white rounded-3xl shadow px-8 py-10 mt-4 relative z-10">

        {/* Author byline — E-E-A-T signal */}
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-[#F5A623] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {author.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#7B3F00]">{author}</p>
            <p className="text-xs text-gray-400">{post.date} · {post.readTime}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Reviewed by the{" "}
              <Link href={`/${locale}/about`} className="text-[#F5A623] hover:underline">
                Aussie Lunchbox editorial team
              </Link>
              {" "}· Content follows{" "}
              <a href="https://www.eatforhealth.gov.au/guidelines" target="_blank" rel="noopener noreferrer" className="text-[#F5A623] hover:underline">
                Australian Dietary Guidelines
              </a>
            </p>
          </div>
          <Link
            href={`/${locale}/blog?category=${encodeURIComponent(post.category)}`}
            className="text-xs text-[#F5A623] border border-[#F5A623] rounded-full px-3 py-1 hover:bg-[#F5A623] hover:text-white transition-colors whitespace-nowrap flex-shrink-0"
          >
            {post.category}
          </Link>
        </div>

        {/* Excerpt */}
        <p className="text-lg text-gray-500 leading-relaxed mb-8 border-l-4 border-[#F5A623] pl-4">
          {post.excerpt}
        </p>

        {/* Ad slot: mid-article rectangle (336×280) */}
        {SLOT_RECTANGLE && (
          <div className="my-8" aria-label="Advertisement">
            <AdUnit slot={SLOT_RECTANGLE} format="rectangle" />
          </div>
        )}

        {/* Body */}
        <div className="prose-like">{renderBody(post.body)}</div>

        {/* E-E-A-T: editorial note */}
        <div className="mt-10 pt-6 border-t border-gray-100">
          <div className="bg-[#FFF8EE] rounded-2xl p-5">
            <p className="text-xs font-semibold text-[#7B3F00] uppercase tracking-wide mb-2">About this article</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              This article was written and reviewed by the Aussie Lunchbox editorial team — parents, home cooks, and nutrition-conscious writers based in Australia. We aim to provide practical, evidence-based lunchbox guidance aligned with the{" "}
              <a href="https://www.eatforhealth.gov.au/guidelines" target="_blank" rel="noopener noreferrer" className="text-[#F5A623] hover:underline">
                Australian Dietary Guidelines
              </a>
              . If you spot an error or have a suggestion, please{" "}
              <Link href={`/${locale}/contact`} className="text-[#F5A623] hover:underline">
                contact us
              </Link>
              .
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-gray-400">
              <span>Published: {post.date}</span>
              <Link href={`/${locale}/about`} className="text-[#F5A623] hover:underline">Editorial standards →</Link>
              <Link href={`/${locale}/policies`} className="text-[#F5A623] hover:underline">Privacy & disclaimer →</Link>
            </div>
          </div>
        </div>

      </article>

      {/* Ad slot: after-article rectangle (336×280) */}
      {SLOT_RECTANGLE && (
        <div className="max-w-3xl mx-auto px-4 my-8" aria-label="Advertisement">
          <AdUnit slot={SLOT_RECTANGLE} format="rectangle" />
        </div>
      )}

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-bold text-[#7B3F00] mb-6">
            More {post.category} articles
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPosts.map((related) => (
              <Link
                key={related.slug}
                href={`/${locale}/blog/${related.slug}`}
                className="bg-[#FFF8EE] rounded-3xl overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="relative h-36 overflow-hidden">
                  <Image
                    src={related.image}
                    alt={related.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 left-2 bg-[#F5A623] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    {related.category}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-400 mb-1">{related.date}</p>
                  <h3 className="text-sm font-bold text-[#7B3F00] leading-snug group-hover:text-[#F5A623] transition-colors line-clamp-2">
                    {related.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA + internal links */}
      <section className="bg-[#7B3F00] py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-extrabold text-white mb-3">
            Ready to plan your week?
          </h2>
          <p className="text-white/80 mb-8">
            Use our free planner to generate a personalised week of healthy Australian school lunches in seconds.
          </p>
          <Link
            href={`/${locale}/planner`}
            className="inline-block bg-[#F5A623] hover:bg-white hover:text-[#7B3F00] text-white font-bold px-10 py-4 rounded-full transition-colors shadow-lg mb-8"
          >
            Try the Planner →
          </Link>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/70">
            <Link href={`/${locale}/blog`} className="hover:text-white transition-colors">← All articles</Link>
            <Link href={`/${locale}/faq`} className="hover:text-white transition-colors">FAQs</Link>
            <Link href={`/${locale}/about`} className="hover:text-white transition-colors">About us</Link>
            <Link href={`/${locale}/contact`} className="hover:text-white transition-colors">Contact</Link>
          </div>
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
