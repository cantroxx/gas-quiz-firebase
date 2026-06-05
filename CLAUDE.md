# DJ48 퀴즈앱 — Claude 작업 가이드

## 프로젝트 개요

Google Apps Script(GAS) 기반 초등학교 퀴즈 웹앱.  
파일 구조는 단순하다: `Code.js` (서버) + `index.html` (클라이언트 전부 포함).

| 파일 | 규모 | 역할 |
|------|------|------|
| `Code.js` | ~9,600줄 | GAS 서버 로직 전체 |
| `index.html` | ~6,650줄 | HTML + CSS + 클라이언트 JS 전부 |
| `appsscript.json` | - | 배포 설정 |

---

## ⚠️ 반드시 지켜야 할 규칙

### 1. 파일을 통째로 교체하지 말 것
Code.js와 index.html은 각각 1만 줄에 육박한다. 수정할 때는 **변경할 함수/블록만** 교체해야 한다. 전체 파일을 다시 쓰면 안 된다.

### 2. 컬럼 인덱스는 1-based (GAS 표준)
스프레드시트 컬럼은 1부터 시작한다. `MEMBER_SCHOOL_COLUMN = 10` 이면 실제 J열이다.  
`getRange(row, col)` 호출 시 0-based로 잘못 쓰지 않도록 주의.

### 3. `회원정보` 시트 컬럼 구조 — 함부로 바꾸지 말 것
```
1:userId  2:학년  3:반  4:번호  5:닉네임  6:프로필이미지URL  7:가입일  8:최근로그인  9:비밀번호
10:학교  11:선택타이틀  12:랭킹메시지  13:역할  14:상태
```
`MEMBER_INFO_COLUMN_COUNT = 14`. 열을 추가하면 이 상수와 모든 `getRange(..., MEMBER_INFO_COLUMN_COUNT)` 호출을 함께 수정해야 한다.

### 4. 비공개 함수는 끝에 `_` 붙임
`getMemberSheet_()`, `ensureRoomLikeSheet_()` 처럼 밑줄로 끝나는 함수는 내부 전용이다.  
프론트엔드에서 `google.script.run`으로 직접 호출하는 함수는 밑줄 없이 작성한다.

### 5. `userId` 형식 — 절대 변경 금지
```
형식: G{학년}-C{반}-N{번호:2자리}
예시: G3-C2-N05
```
`makeUserId()` / `makeMemberUserId_()` 함수로만 생성한다.  
레거시 ID(`legacyIds`, `legacyNames`)가 타이틀/뱃지 전반에 걸쳐 38곳 이상 참조되므로 ID 체계를 바꾸면 기존 데이터가 깨진다.

### 6. 타이틀/뱃지 ID 추가·변경 시 레거시 처리 필수
기존 타이틀 ID를 바꿀 때는 반드시 `legacyIds`와 `legacyNames` 배열에 구버전을 추가해야 한다.  
그렇지 않으면 기존 사용자가 이미 획득한 타이틀이 사라진다.

---

## 🔧 미설정 상수 (배포 전 채워야 함)

```js
const TINIPING_IMAGE_FOLDER_ID = '';       // ← 비어 있음, 티니핑 퀴즈 동작 안 함
const PROFILE_UPLOAD_FOLDER_ID = '';       // ← 비어 있음, 프로필 직접 업로드 안 됨
```
이 두 값이 비어있으면 관련 기능은 에러 메시지를 반환하도록 이미 처리되어 있다. 새 기능 추가 시 동일 패턴으로 방어 코드를 작성할 것.

> `ENABLE_PROFILE_IMAGE_UPLOAD = false`(L15)로 설정되어 있어 업로드 버튼이 숨겨진 상태.  
> `PROFILE_UPLOAD_FOLDER_ID`를 채운 뒤 `true`로 되돌리면 활성화된다.

---

## 📋 주요 시트 목록

| 시트명 | 용도 |
|--------|------|
| `회원정보` | 회원 전체 데이터 |
| `회원상태변경로그` | 활성/비활성 변경 이력 |
| `회원삭제로그` | 삭제 이력 |
| `학교목록` | 학교 이름 관리 |
| `내집설정` | 내 방 꾸미기 설정 |
| `타이틀현황` | 사용자별 타이틀 보유 현황 |
| `연습기록` | 퀴즈 연습 기록 |
| `포켓몬연습기록` | 포켓몬 퀴즈 기록 |
| `일일이용기록` | 일일 접속/이용 통계 |
| `국어목록` | 국어 퀴즈 목록 (맞춤법/다의어/독서 등) |
| `수학목록` | 수학 퀴즈 목록 |
| `사회목록` | 사회 퀴즈 목록 |
| `타이틀목록` | 퀴즈별 세부 타이틀 정의 |

시트 이름은 상수로 선언되어 있다 (예: `PRACTICE_RECORD_SHEET_NAME`). 직접 문자열로 쓰지 말 것.

---

## 🏗️ 핵심 아키텍처 패턴

### 서버 함수 반환 형식
성공: `{ success: true, ... }`  
실패: `{ success: false, message: '...' }` 또는 `{ error: '...' }`

이 패턴을 일관되게 유지할 것.

### Lock 사용 (동시성)
`LockService.getScriptLock()`은 현재 하트(좋아요) 기능 등 2곳에서만 사용 중.  
여러 사용자가 동시에 쓰는 시트에 `appendRow` / `setValue`를 추가할 때는 Lock을 검토할 것.

### 일일 퀴즈 제한 로직
```
인기퀴즈 기본 제한: 10분 (DAILY_FUN_LIMIT_SECONDS = 600)
오후 4시 이후 추가 제한: 최대 30분 (DAILY_AFTER4_HARD_LIMIT_SECONDS = 1800)
해금 조건: 교육 퀴즈 15문제 정답 (DAILY_EDU_UNLOCK_CORRECT_COUNT = 15)
```
이 로직은 `getQuizAccessStatus()` → `getTodayUsageStatus_()`에 집중되어 있다.

### 학교 이름 정규화
`normalizeMemberSchool_()` 함수가 "서울동자초등학교" → "동자" 로 변환한다.  
학교 관련 로직 추가 시 반드시 이 함수를 통과시킬 것.

---

## 🧹 남은 정리 대상

### 중복 로직 (통합 검토 필요)
- `getMemberUsageSummaryMap_` (L2188) ↔ `getMemberUsageMap_` (L2612)  
  유사한 시트 순회 패턴이지만 반환 구조가 달라 단순 통합은 어려움. 향후 구조 정리 시 검토.

### 빈 파일
- `index_scripts.js` (0 bytes) — 삭제 필요. 터미널에서 직접: `rm ~/Projects/gas-quiz/index_scripts.js`  
  GAS에서 `<script src>` 방식은 지원 안 됨. 사용하려면 `<?!= include('index_scripts') ?>` 방식으로 연결해야 함.

---

## 🏷️ 타이틀 시스템 구조

타이틀 정의 흐름: `TITLE_TIER_DEFINITIONS` + `GENERAL_TITLE_DEFINITIONS` → `buildAllTitleDefinitions_()` → `buildAvailableTitleList_()` → UI `renderProfileTitleOptions()`

### 핵심 함수 위치 (Code.js)

| 함수 | 위치 | 역할 |
|------|------|------|
| `TITLE_TIER_DEFINITIONS` | L70 | 카테고리별 뱃지 타이틀 설정 (tiniping/anime/idol/dadjoke/국어/수학/사회) |
| `GENERAL_TITLE_DEFINITIONS` | L197 | 일반 타이틀 목록 (신입/중수/고수/만점요정 등) |
| `makeTitleDefinition_` | L477 | TITLE_TIER_DEFINITIONS 항목을 타이틀 객체로 변환 |
| `makePokemonTitleDefinition_` | L505 | 포켓몬 세대별 트레이너 타이틀 생성 |
| `buildAllTitleDefinitions_` | L530 | 전체 타이틀 목록 조합 |
| `buildAvailableTitleList_` | L880 | 사용자가 획득 가능한 타이틀 필터링 |

### subjectGroup 값 규칙
타이틀이 어느 UI 탭에 표시되는지를 결정하는 필드.

| subjectGroup 값 | UI 탭 | 해당 카테고리 |
|----------------|-------|-------------|
| `'popular'` | 인기 | tiniping, anime, idol, dadjoke, pokemon (전체) |
| `'korean'` | 국어 | 맞춤법, 국어(다의어/지엠오) |
| `'math'` | 수학 | 곱셈나눗셈 |
| `'social'` | 사회 | 역사인물 |
| `''` (빈 문자열) | 일반 | 일반 타이틀들 |

새 카테고리 추가 시 `TITLE_TIER_DEFINITIONS`에 `subjectGroup` 필드를 반드시 명시할 것.  
누락 시 `inferSubjectGroupFromTitleConfig_()` (L469)가 국어/수학/사회만 인식하고 나머지는 `''`(일반) 탭으로 fallback.

### sourceType 종류

| sourceType | 설명 | 필요 필드 |
|-----------|------|---------|
| `'practiceStars'` | 특정 source의 뱃지 starCount ≥ requiredBadgeCount | `source`, `requiredBadgeCount` |
| `'pokemonGenCount'` | 서로 다른 포켓몬 세대 뱃지(starCount≥1) 개수 | `requiredGenCount` |
| `'badge'` | 전체 뱃지 개수 | `requiredBadgeCount` |
| `'badgeFields'` | 서로 다른 분야 뱃지 개수 | `requiredBadgeCount` |
| `'subjectDetailTitles'` | 특정 subjectGroup 내 획득 타이틀 수 | `requiredSubjectTitleCount` |
| `'rankingNormal50'` | 일반 랭킹전 50점 이상 횟수 | (하드코딩: 5회) |

### 포켓몬 타이틀 구조 (현재)
- **세대별 트레이너** (9개): `pokemon_gen{1~9}_trainer` — 해당 세대 뱃지 1회 완주 (`sourceType: 'practiceStars'`)
- **크로스젠 마스터** (3개): 서로 다른 세대 뱃지 N개 이상 획득 (`sourceType: 'pokemonGenCount'`)
  - `pokemon_master` — 3세대 이상 (tier 3)
  - `pokemon_gym_leader` — 6세대 이상 (tier 5)
  - `pokemon_god` — 9세대 전부 (tier 5)

### 타이틀 자동화 구조 (신규)
- `타이틀목록` 시트에 행을 추가하면 타이틀이 자동으로 지급 로직에 연결된다.
- `getMergedTitleTierDefinitions_()` 가 하드코딩된 TITLE_TIER_DEFINITIONS와
  타이틀목록 시트를 병합해서 반환한다.
- `buildAllTitleDefinitions_()` 는 getMergedTitleTierDefinitions_() 를 참조한다.
- 기존 TITLE_TIER_DEFINITIONS(L70) 는 하드코딩 우선(override) 역할을 유지한다.
- 새 타이틀 추가 시 타이틀목록 시트에만 행을 추가하면 된다.
  코드 수정 불필요.

### UI TITLE_GROUPS (index.html L2387)
```js
{ id: 'general', label: '일반',  subjectGroups: ['', 'general', 'basic'] }
{ id: 'popular', label: '인기',  subjectGroups: ['popular'] }
{ id: 'korean',  label: '국어',  subjectGroups: ['korean', 'reading', 'spelling'] }
{ id: 'math',    label: '수학',  subjectGroups: ['math'] }
{ id: 'social',  label: '사회',  subjectGroups: ['social', 'society', 'history'] }
{ id: 'others',  label: '기타',  subjectGroups: ['others'] }
```

---

## 🎯 퀴즈 자동화 구조

### 퀴즈 추가 시 필요한 작업 (시트만)
새 퀴즈를 추가하려면 코드 수정 없이 아래 시트 작업만 하면 된다.

| 작업 | 해당 시트 | 자동 반영 항목 |
|------|-----------|--------------|
| 국어 퀴즈 추가 | 국어목록 | 국어 탭 버튼, 뱃지현황, 랭킹 탭 |
| 수학 퀴즈 추가 | 수학목록 | 수학 탭 버튼, 뱃지현황, 랭킹 탭 |
| 사회 퀴즈 추가 | 사회목록 | 사회 탭 버튼, 뱃지현황, 랭킹 탭 |
| 타이틀 추가 | 타이틀목록 | 타이틀 지급 자동 연결 |

### 목록 시트 컬럼 구조 (A~M열 공통)
A: quizId / B: title / C: type / D: sheetName / E: active(Y/N) /
F: order / G: description / H: (비움) /
I: uiType / J: badgeGroup / K: completionType /
L: titleSource / M: subjectGroup

### uiType 값
- input: 타이핑 입력형
- multipleChoice2: 2지선다 클릭형
- multipleChoice4: 4지선다 클릭형

### completionType 값
- loop: 반복형 (100개 달성 후 0으로 초기화)
- complete: 완독형 (100개 달성 후 100/100 유지)

### 타이틀목록 시트 컬럼 구조 (A~N열)
A: defKey / B: titleSource / C: subjectGroup / D: conditionTarget /
E: star1_id / F: star1_title / G: star3_id / H: star3_title /
I: star5_id / J: star5_title / K: theme / L: category /
M: order / N: active(Y/N)

### 자동화 함수 연결 흐름

#### 퀴즈 버튼 자동 생성
- 국어: `getKoreanQuizOptions()` → 국어목록 시트
  → index.html `renderKoreanQuizSelection()` → 동적 버튼
- 수학: `getMathQuizOptions()` → 수학목록 시트
  → index.html `renderMathQuizSelection()` → 동적 버튼
- 사회: `getSocietyQuizOptions()` → 사회목록 시트
  → index.html `renderSocietyQuizSelection()` → 동적 버튼

#### 뱃지현황 자동 반영
- `getPracticeBadgeTotals_()` → 국어목록/수학목록 시트에서
  korean/reading/math 그룹 동적 생성
- `getPracticeBadgeProgress()` → `getSubjectQuizMetaMap_()` 로
  completionType/badgeGroup 자동 판별
- daily 그룹: 아재개그만 포함 (맞춤법은 korean 그룹으로 이동됨)
- `renderPracticeBadgeProgress()` → data 객체 순회로 동적 표시

#### 랭킹 탭 자동 반영
- `showRankings()`, `showRankingVisualCat()` 내 mappings 객체가
  `koreanQuizOptions` / `societyQuizOptions` / `mathQuizOptions`
  전역변수 기반으로 동적 생성됨
- 인기 그룹은 하드코딩 유지

#### 타이틀 자동 연결
- `getMergedTitleTierDefinitions_()` →
  하드코딩 TITLE_TIER_DEFINITIONS + 타이틀목록 시트 병합
  (기존 defKey는 하드코딩 우선)
- `buildAllTitleDefinitions_()` → `getMergedTitleTierDefinitions_()` 참조
- `initTitleListSheet()` → GAS 편집기에서 1회 실행으로
  타이틀목록 시트 자동 생성 가능 (1회성 함수)

#### completionType 자동 처리
- `savePracticeProgress()` → `getSubjectQuizMetaMap_()` 에서
  completionType 조회
- complete이면 완독형 (100개 유지), loop이면 반복형 (0으로 초기화)
- fallback: 지엠오 아이 하드코딩 유지

### 절대 건드리면 안 되는 안정 함수
- renderKoreanTab, selectKoreanSub
- renderSocietyTab, selectSocietySub
- loadQuestion, checkAnswer
- savePracticeProgress
- TITLE_TIER_DEFINITIONS (L70) 선언부
- GENERAL_TITLE_DEFINITIONS (L197) 선언부
- buildAllTitleDefinitions_

---

## 🐛 디버깅 팁

- `DEBUG_PERF = false` → `true`로 바꾸면 각 함수 실행 시간이 Logger에 찍힌다
- `debugUserAvailableTitles(userId)` 함수로 특정 유저 타이틀 상태를 GAS 편집기에서 직접 확인 가능
- `debugTitleStatusForUserId(userId)` 함수도 동일 용도
- GAS 실행 로그: Apps Script 편집기 → 실행 → 실행 기록

---

## 📦 배포 방식

```bash
cd ~/Projects/gas-quiz
clasp push          # 코드 업로드
# GAS 편집기에서 배포 → 새 버전으로 배포
```

`clasp pull`로 내려받은 뒤 VS Code에서 수정하고, `clasp push`로 올린다.  
**GAS 편집기에서 직접 수정하면 로컬 파일과 충돌**하므로 주의.

---

## ✅ 수정 작업 체크리스트

새 기능 추가 또는 버그 수정 시:

- [ ] 변경 함수 범위를 최소화했는가?
- [ ] 새 시트/컬럼 추가 시 상수(`_COLUMN`, `_SHEET_NAME`, `_HEADERS`)로 선언했는가?
- [ ] 서버 함수 반환이 `{ success, message }` 패턴을 따르는가?
- [ ] 타이틀/뱃지 ID를 변경했다면 `legacyIds`에 구버전을 추가했는가?
- [ ] `PROFILE_UPLOAD_FOLDER_ID`, `TINIPING_IMAGE_FOLDER_ID` 같은 미설정 상수를 방어 처리했는가?
- [ ] `clasp push` 전 `clasp pull`로 최신 상태를 내려받았는가?
- [ ] 새 퀴즈 추가 시 목록 시트(국어목록/수학목록/사회목록) I~M열을 모두 채웠는가?
- [ ] 새 타이틀 추가 시 타이틀목록 시트에 행을 추가했는가?
- [ ] completionType이 완독형(complete)인지 반복형(loop)인지 확인했는가?
