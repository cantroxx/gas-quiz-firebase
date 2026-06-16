(function () {
  function normalizeRankingDisplayName(data) {
    return String(data?.displayNickname || data?.displayName || data?.nickname || data?.name || data?.memberUserId || '익명').trim();
  }

  function renderRankingCards(entries) {
    const grid = document.getElementById('ranking-card-grid');
    grid.innerHTML = '';
    entries.forEach(entry => {
      const card = document.createElement('article');
      const icon = document.createElement('span');
      const rank = document.createElement('p');
      const category = document.createElement('h3');
      const nickname = document.createElement('strong');
      const title = document.createElement('p');

      card.className = 'ranking-card';
      icon.className = 'ranking-card-icon';
      icon.textContent = entry.icon;
      rank.className = 'ranking-rank';
      rank.textContent = entry.rank;
      category.textContent = entry.category;
      nickname.className = 'ranking-nickname';
      nickname.textContent = entry.nickname;
      title.className = 'ranking-title';
      title.textContent = entry.title;

      card.append(icon, rank, category, nickname, title);
      grid.appendChild(card);
    });
  }

  function appendRankingDisplayName(root, row, deps = {}) {
    const normalizeDisplayName = deps.normalizeRankingDisplayName || normalizeRankingDisplayName;
    const nameText = document.createElement('span');
    nameText.className = 'ranking-display-name';
    nameText.textContent = normalizeDisplayName(row);
    root.appendChild(nameText);
  }

  function createRankingTitleChip(row, deps = {}) {
    const getKnownTitleName = deps.getKnownTitleName || (() => '');
    const titleText = String(row?.selectedTitle || row?.selectedTitleName || getKnownTitleName(row?.selectedTitleId)).trim();
    if(!titleText) return null;
    const chip = document.createElement('span');
    chip.className = 'ranking-title-chip';
    chip.textContent = titleText;
    return chip;
  }

  function renderRankingAvatar(root, row, fallbackText, deps = {}) {
    const normalizeDisplayImageUrl = deps.normalizeDisplayImageUrl || (value => String(value || '').trim());
    const normalizeDisplayName = deps.normalizeRankingDisplayName || normalizeRankingDisplayName;
    const applyProfileImageTransform = deps.applyProfileImageTransform || (() => {});
    root.innerHTML = '';
    const imageUrl = normalizeDisplayImageUrl(row?.profileImageUrl || row?.imageUrl || row?.avatarUrl || row?.profileImageId);
    if(imageUrl) {
      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = `${normalizeDisplayName(row)} 프로필`;
      image.loading = 'lazy';
      image.referrerPolicy = 'no-referrer';
      applyProfileImageTransform(image, row);
      image.addEventListener('error', () => {
        root.innerHTML = '';
        root.textContent = fallbackText;
      }, { once: true });
      root.appendChild(image);
      return;
    }
    root.textContent = fallbackText;
  }

  function createRankingMetaLine(row, board) {
    const line = document.createElement('p');
    line.className = 'ranking-card-line';
    let hasContent = false;
    if(board.metaElement) {
      const metaElement = board.metaElement(row);
      if(metaElement?.textContent?.trim()) {
        line.appendChild(metaElement);
        hasContent = true;
      }
    } else if(typeof board.meta === 'function') {
      const metaText = String(board.meta(row) || '').trim();
      if(metaText) {
        const meta = document.createElement('span');
        meta.className = 'ranking-card-condition';
        meta.textContent = metaText;
        line.appendChild(meta);
        hasContent = true;
      }
    }
    if(row.rankingMessage) {
      if(hasContent) {
        const divider = document.createElement('span');
        divider.className = 'ranking-card-line-divider';
        divider.textContent = '·';
        line.appendChild(divider);
      }
      const message = document.createElement('span');
      message.className = 'ranking-card-message-inline';
      message.textContent = `💬 ${String(row.rankingMessage).slice(0, 24)}`;
      line.appendChild(message);
      hasContent = true;
    }
    return hasContent ? line : null;
  }

  function renderRankingRows(panel, rows, board, deps = {}) {
    if(!rows.length) {
      const empty = document.createElement('p');
      empty.className = 'ranking-board-empty';
      empty.textContent = '아직 표시할 기록이 없습니다.';
      panel.appendChild(empty);
      return;
    }

    const podiumRows = rows.slice(0, 3);
    const restRows = rows.slice(3);
    const podium = document.createElement('div');
    podium.className = 'ranking-podium';
    podiumRows.forEach((row, index) => {
      podium.appendChild(createRankingPodiumCard(row, index, board, deps));
    });
    panel.appendChild(podium);

    if(!restRows.length) return;

    const list = document.createElement('div');
    list.className = 'ranking-board-list';
    restRows.forEach((row, index) => {
      const item = document.createElement('article');
      const rank = document.createElement('strong');
      const body = document.createElement('div');
      const name = document.createElement('p');
      const score = document.createElement('p');

      item.className = 'ranking-board-row';
      rank.className = 'ranking-board-rank';
      body.className = 'ranking-board-body';
      name.className = 'ranking-board-name';
      score.className = 'ranking-board-score';
      rank.textContent = `${index + 4}`;
      const titleChip = createRankingTitleChip(row, deps);
      if(titleChip) name.appendChild(titleChip);
      appendRankingDisplayName(name, row, deps);
      const meta = createRankingMetaLine(row, board);
      score.textContent = board.score(row);

      body.appendChild(name);
      if(meta) body.appendChild(meta);
      item.append(rank, body, score);
      list.appendChild(item);
    });
    panel.appendChild(list);
  }

  function createRankingPodiumCard(row, index, board, deps = {}) {
    const rank = index + 1;
    const medals = ['🥇', '🥈', '🥉'];
    const classes = ['gold', 'silver', 'bronze'];
    const card = document.createElement('article');
    const badge = document.createElement('span');
    const avatar = document.createElement('div');
    const name = document.createElement('h4');
    const score = document.createElement('p');

    card.className = `ranking-podium-card ranking-medal-${classes[index]} rank-${rank}`;
    badge.className = 'ranking-medal-badge';
    avatar.className = 'ranking-avatar';
    name.className = 'ranking-card-name';
    score.className = 'ranking-card-score';
    badge.textContent = `${medals[index]} ${rank}위`;
    renderRankingAvatar(avatar, row, `${rank}`, deps);
    const titleChip = createRankingTitleChip(row, deps);
    if(titleChip) name.appendChild(titleChip);
    appendRankingDisplayName(name, row, deps);
    const meta = createRankingMetaLine(row, board);
    score.textContent = board.score(row);

    card.append(badge, avatar, name);
    if(meta) card.appendChild(meta);
    card.appendChild(score);
    return card;
  }

  function createPopularFilterButton(label, isActive, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `ranking-sub-tab${isActive ? ' is-active' : ''}`;
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  function renderRankingBoards(root, model, deps = {}) {
    if(!root) return;
    root.innerHTML = '';

    if(!model) {
      const loading = document.createElement('p');
      loading.className = 'ranking-board-empty';
      loading.textContent = '랭킹 목록을 불러오는 중입니다.';
      root.appendChild(loading);
      return;
    }

    const tabs = document.createElement('div');
    const panels = document.createElement('div');
    tabs.className = 'ranking-board-tabs';
    panels.className = 'ranking-board-panels';
    const activeRankingBoardId = deps.getActiveRankingBoardId?.() || '';
    const activeBoardId = model.boards.some(board => board.id === activeRankingBoardId)
      ? activeRankingBoardId
      : (model.boards[0]?.id || '');

    model.boards.forEach(board => {
      const button = document.createElement('button');
      const panel = document.createElement('section');
      const isActive = board.id === activeBoardId;
      button.type = 'button';
      button.className = `ranking-board-tab${isActive ? ' is-active' : ''}`;
      button.textContent = board.label;
      button.dataset.rankingBoardId = board.id;
      panel.className = 'ranking-board-panel';
      panel.dataset.rankingBoardPanel = board.id;
      panel.hidden = !isActive;
      renderRankingBoardPanel(panel, board, deps);
      tabs.appendChild(button);
      panels.appendChild(panel);
    });

    root.append(tabs, panels);
  }

  function renderRankingBoardPanel(panel, board, deps = {}) {
    panel.innerHTML = '';
    if(board.id === 'popular') {
      renderPopularRankingBoardPanel(panel, board, deps);
      return;
    }
    const groups = board.groups || [{ id: 'all', label: '전체', rows: board.rows }];
    const header = document.createElement('div');
    const title = document.createElement('h3');
    const desc = document.createElement('p');
    header.className = 'ranking-board-header';
    title.textContent = board.title || board.label;
    desc.textContent = board.desc || '랭킹전 기록을 기준으로 정렬합니다.';
    header.append(title, desc);
    panel.appendChild(header);

    if(groups.length > 1) {
      const groupTabs = document.createElement('div');
      groupTabs.className = 'ranking-sub-tabs';
      groups.forEach((group, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `ranking-sub-tab${index === 0 ? ' is-active' : ''}`;
        button.textContent = group.label;
        button.dataset.rankingSubGroupId = group.id;
        button.dataset.rankingParentBoardId = board.id;
        groupTabs.appendChild(button);
      });
      panel.appendChild(groupTabs);
    }

    groups.forEach((group, index) => {
      const groupPanel = document.createElement('div');
      groupPanel.className = 'ranking-sub-panel';
      groupPanel.dataset.rankingSubPanel = group.id;
      groupPanel.hidden = index !== 0;
      renderRankingGroupPanel(groupPanel, group, board, deps);
      panel.appendChild(groupPanel);
    });
  }

  function renderRankingGroupPanel(panel, group, board, deps = {}) {
    panel.innerHTML = '';
    if(board.id === 'quizKing') {
      renderRankingRows(panel, group.rows || [], board, deps);
      return;
    }
    const filters = document.createElement('div');
    const filterRow = document.createElement('div');
    const rowsWrap = document.createElement('div');
    filters.className = 'ranking-popular-detail-filters ranking-mode-filter-box';
    filterRow.className = 'ranking-popular-filter-row';
    rowsWrap.className = 'ranking-mode-filter-results';
    const getSupportedRankingModeIdsForKeys = deps.getSupportedRankingModeIdsForKeys || (() => ['all']);
    const getRankingModeFilterOptions = deps.getRankingModeFilterOptions || (() => []);
    const getRankingRowsForGroup = deps.getRankingRowsForGroup || (() => []);
    const supportedModes = new Set(getSupportedRankingModeIdsForKeys(group.keys || []));
    getRankingModeFilterOptions().filter(option => supportedModes.has(option.id)).forEach(option => {
      filterRow.appendChild(createPopularFilterButton(option.label, option.id === 'all', event => {
        filterRow.querySelectorAll('.ranking-sub-tab').forEach(tab => {
          tab.classList.toggle('is-active', tab === event.currentTarget);
        });
        rowsWrap.innerHTML = '';
        renderRankingRows(rowsWrap, getRankingRowsForGroup(group, option.id), board, deps);
      }));
    });
    filters.appendChild(filterRow);
    panel.append(filters, rowsWrap);
    renderRankingRows(rowsWrap, getRankingRowsForGroup(group), board, deps);
  }

  function renderPopularRankingBoardPanel(panel, board, deps = {}) {
    const records = board.sourceRows || [];
    const header = document.createElement('div');
    const title = document.createElement('h3');
    const desc = document.createElement('p');
    const areaTabs = document.createElement('div');
    const detailFilters = document.createElement('div');
    const rowsPanel = document.createElement('div');
    header.className = 'ranking-board-header';
    title.textContent = board.title || board.label;
    desc.textContent = board.desc || '인기 퀴즈 랭킹전 기록입니다.';
    header.append(title, desc);
    areaTabs.className = 'ranking-sub-tabs ranking-popular-area-tabs';
    detailFilters.className = 'ranking-popular-detail-filters';
    rowsPanel.className = 'ranking-sub-panel';

    const getPopularRankingAreas = deps.getPopularRankingAreas || (() => []);
    const getActivePopularArea = deps.getActivePopularArea || (() => 'all');
    const getActivePopularMode = deps.getActivePopularMode || (() => 'all');
    const getPopularPokemonDifficulties = deps.getPopularPokemonDifficulties || (() => []);
    const getActivePopularDifficulty = deps.getActivePopularDifficulty || (() => 'all');
    const getPopularModeOptions = deps.getPopularModeOptions || (() => []);
    const getPopularFilteredRows = deps.getPopularFilteredRows || (() => []);
    const areaId = getActivePopularArea();
    getPopularRankingAreas().forEach(area => {
      areaTabs.appendChild(createPopularFilterButton(area.label, area.id === areaId, () => {
        deps.onPopularAreaSelect?.(area.id);
      }));
    });

    if(areaId !== 'all') {
      const modeId = getActivePopularMode(records, areaId);
      if(areaId === 'pokemon') {
        const difficultyRow = document.createElement('div');
        difficultyRow.className = 'ranking-popular-filter-row';
        getPopularPokemonDifficulties().forEach(difficulty => {
          difficultyRow.appendChild(createPopularFilterButton(difficulty.label, difficulty.id === getActivePopularDifficulty(), () => {
            deps.onPopularDifficultySelect?.(difficulty.id);
          }));
        });
        detailFilters.appendChild(difficultyRow);
      }
      const modeRow = document.createElement('div');
      modeRow.className = 'ranking-popular-filter-row';
      getPopularModeOptions(records, areaId).forEach(mode => {
        modeRow.appendChild(createPopularFilterButton(mode.label, mode.id === modeId, () => {
          deps.onPopularModeSelect?.(mode.id);
        }));
      });
      detailFilters.appendChild(modeRow);
    }

    panel.append(header, areaTabs);
    if(detailFilters.children.length) panel.appendChild(detailFilters);
    renderRankingRows(rowsPanel, getPopularFilteredRows(records), board, deps);
    panel.appendChild(rowsPanel);
  }

  function handleRankingBoardRootClick(event, deps = {}) {
    const subButton = event.target.closest('[data-ranking-sub-group-id]');
    if(subButton) {
      const boardId = subButton.dataset.rankingParentBoardId;
      const groupId = subButton.dataset.rankingSubGroupId;
      const activePanel = document.querySelector(`[data-ranking-board-panel="${boardId}"]`);
      activePanel?.querySelectorAll('.ranking-sub-tab').forEach(tab => {
        tab.classList.toggle('is-active', tab === subButton);
      });
      activePanel?.querySelectorAll('[data-ranking-sub-panel]').forEach(panel => {
        panel.hidden = panel.dataset.rankingSubPanel !== groupId;
      });
      return;
    }

    const button = event.target.closest('[data-ranking-board-id]');
    if(!button) return;
    const boardId = button.dataset.rankingBoardId;
    deps.onRankingBoardSelect?.(boardId);
    document.querySelectorAll('.ranking-board-tab').forEach(tab => {
      tab.classList.toggle('is-active', tab === button);
    });
    document.querySelectorAll('[data-ranking-board-panel]').forEach(panel => {
      panel.hidden = panel.dataset.rankingBoardPanel !== boardId;
    });
  }

  function renderRankingBoardsWithState(model, deps = {}) {
    const nextModel = deps.setPlazaModel?.(model) || model;
    return renderRankingBoards(
      deps.getRankingBoardRoot?.(),
      nextModel,
      deps.getRankingRenderDeps?.() || {}
    );
  }

  function renderProfileRankingRecords(root, records = [], rankContext = {}, deps = {}) {
    if(!root) return;
    root.innerHTML = '';
    const items = records.filter(record => Number(record.score) > 0);
    if(!deps.getCurrentMemberUserId?.()) {
      const empty = document.createElement('p');
      empty.className = 'profile-ranking-empty';
      empty.textContent = '로그인 후 내 랭킹 기록을 확인할 수 있습니다.';
      root.appendChild(empty);
      return;
    }
    if(!items.length) {
      const empty = document.createElement('p');
      empty.className = 'profile-ranking-empty';
      empty.textContent = '아직 랭킹전 기록이 없습니다.';
      root.appendChild(empty);
      return;
    }

    const getProfileRankingRowKey = deps.getProfileRankingRowKey;
    const getProfileRankingCategoryKey = deps.getProfileRankingCategoryKey;
    const getProfileRankingRankText = deps.getProfileRankingRankText;
    const getRankingRecordTimeValue = deps.getRankingRecordTimeValue;
    const bestRows = deps.getProfileBestRankingRecords(items)
      .sort((a, b) => {
        const aRank = Number((rankContext[getProfileRankingRowKey(a)] || rankContext[getProfileRankingCategoryKey(a)])?.rank || 999999);
        const bRank = Number((rankContext[getProfileRankingRowKey(b)] || rankContext[getProfileRankingCategoryKey(b)])?.rank || 999999);
        if(aRank !== bRank) return aRank - bRank;
        return (Number(b.score) || 0) - (Number(a.score) || 0) || (Number(a.elapsedSeconds) || 999999) - (Number(b.elapsedSeconds) || 999999);
      })
      .slice(0, 5);
    const latestRows = items
      .slice()
      .sort((a, b) => getRankingRecordTimeValue(b) - getRankingRecordTimeValue(a))
      .slice(0, 3);
    const recentBestRows = deps.getProfileBestRankingRecords(items)
      .filter(record => getProfileRankingRankText(record, rankContext))
      .sort((a, b) => getRankingRecordTimeValue(b) - getRankingRecordTimeValue(a))
      .slice(0, 2);

    const bestSection = document.createElement('div');
    const recentSection = document.createElement('div');
    const bestTitle = document.createElement('h4');
    const recentTitle = document.createElement('h4');
    const bestList = document.createElement('div');
    const recentList = document.createElement('div');
    bestSection.className = 'profile-ranking-block';
    recentSection.className = 'profile-ranking-block';
    bestTitle.textContent = '분야별 최고 기록';
    recentTitle.textContent = '최근 랭킹전';
    bestList.className = 'profile-ranking-list';
    recentList.className = 'profile-ranking-list';

    const appendRow = (list, record, options = {}) => {
      const row = document.createElement('article');
      const title = document.createElement('strong');
      const meta = document.createElement('span');
      const rankText = getProfileRankingRankText(record, rankContext);
      const timeText = record.elapsedText || deps.formatRankingElapsedText(record.elapsedSeconds);
      const scoreText = `${Number(record.score) || 0}점`;
      const metaParts = [timeText, scoreText, rankText].filter(Boolean);
      row.className = 'profile-ranking-row';
      title.className = 'profile-ranking-card-title';
      meta.className = 'profile-ranking-card-meta';
      title.textContent = record.category || deps.getRankingRecordQuizTitle(record);
      meta.textContent = options.showDate
        ? `${deps.formatProfileRankingDate(record)} · ${metaParts.join(' · ')}`
        : metaParts.join(' · ');
      row.append(title, meta);
      list.appendChild(row);
    };

    bestRows.forEach(record => appendRow(bestList, record));
    latestRows.forEach(record => appendRow(recentList, record, { showDate: true }));
    bestSection.append(bestTitle, bestList);
    recentSection.append(recentTitle, recentList);
    if(recentBestRows.length) {
      const subTitle = document.createElement('p');
      const subList = document.createElement('div');
      subTitle.className = 'profile-ranking-subtitle';
      subTitle.textContent = '최근 순위권 기록';
      subList.className = 'profile-ranking-list profile-ranking-list-compact';
      recentBestRows.forEach(record => appendRow(subList, record, { showDate: true }));
      recentSection.append(subTitle, subList);
    }
    root.append(bestSection, recentSection);
  }

  window.DJ48RankingRender = {
    normalizeRankingDisplayName,
    renderRankingCards,
    appendRankingDisplayName,
    createRankingTitleChip,
    renderRankingAvatar,
    createRankingMetaLine,
    renderRankingRows,
    createRankingPodiumCard,
    createPopularFilterButton,
    renderRankingBoards,
    renderRankingBoardsWithState,
    renderProfileRankingRecords,
    renderRankingBoardPanel,
    renderRankingGroupPanel,
    renderPopularRankingBoardPanel,
    handleRankingBoardRootClick
  };
})();
