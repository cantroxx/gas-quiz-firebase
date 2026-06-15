# 타이틀현황 Firebase 이관 계획

## 1. 목적

운영본 `gas-quiz`의 `타이틀현황` 시트에 저장된 사용자별 보유 타이틀을 Firebase 실험본으로 옮기기 위한 구조와 절차를 정리한다.

이번 단계는 준비 단계다. 실제 운영본 export 파일 생성, Firestore import 실행, public 코드 연결은 하지 않는다.

## 2. 운영본 데이터 출처

운영본 기준 파일:

- `~/Projects/gas-quiz/Code.js`

운영본 상수:

```js
const TITLE_STATUS_SHEET_NAME = '타이틀현황';
const TITLE_STATUS_HEADERS = [
  'userId',
  'titleId',
  'titleName',
  'theme',
  'tier',
  'effect',
  'sourceType',
  'sourceCategory',
  'sourceGroup',
  'acquiredAt',
  'updatedAt'
];
```

관련 함수:

- `ensureTitleStatusSheet_()`
- `rowToTitleStatusItem_(row)`
- `enrichTitleStatusItem_(item, definitionMap)`
- `getTitleStatusRows_()`
- `buildTitleStatusMap_(userIds)`
- `getAvailableTitlesFromStatus_(userId)`
- `getSelectedTitleFromStatus_(selectedTitleValue, availableTitles)`
- `previewRefreshAllUserTitles()`
- `refreshAllUserTitles()`
- `refreshUserTitles(userId)`
- `updateMemberSelectedTitle(userId, selectedTitleId)`

## 3. 기존 타이틀 데이터 구조

`타이틀현황`은 사용자별 보유 타이틀 목록이다. 한 사용자가 여러 타이틀을 가질 수 있으므로 `users` 문서 하나에 넣기보다 별도 컬렉션 또는 하위 컬렉션으로 옮기는 것이 적절하다.

운영본 row 구조:

| 열 | 필드 | 의미 |
| --- | --- | --- |
| 1 | `userId` | 운영본 회원 ID |
| 2 | `titleId` | 타이틀 ID |
| 3 | `titleName` | 타이틀 표시명 |
| 4 | `theme` | 테마 |
| 5 | `tier` | 등급 숫자 |
| 6 | `effect` | 표시 효과 class |
| 7 | `sourceType` | 획득 조건 유형 |
| 8 | `sourceCategory` | 출처 카테고리 |
| 9 | `sourceGroup` | 출처 그룹 |
| 10 | `acquiredAt` | 최초 획득 시각 |
| 11 | `updatedAt` | 갱신 시각 |

## 4. Firebase 권장 컬렉션

1차 권장 구조:

```text
userTitles/{memberUserId}/titles/{titleId}
```

요약 구조:

```text
userTitleSummary/{memberUserId}
```

권장 이유:

- 보유 타이틀은 사용자당 다건 목록이다.
- `userTitles/{memberUserId}/titles/{titleId}`는 특정 사용자의 보유 타이틀 조회가 단순하다.
- `titleId`를 문서 ID로 쓰면 중복 import를 방지하기 쉽다.
- `userTitleSummary`는 대표 타이틀, 보유 개수, 최근 migration 상태를 빠르게 보여주는 보조 문서로 쓸 수 있다.

## 5. 필드 구조

### `userTitles/{memberUserId}/titles/{titleId}`

```js
{
  userId: "G4-C8-N22",
  memberUserId: "G4-C8-N22",
  titleId: "spelling_doctor",
  titleName: "맞춤법 박사",
  theme: "spelling",
  tier: 3,
  effect: "title-effect-marquee",
  source: {
    type: "practiceStars",
    category: "맞춤법",
    group: "맞춤법"
  },
  sourceType: "practiceStars",
  sourceCategory: "맞춤법",
  sourceGroup: "맞춤법",
  acquiredAt: Timestamp,
  updatedAt: Timestamp,
  migratedAt: Timestamp,
  active: true,
  selected: false,
  migrationSource: "gas_title_status"
}
```

### `userTitleSummary/{memberUserId}`

```js
{
  userId: "G4-C8-N22",
  memberUserId: "G4-C8-N22",
  titleCount: 3,
  selectedTitleId: "spelling_doctor",
  selectedTitleName: "맞춤법 박사",
  migratedAt: Timestamp,
  migrationSource: "gas_title_status"
}
```

## 6. `users.selectedTitleId`와의 관계

현재 Firebase `users/{memberUserId}`에는 운영본 `회원정보` 11열에서 온 `selectedTitleId`가 들어 있다.

이관 후 관계:

- `users/{memberUserId}.selectedTitleId`는 사용자가 선택한 대표 타이틀 ID다.
- `userTitles/{memberUserId}/titles/{titleId}`는 실제 보유 타이틀 목록이다.
- import 시 `titleId === users.selectedTitleId`이면 `selected: true`로 저장한다.
- `users.selectedTitleId`가 있는데 `userTitles`에 해당 titleId가 없으면 누락/불일치로 기록한다.

추천 보조 필드:

- `userTitleSummary/{memberUserId}.selectedTitleId`
- `userTitleSummary/{memberUserId}.selectedTitleName`
- `userTitleSummary/{memberUserId}.missingSelectedTitle: true`

## 7. 중복/누락 titleId 처리

중복 처리:

- 같은 `memberUserId + titleId` 조합은 하나의 문서로 합친다.
- 중복 row가 있으면 `acquiredAt`은 가장 이른 값, `updatedAt`은 가장 최근 값을 우선한다.
- import 스크립트는 문서 ID가 같으면 `set(..., { merge: true })`로 갱신한다.

누락 처리:

- `titleId`가 없으면 Firestore에 쓰지 않고 dry-run에서 경고한다.
- `titleName`이 비어 있으면 `titleId`를 fallback 표시명으로 사용한다.
- `userId`가 없으면 쓰지 않는다.
- `users.selectedTitleId`와 보유 타이틀 목록이 맞지 않는 사용자는 `userTitleSummary`에 `missingSelectedTitle` 후보로 남긴다.

## 8. Firebase 이관 순서

1. 운영본 `타이틀현황` export helper 작성 또는 Apps Script에서 JSON 생성
2. 로컬 `exports/title-export.json` 저장
3. `scripts/migration/import-user-titles-from-json.js --dry-run` 실행
4. row count, 사용자 수, title count, 누락 titleId, 중복 titleId 확인
5. 문제가 없으면 `--commit`으로 Firestore import
6. Firebase Console에서 샘플 사용자 확인
7. `users.selectedTitleId`와 `userTitles`의 `selected` 표시 일치 여부 확인
8. 내 집/프로필 UI에서 `userTitles`를 읽는 단계는 별도 구현

## 9. 실제 export/import 절차

예상 export 파일:

```text
exports/title-export.json
```

지원 입력 형태:

```json
{
  "success": true,
  "exportedAt": "2026-06-07 20:00:00",
  "titles": [
    {
      "userId": "G4-C8-N22",
      "titleId": "spelling_doctor",
      "titleName": "맞춤법 박사",
      "theme": "spelling",
      "tier": 3,
      "effect": "title-effect-marquee",
      "sourceType": "practiceStars",
      "sourceCategory": "맞춤법",
      "sourceGroup": "맞춤법",
      "acquiredAt": "2026-05-01 09:00:00",
      "updatedAt": "2026-05-01 09:00:00"
    }
  ]
}
```

dry-run:

```bash
node scripts/migration/import-user-titles-from-json.js --dry-run --input exports/title-export.json --sample 5
```

실제 import:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/migration/import-user-titles-from-json.js --commit --input exports/title-export.json
```

이번 단계에서는 실제 export/import를 실행하지 않는다.

## 10. 아직 하지 않을 것

- 운영본 `gas-quiz` 코드 수정
- 운영본 Apps Script export helper 추가
- `exports/title-export.json` 생성 또는 커밋
- Firestore 실제 import 실행
- public UI에서 `userTitles` 읽기 연결
- 보안 규칙 최종화
- 타이틀 이미지/효과 asset 연결

## 11. 다음 단계

1. 운영본에 읽기 전용 `타이틀현황` export helper 추가
2. preview로 row count와 샘플 확인
3. Drive 또는 Logger 분할 방식으로 JSON export
4. 로컬 `exports/title-export.json` 저장
5. dry-run
6. 실제 import
7. `docs/product/PROTOTYPE_STATUS.md` 갱신
