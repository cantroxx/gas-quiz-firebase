(function () {
  function bindCommonAppEvents(deps = {}) {
    document.querySelectorAll('[data-place]').forEach(button => {
      button.addEventListener('click', () => deps.openPlaceModal?.(button.dataset.place));
    });

    document.getElementById('global-refresh-button')?.addEventListener('click', () => {
      deps.refreshCurrentAppData?.().catch(error => {
        console.warn('Global refresh failed.', error);
        deps.setGlobalRefreshNeedsAttention?.(true, '최신 정보를 다시 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      });
    });

    document.querySelectorAll('[data-close-modal]').forEach(button => {
      button.addEventListener('click', deps.closePlaceModal);
    });

    document.getElementById('modal-actions')?.addEventListener('click', event => {
      if(event.target.dataset.panelAction === 'openSchool') deps.showSchoolView?.();
      if(event.target.dataset.panelAction === 'openHome') deps.showHomeView?.();
      if(event.target.dataset.panelAction === 'openRanking') deps.showRankingView?.();
      if(event.target.dataset.panelAction === 'openShop') deps.showShopView?.();
      if(event.target.dataset.panelAction === 'openEvent') deps.showEventView?.();
      if(event.target.dataset.panelAction === 'openClassroom') deps.showClassroomView?.(false);
      if(event.target.dataset.panelAction === 'openRecommendedQuiz' && event.target.dataset.quizId) {
        deps.closePlaceModal?.();
        deps.showQuizSelectView?.(event.target.dataset.quizId);
      }
    });

    document.querySelectorAll('[data-back-to-town]').forEach(button => {
      button.addEventListener('click', deps.showTownView);
    });

    document.getElementById('ranking-board-root')?.addEventListener('click', event => {
      deps.handleRankingBoardRootClick?.(event);
    });

    document.addEventListener('keydown', event => {
      if(event.key === 'Escape') deps.closePlaceModal?.();
    });

  }

  window.DJ48AppEvents = {
    bindCommonAppEvents
  };
})();
