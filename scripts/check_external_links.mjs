#!/usr/bin/env node
/**
 * 라이브 사이트가 인용한 외부 링크가 아직 살아 있는지 확인한다.
 *
 * 🔴 2026-08-13에 처음 돌려서 나온 것:
 *   - `kaora.govt.nz` — **DNS 레코드 자체가 없었다.** 예산 가이드가 "여기서 확인하세요"라고
 *     쓴 정부 프로그램 주소였다.
 *   - `health.govt.nz/your-health/healthy-living/...` — 404. 이건 `lib/utils.ts`의
 *     기본 출처라 **글·가이드 21편 전부의 하단**에 실려 있었다.
 *
 * 출처는 신뢰 신호이기 전에 자체 검산 도구다. 죽은 출처를 달아 두면 신호가 아니라 반대다.
 *
 * ⚠️ **403/999를 죽었다고 판정하지 말 것.** health.govt.nz는 브라우저가 아닌 요청을
 * 전부 403으로 막고 linkedin.com은 999를 준다. 둘 다 사람에게는 멀쩡히 열린다.
 * 처음 이걸 돌렸을 때 403 4건을 "죽었다"고 볼 뻔했다 — 실제로 죽은 건 그중 하나뿐이었고,
 * 그건 브라우저로 열어 보고서야 확인됐다. 그래서 BLOCKED는 별도 칸에 두고 사람이 본다.
 *
 * 사용: node scripts/check_external_links.mjs [베이스URL]
 */
const BASE = process.argv[2] ?? "https://aussielunchbox.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/** 사람에게는 열리지만 자동 요청을 막는 호스트가 주는 코드 */
const BOT_BLOCKED = new Set([403, 401, 429, 999]);

/**
 * 코드만으로는 안 걸러지는 곳. 이 호스트들은 **어떤 코드를 주든** 사람이 확인한다.
 *
 * 🔴 첫 실행에서 facebook.com이 **400**을 줬고, 그게 푸터에 있어 31페이지 전부에
 * 실려 있었기 때문에 "죽은 링크 1건, 전 페이지"로 보고됐다. 브라우저로 열어 보니
 * 페이지는 멀쩡했다 — 400은 FB가 자동 요청을 막는 방식이었다.
 * 400은 일반적으로는 진짜 오류라서 코드 목록에 넣을 수 없다. 호스트로 구분한다.
 */
const BOT_HOSTILE_HOSTS = ["facebook.com", "instagram.com", "linkedin.com", "health.govt.nz"];
const isHostile = (url) => {
  try {
    const h = new URL(url).hostname;
    return BOT_HOSTILE_HOSTS.some((d) => h === d || h.endsWith(`.${d}`));
  } catch {
    return false;
  }
};

const get = async (url, method = "GET") => {
  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(20_000),
    });
    // 🔴 본문 길이까지 본다. 2026-08-21: mpi.govt.nz는 Imperva 뒤에 있어
    //    **차단 페이지를 HTTP 200에 212바이트로** 돌려준다. status만 보면 "정상"이 되고,
    //    그래서 이 스크립트는 **폐기된 MPI URL을 한 번도 잡지 못했다**
    //    (실제로 죽은 랜딩 URL 두 개가 본문에 실린 채 몇 주를 버텼다).
    const body = method === "HEAD" ? "" : await res.text().catch(() => "");
    return { status: res.status, url: res.url, bytes: body.length, body };
  } catch (e) {
    return { status: 0, url, error: String(e.message ?? e).slice(0, 60) };
  }
};

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const pages = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

/** 외부 URL → 그 URL을 싣고 있는 페이지들 */
const external = new Map();
for (const page of pages) {
  const html = await (await fetch(page, { headers: { "User-Agent": UA } })).text();
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const href = m[1];
    if (href.includes("aussielunchbox.com")) continue;
    if (!external.has(href)) external.set(href, new Set());
    external.get(href).add(page.replace(BASE, ""));
  }
}

const dead = [];
const blocked = [];
let ok = 0;
for (const [url, sources] of external) {
  const r = await get(url);
  /**
   * 🔴 200이어도 **내용이 없으면 정상이 아니다.** 차단 페이지·빈 셸이 200으로 온다.
   *    문턱은 크기 하나로 두지 않는다 — 크기만 보면 정상적으로 짧은 페이지를 죽었다고 찍는다
   *    (이 저장소가 학교 사이트 스크리너에서 정확히 그 오탐을 겪었다).
   *    **본문에 링크가 하나도 없고 아주 짧을 때만** 차단으로 본다.
   */
  const linkCount = (r.body?.match(/<a\s/gi) || []).length;
  const emptyish = r.status === 200 && r.bytes < 1000 && linkCount === 0;
  if (r.status === 200 && !emptyish) ok++;
  else if (emptyish) blocked.push({ url, ...r, why: `200인데 ${r.bytes}B·링크 0개 (차단 페이지로 보인다)`, sources: [...sources] });
  else if (BOT_BLOCKED.has(r.status) || isHostile(url)) blocked.push({ url, ...r, sources: [...sources] });
  else dead.push({ url, ...r, sources: [...sources] });
}

console.log(`${pages.length}페이지 · 외부 링크 ${external.size}개 · 정상 ${ok}개\n`);

if (dead.length) {
  console.log(`🔴 죽은 링크 ${dead.length}건 — 고칠 것`);
  for (const d of dead) {
    console.log(`  ${d.status || "DNS없음"}  ${d.url}${d.error ? `  (${d.error})` : ""}`);
    console.log(`        실린 곳: ${d.sources.join(", ")}`);
  }
} else {
  console.log("✅ 죽은 링크 없음");
}

if (blocked.length) {
  console.log(`\n⚠️ 자동 요청이 막힌 곳 ${blocked.length}건 — **죽은 게 아니다. 브라우저로 직접 열어 볼 것**`);
  for (const b of blocked) {
    console.log(`  ${b.status}  ${b.url}${b.why ? `  ← ${b.why}` : ""}`);
    if (b.sources) console.log(`        실린 곳: ${b.sources.join(", ")}`);
  }
}

process.exit(dead.length ? 1 : 0);
