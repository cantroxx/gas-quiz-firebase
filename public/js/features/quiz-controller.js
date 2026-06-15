(function () {
  function bindQuizPlayEvents(deps = {}) {
    document.getElementById('quiz-play-root')?.addEventListener('click', event => {
      if(event.target.dataset.choiceIndex !== undefined) {
        deps.selectChoiceByIndex?.(Number(event.target.dataset.choiceIndex), false);
      }

      if(event.target.classList.contains('quiz-submit-button') && !event.target.dataset.nextQuestion) {
        deps.submitAnswer?.();
      }

      if(event.target.dataset.nextQuestion) {
        if(event.target.dataset.completeQuiz) deps.showQuizComplete?.();
        else deps.nextQuestion?.();
      }

      if(event.target.dataset.backToQuizSelect) {
        deps.showQuizSelectView?.(deps.getLastQuizId?.());
      }
    });

    document.getElementById('quiz-play-root')?.addEventListener('keydown', deps.handleQuizPlayKeydown);
    document.addEventListener('keydown', deps.handleQuizPlayKeydown);

    document.addEventListener('visibilitychange', () => {
      if(document.visibilityState === 'hidden') deps.flushPopularUsageSession?.(true);
    });

    window.addEventListener('beforeunload', () => {
      deps.flushPopularUsageSession?.(true);
    });
  }

  window.DJ48QuizController = {
    bindQuizPlayEvents
  };
})();
