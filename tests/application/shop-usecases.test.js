const assert = require('node:assert/strict');
const usecases = require('../../public/js/application/shop-usecases.js');

async function testCachedValueUsesCache() {
  let loadCount = 0;
  const value = await usecases.loadShopCachedValue({}, {
    getValue: () => ['cached'],
    getLoadPromise: () => null,
    loadValue: async () => {
      loadCount += 1;
      return ['loaded'];
    }
  });

  assert.deepEqual(value, ['cached']);
  assert.equal(loadCount, 0);
}

async function testCachedValueLoadsAndClearsPromise() {
  const calls = [];
  const value = await usecases.loadShopCachedValue({}, {
    getValue: () => null,
    getLoadPromise: () => null,
    setValue: nextValue => calls.push(['set', nextValue]),
    setLoadPromise: nextValue => calls.push(['promise', nextValue]),
    loadValue: async () => ({ ok: true })
  });

  assert.deepEqual(value, { ok: true });
  assert.equal(calls[0][0], 'promise');
  assert.equal(typeof calls[0][1]?.then, 'function');
  assert.deepEqual(calls[1], ['set', { ok: true }]);
  assert.deepEqual(calls[2], ['promise', null]);
}

async function testShopRenderDataComposesLoaders() {
  const result = await usecases.getShopRenderData({
    getShopItemsForRender: async () => ['item'],
    getAssetCatalogMap: async () => ({ asset: true }),
    getUserEconomyForRender: async () => ({ djCoin: 3 }),
    getInventoryItemIdsForRender: async () => new Set(['item'])
  });

  assert.deepEqual(result.items, ['item']);
  assert.deepEqual(result.assetCatalogMap, { asset: true });
  assert.deepEqual(result.economy, { djCoin: 3 });
  assert.deepEqual(Array.from(result.inventoryItemIds), ['item']);
}

async function testShopSpecificRenderLoaders() {
  const cache = {
    value: null,
    promise: null
  };
  const accessors = {
    getValue: () => cache.value,
    setValue: value => {
      cache.value = value;
    },
    getLoadPromise: () => cache.promise,
    setLoadPromise: value => {
      cache.promise = value;
    }
  };

  const items = await usecases.getShopItemsForRender({
    getFallbackShopItems: () => ['fallback'],
    getShopItemsCacheAccessors: () => accessors,
    loadShopItems: async () => ['loaded'],
    buildShopItemsResult: (loadedItems, fallbackItems) => loadedItems.length ? loadedItems : fallbackItems
  });
  assert.deepEqual(items, ['loaded']);
  assert.deepEqual(cache.value, ['loaded']);

  const economy = await usecases.getUserEconomyForRender({
    getCurrentDataOwnerId: () => 'member-1',
    getFallbackCoin: () => 48,
    isUsingTestUserFallback: () => false,
    getUserEconomyCacheAccessors: () => ({
      getValue: () => null,
      setValue: () => {},
      getLoadPromise: () => null,
      setLoadPromise: () => {}
    }),
    loadUserEconomy: async () => null,
    buildEconomyFallback: options => ({ userId: options.userId, djCoin: options.fallbackCoin }),
    buildUserEconomyForRender: async options => options.economy || options.ensureUserEconomyInitialized(options.ownerId),
    ensureUserEconomyInitialized: async ownerId => ({ userId: ownerId, djCoin: 12 })
  });
  assert.deepEqual(economy, { userId: 'member-1', djCoin: 12 });
}

async function testPurchaseShopItemFlow() {
  const calls = [];
  const result = await usecases.purchaseShopItemFlow({ itemId: 'shop-a' }, {
    prepareMemberOwnedData: async () => calls.push(['prepare']),
    requireCurrentDataOwnerId: () => 'member-a',
    purchaseShopItem: async payload => calls.push(['purchase', payload]),
    resetShopRuntimeData: () => calls.push(['reset']),
    renderShop: async () => calls.push(['render']),
    showMessage: message => calls.push(['message', message])
  });

  assert.deepEqual(result, { error: null });
  assert.deepEqual(calls, [
    ['prepare'],
    ['purchase', { memberUserId: 'member-a', itemId: 'shop-a' }],
    ['reset'],
    ['render'],
    ['message', '구매가 완료됐어요.']
  ]);
}

async function testRoomSelectionRequiresFirestore() {
  const calls = [];
  const result = await usecases.saveRoomItemSelectionFlow({ itemId: 'room-a' }, {
    getFirestoreDb: () => null,
    showMessage: message => calls.push(message)
  });

  assert.deepEqual(result, { skipped: true, reason: 'firestore-unavailable' });
  assert.deepEqual(calls, ['내 집 설정을 저장할 수 없어요.']);
}

(async () => {
  await testCachedValueUsesCache();
  await testCachedValueLoadsAndClearsPromise();
  await testShopRenderDataComposesLoaders();
  await testShopSpecificRenderLoaders();
  await testPurchaseShopItemFlow();
  await testRoomSelectionRequiresFirestore();
})();
