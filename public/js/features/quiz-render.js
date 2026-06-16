(function () {
  let activePokemonHubDifficulty = '';

  function renderSchoolQuizCards(deps = {}) {
    const grid = document.getElementById('school-quiz-grid');
    if(!grid) return;
    grid.innerHTML = '';
    (deps.schoolQuizCards || []).forEach(card => {
      const subject = card.subjectId ? deps.subjectCatalog?.[card.subjectId] : null;
      const viewModel = subject ? {
        icon: subject.icon,
        title: subject.title,
        desc: subject.cardDesc,
        enabled: subject.enabled,
        subjectId: card.subjectId
      } : {
        ...card
      };
      const item = document.createElement('article');
      const icon = document.createElement('span');
      const title = document.createElement('h3');
      const desc = document.createElement('p');
      const button = document.createElement('button');
      const usageNotice = document.createElement('p');

      item.className = 'school-quiz-card';
      if(viewModel.subjectId) item.classList.add(`school-quiz-card-${viewModel.subjectId}`);
      if(viewModel.externalQuizHub) item.classList.add('school-quiz-card-external');
      if(viewModel.enabled && (viewModel.subjectId || viewModel.externalQuizHub)) {
        if(viewModel.subjectId) item.dataset.subjectId = viewModel.subjectId;
        if(viewModel.externalQuizHub) item.dataset.externalQuizHub = 'true';
        item.tabIndex = 0;
        item.setAttribute('role', 'button');
      }
      icon.className = 'school-quiz-icon';
      icon.textContent = viewModel.icon;
      title.textContent = viewModel.title;
      desc.textContent = viewModel.desc;
      button.className = viewModel.enabled ? 'school-ready-button' : 'school-disabled-button';
      button.type = 'button';
      button.disabled = !viewModel.enabled;
      button.textContent = viewModel.enabled ? '입장하기' : '준비 중';
      if(viewModel.subjectId) button.dataset.subjectId = viewModel.subjectId;
      if(viewModel.externalQuizHub) button.dataset.externalQuizHub = 'true';

      item.append(icon, title, desc);
      if(viewModel.subjectId === 'popular') {
        usageNotice.className = 'popular-usage-notice';
        usageNotice.dataset.popularUsageNotice = 'true';
        usageNotice.textContent = '인기퀴즈 이용 시간을 확인하는 중입니다...';
        item.appendChild(usageNotice);
      }
      item.appendChild(button);
      grid.appendChild(item);
    });
    deps.refreshPopularUsageNotices?.();
  }

  function renderExternalQuizLinks(externalQuizzes, deps = {}) {
    const section = document.getElementById('external-quiz-section');
    const grid = document.getElementById('external-quiz-grid');
    const status = document.getElementById('external-quiz-status');
    if(!section || !grid || !status) return;
    const normalizeExternalQuizzes = deps.normalizeExternalQuizzes || (data => data || {});
    const items = (normalizeExternalQuizzes(externalQuizzes).items || []).filter(item => item.active !== false);
    section.hidden = false;
    grid.innerHTML = '';
    status.textContent = '';
    if(!items.length) {
      status.textContent = '아직 등록된 외부 퀴즈가 없습니다.';
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    items.forEach(item => {
      const card = document.createElement('article');
      const icon = document.createElement('span');
      const title = document.createElement('h3');
      const desc = document.createElement('p');
      const link = document.createElement('a');
      card.className = 'external-quiz-card';
      icon.className = 'school-quiz-icon';
      icon.textContent = '🔗';
      title.textContent = item.title;
      desc.textContent = item.description || '새 탭에서 외부 퀴즈를 엽니다.';
      link.className = 'school-ready-button';
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = '새 탭에서 열기';
      card.append(icon, title, desc, link);
      grid.appendChild(card);
    });
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderSubjectQuizCards(subjectId, deps = {}) {
    const subjectCatalog = deps.subjectCatalog || {};
    const quizCatalog = deps.quizCatalog || {};
    const subject = subjectCatalog[subjectId] || subjectCatalog.korean;
    const grid = document.getElementById('subject-quiz-grid');
    const subjectUsageNotice = document.getElementById('subject-popular-usage-notice');
    if(!subject || !grid) return;
    document.getElementById('subject-kicker').textContent = subject.kicker;
    document.getElementById('subject-title').textContent = subject.hallTitle;
    document.getElementById('subject-desc').textContent = subject.desc;
    document.getElementById('subject-board').textContent = subject.board;
    if(subjectUsageNotice) {
      subjectUsageNotice.hidden = subjectId !== 'popular';
      subjectUsageNotice.textContent = subjectId === 'popular' ? '확인 중' : '';
      delete subjectUsageNotice.dataset.state;
      delete subjectUsageNotice.dataset.urgency;
    }
    grid.setAttribute('aria-label', `${subject.hallTitle} 퀴즈 카드`);
    grid.innerHTML = '';
    subject.quizzes.forEach(quizId => {
      const quiz = quizCatalog[quizId];
      if(!quiz || !deps.isQuizEnabledByFlags?.(quizId)) return;
      const isPlayable = quiz.enabled !== false && deps.firebasePlayableQuizIds?.has(deps.normalizeFirebaseQuizId?.(quizId));
      const item = document.createElement('article');
      const icon = document.createElement('span');
      const title = document.createElement('h3');
      const desc = document.createElement('p');
      const button = document.createElement('button');
      const badge = document.createElement('span');

      item.className = 'subject-quiz-card';
      if(isPlayable) {
        item.dataset.quizId = quizId;
        item.tabIndex = 0;
        item.setAttribute('role', 'button');
      }
      icon.className = 'subject-quiz-icon';
      icon.textContent = quiz.icon;
      title.textContent = quiz.title.replace(' 퀴즈', '');
      desc.textContent = quiz.desc;
      button.className = isPlayable ? 'subject-ready-button' : 'subject-disabled-button';
      button.type = 'button';
      button.disabled = !isPlayable;
      button.textContent = isPlayable ? '입장하기' : '준비 중';
      if(isPlayable) button.dataset.quizId = quizId;

      item.append(icon, title, desc);
      if(quiz.groupLabel && quizId !== 'pokemon') {
        badge.className = 'subject-quiz-badge';
        badge.textContent = quiz.groupLabel;
        item.appendChild(badge);
      }
      item.appendChild(button);
      grid.appendChild(item);
    });
    if(subjectId === 'popular') deps.refreshPopularUsageNotices?.();
  }

  function renderQuizSelectView(quizId, deps = {}) {
    const quizCatalog = deps.quizCatalog || {};
    const subjectCatalog = deps.subjectCatalog || {};
    const quiz = quizCatalog[quizId] || quizCatalog.spelling;
    if(!quiz) return;
    if(!deps.isQuizEnabledByFlags?.(quizId)) {
      deps.alert?.('이 퀴즈는 지금 점검 중입니다.');
      deps.showTownView?.();
      return;
    }
    const subject = subjectCatalog[quiz.subjectId] || subjectCatalog.korean;
    document.getElementById('quiz-select-kicker').textContent = quiz.kicker;
    document.getElementById('quiz-select-title').textContent = quiz.title;
    document.getElementById('quiz-select-desc').textContent = quiz.desc;
    document.getElementById('quiz-select-summary').textContent = quiz.summary;
    document.getElementById('back-to-subject-label').textContent = `${subject.hallTitle}으로 돌아가기`;
    deps.renderQuizModeCards?.(quiz.modes);
  }

  function renderQuizModeCards(modeIds, deps = {}) {
    const grid = document.getElementById('quiz-mode-grid');
    if(!grid) return;
    grid.innerHTML = '';
    const lastQuizId = deps.getLastQuizId?.() || 'spelling';
    if(deps.normalizeFirebaseQuizId?.(lastQuizId) === 'pokemon') {
      renderPokemonHubCards(grid, deps);
      return;
    }
    const flags = deps.featureFlags || deps.defaultFeatureFlags || {};
    if(!deps.isQuizEnabledByFlags?.(lastQuizId, flags)) {
      const disabled = document.createElement('p');
      disabled.className = 'profile-ranking-empty';
      disabled.textContent = '이 퀴즈는 지금 점검 중입니다.';
      grid.appendChild(disabled);
      return;
    }
    (modeIds || []).forEach(modeId => {
      if(modeId === 'records') return;
      if(modeId === 'oneChance') return;
      const baseMode = deps.modeCatalog?.[modeId] || deps.modeCatalog?.practice;
      if(!baseMode) return;
      const playable = deps.firebasePlayableQuizIds?.has(deps.normalizeFirebaseQuizId?.(lastQuizId));
      const featureEnabled = modeId !== 'ranking' || flags.rankingEnabled !== false;
      const mode = {
        ...baseMode,
        enabled: baseMode.enabled && playable && featureEnabled,
        desc: featureEnabled ? baseMode.desc : '랭킹전은 지금 점검 중입니다.'
      };
      const item = document.createElement('article');
      const icon = document.createElement('span');
      const title = document.createElement('h3');
      const desc = document.createElement('p');
      const button = document.createElement('button');

      item.className = 'quiz-mode-card';
      if(mode.enabled) {
        item.dataset.modeId = modeId;
        item.tabIndex = 0;
        item.setAttribute('role', 'button');
      }
      icon.className = 'quiz-mode-icon';
      icon.textContent = mode.icon;
      title.textContent = mode.title;
      desc.textContent = mode.desc;
      button.className = mode.enabled ? 'quiz-mode-ready-button' : 'quiz-mode-disabled-button';
      button.type = 'button';
      button.disabled = !mode.enabled;
      button.textContent = mode.enabled ? '시작하기' : '준비 중';
      button.dataset.modeId = modeId;

      item.append(icon, title, desc);
      if(modeId === 'ranking' && mode.enabled) {
        const rankingModes = document.createElement('div');
        rankingModes.className = 'quiz-ranking-mode-grid';
        (deps.getRankingModeOptionsForQuiz?.(lastQuizId) || []).forEach(option => {
          const modeButton = document.createElement('button');
          modeButton.type = 'button';
          modeButton.className = `quiz-ranking-mode-button ranking-mode-${option.value}`;
          modeButton.textContent = option.label;
          modeButton.dataset.modeId = 'ranking';
          modeButton.dataset.rankingMode = option.value;
          rankingModes.appendChild(modeButton);
        });
        item.appendChild(rankingModes);
      } else {
        item.appendChild(button);
      }
      grid.appendChild(item);
    });
  }

  function renderQuizPlayHeader(deps = {}) {
    const quiz = deps.getCurrentQuizMetaForHeader?.() || {};
    const mode = deps.getCurrentModeMetaForHeader?.() || {};
    const isRanking = deps.getCurrentModeId?.() === 'ranking';
    const rankingModeLabel = isRanking ? deps.getRankingModeLabelForDisplay?.({ rankingMode: deps.getCurrentRankingModeId?.() }) : '';
    const target = document.getElementById('quiz-play-title');
    if(!target) return;
    target.textContent = window.DJ48QuizPlay.getQuizPlayHeaderTitle({
      quizTitle: quiz.title,
      modeTitle: mode.title,
      rankingModeLabel,
      isRanking
    });
  }

  function renderQuestion(deps = {}, callbacks = {}) {
    const questionSet = deps.getCurrentQuestionSet?.() || [];
    const question = questionSet[deps.getCurrentQuestionIndex?.()];
    const root = document.getElementById('quiz-play-root');
    if(!root || !question) return;
    deps.resetSelectedChoiceIndex?.();
    deps.setCurrentQuestionResolved?.(false);
    root.innerHTML = '';

    const hintText = callbacks.getQuestionHintText?.(question) || '';
    const shouldRenderHint = !!hintText && !(deps.getCurrentModeId?.() === 'ranking' && deps.getCurrentRankingModeId?.() === 'nohint');
    const card = window.DJ48QuizPlay.createQuizQuestionCard({
      question,
      progressText: callbacks.getQuizProgressText?.() || '',
      hintText,
      shouldRenderHint
    });
    root.appendChild(card);
    callbacks.startRankingQuestionTimerIfNeeded?.();
  }

  function renderPracticeSaveStatus(result) {
    const status = document.getElementById('practice-save-status');
    if(!status) return;
    status.textContent = window.DJ48QuizPlay.getPracticeSaveStatusText(result);
  }

  function renderRankingSaveStatus(result, deps = {}) {
    const status = document.getElementById('ranking-save-status');
    if(!status) return;
    status.textContent = window.DJ48QuizPlay.getRankingSaveStatusText(result, {
      invalidRankingTimeMessage: deps.getInvalidRankingTimeMessage?.() || ''
    });
  }

  function appendPokemonPracticeButton(grid, generation, deps = {}) {
    const quizId = `pokemon-gen${generation}`;
    if(!deps.isQuizEnabledByFlags?.(quizId)) return;
    const button = document.createElement('button');
    button.className = 'pokemon-hub-practice-button';
    button.type = 'button';
    button.textContent = `${generation}세대`;
    button.dataset.quizId = quizId;
    button.dataset.modeId = 'practice';
    grid.appendChild(button);
  }

  function getPokemonHubRankingDifficulties() {
    return [
      { quizId: 'pokemon-easy', label: '쉬움', value: 'easy', range: '1세대', className: 'pokemon-difficulty-easy' },
      { quizId: 'pokemon-normal', label: '보통', value: 'normal', range: '1~2세대', className: 'pokemon-difficulty-normal' },
      { quizId: 'pokemon-hard', label: '어려움', value: 'hard', range: '1~3세대', className: 'pokemon-difficulty-hard' },
      { quizId: 'pokemon-very-hard', label: '헬', value: 'very-hard', range: '전체 세대', className: 'pokemon-difficulty-extreme' }
    ];
  }

  function getPokemonHubRankingModes() {
    return [
      { label: '일반', value: 'normal' },
      { label: '스피드', value: 'speed' },
      { label: '원코', value: 'onechance' },
      { label: '노힌트', value: 'nohint' }
    ];
  }

  function normalizePokemonHubRankingMode(rankingMode, deps = {}) {
    const mode = deps.normalizeFirebaseRankingMode?.(rankingMode) || 'normal';
    return getPokemonHubRankingModes().some(item => item.value === mode) ? mode : 'normal';
  }

  function selectPokemonHubDifficulty(difficultyValue, deps = {}) {
    activePokemonHubDifficulty = activePokemonHubDifficulty === difficultyValue ? '' : difficultyValue;
    const grid = document.getElementById('quiz-mode-grid');
    if(grid) renderPokemonHubCards(grid, deps);
  }

  function appendPokemonRankingDifficultyPanel(grid, difficulty, rankingDisabled, deps = {}) {
    if(!deps.isQuizEnabledByFlags?.(difficulty.quizId)) return;
    const panel = document.createElement('article');
    const button = document.createElement('button');
    const detail = document.createElement('div');
    const range = document.createElement('p');
    const modeGrid = document.createElement('div');
    const isOpen = activePokemonHubDifficulty === difficulty.value;
    panel.className = `pokemon-hub-difficulty ${difficulty.className || ''} ${isOpen ? 'is-open' : ''}`;
    button.className = 'pokemon-hub-difficulty-button';
    button.type = 'button';
    button.textContent = difficulty.label;
    button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    button.addEventListener('click', () => selectPokemonHubDifficulty(difficulty.value, deps));
    panel.appendChild(button);
    if(isOpen) {
      detail.className = 'pokemon-hub-ranking-detail';
      range.className = 'pokemon-hub-ranking-range';
      range.textContent = `포함 범위: ${difficulty.range}`;
      modeGrid.className = 'pokemon-hub-ranking-mode-grid';
      if(rankingDisabled) {
        const disabled = document.createElement('p');
        disabled.className = 'profile-ranking-empty';
        disabled.textContent = '랭킹전은 지금 점검 중입니다.';
        detail.append(range, disabled);
      } else {
        getPokemonHubRankingModes().forEach(mode => {
          const modeButton = document.createElement('button');
          modeButton.className = `pokemon-hub-ranking-mode ranking-mode-${mode.value}`;
          modeButton.type = 'button';
          modeButton.textContent = mode.label;
          modeButton.dataset.quizId = difficulty.quizId;
          modeButton.dataset.modeId = 'ranking';
          modeButton.dataset.rankingMode = normalizePokemonHubRankingMode(mode.value, deps);
          modeGrid.appendChild(modeButton);
        });
        detail.append(range, modeGrid);
      }
      panel.appendChild(detail);
    }
    grid.appendChild(panel);
  }

  function renderPokemonHubCards(grid, deps = {}) {
    const flags = deps.featureFlags || deps.defaultFeatureFlags || {};
    const practiceTitle = document.createElement('p');
    const rankingTitle = document.createElement('p');
    const rankingDisabled = flags.rankingEnabled === false;
    grid.innerHTML = '';
    practiceTitle.className = 'profile-ranking-subtitle';
    practiceTitle.textContent = '연습전: 세대별 도감 채우기';
    rankingTitle.className = 'profile-ranking-subtitle';
    rankingTitle.textContent = '랭킹전: 난이도를 고른 뒤 모드를 선택';
    grid.appendChild(practiceTitle);
    const practiceGrid = document.createElement('div');
    practiceGrid.className = 'pokemon-hub-practice-grid';
    for(let gen = 1; gen <= 9; gen += 1) {
      appendPokemonPracticeButton(practiceGrid, gen, deps);
    }
    grid.appendChild(practiceGrid);
    grid.appendChild(rankingTitle);
    getPokemonHubRankingDifficulties().forEach(difficulty => appendPokemonRankingDifficultyPanel(grid, difficulty, rankingDisabled, deps));
  }

  window.DJ48QuizRender = {
    renderExternalQuizLinks,
    renderPracticeSaveStatus,
    renderQuestion,
    renderQuizModeCards,
    renderQuizPlayHeader,
    renderQuizSelectView,
    renderRankingSaveStatus,
    renderSchoolQuizCards,
    renderSubjectQuizCards
  };
})();
