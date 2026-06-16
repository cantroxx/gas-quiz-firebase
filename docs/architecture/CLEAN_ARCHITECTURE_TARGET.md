# Clean Architecture Target

This document defines the stricter target structure for the Firebase app after the app-shell refactor work.

## Goal

Make `public/index.html` a thin app shell and keep feature work parallelizable across UI, quiz, ranking, shop, admin, account, event, and classroom areas.

## Layers

- Domain: pure rules and calculations. No DOM, Firebase, Storage, network, timers, or `window` reads during calculation.
- Application: usecase orchestration. Coordinates domain rules, repositories, state modules, and presentation callbacks.
- Infrastructure: Firebase, Storage, callable, browser storage, and external service adapters.
- Presentation: DOM rendering, form reading, event binding, and view-specific UI state.
- Bootstrap: script loading assumptions and dependency assembly. This is the only layer that should wire all features together.

## Directory Target

- `public/js/domain`: pure business rules that can run in Node tests and the browser.
- `public/js/application`: usecases that coordinate domain, repositories, and presentation callbacks.
- `public/js/infrastructure`: Firebase and browser API adapters.
- `public/js/features`: current presentation/data/controller modules during migration.
- `public/js/app`: app startup and dependency assembly during the current migration.
- `tests/domain`: Node tests for pure domain modules.
- `tests/application`: Node tests for usecase orchestration.
- `tests/infrastructure`: Node tests for Firebase/browser adapter boundaries.

## Ownership Rules

- Quiz: `quiz-*`, quiz domain/usecases/repositories.
- Ranking: `ranking-*`, ranking domain/usecases/repositories.
- Account: `account-*`, account domain/usecases/repositories.
- Profile/home: `home-*`, `profile-*`, profile/home usecases and presentation.
- Admin: `admin-*`, admin usecases/repositories/presentation.
- Shop and room: `shop-*`, `room-*`, shop domain/usecases/repositories.
- Event and classroom: `event-*`, `classroom-*`.
- Verification: `scripts/smoke`, `tests`.

Only one terminal should edit `public/index.html` at a time. Feature work should target owned files first.

## Dependency Rules

- Domain must not depend on presentation, application, infrastructure, or browser globals.
- Application may depend on domain and repository interfaces, but should receive browser/Firebase functions as dependencies.
- Infrastructure may call Firebase/Storage/browser APIs and return plain data.
- Presentation may read and write DOM, but should avoid Firebase access and heavy business rules.
- Bootstrap may depend on every layer only to assemble the app.

## Migration Sequence

1. Add domain tests and move low-risk pure rules first.
2. Move feature usecases after the domain rule is test-covered.
3. Move Firebase-heavy functions from `*-data.js` into repositories.
4. Move app startup and binding assembly from `public/index.html` into `public/js/app` bootstrap modules.
5. Reduce `window.DJ48...` usage to explicit bootstrap boundaries where practical.

## Validation Gate

Before committing:

```bash
npm run check
```

For user-visible runtime changes:

```bash
SMOKE_GRADE=4 SMOKE_CLASS=8 SMOKE_NUMBER=23 SMOKE_PASSWORD='1111' npm run smoke:browser
```
