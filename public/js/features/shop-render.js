(function () {
  function resolveShopItemVisual(item, assetCatalogMap = {}, deps = {}) {
    return window.DJ48ShopDomain.resolveShopItemVisual(item, assetCatalogMap, deps);
  }

  function getShopItemState(item, economy = null, inventoryItemIds = new Set(), deps = {}) {
    return window.DJ48ShopDomain.getShopItemState(item, economy, inventoryItemIds, deps);
  }

  function getAvatarLayerClass(item = {}) {
    return String(item.avatarLayerClass || item.itemId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  }

  function isAvatarItemEquipped(item = {}, avatarEquipment = {}) {
    return !!item.avatarSlot && avatarEquipment[item.avatarSlot] === item.itemId;
  }

  function renderShopWallet(economy = null, deps = {}) {
    const root = document.getElementById('shop-wallet');
    const coin = document.createElement('strong');
    const note = document.createElement('span');
    const fallbackCoin = Number(deps.userRewardData?.coin) || 0;
    const currentCoin = economy?.djCoin ?? fallbackCoin;

    root.innerHTML = '';
    coin.textContent = `내 DJ코인 ${currentCoin}`;
    note.textContent = deps.currentMemberUserId ? '구매와 장착은 현재 로그인한 회원 기준으로 저장됩니다.' : '로그인 후 내 코인과 보유 아이템을 확인할 수 있습니다.';
    root.append(coin, note);
  }

  function renderShopTabs(tabs = [], activeTab = 'all') {
    const root = document.getElementById('shop-category-list');
    if(!root) return;
    root.innerHTML = '';
    tabs.forEach(tab => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'shop-category-tab';
      button.dataset.shopTab = tab.tabId;
      button.setAttribute('aria-pressed', tab.tabId === activeTab ? 'true' : 'false');
      button.textContent = tab.label;
      if(tab.tabId === activeTab) button.classList.add('is-active');
      root.appendChild(button);
    });
  }

  function renderAvatarPreview(items = [], assetCatalogMap = {}, avatarEquipment = {}, inventoryItemIds = new Set(), deps = {}) {
    const root = document.getElementById('shop-avatar-preview');
    if(!root) return;
    const layerItems = items.filter(item => item.avatarLayer === true);
    const equippedItems = layerItems.filter(item => isAvatarItemEquipped(item, avatarEquipment));

    root.innerHTML = '';
    const stage = document.createElement('div');
    const figure = document.createElement('div');
    const card = document.createElement('div');
    const summary = document.createElement('div');
    const ownedCount = layerItems.filter(item => inventoryItemIds.has(item.itemId)).length;

    stage.className = 'shop-avatar-stage';
    figure.className = 'shop-avatar-figure';
    card.className = 'shop-avatar-card-base';
    summary.className = 'shop-avatar-summary';

    const cardItem = equippedItems.find(next => next.avatarSlot === 'card');
    const cardVisual = cardItem ? resolveShopItemVisual(cardItem, assetCatalogMap, deps) : null;
    const baseImage = document.createElement('img');
    baseImage.src = cardVisual?.imageUrl || '/images/classroom-icons/student-card.svg';
    baseImage.alt = cardItem?.name || '기본 학생카드';
    baseImage.loading = 'lazy';
    card.appendChild(baseImage);
    figure.appendChild(card);

    ['keyring', 'badge', 'medal', 'nameplate'].forEach(slot => {
      const item = equippedItems.find(next => next.avatarSlot === slot);
      if(!item) return;
      const visual = resolveShopItemVisual(item, assetCatalogMap, deps);
      const layer = document.createElement('span');
      const image = document.createElement('img');
      layer.className = `shop-avatar-layer shop-avatar-layer--${slot} shop-avatar-layer--${getAvatarLayerClass(item)}`;
      image.src = visual.imageUrl || '';
      image.alt = item.name || visual.alt || '프로필 장식';
      image.loading = 'lazy';
      if(visual.imageUrl) layer.appendChild(image);
      else layer.textContent = visual.fallbackIcon || item.icon || '';
      figure.appendChild(layer);
    });

    summary.innerHTML = `
      <strong>내 아바타 미리보기</strong>
      <span>보유 ${ownedCount}/${layerItems.length}개 · 장착 ${equippedItems.length}개</span>
    `;
    stage.append(figure, summary);
    root.appendChild(stage);
  }

  function renderAvatarMarket(featureFlags = {}, deps = {}) {
    const root = document.getElementById('shop-avatar-market');
    if(!root) return;
    const isEnabled = featureFlags.avatarMarketEnabled !== false;
    const isAdmin = deps.isAdminMember?.() === true;
    root.innerHTML = '';
    root.hidden = !isEnabled && !isAdmin;
    if(root.hidden) return;

    const title = document.createElement('div');
    const actions = document.createElement('div');
    const eyebrow = document.createElement('p');
    const heading = document.createElement('strong');
    const desc = document.createElement('span');
    const link = document.createElement('a');
    const state = document.createElement('span');

    title.className = 'shop-avatar-market-title';
    actions.className = 'shop-avatar-market-actions';
    eyebrow.className = 'eyebrow';
    state.className = `shop-avatar-market-state${isEnabled ? ' is-open' : ' is-closed'}`;
    link.className = 'button secondary';
    link.href = '/prototypes/dressing-room/';
    link.target = '_blank';
    link.rel = 'noopener';

    eyebrow.textContent = 'Avatar Market';
    heading.textContent = '아바타 마켓';
    desc.textContent = isEnabled
      ? '넥슨 코디 카탈로그 연동 전까지 임시 드레스룸에서 착용 흐름을 확인합니다.'
      : '관리자 설정에서 닫혀 있어 학생 화면에는 숨겨집니다.';
    state.textContent = isEnabled ? '열림' : '닫힘';
    link.textContent = '임시 드레스룸 열기';

    title.append(eyebrow, heading, desc);
    actions.append(state, link);
    root.append(title, actions);
  }

  function renderShopItems(items = [], assetCatalogMap = {}, economy = null, inventoryItemIds = new Set(), deps = {}) {
    const grid = document.getElementById('shop-item-grid');
    grid.innerHTML = '';
    const avatarEquipment = deps.getAvatarEquipment?.() || {};
    items.forEach(item => {
      const state = getShopItemState(item, economy, inventoryItemIds, deps);
      const visual = resolveShopItemVisual(item, assetCatalogMap, deps);
      const isAvatarLayer = item.avatarLayer === true;
      const isOwned = inventoryItemIds.has(item.itemId);
      const isEquipped = isAvatarItemEquipped(item, avatarEquipment);
      const card = document.createElement('article');
      const icon = document.createElement('span');
      const category = document.createElement('p');
      const title = document.createElement('h3');
      const desc = document.createElement('p');
      const price = document.createElement('strong');
      const stateLabel = document.createElement('span');
      const button = document.createElement('button');

      card.className = 'shop-item-card';
      if(isAvatarLayer) card.classList.add('shop-item-card--avatar');
      if(isEquipped) card.classList.add('is-equipped');
      icon.className = 'shop-item-icon';
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
      category.className = 'shop-item-category';
      category.textContent = item.category;
      title.textContent = item.name;
      desc.className = 'shop-item-desc';
      desc.textContent = item.desc;
      price.className = 'shop-item-price';
      price.textContent = `${item.price} DJ코인`;
      stateLabel.className = `shop-item-state ${state.className}`;
      stateLabel.textContent = isEquipped ? '장착중' : state.label;
      button.className = 'shop-disabled-button';
      button.type = 'button';
      button.disabled = isAvatarLayer && isOwned ? false : state.disabled;
      button.textContent = isAvatarLayer && isOwned
        ? (isEquipped ? '벗기기' : '입히기')
        : state.buttonLabel || state.label;
      button.dataset.shopItemId = item.itemId;
      if(isAvatarLayer && isOwned) button.dataset.shopAvatarAction = 'toggle';

      card.append(icon, category, title, desc, price, stateLabel, button);
      grid.appendChild(card);
    });
  }

  window.DJ48ShopRender = {
    resolveShopItemVisual,
    getShopItemState,
    renderShopWallet,
    renderShopTabs,
    renderAvatarMarket,
    renderAvatarPreview,
    renderShopItems
  };
})();
