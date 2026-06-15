# Quiz Migration Discovery Phase 1

## Scope

- 목적: Firebase 이전 난이도 판단을 위한 최소 범위 정찰
- 운영본 확인 위치: `/Users/kdw/Projects/gas-quiz`
- 확인 방식: `rg` 함수 검색 후 관련 함수 주변만 확인
- 제외: 퀴즈 전체 분석, 전체 문제 수 조사, 랭킹 구조 분석, 뱃지 구조 분석

## 확인한 함수 목록

### 운영본 `Code.js`

- `getSubjectQuizFallbacks_(subject)`  
  국어/수학/사회 fallback 퀴즈 메타데이터를 정의한다.
- `readSubjectQuizOptions_(subject)`  
  `{subject}목록` 시트에서 활성 퀴즈 목록을 읽고 fallback을 합친다.
- `getKoreanQuizOptions()`  
  `국어목록` 시트에서 국어 퀴즈 목록을 읽고, 없으면 맞춤법/단어/GMO fallback을 반환한다.
- `getMathQuizOptions()`  
  `수학목록` 시트에서 수학 퀴즈 목록을 읽고, 없으면 `random-basic` fallback을 반환한다.
- `getSocietyQuizOptions()`  
  `readSubjectQuizOptions_('사회')`로 사회 퀴즈 목록을 반환한다.
- `getMathQuizConfig_(quizKey)`  
  수학 퀴즈 키를 `random-basic` fallback 또는 목록 항목으로 매핑한다.
- `getSubjectQuizConfig_(subject, quizKey)`  
  과목 목록의 `quizId`, `title`, `sheetName`으로 퀴즈 설정을 찾는다.
- `createSheetMultipleChoiceQuizData_(config)`  
  시트 기반 4지선다 퀴즈 데이터를 생성한다.
- `generateRandomMathQuizData_()`  
  수학 `곱셈과 나눗셈` 문제를 코드에서 생성한다.
- `getQuizDataForMember(memberId, category, subFilter)`  
  접근 가능 여부를 확인한 뒤 `getQuizData` 결과를 감싸 반환한다.
- `getQuizData(category, subFilter)`  
  카테고리/하위 구분에 따라 문제 시트 또는 생성형 문제를 불러온다.

### 운영본 `index.html`

- `renderKoreanQuizSelection()` / `selectKoreanSub(sub)`  
  국어 퀴즈 목록을 불러오고 맞춤법/단어/독서 탭으로 라우팅한다.
- `renderMathQuizSelection()` / `selectMathQuiz(quizKey)`  
  수학 퀴즈 목록을 불러오고 `곱셈과 나눗셈`을 수학 탭으로 라우팅한다.
- `renderSocietyQuizSelection()` / `selectSocietySub(sub)`  
  사회 퀴즈 목록을 불러오고 기존 인물형 또는 시트형 사회 퀴즈로 라우팅한다.
- `renderBasicQuizActions(cat, sub)`  
  연습전/랭킹전 시작 버튼을 구성한다.
- `showBasicQuizGate(cat, forceRetry, isInternal)`  
  퀴즈 데이터를 미리 불러오고 시작 화면을 표시한다.
- `startGame(cat, m, sub, rankingMode)` / `startGameAfterAccessCheck(...)`  
  연습전/랭킹전 세션을 시작하고, 캐시 또는 `getQuizDataForMember`로 문제 데이터를 확보한다.

## 확인한 시트 목록

### 퀴즈 목록 시트

- `국어목록`
  - 읽는 범위: 2행부터 13열
  - 주요 열: `quizId`, `title`, `type`, `sheetName`, `active`, `order`, `description`, `uiType`, `badgeGroup`, `completionType`, `titleSource`, `subjectGroup`
- `수학목록`
  - 읽는 범위: 2행부터 8열
  - 주요 열: `quizId`, `title`, `type`, `sheetName`, `active`, `order`, `description`
- `사회목록`
  - `readSubjectQuizOptions_('사회')`가 `사회목록`을 읽는다.
  - 구조는 국어/사회 공용 13열 메타 구조로 보인다.

### 문제 데이터 시트

- `맞춤법문제`
- `단어시트`
- `지앰오아이문제`
- `지엠오아이문제`
  - 코드 내 fallback 표기가 일부 다르다. `getKoreanQuizOptions()`와 독서 로딩 쪽은 `지앰오아이문제`를 사용하고, `getSubjectQuizFallbacks_('국어')`는 `지엠오아이문제`를 사용한다.
- `인물문제`
- 사회 목록의 `sheetName` 값
  - `type === 'sheet'` 및 `uiType === 'multipleChoice4'`이면 `createSheetMultipleChoiceQuizData_`가 해당 시트를 읽는다.

## 퀴즈 데이터 구조 요약

- 퀴즈 목록은 과목별 목록 시트 기반이다.
  - 국어: `국어목록`
  - 수학: `수학목록`
  - 사회: `사회목록`
- 목록 시트의 활성 조건은 `active` 열 값이 `Y`, `TRUE`, `사용`, `활성` 중 하나인 경우다.
- 문제 데이터는 대부분 시트 기반이다.
- 예외적으로 수학 `random-basic` / `곱셈과 나눗셈`은 시트 없이 코드에서 생성된다.
- 프런트는 `google.script.run`으로 목록 함수를 호출해 선택지를 만들고, 시작 시 `getQuizDataForMember` 또는 `getQuizData`를 호출한다.

## 문제 저장 방식

- 맞춤법
  - 시트: `맞춤법문제`
  - 반환 형태: `[문제, 정답, 힌트, 해설, '', aliases]`
  - 코드상 힌트와 해설은 C열 값을 공유한다.
- 단어 `다의어·동형이의어`
  - 시트: `단어시트`
  - 읽는 열: 8열
  - 주요 값: 낱말, 문장1, 문장2, 정답, 뜻1, 뜻2, 해설, 유형
  - 반환 문제 객체 `kind`: `wordRelation`
- 독서/GMO
  - 시트: 목록의 `sheetName`, fallback 기준 `지앰오아이문제`
  - 읽는 열: 9열
  - 주요 값: 번호, 난이도, 문제, 보기 4개, 정답, 해설
  - 반환 문제 객체 `kind`: `readingMultipleChoice`
- 사회 시트형 4지선다
  - 시트: `사회목록`의 `sheetName`
  - 읽는 열: 9열
  - 주요 값: row id, 문제, 보기 4개, 정답, 힌트, 해설
  - 반환 문제 객체 `kind`: `sheetMultipleChoice4`
- 수학 `곱셈과 나눗셈`
  - 시트 없음
  - 코드에서 100문항을 생성한다.
  - 반환 문제 객체 `kind`: `mathMultipleChoice`
- 기존 인물형
  - 시트: `인물문제`
  - 역사 인물은 `category === '인물'`, `subFilter === '역사 인물'` 경로를 사용한다.
  - 이미지 URL, 힌트, 설명, 별칭을 함께 사용하므로 단순 텍스트/선다형보다 이전 난이도가 높다.

## quizId 존재 여부

- 존재한다.
- 목록 시트 기반 퀴즈는 `quizId`를 1열에서 읽는다.
- fallback에도 `quizId`가 있다.
  - `spelling`
  - `word-relation`
  - `gmo`
  - `random-basic`
  - `history-people`
- 문제 단위 ID도 일부 존재한다.
  - 수학: `math-muldiv-{type}-{index}`
  - 단어: `word-relation-{rowNumber}`
  - 독서/GMO: `reading-gmo-{number}` 또는 `reading-{quizId}-{number}`
  - 사회 시트형: `{quizId or title normalized}-{row id}`
- 일반 이미지형/입력형 일부는 quizId보다 카테고리/하위구분 중심으로 동작한다.

## Firebase 이전 난이도

- 낮음
  - 수학 `곱셈과 나눗셈`: 시트 의존이 없고 생성 로직만 이전하면 된다.
  - 맞춤법: 단순 시트형 입력 문제이며 컬럼 수가 적다.
  - 단어 `다의어·동형이의어`: 시트형 구조가 명확하고 이미지가 없다.
- 중간
  - 독서/GMO: 4지선다 구조는 명확하지만 완주형 `completionType`과 기존 연습기록 호환 ID가 있다.
  - 사회 시트형 4지선다: `createSheetMultipleChoiceQuizData_`로 구조는 표준화되어 있으나 실제 활성 항목과 시트명을 아직 확인하지 않았다.
- 높음
  - 역사 인물: 이미지 URL 변환, 별칭, 기존 인물 경로를 사용한다.
  - 포켓몬/티니핑/아이돌/애니 등 이미지형 인기퀴즈는 이번 범위 밖이며 추가 정찰이 필요하다.

## 가장 먼저 이전 가능한 퀴즈 TOP 5

1. `random-basic` / `곱셈과 나눗셈`
   - 생성형이라 시트 마이그레이션이 필요 없다.
2. `spelling` / `맞춤법`
   - `맞춤법문제`의 단순 입력형 구조다.
3. `word-relation` / `다의어·동형이의어`
   - `단어시트` 기반이며 이미지/랭킹 특수 구조 없이 문제 객체로 정리된다.
4. `gmo` / `지엠오 아이`
   - 4지선다 독서형 구조가 명확하다. 단, `completionType: complete`와 기존 ID 호환을 보존해야 한다.
5. 사회 `type: sheet`, `uiType: multipleChoice4` 활성 항목
   - 공통 `createSheetMultipleChoiceQuizData_`를 사용하므로 구조는 이전하기 쉽다. 실제 활성 title/sheetName은 이번 단계에서 확인하지 않았다.

## 아직 확인하지 않은 영역

- 국어/수학/사회 전체 문제 수
- 모든 과목별 활성 목록의 실제 시트 행
- 사회목록의 실제 활성 퀴즈 title/sheetName
- 랭킹 기록 구조
- 뱃지/타이틀 계산 구조
- 포켓몬/티니핑/아이돌/애니/아재개그 전체 구조
- 이미지 URL 변환 및 Drive 파일 구조
- Firebase 저장 컬렉션 설계
- 접근 제한/일일 진행도 저장 구조

## 정찰 한계

- `clasp run getKoreanQuizOptions`, `getMathQuizOptions`, `getSocietyQuizOptions` 실행을 시도했지만 `Script function not found. Please make sure script is deployed as API executable.` 오류로 운영본 시트의 실제 활성 행은 조회하지 못했다.
- 따라서 TOP 5는 코드에서 확인한 fallback과 로딩 구조 기준의 이전 난이도 판단이다.
