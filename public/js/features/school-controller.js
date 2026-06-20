(function () {
  function bindSchoolQuizSelectEvents(deps = {}) {
    document.getElementById('school-quiz-grid')?.addEventListener('click', async event => {
      const externalCard = event.target.closest('[data-external-quiz-hub]');
      if(externalCard) {
        deps.showExternalQuizLinks?.().catch(error => {
          console.warn('External quiz links load failed.', error);
          const section = document.getElementById('external-quiz-section');
          const status = document.getElementById('external-quiz-status');
          if(section) section.hidden = false;
          if(status) status.textContent = '외부 퀴즈를 불러오지 못했습니다.';
        });
        return;
      }
      const card = event.target.closest('[data-subject-id]');
      if(card) {
        if(card.dataset.subjectId === 'popular' && !(await deps.ensurePopularSubjectAccess?.())) return;
        deps.showSubjectView?.(card.dataset.subjectId);
      }
    });

    document.querySelector('[data-back-to-school]')?.addEventListener('click', deps.showSchoolView);

    document.getElementById('subject-quiz-grid')?.addEventListener('click', event => {
      const card = event.target.closest('[data-quiz-id]');
      if(card) deps.showQuizSelectView?.(card.dataset.quizId);
    });

    document.querySelector('[data-back-to-subject]')?.addEventListener('click', () => {
      deps.showSubjectView?.(deps.getCurrentSubjectId?.());
    });

    document.getElementById('quiz-mode-grid')?.addEventListener('click', event => {
      const quizCard = event.target.closest('[data-quiz-id]:not([data-mode-id])');
      if(quizCard) {
        deps.showQuizSelectView?.(quizCard.dataset.quizId);
        return;
      }
      const card = event.target.closest('[data-mode-id]');
      const modeId = card?.dataset.modeId;
      const quizId = card?.dataset.quizId || deps.getLastQuizId?.();
      const rankingMode = card?.dataset.rankingMode || 'normal';
      if(modeId === 'practice' || modeId === 'ranking') {
        deps.showQuizPlayView?.(quizId, modeId, rankingMode).catch(error => {
          console.warn('Quiz play view open failed.', error);
          window.alert('퀴즈를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
        });
      }
    });

    document.querySelector('[data-back-to-quiz-select]')?.addEventListener('click', () => {
      deps.showQuizSelectView?.(deps.getLastQuizId?.());
    });

    document.addEventListener('keydown', event => {
      if(event.key !== 'Enter' && event.key !== ' ') return;
      if(event.target.tagName === 'BUTTON') return;
      const card = event.target.closest('[role="button"][data-subject-id], [role="button"][data-external-quiz-hub], [role="button"][data-quiz-id], [role="button"][data-mode-id]');
      if(!card) return;
      event.preventDefault();
      card.click();
    });
  }

  window.DJ48SchoolController = {
    bindSchoolQuizSelectEvents
  };
})();
