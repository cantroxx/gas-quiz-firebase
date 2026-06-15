# App Shell Refactor Plan

This document starts the next clean-architecture round after the completed second round in `PARALLEL_WORK_PLAN.md`.

## Goal

Make `public/index.html` a thinner app shell so multiple terminals can work on UI, quiz, admin, account, and verification areas with fewer conflicts.

## Current Boundary

- `public/index.html` still owns global app state, caches, Firebase orchestration, view routing wrappers, and some high-risk quiz/session flows.
- Feature modules under `public/js/features` own many render, data, form, and view helpers.
- Event binding is being moved out of the inline app shell into feature-level controller/event modules.

## Completed In This Round

1. Created this app-shell refactor plan.
2. Moved common app binding ownership target to `public/js/features/app-events.js`.
3. Moved admin binding ownership target to `public/js/features/admin-controller.js`.
4. Moved account binding ownership target to `public/js/features/account-controller.js`.
5. Expanded browser smoke expectations to include the new controller/event globals and account/admin entry checks.
6. Listed quiz-play dependency boundaries before deeper quiz movement.
7. Moved home/profile event binding ownership to `public/js/features/home-controller.js`.
8. Moved shop/room event binding ownership to `public/js/features/shop-controller.js`.
9. Moved school/quiz-select event binding ownership to `public/js/features/school-controller.js`.
10. Moved event and classroom binding ownership to `public/js/features/event-controller.js` and `public/js/features/classroom-controller.js`.
11. Expanded browser smoke checks for home/profile toggles, school selection, shop item presence, and classroom tab clicks.
12. Added `getQuizPlayEventDeps()` in `public/index.html` to make quiz event dependencies explicit.
13. Moved quiz-play event binding ownership to `public/js/features/quiz-controller.js`.
14. Expanded browser smoke expectations to include the quiz controller global.
15. Moved home/profile runtime state ownership to `public/js/features/home-state.js`.
16. Moved shop/room runtime state ownership to `public/js/features/shop-state.js`.
17. Moved event runtime state ownership to `public/js/features/event-state.js`.
18. Moved classroom runtime state ownership to `public/js/features/classroom-state.js`.
19. Expanded browser smoke expectations to include the new feature state globals.
20. Moved ranking plaza filter/model state ownership to `public/js/features/ranking-state.js`.
21. Moved admin dashboard runtime state ownership to `public/js/features/admin-state.js`.
22. Moved account submit/password-change runtime state ownership to `public/js/features/account-state.js`.
23. Moved quiz session, progress, and timer handle state ownership to `public/js/features/quiz-session-state.js`.
24. Added `public/js/features/quiz-flow.js` as the quiz save/reward/timer orchestration boundary.
25. Expanded browser smoke expectations to include ranking/admin/account/quiz-session state and quiz-flow globals.

## Ownership Rules

- App shell/common navigation: `public/js/features/app-view.js`, `public/js/features/app-events.js`, thin calls in `public/index.html`.
- Admin event orchestration: `public/js/features/admin-controller.js`.
- Admin runtime state: `public/js/features/admin-state.js`.
- Account/login event orchestration: `public/js/features/account-controller.js`.
- Account/login runtime state: `public/js/features/account-state.js`.
- Home/profile event orchestration: `public/js/features/home-controller.js`.
- Home/profile runtime state: `public/js/features/home-state.js`.
- Shop/room event orchestration: `public/js/features/shop-controller.js`.
- Shop/room runtime state: `public/js/features/shop-state.js`.
- School/quiz-select event orchestration: `public/js/features/school-controller.js`.
- Event/classroom event orchestration: `public/js/features/event-controller.js`, `public/js/features/classroom-controller.js`.
- Event runtime state: `public/js/features/event-state.js`.
- Classroom runtime state: `public/js/features/classroom-state.js`.
- Ranking plaza runtime state: `public/js/features/ranking-state.js`.
- Quiz play events: `public/js/features/quiz-controller.js`.
- Quiz session runtime state: `public/js/features/quiz-session-state.js`.
- Quiz save/reward/timer orchestration: `public/js/features/quiz-flow.js`.
- Quiz play state/save/timer orchestration: `public/js/features/quiz-play.js`, explicit adapters and wrappers that still remain in `public/index.html`.
- Verification: `scripts/smoke`.

Only one terminal should edit `public/index.html` at a time until quiz save/reward wrappers and global app orchestration are reduced further.

## Remaining App Shell Work

1. Harden quiz completion persistence smoke before moving more write flow internals.
2. Move remaining quiz result/completion DOM adapters only after the persistence smoke gate is stronger.
3. Reduce remaining global app orchestration wrappers in `public/index.html`.

## Quiz-Play Dependency Boundary

Do not move quiz save/reward/timer flows until these dependencies are explicitly adapted:

- Session state: `currentQuizId`, `currentQuizMode`, `currentRankingMode`, `currentQuestionIndex`, `currentScore`, `selectedChoiceIndex`, `lastQuizId`.
- Ranking state: lives, start time, timer interval, elapsed-time guard, selected ranking target.
- Practice state: solved question ids, progress save status, reward flags.
- User state: `currentMemberUserId`, `currentDataOwnerId`, linked member profile, admin destination logic.
- Firestore/callables: ranking record save, practice progress save, reward sync, title/badge sync.
- UI callbacks: render question/result/complete, back to quiz select, home/profile refresh.
- Cleanup callbacks: ranking timer cleanup, popular usage flush, visibility/beforeunload handling.

Recommended quiz sequence:

1. Keep `getQuizPlayDeps()` as the broad state/data adapter for quiz-play helpers.
2. Keep `getQuizPlayEventDeps()` as the narrow event adapter for `quiz-controller.js`.
3. Move pure session decision helpers into `public/js/features/quiz-play.js` only when they do not mutate app state directly.
4. Move save/reward wrappers only after smoke covers quiz completion persistence.
5. Move timer/session cleanup last.

## Validation Gate

Before committing:

```bash
npm run check
```

For user-visible runtime changes:

```bash
SMOKE_GRADE=4 SMOKE_CLASS=8 SMOKE_NUMBER=23 SMOKE_PASSWORD='1111' npm run smoke:browser
```
