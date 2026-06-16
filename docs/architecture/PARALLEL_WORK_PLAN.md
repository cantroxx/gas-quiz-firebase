# Parallel Work Plan

This document records the current parallel-work rules for the stricter clean-architecture migration.

## Completion State

- `public/index.html` is still the main app shell and integration owner, but feature render/session/repository boundaries are broader and controller binding metadata is delegated to `public/js/app/bootstrap.js`.
- Extracted modules already exist under `public/js/core`, `public/js/data`, `public/js/domain`, `public/js/application`, `public/js/infrastructure`, `public/js/features`, and `public/js/app`.
- Browser smoke automation exists under `scripts/smoke`.
- Project documents and scripts are grouped by domain.
- Current architecture round has added application usecases for admin, account, classroom, event, home, profile, quiz, ranking, and shop.
- Infrastructure repositories currently exist for account, admin, classroom, event, home, quiz, ranking, and shop.

## Ownership Rules

- Admin: `public/js/features/admin-*`, `public/js/application/admin-usecases.js`, `public/js/infrastructure/admin-repository.js`, admin sections in `public/index.html`, admin callable docs.
- Account/login: `public/js/domain/account-domain.js`, `public/js/features/account-*`, `public/js/application/account-usecases.js`, `public/js/infrastructure/account-repository.js`, member auth/session/linking wrappers in `public/index.html`.
- Profile/home: `public/js/features/home-*`, `public/js/application/home-usecases.js`, `public/js/application/profile-usecases.js`, `public/js/infrastructure/home-repository.js`, profile save/upload/title/badge wrappers in `public/index.html`.
- Shop/room: `public/js/domain/shop-domain.js`, `public/js/features/shop-*`, `public/js/application/shop-usecases.js`, `public/js/infrastructure/shop-repository.js`, `public/room.js`, `public/room.css`, room/shop write wrappers in `public/index.html`.
- Quiz: `public/js/domain/quiz-domain.js`, `public/js/features/quiz-*`, `public/js/application/quiz-usecases.js`, `public/js/infrastructure/quiz-repository.js`, `public/js/data/quiz-catalog.js`, remaining quiz-play wrappers in `public/index.html`.
- Ranking: `public/js/domain/ranking-domain.js`, `public/js/features/ranking-*`, `public/js/application/ranking-usecases.js`, `public/js/infrastructure/ranking-repository.js`, ranking plaza/profile ranking wrappers in `public/index.html`.
- Classroom/event: `public/js/domain/classroom-domain.js`, `public/js/domain/event-domain.js`, `public/js/features/classroom-*`, `public/js/features/event-*`, `public/js/application/classroom-usecases.js`, `public/js/application/event-usecases.js`, `public/js/infrastructure/classroom-repository.js`, `public/js/infrastructure/event-repository.js`.
- App shell/view/bootstrap: `public/js/features/app-view.js`, `public/js/features/app-events.js`, `public/js/app/bootstrap.js`, exclusive sections of `public/index.html`.
- Verification/docs: `scripts/smoke`, `docs/operations`, `docs/architecture`.

When using multiple terminals, keep each terminal inside one ownership area unless the task explicitly requires a shared boundary change.

## Parallel Editing Rules

- Only one terminal should edit `public/index.html` at a time.
- UI-only work should stay in `public/styles.css`, `*-render.js`, and `*-controller.js` files unless a new DOM hook is required.
- Usecase work should stay in `public/js/application/*-usecases.js`.
- Firebase/callable adapter work should stay in `public/js/infrastructure/*-repository.js`, `public/js/features/*-data.js`, or `functions/index.js`.
- Quiz-play work should stay in `public/js/features/quiz-*`, `public/js/application/quiz-usecases.js`, `public/js/infrastructure/quiz-repository.js`, and quiz data/catalog files unless the task explicitly changes app navigation.
- Smoke/test work should stay in `scripts/smoke` and `docs/operations`.
- If a task needs both UI and data changes, split it into two commits or make one terminal own the whole feature boundary.
- Before merging parallel work, run `npm run check`; for user-visible runtime changes, also run authenticated browser smoke with the 4-8-23 test account.

## Suggested Terminal Split

- Terminal A, UI: `public/styles.css`, `public/js/features/*-render.js`.
- Terminal B, quiz: `public/js/domain/quiz-domain.js`, `public/js/application/quiz-usecases.js`, `public/js/features/quiz-*`, `public/js/infrastructure/quiz-repository.js`, `public/js/data/quiz-catalog.js`.
- Terminal C, data/backend: `public/js/infrastructure/*-repository.js`, `public/js/features/*-data.js`, `functions/index.js`, Firestore/Storage rules.
- Terminal D, verification/docs: `scripts/smoke`, `docs/architecture`, `docs/operations`.
- Terminal E, app shell: `public/index.html`; keep this exclusive because it still owns global state, caches, view routing, and event binding.

## Current Parallel-Safe Areas

- Domain tests and pure rules: safe for parallel work when the edited domain file is owned by one terminal.
- Application usecases: safe for parallel work by feature area.
- Infrastructure repositories: safe for parallel work by repository file.
- Presentation render/controller files: safe for UI-focused work by feature area.

## Shared Boundaries Requiring Integration Owner

- `public/index.html`: one integration owner only.
- `public/js/app/bootstrap.js`: one integration owner only.
- `package.json`: one integration owner when changing test scripts.
- `scripts/smoke/browser-smoke-test.js`: one verification owner when adding required globals or new user flows.

## Window/Global Exposure Rules

- Current browser modules expose one namespaced API per file, such as `window.DJ48QuizPlay`, `window.DJ48AccountState`, or `window.DJ48EventRepository`.
- Domain, application, and infrastructure modules that need Node tests may use the existing root/global wrapper pattern, but should still expose only their module API.
- Do not add loose globals or feature state directly to `window`; put mutable state in the matching `*-state.js` module.
- New repository adapters should receive Firebase accessors through `create*Repository(deps)` instead of reading Firebase globals directly.
- `public/index.html` remains the temporary integration shell that reads these module APIs. New feature work should reduce direct `window.DJ48...` calls in `index.html` by grouping deps or moving orchestration into application/controller modules.
- Script order changes are app-shell work and require the integration owner plus `npm run check:static` at minimum.

## Script Load Order Rules

`public/index.html` still loads browser modules with ordered `<script>` tags, so load order is part of the app-shell contract.

- Firebase compat SDK and `/__/firebase/init.js` must load before `public/js/core/firebase.js` and before any runtime code that asks for Firebase services.
- Static data and core helpers should load before feature modules that read them.
- Domain modules should load before feature/application modules that delegate pure rules to the domain.
- State, data, repository, render, controller, and usecase files may be ordered by feature, but a file must appear before any later file or inline wrapper that reads its `window.DJ48...` API.
- Repositories should load before the inline `public/index.html` app shell creates repository adapters.
- `public/js/app/bootstrap.js` should load before the inline app shell calls `window.DJ48AppBootstrap.startApp`.
- When adding a new module, add the `<script>` tag next to the owning feature group rather than at the end of the list, and run `npm run check:static`.

## Required Checks

Before committing code movement:

```bash
npm run check:static
```

Before pushing/deploying user-visible changes:

```bash
npm run check
```

Authenticated smoke remains manual because it needs a test account:

```bash
SMOKE_GRADE=4 SMOKE_CLASS=8 SMOKE_NUMBER=23 SMOKE_PASSWORD='1111' npm run smoke:browser
```

## Completed Sequence

### Earlier Rounds

1. Stabilize verification.
   - Keep `npm run check:static` as the fast local gate.
   - Keep `npm run check` as static check plus public browser smoke.
2. Admin refactor, phase 2A.
   - Split admin data/load helpers first.
   - Split admin read-only render helpers after data/load helpers.
   - Keep callable/save execution wrappers stable.
   - Started with `public/js/features/admin-data.js` for read-only admin callable load helpers.
   - Continued with `public/js/features/admin-render.js` for admin audit, quiz quality, member summary/list, and room catalog list render helpers.
3. Admin refactor, phase 2B.
   - Split admin save/callable flows one group at a time.
   - Run admin browser smoke after each deployed slice.
   - Started with low-risk admin setting/catalog save callable wrappers in `public/js/features/admin-data.js`.
   - Continued with admin member action, wallet adjust, and class-admin permission callable wrappers.
   - Added admin member detail read wrapper to remove the last direct admin member detail callable from `public/index.html`.
   - Moved admin member detail modal rendering into `public/js/features/admin-render.js`.
   - Moved admin external quiz row and feature flag quiz-toggle rendering into `public/js/features/admin-render.js`.
   - Moved admin form/input helpers into `public/js/features/admin-form.js`.
   - Moved admin status DOM updates and admin save/action error-message mapping into `public/js/features/admin-form.js`.
4. Account/login refactor.
   - Split login/signup/password/session restore only after admin is stable.
   - Started with low-risk account form/status helpers in `public/js/features/account-form.js`.
   - Moved account callable wrappers into `public/js/features/account-data.js`.
   - Moved account identity/profile normalization helpers into `public/js/features/account-data.js`.
   - Moved linked-member hint storage and Firestore restore lookup helpers into `public/js/features/account-data.js`.
   - Moved anonymous sign-in helper into `public/js/features/account-data.js` while keeping auth lifecycle orchestration in `public/index.html`.
   - Moved member link payload validation, register/login callable selection, and linked profile loading helpers into `public/js/features/account-data.js`.
   - Moved password-change and nickname-update validation/callable helpers into `public/js/features/account-data.js`.
   - Moved restored-member destination selection into `public/js/features/account-data.js`; `public/index.html` still owns auth listener orchestration.
   - Moved auth state callback handling and anonymous-auth initialization flow helpers into `public/js/features/account-data.js`; `public/index.html` still owns app state variables and UI callbacks.
   - Moved account lifecycle state-decision helpers for restored profiles, resolved user changes, and browser unlink into `public/js/features/account-data.js`; `public/index.html` still applies app state mutations.
   - Moved account/profile error-message mapping and member-link error append rendering into `public/js/features/account-form.js`.
   - Moved member-link click-flow UI helpers for button busy state, pending/success messages, password-reset prompts, required-password-change waiting, and destination selection into `public/js/features/account-form.js`.
5. Shop/room write-flow refactor.
   - Split purchase, inventory, room settings, and economy refresh.
   - Added `public/js/features/shop-data.js` for shop purchase callable and room item selection Firestore write helpers.
   - Moved shop purchase and room item save error-message mapping into `public/js/features/shop-data.js`.
   - Moved shop item, asset catalog, user economy, and room settings normalization helpers into `public/js/features/shop-data.js`.
   - Moved shop item, asset catalog, economy, inventory, and room settings Firestore read helpers into `public/js/features/shop-data.js`; `public/index.html` still owns caches and render refresh.
   - Moved shop cache fallback/result helper logic into `public/js/features/shop-data.js`; `public/index.html` still owns the actual cache variables.
6. Profile/account detail refactor.
   - Split nickname, profile image, ranking message, title/badge orchestration.
   - Moved profile ranking-message, profile-image, and selected-title update payload helpers into `public/js/features/account-data.js`.
   - Moved profile image, ranking message, and selected-title Firestore save helpers into `public/js/features/account-data.js`.
   - Moved profile image upload validation and editor state-building helpers into `public/js/features/account-data.js`.
   - Moved home owned-item card rendering into `public/js/features/home-render.js`.
   - Moved profile card DOM rendering into `public/js/features/home-render.js`.
   - Added `public/js/features/home-data.js` for home profile/title/badge model-building helpers.
   - Moved profile image search result rendering into `public/js/features/home-render.js`.
   - Moved profile image editor modal UI helpers into `public/js/features/home-render.js`.
   - Moved profile image Storage upload and save orchestration helpers into `public/js/features/account-data.js`.
7. Classroom/event refactor.
   - Completed relatively independent classroom and event flow split.
   - Added `public/js/features/event-render.js` for event plaza quest, class mission, and season event card rendering.
   - Added `public/js/features/event-data.js` for event loading/progress render data, progress callable, reward claim callable, and reward claim error messages.
   - Moved event section render orchestration into `public/js/features/event-render.js`.
   - Added `public/js/features/classroom-data.js` for classroom quest/settings normalization and classroom settings Firestore read helper.
   - Moved classroom progress, wallet, gem progress, student cards, economy board, and teacher review read helpers into `public/js/features/classroom-data.js`.
   - Added `public/js/features/classroom-render.js` for classroom role, review, quest, gem, student, job, shop, and routine card rendering.
   - Moved classroom section render orchestration into `public/js/features/classroom-render.js`.
   - Removed unused classroom data wrapper functions from `public/index.html`.
   - Added `public/js/features/classroom-form.js` for classroom status updates, form value readers, and form reset helpers.
   - Moved classroom gate unlock, entry-code status, and tab activation DOM helpers into `public/js/features/classroom-form.js`.
   - Moved classroom teacher save callables for quests, badge campaigns, jobs, and shop items into `public/js/features/classroom-data.js`.
   - Moved classroom student economy actions, routine save, quest completion, and quest review callables into `public/js/features/classroom-data.js`.
   - Moved classroom selected badge callable into `public/js/features/classroom-data.js`.
   - Consolidated classroom, event progress, and user economy cache reset helpers in `public/index.html`.
   - Removed unused classroom render wrapper functions from `public/index.html`.
8. Final cleanup.
   - Updated docs, ran full smoke, and declared the second clean-architecture round closed.

### Strict Clean-Architecture Round

1. Added quiz application usecases and tests.
2. Added quiz repository adapter and tests.
3. Added admin application usecases and tests.
4. Added profile write usecases and tests.
5. Added account repository adapter and tests.
6. Grouped bootstrap controller dependencies by feature section.
7. Updated ownership rules and verification guidance.
8. Hardened quiz completion browser smoke checks for practice/ranking persistence status and completion-card structure.
9. Moved Firebase quiz question reads/builders into `public/js/infrastructure/quiz-repository.js`.
10. Moved quiz session question assembly into `public/js/application/quiz-usecases.js`.
11. Added `public/js/features/quiz-render.js` for quiz select/school/mode/Pokemon hub and quiz play DOM adapters.
12. Moved popular quiz usage rules into `public/js/domain/quiz-domain.js`.
13. Added `public/js/features/quiz-popular-session.js` for popular usage session/timer state.
14. Split `getQuizPlayDeps()` into smaller feature-specific dependency factories.
15. Thinned quiz save/reward/leave-session wrappers through `public/js/features/quiz-flow.js`.
16. Moved profile image editor state into `public/js/features/home-state.js`.
17. Added home read repository and application usecase coverage.
18. Added shop/room repository and grouped shop cache accessors.
19. Added admin repository and moved admin settings caches into `public/js/features/admin-state.js`.
20. Added classroom repository and switched classroom Firebase/callable paths in `public/index.html` to the adapter.
21. Added event repository and switched event callable paths in `public/index.html` to the adapter.
22. Moved profile ranking rank-context Firestore query into `public/js/infrastructure/ranking-repository.js`.
23. Moved account auth lifecycle state into `public/js/features/account-state.js`.
24. Delegated bootstrap controller bind metadata to `public/js/app/bootstrap.js`.
25. Moved event and admin callable implementations into their repository adapters.
26. Split event bootstrap event-object assembly and centralized app view entry dependencies in `public/index.html`.
27. Documented current `window.DJ48...` exposure rules for parallel work.
28. Documented current ordered `<script>` loading rules for app-shell work.
29. Moved classroom student-card callable reads into `public/js/infrastructure/classroom-repository.js`.
30. Split shop bootstrap event-object assembly out of inline app-shell setup.
31. Moved profile image preview orchestration into `public/js/features/home-controller.js`.
32. Moved quiz progress text flow into `public/js/features/quiz-flow.js`.
33. Removed unused ranking render wrappers from `public/index.html`.
34. Moved profile ranking-message Firestore write into `public/js/infrastructure/profile-repository.js`.
35. Stabilized optional profile write smoke and rechecked read-only admin smoke policy.
36. Moved classroom read paths into `public/js/infrastructure/classroom-repository.js`.
    - Covered economy board, wallet, gem progress, teacher review items, and quest progress reads.
    - Kept classroom write/callable paths delegated to `public/js/features/classroom-data.js` until each path gets targeted tests.
37. Moved selected-title ownership check and Firestore write into `public/js/infrastructure/profile-repository.js`.
38. Moved shop purchase callable execution into `public/js/infrastructure/shop-repository.js`.
39. Split remaining bootstrap controller event groups into feature-specific helper factories in `public/index.html`.
    - Added common, classroom, school, home, admin, and account event helper groups.
40. Moved profile image search flow into profile usecases and repository.
    - `public/index.html` now passes DOM/status dependencies and delegates search orchestration.
41. Split quiz start-flow dependency assembly into `getQuizStartFlowDeps()` in `public/index.html`.
42. Moved profile image candidate selection and upload-preview orchestration into `public/js/application/profile-usecases.js`.
43. Moved classroom selected-badge, routine, auto-quest, and review-progress callable writes into `public/js/infrastructure/classroom-repository.js`.
44. Moved classroom teacher write/economy/manual quest progress paths into `public/js/infrastructure/classroom-repository.js`.
45. Moved profile image editor open/close orchestration into `public/js/features/home-controller.js`.
46. Moved quiz submit dependency assembly into `public/js/features/quiz-flow.js`.
47. Moved room item selection Firestore write into `public/js/infrastructure/shop-repository.js`.
48. Moved admin initial view load orchestration into `public/js/application/admin-usecases.js`.
49. Moved classroom settings read into `public/js/infrastructure/classroom-repository.js`.
50. Rechecked remaining `public/index.html` direct Firebase access points for the next cleanup round.
51. Moved popular quiz usage status/update callables into `public/js/infrastructure/quiz-repository.js`.
52. Moved quiz question render callback assembly into `public/js/features/quiz-flow.js`.
53. Moved title catalog Firestore read into `public/js/infrastructure/home-repository.js`.
54. Moved public notice board Firestore read into `public/js/infrastructure/admin-repository.js`.
55. Moved room settings member-id migration into `public/js/infrastructure/shop-repository.js` and removed unused migration helpers from `public/index.html`.
56. Moved public feature flags, external quizzes, and server freshness Firestore reads into `public/js/infrastructure/admin-repository.js`.
57. Moved practice record correct-id read into `public/js/infrastructure/quiz-repository.js`.
58. Reduced `public/index.html` direct Firebase callable/collection access to zero matches for `httpsCallable` and `.collection(`.

## Recommended Next Goals

1. Continue reducing `public/index.html` by moving remaining feature-specific orchestration into feature/application modules.
   - First candidates: profile image editor save/upload adapter boundary, quiz timer/result orchestration wrappers, and remaining account lifecycle/app-view wrappers.
   - Keep one integration owner for `public/index.html`.
2. Continue moving Firebase-heavy logic out of `*-data.js` into repository adapters when touching each feature.
   - Highest remaining candidates are profile image editor save/upload paths and any `*-data.js` helpers that still perform Firebase access outside repositories.
   - Smaller candidates: shop read-only cache sources and account lifecycle helpers that still sit in older feature-data modules.
3. Keep optional write smoke flows targeted instead of required gates.
   - Required default smoke remains the authenticated practice/ranking/home/features flow.
   - Optional profile write smoke is stabilized for ranking-message save/restore but still writes production profile data, so run it only with a dedicated smoke account.
   - Admin write smoke must stay emulator/test-project/dry-run or exact-restore only.
4. Continue bootstrap and app-shell reduction by moving dependency groups and callback orchestration behind usecase/controller helpers once callbacks no longer depend on local-only variables.
5. Keep the same validation gate:
   - `npm run check`
   - authenticated browser smoke with the 4-8-23 test account when user-visible runtime code changes.

## Parallel Terminal Shape

- Terminal A, UI/presentation: `public/styles.css`, `public/js/features/*-render.js`, `public/js/features/*-controller.js`.
- Terminal B, quiz/ranking: `public/js/domain/quiz-domain.js`, `public/js/application/quiz-usecases.js`, `public/js/features/quiz-*`, `public/js/infrastructure/quiz-repository.js`, ranking domain/usecase/repository files.
- Terminal C, data/repository/backend: `public/js/infrastructure/*-repository.js`, `public/js/features/*-data.js`, `functions/index.js`, Firestore/Storage rules. Prefer one repository file per terminal.
- Terminal D, verification/docs: `scripts/smoke`, `tests`, `docs/architecture`, `docs/operations`.
- Terminal E, app shell integration: `public/index.html`, `public/js/app/bootstrap.js`; keep this exclusive and reserve it for dependency grouping, view routing, and bootstrap object assembly.

Do not run concurrent edits against `public/index.html` unless each terminal owns clearly separate line ranges and a final integration pass is planned.

## Next Execution Order

1. Move profile image editor save/upload adapter details further behind `profile-usecases` and `profile-repository`.
2. Move quiz timer/result orchestration wrappers from `public/index.html` into `quiz-flow` where callback dependencies are stable.
3. Audit remaining `*-data.js` functions and classify each as domain helper, presentation helper, repository candidate, or removable legacy wrapper.
4. Move any remaining Firebase-heavy `*-data.js` implementation into the matching repository.
5. Recheck `public/index.html` for direct Firebase access and broad app-shell state coupling.
6. Add or extend targeted tests for each moved repository/usecase path before broad smoke.
7. Re-run `npm run check` and authenticated browser smoke.
8. Commit/push/deploy only when explicitly requested and smoke passes.
