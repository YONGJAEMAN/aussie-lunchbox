/**
 * 나이대별 양 (2026-10-12).
 *
 * 사이트의 1인분은 전부 **5–12세 초등학생 한 명**이 기준이다(`faq_a24`). 그래서 고등학생
 * 도시락은 화면 금액보다 30%쯤 더 들었다. 메뉴는 그대로 두고 **양만** 곱한다 —
 * 재료마다 팩에서 덜어 쓰는 몫(`PORTION_FACTORS`)에 같은 배율을 곱하므로 원가·절약액·열량이
 * 한꺼번에 같은 비율로 움직인다.
 *
 * 🔴 배율을 손으로 적지 않는다. 아래 표는 출처의 **리터럴**이고 배율은 여기서 계산한다.
 *    `lib/portionBands.test.ts`가 같은 표를 따로 들고 독립적으로 다시 계산해 대조한다.
 *
 * 출처: Nutrient Reference Values for Australia and New Zealand — Dietary energy,
 *       Table 2 「Estimated energy requirements for children and adolescents」(MJ/day)
 *       NHMRC / NZ Ministry of Health. 아래 `PORTION_BAND_SOURCE.url`.
 *
 * 가정: 점심이 하루 섭취에서 차지하는 몫은 나이와 무관 · 비용은 양에 비례.
 *       계란 1개·요거트 1통 같은 낱개는 실제로는 계단식이다 → 화면은 「about」로만 쓴다.
 *
 * 🔴 이 파일은 클라이언트 번들에 들어간다 — 가격 캐시·메뉴 데이터를 import하지 말 것.
 */

export const PORTION_BAND_SOURCE = {
  title: "Nutrient Reference Values for Australia and New Zealand — Dietary energy, Table 2",
  publisher: "NHMRC / NZ Ministry of Health",
  url: "https://www.eatforhealth.gov.au/nutrient-reference-values/nutrients/dietary-energy",
} as const;

/** 표의 세 열. 순서가 곧 아래 행의 순서다. */
export const PALS = [1.4, 1.6, 1.8] as const;
export type Pal = (typeof PALS)[number];

type EerRow = readonly [number, number, number];

/** Table 2, Boys — 나이: [PAL 1.4, 1.6, 1.8] MJ/day */
export const EER_BOYS: Readonly<Record<number, EerRow>> = {
  3: [4.9, 5.6, 6.3],
  4: [5.2, 5.9, 6.6],
  5: [5.5, 6.2, 7.0],
  6: [5.8, 6.6, 7.4],
  7: [6.1, 7.0, 7.8],
  8: [6.4, 7.3, 8.2],
  9: [6.8, 7.8, 8.8],
  10: [7.3, 8.3, 9.3],
  11: [7.7, 8.8, 9.9],
  12: [8.2, 9.3, 10.5],
  13: [8.7, 10.0, 11.2],
  14: [9.3, 10.6, 11.9],
  15: [9.9, 11.2, 12.6],
  16: [10.3, 11.8, 13.2],
  17: [10.7, 12.2, 13.7],
  18: [10.9, 12.5, 14.0],
};

/** Table 2, Girls — 나이: [PAL 1.4, 1.6, 1.8] MJ/day */
export const EER_GIRLS: Readonly<Record<number, EerRow>> = {
  3: [4.5, 5.3, 5.8],
  4: [4.8, 5.5, 6.1],
  5: [5.1, 5.7, 6.5],
  6: [5.4, 6.1, 6.9],
  7: [5.7, 6.5, 7.3],
  8: [6.0, 6.9, 7.7],
  9: [6.4, 7.3, 8.2],
  10: [6.7, 7.6, 8.5],
  11: [7.0, 8.0, 9.0],
  12: [7.4, 8.5, 9.5],
  13: [7.8, 8.9, 10.0],
  14: [8.1, 9.2, 10.3],
  15: [8.2, 9.4, 10.6],
  16: [8.4, 9.5, 10.7],
  17: [8.4, 9.6, 10.8],
  18: [8.5, 9.7, 10.9],
};

/**
 * 같은 쪽 본문의 성인 값(19–30세, 기준 체중). 「sedentary」는 PAL 1.4, 「moderate」는
 * PAL 1.8과 짝짓는다 — 아이 기준값을 같은 활동 수준에서 잡기 위해서다.
 */
export const EER_ADULT = {
  male: { sedentary: 10.8, moderate: 13.8 },
  female: { sedentary: 8.1, moderate: 10.5 },
} as const;

/** 아이 나이대에 쓰는 PAL. 1.8로 바꿔도 배율이 0.02 안에서 같다(테스트가 본다). */
export const CHILD_PAL: Pal = 1.6;

/** 사이트의 기존 1인분 기준 나이(5–12세). */
export const REFERENCE_AGES = [5, 12] as const;

/** 순서 = 화면의 선택지 순서(어린 쪽부터). 공유 링크는 이 표의 **인덱스**를 싣는다 — 새 값은 끝에만. */
export const PORTION_BANDS = ["standard", "kindy", "primary", "intermediate", "college", "adult"] as const;
export type PortionBand = (typeof PORTION_BANDS)[number];
export const DEFAULT_PORTION_BAND: PortionBand = "standard";

/** 아이 나이대의 나이 범위(양 끝 포함). 성인은 표가 아니라 본문 값이다. */
export const BAND_AGES: Readonly<Record<Exclude<PortionBand, "adult">, readonly [number, number]>> = {
  standard: REFERENCE_AGES,
  kindy: [3, 4],
  primary: [5, 10],
  intermediate: [11, 12],
  college: [13, 17],
};

function col(p: Pal): number {
  return PALS.indexOf(p);
}

/** 나이 범위의 남녀 평균 EER(MJ/day) at PAL p. */
export function meanEer(fromAge: number, toAge: number, p: Pal): number {
  const i = col(p);
  let sum = 0;
  let n = 0;
  for (let age = fromAge; age <= toAge; age++) {
    const b = EER_BOYS[age];
    const g = EER_GIRLS[age];
    if (!b || !g) throw new Error(`No EER row for age ${age}`);
    sum += b[i] + g[i];
    n += 2;
  }
  return sum / n;
}

/** 기준값 = 5–12세 남녀 평균 at PAL p. */
export function referenceEer(p: Pal): number {
  return meanEer(REFERENCE_AGES[0], REFERENCE_AGES[1], p);
}

/** 반올림 **전** 배율. 아이 나이대는 PAL `p`(기본 1.6), 성인은 정의대로 1.4·1.8 두 쌍의 평균. */
export function rawBandFactor(band: PortionBand, p: Pal = CHILD_PAL): number {
  if (band === "adult") {
    const sedentary = (EER_ADULT.male.sedentary + EER_ADULT.female.sedentary) / 2 / referenceEer(1.4);
    const moderate = (EER_ADULT.male.moderate + EER_ADULT.female.moderate) / 2 / referenceEer(1.8);
    return (sedentary + moderate) / 2;
  }
  const [a, b] = BAND_AGES[band];
  return meanEer(a, b, p) / referenceEer(p);
}

const round2 = (x: number) => Math.round(x * 100) / 100;

/**
 * 화면에 찍는 배율 = 계산에 쓰는 배율. 둘이 같아야 「라벨 × 기준값 = 청구액」이 성립한다.
 * standard는 5–12/5–12라 정확히 1이다.
 */
export const PORTION_BAND_FACTORS: Readonly<Record<PortionBand, number>> = Object.fromEntries(
  PORTION_BANDS.map((b) => [b, round2(rawBandFactor(b))]),
) as Record<PortionBand, number>;

export function isPortionBand(v: unknown): v is PortionBand {
  return typeof v === "string" && (PORTION_BANDS as readonly string[]).includes(v);
}

/** 신뢰하지 않는 입력(요청 본문·저장분) → 나이대. 모르는 값은 기준(standard). */
export function normalizePortionBand(v: unknown): PortionBand {
  return isPortionBand(v) ? v : DEFAULT_PORTION_BAND;
}

export function bandFactor(band: PortionBand = DEFAULT_PORTION_BAND): number {
  return PORTION_BAND_FACTORS[normalizePortionBand(band)];
}

/**
 * 한 집에서 같은 식단을 도시락 **여러 개**로 쌀 때(2026-10-26, 「아이 둘, 나이가 다르다」 문의).
 * 메뉴는 같고 양만 아이마다 다르다 — 재료 몫에 곱하는 배율이 **각 나이대 배율의 합**이 된다.
 * 배율이 몫에 선형으로 곱해지므로 원가·절약액·장보기 몫이 「나이대별로 따로 매긴 값의 합」과 같다.
 *
 * 단일 값(`PortionBand`)은 도시락 한 개다 — 기존 호출부는 그대로 둔다.
 */
export type Portions = PortionBand | readonly PortionBand[];

/** 1번 도시락까지 포함한 최대 개수. */
export const MAX_LUNCHBOXES = 4;

/** 몫에 곱하는 배율. 여러 개면 **화면에 찍힌 배율**(2자리)의 합이다 — 「라벨의 합 × 기준값 = 청구액」. */
export function portionsFactor(p: Portions = DEFAULT_PORTION_BAND): number {
  if (typeof p === "string") return bandFactor(p);
  return round2(p.reduce((sum, b) => sum + bandFactor(b), 0));
}

export function boxCount(p: Portions): number {
  return typeof p === "string" ? 1 : p.length;
}

/** 계획 조건(1번 나이대 + 추가 도시락) → 계산에 넘길 값. 추가가 없으면 예전과 같은 단일 값이다. */
export function portionsOf(band: PortionBand, extraBoxes: readonly PortionBand[] = []): Portions {
  return extraBoxes.length ? [band, ...extraBoxes] : band;
}

/** 신뢰하지 않는 입력 → 추가 도시락(2번부터). 모르는 값은 기준으로, 개수는 한도까지 자른다. */
export function normalizeExtraBoxes(v: unknown): PortionBand[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, MAX_LUNCHBOXES - 1).map(normalizePortionBand);
}

/** 「×1.76」 — 여러 개면 합 배율. */
export function portionsLabel(p: Portions): string {
  return `×${portionsFactor(p).toFixed(2)}`;
}

/** 「×1.39」 */
export function bandFactorLabel(band: PortionBand): string {
  return `×${bandFactor(band).toFixed(2)}`;
}

/** FAQ 문구에 넘기는 값 — 숫자를 문구에 손으로 적지 않게. */
export function portionBandFigures(): Record<string, string> {
  return Object.fromEntries(
    PORTION_BANDS.filter((b) => b !== "standard").map((b) => [`${b}Factor`, bandFactor(b).toFixed(2)]),
  );
}

/**
 * 「Kindy (under 5)」를 **새로 켰을 때만** 양을 Kindy로 맞춘다. 끄는 것은 아무것도 강제하지 않는다 —
 * 사용자가 그사이 고른 값을 되돌리지 않는다.
 */
export function bandAfterAllergyToggle(
  before: readonly string[],
  after: readonly string[],
  current: PortionBand,
): PortionBand {
  const turnedOn = !before.includes("Kindy") && after.includes("Kindy");
  return turnedOn ? "kindy" : current;
}
