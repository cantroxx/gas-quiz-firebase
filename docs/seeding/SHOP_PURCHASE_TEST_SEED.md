# 상점 구매 테스트 Seed 준비 문서

## 1. 목적

이 문서는 상점 구매/인벤토리 연결을 구현하기 전에 필요한 테스트 사용자 seed 데이터를 정리한다.

현재 상점은 `shopItems`와 `assetCatalog`를 Firestore에서 읽지만, 실제 구매, DJ코인 차감, 인벤토리 저장은 아직 구현하지 않았다. 구매 기능 1차 테스트를 위해 `test_user`의 경제 문서를 먼저 준비한다.

목표:

- 테스트 사용자 `test_user`의 DJ코인 잔액 준비
- 구매 transaction에서 사용할 컬렉션 구조 확인
- `userInventory`와 `purchaseLogs`는 구조만 정의하고 seed 단계에서는 생성하지 않음
- 실제 구매 코드는 아직 작성하지 않음

## 2. 테스트 사용자 ID

테스트 사용자 ID:

```text
test_user
```

주의:

- 운영본 학생 ID가 아니다.
- Firebase 실험본 구매 흐름 검증용 임시 ID다.
- 실제 로그인/인증 연결 전까지는 테스트 전용으로만 사용한다.

## 3. 생성할 컬렉션/문서

### seed 단계에서 생성/갱신

```text
userEconomy/test_user
```

### 구매 구현 후 생성될 문서

```text
userInventory/test_user/items/{itemId}
purchaseLogs/{logId}
```

`userInventory`는 구매 기능 구현 후 transaction으로 생성한다. seed 스크립트는 기존 인벤토리를 건드리지 않는다.

`purchaseLogs`도 실제 구매 발생 시 생성한다. seed 단계에서는 만들지 않는다.

## 4. `userEconomy/test_user` 필드 예시

```js
{
  userId: "test_user",
  djCoin: 1000,
  totalEarned: 1000,
  totalSpent: 0,
  updatedAt: "<Timestamp>"
}
```

필드 타입:

| 필드 | Firestore 타입 | 설명 |
| --- | --- | --- |
| `userId` | string | 테스트 사용자 ID |
| `djCoin` | number | 현재 보유 DJ코인 |
| `totalEarned` | number | 누적 획득 DJ코인 |
| `totalSpent` | number | 누적 사용 DJ코인 |
| `updatedAt` | timestamp | 마지막 갱신 시각 |

구현 메모:

- 기존 문서에는 `coin` 필드 제안도 있었지만, 구매 테스트 seed는 UI 표기와 맞춰 `djCoin`을 기준 필드로 둔다.
- 실제 코드 구현 시 `userEconomy` 필드명을 `djCoin`으로 통일할지, 기존 문서의 `coin`과 병행할지 결정해야 한다.
- 1차 구현에서는 문서의 실제 필드명을 기준으로 읽고, 화면용 `USER_REWARD_DATA`와 혼동하지 않는다.

## 5. `userInventory` 구조

권장 경로:

```text
userInventory/test_user/items/{itemId}
```

구매 후 예시:

```js
{
  userId: "test_user",
  itemId: "flowerpot",
  assetId: "asset_flowerpot",
  source: "shopPurchase",
  pricePaid: 50,
  priceType: "djCoin",
  equipped: false,
  acquiredAt: "<Timestamp>",
  updatedAt: "<Timestamp>"
}
```

필드 타입:

| 필드 | Firestore 타입 | 설명 |
| --- | --- | --- |
| `userId` | string | 사용자 ID |
| `itemId` | string | 구매한 `shopItems` 문서 ID |
| `assetId` | string | 연결된 `assetCatalog` 문서 ID |
| `source` | string | `shopPurchase` |
| `pricePaid` | number | 실제 차감된 DJ코인 |
| `priceType` | string | `djCoin` |
| `equipped` | boolean | 장착 여부. 초기값 false |
| `acquiredAt` | timestamp | 획득 시각 |
| `updatedAt` | timestamp | 마지막 갱신 시각 |

중복 구매 방지:

- `userInventory/test_user/items/{itemId}` 문서가 있으면 이미 보유한 것으로 판단한다.
- 첫 구현에서는 같은 아이템 여러 개 보유를 허용하지 않는다.

## 6. `purchaseLogs` 구조

권장 경로:

```text
purchaseLogs/{logId}
```

`logId` 후보:

```text
purchase_{userId}_{itemId}_{timestamp}
```

구매 후 예시:

```js
{
  logId: "purchase_test_user_flowerpot_20260607T120000",
  userId: "test_user",
  itemId: "flowerpot",
  assetId: "asset_flowerpot",
  coinDelta: -50,
  pricePaid: 50,
  priceType: "djCoin",
  inventoryPath: "userInventory/test_user/items/flowerpot",
  serverVerified: false,
  createdAt: "<Timestamp>"
}
```

필드 타입:

| 필드 | Firestore 타입 | 설명 |
| --- | --- | --- |
| `logId` | string | 구매 로그 ID |
| `userId` | string | 사용자 ID |
| `itemId` | string | 구매한 아이템 ID |
| `assetId` | string | 연결 에셋 ID |
| `coinDelta` | number | DJ코인 변화량. 구매는 음수 |
| `pricePaid` | number | 실제 결제 가격 |
| `priceType` | string | `djCoin` |
| `inventoryPath` | string | 생성된 인벤토리 문서 경로 |
| `serverVerified` | boolean | 서버 검증 여부 |
| `createdAt` | timestamp | 구매 로그 생성 시각 |

1차 클라이언트 transaction 테스트에서는 `serverVerified: false`로 두고, Firebase Functions 등 서버 검증으로 전환하면 `true`로 기록한다.

## 7. 구매 테스트 시나리오

### 시나리오 1: 구매 성공

조건:

- `userEconomy/test_user.djCoin`이 아이템 가격 이상
- `shopItems/{itemId}.enabled === true`
- `userInventory/test_user/items/{itemId}` 문서 없음

예상 결과:

- `djCoin`이 가격만큼 감소
- `totalSpent`가 가격만큼 증가
- `userInventory/test_user/items/{itemId}` 생성
- `purchaseLogs/{logId}` 생성
- 상점 카드가 `보유 중` 상태로 표시

### 시나리오 2: 코인 부족

조건:

- `userEconomy/test_user.djCoin`이 아이템 가격보다 작음

예상 결과:

- 구매 중단
- `userEconomy` 변경 없음
- `userInventory` 생성 없음
- `purchaseLogs` 생성 없음
- UI에 `DJ코인이 부족해요.` 표시

### 시나리오 3: 이미 보유

조건:

- `userInventory/test_user/items/{itemId}` 문서가 이미 있음

예상 결과:

- 구매 중단
- DJ코인 차감 없음
- 추가 인벤토리 생성 없음
- UI에 `이미 보유한 아이템이에요.` 표시

### 시나리오 4: disabled 아이템

조건:

- `shopItems/{itemId}.enabled !== true`

예상 결과:

- 구매 중단
- DJ코인 차감 없음
- 인벤토리 생성 없음
- UI에 `지금은 구매할 수 없는 아이템이에요.` 표시

## 8. Seed 스크립트 범위

`scripts/seed/seed-purchase-test-user.js`는 다음만 수행한다.

- `userEconomy/test_user` 생성/갱신
- `djCoin: 1000`
- `totalEarned: 1000`
- `totalSpent: 0`
- `updatedAt: serverTimestamp`

수행하지 않는 것:

- `userInventory` 삭제 또는 생성
- `purchaseLogs` 삭제 또는 생성
- `shopItems` 수정
- `assetCatalog` 수정
- `public/index.html` 수정
- 운영본 `gas-quiz` 접근

## 9. 아직 하지 않을 것

- 실제 구매 버튼 활성화
- 구매 transaction 구현
- 로그인/Auth 연결
- 운영본 사용자 ID 매핑
- 보안 규칙 적용
- 인벤토리 장착/해제
- 환불, 선물, 학생 간 거래

## 10. 다음 구현 단계

1. `scripts/seed/seed-purchase-test-user.js` 실행으로 `userEconomy/test_user` 생성
2. Firestore Console에서 `userEconomy/test_user` 필드 확인
3. `public/index.html`에서 테스트 사용자 상수 또는 임시 사용자 확인 함수 추가
4. `userEconomy` 읽기로 상점 지갑 표시 전환
5. `userInventory/test_user/items` 읽기로 보유 상태 표시
6. 구매 버튼 상태를 `구매 가능`, `코인 부족`, `보유 중`으로 분리
7. Firestore transaction 구매 함수 추가
8. 성공/실패 시나리오별 수동 검증
