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
