#!/usr/bin/env node
/**
 * Kiwi Lunchbox — Pak'nSave 매장 실사용 **참고가** 뽑기
 *
 * 지수의 Pak'nSave 열은 update_paknsave_prices.mjs 가 같은 온라인 피드에서 채운다.
 * 이 스크립트의 산출물은 지수가 아니라 **매장에서 태그와 대조할 목록**이다.
 *
 * 🔴 특가 판정은 `value < retailValue` 가 아니다. 그렇게 짰다가 특가 3건을 전부
 *    "정상가"로 찍었다. Pak'nSave 는 decal/saleValue/promotionUnitPrice 로 드러낸다.
 *
 * Usage: node scripts/paknsave_reference.mjs
 *        → data/paknsave_online_reference.json
 */
import { readFileSync, writeFileSync } from "fs";
import { execFileSync } from "child_process";

const UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const SID="5f167936-79ae-4f6a-b9d2-74afe1bb096b";
const COOKIE=`eCom_STORE_ID=${SID}; STORE_ID_V2=${SID}|False; Region=NI`;
const html=execFileSync("curl",["-s","--http1.1","--max-time","25","-A",UA,"https://www.paknsave.co.nz/shop/product/5000527_ea_000pns"],{encoding:"utf8",maxBuffer:32*1024*1024});
const buildId=html.match(/"buildId":"([^"]+)"/)[1];

const sources=JSON.parse(readFileSync("data/priceIndexSources.json","utf8"));
const index=JSON.parse(readFileSync("data/priceIndex.json","utf8"));
const wool=Object.fromEntries(index.items.map(i=>[i.name,i.countdown]));
const note=Object.fromEntries(index.items.map(i=>[i.name,i.note||""]));

const out={};
for (const [item,src] of Object.entries(sources.items)) {
  const p=src.paknsave;
  if(!p?.sku){ out[item]={status:"no-pin", note:p?.reason ?? "Pak'nSave 고정 SKU 없음", woolworths:wool[item]??null}; continue; }
  const slug=p.sku.toLowerCase().replace(/-/g,"_");
  const raw=execFileSync("curl",["-s","--http1.1","--max-time","25","-A",UA,"-b",COOKIE,
    `https://www.paknsave.co.nz/_next/data/${buildId}/en/shop/product/${slug}pns.json`],{encoding:"utf8",maxBuffer:32*1024*1024});
  let prod=null; try { prod=JSON.parse(raw)?.pageProps?.product; } catch {}
  if(!prod){ out[item]={status:"not-found", sku:p.sku, woolworths:wool[item]??null}; continue; }
  // 🔴 `value < retailValue`로 판정했다가 특가 3건을 전부 "정상가"로 찍었다.
  //    Pak'nSave는 특가를 decal/saleValue/promotionUnitPrice 로 드러낸다
  //    (scripts/update_paknsave_prices.mjs 와 같은 판정을 쓴다).
  const value=prod.price?.value, retail=prod.price?.retailValue;
  const onPromo=!!(prod.price?.decal || prod.price?.saleValue || prod.promotionUnitPrice);
  out[item]={
    status: onPromo ? "on-special" : "regular",
    // prod.name 이 이미 브랜드로 시작하는 경우가 있다 ("Farrah's Farrah's Wraps"가 나왔다).
    product: (prod.brand && !prod.name?.startsWith(prod.brand) ? `${prod.brand} ${prod.name}` : prod.name ?? "").trim(),
    size: prod.displayName ?? p.pinnedSize ?? "",
    online: value/100,
    ...(onPromo && Number.isFinite(retail) && retail !== value ? { normalOnline: retail/100 } : {}),
    woolworths: wool[item]??null,
    brandNote: note[item]||undefined,
    sku: p.sku,
  };
  await new Promise(r=>setTimeout(r,350));
}
const doc={
  _doc:[
    "⚠️ 이것은 가격지수 데이터가 **아니다.** 매장 실사를 빠르게 하기 위한 참고값이다.",
    "",
    "출처: paknsave.co.nz 온라인 게시가, 점포=PAK'nSAVE Ormiston (1 Bellingham Road, Flat Bush).",
    "지수의 Pak'nSave 열은 이제 같은 온라인 피드에서 자동으로 채워진다(scripts/update_paknsave_prices.mjs).",
    "그래서 이 파일의 쓸모는 하나뿐이다 — **매장에서 태그와 대조할 목록**.",
    "",
    "🔴 `status`를 먼저 볼 것:",
    "  regular    = 지금 정상가로 보인다. 태그가 다르면 태그가 맞다.",
    "  on-special = **지금 특가다.** 노란 딱지 값이라 지수엔 못 넣는다.",
    "               `normalOnline`이 사이트가 말하는 정상가지만, 매장 태그로 확인할 것.",
    "  not-found  = 상품 페이지가 없다(단종·리뉴얼 의심). SKU 재선정 대상.",
    "  no-pin     = Pak'nSave 고정 SKU가 아직 없다.",
    "",
    "⚠️ 매장 전환 필수: 기본값은 Highland Park이고 가격도 특가도 다르다.",
    "   paknsave.co.nz 상단 'Your store is' → Change store → 'Ormiston' 검색 → Select.",
    "",
    "📌 `brandNote`는 지수가 지정한 브랜드/품종이다. 2026-07-30에 이걸 안 읽어",
    "   17건 중 9건의 브랜드가 어긋났다. 매장에서도 그 상품을 봐야 한다.",
  ],
  source:"paknsave.co.nz online, store: PAK'nSAVE Ormiston",
  collectedAt:new Date().toLocaleDateString("en-CA",{timeZone:"Pacific/Auckland"}),
  isIndexData:false,
  items:out,
};
writeFileSync("data/paknsave_online_reference.json", JSON.stringify(doc,null,2)+"\n");
const c={}; for(const v of Object.values(out)) c[v.status]=(c[v.status]||0)+1;
console.log("collected", Object.keys(out).length, JSON.stringify(c));
