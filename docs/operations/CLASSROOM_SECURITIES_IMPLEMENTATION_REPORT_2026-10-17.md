# 우리반 증권소 단계 A 구현 보고서

최신 후속: [C·D 구현 및 4-8 교사 시범 배포 보고](CLASSROOM_SECURITIES_STAGE_CD_2026-10-18.md). 아래 내용은 해당 단계 완료 당시의 기록이다.

작성: 2026-10-17 (Asia/Seoul)
기준: `docs/product/CLASSROOM_SECURITIES_IMPLEMENTATION_PLAN_2026-10-17.md`

후속: 사용자의 B단계 승인 뒤 서버 연습 시장을 구현했다. 최신 결과는 [B단계 보고서](CLASSROOM_SECURITIES_STAGE_B_2026-10-17.md)를 참조한다. 아래 G1 대기 표현은 단계 A 완료 당시의 기록이다.

## 현재 결과

단계 A의 로컬 시제품을 구현했다. 우리 교실 → 경제 → 증권으로 진입하며, 실제 교실 HTML·경제 내비게이션·공통 스타일을 사용한다. 운영 기능이 활성화된 것은 아니다. localhost/127.0.0.1에서 `securitiesPreview=1`을 지정한 경우에만 메뉴가 나타난다. 미리보기 실행기는 Firebase SDK와 앱 인증 bootstrap을 로드하지 않는다.

- 12개 자체 가상 기업, 기업별 20거래일 합성 종가, 36개 교육용 뉴스(소문과 연결된 정정 포함).
- 시장 검색·정렬, 기업 상세·선형 차트·관련 뉴스·보유 수량, 시장/뉴스/내 계좌/투자일지.
- 버튼으로 연습 계좌를 명시적으로 시작하고 1,000 연습머니를 지급한다. 새로고침·계정 전환 시 초기화되는 메모리 상태이며 학생 저장소를 사용하지 않는다.
- 수량·이유 입력 → 주문 확인(금액·수수료·세금·예수금) → 최종 확인 → 체결 → 돌아보기 저장.
- 1/100 정수 금액, 수수료 반올림, 부분/전량 매도 원가 배분, 실현·미실현·누적 손익. 거래당 100주, 하루 3회, 수수료 차감 후 50% 비중 한도, 매수 이유 공백 제외 10~200자.
- 교사 역할 예시에서 거래 중지/재개(사유), 뉴스 작성, 합성 계좌·거래 이유·변경 기록 확인.
- 개장 전/거래 중/장 마감/휴장/시세 실패의 표시와 거래 차단을 검토용 선택기로 재현한다.
- 연습 계좌의 입출금 UI는 없으며 DJ코인 전환 불가 안내를 표시한다. 실제 지갑·랭킹 보상·운영 학생 정보에 접근하지 않는다.

## 실행과 재현

```sh
npm run build:app
npm run serve:securities
```

브라우저에서 `http://127.0.0.1:4177/securities-preview.html?securitiesPreview=1`을 연 뒤 경제 메뉴의 **증권**을 누른다. 처음 진입 전에는 합성 시세 파일도 읽지 않는다.

1. 기업 검색·뉴스를 둘러보고 **연습 계좌 시작**을 누른다.
2. 새싹식품 → 매수하기 → 1주와 10자 이상의 이유 입력 → 주문 확인 → 최종 확인.
3. 예수금 989.95, 평가액 10.00, 누적 손익 -0.05를 확인한다.
4. 투자일지에서 돌아보기를 저장하고 은행↔증권을 왕복한다.
5. 상단 검토 도구로 선생님 역할/휴장/시세 실패를 선택한다. **다른 합성 계정으로 전환**하면 이전 계좌·일지가 사라진다.

브라우저 smoke는 모든 외부 요청을 차단하고 실제 HTML에 합성 상태를 주입한다. UI에서 기존 마켓·은행을 탐색할 수 있으나 미리보기에서는 서버 경제 작업을 실행하지 않는다.

## 수정 범위

신규:

- `public/js/domain/securities-domain.js`: 정수 기반 순수 계산, 주문·한도 검증.
- `public/js/features/securities-state.js`: 메모리 상태와 세대 관리.
- `public/js/features/securities-render.js`: 학생·교사 시제품 화면.
- `public/js/features/securities-controller.js`: 진입 시 지연 로드, 주문 확인, 돌아보기, 계정 초기화.
- `public/classroom-securities.css`, `public/images/classroom-icons/securities.svg`: 화면과 경제 메뉴 표시.
- `fixtures/securities/market.json`, `scripts/build-securities-fixture.js`: 합성 자료와 브라우저용 생성기.
- `public/js/data/securities-fixture.js`: 생성된 합성 자료, 앱 번들에 포함하지 않고 증권 진입 때 읽는다.
- `tests/securities/domain.test.js`, `tests/securities/preview-bootstrap.js`, `scripts/smoke/classroom-securities-browser.js`, `scripts/smoke/serve-securities-preview.js`.

기존 연결부의 이번 수정:

- `public/index.html`: CSS 링크, 비활성 기본 메뉴, 증권 패널 각 1개 추가.
- `classroom-form.js`: 경제 그룹·숨김 조건·진입/이탈 연결.
- `classroom-workspace.js`: 기존 은행 옆으로 증권 버튼 이동, 활성 상태 동기화, 계정 컨텍스트 전달.
- `classroom-state.js`: 전체 계정 초기화 시 증권 상태 폐기.
- `classroom-usecases.js`: 증권 탭은 기존 지갑/경제/퀘스트 데이터 로더를 호출하지 않는다(기존 설정 로드는 유지).
- `scripts/build-app-bundle.js`: 합성 자료 생성기와 4개 증권 모듈 추가. `public/js/app.bundle.js`는 빌드로 재생성.
- `package.json`: `test:securities`, `smoke:securities`, `serve:securities` 및 전체 검사 연결.
- `scripts/smoke/classroom-loading-browser.js`: 메뉴 전체 DOM 수 대신 보이는 기존 메뉴 5개와 증권 숨김 상태를 검사.

시작 시 이미 교실·Functions·규칙 등 다수의 미커밋/미추적 변경이 있었다. HEAD 대비 전체 diff는 이번 작업만을 뜻하지 않는다. 기존 변경을 제거하거나 커밋하지 않았다. 이번 작업은 `functions/index.js`, `firestore.rules`, `firestore.indexes.json`을 수정하지 않았다.

## 검사

- `npm run test:securities`: 6개 통과. 계획서 5.1 검산, 출금 전후 손익 불변, 원가 배분·전량 매도·재매수, 소수/문자열/비정상 수량, 안전 정수, 수수료 반올림, 자산 비중/거래 횟수/시장 상태/시세 버전/계좌 상태/이유 검증, fixture 정합성, 증권 진입 로더 분리.
- `npm run smoke:securities`: 통과. 메뉴/계좌 명시 생성/지연 로드/검색/주문 2단계/오류/Escape·포커스/돌아보기/은행 왕복/역할 전환/계정 초기화/뉴스 HTML escape/휴장·실패/불러오기 실패 후 재시도/기능 꺼짐/자료 로딩 중 계정 전환과 늦은 응답 폐기. 390px 주문 확인 창도 가로 넘침 없음.
- 학생·교사 390px, 768px, 1440px: 가로 넘침 없음. 학생 화면 이미지를 직접 확인하고 경제 메뉴를 6개 동급 항목으로 정돈했다.
- `npm run check:static`: JavaScript 412개, 인라인 스크립트 1개, 필수 경로 9개 및 수학서바이버 검사 통과(추가 수정 후 전체 검사로 재확인).
- `npm run check`: 최종 전체 통과(exit 0). 정적 검사, 증권 계산·브라우저, 기존 domain/application/infrastructure, 과목 퀴즈·분수·피자·우주·워드봄·과일벨·성장, Firestore/Storage Rules 및 관련 Emulator 통합, 공개 shell, 교실·로딩·일기, 과목 퀴즈 441개 화면 검사를 모두 완료했다. 최초 실행의 숨김 메뉴 개수 assertion은 위 설명대로 수정하여 전체 재실행했다.
- 실행 로그: 로컬 `/tmp/securities-check-final.log`. 로컬 미리보기 서버 HTTP 응답과 Firebase bootstrap 미포함도 확인했다.

화면 증거: [학생 390px](../product/classroom-securities-2026-10-17/student-390.png), [학생 1440px](../product/classroom-securities-2026-10-17/student-1440.png), [교사 1440px](../product/classroom-securities-2026-10-17/teacher-1440.png).

기존 `admin-render.js:545`의 줄 끝 공백이 `git diff --check`에서 보고된다(생성 번들에도 반영). 이번 증권 변경과 무관하여 수정하지 않았다.

## G1 승인용 구체적 설계

다음 단계는 실제 재화와 분리된 **서버 연습 시장** 구현이다. 승인이 필요한 이유는 저장소 AGENTS.md의 “보안 규칙이나 학생 데이터에 영향을 주는 변경은 영향과 검증 방법을 먼저 설명하고 사용자 확인 후 진행한다”와 계획서 12절 G1이다.

### 저장 경로와 보존

신규 루트는 `classrooms/{classId}/securitiesMarkets/{marketId}`이며 시장 생성 시 `mode: practice`를 고정한다. 기존 학급 문서/지갑 스키마를 교체하지 않는다. 코드 검색에서 기존 증권 서비스·경로 사용을 찾지 못했다. 운영 DB의 경로 존재 여부는 조회하지 않았다.

| 경로 | 저장할 내용 | 접근 |
| --- | --- | --- |
| 시장 루트, companies, dailyPrices | 기능 상태·설정 버전·기업·공개 시세 | 검증된 query로만 공개 필드 반환 |
| news | 초안/예약/발행 뉴스, 공개 시각, 적용일, 정정 연결 | 학생은 발행된 뉴스만 |
| privateEngine | 결정적 생성 입력·seed 참조·실행 감사 | 서버 전용 |
| accounts/{memberUserId} | 연습 예수금, 초기지급, 비용/손익, revision | 본인 및 담당 교사 |
| accounts 아래 positions/dailyLimits | 보유 수량/원가와 일별 횟수 | 본인 및 담당 교사 |
| accounts 아래 operations/ledger | 요청 payloadHash·확정 결과, 금액·수량·원가 전후 기록 | 원장·멱등 기록 보존, TTL 삭제 없음 |
| accounts 아래 journal | 매수 이유, 돌아보기, 교사 피드백과 수정 이력 | 본인 및 담당 교사 |
| treasury/current, adminAudit | 수수료 집계, 설정 변경 사유·전후 상태 | 교사/서버 전용 |

### API와 권한

- `classroomSecuritiesQuery`: market/company/news/account/ledger/journal. 조회 시 계좌 생성·보상·시세 생성 없음. 목록은 최대 50개와 검증된 cursor, 계좌 목록은 담당 교사 전용.
- `classroomSecuritiesAction`: openAccount/buy/sell/reflect. practice 입출금은 거부. 각 변경에 UUID 요청 ID와 정규화 payload hash. 동일 요청은 성공 결과 재사용, 다른 내용 재사용은 거부.
- `classroomSecuritiesAdminAction`: 설정·거래 중지/재개·뉴스·감사 조회. 담당 학급 관리 권한, 변경 사유, expected revision 검사.
- `generateDailyPrices`, `publishScheduledNews`: 학생 callable로 공개하지 않는 내부 작업. 서버 KST 시계와 결정적 seed를 주입하고 생성 완료 후 가격 포인터만 원자 전환.

기존 `assertLinkedMemberAuth`는 회원 활성 상태와 authUid 연결을 확인한다. 이후 `loadClassroomSettingsForTransaction` 및 `assertMemberCanEnterClassroom`으로 학급을 검사하고 교사 작업에는 담당 학급 관리 권한을 추가한다. 없는 학급을 기본 정규화 설정으로 오인하지 않도록 `exists` 확인을 추가할 예정이다. query와 action에 같은 검증을 적용하며 오류로 타인의 존재 여부를 노출하지 않는다.

현재 Rules의 `match /classrooms/{classId}` 허용은 해당 학급 문서에 한정되고, 신규 하위 경로는 맨 아래 재귀 deny에 걸리는 구조다. 아직 새 경로 Rules 행동 검증은 하지 않았다. G1 승인 후 Emulator에서 비인증·본인·타인·교사 모두 직접 접근 거부를 검증한다. 필요 시 신규 증권 경로에 한정한 명시적 deny만 추가한다. 실제 쿼리에 필요한 인덱스가 확인되면 목록을 별도로 기록한다.

### Transaction 및 Emulator 인수 범위

새 주문에서 권한, 요청 기록, 시장 설정·시세 버전, 계좌·전체 12종목 보유, 일별 한도, 준비금 등을 모두 읽은 뒤 예수금/보유/원가/원장/한도/멱등 결과를 한 transaction으로 쓴다. 인증 후 기존 성공 요청을 먼저 찾고 다음날 재시도도 원래 결과를 돌려준다. UI 계산은 주문 미리보기용이며 서버가 다시 계산한다.

`demo-` Emulator와 합성 사용자만 사용하여 20회 중복 요청, payload 충돌, 동시 매수·매도, 응답 유실 재시도, 가격 변경, 권한 사칭, 비활성 회원, 타 학급, 비발행 뉴스/미래가격/seed 비노출, 조회 무쓰기, KST 시간 경계, 주말/휴장, 전일 시세 누락·중간 실패·재실행을 검증한다. 운영 프로젝트 fallback은 금지한다.

### DJ코인 영향과 기존 코드 관찰

G1의 서버 연습 시장에는 DJ코인 차감/지급이 없다. `userEconomy`와 `studentWallets`를 쓰지 않는다. C단계의 실제 지갑 연결은 별도 G2 승인 범위다.

현재 `exchangeClassroomCurrency`는 `djCoin ?? coin ?? 0`으로 읽는다. 일부 지갑 갱신은 `FieldValue.increment`를 사용하므로 `coin`만 존재하는 레거시 문서에서는 읽은 canonical 잔액과 갱신 결과가 어긋날 가능성이 있다. 요청 범위 밖인 기존 환전은 수정하지 않았다. 증권 실제 재화 연결 시에는 canonical 잔액을 transaction으로 읽고 새 `djCoin` 절대값을 쓰는 정책과 기존 마켓 구매 동시 실행을 함께 검증해야 한다. 기존 문서 일괄 마이그레이션이나 환전 callable 재사용은 하지 않는다.

## 미완료와 다음 확인 사항

- B 서버 권한·저장·멱등성·원장·시장 엔진·예약 뉴스·교사 설정·Emulator 검증은 G1 대기. 시제품의 클라이언트 제한은 운영 보안 구현을 대신하지 않는다.
- 시간 선택기는 고정된 수업 예시이며 실제 KST 거래 시간 계산·휴일 캘린더·가격 생성 복구가 아니다.
- 교사 UI는 변경 사유/중지·재개/뉴스/합성 계좌 예시를 제공한다. 실제 학생 목록 pagination, 설정 revision, 정정 편집, 원장 불일치 서버 보고서는 B 단계다.
- 입출금 원자 처리, `coin` 호환, 시장 순유출/공급량 20·60·120일 시뮬레이션, 시범 학급·한도는 C/G2 대상이다.
- 운영 배포본과 전체 작업 트리의 일치는 이번에 확인하지 않았다. G3에서 대상 파일·Functions·규칙·인덱스와 기존 배포 출처를 대조해야 한다.
- 배포, 시장 초기화, 운영 학생 데이터 읽기/쓰기, git commit/push는 수행하지 않았다.

다음 승인 요청: 위 경로·권한·API로 **합성 데이터 Emulator 전용 서버 연습 시장(B)**을 구현하고 필요한 신규 경로 deny 및 권한 테스트를 준비해도 되는지 확인한다. 실제 DJ코인 연결·운영 데이터 쓰기·원격 배포는 이 승인에 포함하지 않는다.
