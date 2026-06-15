(function () {
  let plazaModel = null;
  let activeBoardId = 'quizKing';
  let activePopularArea = 'all';
  let activePopularDifficulty = 'all';
  let activePopularMode = 'all';

  function getPlazaModel() { return plazaModel; }
  function setPlazaModel(model) {
    plazaModel = model || plazaModel;
    return plazaModel;
  }
  function resetPlazaModel() { plazaModel = null; }

  function getActiveBoardId() { return activeBoardId; }
  function setActiveBoardId(boardId) {
    activeBoardId = boardId || 'quizKing';
    return activeBoardId;
  }

  function getActivePopularArea() { return activePopularArea; }
  function setActivePopularArea(areaId) {
    activePopularArea = areaId || 'all';
    return activePopularArea;
  }

  function getActivePopularDifficulty() { return activePopularDifficulty; }
  function setActivePopularDifficulty(difficultyId) {
    activePopularDifficulty = difficultyId || 'all';
    return activePopularDifficulty;
  }

  function getActivePopularMode() { return activePopularMode; }
  function setActivePopularMode(modeId) {
    activePopularMode = modeId || 'all';
    return activePopularMode;
  }

  function selectPopularArea(areaId) {
    activeBoardId = 'popular';
    activePopularArea = areaId || 'all';
    activePopularDifficulty = 'all';
    activePopularMode = 'all';
  }

  function selectPopularDifficulty(difficultyId) {
    activeBoardId = 'popular';
    activePopularDifficulty = difficultyId || 'all';
  }

  function selectPopularMode(modeId) {
    activeBoardId = 'popular';
    activePopularMode = modeId || 'all';
  }

  window.DJ48RankingState = {
    getPlazaModel,
    setPlazaModel,
    resetPlazaModel,
    getActiveBoardId,
    setActiveBoardId,
    getActivePopularArea,
    setActivePopularArea,
    getActivePopularDifficulty,
    setActivePopularDifficulty,
    getActivePopularMode,
    setActivePopularMode,
    selectPopularArea,
    selectPopularDifficulty,
    selectPopularMode
  };
})();
