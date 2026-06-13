# DJ48 Firebase Refactor Remaining Steps

## Current Baseline

- Completed through step 5.
- Latest committed step 1-4 baseline: `7e2816f refactor: split static app data and core helpers`
- Main app source remains `public/index.html`.
- New browser globals added so existing app code can keep its current function and constant names:
  - `window.DJ48_PLACE_DETAILS`
  - `window.DJ48Format`
  - `window.DJ48Firebase`
  - `window.DJ48QuizCatalog`

## Completed Steps

### Step 1: Place Details Data

- Moved `PLACE_DETAILS` into `public/js/data/place-details.js`.
- `public/index.html` keeps `const PLACE_DETAILS = window.DJ48_PLACE_DETAILS;`.

### Step 2: Pure Format Helpers

- Moved low-risk helper implementations into `public/js/core/format.js`.
- `public/index.html` keeps wrappers for:
  - `getFirestoreTimestampMillis`
  - `normalizeDisplayImageUrl`
  - `normalizeQuizAnswer`
  - `formatRankingElapsedText`

### Step 3: Firebase Access Wrappers

- Moved Firebase singleton/access helper implementations into `public/js/core/firebase.js`.
- `public/index.html` keeps wrappers for:
  - `getFirestoreDb`
  - `getFirebaseStorage`
  - `getFirebaseFunctions`
  - `getFirebaseAuth`
  - `getFirestoreFieldValue`

### Step 4: Static Quiz Catalog

- Moved `MODE_CATALOG`, `SUBJECT_CATALOG`, `SCHOOL_QUIZ_CARDS`, and `QUIZ_CATALOG` into `public/js/data/quiz-catalog.js`.
- `QUESTION_BANK` intentionally remains in `public/index.html`.

### Step 5: Admin Read/Render Helpers

Implemented locally:

- Moved display-only admin helpers into `public/js/features/admin-render.js`.
- `public/index.html` keeps wrapper functions for:
  - `formatAdminTimestamp`
  - `createAdminInfoChip`
  - `renderAdminLogs`
  - `renderAdminDashboard`

Kept in `public/index.html`:

- Admin save functions
- Permission-changing functions
- Callable invocation flows
- Admin auth/session flows

## Remaining Steps

### Step 6: Home Profile Rendering

Target:

- Move DOM render helpers only.
- Candidate functions:
  - `renderProfileAvatar`
  - `renderCollectionCards`
  - `renderBadgeProgressGroups`

Keep in `public/index.html`:

- Nickname save
- Password change
- Profile image search/upload/save
- Firestore write flows

Validation:

- Home entry.
- Profile card.
- Titles, badges, owned items.
- Home detail tabs.

Risk: medium.

### Step 7: Shop Display Logic

Target:

- Move read-only display/state helpers.
- Candidate functions:
  - `resolveShopItemVisual`
  - `getShopItemState`
  - `renderShopWallet`
  - `renderShopItems`

Keep in `public/index.html`:

- Purchase callable
- Inventory writes
- Room setting writes
- User data migration

Validation:

- Shop list.
- Coin display.
- Free, owned, insufficient coin, and purchasable states.
- Owned item summary in home.

Risk: medium.

### Step 8: Ranking Plaza Read/Render

Target:

- Move ranking plaza read/render helpers first.
- Keep `saveRankingRecordOnQuizComplete` in `public/index.html`.

Validation:

- Quiz king cards.
- Subject king cards.
- Popular quiz filters.
- Profile ranking records.

Risk: medium-high.

### Step 9: Quiz Play Split Preparation

Target:

- Do not move quiz play into a file yet.
- First list session state dependencies.
- Then group session state into a smaller internal object if safe.

Validation:

- Practice flow.
- Ranking flow.
- Timer and heart behavior.
- Daily popular usage limits.
- Practice and ranking record saves.
- Reward and title sync.

Risk: high.

## Step 5 Validation Checklist

- Admin login view still opens.
- Dashboard renders.
- Member list still renders.
- Logs render.
- Super admin-only UI visibility still behaves as before.

These require browser/admin smoke testing before deployment.

## WIP Files

Intermediate documents and unrelated scripts are kept under `work-in-progress/` until they are either promoted into the project or removed:

- `work-in-progress/PROJECT_STATUS_DJ48_FIREBASE.md`
- `work-in-progress/REFACTOR_PLAN.md`
- `work-in-progress/scripts/refine-samgukji-hints.js`
