const assert = require('node:assert/strict');

const calls = [];
globalThis.DJ48ShopData = {
  loadShopItemsFromFirestore: (db, deps) => {
    calls.push(['items', db, deps.shopCategoryLabels]);
    return ['item'];
  },
  loadAssetCatalogFromFirestore: db => {
    calls.push(['assets', db]);
    return { asset: true };
  },
  loadUserEconomyFromFirestore: (options, deps) => {
    calls.push(['economy', options.userId, deps.fallbackCoin]);
    return { djCoin: deps.fallbackCoin };
  },
  ensureUserEconomyInitialized: (options, deps) => {
    calls.push(['ensure-economy', options.ownerId, options.testShopUserId, deps.fallbackCoin]);
    return { userId: options.ownerId };
  },
  loadInventoryItemIdsFromFirestore: options => {
    calls.push(['inventory', options.userId, options.memberUserId, options.testShopUserId]);
    return new Set(['a']);
  },
  loadRoomSettingsFromFirestore: options => {
    calls.push(['room', options.userId, options.memberUserId, options.testShopUserId]);
    return { userId: options.userId };
  },
  purchaseShopItem: (payload, deps) => {
    calls.push(['purchase', payload.itemId, !!deps.getFirebaseFunctions]);
    return { success: true };
  },
  saveRoomItemSelection: (options, deps) => {
    calls.push(['save-room', options.userId, options.itemId, !!deps.getFirestoreFieldValue]);
    return { selectedAvatarItemId: options.itemId };
  },
  normalizeShopItemFromFirestore: () => ({}),
  normalizeRoomSettingsFromFirestore: () => ({}),
  getRoomItemCategory: () => 'avatar',
  isRoomItemSelected: () => false
};

const { createShopRepository } = require('../../public/js/infrastructure/shop-repository.js');

async function testShopRepositoryDelegatesToShopData() {
  const db = { id: 'db' };
  const repository = createShopRepository({
    getFirestoreDb: () => db,
    getFirebaseFunctions: () => ({}),
    getFirestoreFieldValue: () => ({}),
    shopCategoryLabels: { avatar: '아바타' },
    fallbackCoin: 48,
    testShopUserId: 'test-user'
  });

  assert.deepEqual(await repository.loadShopItems(), ['item']);
  assert.deepEqual(await repository.loadAssetCatalog(), { asset: true });
  assert.deepEqual(await repository.loadUserEconomy({ userId: 'member-1' }), { djCoin: 48 });
  assert.deepEqual(await repository.ensureUserEconomyInitialized({ ownerId: 'member-1' }), { userId: 'member-1' });
  assert.deepEqual(await repository.loadInventoryItemIds({ userId: 'member-1', memberUserId: 'member-1' }), new Set(['a']));
  assert.deepEqual(await repository.loadRoomSettings({ userId: 'member-1', memberUserId: 'member-1' }), { userId: 'member-1' });
  assert.deepEqual(await repository.purchaseShopItem({ itemId: 'shop-a' }), { success: true });
  assert.deepEqual(await repository.saveRoomItemSelection({ userId: 'member-1', itemId: 'room-a' }), { selectedAvatarItemId: 'room-a' });
  assert.deepEqual(calls.map(call => call[0]), [
    'items',
    'assets',
    'economy',
    'ensure-economy',
    'inventory',
    'room',
    'purchase',
    'save-room'
  ]);
}

testShopRepositoryDelegatesToShopData()
  .then(() => console.log('Infrastructure tests passed: shop-repository'))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
