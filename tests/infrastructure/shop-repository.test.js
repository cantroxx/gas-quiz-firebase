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
    data: () => data
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
  saveRoomItemSelection: (options, deps) => {
    calls.push(['legacy-save-room', options.userId, options.itemId, !!deps.getFirestoreFieldValue]);
    return { selectedAvatarItemId: options.itemId };
  },
  normalizeShopItemFromFirestore: doc => ({ itemId: doc.data().itemId, rawCategory: doc.data().category }),
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

  assert.deepEqual(await repository.loadShopItems(), ['item']);
  assert.deepEqual(await repository.loadAssetCatalog(), { asset: true });
  assert.deepEqual(await repository.loadUserEconomy({ userId: 'member-1' }), { djCoin: 48 });
  assert.deepEqual(await repository.ensureUserEconomyInitialized({ ownerId: 'member-1' }), { userId: 'member-1' });
  assert.deepEqual(await repository.loadInventoryItemIds({ userId: 'member-1', memberUserId: 'member-1' }), new Set(['a']));
  assert.deepEqual(await repository.loadRoomSettings({ userId: 'member-1', memberUserId: 'member-1' }), { userId: 'member-1' });
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
  assert.deepEqual(calls.filter(call => [
    'items',
    'assets',
    'economy',
    'ensure-economy',
    'inventory',
    'room',
    'purchaseShopItem'
  ].includes(call[0])).map(call => call[0]), [
    'items',
    'assets',
    'economy',
    'ensure-economy',
    'inventory',
    'room',
    'purchaseShopItem'
  ]);
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
