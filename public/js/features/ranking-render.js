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

  window.DJ48RankingRender = {
    normalizeRankingDisplayName,
    renderRankingCards,
    appendRankingDisplayName,
    createRankingTitleChip,
    renderRankingAvatar,
    createRankingMetaLine,
    renderRankingRows,
    createRankingPodiumCard
  };
})();
