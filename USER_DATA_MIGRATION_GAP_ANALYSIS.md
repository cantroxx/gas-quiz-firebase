# 사용자 데이터 이관 gap 분석

## 1. 목적

운영본 `gas-quiz`의 회원/프로필/자산 데이터가 Firebase 실험본 `gas-quiz-firebase`로 얼마나 이관되었는지 점검한다.

이 문서는 분석 전용이다. 운영본 `gas-quiz` 데이터는 수정하지 않았고, Firebase 쓰기/import도 실행하지 않았다.

## 2. 분석 기준

확인한 운영본 파일:

- `~/Projects/gas-quiz/Code.js`
- `~/Projects/gas-quiz/index.html`
- `~/Projects/gas-quiz/CLAUDE.md`

확인한 Firebase 실험본 파일:

- `~/Projects/gas-quiz-firebase/scripts/import-members-from-json.js`
- `~/Projects/gas-quiz-firebase/MEMBER_MIGRATION_PLAN.md`
- `~/Projects/gas-quiz-firebase/MEMBER_MIGRATION_SAMPLE.json`
- `~/Projects/gas-quiz-firebase/PROTOTYPE_STATUS.md`

## 3. 현재 운영본 사용자 데이터 목록

### `회원정보`

운영본 `회원정보` 시트는 코드 기준 14개 컬럼을 사용한다.

| 항목 | 운영본 위치 | Firebase 이관 상태 |
| --- | --- | --- |
| userId | `회원정보` 1열 | 이관 완료 |
| 학년 | `회원정보` 2열 | 이관 완료 |
| 반 | `회원정보` 3열 | 이관 완료 |
| 번호 | `회원정보` 4열 | 이관 완료 |
| 닉네임 | `회원정보` 5열 | 이관 완료 |
| 프로필 이미지 URL | `회원정보` 6열 | users 필드로 이관 |
| 생성일시 | `회원정보` 7열 | users 필드로 이관 |
| 최근 로그인/수정 일시 | `회원정보` 8열 | users `updatedAt` 성격으로 이관 |
| 비밀번호 | `회원정보` 9열 | 의도적으로 미이관 |
| 학교 | `회원정보` 10열 | 이관 완료 |
| 선택타이틀 | `회원정보` 11열 | users `selectedTitleId`로 이관 |
| 랭킹한마디 | `회원정보` 12열 | users `rankingMessage`로 이관 |
| role | `회원정보` 13열 | 이관 완료 |
| status | `회원정보` 14열 | 이관 완료 |

### 프로필 관련 값

- `profileImageUrl`: 회원정보에 저장된다.
- 프로필 직접 업로드 기능은 운영본 코드에 있지만 `ENABLE_PROFILE_IMAGE_UPLOAD = false` 상태다.
- `rankingMessage`: 랭킹 1~3등 단상과 랭킹 카드에 표시되는 한마디다.
- `selectedTitleId`: 대표 타이틀 선택값이며, 타이틀 정의/보유 목록과 함께 해석된다.

### 타이틀 관련 값

운영본에는 두 종류의 타이틀 데이터가 있다.

- `회원정보.selectedTitleId`: 사용자가 현재 선택한 대표 타이틀
- `타이틀현황`: 사용자가 획득한 타이틀 목록

`타이틀현황` 헤더:

```text
userId, titleId, titleName, theme, tier, effect, sourceType, sourceCategory, sourceGroup, acquiredAt, updatedAt
```

현재 Firebase에는 대표 타이틀 ID만 users 문서에 들어와 있고, 보유 타이틀 전체 목록은 별도 컬렉션으로 이관되지 않았다.

### 뱃지 관련 값

운영본에는 독립된 단일 `뱃지` 시트보다, 연습기록과 포켓몬연습기록을 기반으로 뱃지 요약을 계산하는 구조가 강하다.

관련 운영본 구조:

- `연습기록`
- `포켓몬연습기록`
- `buildMyRoomBadgeSummary_(userId)`
- `getPracticeBadgeProgress(userId)`
- `makeMyRoomBadgeSummaryItem_()`

뱃지 요약에는 다음 성격의 값이 포함된다.

- badge id
- label
- group
- correct
- total
- starCount
- completed
- progressPercent
- available

현재 Firebase에는 운영본 뱃지 산출 원본인 연습기록/포켓몬연습기록이 이관되지 않았고, 보유 뱃지 컬렉션도 없다.

### 내 집 꾸미기 관련 값

운영본 `내집설정` 시트 헤더:

```text
userId, 배경ID, 아바타ID, 대표뱃지ID, 대표칭호ID, 수정일시
```

운영본 기본값:

- `backgroundId`: `bg_room_basic`
- `avatarId`: `avatar_basic`
- `featuredBadgeId`: 빈 값 또는 추천 뱃지
- `featuredTitleId`: `title_beginner`

운영본 꾸미기 옵션:

- backgrounds: `bg_room_basic`, `bg_forest`, `bg_classroom`, `bg_stage`, `bg_space`
- avatars: `avatar_basic`, `avatar_cat`, `avatar_dog`, `avatar_star`, `avatar_robot`
- titles: `title_beginner`, `title_pokemon`, `title_spelling`, `title_math`, `title_ranking`, `title_allrounder`, `title_reading_gmo`, `title_word_master`, `title_korean_mania`, `title_math_mania`, `title_social_mania`

현재 Firebase에는 새 프로토타입의 `userRoomSettings/{memberUserId}`가 있지만, 운영본 `내집설정` 시트 값은 아직 이관되지 않았다.

### 기타 사용자 자산/기록

운영본 코드상 사용자 상태와 연결되는 추가 데이터:

- `집좋아요기록`: 방문한 집 하트 기록
- `닉네임이력`: 닉네임 변경 이력
- `회원상태변경로그`: active/inactive 변경 로그
- `회원삭제로그`: 삭제 로그
- `연습기록`: 연습전 완주/별/정답 기록
- `포켓몬연습기록`: 포켓몬 연습/뱃지 원본
- `랭킹기록`, `기록저장`: 랭킹/기록 데이터
- `일일이용기록`: 일일 사용량/교육 정답 카운트

이 항목들은 현재 Firebase `users` import 범위 밖이다.

## 4. Firebase 이관 완료 데이터

현재 Firebase `users/{memberUserId}`에 이관된 항목:

- `userId`
- `legacyMemberId`
- `school`
- `grade`
- `classNumber`
- `studentNumber`
- `name`
- `nickname`
- `role`
- `active`
- `status`
- `passwordMode`
- `initialPasswordChanged`
- `profileImageUrl`
- `selectedTitleId`
- `rankingMessage`
- `createdAt`
- `updatedAt`
- `migratedAt`

이관 후 추가된 연결 항목:

- `authUid`
- `authLinkedAt`
- `authLinkProvider`
- `authLinkVersion`

현재 Firebase 실험본에서 새로 생성되는 항목:

- `userEconomy/{memberUserId}`
- `userInventory/{memberUserId}/items`
- `userRoomSettings/{memberUserId}`
- `purchaseLogs`

단, 위 경제/상점/내 집 데이터는 Firebase 프로토타입에서 새로 생긴 데이터이며 운영본의 기존 자산을 그대로 옮긴 것은 아니다.

## 5. Firebase 미이관 데이터

운영본 대비 아직 Firebase로 넘어오지 않은 주요 항목:

- 보유 타이틀 전체 목록: `타이틀현황`
- 뱃지 원본/요약: `연습기록`, `포켓몬연습기록` 기반
- 운영본 내 집 설정: `내집설정`
- 집 좋아요 기록: `집좋아요기록`
- 닉네임 변경 이력: `닉네임이력`
- 랭킹 기록: `랭킹기록`, `기록저장`
- 일일 이용 기록: `일일이용기록`
- 회원 상태 변경/삭제 로그
- 운영본 프로필 이미지 파일 자체
- 운영본 내 집 꾸미기 option catalog와 Firebase `shopItems`/`assetCatalog` 간 매핑

## 6. 별도 컬렉션으로 설계해야 하는 항목

권장 Firestore 컬렉션:

| 운영본 데이터 | 권장 컬렉션 | 이유 |
| --- | --- | --- |
| `타이틀현황` | `userTitles/{memberUserId}/items/{titleId}` | 보유 타이틀은 다건 목록이며 users 문서에 배열로 넣기보다 하위 컬렉션이 안전 |
| 뱃지 요약 | `userBadges/{memberUserId}/items/{badgeId}` | 뱃지는 연습기록에서 파생되지만 표시/검색을 위해 materialized view 필요 |
| 연습기록 | `practiceRecords` 또는 `users/{memberUserId}/practiceRecords` | 뱃지/타이틀 산출 원본 |
| 포켓몬연습기록 | `pokemonPracticeRecords` | 세대별 뱃지 산출 원본 |
| 내집설정 | `userRoomSettings/{memberUserId}` | 이미 Firebase 프로토타입 경로가 있음. 운영본 필드 매핑 필요 |
| 집좋아요기록 | `roomLikes` | from/to/date 기준 조회가 필요 |
| 닉네임이력 | `nicknameLogs` | 감사 로그 성격 |
| 랭킹기록 | `rankingRecords` | 랭킹 계산/표시 원본 |
| 일일이용기록 | `dailyUsage` | 제한/해금 정책 원본 |
| 프로필 이미지 | `assetCatalog` + Firebase Storage | URL/Storage path/소유자 관리 필요 |

## 7. 데이터 손실 위험 항목

### 높음

- `타이틀현황`
  - 대표 타이틀 하나만 Firebase users에 들어왔고, 보유 타이틀 전체 목록은 미이관이다.
  - Firebase 전환 시 학생이 획득한 타이틀이 사라진 것처럼 보일 수 있다.

- 뱃지/연습기록
  - 운영본 뱃지는 연습기록 기반으로 계산된다.
  - 연습기록 없이 Firebase로 전환하면 보유 뱃지, 추천 대표뱃지, 내 집 대표뱃지가 복원되지 않는다.

- `내집설정`
  - 운영본 배경/아바타/대표뱃지/대표칭호 설정은 아직 Firebase `userRoomSettings`로 이관되지 않았다.
  - Firebase 프로토타입의 상점 아이템 ID와 운영본 내 집 ID 체계가 다르다.

### 중간

- `rankingMessage`
  - users에 이관되었으나 실제 랭킹 기록과 결합되는 화면은 아직 Firebase에 없다.

- `profileImageUrl`
  - users에 문자열은 이관되었으나, Drive URL/표시 URL/Storage 이전 정책은 확정 전이다.

- 집 좋아요 기록
  - 사용자 경험에는 보이지만 핵심 로그인에는 직접 영향이 적다.

### 낮음

- 닉네임 이력, 상태 변경 로그, 삭제 로그
  - 감사/운영 자료로 중요하지만 학생이 즉시 보는 프로필 자산은 아니다.

## 8. 현재 users 문서 기준 이관 비율 평가

현재 Firebase `users` 문서 하나를 기준으로 보면, 운영본 `회원정보` 14개 컬럼 중 비밀번호를 제외한 핵심 프로필 컬럼은 대부분 이관됐다.

대략 평가:

- 회원 기본 식별/로그인 연결 준비: 약 85%
- 프로필 표시 기본값: 약 70%
- 사용자 자산 전체 기준: 약 35%
- Firebase 전환 전체 준비도: 약 45%

계산 근거:

- `회원정보` 단일 시트 기준으로는 `userId`, 학교/학년/반/번호, 닉네임, 프로필 이미지 URL, 선택타이틀, 랭킹한마디, role/status가 넘어왔다.
- 그러나 사용자 경험에서 중요한 보유 타이틀 전체 목록, 뱃지, 내 집 설정, 랭킹/연습기록, 좋아요 기록은 아직 미이관이다.
- 따라서 "회원 문서 하나"만 보면 절반 이상 이관됐지만, "운영본 사용자 자산 전체" 기준으로는 아직 절반 미만이다.

## 9. 배포 시 위험도

현재 상태로 Firebase를 새 사이트로 배포할 경우:

- 로그인/회원 식별 테스트는 가능하다.
- 상점/경제/내 집 프로토타입은 Firebase 신규 데이터 기준으로 동작한다.
- 하지만 운영본에서 학생이 이미 획득한 타이틀/뱃지/내 집 설정은 대부분 보이지 않는다.
- 학생 입장에서는 기존 업적이 사라진 것처럼 느낄 위험이 높다.
- 운영본 랭킹/연습기록이 연결되지 않아 기존 성취 기반 화면의 신뢰도가 낮다.

위험도: 높음

배포는 가능하더라도 "운영본 계정 데이터 완전 전환"으로 안내하면 안 된다. 현재는 회원 연결과 신규 Firebase 프로토타입 검증 단계로 봐야 한다.

## 10. 추천 이관 순서

1. 운영본 `타이틀현황` 이관
   - `userTitles/{memberUserId}/items/{titleId}` 설계
   - users의 `selectedTitleId`가 실제 보유 타이틀인지 검증

2. 연습기록/포켓몬연습기록 기반 뱃지 이관
   - 원본 기록을 먼저 옮길지, 뱃지 요약을 materialized collection으로 옮길지 결정
   - `userBadges` 설계

3. 운영본 `내집설정` 이관
   - 운영본 ID와 Firebase 상점/asset ID 매핑표 작성
   - `bg_room_basic` 등 운영본 ID를 Firebase `userRoomSettings` 또는 `userInventory`와 어떻게 연결할지 결정

4. 프로필 이미지 이전 정책 확정
   - 기존 URL 유지
   - Drive URL 표시 변환 유지
   - Firebase Storage로 복사
   - 세 방식 중 하나 선택

5. 랭킹/연습 원본 기록 이관
   - 랭킹 화면과 뱃지/타이틀 재계산의 원본이므로 schema를 별도로 설계

6. 집 좋아요/닉네임 이력/운영 로그 이관
   - 운영 자료와 보조 사용자 경험 복원용

## 11. 결론

Firebase에는 운영본 회원 148명의 기본 프로필과 대표 표시값 일부가 이관되었다. 하지만 사용자 자산이라고 볼 수 있는 보유 타이틀, 뱃지, 운영본 내 집 설정, 랭킹/연습기록은 아직 대부분 Firebase에 없다.

다음 단계는 `타이틀현황`과 뱃지 산출 원본을 먼저 설계/이관하는 것이다. 이 두 항목이 빠진 상태에서 Firebase를 새 사이트로 공개하면 기존 학생 성취가 사라진 것처럼 보일 가능성이 가장 크다.
