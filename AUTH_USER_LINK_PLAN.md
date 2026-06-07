# Auth 사용자와 운영본 users 연결 계획

## 1. 현재 상태

- 운영본 `gas-quiz` 회원정보 148명을 Firestore `users` 컬렉션으로 import 완료했다.
- `users` 문서 경로는 `users/{userId}`이다.
- `userId`와 `legacyMemberId`는 운영본 회원 ID를 기준으로 한다.
- 현재 import된 `users` 문서에는 `authUid` 필드가 없다.
- Firebase 실험본은 Firebase Auth 익명 로그인을 사용 중이다.
- 상점, 경제, 인벤토리, 내 집 설정은 현재 Auth `uid` 기준으로 동작한다.
- 운영본 `gas-quiz`는 계속 운영한다.
- 운영본 비밀번호는 Firestore로 이관하지 않았다.

현재 `users` 집계:

- total: 148
- student: 146
- admin: 2
- active: 147
- inactive: 1

## 2. 목표 상태

학생이 Firebase 새 사이트에서 운영본 회원 정보로 본인 확인을 하면, 현재 Firebase Auth `uid`를 운영본 회원 문서와 연결한다.

목표 연결:

```text
Firebase Auth uid -> users/{legacyMemberId}.authUid
```

목표 결과:

- 운영본 회원 ID는 `users/{userId}` 문서 ID로 유지한다.
- Firebase Auth `uid`는 인증 주체로 유지한다.
- `users/{userId}.authUid`는 해당 운영본 회원과 현재 Auth 사용자의 연결값으로 저장한다.
- 경제, 인벤토리, 내 집 설정은 당장 기존 `uid` 기준을 유지한다.
- 이후 필요하면 `users/{userId}`를 기준으로 프로필과 표시 정보를 읽는다.

## 3. authUid 필드 정책

`authUid`는 최초 로그인 연결 이후에만 저장한다.

권장 필드:

```js
{
  authUid: "firebase-auth-uid",
  authLinkedAt: Timestamp,
  authLinkProvider: "legacy_member_login",
  authLinkVersion: 1
}
```

정책:

- `authUid`가 없는 회원만 최초 연결 대상이다.
- 이미 `authUid`가 있는 회원은 같은 `uid`일 때만 정상 로그인으로 처리한다.
- 이미 다른 `uid`가 연결되어 있으면 중복 연결을 차단한다.
- 클라이언트에서 임의로 `authUid`를 쓰게 하지 않는다.
- 운영 전에는 Cloud Functions 또는 서버 검증 경로에서만 `authUid`를 갱신하는 방향이 안전하다.

## 4. 운영본 로그인 정보와 users 매핑

운영본 회원 식별 입력:

- 학교
- 학년
- 반
- 번호
- 비밀번호 또는 재설정 검증 정보

회원 문서 찾기:

1. 학교명을 운영본과 같은 방식으로 정규화한다.
2. 학년/반/번호로 운영본 userId 후보를 만든다.
3. 기본 학교는 `G{학년}-C{반}-N{번호2자리}` 형식이다.
4. 기본 학교가 아니면 `S{학교키}-G{학년}-C{반}-N{번호2자리}` 형식이다.
5. `users/{userId}` 문서를 조회한다.
6. 문서의 `role`, `status`, `active`를 확인한다.

주의:

- 닉네임은 표시값이며 로그인 식별자로 단독 사용하지 않는다.
- 같은 학년/반/번호가 학교별로 존재할 수 있으므로 학교 입력을 유지한다.
- 운영본과 동일한 userId 생성 규칙을 별도 helper로 고정해야 한다.

## 5. 비밀번호 미이관 상태의 로그인 전략

운영본 평문 비밀번호는 Firestore에 저장하지 않았다. 따라서 Firebase에서 직접 비밀번호를 비교할 수 없다.

선택지:

1. 서버 검증 방식
   - 학생이 학년/반/번호/비밀번호를 입력한다.
   - 서버가 운영본 또는 별도 안전 저장소에서 검증한다.
   - 검증 성공 후 `authUid`를 연결한다.
   - 장점: 기존 비밀번호 규칙을 유지할 수 있다.
   - 단점: 서버 검증 구현이 필요하다.

2. 전환용 재설정 방식
   - 기존 비밀번호를 쓰지 않는다.
   - 학생이 교사 안내에 따라 최초 접속용 코드를 받거나 비밀번호를 재설정한다.
   - 장점: 평문 비밀번호 이전을 피할 수 있다.
   - 단점: 학급 운영 안내가 필요하다.

3. 운영본 GAS 검증 임시 연동
   - Firebase 사이트에서 입력값을 받아 운영본 GAS 검증 함수를 호출하는 방식은 보안과 CORS, 배포 정책을 별도 검토해야 한다.
   - 현재 프로토타입 원칙상 `google.script.run`을 Firebase 사이트에 붙이지 않는다.

추천:

- 1차 구현은 재설정 또는 서버 검증 중 하나를 문서로 확정한 뒤 진행한다.
- 클라이언트 단독 비밀번호 검증은 하지 않는다.
- Firestore `users`에는 앞으로도 비밀번호를 저장하지 않는다.

## 6. 최초 로그인 연결 흐름

권장 1차 흐름:

1. 사용자가 Firebase 사이트에 접속한다.
2. Firebase Auth 익명 로그인으로 `uid`를 확보한다.
3. 사용자가 학교/학년/반/번호와 검증 정보를 입력한다.
4. 서버 검증 또는 재설정 검증을 수행한다.
5. `users/{userId}` 문서를 조회한다.
6. `active === true`이고 `status === "active"`인지 확인한다.
7. `role`이 허용된 로그인 유형인지 확인한다.
8. `authUid`가 없으면 현재 `uid`를 연결한다.
9. `authUid`가 현재 `uid`와 같으면 정상 로그인으로 처리한다.
10. `authUid`가 다른 값이면 계정 중복/분실 처리로 안내한다.
11. 연결 성공 후 앱의 현재 회원 컨텍스트를 `users/{userId}` 기준으로 설정한다.

연결 후 읽을 수 있는 정보:

- 닉네임
- 학교
- 학년/반/번호
- role
- active/status
- profileImageUrl
- selectedTitleId
- rankingMessage

## 7. users 컬렉션 업데이트 방식

권장 업데이트 경로:

```text
users/{userId}
```

최초 연결 시 갱신 필드:

```js
{
  authUid,
  authLinkedAt,
  authLinkProvider,
  authLinkVersion,
  updatedAt
}
```

업데이트 원칙:

- 기존 `userId`, `legacyMemberId`, `school`, `grade`, `classNumber`, `studentNumber`는 바꾸지 않는다.
- `role`, `status`, `active`는 일반 사용자가 직접 바꾸지 못하게 한다.
- `authUid`는 비어 있을 때만 설정한다.
- 이미 연결된 `authUid`는 관리자 보정 절차 없이 덮어쓰지 않는다.
- 연결 시 transaction을 사용해 중복 연결을 방지한다.

## 8. 보안 고려사항

- 클라이언트가 `users/{userId}.authUid`를 직접 갱신하게 두면 계정 탈취 위험이 있다.
- 운영 전에는 Cloud Functions 또는 검증 서버에서 다음을 원자적으로 처리해야 한다.
  - 회원 검증
  - inactive 차단
  - 중복 authUid 차단
  - 최초 authUid 연결
  - 감사 로그 기록
- Firestore rules는 일반 사용자에게 다음 쓰기를 허용하지 않는 방향이 안전하다.
  - `users.role`
  - `users.status`
  - `users.active`
  - `users.authUid`
- `users` 읽기도 본인 또는 관리자 범위로 제한해야 한다.
- 로그인 실패 횟수 제한과 과도한 시도 방지가 필요하다.

권장 로그:

```text
authLinkLogs/{autoId}
```

필드:

- userId
- authUid
- result
- reason
- createdAt
- source

## 9. inactive 처리

`status === "inactive"` 또는 `active === false`인 회원은 Firebase 새 사이트 로그인 연결을 차단한다.

처리 방식:

- `users/{userId}` 조회까지는 가능하더라도 authUid 연결은 하지 않는다.
- 화면에는 "비활성화된 계정입니다. 선생님께 문의하세요." 수준의 안내만 표시한다.
- inactive 회원의 기존 데이터는 삭제하지 않는다.
- 관리자 보정으로 active 전환 후 다시 연결할 수 있게 한다.

## 10. 관리자 처리

관리자 문서는 `role: "admin"`으로 import되어 있다.

정책:

- 학생 로그인 화면에서는 admin 계정을 차단한다.
- 관리자 로그인은 별도 관리자 진입 흐름으로 분리한다.
- 관리자 권한은 `users.role`만으로 최종 판단하지 않는다.
- 운영 전에는 Firebase Auth custom claims 또는 서버 검증 기반 관리자 판정을 검토한다.
- 관리자 계정도 평문 비밀번호를 Firestore에 저장하지 않는다.

## 11. 계정 분실과 중복 방지

중복 방지:

- `users/{userId}.authUid`가 이미 다른 uid로 연결되어 있으면 자동 덮어쓰기 금지
- 같은 Auth uid가 여러 `users` 문서에 연결되지 않도록 서버에서 역방향 조회 또는 별도 인덱스 사용

권장 보조 컬렉션:

```text
authUserLinks/{authUid}
```

필드:

```js
{
  authUid,
  userId,
  legacyMemberId,
  linkedAt
}
```

분실 처리:

- 학생이 브라우저/기기를 바꿔 익명 Auth uid를 잃을 수 있다.
- 익명 Auth만으로는 장기 계정 복구가 약하다.
- 운영 전에는 이메일 없는 커스텀 로그인, 교사용 재연결 승인, 또는 계정 이전 절차가 필요하다.

## 12. 구현 순서

1. 로그인/연결 정책 확정
   - 서버 검증 방식 또는 재설정 방식 중 선택

2. Firestore 보안 규칙 초안 갱신
   - `users` 읽기/쓰기 제한
   - `authUid` 직접 쓰기 금지

3. 서버 검증 함수 설계
   - 입력: school, grade, classNumber, studentNumber, verificationSecret
   - 출력: 성공 여부, userId, role, status

4. authUid 연결 transaction 구현
   - `users/{userId}` 확인
   - `authUserLinks/{authUid}` 확인
   - `authUid` 비어 있을 때만 연결
   - 로그 기록

5. 프론트 로그인 화면 프로토타입
   - 학교/학년/반/번호 입력
   - 검증 정보 입력
   - inactive/admin 분기 안내

6. 회원 컨텍스트 resolver 도입
   - 현재 Auth uid
   - 연결된 `users/{userId}`
   - 표시용 프로필 정보

7. 경제/인벤토리/내 집 데이터 승계 정책 결정
   - 기존 uid 기반 데이터를 유지할지
   - legacy userId 기준으로 이전할지
   - 신규 연결 이후만 uid 기준으로 유지할지 결정

8. 제한된 테스트
   - 샘플 학생 1명
   - 샘플 관리자 1명
   - inactive 1명
   - 중복 연결 시도 1건

## 13. 아직 하지 않을 것

- public 코드 수정
- Firestore 데이터 수정
- 실제 로그인 기능 구현
- `authUid` 일괄 연결
- 운영본 `gas-quiz` 수정
- 운영본 비밀번호를 Firestore에 저장
- Firebase Hosting 배포
- 학생 전체 전환 공지
- 관리자 custom claims 적용
