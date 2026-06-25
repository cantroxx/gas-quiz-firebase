# Grownd Classroom UI Scan

## Purpose

DJ48 Quiztown 교실 UI를 기능 중심으로 재편하기 전에 Grownd의 교사/학생 화면 구조, 기능 분류, 카드/테이블/모달 패턴을 관찰해 기준점으로 삼는다.

## Scan Context

- Site: https://growndcard.com
- Teacher view: logged in teacher account, class DJ48
- Student view: class nickname DJ48, student name 선생님
- Scan date: 2026-06-24
- Scope: UI structure and information architecture only. No data changes were intentionally made.

## Teacher Global Structure

Grownd teacher navigation is split into large product areas:

- 그라운드
- 그라운드 툴
- 메타그라운드
- 대시보드

The important pattern is that management functions are not all grouped into one workbench. They are placed by function:

- Home/classroom card view: class overview and student cards
- Quest management: quest creation, filters, visibility, archive, tool actions
- Growth routine planner: student routine progress and review
- Class mission management: collective mission targets and rewards
- Asset dashboard: points, bank settings, job system, tax presets, point requests
- Student management: student add/edit/password/report table
- Observation records: student-by-student daily notes

## Teacher Home Pattern

The teacher home uses a class-centered layout.

- The first visual signal is the class identity: school, grade, class, yearly class description.
- Student cards form the main canvas.
- Each student card exposes avatar, number, nickname, level, berry, points, and badge action.
- A compact toolbar provides shortcuts:
  - 클래스 알림
  - 배경 테마
  - 교실 배치도
  - 퀘스트 관리
  - 학급 미션
  - 관찰 기록
  - 아뜰리에
  - 아케이드
- The toolbar is not the same as a full admin workbench. It is a shortcut layer over the class canvas.

Implication for DJ48:

- Keep the class/student card view as the main classroom stage.
- Move feature management out of one overloaded teacher workbench into feature pages or sections.
- Keep a small shortcut/action strip for frequently used teacher actions.

## Quest Management Pattern

Quest management is a standalone page.

Top area:

- Page title and short description
- Creation limits and usage status
- Summary counts:
  - total quests
  - visible quests
  - storage/asset usage

Control area:

- Category chips
- Search input
- Sort select
- Visibility filter
- Selection mode
- Archive action
- Toolbox action
- Quest add action

Quest list card pattern:

- Category chip
- Repeat/status chip
- Reward amount
- Completion count, e.g. 17/22
- Quest title
- Quest description
- Date range
- Visibility toggle

Implication for DJ48:

- Quest should become its own functional page/section.
- Teacher workbench should show only pending quest review, not all quest CRUD.
- Quest cards should show status, reward, completion count, and visibility consistently.

## Growth Routine Pattern

Growth routine planner is student-centered.

Top area:

- Summary counters:
  - students
  - created routines
  - active routines
  - review pending
  - completed

Main layout:

- Left/student list: student avatars and names
- Right/detail panel: selected student routine state

Teacher controls:

- Template management
- Routine reward management
- Pagination for student list

Routine detail:

- Tabs:
  - 진행중
  - 마감 검토
  - 처리 완료
- Routine card:
  - routine name
  - routine type
  - item count
  - base reward
  - start/end date
  - progress button
  - settings button
  - today's completion percent
  - routine checklist items

Implication for DJ48:

- Growth routines should not live only inside teacher workbench.
- Teacher view should be organized around selected student plus routine state tabs.
- Student view should remain modal/simple: active, review, complete, add routine.

## Class Mission Pattern

Class mission management combines current status, mission creation, and mission history.

Top status:

- Current class points
- Next goal and reward
- Progress percentage
- Current/target number

Management section:

- New mission form:
  - target points
  - benefit/reward text
  - register button
- Registered mission list:
  - target points
  - benefit
  - status
  - achieved date when completed
  - action buttons

Student-friendly status cards:

- Mission completion ratio
- Current class points
- Visual background cards

Implication for DJ48:

- Class mission should be a dedicated feature section.
- Student view should show only mission status and next reward.
- Teacher view should add/edit/delete mission targets and settle outcomes.

## Asset Dashboard Pattern

The asset dashboard is tabbed and data-heavy.

Tabs:

- 학급 자산 정보
- 포인트 요청
- 일별 포인트 현황
- 월별 포인트 현황
- 학생별 현황

Class asset info includes:

- Total class points
- Total class berry/currency
- Funds
- Bank exchange settings
- Deposit products
- Lottery settings/status
- Job system settings
- Level settings
- Tax presets

Point request tab:

- Table columns:
  - number
  - student avatar/name
  - request type
  - points
  - request reason
  - status
  - request time
  - processing action/state
- Summary counters:
  - pending
  - approved
  - rejected

Implication for DJ48:

- Bank, point adjustment, point request, tax, job salary, and economy settings should be grouped under an economy/dashboard feature, not scattered.
- Teacher request handling should use tables when the data is review-like.
- Student-facing bank should stay visual and compact.

## Student Management Pattern

Student management is a table page.

Top area:

- Student add form
- Bulk add button
- Registration limit
- Privacy guidance

Student table columns:

- Avatar
- Number
- Name
- Password
- Management actions

Actions include:

- Report view
- Edit-like action
- Delete-like action

Implication for DJ48:

- Student/member admin should be table-first.
- Student cards in the classroom should not carry all management actions.
- Teacher-only management actions belong in member management, not on every classroom card by default.

## Student Global Structure

Student view is much simpler than teacher view.

Top tabs:

- 카드
- 텃밭 은행
- 마켓
- 젬스톤
- 직업

Persistent right activity panel:

- 클래스 알림
- 퀘스트
- 성장 루틴
- 우리반 미션
- 웍스

Main card view:

- Avatar
- Number/name
- Level
- Currency
- Points
- Point request button
- Capability/card request button
- Neighbor student carousel

Implication for DJ48:

- Student home should be action-first and low-density.
- Put daily tasks in a persistent activity panel or top "today" area.
- Keep marketplace/bank/gem/job as student-friendly experience tabs.
- Do not expose teacher configuration forms in student view.

## Student Detail Patterns

Quest detail:

- Opens as a modal.
- Title: 오늘의 퀘스트
- Short description
- Empty state when no quest exists
- Close action

Growth routine detail:

- Opens as a modal.
- Tabs:
  - 진행중
  - 검토중
  - 완료
- Empty state is friendly and short.
- New routine button is clearly visible.
- Explanation text stays concise.

Student bank/market/gem/job tabs:

- Each tab keeps the same top navigation and right activity panel.
- The central content uses immersive visual backgrounds.
- Student identity and current resource are prominent.
- Detailed management is hidden from the student.

Implication for DJ48:

- Student quest/routine/mission can be modal or focused panels from the activity list.
- Full teacher CRUD should not appear in these student panels.
- Empty states should be short and actionable.

## Visual UI Patterns

Observed patterns:

- White cards over soft background
- Rounded buttons, but controls are compact and consistent
- Status chips use short labels
- Main page title plus one short explanatory sentence
- Data-heavy teacher pages use tables and tabs
- Student pages use large visual surfaces and fewer controls
- Avatars are used heavily to identify students
- Numbers are shown close to names
- Actions are grouped at page top or row/card edge
- Empty states are direct and friendly

Recommended DJ48 direction:

- Teacher pages: practical, table/card hybrid, dense but organized
- Student pages: playful, visual, few actions, clear daily tasks
- Shared components:
  - page header
  - summary stat cards
  - status chips
  - action bar
  - feature tabs
  - student avatar row
  - review table
  - student modal

## Initial DJ48 Reclassification Draft

Recommended functional groups:

- 교실 홈
  - student cards
  - class notice
  - today activity shortcuts
  - recent activity summary
- 퀘스트
  - student: today's quests
  - teacher: quest CRUD, categories, visibility, archive, review queue
- 성장 루틴
  - student: my routines, add/edit/check, review states
  - teacher: templates, reward settings, student routine review
- 젬스톤
  - student: my gem growth and equipped keyring
  - teacher: gem CRUD, linked quests, student progress
- 직업
  - student: job list, apply, current job, salary status
  - teacher: job CRUD, applications, assignment, salary/tax settings
- 마켓
  - student: item browse, purchase, use/equip
  - teacher: item CRUD, purchase/use review, inventory rules
- 은행/경제
  - student: exchange, deposit, savings, lottery if used
  - teacher: exchange settings, savings products, tax presets, point requests, economy dashboard
- 학급 미션
  - student: current class goal and next reward
  - teacher: mission CRUD, settlement, progress history
- 학생 관리
  - teacher: member table, password, visibility, reports

## Next Step

Create a stricter DJ48 classroom UI guideline from this scan:

- Decide final navigation labels.
- Decide which features remain in classroom home and which move to feature sections.
- Define student vs teacher view rules.
- Define card, table, modal, chip, and action bar rules.
- Define implementation order and verification checklist.
