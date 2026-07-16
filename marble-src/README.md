# 특산물 마블 (1:1 무역 대전) — 소스 · 빌드 · 연동

> 초등 4학년 사회(지역 특산물 + 수요·공급) 학습용 부루마블식 무역 게임.
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
| `battleLogic.js` | **1:1 대전 규칙(순수 리듀서)** — 공유 시장·번갈아 15턴·승패 판정 + 봇 AI. 연습/봇/온라인이 같은 규칙 공유 (낱말대전 room.js 역할) |
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

- 랭크 점수: 승 +30 / 패 +5 / 무승부 +18 (`battleLogic.js` RANK_WIN/RANK_LOSE)
- v1 은 낱말대전과 같은 클라이언트 트랜잭션 방식. 서버 검증(Functions)은 다음 단계.

## 5. 게임 규칙 요약

- 두 명이 같은 게임판·시장에서 번갈아 15턴씩(총 30턴)
- 산지 칸: 매판 랜덤 배정(지역+특산물 2~3개). 매입하면 공유 재고↓·값↑
- 시장/큰장: 판매. 같은 특산물 많이 팔면 값↓ (수요·공급 학습 포인트)
- 승리: 먼저 10,000원 도달 즉시 승 / 아니면 30턴 후 현금 비교
