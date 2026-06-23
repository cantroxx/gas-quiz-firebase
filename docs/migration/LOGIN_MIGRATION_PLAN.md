# 로그인 사용자 전환 계획

## 1. 목적

현재 상점, 인벤토리, 내 집 설정 흐름은 테스트 사용자 `test_user` 기준으로 동작한다. 이 문서는 실제 로그인 사용자 연결로 전환하기 전에 `test_user` 의존성을 조사하고, 어떤 함수와 Firestore 경로를 바꿔야 하는지 정리한다.

이 작업은 설계 문서 작성만 다룬다. 코드 수정, Firebase Auth 연결, 보안 규칙 적용, 배포는 별도 단계에서 진행한다.

## 2. `test_user` 검색 결과

검색 명령:

```bash
rg -n "test_user" .
```

검색 결과:

- 전체 사용 위치: 41개
- 실제 코드 사용: `public/index.html` 1개
- 문서 사용: `docs/product/PROTOTYPE_STATUS.md`, `docs/seeding/SHOP_PURCHASE_TEST_SEED.md`, `docs/product/SHOP_PURCHASE_IMPLEMENTATION_PLAN.md`

코드 사용 위치:

```js
const TEST_SHOP_USER_ID = 'test_user';
```

현재 구조는 대부분의 Firestore 경로가 직접 문자열 `test_user`를 쓰는 것이 아니라 `TEST_SHOP_USER_ID` 상수를 통해 구성된다. 따라서 실제 로그인 사용자 전환의 1차 핵심은 이 상수를 대체할 사용자 ID resolver를 도입하는 것이다.

## 3. 현재 `test_user` 사용 흐름

현재 `public/index.html`에서 `TEST_SHOP_USER_ID`는 다음 흐름에 사용된다.

- 상점 지갑 읽기
- 보유 아이템 읽기
- 구매 transaction
- 구매 로그 생성
- 내 집 보유 아이템 표시
- 내 집 설정 읽기
- 내 집 설정 저장

현재 사용자 기준 Firestore 경로:

```text
userEconomy/test_user
userInventory/test_user/items/{itemId}
userRoomSettings/test_user
purchaseLogs/{autoId}
```

`purchaseLogs` 문서 ID는 자동 생성되지만 문서 내부 `userId` 필드에 `test_user`가 들어간다.

## 4. 실제 사용자 ID로 교체해야 하는 함수

### 사용자 ID 공급 함수

추가 권장:

```js
function getCurrentUserId()
```

역할:

- 로그인 사용자가 있으면 Firebase Auth `uid` 또는 운영본 매핑 ID 반환
- 로그인 사용자가 없으면 `null` 반환
- 개발 단계 fallback이 필요하면 명시적으로만 `test_user` 반환

### 읽기 함수

교체 대상:

- `loadUserEconomyFromFirestore()`
- `loadInventoryItemIdsFromFirestore()`
- `loadRoomSettingsFromFirestore()`

현재:

```text
doc(TEST_SHOP_USER_ID)
```

전환 후:

```text
doc(currentUserId)
```

### 쓰기 함수

교체 대상:

- `purchaseShopItem(itemId)`
- `saveRoomItemSelection(itemId)`

변경 사항:

- 함수 시작 시 `currentUserId` 확인
- 로그인 없음이면 transaction 또는 저장 실행 중단
- transaction 내부 경로와 저장 필드의 `userId`를 `currentUserId`로 기록

### UI 렌더링 함수

영향 받는 함수:

- `renderShopWallet(economy)`
- `renderShopItems(items, assetCatalogMap, economy, inventoryItemIds)`
- `renderHomeOwnedItemsFromFirestore()`
- `renderHomeOwnedItems(items, assetCatalogMap, roomSettings)`

변경 방향:

- 로그인 없음 상태를 명확히 표시
- 로그인 전에는 구매 버튼 비활성화
- 로그인 전에는 내 집 설정 저장 비활성화 또는 안내 표시

### 캐시 초기화 함수

영향 받는 함수:

- `resetShopRuntimeData()`
- `resetRoomSettingsCache()`

변경 방향:

- 로그인 사용자 변경 시 캐시를 반드시 초기화
- 이전 사용자의 `userEconomy`, `userInventory`, `userRoomSettings`가 다음 사용자 화면에 남지 않게 처리

## 5. Firestore 컬렉션 영향 범위

### `userEconomy`

현재 경로:

```text
userEconomy/test_user
```

전환 후:

```text
userEconomy/{userId}
```

영향:

- 상점 지갑 표시
- 구매 가능/코인 부족 상태 판단
- 구매 transaction에서 DJ코인 차감
- `totalSpent` 증가

주의:

- 클라이언트 화면의 잔액을 신뢰하지 않고 transaction 안에서 다시 읽어야 한다.
- 실제 운영 전에는 클라이언트 직접 차감 허용 여부를 보안 규칙 또는 서버 검증으로 결정해야 한다.

### `userInventory`

현재 경로:

```text
userInventory/test_user/items/{itemId}
```

전환 후:

```text
userInventory/{userId}/items/{itemId}
```

영향:

- 상점 카드의 `보유중` 상태
- 중복 구매 방지
- 내 집 보유 꾸미기 아이템 후보
- 내 집 설정 저장 전 보유 여부 검증

주의:

- 다른 사용자의 인벤토리를 읽거나 쓸 수 없도록 보안 규칙이 필요하다.
- 사용자 ID가 바뀌면 인벤토리 캐시를 초기화해야 한다.

### `userRoomSettings`

현재 경로:

```text
userRoomSettings/test_user
```

전환 후:

```text
userRoomSettings/{userId}
```

영향:

- 내 집 선택 상태 읽기
- 배경, 아바타, 칭호 프레임 저장
- 재진입/새로고침 후 `적용중` 상태 표시

주의:

- 저장 전 `userInventory/{userId}/items/{itemId}` 존재 확인을 유지해야 한다.
- 보안 규칙에서도 보유하지 않은 아이템을 설정할 수 없게 검증할 수 있는지 검토해야 한다.

### `purchaseLogs`

현재 경로:

```text
purchaseLogs/{autoId}
```

문서 내부 현재 필드:

```text
userId: test_user
inventoryPath: userInventory/test_user/items/{itemId}
```

전환 후:

```text
userId: {userId}
inventoryPath: userInventory/{userId}/items/{itemId}
```

영향:

- 구매 이력 조회
- 관리자 회계/감사 로그
- 환불이나 오류 보정이 생길 경우 기준 로그

주의:

- 구매 로그는 학생이 직접 수정할 수 없어야 한다.
- 클라이언트 transaction을 유지하면 `serverVerified: false` 상태가 적절하다.
- 서버 검증으로 전환하면 `serverVerified: true`와 검증 주체 필드를 추가할 수 있다.

## 6. 전환 난이도

난이도: 중간

낮은 이유:

- 코드의 실제 `test_user` 의존성이 `TEST_SHOP_USER_ID` 상수 한 곳에 집중되어 있다.
- Firestore 경로 생성도 대부분 이 상수를 통해 이루어진다.
- 상점/내 집 UI는 이미 사용자별 데이터를 읽는 형태로 분리되어 있다.

높아지는 부분:

- Firebase Auth 또는 운영본 사용자 ID 매핑 방식 결정 필요
- 로그인 없음 상태 UI 처리 필요
- 사용자 변경 시 캐시 초기화 필요
- 보안 규칙에서 경제/인벤토리/내 집 설정 쓰기를 안전하게 제한해야 함
- 구매 transaction을 클라이언트에 둘지 서버 검증으로 옮길지 결정 필요

## 7. 권장 전환 순서

1. 사용자 ID resolver 추가
   - `getCurrentUserId()`
   - `requireCurrentUserId()`
   - 로그인 없음 처리 문구 정의

2. 읽기 경로 전환
   - `userEconomy/{userId}`
   - `userInventory/{userId}/items`
   - `userRoomSettings/{userId}`

3. 쓰기 경로 전환
   - 구매 transaction
   - 내 집 설정 저장
   - `purchaseLogs.userId`

4. 캐시 초기화 연결
   - 로그인 사용자 변경 시 `resetShopRuntimeData()`
   - 로그인 사용자 변경 시 `resetRoomSettingsCache()`

5. 보안 규칙 초안 작성
   - 본인 문서만 읽기
   - 경제/구매/인벤토리 쓰기 제한
   - 관리자 카탈로그 쓰기 제한

6. 수동 검증
   - 로그인 전 상태
   - 사용자 A 구매
   - 사용자 B 구매
   - 사용자 간 인벤토리/내 집 설정 분리
   - 새로고침 후 유지

## 8. 아직 결정할 것

- Firebase Auth를 바로 쓸지, 운영본 GAS 사용자와 매핑할지
- 사용자 ID를 Auth `uid`로 쓸지, 별도 내부 `userId`로 쓸지
- `userInventory`를 최상위 컬렉션으로 유지할지 `users/{userId}/inventory`로 옮길지
- 구매 transaction을 클라이언트에 유지할지 Firebase Functions로 옮길지
- 기존 `test_user` 데이터를 마이그레이션할지 테스트 데이터로만 남길지

## 9. 아직 하지 않을 것

- 코드 수정
- Firebase Auth 연결
- 운영본 사용자 연결
- Firestore 보안 규칙 적용
- `test_user` 데이터 삭제
- 실제 학생 데이터 마이그레이션
- push/deploy
