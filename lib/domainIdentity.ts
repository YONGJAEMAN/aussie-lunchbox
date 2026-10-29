/**
 * 학교 도메인 정체성 — 아웃리치 재발송을 막는 자리.
 *
 * 🔴 2026-09-08: 문자열 일치로만 대조해서 **같은 학교에 두 번 보냈다.**
 *
 *      07-29  papakura-central.school.nz
 *      08-13  papakuracentral.school.nz     ← 하이픈만 다르다
 *      둘 다 School_Id 1421 · Papakura Central School
 *
 *    메일 본문이 "That's the only ask, and I won't follow up"이라고 약속한다.
 *    이 약속이 이 아웃리치가 스팸으로 안 읽히는 이유라, 어기면 잃는 게 크다.
 *
 * ⚠️ 정규화는 **의심 후보를 좁히는 도구일 뿐**이다. 최종 판정은 CKAN School_Id로 한다.
 *    이름이 같아도 다른 학교인 경우가 훨씬 많다 — 실측 12쌍 중 11쌍이 별개였다:
 *      freyberg.ac.nz  = Freyberg High (Palmerston North)
 *      freyberg.school.nz = Freyberg Community (Auckland)
 *      sjr.nz          = St Joseph's (Rangiora)
 *      sjr.school.nz   = St John's (Ranfurly)      ← 이름조차 다르다
 *    St Anne's는 Wellington·Christchurch·Whanganui 세 곳이 각각 다른 학교다.
 */

/** 학교 도메인에서 접미사와 구분기호를 벗긴 핵심 이름. 비교 전용이다. */
export function schoolDomainCore(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .replace(/\.(school|ac|co|org|kiwi|maori)\.nz$/, "")
    .replace(/\.(nz|com|net|org)$/, "")
    .replace(/[^a-z0-9]/g, "");   // 하이픈·점을 없앤다 — papakura-central = papakuracentral
}

/**
 * 핵심 이름이 겹치는 도메인 묶음. **이것만으로 중복이라 단정하지 말 것** —
 * 반드시 School_Id로 확인한다.
 */
export function collidingDomains(domains: string[]): Map<string, string[]> {
  const by = new Map<string, string[]>();
  for (const d of domains) {
    const k = schoolDomainCore(d);
    if (!k) continue;
    by.set(k, [...(by.get(k) ?? []), d]);
  }
  return new Map([...by].filter(([, v]) => new Set(v).size > 1));
}

/**
 * 후보를 기발송 명단과 대조한다.
 * - `exact`  : 도메인이 그대로 같다 (기존 검사)
 * - `collide`: 핵심 이름이 같다 — **School_Id로 확인이 필요한 것들**
 */
export function screenCandidates(
  candidates: string[],
  alreadySent: string[],
): { exact: string[]; collide: Array<{ candidate: string; sent: string[] }> } {
  const sentSet = new Set(alreadySent.map((d) => d.trim().toLowerCase()));
  const sentByCore = new Map<string, string[]>();
  for (const d of alreadySent) {
    const k = schoolDomainCore(d);
    sentByCore.set(k, [...(sentByCore.get(k) ?? []), d]);
  }
  const exact: string[] = [];
  const collide: Array<{ candidate: string; sent: string[] }> = [];
  for (const c of candidates) {
    const lc = c.trim().toLowerCase();
    if (sentSet.has(lc)) { exact.push(c); continue; }
    const hit = sentByCore.get(schoolDomainCore(c));
    if (hit?.length) collide.push({ candidate: c, sent: hit });
  }
  return { exact, collide };
}
