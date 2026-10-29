#!/usr/bin/env python3
"""아웃리치 회차 명단을 뽑는다.

    python3 scripts/pool_outreach.py <ckan.json> <기발송.txt> <출력.json> [N=70] [--private]

🔴 `--private` (2026-09-23) — 주립 풀이 **후보 0곳으로 소진된 뒤** 쓰는 옵션이다.
   `Private : Fully Registered`·`Charter School`을 넣고, EQI가 없어도 통과시킨다
   (사립은 EQI를 안 받는다). 기본 실행은 **이 옵션 없이는 한 글자도 안 바뀐다** —
   45차를 재현해 21/21 완전일치로 확인했다.
   ⚠️**사립의 게재율은 실측이 없다.** 아래 RATE는 주립에서 검증한 값이고,
   사립에 그대로 통한다는 근거는 없다. 점수는 순서를 정하는 용도로만 쓸 것.

🔴 왜 저장소에 있나 (2026-09-16) — 이 스크립트는 그동안 세션 스크래치패드에만
   있었다. 39차를 뽑으려고 찾았더니 **두 세션 전 임시 폴더에 우연히 남아 있어서**
   겨우 건졌다. 인수인계 문서는 `pool2.py`를 파이프라인 1단계로 적어 두고 있는데,
   그 파일은 어디에도 보장돼 있지 않았다. 명단을 만드는 도구가 사라지면
   **직전 회차를 재현할 수 없고, 재현할 수 없으면 양성 대조를 못 세운다.**

🔴 제외는 **정확한 도메인**으로 한다. 핵심이름 대조로 거르면 다른 학교가 지워진다
   (35차 재현에서 Wainuiomata Intermediate·St Mary's Wanganui가 그렇게 사라졌다).
   핵심이름이 겹치는 건 `scripts/screen_outreach.mjs`가 School_Id로 판정한다.

명부 받기:
    curl -s 'https://catalogue.data.govt.nz/api/3/action/datastore_search\
?resource_id=4b292323-9fcc-41f8-814b-3c7b19cf14b3&limit=3000' -o ckan.json
"""
import json, re, sys, statistics as st
from collections import Counter

# 유형별 게재율(%). 점수 = 이 값 × 재학생 = **기대 도달 가정수**다.
#
# 🔴 2026-09-18에 **처음으로** 실측에 대고 검증했다(발송 2,021 · 게재 45 · 전체 2.23%).
#    그전까지 이 상수들은 한 번도 결과와 대조된 적이 없다 — 회차마다 순서를 정하는 값인데도.
#
#      유형                    발송   게재   실측%   95% CI(Wilson)   가정
#      Contributing            696    22    3.16   [2.10–4.74]      3.39  ✅
#      Full Primary            761    18    2.37   [1.50–3.71]      3.39  ✅
#      Intermediate            109     2    1.83   [0.50–6.44]      2.35  ✅
#      Secondary (Year 9-15)   202     1    0.50   [0.09–2.75]      1.08  ✅
#      Secondary (Year 7-15)    87     1    1.15   [0.20–6.23]      1.08  ✅
#
#    ✅ = 가정값이 95% 구간 안에 있다. **다섯 개 전부 반증되지 않았다.**
#    ⚠️ 다만 구간이 넓다(게재가 45건뿐이다). 「맞다」가 아니라 **「틀렸다고 할 수 없다」**다.
#    게재가 80건쯤 되면 다시 볼 것.
#
# ⚠️ **재학생 규모로는 게재율이 갈리지 않는다.** ~99명 3.59%[1.90–6.67] vs 100명+ 2.04%
#    [1.48–2.81] — 구간이 겹친다. 풀이 소규모만 남았다고 회차를 접을 근거가 없다.
#
# ⚠️ 여기 없는 유형은 **통째로 제외된다**. 의도된 것이다:
#      Specialist School(미발송 33곳)  사정이 다르다
#      Correspondence School(1곳)     게시판·뉴스레터 개념이 다르다
#      Composite                      미발송 0곳 — 옛 필터로 이미 다 나갔다(139통·게재 1)
RATE = {"Contributing": 3.39, "Full Primary": 3.39, "Intermediate": 2.35,
        "Secondary (Year 9-15)": 1.08, "Secondary (Year 7-15)": 1.08}
OK_AUTH = {"State", "State : Integrated"}

# 🔴 `--private`에서만 쓴다. Composite은 옛 필터로 이미 139통이 나갔고 게재는 1건
#    (0.72%) — 전체 2.23%보다 낮다. **가정이 아니라 실측이지만 표본이 1건이라
#    구간이 매우 넓다.** 순서를 정하는 데만 쓰고, 기대값으로 읽지 말 것.
PRIVATE_RATE = {**RATE, "Composite": 0.72}
PRIVATE_AUTH = OK_AUTH | {"Private : Fully Registered", "Charter School"}


def build(records, sent_path, private=False):
    rate = PRIVATE_RATE if private else RATE
    ok_auth = PRIVATE_AUTH if private else OK_AUTH
    sent = {l.strip().lower().split("@")[-1]
            for l in open(sent_path, encoding="utf-8") if l.strip()}
    if not sent:
        sys.exit("🔴 기발송 명단이 비었다 — 이대로 뽑으면 이미 보낸 곳이 섞인다")
    out = []
    # 🔴 조용히 버리지 않는다 (2026-09-23). Taieri Beach School은 **기준 안인데**
    #    명부의 재학생이 0이라 점수 0으로 빠져 있었고, 아무도 그걸 몰랐다.
    #    버린 이유를 세어서 말한다 — 「0건」과 「안 본 것」을 섞지 않는다.
    dropped = {"eqi": [], "roll": []}
    for r in records:
        if str(r.get("Status", "")).strip() != "Open": continue
        if str(r.get("Authority", "")).strip() not in ok_auth: continue
        t = str(r.get("Org_Type") or "").strip()
        if t not in rate: continue
        em = str(r.get("Email") or "").strip()
        if "@" not in em: continue
        eqi = str(r.get("EQi_Index") or "").strip()
        # 🔴 사립은 EQI를 안 받는다. 기본 실행에서는 **예전 그대로 버린다** —
        #    여기를 느슨하게 하면 45차 재현이 깨진다.
        if not eqi.isdigit():
            if not private:
                if em.split("@")[-1].lower() not in sent: dropped["eqi"].append(r.get("Org_Name"))
                continue
            eqi = "0"
        try: roll = int(r.get("Total") or 0)
        except (TypeError, ValueError): roll = 0
        if roll <= 0:
            if em.split("@")[-1].lower() not in sent: dropped["roll"].append(r.get("Org_Name"))
            continue
        if em.split("@")[-1].lower() in sent: continue
        out.append({"id": r.get("School_Id"), "name": r.get("Org_Name"), "email": em,
                    "type": t, "roll": roll, "eqi": int(eqi),
                    "score": round(rate[t] * roll, 1)})
    out.sort(key=lambda x: (-x["score"], x["name"]))
    return out, len(sent), dropped


def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    private = "--private" in sys.argv[1:]
    ckan, sent_path, out_path = args[0:3]
    n = int(args[3]) if len(args) > 3 else 70
    records = json.load(open(ckan, encoding="utf-8"))["result"]["records"]
    pool, ns, dropped = build(records, sent_path, private=private)
    for why, names in dropped.items():
        if names:
            label = {"eqi": "EQI 없음", "roll": "재학생 0"}[why]
            print(f"⚠️ 자료 부족으로 뺀 미발송 {len(names)}곳 ({label}): {', '.join(names[:6])}"
                  + (" …" if len(names) > 6 else ""))
    if private:
        print("⚠️ --private: 사립·차터를 포함하고 EQI 없는 곳도 통과시킨다.")
        print("   🔴 사립의 게재율은 실측이 없다 — 점수는 순서용이다.")
    if len(pool) < n:
        sys.exit(f"🔴 남은 후보가 {len(pool)}곳뿐이다 — {n}곳을 못 뽑는다")
    cut = pool[n - 1]["score"]
    take = [x for x in pool if x["score"] >= cut]   # 동점은 자르지 않는다
    rolls = [x["roll"] for x in take]; eqis = [x["eqi"] for x in take]
    print(f"명부 {len(records)} · 기발송도메인 {ns} · 남은 후보 {len(pool)} · "
          f"{n}위 점수 {cut} → 동점포함 {len(take)}곳")
    print(f"  재학생 {min(rolls)}~{max(rolls)} (중앙 {int(st.median(rolls))}) · "
          f"EQI {min(eqis)}~{max(eqis)} (중앙 {int(st.median(eqis))})")
    print(" ", dict(Counter(x["type"] for x in take)))
    print("  1위:", take[0]["name"], take[0]["score"], "| 경계:", cut)
    json.dump(take, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
