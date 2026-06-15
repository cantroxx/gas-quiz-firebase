# Parallel Work Plan

This document defines the next clean-architecture target after the first refactor round and folder cleanup.

## Current State

- `public/index.html` is still the main app shell and state owner.
- Extracted modules already exist under `public/js/core`, `public/js/data`, and `public/js/features`.
- Browser smoke automation exists under `scripts/smoke`.
- Project documents and scripts are grouped by domain.

## Ownership Rules

- Admin: `public/js/features/admin-*`, admin sections in `public/index.html`, admin callable docs.
- Account/login: future `public/js/features/account-*`, member auth/session/linking functions in `public/index.html`.
- Profile/home: `public/js/features/home-render.js`, future `profile-*`, profile save/upload/title/badge flows.
- Shop/room: `public/js/features/shop-render.js`, `public/room.js`, `public/room.css`, future `shop-*` and `room-*` write-flow modules.
- Quiz: `public/js/features/quiz-play.js`, quiz catalog/data helpers, quiz-play wrappers in `public/index.html`.
- Ranking: `public/js/features/ranking-data.js`, `public/js/features/ranking-render.js`, ranking plaza/profile ranking flows.
- Classroom/event: future `classroom-*` and `event-*` modules.
- Verification/docs: `scripts/smoke`, `docs/operations`, `docs/architecture`.

When using multiple terminals, keep each terminal inside one ownership area unless the task explicitly requires a shared boundary change.

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

## Recommended Sequence

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
4. Account/login refactor.
   - Split login/signup/password/session restore only after admin is stable.
5. Shop/room write-flow refactor.
   - Split purchase, inventory, room settings, and economy refresh.
6. Profile/account detail refactor.
   - Split nickname, profile image, ranking message, title/badge orchestration.
7. Classroom/event refactor.
   - Split relatively independent classroom and event flows.
8. Final cleanup.
   - Update docs, run full smoke, and declare the second clean-architecture round closed.

## Parallel Terminal Shape

- Terminal A: admin refactor.
- Terminal B: verification/docs/check updates.
- Terminal C: account or shop planning only until admin phase 2A is stable.
- Terminal D: smoke testing and deploy verification.

Do not run concurrent edits against `public/index.html` unless each terminal owns clearly separate line ranges and a final integration pass is planned.
