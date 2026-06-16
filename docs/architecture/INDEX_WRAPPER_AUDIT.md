# public/index.html Wrapper Audit

2026-06-16 기준 `public/index.html`에 남은 wrapper와 orchestration 책임을 최종 분류한 문서다. 현재 목표는 `public/index.html`을 완전히 비우는 것이 아니라, 다중 터미널 작업 시 충돌 가능성이 큰 기능 로직을 feature/domain/application/infrastructure 모듈로 이동하고 app shell 통합 책임만 남기는 것이다.

## Current Boundary Status

- Direct Firebase/Storage/callable access in `public/index.html`: none for `httpsCallable`, `.collection(`, `storage.ref`, `.put(`.
- Direct Firebase/Storage access in `public/js/features/*-data.js` and `public/js/features/quiz-play.js`: none for the same audit patterns.
- Firebase/Storage/callable access is concentrated in `public/js/infrastructure/*-repository.js`.
- `public/index.html` still owns global app shell integration, script-order bootstrap, view entry wrappers, and cross-feature dependency factories.

## App-Shell-Only Wrappers

Keep these in `public/index.html` unless a larger app-shell migration is explicitly planned.

- View entry and routing glue:
  - `enterAppView`
  - `showTownView`
  - `showLoginView`
  - `showAdminView`
  - `showHomeView`
  - `showSchoolView`
  - `showSubjectView`
  - `showQuizSelectView`
  - `showQuizPlayView`
- Global refresh and freshness:
  - `refreshCurrentAppData`
  - `checkServerFreshness`
  - `startServerFreshnessPolling`
  - `setGlobalRefreshNeedsAttention`
- Auth destination and user-scope reset:
  - `initializeAuthUser`
  - `handleResolvedUserChange`
  - `openRestoredMemberDestination`
  - `resetUserScopedRuntimeData`
- Bootstrap assembly:
  - `getAppBootstrapControllerSections`
  - controller event factory wrappers such as `getCommonAppEvents`, `getSchoolControllerEvents`, and `getAdminControllerEvents`

## Feature-Owned But Acceptable Thin Wrappers

These are thin dependency factories or DOM adapters. Moving them is optional and should only happen when the owning feature is being changed.

- Ranking:
  - `getRankingDataDeps`
  - `getRankingRenderDeps`
  - `createRankingRepository`
  - `renderRankingBoards`
- Quiz:
  - `getQuizStartFlowDeps`
  - `getQuizPlayDeps`
  - `getQuizSessionStateDeps`
  - `getQuizRepositoryDeps`
- Profile/home:
  - profile image editor dependency factories
  - profile save dependency factories
- Shop/event/classroom/admin:
  - repository creation helpers
  - form/status adapters
  - render entry wrappers

## Move Only With Care

These contain cross-feature state or production-auth side effects. Do not move them just to reduce line count.

- Auth/member link flows that choose between admin and town destinations.
- `showHomeView`, `showRankingView`, `showShopView`, `showEventView`, and `showClassroomView` preload ordering.
- Room decor open/close and orientation guard.
- Admin initial view orchestration.
- Global refresh branching across active views.

## Next Safe Work

1. If a feature is changed, move only that feature's remaining dependency factory into its feature/usecase module with targeted tests.
2. Keep one integration owner for `public/index.html`.
3. Before any further app-shell extraction, run:
   - `npm run check`
   - authenticated browser smoke with the 4-8-23 test account.
4. Treat `public/index.html` as acceptable app shell while direct Firebase access remains zero and feature logic stays in owned modules.
