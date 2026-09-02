# Projects 자산·저작권·운영 안전 점검

점검일: 2026-09-02  
범위: `/Users/kdw/Projects`의 로드맵 6·8단계 대상. 로컬 파일·Git 추적 상태·문서·코드만 확인했다.

## 결론

로컬 개발은 계속해도 된다. 다만 아래 네 범주는 공개 추가·재배포·운영 변경 전에 멈춰야 한다.

1. Habbo/Sulake 및 Pixel Salvaje 유료 에셋
2. 출처가 복구되지 않은 낱말대전 사전·`dream-class` 아바타
3. 실명 선수 180명이 들어 있는 `kbo-owner`의 일반 공개
4. 학교·번호·닉네임을 저장하는 `seoul-heritage-main`의 현재 Firebase 구조

이번 작업에서는 파일·폴더·학생 기록·회원 정보·Firebase 데이터를 하나도 삭제하지 않았다. 규칙 배포, 원격 push, 사이트 deploy도 하지 않았다.

## 프로젝트별 판정

| 대상 | 판정 | 확인 결과 | 계속 작업할 때의 금지선 |
| --- | --- | --- | --- |
| `habboasset/housing` | 🔴 공개 추가 보류 | 추적 가구 198개와 별도로 미추적 66개가 있음. 66개는 `furni/*/` ignore로 보존했고 삭제하지 않음 | 미추적 에셋을 Git에 강제 추가하거나 에셋 팩으로 재배포하지 않음. 기존 공개 이력 정리는 별도 승인 필요 |
| `quiztown-room-proto` | 🟡 코드만 안전 | Pixel Salvaje 유료 에셋은 `assets/`로 ignore. 로컬 Git에는 코드·도구·문서만 보존 | `assets/` 추적·공개·복사 금지 |
| `asset-archive` | 🔴 로컬 보관 전용 | 유료/출처주의 원본과 2026-07-08 이전 Git bundle을 보유. `.gitignore`가 README 외 전체를 차단 | 삭제·이동·Git 초기화·클라우드 공개 금지. 복원은 별도 임시 폴더에서 수행 |
| `dream-class` | 🟡 이미지 재사용 보류 | `dist/`, `node_modules/`, `.env*` 차단. 아바타 이미지의 원본·라이선스 기록은 없음 | 출처 확인 전 아바타를 다른 프로젝트나 새 공개물에 복사하지 않음 |
| `kbo-owner` | 🟡 학급 검토용 | 로고·사진 없이 텍스트와 이니셜만 사용하고 `noindex, nofollow` 유지. 10구단 180명 실명과 창작 능력치 포함 | `noindex`를 접근 통제로 오해하지 않음. 일반 공개 전 가명화 또는 데이터 근거·이용 범위 검토 |
| `seoul-heritage-main` | 🔴 학생 데이터 운영 보류 | 로컬 규칙은 `users`/랭킹의 학교·번호·닉네임 공개 읽기와 넓은 일반 쓰기를 허용. 운영 적용 여부와 Kakao 허용 도메인은 콘솔 확인 필요 | UID 기반 권한 구조·최소수집·규칙 Emulator 검증 전 규칙/데이터 마이그레이션 금지 |
| `black-design/detect-design` | 🟢 현재 경계 양호 | `.env.local`은 ignore되고 Git 미추적. 라이선스가 없는 외부 참고 저장소는 공개 게임 저장소 밖에 있으며 코드·에셋을 포함하지 않음 | 참고 자료를 복사하지 않고 새로 작성한 코드·생성 이미지의 기록만 유지 |
| `wordbattle` | 🟡 사전 재배포 보류 | 국립국어원·`hunspell-dict-ko` 출처는 있으나 생성 스크립트·입력 버전이 없음. 파일의 CC BY-SA 2.0 KR 표기와 현재 상류 4.0 안내가 불일치 | 사전만 별도 복사·재배포하지 않음. 입력 커밋·생성 절차·적용 라이선스를 복구한 뒤 재생성 |
| `special-storage` | 🟢 attribution 유지 | OpenStreetMap 기반 CARTO Voyager 타일과 화면 attribution 사용 | 지도 제공자 표기를 제거하지 않음 |

## 비밀값·추적 상태

- `dream-class`, `life-diary`, `market-game`, `special-storage`, `detect-design`은 `.env` 계열을 ignore한다.
- `detect-design/.env.local`은 실제로 Git 미추적·ignore 상태다.
- `quiztown-room-proto/assets/`와 `housing`의 새 `furni/*/`는 Git staging 대상에 나타나지 않는다.
- Firebase 웹 설정과 Kakao JavaScript 키는 브라우저 앱 특성상 공개 식별자다. 보호 수단은 저장소 은닉이 아니라 Firebase Rules/Auth와 Kakao 콘솔의 허용 도메인 제한이다.

## 보류 항목의 승인 게이트

### 서울 문화유산

`/Users/kdw/Projects/seoul-heritage-main/SECURITY_AUDIT_2026-09-02.md`에 전환안을 기록했다. 기존 학생 데이터 백업·UID 마이그레이션·규칙 변경·삭제는 각각 사용자 승인 후 진행한다.

### KBO 구단주

현재는 학급 내부 팬 게임으로만 다룬다. 일반 공개를 유지할지, 가명 리그로 바꿀지 선택한 뒤 10단계 데이터 검수를 시작한다.

### 낱말 대전

`public/wordbattle/DICTIONARY_NOTICE.md`를 정본으로 사용한다. 기존 게임 코드는 유지했으며, 사전 데이터 자체는 수정·삭제하지 않았다.

### 유료·출처주의 에셋

에셋은 모두 제자리에 보존했다. 삭제 또는 공개 이력에서 제거하는 작업은 파일 유실·기존 배포 영향이 있으므로 이번 단계에서 실행하지 않았다.

## 이후 작업 가능 여부

- 9단계 `battle-school` 게임 깊이 보강: 진행 가능
- 10단계 `kbo-owner`: 시스템 설계는 가능, 실명 데이터 공개 방식은 먼저 결정 필요
- 11단계 `life-diary`: 생성 이미지에 프롬프트·도구·사용권 기록을 함께 남기면 진행 가능
- 운영 Firebase 규칙·학생 데이터·유료 에셋 공개 변경: 별도 승인 전 진행 불가
