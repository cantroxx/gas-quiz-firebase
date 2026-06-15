# Badge Practice Migration Discovery Phase 1

## Scope

- 목적: 운영본 `gas-quiz`의 뱃지/연습기록 구조를 Firebase로 옮기기 위한 1차 정찰
- 운영본 확인 위치: `/Users/kdw/Projects/gas-quiz`
- 확인 방식: `rg` 키워드 검색 후 관련 함수 주변만 확인
- 제외: 실제 export/import, 전체 문제 수 조사, 전체 `Code.js` 분석, public/Firebase 설정 수정

## 확인한 시트 목록

- `연습기록`
  - 상수: `PRACTICE_RECORD_SHEET_NAME`
  - 헤더: `userId`, `학년`, `반`, `번호`, `닉네임`, `영역`, `세부구분`, `맞힌개수`, `전체개수`, `맞힌목록`, `별개수`, `최근성취일시`, `최초완주일시`, `최근완주일시`, `모드`
  - 일반 연습전 진행도와 별/뱃지 상태의 중심 시트다.
- `포켓몬연습기록`
  - 상수: `POKEMON_PRACTICE_RECORD_SHEET_NAME`
  - 별도 ensure 함수의 헤더: `userId`, `학년`, `반`, `번호`, `닉네임`, `세대`, `획득여부`, `획득일시`, `맞힌개수`, `전체개수`, `최고성취일시`, `맞힌목록`
  - 현재 `savePokemonPracticeProgress`는 통합 `연습기록` 저장을 호출하지만, 타이틀 context와 reset 도구에는 별도 시트 호환 로직이 남아 있다.
- `타이틀현황`
  - 뱃지 자체 저장소는 아니지만 `practiceStars`, `badge`, `badgeFields`, `pokemonGenCount` 등 뱃지/연습기록 기반 타이틀 결과가 저장된다.
- `내집설정`
  - 대표뱃지ID/대표칭호ID가 있어 뱃지 표시와 연결된다.
- 문제 수 산정에 참조되는 시트
  - `티니핑문제`, `인물문제`, `아이돌문제`, `애니문제`, `아재개그문제`
  - 국어/수학/사회 목록 시트의 `sheetName`
  - `단어시트`, `지앰오아이문제` 등 과목 퀴즈 문제 시트

## 확인한 함수 목록

### 저장 진입점

- `savePracticeProgress(userInfo, area, detail, correctIds, totalCount)`
  - 비포켓몬 연습전 진행도를 `연습기록`에 저장한다.
  - 같은 `userId + 영역 + 세부구분` row를 찾아 갱신하거나 새 row를 추가한다.
- `savePokemonPracticeProgress(userInfo, generation, correctCount, totalCount, correctIds)`
  - 포켓몬 세대 연습을 `savePracticeProgress(member, '포켓몬', '{n}세대', ...)`로 위임한다.
- `savePracticeProgressInBackground()`
  - 프런트에서 연습전 종료 시 `savePracticeProgress` 호출.
- `savePokemonPracticeProgressInBackground()`
  - 프런트에서 포켓몬 연습전 종료 시 `savePokemonPracticeProgress` 호출.

### 시트 보장/쓰기

- `ensurePracticeRecordSheet()`
- `writePracticeRecordRow_(sheet, rowNumber, row)`
- `ensurePokemonPracticeRecordSheet()`

### ID/진행도 처리

- `getCurrentPracticeCorrectId()`
- `getCurrentPokemonPracticeCorrectId()`
- `normalizePokemonPracticeId_(value)`
- `parsePokemonPracticeCorrectList_(value)`
- `uniquePokemonPracticeIds_(values)`
- `getLegacyPokemonPracticeIds_(count)`

### 뱃지 계산

- `getPracticeBadgeTotals_()`
- `makePracticeBadgeItem_(correct, total, stars)`
- `getPracticeBadgeProgress(userId)`
- `buildMyRoomBadgeSummary_(userId)`
- `makeMyRoomBadgeSummaryItem_(id, label, group, data, order)`
- `recommendMyRoomBadge_(badgeSummary)`
- `isValidMyRoomBadgeId_(badgeSummary, badgeId)`

### 타이틀 지급 연계

- `buildTitleContext_(options)`
- `addTitleContextBadgeStar_(context, userId, sourceId, group, starCount)`
- `addTitleContextGenericBadgeArea_(context, userId, areaKey, starCount)`
- `getPracticeTitleSourceFromRow_(area, detail, solvedIds)`
- `getPracticeBadgeAreaKeyFromRow_(area, detail, solvedIds)`
- `buildTitleBadgeSummaryFromContext_(userId, titleContext)`
- `buildAvailableTitleList_(badgeSummary, userId, titleContext)`

### 포켓몬 reset 관련 호환 로직

- `previewResetPokemonPracticeData()`
- `runResetPokemonPracticeData()`
- `isPokemonPracticeRecordResetTarget_(row)`
- `isPokemonPracticeTitleStatusResetTarget_(row)`
- `hasPokemonPracticeBadgeState_(row)`
- `resetPokemonPracticeData(preview)`

## 뱃지 계산 방식 요약

- 운영본에는 독립적인 `뱃지현황` 저장 시트가 아니라 `연습기록` 기반 계산이 중심으로 보인다.
- `getPracticeBadgeTotals_()`가 각 퀴즈/영역의 전체 목표 수를 만든다.
  - 포켓몬: 세대별 총 문항 수
  - 인물/인기: 티니핑, 역사인물, 아이돌, 애니
  - 일상: 아재개그
  - 국어: 목록 기반 국어 퀴즈, 단어, 독서/GMO
  - 수학: 목록 기반 수학 퀴즈, 생성형은 100문항
  - 사회: 사회 목록의 sheet 퀴즈도 people 그룹에 포함
- `getPracticeBadgeProgress(userId)`는 `연습기록`에서 해당 사용자의 rows를 읽어 `correct`, `total`, `starCount`를 그룹별 progress로 변환한다.
- `buildMyRoomBadgeSummary_(userId)`는 progress를 내 집 대표 뱃지 후보 목록으로 변환한다.
- 뱃지 available 판정은 `starCount > 0 || completed`이다.
- 별 개수는 완주 횟수 성격이다.
  - 일반 loop형 연습은 완주 때마다 `starCount++`, 진행도는 다시 0으로 초기화된다.
  - complete형 독서/GMO는 완주 시 `starCount`가 최소 1로 고정되고, `correct`는 total로 유지된다.

## 연습기록 저장 구조

- 키 성격: `userId + 영역 + 세부구분`
- 주요 저장 필드:
  - 회원 기본값: 학년, 반, 번호, 닉네임
  - 퀴즈 구분: 영역, 세부구분
  - 진행도: 맞힌개수, 전체개수
  - 누적 정답 ID: 맞힌목록
  - 뱃지/별 상태: 별개수
  - 일시: 최근성취일시, 최초완주일시, 최근완주일시
  - 모드: `practice`
- 정답 ID는 프런트의 `qData[4] || qData[1] || qData[0]` 기반이다.
- 기존 row에 `맞힌목록`이 없고 `맞힌개수`만 있으면 `LEGACY_UNKNOWN_{n}` 형태의 legacy ID로 보완한다.
- 완료 처리:
  - `mergedIds.length >= total`이면 완료.
  - loop형은 별 증가 후 `맞힌목록` 초기화, `맞힌개수` 0.
  - complete형은 별 최소 1, `맞힌개수` total, `맞힌목록` 초기화.

## 포켓몬연습기록 별도 여부

- 별도 시트와 ensure 함수가 존재한다.
- 다만 현재 저장 함수는 `포켓몬연습기록`에 직접 쓰기보다 `savePracticeProgress`로 통합 `연습기록`에 저장한다.
- `buildTitleContext_()`는 두 경로를 모두 본다.
  - `연습기록`: 포켓몬 row 포함 가능
  - `포켓몬연습기록`: 기존 별도 저장 호환으로 `획득여부 === true`인 세대 row를 `pokemon_gen{n}` source로 반영
- 따라서 Firebase 이전 시 포켓몬은 중복 집계 위험이 있다.

## 타이틀 지급과 뱃지 지급의 관계

- 타이틀은 별도 `타이틀현황`에 저장되지만, 획득 조건은 뱃지/연습기록 계산 결과와 연결된다.
- `buildTitleContext_()`가 `연습기록`과 `포켓몬연습기록`에서 `badgeStarsByUserId`를 구성한다.
- `buildAvailableTitleList_()`는 다음 조건을 사용한다.
  - `practiceStars`: 특정 source의 `starCount >= requiredBadgeCount`
  - `badge`: 기본 뱃지 1개 이상
  - `badgeFields`: 서로 다른 분야/영역 뱃지 수
  - `pokemonGenCount`: 서로 다른 포켓몬 세대 뱃지 수
- 이미 import한 `userTitles`는 결과 저장소이고, 뱃지/연습기록 import는 해당 결과를 재계산하거나 검증하는 원천 데이터가 된다.

## Firebase 권장 구조 초안

### `userBadges/{memberUserId}/badges/{badgeId}`

```js
{
  userId,
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
  updatedAt,
  migrationSource: "gas_practice_record"
}
```

### `practiceRecords/{recordId}`

```js
{
  recordId, // e.g. `${memberUserId}__${areaKey}`
  userId,
  memberUserId,
  area,
  detail,
  areaKey,
  correctCount,
  totalCount,
  correctIds,
  starCount,
  firstCompletedAt,
  lastCompletedAt,
  lastAchievedAt,
  mode: "practice",
  sourceSheet,
  sourceRowNumber,
  migrationSource: "gas_practice_record"
}
```

### `userPracticeSummary/{memberUserId}`

```js
{
  userId,
  memberUserId,
  totalStars,
  earnedBadgeCount,
  groupStars,
  recommendedBadgeId,
  groups: {
    pokemon,
    people,
    daily,
    korean,
    reading,
    math
  },
  migratedAt,
  migrationSource: "gas_practice_record"
}
```

## 가장 위험한 이관 포인트

- 포켓몬 중복 집계
  - `연습기록`과 `포켓몬연습기록`을 동시에 읽는 호환 로직이 있어 같은 세대 뱃지가 중복될 수 있다.
- complete형과 loop형의 완료 처리 차이
  - 독서/GMO 같은 complete형은 별 증가 규칙이 일반 loop형과 다르다.
- legacy 정답 ID
  - 과거 row는 `맞힌목록` 없이 `맞힌개수`만 있을 수 있어 `LEGACY_UNKNOWN_*` 보완이 필요하다.
- area/detail alias 정규화
  - `독서:지엠오 아이`, `다의어·동형이의어`, 삼국시대/고대사, 수학 곱셈과 나눗셈 alias가 많다.
- 총 문항 수 산정
  - totals는 문제 시트/목록 시트 기반으로 동적으로 계산된다. Firebase import 시점의 total을 스냅샷으로 저장할지, 카탈로그에서 재계산할지 결정해야 한다.
- 타이틀과 뱃지의 순서
  - `userTitles`는 이미 결과로 import되었지만, 뱃지 import 후 재계산 결과와 불일치가 생길 수 있다.
- 대표 뱃지/내 집 설정
  - `내집설정`의 대표뱃지ID가 imported badge 목록에 없는 경우 처리 정책이 필요하다.

## 먼저 이관 가능한 데이터

- `연습기록`의 비포켓몬 row
  - 단일 시트, 명확한 헤더, `userId + 영역 + 세부구분` 구조.
- `연습기록`의 포켓몬 row
  - 현재 저장 경로가 통합되어 있어 우선 이관 가능하지만, `포켓몬연습기록`과 중복 검증 필요.
- `userPracticeSummary` 스냅샷
  - `getPracticeBadgeProgress`/`buildMyRoomBadgeSummary_` 결과와 같은 요약을 Firebase에 저장하면 UI 연결이 쉬움.
- `userBadges` 계산 결과
  - 원천 `practiceRecords` import 이후 계산해서 쓰는 방식이 안전.

## 아직 확인하지 않은 영역

- 실제 `연습기록` row 수와 사용자 수
- 실제 `포켓몬연습기록` row 수와 현재 사용 여부
- `내집설정` 대표뱃지ID 전체 현황
- 전체 문제 수와 totals 산정 결과
- badge source 전체 ID 목록의 완전한 표준화
- Firestore 보안 규칙
- public UI의 실제 `userBadges`/`userPracticeSummary` 읽기 연결
- export/import 스크립트 설계
- 타이틀 재계산 여부와 기존 `userTitles`와의 불일치 처리 정책
