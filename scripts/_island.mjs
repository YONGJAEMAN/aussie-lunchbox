/**
 * 섬별 가격지수 — 매장·파일·SKU 조회 순서를 **한 곳에서만** 정한다(2026-10-28).
 *
 * 북섬은 이 기능 전과 같다: `data/priceIndex.json` · Ormiston 매장 · Woolworths 기본 세션.
 * 남섬은 곁에 붙인다: `data/priceIndex.south.json` · 크라이스트처치 매장.
 *
 * 🔴 2026-10-28 실측: **Woolworths도 전국 공통가가 아니다.** 고정 SKU 18개 중 13개가
 *    Church Corner(크라이스트처치)에서 달랐다(사과 $4.95→$5.95). 로그인 안 한 기본 세션은
 *    **Glenfield(오클랜드)** 배송가다 — 지금까지의 Woolworths 열은 오클랜드 값이었다.
 * 🔴 Foodstuffs(Pak'nSave·New World)는 북섬 SKU가 남섬에서도 대부분 열린다. 안 열리는 품목만
 *    `priceIndexSources.json`의 `paknsave_si`/`newworld_si`로 덮어쓴다(사람이 고른 값).
 */

import { join } from "path";

export function islandArg(argv = process.argv) {
  const i = argv.indexOf("--island");
  if (i < 0) return "north";
  const v = argv[i + 1];
  if (v !== "north" && v !== "south") throw new Error(`--island는 north|south다 (받은 값: ${v})`);
  return v;
}

/** Foodstuffs 매장. 쿠키 `Region`이 맞지 않으면 사이트가 조용히 기본 매장으로 돌린다 — 응답의 serverStoreId로 확인한다. */
export const FOODSTUFFS_STORES = {
  paknsave: {
    north: { id: "5f167936-79ae-4f6a-b9d2-74afe1bb096b", label: "PAK'nSAVE Ormiston (1 Bellingham Road, Flat Bush)", region: "NI" },
    south: { id: "4a279605-eaa8-470d-bcd4-0a9e3c9ab43b", label: "PAK'nSAVE Riccarton (Christchurch)", region: "SI" },
  },
  newworld: {
    north: { id: "bc0ebd13-e131-4efd-a226-415c40ce8c4e", label: "New World Ormiston (240 Ormiston Road, Ormiston)", region: "NI" },
    south: { id: "c6abac35-b75f-4a02-9b43-7ad5a7c7aa37", label: "New World Ilam (Christchurch)", region: "SI" },
  },
};

/** Woolworths 픽업 매장(`/api/v1/addresses/pickup-addresses`의 id). 북섬은 매장을 고르지 않는다 — 기본 세션(Glenfield) 그대로. */
export const WOOLWORTHS_SOUTH_PICKUP = { id: 1188758, label: "Woolworths Church Corner (Christchurch)" };

export function foodstuffsCookie(store) {
  return `eCom_STORE_ID=${store.id}; STORE_ID_V2=${store.id}|False; Region=${store.region}`;
}

export function indexPath(root, island) {
  return join(root, "data", island === "south" ? "priceIndex.south.json" : "priceIndex.json");
}

export function historyPath(root, island) {
  return join(root, "data", island === "south" ? "priceHistory.south.json" : "priceHistory.json");
}

export function reviewPath(root, base, island) {
  return join(root, "data", island === "south" ? base.replace(/\.txt$/, ".south.txt") : base);
}

/**
 * 품목의 고정 SKU. 남섬은 체인별 남섬 값 → 남섬 공용(paknsave_si) → 북섬 체인 값 → 북섬 공용 순.
 * `blocked`를 만나면 거기서 멈춘다(그 섬엔 같은 규격이 없다는 사람의 판단이다).
 */
export function foodstuffsSource(sources, name, chain, island) {
  const e = sources.items?.[name];
  if (!e) return undefined;
  const order = island === "south"
    ? [`${chain}_si`, "paknsave_si", chain, "paknsave"]
    : [chain, "paknsave"];
  for (const k of order) if (e[k]) return e[k];
  return undefined;
}

/** Woolworths 고정값. 남섬은 `woolworths_si`가 있으면 그것(blocked 포함), 없으면 북섬 고정 SKU. */
export function woolworthsSource(sources, name, island) {
  const e = sources.items?.[name];
  if (!e) return undefined;
  return island === "south" && e.woolworths_si ? e.woolworths_si : e;
}

/**
 * 남섬 지수 파일 — 품목 목록은 **북섬 지수를 따른다**(품목이 늘면 남섬에도 생긴다).
 * 남섬 값은 이름으로 이어 붙이고, 없는 값은 null이다(🔴 북섬 값으로 채우지 않는다).
 */
export function southIndexFrom(northIndex, southIndex) {
  const prev = new Map((southIndex?.items ?? []).map((i) => [i.name, i]));
  const items = northIndex.items.map((n) => {
    const s = prev.get(n.name) ?? {};
    return {
      name: n.name,
      category: n.category,
      unit: n.unit,
      countdown: s.countdown ?? null,
      paknsave: s.paknsave ?? null,
      newworld: s.newworld ?? null,
      ...(s.paknsaveAsOf ? { paknsaveAsOf: s.paknsaveAsOf } : {}),
      ...(s.newworldAsOf ? { newworldAsOf: s.newworldAsOf } : {}),
    };
  });
  const meta = Object.fromEntries(Object.entries(southIndex ?? {}).filter(([k]) => k !== "items"));
  return {
    _doc:
      "남섬(크라이스트처치) 가격지수. 품목 목록은 data/priceIndex.json(북섬)을 따른다. " +
      "null = 그 매장에서 아직 못 잰 값(특가 주·같은 규격 없음) — 북섬 값으로 채우지 않는다. " +
      "생성: scripts/update_{price_index,paknsave_prices,newworld_prices}.mjs --island south",
    island: "south",
    ...meta,
    items,
  };
}

/**
 * Woolworths 남섬 세션 쿠키 — 로그인 없는 손님 세션에 픽업 매장만 고른다(계정·주문과 무관).
 * 🔴 고른 매장이 세션에 실제로 붙었는지 `/api/v1/shell`로 **확인한 뒤에만** 쿠키를 돌려준다.
 *    확인 없이 쓰면, 매장 선택이 무시됐을 때 Glenfield(오클랜드) 값을 남섬 값으로 싣는다.
 */
export async function woolworthsSouthCookie(ua) {
  const jar = new Map();
  const keep = (res) => {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  };
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const headers = () => ({
    "User-Agent": ua,
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "OnlineShopping.WebApp",
    ...(jar.size ? { Cookie: cookie() } : {}),
  });
  const base = "https://www.woolworths.co.nz/api/v1";
  keep(await fetch(`${base}/shell`, { headers: headers(), signal: AbortSignal.timeout(20000) }));
  const put = await fetch(`${base}/fulfilment/my/pickup-addresses`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ addressId: WOOLWORTHS_SOUTH_PICKUP.id }),
    signal: AbortSignal.timeout(20000),
  });
  keep(put);
  if (!put.ok) throw new Error(`픽업 매장 선택 실패 HTTP ${put.status}`);
  const shell = await fetch(`${base}/shell`, { headers: headers(), signal: AbortSignal.timeout(20000) });
  keep(shell);
  const body = await shell.text();
  if (!body.includes(`"pickupAddressId":${WOOLWORTHS_SOUTH_PICKUP.id}`)) {
    throw new Error(`세션에 ${WOOLWORTHS_SOUTH_PICKUP.label}이 붙지 않았다 — 기본(오클랜드) 값을 남섬으로 싣지 않으려고 멈춘다`);
  }
  return cookie();
}
