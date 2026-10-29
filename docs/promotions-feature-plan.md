# Weekly Supermarket Promotions — Feature Plan (Draft)

> 매주 NZ 마트 세일 정보를 받아서 도시락 플래너에 통합하는 기능.
> AdSense 승인 후 본격 개발 예정. 지금은 설계 단계.

---

## 1. 사용자 시나리오 (Why)

**현재 NZ 부모의 하루**:
1. 월요일 아침 — 마트 3곳에서 "이번 주 특가" 메일 도착
2. 메일 3개를 각각 열어 비교 (어디가 우유/치즈/고기 더 싼지)
3. 도시락 메뉴 따로 짜고, 세일 정보는 별개로 활용
4. 결과: 세일 활용 못 하거나, 활용해도 시간 많이 듦

**Kiwi Lunchbox로 가능해질 것**:
1. 사용자가 받은 메일을 사이트에 paste (5분)
2. 플래너에서 "Use this week's sales" 토글
3. 단골 마트 선택 (또는 "best deal across all stores")
4. **세일 상품을 우선 활용한 5일치 식단 + 쇼핑 리스트** 자동 생성
5. 절약된 금액 표시 ("This week saved you $14.20 vs regular prices")

**차별화 포인트**: 어떤 도시락 플래너도 "이번 주 실제 세일" 기반 식단을 안 함. NZ 부모에게 진짜 가치.

---

## 2. 데이터 흐름 (How) — 2026-04-28 sample 분석 후 갱신

**중요 발견**: NZ 마트 (Woolworths, Pak'nSave, New World)의 mailer는
**텍스트 메일이 아니라 이미지 기반 웹페이지** (salefinder.co.nz 호스팅).
Pages 1, 2, 3, 4 처럼 카탈로그 형태로 렌더링됨. → "텍스트 paste" 워크플로우
부적합. **AI Vision 또는 직접 입력**으로 변경.

```
[사용자가 마트 mailer 페이지 받음 — 월요일]
       ↓
[mailer 페이지를 스크린샷 또는 이미지 저장]
       ↓
[/admin/promotions 페이지에 이미지 업로드 (페이지마다)]
       ↓
[AI Vision (Gemini Pro Vision 또는 Claude Vision)]
   - 상품명, 정가, 세일가, 할인율 추출
   - promoType 자동 분류 (sale vs points/Boost)
       ↓
[자동 필터: lunchboxFit 분류]
   - 도시락 적합 (예: potato, bacon) → lunchbox
   - 디저트 정도 (예: chocolate) → snack-only
   - 부적합 (예: energy drink, alcohol, peanut, frozen) → excluded
       ↓
[사용자 컨펌 단계: 이상한 분류 수정]
       ↓
[Confirm → data/promotions.json 갱신 + auto commit]
       ↓
[플래너에서 그 주 lunchbox 적합 항목만 활용]
```

**결정 사항**:
- mailer가 이미지/카탈로그 웹페이지 → **AI Vision 필수** (텍스트 추출 불가)
- AI 모델: Gemini Pro Vision (이미 `@google/generative-ai` 있음, 무료 quota 충분)
- 현실적 매칭률: 이번 주 sample 기준 mailer 50+ 항목 중 도시락 매칭 ~3개 (Perlas Potatoes, Bacon, 그리고 옵션으로 Chocolate). 알고리즘이 도시락 적합 자동 필터링이 핵심.
- **Sale (직접 할인)** vs **Points/Boost (적립 배수)** 명확히 구분. Boost는 가격 할인 아니라 도시락 비용 계산엔 영향 0 — 표시만 가능.
- 사용자가 매주 페이지별 이미지 업로드 (5~10분) → AI 1차 추출 → 컨펌 (가장 안정적)

---

## 3. 데이터 구조

> **섬별 전단(2026-10-27)** — 주차의 `stores`는 **북섬 전단**이다. 남섬 전단은 같은 주차의 `southStores`에 같은 모양(`{ woolworths, newworld }`)으로 넣는다.
> 유효기간(`validFrom`/`validUntil`)은 두 섬이 같이 쓴다. `southStores`가 없거나 비면 플래너에서 남섬을 고른 사람은
> 「남섬 전단이 아직 없다」를 보고 정가로 계획한다 — 🔴**북섬 특가를 대신 주지 않는다**(`lib/promotions.ts` `storesFor`).

`data/promotions.json` — 단일 파일, 주차별 keyed

스키마: `data/promotions.types.ts` 참조

**예시**:
```json
{
  "currentWeek": "2026-04-28",
  "weeks": {
    "2026-04-28": {
      "validFrom": "2026-04-28",
      "validUntil": "2026-05-04",
      "stores": {
        "paknsave": [...],
        "woolworths": [...],
        "newworld": [...]
      }
    }
  }
}
```

각 promotion 항목:
```json
{
  "name": "Anchor Butter 500g",
  "category": "Dairy & Eggs",
  "regularPrice": 8.50,
  "salePrice": 5.99,
  "savings": 2.51,
  "savingsPercent": 30,
  "matchKey": "butter"
}
```

**`matchKey`**: 도시락 플래너의 ingredient name과 매칭하는 키. 메뉴 데이터의 ingredient list가 "butter", "cheese block" 같은 정규화된 이름이라 동일하게.

---

## 4. UI 변경

### 4-1. 플래너 사이드바 (`components/PlannerClient.tsx`)

기존 옵션 (alergies, exclude, leftovers) 아래에 추가:

```
─────────────────────────────
🔖 This Week's Sales

☑ Prioritise sale items

Choose store(s):
☐ Pak'nSave   ☐ Woolworths   ☐ New World
☑ Best deal across all stores

Estimated savings: $—.——
─────────────────────────────
```

토글 켜면:
- planGenerator가 세일 상품 우선 활용
- 결과 카드에 🔖 마크 + "On sale at Pak'nSave"
- 쇼핑 리스트 하단에 "Total savings: $14.20"

### 4-2. 별도 페이지 (선택)

`/[locale]/this-week-sales` — 이번 주 세일 상품 일람 + 추천 메뉴
- AdSense 승인 후 강력한 콘텐츠 페이지가 됨
- 매주 자동 갱신되는 신선한 콘텐츠

### 4-3. 관리자 페이지 (사용자 본인용)

`/[locale]/admin/promotions` (인증 필요, Yong Jae Lee만)
- 메일 본문 paste 박스 (마트별)
- "AI로 추출" 버튼
- 추출 결과 JSON 미리보기 + 수정
- "이번 주 데이터로 저장" → JSON 업데이트 + GitHub auto commit

---

## 5. 알고리즘 변경 (`lib/planGenerator.ts`)

### 5-1. 현재 동작
```
1. 가용 메뉴 리스트 (allergies/excludes 필터 적용)
2. 우선 메뉴 (favorites + leftover에 매칭) + 일반 메뉴 셔플
3. 5개 선택
```

### 5-2. 추가될 동작 (sales 토글 ON 시)
```
1. (위와 동일)
2. 우선 메뉴 + 세일 매칭 메뉴(sale-bonus) + 일반 메뉴
3. 5개 선택 시 세일 매칭 메뉴 가중치 +N%
4. 결과 메뉴마다 "saleIngredients" 배열 부착
5. 쇼핑 리스트 생성 시 가격을 정가 vs 세일가 비교
6. 총 절약 금액 계산
```

**가중치 결정**: 영양 균형 깨지지 않을 정도로 적당히 (예: 30%). 너무 강하면 세일만 쫓아 영양 무너짐.

---

## 6. 마일스톤

### Phase 0 (지금): 설계
- [x] 큰 그림 합의
- [x] 데이터 스키마 초안 작성 (`data/promotions.json`)
- [x] TypeScript 타입 정의 (`data/promotions.types.ts`)
- [x] **Woolworths NZ North Island 4/27 mailer sample 분석** (2 페이지 카탈로그)
  - 발견: 이미지 기반 mailer → AI Vision 워크플로우로 변경
  - 발견: mailer 50+ 항목 중 도시락 매칭 ~3개 (Pak'nSave/Woolworths는 비식품/가공식품 위주)
  - 추가 promo 타입: "Boost 10x points" (적립 배수, 가격 할인 아님)
- [x] **New World NZ North Island 4/27 mailer sample 분석** (28 페이지 카탈로그)
  - 발견: 페이지 구조 분명 (Lunch inspiration 페이지 12-13 = 도시락 핵심)
  - 발견: 도시락 매칭 22개+ (Woolworths 대비 풍부) — Fresh produce + Lunch 전용 페이지
  - 추가 promo 타입: "Club Deal" (회원 전용 가격), "Everyday Low Price" (정가 자체 저렴)
  - 페이지 카테고리 분포: 도시락 관련 ~50%, 저녁/주류/비식품 ~50%
  - **핵심 인사이트**: AI Vision으로 페이지별 분류 → 도시락 페이지만 정밀 추출이 효율적
- [x] PromoType 확장: "sale" | "club" | "points" | "everyday-low"
- [x] 실제 데이터로 promotions.json sample 1주차 채움 (Woolworths 9 + New World 30 = 39개)
- [x] Pak'nSave mailer 수집 시도 → 자동 접근 어려움 + 마케팅 전략상 발행 약함 → Phase 1에서 제외 결정
- [ ] **사용자**: 사이드바 UI 와이어프레임 검토

### 마트별 promo 패턴 비교 (2026-04-27 sample 기준)

| 마트 | mailer 페이지 수 | 도시락 매칭 | 특징 |
|-----|------------|----------|------|
| Woolworths | 4 (mailer 페이지) | 3개 | Boost(적립) 비중 높음, 비식품 많음 |
| New World | 28 (카탈로그) | 22개+ | Lunch inspiration 전용 페이지, NZ produce 강조 |
| **Pak'nSave** | **수집 어려움** | **N/A** | **"Always Low Prices" 마케팅 — weekly mailer 발행 약함** |

### Pak'nSave 데이터 수집 어려움 (2026-04-28 조사 결과)

5개 외부 호스팅 사이트 + 공식 사이트 시도:
- `paknsave.co.nz/deals` → 403 (자동 접근 차단)
- `oferlo.nz/pak-n-save/...10189` → 이미지 호스팅 OK but Thumbor 보안 토큰 페이지마다 동적
- `kimbino.nz`, `promotheus.nz`, `cataloguenz.com`, `tiendeo.co.nz` → 모두 인덱스 또는 로딩 화면만

**결론**: Pak'nSave는 마케팅 전략상 weekly sale 광고를 안 하는 마트.
다른 마트가 "이번 주 SALE!"로 트래픽 끌 때 Pak'nSave는 "정가 자체가 저렴"
포지셔닝 → mailer 발행 자체가 약함.

**Phase 1 결정 (잠정)**: Pak'nSave는 sale 입력 시스템에서 제외.
대신 기존 `scripts/update_prices.mjs` 자동 수집 데이터로 일반 가격 표시.
UI에 "Pak'nSave는 always-low-price 정책" 라벨 표시.

### Phase 1: 데이터 인프라 (AdSense 승인 후)
- [ ] `/admin/promotions` 페이지 (인증)
- [ ] AI 메일 파싱 API (`/api/promotions/parse`)
- [ ] JSON 갱신 + GitHub commit 로직
- [ ] 첫 주 실데이터 입력

### Phase 2: 플래너 통합
- [ ] PlannerClient UI 추가 (토글 + 마트 선택)
- [ ] planGenerator 알고리즘 수정
- [ ] 결과 카드에 sale 마크
- [ ] 쇼핑 리스트 절약 표시

### Phase 3: 별도 페이지
- [ ] `/this-week-sales` 페이지
- [ ] 매주 자동 sitemap 갱신
- [ ] OG 이미지 동적 생성

### Phase 4: 검증
- [ ] 4주 연속 운영 (실제 메일 → 데이터 입력 → 플래너 작동)
- [ ] 정확도 측정 (AI 파싱 오류율)

---

## 7. 결정 필요 (사용자 채워주세요)

- [x] **메일 형식 확인**: 이미지 기반 mailer (salefinder.co.nz 호스팅, 페이지별 카탈로그). 텍스트 paste 불가 → AI Vision 필요. (2026-04-28 sample 분석 완료)
- [ ] **단골 마트**: 가장 자주 가는 마트 1~2곳? (Phase 1에서 그곳부터 우선 지원)
- [ ] **자동 commit 권한**: GitHub bot이 이미 있으니 활용 가능
- [ ] **인증 방식**: 본인만 admin 페이지 접근 — Supabase Auth + email 화이트리스트?
- [ ] **무료 티어 한계**: Gemini Pro Vision 무료 티어 quota — 페이지당 1회 호출, 마트 3곳 × 4페이지 = 주 12회. 무료 quota 내 (Gemini 1.5 Pro 기준 분당 60회).
- [ ] **AI Vision 정확도 검증**: Phase 1 시작 시 첫 주 데이터로 AI 1차 추출 → 사람 컨펌 결과 비교. 정확도 90% 미만이면 보강.

---

## 8. 리스크 / 우려

- **AI 파싱 정확도**: 메일 형식이 매주 비슷하면 정확. 변동 클수록 후처리 필요.
- **마트 정책**: 세일 가격을 사이트에 게시하는 것이 마트 약관 위반? — 메일로 받은 정보를 사용자가 직접 활용하는 형태라 문제 없을 가능성 높음 (스크래핑 아님). 그래도 약관 한 번 확인.
- **데이터 신선도**: 메일 입력 늦으면 그 주 사용 못 함 → 사용자(본인)가 매주 월요일 5분 의지 필요.
- **AdSense 영향**: 새 기능 자체는 콘텐츠 양산 아니라 OK. 다만 출시 시점 조절.

---

## 9. 추가 아이디어 (살 붙이실 곳)

- [ ] (사용자 추가)
- [ ] (사용자 추가)
- [ ] (사용자 추가)
