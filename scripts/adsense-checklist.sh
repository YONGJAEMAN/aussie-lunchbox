#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# AdSense 재신청 전 최종 점검 스크립트
# Usage: bash scripts/adsense-checklist.sh
# ─────────────────────────────────────────────────────────
set -uo pipefail

# 🔴 2026-08-22: 여기가 `/Users/yongjaelee/kiwi-lunchbox-next`로 박혀 있었다.
# 저장소는 2026-06월말에 외장으로 옮겼고, 그때부터 이 스크립트는 **없는 파일을 grep하며
# "🔴 실패 항목 7개"를 찍고 있었다.** 재신청 직전에 돌릴 바로 그 도구가 두 달째
# 항상 빨간불이었으니, 켜 두나 마나였다. 이제 자기 위치에서 저장소 루트를 찾는다.
KIWI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Aussie는 별도 저장소이고 없을 수 있다. 없으면 그 항목은 SKIP으로 빠진다(아래 참조).
AUSSIE_DIR="${AUSSIE_DIR:-$(dirname "$KIWI_DIR")/aussie-lunchbox}"

# 🔴 파일이 없는 것과 검사에 실패한 것은 다르다. 섞으면 위 사고가 반복된다.
require_file() {
  if [ ! -f "$1" ]; then
    echo "  ${WARN:-⚠️} SKIP — 파일 없음: $1"
    return 1
  fi
  return 0
}
KIWI_URL="https://aussielunchbox.com"
AUSSIE_URL="https://aussielunchbox.com"  # www는 307로 여기로 온다
OUTPUT="$KIWI_DIR/checklist.md"

PASS="✅"
FAIL="🔴"
WARN="⚠️"
pass_count=0
fail_count=0
warn_count=0

results=()

# ─── Helper ──────────────────────────────────────────────
check() {
  local num="$1" title="$2" status="$3" detail="$4"
  if [[ "$status" == "PASS" ]]; then
    results+=("| $num | $PASS | **$title** | $detail |")
    pass_count=$((pass_count + 1))
  elif [[ "$status" == "FAIL" ]]; then
    results+=("| $num | $FAIL | **$title** | $detail |")
    fail_count=$((fail_count + 1))
  else
    results+=("| $num | $WARN | **$title** | $detail |")
    warn_count=$((warn_count + 1))
  fi
}

echo "🔍 AdSense 재신청 전 최종 점검 시작..."
echo ""

# ─── 1. Aussie noindex 상태 확인 ─────────────────────────
echo "[1/10] Aussie Lunchbox noindex 확인..."
aussie_layout="$AUSSIE_DIR/app/[locale]/layout.tsx"
aussie_robots="$AUSSIE_DIR/app/robots.ts"
aussie_sitemap="$AUSSIE_DIR/app/sitemap.ts"

noindex_ok=true
detail_parts=()

# 🔴 2026-08-22: 이 검사가 두 군데서 **틀린 걸 요구하고 있었다**(라이브 실측으로 확인).
#   1) `follow: false`까지 요구했다. Aussie는 `noindex, follow`인데 그게 맞는 설정이다 —
#      색인만 막고 링크는 따라가게 두는 것. nofollow까지 걸 이유가 없다.
#   2) robots.txt에 `disallow /`를 요구했다. **그러면 구글이 noindex 태그 자체를 못 본다.**
#      크롤을 막으면 색인 제거가 오히려 늦어진다. 크롤 허용 + noindex가 정답이다.
# 그래서 기준을 뒤집었다: noindex는 있어야 하고, robots.txt는 막으면 **안 된다**.
if ! require_file "$aussie_layout"; then
  detail_parts+=("Aussie 저장소 없음 — 건너뜀")
elif grep -qE 'index: (false|!SITE_NOINDEX)' "$aussie_layout"; then
  # 🔴 2026-08-23: 여기가 `index: false`라는 **문자열만** 봤다. 그날 Aussie가
  #    robots·광고·sitemap을 `SITE_NOINDEX` 하나로 묶으면서 `index: !SITE_NOINDEX`가
  #    됐고, 동작은 같은데 이 검사가 "noindex 누락"이라고 찍었다.
  #    문자열이 아니라 **라이브 결과**로 판정하는 게 맞다(아래 광고 코드 검사 참조).
  detail_parts+=("layout noindex ✓")
else
  detail_parts+=("layout noindex 누락")
  noindex_ok=false
fi

if ! require_file "$aussie_robots"; then
  :
elif grep -q 'disallow.*"/"' "$aussie_robots"; then
  detail_parts+=("🔴 robots.txt가 크롤을 막는다 — noindex가 안 보인다")
  noindex_ok=false
else
  detail_parts+=("robots 크롤 허용 ✓")
fi

if ! require_file "$aussie_sitemap"; then
  :
elif grep -qE 'return \[\]' "$aussie_sitemap"; then
  # 소스에 더해 **라이브 sitemap의 URL 수**도 센다 — 빈 배열을 적어 놓고
  # 배포를 안 했으면 소스만 보는 검사는 거짓 통과를 준다.
  # 🔴 `grep -c`는 **0건일 때 exit 1**이다. `|| echo "?"`를 붙이면 "0"과 "?"가 같이
  #    담겨 비교가 항상 실패한다 — 실제로 그래서 빨간불이 났다. `|| true`로 받는다.
  live_sitemap=$(curl -sL --max-time 25 "$AUSSIE_URL/sitemap.xml" 2>/dev/null || true)
  live_locs=$(grep -c "<loc>" <<<"$live_sitemap" || true)
  live_locs=${live_locs:-?}
  if [[ "$live_locs" == "0" ]]; then
    detail_parts+=("sitemap 빈 배열 ✓ (라이브 0 URL)")
  else
    detail_parts+=("🔴 소스는 빈 배열인데 라이브 sitemap에 ${live_locs}개 — 미배포")
    noindex_ok=false
  fi
else
  detail_parts+=("🔴 sitemap이 비어있지 않다 — noindex 페이지를 색인 요청하고 있다")
  noindex_ok=false
fi

# 🔴 2026-08-22 신설: 두 사이트가 같은 AdSense 계정(pub-2079938386322416)이다.
#    Kiwi에서 `/search`(본문 31단어)에 광고 코드가 나가던 걸 이날 고쳤는데,
#    Aussie는 **전 페이지가 noindex인데도** 광고 코드를 싣고 있었다(라이브 실측).
if ! require_file "$aussie_layout"; then
  :
else
  # 🔴 2026-08-23: 여기가 소스에 `googlesyndication` 문자열이 있느냐만 봤다.
  #    그 문자열은 **조건부 블록 안에** 있어서, 조건을 껐는데도 계속 빨간불이었다.
  #    소스는 프록시다 — **라이브가 실제로 무엇을 내보내는가**로 판정한다.
  aussie_html=$(curl -sL --max-time 25 "$AUSSIE_URL/" 2>/dev/null || echo "")
  if [[ -z "$aussie_html" ]]; then
    detail_parts+=("⚠️ 라이브 응답 없음 — 광고 코드 확인 불가")
  elif grep -q 'googlesyndication' <<<"$aussie_html"; then
    detail_parts+=("🔴 noindex 사이트인데 라이브에 광고 코드가 나간다")
    noindex_ok=false
  else
    detail_parts+=("라이브 광고 코드 없음 ✓")
  fi
fi

if $noindex_ok; then
  check 1 "Aussie noindex 상태" "PASS" "${detail_parts[*]}"
else
  check 1 "Aussie noindex 상태" "FAIL" "${detail_parts[*]}"
fi

# ─── 2. Kiwi 블로그 개수 확인 ────────────────────────────
echo "[2/10] Kiwi 블로그 포스트 개수 확인..."
posts_file="$KIWI_DIR/content/posts.ts"
post_count=$(grep -cE '^[[:space:]]+"[a-z0-9-]+": \{' "$posts_file" || echo "0")

# 🔴 2026-08-22: 이 검사가 12~15개를 "목표"로 두고 **17개를 경고로 찍고 있었다.**
#    좋은 글이 많은 게 문제일 리 없다. 익숙한 경고는 진짜 위반을 가린다 —
#    하한만 본다. (0이면 파싱이 깨진 것이므로 그건 실패다.)
POST_FLOOR=12
if [[ $post_count -ge $POST_FLOOR ]]; then
  check 2 "블로그 분량 (하한 ${POST_FLOOR})" "PASS" "현재 ${post_count}개 포스트"
elif [[ $post_count -gt 0 ]]; then
  check 2 "블로그 분량 (하한 ${POST_FLOOR})" "WARN" "현재 ${post_count}개 — 하한 ${POST_FLOOR} 미만"
else
  check 2 "블로그 분량 (하한 ${POST_FLOOR})" "FAIL" "포스트 수 파악 실패 (파서가 깨졌다)"
fi

# ─── 3. About 페이지 실명 + LinkedIn 확인 ─────────────────
echo "[3/10] About 페이지 실명 + LinkedIn 확인..."
about_file="$KIWI_DIR/app/[locale]/about/page.tsx"
has_name=false
has_linkedin=false

if grep -q "Yong Jae Lee" "$about_file"; then has_name=true; fi
if grep -q "linkedin.com" "$about_file"; then has_linkedin=true; fi

if $has_name && $has_linkedin; then
  check 3 "About 실명 + LinkedIn" "PASS" "Yong Jae Lee + LinkedIn 링크 확인"
elif $has_name; then
  check 3 "About 실명 + LinkedIn" "FAIL" "실명 있으나 LinkedIn 링크 누락"
else
  check 3 "About 실명 + LinkedIn" "FAIL" "실명 또는 LinkedIn 누락"
fi

# ─── 4. 블로그 저자 통일 확인 ─────────────────────────────
echo "[4/10] 블로그 저자 통일 확인..."
unique_authors=$(grep -oE 'author:[[:space:]]*"[^"]*"' "$posts_file" | sort -u)
author_count=$(echo "$unique_authors" | wc -l | tr -d ' ')
author_names=$(echo "$unique_authors" | sed 's/author:[[:space:]]*"//;s/"//' | tr '\n' ', ' | sed 's/,$//')

if [[ $author_count -eq 1 ]]; then
  check 4 "블로그 저자 통일" "PASS" "모든 글 저자: $author_names"
else
  check 4 "블로그 저자 통일" "FAIL" "저자 ${author_count}명 발견: $author_names"
fi

# ─── 5. 내부 링크 404/410 확인 (소스코드 기반) ────────────
echo "[5/10] 내부 링크 무결성 확인..."

# 블로그 슬러그 목록
blog_slugs=$(grep -oE '^[[:space:]]+"([a-z0-9-]+)": \{' "$posts_file" | sed 's/.*"\(.*\)".*/\1/' || true)

# 블로그 본문에서 /blog/ 내부 링크 추출
internal_blog_refs=$(grep -oE '/blog/[a-z0-9-]+' "$posts_file" 2>/dev/null || true)

broken_links=()
if [[ -n "$internal_blog_refs" ]]; then
  while IFS= read -r ref; do
    slug=$(echo "$ref" | sed 's|/blog/||')
    if [[ -n "$slug" ]] && ! echo "$blog_slugs" | grep -qx "$slug"; then
      broken_links+=("$slug")
    fi
  done <<< "$internal_blog_refs"
fi

# next.config.ts redirects 목적지 확인
redirect_dests=$(grep -oE 'destination:[[:space:]]*"[^"]*"' "$KIWI_DIR/next.config.ts" | sed 's/destination:[[:space:]]*"//;s/"//' || true)

broken_redirects=()
if [[ -n "$redirect_dests" ]]; then
  while IFS= read -r dest; do
    dest_slug=$(echo "$dest" | grep -oE '/blog/[a-z0-9-]+' | sed 's|/blog/||' || true)
    if [[ -n "$dest_slug" ]] && ! echo "$blog_slugs" | grep -qx "$dest_slug"; then
      broken_redirects+=("$dest → 존재하지 않는 글")
    fi
  done <<< "$redirect_dests"
fi

link_issues=()
if [[ ${#broken_links[@]} -gt 0 ]]; then
  link_issues+=("본문 내 끊어진 링크 ${#broken_links[@]}개: ${broken_links[*]}")
fi
if [[ ${#broken_redirects[@]} -gt 0 ]]; then
  link_issues+=("끊어진 redirect ${#broken_redirects[@]}개")
fi

if [[ ${#link_issues[@]} -eq 0 ]]; then
  check 5 "내부 링크 무결성" "PASS" "끊어진 링크 없음"
else
  check 5 "내부 링크 무결성" "FAIL" "$(IFS='; '; echo "${link_issues[*]}")"
fi

# ─── 6. sitemap.ts 확인 ──────────────────────────────────
echo "[6/10] sitemap.ts 확인..."
kiwi_sitemap="$KIWI_DIR/app/sitemap.ts"
sitemap_issues=()

grep -q "price-index" "$kiwi_sitemap" || sitemap_issues+=("/price-index 누락")

for route in planner about contact blog guides; do
  grep -q "/$route" "$kiwi_sitemap" || sitemap_issues+=("/$route 누락")
done

grep -q "BLOG_SLUGS" "$kiwi_sitemap" || sitemap_issues+=("블로그 동적 생성 누락")

if [[ ${#sitemap_issues[@]} -eq 0 ]]; then
  check 6 "sitemap.ts 구성" "PASS" "정적 라우트 + 블로그 + 가이드 + price-index 포함"
else
  check 6 "sitemap.ts 구성" "FAIL" "$(IFS=', '; echo "${sitemap_issues[*]}")"
fi

# ─── 7. robots.ts 확인 ───────────────────────────────────
echo "[7/10] robots.ts 확인..."
kiwi_robots="$KIWI_DIR/app/robots.ts"

if [[ -f "$kiwi_robots" ]]; then
  if grep -q 'allow.*"/"' "$kiwi_robots"; then
    if grep -q "sitemap" "$kiwi_robots"; then
      check 7 "robots.ts 구성" "PASS" "allow: / + sitemap 참조 확인"
    else
      check 7 "robots.ts 구성" "WARN" "allow 있으나 sitemap 참조 누락"
    fi
  else
    check 7 "robots.ts 구성" "FAIL" "allow 규칙 없음"
  fi
else
  check 7 "robots.ts 구성" "FAIL" "robots.ts 파일 없음"
fi

# ─── 8. Privacy 페이지 광고 관련 문구 ─────────────────────
echo "[8/10] Privacy 페이지 광고 문구 확인..."
en_messages="$KIWI_DIR/messages/en.json"
privacy_file="$KIWI_DIR/app/[locale]/policies/page.tsx"
ad_keywords_found=()

for keyword in "Google" "adssettings" "advertising" "ads" "partner-sites"; do
  if grep -qi "$keyword" "$privacy_file" 2>/dev/null; then
    ad_keywords_found+=("$keyword")
  fi
done

for keyword in "advertis" "cookie" "third.party"; do
  if grep -qi "$keyword" "$en_messages" 2>/dev/null; then
    ad_keywords_found+=("msg:$keyword")
  fi
done

if [[ ${#ad_keywords_found[@]} -ge 2 ]]; then
  check 8 "Privacy 광고 문구" "PASS" "발견: ${ad_keywords_found[*]}"
else
  detail="${ad_keywords_found[*]:-없음}"
  check 8 "Privacy 광고 문구" "FAIL" "광고 관련 문구 부족 (발견: $detail)"
fi

# ─── 9. Contact 이메일 확인 ───────────────────────────────
echo "[9/10] Contact 이메일 도메인 확인..."
contact_email=$(grep -oE '"contact_email_addr":[[:space:]]*"[^"]*"' "$en_messages" | sed 's/.*"contact_email_addr":[[:space:]]*"//;s/"//' || true)

if [[ -z "$contact_email" ]]; then
  check 9 "Contact 이메일" "FAIL" "이메일 주소를 찾을 수 없음"
elif [[ "$contact_email" == *"@kiwilunchbox"* || "$contact_email" == *"@aussielunchbox"* ]]; then
  check 9 "Contact 이메일" "PASS" "$contact_email (자체 도메인)"
elif [[ "$contact_email" == *"@gmail.com"* ]]; then
  check 9 "Contact 이메일" "WARN" "$contact_email — Gmail 사용 중 (자체 도메인 권장)"
else
  check 9 "Contact 이메일" "WARN" "$contact_email — 도메인 확인 필요"
fi

# ─── 10. 모바일 반응형 확인 (Tailwind 클래스 기반) ────────
echo "[10/10] 모바일 반응형 확인..."
key_pages=(
  "$KIWI_DIR/app/[locale]/page.tsx"
  "$KIWI_DIR/app/[locale]/about/page.tsx"
  "$KIWI_DIR/app/[locale]/price-index/page.tsx"
  "$KIWI_DIR/app/[locale]/blog/page.tsx"
)

responsive_issues=()
for page in "${key_pages[@]}"; do
  fname=$(basename "$(dirname "$page")")/$(basename "$page")
  if [[ -f "$page" ]]; then
    resp_count=$(grep -coE '(sm:|md:|lg:|xl:)' "$page" || echo "0")
    if [[ $resp_count -lt 3 ]]; then
      responsive_issues+=("$fname: 반응형 클래스 ${resp_count}개 (부족)")
    fi
  else
    responsive_issues+=("$fname: 파일 없음")
  fi
done

layout_file="$KIWI_DIR/app/[locale]/layout.tsx"
has_viewport=false
if grep -qE "viewport|width=device-width|metadata" "$layout_file" 2>/dev/null; then
  has_viewport=true
fi

if [[ ${#responsive_issues[@]} -eq 0 ]] && $has_viewport; then
  check 10 "모바일 반응형" "PASS" "주요 페이지 Tailwind 반응형 클래스 확인"
elif [[ ${#responsive_issues[@]} -gt 0 ]]; then
  check 10 "모바일 반응형" "WARN" "$(IFS='; '; echo "${responsive_issues[*]}")"
else
  check 10 "모바일 반응형" "PASS" "Next.js 기본 viewport + Tailwind 반응형"
fi

# ─── 결과 출력 ────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cat > "$OUTPUT" << HEADER
# AdSense 재신청 전 최종 점검 결과

**점검 일시**: $(date '+%Y-%m-%d %H:%M:%S')
**Kiwi**: $KIWI_URL
**Aussie**: $AUSSIE_URL

---

## 결과 요약

| $PASS 통과 | $FAIL 실패 | $WARN 주의 |
|:---:|:---:|:---:|
| **${pass_count}** | **${fail_count}** | **${warn_count}** |

---

## 상세 점검 결과

| # | 상태 | 항목 | 상세 |
|---|:---:|------|------|
HEADER

for r in "${results[@]}"; do
  echo "$r" >> "$OUTPUT"
done

cat >> "$OUTPUT" << 'FOOTER'

---

## 재신청 전 필수 TODO

- [x] ~~`data/priceIndex.json` 실측 데이터~~ ✅ 2026-09 완료 (20행 · 빈 값 0)
- [x] ~~영수증 사진~~ ✅ `public/assets/real-paknsave-ormiston-receipt-*.jpg` 3장
      (🔴 `public/assets/receipts/`는 비어 있다 — 실제 위치는 `assets/` 바로 아래다)
- [ ] Google Search Console에서 Aussie Lunchbox URL 삭제 요청
- [ ] Vercel 배포 후 라이브 사이트에서 위 항목 재확인
- [ ] PageSpeed Insights 모바일 점수 확인 (목표: 90+)
- [ ] Gmail 주소 → 자체 도메인 이메일 변경 권장 (e.g. hello@aussielunchbox.com)

---

> 이 체크리스트는 `scripts/adsense-checklist.sh`로 생성되었습니다.
FOOTER

echo ""
cat "$OUTPUT"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 결과 저장: $OUTPUT"

if [[ $fail_count -gt 0 ]]; then
  echo ""
  echo "$FAIL 실패 항목 ${fail_count}개 — 수정 후 재신청하세요."
  exit 1
else
  echo ""
  echo "$PASS 모든 필수 항목 통과! 재신청 준비 완료."
  exit 0
fi
