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

  function getShopItemsForRender(deps = {}) {
    return loadShopCachedValue({
      shouldCache: items => Array.isArray(items) && items.length > 0,
      warnMessage: 'Firestore shopItems read failed. Using static fallback SHOP_ITEMS.',
      fallbackFactory: () => deps.getFallbackShopItems?.() || []
    }, {
      ...deps.getShopItemsCacheAccessors?.(),
      loadValue: () => deps.loadShopItems()
        .then(items => deps.buildShopItemsResult(items, deps.getFallbackShopItems?.() || [])),
      warn: deps.warn
    });
  }

  function getAssetCatalogMap(deps = {}) {
    return loadShopCachedValue({
      warnMessage: 'Firestore assetCatalog read failed. Using shop item fallback icons.',
      fallbackFactory: () => ({})
    }, {
      ...deps.getAssetCatalogCacheAccessors?.(),
      loadValue: deps.loadAssetCatalog,
      warn: deps.warn
    });
  }

  function getUserEconomyForRender(deps = {}) {
    return loadShopCachedValue({
      warnMessage: 'Firestore userEconomy read failed. Using static reward fallback.',
      fallbackFactory: () => deps.buildEconomyFallback({
        userId: deps.getCurrentDataOwnerId?.() || '',
        fallbackCoin: deps.getFallbackCoin?.() || 0,
        useStaticRewardFallback: deps.isUsingTestUserFallback?.() === true
      })
    }, {
      ...deps.getUserEconomyCacheAccessors?.(),
      loadValue: () => deps.loadUserEconomy()
        .then(economy => deps.buildUserEconomyForRender({
          economy,
          ownerId: deps.getCurrentDataOwnerId?.(),
          ensureUserEconomyInitialized: deps.ensureUserEconomyInitialized,
          fallbackCoin: deps.getFallbackCoin?.() || 0,
          useStaticRewardFallback: false
        })),
      warn: deps.warn
    });
  }

  function getInventoryItemIdsForRender(deps = {}) {
    return loadShopCachedValue({
      warnMessage: 'Firestore userInventory read failed. Treating inventory as empty.',
      fallbackFactory: () => new Set()
    }, {
      ...deps.getInventoryCacheAccessors?.(),
      loadValue: deps.loadInventoryItemIds,
      warn: deps.warn
    });
  }

  function getRoomSettingsForRender(deps = {}) {
    return loadShopCachedValue({
      warnMessage: 'Firestore userRoomSettings read failed. Using empty room settings.',
      fallbackFactory: () => deps.getDefaultRoomSettings?.()
    }, {
      ...deps.getRoomSettingsCacheAccessors?.(),
      loadValue: deps.loadRoomSettings,
      warn: deps.warn
    });
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
    getAssetCatalogMap,
    getInventoryItemIdsForRender,
    getRoomSettingsForRender,
    getShopItemsForRender,
    getShopRenderData,
    getUserEconomyForRender,
    purchaseShopItemFlow,
    saveRoomItemSelectionFlow
  };
});
