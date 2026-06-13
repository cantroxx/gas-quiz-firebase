(function () {
  function resolveShopItemVisual(item, assetCatalogMap = {}, deps = {}) {
    const isUsableImageUrl = deps.isUsableImageUrl || (value => !!value);
    const getShopFallbackIcon = deps.getShopFallbackIcon || (() => item.icon || '🎁');
    const asset = item.assetId ? assetCatalogMap[item.assetId] : null;
    const assetEnabled = asset?.enabled === true;
    const imageUrl = assetEnabled && isUsableImageUrl(asset.imageUrl)
      ? asset.imageUrl
      : item.imageUrl || '';
    const fallbackIcon = assetEnabled && asset.fallbackIcon
      ? asset.fallbackIcon
      : item.icon || getShopFallbackIcon(item.itemId, item.rawCategory || item.category);

    return {
      imageUrl: isUsableImageUrl(imageUrl) ? imageUrl : '',
      fallbackIcon,
      alt: asset?.name || item.name
    };
  }

  function getShopItemState(item, economy = null, inventoryItemIds = new Set(), deps = {}) {
    const fallbackCoin = Number(deps.userRewardData?.coin) || 0;
    if(inventoryItemIds.has(item.itemId)) {
      return {
        label: '보유중',
        buttonLabel: '보유중',
        className: 'shop-state-ready',
        disabled: true
      };
    }

    const currentCoin = economy?.djCoin ?? fallbackCoin;
    return currentCoin >= item.price
      ? {
        label: '구매 가능',
        buttonLabel: '구매하기',
        className: 'shop-state-ready',
        disabled: false
      }
      : {
        label: '코인 부족',
        buttonLabel: '코인 부족',
        className: 'shop-state-short',
        disabled: true
      };
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

  function renderShopItems(items = [], assetCatalogMap = {}, economy = null, inventoryItemIds = new Set(), deps = {}) {
    const grid = document.getElementById('shop-item-grid');
    grid.innerHTML = '';
    items.forEach(item => {
      const state = getShopItemState(item, economy, inventoryItemIds, deps);
      const visual = resolveShopItemVisual(item, assetCatalogMap, deps);
      const card = document.createElement('article');
      const icon = document.createElement('span');
      const category = document.createElement('p');
      const title = document.createElement('h3');
      const desc = document.createElement('p');
      const price = document.createElement('strong');
      const stateLabel = document.createElement('span');
      const button = document.createElement('button');

      card.className = 'shop-item-card';
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
      stateLabel.textContent = state.label;
      button.className = 'shop-disabled-button';
      button.type = 'button';
      button.disabled = state.disabled;
      button.textContent = state.buttonLabel || state.label;
      button.dataset.shopItemId = item.itemId;

      card.append(icon, category, title, desc, price, stateLabel, button);
      grid.appendChild(card);
    });
  }

  window.DJ48ShopRender = {
    resolveShopItemVisual,
    getShopItemState,
    renderShopWallet,
    renderShopItems
  };
})();
