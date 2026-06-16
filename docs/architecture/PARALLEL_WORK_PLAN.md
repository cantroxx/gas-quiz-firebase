# Parallel Work Plan

This document records the current parallel-work rules for the stricter clean-architecture migration.

## Completion State

- `public/index.html` is still the main app shell and state owner, but controller dependency binding is grouped by feature section through `getAppBootstrapControllerSections()`.
- Extracted modules already exist under `public/js/core`, `public/js/data`, `public/js/domain`, `public/js/application`, `public/js/infrastructure`, `public/js/features`, and `public/js/app`.
- Browser smoke automation exists under `scripts/smoke`.
- Project documents and scripts are grouped by domain.
- Current architecture round has added application usecases for admin, account, classroom, event, home, profile, quiz, ranking, and shop.
- Infrastructure repositories currently exist for account, quiz, and ranking.

## Ownership Rules

- Admin: `public/js/features/admin-*`, `public/js/application/admin-usecases.js`, admin sections in `public/index.html`, admin callable docs.
- Account/login: `public/js/domain/account-domain.js`, `public/js/features/account-*`, `public/js/application/account-usecases.js`, `public/js/infrastructure/account-repository.js`, member auth/session/linking wrappers in `public/index.html`.
- Profile/home: `public/js/features/home-*`, `public/js/application/home-usecases.js`, `public/js/application/profile-usecases.js`, profile save/upload/title/badge wrappers in `public/index.html`.
- Shop/room: `public/js/domain/shop-domain.js`, `public/js/features/shop-*`, `public/js/application/shop-usecases.js`, `public/room.js`, `public/room.css`, room/shop write wrappers in `public/index.html`.
- Quiz: `public/js/domain/quiz-domain.js`, `public/js/features/quiz-*`, `public/js/application/quiz-usecases.js`, `public/js/infrastructure/quiz-repository.js`, `public/js/data/quiz-catalog.js`, remaining quiz-play wrappers in `public/index.html`.
- Ranking: `public/js/domain/ranking-domain.js`, `public/js/features/ranking-*`, `public/js/application/ranking-usecases.js`, `public/js/infrastructure/ranking-repository.js`, ranking plaza/profile ranking wrappers in `public/index.html`.
- Classroom/event: `public/js/domain/classroom-domain.js`, `public/js/domain/event-domain.js`, `public/js/features/classroom-*`, `public/js/features/event-*`, `public/js/application/classroom-usecases.js`, `public/js/application/event-usecases.js`.
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

## Recommended Next Goals

1. Continue reducing `public/index.html` by moving feature-specific state application into feature/application modules.
2. Add repositories for remaining Firebase-heavy areas:
   - admin
   - shop/room
   - classroom
   - event
   - profile/home reads
3. Move bootstrap dependency assembly out of inline `index.html` once remaining callbacks no longer depend on local-only variables.
4. Add targeted browser smoke coverage for admin/account/profile write flows before moving more high-risk write logic.
5. Keep the same validation gate:
   - `npm run check`
   - authenticated browser smoke with the 4-8-23 test account when user-visible runtime code changes.

## Parallel Terminal Shape

- Terminal A: admin refactor.
- Terminal B: verification/docs/check updates.
- Terminal C: account or shop planning only until admin phase 2A is stable.
- Terminal D: smoke testing and deploy verification.

Do not run concurrent edits against `public/index.html` unless each terminal owns clearly separate line ranges and a final integration pass is planned.
