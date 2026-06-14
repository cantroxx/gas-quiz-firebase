# DJ48 Firebase Refactor Remaining Steps

## Current Baseline

- Completed through step 9D.
- Latest committed step 9D baseline: `46a7fb3 refactor: split quiz question dom helpers`
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

Step 9D implemented:

- Added low-risk DOM factory helpers to `public/js/features/quiz-play.js`:
  - `createQuizAnswerInput`
  - `createQuizImageAnswerField`
  - `createQuizChoiceButton`
  - `createQuizHintToggle`
- `renderQuestion` remains in `public/index.html` and still owns quiz session state reset, progress text, hint visibility decision, root append order, and ranking timer start.
- No timer, save, reward, title sync, or quiz completion flow was moved.

Step 9E implemented:

- Added calculation-only quiz play helpers to `public/js/features/quiz-play.js`:
  - `createQuizPlaySessionState`
  - `getQuizPlayHeaderTitle`
  - `getQuizProgressText`
  - `getRankingTimeLimitSecondsForQuiz`
- `public/index.html` still owns the actual quiz session variables and assigns them explicitly from the helper result.
- Timer start/stop, answer submit, practice save, ranking save, reward, title sync, and completion rendering remain in `public/index.html`.

Step 9F implemented:

- Added result/complete display model helpers to `public/js/features/quiz-play.js`:
  - `getQuizResultViewModel`
  - `getQuizCompleteViewModel`
- `showQuizResult` and `showQuizComplete` still create DOM in `public/index.html`.
- Ranking save, practice save, reward, title sync, timer cleanup, and popular usage finish remain in `public/index.html`.

Step 9G implemented:

- Added result/complete DOM factory helpers to `public/js/features/quiz-play.js`:
  - `createQuizResultCard`
  - `createQuizCompleteCard`
- `showQuizResult` and `showQuizComplete` still own state changes, root append, timer cleanup, popular usage finish, and save calls in `public/index.html`.
- Dataset hooks and status element ids remain unchanged:
  - `data-next-question`
  - `data-complete-quiz`
  - `data-back-to-quiz-select`
  - `practice-save-status`
  - `ranking-save-status`

Step 9H implemented:

- Added save status text helpers to `public/js/features/quiz-play.js`:
  - `getPracticeSaveStatusText`
  - `getRankingSaveStatusText`
- `renderPracticeSaveStatus` and `renderRankingSaveStatus` still own DOM lookup and text assignment in `public/index.html`.
- Practice save, ranking save, reward, title sync, and Firestore error handling flows remain in `public/index.html`.

Step 9I implemented:

- Added quiz play key action helper to `public/js/features/quiz-play.js`:
  - `getQuizPlayKeyAction`
- `handleQuizPlayKeydown` still owns event prevention and calls to:
  - `submitAnswer`
  - `nextQuestion`
  - `showQuizComplete`
  - `selectChoiceByIndex`
- `selectChoiceByIndex` still owns selected choice state and submit button state in `public/index.html`.

Step 9J implemented:

- Added choice selection helpers to `public/js/features/quiz-play.js`:
  - `canSelectQuizChoice`
  - `applyQuizChoiceSelection`
- `selectChoiceByIndex` still owns `selectedChoiceIndex` assignment and optional `submitAnswer` call in `public/index.html`.
- Answer submission, save flows, timers, reward, and title sync remain unchanged.

Step 9K implemented:

- Added question set and practice partition helpers to `public/js/features/quiz-play.js`:
  - `resolveCurrentQuestionSet`
  - `hasSolvedPracticeQuestion`
  - `splitPracticeQuestionsBySolvedState`
- `getCurrentQuestionSet` still owns current quiz/session state access in `public/index.html`.
- `buildQuizSessionQuestions` still owns async Firestore solved-id loading and shuffle order in `public/index.html`.

Step 9L implemented:

- Added question card DOM factory helper to `public/js/features/quiz-play.js`:
  - `createQuizQuestionCard`
- `renderQuestion` still owns current question lookup, per-question state reset, root replacement, and ranking timer start in `public/index.html`.
- Submit, save, reward, title sync, and timer flows remain unchanged.

Step 9M implemented:

- Added answer submit calculation helper to `public/js/features/quiz-play.js`:
  - `getQuizAnswerSubmitResult`
- `submitAnswer` still owns resolved state changes, timer cleanup, correct count, popular unlock tracking, practice save, button disabling, and result rendering in `public/index.html`.
- Save, reward, title sync, ranking record, and timer flows remain unchanged.

Step 9N implemented:

- Added ranking timer calculation/display helpers to `public/js/features/quiz-play.js`:
  - `getRankingElapsedSeconds`
  - `getRankingTimedProgressText`
- Ranking timer ownership remains in `public/index.html`:
  - `clearRankingQuestionTimer`
  - `clearRankingSessionTimer`
  - `startRankingSessionTimerIfNeeded`
  - `handleRankingSessionTimeout`
  - `startRankingQuestionTimerIfNeeded`
  - `handleRankingTimeout`
- Timer state, DOM disabling, forced completion, heart reduction, and ranking save flows remain unchanged.

Step 9O implemented:

- Added quiz answer control DOM helper to `public/js/features/quiz-play.js`:
  - `disableQuizAnswerControls`
- Replaced repeated `.quiz-choice`, `.quiz-submit-button`, and `.quiz-answer-input` disabling in `public/index.html`.
- `submitAnswer`, ranking timeout, session timeout, save, reward, title sync, and ranking record flows remain owned by `public/index.html`.

Step 9P implemented:

- Added practice save condition helper to `public/js/features/quiz-play.js`:
  - `shouldSavePracticeProgress`
- `submitAnswer` now delegates only the practice-save eligibility check.
- Practice save execution, Firestore error handling, reward, title sync, and ranking record flows remain owned by `public/index.html`.

Step 9Q implemented:

- Added practice save status attachment helper to `public/js/features/quiz-play.js`:
  - `attachPracticeProgressSaveStatus`
- `submitAnswer` now delegates only the Promise success/error status rendering connection.
- Practice save execution, Firestore write logic, reward, title sync, and ranking record flows remain owned by `public/index.html`.

Step 9R implemented:

- Added ranking save status attachment helper to `public/js/features/quiz-play.js`:
  - `attachRankingSaveStatus`
- `showQuizComplete` now delegates only the ranking-save Promise success/error status rendering connection.
- Ranking save execution, Firestore write logic, elapsed-too-long skip status, reward, and title sync flows remain owned by `public/index.html`.

Step 9S implemented:

- Added elapsed-too-long ranking skip result helper to `public/js/features/quiz-play.js`:
  - `getElapsedTooLongRankingSkipResult`
- `showQuizComplete` now delegates only the skipped status object creation for overlong ranking sessions.
- Ranking save execution, Firestore write logic, timer cleanup, reward, and title sync flows remain owned by `public/index.html`.

Step 9T implemented:

- Added ranking completion save action helper to `public/js/features/quiz-play.js`:
  - `getRankingCompleteSaveAction`
- `showQuizComplete` now delegates only the ranking completion save/skip/none branch decision.
- Ranking save execution, Firestore write logic, timer cleanup, reward, and title sync flows remain owned by `public/index.html`.

Step 9U implemented:

- Added ranking wrong-answer state helper to `public/js/features/quiz-play.js`:
  - `getRankingWrongAnswerState`
- `showQuizResult` now delegates only the next ranking life count and wrong-answer end decision.
- Ranking life state assignment, result rendering, timer cleanup, save, reward, and title sync flows remain owned by `public/index.html`.

Step 9V implemented:

- Added next-question action helper to `public/js/features/quiz-play.js`:
  - `getNextQuestionAction`
- `nextQuestion` now delegates only the render-next-question vs complete decision.
- Question index state, timer cleanup, question rendering, completion rendering, save, reward, and title sync flows remain owned by `public/index.html`.

Step 9W implemented:

- Documented remaining high-risk quiz play ownership boundaries before moving save/reward logic.
- Keep these functions in `public/index.html` unless a later step introduces an explicit state/dependency adapter:
  - `saveRankingRecordOnQuizComplete`
  - `savePracticeProgressAfterCorrectAnswer`
  - `grantPracticeCorrectReward`
  - `syncMemberTitlesAfterPracticeCompletion`
  - ranking timer start/timeout functions
  - popular usage session functions
- Current high-risk dependencies:
  - Firestore/Functions adapters: `getFirestoreDb`, `getFirestoreFieldValue`, `getFirebaseFunctions`, callable names.
  - User/session state: `currentModeId`, `currentQuizId`, `currentRankingModeId`, `correctAnswerCount`, `currentMemberProfile`.
  - Ranking state: `currentQuizStartedAtMs`, `MAX_RANKING_ELAPSED_SECONDS`, `getRankingElapsedSeconds`, `getRankingTargetForQuiz`.
  - Practice state: `getCurrentQuestionSet`, `loadFirebaseQuizMeta`, `getPracticeTargetForQuiz`, progress record ids.
  - Reward/title side effects: `firestoreUserEconomy`, `userEconomyLoadPromise`, `titleCatalogCache`, `titleCatalogMapCache`.
  - Feature flags and guards: `loadFeatureFlags`, `TEST_SHOP_USER_ID`, permission/quota error helpers.
- Step 9 should stop after final verification unless the next goal is explicitly to introduce an adapter object for these dependencies.

Step 9X implemented:

- Ran a final source-boundary review for Step 9.
- Confirmed these high-risk functions still stay in `public/index.html`:
  - `showQuizPlayView`
  - `buildQuizSessionQuestions`
  - `renderQuestion`
  - `submitAnswer`
  - `showQuizResult`
  - `nextQuestion`
  - `showQuizComplete`
  - `saveRankingRecordOnQuizComplete`
  - `savePracticeProgressAfterCorrectAnswer`
  - `grantPracticeCorrectReward`
  - `syncMemberTitlesAfterPracticeCompletion`
- Confirmed `public/js/features/quiz-play.js` owns only low-risk helpers, display models, DOM factories, and small decision helpers.
- Recommended Step 9 completion criteria:
  - No additional save/reward/timer function movement in this phase.
  - Run one full browser smoke test across practice, ranking, timer, heart, save status, reward, and title sync.
  - Start a new goal before introducing a dependency adapter for save/reward/timer flows.

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
