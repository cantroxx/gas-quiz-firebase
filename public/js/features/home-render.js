(function () {
  function renderProfileAvatar(root, profile, deps = {}) {
    root.innerHTML = '';
    const normalizeDisplayImageUrl = deps.normalizeDisplayImageUrl || (value => String(value || '').trim());
    const applyProfileImageTransform = deps.applyProfileImageTransform || (() => {});
    const profileImageUrl = normalizeDisplayImageUrl(profile.profileImageUrl);
    if(profileImageUrl) {
      const image = document.createElement('img');
      image.src = profileImageUrl;
      image.alt = `${profile.nickname || '사용자'} 프로필`;
      image.loading = 'lazy';
      image.referrerPolicy = 'no-referrer';
      applyProfileImageTransform(image, profile);
      image.addEventListener('error', () => {
        root.innerHTML = '';
        root.textContent = profile.avatar || '🙂';
      });
      root.appendChild(image);
      return;
    }
    root.textContent = profile.avatar || '🙂';
  }

  function renderCollectionCards(rootId, items, className) {
    const root = document.getElementById(rootId);
    root.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('article');
      const icon = document.createElement('span');
      const title = document.createElement('h4');
      const desc = document.createElement('p');

      card.className = `collection-card ${className}${item.selected ? ' is-selected' : ''}`;
      icon.className = 'collection-icon';
      icon.textContent = item.icon;
      if(className === 'title-card' && (item.themeClass || item.tierClass || item.effectClass)) {
        title.className = ['title-badge', item.themeClass, item.tierClass, item.effectClass].filter(Boolean).join(' ');
      }
      title.textContent = item.name;
      desc.textContent = item.desc;

      card.append(icon, title, desc);
      if(Number(item.starCount) > 0) {
        const star = document.createElement('span');
        star.className = 'collection-star-badge';
        star.textContent = `★ ${Number(item.starCount)}회 완주`;
        card.appendChild(star);
      }
      if(item.actionLabel && item.titleId && item.titleId !== 'none' && item.titleId !== 'loading') {
        const button = document.createElement('button');
        button.className = 'collection-card-action';
        button.type = 'button';
        button.dataset.selectTitleId = item.selected ? '' : item.titleId;
        button.textContent = item.actionLabel;
        card.appendChild(button);
      }
      root.appendChild(card);
    });
  }

  function getBadgeGroupLabel(group) {
    const labels = {
      korean: '국어',
      social: '사회',
      math: '수학',
      people: '인기·인물',
      pokemon: '포켓몬',
      other: '기타'
    };
    return labels[group] || labels.other;
  }

  function getBadgeGroupOrder(group) {
    const order = ['korean', 'social', 'math', 'people', 'pokemon', 'other'];
    const index = order.indexOf(group);
    return index >= 0 ? index : order.length;
  }

  function renderBadgeProgressGroups(rootId, badges) {
    const root = document.getElementById(rootId);
    root.innerHTML = '';
    const groups = {};
    badges.forEach(badge => {
      const group = badge.group || 'other';
      if(!groups[group]) groups[group] = [];
      groups[group].push(badge);
    });

    Object.keys(groups)
      .sort((a, b) => getBadgeGroupOrder(a) - getBadgeGroupOrder(b))
      .forEach(group => {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        const title = document.createElement('span');
        const count = document.createElement('strong');
        const grid = document.createElement('div');
        const items = groups[group].sort((a, b) => String(a.name).localeCompare(String(b.name), 'ko'));
        const earnedCount = items.filter(item => item.completed || Number(item.starCount) > 0).length;

        details.className = 'badge-progress-group';
        details.open = false;
        summary.className = 'badge-progress-summary';
        title.textContent = getBadgeGroupLabel(group);
        count.textContent = `${earnedCount}/${items.length}`;
        grid.className = 'badge-progress-grid';
        summary.append(title, count);
        details.appendChild(summary);

        items.forEach(item => {
          const card = document.createElement('article');
          const icon = document.createElement('span');
          const name = document.createElement('h4');
          const desc = document.createElement('p');
          const progress = document.createElement('div');
          const progressBar = document.createElement('span');
          const star = document.createElement('span');

          card.className = `collection-card badge-card${item.completed || item.starCount ? ' is-earned' : ''}`;
          icon.className = 'collection-icon';
          icon.textContent = item.icon;
          name.textContent = item.name;
          desc.textContent = item.desc;
          progress.className = 'badge-progress-track';
          progressBar.style.width = `${Math.max(0, Math.min(100, Number(item.progressPercent) || 0))}%`;
          progress.appendChild(progressBar);
          card.append(icon, name, desc, progress);
          if(Number(item.starCount) > 0) {
            star.className = 'collection-star-badge';
            star.textContent = `★ ${Number(item.starCount)}회 완주`;
            card.appendChild(star);
          }
          grid.appendChild(card);
        });

        details.appendChild(grid);
        root.appendChild(details);
      });
  }

  window.DJ48HomeRender = {
    renderProfileAvatar,
    renderCollectionCards,
    renderBadgeProgressGroups
  };
})();
