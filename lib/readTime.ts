/**
 * 읽기 시간을 **본문에서** 만든다.
 *
 * 🔴 2026-08-23: 25편 중 10편이 어긋나 있었다. 가이드 7편은 실제의 1.6~2배로 부풀려져
 * 있었고(2,346단어 글이 "20 min read"), 반대로 블로그 3편은 모자랐다 — gluten-free는
 * 3,900단어인데 "13 min read"였다. 그중 둘은 이 세션에 내가 본문을 늘린 글이다.
 *
 * 저장소에 이미 같은 전례가 적혀 있었다: "분량을 바꾸면 「N분 읽기」가 거짓말이 된다 —
 * 두 배로 늘렸는데 「5분」이 두 곳에 남아 있었다." 손으로 적는 한 반드시 다시 어긋난다.
 *
 * `body`는 템플릿 리터럴이라 이 함수가 볼 때는 `${...}` 보간이 **이미 평가된 뒤**다.
 * 즉 화면에 나가는 분량과 같은 것을 센다.
 */
const WPM = 200;

export function wordCount(body: string): number {
  const t = body
    .replace(/```[\s\S]*?```/g, " ")        // 코드 블록
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")  // 이미지
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 링크는 텍스트만
    .replace(/[|>#*_`~-]+/g, " ");           // 마크다운 기호·표 구분자
  return (t.match(/[A-Za-z0-9'’]+/g) ?? []).length;
}

export function readTimeFor(body: string): string {
  return `${Math.max(1, Math.round(wordCount(body) / WPM))} min read`;
}

/** 항목 묶음에 읽기 시간을 채워 넣는다. 손으로 적힌 값이 있어도 **덮어쓴다**. */
export function withReadTime<T extends { body: string }>(
  entries: Record<string, T>,
): Record<string, T & { readTime: string }> {
  return Object.fromEntries(
    Object.entries(entries).map(([k, v]) => [k, { ...v, readTime: readTimeFor(v.body) }]),
  ) as Record<string, T & { readTime: string }>;
}
