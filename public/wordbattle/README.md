# 낱말 대전 (온라인 대전) — 구조 · 연동 · 진행 방식

> DJ48 퀴즈타운 안에 들어 있는 **한글판 루미큐브** 미니게임.
> 자음·모음 타일로 낱말을 만들어 공용 보드에 내려놓고, 손패를 먼저 다 비우면 승리.
> 이 문서 하나로 폴더 구조 / 퀴즈타운 연동 / 게임 진행을 파악할 수 있게 정리했다.

- **운영 URL**: https://dj48-quiztown-firebase.web.app/wordbattle/
- **로컬 경로**: `/Users/kdw/Projects/gas-quiz-firebase/public/wordbattle/`
- **상위 프로젝트**: `gas-quiz-firebase` (Firebase Hosting + Firestore + Auth). 프로젝트 전반은 상위 `../../CLAUDE.md` 참고.
- **빌드 없음**: 순수 바닐라 JS (IIFE 모듈, `window.WB*` 전역). 번들러 안 씀. `public/` 폴더가 통째로 Hosting에 배포됨.

---

## 1. 파일 구조 (로드 순서 = 의존 순서)

`index.html` 이 아래 순서로 스크립트를 로드한다. 위에 있을수록 하위 모듈(전역 `WB*`)로 노출되어 다음 파일이 사용한다.

| 순서 | 파일 | 전역 | 역할 |
|-----|------|------|------|
| 0 | `/__/firebase/*` + `init.js` | `firebase` | Firebase compat SDK(App/Auth/Firestore). Hosting 예약 URL로 자동 주입. **로컬 python 서버엔 없어서 → 온라인만 비활성, 연습 모드는 동작** |
| 1 | `hangul.js` | `WBHangul` | 한글 자모 ↔ 글자 조합/분해 (`compose`, `decompose`). 초성19·중성21·종성28 유니코드 규칙 |
| 2 | `words-data.js` | `WB_WORDS` | **사전 데이터 (자동 생성, 80,774개)**. 국립국어원 학습용 어휘 + hunspell-dict-ko, NFC 정규화·욕설 필터·1~4글자 |
| 3 | `words.js` | `WBWords` | 낱말 판정 (`isValidWord`), 욕설 차단(`isBlocked`), 방별 승인어(`setApproved`), 힌트 추천(`suggest`) |
| 4 | `engine.js` | `WBEngine` | 게임 규칙(순수 로직): 타일 봉지(`makeBag`)·분배(`deal`)·뽑기(`drawTile`)·낱말 검증(`validateWord/Lay`) |
| 5 | `room.js` | `WBRoom` | **방 하나의 상태 리듀서**. 턴 처리·공용보드 확정·제안/동의·일시정지·나가기/항복·점수 집계. UI·네트워크와 분리 |
| 6 | `net.js` | `WBNet` | 통신 어댑터 3종 — `LocalNet`(연습)·`OnlineNet`(Firestore 실시간)·`BotNet`(vs AI). 모두 같은 세션 인터페이스 |
| 7 | `tutorial.js` | `WBTutorial` | 게임 방법 안내 모달 |
| 8 | `ui.js` | `WBUI` | 화면 렌더 + 입력 처리. 세션을 받아 대기/게임/종료 화면을 그림 (`WBUI.attach(session)`) |
| 9 | `main.js` | — | 첫 화면(방 만들기/목록/봇/연습), 로그인 보장(`ensureAuth`), 닉네임 조회 후 세션 생성 |

**핵심 계층 분리**: `engine`(규칙) → `room`(상태 리듀서) → `net`(통신) → `ui`(화면) → `main`(진입).
`room.js` 는 순수 함수라 로컬/온라인/봇 세 모드가 **완전히 같은 규칙**을 공유한다. 모드별 차이는 `net.js` 뿐이다.

---

## 2. 퀴즈타운과의 연동

낱말대전은 퀴즈타운(메인 앱) 안의 **독립 폴더**다. 코드는 분리돼 있고, 세 접점으로만 연결된다.

### (a) 로그인 공유 — 별도 로그인 없음
- 퀴즈타운은 Firebase **익명 인증**을 쓰고, 학생 실명은 `users` 문서에 `nickname`으로 저장하며 `authUid`로 로그인 계정과 연결한다.
- `main.js`의 `ensureAuth()`는 **기존 로그인을 그대로 재사용**한다. (과거엔 무조건 `signInAnonymously()`를 불러 기존 로그인을 익명으로 덮어써 닉네임이 `친구XXXX`로 뜨는 버그가 있었음 → 수정됨.)
- `lookupNickname()`이 `users` 컬렉션을 `authUid == 내 uid`로 조회해 진짜 이름을 가져온다.

### (b) 진입 지점 — 학교 메뉴
- 퀴즈타운 `public/index.html` 의 학교(school) 영역에 `온라인 대전` 항목 → `<a href="/wordbattle/">`.

### (c) 랭킹 광장 연동 — "온라인 대전" 탭 (별도 스크립트)
- 파일: **`public/js/wb-ranking-plaza.js`** (낱말대전 폴더 밖, 메인 앱 쪽. `app.bundle.js`에 포함 안 됨 — `index.html`에서 개별 로드).
- 랭킹 광장 하단 탭 줄(`퀴즈왕·시즌·국어…`)에 **`온라인 대전` 탭을 주입**하고, 그 안에 **`낱말 대전` 하위 탭 + 순위표**를 그린다 (국어 탭이 맞춤법·속담 하위탭을 갖는 것과 동일 구조).
- **기존 랭킹 데이터/집계 코드(`js/features/ranking-*.js`)는 건드리지 않는다.** 탭 클릭 전환은 기존 위임 핸들러(`#ranking-board-root`)가 처리하도록 `data-ranking-board-id="wordbattle"` / `data-ranking-sub-group-id="wordbattle-rank"` 속성만 맞춰 끼워 넣는다.
- 순위 데이터는 낱말대전 전용 컬렉션 `wordbattleRanking` 를 따로 읽어 표시(퀴즈 랭킹과 독립).

> 즉 **낱말대전 ↔ 퀴즈타운은 "로그인/닉네임"과 "랭킹 표시"만 공유**하고, 게임 로직·데이터는 서로 독립적이다.

---

## 3. Firestore 데이터 구조

| 경로 | 내용 | 보안 규칙 (`firestore.rules`) |
|------|------|------|
| `wordbattleRooms/{code}` | 공개 방 상태(`room` 객체 전체) | 로그인 시 read/create/update. delete 금지(콘솔만) |
| `wordbattleRooms/{code}/secret/deck` | 남은 타일 봉지(`bag`) | **read: false** (미리 못 보게 — 공정성), write: 로그인 |
| `wordbattleRooms/{code}/hands/{uid}` | 각자 손패(`tiles`) | read: **본인(uid)만**, write: 로그인(방장 딜링·본인 갱신) |
| `wordbattleRanking/{uid}` | 랭크 누적(`name·total·games·wins`) | read: 로그인, write: **본인만**, delete 금지 |

- 방 번호 `code` = 4자리 랜덤 숫자 (`genCode`).
- `wordbattleRanking` 은 `FieldValue.increment` 로 누적(각자 자기 문서만 갱신).
- 대기방 목록: `status == 'waiting'` + 최근 40분 이내 + 4명 미만만 노출.

---

## 4. 게임 진행 방식 (공용 보드 = 루미큐브 규칙)

### 타일과 분배 (`engine.js`)
- 자음 봉지 / 모음 봉지를 **따로** 만든다. 흔한 자모는 넉넉히, **겹자음(ㄲㄸㅃㅆㅉ)·겹모음(ㅘㅚㅢ 등)은 1장씩만** 둬서 쉽게 만든다.
- 게임 시작 시 각 플레이어에게 **자음 7 + 모음 7** 배분. 남은 건 봉지에.

### 턴 진행 (`room.js`)
- 인원: **2~4명** (봇 모드는 사람1 + 봇1).
- 한 턴 제한: **2분**(`TURN_MS`). 초과하면 타일 한 장 자동으로 받고 다음 사람에게 넘어감(`timeout`).
- 내 차례에 할 수 있는 것:
  1. **낱말 내려놓기(`commitTurn`)** — 아래 "확정 규칙" 참고.
  2. **타일 뽑기(`draw`)** — 자음/모음 골라 한 장. (그러면 턴 종료)
  3. **제안(`propose`)** — 사전에 없는 낱말을 쓰고 싶을 때.
  4. **힌트(`useHint`)** — 만들 수 있는 짧은 낱말 추천(점수 -3).

### 낱말 확정 규칙 (공용 보드, `commitTurn`)
바닥의 모든 타일은 **공용**이다. 내 차례에 자유롭게 재배치하고, 턴을 끝낼 때 아래 3가지를 모두 만족해야 확정:
1. **모든 낱말이 유효** (사전 or 방 승인어). `WBEngine.validateWord`.
2. **내 손패에서 최소 1개 이상 사용**.
3. **바닥에 있던 타일이 하나도 사라지지 않음** (버릴 수 없음, 다른 낱말로 재배치는 가능).

→ 손패를 **다 비우면 즉시 승리**("루미큐브!"). 또는 항복/나감으로 한 명만 남으면 그 사람 승리(`checkLastStanding`).

### 사전에 없는 낱말: 제안 → 동의 (`propose`/`agree`)
- 사전(`WB_WORDS`)에도 없고 욕설도 아니면 `canPropose: true` → 제안 가능.
- 제안하면 **나 빼고 살아있는 참가자 전원이 동의**해야 통과. 통과하면 `room.approvedWords`에 추가돼 **그 방에서만** 인정.
- 욕설·성적 낱말(`BLOCKED`/`BLOCKED_PARTS`)은 사전에서도 빠져 있고 제안도 불가.

### 기타 상태
- **일시정지(`requestPause`/`agreePause`/`resume`)**: 전원 동의 시 멈춤, 최대 50분.
- **나가기/항복(`leave`)**: 항복 시 랭크 감점(-20). 항복으로 게임이 끝나면 결과 화면이 뜨고 랭크가 기록됨(구독 유지).

### 점수 & 랭크 (`finalizeScores`)
게임 종료 시 개인 점수(`gameScore`) 계산:
```
gameScore = 만든 낱말 수 ×10  +  낸 자모 수 ×2  −  힌트 ×3  −  남은 손패 수  −  (항복 시 20)
```
- 승자 우선, 그다음 `gameScore` 순으로 등수.
- 등수별 **랭크 점수** `RANK_POINTS = [30, 15, 5, 0]` (1~4등)을 `wordbattleRanking`에 누적.

---

## 5. 세 가지 실행 모드 (`net.js`, 같은 세션 인터페이스)

| 모드 | 생성 | 특징 | 랭크 기록 |
|------|------|------|----------|
| **LocalNet** (연습) | `혼자 연습` 버튼 | 한 화면에서 2명 번갈아(pass-and-play). 백엔드 불필요 | ✕ (로컬만) |
| **OnlineNet** (온라인 대전) | 방 만들기 / 목록 클릭 입장 | Firestore `onSnapshot` 실시간 동기화 + `runTransaction`으로 액션 원자 적용 | ○ (본인 문서) |
| **BotNet** (봇 대전) | `🤖 봇과 대전` 버튼 | 사람1 vs `또박이 봇`. 봇은 `WBWords.suggest`로 낱말 탐색, 없으면 타일 뽑기 | ○ (로그인 시 랭크 누적) |

공통 인터페이스: `getRoom() / viewerId() / currentHand() / isMyTurn() / onChange(cb) / start() / commit(words) / draw(kind) / propose(text) / agree() / useHint() / leave(surrender) / recordRank()`.
→ `ui.js`는 어떤 모드인지 몰라도 이 인터페이스만 보고 동일하게 그린다.

**동시성 안전(온라인)**: 낱말 내기·제안·동의 등은 클라이언트 `runTransaction` 안에서 `room` 문서를 읽어 `WBRoom.리듀서`를 적용하고 다시 쓴다. 이때 `poolC/poolV`는 원래 값으로 보존해 0으로 덮이는 것을 막는다.

**뽑기·시간초과는 서버 함수(`wbDraw`)가 처리**: 남은 봉지(`secret/deck`)는 규칙이 `read: false`로 완전 차단돼 있고, `functions/index.js`의 `wbDraw` callable(리전 asia-northeast3)이 Admin SDK로만 읽는다 → 학생이 개발자도구로 남은 타일을 훔쳐볼 수 없다. `net.js`의 `OnlineNet.draw/timeout`이 이 함수를 호출한다. 오래된 방 정리는 스케줄 함수 `wbCleanupOldRooms`(매일 04:00 KST, 6시간 지난 방을 하위 문서까지 삭제)가 맡는다.

---

## 6. 분석/작업 시 시작점

- **게임 규칙을 알고 싶다** → `room.js`(리듀서) + `engine.js`(타일/검증)
- **온라인 동기화·데이터 흐름** → `net.js` (`OnlineNet`, `runAction`, Firestore 경로)
- **화면/입력 동작** → `ui.js`
- **로그인·닉네임·진입** → `main.js` (`ensureAuth`, `lookupNickname`)
- **퀴즈타운 랭킹 광장 연동** → `../js/wb-ranking-plaza.js` + `../js/features/ranking-render.js`(탭 위임 핸들러)
- **사전 판정·욕설필터** → `words.js` / 데이터는 `words-data.js`(자동 생성물, 직접 수정 금지)
- **보안 규칙** → `../../firestore.rules` 의 `wordbattleRooms` / `wordbattleRanking`

> ⚠️ 운영 사이트엔 학생 실데이터가 있다. Firestore 데이터 직접 수정, 요청 없는 `firebase deploy`는 금지(상위 `CLAUDE.md`).

---

## 7. 사전 출처·라이선스

- `words-data.js`의 출처와 가공 상태는 `DICTIONARY_NOTICE.md`에서 관리한다.
- 국립국어원 「한국어 학습용 어휘 목록」은 공공누리 제1유형 출처 표시 조건을 따른다.
- `hunspell-dict-ko` 파생 단어는 동일조건변경허락 조건이 포함될 수 있으므로, 사전 데이터만 떼어 무단 재배포하거나 다른 게임에 복사하지 않는다.
- 현재 생성 스크립트·입력 버전이 보존되지 않아 상류 라이선스 버전을 하나로 확정할 수 없다. 재생성·재배포 전에는 입력 커밋과 생성 절차부터 복구한다.
