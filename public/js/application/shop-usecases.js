(function (root, factory) {
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.DJ48ShopUsecases = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  async function loadShopCachedValue(options = {}, deps = {}) {
    const cachedValue = deps.getValue?.();
    if(cachedValue) return cachedValue;

    const activeLoadPromise = deps.getLoadPromise?.();
    if(activeLoadPromise) return activeLoadPromise;

    const loadPromise = deps.loadValue()
      .then(value => {
        if(options.shouldCache?.(value) !== false) deps.setValue?.(value);
        return value;
      })
      .catch(error => {
        deps.warn?.(options.warnMessage || 'Shop cached value load failed.', error);
        return options.fallbackFactory?.(error);
      })
      .finally(() => {
        deps.setLoadPromise?.(null);
      });

    deps.setLoadPromise?.(loadPromise);
    return loadPromise;
  }

  async function getShopRenderData(deps = {}) {
    const [items, assetCatalogMap, economy, inventoryItemIds] = await Promise.all([
      deps.getShopItemsForRender(),
      deps.getAssetCatalogMap(),
      deps.getUserEconomyForRender(),
      deps.getInventoryItemIdsForRender()
    ]);
    return { items, assetCatalogMap, economy, inventoryItemIds };
  }

  async function purchaseShopItemFlow(options = {}, deps = {}) {
    try {
      await deps.prepareMemberOwnedData?.();
      const userId = deps.requireCurrentDataOwnerId();
      await deps.purchaseShopItem({
        memberUserId: userId,
        itemId: options.itemId
      });
      deps.resetShopRuntimeData?.();
      await deps.renderShop?.();
      deps.showMessage?.('구매가 완료됐어요.');
      return { error: null };
    } catch(error) {
      deps.warn?.('Shop purchase failed.', error);
      deps.showMessage?.(deps.getShopPurchaseErrorMessage(error));
      return { error };
    }
  }

  async function saveRoomItemSelectionFlow(options = {}, deps = {}) {
    if(!deps.getFirestoreDb?.()) {
      deps.showMessage?.('내 집 설정을 저장할 수 없어요.');
      return { skipped: true, reason: 'firestore-unavailable' };
    }

    try {
      await deps.prepareMemberOwnedData?.();
      const userId = deps.requireCurrentDataOwnerId();
      await deps.saveRoomItemSelection({
        db: deps.getFirestoreDb(),
        userId,
        itemId: options.itemId
      });
      deps.resetRoomSettingsCache?.();
      await deps.renderHomeOwnedItems?.();
      return { error: null };
    } catch(error) {
      deps.warn?.('Room item save failed.', error);
      deps.showMessage?.(deps.getRoomItemSaveErrorMessage(error));
      return { error };
    }
  }

  return {
    loadShopCachedValue,
    getShopRenderData,
    purchaseShopItemFlow,
    saveRoomItemSelectionFlow
  };
});
