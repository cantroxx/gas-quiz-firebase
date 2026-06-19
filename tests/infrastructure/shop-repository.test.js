const assert = require('node:assert/strict');

const calls = [];
const fieldValue = { serverTimestamp: () => ({ type: 'timestamp' }) };
const functions = {
  httpsCallable: name => async payload => {
    calls.push([name, payload]);
    return { data: { success: true, itemId: payload.itemId } };
  }
};

function makeDocSnapshot(exists, data) {
  return {
    exists,
    id: data?.itemId || data?.assetId || data?.userId || '',
    data: () => data
  };
}

function makeCollectionSnapshot(docs) {
  return {
    docs: docs.map(doc => ({
      id: doc.id,
      data: () => doc.data
    }))
  };
}

function makeDb() {
  return {
    id: 'db',
    collection(name) {
      calls.push(['collection', name]);
      return makeCollection([name]);
    }
  };
}

function makeCollection(path) {
  return {
    async get() {
      calls.push(['getCollection', path.join('/')]);
      const collectionName = path.at(-1);
      if(collectionName === 'shopItems') {
        return makeCollectionSnapshot([
          {
            id: 'shop-a',
            data: {
              itemId: 'shop-a',
              category: 'avatar',
              name: 'Shop A',
              enabled: true,
              sortOrder: 2
            }
          },
          {
            id: 'room-a',
            data: {
              itemId: 'room-a',
              category: '방 가구',
              name: 'Room A',
              enabled: true,
              sortOrder: 1
            }
          }
        ]);
      }
      if(collectionName === 'assetCatalog') {
        return makeCollectionSnapshot([
          {
            id: 'asset-a',
            data: {
              assetId: 'asset-a',
              imageUrl: 'https://example.test/a.png',
              enabled: true
            }
          }
        ]);
      }
      if(collectionName === 'items') {
        return makeCollectionSnapshot([
          { id: 'shop-a', data: {} }
        ]);
      }
      return makeCollectionSnapshot([]);
    },
    doc(id) {
      calls.push(['doc', path.join('/'), id]);
      return makeDocument(path.concat(id));
    }
  };
}

function makeDocument(path) {
  return {
    collection(name) {
      calls.push(['subcollection', path.join('/'), name]);
      return makeCollection(path.concat(name));
    },
    async get() {
      calls.push(['get', path.join('/')]);
      const collectionName = path.at(-2);
      if(collectionName === 'shopItems') {
        return makeDocSnapshot(true, {
          itemId: path.at(-1),
          category: '아바타',
          name: 'Room Avatar',
          enabled: true
        });
      }
      if(collectionName === 'items') return makeDocSnapshot(true, {});
      if(collectionName === 'userEconomy') {
        return makeDocSnapshot(true, {
          userId: path.at(-1),
          djCoin: 77,
          totalEarned: 100,
          totalSpent: 23
        });
      }
      if(collectionName === 'userRoomSettings') {
        if(path.at(-1) === 'auth-uid') {
          return makeDocSnapshot(true, {
            userId: path.at(-1),
            selectedAvatarItemId: 'room-a'
          });
        }
        if(path.at(-1) === 'member-2') return makeDocSnapshot(false, {});
        return makeDocSnapshot(true, {
          userId: path.at(-1),
          selectedAvatarItemId: ''
        });
      }
      return makeDocSnapshot(false, {});
    },
    async set(data, options) {
      calls.push(['set', path.join('/'), data, options]);
    }
  };
}

globalThis.DJ48ShopData = {
  saveRoomItemSelection: (options, deps) => {
    calls.push(['legacy-save-room', options.userId, options.itemId, !!deps.getFirestoreFieldValue]);
    return { selectedAvatarItemId: options.itemId };
  },
  normalizeShopItemFromFirestore: doc => {
    const data = doc.data();
    return {
      itemId: data.itemId,
      rawCategory: data.category,
      category: data.category,
      name: data.name,
      enabled: data.enabled === true,
      sortOrder: Number(data.sortOrder) || 999
    };
  },
  isRetiredShopCatalogItem: item => item.rawCategory === '방 가구',
  normalizeAssetCatalogFromFirestore: doc => ({ assetId: doc.data().assetId, enabled: doc.data().enabled }),
  normalizeUserEconomyFromFirestore: doc => doc.exists ? ({ userId: doc.data().userId, djCoin: doc.data().djCoin }) : null,
  getInitialUserEconomy: userId => ({ userId, djCoin: 0, totalEarned: 0, totalSpent: 0 }),
  getDefaultRoomSettings: userId => ({ userId, selectedDecorItemIds: [] }),
  normalizeRoomSettingsFromFirestore: doc => ({
    userId: doc.data().userId,
    selectedAvatarItemId: doc.data().selectedAvatarItemId || '',
    selectedDecorItemIds: []
  }),
  getRoomItemCategory: () => 'avatar',
  isRoomItemSelected: () => false
};

const { createShopRepository } = require('../../public/js/infrastructure/shop-repository.js');

async function testShopRepositoryDelegatesToShopData() {
  const db = makeDb();
  const repository = createShopRepository({
    getFirestoreDb: () => db,
    getFirebaseFunctions: () => functions,
    getFirestoreFieldValue: () => fieldValue,
    shopCategoryLabels: { avatar: '아바타' },
    fallbackCoin: 48,
    testShopUserId: 'test-user'
  });

  assert.deepEqual(await repository.loadShopItems(), [{
    itemId: 'shop-a',
    rawCategory: 'avatar',
    category: 'avatar',
    name: 'Shop A',
    enabled: true,
    sortOrder: 2
  }]);
  assert.deepEqual(await repository.loadAssetCatalog(), { 'asset-a': { assetId: 'asset-a', enabled: true } });
  assert.deepEqual(await repository.loadUserEconomy({ userId: 'member-1' }), { userId: 'member-1', djCoin: 77 });
  assert.deepEqual(await repository.ensureUserEconomyInitialized({ ownerId: 'member-1' }), { userId: 'member-1', djCoin: 77 });
  assert.deepEqual(await repository.loadInventoryItemIds({ userId: 'member-1', memberUserId: 'member-1' }), new Set(['shop-a']));
  assert.deepEqual(await repository.loadRoomSettings({ userId: 'member-1', memberUserId: 'member-1' }), {
    userId: 'member-1',
    selectedAvatarItemId: '',
    selectedDecorItemIds: []
  });
  assert.deepEqual(await repository.purchaseShopItem({ itemId: 'shop-a' }), { success: true, itemId: 'shop-a' });
  assert.deepEqual(await repository.saveRoomItemSelection({ userId: 'member-1', itemId: 'room-a' }), {
    userId: 'member-1',
    updatedAt: { type: 'timestamp' },
    selectedAvatarItemId: 'room-a'
  });
  assert.equal(await repository.migrateRoomSettingsToMemberId({
    sourceUid: 'auth-uid',
    memberUserId: 'member-2'
  }), true);
  assert(calls.some(call => call[0] === 'getCollection' && call[1] === 'shopItems'));
  assert(calls.some(call => call[0] === 'getCollection' && call[1] === 'assetCatalog'));
  assert(calls.some(call => call[0] === 'getCollection' && call[1] === 'userInventory/member-1/items'));
  assert(calls.some(call => call[0] === 'purchaseShopItem'));
  assert(calls.some(call => call[0] === 'get' && call[1] === 'shopItems/room-a'));
  assert(calls.some(call => call[0] === 'get' && call[1] === 'userInventory/member-1/items/room-a'));
  assert(calls.some(call => call[0] === 'set' && call[1] === 'userRoomSettings/member-1' && call[2].selectedAvatarItemId === 'room-a'));
  assert(calls.some(call => call[0] === 'set' && call[1] === 'userRoomSettings/member-2' && call[2].migratedFromUid === 'auth-uid'));
  assert(!calls.some(call => call[0] === 'legacy-save-room'));
}

testShopRepositoryDelegatesToShopData()
  .then(() => console.log('Infrastructure tests passed: shop-repository'))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
