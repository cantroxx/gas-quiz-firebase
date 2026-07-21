# 특산물 마블 (2~4인 무역 대전) — 소스 · 빌드 · 연동

> 초등 4학년 사회(지역 특산물 + 수요·공급) 학습용 부루마블식 무역 게임 (온라인 2~4인).
> 낱말대전(`public/wordbattle/`)과 같은 방식으로 퀴즈타운에 붙는 미니게임.
> 단, 낱말대전은 바닐라 JS라 소스가 곧 배포물이지만, 마블은 **React+Vite** 라
> 소스(`marble-src/`)와 배포물(`public/marble/`)이 분리된다.

- **운영 URL**: https://dj48-quiztown-firebase.web.app/marble/
- **소스 위치**: `marble-src/` (이 폴더) — React + Vite(JavaScript), 상태는 useReducer
- **배포물 위치**: `public/marble/` — 빌드 결과(직접 수정 금지, 빌드로만 갱신)

---

## 1. 수정 → 반영 흐름

```
cd marble-src
npm install            # 처음 한 번만
npm run dev            # 로컬 확인 (http://localhost:5173)
npm run build          # → ../public/marble/ 로 자동 출력
cd ..
npm run check          # 퀴즈타운 전체 검증
firebase deploy --only hosting          # (규칙 바꿨으면 ,firestore:rules 추가)
```

## 2. 파일 구조 (src/)

| 파일 | 역할 |
|------|------|
| `data.js` | **데이터 전부** — 특산물 40종(산지·좌표·기준가), 20칸 게임판, 황금열쇠, 퀴즈, 게임 설정(CONFIG). 내용 바꾸려면 여기만 |
| `gameLogic.js` | 1인 무역 게임 규칙(순수 리듀서) + 가격/재고 공용 함수 |
| `battleLogic.js` | **2~4인 대전 규칙(순수 리듀서)** — 공유 시장·번갈아 15턴·승패 판정·중도 탈락 + 봇 AI. 연습/봇/온라인이 같은 규칙 공유 (낱말대전 room.js 역할) |
| `online.js` | **온라인 어댑터** — marbleRooms/{code} 를 onSnapshot 구독, 액션은 runTransaction 으로 적용. 퀴즈타운 익명 로그인 재사용 + users 닉네임 조회 (낱말대전 net.js/main.js 패턴) |
| `components/` | 화면 — App(탭), Board/ActionPanel(1인), Battle*(대전), MapLearn/KoreaMap/LeafletMap(지도 학습) |

## 3. 퀴즈타운 연동 접점 (낱말대전과 동일한 3개)

1. **로그인 공유**: `online.js` `ensureAuth()` 가 기존 로그인 재사용, `lookupNickname()` 이 users 에서 실명 조회
2. **진입 카드**: `public/index.html` 학교 영역, 낱말대전 카드 아래 `<a href="/marble/">`
3. **랭킹 광장 탭**: `public/js/mb-ranking-plaza.js` 가 "특산물 마블" 탭 주입, `marbleRanking` 컬렉션만 읽음

## 4. Firestore (firestore.rules 에 적용됨)

| 경로 | 내용 | 규칙 |
|------|------|------|
| `marbleRooms/{code}` | 방+대전 상태 전체(숨김 정보 없음) | 로그인 read/create/update, delete 금지 |
| `marbleRanking/{uid}` | 랭크 누적(name·total·games·wins) | read 로그인, write 본인만 |

- 랭크 점수: 온라인 승 +30 / 패 +5 / 무 +18 · **봇전은 절반**(승 +15 / 패 +3 / 무 +9) — 로그인 시에만 기록
- 온라인 안전장치: 한 턴 120초 제한(초과 시 자동 턴 넘김), 중간 나가기 = 항복(탈락 — 1명 남으면 그 사람 승리)
- v1 은 낱말대전과 같은 클라이언트 트랜잭션 방식. 서버 검증(Functions)은 다음 단계.

## 5. 게임 규칙 요약

- 2~4명이 같은 게임판·시장에서 번갈아 15턴씩 (방은 2명부터 시작 가능, 최대 4명)
- 산지 칸: 매판 랜덤 배정(지역+특산물 2~3개, 고장 표시). 매입하면 공유 재고↓·값↑
- 시장 5종(매판 랜덤 배치): 수산물·농산물·과일·축산물 시장(전문 분야 ×2.0~2.4, 그 외 ×1.3~1.6),
  직거래 장터(전 품목 ×1.7~2.0), 큰장(전 품목 ×2.2~2.6 최고가) — 특산물 40종에 분류(category) 부여
- 같은 특산물 많이 팔면 값↓ (수요·공급 학습 포인트)
- 승리: 목표(10,000원) 달성 시 남은 모두가 같은 턴 수를 마친 뒤 현금 비교 (순서 유리 방지)
  · 순서 보너스(battleLogic.js ORDER_BONUS): 뒤 순서일수록 시작 현금 보정 — 2인 [0,225] · 3인 [0,220,420] · 4인 [0,240,440,660]
  · 값은 봇 시뮬 3000판(`node scripts/simulate-balance.mjs 인원수 판수 [보너스목록]`)으로 좌석별 승률 ±2%p 이내 확인
  · 중도 나가기 = 항복(탈락). 남은 사람이 1명이면 그 사람 승리, 2명 이상이면 게임 계속
- 게임판 칸 클릭 → 그 칸 설명 카드(시장 특성·황금열쇠 종류·폭풍 등)
