# 회원정보 Firebase 마이그레이션 계획

## 1. 목적

운영본 `gas-quiz`의 기존 회원정보를 수정하지 않고 읽기/참고하여, Firebase 실험본 `gas-quiz-firebase`에서 사용할 `users` 컬렉션 구조와 테스트 seed 방식을 정의한다.

이번 단계의 목적은 실제 이전 실행이 아니라, 운영본 회원 모델을 Firebase로 옮길 때 필요한 필드, 비밀번호 처리, Auth `uid` 매핑, 테스트 절차를 먼저 고정하는 것이다.

## 2. 운영본 gas-quiz 유지 원칙

- 운영본 `~/Projects/gas-quiz`는 학생들이 사용하는 기존 GAS 사이트로 유지한다.
- 운영본 파일, Apps Script 배포, Google Sheets 데이터는 이 작업에서 수정하지 않는다.
- 운영본 회원 데이터는 읽기/참고만 한다.
- 실제 회원정보, 평문 비밀번호, 학생 개인정보를 이 repo에 커밋하지 않는다.
- Firebase 전환은 `gas-quiz-firebase`에서 검증한 뒤 별도 절차로 진행한다.

## 3. Firebase 새 사이트 전환 방식

`gas-quiz-firebase`는 새 Firebase Hosting 사이트로 열고, 초기에는 운영본과 병행한다.

권장 전환 흐름:

1. 운영본 회원정보를 CSV 또는 JSON으로 export
2. 개인정보 검수 및 비밀번호 제거/재설정 정책 적용
3. Firebase `users` 컬렉션에 seed
4. Firebase Auth 익명 `uid` 또는 로그인 성공 후 `uid`를 `users/{userId}`와 매핑
5. 상점, 경제, 인벤토리, 내 집 데이터를 사용자 문서 기준으로 연결
6. 충분히 검증한 뒤 운영 전환 여부 결정

## 4. 기존 회원정보 출처

운영본 기준:

- 주요 서버 파일: `~/Projects/gas-quiz/Code.js`
- 주요 화면 파일: `~/Projects/gas-quiz/index.html`
- 회원 시트명: `회원정보`
- 기본 사용자 ID 형식: `G{학년}-C{반}-N{번호 2자리}`
- 기본 학교가 아닌 경우 사용자 ID 형식: `S{학교키}-G{학년}-C{반}-N{번호 2자리}`
- 기본 역할: `student`
- 관리자 역할: `admin`
- 기본 상태: `active`
- 비활성 상태: `inactive`

운영본 `회원정보` 시트는 현재 코드 기준으로 다음 14개 컬럼을 사용한다.

| 번호 | 컬럼 의미 | 운영본 코드 기준 |
| --- | --- | --- |
| 1 | userId | 회원 ID |
| 2 | 학년 | grade |
| 3 | 반 | classNo |
| 4 | 번호 | number |
| 5 | 닉네임 | nickname |
| 6 | 프로필 이미지 URL | profileImageUrl |
| 7 | 생성일시 | createdAt 성격 |
| 8 | 최근 로그인/수정 일시 | lastLoginAt 성격 |
| 9 | 비밀번호 | 현재 GAS 로그인용 값 |
| 10 | 학교 | school |
| 11 | 선택타이틀 | selectedTitle |
| 12 | 랭킹한마디 | rankingMessage |
| 13 | role | `student` 또는 `admin` |
| 14 | status | `active` 또는 `inactive` |

회원가입은 학년/반/번호/닉네임/학교를 받고, 초기 비밀번호는 `학년 + 반 + 번호 2자리` 규칙으로 생성한다. 예: 3학년 2반 5번은 `3205`.

## 5. Firebase users 컬렉션 설계

권장 경로:

```text
users/{userId}
```

`userId`는 운영본과의 연결성을 위해 우선 기존 `legacyMemberId`와 같은 값을 사용한다.

예:

```text
users/G3-C2-N05
users/S옥정-G4-C1-N12
```

Auth `uid`는 `authUid` 필드로 별도 저장한다. 이렇게 하면 운영본 회원 ID와 Firebase Auth 식별자를 분리할 수 있다.

## 6. 권장 users 필드

```js
{
  userId: "G3-C2-N05",
  legacyMemberId: "G3-C2-N05",
  authUid: "",
  school: "동자",
  grade: "3",
  classNumber: "2",
  studentNumber: "5",
  name: "",
  nickname: "샘플학생",
  role: "student",
  active: true,
  status: "active",
  passwordMode: "legacy_initial_rule",
  initialPasswordChanged: false,
  profileImageUrl: "",
  selectedTitleId: "",
  rankingMessage: "",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  migratedAt: Timestamp
}
```

필드 설명:

- `userId`: Firebase `users` 문서 ID와 같은 값
- `legacyMemberId`: 운영본 `회원정보`의 기존 `userId`
- `authUid`: Firebase Auth 사용자와 연결된 뒤 저장할 `uid`
- `school`: 운영본 정규화 학교명
- `grade`: 학년
- `classNumber`: 반
- `studentNumber`: 번호
- `name`: 실명 사용이 필요할 때만 사용, 초기에는 빈 값 권장
- `nickname`: 운영본 닉네임
- `role`: `student` 또는 `admin`
- `active`: Firebase 화면에서 빠르게 판정하기 위한 boolean
- `status`: 운영본 상태 문자열 보존
- `passwordMode`: 비밀번호 정책 상태
- `initialPasswordChanged`: 초기 비밀번호 변경 여부
- `profileImageUrl`: 운영본 프로필 이미지 URL이 있을 때만 이전
- `selectedTitleId`: 운영본 선택 타이틀
- `rankingMessage`: 운영본 랭킹 한마디
- `createdAt`: Firebase 문서 생성 시각 또는 운영본 생성일시
- `updatedAt`: Firebase 문서 갱신 시각
- `migratedAt`: Firebase로 옮긴 시각

## 7. 기존 비밀번호 처리 정책

원칙:

- 운영본의 평문 비밀번호를 Firestore에 저장하지 않는다.
- 샘플 seed에도 비밀번호를 넣지 않는다.
- 기존 초기 비밀번호 규칙은 로그인 검증 정책 문서에만 남기고, `users` 문서에는 `passwordMode`로 상태만 기록한다.

검토 후보:

1. 기존 초기 비밀번호 규칙 유지
   - 장점: 학생 전환 부담이 낮다.
   - 단점: Firebase에서 직접 검증하려면 서버 검증 또는 안전한 해시 정책이 필요하다.

2. 전환 시 비밀번호 재설정
   - 장점: 평문 비밀번호 이전을 피할 수 있다.
   - 단점: 학생 안내와 초기 전환 비용이 있다.

현재 추천:

- Firestore에는 비밀번호를 저장하지 않는다.
- 1차 테스트에서는 `passwordMode: "migration_required"` 또는 `legacy_initial_rule`만 저장한다.
- 실제 로그인 구현 전 서버 검증 방식 또는 재설정 방식을 별도 결정한다.

## 8. Auth 연결 전략

임시 전략:

- 현재 Firebase 실험본은 익명 Auth `uid`를 사용한다.
- `users/{legacyMemberId}` 문서에 `authUid`를 비워 둔다.
- 테스트 로그인 성공 시 `authUid`를 연결하는 구조를 준비한다.

향후 전략:

1. 학생이 학년/반/번호/비밀번호를 입력
2. 서버 검증 또는 안전한 로그인 검증 통과
3. 현재 Firebase Auth `uid` 확인
4. `users/{legacyMemberId}.authUid`에 연결
5. 이후 `userEconomy`, `userInventory`, `userRoomSettings`를 `authUid` 기준으로 유지하거나 `legacyMemberId` 기준으로 연결할지 결정

권장 방향:

- Auth 인증 주체: Firebase Auth `uid`
- 운영본 회원 식별자: `legacyMemberId`
- 앱 내부 사용자 문서: `users/{legacyMemberId}`
- 경제/인벤토리/방 설정은 전환 정책 확정 전까지 `uid` 기준 유지

## 9. 마이그레이션 방식

### CSV export 방식

- Google Sheets `회원정보` 시트를 CSV로 export
- 로컬에서 필드 검수
- 비밀번호 컬럼 제거
- JSON 또는 Admin SDK seed로 `users` 컬렉션 입력

장점:

- 교사가 직접 검수하기 쉽다.
- 실제 쓰기 전에 개인정보 포함 여부를 확인하기 쉽다.

### JSON seed 방식

- CSV를 검수한 뒤 JSON으로 변환
- `fixtures/migration/MEMBER_MIGRATION_SAMPLE.json`과 같은 구조로 seed
- Admin SDK 스크립트에서 `users/{userId}`에 `set(..., { merge: true })`

장점:

- 반복 테스트와 문서화가 쉽다.
- Firestore 필드 타입을 일관되게 맞추기 쉽다.

### Apps Script export 함수 작성 가능성

- 운영본 `Code.js`에 export 함수를 추가해 회원정보를 정규화된 JSON으로 내보낼 수 있다.
- 단, 운영본 수정이 필요하므로 별도 검토와 승인 후 진행해야 한다.
- 현재 단계에서는 운영본 수정 없이 문서와 샘플만 준비한다.

## 10. 중복 회원 처리

중복 기준:

- 같은 `school + grade + classNumber + studentNumber`
- 같은 `legacyMemberId`
- 같은 닉네임은 중복 허용 가능하지만 표시 정책 필요

처리 원칙:

- 같은 `legacyMemberId`는 하나만 허용한다.
- 같은 학교/학년/반/번호가 여러 개면 `active` 우선, 최신 로그인/수정일 우선으로 후보를 정한다.
- 중복이 확정되지 않은 항목은 `migrationStatus: "needs_review"`로 분리하는 방식을 권장한다.

## 11. inactive 회원 처리

- 운영본 `status: inactive`는 Firebase에서 `active: false`, `status: "inactive"`로 옮긴다.
- inactive 회원은 로그인 차단 또는 읽기 전용 표시 정책이 필요하다.
- 삭제하지 않고 보존하는 것을 기본으로 한다.

## 12. 관리자 계정 처리

- 운영본 `role: admin`은 Firebase `users.role: "admin"`으로 옮긴다.
- 관리자 계정도 평문 비밀번호를 Firestore에 저장하지 않는다.
- 실제 관리자 권한은 Firestore `role`만 믿지 말고 Auth custom claims 또는 서버 검증을 검토한다.
- 운영 전에는 관리자 쓰기 권한을 보안 규칙에서 명확히 분리해야 한다.

## 13. 테스트 순서

1. 샘플 JSON 2~3명으로 `users` 컬렉션 seed 스크립트 문법 검사
2. 실제 실행 전 샘플 필드 구조 검토
3. Firebase 개발 프로젝트에 샘플 seed 실행
4. Firebase Console에서 `users` 문서 확인
5. 익명 Auth `uid`와 샘플 사용자 문서 매핑 방식 검토
6. 로그인 화면 프로토타입에서 회원 조회만 연결
7. 로그인 성공 후 `authUid` 연결 테스트
8. 기존 `userEconomy`, `userInventory`, `userRoomSettings`와 사용자 기준 통합 검토

## 14. 로컬 전용 import 도구

실제 운영본 회원정보 export 파일은 로컬 전용으로만 다룬다.

보호 대상:

- `exports/member-export.json`
- `exports/member-export.csv`
- `exports/`
- `private/`
- `service-account.json`
- `.env`

위 파일과 폴더는 `.gitignore`로 보호하며, 실제 학생 개인정보나 export 결과를 git에 커밋하지 않는다.

로컬 import 스크립트:

```bash
node scripts/migration/import-members-from-json.js --dry-run
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/migration/import-members-from-json.js --commit
```

기본 입력 파일:

```text
./exports/member-export.json
```

안전 규칙:

- 기본 실행은 dry-run으로 처리한다.
- 실제 Firestore 쓰기는 `--commit`을 명시한 경우에만 수행한다.
- import 전 dry-run 결과와 샘플 변환 결과를 반드시 확인한다.
- 비밀번호 필드는 입력 파일에 있어도 Firestore에 저장하지 않는다.
- `passwordMode`, `initialPasswordChanged` 같은 상태값만 저장한다.
- 입력 JSON에 `authUid`가 없으면 기존 `users/{userId}.authUid`를 덮어쓰지 않도록 import 문서에서 제외한다.
- `set(..., { merge: true })`를 사용하므로 입력에 포함된 필드는 기존 `users/{userId}` 값을 갱신할 수 있다.
- 운영본 `gas-quiz`와 Google Sheets는 수정하지 않는다.

입력 JSON은 배열 또는 `{ "members": [...] }` 형태를 허용한다. 운영본 14컬럼 구조를 반영해 `userId`, `grade`, `classNo`, `number`, `nickname`, `profileImageUrl`, `createdAt`, `lastLoginAt`, `password`, `school`, `selectedTitleId`, `rankingMessage`, `role`, `status` 형태의 데이터를 받을 수 있다. `password` 값은 변환 중 폐기된다.

## 15. 아직 하지 않을 것

- 운영본 `gas-quiz` 수정
- 운영본 Google Sheets 데이터 수정
- 실제 회원정보 커밋
- 평문 비밀번호 Firestore 저장
- Firebase 실제 쓰기 실행
- 로그인 코드 구현
- Auth custom claims 설정
- 운영 보안 규칙 확정
- 회원 전체 마이그레이션

## 16. 다음 구현 단계

1. `MEMBER_MIGRATION_PLAN.md` 확정
2. 샘플 seed 스크립트 구조 검토
3. 운영본 회원정보 export 방식 결정
4. 비밀번호 이전/재설정 정책 확정
5. `users` 컬렉션 보안 규칙 초안 작성
6. Firebase 개발 프로젝트에 샘플 사용자만 seed
7. 로그인 화면 프로토타입 설계
8. Auth `uid`와 `users/{legacyMemberId}` 매핑 테스트
