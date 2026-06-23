# Firebase MVP 현황

## 1. 프로젝트 목적

`gas-quiz-firebase`는 운영본 `gas-quiz`의 핵심 학생용 흐름을 Firebase Hosting / Firestore 기반으로 이전한 MVP이다.

현재 배포본은 회원 연결, 퀴즈 목록, Firestore 문제 로드, 연습전/랭킹전, 기록 저장, 보상, 뱃지, 랭킹 광장, 상점, 인벤토리, 내 집 설정까지 연결되어 있다. 운영본 `gas-quiz`는 계속 분리 유지하며, Firebase MVP는 Firestore로 이관된 데이터만 사용한다.

## 2. 현재 구현된 화면

### 타운

- 퀴즈타운 지도 화면
- 플레이어 아바타와 현재 위치 표시
- 장소 카드: 중앙 광장, 내 집, 학교, 상점, 랭킹 광장, 이벤트 광장
- 장소별 설명 패널 또는 전용 화면 이동

### 학교

- 타운의 학교에서 진입
- 국어, 사회, 수학, 인기 퀴즈관으로 이동
- 이관 완료된 퀴즈는 Firestore 문제로 연습전/랭킹전을 실행
- 미이관 퀴즈 카드는 준비 중 상태로 표시

### 국어/사회/수학 과목관

- 공통 `subject-view`를 사용
- 과목별 데이터는 `SUBJECT_CATALOG`로 관리
- 국어: 맞춤법, 독서, 시간가게, 속담, 사자성어
- 사회: 삼국시대, 역사 인물, 문화유산, 사회 개념
- 수학: 곱셈과 나눗셈, 계산 연습

### 퀴즈 선택

- 선택한 퀴즈의 설명과 지원 모드 표시
- 모드 데이터는 `MODE_CATALOG`와 `QUIZ_CATALOG.modes`로 관리
- 연습전, 랭킹전, 원코 모드 진입 연결

### 문제 풀이

- 공통 퀴즈 엔진 사용
- Firestore `quizzes` / `quizQuestions` 문제 로드
- `random-basic`은 Firestore 메타 기반 생성형 문제 사용
- 객관식 선택, 정답 제출, 결과 표시, 다음 문제, 완료 화면
- 정답 처리 시 `practiceRecords`, `userPracticeSummary`, `userBadges`, `userEconomy` 갱신
- 랭킹전 종료 시 `rankingRecords`, `userRankingSummary`, `quizKingSummary` 갱신

### 랭킹 광장

- 타운의 랭킹 광장에서 진입
- `DJ48 명예의 전당` 화면
- 퀴즈왕, 국어왕, 사회왕, 수학왕, 인기왕, 최근 도전자 카드 표시
- Firestore `rankingRecords`와 `quizKingSummary` 기반
- 분야별 랭킹은 같은 사용자/같은 분야의 최고 기록 1건만 표시

### 내 집

- 타운의 내 집에서 진입
- 프로필 카드 표시
- 닉네임, 학교, 대표 칭호, 대표 뱃지, 보유 코인, 경험치 표시
- 보유 칭호와 보유 뱃지 목록 표시
- Firestore `userTitles`, `userTitleSummary`, `userBadges` 기준 표시
- `userInventory/{dataOwnerId}/items`를 읽어 보유 꾸미기 아이템 표시
- 보유 아이템을 선택하면 `userRoomSettings/{dataOwnerId}`에 내 집 설정 저장
- 회원 연결 완료 후에는 `dataOwnerId`가 운영본 회원 `userId`가 된다.
- 저장된 선택 상태는 재진입/새로고침 후 `적용중` 상태로 표시
- Auth 실패 시 개발용 `test_user` 경로로 fallback
- Firestore 읽기 실패 시에만 정적 fallback 사용

### 상점

- 타운의 상점에서 진입
- `DJ48 상점` 화면
- 카테고리: 배경, 아바타, 칭호 프레임
- `shopItems` Firestore 컬렉션에서 상점 아이템 읽기
- `assetCatalog` Firestore 컬렉션에서 아이콘/이미지 메타데이터 읽기
- Firestore 읽기 실패 시 기존 `SHOP_ITEMS`와 아이콘 fallback 유지
- Firebase Auth 익명 로그인 연결 완료
- `getCurrentUserId()`는 Auth `currentUser.uid`를 우선 사용
- `getCurrentDataOwnerId()`는 `currentMemberUserId` -> Auth `uid` -> `test_user` 순서로 경제/인벤토리/내 집 데이터 소유자를 결정
- Auth `uid`와 연결된 `users` 문서를 자동 복구해 새로고침/재진입 후에도 `currentMemberUserId`와 `currentMemberProfile` 유지
- localStorage의 회원 힌트는 Firestore `users/{memberUserId}.authUid` 재검증을 통과할 때만 사용
- Auth 실패 시 개발용 `test_user` fallback 유지
- `userEconomy/{memberUserId}`에서 DJ코인 잔액 읽기
- `userInventory/{memberUserId}/items`를 읽어 보유 아이템 상태 표시
- 구매 가능, 코인 부족, 보유중 상태 표시
- 구매 시 `purchaseShopItem` Cloud Function으로 DJ코인 차감, 인벤토리 추가, `purchaseLogs` 기록
- 회원 연결 완료 상태에서만 구매 가능하며 운영본 회원 `userId` 기준으로 동작
- 기존 Auth `uid` 기준 내 집 데이터가 있고 회원 `userId` 기준 데이터가 없으면 최초 1회 자동 migration 지원

### 이벤트 광장

- 타운의 이벤트 광장에서 진입
- 오늘의 퀘스트, 주간 학급 미션, 시즌 이벤트 표시
- 퀘스트 상태: 진행 중, 완료 가능, 준비 중
- 학급 미션은 전체 진행도 바 표시
- `QUEST_DATA`, `CLASS_MISSION_DATA`, `SEASON_EVENT_DATA` 기반

## 3. 현재 화면 흐름

- 타운 -> 학교 -> 과목관 -> 퀴즈 선택 -> 연습전 -> 퀴즈 완료 -> 모드 선택
- 타운 -> 랭킹 광장 -> 타운
- 타운 -> 내 집 -> 타운
- 타운 -> 상점 -> 타운
- 타운 -> 상점 -> 회원 연결 -> `userEconomy/{memberUserId}` 잔액 표시 -> 구매
- 타운 -> 내 집 -> Firebase 회원 연결 테스트 -> `users/{memberUserId}.authUid` 연결
- 새로고침/재진입 -> 현재 Auth `uid`로 연결된 `users` 문서 자동 복구
- 회원 연결 완료 -> 기존 `uid` 소유 내 집 데이터를 `memberUserId` 소유 데이터로 자동 migration
- 타운 -> 상점 -> 구매 -> `userInventory/{memberUserId}/items` 저장 -> 내 집 보유 아이템 표시
- 타운 -> 내 집 -> 보유 아이템 선택 -> `userRoomSettings/{memberUserId}` 저장 -> 내 집 재진입 시 적용 상태 유지
- 타운 -> 이벤트 광장 -> 타운
- 타운의 중앙 광장 등 일부 장소는 기존 장소 안내 모달 유지

## 4. 주요 데이터 구조

### `MODE_CATALOG`

- 퀴즈 모드 메타데이터
- 현재 모드: `practice`, `ranking`, `oneChance`, `records`
- 연습전만 실제 문제 풀이 화면으로 연결

### `SUBJECT_CATALOG`

- 과목관 메타데이터
- 과목별 제목, 안내 문구, 보드 문구, 퀴즈 목록 관리
- 국어, 사회, 수학을 같은 `subject-view`에서 렌더링

### `QUIZ_CATALOG`

- 퀴즈별 제목, 설명, 소속 과목, 지원 모드 관리
- `time_store`는 `parentQuizId: 'reading'`으로 독서 하위 성격을 표현

### `QUESTION_BANK`

- Firestore 로드 실패 시 사용하는 비상 fallback 문제 저장소
- 정상 흐름은 Firestore `quizzes` / `quizQuestions`를 우선 사용
- 배포 전 검증 기준 모든 playable quiz의 Firestore 메타/문항 수 일치 확인 완료

### `PROFILE_DATA`

- 회원 연결 전 또는 Firestore 읽기 실패 시 사용하는 fallback 사용자 데이터

### `TITLE_DATA`

- 회원 연결 전 또는 Firestore 읽기 실패 시 사용하는 fallback 칭호 데이터
- 정상 흐름은 Firestore `userTitles` / `userTitleSummary`를 우선 사용

### `BADGE_DATA`

- 회원 연결 전 또는 Firestore 읽기 실패 시 사용하는 fallback 뱃지 데이터
- 정상 흐름은 Firestore `userBadges`를 우선 사용

### `RANKING_DATA`

- 랭킹 광장 Firestore 읽기 실패 시 사용하는 fallback 데이터
- 정상 흐름은 Firestore `rankingRecords` / `quizKingSummary`를 우선 사용

### `SHOP_ITEMS`

- Firestore `shopItems` 읽기 실패 시 사용하는 정적 fallback 상점 아이템 카탈로그
- 필드: `itemId`, `category`, `name`, `desc`, `price`, `icon`
- 현재 상점 기본 데이터는 Firestore `shopItems`를 우선 사용

### `shopItems`

- Firestore 상점 아이템 카탈로그
- 현재 연결 완료
- 필드: `itemId`, `category`, `name`, `desc`, `price`, `priceType`, `enabled`, `sortOrder`, `imageUrl`, `assetId`, `rarity`
- 구매 시 화면 값이 아니라 Firestore 문서를 transaction 안에서 다시 확인

### `assetCatalog`

- Firestore 이미지/아이콘 메타데이터 카탈로그
- 현재 연결 완료
- `shopItems.assetId`로 연결
- `imageUrl`이 비어 있거나 `TODO`이면 `fallbackIcon` 또는 기존 아이콘 fallback 사용

### `userEconomy`

- 데이터 소유자 기준 DJ코인 잔액 저장
- 현재 경로: `userEconomy/{dataOwnerId}`
- `dataOwnerId` 우선순위: 운영본 회원 `currentMemberUserId` -> Auth `uid` -> 개발용 `test_user`
- 신규 데이터 소유자 문서가 없으면 최초 진입 시 자동 생성
- 초기 필드: `userId`, `djCoin: 1000`, `totalEarned: 1000`, `totalSpent: 0`, `createdAt`, `updatedAt`, `source: "initial_grant"`
- 구매 시 `djCoin` 차감 및 `totalSpent` 증가
- 회원 연결 후 `userEconomy/{uid}`가 있고 `userEconomy/{memberUserId}`가 없으면 최초 1회 복사
- migration 필드: `migratedFromUid`, `migratedAt`
- 기존 `userEconomy/{memberUserId}`가 있으면 덮어쓰지 않음

### `userInventory`

- 데이터 소유자 기준 보유 아이템 저장
- 현재 경로: `userInventory/{dataOwnerId}/items/{itemId}`
- `purchaseShopItem` Cloud Function이 상점 구매 성공 시 보유 아이템 문서 생성
- 내 집 화면에서 보유 꾸미기 아이템 후보로 사용
- 일반 클라이언트 write는 Rules에서 차단

### `purchaseLogs`

- 상점 구매 로그 저장
- `purchaseShopItem` Cloud Function이 구매 성공 시 `purchaseLogs/{autoId}` 생성
- 문서 내부 `userId`/`memberUserId`는 운영본 회원 `userId`를 기록
- `serverVerified: true`
- 일반 클라이언트 write는 Rules에서 차단

### `userRoomSettings`

- 데이터 소유자 기준 내 집 선택 설정 저장
- 현재 경로: `userRoomSettings/{dataOwnerId}`
- 필드: `userId`, `selectedBackgroundItemId`, `selectedAvatarItemId`, `selectedTitleFrameItemId`, `updatedAt`
- 보유 아이템 선택 시 카테고리별 필드에 저장
- 회원 연결 후 `userRoomSettings/{uid}`가 있고 `userRoomSettings/{memberUserId}`가 없으면 최초 1회 복사
- migration 필드: `migratedFromUid`, `migratedAt`
- 기존 `userRoomSettings/{memberUserId}`가 있으면 덮어쓰지 않음
- Auth 실패 시 `userRoomSettings/test_user` fallback 사용

### `users`

- 운영본 GAS `회원정보`에서 Firebase migration export JSON 생성 완료
- Firestore `users` 컬렉션 import 완료
- 총 148명 import 완료: 학생 146명, 관리자 2명
- 상태: active 147명, inactive 1명
- 문서 경로: `users/{userId}`
- 주요 필드: `userId`, `legacyMemberId`, `school`, `grade`, `classNumber`, `studentNumber`, `nickname`, `role`, `status`, `active`, `passwordMode`, `initialPasswordChanged`, `profileImageUrl`, `selectedTitleId`, `rankingMessage`, `createdAt`, `updatedAt`, `migratedAt`
- 비밀번호, 평문 password, password hash는 import하지 않음
- 입력에 `authUid`가 없으면 기존 `users/{userId}.authUid`를 덮어쓰지 않는 정책 적용
- `users/{memberUserId}.authUid` 연결 1차 구현 완료
- 자동 복구 흐름:
  - localStorage 힌트 `memberUserId` -> `users/{memberUserId}` 단건 읽기 -> `authUid` 재검증
  - 힌트가 없거나 실패하면 `users where authUid == current uid limit 1` 역조회
- 현재 로그인 정책은 학교/학년/반/번호 + 비밀번호를 Cloud Functions에서 검증한 뒤 `authUid`를 연결/재연결한다.
- 최초 비밀번호 설정은 2026-06-17 23:59:59 KST까지 기존 닉네임 검증 후 허용한다.
- 현재 브라우저 테스트를 위해 `authUid` 연결 해제 버튼 제공
  - 연결된 본인 문서만 `authUid: ''`로 업데이트 가능
  - 해제 후 localStorage 힌트 제거, Firebase Auth 익명 세션 재생성
- 비밀번호 초기화는 운영자 스크립트 `scripts/maintenance/reset-member-password.js`로 특정 회원만 임시 비밀번호 `학년+반+번호`로 재설정하고, 로그인 후 강제 변경한다.
- 운영본 `gas-quiz`는 계속 유지하며, Firebase 실험본은 새 사이트 전환 준비용으로 분리 유지

### `userTitles`

- 운영본 GAS `타이틀현황`에서 Firebase migration export JSON 생성 완료
- Firestore 경로: `userTitles/{memberUserId}/titles/{titleId}`
- 실제 import 완료: 타이틀 문서 11건, 보유 타이틀 사용자 5명
- `users.selectedTitleId`와 일치하는 보유 타이틀은 `selected: true`로 저장

### `userTitleSummary`

- Firestore 경로: `userTitleSummary/{memberUserId}`
- 실제 import 완료: 요약 문서 5건
- 주요 필드: `userId`, `memberUserId`, `titleCount`, `selectedTitleId`, `selectedTitleName`, `missingSelectedTitle`, `migratedAt`, `migrationSource`
- 검증 결과 `missingSelectedTitle` 누락 없음

### `practiceRecords`

- 운영본 GAS `연습기록` / `포켓몬연습기록` Drive export/import 완료
- Firestore 경로: `practiceRecords/{recordId}`
- 실제 import 완료: practice record 303건
- `recordId`는 운영본 `userId + areaKey` 기준으로 저장
- `LEGACY_UNKNOWN_*` 보완 정책 적용: legacy unknown record 4건 확인
- export 기준 `포켓몬연습기록` row는 0건이었고, 포켓몬 중복 병합 대상은 없었다.

### `userPracticeSummary`

- Firestore 경로: `userPracticeSummary/{memberUserId}`
- 실제 import 완료: 요약 문서 97건
- 주요 필드: `totalStars`, `earnedBadgeCount`, `groupStars`, `recommendedBadgeId`, `recordCount`, `legacyUnknownRecordCount`, `groups`

### `userBadges`

- Firestore 경로: `userBadges/{memberUserId}/badges/{badgeId}`
- 실제 import 완료: badge 문서 303건
- `practiceRecords`에서 파생된 materialized badge view로 저장
- public UI 내 집/프로필 뱃지 표시와 연습전 정답 처리 후 갱신 연결 완료

### `rankingRecords`

- 운영본 GAS `랭킹기록` / `기록저장` Drive export/import 완료
- Firestore 경로: `rankingRecords/{recordId}`
- 실제 import 완료: ranking record 3947건
- export 기준 `랭킹기록` 3097건, `기록저장` legacy 850건
- `userId` 없는 legacy row 6건은 `legacy_name_*` fallback key로 분리 저장

### `userRankingSummary`

- Firestore 경로: `userRankingSummary/{memberUserId}`
- 실제 import 완료: 요약 문서 112건
- 주요 필드: `byMode`, `bestScoresByMode`, `totalRecordCount`, `legacyRecordCount`
- 랭킹전 종료 후 갱신 연결 완료

### `quizKingSummary`

- Firestore 경로: `quizKingSummary/{memberUserId}`
- 실제 import 완료: 퀴즈왕 요약 문서 109건
- 사용자별 카테고리 최고 점수 합산 방식으로 생성
- 검증 기준 1위: `G4-C8-N19`, 총점 342점, 반영 카테고리 8개

### `quizzes`

- 운영본 GAS 퀴즈 데이터 Drive export/import 완료
- Firestore 경로: `quizzes/{quizId}`
- 실제 import 완료: `random-basic`, `spelling`, `word-relation`, `gmo`, `samgukji`, `ancient-history`, `time_store`, `history-people`, `idol`, `anime`, `dad-joke`, `pokemon-gen1`~`pokemon-gen9`
- `random-basic`은 생성형 메타만 저장: `generatorType: math-muldiv`, `questionCount: 100`
- 배포 전 Firestore 문서 존재와 문항 수 검증 완료

### `quizQuestions`

- Firestore 경로: `quizQuestions/{quizId}/questions/{questionId}`
- 실제 import 완료:
  - `spelling` 205건
  - `word-relation` 100건
  - `gmo` 100건
  - `samgukji` 100건
  - `ancient-history` 100건
  - `time_store` 50건
  - `history-people` 100건
  - `idol` 100건
  - `anime` 100건
  - `dad-joke` 203건
  - `pokemon-gen1`~`pokemon-gen9` 세대별 151/100/135/107/156/72/88/96/120건
- `random-basic`은 시트 문제가 없어 question 문서를 저장하지 않음

### `USER_REWARD_DATA`

- 회원 연결 전 또는 Firestore 읽기 실패 시 사용하는 fallback 보상 데이터
- 정상 흐름은 `userEconomy`를 우선 사용
- 연습전 신규 correctId 저장 성공 시 DJ코인 +1 지급

### `QUEST_DATA`

- 오늘의 퀘스트 목록
- 퀘스트명, 진행도, 보상, 상태 표시

### `CLASS_MISSION_DATA`

- 주간 학급 미션 목록
- 현재 진행값, 목표값, 보상 예고 관리
- 화면에서는 진행도 바 표시

### `SEASON_EVENT_DATA`

- 시즌 이벤트 목록
- 이벤트명, 설명, 기간 표시

## 5. 오픈 전 남은 TODO

- 학생용 로그인 보안 정책 확정
  - 회원 연결은 비밀번호 + Cloud Functions 검증 후 `authUid`를 연결/재연결한다.
  - 최초 설정 기간은 `authSettings/memberPasswordSetup`에서 제어하며 기본 만료는 2026-06-17 23:59:59 KST이다.
  - 비밀번호 초기화는 운영자 스크립트로 특정 회원만 처리하고, 임시 비밀번호 로그인 후 강제 변경한다.
- Functions 기반 서버 검증
  - 회원 연결, 연습전 정답 보상, 상점 구매는 Cloud Functions 기반으로 전환 완료
  - `users.authUid`, `userEconomy`, `userInventory`, `purchaseLogs`의 일반 클라이언트 직접 write는 차단 완료
  - 랭킹전/연습기록/내 집 설정은 현재 MVP 기능상 클라이언트 write를 유지한다.
- 이벤트/퀘스트/학급 미션 실제 진행도 연결
  - 현재 이벤트 광장은 안내/표시 중심이다.
- 미이관 퀴즈 처리
  - 속담, 사자성어, 문화유산, 사회 개념, 계산 연습은 준비 중 상태로 유지한다.
- 이미지 자산 정리
  - 상점 자산은 `assetCatalog.fallbackIcon` 중심이며, 실제 Storage 이미지 연결은 후속 작업이다.

## 6. 현재 연결된 것

현재 연결된 것:

- Firebase SDK
- Firebase Auth 익명 로그인
- Auth `currentUser.uid` 우선 사용자 ID resolver
- 회원 연결 완료 시 운영본 회원 `userId` 우선 데이터 소유자 resolver
- Firestore `shopItems`
- Firestore `assetCatalog`
- Firestore `userEconomy/{dataOwnerId}`
- Firestore `userInventory/{dataOwnerId}/items`
- Firestore `purchaseLogs`
- Firestore `userRoomSettings/{dataOwnerId}`
- Firestore `users` 운영본 회원 148명 import
- Firestore `userTitles/{memberUserId}/titles/{titleId}` 운영본 타이틀현황 11건 import
- Firestore `userTitleSummary/{memberUserId}` 타이틀 요약 5건 import
- Firestore `practiceRecords/{recordId}` 운영본 연습기록 303건 import
- Firestore `userPracticeSummary/{memberUserId}` 연습/뱃지 요약 97건 import
- Firestore `userBadges/{memberUserId}/badges/{badgeId}` 뱃지 303건 import
- Firestore `rankingRecords/{recordId}` 운영본 랭킹기록 3947건 import
- Firestore `userRankingSummary/{memberUserId}` 랭킹 요약 112건 import
- Firestore `quizKingSummary/{memberUserId}` 퀴즈왕 요약 109건 import
- Firestore `quizzes/{quizId}` playable 퀴즈 import
- Firestore `quizQuestions/spelling/questions/{questionId}` 맞춤법 문제 205건 import
- Firestore `quizQuestions/word-relation/questions/{questionId}` 다의어·동형이의어 문제 100건 import
- Firestore `quizQuestions`의 GMO/사회/시간가게/이미지형/아재개그/포켓몬 문제 import
- public UI의 Firestore 문제 로드, 연습전, 랭킹전, 결과 표시
- public UI의 `practiceRecords`, `userPracticeSummary`, `userBadges` 신규 write
- `userEconomy` 보상/구매 write는 Cloud Functions 기반
- public UI의 `rankingRecords`, `userRankingSummary`, `quizKingSummary` 신규 write
- `users.selectedTitleId`와 보유 타이틀 `selected` 표시 연결
- `users/{memberUserId}.authUid` 회원 연결
- Auth `uid` 기반 연결 회원 자동 복구
- localStorage 힌트와 Firestore 재검증 기반 회원 복구
- Auth `uid` 소유 내 집 데이터에서 회원 `userId` 소유 데이터로 최초 1회 자동 migration
- linked member 접근을 허용하는 `firestore.rules` 보완
- Firestore Emulator rules 로딩 확인
- Auth 실패 시 개발용 `test_user` fallback

## 7. 실제 Firebase Console 기준 테스트 결과

확인 완료:

- 로컬 Hosting Emulator는 화면만 로컬에서 실행한다.
- 현재 구조에서는 Firestore Emulator가 아니라 실제 Firebase 프로젝트의 Firestore/Auth를 사용한다.
- Firestore Emulator UI가 비어 있어도 현재 연결 구조에서는 정상일 수 있다.
- 실제 Firebase Console에서 Auth `uid` 생성 확인 완료
- 실제 Firebase Console에서 `userEconomy` 문서 확인 완료
- 실제 Firebase Console에서 `userInventory` 문서 확인 완료
- 실제 Firebase Console에서 `userRoomSettings` 문서 확인 완료
- 실제 Firebase Console에서 `purchaseLogs` 문서 확인 완료
- 실제 Firebase Console 기준 `shopItems`와 `assetCatalog` 표시 정상 확인 완료
- 운영본 GAS 회원 export/import 완료
- Firestore `users` 컬렉션에 148명 저장 확인 완료
- `users` role 집계 확인 완료: student 146명, admin 2명
- `users` status 집계 확인 완료: active 147명, inactive 1명
- `users` 문서에 비밀번호 계열 필드가 없는 것 확인 완료
- `users` 문서의 `authUid` 매핑 1차 구현 완료
- 운영본 `타이틀현황` Drive export/import 완료
- Firestore `userTitles` 하위 컬렉션에 11건 저장 확인 완료
- Firestore `userTitleSummary` 컬렉션에 5건 저장 확인 완료
- `users.selectedTitleId`와 `userTitles`의 `selected` 표시 일치 확인 완료
- `missingSelectedTitle` 누락 없음 확인 완료
- 운영본 `연습기록` / `포켓몬연습기록` Drive export/import 완료
- Firestore `practiceRecords` 컬렉션에 303건 저장 확인 완료
- Firestore `userPracticeSummary` 컬렉션에 97건 저장 확인 완료
- Firestore `userBadges` 하위 컬렉션에 303건 저장 확인 완료
- `LEGACY_UNKNOWN_*` 보완 record 4건 확인 완료
- 포켓몬 중복 병합 대상 없음 확인 완료
- 운영본 `랭킹기록` / `기록저장` Drive export/import 완료
- Firestore `rankingRecords` 컬렉션에 3947건 저장 확인 완료
- Firestore `userRankingSummary` 컬렉션에 112건 저장 확인 완료
- Firestore `quizKingSummary` 컬렉션에 109건 저장 확인 완료
- 랭킹 legacy row 850건, `userId` 없는 row 6건 fallback 저장 확인 완료
- `quizKingSummary` 상위 샘플 확인 완료: `G4-C8-N19`, `G4-C8-N21`, `G4-C8-N20`
- 운영본 기본 퀴즈 1차 Drive export/import 완료
- Firestore `quizzes/random-basic`, `quizzes/spelling`, `quizzes/word-relation` 저장 확인 완료
- Firestore `quizQuestions/spelling/questions` 205건 저장 확인 완료
- Firestore `quizQuestions/word-relation/questions` 100건 저장 확인 완료
- `random-basic` 생성형 메타 `generatorType: math-muldiv` 확인 완료
- Auth `uid` 기반 자동 회원 복구 구현 완료
- localStorage 힌트와 Firestore `authUid` 재검증 구조 구현 완료
- 회원 연결 후 경제/인벤토리/내 집 데이터가 회원 `userId` 기준으로 동작하는 구조 구현 완료
- 기존 Auth `uid` 소유 내 집 데이터를 회원 `userId` 소유 데이터로 최초 1회 migration하는 구조 구현 완료
- 경제/인벤토리는 서버 Functions가 회원 `userId` 기준으로 직접 생성/갱신한다.
- linked member 접근을 허용하도록 `firestore.rules` 보완 완료
- `firebase emulators:exec --only firestore "echo rules-loaded"`로 rules 로딩 확인 완료

현재 주요 기능 루프:

1. Firebase Auth 익명 로그인으로 `uid` 생성
2. 회원 연결 후 `userEconomy/{memberUserId}` 기준 DJ코인 표시
3. 내 집의 Firebase 회원 연결 테스트에서 운영본 회원 `userId`를 찾아 `users/{memberUserId}.authUid` 연결
4. 새로고침/재진입 시 Auth `uid`로 연결된 `users` 문서를 자동 복구
5. 연결된 회원이 있으면 데이터 소유자를 `memberUserId`로 전환
6. 기존 `uid` 기준 내 집 데이터가 있고 `memberUserId` 기준 데이터가 없으면 자동 migration
7. 상점에서 `shopItems`와 `assetCatalog` 기반 아이템 표시
8. 상점 구매는 `purchaseShopItem` Cloud Function transaction 실행
9. `userInventory/{memberUserId}/items`에 구매 아이템 저장
10. 내 집에서 보유 아이템 표시
11. 내 집 적용 선택을 `userRoomSettings/{memberUserId}`에 저장

주의:

- 위 연결은 Firebase Auth 익명 사용자와 운영본 회원 `userId`를 연결하는 MVP 흐름이다.
- 비밀번호 검증은 Cloud Functions에서 처리하며, 클라이언트는 평문 비밀번호를 Firestore에 직접 쓰지 않는다.
- Firestore rules는 linked member 접근을 허용하며, `users.authUid`, 경제, 인벤토리, 구매 로그의 일반 클라이언트 write를 차단한다.
- 구매/경제/인벤토리 추가는 `purchaseShopItem` Cloud Function으로 이전했다.
- `userEconomy`, `userInventory`, `purchaseLogs` 일반 클라이언트 write는 Rules에서 차단했다.
- 내 집 설정 저장은 `userRoomSettings/{memberUserId}` 클라이언트 write를 유지한다.
- Firebase Storage 실제 이미지 연결 전이며, 현재는 `assetCatalog.fallbackIcon` 중심이다.
- push/deploy 전 최종 브라우저 검증이 필요하다.
- Firestore Emulator까지 함께 검증하려면 별도의 Emulator 연결 코드와 seed/import 데이터가 필요하다.

## 8. 수동 테스트 체크리스트

1. 회원 연결
   - 내 집의 Firebase 회원 연결 테스트에서 학교/학년/반/번호 입력
   - active student 회원이면 `users/{memberUserId}.authUid` 연결 확인

2. 새로고침 후 자동 복구
   - 같은 브라우저에서 새로고침 또는 재진입
   - 연결된 회원 표시가 자동 복구되는지 확인
   - localStorage 힌트가 있어도 Firestore `authUid` 재검증 후 복구되는지 확인

3. 상점 DJ코인 표시
   - 상점 진입 후 `userEconomy/{memberUserId}` 기준 DJ코인 표시 확인
   - 기존 `uid` 기준 문서가 있던 경우 `memberUserId` 기준 문서로 migration되는지 확인

4. 구매
   - 구매 가능 아이템 클릭
   - DJ코인 차감, 구매 완료 메시지, 보유중 상태 변경 확인

5. 인벤토리 저장
   - Firestore Console에서 `userInventory/{memberUserId}/items/{itemId}` 생성 확인
   - 내 집 보유 아이템 목록에 구매 아이템 표시 확인

6. 내 집 설정 저장
   - 내 집에서 보유 아이템 선택
   - `userRoomSettings/{memberUserId}` 저장 확인
   - 새로고침/재진입 후 `적용중` 상태 유지 확인

7. 다른 uid 재연결
   - 다른 브라우저/프로필/시크릿 창에서 같은 회원 연결 시도
   - 현재 테스트 정책에서는 현재 로그인 정보로 재연결되는지 확인
   - 운영 전에는 비밀번호 또는 서버 검증 없이 재연결되지 않도록 정책 확정 필요

8. 현재 브라우저 연결 해제
   - 내 집 회원 연결 패널에서 `현재 브라우저 연결 해제` 클릭
   - 서버 `users/{memberUserId}.authUid`를 직접 비우지 않고 브라우저 세션과 localStorage 힌트를 초기화
   - 새 익명 uid로 전환되고 다른 학생 정보로 다시 연결 가능한지 확인 완료

9. Firebase MVP 회귀 확인
   - 회원 연결/연결 해제, 자동 복구, 홈/프로필/칭호/뱃지 표시 정상 확인
   - 연습전 최초 기록 생성, 기존 기록 갱신, `practiceRecords`/`userPracticeSummary`/`userBadges`/`userEconomy` 반영 정상 확인
   - 랭킹전 저장과 랭킹 광장 Firestore 표시 정상 확인
   - 상점 구매/장착, 내 집 설정 저장 정상 확인

## 9. 다음 작업 추천 순서

1. 최종 브라우저 리그레션 확인
   - 핵심 흐름은 1차 확인 완료
   - 오픈 직전에는 회원 1~2명으로 회원 연결, 연습전, 랭킹전, 상점, 내 집을 한 번 더 확인
   - 콘솔에 `permission-denied`, `progress save failed`, `quiz load failed`, `ranking plaza read failed`가 없는지 확인

2. 비밀번호/초기비밀번호 검증 정책 확정
   - 접속 코드는 사용하지 않는 방향으로 전환 완료
   - 최초 설정: 학교/학년/반/번호 + 기존 닉네임 확인 후 비밀번호 등록
   - 일반 로그인: 학교/학년/반/번호 + 비밀번호 확인
   - 초기 설정 기간: 2026-06-17 23:59:59 KST까지 `authSettings/memberPasswordSetup`에서 제어
   - 초기화: `scripts/maintenance/reset-member-password.js`로 특정 회원 비밀번호를 `학년+반+번호` 임시값으로 reset 후 강제 변경
   - `startMemberPasswordSetup`, `setMemberPassword`, `loginMemberWithPassword`, `changeMemberPassword` Functions deploy 완료
   - 회원 연결 UI는 비밀번호 입력 + callable 연결 방식으로 배포했고, 4학년 8반 22번 브라우저 로그인 확인 완료
   - 클라이언트 직접 `users.authUid` update rules는 제거 완료
   - `users/{memberUserId}.authUid` 재연결은 서버 비밀번호 검증 성공 이후로 제한한다.

3. Functions 기반 경제 처리
   - `functions/` scaffold 추가 완료
   - 회원 접속 코드 검증 callable은 배포 및 브라우저 확인 완료
   - 연습전 정답 보상 지급은 `grantPracticeReward` callable 기반으로 전환 완료
   - 중복 지급 방지는 `rewardLogs/{deterministicId}`로 처리
   - 상점 구매는 `purchaseShopItem` callable 기반으로 전환 완료
   - `userEconomy`, `userInventory`, `purchaseLogs` 일반 클라이언트 write 차단 완료

4. 미이관 퀴즈 처리
   - 속담, 사자성어, 문화유산, 사회 개념, 계산 연습을 이관할지 준비 중으로 유지할지 결정

5. Firebase Storage 이미지 연결
   - `assetCatalog.imageUrl`에 실제 이미지 URL 입력
   - 상점과 내 집 카드에서 이미지 표시 확인
   - 이미지 실패 시 fallback icon 유지 확인

6. 이벤트/퀘스트/학급 미션 실제화
   - 이벤트 광장 표시 데이터를 실제 기록/보상과 연결

## 9.1 운영 안정화 진행 상태

- Cloud Functions 런타임을 Node.js 22로 전환 완료
- `firebase-functions`를 7.2.5로 갱신 완료
- `firebase-admin`은 `firebase-functions` 7.2.5 peer dependency와 호환되는 13.x 범위로 유지
- `firebase deploy --only functions`에서 Node.js 22 업데이트 성공 확인
- Node.js 20 deprecation deploy warning은 해소됨
- `npm audit --omit=dev` 확인 결과, transitive Google client dependency 경로의 moderate 취약점이 남아 있음
  - 자동 force fix는 `firebase-admin@14`로 올리며 현재 `firebase-functions@7.2.5` peer 범위와 충돌
  - `firebase-functions`가 `firebase-admin@14`를 지원할 때 재검토 필요
- 운영 백업 dry-run 스크립트 추가 및 실행 확인
  - `scripts/audit/export-operational-backup.js`
  - root collection 및 subcollection collectionGroup 백업 집계 확인
  - 실제 백업 파일은 `--commit` 실행 시 `private/backups/`에만 저장
- 운영 지표 점검 스크립트 추가 및 실행 확인
  - `scripts/audit/inspect-operational-metrics.js`
  - 회원/기록/랭킹/보상/구매/미연결 학생 지표 출력 확인
- 운영 절차 문서 추가
  - `docs/operations/OPERATIONAL_RUNBOOK.md`

## 10. 운영본 주의사항

- 이 문서는 Firebase 실험본 `~/Projects/gas-quiz-firebase` 기준이다.
- 운영본 `~/Projects/gas-quiz`와 혼동하지 말 것.
- 운영본 파일, GAS 배포, 운영 데이터는 이 프로토타입 작업 중 수정하지 않는다.
- 운영본 `gas-quiz`는 계속 유지한다.
- `gas-quiz-firebase`는 새 사이트 전환 준비용으로 별도 검증 중이다.
- Firebase 실험본은 운영본 회원 `users` 컬렉션 import, `authUid` 연결, 자동 복구, memberUserId 기준 데이터 소유권 전환까지 완료했다.
- Firestore 퀴즈 데이터, 연습전 저장, 보상, 뱃지, 랭킹전, 랭킹 광장 UI 연결까지 완료했다.
