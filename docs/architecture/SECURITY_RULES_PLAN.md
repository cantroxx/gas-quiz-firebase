# Firestore 보안 규칙 초안

## 1. 목적

현재 Firebase 실험본은 상점, 인벤토리, 내 집 설정 흐름을 Firestore와 연결했고, 운영본에서 이관한 `users` 회원 문서를 Firebase Auth 익명 `uid`와 연결하는 1차 흐름을 구현했다. 이 문서는 현재 사용하는 컬렉션 기준으로 `firestore.rules` 초안을 정리하고, 운영 전 반드시 보완해야 할 위험 요소를 기록한다.

이 단계는 보안 규칙 초안 보완이다. `firebase.json`에는 `firestore.rules` 경로가 연결되어 있지만, deploy는 별도 최종 검증 후 진행한다.

## 2. 사용 컬렉션

현재 코드와 문서 기준으로 사용하는 컬렉션:

- `shopItems`
- `assetCatalog`
- `users`
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

- 읽기: Auth `uid` 직접 소유 문서 또는 연결된 운영본 회원 문서만 허용
- 쓰기: Auth `uid` 직접 소유 문서 또는 연결된 운영본 회원 문서만 허용

현재 경로:

```text
userEconomy/{memberUserId}
```

현재 접근 조건:

- `request.auth.uid == userId`
- 또는 `users/{userId}.authUid == request.auth.uid`

주의:

- 현재 프로토타입은 클라이언트가 최초 경제 문서 생성, 구매 시 DJ코인 차감, `totalSpent` 증가를 직접 수행한다.
- 회원 연결 후에는 `userEconomy/{memberUserId}`를 사용한다.
- 기존 `userEconomy/{uid}`에서 `userEconomy/{memberUserId}`로 자동 migration하기 위해 Auth `uid` 직접 소유 문서 접근도 유지한다.
- 이 초안은 프로토타입 동작을 허용하기 위한 최소 수준이다.
- 운영에서는 클라이언트가 `djCoin`을 임의 증가시킬 수 없도록 서버 검증으로 옮겨야 한다.

초안:

```js
match /userEconomy/{userId} {
  allow read, write: if canAccessUserScopedData(userId);
}
```

### `userInventory`

정책:

- 읽기: Auth `uid` 직접 소유 문서 또는 연결된 운영본 회원 문서만 허용
- 쓰기: Auth `uid` 직접 소유 문서 또는 연결된 운영본 회원 문서만 허용

현재 경로:

```text
userInventory/{memberUserId}/items/{itemId}
```

주의:

- 현재 구매 transaction에서 인벤토리 문서를 클라이언트가 생성한다.
- 회원 연결 후에는 `userInventory/{memberUserId}/items`를 사용한다.
- 기존 `userInventory/{uid}/items`에서 `userInventory/{memberUserId}/items`로 자동 migration하기 위해 Auth `uid` 직접 소유 문서 접근도 유지한다.
- 운영에서는 구매 검증 없이 인벤토리를 직접 추가할 수 없도록 Functions 이전을 검토해야 한다.

초안:

```js
match /userInventory/{userId}/{document=**} {
  allow read, write: if canAccessUserScopedData(userId);
}
```

### `userRoomSettings`

정책:

- 읽기: Auth `uid` 직접 소유 문서 또는 연결된 운영본 회원 문서만 허용
- 쓰기: Auth `uid` 직접 소유 문서 또는 연결된 운영본 회원 문서만 허용

현재 경로:

```text
userRoomSettings/{memberUserId}
```

주의:

- 현재 코드는 저장 전 `userInventory/{userId}/items/{itemId}` 존재를 확인한다.
- 회원 연결 후에는 `userRoomSettings/{memberUserId}`를 사용한다.
- 기존 `userRoomSettings/{uid}`에서 `userRoomSettings/{memberUserId}`로 자동 migration하기 위해 Auth `uid` 직접 소유 문서 접근도 유지한다.
- 보안 규칙만으로 선택 아이템이 실제 보유 아이템인지 완전히 검증하기는 복잡하다.
- 운영에서는 Functions 또는 추가 검증 규칙을 검토한다.

초안:

```js
match /userRoomSettings/{userId} {
  allow read, write: if canAccessUserScopedData(userId);
}
```

### `users`

정책:

- 단건 읽기: 로그인 사용자가 active student 문서를 조회하거나, 현재 Auth `uid`와 이미 연결된 문서를 조회할 수 있다.
- 역조회: `users where authUid == request.auth.uid limit 1` 자동 복구 쿼리를 허용한다.
- update: active student 문서의 `authUid` 최초 연결 또는 같은 `authUid` 재확인만 허용한다.
- create/delete: 관리자 custom claim만 허용한다.

현재 경로:

```text
users/{memberUserId}
```

현재 앱 흐름:

1. 학교/학년/반/번호로 `users/{memberUserId}` 단건 조회
2. `role == "student"`, `status == "active"`, `active == true` 확인
3. `authUid`가 비어 있으면 현재 `request.auth.uid`로 연결
4. 새로고침/재진입 시 `users where authUid == current uid limit 1`로 자동 복구

Firestore rules 쿼리 제약:

- `allow list`는 `resource.data.authUid == request.auth.uid` 조건을 둔다.
- 따라서 클라이언트 쿼리는 `where('authUid', '==', currentUid)`처럼 동일한 조건으로 제한되어야 허용된다.
- 전체 `users` 목록 조회는 허용하지 않는다.

보호하는 필드:

- 클라이언트 update는 다음 필드만 변경할 수 있다.
  - `authUid`
  - `authLinkedAt`
  - `authLinkProvider`
  - `authLinkVersion`
  - `updatedAt`
- `role`, `status`, `active`, 학년/반/번호, 닉네임 등 핵심 회원정보는 클라이언트가 변경할 수 없다.
- `password`, `plainPassword`, `passwordHash`, `passwordSalt` 필드는 쓰기 금지한다.

초안:

```js
match /users/{userId} {
  allow get: if canReadUserDocument();
  allow list: if isSignedIn()
    && hasNoForbiddenUserFields(resource.data)
    && resource.data.authUid == request.auth.uid;
  allow update: if isAdmin() || canLinkUserAuthUid();
  allow create, delete: if isAdmin();
}
```

### `purchaseLogs`

정책:

- 읽기: 일반 사용자 금지
- 생성: 로그인 사용자가 Auth `uid` 직접 소유 문서 또는 연결된 운영본 회원 문서의 `userId`로만 가능
- 수정/삭제: 금지

현재 경로:

```text
purchaseLogs/{logId}
```

주의:

- 구매 로그는 감사/정산 성격이 있으므로 일반 사용자 읽기를 막는다.
- 현재는 클라이언트 transaction에서 로그를 생성하므로 `create`는 임시로 허용한다.
- 회원 연결 후 로그의 `userId`는 운영본 `memberUserId`가 될 수 있다.
- 운영에서는 서버 검증 후 서버만 생성하는 구조가 적절하다.

초안:

```js
match /purchaseLogs/{logId} {
  allow read: if false;
  allow create: if isSignedIn()
    && canAccessUserScopedData(request.resource.data.userId);
  allow update, delete: if false;
}
```

## 4. 현재 위험 요소

- `userEconomy` 쓰기를 본인에게 허용하면 악의적 클라이언트가 DJ코인을 임의로 늘릴 수 있다.
- `userInventory` 쓰기를 본인에게 허용하면 구매 없이 아이템을 추가할 수 있다.
- `userRoomSettings` 쓰기를 본인에게 허용하면 보유하지 않은 아이템 ID를 저장할 수 있다.
- `purchaseLogs` 생성이 클라이언트에 열려 있어 가짜 구매 로그를 만들 수 있다.
- `isAdmin()`은 custom claim `admin`을 전제로 하지만, 아직 관리자 claim 발급 흐름이 없다.
- `users` active student 단건 읽기는 회원 연결 테스트를 위해 열려 있으므로, 운영 전 개인정보 노출 범위를 더 줄여야 한다.
- `users where authUid == current uid` 자동 복구는 쿼리 조건이 맞을 때만 허용되지만, 운영 전 별도 rules 테스트가 필요하다.
- 익명 Auth uid와 운영본 학생 계정 매핑은 1차 구현 상태이며, 비밀번호 검증이나 운영 로그인 정책은 아직 확정 전이다.
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

- 회원 연결
  - 학년/반/번호만으로 active student 문서를 찾는 현재 흐름 보완
  - 비밀번호 재설정 또는 별도 인증 검증
  - `authUid` 중복 연결 해제/복구
  - 관리자 승인 또는 교사 보정 흐름

## 6. 운영 전 체크리스트

- Firebase Auth 익명 uid와 운영본 학생/학급 사용자 매핑 운영 정책 확정
- `users` 단건 읽기에서 노출되는 회원 필드 최소화 검토
- `users where authUid == current uid` 자동 복구 쿼리 rules 테스트
- 관리자 custom claim 발급 방식 결정
- `firebase.json`에 `firestore.rules` 연결 유지 확인
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

현재 `firebase.json`에는 Firestore rules 경로가 연결되어 있다. 이번 단계에서는 deploy하지 않으며, 운영 전 emulator 또는 staging 프로젝트에서 별도 검증 후 적용한다.
