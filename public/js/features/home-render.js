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

  function renderProfileCard(rootId, profile, deps = {}) {
    const root = document.getElementById(rootId);
    if(!root) return;

    const card = document.createElement('article');
    const avatar = document.createElement('div');
    const body = document.createElement('div');
    const nameRow = document.createElement('div');
    const name = document.createElement('h3');
    const actionRow = document.createElement('div');
    const decorateButton = document.createElement('button');
    const adminButton = document.createElement('button');
    const school = document.createElement('p');
    const meta = document.createElement('div');
    const title = document.createElement('p');
    const titleLabel = document.createElement('span');
    const titleValue = document.createElement('strong');
    const badge = document.createElement('p');
    const badgeLabel = document.createElement('span');
    const badgeValue = document.createElement('strong');
    const coin = document.createElement('p');
    const coinLabel = document.createElement('span');
    const coinValue = document.createElement('strong');
    const nicknamePanel = document.createElement('div');
    const nicknameLabel = document.createElement('label');
    const nicknameRow = document.createElement('div');
    const nicknameInput = document.createElement('input');
    const nicknameButton = document.createElement('button');
    const nicknameHelp = document.createElement('p');
    const passwordPanel = document.createElement('div');
    const passwordLabel = document.createElement('p');
    const passwordRow = document.createElement('div');
    const currentPasswordInput = document.createElement('input');
    const newPasswordInput = document.createElement('input');
    const confirmPasswordInput = document.createElement('input');
    const passwordButton = document.createElement('button');
    const passwordHelp = document.createElement('p');
    const imagePanel = document.createElement('div');
    const imageLabel = document.createElement('label');
    const imageRow = document.createElement('div');
    const imageInput = document.createElement('input');
    const imageButton = document.createElement('button');
    const uploadInput = document.createElement('input');
    const uploadButton = document.createElement('button');
    const imageHelp = document.createElement('p');
    const messagePanel = document.createElement('div');
    const messageLabel = document.createElement('label');
    const messageRow = document.createElement('div');
    const messageInput = document.createElement('input');
    const messageButton = document.createElement('button');
    const messageHelp = document.createElement('p');
    const toggleGrid = document.createElement('div');
    const detailRoot = document.createElement('div');

    root.innerHTML = '';
    card.className = 'profile-card';
    avatar.className = 'profile-avatar';
    renderProfileAvatar(avatar, profile, deps);
    body.className = 'profile-body';
    nameRow.className = 'profile-name-row';
    name.textContent = profile.nickname;
    actionRow.className = 'profile-name-actions';
    decorateButton.className = 'profile-decorate-button';
    decorateButton.type = 'button';
    decorateButton.dataset.profileDecorateHome = 'true';
    decorateButton.textContent = '집꾸미기';
    adminButton.className = 'profile-decorate-button profile-admin-center-button';
    adminButton.type = 'button';
    adminButton.dataset.profileOpenAdmin = 'true';
    adminButton.textContent = '관리자 화면으로';
    school.className = 'profile-school';
    school.textContent = profile.school;
    meta.className = 'profile-meta';
    titleLabel.textContent = '칭호';
    titleValue.textContent = profile.titleName;
    badgeLabel.textContent = '대표 뱃지';
    badgeValue.textContent = profile.badgeName;
    coinLabel.textContent = '보유 DJ코인';
    coinValue.textContent = profile.coinText;

    title.append(titleLabel, titleValue);
    badge.append(badgeLabel, badgeValue);
    coin.append(coinLabel, coinValue);
    meta.append(title, badge, coin);

    nicknamePanel.className = 'profile-ranking-message-panel profile-account-panel profile-detail-panel';
    nicknamePanel.dataset.profileDetailPanel = 'nickname';
    nicknameLabel.className = 'profile-ranking-message-label';
    nicknameLabel.htmlFor = 'profile-nickname-input';
    nicknameLabel.textContent = '닉네임';
    nicknameRow.className = 'profile-ranking-message-row';
    nicknameInput.id = 'profile-nickname-input';
    nicknameInput.type = 'text';
    nicknameInput.maxLength = 20;
    nicknameInput.value = profile.nickname || '';
    nicknameInput.placeholder = '2~20글자';
    nicknameButton.id = 'profile-nickname-save-button';
    nicknameButton.className = 'profile-inline-button';
    nicknameButton.type = 'button';
    nicknameButton.textContent = '변경';
    nicknameHelp.id = 'profile-nickname-status';
    nicknameHelp.className = 'profile-ranking-message-help';
    nicknameHelp.textContent = '닉네임은 랭킹과 내 집에 표시됩니다. 불건전한 말은 사용할 수 없습니다.';
    nicknameRow.append(nicknameInput, nicknameButton);
    nicknamePanel.append(nicknameLabel, nicknameRow, nicknameHelp);

    passwordPanel.className = 'profile-ranking-message-panel profile-account-panel profile-detail-panel';
    passwordPanel.dataset.profileDetailPanel = 'password';
    passwordLabel.className = 'profile-ranking-message-label';
    passwordLabel.textContent = '비밀번호 변경';
    passwordRow.className = 'profile-password-change-row';
    currentPasswordInput.id = 'profile-current-password-input';
    currentPasswordInput.type = 'password';
    currentPasswordInput.autocomplete = 'current-password';
    currentPasswordInput.placeholder = '현재 비밀번호';
    currentPasswordInput.setAttribute('aria-label', '현재 비밀번호');
    newPasswordInput.id = 'profile-new-password-input';
    newPasswordInput.type = 'password';
    newPasswordInput.minLength = 4;
    newPasswordInput.autocomplete = 'new-password';
    newPasswordInput.placeholder = '새 비밀번호';
    newPasswordInput.setAttribute('aria-label', '새 비밀번호');
    confirmPasswordInput.id = 'profile-confirm-password-input';
    confirmPasswordInput.type = 'password';
    confirmPasswordInput.minLength = 4;
    confirmPasswordInput.autocomplete = 'new-password';
    confirmPasswordInput.placeholder = '새 비밀번호 확인';
    confirmPasswordInput.setAttribute('aria-label', '새 비밀번호 확인');
    passwordButton.id = 'profile-password-save-button';
    passwordButton.className = 'profile-inline-button';
    passwordButton.type = 'button';
    passwordButton.textContent = '변경';
    passwordHelp.id = 'profile-password-status';
    passwordHelp.className = 'profile-ranking-message-help';
    passwordHelp.textContent = '현재 비밀번호를 입력한 뒤 4자리 이상의 새 비밀번호로 바꿉니다.';
    passwordRow.append(currentPasswordInput, newPasswordInput, confirmPasswordInput, passwordButton);
    passwordPanel.append(passwordLabel, passwordRow, passwordHelp);

    imagePanel.className = 'profile-ranking-message-panel profile-image-url-panel profile-detail-panel';
    imagePanel.dataset.profileDetailPanel = 'image';
    imageLabel.className = 'profile-ranking-message-label profile-image-url-label';
    imageLabel.htmlFor = 'profile-image-search-input';
    imageLabel.textContent = '프로필 이미지';
    imageRow.className = 'profile-ranking-message-row profile-image-url-row';
    imageInput.id = 'profile-image-search-input';
    imageInput.type = 'text';
    imageInput.value = '';
    imageInput.placeholder = '카리나, 피카츄처럼 검색';
    imageButton.id = 'profile-image-search-button';
    imageButton.className = 'profile-inline-button';
    imageButton.type = 'button';
    imageButton.textContent = '검색';
    uploadInput.id = 'profile-image-upload-input';
    uploadInput.type = 'file';
    uploadInput.accept = 'image/png,image/jpeg,image/webp';
    uploadInput.hidden = true;
    uploadButton.id = 'profile-image-upload-button';
    uploadButton.className = 'profile-inline-button profile-upload-button';
    uploadButton.type = 'button';
    uploadButton.textContent = '직접 업로드';
    imageHelp.id = 'profile-image-search-status';
    imageHelp.className = 'profile-ranking-message-help';
    imageHelp.textContent = '퀴즈 이미지 후보를 고르거나 직접 업로드한 뒤, 원 안에 보일 위치를 조정합니다.';
    const imageResults = document.createElement('div');
    imageResults.id = 'profile-image-search-results';
    imageResults.className = 'profile-image-search-results';
    imageRow.append(imageInput, imageButton, uploadButton, uploadInput);
    imagePanel.append(imageLabel, imageRow, imageHelp, imageResults);

    messagePanel.className = 'profile-ranking-message-panel profile-detail-panel';
    messagePanel.dataset.profileDetailPanel = 'message';
    messageLabel.className = 'profile-ranking-message-label';
    messageLabel.htmlFor = 'profile-ranking-message-input';
    messageLabel.textContent = '나의 한마디';
    messageRow.className = 'profile-ranking-message-row';
    messageInput.id = 'profile-ranking-message-input';
    messageInput.type = 'text';
    messageInput.maxLength = 24;
    messageInput.value = profile.rankingMessage || '';
    messageInput.placeholder = '오늘도 도전!';
    messageButton.id = 'profile-ranking-message-save-button';
    messageButton.className = 'profile-inline-button';
    messageButton.type = 'button';
    messageButton.textContent = '저장';
    messageHelp.id = 'profile-ranking-message-status';
    messageHelp.className = 'profile-ranking-message-help';
    messageHelp.textContent = '랭킹 단상에 최대 24자까지 표시됩니다.';
    messageRow.append(messageInput, messageButton);
    messagePanel.append(messageLabel, messageRow, messageHelp);

    toggleGrid.className = 'profile-detail-toggle-grid';
    [
      ['nickname', '닉네임'],
      ['password', '비밀번호 변경'],
      ['image', '프로필 이미지'],
      ['message', '나의 한마디']
    ].forEach(([key, label]) => {
      const button = document.createElement('button');
      button.className = 'profile-detail-toggle';
      button.type = 'button';
      button.dataset.profileDetailToggle = key;
      button.setAttribute('aria-expanded', 'false');
      button.textContent = label;
      toggleGrid.appendChild(button);
    });
    detailRoot.className = 'profile-detail-root';
    detailRoot.append(nicknamePanel, passwordPanel, imagePanel, messagePanel);
    actionRow.appendChild(decorateButton);
    if(deps.isAdminProfile?.(profile)) actionRow.appendChild(adminButton);
    nameRow.append(name, actionRow);
    body.append(nameRow, school, meta, toggleGrid, detailRoot);
    card.append(avatar, body);
    root.appendChild(card);
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

  function renderHomeOwnedItems(rootId, items, assetCatalogMap = {}, roomSettings = {}, deps = {}) {
    const root = document.getElementById(rootId);
    if(!root) return;

    root.innerHTML = '';

    if(!items.length) {
      const emptyCard = document.createElement('article');
      const icon = document.createElement('span');
      const title = document.createElement('h4');
      const desc = document.createElement('p');

      emptyCard.className = 'collection-card';
      icon.className = 'collection-icon';
      icon.textContent = '🛒';
      title.textContent = '아직 보유한 꾸미기 아이템이 없어요';
      desc.textContent = '상점에서 구매한 아이템이 생기면 이곳에서 선택할 수 있습니다.';
      emptyCard.append(icon, title, desc);
      root.appendChild(emptyCard);
      return;
    }

    items.forEach(item => {
      const visual = deps.resolveShopItemVisual(item, assetCatalogMap);
      const isSelected = deps.isRoomItemSelected(item, roomSettings);
      const card = document.createElement('article');
      const icon = document.createElement('span');
      const title = document.createElement('h4');
      const desc = document.createElement('p');
      const state = document.createElement('p');

      card.className = 'collection-card';
      card.dataset.roomItemId = item.itemId;
      card.role = 'button';
      card.tabIndex = 0;
      card.setAttribute('aria-pressed', String(isSelected));
      icon.className = 'collection-icon';
      if(visual.imageUrl) {
        const image = document.createElement('img');
        image.src = visual.imageUrl;
        image.alt = visual.alt;
        image.loading = 'lazy';
        image.style.width = '100%';
        image.style.height = '100%';
        image.style.objectFit = 'contain';
        image.addEventListener('error', () => {
          icon.textContent = visual.fallbackIcon;
        }, { once: true });
        icon.appendChild(image);
      } else {
        icon.textContent = visual.fallbackIcon;
      }
      title.textContent = item.name;
      desc.textContent = item.desc;
      state.textContent = isSelected ? '적용중 · 다시 누르면 해제' : '선택 가능';
      state.className = 'collection-card-state';
      if(isSelected) card.classList.add('is-selected');
      card.append(icon, title, desc, state);
      root.appendChild(card);
    });
  }

  function renderProfileImageSearchResults(rootId, statusId, options, deps = {}) {
    const root = document.getElementById(rootId);
    const status = document.getElementById(statusId);
    if(!root) return;

    const normalizeDisplayImageUrl = deps.normalizeDisplayImageUrl || (value => String(value || '').trim());
    const items = options || [];
    root.innerHTML = '';

    if(!items.length) {
      if(status) status.textContent = '검색 결과가 없습니다.';
      return;
    }

    if(status) status.textContent = `${items.length}개 후보를 찾았습니다. 이미지를 선택하면 위치를 조정할 수 있습니다.`;
    items.forEach((item, index) => {
      const button = document.createElement('button');
      const image = document.createElement('img');
      const label = document.createElement('span');
      const source = document.createElement('small');

      button.className = 'profile-image-option';
      button.type = 'button';
      button.dataset.profileImageIndex = String(index);
      image.src = normalizeDisplayImageUrl(item.displayUrl || item.imageUrl || item.imageFileId);
      image.alt = `${item.name || '프로필 이미지'} 후보`;
      image.loading = 'lazy';
      image.referrerPolicy = 'no-referrer';
      label.textContent = item.name || '이름 없음';
      source.textContent = item.sourceQuizId || item.category || '';
      button.append(image, label, source);
      root.appendChild(button);
    });
  }

  function setProfileImageEditorStatus(statusId, message, isError = false) {
    const status = document.getElementById(statusId);
    if(!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', isError);
  }

  function setProfileImageEditorControls(controlIds = {}, edit = {}, deps = {}) {
    const next = deps.getProfileImageEditModel?.(edit) || edit;
    const scale = document.getElementById(controlIds.scaleId);
    const offsetX = document.getElementById(controlIds.offsetXId);
    const offsetY = document.getElementById(controlIds.offsetYId);
    if(scale) scale.value = String(next.profileImageScale);
    if(offsetX) offsetX.value = String(next.profileImageOffsetX);
    if(offsetY) offsetY.value = String(next.profileImageOffsetY);
  }

  function getProfileImageEditorControlValues(controlIds = {}) {
    const scale = document.getElementById(controlIds.scaleId);
    const offsetX = document.getElementById(controlIds.offsetXId);
    const offsetY = document.getElementById(controlIds.offsetYId);
    return {
      profileImageScale: scale?.value,
      profileImageOffsetX: offsetX?.value,
      profileImageOffsetY: offsetY?.value
    };
  }

  function renderProfileImageEditorModal(ids = {}, editorState = {}, deps = {}) {
    const modal = document.getElementById(ids.modalId);
    const image = document.getElementById(ids.imageId);
    if(!modal || !image) return false;

    setProfileImageEditorControls(ids, editorState, deps);
    image.src = editorState.previewUrl;
    image.alt = `${editorState.label || '프로필 이미지'} 미리보기`;
    modal.hidden = false;
    deps.updateProfileImageEditorPreview?.();
    setProfileImageEditorStatus(ids.statusId, '원 안에 들어올 위치를 맞춘 뒤 저장하세요.');
    return true;
  }

  function closeProfileImageEditorModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.hidden = true;
  }

  window.DJ48HomeRender = {
    renderProfileAvatar,
    renderProfileCard,
    renderCollectionCards,
    renderBadgeProgressGroups,
    renderHomeOwnedItems,
    renderProfileImageSearchResults,
    setProfileImageEditorStatus,
    setProfileImageEditorControls,
    getProfileImageEditorControlValues,
    renderProfileImageEditorModal,
    closeProfileImageEditorModal
  };
})();
