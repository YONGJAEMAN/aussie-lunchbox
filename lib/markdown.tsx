import React from "react";

/**
 * 글 본문(마크다운 부분집합) 렌더러.
 *
 * 🔴 이 파일이 생긴 이유 (2026-08-17):
 * 똑같은 렌더러가 `app/[locale]/blog/[slug]/page.tsx`와 `app/[locale]/guides/[slug]/page.tsx`에
 * **116줄씩 바이트 단위로 동일하게** 복붙돼 있었다. 이 저장소가 반복해서 밟은 함정이
 * "같은 일을 하는 자리가 둘 이상이면 하나만 고치게 된다"인데, 여기가 정확히 그 자리였다.
 *
 * 🔴 실제로 그 상태에서 고장이 하나 살아 있었다 — 불릿을 `<li>`로 내면서
 * **`<ul>`로 감싸지 않았다.** 유효하지 않은 HTML이고, 스크린리더가 "목록, 항목 4개"를
 * 읽지 못한다. Lighthouse 접근성 `listitem` 실패로 잡혔다(블로그 글 89점).
 * 본문의 불릿 묶음은 273개, 그 전부가 이 상태였다.
 *
 * 불릿 묶음 안에 빈 줄이 들어간 사례는 **0건**이라(전수 확인) 규칙은 단순하다:
 * **연속한 `- ` 줄 = 목록 하나.** 빈 줄이나 다른 줄이 나오면 목록이 끝난다.
 */

/**
 * 인라인 마크다운: `**굵게**`, `*기울임*`, `[텍스트](url)`
 *
 * 🔴 2026-08-23: `*기울임*`이 **빠져 있었다.** 본문 71곳이 별표를 그대로 화면에
 *    내보내고 있었고("*balanced sounds expensive*"), 테스트는 전부 통과하고 있었다.
 *    렌더러가 모르는 문법은 조용히 원문으로 새어 나간다 — messages/*.json의 마크다운이
 *    대괄호째 렌더되던 것(08-22)과 같은 고장이다.
 *
 * 🔴 `**굵게**`를 **먼저** 시도해야 한다. 기울임 대안이 앞에 오면 `**a**`가
 *    `*` + `*a*` + `*`로 쪼개진다. 정규식 대안은 왼쪽부터 시도된다.
 */
export function renderInline(text: string): React.ReactNode[] {
  // 🔴 굵게 안에 기울임이 들어간다(`**a *b* c**`). `[^*]+`로 잡으면 그 문단이 통째로
  //    깨지므로 **비탐욕 매칭**으로 받고 안쪽은 재귀로 렌더한다.
  const pattern = /\*\*([\s\S]+?)\*\*|\*([^*\n]+)\*|\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));

    if (match[1] !== undefined) {
      parts.push(<strong key={key++}>{renderInline(match[1])}</strong>);
    } else if (match[2] !== undefined) {
      parts.push(<em key={key++}>{renderInline(match[2])}</em>);
    } else {
      const linkHref = /^(https?:|mailto:|\/|#)/i.test(match[4].trim()) ? match[4] : "#";
      parts.push(
        <a key={key++} href={linkHref} className="text-[#366A1B] underline hover:text-[#24470F]">
          {renderInline(match[3])}
        </a>
      );
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function renderBody(body: string) {
  const lines = body.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeader: string[] = [];
  /** 연속한 `- ` 줄을 모아 뒀다가 목록이 끝날 때 한 번에 `<ul>`로 낸다. */
  let listBuffer: { key: number; text: string }[] = [];
  /**
   * 연속한 산문 줄을 모아 **문단 하나**로 낸다.
   *
   * 🔴 2026-08-23: 한 줄 = 한 `<p>`였다. 본문 9편이 문단을 하드랩으로 접어 놨기 때문에
   *    (61군데) 문장 중간에서 문단이 갈라져 나가고 있었고, 줄을 걸친 `**굵게**`는
   *    양쪽 어느 줄에서도 매칭이 안 돼 별표가 그대로 화면에 남았다.
   *    마크다운의 규칙대로 **빈 줄에서만** 문단을 끊는다.
   */
  let paraBuffer: string[] = [];
  let paraKey = -1;

  /**
   * 연속한 `> ` 줄 = 인용 블록 하나.
   *
   * 🔴 2026-08-23: 인용 블록을 렌더러가 몰라서 **`>`가 화면에 그대로 나갔다.**
   *    본문 14편 58줄이 그 상태였고, 하필 이 사이트에서 가장 무게 있는 문단들이다 —
   *    가격 출처 고지, 공개 정정문, 식품안전 주의. `*기울임*`과 같은 고장이다.
   */
  let quoteBuffer: string[] = [];
  let quoteKey = -1;

  function flushQuote() {
    if (!quoteBuffer.length) return;
    const text = quoteBuffer.join(" ");
    const key = quoteKey;
    quoteBuffer = [];
    elements.push(
      <blockquote
        key={`q-${key}`}
        className="border-l-4 border-[#78B159] bg-[#F7F9FC] rounded-r-lg pl-4 pr-4 py-3 my-6 text-gray-700 leading-relaxed"
      >
        {renderInline(text)}
      </blockquote>
    );
  }

  function flushParagraph() {
    if (!paraBuffer.length) return;
    const text = paraBuffer.join(" ");
    const key = paraKey;
    paraBuffer = [];
    elements.push(
      <p key={`p-${key}`} className="text-gray-600 leading-relaxed mb-3">
        {renderInline(text)}
      </p>
    );
  }

  function flushList() {
    if (!listBuffer.length) return;
    const items = listBuffer;
    listBuffer = [];
    elements.push(
      <ul key={`ul-${items[0].key}`}>
        {items.map((it) => (
          <li key={it.key} className="text-gray-600 ml-4 mb-1 leading-relaxed">
            {renderInline(it.text)}
          </li>
        ))}
      </ul>
    );
  }

  function flushTable() {
    if (!tableRows.length) return;
    elements.push(
      <div key={`table-${elements.length}`} className="overflow-x-auto my-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#314A37] text-white">
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
      flushQuote();
      flushParagraph();
      flushList();
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

    if (line.startsWith("- ")) {
      flushQuote();
      flushParagraph();
      listBuffer.push({ key: i, text: line.slice(2) });
      continue;
    }
    flushList();

    // 🔴 `>` 한 글자만 있는 줄이 인용 안의 문단 구분이다. `"> "`만 보면
    //    그 줄이 인용 밖으로 떨어져 `>`가 화면에 그대로 남는다(실제로 그랬다).
    if (line === ">" || line.startsWith("> ")) {
      flushParagraph();
      if (quoteBuffer.length === 0) quoteKey = i;
      quoteBuffer.push(line === ">" ? "" : line.slice(2));
      continue;
    }
    flushQuote();

    if (line === "---") {
      flushParagraph();
      elements.push(<hr key={i} className="my-8 border-gray-200" />);
    } else if (line.startsWith("## ")) {
      flushParagraph();
      elements.push(
        <h2 key={i} className="text-2xl font-bold text-[#314A37] mt-10 mb-4">
          {renderInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      flushParagraph();
      elements.push(
        <h3 key={i} className="text-xl font-bold text-[#314A37] mt-8 mb-3">
          {renderInline(line.slice(4))}
        </h3>
      );
    } else if (line.trim() === "") {
      flushParagraph();
      elements.push(<div key={i} className="mb-3" />);
    } else {
      // 문단은 **빈 줄에서** 끝난다 — 줄바꿈 하나는 같은 문단의 이어짐이다.
      if (paraBuffer.length === 0) paraKey = i;
      paraBuffer.push(line);
    }
  }
  flushParagraph();
  flushQuote();
  flushList();
  if (inTable) flushTable();
  return elements;
}
