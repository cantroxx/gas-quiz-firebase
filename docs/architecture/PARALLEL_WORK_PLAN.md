# Parallel Work Plan

This document records the completed second clean-architecture round after the first refactor round and folder cleanup.

## Completion State

- `public/index.html` is still the main app shell and state owner.
- Extracted modules already exist under `public/js/core`, `public/js/data`, and `public/js/features`.
- Browser smoke automation exists under `scripts/smoke`.
- Project documents and scripts are grouped by domain.
- The second clean-architecture round is closed through classroom/event refactor and final verification.

## Ownership Rules

- Admin: `public/js/features/admin-*`, admin sections in `public/index.html`, admin callable docs.
- Account/login: future `public/js/features/account-*`, member auth/session/linking functions in `public/index.html`.
- Profile/home: `public/js/features/home-render.js`, future `profile-*`, profile save/upload/title/badge flows.
- Shop/room: `public/js/features/shop-render.js`, `public/room.js`, `public/room.css`, future `shop-*` and `room-*` write-flow modules.
- Quiz: `public/js/features/quiz-play.js`, quiz catalog/data helpers, quiz-play wrappers in `public/index.html`.
- Ranking: `public/js/features/ranking-data.js`, `public/js/features/ranking-render.js`, ranking plaza/profile ranking flows.
- Classroom/event: `public/js/features/classroom-*` and `public/js/features/event-*`.
- Verification/docs: `scripts/smoke`, `docs/operations`, `docs/architecture`.

When using multiple terminals, keep each terminal inside one ownership area unless the task explicitly requires a shared boundary change.

## Parallel Editing Rules

- Only one terminal should edit `public/index.html` at a time.
- UI-only work should stay in `public/styles.css` and `*-render.js` files unless a new DOM hook is required.
- Data/callable work should stay in `*-data.js` files or `functions/index.js`.
- Quiz-play work should stay in `public/js/features/quiz-play.js` and quiz data/catalog files unless the task explicitly changes app navigation.
- Smoke/test work should stay in `scripts/smoke` and `docs/operations`.
- If a task needs both UI and data changes, split it into two commits or make one terminal own the whole feature boundary.
- Before merging parallel work, run `npm run check`; for user-visible runtime changes, also run authenticated browser smoke with the 4-8-23 test account.

## Suggested Terminal Split

- Terminal A, UI: `public/styles.css`, `public/js/features/*-render.js`.
- Terminal B, quiz: `public/js/features/quiz-play.js`, `public/js/data/quiz-catalog.js`.
- Terminal C, data/backend: `public/js/features/*-data.js`, `functions/index.js`, Firestore/Storage rules.
- Terminal D, verification/docs: `scripts/smoke`, `docs/architecture`, `docs/operations`.
- Terminal E, app shell: `public/index.html`; keep this exclusive because it still owns global state, caches, view routing, and event binding.

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

## Recommended Next Goals

1. Start a new goal for the next architecture round instead of extending this document.
2. Choose one ownership area at a time:
   - View orchestration cleanup in `public/index.html`.
   - Quiz-play dependency adapter hardening.
   - Admin or account workflow integration tests.
3. Keep the same validation gate:
   - `npm run check`
   - authenticated browser smoke with the 4-8-23 test account when user-visible runtime code changes.

## Parallel Terminal Shape

- Terminal A: admin refactor.
- Terminal B: verification/docs/check updates.
- Terminal C: account or shop planning only until admin phase 2A is stable.
- Terminal D: smoke testing and deploy verification.

Do not run concurrent edits against `public/index.html` unless each terminal owns clearly separate line ranges and a final integration pass is planned.
