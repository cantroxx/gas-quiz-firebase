# 우리반 증권소 B단계 구현 보고서

최신 후속: [C·D 구현 및 4-8 교사 시범 배포 보고](CLASSROOM_SECURITIES_STAGE_CD_2026-10-18.md). 아래 내용은 해당 단계 완료 당시의 기록이다.

작성일: 2026-10-17 (Asia/Seoul)
기준: `docs/product/CLASSROOM_SECURITIES_IMPLEMENTATION_PLAN_2026-10-17.md`
승인: 단계 A 보고서의 G1 설계를 제시한 뒤 사용자가 “b단계 구현 진행”을 승인했다.
범위: 합성 데이터 Emulator용 서버 연습 시장. 실제 DJ코인 연결·운영 데이터 작업·배포는 제외한다.

## 결과

연습 계좌, 매매, 일별 한도, 원장, 투자일지, 교사 제어, 뉴스, 일별 시세를 서버 서비스로 구현했다. 화면에서도 서버 저장·조회·주문 확인·재시도·교사 관리를 실행할 수 있다. 운영 메뉴 활성화와 운영 시장 생성은 하지 않았다.

동시에 다른 에이전트가 교실 바깥 퀴즈 변경을 배포 중이라는 사용자 안내를 반영했다. 기존 변경은 보존하고, 증권을 신규 모듈로 분리했다. `functions/index.js`의 추가 연결은 `FUNCTIONS_EMULATOR === 'true'`일 때만 실행된다. 일반 배포에서 증권 callable 3개가 export되지 않으며, 예약 작업도 운영에 등록하지 않았다. 이번 작업에서 deploy/commit/push 명령을 실행하지 않았다.

## 서버 기능

### 권한과 계좌

- 기존 `assertLinkedMemberAuth`, `loadClassroomSettingsForTransaction`, `assertMemberCanEnterClassroom`, `isClassroomTeacherMember`를 주입한다. 존재하지 않는 학급은 거부한다.
- query/action/admin 모두 같은 인증·학급 검증을 거친다. 교사 여부·요청 소유자를 브라우저 주장으로 결정하지 않는다.
- 연습 시장만 지원하며 mode·currencyScale을 변경하거나 연습 계좌를 실제 재화 계좌로 바꾸는 API가 없다.
- 조회는 계좌 생성·보상·시세 생성 등 쓰기를 하지 않는다. 계좌 시작 버튼만 1,000 연습머니를 시장별 한 번 지급한다.
- 본인 및 담당 교사만 계좌·거래 이유·돌아보기를 읽는다. 학생의 타인 조회, 교사 사칭, 비활성 회원, 다른 학급을 거부한다.
- 계좌가 동결되면 새 거래와 돌아보기 쓰기를 거부한다. 이미 성공한 요청의 재조회는 재지급·재체결 없이 과거 결과를 반환한다.

### 주문과 원장

매수·매도 transaction은 권한/시장/요청/계좌/전체 보유분/하루 한도/시세/준비금을 먼저 읽고, 예수금·보유 수량·원가·한도·원장·일지·준비금·성공 결과를 함께 쓴다.

- 모든 금액은 1/100 단위 안전 정수. 매수 원가에 수수료 포함, 부분 매도 원가 내림 배분, 전량 매도 시 잔여 원가 전액 사용.
- 기본 하루 3회, 주문당 100주, 수수료 50bp, 종목 비중 50%. 교사 설정도 서버가 검사하며 화면 표시도 설정을 따른다.
- `expectedPriceVersion`와 `expectedConfigVersion`이 바뀌면 자동 가격 대체 없이 재확인을 요구한다.
- UUID 요청 ID와 정규화 payload hash를 계좌별 operations에 보존한다. 같은 ID·내용은 저장된 결과를 반환하고, 다른 내용은 충돌로 거부한다.
- 성공 요청 재전송은 휴장/거래 중지/다음날에도 같은 결과를 반환한다. 다만 회원 권한은 매번 다시 확인한다.
- 계좌별 성공 쓰기는 분당 30회까지. 멱등 재전송은 횟수를 소모하지 않는다. 거래 횟수 한도와 별도로 적용한다.
- 원장에는 전후 잔액·수량·원가, 시세/설정 버전, 실제 가격·수수료율·금액·실현손익을 남긴다. 원장/operations에 TTL 삭제를 설정하지 않았다.
- 매도 일지는 이전 매수 일지 ID를 참조한다. 돌아보기·교사 피드백은 revision과 이전 버전을 보존한다.
- 교사 원장 검사는 거래 산식·연속성·최종 계좌 합계를 재계산한다. 불일치를 보고만 하며 잔액을 자동 수정하지 않는다. 1,000건을 넘으면 불완전 검사라고 명시한다.

### 일별 시장과 뉴스

- 서버 KST 시계로 개장 전/개장/장 마감/휴장/당일 시세 실패를 계산한다. 기본 09:30 이상 14:30 미만. 주말과 교사 휴장일을 반영한다.
- 시장·업종·기업 요인을 private seed의 HMAC으로 결정적으로 생성한다. 뉴스 효과를 더해 ±500bp로 제한하고 가격 범위 1.00~1,000.00을 적용한다.
- 12종목 가격을 한 dailyPrices 문서로 생성하고 시장 포인터와 private 감사 기록을 한 transaction으로 공개한다. 공개된 가격은 수정하지 않는다.
- 실패 시 이전 공개 가격을 유지하고 당일 거래를 차단한다. 전 거래일 누락 시 missingDate를 기록하며, 내부 작업으로 누락 순서대로 복구한다. 임의 건너뛰기나 무제한 catch-up은 없다.
- 36개 자체 교육용 뉴스 예시를 교사 선택기로 제공한다. 초안 작성/수정, 예약, 발행, 원문 참조 정정을 지원한다. 기업·업종·시장 범위와 가격 효과는 서버가 검증한다.
- 학생 응답은 발행 뉴스의 공개 필드만 포함한다. 효과 bp, seed, 생성 요인, 초안·예약 뉴스는 학생에게 반환하지 않는다.
- 교사가 08:30 이후 즉시 발행한 뉴스는 다음 거래일부터 반영한다. 이미 공개된 시세는 소급 수정하지 않는다.
- 예약 뉴스 발행과 시세 생성은 별도 내부 작업이다. `schedules.js`는 명시된 시장 목록(최대 100개)을 받으며, G3 전에는 운영 scheduler를 등록하지 않는다.

## API와 경로

루트: `classrooms/{classId}/securitiesMarkets/{marketId}`. 현재 preview/test 시장은 `practice-v1`이다.

| API | 작업 |
| --- | --- |
| classroomSecuritiesQuery | market, company, news, account, quote, ledger, journal |
| 교사 전용 Query | accounts, drafts, templates, dashboard, adminAudit, audit |
| classroomSecuritiesAction | openAccount, buy, sell, reflect |
| classroomSecuritiesAdminAction | updateSettings, pause, resume, saveNews, publishNews, feedback |
| 내부 작업 | initialize, publishScheduledNews, generateDailyPrices, runSchedule |

`deposit`/`withdraw`는 거부한다. `userEconomy`, `studentWallets`, 퀴즈 랭킹 컬렉션을 읽거나 쓰지 않는다.

계좌 하위에 positions/dailyLimits/operations/ledger/journal 및 journal/history를 쓴다. 시장 하위 companies/dailyPrices/news/privateEngine/treasury/adminAudit를 사용한다. 일별 한도 문서에는 거래 횟수와 분당 쓰기 횟수를 함께 기록한다. 교사 감사 문서는 변경 사유·행위자·전후 상태·요청 hash·결과를 보존한다.

목록은 기본 20개, 최대 50개와 cursor를 사용한다. 종가 이력은 date 단일 필드 기준 최근 20건을 조회하고 미래 날짜를 제외한다. 뉴스는 status 또는 effectiveDate 단일 필드 쿼리를 사용한다. 새 복합 인덱스는 필요하지 않아 `firestore.indexes.json`을 변경하지 않았다.

현재 Rules의 최종 deny가 신규 경로에 적용된다. 비인증·학생·admin claim 교사에 대해 시장부터 일지 수정 이력까지 12개 깊이/경로의 직접 get/set 및 계좌 목록 조회 거부를 실제 Rules Emulator로 확인했다. 명시적 추가 규칙이 필요하지 않아 `firestore.rules`를 변경하지 않았다.

## 서버 화면과 재현

```sh
npm run test:securities
npm run check:securities-emulator
npm run check:securities-callable
npm run serve:securities-server
```

서버 미리보기: `http://127.0.0.1:4178/securities-server.html?securitiesServer=1`

- 모든 작업은 loopback의 `demo-dj48-securities` Emulator에서만 실행한다. guard가 없거나 다른 프로젝트/호스트면 테스트와 미리보기가 거부된다.
- Firestore 8387, Functions 5087, Auth 9287, hub 4487, logging 4587을 사용한다. Functions/Auth는 callable 검사 때만 시작한다. 저장소 firebase.json은 수정하지 않고 임시 설정을 사용한다.
- 미리보기는 2026-10-16 10:00 KST 고정 시계와 합성 학생 A/B·선생님을 제공한다. 계좌는 페이지 새로고침 후에도 같은 Emulator 실행 동안 남는다. Emulator를 종료하면 기본 메모리 데이터는 사라진다.
- 기존 단계 A는 `npm run serve:securities`, 포트 4177로 계속 별도 실행할 수 있다.
- 미리보기 HTTP 어댑터는 실제 Firebase 인증을 대신하는 합성 principal 전용 도구다. 별도의 callable 검사는 Auth Emulator에서 발급한 실제 ID token을 Functions Emulator에 전달해 인증 경계도 검사한다.

학생: 경제 → 증권 → 연습 계좌 시작 → 기업 상세 → 이유·수량 → **서버 주문 확인** → **최종 확인** → 투자일지.

교사: 상단 합성 선생님 선택 → 선생님 연습 시장 관리 → 계좌·뉴스·설정 불러오기. 계좌 조회/원장 검사/피드백, 기능 켜기·끄기/거래 중지·재개, 시간·한도·휴장일 설정, 뉴스 예시 선택/초안 수정/예약/발행/정정을 검토한다.

확정 주문의 요청 ID와 입력은 계좌별 sessionStorage에 결과 확인 전까지 보관한다. 응답 유실 시 **이전 요청 결과 다시 확인**을 누르며, 새로고침 뒤에도 같은 ID를 사용한다. 계정별 키를 분리하고 세대/조회 순서 검사를 통해 늦은 응답이 다른 계정이나 최신 조회 결과를 덮어쓰지 않게 한다. 교실 진입만으로 증권 API를 호출하거나 무제한 polling하지 않는다.

## 검증 결과

- `npm run test:securities`: 12개 통과. 기존 산식, 서버/표시 기본 산식 일치, 50% 경계, 설정 한도, KST 09:29:59/09:30:00/14:29:59/14:30:00·자정·주말·휴일, 결정적 요인, 요청 ID 재사용/새로고침/계정 분리, callable 인증 입력 경계.
- `npm run check:securities-emulator`: 서버 transaction/Rules 및 서버 연결 브라우저 인수 검사를 통과했다. 뉴스 범위·초안 수정·관련 업종 필터 보완 후 최종 재실행도 통과했다(exit 0).
- 계좌 생성/매수 요청 각각 20회 동시 재전송 → 지급·체결 각각 한 번. 같은 ID 다른 payload 거부. 서로 다른 20개 요청의 한도 경쟁, 동시 매도 초과 보유 거부, 음수 잔액 방지.
- 계좌·준비금 보존식 일치, 부분 매도/원가/실현손익, 원장 산식 불일치 검출과 무수정 조회, 피드백/돌아보기 수정 이력, 목록 pagination, 계좌별 분당 제한과 시간 경과 후 동일 요청 재시도.
- 권한 사칭/타 학급/비활성/회원 권한 회수/직접 Rules 접근 거부. 조회 계좌 미생성, 미래 가격 비노출, 미발행 뉴스와 효과 수치 비노출, DJ코인·포인트 문서 미생성.
- 시세 동시 생성 5회 → 공개 한 번/동일 버전. 중간 실패 → 전체 미공개/거래 차단. 전일 누락 → 누락일 보고 후 순서 복구. 오래된 날짜 재실행 → 현재 포인터 보존. 예약 뉴스 중복 작업과 다음날 멱등 재요청 통과.
- 브라우저: 홈 진입 요청 0회, 서버 계좌 저장, 체결 성공 후 응답만 유실시키고 새로고침·재시도하여 중복 미발생, 돌아보기·교사 피드백·설정·뉴스·중지/재개, 느린 응답 중 계정 전환, 학생/교사 반응형 390·768·1440px.
- `npm run check:securities-callable`: 실제 Auth/Functions/Firestore Emulator HTTP 검사 통과. ID token 검증, 미로그인 거부, 회원 연결, 타인 계좌/교사 사칭 거부, 계좌 지급과 동일 요청 재전송 확인.
- `npm run check`: 전체 통과(exit 0). 기존 교실·은행·마켓·일기·랭킹·게임·Rules 및 441개 과목 퀴즈 화면, 다른 작업에서 추가한 퀴즈 자동 종료/복귀 검사까지 포함했다.

- 최종 정적 검사: 426개 JS·인라인 스크립트·필수 경로 통과. 공유 렌더러 보완 뒤 단계 A 브라우저 회귀도 재확인했다.
- 최종 시각 확인: 하루치 종가는 한 점과 가격으로 표시하며, 학생 모바일 상세와 교사 설정 화면을 직접 확인했다. [학생 390px](../product/classroom-securities-b-2026-10-17/student-390.png), [학생 1440px](../product/classroom-securities-b-2026-10-17/student-1440.png), [교사 설정 1440px](../product/classroom-securities-b-2026-10-17/teacher-1440.png).

로그: `/tmp/securities-b-final.log`, `/tmp/securities-b-visual.log`, `/tmp/securities-b-acceptance.log`, `/tmp/securities-b-callable2.log`, `/tmp/securities-b-regression.log`. 초기 연결 검사 중 종가 문서 ID 내림차순 조회의 Emulator 오류를 date 필드 조회로 수정했고, HTTP 임시 Functions source 경로를 수정했다. 권한 거부 로그는 deny 검증에서 기대한 결과다. Node metadata lookup warning은 Emulator 검사 성공 여부와 별도로 출력됐다.

## 파일 범위

신규 서버: `functions/classroom/securities/{authorization,calendar,callables,contracts,domain,market-engine,schedules,service}.js`, `catalog.json`.

신규 클라이언트: `public/js/infrastructure/securities-repository.js`, `public/js/features/securities-server-controller.js`. 서버 컨트롤러는 운영 번들에 넣지 않고 전용 Emulator 화면에서만 로드한다.

기존 연결부: `functions/index.js`의 Emulator 한정 등록 블록, `public/js/features/securities-render.js`의 서버 데이터/동적 한도/단일 종가/교사 피드백 표시, 소스 빌드로 생성한 `public/js/app.bundle.js`, `package.json`의 B단계 검사·실행 명령. 기존 공유 파일을 과거 버전으로 되돌리지 않았다.

검사/실행: `tests/securities/{emulator-support,emulator.integration,callable.integration,repository.test,server.test,server-preview-bootstrap}.js`, `scripts/smoke/{run-securities-emulators,serve-securities-emulator,classroom-securities-server-browser}.js`.

## 운영 도입 전 남은 범위

- 실제 DJ코인 입출금(C), coin/djCoin 호환과 원자적 연결, 공급량 20·60·120일 평가 및 한도/순유출 경고 정책은 구현·승인하지 않았다.
- 실제 계정 화면에서 서버 repository/callable을 활성화하고 운영 Functions exports·스케줄러를 등록하는 작업, 운영 시장 초기화, 학급 시범은 G3 승인 범위다. 이번 Emulator용 HTTP 어댑터를 운영 인증으로 사용하면 안 된다.
- 시장 목록을 운영 scheduler에 주입할 방식과 운영 seed 보관/복구 절차는 배포 준비 시 확인한다. 현재 내부 작업은 명시된 시장만 처리하며 공개 학생 callable이 아니다.
- 공개된 일별 가격/원장/요청 기록을 수정하거나 계좌를 초기화·강제 청산하는 관리 기능을 만들지 않았다. 진단 후 운영 데이터 보정은 별도 계획·승인이 필요하다.
- 다른 에이전트의 배포 완료 여부와 운영본-전체 로컬 일치는 이번 작업에서 확인하거나 변경하지 않았다. G3에서 배포 범위와 출처를 다시 대조해야 한다.
