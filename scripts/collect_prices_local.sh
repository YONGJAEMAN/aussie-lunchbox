#!/bin/zsh
# 주간 가격 수집 — **이 기계에서** 돈다.
#
# 🔴 왜 로컬인가 (2026-09-06): GitHub Actions에서 세 수집기 중 셋이 막힌다.
#      Pak'nSave·New World → Cloudflare 「Just a moment」 403 (buildId 추출 실패)
#      플래너 캐시        → 197건 전부 타임아웃, 성공률 0%
#    같은 스크립트가 NZ 가정용 회선에서는 전부 200이다. UA·헤더를 바꿔 봐도
#    갈리지 않았다(126/128 × 헤더 유무 4조합 전부 로컬 200). **요청이 어디서
#    나가는지**가 원인이고, 챌린지 우회는 하지 않는다.
#
# 🔴 2026-10-26: Actions에서 수집 단계를 뺐다 — **수집기는 이것 하나다.** Actions 「Weekly Price Check」
#   (목 09:00 NZ)는 테스트·타입·10일 신선도만 본다. 이게 안 돌면 열흘 안에 거기서 빨개진다.
#   (Actions가 Woolworths 열을 「다시 읽는다」던 전제는 틀렸다 — 08-23 이후 12회 중 1회만 읽었고,
#    나머지는 0/18인데 날짜만 올려 옛 값을 새 관측으로 적었다. PR #147)
set -uo pipefail

REPO="/Volumes/For MAC APP/Dev Projects/kiwi-lunchbox"
say() { print -r -- "$(date '+%H:%M:%S') $*"; }

print -r -- ""
print -r -- "━━ Kiwi 주간 가격 수집 · $(date '+%Y-%m-%d %H:%M') ━━"

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

# ⚠️브랜치를 바꾸지 않는다. 사용자가 작업 중일 수 있고, 배경 작업이 브랜치를
#   낚아채면 그게 더 큰 사고다. main이 아니면 이번 주는 건너뛴다.
branch="$(git branch --show-current)"
if [[ "$branch" != "main" ]]; then
  say "⏭ 현재 브랜치가 '$branch'다 — main이 아니라서 건너뛴다."
  say "   (작업이 끝나고 main으로 돌아오면 다음 주에 정상 수집된다)"
  exit 0
fi
git pull -q --rebase origin main || { say "❌ pull 실패"; exit 1; }

# 수집기는 실패해도 기존 값을 보존하도록 설계돼 있다(어긋난 값보다 낡은 값이 낫고,
# 낡은 건 날짜로 드러난다). 그래서 한 체인이 막혀도 나머지를 버리지 않는다.
for step in \
  "플래너 캐시:node scripts/update_prices.mjs" \
  "지수 Woolworths:node scripts/update_price_index.mjs --write" \
  "지수 Pak'nSave:node scripts/update_paknsave_prices.mjs --write" \
  "지수 New World:node scripts/update_newworld_prices.mjs --write" \
  "시계열 기록:node scripts/update_price_history.mjs --write" \
  "남섬 플래너 캐시:node scripts/update_prices.mjs --island south" \
  "남섬 Woolworths:node scripts/update_price_index.mjs --island south --write" \
  "남섬 Pak'nSave:node scripts/update_paknsave_prices.mjs --island south --write" \
  "남섬 New World:node scripts/update_newworld_prices.mjs --island south --write" \
  "남섬 시계열:node scripts/update_price_history.mjs --island south --write"
do
  name="${step%%:*}"; cmd="${step#*:}"
  say "▶ $name"
  if eval "$cmd" >/tmp/kiwi_price_step.log 2>&1; then
    say "  ✅ $(tail -3 /tmp/kiwi_price_step.log | tr '\n' ' ' | cut -c1-140)"
  else
    say "  ⚠️  $name 실패 (기존 값 유지) — $(tail -2 /tmp/kiwi_price_step.log | tr '\n' ' ' | cut -c1-120)"
  fi
done

# 남섬 파일은 처음엔 추적 전(untracked)이라 diff에 안 보인다 — status로 본다.
if [[ -z "$(git status --porcelain -- data)" ]]; then
  say "변경 없음 — 커밋하지 않는다."
  exit 0
fi

# 🔴 가격이 바뀌면 본문에 실린 수치가 거짓이 될 수 있다. 그대로 밀지 않는다.
#    (2026-08-18에 한 번 돌렸더니 게시된 주장 5건이 곧바로 거짓이 됐다.)
say "▶ 타입 검사"
npm run --silent typecheck || { say "❌ tsc 실패 — 밀지 않는다"; exit 1; }
say "▶ 본문 수치 검사"
if ! npx vitest run >/tmp/kiwi_price_test.log 2>&1; then
  say "❌ vitest 실패 — **밀지 않는다.** 새 가격과 본문 수치가 어긋났다."
  grep -E "AssertionError|Tests " /tmp/kiwi_price_test.log | head -12
  say "   수집분은 작업 트리에 남아 있다. 문구를 고친 뒤 직접 커밋할 것."
  exit 1
fi
say "  ✅ $(grep -E 'Tests ' /tmp/kiwi_price_test.log | tail -1)"

git add data/price_cache.json data/priceIndex.json data/priceHistory.json data/*_review.txt
# 남섬(2026-10-28~) — 한 열이라도 못 읽어 파일이 없을 수 있다. 없는 경로로 위 줄을 깨뜨리지 않게 따로 더한다.
for f in data/price_cache.south.json data/priceIndex.south.json data/priceHistory.south.json data/*_review.south.txt(N); do
  [[ -e "$f" ]] && git add "$f"
done
# 작성자 이메일은 GitHub 계정에 붙은 주소여야 한다 — 아니면 Vercel이 「Deployment was blocked」로
# 조용히 막는다(09-13·09-27 두 번, 라이브가 지난주 데이터에 멈췄다). Actions 봇 커밋은 통과한다.
git -c user.name="Kiwi price cron (local)" -c user.email="133712935+YONGJAEMAN@users.noreply.github.com" \
    commit -q -m "🛒 주간 가격 업데이트 ($(date '+%Y-%m-%d'), 로컬 수집)"

# Actions 크론과 겹칠 수 있다. #16과 같은 이유로 rebase 후 재시도한다.
for attempt in 1 2 3; do
  if git pull --rebase -q origin main && git push -q origin main; then
    say "✅ push 성공 (시도 $attempt)"; exit 0
  fi
  git rebase --abort 2>/dev/null || true
  say "  push 실패 — 재시도 $attempt/3"; sleep 10
done
say "❌ 3회 재시도에도 push 실패 — 이번 주 관측이 유실된다."
exit 1
