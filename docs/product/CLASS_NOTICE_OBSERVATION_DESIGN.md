# 클래스 알림·관찰 기록 설계안 (C-7)

## 목적

교사→학생 공지(클래스 알림)를 이력·기간 관리가 되는 구조로 확장하고, 교사 전용 학생별 관찰 기록(메모)을 신설한다. 코드 구현 전 설계 문서다.

기준일: 2026-07-08 / 참조: docs/product/grownd-classroom-ui-scan.md (classroom home - class notice, 학생 관리 축)

## 1. 클래스 알림 (교사→학생 공지)

### 현재 상태

- `classrooms/{classId}/classNotices/current` 단일 문서에 `slots` 배열(고정 슬롯)로 이미 존재한다.
- 쓰기: `saveClassroomNotices` callable(assertAdminCanManageClassroom), 읽기: `getClassroomEconomyBoard` 응답에 포함되어 학생에게 전달된다.
- 한계: 이력이 없고, 게시 기간·고정(pin) 개념이 없다.

### 데이터 모델 (두 안)

**A안 — 슬롯 확장 (권장, 최소 변경)**
- 기존 `current.slots[]` 항목에 필드 추가: `startDate`, `endDate`(YYYY-MM-DD, 빈 값이면 상시), `pinned`(boolean), `createdAt`(millis)
- 장점: 기존 callable·폼·학생 표시 경로 그대로 재사용. 인덱스 불필요.
- 한계: 지난 공지 이력은 남지 않음 (초등 학급 공지 특성상 수용 가능)

**B안 — 이력 컬렉션 신설**
- `classrooms/{classId}/classNotices/{noticeId}` (autoId): `title, body(160자), pinned, startDate, endDate, createdBy, createdAt, active`
- `current` 문서는 호환용으로 유지. 조회는 `active == true` 필터 + limit.
- 장점: 이력 보존. 단점: callable 2개 신설 + 학생 조회 경로 수정 필요.

→ 1차 구현은 A안. 이력 요구가 생기면 B안으로 이관.

### callable / 권한

- A안: 기존 `saveClassroomNotices`(assertAdminCanManageClassroom) 유지, `normalizeClassroomNoticeSlots`에 새 필드 정규화 추가만.
- B안 시: `saveClassroomNoticeEntry` / `deleteClassroomNoticeEntry` — 모두 assertAdminCanManageClassroom (학급 단위 기능이므로 superAdmin 전용일 이유 없음).

### rules 변경 여부

- **불필요.** `classNotices`는 firestore.rules에 match가 없어 기본 거부 상태이고, 학생 전달은 `getClassroomEconomyBoard` callable(Admin SDK)이 담당한다. 지금 구조를 유지한다.

### 화면 구성

- 교사: 교실 **홈 탭**의 기존 클래스 알림 폼에 기간·고정 입력 추가 (grownd의 classroom home - class notice 위치와 동일)
- 학생: 홈 탭 상단 알림 카드에서 `pinned` 우선 + 기간 내 슬롯만 표시

## 2. 관찰 기록 (교사 전용 학생별 메모) — 민감 데이터

### 데이터 모델

- `classrooms/{classId}/observationNotes/{noteId}` (autoId)
  - `memberUserId` (대상 학생), `note` (500자 제한), `category` (`praise | guide | counsel | etc`)
  - `createdBy` (교사 memberUserId), `createdAt`, `updatedAt`, `deleted` (soft delete boolean)
- 학생 1명당 수십 건 수준. 학급 전체로도 수백~수천 건.

### 보안 검토 (필수 확인 사항)

- **학생이 읽을 수 없는 구조인가? → 그렇다.** firestore.rules는 rules_version 2 기본 거부라, `observationNotes`에 match 블록을 **추가하지 않는 한** 어떤 클라이언트도 직접 읽기/쓰기가 불가능하다. 모든 접근은 Admin SDK(callable)로만 이뤄진다.
- **rules 변경: 불필요 — 오히려 금지.** match를 추가하지 않는 것 자체가 안전장치다.
- 주의 1: `getClassroomEconomyBoard`처럼 **학생도 호출하는 callable 응답에 관찰 기록을 절대 포함하지 말 것.** canManage 분기에 섞지 말고 전용 callable로 분리한다.
- 주의 2: 관리자 callable은 `assertAdminCanManageClassroom`으로 담임/슈퍼관리자만 통과시킨다.

### callable / 권한 (3종 신설)

| callable | 권한 | 비고 |
|---|---|---|
| `saveClassroomObservationNote` | assertAdminCanManageClassroom | noteId 있으면 수정 |
| `listClassroomObservationNotes` | assertAdminCanManageClassroom | classId 전체 limit 조회 후 서버에서 학생 필터 |
| `deleteClassroomObservationNote` | assertAdminCanManageClassroom | soft delete (`deleted: true`) |

### 인덱스

- `where memberUserId == X orderBy createdAt desc`는 복합 인덱스가 필요하다. **firestore.indexes.json은 수정 금지 대상**이므로, 1차 구현은 인덱스가 필요 없는 방식으로 한다: 학급 전체를 limit(500)으로 읽고 서버에서 학생별 필터·정렬 (학급 규모상 충분). 데이터가 커지면 사용자 확인 후 인덱스 추가를 별도 결정.

### 화면 구성

- 위치: 교실 **처리할 일 탭** 하단(학생 관리 축) 또는 학생 카드 상세. grownd 벤치마크의 "학생 관리: member table + reports" 축을 따른다.
- 구조: **성장루틴 교사 검토 보드와 같은 패턴 재사용** — 학생 목록(좌) + 선택 학생 메모 목록(우) + 작성 폼(카테고리 선택 + 텍스트). 숨김 학생 포함(처리용 화면 정책).
- 학생 화면에는 어떤 형태로도 노출하지 않는다.

## 구현 순서 제안 (프롬프트 단위)

1. **[서버]** 관찰 기록 callable 3종 + 정규화/제한 로직 (functions만, UI 없음)
2. **[프론트]** 관찰 기록 교사 UI (학생 목록+메모 목록+작성 폼, 루틴 보드 패턴 재사용)
3. **[서버+프론트]** 클래스 알림 A안 확장 (슬롯에 기간·고정 + 홈 탭 폼/표시 수정)
