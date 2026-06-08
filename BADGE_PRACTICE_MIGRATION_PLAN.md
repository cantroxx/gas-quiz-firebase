# Badge Practice Migration Plan

## 목적

운영본 `gas-quiz`의 `연습기록`과 `포켓몬연습기록`을 Firebase 실험본으로 옮겨, 운영본에서 학생이 쌓은 연습 진행도/별/뱃지 상태를 보존한다.

이번 문서는 실행 계획과 도구 초안이다. 실제 export/import는 하지 않는다.

## 운영본 데이터 출처

### `연습기록`

운영본의 중심 원천 시트다.

```text
userId, 학년, 반, 번호, 닉네임, 영역, 세부구분, 맞힌개수, 전체개수, 맞힌목록, 별개수, 최근성취일시, 최초완주일시, 최근완주일시, 모드
```

성격:

- `userId + 영역 + 세부구분` 단위로 진행도 row가 갱신된다.
- `맞힌목록`은 정답 처리된 문제 ID 목록이다.
- `별개수`는 완주 횟수 또는 complete형 완주 상태의 핵심 값이다.
- 현재 포켓몬 연습도 통합 `연습기록`에 저장되는 경로가 있다.

### `포켓몬연습기록`

기존 호환용 별도 시트다.

```text
userId, 학년, 반, 번호, 닉네임, 세대, 획득여부, 획득일시, 맞힌개수, 전체개수, 최고성취일시, 맞힌목록
```

성격:

- 현재 저장 경로는 통합 `연습기록`을 사용하지만, 타이틀 계산과 reset 도구에는 별도 시트 호환 로직이 남아 있다.
- 같은 사용자/세대가 `연습기록`과 `포켓몬연습기록` 양쪽에 있으면 중복 집계 위험이 있다.

## Firebase 권장 저장 구조

### `practiceRecords/{recordId}`

연습기록 원천 저장소다.

```js
{
  recordId,
  userId,
  memberUserId,
  area,
  detail,
  areaKey,
  completionType, // "loop" | "complete"
  correctCount,
  totalCount,
  correctIds,
  starCount,
  completed,
  hasLegacyUnknown,
  legacyUnknownCount,
  firstCompletedAt,
  lastCompletedAt,
  lastAchievedAt,
  mode: "practice",
  sourceSheet,
  sourceRowNumber,
  migrationSource: "gas_practice_record"
}
```

권장 `recordId`:

```text
{memberUserId}__{normalizedAreaKey}
```

### `userPracticeSummary/{memberUserId}`

사용자별 연습/뱃지 요약이다.

```js
{
  userId,
  memberUserId,
  totalStars,
  earnedBadgeCount,
  groupStars,
  recommendedBadgeId,
  recordCount,
  legacyUnknownRecordCount,
  groups,
  migratedAt,
  migrationSource: "gas_practice_record"
}
```

### `userBadges/{memberUserId}/badges/{badgeId}`

화면 표시용 materialized badge view다.

```js
{
  userId,
  memberUserId,
  badgeId,
  label,
  group,
  areaKey,
  sourceId,
  correct,
  total,
  starCount,
  completed,
  progressPercent,
  available,
  hasLegacyUnknown,
  updatedAt,
  migrationSource: "gas_practice_record"
}
```

## complete형/loop형 처리 방식

- `completionType: "loop"`
  - 완주할 때마다 `starCount`가 증가한다.
  - 운영본은 완주 후 진행도를 0으로 초기화할 수 있으므로 `starCount`가 핵심이다.
  - `completed`는 `correctCount >= totalCount || starCount > 0`로 계산한다.
- `completionType: "complete"`
  - 독서/GMO처럼 한 번 완주 상태를 유지하는 유형이다.
  - 운영본은 완주 시 `starCount`를 최소 1로 두고 `correctCount`를 `totalCount`로 유지한다.
  - import에서는 export 값 보존을 우선하고, `starCount > 0`이면 `completed: true`로 둔다.
- export 파일에는 가능하면 `completionType`을 명시한다.
- 명시가 없으면 `area/detail` alias로 추론하되, 추론 결과는 `inferredCompletionType: true`로 남긴다.

## 포켓몬 중복 집계 방지 방식

중복 키:

```text
{memberUserId} + "포켓몬" + "{n}세대"
```

정책:

- `연습기록`과 `포켓몬연습기록`에 같은 사용자/세대가 있으면 하나의 `practiceRecords/{recordId}`로 합친다.
- 통합 `연습기록` row를 우선 canonical source로 둔다.
- 별/획득 상태는 손실 방지를 위해 큰 값을 사용한다.
  - `starCount`: max
  - `correctCount`: max
  - `totalCount`: max
  - `correctIds`: union
- 어떤 source가 합쳐졌는지는 `mergedSources`에 남긴다.

## `LEGACY_UNKNOWN` 보완 정책

운영본 과거 row는 `맞힌목록`이 비어 있고 `맞힌개수`만 있을 수 있다.

정책:

- export 시 이미 `LEGACY_UNKNOWN_1` 같은 ID가 있으면 그대로 보존한다.
- import 도구는 `correctIds`가 비어 있고 `correctCount > 0`이면 `LEGACY_UNKNOWN_{n}`을 생성한다.
- 해당 record/badge에 다음 필드를 남긴다.
  - `hasLegacyUnknown: true`
  - `legacyUnknownCount`
- legacy ID는 실제 문제 ID가 아니므로 퀴즈별 세부 복원보다 진행도/별 보존을 위한 값으로만 사용한다.

## area/detail alias 정규화 정책

정규화 목적:

- 같은 운영본 퀴즈가 표기 차이로 여러 badgeId가 되는 것을 방지한다.

기본 정책:

- `area`와 `detail` 원문은 그대로 저장한다.
- 별도 `areaKey`와 `badgeId`는 정규화된 값을 사용한다.

주요 alias:

- `국어 / 독서:지엠오 아이`, `reading-gmo`, `gmo` -> `국어/gmo`
- `국어 / 다의어·동형이의어` -> `국어/word-relation`
- `수학 / 난수퀴즈`, `random-basic`, `곱셈과나눗셈` -> `수학/random-basic`
- `포켓몬 / 1세대` ~ `9세대` -> `포켓몬/gen{n}`
- `사회 / 삼국지`, `삼국시대` 계열 -> `사회/three-kingdoms`
- `사회 / 고대사~삼국시대` 계열 -> `사회/ancient-three-kingdoms`

## total 문제 수 snapshot/recompute 정책

1차 import 정책:

- export 파일의 `totalCount`를 snapshot으로 저장한다.
- import 시점에 문제 수를 재계산하지 않는다.

이유:

- 운영본 문제 수는 시트/목록 상태에 따라 바뀔 수 있다.
- 과거 연습기록의 완주 판단은 당시 total 기준을 보존하는 편이 안전하다.

추후 정책:

- Firebase 퀴즈 카탈로그가 안정되면 `catalogTotalCount`를 별도로 저장해 snapshot total과 비교한다.
- 차이가 있으면 자동 보정보다 검토 리포트로 처리한다.

## 타이틀 지급과 뱃지 지급 관계

- 타이틀은 `타이틀현황`에서 이미 `userTitles` / `userTitleSummary`로 import했다.
- 뱃지/연습기록은 타이틀 지급의 원천 조건이다.
- 이번 import는 기존 `userTitles`를 덮어쓰지 않는다.
- 뱃지 import 후에는 다음 검증만 수행한다.
  - `practiceStars` 기반 타이틀이 필요한 badge source를 갖는지
  - `userTitles.selected`와 뱃지 상태가 논리적으로 충돌하지 않는지
- 타이틀 재계산/재지급은 별도 단계에서 preview-first로 진행한다.

## 이관 순서

1. 운영본에 읽기 전용 export helper 추가
2. `연습기록`과 `포켓몬연습기록`을 JSON으로 export
3. 로컬 `practice-export.json` 저장
4. `practice-export.json`이 `.gitignore` 보호 대상인지 확인
5. import 도구 dry-run 실행
6. row 수, 사용자 수, duplicate merge 수, legacy unknown 수 확인
7. 샘플 사용자 2~3명의 `practiceRecords`, `userBadges`, `userPracticeSummary` preview 확인
8. 문제가 없으면 `--commit`으로 Firestore import
9. Firestore에서 샘플 사용자 검증
10. `PROTOTYPE_STATUS.md` 갱신

## 검증 방법

dry-run에서 확인:

- `practiceRecords` 준비 건수
- `userBadges` 준비 건수
- `userPracticeSummary` 준비 건수
- 포켓몬 중복 merge 건수
- `LEGACY_UNKNOWN` record 건수
- skipped row와 reason
- 샘플 path:
  - `practiceRecords/{recordId}`
  - `userPracticeSummary/{memberUserId}`
  - `userBadges/{memberUserId}/badges/{badgeId}`

commit 후 확인:

- Firestore `practiceRecords` 문서 생성
- Firestore `userPracticeSummary` 문서 생성
- Firestore `userBadges/{memberUserId}/badges/{badgeId}` 문서 생성
- 샘플 사용자 summary의 `totalStars`, `earnedBadgeCount`, `recommendedBadgeId`
- 포켓몬 세대별 중복 문서가 없는지
- legacy record가 `hasLegacyUnknown: true`로 남았는지

## 아직 하지 않을 것

- 실제 운영본 export
- 실제 Firestore import
- 운영본 `gas-quiz` 수정
- `clasp push`
- Firebase deploy
- public UI에서 `userBadges`/`userPracticeSummary` 읽기 연결
- 타이틀 재계산 또는 `userTitles` 덮어쓰기
- 운영본 문제 수 전체 조사
- Firestore rules 최종화
