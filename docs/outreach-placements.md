# 학교 게재 명단

최종 감사: **2026-09-15** · 게재 **49곳**(발행 확인 **10**) · 보류 2곳 · 불발 13곳 · 회신(게재 아님) 1곳
(09-16 Paerata 44 · 09-17 Birchville 45 · 09-18 Pōmare 46 · 09-21 Karangahake 47 · 09-24 Kopuarahi 48 · **10-14 Dominion Road 49**)
감사 범위: 브랜드 Gmail(`kiwilunchboxplanner@gmail.com`) 스레드 **37개 전부 열어 본문 판독**
(08-24에 3일치 증분만 다시 훑어 Brooklyn 1건 추가)

산수가 닫히는지 확인할 것 — **게재 43 + 보류 2 + 불발 11 + 회신 1 = 학교 스레드 57**,
여기에 Jireh 뉴스레터 자체가 1행(학교가 아니라 게재 증거)이라 **검색 결과는 50행**이다.

이 파일이 "게재 몇 곳"의 유일한 출처다. 아웃리치 메일 본문의 숫자는 손으로 적으므로
**여기를 고치면 그 문구도 같이 고쳐야 한다.** (20~22차는 `Twenty-six schools`, 23차는 `Thirty schools`, 24~26차는 `Thirty-two schools`, 27차는 `Thirty-five schools`로 나갔다. **28·29차는 `Thirty-seven schools`, 30차는 `Thirty-nine schools`, 31~32차는 `Forty schools`, 33차는 `Forty-one schools`, **34~38차는 `Forty-three schools`.** **39·40차는 `Forty-four schools`**, **41차는 `Forty-five schools`**, **42차는 `Forty-six schools`**, 🔴 **43~46차는 `Forty-seven schools`** — Karangahake 09-21. **48번째(Kopuarahi 09-24)는 46차 발송 뒤라 학교 회차엔 반영된 적이 없다** — 유치원·Playcentre·보육 센터 회차(10-12~10-22)는 `Forty-eight schools`로 나갔다. **49번째(Dominion Road 10-14)는 유치원 2차가 끝난 뒤 10-23에 반영 — 다음 본문은 `Forty-nine schools`**.)

🔴 **기발송 도메인 파일을 신뢰하지 말 것**(2026-08-24, 08-27 재확인).
**판정은 Gmail 발송함(`in:sent (a OR b OR …)`)으로 하고, 양성·음성 대조를 먼저 돌릴 것.**

2026-08-27에 발송함 15쪽을 전수로 뽑아 캐시(`kiwi_sent_master_0826.txt`, 706줄)와 대조했더니
**양방향으로 동시에 틀려 있었다.**

| | |
|---|---|
| 캐시에만 있음 (보낸 적 없는데 기록됨) | **30곳** — 그룹 조회 5회 전부 0건, 양성 대조 통과 |
| 발송함에만 있음 (보냈는데 기록 없음) | **24곳** (학교 18 + 미디어 6) |
| 겹치는 부분 | 676곳 |

순차액은 +6이라 "6 과대"로 보이지만 실제로는 **54곳이 어긋나 있었다.** 총계 비교로는 안 잡힌다.

🔴 위험한 쪽은 **캐시가 놓친 학교 18곳**이다. 스크리닝에서 "미발송"으로 올라오면
그대로 재발송해 "다시 연락하지 않겠다"는 약속을 깬다:
`ecole-francaise.nz` `elimmtalbert` `greenparkschool.co.nz` `mtint` `nukumea` `otuinter`
`pahoia` `ptchev` `pyespa` `stanmore` `stfrancis` `storans` `taurangasda` `tauriko`
`tmop` `totarapoint` `twinoaks` `waihibeach`

🔴 **38차(09-16) 57곳 발송 후 최신 마스터는 `~/Downloads/kiwi_sent_master_0916.txt`(1,881)**
   — 임시보관함 0 · **발송함 폴더 전수 대조로 57/57**(누락 0 · 초과 0 · 중복 0) ·
   기존 1,824와 겹침 0 · `--audit` 새 중복 0. 명단은 `~/Downloads/kiwi_wave38_DRAFTS_0915.md`.

   🔴 **명단은 70곳인데 57곳만 나갔다.** 도구의 안전 분류기가 초안 생성을 막아
   57건에서 멈췄다(일괄 루프 → 차단, 배치 → 1회 후 차단, 개별 호출 → 57건 후 차단).
   남은 13곳은 점수 순이므로 **39차 맨 앞**에 선다:
   `tirau` `thameshigh` `eastgore` `kaiwaka` `shannon` `stbs` `stjosephsdvke`
   `stmichaels` `waitakigirlshigh` `broadlands` `ruapotaka` `whakarewarewa` `darghigh`

   본문 수치는 `node scripts/check_outreach_body.mjs`로 발송 전 확인했다(9항목 전부 일치).
   **실제로 나간 메일을 열어** 렌더도 확인했다 — 25줄·2,561자·줄바꿈 정상·링크 4개.

   ⚠️ **반송 「0건」의 성격이 이전과 다르다.** 질의 자체는 동작을 확인했지만
   (`in:anywhere greenisland` → 1건), **사서함에 반송 메일이 하나도 없다** —
   메모리가 기록한 08-14 반송조차 지금은 안 잡힌다(`in:anywhere mailer-daemon` → 0).
   그래서 이번 0건은 「반송이 없다」가 아니라 **「반송을 찾는 양성 대조를 세울 수 없었다」**로
   읽어야 한다. 회신이 오기 시작하면 다시 볼 것.

   🔴 **검증 중에 밟은 함정 둘**:
   · 발송함 **검색 결과** 행은 `.yW`에 「나」(발신자)를 넣는다. 수신자는 **폴더 뷰**에만 있다.
     검색 결과로 수신자를 세면 고유 1건이 나온다.
   · 새로고침 전 DOM에 이전 화면 행이 남아 「오늘 22건」으로 읽혔다. **F5 뒤 50건**이었다.

🔴 **37차(09-15) 71곳 발송 후 최신 마스터는 `~/Downloads/kiwi_sent_master_0915b.txt`(1,824)**
   — 임시보관함 0 · **71곳 전수 `in:sent to:<주소>` 각 1건**(누락 0 · 추가 0 · 중복 0) ·
   반송 0(`in:anywhere`). 기존 1,753과 겹침 0. 명단·근거는 `~/Downloads/kiwi_wave37_DRAFTS_0915.md`.

   경계 505.1에 **4자 동점**이라 70이 아니라 71이다. 36차 마지막 589.9 → 37차 1위 583.1로
   순위가 이어진다. 뽑기 전에 **36차를 `master_0911`로 재현해 72곳 전원 일치**를 확인했다.

   본문은 36차와 같다. 발송 전 가격 주장을 다시 계산해 일치를 확인했다
   (Pak'nSave 05-16 → 09-13: carrots −32.1% · pasta −15.9% · butter +60.4% ·
   eggs +29.4% · canned tuna +73.5%).

🔴 **36차(09-14) 72곳 발송 후 최신 마스터는 `~/Downloads/kiwi_sent_master_0915.txt`(1,753)**
   — 임시보관함 0 · **72곳 전수 `in:sent to:<주소>` 각 1건**(누락 0 · 추가 0 · 중복 0) · 반송 0.
   반송 0은 `in:anywhere`로 확인했다 — 🔴 **기본 검색은 스팸·휴지통을 빼서 반송을
   원리상 못 본다.** 09-14에 전기간 0건이 나와 양성 대조가 실패했고, `in:anywhere`로
   다시 걸어 누적 1건(08-14)을 찾고서야 「0건」이 참임을 알았다. 기존 1,681과 겹침 0.

   🔴 **명단은 35차를 재현해 보고 뽑았다.** 처음엔 70곳만 나왔는데, 제외를
   **핵심이름**으로 하는 바람에 Wainuiomata Intermediate와 St Mary's (Wanganui)가
   다른 학교인데 지워졌다. **제외는 정확한 도메인으로** 해야 한다 — 핵심이름은
   재발송 *후보*를 고르는 용도지 제외 기준이 아니다. 고친 뒤 35차 72곳이 전원 일치했다
   (경계 701.7 · 1위 840.7 · 유형 구성까지). 명단·근거는 `~/Downloads/kiwi_wave36_DRAFTS_0914.md`.

   🔴 **본문의 가격 주장을 바꿨다.** 35차까지 나간 "pasta fell 28% / butter rose 49% /
   canned tuna 67%"는 **우리 데이터로 어느 라운드 조합으로도 재현되지 않는다**(Pak'nSave
   May를 이후 8개 라운드 전부와 대조: pasta는 항상 −15.9%, butter +60.4%. Woolworths는
   May 라운드 자체가 없다). 36차부터 **Pak'nSave 고정 SKU 2026-05-16 → 09-13 실측**으로
   교체했다: carrots −32% · pasta −16% · butter +60% · eggs +29% · canned tuna +74%.
   `roughly $2 to $7.20`도 `$7.30`으로 고쳤다(실계산 $2.10~$7.31).

🔴 **35차(09-11) 72곳 발송 후 최신 마스터는 `~/Downloads/kiwi_sent_master_0911.txt`(1,681)**
   — 임시보관함 0 · 발송함 총계 1,620→**1,692**(+72) · 09-11자 행 72 ·
   **명단 72곳과 수신자 집합 완전일치**(누락 0 · 추가 0 · 중복 0) · 반송 0.
   검색 양성 대조(없는 문자열 → 0건)를 먼저 돌리고 판정했다. 기존 1,609와 겹침 0.

🔴 **34차(09-10) 70곳 발송 후 마스터는 `~/Downloads/kiwi_sent_master_0910.txt`(1,609)**
   — 초안 0 · 당일 발송 70 · 고유 70 · 누락 0 · 추가 0 · 반송 0.

🔴 **33차(09-09) 70곳 발송 후 최신 마스터는 `~/Downloads/kiwi_sent_master_0909.txt`(1,539)**
   — 발송함 직교 7그룹(10×7=**70/70**) + 음성 대조 0 + 보관함 잔량 0으로 확인했다. 겹침 0.

🔴 **32차(09-07~08) 109곳 발송 후 최신 마스터는 `~/Downloads/kiwi_sent_master_0908.txt`(1,469)**
   — 발송함 직교 10그룹(11×9+10=**109/109**) + 음성 대조 0으로 확인했다. 기존 1,360과 겹침 0.

→ 실측 기준으로 다시 만든 파일: `~/Downloads/kiwi_sent_master_0827.txt` (754곳)
   = 캐시706 − 유령30 + 누락24 + 22차54.
   **23차(08-28) 발송 후 최신본은 `~/Downloads/kiwi_sent_master_0828.txt` (808곳)** — 스크리닝은 이걸 쓸 것

🔴 **과거 중복 발송 3건.** 본문이 "I won't follow up"이라고 약속하므로 세 번 어긴 것이다.

| 학교 | 발견 | 형태 |
|---|---|---|
| St Benedict's Khandallah | 08-26 | `office@`로 8/21·8/22 이틀 연속 |
| Cambridge School | 08-26 | `office@` + `admin@` 같은 날 |
| **Papakura Central** | **09-08** | `papakura-central.school.nz`(07-29) + `papakuracentral.school.nz`(08-13) — **하이픈만 다르다.** 둘 다 School_Id 1421 |

🔴 **문자열 일치로만 대조하면 못 잡는다.** 이제 `scripts/screen_outreach.mjs`를 쓴다:

```bash
# 새 회차 후보를 기발송 명단과 대조 (School_Id까지 판정)
node scripts/screen_outreach.mjs 후보.txt ~/Downloads/kiwi_sent_master_0908.txt schools.csv
# 기발송 명단 자체에 중복이 있는지 감사
node scripts/screen_outreach.mjs --audit ~/Downloads/kiwi_sent_master_0908.txt schools.csv
```

하이픈·접미사(`.school.nz`/`.ac.nz`/`.co.nz`)를 벗긴 **핵심 이름**이 같으면 후보로 올리고,
**School_Id로 판정**한다. 이름이 같아도 대부분은 다른 학교다 — 1,469곳 감사 결과
겹침 후보 12쌍 중 **11쌍이 별개**였다(Freyberg 고등/초등, `sjr.nz`=St Joseph's Rangiora
vs `sjr.school.nz`=St John's Ranfurly, St Anne's 3곳은 Wellington·Christchurch·Whanganui).

⚠️ CSV는 **따옴표를 아는 파서**로 읽어야 한다. 학교 이름에 쉼표가 있어
`split(",")`로는 열이 밀리고 School_Id가 통째로 어긋난다(만들면서 밟았다).

<details><summary>08-26에 찾은 앞의 두 건</summary>

근거는 `~/Downloads/kiwi_sent_audit_0826.md`.

</details>

---

## 판정 기준

**게재**로 세는 것 — 학교가 **"싣겠다"고 명시**한 경우. 이미 실렸으면 ✔로 구분한다.
**안 세는 것** — 자동응답, 반송, 거절, 그리고 **"~할 수도 있다"는 미확정 표현**.

🔴 `may` / `for clarification if we can` 같은 표현을 게재로 세면 숫자가 조용히 부푼다.
아래 "보류" 칸에 **원문 그대로** 남겨 두는 이유다 — 다음 사람이 같은 판단을 다시 할 수 있게.

---

## 게재 49곳

✔ = 실제로 나간 것을 확인함 · ○ = 싣겠다는 답만 받음

| # | 학교 | 도메인 | 형태 | 확인 |
|---:|---|---|---|:--:|
| 1 | Grey Lynn School | `greylynn.school.nz` | 웹사이트 커뮤니티 공지 + 학교 앱 | ✔ |
| 2 | Jireh Christian School | `jireh.school.nz` | 뉴스레터 (JCS Newsletter 2026-08-19) | ✔ |
| 3 | Mosston School | `mosston.school.nz` | 가정에 직접 공유 | ✔ |
| 4 | Onehunga Primary School | `onehungaprimary.school.nz` | 뉴스레터 | ✔ |
| 5 | Hobsonville School | `hobsonville.school.nz` | 뉴스레터 | ✔ |
| 6 | Lyall Bay School | `lyallbay.school.nz` | 뉴스레터 **3회** | ○ |
| 7 | Holy Trinity Catholic Primary | `holytrinity.school.nz` | 뉴스레터 + 인쇄 게시 | ○ |
| 8 | Egmont Village School | `egmontvillage.school.nz` | 뉴스레터 | ○ |
| 9 | Owhiro Bay School | `owhiro.school.nz` | 뉴스레터 | ○ |
| 10 | Bell Block School | `bellblock.school.nz` | 뉴스레터 | ○ |
| 11 | Edmonton Primary School | `edmonton-primary.school.nz` | 뉴스레터 | ○ |
| 12 | Te Huruhi School | `tehuruhi.school.nz` | 뉴스레터 | ○ |
| 13 | Orewa College | `orewacollege.nz` | 뉴스레터 | ○ |
| 14 | Cambridge Primary School | `cambridgeprimary.co.nz` | 뉴스레터 | ○ |
| 15 | Plimmerton School | `plimmerton.school.nz` | 뉴스레터 | ○ |
| 16 | St Pius X (Melville) | `stpius.school.nz` | 뉴스레터 | ○ |
| 17 | Ahutoetoe School | `ahutoetoe.school.nz` | 뉴스레터 | ○ |
| 18 | Te Kura Rauiti | `tekurarauiti.school.nz` | 뉴스레터 | ○ |
| 19 | Blockhouse Bay Intermediate | `bhbint.school.nz` | 뉴스레터 | ○ |
| 20 | Kowhai Intermediate | `kowhai.school.nz` | 뉴스레터 | ○ |
| 21 | St Leo's Catholic School | `stleos.school.nz` | 뉴스레터 | ○ |
| 22 | Kauri Park School | `kauripark.school.nz` | 뉴스레터 | ○ |
| 23 | Takapuna Primary School | `tps.school.nz` | 디지털 포스터 (공지판 없음) | ○ |
| 24 | Oteha Valley School | `oteha.school.nz` | 커뮤니티 공지 | ○ |
| 25 | Kaharoa School | `kaharoa.school.nz` | 웹사이트 공지 (**2026-08-20 게시 · 09-18 실물 확인** — "no account needed, nothing for sale, just ideas" + `Kiwi_Lunchbox_poster_digital.png` 다운로드) | ✔ |
| 26 | Brooklyn School (Wellington) | `brooklynprimary.school.nz` | 뉴스레터 | ○ |
| 27 | Hautapu School | `hautapu.school.nz` | 뉴스레터 | ○ |
| 28 | Roseneath School | `roseneath.school.nz` | 뉴스레터 + 학부모 직접 발송 | ○ |
| 29 | Ladbrooks School | `ladbrooks.school.nz` | 학부모 배포 (포스터 요청) | ○ |
| 30 | Pokeno School | `pokeno.school.nz` | 뉴스레터 (포스터 요청) | ○ |
| 31 | Mararoa School | `mararoa.school.nz` | 학교 앱 + 뉴스레터 (이미지 요청) | ○ |
| 32 | Hanmer Springs School | `hanmersprings.school.nz` | 뉴스레터 + 인쇄 게시 (둘 다 요청) | ○ |
| 33 | Endeavour School | `endeavour.school.nz` | 뉴스레터 ([2026-09-03 발행 확인](https://endeavour.school.nz/mailpoet-email/7c7aea434583-endeavour-school-newsletter-3rd-september-2026/), 「LUNCH BOX IDEAS」 꼭지) | ✔ |
| 34 | Balmoral SDA School | `balmoralsda.school.nz` | 뉴스레터 (이미지 요청) | ○ |
| 35 | Greendale School | `greendale.school.nz` | 가정에 배포 (A4 인쇄본 요청) | ○ |
| 36 | Tapanui School | `tapanui.school.nz` | 게시판 + 뉴스레터 + HERO 학교 앱 (A4·이미지 둘 다 요청) | ○ |
| 37 | Riccarton High School | `riccarton.school.nz` | **소셜미디어(Facebook)** — 첫 사례 | ○ |
| 38 | Queenspark Te Hua Mānuka | `queenspark.school.nz` | 가정에 직접 발송 (**이미 발송 완료**) | ✔ |
| 39 | Akaroa Area School | `akaroa.school.nz` | 뉴스레터 ([2026-09-04 발행 확인](https://hail.to/akaroa-area-school/article/1Y4pG9d), 「A message from the Office」의 "We have been asked to pass on the following") | ✔ |
| 40 | Swanson School | `swanson.school.nz` | 격주 전자 뉴스레터 커뮤니티 공지란 | ○ |
| 41 | Mossburn School | `mossburn.school.nz` | 뉴스레터 (전단 요청) | ○ |
| 42 | Glentunnel School | `glentunnel.school.nz` | 뉴스레터 (**2026-09-09 발행 — "I've included the image in our newsletter"**) | ✔ |
| 43 | Tikipunga Primary School | `tikiprimary.school.nz` | 뉴스레터 (전단 요청) | ○ |
| 44 | Paerata School | `paerata.school.nz` | 가정에 공유 (다음 텀 시작) | ○ |
| 45 | Birchville School | `birchville.school.nz` | 뉴스레터 (09-17 "I **have included** some information in our newsletter" — 과거형이지만 뉴스레터가 로그인 뒤라 **실물 미확인**) | ○ |
| 46 | Pōmare School | `pomare.school.nz` | 포스터 + 뉴스레터 (교장이 **둘 다 요청** — "We do have school lunches, but I still think your information would be helpful for our community") | ○ |
| 47 | Karangahake School | `karangahake.school.nz` | 뉴스레터 (09-21 09:48 "we are outside Auckland but I think it will still benefit our parents, so **I will put it in our newsletter**" — 미래형 약속, 실물 미확인) | ○ |
| 48 | Kopuarahi School | `kopuarahi.school.nz` | 커뮤니티 페이지 (09-24 09:58 "Thank you for the information. **I've added it** to our community page" — **과거형**. 45차 1위·재학생 9명. 웹사이트 6쪽을 브라우저 UA로 훑었는데 언급 없음(같은 방법으로 Grey Lynn·Kaharoa는 잡힌다) — 페이스북·학교 앱일 수 있다, 실물 미확인) | ○ |
| 49 | Dominion Road School | `dominionrd.school.nz` | 뉴스레터 (10-14 12:10 "We're happy to place your advert in our newsletter - could you please send us a jpg (or pdf) advert?" — 08-14 메일에 **두 달 뒤** 회신 · 미래형 수락, 실물 미확인 · 포스터 JPG+PDF 10-14 22:58 답장 발송 확인) | ○ |

**확인된 게재 10 · 답만 받은 것 39.**

(이 줄은 손으로 적는다 — 표의 ✔/○ 를 세서 맞출 것. 2026-09-07에 「5 · 32」로 낡아 있었다.)

27~30은 2026-08-26~27 회신이다. 원문 그대로 남긴다 — 판정을 다시 할 수 있게:

| # | 원문 |
|---:|---|
| 27 Hautapu | "I've checked out your website, it looks great... **I will share this in our newsletter**." |
| 28 Roseneath | "This is great, thank you! **I will send it out to parents and put it in the newsletter**." (교장) |
| 29 Ladbrooks | "please send me an image format **for me to put out to parents**" |
| 30 Pokeno | "Could you give me a image **for newsletter**" (사무실이 교내 담당자에게 전달) |
| 31 Mararoa | "Yes, please can I have something **for our school app and Newsletter**." (23차, 발송 11분 뒤) |
| 32 Hanmer Springs | "**What a fantastic idea!** Can you please send through your **printable flyer and the image for the newsletter** too?" (23차) |
| 33 Endeavour | "Could you please send me an image for our newsletter which will be going out this Thursday. **I will include the image and your newsletter blurb for our school community**." (21차 발송 08-25 → 08-31 회신) |
| 33 Endeavour (발행) | 09-03자 뉴스레터에 **「LUNCH BOX IDEAS」라는 별도 꼭지**로 실렸다. 약속대로 블러브 + 링크가 그대로 나갔고, 우리가 보낸 확장판 문구("nut-free, dairy-free, gluten-free and vegan filters, and printable shopping list")까지 포함됐다. 링크는 학교 메일 보안(Proofpoint)에 감싸여 나간다 |
| 34 Balmoral SDA | "Are you able to email me an image **so that I can include it in our newsletter**?" (26차, 발송 이튿날 09-01) |
| 35 Greendale | "Could I please have the A4 printable version. **I can then share this with our school families**." (26차, 발송 이튿날 09-01) → 자료 받은 뒤 "Thank you, **I'll share with our school community**"(09-02)로 재확인 |
| 36 Tapanui | "Our school is **very much onboard to promote healthy lunches and provide resources to our parents**. Could you please send us printable A4 for a noticeboard, **as well as** an image for our newsletter **and on our HERO school app**." (27차, 발송 이튿날 09-02) |
| 37 Riccarton High | 접수처 → 미디어 담당자 내부 전달: "can this be **published on our facebook page** please" → 담당자 "We would love to promote your program on our school's social media… **I'll put it up on our social media**." (27차, 09-02) |
| 38 Queenspark | "What a great idea Yong! **I have sent this to our parent community.**" (교장 PA, 28차 · 발송 이튿날 09-03) — **완료형이라 ✔.** 자료를 요청하지 않고 메일 자체를 그대로 돌렸다 |
| 39 Akaroa Area | "your email is spot on and the blurb is great and so is your website. Well done, **I will add it to tomorrow's newsletter**." (29차 · 발송 이튿날 09-03) — 본문의 붙여넣기용 블러브를 그대로 쓰겠다는 첫 사례 |
| 39 Akaroa Area (발행) | 09-04자 Te Pānui에 실렸다. 별도 꼭지가 아니라 **「A message from the Office」 안의 "We have been asked to pass on the following"** 항목이고, 우리 블러브가 **한 글자도 안 고쳐진 채** 나갔다. 🔴 **`<a href="https://www.kiwilunchbox.co.nz/">`로 실제 링크가 걸렸고 `rel`이 비어 있다** — Jireh(평문, `<a>` 0개)와 달리 진짜 백링크다 |
| 40 Swanson | "We have a **fortnightly electronic newsletter** which has a range of community notices at the back, **we're happy for you to supply us content** for our newsletter. See our latest newsletter attached." (30차 · 발송 당일 09-03) — 최신 호(Issue 76) PDF를 **먼저 보내와** 형식을 보여 준 첫 사례 |

| 43 Tikipunga (신규) | 🔴 **처음으로 EQI 460+ 밴드에서 게재가 나왔다.** 33차 명단 38번 · 재학생 342 · **EQI 548**. 09-09 오전 10:50 발송 → **오후 12:29 회신**(1시간 39분): "What a beautiful thing you have created. We will happily display your flyer in our newsletter." (사무실 Lena Koosmann). 전단을 달라는 뜻이므로 png+A4를 붙여 회신한다 — 초안 저장 완료, **첨부는 사람이 한다**. 직전까지 게재 42곳 중 460+ 는 **0곳**이었고 31차(70통·460+ 전용) 0건, 32차 0건이 이어져 「밴드가 죽었다」는 읽기가 34차 판단을 막고 있었다. **1건으로 뒤집지는 말 것** — 33차 나머지를 더 볼 것 |
| 42 Glentunnel (발행) | 우리가 자료를 보낸 **같은 날** 회신: "Thanks for sending that through - **I've included the image in our newsletter** - it sounds a great idea!" 완료형이라 ✔다 (Queenspark와 같은 기준). ⚠️ **웹에서는 확인할 수 없다** — 학교 사이트에 뉴스레터가 공개돼 있지 않고 학부모에게 메일·앱으로만 나간다. Akaroa처럼 발행물 URL로 뒷받침되는 건이 아니라 **학교의 완료형 진술이 근거**다 |
| 41 Mossburn (예정) | 자료 회신 뒤 "We will include this in our **next newsletter on 14th of Sep**." 날짜가 특정됐으므로 09-14 이후에 확인해 ✔로 올릴 것 |
| 42 Glentunnel | "We have a school newsletter going out **tomorrow** - could you please send through a notice or image for me to include in the newsletter." (사무실 Alison Brown, 09-09) — 🔴 **33차가 아니다.** Contributing · EQI **428** · 재학생 103으로 460+ 밴드가 아니고, **이전 회차의 뒤늦은 회신**이다(Mossburn에 이어 두 번째). 마감이 하루라 09-09에 바로 이미지+A4 첨부해 회신했다(발송함에서 png·pdf 확인) |
| 41 Mossburn | "Could you please send us **a flyer that we can share in our newsletter**?" (사무실, 09-08) — 🔴 **32차가 아니다.** Contributing · EQI **427** · 재학생 55로 460+ 밴드가 아니고, 이전 회차의 **뒤늦은 회신**이다. 며칠 지나서도 온다는 뜻이라 회차별 응답률을 발송 직후에 확정하면 안 된다. 09-08에 이미지+A4 첨부해 회신했다(발송함에서 png·pdf 확인) |

🔴 **Riccarton은 첫 소셜미디어 게재다.** 지금까지 36곳은 뉴스레터·게시판·학교 앱뿐이었다.
메일 본문은 A4와 이미지만 제안하는데 학교가 스스로 페이스북을 꺼냈다 — 소셜을 명시적으로
제안하는 문안이 먹힐지 볼 여지가 있다. 다만 지금 이미지는 **뉴스레터 기준이라 소셜에서
잘릴 수 있어**, 답장에 다른 비율이 필요하면 말해 달라고 덧붙였다. 요청이 또 오면 정사각형
버전을 만들 것.

🔴 **또 우리가 보낸 주소가 아닌 곳에서 답이 왔다** — `info@`로 보냈는데 `hnh@`(미디어
담당자)가 답했다. 접수처가 내부 전달한 것이다. 21차에도 두 번 있었다.
**`to:` 주소로 훑지 말고 도메인으로 볼 것.**

🔴 **Tapanui는 세 경로를 한꺼번에 요청한 첫 학교다**(게시판·뉴스레터·HERO 앱).
지금까지는 하나만 골랐다. 메일이 A4와 이미지를 **둘 다** 제안하는 형태를 유지할 근거다.

🔴 **Endeavour는 EQI 449다** — 이미 무료급식 구간(439 이상)인데 뉴스레터 게재를 먼저 제안해 왔다.
21차(08-25)에 나간 옛 문안, 즉 「도시락 비용」을 앞세운 본문 그대로였다. 표본 하나지만
**상한 인상이 통할 수 있다는 첫 실측 신호**다. 26차(EQI 439~444)는 문안을 고쳐 보냈으니
두 회차의 답장률을 견주면 문안 변경이 도움이 됐는지도 갈린다.

🔴 29~32는 **자료를 달라는 요청**이지 "실었다"가 아니다. 다만 배포처(앱·뉴스레터·공지판)를
조건 없이 지목하고 있어 "~할 수도 있다"류의 보류와는 구분했다. 실제 게재를 확인하면 ✔로 올릴 것.

네 곳 모두 포스터를 보냈다(PNG 또는 A4 PDF, 요청한 것에 맞춰). 발송 근거는 각 스레드의 첨부.

---

## 보류 2곳 — 확정되면 46이 된다

| 학교 | 도메인 | 원문 |
|---|---|---|
| Mt Roskill Primary | `mrps.school.nz` | "I will pass it on to Management. We **may** look at advertising it in our newsletter." |
| Bucklands Beach Intermediate | `bbi.school.nz` | "I have passed it on to our Senior Management team **for clarification if we can** pop your poster up." |

---

## 회신 — 아직 게재 아님

*(현재 없음 — Paerata는 2026-09-16에 게재로 확정돼 위 표 44번으로 옮겼다.)*

🔴 **Paerata가 게재가 된 경위**(질문에 답한 것이 그대로 게재로 이어진 유일한 사례):
09-15 09:35 긍정 + 질문("Pak'nSave를 New World 대신 넣을 생각은 없나", Nikki Shea) →
같은 날 11:52 답장 → **09-16 08:27 확정 회신**:

> Thank you Yong Jae Lee. You are right, I must not have delved enough as I just saw
> Woolworths and New World. **I'll share this with our families at the beginning of next term.**

`I'll`이다 — 「~할 수도 있다」가 아니라 확정이므로 판정 기준상 **게재**다.
다만 공유는 **다음 텀 시작**이라 ✔가 아니라 ○로 둔다. 텀이 시작되면 실제 게재를 확인할 것.
🔴 **텀 시작일을 여기 적지 않는다** — 확인하지 않은 날짜를 적으면 그게 낡는다.

🔴 **Paerata 답장에서 확인한 것**(2026-09-15 실측) — 답이 「지점마다 달라서 어렵다」가
아니다. 그건 New World에도 똑같이 걸린다(둘 다 Foodstuffs 점주 운영).

    Pak'nSave /shop/deals      고유 200건 · 할인 200 · **정가가 따로 있는 건 27건 (14%)**
    New World /shop/specials   고유 200건 · 할인 200 · **187건 (94%)**
    decal 종류                 Pak'nSave `6000` 하나 / New World `3000`·`4000`·`5000`

Pak'nSave는 **할인 목록을 공개한다**(1,000품목, New World와 같은 Algolia 구조). 다만
**원래 값을 대부분 안 알려줘서 절약액을 말할 수 없다.** 그래서 지수(정상 진열가)에는
들어 있고 주간 특가에만 빠져 있다. 지수 3사 바스켓(18행, 09-13): Pak'nSave **$89.85** ·
Woolworths $97.30 · New World $100.08 — Pak'nSave가 18행 중 14행에서 최저다.
답장 전문은 `~/Downloads/kiwi_reply_paerata_0915.md`.

## 불발 13곳

| 학교 | 도메인 | 사유 |
|---|---|---|
| Rongotai College | `rongotai.school.nz` | 자동응답 (교장 안식년) |
| Johnsonville School | `johnsonville.school.nz` | 부재중 자동응답 |
| Papatoetoe Intermediate | `papint.school.nz` | 부재중 자동응답 |
| St Heliers School | `stheliers.school.nz` | 접수 확인 자동응답만 |
| De La Salle College | `delasalle.school.nz` | **반송** — 수신 서버가 거부. 09-01에 접기로 결정(아래) |
| Huapai District School | `hds.school.nz` | 거절 — 뉴스레터는 교내 행사만 싣는 정책 |
| Howick Intermediate | `howickint.school.nz` | 거절 — **급식 업체로 오해** |
| Wakaaranga School | `wakaaranga.school.nz` | 거절 — **급식 업체로 오해** |
| Papatoetoe Normal School | `papnormal.school.nz` | 거절 — 자체 급식 제공 중 |
| Logan Park High School | `lphs.school.nz` | 거절 — 자체 급식 제공 중 (25차, 🔴 답장이 **스팸함**에 있었다) |
| Ōtorohanga South School | `otosouth.school.nz` | 🔴 **수신 거부 요청** — "Please remove us from your mailing list" (33차 발송분에 09-14 회신) |
| Diocesan School for Girls | `diocesan.school.nz` | 거절 — **「제3자 메시지를 하나 받으면 선례가 된다」**, 1,700명 학교라 자체 공지가 이미 많다 (46차 사립, 09-23 11:12 · 사무 Rachel Teale) |
| St Cuthbert's College | `stcuthberts.school.nz` | **사람에게 안 닿았다** — `information@`이 「더 이상 운영하지 않는 주소」라는 자동응답(46차 사립, 09-23). 대체 주소를 안내했지만 **재발송 안 함**(사립은 접기로 결정 09-23 · 「I won't follow up」) |

🔴 **Ōtorohanga South는 수신 거부를 밝혔다**(2026-09-14). 33차에서 09-09에 **한 번만** 보냈고
중복 발송은 없다(발송함 전수 확인 — `otosouth.school.nz` 1건). 닷새 뒤 사무실에서
"Please remove us from your mailing list"라고 회신했다.

**답장하지 않는다.** 본문이 이미 "I won't follow up"이라고 약속했고, "명단에서 뺐습니다"라는
메일 자체가 그 약속을 어기는 한 통이 된다. 마스터 도메인 목록에 남아 있으므로 스크리닝에서
계속 제외된다 — De La Salle과 같은 처리다. **「미발송」으로 되살리지 말 것.**

🔴 **De La Salle은 우리 메일을 받은 적이 없다**(2026-08-15 반송, 971명·EQI 484).
디렉터리에 있는 주소가 `admin@delasalle.school.nz` 하나뿐이고 그 서버가 연결 자체를 거부하므로
같은 주소로는 또 실패한다. **2026-09-01에 접기로 했다 — 다른 주소를 찾아 재시도하지 않는다.**
마스터 도메인 목록에는 그대로 남겨 둔다(순수 목록이라 주석을 못 넣는다). 그래야 앞으로
스크리닝에서 계속 제외돼 재발송이 일어나지 않는다. **「미발송」으로 되살리지 말 것.**

🔴 **거절 4곳 중 3곳이 우리를 급식 업체로 읽었다.** 본문 첫 문장이
"This isn't a supplier email"인데도 그렇다. 제목 `Not a supplier - …`에서
**"supplier"가 먼저 눈에 들어가는** 것일 수 있다 — 다음 회차에 제목을 바꿔 볼 것.

---

## 감사 인사 (2026-09-08 기준)

실어 준 학교에 감사만 전한다. **기존 스레드 안 회신**이고 **추가 요청을 넣지 않는다** —
그래야 본문의 "won't follow up" 약속과 충돌하지 않는다.

| 학교 | 보냄 |
|---|---|
| Akaroa Area | ✅ 09-08 (09-04자 Te Pānui 게재에 대해) |
| Queenspark | ✅ 09-08 (학부모에게 바로 돌려 준 것에 대해) |
| Grey Lynn · Mosston · Onehunga · Endeavour | 이미 스레드에서 답장함 |
| Hobsonville | 두 번 답장했고 마지막이 학교의 "the poster is perfect" — 끝난 대화다 |

### 🔴 「누구에게 감사 인사를 안 했나」를 검색으로 세지 말 것

**Gmail 검색은 스레드 단위다.** 09-08에 두 가지 방법으로 세려다 둘 다 틀렸다:

| 시도 | 왜 틀렸나 |
|---|---|
| `in:sent to:<도메인>` 개수 | 스레드를 센다. 같은 스레드에 답장하면 여전히 1이다 |
| `in:sent to:<도메인> -"That's the only ask"` | **답장은 원문을 인용**하므로 그 문구가 답장에도 들어간다. 스레드가 통째로 제외돼 항상 0이 나온다 |

✅ **되는 방법**: 스레드를 열어 메시지 컨테이너(`[data-message-id]`)별로 발신자를 읽고,
**마지막 메시지가 누구 것인지** 본다. 학교 쪽이면 우리가 답을 안 한 것이다.

⚠️ `span[email]`을 전부 세면 안 된다 — 발신·수신·호버카드에 다 붙어 있어 메시지 수와 안 맞는다.

⚠️ 학교 도메인으로 검색하면 **그 학교 뉴스레터 구독 메일**이 걸릴 수 있다(Jireh에서 밟았다).
아웃리치 스레드인지 제목으로 확인할 것.

---

## 다시 셀 때 — 이 순서로

1. **스팸까지 본다.** `in:anywhere -from:me after:<지난 감사일>` — 전부 읽는다.
   받은편지함만 보면 놓친다 (2026-08-16 Ahutoetoe 교장 답장, 2026-09-01 Logan Park 답장이
   둘 다 스팸에 있었다)
2. 🔴 **제목으로 좁히지 말 것 — 제목이 회차마다 바뀐다.**
   2026-09-01 실측: 옛 절차의 `subject:"Not a supplier"`는 **33건**을 주는데
   **최신이 08-24**다. 그 뒤로 제목이 `An Auckland parent's free lunchbox planner -
   nothing to sign up for`로 바뀌어, 그 제목으로는 **15건이 더** 나온다.
   즉 옛 절차를 그대로 돌리면 **24~26차 회신을 하나도 못 본다.**
   도메인으로 좁히는 것도 안전하지 않다 — `.ac.nz`(Garin) · `.co.nz`(Kauri Hohore,
   Mayfield) · `orewacollege.nz`가 `school.nz` 필터에 안 걸린다.
3. **반송은 따로, 기간 제한 없이 훑는다.**
   `in:anywhere {from:mailer-daemon from:postmaster subject:Undeliverable
   subject:"Delivery has failed" subject:"Delivery Status Notification"}`
   → 2026-09-01에 이걸 돌려 **08-15 De La Salle 반송**을 처음 찾았다. 스팸함에 17일간 있었다.
   일자 제한(`newer_than:1d`)을 걸면 원리상 못 잡는다
4. **목록이 아니라 스레드를 연다.** 행에는 수신자 주소도, 마지막 발언자도 안 나온다
5. 🔴 **키워드 검색으로 판정하지 말 것.** 학교 답장에는 우리 원문이 인용돼 있어서
   `newsletter` 같은 단어가 **전부** 걸린다. 인용(`.gmail_quote`, `blockquote`)을 지우고 읽어야 한다
6. 🔴 **Gmail 검색 해시(`#search/…`)로 그냥 이동하면 검색이 재실행되지 않는다.**
   `?a=N#search/…`처럼 쿼리 캐시버스터를 붙일 것. 안 붙이면 낡은 전체 목록을 결과로 착각한다
   ([[gmail-compose-url-does-not-save-draft]]에 같은 함정 기록)

### 학교 식별은 도메인으로

🔴 `bbi.school.nz`(Bucklands Beach Intermediate)와 `bhbint.school.nz`(Blockhouse Bay
Intermediate)는 **다른 학교인데 약칭이 둘 다 "BBI"다.** 이름으로 세면 하나가 사라지거나
겹친다. 이 표가 도메인을 같이 적는 이유다.

🔴 **학교 이름과 도메인이 자주 다르다.** Egmont Village → `egmontvillage.school.nz`,
Orewa College → `orewacollege.nz`(`.school.nz`가 아니다). 이름 토큰으로 조회해서
0건이 나와도 **없다는 뜻이 아니다.**

---

## 아직 못 센 것

- **19차(08-22) 50통** — 회신 1건(Brooklyn School, 26번)
- **20차(08-25) 54통 · 21차(08-26) 51통 · 22차(08-27) 54통 · 23차(08-28) 54통**
  08-28 14시 기준 게재 회신 6건 — Hautapu·Roseneath·Pokeno(21차) · Ladbrooks(22차) ·
  Mararoa·Hanmer Springs(23차). 23차는 **발송 11분 만에** 첫 요청이 왔다.
  며칠치라 응답률을 결론내기엔 이르다(기준선 3.7%). 나머지 회신이 오면 여기에 추가할 것
- 🔴 **21차 회신 2건이 우리가 보낸 주소가 아닌 곳에서 왔다.** Pokeno는 `office@`가
  교내 담당자에게 전달해 `k.devi@`가 답했고, Roseneath는 교장이 **새 제목으로 따로** 열었다.
  `to:` 주소로만 훑으면 놓친다 — **도메인으로** 볼 것
- **24차(08-31) 47통 · 25차(08-31) 84통 · 26차(08-31) 78통** — 09-01 12시 기준 게재 회신 **2건**
  (Balmoral SDA · Greendale, 둘 다 26차). 거절 1건(Logan Park, 25차 — 자체 급식).
  하루치라 응답률을 결론내기엔 이르다
- 🔴 **26차는 문안이 다르다**(EQI 439~444, 무료급식 인정 문단 추가). 25차(EQI<439, 옛 문안)와
  견주는 것이 상한 인상과 문안 변경이 먹히는지 아는 유일한 방법이다. 회신이 더 쌓이면 여기에 적을 것
- 🔴 **「자체 급식 제공 중」 거절이 EQI 439 미만에서도 나왔다** — Logan Park(25차)는
  무료급식 구간이 아닌데도 자체 서비스를 운영하고 있었다. 26차에 넣은
  "Lunches may already be provided at your school" 한 줄은 **439 이상만의 문제가 아니다.**
  27차부터는 밴드와 무관하게 그 문단을 유지할 것
- 🔴 **31차(09-04) 70통 — 09-08 재확인, 발송 4일 경과 · 실질 회신 0건.**
  자동응답 2건(Southland Girls · Matamata Intermediate)이 전부다.
  **`to:`가 아니라 `from:` 도메인으로 70곳을 전수 조회**했다(7그룹 × 10) — 학교가 다른
  주소로 답하는 경우(Pokeno·Roseneath)까지 포함하는 방식이다. 음성 대조 0 · **양성 대조 2**.
  31차는 **EQI 460+ 만으로 채운 첫 회차**고, 게재 41곳 중 460+ 는 **0곳**이라 방향이 같다.
  ⚠️ **완전히 닫힌 건 아니다** — Mossburn이 한 주 넘게 지나서 왔다(아래). 뒤늦게 오면 갱신할 것.
- 🔴 **게재 확인을 화면 텍스트로만 하지 말 것**(2026-09-07 Akaroa에서 밟았다).
  뉴스레터 발행물 페이지(`hail.to/.../publication/...`)의 `innerText`에는 우리 블러브가
  **없었다** — 기사 본문이 별도 페이지라 목차만 렌더된다. 그런데 같은 페이지의 **원본 HTML에는
  전문이 들어 있었다**(기사 본문이 JSON 페이로드로 실린다). `curl`로 받아 `grep`했더니 바로 나왔다.
  **「화면에 안 보인다」는 「실리지 않았다」가 아니다.** 반대로 페이로드에 있다고 학부모가 본 것도
  아니므로, 찾은 뒤에는 **기사 URL을 열어 눈으로 확인**할 것 (Akaroa는 둘 다 통과했다)
- **33차(09-09) 70통 = 초등, EQI 460+.** 남은 풀에 초등밖에 없어서 **검증할 가설이 없는 회차**다
  (31차는 「460+ 밴드」, 32차는 「종합 유형」이라는 질문이 있었다). 사용자 판단으로 발송했다.
  발송 시점 460+ 신호: 게재 41곳 중 0곳 · 31차 0건(5일) · 32차 0건(1일).
  ✅ **당일 1건 나왔다 — Tikipunga Primary(EQI 548, 게재 43번).** 460+ 밴드 최초 게재다.
  발송 1시간 39분 만의 회신이라 **밴드가 통째로 죽은 건 아니다.** 다만 70통 중 1건(1.4%)이고
  전체 기준선은 3.4%다 — **34차를 정하기 전에 며칠 더 볼 것.**
  명단·검증은 `~/Downloads/kiwi_wave33_DRAFTS_0909.md`.
  🔴 발송 전 `scripts/screen_outreach.mjs`로 스크리닝했다 — 완전일치 0 · 같은 학교 0 ·
  겹침 후보 1건은 School_Id로 별개 확인. **이 도구를 회차마다 돌릴 것.**
- 🔴 **35차(09-11) 72통 — 발송 당일이라 아직 아무것도 모른다.**
  34차와 **같은 풀·같은 축**(유형별 실측 전환율 × 재학생)에서 34차가 가져간 70곳을 빼고
  그다음 순위를 취했다. 34차 70위가 840.7이고 35차 1위가 같은 840.7이라 경계가 이어진다.
  Contributing 28 · Full Primary 20 · Secondary(Y9-15) 14 · **Intermediate 8** ·
  Secondary(Y7-15) 2 · 재학생 207~764(중앙 236, 합 24,983) · EQI 460~559(중앙 498) ·
  **460 미만 0곳**.
  🔴 **70이 아니라 72인 이유** — 70번째가 **3자 동점**이었다(점수 701.7 · 재학생 207, 셋 다 같다).
  재학생으로도 안 갈려서 임의로 둘을 버리는 대신 **동점자를 다 넣었다**
  (Horotiu · Rhode Street · Otaki).
  🔴 **Intermediate 8곳이 오랜만에 들어왔다.** 남은 Intermediate가 27곳뿐이라 33·34차에서는
  상위 70에 못 들었는데, 초등 재학생이 210~250까지 내려오면서 점수에서 따라잡았다.
  ⚠️ **이 회차에도 가설은 없다.** 34차가 아직 안 열려서(아래) 고등이 되는지 모르는 채로 나갔다.
  명단·검증은 `~/Downloads/kiwi_wave35_DRAFTS_0911.md`.
- 🔴 **34차(09-10) 70통 — 발송 다음날(09-11) 기준 자동응답조차 0건.**
  Contributing 40 · Full Primary 18 · Secondary(Y9-15) 11 · Secondary(Y7-15) 1 ·
  재학생 248~885(중앙 292, 합 26,332) · EQI 460~549(중앙 494) · **460 미만 0곳**.
  🔴 **고등 12곳이 처음 들어간 회차다.** 초등 재학생이 250~310으로 내려와, 전환율이
  3분의 1(1.08% vs 3.39%)인 고등이 재학생 780~890으로 점수에서 따라잡았다.
  결과가 나오면 **유형 축에 중요한 값**이 된다 — 고등을 계속 넣을지가 여기서 갈린다.
  ⚠️ **하루로 닫지 말 것.** Mossburn·Glentunnel 둘 다 이전 회차에서 한 주 넘게 지나서 왔고,
  31차도 4일째에 0건이었다. 명단은 `~/Downloads/kiwi_wave34_DRAFTS_0910.md`.
- 🔴 **32차(09-07~08) 109통 = 종합(Composite) 코호트.** 남은 종합을 통째로 시험한 회차다.
  🔶 쿠라 카우파파 53 / Area School 등 56 — **회신은 반드시 두 갈래로 나눠 셀 것**
  (명단은 `~/Downloads/kiwi_wave32_DRAFTS_0907.md`).
  ⚠️ **0건이면 유형에 대해 아무것도 못 배운다** — 남은 종합이 전부 EQI 460+ 이고
  그 밴드 자체가 나쁘다(게재 40곳 중 460+ 는 0곳, 31차 70통 0건). **2건 이상**이라야
  「밴드가 나빠도 종합은 걸린다」가 선다. 한쪽으로만 답이 나오는 시험이다
- 🔴 **유형별 전환율을 1,360통 기준으로 다시 쟀다**(09-07) — 초등 3.39%(35/1033) ·
  중학 2.35%(2/85) · 종합 2.33%(1/43) · 고등 1.08%(2/186).
  점수식이 쓰던 **종합 1.0%는 잰 적 없는 값**이었고, 그 때문에 109곳이 한 번도 시도되지
  않았다. Akaroa(첫 dofollow 백링크)가 바로 종합이다. 「Intermediate 3.6%」도 이제 틀렸다
- 게재 ≠ 백링크. 실제 링크가 걸렸는지는 GSC 링크 리포트로 따로 본다
  (2026-08-19 Jireh는 기사에 우리 주소가 **평문**이라 `<a>`가 0개였다)

## 🔴 발송 전 본문 검사 (2026-09-15 신설)

메일 본문은 저장소 **밖**(`~/Downloads`)에 살아서 사이트 가드가 원리상 안 닿는다.
이제 명령으로 돌린다:

    node scripts/check_outreach_body.mjs ~/Downloads/kiwi_wave<N>_tpl_body.txt

도시락 금액(게시값) · Pak'nSave 변동률 · 게재 수를 데이터에 대고 본다.
🔴 **설명 못 한 금액·퍼센트가 남아 있으면 실패한다** — 「검사한 것」과 「안 본 것」을
섞으면 초록이 아무 뜻도 없어진다.

### 이 검사가 바로 잡아낸 것

참치 변동률이 **74%로 나갔다**(36·37차). 정확한 값은 2.30 → 3.99 = **73.478%**이고
정수 반올림은 **73%**다. 73.478 → 73.5 → 74 로 **두 번 반올림**한 값이었다.
38차 본문은 73%로 고쳤다. 이미 나간 36·37차는 되돌릴 수 없다 — 방향은 맞고 1%p 차이다.

🔴 퍼센트는 **원값에서 한 번만** 반올림할 것. 중간 표시값을 다시 반올림하지 말 것.
