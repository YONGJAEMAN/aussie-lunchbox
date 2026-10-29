/**
 * 글·가이드의 「마지막 수정 시각」 — 사이트맵 `lastmod`와 페이지 JSON-LD `dateModified`가 이 값 하나를 쓴다.
 *
 * 🔴 2026-09-28: 둘이 따로 계산하고 있었다. 사이트맵은 `contentUpdated`를 보고 JSON-LD는 `lastReviewed`만 봐서
 *    같은 글이 두 날짜를 말했다. 게다가 9월에 고친 글 대부분이 두 필드를 안 올려 구글에는 「7월 이후 안 바뀜」으로
 *    신고되고 있었다 — GSC에서 색인을 거부당한 글 9편의 마지막 크롤이 전부 4~7월이었다.
 *
 * `lastReviewed`는 화면용 월 단위("July 2026")라 파싱하면 그 달 1일이 된다. 그래서 실제 수정일
 * `contentUpdated`(YYYY-MM-DD)를 함께 보고, 발행일보다 앞서지 않게 발행일을 바닥으로 둔다(schema 위반 방지).
 */
export interface Dated {
  date: string;
  lastReviewed?: string;
  contentUpdated?: string;
}

const time = (d: Date | null): number => (d && !isNaN(d.getTime()) ? d.getTime() : 0);

export function lastModified(item: Dated): Date {
  return new Date(
    Math.max(
      time(new Date(item.date)),
      time(item.contentUpdated ? new Date(item.contentUpdated) : null),
      time(item.lastReviewed ? new Date(`1 ${item.lastReviewed}`) : null),
    ),
  );
}
