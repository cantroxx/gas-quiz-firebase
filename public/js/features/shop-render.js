(function () {
  let wishOwner = '';
  const wishes = new Set();

  function previewTreasure(item, visual, economy, owned) {
    const root = document.getElementById('shop-avatar-preview');
    if(!root) return;
    root.replaceChildren();
    const stage = document.createElement('div'); stage.className = 'treasure-preview';
    stage.dataset.theme = item.itemId.includes('ocean') ? 'ocean' : item.itemId.includes('space') ? 'space' : 'forest';
    const label = document.createElement('small'); label.textContent = '보물 미리보기';
    const icon = document.createElement('div'); icon.className = 'treasure-preview-art';
    if(visual.imageUrl) { const img = document.createElement('img'); img.src = visual.imageUrl; img.alt = item.name; icon.append(img); }
    else icon.textContent = visual.fallbackIcon;
    const title = document.createElement('h3'); title.textContent = item.name;
    const note = document.createElement('p'); note.textContent = item.previewOnly ? '출시 준비 중인 디자인이에요. 아직 구매하거나 적용할 수 없어요.' : owned ? '이미 모은 보물이에요. 내 집에서도 확인할 수 있어요.' : '미리보기는 코인을 사용하지 않아요.';
    const goal = document.createElement('strong'); const gap = Math.max(0, Number(item.price) - Number(economy?.djCoin || 0));
    goal.textContent = item.previewOnly ? `예정 가격 ${item.price} DJ코인` : owned ? '내가 모은 보물' : gap ? `${gap}코인 더 모으면 살 수 있어요` : '지금 가진 코인으로 살 수 있어요';
    stage.append(label, icon, title, note, goal); root.append(stage);
    if(matchMedia('(max-width: 700px)').matches) root.scrollIntoView({behavior:'smooth', block:'nearest'});
  }

  function resolveShopItemVisual(item, assetCatalogMap = {}, deps = {}) {
    return window.DJ48ShopDomain.resolveShopItemVisual(item, assetCatalogMap, deps);
  }

  function getShopItemState(item, economy = null, inventoryItemIds = new Set(), deps = {}) {
    return window.DJ48ShopDomain.getShopItemState(item, economy, inventoryItemIds, deps);
  }

  function getAvatarLayerClass(item = {}) {
    return String(item.avatarLayerClass || item.itemId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  }

  // Firestore에 영문 키로 저장된 카테고리를 화면용 한글 라벨로만 바꾼다 (데이터는 그대로)
  const SHOP_CATEGORY_DISPLAY_LABELS = {
    roomDecor: '방 꾸미기',
    background: '배경',
    avatar: '아바타',
    titleFrame: '타이틀 프레임'
  };

  function getShopItemCategoryLabel(item = {}) {
    const category = String(item.rawCategory || item.category || '').trim();
    return String(SHOP_CATEGORY_DISPLAY_LABELS[category] || category).replaceAll('칭호를', '타이틀을').replaceAll('칭호가', '타이틀이').replaceAll('칭호와', '타이틀과').replaceAll('칭호는', '타이틀은').replaceAll('칭호', '타이틀');
  }

  function isAvatarItemEquipped(item = {}, avatarEquipment = {}) {
    return !!item.avatarSlot && avatarEquipment[item.avatarSlot] === item.itemId;
  }

  function renderShopWallet(economy = null, deps = {}) {
    const root = document.getElementById('shop-wallet');
    if(!root) return;
    const coin = document.createElement('strong');
    const note = document.createElement('span');
    const fallbackCoin = Number(deps.userRewardData?.coin) || 0;
    const currentCoin = economy?.djCoin ?? fallbackCoin;

    root.innerHTML = '';
    coin.textContent = `내 DJ코인 ${currentCoin}`;
    note.textContent = deps.currentMemberUserId ? '작은 보물부터 하나씩, 원하는 아이템을 골라보세요.' : '로그인 후 내 코인과 보유 아이템을 확인할 수 있습니다.';
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
    root.hidden = false;
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
      <strong>나만의 보물 수첩</strong>
      <span>보유 ${ownedCount}/${layerItems.length}개 · 장착 ${equippedItems.length}개</span>
    `;
    stage.append(figure, summary);
    root.appendChild(stage);
  }

  function renderAvatarMarket(featureFlags = {}, deps = {}) {
    // Retire the old storefront even when an older app shell opens this module.
    for(const id of ['shop-category-list', 'shop-wallet', 'shop-avatar-preview', 'shop-item-grid']) {
      document.getElementById(id)?.remove();
    }
    document.querySelector('#shop-view .shop-avatar-layout')?.remove();
    const root = document.getElementById('shop-avatar-market');
    if(!root) return;
    if(featureFlags.shopEnabled===false && !deps.isAdminMember?.()) { root.replaceChildren(); root.hidden = true; return; }
    root.hidden = false;
    if(root.querySelector('iframe')) return;
    const frame = document.createElement('iframe');
    frame.title = '메이플 코디 상점';
    frame.src = '/coordi-shop/?mode=shop&v=hair-pixels-20261002';
    frame.style.cssText = 'width:100%;height:950px;border:1px solid #dce5d9;border-radius:16px';
    root.replaceChildren(frame);
  }

  function renderShopItems(items = [], assetCatalogMap = {}, economy = null, inventoryItemIds = new Set(), deps = {}) {
    const grid = document.getElementById('shop-item-grid');
    if(!grid) return;
    grid.hidden = false;
    grid.innerHTML = '';
    if(wishOwner !== (deps.currentMemberUserId || '')) { wishes.clear(); wishOwner = deps.currentMemberUserId || ''; }
    const avatarEquipment = deps.getAvatarEquipment?.() || {};
    if(!items.length) { const empty = document.createElement('p'); empty.textContent = '아직 이 진열대에 보물이 없어요.'; grid.append(empty); }

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
      category.textContent = getShopItemCategoryLabel(item);
      title.textContent = item.name;
      desc.className = 'shop-item-desc';
      desc.textContent = item.desc;
      price.className = 'shop-item-price';
      price.textContent = `${item.price} DJ코인`;
      stateLabel.className = `shop-item-state ${state.className}`;
      stateLabel.textContent = item.previewOnly ? '출시 준비 중 · 예정 가격' : isEquipped ? '장착중' : state.label;
      button.className = 'shop-disabled-button';
      button.type = 'button';
      button.disabled = isAvatarLayer && isOwned ? false : state.disabled;
      button.textContent = isAvatarLayer && isOwned
        ? (isEquipped ? '벗기기' : '입히기')
        : state.buttonLabel || state.label;
      button.dataset.shopItemId = item.itemId;
      if(isAvatarLayer && isOwned) button.dataset.shopAvatarAction = 'toggle';

      const actions = document.createElement('div'); actions.className = 'treasure-card-actions';
      const preview = document.createElement('button'); preview.type = 'button'; preview.className = 'treasure-preview-button'; preview.textContent = '미리보기';
      preview.addEventListener('click', () => previewTreasure(item, visual, economy, isOwned));
      const wish = document.createElement('button'); wish.type = 'button'; wish.className = 'treasure-wish';
      const updateWish = () => { wish.textContent = wishes.has(item.itemId) ? '♥ 찜함' : '♡ 찜'; wish.setAttribute('aria-pressed', String(wishes.has(item.itemId))); wish.setAttribute('aria-label', item.name + ' 찜하기'); };
      updateWish(); wish.title = '찜은 이 페이지를 닫을 때까지 유지돼요';
      wish.addEventListener('click', () => { wishes.has(item.itemId) ? wishes.delete(item.itemId) : wishes.add(item.itemId); updateWish(); previewTreasure(item, visual, economy, isOwned); });
      actions.append(preview, wish);
      if(isOwned && !isAvatarLayer && !item.previewOnly && ['background', 'avatar', 'titleFrame', '배경', '아바타', '칭호 프레임', '타이틀 프레임'].includes(item.rawCategory || item.category)) {
        delete button.dataset.shopItemId; button.disabled = false; button.textContent = '내 집에 적용 / 해제';
        button.addEventListener('click', async () => { button.disabled = true; try { await deps.applyOwnedItem?.(item.itemId); } finally { button.disabled = false; } });
      }
      const gap = Math.max(0, Number(item.price) - Number(economy?.djCoin || 0));
      if(!isOwned && !item.previewOnly && gap > 0) stateLabel.textContent = `${gap}코인 더 모으면 구매 가능`;
      card.append(icon, category, title, desc, price, stateLabel, actions, button);
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
