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

  function renderAvatarPreview(items = [], avatarEquipment = {}, inventoryItemIds = new Set()) {
    const root = document.getElementById('shop-avatar-preview');
    if(!root) return;
    const layerItems = items.filter(item => item.avatarLayer === true);
    const equippedItems = layerItems.filter(item => isAvatarItemEquipped(item, avatarEquipment));

    root.innerHTML = '';
    const stage = document.createElement('div');
    const figure = document.createElement('div');
    const base = document.createElement('span');
    const shadow = document.createElement('span');
    const summary = document.createElement('div');
    const ownedCount = layerItems.filter(item => inventoryItemIds.has(item.itemId)).length;

    stage.className = 'shop-avatar-stage';
    figure.className = 'shop-avatar-figure';
    base.className = 'shop-avatar-base';
    shadow.className = 'shop-avatar-shadow';
    summary.className = 'shop-avatar-summary';

    ['hair', 'bottom', 'shoes', 'top', 'head', 'face', 'accessory'].forEach(slot => {
      const item = equippedItems.find(next => next.avatarSlot === slot);
      if(!item) return;
      const layer = document.createElement('span');
      layer.className = `shop-avatar-layer shop-avatar-layer--${slot} shop-avatar-layer--${getAvatarLayerClass(item)}`;
      layer.setAttribute('aria-hidden', 'true');
      figure.appendChild(layer);
    });

    summary.innerHTML = `
      <strong>내 아바타 미리보기</strong>
      <span>보유 ${ownedCount}/${layerItems.length}개 · 장착 ${equippedItems.length}개</span>
    `;
    figure.prepend(base);
    figure.appendChild(shadow);
    stage.append(figure, summary);
    root.appendChild(stage);
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
      if(isAvatarLayer) {
        const avatarIcon = document.createElement('span');
        avatarIcon.className = `shop-avatar-item-visual shop-avatar-item-visual--${item.avatarSlot || 'item'} shop-avatar-item-visual--${getAvatarLayerClass(item)}`;
        avatarIcon.setAttribute('aria-hidden', 'true');
        icon.appendChild(avatarIcon);
      } else if(visual.imageUrl) {
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
    renderAvatarPreview,
    renderShopItems
  };
})();
