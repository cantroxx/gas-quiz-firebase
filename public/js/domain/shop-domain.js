(function (root, factory) {
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.DJ48ShopDomain = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  function resolveShopItemVisual(item = {}, assetCatalogMap = {}, deps = {}) {
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

  function getShopItemState(item = {}, economy = null, inventoryItemIds = new Set(), deps = {}) {
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

  return {
    resolveShopItemVisual,
    getShopItemState
  };
});
