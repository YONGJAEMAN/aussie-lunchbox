#!/bin/zsh
# Aussie 주간 가격 수집 — **이 기계에서** 돈다(launchd `ops/aussie-prices.plist`, 일 19:00 NZ).
#
# 🔴 왜 로컬인가: Woolworths AU는 Akamai 뒤라 GitHub 러너에서 막힌다(Aussie 캐시가 08-16부터
#    146개 전부 「Est. (Fallback)」이었던 이유). 이 Mac에서는 1.5초 간격으로 197개를 받아도 200이었다(2026-10-30).
#    챌린지 우회는 하지 않는다.
# ⚠️ Kiwi 수집(일 18:00 NZ)과 한 시간 띄운다 — 둘 다 끝에 vitest 전체를 돌린다.
# Actions 「Weekly Price Check」(목)는 테스트·타입·10일 신선도만 본다. 이게 안 돌면 열흘 안에 거기서 빨개진다.
set -uo pipefail

REPO="/Volumes/For MAC APP/Dev Projects/aussie-lunchbox"
say() { print -r -- "$(date '+%H:%M:%S') $*"; }

print -r -- ""
print -r -- "━━ Aussie 주간 가격 수집 · $(date '+%Y-%m-%d %H:%M') ━━"

# 🔴 저장소가 외장 볼륨에 있다. 안 붙어 있으면 조용히 성공한 척하지 않는다.
if [[ ! -d "$REPO/.git" ]]; then
  say "❌ 저장소를 찾을 수 없다: $REPO"
  say "   외장 볼륨이 안 붙어 있을 가능성이 크다. 이번 주는 건너뛴다."
  exit 1
fi
cd "$REPO" || exit 1

if [[ -n "$(git status --porcelain -- data lib content messages)" ]]; then
  say "❌ 작업 트리에 커밋 안 된 변경이 있다 — 덮어쓰지 않고 멈춘다."
  git status --short -- data lib content messages
  exit 1
fi

# ⚠️ 브랜치를 바꾸지 않는다 — 사용자가 작업 중일 수 있다. main이 아니면 이번 주는 건너뛴다.
branch="$(git branch --show-current)"
if [[ "$branch" != "main" ]]; then
  say "⏭ 현재 브랜치가 '$branch'다 — main이 아니라서 건너뛴다."
  exit 0
fi
git pull -q --rebase origin main || { say "❌ pull 실패"; exit 1; }

# 수집기는 성공률 80% 미만이면 파일을 안 쓰고 exit 1, 못 읽은 재료는 이전 실가격을 남긴다.
say "▶ 플래너 캐시(Woolworths AU)"
if node scripts/update_prices.mjs >/tmp/aussie_price_step.log 2>&1; then
  say "  ✅ $(grep -E 'Fetched|Fallback used|유지' /tmp/aussie_price_step.log | tr '\n' ' ' | cut -c1-160)"
else
  say "  ❌ 수집 실패(파일 안 씀) — $(tail -3 /tmp/aussie_price_step.log | tr '\n' ' ' | cut -c1-160)"
  exit 1
fi

# 가격지수·시계열(3단계, 2026-10-30) — 지수는 80% 미만이면 파일도 날짜도 안 바꾼다. 실패해도 플래너 캐시는 민다.
for step in \
  "가격지수 Woolworths:node scripts/update_price_index.mjs --write" \
  "시계열 기록:node scripts/update_price_history.mjs --write"
do
  name="${step%%:*}"; cmd="${step#*:}"
  say "▶ $name"
  if eval "$cmd" >/tmp/aussie_price_step.log 2>&1; then
    say "  ✅ $(grep -E '갱신 |적재 ' /tmp/aussie_price_step.log | head -1 | cut -c1-140)"
  else
    say "  ⚠️  $name 실패 (기존 값 유지) — $(tail -2 /tmp/aussie_price_step.log | tr '\n' ' ' | cut -c1-120)"
  fi
done

if [[ -z "$(git status --porcelain -- data)" ]]; then
  say "변경 없음 — 커밋하지 않는다."
  exit 0
fi

# 🔴 가격이 바뀌면 본문·문구의 수치(중앙값 등)가 거짓이 될 수 있다. 그대로 밀지 않는다.
say "▶ 타입 검사"
npm run --silent typecheck || { say "❌ tsc 실패 — 밀지 않는다"; exit 1; }
say "▶ 본문 수치 검사"
if ! npx vitest run >/tmp/aussie_price_test.log 2>&1; then
  say "❌ vitest 실패 — **밀지 않는다.** 새 가격과 본문 수치가 어긋났다."
  grep -E "AssertionError|Tests " /tmp/aussie_price_test.log | head -12
  say "   수집분은 작업 트리에 남아 있다. 문구를 고친 뒤 직접 커밋할 것."
  exit 1
fi
say "  ✅ $(grep -E 'Tests ' /tmp/aussie_price_test.log | tail -1)"

git add data/price_cache.json data/price_cache_review.txt data/priceIndex.json data/priceHistory.json data/price_index_review.txt
# 작성자 이메일은 GitHub 계정에 붙은 주소여야 한다 — 아니면 Vercel이 배포를 막는다(Kiwi 09-13·09-27).
git -c user.name="Aussie price cron (local)" -c user.email="133712935+YONGJAEMAN@users.noreply.github.com" \
    commit -q -m "🛒 주간 가격 업데이트 ($(date '+%Y-%m-%d'), 로컬 수집)"

for attempt in 1 2 3; do
  if git pull --rebase -q origin main && git push -q origin main; then
    say "✅ push 성공 (시도 $attempt)"; exit 0
  fi
  git rebase --abort 2>/dev/null || true
  say "  push 실패 — 재시도 $attempt/3"; sleep 10
done
say "❌ 3회 재시도에도 push 실패 — 이번 주 관측이 유실된다."
exit 1
