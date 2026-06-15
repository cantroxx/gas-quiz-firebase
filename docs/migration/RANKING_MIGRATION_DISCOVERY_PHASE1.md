# Ranking Migration Discovery Phase 1

## Scope

- 목적: 운영본 `gas-quiz`의 랭킹 기록 구조를 Firebase로 옮기기 위한 1차 정찰
- 운영본 확인 위치: `/Users/kdw/Projects/gas-quiz`
- 확인 방식: `rg` 키워드 검색 후 관련 함수 주변만 확인
- 제외: 실제 export/import, 전체 `Code.js`/`index.html` 분석, public/Firebase 설정 수정, push/deploy

## 확인한 시트 목록

- `랭킹기록`
  - 현재 랭킹전 기록의 중심 시트다.
  - `ensureRankingRecordSheet()`가 없으면 생성하고 헤더를 보정한다.
  - 헤더: `날짜`, `이름`, `카테고리`, `점수`, `userId`, `학년`, `반`, `번호`, `소요시간초`, `소요시간표시`, `랭킹모드`
  - `getRankingRecordRows_()`는 2행부터 11열을 읽는다.
- `기록저장`
  - 구 랭킹 기록 시트다.
  - `getLegacyRankingRows_()`가 존재하면 2행부터 8열을 읽는다.
  - `getLegacyRankings()`는 이 시트를 `buildRankingsFromRows_(rows, false)`로 집계한다.
- `랭킹기록_600분초과백업`
  - 운영 중 정리 도구가 600분 초과 랭킹기록을 백업하는 시트다.
  - 이관 원천보다는 검토/감사 성격의 보조 시트다.
- `랭킹기록_맞춤법노힌트백업`
  - 맞춤법 노힌트 기록 정리 관련 백업 시트로 검색됐다.
  - 이번 단계에서는 관련 정리 함수 전체를 추가 분석하지 않았다.

## 확인한 함수 목록

### 저장/시트

- `normalizeRankingMode_(rankingMode)`
  - 읽기/조회용 랭킹 모드를 `normal`, `onechance`, `silhouette`, `nohint`, `speed` 중 하나로 정규화한다.
  - legacy 호환으로 `silhouette`을 인정한다.
- `normalizeWritableRankingMode_(rankingMode)`
  - 저장 가능한 현재 모드를 `normal`, `onechance`, `nohint`, `speed`로 제한한다.
- `normalizeWritableRankingModeForCategory_(category, subFilter, rankingMode)`
  - `독서`, `수학`, `맞춤법`은 `onechance` 또는 `normal`만 저장한다.
- `ensureRankingRecordSheet()`
  - `랭킹기록` 시트와 11개 헤더를 보장한다.
- `saveRankingRecord(category, studentNum, score, subFilter, memberInfo, elapsedSeconds, rankingMode)`
  - 랭킹전 완료 후 `랭킹기록`에 append한다.
  - 비활성/비학생 회원은 저장 제외한다.
  - 600분 초과 elapsed는 저장 차단한다.

### 조회/집계

- `getRankingRecordRows_()`
  - `랭킹기록`의 현재 기록을 읽는다.
- `getLegacyRankingRows_()`
  - `기록저장`의 구 기록을 읽는다.
- `getFullRankings(rankingMode)`
  - 현재 `랭킹기록`을 모드별로 집계한다.
- `getLegacyRankings()`
  - 구 `기록저장`을 시간 tie-break 없이 집계한다.
- `buildRankingsFromRows_(rows, useElapsedTime, rankingMode)`
  - 카테고리별 사용자 최고 기록을 뽑고 상위 10명을 반환한다.
- `getUserBestScores(userId, rankingMode)`
  - 특정 사용자의 카테고리별 최고 점수/시간을 반환한다.
- `getUserRankingSummary(userId, rankingMode)`
  - 특정 사용자의 카테고리별 순위, 전체 인원, 점수, 시간을 계산한다.
- `normalizeRankingCategory(category)`
  - 일부 legacy 카테고리 alias를 현재 카테고리로 정규화한다.

### 퀴즈왕

- `getQuizKingRankings()`
  - 퀴즈왕 전체 랭킹을 반환한다.
- `getQuizKingAuditRecords_()`
  - `랭킹기록`에서 `normal`, `onechance`, `nohint`, `speed` 기록을 퀴즈왕 계산용 record로 변환한다.
- `buildQuizKingScoreByCategoryBest_(records)`
  - 사용자별 카테고리 최고 점수만 합산해 퀴즈왕 총점을 만든다.
- `isBetterQuizKingAuditRecord_(next, current)`
  - 점수 우선, 동점이면 짧은 시간, 다시 동점이면 빠른 row를 우선한다.
- `debugQuizKingLeaderScoreByCategoryBest()`
  - 퀴즈왕 계산 점검용 수동 함수다.

### 프런트 호출 위치

- `saveRankingScoreInBackground()`
  - 랭킹전 종료 후 `saveRankingRecord(...)`를 호출한다.
- `loadRankings()` 계열
  - `quizking`은 `getQuizKingRankings()`, 그 외 모드는 `getFullRankings(rankingMode)`를 호출한다.
- 프로필 랭킹 영역
  - `getUserBestScores(userId, rankingMode)`
  - `getUserRankingSummary(userId, rankingMode)`

## 랭킹기록 저장 구조

`saveRankingRecord()`는 `랭킹기록`에 다음 순서로 row를 append한다.

```js
[
  new Date(),
  studentName,
  finalCategory,
  numericScore,
  userId,
  member.grade || '',
  member.classNo || '',
  member.number || '',
  elapsed || '',
  formatElapsedSeconds(elapsed),
  finalRankingMode
]
```

- row 단위 원천 기록이며 사용자/카테고리별 최고 기록은 저장 시 계산하지 않는다.
- `finalCategory`는 `subFilter`가 있으면 `${category}(${subFilter})`, 없으면 `category`다.
- `score <= 0` 또는 숫자가 아니면 저장을 skip한다.
- `elapsedSeconds > MAX_RANKING_ELAPSED_SECONDS`는 저장 차단된다.
- `NORMAL_RANKING_SCORE50_COUNT_CACHE_`는 저장 후 무효화된다.

## 기록저장 시트와 랭킹기록 시트 관계

- `랭킹기록`은 현재 랭킹전 저장소다.
  - 11열 구조이며 모드와 소요시간을 포함한다.
  - 현재 랭킹/프로필 랭킹/퀴즈왕 계산의 주 원천이다.
- `기록저장`은 구 랭킹 저장소다.
  - 8열까지만 읽으며 랭킹모드와 소요시간 tie-break를 사용하지 않는다.
  - `getLegacyRankings()`를 통해 `(구)랭킹` 표시용으로 남아 있다.
- Firebase 이관 시 두 시트를 같은 컬렉션에 넣되 `sourceSheet`와 `legacy` 플래그로 구분하는 방식이 적합하다.

## 퀴즈왕 계산 구조 요약

- 원천은 `랭킹기록`이다.
- 대상 모드는 `normal`, `onechance`, `nohint`, `speed`다.
- 각 row는 `getQuizKingAuditRecords_()`에서 사용자 key와 카테고리 단위 record로 변환된다.
  - `userId`가 있으면 `ID:{userId}`
  - 없고 학년/반/번호가 있으면 `GCN:{grade}-{classNo}-{number}`
  - 둘 다 없으면 `NAME:{recordName}`
- 사용자별, 카테고리별 최고 기록만 반영한다.
- 최고 기록 판정은 점수 높음, 소요시간 짧음, rowNumber 빠름 순이다.
- 퀴즈왕 총점은 사용자의 카테고리별 최고 점수 합계다.
- 정렬은 총점 내림차순, 반영 카테고리 수 내림차순, 이름순이다.

## 카테고리/모드/점수/시간 필드 구조

- 카테고리
  - 저장 시 `category` 또는 `category(subFilter)` 형식이다.
  - `normalizeRankingCategory()`가 `애니`, `인물(애니 캐릭터)`를 `인물(애니)`로 정규화한다.
  - `수학(난수퀴즈)`는 `수학(곱셈과 나눗셈)`으로 정규화한다.
  - 독서 세부 카테고리는 `독서(title)`이며 집계 시 `독서` 통합 카테고리에도 포함된다.
- 모드
  - 현재 저장 가능: `normal`, `onechance`, `nohint`, `speed`
  - 읽기 호환: `silhouette`
  - `독서`, `수학`, `맞춤법`은 저장 시 `onechance`/`normal`만 허용된다.
- 점수
  - 숫자 변환 가능한 양수만 저장된다.
  - 카테고리별 랭킹과 퀴즈왕 모두 높은 점수가 우선이다.
- 시간
  - 현재 `랭킹기록`은 `소요시간초`, `소요시간표시`를 저장한다.
  - 현재 랭킹은 동점일 때 짧은 시간이 우선이다.
  - 구 `기록저장`은 시간 tie-break를 사용하지 않는다.

## Firebase 권장 구조 초안

### `rankingRecords/{recordId}`

```js
{
  recordId,
  memberUserId,
  userId,
  displayName,
  category,
  categoryKey,
  rawCategory,
  subFilter,
  score,
  elapsedSeconds,
  elapsedText,
  rankingMode,
  sourceSheet, // "랭킹기록" | "기록저장"
  sourceRowNumber,
  legacy,
  recordedAt,
  migratedAt,
  migrationSource: "gas_ranking_record"
}
```

### `userRankingSummary/{memberUserId}`

```js
{
  memberUserId,
  byMode: {
    normal: {
      byCategory: {
        [categoryKey]: {
          rank,
          total,
          score,
          elapsedSeconds,
          recordId
        }
      }
    }
  },
  bestScoresByMode,
  updatedAt,
  migrationSource: "gas_ranking_record"
}
```

### `quizKingSummary/{memberUserId}`

```js
{
  memberUserId,
  totalScore,
  categoryCount,
  rank,
  categories: [
    {
      categoryKey,
      category,
      score,
      elapsedSeconds,
      rankingMode,
      recordId
    }
  ],
  updatedAt,
  migrationSource: "gas_ranking_record"
}
```

## 랭킹 이관 시 위험한 포인트

- 구 `기록저장`에는 모드/시간 tie-break 정보가 없어 현재 `랭킹기록`과 동일 규칙으로 합치면 왜곡될 수 있다.
- `userId`가 없는 legacy row는 이름 또는 학년/반/번호 fallback key를 써야 하므로 회원 매칭 오류 위험이 있다.
- 카테고리 alias가 존재한다.
  - `애니`/`인물(애니 캐릭터)`/`인물(애니)`
  - `수학(난수퀴즈)`/`수학(곱셈과 나눗셈)`
  - 독서 `독서(title)`과 통합 `독서`
- `silhouette`은 현재 저장되지 않지만 읽기 호환 모드로 남아 있어 이관 정책을 정해야 한다.
- 현재 랭킹은 상위 10명을 즉시 반환하지만 Firebase에서는 원천 row와 summary를 분리해야 한다.
- 퀴즈왕은 단순 최고 점수 1개가 아니라 카테고리별 최고 기록 합산이라 중복/alias 정규화가 중요하다.
- 운영 도구가 만든 백업 시트를 원천으로 포함할지 여부를 별도 판단해야 한다.

## 먼저 이관 가능한 데이터

1. `랭킹기록` 원천 row
   - 11열 구조가 명확하고 현재 랭킹/퀴즈왕의 주 원천이다.
2. `rankingRecords/{recordId}`
   - row 단위 append 기록을 그대로 보존하기 쉽다.
3. `userRankingSummary/{memberUserId}`
   - `buildRankingsFromRows_()` 규칙을 재현하면 모드별/카테고리별 요약을 만들 수 있다.
4. `quizKingSummary/{memberUserId}`
   - `getQuizKingAuditRecords_()`와 `buildQuizKingScoreByCategoryBest_()` 규칙을 별도 summary로 계산 가능하다.
5. `기록저장` legacy row
   - `legacy: true`, `rankingMode: "legacy"` 또는 `rankingMode: "normal"` 보정 정책을 정한 뒤 별도 import하는 것이 안전하다.

## 아직 확인하지 않은 영역

- 실제 `랭킹기록` row 수
- 실제 `기록저장` row 수
- `랭킹기록_600분초과백업`, `랭킹기록_맞춤법노힌트백업`의 실제 포함 여부
- `MAX_RANKING_ELAPSED_SECONDS` 상수 위치와 값
- 랭킹 관련 타이틀 지급 조건 전체
- 랭킹 메시지 검열/저장 정책 상세
- Firebase import 스크립트 구현
- Firestore index 필요 여부
- public UI에서 Firestore 랭킹을 읽는 방식

## 정찰 한계

- 이번 단계는 키워드 기반 함수 주변만 확인했다.
- 실제 시트 데이터 조회, row 수 조사, export/import는 수행하지 않았다.
- `index.html`은 저장/조회 호출 위치 확인에 필요한 검색 결과와 관련 함수명만 확인했고 전체 파일은 읽지 않았다.
