# DJ48 Firebase Refactor Status

## Current Baseline

- First clean-architecture refactor round is code-complete through Step 13I.
- Latest committed Step 13I baseline: `58e800f refactor: move quiz next routing`
- Main app source remains `public/index.html`.
- Feature modules now own the extracted data/render/helper/quiz-flow implementations:
  - `window.DJ48_PLACE_DETAILS`
  - `window.DJ48Format`
  - `window.DJ48Firebase`
  - `window.DJ48QuizCatalog`
  - `window.DJ48AdminRender`
  - `window.DJ48HomeRender`
  - `window.DJ48ShopRender`
  - `window.DJ48RankingData`
  - `window.DJ48RankingRender`
  - `window.DJ48QuizPlay`
- `public/index.html` intentionally keeps thin wrappers, app state, event wiring, and remaining save/auth/view orchestration.
- Final status before closing this round:
  - code movement: complete
  - commit/push/deploy: complete through Step 13I
  - browser smoke test: pending user confirmation

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

## Refactor Timeline

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

Step 10 implemented:

- Closed Step 9 as complete after repeated deployed smoke checks from Step 9K through Step 9V and the final source-boundary review in Step 9X.
- Step 9 final architecture boundary:
  - `public/index.html` owns quiz session state, Firebase writes, timers, reward, title sync, and app navigation.
  - `public/js/features/quiz-play.js` owns pure calculations, view models, DOM factories, small action decisions, and save-status attachment helpers.
- No further save, reward, title sync, ranking record, timer, or popular usage logic should be moved under the Step 9 goal.
- Next clean-architecture goal should start as Step 11: dependency adapter design.
- Step 11 entry condition:
  - First create/document `getQuizPlayDeps` or equivalent.
  - Do not move `saveRankingRecordOnQuizComplete` or `savePracticeProgressAfterCorrectAnswer` until their dependencies are passed through the adapter.
  - Apply the adapter to one high-risk flow at a time, with browser smoke testing after each deployed change.

### Step 11: Quiz Play Dependency Adapter

Step 11A implemented:

- Added `getQuizPlayDeps` in `public/index.html` as the first explicit dependency adapter for quiz play save flows.
- Applied the adapter inside these functions without moving them:
  - `saveRankingRecordOnQuizComplete`
  - `savePracticeProgressAfterCorrectAnswer`
- Adapter-covered dependencies now include:
  - Firestore/Functions/auth accessors
  - current data owner lookup
  - current question set lookup
  - feature flag and Firebase quiz meta loaders
  - quiz id normalization and ranking elapsed text formatting
  - Firestore permission error detection
- Save execution, Firestore write logic, reward, title sync, timer, and popular usage flows remain owned by `public/index.html`.

Step 11B implemented:

- Extended `getQuizPlayDeps` with cache reset hooks:
  - `resetUserEconomyCache`
  - `resetTitleCatalogCache`
- Applied the adapter inside these callable wrapper functions without moving them:
  - `grantPracticeCorrectReward`
  - `syncMemberTitlesAfterPracticeCompletion`
- Callable names, request payloads, reward logic, title sync logic, and cache invalidation behavior remain unchanged.

Step 11C implemented:

- Extended `getQuizPlayDeps` with ranking save state and helper accessors:
  - current mode, quiz id, score, member profile, elapsed seconds
  - ranking target lookup and elapsed guard value
  - ranking record id and summary update builders
  - debug logging hook
- Routed `saveRankingRecordOnQuizComplete` through those adapter accessors.
- Firestore collection names, record payload shape, batch write order, and ranking summary update behavior remain unchanged.

Step 11D implemented:

- Extended `getQuizPlayDeps` with practice save helper accessors:
  - practice question id candidate builders
  - practice target lookup and reward coin value
  - practice progress id, summary update, and badge update builders
  - practice reward and title sync call wrappers
- Routed `savePracticeProgressAfterCorrectAnswer` through those adapter accessors.
- Routed practice reward/title sync debug logging through the same adapter.
- Firestore collection names, progress payload shape, reward callable payloads, badge updates, and title sync behavior remain unchanged.

Step 11E implemented:

- Extended `getQuizPlayDeps` with quiz completion view state accessors:
  - current question index
  - completion reward coin
  - invalid ranking time message
- Routed `showQuizComplete` completion view model and ranking save action inputs through the adapter.
- Routed `renderRankingSaveStatus` message lookup through the adapter.
- Completion card rendering, ranking save execution, timer cleanup, and popular usage cleanup remain unchanged.

Step 11F implemented:

- Extended `getQuizPlayDeps` with quiz session render/progress state accessors and small state mutators:
  - current ranking mode/lives, question resolved flag, selected choice, ranking time left
  - current header quiz/mode metadata
  - question index advance and correct count increment
- Routed these quiz play functions through the adapter:
  - `renderQuizPlayHeader`
  - `getQuestionHintText`
  - `renderQuestion`
  - `getQuizProgressText`
  - ranking session/question timer handlers
  - `submitAnswer`
  - `selectChoiceByIndex`
  - `handleQuizPlayKeydown`
  - `showQuizResult`
  - `nextQuestion`
- DOM structure, answer validation, timer intervals, heart behavior, progress save, and completion routing remain unchanged.

Step 11G implemented:

- Extended `getQuizPlayDeps` with quiz session setup and data-source accessors:
  - current session questions getter/setter
  - quiz session state apply helper
  - ranking elapsed started-at accessor
  - question bank and Firebase quiz data cache accessors
  - ranking mode normalization/support helpers
- Routed these functions through the adapter:
  - `showQuizPlayView` session state application and session question assignment
  - `getCurrentQuestionSet`
  - `loadSolvedPracticeIds`
  - `buildQuizSessionQuestions`
  - `getRankingTargetForQuiz` ranking mode selection
- Quiz availability checks, popular quiz access, question ordering, Firestore read paths, and ranking target payloads remain unchanged.

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

### Step 12: Low-Risk Pure Helper Movement

Step 12A/12B implemented:

- Started the post-adapter extraction phase with pure helper movement only.
- Added quiz play target/summary/badge helpers to `public/js/features/quiz-play.js`:
  - practice target lookup
  - practice progress record id builder
  - ranking target lookup
  - ranking record id builder
  - ranking summary update builders
  - practice badge metadata, summary, and badge update builders
- Kept the existing function names in `public/index.html` as thin wrappers around `window.DJ48QuizPlay`.
- Save execution, Firestore reads/writes, DOM rendering, timers, reward callable execution, and title sync remain in `public/index.html`.

Step 12C implemented:

- Added more pure quiz helper functions to `public/js/features/quiz-play.js`:
  - practice question id extraction
  - practice question id candidate extraction
  - Firestore quota error detection
  - Firestore permission-denied error detection
- Kept the existing function names in `public/index.html` as thin wrappers around `window.DJ48QuizPlay`.
- Firestore reads/writes, error handling call sites, practice save execution, and render/timer flows remain unchanged.

Step 12D implemented:

- Reviewed the remaining quiz play wrapper helpers in `public/index.html`.
- Decided not to move these wrappers further in this phase:
  - `normalizeQuizAnswer`
  - `formatRankingElapsedText`
  - `getKoreanInitials`
  - `getCurrentQuestionAnswerText`
  - `getQuestionHintText`
  - `getWrongAnswerFeedbackText`
  - `hasSolvedPracticeQuestion`
- Reason: these are already thin delegation wrappers around `DJ48Format` or `DJ48QuizPlay`; moving/removing them would create call-site churn with little architectural benefit.

Step 12E implemented:

- Reorganized `getQuizPlayDeps` internally into grouped dependency objects:
  - Firebase/data owner dependencies
  - quiz session state dependencies
  - catalog/static data dependencies
  - ranking dependencies
  - practice dependencies
  - cache reset dependencies
- Kept the returned dependency key names unchanged to avoid call-site churn.
- Save execution, Firestore reads/writes, DOM rendering, timers, reward callable execution, and title sync remain unchanged.

Step 12F implemented:

- Closed the low-risk pure helper movement phase.
- Final smoke-test scope for this phase:
  - practice quiz start, answer submit, next question, completion
  - practice progress save, duplicate handling, coin reward, badge update
  - ranking quiz start, answer submit, heart loss, question/session timeout
  - ranking record save and profile ranking reflection
  - popular quiz access/time limits
  - home profile badge/title/ranking summary display

Next:

- Treat any further quiz play extraction as Step 13.
- Do not move `saveRankingRecordOnQuizComplete`, `savePracticeProgressAfterCorrectAnswer`, reward callables, or timer/DOM handlers without a separate high-risk plan and fresh smoke-test checkpoint.

### Step 13: High-Risk Quiz Flow Extraction Planning

Step 13A implemented:

- Reviewed the remaining high-risk quiz play functions that still belong to `public/index.html`.
- No code movement was performed in this step.
- High-risk groups:
  - ranking save: `saveRankingRecordOnQuizComplete`
  - practice save: `savePracticeProgressAfterCorrectAnswer`
  - callable wrappers: `grantPracticeCorrectReward`, `syncMemberTitlesAfterPracticeCompletion`
  - ranking timers: `startRankingSessionTimerIfNeeded`, `startRankingQuestionTimerIfNeeded`, `handleRankingSessionTimeout`, `handleRankingTimeout`
  - answer/result flow: `submitAnswer`, `showQuizResult`, `showQuizComplete`
- Reason for high risk:
  - these functions combine Firestore reads/writes, server timestamps, callable execution, UI state, timer cleanup, reward/title side effects, and profile/ranking summaries.

Step 13B implemented:

- Documented extraction boundaries before any save-flow movement.

Ranking save boundary:

- Candidate function later: `saveRankingRecordOnQuizComplete`.
- Inputs currently read through `getQuizPlayDeps`:
  - current mode, quiz id, score, member profile
  - member user id and Firestore db/field value
  - ranking target, elapsed seconds, max elapsed guard, elapsed formatter
  - ranking record id builder and summary update builders
- Outputs:
  - `null` for non-ranking mode
  - `{ skipped: true, reason: 'zero-score' }`
  - `{ skipped: true, reason: 'elapsed-too-long', elapsedSeconds, elapsedText }`
  - `{ recordId, score, categoryKey, elapsedText }`
- External writes:
  - `rankingRecords/{recordId}`
  - `userRankingSummary/{memberUserId}`
  - `quizKingSummary/{memberUserId}`
- Move condition:
  - only after ranking completion, profile ranking reflection, and elapsed-time skip flow pass smoke testing.

Practice save boundary:

- Candidate function later: `savePracticeProgressAfterCorrectAnswer`.
- Inputs currently read through `getQuizPlayDeps`:
  - current mode, quiz id, current question set, Firebase quiz meta
  - member user id, auth user, Firestore db/field value
  - practice question id/candidates, practice target, reward feature flag
  - practice progress id, summary update, badge update, reward/title sync wrappers
- Outputs:
  - `null` for non-practice mode
  - `{ recordId, questionId }` fallback
  - detailed save result with duplicate/readFallback/completed/reward/badge data
- External reads/writes:
  - read `practiceRecords/{recordId}`
  - read `userPracticeSummary/{memberUserId}`
  - write `practiceRecords/{recordId}`
  - merge `userPracticeSummary/{memberUserId}`
  - merge `userBadges/{memberUserId}/badges/{badgeId}`
- Side effects:
  - optional reward callable through `grantPracticeCorrectReward`
  - optional title sync callable through `syncMemberTitlesAfterPracticeCompletion`
- Move condition:
  - only after practice progress, duplicate detection, coin reward, badge update, and title sync pass smoke testing.

Callable wrapper boundary:

- Candidate functions later:
  - `grantPracticeCorrectReward`
  - `syncMemberTitlesAfterPracticeCompletion`
- Inputs:
  - Firebase Functions instance
  - member user id
  - context payloads
- Side effects:
  - callable invocation
  - economy/title cache invalidation
  - debug logging
- Move condition:
  - only after callable error behavior and cache invalidation behavior are preserved in tests or smoke checks.

Timer/DOM flow boundary:

- Candidate functions later:
  - ranking timer handlers
  - `submitAnswer`
  - `showQuizResult`
  - `showQuizComplete`
- Current reason to keep in `public/index.html`:
  - these functions directly coordinate DOM state, answer disabling, timer intervals, session cleanup, progress save attachment, and completion rendering.
- Move condition:
  - only after save-flow extraction is stable or after a dedicated UI controller module is introduced.

Step 13 recommendation:

- Do not move high-risk functions in the same phase as this planning work.
- Next safe action is a full smoke-test checkpoint.
- If continuing extraction afterward, start with callable wrappers first because their input/output surface is smaller than the save functions.

Step 13C implemented:

- Moved callable wrapper execution bodies into `public/js/features/quiz-play.js`:
  - `grantPracticeCorrectReward`
  - `syncMemberTitlesAfterPracticeCompletion`
- Kept the existing `public/index.html` function names as thin wrappers.
- Preserved callable names and payloads:
  - `grantPracticeReward`
  - `syncMemberTitles`
- Preserved side effects:
  - user economy cache reset after practice reward
  - title catalog cache reset after awarded title sync
  - debug log messages and returned values
- Still not moved:
  - `saveRankingRecordOnQuizComplete`
  - `savePracticeProgressAfterCorrectAnswer`
  - ranking timers
  - answer/result/completion DOM flow
- Required smoke checks:
  - practice correct answer gives coin once
  - duplicate correct answer does not grant duplicate coin
  - practice completion can trigger title sync
  - profile/home title and badge displays remain normal

Step 13D implemented:

- Moved ranking save execution body into `public/js/features/quiz-play.js`:
  - `saveRankingRecordOnQuizComplete`
- Kept the existing `public/index.html` function name as a thin wrapper.
- Preserved Firestore paths and write order:
  - `rankingRecords/{recordId}`
  - `userRankingSummary/{memberUserId}`
  - `quizKingSummary/{memberUserId}`
  - batch writes still set ranking record, user summary, quiz king summary in the same order
- Preserved skip/error behavior:
  - non-ranking mode returns `null`
  - zero score returns `{ skipped: true, reason: 'zero-score' }`
  - elapsed-too-long returns skipped payload with elapsed text
  - missing Firestore/member/target still throws the same error codes
- Preserved record payload fields and return payload.
- Still not moved:
  - `savePracticeProgressAfterCorrectAnswer`
  - ranking timers
  - answer/result/completion DOM flow
- Required smoke checks:
  - ranking completion saves record
  - zero-score ranking run does not save
  - elapsed-time skip message still renders
  - profile ranking record reflects the saved result

Step 13E implemented:

- Moved practice progress save execution body into `public/js/features/quiz-play.js`:
  - `savePracticeProgressAfterCorrectAnswer`
- Kept the existing `public/index.html` function name as a thin wrapper.
- Preserved Firestore paths and write order:
  - read `practiceRecords/{recordId}`
  - read `userPracticeSummary/{memberUserId}`
  - set `practiceRecords/{recordId}`
  - batch merge `userPracticeSummary/{memberUserId}`
  - batch merge `userBadges/{memberUserId}/badges/{badgeId}`
- Preserved write-only fallback behavior:
  - permission-denied practice record read uses `arrayUnion(questionId)` and `increment(1)`
  - permission-denied summary read continues with merge-only summary update
- Preserved completion behavior:
  - complete-type areas keep one star and reset ids
  - loop-type areas increment star count and reset ids
  - completion round can trigger title sync
- Preserved reward behavior:
  - duplicate correct ids do not grant reward
  - disabled reward feature skips callable
  - new correct ids call practice reward wrapper
- Still not moved:
  - ranking timers
  - answer/result/completion DOM flow
- Required smoke checks:
  - practice correct answer saves progress
  - duplicate correct answer does not increase progress/reward
  - completion updates badge/star state
  - coin reward is granted once
  - title sync still runs on completion

Step 13F implemented:

- Moved ranking timer execution bodies into `public/js/features/quiz-play.js`:
  - `startRankingSessionTimerIfNeeded`
  - `handleRankingSessionTimeout`
  - `startRankingQuestionTimerIfNeeded`
  - `handleRankingTimeout`
- Kept the existing `public/index.html` function names as thin wrappers.
- Preserved timer ownership:
  - `currentRankingSessionTimer` and `currentRankingQuestionTimer` still live in `public/index.html`
  - wrapper callbacks still assign timer ids back into the original state variables
- Preserved timer intervals:
  - ranking session timer remains 1000ms
  - ranking question timer remains 100ms with 0.1 second decrement
- Preserved DOM side effects:
  - answer controls are disabled through `DJ48QuizPlay.disableQuizAnswerControls`
  - progress text still renders through `.quiz-progress`
  - session timeout still calls `showQuizComplete({ skipped: true, reason: 'elapsed-too-long', forced: true })`
  - question timeout still calls `showQuizResult(false, '시간 초과로 하트가 1개 줄었어요.')`
- Still not moved:
  - answer submit flow
  - result/completion card rendering flow
- Required smoke checks:
  - ranking question timer counts down
  - ranking question timeout reduces heart and shows timeout feedback
  - ranking session timeout skips ranking save with elapsed-too-long message
  - leaving quiz clears both timers

Step 13G implemented:

- Moved answer submit and result card flow bodies into `public/js/features/quiz-play.js`:
  - `submitAnswer`
  - `showQuizResult`
- Kept the existing `public/index.html` function names as thin wrappers.
- Preserved answer submit behavior:
  - ignores already resolved questions
  - validates text/image/choice answers through existing quiz helper
  - disables input after text/image submit
  - clears ranking question timer after submit
  - increments correct answer count only on correct answers
  - records popular quiz education correct unlock only on correct answers
  - attaches practice progress save status after correct practice answer
- Preserved result behavior:
  - ranking wrong answer still decrements hearts through `getRankingWrongAnswerState`
  - result card still appends to `quiz-play-root`
  - last-question detection is unchanged
- Still not moved:
  - completion card/ranking save status flow
  - next-question routing
- Required smoke checks:
  - choice answer submit works
  - text/image answer submit works
  - correct answer increments score
  - wrong ranking answer decrements heart
  - practice save status still appears

Step 13H implemented:

- Moved completion card and ranking save status flow body into `public/js/features/quiz-play.js`:
  - `showQuizComplete`
- Kept the existing `public/index.html` function name as a thin wrapper.
- Preserved completion cleanup ownership in `public/index.html`:
  - ranking question timer clear
  - ranking session timer clear
  - popular usage session finish
- Preserved completion behavior:
  - complete card still renders into `quiz-play-root`
  - practice completion summary still shows reward information
  - ranking completion still shows ranking save status
  - elapsed-too-long completion still skips save and renders the skip message
  - normal ranking completion still attaches `saveRankingRecordOnQuizComplete`
- Still not moved:
  - next-question routing
- Required smoke checks:
  - practice completion card renders
  - ranking completion saves record and updates save status
  - ranking elapsed-too-long completion skips save
  - back-to-mode-select button still works

Step 13I implemented:

- Moved next-question routing body into `public/js/features/quiz-play.js`:
  - `nextQuestion`
- Kept the existing `public/index.html` function name as a thin wrapper.
- Preserved routing behavior:
  - clears ranking question timer before advancing
  - advances the current question index through the existing state dependency
  - renders the next question when questions remain
  - shows completion when the next index reaches the question count
- This closes the planned Step 13 high-risk quiz flow extraction.
- First clean-architecture refactor round can be considered complete after final smoke testing.
- Final smoke checks:
  - practice quiz start, answer submit, next question, completion
  - practice progress save, duplicate handling, coin reward, badge/title sync
  - ranking quiz start, answer submit, heart loss, question/session timeout
  - ranking completion save and elapsed-too-long skip
  - back-to-mode-select and home/profile reflection

## Closeout Status

This first clean-architecture refactor round is code-complete.

No further code movement is required for this round unless smoke testing finds a regression.

User smoke-test checklist before declaring final closure:

- Practice flow:
  - start a practice quiz
  - submit a correct answer
  - move to the next question
  - finish the quiz
  - confirm progress/reward/badge state still updates
- Ranking flow:
  - start a ranking quiz
  - submit a correct answer
  - submit or time out a wrong answer and confirm heart loss
  - finish the ranking run
  - confirm ranking save status appears
- Navigation/profile flow:
  - return to mode selection
  - return home
  - confirm profile/ranking/badge/title summaries still render
- Optional edge check:
  - let ranking session exceed the time limit and confirm the elapsed-too-long skip message appears

If these pass, mark this refactor round closed and start future work as a new scoped refactor or feature task.

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
