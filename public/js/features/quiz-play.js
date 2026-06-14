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
    resolveCurrentQuestionSet,
    hasSolvedPracticeQuestion,
    splitPracticeQuestionsBySolvedState,
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
