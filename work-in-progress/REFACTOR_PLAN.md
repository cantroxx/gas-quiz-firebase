# DJ48 Firebase App Refactor Plan

## 0. 전제

- 운영 사이트: `https://dj48-quiztown-firebase.web.app`
- Hosting 공개 디렉터리: `public`
- 운영 화면 주 소스: `public/index.html`
- 전역 스타일: `public/styles.css`
- 방 꾸미기 모듈: `public/room.js`, `public/room.css`
- Firebase Functions: `functions/index.js`
- 이번 문서는 분석 리포트이며, 앱 코드 수정/commit/deploy를 포함하지 않는다.

리팩터링 목표는 `public/index.html`을 한 번에 분해하는 것이 아니라, 기존 전역 함수와 화면 흐름을 유지한 채 새 파일을 점진적으로 붙이는 것이다. 초기 단계에서는 기존 함수명을 래퍼로 남기고, 내부 구현만 작은 모듈로 이동하는 방식이 가장 안전하다.

## 1. 현재 파일 구조

현재 확인한 주요 파일은 다음과 같다.

| 파일 | 역할 | 라인 수 |
| --- | --- | ---: |
| `public/index.html` | 운영 메인 화면, 전역 상태, Firebase 접근, 화면 렌더링, 이벤트 바인딩 | 12,828 |
| `public/styles.css` | 전역 화면 스타일 | 6,174 |
| `public/room.js` | 내 방 꾸미기 독립 모듈 | 754 |
| `public/room.css` | 내 방 꾸미기 스타일 | 159 |
| `functions/index.js` | callable/server aggregation/admin/economy 서버 로직 | 5,312 |
| `firebase.json` | Hosting/Functions/Firestore/Storage 설정 | 58 |
| `firestore.rules` | Firestore 보안 규칙 | 653 |
| `storage.rules` | Storage 보안 규칙 | 21 |
| `firestore.indexes.json` | Firestore 인덱스 | 23 |

기타 문서와 마이그레이션/시드 스크립트가 루트, `scripts/`, `tools/`에 존재한다. 루트의 `index.html`, `Code.js`, `appsscript.json`은 현재 Firebase 운영본 기준 파일이 아니므로 리팩터링 대상에서 제외한다.

현재 `package.json`은 루트에 없고, `functions/package.json`만 있다. Functions 검증 스크립트는 `functions` 디렉터리의 `npm run lint`이며 실제 명령은 `node --check index.js`이다.

## 2. `public/index.html` 안의 주요 기능 덩어리

`public/index.html`은 크게 세 구역으로 나뉜다.

| 구간 | 라인 범위 | 내용 |
| --- | ---: | --- |
| HTML 마크업 | 1-1364 | 로그인, 타운, 홈, 방, 랭킹, 상점, 이벤트, 교실, 관리자, 학교, 과목, 퀴즈 플레이, 모달 |
| Firebase compat script 로드 | 1365-1370 | Firebase app/auth/firestore/storage/functions compat SDK 및 `/__/firebase/init.js` |
| 인라인 앱 스크립트 | 1371-12825 | 정적 데이터, 캐시, Firebase 접근, 렌더링, 저장, 화면 전환, 이벤트 바인딩 |
| 방 꾸미기 script 로드 | 12826 | `/room.js` 로드 |

인라인 스크립트 내부의 주요 덩어리는 다음과 같다.

| 기능 | 대표 라인 | 대표 함수/상태 |
| --- | ---: | --- |
| 정적 설정/샘플 데이터 | 1372-2595 | `PLACE_DETAILS`, `CLASSROOM_PROTOTYPE`, `SHOP_ITEMS`, `QUIZ_CATALOG`, `QUESTION_BANK`, 전역 캐시 |
| 서버 freshness/cache 초기화 | 2597-2730 | `checkServerFreshness`, `refreshCurrentAppData`, `clearRuntimeDataCaches` |
| 타운 장소/공지/칭호 카탈로그 | 2744-3066 | `openPlaceModal`, `loadNoticeBoardFromFirestore`, `openTitleCatalogModal` |
| 홈/프로필/칭호/뱃지 | 3070-4159 | `renderHomeView`, `renderProfileCard`, `loadHomeMemberDataFromFirestore`, 프로필 이미지 편집/저장 |
| 랭킹 광장/프로필 랭킹 | 4162-5466 | `renderRankingView`, `loadRankingPlazaCardsFromFirestore`, `renderRankingBoards`, 인기 퀴즈 필터 |
| Firebase 래퍼/기능 플래그/외부 퀴즈 | 5507-5688 | `getFirestoreDb`, `getFirebaseStorage`, `getFirebaseFunctions`, `loadFeatureFlags`, `loadExternalQuizzes` |
| 퀴즈 데이터 로드/문항 빌더 | 5697-6184 | `loadFirebaseQuizMeta`, `loadFirebaseQuizQuestions`, `buildFirestoreQuestion` |
| Auth/회원 연결/마이그레이션 | 6188-6819 | `initializeAuthUser`, `linkImportedMemberToCurrentAuthUser`, `migrateUserDataToMemberIdIfNeeded` |
| 상점/인벤토리/방 설정 요약 | 6840-7490 | `loadShopItemsFromFirestore`, `renderShopItems`, `purchaseShopItem`, `saveRoomItemSelection` |
| 이벤트/우리 교실 | 7494-8977 | `renderQuestCards`, `loadClassroomSettings`, `renderClassroomPrototype`, 교실 callable 액션 |
| 관리자 화면 | 9028-10224 | `showAdminView` 관련 로드/렌더/저장 함수들 |
| 학교/과목/퀴즈 선택 | 10229-10579 | `renderSchoolQuizCards`, `renderSubjectQuizCards`, `renderQuizSelectView`, `renderQuizModeCards` |
| 퀴즈 플레이/정답/저장 | 10600-11846 | `showQuizPlayView`, `renderQuestion`, `submitAnswer`, `saveRankingRecordOnQuizComplete`, `savePracticeProgressAfterCorrectAnswer` |
| 화면 전환 | 11864-12127 | `APP_VIEW_IDS`, `showOnlyAppView`, `showHomeView`, `showRankingView`, `showQuizSelectView` |
| 이벤트 바인딩/부팅 | 12131-12825 | 클릭/키보드/폼 이벤트 등록, `initializeAuthUser`, `RoomDecor.init` |

## 3. Firebase 초기화/Firestore 접근 코드 위치

Firebase SDK는 `public/index.html:1365-1370`에서 compat 버전으로 로드된다.

- `/__/firebase/10.12.2/firebase-app-compat.js`
- `/__/firebase/10.12.2/firebase-auth-compat.js`
- `/__/firebase/10.12.2/firebase-firestore-compat.js`
- `/__/firebase/10.12.2/firebase-storage-compat.js`
- `/__/firebase/10.12.2/firebase-functions-compat.js`
- `/__/firebase/init.js`

Firebase app 자체 초기화는 Hosting의 `/__/firebase/init.js`가 담당한다. 앱 내부에서는 다음 wrapper를 통해 compat API를 사용한다.

| 함수 | 위치 | 역할 |
| --- | ---: | --- |
| `getFirestoreDb()` | `public/index.html:5507` | `window.firebase.firestore()` 싱글턴 반환, `ignoreUndefinedProperties` 설정 |
| `getFirebaseStorage()` | `public/index.html:5523` | `window.firebase.storage()` 싱글턴 반환 |
| `getFirebaseFunctions()` | `public/index.html:5530` | `asia-northeast3` Functions 인스턴스 반환 |
| `getFirebaseAuth()` | `public/index.html:6188` | `window.firebase.auth()` 반환 |
| `getFirestoreFieldValue()` | `public/index.html:7372` | `window.firebase.firestore.FieldValue` 반환 |

Firestore 직접 접근은 `public/index.html` 전반에 흩어져 있다. 주요 컬렉션은 `appSettings`, `noticeBoard`, `titleCatalog`, `users`, `userTitles`, `userBadges`, `profileImageCandidates`, `rankingRecords`, `quizKingSummary`, `quizzes`, `quizQuestions`, `dailyUsage`, `shopItems`, `assetCatalog`, `userEconomy`, `userInventory`, `userRoomSettings`, `classrooms`, `practiceRecords`, `userPracticeSummary` 등이다.

`public/room.js`도 별도 모듈이지만 compat Firestore를 직접 사용한다.

- `assetCatalog`
- `userRoomSettings`
- `userEconomy`
- `userInventory`
- callable `purchaseShopItem`

## 4. 화면 전환 함수 구조

화면 전환은 `public/index.html:11864` 이후에 비교적 모여 있다.

핵심 구조:

- `APP_VIEW_IDS`: 숨김/표시 대상 view id 목록
- `showOnlyAppView(viewId)`: 모든 앱 view를 순회하면서 대상만 표시
- 각 `show*View()`: 공통 정리 후 해당 화면 렌더링과 데이터 로드

주요 화면 함수:

| 함수 | 역할 | 위험도 |
| --- | --- | --- |
| `leaveQuizPlaySession()` | 퀴즈 타이머/인기퀴즈 사용 세션 정리 | 높음 |
| `showOnlyAppView(viewId)` | 전역 화면 표시 제어 | 높음 |
| `showTownView()` | 타운 표시, freshness polling 시작 | 중간 |
| `showHomeView()` | 홈 렌더링, 회원 초기화 fallback | 중간 |
| `showRoomView()` | 가로모드 체크 후 `RoomDecor.open()` 호출 | 중간 |
| `showRankingView()` | feature flag 확인 후 랭킹 렌더링 | 높음 |
| `showShopView()` | feature flag 확인, 상점 fallback 표시 후 Firestore 렌더링 | 중간 |
| `showEventView()` | feature flag 확인, 이벤트 로딩/Functions 진행도 | 중간 |
| `showClassroomView()` | 교실 gate/main 전환 | 중간 |
| `showSubjectView()` | 과목별 퀴즈 카드 렌더링 | 중간 |
| `showQuizSelectView()` | 퀴즈 선택 화면 및 mode 카드 렌더링 | 높음 |
| `showQuizPlayView()` | 퀴즈 세션 생성, 문제 로드, 타이머 시작 | 높음 |

초기 리팩터링에서 `showOnlyAppView`, `leaveQuizPlaySession`, `showQuizPlayView`, `showQuizComplete`는 이동하지 않는 편이 안전하다. 이 함수들은 전역 상태, 타이머, popular usage, 랭킹 저장과 연결되어 있다.

## 5. 기능별 코드 혼재 위치

### 랭킹

랭킹은 세 영역에 걸쳐 있다.

- 랭킹 광장 렌더링: `public/index.html:4162-5466`
- 랭킹 모드/카테고리 매핑: `public/index.html:5697-5730`, `11158-11220`
- 퀴즈 완료 시 랭킹 저장: `public/index.html:11310-11410`, `11774-11846`

`rankingRecords`, `userRankingSummary`, `quizKingSummary` 저장/조회가 퀴즈 플레이와 랭킹 광장 모두에 연결되어 있어 초반 분리 위험이 높다.

### 프로필/홈

홈과 프로필은 다음 영역에 모여 있다.

- 홈 렌더링/프로필 카드: `public/index.html:3070-3582`
- 칭호/뱃지 정규화 및 렌더링: `3379-3637`
- 프로필 이미지 검색/업로드/편집/저장: `3706-3894`
- 닉네임/비밀번호/랭킹 메시지/대표 칭호 저장: `3940-4036`
- 보유 아이템/방 설정 요약: `4058-4159`

홈은 `users`, `userTitles`, `userBadges`, `userTitleSummary`, `rankingRecords`, `userInventory`, `assetCatalog`, `userRoomSettings`를 함께 읽는다. 순수 렌더 helper부터 분리하면 비교적 안전하지만 저장 함수는 Auth와 Firestore 상태에 묶여 있다.

### 내 방

내 방 꾸미기의 실제 조작 UI는 이미 `public/room.js`로 분리되어 있다.

- `public/index.html:311-352`: `room-view` 마크업
- `public/index.html:11984-12004`: `showRoomView`
- `public/index.html:12794-12823`: portrait resize 대응 및 `RoomDecor.init`
- `public/room.js`: `RoomDecor` 모듈 전체

다만 홈의 보유 아이템 요약과 상점의 방 아이템 선택은 아직 `index.html`에 있다.

### 상점

상점은 `public/index.html:6840-7490`에 모여 있다.

- Firestore 상품/assetCatalog 로드
- userEconomy/userInventory/userRoomSettings 로드
- anonymous uid에서 member id로 데이터 이전
- 상품 카드 렌더링
- 구매 callable
- 선택한 방 아이템 저장

상점은 Firestore 읽기/쓰기와 구매 callable이 있으므로, 1단계에서는 상점 전체 이동보다 이미지/가격/상태 계산 같은 순수 helper 추출이 더 안전하다.

### 퀴즈

퀴즈는 가장 넓게 섞여 있다.

- 카탈로그/문항 정적 데이터: `public/index.html:1918-2560`
- Firebase 퀴즈 로드/문항 빌더: `5697-6184`
- 학교/과목/퀴즈 선택 화면: `10229-10579`
- 퀴즈 플레이: `10600-11120`
- 연습 기록/보상/칭호 sync: `11123-11770`
- 완료 화면/랭킹 저장 상태: `11774-11846`
- 화면 전환과 이벤트 바인딩: `12101-12510`

퀴즈는 랭킹, 연습 기록, daily usage, feature flags, 교실 퀘스트와 연결되어 있어 초반 분리 대상에서 제외하는 것이 안전하다.

## 6. 가장 먼저 분리해도 안전한 영역

가장 안전한 1순위는 "정적 데이터 또는 순수 함수"이다. 운영 동작을 유지하려면 기존 전역 이름은 그대로 두고, 새 모듈에서 값을 만든 뒤 `window.DJ48...` 형태로 노출하거나 기존 script에서 대입하는 방식이 좋다.

추천 순서:

| 순서 | 영역 | 이유 | 위험도 |
| ---: | --- | --- | --- |
| 1 | 정적 상수 일부: `PLACE_DETAILS`, `SHOP_CATEGORY_LABELS`, `SHOP_ICON_FALLBACKS` | 런타임 의존이 낮고 화면 흐름을 바꾸지 않는다 | 낮음 |
| 2 | 순수 포맷터: 날짜/시간/텍스트 normalize 일부 | DOM/Firestore 없이 입력->출력 함수로 검증 가능 | 낮음 |
| 3 | Firebase wrapper 묶음 | 함수명 유지 시 호출부 변화가 작다. 단 script 로드 순서 검증 필요 | 중간 |
| 4 | 관리자 보조 렌더 helper 일부 | callable 자체가 아니라 표시 함수만 이동하면 비교적 안전 | 중간 |
| 5 | 홈 프로필 순수 렌더 helper 일부 | DOM 생성 로직은 길지만 데이터 저장과 분리 가능 | 중간 |

이미 `public/room.js`가 독립 모듈로 존재하므로, 새 모듈 패턴은 `RoomDecor`처럼 전역 네임스페이스 하나를 제공하는 방식이 현재 구조와 잘 맞는다.

## 7. 분리하면 위험한 영역

초반에 분리하지 말아야 할 영역:

| 영역 | 이유 | 위험도 |
| --- | --- | --- |
| 퀴즈 플레이 세션 전체 | 전역 상태, 타이머, 키보드 이벤트, popular usage, 저장 흐름이 결합됨 | 높음 |
| 랭킹 저장 함수 | `rankingRecords`, `userRankingSummary`, `quizKingSummary`, 모드/카테고리 정책 동시 영향 | 높음 |
| `showOnlyAppView`와 모든 `show*View` 일괄 이동 | 화면 전환 전체 회귀 가능성 큼 | 높음 |
| Auth/회원 연결/데이터 마이그레이션 | anonymous uid, member id, 사용자 데이터 이전과 보안 규칙 영향 | 높음 |
| 상점 구매/인벤토리 쓰기 | callable, 트랜잭션, userInventory, userRoomSettings가 함께 움직임 | 높음 |
| Functions `index.js` 대규모 분해 | 배포/권한/서버 callable 표면이 넓고 테스트가 제한적 | 높음 |
| `public/styles.css` 대규모 분리 | 화면 전체 스타일 cascade 영향이 큼 | 중간-높음 |

## 8. 추천 폴더 구조

대규모 이동 없이 점진적으로 붙일 수 있는 구조를 권장한다.

```text
public/
  index.html
  styles.css
  room.js
  room.css
  js/
    core/
      firebase.js
      format.js
      dom.js
    data/
      place-details.js
      quiz-catalog.js
      shop-static.js
    features/
      admin.js
      home-profile.js
      ranking-plaza.js
      shop.js
      quiz-play.js
```

단, 이 구조를 한 번에 만들지 않는다. 1단계에서는 `public/js/core/format.js` 또는 `public/js/data/place-details.js`처럼 작고 독립적인 파일 1개만 추가하는 것이 적절하다.

초기 모듈 형식은 ES module보다 일반 script + 전역 네임스페이스가 안전하다. 현재 Firebase compat script와 `room.js`가 일반 script 방식이고, 기존 전역 함수 흐름도 이 방식에 맞춰져 있기 때문이다.

예상 패턴:

```js
window.DJ48Core = window.DJ48Core || {};
window.DJ48Core.formatDate = function formatDate(value) {
  // pure helper
};
```

이후 충분히 안정화되면 ES module 전환을 별도 목표로 검토한다.

## 9. 1단계 리팩터링 범위

1단계 목표는 "동작 변경 없는 첫 분리"이다.

권장 범위:

1. `public/js/data/place-details.js` 추가
2. `PLACE_DETAILS`만 새 파일로 이동
3. `public/index.html`에는 기존 `const PLACE_DETAILS = ...` 대신 기존 이름을 유지하는 얇은 대입만 남김
4. `<script src="/js/data/place-details.js"></script>`를 기존 인라인 script보다 앞에 추가
5. `openPlaceModal`, `updatePlaceInfo`, `updatePlayerLocation`, `show*View` 함수명과 호출 흐름은 유지

예상 위험도: 낮음

주의할 점:

- script 로드 순서가 깨지면 `PLACE_DETAILS` 참조 전에 값이 없을 수 있다.
- 기존 `PLACE_DETAILS`가 `const`이므로 단순 재선언 충돌을 피해야 한다.
- 정적 데이터만 이동하고 함수는 이동하지 않는다.

검증 방법:

- `python3 -m http.server` 등으로 local Hosting 유사 환경 실행
- `/` 접속 후 콘솔 오류 확인
- 타운에서 알림판/내 집/학교/우리 교실/상점/랭킹/이벤트 장소 패널 열기
- 각 장소 입장 버튼으로 기존 화면 전환 확인
- `showHomeView`, `showSchoolView`, `showRankingView`, `showShopView`, `showEventView` 호출 흐름 확인
- 가능하면 배포 전 Firebase Hosting emulator 또는 로컬 정적 서버에서 smoke test

1단계에서 하지 않을 작업:

- 퀴즈/랭킹/상점/프로필 저장 로직 이동
- `public/index.html` 마크업 분해
- `public/styles.css` 분리
- Functions 코드 이동
- Firestore rules/index 변경
- 운영 Firestore/Storage 데이터 수정

## 10. 2단계 이후 리팩터링 로드맵

### 2단계: 순수 유틸 분리

범위:

- 날짜/시간/텍스트 normalize helper 일부를 `public/js/core/format.js`로 이동
- 후보: `getFirestoreTimestampMillis`, `normalizeDisplayImageUrl`, `formatRankingElapsedText`, `normalizeQuizAnswer` 중 DOM/Firestore 의존이 낮은 함수
- 기존 전역 함수명은 유지하고 내부에서 새 네임스페이스 함수를 호출

위험도: 낮음-중간

검증:

- 콘솔 오류 확인
- 프로필 이미지 URL 표시
- 랭킹 날짜/시간 표시
- 퀴즈 정답 비교 smoke test

### 3단계: Firebase wrapper 분리

범위:

- `getFirestoreDb`, `getFirebaseStorage`, `getFirebaseFunctions`, `getFirebaseAuth`, `getFirestoreFieldValue`를 `public/js/core/firebase.js`로 이동
- 기존 함수명은 `index.html`에 wrapper로 남기거나 `window`에 같은 이름으로 노출

위험도: 중간

검증:

- 익명 로그인 및 회원 연결 상태 복구
- feature flags 로드
- Firestore 퀴즈 로드
- 상점 상품 로드
- 관리자 callable 1개 읽기성 함수 호출

### 4단계: 정적 카탈로그 분리

범위:

- `MODE_CATALOG`, `SUBJECT_CATALOG`, `SCHOOL_QUIZ_CARDS`, `QUIZ_CATALOG` 등 정적 카탈로그를 `public/js/data/quiz-catalog.js`로 이동
- `QUESTION_BANK`는 크고 퀴즈 플레이와 직접 연결되어 있으므로 별도 단계로 미룸

위험도: 중간

검증:

- 학교 화면 과목 카드
- 과목별 퀴즈 목록
- 퀴즈 선택 화면 mode 카드
- feature flag로 비활성화된 퀴즈 표시 여부

### 5단계: 관리자 읽기/렌더 보조 함수 분리

범위:

- 관리자 화면 중 저장/권한 변경이 아닌 표시 helper부터 이동
- 후보: `formatAdminTimestamp`, `createAdminInfoChip`, `renderAdminLogs`, `renderAdminDashboard`

위험도: 중간

검증:

- 관리자 로그인
- 대시보드 표시
- 회원 목록 표시
- 로그 목록 표시
- super admin 전용 UI 숨김/표시 확인

### 6단계: 홈 프로필 렌더링 분리

범위:

- `renderProfileAvatar`, `renderCollectionCards`, `renderBadgeProgressGroups` 같은 DOM 렌더 helper 이동
- 저장 함수는 유지

위험도: 중간

검증:

- 홈 진입
- 프로필 카드 표시
- 칭호/뱃지/보유 아이템 표시
- 프로필 상세 탭 토글

### 7단계: 상점 표시 로직 분리

범위:

- `resolveShopItemVisual`, `getShopItemState`, `renderShopWallet`, `renderShopItems` 이동
- 구매 함수와 데이터 migration 함수는 유지

위험도: 중간

검증:

- 상점 진입
- 무료/구매완료/코인부족/구매가능 상태 표시
- 구매 버튼 클릭 전후 UI 갱신
- 내 집 보유 아이템 요약 갱신

### 8단계: 랭킹 광장 조회/렌더 분리

범위:

- 저장 함수가 아니라 랭킹 광장 조회/표시 함수부터 분리
- `saveRankingRecordOnQuizComplete`는 계속 `index.html`에 남김

위험도: 중간-높음

검증:

- 랭킹 광장 카드
- 퀴즈왕/국어왕/사회왕/수학왕/인기왕
- 인기 퀴즈 area/difficulty/mode 필터
- 프로필 랭킹 기록

### 9단계: 퀴즈 플레이 분리 준비

범위:

- 먼저 함수 의존성 목록 문서화
- 퀴즈 세션 상태를 객체 하나로 모으는 작은 내부 정리
- 실제 파일 이동은 별도 단계

위험도: 높음

검증:

- 연습전 정답/오답/다음 문제
- 랭킹전 하트/타이머/20분 제한
- daily popular usage 제한
- practiceRecords 저장
- rankingRecords 저장
- userRankingSummary/quizKingSummary 갱신
- 보상/칭호 sync

## 11. 회귀 위험을 줄이는 공통 원칙

- 한 단계에서 새 파일 1개 또는 기능 덩어리 1개만 다룬다.
- 기존 전역 함수명과 HTML id/data attribute는 유지한다.
- `index.html`의 호출부를 먼저 바꾸지 말고, 새 모듈을 내부 구현으로만 사용한다.
- Firestore 컬렉션명, 문서 id 규칙, callable 이름은 변경하지 않는다.
- 화면 전환과 저장 함수는 충분한 smoke test 전까지 이동하지 않는다.
- 수정 후 배포 전에는 최소한 로컬 정적 서버에서 콘솔 오류와 주요 화면 진입을 확인한다.

## 12. 다음 Codex 작업 프롬프트

```text
현재 프로젝트 경로는 ~/Projects/gas-quiz-firebase 입니다.

목표:
REFACTOR_PLAN.md의 1단계만 진행해 주세요.

작업 범위:
- 대규모 리팩터링 금지
- public/index.html 전체 분해 금지
- 기존 전역 함수명과 화면 흐름 유지
- PLACE_DETAILS 정적 데이터만 public/js/data/place-details.js로 분리
- public/index.html에는 기존 PLACE_DETAILS 이름을 계속 사용할 수 있게 최소 변경
- 기능 동작 변경 금지

수정 전 확인:
- public/index.html에서 PLACE_DETAILS 정의와 참조 위치만 rg로 확인
- script 로드 순서만 확인

검증:
- 로컬 정적 서버 또는 가능한 범위에서 HTML/JS 문법 오류 확인
- 타운 장소 패널, 내 집, 학교, 랭킹, 상점, 이벤트, 우리 교실 진입 흐름에 영향이 없는지 확인
- 배포, commit, 운영 Firestore/Storage 수정은 하지 말 것

응답 형식:
1. 수정한 파일
2. 수정한 함수
3. 수정 이유
4. 영향 범위
5. 실행하지 않은 작업
```
