/* Incremental plaza loading. Cached cards stay visible during background refresh. */
(function () {
  'use strict';
  const TTL = 60000;
  const cardIds = { korean: 'korean_king', social: 'social_king', math: 'math_king', science: 'science_king', flags: 'flags_king', pokemon: 'pokemon_king', tiniping: 'tiniping_king' };
  let deps, scope = '', generation = 0, model = null;
  const entries = new Map(), cards = new Map();

  function reset() {
    generation++; entries.clear(); cards.clear(); model = null;
    window.DJ48RankingRepository.clearRankingReadCache();
  }

  function drawCards() {
    const open = document.querySelector('.ranking-hall-details')?.open;
    const templates = deps.fallbackCards.filter(card => Object.values(cardIds).includes(card.rankId));
    templates.push({ rankId: 'flags_king', category: '국기왕', icon: '🏳️' });
    deps.renderCards(templates.map(card => cards.get(card.rankId) || { ...card, nickname: '—', title: '기록을 불러오는 중이에요', rank: '' }));
    if(open) document.querySelector('.ranking-hall-details')?.setAttribute('open', '');
  }

  function update(id) {
    if(!model) return;
    const entry = entries.get(id);
    model.boards = model.boards.map(board => board.id === id ? {
      ...(entry?.board || board), lazy: true,
      loading: Boolean(entry?.pending), loadError: entry?.error || '', loaded: Boolean(entry?.board)
    } : board);
    deps.setModel(model);
    const panel = document.querySelector(`[data-ranking-board-panel="${id}"]`);
    if(!panel) return;
    const board = model.boards.find(item => item.id === id);
    panel._rankingBoard = board;
    if(panel.hidden) { panel.dataset.lazyRankingBoard = id; return; }
    const selected = panel.querySelector('[data-ranking-sub-panel]:not([hidden])')?.dataset.rankingSubPanel;
    deps.renderPanel(panel, board);
    if(selected) panel.querySelector(`[data-ranking-sub-group-id="${selected}"]`)?.click();
  }

  function select(id, force = false) {
    if(!model?.boards.some(board => board.id === id)) return Promise.resolve();
    let entry = entries.get(id);
    if(entry?.pending) return entry.pending;
    if(entry?.board && !force && Date.now() - entry.at < TTL) return Promise.resolve();
    if(force) window.DJ48RankingRepository.clearRankingReadCache();
    if(!entry) { entry = {}; entries.set(id, entry); }
    entry.error = '';
    const stamp = generation;
    entry.pending = Promise.resolve().then(() => deps.loadBoard(id)).then(result => {
      if(stamp !== generation) return;
      entry.board = result.boards.find(board => board.id === id);
      entry.at = Date.now();
      const card = result.cards.find(item => item.rankId === cardIds[id]);
      if(card) { cards.set(card.rankId, card); drawCards(); }
    }).catch(error => {
      if(stamp !== generation) return;
      entry.error = '기록을 불러오지 못했어요. 새로고침해 주세요.';
      console.warn('Ranking field read failed.', id, error);
    }).finally(() => {
      if(stamp !== generation) return;
      entry.pending = null; update(id);
    });
    update(id);
    return entry.pending;
  }

  function show(nextDeps) {
    deps = nextDeps;
    const nextScope = deps.scope();
    if(nextScope !== scope) { reset(); scope = nextScope; }
    model = { boards: deps.emptyBoards().map(board => ({
      ...(entries.get(board.id)?.board || board), lazy: true,
      loaded: Boolean(entries.get(board.id)?.board), loading: Boolean(entries.get(board.id)?.pending),
      loadError: entries.get(board.id)?.error || ''
    })) };
    drawCards(); deps.renderBoards(model);
    const requested = deps.activeBoard();
    const active = model.boards.some(board => board.id === requested && !board.hallOnly) ? requested : model.boards.find(board => !board.hallOnly)?.id;
    const request = select(active);
    // Every subject king is visible; each has its own cached read and error state.
    Object.keys(cardIds).forEach(id => { if(id !== active) select(id); });
    return request;
  }

  document.addEventListener('click', event => {
    const refresh = event.target.closest('[data-ranking-refresh]');
    if(refresh) select(refresh.dataset.rankingRefresh, true);
  });
  document.addEventListener('toggle', event => {
    if(event.target.matches?.('.ranking-hall-details') && event.target.open) {
      Object.keys(cardIds).forEach(id => select(id));
    }
  }, true);
  window.addEventListener('dj48-ranking-invalidated', reset);
  const watchAuth = () => window.firebase?.auth?.().onAuthStateChanged(reset);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchAuth);
  else watchAuth();
  window.DJ48RankingPlaza = { show, select, reset };
})();
