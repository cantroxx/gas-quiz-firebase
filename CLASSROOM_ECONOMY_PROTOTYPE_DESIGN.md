# 우리 교실/학급경제 프로토타입 설계

## 1. 목표

DJ48 퀴즈타운에 `우리 교실`을 추가해 퀴즈, 학급화폐, 교실 운영을 연결하는 1차 프로토타입을 만든다.

핵심 목표는 다음과 같다.

- 타운 중앙에서 `우리 교실`로 진입한다.
- 4학년 8반을 기준으로 먼저 검증한다.
- 교실 안에서 `퀘스트`와 `성장루틴`의 사용감을 확인한다.
- 궁극적으로 퀴즈 풀이 결과가 DJ코인, 퀘스트, 학급 미션으로 이어지게 한다.

## 2. 현재 프로토타입 범위

현재 단계는 화면 흐름과 운영 감각을 확인하면서, 체크형 퀘스트 1개만 실제 저장 후보로 연결하는 단계다.

포함한다.

- 타운 지도 중앙 건물에 `우리 교실` 진입점 추가
- 모바일 지도 버튼에도 `우리 교실` 추가
- 4학년 8반 전용 교실 입장 화면
- 교실 비밀번호 입력 후 입장
- `classrooms/G4-C8` 설정 문서가 있으면 Firestore 설정 우선 사용
- Firestore 설정 문서가 없으면 프로토타입 상수 fallback 사용
- 교실 내부 화면
- 담임 관리 영역/학생 수행 영역 안내
- 담임 권한 사용자에게 완료 후보 목록 표시
- 담임 승인/반려 상태 저장
- 관리자 센터 상단에서 타운으로 이동
- 관리자 센터 안의 `우리 교실 관리` 섹션에서 완료 후보 승인/반려
- 퀘스트 탭
- 성장루틴 탭
- 퀘스트/성장루틴 카드 표시
- 체크형 퀘스트 `desk-check` 자동 지급
- 담임 권한 사용자의 퀘스트 생성
- 교사가 퀘스트 이름, 설명, 지급 코인, 보상 방식을 설정

포함하지 않는다.

- 실제 담임 권한 저장/검증
- 실제 교실 비밀번호 hash 검증
- 실제 퀴즈 결과와 교실 퀘스트 연동
- 교사용 기존 퀘스트 수정/비활성화 UI
- 성장루틴 실제 저장/체크 기능

주의:

- 현재 담임 권한 표시는 기존 `classAdmin` 프로필 필드를 프론트에서 확인한다.
- Firestore rules는 관리자 custom claim을 기준으로 승인/반려 쓰기를 허용한다.
- 학년/반 scope의 서버 강제 검증은 다음 단계에서 Cloud Function으로 보강하는 것이 안전하다.
- 관리자 계정은 관리자 센터에서 `타운으로 가기` 또는 `우리 교실 관리` 두 경로로 교실 흐름을 확인할 수 있다.
- 현재 교사용 퀘스트 UI는 생성 중심이다. 기존 퀘스트 수정/비활성화는 다음 단계에서 별도 관리 UI로 확장한다.

## 3. 권한 설계 방향

담임 권한은 기존 관리자 구조를 확장한다.

권장 필드:

```js
users/{memberUserId}
{
  role: "admin",
  adminLevel: "classTeacher",
  adminScopeGrade: "4",
  adminScopeClassNumber: "8"
}
```

기존 `classAdmin` 구조가 이미 있으므로 실제 구현 시에는 내부 권한은 기존 구조를 재사용하고, UI 표기만 `담임`으로 바꾸는 방식을 우선 검토한다.

권한 원칙:

- 슈퍼관리자는 모든 교실 접근 가능
- 담임은 지정 학년/반만 관리 가능
- 학생은 자기 학년/반 교실만 접근 가능
- 비밀번호는 학생용 입장 UX이며, 실제 보안은 Cloud Functions/Rules에서 처리

## 4. 교실 입장 구조

현재 fallback 설정:

```js
classroomPrototype = {
  classId: "G4-C8",
  grade: "4",
  classNumber: "8",
  name: "4학년 8반",
  entryCode: "4822",
  teacherName: "담임 설정 예정",
  teacherScope: "4학년 8반"
}
```

클라이언트는 `classrooms/G4-C8`을 먼저 읽고, 문서가 없거나 읽기 실패 시 위 fallback 설정을 사용한다.

운영화 단계에서는 `verifyClassroomEntryCode` callable function을 추가해 서버에서 검증한다.

## 5. 퀘스트 구조

퀘스트는 두 종류로 나눈다.

보상 처리 방식은 세 가지로 구분한다.

```js
rewardMode: "auto" | "teacherReview" | "quizAchieved"
```

- `auto`: 학생이 완료를 누르면 즉시 DJ코인 지급
- `teacherReview`: 학생이 완료 후보를 저장하고 담임 승인 후 지급
- `quizAchieved`: 교실 전용 퀴즈 결과 조건을 만족하면 자동 지급

### 수락형 퀘스트

학생이 수락하고 직접 체크하는 퀘스트다.

하위 타입:

- 체크형: 완료 버튼 1개
- 리스트형: 여러 항목을 체크

예시:

- 독서 10분 하기
- 오늘 책상 정리하기
- 친구에게 고마운 말 하기

### 달성형 퀘스트

퀴즈 또는 학습 데이터와 자동 연동되는 퀘스트다.

예시:

- 국어 미니퀴즈 10문제 완료
- 사회 퀴즈 5문제 맞히기
- 수학 연습 1회 완료

교실 전용 미니퀴즈는 랭킹에 반영하지 않는다. 기존 퀴즈 엔진을 재사용하되 저장 경로는 `classroomQuestProgress`로 분리한다.

## 6. 성장루틴 구조

성장루틴은 학생이 자기 목표를 세우고, 반복 달성하면 DJ코인을 받는 구조다.

1차 권장 규칙:

- 학생당 활성 루틴 최대 3개
- 하루 체크 1회
- 3일 연속 달성 시 소액 보상
- 7일 달성 시 추가 보상
- 하루 루틴 보상 상한 적용

예상 데이터:

```js
classroomRoutines/{routineId}
{
  classId: "G4-C8",
  memberUserId: "G4-C8-N05",
  title: "매일 독서 10분",
  targetType: "dailyCheck",
  targetCount: 7,
  rewardCoin: 10,
  status: "active"
}
```

## 7. Firestore 후보 구조

운영화 시 후보 구조:

```txt
classrooms/{classId}
classrooms/{classId}/quests/{questId}
classrooms/{classId}/questProgress/{memberUserId__questId}
classrooms/{classId}/routines/{routineId}
classrooms/{classId}/routineLogs/{memberUserId__routineId__date}
classroomEntrySessions/{memberUserId__classId}
```

보상은 기존 구조를 재사용한다.

```txt
userEconomy/{memberUserId}
rewardLogs/{dedupeKey}
```

현재 실제 저장 연결:

```txt
classrooms/G4-C8/questProgress/{memberUserId__questId__dateKey__attemptKey}
```

저장 예시:

```js
{
  recordId: "G4-C8-N05__desk-check__2026-06-11__1718080000000_ab12cd34",
  classId: "G4-C8",
  questId: "desk-check",
  questType: "수락형 · 체크형",
  rewardMode: "auto",
  memberUserId: "G4-C8-N05",
  userId: "G4-C8-N05",
  checked: true,
  status: "completed",
  rewardCoin: 5,
  rewardStatus: "paid",
  dateKey: "2026-06-11",
  source: "classroom_auto_quest_function",
  version: 2
}
```

`desk-check`는 Cloud Function `completeClassroomAutoQuest`에서 `questProgress`, `userEconomy`, `rewardLogs`를 트랜잭션으로 함께 처리한다.
자동 지급형은 같은 날짜에도 여러 번 완료할 수 있다. 각 완료는 별도 `attemptKey`로 기록된다.

담임이 생성한 퀘스트는 Cloud Function `saveClassroomQuest`가 `classrooms/G4-C8.quests` 배열에 저장한다.
퀘스트 옵션:

```js
{
  id: "class-quest-...",
  title: "책상 정리 1회",
  desc: "수업 후 책상과 주변 정리",
  rewardMode: "auto" | "teacherReview" | "quizAchieved",
  rewardCoin: 5,
  active: true,
  saveEnabled: true
}
```

담임 승인/반려 시 추가되는 필드:

```js
{
  rewardStatus: "approved" | "rejected",
  reviewedBy: "G4-C8-N22",
  reviewedAt: serverTimestamp()
}
```

## 8. 1차 화면 구성

타운:

- 중앙 건물 `우리 교실`
- 모바일 버튼 `우리 교실`

입장 화면:

- `4학년 8반 우리 교실`
- 비밀번호 입력
- 입장 버튼
- 현재는 프로토타입 안내 표시

교실 화면:

- 상단 교실 이름
- DJ코인/퀘스트/성장루틴 요약
- 담임 관리 영역
- 학생 수행 영역
- 탭: `퀘스트`, `성장루틴`
- 퀘스트 카드
- 성장루틴 카드
- 체크형 퀘스트 1개 완료 후보 저장 버튼
- `desk-check` 완료 시 즉시 DJ코인 지급
- 담임 권한 사용자의 퀘스트 생성 폼
- 담임 권한 사용자에게 `담임 확인 대기` 목록 표시
- 승인/반려 버튼
- 관리자 센터:
  - 상단 `타운으로 가기`
  - `우리 교실 관리` 섹션
  - 완료 후보 목록 새로고침
  - 교실 화면으로 이동

## 9. 다음 단계

현재 프로토타입 검증 후 다음 순서로 확장한다.

1. `classrooms/G4-C8` 운영 설정 seed
2. Cloud Function 기반 교실 입장 코드 검증
3. 담임 권한 scope 서버 검증
4. 퀘스트 수정/비활성화 화면 추가
5. 승인 완료 퀘스트 DJ코인 지급
6. 교실 전용 미니퀴즈 모드 추가
7. 성장루틴은 별도 기획 확정 후 구현

## 10. 그라운드식 교실 경제 확장 방향

그라운드 분석에서 확인한 핵심 축은 `퀘스트`, `젬스톤`, `뱃지`, `직업`, `마켓`이다.
DJ48에서는 기존 퀴즈타운 기능을 유지하면서, `우리 교실` 내부에 학급 운영용 경제를 별도 축으로 붙인다.

확장 원칙:

- 기존 퀴즈/랭킹/전역 상점/내 방 구조는 변경하지 않는다.
- 교실 경제는 `classrooms/{classId}` 하위 구조를 중심으로 분리한다.
- 보상 지급, 급여 지급, 화폐 교환은 클라이언트 직접 쓰기가 아니라 Cloud Function 트랜잭션으로 처리한다.
- 4학년 8반 `G4-C8`에서 먼저 검증한 뒤 다른 반으로 확장한다.
- 성장루틴은 별도 기획이 확정될 때까지 이번 확장 범위에서 제외한다.

## 11. 화폐 구조: DJ코인과 베리

교실 경제는 `베리`를 별도 화폐로 두는 방향을 우선 권장한다.

이유:

- DJ코인은 퀴즈타운 전체 상점, 내 방, 아바타 등 전역 보상과 연결되어 있다.
- 교실 퀘스트, 직업 급여, 교실 쿠폰 구매까지 DJ코인을 직접 사용하면 전역 상점 가격과 교실 운영 가격이 서로 영향을 준다.
- 교사가 학급별로 경제 규모를 조정하려면 교실 전용 화폐가 더 안전하다.

권장 구조:

```txt
classrooms/{classId}/studentWallets/{memberUserId}
classrooms/{classId}/berryLogs/{logId}
```

예상 필드:

```js
studentWallets/{memberUserId} {
  memberUserId: "G4-C8-N05",
  classId: "G4-C8",
  berry: 120,
  totalEarnedBerry: 300,
  totalSpentBerry: 180,
  updatedAt: serverTimestamp()
}
```

DJ코인 교환은 교사가 설정한 비율로 제한적으로 운영한다.

```js
classrooms/{classId} {
  currencySettings: {
    berryEnabled: true,
    exchangeEnabled: true,
    berryToCoinRate: 10,
    weeklyExchangeLimitCoin: 50,
    teacherApprovalRequired: true
  }
}
```

## 12. 젬스톤 구조

젬스톤은 화폐가 아니라 특정 활동의 누적 성취 트랙이다.
교사가 퀘스트를 만들 때 특정 젬과 연결하면, 학생이 퀘스트를 완료할 때 젬 경험치가 쌓인다.

예시:

- 교사: `일기 제출` 퀘스트 생성
- 연결 젬: `일기젬`
- 학생이 퀘스트 완료: `일기젬 xp +1`
- `10xp` 달성: `일기젬` 획득
- 획득 보상: `베리 30`

권장 구조:

```txt
classrooms/{classId}/gemTracks/{gemId}
classrooms/{classId}/studentGemProgress/{memberUserId__gemId}
classrooms/{classId}/gemAwards/{awardId}
```

예상 필드:

```js
gemTracks/{gemId} {
  name: "일기젬",
  description: "일기 제출 퀘스트를 꾸준히 완료하면 얻는 젬",
  linkedQuestIds: ["diary-submit"],
  xpThreshold: 10,
  rewardCurrency: "berry",
  rewardAmount: 30,
  icon: "gem",
  color: "#7cddff",
  active: true
}
```

## 13. 뱃지 구조

뱃지는 젬스톤과 다르게 월간 또는 기간제 기록을 스캔해 지급하는 상품이다.
교사가 캠페인을 만들고, 정해진 기간의 퀘스트 완료 수나 젬 경험치를 기준으로 수상자를 계산한다.

예시:

- `5월의 일기왕`
- 기간: 2026-05-01 ~ 2026-05-31
- 기준: `일기 제출` 퀘스트 완료 수 또는 `일기젬 xp`
- 지급 대상: 1명 또는 top N
- 학생은 보유 뱃지 중 하나를 대표 뱃지로 선택
- 교실 학생 카드 우측 하단에 대표 뱃지 표시

권장 구조:

```txt
classrooms/{classId}/badgeCampaigns/{badgeId}
classrooms/{classId}/studentBadges/{memberUserId__badgeId}
classrooms/{classId}/studentProfiles/{memberUserId}
```

예상 필드:

```js
badgeCampaigns/{badgeId} {
  title: "5월의 일기왕",
  metric: "questCompletionCount",
  targetQuestIds: ["diary-submit"],
  periodStart: "2026-05-01",
  periodEnd: "2026-05-31",
  awardPolicy: "topN",
  awardLimit: 1,
  icon: "book",
  color: "#ffcf5a",
  status: "draft" | "active" | "awarded"
}
```

## 14. 직업 구조

직업은 교사가 역할과 급여를 만들고, 학생이 지원하면 교사가 배정하는 구조로 운영한다.
학생은 직업에 배정된 상태에서는 다른 직업에 지원하거나 기존 지원을 수정할 수 없게 한다.

권장 흐름:

1. 교사가 직업 생성
2. 학생이 직업 지원
3. 교사가 지원자 중 배정
4. 배정 상태 유지
5. 주 1회 급여 지급 또는 학생 수령
6. 교사가 배정 해제하면 학생이 다시 지원 가능

권장 구조:

```txt
classrooms/{classId}/jobs/{jobId}
classrooms/{classId}/jobApplications/{applicationId}
classrooms/{classId}/jobAssignments/{memberUserId}
classrooms/{classId}/jobSalaryLogs/{memberUserId__jobId__weekKey}
```

예상 필드:

```js
jobs/{jobId} {
  title: "도서 관리",
  description: "학급 도서를 정리하고 대출 상태를 확인합니다.",
  salaryBerry: 50,
  payPeriod: "weekly",
  active: true
}
```

## 15. 교실 상점 구조

교실 상점은 퀴즈타운 전역 상점과 분리한다.
같은 `상점`이라는 이름을 쓰더라도, 실제 데이터와 구매 내역은 `classrooms/{classId}` 하위에 둔다.

운영 예시:

- 장난감 가져오기
- 물건 판매권
- 숙제 면제권
- 1일 DJ권

권장 구조:

```txt
classrooms/{classId}/shopItems/{itemId}
classrooms/{classId}/shopPurchases/{purchaseId}
```

구매 상태:

```js
shopPurchases/{purchaseId} {
  memberUserId: "G4-C8-N05",
  itemId: "homework-pass",
  priceBerry: 100,
  status: "purchased" | "requested_use" | "used" | "cancelled",
  purchasedAt: serverTimestamp(),
  usedAt: null
}
```

## 16. 퀴즈타운 전체 레벨 시스템

교실 경제와 별개로, 퀴즈타운 전체 활동에 대한 전역 레벨 시스템을 둘 수 있다.

권장 방향:

- 퀴즈 풀이, 연습 진행, 랭킹전 완료, 이벤트 퀘스트 등에서 경험치 지급
- 레벨업 시 DJ코인 50 지급
- 레벨과 훈장은 전역 프로필/랭킹/내 방에서 표시 가능
- 경험치 지급은 반복 파밍 방지를 위해 일일 상한과 중복 제한을 적용

권장 구조:

```txt
userLevelSummary/{memberUserId}
levelXpLogs/{logId}
```

예상 필드:

```js
userLevelSummary/{memberUserId} {
  memberUserId: "G4-C8-N05",
  level: 7,
  xp: 35,
  totalXp: 635,
  medalId: "bronze-07",
  lastLevelRewardAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

주의:

- `크레이지 아케이드` 훈장 아이콘을 그대로 복제하거나 추출해 쓰는 것은 저작권/상표 리스크가 있다.
- 방향성은 참고하되, DJ48 전용의 자체 훈장 아이콘 세트를 제작해 사용한다.

## 17. 확장 구현 순서

1. 이 문서를 기준 설계로 고정한다.
2. `베리` 사용 여부와 DJ코인 교환 정책을 확정한다.
3. 교실 데이터 구조를 subcollection 중심으로 정리한다.
4. 젬스톤 MVP를 퀘스트 완료 흐름에 연결한다.
5. 학생 카드와 대표 뱃지 표시 UI를 만든다.
6. 월간 뱃지 캠페인 생성/스캔/지급을 구현한다.
7. 직업 생성/지원/배정/급여 지급을 구현한다.
8. 교실 상점 쿠폰 구매/사용 흐름을 구현한다.
9. 퀴즈타운 전체 레벨 시스템을 별도 작업으로 추가한다.

초기 구현에서는 `젬스톤 -> 학생 카드/뱃지 -> 직업 -> 교실 상점 -> 전역 레벨` 순서를 권장한다.
