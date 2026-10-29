# 플래너 유지 콘텐츠 확충 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 플래너 결과 화면에서 사용자가 켠 필터에 맞는 글로 나가는 길을 내고, 대응 글이 없는 필터 네 개에 글을 쓴다.

**Architecture:** 필터→글 매핑을 UI에서 분리해 `lib/relatedPosts.ts`에 둔다. `PlannerClient`는 매핑 결과를 렌더만 한다. 글 본문의 모든 개수는 `lib/siteCounts.ts`를 거치고, 메뉴 이름은 `data/menuData.json`에서 읽는다. 매핑 테이블은 필터 값 10개를 **전부** 다루며, 글이 없는 값은 사유를 적어 남긴다.

**Tech Stack:** Next.js 16.1.6 App Router · TypeScript · Tailwind · next-intl (en/ko/zh) · Vitest

## Global Constraints

- 본문·화면의 **개수를 손으로 적지 않는다.**
  - 🔴 **글 본문(`content/*.ts`)에서는 `@/lib/menuCounts`를 쓴다. `@/lib/siteCounts`가 아니다.**
    `siteCounts`는 `POST_COUNT`를 위해 `content/posts`를 import하므로 순환이 되고,
    `content/posts.ts`를 먼저 로드하는 순간 `siteCounts.ts:46`에서 터진다(2026-08-20 실측).
    Task 3.5에서 메뉴 파생분을 `lib/menuCounts.ts`로 분리했다. 화면(서버 컴포넌트)은
    기존대로 `siteCounts`를 써도 된다 — re-export되어 값은 같다.
- 새 UI 문자열은 `messages/en.json` · `ko.json` · `zh.json` **셋 다**에 넣는다 (현재 각 532키).
- **새 가드는 반드시 돌연변이 테스트로 발화를 확인**한 뒤 되돌린다. 확인 안 된 가드는 알리바이다.
- 되돌릴 때 `git checkout -- <file>`을 쓰지 않는다 (미커밋 작업이 날아간다). 편집으로 되돌린다.
- 생성 이미지에 **촬영·실사진 문구를 붙이지 않는다.**
- 출처 없는 비교 퍼센트를 쓰지 않는다. 우리 데이터로 잴 수 있으면 잰 값과 날짜를 쓰고, 못 재면 뺀다.
- 메뉴 94개 개별 페이지, 주간 자동 생성 글, 주간 계획 저장 기능은 **범위 밖**이다.
- 각 태스크 끝에서 `npm test` 전체가 통과해야 한다.
- 🔴 **테스트 기대값은 절대 총계로 적지 않는다 — 증분으로 적는다.**
  이 계획은 원래 각 스텝에 `294 passed` 같은 총계를 박아 뒀는데, Task 1이 7개를
  더할 거라고 예측하고 **실제로 14개**를 더하면서 그 뒤의 모든 숫자가 8씩 어긋났다
  (294·294·299·303·308·313·317이 전부 8 낮았다). 총계는 앞 태스크의 예측이 빗나가면
  통째로 거짓이 되고, 그러면 사람이 검산을 아예 멈춘다. 그래서 **직전 태스크 대비 증분**만 쓴다.
  - **현재 기준선: 302개** (2026-08-20, Task 1~3 완료 시점 `npm test` 실측).
    이 숫자도 태스크가 더 붙으면 낡는다 — 각 태스크 시작 전에 `npm test`로 **직접 세고**,
    그 값에 아래 증분을 더한 값을 기대값으로 삼는다.

## 필터 값 10개와 대응 (설계 명세 기준)

| 필터 | 값 | 메뉴 | 대응 |
|---|---|---:|---|
| `allergies` | `Nut Allergy` | 89 | 기존 `nut-free-school-lunches-new-zealand` |
| `allergies` | `Egg Allergy` | 66 | 기존 `egg-free-lunchbox-ideas-nz` |
| `allergies` | `Vegetarian` | 53 | 기존 가이드 `vegetarian-vegan-school-lunch-guide-nz` |
| `allergies` | `Vegan` | 21 | 기존 가이드 `vegetarian-vegan-school-lunch-guide-nz` |
| `allergies` | `Dairy Allergy` | 44 | **Task 5 신규** |
| `allergies` | `Gluten Allergy` | 25 | **Task 6 신규** |
| `prepStyles` | `make-ahead` | 47 | 기존 `batch-cooking-save-money-nz` |
| `prepStyles` | `no-cook` | 28 | **Task 7 신규** |
| `prepStyles` | `cook-fresh` | 19 | 글 없음 — 사유를 매핑에 남긴다 |
| `thermosOnly` | `true` | 14 | **Task 4 신규** |

---

### Task 1: 필터 → 글 매핑 모듈

기존 글만으로 매핑을 만든다. 이것만으로도 플래너의 링크 0건 문제가 풀린다. 신규 글은 Task 4~7에서 이 테이블에 붙는다.

**Files:**
- Create: `lib/relatedPosts.ts`
- Create: `lib/relatedPosts.test.ts`

**Interfaces:**
- Consumes: `AllergyType`, `PrepStyle` (`lib/types.ts`), `BLOG_SLUGS` (`content/posts.ts`), `GUIDE_SLUGS` (`content/guides.ts`)
- Produces:
  - `type RelatedLink = { slug: string; kind: "blog" | "guide" }`
  - `type FilterState = { allergies: AllergyType[]; prepStyles: PrepStyle[]; thermosOnly: boolean }`
  - `relatedPosts(filters: FilterState): RelatedLink[]` — 최대 3개
  - `FILTER_ARTICLES: Record<FilterKey, RelatedLink | { none: string }>` — 필터 값 10개 전부가 키.
    🔴 `Record<string, …>`으로 두면 필터가 늘어도 컴파일이 통과한다(2026-08-20 최종 리뷰에서 적발).
    `FilterKey = AllergyType | PrepStyle | "thermosOnly"` 여야 tsc가 이 파일에서 잡는다.
  - `FALLBACK: RelatedLink[]` — 필터 미선택 시 3개

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`lib/relatedPosts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { relatedPosts, FILTER_ARTICLES, FALLBACK } from "./relatedPosts";
import { BLOG_SLUGS } from "@/content/posts";
import { GUIDE_SLUGS } from "@/content/guides";
import type { AllergyType, PrepStyle } from "@/lib/types";

const ALL_ALLERGIES: AllergyType[] = [
  "Nut Allergy", "Dairy Allergy", "Gluten Allergy", "Egg Allergy", "Vegetarian", "Vegan",
];
const ALL_PREP: PrepStyle[] = ["no-cook", "make-ahead", "cook-fresh"];

const exists = (l: { slug: string; kind: string }) =>
  l.kind === "blog" ? BLOG_SLUGS.includes(l.slug) : GUIDE_SLUGS.includes(l.slug);

describe("relatedPosts", () => {
  it("🔴 필터 값 10개가 전부 매핑에 있다 — 필터가 늘면 여기서 걸린다", () => {
    const want = [...ALL_ALLERGIES, ...ALL_PREP, "thermosOnly"];
    expect(Object.keys(FILTER_ARTICLES).sort()).toEqual(want.sort());
  });

  it("🔴 매핑이 가리키는 글이 실제로 존재한다 — 개명하면 여기서 걸린다", () => {
    for (const [key, v] of Object.entries(FILTER_ARTICLES)) {
      if ("none" in v) {
        expect(v.none.length, `${key}: 사유가 비어 있다`).toBeGreaterThan(10);
        continue;
      }
      expect(exists(v), `${key} → ${v.slug} 가 존재하지 않는다`).toBe(true);
    }
    for (const f of FALLBACK) expect(exists(f), `폴백 ${f.slug} 가 없다`).toBe(true);
  });

  it("최대 3개를 넘지 않는다", () => {
    const all = relatedPosts({ allergies: ALL_ALLERGIES, prepStyles: ALL_PREP, thermosOnly: true });
    expect(all.length).toBeLessThanOrEqual(3);
  });

  it("필터를 안 켜면 폴백 3개를 준다", () => {
    expect(relatedPosts({ allergies: [], prepStyles: [], thermosOnly: false })).toEqual(FALLBACK);
  });

  it("켠 필터에 해당하는 글을 준다", () => {
    const r = relatedPosts({ allergies: ["Nut Allergy"], prepStyles: [], thermosOnly: false });
    expect(r.map((x) => x.slug)).toContain("nut-free-school-lunches-new-zealand");
  });

  it("중복을 내지 않는다 — Vegetarian과 Vegan은 같은 가이드다", () => {
    const r = relatedPosts({ allergies: ["Vegetarian", "Vegan"], prepStyles: [], thermosOnly: false });
    expect(new Set(r.map((x) => x.slug)).size).toBe(r.length);
  });

  it("🔴 글이 없는 필터는 결과에 안 나온다 — 죽은 링크가 화면에 뜨면 안 된다", () => {
    const r = relatedPosts({ allergies: [], prepStyles: ["cook-fresh"], thermosOnly: false });
    expect(r).toEqual(FALLBACK);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run lib/relatedPosts.test.ts`
Expected: FAIL — `Failed to resolve import "./relatedPosts"`

- [ ] **Step 3: 매핑 모듈을 만든다**

`lib/relatedPosts.ts`:

```ts
import type { AllergyType, PrepStyle } from "@/lib/types";

export type RelatedLink = { slug: string; kind: "blog" | "guide" };
export type FilterState = {
  allergies: AllergyType[];
  prepStyles: PrepStyle[];
  thermosOnly: boolean;
};

/**
 * 🔴 이 테이블은 플래너 필터 값을 **하나도 빠짐없이** 담는다.
 *
 * 이 파일이 생긴 이유 (2026-08-20): 글에서 플래너로 가는 링크는 42개인데
 * **플래너에서 글로 나가는 링크가 0개였다.** 계획을 만든 사람은 거기서 막혔다.
 *
 * 글이 아직 없는 필터는 지우지 말고 `{ none: "사유" }`로 남긴다. 지우면
 * "필터 값이 전부 있다" 가드가 못 잡고, 다음에 필터가 늘 때 콘텐츠가
 * 조용히 뒤처진다. 실사진 UNPLACED 목록과 같은 방식이다 —
 * **사유가 적힌 항목에 글이 생기면 사유도 같이 지워야 한다.**
 */
export const FILTER_ARTICLES: Record<string, RelatedLink | { none: string }> = {
  "Nut Allergy": { slug: "nut-free-school-lunches-new-zealand", kind: "blog" },
  "Egg Allergy": { slug: "egg-free-lunchbox-ideas-nz", kind: "blog" },
  Vegetarian: { slug: "vegetarian-vegan-school-lunch-guide-nz", kind: "guide" },
  Vegan: { slug: "vegetarian-vegan-school-lunch-guide-nz", kind: "guide" },
  "make-ahead": { slug: "batch-cooking-save-money-nz", kind: "blog" },

  "Dairy Allergy": { none: "아직 글이 없다 — 유제품 미포함 메뉴가 44개로 가장 큰 미대응 필터다" },
  "Gluten Allergy": { none: "아직 글이 없다 — 글루텐프리 메뉴 25개" },
  "no-cook": { none: "아직 글이 없다 — 무조리 메뉴 28개" },
  thermosOnly: { none: "아직 글이 없다 — 보온병 메뉴 14개. 실사진은 이미 있다" },

  "cook-fresh": {
    none: "글을 만들지 않는다 — '아침에 조리한다'는 별도 글의 주제가 되기 어렵고 기존 레시피 글들이 이미 다룬다",
  },
};

/** 필터를 하나도 안 켠 사용자에게 보여줄 글. 어떤 필터와도 무관하게 모두에게 해당한다. */
export const FALLBACK: RelatedLink[] = [
  { slug: "budget-friendly-lunchbox-ideas-nz", kind: "blog" },
  { slug: "lunchbox-food-safety-nz-term-1-heat", kind: "blog" },
  { slug: "term-1-first-week-lunchbox-routine-auckland-parent", kind: "blog" },
];

const MAX = 3;

export function relatedPosts(filters: FilterState): RelatedLink[] {
  const keys: string[] = [
    ...filters.allergies,
    ...filters.prepStyles,
    ...(filters.thermosOnly ? ["thermosOnly"] : []),
  ];

  const out: RelatedLink[] = [];
  const seen = new Set<string>();
  for (const k of keys) {
    const entry = FILTER_ARTICLES[k];
    if (!entry || "none" in entry) continue;
    if (seen.has(entry.slug)) continue;
    seen.add(entry.slug);
    out.push(entry);
    if (out.length === MAX) break;
  }

  return out.length > 0 ? out : FALLBACK;
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run lib/relatedPosts.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: 가드 발화를 확인한다 (돌연변이)**

세 번 각각 고치고 → 실패 확인 → **편집으로 되돌린다.**

1. `FILTER_ARTICLES`에서 `"cook-fresh"` 항목을 삭제 → "필터 값 10개" 테스트 FAIL 확인 → 되돌린다
2. `"Nut Allergy"`의 slug를 `"nut-free-school-lunches"`(없는 값)로 → "실제로 존재한다" FAIL 확인 → 되돌린다
3. `MAX`를 `10`으로 → "최대 3개" FAIL 확인 → 되돌린다

Run(각 회차): `npx vitest run lib/relatedPosts.test.ts`
Expected: 각각 FAIL, 되돌린 뒤 PASS

- [ ] **Step 6: 전체 테스트**

Run: `npm test`
Expected: 시작 기준선 + 새로 쓴 테스트 수. (실제로는 **+14**였다 — 예측은 +7이었고,
이 8의 차이가 이 계획의 나머지 숫자를 전부 틀리게 만들었다.)

- [ ] **Step 7: 커밋**

```bash
git add lib/relatedPosts.ts lib/relatedPosts.test.ts
git commit -m "플래너 필터를 글에 잇는 매핑 — 지금까지 나가는 링크가 0개였다"
```

---

### Task 2: 결과 하단 "다음 읽을 것" 카드

**Files:**
- Modify: `app/[locale]/planner/page.tsx` (서버 컴포넌트 — 카드 메타를 만들어 prop으로 넘긴다)
- Modify: `components/PlannerClient.tsx` (장보기 목록 블록 다음, 903행 `</>` 직전)
- Modify: `messages/en.json` · `messages/ko.json` · `messages/zh.json`
- Modify: `lib/contentClaims.test.ts`

**Interfaces:**
- Consumes: `relatedPosts`, `RelatedLink` (Task 1)
- Produces: `PlannerClient`의 새 prop `articleMeta: Record<string, { title: string; category: string; readTime: string }>`

🔴 **`PlannerClient.tsx`는 `"use client"`다.** 여기서 `POSTS`/`GUIDES`를 import하면
글 본문 **320KB(posts 205KB + guides 115KB)가 브라우저 번들로 나간다.** 카드에 필요한 건
제목·카테고리·읽는시간 셋뿐이다. `BLOG_CARDS`/`GUIDE_CARDS` 경량 export가 이미 있지만
**같은 모듈에서 `POSTS`를 참조해 만들어지므로 트리셰이킹으로 떨어지지 않는다.**
→ **서버 컴포넌트에서 맵을 만들어 prop으로 넘긴다.**

- [ ] **Step 1: 실패하는 가드를 쓴다**

`lib/contentClaims.test.ts` 끝에 추가:

```ts
describe("🔴 플래너에서 글로 나가는 길", () => {
  it("🔴 플래너가 글로 나가는 링크를 렌더한다 — 0으로 돌아가면 실패한다", () => {
    const planner = src("components/PlannerClient.tsx");
    expect(planner, "relatedPosts를 쓰지 않는다").toMatch(/from "@\/lib\/relatedPosts"/);
    expect(planner, "링크를 렌더하지 않는다").toMatch(/\/\$\{locale\}\/(blog|guides)\//);
  });

  it("문구가 세 로케일에 다 있다", () => {
    for (const l of LOCALES) {
      expect(messages[l].planner_read_next, `${l}: planner_read_next 없음`).toBeTruthy();
      expect(messages[l].planner_read_next_filtered, `${l}: planner_read_next_filtered 없음`).toBeTruthy();
    }
  });

  it("🔴 클라이언트 번들에 글 본문을 넣지 않는다 — posts+guides가 320KB다", () => {
    const planner = src("components/PlannerClient.tsx");
    expect(planner, '"use client" 파일이 아니게 바뀌었다면 이 가드를 다시 볼 것')
      .toMatch(/^"use client"/);
    expect(planner, "글 본문 모듈을 클라이언트에서 import한다").not.toMatch(
      /from "@\/content\/(posts|guides)"/,
    );
  });

  it("🔴 posts와 guides의 slug가 겹치지 않는다 — 겹치면 메타 맵에서 조용히 덮어쓴다", async () => {
    const { BLOG_SLUGS } = await import("@/content/posts");
    const { GUIDE_SLUGS } = await import("@/content/guides");
    const dupes = BLOG_SLUGS.filter((s: string) => GUIDE_SLUGS.includes(s));
    expect(dupes, `겹치는 slug: ${dupes.join(", ")}`).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run lib/contentClaims.test.ts -t "플래너에서 글로"`
Expected: FAIL — "relatedPosts를 쓰지 않는다"

- [ ] **Step 3: 문구를 세 로케일에 넣는다**

`messages/en.json`:
```json
  "planner_read_next": "While you're here",
  "planner_read_next_filtered": "Because of the filters you chose",
```

`messages/ko.json`:
```json
  "planner_read_next": "이왕 오신 김에",
  "planner_read_next_filtered": "선택하신 필터에 맞춰",
```

`messages/zh.json`:
```json
  "planner_read_next": "顺便看看",
  "planner_read_next_filtered": "根据您选择的筛选条件",
```

- [ ] **Step 4: 서버에서 카드 메타를 만들어 넘긴다**

`app/[locale]/planner/page.tsx` (서버 컴포넌트):

```tsx
import { POSTS } from "@/content/posts";
import { GUIDES } from "@/content/guides";

/**
 * 🔴 카드에 필요한 세 필드만 뽑아 클라이언트로 넘긴다.
 *    PlannerClient는 "use client"라, 여기서 POSTS를 넘기면 글 본문 320KB가
 *    통째로 브라우저 번들에 들어간다.
 */
const ARTICLE_META = Object.fromEntries(
  [
    ...Object.entries(POSTS),
    ...Object.entries(GUIDES),
  ].map(([slug, a]) => [slug, { title: a.title, category: a.category, readTime: a.readTime }]),
);
```

`<PlannerClient ... />`에 `articleMeta={ARTICLE_META}`를 넘긴다.

⚠️ posts와 guides에 같은 slug가 있으면 뒤가 앞을 조용히 덮어쓴다. 현재 21개 slug가
전부 다른 것을 Step 5의 가드로 확인한다.

- [ ] **Step 4b: 카드를 렌더한다**

`components/PlannerClient.tsx` 상단 import와 props에 추가:

```ts
import { relatedPosts } from "@/lib/relatedPosts";

type ArticleMeta = { title: string; category: string; readTime: string };
// 컴포넌트 props에 추가: articleMeta: Record<string, ArticleMeta>
```

장보기 목록 `</div>` 다음, 903행 `</>` 직전에 삽입:

```tsx
            {/* 🔴 플래너에서 글로 나가는 유일한 길이다. 지우면 링크가 다시 0이 된다. */}
            {(() => {
              const links = relatedPosts({ allergies, prepStyles, thermosOnly });
              const filtered =
                allergies.length > 0 || prepStyles.length > 0 || thermosOnly;
              return (
                <div className="mt-10">
                  <h2 className="text-xl font-bold text-[#314A37] mb-1">
                    {filtered ? t("planner_read_next_filtered") : t("planner_read_next")}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-3 mt-4">
                    {links.map((l) => {
                      const meta = articleMeta[l.slug];
                      if (!meta) return null;
                      return (
                        <a
                          key={l.slug}
                          href={`/${locale}/${l.kind === "blog" ? "blog" : "guides"}/${l.slug}`}
                          className="block bg-white rounded-2xl shadow p-4 hover:shadow-md transition-shadow"
                        >
                          <p className="text-xs font-bold text-[#78B159] uppercase tracking-wide">
                            {meta.category}
                          </p>
                          <p className="font-bold text-[#314A37] mt-1 leading-snug">
                            {meta.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">{meta.readTime}</p>
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
```

⚠️ `locale`이 이 스코프에 없으면 컴포넌트 상단에서 `useParams()`로 꺼내 쓴다 — `AccountClient.tsx:12-13`과 같은 방식이다. (`GUIDES`·`POSTS`는 서버 컴포넌트에서만 쓴다.)

- [ ] **Step 5: 통과를 확인한다**

Run: `npx vitest run lib/contentClaims.test.ts -t "플래너에서 글로"`
Expected: PASS (4 tests)

- [ ] **Step 6: 가드 발화를 확인한다**

`PlannerClient.tsx`의 `import { relatedPosts }` 줄을 주석 처리 → FAIL 확인 → 되돌린다.
`messages/ko.json`의 `planner_read_next`를 삭제 → FAIL 확인 → 되돌린다.

- [ ] **Step 7: 눈으로 확인한다**

```bash
npm run dev
```
`http://localhost:3000/en/planner` → 계획 생성 → 맨 아래 카드 3장 확인.
`Nut Allergy` 체크 → Nut-Free 카드로 바뀌는지, 해제하면 폴백으로 돌아가는지 본다.

- [ ] **Step 8: 전체 테스트 후 커밋**

Run: `npm test` → Expected: 직전 태스크 대비 **+4** (실측 기준선 302은 이 태스크까지 반영된 값이다)

```bash
git add components/PlannerClient.tsx messages/*.json lib/contentClaims.test.ts
git commit -m "결과 화면 아래에 다음 읽을 것 — 필터에 맞춰 바뀐다"
```

---

### Task 3: `siteCounts`에 상수 3개

**Files:**
- Modify: `lib/siteCounts.ts`
- Modify: `lib/contentClaims.test.ts` (기존 "siteCounts는 데이터와 일치한다" 테스트 확장, 1043행 부근)

**Interfaces:**
- Produces: `DAIRY_FREE_COUNT`, `GLUTEN_FREE_COUNT`, `NO_COOK_COUNT` (number)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`lib/contentClaims.test.ts`의 "🔴 siteCounts는 데이터와 일치한다" 테스트 안에 추가:

```ts
    expect(counts.DAIRY_FREE_COUNT).toBe(MENUS.filter((m) => m.is_dairy_free).length);
    expect(counts.GLUTEN_FREE_COUNT).toBe(MENUS.filter((m) => m.is_gluten_free).length);
    expect(counts.NO_COOK_COUNT).toBe(MENUS.filter((m) => m.prep_style === "no-cook").length);
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run lib/contentClaims.test.ts -t "siteCounts는 데이터와"`
Expected: FAIL — `expected undefined to be 44`

- [ ] **Step 3: 상수를 추가한다**

`lib/siteCounts.ts`의 `THERMOS_COUNT` 다음에:

```ts
/** 유제품이 없어 Dairy Allergy 필터에서 살아남는 메뉴 수 */
export const DAIRY_FREE_COUNT = menus.filter((m) => m.is_dairy_free).length;

/** 글루텐이 없어 Gluten Allergy 필터에서 살아남는 메뉴 수 */
export const GLUTEN_FREE_COUNT = menus.filter((m) => m.is_gluten_free).length;

/** 조리 없이 담을 수 있는 메뉴 수 */
export const NO_COOK_COUNT = menus.filter((m) => m.prep_style === "no-cook").length;
```

- [ ] **Step 4: 통과 확인 → 커밋**

Run: `npm test` → Expected: 직전 태스크 대비 **+0** (상수만 늘고 테스트 본문은 기존 것을 확장한다)

```bash
git add lib/siteCounts.ts lib/contentClaims.test.ts
git commit -m "siteCounts에 dairy-free·gluten-free·no-cook 개수"
```

---

### Task 4: 보온병 글 — 신규 1편 (실사진)

🔴 **2026-08-20 정정 — 이 태스크의 원래 전제가 틀렸다.**
"보온병 실사진이 이미 있다"고 썼지만, 사진을 열어 가격표를 확대해 보니
`real-kmart-thermos-flasks.webp`는 **물병 매대**였다(METAL WATER BOTTLE ×2,
1L BTL W/HANDLE, INSUL CHROME CYLINDER BTL). 음식용 wide-mouth 보온병은 한 개도 없다.
→ 파일을 `real-kmart-drink-bottles.webp`로 개명했고, **이 글의 히어로는 생성 이미지**를 쓴다.
`imageCaption`은 **넣지 않는다**(생성 이미지에 촬영 문구 금지).

이 태스크를 여전히 먼저 하는 이유: `THERMOS_COUNT`가 export돼 있으나 **소비자가 없다.**

**Files:**
- Modify: `content/posts.ts` (`POSTS` 객체에 항목 추가)
- Modify: `lib/relatedPosts.ts` (`thermosOnly`의 `{ none }`을 링크로 교체)
- Modify: `lib/contentClaims.test.ts` (`UNPLACED`에서 보온병 사진 제거 + 신규 가드)

**Interfaces:**
- Consumes: `THERMOS_COUNT` (`lib/siteCounts.ts`), `menuData` (`data/menuData.json`)
- Produces: slug `thermos-hot-lunches-nz-winter` — Task 8이 링크할 수 있다

- [ ] **Step 1: 실패하는 가드를 쓴다**

`lib/contentClaims.test.ts`에 추가:

```ts
describe("🔴 보온병 글", () => {
  const SLUG = "thermos-hot-lunches-nz-winter";

  it("글이 존재하고 실사진을 쓴다", async () => {
    const { POSTS } = await import("@/content/posts");
    const p = POSTS[SLUG];
    expect(p, "보온병 글이 없다").toBeTruthy();
    expect(p.image, "생성 이미지를 쓴다 — 실사진이 없다").not.toMatch(/\/real-/);
    expect(p.imageCaption ?? "", "생성 이미지에 캡션을 달지 않는다").toBe("");
  });

  it("🔴 개수를 손으로 적지 않는다", async () => {
    const raw = src("content/posts.ts");
    // 🔴 siteCounts가 아니라 menuCounts다 — siteCounts는 content/posts를 import해서 순환이 된다
    expect(raw, "menuCounts를 import하지 않는다").toMatch(/from "@\/lib\/menuCounts"/);
    // 🔴 값이 들어 있는지만 보면 손으로 적은 14도 통과한다. **보간을 실제로 쓰는지** 본다.
    expect(raw, "본문이 ${THERMOS_COUNT} 보간을 안 쓴다").toContain("${THERMOS_COUNT}");
    const { POSTS } = await import("@/content/posts");
    const { THERMOS_COUNT } = await import("./menuCounts");
    expect(POSTS[SLUG].body).toContain(String(THERMOS_COUNT));
  });

  it("🔴 예시로 든 메뉴가 실제로 보온병 메뉴다 — 지어내면 걸린다", async () => {
    const { POSTS } = await import("@/content/posts");
    const body = POSTS[SLUG].body;
    const thermosNames = MENUS.filter((m) => m.is_thermos).map((m) => m.name);
    const mentioned = MENUS.filter((m) => body.includes(m.name)).map((m) => m.name);
    expect(mentioned.length, "메뉴를 하나도 언급하지 않는다").toBeGreaterThan(2);
    for (const n of mentioned) {
      expect(thermosNames, `"${n}"은 보온병 메뉴가 아닌데 이 글에 나온다`).toContain(n);
    }
  });

  it("🔴 매핑에 붙었고, 낡은 사유가 남아 있지 않다", async () => {
    const { FILTER_ARTICLES } = await import("./relatedPosts");
    const e = FILTER_ARTICLES["thermosOnly"];
    expect("none" in e, "글이 생겼는데 사유가 그대로다").toBe(false);
    expect((e as { slug: string }).slug).toBe(SLUG);
  });

  // 🔴 이 가드는 보온병 글만이 아니라 **모든 글**을 본다. 신규 글이 늘어도 자동으로 덮는다.
  // 현재 imageCaption을 쓰는 4편은 전부 `/assets/real-` 이미지다(2026-08-20 확인).
  it("🔴 생성 이미지에 촬영 문구를 붙이지 않는다 — 전체 글 대상", async () => {
    const { POSTS } = await import("@/content/posts");
    for (const [slug, p] of Object.entries(POSTS)) {
      if (p.image.includes("/real-")) continue;
      expect(p.imageCaption ?? "", `${slug}: 생성 이미지에 촬영 캡션이 붙었다`)
        .not.toMatch(/photograph|our own|packed the morning|not a stock image|직접 찍/i);
    }
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run lib/contentClaims.test.ts -t "보온병 글"`
Expected: FAIL — "보온병 글이 없다"

- [ ] **Step 3: 본문 생성 헬퍼를 만든다**

`content/posts.ts` 상단(다른 헬퍼들 옆)에 추가:

```ts
import { THERMOS_COUNT } from "@/lib/menuCounts";
import menuDataJson from "@/data/menuData.json";

const ALL_MENUS = (menuDataJson as { MENU_DATA: { en: { name: string; is_thermos?: boolean; prep_style?: string; is_dairy_free?: boolean; is_gluten_free?: boolean }[] } }).MENU_DATA.en;

/** 🔴 예시 메뉴를 손으로 적지 말 것 — 메뉴가 바뀌면 글이 조용히 거짓말이 된다. */
const namesWhere = (pred: (m: (typeof ALL_MENUS)[number]) => boolean, n: number) =>
  ALL_MENUS.filter(pred).slice(0, n).map((m) => m.name);

const thermosList = () => namesWhere((m) => !!m.is_thermos, 6).join(", ");
```

- [ ] **Step 4: 글을 쓴다**

`POSTS`에 `"thermos-hot-lunches-nz-winter"` 항목을 추가한다. 메타데이터:

```ts
  "thermos-hot-lunches-nz-winter": {
    title: "Thermos Lunches for a New Zealand Winter: What Actually Stays Hot",
    excerpt: "<1~2문장. 이 글이 무엇을 재고 무엇을 안 쟀는지 밝힌다.>",
    date: "2026-08-20",
    contentUpdated: "2026-08-20",
    readTime: "9 min read",
    image: "<기존 글과 같은 방식의 자체 호스팅 생성 이미지>",
    // imageCaption 없음 — 생성 이미지에 촬영 문구를 붙이지 않는다
    category: "Gear & Tips",
    author: "Yong Jae Lee",
    body: `<아래 5절 구성으로 집필. 기존 글과 같은 1,900~3,300단어.>`,
  },
```

**산문은 이 계획이 아니라 집필 단계에서 쓴다.** 편당 2천 단어를 계획서에 미리 넣을 수는
없다. 대신 **합격 기준은 Step 1의 가드가 전부 정의한다** — 개수는 `THERMOS_COUNT` 경유,
예시 메뉴는 `is_thermos`인 것만, 캡션은 실사진에만. 가드가 통과하지 않는 산문은 완성이 아니다.

본문 구성(각 절은 우리 데이터나 1인칭 경험에 근거해야 한다):
1. 왜 겨울에 보온병인가 — NZ 학교엔 전자레인지가 없다
2. **우리 메뉴 ${THERMOS_COUNT}개 중 무엇이 되는가** — `${thermosList()}`로 나열
3. 아침에 얼마나 걸리는가 — 예열이 실제 변수다
4. 식품안전 — 기존 MPI 글(`lunchbox-food-safety-nz-term-1-heat`)로 내부 링크
5. 사지 말아야 할 것 — 매대에서 본 것만 쓴다. **온라인 목록을 매대라고 쓰지 않는다.**

⚠️ 온도 유지 시간 같은 수치는 **직접 재지 않았으면 쓰지 않는다.** 재면 잰 값과 날짜를 쓴다.

- [ ] **Step 5: 매핑에 붙이고 사유를 지운다**

`lib/relatedPosts.ts`:

```ts
  thermosOnly: { slug: "thermos-hot-lunches-nz-winter", kind: "blog" },
```
(기존 `thermosOnly: { none: … }` 줄을 이것으로 교체)

- [ ] **Step 6: `UNPLACED`에서 보온병 사진을 뺀다**

🔴 **이 스텝은 폐기됐다.** `UNPLACED`에서 지울 것이 없다 — 그 사진은 물병 매대라
이 글에 안 쓴다. 항목은 개명된 이름(`real-kmart-drink-bottles.webp`)으로 남아 있고,
사유에 무엇이 찍혔는지가 적혀 있다. **건드리지 말 것.**

- [ ] **Step 7: 통과를 확인한다**

Run: `npm test`
Expected: 직전 태스크 대비 **+5**

- [ ] **Step 8: 가드 발화를 확인한다**

1. 본문에서 보온병 메뉴 이름 하나를 보온병이 **아닌** 메뉴 이름으로 바꾼다 → "지어내면 걸린다" FAIL 확인 → 되돌린다
2. `relatedPosts.ts`의 `thermosOnly`를 다시 `{ none: "…" }`로 → "낡은 사유" FAIL 확인 → 되돌린다

- [ ] **Step 9: 커밋**

```bash
git add content/posts.ts lib/relatedPosts.ts lib/contentClaims.test.ts
git commit -m "보온병 글 — 놀고 있던 실사진과 THERMOS_COUNT의 첫 소비자"
```

---

### Task 5: Dairy-Free 글 — 신규 2편

**Files:**
- Modify: `content/posts.ts`
- Modify: `lib/relatedPosts.ts`
- Modify: `lib/contentClaims.test.ts`

**Interfaces:**
- Consumes: `DAIRY_FREE_COUNT` (Task 3), `namesWhere` (Task 4에서 만든 헬퍼)
- Produces: slug `dairy-free-school-lunches-nz`

- [ ] **Step 1: 실패하는 가드를 쓴다**

```ts
describe("🔴 Dairy-Free 글", () => {
  const SLUG = "dairy-free-school-lunches-nz";

  it("글이 존재한다", async () => {
    const { POSTS } = await import("@/content/posts");
    expect(POSTS[SLUG], "Dairy-Free 글이 없다").toBeTruthy();
  });

  it("🔴 개수를 손으로 적지 않는다", async () => {
    const { POSTS } = await import("@/content/posts");
    const { DAIRY_FREE_COUNT } = await import("./menuCounts");
    expect(POSTS[SLUG].body).toContain(String(DAIRY_FREE_COUNT));
    // 🔴 값 포함만 보면 손으로 적은 숫자도 통과한다 — 보간을 쓰는지 본다
    expect(src("content/posts.ts"), "${DAIRY_FREE_COUNT} 보간을 안 쓴다").toContain("${DAIRY_FREE_COUNT}");
  });

  it("🔴 예시로 든 메뉴가 실제로 유제품 미포함이다", async () => {
    const { POSTS } = await import("@/content/posts");
    const body = POSTS[SLUG].body;
    const ok = MENUS.filter((m) => m.is_dairy_free).map((m) => m.name);
    const mentioned = MENUS.filter((m) => body.includes(m.name)).map((m) => m.name);
    expect(mentioned.length).toBeGreaterThan(2);
    for (const n of mentioned) {
      expect(ok, `"${n}"은 유제품이 들어 있는데 이 글에 나온다`).toContain(n);
    }
  });

  it("🔴 매핑에 붙었고, 낡은 사유가 남아 있지 않다", async () => {
    const { FILTER_ARTICLES } = await import("./relatedPosts");
    const e = FILTER_ARTICLES["Dairy Allergy"];
    expect("none" in e, "글이 생겼는데 사유가 그대로다").toBe(false);
    expect((e as { slug: string }).slug).toBe(SLUG);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run lib/contentClaims.test.ts -t "Dairy-Free 글"`
Expected: FAIL — "Dairy-Free 글이 없다"

- [ ] **Step 3: 헬퍼를 추가한다**

`content/posts.ts`:

```ts
import { DAIRY_FREE_COUNT } from "@/lib/menuCounts";

const dairyFreeList = () => namesWhere((m) => !!m.is_dairy_free, 8).join(", ");
```

- [ ] **Step 4: 글을 쓴다**

`POSTS`에 `"dairy-free-school-lunches-nz"`를 추가한다. `category: "Allergy Friendly"`, `readTime: "10 min read"`, `image`는 기존 글과 같은 자체 호스팅 생성 이미지(`imageCaption` 없음).

본문 구성:
1. 유당불내증과 우유 알레르기는 다르다 — 학교에 뭐라고 알릴 것인가
2. **우리 메뉴 ${DAIRY_FREE_COUNT}개가 유제품 없이 된다** — `${dairyFreeList()}`
3. 치즈 대신 무엇을 넣나 — 단백질을 어디서 채우는가
4. 칼슘 — 기존 영양 가이드(`complete-nutrition-guide-school-lunches-nz`)로 내부 링크
5. 라벨에서 놓치는 것 — 마가린, 빵, 크래커

⚠️ 칼슘 권장량 등 영양 수치를 쓸 거면 **출처를 명시**한다. 출처를 못 대면 뺀다.

- [ ] **Step 5: 매핑에 붙이고 사유를 지운다**

```ts
  "Dairy Allergy": { slug: "dairy-free-school-lunches-nz", kind: "blog" },
```

- [ ] **Step 6: 통과 확인 → 돌연변이 확인 → 커밋**

Run: `npm test` → Expected: 직전 태스크 대비 **+4**

돌연변이: 본문에 유제품 포함 메뉴 이름 하나를 넣는다 → "유제품이 들어 있는데" FAIL 확인 → 되돌린다.

```bash
git add content/posts.ts lib/relatedPosts.ts lib/contentClaims.test.ts
git commit -m "Dairy-Free 글 — 메뉴 44개짜리 최대 미대응 필터"
```

---

### Task 6: Gluten-Free 글 — 신규 3편

**Files:**
- Modify: `content/posts.ts`
- Modify: `lib/relatedPosts.ts`
- Modify: `lib/contentClaims.test.ts`

**Interfaces:**
- Consumes: `GLUTEN_FREE_COUNT` (Task 3), `namesWhere` (Task 4)
- Produces: slug `gluten-free-school-lunches-nz`

- [ ] **Step 1: 실패하는 가드를 쓴다**

```ts
describe("🔴 Gluten-Free 글", () => {
  const SLUG = "gluten-free-school-lunches-nz";

  it("글이 존재한다", async () => {
    const { POSTS } = await import("@/content/posts");
    expect(POSTS[SLUG], "Gluten-Free 글이 없다").toBeTruthy();
  });

  it("🔴 개수를 손으로 적지 않는다", async () => {
    const { POSTS } = await import("@/content/posts");
    const { GLUTEN_FREE_COUNT } = await import("./menuCounts");
    expect(POSTS[SLUG].body).toContain(String(GLUTEN_FREE_COUNT));
    // 🔴 값 포함만 보면 손으로 적은 숫자도 통과한다 — 보간을 쓰는지 본다
    expect(src("content/posts.ts"), "${GLUTEN_FREE_COUNT} 보간을 안 쓴다").toContain("${GLUTEN_FREE_COUNT}");
  });

  it("🔴 예시로 든 메뉴가 실제로 글루텐 미포함이다", async () => {
    const { POSTS } = await import("@/content/posts");
    const body = POSTS[SLUG].body;
    const ok = MENUS.filter((m) => m.is_gluten_free).map((m) => m.name);
    const mentioned = MENUS.filter((m) => body.includes(m.name)).map((m) => m.name);
    expect(mentioned.length).toBeGreaterThan(2);
    for (const n of mentioned) {
      expect(ok, `"${n}"은 글루텐이 들어 있는데 이 글에 나온다`).toContain(n);
    }
  });

  it("🔴 셀리악은 교차오염 문제라는 걸 빠뜨리지 않는다", async () => {
    const { POSTS } = await import("@/content/posts");
    expect(POSTS[SLUG].body).toMatch(/cross.?contamination/i);
  });

  it("🔴 매핑에 붙었고, 낡은 사유가 남아 있지 않다", async () => {
    const { FILTER_ARTICLES } = await import("./relatedPosts");
    const e = FILTER_ARTICLES["Gluten Allergy"];
    expect("none" in e, "글이 생겼는데 사유가 그대로다").toBe(false);
    expect((e as { slug: string }).slug).toBe(SLUG);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run lib/contentClaims.test.ts -t "Gluten-Free 글"`
Expected: FAIL — "Gluten-Free 글이 없다"

- [ ] **Step 3: 헬퍼를 추가한다**

```ts
import { GLUTEN_FREE_COUNT } from "@/lib/menuCounts";

const glutenFreeList = () => namesWhere((m) => !!m.is_gluten_free, 8).join(", ");
```

- [ ] **Step 4: 글을 쓴다**

`"gluten-free-school-lunches-nz"`, `category: "Allergy Friendly"`, `readTime: "10 min read"`, 생성 이미지(`imageCaption` 없음).

본문 구성:
1. 셀리악 · 글루텐 민감성 · 밀 알레르기는 다르다 — **교차오염이 핵심**
2. **우리 메뉴 ${GLUTEN_FREE_COUNT}개가 글루텐 없이 된다** — `${glutenFreeList()}`
3. 도시락에서 교차오염이 생기는 지점 — 도마, 토스터, 나눠 먹기
4. NZ 슈퍼에서 GF 제품이 얼마나 비싼가 — **잰 값이 없으면 퍼센트를 쓰지 않는다**
5. 학교에 무엇을 알려야 하나 — 기존 알레르기 가이드(`allergy-management-school-lunchbox-nz`)로 내부 링크

- [ ] **Step 5: 매핑에 붙이고 사유를 지운다**

```ts
  "Gluten Allergy": { slug: "gluten-free-school-lunches-nz", kind: "blog" },
```

- [ ] **Step 6: 통과 확인 → 돌연변이 확인 → 커밋**

Run: `npm test` → Expected: 직전 태스크 대비 **+5**

돌연변이: 본문에서 `cross-contamination`을 지운다 → FAIL 확인 → 되돌린다.

```bash
git add content/posts.ts lib/relatedPosts.ts lib/contentClaims.test.ts
git commit -m "Gluten-Free 글 — 교차오염을 본문 가드로 강제"
```

---

### Task 7: No-Cook 글 — 신규 4편

**Files:**
- Modify: `content/posts.ts`
- Modify: `lib/relatedPosts.ts`
- Modify: `lib/contentClaims.test.ts`

**Interfaces:**
- Consumes: `NO_COOK_COUNT` (Task 3), `namesWhere` (Task 4)
- Produces: slug `no-cook-lunchbox-ideas-nz`

- [ ] **Step 1: 실패하는 가드를 쓴다**

```ts
describe("🔴 No-Cook 글", () => {
  const SLUG = "no-cook-lunchbox-ideas-nz";

  it("글이 존재한다", async () => {
    const { POSTS } = await import("@/content/posts");
    expect(POSTS[SLUG], "No-Cook 글이 없다").toBeTruthy();
  });

  it("🔴 개수를 손으로 적지 않는다", async () => {
    const { POSTS } = await import("@/content/posts");
    const { NO_COOK_COUNT } = await import("./menuCounts");
    expect(POSTS[SLUG].body).toContain(String(NO_COOK_COUNT));
    // 🔴 값 포함만 보면 손으로 적은 숫자도 통과한다 — 보간을 쓰는지 본다
    expect(src("content/posts.ts"), "${NO_COOK_COUNT} 보간을 안 쓴다").toContain("${NO_COOK_COUNT}");
  });

  it("🔴 예시로 든 메뉴가 실제로 무조리다", async () => {
    const { POSTS } = await import("@/content/posts");
    const body = POSTS[SLUG].body;
    const ok = MENUS.filter((m) => m.prep_style === "no-cook").map((m) => m.name);
    const mentioned = MENUS.filter((m) => body.includes(m.name)).map((m) => m.name);
    expect(mentioned.length).toBeGreaterThan(2);
    for (const n of mentioned) {
      expect(ok, `"${n}"은 조리가 필요한데 무조리 글에 나온다`).toContain(n);
    }
  });

  it("🔴 매핑에 붙었고, 낡은 사유가 남아 있지 않다", async () => {
    const { FILTER_ARTICLES } = await import("./relatedPosts");
    const e = FILTER_ARTICLES["no-cook"];
    expect("none" in e, "글이 생겼는데 사유가 그대로다").toBe(false);
    expect((e as { slug: string }).slug).toBe(SLUG);
  });

  it("🔴 cook-fresh는 여전히 사유만 남는다 — 안 쓰기로 한 글이다", async () => {
    const { FILTER_ARTICLES } = await import("./relatedPosts");
    expect("none" in FILTER_ARTICLES["cook-fresh"]).toBe(true);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run lib/contentClaims.test.ts -t "No-Cook 글"`
Expected: FAIL — "No-Cook 글이 없다"

- [ ] **Step 3: 헬퍼를 추가한다**

```ts
import { NO_COOK_COUNT } from "@/lib/menuCounts";

const noCookList = () => namesWhere((m) => m.prep_style === "no-cook", 8).join(", ");
```

- [ ] **Step 4: 글을 쓴다**

`"no-cook-lunchbox-ideas-nz"`, `category: "Routines"`, `readTime: "8 min read"`, 생성 이미지(`imageCaption` 없음).

본문 구성:
1. 아침 7시에 쓸 수 있는 시간은 실제로 몇 분인가 — 1인칭, 실제 우리 아침
2. **우리 메뉴 ${NO_COOK_COUNT}개가 불을 안 쓴다** — `${noCookList()}`
3. 전날 밤에 5분, 아침에 3분 — 나누는 법
4. 무조리라고 다 안전한 건 아니다 — MPI 글로 내부 링크
5. 플래너에서 `no-cook` 필터를 켜는 법

⚠️ 1절의 1인칭 서술은 **실제로 하는 것만** 쓴다. 이 사이트는 안 하는 일을 "우리 집 루틴"이라고 쓴 전력이 있다.

- [ ] **Step 5: 매핑에 붙이고 사유를 지운다**

```ts
  "no-cook": { slug: "no-cook-lunchbox-ideas-nz", kind: "blog" },
```

- [ ] **Step 6: 통과 확인 → 돌연변이 확인 → 커밋**

Run: `npm test` → Expected: 직전 태스크 대비 **+5**

돌연변이: `FILTER_ARTICLES["cook-fresh"]`를 링크로 바꾼다 → "여전히 사유만 남는다" FAIL 확인 → 되돌린다.

```bash
git add content/posts.ts lib/relatedPosts.ts lib/contentClaims.test.ts
git commit -m "No-Cook 글 — 이제 필터 10개 중 9개에 짝이 있다"
```

---

### Task 8: 주간 허브 — 플래너 특가 섹션에서 `/price-index`로

재방문을 만드는 유일한 항목이다. 1~7번은 체류를 늘릴 뿐이다.

**Files:**
- Modify: `components/PlannerClient.tsx` (특가 섹션, `sale_section_title` 부근)
- Modify: `messages/en.json` · `ko.json` · `zh.json`
- Modify: `lib/contentClaims.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: 없음

- [ ] **Step 1: 실패하는 가드를 쓴다**

```ts
describe("🔴 주간 특가에서 가격지수로", () => {
  it("플래너 특가 섹션이 price-index로 링크한다", () => {
    const planner = src("components/PlannerClient.tsx");
    expect(planner, "price-index 링크가 없다").toMatch(/\/\$\{locale\}\/price-index/);
  });

  it("문구가 세 로케일에 다 있다", () => {
    for (const l of LOCALES) {
      expect(messages[l].planner_price_index_link, `${l}: 없음`).toBeTruthy();
    }
  });

  it("🔴 '매주 갱신'이라고 쓴다면 주간 크론이 실제로 있어야 한다", () => {
    // 🔴 크론은 vercel.json이 아니라 GitHub Actions에 있다 (2026-08-20 확인).
    //    "0 20 * * 0" = 매주 일요일 20:00 UTC.
    const wf = src(".github/workflows/update_prices.yml");
    expect(wf, "주간 갱신을 약속했는데 크론이 없다").toMatch(/cron:\s*"0 \d+ \* \* 0"/);
  });

  it("🔴 화면이 말하는 갱신 주기가 크론과 같다", () => {
    const wf = src(".github/workflows/update_prices.yml");
    const weekly = /cron:\s*"0 \d+ \* \* \d"/.test(wf); // 요일 지정 = 주간
    for (const l of LOCALES) {
      const s = String(messages[l].planner_price_index_link ?? "");
      if (/daily|매일|每天/i.test(s)) {
        expect(weekly, `${l}: 매일이라고 쓰는데 크론은 주간이다`).toBe(false);
      }
    }
  });
});
```

⚠️ 첫 번째 테스트가 실패하면 **문구를 고칠지 크론을 만들지 결정**한다. 이 사이트는 "refresh weekly"라고 써 놓고 크론이 없던 전력이 있다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run lib/contentClaims.test.ts -t "주간 특가에서"`
Expected: FAIL — "price-index 링크가 없다"

- [ ] **Step 3: 문구를 세 로케일에 넣는다**

`en.json`: `"planner_price_index_link": "See this week's full price index →"`
`ko.json`: `"planner_price_index_link": "이번 주 가격지수 전체 보기 →"`
`zh.json`: `"planner_price_index_link": "查看本周完整价格指数 →"`

- [ ] **Step 4: 링크를 넣는다**

`components/PlannerClient.tsx`의 특가 섹션(`sale_section_title` 헤딩이 있는 블록) 안, 목록 아래에:

```tsx
                <a
                  href={`/${locale}/price-index`}
                  className="inline-block mt-3 text-sm font-medium text-[#78B159] hover:underline"
                >
                  {t("planner_price_index_link")}
                </a>
```

- [ ] **Step 5: `/price-index` 상단에 갱신 시점을 드러낸다**

명세의 "'이번 주' 관점으로 다듬는다"를 이 한 가지로 좁힌다. 페이지를 다시 쓰지 않고,
**마지막 갱신일과 다음 갱신일**을 맨 위에 세운다. 재방문의 이유는 "다음에 오면 새 값이 있다"는
것이므로, 그게 보이지 않으면 링크를 눌러도 돌아올 이유가 안 생긴다.

`app/[locale]/price-index/page.tsx`의 제목 블록 바로 아래에:

```tsx
        {/* 🔴 매주 일요일 20:00 UTC에 GitHub Actions가 갱신한다
            (.github/workflows/update_prices.yml). 문구를 바꾸면 크론도 같이 볼 것. */}
        <p className="text-sm text-gray-500 mt-2">
          {t("price_index_freshness", {
            updated: IDX.woolworthsUpdated,
            next: nextSundayNZ(IDX.woolworthsUpdated),
          })}
        </p>
```

`nextSundayNZ`는 `lib/` 안 기존 날짜 헬퍼를 재사용하되, 없으면 이 파일 상단에 둔다:

```tsx
const nextSundayNZ = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
};
```

문구 세 로케일:
- `en`: `"price_index_freshness": "Last read {updated}. Next update {next}."`
- `ko`: `"price_index_freshness": "{updated}에 읽은 값입니다. 다음 갱신 {next}."`
- `zh`: `"price_index_freshness": "数据读取于 {updated}。下次更新 {next}。"`

⚠️ `IDX`가 이 페이지에 없으면 `data/priceIndex.json`을 직접 import한다. **날짜를 손으로 적지 않는다.**

- [ ] **Step 6: 통과 확인 → 돌연변이 확인**

Run: `npm test` → Expected: 직전 태스크 대비 **+4**

돌연변이 두 번:
1. 링크 `href`를 `/${locale}/blog`로 바꾼다 → "price-index 링크가 없다" FAIL 확인 → 되돌린다
2. `en.json`의 `planner_price_index_link`를 `"See daily prices →"`로 바꾼다 → "매일이라고 쓰는데 크론은 주간이다" FAIL 확인 → 되돌린다

- [ ] **Step 7: 커밋**

```bash
git add components/PlannerClient.tsx "app/[locale]/price-index/page.tsx" messages/*.json lib/contentClaims.test.ts
git commit -m "특가 섹션에서 가격지수로 — 매주 다시 올 이유는 여기 하나뿐이다"
```

---

## 전체 완료 후 검증

- [ ] `npm test` — 전부 통과 (총계는 박지 않는다. Task 3 완료 시점 실측 **302**에 Task 4~8의 증분 +5·+4·+5·+5·+4를 더한 값이 기대치이고, 어긋나면 **숫자를 고치지 말고 왜 어긋났는지 본다**)
- [ ] `npm run build` — 타입 오류 없음
- [ ] 로컬에서 `/en/planner` → 필터를 켜고 끄며 하단 카드가 따라 바뀌는지 본다
- [ ] ~~`/ko/planner` · `/zh/planner`에서 문구가 번역돼 나오는지 본다~~
  🔴 **이 항목은 실행 불가능하다 (2026-08-20 실측).** `/ko`·`/zh`는 **307로 `/en`에 리다이렉트**된다 —
  AdSense 승인 전까지 의도적으로 닫아둔 상태다. 브라우저로는 번역을 볼 수 없다.
  → 검증은 `messages/{en,ko,zh}.json`의 **키 존재를 테스트로** 확인하는 선까지다(이미 가드에 있다).
  AdSense가 열리면 그때 화면으로 다시 볼 것.
- [ ] 배포 후 라이브에서 **플래너의 글 링크 개수를 실제로 센다.** 가드 통과는 배포 확인이 아니다:

```bash
curl -s https://www.kiwilunchbox.co.nz/en/planner | grep -oE '/en/(blog|guides)/[a-z0-9-]+' | sort -u | wc -l
```

  🔴 **이 curl은 항상 0을 돌려준다 (2026-08-20 실측). 0이 정상이다.**
  카드는 `planData.length > 0`일 때만 렌더되므로 **초기 SSR HTML에는 없다.**
  → 확인은 브라우저에서 계획을 생성한 뒤 DOM을 세는 방식으로만 가능하다:
  ```js
  [...document.querySelectorAll('a[href*="/blog/"],a[href*="/guides/"]')].map(a=>a.getAttribute('href'))
  ```
  ⚠️ **SEO 함의:** 이 링크들은 초기 HTML에 없으므로 **구글이 내부 링크로 세지 않는다.**
  유지(목적 ①)에는 그대로 기여하지만, 검색(목적 ②)의 내부 링크 가치는 얻지 못한다.
  그게 필요하면 필터와 무관한 링크 묶음을 서버에서 따로 렌더해야 한다 — 이번 범위 밖이다.
- [ ] `lib/siteCounts.ts`의 상수 3개가 화면 어딘가에서 실제로 쓰이는지 확인한다 (`THERMOS_COUNT`가 소비자 없이 놀던 상태를 반복하지 않는다)
