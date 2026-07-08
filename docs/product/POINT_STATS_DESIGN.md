# 포인트 흐름 통계 설계안 (C-8)

## 목적

교실 포인트의 일별/월별 지급·사용 흐름을 교사가 한눈에 보는 통계 화면을 설계한다. 코드 구현 전 설계 문서다.

기준일: 2026-07-08 / 참조: docs/product/grownd-classroom-ui-scan.md (은행/경제 축 — teacher: economy dashboard)

## 데이터: 기존 pointLogs 재활용 (새 컬렉션 불필요)

- `classrooms/{classId}/pointLogs/{logId}`가 이미 모든 지급/사용을 기록한다:
  - `type` (quest/routine/shop/job/exchange 등 소스별 문자열), `memberUserId`, `rewardAmount`(지급 +, 사용 −), `rewardPoint`, `createdAt`, `source` 등
- 규모 추정: 학생 22명 기준 월 수백~수천 건 → **사전 집계 컬렉션 없이 조회 시 집계로 충분**하다.
- 사전 집계(`dailyPointStats`) 컬렉션은 로그가 월 1만 건을 넘기 전에는 만들지 않는다 (쓰기 경로 전부에 집계 갱신을 끼워 넣는 비용이 더 크다).

## callable / 권한 (1종 신설)

| callable | 권한 | 동작 |
|---|---|---|
| `getClassroomPointStats` | assertAdminCanManageClassroom | `{classId, fromDate, toDate}`(KST, 최대 62일)를 받아 pointLogs를 `createdAt` 범위로 조회(limit 5000) 후 서버에서 집계해 반환 |

응답 형태:

```
{
  days: [{ dateKey, earned, spent, count }],          // 일별 합계
  byType: [{ type, earned, spent, count }],           // 소스별 합계
  byStudent: [{ memberUserId, memberNickname, earned, spent }],  // 학생별 합계
  totals: { earned, spent, net }
}
```

- 월별 뷰는 프론트가 `days`를 월 단위로 접어서 만든다 (서버 granularity 파라미터 불필요).
- 학생별 합계는 숨김 학생 포함(교사용 처리·집계 화면 정책), 닉네임은 users 문서에서 매핑.

## 인덱스 필요 여부

- 서브컬렉션 안에서 `createdAt` 범위 조회 + orderBy(createdAt)만 사용 → **단일 필드 자동 인덱스로 충분, firestore.indexes.json 변경 불필요.**
- collectionGroup 조회는 쓰지 않는다 (쓰면 인덱스가 필요해지고 수정 금지 대상이다).
- `where type == X` 같은 복합 조건은 서버 메모리 필터로 처리한다.

## rules 변경 여부

- **불필요.** `pointLogs`는 rules에 match가 없어 기본 거부이며, 조회는 관리자 callable(Admin SDK)로만 한다. 학생 노출 경로 없음.

## 화면 구성

- 위치: 교실 **은행/경제 탭**(grownd의 teacher economy dashboard 축). '처리할 일' 탭에는 이미 요약 카드가 많아 넣지 않는다.
- 교사 뷰 전용(canManage 분기 — 성장루틴 보드와 같은 패턴). 학생 뷰 무변경.
- 요소:
  1. 기간 선택 칩: 이번 주 / 이번 달 / 지난 달 (커스텀 기간은 2차)
  2. 요약 카드 3장: 총 지급 / 총 사용 / 순증감
  3. 일별 막대 그래프: 지급(+)·사용(−) 2색 막대 — 외부 차트 라이브러리 없이 CSS 막대(기존 classroom-progress-meter 패턴 확장)로 구현
  4. 소스별 표: type 한글 라벨 매핑(퀘스트/성장루틴/상점/직업/환전 등) + 건수·합계
  5. 학생별 표: 지급·사용 상위 정렬, 기존 classroom-review-table 스타일 재사용
- 관리자센터가 아닌 교실 화면에 두는 이유: 데이터가 학급(classId) 단위이고, 담임의 일상 확인 동선이 교실 탭이기 때문.

## 구현 순서 제안 (프롬프트 단위)

1. **[서버]** `getClassroomPointStats` callable + 집계 로직 + type 라벨 목록 정리 (functions만)
2. **[프론트]** 은행/경제 탭 통계 섹션 UI (기간 칩 + 요약 카드 + CSS 막대 + 표 2개)
3. **[선택 2차]** 커스텀 기간 선택, CSV 내보내기, 로그 급증 시 사전 집계 컬렉션 전환 검토
