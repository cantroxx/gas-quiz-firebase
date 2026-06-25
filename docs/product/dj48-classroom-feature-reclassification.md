# DJ48 Classroom Feature Reclassification

## Purpose

Grownd UI scan을 기준으로 DJ48 교실 기능을 다시 분류한다. 이 문서는 구현 전 정보 구조를 확정하기 위한 2단계 분석 문서이며, 이후 UI 개편 작업의 기준으로 사용한다.

Source:

- `docs/product/grownd-classroom-ui-scan.md`
- `public/index.html`
- `public/js/features/classroom-render.js`

## Current DJ48 Structure Summary

현재 교실의 상단 탭은 다음과 같다.

- 대시보드
- 학생카드
- 젬스톤
- 직업
- 마켓
- 교사 작업대

학생용 표면은 일부 분리되어 있다.

- 학생카드 하위에 교실 퀘스트, 성장루틴, 학급 미션, 학급 은행이 있다.
- 젬스톤, 직업, 마켓은 별도 상단 탭으로 분리되어 있다.
- 대시보드는 오늘 할 일과 최근 활동을 보여준다.

하지만 교사용 생성/수정/삭제/설정 기능은 대부분 `교사 작업대` 안에 몰려 있다.

- 퀘스트 만들기
- 월간 키링 지급
- 학급 미션 설정
- 세금 프리셋
- 직업 만들기
- 상점 상품 만들기
- 공동구매 만들기
- 적금 상품 만들기
- 환전 은행 설정
- 젬스톤 만들기
- 학급 알림
- 검토 처리

## Diagnosis

현재 구조의 가장 큰 문제는 기능 분리가 아니라 역할 분리가 먼저 섞여 있다는 점이다.

잘 분리된 점:

- 학생이 보는 `젬스톤`, `직업`, `마켓` 탭은 이미 기능별로 나뉘어 있다.
- `대시보드`는 오늘 할 일과 최근 활동을 모으는 방향이 맞다.
- 교사용 `교사 작업대`에는 오늘 처리할 요약 카드가 있다.

문제점:

- `교사 작업대`가 오늘 처리할 일뿐 아니라 모든 기능의 생성/수정/삭제 폼을 포함한다.
- 학생 화면 안의 `학생카드` 하위 탭에 퀘스트, 루틴, 미션, 은행이 같이 들어 있어 기능 위계가 섞인다.
- 교사용 CRUD 위치와 학생용 참여 위치가 일관되지 않다.
- 은행/경제/직업/세금/포인트 요청이 한 경제 도메인으로 묶이지 않고 교사 작업대와 학생 하위 탭에 흩어진다.
- 성장루틴은 학생 개인 기능인데, 학생 하위 폼과 교사 검토가 한 구조 안에서 충분히 분리되지 않는다.
- 젬스톤은 별도 탭이 있으나 교사 생성 폼은 작업대에 있고, 학생별 진행도 관리 표면은 아직 약하다.

## Reclassification Principles

### Rule 1. 교사 작업대는 오늘 처리할 일만 담당한다

교사 작업대에 남길 수 있는 것:

- 검토 대기 퀘스트
- 성장루틴 마감 검토
- 상점/마켓 요청
- 직업 지원 요청
- 최근 교실 활동
- 비정상 상태 알림

교사 작업대에서 빼야 하는 것:

- 퀘스트 생성/수정/삭제
- 젬스톤 생성/수정/삭제
- 직업 생성/수정/삭제
- 상품 생성/수정/삭제
- 환전/적금/세금 설정
- 학급 미션 생성/수정/삭제
- 학급 알림 편집

### Rule 2. 학생 화면과 교사 화면은 같은 기능 안에서 다른 표면을 가진다

예:

- 퀘스트
  - 학생 표면: 오늘 할 퀘스트, 완료 상태, 완료 버튼
  - 교사 표면: 생성, 수정, 삭제, 노출, 검토
- 젬스톤
  - 학생 표면: 내 성장 단계, 다음 단계, 대표 키링
  - 교사 표면: 젬 설정, 연결 퀘스트, 학생별 진행도

### Rule 3. 데이터가 표 형태인 기능은 테이블을 우선한다

테이블 우선 기능:

- 포인트 요청
- 퀘스트 검토
- 성장루틴 검토
- 직업 지원
- 상점 사용 요청
- 학생 관리
- 학생별 젬스톤 진행도
- 학생별 포인트/코인 현황

카드 우선 기능:

- 학생 홈
- 학생 카드
- 학생 젬스톤
- 학생 직업
- 학생 마켓
- 학생 학급 미션
- 퀘스트 목록

### Rule 4. 학생 홈은 낮은 밀도로 유지한다

학생 홈에 노출할 것:

- 내 카드
- 오늘 할 일
- 내 포인트/코인
- 현재 직업
- 대표 젬/키링
- 학급 미션 진행률
- 최근 받은 보상

학생 홈에서 숨길 것:

- 교사용 설정 폼
- 전체 학생 관리 기능
- 장문의 설명
- 관리자용 상태 로그

### Rule 5. 기능별 페이지는 동일한 골격을 사용한다

교사용 기능 페이지 기본 골격:

- 페이지 제목
- 1문장 설명
- 요약 지표 카드
- 필터/검색/정렬/상태칩
- 주요 액션 버튼
- 카드 또는 테이블 목록
- 생성/수정 폼은 페이지 안의 관리 섹션 또는 모달

학생용 기능 페이지 기본 골격:

- 현재 내 상태
- 다음 행동 1개
- 진행률/보상
- 짧은 빈 상태
- 필요한 경우 모달

## Target Functional Groups

## 1. 홈

### Purpose

교실에 들어왔을 때 학생과 교사가 오늘 확인할 핵심만 보는 시작 화면.

### Student Surface

- 내 카드 요약
- 오늘 할 일
- 내 포인트/코인
- 내 직업
- 내 젬스톤 대표 상태
- 학급 미션 진행률

### Teacher Surface

- 학급 전체 요약
- 오늘 처리할 일 요약
- 최근 활동 10건
- 기능 바로가기

### Current DJ48 Mapping

Keep:

- `data-classroom-panel="today"`
- `renderClassroomTodayHome`
- `renderClassroomActivityFeed`
- `renderClassroomTeacherDashboard`

Move out:

- 전체 CRUD 폼
- 장기 설정 폼

### Navigation Label

`홈`

Current `대시보드`는 교사용 느낌이 강하므로 학생/교사 공용 시작점은 `홈`이 더 적합하다.

## 2. 학생카드

### Purpose

교실의 중심 무대. 학생 아바타, 번호, 이름, 레벨, 타이틀, 포인트, 코인, 대표 키링을 보여준다.

### Student Surface

- 내 카드 중심
- 주변 학생 카드 탐색은 선택 사항
- 직업/젬스톤/보유 아이템은 미니 드롭

### Teacher Surface

- 전체 학생 카드
- 포인트 조정
- 학생별 간단 상태 확인
- 단, 학생 삭제/비밀번호/숨김 같은 관리는 학생관리로 이동

### Current DJ48 Mapping

Keep:

- `data-classroom-subpane="student-card"`
- `renderClassroomStudentCards`

Move:

- 학생 관리성 기능은 새 `학생관리` 교사용 페이지로 이동

### Navigation Label

`학생카드`

## 3. 퀘스트

### Purpose

학생 활동과 보상을 연결하는 핵심 기능.

### Student Surface

- 오늘 퀘스트
- 완료 상태
- 완료 버튼
- 보상 표시
- 빈 상태: "오늘은 퀘스트가 없습니다."

### Teacher Surface

- 퀘스트 생성
- 퀘스트 수정
- 퀘스트 삭제
- 카테고리 관리
- 노출/비노출
- 반복 설정
- 대상 학생 선택
- 연결 젬 선택
- 완료 검토

### Current DJ48 Mapping

Move from teacher workbench:

- `#classroom-quest-editor-panel`

Keep but relocate:

- `#classroom-quest-grid`
- `#classroom-inactive-quest-grid`
- `renderClassroomQuestCards`
- `renderClassroomInactiveQuestCards`
- `renderClassroomReviewPanel` 중 퀘스트 검토 항목

### Target Page Structure

- 상단 요약:
  - 전체 퀘스트
  - 오늘 노출
  - 검토 대기
  - 완료율
- 필터:
  - 카테고리
  - 대상
  - 보상 방식
  - 노출 상태
- 액션:
  - 퀘스트 추가
  - 선택 삭제
  - 숨김/노출
- 목록:
  - 퀘스트 카드 또는 표

### Navigation Label

`퀘스트`

## 4. 성장루틴

### Purpose

학생 개인 습관과 교사 검토를 분리해서 운영한다.

### Student Surface

- 내 루틴 생성
- 내 루틴 수정
- 오늘 체크
- 진행중/검토중/완료 상태

### Teacher Surface

- 학생별 루틴 목록
- 검토 대기 목록
- 달성률 확인
- 0~20포인트 보상 부여
- 템플릿/보상 기준 관리

### Current DJ48 Mapping

Keep:

- `#classroom-routine-form`
- `#classroom-routine-grid`
- `renderClassroomRoutineCards`

Move:

- 학생카드 하위 탭에서 별도 `성장루틴` 기능으로 승격
- 검토 항목은 교사 작업대 요약에는 남기되 상세 관리는 성장루틴으로 이동

### Target Page Structure

- 학생:
  - 진행중
  - 검토중
  - 완료
  - 새 루틴 추가
- 교사:
  - 학생 목록
  - 선택 학생 루틴 상세
  - 검토 대기 표
  - 보상 처리

### Navigation Label

`성장루틴`

## 5. 젬스톤

### Purpose

반복 활동 누적을 성장형 보상으로 보여준다.

### Student Surface

- 내 젬 성장 단계
- 다음 단계까지 남은 횟수
- 획득한 젬/키링
- 대표 키링 설정

### Teacher Surface

- 젬 생성
- 젬 수정
- 젬 삭제
- 성장 단계 설정
- 단계 이름 설정
- 연결 퀘스트 확인
- 학생별 진행도

### Current DJ48 Mapping

Keep:

- `data-classroom-panel="gems"`
- `#classroom-gem-summary`
- `#classroom-gem-grid`
- `renderClassroomGemSummary`
- `renderClassroomGemCards`

Move from teacher workbench:

- `#classroom-gem-editor-panel`
- 월간 키링 중 젬 기반 지급 기능 일부

### Target Page Structure

- 학생/공통:
  - 젬 카드 목록
  - 성장 단계 토글
  - 대표 키링 설정
- 교사:
  - 젬 관리 탭
  - 학생별 진행도 탭
  - 월간 키링 지급 탭

### Navigation Label

`젬스톤`

## 6. 직업

### Purpose

학급 경제에서 학생 역할과 보상을 관리한다.

### Student Surface

- 직업 목록
- 내 직업
- 지원하기
- 월급 확인

### Teacher Surface

- 직업 생성
- 직업 수정
- 직업 삭제
- 지원자 승인
- 배정/해제
- 월급 지급
- 세금/급여 설정은 경제 기능과 연결

### Current DJ48 Mapping

Keep:

- `data-classroom-panel="jobs"`
- `#classroom-job-summary`
- `#classroom-job-grid`
- `renderClassroomJobSummary`
- `renderClassroomJobCards`

Move from teacher workbench:

- `#classroom-job-editor-panel`

Move to economy:

- 급여 세금 관련 설정

### Target Page Structure

- 학생:
  - 직업 카드
  - 지원 상태
  - 월급 상태
- 교사:
  - 직업 관리
  - 지원자 관리
  - 배정 현황

### Navigation Label

`직업`

## 7. 마켓

### Purpose

학생 구매/사용/장착과 교사 상품 관리를 분리한다.

### Student Surface

- 포인트샵
- 코인샵
- 공동구매샵
- 인벤토리
- 구매/사용/장착

### Teacher Surface

- 상품 생성
- 상품 수정
- 상품 삭제
- 공동구매 생성/수정/삭제
- 사용 요청 승인/반려/완료
- 구매/사용 이력

### Current DJ48 Mapping

Keep:

- `data-classroom-panel="market"`
- `#classroom-shop-grid`
- `#classroom-group-purchase-shop`
- `#classroom-shop-history`
- `renderClassroomShopCards`
- `renderClassroomShopHistory`
- `renderClassroomGroupPurchaseSection`

Move from teacher workbench:

- `#classroom-shop-editor-panel`
- `#classroom-group-purchase-editor-panel`

### Target Page Structure

- 학생:
  - 포인트샵
  - 코인샵
  - 공동구매
  - 인벤토리
- 교사:
  - 상품 관리
  - 공동구매 관리
  - 요청 처리
  - 이력

### Navigation Label

`마켓`

## 8. 은행/경제

### Purpose

포인트, DJ코인, 환전, 적금, 세금, 요청, 경제 대시보드를 하나로 묶는다.

### Student Surface

- 내 포인트
- 내 DJ코인
- 환전
- 예치/적금
- 만기 수령

### Teacher Surface

- 학급 총 포인트
- 학급 총 DJ코인
- 포인트 요청
- 환전 설정
- 적금 상품
- 세금 프리셋
- 학생별 경제 현황
- 일별/월별 경제 흐름

### Current DJ48 Mapping

Move from student-card subtab:

- `data-classroom-subpane="bank"`
- `#classroom-bank-grid`

Move from teacher workbench:

- `#classroom-tax-editor-panel`
- `#classroom-savings-editor-panel`
- `#classroom-exchange-editor-panel`

Keep:

- `renderClassroomExchangeSection`
- `renderClassroomSavingsSection`
- `renderClassroomTaxPresetList`

### Target Page Structure

- 학생:
  - 환전
  - 적금
  - 보유 재화
- 교사:
  - 학급 자산 정보
  - 포인트 요청
  - 일별 현황
  - 월별 현황
  - 학생별 현황
  - 금융 설정

### Navigation Label

`은행`

교사용 내부 제목은 `경제 관리` 또는 `학급 자산`을 사용할 수 있다. 학생에게는 `은행`이 더 직관적이다.

## 9. 학급미션

### Purpose

학생 전체가 함께 모으는 목표와 보상을 보여준다.

### Student Surface

- 현재 학급 포인트
- 다음 목표
- 목표 보상
- 달성률
- 달성된 단계

### Teacher Surface

- 미션 생성
- 미션 수정
- 미션 삭제
- 단계별 목표/보상 설정
- 달성 처리/정산

### Current DJ48 Mapping

Keep:

- `#classroom-mission-view`
- `renderClassroomMissionView`

Move from teacher workbench:

- `#classroom-mission-editor-panel`

Move from student-card subtab:

- `data-classroom-subpane="mission"` should become a direct feature section or home activity detail.

### Target Page Structure

- 학생:
  - 미션 현황 카드
  - 목표 트랙
- 교사:
  - 현재 현황
  - 새 목표 추가
  - 등록된 목표 목록
  - 달성/삭제 액션

### Navigation Label

`학급미션`

## 10. 알림

### Purpose

학생에게 안내할 공지와 클래스 메시지를 관리한다.

### Student Surface

- 클래스 알림
- 내용 보기

### Teacher Surface

- 알림 슬롯 편집
- 게시판 문구 관리

### Current DJ48 Mapping

Move from teacher workbench:

- `#classroom-notice-editor-panel`

Target placement:

- 홈의 기능 바로가기 또는 별도 `알림` 관리 섹션

### Navigation Label

`알림`

## 11. 학생관리

### Purpose

학생 계정, 표시 여부, 비밀번호, 리포트, 테스트 학생 정책을 관리한다.

### Student Surface

- 없음

### Teacher Surface

- 학생 목록 테이블
- 번호
- 닉네임
- 카드 표시 여부
- 로그인/비밀번호 상태
- 포인트/코인 요약
- 리포트 보기
- 숨김/표시
- 테스트 학생 여부

### Current DJ48 Mapping

Partially outside classroom:

- Admin member management exists separately.

Classroom-specific target:

- 학생 카드에 직접 늘어나는 관리 버튼을 줄이고, 교사용 학생관리 페이지로 이동

### Navigation Label

`학생관리`

## Proposed Navigation

### Student Navigation

학생에게 상단 또는 주요 탭으로 노출할 항목:

- 홈
- 학생카드
- 퀘스트
- 성장루틴
- 젬스톤
- 직업
- 마켓
- 은행
- 학급미션

단, 화면 밀도를 낮추기 위해 모바일/좁은 화면에서는 다음처럼 묶을 수 있다.

- 홈
- 카드
- 할 일
- 보상
- 경제

Where:

- 할 일: 퀘스트, 성장루틴, 학급미션
- 보상: 젬스톤, 직업
- 경제: 마켓, 은행

### Teacher Navigation

교사에게 노출할 항목:

- 홈
- 학생카드
- 퀘스트
- 성장루틴
- 젬스톤
- 직업
- 마켓
- 은행
- 학급미션
- 학생관리
- 알림
- 처리할 일

`처리할 일`은 기존 `교사 작업대`의 새 이름으로 쓴다.

## Migration Priority

### Phase 1. Rename and De-overload Teacher Workbench

Goal:

- `교사 작업대`를 `처리할 일`로 바꾼다.
- 검토/요청/최근 활동만 남긴다.
- 모든 CRUD details는 기능별 섹션으로 이동할 준비를 한다.

Do first:

- Teacher tab label rename
- Teacher dashboard copy update
- Workbench section heading update
- No data contract changes

### Phase 2. Promote Hidden Functional Sections

Goal:

- 학생카드 하위에 숨어 있는 퀘스트, 성장루틴, 학급미션, 은행을 상위 기능으로 승격한다.

Do:

- Add top-level tabs:
  - 퀘스트
  - 성장루틴
  - 은행
  - 학급미션
- Keep existing render functions.
- Move DOM containers carefully without changing Firestore paths.

### Phase 3. Move Teacher CRUD to Feature Pages

Goal:

- 교사용 생성/수정/삭제 폼을 각 기능 페이지의 교사용 관리 영역으로 이동한다.

Move:

- Quest editor to Quest
- Routine teacher review to Growth Routine
- Gem editor to Gemstone
- Job editor to Job
- Shop and group purchase editors to Market
- Exchange, savings, tax editors to Bank
- Mission editor to Class Mission
- Notice editor to Notice/Home

### Phase 4. Add Teacher Data Tables

Goal:

- 요청/검토성 데이터는 카드보다 테이블로 정리한다.

Tables:

- Quest review table
- Routine review table
- Shop request table
- Job application table
- Point/economy request table
- Student gem progress table
- Student management table

### Phase 5. Student Surface Simplification

Goal:

- 학생 화면에서 설정 폼과 관리자성 정보를 없애고, 행동 중심 UI로 정리한다.

Do:

- Student home activity list
- Quest modal/panel
- Routine modal/panel
- Mission status card
- Bank/market/gem/job visual tabs

## Non-Negotiable Rules

- Do not create a new Firestore collection for this UI reclassification.
- Do not change callable contracts unless a feature cannot be expressed with current fields.
- Do not move all code at once.
- Do not keep adding new teacher CRUD forms into `교사 작업대`.
- Do not expose teacher forms to student view.
- Do not use card layouts for long review queues; use tables.
- Do not place bank/economy settings under market.
- Do not place gem creation under quest even though quests can link gems.
- Do not place student account/password management on student cards.

## Immediate Recommendation

The next implementation batch should be small:

1. Rename `교사 작업대` to `처리할 일`.
2. Keep only today-review semantics in that copy.
3. Add top-level tabs for `퀘스트`, `성장루틴`, `은행`, `학급미션` without changing data flow.
4. Move only visible containers first, not business logic.
5. After visual structure is stable, move CRUD forms one feature at a time.

This gives the user an immediate sense that the classroom is no longer organized around a single teacher workbench, while keeping implementation risk controlled.
