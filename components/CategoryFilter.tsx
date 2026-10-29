"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Card = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  image: string;
  category: string;
};

/**
 * 카테고리 칩 + 카드 그리드.
 *
 * 🔴 2026-08-17 이전에는 칩이 `<span cursor-default select-none>`이었다.
 * 알약 모양에 "All"만 초록으로 칠해 놔서 **필터처럼 보이는데 아무 동작도 안 했다.**
 *
 * 🔴 칩 목록이 하드코딩이라 데이터와 어긋나 있었다 — `Meal Prep` 칩은 해당 글이 0편,
 * `Price Index`·`Food Safety`·`Routines`는 글이 있는데 칩이 없었다.
 * 그래서 목록을 받지 않고 **항목에서 직접 뽑는다.**
 *
 * 🔴 **카드 마크업을 이 컴포넌트가 직접 갖는다. 함수 children 으로 받지 말 것.**
 * 처음엔 `children: (visible) => ReactNode` 렌더프롭으로 짰는데, 클라이언트 컴포넌트에
 * 함수를 넘기면 직렬화가 안 돼 **SSR이 통째로 건너뛴다.** 배포해서 확인하니 서버 HTML에
 * `<button>`이 0개였고 **블로그 카드도 초기 HTML에서 사라져 있었다.**
 * 이 사이트는 색인이 최대 현안이라 정반대 방향이다. 자체 완결형이어야 SSR 된다.
 */
export default function CategoryFilter({
  items,
  allLabel,
  basePath,
}: {
  items: Card[];
  allLabel: string;
  /** 예: "/en/blog" — 카드 링크 접두사 */
  basePath: string;
}) {
  const [active, setActive] = useState<string | null>(null);

  // 등장 순서를 유지한다 — 알파벳순으로 섞으면 편집 의도가 사라진다.
  const categories = [...new Set(items.map((i) => i.category))];
  const visible = active ? items.filter((i) => i.category === active) : items;

  return (
    <>
      <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto px-4">
        {[null, ...categories].map((c) => {
          const label = c ?? allLabel;
          const selected = active === c;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setActive(c)}
              aria-pressed={selected}
              className={`px-4 min-h-touch inline-flex items-center rounded-full text-sm font-medium transition-colors ${
                selected
                  ? "bg-[#8C4A00] text-white"
                  : "bg-white text-[#8C4A00] border border-gray-200 hover:border-[#F5A623] hover:bg-[#FFF7EC]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <Link
              key={item.slug}
              href={`${basePath}/${item.slug}`}
              className="bg-[#F7F9FC] rounded-3xl overflow-hidden hover:shadow-lg transition-shadow group"
            >
              <div className="relative h-48 overflow-hidden rounded-t-3xl">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 bg-[#8C4A00] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {item.category}
                </span>
              </div>
              <div className="p-6">
                <p className="text-xs text-gray-500 mb-2">
                  {item.date} · {item.readTime}
                </p>
                <h2 className="text-lg font-bold text-[#1a1a1a] mb-2 leading-snug group-hover:text-[#8C4A00] transition-colors">
                  {item.title}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                  {item.excerpt}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
