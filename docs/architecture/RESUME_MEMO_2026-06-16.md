# 클린 아키텍처 리팩터링 재개 메모 (2026-06-16 기준)

> 원래 AGENTS.md의 "임시 재개 메모" 절에 있던 내용을 2026-07-07 정리 작업에서 이 파일로 옮겼다.
> 당시 클린 아키텍처 리팩터링 라운드 57~70을 마친 시점의 작업 스냅샷이다.

* 2026-06-16 기준 마지막 완료 묶음은 엄격한 클린 아키텍처 라운드 57~70 판단 진행이다.
* 완료된 마지막 리팩터링/감사 정리 커밋은 `6ea4dd2 docs: finalize architecture migration guidance`이며, 작업 트리는 최종 재개 메모 갱신 후 깨끗한 상태로 종료한다.
* 완료 범위:
  * `public/index.html` 남은 wrapper를 `docs/architecture/INDEX_WRAPPER_AUDIT.md`에 최종 분류
  * app-view 단순 delegation wrapper 제거
  * 남은 auth/view/preload orchestration은 app-shell-only 또는 move-with-care로 판정
  * `public/index.html`의 직접 `httpsCallable` 및 `.collection(` 접근 0건 재확인
  * `public/js/features/*-data.js`와 `public/js/features/quiz-play.js`의 직접 Firebase/Storage 접근 제거 확인
  * 병렬 작업 계획과 클린 아키텍처 목표 문서를 최종 감사 기준으로 갱신
* 마지막 검증:
  * `npm run check:static` 통과
  * `npm run check` 통과
  * `SMOKE_GRADE=4 SMOKE_CLASS=8 SMOKE_NUMBER=23 SMOKE_PASSWORD='1111' npm run smoke:browser` 운영 사이트 인증 smoke 통과
* 다음 작업 기준 문서는 `docs/architecture/PARALLEL_WORK_PLAN.md`이다.
* 다음 추천 방향은 새 기능/수정 발생 시 `docs/architecture/INDEX_WRAPPER_AUDIT.md` 기준으로 해당 feature-owned wrapper만 국소 이동하고, app-shell-only wrapper는 유지하는 것이다.
* 선택형 profile write smoke는 ranking-message 저장/복원 기준으로 안정화했지만 생산 프로필 데이터를 쓰므로 전용 smoke 계정에서만 실행한다. admin write smoke는 emulator/test-project/dry-run 또는 exact-restore 조건이 없으면 금지한다.
