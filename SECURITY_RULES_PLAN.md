# Firestore 보안 규칙 초안

## 1. 목적

현재 Firebase 실험본은 상점, 인벤토리, 내 집 설정 흐름을 Firestore와 연결했다. 이 문서는 현재 사용하는 컬렉션 기준으로 `firestore.rules` 초안을 정리하고, 운영 전 반드시 보완해야 할 위험 요소를 기록한다.

이 단계는 보안 규칙 초안 작성이다. `firebase.json`에 rules 경로를 연결하거나 deploy하지 않는다.

## 2. 사용 컬렉션

현재 코드와 문서 기준으로 사용하는 컬렉션:

- `shopItems`
- `assetCatalog`
- `userEconomy`
- `userInventory`
- `userRoomSettings`
- `purchaseLogs`

## 3. 컬렉션별 정책

### `shopItems`

정책:

- 읽기: 전체 허용
- 쓰기: 관리자만 허용

이유:

- 상점 카탈로그는 모든 사용자에게 보여야 한다.
- 가격, 노출 상태, 아이템 설명은 클라이언트가 수정하면 안 된다.

초안:

```js
match /shopItems/{itemId} {
  allow read: if true;
  allow write: if isAdmin();
}
```

### `assetCatalog`

정책:

- 읽기: 전체 허용
- 쓰기: 관리자만 허용

이유:

- 상점/내 집 카드의 이미지와 fallback icon 표시용 카탈로그다.
- Storage URL, fallback icon, enabled 상태는 관리자 정의 데이터다.

초안:

```js
match /assetCatalog/{assetId} {
  allow read: if true;
  allow write: if isAdmin();
}
```

### `userEconomy`

정책:

- 읽기: 본인만 허용
- 쓰기: 본인만 허용

현재 경로:

```text
userEconomy/{userId}
```

주의:

- 현재 프로토타입은 클라이언트가 최초 경제 문서 생성, 구매 시 DJ코인 차감, `totalSpent` 증가를 직접 수행한다.
- 이 초안은 프로토타입 동작을 허용하기 위한 최소 수준이다.
- 운영에서는 클라이언트가 `djCoin`을 임의 증가시킬 수 없도록 서버 검증으로 옮겨야 한다.

초안:

```js
match /userEconomy/{userId} {
  allow read, write: if isOwner(userId);
}
```

### `userInventory`

정책:

- 읽기: 본인만 허용
- 쓰기: 본인만 허용

현재 경로:

```text
userInventory/{userId}/items/{itemId}
```

주의:

- 현재 구매 transaction에서 인벤토리 문서를 클라이언트가 생성한다.
- 운영에서는 구매 검증 없이 인벤토리를 직접 추가할 수 없도록 Functions 이전을 검토해야 한다.

초안:

```js
match /userInventory/{userId}/{document=**} {
  allow read, write: if isOwner(userId);
}
```

### `userRoomSettings`

정책:

- 읽기: 본인만 허용
- 쓰기: 본인만 허용

현재 경로:

```text
userRoomSettings/{userId}
```

주의:

- 현재 코드는 저장 전 `userInventory/{userId}/items/{itemId}` 존재를 확인한다.
- 보안 규칙만으로 선택 아이템이 실제 보유 아이템인지 완전히 검증하기는 복잡하다.
- 운영에서는 Functions 또는 추가 검증 규칙을 검토한다.

초안:

```js
match /userRoomSettings/{userId} {
  allow read, write: if isOwner(userId);
}
```

### `purchaseLogs`

정책:

- 읽기: 일반 사용자 금지
- 생성: 로그인 사용자가 자기 `userId`로만 가능
- 수정/삭제: 금지

현재 경로:

```text
purchaseLogs/{logId}
```

주의:

- 구매 로그는 감사/정산 성격이 있으므로 일반 사용자 읽기를 막는다.
- 현재는 클라이언트 transaction에서 로그를 생성하므로 `create`는 임시로 허용한다.
- 운영에서는 서버 검증 후 서버만 생성하는 구조가 적절하다.

초안:

```js
match /purchaseLogs/{logId} {
  allow read: if false;
  allow create: if isSignedIn()
    && request.resource.data.userId == request.auth.uid;
  allow update, delete: if false;
}
```

## 4. 현재 위험 요소

- `userEconomy` 쓰기를 본인에게 허용하면 악의적 클라이언트가 DJ코인을 임의로 늘릴 수 있다.
- `userInventory` 쓰기를 본인에게 허용하면 구매 없이 아이템을 추가할 수 있다.
- `userRoomSettings` 쓰기를 본인에게 허용하면 보유하지 않은 아이템 ID를 저장할 수 있다.
- `purchaseLogs` 생성이 클라이언트에 열려 있어 가짜 구매 로그를 만들 수 있다.
- `isAdmin()`은 custom claim `admin`을 전제로 하지만, 아직 관리자 claim 발급 흐름이 없다.
- 익명 Auth uid는 운영본 학생 계정과 아직 매핑되어 있지 않다.
- 현재 규칙은 운영용이 아니라 프로토타입 검증용 초안이다.

## 5. Functions 이전 후보

운영 전 Functions 또는 서버 검증으로 옮길 후보:

- 구매 처리
  - `shopItems` 가격 재검증
  - `userEconomy` 잔액 확인
  - 중복 구매 확인
  - DJ코인 차감
  - `userInventory` 생성
  - `purchaseLogs` 생성

- 경제 초기화
  - 신규 사용자 최초 DJ코인 지급
  - 중복 초기 지급 방지
  - 운영본 사용자 매핑 이후 지급 조건 검증

- 보상 지급
  - 퀴즈 완료 보상
  - 일일 획득 상한
  - 중복 지급 방지
  - `rewardLogs` 기록

- 내 집 설정 저장
  - 보유 아이템 검증
  - 카테고리별 장착 가능 여부 검증

## 6. 운영 전 체크리스트

- Firebase Auth 익명 uid와 운영본 학생/학급 사용자 매핑 방식 결정
- 관리자 custom claim 발급 방식 결정
- `firebase.json`에 `firestore.rules` 연결 여부 결정
- emulator 또는 staging 프로젝트에서 rules 테스트
- `userEconomy` 직접 쓰기 제한 설계
- 구매 transaction을 Functions로 이전할지 결정
- `purchaseLogs` 일반 사용자 읽기 차단 확인
- `shopItems`, `assetCatalog` 관리자 쓰기만 허용 확인
- Storage 이미지 연결 후 Storage rules 별도 작성
- 운영본 `gas-quiz` 데이터와 Firebase 실험본 데이터 분리 확인

## 7. 적용 상태

현재 작성된 파일:

```text
firestore.rules
SECURITY_RULES_PLAN.md
```

현재 `firebase.json`에는 Firestore rules 경로가 연결되어 있지 않다. 이번 단계에서는 deploy하지 않으며, 운영 전 별도 검증 후 연결한다.
