# Firebase 실험본 프로토타입 현황

## 1. 프로젝트 목적

`gas-quiz-firebase`는 운영본 `gas-quiz`를 직접 수정하지 않고 Firebase Hosting 위에서 새 퀴즈타운 UI와 기능 흐름을 검증하기 위한 정적 프로토타입이다.

현재 목표는 화면 구조와 이동 흐름을 유지하면서 Firestore 읽기/쓰기 연결을 작은 범위부터 검증하는 것이다. 상점, 인벤토리, 내 집 설정은 Firebase Auth 익명 사용자 `uid`를 우선 사용하며, Auth 실패 시에는 개발용 `test_user` fallback을 유지한다.

## 2. 현재 구현된 화면

### 타운

- 퀴즈타운 지도 화면
- 플레이어 아바타와 현재 위치 표시
- 장소 카드: 중앙 광장, 내 집, 학교, 상점, 랭킹 광장, 이벤트 광장
- 장소별 설명 패널 또는 전용 화면 이동

### 학교

- 타운의 학교에서 진입
- 국어, 사회, 수학 과목관으로 이동
- 인기 퀴즈와 랭킹전 준비 중 카드는 더미 상태

### 국어/사회/수학 과목관

- 공통 `subject-view`를 사용
- 과목별 데이터는 `SUBJECT_CATALOG`로 관리
- 국어: 맞춤법, 독서, 시간가게, 속담, 사자성어
- 사회: 삼국시대, 역사 인물, 문화유산, 사회 개념
- 수학: 곱셈과 나눗셈, 계산 연습

### 퀴즈 선택

- 선택한 퀴즈의 설명과 지원 모드 표시
- 모드 데이터는 `MODE_CATALOG`와 `QUIZ_CATALOG.modes`로 관리
- 현재 실제 실행은 연습전만 연결

### 문제 풀이

- 공통 퀴즈 엔진 사용
- `QUESTION_BANK` 기반 더미 문제 풀이
- 객관식 선택, 정답 제출, 결과 표시, 다음 문제, 완료 화면

### 랭킹 광장

- 타운의 랭킹 광장에서 진입
- `DJ48 명예의 전당` 화면
- 퀴즈왕, 국어왕, 사회왕, 수학왕, 이번 주 상승왕 카드 표시
- `RANKING_DATA` 기반 더미 데이터

### 내 집

- 타운의 내 집에서 진입
- 프로필 카드 표시
- 닉네임, 학교, 대표 칭호, 대표 뱃지, 보유 코인, 경험치 표시
- 보유 칭호와 보유 뱃지 목록 표시
- `userInventory/{uid}/items`를 읽어 보유 꾸미기 아이템 표시
- 보유 아이템을 선택하면 `userRoomSettings/{uid}`에 내 집 설정 저장
- 저장된 선택 상태는 재진입/새로고침 후 `적용중` 상태로 표시
- Auth 실패 시 개발용 `test_user` 경로로 fallback
- `PROFILE_DATA`, `TITLE_DATA`, `BADGE_DATA`, `USER_REWARD_DATA` 기반

### 상점

- 타운의 상점에서 진입
- `DJ48 상점` 화면
- 카테고리: 배경, 아바타, 방 장식, 칭호 프레임
- `shopItems` Firestore 컬렉션에서 상점 아이템 읽기
- `assetCatalog` Firestore 컬렉션에서 아이콘/이미지 메타데이터 읽기
- Firestore 읽기 실패 시 기존 `SHOP_ITEMS`와 아이콘 fallback 유지
- Firebase Auth 익명 로그인 연결 완료
- `getCurrentUserId()`는 Auth `currentUser.uid`를 우선 사용
- Auth 실패 시 개발용 `test_user` fallback 유지
- 신규 Auth 사용자에게 `userEconomy/{uid}` 기본 문서 자동 초기화
- 초기 경제 문서에는 DJ코인 1000 지급
- `userEconomy/{uid}`에서 DJ코인 잔액 읽기
- `userInventory/{uid}/items`를 읽어 보유 아이템 상태 표시
- 구매 가능, 코인 부족, 보유중 상태 표시
- 구매 시 Firestore transaction으로 DJ코인 차감, 인벤토리 추가, `purchaseLogs` 기록
- 현재 구매 흐름은 Auth `uid` 기준이며, 운영본 회원 시스템과는 아직 매핑하지 않음

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
- 타운 -> 상점 -> Auth 익명 로그인 -> `userEconomy/{uid}` 초기화 -> 구매
- 타운 -> 상점 -> 구매 -> `userInventory/{uid}/items` 저장 -> 내 집 보유 아이템 표시
- 타운 -> 내 집 -> 보유 아이템 선택 -> `userRoomSettings/{uid}` 저장 -> 내 집 재진입 시 적용 상태 유지
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

- 퀴즈 엔진에서 사용하는 더미 문제 저장소
- 각 `quizId`별 객관식 문제 배열
- 현재 실제 운영본 문제와 연결하지 않음

### `PROFILE_DATA`

- 내 집 프로필 표시용 더미 사용자 데이터
- 아바타, 닉네임, 학교, 대표 칭호, 대표 뱃지 ID 포함

### `TITLE_DATA`

- 보유 칭호 목록
- 예: 전설의 퀴즈왕, 국어 마스터, 삼국시대 전문가, 독서왕

### `BADGE_DATA`

- 보유 뱃지 목록
- 예: 독서왕, 퀴즈왕, 랭킹전 챌린저

### `RANKING_DATA`

- 랭킹 광장 명예의 전당 표시용 더미 데이터
- 각 랭킹 카드의 카테고리, 1위 닉네임, 칭호 관리

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

- Auth 익명 사용자 `uid` 기준 DJ코인 잔액 저장
- 현재 `userEconomy/{uid}` 기준으로 상점 구매 프로토타입 연결
- 신규 Auth 사용자 문서가 없으면 최초 진입 시 자동 생성
- 초기 필드: `userId`, `djCoin: 1000`, `totalEarned: 1000`, `totalSpent: 0`, `createdAt`, `updatedAt`, `source: "initial_grant"`
- 구매 시 `djCoin` 차감 및 `totalSpent` 증가
- Auth 실패 시 `test_user` fallback 사용

### `userInventory`

- Auth 익명 사용자 보유 아이템 저장
- 현재 경로: `userInventory/{uid}/items/{itemId}`
- 상점 구매 성공 시 보유 아이템 문서 생성
- 내 집 화면에서 보유 꾸미기 아이템 후보로 사용
- Auth 실패 시 `userInventory/test_user/items/{itemId}` fallback 사용

### `purchaseLogs`

- 상점 구매 로그 저장
- 구매 성공 시 `purchaseLogs/{autoId}` 생성
- 문서 내부 `userId`는 Auth `uid`를 우선 기록
- 현재는 `serverVerified: false`인 클라이언트 transaction 테스트 흐름
- Auth 실패 시 `userId: test_user` fallback 사용

### `userRoomSettings`

- Auth 익명 사용자 내 집 선택 설정 저장
- 현재 경로: `userRoomSettings/{uid}`
- 필드: `userId`, `selectedBackgroundItemId`, `selectedAvatarItemId`, `selectedDecorItemIds`, `selectedTitleFrameItemId`, `updatedAt`
- 보유 아이템 선택 시 카테고리별 필드에 저장
- Auth 실패 시 `userRoomSettings/test_user` fallback 사용

### `USER_REWARD_DATA`

- 보유 코인/경험치와 퀴즈 완료 보상 표시용 정적 데이터
- 현재 값: 코인 120, 경험치 340
- 퀴즈 완료 보상: 경험치 +10, 코인 +5, 연습 완료 보너스
- 실제 누적 저장은 하지 않음

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

## 5. 아직 더미인 부분

- 모든 문제 데이터
- 퀴즈 완료 보상
- 퀴즈 완료 보상으로 누적되는 보유 코인과 경험치
- 랭킹 광장 순위
- 프로필, 칭호, 뱃지
- 운영본 회원 시스템 기준 상점 상태
- 퀘스트 진행도와 보상
- 학급 미션 진행도
- 시즌 이벤트
- 랭킹전, 원코 모드, 기록 보기
- 내 집 장착 결과의 실제 시각 반영

## 6. 아직 연결하지 않은 것

- Storage
- GAS `getQuizData`
- 운영본 회원 시스템과 Auth 사용자 매핑
- 실제 랭킹
- 운영 수준 Firestore 보안 규칙
- 서버 검증 기반 구매 처리
- Firebase Storage 실제 이미지
- 운영본 데이터

현재 연결된 것:

- Firebase SDK
- Firebase Auth 익명 로그인
- Auth `currentUser.uid` 우선 사용자 ID resolver
- Firestore `shopItems`
- Firestore `assetCatalog`
- Firestore `userEconomy/{uid}`
- Firestore `userInventory/{uid}/items`
- Firestore `purchaseLogs`
- Firestore `userRoomSettings/{uid}`
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

현재 주요 기능 루프:

1. Firebase Auth 익명 로그인으로 `uid` 생성
2. `userEconomy/{uid}` 기본 경제 문서 초기화
3. 상점에서 `shopItems`와 `assetCatalog` 기반 아이템 표시
4. 상점 구매 transaction 실행
5. `userInventory/{uid}/items`에 구매 아이템 저장
6. 내 집에서 보유 아이템 표시
7. 내 집 적용 선택을 `userRoomSettings/{uid}`에 저장

주의:

- 위 연결은 Firebase Auth 익명 사용자 기반 프로토타입이다.
- 운영본 회원 시스템, 학급 사용자, 실제 학생 계정과는 아직 매핑하지 않았다.
- Firestore 보안 규칙은 운영 수준으로 정리하기 전이다.
- Firebase Storage 실제 이미지 연결 전이며, 현재는 `assetCatalog.fallbackIcon` 중심이다.
- push/deploy 전 최종 검증이 필요하다.
- Firestore Emulator까지 함께 검증하려면 별도의 Emulator 연결 코드와 seed/import 데이터가 필요하다.

## 8. 다음 작업 추천 순서

1. 운영본 회원 시스템과 Auth 사용자 매핑
   - 익명 Auth `uid`를 운영본 학생/학급 사용자와 어떻게 연결할지 결정
   - 기존 익명 사용자 데이터를 실제 사용자 데이터로 승계할지 검토
   - `userEconomy`, `userInventory`, `userRoomSettings`의 사용자 식별 정책 확정

2. Firestore 보안 규칙 실제 적용 전 최종 점검
   - `shopItems`, `assetCatalog` 읽기 권한
   - `userEconomy`, `userInventory`, `userRoomSettings` 본인 읽기/쓰기 제한
   - 구매 transaction의 클라이언트 직접 쓰기 유지 여부 검토

3. Firebase Storage 이미지 연결
   - `assetCatalog.imageUrl`에 실제 이미지 URL 입력
   - 상점과 내 집 카드에서 이미지 표시 확인
   - 이미지 실패 시 fallback icon 유지 확인

4. Firebase Hosting 배포 테스트
   - 타운/학교/퀴즈/상점/내 집/이벤트 흐름 점검
   - 구매 후 내 집 적용 상태 유지 확인
   - 모바일/데스크톱 레이아웃 확인
   - Firestore 권한 오류 확인

5. GAS 데이터 연동 검토
   - 운영본 `getQuizData`의 반환 구조 확인
   - `QUIZ_CATALOG`와 운영본 quizId 매핑
   - `QUESTION_BANK` 대체 또는 병행 전략 결정

## 9. 운영본 주의사항

- 이 문서는 Firebase 실험본 `~/Projects/gas-quiz-firebase` 기준이다.
- 운영본 `~/Projects/gas-quiz`와 혼동하지 말 것.
- 운영본 파일, GAS 배포, 운영 데이터는 이 프로토타입 작업 중 수정하지 않는다.
- Firebase 실험본은 일부 Firestore 프로토타입 데이터와 연결되어 있지만, 실제 로그인 사용자나 운영본 데이터와 연결되어 있지 않다.
