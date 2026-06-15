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

## Ownership Rules

- App shell/common navigation: `public/js/features/app-view.js`, `public/js/features/app-events.js`, thin calls in `public/index.html`.
- Admin event orchestration: `public/js/features/admin-controller.js`.
- Account/login event orchestration: `public/js/features/account-controller.js`.
- Quiz play: `public/js/features/quiz-play.js`, quiz state wrappers that still remain in `public/index.html`.
- Verification: `scripts/smoke`.

Only one terminal should edit `public/index.html` at a time until global state and quiz session ownership are reduced further.

## Remaining App Shell Work

1. Move home/profile event binding out of `public/index.html`.
2. Move shop/room event binding out of `public/index.html`.
3. Move school/quiz-select event binding out of `public/index.html`.
4. Move classroom/event binding out of `public/index.html`.
5. Reduce `public/index.html` cache/state ownership by feature area.
6. Harden quiz-play dependencies before moving save/reward/timer flows.

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

1. Create a quiz dependency adapter object in `public/index.html`.
2. Move pure session decision helpers into `public/js/features/quiz-play.js`.
3. Move save/reward wrappers only after smoke covers quiz completion persistence.
4. Move timer/session cleanup last.

## Validation Gate

Before committing:

```bash
npm run check
```

For user-visible runtime changes:

```bash
SMOKE_GRADE=4 SMOKE_CLASS=8 SMOKE_NUMBER=23 SMOKE_PASSWORD='1111' npm run smoke:browser
```
