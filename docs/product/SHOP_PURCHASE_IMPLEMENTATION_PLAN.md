# 상점 구매/인벤토리 구현 계획

## 1. 목적

이 문서는 Firestore 기반 상점 구매와 인벤토리 저장을 시작하기 전에 필요한 구현 범위, 데이터 흐름, 실패 처리, 보안 방향을 정리한다.

현재 Firebase 실험본은 `shopItems`와 `assetCatalog`를 Firestore에서 읽어 상점 카드를 표시한다. 구매 버튼은 아직 `구매 준비 중` 상태이며, DJ코인 차감과 `userInventory` 저장은 구현하지 않았다.

목표는 기존 `public/index.html`의 상점 화면 구조를 크게 바꾸지 않고, 1차 구매 테스트에 필요한 최소 흐름을 안전하게 설계하는 것이다.

## 2. 현재 상점 상태 요약

구현 완료:

- `shopItems` Firestore 읽기
- 정적 `SHOP_ITEMS` fallback 유지
- `assetCatalog` Firestore 읽기
- `assetCatalog.imageUrl` 또는 fallback icon 표시 준비
- 상점 상단 DJ코인 표시
- 가격과 보유 코인 비교 표시
- 구매 버튼 disabled 유지

미구현:

- 로그인 사용자 확인
- 실제 `userEconomy` 읽기
- 실제 DJ코인 차감
- `userInventory` 저장
- 구매 로그 저장
- 이미 보유한 아이템 표시
- 구매 성공/실패 UI 상태

## 3. 구매 기능 1차 목표

1차 목표는 실제 학생 대상 운영이 아니라 제한된 Firebase 실험본에서 구매 흐름을 검증하는 것이다.

범위:

- 로그인된 테스트 사용자 1명을 기준으로 동작 확인
- Firestore `shopItems` 가격을 기준으로 구매 처리
- `userEconomy`의 DJ코인 잔액 확인
- 이미 보유한 아이템은 중복 구매 방지
- Firestore transaction으로 다음 작업을 한 번에 처리
  - DJ코인 차감
  - `userInventory` 문서 추가
  - 구매 로그 기록
- 구매 후 상점 카드와 지갑 영역 재렌더링

중요 원칙:

- 클라이언트 화면의 가격이나 잔액을 신뢰하지 않는다.
- 첫 구현에서는 중복 보유를 허용하지 않는다.
- 구매 로직은 하나의 함수로 분리하되 기존 렌더링 구조를 최대한 유지한다.
- 실제 운영 전에는 서버 검증 또는 보안 규칙을 강화해야 한다.

## 4. 사용할 컬렉션

### `users`

사용자 기본 정보 확인용이다.

예상 경로:

```text
users/{userId}
```

1차 구현에서는 인증 연결이 없으면 임시 테스트 userId를 사용할 수 있지만, 실제 운영 전에는 Firebase Auth 또는 운영본 사용자 매핑 설계가 필요하다.

### `userEconomy`

사용자별 DJ코인과 경험치 저장소다.

예상 경로:

```text
userEconomy/{userId}
```

필수 확인 필드:

- `userId`
- `coin`
- `updatedAt`

구매 시 변경 필드:

- `coin`: 아이템 가격만큼 감소
- `lifetimeSpentCoin`: 선택. 누적 사용량 기록용
- `updatedAt`: server timestamp

### `userInventory`

사용자별 보유 아이템 저장소다.

권장 경로:

```text
userInventory/{userId}_{itemId}
```

또는:

```text
users/{userId}/inventory/{itemId}
```

1차 구현 추천은 최상위 컬렉션 `userInventory/{userId}_{itemId}`다. 기존 문서에서 제안한 구조와 맞고, 단일 transaction에서 조회/생성이 단순하다.

필수 필드:

- `userId`
- `itemId`
- `assetId`
- `source`: `shopPurchase`
- `pricePaid`
- `priceType`: `djCoin`
- `equipped`: `false`
- `acquiredAt`
- `updatedAt`

### `purchaseLogs`

구매 이력을 기록하는 컬렉션이다.

권장 경로:

```text
purchaseLogs/{purchaseLogId}
```

필수 필드:

- `purchaseLogId`
- `userId`
- `itemId`
- `assetId`
- `coinDelta`
- `pricePaid`
- `priceType`
- `inventoryDocId`
- `serverVerified`
- `createdAt`

`purchaseLogs`를 별도로 만들면 구매 이력과 보상 이력을 분리할 수 있다. 단, 기존 `rewardLogs`를 경제 로그로 통합해서 쓰고 싶다면 `sourceType: "shopPurchase"`, `coinDelta: -price` 형태로 기록할 수도 있다.

1차 추천:

- 구매 전용 이력은 `purchaseLogs`
- 보상 지급 이력은 `rewardLogs`
- 나중에 관리자 회계 화면에서 둘을 함께 조회할 수 있도록 필드명을 맞춘다.

### `rewardLogs`

기존 보상 지급 이력 컬렉션이다.

구매를 여기에 기록하는 경우:

- `rewardType`: `purchase`
- `sourceType`: `shopItem`
- `sourceId`: `itemId`
- `coinDelta`: 음수
- `serverVerified`: true

첫 구현에서는 구매 로그를 `purchaseLogs`로 분리하고, `rewardLogs`는 보상 지급 전용으로 유지하는 편이 명확하다.

### `shopItems`

구매 대상 아이템 카탈로그다.

확인 필드:

- `itemId`
- `assetId`
- `category`
- `name`
- `price`
- `priceType`
- `enabled`
- `rarity`

구매 시 클라이언트에 렌더링된 값이 아니라 Firestore 문서의 `price`, `enabled`를 다시 읽어 검증한다.

## 5. 구매 흐름

1. 로그인 사용자 확인
   - Firebase Auth 사용자 또는 테스트용 `userId`를 확인한다.
   - 사용자 ID가 없으면 구매 버튼을 활성화하지 않는다.

2. `shopItems` 문서 확인
   - `shopItems/{itemId}` 문서를 읽는다.
   - 문서가 없으면 구매를 중단한다.

3. 가격 확인
   - `priceType === "djCoin"`인지 확인한다.
   - `price`가 number이고 0보다 큰지 확인한다.
   - 화면에 보이는 가격이 아니라 Firestore 가격을 기준으로 한다.

4. 유저 DJ코인 잔액 확인
   - `userEconomy/{userId}` 문서를 읽는다.
   - `coin >= price`인지 확인한다.

5. 이미 보유한 아이템인지 확인
   - `userInventory/{userId}_{itemId}` 문서를 읽는다.
   - 이미 있으면 중복 구매를 막는다.

6. Firestore transaction 실행
   - transaction 안에서 `shopItems`, `userEconomy`, `userInventory`를 다시 확인한다.
   - `userEconomy.coin`을 가격만큼 차감한다.
   - `userInventory` 문서를 생성한다.
   - `purchaseLogs` 문서를 생성한다.
   - 모든 작업에 `serverTimestamp`를 사용한다.

7. UI 재렌더링
   - 지갑 영역의 DJ코인 잔액을 다시 읽어 표시한다.
   - 구매한 아이템 카드는 `보유 중` 또는 `구매 완료` 상태로 바꾼다.
   - 구매 버튼은 disabled 처리한다.

## 6. 실패 케이스

### 로그인 없음

- 구매 버튼 비활성화
- 안내 문구: `로그인 후 구매할 수 있어요.`

### 아이템 없음

- Firestore `shopItems/{itemId}` 문서가 없으면 중단
- 안내 문구: `아이템 정보를 찾을 수 없어요.`

### disabled 아이템

- `enabled !== true`이면 구매 중단
- 안내 문구: `지금은 구매할 수 없는 아이템이에요.`

### 코인 부족

- `userEconomy.coin < shopItems.price`이면 구매 중단
- 안내 문구: `DJ코인이 부족해요.`

### 이미 보유

- `userInventory/{userId}_{itemId}`가 있으면 구매 중단
- 안내 문구: `이미 보유한 아이템이에요.`

### 네트워크/권한 오류

- transaction 실패 시 화면 상태를 되돌린다.
- 안내 문구: `구매 처리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.`
- 콘솔에는 개발용 오류를 남긴다.

## 7. 보안 규칙 방향

읽기:

- `shopItems`: 학생 클라이언트 읽기 허용
- `assetCatalog`: 학생 클라이언트 읽기 허용
- `userEconomy`: 본인 문서만 읽기 허용
- `userInventory`: 본인 보유 아이템만 읽기 허용
- `purchaseLogs`: 본인 로그 제한 읽기 또는 관리자만 읽기

쓰기:

- `shopItems`: 관리자만 쓰기
- `assetCatalog`: 관리자만 쓰기
- `userEconomy`: 학생 직접 쓰기 금지
- `userInventory`: 학생 직접 쓰기 금지 또는 transaction 조건을 매우 엄격하게 제한
- `purchaseLogs`: 학생 직접 쓰기 금지

권장 방향:

- 운영 전에는 Firebase Functions 같은 서버 검증 계층에서 구매를 처리한다.
- 클라이언트 transaction은 실험용으로만 제한한다.
- 클라이언트 직접 쓰기를 허용해야 한다면 보안 규칙에서 가격, 잔액, 중복 구매, 문서 ID, 필드 변경 범위를 모두 검증해야 하므로 복잡도가 높다.

## 8. 1차 구현 범위

1차 구현에서 할 것:

- `userEconomy/{testUserId}` 읽기
- `userInventory` 읽기
- 보유 여부에 따른 카드 상태 표시
- 구매 버튼 활성화 조건 정리
- 테스트 사용자 기준 transaction 구매 함수 추가
- 구매 성공 후 `userEconomy`, `userInventory`, `purchaseLogs` 재조회
- 실패 케이스별 간단한 문구 표시

1차 구현에서 유지할 것:

- 기존 `SHOP_ITEMS` fallback
- 기존 `shopItems` Firestore fallback
- 기존 `assetCatalog` fallback icon
- 기존 상점 카드 레이아웃
- 기존 내 집/랭킹/퀴즈 흐름

1차 구현에서 조심할 것:

- 가격은 반드시 Firestore `shopItems` 문서 기준
- 잔액은 반드시 Firestore `userEconomy` 문서 기준
- 중복 보유는 `userInventory` 문서 존재 여부 기준
- 화면의 `USER_REWARD_DATA.coin`은 실제 구매 판단에 쓰지 않는다.

## 9. 아직 하지 않을 것

- 실제 운영 사용자 전체 연결
- 운영본 `gas-quiz` 데이터 연결
- 학생 간 거래
- 환불 기능
- 선물 기능
- 복권, 은행, 이자 기능
- 아이템 장착/해제 저장
- 내 집 꾸미기 저장
- 희귀/시즌 아이템 판매 기간 검증
- 관리자 상점 편집 UI
- Firebase Storage 이미지 업로드 자동화

## 10. 다음 구현 단계

1. 테스트 사용자 데이터 준비
   - `userEconomy/test_user` 문서 생성
   - 충분한 DJ코인 잔액 입력

2. 보안 규칙 초안 작성
   - 읽기 권한과 쓰기 권한을 분리
   - 클라이언트 transaction 테스트 범위 결정

3. `public/index.html` 최소 수정
   - 상점 지갑을 Firestore `userEconomy` 기준으로 읽기
   - `userInventory` 보유 여부 읽기
   - 구매 버튼 상태를 `구매 가능`, `코인 부족`, `보유 중`으로 분리

4. 구매 transaction 함수 추가
   - `purchaseShopItem(itemId)`
   - `shopItems`, `userEconomy`, `userInventory` 재검증
   - `purchaseLogs` 기록

5. UI 검증
   - 구매 성공
   - 코인 부족
   - 이미 보유
   - 권한 오류
   - 새로고침 후 보유 상태 유지

6. 운영 전 재검토
   - 클라이언트 transaction 유지 여부
   - Firebase Functions 또는 서버 검증 전환 여부
   - 운영본 사용자 ID 매핑 방식
