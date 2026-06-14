# DJ48 Firebase Refactor Remaining Steps

## Current Baseline

- Completed through step 9C.
- Latest committed step 9A baseline: `86c7abd docs: inventory quiz play session state`
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

Implemented:

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

### Step 6: Home Profile Rendering

Implemented:

- Moved DOM render helpers into `public/js/features/home-render.js`.
- `public/index.html` keeps wrapper functions for:
  - `renderProfileAvatar`
  - `renderCollectionCards`
  - `renderBadgeProgressGroups`

Kept in `public/index.html`:

- Nickname save
- Password change
- Profile image search/upload/save
- Firestore write flows

### Step 7: Shop Display Logic

Implemented:

- Moved read-only display/state helpers into `public/js/features/shop-render.js`.
- `public/index.html` keeps wrapper functions for:
  - `resolveShopItemVisual`
  - `getShopItemState`
  - `renderShopWallet`
  - `renderShopItems`

Kept in `public/index.html`:

- Purchase callable
- Inventory writes
- Room setting writes
- User data migration

## Remaining Steps

### Step 8: Ranking Plaza Read/Render

Step 8A implemented:

- Moved low-risk ranking DOM helpers into `public/js/features/ranking-render.js`.
- `public/index.html` keeps wrapper functions for:
  - `renderRankingCards`
  - `appendRankingDisplayName`
  - `createRankingTitleChip`
  - `renderRankingAvatar`
  - `createRankingMetaLine`
  - `renderRankingRows`
  - `createRankingPodiumCard`

Step 8B implemented:

- Moved ranking plaza read/model helper implementations into `public/js/features/ranking-data.js`.
- `public/index.html` keeps wrapper functions for:
  - `getEnabledRankingCategoryKeys`
  - `getEnabledRankingGroupDefinitions`
  - `normalizeRankingRecordFromFirestore`
  - `getRankingPlazaCategoryRecordLimit`
  - `getRankingMemberUserId`
  - `mergeRankingRowWithMemberProfile`
  - `loadMemberProfilesForRankingRows`
  - `loadLimitedRankingRecordsForPlaza`
  - `buildRankingGroups`
  - `buildSubjectRankingGroups`
  - `getRankingBoardModels`

Step 8C implemented:

- Moved ranking board panel render helpers into `public/js/features/ranking-render.js`.
- `public/index.html` keeps wrapper functions and state callbacks for:
  - `getRankingRenderDeps`
  - `renderRankingBoards`
  - `renderRankingBoardPanel`
  - `renderRankingGroupPanel`
  - `createPopularFilterButton`
  - `renderPopularRankingBoardPanel`

Step 8D implemented:

- Moved ranking board click event delegation into `public/js/features/ranking-render.js`.
- `public/index.html` keeps wrapper/state callback functions for:
  - `handleRankingBoardRootClick`
  - `onRankingBoardSelect`
  - popular filter state callbacks in `getRankingRenderDeps`

Target:

- Run final Step 8 verification before moving to Step 9.
- Keep `saveRankingRecordOnQuizComplete` in `public/index.html`.

Validation:

- Quiz king cards.
- Subject king cards.
- Popular quiz filters.
- Profile ranking records.

Risk: medium-high.

### Step 9: Quiz Play Split Preparation

Step 9A implemented:

- Inventoried quiz play session state and dependency boundaries before moving code.
- No quiz play implementation moved yet.

Session state groups:

- Navigation and selected quiz:
  - `lastQuizId`
  - `currentSubjectId`
  - `currentQuizId`
  - `currentModeId`
  - `currentRankingModeId`
  - `currentSessionQuestions`
- Per-question progress and input:
  - `currentQuestionIndex`
  - `selectedChoiceIndex`
  - `correctAnswerCount`
  - `currentQuestionResolved`
- Ranking timers and lives:
  - `currentQuizStartedAtMs`
  - `currentRankingLives`
  - `currentRankingQuestionTimer`
  - `currentRankingSessionTimer`
  - `currentRankingTimeLeft`
- Popular quiz usage tracking:
  - `currentPopularUsageSession`
  - `currentPopularUsageFlushTimer`

Primary quiz play functions currently coupled to state:

- `showQuizPlayView`
- `getCurrentQuestionSet`
- `buildQuizSessionQuestions`
- `renderQuizPlayHeader`
- `renderQuestion`
- `getQuizProgressText`
- `clearRankingQuestionTimer`
- `clearRankingSessionTimer`
- `getRankingElapsedSeconds`
- `startRankingSessionTimerIfNeeded`
- `handleRankingSessionTimeout`
- `getRankingTimeLimitSecondsForQuiz`
- `startRankingQuestionTimerIfNeeded`
- `handleRankingTimeout`
- `submitAnswer`
- `selectChoiceByIndex`
- `handleQuizPlayKeydown`
- `showQuizResult`
- `nextQuestion`
- `showQuizComplete`

Do not move yet:

- `showQuizPlayView`
- `renderQuestion`
- `submitAnswer`
- `showQuizComplete`
- `saveRankingRecordOnQuizComplete`
- `savePracticeProgressAfterCorrectAnswer`
- `grantPracticeCorrectReward`
- `syncMemberTitlesAfterPracticeCompletion`
- popular usage session functions
- ranking timer start/stop functions

Low-risk candidates for a later Step 9B/9C review:

- `getCurrentQuestionAnswerText`
- `getQuestionHintText`
- `getWrongAnswerFeedbackText`
- `getKoreanInitials`
- `isTypingTarget`
- `isQuizPlayActive`
- `getNumericChoiceKey`
- pure ranking/practice target builders only after verifying their dependence on `currentQuizId` and `currentRankingModeId`

Step 9B/9C implemented:

- Created `public/js/features/quiz-play.js` for low-risk quiz play helpers.
- `public/index.html` keeps wrapper functions for:
  - `getKoreanInitials`
  - `getCurrentQuestionAnswerText`
  - `getQuestionHintText`
  - `getWrongAnswerFeedbackText`
  - `isTypingTarget`
  - `getNumericChoiceKey`
- Kept `isQuizPlayActive` in `public/index.html` because it directly reads the current DOM view state.
- `getQuestionHintText` now receives `currentQuizId` and `normalizeFirebaseQuizId` through a wrapper dependency object instead of reading quiz session state directly in the helper file.

Target:

- Keep quiz play state and save flows in `public/index.html`.
- Do not move DOM render, timer, save, reward, or title sync flows yet.
- Consider grouping session state into a smaller internal object only after helper extraction is proven safe.

Validation:

- Practice flow.
- Ranking flow.
- Timer and heart behavior.
- Daily popular usage limits.
- Practice and ranking record saves.
- Reward and title sync.

Risk: high.

## Step 7 Validation Checklist

- Shop list.
- Coin display.
- Free, owned, insufficient coin, and purchasable states.
- Owned item summary in home.

These require browser smoke testing before deployment.

## Step 6 Validation Checklist

- Home entry.
- Profile card.
- Titles, badges, owned items.
- Home detail tabs.

These require browser smoke testing before deployment.

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
