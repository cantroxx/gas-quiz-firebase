(function () {
  function getKoreanInitials(value) {
    const initials = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    return String(value || '').split('').map(char => {
      const code = char.charCodeAt(0);
      if(code >= 0xac00 && code <= 0xd7a3) return initials[Math.floor((code - 0xac00) / 588)] || char;
      return /\s/.test(char) ? ' ' : char;
    }).join('');
  }

  function getCurrentQuestionAnswerText(question) {
    if(!question) return '';
    if(question.answerText) return String(question.answerText).trim();
    if(Array.isArray(question.choices) && Number.isInteger(question.answer)) {
      return String(question.choices[question.answer] || '').trim();
    }
    return '';
  }

  function getQuestionHintText(question, deps = {}) {
    const normalizeQuizId = deps.normalizeFirebaseQuizId || (value => String(value || '').trim());
    const quizId = normalizeQuizId(deps.currentQuizId);
    const answerText = getCurrentQuestionAnswerText(question);
    if(quizId === 'gmo' || quizId === 'time_store' || quizId === 'reading') return '';
    if(quizId === 'tiniping' && answerText) {
      return `초성 힌트: ${getKoreanInitials(answerText)}`;
    }
    return String(question?.hint || '').trim();
  }

  function getWrongAnswerFeedbackText(question, rankingEndedByWrongAnswer, overrideMessage) {
    const answerText = getCurrentQuestionAnswerText(question);
    const parts = [];
    if(overrideMessage) parts.push(overrideMessage);
    if(answerText) parts.push(`정답은 '${answerText}'입니다.`);
    if(rankingEndedByWrongAnswer) parts.push('생명력이 모두 소진되어 랭킹전이 종료됩니다.');
    if(parts.length) return parts.join(' ');
    return '괜찮아요. 다음 문제에서 다시 확인해 봅니다.';
  }

  function isTypingTarget(target) {
    const tagName = String(target?.tagName || '').toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || target?.isContentEditable === true;
  }

  function getNumericChoiceKey(event) {
    const key = String(event?.key || '');
    if(['1', '2', '3', '4'].includes(key)) return Number(key);
    const code = String(event?.code || '');
    const digitMatch = code.match(/^(Digit|Numpad)([1-4])$/);
    return digitMatch ? Number(digitMatch[2]) : 0;
  }

  function getQuizPlayKeyAction(event, options = {}) {
    if(!options.quizPlayActive || event?.defaultPrevented) return { type: 'none' };
    const key = String(event?.key || '');
    const target = event?.target || null;
    const input = target?.classList?.contains('quiz-answer-input') ? target : null;

    if(input && key === 'Enter') {
      return {
        type: 'submit-input',
        shouldSubmit: !options.currentQuestionResolved && !!String(input.value || '').trim()
      };
    }

    if(options.currentQuestionResolved && key === 'Enter') {
      return { type: 'advance-after-result' };
    }

    if(isTypingTarget(target)) return { type: 'none' };
    const choiceNumber = getNumericChoiceKey(event);
    if(!choiceNumber) return { type: 'none' };
    return {
      type: 'select-choice',
      choiceIndex: choiceNumber - 1
    };
  }

  function canSelectQuizChoice(question, options = {}) {
    if(options.currentQuestionResolved) return false;
    if(!question) return false;
    return question.type !== 'imageInput' && question.type !== 'textInput';
  }

  function applyQuizChoiceSelection(options = {}) {
    const button = options.button;
    if(!button || button.disabled) return false;
    const choices = Array.from(options.choices || []);
    choices.forEach(choice => {
      choice.classList.toggle('quiz-choice-selected', choice === button);
    });
    if(options.submitButton) options.submitButton.disabled = false;
    return true;
  }

  function disableQuizAnswerControls(root = document) {
    const scope = root || document;
    scope.querySelectorAll('.quiz-choice, .quiz-submit-button, .quiz-answer-input').forEach(element => {
      element.disabled = true;
    });
  }

  function getQuizAnswerSubmitResult(question, options = {}) {
    if(!question) return { canSubmit: false, isCorrect: false };
    if(question.type === 'imageInput' || question.type === 'textInput') {
      const normalizeAnswer = typeof options.normalizeQuizAnswer === 'function'
        ? options.normalizeQuizAnswer
        : value => String(value || '').trim();
      const submitted = normalizeAnswer(options.submittedAnswer);
      if(!submitted) return { canSubmit: false, isCorrect: false };
      const acceptedAnswers = [
        question.answerText,
        ...(Array.isArray(question.aliases) ? question.aliases : [])
      ].map(normalizeAnswer).filter(Boolean);
      return {
        canSubmit: true,
        isCorrect: acceptedAnswers.includes(submitted)
      };
    }
    if(options.selectedChoiceIndex === null || options.selectedChoiceIndex === undefined) {
      return { canSubmit: false, isCorrect: false };
    }
    return {
      canSubmit: true,
      isCorrect: options.selectedChoiceIndex === question.answer
    };
  }

  function shouldSavePracticeProgress(options = {}) {
    return !!options.isCorrect && options.modeId === 'practice';
  }

  function attachPracticeProgressSaveStatus(progressSavePromise, deps = {}) {
    if(!progressSavePromise) return null;
    const renderPracticeSaveStatus = deps.renderPracticeSaveStatus || (() => {});
    const isQuotaExceeded = deps.isFirestoreQuotaExceededError || (() => false);
    const warn = deps.warn || console.warn;
    return progressSavePromise
      .then(result => renderPracticeSaveStatus(result))
      .catch(error => {
        if(isQuotaExceeded(error)) {
          warn('Firestore practice progress save deferred because Firestore quota is exhausted.', error);
        } else {
          warn('Firestore practice progress save failed.', error);
        }
        renderPracticeSaveStatus({ error: true });
      });
  }

  function attachRankingSaveStatus(rankingSavePromise, deps = {}) {
    if(!rankingSavePromise) return null;
    const renderRankingSaveStatus = deps.renderRankingSaveStatus || (() => {});
    const warn = deps.warn || console.warn;
    return rankingSavePromise
      .then(result => renderRankingSaveStatus(result))
      .catch(error => {
        warn('Firestore ranking record save failed.', error);
        renderRankingSaveStatus({ error: true });
      });
  }

  function getElapsedTooLongRankingSkipResult(options = {}) {
    const elapsedSeconds = Math.max(1, Number(options.elapsedSeconds) || 1);
    const formatElapsedText = typeof options.formatRankingElapsedText === 'function'
      ? options.formatRankingElapsedText
      : value => `${value}초`;
    return {
      skipped: true,
      reason: 'elapsed-too-long',
      elapsedSeconds,
      elapsedText: formatElapsedText(elapsedSeconds)
    };
  }

  function getRankingCompleteSaveAction(options = {}) {
    if(options.modeId !== 'ranking') return 'none';
    if(options.reason === 'elapsed-too-long') return 'skip-elapsed-too-long';
    return 'save-record';
  }

  function getRankingWrongAnswerState(options = {}) {
    const currentLives = Math.max(0, Number(options.currentRankingLives) || 0);
    const isRankingWrongAnswer = options.modeId === 'ranking' && !options.isCorrect;
    const nextRankingLives = isRankingWrongAnswer ? Math.max(0, currentLives - 1) : currentLives;
    return {
      nextRankingLives,
      rankingEndedByWrongAnswer: isRankingWrongAnswer && nextRankingLives <= 0
    };
  }

  function getNextQuestionAction(options = {}) {
    const nextQuestionIndex = Math.max(0, Number(options.nextQuestionIndex) || 0);
    const questionCount = Math.max(0, Number(options.questionCount) || 0);
    return nextQuestionIndex >= questionCount ? 'complete' : 'render-question';
  }

  function resolveCurrentQuestionSet(options = {}) {
    if(Array.isArray(options.currentSessionQuestions) && options.currentSessionQuestions.length) return options.currentSessionQuestions;
    const firebaseQuizDataCache = options.firebaseQuizDataCache || {};
    const questionBank = options.questionBank || {};
    return firebaseQuizDataCache[options.firebaseQuizId]
      || questionBank[options.currentQuizId]
      || questionBank.spelling
      || [];
  }

  function hasSolvedPracticeQuestion(question, solvedIds, getPracticeQuestionIdCandidates) {
    if(!solvedIds || !solvedIds.size || typeof getPracticeQuestionIdCandidates !== 'function') return false;
    return getPracticeQuestionIdCandidates(question).some(id => solvedIds.has(id));
  }

  function splitPracticeQuestionsBySolvedState(baseQuestions, solvedIds, getPracticeQuestionIdCandidates) {
    const unsolved = [];
    const solved = [];
    (Array.isArray(baseQuestions) ? baseQuestions : []).forEach(question => {
      if(hasSolvedPracticeQuestion(question, solvedIds, getPracticeQuestionIdCandidates)) solved.push(question);
      else unsolved.push(question);
    });
    return { unsolved, solved };
  }

  function getPracticeQuestionId(question) {
    return String(question?.practiceQuestionId || question?.questionId || question?.answerText || question?.question || '').trim();
  }

  function getPracticeQuestionIdCandidates(question) {
    const candidates = [
      question?.practiceQuestionId,
      ...(Array.isArray(question?.legacyPracticeIds) ? question.legacyPracticeIds : []),
      question?.questionId,
      question?.answerText,
      question?.question
    ].map(id => String(id || '').trim()).filter(Boolean);
    return Array.from(new Set(candidates));
  }

  function isFirestoreQuotaExceededError(error) {
    const code = String(error?.code || '').toLowerCase();
    const message = String(error?.message || error?.name || '').toLowerCase();
    return code.includes('resource-exhausted')
      || message.includes('quota exceeded')
      || message.includes('too many requests')
      || message.includes('resource-exhausted');
  }

  function isFirestorePermissionDeniedError(error) {
    const code = String(error?.code || '').toLowerCase();
    const message = String(error?.message || error?.name || '').toLowerCase();
    return code.includes('permission-denied')
      || message.includes('missing or insufficient permissions');
  }

  function getPracticeTargetForQuiz(quizId, meta = {}, deps = {}) {
    const normalizeQuizId = deps.normalizeFirebaseQuizId || (value => String(value || '').trim());
    const id = normalizeQuizId(quizId);
    const completionType = String(meta?.completionType || '').trim();
    const pokemonGenerationMatch = id.match(/^pokemon-gen([1-9])$/);
    if(pokemonGenerationMatch) {
      const generation = pokemonGenerationMatch[1];
      return {
        area: '포켓몬',
        detail: `${generation}세대`,
        areaKey: `포켓몬/gen${generation}`,
        completionType: completionType || 'loop'
      };
    }
    if(/^pokemon-(easy|normal|hard|very-hard)$/.test(id)) return null;
    const targets = {
      'random-basic': { area: '수학', detail: '곱셈과 나눗셈', areaKey: '수학/random-basic', completionType: 'loop' },
      spelling: { area: '일상', detail: '맞춤법', areaKey: '일상/맞춤법', completionType: 'loop' },
      'dad-joke': { area: '일상', detail: '아재개그', areaKey: '일상/아재개그', completionType: completionType || 'loop' },
      'word-relation': { area: '국어', detail: '다의어·동형이의어', areaKey: '국어/word-relation', completionType: 'loop' },
      gmo: { area: '국어', detail: '독서:지엠오 아이', areaKey: '국어/gmo', completionType: 'complete' },
      time_store: { area: '국어', detail: '독서:시간가게', areaKey: '국어/독서:시간가게', completionType: completionType || 'complete' },
      samgukji: { area: '사회', detail: '삼국지', areaKey: '사회/three-kingdoms', completionType: completionType || 'loop' },
      'ancient-history': { area: '사회', detail: '고대사~삼국시대', areaKey: '사회/ancient-three-kingdoms', completionType: completionType || 'loop' },
      'history-people': { area: '인물', detail: '역사인물', areaKey: '인물/역사인물', completionType: completionType || 'loop' },
      idol: { area: '인물', detail: '아이돌', areaKey: '인물/아이돌', completionType: completionType || 'loop' },
      anime: { area: '인물', detail: '애니', areaKey: '인물/애니', completionType: completionType || 'loop' },
      tiniping: { area: '인물', detail: '티니핑', areaKey: '인물/티니핑', completionType: completionType || 'loop' }
    };
    return targets[id] || null;
  }

  function buildPracticeProgressRecordId(memberUserId, areaKey, deps = {}) {
    const slugKey = deps.slugPracticeKey || (value => String(value || '').trim());
    return `${memberUserId}__${slugKey(areaKey).replace(/-/g, '_')}`;
  }

  function getRankingTargetForQuiz(quizId, deps = {}) {
    const normalizeQuizId = deps.normalizeFirebaseQuizId || (value => String(value || '').trim());
    const slugKey = deps.slugPracticeKey || (value => String(value || '').trim());
    const normalizeRankingMode = deps.normalizeFirebaseRankingMode || (value => String(value || 'normal').trim() || 'normal');
    const supportedRankingMode = deps.getSupportedRankingModeForQuiz || ((id, mode) => mode || 'normal');
    const currentRankingModeId = deps.currentRankingModeId || 'normal';
    const id = normalizeQuizId(quizId);
    const pokemonGenerationMatch = id.match(/^pokemon-gen([1-9])$/);
    if(pokemonGenerationMatch) {
      const generation = pokemonGenerationMatch[1];
      return {
        category: `포켓몬(${generation}세대)`,
        subFilter: `${generation}세대`,
        categoryKey: slugKey(`포켓몬(${generation}세대)`),
        rankingMode: 'normal'
      };
    }
    const pokemonDifficultyTargets = {
      'pokemon-easy': { category: '포켓몬(쉬움)', subFilter: '쉬움' },
      'pokemon-normal': { category: '포켓몬(보통)', subFilter: '보통' },
      'pokemon-hard': { category: '포켓몬(어려움)', subFilter: '어려움' },
      'pokemon-very-hard': { category: '포켓몬(헬)', subFilter: '헬' }
    };
    if(pokemonDifficultyTargets[id]) {
      const target = pokemonDifficultyTargets[id];
      return {
        ...target,
        categoryKey: slugKey(target.category),
        rankingMode: normalizeRankingMode(currentRankingModeId)
      };
    }
    const targets = {
      'random-basic': { category: '수학(곱셈과 나눗셈)', subFilter: '곱셈과 나눗셈' },
      spelling: { category: '맞춤법', subFilter: '' },
      'dad-joke': { category: '아재개그', subFilter: '' },
      'word-relation': { category: '단어(다의어·동형이의어)', subFilter: '다의어·동형이의어' },
      gmo: { category: '독서(지엠오 아이)', subFilter: '지엠오 아이' },
      time_store: { category: '독서(시간가게)', subFilter: '시간가게' },
      samgukji: { category: '사회(삼국지)', subFilter: '삼국지' },
      'ancient-history': { category: '사회(고대사~삼국시대)', subFilter: '고대사~삼국시대' },
      'history-people': { category: '인물(역사 인물)', subFilter: '역사 인물' },
      idol: { category: '인물(아이돌)', subFilter: '아이돌' },
      anime: { category: '인물(애니)', subFilter: '애니' },
      tiniping: { category: '티니핑', subFilter: '티니핑' }
    };
    const target = targets[id];
    if(!target) return null;
    return {
      ...target,
      categoryKey: slugKey(target.category),
      rankingMode: supportedRankingMode(id, currentRankingModeId)
    };
  }

  function buildRankingRecordId(memberUserId, categoryKey, rankingMode, deps = {}) {
    const slugKey = deps.slugPracticeKey || (value => String(value || '').trim());
    const safeUserId = slugKey(memberUserId).replace(/-/g, '_');
    const safeCategory = slugKey(categoryKey).replace(/-/g, '_');
    return `firebase_${safeUserId}_${safeCategory}_${rankingMode}_${Date.now()}`;
  }

  function isBetterRankingEntry(next, current) {
    if(!current) return true;
    if((next.score || 0) !== (current.score || 0)) return (next.score || 0) > (current.score || 0);
    const nextTime = Number(next.elapsedSeconds) || 999999999;
    const currentTime = Number(current.elapsedSeconds) || 999999999;
    return nextTime < currentTime;
  }

  function buildUserRankingSummaryUpdate(summary, record, updatedAt, deps = {}) {
    const getCategoryKey = deps.getRankingCategoryKey || (item => item?.categoryKey || item?.category || '');
    const existing = summary || {};
    const categoryKey = getCategoryKey(record);
    const byMode = { ...(existing.byMode || {}) };
    const bestScoresByMode = { ...(existing.bestScoresByMode || {}) };
    const modeSummary = {
      ...(byMode[record.rankingMode] || {}),
      byCategory: { ...((byMode[record.rankingMode] || {}).byCategory || {}) }
    };
    const bestModeSummary = { ...(bestScoresByMode[record.rankingMode] || {}) };
    const currentEntry = modeSummary.byCategory[categoryKey];

    if(isBetterRankingEntry(record, currentEntry)) {
      modeSummary.byCategory[categoryKey] = {
        rank: Number(currentEntry?.rank) || 0,
        total: Number(currentEntry?.total) || 0,
        score: record.score,
        elapsedSeconds: record.elapsedSeconds,
        elapsedText: record.elapsedText,
        recordId: record.recordId,
        category: categoryKey === '티니핑' ? '티니핑' : record.category
      };
      bestModeSummary[categoryKey] = {
        score: record.score,
        elapsedSeconds: record.elapsedSeconds,
        recordId: record.recordId
      };
    }

    byMode[record.rankingMode] = modeSummary;
    bestScoresByMode[record.rankingMode] = bestModeSummary;

    return {
      memberUserId: record.memberUserId,
      userId: record.userId,
      displayName: record.displayName,
      hasUserId: true,
      totalRecordCount: (Number(existing.totalRecordCount) || 0) + 1,
      legacyRecordCount: Number(existing.legacyRecordCount) || 0,
      byMode,
      bestScoresByMode,
      migrationSource: 'firebase_app_ranking',
      updatedAt
    };
  }

  function buildQuizKingSummaryUpdate(summary, record, updatedAt, deps = {}) {
    const getCategoryKey = deps.getRankingCategoryKey || (item => item?.categoryKey || item?.category || '');
    const normalizeCategoryKey = deps.normalizeRankingCategoryKey || ((categoryKey, category = '') => categoryKey || category || '');
    const existing = summary || {};
    const categoryKey = getCategoryKey(record);
    const categories = Array.isArray(existing.categories) ? [...existing.categories] : [];
    const index = categories.findIndex(item => normalizeCategoryKey(item?.categoryKey, item?.category) === categoryKey);
    const current = index >= 0 ? categories[index] : null;

    if(isBetterRankingEntry(record, current)) {
      const nextCategory = {
        categoryKey,
        category: categoryKey === '티니핑' ? '티니핑' : record.category,
        score: record.score,
        elapsedSeconds: record.elapsedSeconds,
        elapsedText: record.elapsedText,
        rankingMode: record.rankingMode,
        recordId: record.recordId
      };
      if(index >= 0) categories[index] = nextCategory;
      else categories.push(nextCategory);
    }

    categories.sort((a, b) => String(a.category || '').localeCompare(String(b.category || ''), 'ko'));
    return {
      memberUserId: record.memberUserId,
      userId: record.userId,
      displayName: record.displayName,
      hasUserId: true,
      categories,
      totalScore: categories.reduce((sum, item) => sum + (Number(item.score) || 0), 0),
      categoryCount: categories.length,
      rank: Number(existing.rank) || 0,
      migrationSource: 'firebase_app_ranking',
      updatedAt
    };
  }

  function getPracticeBadgeMeta(areaKey, area, detail, deps = {}) {
    const slugKey = deps.slugPracticeKey || (value => String(value || '').trim());
    const [groupRaw, detailRaw] = String(areaKey || '').split('/');
    const groupMap = {
      '포켓몬': 'pokemon',
      '인물': 'people',
      '일상': 'daily',
      '국어': 'korean',
      '수학': 'math',
      '사회': 'social'
    };
    const group = groupMap[groupRaw] || slugKey(groupRaw || area);
    const badgeId = `${group}_${slugKey(detailRaw || detail).replace(/-/g, '_')}`;
    return {
      group,
      badgeId,
      label: detail || detailRaw || badgeId
    };
  }

  function buildPracticeSummaryUpdate(summary, options, deps = {}) {
    const existingSummary = summary || {};
    const meta = getPracticeBadgeMeta(options.areaKey, options.area, options.detail, deps);
    const starDelta = Math.max(0, options.nextStarCount - options.previousStarCount);
    const groupStars = { ...(existingSummary.groupStars || {}) };
    const groups = { ...(existingSummary.groups || {}) };
    const groupItems = { ...(groups[meta.group] || {}) };
    const correct = Math.min(options.nextCorrectCount || 0, options.totalCount || 0);
    const total = options.totalCount || 0;
    const available = (options.nextStarCount || 0) > 0 || (!!total && correct >= total);

    groupStars[meta.group] = (Number(groupStars[meta.group]) || 0) + starDelta;
    groupItems[meta.badgeId] = {
      correct,
      total,
      starCount: options.nextStarCount || 0,
      available
    };
    groups[meta.group] = groupItems;

    return {
      userId: options.memberUserId,
      memberUserId: options.memberUserId,
      totalStars: (Number(existingSummary.totalStars) || 0) + starDelta,
      recordCount: (Number(existingSummary.recordCount) || 0) + (options.recordExists ? 0 : 1),
      groupStars,
      groups,
      updatedAt: options.updatedAt
    };
  }

  function buildPracticeBadgeUpdate(options, deps = {}) {
    const meta = getPracticeBadgeMeta(options.areaKey, options.area, options.detail, deps);
    const correct = Math.min(options.nextCorrectCount || 0, options.totalCount || 0);
    const total = options.totalCount || 0;
    const completed = !!total && (correct >= total || (options.nextStarCount || 0) > 0);
    const progressPercent = total ? Math.min(100, Math.round((correct / total) * 100)) : 0;
    return {
      userId: options.memberUserId,
      memberUserId: options.memberUserId,
      badgeId: meta.badgeId,
      label: meta.label,
      group: meta.group,
      areaKey: options.areaKey,
      sourceId: meta.badgeId,
      correct,
      total,
      starCount: options.nextStarCount || 0,
      completed,
      progressPercent,
      available: (options.nextStarCount || 0) > 0 || completed,
      migrationSource: 'firebase_app_practice_progress',
      updatedAt: options.updatedAt
    };
  }

  async function grantPracticeCorrectReward(memberUserId, rewardCoin, context, deps = {}) {
    if(!rewardCoin || rewardCoin <= 0) return null;
    const functions = deps.getFirebaseFunctions?.();
    if(!functions) throw new Error('functions-unavailable');
    const debugLog = deps.debugLog || (() => {});

    debugLog('Practice reward economy update queued:', {
      rewardCoin,
      context
    });
    const grantPracticeReward = functions.httpsCallable('grantPracticeReward');
    const response = await grantPracticeReward({
      memberUserId,
      recordId: context?.recordId || '',
      questionId: context?.questionId || '',
      quizId: context?.quizId || ''
    });
    const result = response?.data || {};
    deps.resetUserEconomyCache?.();
    debugLog('Firestore practice reward update succeeded:', {
      economyPath: result.economyPath || '',
      rewardLogPath: result.rewardLogPath || '',
      rewardCoin: result.rewardCoin || 0,
      duplicate: !!result.duplicate,
      context
    });
    return result.economyPath || null;
  }

  async function syncMemberTitlesAfterPracticeCompletion(memberUserId, context, deps = {}) {
    const functions = deps.getFirebaseFunctions?.();
    if(!functions) throw new Error('functions-unavailable');
    const debugLog = deps.debugLog || (() => {});
    const syncMemberTitles = functions.httpsCallable('syncMemberTitles');
    const response = await syncMemberTitles({ memberUserId });
    const result = response?.data || {};
    if(Number(result.awardedCount) > 0) {
      debugLog('Firestore title sync awarded titles:', {
        awardedCount: result.awardedCount,
        awardedTitles: result.awardedTitles || [],
        context
      });
      deps.resetTitleCatalogCache?.();
    } else {
      debugLog('Firestore title sync completed with no new titles:', {
        titleCount: result.titleCount || 0,
        context
      });
    }
    return result;
  }

  async function saveRankingRecordOnQuizComplete(deps = {}) {
    if(deps.getCurrentModeId?.() !== 'ranking') return null;
    const db = deps.getFirestoreDb?.();
    if(!db) throw new Error('firestore-unavailable');

    const memberUserId = deps.getCurrentDataOwnerId?.();
    if(!memberUserId || memberUserId === deps.testShopUserId) throw new Error('member-required');
    const correctCount = deps.getCorrectAnswerCount?.() || 0;
    const quizId = deps.normalizeFirebaseQuizId?.(deps.getCurrentQuizId?.()) || '';
    const debugLog = deps.debugLog || (() => {});
    if(correctCount <= 0) {
      debugLog('Ranking record skipped because score is 0.', {
        quizId
      });
      return { skipped: true, reason: 'zero-score' };
    }

    const target = deps.getRankingTargetForQuiz?.(quizId);
    if(!target) throw new Error('unsupported-ranking-target');

    const profile = deps.getCurrentMemberProfile?.() || {};
    const elapsedSeconds = deps.getRankingElapsedSeconds?.() || 0;
    const maxElapsedSeconds = deps.getMaxRankingElapsedSeconds?.() || 0;
    if(elapsedSeconds > maxElapsedSeconds) {
      console.warn('Ranking record skipped because elapsed time is too long.', {
        quizId,
        elapsedSeconds,
        maxElapsedSeconds
      });
      return {
        skipped: true,
        reason: 'elapsed-too-long',
        elapsedSeconds,
        elapsedText: deps.formatRankingElapsedText?.(elapsedSeconds) || `${elapsedSeconds}초`
      };
    }
    const fieldValue = deps.getFirestoreFieldValue?.();
    const recordId = deps.buildRankingRecordId?.(memberUserId, target.categoryKey, target.rankingMode);
    const recordRef = db.collection('rankingRecords').doc(recordId);
    const userSummaryRef = db.collection('userRankingSummary').doc(memberUserId);
    const quizKingSummaryRef = db.collection('quizKingSummary').doc(memberUserId);
    const record = {
      recordId,
      memberUserId,
      userId: memberUserId,
      displayName: profile.nickname || profile.name || memberUserId,
      grade: String(profile.grade || ''),
      classNo: String(profile.classNo || profile.classNumber || ''),
      number: String(profile.number || profile.studentNumber || ''),
      profileImageUrl: profile.profileImageUrl || '',
      rankingMessage: profile.rankingMessage || '',
      selectedTitleId: profile.selectedTitleId || '',
      quizId,
      category: target.category,
      categoryKey: target.categoryKey,
      rawCategory: target.category,
      subFilter: target.subFilter,
      score: correctCount,
      elapsedSeconds,
      elapsedText: deps.formatRankingElapsedText?.(elapsedSeconds) || `${elapsedSeconds}초`,
      rankingMode: target.rankingMode,
      sourceSheet: 'firebase-app',
      sourceRowNumber: 0,
      legacy: false,
      hasUserId: true,
      recordedAt: fieldValue.serverTimestamp(),
      createdAt: fieldValue.serverTimestamp(),
      updatedAt: fieldValue.serverTimestamp(),
      migrationSource: 'firebase_app_ranking'
    };

    const [userSummarySnapshot, quizKingSummarySnapshot] = await Promise.all([
      userSummaryRef.get(),
      quizKingSummaryRef.get()
    ]);
    const userSummaryData = deps.buildUserRankingSummaryUpdate?.(
      userSummarySnapshot.exists ? userSummarySnapshot.data() : {},
      record,
      fieldValue.serverTimestamp()
    );
    const quizKingSummaryData = deps.buildQuizKingSummaryUpdate?.(
      quizKingSummarySnapshot.exists ? quizKingSummarySnapshot.data() : {},
      record,
      fieldValue.serverTimestamp()
    );
    const batch = db.batch();
    batch.set(recordRef, record, { merge: true });
    batch.set(userSummaryRef, userSummaryData, { merge: true });
    batch.set(quizKingSummaryRef, quizKingSummaryData, { merge: true });
    await batch.commit();

    debugLog('Firestore ranking record save succeeded:', {
      recordId,
      score: correctCount,
      categoryKey: target.categoryKey,
      elapsedSeconds
    });
    return {
      recordId,
      score: correctCount,
      categoryKey: target.categoryKey,
      elapsedText: record.elapsedText
    };
  }

  async function savePracticeProgressAfterCorrectAnswer(question, deps = {}) {
    if(deps.getCurrentModeId?.() !== 'practice') return null;
    const db = deps.getFirestoreDb?.();
    if(!db) throw new Error('firestore-unavailable');

    const memberUserId = deps.getCurrentDataOwnerId?.();
    if(!memberUserId || memberUserId === deps.testShopUserId) throw new Error('member-required');

    const questionId = deps.getPracticeQuestionId?.(question);
    if(!questionId) throw new Error('missing-question-id');
    const questionIdCandidates = deps.getPracticeQuestionIdCandidates?.(question) || [];

    const quizId = deps.normalizeFirebaseQuizId?.(deps.getCurrentQuizId?.()) || '';
    const meta = await deps.loadFirebaseQuizMeta?.(quizId);
    const target = deps.getPracticeTargetForQuiz?.(quizId, meta);
    if(!target) throw new Error('unsupported-practice-target');

    const totalCount = Number(meta?.questionCount) || deps.getCurrentQuestionSet?.().length;
    if(!totalCount || totalCount <= 0) throw new Error('invalid-total-count');

    const recordId = deps.buildPracticeProgressRecordId?.(memberUserId, target.areaKey);
    const recordRef = db.collection('practiceRecords').doc(recordId);
    const summaryRef = db.collection('userPracticeSummary').doc(memberUserId);
    const authUid = deps.getFirebaseAuthUser?.()?.uid || '';
    const fieldValue = deps.getFirestoreFieldValue?.();
    let saveResult = null;
    let readFallback = false;
    let snapshot = null;
    let summarySnapshot = null;
    const debugLog = deps.debugLog || (() => {});

    const [recordReadResult, summaryReadResult] = await Promise.allSettled([
      recordRef.get(),
      summaryRef.get()
    ]);
    if(recordReadResult.status === 'fulfilled') {
      snapshot = recordReadResult.value;
    } else {
      const error = recordReadResult.reason;
      if(!deps.isFirestorePermissionDeniedError?.(error)) throw error;
      readFallback = true;
      console.warn('Practice progress record read blocked; using write-only fallback for legacy or missing progress document.', {
        recordPath: recordRef.path,
        code: error?.code || '',
        message: error?.message || ''
      });
    }
    if(summaryReadResult.status === 'fulfilled') {
      summarySnapshot = summaryReadResult.value;
    } else {
      const error = summaryReadResult.reason;
      if(!deps.isFirestorePermissionDeniedError?.(error)) throw error;
      console.warn('Practice summary read blocked; continuing with merge-only summary update.', {
        summaryPath: summaryRef.path,
        code: error?.code || '',
        message: error?.message || ''
      });
    }
    const existing = snapshot?.exists ? snapshot.data() || {} : {};
    const existingSummary = summarySnapshot?.exists ? summarySnapshot.data() || {} : {};
    const existingIds = Array.isArray(existing.correctIds) ? existing.correctIds.map(id => String(id || '').trim()).filter(Boolean) : [];
    const isDuplicateCorrectId = questionIdCandidates.some(id => existingIds.includes(id));
    const mergedIds = isDuplicateCorrectId ? existingIds : Array.from(new Set([...existingIds, questionId]));
    const previousCorrectCount = Number(existing.correctCount) || existingIds.length;
    const existingStarCount = Number(existing.starCount) || 0;
    const flags = await deps.loadFeatureFlags?.();
    const rewardDisabled = flags.practiceRewardEnabled === false;
    const rewardCoin = (isDuplicateCorrectId || rewardDisabled) ? 0 : deps.getPracticeCorrectCoin?.();
    const completed = mergedIds.length >= totalCount;
    const isCompleteType = target.completionType === 'complete';
    let nextIds = mergedIds;
    let nextCorrectCount = mergedIds.length;
    let nextStarCount = existingStarCount;
    let completedRound = false;
    const nextData = {
      recordId,
      memberUserId,
      userId: memberUserId,
      authUid,
      quizId,
      area: target.area,
      detail: target.detail,
      areaKey: target.areaKey,
      completionType: target.completionType,
      inferredCompletionType: false,
      totalCount,
      mode: 'practice',
      source: 'firebase-app',
      version: 2,
      updatedAt: fieldValue.serverTimestamp(),
      lastAchievedAt: fieldValue.serverTimestamp()
    };

    if(!snapshot?.exists) {
      nextData.createdAt = fieldValue.serverTimestamp();
    }

    if(completed) {
      completedRound = true;
      if(isCompleteType) {
        nextStarCount = 1;
        nextIds = [];
        nextCorrectCount = totalCount;
      } else {
        nextStarCount += 1;
        nextIds = [];
        nextCorrectCount = 0;
      }
      nextData.completed = true;
      nextData.firstCompletedAt = existing.firstCompletedAt || fieldValue.serverTimestamp();
      nextData.lastCompletedAt = fieldValue.serverTimestamp();
    } else {
      nextData.completed = !!existing.completed;
      if(existing.firstCompletedAt) nextData.firstCompletedAt = existing.firstCompletedAt;
      if(existing.lastCompletedAt) nextData.lastCompletedAt = existing.lastCompletedAt;
    }

    nextData.correctIds = readFallback ? fieldValue.arrayUnion(questionId) : nextIds;
    nextData.correctCount = readFallback ? fieldValue.increment(1) : nextCorrectCount;
    nextData.starCount = nextStarCount;
    const summaryData = deps.buildPracticeSummaryUpdate?.(existingSummary, {
      memberUserId,
      recordExists: !!snapshot?.exists,
      area: target.area,
      detail: target.detail,
      areaKey: target.areaKey,
      totalCount,
      previousStarCount: existingStarCount,
      nextStarCount,
      nextCorrectCount,
      updatedAt: fieldValue.serverTimestamp()
    });
    const badgeData = deps.buildPracticeBadgeUpdate?.({
      memberUserId,
      area: target.area,
      detail: target.detail,
      areaKey: target.areaKey,
      totalCount,
      nextStarCount,
      nextCorrectCount,
      updatedAt: fieldValue.serverTimestamp()
    });
    const badgeRef = db.collection('userBadges').doc(memberUserId).collection('badges').doc(badgeData.badgeId);
    saveResult = {
      recordId,
      questionId,
      duplicate: isDuplicateCorrectId,
      readFallback,
      completed,
      completedRound,
      completionType: target.completionType,
      rewardCoin,
      rewardDisabled,
      previousCorrectCount,
      nextCorrectCount,
      previousStarCount: existingStarCount,
      nextStarCount,
      badgePath: badgeRef.path
    };
    if(isDuplicateCorrectId) {
      debugLog('Practice progress duplicate correctId; correctCount unchanged as expected:', saveResult);
      debugLog('Practice reward skipped for duplicate correctId:', {
        recordId,
        questionId,
        rewardCoin
      });
    } else {
      debugLog('Practice progress new correctId added:', saveResult);
    }
    debugLog('Practice progress write paths:', {
      recordPath: recordRef.path,
      summaryPath: summaryRef.path,
      badgePath: badgeRef.path,
      readFallback
    });
    await recordRef.set(nextData, { merge: true });

    const batch = db.batch();
    batch.set(summaryRef, summaryData, { merge: true });
    batch.set(badgeRef, badgeData, { merge: true });
    await batch.commit();

    if(readFallback) {
      debugLog('Practice progress primary record update succeeded with write-only fallback; summary and badge were merged after the write.', saveResult);
    }

    debugLog('Firestore practice progress update succeeded:', saveResult || { recordId, questionId });
    if(saveResult && saveResult.completedRound) {
      debugLog('Practice completion round applied:', {
        recordId: saveResult.recordId,
        completionType: saveResult.completionType,
        previousStarCount: saveResult.previousStarCount,
        nextStarCount: saveResult.nextStarCount,
        badgePath: saveResult.badgePath
      });
      deps.syncMemberTitlesAfterPracticeCompletion?.(memberUserId, {
        recordId: saveResult.recordId,
        quizId,
        completionType: saveResult.completionType
      }).catch(error => {
        console.warn('Firestore title sync after practice completion failed.', error);
      });
    }
    if(saveResult && saveResult.rewardCoin > 0) {
      await deps.grantPracticeCorrectReward?.(memberUserId, saveResult.rewardCoin, {
        recordId: saveResult.recordId,
        questionId: saveResult.questionId,
        quizId
      });
    } else if(saveResult && saveResult.rewardDisabled && !saveResult.duplicate) {
      debugLog('Practice reward skipped because reward feature is disabled:', {
        recordId: saveResult.recordId,
        questionId: saveResult.questionId
      });
    }
    return saveResult || { recordId, questionId };
  }

  function startRankingSessionTimerIfNeeded(deps = {}) {
    deps.clearRankingSessionTimer?.();
    if(deps.getCurrentModeId?.() !== 'ranking') return null;
    const timer = setInterval(() => {
      if(deps.getCurrentModeId?.() !== 'ranking') {
        deps.clearRankingSessionTimer?.();
        return;
      }
      if((deps.getRankingElapsedSeconds?.() || 0) >= (deps.getMaxRankingElapsedSeconds?.() || 0)) {
        deps.handleRankingSessionTimeout?.();
      }
    }, 1000);
    deps.setCurrentRankingSessionTimer?.(timer);
    return timer;
  }

  function handleRankingSessionTimeout(deps = {}) {
    if(deps.getCurrentModeId?.() !== 'ranking') return;
    deps.clearRankingQuestionTimer?.();
    deps.clearRankingSessionTimer?.();
    deps.setCurrentQuestionResolved?.(true);
    disableQuizAnswerControls(deps.getQuizPlayRoot?.());
    deps.showQuizComplete?.({ skipped: true, reason: 'elapsed-too-long', forced: true });
  }

  function startRankingQuestionTimerIfNeeded(deps = {}) {
    deps.clearRankingQuestionTimer?.();
    if(deps.getCurrentModeId?.() !== 'ranking') return null;
    deps.setCurrentRankingTimeLeft?.(deps.getRankingTimeLimitSecondsForQuiz?.(deps.getCurrentQuizId?.()));
    const updateProgress = () => {
      const progress = deps.getQuizProgressElement?.();
      if(progress) progress.textContent = getRankingTimedProgressText(deps.getQuizProgressText?.(), deps.getCurrentRankingTimeLeft?.());
    };
    updateProgress();
    const timer = setInterval(() => {
      deps.decreaseCurrentRankingTimeLeft?.(0.1);
      updateProgress();
      if((deps.getCurrentRankingTimeLeft?.() || 0) <= 0) deps.handleRankingTimeout?.();
    }, 100);
    deps.setCurrentRankingQuestionTimer?.(timer);
    return timer;
  }

  function handleRankingTimeout(deps = {}) {
    if(deps.getCurrentModeId?.() !== 'ranking' || deps.getCurrentQuestionResolved?.()) return;
    deps.setCurrentQuestionResolved?.(true);
    deps.clearRankingQuestionTimer?.();
    disableQuizAnswerControls(deps.getQuizPlayRoot?.());
    deps.showQuizResult?.(false, '시간 초과로 하트가 1개 줄었어요.');
  }

  function submitAnswer(deps = {}) {
    if(deps.getCurrentQuestionResolved?.()) return null;
    const question = deps.getCurrentQuestionSet?.()[deps.getCurrentQuestionIndex?.()];
    const input = deps.getQuizAnswerInput?.();
    const submitResult = getQuizAnswerSubmitResult(question, {
      submittedAnswer: input?.value,
      selectedChoiceIndex: deps.getSelectedChoiceIndex?.(),
      normalizeQuizAnswer: deps.normalizeQuizAnswer
    });
    if(!submitResult.canSubmit) return null;
    const isCorrect = submitResult.isCorrect;
    if(question.type === 'imageInput' || question.type === 'textInput') {
      if(input) input.disabled = true;
    }
    deps.setCurrentQuestionResolved?.(true);
    deps.clearRankingQuestionTimer?.();
    if(isCorrect) deps.incrementCorrectAnswerCount?.();
    if(isCorrect) deps.recordEducationCorrectForPopularUnlock?.(deps.getCurrentQuizId?.());
    let progressSavePromise = null;
    if(shouldSavePracticeProgress({ isCorrect, modeId: deps.getCurrentModeId?.() })) {
      deps.debugLog?.('Practice progress correct questionId:', {
        questionId: deps.getPracticeQuestionId?.(question),
        quizId: deps.normalizeFirebaseQuizId?.(deps.getCurrentQuizId?.())
      });
      progressSavePromise = deps.savePracticeProgressAfterCorrectAnswer?.(question);
    }
    disableQuizAnswerControls(deps.getQuizPlayRoot?.());
    deps.showQuizResult?.(isCorrect);
    attachPracticeProgressSaveStatus(progressSavePromise, {
      renderPracticeSaveStatus: deps.renderPracticeSaveStatus,
      isFirestoreQuotaExceededError: deps.isFirestoreQuotaExceededError,
      warn: console.warn
    });
    return { isCorrect, progressSavePromise };
  }

  function showQuizResult(isCorrect, overrideMessage, deps = {}) {
    const root = deps.getQuizPlayRoot?.();
    const questionSet = deps.getCurrentQuestionSet?.() || [];
    const question = questionSet[deps.getCurrentQuestionIndex?.()];
    const rankingWrongAnswerState = getRankingWrongAnswerState({
      modeId: deps.getCurrentModeId?.(),
      isCorrect,
      currentRankingLives: deps.getCurrentRankingLives?.()
    });
    deps.setCurrentRankingLives?.(rankingWrongAnswerState.nextRankingLives);
    const viewModel = getQuizResultViewModel({
      isCorrect,
      question,
      modeId: deps.getCurrentModeId?.(),
      rankingEndedByWrongAnswer: rankingWrongAnswerState.rankingEndedByWrongAnswer,
      overrideMessage,
      isLastQuestion: (deps.getCurrentQuestionIndex?.() || 0) + 1 >= questionSet.length
    });

    root?.appendChild(createQuizResultCard(viewModel));
    return viewModel;
  }

  function createQuizPlaySessionState(options = {}) {
    const modeId = options.modeId || 'practice';
    const rankingModeId = modeId === 'ranking' ? (options.rankingModeId || 'normal') : 'normal';
    return {
      currentQuizId: options.quizId || 'spelling',
      currentModeId: modeId,
      currentRankingModeId: rankingModeId,
      currentQuestionIndex: 0,
      selectedChoiceIndex: null,
      correctAnswerCount: 0,
      currentQuizStartedAtMs: Number(options.startedAtMs) || Date.now(),
      currentRankingLives: modeId === 'ranking' ? (rankingModeId === 'onechance' ? 1 : 3) : 0,
      currentQuestionResolved: false,
      currentSessionQuestions: null
    };
  }

  function getQuizPlayHeaderTitle(options = {}) {
    const quizTitle = String(options.quizTitle || '').replace(' 퀴즈', '');
    const modeTitle = String(options.modeTitle || '');
    const rankingModeLabel = String(options.rankingModeLabel || '');
    const modeLabel = options.isRanking && rankingModeLabel ? `${modeTitle} · ${rankingModeLabel}` : modeTitle;
    return `${quizTitle} ${modeLabel}`.trim();
  }

  function getQuizProgressText(options = {}) {
    const questionIndex = Math.max(0, Number(options.questionIndex) || 0);
    const questionCount = Math.max(0, Number(options.questionCount) || 0);
    const base = `문제 ${questionIndex + 1} / ${questionCount}`;
    if(options.modeId !== 'ranking') return base;
    const rankingLives = Math.max(0, Number(options.rankingLives) || 0);
    return `${base} · 생명력 ${'♥'.repeat(rankingLives)}`;
  }

  function getRankingTimeLimitSecondsForQuiz(quizId, rankingModeId, deps = {}) {
    if(rankingModeId === 'speed') return 5;
    const normalizeQuizId = deps.normalizeFirebaseQuizId || (value => String(value || '').trim());
    const id = normalizeQuizId(quizId);
    if(id === 'gmo' || id === 'time_store') return 60;
    if(id === 'random-basic') return 60;
    if(id === 'word-relation') return 30;
    if(id === 'samgukji' || id === 'ancient-history') return 15;
    return 12;
  }

  function getRankingElapsedSeconds(startedAtMs, nowMs = Date.now()) {
    return Math.max(1, Math.round((nowMs - (startedAtMs || nowMs)) / 1000));
  }

  function getRankingTimedProgressText(progressText, timeLeft) {
    return `${progressText} · ${Math.max(0, Math.ceil(Number(timeLeft) || 0))}초`;
  }

  function getQuizResultViewModel(options = {}) {
    const isCorrect = !!options.isCorrect;
    const rankingEndedByWrongAnswer = !!options.rankingEndedByWrongAnswer;
    const isLastQuestion = !!options.isLastQuestion;
    return {
      cardClassName: `quiz-result-card ${isCorrect ? 'is-correct' : 'is-wrong'}`,
      titleText: isCorrect ? '정답입니다!' : '오답입니다!',
      descriptionText: isCorrect
        ? (options.overrideMessage || '좋아요. 다음 문제도 이어서 풀어봅니다.')
        : getWrongAnswerFeedbackText(options.question, rankingEndedByWrongAnswer, options.overrideMessage),
      saveStatusText: isCorrect && options.modeId === 'practice' ? '기록 저장 중' : '',
      nextButtonText: rankingEndedByWrongAnswer || isLastQuestion ? '결과 보기' : '다음 문제',
      completeQuiz: rankingEndedByWrongAnswer
    };
  }

  function getQuizCompleteViewModel(options = {}) {
    const modeId = options.modeId || 'practice';
    const isRanking = modeId === 'ranking';
    const correctAnswerCount = Math.max(0, Number(options.correctAnswerCount) || 0);
    const questionCount = Math.max(0, Number(options.questionCount) || 0);
    const currentQuestionIndex = Math.max(0, Number(options.currentQuestionIndex) || 0);
    const answeredCount = isRanking ? Math.min(currentQuestionIndex + 1, questionCount) : questionCount;
    const correctRewardCoin = Math.max(0, Number(options.correctRewardCoin) || 0);
    const elapsedTooLong = options.reason === 'elapsed-too-long';
    const invalidRankingTimeMessage = options.invalidRankingTimeMessage || '';
    return {
      titleText: isRanking ? '랭킹전 종료' : '연습 완료',
      scoreText: `${answeredCount}문제 중 ${correctAnswerCount}개`,
      rewardItems: isRanking
        ? [
          { label: '랭킹 점수', value: `${correctAnswerCount}점` },
          { label: '기록 기준', value: '점수와 시간' }
        ]
        : [
          { label: '정답 기록', value: `${correctAnswerCount}개` },
          { label: '정답 보상', value: `새 문제 정답 +${correctRewardCoin} DJ코인` }
        ],
      noteText: isRanking
        ? (elapsedTooLong ? invalidRankingTimeMessage : '랭킹전 기록은 점수가 높을수록, 점수가 같으면 시간이 짧을수록 위에 표시됩니다.')
        : '이미 맞힌 문제는 중복 보상이 없고, 새로 맞힌 문제만 기록과 DJ코인이 반영됩니다.',
      saveStatusText: isRanking
        ? (elapsedTooLong ? invalidRankingTimeMessage : '랭킹 기록 저장 중')
        : ''
    };
  }

  function createQuizResultCard(viewModel) {
    const card = document.createElement('article');
    const title = document.createElement('h3');
    const desc = document.createElement('p');
    const saveStatus = document.createElement('p');
    const next = document.createElement('button');

    card.className = viewModel.cardClassName;
    title.textContent = viewModel.titleText;
    desc.textContent = viewModel.descriptionText;
    saveStatus.id = 'practice-save-status';
    saveStatus.className = 'quiz-progress';
    saveStatus.textContent = viewModel.saveStatusText;
    next.className = 'quiz-submit-button';
    next.type = 'button';
    next.textContent = viewModel.nextButtonText;
    next.dataset.nextQuestion = 'true';
    if(viewModel.completeQuiz) next.dataset.completeQuiz = 'true';

    card.append(title, desc, saveStatus, next);
    return card;
  }

  function createQuizCompleteCard(viewModel) {
    const card = document.createElement('article');
    const title = document.createElement('h3');
    const score = document.createElement('p');
    const rewardGrid = document.createElement('div');
    const note = document.createElement('p');
    const saveStatus = document.createElement('p');
    const back = document.createElement('button');

    card.className = 'quiz-complete-card';
    title.textContent = viewModel.titleText;
    score.className = 'quiz-complete-score';
    score.textContent = viewModel.scoreText;
    rewardGrid.className = 'quiz-reward-grid';
    viewModel.rewardItems.forEach(reward => {
      const item = document.createElement('p');
      const label = document.createElement('span');
      const value = document.createElement('strong');
      item.className = 'quiz-reward-card';
      label.textContent = reward.label;
      value.textContent = reward.value;
      item.append(label, value);
      rewardGrid.appendChild(item);
    });
    note.textContent = viewModel.noteText;
    saveStatus.id = 'ranking-save-status';
    saveStatus.className = 'quiz-progress';
    saveStatus.textContent = viewModel.saveStatusText;
    back.className = 'button primary';
    back.type = 'button';
    back.dataset.backToQuizSelect = 'true';
    back.textContent = '모드 선택으로 돌아가기';

    card.append(title, score, rewardGrid, note, saveStatus, back);
    return card;
  }

  function getPracticeSaveStatusText(result) {
    if(!result || result.error) return '기록 저장을 확인하지 못했어요.';
    if(result.duplicate) return '이미 맞힌 문제라 기록과 보상은 그대로예요.';
    const rewardText = result.rewardCoin > 0 ? ` · DJ코인 +${result.rewardCoin}` : '';
    const completeText = result.completed ? ` · 완주 ${result.nextStarCount}회` : '';
    return `기록 저장 완료${rewardText}${completeText}`;
  }

  function getRankingSaveStatusText(result, options = {}) {
    if(!result || result.error) return '랭킹 기록 저장을 확인하지 못했어요.';
    if(result.skipped && result.reason === 'zero-score') return '점수가 0점이라 랭킹 기록은 저장하지 않았어요.';
    if(result.skipped && result.reason === 'elapsed-too-long') return options.invalidRankingTimeMessage || '';
    return `랭킹 기록 저장 완료 · ${result.score}점 · ${result.elapsedText}`;
  }

  function createQuizAnswerInput(onInput) {
    const input = document.createElement('input');
    input.className = 'quiz-answer-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.placeholder = '정답 입력';
    input.setAttribute('aria-label', '정답 입력');
    if(typeof onInput === 'function') input.addEventListener('input', onInput);
    return input;
  }

  function createQuizImageAnswerField(question, onInput) {
    const imageWrap = document.createElement('div');
    const image = document.createElement('img');
    const input = createQuizAnswerInput(onInput);
    imageWrap.className = 'quiz-image-question';
    image.src = question?.imageUrl || '';
    image.alt = '퀴즈 이미지';
    image.loading = 'lazy';
    image.addEventListener('error', () => {
      imageWrap.classList.add('is-image-error');
    });
    imageWrap.appendChild(image);
    return { imageWrap, input };
  }

  function createQuizChoiceButton(choice, index) {
    const button = document.createElement('button');
    const choiceMarks = ['①', '②', '③', '④'];
    button.className = 'quiz-choice';
    button.type = 'button';
    button.dataset.choiceIndex = String(index);
    button.textContent = `${choiceMarks[index] || `${index + 1}.`} ${choice}`;
    return button;
  }

  function createQuizHintToggle(hintText) {
    const hintButton = document.createElement('button');
    const hintDisplay = document.createElement('p');
    hintButton.className = 'quiz-hint-button';
    hintButton.type = 'button';
    hintButton.textContent = '힌트';
    hintDisplay.className = 'quiz-hint-text';
    hintDisplay.textContent = hintText;
    hintDisplay.hidden = true;
    hintButton.addEventListener('click', () => {
      const nextHidden = !hintDisplay.hidden;
      hintDisplay.hidden = nextHidden;
      hintButton.textContent = nextHidden ? '힌트' : '닫기';
    });
    return { hintButton, hintDisplay };
  }

  function createQuizQuestionCard(options = {}) {
    const question = options.question || {};
    const card = document.createElement('article');
    const progress = document.createElement('p');
    const title = document.createElement('h3');
    const titleRow = document.createElement('div');
    const choices = document.createElement('div');
    const submit = document.createElement('button');

    card.className = 'quiz-question-card';
    progress.className = 'quiz-progress';
    progress.textContent = options.progressText || '';
    title.className = 'quiz-question-title';
    title.textContent = question.question || '';
    titleRow.className = 'quiz-question-title-row';
    choices.className = 'quiz-choice-list';
    submit.className = 'quiz-submit-button';
    submit.type = 'button';
    submit.textContent = '정답 제출';
    submit.disabled = true;

    const syncSubmitState = event => {
      submit.disabled = !String(event?.target?.value || '').trim();
    };

    if(question.type === 'imageInput') {
      const { imageWrap, input } = createQuizImageAnswerField(question, syncSubmitState);
      choices.append(imageWrap, input);
    } else if(question.type === 'textInput') {
      choices.appendChild(createQuizAnswerInput(syncSubmitState));
    } else {
      (Array.isArray(question.choices) ? question.choices : []).forEach((choice, index) => {
        choices.appendChild(createQuizChoiceButton(choice, index));
      });
    }

    titleRow.appendChild(title);
    if(options.shouldRenderHint) {
      const { hintButton, hintDisplay } = createQuizHintToggle(options.hintText || '');
      titleRow.appendChild(hintButton);
      card.append(progress, titleRow, hintDisplay);
    } else {
      card.append(progress, titleRow);
    }
    card.append(choices, submit);
    return card;
  }

  window.DJ48QuizPlay = {
    getKoreanInitials,
    getCurrentQuestionAnswerText,
    getQuestionHintText,
    getWrongAnswerFeedbackText,
    isTypingTarget,
    getNumericChoiceKey,
    getQuizPlayKeyAction,
    canSelectQuizChoice,
    applyQuizChoiceSelection,
    disableQuizAnswerControls,
    getQuizAnswerSubmitResult,
    shouldSavePracticeProgress,
    attachPracticeProgressSaveStatus,
    attachRankingSaveStatus,
    getElapsedTooLongRankingSkipResult,
    getRankingCompleteSaveAction,
    getRankingWrongAnswerState,
    getNextQuestionAction,
    resolveCurrentQuestionSet,
    hasSolvedPracticeQuestion,
    splitPracticeQuestionsBySolvedState,
    getPracticeQuestionId,
    getPracticeQuestionIdCandidates,
    isFirestoreQuotaExceededError,
    isFirestorePermissionDeniedError,
    getPracticeTargetForQuiz,
    buildPracticeProgressRecordId,
    getRankingTargetForQuiz,
    buildRankingRecordId,
    isBetterRankingEntry,
    buildUserRankingSummaryUpdate,
    buildQuizKingSummaryUpdate,
    getPracticeBadgeMeta,
    buildPracticeSummaryUpdate,
    buildPracticeBadgeUpdate,
    grantPracticeCorrectReward,
    syncMemberTitlesAfterPracticeCompletion,
    saveRankingRecordOnQuizComplete,
    savePracticeProgressAfterCorrectAnswer,
    startRankingSessionTimerIfNeeded,
    handleRankingSessionTimeout,
    startRankingQuestionTimerIfNeeded,
    handleRankingTimeout,
    submitAnswer,
    showQuizResult,
    createQuizPlaySessionState,
    getQuizPlayHeaderTitle,
    getQuizProgressText,
    getRankingTimeLimitSecondsForQuiz,
    getRankingElapsedSeconds,
    getRankingTimedProgressText,
    getQuizResultViewModel,
    getQuizCompleteViewModel,
    createQuizResultCard,
    createQuizCompleteCard,
    getPracticeSaveStatusText,
    getRankingSaveStatusText,
    createQuizAnswerInput,
    createQuizImageAnswerField,
    createQuizChoiceButton,
    createQuizHintToggle,
    createQuizQuestionCard
  };
})();
